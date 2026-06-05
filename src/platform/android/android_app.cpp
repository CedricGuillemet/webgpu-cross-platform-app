// Android port of the main app loop (mirrors main.cpp for Win32).
//
// Lifecycle:
//   JNI_OnLoad           → setEnvironment(vm, ...)
//   onSurfaceCreated     → start render thread; build Dawn surface; load JS
//   onSurfaceChanged     → resize Dawn surface
//   onSurfaceDestroyed   → request render thread to release GPU resources
//   onAppDestroyed       → request render thread to exit
//
// We use Dawn's SurfaceSourceAndroidNativeWindow to drive Vulkan from an
// ANativeWindow obtained on the Java side from SurfaceHolder.getSurface().
//
// Threading model: one dedicated render thread. JNI callbacks just stage
// requests on a small command queue; the render thread services them
// between frames so we never touch wgpu / JS state from the UI thread.

#include "android_app.h"

#include "chakra_host.h"
#include "dom_shim.h"
#include "fs_loader.h"
#include "http_fetcher.h"
#include "image_decoder.h"
#include "native_window.h"
#include "wgpu_bridge.h"
#include "worker_shim.h"

#include <webgpu/webgpu_cpp.h>

#include <android/log.h>
#include <android/native_window.h>

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <mutex>
#include <queue>
#include <thread>
#include <unistd.h>

#define LOG_TAG "DawnTest"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)

namespace fs = std::filesystem;

namespace android_app {

namespace {

double monotonicMs() {
    using clock = std::chrono::steady_clock;
    static const auto t0 = clock::now();
    return std::chrono::duration<double, std::milli>(clock::now() - t0).count();
}

// Redirect stdout/stderr from C++ printf/fprintf to logcat so messages from
// chakra_host / dom_shim / wgpu_bridge are visible. We spawn a single helper
// thread per stream that reads lines from a pipe and emits them via
// __android_log_write.
void startStdioForwarder(int srcFd, android_LogPriority prio, const char* tag) {
    int pipefd[2];
    if (pipe(pipefd) != 0) return;
    dup2(pipefd[1], srcFd);
    close(pipefd[1]);
    // Disable buffering on the source stream so output appears immediately.
    setvbuf(srcFd == 1 ? stdout : stderr, nullptr, _IONBF, 0);
    std::thread([readFd = pipefd[0], prio, tag]{
        std::string line;
        char ch;
        while (read(readFd, &ch, 1) == 1) {
            if (ch == '\n') {
                if (!line.empty()) __android_log_write(prio, tag, line.c_str());
                line.clear();
            } else {
                line.push_back(ch);
                if (line.size() > 4000) {
                    __android_log_write(prio, tag, line.c_str());
                    line.clear();
                }
            }
        }
    }).detach();
}

void ensureStdioForwardingOnce() {
    static std::once_flag once;
    std::call_once(once, [] {
        startStdioForwarder(STDOUT_FILENO, ANDROID_LOG_INFO,  "DawnTest-stdout");
        startStdioForwarder(STDERR_FILENO, ANDROID_LOG_ERROR, "DawnTest-stderr");
    });
}

struct Cmd {
    enum Kind {
        SurfaceCreated,
        SurfaceChanged,
        SurfaceDestroyed,
        AppDestroyed,
        Pointer,
    };
    Kind kind;
    ANativeWindow* window = nullptr;
    int width = 0;
    int height = 0;
    // Pointer payload
    int    pkind = 0;
    double px = 0, py = 0;
    int    button = 0;
    double deltaY = 0;
};

class App {
public:
    static App& instance() {
        static App app;
        return app;
    }

    void setConfig(const LaunchConfig& cfg) {
        std::lock_guard<std::mutex> lk(cfgMu_);
        config_ = cfg;
    }

