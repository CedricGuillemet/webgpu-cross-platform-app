#include "wgpu_enums.h"

#include <unordered_map>

namespace wgpu_enums {

#define MAP(name, table_entries)                                          \
    static const std::unordered_map<std::string, decltype(table_entries[0].second)>* name##Map() { \
        static const auto* m = []() {                                     \
            auto* mp = new std::unordered_map<std::string, decltype(table_entries[0].second)>(); \
            for (auto& e : table_entries) mp->emplace(e.first, e.second); \
            return mp;                                                    \
        }();                                                              \
        return m;                                                         \
    }

namespace {

template <typename E>
E lookup(const std::unordered_map<std::string, E>& m, std::string_view s, E fallback) {
    auto it = m.find(std::string(s));
    return it == m.end() ? fallback : it->second;
}

} // namespace

wgpu::TextureFormat textureFormat(std::string_view s) {
    using F = wgpu::TextureFormat;
    static const std::unordered_map<std::string, F> M = {
        {"r8unorm", F::R8Unorm}, {"r8snorm", F::R8Snorm},
        {"r8uint", F::R8Uint}, {"r8sint", F::R8Sint},
        {"r16uint", F::R16Uint}, {"r16sint", F::R16Sint}, {"r16float", F::R16Float},
        {"rg8unorm", F::RG8Unorm}, {"rg8snorm", F::RG8Snorm},
        {"rg8uint", F::RG8Uint}, {"rg8sint", F::RG8Sint},
        {"r32uint", F::R32Uint}, {"r32sint", F::R32Sint}, {"r32float", F::R32Float},
        {"rg16uint", F::RG16Uint}, {"rg16sint", F::RG16Sint}, {"rg16float", F::RG16Float},
        {"rgba8unorm", F::RGBA8Unorm}, {"rgba8unorm-srgb", F::RGBA8UnormSrgb},
        {"rgba8snorm", F::RGBA8Snorm},
        {"rgba8uint", F::RGBA8Uint}, {"rgba8sint", F::RGBA8Sint},
        {"bgra8unorm", F::BGRA8Unorm}, {"bgra8unorm-srgb", F::BGRA8UnormSrgb},
        {"rgb9e5ufloat", F::RGB9E5Ufloat},
        {"rgb10a2uint", F::RGB10A2Uint}, {"rgb10a2unorm", F::RGB10A2Unorm},
        {"rg11b10ufloat", F::RG11B10Ufloat},
        {"rg32uint", F::RG32Uint}, {"rg32sint", F::RG32Sint}, {"rg32float", F::RG32Float},
        {"rgba16uint", F::RGBA16Uint}, {"rgba16sint", F::RGBA16Sint}, {"rgba16float", F::RGBA16Float},
        {"rgba32uint", F::RGBA32Uint}, {"rgba32sint", F::RGBA32Sint}, {"rgba32float", F::RGBA32Float},
        {"stencil8", F::Stencil8},
        {"depth16unorm", F::Depth16Unorm},
        {"depth24plus", F::Depth24Plus}, {"depth24plus-stencil8", F::Depth24PlusStencil8},
        {"depth32float", F::Depth32Float}, {"depth32float-stencil8", F::Depth32FloatStencil8},
        {"bc1-rgba-unorm", F::BC1RGBAUnorm}, {"bc1-rgba-unorm-srgb", F::BC1RGBAUnormSrgb},
        {"bc2-rgba-unorm", F::BC2RGBAUnorm}, {"bc2-rgba-unorm-srgb", F::BC2RGBAUnormSrgb},
        {"bc3-rgba-unorm", F::BC3RGBAUnorm}, {"bc3-rgba-unorm-srgb", F::BC3RGBAUnormSrgb},
        {"bc4-r-unorm", F::BC4RUnorm}, {"bc4-r-snorm", F::BC4RSnorm},
        {"bc5-rg-unorm", F::BC5RGUnorm}, {"bc5-rg-snorm", F::BC5RGSnorm},
        {"bc6h-rgb-ufloat", F::BC6HRGBUfloat}, {"bc6h-rgb-float", F::BC6HRGBFloat},
        {"bc7-rgba-unorm", F::BC7RGBAUnorm}, {"bc7-rgba-unorm-srgb", F::BC7RGBAUnormSrgb},
    };
    return lookup(M, s, F::Undefined);
}

