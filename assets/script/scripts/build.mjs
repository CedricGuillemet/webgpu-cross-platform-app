// build.mjs — produce the four bench bundles consumed by the runner.
//
// Inputs (committed):
//   src/lite/scene200.ts        — Babylon-Lite scene, imports `@babylonjs/lite`
//   src/babylon/scene200.js     — Full Babylon.js scene for BN Playground
//
// Outputs:
//   dist/scene200.lite.js                 — esbuild single-file IIFE bundle
//   dist/scene200.babylon.js              — copy of src/babylon/scene200.js
//   dist-chakra/scene200.lite.chakra.js   — babel-downleveled lite bundle
//   dist-chakra/scene200.babylon.chakra.js— babel-downleveled babylon scene
//
// Why IIFE: DawnTest's chakra-host runs the entry script via JsRunScript (legacy
// SDK Chakra has no module support), so the bundle must run on load and must
// not contain top-level `export`/`import`. IIFE satisfies both, and is harmless
// for the ESM-capable engines (V8/JSC/ChakraCore) since it's plain JS.
//
// No external dependencies beyond what package.json declares (esbuild, babel).

import { build as esbuild } from "esbuild";
import { transformFileAsync } from "@babel/core";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(root, "dist");
const distChakraDir = path.join(root, "dist-chakra");

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

async function clean() {
    for (const d of [distDir, distChakraDir]) {
        await fs.rm(d, { recursive: true, force: true });
        await ensureDir(d);
    }
}

async function bundleLite() {
    const entry = path.join(root, "src/lite/scene200.ts");
    const out = path.join(distDir, "scene200.lite.js");
    await esbuild({
        entryPoints: [entry],
        outfile: out,
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "es2020",
        sourcemap: false,
        legalComments: "none",
        // Babylon-Lite ships its own JS as ESM with .js.map files; we don't need
        // the maps in the bundle. Bare `import` of node built-ins is unexpected
        // here and would indicate a misuse — fail loudly if it appears.
        external: [],
        logLevel: "info",
    });
    const stat = await fs.stat(out);
    console.log(`[build] lite bundle: ${path.relative(root, out)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function copyBabylon() {
    const src = path.join(root, "src/babylon/scene200.js");
    const dst = path.join(distDir, "scene200.babylon.js");
    await fs.copyFile(src, dst);
    const stat = await fs.stat(dst);
    console.log(`[build] babylon copy: ${path.relative(root, dst)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function babelTransform(srcPath, dstPath) {
    const result = await transformFileAsync(srcPath, {
        configFile: path.join(root, "babel.config.cjs"),
        babelrc: false,
    });
    if (!result || result.code == null) {
        throw new Error(`babel transform returned no code for ${srcPath}`);
    }
    await fs.writeFile(dstPath, result.code, "utf8");
    const stat = await fs.stat(dstPath);
    console.log(`[build] chakra:      ${path.relative(root, dstPath)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function buildChakra() {
    await babelTransform(
        path.join(distDir, "scene200.lite.js"),
        path.join(distChakraDir, "scene200.lite.chakra.js"),
    );
    await babelTransform(
        path.join(distDir, "scene200.babylon.js"),
        path.join(distChakraDir, "scene200.babylon.chakra.js"),
    );
}

async function main() {
    await clean();
    await bundleLite();
    await copyBabylon();
    await buildChakra();
    console.log("[build] done");
}

main().catch((err) => {
    console.error("[build] FAILED:", err && err.stack ? err.stack : err);
    process.exit(1);
});
