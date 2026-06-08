// JNI bridge for the DawnTest Android app.
//
// Exposes a tiny C ABI consumed by `com.dawntest.MainActivity` and
// `com.dawntest.DawnView` (a SurfaceView). The Java side owns the Surface;
// the C++ side does everything else (Dawn + JS + render loop).

#include "android_app.h"
#include "fs_loader.h"

#include <android/asset_manager.h>
#include <android/asset_manager_jni.h>
#include <android/log.h>
#include <android/native_window_jni.h>

#include <jni.h>

#include <string>

namespace http_fetcher {
void setJavaVm(JavaVM* vm);
void setHttpFetcherClass(JNIEnv* env, jclass cls);
} // namespace http_fetcher

#define LOG_TAG "DawnTest"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace {

std::string jstringToUtf8(JNIEnv* env, jstring s) {
    if (!s) return {};
    const char* c = env->GetStringUTFChars(s, nullptr);
    std::string out = c ? c : "";
    if (c) env->ReleaseStringUTFChars(s, c);
    return out;
}

} // namespace

extern "C" {

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* /*reserved*/) {
    JNIEnv* env = nullptr;
    if (vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return JNI_ERR;
    }
    http_fetcher::setJavaVm(vm);

    // Cache HttpFetcher class so the helper class is resolvable from any
    // thread (FindClass uses the caller's class loader, which only works for
    // the system loader off non-Java-attached threads).
    jclass cls = env->FindClass("com/dawntest/HttpFetcher");
    if (cls) {
        http_fetcher::setHttpFetcherClass(env, cls);
        env->DeleteLocalRef(cls);
    } else {
        LOGE("JNI_OnLoad: could not find com/dawntest/HttpFetcher");
        if (env->ExceptionCheck()) env->ExceptionClear();
    }
    return JNI_VERSION_1_6;
}

JNIEXPORT void JNICALL
Java_com_dawntest_NativeBridge_nativeInit(
        JNIEnv* env, jclass,
        jobject assetMgrObj,
        jstring jDataDir, jstring jCacheDir,
        jstring jBundlePath, jint width, jint height) {
    AAssetManager* mgr = AAssetManager_fromJava(env, assetMgrObj);
    JavaVM* vm = nullptr;
    env->GetJavaVM(&vm);

    std::string dataDir   = jstringToUtf8(env, jDataDir);
    std::string cacheDir  = jstringToUtf8(env, jCacheDir);
    std::string bundlePath = jstringToUtf8(env, jBundlePath);

    android_app::setEnvironment(vm, mgr, dataDir, cacheDir);

    android_app::LaunchConfig cfg;
    cfg.bundlePath = bundlePath;
    cfg.width      = width;
    cfg.height     = height;
    android_app::setLaunchConfig(cfg);

    LOGI("nativeInit: data=%s cache=%s bundle=%s %dx%d",
         dataDir.c_str(), cacheDir.c_str(), bundlePath.c_str(), width, height);
}

JNIEXPORT void JNICALL
Java_com_dawntest_NativeBridge_nativeSurfaceCreated(
        JNIEnv* env, jclass, jobject surface, jint width, jint height) {
    ANativeWindow* window = ANativeWindow_fromSurface(env, surface);
    if (!window) {
        LOGE("ANativeWindow_fromSurface returned null");
        return;
    }
    LOGI("surfaceCreated %dx%d", width, height);
    android_app::onSurfaceCreated(window, width, height);
}

JNIEXPORT void JNICALL
Java_com_dawntest_NativeBridge_nativeSurfaceChanged(
        JNIEnv*, jclass, jint width, jint height) {
    LOGI("surfaceChanged %dx%d", width, height);
    android_app::onSurfaceChanged(width, height);
}

JNIEXPORT void JNICALL
Java_com_dawntest_NativeBridge_nativeSurfaceDestroyed(JNIEnv*, jclass) {
    LOGI("surfaceDestroyed");
    android_app::onSurfaceDestroyed();
}

JNIEXPORT void JNICALL
Java_com_dawntest_NativeBridge_nativeAppDestroyed(JNIEnv*, jclass) {
    LOGI("appDestroyed");
    android_app::onAppDestroyed();
}

JNIEXPORT void JNICALL
Java_com_dawntest_NativeBridge_nativePointerEvent(
        JNIEnv*, jclass,
        jint kind, jdouble x, jdouble y, jint button, jdouble deltaY) {
    android_app::onPointerEvent(kind, x, y, button, deltaY);
}

} // extern "C"
