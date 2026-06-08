#pragma once

#define USE_EDGEMODE_JSRT 0
#include "chakra_sdk_compat.h"

#include <functional>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

namespace cx {

// Lightweight Chakra helpers shared across the host. All accesses must be made
// from the thread that owns the Chakra context (we use a single-threaded model).

class Host {
public:
    Host();
    ~Host();

    bool initialize();
    void shutdown();

    // Resolve, parse, and evaluate `entryPath` as an ES module root.
    // `entryPath` is filesystem path; the bundle directory it lives in becomes
    // the base for resolving its imports.
    bool runModule(const std::string& entryPath);

    // Run a classic script (UTF-8) in the current context with the given source URL.
    bool runScript(std::string_view source, const std::string& sourceUrl);

    // Drain microtasks (promise callbacks) until the queue is empty.
    void pumpMicrotasks();

    // Add a callback to the microtask queue (called from C++ to schedule
    // a JS-side function call on the next pump).
    void enqueueTask(std::function<void()> task);
    bool hasPendingTasks() const { return !taskQueue_.empty(); }
    void runPendingTasks();

    // Resolve, parse, evaluate a module by specifier (relative to root) and
    // return its namespace as a JsValueRef. Used to implement dynamic
    // `__import()` from JS.
    JsValueRef importByPath(const std::string& specifier, const std::string& baseDir);

    // Report and clear a current exception. Returns true if there was one.
    bool reportException(const char* whileDoing);

    // Convert helpers
    static std::string toUtf8(JsValueRef value);
    static JsValueRef fromUtf8(std::string_view text);
    static JsValueRef fromBool(bool b);
    static JsValueRef fromInt(int v);
    static JsValueRef fromUint(uint32_t v);
    static JsValueRef fromDouble(double v);
    static JsValueRef getUndefined();
    static JsValueRef getNull();

    // Property helpers
    static JsValueRef getProperty(JsValueRef obj, const char* name);
    static bool hasProperty(JsValueRef obj, const char* name);
    static void setProperty(JsValueRef obj, const char* name, JsValueRef value);
    static void setFunction(JsValueRef obj, const char* name, JsNativeFunction fn, void* state = nullptr);

    static JsValueRef globalObject();
    static JsValueRef makeObject();
    static JsValueRef makeArray(unsigned int length = 0);

    // Argument helpers for native callbacks.
    static double getDouble(JsValueRef v, double fallback = 0.0);
    static int getInt(JsValueRef v, int fallback = 0);
    static uint32_t getUint(JsValueRef v, uint32_t fallback = 0);
    static bool getBool(JsValueRef v, bool fallback = false);
    static bool isUndefined(JsValueRef v);
    static bool isNull(JsValueRef v);
    static bool isObject(JsValueRef v);
    static bool isArray(JsValueRef v);
    static bool isArrayBuffer(JsValueRef v);
    static bool isTypedArrayOrView(JsValueRef v);

    // Promise helpers: create a resolver pair. Returns the promise.
    static JsValueRef createPromise(JsValueRef& resolveFn, JsValueRef& rejectFn);
    static JsValueRef resolvedPromise(JsValueRef value);
    static JsValueRef rejectedPromise(JsValueRef reason);

    JsRuntimeHandle runtime() const { return runtime_; }
    JsContextRef context() const { return context_; }

private:
    static void CHAKRA_CALLBACK promiseContinuationCallback(JsValueRef task, void* callbackState);
    static JsErrorCode CHAKRA_CALLBACK fetchImportedModuleCb(JsModuleRecord referencingModule, JsValueRef specifier, JsModuleRecord* dependentModuleRecord);
    static JsErrorCode CHAKRA_CALLBACK fetchImportedModuleFromScriptCb(JsSourceContext referencingSourceContext, JsValueRef specifier, JsModuleRecord* dependentModuleRecord);
    static JsErrorCode CHAKRA_CALLBACK notifyModuleReadyCb(JsModuleRecord referencingModule, JsValueRef exceptionVar);

    JsModuleRecord createModuleRecord(JsModuleRecord parent, const std::string& specifier, const std::string& absolutePath);
    bool parseAndStartModule(JsModuleRecord record, const std::string& absolutePath);
    JsErrorCode handleFetchImported(JsModuleRecord referencingModule, JsValueRef specifier, JsModuleRecord* dependentModuleRecord);

    JsRuntimeHandle runtime_ = JS_INVALID_RUNTIME_HANDLE;
    JsContextRef context_ = JS_INVALID_REFERENCE;
    JsSourceContext nextSourceContext_ = 0;

    // Path of the root module's directory (base for relative resolution)
    std::string rootBaseDir_;
public:
    const std::string& rootBaseDir() const { return rootBaseDir_; }
private:

    // Map from absolute module path to module record.
    std::unordered_map<std::string, JsModuleRecord> moduleByPath_;
    // Map from module record to its directory (for resolving its imports).
    std::unordered_map<JsModuleRecord, std::string> moduleDirByRecord_;
    // Map from module record to its absolute path (for stable identification).
    std::unordered_map<JsModuleRecord, std::string> modulePathByRecord_;

    // Promise microtask queue.
    std::vector<JsValueRef> promiseTasks_;

    // C++ tasks to invoke between frames (e.g. animation frame callbacks dispatch).
    std::vector<std::function<void()>> taskQueue_;
};

} // namespace cx
