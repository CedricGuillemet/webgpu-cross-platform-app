#pragma once
// ChakraCore-style API surface implemented on top of Hermes JSI (static_h branch).
// JsValueObj wraps a jsi::Value held in a heap slot — same lifetime pattern
// as the QuickJS / V8 ports.

#include <jsi/jsi.h>

#include <cstddef>
#include <cstdint>
#include <cstring>
#include <memory>

namespace facebook { namespace jsi { class Runtime; } }

struct JsValueObj {
    // jsi::Value is move-only; stored in a heap slot so JsValueRef can be a
    // stable pointer. We use placement new/destruct to manage it.
    alignas(facebook::jsi::Value) unsigned char storage[sizeof(facebook::jsi::Value)];
    bool inited = false;
    int  rc = 1;

    facebook::jsi::Value& v() { return *reinterpret_cast<facebook::jsi::Value*>(storage); }
    const facebook::jsi::Value& v() const { return *reinterpret_cast<const facebook::jsi::Value*>(storage); }
};

using JsValueRef       = JsValueObj*;
using JsRuntimeHandle  = facebook::jsi::Runtime*;
using JsContextRef     = void*;
using JsPropertyIdRef  = const char*;
using JsSourceContext  = uintptr_t;
using JsModuleRecord   = void*;

#define JS_INVALID_REFERENCE       nullptr
#define JS_INVALID_RUNTIME_HANDLE  nullptr
#define CHAKRA_CALLBACK            /* nothing */

#ifndef BYTE
typedef unsigned char BYTE;
#endif

typedef enum JsErrorCode {
    JsNoError = 0, JsErrorInvalidArgument = 1, JsErrorScriptException = 2,
    JsErrorScriptCompile = 3, JsErrorOutOfMemory = 4, JsErrorFatal = 5,
    JsErrorInExceptionState = 6,
} JsErrorCode;

typedef enum JsValueType {
    JsUndefined = 0, JsNull = 1, JsNumber = 2, JsString = 3, JsBoolean = 4,
    JsObject = 5, JsFunction = 6, JsError = 7, JsArray = 8, JsSymbol = 9,
    JsArrayBuffer = 10, JsTypedArray = 11, JsDataView = 12,
} JsValueType;

typedef enum JsTypedArrayType {
    JsArrayTypeInt8 = 0, JsArrayTypeUint8 = 1, JsArrayTypeUint8Clamped = 2,
    JsArrayTypeInt16 = 3, JsArrayTypeUint16 = 4, JsArrayTypeInt32 = 5,
    JsArrayTypeUint32 = 6, JsArrayTypeFloat32 = 7, JsArrayTypeFloat64 = 8,
} JsTypedArrayType;

typedef enum JsParseScriptAttribute { JsParseScriptAttributeNone = 0 } JsParseScriptAttribute;
typedef enum JsRuntimeAttribute {
    JsRuntimeAttributeNone = 0, JsRuntimeAttributeAllowScriptInterrupt = 0x10,
} JsRuntimeAttribute;
typedef enum JsModuleHostInfoKind {
    JsModuleHostInfo_FetchImportedModuleCallback              = 0,
    JsModuleHostInfo_FetchImportedModuleFromScriptCallback    = 1,
    JsModuleHostInfo_NotifyModuleReadyCallback                = 2,
    JsModuleHostInfo_Url                                      = 3,
} JsModuleHostInfoKind;

typedef JsValueRef (*JsNativeFunction)(JsValueRef callee, bool isConstructCall,
                                       JsValueRef* arguments, unsigned short argumentCount,
                                       void* callbackState);

namespace cc {
    void                       setRuntime(facebook::jsi::Runtime* rt);
    facebook::jsi::Runtime*    runtime();

    JsValueRef                 wrap(facebook::jsi::Value v);
    JsValueRef                 wrapCopy(const facebook::jsi::Value& v);
    facebook::jsi::Value&      raw(JsValueRef r);
    const facebook::jsi::Value& rawConst(JsValueRef r);

    void                       setPendingException(facebook::jsi::Value v);
    bool                       hasPendingException();
    facebook::jsi::Value       takePendingException();
}

