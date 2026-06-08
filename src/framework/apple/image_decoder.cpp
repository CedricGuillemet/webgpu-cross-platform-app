#include "image_decoder.h"

#include <cstdio>

namespace image_decoder {

bool decodeRGBA(const uint8_t* /*encoded*/, size_t /*encodedSize*/,
                std::vector<uint8_t>& outRGBA,
                int& outWidth, int& outHeight) {
    // Stub: real Apple build should use ImageIO (CGImageSourceCreateWithData
    // + CGContext readback into RGBA8). For CI we only build the binary.
    outRGBA.clear();
    outWidth = outHeight = 0;
    std::fprintf(stderr, "[image] Apple decoder not wired; scene textures will be blank\n");
    return false;
}

bool initialize() { return true; }
void shutdown()   {}

} // namespace image_decoder
