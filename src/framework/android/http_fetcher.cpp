// Android HTTP fetcher.
//
// We delegate to the JVM (HttpURLConnection wrapped in the
// `com.dawntest.HttpFetcher` Java class). This avoids dragging in libcurl /
// OpenSSL: the JVM ships everything required to do HTTPS, cookie handling,
// redirects, etc. The Java helper is fully synchronous (one network thread
// per call) — same semantics as the win32 winhttp implementation.
//
// The JNI bridge (jni_bridge.cpp) caches the JavaVM* on JNI_OnLoad and
// publishes it via setJavaVm() below.

#include "http_fetcher.h"

#include "fs_loader.h"

#include <jni.h>

#include <cstdio>
#include <filesystem>
#include <mutex>

namespace fs = std::filesystem;

namespace http_fetcher {

namespace {
std::mutex g_mu;
JavaVM*    g_vm = nullptr;
jclass     g_helperClass = nullptr;     // global ref
jmethodID  g_downloadMid  = nullptr;    // static byte[] download(String url)

struct JniScope {
    JniScope() : env(nullptr), attached(false) {
        if (!g_vm) return;
        if (g_vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
            if (g_vm->AttachCurrentThread(&env, nullptr) == JNI_OK) {
                attached = true;
            } else {
                env = nullptr;
            }
        }
    }
    ~JniScope() {
        if (attached && g_vm) g_vm->DetachCurrentThread();
    }
    JNIEnv* env;
    bool    attached;
};
} // namespace

// Called from JNI bridge.
void setJavaVm(JavaVM* vm) {
    std::lock_guard<std::mutex> lk(g_mu);
    g_vm = vm;
}

void setHttpFetcherClass(JNIEnv* env, jclass helperClass) {
    std::lock_guard<std::mutex> lk(g_mu);
    if (g_helperClass) {
        env->DeleteGlobalRef(g_helperClass);
        g_helperClass = nullptr;
    }
    g_helperClass = static_cast<jclass>(env->NewGlobalRef(helperClass));
    g_downloadMid = env->GetStaticMethodID(g_helperClass, "download", "(Ljava/lang/String;)[B");
    if (!g_downloadMid) {
        std::fprintf(stderr, "[http] could not resolve HttpFetcher.download(String)[B\n");
    }
}

bool downloadToMemory(const std::string& url, std::vector<uint8_t>& out) {
    out.clear();
    JniScope scope;
    if (!scope.env || !g_helperClass || !g_downloadMid) {
        std::fprintf(stderr, "[http] not initialised; cannot download %s\n", url.c_str());
        return false;
    }
    JNIEnv* env = scope.env;
    jstring jurl = env->NewStringUTF(url.c_str());
    jbyteArray jbytes = static_cast<jbyteArray>(
        env->CallStaticObjectMethod(g_helperClass, g_downloadMid, jurl));
    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
        env->DeleteLocalRef(jurl);
        return false;
    }
    env->DeleteLocalRef(jurl);
    if (!jbytes) return false;
    jsize n = env->GetArrayLength(jbytes);
    out.resize(static_cast<size_t>(n));
    if (n > 0) {
        env->GetByteArrayRegion(jbytes, 0, n, reinterpret_cast<jbyte*>(out.data()));
    }
    env->DeleteLocalRef(jbytes);
    return true;
}

bool ensureCached(const std::string& url, const std::string& cachePath) {
    if (fs::exists(cachePath)) {
        std::error_code ec;
        auto sz = fs::file_size(cachePath, ec);
        if (!ec && sz > 0) return true;
    }
    std::vector<uint8_t> data;
    if (!downloadToMemory(url, data)) return false;
    if (!fs_loader::writeBinaryFile(cachePath, data.data(), data.size())) {
        std::fprintf(stderr, "[http] failed to write cache %s\n", cachePath.c_str());
        return false;
    }
    return true;
}

} // namespace http_fetcher
