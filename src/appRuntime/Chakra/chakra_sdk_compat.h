#pragma once
// Adapter shim so the project builds against the legacy Chakra runtime
// that ships with the Windows SDK (chakrart.h / Chakrart.lib in
// %WindowsSdkDir%\Include\<sdk>\um and Lib\<sdk>\um\x64).
//
// The shared layer (wgpu_bridge / dom_shim / worker_shim) uses the
// ChakraCore-flavoured Js* C API. The SDK ships the "edge-mode" subset:
//   - wide-char strings (JsPointerToString / JsStringToPointer)
//   - JsRunScript (wchar_t source)
//   - no ES module APIs (JsInitializeModuleRecord etc.)
//   - no JsCreateString / JsCopyString UTF-8 variants
//   - no JsCreatePromise (we fake it with an eval'd thunk)
//   - no JsParseScriptAttributes enum
//
// This header provides static inline wrappers that close the gap so the
// existing call sites compile, and no-op stubs for the modules surface.

#include <windows.h>

// Must be defined BEFORE <jsrt.h> so the SDK header pulls in chakrart.h
// (edge-mode Chakra) instead of the deprecated jsrt9.h.
#ifndef USE_EDGEMODE_JSRT
#define USE_EDGEMODE_JSRT
#endif
#include <jsrt.h>

#include <cstddef>
#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

#ifndef BYTE
typedef unsigned char BYTE;
#endif

// ---- Missing enums (kept here so existing call sites still compile) ----------

// JsParseScriptAttributes (ChakraCore-only typedef + value alias)
typedef unsigned JsParseScriptAttributes;
#ifndef JsParseScriptAttributeNone
#define JsParseScriptAttributeNone ((JsParseScriptAttributes)0)
#endif
#ifndef CHAKRA_CALLBACK
// ChakraCore decorates its module/promise callback signatures with this
// no-op annotation; SDK Chakra never defined it.
#define CHAKRA_CALLBACK
#endif

typedef enum _JsParseModuleSourceFlags {
    JsParseModuleSourceFlags_DataIsUTF16LE = 0x00000000,
    JsParseModuleSourceFlags_DataIsUTF8    = 0x00000001,
} JsParseModuleSourceFlags;

typedef enum _JsModuleHostInfoKind {
    JsModuleHostInfo_Exception                                = 0x01,
    JsModuleHostInfo_HostDefined                              = 0x02,
    JsModuleHostInfo_NotifyModuleReadyCallback                = 0x3,
    JsModuleHostInfo_FetchImportedModuleCallback              = 0x4,
    JsModuleHostInfo_FetchImportedModuleFromScriptCallback    = 0x5,
    JsModuleHostInfo_Url                                      = 0x6,
} JsModuleHostInfoKind;

// JsModuleRecord is an opaque cookie in ChakraCore. SDK Chakra has no
// module support; alias to void* so existing pointer-typed uses compile.
typedef void* JsModuleRecord;

// ---- UTF-8 helpers (SDK Chakra is wide-char internally) ---------------------

namespace chakra_sdk_compat {

inline std::wstring wide(const char* s, size_t n) {
    if (!s || n == 0) return {};
    int needed = ::MultiByteToWideChar(CP_UTF8, 0, s, static_cast<int>(n),
                                       nullptr, 0);
    std::wstring w(needed, L'\0');
    if (needed > 0) {
        ::MultiByteToWideChar(CP_UTF8, 0, s, static_cast<int>(n),
                              w.data(), needed);
    }
    return w;
}

inline std::string narrow(const wchar_t* w, size_t len) {
    if (!w || len == 0) return {};
    int needed = ::WideCharToMultiByte(CP_UTF8, 0, w, static_cast<int>(len),
                                       nullptr, 0, nullptr, nullptr);
    std::string s(needed, '\0');
    if (needed > 0) {
        ::WideCharToMultiByte(CP_UTF8, 0, w, static_cast<int>(len),
                              s.data(), needed, nullptr, nullptr);
    }
    return s;
}

} // namespace chakra_sdk_compat

// ---- UTF-8 Js* wrappers -----------------------------------------------------

inline JsErrorCode JsCreateString(const char* s, size_t len, JsValueRef* out) {
    std::wstring w = chakra_sdk_compat::wide(s, len);
    return JsPointerToString(w.c_str(), w.size(), out);
}

