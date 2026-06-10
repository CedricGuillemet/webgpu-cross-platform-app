#!/usr/bin/env node
// run-bench.mjs — Cross-platform benchmark runner for DawnTest and
// BabylonNative Playground.
//
// Discovers built apps under <repo>/build-*/ (DawnTest) and
// <bnRoot>/build/<dir>/.../{Playground.exe|Playground.app|Playground} (BN),
// runs each through scene200 for a fixed frame budget with vsync disabled,
// parses the "BENCH …" line each app prints on exit, and writes both
// machine-readable (bench-results.json) and human-friendly (bench-report.html)
// reports.
//
// Designed to run on Windows (PowerShell / cmd) and macOS (bash) hosts
// from the same source. Cells the host can't execute (e.g. Android
// without adb, iOS without devicectl) are recorded as "skipped".
//
// Usage:
//   node tools/bench/run-bench.mjs            # auto-discover, run all, open report
//   node tools/bench/run-bench.mjs --frames 120 --width 1024 --height 768
//   node tools/bench/run-bench.mjs --no-open  # write reports, don't launch browser
//   node tools/bench/run-bench.mjs --list     # print discovered cells, exit
//
// Wrappers `run-bench.ps1` / `run-bench.sh` set the host-specific PATH and
// then forward to this script.

import { spawn } from "node:child_process";
import { readFile, writeFile, stat, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform, arch } from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");

// --- Args ---------------------------------------------------------------

const argv = process.argv.slice(2);
const opts = {
    frames: 600,
    width: 1024,
    height: 768,
    open: true,
    list: false,
    outDir: resolve(repoRoot, "tools", "bench", "out"),
    bnRoot: process.env.BN_ROOT || resolve(repoRoot, "..", "BabylonNative"),
    timeoutMs: 5 * 60 * 1000,  // 5 min per cell
    only: null,                // comma-separated cell ids to run
};
for (let i = 0; i < argv.length; ++i) {
    const a = argv[i];
    const eat = () => argv[++i];
    switch (a) {
        case "--frames":   opts.frames = parseInt(eat(), 10); break;
        case "--width":    opts.width  = parseInt(eat(), 10); break;
        case "--height":   opts.height = parseInt(eat(), 10); break;
        case "--no-open":  opts.open = false; break;
        case "--open":     opts.open = true; break;
        case "--list":     opts.list = true; opts.open = false; break;
        case "--out":      opts.outDir = resolve(eat()); break;
        case "--bn-root":  opts.bnRoot = resolve(eat()); break;
        case "--only":     opts.only = eat().split(",").map(s => s.trim()).filter(Boolean); break;
        case "--timeout":  opts.timeoutMs = parseInt(eat(), 10) * 1000; break;
        case "-h":
        case "--help":
            console.log(`Usage: node tools/bench/run-bench.mjs [options]
  --frames N        Frames to render per cell (default 600)
  --width N         Render width  (default 1024)
  --height N        Render height (default 768)
  --bn-root PATH    BabylonNative checkout root (default ../BabylonNative)
  --out DIR         Output directory (default tools/bench/out)
  --only id,id      Run only the named cells (see --list for ids)
  --list            Print discovered cells and exit
  --no-open         Don't auto-open the HTML report
  --timeout SEC     Per-cell timeout (default 300)
`);
            process.exit(0);
            break;
        default:
            console.error(`unknown arg: ${a}`);
            process.exit(2);
    }
}

// --- Asset paths --------------------------------------------------------

const liteBundle        = resolve(repoRoot, "assets", "script", "dist",        "scene200.lite.js");
const liteChakraBundle  = resolve(repoRoot, "assets", "script", "dist-chakra", "scene200.lite.chakra.js");
const babylonBundle     = resolve(repoRoot, "assets", "script", "dist",        "scene200.babylon.js");
// Note: BN Playground always loads babylon.max.js itself, so we use the raw
// scene200.js as the script the runner_js consumes. babel-downleveled isn't
// needed for BN engines (v8 / quickjs / hermes all support modern syntax,
// and BN's chakra build is jscript-rt which also handles modern syntax via
// JsRuntimeHost's bundle).

