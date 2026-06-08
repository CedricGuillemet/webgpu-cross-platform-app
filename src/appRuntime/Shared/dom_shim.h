#pragma once

#include "chakra_host.h"

#include <string>

namespace dom_shim {

// Install all DOM/browser-related globals (document, navigator, window, console,
// performance, requestAnimationFrame, fetch, URL, ImageBitmap, etc.) onto the
// current Chakra global object.
//
// `initialWidth`/`initialHeight` seed the canvas pixel size; later updates
// come from `pushResizeEvent`.
void installGlobals(cx::Host& host, int initialWidth, int initialHeight);

// Called from the main loop once per frame: dispatches queued
// requestAnimationFrame callbacks and microtasks.
void runAnimationFrame(cx::Host& host, double timestampMs);

// Push an input event into the JS event queue (mouse move/up/down/wheel).
struct PointerEvent {
    enum Kind { Move, Down, Up, Wheel, Enter, Leave };
    Kind kind;
    double x, y;
    int button;
    double deltaY;
};
void pushPointerEvent(cx::Host& host, const PointerEvent& ev);

// Push a window resize event.
void pushResizeEvent(cx::Host& host, int widthPx, int heightPx);

// Return current canvas pixel size (after device pixel ratio applied).
void getCanvasPixelSize(int& w, int& h);

// Set the directory that contains the bundle entry script. Used by `fetch`
// to resolve relative / site-absolute (`/foo`) paths to local files.
void setBundleBaseDir(const std::string& dir);

} // namespace dom_shim