inline JsErrorCode JsCopyString(JsValueRef v, char* buf, size_t bufLen,
                                size_t* outLen) {
    const wchar_t* w = nullptr;
    size_t wlen = 0;
    JsErrorCode rc = JsStringToPointer(v, &w, &wlen);
    if (rc != JsNoError) {
        if (outLen) *outLen = 0;
        return rc;
    }
    std::string narrow = chakra_sdk_compat::narrow(w, wlen);
    if (outLen) *outLen = narrow.size();
    if (buf && bufLen > 0) {
        size_t cpy = (narrow.size() < bufLen - 1) ? narrow.size() : bufLen - 1;
        std::memcpy(buf, narrow.data(), cpy);
        buf[cpy] = '\0';
    }
    return JsNoError;
}

inline JsErrorCode JsCreatePropertyId(const char* name, size_t len,
                                      JsPropertyIdRef* out) {
    std::wstring w = chakra_sdk_compat::wide(name, len);
    return JsGetPropertyIdFromName(w.c_str(), out);
}

// ChakraCore's JsRun takes a JSValue source + URL; SDK Chakra has JsRunScript
// that takes wchar_t*. Wrap to keep the call sites unchanged.
inline JsErrorCode JsRun(JsValueRef src, JsSourceContext srcCtx,
                        JsValueRef url, JsParseScriptAttributes /*attrs*/,
                        JsValueRef* out) {
    const wchar_t* sw = nullptr; size_t sl = 0;
    const wchar_t* uw = nullptr; size_t ul = 0;
    if (src) JsStringToPointer(src, &sw, &sl);
    if (url) JsStringToPointer(url, &uw, &ul);
    std::wstring source(sw ? sw : L"", sl);
    std::wstring urlStr(uw ? uw : L"", ul);
    return JsRunScript(source.c_str(), srcCtx, urlStr.c_str(), out);
}

// JsCreatePromise: legacy Chakra has no native API; build one by evaluating
// a self-contained JS thunk that captures resolve/reject into outputs.
inline JsErrorCode JsCreatePromise(JsValueRef* promise, JsValueRef* resolve,
                                   JsValueRef* reject) {
    JsValueRef triple = nullptr;
    const wchar_t* src =
        L"(function(){var r,e;"
        L"var p=new Promise(function(_r,_e){r=_r;e=_e;});"
        L"return [p,r,e];})();";
    JsErrorCode rc = JsRunScript(src, 0, L"<jschakra:createPromise>", &triple);
    if (rc != JsNoError || !triple) {
        if (promise) *promise = nullptr;
        if (resolve) *resolve = nullptr;
        if (reject)  *reject  = nullptr;
        return rc;
    }
    JsValueRef i0 = nullptr, i1 = nullptr, i2 = nullptr;
    JsIntToNumber(0, &i0); JsIntToNumber(1, &i1); JsIntToNumber(2, &i2);
    if (promise) JsGetIndexedProperty(triple, i0, promise);
    if (resolve) JsGetIndexedProperty(triple, i1, resolve);
    if (reject)  JsGetIndexedProperty(triple, i2, reject);
    return JsNoError;
}

// JsGetAndClearExceptionWithMetadata is ChakraCore-only. Fall back to plain.
inline JsErrorCode JsGetAndClearExceptionWithMetadata(JsValueRef* out) {
    return JsGetAndClearException(out);
}

// ---- Module API stubs (SDK Chakra has no ES module support) -----------------
//
// chakra_host.cpp on SDK Chakra runs the entry script via JsRunScript and
// routes dynamic imports through the global `__import` shim installed from
// main.cpp. These stubs exist so the shared call sites still compile.

inline JsErrorCode JsInitializeModuleRecord(JsModuleRecord, JsValueRef,
                                            JsModuleRecord* out) {
    if (out) *out = nullptr;
    return JsErrorInvalidArgument;
}
inline JsErrorCode JsSetModuleHostInfo(JsModuleRecord, JsModuleHostInfoKind, void*) {
    return JsErrorInvalidArgument;
}
inline JsErrorCode JsParseModuleSource(JsModuleRecord, JsSourceContext,
                                       BYTE*, unsigned int,
                                       JsParseModuleSourceFlags, JsValueRef* err) {
    if (err) *err = nullptr;
    return JsErrorInvalidArgument;
}
inline JsErrorCode JsModuleEvaluation(JsModuleRecord, JsValueRef* out) {
    if (out) *out = nullptr;
    return JsErrorInvalidArgument;
}
inline JsErrorCode JsGetModuleNamespace(JsModuleRecord, JsValueRef* out) {
    if (out) *out = nullptr;
    return JsErrorInvalidArgument;
}
