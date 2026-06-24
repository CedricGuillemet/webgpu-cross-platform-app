#include "dom_shim.h"

#include "fs_loader.h"
#include "http_fetcher.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <deque>
#include <filesystem>
#include <map>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace fs = std::filesystem;

namespace dom_shim {
// Forward declaration: real impl below uses stb_image.
JsValueRef CHAKRA_CALLBACK createImageBitmapFn(JsValueRef, bool, JsValueRef* args, unsigned short argc, void*);
}

namespace dom_shim {
namespace {

cx::Host* g_host = nullptr;

int g_canvasW = 800;
int g_canvasH = 600;

double monotonicMs() {
    using clock = std::chrono::steady_clock;
    static const auto t0 = clock::now();
    return std::chrono::duration<double, std::milli>(clock::now() - t0).count();
}

// ---- Pending event queues ------------------------------------------------
struct EventListener {
    JsValueRef fn;
    bool capture;
};

// targetName -> eventType -> list of listeners
std::unordered_map<std::string, std::unordered_map<std::string, std::vector<EventListener>>> g_listeners;

void addListener(const std::string& target, const std::string& type, JsValueRef fn) {
    if (!fn) return;
    JsAddRef(fn, nullptr);
    g_listeners[target][type].push_back({fn, false});
}

void dispatchEventTo(const std::string& target, const std::string& type, JsValueRef eventObj) {
    auto it = g_listeners.find(target);
    if (it == g_listeners.end()) return;
    auto it2 = it->second.find(type);
    if (it2 == it->second.end()) return;
    JsValueRef undef = cx::Host::getUndefined();
    for (auto& l : it2->second) {
        JsValueRef args[2] = { undef, eventObj };
        JsValueRef r = nullptr;
        JsCallFunction(l.fn, args, 2, &r);
        if (g_host) g_host->reportException(("event " + type).c_str());
    }
}

// ---- requestAnimationFrame queue ----------------------------------------
std::vector<JsValueRef> g_rafCallbacks;
int g_nextRafId = 1;
std::unordered_map<int, JsValueRef> g_rafById;

// setTimeout/Interval (very basic).
struct Timer { JsValueRef fn; double dueMs; double intervalMs; bool repeat; bool cancelled; };
std::map<int, Timer> g_timers;
int g_nextTimerId = 1;

// Directory of the bundle entry script (set via setBundleBaseDir). Used to
// resolve relative / site-absolute (`/foo`) fetch URLs against local files.
std::string g_bundleBaseDir;

// Extra search root for site-absolute `/foo/bar.png` URLs that Babylon-Lite
// playgrounds expect a dev server to serve (the lab/public/ tree).
// Filled in resolveLocal() lazily on first call.
std::string g_publicAssetsRoot;
std::string findPublicAssetsRoot() {
    if (!g_publicAssetsRoot.empty()) return g_publicAssetsRoot;
    // Walk upwards from the bundle dir; at each level also check siblings.
    // Babylon-Lite usually lives at "<DawnTest>/Babylon-Lite/lab/public" while
    // our bundles run from "<DawnTest>/webgpu-cross-platform-app/build*/assets/bundle".
    auto check = [](const fs::path& root) -> std::string {
        std::error_code ec;
        if (fs::exists(root / "textures", ec) || fs::exists(root / "scenes", ec)
            || fs::exists(root / "models", ec) || fs::exists(root / "meshes", ec)) {
            return root.string();
        }
        return {};
    };
    static const char* kRelLeaves[] = { "lab/public", "pages/public", "public" };
    static const char* kSiblings[]  = { "Babylon-Lite", "babylon-lite", "lite" };
    fs::path p = g_bundleBaseDir;
    for (int hops = 0; hops < 8 && !p.empty(); ++hops) {
        for (const char* leaf : kRelLeaves) {
            auto r = check(p / leaf);
            if (!r.empty()) { g_publicAssetsRoot = r;
                std::fprintf(stderr, "[fetch] public assets root: %s\n", r.c_str()); return r; }
        }
        // Check sibling Babylon-Lite-style trees at this level.
        for (const char* sib : kSiblings) {
            for (const char* leaf : kRelLeaves) {
                auto r = check(p / sib / leaf);
                if (!r.empty()) { g_publicAssetsRoot = r;
                    std::fprintf(stderr, "[fetch] public assets root: %s\n", r.c_str()); return r; }
            }
        }
        if (!p.has_parent_path() || p.parent_path() == p) break;
        p = p.parent_path();
    }
    g_publicAssetsRoot = "<none>";
    return g_publicAssetsRoot;
}

// Try to find a file referenced from JS as a local file. Returns "" if none.
std::string resolveLocal(const std::string& url) {
    // Absolute filesystem path (Windows drive or POSIX root) or file:// URI.
    if (url.rfind("file://", 0) == 0) {
        std::string p = url.substr(7);
        if (fs::exists(p)) return p;
    }
    if (url.size() >= 2 && url[1] == ':') {
        if (fs::exists(url)) return url;
    }
    // Site-absolute path like "/brdf-lut.png": look next to the bundle entry.
    if (!url.empty() && url[0] == '/') {
        fs::path candidate = fs::path(g_bundleBaseDir) / url.substr(1);
        if (fs::exists(candidate)) return candidate.string();
        // Fall back to the lab/public/ tree shipped with Babylon-Lite.
        std::string root = findPublicAssetsRoot();
        if (root != "<none>") {
            fs::path c2 = fs::path(root) / url.substr(1);
            if (fs::exists(c2)) return c2.string();
        }
    }
    // Relative path: try the bundle dir.
    if (!url.empty() && url[0] != '/') {
        fs::path candidate = fs::path(g_bundleBaseDir) / url;
        if (fs::exists(candidate)) return candidate.string();
    }
    return {};
}

// Minimal base64 decoder for data: URLs.
static int b64char(int c) {
    if (c >= 'A' && c <= 'Z') return c - 'A';
    if (c >= 'a' && c <= 'z') return c - 'a' + 26;
    if (c >= '0' && c <= '9') return c - '0' + 52;
    if (c == '+' || c == '-') return 62;
    if (c == '/' || c == '_') return 63;
    return -1;
}
static bool b64decode(const std::string& in, std::vector<uint8_t>& out) {
    out.clear();
    out.reserve(in.size() * 3 / 4 + 4);
    int buf = 0, bits = 0;
    for (char c : in) {
        if (c == '=' || c == '\n' || c == '\r' || c == ' ' || c == '\t') continue;
        int v = b64char((unsigned char)c);
        if (v < 0) return false;
        buf = (buf << 6) | v;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out.push_back((uint8_t)((buf >> bits) & 0xff));
        }
    }
    return true;
}

// ---- Native function helpers ------------------------------------------------

JsValueRef CHAKRA_CALLBACK consoleLog(JsValueRef /*callee*/, bool /*isConstructor*/, JsValueRef* args, unsigned short argc, void* data) {
    const char* tag = static_cast<const char*>(data);
    std::fprintf(stderr, "[js%s]", tag ? tag : "");
    for (unsigned short i = 1; i < argc; ++i) {
        std::string s = cx::Host::toUtf8(args[i]);
        std::fprintf(stderr, " %s", s.c_str());
    }
    std::fprintf(stderr, "\n");
    return cx::Host::getUndefined();
}

JsValueRef CHAKRA_CALLBACK performanceNow(JsValueRef, bool, JsValueRef*, unsigned short, void*) {
    return cx::Host::fromDouble(monotonicMs());
}

JsValueRef CHAKRA_CALLBACK dateNow(JsValueRef, bool, JsValueRef*, unsigned short, void*) {
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    return cx::Host::fromDouble(static_cast<double>(ms));
}

JsValueRef CHAKRA_CALLBACK requestAnimationFrame(JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) {
    if (argc < 2) return cx::Host::fromInt(0);
    int id = g_nextRafId++;
    JsAddRef(args[1], nullptr);
    g_rafById[id] = args[1];
    g_rafCallbacks.push_back(args[1]);
    return cx::Host::fromInt(id);
}

JsValueRef CHAKRA_CALLBACK cancelAnimationFrame(JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) {
    if (argc < 2) return cx::Host::getUndefined();
    int id = cx::Host::getInt(args[1]);
    auto it = g_rafById.find(id);
    if (it != g_rafById.end()) {
        // Remove from pending list too
        g_rafCallbacks.erase(std::remove(g_rafCallbacks.begin(), g_rafCallbacks.end(), it->second), g_rafCallbacks.end());
        JsRelease(it->second, nullptr);
        g_rafById.erase(it);
    }
    return cx::Host::getUndefined();
}

JsValueRef CHAKRA_CALLBACK setTimeoutFn(JsValueRef, bool, JsValueRef* args, unsigned short argc, void* data) {
    bool repeat = data != nullptr;
    if (argc < 2) return cx::Host::fromInt(0);
    int id = g_nextTimerId++;
    Timer t;
    t.fn = args[1];
    JsAddRef(t.fn, nullptr);
    t.intervalMs = (argc >= 3) ? cx::Host::getDouble(args[2]) : 0.0;
    t.dueMs = monotonicMs() + t.intervalMs;
    t.repeat = repeat;
    t.cancelled = false;
    g_timers[id] = t;
    return cx::Host::fromInt(id);
}

JsValueRef CHAKRA_CALLBACK clearTimerFn(JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) {
    if (argc < 2) return cx::Host::getUndefined();
    int id = cx::Host::getInt(args[1]);
    auto it = g_timers.find(id);
    if (it != g_timers.end()) {
        it->second.cancelled = true;
        JsRelease(it->second.fn, nullptr);
        g_timers.erase(it);
    }
    return cx::Host::getUndefined();
}

JsValueRef CHAKRA_CALLBACK addEventListenerFn(JsValueRef, bool, JsValueRef* args, unsigned short argc, void* data) {
    const char* target = static_cast<const char*>(data);
    if (argc < 3) return cx::Host::getUndefined();
    std::string type = cx::Host::toUtf8(args[1]);
    addListener(target ? target : "window", type, args[2]);
    return cx::Host::getUndefined();
}

JsValueRef CHAKRA_CALLBACK removeEventListenerFn(JsValueRef, bool, JsValueRef* args, unsigned short argc, void* data) {
    const char* target = static_cast<const char*>(data);
    if (argc < 3) return cx::Host::getUndefined();
    std::string type = cx::Host::toUtf8(args[1]);
    auto& bucket = g_listeners[target ? target : "window"][type];
    bucket.erase(std::remove_if(bucket.begin(), bucket.end(), [&](EventListener& l) {
        bool eq=false; JsEquals(l.fn, args[2], &eq);
        if (eq) { JsRelease(l.fn, nullptr); return true; }
        return false;
    }), bucket.end());
    return cx::Host::getUndefined();
}

JsValueRef CHAKRA_CALLBACK getElementByIdFn(JsValueRef, bool, JsValueRef*, unsigned short, void*) {
    // The canvas is the only DOM element we support; return the global canvas object.
    return cx::Host::getProperty(cx::Host::globalObject(), "__canvas");
}

JsValueRef CHAKRA_CALLBACK getContextFn(JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) {
    if (argc < 2) return cx::Host::getNull();
    std::string type = cx::Host::toUtf8(args[1]);
    if (type == "webgpu") {
        return cx::Host::getProperty(cx::Host::globalObject(), "__webgpuContext");
    }
    if (type == "2d" || type == "bitmaprenderer") {
        // Minimal stub — many sprite scenes only use this to read/write the
        // imageSmoothingEnabled property or to clear/fillRect at startup. We
        // provide enough to avoid crashes; nothing is actually drawn.
        JsValueRef g = cx::Host::globalObject();
        if (cx::Host::hasProperty(g, "__2dContext")) {
            return cx::Host::getProperty(g, "__2dContext");
        }
        JsValueRef ctx = cx::Host::makeObject();
        cx::Host::setProperty(ctx, "imageSmoothingEnabled", cx::Host::fromBool(true));
        cx::Host::setProperty(ctx, "fillStyle", cx::Host::fromUtf8("#000"));
        cx::Host::setProperty(ctx, "strokeStyle", cx::Host::fromUtf8("#000"));
        cx::Host::setProperty(ctx, "lineWidth", cx::Host::fromDouble(1.0));
        cx::Host::setProperty(ctx, "font", cx::Host::fromUtf8("10px sans-serif"));
        cx::Host::setProperty(ctx, "textAlign", cx::Host::fromUtf8("start"));
        cx::Host::setProperty(ctx, "textBaseline", cx::Host::fromUtf8("alphabetic"));
        cx::Host::setProperty(ctx, "globalAlpha", cx::Host::fromDouble(1.0));
        cx::Host::setProperty(ctx, "globalCompositeOperation", cx::Host::fromUtf8("source-over"));
        cx::Host::setProperty(ctx, "canvas", cx::Host::getProperty(cx::Host::globalObject(), "__canvas"));
        auto noop = +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); };
        const char* methods[] = {
            "save","restore","scale","rotate","translate","transform","setTransform","resetTransform",
            "clearRect","fillRect","strokeRect",
            "beginPath","closePath","moveTo","lineTo","bezierCurveTo","quadraticCurveTo","arc","arcTo","ellipse","rect",
            "fill","stroke","clip","isPointInPath","isPointInStroke",
            "fillText","strokeText","drawImage",
            "createLinearGradient","createRadialGradient","createPattern",
            "putImageData","drawFocusIfNeeded",
            "setLineDash","getLineDash",
        };
        for (auto* m : methods) cx::Host::setFunction(ctx, m, noop);
        // measureText returns an object with width
        cx::Host::setFunction(ctx, "measureText", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            JsValueRef o = cx::Host::makeObject();
            double w = 0.0;
            if (argc >= 2) { std::string s = cx::Host::toUtf8(args[1]); w = s.size() * 6.0; }
            cx::Host::setProperty(o, "width", cx::Host::fromDouble(w));
            cx::Host::setProperty(o, "actualBoundingBoxAscent", cx::Host::fromDouble(8.0));
            cx::Host::setProperty(o, "actualBoundingBoxDescent", cx::Host::fromDouble(2.0));
            return o;
        });
        // getImageData returns an ImageData-like with a zeroed Uint8ClampedArray
        cx::Host::setFunction(ctx, "getImageData", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            int w = (argc >= 4) ? cx::Host::getInt(args[3]) : 1;
            int h = (argc >= 5) ? cx::Host::getInt(args[4]) : 1;
            JsValueRef ab = nullptr;
            JsCreateArrayBuffer(static_cast<unsigned int>(w * h * 4), &ab);
            JsValueRef u8 = nullptr;
            JsCreateTypedArray(JsArrayTypeUint8, ab, 0, static_cast<unsigned int>(w * h * 4), &u8);
            JsValueRef o = cx::Host::makeObject();
            cx::Host::setProperty(o, "data", u8);
            cx::Host::setProperty(o, "width", cx::Host::fromInt(w));
            cx::Host::setProperty(o, "height", cx::Host::fromInt(h));
            return o;
        });
        cx::Host::setFunction(ctx, "createImageData", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            int w = (argc >= 2) ? cx::Host::getInt(args[1]) : 1;
            int h = (argc >= 3) ? cx::Host::getInt(args[2]) : 1;
            JsValueRef ab = nullptr;
            JsCreateArrayBuffer(static_cast<unsigned int>(w * h * 4), &ab);
            JsValueRef u8 = nullptr;
            JsCreateTypedArray(JsArrayTypeUint8, ab, 0, static_cast<unsigned int>(w * h * 4), &u8);
            JsValueRef o = cx::Host::makeObject();
            cx::Host::setProperty(o, "data", u8);
            cx::Host::setProperty(o, "width", cx::Host::fromInt(w));
            cx::Host::setProperty(o, "height", cx::Host::fromInt(h));
            return o;
        });
        cx::Host::setProperty(cx::Host::globalObject(), "__2dContext", ctx);
        return ctx;
    }
    return cx::Host::getNull();
}

