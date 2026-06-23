import{S as e}from"./bjs-scene72.js";const a="shadowMapFragmentSoftTransparentShadow",r=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`;e.IncludesShadersStoreWGSL[a]||(e.IncludesShadersStoreWGSL[a]=r);const t={name:a,shader:r};export{t as shadowMapFragmentSoftTransparentShadowWGSL};