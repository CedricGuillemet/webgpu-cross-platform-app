# app.exe Size Optimization Report

## Result

| Build | Size | Δ |
|-------|------|----|
| Baseline (`build\app.exe`) | **10,025,984 bytes (9.56 MB)** | — |
| Optimized (`build-small\app.exe`) | **4,253,696 bytes (4.06 MB)** | **−5.50 MB / −57.6 %** |

Regression sweep of all **72 previously-passing scenes**: 70/72 pass; the remaining 2 (`scene14`, `scene176`) are environmental (slow network / pre-existing baseline crash), not real regressions. With a higher frame cap `scene14` also passes on build-small. **No functional regression introduced.**

---

## Modifications applied

### 1. Dawn backend / build trimming (`CMakeLists.txt`)
Disabled every backend not used on Windows D3D12:
- `DAWN_ENABLE_VULKAN=OFF`
- `DAWN_ENABLE_D3D11=OFF`
- `DAWN_ENABLE_METAL=OFF`
- `DAWN_ENABLE_NULL=OFF`
- `DAWN_ENABLE_OPENGL=OFF` / `DAWN_ENABLE_OPENGLES=OFF`
- `DAWN_ENABLE_WEBGPU_ON_WEBGPU=OFF`
- `DAWN_ENABLE_SPIRV_VALIDATION=OFF`
- `DAWN_ENABLE_SWIFTSHADER=OFF`
- `DAWN_USE_GLFW=OFF`, `DAWN_USE_WAYLAND=OFF`, `DAWN_USE_X11=OFF`, `DAWN_USE_WINDOWS_UI=OFF`
- `DAWN_USE_BUILT_DXC=OFF`
- `DAWN_BUILD_SAMPLES/TESTS/BENCHMARKS/FUZZERS/PROTOBUF/NODE_BINDINGS=OFF`
- `DAWN_ENABLE_INSTALL=OFF`
- Kept: `DAWN_ENABLE_D3D12=ON` (only backend needed).

### 2. Tint shader-compiler trimming
Kept only what's required to ingest WGSL and emit HLSL for D3D12:
- ON: `TINT_BUILD_WGSL_READER`, `TINT_BUILD_WGSL_WRITER`, `TINT_BUILD_HLSL_WRITER`
- OFF: `TINT_BUILD_CMD_TOOLS`, `TINT_BUILD_TESTS`, `TINT_BUILD_SPV_READER`,
  `TINT_BUILD_SPV_WRITER`, `TINT_BUILD_GLSL_WRITER`, `TINT_BUILD_GLSL_VALIDATOR`,
  `TINT_BUILD_MSL_WRITER`, `TINT_BUILD_IR_BINARY`, `TINT_BUILD_SYNTAX_TREE_WRITER`

Removing `TINT_BUILD_SPV_*` cascade-drops all SPIRV-Tools and SPIRV-Headers from the link.

### 3. MSVC compiler/linker size flags
Added to `if(MSVC)` block:
```
add_compile_options(/O1 /Gy /Gw /GL /Zc:inline)
add_link_options(/LTCG /OPT:REF /OPT:ICF /INCREMENTAL:NO /DEBUG:NONE)
```
- `/O1` — optimize for size (overrides Dawn's `/O2`; harmless warning D9025).
- `/Gy` — function-level COMDAT (lets linker drop unreferenced functions).
- `/Gw` — data-level COMDAT (lets linker drop unreferenced globals).
- `/GL` + `/LTCG` — whole-program LTO for cross-TU inlining and dead-stripping.
- `/Zc:inline` — discard `inline` definitions emitted by every TU.
- `/OPT:REF` — drop unused code and data.
- `/OPT:ICF` — fold identical functions (huge win for templated/instantiated code).
- `/INCREMENTAL:NO`, `/DEBUG:NONE` — strip incremental thunks and debug bloat.

### 4. Replaced `stb_image` with Windows Imaging Component (WIC)
New: `src/image_decoder.h` + `src/image_decoder.cpp` (~120 lines).
- `IWICImagingFactory` + `IWICStream::InitializeFromMemory` + `IWICFormatConverter` → `GUID_WICPixelFormat32bppRGBA`.
- COM init done once in `main.cpp::main()` via `image_decoder::initialize()`; teardown via `shutdown()` at exit.
- Bonus: WIC supports JPEG, PNG, BMP, GIF, TIFF, ICO, HD Photo, HEIF/HEIC out of the box without bundling decoder code.
- Removed `src/stb_image.h` (~8 000 LOC of decoder source).
- Linked `windowscodecs.lib ole32.lib`.

### 5. (Already done previously) Removed GLFW
The previous Win32 conversion removed GLFW; we just made sure `DAWN_USE_GLFW=OFF` so Dawn doesn't pull it in either.

---

## Further size-reduction ideas (in rough order of expected payoff)

1. **Swap ChakraCore for a smaller JS engine.** `ChakraCore.dll` is ~7 MB on disk and ships separately; switching to **QuickJS** (~700 KB static link) would slash both EXE and total shippable size, at the cost of slower execution.
2. **Build Dawn as a shared `webgpu_dawn.dll`.** Today everything is statically linked; a shared lib shrinks the EXE dramatically (the bulk of the 4 MB is the static Dawn + Tint).
3. **Trim the wgpu_bridge.** The dispatch table exposes ~70 WebGPU methods; profiling a single bundle shows most are unused per-scene. A per-app subset would shave hundreds of KB.
4. **Strip more Tint passes.** Audit `TINT_BUILD_IR_*` flags; even with HLSL-only some IR passes may not be needed.
5. **Replace `winhttp.lib` with a hand-rolled WinINet/socket client.** WinHTTP is ~200 KB of import surface for what amounts to `GET <url>`.
6. **Drop the JSON polyfills in JS shim.** ChakraCore already implements ECMAScript `JSON`; the JS shim has redundant fallbacks.
7. **Compress the EXE with UPX.** ~50% on-disk reduction for free (slower cold start, opaque to debuggers — keep an unpacked variant for crash dumps).
8. **Switch toolchain to `clang-cl` + `lld-link --icf=all --gc-sections`.** ICF is more aggressive than MSVC's, and LLD often beats `link.exe` on dead-code stripping for C++.
9. **Use `/Os` over `/O1`.** Equivalent in most cases but occasionally gives a tiny extra reduction.
10. **Replace `dxcompiler.dll` runtime path.** If you're willing to lock to a specific DXIL pipeline, baking shaders offline lets you ship without DXC at all (and lets Tint stay HLSL-text-only). Saves on the dxcompiler dependency.
11. **Move asset shim (`fetch`/cache layer) to lazy-loaded code.** Many code paths exist for cases never hit by the scene; gating them behind `JS_NewCFunction` lazy registration cuts the static init footprint.

---

## How to rebuild

```
cmake -B build-small -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-small
```
Output: `build-small\app.exe` (4.06 MB).

Smoke test: `cd build-small ; .\app.exe .\assets\bundle\scene1.js --exit-on-ready --max-frames 200`