const char* textureFormatStr(wgpu::TextureFormat f) {
    using F = wgpu::TextureFormat;
    switch (f) {
        case F::R8Unorm: return "r8unorm";
        case F::RGBA8Unorm: return "rgba8unorm";
        case F::RGBA8UnormSrgb: return "rgba8unorm-srgb";
        case F::BGRA8Unorm: return "bgra8unorm";
        case F::BGRA8UnormSrgb: return "bgra8unorm-srgb";
        case F::Depth24Plus: return "depth24plus";
        case F::Depth24PlusStencil8: return "depth24plus-stencil8";
        case F::Depth32Float: return "depth32float";
        default: return "unknown";
    }
}

wgpu::VertexFormat vertexFormat(std::string_view s) {
    using F = wgpu::VertexFormat;
    static const std::unordered_map<std::string, F> M = {
        {"uint8x2", F::Uint8x2}, {"uint8x4", F::Uint8x4},
        {"sint8x2", F::Sint8x2}, {"sint8x4", F::Sint8x4},
        {"unorm8x2", F::Unorm8x2}, {"unorm8x4", F::Unorm8x4},
        {"snorm8x2", F::Snorm8x2}, {"snorm8x4", F::Snorm8x4},
        {"uint16x2", F::Uint16x2}, {"uint16x4", F::Uint16x4},
        {"sint16x2", F::Sint16x2}, {"sint16x4", F::Sint16x4},
        {"unorm16x2", F::Unorm16x2}, {"unorm16x4", F::Unorm16x4},
        {"snorm16x2", F::Snorm16x2}, {"snorm16x4", F::Snorm16x4},
        {"float16x2", F::Float16x2}, {"float16x4", F::Float16x4},
        {"float32", F::Float32}, {"float32x2", F::Float32x2},
        {"float32x3", F::Float32x3}, {"float32x4", F::Float32x4},
        {"uint32", F::Uint32}, {"uint32x2", F::Uint32x2},
        {"uint32x3", F::Uint32x3}, {"uint32x4", F::Uint32x4},
        {"sint32", F::Sint32}, {"sint32x2", F::Sint32x2},
        {"sint32x3", F::Sint32x3}, {"sint32x4", F::Sint32x4},
    };
    return lookup(M, s, F::Float32);
}

wgpu::IndexFormat indexFormat(std::string_view s) {
    if (s == "uint16") return wgpu::IndexFormat::Uint16;
    if (s == "uint32") return wgpu::IndexFormat::Uint32;
    return wgpu::IndexFormat::Undefined;
}

wgpu::PrimitiveTopology primitiveTopology(std::string_view s) {
    using T = wgpu::PrimitiveTopology;
    if (s == "point-list") return T::PointList;
    if (s == "line-list") return T::LineList;
    if (s == "line-strip") return T::LineStrip;
    if (s == "triangle-list") return T::TriangleList;
    if (s == "triangle-strip") return T::TriangleStrip;
    return T::TriangleList;
}

wgpu::CullMode cullMode(std::string_view s) {
    if (s == "none") return wgpu::CullMode::None;
    if (s == "front") return wgpu::CullMode::Front;
    if (s == "back") return wgpu::CullMode::Back;
    return wgpu::CullMode::None;
}

wgpu::FrontFace frontFace(std::string_view s) {
    if (s == "cw") return wgpu::FrontFace::CW;
    if (s == "ccw") return wgpu::FrontFace::CCW;
    return wgpu::FrontFace::CCW;
}

