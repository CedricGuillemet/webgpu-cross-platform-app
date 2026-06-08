package com.dawntest;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Java-side HTTP helper invoked from the C++ http_fetcher via JNI.
 *  Synchronous because the C++ side calls us from a background render
 *  thread that is OK to block. */
public final class HttpFetcher {

    /** Download a URL into a byte[]. Returns null on any failure
     *  (network error, non-2xx status, IOException, etc.). */
    public static byte[] download(String url) {
        HttpURLConnection conn = null;
        try {
            URL u = new URL(url);
            conn = (HttpURLConnection) u.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout(30_000);
            conn.setRequestMethod("GET");
            // Some CDNs (e.g. raw.githubusercontent.com) refuse default UA.
            conn.setRequestProperty("User-Agent", "DawnTest/0.1 (Android)");
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                android.util.Log.w("DawnTest", "HTTP " + code + " for " + url);
                return null;
            }
            try (InputStream in = conn.getInputStream();
                 ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024)) {
                byte[] buf = new byte[16 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                }
                return out.toByteArray();
            }
        } catch (Throwable t) {
            android.util.Log.e("DawnTest", "download failed: " + url, t);
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private HttpFetcher() {}
}