// fetch: returns a Promise<Response> resolved synchronously from local file.
struct ResponseData {
    std::vector<uint8_t> bytes;
    std::string text;
    int status = 200;
    bool ok = true;
    std::string url;
};

JsValueRef makeResponseObject(const std::shared_ptr<ResponseData>& data) {
    JsValueRef r = cx::Host::makeObject();
    cx::Host::setProperty(r, "ok", cx::Host::fromBool(data->ok));
    cx::Host::setProperty(r, "status", cx::Host::fromInt(data->status));
    cx::Host::setProperty(r, "statusText", cx::Host::fromUtf8(data->ok ? "OK" : "Not Found"));
    cx::Host::setProperty(r, "url", cx::Host::fromUtf8(data->url));

    // Capture the data via JsCreateExternalObject for callbacks.
    struct Closure { std::shared_ptr<ResponseData> d; };
    auto* closure = new Closure{data};
    JsValueRef extObj = nullptr;
    JsCreateExternalObject(closure, [](void* p){ delete static_cast<Closure*>(p); }, &extObj);
    // IMPORTANT: keep the external object (and thus the ResponseData bytes) alive
    // for as long as the Response is reachable. arrayBuffer()/text()/json()/blob()
    // capture `closure` by raw pointer; without anchoring extObj to the Response,
    // GC can collect it mid-flight (e.g. while a large sibling asset loads),
    // freeing the bytes and yielding a use-after-free (garbage sizes/contents).
    cx::Host::setProperty(r, "__data", extObj);

    // headers: a minimal Headers-like object with get()/has()/forEach(). Some
    // bundles (e.g. fetch download-progress wrappers) call
    // `response.headers.get("content-type")` / `content-length`; without this
    // they crash with "Unable to get property 'get' of undefined". We synthesize
    // content-type from the URL extension and content-length from the payload.
    {
        // content-type from extension (case-insensitive, portable).
        std::string ct = "application/octet-stream";
        const std::string& u = data->url;
        auto endsWith = [&](const char* ext) {
            size_t n = std::strlen(ext);
            if (u.size() < n) return false;
            const char* tail = u.c_str() + (u.size() - n);
            for (size_t i = 0; i < n; ++i) {
                if (std::tolower(static_cast<unsigned char>(tail[i])) !=
                    std::tolower(static_cast<unsigned char>(ext[i]))) {
                    return false;
                }
            }
            return true;
        };
        if (endsWith(".json")) ct = "application/json";
        else if (endsWith(".js") || endsWith(".mjs")) ct = "text/javascript";
        else if (endsWith(".wasm")) ct = "application/wasm";
        else if (endsWith(".glb")) ct = "model/gltf-binary";
        else if (endsWith(".gltf")) ct = "model/gltf+json";
        else if (endsWith(".png")) ct = "image/png";
        else if (endsWith(".jpg") || endsWith(".jpeg")) ct = "image/jpeg";
        else if (endsWith(".webp")) ct = "image/webp";
        else if (endsWith(".ktx") || endsWith(".ktx2")) ct = "image/ktx2";
        else if (endsWith(".html")) ct = "text/html";
        else if (endsWith(".css")) ct = "text/css";
        else if (endsWith(".txt")) ct = "text/plain";

        struct HClosure { std::string contentType; std::string contentLength; };
        auto* hc = new HClosure{ct, std::to_string(data->bytes.size())};

        JsValueRef headers = cx::Host::makeObject();
        auto getFn = +[](JsValueRef, bool, JsValueRef* a, unsigned short argc, void* state) -> JsValueRef {
            auto* h = static_cast<HClosure*>(state);
            if (argc < 2) return cx::Host::getNull();
            std::string key = cx::Host::toUtf8(a[1]);
            for (auto& c : key) c = static_cast<char>(::tolower(static_cast<unsigned char>(c)));
            if (key == "content-type") return cx::Host::fromUtf8(h->contentType);
            if (key == "content-length") return cx::Host::fromUtf8(h->contentLength);
            return cx::Host::getNull();
        };
        auto hasFn = +[](JsValueRef, bool, JsValueRef* a, unsigned short argc, void* state) -> JsValueRef {
            if (argc < 2) return cx::Host::fromBool(false);
            std::string key = cx::Host::toUtf8(a[1]);
            for (auto& c : key) c = static_cast<char>(::tolower(static_cast<unsigned char>(c)));
            return cx::Host::fromBool(key == "content-type" || key == "content-length");
        };
        auto forEachFn = +[](JsValueRef, bool, JsValueRef* a, unsigned short argc, void* state) -> JsValueRef {
            auto* h = static_cast<HClosure*>(state);
            if (argc < 2) return cx::Host::getUndefined();
            JsValueRef cb = a[1];
            auto call = [&](const char* k, const std::string& v) {
                JsValueRef args[3] = { cx::Host::getUndefined(), cx::Host::fromUtf8(v), cx::Host::fromUtf8(k) };
                JsValueRef res = nullptr; JsCallFunction(cb, args, 3, &res);
            };
            call("content-type", h->contentType);
            call("content-length", h->contentLength);
            return cx::Host::getUndefined();
        };
        // Tie the HClosure lifetime to the headers object via an external object.
        JsValueRef hExt = nullptr;
        JsCreateExternalObject(hc, [](void* p){ delete static_cast<HClosure*>(p); }, &hExt);
        cx::Host::setProperty(headers, "__hc", hExt);
        cx::Host::setFunction(headers, "get", getFn, hc);
        cx::Host::setFunction(headers, "has", hasFn, hc);
        cx::Host::setFunction(headers, "forEach", forEachFn, hc);
        cx::Host::setProperty(r, "headers", headers);
    }

    // arrayBuffer() returns Promise<ArrayBuffer> — uses an external buffer so
    // we don't duplicate large payloads inside ChakraCore's heap.
    auto arrayBufferFn = +[](JsValueRef callee, bool, JsValueRef* args, unsigned short argc, void* state) -> JsValueRef {
        auto* c = static_cast<Closure*>(state);
        // Strong-ref the bytes for the lifetime of the JS ArrayBuffer via a
        // dedicated heap holder; finalizer releases.
        auto* hold = new std::shared_ptr<ResponseData>(c->d);
        JsValueRef ab = nullptr;
        JsErrorCode rc = JsCreateExternalArrayBuffer(
            const_cast<uint8_t*>(c->d->bytes.data()),
            static_cast<unsigned int>(c->d->bytes.size()),
            [](void* p){ delete static_cast<std::shared_ptr<ResponseData>*>(p); },
            hold, &ab);
        if (rc != JsNoError || !ab) {
            delete hold;
            std::fprintf(stderr, "[fetch] JsCreateExternalArrayBuffer failed (rc=%d size=%zu)\n", (int)rc, c->d->bytes.size());
            return cx::Host::rejectedPromise(cx::Host::fromUtf8("arrayBuffer alloc failed"));
        }
        return cx::Host::resolvedPromise(ab);
    };
    auto textFn = +[](JsValueRef, bool, JsValueRef*, unsigned short, void* state) -> JsValueRef {
        auto* c = static_cast<Closure*>(state);
        std::string txt(reinterpret_cast<const char*>(c->d->bytes.data()), c->d->bytes.size());
        return cx::Host::resolvedPromise(cx::Host::fromUtf8(txt));
    };
    auto jsonFn = +[](JsValueRef, bool, JsValueRef*, unsigned short, void* state) -> JsValueRef {
        auto* c = static_cast<Closure*>(state);
        std::string txt(reinterpret_cast<const char*>(c->d->bytes.data()), c->d->bytes.size());
        // Use the runtime's JSON.parse — JsParse is JS source, not JSON!
        JsValueRef g = cx::Host::globalObject();
        JsValueRef JSON = cx::Host::getProperty(g, "JSON");
        JsValueRef parse = cx::Host::getProperty(JSON, "parse");
        JsValueRef arg = cx::Host::fromUtf8(txt);
        JsValueRef args[2] = { JSON, arg };
        JsValueRef parsed = nullptr;
        if (JsCallFunction(parse, args, 2, &parsed) != JsNoError) {
            return cx::Host::rejectedPromise(cx::Host::fromUtf8("response.json: parse failed"));
        }
        return cx::Host::resolvedPromise(parsed);
    };
    auto blobFn = +[](JsValueRef, bool, JsValueRef*, unsigned short, void* state) -> JsValueRef {
        auto* c = static_cast<Closure*>(state);
        // Build a Blob that wraps an external ArrayBuffer pointing at our bytes.
        JsValueRef g = cx::Host::globalObject();
        JsValueRef BlobCtor = cx::Host::getProperty(g, "Blob");
        auto* hold = new std::shared_ptr<ResponseData>(c->d);
        JsValueRef ab = nullptr;
        JsErrorCode rc = JsCreateExternalArrayBuffer(
            const_cast<uint8_t*>(c->d->bytes.data()),
            static_cast<unsigned int>(c->d->bytes.size()),
            [](void* p){ delete static_cast<std::shared_ptr<ResponseData>*>(p); },
            hold, &ab);
        if (rc != JsNoError || !ab) {
            delete hold;
            std::fprintf(stderr, "[fetch] blob(): external ArrayBuffer alloc failed (size=%zu)\n", c->d->bytes.size());
            return cx::Host::rejectedPromise(cx::Host::fromUtf8("blob alloc failed"));
        }
        JsValueRef parts = cx::Host::makeArray(1);
        JsValueRef idx = cx::Host::fromInt(0);
        JsSetIndexedProperty(parts, idx, ab);
        JsValueRef args[2] = { cx::Host::getUndefined(), parts };
        JsValueRef blob = nullptr;
        JsConstructObject(BlobCtor, args, 2, &blob);
        return cx::Host::resolvedPromise(blob);
    };

    cx::Host::setFunction(r, "arrayBuffer", arrayBufferFn, closure);
    cx::Host::setFunction(r, "text", textFn, closure);
    cx::Host::setFunction(r, "json", jsonFn, closure);
    cx::Host::setFunction(r, "blob", blobFn, closure);
    return r;
}

