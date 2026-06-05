#pragma once

#include "chakra_compat.h"

#include <v8.h>
#include <v8-platform.h>
#include <libplatform/libplatform.h>

#include <functional>
#include <memory>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

namespace cx {

class Host {
public:
    Host();
    ~Host();

    bool initialize();
    void shutdown();

    bool runModule(const std::string& entryPath);
    bool runScript(std::string_view source, const std::string& sourceUrl);

    void pumpMicrotasks();

    void enqueueTask(std::function<void()> task);
    bool hasPendingTasks() const { return !taskQueue_.empty(); }
    void runPendingTasks();

    JsValueRef importByPath(const std::string& specifier, const std::string& baseDir);

    bool reportException(const char* whileDoing);

    static std::string toUtf8(JsValueRef value);
    static JsValueRef  fromUtf8(std::string_view text);
    static JsValueRef  fromBool(bool b);
    static JsValueRef  fromInt(int v);
    static JsValueRef  fromUint(uint32_t v);
    static JsValueRef  fromDouble(double v);
    static JsValueRef  getUndefined();
    static JsValueRef  getNull();

    static JsValueRef  getProperty(JsValueRef obj, const char* name);
    static bool        hasProperty(JsValueRef obj, const char* name);
    static void        setProperty(JsValueRef obj, const char* name, JsValueRef value);
    static void        setFunction(JsValueRef obj, const char* name, JsNativeFunction fn, void* state = nullptr);

    static JsValueRef  globalObject();
    static JsValueRef  makeObject();
    static JsValueRef  makeArray(unsigned int length = 0);

    static double      getDouble(JsValueRef v, double fallback = 0.0);
    static int         getInt(JsValueRef v, int fallback = 0);
    static uint32_t    getUint(JsValueRef v, uint32_t fallback = 0);
    static bool        getBool(JsValueRef v, bool fallback = false);
    static bool        isUndefined(JsValueRef v);
    static bool        isNull(JsValueRef v);
    static bool        isObject(JsValueRef v);
    static bool        isArray(JsValueRef v);
    static bool        isArrayBuffer(JsValueRef v);
    static bool        isTypedArrayOrView(JsValueRef v);

    static JsValueRef  createPromise(JsValueRef& resolveFn, JsValueRef& rejectFn);
    static JsValueRef  resolvedPromise(JsValueRef value);
    static JsValueRef  rejectedPromise(JsValueRef reason);

    JsRuntimeHandle runtime() const { return isolate_; }
    JsContextRef    context() const { return contextHandle_; }
    const std::string& rootBaseDir() const { return rootBaseDir_; }

private:
    static std::unique_ptr<v8::Platform> s_platform;
    static bool s_initialized;

    v8::Isolate* isolate_ = nullptr;
    v8::ArrayBuffer::Allocator* allocator_ = nullptr;
    v8::Global<v8::Context>* contextGlobal_ = nullptr;
    JsContextRef contextHandle_ = nullptr;

    std::string rootBaseDir_;
    std::vector<std::function<void()>> taskQueue_;
};

} // namespace cx
