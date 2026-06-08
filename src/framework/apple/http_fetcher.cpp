// Apple HTTP fetcher.
//
// Stub for now. A real macOS/iOS build should use NSURLSession; on the
// JNI / NSURLConnection paths in BabylonNative there are clean examples.

#include "http_fetcher.h"
#include "fs_loader.h"

#include <cstdio>
#include <filesystem>

namespace fs = std::filesystem;

namespace http_fetcher {

bool downloadToMemory(const std::string& url, std::vector<uint8_t>& /*out*/) {
    std::fprintf(stderr, "[http] Apple fetcher not wired; cannot download %s\n", url.c_str());
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