JsValueRef CHAKRA_CALLBACK fetchFn(JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) {
    if (argc < 2) return cx::Host::rejectedPromise(cx::Host::fromUtf8("fetch: missing url"));
    std::string url = cx::Host::toUtf8(args[1]);
    auto data = std::make_shared<ResponseData>();
    data->url = url;

    // data: URL — synthesize bytes directly (no network / no file system).
    if (url.rfind("data:", 0) == 0) {
        size_t comma = url.find(',');
        if (comma == std::string::npos) {
            data->ok = false; data->status = 400;
            std::fprintf(stderr, "[fetch] malformed data: URL\n");
            return cx::Host::resolvedPromise(makeResponseObject(data));
        }
        std::string header  = url.substr(5, comma - 5);
        std::string payload = url.substr(comma + 1);
        bool isBase64 = header.find(";base64") != std::string::npos;
        if (isBase64) {
            if (!b64decode(payload, data->bytes)) {
                data->ok = false; data->status = 400;
                std::fprintf(stderr, "[fetch] data: base64 decode failed\n");
            }
        } else {
            // URL-decode percent-escapes.
            data->bytes.reserve(payload.size());
            for (size_t i = 0; i < payload.size(); ++i) {
                if (payload[i] == '%' && i + 2 < payload.size()) {
                    auto hex = [](char c)->int{ return (c>='0'&&c<='9')?c-'0':(c>='a'&&c<='f')?c-'a'+10:(c>='A'&&c<='F')?c-'A'+10:-1; };
                    int hi = hex(payload[i+1]), lo = hex(payload[i+2]);
                    if (hi >= 0 && lo >= 0) {
                        data->bytes.push_back((uint8_t)((hi<<4)|lo));
                        i += 2;
                        continue;
                    }
                }
                data->bytes.push_back((uint8_t)payload[i]);
            }
        }
        return cx::Host::resolvedPromise(makeResponseObject(data));
    }

    bool isRemote = (url.rfind("http://", 0) == 0 || url.rfind("https://", 0) == 0);
    if (isRemote) {
        // Always download fresh — no on-disk caching.
        std::fprintf(stderr, "[fetch] downloading %s\n", url.c_str());
        if (!http_fetcher::downloadToMemory(url, data->bytes)) {
            data->ok = false; data->status = 404;
            std::fprintf(stderr, "[fetch] 404 %s\n", url.c_str());
            return cx::Host::resolvedPromise(makeResponseObject(data));
        }
    } else {
        std::string local = resolveLocal(url);
        if (local.empty()) {
            data->ok = false; data->status = 404;
            std::fprintf(stderr, "[fetch] 404 (local) %s\n", url.c_str());
            return cx::Host::resolvedPromise(makeResponseObject(data));
        }
        if (!fs_loader::readBinaryFile(local, data->bytes)) {
            data->ok = false; data->status = 500;
        }
    }
    return cx::Host::resolvedPromise(makeResponseObject(data));
}

