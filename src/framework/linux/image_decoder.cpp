#include "image_decoder.h"

#include <cstdio>

namespace image_decoder {

bool decodeRGBA(const uint8_t* /*encoded*/, size_t /*encodedSize*/,
                std::vector<uint8_t>& outRGBA,
                int& outWidth, int& outHeight) {
    // Stub: real Linux build should link against libpng/libjpeg (or vendor
    // stb_image). For CI we only build the binary so this just fails
    // gracefully and any scene that needs textures will report it.
    outRGBA.clear();
    outWidth = outHeight = 0;
    std::fprintf(stderr, "[image] Linux decoder not wired; scene textures will be blank\n");
    return false;
}

bool initialize() { return true; }
void shutdown()   {}

} // namespace image_decoder
