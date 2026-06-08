# Hermes (static_h branch) engine port — final summary

## What was added

```
src/appRuntime/Hermes/
├── hermes_setup.cmake          FetchContent for facebook/hermes branch=static_h
├── chakra_compat.{h,cpp}       Chakra-style API on top of JSI
└── chakra_host.{h,cpp}         cx::Host using HermesRuntime + module shim
```

- CMakeLists.txt: `JS_ENGINE` cache accepts `Hermes`; engine-specific block links
  `hermesvm` (the VM) + `jsi` (the JS interface) and post-build-copies `hermesvm.dll`
  next to `app.exe`.
- `hermes_setup.cmake` enables `HERMES_ENABLE_TOOLS=ON` (required so `hermesc`
  builds — it's needed at build time to compile Hermes's internal JS to bytecode)
  and disables everything else: NAPI, INTL, debugger, contrib extensions,
  test suite, Apple framework.

## Sizes (Release)

| File | Size |
|------|------|
| `app.exe` | **4.14 MB** |
| `hermesvm.dll` | **2.56 MB** |
| **Total deployment** | **6.70 MB** |

For comparison with the other engines:

| Engine | app.exe | Extra DLL | Total |
|--------|---------|-----------|-------|
| Chakra | 4.06 MB | ChakraCore.dll 7 MB | ~11 MB |
| QuickJS | 4.62 MB | (none) | **4.62 MB** ← smallest |
| V8 | 4.08 MB | v8.dll 24 MB + icudtl 10 MB + 5 others | ~43.6 MB |
| **Hermes** | **4.14 MB** | hermesvm.dll 2.56 MB | **6.70 MB** |

Hermes is the second-smallest deployable JS engine after QuickJS, and it ships
as a clean DLL pair with no ICU/data-blob baggage.

## Compat-layer notes specific to Hermes/JSI

JSI is a C++ exception-based interface — fundamentally different from Chakra's
return-code style and V8's TryCatch model. Each `Js*` entry point in
`chakra_compat.cpp` wraps the JSI call in `try/catch`, and `jsi::JSError`
exceptions are stashed in a thread_local slot so `JsHasException` /
`JsGetAndClearException` can surface them to the chakra-style code unchanged.

`JsValueObj` holds a `jsi::Value` in a placement-new'd raw byte slot (Value is
move-only); `JsAddRef`/`JsRelease` manage the wrapper refcount with manual
destructor invocation when it drops to 0.

Notable adapters:
- `JsCreateExternalArrayBuffer` cannot zero-copy — JSI requires a
  `MutableBuffer` instance, so we allocate a fresh heap buffer, memcpy in, then
  immediately invoke the caller's finalize.
- `JsCreateTypedArray` for types other than `Uint8Array` invokes the global
  constructor (`new Float32Array(buffer, offset, length)` etc.) via JS, since
  JSI's public surface only exposes `Uint8Array` directly.
- `JsCreateExternalObject` uses JSI's `HostObject` pattern with the finalizer
  fired from `~HostObject`.
- `Function::createFromHostFunction` is wrapped by a trampoline that re-shapes
  JSI's `(Runtime&, this, args*, count)` into Chakra's
  `(callee, ctor, args[0]=this+args[1..N], count, state)`.

## Module loading workaround

Hermes has no native ES module support — `evaluateJavaScript` only takes
classic scripts. The Babylon-Lite bundles are ES modules with `import`/`export`
syntax. The chakra_host's `runModule` therefore pre-processes source with
`stripEsModuleSyntax`:

- `import 'x';` and `import X from 'y';` → dropped
- `export default expr;` → `globalThis.__bundleDefault = expr;`
- `export { A, B as C, D };` (handles multi-line / Rollup-aliased forms) →
  `Object.assign(globalThis.__bundleDefault || (globalThis.__bundleDefault = {}), { A: A, C: B, D: D });`
- `export const|let|var|function|class` → the `export ` prefix is stripped

`importByPath` then evaluates the chunk as a script and returns
`globalThis.__bundleDefault` as the module namespace.

This handles all common Rollup-generated chunk shapes — the dynamic-import
chain from `__import('scene1-gltf-glb-parser-...js')` correctly returns an
object with `parseGlbContainer` on it.

## Bundle regression sweep (72 known-passing scenes)

| Engine | Pass | Notes |
|--------|------|-------|
| Chakra | 70 / 72 | reference |
| QuickJS | 66 / 72 | |
| V8 | 51 / 72 | |
| **Hermes** | **3 / 72** | scene74, scene76, scene153 |

The 3 passing scenes are ones that don't go through the
`fetch().arrayBuffer()` → glTF binary parsing path. The remaining 69 all hit:

```
[jserr] TypeError: new DataView(buffer, [byteOffset], [byteLength]):
        buffer must be an ArrayBuffer
```

The buffer returned from `fetch().arrayBuffer()` is wrapped via
`JsCreateExternalArrayBuffer` → `ArrayBuffer(rt, MutableBuffer)`. Hermes
recognises it as an ArrayBuffer for `JS_IsArrayBuffer`, but the global
`new DataView(buf, off, len)` constructor rejects it. This appears to be a
Hermes internal distinction between "host-vended" `ArrayBuffer` and
"JS-allocated" `ArrayBuffer` — `DataView` only accepts the latter.

Fixes that would unblock most scenes (not done — would need ~1-2 more dev
sessions):
1. Implement `JsCreateArrayBuffer` / `JsCreateExternalArrayBuffer` by
   invoking the JS-side `new ArrayBuffer(size)` constructor and writing
   bytes via a side-channel (or via `new Uint8Array(ab).set(...)`).
2. Or: precompile bundles with `hermesc` to Hermes bytecode — the bytecode
   path might use different internal flags that accept host buffers.

## What works today (Hermes)

- ES-module bundle preprocessing + script eval
- Promise / microtask flushing via `drainMicrotasks()`
- Dynamic `import()` → `__import()` → `host.importByPath()` (returns the
  Rollup namespace correctly)
- WebGPU surface creation, swapchain, render loop (scene74/76/153 prove this)
- DOM shim including `requestAnimationFrame`, `console`, `fetch` for non-glTF
  scenes
- `Uint8Array` and other typed arrays via constructor-by-name
- WASM-package detection → `__wasmTriggered` exit code
- Workers: stubbed (`JsCreateRuntime` returns failure) — would need a
  per-thread HermesRuntime to fully support; punted for now.

## How to build / run

```powershell
cmake -B build-hermes -G Ninja -DCMAKE_BUILD_TYPE=Release -DJS_ENGINE=Hermes
cmake --build build-hermes --target app
# First configure clones static_h branch (~5 min) + builds Hermes (~10 min);
# rebuilds after are quick.
.\build-hermes\app.exe .\build-hermes\assets\bundle\scene74.js --exit-on-ready --max-frames 200
```

## Files added/modified this session

- **`src/appRuntime/Hermes/`** (new) — hermes_setup.cmake, nuget-style config
  files unnecessary (no NuGet — FetchContent only), chakra_compat.{h,cpp},
  chakra_host.{h,cpp}.
- **`CMakeLists.txt`** — `JS_ENGINE` STRINGS now includes `Hermes`; engine
  dispatch turned into a strict `if/elseif/elseif/elseif` (was leaking V8
  defines into Hermes builds earlier).
- **`test-scenes-hermes.ps1`** — regression harness pointing at build-hermes.

No commits made. All four engines (Chakra/QuickJS/V8/Hermes) coexist in
separate build directories.
