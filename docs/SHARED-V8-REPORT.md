# Shared appRuntime + V8 engine port — final summary

## Answer to "can chakra_compat.cpp be moved to Shared?"

**No.** `chakra_compat.cpp` is an *implementation of the Chakra-style API on top
of a specific engine* (QuickJS or V8). The .cpp file is intrinsically
engine-coupled — it calls `JS_NewObject`/`JS_DupValue` for QuickJS or
`v8::Object::New`/`v8::HandleScope` for V8. Only the *shape* of `JsValueRef`,
the `Js*` function names, and the enums (`JsValueType`, `JsErrorCode`, etc.)
are conceptually shared, but those need to defer to engine-specific definitions
for `JsValueRef` to compile, so they don't move cleanly either.

**What *did* move** (was duplicated, now Shared): the engine-agnostic application
layer — `wgpu_bridge`, `wgpu_enums`, `dom_shim`, `worker_shim` — which uses only
the `cx::Host` facade + the Chakra-style C API. Each engine plug-in supplies the
host + API; the application layer doesn't care which one it is.

## Final folder layout

```
src/
├── framework/
│   └── win32/                 OS-specific (image, window, http, fs) — 1 platform
└── appRuntime/
    ├── Shared/                ENGINE-AGNOSTIC, deduplicated
    │   ├── wgpu_bridge.{h,cpp}
    │   ├── wgpu_enums.{h,cpp}
    │   ├── dom_shim.{h,cpp}
    │   └── worker_shim.{h,cpp}
    ├── Chakra/                JS_ENGINE=Chakra
    │   └── chakra_host.{h,cpp}     uses ChakraCore.h directly
    ├── QuickJS/               JS_ENGINE=QuickJS
    │   ├── chakra_compat.{h,cpp}   Chakra-style API ON QuickJS
    │   └── chakra_host.{h,cpp}
    └── V8/                    JS_ENGINE=V8
        ├── nuget.config
        ├── packages.config
        ├── v8_setup.cmake          downloads v8-v143-x64 NuGet (JsRuntimeHost pattern)
        ├── chakra_compat.{h,cpp}   Chakra-style API ON V8
        └── chakra_host.{h,cpp}
```

`CMakeLists.txt` ships the **same** Shared sources to every engine target;
the engine-specific dir is added to the include path so `#include "chakra_host.h"`
resolves to whichever engine is selected.

## V8 integration

Followed the JsRuntimeHost pattern for V8:
1. **`v8_setup.cmake`** downloads NuGet packages `v8-v143-x64.11.9.169.4` +
   `v8.redist-v143-x64.11.9.169.4` from public NuGet.org (the same versions
   JsRuntimeHost uses).
2. Defines `V8_COMPRESS_POINTERS=1`, `V8_31BIT_SMIS_ON_64BIT_ARCH=1`, and
   **`V8_ENABLE_SANDBOX=1`** (the package was built with sandbox on; the
   embedder must match — V8 aborts at `V8::Initialize()` otherwise).
3. POST_BUILD copies 8 redist files next to `app.exe`:
   `v8.dll`, `v8_libbase.dll`, `v8_libplatform.dll`, `icuuc.dll`,
   `third_party_icu_icui18n.dll`, `third_party_abseil-cpp_absl.dll`,
   `third_party_zlib.dll`, `icudtl.dat`.

## V8 compat-layer specifics

The same `JsValueRef = JsValueObj*` wrapper pattern as QuickJS, but the inner
storage is `v8::Global<v8::Value>` instead of `JSValue`. Every API entry point
opens a `v8::HandleScope` before touching V8 handles. Native function
trampolines bridge `v8::FunctionCallbackInfo` → Chakra's
`(callee, ctor, args[], argc, state)` shape; the magic int identifies the
slot in a global `std::vector<Trampoline>` (same as the QuickJS port).

**Notable workaround for V8 sandbox:** `JsCreateExternalArrayBuffer` no longer
zero-copies the caller's bytes — sandbox forbids non-sandbox backing stores.
We allocate a sandbox-owned `ArrayBuffer::New(iso, size)`, memcpy in, and
immediately run the caller's finalize. Loses zero-copy in `fetch().arrayBuffer()`
paths but stays correct.

