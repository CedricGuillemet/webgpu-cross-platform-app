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
(`assets/script`, needs Node). esbuild transpiles the TypeScript and
resolves/tree-shakes the `babylon-lite` dependency graph into one file; IIFE
is used because it runs on every engine — legacy Windows-SDK Chakra has no
ES-module support, so the entry must be a plain script with no top-level
`import`/`export`. The other engines (V8/QuickJS/Hermes/JSC) could also run an
ESM bundle, but IIFE is the common denominator.

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
