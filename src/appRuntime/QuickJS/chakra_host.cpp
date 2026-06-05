#include "chakra_host.h"

#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <unordered_map>

namespace fs = std::filesystem;

namespace cx {

namespace {
    // Set of "WASM-required" package substrings — same list the Chakra host uses.
    // When seen as a bare specifier, we flag the scene as WASM-unsupported so the
    // main loop can exit cleanly with kExitWasmUnsupported.
    bool isWasmSpec(const std::string& spec) {
        static const char* kPkgs[] = {
            "@babylonjs/havok", "havok", "ammo", "draco", "basis",
            "@webgpu/compute", "recast-detour", "@recast-navigation",
            "manifold-3d", "manifold",
        };
        for (auto* p : kPkgs) {
            if (spec.find(p) != std::string::npos) return true;
        }
        return false;
    }

    bool isAbsolutePath(const std::string& s) {
        return !s.empty() && (s[0] == '/' || s[0] == '\\' ||
                              (s.size() >= 2 && s[1] == ':'));
    }
    bool isRelativePath(const std::string& s) {
        return s.rfind("./", 0) == 0 || s.rfind("../", 0) == 0;
    }

    Host* g_host = nullptr;

    // QuickJS module normalizer — turns a (baseName, name) pair into an absolute
    // path used as the module identifier.
    char* moduleNormalize(JSContext* ctx, const char* baseName, const char* name, void* opaque) {
        (void)opaque;
        std::string spec(name);
        std::string base = baseName ? baseName : "";

        if (isWasmSpec(spec) && !isAbsolutePath(spec) && !isRelativePath(spec)) {
            // Tag scene as WASM-unsupported; return a sentinel so loader can refuse.
            JSValue g = JS_GetGlobalObject(ctx);
            JS_SetPropertyStr(ctx, g, "__wasmTriggered", JS_NewString(ctx, "true"));
            JS_FreeValue(ctx, g);
            // Return a special path; loader will refuse it.
            return js_strdup(ctx, "__wasm_unsupported__");
        }

        fs::path resolved;
        if (isAbsolutePath(spec)) {
            resolved = spec;
        } else if (isRelativePath(spec)) {
            fs::path basePath(base);
            resolved = basePath.parent_path() / spec;
        } else {
            // Bare specifier — treat as relative to the bundle root dir.
            std::string baseDir = g_host ? g_host->rootBaseDir() : "";
            resolved = fs::path(baseDir) / spec;
        }
        resolved = resolved.lexically_normal();
        return js_strdup(ctx, resolved.string().c_str());
    }

