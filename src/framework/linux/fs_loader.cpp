#include "fs_loader.h"

#include <cstdio>
#include <filesystem>
#include <fstream>
#include <unistd.h>
#include <limits.h>

namespace fs = std::filesystem;

namespace fs_loader {

bool readTextFile(const std::string& path, std::string& out) {
    std::ifstream f(path, std::ios::binary);
    if (!f) return false;
    f.seekg(0, std::ios::end);
    out.resize(static_cast<size_t>(f.tellg()));
    f.seekg(0, std::ios::beg);
    if (!out.empty()) f.read(out.data(), out.size());
    return true;
}

bool readBinaryFile(const std::string& path, std::vector<uint8_t>& out) {
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
    char buf[PATH_MAX];
    ssize_t n = readlink("/proc/self/exe", buf, sizeof(buf) - 1);
    if (n <= 0) return fs::current_path().string();
    buf[n] = '\0';
    return fs::path(buf).parent_path().string();
}

std::string resolveResource(const std::string& relativePath) {
    fs::path p(relativePath);
    if (p.is_absolute()) return p.string();
    return (fs::path(executableDir()) / p).string();
}

} // namespace fs_loader
