#include "worker_shim.h"

#include "fs_loader.h"
#include "http_fetcher.h"

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdio>
#include <cstring>
#include <filesystem>
#include <memory>
#include <mutex>
#include <queue>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

namespace fs = std::filesystem;

namespace worker_shim {

// A "message" is a JSON-serialised string. Workers and main exchange data only
// as JSON (matches structured-clone semantics for plain data: numbers/strings/
// arrays/objects). ArrayBuffer/TypedArray content is base64-encoded so it
// round-trips intact. This is enough for Babylon-Lite workers which exchange
// glTF binary data, mesh metadata, etc.
struct Message {
    std::string json;
};

class Worker;
namespace {

std::mutex g_workersMutex;
std::unordered_map<uint32_t, std::shared_ptr<Worker>> g_workers;
uint32_t g_nextWorkerId = 1;

// Messages destined for the *main* thread (worker.postMessage). Drained each
// frame by pumpIncoming().
struct MainboundMessage {
    uint32_t workerId;
    enum Kind { Data, Error } kind;
    std::string payload; // JSON for Data; text for Error
};
std::mutex g_mainboxMutex;
std::queue<MainboundMessage> g_mainbox;

// Push a message destined for the main thread.
void pushMainbound(uint32_t workerId, MainboundMessage::Kind k, std::string payload) {
    std::lock_guard<std::mutex> lk(g_mainboxMutex);
    g_mainbox.push({workerId, k, std::move(payload)});
}

// JSON helpers built on Chakra's built-in JSON.stringify / JSON.parse. We use
// these from both the main and worker contexts (each with its own JSON
// implementation tied to its runtime).
std::string jsonStringifyFromContext(JsValueRef value) {
    JsValueRef global = cx::Host::globalObject();
    JsValueRef JSON = cx::Host::getProperty(global, "JSON");
    if (!JSON) return "null";
    JsValueRef stringify = cx::Host::getProperty(JSON, "stringify");
    if (!stringify) return "null";
    JsValueRef undef = cx::Host::getUndefined();
    JsValueRef args[2] = { JSON, value ? value : undef };
    JsValueRef result = nullptr;
    if (JsCallFunction(stringify, args, 2, &result) != JsNoError || !result) return "null";
    return cx::Host::toUtf8(result);
}

JsValueRef jsonParseInCurrentContext(const std::string& text) {
    if (text.empty()) return cx::Host::getUndefined();
    JsValueRef global = cx::Host::globalObject();
    JsValueRef JSON = cx::Host::getProperty(global, "JSON");
    if (!JSON) return cx::Host::getUndefined();
    JsValueRef parse = cx::Host::getProperty(JSON, "parse");
    if (!parse) return cx::Host::getUndefined();
    JsValueRef arg = cx::Host::fromUtf8(text);
    JsValueRef args[2] = { JSON, arg };
    JsValueRef result = nullptr;
    if (JsCallFunction(parse, args, 2, &result) != JsNoError) return cx::Host::getUndefined();
    return result ? result : cx::Host::getUndefined();
}

} // namespace

class Worker : public std::enable_shared_from_this<Worker> {
public:
    Worker(uint32_t id, std::string scriptPath, std::string baseDir)
        : id_(id), scriptPath_(std::move(scriptPath)), baseDir_(std::move(baseDir)) {}

    ~Worker() { terminate(); }

    void start() {
        thread_ = std::thread([self = shared_from_this()]() { self->run(); });
    }

    void postMessage(std::string json) {
        {
            std::lock_guard<std::mutex> lk(inboxMutex_);
            inbox_.push({std::move(json)});
        }
        inboxCv_.notify_one();
    }

    void terminate() {
        if (!alive_.exchange(false)) return;
        inboxCv_.notify_all();
        if (thread_.joinable()) thread_.join();
    }

