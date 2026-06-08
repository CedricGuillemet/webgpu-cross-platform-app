#pragma once

#include <cstdint>
#include <vector>

namespace image_decoder {

// Decode PNG/JPG/BMP/GIF/PSD/TGA into RGBA8 using stb_image.
bool decodeRGBA(const uint8_t* encoded, size_t encodedSize,
                std::vector<uint8_t>& outRGBA,
                int& outWidth, int& outHeight);

// No-ops on Android; stb_image needs no global init.
bool initialize();
void shutdown();

} // namespace image_decoder
