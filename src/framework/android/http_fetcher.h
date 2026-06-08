#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace http_fetcher {

// Same interface as the Win32 version.
bool downloadToMemory(const std::string& url, std::vector<uint8_t>& out);
bool ensureCached(const std::string& url, const std::string& cachePath);

} // namespace http_fetcher
