#include "http_fetcher.h"

#include "fs_loader.h"

#include <cstdio>
#include <filesystem>
#include <string>

#if defined(_WIN32)
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winhttp.h>
#endif

namespace fs = std::filesystem;

namespace http_fetcher {

#if defined(_WIN32)

namespace {
std::wstring widen(const std::string& s) {
    if (s.empty()) return {};
    int n = MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), nullptr, 0);
    std::wstring w(n, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, s.data(), (int)s.size(), w.data(), n);
    return w;
}
} // namespace

bool downloadToMemory(const std::string& url, std::vector<uint8_t>& out) {
    URL_COMPONENTSW comps{};
    comps.dwStructSize = sizeof(comps);
    wchar_t host[256]{}, path[2048]{};
    comps.lpszHostName = host; comps.dwHostNameLength = 256;
    comps.lpszUrlPath = path; comps.dwUrlPathLength = 2048;
    std::wstring wurl = widen(url);
    if (!WinHttpCrackUrl(wurl.c_str(), 0, 0, &comps)) {
        std::fprintf(stderr, "[http] WinHttpCrackUrl failed for %s\n", url.c_str());
        return false;
    }

    HINTERNET hSession = WinHttpOpen(L"DawnTestHost/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
    if (!hSession) return false;
    // Auto-follow redirects up to 10 hops.
    DWORD policy = WINHTTP_OPTION_REDIRECT_POLICY_ALWAYS;
    WinHttpSetOption(hSession, WINHTTP_OPTION_REDIRECT_POLICY, &policy, sizeof(policy));

    HINTERNET hConnect = WinHttpConnect(hSession, host, comps.nPort ? comps.nPort : (comps.nScheme == INTERNET_SCHEME_HTTPS ? 443 : 80), 0);
    if (!hConnect) { WinHttpCloseHandle(hSession); return false; }

    DWORD flags = (comps.nScheme == INTERNET_SCHEME_HTTPS) ? WINHTTP_FLAG_SECURE : 0;
    HINTERNET hReq = WinHttpOpenRequest(hConnect, L"GET", path, nullptr, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
    if (!hReq) { WinHttpCloseHandle(hConnect); WinHttpCloseHandle(hSession); return false; }

    BOOL ok = WinHttpSendRequest(hReq, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0);
    if (ok) ok = WinHttpReceiveResponse(hReq, nullptr);

    if (ok) {
        DWORD status = 0; DWORD sz = sizeof(status);
        WinHttpQueryHeaders(hReq, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &status, &sz, WINHTTP_NO_HEADER_INDEX);
        if (status >= 300 && status < 400) {
            wchar_t loc[4096]; DWORD locSz = sizeof(loc);
            if (WinHttpQueryHeaders(hReq, WINHTTP_QUERY_LOCATION, WINHTTP_HEADER_NAME_BY_INDEX, loc, &locSz, WINHTTP_NO_HEADER_INDEX)) {
                int n = WideCharToMultiByte(CP_UTF8, 0, loc, locSz / sizeof(wchar_t), nullptr, 0, nullptr, nullptr);
                std::string newUrl(n, '\0');
                WideCharToMultiByte(CP_UTF8, 0, loc, locSz / sizeof(wchar_t), newUrl.data(), n, nullptr, nullptr);
                // Strip null terminator if present
                while (!newUrl.empty() && newUrl.back() == 0) newUrl.pop_back();
                WinHttpCloseHandle(hReq); WinHttpCloseHandle(hConnect); WinHttpCloseHandle(hSession);
                return downloadToMemory(newUrl, out);
            }
        }
        if (status != 200) {
            std::fprintf(stderr, "[http] %s -> HTTP %lu\n", url.c_str(), status);
            ok = FALSE;
        }
    }

    if (ok) {
        DWORD available = 0;
        do {
            if (!WinHttpQueryDataAvailable(hReq, &available)) { ok = FALSE; break; }
            if (available == 0) break;
            size_t off = out.size();
            out.resize(off + available);
            DWORD got = 0;
            if (!WinHttpReadData(hReq, out.data() + off, available, &got)) { ok = FALSE; break; }
            out.resize(off + got);
        } while (available > 0);
    }

    WinHttpCloseHandle(hReq);
    WinHttpCloseHandle(hConnect);
    WinHttpCloseHandle(hSession);
    if (ok) {
        std::fprintf(stderr, "[http] %s -> %zu bytes\n", url.c_str(), out.size());
    }
    return ok == TRUE;
}

#else
bool downloadToMemory(const std::string&, std::vector<uint8_t>&) { return false; }
#endif

bool ensureCached(const std::string& url, const std::string& cachePath) {
    std::error_code ec;
    if (fs::exists(cachePath, ec) && fs::file_size(cachePath, ec) > 0) {
        return true;
    }
    std::vector<uint8_t> data;
    if (!downloadToMemory(url, data)) {
        std::fprintf(stderr, "[http] failed to download %s\n", url.c_str());
        return false;
    }
    if (!fs_loader::writeBinaryFile(cachePath, data.data(), data.size())) {
        std::fprintf(stderr, "[http] failed to write cache %s\n", cachePath.c_str());
        return false;
    }
    std::fprintf(stderr, "[http] cached %s -> %s (%zu bytes)\n", url.c_str(), cachePath.c_str(), data.size());
    return true;
}

} // namespace http_fetcher
