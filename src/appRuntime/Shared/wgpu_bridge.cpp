#include "wgpu_bridge.h"

#include "chakra_host.h"
#include "wgpu_enums.h"

#include <webgpu/webgpu_cpp.h>

#include <algorithm>
#include <cstdio>
#include <cstring>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

namespace wgpu_bridge {

using cx::Host;

// =============================================================================
// State / Registry
// =============================================================================
namespace {

template <typename T>
struct Reg {
    std::unordered_map<uint32_t, T> map;
    uint32_t next = 1;
    uint32_t add(T v) { uint32_t id = next++; map.emplace(id, std::move(v)); return id; }
    T* get(uint32_t id) { auto it = map.find(id); return it == map.end() ? nullptr : &it->second; }
    void release(uint32_t id) { map.erase(id); }
};

struct State {
    wgpu::Instance instance;
    wgpu::Surface surface;
    void* nativeWindow = nullptr;
    int width = 0, height = 0;

    Reg<wgpu::Adapter> adapters;
    Reg<wgpu::Device> devices;
    Reg<wgpu::Queue> queues;
    Reg<wgpu::Buffer> buffers;
    Reg<wgpu::Texture> textures;
    Reg<wgpu::TextureView> textureViews;
    Reg<wgpu::Sampler> samplers;
    Reg<wgpu::ShaderModule> shaderModules;
    Reg<wgpu::BindGroupLayout> bindGroupLayouts;
    Reg<wgpu::BindGroup> bindGroups;
    Reg<wgpu::PipelineLayout> pipelineLayouts;
    Reg<wgpu::RenderPipeline> renderPipelines;
    Reg<wgpu::ComputePipeline> computePipelines;
    Reg<wgpu::CommandEncoder> commandEncoders;
    Reg<wgpu::RenderPassEncoder> renderPassEncoders;
    Reg<wgpu::ComputePassEncoder> computePassEncoders;
    Reg<wgpu::CommandBuffer> commandBuffers;
    Reg<wgpu::RenderBundleEncoder> renderBundleEncoders;
    Reg<wgpu::RenderBundle> renderBundles;
    Reg<wgpu::QuerySet> querySets;

    wgpu::TextureFormat surfaceFormat = wgpu::TextureFormat::BGRA8Unorm;
    bool surfaceConfigured = false;
    bool currentTextureAcquired = false;
    uint32_t lastBackbufferHandle = 0;  // handle of the most recent surface texture

    // Screenshot capture state.
    bool captureRequested = false;
    std::string capturePath;

