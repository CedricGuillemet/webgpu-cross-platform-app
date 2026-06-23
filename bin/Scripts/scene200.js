// scene200.js — BabylonJS port of Babylon-Lite scene200 ("PerformanceTest")
// for the BabylonNative Playground. Loaded via:
//   Playground.exe path\to\scene200.js
// The playground_runner.js calls createScene() and drives the render loop.
//
// Mirrors lab/lite/src/lite/scene200.ts:
//   - 1280×720 client area (TestUtils.updateSize)
//   - ArcRotate camera (α=π/4, β=0.4π, r=22, target (0,1.5,0))
//   - Hemispheric light only (no point/directional)
//   - DDS prefiltered IBL (CreateFromPrefilteredData)
//   - BoomBox.glb (full PBR)
//   - 80×80 = 6400 PBR torus knot thin-instances (gold + ORM)
//   - 80×80 = 6400 PBR box thin-instances (copper + ORM, +y=4.5)
//   - 64-sphere standard-material ring with per-instance colours
//   - Ground 60×60
//
// Logs FPS at frames {60,300} matching DawnTest's measurement window:
//   steady-state ms/frame = (t300 - t60) * 1000 / 240
// Exits via TestUtils.exit(0) after frame 400.

const THIN_GRID = 80;
const TARGET_WIDTH  = 1280;
const TARGET_HEIGHT = 720;
const MAX_FRAMES    = 400;

// Resize the window so the GPU work matches DawnTest exactly.
if (typeof TestUtils !== "undefined") {
    TestUtils.updateSize(TARGET_WIDTH, TARGET_HEIGHT);
    try {
        console.log(`[scene200] graphics API: ${TestUtils.getGraphicsApiName()}`);
    } catch (e) { /* ignore */ }
}

function gridMatrices(gridDim, spacing, yJitter) {
    const count = gridDim * gridDim;
    const out = new Float32Array(16 * count);
    const half = (gridDim - 1) * 0.5;
    let i = 0;
    const tmp = BABYLON.Matrix.Identity();
    const t = new BABYLON.Vector3();
    for (let z = 0; z < gridDim; z++) {
        for (let x = 0; x < gridDim; x++) {
            t.x = (x - half) * spacing;
            t.y = yJitter * Math.sin(x * 0.7 + z * 0.5);
            t.z = (z - half) * spacing;
            BABYLON.Matrix.TranslationToRef(t.x, t.y, t.z, tmp);
            tmp.copyToArray(out, i * 16);
            i++;
        }
    }
    return out;
}

// Generate a 1×1 solid-colour texture for tinting PBR materials without
// having to author a PNG. Matches Lite's createSolidTexture2D.
function makeSolidTexture(scene, r, g, b, name) {
    const dt = new BABYLON.DynamicTexture(name, { width: 4, height: 4 }, scene, false);
    const ctx = dt.getContext();
    ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    ctx.fillRect(0, 0, 4, 4);
    dt.update(false);
    return dt;
}

function makePbrWithOrm(scene, name, baseTex, ormTex) {
    const m = new BABYLON.PBRMaterial(name, scene);
    m.albedoTexture = baseTex;
    m.metallicTexture = ormTex;
    m.useRoughnessFromMetallicTextureAlpha = false;
    m.useRoughnessFromMetallicTextureGreen = true;
    m.useMetallnessFromMetallicTextureBlue = true;
    m.useAmbientOcclusionFromMetallicTextureRed = true;
    m.metallic = 1.0;
    m.roughness = 1.0;
    return m;
}

