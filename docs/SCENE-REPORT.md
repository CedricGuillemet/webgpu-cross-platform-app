# Scene Test Report — Babylon Lite scenes on native Dawn + ChakraCore

Tested all 125 scene bundles produced by `pnpm build:bundle-scenes` against the
native host. Each scene was run with `--exit-on-ready` and a 4-second/300-frame
window after init; success means the bundle set `canvas.dataset.ready === 'true'`.

## Summary

| Outcome | Count |
|---------|-------|
| ✅ Pass | **72** |
| ⏭️ Skipped — WebAssembly required (per user request) | **5** |
| ❌ Failed | 48 |

## ✅ Pass (72 scenes)

scene1, scene2, scene3, scene6, scene8, scene10, scene11, scene14, scene15,
scene16, scene17, scene18, scene19, scene20, scene21, scene23, scene25, scene26,
scene27, scene31, scene32, scene33, scene34, scene35, scene38, scene60, scene61,
scene62, scene63, scene64, scene65, scene67, scene68, scene69, scene70, scene71,
scene74, scene75, scene76, scene77, scene78, scene79, scene80, scene82, scene84,
scene85, scene86, scene87, scene88, scene89, scene110, scene111, scene113,
scene114, scene116, scene141, scene142, scene144, scene150, scene151, scene152,
scene153, scene154, scene155, scene156, scene157, scene158, scene159, scene161,
scene162, scene163, scene176

## ⏭️ Skipped — WebAssembly required (5 scenes)

| Scene | Package(s) needing WASM |
|-------|--------------------------|
| scene40  | `@babylonjs/havok` (physics) |
| scene91  | `manifold-3d` (CSG2 boolean ops) |
| scene170 | `@recast-navigation/core` + `@recast-navigation/wasm` |
| scene172 | `@recast-navigation/*` (obstacles) |
| scene173 | `@recast-navigation/*` (dynamic obstacles) |

Detection works via two paths:
- Static `import 'pkg/...'` → `chakra_host.cpp::handleFetchImported` checks a
  package-name allow-list and sets `__wasmTriggered`.
- Dynamic `import('pkg/...')` (rewritten by `transform-bundle.js` to
  `__import(...)`) → `chakra_host.cpp::importByPath` does the same check.

## ❌ Failed (48 scenes) — by root cause

### Compressed/HDR image format not supported by stb_image (11 scenes)
The host decodes images via `stb_image`, which handles PNG/JPG/BMP/TGA/PSD/HDR/GIF
but not **KTX/KTX2**, **DDS**, **BasisU**, or `.env` cube textures. Scenes that
load these formats fail with `image decode failed`:

| Scene | Likely format |
|-------|---------------|
| scene29 | sheen / clearcoat KTX2 |
| scene37 | sheen-sofa KTX2 |
| scene50, 52-59 | sprite atlases (mixed PNG/KTX) |
| scene81 | NME UV projection (KTX) |
| scene83 | NME normals (KTX) |
| scene90 | CSG label canvas |
| scene122 | GS image |
| scene160 | shader-material texture |

### Real decompressor required (4 scenes)
Bundles use `DecompressionStream('gzip')`. The host has only a passthrough stub
(real gzip would need adding miniz/zlib), so `JSON.parse` on the still-compressed
bytes throws:

| Scene | Use |
|-------|-----|
| scene66 | NME full playground (gzipped JSON metadata) |
| scene72 | NME PBR full (gzipped) |
| scene123 | Gaussian Splatting SPZ (gzipped frames) |
| scene140 | NME PCF alpha discard shadows (gzipped) |

### Gaussian Splatting (8 scenes)
Scenes 120-121 and 124-129 download PLY/SPZ data successfully but never set
`data-ready` within the test window — the SPZ/PLY parsers depend on real gzip
support and on real BigInt semantics (we stub `BigInt64Array` as `Float64Array`
which truncates indices > 2^53).

### Process crashes (access violation, 0xC0000005) (7 scenes)
Crash inside the C++ host, almost certainly during image decoding (large JPG or
PNG with unusual encodings) or inside a Dawn pipeline-creation path. Needs SEH
guarding around `stb_image_load_from_memory` and possibly upgrading stb to its
latest commit.

| Scene | Crashed on |
|-------|-----------|
| scene5 | Alien_normal.png (5MB) |
| scene7 | ChibiRex assets |
| scene9 | Sponza (multiple JPGs) |
| scene24 | HillValley (multiple JPGs) |
| scene143 | Sponza bloom |
| scene164 | device-lost-recovery |
| scene13 | PBR sphere — env file |

### Async load never completes (data-ready unset) (5 scenes)
The bundle starts loading but the test window expires before `dataset.ready` is
set. Could be a silently rejected promise or a missing local asset that the
bundle was supposed to find next to itself (e.g. `/textures/*.env` for scene 12).

| Scene | Notes |
|-------|-------|
| scene4 | Shadows — async path stalls |
| scene12 | PBR Shader Balls — needs `/textures/Studio_Softbox_2Umbrellas_cube_specular.env` next to bundle |
| scene22 | PBR Shadows |
| scene30 | KHR_materials_volume_testing |
| scene36 | Basis Universal — needs WASM transcoder (not auto-detected) |

### Bundle-side parsing errors (13 scenes)
The host runs successfully but the scene's internal parser rejects the loaded
bytes. Could be alignment differences between external `ArrayBuffer` and the
bundle's expectations, or actual format issues in the host's preprocessing.

| Scene | Error |
|-------|-------|
| scene13 | Invalid .env file: bad magic |
| scene28 | RangeError: Invalid offset/length when creating typed array (clearcoat .bin) |
| scene51 | TypeError: addColorStop on null (Canvas2D gradient stub missing) |
| scene73 | DataView access beyond buffer (wheel NME viewport) |
| scene112 | DataView access beyond buffer (KHR_texture_basisu) |
| scene115 | TypedArray offset/length (alien picking) |
| scene144 | Invalid .env file: bad magic (bloom post-process) |
| scene171, 174, 175 | Navigation crowd/offmesh/raycast — DataView (recast bin) |

---

## How to reproduce

```powershell
cd E:\dev\babylon\DawnTest\webgpu-cross-platform-app
# Build everything (Dawn ~10 min first time, cached after)
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build

# Bundle Babylon-Lite scenes (or copy a fresh set into assets/bundle/)
node scripts/transform-bundle.js

# Run a single scene
.\build\app.exe .\build\assets\bundle\scene1.js

# Run the full suite (saves per-scene logs to build/scene-test-results/)
powershell -ExecutionPolicy Bypass -File test-scenes.ps1
```