JsErrorCode JsAddRef(JsValueRef ref, unsigned int* count);
JsErrorCode JsRelease(JsValueRef ref, unsigned int* count);
JsErrorCode JsGetUndefinedValue(JsValueRef* out);
JsErrorCode JsGetNullValue(JsValueRef* out);
JsErrorCode JsBoolToBoolean(bool b, JsValueRef* out);
JsErrorCode JsBooleanToBool(JsValueRef v, bool* out);
JsErrorCode JsIntToNumber(int v, JsValueRef* out);
JsErrorCode JsDoubleToNumber(double v, JsValueRef* out);
JsErrorCode JsNumberToInt(JsValueRef v, int* out);
JsErrorCode JsNumberToDouble(JsValueRef v, double* out);
JsErrorCode JsConvertValueToBoolean(JsValueRef v, JsValueRef* out);
JsErrorCode JsConvertValueToNumber(JsValueRef v, JsValueRef* out);
JsErrorCode JsConvertValueToString(JsValueRef v, JsValueRef* out);
JsErrorCode JsCreateString(const char* s, size_t len, JsValueRef* out);
JsErrorCode JsCopyString(JsValueRef v, char* buf, size_t bufSize, size_t* outLen);
JsErrorCode JsGetValueType(JsValueRef v, JsValueType* out);
JsErrorCode JsGetGlobalObject(JsValueRef* out);
JsErrorCode JsCreateObject(JsValueRef* out);
JsErrorCode JsCreateArray(unsigned int len, JsValueRef* out);
JsErrorCode JsCreateArrayBuffer(unsigned int size, JsValueRef* out);
JsErrorCode JsCreateExternalArrayBuffer(void* data, unsigned int size,
                                        void (*finalize)(void*), void* state, JsValueRef* out);
JsErrorCode JsCreateTypedArray(JsTypedArrayType ta, JsValueRef ab,
                               unsigned int byteOffset, unsigned int len, JsValueRef* out);
JsErrorCode JsGetArrayBufferStorage(JsValueRef v, unsigned char** buf, unsigned int* len);
JsErrorCode JsGetTypedArrayStorage(JsValueRef v, unsigned char** buf, unsigned int* len,
                                   JsTypedArrayType* ta, int* eltSize);
JsErrorCode JsGetDataViewStorage(JsValueRef v, unsigned char** buf, unsigned int* len);
JsErrorCode JsCreateExternalObject(void* data, void (*finalize)(void*), JsValueRef* out);
JsErrorCode JsCreatePropertyId(const char* name, size_t len, JsPropertyIdRef* out);
JsErrorCode JsGetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef* out);
JsErrorCode JsSetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef v, bool strict);
JsErrorCode JsHasProperty(JsValueRef obj, JsPropertyIdRef pid, bool* has);
JsErrorCode JsGetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef* out);
JsErrorCode JsSetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef v);
JsErrorCode JsCallFunction(JsValueRef fn, JsValueRef* args, unsigned short argCount, JsValueRef* out);
JsErrorCode JsConstructObject(JsValueRef ctor, JsValueRef* args, unsigned short argCount, JsValueRef* out);
JsErrorCode JsCreateNamedFunction(JsValueRef name, JsNativeFunction fn, void* state, JsValueRef* out);
JsErrorCode JsHasException(bool* has);
JsErrorCode JsGetAndClearException(JsValueRef* out);
JsErrorCode JsGetAndClearExceptionWithMetadata(JsValueRef* out);
JsErrorCode JsCreatePromise(JsValueRef* promise, JsValueRef* resolve, JsValueRef* reject);
typedef void (*PromiseContinuationCallback)(JsValueRef task, void* state);
JsErrorCode JsSetPromiseContinuationCallback(PromiseContinuationCallback cb, void* state);
JsErrorCode JsEquals(JsValueRef a, JsValueRef b, bool* out);
JsErrorCode JsCreateRuntime(JsRuntimeAttribute attrs, void* allocators, JsRuntimeHandle* out);
JsErrorCode JsCreateContext(JsRuntimeHandle rt, JsContextRef* out);
JsErrorCode JsSetCurrentContext(JsContextRef ctx);
JsErrorCode JsDisposeRuntime(JsRuntimeHandle rt);
JsErrorCode JsRun(JsValueRef src, JsSourceContext srcCtx, JsValueRef url,
                  JsParseScriptAttribute attrs, JsValueRef* out);
JsErrorCode JsInitializeModuleRecord(JsModuleRecord, JsValueRef, JsModuleRecord*);
JsErrorCode JsSetModuleHostInfo(JsModuleRecord, JsModuleHostInfoKind, void*);
JsErrorCode JsParseModuleSource(JsModuleRecord, JsSourceContext, const unsigned char*,
                                unsigned int, JsParseScriptAttribute, JsValueRef*);
JsErrorCode JsModuleEvaluation(JsModuleRecord, JsValueRef*);
JsErrorCode JsGetModuleNamespace(JsModuleRecord, JsValueRef*);