// Make the JS canvas object (we expose one global canvas).
JsValueRef makeCanvasObject(cx::Host& host) {
    JsValueRef canvas = cx::Host::makeObject();
    cx::Host::setProperty(canvas, "id", cx::Host::fromUtf8("renderCanvas"));
    cx::Host::setProperty(canvas, "width", cx::Host::fromInt(g_canvasW));
    cx::Host::setProperty(canvas, "height", cx::Host::fromInt(g_canvasH));
    cx::Host::setProperty(canvas, "clientWidth", cx::Host::fromInt(g_canvasW));
    cx::Host::setProperty(canvas, "clientHeight", cx::Host::fromInt(g_canvasH));
    cx::Host::setProperty(canvas, "dataset", cx::Host::makeObject());
    cx::Host::setProperty(canvas, "style", cx::Host::makeObject());
    cx::Host::setFunction(canvas, "getContext", getContextFn);
    cx::Host::setFunction(canvas, "addEventListener", addEventListenerFn, (void*)"canvas");
    cx::Host::setFunction(canvas, "removeEventListener", removeEventListenerFn, (void*)"canvas");
    // getBoundingClientRect returns an object with x/y/width/height
    cx::Host::setFunction(canvas, "getBoundingClientRect", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef {
        JsValueRef r = cx::Host::makeObject();
        cx::Host::setProperty(r, "x", cx::Host::fromInt(0));
        cx::Host::setProperty(r, "y", cx::Host::fromInt(0));
        cx::Host::setProperty(r, "left", cx::Host::fromInt(0));
        cx::Host::setProperty(r, "top", cx::Host::fromInt(0));
        cx::Host::setProperty(r, "right", cx::Host::fromInt(g_canvasW));
        cx::Host::setProperty(r, "bottom", cx::Host::fromInt(g_canvasH));
        cx::Host::setProperty(r, "width", cx::Host::fromInt(g_canvasW));
        cx::Host::setProperty(r, "height", cx::Host::fromInt(g_canvasH));
        return r;
    });
    // setPointerCapture / releasePointerCapture / focus — no-ops
    auto noop = +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); };
    cx::Host::setFunction(canvas, "setPointerCapture", noop);
    cx::Host::setFunction(canvas, "releasePointerCapture", noop);
    cx::Host::setFunction(canvas, "focus", noop);
    cx::Host::setFunction(canvas, "setAttribute", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        // accept and store on canvas itself for getAttribute symmetry
        if (argc >= 3) {
            JsValueRef canvasObj = cx::Host::getProperty(cx::Host::globalObject(), "__canvas");
            std::string n = cx::Host::toUtf8(args[1]);
            cx::Host::setProperty(canvasObj, n.c_str(), args[2]);
        }
        return cx::Host::getUndefined();
    });
    cx::Host::setFunction(canvas, "getAttribute", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        if (argc < 2) return cx::Host::getNull();
        JsValueRef canvasObj = cx::Host::getProperty(cx::Host::globalObject(), "__canvas");
        std::string n = cx::Host::toUtf8(args[1]);
        return cx::Host::getProperty(canvasObj, n.c_str());
    });
    cx::Host::setFunction(canvas, "removeAttribute", noop);
    cx::Host::setFunction(canvas, "hasAttribute", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        if (argc < 2) return cx::Host::fromBool(false);
        JsValueRef canvasObj = cx::Host::getProperty(cx::Host::globalObject(), "__canvas");
        std::string n = cx::Host::toUtf8(args[1]);
        return cx::Host::fromBool(cx::Host::hasProperty(canvasObj, n.c_str()));
    });
    cx::Host::setFunction(canvas, "querySelector", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getNull(); });
    cx::Host::setFunction(canvas, "dispatchEvent", noop);
    cx::Host::setFunction(canvas, "toDataURL", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef {
        // Stub: return a 1x1 transparent PNG.  Sprite atlases and similar
        // Babylon paths construct a placeholder texture from a canvas with no
        // 2D content; we can't actually rasterise the canvas, but at least
        // returning *valid* PNG bytes lets the bundle's decode path succeed
        // (it just gets a blank 1x1).
        return cx::Host::fromUtf8(
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg==");
    });
    cx::Host::setFunction(canvas, "toBlob", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        if (argc >= 2) {
            JsValueRef BlobCtor = cx::Host::getProperty(cx::Host::globalObject(), "Blob");
            JsValueRef parts = cx::Host::makeArray(0);
            JsValueRef ctorArgs[2] = { cx::Host::getUndefined(), parts };
            JsValueRef blob = nullptr;
            JsConstructObject(BlobCtor, ctorArgs, 2, &blob);
            JsValueRef cbArgs[2] = { cx::Host::getUndefined(), blob };
            JsValueRef r = nullptr;
            JsCallFunction(args[1], cbArgs, 2, &r);
        }
        return cx::Host::getUndefined();
    });
    // contains/parent/etc.
    cx::Host::setFunction(canvas, "contains", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::fromBool(false); });
    cx::Host::setProperty(canvas, "parentElement", cx::Host::getNull());
    cx::Host::setProperty(canvas, "parentNode", cx::Host::getNull());
    cx::Host::setProperty(canvas, "ownerDocument", cx::Host::getProperty(cx::Host::globalObject(), "document"));
    cx::Host::setProperty(canvas, "tagName", cx::Host::fromUtf8("CANVAS"));
    cx::Host::setProperty(canvas, "nodeName", cx::Host::fromUtf8("CANVAS"));
    cx::Host::setProperty(canvas, "nodeType", cx::Host::fromInt(1));
    return canvas;
}

