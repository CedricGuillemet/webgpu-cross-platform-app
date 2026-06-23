![image](https://github.com/beaufortfrancois/webgpu-cross-platform-app/assets/634478/81579516-7390-4198-bb18-68e7f4cb34c3)

# WebGPU cross-platform app with CMake/Emscripten

This app is a <em>minimalistic</em> C++ example that shows how to use [WebGPU](https://gpuweb.github.io/gpuweb/) to build desktop and web apps from a single codebase. Under the hood, it uses WebGPU's [webgpu.h](https://github.com/webgpu-native/webgpu-headers/blob/main/webgpu.h) as a stable and platform-agnostic hardware abstraction layer through a C++ wrapper called [webgpu_cpp.h](https://source.chromium.org/chromium/chromium/src/+/main:third_party/dawn/include/webgpu/webgpu_cpp.h). Note that this wrapper is subject to change.

On the web, the app is built against [Emdawnwebgpu](https://dawn.googlesource.com/dawn/+/refs/heads/main/src/emdawnwebgpu/) (Emscripten Dawn WebGPU), which has bindings implementing webgpu.h on top of the JavaScript API. It uses [Emscripten](https://emscripten.org/), a tool for compiling C/C++ programs to WebAssembly. On specific platforms such as macOS or Windows, this project can be built against [Dawn](https://dawn.googlesource.com/dawn/), Chromium's cross-platform WebGPU implementation. While webgpu.h is considered stable, this stability doesn't include extensions added by Emdawnwebgpu or Dawn.

## Setup

```sh
# Clone repository and initialize submodules.
git clone https://github.com/beaufortfrancois/webgpu-cross-platform-app.git
cd webgpu-cross-platform-app/
git submodule update --init
```

## Requirements

<i>Instructions are for macOS; they will need to be adapted to work on Linux and Windows.</i>

```sh
# Make sure CMake and Emscripten are installed.
brew install cmake emscripten
```

## Specific platform build

```sh
# Build the app with CMake.
cmake -B build && cmake --build build -j4

# Run the app.
./build/app
```

## Web build

```sh
# Build the app with Emscripten.
emcmake cmake -B build-web && cmake --build build-web -j4

# Run a server.
npx http-server
```

```sh
# Open the web app.
open http://127.0.0.1:8080/build-web/app.html
```

### Debugging WebAssembly

When building the app, compile it with DWARF debug information included thanks to `emcmake cmake -DCMAKE_BUILD_TYPE=Debug -B build-web`. And make sure to install the [C/C++ DevTools Support (DWARF) Chrome extension](https://goo.gle/wasm-debugging-extension) to enable WebAssembly debugging in DevTools.

<img width="1112" alt="image" src="https://github.com/beaufortfrancois/webgpu-cross-platform-app/assets/634478/e82f2494-6b1a-4534-b9e3-0c04caeca96d">

---

# DawnTest + BabylonNative benchmark (Windows)

`DawnTest` runs a **Babylon-Lite** scene on Dawn (WebGPU) with a pluggable JS
engine. The **BabylonNative Playground** runs the equivalent full-Babylon scene.
Both expose the same bench CLI so their per-frame cost and binary size can be
compared head-to-head.

## Build

Matrix of `{Chakra, V8, QuickJS, Hermes} × {D3D11, D3D12}` into `bin/`:

```powershell
# DawnTest -> bin/Dawn-app-<Engine>-<Api>.exe
powershell tools/bench/build-dawntest-matrix.ps1
# BabylonNative -> bin/BabylonNative-Playground-<Engine>-<Api>.exe
powershell tools/bench/build-bn-matrix.ps1
```

A single config builds directly with CMake (`-DJS_ENGINE=` one of
`Chakra|V8|QuickJS|Hermes`, `-DGRAPHICS_API=` `D3D11|D3D12`):

```powershell
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DJS_ENGINE=QuickJS -DGRAPHICS_API=D3D12
cmake --build build --target app
```

## Build the scene bundles

Babylon-Lite scenes must be bundled to a self-contained IIFE first
(`assets/script`, needs Node):

```powershell
cd assets/script
npm install
npm run build:bundles          # -> assets/bundle/*.lite.js          (modern engines)
npm run build:bundles-chakra   # -> assets/bundle-chakra/*.lite.chakra.js (Chakra)
npm run build:bench            # -> assets/benchmark/Bench-BN-Dawn.{lite.js,lite.chakra.js,babylon.js}
```

**Chakra** (Windows SDK ChakraCore) can't parse modern syntax, so it needs the
`*.lite.chakra.js` variant (Babel-downleveled by `build:bundles-chakra`). All
other engines use the plain `*.lite.js` bundle.

## Run

DawnTest — bundle path is positional or `--scene`:

```powershell
bin/Dawn-app-QuickJS-D3D12.exe assets/bundle/scene1.lite.js --frames 300
bin/Dawn-app-Chakra-D3D12.exe  assets/bundle-chakra/scene1.lite.chakra.js --frames 300
```

BabylonNative — script path is positional:

```powershell
bin/BabylonNative-Playground-QuickJS-D3D12.exe assets/benchmark/Bench-BN-Dawn.babylon.js --frames 300
```

Common flags (both apps):

| Flag | Meaning |
|------|---------|
| `--frames N` | Render N frames then exit. Implies `--no-vsync`. No flag = run forever. |
| `--no-vsync` | Uncap the frame rate (required for a meaningful speed measurement). |
| `--scene PATH` | DawnTest: bundle to run (same as the positional arg). |
| `--screenshot PATH` | DawnTest: write a PNG before exit. |
| `--screenshot-frame N` | DawnTest: capture the PNG at exactly frame N. |

## Exit output

On exit both apps print a machine-readable line:

```
BENCH scene=<name> frames=<N> wall_ms=<W> min_ms=<m> avg_ms=<a> max_ms=<x> p95_ms=<p> cpu_ms=<c> mem_peak_bytes=<b>
```

| Field | Meaning |
|-------|---------|
| `frames` | Frames included in the stats. The **first frame is dropped** (warmup: shader compile / first upload), so this is `--frames` minus 1. |
| `wall_ms` | Sum of the included per-frame deltas (≈ active render time). |
| `min/avg/max/p95_ms` | Per-frame time in ms over the included frames. |
| `cpu_ms` | Total process CPU time (kernel + user) for the whole run. |
| `mem_peak_bytes` | Peak working set of the process (Windows `PeakWorkingSetSize`). |

Derive **FPS** from `avg_ms`: `fps = 1000 / avg_ms`. Always pass `--frames`
(or `--no-vsync`) — otherwise timings are pinned to the display refresh, not
the real GPU/CPU cost. DawnTest also echoes a human line to stderr:
`[main] frames=N wall_ms=... cpu_ms=... mem_peak_bytes=... (X MB)`.

## Notes

- Binary size: `bin/Dawn-app-*` are self-contained except V8 (ships sibling
  `v8.dll` etc.); BN exes load `bin/Scripts/` and engine DLLs staged in `bin/`.
- Engine availability: Chakra uses the Windows SDK ChakraCore; QuickJS BN uses
  the `CedricGuillemet/BabylonNative@quickjs` fork (upstream has no QuickJS).
- CI publishes a per-ABI build-size table only (runners have no real GPU); the
  per-frame benchmark is a local-only tool — see `documentation/benchmark.md`.
