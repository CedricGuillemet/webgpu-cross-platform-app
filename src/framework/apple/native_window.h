#pragma once
// Apple native_window: same interface as the win32 wrapper. macOS would use
// NSWindow + CAMetalLayer; iOS would use UIView + CAMetalLayer; both feed
// into wgpu::SurfaceSourceMetalLayer. For now this is a no-op host stub.

#include <cstdint>
#include <functional>
#include <string>

namespace native_window {

class Window {
public:
    struct PointerEvent {
        enum Kind { Move, Down, Up, Wheel, Enter, Leave };
        Kind kind;
        double x, y;
        int button;
        double deltaY;
    };

    using PointerCallback = std::function<void(const PointerEvent&)>;
    using ResizeCallback  = std::function<void(int widthPx, int heightPx)>;

    Window();
    ~Window();

    bool create(int width, int height, const std::string& title, bool visible = true);
    void destroy();
    bool pumpEvents();

    bool shouldClose() const { return shouldClose_; }
    void setShouldClose(bool v) { shouldClose_ = v; }

    void getClientSize(int& widthPx, int& heightPx) const;

    // hwnd()/hinstance() return null on Apple; the Metal surface descriptor
    // wants a CAMetalLayer* obtained from the NSView, not these handles.
    void* hwnd() const { return nullptr; }
    void* hinstance() const { return nullptr; }

    void setPointerCallback(PointerCallback cb) { pointerCb_ = std::move(cb); }
    void setResizeCallback(ResizeCallback cb)   { resizeCb_  = std::move(cb); }

private:
    int  width_ = 0;
    int  height_ = 0;
    bool shouldClose_ = true;  // stub: exit immediately

    PointerCallback pointerCb_;
    ResizeCallback  resizeCb_;
};

} // namespace native_window
