// main.cpp — Babylon-Lite scene runner on top of Dawn + ChakraCore.
//
// Usage:
//   app.exe [path/to/scene-bundle.js]
//
// If no path is given, defaults to assets/bundle/scene1.js next to the executable.

#include "chakra_host.h"
#include "dom_shim.h"
#include "fs_loader.h"
#include "image_decoder.h"
#include "native_window.h"
#include "wgpu_bridge.h"
#include "worker_shim.h"

#include <webgpu/webgpu_cpp.h>

#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <chrono>
#include <cstdio>
#include <filesystem>
#include <string>

namespace fs = std::filesystem;

namespace {

constexpr int kInitialWidth = 1024;
constexpr int kInitialHeight = 768;

cx::Host* g_host = nullptr;

double monotonicMs() {
    using clock = std::chrono::steady_clock;
    static const auto t0 = clock::now();
    return std::chrono::duration<double, std::milli>(clock::now() - t0).count();
}

wgpu::Surface createSurfaceForHwnd(wgpu::Instance instance, HWND hwnd, HINSTANCE hinstance) {
    wgpu::SurfaceSourceWindowsHWND chained{};
    chained.hwnd = hwnd;
    chained.hinstance = hinstance;
    wgpu::SurfaceDescriptor desc{};
    desc.nextInChain = &chained;
    return instance.CreateSurface(&desc);
}

std::string resolveBundlePath(const std::string& arg) {
    if (!arg.empty()) {
        fs::path p(arg);
        if (!p.is_absolute()) p = fs::absolute(p);
        return p.lexically_normal().string();
    }
    return (fs::path(fs_loader::executableDir()) / "assets" / "bundle" / "scene1.js")
        .lexically_normal().string();
}

struct Args {
    std::string bundlePath;
    int maxFrames = 0;            // 0 = no limit
    bool exitOnReady = false;     // exit when canvas.dataset.ready == "true"
    bool noWindow = false;        // hide the window (offscreen-ish)
    int width = 0;                // 0 = use kInitialWidth (1024)
    int height = 0;               // 0 = use kInitialHeight (768)
    std::string screenshotPath;   // capture PNG after data-ready and before exit
    int screenshotDelayFrames = 2;// how many extra frames after ready before capture
};

Args parseArgs(int argc, char** argv) {
    Args a;
    for (int i = 1; i < argc; ++i) {
        std::string s = argv[i];
        if (s == "--max-frames" && i + 1 < argc) {
            a.maxFrames = std::atoi(argv[++i]);
        } else if (s == "--exit-on-ready") {
            a.exitOnReady = true;
        } else if (s == "--no-window") {
            a.noWindow = true;
        } else if (s == "--width" && i + 1 < argc) {
            a.width = std::atoi(argv[++i]);
        } else if (s == "--height" && i + 1 < argc) {
            a.height = std::atoi(argv[++i]);
        } else if (s == "--screenshot" && i + 1 < argc) {
            a.screenshotPath = argv[++i];
        } else if (s == "--screenshot-delay" && i + 1 < argc) {
            a.screenshotDelayFrames = std::atoi(argv[++i]);
        } else if (!s.empty() && s[0] != '-') {
            a.bundlePath = s;
        }
    }
    return a;
}

// Exit codes used by the test harness.
constexpr int kExitOk = 0;
constexpr int kExitError = 1;
constexpr int kExitWasmUnsupported = 2;

} // namespace

