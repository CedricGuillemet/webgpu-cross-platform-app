#pragma once

#include <cstdint>
#include <functional>
#include <string>

struct ANativeWindow;

namespace native_window {

class Window {
public:
    struct PointerEvent {
        enum Kind { Move, Down, Up, Wheel, Enter, Leave };
        Kind kind;
        double x;
        double y;
        int button;
        double deltaY;
    };

    using PointerCallback = std::function<void(const PointerEvent&)>;
    using ResizeCallback  = std::function<void(int widthPx, int heightPx)>;

    Window();
    ~Window();

    // No window creation on Android (the Surface is created by the
    // SurfaceView on the Java side). The JNI bridge calls attachSurface()
    // with a strong reference to the ANativeWindow obtained from the
    // SurfaceHolder.
    bool create(int width, int height, const std::string& title);
    void destroy();

    // Called by JNI when the SurfaceView's surface is (re)created.
    void attachSurface(ANativeWindow* w, int widthPx, int heightPx);
    void detachSurface();

    bool pumpEvents();

    bool shouldClose() const { return shouldClose_; }
    void setShouldClose(bool v) { shouldClose_ = v; }

    void getClientSize(int& widthPx, int& heightPx) const;

    // hwnd() returns the ANativeWindow* cast to void*, which is what the
    // wgpu surface creation code on Android wants.
    void* hwnd() const { return window_; }
    void* hinstance() const { return nullptr; }
    ANativeWindow* aNativeWindow() const { return window_; }

    void setPointerCallback(PointerCallback cb) { pointerCb_ = std::move(cb); }
    void setResizeCallback(ResizeCallback cb)   { resizeCb_  = std::move(cb);  }

    // Called from JNI to deliver input events.
    void pushPointerEvent(const PointerEvent& ev) { if (pointerCb_) pointerCb_(ev); }
    void pushResize(int w, int h);

private:
    ANativeWindow* window_ = nullptr;
    int            width_  = 0;
    int            height_ = 0;
    bool           shouldClose_ = false;

    PointerCallback pointerCb_;
    ResizeCallback  resizeCb_;
};

} // namespace native_window