    // Buffer mapping bookkeeping (so getMappedRange can return a stable view).
    struct BufferMap {
        void* ptr;
        size_t size;
        size_t offset;
    };
    std::unordered_map<uint32_t, BufferMap> bufferMaps;
};

State g_state;

// =============================================================================
// JS helpers
// =============================================================================

uint32_t toHandle(JsValueRef v) {
    if (!v) return 0;
    // The JS side stores handles as numbers. The convention is that GPU objects
    // expose `.__h` containing the integer handle.
    JsValueType t; JsGetValueType(v, &t);
    if (t == JsNumber) return Host::getUint(v);
    if (t == JsObject) {
        JsValueRef h = Host::getProperty(v, "__h");
        if (h) return Host::getUint(h);
    }
    return 0;
}

// Wrap a freshly-created handle into a JS class instance using `__createGPUObject`
// helper installed by the JS shim. The shim creates the right prototype.
JsValueRef wrap(const char* className, uint32_t handle) {
    JsValueRef g = Host::globalObject();
    JsValueRef factory = Host::getProperty(g, "__createGPUObject");
    if (!factory) return Host::fromUint(handle);
    JsValueRef args[3] = {
        g,
        Host::fromUtf8(className),
        Host::fromUint(handle),
    };
    JsValueRef out = nullptr;
    JsCallFunction(factory, args, 3, &out);
    return out ? out : Host::getUndefined();
}

// Read a uint32 property with a default.
uint32_t propUint(JsValueRef obj, const char* name, uint32_t def = 0) {
    if (!obj) return def;
    if (!Host::hasProperty(obj, name)) return def;
    return Host::getUint(Host::getProperty(obj, name), def);
}
double propDouble(JsValueRef obj, const char* name, double def = 0.0) {
    if (!obj) return def;
    if (!Host::hasProperty(obj, name)) return def;
    return Host::getDouble(Host::getProperty(obj, name), def);
}
bool propBool(JsValueRef obj, const char* name, bool def = false) {
    if (!obj) return def;
    if (!Host::hasProperty(obj, name)) return def;
    return Host::getBool(Host::getProperty(obj, name), def);
}
std::string propStr(JsValueRef obj, const char* name) {
    if (!obj) return {};
    if (!Host::hasProperty(obj, name)) return {};
    return Host::toUtf8(Host::getProperty(obj, name));
}
JsValueRef propAny(JsValueRef obj, const char* name) {
    if (!obj) return nullptr;
    if (!Host::hasProperty(obj, name)) return nullptr;
    return Host::getProperty(obj, name);
}
unsigned arrayLen(JsValueRef arr) {
    if (!arr) return 0;
    JsValueRef len = Host::getProperty(arr, "length");
    return Host::getUint(len);
}
JsValueRef arrayAt(JsValueRef arr, unsigned i) {
    if (!arr) return nullptr;
    JsValueRef idx = Host::fromUint(i);
    JsValueRef out = nullptr;
    JsGetIndexedProperty(arr, idx, &out);
    return out;
}

// Parse a GPUExtent3D which can be either an array [w,h?,d?] or an object {width,height,depthOrArrayLayers}.
wgpu::Extent3D parseExtent3D(JsValueRef v) {
    wgpu::Extent3D out{};
    if (!v) return out;
    if (Host::isArray(v)) {
        out.width = Host::getUint(arrayAt(v, 0), 1);
        out.height = Host::getUint(arrayAt(v, 1), 1);
        out.depthOrArrayLayers = Host::getUint(arrayAt(v, 2), 1);
    } else {
        out.width = propUint(v, "width", 1);
        out.height = propUint(v, "height", 1);
        out.depthOrArrayLayers = propUint(v, "depthOrArrayLayers", 1);
    }
    if (out.height == 0) out.height = 1;
    if (out.depthOrArrayLayers == 0) out.depthOrArrayLayers = 1;
    return out;
}

wgpu::Origin3D parseOrigin3D(JsValueRef v) {
    wgpu::Origin3D out{};
    if (!v) return out;
    if (Host::isArray(v)) {
        out.x = Host::getUint(arrayAt(v, 0), 0);
        out.y = Host::getUint(arrayAt(v, 1), 0);
        out.z = Host::getUint(arrayAt(v, 2), 0);
    } else {
        out.x = propUint(v, "x", 0);
        out.y = propUint(v, "y", 0);
        out.z = propUint(v, "z", 0);
    }
    return out;
}

wgpu::Color parseColor(JsValueRef v) {
    wgpu::Color out{};
    if (!v) return out;
    if (Host::isArray(v)) {
        out.r = Host::getDouble(arrayAt(v, 0), 0);
        out.g = Host::getDouble(arrayAt(v, 1), 0);
        out.b = Host::getDouble(arrayAt(v, 2), 0);
        out.a = Host::getDouble(arrayAt(v, 3), 0);
    } else {
        out.r = propDouble(v, "r", 0);
        out.g = propDouble(v, "g", 0);
        out.b = propDouble(v, "b", 0);
        out.a = propDouble(v, "a", 0);
    }
    return out;
}

// Get bytes from an ArrayBuffer / TypedArray / DataView.
bool getBytes(JsValueRef v, const uint8_t*& outData, size_t& outSize, size_t& outByteOffset) {
    if (!v) return false;
    JsValueType t; JsGetValueType(v, &t);
    BYTE* buf = nullptr;
    unsigned int len = 0;
    if (t == JsArrayBuffer) {
        if (JsGetArrayBufferStorage(v, &buf, &len) == JsNoError) {
            outData = buf; outSize = len; outByteOffset = 0; return true;
        }
    } else if (t == JsTypedArray) {
        JsTypedArrayType ta; int eltSize = 0;
        if (JsGetTypedArrayStorage(v, &buf, &len, &ta, &eltSize) == JsNoError) {
            outData = buf; outSize = len; outByteOffset = 0; return true;
        }
    } else if (t == JsDataView) {
        if (JsGetDataViewStorage(v, &buf, &len) == JsNoError) {
            outData = buf; outSize = len; outByteOffset = 0; return true;
        }
    }
    return false;
}

// =============================================================================
// Dispatch
// =============================================================================
using OpFn = JsValueRef (*)(JsValueRef self, JsValueRef* args, unsigned short argc);

std::unordered_map<std::string, OpFn>& opTable() {
    static std::unordered_map<std::string, OpFn> t;
    return t;
}

#define WGPU_OP(symname, opname) \
    static JsValueRef OP_##symname(JsValueRef self, JsValueRef* args, unsigned short argc); \
    namespace { struct Reg_##symname { Reg_##symname() { opTable().emplace(opname, &OP_##symname); } }; \
                static Reg_##symname reg_##symname; } \
    static JsValueRef OP_##symname(JsValueRef self, JsValueRef* args, unsigned short argc)

// =============================================================================
// GPU (navigator.gpu)
// =============================================================================
WGPU_OP(gpu_requestAdapter, "gpu.requestAdapter") {
    wgpu::RequestAdapterOptions opts{};
    if (argc > 0 && Host::isObject(args[0])) {
        std::string pp = propStr(args[0], "powerPreference");
        if (!pp.empty()) opts.powerPreference = wgpu_enums::powerPreference(pp);
        opts.forceFallbackAdapter = propBool(args[0], "forceFallbackAdapter", false);
    }
    // NOTE: not setting opts.compatibleSurface — Dawn picks the default
    // backend correctly without it, and on some Windows setups requiring a
    // specific surface forces choosing D3D11 which then needs FXC (d3dcompiler_47.dll).
#if defined(DAWNTEST_BACKEND_OPENGLES)
    opts.backendType = wgpu::BackendType::OpenGLES;
    // Dawn's GL backend only exposes a Compatibility adapter (Core is
    // Vulkan/D3D12/Metal only). Without this, DiscoverPhysicalDevices
    // returns an empty list and adapter creation fails with
    // "No supported adapters".
    opts.featureLevel = wgpu::FeatureLevel::Compatibility;
#elif defined(DAWNTEST_BACKEND_OPENGL)
    opts.backendType = wgpu::BackendType::OpenGL;
    // Same Compat-only constraint as GLES — Dawn's desktop GL backend is also
    // a Compatibility adapter.
    opts.featureLevel = wgpu::FeatureLevel::Compatibility;
#elif defined(DAWNTEST_BACKEND_VULKAN)
    opts.backendType = wgpu::BackendType::Vulkan;
#elif defined(DAWNTEST_BACKEND_D3D11)
    opts.backendType = wgpu::BackendType::D3D11;
#elif defined(DAWNTEST_BACKEND_METAL)
    opts.backendType = wgpu::BackendType::Metal;
#elif defined(DAWNTEST_BACKEND_D3D12) || defined(_WIN32)
    opts.backendType = wgpu::BackendType::D3D12;
#else
    // Other platforms: let Dawn pick.
#endif

    wgpu::Adapter adapter;
    wgpu::Future f = g_state.instance.RequestAdapter(&opts, wgpu::CallbackMode::WaitAnyOnly,
        [&adapter](wgpu::RequestAdapterStatus s, wgpu::Adapter a, wgpu::StringView m) {
            if (s == wgpu::RequestAdapterStatus::Success) adapter = std::move(a);
            else std::fprintf(stderr, "[wgpu] requestAdapter failed: %.*s\n", (int)m.length, m.data);
        });
    g_state.instance.WaitAny(f, UINT64_MAX);

    if (!adapter) return Host::resolvedPromise(Host::getNull());
    uint32_t h = g_state.adapters.add(std::move(adapter));
    return Host::resolvedPromise(wrap("GPUAdapter", h));
}

WGPU_OP(gpu_getPreferredCanvasFormat, "gpu.getPreferredCanvasFormat") {
    return Host::fromUtf8(wgpu_enums::textureFormatStr(g_state.surfaceFormat));
}

// =============================================================================
// GPUAdapter
// =============================================================================
WGPU_OP(adapter_requestDevice, "adapter.requestDevice") {
    uint32_t adapterH = toHandle(self);
    wgpu::Adapter* adapter = g_state.adapters.get(adapterH);
    if (!adapter) return Host::rejectedPromise(Host::fromUtf8("invalid adapter"));

    wgpu::DeviceDescriptor desc{};
    desc.SetUncapturedErrorCallback([](const wgpu::Device&, wgpu::ErrorType errorType, wgpu::StringView m) {
        std::fprintf(stderr, "[wgpu device error %d] %.*s\n", (int)errorType, (int)m.length, m.data);
    });

    // Enable DXC (avoids needing FXC / d3dcompiler_47.dll which fails to load
    // on some Windows setups with Win32 error 87).
    static const char* kEnableDXC = "use_dxc";
    static wgpu::DawnTogglesDescriptor s_toggles{};
    s_toggles.enabledToggleCount = 1;
    s_toggles.enabledToggles = &kEnableDXC;
    desc.nextInChain = &s_toggles;

    std::vector<wgpu::FeatureName> requested;
    if (argc > 0 && Host::isObject(args[0])) {
        JsValueRef feats = propAny(args[0], "requiredFeatures");
        if (feats && Host::isArray(feats)) {
            unsigned n = arrayLen(feats);
            for (unsigned i = 0; i < n; ++i) {
                std::string s = Host::toUtf8(arrayAt(feats, i));
                wgpu::FeatureName f = wgpu_enums::featureName(s);
                if (f != wgpu::FeatureName(0)) requested.push_back(f);
            }
            desc.requiredFeatureCount = requested.size();
            desc.requiredFeatures = requested.data();
        }
        // requiredLimits: pass through if provided (skip for now)
    }

    wgpu::Device device;
    wgpu::Future f = adapter->RequestDevice(&desc, wgpu::CallbackMode::WaitAnyOnly,
        [&device](wgpu::RequestDeviceStatus s, wgpu::Device d, wgpu::StringView m) {
            if (s == wgpu::RequestDeviceStatus::Success) device = std::move(d);
            else std::fprintf(stderr, "[wgpu] requestDevice failed: %.*s\n", (int)m.length, m.data);
        });
    g_state.instance.WaitAny(f, UINT64_MAX);
    if (!device) return Host::resolvedPromise(Host::getNull());

    uint32_t h = g_state.devices.add(std::move(device));
    JsValueRef obj = wrap("GPUDevice", h);
    // Attach queue
    wgpu::Queue q = g_state.devices.get(h)->GetQueue();
    uint32_t qh = g_state.queues.add(std::move(q));
    Host::setProperty(obj, "queue", wrap("GPUQueue", qh));
    return Host::resolvedPromise(obj);
}

WGPU_OP(adapter_features, "adapter.features") {
    // Return a Set-like object; bundle iterates with .has()/.forEach().
    JsValueRef s = Host::makeObject();
    Host::setFunction(s, "has", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef {
        return Host::fromBool(false);
    });
    Host::setProperty(s, "size", Host::fromInt(0));
    return s;
}

WGPU_OP(adapter_limits, "adapter.limits") {
    return Host::makeObject();
}

WGPU_OP(adapter_info, "adapter.info") {
    JsValueRef o = Host::makeObject();
    Host::setProperty(o, "vendor", Host::fromUtf8("dawn"));
    Host::setProperty(o, "architecture", Host::fromUtf8(""));
    Host::setProperty(o, "device", Host::fromUtf8(""));
    Host::setProperty(o, "description", Host::fromUtf8("Dawn native"));
    return o;
}

// =============================================================================
// GPUDevice
// =============================================================================
WGPU_OP(device_createBuffer, "device.createBuffer") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    wgpu::BufferDescriptor bd{};
    bd.size = (uint64_t)propDouble(desc, "size", 0);
    bd.usage = wgpu::BufferUsage(propUint(desc, "usage", 0));
    bd.mappedAtCreation = propBool(desc, "mappedAtCreation", false);
    std::string label = propStr(desc, "label");
    if (!label.empty()) bd.label = label.c_str();
    wgpu::Buffer buf = d->CreateBuffer(&bd);
    if (!buf) { std::fprintf(stderr, "[wgpu] createBuffer failed (size=%llu usage=%x)\n", (unsigned long long)bd.size, (unsigned)bd.usage); return Host::getUndefined(); }
    uint32_t bh = g_state.buffers.add(std::move(buf));
    JsValueRef obj = wrap("GPUBuffer", bh);
    Host::setProperty(obj, "size", Host::fromDouble((double)bd.size));
    Host::setProperty(obj, "usage", Host::fromUint((uint32_t)bd.usage));
    Host::setProperty(obj, "mapState", Host::fromUtf8(bd.mappedAtCreation ? "mapped" : "unmapped"));
    if (bd.mappedAtCreation) {
        wgpu::Buffer* b = g_state.buffers.get(bh);
        void* p = b->GetMappedRange();
        g_state.bufferMaps[bh] = { p, (size_t)bd.size, 0 };
    }
    return obj;
}

WGPU_OP(device_createTexture, "device.createTexture") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    wgpu::TextureDescriptor td{};
    auto size = parseExtent3D(propAny(desc, "size"));
    td.size = size;
    td.mipLevelCount = propUint(desc, "mipLevelCount", 1);
    td.sampleCount = propUint(desc, "sampleCount", 1);
    td.format = wgpu_enums::textureFormat(propStr(desc, "format"));
    td.usage = wgpu::TextureUsage(propUint(desc, "usage", 0));
    td.dimension = wgpu_enums::textureDimension(propStr(desc, "dimension"));
    std::vector<wgpu::TextureFormat> viewFormats;
    JsValueRef vf = propAny(desc, "viewFormats");
    if (vf && Host::isArray(vf)) {
        unsigned n = arrayLen(vf);
        for (unsigned i = 0; i < n; ++i) viewFormats.push_back(wgpu_enums::textureFormat(Host::toUtf8(arrayAt(vf, i))));
        td.viewFormatCount = viewFormats.size();
        td.viewFormats = viewFormats.data();
    }
    std::string label = propStr(desc, "label");
    if (!label.empty()) td.label = label.c_str();

#if defined(DAWNTEST_BACKEND_OPENGLES) || defined(DAWNTEST_BACKEND_OPENGL)
    // ---- Compatibility mode: textureBindingViewDimension ----
    // Dawn's OpenGL ES backend runs in compat mode where the texture binding
    // view dimension must be declared up-front (it maps to a fixed GLES
    // texture target). Babylon-Lite passes the descriptor as a browser-Core
    // GPUTexture descriptor (no `textureBindingViewDimension` field), so we
    // infer a sensible default:
    //   - 6 layers, 2D → Cube
    //   - >=2 layers, 2D → 2DArray
    //   - 3D / 2D / multisample → match dimension
    wgpu::TextureBindingViewDimensionDescriptor viewDim{};
    if (td.dimension == wgpu::TextureDimension::e2D) {
        if (td.size.depthOrArrayLayers == 6) {
            viewDim.textureBindingViewDimension = wgpu::TextureViewDimension::Cube;
        } else if (td.size.depthOrArrayLayers > 1) {
            viewDim.textureBindingViewDimension = wgpu::TextureViewDimension::e2DArray;
        } else {
            viewDim.textureBindingViewDimension = wgpu::TextureViewDimension::e2D;
        }
    } else if (td.dimension == wgpu::TextureDimension::e3D) {
        viewDim.textureBindingViewDimension = wgpu::TextureViewDimension::e3D;
    } else {
        viewDim.textureBindingViewDimension = wgpu::TextureViewDimension::e1D;
    }
    // Honour an explicit override if the JS bundle ever provides it.
    std::string overrideDim = propStr(desc, "textureBindingViewDimension");
    if (!overrideDim.empty()) {
        viewDim.textureBindingViewDimension = wgpu_enums::textureViewDimension(overrideDim);
    }
    td.nextInChain = &viewDim;
#endif

    wgpu::Texture tex = d->CreateTexture(&td);
    if (!tex) { std::fprintf(stderr, "[wgpu] createTexture failed\n"); return Host::getUndefined(); }
    uint32_t th = g_state.textures.add(std::move(tex));
    JsValueRef obj = wrap("GPUTexture", th);
    Host::setProperty(obj, "width", Host::fromUint(td.size.width));
    Host::setProperty(obj, "height", Host::fromUint(td.size.height));
    Host::setProperty(obj, "depthOrArrayLayers", Host::fromUint(td.size.depthOrArrayLayers));
    Host::setProperty(obj, "mipLevelCount", Host::fromUint(td.mipLevelCount));
    Host::setProperty(obj, "sampleCount", Host::fromUint(td.sampleCount));
    Host::setProperty(obj, "format", Host::fromUtf8(propStr(desc, "format")));
    Host::setProperty(obj, "usage", Host::fromUint((uint32_t)td.usage));
    Host::setProperty(obj, "dimension", Host::fromUtf8(propStr(desc, "dimension").empty() ? "2d" : propStr(desc, "dimension")));
    return obj;
}

WGPU_OP(device_createSampler, "device.createSampler") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    wgpu::SamplerDescriptor sd{};
    JsValueRef desc = (argc > 0) ? args[0] : nullptr;
    if (desc) {
        sd.addressModeU = wgpu_enums::addressMode(propStr(desc, "addressModeU"));
        sd.addressModeV = wgpu_enums::addressMode(propStr(desc, "addressModeV"));
        sd.addressModeW = wgpu_enums::addressMode(propStr(desc, "addressModeW"));
        sd.magFilter = wgpu_enums::filterMode(propStr(desc, "magFilter"));
        sd.minFilter = wgpu_enums::filterMode(propStr(desc, "minFilter"));
        sd.mipmapFilter = wgpu_enums::mipmapFilterMode(propStr(desc, "mipmapFilter"));
        sd.lodMinClamp = (float)propDouble(desc, "lodMinClamp", 0.0);
        sd.lodMaxClamp = (float)propDouble(desc, "lodMaxClamp", 32.0);
        std::string cmp = propStr(desc, "compare");
        if (!cmp.empty()) sd.compare = wgpu_enums::compareFunction(cmp);
        sd.maxAnisotropy = (uint16_t)propUint(desc, "maxAnisotropy", 1);
    }
    wgpu::Sampler s = d->CreateSampler(&sd);
    if (!s) return Host::getUndefined();
    uint32_t sh = g_state.samplers.add(std::move(s));
    return wrap("GPUSampler", sh);
}