wgpu::CompareFunction compareFunction(std::string_view s) {
    using C = wgpu::CompareFunction;
    if (s == "never") return C::Never;
    if (s == "less") return C::Less;
    if (s == "equal") return C::Equal;
    if (s == "less-equal") return C::LessEqual;
    if (s == "greater") return C::Greater;
    if (s == "not-equal") return C::NotEqual;
    if (s == "greater-equal") return C::GreaterEqual;
    if (s == "always") return C::Always;
    return C::Undefined;
}

wgpu::StencilOperation stencilOperation(std::string_view s) {
    using O = wgpu::StencilOperation;
    if (s == "keep") return O::Keep;
    if (s == "zero") return O::Zero;
    if (s == "replace") return O::Replace;
    if (s == "invert") return O::Invert;
    if (s == "increment-clamp") return O::IncrementClamp;
    if (s == "decrement-clamp") return O::DecrementClamp;
    if (s == "increment-wrap") return O::IncrementWrap;
    if (s == "decrement-wrap") return O::DecrementWrap;
    return O::Keep;
}

wgpu::BlendFactor blendFactor(std::string_view s) {
    using B = wgpu::BlendFactor;
    if (s == "zero") return B::Zero;
    if (s == "one") return B::One;
    if (s == "src") return B::Src;
    if (s == "one-minus-src") return B::OneMinusSrc;
    if (s == "src-alpha") return B::SrcAlpha;
    if (s == "one-minus-src-alpha") return B::OneMinusSrcAlpha;
    if (s == "dst") return B::Dst;
    if (s == "one-minus-dst") return B::OneMinusDst;
    if (s == "dst-alpha") return B::DstAlpha;
    if (s == "one-minus-dst-alpha") return B::OneMinusDstAlpha;
    if (s == "src-alpha-saturated") return B::SrcAlphaSaturated;
    if (s == "constant") return B::Constant;
    if (s == "one-minus-constant") return B::OneMinusConstant;
    return B::One;
}

wgpu::BlendOperation blendOperation(std::string_view s) {
    using O = wgpu::BlendOperation;
    if (s == "add") return O::Add;
    if (s == "subtract") return O::Subtract;
    if (s == "reverse-subtract") return O::ReverseSubtract;
    if (s == "min") return O::Min;
    if (s == "max") return O::Max;
    return O::Add;
}

wgpu::AddressMode addressMode(std::string_view s) {
    if (s == "clamp-to-edge") return wgpu::AddressMode::ClampToEdge;
    if (s == "repeat") return wgpu::AddressMode::Repeat;
    if (s == "mirror-repeat") return wgpu::AddressMode::MirrorRepeat;
    return wgpu::AddressMode::ClampToEdge;
}

wgpu::FilterMode filterMode(std::string_view s) {
    if (s == "nearest") return wgpu::FilterMode::Nearest;
    if (s == "linear") return wgpu::FilterMode::Linear;
    return wgpu::FilterMode::Nearest;
}

wgpu::MipmapFilterMode mipmapFilterMode(std::string_view s) {
    if (s == "nearest") return wgpu::MipmapFilterMode::Nearest;
    if (s == "linear") return wgpu::MipmapFilterMode::Linear;
    return wgpu::MipmapFilterMode::Nearest;
}

wgpu::TextureViewDimension textureViewDimension(std::string_view s) {
    using D = wgpu::TextureViewDimension;
    if (s == "1d") return D::e1D;
    if (s == "2d") return D::e2D;
    if (s == "2d-array") return D::e2DArray;
    if (s == "cube") return D::Cube;
    if (s == "cube-array") return D::CubeArray;
    if (s == "3d") return D::e3D;
    return D::Undefined;
}

wgpu::TextureDimension textureDimension(std::string_view s) {
    using D = wgpu::TextureDimension;
    if (s == "1d") return D::e1D;
    if (s == "2d") return D::e2D;
    if (s == "3d") return D::e3D;
    return D::e2D;
}