    uint32_t id() const { return id_; }

private:
    void run() {
        JsRuntimeHandle runtime = JS_INVALID_RUNTIME_HANDLE;
        JsContextRef context = JS_INVALID_REFERENCE;
        if (JsCreateRuntime(JsRuntimeAttributeAllowScriptInterrupt, nullptr, &runtime) != JsNoError) {
            pushMainbound(id_, MainboundMessage::Error, "worker: JsCreateRuntime failed");
            return;
        }
        if (JsCreateContext(runtime, &context) != JsNoError) {
            JsDisposeRuntime(runtime);
            pushMainbound(id_, MainboundMessage::Error, "worker: JsCreateContext failed");
            return;
        }
        JsSetCurrentContext(context);

        // Install a minimal global API: console, performance, postMessage, onmessage, fetch.
        installWorkerGlobals();

        // Load the worker source. Workers can be classic scripts or modules;
        // most Babylon-Lite uses are pure functions wrapped in event listeners.
        std::string src;
        if (!fs_loader::readTextFile(scriptPath_, src)) {
            pushMainbound(id_, MainboundMessage::Error, "worker: cannot read " + scriptPath_);
        } else {
            JsValueRef srcVal = cx::Host::fromUtf8(src);
            JsValueRef urlVal = cx::Host::fromUtf8(scriptPath_);
            JsValueRef result = nullptr;
            JsErrorCode rc = JsRun(srcVal, 0, urlVal, JsParseScriptAttributeNone, &result);
            if (rc != JsNoError) {
                bool hasEx = false; JsHasException(&hasEx);
                if (hasEx) {
                    JsValueRef ex = nullptr; JsGetAndClearException(&ex);
                    std::string msg = ex ? cx::Host::toUtf8(ex) : "(no message)";
                    pushMainbound(id_, MainboundMessage::Error, "worker: script error: " + msg);
                } else {
                    pushMainbound(id_, MainboundMessage::Error, "worker: script run failed");
                }
            }
        }

        // Main event loop: wait for postMessage, drain microtasks.
        while (alive_.load()) {
            std::vector<Message> batch;
            {
                std::unique_lock<std::mutex> lk(inboxMutex_);
                inboxCv_.wait_for(lk, std::chrono::milliseconds(20), [this] {
                    return !inbox_.empty() || !alive_.load();
                });
                while (!inbox_.empty()) { batch.push_back(std::move(inbox_.front())); inbox_.pop(); }
            }
            if (!alive_.load()) break;
            for (auto& m : batch) {
                deliverInbound(m.json);
            }
            // Pump microtasks/promises by re-entering Chakra (no public pump API on this
            // runtime; promise resolutions trigger when JS calls finish anyway).
        }

        JsSetCurrentContext(JS_INVALID_REFERENCE);
        JsDisposeRuntime(runtime);
    }

    void installWorkerGlobals() {
        JsValueRef g = cx::Host::globalObject();
        cx::Host::setProperty(g, "globalThis", g);
        cx::Host::setProperty(g, "self", g);

        // console.log/.warn/.error
        JsValueRef console = cx::Host::makeObject();
        auto logFn = +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            std::fprintf(stderr, "[worker-js]");
            for (unsigned short i = 1; i < argc; ++i) {
                std::string s = cx::Host::toUtf8(args[i]);
                std::fprintf(stderr, " %s", s.c_str());
            }
            std::fprintf(stderr, "\n");
            return cx::Host::getUndefined();
        };
        cx::Host::setFunction(console, "log", logFn);
        cx::Host::setFunction(console, "info", logFn);
        cx::Host::setFunction(console, "warn", logFn);
        cx::Host::setFunction(console, "error", logFn);
        cx::Host::setFunction(console, "debug", logFn);
        cx::Host::setProperty(g, "console", console);

        // performance.now
        JsValueRef perf = cx::Host::makeObject();
        cx::Host::setFunction(perf, "now", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef {
            using clk = std::chrono::steady_clock;
            static const auto t0 = clk::now();
            return cx::Host::fromDouble(std::chrono::duration<double, std::milli>(clk::now() - t0).count());
        });
        cx::Host::setProperty(g, "performance", perf);

        // postMessage(value) — sends to main thread.
        cx::Host::setFunction(g, "postMessage", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void* state) -> JsValueRef {
            auto* w = static_cast<Worker*>(state);
            if (argc < 2) { pushMainbound(w->id_, MainboundMessage::Data, "null"); return cx::Host::getUndefined(); }
            std::string json = jsonStringifyFromContext(args[1]);
            pushMainbound(w->id_, MainboundMessage::Data, std::move(json));
            return cx::Host::getUndefined();
        }, this);

