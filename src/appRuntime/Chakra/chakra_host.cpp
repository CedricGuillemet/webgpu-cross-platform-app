#include "chakra_host.h"

#include "fs_loader.h"

#include <cstdio>
#include <cstring>
#include <filesystem>
#include <iostream>
#include <string>
#include <utility>

namespace fs = std::filesystem;

namespace cx {

namespace {
inline void check(JsErrorCode err, const char* what) {
    if (err != JsNoError) {
        std::fprintf(stderr, "[chakra] error %d while %s\n", static_cast<int>(err), what);
    }
}

std::string normalizePath(const std::string& p) {
    std::error_code ec;
    auto canon = fs::weakly_canonical(fs::path(p), ec);
    if (ec) {
        return fs::path(p).lexically_normal().string();
    }
    return canon.string();
}

// Bound state: a Host* pointer carried as the callback state for module callbacks
// is set during initialize via JsSetModuleHostInfo.
Host* g_currentHost = nullptr;
} // namespace

Host::Host() {}
Host::~Host() { shutdown(); }

bool Host::initialize() {
    g_currentHost = this;
    if (JsCreateRuntime(JsRuntimeAttributeAllowScriptInterrupt, nullptr, &runtime_) != JsNoError) {
        std::fprintf(stderr, "JsCreateRuntime failed\n");
        return false;
    }
    if (JsCreateContext(runtime_, &context_) != JsNoError) {
        std::fprintf(stderr, "JsCreateContext failed\n");
        return false;
    }
    if (JsSetCurrentContext(context_) != JsNoError) {
        std::fprintf(stderr, "JsSetCurrentContext failed\n");
        return false;
    }

    JsSetPromiseContinuationCallback(&Host::promiseContinuationCallback, this);
    return true;
}

void Host::shutdown() {
    if (context_ != JS_INVALID_REFERENCE) {
        JsSetCurrentContext(JS_INVALID_REFERENCE);
        context_ = JS_INVALID_REFERENCE;
    }
    if (runtime_ != JS_INVALID_RUNTIME_HANDLE) {
        JsDisposeRuntime(runtime_);
        runtime_ = JS_INVALID_RUNTIME_HANDLE;
    }
    g_currentHost = nullptr;
}

void CHAKRA_CALLBACK Host::promiseContinuationCallback(JsValueRef task, void* callbackState) {
    auto* host = static_cast<Host*>(callbackState);
    JsAddRef(task, nullptr);
    host->promiseTasks_.push_back(task);
}

void Host::pumpMicrotasks() {
    // Drain repeatedly because microtasks may queue more microtasks.
    int safety = 0;
    while (!promiseTasks_.empty() && safety++ < 1000) {
        auto tasks = std::move(promiseTasks_);
        promiseTasks_.clear();
        for (JsValueRef t : tasks) {
            JsValueRef result = nullptr;
            JsValueRef undef = getUndefined();
            if (JsCallFunction(t, &undef, 1, &result) != JsNoError) {
                reportException("running promise microtask");
            }
            JsRelease(t, nullptr);
        }
    }
}

void Host::enqueueTask(std::function<void()> task) {
    taskQueue_.push_back(std::move(task));
}

void Host::runPendingTasks() {
    auto tasks = std::move(taskQueue_);
    taskQueue_.clear();
    for (auto& t : tasks) t();
}

JsErrorCode CHAKRA_CALLBACK Host::fetchImportedModuleCb(JsModuleRecord referencingModule, JsValueRef specifier, JsModuleRecord* dependentModuleRecord) {
    if (!g_currentHost) {
        *dependentModuleRecord = nullptr;
        return JsErrorInvalidArgument;
    }
    return g_currentHost->handleFetchImported(referencingModule, specifier, dependentModuleRecord);
}

JsErrorCode CHAKRA_CALLBACK Host::fetchImportedModuleFromScriptCb(JsSourceContext, JsValueRef specifier, JsModuleRecord* dependentModuleRecord) {
    // Root-script dynamic import — resolve relative to root dir.
    if (!g_currentHost) {
        *dependentModuleRecord = nullptr;
        return JsErrorInvalidArgument;
    }
    return g_currentHost->handleFetchImported(nullptr, specifier, dependentModuleRecord);
}

JsErrorCode CHAKRA_CALLBACK Host::notifyModuleReadyCb(JsModuleRecord referencingModule, JsValueRef exceptionVar) {
    if (exceptionVar) {
        // Try to surface the error immediately.
        if (g_currentHost) {
            std::string msg = "(no message)";
            if (exceptionVar) {
                JsValueRef str = nullptr;
                if (JsConvertValueToString(exceptionVar, &str) == JsNoError) {
                    msg = Host::toUtf8(str);
                }
            }
            std::fprintf(stderr, "[chakra] module ready callback signalled exception: %s\n", msg.c_str());
        }
    }
    return JsNoError;
}

JsModuleRecord Host::createModuleRecord(JsModuleRecord parent, const std::string& specifier, const std::string& absolutePath) {
    JsModuleRecord rec = nullptr;
    JsValueRef specStr = fromUtf8(specifier);
    check(JsInitializeModuleRecord(parent, specStr, &rec), "JsInitializeModuleRecord");
    moduleByPath_[absolutePath] = rec;
    moduleDirByRecord_[rec] = fs::path(absolutePath).parent_path().string();
    modulePathByRecord_[rec] = absolutePath;

    // Set source URL for stack traces.
    JsValueRef urlStr = fromUtf8(absolutePath);
    JsSetModuleHostInfo(rec, JsModuleHostInfo_Url, urlStr);
    return rec;
}

bool Host::parseAndStartModule(JsModuleRecord rec, const std::string& absolutePath) {
    std::string source;
    if (!fs_loader::readTextFile(absolutePath, source)) {
        std::fprintf(stderr, "[chakra] failed to read module file: %s\n", absolutePath.c_str());
        return false;
    }
    JsValueRef parseException = nullptr;
    JsErrorCode pe = JsParseModuleSource(
        rec, nextSourceContext_++,
        reinterpret_cast<BYTE*>(const_cast<char*>(source.data())),
        static_cast<unsigned int>(source.size()),
        JsParseModuleSourceFlags_DataIsUTF8,
        &parseException);
    if (pe != JsNoError) {
        std::fprintf(stderr, "[chakra] JsParseModuleSource(%s) returned %d\n", absolutePath.c_str(), static_cast<int>(pe));
    }
    if (parseException) {
        std::string msg = toUtf8(parseException);
        std::string lineStr, colStr;
        if (JsValueRef ln = getProperty(parseException, "line")) lineStr = toUtf8(ln);
        if (JsValueRef cn = getProperty(parseException, "column")) colStr = toUtf8(cn);
        std::string source = toUtf8(getProperty(parseException, "source"));
        std::fprintf(stderr, "[chakra] parse error in %s at %s:%s: %s\n  source:%s\n",
                     absolutePath.c_str(), lineStr.c_str(), colStr.c_str(), msg.c_str(), source.c_str());
        return false;
    }
    return true;
}

JsErrorCode Host::handleFetchImported(JsModuleRecord referencingModule, JsValueRef specifier, JsModuleRecord* dependentModuleRecord) {
    std::string spec = toUtf8(specifier);

    // Bare specifiers (no leading ./, ../, /, or drive letter) that map to
    // known WASM-required packages are flagged so the host loop can skip the
    // scene rather than crash on a missing module.
    bool isBare = !spec.empty() && spec[0] != '.' && spec[0] != '/' && !(spec.size() >= 2 && spec[1] == ':');
    if (isBare) {
        static const char* kWasmPackages[] = {
            "@babylonjs/havok",
            "havok",
            "ammo",
            "draco",
            "basis",
            "@webgpu/compute",
            "recast-detour",
            "@recast-navigation",
            "manifold-3d",
            "manifold",
        };
        for (auto* p : kWasmPackages) {
            if (spec.find(p) != std::string::npos) {
                std::fprintf(stderr, "[chakra] bare specifier '%s' looks like a WASM-required package; marking scene as WASM-unsupported\n", spec.c_str());
                JsValueRef g = globalObject();
                setProperty(g, "__wasmTriggered", fromUtf8("true"));
                // Return success but with no module — the importer will get undefined.
                *dependentModuleRecord = nullptr;
                return JsErrorInvalidArgument;
            }
        }
        // Other bare specifiers are still treated as relative to root.
    }

    std::string baseDir;
    if (referencingModule && moduleDirByRecord_.count(referencingModule)) {
        baseDir = moduleDirByRecord_[referencingModule];
    } else {
        baseDir = rootBaseDir_;
    }

    fs::path resolved;
    if (spec.rfind("./", 0) == 0 || spec.rfind("../", 0) == 0) {
        resolved = fs::path(baseDir) / spec;
    } else if (spec.size() >= 2 && (spec[1] == ':' || spec[0] == '/' || spec[0] == '\\')) {
        resolved = spec;
    } else {
        // Bare specifier — treat as relative to bundle dir as a fallback.
        resolved = fs::path(rootBaseDir_) / spec;
    }

    std::string absolutePath = normalizePath(resolved.string());

    auto existing = moduleByPath_.find(absolutePath);
    if (existing != moduleByPath_.end()) {
        *dependentModuleRecord = existing->second;
        return JsNoError;
    }

    JsModuleRecord rec = createModuleRecord(referencingModule, spec, absolutePath);
    *dependentModuleRecord = rec;
    // Defer parse to a microtask so we return promptly.
    enqueueTask([this, rec, absolutePath]() {
        parseAndStartModule(rec, absolutePath);
    });
    return JsNoError;
}

JsValueRef Host::importByPath(const std::string& specifier, const std::string& baseDir) {
    // Same WASM detection as handleFetchImported so dynamic __import('foo')
    // calls also flag the scene as WASM-unsupported.
    bool isBare = !specifier.empty() && specifier[0] != '.' && specifier[0] != '/'
                  && !(specifier.size() >= 2 && specifier[1] == ':');
    if (isBare) {
        static const char* kWasmPackages[] = {
            "@babylonjs/havok", "havok", "ammo", "draco", "basis",
            "@webgpu/compute", "recast-detour", "@recast-navigation",
            "manifold-3d", "manifold",
        };
        for (auto* p : kWasmPackages) {
            if (specifier.find(p) != std::string::npos) {
                std::fprintf(stderr, "[chakra] dynamic import '%s' looks like WASM-required; marking scene as WASM-unsupported\n", specifier.c_str());
                JsValueRef g = globalObject();
                setProperty(g, "__wasmTriggered", fromUtf8("true"));
                return getUndefined();
            }
        }
    }

    fs::path resolved;
    if (specifier.rfind("./", 0) == 0 || specifier.rfind("../", 0) == 0) {
        resolved = fs::path(baseDir) / specifier;
    } else if (!specifier.empty() && (specifier[0] == '/' || (specifier.size() >= 2 && specifier[1] == ':'))) {
        resolved = specifier;
    } else {
        resolved = fs::path(rootBaseDir_) / specifier;
    }
    std::string absolutePath = normalizePath(resolved.string());

    JsModuleRecord rec = nullptr;
    auto it = moduleByPath_.find(absolutePath);
    if (it != moduleByPath_.end()) {
        rec = it->second;
    } else {
        rec = createModuleRecord(nullptr, specifier, absolutePath);
        if (!parseAndStartModule(rec, absolutePath)) {
            return getUndefined();
        }
        // Pump pending parse tasks and microtasks so dependencies resolve.
        int safety = 0;
        while ((!taskQueue_.empty() || !promiseTasks_.empty()) && safety++ < 5000) {
            runPendingTasks();
            pumpMicrotasks();
        }
    }

    // Evaluate (no-op if already evaluated).
    JsValueRef result = nullptr;
    JsModuleEvaluation(rec, &result);
    reportException("evaluating dynamically-imported module");

    JsValueRef ns = nullptr;
    if (JsGetModuleNamespace(rec, &ns) != JsNoError || !ns) return getUndefined();
    return ns;
}

bool Host::runModule(const std::string& entryPath) {
    std::string absEntry = normalizePath(entryPath);
    rootBaseDir_ = fs::path(absEntry).parent_path().string();

#if defined(_USE_CHAKRA_SDK)
    // Legacy Chakra (Windows SDK) has no JsInitializeModuleRecord / JsParseModuleSource.
    // Fall back to running the entry as a script; dynamic imports inside
    // the bundle route through the global `__import` shim that main.cpp
    // installs (the bundles are already babel-transformed to call it
    // instead of native ES `import()`).
    std::string source;
    if (!fs_loader::readTextFile(absEntry, source)) {
        std::fprintf(stderr, "[chakra] failed to read entry file: %s\n", absEntry.c_str());
        return false;
    }
    return runScript(source, absEntry);
#else
    JsModuleRecord root = nullptr;
    JsValueRef emptySpec = fromUtf8("");
    check(JsInitializeModuleRecord(nullptr, emptySpec, &root), "init root module");
    moduleByPath_[absEntry] = root;
    moduleDirByRecord_[root] = rootBaseDir_;
    modulePathByRecord_[root] = absEntry;

    // Install callbacks on the root module (they apply to the whole context).
    JsSetModuleHostInfo(root, JsModuleHostInfo_FetchImportedModuleCallback, (void*)&Host::fetchImportedModuleCb);
    JsSetModuleHostInfo(root, JsModuleHostInfo_FetchImportedModuleFromScriptCallback, (void*)&Host::fetchImportedModuleFromScriptCb);
    JsSetModuleHostInfo(root, JsModuleHostInfo_NotifyModuleReadyCallback, (void*)&Host::notifyModuleReadyCb);

    JsValueRef url = fromUtf8(absEntry);
    JsSetModuleHostInfo(root, JsModuleHostInfo_Url, url);

    if (!parseAndStartModule(root, absEntry)) {
        return false;
    }

    // Pump until all imports are parsed.
    int safety = 0;
    while ((!taskQueue_.empty() || !promiseTasks_.empty()) && safety++ < 5000) {
        runPendingTasks();
        pumpMicrotasks();
    }

    JsValueRef result = nullptr;
    JsErrorCode ec = JsModuleEvaluation(root, &result);
    if (ec != JsNoError) {
        std::fprintf(stderr, "[chakra] JsModuleEvaluation returned %d\n", static_cast<int>(ec));
    }
    if (!reportException("evaluating root module")) {
        // Module may schedule async work; that's fine.
    }
    pumpMicrotasks();
    return true;
#endif
}

bool Host::runScript(std::string_view source, const std::string& sourceUrl) {
    JsValueRef result = nullptr;
    JsValueRef srcVal = nullptr;
    JsCreateString(source.data(), source.size(), &srcVal);
    JsValueRef urlVal = fromUtf8(sourceUrl);
    JsErrorCode ec = JsRun(srcVal, nextSourceContext_++, urlVal, JsParseScriptAttributeNone, &result);
    bool hadEx = reportException(("running " + sourceUrl).c_str());
    pumpMicrotasks();
    return ec == JsNoError && !hadEx;
}

bool Host::reportException(const char* whileDoing) {
    bool hasEx = false;
    if (JsHasException(&hasEx) != JsNoError || !hasEx) return false;

    JsValueRef metadata = nullptr;
    if (JsGetAndClearExceptionWithMetadata(&metadata) != JsNoError) {
        std::fprintf(stderr, "[js error] while %s (could not get metadata)\n", whileDoing);
        return true;
    }

    auto get = [](JsValueRef o, const char* n) -> JsValueRef { return Host::getProperty(o, n); };

    JsValueRef exception = get(metadata, "exception");
    JsValueRef url = get(metadata, "url");
    JsValueRef line = get(metadata, "line");
    JsValueRef column = get(metadata, "column");
    JsValueRef source = get(metadata, "source");

    std::string urlS = toUtf8(url);
    std::string srcS = toUtf8(source);
    int lineN = getInt(line);
    int colN = getInt(column);

    std::string msg = toUtf8(exception);
    // Try to also extract the stack property.
    std::string stackS;
    if (exception) {
        JsValueRef stack = get(exception, "stack");
        if (stack) stackS = toUtf8(stack);
    }

    std::fprintf(stderr, "[js error] while %s:\n  %s\n  at %s:%d:%d\n  source: %s\n",
                 whileDoing, msg.c_str(), urlS.c_str(), lineN, colN, srcS.c_str());
    if (!stackS.empty() && stackS != "undefined") {
        std::fprintf(stderr, "  stack:\n%s\n", stackS.c_str());
    }

    // Surface to the JS-visible marker so the host loop knows to bail.
    JsValueRef g = globalObject();
    setProperty(g, "__fatalError", fromUtf8("true"));
    return true;
}

// ---------- conversion helpers ----------

std::string Host::toUtf8(JsValueRef value) {
    if (!value) return {};
    JsValueRef strVal = value;
    JsValueType t;
    JsGetValueType(value, &t);
    if (t != JsString) {
        if (JsConvertValueToString(value, &strVal) != JsNoError) return "<conv-err>";
    }
    size_t len = 0;
    JsCopyString(strVal, nullptr, 0, &len);
    std::string s;
    s.resize(len);
    JsCopyString(strVal, s.data(), len, nullptr);
    return s;
}

JsValueRef Host::fromUtf8(std::string_view text) {
    JsValueRef out = nullptr;
    JsCreateString(text.data(), text.size(), &out);
    return out;
}

JsValueRef Host::fromBool(bool b) { JsValueRef v=nullptr; JsBoolToBoolean(b, &v); return v; }
JsValueRef Host::fromInt(int v) { JsValueRef o=nullptr; JsIntToNumber(v, &o); return o; }
JsValueRef Host::fromUint(uint32_t v) { JsValueRef o=nullptr; JsDoubleToNumber(static_cast<double>(v), &o); return o; }
JsValueRef Host::fromDouble(double v) { JsValueRef o=nullptr; JsDoubleToNumber(v, &o); return o; }

JsValueRef Host::getUndefined() { JsValueRef v=nullptr; JsGetUndefinedValue(&v); return v; }
JsValueRef Host::getNull() { JsValueRef v=nullptr; JsGetNullValue(&v); return v; }

JsValueRef Host::getProperty(JsValueRef obj, const char* name) {
    if (!obj) return nullptr;
    JsPropertyIdRef pid = nullptr;
    if (JsCreatePropertyId(name, std::strlen(name), &pid) != JsNoError) return nullptr;
    JsValueRef v = nullptr;
    JsGetProperty(obj, pid, &v);
    return v;
}

bool Host::hasProperty(JsValueRef obj, const char* name) {
    if (!obj) return false;
    JsPropertyIdRef pid = nullptr;
    if (JsCreatePropertyId(name, std::strlen(name), &pid) != JsNoError) return false;
    bool has = false;
    JsHasProperty(obj, pid, &has);
    return has;
}

void Host::setProperty(JsValueRef obj, const char* name, JsValueRef value) {
    if (!obj || !value) return;
    JsPropertyIdRef pid = nullptr;
    if (JsCreatePropertyId(name, std::strlen(name), &pid) != JsNoError) return;
    JsSetProperty(obj, pid, value, true);
}

void Host::setFunction(JsValueRef obj, const char* name, JsNativeFunction fn, void* state) {
    JsValueRef nameVal = fromUtf8(name);
    JsValueRef func = nullptr;
    if (JsCreateNamedFunction(nameVal, fn, state, &func) != JsNoError) return;
    setProperty(obj, name, func);
}

JsValueRef Host::globalObject() { JsValueRef g=nullptr; JsGetGlobalObject(&g); return g; }
JsValueRef Host::makeObject() { JsValueRef o=nullptr; JsCreateObject(&o); return o; }
JsValueRef Host::makeArray(unsigned int length) { JsValueRef a=nullptr; JsCreateArray(length, &a); return a; }

double Host::getDouble(JsValueRef v, double fallback) {
    if (!v) return fallback;
    JsValueType t; JsGetValueType(v, &t);
    if (t == JsUndefined || t == JsNull) return fallback;
    JsValueRef n=v;
    if (t != JsNumber) { if (JsConvertValueToNumber(v, &n) != JsNoError) return fallback; }
    double d=fallback;
    JsNumberToDouble(n, &d);
    return d;
}
int Host::getInt(JsValueRef v, int fallback) {
    if (!v) return fallback;
    JsValueType t; JsGetValueType(v, &t);
    if (t == JsUndefined || t == JsNull) return fallback;
    JsValueRef n=v;
    if (t != JsNumber) { if (JsConvertValueToNumber(v, &n) != JsNoError) return fallback; }
    int i=fallback;
    JsNumberToInt(n, &i);
    return i;
}
uint32_t Host::getUint(JsValueRef v, uint32_t fallback) {
    return static_cast<uint32_t>(getDouble(v, static_cast<double>(fallback)));
}
bool Host::getBool(JsValueRef v, bool fallback) {
    if (!v) return fallback;
    JsValueType t; JsGetValueType(v, &t);
    if (t == JsUndefined || t == JsNull) return fallback;
    JsValueRef b=v;
    if (t != JsBoolean) { if (JsConvertValueToBoolean(v, &b) != JsNoError) return fallback; }
    bool out=fallback; JsBooleanToBool(b, &out); return out;
}
bool Host::isUndefined(JsValueRef v) {
    if (!v) return true;
    JsValueType t; JsGetValueType(v, &t);
    return t == JsUndefined;
}
bool Host::isNull(JsValueRef v) {
    if (!v) return false;
    JsValueType t; JsGetValueType(v, &t);
    return t == JsNull;
}
bool Host::isObject(JsValueRef v) {
    if (!v) return false;
    JsValueType t; JsGetValueType(v, &t);
    return t == JsObject || t == JsFunction || t == JsArray || t == JsError
        || t == JsArrayBuffer || t == JsTypedArray || t == JsDataView;
}
bool Host::isArray(JsValueRef v) {
    if (!v) return false;
    JsValueType t; JsGetValueType(v, &t);
    return t == JsArray;
}
bool Host::isArrayBuffer(JsValueRef v) {
    if (!v) return false;
    JsValueType t; JsGetValueType(v, &t);
    return t == JsArrayBuffer;
}
bool Host::isTypedArrayOrView(JsValueRef v) {
    if (!v) return false;
    JsValueType t; JsGetValueType(v, &t);
    return t == JsTypedArray || t == JsDataView || t == JsArrayBuffer;
}

JsValueRef Host::createPromise(JsValueRef& resolveFn, JsValueRef& rejectFn) {
    JsValueRef promise = nullptr;
    JsCreatePromise(&promise, &resolveFn, &rejectFn);
    return promise;
}

JsValueRef Host::resolvedPromise(JsValueRef value) {
    JsValueRef resolve=nullptr, reject=nullptr;
    JsValueRef p = createPromise(resolve, reject);
    JsValueRef undef = getUndefined();
    JsValueRef args[2] = { undef, value ? value : undef };
    JsValueRef r = nullptr;
    JsCallFunction(resolve, args, 2, &r);
    return p;
}

JsValueRef Host::rejectedPromise(JsValueRef reason) {
    JsValueRef resolve=nullptr, reject=nullptr;
    JsValueRef p = createPromise(resolve, reject);
    JsValueRef undef = getUndefined();
    JsValueRef args[2] = { undef, reason ? reason : undef };
    JsValueRef r = nullptr;
    JsCallFunction(reject, args, 2, &r);
    return p;
}

} // namespace cx
