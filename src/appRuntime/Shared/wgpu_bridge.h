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

// Disable vsync on the next canvasContext.configure(). When true, the surface
// is configured with PresentMode::Immediate (fallback Mailbox, fallback Fifo)
// so the render loop runs as fast as the GPU can present — required for
// meaningful benchmark timings. Must be called before the first configure.
void setNoVsync(bool noVsync);

// Release all Dawn objects in a controlled order. Call after JS execution has
// stopped and before destroying the native window, so the backend (notably
// D3D11) doesn't tear down its swapchain after the HWND is gone.
void shutdown();

} // namespace wgpu_bridge