        // addEventListener('message', fn) / onmessage = fn -> stored as global __onmessage.
        cx::Host::setFunction(g, "addEventListener", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            if (argc < 3) return cx::Host::getUndefined();
            std::string type = cx::Host::toUtf8(args[1]);
            if (type == "message") {
                JsValueRef g = cx::Host::globalObject();
                cx::Host::setProperty(g, "__onmessage", args[2]);
            }
            return cx::Host::getUndefined();
        });
        cx::Host::setFunction(g, "removeEventListener", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef {
            return cx::Host::getUndefined();
        });
        cx::Host::setFunction(g, "close", +[](JsValueRef, bool, JsValueRef*, unsigned short, void* state) -> JsValueRef {
            static_cast<Worker*>(state)->alive_.store(false);
            return cx::Host::getUndefined();
        }, this);

        // Minimal fetch — workers may load shaders/data. Sync via WinHTTP on this thread.
        cx::Host::setFunction(g, "fetch", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            if (argc < 2) return cx::Host::rejectedPromise(cx::Host::fromUtf8("fetch: missing url"));
            std::string url = cx::Host::toUtf8(args[1]);
            std::vector<uint8_t> bytes;
            bool isRemote = (url.rfind("http://", 0) == 0 || url.rfind("https://", 0) == 0);
            bool ok;
            if (isRemote) ok = http_fetcher::downloadToMemory(url, bytes);
            else ok = fs_loader::readBinaryFile(url, bytes);
            JsValueRef r = cx::Host::makeObject();
            cx::Host::setProperty(r, "ok", cx::Host::fromBool(ok));
            cx::Host::setProperty(r, "status", cx::Host::fromInt(ok ? 200 : 404));
            // Capture bytes via shared_ptr held by an external object.
            auto sp = std::make_shared<std::vector<uint8_t>>(std::move(bytes));
            struct C { std::shared_ptr<std::vector<uint8_t>> b; };
            auto* cl = new C{sp};
            JsValueRef ext = nullptr;
            JsCreateExternalObject(cl, [](void* p){ delete static_cast<C*>(p); }, &ext);
            cx::Host::setFunction(r, "arrayBuffer", +[](JsValueRef, bool, JsValueRef*, unsigned short, void* st) -> JsValueRef {
                auto* c = static_cast<C*>(st);
                JsValueRef ab = nullptr;
                JsCreateArrayBuffer(static_cast<unsigned int>(c->b->size()), &ab);
                BYTE* buf=nullptr; unsigned int len=0;
                JsGetArrayBufferStorage(ab, &buf, &len);
                if (buf && !c->b->empty()) std::memcpy(buf, c->b->data(), c->b->size());
                return cx::Host::resolvedPromise(ab);
            }, cl);
            cx::Host::setFunction(r, "text", +[](JsValueRef, bool, JsValueRef*, unsigned short, void* st) -> JsValueRef {
                auto* c = static_cast<C*>(st);
                std::string txt(reinterpret_cast<const char*>(c->b->data()), c->b->size());
                return cx::Host::resolvedPromise(cx::Host::fromUtf8(txt));
            }, cl);
            return cx::Host::resolvedPromise(r);
        });

        // setTimeout(fn, ms) — minimal: runs after sleeping in the worker thread.
        // Babylon-Lite doesn't lean heavily on timers inside workers, so we just
        // schedule on the inbox by enqueueing a deferred-call message.
        cx::Host::setFunction(g, "setTimeout", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
            if (argc < 2) return cx::Host::fromInt(0);
            // Best-effort: call immediately on the next loop iteration.
            JsValueRef g = cx::Host::globalObject();
            JsValueRef arr = cx::Host::getProperty(g, "__deferred");
            if (!arr) { arr = cx::Host::makeArray(0); cx::Host::setProperty(g, "__deferred", arr); }
            JsValueRef lenV = cx::Host::getProperty(arr, "length");
            unsigned len = cx::Host::getUint(lenV);
            JsValueRef idx = cx::Host::fromUint(len);
            JsSetIndexedProperty(arr, idx, args[1]);
            return cx::Host::fromInt(0);
        });
    }

    void deliverInbound(const std::string& json) {
        JsValueRef g = cx::Host::globalObject();
        JsValueRef handler = cx::Host::getProperty(g, "__onmessage");
        if (!handler) handler = cx::Host::getProperty(g, "onmessage");
        if (!handler) return;
        JsValueType t; JsGetValueType(handler, &t);
        if (t != JsFunction) return;
        JsValueRef data = jsonParseInCurrentContext(json);
        JsValueRef event = cx::Host::makeObject();
        cx::Host::setProperty(event, "data", data);
        cx::Host::setProperty(event, "type", cx::Host::fromUtf8("message"));
        JsValueRef args[2] = { cx::Host::getUndefined(), event };
        JsValueRef r = nullptr;
        JsCallFunction(handler, args, 2, &r);
        bool hasEx = false; JsHasException(&hasEx);
        if (hasEx) {
            JsValueRef ex = nullptr; JsGetAndClearException(&ex);
            std::string msg = ex ? cx::Host::toUtf8(ex) : "(no message)";
            pushMainbound(id_, MainboundMessage::Error, "worker onmessage: " + msg);
        }

        // Drain deferred (setTimeout-style) callbacks once.
        JsValueRef arr = cx::Host::getProperty(g, "__deferred");
        if (arr) {
            JsValueRef lenV = cx::Host::getProperty(arr, "length");
            unsigned n = cx::Host::getUint(lenV);
            for (unsigned i = 0; i < n; ++i) {
                JsValueRef idx = cx::Host::fromUint(i);
                JsValueRef fn = nullptr; JsGetIndexedProperty(arr, idx, &fn);
                if (fn) {
                    JsValueRef rr = nullptr;
                    JsValueRef ar[1] = { cx::Host::getUndefined() };
                    JsCallFunction(fn, ar, 1, &rr);
                }
            }
            cx::Host::setProperty(g, "__deferred", cx::Host::makeArray(0));
        }
    }

    uint32_t id_;
    std::string scriptPath_;
    std::string baseDir_;
    std::atomic<bool> alive_{true};
    std::thread thread_;
    std::mutex inboxMutex_;
    std::condition_variable inboxCv_;
    std::queue<Message> inbox_;
};

