#pragma once
// ChakraCore-style API surface implemented on top of QuickJS.
// This is NOT a full Chakra emulation — only the ~30 APIs used by
// wgpu_bridge / dom_shim / worker_shim. JsValueRef is a heap-allocated
// wrapper that holds a refcount and an underlying QuickJS JSValue.
// We deliberately leak transient values that the existing code never
// JsReleases — this keeps porting effort minimal at the cost of a few KB
// per frame, which is acceptable for testing.

#include <quickjs.h>
#include <cstddef>
#include <cstdint>
#include <cstring>

// ---- Opaque types ------------------------------------------------------------

struct JsValueObj {
    JSValue v;
    int     rc;   // wrapper refcount (1 = single owner)
};

using JsValueRef       = JsValueObj*;
using JsRuntimeHandle  = JSRuntime*;
using JsContextRef     = JSContext*;
using JsPropertyIdRef  = JSAtom;   // QuickJS atoms == Chakra property ids
using JsSourceContext  = uintptr_t;
using JsModuleRecord   = void*;    // module loading uses native QuickJS, callbacks unused

// nullptr is assignable to all of the above pointer-typed handles.
#define JS_INVALID_REFERENCE       nullptr
#define JS_INVALID_RUNTIME_HANDLE  nullptr
#define CHAKRA_CALLBACK            /* nothing */

// Chakra's downstream code uses the Windows-style BYTE typedef for byte
// buffers — provide it so we don't have to include <windows.h> everywhere.
#ifndef BYTE
typedef unsigned char BYTE;
#endif

// ---- Enums (Chakra-style)
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
    JsArrayTypeInt8        = 0,
    JsArrayTypeUint8       = 1,
    JsArrayTypeUint8Clamped = 2,
    JsArrayTypeInt16       = 3,
    JsArrayTypeUint16      = 4,
    JsArrayTypeInt32       = 5,
    JsArrayTypeUint32      = 6,
    JsArrayTypeFloat32     = 7,
    JsArrayTypeFloat64     = 8,
} JsTypedArrayType;

typedef enum JsParseScriptAttribute {
    JsParseScriptAttributeNone = 0,
} JsParseScriptAttribute;

typedef enum JsRuntimeAttribute {
    JsRuntimeAttributeNone                  = 0,
    JsRuntimeAttributeAllowScriptInterrupt  = 0x00000010,
} JsRuntimeAttribute;

typedef enum JsModuleHostInfoKind {
    JsModuleHostInfo_FetchImportedModuleCallback              = 0,
    JsModuleHostInfo_FetchImportedModuleFromScriptCallback    = 1,
    JsModuleHostInfo_NotifyModuleReadyCallback                = 2,
    JsModuleHostInfo_Url                                      = 3,
} JsModuleHostInfoKind;

// Chakra-style native callback signature: args[0] is `this`, args[1..N] are real args.
typedef JsValueRef (*JsNativeFunction)(JsValueRef callee,
                                       bool isConstructCall,
                                       JsValueRef* arguments,
                                       unsigned short argumentCount,
                                       void* callbackState);

// ---- Internal helpers (used by quickjs_host.cpp) -----------------------------

namespace cc {
    // Set/get the active QuickJS context (single-threaded for now).
    void        setContext(JSContext* ctx);
    JSContext*  ctx();

    // Wrap a freshly-produced JSValue (caller transfers ownership of one ref).
    JsValueRef  wrap(JSValue v);
    // Convenience: dup the underlying value before wrapping.
    JsValueRef  wrapDup(JSValueConst v);
    // Extract the underlying JSValue WITHOUT changing refcount. The wrapper
    // still owns it; do NOT JS_FreeValue.
    JSValue     raw(JsValueRef r);

    // Drain garbage in our wrapper pool (no-op currently; here for symmetry).
    void        sweep();
} // namespace cc

// ---- Chakra-style API ---------------------------------------------------------

// Refcounting
JsErrorCode JsAddRef(JsValueRef ref, unsigned int* count);
JsErrorCode JsRelease(JsValueRef ref, unsigned int* count);

