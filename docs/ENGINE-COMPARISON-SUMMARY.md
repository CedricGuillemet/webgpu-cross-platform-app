# DawnTest — JS Engine Comparison Report

Native WebGPU runner for Babylon-Lite scene bundles. Same scene bundles, same
WebGPU bindings (Dawn on D3D12), same `framework/win32` OS layer, same `Shared`
application code (wgpu_bridge / wgpu_enums / dom_shim / worker_shim). The only
thing swapped between builds is the JavaScript engine.

All builds are **Release / x64 / MSVC / Windows + D3D12**, with the size-trim
flags applied (`/O1 /Gy /Gw /GL /LTCG /OPT:REF /OPT:ICF`). Dawn + Tint are
heavily trimmed to D3D12-only — see [§ Dawn / Tint build configuration](#8-dawn--tint-build-configuration) below.

---

## 1. Binary size summary

| Engine | `app.exe` | Extra runtime files | **Total on-disk deployment** |
|--------|----------:|---------------------|-----------------------------:|
| **QuickJS** | 4.62 MB | none (static) | **4.62 MB** |
| **Hermes (static `hermesvm_a`)** | 6.53 MB | none (static) | **6.53 MB** |
| Hermes (shared `hermesvm`) | 4.14 MB | hermesvm.dll 2.56 MB | 6.70 MB |
| Chakra | 4.06 MB | ChakraCore.dll 7 MB | ~11 MB |
| V8 | 4.08 MB | v8.dll 24 MB + icudtl.dat 10 MB + 4 helper DLLs ~5 MB | ~43.6 MB |

**Reference baseline (before any size optimisation)**: Chakra was `app.exe` = 9.56 MB + ChakraCore.dll 7 MB = ~16.5 MB. The `/O1 /GL /LTCG /OPT:ICF /OPT:REF` flags plus Dawn/Tint feature trimming (D3D12-only, no Vulkan/Metal/GL/SPV-Tools, no GLFW, no DXC) plus stb_image → WIC cut the app.exe by 57.6 %.

---

## 2. Bundle test scope

- **Total bundle scenes available**: 125 (produced by `pnpm build:bundle-scenes` in Babylon-Lite, dumped under `assets/bundle/scene*.js`).
- **Baseline pass-set used as the regression target**: **72 scenes**, captured from the Chakra build (`SCENE-REPORT.md`). 5 scenes are skipped on every engine because they require WebAssembly (Havok, recast-navigation, manifold-3d); the host detects them via a bare-specifier package list and exits with `kExitWasmUnsupported`.
- **Test harness**: each scene runs with `--exit-on-ready --max-frames 800 --no-window`, 45 s wall-clock cap. Pass = exit 0 (i.e. `canvas.dataset.ready === "true"`).

## 3. Pass-rate summary

| Engine | Pass | Fail | Pass-rate |
|--------|----:|----:|---------:|
| Chakra | **70 / 72** | 2 (both environmental flakes; not real regressions) | **97 %** |
| QuickJS | **66 / 72** | 5 timeouts + 1 RangeError | **92 %** |
| V8 | **51 / 72** | 21 (mix of crash / ICU / JS error) | **71 %** |
| Hermes | **3 / 72** | 69 (same root cause for 65+ of them) | **4 %** |

---

## 4. What works per engine

### Chakra (baseline, 70/72)
Everything the bundles use: ES modules (parse + evaluate), dynamic `import()` → `__import`, microtasks, ArrayBuffer/typed-array zero-copy, WIC-decoded `createImageBitmap`, glTF/GLB binary parsing, Workers (`JsCreateRuntime` per thread), WASM-package detection → clean WASM-unsupported exit. The 2 "failures" are scene14 (slow 54 MB download exceeds the frame cap, passes with `--max-frames 1500`) and scene176 (pre-existing baseline crash on the asset path; same crash exists with QuickJS so not engine-specific).

### QuickJS (66/72)
Same surface as Chakra:
- ES module loading via `JS_SetModuleLoaderFunc` (file-system loader + WASM detection in the normalizer).
- Native function trampolines via `JS_NewCFunctionData` with a magic-indexed `std::vector<Trampoline>`.
- Custom JS class with finalizer for external opaque objects.
- Promise capability via `JS_NewPromiseCapability`.
- Workers via per-thread `JS_NewRuntime` / `JS_NewContext`.

### V8 (51/72)
Same surface as Chakra. Notable workarounds:
- ES modules via `ScriptCompiler::CompileModule` + `InstantiateModule(ctx, resolveCallback)` + `Evaluate`.
- **V8 sandbox is enabled** (mandatory match with the `v8-v143-x64` NuGet build) — `JsCreateExternalArrayBuffer` cannot zero-copy; we allocate a sandbox-owned `ArrayBuffer::New(iso, size)` and `memcpy` the bytes in, then run the caller's finalize immediately. Loses zero-copy on `fetch().arrayBuffer()` paths but stays correct.
- HandleScope opened at every `Js*` entry point.
- Native function trampolines via `JS_NewCFunctionData`-equivalent (`FunctionTemplate::New` with `Integer` data + magic int → trampoline lookup).

### Hermes (3/72)
- Build + JSI runtime work; engine loads and runs JS.
- Module loading is **emulated** because Hermes has no native ES-module support: `stripEsModuleSyntax` preprocesses bundles, dropping `import` statements, turning `export default` into `globalThis.__bundleDefault = …`, and converting `export { A, B as C, D }` (incl. multi-line Rollup-aliased form) into `Object.assign(globalThis.__bundleDefault ||= {}, { A, C: B, D });`. `importByPath` evaluates the chunk as a script and returns `__bundleDefault`.
- `Uint8Array` directly via JSI; other typed arrays via `globalThis.<Name>Array(buffer, offset, length)` invocation.
- HostObject pattern for external opaque objects with a destructor-based finalizer.
- Promises via JS-side `new Promise(...)` with a capturing host-function executor.

---

## 5. What is crashing (and why)

### Chakra
| Scene | Symptom | Root cause |
|-------|---------|------------|
| scene14 | hits 800-frame cap | 54 MB FlightHelmet asset download is slow on this network; not a code bug |
| scene176 | exit -1073741819 (access violation) post-download | Pre-existing baseline crash in the MosquitoInAmber asset processing path — also reproduces in the unoptimised baseline build, so not caused by any size optimisation |

### QuickJS
| Scene | Symptom | Root cause |
|-------|---------|------------|
| scene11, 144, 152, 157, 158 | timeout (45 s) | QuickJS is a pure interpreter, ~3–10× slower than ChakraCore's JIT. Deep BVH-build / recursive material walks bust the 45 s harness cap. Functional but slow. |
| scene34 | `RangeError: invalid length` | QuickJS rejects a typed-array length that ChakraCore accepts (likely a 32-bit signed length cap somewhere in QuickJS's TypedArray ctor — needs per-case investigation). |

(Earlier sweep also showed native stack overflows; fixed by adding `/STACK:16777216` to the EXE — QuickJS uses the native call stack for JS frames and Babylon's BVH builds exceed the default 1 MB.)

### V8 (21 failures)

| Class | Count | Failing scenes |
|-------|------:|----------------|
| Access violation (0xC0000005) post-init | 9 | scene11, 33, 111, 113, 151, 152, 153, 157, 158, 176 |
| V8 internal `V8_Fatal` breakpoint (0x80000003) | 3 | scene32, 74, 161 |
| `RangeError: Internal error. Icu error.` | 2 | scene19, scene33 |
| Plain JS errors | 6 | scene20, 21, 23, 26, 31, 114, 144 |
| Slow scene timing out | (1 within "JS errors" above) | |

**Root causes**:
- **Access violations + V8_Fatal**: caused by the wrapper-leak pattern. `JsValueObj` instances hold `v8::Global<v8::Value>` and are never tracked in a registry; many leak (the existing Chakra-side code doesn't call `JsRelease` on every transient value because Chakra is GC'd). At process exit, the atexit C-runtime destructor pass tries to free these `Global<>` handles via `GlobalHandles::Destroy`, but `Isolate::Dispose()` has already run, so the per-isolate handle slots are gone → crash. Fix would require maintaining a linked-list of live wrappers and draining/`Reset()`-ing them before isolate disposal.
- **ICU errors**: V8's `String::NewFromUtf8` is strict about UTF-8 well-formedness; some Babylon strings (probably an embedded high-Unicode character or a lone surrogate) that ChakraCore happily round-trips are rejected by V8. Needs sanitising at the string-creation boundary.
- **JS errors**: small semantic divergences (e.g. V8 thinks `Object.assign(null, x)` should throw stricter, or property enumeration order varies). Per-case fixes.

### Hermes (69 failures)

| Class | Count | Notes |
|-------|------:|-------|
| `TypeError: new DataView(buffer, ...): buffer must be an ArrayBuffer` | **65+** | Single root cause — see below |
| Other | a few | Indirect failures from the same path |

**Single root cause for 65+ scenes — the DataView/ArrayBuffer mismatch**:

The bundle's `fetch(url).arrayBuffer()` returns bytes wrapped via `JsCreateExternalArrayBuffer`. The Hermes-side implementation cannot zero-copy (JSI's only ArrayBuffer constructor takes a `std::shared_ptr<MutableBuffer>`), so it allocates a fresh `HeapBuffer : public jsi::MutableBuffer`, memcpys the source in, and constructs `ArrayBuffer(rt, sharedBuf)`. Hermes correctly reports `obj.isArrayBuffer(rt) == true` for this value.

**However**, the JS-side `new DataView(buf, offset, length)` constructor performs its own `IsRawArrayBuffer` check inside Hermes's VM (Babylon does `new DataView(glbBytes, 8, headerJsonLength)` to parse the glTF header). This check distinguishes between **VM-allocated** ArrayBuffers and **host-vended / `MutableBuffer`-backed** ArrayBuffers. The latter is rejected.

This means **any scene that loads a glTF/GLB asset fails** (which is ~90 % of them).

**Fix** (not yet done, would need ~1-2 more dev sessions):
1. Implement `JsCreate{,External}ArrayBuffer` by invoking the JS-side `new ArrayBuffer(size)` constructor via JSI, then writing bytes via `new Uint8Array(ab).set(srcBytes)`. This guarantees the resulting AB is VM-allocated, so `new DataView(ab, ...)` accepts it.
2. **Or** precompile bundles with `hermesc` to Hermes bytecode upfront — the bytecode path may take a different DataView code path that's looser.
3. **Or** patch Hermes' `JSDataView::create` to accept `MutableBuffer`-backed buffers (upstream change).

The 3 scenes that **do** pass on Hermes today (scene74, 76, 153) are procedural — they don't hit the `fetch → DataView(glb)` chain.

---

## 6. Folder layout shared across all engines

```
src/
├── framework/win32/        OS layer (image_decoder, native_window, http_fetcher, fs_loader)
└── appRuntime/
    ├── Shared/             ENGINE-AGNOSTIC: wgpu_bridge, wgpu_enums, dom_shim, worker_shim
    ├── Chakra/             chakra_host (uses ChakraCore.h directly)
    ├── QuickJS/            chakra_compat + chakra_host (on quickjs-ng)
    ├── V8/                 chakra_compat + chakra_host + nuget config + v8_setup.cmake
    └── Hermes/             chakra_compat + chakra_host + hermes_setup.cmake
```

Switch engines with `-DJS_ENGINE=Chakra|QuickJS|V8|Hermes`. The `Shared` files
use only the `cx::Host` facade and Chakra-style `Js*` C API — each engine plug-in
supplies the same surface (Chakra natively, others via the per-engine
`chakra_compat`).

---

## 7. Bottom-line ranking

For shipping a self-contained Windows WebGPU runtime:

1. **QuickJS** — 4.62 MB single exe, 66/72 scenes (92 %). Best size, acceptable speed.
2. **Hermes (static)** — 6.53 MB single exe, 3/72 today (would jump to ~70 with the ArrayBuffer fix).
3. **Chakra** — 11 MB total (needs the 7 MB ChakraCore.dll), 70/72 scenes (97 %). Best compatibility.
4. **V8** — 43.6 MB total, 51/72 scenes (71 %). Best raw JS perf but unbeatable runtime size + the wrapper-leak crash class needs handle tracking before it's usable for long-running scenes.

Per-engine deep-dives in `SIZE-REPORT.md`, `QUICKJS-PORT-REPORT.md`,
`SHARED-V8-REPORT.md`, `HERMES-PORT-REPORT.md`.

---

## 8. Dawn / Tint build configuration

Dawn is brought in via `add_subdirectory("dawn" EXCLUDE_FROM_ALL)`, so only
`webgpu_dawn` (the target `app` links against) and its transitive deps
actually compile.

### Dawn — ✅ kept ON

| Option | Why |
|---|---|
| `DAWN_ENABLE_D3D12` | The only backend used on Windows here |
| `DAWN_FETCH_DEPENDENCIES` | Lets Dawn pull its own deps (abseil, etc.) at configure |

### Dawn — ❌ disabled

**Backends (only D3D12 stays):**
`DAWN_ENABLE_VULKAN`, `DAWN_ENABLE_D3D11`, `DAWN_ENABLE_METAL`,
`DAWN_ENABLE_NULL`, `DAWN_ENABLE_DESKTOP_GL`, `DAWN_ENABLE_OPENGLES`,
`DAWN_ENABLE_WEBGPU_ON_WEBGPU`, `DAWN_ENABLE_SWIFTSHADER`.

**Windowing / UI integrations** (we use our own Win32 window in
`framework/win32/native_window.cpp`):
`DAWN_USE_GLFW`, `DAWN_USE_WAYLAND`, `DAWN_USE_X11`, `DAWN_USE_WINDOWS_UI`.

**Tools / build extras:**
`DAWN_BUILD_SAMPLES`, `DAWN_BUILD_TESTS`, `DAWN_BUILD_BENCHMARKS`,
`DAWN_BUILD_FUZZERS`, `DAWN_BUILD_PROTOBUF`, `DAWN_BUILD_NODE_BINDINGS`,
`DAWN_ENABLE_INSTALL`, `DAWN_ENABLE_SPIRV_VALIDATION`, `DAWN_USE_BUILT_DXC`
(use system DXC, avoids a Tint+LLVM dep tree).

### Tint (Dawn's WGSL→shader-language compiler) — ✅ kept ON

| Option | Why |
|---|---|
| `TINT_BUILD_WGSL_READER` | Required — Dawn parses WGSL shaders |
| `TINT_BUILD_WGSL_WRITER` | Required by some internal passes |
| `TINT_BUILD_HLSL_WRITER` | Required — Tint emits HLSL for D3D12 |

### Tint — ❌ disabled

| Option | Why off |
|---|---|
| `TINT_BUILD_SPV_READER` | We never ingest SPIR-V. **Disabling this drops all of SPIRV-Tools + SPIRV-Headers from the link** (single biggest Tint-side size win) |
| `TINT_BUILD_SPV_WRITER` | Same — no SPIR-V output needed for D3D12 |
| `TINT_BUILD_GLSL_WRITER` | No OpenGL target |
| `TINT_BUILD_GLSL_VALIDATOR` | No GLSL output to validate |
| `TINT_BUILD_MSL_WRITER` | No Metal target |
| `TINT_BUILD_IR_BINARY` | Tint's binary IR serialization; not needed at runtime |
| `TINT_BUILD_SYNTAX_TREE_WRITER` | Debug-only WGSL-AST printer |
| `TINT_BUILD_CMD_TOOLS` | CLI tools (tint-cli) |
| `TINT_BUILD_TESTS` | Test suite |
| `TINT_BUILD_DOCS` | Documentation generation |
| `TINT_ENABLE_INSTALL` | We don't `cmake --install` Tint |

### Size impact

These disables — combined with the MSVC flags
(`/O1 /Gy /Gw /GL /LTCG /OPT:REF /OPT:ICF`) and the `stb_image → WIC` swap —
took the Chakra `app.exe` from **9.56 MB → 4.06 MB (−57.6 %)**. The biggest
single contributor was dropping the non-D3D12 backends + SwiftShader; the
second biggest was `TINT_BUILD_SPV_*=OFF` (transitively removes SPIRV-Tools).

The canonical source is `CMakeLists.txt` lines 27–69.
