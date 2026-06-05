#pragma once
// ChakraCore-style API surface implemented on top of V8.
// Same interface as the QuickJS chakra_compat.h so the engine-agnostic
// downstream code (wgpu_bridge/dom_shim/worker_shim) compiles unchanged.
//
// Memory model: JsValueObj wraps a v8::Global<v8::Value> (a persistent
// handle that survives across HandleScopes). The wrapper has its own
// refcount; on JsRelease drop to 0 we Reset() the Global and delete the
// wrapper. Transient wrappers that downstream code never JsReleases are
// leaked — same trade-off as the QuickJS port; small fixed cost per frame.
//
// All Js* APIs implicitly create a HandleScope so callers don't have to.

#include <v8.h>
#include <cstddef>
#include <cstdint>
#include <cstring>

struct JsValueObj {
    v8::Global<v8::Value> v;
    int rc;
};

using JsValueRef       = JsValueObj*;
using JsRuntimeHandle  = v8::Isolate*;
using JsContextRef     = void*;     // stored as Global<Context> elsewhere; not used directly outside chakra_host
using JsPropertyIdRef  = const char*;  // we store property names as C strings (HandleScope-safe).
using JsSourceContext  = uintptr_t;
using JsModuleRecord   = void*;

#define JS_INVALID_REFERENCE       nullptr
#define JS_INVALID_RUNTIME_HANDLE  nullptr
#define CHAKRA_CALLBACK            /* nothing */

#ifndef BYTE
typedef unsigned char BYTE;
#endif

typedef enum JsErrorCode {
    JsNoError                = 0,
    JsErrorInvalidArgument   = 1,
    JsErrorScriptException   = 2,
    JsErrorScriptCompile     = 3,
    JsErrorOutOfMemory       = 4,
    JsErrorFatal             = 5,
    JsErrorInExceptionState  = 6,
} JsErrorCode;

typedef enum JsValueType {
    JsUndefined   = 0,
    JsNull        = 1,
    JsNumber      = 2,
    JsString      = 3,
    JsBoolean     = 4,
    JsObject      = 5,
    JsFunction    = 6,
    JsError       = 7,
    JsArray       = 8,
    JsSymbol      = 9,
    JsArrayBuffer = 10,
    JsTypedArray  = 11,
    JsDataView    = 12,
} JsValueType;

typedef enum JsTypedArrayType {
    JsArrayTypeInt8         = 0,
    JsArrayTypeUint8        = 1,
    JsArrayTypeUint8Clamped = 2,
    JsArrayTypeInt16        = 3,
    JsArrayTypeUint16       = 4,
    JsArrayTypeInt32        = 5,
    JsArrayTypeUint32       = 6,
    JsArrayTypeFloat32      = 7,
    JsArrayTypeFloat64      = 8,
} JsTypedArrayType;

typedef enum JsParseScriptAttribute {
    JsParseScriptAttributeNone = 0,
} JsParseScriptAttribute;

typedef enum JsRuntimeAttribute {
    JsRuntimeAttributeNone                  = 0,
    JsRuntimeAttributeAllowScriptInterrupt  = 0x00000010,
} JsRuntimeAttribute;

typedef enum JsModuleHostInfoKind {
    JsModuleHostInfo_FetchImportedModuleCallback           = 0,
    JsModuleHostInfo_FetchImportedModuleFromScriptCallback = 1,
    JsModuleHostInfo_NotifyModuleReadyCallback             = 2,
    JsModuleHostInfo_Url                                   = 3,
} JsModuleHostInfoKind;

typedef JsValueRef (*JsNativeFunction)(JsValueRef callee,
                                       bool isConstructCall,
                                       JsValueRef* arguments,
                                       unsigned short argumentCount,
                                       void* callbackState);

// ---- Internal helpers (chakra_host.cpp uses these) ---------------------------
namespace cc {
    void                       setIsolate(v8::Isolate* iso);
    v8::Isolate*               isolate();
    void                       setContext(v8::Local<v8::Context> ctx);
    v8::Local<v8::Context>     context();