// --- Cell discovery -----------------------------------------------------

// A "cell" is one benchmark execution: { id, app, engine, gfx, bundle, exe, ... }
function discoverDawnTestCells() {
    const cells = [];
    // Standard build dir layout established earlier in this session:
    //   build-small        Chakra + default (D3D12)
    //   build-d3d11        Chakra + D3D11
    //   build-vulkan       Chakra + Vulkan
    //   build-v8           V8 + D3D12
    //   build-quickjs      QuickJS + D3D12
    //   build-hermes       Hermes + D3D12
    // The runner reads each build's CMakeCache.txt for the truth.
    return cells;  // populated below by walking disk
}

async function readCMakeCache(buildDir) {
    const path = join(buildDir, "CMakeCache.txt");
    if (!existsSync(path)) return null;
    const text = await readFile(path, "utf8");
    const out = {};
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*):[A-Z]+=(.*)$/);
        if (m) out[m[1]] = m[2];
    }
    return out;
}

function pickDawnTestExe(buildDir) {
    // After our bench wiring, the exe sits at <build>/app.exe (single-config
    // CMake -G "Ninja") or <build>/Release/app.exe (multi-config VS).
    const candidates = platform === "win32"
        ? [join(buildDir, "app.exe"), join(buildDir, "Release", "app.exe")]
        : [join(buildDir, "app"),     join(buildDir, "Release", "app")];
    for (const c of candidates) if (existsSync(c)) return c;
    return null;
}

async function collectDawnTestCells() {
    const entries = await readdir(repoRoot, { withFileTypes: true });
    const cells = [];
    for (const e of entries) {
        if (!e.isDirectory() || !e.name.startsWith("build-")) continue;
        const buildDir = join(repoRoot, e.name);
        const cache = await readCMakeCache(buildDir);
        if (!cache) continue;
        const engine = cache.JS_ENGINE || "Chakra";
        const gfx    = cache.GRAPHICS_API || "D3D12";
        const exe    = pickDawnTestExe(buildDir);
        if (!exe) continue;

        // Chakra engine needs the babel-downleveled bundle (legacy ES5
        // surface). All other DawnTest engines (V8 / QuickJS / Hermes /
        // JSC) eat modern JS via the IIFE bundle directly.
        const bundle = engine === "Chakra" ? liteChakraBundle : liteBundle;
        cells.push({
            id: `dawntest-${engine.toLowerCase()}-${gfx.toLowerCase()}`,
            app: "DawnTest",
            engine,
            gfx,
            exe,
            buildDir: e.name,
            args: [bundle, "--frames", String(opts.frames),
                   "--width", String(opts.width), "--height", String(opts.height),
                   "--no-vsync"],
            bundle,
        });
    }
    return cells;
}

function pickBnPlaygroundExe(buildDir) {
    // Multi-config (VS) layout we use locally:
    //   build/<config>/Apps/Playground/Release/Playground.exe
    // Single-config (Ninja) layout:
    //   build/<config>/Apps/Playground/Playground.exe
    // macOS / iOS / Android: not yet wired for bench (see notes in
    // ViewController.mm + JNI). We still record an entry as "skipped".
    const win = [
        join(buildDir, "Apps", "Playground", "Release", "Playground.exe"),
        join(buildDir, "Apps", "Playground", "Playground.exe"),
    ];
    const mac = [
        join(buildDir, "Apps", "Playground", "Release", "Playground.app", "Contents", "MacOS", "Playground"),
    ];
    const linux = [join(buildDir, "Apps", "Playground", "Playground")];
    const candidates = platform === "win32" ? win
                     : platform === "darwin" ? mac
                     : linux;
    for (const c of candidates) if (existsSync(c)) return c;
    return null;
}