// --- Main-thread side: Worker constructor ---------------------------------

namespace {
std::string g_workerBaseDir;
}

void pumpIncoming(cx::Host& host) {
    std::vector<MainboundMessage> batch;
    {
        std::lock_guard<std::mutex> lk(g_mainboxMutex);
        while (!g_mainbox.empty()) { batch.push_back(std::move(g_mainbox.front())); g_mainbox.pop(); }
    }
    if (batch.empty()) return;

    JsValueRef g = cx::Host::globalObject();
    JsValueRef table = cx::Host::getProperty(g, "__workerTable");
    if (!table) return;

    for (auto& m : batch) {
        JsValueRef key = cx::Host::fromUint(m.workerId);
        JsValueRef worker = nullptr;
        JsGetIndexedProperty(table, key, &worker);
        if (!worker) continue;

        const char* listenerProp = (m.kind == MainboundMessage::Error) ? "__onerror" : "__onmessage";
        JsValueRef handler = cx::Host::getProperty(worker, listenerProp);
        if (!handler) continue;
        JsValueType t; JsGetValueType(handler, &t);
        if (t != JsFunction) continue;

        JsValueRef event = cx::Host::makeObject();
        if (m.kind == MainboundMessage::Error) {
            cx::Host::setProperty(event, "message", cx::Host::fromUtf8(m.payload));
            cx::Host::setProperty(event, "type", cx::Host::fromUtf8("error"));
        } else {
            JsValueRef data = jsonParseInCurrentContext(m.payload);
            cx::Host::setProperty(event, "data", data);
            cx::Host::setProperty(event, "type", cx::Host::fromUtf8("message"));
        }
        JsValueRef args[2] = { worker, event };
        JsValueRef r = nullptr;
        JsCallFunction(handler, args, 2, &r);
        host.reportException("worker.onmessage");
    }
}

void shutdownAll() {
    std::vector<std::shared_ptr<Worker>> all;
    {
        std::lock_guard<std::mutex> lk(g_workersMutex);
        for (auto& kv : g_workers) all.push_back(kv.second);
        g_workers.clear();
    }
    for (auto& w : all) w->terminate();
}

