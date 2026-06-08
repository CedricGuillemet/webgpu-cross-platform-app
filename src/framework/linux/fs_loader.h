#pragma once
// Linux fs_loader: same interface as the win32 variant. POSIX file IO.

#include <cstdint>
#include <string>
#include <vector>

namespace fs_loader {

bool readTextFile(const std::string& path, std::string& out);
bool readBinaryFile(const std::string& path, std::vector<uint8_t>& out);
bool writeBinaryFile(const std::string& path, const uint8_t* data, size_t size);

std::string executableDir();
std::string resolveResource(const std::string& relativePath);

} // namespace fs_loader
