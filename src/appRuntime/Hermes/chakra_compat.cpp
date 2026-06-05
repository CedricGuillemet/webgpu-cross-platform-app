#include "chakra_compat.h"

#include <jsi/jsi.h>
#include <cstdio>
#include <cstring>
#include <new>
#include <vector>

using namespace facebook::jsi;

namespace {
    Runtime* g_rt = nullptr;

    struct Trampoline { JsNativeFunction fn; void* state; };
    std::vector<Trampoline>& trampolines() {
        static std::vector<Trampoline> t;
        return t;
    }

    bool g_hasPending = false;
    // Heap-allocated to defer destruction until process teardown.
    Value* g_pending = nullptr;
}

namespace cc {
    void     setRuntime(Runtime* rt) { g_rt = rt; }
    Runtime* runtime() { return g_rt; }

    JsValueRef wrap(Value v) {
        auto* o = new JsValueObj{};
        new (o->storage) Value(std::move(v));
        o->inited = true;
        o->rc = 1;
        return o;
    }
    JsValueRef wrapCopy(const Value& v) {
        return wrap(Value(*g_rt, v));
    }
    Value& raw(JsValueRef r) {
        static Value undef;
        if (!r || !r->inited) return undef;
        return r->v();
    }
    const Value& rawConst(JsValueRef r) {
        static const Value undef;
        if (!r || !r->inited) return undef;
        return r->v();
    }

    void setPendingException(Value v) {
        if (!g_pending) g_pending = new Value();
        *g_pending = std::move(v);
        g_hasPending = true;
    }
    bool hasPendingException() { return g_hasPending && g_pending; }
    Value takePendingException() {
        if (!g_pending) return Value::undefined();
        Value out = std::move(*g_pending);
        g_hasPending = false;
        return out;
    }
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
        if (ref->inited) {
            ref->v().~Value();
            ref->inited = false;
        }
        delete ref;
    }
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Primitives
// ----------------------------------------------------------------------------
JsErrorCode JsGetUndefinedValue(JsValueRef* out) { *out = cc::wrap(Value::undefined()); return JsNoError; }
JsErrorCode JsGetNullValue(JsValueRef* out)      { *out = cc::wrap(Value::null());      return JsNoError; }
JsErrorCode JsBoolToBoolean(bool b, JsValueRef* out) { *out = cc::wrap(Value(b)); return JsNoError; }
JsErrorCode JsBooleanToBool(JsValueRef v, bool* out) {
    if (!v) { *out = false; return JsErrorInvalidArgument; }
    const Value& val = cc::rawConst(v);
    if (val.isBool()) *out = val.getBool();
    else *out = val.isUndefined() ? false : (val.isNull() ? false : true);
    return JsNoError;
}
JsErrorCode JsIntToNumber(int v, JsValueRef* out)    { *out = cc::wrap(Value((double)v)); return JsNoError; }
JsErrorCode JsDoubleToNumber(double v, JsValueRef* out) { *out = cc::wrap(Value(v)); return JsNoError; }
JsErrorCode JsNumberToInt(JsValueRef v, int* out) {
    if (!v) { *out = 0; return JsErrorInvalidArgument; }
    const Value& val = cc::rawConst(v);
    if (val.isNumber()) { *out = (int)val.getNumber(); return JsNoError; }
    *out = 0; return JsNoError;
}
JsErrorCode JsNumberToDouble(JsValueRef v, double* out) {
    if (!v) { *out = 0; return JsErrorInvalidArgument; }
    const Value& val = cc::rawConst(v);
    if (val.isNumber()) { *out = val.getNumber(); return JsNoError; }
    *out = 0; return JsNoError;
}
JsErrorCode JsConvertValueToBoolean(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    const Value& val = cc::rawConst(v);
    bool b = false;
    if (val.isBool()) b = val.getBool();
    else if (val.isNumber()) b = val.getNumber() != 0.0;
    else if (val.isString()) b = val.getString(*g_rt).utf8(*g_rt).size() > 0;
    else if (val.isObject()) b = true;
    *out = cc::wrap(Value(b));
    return JsNoError;
}
JsErrorCode JsConvertValueToNumber(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    const Value& val = cc::rawConst(v);
    double d = 0;
    if (val.isNumber()) d = val.getNumber();
    else if (val.isBool()) d = val.getBool() ? 1 : 0;
    else if (val.isString()) {
        try { d = std::stod(val.getString(*g_rt).utf8(*g_rt)); } catch(...) {}
    }
    *out = cc::wrap(Value(d));
    return JsNoError;
}
JsErrorCode JsConvertValueToString(JsValueRef v, JsValueRef* out) {
    if (!v) return JsErrorInvalidArgument;
    try {
        const Value& val = cc::rawConst(v);
        std::string s;
        if (val.isString()) s = val.getString(*g_rt).utf8(*g_rt);
        else if (val.isNumber()) { char buf[64]; std::snprintf(buf, 64, "%g", val.getNumber()); s = buf; }
        else if (val.isBool()) s = val.getBool() ? "true" : "false";
        else if (val.isUndefined()) s = "undefined";
        else if (val.isNull()) s = "null";
        else if (val.isObject()) {
            // Call toString
            auto obj = val.getObject(*g_rt);
            auto ts = obj.getProperty(*g_rt, "toString");
            if (ts.isObject() && ts.getObject(*g_rt).isFunction(*g_rt)) {
                Value r = ts.getObject(*g_rt).getFunction(*g_rt).callWithThis(*g_rt, obj);
                if (r.isString()) s = r.getString(*g_rt).utf8(*g_rt);
                else s = "[object]";
            } else s = "[object]";
        }
        *out = cc::wrap(Value(String::createFromUtf8(*g_rt, s)));
        return JsNoError;
    } catch (const JSError& e) {
        cc::setPendingException(Value(*g_rt, e.value()));
        return JsErrorScriptException;
    } catch (...) {
        return JsErrorScriptException;
    }
}