async function collectBnCells() {
    const cells = [];
    const bnBuildRoot = join(opts.bnRoot, "build");
    if (!existsSync(bnBuildRoot)) return cells;
    const entries = await readdir(bnBuildRoot, { withFileTypes: true });
    for (const e of entries) {
        if (!e.isDirectory()) continue;
        // Skip the bare-bones "build" subdir which has no CMakeCache.
        const buildDir = join(bnBuildRoot, e.name);
        const cache = await readCMakeCache(buildDir);
        if (!cache) continue;

        // BN doesn't expose JS_ENGINE / GRAPHICS_API as cache vars (it
        // picks them from the toolchain), so derive from the dir name we
        // standardised on: e.g. "win32-d3d12-chakra", "win32-d3d11-v8",
        // "macos-metal-quickjs", "ios-metal-hermes".
        const name = e.name.toLowerCase();
        const engineMatch = name.match(/(chakra|v8|quickjs|hermes|jsc)/);
        const gfxMatch    = name.match(/(d3d11|d3d12|vulkan|metal|opengles|opengl)/);
        // Skip legacy build dirs whose name doesn't encode engine+gfx
        // (e.g. the bare "build/win32" used by older configs). They'd
        // show up as bnplayground-unknown-unknown and just fail.
        if (!engineMatch || !gfxMatch) continue;
        const engineGuess = engineMatch[1];
        const gfxGuess    = gfxMatch[1];
        const exe = pickBnPlaygroundExe(buildDir);
        if (!exe) continue;

        cells.push({
            id: `bnplayground-${engineGuess}-${gfxGuess}`,
            app: "BNPlayground",
            engine: engineGuess.charAt(0).toUpperCase() + engineGuess.slice(1),
            gfx: gfxGuess.toUpperCase(),
            exe,
            buildDir: e.name,
            // BN Playground accepts the script as a positional arg + our
            // new --frames / --headless. We don't pass --no-vsync since
            // --frames implies it (see CommandLine.cpp).
            args: [
                resolve(opts.bnRoot, "Apps", "Playground", "Scripts", "scene200.js"),
                "--frames", String(opts.frames),
                "--headless",
            ],
            bundle: resolve(opts.bnRoot, "Apps", "Playground", "Scripts", "scene200.js"),
        });
    }
    return cells;
}

// --- Cell execution -----------------------------------------------------

function parseBenchLine(line) {
    // BENCH scene=scene200 frames=119 wall_ms=104.414 min_ms=0.543 ...
    if (!line.startsWith("BENCH ")) return null;
    const out = {};
    for (const tok of line.slice(6).trim().split(/\s+/)) {
        const eq = tok.indexOf("=");
        if (eq < 0) continue;
        const k = tok.slice(0, eq);
        const v = tok.slice(eq + 1);
        out[k] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
    }
    return out;
}

function runCell(cell, timeoutMs) {
    return new Promise((resolveP) => {
        const t0 = Date.now();
        const proc = spawn(cell.exe, cell.args, {
            cwd: dirname(cell.exe),
            windowsHide: true,
        });
        let stdout = "";
        let stderr = "";
        let bench = null;
        // Line-buffered decoder: a single stdout write from the child can
        // be split across multiple "data" events, so split each chunk on
        // newlines but keep the trailing partial in a pending buffer that
        // gets prepended to the next chunk. Without this, the BENCH line
        // can be cut mid-value ("BENCH scene=scene20" + "0.lite frames=…")
        // and only the prefix parses, producing bench={"scene":"scene20"}.
        let pendingStdout = "";
        const stdoutDecoder = (chunk) => {
            const s = chunk.toString("utf8");
            stdout += s;
            pendingStdout += s;
            const parts = pendingStdout.split(/\r?\n/);
            pendingStdout = parts.pop();  // last fragment may be incomplete
            for (const line of parts) {
                const parsed = parseBenchLine(line);
                if (parsed) bench = parsed;
            }
        };
        proc.stdout.on("data", stdoutDecoder);
        proc.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });

        const timer = setTimeout(() => {
            proc.kill("SIGKILL");
        }, timeoutMs);

        proc.on("exit", (code, signal) => {
            clearTimeout(timer);
            // Flush any final partial line that didn't end with \n before
            // exit — protects against the "child emits BENCH then exits
            // without trailing newline" edge case.
            if (pendingStdout) {
                const parsed = parseBenchLine(pendingStdout);
                if (parsed) bench = parsed;
            }
            const elapsedMs = Date.now() - t0;
            // BN exits non-zero (3221226356 = STATUS_HEAP_CORRUPTION on
            // Windows during quick_exit) even on a clean bench run; treat
            // "BENCH line was emitted" as the success signal, not exit code.
            const ok = bench != null;
            resolveP({
                ok,
                exitCode: code,
                signal,
                elapsedMs,
                stdoutTail: stdout.split(/\r?\n/).slice(-40).join("\n"),
                stderrTail: stderr.split(/\r?\n/).slice(-40).join("\n"),
                bench,
            });
        });
        proc.on("error", (err) => {
            clearTimeout(timer);
            resolveP({ ok: false, error: String(err), stdoutTail: stdout, stderrTail: stderr });
        });
    });
}