JsValueRef makeDocument(cx::Host& host) {
    JsValueRef doc = cx::Host::makeObject();
    cx::Host::setFunction(doc, "getElementById", getElementByIdFn);
    cx::Host::setFunction(doc, "addEventListener", addEventListenerFn, (void*)"document");
    cx::Host::setFunction(doc, "removeEventListener", removeEventListenerFn, (void*)"document");
    cx::Host::setFunction(doc, "createElement", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        if (argc >= 2) {
            std::string tag = cx::Host::toUtf8(args[1]);
            if (tag == "canvas") return cx::Host::getProperty(cx::Host::globalObject(), "__canvas");
        }
        // Generic stub element so scenes that create button/img/div/etc. can
        // call setAttribute, addEventListener, appendChild without crashing.
        JsValueRef e = cx::Host::makeObject();
        cx::Host::setProperty(e, "style", cx::Host::makeObject());
        cx::Host::setProperty(e, "dataset", cx::Host::makeObject());
        cx::Host::setProperty(e, "textContent", cx::Host::fromUtf8(""));
        cx::Host::setProperty(e, "innerHTML", cx::Host::fromUtf8(""));
        cx::Host::setProperty(e, "innerText", cx::Host::fromUtf8(""));
        cx::Host::setProperty(e, "className", cx::Host::fromUtf8(""));
        cx::Host::setProperty(e, "id", cx::Host::fromUtf8(""));
        cx::Host::setProperty(e, "tagName", cx::Host::fromUtf8(argc >= 2 ? cx::Host::toUtf8(args[1]).c_str() : "DIV"));
        cx::Host::setProperty(e, "children", cx::Host::makeArray(0));
        cx::Host::setProperty(e, "childNodes", cx::Host::makeArray(0));
        cx::Host::setProperty(e, "parentNode", cx::Host::getNull());
        cx::Host::setProperty(e, "parentElement", cx::Host::getNull());
        cx::Host::setProperty(e, "nextSibling", cx::Host::getNull());
        cx::Host::setProperty(e, "previousSibling", cx::Host::getNull());
        cx::Host::setProperty(e, "ownerDocument", cx::Host::getProperty(cx::Host::globalObject(), "document"));
        cx::Host::setProperty(e, "nodeType", cx::Host::fromInt(1));
        cx::Host::setProperty(e, "nodeName", cx::Host::fromUtf8("DIV"));
        cx::Host::setProperty(e, "clientWidth", cx::Host::fromInt(0));
        cx::Host::setProperty(e, "clientHeight", cx::Host::fromInt(0));
        auto noop = +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); };
        cx::Host::setFunction(e, "setAttribute", noop);
        cx::Host::setFunction(e, "removeAttribute", noop);
        cx::Host::setFunction(e, "getAttribute", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getNull(); });
        cx::Host::setFunction(e, "hasAttribute", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::fromBool(false); });
        cx::Host::setFunction(e, "addEventListener", noop);
        cx::Host::setFunction(e, "removeEventListener", noop);
        cx::Host::setFunction(e, "dispatchEvent", noop);
        cx::Host::setFunction(e, "appendChild", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            return argc >= 2 ? args[1] : cx::Host::getUndefined();
        });
        cx::Host::setFunction(e, "removeChild", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            return argc >= 2 ? args[1] : cx::Host::getUndefined();
        });
        cx::Host::setFunction(e, "insertBefore", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            return argc >= 2 ? args[1] : cx::Host::getUndefined();
        });
        cx::Host::setFunction(e, "replaceChild", noop);
        cx::Host::setFunction(e, "contains", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::fromBool(false); });
        cx::Host::setFunction(e, "querySelector", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getNull(); });
        cx::Host::setFunction(e, "querySelectorAll", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::makeArray(0); });
        cx::Host::setFunction(e, "focus", noop);
        cx::Host::setFunction(e, "blur", noop);
        cx::Host::setFunction(e, "click", noop);
        cx::Host::setFunction(e, "getBoundingClientRect", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef {
            JsValueRef r = cx::Host::makeObject();
            for (auto* k : {"x","y","left","top","right","bottom","width","height"}) {
                cx::Host::setProperty(r, k, cx::Host::fromInt(0));
            }
            return r;
        });
        return e;
    });
    JsValueRef body = cx::Host::makeObject();
    auto noop = +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); };
    cx::Host::setFunction(body, "appendChild", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        return argc >= 2 ? args[1] : cx::Host::getUndefined();
    });
    cx::Host::setFunction(body, "removeChild", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        return argc >= 2 ? args[1] : cx::Host::getUndefined();
    });
    cx::Host::setFunction(body, "addEventListener", noop);
    cx::Host::setFunction(body, "removeEventListener", noop);
    cx::Host::setProperty(body, "style", cx::Host::makeObject());
    cx::Host::setProperty(doc, "body", body);
    cx::Host::setProperty(doc, "head", body);
    cx::Host::setProperty(doc, "documentElement", body);
    cx::Host::setFunction(doc, "createElementNS", +[](JsValueRef callee, bool ctor, JsValueRef* args, unsigned short argc, void* state) -> JsValueRef {
        // Delegate to createElement(args[2]).
        JsValueRef doc = cx::Host::getProperty(cx::Host::globalObject(), "document");
        JsValueRef ce = cx::Host::getProperty(doc, "createElement");
        JsValueRef passArgs[2] = { doc, argc >= 3 ? args[2] : cx::Host::fromUtf8("div") };
        JsValueRef r = nullptr; JsCallFunction(ce, passArgs, 2, &r);
        return r ? r : cx::Host::makeObject();
    });
    cx::Host::setFunction(doc, "querySelector", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getNull(); });
    cx::Host::setFunction(doc, "querySelectorAll", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::makeArray(0); });
    return doc;
}

