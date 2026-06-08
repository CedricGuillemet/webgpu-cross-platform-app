#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace http_fetcher {

// Synchronously download a URL into `out`. Returns true on success.
// Used during startup to populate the local cache of remote assets.
bool downloadToMemory(const std::string& url, std::vector<uint8_t>& out);

// Downloads `url` into `cachePath` if cachePath is missing or empty.
// Returns true if file is present after the call.
bool ensureCached(const std::string& url, const std::string& cachePath);

} // namespace http_fetcher