// --- HTML report --------------------------------------------------------

function fmt(n, d = 2) {
    return typeof n === "number" && isFinite(n) ? n.toFixed(d) : "—";
}

function makeHtml(meta, results) {
    // Sort by app then avg_ms ascending (best first within each app).
    const rows = [...results].sort((a, b) => {
        if (a.cell.app !== b.cell.app) return a.cell.app.localeCompare(b.cell.app);
        const av = a.bench?.avg_ms ?? Infinity;
        const bv = b.bench?.avg_ms ?? Infinity;
        return av - bv;
    });

    const okRows = rows.filter(r => r.bench);
    const maxAvg = okRows.reduce((m, r) => Math.max(m, r.bench.avg_ms ?? 0), 1);
    const barW = (v) => Math.max(2, Math.min(560, (v / maxAvg) * 560));

    const escape = (s) => String(s).replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));

    const tableRows = rows.map(r => {
        const c = r.cell;
        const b = r.bench;
        const fps = b ? (1000 / b.avg_ms) : null;
        const statusCell = b
            ? `<span class="ok">ok</span>`
            : `<span class="fail" title="${escape(r.stderrTail ?? r.error ?? "")}">fail</span>`;
        return `<tr>
            <td>${escape(c.app)}</td>
            <td>${escape(c.engine)}</td>
            <td>${escape(c.gfx)}</td>
            <td>${statusCell}</td>
            <td class="num">${b ? b.frames : "—"}</td>
            <td class="num">${fmt(b?.wall_ms)}</td>
            <td class="num">${fmt(b?.min_ms, 3)}</td>
            <td class="num"><b>${fmt(b?.avg_ms, 3)}</b></td>
            <td class="num">${fmt(b?.p95_ms, 3)}</td>
            <td class="num">${fmt(b?.max_ms, 3)}</td>
            <td class="num">${fmt(fps, 1)}</td>
        </tr>`;
    }).join("");

    const barRows = okRows.map(r => {
        const c = r.cell;
        const b = r.bench;
        const w = barW(b.avg_ms);
        const label = `${c.app} · ${c.engine} · ${c.gfx}`;
        return `
            <div class="bar-row" title="${escape(label)}">
                <div class="bar-label">${escape(label)}</div>
                <svg width="600" height="22" class="bar-svg">
                    <rect x="0" y="4" width="${w}" height="14" rx="2"
                        fill="${c.app === "DawnTest" ? "#5b8def" : "#e07a5f"}"/>
                    <text x="${w + 8}" y="15" font-size="12" fill="#222">${fmt(b.avg_ms, 2)} ms · ${fmt(1000 / b.avg_ms, 1)} fps</text>
                </svg>
            </div>
        `;
    }).join("");

    return `<!doctype html>
<html><head><meta charset="utf-8">
<title>DawnTest vs BN Playground bench — ${escape(meta.host)} · ${escape(meta.timestamp)}</title>
<style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1100px; margin: 24px auto; padding: 0 16px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 18px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border-bottom: 1px solid #e5e5e5; padding: 6px 8px; text-align: left; }
    th { background: #fafafa; font-weight: 600; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .ok { color: #2a7e2a; font-weight: 600; }
    .fail { color: #c33; font-weight: 600; }
    .bar-row { display: flex; align-items: center; gap: 10px; margin: 4px 0; font-size: 13px; }
    .bar-label { width: 260px; }
    .bar-svg { background: #f7f7f7; border-radius: 3px; }
    h2 { font-size: 16px; margin: 30px 0 10px; }
    details { margin-top: 24px; }
    pre { background: #0d1117; color: #c9d1d9; padding: 12px; overflow: auto; font-size: 12px; border-radius: 4px; }
</style>
</head><body>
<h1>DawnTest vs BabylonNative Playground — scene200 bench</h1>
<div class="meta">
    host: <b>${escape(meta.host)}</b> · arch: ${escape(meta.arch)} · ran: ${escape(meta.timestamp)} ·
    frames/cell: <b>${meta.frames}</b> · resolution: ${meta.width}×${meta.height}
</div>

<h2>Per-cell results</h2>
<table>
    <thead><tr>
        <th>App</th><th>Engine</th><th>Gfx</th><th>Status</th>
        <th class="num">Frames</th>
        <th class="num">Wall ms</th>
        <th class="num">min</th><th class="num">avg</th><th class="num">p95</th><th class="num">max</th>
        <th class="num">FPS (avg)</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
</table>

<h2>Avg ms / frame (lower is better)</h2>
<div>${barRows || "<i>No successful runs.</i>"}</div>

<details>
    <summary>Raw JSON</summary>
    <pre>${escape(JSON.stringify({ meta, results }, null, 2))}</pre>
</details>
</body></html>`;
}