JsValueRef makeWindow(cx::Host& host) {
    JsValueRef w = cx::Host::makeObject();
    cx::Host::setFunction(w, "addEventListener", addEventListenerFn, (void*)"window");
    cx::Host::setFunction(w, "removeEventListener", removeEventListenerFn, (void*)"window");
    cx::Host::setProperty(w, "innerWidth", cx::Host::fromInt(g_canvasW));
    cx::Host::setProperty(w, "innerHeight", cx::Host::fromInt(g_canvasH));
    cx::Host::setProperty(w, "devicePixelRatio", cx::Host::fromDouble(1.0));
    // window.location is shared with globalThis.location; set it later.
    return w;
}

JsValueRef makeNavigator(cx::Host& host) {
    JsValueRef n = cx::Host::makeObject();
    cx::Host::setProperty(n, "userAgent", cx::Host::fromUtf8("DawnTestHost/1.0"));
    cx::Host::setProperty(n, "platform", cx::Host::fromUtf8("Win32"));
    // navigator.gpu populated by wgpu_bridge.
    return n;
}

JsValueRef makePerformance() {
    JsValueRef p = cx::Host::makeObject();
    cx::Host::setFunction(p, "now", performanceNow);
    return p;
}

JsValueRef makeConsole() {
    JsValueRef c = cx::Host::makeObject();
    cx::Host::setFunction(c, "log",   consoleLog, (void*)"");
    cx::Host::setFunction(c, "info",  consoleLog, (void*)"info");
    cx::Host::setFunction(c, "warn",  consoleLog, (void*)"warn");
    cx::Host::setFunction(c, "error", consoleLog, (void*)"err");
    cx::Host::setFunction(c, "debug", consoleLog, (void*)"dbg");
    cx::Host::setFunction(c, "trace", consoleLog, (void*)"trace");
    cx::Host::setFunction(c, "group", consoleLog, (void*)"group");
    cx::Host::setFunction(c, "groupEnd", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); });
    cx::Host::setFunction(c, "time", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); });
    cx::Host::setFunction(c, "timeEnd", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); });
    return c;
}

} // namespace

