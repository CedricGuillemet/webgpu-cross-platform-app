import{S as r}from"./bjs-scene144.js";import"./bjs-scene144-helperFunctions-CXElQx3i.js";const e="extractHighlightsPixelShader",o=`#include<helperFunctions>
varying vec2 vUV;uniform sampler2D textureSampler;uniform float threshold;uniform float exposure;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=texture2D(textureSampler,vUV);float luma=dot(LuminanceEncodeApprox,gl_FragColor.rgb*exposure);gl_FragColor.rgb=step(threshold,luma)*gl_FragColor.rgb;}`;r.ShadersStore[e]||(r.ShadersStore[e]=o);const l={name:e,shader:o};export{l as extractHighlightsPixelShader};