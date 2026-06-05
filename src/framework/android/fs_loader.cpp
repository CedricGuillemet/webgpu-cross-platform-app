#include "fs_loader.h"

#include <android/asset_manager.h>

#include <cstdio>
#include <filesystem>
#include <fstream>
#include <mutex>

namespace fs = std::filesystem;

namespace fs_loader {

namespace {
std::mutex g_mu;
AAssetManager* g_mgr = nullptr;
std::string    g_dataDir;
std::string    g_cacheDir;

// Return the AAssetManager-relative path if `path` lives inside the APK's
// assets, else return empty. We accept:
//   - "assets/..."                              (raw asset path)
//   - "<dataDir>/assets/..."                   (resolved via executableDir())
//   - "/android_asset/..."                     (legacy WebView prefix)
std::string toAssetPath(const std::string& path) {
    constexpr const char* kAssetsPrefix = "assets/";
    constexpr const char* kWebPrefix    = "/android_asset/";

    if (path.rfind(kAssetsPrefix, 0) == 0) {
        return path.substr(std::char_traits<char>::length(kAssetsPrefix));
    }
    if (path.rfind(kWebPrefix, 0) == 0) {
        return path.substr(std::char_traits<char>::length(kWebPrefix));
    }
    if (!g_dataDir.empty()) {
        const std::string prefix = g_dataDir + "/assets/";
        if (path.rfind(prefix, 0) == 0) {
            return path.substr(prefix.size());
        }
        // Windows-y normalisation safety: also try backslash variants.
        const std::string prefixBs = g_dataDir + "\\assets\\";
        if (path.rfind(prefixBs, 0) == 0) {
            return path.substr(prefixBs.size());
        }
    }
    return {};
}

bool readAssetBytes(const std::string& assetPath, std::vector<uint8_t>& out) {
    if (!g_mgr || assetPath.empty()) return false;
    AAsset* a = AAssetManager_open(g_mgr, assetPath.c_str(), AASSET_MODE_BUFFER);
    if (!a) return false;
    off64_t len = AAsset_getLength64(a);
    out.resize(static_cast<size_t>(len));
    if (len > 0) {
        int n = AAsset_read(a, out.data(), static_cast<size_t>(len));
        if (n < 0 || static_cast<off64_t>(n) != len) {
            AAsset_close(a);
            out.clear();
            return false;
        }
    }
    AAsset_close(a);
    return true;
}
} // namespace

void setAssetManager(AAssetManager* mgr) {
    std::lock_guard<std::mutex> lk(g_mu);
    g_mgr = mgr;
}

void setInternalDataDir(const std::string& dir) {
    std::lock_guard<std::mutex> lk(g_mu);
    g_dataDir = dir;
}

void setCacheDir(const std::string& dir) {
    std::lock_guard<std::mutex> lk(g_mu);
    g_cacheDir = dir;
}

bool readTextFile(const std::string& path, std::string& out) {
    // Try APK assets first.
    std::string ap = toAssetPath(path);
    if (!ap.empty()) {
        std::vector<uint8_t> bytes;
        if (!readAssetBytes(ap, bytes)) return false;
        out.assign(reinterpret_cast<const char*>(bytes.data()), bytes.size());
        return true;
    }
    // Fallback: real filesystem (cache dir downloads, etc.).
    std::ifstream f(path, std::ios::binary);
    if (!f) return false;
    f.seekg(0, std::ios::end);
    out.resize(static_cast<size_t>(f.tellg()));
    f.seekg(0, std::ios::beg);
    if (!out.empty()) f.read(out.data(), out.size());
    return true;
}

bool readBinaryFile(const std::string& path, std::vector<uint8_t>& out) {
    std::string ap = toAssetPath(path);
    if (!ap.empty()) {
        return readAssetBytes(ap, out);
    }
    std::ifstream f(path, std::ios::binary);
    if (!f) return false;
    f.seekg(0, std::ios::end);
    out.resize(static_cast<size_t>(f.tellg()));
    f.seekg(0, std::ios::beg);
    if (!out.empty()) f.read(reinterpret_cast<char*>(out.data()), out.size());
    return true;
}

bool writeBinaryFile(const std::string& path, const uint8_t* data, size_t size) {
    std::error_code ec;
    fs::create_directories(fs::path(path).parent_path(), ec);
    std::ofstream f(path, std::ios::binary);
    if (!f) return false;
    f.write(reinterpret_cast<const char*>(data), size);
    return f.good();
}

std::string executableDir() {
    std::lock_guard<std::mutex> lk(g_mu);
    if (!g_dataDir.empty()) return g_dataDir;
    return "/data/local/tmp";
}

std::string resolveResource(const std::string& relativePath) {
    fs::path p(relativePath);
    if (p.is_absolute()) return p.string();
    return (fs::path(executableDir()) / p).string();
}

} // namespace fs_loader