void installGlobals(cx::Host& host, int initialWidth, int initialHeight) {
    g_host = &host;
    if (initialWidth > 0) g_canvasW = initialWidth;
    if (initialHeight > 0) g_canvasH = initialHeight;

    JsValueRef g = cx::Host::globalObject();

    // globalThis / self / window aliasing
    cx::Host::setProperty(g, "globalThis", g);
    cx::Host::setProperty(g, "self", g);
    cx::Host::setProperty(g, "global", g);

    JsValueRef canvas = makeCanvasObject(host);
    cx::Host::setProperty(g, "__canvas", canvas);

    JsValueRef doc = makeDocument(host);
    cx::Host::setProperty(g, "document", doc);

    JsValueRef win = makeWindow(host);
    cx::Host::setProperty(g, "window", win);

    JsValueRef nav = makeNavigator(host);
    cx::Host::setProperty(g, "navigator", nav);

    cx::Host::setProperty(g, "console", makeConsole());
    cx::Host::setProperty(g, "performance", makePerformance());
    cx::Host::setProperty(g, "devicePixelRatio", cx::Host::fromDouble(1.0));

    cx::Host::setFunction(g, "requestAnimationFrame", requestAnimationFrame);
    cx::Host::setFunction(g, "cancelAnimationFrame", cancelAnimationFrame);
    cx::Host::setFunction(g, "setTimeout", setTimeoutFn);
    cx::Host::setFunction(g, "clearTimeout", clearTimerFn);
    cx::Host::setFunction(g, "setInterval", setTimeoutFn, (void*)0x1);
    cx::Host::setFunction(g, "clearInterval", clearTimerFn);

    cx::Host::setFunction(g, "fetch", fetchFn);
    cx::Host::setFunction(g, "createImageBitmap", createImageBitmapFn);

    // Stubs for things scenes may probe (without crashing if absent).
    JsValueRef locationObj = cx::Host::makeObject();
    cx::Host::setProperty(locationObj, "href", cx::Host::fromUtf8("file:///app/"));
    cx::Host::setProperty(locationObj, "origin", cx::Host::fromUtf8("file://"));
    cx::Host::setProperty(locationObj, "protocol", cx::Host::fromUtf8("file:"));
    cx::Host::setProperty(locationObj, "host", cx::Host::fromUtf8(""));
    cx::Host::setProperty(locationObj, "hostname", cx::Host::fromUtf8(""));
    cx::Host::setProperty(locationObj, "port", cx::Host::fromUtf8(""));
    cx::Host::setProperty(locationObj, "pathname", cx::Host::fromUtf8("/"));
    cx::Host::setProperty(locationObj, "search", cx::Host::fromUtf8(""));
    cx::Host::setProperty(locationObj, "hash", cx::Host::fromUtf8(""));
    cx::Host::setProperty(g, "location", locationObj);
    // window.location must reference the same object so window.location.search works.
    cx::Host::setProperty(win, "location", locationObj);

    // Polyfills runtime-shim.js will fill in more (URL, etc.).
}

void runAnimationFrame(cx::Host& host, double timestampMs) {
    if (!g_host) return;

    // Run timers due now.
    double now = monotonicMs();
    std::vector<int> dueIds;
    for (auto& kv : g_timers) {
        if (!kv.second.cancelled && kv.second.dueMs <= now) dueIds.push_back(kv.first);
    }
    for (int id : dueIds) {
        auto it = g_timers.find(id);
        if (it == g_timers.end()) continue;
        Timer t = it->second;
        if (t.repeat) {
            it->second.dueMs = now + t.intervalMs;
        } else {
            JsRelease(it->second.fn, nullptr);
            g_timers.erase(it);
        }
        JsValueRef undef = cx::Host::getUndefined();
        JsValueRef args[1] = { undef };
        JsValueRef r = nullptr;
        JsCallFunction(t.fn, args, 1, &r);
        host.reportException("running timer");
    }

    // RAF callbacks
    auto callbacks = std::move(g_rafCallbacks);
    g_rafCallbacks.clear();
    g_rafById.clear();
    JsValueRef ts = cx::Host::fromDouble(timestampMs);
    for (JsValueRef cb : callbacks) {
        JsValueRef undef = cx::Host::getUndefined();
        JsValueRef args[2] = { undef, ts };
        JsValueRef r = nullptr;
        JsCallFunction(cb, args, 2, &r);
        host.reportException("running rAF callback");
        JsRelease(cb, nullptr);
    }

    host.pumpMicrotasks();
}

void pushPointerEvent(cx::Host& host, const PointerEvent& ev) {
    JsValueRef obj = cx::Host::makeObject();
    cx::Host::setProperty(obj, "clientX", cx::Host::fromDouble(ev.x));
    cx::Host::setProperty(obj, "clientY", cx::Host::fromDouble(ev.y));
    cx::Host::setProperty(obj, "offsetX", cx::Host::fromDouble(ev.x));
    cx::Host::setProperty(obj, "offsetY", cx::Host::fromDouble(ev.y));
    cx::Host::setProperty(obj, "pageX", cx::Host::fromDouble(ev.x));
    cx::Host::setProperty(obj, "pageY", cx::Host::fromDouble(ev.y));
    cx::Host::setProperty(obj, "movementX", cx::Host::fromDouble(0));
    cx::Host::setProperty(obj, "movementY", cx::Host::fromDouble(0));
    cx::Host::setProperty(obj, "button", cx::Host::fromInt(ev.button));
    cx::Host::setProperty(obj, "buttons", cx::Host::fromInt(ev.kind == PointerEvent::Down ? (1 << ev.button) : 0));
    cx::Host::setProperty(obj, "deltaY", cx::Host::fromDouble(ev.deltaY));
    cx::Host::setProperty(obj, "deltaMode", cx::Host::fromInt(0));
    cx::Host::setProperty(obj, "ctrlKey", cx::Host::fromBool(false));
    cx::Host::setProperty(obj, "shiftKey", cx::Host::fromBool(false));
    cx::Host::setProperty(obj, "altKey", cx::Host::fromBool(false));
    cx::Host::setProperty(obj, "metaKey", cx::Host::fromBool(false));
    cx::Host::setProperty(obj, "pointerId", cx::Host::fromInt(1));
    cx::Host::setProperty(obj, "pointerType", cx::Host::fromUtf8("mouse"));
    cx::Host::setProperty(obj, "type", cx::Host::fromUtf8(
        ev.kind == PointerEvent::Move ? "pointermove" :
        ev.kind == PointerEvent::Down ? "pointerdown" :
        ev.kind == PointerEvent::Up ? "pointerup" :
        ev.kind == PointerEvent::Wheel ? "wheel" :
        ev.kind == PointerEvent::Enter ? "pointerenter" : "pointerleave"));
    cx::Host::setProperty(obj, "target", cx::Host::getProperty(cx::Host::globalObject(), "__canvas"));
    cx::Host::setProperty(obj, "currentTarget", cx::Host::getProperty(cx::Host::globalObject(), "__canvas"));
    auto noop = +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); };
    cx::Host::setFunction(obj, "preventDefault", noop);
    cx::Host::setFunction(obj, "stopPropagation", noop);
    cx::Host::setFunction(obj, "stopImmediatePropagation", noop);

    const char* type = nullptr;
    const char* legacy = nullptr;
    switch (ev.kind) {
        case PointerEvent::Move:  type = "pointermove"; legacy = "mousemove"; break;
        case PointerEvent::Down:  type = "pointerdown"; legacy = "mousedown"; break;
        case PointerEvent::Up:    type = "pointerup";   legacy = "mouseup";   break;
        case PointerEvent::Wheel: type = "wheel";       legacy = "wheel";     break;
        case PointerEvent::Enter: type = "pointerenter"; legacy = "mouseenter"; break;
        case PointerEvent::Leave: type = "pointerleave"; legacy = "mouseleave"; break;
    }
    dispatchEventTo("canvas", type, obj);
    if (legacy && std::strcmp(legacy, type) != 0) dispatchEventTo("canvas", legacy, obj);
    dispatchEventTo("window", type, obj);
}

