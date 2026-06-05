#pragma once

#include <cstdint>
#include <string>
#include <vector>

struct AAssetManager;

namespace fs_loader {

// ---- Android setup hooks (called from JNI bridge) ----
// The AAssetManager is owned by the Java side; we just borrow the pointer.
// Pass nullptr to clear before the AssetManager is GC'd.
void setAssetManager(AAssetManager* mgr);

// Internal storage dir (filesDir from the JVM, e.g.
// "/data/data/com.dawntest/files"). Used as the default writable root for
// http_fetcher cache and for resolving absolute paths.
void setInternalDataDir(const std::string& dir);

// Cache dir (cacheDir from the JVM, used for transient writes).
void setCacheDir(const std::string& dir);

// ---- Same surface as the win32 version (do NOT change signatures) ----
bool readTextFile(const std::string& path, std::string& out);
bool readBinaryFile(const std::string& path, std::vector<uint8_t>& out);
bool writeBinaryFile(const std::string& path, const uint8_t* data, size_t size);

// "Executable dir" doesn't exist on Android; we return the internal data dir
// instead. Bundle assets are resolved against this value, which lets the
// existing code path `assets/bundle/sceneN.js` resolve to an absolute path
// rooted at the internal data dir. We also accept paths beginning with
// "assets/" verbatim and serve them out of the APK via AAssetManager.
std::string executableDir();
std::string resolveResource(const std::string& relativePath);

} // namespace fs_loader