WGPU_OP(device_createShaderModule, "device.createShaderModule") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    std::string code = propStr(desc, "code");
    wgpu::ShaderSourceWGSL wgsl{};
    wgsl.code = code.c_str();
    wgpu::ShaderModuleDescriptor smd{};
    smd.nextInChain = &wgsl;
    std::string label = propStr(desc, "label");
    if (!label.empty()) smd.label = label.c_str();
    wgpu::ShaderModule m = d->CreateShaderModule(&smd);
    if (!m) return Host::getUndefined();
    uint32_t mh = g_state.shaderModules.add(std::move(m));
    return wrap("GPUShaderModule", mh);
}

// ----- bind group layout / bind group / pipeline layout -----
namespace {
void parseBufferBindingLayout(JsValueRef o, wgpu::BufferBindingLayout& out) {
    out.type = wgpu_enums::bufferBindingType(propStr(o, "type").empty() ? "uniform" : propStr(o, "type"));
    out.hasDynamicOffset = propBool(o, "hasDynamicOffset", false);
    out.minBindingSize = (uint64_t)propDouble(o, "minBindingSize", 0);
}
void parseSamplerBindingLayout(JsValueRef o, wgpu::SamplerBindingLayout& out) {
    out.type = wgpu_enums::samplerBindingType(propStr(o, "type").empty() ? "filtering" : propStr(o, "type"));
}
void parseTextureBindingLayout(JsValueRef o, wgpu::TextureBindingLayout& out) {
    out.sampleType = wgpu_enums::textureSampleType(propStr(o, "sampleType").empty() ? "float" : propStr(o, "sampleType"));
    out.viewDimension = wgpu_enums::textureViewDimension(propStr(o, "viewDimension").empty() ? "2d" : propStr(o, "viewDimension"));
    out.multisampled = propBool(o, "multisampled", false);
}
void parseStorageTextureBindingLayout(JsValueRef o, wgpu::StorageTextureBindingLayout& out) {
    out.access = wgpu_enums::storageTextureAccess(propStr(o, "access").empty() ? "write-only" : propStr(o, "access"));
    out.format = wgpu_enums::textureFormat(propStr(o, "format"));
    out.viewDimension = wgpu_enums::textureViewDimension(propStr(o, "viewDimension").empty() ? "2d" : propStr(o, "viewDimension"));
}
}

WGPU_OP(device_createBindGroupLayout, "device.createBindGroupLayout") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    JsValueRef entries = propAny(desc, "entries");
    unsigned n = entries ? arrayLen(entries) : 0;
    std::vector<wgpu::BindGroupLayoutEntry> entryArr(n);
    for (unsigned i = 0; i < n; ++i) {
        JsValueRef e = arrayAt(entries, i);
        auto& dst = entryArr[i];
        dst.binding = propUint(e, "binding", 0);
        dst.visibility = wgpu::ShaderStage(propUint(e, "visibility", 0));
        if (JsValueRef b = propAny(e, "buffer")) parseBufferBindingLayout(b, dst.buffer);
        if (JsValueRef s = propAny(e, "sampler")) parseSamplerBindingLayout(s, dst.sampler);
        if (JsValueRef t = propAny(e, "texture")) parseTextureBindingLayout(t, dst.texture);
        if (JsValueRef st = propAny(e, "storageTexture")) parseStorageTextureBindingLayout(st, dst.storageTexture);
    }
    wgpu::BindGroupLayoutDescriptor bgld{};
    bgld.entryCount = entryArr.size();
    bgld.entries = entryArr.data();
    std::string label = propStr(desc, "label");
    if (!label.empty()) bgld.label = label.c_str();
    wgpu::BindGroupLayout bgl = d->CreateBindGroupLayout(&bgld);
    if (!bgl) return Host::getUndefined();
    uint32_t bh = g_state.bindGroupLayouts.add(std::move(bgl));
    return wrap("GPUBindGroupLayout", bh);
}

WGPU_OP(device_createBindGroup, "device.createBindGroup") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    wgpu::BindGroupLayout* layout = g_state.bindGroupLayouts.get(toHandle(propAny(desc, "layout")));
    if (!layout) { std::fprintf(stderr, "[wgpu] createBindGroup: missing layout\n"); return Host::getUndefined(); }

    JsValueRef entries = propAny(desc, "entries");
    unsigned n = entries ? arrayLen(entries) : 0;
    std::vector<wgpu::BindGroupEntry> entryArr(n);
    for (unsigned i = 0; i < n; ++i) {
        JsValueRef e = arrayAt(entries, i);
        auto& dst = entryArr[i];
        dst.binding = propUint(e, "binding", 0);
        JsValueRef resource = propAny(e, "resource");
        if (!resource) continue;

        // Resource can be: GPUSampler | GPUTextureView | { buffer, offset?, size? } | GPUExternalTexture
        if (Host::isObject(resource) && Host::hasProperty(resource, "buffer")) {
            wgpu::Buffer* b = g_state.buffers.get(toHandle(propAny(resource, "buffer")));
            if (b) {
                dst.buffer = *b;
                dst.offset = (uint64_t)propDouble(resource, "offset", 0);
                double sz = propDouble(resource, "size", -1.0);
                dst.size = (sz < 0) ? WGPU_WHOLE_SIZE : (uint64_t)sz;
            }
        } else if (Host::hasProperty(resource, "__type")) {
            std::string ty = Host::toUtf8(Host::getProperty(resource, "__type"));
            uint32_t rh = toHandle(resource);
            if (ty == "GPUSampler") {
                if (auto* s = g_state.samplers.get(rh)) dst.sampler = *s;
            } else if (ty == "GPUTextureView") {
                if (auto* v = g_state.textureViews.get(rh)) dst.textureView = *v;
            }
        }
    }
    wgpu::BindGroupDescriptor bgd{};
    bgd.layout = *layout;
    bgd.entryCount = entryArr.size();
    bgd.entries = entryArr.data();
    std::string label = propStr(desc, "label");
    if (!label.empty()) bgd.label = label.c_str();
    wgpu::BindGroup bg = d->CreateBindGroup(&bgd);
    if (!bg) return Host::getUndefined();
    uint32_t bgh = g_state.bindGroups.add(std::move(bg));
    return wrap("GPUBindGroup", bgh);
}

WGPU_OP(device_createPipelineLayout, "device.createPipelineLayout") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    JsValueRef bgls = propAny(desc, "bindGroupLayouts");
    unsigned n = bgls ? arrayLen(bgls) : 0;
    std::vector<wgpu::BindGroupLayout> layouts;
    for (unsigned i = 0; i < n; ++i) {
        auto* l = g_state.bindGroupLayouts.get(toHandle(arrayAt(bgls, i)));
        if (l) layouts.push_back(*l);
    }
    wgpu::PipelineLayoutDescriptor pld{};
    pld.bindGroupLayoutCount = layouts.size();
    pld.bindGroupLayouts = layouts.data();
    std::string label = propStr(desc, "label");
    if (!label.empty()) pld.label = label.c_str();
    wgpu::PipelineLayout pl = d->CreatePipelineLayout(&pld);
    if (!pl) return Host::getUndefined();
    return wrap("GPUPipelineLayout", g_state.pipelineLayouts.add(std::move(pl)));
}

