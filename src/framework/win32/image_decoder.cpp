#include "image_decoder.h"

#include <cstdio>
#include <cstring>

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <objbase.h>
#include <wincodec.h>
#include <wrl/client.h>

using Microsoft::WRL::ComPtr;

namespace image_decoder {

namespace {

ComPtr<IWICImagingFactory> g_factory;
bool g_initialised = false;

}

bool initialize() {
    if (g_initialised) return true;
    // The host's threads (main + workers) each need their own COM init; for
    // the main thread we use STA (matches WIC's preference). Workers don't
    // currently call image_decoder so this single init is enough.
    HRESULT hr = ::CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
        std::fprintf(stderr, "[wic] CoInitializeEx failed: 0x%08lX\n", hr);
        return false;
    }
    hr = ::CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER,
                            IID_PPV_ARGS(g_factory.GetAddressOf()));
    if (FAILED(hr)) {
        std::fprintf(stderr, "[wic] CoCreateInstance(WICImagingFactory) failed: 0x%08lX\n", hr);
        return false;
    }
    g_initialised = true;
    return true;
}

void shutdown() {
    g_factory.Reset();
    if (g_initialised) {
        ::CoUninitialize();
        g_initialised = false;
    }
}

bool decodeRGBA(const uint8_t* encoded, size_t encodedSize,
                std::vector<uint8_t>& outRGBA, int& outWidth, int& outHeight) {
    outRGBA.clear();
    outWidth = outHeight = 0;
    if (!encoded || encodedSize == 0) return false;
    if (!g_initialised && !initialize()) return false;

    // Wrap the input bytes in an in-memory IWICStream.
    ComPtr<IWICStream> stream;
    HRESULT hr = g_factory->CreateStream(stream.GetAddressOf());
    if (FAILED(hr)) {
        std::fprintf(stderr, "[wic] CreateStream failed: 0x%08lX\n", hr);
        return false;
    }
    hr = stream->InitializeFromMemory(const_cast<BYTE*>(encoded), static_cast<DWORD>(encodedSize));
    if (FAILED(hr)) {
        std::fprintf(stderr, "[wic] InitializeFromMemory failed: 0x%08lX (size=%zu)\n", hr, encodedSize);
        return false;
    }

    // Let WIC auto-detect the codec from the bytes.
    ComPtr<IWICBitmapDecoder> decoder;
    hr = g_factory->CreateDecoderFromStream(stream.Get(), nullptr,
                                            WICDecodeMetadataCacheOnDemand,
                                            decoder.GetAddressOf());
    if (FAILED(hr)) {
        std::fprintf(stderr, "[wic] CreateDecoderFromStream failed: 0x%08lX (size=%zu)\n", hr, encodedSize);
        return false;
    }

    ComPtr<IWICBitmapFrameDecode> frame;
    hr = decoder->GetFrame(0, frame.GetAddressOf());
    if (FAILED(hr)) {
        std::fprintf(stderr, "[wic] GetFrame failed: 0x%08lX\n", hr);
        return false;
    }

    UINT w = 0, h = 0;
    hr = frame->GetSize(&w, &h);
    if (FAILED(hr) || w == 0 || h == 0) {
        std::fprintf(stderr, "[wic] GetSize failed/zero: 0x%08lX (%ux%u)\n", hr, w, h);
        return false;
    }

    // Convert to 32bppRGBA so the output is always GPU-uploadable.
    ComPtr<IWICFormatConverter> converter;
    hr = g_factory->CreateFormatConverter(converter.GetAddressOf());
    if (FAILED(hr)) {
        std::fprintf(stderr, "[wic] CreateFormatConverter failed: 0x%08lX\n", hr);
        return false;
    }
    hr = converter->Initialize(frame.Get(), GUID_WICPixelFormat32bppRGBA,
                               WICBitmapDitherTypeNone, nullptr, 0.0,
                               WICBitmapPaletteTypeMedianCut);
    if (FAILED(hr)) {
        std::fprintf(stderr, "[wic] FormatConverter::Initialize failed: 0x%08lX\n", hr);
        return false;
    }

    const UINT stride = w * 4u;
    const size_t total = static_cast<size_t>(stride) * h;
    outRGBA.resize(total);
    hr = converter->CopyPixels(nullptr, stride, static_cast<UINT>(total), outRGBA.data());
    if (FAILED(hr)) {
        std::fprintf(stderr, "[wic] CopyPixels failed: 0x%08lX\n", hr);
        outRGBA.clear();
        return false;
    }

    outWidth = static_cast<int>(w);
    outHeight = static_cast<int>(h);
    return true;
}

} // namespace image_decoder
