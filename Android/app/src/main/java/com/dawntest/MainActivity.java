package com.dawntest;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;

import java.io.File;
import java.io.IOException;

public class MainActivity extends Activity {

    private static final String TAG = "DawnTest";

    private DawnView view;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep the screen on; rendering loop runs continuously.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // The C++ JS module loader uses std::ifstream which can't read APK
        // assets directly. Extract them to filesDir once at boot so the
        // existing filesystem code paths Just Work.
        File assetsRoot = new File(getFilesDir(), "assets");
        try {
            AssetExtractor.extractAll(getAssets(), assetsRoot);
            Log.i(TAG, "Assets extracted to " + assetsRoot.getAbsolutePath());
        } catch (IOException e) {
            Log.e(TAG, "Asset extraction failed", e);
        }

        // Use the extracted absolute path so std::ifstream can open it.
        String bundlePath = new File(assetsRoot, "bundle/scene200.js").getAbsolutePath();

        NativeBridge.nativeInit(
                getAssets(),
                getFilesDir().getAbsolutePath(),
                getCacheDir().getAbsolutePath(),
                bundlePath,
                1280,
                720);

        view = new DawnView(this);
        setContentView(view);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        NativeBridge.nativeAppDestroyed();
    }
}

