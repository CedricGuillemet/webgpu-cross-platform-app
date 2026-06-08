package com.dawntest;

import android.content.res.AssetManager;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** Extracts everything under {@code assets/} in the APK into the app's
 *  internal storage. We do this because the C++ side uses
 *  {@code std::ifstream} for module loading (QuickJS chakra_host) and for
 *  HTTP cache writes — neither of which can read directly from an
 *  AAssetManager. Mirrored layout means existing relative URL resolution
 *  Just Works. */
public final class AssetExtractor {

    private static final String TAG = "DawnTest";

    /** Extract the entire assets/ tree (recursively) into {@code targetRoot},
     *  preserving relative paths. Existing files are overwritten so an
     *  upgraded APK refreshes them. */
    public static void extractAll(AssetManager am, File targetRoot) throws IOException {
        if (!targetRoot.exists() && !targetRoot.mkdirs()) {
            throw new IOException("could not mkdir " + targetRoot.getAbsolutePath());
        }
        extractDir(am, "", targetRoot);
    }

    private static void extractDir(AssetManager am, String assetPath, File targetDir) throws IOException {
        String[] entries = am.list(assetPath);
        if (entries == null) return;
        if (!targetDir.exists() && !targetDir.mkdirs()) {
            throw new IOException("could not mkdir " + targetDir.getAbsolutePath());
        }
        for (String name : entries) {
            String childAsset = assetPath.isEmpty() ? name : assetPath + "/" + name;
            File childTarget = new File(targetDir, name);

            // Heuristic: a leaf asset has a 0-length list() result. The
            // platform packagers (e.g. AGP) treat some real files this way
            // too (no children + a payload), so we try to open as file first.
            boolean copied = tryCopy(am, childAsset, childTarget);
            if (!copied) {
                extractDir(am, childAsset, childTarget);
            }
        }
    }

    private static boolean tryCopy(AssetManager am, String assetPath, File target) {
        InputStream in = null;
        FileOutputStream out = null;
        try {
            in = am.open(assetPath);
            File parent = target.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            out = new FileOutputStream(target);
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return true;
        } catch (IOException e) {
            // assetPath is a directory rather than a file; caller will recurse.
            return false;
        } finally {
            if (in != null) try { in.close(); } catch (IOException ignored) {}
            if (out != null) try { out.close(); } catch (IOException ignored) {}
        }
    }

    private AssetExtractor() {}
}