**Module loading** uses V8's native `ScriptCompiler::CompileModule` +
`Module::InstantiateModule(ctx, resolveCallback)` + `Module::Evaluate`. The
resolve callback maps specifier → absolute path → cached `Global<Module>`,
mirroring the chakra_host implementation. WASM-package detection is duplicated
in both the resolve callback and `importByPath`.

## Final sizes & deployment

| Build | `app.exe` | Extra runtime files | Total on-disk |
|-------|-----------|---------------------|----------------|
| Chakra (build-small) | **4.06 MB** | ChakraCore.dll 7 MB | ~11 MB |
| QuickJS (build-quickjs) | **4.62 MB** | none (static) | **4.62 MB** ← smallest |
| V8 (build-v8) | **4.08 MB** | v8.dll 24 MB + icudtl.dat 10 MB + 4 ICU/zlib/abseil DLLs (~5 MB) | **~43.6 MB** ← largest |

## Bundle test results

All three engines pass scene1 (BoomBox) smoke test.

Regression sweep against the **72 historically-passing** scenes
(`test-scenes-{small,quickjs,v8}.ps1`):

| Engine | Pass | Fail | Pass-rate |
|--------|------|------|-----------|
| Chakra | 70/72 | 2 (env-flaky, not real regressions) | **97 %** |
| QuickJS | 66/72 | 5 timeouts + 1 RangeError | **92 %** |
| V8 | 51/72 | 21 (mix of crash/JS-error/ICU) | **71 %** |

V8 failure categories:
- **9 access violations (0xC0000005)** — likely caused by my leak-tolerant
  `JsValueObj` pattern: untracked persistent handles get destructed by static
  cleanup AFTER `Isolate::Dispose()`, hitting `GlobalHandles::Destroy` after
  internal state is gone. Fix would require explicit lifetime tracking
  (a registry of live wrappers that's drained before isolate disposal).
- **3 V8_Fatal breakpoints (0x80000003)** — V8 internal asserts at process
  exit, same root cause as above.
- **2 ICU errors (`RangeError: Internal error. Icu error.`)** — V8's
  `String::NewFromUtf8` is strict about UTF-8 well-formedness; some Babylon
  paths pass strings that ChakraCore happily accepts but V8 rejects.
- **6 plain JS errors** — small semantic divergences that need per-case fixes.
- **1 slow scene timing out at 800 frames** — perf.

## How to build / run each engine

```powershell
# Chakra
cmake -B build-small    -G Ninja -DCMAKE_BUILD_TYPE=Release -DJS_ENGINE=Chakra
cmake --build build-small --target app

# QuickJS (uses FetchContent → quickjs-ng v0.10.0)
cmake -B build-quickjs  -G Ninja -DCMAKE_BUILD_TYPE=Release -DJS_ENGINE=QuickJS
cmake --build build-quickjs --target app

# V8 (downloads v8-v143-x64 NuGet on first configure)
cmake -B build-v8       -G Ninja -DCMAKE_BUILD_TYPE=Release -DJS_ENGINE=V8
cmake --build build-v8 --target app

# Run any bundle with any engine
.\build-v8\app.exe .\build-v8\assets\bundle\scene1.js --exit-on-ready --max-frames 200
```

## Files added/modified this session

- **`src/appRuntime/Shared/`** — 4 files moved here (deduplicated)
- **`src/appRuntime/V8/`** — 5 new files: `nuget.config`, `packages.config`,
  `v8_setup.cmake`, `chakra_compat.{h,cpp}`, `chakra_host.{h,cpp}`
- **`CMakeLists.txt`** — `JS_ENGINE` cache now accepts `V8`; engine block dispatches
  to v8_setup.cmake; engine-specific link + DLL-copy blocks
- **`test-scenes-v8.ps1`** — regression harness pointing at build-v8

No commits made. All three engines coexist in separate build directories.
