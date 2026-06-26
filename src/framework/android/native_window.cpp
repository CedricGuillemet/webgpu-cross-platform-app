#include "native_window.h"

#include <android/native_window.h>

namespace native_window {

Window::Window() = default;
Window::~Window() { destroy(); }

bool Window::create(int width, int height, const std::string& /*title*/, bool /*visible*/) {
    // No-op: the Java side owns the actual Surface. We just stash the
    // requested size so getClientSize() has a sensible default until the
    // surface arrives.
    width_  = width;
    height_ = height;
    return true;
}

void Window::destroy() {
    detachSurface();
}

void Window::attachSurface(ANativeWindow* w, int widthPx, int heightPx) {
    if (window_ == w) return;
    if (window_) ANativeWindow_release(window_);
    window_ = w;
    if (window_) ANativeWindow_acquire(window_);
    if (widthPx  > 0) width_  = widthPx;
    if (heightPx > 0) height_ = heightPx;
    if (window_) {
        // Pull the real surface size if the caller didn't pass one.
        int rw = ANativeWindow_getWidth(window_);
        int rh = ANativeWindow_getHeight(window_);
        if (rw > 0) width_  = rw;
        if (rh > 0) height_ = rh;
    }
}

void Window::detachSurface() {
    if (window_) {
        ANativeWindow_release(window_);
        window_ = nullptr;
    }
}

bool Window::pumpEvents() {
    // Java thread drives the loop; nothing to do here.
    return !shouldClose_;
}

void Window::getClientSize(int& widthPx, int& heightPx) const {
    widthPx  = width_;
    heightPx = height_;
}

void Window::pushResize(int w, int h) {
    width_ = w;
    height_ = h;
    if (resizeCb_) resizeCb_(w, h);
}

} // namespace native_window