    // QuickJS module loader — given a normalized module name, read and compile it.
    JSModuleDef* moduleLoader(JSContext* ctx, const char* moduleName, void* opaque) {
        (void)opaque;
        std::string name(moduleName);
        if (name == "__wasm_unsupported__") {
            JS_ThrowReferenceError(ctx, "module requires WebAssembly (skipped)");
            return nullptr;
        }

        std::ifstream f(name, std::ios::binary);
        if (!f) {
            JS_ThrowReferenceError(ctx, "could not load module '%s'", moduleName);
            return nullptr;
        }
        std::ostringstream ss; ss << f.rdbuf();
        std::string source = ss.str();

        // Compile only — JS_Eval+COMPILE_ONLY returns a JS_TAG_MODULE value.
        JSValue v = JS_Eval(ctx, source.data(), source.size(),
                            moduleName,
                            JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);
        if (JS_IsException(v)) {
            return nullptr;
        }
        JSModuleDef* m = static_cast<JSModuleDef*>(JS_VALUE_GET_PTR(v));
        JS_FreeValue(ctx, v);
        return m;
    }
} // namespace

Host::Host() = default;
Host::~Host() { shutdown(); }

bool Host::initialize() {
    runtime_ = JS_NewRuntime();
    if (!runtime_) { std::fprintf(stderr, "[quickjs] JS_NewRuntime failed\n"); return false; }
    JS_SetMemoryLimit(runtime_, 0);
    JS_SetMaxStackSize(runtime_, 16 * 1024 * 1024);
    JS_SetGCThreshold(runtime_, 16 * 1024 * 1024);

    context_ = JS_NewContext(runtime_);
    if (!context_) {
        std::fprintf(stderr, "[quickjs] JS_NewContext failed\n");
        JS_FreeRuntime(runtime_);
        runtime_ = nullptr;
        return false;
    }
    cc::setContext(context_);

    g_host = this;
    JS_SetModuleLoaderFunc(runtime_, &moduleNormalize, &moduleLoader, nullptr);
    return true;
}

void Host::shutdown() {
    if (context_) {
        pumpMicrotasks();
        JS_FreeContext(context_);
        context_ = nullptr;
    }
    if (runtime_) {
        JS_FreeRuntime(runtime_);
        runtime_ = JS_INVALID_RUNTIME_HANDLE;
    }
    cc::setContext(nullptr);
    if (g_host == this) g_host = nullptr;
}

bool Host::reportException(const char* whileDoing) {
    if (!context_) return false;
    if (!JS_HasException(context_)) return false;
    JSValue ex = JS_GetException(context_);
    const char* msg = JS_ToCString(context_, ex);
    std::fprintf(stderr, "[jserr] while %s: %s\n",
                 whileDoing ? whileDoing : "<unspecified>",
                 msg ? msg : "<no message>");
    if (msg) JS_FreeCString(context_, msg);
    JSValue stk = JS_GetPropertyStr(context_, ex, "stack");
    if (!JS_IsUndefined(stk) && !JS_IsException(stk)) {
        const char* s = JS_ToCString(context_, stk);
        if (s) {
            std::fprintf(stderr, "[jserr] stack: %s\n", s);
            JS_FreeCString(context_, s);
        }
    }
    JS_FreeValue(context_, stk);
    JS_FreeValue(context_, ex);
    return true;
}

bool Host::runScript(std::string_view source, const std::string& sourceUrl) {
    if (!context_) return false;
    JSValue r = JS_Eval(context_, source.data(), source.size(),
                        sourceUrl.c_str(), JS_EVAL_TYPE_GLOBAL);
    if (JS_IsException(r)) {
        reportException(sourceUrl.c_str());
        JS_FreeValue(context_, r);
        return false;
    }
    JS_FreeValue(context_, r);
    return true;
}

bool Host::runModule(const std::string& entryPath) {
    if (!context_) return false;
    fs::path p(entryPath);
    rootBaseDir_ = p.parent_path().string();

    std::ifstream f(entryPath, std::ios::binary);
    if (!f) {
        std::fprintf(stderr, "[quickjs] cannot open module: %s\n", entryPath.c_str());
        return false;
    }
    std::ostringstream ss; ss << f.rdbuf();
    std::string source = ss.str();

    JSValue r = JS_Eval(context_, source.data(), source.size(),
                        entryPath.c_str(),
                        JS_EVAL_TYPE_MODULE);
    if (JS_IsException(r)) {
        reportException(entryPath.c_str());
        JS_FreeValue(context_, r);
        return false;
    }
    JS_FreeValue(context_, r);
    return true;
}

void Host::pumpMicrotasks() {
    if (!runtime_) return;
    JSContext* cctx = nullptr;
    int n = 0;
    while ((n = JS_ExecutePendingJob(runtime_, &cctx)) > 0) { /* loop */ }
    if (n < 0) reportException("microtask");
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
    if (!context_) return cc::wrap(JS_UNDEFINED);

    // WASM-required detection mirrors handleFetchImported.
    bool bare = !specifier.empty() && specifier[0] != '.' && specifier[0] != '/'
                && !(specifier.size() >= 2 && specifier[1] == ':');
    if (bare && isWasmSpec(specifier)) {
        std::fprintf(stderr,
                     "[quickjs] dynamic import '%s' looks like WASM-required; marking scene as WASM-unsupported\n",
                     specifier.c_str());
        JSValue g = JS_GetGlobalObject(context_);
        JS_SetPropertyStr(context_, g, "__wasmTriggered", JS_NewString(context_, "true"));
        JS_FreeValue(context_, g);
        return cc::wrap(JS_UNDEFINED);
    }

    // Resolve path relative to baseDir (or rootBaseDir_ for bare).
    fs::path resolved;
    if (isAbsolutePath(specifier)) {
        resolved = specifier;
    } else if (isRelativePath(specifier)) {
        resolved = fs::path(baseDir) / specifier;
    } else {
        resolved = fs::path(rootBaseDir_) / specifier;
    }
    resolved = resolved.lexically_normal();
    std::string absPath = resolved.string();

    // Read the source.
    std::ifstream f(absPath, std::ios::binary);
    if (!f) {
        std::fprintf(stderr, "[quickjs] importByPath: cannot open %s\n", absPath.c_str());
        return cc::wrap(JS_UNDEFINED);
    }
    std::ostringstream ss; ss << f.rdbuf();
    std::string source = ss.str();

    // Compile + execute as module.
    JSValue compiled = JS_Eval(context_, source.data(), source.size(),
                               absPath.c_str(),
                               JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);
    if (JS_IsException(compiled)) {
        reportException(absPath.c_str());
        return cc::wrap(JS_UNDEFINED);
    }
    JSModuleDef* m = static_cast<JSModuleDef*>(JS_VALUE_GET_PTR(compiled));
    JSValue evalResult = JS_EvalFunction(context_, compiled);
    if (JS_IsException(evalResult)) {
        reportException("module eval");
        JS_FreeValue(context_, evalResult);
        return cc::wrap(JS_UNDEFINED);
    }
    JS_FreeValue(context_, evalResult);

    // Pump microtasks so the module's top-level promises resolve.
    pumpMicrotasks();

    JSValue ns = JS_GetModuleNamespace(context_, m);
    if (JS_IsException(ns)) {
        reportException("module namespace");
        return cc::wrap(JS_UNDEFINED);
    }
    return cc::wrap(ns);
}

// ---- Static helpers ----
std::string Host::toUtf8(JsValueRef value) {
    if (!value) return {};
    size_t len = 0;
    const char* p = JS_ToCStringLen(cc::ctx(), &len, value->v);
    if (!p) return {};
    std::string s(p, len);
    JS_FreeCString(cc::ctx(), p);
    return s;
}
JsValueRef Host::fromUtf8(std::string_view text) {
    return cc::wrap(JS_NewStringLen(cc::ctx(), text.data(), text.size()));
}
JsValueRef Host::fromBool(bool b)     { return cc::wrap(JS_NewBool(cc::ctx(), b)); }
JsValueRef Host::fromInt(int v)       { return cc::wrap(JS_NewInt32(cc::ctx(), v)); }
JsValueRef Host::fromUint(uint32_t v) { return cc::wrap(JS_NewUint32(cc::ctx(), v)); }
JsValueRef Host::fromDouble(double v) { return cc::wrap(JS_NewFloat64(cc::ctx(), v)); }
JsValueRef Host::getUndefined()       { return cc::wrap(JS_UNDEFINED); }
JsValueRef Host::getNull()            { return cc::wrap(JS_NULL); }

JsValueRef Host::getProperty(JsValueRef obj, const char* name) {
    if (!obj) return cc::wrap(JS_UNDEFINED);
    JSValue v = JS_GetPropertyStr(cc::ctx(), obj->v, name);
    if (JS_IsException(v)) {
        JS_GetException(cc::ctx());
        return cc::wrap(JS_UNDEFINED);
    }
    return cc::wrap(v);
}
bool Host::hasProperty(JsValueRef obj, const char* name) {
    if (!obj) return false;
    JSAtom a = JS_NewAtom(cc::ctx(), name);
    int r = JS_HasProperty(cc::ctx(), obj->v, a);
    JS_FreeAtom(cc::ctx(), a);
    return r > 0;
}
void Host::setProperty(JsValueRef obj, const char* name, JsValueRef value) {
    if (!obj || !value) return;
    JS_SetPropertyStr(cc::ctx(), obj->v, name, JS_DupValue(cc::ctx(), value->v));
}
void Host::setFunction(JsValueRef obj, const char* name, JsNativeFunction fn, void* state) {
    if (!obj) return;
    JsValueRef nameVal = fromUtf8(name);
    JsValueRef func = nullptr;
    JsCreateNamedFunction(nameVal, fn, state, &func);
    if (func) {
        JS_SetPropertyStr(cc::ctx(), obj->v, name, JS_DupValue(cc::ctx(), func->v));
        JsRelease(func, nullptr);
    }
    JsRelease(nameVal, nullptr);
}

JsValueRef Host::globalObject() { return cc::wrap(JS_GetGlobalObject(cc::ctx())); }
JsValueRef Host::makeObject()   { return cc::wrap(JS_NewObject(cc::ctx())); }
JsValueRef Host::makeArray(unsigned int length) {
    JSValue arr = JS_NewArray(cc::ctx());
    if (length > 0) {
        JS_SetPropertyStr(cc::ctx(), arr, "length", JS_NewUint32(cc::ctx(), length));
    }
    return cc::wrap(arr);
}

double   Host::getDouble(JsValueRef v, double fallback) {
    if (!v) return fallback;
    double d = fallback;
    if (JS_ToFloat64(cc::ctx(), &d, v->v) < 0) {
        JS_GetException(cc::ctx());
        return fallback;
    }
    return d;
}
int      Host::getInt(JsValueRef v, int fallback) {
    if (!v) return fallback;
    int32_t i = fallback;
    if (JS_ToInt32(cc::ctx(), &i, v->v) < 0) {
        JS_GetException(cc::ctx());
        return fallback;
    }
    return i;
}
uint32_t Host::getUint(JsValueRef v, uint32_t fallback) {
    return (uint32_t)getInt(v, (int)fallback);
}
bool     Host::getBool(JsValueRef v, bool fallback) {
    if (!v) return fallback;
    int b = JS_ToBool(cc::ctx(), v->v);
    return b < 0 ? fallback : (b > 0);
}
bool Host::isUndefined(JsValueRef v) {
    if (!v) return true;
    return JS_IsUndefined(v->v);
}
bool Host::isNull(JsValueRef v) {
    if (!v) return false;
    return JS_IsNull(v->v);
}
bool Host::isObject(JsValueRef v) {
    if (!v) return false;
    return JS_IsObject(v->v);
}
bool Host::isArray(JsValueRef v) {
    if (!v) return false;
    return JS_IsArray(v->v);
}
bool Host::isArrayBuffer(JsValueRef v) {
    if (!v) return false;
    return JS_IsArrayBuffer(v->v);
}
bool Host::isTypedArrayOrView(JsValueRef v) {
    if (!v) return false;
    if (JS_GetTypedArrayType(v->v) >= 0) return true;
    JSValue buf = JS_GetPropertyStr(cc::ctx(), v->v, "buffer");
    bool isDV = !JS_IsUndefined(buf) && !JS_IsException(buf) && JS_IsArrayBuffer(buf);
    JS_FreeValue(cc::ctx(), buf);
    return isDV;
}

JsValueRef Host::createPromise(JsValueRef& resolveFn, JsValueRef& rejectFn) {
    JsValueRef p = nullptr;
    JsCreatePromise(&p, &resolveFn, &rejectFn);
    return p;
}
JsValueRef Host::resolvedPromise(JsValueRef value) {
    JsValueRef p = nullptr, resolve = nullptr, reject = nullptr;
    JsCreatePromise(&p, &resolve, &reject);
    JsValueRef args[2] = { getUndefined(), value ? value : getUndefined() };
    JsValueRef r = nullptr;
    JsCallFunction(resolve, args, 2, &r);
    if (r)        JsRelease(r, nullptr);
    if (args[0])  JsRelease(args[0], nullptr);
    if (resolve)  JsRelease(resolve, nullptr);
    if (reject)   JsRelease(reject, nullptr);
    return p;
}
JsValueRef Host::rejectedPromise(JsValueRef reason) {
    JsValueRef p = nullptr, resolve = nullptr, reject = nullptr;
    JsCreatePromise(&p, &resolve, &reject);
    JsValueRef args[2] = { getUndefined(), reason ? reason : getUndefined() };
    JsValueRef r = nullptr;
    JsCallFunction(reject, args, 2, &r);
    if (r)        JsRelease(r, nullptr);
    if (args[0])  JsRelease(args[0], nullptr);
    if (resolve)  JsRelease(resolve, nullptr);
    if (reject)   JsRelease(reject, nullptr);
    return p;
}

} // namespace cx
