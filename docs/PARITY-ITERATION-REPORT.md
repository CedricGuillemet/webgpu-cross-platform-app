# Babylon-Lite parity sweep — iteration results

Test setup: native DawnTest app + Chakra engine, **1280×720 surface**,
`--exit-on-ready --no-window --screenshot`, two-frame settle after data-ready
before capture. Output: PNG via Dawn's `CopyTextureToBuffer` + WIC encoder.

## Iteration progression

| Iter | Pass | WASM-skip | Fail | With ref | Ref-pass | Pixel-perfect (MAD=0) |
|------|-----:|----------:|-----:|---------:|---------:|----------------------:|
| Baseline (before screenshot work) | 70 | 5 | 50 | — | — | — |
| Iter 1 (sweep tooling in, no fixes) | 70 | 5 | 50 | 32 | 23 | 17 |
| Iter 2 (sibling `lab/public` search + data: URL fetch) | **78** | **8** | **39** | 32 | **28** | 17 |
| Iter 3 (toDataURL valid 1×1 PNG + data:URL workers) | 78 | 8 | 39 | 32 | 28 | 17 |

**Net result vs baseline: +8 passing scenes, +5 ref-passing scenes**, plus 3
scenes correctly re-classified as WASM-skip instead of silent fail.

## Fixes applied this session

### 1. Screenshot infrastructure (`wgpu_bridge.cpp` + `main.cpp`)
- `canvasContext.configure` now auto-ORs `wgpu::TextureUsage::CopySrc` into the
  surface usage so we can copy the backbuffer.
- New `wgpu_bridge::requestScreenshot(path)`: on the next `present` op, the
  current backbuffer is GPU-copied into a `MapRead` staging buffer, mapped via
  `instance.WaitAny(fut)`, and written as a PNG via the WIC encoder before
  `surface.Present()` consumes the texture.
- New CLI flags: `--width N --height N`, `--screenshot PATH`,
  `--screenshot-delay N` (default 2 frames after data-ready).

### 2. Sibling search for `/textures`, `/models`, `/meshes`, `/scenes`
`findPublicAssetsRoot()` in `dom_shim.cpp` now walks upwards from the bundle
directory AND checks `Babylon-Lite/lab/public` siblings at each level. The
bundle's request for `/textures/sprites/player.png` now resolves to
`Babylon-Lite/lab/public/textures/sprites/player.png`.

**Scenes fixed**: scene12, scene58, scene59, scene160 (+ wasm-detected the
recast-navigation scenes 171/174/175 correctly).

### 3. `data:` URL support in `fetch()`
Both `;base64` and URL-encoded variants. Returns ResponseObject with the
decoded bytes, ok=true.

### 4. `data:` URL support for Worker construction
Same base64/percent-decoder for `new Worker("data:text/javascript;...")` — the
payload is dumped to a temp `.js` file under the worker base dir.

### 5. `toDataURL` returns a valid 1×1 transparent PNG
Bundles that use the result with `createImageBitmap` now get a usable (if
blank) image rather than a decode failure. Lets sprite-using scenes progress
past the initial atlas load (though some still fail later on with
"resolveSpriteFrame index out of range" because the atlas isn't real).

## Pixel-comparison results (29 scenes with golden refs)

### Pixel-perfect (MAD = 0.00) — 17 scenes
scene74, 75, 76, 77, 78, 79, 80, 82, 84, 85, 86, 88, 89, 116, 159, 161, 163

### Near-perfect (region MAD ≤ 5) — 6 scenes
| scene | region MAD | within-1-byte % |
|------:|-----------:|----------------:|
| scene26 | 0.52 | — |
| scene83 | 0.26 | — |
| scene58 | 0.60 | — |
| scene59 | 0.88 | — |
| scene160 | 3.70 | — |
| scene113 | 3.11 | — |

### Acceptable (region MAD 5..30) — 3 scenes
| scene | region MAD |
|------:|-----------:|
| scene81 | 9.89 |
| scene87 | 22.45 |
| scene111 | 18.02 |

### Far from BJS (region MAD > 30) — 2 scenes
| scene | region MAD |
|------:|-----------:|
| scene162 | 116.67 |
| scene114 | 136.06 |

### Failing to render despite having golden ref — 3 scenes
- scene73 (`RangeError: DataView operation access beyond specified buffer length`)
- scene112 (KTX2 — Basis Universal decoder unsupported)
- scene115 (`Invalid offset/length when creating typed array`)
- scene164 (`access violation` post-asset-load)

## Remaining failure classes (39 scenes)

| Category | Count | Example scenes | Root cause |
|----------|------:|----------------|------------|
| `image decode failed` (toDataURL stub return) | 8 | scene50–57, 90 | Sprite atlases need a real Canvas 2D `fillRect`/`drawImage` impl |
| Silent fail (data-ready never set, no errors) | 16 | scene4, 13, 22, 30, 36, 81–83 (no ref), 120–129 (gaussian splats), 144 paths | Workers + WebGPU compute paths probably stalling; need worker-side WebGPU bridge |
| `JSON.parse Error: Unexpected input at position:0` | 3 | scene66, 72, 140 | Bundle expects an inlined JSON shader graph that's blank |
| Access violation (0xC0000005) | 5 | scene5, 9, 24, 143, 176 | Various Dawn/D3D12 invalid-state paths; needs per-case analysis |
| WGSL shader rejected by Tint | 1 | scene5 (`unresolved value 'baseColor'`) | Bundle generates WGSL that uses an undefined identifier |
| `RangeError: Invalid offset/length when creating typed array` | 3 | scene7, 28, 115 | Bundle assumes typed-array bounds that we report differently |
| `addColorStop` of undefined | 1 | scene51 | Canvas 2D gradient API not implemented |

## What would unlock the most additional scenes

1. **Working offscreen Canvas 2D `fillRect`/`drawImage` + `toDataURL` that captures it** → would fix 8 sprite scenes (50–57) + scene90 + scene51 (gradient).
2. **WebGPU bindings inside Workers** → would fix the gaussian splatting batch (10 scenes: 120–129) and likely several silent-fail scenes that use Workers for parallel parsing.
3. **Basis Universal / KTX2 decoder** (WASM-backed) → would fix scene112 and any other scene that loads `KHR_texture_basisu` glTFs.

## Files modified this session

- `src/appRuntime/Shared/wgpu_bridge.{h,cpp}` — screenshot capture, surface CopySrc usage
- `src/appRuntime/Shared/dom_shim.cpp` — sibling-search for public assets, data: URL fetch, valid 1×1 toDataURL
- `src/appRuntime/Shared/worker_shim.cpp` — data: URL worker source
- `main.cpp` — `--width`, `--height`, `--screenshot`, `--screenshot-delay` CLI flags
- `parity-sweep.ps1` — new harness: per-scene PNG, MAD + region-MAD vs Babylon-Lite golden refs
- `build-small/parity-results/report.{csv,md}` — per-scene results
