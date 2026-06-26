#include "chakra_host.h"

#include <v8.h>
#include <libplatform/libplatform.h>

#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <unordered_map>

namespace fs = std::filesystem;
using namespace v8;

// Forward declarations into chakra_compat.cpp's internal helpers.
namespace cc {
    void         setIsolate(Isolate* iso);
    Isolate*     isolate();
    void         setContext(Local<Context> ctx);
    Local<Context> context();
    JsValueRef   wrap(Local<Value> v);
    Local<Value> raw(JsValueRef r);
    void         setPendingException(Local<Value> ex);
    void         clearPendingException();
}

namespace cx {

std::unique_ptr<Platform> Host::s_platform;
bool                      Host::s_initialized = false;

namespace {
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
    bool isAbs(const std::string& s) {
        return !s.empty() && (s[0] == '/' || s[0] == '\\' ||
                              (s.size() >= 2 && s[1] == ':'));
    }
    bool isRel(const std::string& s) {
        return s.rfind("./", 0) == 0 || s.rfind("../", 0) == 0;
    }

    Host* g_currentHost = nullptr;

    // Module cache: absolute path -> compiled module
    std::unordered_map<std::string, Global<Module>>& moduleCache() {
        static std::unordered_map<std::string, Global<Module>> c;
        return c;
    }
    std::unordered_map<int, std::string>& moduleIdToPath() {
        static std::unordered_map<int, std::string> m;
        return m;
    }

    // Compile a module from source. Records cache by absolute path.
    MaybeLocal<Module> compileModule(Isolate* iso, Local<Context> ctx,
                                     const std::string& absPath,
                                     const std::string& source) {
        Local<String> src = String::NewFromUtf8(iso, source.data(),
                                                NewStringType::kNormal,
                                                (int)source.size()).ToLocalChecked();
        Local<String> name = String::NewFromUtf8(iso, absPath.c_str(),
                                                 NewStringType::kNormal,
                                                 (int)absPath.size()).ToLocalChecked();
        ScriptOrigin origin(iso, name,
                            /*line*/0, /*col*/0, /*shareable*/false,
                            /*scriptId*/-1, /*sourceMapUrl*/Local<Value>(),
                            /*opaque*/false, /*wasm*/false, /*module*/true);
        ScriptCompiler::Source ssrc(src, origin);
        Local<Module> mod;
        if (!ScriptCompiler::CompileModule(iso, &ssrc).ToLocal(&mod)) {
            return MaybeLocal<Module>();
        }
        moduleCache()[absPath].Reset(iso, mod);
        moduleIdToPath()[mod->GetIdentityHash()] = absPath;
        return mod;
    }

    // Resolve a referrer + specifier into an absolute path.
    std::string resolveSpec(const std::string& spec, const std::string& referrerPath,
                            const std::string& rootDir) {
        if (isAbs(spec)) return fs::path(spec).lexically_normal().string();
        if (isRel(spec)) {
            fs::path base = referrerPath.empty() ? fs::path(rootDir) : fs::path(referrerPath).parent_path();
            return (base / spec).lexically_normal().string();
        }
        return (fs::path(rootDir) / spec).lexically_normal().string();
    }

    MaybeLocal<Module> moduleResolveCallback(Local<Context> ctx,
                                             Local<String> specifier,
                                             Local<FixedArray> /*importAssertions*/,
                                             Local<Module> referrer) {
        Isolate* iso = ctx->GetIsolate();
        EscapableHandleScope hs(iso);
        String::Utf8Value specUtf8(iso, specifier);
        std::string spec(*specUtf8, specUtf8.length());

        std::string rootDir = g_currentHost ? g_currentHost->rootBaseDir() : "";
        std::string referrerPath;
        auto& id2p = moduleIdToPath();
        auto it = id2p.find(referrer->GetIdentityHash());
        if (it != id2p.end()) referrerPath = it->second;

        if (isWasmSpec(spec) && !isAbs(spec) && !isRel(spec)) {
            iso->ThrowException(String::NewFromUtf8(iso,
                ("WASM-required package: " + spec).c_str(),
                NewStringType::kNormal).ToLocalChecked());
            Local<Object> g = ctx->Global();
            g->Set(ctx,
                   String::NewFromUtf8(iso, "__wasmTriggered", NewStringType::kNormal).ToLocalChecked(),
                   String::NewFromUtf8(iso, "true", NewStringType::kNormal).ToLocalChecked()).FromMaybe(false);
            return MaybeLocal<Module>();
        }

        std::string absPath = resolveSpec(spec, referrerPath, rootDir);

        auto cit = moduleCache().find(absPath);
        if (cit != moduleCache().end()) {
            return hs.Escape(cit->second.Get(iso));
        }
        std::ifstream f(absPath, std::ios::binary);
        if (!f) {
            iso->ThrowException(String::NewFromUtf8(iso,
                ("could not load module '" + spec + "'").c_str(),
                NewStringType::kNormal).ToLocalChecked());
            return MaybeLocal<Module>();
        }
        std::ostringstream ss; ss << f.rdbuf();
        Local<Module> m;
        if (!compileModule(iso, ctx, absPath, ss.str()).ToLocal(&m)) {
            return MaybeLocal<Module>();
        }
        return hs.Escape(m);
    }