// ----- render/compute pipeline -----
namespace {

// Owned storage for nested struct arrays within a pipeline descriptor.
struct PipelineParse {
    std::vector<wgpu::VertexBufferLayout> vBuffers;
    std::vector<std::vector<wgpu::VertexAttribute>> vAttrs;
    std::vector<wgpu::ColorTargetState> fTargets;
    std::vector<wgpu::BlendState> fBlends;
    std::string vEntry, fEntry;
    std::string label;
    wgpu::DepthStencilState dss{};
    bool hasDss = false;
    wgpu::FragmentState fs{};
    bool hasFs = false;
};

void parseVertexState(JsValueRef vState, wgpu::VertexState& out, PipelineParse& store) {
    if (!vState) return;
    JsValueRef mod = propAny(vState, "module");
    if (auto* m = g_state.shaderModules.get(toHandle(mod))) out.module = *m;
    store.vEntry = propStr(vState, "entryPoint");
    if (!store.vEntry.empty()) out.entryPoint = store.vEntry.c_str();
    JsValueRef bufs = propAny(vState, "buffers");
    unsigned n = bufs ? arrayLen(bufs) : 0;
    store.vBuffers.resize(n);
    store.vAttrs.resize(n);
    for (unsigned i = 0; i < n; ++i) {
        JsValueRef b = arrayAt(bufs, i);
        if (!b || Host::isNull(b) || Host::isUndefined(b)) {
            store.vBuffers[i] = {};
            continue;
        }
        auto& vb = store.vBuffers[i];
        vb.arrayStride = (uint64_t)propDouble(b, "arrayStride", 0);
        vb.stepMode = wgpu_enums::vertexStepMode(propStr(b, "stepMode"));
        JsValueRef attrs = propAny(b, "attributes");
        unsigned an = attrs ? arrayLen(attrs) : 0;
        store.vAttrs[i].resize(an);
        for (unsigned j = 0; j < an; ++j) {
            JsValueRef a = arrayAt(attrs, j);
            auto& dst = store.vAttrs[i][j];
            dst.format = wgpu_enums::vertexFormat(propStr(a, "format"));
            dst.offset = (uint64_t)propDouble(a, "offset", 0);
            dst.shaderLocation = propUint(a, "shaderLocation", 0);
        }
        vb.attributeCount = an;
        vb.attributes = store.vAttrs[i].data();
    }
    out.bufferCount = store.vBuffers.size();
    out.buffers = store.vBuffers.data();
}

void parseFragmentState(JsValueRef fState, PipelineParse& store) {
    if (!fState) return;
    store.hasFs = true;
    auto& out = store.fs;
    JsValueRef mod = propAny(fState, "module");
    if (auto* m = g_state.shaderModules.get(toHandle(mod))) out.module = *m;
    store.fEntry = propStr(fState, "entryPoint");
    if (!store.fEntry.empty()) out.entryPoint = store.fEntry.c_str();
    JsValueRef targets = propAny(fState, "targets");
    unsigned n = targets ? arrayLen(targets) : 0;
    store.fTargets.resize(n);
    store.fBlends.resize(n);
    for (unsigned i = 0; i < n; ++i) {
        JsValueRef t = arrayAt(targets, i);
        auto& dst = store.fTargets[i];
        if (!t || Host::isNull(t) || Host::isUndefined(t)) continue;
        dst.format = wgpu_enums::textureFormat(propStr(t, "format"));
        dst.writeMask = wgpu::ColorWriteMask(propUint(t, "writeMask", 0xF));
        JsValueRef blend = propAny(t, "blend");
        if (blend) {
            auto& bs = store.fBlends[i];
            JsValueRef color = propAny(blend, "color");
            JsValueRef alpha = propAny(blend, "alpha");
            if (color) {
                bs.color.srcFactor = wgpu_enums::blendFactor(propStr(color, "srcFactor"));
                bs.color.dstFactor = wgpu_enums::blendFactor(propStr(color, "dstFactor"));
                bs.color.operation = wgpu_enums::blendOperation(propStr(color, "operation"));
            }
            if (alpha) {
                bs.alpha.srcFactor = wgpu_enums::blendFactor(propStr(alpha, "srcFactor"));
                bs.alpha.dstFactor = wgpu_enums::blendFactor(propStr(alpha, "dstFactor"));
                bs.alpha.operation = wgpu_enums::blendOperation(propStr(alpha, "operation"));
            }
            dst.blend = &bs;
        }
    }
    out.targetCount = store.fTargets.size();
    out.targets = store.fTargets.data();
}

void parseDepthStencilState(JsValueRef ds, PipelineParse& store) {
    if (!ds) return;
    store.hasDss = true;
    auto& d = store.dss;
    d.format = wgpu_enums::textureFormat(propStr(ds, "format"));
    d.depthWriteEnabled = propBool(ds, "depthWriteEnabled", false) ? wgpu::OptionalBool::True : wgpu::OptionalBool::False;
    std::string cmp = propStr(ds, "depthCompare");
    if (!cmp.empty()) d.depthCompare = wgpu_enums::compareFunction(cmp);
    d.depthBias = (int32_t)propDouble(ds, "depthBias", 0);
    d.depthBiasSlopeScale = (float)propDouble(ds, "depthBiasSlopeScale", 0);
    d.depthBiasClamp = (float)propDouble(ds, "depthBiasClamp", 0);
    auto parseStencil = [&](JsValueRef o, wgpu::StencilFaceState& dst) {
        if (!o) return;
        std::string c = propStr(o, "compare");
        if (!c.empty()) dst.compare = wgpu_enums::compareFunction(c);
        std::string f = propStr(o, "failOp"); if (!f.empty()) dst.failOp = wgpu_enums::stencilOperation(f);
        std::string df = propStr(o, "depthFailOp"); if (!df.empty()) dst.depthFailOp = wgpu_enums::stencilOperation(df);
        std::string p = propStr(o, "passOp"); if (!p.empty()) dst.passOp = wgpu_enums::stencilOperation(p);
    };
    parseStencil(propAny(ds, "stencilFront"), d.stencilFront);
    parseStencil(propAny(ds, "stencilBack"), d.stencilBack);
    d.stencilReadMask = propUint(ds, "stencilReadMask", 0xFFFFFFFFu);
    d.stencilWriteMask = propUint(ds, "stencilWriteMask", 0xFFFFFFFFu);
}

} // namespace

WGPU_OP(device_createRenderPipeline, "device.createRenderPipeline") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    wgpu::RenderPipelineDescriptor rpd{};
    PipelineParse store;

    // Layout: "auto" or GPUPipelineLayout
    JsValueRef layout = propAny(desc, "layout");
    if (layout && Host::isObject(layout)) {
        auto* pl = g_state.pipelineLayouts.get(toHandle(layout));
        if (pl) rpd.layout = *pl;
    }

    parseVertexState(propAny(desc, "vertex"), rpd.vertex, store);
    parseFragmentState(propAny(desc, "fragment"), store);
    if (store.hasFs) rpd.fragment = &store.fs;
    parseDepthStencilState(propAny(desc, "depthStencil"), store);
    if (store.hasDss) rpd.depthStencil = &store.dss;

    if (JsValueRef pr = propAny(desc, "primitive")) {
        std::string topo = propStr(pr, "topology");
        if (!topo.empty()) rpd.primitive.topology = wgpu_enums::primitiveTopology(topo);
        std::string cm = propStr(pr, "cullMode"); if (!cm.empty()) rpd.primitive.cullMode = wgpu_enums::cullMode(cm);
        std::string ff = propStr(pr, "frontFace"); if (!ff.empty()) rpd.primitive.frontFace = wgpu_enums::frontFace(ff);
        std::string sif = propStr(pr, "stripIndexFormat");
        if (!sif.empty()) rpd.primitive.stripIndexFormat = wgpu_enums::indexFormat(sif);
    }
    if (JsValueRef ms = propAny(desc, "multisample")) {
        rpd.multisample.count = propUint(ms, "count", 1);
        rpd.multisample.mask = propUint(ms, "mask", 0xFFFFFFFFu);
        rpd.multisample.alphaToCoverageEnabled = propBool(ms, "alphaToCoverageEnabled", false);
    }
    store.label = propStr(desc, "label");
    if (!store.label.empty()) rpd.label = store.label.c_str();

    wgpu::RenderPipeline rp = d->CreateRenderPipeline(&rpd);
    if (!rp) { std::fprintf(stderr, "[wgpu] createRenderPipeline failed (label=%s)\n", store.label.c_str()); return Host::getUndefined(); }
    return wrap("GPURenderPipeline", g_state.renderPipelines.add(std::move(rp)));
}

WGPU_OP(device_createComputePipeline, "device.createComputePipeline") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    wgpu::ComputePipelineDescriptor cpd{};
    JsValueRef layout = propAny(desc, "layout");
    if (layout && Host::isObject(layout)) {
        auto* pl = g_state.pipelineLayouts.get(toHandle(layout));
        if (pl) cpd.layout = *pl;
    }
    JsValueRef comp = propAny(desc, "compute");
    std::string entry = propStr(comp, "entryPoint");
    if (auto* m = g_state.shaderModules.get(toHandle(propAny(comp, "module")))) cpd.compute.module = *m;
    if (!entry.empty()) cpd.compute.entryPoint = entry.c_str();
    std::string label = propStr(desc, "label");
    if (!label.empty()) cpd.label = label.c_str();
    wgpu::ComputePipeline cp = d->CreateComputePipeline(&cpd);
    if (!cp) return Host::getUndefined();
    return wrap("GPUComputePipeline", g_state.computePipelines.add(std::move(cp)));
}

WGPU_OP(device_createCommandEncoder, "device.createCommandEncoder") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    wgpu::CommandEncoderDescriptor ced{};
    std::string label = (argc > 0) ? propStr(args[0], "label") : std::string();
    if (!label.empty()) ced.label = label.c_str();
    wgpu::CommandEncoder ce = d->CreateCommandEncoder(&ced);
    return wrap("GPUCommandEncoder", g_state.commandEncoders.add(std::move(ce)));
}

WGPU_OP(device_createRenderBundleEncoder, "device.createRenderBundleEncoder") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = (argc > 0) ? args[0] : nullptr;
    wgpu::RenderBundleEncoderDescriptor rbed{};
    JsValueRef colorFormats = propAny(desc, "colorFormats");
    std::vector<wgpu::TextureFormat> cf;
    if (colorFormats && Host::isArray(colorFormats)) {
        unsigned n = arrayLen(colorFormats);
        for (unsigned i = 0; i < n; ++i) {
            JsValueRef item = arrayAt(colorFormats, i);
            if (!item || Host::isNull(item) || Host::isUndefined(item)) {
                cf.push_back(wgpu::TextureFormat::Undefined);
            } else {
                cf.push_back(wgpu_enums::textureFormat(Host::toUtf8(item)));
            }
        }
    }
    rbed.colorFormatCount = cf.size();
    rbed.colorFormats = cf.data();
    std::string dsFmt = propStr(desc, "depthStencilFormat");
    if (!dsFmt.empty()) rbed.depthStencilFormat = wgpu_enums::textureFormat(dsFmt);
    rbed.sampleCount = propUint(desc, "sampleCount", 1);
    rbed.depthReadOnly = propBool(desc, "depthReadOnly", false);
    rbed.stencilReadOnly = propBool(desc, "stencilReadOnly", false);
    std::string label = propStr(desc, "label");
    if (!label.empty()) rbed.label = label.c_str();
    wgpu::RenderBundleEncoder rbe = d->CreateRenderBundleEncoder(&rbed);
    return wrap("GPURenderBundleEncoder", g_state.renderBundleEncoders.add(std::move(rbe)));
}

WGPU_OP(device_createQuerySet, "device.createQuerySet") {
    uint32_t h = toHandle(self);
    wgpu::Device* d = g_state.devices.get(h);
    if (!d) return Host::getUndefined();
    JsValueRef desc = args[0];
    wgpu::QuerySetDescriptor qsd{};
    qsd.type = wgpu_enums::queryType(propStr(desc, "type"));
    qsd.count = propUint(desc, "count", 0);
    wgpu::QuerySet qs = d->CreateQuerySet(&qsd);
    return wrap("GPUQuerySet", g_state.querySets.add(std::move(qs)));
}

WGPU_OP(device_features, "device.features") {
    JsValueRef s = Host::makeObject();
    Host::setFunction(s, "has", +[](JsValueRef, bool, JsValueRef*, unsigned short, void*) -> JsValueRef {
        return Host::fromBool(false);
    });
    return s;
}

WGPU_OP(device_limits, "device.limits") { return Host::makeObject(); }

WGPU_OP(device_pushErrorScope, "device.pushErrorScope") { return Host::getUndefined(); }
WGPU_OP(device_popErrorScope, "device.popErrorScope") { return Host::resolvedPromise(Host::getNull()); }
WGPU_OP(device_destroy, "device.destroy") {
    uint32_t h = toHandle(self);
    g_state.devices.release(h);
    return Host::getUndefined();
}

// =============================================================================
// GPUQueue
// =============================================================================
WGPU_OP(queue_submit, "queue.submit") {
    uint32_t h = toHandle(self);
    wgpu::Queue* q = g_state.queues.get(h);
    if (!q) return Host::getUndefined();
    JsValueRef arr = args[0];
    unsigned n = arr ? arrayLen(arr) : 0;
    std::vector<wgpu::CommandBuffer> bufs;
    for (unsigned i = 0; i < n; ++i) {
        if (auto* cb = g_state.commandBuffers.get(toHandle(arrayAt(arr, i)))) bufs.push_back(*cb);
    }
    if (!bufs.empty()) q->Submit(bufs.size(), bufs.data());
    return Host::getUndefined();
}