    void postSurfaceCreated(ANativeWindow* w, int width, int height) {
        Cmd c{}; c.kind = Cmd::SurfaceCreated; c.window = w; c.width = width; c.height = height;
        post(c);
        startThreadIfNeeded();
    }
    void postSurfaceChanged(int w, int h) {
        Cmd c{}; c.kind = Cmd::SurfaceChanged; c.width = w; c.height = h; post(c);
    }
    void postSurfaceDestroyed() {
        Cmd c{}; c.kind = Cmd::SurfaceDestroyed; post(c);
    }
    void postAppDestroyed() {
        Cmd c{}; c.kind = Cmd::AppDestroyed; post(c);
        // Join the thread so resources are released deterministically.
        if (thread_.joinable()) thread_.join();
    }
    void postPointer(int kind, double x, double y, int button, double deltaY) {
        Cmd c{}; c.kind = Cmd::Pointer; c.pkind = kind; c.px = x; c.py = y;
        c.button = button; c.deltaY = deltaY; post(c);
    }

private:
    void post(const Cmd& c) {
        std::lock_guard<std::mutex> lk(qMu_);
        q_.push(c);
        qCv_.notify_one();
    }

    void startThreadIfNeeded() {
        std::lock_guard<std::mutex> lk(threadMu_);
        if (!thread_.joinable()) {
            shouldExit_ = false;
            thread_ = std::thread([this]{ this->renderThreadMain(); });
        }
    }

    // --- Drain the command queue into the renderer state. Returns true if
    //     a SurfaceDestroyed / AppDestroyed has come in. ---
    bool drainCommands() {
        bool surfaceLost = false;
        std::queue<Cmd> local;
        {
            std::lock_guard<std::mutex> lk(qMu_);
            local.swap(q_);
        }
        while (!local.empty()) {
            Cmd c = local.front(); local.pop();
            switch (c.kind) {
                case Cmd::SurfaceCreated:
                    pendingWindow_ = c.window;
                    pendingW_      = c.width;
                    pendingH_      = c.height;
                    haveNewSurface_ = true;
                    break;
                case Cmd::SurfaceChanged:
                    pendingW_ = c.width;
                    pendingH_ = c.height;
                    haveResize_ = true;
                    break;
                case Cmd::SurfaceDestroyed:
                    surfaceLost = true;
                    break;
                case Cmd::AppDestroyed:
                    shouldExit_ = true;
                    break;
                case Cmd::Pointer:
                    if (host_) {
                        dom_shim::PointerEvent dev{};
                        dev.kind   = static_cast<dom_shim::PointerEvent::Kind>(c.pkind);
                        dev.x      = c.px;
                        dev.y      = c.py;
                        dev.button = c.button;
                        dev.deltaY = c.deltaY;
                        dom_shim::pushPointerEvent(*host_, dev);
                    }
                    break;
            }
        }
        return surfaceLost;
    }

    wgpu::Surface createSurfaceForAndroid(wgpu::Instance instance, ANativeWindow* window) {
        wgpu::SurfaceSourceAndroidNativeWindow chained{};
        chained.window = window;
        wgpu::SurfaceDescriptor desc{};
        desc.nextInChain = &chained;
        return instance.CreateSurface(&desc);
    }