// Primitive creation / conversion
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

// Strings
JsErrorCode JsCreateString(const char* s, size_t len, JsValueRef* out);
JsErrorCode JsCopyString(JsValueRef v, char* buf, size_t bufSize, size_t* outLen);

// Type
JsErrorCode JsGetValueType(JsValueRef v, JsValueType* out);

// Objects / arrays
JsErrorCode JsGetGlobalObject(JsValueRef* out);
JsErrorCode JsCreateObject(JsValueRef* out);
JsErrorCode JsCreateArray(unsigned int len, JsValueRef* out);

// Array buffers and typed arrays
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

// External (opaque) objects
JsErrorCode JsCreateExternalObject(void* data, void (*finalize)(void*),
                                   JsValueRef* out);

// Properties
JsErrorCode JsCreatePropertyId(const char* name, size_t len,
                               JsPropertyIdRef* out);
JsErrorCode JsGetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef* out);
JsErrorCode JsSetProperty(JsValueRef obj, JsPropertyIdRef pid, JsValueRef v,
                          bool strict);
JsErrorCode JsHasProperty(JsValueRef obj, JsPropertyIdRef pid, bool* has);
JsErrorCode JsGetIndexedProperty(JsValueRef obj, JsValueRef idx,
                                 JsValueRef* out);
JsErrorCode JsSetIndexedProperty(JsValueRef obj, JsValueRef idx, JsValueRef v);

// Function calling
JsErrorCode JsCallFunction(JsValueRef fn, JsValueRef* args,
                           unsigned short argCount, JsValueRef* out);
JsErrorCode JsConstructObject(JsValueRef ctor, JsValueRef* args,
                              unsigned short argCount, JsValueRef* out);
JsErrorCode JsCreateNamedFunction(JsValueRef name, JsNativeFunction fn,
                                  void* state, JsValueRef* out);

// Exceptions
JsErrorCode JsHasException(bool* has);
JsErrorCode JsGetAndClearException(JsValueRef* out);
JsErrorCode JsGetAndClearExceptionWithMetadata(JsValueRef* out);

// Promises
JsErrorCode JsCreatePromise(JsValueRef* promise, JsValueRef* resolve,
                            JsValueRef* reject);
typedef void (*PromiseContinuationCallback)(JsValueRef task, void* state);
JsErrorCode JsSetPromiseContinuationCallback(PromiseContinuationCallback cb,
                                             void* state);

// Equality
JsErrorCode JsEquals(JsValueRef a, JsValueRef b, bool* out);

// Runtime/context lifecycle (used by worker_shim)
JsErrorCode JsCreateRuntime(JsRuntimeAttribute attrs, void* allocators,
                            JsRuntimeHandle* out);
JsErrorCode JsCreateContext(JsRuntimeHandle rt, JsContextRef* out);
JsErrorCode JsSetCurrentContext(JsContextRef ctx);
JsErrorCode JsDisposeRuntime(JsRuntimeHandle rt);

// Script execution (used by worker_shim)
JsErrorCode JsRun(JsValueRef src, JsSourceContext srcCtx, JsValueRef url,
                  JsParseScriptAttribute attrs, JsValueRef* out);

// Module APIs (not actually used outside chakra_host, but referenced as types)
JsErrorCode JsInitializeModuleRecord(JsModuleRecord parent, JsValueRef spec,
                                     JsModuleRecord* out);
JsErrorCode JsSetModuleHostInfo(JsModuleRecord rec, JsModuleHostInfoKind kind,
                                void* info);
JsErrorCode JsParseModuleSource(JsModuleRecord rec, JsSourceContext srcCtx,
                                const unsigned char* src, unsigned int len,
                                JsParseScriptAttribute attrs, JsValueRef* err);
JsErrorCode JsModuleEvaluation(JsModuleRecord rec, JsValueRef* result);
JsErrorCode JsGetModuleNamespace(JsModuleRecord rec, JsValueRef* out);
