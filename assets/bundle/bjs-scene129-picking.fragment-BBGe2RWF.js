import{S as i}from"./bjs-scene129.js";const e="pickingPixelShader",r=`#if defined(INSTANCES)
flat varying vMeshID: f32;
#else
uniform meshID: f32;
#endif
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var id: i32;
#if defined(INSTANCES)
id=i32(input.vMeshID);
#else
id=i32(uniforms.meshID);
#endif
var color=vec3f(
f32((id>>16) & 0xFF),
f32((id>>8) & 0xFF),
f32(id & 0xFF),
)/255.0;fragmentOutputs.color=vec4f(color,1.0);}
`;i.ShadersStoreWGSL[e]||(i.ShadersStoreWGSL[e]=r);const t={name:e,shader:r};export{t as pickingPixelShaderWGSL};