    // Returns true on full success (JS host loaded and ready to render).
    bool initGpuAndJs(ANativeWindow* window, int w, int h) {
        // Acquire ANativeWindow ref via our native_window wrapper so we keep
        // it alive for the lifetime of the surface.
        window_.attachSurface(window, w, h);

        // Dawn instance
        static const auto kTimedWaitAny = wgpu::InstanceFeatureName::TimedWaitAny;
        wgpu::InstanceDescriptor instDesc{
            .requiredFeatureCount = 1,
            .requiredFeatures     = &kTimedWaitAny,
        };
        wgpu::Instance instance = wgpu::CreateInstance(&instDesc);
        if (!instance) { LOGE("CreateInstance failed"); return false; }

        wgpu::Surface surface = createSurfaceForAndroid(instance, window_.aNativeWindow());
        if (!surface) { LOGE("CreateSurface failed"); return false; }

        host_ = std::make_unique<cx::Host>();
        if (!host_->initialize()) { LOGE("JS host init failed"); return false; }

        std::string bundlePath;
        {
            std::lock_guard<std::mutex> lk(cfgMu_);
            bundlePath = config_.bundlePath;
        }
        std::string bundleDir = fs::path(bundlePath).parent_path().string();
        dom_shim::setBundleBaseDir(bundleDir);
        dom_shim::installGlobals(*host_, w, h);

        wgpu_bridge::install(*host_, std::move(instance), std::move(surface),
                             window_.aNativeWindow(), w, h);

        // __import for dynamic import rewrites.
        {
            JsValueRef g = cx::Host::globalObject();
            cx::Host::setFunction(g, "__import",
                +[](JsValueRef, bool, JsValueRef* a, unsigned short c, void* state) -> JsValueRef {
                    auto* h = static_cast<cx::Host*>(state);
                    if (c < 2) return cx::Host::resolvedPromise(cx::Host::getUndefined());
                    std::string spec = cx::Host::toUtf8(a[1]);
                    JsValueRef ns = h->importByPath(spec, h->rootBaseDir());
                    return cx::Host::resolvedPromise(ns ? ns : cx::Host::getUndefined());
                }, host_.get());
        }

        // runtime-shim.js
        std::string shimPath = (fs::path(fs_loader::executableDir()) / "assets" / "js" / "runtime-shim.js").string();
        std::string shimSrc;
        if (!fs_loader::readTextFile(shimPath, shimSrc)) {
            LOGE("failed to read runtime-shim.js at %s", shimPath.c_str());
            return false;
        }
        if (!host_->runScript(shimSrc, shimPath)) {
            LOGE("runtime-shim.js failed to execute");
            return false;
        }

        worker_shim::setWorkerBaseDir(bundleDir);
        worker_shim::install(*host_);

        window_.setPointerCallback([this](const native_window::Window::PointerEvent& ev) {
            if (!host_) return;
            dom_shim::PointerEvent dev{};
            dev.kind   = static_cast<dom_shim::PointerEvent::Kind>(ev.kind);
            dev.x      = ev.x;
            dev.y      = ev.y;
            dev.button = ev.button;
            dev.deltaY = ev.deltaY;
            dom_shim::pushPointerEvent(*host_, dev);
        });
        window_.setResizeCallback([this](int rw, int rh) {
            wgpu_bridge::onResize(rw, rh);
            if (host_) dom_shim::pushResizeEvent(*host_, rw, rh);
        });

        LOGI("loading scene bundle: %s", bundlePath.c_str());
        if (!fs::exists(bundlePath)) {
            // Could be inside the APK assets — fs::exists doesn't see those.
            std::string asAsset = bundlePath;
            std::string probe;
            if (!fs_loader::readTextFile(asAsset, probe)) {
                LOGE("bundle not found: %s", bundlePath.c_str());
                return false;
            }
        }
        host_->runModule(bundlePath);
        return true;
    }

    void teardownGpuAndJs() {
        if (host_) {
            worker_shim::shutdownAll();
            host_->shutdown();
            host_.reset();
        }
        window_.detachSurface();
    }

