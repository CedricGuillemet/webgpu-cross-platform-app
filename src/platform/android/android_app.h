#pragma once

#include <jni.h>

#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <thread>

struct ANativeWindow;
struct AAssetManager;

namespace android_app {

struct LaunchConfig {
    std::string bundlePath;          // e.g. "assets/bundle/scene21.js"
    int width  = 1280;
    int height = 720;
};

// Initialise the singleton with JVM + asset manager (called from JNI_OnLoad
// and JNI bridge before any other call).
void setEnvironment(JavaVM* vm, AAssetManager* assetMgr,
                    const std::string& dataDir, const std::string& cacheDir);

// Configure which bundle to run. Must be called before onSurfaceCreated.
void setLaunchConfig(const LaunchConfig& cfg);

// Lifecycle (from JNI).
void onSurfaceCreated(ANativeWindow* window, int width, int height);
void onSurfaceChanged(int width, int height);
void onSurfaceDestroyed();
void onAppDestroyed();
void onPointerEvent(int kind, double x, double y, int button, double deltaY);

} // namespace android_app
