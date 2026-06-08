// Chakra-style C API wrapper implemented on top of Apple JavaScriptCore.
// Mirrors the QuickJS implementation in
//   src/appRuntime/QuickJS/chakra_compat.cpp
// so the shared layer (wgpu_bridge / dom_shim / worker_shim) builds
// unchanged.
//
// Threading: single-threaded; the host owns one JSGlobalContext and shares it.
//
// Memory: every JsValueObj* holds one JSValueProtect against the current
// context and a wrapper refcount. We deliberately leak transient wrappers
// that downstream code never explicitly Releases — same convention as the
// QuickJS port, acceptable for our short-lived test runs.

#include "chakra_compat.h"

#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>
#include <unordered_map>

// ============================================================================
// Internal state
// ============================================================================
namespace {
JSGlobalContextRef g_ctx       = nullptr;
JSContextGroupRef  g_group     = nullptr;
JSValueRef         g_exception = nullptr;  // last uncaught exception

PromiseContinuationCallback g_promiseCb      = nullptr;
void*                       g_promiseCbState = nullptr;

// Holder for ExternalObject finalizers (one slot per JSC private-data pointer).
struct ExtFinalizer {
    void (*finalize)(void*);
    void* data;
};
std::unordered_map<void*, ExtFinalizer> g_extFinalizers;

void ExternalObject_finalize(JSObjectRef obj) {
    void* priv = JSObjectGetPrivate(obj);
    auto it = g_extFinalizers.find(priv);
    if (it != g_extFinalizers.end()) {
        if (it->second.finalize) it->second.finalize(it->second.data);
        g_extFinalizers.erase(it);
    }
}

JSClassRef ExternalObjectClass() {
    static JSClassRef cls = nullptr;
    if (!cls) {
        JSClassDefinition d = kJSClassDefinitionEmpty;
        d.className = "External";
        d.finalize  = &ExternalObject_finalize;
        cls = JSClassCreate(&d);
    }
    return cls;
}

// External ArrayBuffer finalizer: JSC ABI is
//   void (*JSTypedArrayBytesDeallocator)(void* bytes, void* deallocatorContext)
struct ExtAbHolder {
    void (*finalize)(void*);
    void* state;
};
void ExtArrayBuffer_dealloc(void* /*bytes*/, void* ctx) {
    auto* h = static_cast<ExtAbHolder*>(ctx);
    if (h) {
        if (h->finalize) h->finalize(h->state);
        delete h;
    }
}

// Function-callback dispatch: bridge JSC's callback signature into Chakra's.
struct FnCallbackData {
    JsNativeFunction fn;
    void*            state;
};
std::unordered_map<JSObjectRef, FnCallbackData> g_fnCallbacks;

JSValueRef DispatchNativeFn(
        JSContextRef ctx,
        JSObjectRef function,
        JSObjectRef thisObject,
        size_t argumentCount,
        const JSValueRef arguments[],
        JSValueRef* exception)
{
    (void)ctx;
    auto it = g_fnCallbacks.find(function);
    if (it == g_fnCallbacks.end()) return JSValueMakeUndefined(g_ctx);

    // Chakra convention: args[0] is 'this', args[1..] are real args.
    std::vector<JsValueObj> wrappers;
    wrappers.reserve(argumentCount + 1);
    std::vector<JsValueRef> ptrs;
    ptrs.reserve(argumentCount + 1);

    auto pushVal = [&](JSValueRef v) {
        wrappers.push_back({v, 1});
        if (v) JSValueProtect(g_ctx, v);
        ptrs.push_back(&wrappers.back());
    };

    pushVal(thisObject ? static_cast<JSValueRef>(thisObject)
                        : JSValueMakeUndefined(g_ctx));
    for (size_t i = 0; i < argumentCount; ++i) pushVal(arguments[i]);

    JsValueRef result = it->second.fn(
        /*callee*/  nullptr,
        /*isCtor*/  false,
        ptrs.data(),
        static_cast<unsigned short>(ptrs.size()),
        it->second.state);

    // Release the temporary wrappers (they protected the values for the
    // duration of the call only).
    for (auto& w : wrappers) {
        if (w.value) JSValueUnprotect(g_ctx, w.value);
    }
    (void)exception;
    return result ? result->value : JSValueMakeUndefined(g_ctx);
}

} // namespace

