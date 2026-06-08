package com.dawntest;

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;

/** SurfaceView that forwards lifecycle + input events to the native
 *  bridge. Subclassing SurfaceView gives us a Surface (the underlying
 *  pixel buffer) that Dawn's Vulkan backend can render into directly
 *  via ANativeWindow_fromSurface. */
public class DawnView extends SurfaceView implements SurfaceHolder.Callback {

    public DawnView(Context context) {
        super(context);
        init();
    }

    public DawnView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        getHolder().addCallback(this);
        // Don't use the legacy software canvas — we'll render directly.
        setFocusable(true);
        setFocusableInTouchMode(true);
    }

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        Surface s = holder.getSurface();
        int w = getWidth();
        int h = getHeight();
        NativeBridge.nativeSurfaceCreated(s, w, h);
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
        NativeBridge.nativeSurfaceChanged(width, height);
    }

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        NativeBridge.nativeSurfaceDestroyed();
    }

    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        // Map Android MotionEvent into the dom_shim::PointerEvent::Kind enum.
        int kind;
        switch (ev.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN:
                kind = 1;  // Down
                break;
            case MotionEvent.ACTION_MOVE:
                kind = 0;  // Move
                break;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP:
            case MotionEvent.ACTION_CANCEL:
                kind = 2;  // Up
                break;
            default:
                return false;
        }
        NativeBridge.nativePointerEvent(kind, ev.getX(), ev.getY(), 0, 0.0);
        return true;
    }
}