    // Wrap a local handle as a JsValueRef (caller does NOT transfer ownership;
    // we install our own Global<>).
    JsValueRef                 wrap(v8::Local<v8::Value> v);
    // Get the local handle out of a JsValueRef (must be inside a HandleScope
    // backed by the current isolate).
    v8::Local<v8::Value>       raw(JsValueRef r);
} // namespace cc

// ---- Chakra-style API ---------------------------------------------------------
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
                                        void (*finalize)(void*), void* state,
                                        JsValueRef* out);
JsErrorCode JsCreateTypedArray(JsTypedArrayType ta, JsValueRef ab,
                               unsigned int byteOffset, unsigned int len,
                               JsValueRef* out);
JsErrorCode JsGetArrayBufferStorage(JsValueRef v, unsigned char** buf,
                                    unsigned int* len);
JsErrorCode JsGetTypedArrayStorage(JsValueRef v, unsigned char** buf,
                                   unsigned int* len, JsTypedArrayType* ta,
                                   int* eltSize);
JsErrorCode JsGetDataViewStorage(JsValueRef v, unsigned char** buf,
                                 unsigned int* len);

JsErrorCode JsCreateExternalObject(void* data, void (*finalize)(void*),
                                   JsValueRef* out);

JsErrorCode JsCreatePropertyId(const char* name, size_t len, JsPropertyIdRef* out);
JsErrorCode JsGetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef* out);
JsErrorCode JsSetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef v,
                          bool strict);
JsErrorCode JsHasProperty(JsValueRef obj, JsPropertyIdRef pid, bool* has);
JsErrorCode JsGetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef* out);
JsErrorCode JsSetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef v);

JsErrorCode JsCallFunction(JsValueRef fn, JsValueRef* args,
                           unsigned short argCount, JsValueRef* out);
JsErrorCode JsConstructObject(JsValueRef ctor, JsValueRef* args,
                              unsigned short argCount, JsValueRef* out);
JsErrorCode JsCreateNamedFunction(JsValueRef name, JsNativeFunction fn,
                                  void* state, JsValueRef* out);

JsErrorCode JsHasException(bool* has);
JsErrorCode JsGetAndClearException(JsValueRef* out);
JsErrorCode JsGetAndClearExceptionWithMetadata(JsValueRef* out);

JsErrorCode JsCreatePromise(JsValueRef* promise, JsValueRef* resolve, JsValueRef* reject);
typedef void (*PromiseContinuationCallback)(JsValueRef task, void* state);
JsErrorCode JsSetPromiseContinuationCallback(PromiseContinuationCallback cb, void* state);

JsErrorCode JsEquals(JsValueRef a, JsValueRef b, bool* out);

JsErrorCode JsCreateRuntime(JsRuntimeAttribute attrs, void* allocators,
                            JsRuntimeHandle* out);
JsErrorCode JsCreateContext(JsRuntimeHandle rt, JsContextRef* out);
JsErrorCode JsSetCurrentContext(JsContextRef ctx);
JsErrorCode JsDisposeRuntime(JsRuntimeHandle rt);

JsErrorCode JsRun(JsValueRef src, JsSourceContext srcCtx, JsValueRef url,
                  JsParseScriptAttribute attrs, JsValueRef* out);

// Module API stubs (chakra_host on V8 uses native v8 module APIs directly)
JsErrorCode JsInitializeModuleRecord(JsModuleRecord parent, JsValueRef spec,
                                     JsModuleRecord* out);
JsErrorCode JsSetModuleHostInfo(JsModuleRecord rec, JsModuleHostInfoKind kind, void* info);
JsErrorCode JsParseModuleSource(JsModuleRecord rec, JsSourceContext srcCtx,
                                const unsigned char* src, unsigned int len,
                                JsParseScriptAttribute attrs, JsValueRef* err);
JsErrorCode JsModuleEvaluation(JsModuleRecord rec, JsValueRef* result);
JsErrorCode JsGetModuleNamespace(JsModuleRecord rec, JsValueRef* out);