// ============================================================================
// Internal helpers (cc:: namespace)
// ============================================================================
namespace cc {
void setContext(JSGlobalContextRef ctx) {
    g_ctx = ctx;
}
JSGlobalContextRef ctx() { return g_ctx; }

JsValueRef wrap(JSValueRef v) {
    if (!v || !g_ctx) {
        auto* w = new JsValueObj{nullptr, 1};
        return w;
    }
    JSValueProtect(g_ctx, v);
    return new JsValueObj{v, 1};
}

JSValueRef raw(JsValueRef r) { return r ? r->value : nullptr; }

void sweep() {}
} // namespace cc

// ============================================================================
// Refcounting
// ============================================================================
JsErrorCode JsAddRef(JsValueRef r, unsigned int* count) {
    if (!r) return JsErrorInvalidArgument;
    r->rc++;
    if (count) *count = static_cast<unsigned>(r->rc);
    return JsNoError;
}
JsErrorCode JsRelease(JsValueRef r, unsigned int* count) {
    if (!r) return JsErrorInvalidArgument;
    r->rc--;
    if (count) *count = static_cast<unsigned>(r->rc);
    if (r->rc <= 0) {
        if (r->value && g_ctx) JSValueUnprotect(g_ctx, r->value);
        delete r;
    }
    return JsNoError;
}

// ============================================================================
// Primitive create/convert
// ============================================================================
JsErrorCode JsGetUndefinedValue(JsValueRef* out) {
    *out = cc::wrap(JSValueMakeUndefined(g_ctx));
    return JsNoError;
}
JsErrorCode JsGetNullValue(JsValueRef* out) {
    *out = cc::wrap(JSValueMakeNull(g_ctx));
    return JsNoError;
}
JsErrorCode JsBoolToBoolean(bool b, JsValueRef* out) {
    *out = cc::wrap(JSValueMakeBoolean(g_ctx, b));
    return JsNoError;
}
JsErrorCode JsBooleanToBool(JsValueRef v, bool* out) {
    if (!v || !v->value) return JsErrorInvalidArgument;
    *out = JSValueToBoolean(g_ctx, v->value);
    return JsNoError;
}
JsErrorCode JsIntToNumber(int v, JsValueRef* out) {
    *out = cc::wrap(JSValueMakeNumber(g_ctx, static_cast<double>(v)));
    return JsNoError;
}
JsErrorCode JsDoubleToNumber(double v, JsValueRef* out) {
    *out = cc::wrap(JSValueMakeNumber(g_ctx, v));
    return JsNoError;
}
JsErrorCode JsNumberToInt(JsValueRef v, int* out) {
    if (!v || !v->value) return JsErrorInvalidArgument;
    *out = static_cast<int>(JSValueToNumber(g_ctx, v->value, nullptr));
    return JsNoError;
}
JsErrorCode JsNumberToDouble(JsValueRef v, double* out) {
    if (!v || !v->value) return JsErrorInvalidArgument;
    *out = JSValueToNumber(g_ctx, v->value, nullptr);
    return JsNoError;
}
JsErrorCode JsConvertValueToBoolean(JsValueRef v, JsValueRef* out) {
    bool b = false; JsBooleanToBool(v, &b);
    return JsBoolToBoolean(b, out);
}
JsErrorCode JsConvertValueToNumber(JsValueRef v, JsValueRef* out) {
    double d = 0; JsNumberToDouble(v, &d);
    return JsDoubleToNumber(d, out);
}
JsErrorCode JsConvertValueToString(JsValueRef v, JsValueRef* out) {
    if (!v || !v->value) return JsErrorInvalidArgument;
    JSStringRef s = JSValueToStringCopy(g_ctx, v->value, nullptr);
    if (!s) { *out = cc::wrap(JSValueMakeUndefined(g_ctx)); return JsNoError; }
    JSValueRef sv = JSValueMakeString(g_ctx, s);
    JSStringRelease(s);
    *out = cc::wrap(sv);
    return JsNoError;
}

// ============================================================================
// Strings
// ============================================================================
JsErrorCode JsCreateString(const char* s, size_t len, JsValueRef* out) {
    std::string tmp(s, len);
    JSStringRef js = JSStringCreateWithUTF8CString(tmp.c_str());
    JSValueRef v = JSValueMakeString(g_ctx, js);
    JSStringRelease(js);
    *out = cc::wrap(v);
    return JsNoError;
}

