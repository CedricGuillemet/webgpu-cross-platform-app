#pragma once

#include <cstdint>
#include <vector>

namespace image_decoder {

// Decode an encoded image buffer (PNG/JPG/BMP/GIF/TIFF/HEIC/etc — any format
// the Windows Imaging Component knows how to read) into RGBA8 pixels.
//
// On success: outRGBA holds width*height*4 bytes in row-major order,
// outWidth/outHeight are set, returns true.
// On failure: outRGBA is cleared and returns false.
bool decodeRGBA(const uint8_t* encoded, size_t encodedSize,
                std::vector<uint8_t>& outRGBA,
                int& outWidth, int& outHeight);

// Process-wide init/teardown for the COM apartment and WIC factory. Safe to
// call multiple times; only the first call does real work.
bool initialize();
void shutdown();

} // namespace image_decoder