// ----------------------------------------------------------------------------
// Strings
// ----------------------------------------------------------------------------
JsErrorCode JsCreateString(const char* s, size_t len, JsValueRef* out) {
    try {
        *out = cc::wrap(Value(String::createFromUtf8(*g_rt, (const uint8_t*)s, len)));
        return JsNoError;
    } catch (...) { return JsErrorOutOfMemory; }
}
JsErrorCode JsCopyString(JsValueRef v, char* buf, size_t bufSize, size_t* outLen) {
    if (!v) { if (outLen) *outLen = 0; return JsErrorInvalidArgument; }
    try {
        const Value& val = cc::rawConst(v);
        std::string s;
        if (val.isString()) s = val.getString(*g_rt).utf8(*g_rt);
        else {
            JsValueRef strRef = nullptr;
            JsConvertValueToString(v, &strRef);
            if (strRef) {
                s = cc::rawConst(strRef).getString(*g_rt).utf8(*g_rt);
                JsRelease(strRef, nullptr);
            }
        }
        if (buf && bufSize > 0) {
            size_t n = (s.size() < bufSize) ? s.size() : bufSize;
            std::memcpy(buf, s.data(), n);
        }
        if (outLen) *outLen = s.size();
        return JsNoError;
    } catch (...) { if (outLen) *outLen = 0; return JsErrorScriptException; }
}

