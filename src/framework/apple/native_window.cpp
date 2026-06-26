#include "native_window.h"

#include <cstdio>

namespace native_window {

Window::Window()  = default;
Window::~Window() { destroy(); }

bool Window::create(int width, int height, const std::string& /*title*/, bool /*visible*/) {
    width_ = width;
    height_ = height;
    std::fprintf(stderr, "[window] Apple native_window is a stub; cannot run interactively.\n");
    return true;
}

void Window::destroy() {}

bool Window::pumpEvents() { return !shouldClose_; }

void Window::getClientSize(int& widthPx, int& heightPx) const {
    widthPx = width_;
    heightPx = height_;
}

} // namespace native_window
