import{S as e}from"./bjs-scene59.js";const r="logDepthFragment",t=`#ifdef LOGARITHMICDEPTH
gl_FragDepthEXT=log2(vFragmentDepth)*logarithmicDepthConstant*0.5;
#endif
`;e.IncludesShadersStore[r]||(e.IncludesShadersStore[r]=t);