// ----------------------------------------------------------------------------
// Type
// ----------------------------------------------------------------------------
JsErrorCode JsGetValueType(JsValueRef v, JsValueType* out) {
    if (!v) { *out = JsUndefined; return JsErrorInvalidArgument; }
    const Value& val = cc::rawConst(v);
    if (val.isUndefined()) *out = JsUndefined;
    else if (val.isNull())     *out = JsNull;
    else if (val.isBool())     *out = JsBoolean;
    else if (val.isNumber())   *out = JsNumber;
    else if (val.isString())   *out = JsString;
    else if (val.isSymbol())   *out = JsSymbol;
    else if (val.isObject()) {
        try {
            const Object& obj = val.getObject(*g_rt);
            if (obj.isFunction(*g_rt))    *out = JsFunction;
            else if (obj.isArray(*g_rt))  *out = JsArray;
            else if (obj.isArrayBuffer(*g_rt)) *out = JsArrayBuffer;
            else if (obj.isTypedArray(*g_rt))  *out = JsTypedArray;
            else *out = JsObject;
        } catch (...) { *out = JsObject; }
    } else *out = JsObject;
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Objects / arrays
// ----------------------------------------------------------------------------
JsErrorCode JsGetGlobalObject(JsValueRef* out) {
    *out = cc::wrap(Value(g_rt->global())); return JsNoError;
}
JsErrorCode JsCreateObject(JsValueRef* out) {
    *out = cc::wrap(Value(Object(*g_rt))); return JsNoError;
}
JsErrorCode JsCreateArray(unsigned int len, JsValueRef* out) {
    *out = cc::wrap(Value(Array(*g_rt, (size_t)len))); return JsNoError;
}

// ----------------------------------------------------------------------------
// Array buffers — JSI supports ArrayBuffer via MutableBuffer.
// ----------------------------------------------------------------------------
namespace {
    class HeapBuffer : public MutableBuffer {
    public:
        HeapBuffer(size_t n) : data_(new uint8_t[n]()), size_(n) {}
        ~HeapBuffer() override { delete[] data_; }
        size_t size() const override { return size_; }
        uint8_t* data() override { return data_; }
    private:
        uint8_t* data_;
        size_t   size_;
    };
}
JsErrorCode JsCreateArrayBuffer(unsigned int size, JsValueRef* out) {
    try {
        auto buf = std::make_shared<HeapBuffer>(size);
        *out = cc::wrap(Value(ArrayBuffer(*g_rt, buf)));
        return JsNoError;
    } catch (...) { return JsErrorOutOfMemory; }
}
JsErrorCode JsCreateExternalArrayBuffer(void* data, unsigned int size,
                                        void (*finalize)(void*), void* state, JsValueRef* out) {
    // Copy into a managed buffer — JSI MutableBuffer subclass.
    try {
        auto buf = std::make_shared<HeapBuffer>(size);
        if (data && size > 0) std::memcpy(buf->data(), data, size);
        if (finalize) finalize(state);
        *out = cc::wrap(Value(ArrayBuffer(*g_rt, buf)));
        return JsNoError;
    } catch (...) { return JsErrorOutOfMemory; }
}
JsErrorCode JsCreateTypedArray(JsTypedArrayType ta, JsValueRef ab,
                               unsigned int byteOffset, unsigned int len, JsValueRef* out) {
    // JSI exposes only Uint8Array natively. For other types, construct via JS:
    //   new <CtorName>(buffer, byteOffset, length)
    if (!ab) return JsErrorInvalidArgument;
    try {
        const char* ctorName = "Uint8Array";
        switch (ta) {
            case JsArrayTypeInt8:         ctorName = "Int8Array";         break;
            case JsArrayTypeUint8:        ctorName = "Uint8Array";        break;
            case JsArrayTypeUint8Clamped: ctorName = "Uint8ClampedArray"; break;
            case JsArrayTypeInt16:        ctorName = "Int16Array";        break;
            case JsArrayTypeUint16:       ctorName = "Uint16Array";       break;
            case JsArrayTypeInt32:        ctorName = "Int32Array";        break;
            case JsArrayTypeUint32:       ctorName = "Uint32Array";       break;
            case JsArrayTypeFloat32:      ctorName = "Float32Array";      break;
            case JsArrayTypeFloat64:      ctorName = "Float64Array";      break;
        }
        Object global = g_rt->global();
        Value ctorV = global.getProperty(*g_rt, ctorName);
        if (!ctorV.isObject() || !ctorV.getObject(*g_rt).isFunction(*g_rt)) {
            return JsErrorScriptException;
        }
        Function ctor = ctorV.getObject(*g_rt).getFunction(*g_rt);
        const Value& abVal = cc::rawConst(ab);
        Value argsArr[3] = { Value(*g_rt, abVal), Value((double)byteOffset), Value((double)len) };
        Value r = ctor.callAsConstructor(*g_rt, (const Value*)argsArr, (size_t)3);
        *out = cc::wrap(std::move(r));
        return JsNoError;
    } catch (const JSError& e) {
        cc::setPendingException(Value(*g_rt, e.value()));
        return JsErrorScriptException;
    } catch (...) { return JsErrorScriptException; }
}
JsErrorCode JsGetArrayBufferStorage(JsValueRef v, unsigned char** buf, unsigned int* len) {
    if (!v) return JsErrorInvalidArgument;
    try {
        const Value& val = cc::rawConst(v);
        if (!val.isObject()) return JsErrorInvalidArgument;
        Object obj = val.getObject(*g_rt);
        if (!obj.isArrayBuffer(*g_rt)) return JsErrorInvalidArgument;
        ArrayBuffer ab = obj.getArrayBuffer(*g_rt);
        if (buf) *buf = ab.data(*g_rt);
        if (len) *len = (unsigned)ab.size(*g_rt);
        return JsNoError;
    } catch (...) { return JsErrorInvalidArgument; }
}
JsErrorCode JsGetTypedArrayStorage(JsValueRef v, unsigned char** buf, unsigned int* len,
                                   JsTypedArrayType* ta, int* eltSize) {
    if (!v) return JsErrorInvalidArgument;
    try {
        const Value& val = cc::rawConst(v);
        if (!val.isObject()) return JsErrorInvalidArgument;
        Object obj = val.getObject(*g_rt);
        if (!obj.isTypedArray(*g_rt)) return JsErrorInvalidArgument;
        TypedArray arr = obj.asTypedArray(*g_rt);
        ArrayBuffer ab = arr.buffer(*g_rt);
        size_t off = arr.byteOffset(*g_rt);
        size_t byteLen = arr.byteLength(*g_rt);
        if (buf) *buf = ab.data(*g_rt) + off;
        if (len) *len = (unsigned)byteLen;
        // We can only definitively detect Uint8Array via JSI's public API.
        // For others, read the constructor.name property.
        if (ta || eltSize) {
            // Default fallback
            JsTypedArrayType type = JsArrayTypeUint8;
            int sz = 1;
            try {
                Value ctor = obj.getProperty(*g_rt, "constructor");
                if (ctor.isObject()) {
                    Value nameV = ctor.getObject(*g_rt).getProperty(*g_rt, "name");
                    if (nameV.isString()) {
                        std::string n = nameV.getString(*g_rt).utf8(*g_rt);
                        if      (n == "Int8Array")         { type = JsArrayTypeInt8;         sz = 1; }
                        else if (n == "Uint8Array")        { type = JsArrayTypeUint8;        sz = 1; }
                        else if (n == "Uint8ClampedArray") { type = JsArrayTypeUint8Clamped; sz = 1; }
                        else if (n == "Int16Array")        { type = JsArrayTypeInt16;        sz = 2; }
                        else if (n == "Uint16Array")       { type = JsArrayTypeUint16;       sz = 2; }
                        else if (n == "Int32Array")        { type = JsArrayTypeInt32;        sz = 4; }
                        else if (n == "Uint32Array")       { type = JsArrayTypeUint32;       sz = 4; }
                        else if (n == "Float32Array")      { type = JsArrayTypeFloat32;      sz = 4; }
                        else if (n == "Float64Array")      { type = JsArrayTypeFloat64;      sz = 8; }
                    }
                }
            } catch (...) {}
            if (ta) *ta = type;
            if (eltSize) *eltSize = sz;
        }
        return JsNoError;
    } catch (...) { return JsErrorInvalidArgument; }
}
JsErrorCode JsGetDataViewStorage(JsValueRef v, unsigned char** buf, unsigned int* len) {
    // Same approach as TypedArray — extract buffer + byteOffset + byteLength props.
    if (!v) return JsErrorInvalidArgument;
    try {
        const Value& val = cc::rawConst(v);
        if (!val.isObject()) return JsErrorInvalidArgument;
        Object obj = val.getObject(*g_rt);
        Value bv = obj.getProperty(*g_rt, "buffer");
        if (!bv.isObject()) return JsErrorInvalidArgument;
        Object bObj = bv.getObject(*g_rt);
        if (!bObj.isArrayBuffer(*g_rt)) return JsErrorInvalidArgument;
        ArrayBuffer ab = bObj.getArrayBuffer(*g_rt);
        Value offV = obj.getProperty(*g_rt, "byteOffset");
        Value lenV = obj.getProperty(*g_rt, "byteLength");
        size_t off = offV.isNumber() ? (size_t)offV.getNumber() : 0;
        size_t lenSz = lenV.isNumber() ? (size_t)lenV.getNumber() : 0;
        if (buf) *buf = ab.data(*g_rt) + off;
        if (len) *len = (unsigned)lenSz;
        return JsNoError;
    } catch (...) { return JsErrorInvalidArgument; }
}

// ----------------------------------------------------------------------------
// External objects — JSI HostObject pattern
// ----------------------------------------------------------------------------
namespace {
    class External : public HostObject {
    public:
        External(void* d, void(*f)(void*)) : data_(d), fin_(f) {}
        ~External() override { if (fin_) fin_(data_); }
        void* data() const { return data_; }
    private:
        void* data_;
        void (*fin_)(void*);
    };
}
JsErrorCode JsCreateExternalObject(void* data, void (*finalize)(void*), JsValueRef* out) {
    try {
        auto ho = std::make_shared<External>(data, finalize);
        *out = cc::wrap(Value(Object::createFromHostObject(*g_rt, ho)));
        return JsNoError;
    } catch (...) { return JsErrorOutOfMemory; }
}

// ----------------------------------------------------------------------------
// Properties
// ----------------------------------------------------------------------------
JsErrorCode JsCreatePropertyId(const char* name, size_t len, JsPropertyIdRef* out) {
    char* copy = new char[len + 1];
    std::memcpy(copy, name, len);
    copy[len] = 0;
    *out = copy;
    return JsNoError;
}
JsErrorCode JsGetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef* out) {
    if (!obj) { *out = cc::wrap(Value::undefined()); return JsErrorInvalidArgument; }
    try {
        const Value& v = cc::rawConst(obj);
        if (!v.isObject()) { *out = cc::wrap(Value::undefined()); return JsNoError; }
        Object o = v.getObject(*g_rt);
        Value r = o.getProperty(*g_rt, pid);
        *out = cc::wrap(std::move(r));
        return JsNoError;
    } catch (...) { *out = cc::wrap(Value::undefined()); return JsErrorScriptException; }
}
JsErrorCode JsSetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef v, bool) {
    if (!obj || !v) return JsErrorInvalidArgument;
    try {
        const Value& ov = cc::rawConst(obj);
        if (!ov.isObject()) return JsErrorInvalidArgument;
        Object o = ov.getObject(*g_rt);
        o.setProperty(*g_rt, pid, cc::rawConst(v));
        return JsNoError;
    } catch (...) { return JsErrorScriptException; }
}
JsErrorCode JsHasProperty(JsValueRef obj, JsPropertyIdRef pid, bool* has) {
    if (!obj) { *has = false; return JsErrorInvalidArgument; }
    try {
        const Value& v = cc::rawConst(obj);
        if (!v.isObject()) { *has = false; return JsNoError; }
        *has = v.getObject(*g_rt).hasProperty(*g_rt, pid);
        return JsNoError;
    } catch (...) { *has = false; return JsErrorScriptException; }
}
JsErrorCode JsGetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef* out) {
    if (!obj || !idx) { *out = cc::wrap(Value::undefined()); return JsErrorInvalidArgument; }
    try {
        const Value& v = cc::rawConst(obj);
        if (!v.isObject()) { *out = cc::wrap(Value::undefined()); return JsNoError; }
        Object o = v.getObject(*g_rt);
        unsigned i = (unsigned)cc::rawConst(idx).asNumber();
        if (o.isArray(*g_rt)) {
            Value r = o.asArray(*g_rt).getValueAtIndex(*g_rt, i);
            *out = cc::wrap(std::move(r));
        } else {
            char buf[24]; std::snprintf(buf, sizeof(buf), "%u", i);
            Value r = o.getProperty(*g_rt, buf);
            *out = cc::wrap(std::move(r));
        }
        return JsNoError;
    } catch (...) { *out = cc::wrap(Value::undefined()); return JsErrorScriptException; }
}
JsErrorCode JsSetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef v) {
    if (!obj || !idx || !v) return JsErrorInvalidArgument;
    try {
        const Value& ov = cc::rawConst(obj);
        if (!ov.isObject()) return JsErrorInvalidArgument;
        Object o = ov.getObject(*g_rt);
        unsigned i = (unsigned)cc::rawConst(idx).asNumber();
        if (o.isArray(*g_rt)) o.asArray(*g_rt).setValueAtIndex(*g_rt, i, cc::rawConst(v));
        else {
            char buf[24]; std::snprintf(buf, sizeof(buf), "%u", i);
            o.setProperty(*g_rt, buf, cc::rawConst(v));
        }
        return JsNoError;
    } catch (...) { return JsErrorScriptException; }
}

