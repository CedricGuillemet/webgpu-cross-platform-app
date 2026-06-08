#pragma once
// Linux image decoder: stb_image-style stub. Currently a no-op; CI builds
// only need linking to succeed so size can be measured. To make scenes
// actually render on Linux, link against libpng/libjpeg or vendor stb_image.

#include <cstdint>
#include <vector>

namespace image_decoder {

bool decodeRGBA(const uint8_t* encoded, size_t encodedSize,
                std::vector<uint8_t>& outRGBA,
                int& outWidth, int& outHeight);

bool initialize();
void shutdown();

} // namespace image_decoder
