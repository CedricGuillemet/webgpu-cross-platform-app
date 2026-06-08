#pragma once
// Apple HTTP fetcher: same interface as the win32 version.

#include <cstdint>
#include <string>
#include <vector>

namespace http_fetcher {

bool downloadToMemory(const std::string& url, std::vector<uint8_t>& out);
bool ensureCached(const std::string& url, const std::string& cachePath);

} // namespace http_fetcher