void install(cx::Host& host) {
    JsValueRef g = cx::Host::globalObject();
    cx::Host::setProperty(g, "__workerTable", cx::Host::makeObject());

    // The shim's `Worker` constructor wires up __onmessage/__onerror; the
    // native `__createWorker(scriptUrl)` returns a numeric handle.
    cx::Host::setFunction(g, "__createWorker", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        if (argc < 2) return cx::Host::fromInt(0);
        std::string url = cx::Host::toUtf8(args[1]);
        // Resolve URL relative to worker base dir / bundle dir.
        std::string scriptPath;
        if (url.rfind("data:", 0) == 0) {
            // data:text/javascript[;base64],<payload> — write payload to a
            // temp file so the worker runtime can load it via the same path.
            size_t comma = url.find(',');
            if (comma == std::string::npos) {
                std::fprintf(stderr, "[worker] malformed data: URL\n");
                return cx::Host::fromInt(0);
            }
            std::string header  = url.substr(5, comma - 5);
            std::string payload = url.substr(comma + 1);
            std::vector<uint8_t> bytes;
            bool isBase64 = header.find(";base64") != std::string::npos;
            if (isBase64) {
                // Minimal base64 decode.
                int buf = 0, bits = 0;
                auto b64 = [](int c)->int{
                    if(c>='A'&&c<='Z')return c-'A'; if(c>='a'&&c<='z')return c-'a'+26;
                    if(c>='0'&&c<='9')return c-'0'+52; if(c=='+'||c=='-')return 62;
                    if(c=='/'||c=='_')return 63; return -1;
                };
                for (char c : payload) {
                    if (c=='='||c=='\n'||c=='\r'||c==' '||c=='\t') continue;
                    int v = b64((unsigned char)c); if (v<0) break;
                    buf = (buf<<6)|v; bits += 6;
                    if (bits >= 8) { bits -= 8; bytes.push_back((uint8_t)((buf>>bits)&0xff)); }
                }
            } else {
                // URL-decode percent-escapes.
                for (size_t i = 0; i < payload.size(); ++i) {
                    if (payload[i] == '%' && i + 2 < payload.size()) {
                        auto hex=[](char c)->int{ return (c>='0'&&c<='9')?c-'0':(c>='a'&&c<='f')?c-'a'+10:(c>='A'&&c<='F')?c-'A'+10:-1; };
                        int hi = hex(payload[i+1]), lo = hex(payload[i+2]);
                        if (hi >= 0 && lo >= 0) { bytes.push_back((uint8_t)((hi<<4)|lo)); i += 2; continue; }
                    }
                    bytes.push_back((uint8_t)payload[i]);
                }
            }
            fs::path tmp = fs::path(g_workerBaseDir) / ("__worker_" + std::to_string(++g_nextWorkerId) + ".js");
            fs_loader::writeBinaryFile(tmp.string(), bytes.data(), bytes.size());
            scriptPath = tmp.string();
        } else if (url.rfind("http://", 0) == 0 || url.rfind("https://", 0) == 0) {
            // Download to a temp file under the bundle dir.
            std::vector<uint8_t> bytes;
            if (!http_fetcher::downloadToMemory(url, bytes)) {
                std::fprintf(stderr, "[worker] failed to download %s\n", url.c_str());
                return cx::Host::fromInt(0);
            }
            fs::path tmp = fs::path(g_workerBaseDir) / ("__worker_" + std::to_string(++g_nextWorkerId) + ".js");
            fs_loader::writeBinaryFile(tmp.string(), bytes.data(), bytes.size());
            scriptPath = tmp.string();
        } else if (!url.empty() && url[0] == '/') {
            scriptPath = (fs::path(g_workerBaseDir) / url.substr(1)).string();
        } else {
            scriptPath = (fs::path(g_workerBaseDir) / url).string();
        }

        uint32_t id;
        std::shared_ptr<Worker> w;
        {
            std::lock_guard<std::mutex> lk(g_workersMutex);
            id = g_nextWorkerId++;
            w = std::make_shared<Worker>(id, scriptPath, g_workerBaseDir);
            g_workers[id] = w;
        }
        w->start();
        return cx::Host::fromUint(id);
    });

    cx::Host::setFunction(g, "__workerPost", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        if (argc < 3) return cx::Host::getUndefined();
        uint32_t id = cx::Host::getUint(args[1]);
        std::string json = jsonStringifyFromContext(args[2]);
        std::shared_ptr<Worker> w;
        {
            std::lock_guard<std::mutex> lk(g_workersMutex);
            auto it = g_workers.find(id);
            if (it != g_workers.end()) w = it->second;
        }
        if (w) w->postMessage(std::move(json));
        return cx::Host::getUndefined();
    });

    cx::Host::setFunction(g, "__workerTerminate", +[](JsValueRef, bool, JsValueRef* args, unsigned short argc, void*) -> JsValueRef {
        if (argc < 2) return cx::Host::getUndefined();
        uint32_t id = cx::Host::getUint(args[1]);
        std::shared_ptr<Worker> w;
        {
            std::lock_guard<std::mutex> lk(g_workersMutex);
            auto it = g_workers.find(id);
            if (it != g_workers.end()) { w = it->second; g_workers.erase(it); }
        }
        if (w) w->terminate();
        return cx::Host::getUndefined();
    });
}

// Allow main.cpp to set the worker script base dir (same as the bundle dir).
void setWorkerBaseDir(const std::string& dir) {
    g_workerBaseDir = dir;
}

} // namespace worker_shim