    void renderThreadMain() {
        ensureStdioForwardingOnce();
        LOGI("render thread starting");
        image_decoder::initialize();
        bool inited = false;
        int frameNo = 0;
        double tStart = monotonicMs();

        while (!shouldExit_) {
            bool surfaceLost = drainCommands();
            if (shouldExit_) break;

            if (haveNewSurface_) {
                haveNewSurface_ = false;
                if (!inited) {
                    if (!initGpuAndJs(pendingWindow_, pendingW_, pendingH_)) {
                        LOGE("initGpuAndJs failed; render thread idling");
                        // Drain commands at low frequency until app exits.
                        std::this_thread::sleep_for(std::chrono::milliseconds(50));
                        continue;
                    }
                    inited = true;
                } else {
                    // Surface re-created (configuration change). Attach new
                    // ANativeWindow and let wgpu_bridge rebuild swapchain on
                    // the next configure call.
                    window_.attachSurface(pendingWindow_, pendingW_, pendingH_);
                    wgpu_bridge::onResize(pendingW_, pendingH_);
                }
            }
            if (haveResize_) {
                haveResize_ = false;
                window_.pushResize(pendingW_, pendingH_);
            }
            if (surfaceLost) {
                window_.detachSurface();
                // Continue spinning at low rate until a new surface arrives or
                // the app is destroyed.
                std::this_thread::sleep_for(std::chrono::milliseconds(50));
                continue;
            }

            if (!inited) {
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
                continue;
            }

            // Tick the app.
            double t = monotonicMs();
            dom_shim::runAnimationFrame(*host_, t);
            host_->pumpMicrotasks();
            worker_shim::pumpIncoming(*host_);

            JsValueRef present = cx::Host::getProperty(cx::Host::globalObject(), "__present");
            if (present) {
                JsValueRef undef = cx::Host::getUndefined();
                JsValueRef args[1] = { undef };
                JsValueRef r = nullptr;
                JsCallFunction(present, args, 1, &r);
                host_->reportException("present");
            }
            wgpu_bridge::tick();

            ++frameNo;
            if (frameNo == 1 || frameNo == 60 || frameNo == 300 ||
                (frameNo % 60 == 0 && frameNo <= 600) ||
                (frameNo % 600 == 0)) {
                LOGI("frame %d (t=%.2fs)", frameNo, (monotonicMs() - tStart) / 1000.0);
            }
        }

        teardownGpuAndJs();
        image_decoder::shutdown();
        LOGI("render thread exiting (rendered %d frames)", frameNo);
    }

    LaunchConfig config_;
    std::mutex   cfgMu_;

    std::thread  thread_;
    std::mutex   threadMu_;
    std::atomic<bool> shouldExit_{false};

    std::mutex   qMu_;
    std::condition_variable qCv_;
    std::queue<Cmd> q_;

    // Drained-state.
    ANativeWindow* pendingWindow_ = nullptr;
    int pendingW_ = 0, pendingH_ = 0;
    bool haveNewSurface_ = false;
    bool haveResize_     = false;

    native_window::Window     window_;
    std::unique_ptr<cx::Host> host_;
};

} // namespace

// ---- Public entry points (called from JNI bridge) ----

void setEnvironment(JavaVM* vm, AAssetManager* assetMgr,
                    const std::string& dataDir, const std::string& cacheDir) {
    extern void __unused_jvm_set_in_jni_bridge();  // doc-only
    (void)vm;
    fs_loader::setAssetManager(assetMgr);
    fs_loader::setInternalDataDir(dataDir);
    fs_loader::setCacheDir(cacheDir);
}

void setLaunchConfig(const LaunchConfig& cfg) {
    App::instance().setConfig(cfg);
}

void onSurfaceCreated(ANativeWindow* window, int width, int height) {
    App::instance().postSurfaceCreated(window, width, height);
}

void onSurfaceChanged(int width, int height) {
    App::instance().postSurfaceChanged(width, height);
}

void onSurfaceDestroyed() {
    App::instance().postSurfaceDestroyed();
}

void onAppDestroyed() {
    App::instance().postAppDestroyed();
}

void onPointerEvent(int kind, double x, double y, int button, double deltaY) {
    App::instance().postPointer(kind, x, y, button, deltaY);
}

// Doc-only sentinel referenced from setEnvironment so the linker can keep
// http_fetcher's setJavaVm symbol live without a header dependency dance.
void __unused_jvm_set_in_jni_bridge() {}

} // namespace android_app
