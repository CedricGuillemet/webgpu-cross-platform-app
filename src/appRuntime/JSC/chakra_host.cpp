// JSC host: minimal Host class on top of Apple JavaScriptCore / libjsc.
// Same surface as the QuickJS host so shared code (wgpu_bridge etc.) builds
// unchanged.
//
// Module loading: JSC's public C API does not expose ES module loading.
// runModule() reads the file and calls JsRun (script mode). For the babel-
// transformed bundles we ship this is sufficient — they don't use top-level
// import statements in script mode (dynamic import is routed through the
// global __import shim).

#include "chakra_host.h"

#include <cstdio>
#include <filesystem>
#include <fstream>
#include <sstream>

namespace fs = std::filesystem;

namespace cx {

namespace {
Host* g_host = nullptr;
} // namespace

Host::Host()  = default;
Host::~Host() { shutdown(); }

bool Host::initialize() {
    JsRuntimeHandle rt = nullptr;
    if (JsCreateRuntime(JsRuntimeAttributeNone, nullptr, &rt) != JsNoError) {
        std::fprintf(stderr, "[jsc] JsCreateRuntime failed\n");
        return false;
    }
    runtime_ = rt;
    JsContextRef cx = nullptr;
    if (JsCreateContext(rt, &cx) != JsNoError) {
        std::fprintf(stderr, "[jsc] JsCreateContext failed\n");
        return false;
    }
    context_ = cx;
    JsSetCurrentContext(cx);
    cc::setContext(static_cast<JSGlobalContextRef>(cx));
    g_host = this;
    return true;
}

void Host::shutdown() {
    if (context_) {
        // JSC contexts are released as part of group teardown below; we still
        // null the slot so further calls become no-ops.
        context_ = nullptr;
    }
    if (runtime_) {
        JsDisposeRuntime(runtime_);
        runtime_ = JS_INVALID_RUNTIME_HANDLE;
    }
    cc::setContext(nullptr);
    if (g_host == this) g_host = nullptr;
}

bool Host::runScript(std::string_view source, const std::string& sourceUrl) {
    if (!context_) return false;
    JsValueRef src = fromUtf8(source);
    JsValueRef url = fromUtf8(sourceUrl);
    JsValueRef result = nullptr;
    JsErrorCode rc = JsRun(src, 0, url, JsParseScriptAttributeNone, &result);
    if (rc != JsNoError) { reportException(sourceUrl.c_str()); return false; }
    return true;
}

bool Host::runModule(const std::string& entryPath) {
    if (!context_) return false;
    fs::path p(entryPath);
    rootBaseDir_ = p.parent_path().string();
    std::ifstream f(entryPath, std::ios::binary);
    if (!f) {
        std::fprintf(stderr, "[jsc] cannot open module: %s\n", entryPath.c_str());
        return false;
    }
    std::ostringstream ss; ss << f.rdbuf();
    return runScript(ss.str(), entryPath);
}

void Host::pumpMicrotasks() {
    // JSC drives its own microtask queue automatically when control returns
    // to the engine. Nothing to do here.
}

void Host::enqueueTask(std::function<void()> task) {
    taskQueue_.emplace_back(std::move(task));
}
void Host::runPendingTasks() {
    auto pending = std::move(taskQueue_);
    taskQueue_.clear();
    for (auto& t : pending) {
        try { t(); } catch (...) {}
    }
}

JsValueRef Host::importByPath(const std::string& specifier, const std::string& baseDir) {
    // Mirrors QuickJS impl: read the file, evaluate it as script, return its
    // 'exports' object if present. For babel-transformed bundles this works.
    fs::path resolved;
    auto isAbs = [](const std::string& s) {
        return !s.empty() && (s[0] == '/' || s[0] == '\\' ||
                              (s.size() >= 2 && s[1] == ':'));
    };
    auto isRel = [](const std::string& s) {
        return s.rfind("./", 0) == 0 || s.rfind("../", 0) == 0;
    };
    if (isAbs(specifier))      resolved = specifier;
    else if (isRel(specifier)) resolved = fs::path(baseDir) / specifier;
    else                       resolved = fs::path(rootBaseDir_) / specifier;
    resolved = resolved.lexically_normal();
    std::ifstream f(resolved.string(), std::ios::binary);
    if (!f) return getUndefined();
    std::ostringstream ss; ss << f.rdbuf();
    runScript(ss.str(), resolved.string());
    return getUndefined();
}

bool Host::reportException(const char* whileDoing) {
    bool has = false;
    JsHasException(&has);
    if (!has) return false;
    JsValueRef ex = nullptr;
    JsGetAndClearException(&ex);
    std::string msg = toUtf8(ex);
    std::fprintf(stderr, "[jsc] while %s: %s\n",
                 whileDoing ? whileDoing : "<unspecified>",
                 msg.c_str());
    return true;
}

// ============================================================================
// Static helpers
// ============================================================================
std::string Host::toUtf8(JsValueRef v) {
    if (!v) return {};
    JsValueRef sv = nullptr;
    if (JsConvertValueToString(v, &sv) != JsNoError || !sv) return {};
    size_t len = 0;
    JsCopyString(sv, nullptr, 0, &len);
    std::string out(len, '\0');
    if (len > 0) JsCopyString(sv, out.data(), len + 1, &len);
    return out;
}
JsValueRef Host::fromUtf8(std::string_view t) {
    JsValueRef r = nullptr; JsCreateString(t.data(), t.size(), &r); return r;
}
JsValueRef Host::fromBool(bool b)       { JsValueRef r=nullptr; JsBoolToBoolean(b, &r); return r; }
JsValueRef Host::fromInt(int v)         { JsValueRef r=nullptr; JsIntToNumber(v, &r); return r; }
JsValueRef Host::fromUint(uint32_t v)   { JsValueRef r=nullptr; JsDoubleToNumber(static_cast<double>(v), &r); return r; }
JsValueRef Host::fromDouble(double v)   { JsValueRef r=nullptr; JsDoubleToNumber(v, &r); return r; }
JsValueRef Host::getUndefined()         { JsValueRef r=nullptr; JsGetUndefinedValue(&r); return r; }
JsValueRef Host::getNull()              { JsValueRef r=nullptr; JsGetNullValue(&r); return r; }

JsValueRef Host::getProperty(JsValueRef obj, const char* name) {
    JsPropertyIdRef pid; JsCreatePropertyId(name, std::strlen(name), &pid);
    JsValueRef r = nullptr; JsGetProperty(obj, pid, &r);
    return r;
}
bool Host::hasProperty(JsValueRef obj, const char* name) {
    JsPropertyIdRef pid; JsCreatePropertyId(name, std::strlen(name), &pid);
    bool h = false; JsHasProperty(obj, pid, &h);
    return h;
}
void Host::setProperty(JsValueRef obj, const char* name, JsValueRef v) {
    JsPropertyIdRef pid; JsCreatePropertyId(name, std::strlen(name), &pid);
    JsSetProperty(obj, pid, v, false);
}
void Host::setFunction(JsValueRef obj, const char* name, JsNativeFunction fn, void* state) {
    JsValueRef nameV = fromUtf8(name);
    JsValueRef f = nullptr;
    JsCreateNamedFunction(nameV, fn, state, &f);
    setProperty(obj, name, f);
}

JsValueRef Host::globalObject() { JsValueRef r=nullptr; JsGetGlobalObject(&r); return r; }
JsValueRef Host::makeObject()   { JsValueRef r=nullptr; JsCreateObject(&r); return r; }
JsValueRef Host::makeArray(unsigned int len) { JsValueRef r=nullptr; JsCreateArray(len, &r); return r; }

double   Host::getDouble(JsValueRef v, double f) { double d=f; if (v) JsNumberToDouble(v, &d); return d; }
int      Host::getInt(JsValueRef v, int f)       { int i=f; if (v) JsNumberToInt(v, &i); return i; }
uint32_t Host::getUint(JsValueRef v, uint32_t f) { return static_cast<uint32_t>(getDouble(v, static_cast<double>(f))); }
bool     Host::getBool(JsValueRef v, bool f)     { bool b=f; if (v) JsBooleanToBool(v, &b); return b; }

bool Host::isUndefined(JsValueRef v) {
    if (!v) return true; JsValueType t; JsGetValueType(v, &t); return t == JsUndefined;
}
bool Host::isNull(JsValueRef v) {
    if (!v) return false; JsValueType t; JsGetValueType(v, &t); return t == JsNull;
}
bool Host::isObject(JsValueRef v) {
    if (!v) return false; JsValueType t; JsGetValueType(v, &t);
    return t == JsObject || t == JsArray || t == JsFunction || t == JsArrayBuffer || t == JsTypedArray || t == JsDataView || t == JsError;
}
bool Host::isArray(JsValueRef v) {
    if (!v) return false; JsValueType t; JsGetValueType(v, &t); return t == JsArray;
}
bool Host::isArrayBuffer(JsValueRef v) {
    if (!v) return false; JsValueType t; JsGetValueType(v, &t); return t == JsArrayBuffer;
}
bool Host::isTypedArrayOrView(JsValueRef v) {
    if (!v) return false; JsValueType t; JsGetValueType(v, &t);
    return t == JsTypedArray || t == JsDataView;
}

JsValueRef Host::createPromise(JsValueRef& resolveFn, JsValueRef& rejectFn) {
    JsValueRef p=nullptr, r=nullptr, e=nullptr;
    JsCreatePromise(&p, &r, &e);
    resolveFn = r; rejectFn = e;
    return p;
}
JsValueRef Host::resolvedPromise(JsValueRef value) {
    JsValueRef p, r, e;
    JsCreatePromise(&p, &r, &e);
    JsValueRef args[2] = { getUndefined(), value };
    JsCallFunction(r, args, 2, nullptr);
    return p;
}
JsValueRef Host::rejectedPromise(JsValueRef reason) {
    JsValueRef p, r, e;
    JsCreatePromise(&p, &r, &e);
    JsValueRef args[2] = { getUndefined(), reason };
    JsCallFunction(e, args, 2, nullptr);
    return p;
}

} // namespace cx
