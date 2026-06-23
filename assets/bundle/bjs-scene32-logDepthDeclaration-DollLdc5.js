import{S as e}from"./bjs-scene32.js";const a="logDepthDeclaration",r=`#ifdef LOGARITHMICDEPTH
uniform float logarithmicDepthConstant;varying float vFragmentDepth;
#endif
`;e.IncludesShadersStore[a]||(e.IncludesShadersStore[a]=r);