WGPU_OP(queue_writeBuffer, "queue.writeBuffer") {
    uint32_t h = toHandle(self);
    wgpu::Queue* q = g_state.queues.get(h);
    if (!q) return Host::getUndefined();
    wgpu::Buffer* b = g_state.buffers.get(toHandle(args[0]));
    if (!b) return Host::getUndefined();
    uint64_t bufferOffset = (uint64_t)Host::getDouble(args[1], 0);
    JsValueRef data = args[2];
    const uint8_t* bytes = nullptr; size_t size = 0; size_t off = 0;
    if (!getBytes(data, bytes, size, off)) return Host::getUndefined();
    size_t dataOffset = (argc > 3) ? (size_t)Host::getDouble(args[3], 0) : 0;
    size_t length = (argc > 4 && !Host::isUndefined(args[4])) ? (size_t)Host::getDouble(args[4], 0) : (size - dataOffset);
    q->WriteBuffer(*b, bufferOffset, bytes + dataOffset, length);
    return Host::getUndefined();
}

WGPU_OP(queue_writeTexture, "queue.writeTexture") {
    uint32_t h = toHandle(self);
    wgpu::Queue* q = g_state.queues.get(h);
    if (!q) return Host::getUndefined();
    JsValueRef destination = args[0];
    JsValueRef data = args[1];
    JsValueRef layout = args[2];
    JsValueRef size = args[3];

    wgpu::TexelCopyTextureInfo tci{};
    wgpu::Texture* tx = g_state.textures.get(toHandle(propAny(destination, "texture")));
    if (!tx) return Host::getUndefined();
    tci.texture = *tx;
    tci.mipLevel = propUint(destination, "mipLevel", 0);
    if (JsValueRef ori = propAny(destination, "origin")) tci.origin = parseOrigin3D(ori);
    std::string aspect = propStr(destination, "aspect");
    // (we leave aspect default)

    wgpu::TexelCopyBufferLayout tbl{};
    tbl.offset = (uint64_t)propDouble(layout, "offset", 0);
    tbl.bytesPerRow = Host::hasProperty(layout, "bytesPerRow") && !Host::isUndefined(Host::getProperty(layout, "bytesPerRow"))
                          ? propUint(layout, "bytesPerRow", WGPU_COPY_STRIDE_UNDEFINED)
                          : WGPU_COPY_STRIDE_UNDEFINED;
    tbl.rowsPerImage = Host::hasProperty(layout, "rowsPerImage") && !Host::isUndefined(Host::getProperty(layout, "rowsPerImage"))
                           ? propUint(layout, "rowsPerImage", WGPU_COPY_STRIDE_UNDEFINED)
                           : WGPU_COPY_STRIDE_UNDEFINED;

    wgpu::Extent3D ext = parseExtent3D(size);

    const uint8_t* bytes = nullptr; size_t bsize = 0; size_t off = 0;
    if (!getBytes(data, bytes, bsize, off)) return Host::getUndefined();
    q->WriteTexture(&tci, bytes, bsize, &tbl, &ext);
    return Host::getUndefined();
}

WGPU_OP(queue_onSubmittedWorkDone, "queue.onSubmittedWorkDone") {
    uint32_t h = toHandle(self);
    wgpu::Queue* q = g_state.queues.get(h);
    if (!q) return Host::resolvedPromise(Host::getUndefined());
    wgpu::Future f = q->OnSubmittedWorkDone(wgpu::CallbackMode::WaitAnyOnly,
        [](wgpu::QueueWorkDoneStatus s, wgpu::StringView){ (void)s; });
    g_state.instance.WaitAny(f, UINT64_MAX);
    return Host::resolvedPromise(Host::getUndefined());
}

// =============================================================================
// GPUBuffer
// =============================================================================
WGPU_OP(buffer_mapAsync, "buffer.mapAsync") {
    uint32_t h = toHandle(self);
    wgpu::Buffer* b = g_state.buffers.get(h);
    if (!b) return Host::rejectedPromise(Host::fromUtf8("invalid buffer"));
    uint32_t mode = Host::getUint(args[0]);
    uint64_t offset = (argc > 1) ? (uint64_t)Host::getDouble(args[1], 0) : 0;
    uint64_t size = (argc > 2 && !Host::isUndefined(args[2])) ? (uint64_t)Host::getDouble(args[2], 0) : WGPU_WHOLE_SIZE;
    wgpu::Future f = b->MapAsync(wgpu::MapMode(mode), offset, size, wgpu::CallbackMode::WaitAnyOnly,
        [](wgpu::MapAsyncStatus s, wgpu::StringView m){ if (s != wgpu::MapAsyncStatus::Success) std::fprintf(stderr, "[wgpu] mapAsync failed: %.*s\n", (int)m.length, m.data); });
    g_state.instance.WaitAny(f, UINT64_MAX);
    return Host::resolvedPromise(Host::getUndefined());
}

WGPU_OP(buffer_getMappedRange, "buffer.getMappedRange") {
    uint32_t h = toHandle(self);
    wgpu::Buffer* b = g_state.buffers.get(h);
    if (!b) return Host::getUndefined();
    uint64_t offset = (argc > 0) ? (uint64_t)Host::getDouble(args[0], 0) : 0;
    uint64_t size = (argc > 1 && !Host::isUndefined(args[1])) ? (uint64_t)Host::getDouble(args[1], 0) : (b->GetSize() - offset);
    void* ptr = b->GetMappedRange(offset, (size_t)size);
    if (!ptr) return Host::getUndefined();
    // Wrap as an external ArrayBuffer so writes go straight into Dawn-mapped memory.
    JsValueRef ab = nullptr;
    JsCreateExternalArrayBuffer(ptr, (unsigned int)size, nullptr, nullptr, &ab);
    g_state.bufferMaps[h] = { ptr, (size_t)size, (size_t)offset };
    return ab;
}

WGPU_OP(buffer_unmap, "buffer.unmap") {
    uint32_t h = toHandle(self);
    wgpu::Buffer* b = g_state.buffers.get(h);
    if (b) b->Unmap();
    g_state.bufferMaps.erase(h);
    return Host::getUndefined();
}

WGPU_OP(buffer_destroy, "buffer.destroy") {
    uint32_t h = toHandle(self);
    if (auto* b = g_state.buffers.get(h)) b->Destroy();
    g_state.buffers.release(h);
    return Host::getUndefined();
}

// =============================================================================
// GPUTexture / GPUTextureView
// =============================================================================
WGPU_OP(texture_createView, "texture.createView") {
    uint32_t h = toHandle(self);
    wgpu::Texture* t = g_state.textures.get(h);
    if (!t) return Host::getUndefined();
    wgpu::TextureViewDescriptor tvd{};
    bool hasDim = false;
    if (argc > 0 && Host::isObject(args[0])) {
        JsValueRef desc = args[0];
        std::string fmt = propStr(desc, "format"); if (!fmt.empty()) tvd.format = wgpu_enums::textureFormat(fmt);
        std::string dim = propStr(desc, "dimension"); if (!dim.empty()) { tvd.dimension = wgpu_enums::textureViewDimension(dim); hasDim = true; }
        tvd.baseMipLevel = propUint(desc, "baseMipLevel", 0);
        tvd.mipLevelCount = propUint(desc, "mipLevelCount", WGPU_MIP_LEVEL_COUNT_UNDEFINED);
        tvd.baseArrayLayer = propUint(desc, "baseArrayLayer", 0);
        tvd.arrayLayerCount = propUint(desc, "arrayLayerCount", WGPU_ARRAY_LAYER_COUNT_UNDEFINED);
        std::string aspect = propStr(desc, "aspect");
        if (aspect == "stencil-only") tvd.aspect = wgpu::TextureAspect::StencilOnly;
        else if (aspect == "depth-only") tvd.aspect = wgpu::TextureAspect::DepthOnly;
    }
    wgpu::TextureView v = t->CreateView(&tvd);
    return wrap("GPUTextureView", g_state.textureViews.add(std::move(v)));
}

WGPU_OP(texture_destroy, "texture.destroy") {
    uint32_t h = toHandle(self);
    if (auto* t = g_state.textures.get(h)) t->Destroy();
    g_state.textures.release(h);
    return Host::getUndefined();
}

// =============================================================================
// GPUCommandEncoder
// =============================================================================
namespace {
wgpu::TexelCopyBufferInfo parseImageCopyBuffer(JsValueRef o) {
    wgpu::TexelCopyBufferInfo info{};
    auto* b = g_state.buffers.get(toHandle(propAny(o, "buffer")));
    if (b) info.buffer = *b;
    info.layout.offset = (uint64_t)propDouble(o, "offset", 0);
    info.layout.bytesPerRow = Host::hasProperty(o, "bytesPerRow") && !Host::isUndefined(Host::getProperty(o, "bytesPerRow"))
                              ? propUint(o, "bytesPerRow", WGPU_COPY_STRIDE_UNDEFINED)
                              : WGPU_COPY_STRIDE_UNDEFINED;
    info.layout.rowsPerImage = Host::hasProperty(o, "rowsPerImage") && !Host::isUndefined(Host::getProperty(o, "rowsPerImage"))
                               ? propUint(o, "rowsPerImage", WGPU_COPY_STRIDE_UNDEFINED)
                               : WGPU_COPY_STRIDE_UNDEFINED;
    return info;
}
wgpu::TexelCopyTextureInfo parseImageCopyTexture(JsValueRef o) {
    wgpu::TexelCopyTextureInfo info{};
    auto* t = g_state.textures.get(toHandle(propAny(o, "texture")));
    if (t) info.texture = *t;
    info.mipLevel = propUint(o, "mipLevel", 0);
    if (JsValueRef ori = propAny(o, "origin")) info.origin = parseOrigin3D(ori);
    return info;
}
} // namespace

WGPU_OP(commandEncoder_beginRenderPass, "commandEncoder.beginRenderPass") {
    uint32_t h = toHandle(self);
    wgpu::CommandEncoder* enc = g_state.commandEncoders.get(h);
    if (!enc) return Host::getUndefined();
    JsValueRef desc = args[0];
    JsValueRef colors = propAny(desc, "colorAttachments");
    unsigned cn = colors ? arrayLen(colors) : 0;
    std::vector<wgpu::RenderPassColorAttachment> ca(cn);
    for (unsigned i = 0; i < cn; ++i) {
        JsValueRef a = arrayAt(colors, i);
        if (!a || Host::isNull(a) || Host::isUndefined(a)) continue;
        auto& dst = ca[i];
        if (auto* v = g_state.textureViews.get(toHandle(propAny(a, "view")))) dst.view = *v;
        if (auto* rv = g_state.textureViews.get(toHandle(propAny(a, "resolveTarget")))) dst.resolveTarget = *rv;
        dst.loadOp = wgpu_enums::loadOp(propStr(a, "loadOp"));
        dst.storeOp = wgpu_enums::storeOp(propStr(a, "storeOp"));
        if (JsValueRef cc = propAny(a, "clearValue")) dst.clearValue = parseColor(cc);
        dst.depthSlice = propUint(a, "depthSlice", WGPU_DEPTH_SLICE_UNDEFINED);
    }
    wgpu::RenderPassDescriptor rpd{};
    rpd.colorAttachmentCount = ca.size();
    rpd.colorAttachments = ca.data();

    wgpu::RenderPassDepthStencilAttachment dsa{};
    bool hasDS = false;
    if (JsValueRef ds = propAny(desc, "depthStencilAttachment")) {
        hasDS = true;
        if (auto* v = g_state.textureViews.get(toHandle(propAny(ds, "view")))) dsa.view = *v;
        std::string dl = propStr(ds, "depthLoadOp"); if (!dl.empty()) dsa.depthLoadOp = wgpu_enums::loadOp(dl);
        std::string dst = propStr(ds, "depthStoreOp"); if (!dst.empty()) dsa.depthStoreOp = wgpu_enums::storeOp(dst);
        if (Host::hasProperty(ds, "depthClearValue")) dsa.depthClearValue = (float)propDouble(ds, "depthClearValue", 1.0);
        dsa.depthReadOnly = propBool(ds, "depthReadOnly", false);
        std::string sl = propStr(ds, "stencilLoadOp"); if (!sl.empty()) dsa.stencilLoadOp = wgpu_enums::loadOp(sl);
        std::string ss = propStr(ds, "stencilStoreOp"); if (!ss.empty()) dsa.stencilStoreOp = wgpu_enums::storeOp(ss);
        dsa.stencilClearValue = propUint(ds, "stencilClearValue", 0);
        dsa.stencilReadOnly = propBool(ds, "stencilReadOnly", false);
        rpd.depthStencilAttachment = &dsa;
    }

    std::string label = propStr(desc, "label");
    if (!label.empty()) rpd.label = label.c_str();
    wgpu::RenderPassEncoder rp = enc->BeginRenderPass(&rpd);
    return wrap("GPURenderPassEncoder", g_state.renderPassEncoders.add(std::move(rp)));
}

