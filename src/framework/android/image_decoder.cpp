// Android system image decoder using <android/imagedecoder.h>.
//
// AImageDecoder is part of the NDK media APIs (introduced in API level 30
// = Android 11). It handles every format the system can decode (PNG, JPEG,
// WebP, GIF, HEIF on newer devices, plus 16k-aligned variants etc.)
// without requiring us to ship a copy of stb_image / libjpeg / libpng.
// Links against -ljnigraphics.
//
// We force RGBA8 output to match the Win32 WIC path exactly.

#include "image_decoder.h"

#include <android/imagedecoder.h>
#include <android/log.h>

#include <cstdio>
#include <cstring>

#define LOG_TAG "DawnTest"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace image_decoder {

bool decodeRGBA(const uint8_t* encoded, size_t encodedSize,
                std::vector<uint8_t>& outRGBA,
                int& outWidth, int& outHeight) {
    outRGBA.clear();
    outWidth = outHeight = 0;
    if (!encoded || encodedSize == 0) return false;

    AImageDecoder* dec = nullptr;
    int result = AImageDecoder_createFromBuffer(encoded, encodedSize, &dec);
    if (result != ANDROID_IMAGE_DECODER_SUCCESS || !dec) {
        LOGE("AImageDecoder_createFromBuffer failed: %d", result);
        return false;
    }

    AImageDecoder_setAndroidBitmapFormat(dec, ANDROID_BITMAP_FORMAT_RGBA_8888);
    AImageDecoder_setUnpremultipliedRequired(dec, true);

    const AImageDecoderHeaderInfo* info = AImageDecoder_getHeaderInfo(dec);
    int32_t w = AImageDecoderHeaderInfo_getWidth(info);
    int32_t h = AImageDecoderHeaderInfo_getHeight(info);
    size_t stride = AImageDecoder_getMinimumStride(dec); // includes 4-byte align
    size_t size   = static_cast<size_t>(h) * stride;

    std::vector<uint8_t> tmp(size);
    int decoded = AImageDecoder_decodeImage(dec, tmp.data(), stride, size);
    AImageDecoder_delete(dec);

    if (decoded != ANDROID_IMAGE_DECODER_SUCCESS) {
        LOGE("AImageDecoder_decodeImage failed: %d", decoded);
        return false;
    }

    outWidth  = w;
    outHeight = h;
    // Pack tightly to width*4 stride so downstream code can rely on it.
    const size_t tight = static_cast<size_t>(w) * 4u;
    if (stride == tight) {
        outRGBA = std::move(tmp);
    } else {
        outRGBA.resize(tight * static_cast<size_t>(h));
        for (int32_t y = 0; y < h; ++y) {
            std::memcpy(outRGBA.data() + y * tight, tmp.data() + y * stride, tight);
        }
    }
    return true;
}

bool initialize() { return true; }
void shutdown()   {}

} // namespace image_decoder