JsErrorCode JsCopyString(JsValueRef v, char* buf, size_t bufSize, size_t* outLen) {
    if (!v || !v->value) { if (outLen) *outLen = 0; return JsErrorInvalidArgument; }
    JSStringRef s = JSValueToStringCopy(g_ctx, v->value, nullptr);
    if (!s) { if (outLen) *outLen = 0; return JsErrorScriptException; }
    size_t maxBytes = JSStringGetMaximumUTF8CStringSize(s);
    std::vector<char> tmp(maxBytes);
    size_t actual = JSStringGetUTF8CString(s, tmp.data(), maxBytes);
    JSStringRelease(s);
    // actual is strlen+1 of the resulting NUL-terminated string.
    size_t strLen = actual > 0 ? actual - 1 : 0;
    if (outLen) *outLen = strLen;
    if (buf && bufSize > 0) {
        size_t cpy = std::min(strLen, bufSize - 1);
        std::memcpy(buf, tmp.data(), cpy);
        buf[cpy] = 0;
    }
    return JsNoError;
}

// ============================================================================
// Type discrimination
// ============================================================================
JsErrorCode JsGetValueType(JsValueRef v, JsValueType* out) {
    if (!v || !v->value) { *out = JsUndefined; return JsNoError; }
    JSValueRef val = v->value;
    if (JSValueIsUndefined(g_ctx, val))   { *out = JsUndefined; return JsNoError; }
    if (JSValueIsNull(g_ctx, val))        { *out = JsNull;      return JsNoError; }
    if (JSValueIsBoolean(g_ctx, val))     { *out = JsBoolean;   return JsNoError; }
    if (JSValueIsNumber(g_ctx, val))      { *out = JsNumber;    return JsNoError; }
    if (JSValueIsString(g_ctx, val))      { *out = JsString;    return JsNoError; }
    if (JSValueIsSymbol(g_ctx, val))      { *out = JsSymbol;    return JsNoError; }
    if (JSValueIsObject(g_ctx, val)) {
        JSObjectRef obj = JSValueToObject(g_ctx, val, nullptr);
        if (obj) {
            if (JSValueIsArray(g_ctx, val)) { *out = JsArray; return JsNoError; }
            JSTypedArrayType t = JSValueGetTypedArrayType(g_ctx, val, nullptr);
            if (t == kJSTypedArrayTypeArrayBuffer) { *out = JsArrayBuffer; return JsNoError; }
            if (t != kJSTypedArrayTypeNone) { *out = JsTypedArray; return JsNoError; }
            if (JSObjectIsFunction(g_ctx, obj)) { *out = JsFunction; return JsNoError; }
        }
        *out = JsObject; return JsNoError;
    }
    *out = JsObject; return JsNoError;
}

// ============================================================================
// Objects / arrays
// ============================================================================
JsErrorCode JsGetGlobalObject(JsValueRef* out) {
    JSObjectRef g = JSContextGetGlobalObject(g_ctx);
    *out = cc::wrap(g);
    return JsNoError;
}
JsErrorCode JsCreateObject(JsValueRef* out) {
    JSObjectRef o = JSObjectMake(g_ctx, nullptr, nullptr);
    *out = cc::wrap(o);
    return JsNoError;
}
JsErrorCode JsCreateArray(unsigned int len, JsValueRef* out) {
    std::vector<JSValueRef> empty(len, JSValueMakeUndefined(g_ctx));
    JSObjectRef arr = JSObjectMakeArray(g_ctx, len, empty.data(), nullptr);
    *out = cc::wrap(arr);
    return JsNoError;
}

// ============================================================================
// ArrayBuffers / TypedArrays
// ============================================================================
JsErrorCode JsCreateArrayBuffer(unsigned int size, JsValueRef* out) {
    JSObjectRef ab = JSObjectMakeArrayBufferWithBytesNoCopy(
        g_ctx,
        std::malloc(size), static_cast<size_t>(size),
        [](void* bytes, void*) { std::free(bytes); },
        nullptr,
        nullptr);
    *out = cc::wrap(ab);
    return JsNoError;
}

JsErrorCode JsCreateExternalArrayBuffer(void* data, unsigned int size,
                                        void (*finalize)(void*), void* state,
                                        JsValueRef* out) {
    auto* h = new ExtAbHolder{finalize, state};
    JSObjectRef ab = JSObjectMakeArrayBufferWithBytesNoCopy(
        g_ctx, data, static_cast<size_t>(size),
        &ExtArrayBuffer_dealloc, h, nullptr);
    *out = cc::wrap(ab);
    return JsNoError;
}

