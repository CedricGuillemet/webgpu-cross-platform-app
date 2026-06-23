import{S as e}from"./bjs-scene171.js";const r="fogVertex",o=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;e.IncludesShadersStore[r]||(e.IncludesShadersStore[r]=o);