import{S as e}from"./bjs-scene114.js";const o="sceneUboDeclaration",t=`layout(std140,column_major) uniform;uniform Scene {mat4 viewProjection;
#ifdef MULTIVIEW
mat4 viewProjectionR;
#endif 
mat4 view;mat4 projection;vec4 vEyePosition;mat4 inverseProjection;};
`;e.IncludesShadersStore[o]||(e.IncludesShadersStore[o]=t);const n="meshUboDeclaration",i=`#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;e.IncludesShadersStore[n]||(e.IncludesShadersStore[n]=i);const a="mainUVVaryingDeclaration",s=`#ifdef MAINUV{X}
varying vec2 vMainUV{X};
#endif
`;e.IncludesShadersStore[a]||(e.IncludesShadersStore[a]=s);const r="logDepthDeclaration",d=`#ifdef LOGARITHMICDEPTH
uniform float logarithmicDepthConstant;varying float vFragmentDepth;
#endif
`;e.IncludesShadersStore[r]||(e.IncludesShadersStore[r]=d);