int main(int argc, char** argv) {
    // Unbuffered stderr/stdout so we see logs in real-time even if app crashes.
    std::setvbuf(stderr, nullptr, _IONBF, 0);
    std::setvbuf(stdout, nullptr, _IONBF, 0);
    std::fprintf(stderr, "[main] starting...\n");

    // Dawn's d3dcompiler_47.dll load uses LOAD_LIBRARY_SEARCH_SYSTEM32 which
    // fails with ERROR_INVALID_PARAMETER on some Windows setups unless the
    // process default DLL dirs include SYSTEM32. Preload the DLL to be safe.
    SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_DEFAULT_DIRS | LOAD_LIBRARY_SEARCH_USER_DIRS);
    if (!LoadLibraryW(L"d3dcompiler_47.dll")) {
        std::fprintf(stderr, "[main] could not preload d3dcompiler_47.dll (%lu)\n", GetLastError());
    }

    // Initialise WIC + COM up front so the first image decode doesn't pay it.
    image_decoder::initialize();

    Args cli = parseArgs(argc, argv);
    std::string bundlePath = resolveBundlePath(cli.bundlePath);
    if (!fs::exists(bundlePath)) {
        std::fprintf(stderr, "[main] scene bundle not found: %s\n", bundlePath.c_str());
        std::fprintf(stderr, "       usage: app.exe [path/to/scene-bundle.js] [--max-frames N] [--exit-on-ready] [--no-window]\n");
        return kExitError;
    }
    std::string bundleDir = fs::path(bundlePath).parent_path().string();
    std::fprintf(stderr, "[main] scene bundle: %s\n", bundlePath.c_str());

    // 1. Create Win32 window
    int requestedW = cli.width  > 0 ? cli.width  : kInitialWidth;
    int requestedH = cli.height > 0 ? cli.height : kInitialHeight;
    native_window::Window window;
    if (!window.create(requestedW, requestedH, "Babylon Lite + Dawn")) {
        std::fprintf(stderr, "[main] window.create failed\n");
        return 1;
    }

    int fbW = 0, fbH = 0;
    window.getClientSize(fbW, fbH);
    if (fbW <= 0 || fbH <= 0) { fbW = requestedW; fbH = requestedH; }

    // 2. Init Dawn
    static const auto kTimedWaitAny = wgpu::InstanceFeatureName::TimedWaitAny;
    wgpu::InstanceDescriptor instDesc{ .requiredFeatureCount = 1, .requiredFeatures = &kTimedWaitAny };
    wgpu::Instance instance = wgpu::CreateInstance(&instDesc);
    if (!instance) { std::fprintf(stderr, "[main] CreateInstance failed\n"); return 1; }

    wgpu::Surface surface = createSurfaceForHwnd(instance, (HWND)window.hwnd(), (HINSTANCE)window.hinstance());
    if (!surface) { std::fprintf(stderr, "[main] CreateSurface failed\n"); return 1; }

    // 3. Init Chakra host
    cx::Host host;
    if (!host.initialize()) { std::fprintf(stderr, "[main] Chakra init failed\n"); return 1; }
    g_host = &host;

    // 4. Tell the DOM shim where to resolve relative/`/foo` fetches.
    dom_shim::setBundleBaseDir(bundleDir);

    // 5. Install DOM globals.
    dom_shim::installGlobals(host, fbW, fbH);

    // 6. Install navigator.gpu + GPU* globals.
    wgpu_bridge::install(host, std::move(instance), std::move(surface), window.hwnd(), fbW, fbH);

    // 6b. Install __import for dynamic imports rewritten by transform-bundle.js
    {
        JsValueRef g = cx::Host::globalObject();
        cx::Host::setFunction(g, "__import", +[](JsValueRef, bool, JsValueRef* a, unsigned short c, void* state) -> JsValueRef {
            auto* h = static_cast<cx::Host*>(state);
            if (c < 2) return cx::Host::resolvedPromise(cx::Host::getUndefined());
            std::string spec = cx::Host::toUtf8(a[1]);
            JsValueRef ns = h->importByPath(spec, h->rootBaseDir());
            return cx::Host::resolvedPromise(ns ? ns : cx::Host::getUndefined());
        }, &host);
    }

    // 7. Load the JS shim (defines GPU classes, polyfills, etc.)
    std::string shimPath = (fs::path(fs_loader::executableDir()) / "js" / "runtime-shim.js").string();
    std::string shimSource;
    if (!fs_loader::readTextFile(shimPath, shimSource)) {
        std::fprintf(stderr, "[main] failed to read runtime-shim.js at %s\n", shimPath.c_str());
        return 1;
    }
    if (!host.runScript(shimSource, shimPath)) {
        std::fprintf(stderr, "[main] runtime-shim.js failed to execute\n");
        return 1;
    }

    // 7b. Install Worker support (after the shim, before scene load).
    worker_shim::setWorkerBaseDir(bundleDir);
    worker_shim::install(host);

    // 8. Wire window input -> JS event dispatch.
    window.setPointerCallback([&host](const native_window::Window::PointerEvent& ev) {
        dom_shim::PointerEvent dev{};
        switch (ev.kind) {
            case native_window::Window::PointerEvent::Move:  dev.kind = dom_shim::PointerEvent::Move; break;
            case native_window::Window::PointerEvent::Down:  dev.kind = dom_shim::PointerEvent::Down; break;
            case native_window::Window::PointerEvent::Up:    dev.kind = dom_shim::PointerEvent::Up; break;
            case native_window::Window::PointerEvent::Wheel: dev.kind = dom_shim::PointerEvent::Wheel; break;
            case native_window::Window::PointerEvent::Enter: dev.kind = dom_shim::PointerEvent::Enter; break;
            case native_window::Window::PointerEvent::Leave: dev.kind = dom_shim::PointerEvent::Leave; break;
        }
        dev.x = ev.x; dev.y = ev.y;
        dev.button = ev.button;
        dev.deltaY = ev.deltaY;
        dom_shim::pushPointerEvent(host, dev);
    });
    window.setResizeCallback([&host](int w, int h) {
        wgpu_bridge::onResize(w, h);
        dom_shim::pushResizeEvent(host, w, h);
    });

    // 9. Load the scene bundle entry as an ES module.
    std::fprintf(stderr, "[main] loading scene module: %s\n", bundlePath.c_str());

    // Install a marker so wasm-unsupported errors surfaced by JS can be
    // detected by the loop and turn into the dedicated exit code.
    {
        JsValueRef g = cx::Host::globalObject();
        cx::Host::setProperty(g, "__lastUnhandledError", cx::Host::getUndefined());
        // Catch unhandled rejections via the JS shim's `unhandledrejection` event.
        // The shim console.error()s them; we also expose a global setter the
        // shim can use.
    }
    host.runModule(bundlePath);
    // Module load errors are reported via reportException in runModule.

    int exitCode = kExitOk;

    auto checkSceneOk = [&]() -> int {
        JsValueRef g = cx::Host::globalObject();
        JsValueRef canvas = cx::Host::getProperty(g, "__canvas");
        if (!canvas) return -1;
        JsValueRef ds = cx::Host::getProperty(canvas, "dataset");
        if (!ds) return -1;
        // The scene's main() sets canvas.dataset.ready = "true" on success.
        if (cx::Host::hasProperty(ds, "ready")) {
            std::string v = cx::Host::toUtf8(cx::Host::getProperty(ds, "ready"));
            if (v == "true") return 1;
        }
        return 0;
    };

    auto checkSkipped = [&]() -> bool {
        JsValueRef g = cx::Host::globalObject();
        JsValueRef wasm = cx::Host::getProperty(g, "__wasmTriggered");
        if (!wasm) return false;
        std::string s = cx::Host::toUtf8(wasm);
        return s == "true";
    };

    auto checkFatalError = [&]() -> bool {
        JsValueRef g = cx::Host::globalObject();
        JsValueRef e = cx::Host::getProperty(g, "__fatalError");
        if (!e) return false;
        std::string s = cx::Host::toUtf8(e);
        return s == "true";
    };

    // 10. Main loop
    std::fprintf(stderr, "[main] entering render loop...\n");
    int frameNo = 0;
    int readyAtFrame = -1;          // first frame where data-ready was seen
    bool screenshotRequested = false;
    double tStart = monotonicMs();
    while (window.pumpEvents()) {
        double t = monotonicMs();
        dom_shim::runAnimationFrame(host, t);
        host.pumpMicrotasks();
        worker_shim::pumpIncoming(host);

        JsValueRef present = cx::Host::getProperty(cx::Host::globalObject(), "__present");
        if (present) {
            JsValueRef undef = cx::Host::getUndefined();
            JsValueRef args[1] = { undef };
            JsValueRef r = nullptr;
            JsCallFunction(present, args, 1, &r);
            host.reportException("present");
        }
        wgpu_bridge::tick();

        ++frameNo;
        if (frameNo == 1 || frameNo == 60 || frameNo == 300) {
            std::fprintf(stderr, "[main] frame %d (t=%.1fs)\n", frameNo, (monotonicMs() - tStart) / 1000.0);
        }

        // Test-mode exits.
        if (checkSkipped()) {
            std::fprintf(stderr, "[main] scene skipped: WebAssembly required\n");
            exitCode = kExitWasmUnsupported;
            break;
        }
        if (checkFatalError()) {
            std::fprintf(stderr, "[main] scene aborted by JS-level error\n");
            exitCode = kExitError;
            break;
        }
        if (cli.exitOnReady && checkSceneOk() == 1) {
            if (!cli.screenshotPath.empty() && readyAtFrame < 0) {
                readyAtFrame = frameNo;
                std::fprintf(stderr, "[main] scene ready (data-ready=true) at frame %d; "
                                     "rendering %d more frame(s) then capturing screenshot\n",
                             frameNo, cli.screenshotDelayFrames);
            }
            if (cli.screenshotPath.empty()) {
                std::fprintf(stderr, "[main] scene ready (data-ready=true)\n");
                exitCode = kExitOk;
                break;
            }
            // With screenshot: wait `screenshotDelayFrames` after ready, then capture.
            if (readyAtFrame >= 0 && !screenshotRequested
                && frameNo >= readyAtFrame + cli.screenshotDelayFrames) {
                wgpu_bridge::requestScreenshot(cli.screenshotPath);
                screenshotRequested = true;
            }
            // The actual capture happens inside the next `present` call; let one
            // more frame pass so the capture is flushed to disk.
            if (screenshotRequested && frameNo >= readyAtFrame + cli.screenshotDelayFrames + 2) {
                std::fprintf(stderr, "[main] scene ready (data-ready=true)\n");
                exitCode = kExitOk;
                break;
            }
        }
        if (cli.maxFrames > 0 && frameNo >= cli.maxFrames) {
            std::fprintf(stderr, "[main] reached max frames (%d)\n", cli.maxFrames);
            // If exit-on-ready was requested but never became ready, treat as error.
            if (cli.exitOnReady && checkSceneOk() != 1) exitCode = kExitError;
            break;
        }
    }

    std::fprintf(stderr, "[main] shutting down (rendered %d frames, exit=%d)\n", frameNo, exitCode);
    worker_shim::shutdownAll();
    host.shutdown();
    window.destroy();
    image_decoder::shutdown();
    return exitCode;
}