WGPU_OP(commandEncoder_beginComputePass, "commandEncoder.beginComputePass") {
    uint32_t h = toHandle(self);
    wgpu::CommandEncoder* enc = g_state.commandEncoders.get(h);
    if (!enc) return Host::getUndefined();
    wgpu::ComputePassEncoder cp = enc->BeginComputePass(nullptr);
    return wrap("GPUComputePassEncoder", g_state.computePassEncoders.add(std::move(cp)));
}

WGPU_OP(commandEncoder_copyBufferToBuffer, "commandEncoder.copyBufferToBuffer") {
    uint32_t h = toHandle(self);
    wgpu::CommandEncoder* enc = g_state.commandEncoders.get(h);
    if (!enc) return Host::getUndefined();
    auto* src = g_state.buffers.get(toHandle(args[0]));
    uint64_t srcOff = (uint64_t)Host::getDouble(args[1], 0);
    auto* dst = g_state.buffers.get(toHandle(args[2]));
    uint64_t dstOff = (uint64_t)Host::getDouble(args[3], 0);
    uint64_t size = (uint64_t)Host::getDouble(args[4], 0);
    if (src && dst) enc->CopyBufferToBuffer(*src, srcOff, *dst, dstOff, size);
    return Host::getUndefined();
}

WGPU_OP(commandEncoder_copyBufferToTexture, "commandEncoder.copyBufferToTexture") {
    uint32_t h = toHandle(self);
    wgpu::CommandEncoder* enc = g_state.commandEncoders.get(h);
    if (!enc) return Host::getUndefined();
    auto src = parseImageCopyBuffer(args[0]);
    auto dst = parseImageCopyTexture(args[1]);
    wgpu::Extent3D ext = parseExtent3D(args[2]);
    enc->CopyBufferToTexture(&src, &dst, &ext);
    return Host::getUndefined();
}

WGPU_OP(commandEncoder_copyTextureToBuffer, "commandEncoder.copyTextureToBuffer") {
    uint32_t h = toHandle(self);
    wgpu::CommandEncoder* enc = g_state.commandEncoders.get(h);
    if (!enc) return Host::getUndefined();
    auto src = parseImageCopyTexture(args[0]);
    auto dst = parseImageCopyBuffer(args[1]);
    wgpu::Extent3D ext = parseExtent3D(args[2]);
    enc->CopyTextureToBuffer(&src, &dst, &ext);
    return Host::getUndefined();
}

WGPU_OP(commandEncoder_copyTextureToTexture, "commandEncoder.copyTextureToTexture") {
    uint32_t h = toHandle(self);
    wgpu::CommandEncoder* enc = g_state.commandEncoders.get(h);
    if (!enc) return Host::getUndefined();
    auto src = parseImageCopyTexture(args[0]);
    auto dst = parseImageCopyTexture(args[1]);
    wgpu::Extent3D ext = parseExtent3D(args[2]);
    enc->CopyTextureToTexture(&src, &dst, &ext);
    return Host::getUndefined();
}

WGPU_OP(commandEncoder_clearBuffer, "commandEncoder.clearBuffer") {
    uint32_t h = toHandle(self);
    wgpu::CommandEncoder* enc = g_state.commandEncoders.get(h);
    if (!enc) return Host::getUndefined();
    auto* b = g_state.buffers.get(toHandle(args[0]));
    if (!b) return Host::getUndefined();
    uint64_t offset = (argc > 1) ? (uint64_t)Host::getDouble(args[1], 0) : 0;
    uint64_t size = (argc > 2 && !Host::isUndefined(args[2])) ? (uint64_t)Host::getDouble(args[2], 0) : WGPU_WHOLE_SIZE;
    enc->ClearBuffer(*b, offset, size);
    return Host::getUndefined();
}

WGPU_OP(commandEncoder_finish, "commandEncoder.finish") {
    uint32_t h = toHandle(self);
    wgpu::CommandEncoder* enc = g_state.commandEncoders.get(h);
    if (!enc) return Host::getUndefined();
    wgpu::CommandBuffer cb = enc->Finish();
    return wrap("GPUCommandBuffer", g_state.commandBuffers.add(std::move(cb)));
}

WGPU_OP(commandEncoder_pushDebugGroup, "commandEncoder.pushDebugGroup") { return Host::getUndefined(); }
WGPU_OP(commandEncoder_popDebugGroup, "commandEncoder.popDebugGroup") { return Host::getUndefined(); }
WGPU_OP(commandEncoder_insertDebugMarker, "commandEncoder.insertDebugMarker") { return Host::getUndefined(); }

// =============================================================================
// GPURenderPassEncoder
// =============================================================================
WGPU_OP(renderPass_setPipeline, "renderPass.setPipeline") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    auto* rp = g_state.renderPipelines.get(toHandle(args[0]));
    if (p && rp) p->SetPipeline(*rp);
    return Host::getUndefined();
}
WGPU_OP(renderPass_setBindGroup, "renderPass.setBindGroup") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    uint32_t index = Host::getUint(args[0]);
    auto* bg = g_state.bindGroups.get(toHandle(args[1]));
    std::vector<uint32_t> dyn;
    if (argc > 2 && Host::isArray(args[2])) {
        unsigned n = arrayLen(args[2]);
        for (unsigned i = 0; i < n; ++i) dyn.push_back(Host::getUint(arrayAt(args[2], i)));
    }
    if (bg) p->SetBindGroup(index, *bg, dyn.size(), dyn.empty() ? nullptr : dyn.data());
    else p->SetBindGroup(index, nullptr, dyn.size(), dyn.empty() ? nullptr : dyn.data());
    return Host::getUndefined();
}
WGPU_OP(renderPass_setVertexBuffer, "renderPass.setVertexBuffer") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    uint32_t slot = Host::getUint(args[0]);
    auto* b = (argc > 1 && !Host::isNull(args[1])) ? g_state.buffers.get(toHandle(args[1])) : nullptr;
    uint64_t offset = (argc > 2 && !Host::isUndefined(args[2])) ? (uint64_t)Host::getDouble(args[2], 0) : 0;
    uint64_t size = (argc > 3 && !Host::isUndefined(args[3])) ? (uint64_t)Host::getDouble(args[3], 0) : WGPU_WHOLE_SIZE;
    if (b) p->SetVertexBuffer(slot, *b, offset, size);
    return Host::getUndefined();
}
WGPU_OP(renderPass_setIndexBuffer, "renderPass.setIndexBuffer") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    auto* b = g_state.buffers.get(toHandle(args[0]));
    if (!b) return Host::getUndefined();
    wgpu::IndexFormat fmt = wgpu_enums::indexFormat(Host::toUtf8(args[1]));
    uint64_t offset = (argc > 2 && !Host::isUndefined(args[2])) ? (uint64_t)Host::getDouble(args[2], 0) : 0;
    uint64_t size = (argc > 3 && !Host::isUndefined(args[3])) ? (uint64_t)Host::getDouble(args[3], 0) : WGPU_WHOLE_SIZE;
    p->SetIndexBuffer(*b, fmt, offset, size);
    return Host::getUndefined();
}
WGPU_OP(renderPass_draw, "renderPass.draw") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    p->Draw(Host::getUint(args[0]),
            argc > 1 ? Host::getUint(args[1], 1) : 1,
            argc > 2 ? Host::getUint(args[2], 0) : 0,
            argc > 3 ? Host::getUint(args[3], 0) : 0);
    return Host::getUndefined();
}
WGPU_OP(renderPass_drawIndexed, "renderPass.drawIndexed") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    p->DrawIndexed(Host::getUint(args[0]),
                   argc > 1 ? Host::getUint(args[1], 1) : 1,
                   argc > 2 ? Host::getUint(args[2], 0) : 0,
                   argc > 3 ? Host::getInt(args[3], 0) : 0,
                   argc > 4 ? Host::getUint(args[4], 0) : 0);
    return Host::getUndefined();
}
WGPU_OP(renderPass_drawIndirect, "renderPass.drawIndirect") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    auto* b = g_state.buffers.get(toHandle(args[0]));
    uint64_t off = (uint64_t)Host::getDouble(args[1], 0);
    if (b) p->DrawIndirect(*b, off);
    return Host::getUndefined();
}
WGPU_OP(renderPass_drawIndexedIndirect, "renderPass.drawIndexedIndirect") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    auto* b = g_state.buffers.get(toHandle(args[0]));
    uint64_t off = (uint64_t)Host::getDouble(args[1], 0);
    if (b) p->DrawIndexedIndirect(*b, off);
    return Host::getUndefined();
}
WGPU_OP(renderPass_setViewport, "renderPass.setViewport") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    p->SetViewport((float)Host::getDouble(args[0]), (float)Host::getDouble(args[1]),
                   (float)Host::getDouble(args[2]), (float)Host::getDouble(args[3]),
                   (float)Host::getDouble(args[4]), (float)Host::getDouble(args[5]));
    return Host::getUndefined();
}
WGPU_OP(renderPass_setScissorRect, "renderPass.setScissorRect") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    p->SetScissorRect(Host::getUint(args[0]), Host::getUint(args[1]),
                      Host::getUint(args[2]), Host::getUint(args[3]));
    return Host::getUndefined();
}
WGPU_OP(renderPass_setBlendConstant, "renderPass.setBlendConstant") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    wgpu::Color c = parseColor(args[0]);
    p->SetBlendConstant(&c);
    return Host::getUndefined();
}
WGPU_OP(renderPass_setStencilReference, "renderPass.setStencilReference") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    p->SetStencilReference(Host::getUint(args[0]));
    return Host::getUndefined();
}
WGPU_OP(renderPass_executeBundles, "renderPass.executeBundles") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    JsValueRef arr = args[0];
    unsigned n = arr ? arrayLen(arr) : 0;
    std::vector<wgpu::RenderBundle> bundles;
    for (unsigned i = 0; i < n; ++i) {
        if (auto* rb = g_state.renderBundles.get(toHandle(arrayAt(arr, i)))) bundles.push_back(*rb);
    }
    if (!bundles.empty()) p->ExecuteBundles(bundles.size(), bundles.data());
    return Host::getUndefined();
}
WGPU_OP(renderPass_end, "renderPass.end") {
    auto* p = g_state.renderPassEncoders.get(toHandle(self));
    if (p) p->End();
    return Host::getUndefined();
}
WGPU_OP(renderPass_pushDebugGroup, "renderPass.pushDebugGroup") { return Host::getUndefined(); }
WGPU_OP(renderPass_popDebugGroup, "renderPass.popDebugGroup") { return Host::getUndefined(); }
WGPU_OP(renderPass_insertDebugMarker, "renderPass.insertDebugMarker") { return Host::getUndefined(); }

