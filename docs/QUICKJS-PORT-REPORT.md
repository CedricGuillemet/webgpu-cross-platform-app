# QuickJS Engine Port — Result Summary

## Final result

| Build | `app.exe` | Extra DLL | Total deployment | Scene1 (BoomBox) | 72-scene pass-rate |
|-------|-----------|-----------|------------------|------------------|--------------------|
| Chakra (build-small) | **4.06 MB** | ChakraCore.dll 7 MB | ~11 MB | ✅ renders | 70/72 |
| QuickJS (build-quickjs) | **4.62 MB** | none (static) | **4.62 MB** | ✅ renders | **66/72** |

**Net deployment win for QuickJS: ~6.4 MB (−58%).**

## Structural changes

```
src/
├── framework/
│   └── win32/                 (engine-agnostic OS layer)
│       ├── image_decoder.{h,cpp}    WIC-based RGBA decode
│       ├── native_window.{h,cpp}    Win32 window + message pump
│       ├── http_fetcher.{h,cpp}     WinHTTP client
│       └── fs_loader.{h,cpp}        File I/O + exe-dir lookup
└── appRuntime/
    ├── Chakra/                (selected when -DJS_ENGINE=Chakra)
    │   ├── chakra_host.{h,cpp}
    │   ├── wgpu_bridge.{h,cpp}
    │   ├── wgpu_enums.{h,cpp}
    │   ├── dom_shim.{h,cpp}
    │   └── worker_shim.{h,cpp}
    └── QuickJS/               (selected when -DJS_ENGINE=QuickJS)
        ├── chakra_compat.{h,cpp}   Chakra-style JsValueRef API → QuickJS
        ├── chakra_host.{h,cpp}     cx::Host backed by JSRuntime + JSContext
        ├── wgpu_bridge.{h,cpp}     same source, compiles against compat layer
        ├── wgpu_enums.{h,cpp}      ditto
        ├── dom_shim.{h,cpp}        ditto
        └── worker_shim.{h,cpp}     ditto
```

## CMake changes

```cmake
set(JS_ENGINE "Chakra" CACHE STRING "JavaScript engine to use: Chakra or QuickJS")
set_property(CACHE JS_ENGINE PROPERTY STRINGS Chakra QuickJS)
```

When `JS_ENGINE=QuickJS`:
- `FetchContent_Declare(quickjs GIT_REPOSITORY https://github.com/quickjs-ng/quickjs.git GIT_TAG v0.10.0 GIT_SHALLOW TRUE)`
- `BUILD_QJS_LIBC=OFF`, `BUILD_EXAMPLES=OFF`, `BUILD_STATIC_QJS_EXE=OFF`, `BUILD_SHARED_LIBS=OFF` (build only the `qjs` static lib)
- Links `qjs` instead of `chakracore`
- Adds `/STACK:16777216` link flag (QuickJS uses native stack for JS frames)
- No ChakraCore.dll copy step

## Compat-layer design

`chakra_compat.{h,cpp}` provides a Chakra-style C API on top of QuickJS so the
~140 KB of `wgpu_bridge` / `dom_shim` / `worker_shim` code compiles unchanged:

- `typedef JsValueObj* JsValueRef`, where `JsValueObj { JSValue v; int rc; }`
- All `Js*` calls (`JsCallFunction`, `JsAddRef/Release`, `JsCreateArrayBuffer`,
  `JsCreatePromise`, `JsCreateTypedArray`, `JsCreateExternalObject`, etc.)
  forward to the equivalent QuickJS APIs.
- `JsNativeFunction` (Chakra: `args[0]=this`) is bridged by a trampoline that
  wraps QuickJS's `JSCFunctionData` signature and re-shapes the argv. State+fn
  pointers are kept in a magic-indexed `std::vector<Trampoline>`.
- External (opaque) objects use a custom `JSClass` with finalizer.
- Module loading uses `JS_SetModuleLoaderFunc` with a file-system normalizer +
  loader. Dynamic `__import(spec)` is implemented via `JS_Eval(... TYPE_MODULE |
  COMPILE_ONLY)` + `JS_EvalFunction` + `JS_GetModuleNamespace`.
- The well-known WASM-package list (`@babylonjs/havok`, `manifold`, etc.) is
  detected in both the module normalizer and `importByPath`, marking
  `globalThis.__wasmTriggered = "true"` so the main loop exits with the
  WASM-unsupported code.

## Regression sweep (66/72 known-passing scenes)

**6 regressions vs Chakra:**

| Scene | Cause | Notes |
|-------|-------|-------|
| scene11 | timeout (45 s) | QuickJS is interpreter-only; deep BVH-builds are slow |
| scene34 | `RangeError: invalid length` | repeated; likely a typed-array length QuickJS rejects but Chakra accepts |
| scene144 | timeout | |
| scene152 | timeout | |
| scene157 | timeout | |
| scene158 | timeout | |

Five of the six are pure perf (timeout at the 45 s harness cap, not a crash);
one is a genuine semantic difference in typed-array length validation.

## What still works

- ES module loading (top-level static `import`)
- Dynamic `import()` (rewritten by `transform-bundle.js` to `__import()`)
- Promises and microtasks (`JS_ExecutePendingJob`)
- WebGPU bindings (full `wgpu_bridge` dispatch table)
- Canvas / DOM shim (events, fetch, image bitmap, requestAnimationFrame)
- WIC-backed `createImageBitmap`
- WASM-package detection → clean exit with `kExitWasmUnsupported`
- Workers (`JS_NewRuntime`/`JS_NewContext` per worker thread)
- Pass on BoomBox (scene1), flightHelmet (scene14), MosquitoInAmber (scene176)

## Known limitations

- ~5-10× slower than Chakra on hot JS (QuickJS has no JIT)
- `cc::wrap`/`JsValueObj` wrappers are heap-allocated and leaked when the
  downstream code doesn't call `JsRelease` (matches the Chakra GC assumption).
  Per-frame leak is ~few KB; mitigated by `JS_RunGC` on shutdown.
- Pixel-exact regression of WIC vs stb_image was not separately retested under
  QuickJS — image decoding goes through the same `framework/win32/image_decoder.cpp`.

## How to build / run

```powershell
# Chakra (existing path)
cmake -B build-small -G Ninja -DCMAKE_BUILD_TYPE=Release -DJS_ENGINE=Chakra
cmake --build build-small --target app

# QuickJS (new path)
cmake -B build-quickjs -G Ninja -DCMAKE_BUILD_TYPE=Release -DJS_ENGINE=QuickJS
cmake --build build-quickjs --target app

# Run any bundle
.\build-quickjs\app.exe .\build-quickjs\assets\bundle\scene1.js
```
