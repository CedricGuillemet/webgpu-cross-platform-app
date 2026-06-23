import{S as e}from"./bjs-scene112.js";const r="fogVertexDeclaration",o=`#ifdef FOG
varying vec3 vFogDistance;
#endif
`;e.IncludesShadersStore[r]||(e.IncludesShadersStore[r]=o);const a="fogVertex",n=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;e.IncludesShadersStore[a]||(e.IncludesShadersStore[a]=n);