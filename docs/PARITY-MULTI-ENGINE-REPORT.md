# Multi-engine parity sweep — final results

Test setup: native DawnTest app + Dawn D3D12 + Win32 window at **1280×720**,
`--exit-on-ready --no-window --screenshot`, 2-frame settle after data-ready
before backbuffer capture. Screenshot via Dawn `CopyTextureToBuffer` + WIC
PNG encoder. Pixel comparison vs Babylon-Lite golden PNGs at
`Babylon-Lite/reference/lite/<slug>/babylon-ref-golden.png` (32 scenes).

All four engine builds share the same `appRuntime/Shared/` C++
(`wgpu_bridge`, `wgpu_enums`, `dom_shim`, `worker_shim`) and the same
`framework/win32/` OS layer. Engine differences are isolated to
`appRuntime/<EngineName>/` (chakra_host plus chakra_compat for non-Chakra).

## Summary table

| Engine | Pass | Skip-WASM | Fail | With ref | Ref-pass | MAD=0 (pixel-perfect) | Region MAD ≤ 5 | 5..30 | > 30 |
|--------|----:|----:|----:|----:|----:|----:|----:|----:|----:|
| **QuickJS** | **80** | 8 | 37 | 32 | **29** | 17 | **23** | 3 | 2 |
| Chakra | 78 | 8 | 39 | 32 | 28 | 17 | 23 | 3 | 2 |
| V8 | 32 | 5 | 88 | 32 | 10 | 1 | 1 | 2 | 7 |
| Hermes (static-linked) | 4 | 7 | 114 | 32 | 3 | 2 | 3 | 0 | 0 |

Totals out of **125 bundle scenes**.

### Per-engine binary size (for context)

| Engine | `app.exe` | Extra runtime files | Total deployment |
|--------|----------:|---------------------|------------------:|
| QuickJS | 4.62 MB | none (static) | **4.62 MB** |
| Hermes (static `hermesvm_a`) | 6.53 MB | none (static) | 6.53 MB |
| Chakra | 4.06 MB | ChakraCore.dll 7 MB | ~11 MB |
| V8 | 4.08 MB | v8.dll 24 MB + icudtl.dat 10 MB + 4 ICU/zlib/abseil DLLs | ~43.6 MB |

## Per-engine analysis

### QuickJS (best pass-rate on these tests)

**80/125 pass (64 %), 29/32 ref-pass (91 %), 17 pixel-perfect.**

QuickJS edges out Chakra on raw count by being more permissive about a few JS
patterns Chakra rejects (e.g. scene9 passes here, fails on Chakra). The
ref-passing set is identical to Chakra for the matching scenes; QuickJS also
captures scene164 successfully (Chakra hits an access violation on it).

Failure tail looks like:
- `image decode failed` from sprite scenes (50–57) — toDataURL stub limitation
- Gaussian splat batch (120–129) — worker stalls
- Misc timeouts (7, 11, 24, 115, 144, 152, 157, 158) — interpreter speed
- 4 access violations (30, 36, 90, 112) — Dawn invalid-state from progressing further than expected

### Chakra (best parity quality)

**78/125 pass (62 %), 28/32 ref-pass (88 %), 17 pixel-perfect.**

Essentially identical pixel-comparison results to QuickJS for the shared
ref-passing set (same scenes hit MAD=0, same scenes show region MAD 9.89,
22.45, 18.02, 116.67, 136.06).

The 2-scene gap vs QuickJS comes from a few scenes Chakra's GC-paced runtime
ends up crashing on (access violations on scene9, 13 timeouts, etc.). All
patterns mirror QuickJS.

### V8 (high crash rate, divergent pixels)

**32/125 pass (26 %), 10/32 ref-pass (31 %), only 1 pixel-perfect (scene74).**

The wrapper-leak crash class (`GlobalHandles::Destroy` called after
`Isolate::Dispose`) brings down 30+ scenes that on every other engine pass
cleanly. Even when scenes DO render, the pixel comparisons show big
differences vs the BJS reference:

| scene | regionMad on V8 | regionMad on Chakra/QuickJS |
|------:|----------------:|----------------------------:|
| scene75 | 109.86 | **0** |
| scene77 | 44.13 | **0** |
| scene78 | 49.79 | **0** |
| scene80 | 43.96 | **0** |
| scene82 | 38.88 | **0** |
| scene84 | 60.41 | **0** |
| scene85 | 25.09 | **0** |
| scene86 | 8.01 | **0** |
| scene161 | 81.38 | **0** |