// =============================================================================
// GPUComputePassEncoder
// =============================================================================
WGPU_OP(computePass_setPipeline, "computePass.setPipeline") {
    auto* p = g_state.computePassEncoders.get(toHandle(self));
    auto* cp = g_state.computePipelines.get(toHandle(args[0]));
    if (p && cp) p->SetPipeline(*cp);
    return Host::getUndefined();
}
WGPU_OP(computePass_setBindGroup, "computePass.setBindGroup") {
    auto* p = g_state.computePassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    uint32_t index = Host::getUint(args[0]);
    auto* bg = g_state.bindGroups.get(toHandle(args[1]));
    std::vector<uint32_t> dyn;
    if (argc > 2 && Host::isArray(args[2])) {
        unsigned n = arrayLen(args[2]);
        for (unsigned i = 0; i < n; ++i) dyn.push_back(Host::getUint(arrayAt(args[2], i)));
    }
    if (bg) p->SetBindGroup(index, *bg, dyn.size(), dyn.empty() ? nullptr : dyn.data());
    return Host::getUndefined();
}
WGPU_OP(computePass_dispatchWorkgroups, "computePass.dispatchWorkgroups") {
    auto* p = g_state.computePassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    p->DispatchWorkgroups(Host::getUint(args[0]),
                          argc > 1 ? Host::getUint(args[1], 1) : 1,
                          argc > 2 ? Host::getUint(args[2], 1) : 1);
    return Host::getUndefined();
}
WGPU_OP(computePass_dispatchWorkgroupsIndirect, "computePass.dispatchWorkgroupsIndirect") {
    auto* p = g_state.computePassEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    auto* b = g_state.buffers.get(toHandle(args[0]));
    if (b) p->DispatchWorkgroupsIndirect(*b, (uint64_t)Host::getDouble(args[1], 0));
    return Host::getUndefined();
}
WGPU_OP(computePass_end, "computePass.end") {
    auto* p = g_state.computePassEncoders.get(toHandle(self));
    if (p) p->End();
    return Host::getUndefined();
}

// =============================================================================
// GPURenderBundleEncoder
// =============================================================================
WGPU_OP(renderBundle_setPipeline, "renderBundle.setPipeline") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    auto* rp = g_state.renderPipelines.get(toHandle(args[0]));
    if (p && rp) p->SetPipeline(*rp);
    return Host::getUndefined();
}
WGPU_OP(renderBundle_setBindGroup, "renderBundle.setBindGroup") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    uint32_t index = Host::getUint(args[0]);
    auto* bg = g_state.bindGroups.get(toHandle(args[1]));
    std::vector<uint32_t> dyn;
    if (argc > 2 && Host::isArray(args[2])) {
        unsigned n = arrayLen(args[2]);
        for (unsigned i = 0; i < n; ++i) dyn.push_back(Host::getUint(arrayAt(args[2], i)));
    }
    if (bg) p->SetBindGroup(index, *bg, dyn.size(), dyn.empty() ? nullptr : dyn.data());
    return Host::getUndefined();
}
WGPU_OP(renderBundle_setVertexBuffer, "renderBundle.setVertexBuffer") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    uint32_t slot = Host::getUint(args[0]);
    auto* b = (argc > 1 && !Host::isNull(args[1])) ? g_state.buffers.get(toHandle(args[1])) : nullptr;
    uint64_t offset = (argc > 2 && !Host::isUndefined(args[2])) ? (uint64_t)Host::getDouble(args[2], 0) : 0;
    uint64_t size = (argc > 3 && !Host::isUndefined(args[3])) ? (uint64_t)Host::getDouble(args[3], 0) : WGPU_WHOLE_SIZE;
    if (b) p->SetVertexBuffer(slot, *b, offset, size);
    return Host::getUndefined();
}
WGPU_OP(renderBundle_setIndexBuffer, "renderBundle.setIndexBuffer") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    auto* b = g_state.buffers.get(toHandle(args[0]));
    if (!b) return Host::getUndefined();
    wgpu::IndexFormat fmt = wgpu_enums::indexFormat(Host::toUtf8(args[1]));
    uint64_t offset = (argc > 2 && !Host::isUndefined(args[2])) ? (uint64_t)Host::getDouble(args[2], 0) : 0;
    uint64_t size = (argc > 3 && !Host::isUndefined(args[3])) ? (uint64_t)Host::getDouble(args[3], 0) : WGPU_WHOLE_SIZE;
    p->SetIndexBuffer(*b, fmt, offset, size);
    return Host::getUndefined();
}
WGPU_OP(renderBundle_draw, "renderBundle.draw") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    p->Draw(Host::getUint(args[0]),
            argc > 1 ? Host::getUint(args[1], 1) : 1,
            argc > 2 ? Host::getUint(args[2], 0) : 0,
            argc > 3 ? Host::getUint(args[3], 0) : 0);
    return Host::getUndefined();
}
WGPU_OP(renderBundle_drawIndexed, "renderBundle.drawIndexed") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    p->DrawIndexed(Host::getUint(args[0]),
                   argc > 1 ? Host::getUint(args[1], 1) : 1,
                   argc > 2 ? Host::getUint(args[2], 0) : 0,
                   argc > 3 ? Host::getInt(args[3], 0) : 0,
                   argc > 4 ? Host::getUint(args[4], 0) : 0);
    return Host::getUndefined();
}
WGPU_OP(renderBundle_drawIndirect, "renderBundle.drawIndirect") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    auto* b = g_state.buffers.get(toHandle(args[0]));
    uint64_t off = (uint64_t)Host::getDouble(args[1], 0);
    if (b) p->DrawIndirect(*b, off);
    return Host::getUndefined();
}
WGPU_OP(renderBundle_drawIndexedIndirect, "renderBundle.drawIndexedIndirect") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    auto* b = g_state.buffers.get(toHandle(args[0]));
    uint64_t off = (uint64_t)Host::getDouble(args[1], 0);
    if (b) p->DrawIndexedIndirect(*b, off);
    return Host::getUndefined();
}
WGPU_OP(renderBundle_pushDebugGroup, "renderBundle.pushDebugGroup") { return Host::getUndefined(); }
WGPU_OP(renderBundle_popDebugGroup, "renderBundle.popDebugGroup") { return Host::getUndefined(); }
WGPU_OP(renderBundle_insertDebugMarker, "renderBundle.insertDebugMarker") { return Host::getUndefined(); }
WGPU_OP(renderBundle_finish, "renderBundle.finish") {
    auto* p = g_state.renderBundleEncoders.get(toHandle(self));
    if (!p) return Host::getUndefined();
    wgpu::RenderBundleDescriptor d{};
    std::string label = (argc > 0) ? propStr(args[0], "label") : std::string();
    if (!label.empty()) d.label = label.c_str();
    wgpu::RenderBundle b = p->Finish(&d);
    return wrap("GPURenderBundle", g_state.renderBundles.add(std::move(b)));
}

// =============================================================================
// GPUPipelines
// =============================================================================
WGPU_OP(renderPipeline_getBindGroupLayout, "renderPipeline.getBindGroupLayout") {
    auto* p = g_state.renderPipelines.get(toHandle(self));
    if (!p) return Host::getUndefined();
    uint32_t idx = Host::getUint(args[0]);
    wgpu::BindGroupLayout l = p->GetBindGroupLayout(idx);
    return wrap("GPUBindGroupLayout", g_state.bindGroupLayouts.add(std::move(l)));
}
WGPU_OP(computePipeline_getBindGroupLayout, "computePipeline.getBindGroupLayout") {
    auto* p = g_state.computePipelines.get(toHandle(self));
    if (!p) return Host::getUndefined();
    uint32_t idx = Host::getUint(args[0]);
    wgpu::BindGroupLayout l = p->GetBindGroupLayout(idx);
    return wrap("GPUBindGroupLayout", g_state.bindGroupLayouts.add(std::move(l)));
}

// =============================================================================
// GPUCanvasContext
// =============================================================================
WGPU_OP(canvasContext_configure, "canvasContext.configure") {
    JsValueRef desc = args[0];
    if (!desc) return Host::getUndefined();
    wgpu::Device* d = g_state.devices.get(toHandle(propAny(desc, "device")));
    if (!d) { std::fprintf(stderr, "[wgpu] canvasContext.configure: invalid device\n"); return Host::getUndefined(); }
    std::string fmt = propStr(desc, "format");
    wgpu::TextureFormat f = wgpu_enums::textureFormat(fmt);
    g_state.surfaceFormat = f;
    wgpu::SurfaceConfiguration cfg{};
    cfg.device = *d;
    cfg.format = f;
    cfg.usage = wgpu::TextureUsage(
        propUint(desc, "usage", (uint32_t)wgpu::TextureUsage::RenderAttachment)
        | (uint32_t)wgpu::TextureUsage::CopySrc);   // force CopySrc for screenshots
    int wpx = g_state.width, hpx = g_state.height;
    cfg.width = (uint32_t)(wpx > 1 ? wpx : 1);
    cfg.height = (uint32_t)(hpx > 1 ? hpx : 1);
    // alphaMode
    std::string am = propStr(desc, "alphaMode");
#if defined(__ANDROID__)
    // Most Android Vulkan surfaces (Mali, Adreno) don't support
    // CompositeAlphaMode::Opaque on the surface level — they only accept
    // Premultiplied or Inherit. Use Auto so Dawn picks the first supported.
    cfg.alphaMode = (am == "premultiplied")
        ? wgpu::CompositeAlphaMode::Premultiplied
        : wgpu::CompositeAlphaMode::Auto;
#else
    if (am == "premultiplied") cfg.alphaMode = wgpu::CompositeAlphaMode::Premultiplied;
    else cfg.alphaMode = wgpu::CompositeAlphaMode::Opaque;
#endif
    g_state.surface.Configure(&cfg);
    g_state.surfaceConfigured = true;
    return Host::getUndefined();
}
WGPU_OP(canvasContext_unconfigure, "canvasContext.unconfigure") {
    if (g_state.surfaceConfigured) {
        g_state.surface.Unconfigure();
        g_state.surfaceConfigured = false;
    }
    return Host::getUndefined();
}
WGPU_OP(canvasContext_getCurrentTexture, "canvasContext.getCurrentTexture") {
    wgpu::SurfaceTexture st;
    g_state.surface.GetCurrentTexture(&st);
    if (!st.texture) { std::fprintf(stderr, "[wgpu] getCurrentTexture: null\n"); return Host::getUndefined(); }
    g_state.currentTextureAcquired = true;
    uint32_t th = g_state.textures.add(std::move(st.texture));
    g_state.lastBackbufferHandle = th;     // remember for screenshot capture
    JsValueRef obj = wrap("GPUTexture", th);
    Host::setProperty(obj, "width", Host::fromUint(g_state.width));
    Host::setProperty(obj, "height", Host::fromUint(g_state.height));
    Host::setProperty(obj, "depthOrArrayLayers", Host::fromUint(1));
    Host::setProperty(obj, "mipLevelCount", Host::fromUint(1));
    Host::setProperty(obj, "sampleCount", Host::fromUint(1));
    Host::setProperty(obj, "format", Host::fromUtf8(wgpu_enums::textureFormatStr(g_state.surfaceFormat)));
    Host::setProperty(obj, "usage", Host::fromUint((uint32_t)wgpu::TextureUsage::RenderAttachment));
    return obj;
}