// ----------------------------------------------------------------------------
// Function calling
// ----------------------------------------------------------------------------
JsErrorCode JsCallFunction(JsValueRef fn, JsValueRef* args, unsigned short argCount, JsValueRef* out) {
    if (!fn) { if (out) *out = nullptr; return JsErrorInvalidArgument; }
    try {
        const Value& fv = cc::rawConst(fn);
        if (!fv.isObject() || !fv.getObject(*g_rt).isFunction(*g_rt)) {
            if (out) *out = nullptr; return JsErrorInvalidArgument;
        }
        Function f = fv.getObject(*g_rt).getFunction(*g_rt);
        Value thisVal = (argCount > 0 && args[0]) ? Value(*g_rt, cc::rawConst(args[0])) : Value::undefined();
        std::vector<Value> argv;
        if (argCount > 0) {
            argv.reserve(argCount - 1);
            for (int i = 1; i < (int)argCount; ++i) {
                argv.emplace_back(args[i] ? Value(*g_rt, cc::rawConst(args[i])) : Value::undefined());
            }
        }
        Value r;
        if (thisVal.isObject()) {
            r = f.callWithThis(*g_rt, thisVal.getObject(*g_rt), (const Value*)argv.data(), (size_t)argv.size());
        } else {
            r = f.call(*g_rt, (const Value*)argv.data(), (size_t)argv.size());
        }
        if (out) *out = cc::wrap(std::move(r));
        return JsNoError;
    } catch (const JSError& e) {
        cc::setPendingException(Value(*g_rt, e.value()));
        if (out) *out = nullptr;
        return JsErrorScriptException;
    } catch (...) {
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
}
JsErrorCode JsConstructObject(JsValueRef ctor, JsValueRef* args, unsigned short argCount, JsValueRef* out) {
    if (!ctor) { if (out) *out = nullptr; return JsErrorInvalidArgument; }
    try {
        const Value& fv = cc::rawConst(ctor);
        if (!fv.isObject() || !fv.getObject(*g_rt).isFunction(*g_rt)) return JsErrorInvalidArgument;
        Function f = fv.getObject(*g_rt).getFunction(*g_rt);
        std::vector<Value> argv;
        if (argCount > 0) {
            argv.reserve(argCount - 1);
            for (int i = 1; i < (int)argCount; ++i) {
                argv.emplace_back(args[i] ? Value(*g_rt, cc::rawConst(args[i])) : Value::undefined());
            }
        }
        Value r = f.callAsConstructor(*g_rt, (const Value*)argv.data(), (size_t)argv.size());
        if (out) *out = cc::wrap(std::move(r));
        return JsNoError;
    } catch (const JSError& e) {
        cc::setPendingException(Value(*g_rt, e.value()));
        if (out) *out = nullptr;
        return JsErrorScriptException;
    } catch (...) {
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
}
JsErrorCode JsCreateNamedFunction(JsValueRef name, JsNativeFunction fn, void* state, JsValueRef* out) {
    try {
        std::string nameStr = "f";
        if (name) {
            const Value& nv = cc::rawConst(name);
            if (nv.isString()) nameStr = nv.getString(*g_rt).utf8(*g_rt);
        }
        Trampoline t{fn, state};
        HostFunctionType host = [t](Runtime& rt, const Value& thisVal,
                                    const Value* args, size_t count) -> Value {
            std::vector<JsValueRef> a(count + 1);
            a[0] = cc::wrap(Value(rt, thisVal));
            for (size_t i = 0; i < count; ++i) a[i + 1] = cc::wrap(Value(rt, args[i]));
            JsValueRef ret = t.fn(nullptr, false, a.data(), (unsigned short)(count + 1), t.state);
            Value rv = ret ? Value(rt, cc::rawConst(ret)) : Value::undefined();
            for (auto& v : a) if (v) JsRelease(v, nullptr);
            if (ret) JsRelease(ret, nullptr);
            return rv;
        };
        Function f = Function::createFromHostFunction(*g_rt,
            PropNameID::forUtf8(*g_rt, nameStr), 0, std::move(host));
        *out = cc::wrap(Value(std::move(f)));
        return JsNoError;
    } catch (...) { return JsErrorOutOfMemory; }
}

// ----------------------------------------------------------------------------
// Exceptions
// ----------------------------------------------------------------------------
JsErrorCode JsHasException(bool* has) { *has = cc::hasPendingException(); return JsNoError; }
JsErrorCode JsGetAndClearException(JsValueRef* out) {
    if (cc::hasPendingException()) {
        *out = cc::wrap(cc::takePendingException());
    } else {
        *out = cc::wrap(Value::undefined());
    }
    return JsNoError;
}
JsErrorCode JsGetAndClearExceptionWithMetadata(JsValueRef* out) {
    try {
        Object meta(*g_rt);
        Value ex = cc::hasPendingException() ? cc::takePendingException() : Value::undefined();
        meta.setProperty(*g_rt, "exception", ex);
        meta.setProperty(*g_rt, "line",   Value(0.0));
        meta.setProperty(*g_rt, "column", Value(0.0));
        meta.setProperty(*g_rt, "source", Value(String::createFromUtf8(*g_rt, "")));
        *out = cc::wrap(Value(std::move(meta)));
        return JsNoError;
    } catch (...) { *out = cc::wrap(Value::undefined()); return JsErrorFatal; }
}

// ----------------------------------------------------------------------------
// Promises — get the global Promise constructor and wrap.
// ----------------------------------------------------------------------------
JsErrorCode JsCreatePromise(JsValueRef* promise, JsValueRef* resolve, JsValueRef* reject) {
    try {
        Object global = g_rt->global();
        Value promiseCtorV = global.getProperty(*g_rt, "Promise");
        if (!promiseCtorV.isObject()) return JsErrorFatal;
        Function promiseCtor = promiseCtorV.getObject(*g_rt).getFunction(*g_rt);

        // We need handles into the resolve/reject functions; capture them via a
        // host executor.
        struct Slots { Value resolve; Value reject; };
        auto slots = std::make_shared<Slots>();
        Function executor = Function::createFromHostFunction(*g_rt,
            PropNameID::forAscii(*g_rt, "_exec"), 2,
            [slots](Runtime& rt, const Value&, const Value* args, size_t n) -> Value {
                if (n >= 2) {
                    slots->resolve = Value(rt, args[0]);
                    slots->reject  = Value(rt, args[1]);
                }
                return Value::undefined();
            });

        Value execV(std::move(executor));
        Value pV = promiseCtor.callAsConstructor(*g_rt, (const Value*)&execV, (size_t)1);
        *promise = cc::wrap(std::move(pV));
        *resolve = cc::wrap(std::move(slots->resolve));
        *reject  = cc::wrap(std::move(slots->reject));
        return JsNoError;
    } catch (...) { return JsErrorFatal; }
}
JsErrorCode JsSetPromiseContinuationCallback(PromiseContinuationCallback, void*) {
    // Hermes drains microtasks via drainMicrotasks; no continuation hook needed.
    return JsNoError;
}

// ----------------------------------------------------------------------------
// Equality
// ----------------------------------------------------------------------------
JsErrorCode JsEquals(JsValueRef a, JsValueRef b, bool* out) {
    if (!a || !b) { *out = false; return JsErrorInvalidArgument; }
    try {
        *out = Value::strictEquals(*g_rt, cc::rawConst(a), cc::rawConst(b));
        return JsNoError;
    } catch (...) { *out = false; return JsErrorScriptException; }
}

// ----------------------------------------------------------------------------
// Runtime/context lifecycle — Hermes has no separate context.
// ----------------------------------------------------------------------------
JsErrorCode JsCreateRuntime(JsRuntimeAttribute, void*, JsRuntimeHandle* out) {
    // Worker support would require a new HermesRuntime — punted for now.
    *out = nullptr;
    return JsErrorFatal;
}
JsErrorCode JsCreateContext(JsRuntimeHandle, JsContextRef* out)        { *out = nullptr; return JsNoError; }
JsErrorCode JsSetCurrentContext(JsContextRef)                          { return JsNoError; }
JsErrorCode JsDisposeRuntime(JsRuntimeHandle)                          { return JsNoError; }
JsErrorCode JsRun(JsValueRef src, JsSourceContext, JsValueRef url,
                  JsParseScriptAttribute, JsValueRef* out) {
    if (!src) return JsErrorInvalidArgument;
    try {
        std::string source;
        std::string sourceUrl = "<script>";
        const Value& sv = cc::rawConst(src);
        if (sv.isString()) source = sv.getString(*g_rt).utf8(*g_rt);
        if (url) {
            const Value& uv = cc::rawConst(url);
            if (uv.isString()) sourceUrl = uv.getString(*g_rt).utf8(*g_rt);
        }
        auto buf = std::make_shared<StringBuffer>(source);
        Value r = g_rt->evaluateJavaScript(buf, sourceUrl);
        if (out) *out = cc::wrap(std::move(r));
        return JsNoError;
    } catch (const JSError& e) {
        cc::setPendingException(Value(*g_rt, e.value()));
        if (out) *out = nullptr;
        return JsErrorScriptException;
    } catch (...) {
        if (out) *out = nullptr;
        return JsErrorScriptException;
    }
}

// ----------------------------------------------------------------------------
// Module stubs
// ----------------------------------------------------------------------------
JsErrorCode JsInitializeModuleRecord(JsModuleRecord, JsValueRef, JsModuleRecord* out) {
    if (out) *out = nullptr; return JsNoError;
}
JsErrorCode JsSetModuleHostInfo(JsModuleRecord, JsModuleHostInfoKind, void*) { return JsNoError; }
JsErrorCode JsParseModuleSource(JsModuleRecord, JsSourceContext, const unsigned char*,
                                unsigned int, JsParseScriptAttribute, JsValueRef*) { return JsNoError; }
JsErrorCode JsModuleEvaluation(JsModuleRecord, JsValueRef* out) {
    if (out) *out = cc::wrap(Value::undefined()); return JsNoError;
}
JsErrorCode JsGetModuleNamespace(JsModuleRecord, JsValueRef* out) {
    if (out) *out = cc::wrap(Value::undefined()); return JsNoError;
}