This means V8 is not just crashing — when it doesn't crash, it's also
rendering visually divergent results. The most likely culprit:
`JsCreateExternalArrayBuffer` always copies in the V8 port (V8 sandbox
forbids non-sandbox backing stores) and the timing of those copies plus the
deferred V8 GC interacts badly with the surface readback pipeline.

### Hermes (DataView/ArrayBuffer mismatch is fatal)

**4/125 pass (3 %), 3/32 ref-pass (9 %), 2 pixel-perfect.**

The same root cause documented in `HERMES-PORT-REPORT.md` blocks ~110
scenes: `new DataView(buf, ...)` rejects host-vended (JSI `MutableBuffer`-
backed) ArrayBuffers, and our `JsCreateExternalArrayBuffer` returns exactly
that type because there is no other public path through the JSI ABI to vend
a JS-allocated AB. The 4 passing scenes (scene58, 74, 76, 153) don't hit the
glTF/GLB parse path, which is the only path that calls `new DataView(...)`.

Once that single semantic gap is fixed (probably by invoking `new
ArrayBuffer(size)` via JS and writing bytes through `new
Uint8Array(ab).set(...)`), the Hermes column should jump to roughly the
QuickJS column overnight.

## Pixel-perfect scenes (MAD = 0) per engine

| Scene | Chakra | QuickJS | V8 | Hermes |
|-------|:------:|:------:|:---:|:------:|
| scene74 | ✓ | ✓ | ✓ | ✓ |
| scene75 | ✓ | ✓ |   |   |
| scene76 | ✓ | ✓ |   | ✓ |
| scene77 | ✓ | ✓ |   |   |
| scene78 | ✓ | ✓ |   |   |
| scene79 | ✓ | ✓ |   |   |
| scene80 | ✓ | ✓ |   |   |
| scene82 | ✓ | ✓ |   |   |
| scene84 | ✓ | ✓ |   |   |
| scene85 | ✓ | ✓ |   |   |
| scene86 | ✓ | ✓ |   |   |
| scene88 | ✓ | ✓ |   |   |
| scene89 | ✓ | ✓ |   |   |
| scene116 | ✓ | ✓ |   |   |
| scene159 | ✓ | ✓ |   |   |
| scene161 | ✓ | ✓ |   |   |
| scene163 | ✓ | ✓ |   |   |

**Chakra and QuickJS agree perfectly on which scenes match BJS pixel-for-pixel.**

## Common failure patterns (across all engines)

These hit the same scenes regardless of JS engine — they're tied to
`Shared/dom_shim.cpp` or `wgpu_bridge.cpp` limitations, not the JS engine:

1. **`image decode failed` from toDataURL stub** — sprite scenes 50–57, 90.
   Fix: implement a real offscreen `Canvas 2D` (fillRect, drawImage), have
   toDataURL return a real PNG encoded from its pixel buffer.
2. **Gaussian splat scenes 120–129** — workers download the .splat/.ply but
   the parse never completes. Likely needs WebGPU bindings inside Workers
   (currently the worker globals don't expose `navigator.gpu`).
3. **KTX2 / Basis Universal** (scene112) — needs a WASM decoder.
4. **`JSON.parse Error: Unexpected input at position:0`** — scene66, 72, 140.
   Their bundles ship with an empty inlined JSON shader graph; nothing we
   can do from the host side.
5. **Scenes that load but don't reach data-ready** — scene4, 13, 22, 28, 30,
   36, 81, 83, 144. Most show no JS errors; probably awaiting an async
   primitive that isn't implemented (XMLHttpRequest fetch progress events,
   ImageBitmap.close, etc.).

## How to reproduce

```powershell
# Rebuild any engine (after pulling latest):
cmake --build build-small    --target app   # Chakra
cmake --build build-quickjs  --target app   # QuickJS
cmake --build build-v8       --target app   # V8
cmake --build build-hermes   --target app   # Hermes (static)

# Run parity sweep for any engine:
.\parity-sweep-engine.ps1 -BuildDir build-quickjs
# Outputs:
#   build-<engine>\parity-results\scene*.png  (actual screenshots)
#   build-<engine>\parity-results\report.csv
```

Per-engine CSVs sit at `build-<engine>\parity-results\report.csv` with one
row per scene: `id,scene,exit,status,hasRef,mad,regionMad,regionPx,within1Pct`.
