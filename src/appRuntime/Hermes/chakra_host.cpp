#include "chakra_host.h"

#include <hermes/hermes.h>
#include <jsi/jsi.h>

#include <cstdio>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <regex>
#include <sstream>
#include <string>

namespace fs = std::filesystem;
using namespace facebook;
using namespace facebook::jsi;

namespace cx {

namespace {
    bool isWasmSpec(const std::string& spec) {
        static const char* kPkgs[] = {
            "@babylonjs/havok", "havok", "ammo", "draco", "basis",
            "@webgpu/compute", "recast-detour", "@recast-navigation",
            "manifold-3d", "manifold",
        };
        for (auto* p : kPkgs) if (spec.find(p) != std::string::npos) return true;
        return false;
    }
    bool isAbs(const std::string& s) {
        return !s.empty() && (s[0] == '/' || s[0] == '\\' || (s.size() >= 2 && s[1] == ':'));
    }
    bool isRel(const std::string& s) {
        return s.rfind("./", 0) == 0 || s.rfind("../", 0) == 0;
    }

    // Hermes has no native ES module support. We pre-process bundles to strip
    // top-level `import` / `export` so they evaluate as ordinary scripts.
    // For named exports `export { A, B as C }` we synthesize a globalThis
    // namespace assignment so importByPath can return the exports.
    std::string stripEsModuleSyntax(const std::string& src) {
        std::string s = src;
        try {
            // 1. + 2. are line-anchored. MSVC's <regex> doesn't reliably expose
            // std::regex::multiline, so process line by line and apply non-multiline
            // patterns that just anchor on whole-string ^/$.
            {
                std::regex importLine(R"(^\s*import\b[^;]*;\s*$)");
                std::regex exportDefault(R"(^(\s*)export\s+default\s+)");
                std::string rebuilt;
                rebuilt.reserve(s.size());
                size_t lineStart = 0;
                for (size_t i = 0; i <= s.size(); ++i) {
                    if (i == s.size() || s[i] == '\n') {
                        std::string line = s.substr(lineStart, i - lineStart);
                        if (std::regex_match(line, importLine)) {
                            // Drop the line (preserve the newline so source maps still align).
                            line.clear();
                        } else {
                            line = std::regex_replace(line, exportDefault,
                                                      "$1globalThis.__bundleDefault = ");
                        }
                        rebuilt += line;
                        if (i < s.size()) rebuilt += '\n';
                        lineStart = i + 1;
                    }
                }
                s.swap(rebuilt);
            }
            // 3. `export { A, B as C, D };` (single line or multi-line) -> namespace assignment.
            //    Capture the body between { and }, parse "X" or "X as Y" pairs.
            std::regex exportBlock(R"(export\s*\{([^}]*)\}\s*;?)");
            std::smatch m;
            std::string out;
            auto it = s.cbegin();
            while (std::regex_search(it, s.cend(), m, exportBlock)) {
                out.append(it, m.prefix().second);
                // Build the namespace object.
                std::string body = m[1].str();
                std::string nsExpr = "Object.assign(globalThis.__bundleDefault || (globalThis.__bundleDefault = {}), {";
                // Parse comma-separated entries.
                size_t pos = 0;
                bool first = true;
                while (pos < body.size()) {
                    size_t comma = body.find(',', pos);
                    std::string item = body.substr(pos, (comma == std::string::npos ? body.size() : comma) - pos);
                    // Trim whitespace and newlines.
                    auto trim = [](std::string& t){
                        while (!t.empty() && (t.front()==' '||t.front()=='\n'||t.front()=='\r'||t.front()=='\t')) t.erase(t.begin());
                        while (!t.empty() && (t.back() ==' '||t.back()=='\n'||t.back()=='\r'||t.back()=='\t')) t.pop_back();
                    };
                    trim(item);
                    if (!item.empty()) {
                        std::string local = item, exported = item;
                        size_t asPos = item.find(" as ");
                        if (asPos != std::string::npos) {
                            local = item.substr(0, asPos);
                            exported = item.substr(asPos + 4);
                            trim(local); trim(exported);
                        }
                        if (!first) nsExpr += ", ";
                        nsExpr += exported + ": " + local;
                        first = false;
                    }
                    if (comma == std::string::npos) break;
                    pos = comma + 1;
                }
                nsExpr += "});";
                out += nsExpr;
                it = m.suffix().first;
            }
            out.append(it, s.cend());
            s = out;
            // 4. Remaining `export const|let|var|function|class` -> drop the `export ` prefix.
            s = std::regex_replace(s, std::regex(R"(\bexport\s+(?=const|let|var|function|class)\b)"), "");
        } catch (...) {}
        return s;
    }
}

Host::Host() = default;
Host::~Host() { shutdown(); }

bool Host::initialize() {
    try {
        runtimeImpl_ = facebook::hermes::makeHermesRuntime();
        runtimePtr_  = runtimeImpl_.get();
        cc::setRuntime(runtimePtr_);
        return true;
    } catch (...) {
        std::fprintf(stderr, "[hermes] makeHermesRuntime() failed\n");
        return false;
    }
}

void Host::shutdown() {
    cc::setRuntime(nullptr);
    runtimePtr_ = nullptr;
    runtimeImpl_.reset();
}

bool Host::reportException(const char*) {
    // Pending-exception storage is in chakra_compat; nothing more to do here.
    return false;
}

bool Host::runScript(std::string_view source, const std::string& sourceUrl) {
    if (!runtimePtr_) return false;
    try {
        auto buf = std::make_shared<StringBuffer>(std::string(source));
        runtimePtr_->evaluateJavaScript(buf, sourceUrl);
        return true;
    } catch (const JSError& e) {
        std::fprintf(stderr, "[jserr] %s: %s\n", sourceUrl.c_str(), e.what());
        return false;
    } catch (const std::exception& e) {
        std::fprintf(stderr, "[jserr] %s: %s\n", sourceUrl.c_str(), e.what());
        return false;
    }
}

bool Host::runModule(const std::string& entryPath) {
    if (!runtimePtr_) return false;
    fs::path p(entryPath);
    rootBaseDir_ = p.parent_path().string();

    std::ifstream f(entryPath, std::ios::binary);
    if (!f) {
        std::fprintf(stderr, "[hermes] cannot open module: %s\n", entryPath.c_str());
        return false;
    }
    std::ostringstream ss; ss << f.rdbuf();
    std::string source = stripEsModuleSyntax(ss.str());
    return runScript(source, entryPath);
}

void Host::pumpMicrotasks() {
    if (!runtimePtr_) return;
    try {
        runtimePtr_->drainMicrotasks();
    } catch (...) {}
}

void Host::enqueueTask(std::function<void()> task) { taskQueue_.emplace_back(std::move(task)); }
void Host::runPendingTasks() {
    auto pending = std::move(taskQueue_);
    taskQueue_.clear();
    for (auto& t : pending) { try { t(); } catch (...) {} }
}

JsValueRef Host::importByPath(const std::string& specifier, const std::string& baseDir) {
    if (!runtimePtr_) return cc::wrap(Value::undefined());
    bool bare = !specifier.empty() && specifier[0] != '.' && specifier[0] != '/'
                && !(specifier.size() >= 2 && specifier[1] == ':');
    if (bare && isWasmSpec(specifier)) {
        std::fprintf(stderr,
            "[hermes] dynamic import '%s' looks like WASM-required; marking scene as WASM-unsupported\n",
            specifier.c_str());
        try {
            Object g = runtimePtr_->global();
            g.setProperty(*runtimePtr_, "__wasmTriggered",
                          Value(String::createFromUtf8(*runtimePtr_, "true")));
        } catch (...) {}
        return cc::wrap(Value::undefined());
    }
    fs::path resolved;
    if (isAbs(specifier))      resolved = specifier;
    else if (isRel(specifier)) resolved = fs::path(baseDir) / specifier;
    else                       resolved = fs::path(rootBaseDir_) / specifier;
    resolved = resolved.lexically_normal();

    std::ifstream f(resolved.string(), std::ios::binary);
    if (!f) {
        std::fprintf(stderr, "[hermes] importByPath: cannot open %s\n", resolved.string().c_str());
        return cc::wrap(Value::undefined());
    }
    std::ostringstream ss; ss << f.rdbuf();
    std::string source = stripEsModuleSyntax(ss.str());
    try {
        auto buf = std::make_shared<StringBuffer>(source);
        runtimePtr_->evaluateJavaScript(buf, resolved.string());
        pumpMicrotasks();
        // The "namespace" of the imported module is the __bundleDefault we
        // stash on globalThis when the script's `export default` runs.
        try {
            Value ns = runtimePtr_->global().getProperty(*runtimePtr_, "__bundleDefault");
            return cc::wrap(std::move(ns));
        } catch (...) {
            return cc::wrap(Value::undefined());
        }
    } catch (const JSError& e) {
        std::fprintf(stderr, "[jserr] import %s: %s\n",
                     resolved.string().c_str(), e.what());
        return cc::wrap(Value::undefined());
    } catch (...) {
        return cc::wrap(Value::undefined());
    }
}

// ---- Static helpers ----
std::string Host::toUtf8(JsValueRef value) {
    if (!value) return {};
    try {
        const Value& v = cc::rawConst(value);
        if (v.isString()) return v.getString(*cc::runtime()).utf8(*cc::runtime());
        if (v.isUndefined()) return "";
        if (v.isNull()) return "null";
        if (v.isNumber()) { char b[64]; std::snprintf(b, 64, "%g", v.getNumber()); return b; }
        if (v.isBool()) return v.getBool() ? "true" : "false";
        // For objects fall through to ToString.
        JsValueRef sr = nullptr;
        JsConvertValueToString(value, &sr);
        if (sr) {
            const Value& sv = cc::rawConst(sr);
            std::string r;
            if (sv.isString()) r = sv.getString(*cc::runtime()).utf8(*cc::runtime());
            JsRelease(sr, nullptr);
            return r;
        }
    } catch (...) {}
    return {};
}
JsValueRef Host::fromUtf8(std::string_view t) {
    return cc::wrap(Value(String::createFromUtf8(*cc::runtime(), (const uint8_t*)t.data(), t.size())));
}
JsValueRef Host::fromBool(bool b)     { return cc::wrap(Value(b)); }
JsValueRef Host::fromInt(int v)       { return cc::wrap(Value((double)v)); }
JsValueRef Host::fromUint(uint32_t v) { return cc::wrap(Value((double)v)); }
JsValueRef Host::fromDouble(double v) { return cc::wrap(Value(v)); }
JsValueRef Host::getUndefined()       { return cc::wrap(Value::undefined()); }
JsValueRef Host::getNull()            { return cc::wrap(Value::null()); }

JsValueRef Host::getProperty(JsValueRef obj, const char* name) {
    if (!obj) return getUndefined();
    try {
        const Value& v = cc::rawConst(obj);
        if (!v.isObject()) return getUndefined();
        return cc::wrap(v.getObject(*cc::runtime()).getProperty(*cc::runtime(), name));
    } catch (...) { return getUndefined(); }
}
bool Host::hasProperty(JsValueRef obj, const char* name) {
    if (!obj) return false;
    try {
        const Value& v = cc::rawConst(obj);
        if (!v.isObject()) return false;
        return v.getObject(*cc::runtime()).hasProperty(*cc::runtime(), name);
    } catch (...) { return false; }
}
void Host::setProperty(JsValueRef obj, const char* name, JsValueRef value) {
    if (!obj || !value) return;
    try {
        const Value& v = cc::rawConst(obj);
        if (!v.isObject()) return;
        v.getObject(*cc::runtime()).setProperty(*cc::runtime(), name, cc::rawConst(value));
    } catch (...) {}
}
void Host::setFunction(JsValueRef obj, const char* name, JsNativeFunction fn, void* state) {
    if (!obj) return;
    JsValueRef nameVal = fromUtf8(name);
    JsValueRef func = nullptr;
    JsCreateNamedFunction(nameVal, fn, state, &func);
    if (func) { setProperty(obj, name, func); JsRelease(func, nullptr); }
    JsRelease(nameVal, nullptr);
}

JsValueRef Host::globalObject() { return cc::wrap(Value(cc::runtime()->global())); }
JsValueRef Host::makeObject()   { return cc::wrap(Value(Object(*cc::runtime()))); }
JsValueRef Host::makeArray(unsigned int length) { return cc::wrap(Value(Array(*cc::runtime(), (size_t)length))); }

double   Host::getDouble(JsValueRef v, double fallback) {
    if (!v) return fallback;
    const Value& val = cc::rawConst(v);
    if (val.isNumber()) return val.getNumber();
    if (val.isBool())   return val.getBool() ? 1.0 : 0.0;
    return fallback;
}
int      Host::getInt(JsValueRef v, int fallback) { return (int)getDouble(v, fallback); }
uint32_t Host::getUint(JsValueRef v, uint32_t fallback) { return (uint32_t)getDouble(v, fallback); }
bool     Host::getBool(JsValueRef v, bool fallback) {
    if (!v) return fallback;
    const Value& val = cc::rawConst(v);
    if (val.isBool())   return val.getBool();
    if (val.isNumber()) return val.getNumber() != 0;
    if (val.isUndefined() || val.isNull()) return false;
    return true;
}
bool Host::isUndefined(JsValueRef v) { if (!v) return true; return cc::rawConst(v).isUndefined(); }
bool Host::isNull(JsValueRef v)      { if (!v) return false; return cc::rawConst(v).isNull(); }
bool Host::isObject(JsValueRef v)    { if (!v) return false; return cc::rawConst(v).isObject(); }
bool Host::isArray(JsValueRef v) {
    if (!v) return false;
    const Value& val = cc::rawConst(v);
    if (!val.isObject()) return false;
    try { return val.getObject(*cc::runtime()).isArray(*cc::runtime()); } catch (...) { return false; }
}
bool Host::isArrayBuffer(JsValueRef v) {
    if (!v) return false;
    const Value& val = cc::rawConst(v);
    if (!val.isObject()) return false;
    try { return val.getObject(*cc::runtime()).isArrayBuffer(*cc::runtime()); } catch (...) { return false; }
}
bool Host::isTypedArrayOrView(JsValueRef v) {
    if (!v) return false;
    const Value& val = cc::rawConst(v);
    if (!val.isObject()) return false;
    try {
        Object o = val.getObject(*cc::runtime());
        if (o.isTypedArray(*cc::runtime())) return true;
        // Check for DataView via the buffer property.
        Value bv = o.getProperty(*cc::runtime(), "buffer");
        return bv.isObject() && bv.getObject(*cc::runtime()).isArrayBuffer(*cc::runtime());
    } catch (...) { return false; }
}

JsValueRef Host::createPromise(JsValueRef& resolveFn, JsValueRef& rejectFn) {
    JsValueRef p = nullptr;
    JsCreatePromise(&p, &resolveFn, &rejectFn);
    return p;
}
JsValueRef Host::resolvedPromise(JsValueRef value) {
    JsValueRef p = nullptr, resolve = nullptr, reject = nullptr;
    JsCreatePromise(&p, &resolve, &reject);
    JsValueRef args[2] = { getUndefined(), value ? value : getUndefined() };
    JsValueRef r = nullptr;
    JsCallFunction(resolve, args, 2, &r);
    if (r)        JsRelease(r, nullptr);
    if (args[0])  JsRelease(args[0], nullptr);
    if (resolve)  JsRelease(resolve, nullptr);
    if (reject)   JsRelease(reject, nullptr);
    return p;
}
JsValueRef Host::rejectedPromise(JsValueRef reason) {
    JsValueRef p = nullptr, resolve = nullptr, reject = nullptr;
    JsCreatePromise(&p, &resolve, &reject);
    JsValueRef args[2] = { getUndefined(), reason ? reason : getUndefined() };
    JsValueRef r = nullptr;
    JsCallFunction(reject, args, 2, &r);
    if (r)        JsRelease(r, nullptr);
    if (args[0])  JsRelease(args[0], nullptr);
    if (resolve)  JsRelease(resolve, nullptr);
    if (reject)   JsRelease(reject, nullptr);
    return p;
}

} // namespace cx
