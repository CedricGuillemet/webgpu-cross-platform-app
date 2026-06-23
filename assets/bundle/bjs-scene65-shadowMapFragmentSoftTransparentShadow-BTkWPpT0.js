import{S as r}from"./bjs-scene65.js";const a="shadowMapFragmentSoftTransparentShadow",e=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alpha) discard;
#endif
`;r.IncludesShadersStore[a]||(r.IncludesShadersStore[a]=e);const t={name:a,shader:e};export{t as shadowMapFragmentSoftTransparentShadow};