#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace fs_loader {

// Read a file's UTF-8 text content.
bool readTextFile(const std::string& path, std::string& out);

// Read a file's binary content.
bool readBinaryFile(const std::string& path, std::vector<uint8_t>& out);

// Write a binary file (used when caching downloaded assets).
bool writeBinaryFile(const std::string& path, const uint8_t* data, size_t size);

// Returns the directory the executable lives in.
std::string executableDir();

// Resolve a path relative to the executable directory if not absolute.
std::string resolveResource(const std::string& relativePath);

} // namespace fs_loader
