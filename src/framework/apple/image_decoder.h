#pragma once
// Apple image decoder: stub for now. A real implementation should use
// ImageIO's CGImageSourceCreateWithData + CGContextRef readback.

#include <cstdint>
#include <vector>

namespace image_decoder {

bool decodeRGBA(const uint8_t* encoded, size_t encodedSize,
                std::vector<uint8_t>& outRGBA,
                int& outWidth, int& outHeight);

bool initialize();
void shutdown();

} // namespace image_decoder
