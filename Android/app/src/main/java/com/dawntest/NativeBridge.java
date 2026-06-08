package com.dawntest;

// Thin static wrapper around the C++ JNI surface. Methods are declared
// `native` and resolved when the shared library is loaded by MainActivity.
public final class NativeBridge {
    static {
        System.loadLibrary("dawntest");
    }

    public static native void nativeInit(
            android.content.res.AssetManager assetManager,
            String dataDir,
            String cacheDir,
            String bundlePath,
            int width,
            int height);

    public static native void nativeSurfaceCreated(android.view.Surface surface, int width, int height);
    public static native void nativeSurfaceChanged(int width, int height);
    public static native void nativeSurfaceDestroyed();
    public static native void nativeAppDestroyed();

    // kind: 0=Move, 1=Down, 2=Up, 3=Wheel, 4=Enter, 5=Leave (matches
    // dom_shim::PointerEvent::Kind in C++).
    public static native void nativePointerEvent(int kind, double x, double y, int button, double deltaY);

    private NativeBridge() {}
}