// --- Main ---------------------------------------------------------------

async function main() {
    const dawnCells = await collectDawnTestCells();
    const bnCells = await collectBnCells();
    let cells = [...dawnCells, ...bnCells];

    if (opts.only) {
        const set = new Set(opts.only);
        cells = cells.filter(c => set.has(c.id));
    }

    if (cells.length === 0) {
        console.error("No bench cells discovered. Tried:");
        console.error(`  DawnTest: ${repoRoot}/build-*/{,Release/}app{,.exe}`);
        console.error(`  BN:       ${opts.bnRoot}/build/*/Apps/Playground/...`);
        process.exit(1);
    }

    console.log(`Discovered ${cells.length} bench cell(s):`);
    for (const c of cells) console.log(`  ${c.id}  →  ${c.exe}`);

    if (opts.list) return;

    await mkdir(opts.outDir, { recursive: true });

    const results = [];
    for (const cell of cells) {
        process.stdout.write(`Running ${cell.id} … `);
        const t0 = Date.now();
        const r = await runCell(cell, opts.timeoutMs);
        const dt = Date.now() - t0;
        if (r.ok) {
            console.log(`OK (avg ${fmt(r.bench.avg_ms, 2)} ms, ${dt} ms wall)`);
        } else {
            console.log(`FAIL (exit ${r.exitCode}, ${dt} ms wall)`);
            // Surface the last few lines of stderr to the console so a CI
            // log shows why a cell failed without having to download the
            // HTML report.
            if (r.stderrTail) console.log(`  stderr: ${r.stderrTail.split("\n").slice(-3).join(" | ")}`);
        }
        results.push({ cell, ...r });
    }

    const meta = {
        host: platform,
        arch,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        frames: opts.frames,
        width: opts.width,
        height: opts.height,
        repoRoot,
        bnRoot: opts.bnRoot,
    };

    const jsonPath = join(opts.outDir, "bench-results.json");
    const htmlPath = join(opts.outDir, "bench-report.html");
    await writeFile(jsonPath, JSON.stringify({ meta, results }, null, 2), "utf8");
    await writeFile(htmlPath, makeHtml(meta, results), "utf8");

    console.log(`\nWrote ${jsonPath}`);
    console.log(`Wrote ${htmlPath}`);

    if (opts.open) {
        const cmd = platform === "win32" ? "explorer" : platform === "darwin" ? "open" : "xdg-open";
        spawn(cmd, [htmlPath], { detached: true, stdio: "ignore" }).unref();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