JsErrorCode JsCreateTypedArray(JsTypedArrayType ta, JsValueRef ab,
                               unsigned int byteOffset, unsigned int len,
                               JsValueRef* out) {
    if (!ab || !ab->value) return JsErrorInvalidArgument;
    JSObjectRef abo = JSValueToObject(g_ctx, ab->value, nullptr);
    if (!abo) return JsErrorInvalidArgument;

    JSTypedArrayType jt = kJSTypedArrayTypeNone;
    switch (ta) {
        case JsArrayTypeInt8:         jt = kJSTypedArrayTypeInt8Array;        break;
        case JsArrayTypeUint8:        jt = kJSTypedArrayTypeUint8Array;       break;
        case JsArrayTypeUint8Clamped: jt = kJSTypedArrayTypeUint8ClampedArray; break;
        case JsArrayTypeInt16:        jt = kJSTypedArrayTypeInt16Array;       break;
        case JsArrayTypeUint16:       jt = kJSTypedArrayTypeUint16Array;      break;
        case JsArrayTypeInt32:        jt = kJSTypedArrayTypeInt32Array;       break;
        case JsArrayTypeUint32:       jt = kJSTypedArrayTypeUint32Array;      break;
        case JsArrayTypeFloat32:      jt = kJSTypedArrayTypeFloat32Array;     break;
        case JsArrayTypeFloat64:      jt = kJSTypedArrayTypeFloat64Array;     break;
    }
    JSObjectRef tao = JSObjectMakeTypedArrayWithArrayBufferAndOffset(
        g_ctx, jt, abo, byteOffset, len, nullptr);
    *out = cc::wrap(tao);
    return JsNoError;
}

JsErrorCode JsGetArrayBufferStorage(JsValueRef v, unsigned char** buf,
                                    unsigned int* len) {
    if (!v || !v->value) return JsErrorInvalidArgument;
    JSObjectRef o = JSValueToObject(g_ctx, v->value, nullptr);
    if (!o) return JsErrorInvalidArgument;
    if (buf) *buf = static_cast<unsigned char*>(JSObjectGetArrayBufferBytesPtr(g_ctx, o, nullptr));
    if (len) *len = static_cast<unsigned>(JSObjectGetArrayBufferByteLength(g_ctx, o, nullptr));
    return JsNoError;
}

JsErrorCode JsGetTypedArrayStorage(JsValueRef v, unsigned char** buf,
                                   unsigned int* len, JsTypedArrayType* ta,
                                   int* eltSize) {
    if (!v || !v->value) return JsErrorInvalidArgument;
    JSObjectRef o = JSValueToObject(g_ctx, v->value, nullptr);
    if (!o) return JsErrorInvalidArgument;
    if (buf)    *buf    = static_cast<unsigned char*>(JSObjectGetTypedArrayBytesPtr(g_ctx, o, nullptr));
    size_t byteLen = JSObjectGetTypedArrayByteLength(g_ctx, o, nullptr);
    JSTypedArrayType jt = JSValueGetTypedArrayType(g_ctx, v->value, nullptr);
    int sz = 1;
    switch (jt) {
        case kJSTypedArrayTypeInt8Array:        sz = 1; if (ta) *ta = JsArrayTypeInt8;        break;
        case kJSTypedArrayTypeUint8Array:       sz = 1; if (ta) *ta = JsArrayTypeUint8;       break;
        case kJSTypedArrayTypeUint8ClampedArray: sz = 1; if (ta) *ta = JsArrayTypeUint8Clamped; break;
        case kJSTypedArrayTypeInt16Array:       sz = 2; if (ta) *ta = JsArrayTypeInt16;       break;
        case kJSTypedArrayTypeUint16Array:      sz = 2; if (ta) *ta = JsArrayTypeUint16;      break;
        case kJSTypedArrayTypeInt32Array:       sz = 4; if (ta) *ta = JsArrayTypeInt32;       break;
        case kJSTypedArrayTypeUint32Array:      sz = 4; if (ta) *ta = JsArrayTypeUint32;      break;
        case kJSTypedArrayTypeFloat32Array:     sz = 4; if (ta) *ta = JsArrayTypeFloat32;     break;
        case kJSTypedArrayTypeFloat64Array:     sz = 8; if (ta) *ta = JsArrayTypeFloat64;     break;
        default:                                sz = 1; if (ta) *ta = JsArrayTypeUint8;       break;
    }
    if (eltSize) *eltSize = sz;
    if (len)     *len     = static_cast<unsigned>(byteLen / sz);
    return JsNoError;
}

