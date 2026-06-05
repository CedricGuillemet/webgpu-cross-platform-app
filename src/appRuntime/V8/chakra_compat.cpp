#include "chakra_compat.h"

#include <v8.h>
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

using namespace v8;

// ----------------------------------------------------------------------------
// Globals — single-isolate, single-context model.
// ----------------------------------------------------------------------------
namespace {
    Isolate* g_iso = nullptr;
    Global<Context>* g_ctxGlobal = nullptr;

    // Native function trampoline table.
    struct Trampoline { JsNativeFunction fn; void* state; };
    std::vector<Trampoline>& trampolines() {
        static std::vector<Trampoline> t;
        return t;
    }

    // Convert a Chakra-style typed array enum to the V8 one (used in JsCreateTypedArray).
    // V8 has separate constructor types (Uint8Array, etc.) rather than a single enum.
} // namespace

namespace cc {
    void                 setIsolate(Isolate* iso) { g_iso = iso; }
    Isolate*             isolate() { return g_iso; }
    void                 setContext(Local<Context> c) {
        if (!g_ctxGlobal) g_ctxGlobal = new Global<Context>();
        g_ctxGlobal->Reset(g_iso, c);
    }
    Local<Context>       context() {
        return g_ctxGlobal ? g_ctxGlobal->Get(g_iso) : Local<Context>();
    }

    JsValueRef wrap(Local<Value> v) {
        if (!g_iso) return nullptr;
        auto* o = new JsValueObj{};
        o->v.Reset(g_iso, v);
        o->rc = 1;
        return o;
    }
    Local<Value> raw(JsValueRef r) {
        if (!r || !g_iso) return Undefined(g_iso);
        return r->v.Get(g_iso);
    }
} // namespace cc

// Helper: take a JsValueRef and return a Local within an existing HandleScope.
static inline Local<Value> AsLocal(JsValueRef r) {
    return cc::raw(r);
}
// Helper: create a local string from C string.
static inline Local<String> Str(const char* s, int len = -1) {
    if (len < 0) len = (int)strlen(s);
    return String::NewFromUtf8(g_iso, s, NewStringType::kNormal, len).ToLocalChecked();
}

