#pragma once
// Adapter shim so the project builds against the legacy Chakra runtime
// that ships with the Windows SDK (chakrart.h / Chakrart.lib in
// %WindowsSdkDir%\Include\<sdk>\um and Lib\<sdk>\um\x64).
//
// The shared layer (wgpu_bridge / dom_shim / worker_shim) uses the
// ChakraCore-flavoured Js* C API:
//   - UTF-8 string create/copy: JsCreateString, JsCopyString
//   - UTF-8 property ids:       JsCreatePropertyId
//   - Promise creation:         JsCreatePromise
//   - Script execution:         JsRun(JsValueRef src, ...) overload
//   - ES Module loading:        JsInitializeModuleRecord, JsParseModuleSource,
//                               JsModuleEvaluation, JsGetModuleNamespace,
//                               JsSetModuleHostInfo
// The SDK header (chakrart.h) exposes only the older Edge-mode subset:
// wide-char string APIs, JsRunScript (wchar_t*), and no module APIs.
//
// This header makes the missing surface available either as static
// inline wrappers (UTF-8/Promise/JsRun) or as no-op stubs (module APIs
// — chakra_host.cpp on SDK Chakra runs the entry as a script and routes
// dynamic imports through the global `__import` shim).

#include <chakrart.h>

#include <cstddef>
#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

#ifndef BYTE
typedef unsigned char BYTE;
#endif

// ---- Missing enums (kept here so existing call sites still compile) ----------

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

inline std::wstring wide(std::string_view s) {
    if (s.empty()) return {};
    int n = ::MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()),
                                  nullptr, 0);
    std::wstring w(n, L'\0');
    if (n > 0) {
        ::MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()),
                              w.data(), n);
    }
    return w;
}

inline std::string narrow(const wchar_t* w, size_t len) {
    if (!w || len == 0) return {};
    int n = ::WideCharToMultiByte(CP_UTF8, 0, w, static_cast<int>(len),
                                  nullptr, 0, nullptr, nullptr);
    std::string s(n, '\0');
    if (n > 0) {
        ::WideCharToMultiByte(CP_UTF8, 0, w, static_cast<int>(len),
                              s.data(), n, nullptr, nullptr);
    }
    return s;
}

} // namespace chakra_sdk_compat

// ---- UTF-8 Js* wrappers -----------------------------------------------------

inline JsErrorCode JsCreateString(const char* s, size_t len, JsValueRef* out) {
    std::wstring w = chakra_sdk_compat::wide({s, len});
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
    std::wstring w = chakra_sdk_compat::wide({name, len});
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
    JsValueRef idx0 = nullptr, idx1 = nullptr, idx2 = nullptr;
    JsValueRef i0 = nullptr, i1 = nullptr, i2 = nullptr;
    JsIntToNumber(0, &i0); JsIntToNumber(1, &i1); JsIntToNumber(2, &i2);
    JsGetIndexedProperty(triple, i0, &idx0);
    JsGetIndexedProperty(triple, i1, &idx1);
    JsGetIndexedProperty(triple, i2, &idx2);
    if (promise) *promise = idx0;
    if (resolve) *resolve = idx1;
    if (reject)  *reject  = idx2;
    return JsNoError;
}

// JsSetPromiseContinuationCallback is in modern ChakraCore; SDK Chakra (Edge)
// has it too via JsSetPromiseContinuationCallback. If absent at link time
// MSBuild will tell us — for now declare a typedef so callers compile.
#ifndef CHAKRA_API
// The SDK header redefines CHAKRA_API on each header include; harmless dup.
#define CHAKRA_API STDAPI_(JsErrorCode)
#endif

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