// =============================================================================
// Surface present (called by JS shim after each rAF)
// =============================================================================
} // close anonymous namespace
namespace screenshot { bool captureNow(const std::string& path); }
namespace {

WGPU_OP(present, "present") {
    if (g_state.surfaceConfigured && g_state.currentTextureAcquired) {
        // If a screenshot was requested, perform GPU readback BEFORE present
        // so the surface texture is still valid.
        if (g_state.captureRequested) {
            wgpu_bridge::screenshot::captureNow(g_state.capturePath);
            g_state.captureRequested = false;
        }
        g_state.surface.Present();
    }
    g_state.currentTextureAcquired = false;
    g_state.instance.ProcessEvents();
    return Host::getUndefined();
}

// =============================================================================
// Top-level dispatch entry point
// =============================================================================
JsValueRef CHAKRA_CALLBACK nativeWgpu(JsValueRef /*callee*/, bool /*isCtor*/, JsValueRef* args, unsigned short argc, void*) {
    if (argc < 2) return Host::getUndefined();
    std::string op = Host::toUtf8(args[1]);
    auto it = opTable().find(op);
    if (it == opTable().end()) {
        std::fprintf(stderr, "[wgpu] UNIMPLEMENTED op: %s\n", op.c_str());
        return Host::getUndefined();
    }
    JsValueRef self = (argc > 2) ? args[2] : Host::getUndefined();
    return it->second(self, (argc > 3) ? &args[3] : nullptr, (unsigned short)(argc > 3 ? argc - 3 : 0));
}

} // namespace

void install(cx::Host& host, wgpu::Instance instance, wgpu::Surface surface, void* nativeWindow, int width, int height) {
    g_state.instance = std::move(instance);
    g_state.surface = std::move(surface);
    g_state.nativeWindow = nativeWindow;
    g_state.width = width;
    g_state.height = height;
    // Pick a default preferred format. Most Vulkan-only surfaces (Android
    // Mali, etc.) only expose RGBA8Unorm; Windows / macOS surfaces also
    // accept BGRA8Unorm and the cross-platform code paths assume that.
#if defined(__ANDROID__)
    g_state.surfaceFormat = wgpu::TextureFormat::RGBA8Unorm;
#else
    g_state.surfaceFormat = wgpu::TextureFormat::BGRA8Unorm;
#endif

    JsValueRef g = Host::globalObject();
    Host::setFunction(g, "__wgpu", nativeWgpu);
}

void tick() {
    g_state.instance.ProcessEvents();
}

void processEvents() { g_state.instance.ProcessEvents(); }

void onResize(int widthPx, int heightPx) {
    if (widthPx > 0 && heightPx > 0) {
        g_state.width = widthPx;
        g_state.height = heightPx;
    }
}

void requestScreenshot(const std::string& outPath) {
    g_state.captureRequested = true;
    g_state.capturePath      = outPath;
}

} // namespace wgpu_bridge

// =============================================================================
// Screenshot implementation: GPU readback of the current surface texture into
// a CPU buffer, then a PNG written via WIC.
// =============================================================================
#if defined(_WIN32)
#include <wincodec.h>
#include <wrl/client.h>
using Microsoft::WRL::ComPtr;

namespace wgpu_bridge { namespace screenshot {

static bool writePngBGRA8(const std::string& path, uint32_t w, uint32_t h,
                          const uint8_t* pixels, uint32_t rowStride);

bool captureNow(const std::string& path) {
    if (!g_state.surfaceConfigured) return false;
    uint32_t h = g_state.lastBackbufferHandle;
    wgpu::Texture* texPtr = g_state.textures.get(h);
    if (!texPtr || !*texPtr) {
        std::fprintf(stderr, "[screenshot] no backbuffer texture to copy from\n");
        return false;
    }
    wgpu::Texture tex = *texPtr;

    // Find an active device — any one is fine; we use the first registered.
    wgpu::Device device;
    for (auto& kv : g_state.devices.map) { device = kv.second; break; }
    if (!device) {
        std::fprintf(stderr, "[screenshot] no device available\n");
        return false;
    }

    uint32_t width  = g_state.width;
    uint32_t height = g_state.height;
    // WebGPU mandates 256-byte aligned rows in CopyTextureToBuffer.
    uint32_t bytesPerPixel = 4;  // BGRA8Unorm / RGBA8Unorm
    uint32_t paddedRow = ((width * bytesPerPixel + 255) / 256) * 256;
    uint64_t bufferSize = (uint64_t)paddedRow * height;

    wgpu::BufferDescriptor bd{};
    bd.size  = bufferSize;
    bd.usage = wgpu::BufferUsage::MapRead | wgpu::BufferUsage::CopyDst;
    wgpu::Buffer staging = device.CreateBuffer(&bd);
    if (!staging) {
        std::fprintf(stderr, "[screenshot] CreateBuffer failed (%llu bytes)\n", (unsigned long long)bufferSize);
        return false;
    }

    wgpu::CommandEncoder enc = device.CreateCommandEncoder();
    wgpu::TexelCopyTextureInfo src{};
    src.texture = tex;
    src.mipLevel = 0;
    src.origin = {0, 0, 0};
    src.aspect = wgpu::TextureAspect::All;
    wgpu::TexelCopyBufferInfo dst{};
    dst.buffer = staging;
    dst.layout.offset = 0;
    dst.layout.bytesPerRow = paddedRow;
    dst.layout.rowsPerImage = height;
    wgpu::Extent3D ext{width, height, 1};
    enc.CopyTextureToBuffer(&src, &dst, &ext);
    wgpu::CommandBuffer cb = enc.Finish();
    device.GetQueue().Submit(1, &cb);

    // Map the buffer synchronously via instance.WaitAny on the future.
    bool ready = false;
    wgpu::Future fut = staging.MapAsync(
        wgpu::MapMode::Read, 0, bufferSize, wgpu::CallbackMode::WaitAnyOnly,
        [&ready](wgpu::MapAsyncStatus, const char*) { ready = true; });

    wgpu::FutureWaitInfo wi{};
    wi.future = fut;
    g_state.instance.WaitAny(1, &wi, /*timeoutNs*/ 5'000'000'000ull);
    if (!ready) {
        std::fprintf(stderr, "[screenshot] map async timed out\n");
        return false;
    }

    const uint8_t* pixels = static_cast<const uint8_t*>(staging.GetConstMappedRange(0, bufferSize));
    if (!pixels) {
        std::fprintf(stderr, "[screenshot] GetConstMappedRange returned null\n");
        return false;
    }
    bool ok = writePngBGRA8(path, width, height, pixels, paddedRow);
    staging.Unmap();
    if (ok) std::fprintf(stderr, "[screenshot] wrote %s (%ux%u)\n", path.c_str(), width, height);
    return ok;
}

// Write a BGRA8Unorm or RGBA8Unorm pixel buffer as a PNG.
// We treat the data as BGRA (Dawn's default surface format on Windows D3D12)
// and let WIC swizzle on encode.
static bool writePngBGRA8(const std::string& path, uint32_t w, uint32_t h,
                          const uint8_t* pixels, uint32_t rowStride) {
    ComPtr<IWICImagingFactory> factory;
    HRESULT hr = CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER,
                                  __uuidof(IWICImagingFactory), &factory);
    if (FAILED(hr)) { std::fprintf(stderr, "[screenshot] CoCreateInstance(WIC) hr=0x%lx\n", hr); return false; }

    // Build wide path
    std::wstring wpath; wpath.resize(path.size() + 1);
    int n = MultiByteToWideChar(CP_UTF8, 0, path.c_str(), -1, &wpath[0], (int)wpath.size());
    if (n > 0) wpath.resize(n - 1);

    ComPtr<IWICStream> stream;
    factory->CreateStream(&stream);
    if (FAILED(stream->InitializeFromFilename(wpath.c_str(), GENERIC_WRITE))) {
        std::fprintf(stderr, "[screenshot] InitializeFromFilename failed\n"); return false;
    }
    ComPtr<IWICBitmapEncoder> encoder;
    factory->CreateEncoder(GUID_ContainerFormatPng, nullptr, &encoder);
    encoder->Initialize(stream.Get(), WICBitmapEncoderNoCache);

    ComPtr<IWICBitmapFrameEncode> frame;
    ComPtr<IPropertyBag2> props;
    encoder->CreateNewFrame(&frame, &props);
    frame->Initialize(props.Get());
    frame->SetSize(w, h);
    WICPixelFormatGUID pf = GUID_WICPixelFormat32bppBGRA;
    frame->SetPixelFormat(&pf);

    // Tight-pack rows (no padding) into a temporary buffer for WritePixels.
    std::vector<uint8_t> tight((size_t)w * 4 * h);
    for (uint32_t y = 0; y < h; ++y) {
        std::memcpy(tight.data() + (size_t)y * w * 4,
                    pixels + (size_t)y * rowStride,
                    (size_t)w * 4);
    }
    if (FAILED(frame->WritePixels(h, w * 4, (UINT)tight.size(), tight.data()))) {
        std::fprintf(stderr, "[screenshot] WritePixels failed\n"); return false;
    }
    frame->Commit();
    encoder->Commit();
    return true;
}

}} // namespaces

#else // !_WIN32 — screenshot not implemented on non-Windows platforms.

namespace wgpu_bridge { namespace screenshot {
bool captureNow(const std::string& path) {
    std::fprintf(stderr, "[screenshot] not implemented on this platform (%s)\n", path.c_str());
    return false;
}
}} // namespaces

#endif // _WIN32
