import{S as i}from"./bjs-scene24.js";import"./bjs-scene24-hdrFilteringFunctions-CftQFBCz.js";import"./bjs-scene24-pbrBRDFFunctions-BGxUkGXt.js";const e="iblDominantDirectionPixelShader",r=`precision highp sampler2D;precision highp samplerCube;
#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
varying vec2 vUV;uniform sampler2D icdfSampler;void main(void) {vec3 lightDir=vec3(0.0,0.0,0.0);for(uint i=0u; i<NUM_SAMPLES; ++i)
{vec2 Xi=hammersley(i,NUM_SAMPLES);vec2 T;T.x=texture2D(icdfSampler,vec2(Xi.x,0.0)).x;T.y=texture2D(icdfSampler,vec2(T.x,Xi.y)).y;vec3 Ls=uv_to_normal(vec2(1.0-fract(T.x+0.25),T.y));lightDir+=Ls;}
lightDir/=float(NUM_SAMPLES);gl_FragColor=vec4(lightDir,1.0);}`;i.ShadersStore[e]||(i.ShadersStore[e]=r);const c={name:e,shader:r};export{c as iblDominantDirectionPixelShader};