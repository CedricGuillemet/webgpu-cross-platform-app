#pragma once

#include "chakra_host.h"

#include <webgpu/webgpu_cpp.h>

#include <cstdint>
#include <string>

namespace wgpu_bridge {

// Install navigator.gpu and global GPU* prototypes onto the current JS global.
// `nativeWindow` is an opaque platform handle (HWND on Windows) used for the
// initial surface size queries; `surface` is the already-built Dawn surface.
void install(cx::Host& host, wgpu::Instance instance, wgpu::Surface surface,
             void* nativeWindow, int width, int height);

// Called once per frame to allow Dawn to process events (queue work done, etc.).
void tick();

// Process callbacks (kept simple — most APIs run synchronously via WaitAny).
void processEvents();

// Update the cached framebuffer pixel size (called from the window resize
// callback). The next `canvasContext.configure` call will use the new size.
void onResize(int widthPx, int heightPx);

// Request a PNG screenshot of the current backbuffer on the next present().
// The image is written using WIC at the configured surface size.
void requestScreenshot(const std::string& outPath);

} // namespace wgpu_bridge