// ----------------------------------------------------------------------------
// Refcounting
// ----------------------------------------------------------------------------
JsErrorCode JsAddRef(JsValueRef ref, unsigned int* count) {
    if (!ref) return JsErrorInvalidArgument;
    ref->rc++;
    if (count) *count = (unsigned)ref->rc;
    return JsNoError;
}
JsErrorCode JsRelease(JsValueRef ref, unsigned int* count) {
    if (!ref) return JsErrorInvalidArgument;
    ref->rc--;
    if (count) *count = (unsigned)ref->rc;
    if (ref->rc <= 0) {
        ref->v.Reset();
        delete ref;
    }
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Primitives
// ----------------------------------------------------------------------------
JsErrorCode JsGetUndefinedValue(JsValueRef* out) {
    HandleScope hs(g_iso);
    *out = cc::wrap(Undefined(g_iso));
    return JsNoError;
}
JsErrorCode JsGetNullValue(JsValueRef* out) {
    HandleScope hs(g_iso);
    *out = cc::wrap(Null(g_iso));
    return JsNoError;
}
JsErrorCode JsBoolToBoolean(bool b, JsValueRef* out) {
    HandleScope hs(g_iso);
    *out = cc::wrap(Boolean::New(g_iso, b));
    return JsNoError;
}
JsErrorCode JsBooleanToBool(JsValueRef v, bool* out) {
    if (!v) { *out = false; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Value> val = AsLocal(v);
    *out = val->BooleanValue(g_iso);
    return JsNoError;
}
JsErrorCode JsIntToNumber(int v, JsValueRef* out) {
    HandleScope hs(g_iso);
    *out = cc::wrap(Integer::New(g_iso, v));
    return JsNoError;
}
JsErrorCode JsDoubleToNumber(double v, JsValueRef* out) {
    HandleScope hs(g_iso);
    *out = cc::wrap(Number::New(g_iso, v));
    return JsNoError;
}
JsErrorCode JsNumberToInt(JsValueRef v, int* out) {
    if (!v) { *out = 0; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Context> ctx = cc::context();
    int32_t r = 0;
    if (!AsLocal(v)->Int32Value(ctx).To(&r)) { *out = 0; return JsErrorInvalidArgument; }
    *out = r;
    return JsNoError;
}
JsErrorCode JsNumberToDouble(JsValueRef v, double* out) {
    if (!v) { *out = 0; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Context> ctx = cc::context();
    double r = 0;
    if (!AsLocal(v)->NumberValue(ctx).To(&r)) { *out = 0; return JsErrorInvalidArgument; }
    *out = r;
    return JsNoError;
}
JsErrorCode JsConvertValueToBoolean(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    *out = cc::wrap(Boolean::New(g_iso, AsLocal(v)->BooleanValue(g_iso)));
    return JsNoError;
}
JsErrorCode JsConvertValueToNumber(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Context> ctx = cc::context();
    Local<Number> n;
    if (!AsLocal(v)->ToNumber(ctx).ToLocal(&n)) return JsErrorScriptException;
    *out = cc::wrap(n);
    return JsNoError;
}
JsErrorCode JsConvertValueToString(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Context> ctx = cc::context();
    Local<String> s;
    if (!AsLocal(v)->ToString(ctx).ToLocal(&s)) return JsErrorScriptException;
    *out = cc::wrap(s);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Strings
// ----------------------------------------------------------------------------
JsErrorCode JsCreateString(const char* s, size_t len, JsValueRef* out) {
    HandleScope hs(g_iso);
    Local<String> str = String::NewFromUtf8(g_iso, s, NewStringType::kNormal, (int)len).ToLocalChecked();
    *out = cc::wrap(str);
    return JsNoError;
}
JsErrorCode JsCopyString(JsValueRef v, char* buf, size_t bufSize, size_t* outLen) {
    if (!v) { if (outLen) *outLen = 0; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Value> val = AsLocal(v);
    Local<String> s;
    if (val->IsString()) {
        s = val.As<String>();
    } else {
        Local<Context> ctx = cc::context();
        if (!val->ToString(ctx).ToLocal(&s)) {
            if (outLen) *outLen = 0;
            return JsErrorScriptException;
        }
    }
    int byteLen = s->Utf8Length(g_iso);
    if (buf && bufSize > 0) {
        int toWrite = (byteLen < (int)bufSize) ? byteLen : (int)bufSize;
        s->WriteUtf8(g_iso, buf, toWrite, nullptr,
                     String::NO_NULL_TERMINATION | String::REPLACE_INVALID_UTF8);
    }
    if (outLen) *outLen = (size_t)byteLen;
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Type
// ----------------------------------------------------------------------------
JsErrorCode JsGetValueType(JsValueRef v, JsValueType* out) {
    if (!v) { *out = JsUndefined; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Value> x = AsLocal(v);
    if (x->IsUndefined()) { *out = JsUndefined; return JsNoError; }
    if (x->IsNull())      { *out = JsNull;      return JsNoError; }
    if (x->IsBoolean())   { *out = JsBoolean;   return JsNoError; }
    if (x->IsNumber())    { *out = JsNumber;    return JsNoError; }
    if (x->IsString())    { *out = JsString;    return JsNoError; }
    if (x->IsSymbol())    { *out = JsSymbol;    return JsNoError; }
    if (x->IsFunction())  { *out = JsFunction;  return JsNoError; }
    if (x->IsArray())     { *out = JsArray;     return JsNoError; }
    if (x->IsArrayBuffer()) { *out = JsArrayBuffer; return JsNoError; }
    if (x->IsTypedArray()) { *out = JsTypedArray; return JsNoError; }
    if (x->IsDataView())  { *out = JsDataView;  return JsNoError; }
    if (x->IsNativeError()) { *out = JsError;   return JsNoError; }
    *out = JsObject;
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Objects / arrays
// ----------------------------------------------------------------------------
JsErrorCode JsGetGlobalObject(JsValueRef* out) {
    HandleScope hs(g_iso);
    *out = cc::wrap(cc::context()->Global());
    return JsNoError;
}
JsErrorCode JsCreateObject(JsValueRef* out) {
    HandleScope hs(g_iso);
    *out = cc::wrap(Object::New(g_iso));
    return JsNoError;
}
JsErrorCode JsCreateArray(unsigned int len, JsValueRef* out) {
    HandleScope hs(g_iso);
    *out = cc::wrap(Array::New(g_iso, (int)len));
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Array buffers / typed arrays
// ----------------------------------------------------------------------------
JsErrorCode JsCreateArrayBuffer(unsigned int size, JsValueRef* out) {
    HandleScope hs(g_iso);
    Local<ArrayBuffer> ab = ArrayBuffer::New(g_iso, size);
    *out = cc::wrap(ab);
    return JsNoError;
}
JsErrorCode JsCreateExternalArrayBuffer(void* data, unsigned int size,
                                        void (*finalize)(void*), void* state,
                                        JsValueRef* out) {
    HandleScope hs(g_iso);
    // V8 sandbox forbids external backing stores (the bytes must live inside
    // the sandbox heap). Allocate a sandbox-owned buffer, copy the data in,
    // then run the caller's finalize immediately — we no longer need the
    // source memory.
    Local<ArrayBuffer> ab = ArrayBuffer::New(g_iso, size);
    if (data && size > 0) {
        auto store = ab->GetBackingStore();
        std::memcpy(store->Data(), data, size);
    }
    if (finalize) finalize(state);
    *out = cc::wrap(ab);
    return JsNoError;
}
JsErrorCode JsCreateTypedArray(JsTypedArrayType ta, JsValueRef ab,
                               unsigned int byteOffset, unsigned int len,
                               JsValueRef* out) {
    if (!ab) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Value> abVal = AsLocal(ab);
    if (!abVal->IsArrayBuffer()) return JsErrorInvalidArgument;
    Local<ArrayBuffer> buffer = abVal.As<ArrayBuffer>();
    Local<Value> arr;
    switch (ta) {
        case JsArrayTypeInt8:         arr = Int8Array::New(buffer, byteOffset, len); break;
        case JsArrayTypeUint8:        arr = Uint8Array::New(buffer, byteOffset, len); break;
        case JsArrayTypeUint8Clamped: arr = Uint8ClampedArray::New(buffer, byteOffset, len); break;
        case JsArrayTypeInt16:        arr = Int16Array::New(buffer, byteOffset, len); break;
        case JsArrayTypeUint16:       arr = Uint16Array::New(buffer, byteOffset, len); break;
        case JsArrayTypeInt32:        arr = Int32Array::New(buffer, byteOffset, len); break;
        case JsArrayTypeUint32:       arr = Uint32Array::New(buffer, byteOffset, len); break;
        case JsArrayTypeFloat32:      arr = Float32Array::New(buffer, byteOffset, len); break;
        case JsArrayTypeFloat64:      arr = Float64Array::New(buffer, byteOffset, len); break;
        default: arr = Uint8Array::New(buffer, byteOffset, len); break;
    }
    *out = cc::wrap(arr);
    return JsNoError;
}
JsErrorCode JsGetArrayBufferStorage(JsValueRef v, unsigned char** buf,
                                    unsigned int* len) {
    if (!v) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Value> val = AsLocal(v);
    if (!val->IsArrayBuffer()) return JsErrorInvalidArgument;
    Local<ArrayBuffer> ab = val.As<ArrayBuffer>();
    auto store = ab->GetBackingStore();
    if (buf) *buf = static_cast<unsigned char*>(store->Data());
    if (len) *len = (unsigned)store->ByteLength();
    return JsNoError;
}
JsErrorCode JsGetTypedArrayStorage(JsValueRef v, unsigned char** buf,
                                   unsigned int* len, JsTypedArrayType* ta,
                                   int* eltSize) {
    if (!v) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Value> val = AsLocal(v);
    if (!val->IsTypedArray()) return JsErrorInvalidArgument;
    Local<TypedArray> arr = val.As<TypedArray>();
    auto store = arr->Buffer()->GetBackingStore();
    size_t offset = arr->ByteOffset();
    size_t byteLen = arr->ByteLength();
    if (buf) *buf = static_cast<unsigned char*>(store->Data()) + offset;
    if (len) *len = (unsigned)byteLen;
    if (ta) {
        if (val->IsInt8Array())          *ta = JsArrayTypeInt8;
        else if (val->IsUint8Array())    *ta = JsArrayTypeUint8;
        else if (val->IsUint8ClampedArray()) *ta = JsArrayTypeUint8Clamped;
        else if (val->IsInt16Array())    *ta = JsArrayTypeInt16;
        else if (val->IsUint16Array())   *ta = JsArrayTypeUint16;
        else if (val->IsInt32Array())    *ta = JsArrayTypeInt32;
        else if (val->IsUint32Array())   *ta = JsArrayTypeUint32;
        else if (val->IsFloat32Array())  *ta = JsArrayTypeFloat32;
        else if (val->IsFloat64Array())  *ta = JsArrayTypeFloat64;
        else                             *ta = JsArrayTypeUint8;
    }
    if (eltSize) {
        size_t total = byteLen;
        size_t count = arr->Length();
        *eltSize = (count > 0) ? (int)(total / count) : 1;
    }
    return JsNoError;
}
JsErrorCode JsGetDataViewStorage(JsValueRef v, unsigned char** buf,
                                 unsigned int* len) {
    if (!v) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Value> val = AsLocal(v);
    if (!val->IsDataView()) return JsErrorInvalidArgument;
    Local<DataView> dv = val.As<DataView>();
    auto store = dv->Buffer()->GetBackingStore();
    size_t offset = dv->ByteOffset();
    size_t byteLen = dv->ByteLength();
    if (buf) *buf = static_cast<unsigned char*>(store->Data()) + offset;
    if (len) *len = (unsigned)byteLen;
    return JsNoError;
}

// ----------------------------------------------------------------------------
// External objects (opaque ptr + finalizer). Use an Object with an internal
// field, and a Persistent weak callback to run the finalizer.
// ----------------------------------------------------------------------------
namespace {
    struct ExternalHolder {
        void* data;
        void (*finalize)(void*);
        Global<Object> handle;
    };
    void externalWeakCallback(const WeakCallbackInfo<ExternalHolder>& info) {
        auto* h = info.GetParameter();
        if (h) {
            if (h->finalize) h->finalize(h->data);
            h->handle.Reset();
            delete h;
        }
    }
}
JsErrorCode JsCreateExternalObject(void* data, void (*finalize)(void*),
                                   JsValueRef* out) {
    HandleScope hs(g_iso);
    Local<ObjectTemplate> tpl = ObjectTemplate::New(g_iso);
    tpl->SetInternalFieldCount(1);
    Local<Object> obj = tpl->NewInstance(cc::context()).ToLocalChecked();

    auto* holder = new ExternalHolder{data, finalize, Global<Object>()};
    obj->SetInternalField(0, External::New(g_iso, data));
    holder->handle.Reset(g_iso, obj);
    holder->handle.SetWeak(holder, &externalWeakCallback, WeakCallbackType::kParameter);

    *out = cc::wrap(obj);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Properties
// ----------------------------------------------------------------------------
JsErrorCode JsCreatePropertyId(const char* name, size_t len, JsPropertyIdRef* out) {
    // We store the property name as a heap-allocated C string; never freed
    // (property names live for the lifetime of the process; bounded set).
    char* copy = new char[len + 1];
    memcpy(copy, name, len);
    copy[len] = 0;
    *out = copy;
    return JsNoError;
}
JsErrorCode JsGetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef* out) {
    if (!obj) { *out = nullptr; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Value> ov = AsLocal(obj);
    if (!ov->IsObject()) { JsGetUndefinedValue(out); return JsNoError; }
    Local<Object> o = ov.As<Object>();
    Local<Context> ctx = cc::context();
    Local<Value> v;
    if (!o->Get(ctx, Str(pid)).ToLocal(&v)) { JsGetUndefinedValue(out); return JsErrorScriptException; }
    *out = cc::wrap(v);
    return JsNoError;
}
JsErrorCode JsSetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef v, bool /*strict*/) {
    if (!obj || !v) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Value> ov = AsLocal(obj);
    if (!ov->IsObject()) return JsErrorInvalidArgument;
    Local<Object> o = ov.As<Object>();
    Local<Context> ctx = cc::context();
    Maybe<bool> r = o->Set(ctx, Str(pid), AsLocal(v));
    return r.IsJust() && r.FromJust() ? JsNoError : JsErrorScriptException;
}
JsErrorCode JsHasProperty(JsValueRef obj, JsPropertyIdRef pid, bool* has) {
    if (!obj) { *has = false; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Value> ov = AsLocal(obj);
    if (!ov->IsObject()) { *has = false; return JsNoError; }
    Local<Object> o = ov.As<Object>();
    Local<Context> ctx = cc::context();
    Maybe<bool> r = o->Has(ctx, Str(pid));
    *has = r.IsJust() && r.FromJust();
    return JsNoError;
}
JsErrorCode JsGetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef* out) {
    if (!obj || !idx) { *out = nullptr; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Value> ov = AsLocal(obj);
    if (!ov->IsObject()) { JsGetUndefinedValue(out); return JsNoError; }
    Local<Object> o = ov.As<Object>();
    Local<Context> ctx = cc::context();
    uint32_t i = 0;
    AsLocal(idx)->Uint32Value(ctx).To(&i);
    Local<Value> v;
    if (!o->Get(ctx, i).ToLocal(&v)) { JsGetUndefinedValue(out); return JsErrorScriptException; }
    *out = cc::wrap(v);
    return JsNoError;
}
JsErrorCode JsSetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef v) {
    if (!obj || !idx || !v) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Value> ov = AsLocal(obj);
    if (!ov->IsObject()) return JsErrorInvalidArgument;
    Local<Object> o = ov.As<Object>();
    Local<Context> ctx = cc::context();
    uint32_t i = 0;
    AsLocal(idx)->Uint32Value(ctx).To(&i);
    Maybe<bool> r = o->Set(ctx, i, AsLocal(v));
    return r.IsJust() && r.FromJust() ? JsNoError : JsErrorScriptException;
}

// ----------------------------------------------------------------------------
// Function calling
// ----------------------------------------------------------------------------
JsErrorCode JsCallFunction(JsValueRef fn, JsValueRef* args,
                           unsigned short argCount, JsValueRef* out) {
    if (!fn) { if (out) *out = nullptr; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Value> fnv = AsLocal(fn);
    if (!fnv->IsFunction()) { if (out) *out = nullptr; return JsErrorInvalidArgument; }
    Local<Function> f = fnv.As<Function>();
    Local<Context> ctx = cc::context();

    Local<Value> thisVal = (argCount > 0 && args[0]) ? AsLocal(args[0]) : Local<Value>::Cast(Undefined(g_iso));
    std::vector<Local<Value>> argv;
    if (argCount > 0) {
        argv.reserve(argCount - 1);
        for (int i = 1; i < (int)argCount; ++i) {
            argv.push_back(args[i] ? AsLocal(args[i]) : Local<Value>::Cast(Undefined(g_iso)));
        }
    }
    TryCatch tc(g_iso);
    Local<Value> r;
    if (!f->Call(ctx, thisVal, (int)argv.size(),
                 argv.empty() ? nullptr : argv.data()).ToLocal(&r)) {
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(r);
    return JsNoError;
}
JsErrorCode JsConstructObject(JsValueRef ctor, JsValueRef* args,
                              unsigned short argCount, JsValueRef* out) {
    if (!ctor) { if (out) *out = nullptr; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    Local<Value> cv = AsLocal(ctor);
    if (!cv->IsFunction()) return JsErrorInvalidArgument;
    Local<Function> c = cv.As<Function>();
    Local<Context> ctx = cc::context();
    std::vector<Local<Value>> argv;
    if (argCount > 0) {
        argv.reserve(argCount - 1);
        for (int i = 1; i < (int)argCount; ++i) {
            argv.push_back(args[i] ? AsLocal(args[i]) : Local<Value>::Cast(Undefined(g_iso)));
        }
    }
    TryCatch tc(g_iso);
    Local<Object> r;
    if (!c->NewInstance(ctx, (int)argv.size(),
                        argv.empty() ? nullptr : argv.data()).ToLocal(&r)) {
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(r);
    return JsNoError;
}

namespace {
    void v8_trampoline(const FunctionCallbackInfo<Value>& info) {
        Isolate* iso = info.GetIsolate();
        HandleScope hs(iso);
        int magic = info.Data()->Int32Value(iso->GetCurrentContext()).FromMaybe(-1);
        if (magic < 0 || magic >= (int)trampolines().size()) {
            info.GetReturnValue().SetUndefined();
            return;
        }
        Trampoline& t = trampolines()[magic];
        int argc = info.Length();

        std::vector<JsValueRef> a(argc + 1);
        a[0] = cc::wrap(info.This());
        for (int i = 0; i < argc; ++i) {
            a[i + 1] = cc::wrap(info[i]);
        }
        JsValueRef ret = t.fn(/*callee*/nullptr, /*ctor*/false,
                              a.data(), (unsigned short)(argc + 1), t.state);
        if (ret) {
            info.GetReturnValue().Set(AsLocal(ret));
            JsRelease(ret, nullptr);
        } else {
            info.GetReturnValue().SetUndefined();
        }
        for (auto& v : a) if (v) JsRelease(v, nullptr);
    }
}

JsErrorCode JsCreateNamedFunction(JsValueRef name, JsNativeFunction fn,
                                  void* state, JsValueRef* out) {
    HandleScope hs(g_iso);
    Local<Context> ctx = cc::context();
    int magic = (int)trampolines().size();
    trampolines().push_back({fn, state});

    Local<FunctionTemplate> tpl = FunctionTemplate::New(
        g_iso, &v8_trampoline, Integer::New(g_iso, magic));
    Local<Function> f;
    if (!tpl->GetFunction(ctx).ToLocal(&f)) return JsErrorOutOfMemory;
    if (name) {
        Local<Value> nv = AsLocal(name);
        if (nv->IsString()) f->SetName(nv.As<String>());
    }
    *out = cc::wrap(f);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Exceptions — pending exception storage is managed by chakra_host via TryCatch.
// We expose only a global flag.
// ----------------------------------------------------------------------------
namespace {
    thread_local Global<Value>* g_pendingException = nullptr;
}
namespace cc {
    // Called by chakra_host to install a pending exception (caught by TryCatch).
    void setPendingException(Local<Value> ex) {
        if (!g_pendingException) g_pendingException = new Global<Value>();
        g_pendingException->Reset(g_iso, ex);
    }
    void clearPendingException() {
        if (g_pendingException) g_pendingException->Reset();
    }
    bool hasPendingException() {
        return g_pendingException && !g_pendingException->IsEmpty();
    }
    Local<Value> takePendingException() {
        if (!g_pendingException || g_pendingException->IsEmpty()) return Undefined(g_iso);
        Local<Value> v = g_pendingException->Get(g_iso);
        g_pendingException->Reset();
        return v;
    }
}
JsErrorCode JsHasException(bool* has) {
    *has = cc::hasPendingException();
    return JsNoError;
}
JsErrorCode JsGetAndClearException(JsValueRef* out) {
    HandleScope hs(g_iso);
    if (!cc::hasPendingException()) {
        JsGetUndefinedValue(out);
        return JsNoError;
    }
    Local<Value> ex = cc::takePendingException();
    *out = cc::wrap(ex);
    return JsNoError;
}
JsErrorCode JsGetAndClearExceptionWithMetadata(JsValueRef* out) {
    HandleScope hs(g_iso);
    Local<Object> meta = Object::New(g_iso);
    Local<Context> ctx = cc::context();
    Local<Value> ex = cc::hasPendingException() ? cc::takePendingException() : Local<Value>::Cast(Undefined(g_iso));
    meta->Set(ctx, Str("exception"), ex).Check();
    meta->Set(ctx, Str("line"),   Integer::New(g_iso, 0)).Check();
    meta->Set(ctx, Str("column"), Integer::New(g_iso, 0)).Check();
    meta->Set(ctx, Str("source"), Str("")).Check();
    *out = cc::wrap(meta);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Promises
// ----------------------------------------------------------------------------
JsErrorCode JsCreatePromise(JsValueRef* promise, JsValueRef* resolve, JsValueRef* reject) {
    HandleScope hs(g_iso);
    Local<Context> ctx = cc::context();
    Local<Promise::Resolver> resolver;
    if (!Promise::Resolver::New(ctx).ToLocal(&resolver)) return JsErrorOutOfMemory;
    Local<Promise> p = resolver->GetPromise();

    // Build small bound resolve/reject functions that call resolver methods.
    // Use a JS shim instead of native code to keep things simple: store the
    // resolver as a property and bind it.
    // Simpler approach: create two C++ trampolines that capture the resolver.
    struct ResolverState { Global<Promise::Resolver> r; bool reject; };

    auto* sRes = new ResolverState{Global<Promise::Resolver>(g_iso, resolver), false};
    auto* sRej = new ResolverState{Global<Promise::Resolver>(g_iso, resolver), true};

    auto cb = [](const FunctionCallbackInfo<Value>& info) {
        Isolate* iso = info.GetIsolate();
        HandleScope hs2(iso);
        auto* s = static_cast<ResolverState*>(External::Cast(*info.Data())->Value());
        Local<Promise::Resolver> r = s->r.Get(iso);
        Local<Value> v = info.Length() > 0 ? info[0] : Local<Value>::Cast(Undefined(iso));
        if (s->reject) r->Reject(iso->GetCurrentContext(), v).Check();
        else           r->Resolve(iso->GetCurrentContext(), v).Check();
    };
    Local<Function> resolveFn = Function::New(ctx, cb, External::New(g_iso, sRes)).ToLocalChecked();
    Local<Function> rejectFn  = Function::New(ctx, cb, External::New(g_iso, sRej)).ToLocalChecked();

    *promise = cc::wrap(p);
    *resolve = cc::wrap(resolveFn);
    *reject  = cc::wrap(rejectFn);
    return JsNoError;
}
JsErrorCode JsSetPromiseContinuationCallback(PromiseContinuationCallback /*cb*/, void* /*state*/) {
    // V8 handles microtask scheduling internally; chakra_host pumps via
    // Isolate::PerformMicrotaskCheckpoint(). Nothing to register here.
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Equality
// ----------------------------------------------------------------------------
JsErrorCode JsEquals(JsValueRef a, JsValueRef b, bool* out) {
    if (!a || !b) { *out = false; return JsErrorInvalidArgument; }
    HandleScope hs(g_iso);
    *out = AsLocal(a)->StrictEquals(AsLocal(b));
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Runtime/context lifecycle — used by worker_shim. V8 isolates are expensive,
// but worker creation is rare; create a fresh isolate per worker.
// ----------------------------------------------------------------------------
namespace {
    ArrayBuffer::Allocator* defaultAllocator() {
        static ArrayBuffer::Allocator* a = ArrayBuffer::Allocator::NewDefaultAllocator();
        return a;
    }
}
JsErrorCode JsCreateRuntime(JsRuntimeAttribute, void*, JsRuntimeHandle* out) {
    Isolate::CreateParams params;
    params.array_buffer_allocator = defaultAllocator();
    Isolate* iso = Isolate::New(params);
    *out = iso;
    return JsNoError;
}
JsErrorCode JsCreateContext(JsRuntimeHandle rt, JsContextRef* out) {
    if (!rt) return JsErrorInvalidArgument;
    Isolate::Scope is(rt);
    HandleScope hs(rt);
    Local<Context> ctx = Context::New(rt);
    auto* g = new Global<Context>(rt, ctx);
    *out = g;
    return JsNoError;
}
JsErrorCode JsSetCurrentContext(JsContextRef c) {
    if (!c) { /* no-op for worker teardown path */ return JsNoError; }
    auto* g = static_cast<Global<Context>*>(c);
    Local<Context> ctx = g->Get(g_iso);
    cc::setContext(ctx);
    ctx->Enter();
    return JsNoError;
}
JsErrorCode JsDisposeRuntime(JsRuntimeHandle rt) {
    if (rt) {
        rt->Dispose();
    }
    return JsNoError;
}
JsErrorCode JsRun(JsValueRef src, JsSourceContext /*srcCtx*/, JsValueRef url,
                  JsParseScriptAttribute /*attrs*/, JsValueRef* out) {
    if (!src) return JsErrorInvalidArgument;
    HandleScope hs(g_iso);
    Local<Context> ctx = cc::context();
    Local<Value> sv = AsLocal(src);
    Local<String> source = sv->IsString() ? sv.As<String>()
                                          : sv->ToString(ctx).ToLocalChecked();
    Local<String> origin = url ? Local<Value>(AsLocal(url))->ToString(ctx).ToLocalChecked()
                               : Str("<script>");
    ScriptOrigin so(g_iso, origin);
    TryCatch tc(g_iso);
    Local<Script> compiled;
    if (!Script::Compile(ctx, source, &so).ToLocal(&compiled)) {
        if (tc.HasCaught()) cc::setPendingException(tc.Exception());
        if (out) *out = nullptr;
        return JsErrorScriptCompile;
    }
    Local<Value> r;
    if (!compiled->Run(ctx).ToLocal(&r)) {
        if (tc.HasCaught()) cc::setPendingException(tc.Exception());
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(r);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Module API stubs — V8 path uses native v8::Module via chakra_host.cpp.
// ----------------------------------------------------------------------------
JsErrorCode JsInitializeModuleRecord(JsModuleRecord, JsValueRef, JsModuleRecord* out) {
    if (out) *out = nullptr; return JsNoError;
}
JsErrorCode JsSetModuleHostInfo(JsModuleRecord, JsModuleHostInfoKind, void*) { return JsNoError; }
JsErrorCode JsParseModuleSource(JsModuleRecord, JsSourceContext, const unsigned char*,
                                unsigned int, JsParseScriptAttribute, JsValueRef*) { return JsNoError; }
JsErrorCode JsModuleEvaluation(JsModuleRecord, JsValueRef* out) {
    if (out) JsGetUndefinedValue(out); return JsNoError;
}
JsErrorCode JsGetModuleNamespace(JsModuleRecord, JsValueRef* out) {
    if (out) JsGetUndefinedValue(out); return JsNoError;
}
