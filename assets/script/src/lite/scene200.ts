// Scene 200: Performance Test (Heavy CPU + GPU mix) — DawnTest bench fixture.
//
// Ported from Babylon-Lite/lab/lite/src/lite/scene200.ts. The npm package
// `@babylonjs/lite@0.2.0` does NOT expose the `loader-env/load-dds-env`
// sub-path that the internal repo uses, so we swap the IBL loader for
// `loadHdrEnvironment` (which the npm package does expose) and point it at
// the public Babylon CDN HDR file used by the standard PBR samples.
//
// Mix of heavy patterns to stress both CPU (lots of geometry to bind & draw)
// and GPU (fragment shading on many PBR pixels):
//
//   - 80 × 80 = 6400 thin-instanced PBR torus knots (gold, ORM textured)
//   - 80 × 80 = 6400 thin-instanced PBR boxes (copper, ORM textured)
//   - 64-sphere ring (standard material) with per-instance colors
//   - HDR prefiltered environment (loadHdrEnvironment)
//   - Hemispheric light only — Lite's PBR + ORM + thin-instance + IBL combo
//     historically crashes WGSL codegen with multiple light types
//   - Ground plane
//
// THIN_GRID tunes load. On a discrete GPU at 1280×720 THIN_GRID=80 targets
// ~20–30 FPS (matching the internal repo's checkpoint 002 measurement).

import {
    addToScene,
    createEngine,
    createSceneContext,
    createArcRotateCamera,
    createHemisphericLight,
    createBox,
    createTorus,
    createSphere,
    createGround,
    createPbrMaterial,
    createStandardMaterial,
    createSolidTexture2D,
    loadHdrEnvironment,
    setThinInstances,
    setThinInstanceColors,
    attachControl,
    mat4Compose,
    startEngine,
    registerScene,
} from "@babylonjs/lite";
import type { ArcRotateCamera } from "@babylonjs/lite";

const THIN_GRID = 80;

function gridMatrices(gridDim: number, spacing: number, yJitter: number): Float32Array {
    const count = gridDim * gridDim;
    const out = new Float32Array(16 * count);
    let i = 0;
    const half = (gridDim - 1) * 0.5;
    for (let z = 0; z < gridDim; z++) {
        for (let x = 0; x < gridDim; x++) {
            const tx = (x - half) * spacing;
            const tz = (z - half) * spacing;
            const ty = yJitter * Math.sin(x * 0.7 + z * 0.5);
            const m = mat4Compose(tx, ty, tz, 0, 0, 0, 1, 1, 1, 1);
            out.set(m, i * 16);
            i++;
        }
    }
    return out;
}

async function main(): Promise<void> {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    const engine = await createEngine(canvas);
    const scene = createSceneContext(engine);
    scene.clearColor = { r: 0.04, g: 0.05, b: 0.08, a: 1 };

    scene.camera = createArcRotateCamera(Math.PI * 0.25, Math.PI * 0.4, 22, { x: 0, y: 1.5, z: 0 });
    scene.camera.nearPlane = 0.5;
    scene.camera.farPlane = 200;
    attachControl(scene.camera as ArcRotateCamera, canvas, scene);

    addToScene(scene, createHemisphericLight([0, 1, 0], 0.9));

    // Prefiltered HDR IBL (npm @babylonjs/lite exposes loadHdrEnvironment, not
    // loadDdsEnvironment).
    await loadHdrEnvironment(scene, "https://playground.babylonjs.com/textures/environment.hdr");

    // (BoomBox glTF removed: npm @babylonjs/lite@0.2.0's parseGlbContainer hits
    // a "DataView operation access beyond specified buffer length" RangeError
    // under legacy Chakra. The thin-instance grids below are the real perf
    // load anyway. Reintroduce later if the parser is fixed upstream.)

    // Common PBR textures. We use solid 1×1 textures for both base colour AND
    // the ORM (occlusion/roughness/metallic) channel: the legacy Chakra image
    // shim cannot decode the mr.jpg ORM that the internal Babylon-Lite repo
    // version uses, and we want identical workload across all five engines.
    const goldTex = createSolidTexture2D(engine, 1.0, 0.766, 0.336);
    const copperTex = createSolidTexture2D(engine, 0.95, 0.64, 0.54);
    // ORM packed as solid: occlusion=1, roughness=0.5, metallic=1.
    const ormTex = createSolidTexture2D(engine, 1.0, 0.5, 1.0);

    // Thin-instanced torus knots (gold PBR + ORM)
    const torusKnot = createTorus(engine, { diameter: 1.4, thickness: 0.45, tessellation: 48 });
    torusKnot.material = createPbrMaterial({
        baseColorTexture: goldTex,
        ormTexture: ormTex,
        occlusionStrength: 0,
    });
    const torusCount = THIN_GRID * THIN_GRID;
    setThinInstances(torusKnot, gridMatrices(THIN_GRID, 1.3, 0.5), torusCount);
    addToScene(scene, torusKnot);

    // Thin-instanced PBR boxes (copper) — offset to overlap torus grid
    const box = createBox(engine);
    box.position.set(0, 4.5, 0);
    box.material = createPbrMaterial({
        baseColorTexture: copperTex,
        ormTexture: ormTex,
        occlusionStrength: 0,
    });
    const boxCount = THIN_GRID * THIN_GRID;
    setThinInstances(box, gridMatrices(THIN_GRID, 1.3, 0.5), boxCount);
    addToScene(scene, box);

    // 64-sphere ring (standard material, per-instance colours)
    const sphere = createSphere(engine, { diameter: 0.6, segments: 24 });
    sphere.material = createStandardMaterial();
    const ringCount = 64;
    const ringMatrices = new Float32Array(16 * ringCount);
    const ringColors = new Float32Array(4 * ringCount);
    for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2;
        const ringR = 7 + (i % 4) * 0.8;
        const rx = Math.cos(a) * ringR;
        const rz = Math.sin(a) * ringR;
        const ry = 2 + Math.sin(i * 0.31) * 1.5;
        const m = mat4Compose(rx, ry, rz, 0, 0, 0, 1, 1, 1, 1);
        ringMatrices.set(m, i * 16);
        ringColors[i * 4 + 0] = (Math.sin(a) + 1) * 0.5;
        ringColors[i * 4 + 1] = (Math.cos(a) + 1) * 0.5;
        ringColors[i * 4 + 2] = 0.8;
        ringColors[i * 4 + 3] = 1;
    }
    setThinInstances(sphere, ringMatrices, ringCount);
    setThinInstanceColors(sphere, ringColors);
    addToScene(scene, sphere);

    // Ground
    const ground = createGround(engine, { width: 60, height: 60 });
    ground.material = createStandardMaterial();
    addToScene(scene, ground);

    await registerScene(engine, scene);
    await startEngine(engine);
}

main().catch((err) => {
    console.error("[scene200] fatal:", err && err.stack ? err.stack : err);
});
