# Bench guide — DawnTest vs BabylonNative Playground

This guide explains how to run the side-by-side benchmark that compares
the **DawnTest** native WebGPU app (`webgpu-cross-platform-app/`) against
the **BabylonNative Playground** on the same `scene200` workload.

This is a **local-only** procedure (Windows or macOS host): GitHub's CI
runners have no representative GPU, so CI publishes a build-size
comparison instead of timings (see [CI integration](#ci-integration)).
The runner auto-discovers every build configuration it finds on disk, so
you can mix and match engines (Chakra / V8 / QuickJS / Hermes / JSC) and
graphics APIs (D3D11 / D3D12 / Vulkan / Metal / OpenGL ES) without
editing the script.

The result is a single HTML report with per-cell timing (min / avg / p95
/ max ms per frame, FPS) and a side-by-side bar chart sorted by avg
ms/frame.

## Quick start (Windows)

```powershell
# 1. Build the JS asset bundles (one-time, ~30 s).
cd assets\script
npm ci
npm run build
cd ..\..

# 2. Build the apps you want to compare.
#    (Skip any you don't have a build dir for — the runner just ignores
#     missing ones.)
cmake --build build-v8       --config Release --target app
cmake --build build-small    --config Release --target app
cmake --build build-d3d11    --config Release --target app
cmake --build build-quickjs  --config Release --target app
cmake --build build-hermes   --config Release --target app

# (BN Playground side — assumes ../BabylonNative is on the cedric/quickjs
#  or cedric/hermes-integration branch with the bench wiring applied.)
cd ..\BabylonNative
cmake --build build\win32-d3d12-chakra --config Release --target Playground
cd ..\webgpu-cross-platform-app

# 3. Run the bench. Auto-opens the HTML report in your default browser.
pwsh tools\bench\run-bench.ps1 --frames 600
```

## Quick start (macOS)

```bash
cd assets/script
npm ci
npm run build
cd ../..

# Build the macOS / iOS variants you want to compare. Adjust paths to
# match your CMake build dirs. The runner discovers any build-* / build/
# subdir that contains a CMakeCache.txt and a built executable.
cmake --build build-jsc-metal --config Release --target app

cd ../BabylonNative
cmake --build build/macos-metal-chakra --config Release --target Playground
cd ../webgpu-cross-platform-app

./tools/bench/run-bench.sh --frames 600
```

iOS support requires a connected, provisioned device:

```bash
# Discover device:
xcrun devicectl list devices
# Bench (run-bench.mjs will probe `xcrun devicectl device process launch`
# once iOS cells are added to the matrix — currently a TODO; see below).
```

## What's in the matrix

The runner walks two trees:

| What                         | Where                                                            | Discovery rule                                                                                          |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| DawnTest                     | `<repo>/build-*/`                                                | reads `CMakeCache.txt` for `JS_ENGINE` and `GRAPHICS_API`; needs `app.exe` (Win) or `app` (POSIX)       |
| BabylonNative Playground     | `<BN root>/build/*/`                                             | derives engine + gfx from the build dir name (e.g. `win32-d3d12-chakra`); needs `Playground.exe`/`.app` |

Set `BN_ROOT` or `--bn-root` to point at a BabylonNative checkout other
than `../BabylonNative`.

### Cell naming

A "cell" is one (app × engine × gfx) tuple. Naming pattern:

| Pattern                                       | Example                          |
| --------------------------------------------- | -------------------------------- |
| `dawntest-<engine>-<gfx>`                     | `dawntest-v8-d3d12`              |
| `bnplayground-<engine>-<gfx>`                 | `bnplayground-chakra-d3d12`      |

Use `--only` to filter:

```powershell
pwsh tools\bench\run-bench.ps1 --frames 200 `
    --only dawntest-v8-d3d12,bnplayground-chakra-d3d12
```

## How a bench cell is run

For each cell, the runner launches the executable with:

* `<scene-bundle.js>` — positional script. For DawnTest cells, this is
  `assets/script/dist/scene200.lite.js` (or the `dist-chakra` variant
  for legacy Chakra). For BN cells, this is BN's
  `Apps/Playground/Scripts/scene200.js`.
* `--frames N` (default 600) — render exactly N frames then exit
  cleanly.
* `--no-vsync` (implicit when `--frames` is set on both apps) —
  configures the swap chain present mode to **Immediate** (DawnTest) /
  drops `BGFX_RESET_VSYNC` (BN) so timings reflect pure render
  throughput, not the display refresh cap.
* `--width / --height` (default 1024×768) — back buffer size.
* `--headless` (BN only, where supported) — don't pop a window.

On clean exit each app emits exactly one line:

```text
BENCH scene=scene200 frames=599 wall_ms=2103.412 min_ms=1.832 avg_ms=3.512 max_ms=12.044 p95_ms=8.611
```

The runner parses these lines, ignores process exit codes (BN sometimes
exits with `STATUS_HEAP_CORRUPTION` during `std::quick_exit` even on a
clean run; the BENCH line is the success signal), and aggregates into a
single report.

## Output

```text
tools/bench/out/bench-results.json   # machine-readable, includes raw
                                     # min/avg/p95/max + stderr tail per cell
tools/bench/out/bench-report.html    # single self-contained HTML page
```

Pass `--no-open` to skip the auto-launch.

## Tuning frame count

| Use case             | `--frames` | Why                                                                |
| -------------------- | ---------- | ------------------------------------------------------------------ |
| Smoke test           | 30–60      | catches regressions in seconds                                     |
| Local iteration      | 200        | stable p95 in a few seconds per cell                               |
| Final comparison     | 600+       | tight std-dev; first frame's shader-compile cost is amortised away |
| Long-run drift hunt  | 5000+      | detect heap growth, allocator fragmentation                        |

The first frame is **always** treated as warmup and excluded from the
stats (it dominates shader/PSO compile + first asset upload).

## Caveats

* **Vsync on Android / iOS**: the OS may not honor an in-app
  `Immediate` present-mode request; numbers cap at the display refresh
  rate. Document refresh in the run notes if comparing.
* **BN Playground non-Win32**: the bench wiring (frame counter +
  `--frames` exit + BENCH-line print) lives in `Win32/App.cpp`. macOS,
  iOS, Android, X11 have not been wired yet. They're discovered by the
  runner but will not produce a BENCH line.
* **Asset versioning**: `assets/script/` pulls
  `@babylonjs/lite` from npm. To pin a different version, edit
  `assets/script/package.json` and re-run `npm ci && npm run build`.
* **BN exit codes**: BabylonNative's `std::quick_exit` sometimes
  surfaces `0xC0000374` (STATUS_HEAP_CORRUPTION) on Windows. The runner
  treats "received a BENCH line on stdout" as the success signal, not
  the process exit code, so these false negatives are filtered out.

## CI integration

CI does **not** run the per-frame performance benchmark. GitHub-hosted
runners have no usable GPU (mac/Android) or only a software rasterizer
(WARP on win32), so the timing numbers were not representative. The perf
benchmark described above is therefore a **local-only** tool.

What CI *does* publish is a build-size comparison. The `summary` job
aggregates every build matrix cell and emits a Markdown table:

| OS | Engine | Graphics | DawnTest exe | DawnTest complete | BN exe | BN complete |

- **exe** — the bare, stripped main binary (`app.exe` / `Playground` /
  `libdawntest.so` / `libBabylonNativeJNI.so`).
- **complete** — the full deployable size **per ABI**: the executable
  plus the JS engine and every shipped shared-library dependency
  (`.dll` / `.so` / `.dylib`). On Android this is every native library
  in the APK's `lib/arm64-v8a/` slot (our lib + the engine runtime, e.g.
  `libv8android.so`, + `libc++_shared.so`). The exe-vs-complete gap is
  large for V8 (separate ~18 MB runtime) and near-zero for statically
  linked engines (QuickJS / Hermes / Chakra-via-SDK / JSC).

Each build job computes its complete size where the build tree is still
available and uploads a tiny `size-<app>-<os>-<engine>-<graphics>`
marker (`size.json` with `exe_bytes` + `total_bytes`); the `summary`
job reads those markers plus the exe-only artifacts to fill the table.

The win32 build jobs are pinned to the `windows-2022` runner so the MSVC
toolchain (and therefore the reported sizes) stays stable across runs;
`windows-latest` now ships Visual Studio 2026.

## Files of interest

| Path                                                  | Purpose                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `tools/bench/run-bench.mjs`                           | Cross-platform runner                                         |
| `tools/bench/run-bench.ps1`                           | Windows wrapper                                               |
| `tools/bench/run-bench.sh`                            | POSIX wrapper                                                 |
| `assets/script/`                                      | Asset pipeline (npm + esbuild + babel)                        |
| `src/framework/bench.{h,cpp}`                         | DawnTest frame-timer                                          |
| `main.cpp` `parseArgs()` + render loop                | DawnTest `--frames` / `--no-vsync` wiring                     |
| `BN/Apps/Playground/Shared/BenchTimer.{h,cpp}`        | BN frame-timer (same line format)                             |
| `BN/Apps/Playground/Shared/CommandLine.cpp`           | BN `--frames` / `--no-vsync` flags                            |
| `BN/Core/Graphics/Include/.../Device.h` `VSync` field | BN swap-chain vsync toggle                                    |