void pushResizeEvent(cx::Host& host, int w, int h) {
    g_canvasW = w; g_canvasH = h;
    JsValueRef canvas = cx::Host::getProperty(cx::Host::globalObject(), "__canvas");
    cx::Host::setProperty(canvas, "width", cx::Host::fromInt(w));
    cx::Host::setProperty(canvas, "height", cx::Host::fromInt(h));
    cx::Host::setProperty(canvas, "clientWidth", cx::Host::fromInt(w));
    cx::Host::setProperty(canvas, "clientHeight", cx::Host::fromInt(h));
    JsValueRef win = cx::Host::getProperty(cx::Host::globalObject(), "window");
    cx::Host::setProperty(win, "innerWidth", cx::Host::fromInt(w));
    cx::Host::setProperty(win, "innerHeight", cx::Host::fromInt(h));
    JsValueRef ev = cx::Host::makeObject();
    cx::Host::setProperty(ev, "type", cx::Host::fromUtf8("resize"));
    dispatchEventTo("window", "resize", ev);
}

void getCanvasPixelSize(int& w, int& h) {
    w = g_canvasW; h = g_canvasH;
}

void setBundleBaseDir(const std::string& dir) {
    g_bundleBaseDir = dir;
}

// ---- Image decoding (PNG/JPEG/BMP/GIF/TIFF via Windows Imaging Component) ----
} // namespace dom_shim

#include "image_decoder.h"

namespace dom_shim {
namespace {
JsValueRef CHAKRA_CALLBACK createImageBitmapFnImpl(JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) {
    if (argc < 2) return cx::Host::rejectedPromise(cx::Host::fromUtf8("createImageBitmap: missing input"));
    JsValueRef input = args[1];

    // The bundle generally passes a Blob/Response/ImageBitmapSource. We support
    // ArrayBuffer / Uint8Array / Response-with-cached-bytes / direct objects with
    // .arrayBuffer().
    auto decodeBytes = [](const uint8_t* data, int size) -> JsValueRef {
        std::vector<uint8_t> rgba;
        int w = 0, h = 0;
        if (!image_decoder::decodeRGBA(data, static_cast<size_t>(size), rgba, w, h)) {
            return cx::Host::rejectedPromise(cx::Host::fromUtf8("image decode failed"));
        }
        JsValueRef bitmap = cx::Host::makeObject();
        cx::Host::setProperty(bitmap, "width", cx::Host::fromInt(w));
        cx::Host::setProperty(bitmap, "height", cx::Host::fromInt(h));

        // Store the pixel data as a Uint8ClampedArray-like ArrayBuffer attached as __pixels.
        JsValueRef ab = nullptr;
        JsCreateArrayBuffer(static_cast<unsigned int>(w * h * 4), &ab);
        BYTE* buf=nullptr; unsigned int len=0;
        JsGetArrayBufferStorage(ab, &buf, &len);
        if (buf && !rgba.empty()) std::memcpy(buf, rgba.data(), rgba.size());
        cx::Host::setProperty(bitmap, "__pixels", ab);

        auto closeFn = +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef { return cx::Host::getUndefined(); };
        cx::Host::setFunction(bitmap, "close", closeFn);
        return cx::Host::resolvedPromise(bitmap);
    };

    JsValueType t; JsGetValueType(input, &t);
    if (t == JsArrayBuffer) {
        BYTE* buf=nullptr; unsigned int len=0;
        JsGetArrayBufferStorage(input, &buf, &len);
        return decodeBytes(buf, (int)len);
    }
    if (t == JsTypedArray) {
        BYTE* buf=nullptr; unsigned int len=0; JsTypedArrayType ta; int eltSize=0;
        JsGetTypedArrayStorage(input, &buf, &len, &ta, &eltSize);
        return decodeBytes(buf, (int)len);
    }
    // Object with __pixels (already a bitmap) — just resolve.
    if (cx::Host::hasProperty(input, "__pixels")) {
        return cx::Host::resolvedPromise(input);
    }
    // Blob: pull bytes from its _parts (set by our JS Blob constructor or the
    // host's blob() factory).
    if (cx::Host::hasProperty(input, "_parts")) {
        JsValueRef parts = cx::Host::getProperty(input, "_parts");
        unsigned n = 0;
        if (parts) { JsValueRef lenV = cx::Host::getProperty(parts, "length"); n = cx::Host::getUint(lenV); }
        // Concatenate parts into a single buffer.
        std::vector<uint8_t> all;
        for (unsigned i = 0; i < n; ++i) {
            JsValueRef idx = cx::Host::fromUint(i);
            JsValueRef p = nullptr; JsGetIndexedProperty(parts, idx, &p);
            JsValueType pt; JsGetValueType(p, &pt);
            BYTE* buf=nullptr; unsigned int len=0;
            if (pt == JsArrayBuffer) {
                JsGetArrayBufferStorage(p, &buf, &len);
            } else if (pt == JsTypedArray) {
                JsTypedArrayType ta; int eltSize=0;
                JsGetTypedArrayStorage(p, &buf, &len, &ta, &eltSize);
            } else if (pt == JsDataView) {
                JsGetDataViewStorage(p, &buf, &len);
            } else {
                continue;
            }
            size_t off = all.size();
            all.resize(off + len);
            if (buf) std::memcpy(all.data() + off, buf, len);
        }
        return decodeBytes(all.data(), (int)all.size());
    }
    return cx::Host::rejectedPromise(cx::Host::fromUtf8("createImageBitmap: unsupported input type"));
}
} // namespace

JsValueRef CHAKRA_CALLBACK createImageBitmapFn(JsValueRef callee, bool ctor, JsValueRef* args, unsigned short argc, void* state) {
    return createImageBitmapFnImpl(callee, ctor, args, argc, state);
}

} // namespace dom_shim
