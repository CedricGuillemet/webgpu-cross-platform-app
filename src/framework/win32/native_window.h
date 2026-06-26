#pragma once

#include <cstdint>
#include <functional>
#include <string>

namespace native_window {

// Minimal Win32 window wrapper used in place of GLFW. Exposes the raw HWND
// (as an opaque void*) so wgpu::SurfaceSourceWindowsHWND can be filled in.
class Window {
public:
    struct PointerEvent {
        enum Kind { Move, Down, Up, Wheel, Enter, Leave };
        Kind kind;
        double x;
        double y;
        int button;     // 0=left, 1=middle, 2=right
        double deltaY;  // wheel delta in pixels (positive = scroll up)
    };

    using PointerCallback = std::function<void(const PointerEvent&)>;
    using ResizeCallback = std::function<void(int widthPx, int heightPx)>;

    Window();
    ~Window();

    bool create(int width, int height, const std::string& title, bool visible = true);
    void destroy();

    // Drain the queued Win32 messages. Returns false when the window has been
    // asked to close.
    bool pumpEvents();

    bool shouldClose() const { return shouldClose_; }
    void setShouldClose(bool v) { shouldClose_ = v; }

    // Pixel-accurate client-area size (matches what Dawn needs for the swapchain).
    void getClientSize(int& widthPx, int& heightPx) const;

    void* hwnd() const { return hwnd_; }
    void* hinstance() const { return hinstance_; }

    void setPointerCallback(PointerCallback cb) { pointerCb_ = std::move(cb); }
    void setResizeCallback(ResizeCallback cb) { resizeCb_ = std::move(cb); }

private:
    static long long __stdcall wndProcThunk(void* hwnd, unsigned int msg, unsigned long long wParam, long long lParam);
    long long handleMessage(unsigned int msg, unsigned long long wParam, long long lParam);

    void* hwnd_ = nullptr;
    void* hinstance_ = nullptr;
    bool shouldClose_ = false;

    PointerCallback pointerCb_;
    ResizeCallback resizeCb_;
};

} // namespace native_window