JsErrorCode JsGetDataViewStorage(JsValueRef v, unsigned char** buf,
                                 unsigned int* len) {
    // JSC's public API doesn't expose DataView storage directly; return the
    // backing ArrayBuffer for now (caller's downstream uses are rare in our
    // shared layer).
    if (!v || !v->value) return JsErrorInvalidArgument;
    return JsGetArrayBufferStorage(v, buf, len);
}

// ============================================================================
// External objects (opaque JSObject with private data + finalizer)
// ============================================================================
JsErrorCode JsCreateExternalObject(void* data, void (*finalize)(void*),
                                   JsValueRef* out) {
    JSObjectRef o = JSObjectMake(g_ctx, ExternalObjectClass(), data);
    g_extFinalizers[data] = {finalize, data};
    *out = cc::wrap(o);
    return JsNoError;
}

// ============================================================================
// Properties
// ============================================================================
JsErrorCode JsCreatePropertyId(const char* name, size_t len,
                               JsPropertyIdRef* out) {
    std::string tmp(name, len);
    *out = JSStringCreateWithUTF8CString(tmp.c_str());
    return JsNoError;
}

JsErrorCode JsGetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef* out) {
    if (!obj || !obj->value || !pid) return JsErrorInvalidArgument;
    JSObjectRef o = JSValueToObject(g_ctx, obj->value, nullptr);
    if (!o) return JsErrorInvalidArgument;
    JSValueRef v = JSObjectGetProperty(g_ctx, o, pid, nullptr);
    *out = cc::wrap(v);
    return JsNoError;
}

JsErrorCode JsSetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef v,
                          bool /*strict*/) {
    if (!obj || !obj->value || !pid || !v) return JsErrorInvalidArgument;
    JSObjectRef o = JSValueToObject(g_ctx, obj->value, nullptr);
    if (!o) return JsErrorInvalidArgument;
    JSObjectSetProperty(g_ctx, o, pid, v->value, kJSPropertyAttributeNone, nullptr);
    return JsNoError;
}

JsErrorCode JsHasProperty(JsValueRef obj, JsPropertyIdRef pid, bool* has) {
    if (!obj || !obj->value || !pid) { if (has) *has = false; return JsErrorInvalidArgument; }
    JSObjectRef o = JSValueToObject(g_ctx, obj->value, nullptr);
    if (!o) { if (has) *has = false; return JsErrorInvalidArgument; }
    if (has) *has = JSObjectHasProperty(g_ctx, o, pid);
    return JsNoError;
}

JsErrorCode JsGetIndexedProperty(JsValueRef obj, JsValueRef idx,
                                 JsValueRef* out) {
    if (!obj || !obj->value || !idx) return JsErrorInvalidArgument;
    JSObjectRef o = JSValueToObject(g_ctx, obj->value, nullptr);
    if (!o) return JsErrorInvalidArgument;
    unsigned i = static_cast<unsigned>(JSValueToNumber(g_ctx, idx->value, nullptr));
    JSValueRef v = JSObjectGetPropertyAtIndex(g_ctx, o, i, nullptr);
    *out = cc::wrap(v);
    return JsNoError;
}

JsErrorCode JsSetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef v) {
    if (!obj || !obj->value || !idx || !v) return JsErrorInvalidArgument;
    JSObjectRef o = JSValueToObject(g_ctx, obj->value, nullptr);
    if (!o) return JsErrorInvalidArgument;
    unsigned i = static_cast<unsigned>(JSValueToNumber(g_ctx, idx->value, nullptr));
    JSObjectSetPropertyAtIndex(g_ctx, o, i, v->value, nullptr);
    return JsNoError;
}