function createScene() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.04, 0.05, 0.08, 1);

    // ── ArcRotate camera matching Lite scene200 ──
    const camera = new BABYLON.ArcRotateCamera(
        "cam",
        Math.PI * 0.25, Math.PI * 0.4, 22,
        new BABYLON.Vector3(0, 1.5, 0),
        scene);
    camera.minZ = 0.5;
    camera.maxZ = 200;
    scene.activeCamera = camera;

    // ── Hemispheric light only ──
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.9;

    // ── Prefiltered environment (matches Lite's loadDdsEnvironment) ──
    // BabylonNative reliably supports .env (compressed cubemap) over .dds.
    const env = BABYLON.CubeTexture.CreateFromPrefilteredData(
        "https://assets.babylonjs.com/environments/environmentSpecular.env", scene);
    scene.environmentTexture = env;

    return Promise.resolve()
        // ── BoomBox glTF ──
        .then(() => BABYLON.SceneLoader.AppendAsync(
            "https://playground.babylonjs.com/scenes/",
            "BoomBox.glb",
            scene))
        // ── ORM texture (occlusion/roughness/metallic) ──
        .then(() => new Promise((resolve) => {
            const orm = new BABYLON.Texture(
                "https://playground.babylonjs.com/textures/mr.jpg",
                scene, true, false,
                BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
                () => resolve(orm),
                () => resolve(orm));
            orm.__name = "orm";
        }))
        .then((ormTex) => {
            // Restore Lite camera (BoomBox import overrides activeCamera).
            scene.activeCamera = camera;

            // ── Thin-instanced torus knots (gold PBR + ORM) ──
            const goldTex = makeSolidTexture(scene, 1.0, 0.766, 0.336, "gold");
            const torus = BABYLON.MeshBuilder.CreateTorus(
                "torus",
                { diameter: 1.4, thickness: 0.45, tessellation: 48 },
                scene);
            torus.material = makePbrWithOrm(scene, "torusMat", goldTex, ormTex);
            torus.thinInstanceSetBuffer("matrix", gridMatrices(THIN_GRID, 1.3, 0.5), 16, true);

            // ── Thin-instanced PBR boxes (copper) at y=4.5 ──
            const copperTex = makeSolidTexture(scene, 0.95, 0.64, 0.54, "copper");
            const box = BABYLON.MeshBuilder.CreateBox("box", { size: 1 }, scene);
            box.position.y = 4.5;
            box.material = makePbrWithOrm(scene, "boxMat", copperTex, ormTex);
            box.thinInstanceSetBuffer("matrix", gridMatrices(THIN_GRID, 1.3, 0.5), 16, true);

            // ── 64-sphere ring (StandardMaterial, per-instance colours) ──
            const sphere = BABYLON.MeshBuilder.CreateSphere(
                "sphere",
                { diameter: 0.6, segments: 24 },
                scene);
            sphere.material = new BABYLON.StandardMaterial("sphereMat", scene);
            const ringCount = 64;
            const ringMat = new Float32Array(16 * ringCount);
            const ringCol = new Float32Array(4 * ringCount);
            const m = BABYLON.Matrix.Identity();
            for (let i = 0; i < ringCount; i++) {
                const a = (i / ringCount) * Math.PI * 2;
                const ringR = 7 + (i % 4) * 0.8;
                const rx = Math.cos(a) * ringR;
                const rz = Math.sin(a) * ringR;
                const ry = 2 + Math.sin(i * 0.31) * 1.5;
                BABYLON.Matrix.TranslationToRef(rx, ry, rz, m);
                m.copyToArray(ringMat, i * 16);
                ringCol[i * 4 + 0] = (Math.sin(a) + 1) * 0.5;
                ringCol[i * 4 + 1] = (Math.cos(a) + 1) * 0.5;
                ringCol[i * 4 + 2] = 0.8;
                ringCol[i * 4 + 3] = 1.0;
            }
            sphere.thinInstanceSetBuffer("matrix", ringMat, 16, true);
            sphere.thinInstanceSetBuffer("color",  ringCol, 4,  true);

            // ── Ground ──
            const ground = BABYLON.MeshBuilder.CreateGround(
                "ground",
                { width: 60, height: 60 },
                scene);
            ground.material = new BABYLON.StandardMaterial("groundMat", scene);

            // ── FPS instrumentation (same window as DawnTest) ──
            let frame = 0;
            let t1 = 0, t60 = 0, t300 = 0;
            scene.onAfterRenderObservable.add(() => {
                frame++;
                const t = performance.now();
                if (frame === 1)   { t1 = t;   console.log(`[scene200] frame 1   t=${(t/1000).toFixed(3)}s`); }
                if (frame === 60)  { t60 = t;  console.log(`[scene200] frame 60  t=${(t/1000).toFixed(3)}s`); }
                if (frame === 300) {
                    t300 = t;
                    const ms = (t300 - t60) * 1000 / 240 / 1000; // (ms-diff)/240
                    const fps = 1000 / ms;
                    console.log(`[scene200] frame 300 t=${(t/1000).toFixed(3)}s`);
                    console.log(`[scene200] steady-state ${ms.toFixed(2)} ms/frame (${fps.toFixed(1)} FPS) over frames 60..300`);
                }
                if (frame >= MAX_FRAMES) {
                    console.log(`[scene200] done after ${frame} frames; exiting`);
                    if (typeof TestUtils !== "undefined") {
                        TestUtils.exit(0);
                    }
                }
            });

            console.log(`[scene200] ready: ${THIN_GRID}x${THIN_GRID} thin instances per primitive, ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
            return scene;
        });
}