    void promiseRejectCallback(PromiseRejectMessage msg) {
        // Mostly informational — we just route to stderr.
        if (msg.GetEvent() != kPromiseRejectWithNoHandler) return;
        Isolate* iso = Isolate::GetCurrent();
        HandleScope hs(iso);
        Local<Value> v = msg.GetValue();
        String::Utf8Value u(iso, v);
        std::fprintf(stderr, "[v8] unhandled promise rejection: %.*s\n",
                     u.length(), *u ? *u : "(no message)");
    }
}

Host::Host() = default;
Host::~Host() { shutdown(); }

bool Host::initialize() {
    if (!s_initialized) {
        // JIT is enabled (Sparkplug baseline + TurboFan). The crash that
        // previously forced --jitless was NOT a V8 JIT bug: the host failed to
        // keep the isolate entered on the executing thread (see the persistent
        // isolate_->Enter() below), so JIT code crashed accessing thread-local
        // isolate state. With the isolate kept entered, JIT runs correctly.
        const char* flags = "--no-wasm-async-compilation --no-expose-wasm";
        V8::SetFlagsFromString(flags, (int)strlen(flags));
        s_platform = platform::NewDefaultPlatform();
        V8::InitializePlatform(s_platform.get());
        V8::Initialize();
        s_initialized = true;
    }

    allocator_ = ArrayBuffer::Allocator::NewDefaultAllocator();
    Isolate::CreateParams params;
    params.array_buffer_allocator = allocator_;
    isolate_ = Isolate::New(params);
    if (!isolate_) { std::fprintf(stderr, "[v8] Isolate::New failed\n"); return false; }

    isolate_->SetCaptureStackTraceForUncaughtExceptions(true, 20, StackTrace::kDetailed);
    isolate_->SetPromiseRejectCallback(&promiseRejectCallback);
    isolate_->SetHostImportModuleDynamicallyCallback(nullptr);  // handled by __import in JS shim

    cc::setIsolate(isolate_);

    // Enter the isolate PERSISTENTLY (not just inside this scope) and keep it
    // entered for the host's lifetime — mirroring how the context below is kept
    // entered. JIT-compiled JS (Sparkplug/TurboFan) accesses thread-local
    // isolate state (e.g. main_thread_local_heap) and requires the isolate to be
    // entered on the executing thread; the interpreter tolerates a non-entered
    // isolate but JIT code crashes (access violation) without this. The
    // render-loop path runs JS via JsCallFunction, which does not open its own
    // Isolate::Scope, so the isolate must already be entered here. This matches
    // JsRuntimeHost, which keeps an Isolate::Scope alive for the whole run.
    isolate_->Enter();
    {
        HandleScope hs(isolate_);
        Local<Context> ctx = Context::New(isolate_);
        ctx->Enter();
        contextGlobal_ = new Global<Context>(isolate_, ctx);
        contextHandle_ = contextGlobal_;
        cc::setContext(ctx);
    }

    g_currentHost = this;
    return true;
}

void Host::shutdown() {
    if (isolate_) {
        pumpMicrotasks();
        {
            HandleScope hs(isolate_);
            if (contextGlobal_) {
                Local<Context> ctx = contextGlobal_->Get(isolate_);
                ctx->Exit();
            }
        }
        if (contextGlobal_) { delete contextGlobal_; contextGlobal_ = nullptr; }
        contextHandle_ = nullptr;
        isolate_->Exit();   // balance the persistent Enter() from initialize()
        isolate_->Dispose();
        isolate_ = nullptr;
    }
    if (allocator_) { delete allocator_; allocator_ = nullptr; }
    cc::setIsolate(nullptr);
    if (g_currentHost == this) g_currentHost = nullptr;
}

bool Host::reportException(const char* whileDoing) {
    if (!isolate_) return false;
    Isolate::Scope is(isolate_);
    HandleScope hs(isolate_);
    if (!cc::context().IsEmpty()) {
        // Try-catch already captured? Otherwise nothing to do.
    }
    return false;
}

bool Host::runScript(std::string_view source, const std::string& sourceUrl) {
    if (!isolate_) return false;
    Isolate::Scope is(isolate_);
    HandleScope hs(isolate_);
    Local<Context> ctx = cc::context();
    Context::Scope cs(ctx);
    TryCatch tc(isolate_);

    Local<String> src = String::NewFromUtf8(isolate_, source.data(),
        NewStringType::kNormal, (int)source.size()).ToLocalChecked();
    Local<String> origin = String::NewFromUtf8(isolate_, sourceUrl.c_str(),
        NewStringType::kNormal, (int)sourceUrl.size()).ToLocalChecked();
    ScriptOrigin so(isolate_, origin);
    Local<Script> compiled;
    if (!Script::Compile(ctx, src, &so).ToLocal(&compiled)) {
        if (tc.HasCaught()) {
            String::Utf8Value m(isolate_, tc.Exception());
            std::fprintf(stderr, "[jserr] %s: %.*s\n", sourceUrl.c_str(),
                         m.length(), *m ? *m : "(no message)");
        }
        return false;
    }
    Local<Value> r;
    if (!compiled->Run(ctx).ToLocal(&r)) {
        if (tc.HasCaught()) {
            String::Utf8Value m(isolate_, tc.Exception());
            std::fprintf(stderr, "[jserr] %s: %.*s\n", sourceUrl.c_str(),
                         m.length(), *m ? *m : "(no message)");
        }
        return false;
    }
    return true;
}

bool Host::runModule(const std::string& entryPath) {
    if (!isolate_) return false;
    fs::path p(entryPath);
    rootBaseDir_ = p.parent_path().string();

    std::ifstream f(entryPath, std::ios::binary);
    if (!f) {
        std::fprintf(stderr, "[v8] cannot open module: %s\n", entryPath.c_str());
        return false;
    }
    std::ostringstream ss; ss << f.rdbuf();
    std::string source = ss.str();

    Isolate::Scope is(isolate_);
    HandleScope hs(isolate_);
    Local<Context> ctx = cc::context();
    Context::Scope cs(ctx);
    TryCatch tc(isolate_);

    Local<Module> mod;
    if (!compileModule(isolate_, ctx,
                       fs::path(entryPath).lexically_normal().string(),
                       source).ToLocal(&mod)) {
        if (tc.HasCaught()) {
            String::Utf8Value m(isolate_, tc.Exception());
            std::fprintf(stderr, "[jserr] compile %s: %.*s\n",
                         entryPath.c_str(), m.length(), *m ? *m : "(no message)");
        }
        return false;
    }
    Maybe<bool> inst = mod->InstantiateModule(ctx, &moduleResolveCallback);
    if (inst.IsNothing() || !inst.FromJust()) {
        if (tc.HasCaught()) {
            String::Utf8Value m(isolate_, tc.Exception());
            std::fprintf(stderr, "[jserr] instantiate %s: %.*s\n",
                         entryPath.c_str(), m.length(), *m ? *m : "(no message)");
        }
        return false;
    }
    Local<Value> r;
    if (!mod->Evaluate(ctx).ToLocal(&r)) {
        if (tc.HasCaught()) {
            String::Utf8Value m(isolate_, tc.Exception());
            std::fprintf(stderr, "[jserr] eval %s: %.*s\n",
                         entryPath.c_str(), m.length(), *m ? *m : "(no message)");
        }
        return false;
    }
    return true;
}

void Host::pumpMicrotasks() {
    if (!isolate_) return;
    Isolate::Scope is(isolate_);
    HandleScope hs(isolate_);
    isolate_->PerformMicrotaskCheckpoint();
}

void Host::enqueueTask(std::function<void()> task) {
    taskQueue_.emplace_back(std::move(task));
}
void Host::runPendingTasks() {
    auto pending = std::move(taskQueue_);
    taskQueue_.clear();
    for (auto& t : pending) { try { t(); } catch (...) {} }
}

JsValueRef Host::importByPath(const std::string& specifier, const std::string& baseDir) {
    if (!isolate_) return cc::wrap(Undefined(isolate_));

    bool bare = !specifier.empty() && specifier[0] != '.' && specifier[0] != '/'
                && !(specifier.size() >= 2 && specifier[1] == ':');
    if (bare && isWasmSpec(specifier)) {
        std::fprintf(stderr,
            "[v8] dynamic import '%s' looks like WASM-required; marking scene as WASM-unsupported\n",
            specifier.c_str());
        Isolate::Scope is(isolate_);
        HandleScope hs(isolate_);
        Local<Context> ctx = cc::context();
        Local<Object> g = ctx->Global();
        g->Set(ctx,
               String::NewFromUtf8(isolate_, "__wasmTriggered", NewStringType::kNormal).ToLocalChecked(),
               String::NewFromUtf8(isolate_, "true", NewStringType::kNormal).ToLocalChecked()).FromMaybe(false);
        return cc::wrap(Undefined(isolate_));
    }

    std::string absPath = resolveSpec(specifier, "", baseDir);

    Isolate::Scope is(isolate_);
    HandleScope hs(isolate_);
    Local<Context> ctx = cc::context();
    Context::Scope cs(ctx);
    TryCatch tc(isolate_);

    Local<Module> mod;
    auto it = moduleCache().find(absPath);
    if (it != moduleCache().end()) {
        mod = it->second.Get(isolate_);
    } else {
        std::ifstream f(absPath, std::ios::binary);
        if (!f) {
            std::fprintf(stderr, "[v8] importByPath: cannot open %s\n", absPath.c_str());
            return cc::wrap(Undefined(isolate_));
        }
        std::ostringstream ss; ss << f.rdbuf();
        if (!compileModule(isolate_, ctx, absPath, ss.str()).ToLocal(&mod)) {
            if (tc.HasCaught()) {
                String::Utf8Value m(isolate_, tc.Exception());
                std::fprintf(stderr, "[jserr] import %s: %.*s\n",
                             absPath.c_str(), m.length(), *m ? *m : "(no message)");
            }
            return cc::wrap(Undefined(isolate_));
        }
    }
    if (mod->GetStatus() == Module::kUninstantiated) {
        Maybe<bool> inst = mod->InstantiateModule(ctx, &moduleResolveCallback);
        if (inst.IsNothing() || !inst.FromJust()) {
            return cc::wrap(Undefined(isolate_));
        }
    }
    if (mod->GetStatus() == Module::kInstantiated) {
        Local<Value> r;
        if (!mod->Evaluate(ctx).ToLocal(&r)) {
            return cc::wrap(Undefined(isolate_));
        }
    }
    pumpMicrotasks();
    Local<Value> ns = mod->GetModuleNamespace();
    return cc::wrap(ns);
}

// ---- Static helpers ----
std::string Host::toUtf8(JsValueRef value) {
    if (!value) return {};
    Isolate* iso = cc::isolate();
    Isolate::Scope is(iso);
    HandleScope hs(iso);
    Local<Value> v = cc::raw(value);
    Local<String> s;
    if (v->IsString()) s = v.As<String>();
    else {
        Local<Context> ctx = cc::context();
        if (!v->ToString(ctx).ToLocal(&s)) return {};
    }
    String::Utf8Value u(iso, s);
    return std::string(*u ? *u : "", u.length());
}
JsValueRef Host::fromUtf8(std::string_view t) {
    Isolate* iso = cc::isolate();
    HandleScope hs(iso);
    return cc::wrap(String::NewFromUtf8(iso, t.data(), NewStringType::kNormal, (int)t.size()).ToLocalChecked());
}
JsValueRef Host::fromBool(bool b)     { HandleScope hs(cc::isolate()); return cc::wrap(Boolean::New(cc::isolate(), b)); }
JsValueRef Host::fromInt(int v)       { HandleScope hs(cc::isolate()); return cc::wrap(Integer::New(cc::isolate(), v)); }
JsValueRef Host::fromUint(uint32_t v) { HandleScope hs(cc::isolate()); return cc::wrap(Integer::NewFromUnsigned(cc::isolate(), v)); }
JsValueRef Host::fromDouble(double v) { HandleScope hs(cc::isolate()); return cc::wrap(Number::New(cc::isolate(), v)); }
JsValueRef Host::getUndefined()       { HandleScope hs(cc::isolate()); return cc::wrap(Undefined(cc::isolate())); }
JsValueRef Host::getNull()            { HandleScope hs(cc::isolate()); return cc::wrap(Null(cc::isolate())); }

JsValueRef Host::getProperty(JsValueRef obj, const char* name) {
    if (!obj) return getUndefined();
    Isolate* iso = cc::isolate();
    HandleScope hs(iso);
    Local<Value> ov = cc::raw(obj);
    if (!ov->IsObject()) return getUndefined();
    Local<Context> ctx = cc::context();
    Local<Value> v;
    Local<String> n = String::NewFromUtf8(iso, name, NewStringType::kNormal).ToLocalChecked();
    if (!ov.As<Object>()->Get(ctx, n).ToLocal(&v)) return getUndefined();
    return cc::wrap(v);
}
bool Host::hasProperty(JsValueRef obj, const char* name) {
    if (!obj) return false;
    Isolate* iso = cc::isolate();
    HandleScope hs(iso);
    Local<Value> ov = cc::raw(obj);
    if (!ov->IsObject()) return false;
    Local<Context> ctx = cc::context();
    Local<String> n = String::NewFromUtf8(iso, name, NewStringType::kNormal).ToLocalChecked();
    return ov.As<Object>()->Has(ctx, n).FromMaybe(false);
}
void Host::setProperty(JsValueRef obj, const char* name, JsValueRef value) {
    if (!obj || !value) return;
    Isolate* iso = cc::isolate();
    HandleScope hs(iso);
    Local<Value> ov = cc::raw(obj);
    if (!ov->IsObject()) return;
    Local<Context> ctx = cc::context();
    Local<String> n = String::NewFromUtf8(iso, name, NewStringType::kNormal).ToLocalChecked();
    ov.As<Object>()->Set(ctx, n, cc::raw(value)).FromMaybe(false);
}
void Host::setFunction(JsValueRef obj, const char* name, JsNativeFunction fn, void* state) {
    if (!obj) return;
    JsValueRef nameVal = fromUtf8(name);
    JsValueRef func = nullptr;
    JsCreateNamedFunction(nameVal, fn, state, &func);
    if (func) {
        setProperty(obj, name, func);
        JsRelease(func, nullptr);
    }
    JsRelease(nameVal, nullptr);
}

JsValueRef Host::globalObject() {
    Isolate* iso = cc::isolate();
    HandleScope hs(iso);
    return cc::wrap(cc::context()->Global());
}
JsValueRef Host::makeObject() {
    HandleScope hs(cc::isolate());
    return cc::wrap(Object::New(cc::isolate()));
}
JsValueRef Host::makeArray(unsigned int length) {
    HandleScope hs(cc::isolate());
    return cc::wrap(Array::New(cc::isolate(), (int)length));
}

double Host::getDouble(JsValueRef v, double fallback) {
    if (!v) return fallback;
    Isolate* iso = cc::isolate();
    HandleScope hs(iso);
    Local<Context> ctx = cc::context();
    double d = fallback;
    cc::raw(v)->NumberValue(ctx).To(&d);
    return d;
}
int Host::getInt(JsValueRef v, int fallback) {
    if (!v) return fallback;
    Isolate* iso = cc::isolate();
    HandleScope hs(iso);
    Local<Context> ctx = cc::context();
    int32_t i = fallback;
    cc::raw(v)->Int32Value(ctx).To(&i);
    return i;
}
uint32_t Host::getUint(JsValueRef v, uint32_t fallback) { return (uint32_t)getInt(v, (int)fallback); }
bool Host::getBool(JsValueRef v, bool fallback) {
    if (!v) return fallback;
    Isolate* iso = cc::isolate();
    HandleScope hs(iso);
    return cc::raw(v)->BooleanValue(iso);
}
bool Host::isUndefined(JsValueRef v) {
    if (!v) return true;
    HandleScope hs(cc::isolate());
    return cc::raw(v)->IsUndefined();
}
bool Host::isNull(JsValueRef v) {
    if (!v) return false;
    HandleScope hs(cc::isolate());
    return cc::raw(v)->IsNull();
}
bool Host::isObject(JsValueRef v) {
    if (!v) return false;
    HandleScope hs(cc::isolate());
    return cc::raw(v)->IsObject();
}
bool Host::isArray(JsValueRef v) {
    if (!v) return false;
    HandleScope hs(cc::isolate());
    return cc::raw(v)->IsArray();
}
bool Host::isArrayBuffer(JsValueRef v) {
    if (!v) return false;
    HandleScope hs(cc::isolate());
    return cc::raw(v)->IsArrayBuffer();
}
bool Host::isTypedArrayOrView(JsValueRef v) {
    if (!v) return false;
    HandleScope hs(cc::isolate());
    Local<Value> x = cc::raw(v);
    return x->IsTypedArray() || x->IsDataView();
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