wgpu::TextureSampleType textureSampleType(std::string_view s) {
    using T = wgpu::TextureSampleType;
    if (s == "float") return T::Float;
    if (s == "unfilterable-float") return T::UnfilterableFloat;
    if (s == "depth") return T::Depth;
    if (s == "sint") return T::Sint;
    if (s == "uint") return T::Uint;
    return T::Float;
}

wgpu::StorageTextureAccess storageTextureAccess(std::string_view s) {
    using A = wgpu::StorageTextureAccess;
    if (s == "write-only") return A::WriteOnly;
    if (s == "read-only") return A::ReadOnly;
    if (s == "read-write") return A::ReadWrite;
    return A::Undefined;
}

wgpu::SamplerBindingType samplerBindingType(std::string_view s) {
    using S = wgpu::SamplerBindingType;
    if (s == "filtering") return S::Filtering;
    if (s == "non-filtering") return S::NonFiltering;
    if (s == "comparison") return S::Comparison;
    return S::Filtering;
}

wgpu::BufferBindingType bufferBindingType(std::string_view s) {
    using B = wgpu::BufferBindingType;
    if (s == "uniform") return B::Uniform;
    if (s == "storage") return B::Storage;
    if (s == "read-only-storage") return B::ReadOnlyStorage;
    return B::Uniform;
}

wgpu::LoadOp loadOp(std::string_view s) {
    if (s == "load") return wgpu::LoadOp::Load;
    if (s == "clear") return wgpu::LoadOp::Clear;
    return wgpu::LoadOp::Load;
}

wgpu::StoreOp storeOp(std::string_view s) {
    if (s == "store") return wgpu::StoreOp::Store;
    if (s == "discard") return wgpu::StoreOp::Discard;
    return wgpu::StoreOp::Store;
}

wgpu::VertexStepMode vertexStepMode(std::string_view s) {
    if (s == "vertex") return wgpu::VertexStepMode::Vertex;
    if (s == "instance") return wgpu::VertexStepMode::Instance;
    return wgpu::VertexStepMode::Vertex;
}

wgpu::FeatureName featureName(std::string_view s) {
    using F = wgpu::FeatureName;
    if (s == "depth-clip-control") return F::DepthClipControl;
    if (s == "depth32float-stencil8") return F::Depth32FloatStencil8;
    if (s == "texture-compression-bc") return F::TextureCompressionBC;
    if (s == "texture-compression-etc2") return F::TextureCompressionETC2;
    if (s == "texture-compression-astc") return F::TextureCompressionASTC;
    if (s == "timestamp-query") return F::TimestampQuery;
    if (s == "indirect-first-instance") return F::IndirectFirstInstance;
    if (s == "shader-f16") return F::ShaderF16;
    if (s == "rg11b10ufloat-renderable") return F::RG11B10UfloatRenderable;
    if (s == "bgra8unorm-storage") return F::BGRA8UnormStorage;
    if (s == "float32-filterable") return F::Float32Filterable;
    if (s == "dual-source-blending") return F::DualSourceBlending;
    return F(0);
}

wgpu::QueryType queryType(std::string_view s) {
    if (s == "occlusion") return wgpu::QueryType::Occlusion;
    if (s == "timestamp") return wgpu::QueryType::Timestamp;
    return wgpu::QueryType::Occlusion;
}

wgpu::ErrorFilter errorFilter(std::string_view s) {
    if (s == "validation") return wgpu::ErrorFilter::Validation;
    if (s == "out-of-memory") return wgpu::ErrorFilter::OutOfMemory;
    if (s == "internal") return wgpu::ErrorFilter::Internal;
    return wgpu::ErrorFilter::Validation;
}

wgpu::PowerPreference powerPreference(std::string_view s) {
    if (s == "low-power") return wgpu::PowerPreference::LowPower;
    if (s == "high-performance") return wgpu::PowerPreference::HighPerformance;
    return wgpu::PowerPreference::Undefined;
}

} // namespace wgpu_enums
