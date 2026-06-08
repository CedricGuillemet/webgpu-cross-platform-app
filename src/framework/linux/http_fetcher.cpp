// Linux HTTP fetcher.
//
// Stub: CI uses this only to build, not to actually fetch assets at runtime
// (CI doesn't run the binary). A real Linux deployment should link against
// libcurl and call curl_easy_perform; see the win32 winhttp variant for the
// equivalent flow.

#include "http_fetcher.h"
#include "fs_loader.h"

#include <cstdio>
#include <filesystem>

namespace fs = std::filesystem;

namespace http_fetcher {

bool downloadToMemory(const std::string& url, std::vector<uint8_t>& /*out*/) {
    std::fprintf(stderr, "[http] Linux fetcher not wired; cannot download %s\n", url.c_str());
    return false;
}

bool ensureCached(const std::string& url, const std::string& cachePath) {
    std::error_code ec;
    if (fs::exists(cachePath, ec) && fs::file_size(cachePath, ec) > 0) {
        return true;
    }
    std::vector<uint8_t> data;
    if (!downloadToMemory(url, data)) return false;
    return fs_loader::writeBinaryFile(cachePath, data.data(), data.size());
}

} // namespace http_fetcher