// ============================================================================
// Function calling / construction
// ============================================================================
JsErrorCode JsCallFunction(JsValueRef fn, JsValueRef* args,
                           unsigned short argCount, JsValueRef* out) {
    if (!fn || !fn->value) return JsErrorInvalidArgument;
    JSObjectRef fno = JSValueToObject(g_ctx, fn->value, nullptr);
    if (!fno) return JsErrorInvalidArgument;
    std::vector<JSValueRef> argv;
    JSValueRef thisVal = JSValueMakeUndefined(g_ctx);
    int start = 0;
    if (argCount > 0 && args && args[0]) {
        thisVal = args[0]->value ? args[0]->value : JSValueMakeUndefined(g_ctx);
        start = 1;
    }
    argv.reserve(argCount > 0 ? argCount - 1 : 0);
    for (int i = start; i < argCount; ++i) {
        argv.push_back(args[i] && args[i]->value ? args[i]->value : JSValueMakeUndefined(g_ctx));
    }
    JSValueRef exc = nullptr;
    JSObjectRef thisObj = JSValueIsObject(g_ctx, thisVal)
        ? JSValueToObject(g_ctx, thisVal, nullptr) : nullptr;
    JSValueRef res = JSObjectCallAsFunction(g_ctx, fno, thisObj,
                                            argv.size(), argv.data(), &exc);
    if (exc) {
        g_exception = exc;
        JSValueProtect(g_ctx, exc);
        if (out) *out = cc::wrap(JSValueMakeUndefined(g_ctx));
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(res);
    return JsNoError;
}

JsErrorCode JsConstructObject(JsValueRef ctor, JsValueRef* args,
                              unsigned short argCount, JsValueRef* out) {
    if (!ctor || !ctor->value) return JsErrorInvalidArgument;
    JSObjectRef co = JSValueToObject(g_ctx, ctor->value, nullptr);
    if (!co) return JsErrorInvalidArgument;
    std::vector<JSValueRef> argv;
    argv.reserve(argCount);
    for (int i = 0; i < argCount; ++i) {
        argv.push_back(args[i] && args[i]->value ? args[i]->value : JSValueMakeUndefined(g_ctx));
    }
    JSValueRef exc = nullptr;
    JSObjectRef obj = JSObjectCallAsConstructor(g_ctx, co, argv.size(), argv.data(), &exc);
    if (exc) {
        g_exception = exc;
        JSValueProtect(g_ctx, exc);
        if (out) *out = cc::wrap(JSValueMakeUndefined(g_ctx));
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(obj);
    return JsNoError;
}

JsErrorCode JsCreateNamedFunction(JsValueRef name, JsNativeFunction fn,
                                  void* state, JsValueRef* out) {
    JSStringRef nameStr = nullptr;
    if (name && name->value) {
        nameStr = JSValueToStringCopy(g_ctx, name->value, nullptr);
    }
    JSObjectRef f = JSObjectMakeFunctionWithCallback(g_ctx, nameStr, &DispatchNativeFn);
    if (nameStr) JSStringRelease(nameStr);
    g_fnCallbacks[f] = {fn, state};
    *out = cc::wrap(f);
    return JsNoError;
}

// ============================================================================
// Exceptions
// ============================================================================
JsErrorCode JsHasException(bool* has) { if (has) *has = g_exception != nullptr; return JsNoError; }
JsErrorCode JsGetAndClearException(JsValueRef* out) {
    if (g_exception) {
        *out = cc::wrap(g_exception);
        JSValueUnprotect(g_ctx, g_exception);
        g_exception = nullptr;
    } else {
        *out = cc::wrap(JSValueMakeUndefined(g_ctx));
    }
    return JsNoError;
}
JsErrorCode JsGetAndClearExceptionWithMetadata(JsValueRef* out) {
    return JsGetAndClearException(out);
}

// ============================================================================
// Promises
// ============================================================================
JsErrorCode JsCreatePromise(JsValueRef* promise, JsValueRef* resolve,
                            JsValueRef* reject) {
    // Use a small JS snippet to capture the executor's resolve/reject.
    const char* src =
        "(function(){var r,e;"
        "var p=new Promise(function(_r,_e){r=_r;e=_e;});"
        "return [p,r,e];})();";
    JSStringRef s = JSStringCreateWithUTF8CString(src);
    JSValueRef exc = nullptr;
    JSValueRef triple = JSEvaluateScript(g_ctx, s, nullptr, nullptr, 1, &exc);
    JSStringRelease(s);
    if (!triple || exc) {
        if (promise) *promise = cc::wrap(JSValueMakeUndefined(g_ctx));
        if (resolve) *resolve = cc::wrap(JSValueMakeUndefined(g_ctx));
        if (reject)  *reject  = cc::wrap(JSValueMakeUndefined(g_ctx));
        return JsErrorScriptException;
    }
    JSObjectRef trip = JSValueToObject(g_ctx, triple, nullptr);
    if (promise) *promise = cc::wrap(JSObjectGetPropertyAtIndex(g_ctx, trip, 0, nullptr));
    if (resolve) *resolve = cc::wrap(JSObjectGetPropertyAtIndex(g_ctx, trip, 1, nullptr));
    if (reject)  *reject  = cc::wrap(JSObjectGetPropertyAtIndex(g_ctx, trip, 2, nullptr));
    return JsNoError;
}

JsErrorCode JsSetPromiseContinuationCallback(PromiseContinuationCallback cb,
                                             void* state) {
    g_promiseCb = cb; g_promiseCbState = state;
    // JSC drives its own microtask queue internally; nothing to wire.
    return JsNoError;
}

// ============================================================================
// Equality
// ============================================================================
JsErrorCode JsEquals(JsValueRef a, JsValueRef b, bool* out) {
    if (!a || !b) { if (out) *out = false; return JsErrorInvalidArgument; }
    if (out) *out = JSValueIsStrictEqual(g_ctx, a->value, b->value);
    return JsNoError;
}

// ============================================================================
// Runtime / context lifecycle
// ============================================================================
JsErrorCode JsCreateRuntime(JsRuntimeAttribute /*attrs*/, void* /*allocators*/,
                            JsRuntimeHandle* out) {
    if (!g_group) g_group = JSContextGroupCreate();
    *out = g_group;
    return JsNoError;
}
JsErrorCode JsCreateContext(JsRuntimeHandle rt, JsContextRef* out) {
    JSGlobalContextRef c = JSGlobalContextCreateInGroup(rt, nullptr);
    *out = c;
    return JsNoError;
}
JsErrorCode JsSetCurrentContext(JsContextRef ctx) {
    g_ctx = ctx;
    return JsNoError;
}
JsErrorCode JsDisposeRuntime(JsRuntimeHandle rt) {
    if (rt) JSContextGroupRelease(rt);
    if (rt == g_group) g_group = nullptr;
    return JsNoError;
}

// ============================================================================
// Script execution
// ============================================================================
JsErrorCode JsRun(JsValueRef src, JsSourceContext /*srcCtx*/, JsValueRef url,
                  JsParseScriptAttribute /*attrs*/, JsValueRef* out) {
    if (!src || !src->value) return JsErrorInvalidArgument;
    JSStringRef code = JSValueToStringCopy(g_ctx, src->value, nullptr);
    JSStringRef src_url = nullptr;
    if (url && url->value) {
        src_url = JSValueToStringCopy(g_ctx, url->value, nullptr);
    }
    JSValueRef exc = nullptr;
    JSValueRef result = JSEvaluateScript(g_ctx, code, nullptr, src_url, 1, &exc);
    if (code) JSStringRelease(code);
    if (src_url) JSStringRelease(src_url);
    if (exc) {
        g_exception = exc;
        JSValueProtect(g_ctx, exc);
        if (out) *out = cc::wrap(JSValueMakeUndefined(g_ctx));
        return JsErrorScriptException;
    }
    if (out) *out = cc::wrap(result);
    return JsNoError;
}

// ============================================================================
// Module APIs (stubs — JSC's public C API does not expose ES module loading;
// the host uses JsRun for everything in this fork).
// ============================================================================
JsErrorCode JsInitializeModuleRecord(JsModuleRecord, JsValueRef,
                                     JsModuleRecord* out) {
    if (out) *out = nullptr;
    return JsNoError;
}
JsErrorCode JsSetModuleHostInfo(JsModuleRecord, JsModuleHostInfoKind, void*) {
    return JsNoError;
}
JsErrorCode JsParseModuleSource(JsModuleRecord, JsSourceContext,
                                const unsigned char*, unsigned int,
                                JsParseScriptAttribute, JsValueRef* err) {
    if (err) *err = nullptr;
    return JsNoError;
}
JsErrorCode JsModuleEvaluation(JsModuleRecord, JsValueRef* out) {
    if (out) *out = nullptr;
    return JsNoError;
}
JsErrorCode JsGetModuleNamespace(JsModuleRecord, JsValueRef* out) {
    if (out) *out = nullptr;
    return JsNoError;
}
