#include "chakra_compat.h"

#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

// ----------------------------------------------------------------------------
// Context tracking
// ----------------------------------------------------------------------------
namespace {
    thread_local JSContext* g_ctx = nullptr;

    // Native function trampoline table.
    struct Trampoline { JsNativeFunction fn; void* state; };
    std::vector<Trampoline>& trampolines() {
        static std::vector<Trampoline> t;
        return t;
    }

    // Promise continuation callback storage.
    PromiseContinuationCallback g_promiseCb = nullptr;
    void* g_promiseCbState = nullptr;
} // namespace

namespace cc {
    void       setContext(JSContext* c) { g_ctx = c; }
    JSContext* ctx()                    { return g_ctx; }

    JsValueRef wrap(JSValue v) {
        auto* o = new JsValueObj{v, 1};
        return o;
    }
    JsValueRef wrapDup(JSValueConst v) {
        return wrap(JS_DupValue(g_ctx, v));
    }
    JSValue raw(JsValueRef r) {
        if (!r) return JS_UNDEFINED;
        return r->v;
    }
    void sweep() {}
} // namespace cc

// ----------------------------------------------------------------------------
// Refcounting
// ----------------------------------------------------------------------------
JsErrorCode JsAddRef(JsValueRef ref, unsigned int* count) {
    if (!ref) return JsErrorInvalidArgument;
    ref->v = JS_DupValue(g_ctx, ref->v);
    ref->rc++;
    if (count) *count = (unsigned)ref->rc;
    return JsNoError;
}
JsErrorCode JsRelease(JsValueRef ref, unsigned int* count) {
    if (!ref) return JsErrorInvalidArgument;
    JS_FreeValue(g_ctx, ref->v);
    ref->rc--;
    if (count) *count = (unsigned)ref->rc;
    if (ref->rc <= 0) {
        delete ref;
    }
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Primitives
// ----------------------------------------------------------------------------
JsErrorCode JsGetUndefinedValue(JsValueRef* out) {
    *out = cc::wrap(JS_UNDEFINED); return JsNoError;
}
JsErrorCode JsGetNullValue(JsValueRef* out) {
    *out = cc::wrap(JS_NULL); return JsNoError;
}
JsErrorCode JsBoolToBoolean(bool b, JsValueRef* out) {
    *out = cc::wrap(JS_NewBool(g_ctx, b)); return JsNoError;
}
JsErrorCode JsBooleanToBool(JsValueRef v, bool* out) {
    if (!v) { *out = false; return JsErrorInvalidArgument; }
    *out = JS_ToBool(g_ctx, v->v) > 0;
    return JsNoError;
}
JsErrorCode JsIntToNumber(int v, JsValueRef* out) {
    *out = cc::wrap(JS_NewInt32(g_ctx, v)); return JsNoError;
}
JsErrorCode JsDoubleToNumber(double v, JsValueRef* out) {
    *out = cc::wrap(JS_NewFloat64(g_ctx, v)); return JsNoError;
}
JsErrorCode JsNumberToInt(JsValueRef v, int* out) {
    if (!v) { *out = 0; return JsErrorInvalidArgument; }
    int32_t i = 0;
    if (JS_ToInt32(g_ctx, &i, v->v) < 0) { *out = 0; return JsErrorInvalidArgument; }
    *out = i;
    return JsNoError;
}
JsErrorCode JsNumberToDouble(JsValueRef v, double* out) {
    if (!v) { *out = 0.0; return JsErrorInvalidArgument; }
    double d = 0.0;
    if (JS_ToFloat64(g_ctx, &d, v->v) < 0) { *out = 0.0; return JsErrorInvalidArgument; }
    *out = d;
    return JsNoError;
}
JsErrorCode JsConvertValueToBoolean(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    int b = JS_ToBool(g_ctx, v->v);
    *out = cc::wrap(JS_NewBool(g_ctx, b > 0));
    return JsNoError;
}
JsErrorCode JsConvertValueToNumber(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    JSValue r = JS_ToNumber(g_ctx, v->v);
    if (JS_IsException(r)) return JsErrorScriptException;
    *out = cc::wrap(r);
    return JsNoError;
}
JsErrorCode JsConvertValueToString(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    JSValue r = JS_ToString(g_ctx, v->v);
    if (JS_IsException(r)) return JsErrorScriptException;
    *out = cc::wrap(r);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Strings
// ----------------------------------------------------------------------------
JsErrorCode JsCreateString(const char* s, size_t len, JsValueRef* out) {
    *out = cc::wrap(JS_NewStringLen(g_ctx, s, len));
    return JsNoError;
}
JsErrorCode JsCopyString(JsValueRef v, char* buf, size_t bufSize, size_t* outLen) {
    if (!v) { if (outLen) *outLen = 0; return JsErrorInvalidArgument; }
    size_t n = 0;
    const char* p = JS_ToCStringLen(g_ctx, &n, v->v);
    if (!p) { if (outLen) *outLen = 0; return JsErrorScriptException; }
    if (buf && bufSize > 0) {
        size_t toCopy = (n < bufSize) ? n : bufSize;
        memcpy(buf, p, toCopy);
    }
    if (outLen) *outLen = n;
    JS_FreeCString(g_ctx, p);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Type
// ----------------------------------------------------------------------------
JsErrorCode JsGetValueType(JsValueRef v, JsValueType* out) {
    if (!v) { *out = JsUndefined; return JsErrorInvalidArgument; }
    JSValueConst x = v->v;
    int tag = JS_VALUE_GET_TAG(x);
    if (tag == JS_TAG_UNDEFINED) { *out = JsUndefined; return JsNoError; }
    if (tag == JS_TAG_NULL)      { *out = JsNull;      return JsNoError; }
    if (tag == JS_TAG_BOOL)      { *out = JsBoolean;   return JsNoError; }
    if (JS_IsNumber(x))          { *out = JsNumber;    return JsNoError; }
    if (JS_IsString(x))          { *out = JsString;    return JsNoError; }
    if (JS_IsSymbol(x))          { *out = JsSymbol;    return JsNoError; }
    if (JS_IsObject(x)) {
        if (JS_IsFunction(g_ctx, x))   { *out = JsFunction;    return JsNoError; }
        if (JS_IsArray(x))             { *out = JsArray;       return JsNoError; }
        if (JS_IsArrayBuffer(x))       { *out = JsArrayBuffer; return JsNoError; }
        if (JS_GetTypedArrayType(x) >= 0) { *out = JsTypedArray; return JsNoError; }
        // DataView: try JS_GetClassID match? quickjs doesn't expose a public check.
        // Fall through to Object.
        if (JS_IsError(g_ctx, x))      { *out = JsError;       return JsNoError; }
        *out = JsObject; return JsNoError;
    }
    *out = JsObject;
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Objects / arrays
// ----------------------------------------------------------------------------
JsErrorCode JsGetGlobalObject(JsValueRef* out) {
    *out = cc::wrap(JS_GetGlobalObject(g_ctx));
    return JsNoError;
}
JsErrorCode JsCreateObject(JsValueRef* out) {
    *out = cc::wrap(JS_NewObject(g_ctx));
    return JsNoError;
}
JsErrorCode JsCreateArray(unsigned int len, JsValueRef* out) {
    JSValue arr = JS_NewArray(g_ctx);
    if (len > 0) {
        JS_SetPropertyStr(g_ctx, arr, "length", JS_NewUint32(g_ctx, len));
    }
    *out = cc::wrap(arr);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Array buffers
// ----------------------------------------------------------------------------
JsErrorCode JsCreateArrayBuffer(unsigned int size, JsValueRef* out) {
    // Allocate a buffer that will be owned by the ArrayBuffer (freed via the
    // default free function).
    void* mem = js_malloc(g_ctx, size ? size : 1);
    if (!mem) return JsErrorOutOfMemory;
    memset(mem, 0, size);
    // Default free function: js_free
    JSValue ab = JS_NewArrayBuffer(g_ctx, (uint8_t*)mem, size,
                                   /*free*/[](JSRuntime* rt, void* opaque, void* ptr) {
                                       (void)opaque;
                                       js_free_rt(rt, ptr);
                                   },
                                   /*opaque*/nullptr, /*is_shared*/false);
    if (JS_IsException(ab)) { js_free(g_ctx, mem); return JsErrorOutOfMemory; }
    *out = cc::wrap(ab);
    return JsNoError;
}
JsErrorCode JsCreateExternalArrayBuffer(void* data, unsigned int size,
                                        void (*finalize)(void*), void* state,
                                        JsValueRef* out) {
    struct Closure { void (*fin)(void*); void* state; };
    Closure* c = new Closure{finalize, state};
    JSValue ab = JS_NewArrayBuffer(g_ctx, (uint8_t*)data, size,
                                   [](JSRuntime* rt, void* opaque, void* ptr) {
                                       (void)rt; (void)ptr;
                                       auto* cl = static_cast<Closure*>(opaque);
                                       if (cl->fin) cl->fin(cl->state);
                                       delete cl;
                                   },
                                   /*opaque*/c, /*is_shared*/false);
    if (JS_IsException(ab)) { delete c; return JsErrorOutOfMemory; }
    *out = cc::wrap(ab);
    return JsNoError;
}
JsErrorCode JsCreateTypedArray(JsTypedArrayType ta, JsValueRef ab,
                               unsigned int byteOffset, unsigned int len,
                               JsValueRef* out) {
    JSTypedArrayEnum t = JS_TYPED_ARRAY_UINT8;
    switch (ta) {
        case JsArrayTypeInt8:         t = JS_TYPED_ARRAY_INT8;    break;
        case JsArrayTypeUint8:        t = JS_TYPED_ARRAY_UINT8;   break;
        case JsArrayTypeUint8Clamped: t = JS_TYPED_ARRAY_UINT8C;  break;
        case JsArrayTypeInt16:        t = JS_TYPED_ARRAY_INT16;   break;
        case JsArrayTypeUint16:       t = JS_TYPED_ARRAY_UINT16;  break;
        case JsArrayTypeInt32:        t = JS_TYPED_ARRAY_INT32;   break;
        case JsArrayTypeUint32:       t = JS_TYPED_ARRAY_UINT32;  break;
        case JsArrayTypeFloat32:      t = JS_TYPED_ARRAY_FLOAT32; break;
        case JsArrayTypeFloat64:      t = JS_TYPED_ARRAY_FLOAT64; break;
    }
    JSValueConst args[3] = {
        ab->v,
        JS_NewUint32(g_ctx, byteOffset),
        JS_NewUint32(g_ctx, len),
    };
    JSValue arr = JS_NewTypedArray(g_ctx, 3, args, t);
    if (JS_IsException(arr)) return JsErrorScriptException;
    *out = cc::wrap(arr);
    return JsNoError;
}
JsErrorCode JsGetArrayBufferStorage(JsValueRef v, unsigned char** buf,
                                    unsigned int* len) {
    if (!v) return JsErrorInvalidArgument;
    size_t sz = 0;
    uint8_t* p = JS_GetArrayBuffer(g_ctx, &sz, v->v);
    if (!p) return JsErrorInvalidArgument;
    if (buf) *buf = p;
    if (len) *len = (unsigned)sz;
    return JsNoError;
}
JsErrorCode JsGetTypedArrayStorage(JsValueRef v, unsigned char** buf,
                                   unsigned int* len, JsTypedArrayType* ta,
                                   int* eltSize) {
    if (!v) return JsErrorInvalidArgument;
    size_t byteOffset = 0, byteLen = 0, bpe = 1;
    JSValue ab = JS_GetTypedArrayBuffer(g_ctx, v->v, &byteOffset, &byteLen, &bpe);
    if (JS_IsException(ab)) return JsErrorInvalidArgument;
    size_t abSize = 0;
    uint8_t* abPtr = JS_GetArrayBuffer(g_ctx, &abSize, ab);
    JS_FreeValue(g_ctx, ab);
    if (!abPtr) return JsErrorInvalidArgument;
    if (buf) *buf = abPtr + byteOffset;
    if (len) *len = (unsigned)byteLen;
    if (eltSize) *eltSize = (int)bpe;
    if (ta) {
        int t = JS_GetTypedArrayType(v->v);
        switch (t) {
            case JS_TYPED_ARRAY_INT8:     *ta = JsArrayTypeInt8;         break;
            case JS_TYPED_ARRAY_UINT8:    *ta = JsArrayTypeUint8;        break;
            case JS_TYPED_ARRAY_UINT8C:   *ta = JsArrayTypeUint8Clamped; break;
            case JS_TYPED_ARRAY_INT16:    *ta = JsArrayTypeInt16;        break;
            case JS_TYPED_ARRAY_UINT16:   *ta = JsArrayTypeUint16;       break;
            case JS_TYPED_ARRAY_INT32:    *ta = JsArrayTypeInt32;        break;
            case JS_TYPED_ARRAY_UINT32:   *ta = JsArrayTypeUint32;       break;
            case JS_TYPED_ARRAY_FLOAT32:  *ta = JsArrayTypeFloat32;      break;
            case JS_TYPED_ARRAY_FLOAT64:  *ta = JsArrayTypeFloat64;      break;
            default:                      *ta = JsArrayTypeUint8;        break;
        }
    }
    return JsNoError;
}
JsErrorCode JsGetDataViewStorage(JsValueRef v, unsigned char** buf,
                                 unsigned int* len) {
    // QuickJS exposes DataView as an object with byteOffset / byteLength props
    // and a buffer property pointing to the ArrayBuffer. Read those.
    if (!v) return JsErrorInvalidArgument;
    JSValue bufVal = JS_GetPropertyStr(g_ctx, v->v, "buffer");
    if (JS_IsException(bufVal) || JS_IsUndefined(bufVal)) {
        JS_FreeValue(g_ctx, bufVal);
        return JsErrorInvalidArgument;
    }
    JSValue offV = JS_GetPropertyStr(g_ctx, v->v, "byteOffset");
    JSValue lenV = JS_GetPropertyStr(g_ctx, v->v, "byteLength");
    int32_t off = 0, lenI = 0;
    JS_ToInt32(g_ctx, &off,  offV);
    JS_ToInt32(g_ctx, &lenI, lenV);
    JS_FreeValue(g_ctx, offV);
    JS_FreeValue(g_ctx, lenV);
    size_t abSize = 0;
    uint8_t* p = JS_GetArrayBuffer(g_ctx, &abSize, bufVal);
    JS_FreeValue(g_ctx, bufVal);
    if (!p) return JsErrorInvalidArgument;
    if (buf) *buf = p + off;
    if (len) *len = (unsigned)lenI;
    return JsNoError;
}

// ----------------------------------------------------------------------------
// External (opaque) objects — use a custom JSClass
// ----------------------------------------------------------------------------
namespace {
    JSClassID g_externalClassId = 0;
    struct External {
        void* data;
        void (*finalize)(void*);
    };
    void externalFinalizer(JSRuntime* rt, JSValueConst val) {
        (void)rt;
        auto* e = static_cast<External*>(JS_GetOpaque(val, g_externalClassId));
        if (e) {
            if (e->finalize) e->finalize(e->data);
            delete e;
        }
    }
    bool ensureExternalClass(JSRuntime* rt) {
        if (g_externalClassId != 0) return true;
        JS_NewClassID(rt, &g_externalClassId);
        JSClassDef def{};
        def.class_name = "External";
        def.finalizer  = &externalFinalizer;
        if (JS_NewClass(rt, g_externalClassId, &def) < 0) return false;
        return true;
    }
} // namespace
JsErrorCode JsCreateExternalObject(void* data, void (*finalize)(void*),
                                   JsValueRef* out) {
    if (!ensureExternalClass(JS_GetRuntime(g_ctx))) return JsErrorFatal;
    JSValue obj = JS_NewObjectClass(g_ctx, g_externalClassId);
    if (JS_IsException(obj)) return JsErrorOutOfMemory;
    auto* e = new External{data, finalize};
    JS_SetOpaque(obj, e);
    *out = cc::wrap(obj);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Properties
// ----------------------------------------------------------------------------
JsErrorCode JsCreatePropertyId(const char* name, size_t len,
                               JsPropertyIdRef* out) {
    *out = JS_NewAtomLen(g_ctx, name, len);
    return JsNoError;
}
JsErrorCode JsGetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef* out) {
    if (!obj) { *out = cc::wrap(JS_UNDEFINED); return JsErrorInvalidArgument; }
    JSValue v = JS_GetProperty(g_ctx, obj->v, pid);
    if (JS_IsException(v)) { *out = cc::wrap(JS_UNDEFINED); return JsErrorScriptException; }
    *out = cc::wrap(v);
    return JsNoError;
}
JsErrorCode JsSetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef v,
                          bool strict) {
    (void)strict;
    if (!obj || !v) return JsErrorInvalidArgument;
    // JS_SetProperty takes ownership of val, so dup it.
    JSValue dup = JS_DupValue(g_ctx, v->v);
    int r = JS_SetProperty(g_ctx, obj->v, pid, dup);
    return (r < 0) ? JsErrorScriptException : JsNoError;
}
JsErrorCode JsHasProperty(JsValueRef obj, JsPropertyIdRef pid, bool* has) {
    if (!obj) { *has = false; return JsErrorInvalidArgument; }
    int r = JS_HasProperty(g_ctx, obj->v, pid);
    if (r < 0) { *has = false; return JsErrorScriptException; }
    *has = (r > 0);
    return JsNoError;
}
JsErrorCode JsGetIndexedProperty(JsValueRef obj, JsValueRef idx,
                                 JsValueRef* out) {
    if (!obj || !idx) { *out = cc::wrap(JS_UNDEFINED); return JsErrorInvalidArgument; }
    int32_t i = 0;
    JS_ToInt32(g_ctx, &i, idx->v);
    JSValue v = JS_GetPropertyUint32(g_ctx, obj->v, (uint32_t)i);
    if (JS_IsException(v)) { *out = cc::wrap(JS_UNDEFINED); return JsErrorScriptException; }
    *out = cc::wrap(v);
    return JsNoError;
}
JsErrorCode JsSetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef v) {
    if (!obj || !idx || !v) return JsErrorInvalidArgument;
    int32_t i = 0;
    JS_ToInt32(g_ctx, &i, idx->v);
    int r = JS_SetPropertyUint32(g_ctx, obj->v, (uint32_t)i, JS_DupValue(g_ctx, v->v));
    return (r < 0) ? JsErrorScriptException : JsNoError;
}

// ----------------------------------------------------------------------------
// Function calling
// ----------------------------------------------------------------------------
JsErrorCode JsCallFunction(JsValueRef fn, JsValueRef* args,
                           unsigned short argCount, JsValueRef* out) {
    if (!fn) { *out = nullptr; return JsErrorInvalidArgument; }
    // Chakra calling convention: args[0] is `this`, args[1..N-1] are real args.
    JSValueConst thisVal = (argCount > 0 && args[0]) ? args[0]->v : JS_UNDEFINED;
    std::vector<JSValueConst> argv;
    if (argCount > 0) {
        argv.reserve(argCount - 1);
        for (int i = 1; i < (int)argCount; ++i) {
            argv.push_back(args[i] ? args[i]->v : JS_UNDEFINED);
        }
    }
    JSValue r = JS_Call(g_ctx, fn->v, thisVal,
                        argv.empty() ? 0 : (int)argv.size(),
                        argv.empty() ? nullptr : argv.data());
    if (JS_IsException(r)) {
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(r);
    else JS_FreeValue(g_ctx, r);
    return JsNoError;
}
JsErrorCode JsConstructObject(JsValueRef ctor, JsValueRef* args,
                              unsigned short argCount, JsValueRef* out) {
    if (!ctor) { *out = nullptr; return JsErrorInvalidArgument; }
    // Chakra: args[0] = `this` (unused for constructors). Skip it.
    std::vector<JSValueConst> argv;
    if (argCount > 0) {
        argv.reserve(argCount - 1);
        for (int i = 1; i < (int)argCount; ++i) {
            argv.push_back(args[i] ? args[i]->v : JS_UNDEFINED);
        }
    }
    JSValue r = JS_CallConstructor(g_ctx, ctor->v,
                                   argv.empty() ? 0 : (int)argv.size(),
                                   argv.empty() ? nullptr : argv.data());
    if (JS_IsException(r)) {
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(r);
    else JS_FreeValue(g_ctx, r);
    return JsNoError;
}

namespace {
    // QuickJS-side trampoline: re-shape args for the Chakra-style native fn.
    JSValue cc_trampoline(JSContext* ctx, JSValueConst this_val, int argc,
                          JSValueConst* argv, int magic, JSValueConst* /*func_data*/) {
        (void)ctx;
        if (magic < 0 || magic >= (int)trampolines().size()) return JS_UNDEFINED;
        Trampoline& t = trampolines()[magic];

        // Build [this, arg0, arg1, ...] as JsValueRefs.
        // Use stack-ish allocation (we wrap each as a JsValueObj).
        std::vector<JsValueRef> a(argc + 1);
        a[0] = cc::wrapDup(this_val);
        for (int i = 0; i < argc; ++i) {
            a[i + 1] = cc::wrapDup(argv[i]);
        }
        JsValueRef ret = t.fn(/*callee*/nullptr, /*ctor*/false,
                              a.data(), (unsigned short)(argc + 1), t.state);
        // Extract return JSValue (must dup since we'll free our wrapper).
        JSValue rv = ret ? JS_DupValue(g_ctx, ret->v) : JS_UNDEFINED;
        // Release argument wrappers and the return wrapper.
        for (auto& v : a) {
            if (v) JsRelease(v, nullptr);
        }
        if (ret) JsRelease(ret, nullptr);
        return rv;
    }
} // namespace

JsErrorCode JsCreateNamedFunction(JsValueRef name, JsNativeFunction fn,
                                  void* state, JsValueRef* out) {
    int magic = (int)trampolines().size();
    trampolines().push_back({fn, state});

    JSValue jsFn = JS_NewCFunctionData(g_ctx, &cc_trampoline,
                                       /*length*/0, /*magic*/magic,
                                       /*data_len*/0, /*data*/nullptr);
    if (JS_IsException(jsFn)) return JsErrorOutOfMemory;
    // Apply name as Function#name property if provided.
    if (name) {
        JSValue nameDup = JS_DupValue(g_ctx, name->v);
        JS_DefinePropertyValueStr(g_ctx, jsFn, "name", nameDup, JS_PROP_CONFIGURABLE);
    }
    *out = cc::wrap(jsFn);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Exceptions
// ----------------------------------------------------------------------------
JsErrorCode JsHasException(bool* has) {
    if (!g_ctx) { *has = false; return JsNoError; }
    *has = JS_HasException(g_ctx);
    return JsNoError;
}
JsErrorCode JsGetAndClearException(JsValueRef* out) {
    JSValue e = JS_GetException(g_ctx);
    *out = cc::wrap(e);
    return JsNoError;
}
JsErrorCode JsGetAndClearExceptionWithMetadata(JsValueRef* out) {
    // No real metadata — return a synthetic object { exception, line:0, column:0, source:"" }.
    JSValue e = JS_GetException(g_ctx);
    JSValue meta = JS_NewObject(g_ctx);
    JS_SetPropertyStr(g_ctx, meta, "exception", JS_DupValue(g_ctx, e));
    JS_SetPropertyStr(g_ctx, meta, "line",   JS_NewInt32(g_ctx, 0));
    JS_SetPropertyStr(g_ctx, meta, "column", JS_NewInt32(g_ctx, 0));
    JS_SetPropertyStr(g_ctx, meta, "source", JS_NewString(g_ctx, ""));
    JS_FreeValue(g_ctx, e);
    *out = cc::wrap(meta);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Promises
// ----------------------------------------------------------------------------
JsErrorCode JsCreatePromise(JsValueRef* promise, JsValueRef* resolve,
                            JsValueRef* reject) {
    JSValue funcs[2];
    JSValue p = JS_NewPromiseCapability(g_ctx, funcs);
    if (JS_IsException(p)) return JsErrorOutOfMemory;
    *promise = cc::wrap(p);
    *resolve = cc::wrap(funcs[0]);
    *reject  = cc::wrap(funcs[1]);
    return JsNoError;
}
JsErrorCode JsSetPromiseContinuationCallback(PromiseContinuationCallback cb,
                                             void* state) {
    g_promiseCb = cb;
    g_promiseCbState = state;
    // Note: in QuickJS, microtasks are dispatched via JS_ExecutePendingJob.
    // The cx::Host runs them in its pumpMicrotasks() loop. We don't actually
    // need the Chakra-style callback at all.
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Equality
// ----------------------------------------------------------------------------
JsErrorCode JsEquals(JsValueRef a, JsValueRef b, bool* out) {
    if (!a || !b) { *out = false; return JsErrorInvalidArgument; }
    *out = JS_IsStrictEqual(g_ctx, a->v, b->v);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Runtime / context (for workers)
// ----------------------------------------------------------------------------
JsErrorCode JsCreateRuntime(JsRuntimeAttribute attrs, void* allocators,
                            JsRuntimeHandle* out) {
    (void)attrs; (void)allocators;
    JSRuntime* rt = JS_NewRuntime();
    if (!rt) return JsErrorOutOfMemory;
    *out = rt;
    return JsNoError;
}
JsErrorCode JsCreateContext(JsRuntimeHandle rt, JsContextRef* out) {
    JSContext* c = JS_NewContext(rt);
    if (!c) return JsErrorOutOfMemory;
    *out = c;
    return JsNoError;
}
JsErrorCode JsSetCurrentContext(JsContextRef ctx) {
    g_ctx = ctx;
    return JsNoError;
}
JsErrorCode JsDisposeRuntime(JsRuntimeHandle rt) {
    if (rt) JS_FreeRuntime(rt);
    return JsNoError;
}
JsErrorCode JsRun(JsValueRef src, JsSourceContext srcCtx, JsValueRef url,
                  JsParseScriptAttribute attrs, JsValueRef* out) {
    (void)srcCtx; (void)attrs;
    if (!src) return JsErrorInvalidArgument;
    size_t srcLen = 0;
    const char* srcStr = JS_ToCStringLen(g_ctx, &srcLen, src->v);
    if (!srcStr) return JsErrorScriptException;
    std::string filename = "<script>";
    if (url) {
        size_t uLen = 0;
        const char* u = JS_ToCStringLen(g_ctx, &uLen, url->v);
        if (u) { filename.assign(u, uLen); JS_FreeCString(g_ctx, u); }
    }
    JSValue r = JS_Eval(g_ctx, srcStr, srcLen, filename.c_str(),
                        JS_EVAL_TYPE_GLOBAL);
    JS_FreeCString(g_ctx, srcStr);
    if (JS_IsException(r)) {
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(r);
    else JS_FreeValue(g_ctx, r);
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Module APIs (no-op stubs — chakra_host on QuickJS uses native QuickJS modules)
// ----------------------------------------------------------------------------
JsErrorCode JsInitializeModuleRecord(JsModuleRecord, JsValueRef, JsModuleRecord* out) {
    if (out) *out = nullptr; return JsNoError;
}
JsErrorCode JsSetModuleHostInfo(JsModuleRecord, JsModuleHostInfoKind, void*) { return JsNoError; }
JsErrorCode JsParseModuleSource(JsModuleRecord, JsSourceContext, const unsigned char*,
                                unsigned int, JsParseScriptAttribute, JsValueRef*) { return JsNoError; }
JsErrorCode JsModuleEvaluation(JsModuleRecord, JsValueRef* out) {
    if (out) *out = cc::wrap(JS_UNDEFINED); return JsNoError;
}
JsErrorCode JsGetModuleNamespace(JsModuleRecord, JsValueRef* out) {
    if (out) *out = cc::wrap(JS_UNDEFINED); return JsNoError;
}
