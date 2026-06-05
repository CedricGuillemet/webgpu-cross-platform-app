#pragma once

#include <webgpu/webgpu_cpp.h>

#include <string>
#include <string_view>

// Maps WebGPU spec enum strings to wgpu::* enum values.
namespace wgpu_enums {

wgpu::TextureFormat textureFormat(std::string_view s);
const char* textureFormatStr(wgpu::TextureFormat f);

wgpu::VertexFormat vertexFormat(std::string_view s);
wgpu::IndexFormat indexFormat(std::string_view s);
wgpu::PrimitiveTopology primitiveTopology(std::string_view s);
wgpu::CullMode cullMode(std::string_view s);
wgpu::FrontFace frontFace(std::string_view s);
wgpu::CompareFunction compareFunction(std::string_view s);
wgpu::StencilOperation stencilOperation(std::string_view s);
wgpu::BlendFactor blendFactor(std::string_view s);
wgpu::BlendOperation blendOperation(std::string_view s);
wgpu::AddressMode addressMode(std::string_view s);
wgpu::FilterMode filterMode(std::string_view s);
wgpu::MipmapFilterMode mipmapFilterMode(std::string_view s);
wgpu::TextureViewDimension textureViewDimension(std::string_view s);
wgpu::TextureDimension textureDimension(std::string_view s);
wgpu::TextureSampleType textureSampleType(std::string_view s);
wgpu::StorageTextureAccess storageTextureAccess(std::string_view s);
wgpu::SamplerBindingType samplerBindingType(std::string_view s);
wgpu::BufferBindingType bufferBindingType(std::string_view s);
wgpu::LoadOp loadOp(std::string_view s);
wgpu::StoreOp storeOp(std::string_view s);
wgpu::VertexStepMode vertexStepMode(std::string_view s);
wgpu::FeatureName featureName(std::string_view s);
wgpu::QueryType queryType(std::string_view s);
wgpu::ErrorFilter errorFilter(std::string_view s);
wgpu::PowerPreference powerPreference(std::string_view s);

} // namespace wgpu_enums
