function ownKeys(e,r){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);r&&(o=o.filter(function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable;})),t.push.apply(t,o);}return t;}function _objectSpread(e){for(var r=1;r<arguments.length;r++){var t=null!=arguments[r]?arguments[r]:{};r%2?ownKeys(Object(t),!0).forEach(function(r){_defineProperty(e,r,t[r]);}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):ownKeys(Object(t)).forEach(function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(t,r));});}return e;}function _defineProperty(e,r,t){return(r=_toPropertyKey(r))in e?Object.defineProperty(e,r,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[r]=t,e;}function _toPropertyKey(t){var i=_toPrimitive(t,"string");return"symbol"==typeof i?i:i+"";}function _toPrimitive(t,r){if("object"!=typeof t||!t)return t;var e=t[Symbol.toPrimitive];if(void 0!==e){var i=e.call(t,r||"default");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.");}return("string"===r?String:Number)(t);}import{T as J,L as re,I as ge,R as ze,a as ne,S as B,C as Ae,_ as ie,V as w,M as k,P as Pe,b as Xe,c as Ye,d as Ze,e as Ke,B as $e,f as Ue,g as Be,h as H,i as Ve,A as we,j as je,k as oe,l as K,m as qe,n as Qe,o as Je,G as et,p as Se,q as Ie,r as xe,s as tt,t as it,u as X,v as he,w as st,x as rt,y as nt,z as at,D as ot,E as lt,F as ut,H as ft,J as ct,K as ht,N as dt,O as _t,Q as Tt,U as mt,W as pt,X as de,Y as Et,Z as Rt,$ as gt,a0 as At,a1 as St,a2 as It,a3 as xt,a4 as vt,a5 as Lt,a6 as Ct,a7 as Mt,a8 as bt,a9 as Ot,aa as Nt,ab as Ft,ac as l,ad as h,ae as D,af as P,ag as yt}from"./bjs-scene171.js";import"./bjs-scene171-clipPlaneFragment-DiL17o4B.js";import"./bjs-scene171-bumpFragment-CSsAlY5y.js";import"./bjs-scene171-helperFunctions-B7ntcoyn.js";import"./bjs-scene171-pbrIBLFunctions-BTJ5zDBA.js";import"./bjs-scene171-sceneUboDeclaration-DtOsvLb1.js";import"./bjs-scene171-pbrBRDFFunctions-RM5jaQ1c.js";import"./bjs-scene171-reflectionFunction-CwY_U55u.js";import"./bjs-scene171-clipPlaneVertex-2jmc8tKc.js";import"./bjs-scene171-bumpVertex-CwazkzV7.js";import"./bjs-scene171-harmonicsFunctions-DApJav1M.js";function Dt(p){return class extends p{constructor(){super(...arguments),this.REFLECTION=!1,this.REFLECTIONMAP_3D=!1,this.REFLECTIONMAP_SPHERICAL=!1,this.REFLECTIONMAP_PLANAR=!1,this.REFLECTIONMAP_CUBIC=!1,this.USE_LOCAL_REFLECTIONMAP_CUBIC=!1,this.REFLECTIONMAP_PROJECTION=!1,this.REFLECTIONMAP_SKYBOX=!1,this.REFLECTIONMAP_EXPLICIT=!1,this.REFLECTIONMAP_EQUIRECTANGULAR=!1,this.REFLECTIONMAP_EQUIRECTANGULAR_FIXED=!1,this.REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED=!1,this.INVERTCUBICMAP=!1,this.USESPHERICALFROMREFLECTIONMAP=!1,this.USEIRRADIANCEMAP=!1,this.USE_IRRADIANCE_DOMINANT_DIRECTION=!1,this.USESPHERICALINVERTEX=!1,this.REFLECTIONMAP_OPPOSITEZ=!1,this.LODINREFLECTIONALPHA=!1,this.GAMMAREFLECTION=!1,this.RGBDREFLECTION=!1;}};}J.prototype.restoreSingleAttachment=function(){const p=this._gl;this.bindAttachments([p.BACK]);};J.prototype.restoreSingleAttachmentForRenderTarget=function(){const p=this._gl;this.bindAttachments([p.COLOR_ATTACHMENT0]);};J.prototype.buildTextureLayout=function(p,t=!1){const s=this._gl,e=[];if(t)e.push(s.BACK);else for(let i=0;i<p.length;i++)p[i]?e.push(s["COLOR_ATTACHMENT"+i]):e.push(s.NONE);return e;};J.prototype.bindAttachments=function(p){this._gl.drawBuffers(p);};J.prototype.unBindMultiColorAttachmentFramebuffer=function(p,t=!1,s){this._currentRenderTarget=null,p.disableAutomaticMSAAResolve||this.resolveMultiFramebuffer(p),t||this.generateMipMapsMultiFramebuffer(p),s&&(p._MSAAFramebuffer&&this._bindUnboundFramebuffer(p._framebuffer),s()),this._bindUnboundFramebuffer(null);};J.prototype.createMultipleRenderTarget=function(p,t,s=!0){var _t$textureCount,_t$samples,_t$dontCreateTextures,_p$width,_p$height,_t$label;let e=!1,i=!0,n=!1,a=!1,f,S=1,L=1;const o=0,T=3,A=!1,M=5,N=3553;let I=[],C=[],_=[],m=[],F=[],y=[],g=[],c=[],Y=[],Z=!1;const U=this._createHardwareRenderTargetWrapper(!0,!1,p);t!==void 0&&(e=t.generateMipMaps===void 0?!1:t.generateMipMaps,i=t.generateDepthBuffer===void 0?!0:t.generateDepthBuffer,n=t.generateStencilBuffer===void 0?!1:t.generateStencilBuffer,a=t.generateDepthTexture===void 0?!1:t.generateDepthTexture,S=(_t$textureCount=t.textureCount)!==null&&_t$textureCount!==void 0?_t$textureCount:1,L=(_t$samples=t.samples)!==null&&_t$samples!==void 0?_t$samples:L,I=t.types||I,C=t.samplingModes||C,_=t.useSRGBBuffers||_,m=t.formats||m,F=t.targetTypes||F,y=t.faceIndex||y,g=t.layerIndex||g,c=t.layerCounts||c,Y=t.labels||Y,Z=(_t$dontCreateTextures=t.dontCreateTextures)!==null&&_t$dontCreateTextures!==void 0?_t$dontCreateTextures:!1,this.webGLVersion>1&&(t.depthTextureFormat===13||t.depthTextureFormat===17||t.depthTextureFormat===16||t.depthTextureFormat===14||t.depthTextureFormat===18)&&(f=t.depthTextureFormat)),f===void 0&&(f=n?13:14);const d=this._gl,u=this._currentFramebuffer,ee=d.createFramebuffer();this._bindUnboundFramebuffer(ee);const $=(_p$width=p.width)!==null&&_p$width!==void 0?_p$width:p,E=(_p$height=p.height)!==null&&_p$height!==void 0?_p$height:p,j=[],R=[],W=this.webGLVersion>1&&(f===13||f===17||f===18);U.label=(_t$label=t===null||t===void 0?void 0:t.label)!==null&&_t$label!==void 0?_t$label:"MultiRenderTargetWrapper",U._framebuffer=ee,U._generateDepthBuffer=a||i,U._generateStencilBuffer=a?W:n,U._depthStencilBuffer=this._setupFramebufferDepthAttachments(U._generateStencilBuffer,U._generateDepthBuffer,$,E,1,f),U._attachments=R;for(let b=0;b<S;b++){var _c$b,_Y$b;let q=C[b]||T,z=I[b]||o,te=_[b]||A;const Q=m[b]||M,G=F[b]||N,pe=(_c$b=c[b])!==null&&_c$b!==void 0?_c$b:1;(z===1&&!this._caps.textureFloatLinearFiltering||z===2&&!this._caps.textureHalfFloatLinearFiltering)&&(q=1);const Ee=this._getSamplingParameters(q,e);z===1&&!this._caps.textureFloat&&(z=0,re.Warn("Float textures are not supported. Render target forced to TEXTURETYPE_UNSIGNED_BYTE type")),te=te&&this._caps.supportSRGBBuffers&&(this.webGLVersion>1||this.isWebGPU);const Re=this.webGLVersion>1,He=d[Re?"COLOR_ATTACHMENT"+b:"COLOR_ATTACHMENT"+b+"_WEBGL"];if(R.push(He),G===-1||Z)continue;const V=new ge(this,6);j[b]=V,d.activeTexture(d["TEXTURE"+b]),d.bindTexture(G,V._hardwareTexture.underlyingResource),d.texParameteri(G,d.TEXTURE_MAG_FILTER,Ee.mag),d.texParameteri(G,d.TEXTURE_MIN_FILTER,Ee.min),d.texParameteri(G,d.TEXTURE_WRAP_S,d.CLAMP_TO_EDGE),d.texParameteri(G,d.TEXTURE_WRAP_T,d.CLAMP_TO_EDGE);const le=this._getRGBABufferInternalSizedFormat(z,Q,te),ue=this._getInternalFormat(Q),fe=this._getWebGLTextureType(z);if(Re&&(G===35866||G===32879))G===35866?V.is2DArray=!0:V.is3D=!0,V.baseDepth=V.depth=pe,d.texImage3D(G,0,le,$,E,pe,0,ue,fe,null);else if(G===34067){for(let ce=0;ce<6;ce++)d.texImage2D(d.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0,le,$,E,0,ue,fe,null);V.isCube=!0;}else d.texImage2D(d.TEXTURE_2D,0,le,$,E,0,ue,fe,null);e&&d.generateMipmap(G),this._bindTextureDirectly(G,null),V.baseWidth=$,V.baseHeight=E,V.width=$,V.height=E,V.isReady=!0,V.samples=1,V.generateMipMaps=e,V.samplingMode=q,V.type=z,V._useSRGBBuffer=te,V.format=Q,V.label=(_Y$b=Y[b])!==null&&_Y$b!==void 0?_Y$b:U.label+"-Texture"+b,this._internalTexturesCache.push(V);}if(a&&this._caps.depthTextureExtension&&!Z){const b=new ge(this,14);let q=5,z=d.DEPTH_COMPONENT16,te=d.DEPTH_COMPONENT,Q=d.UNSIGNED_SHORT,G=d.DEPTH_ATTACHMENT;this.webGLVersion<2?z=d.DEPTH_COMPONENT:f===14?(q=1,Q=d.FLOAT,z=d.DEPTH_COMPONENT32F):f===18?(q=0,Q=d.FLOAT_32_UNSIGNED_INT_24_8_REV,z=d.DEPTH32F_STENCIL8,te=d.DEPTH_STENCIL,G=d.DEPTH_STENCIL_ATTACHMENT):f===16?(q=0,Q=d.UNSIGNED_INT,z=d.DEPTH_COMPONENT24,G=d.DEPTH_ATTACHMENT):(f===13||f===17)&&(q=12,Q=d.UNSIGNED_INT_24_8,z=d.DEPTH24_STENCIL8,te=d.DEPTH_STENCIL,G=d.DEPTH_STENCIL_ATTACHMENT),this._bindTextureDirectly(d.TEXTURE_2D,b,!0),d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MAG_FILTER,d.NEAREST),d.texParameteri(d.TEXTURE_2D,d.TEXTURE_MIN_FILTER,d.NEAREST),d.texParameteri(d.TEXTURE_2D,d.TEXTURE_WRAP_S,d.CLAMP_TO_EDGE),d.texParameteri(d.TEXTURE_2D,d.TEXTURE_WRAP_T,d.CLAMP_TO_EDGE),d.texImage2D(d.TEXTURE_2D,0,z,$,E,0,te,Q,null),d.framebufferTexture2D(d.FRAMEBUFFER,G,d.TEXTURE_2D,b._hardwareTexture.underlyingResource,0),this._bindTextureDirectly(d.TEXTURE_2D,null),U._depthStencilTexture=b,U._depthStencilTextureWithStencil=W,b.baseWidth=$,b.baseHeight=E,b.width=$,b.height=E,b.isReady=!0,b.samples=1,b.generateMipMaps=e,b.samplingMode=1,b.format=f,b.type=q,b.label=U.label+"-DepthStencil",j[S]=b,this._internalTexturesCache.push(b);}if(U.setTextures(j),s&&d.drawBuffers(R),this._bindUnboundFramebuffer(u),U.setLayerAndFaceIndices(g,y),this.resetTextureCache(),!Z)this.updateMultipleRenderTargetTextureSampleCount(U,L,s);else if(L>1){const b=d.createFramebuffer();if(!b)throw new Error("Unable to create multi sampled framebuffer");U._samples=L,U._MSAAFramebuffer=b,S>0&&s&&(this._bindUnboundFramebuffer(b),d.drawBuffers(R),this._bindUnboundFramebuffer(u));}return U;};J.prototype.updateMultipleRenderTargetTextureSampleCount=function(p,t,s=!0){if(this.webGLVersion<2||!p)return 1;if(p.samples===t)return t;const e=this._gl;t=Math.min(t,this.getCaps().maxMSAASamples),p._depthStencilBuffer&&(e.deleteRenderbuffer(p._depthStencilBuffer),p._depthStencilBuffer=null),p._MSAAFramebuffer&&(e.deleteFramebuffer(p._MSAAFramebuffer),p._MSAAFramebuffer=null);const i=p._attachments.length;for(let a=0;a<i;a++){var _p$textures$a$_hardwa;(_p$textures$a$_hardwa=p.textures[a]._hardwareTexture)===null||_p$textures$a$_hardwa===void 0||_p$textures$a$_hardwa.releaseMSAARenderBuffers();}if(t>1&&typeof e.renderbufferStorageMultisample=="function"){const a=e.createFramebuffer();if(!a)throw new Error("Unable to create multi sampled framebuffer");p._MSAAFramebuffer=a,this._bindUnboundFramebuffer(a);const f=[];for(let S=0;S<i;S++){const L=p.textures[S],o=L._hardwareTexture,T=e[this.webGLVersion>1?"COLOR_ATTACHMENT"+S:"COLOR_ATTACHMENT"+S+"_WEBGL"],A=this._createRenderBuffer(L.width,L.height,t,-1,this._getRGBABufferInternalSizedFormat(L.type,L.format,L._useSRGBBuffer),T);if(!A)throw new Error("Unable to create multi sampled framebuffer");o.addMSAARenderBuffer(A),L.samples=t,f.push(T);}s&&e.drawBuffers(f);}else this._bindUnboundFramebuffer(p._framebuffer);const n=p._depthStencilTexture?p._depthStencilTexture.format:void 0;return p._depthStencilBuffer=this._setupFramebufferDepthAttachments(p._generateStencilBuffer,p._generateDepthBuffer,p.width,p.height,t,n),this._bindUnboundFramebuffer(null),p._samples=t,t;};J.prototype.generateMipMapsMultiFramebuffer=function(p){const t=p,s=this._gl;if(t.isMulti)for(let e=0;e<t._attachments.length;e++){const i=t.textures[e];(i===null||i===void 0?void 0:i.generateMipMaps)&&!(i!==null&&i!==void 0&&i.isCube)&&!(i!==null&&i!==void 0&&i.is3D)&&(this._bindTextureDirectly(s.TEXTURE_2D,i,!0),s.generateMipmap(s.TEXTURE_2D),this._bindTextureDirectly(s.TEXTURE_2D,null));}};J.prototype.resolveMultiFramebuffer=function(p){const t=p,s=this._gl;if(!t._MSAAFramebuffer||!t.isMulti)return;let e=t.resolveMSAAColors?s.COLOR_BUFFER_BIT:0;e|=t._generateDepthBuffer&&t.resolveMSAADepth?s.DEPTH_BUFFER_BIT:0,e|=t._generateStencilBuffer&&t.resolveMSAAStencil?s.STENCIL_BUFFER_BIT:0;const i=t._attachments,n=i.length;s.bindFramebuffer(s.READ_FRAMEBUFFER,t._MSAAFramebuffer),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,t._framebuffer);for(let a=0;a<n;a++){const f=t.textures[a];for(let S=0;S<n;S++)i[S]=s.NONE;i[a]=s[this.webGLVersion>1?"COLOR_ATTACHMENT"+a:"COLOR_ATTACHMENT"+a+"_WEBGL"],s.readBuffer(i[a]),s.drawBuffers(i),s.blitFramebuffer(0,0,f.width,f.height,0,0,f.width,f.height,e,s.NEAREST);}for(let a=0;a<n;a++)i[a]=s[this.webGLVersion>1?"COLOR_ATTACHMENT"+a:"COLOR_ATTACHMENT"+a+"_WEBGL"];s.drawBuffers(i),s.bindFramebuffer(this._gl.FRAMEBUFFER,t._MSAAFramebuffer);};class Pt extends ze{get isSupported(){var _this$_engine$getCaps,_this$_engine;return(_this$_engine$getCaps=(_this$_engine=this._engine)===null||_this$_engine===void 0?void 0:_this$_engine.getCaps().drawBuffersExtension)!==null&&_this$_engine$getCaps!==void 0?_this$_engine$getCaps:!1;}get textures(){return this._textures;}get count(){return this._count;}get depthTexture(){return this._textures[this._textures.length-1];}set wrapU(t){if(this._textures)for(let s=0;s<this._textures.length;s++)this._textures[s].wrapU=t;}set wrapV(t){if(this._textures)for(let s=0;s<this._textures.length;s++)this._textures[s].wrapV=t;}constructor(t,s,e,i,n,a){const f=n&&n.generateMipMaps?n.generateMipMaps:!1,S=n&&n.generateDepthTexture?n.generateDepthTexture:!1,L=n&&n.depthTextureFormat?n.depthTextureFormat:15,o=!n||n.doNotChangeAspectRatio===void 0?!0:n.doNotChangeAspectRatio,T=n&&n.drawOnlyOnFirstAttachmentByDefault?n.drawOnlyOnFirstAttachmentByDefault:!1;if(super(t,s,i,f,o,void 0,void 0,void 0,void 0,void 0,void 0,void 0,!0),!this.isSupported){this.dispose();return;}this._textureNames=a;const A=[],M=[],N=[],I=[],C=[],_=[],m=[],F=[];this._initTypes(e,A,M,N,I,C,_,m,F,n);const y=!n||n.generateDepthBuffer===void 0?!0:n.generateDepthBuffer,g=!n||n.generateStencilBuffer===void 0?!1:n.generateStencilBuffer,c=n&&n.samples?n.samples:1;this._multiRenderTargetOptions={samplingModes:M,generateMipMaps:f,generateDepthBuffer:y,generateStencilBuffer:g,generateDepthTexture:S,depthTextureFormat:L,types:A,textureCount:e,useSRGBBuffers:N,samples:c,formats:I,targetTypes:C,faceIndex:_,layerIndex:m,layerCounts:F,labels:a,label:t},this._count=e,this._drawOnlyOnFirstAttachmentByDefault=T,e>0&&(this._createInternalTextures(),this._createTextures(a));}_initTypes(t,s,e,i,n,a,f,S,L,o){for(let T=0;T<t;T++)o&&o.types&&o.types[T]!==void 0?s.push(o.types[T]):s.push(o&&o.defaultType?o.defaultType:0),o&&o.samplingModes&&o.samplingModes[T]!==void 0?e.push(o.samplingModes[T]):e.push(ne.BILINEAR_SAMPLINGMODE),o&&o.useSRGBBuffers&&o.useSRGBBuffers[T]!==void 0?i.push(o.useSRGBBuffers[T]):i.push(!1),o&&o.formats&&o.formats[T]!==void 0?n.push(o.formats[T]):n.push(5),o&&o.targetTypes&&o.targetTypes[T]!==void 0?a.push(o.targetTypes[T]):a.push(3553),o&&o.faceIndex&&o.faceIndex[T]!==void 0?f.push(o.faceIndex[T]):f.push(0),o&&o.layerIndex&&o.layerIndex[T]!==void 0?S.push(o.layerIndex[T]):S.push(0),o&&o.layerCounts&&o.layerCounts[T]!==void 0?L.push(o.layerCounts[T]):L.push(1);}_createInternaTextureIndexMapping(){const t={},s=[];if(!this._renderTarget)return s;const e=this._renderTarget.textures;for(let i=0;i<e.length;i++){const n=e[i];if(!n)continue;const a=t[n.uniqueId];a!==void 0?s[i]=a:t[n.uniqueId]=i;}return s;}_rebuild(t=!1,s=!1,e){if(this._count<1||t)return;const i=this._createInternaTextureIndexMapping();this.releaseInternalTextures(),this._createInternalTextures(),s&&(this._releaseTextures(),this._createTextures(e));const n=this._renderTarget.textures;for(let a=0;a<n.length;a++){const f=this._textures[a];i[a]!==void 0&&this._renderTarget.setTexture(n[i[a]],a),f._texture=n[a],f._texture&&(f._noMipmap=!f._texture.useMipMaps,f._useSRGBBuffer=f._texture._useSRGBBuffer);}this.samples!==1&&this._renderTarget.setSamples(this.samples,!this._drawOnlyOnFirstAttachmentByDefault,!0);}_createInternalTextures(){this._renderTarget=this._getEngine().createMultipleRenderTarget(this._size,this._multiRenderTargetOptions,!this._drawOnlyOnFirstAttachmentByDefault),this._texture=this._renderTarget.texture;}_releaseTextures(){if(this._textures)for(let t=0;t<this._textures.length;t++)this._textures[t]._texture=null,this._textures[t].dispose();}_createTextures(t){const s=this._renderTarget.textures;this._textures=[];for(let e=0;e<s.length;e++){const i=new ne(null,this.getScene());t!==null&&t!==void 0&&t[e]&&(i.name=t[e]),i._texture=s[e],i._texture&&(i._noMipmap=!i._texture.useMipMaps,i._useSRGBBuffer=i._texture._useSRGBBuffer),this._textures.push(i);}}setInternalTexture(t,s,e=!0){var _this$_textureNames$s,_this$_textureNames;if(this.renderTarget&&(s===0&&(this._texture=t),this.renderTarget.setTexture(t,s,e),this.textures[s]||(this.textures[s]=new ne(null,this.getScene()),this.textures[s].name=(_this$_textureNames$s=(_this$_textureNames=this._textureNames)===null||_this$_textureNames===void 0?void 0:_this$_textureNames[s])!==null&&_this$_textureNames$s!==void 0?_this$_textureNames$s:this.textures[s].name),this.textures[s]._texture=t,this.textures[s]._noMipmap=!t.useMipMaps,this.textures[s]._useSRGBBuffer=t._useSRGBBuffer,this._count=this.renderTarget.textures?this.renderTarget.textures.length:0,this._multiRenderTargetOptions.types&&(this._multiRenderTargetOptions.types[s]=t.type),this._multiRenderTargetOptions.samplingModes&&(this._multiRenderTargetOptions.samplingModes[s]=t.samplingMode),this._multiRenderTargetOptions.useSRGBBuffers&&(this._multiRenderTargetOptions.useSRGBBuffers[s]=t._useSRGBBuffer),this._multiRenderTargetOptions.targetTypes&&this._multiRenderTargetOptions.targetTypes[s]!==-1)){let i;t.is2DArray?i=35866:t.isCube?i=34067:t.is3D?i=32879:i=3553,this._multiRenderTargetOptions.targetTypes[s]=i;}}setLayerAndFaceIndex(t,s=-1,e=-1){!this.textures[t]||!this.renderTarget||(this._multiRenderTargetOptions.layerIndex&&(this._multiRenderTargetOptions.layerIndex[t]=s),this._multiRenderTargetOptions.faceIndex&&(this._multiRenderTargetOptions.faceIndex[t]=e),this.renderTarget.setLayerAndFaceIndex(t,s,e));}setLayerAndFaceIndices(t,s){this.renderTarget&&(this._multiRenderTargetOptions.layerIndex=t,this._multiRenderTargetOptions.faceIndex=s,this.renderTarget.setLayerAndFaceIndices(t,s));}get samples(){return this._samples;}set samples(t){this._renderTarget?this._samples=this._renderTarget.setSamples(t):this._samples=t;}resize(t){this._processSizeParameter(t),this._rebuild(!1,void 0,this._textureNames);}updateCount(t,s,e){this._multiRenderTargetOptions.textureCount=t,this._count=t;const i=[],n=[],a=[],f=[],S=[],L=[],o=[],T=[];this._textureNames=e,this._initTypes(t,i,n,a,f,S,L,o,T,s),this._multiRenderTargetOptions.types=i,this._multiRenderTargetOptions.samplingModes=n,this._multiRenderTargetOptions.useSRGBBuffers=a,this._multiRenderTargetOptions.formats=f,this._multiRenderTargetOptions.targetTypes=S,this._multiRenderTargetOptions.faceIndex=L,this._multiRenderTargetOptions.layerIndex=o,this._multiRenderTargetOptions.layerCounts=T,this._multiRenderTargetOptions.labels=e,this._rebuild(!1,!0,e);}_unbindFrameBuffer(t,s){this._renderTarget&&t.unBindMultiColorAttachmentFramebuffer(this._renderTarget,this.isCube,()=>{this.onAfterRenderObservable.notifyObservers(s);});}dispose(t=!1){this._releaseTextures(),t?this._texture=null:this.releaseInternalTextures(),super.dispose();}releaseInternalTextures(){var _this$_renderTarget;const t=(_this$_renderTarget=this._renderTarget)===null||_this$_renderTarget===void 0?void 0:_this$_renderTarget.textures;if(t){var _this$_renderTarget2;for(let s=t.length-1;s>=0;s--)this._textures[s]._texture=null;(_this$_renderTarget2=this._renderTarget)!==null&&_this$_renderTarget2!==void 0&&_this$_renderTarget2.dispose(),this._renderTarget=null;}}}const ve="mrtFragmentDeclaration",Ut=`#if defined(WEBGL2) || defined(WEBGPU) || defined(NATIVE)
layout(location=0) out vec4 glFragData[{X}];
#endif
`;B.IncludesShadersStore[ve]||(B.IncludesShadersStore[ve]=Ut);const Le="sceneFragmentDeclaration",Bt=`uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
uniform mat4 view;uniform mat4 projection;uniform vec4 vEyePosition;uniform mat4 inverseProjection;
`;B.IncludesShadersStore[Le]||(B.IncludesShadersStore[Le]=Bt);const Ce="openpbrDielectricReflectance",Vt=`struct ReflectanceParams
{float F0;float F90;vec3 coloredF0;vec3 coloredF90;};
#define pbr_inline
ReflectanceParams dielectricReflectance(
in float insideIOR,in float outsideIOR,in vec3 specularColor,in float specularWeight
)
{ReflectanceParams outParams;float dielectricF0=pow((insideIOR-outsideIOR)/(insideIOR+outsideIOR),2.0);float dielectricF0_NoSpec=pow((1.0-outsideIOR)/(1.0+outsideIOR),2.0);float f90Scale=clamp(2.0*abs(insideIOR-outsideIOR),0.0,1.0);float f90Scale_NoSpec=clamp(2.0*abs(1.0-outsideIOR),0.0,1.0);
#if (DIELECTRIC_SPECULAR_MODEL==DIELECTRIC_SPECULAR_MODEL_OPENPBR)
vec3 dielectricColorF90=specularColor.rgb*vec3(f90Scale);vec3 dielectricColorF90_NoSpec=specularColor.rgb*vec3(f90Scale_NoSpec);
#else
vec3 dielectricColorF90=vec3(f90Scale);vec3 dielectricColorF90_NoSpec=vec3(f90Scale_NoSpec);
#endif
#if DIELECTRIC_SPECULAR_MODEL==DIELECTRIC_SPECULAR_MODEL_GLTF
float maxF0=max(specularColor.r,max(specularColor.g,specularColor.b));outParams.F0=mix(dielectricF0_NoSpec,dielectricF0,specularWeight)*maxF0;
#else
outParams.F0=mix(dielectricF0_NoSpec,dielectricF0,specularWeight);
#endif
outParams.F90=mix(f90Scale_NoSpec,f90Scale,specularWeight);outParams.coloredF0=mix(vec3(dielectricF0_NoSpec),vec3(dielectricF0),specularWeight)*specularColor.rgb;outParams.coloredF90=mix(dielectricColorF90_NoSpec,dielectricColorF90,specularWeight);return outParams;}
`;B.IncludesShadersStore[Ce]||(B.IncludesShadersStore[Ce]=Vt);const Me="openpbrGeometryInfo",wt=`struct geometryInfoOutParams
{float NdotV;float NdotVUnclamped;vec3 environmentBrdf;float horizonOcclusion;};struct geometryInfoAnisoOutParams
{float NdotV;float NdotVUnclamped;vec3 environmentBrdf;float horizonOcclusion;float anisotropy;vec3 anisotropicTangent;vec3 anisotropicBitangent;mat3 TBN;};
#define pbr_inline
geometryInfoOutParams geometryInfo(
in vec3 normalW,in vec3 viewDirectionW,in float roughness,in vec3 geometricNormalW
)
{geometryInfoOutParams outParams;outParams.NdotVUnclamped=dot(normalW,viewDirectionW);outParams.NdotV=absEps(outParams.NdotVUnclamped);
#if defined(ENVIRONMENTBRDF)
outParams.environmentBrdf=getBRDFLookup(outParams.NdotV,roughness);
#else
outParams.environmentBrdf=vec3(0.0);
#endif
outParams.horizonOcclusion=1.0;
#if defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
#ifdef HORIZONOCCLUSION
#if defined(GEOMETRY_NORMAL) || defined(GEOMETRY_COAT_NORMAL)
#ifdef REFLECTIONMAP_3D
outParams.horizonOcclusion=environmentHorizonOcclusion(-viewDirectionW,normalW,geometricNormalW);
#endif
#endif
#endif
#endif
return outParams;}
#define pbr_inline
geometryInfoAnisoOutParams geometryInfoAniso(
in vec3 normalW,in vec3 viewDirectionW,in float roughness,in vec3 geometricNormalW
,in vec3 vAnisotropy,in mat3 TBN
)
{geometryInfoOutParams geoInfo=geometryInfo(normalW,viewDirectionW,roughness,geometricNormalW);geometryInfoAnisoOutParams outParams;outParams.NdotV=geoInfo.NdotV;outParams.NdotVUnclamped=geoInfo.NdotVUnclamped;outParams.environmentBrdf=geoInfo.environmentBrdf;outParams.horizonOcclusion=geoInfo.horizonOcclusion;outParams.anisotropy=vAnisotropy.b;vec3 anisotropyDirection=vec3(vAnisotropy.xy,0.);mat3 anisoTBN=mat3(normalize(TBN[0]),normalize(TBN[1]),normalize(TBN[2]));outParams.anisotropicTangent=normalize(anisoTBN*anisotropyDirection);outParams.anisotropicBitangent=normalize(cross(anisoTBN[2],outParams.anisotropicTangent));outParams.TBN=TBN;return outParams;}`;B.IncludesShadersStore[Me]||(B.IncludesShadersStore[Me]=wt);const be="openpbrIblFunctions",Gt=`#ifdef REFLECTION
vec3 sampleIrradiance(
in vec3 surfaceNormal
#if defined(NORMAL) && defined(USESPHERICALINVERTEX)
,in vec3 vEnvironmentIrradianceSH
#endif
#if (defined(USESPHERICALFROMREFLECTIONMAP) && (!defined(NORMAL) || !defined(USESPHERICALINVERTEX))) || (defined(USEIRRADIANCEMAP) && defined(REFLECTIONMAP_3D))
,in mat4 iblMatrix
#endif
#ifdef USEIRRADIANCEMAP
#ifdef REFLECTIONMAP_3D
,in samplerCube irradianceSampler
#else
,in sampler2D irradianceSampler
#endif
#ifdef USE_IRRADIANCE_DOMINANT_DIRECTION
,in vec3 reflectionDominantDirection
#endif
#endif
#ifdef REALTIME_FILTERING
,in vec2 vReflectionFilteringInfo
#ifdef IBL_CDF_FILTERING
,in sampler2D icdfSampler
#endif
#endif
,in vec2 vReflectionInfos
,in vec3 viewDirectionW
,in float diffuseRoughness
,in vec3 surfaceAlbedo
) {vec3 environmentIrradiance=vec3(0.,0.,0.);
#if (defined(USESPHERICALFROMREFLECTIONMAP) && (!defined(NORMAL) || !defined(USESPHERICALINVERTEX))) || (defined(USEIRRADIANCEMAP) && defined(REFLECTIONMAP_3D))
vec3 irradianceVector=(iblMatrix*vec4(surfaceNormal,0)).xyz;vec3 irradianceView=(iblMatrix*vec4(viewDirectionW,0)).xyz;
#if !defined(USE_IRRADIANCE_DOMINANT_DIRECTION) && !defined(REALTIME_FILTERING)
#if BASE_DIFFUSE_MODEL != BRDF_DIFFUSE_MODEL_LAMBERT && BASE_DIFFUSE_MODEL != BRDF_DIFFUSE_MODEL_LEGACY
{float NdotV=max(dot(surfaceNormal,viewDirectionW),0.0);irradianceVector=mix(irradianceVector,irradianceView,(0.5*(1.0-NdotV))*diffuseRoughness);}
#endif
#endif
#ifdef REFLECTIONMAP_OPPOSITEZ
irradianceVector.z*=-1.0;irradianceView.z*=-1.0;
#endif
#ifdef INVERTCUBICMAP
irradianceVector.y*=-1.0;irradianceView.y*=-1.0;
#endif
#endif
#ifdef USESPHERICALFROMREFLECTIONMAP
#if defined(NORMAL) && defined(USESPHERICALINVERTEX)
environmentIrradiance=vEnvironmentIrradianceSH;
#else
#if defined(REALTIME_FILTERING)
environmentIrradiance=irradiance(reflectionSampler,irradianceVector,vReflectionFilteringInfo,diffuseRoughness,surfaceAlbedo,irradianceView
#ifdef IBL_CDF_FILTERING
,icdfSampler
#endif
);
#else
environmentIrradiance=computeEnvironmentIrradiance(irradianceVector);
#endif
#endif
#elif defined(USEIRRADIANCEMAP)
#ifdef REFLECTIONMAP_3D
vec4 environmentIrradianceFromTexture=sampleReflection(irradianceSampler,irradianceVector);
#else
vec4 environmentIrradianceFromTexture=sampleReflection(irradianceSampler,reflectionCoords);
#endif
environmentIrradiance=environmentIrradianceFromTexture.rgb;
#ifdef RGBDREFLECTION
environmentIrradiance.rgb=fromRGBD(environmentIrradianceFromTexture);
#endif
#ifdef GAMMAREFLECTION
environmentIrradiance.rgb=toLinearSpace(environmentIrradiance.rgb);
#endif
#ifdef USE_IRRADIANCE_DOMINANT_DIRECTION
vec3 Ls=normalize(reflectionDominantDirection);float NoL=dot(irradianceVector,Ls);float NoV=dot(irradianceVector,irradianceView);vec3 diffuseRoughnessTerm=vec3(1.0);
#if BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_EON
float LoV=dot (Ls,irradianceView);float mag=length(reflectionDominantDirection)*2.0;vec3 clampedAlbedo=clamp(surfaceAlbedo,vec3(0.1),vec3(1.0));diffuseRoughnessTerm=diffuseBRDF_EON(clampedAlbedo,diffuseRoughness,NoL,NoV,LoV)*PI;diffuseRoughnessTerm=diffuseRoughnessTerm/clampedAlbedo;diffuseRoughnessTerm=mix(vec3(1.0),diffuseRoughnessTerm,sqrt(clamp(mag*NoV,0.0,1.0)));
#elif BASE_DIFFUSE_MODEL==BRDF_DIFFUSE_MODEL_BURLEY
vec3 H=(irradianceView+Ls)*0.5;float VoH=dot(irradianceView,H);diffuseRoughnessTerm=vec3(diffuseBRDF_Burley(NoL,NoV,VoH,diffuseRoughness)*PI);
#endif
environmentIrradiance=environmentIrradiance.rgb*diffuseRoughnessTerm;
#endif
#endif
environmentIrradiance*=vReflectionInfos.x;return environmentIrradiance;}
#define pbr_inline
#ifdef REFLECTIONMAP_3D
vec3 createReflectionCoords(
#else
vec2 createReflectionCoords(
#endif
in vec3 vPositionW
,in vec3 normalW
)
{vec3 reflectionVector=computeReflectionCoords(vec4(vPositionW,1.0),normalW);
#ifdef REFLECTIONMAP_OPPOSITEZ
reflectionVector.z*=-1.0;
#endif
#ifdef REFLECTIONMAP_3D
vec3 reflectionCoords=reflectionVector;
#else
vec2 reflectionCoords=reflectionVector.xy;
#ifdef REFLECTIONMAP_PROJECTION
reflectionCoords/=reflectionVector.z;
#endif
reflectionCoords.y=1.0-reflectionCoords.y;
#endif
return reflectionCoords;}
#define pbr_inline
#define inline
vec3 sampleRadiance(
in float alphaG
,in vec3 vReflectionMicrosurfaceInfos
,in vec2 vReflectionInfos
,in geometryInfoOutParams geoInfo
#ifdef REFLECTIONMAP_3D
,in samplerCube reflectionSampler
,const vec3 reflectionCoords
#else
,in sampler2D reflectionSampler
,const vec2 reflectionCoords
#endif
#ifdef REALTIME_FILTERING
,in vec2 vReflectionFilteringInfo
#endif
)
{vec4 environmentRadiance=vec4(0.,0.,0.,0.);
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
float reflectionLOD=getLodFromAlphaG(vReflectionMicrosurfaceInfos.x,alphaG,geoInfo.NdotVUnclamped);
#elif defined(LINEARSPECULARREFLECTION)
float reflectionLOD=getLinearLodFromRoughness(vReflectionMicrosurfaceInfos.x,roughness);
#else
float reflectionLOD=getLodFromAlphaG(vReflectionMicrosurfaceInfos.x,alphaG);
#endif
reflectionLOD=reflectionLOD*vReflectionMicrosurfaceInfos.y+vReflectionMicrosurfaceInfos.z;
#ifdef REALTIME_FILTERING
environmentRadiance=vec4(radiance(alphaG,reflectionSampler,reflectionCoords,vReflectionFilteringInfo),1.0);
#else
environmentRadiance=sampleReflectionLod(reflectionSampler,reflectionCoords,reflectionLOD);
#endif
#ifdef RGBDREFLECTION
environmentRadiance.rgb=fromRGBD(environmentRadiance);
#endif
#ifdef GAMMAREFLECTION
environmentRadiance.rgb=toLinearSpace(environmentRadiance.rgb);
#endif
environmentRadiance.rgb*=vec3(vReflectionInfos.x);return environmentRadiance.rgb;}
#if defined(ANISOTROPIC)
#define pbr_inline
#define inline
vec3 sampleRadianceAnisotropic(
in float alphaG
,in vec3 vReflectionMicrosurfaceInfos
,in vec2 vReflectionInfos
,in geometryInfoAnisoOutParams geoInfo
,const vec3 normalW
,const vec3 viewDirectionW
,const vec3 positionW
,const vec3 noise
,bool isRefraction
,float ior
#ifdef REFLECTIONMAP_3D
,in samplerCube reflectionSampler
#else
,in sampler2D reflectionSampler
#endif
#ifdef REALTIME_FILTERING
,in vec2 vReflectionFilteringInfo
#endif
)
{vec4 environmentRadiance=vec4(0.,0.,0.,0.);float alphaT=alphaG*sqrt(2.0/(1.0+(1.0-geoInfo.anisotropy)*(1.0-geoInfo.anisotropy)));float alphaB=(1.0-geoInfo.anisotropy)*alphaT;alphaG=alphaB;
#if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
float reflectionLOD=getLodFromAlphaG(vReflectionMicrosurfaceInfos.x,alphaG,geoInfo.NdotVUnclamped);
#elif defined(LINEARSPECULARREFLECTION)
float reflectionLOD=getLinearLodFromRoughness(vReflectionMicrosurfaceInfos.x,roughness);
#else
float reflectionLOD=getLodFromAlphaG(vReflectionMicrosurfaceInfos.x,alphaG);
#endif
reflectionLOD=reflectionLOD*vReflectionMicrosurfaceInfos.y+vReflectionMicrosurfaceInfos.z;
#ifdef REALTIME_FILTERING
vec3 view=(reflectionMatrix*vec4(viewDirectionW,0.0)).xyz;vec3 tangent=(reflectionMatrix*vec4(geoInfo.anisotropicTangent,0.0)).xyz;vec3 bitangent=(reflectionMatrix*vec4(geoInfo.anisotropicBitangent,0.0)).xyz;vec3 normal=(reflectionMatrix*vec4(normalW,0.0)).xyz;
#ifdef REFLECTIONMAP_OPPOSITEZ
view.z*=-1.0;tangent.z*=-1.0;bitangent.z*=-1.0;normal.z*=-1.0;
#endif
environmentRadiance =
vec4(radianceAnisotropic(alphaT,alphaB,reflectionSampler,
view,tangent,
bitangent,normal,
vReflectionFilteringInfo,noise.xy,isRefraction,ior),
1.0);
#else
const int samples=16;vec4 radianceSample=vec4(0.0);vec3 reflectionCoords=vec3(0.0);float sample_weight=0.0;float total_weight=0.0;float step=1.0/float(max(samples-1,1));for (int i=0; i<samples; ++i) {float t=mix(-1.0,1.0,float(i)*step);t+=step*2.0*noise.x;sample_weight=max(1.0-abs(t),0.001);sample_weight*=sample_weight;t*=min(4.0*alphaT*geoInfo.anisotropy,1.0);vec3 bentNormal;if (t<0.0) {float blend=t+1.0;bentNormal=normalize(mix(-geoInfo.anisotropicTangent,normalW,blend));} else if (t>0.0) {float blend=t;bentNormal=normalize(mix(normalW,geoInfo.anisotropicTangent,blend));} else {bentNormal=normalW;}
if (isRefraction) {reflectionCoords=double_refract(-viewDirectionW,bentNormal,ior);} else {reflectionCoords=reflect(-viewDirectionW,bentNormal);}
reflectionCoords=vec3(reflectionMatrix*vec4(reflectionCoords,0));
#ifdef REFLECTIONMAP_OPPOSITEZ
reflectionCoords.z*=-1.0;
#endif
radianceSample=sampleReflectionLod(reflectionSampler,reflectionCoords,reflectionLOD);
#ifdef RGBDREFLECTION
environmentRadiance.rgb+=sample_weight*fromRGBD(radianceSample);
#elif defined(GAMMAREFLECTION)
environmentRadiance.rgb+=sample_weight*toLinearSpace(radianceSample.rgb);
#else
environmentRadiance.rgb+=sample_weight*radianceSample.rgb;
#endif
total_weight+=sample_weight;}
environmentRadiance=vec4(environmentRadiance.xyz/float(total_weight),1.0);
#endif
environmentRadiance.rgb*=vec3(vReflectionInfos.x);return environmentRadiance.rgb;}
#endif
#endif
#if defined(ENVIRONMENTBRDF)
#define pbr_inline
float computeDielectricIblFresnel(in ReflectanceParams reflectance,in vec3 environmentBrdf)
{float dielectricIblFresnel=getReflectanceFromBRDFLookup(vec3(reflectance.F0),vec3(reflectance.F90),environmentBrdf).r;float dielectricECF=1.0+reflectance.F0*(1.0/environmentBrdf.y-1.0);return clamp(dielectricIblFresnel*dielectricECF,0.0,1.0);}
#define pbr_inline
vec3 computeConductorIblFresnel(in ReflectanceParams reflectance,in vec3 environmentBrdf)
{
#if (CONDUCTOR_SPECULAR_MODEL==CONDUCTOR_SPECULAR_MODEL_OPENPBR) && defined(ENVIRONMENTBRDF)
vec3 openPBRBrdf=vec3(environmentBrdf.xy,environmentBrdf.z/BRDF_Z_SCALE);vec3 b =getF82B(reflectance.coloredF0,reflectance.coloredF90);vec3 E_F82=getF82DirectionalAlbedo(reflectance.coloredF0,vec3(1.0),b,openPBRBrdf);vec3 F_avg=getF82AverageFresnel(reflectance.coloredF0,b);vec3 ECF =vec3(1.0)+F_avg*(vec3(1.0)/openPBRBrdf.y-vec3(1.0));return clamp(E_F82*ECF,vec3(0.0),vec3(1.0));
#else
return getReflectanceFromBRDFLookup(reflectance.coloredF0,reflectance.coloredF90,environmentBrdf);
#endif
}
#endif
`;B.IncludesShadersStore[be]||(B.IncludesShadersStore[be]=Gt);const Oe="openpbrSubsurfaceLayerData",Wt=`float subsurface_weight=vSubsurfaceWeight;vec3 subsurface_color=vSubsurfaceColor.rgb;float subsurface_radius=vSubsurfaceRadius;vec3 subsurface_radius_scale=vSubsurfaceRadiusScale;float subsurface_scatter_anisotropy=clamp(vSubsurfaceScatterAnisotropy,-0.9999,0.9999);
#ifdef SUBSURFACE_WEIGHT
vec4 subsurfaceWeightFromTexture=texture2D(subsurfaceWeightSampler,vSubsurfaceWeightUV+uvOffset);
#endif
#ifdef SUBSURFACE_COLOR
vec4 subsurfaceColorFromTexture=texture2D(subsurfaceColorSampler,vSubsurfaceColorUV+uvOffset);
#endif
#ifdef SUBSURFACE_RADIUS_SCALE
vec4 subsurfaceRadiusScaleFromTexture=texture2D(subsurfaceRadiusScaleSampler,vSubsurfaceRadiusScaleUV+uvOffset);
#endif
#ifdef SUBSURFACE_WEIGHT
subsurface_weight*=subsurfaceWeightFromTexture.r;
#endif
#ifdef SUBSURFACE_COLOR
#ifdef SUBSURFACE_COLOR_GAMMA
subsurface_color*=toLinearSpace(subsurfaceColorFromTexture.rgb);
#else
subsurface_color*=subsurfaceColorFromTexture.rgb;
#endif
subsurface_color*=vSubsurfaceColorInfos.y;
#endif
#ifdef SUBSURFACE_RADIUS_SCALE
subsurface_radius_scale*=subsurfaceRadiusScaleFromTexture.rgb;
#endif
`;B.IncludesShadersStore[Oe]||(B.IncludesShadersStore[Oe]=Wt);const Ne="openpbrTransmissionLayerData",kt=`float transmission_weight=vTransmissionWeight;vec3 transmission_color=vTransmissionColor.rgb;float transmission_depth=vTransmissionDepth;vec3 transmission_scatter=vTransmissionScatter.rgb;float transmission_scatter_anisotropy=clamp(vTransmissionScatterAnisotropy,-0.9999,0.9999);float transmission_dispersion_scale=vTransmissionDispersionScale;float transmission_dispersion_abbe_number=vTransmissionDispersionAbbeNumber;
#ifdef TRANSMISSION_WEIGHT
vec4 transmissionWeightFromTexture=texture2D(transmissionWeightSampler,vTransmissionWeightUV+uvOffset);
#endif
#ifdef TRANSMISSION_COLOR
vec4 transmissionColorFromTexture=texture2D(transmissionColorSampler,vTransmissionColorUV+uvOffset);
#endif
#ifdef TRANSMISSION_DEPTH
vec4 transmissionDepthFromTexture=texture2D(transmissionDepthSampler,vTransmissionDepthUV+uvOffset);
#endif
#ifdef TRANSMISSION_SCATTER
vec4 transmissionScatterFromTexture=texture2D(transmissionScatterSampler,vTransmissionScatterUV+uvOffset);
#endif
#ifdef TRANSMISSION_DISPERSION_SCALE
vec4 transmissionDispersionScaleFromTexture=texture2D(transmissionDispersionScaleSampler,vTransmissionDispersionScaleUV+uvOffset);
#endif
#ifdef TRANSMISSION_WEIGHT
transmission_weight*=transmissionWeightFromTexture.r;
#endif
#ifdef TRANSMISSION_COLOR
#ifdef TRANSMISSION_COLOR_GAMMA
transmission_color*=toLinearSpace(transmissionColorFromTexture.rgb);
#else
transmission_color*=transmissionColorFromTexture.rgb;
#endif
transmission_color*=vTransmissionColorInfos.y;
#endif
#ifdef TRANSMISSION_DEPTH
transmission_depth*=transmissionDepthFromTexture.r;
#endif
#ifdef TRANSMISSION_SCATTER
transmission_scatter*=transmissionScatterFromTexture.rgb;
#endif
#ifdef TRANSMISSION_DISPERSION_SCALE
transmission_dispersion_scale*=transmissionDispersionScaleFromTexture.r;
#endif
`;B.IncludesShadersStore[Ne]||(B.IncludesShadersStore[Ne]=kt);const _e="geometryPixelShader",Ge=`#extension GL_EXT_draw_buffers : require
#if defined(BUMP) || !defined(NORMAL)
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
#ifdef BUMP
varying mat4 vWorldView;varying vec3 vNormalW;
#else
varying vec3 vNormalV;
#endif
varying vec4 vViewPos;
#if defined(POSITION) || defined(BUMP) || defined(IRRADIANCE)
varying vec3 vPositionW;
#endif
#if defined(VELOCITY) || defined(VELOCITY_LINEAR)
varying vec4 vCurrentPosition;varying vec4 vPreviousPosition;
#endif
#ifdef NEED_UV
varying vec2 vUV;
#endif
#ifdef BUMP
uniform vec3 vBumpInfos;uniform vec2 vTangentSpaceParams;
#endif
#if defined(REFLECTIVITY)
#if defined(ORMTEXTURE) || defined(SPECULARGLOSSINESSTEXTURE) || defined(REFLECTIVITYTEXTURE)
uniform sampler2D reflectivitySampler;varying vec2 vReflectivityUV;
#else
#ifdef METALLIC_TEXTURE
uniform sampler2D metallicSampler;varying vec2 vMetallicUV;
#endif
#ifdef ROUGHNESS_TEXTURE
uniform sampler2D roughnessSampler;varying vec2 vRoughnessUV;
#endif
#endif
#ifdef ALBEDOTEXTURE
varying vec2 vAlbedoUV;uniform sampler2D albedoSampler;
#endif
#ifdef REFLECTIVITYCOLOR
uniform vec3 reflectivityColor;
#endif
#ifdef ALBEDOCOLOR
uniform vec3 albedoColor;
#endif
#ifdef METALLIC
uniform float metallic;
#endif
#if defined(ROUGHNESS) || defined(GLOSSINESS)
uniform float glossiness;
#endif
#endif
#if defined(ALPHATEST) && defined(NEED_UV)
uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
#include<mrtFragmentDeclaration>[SCENE_MRT_COUNT]
#include<bumpFragmentMainFunctions>
#include<bumpFragmentFunctions>
#include<helperFunctions>
#ifdef IRRADIANCE
#include<pbrFragmentReflectionDeclaration>
#ifdef REFLECTION
#ifdef USEIRRADIANCEMAP
#include<__decl__sceneFragment>
uniform mat4 reflectionMatrix;uniform vec2 vReflectionInfos;uniform vec3 vReflectionDominantDirection;
#include<pbrBRDFFunctions>
#include<openpbrDielectricReflectance>
#include<pbrIBLFunctions>
#include<reflectionFunction>
#include<openpbrGeometryInfo>
#include<openpbrIblFunctions>
#elif defined(USESPHERICALFROMREFLECTIONMAP)
varying vec3 vEnvironmentIrradiance;
#endif
#ifdef IBL_SHADOW_TEXTURE
uniform sampler2D iblShadowSampler;uniform vec2 shadowTextureSize;
#endif
#ifdef IRRADIANCE_SCATTER_MASK
uniform float vSubsurfaceWeight;
#include<samplerFragmentDeclaration>(_DEFINENAME_,SUBSURFACE_WEIGHT,_VARYINGNAME_,SubsurfaceWeight,_SAMPLERNAME_,subsurfaceWeight)
uniform float vSubsurfaceScatterAnisotropy;uniform float vTransmissionWeight;
#include<samplerFragmentDeclaration>(_DEFINENAME_,TRANSMISSION_WEIGHT,_VARYINGNAME_,TransmissionWeight,_SAMPLERNAME_,transmissionWeight)
uniform float vTransmissionScatterAnisotropy;
#endif
#endif
#endif
void main() {
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (texture2D(diffuseSampler,vUV).a<0.4)
discard;
#endif
vec3 normalOutput;
#ifdef BUMP
vec3 normalW=normalize(vNormalW);
#include<bumpFragment>
#ifdef NORMAL_WORLDSPACE
normalOutput=normalW;
#else
normalOutput=normalize(vec3(vWorldView*vec4(normalW,0.0)));
#endif
#elif defined(HAS_NORMAL_ATTRIBUTE)
normalOutput=normalize(vNormalV);
#elif defined(POSITION)
normalOutput=normalize(-cross(dFdx(vPositionW),dFdy(vPositionW)));
#endif
#ifdef ENCODE_NORMAL
normalOutput=normalOutput*0.5+0.5;
#endif
#ifdef DEPTH
gl_FragData[DEPTH_INDEX]=vec4(vViewPos.z/vViewPos.w,0.0,0.0,1.0);
#endif
#ifdef NORMAL
gl_FragData[NORMAL_INDEX]=vec4(normalOutput,1.0);
#endif
#ifdef SCREENSPACE_DEPTH
gl_FragData[SCREENSPACE_DEPTH_INDEX]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#ifdef POSITION
gl_FragData[POSITION_INDEX]=vec4(vPositionW,1.0);
#endif
#ifdef VELOCITY
vec2 a=(vCurrentPosition.xy/vCurrentPosition.w)*0.5+0.5;vec2 b=(vPreviousPosition.xy/vPreviousPosition.w)*0.5+0.5;vec2 velocity=abs(a-b);velocity=vec2(pow(velocity.x,1.0/3.0),pow(velocity.y,1.0/3.0))*sign(a-b)*0.5+0.5;gl_FragData[VELOCITY_INDEX]=vec4(velocity,0.0,1.0);
#endif
#ifdef VELOCITY_LINEAR
vec2 velocity=vec2(0.5)*((vPreviousPosition.xy/vPreviousPosition.w) -
(vCurrentPosition.xy/vCurrentPosition.w));gl_FragData[VELOCITY_LINEAR_INDEX]=vec4(velocity,0.0,1.0);
#endif
#ifdef REFLECTIVITY
vec4 reflectivity=vec4(0.0,0.0,0.0,1.0);
#ifdef METALLICWORKFLOW
float metal=1.0;float roughness=1.0;
#ifdef ORMTEXTURE
metal*=texture2D(reflectivitySampler,vReflectivityUV).b;roughness*=texture2D(reflectivitySampler,vReflectivityUV).g;
#else
#ifdef METALLIC_TEXTURE
metal*=texture2D(metallicSampler,vMetallicUV).r;
#endif
#ifdef ROUGHNESS_TEXTURE
roughness*=texture2D(roughnessSampler,vRoughnessUV).r;
#endif
#endif
#ifdef METALLIC
metal*=metallic;
#endif
#ifdef ROUGHNESS
roughness*=(1.0-glossiness); 
#endif
reflectivity.a-=roughness;vec3 color=vec3(1.0);
#ifdef ALBEDOTEXTURE
color=texture2D(albedoSampler,vAlbedoUV).rgb;
#ifdef GAMMAALBEDO
color=toLinearSpace(color);
#endif
#endif
#ifdef ALBEDOCOLOR
color*=albedoColor.xyz;
#endif
reflectivity.rgb=mix(vec3(0.04),color,metal);
#else
#if defined(SPECULARGLOSSINESSTEXTURE) || defined(REFLECTIVITYTEXTURE)
reflectivity=texture2D(reflectivitySampler,vReflectivityUV);
#ifdef GAMMAREFLECTIVITYTEXTURE
reflectivity.rgb=toLinearSpace(reflectivity.rgb);
#endif
#else 
#ifdef REFLECTIVITYCOLOR
reflectivity.rgb=toLinearSpace(reflectivityColor.xyz);reflectivity.a=1.0;
#endif
#endif
#ifdef GLOSSINESSS
reflectivity.a*=glossiness; 
#endif
#endif
gl_FragData[REFLECTIVITY_INDEX]=reflectivity;
#endif
#ifdef IRRADIANCE
vec3 irradiance=vec3(0.0);float irradiance_alpha=1.0;
#ifdef REFLECTION
#ifdef IRRADIANCE_SCATTER_MASK
vec3 vSubsurfaceColor=vec3(1.0);float vSubsurfaceRadius=0.0;vec3 vSubsurfaceRadiusScale=vec3(1.0);
#include<openpbrSubsurfaceLayerData>
float vTransmissionDepth=1.0;vec3 vTransmissionColor=vec3(1.0);vec3 vTransmissionScatter=vec3(0.0);float vTransmissionDispersionScale=0.0;float vTransmissionDispersionAbbeNumber=0.0;
#include<openpbrTransmissionLayerData>
#endif
#ifdef IBL_SHADOW_TEXTURE
#ifdef COLORED_IBL_SHADOWS
vec3 iblShadowValue=texture(iblShadowSampler,gl_FragCoord.xy/shadowTextureSize).rgb;
#else
vec3 iblShadowValue=vec3(texture(iblShadowSampler,gl_FragCoord.xy/shadowTextureSize).r);
#endif
#endif
#if defined(USEIRRADIANCEMAP)
#ifdef IRRADIANCE_SCATTER_MASK
float bendAmount=subsurface_weight*-min(subsurface_scatter_anisotropy,0.0);bendAmount=mix(bendAmount,-min(transmission_scatter_anisotropy,0.0),transmission_weight);vec3 viewVector=normalize(vEyePosition.xyz-vPositionW.xyz);vec3 bentNormal=mix(normalOutput,viewVector,bendAmount*dot(normalOutput,viewVector));
#else
vec3 bentNormal=normalOutput;
#endif
irradiance=sampleIrradiance(
bentNormal
#if defined(NORMAL) && defined(USESPHERICALINVERTEX)
,vEnvironmentIrradiance
#endif
#if (defined(USESPHERICALFROMREFLECTIONMAP) && (!defined(NORMAL) || !defined(USESPHERICALINVERTEX))) || (defined(USEIRRADIANCEMAP) && defined(REFLECTIONMAP_3D))
,reflectionMatrix
#endif
#ifdef USEIRRADIANCEMAP
,irradianceSampler
#ifdef USE_IRRADIANCE_DOMINANT_DIRECTION
,vReflectionDominantDirection
#endif
#endif
#ifdef REALTIME_FILTERING
,vReflectionFilteringInfo
#ifdef IBL_CDF_FILTERING
,icdfSampler
#endif
#endif
,vReflectionInfos
,vViewPos.xyz
,1.0
,vec3(1.0)
);
#elif defined(USESPHERICALFROMREFLECTIONMAP)
irradiance=vEnvironmentIrradiance;
#endif
#ifdef IBL_SHADOW_TEXTURE
irradiance*=iblShadowValue;
#endif
#ifndef BUMP
vec2 uvOffset=vec2(0.0);
#endif
#ifdef IRRADIANCE_SCATTER_MASK
irradiance_alpha=min(subsurface_weight+transmission_weight,1.0);
#endif
#endif
gl_FragData[IRRADIANCE_INDEX]=vec4(irradiance,irradiance_alpha);
#endif
}
`;B.ShadersStore[_e]||(B.ShadersStore[_e]=Ge);const Ht={name:_e,shader:Ge},zt=Object.freeze(Object.defineProperty({__proto__:null,geometryPixelShader:Ht},Symbol.toStringTag,{value:"Module"})),Fe="geometryVertexDeclaration",Xt="uniform mat4 viewProjection;uniform mat4 view;";B.IncludesShadersStore[Fe]||(B.IncludesShadersStore[Fe]=Xt);const ye="geometryUboDeclaration",Yt=`#include<sceneUboDeclaration>
`;B.IncludesShadersStore[ye]||(B.IncludesShadersStore[ye]=Yt);const Te="geometryVertexShader",We=`precision highp float;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
#include<__decl__geometryVertex>
#include<clipPlaneVertexDeclaration>
#ifdef IRRADIANCE
#ifdef REFLECTION
uniform mat4 reflectionMatrix;uniform vec2 vReflectionInfos;uniform vec3 vReflectionColor;
#ifdef USESPHERICALFROMREFLECTIONMAP
varying vec3 vEnvironmentIrradiance;
#ifdef SPHERICAL_HARMONICS
uniform vec3 vSphericalL00;uniform vec3 vSphericalL1_1;uniform vec3 vSphericalL10;uniform vec3 vSphericalL11;uniform vec3 vSphericalL2_2;uniform vec3 vSphericalL2_1;uniform vec3 vSphericalL20;uniform vec3 vSphericalL21;uniform vec3 vSphericalL22;
#else
uniform vec3 vSphericalX;uniform vec3 vSphericalY;uniform vec3 vSphericalZ;uniform vec3 vSphericalXX_ZZ;uniform vec3 vSphericalYY_ZZ;uniform vec3 vSphericalZZ;uniform vec3 vSphericalXY;uniform vec3 vSphericalYZ;uniform vec3 vSphericalZX;
#endif
#include<harmonicsFunctions>
#endif
#endif
#endif
attribute vec3 position;
#ifdef HAS_NORMAL_ATTRIBUTE
attribute vec3 normal;
#endif
#ifdef NEED_UV
varying vec2 vUV;
#ifdef ALPHATEST
uniform mat4 diffuseMatrix;
#endif
#ifdef BUMP
uniform mat4 bumpMatrix;varying vec2 vBumpUV;
#endif
#ifdef REFLECTIVITY
uniform mat4 reflectivityMatrix;uniform mat4 albedoMatrix;varying vec2 vReflectivityUV;varying vec2 vAlbedoUV;
#endif
#ifdef METALLIC_TEXTURE
varying vec2 vMetallicUV;uniform mat4 metallicMatrix;
#endif
#ifdef ROUGHNESS_TEXTURE
varying vec2 vRoughnessUV;uniform mat4 roughnessMatrix;
#endif
#ifdef SUBSURFACE_WEIGHT
varying vec2 vSubsurfaceWeightUV;uniform mat4 subsurfaceWeightMatrix;
#endif
#ifdef TRANSMISSION_WEIGHT
varying vec2 vTransmissionWeightUV;uniform mat4 transmissionWeightMatrix;
#endif
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#ifdef BUMP
varying mat4 vWorldView;
#endif
#ifdef BUMP
varying vec3 vNormalW;
#else
varying vec3 vNormalV;
#endif
varying vec4 vViewPos;
#if defined(POSITION) || defined(BUMP) || defined(IRRADIANCE)
varying vec3 vPositionW;
#endif
#if defined(VELOCITY) || defined(VELOCITY_LINEAR)
uniform mat4 previousViewProjection;varying vec4 vCurrentPosition;varying vec4 vPreviousPosition;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;
#ifdef HAS_NORMAL_ATTRIBUTE
vec3 normalUpdated=normal;
#else
vec3 normalUpdated=vec3(0.0,0.0,0.0);
#endif
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#if (defined(VELOCITY) || defined(VELOCITY_LINEAR)) && !defined(BONES_VELOCITY_ENABLED)
vCurrentPosition=viewProjection*finalWorld*vec4(positionUpdated,1.0);vPreviousPosition=previousViewProjection*finalPreviousWorld*vec4(positionUpdated,1.0);
#endif
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=vec4(finalWorld*vec4(positionUpdated,1.0));
#ifdef BUMP
vWorldView=view*finalWorld;mat3 normalWorld=mat3(finalWorld);vNormalW=normalize(normalWorld*normalUpdated);
#else
#ifdef NORMAL_WORLDSPACE
vNormalV=normalize(vec3(finalWorld*vec4(normalUpdated,0.0)));
#else
vNormalV=normalize(vec3((view*finalWorld)*vec4(normalUpdated,0.0)));
#endif
#endif
vViewPos=view*worldPos;
#if (defined(VELOCITY) || defined(VELOCITY_LINEAR)) && defined(BONES_VELOCITY_ENABLED)
vCurrentPosition=viewProjection*finalWorld*vec4(positionUpdated,1.0);
#if NUM_BONE_INFLUENCERS>0
mat4 previousInfluence;previousInfluence=mPreviousBones[int(matricesIndices[0])]*matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
previousInfluence+=mPreviousBones[int(matricesIndices[1])]*matricesWeights[1];
#endif
#if NUM_BONE_INFLUENCERS>2
previousInfluence+=mPreviousBones[int(matricesIndices[2])]*matricesWeights[2];
#endif
#if NUM_BONE_INFLUENCERS>3
previousInfluence+=mPreviousBones[int(matricesIndices[3])]*matricesWeights[3];
#endif
#if NUM_BONE_INFLUENCERS>4
previousInfluence+=mPreviousBones[int(matricesIndicesExtra[0])]*matricesWeightsExtra[0];
#endif
#if NUM_BONE_INFLUENCERS>5
previousInfluence+=mPreviousBones[int(matricesIndicesExtra[1])]*matricesWeightsExtra[1];
#endif
#if NUM_BONE_INFLUENCERS>6
previousInfluence+=mPreviousBones[int(matricesIndicesExtra[2])]*matricesWeightsExtra[2];
#endif
#if NUM_BONE_INFLUENCERS>7
previousInfluence+=mPreviousBones[int(matricesIndicesExtra[3])]*matricesWeightsExtra[3];
#endif
vPreviousPosition=previousViewProjection*finalPreviousWorld*previousInfluence*vec4(positionUpdated,1.0);
#else
vPreviousPosition=previousViewProjection*finalPreviousWorld*vec4(positionUpdated,1.0);
#endif
#endif
#if defined(POSITION) || defined(BUMP) || defined(IRRADIANCE)
vPositionW=worldPos.xyz/worldPos.w;
#endif
gl_Position=viewProjection*finalWorld*vec4(positionUpdated,1.0);
#include<clipPlaneVertex>
#ifdef NEED_UV
#ifdef UV1
#if defined(ALPHATEST) && defined(ALPHATEST_UV1)
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#else
vUV=uvUpdated;
#endif
#ifdef BUMP_UV1
vBumpUV=vec2(bumpMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef REFLECTIVITY_UV1
vReflectivityUV=vec2(reflectivityMatrix*vec4(uvUpdated,1.0,0.0));
#else
#ifdef METALLIC_UV1
vMetallicUV=vec2(metallicMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef ROUGHNESS_UV1
vRoughnessUV=vec2(roughnessMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#endif
#ifdef ALBEDO_UV1
vAlbedoUV=vec2(albedoMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef SUBSURFACE_COLOR_UV1
vSubsurfaceColorUV=vec2(subsurfaceColorMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef SUBSURFACE_WEIGHT_UV1
vSubsurfaceWeightUV=vec2(subsurfaceWeightMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#endif
#ifdef UV2
#if defined(ALPHATEST) && defined(ALPHATEST_UV2)
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#else
vUV=uv2Updated;
#endif
#ifdef BUMP_UV2
vBumpUV=vec2(bumpMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#ifdef REFLECTIVITY_UV2
vReflectivityUV=vec2(reflectivityMatrix*vec4(uv2Updated,1.0,0.0));
#else
#ifdef METALLIC_UV2
vMetallicUV=vec2(metallicMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#ifdef ROUGHNESS_UV2
vRoughnessUV=vec2(roughnessMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#ifdef ALBEDO_UV2
vAlbedoUV=vec2(albedoMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#ifdef SUBSURFACE_COLOR_UV2
vSubsurfaceColorUV=vec2(subsurfaceColorMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#ifdef SUBSURFACE_WEIGHT_UV2
vSubsurfaceWeightUV=vec2(subsurfaceWeightMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#endif
#include<bumpVertex>
#ifdef IRRADIANCE
#ifdef REFLECTION
#ifdef USESPHERICALFROMREFLECTIONMAP
vec3 reflectionVector=vec3(reflectionMatrix*vec4(normalUpdated,0.0)).xyz;
#ifdef REFLECTIONMAP_OPPOSITEZ
reflectionVector.z*=-1.0;
#endif
vEnvironmentIrradiance=computeEnvironmentIrradiance(reflectionVector)*vReflectionInfos.x;
#endif
#endif
#endif
}
`;B.ShadersStore[Te]||(B.ShadersStore[Te]=We);const Zt={name:Te,shader:We},Kt=Object.freeze(Object.defineProperty({__proto__:null,geometryVertexShader:Zt},Symbol.toStringTag,{value:"Module"})),ke=["diffuseSampler","bumpSampler","reflectivitySampler","albedoSampler","morphTargets","boneSampler","transmissionWeightSampler","subsurfaceWeightSampler","iblShadowSampler"],me=["world","mBones","viewProjection","diffuseMatrix","view","previousWorld","previousViewProjection","mPreviousBones","bumpMatrix","reflectivityMatrix","albedoMatrix","reflectivityColor","albedoColor","reflectionMatrix","vTransmissionWeight","vSubsurfaceWeight","vEyePosition","vTransmissionScatterAnisotropy","vSubsurfaceScatterAnisotropy","shadowTextureSize","metallic","glossiness","vTangentSpaceParams","vBumpInfos","morphTargetInfluences","morphTargetCount","morphTargetTextureInfo","morphTargetTextureIndices","boneTextureInfo"];Ve(me,ke,!0);we(me);class v{get normalsAreUnsigned(){return this._normalsAreUnsigned;}_linkPrePassRenderer(t){this._linkedWithPrePass=!0,this._prePassRenderer=t,this._multiRenderTarget&&(this._multiRenderTarget.onClearObservable.clear(),this._multiRenderTarget.onClearObservable.add(()=>{}));}_unlinkPrePassRenderer(){this._linkedWithPrePass=!1,this._createRenderTargets();}_resetLayout(){this._enableDepth=!0,this._enableNormal=!0,this._enablePosition=!1,this._enableReflectivity=!1,this._enableVelocity=!1,this._enableVelocityLinear=!1,this._enableScreenspaceDepth=!1,this._enableIrradiance=!1,this._attachmentsFromPrePass=[];}_forceTextureType(t,s){t===v.POSITION_TEXTURE_TYPE?(this._positionIndex=s,this._enablePosition=!0):t===v.VELOCITY_TEXTURE_TYPE?(this._velocityIndex=s,this._enableVelocity=!0):t===v.VELOCITY_LINEAR_TEXTURE_TYPE?(this._velocityLinearIndex=s,this._enableVelocityLinear=!0):t===v.REFLECTIVITY_TEXTURE_TYPE?(this._reflectivityIndex=s,this._enableReflectivity=!0):t===v.DEPTH_TEXTURE_TYPE?(this._depthIndex=s,this._enableDepth=!0):t===v.NORMAL_TEXTURE_TYPE?(this._normalIndex=s,this._enableNormal=!0):t===v.SCREENSPACE_DEPTH_TEXTURE_TYPE?(this._screenspaceDepthIndex=s,this._enableScreenspaceDepth=!0):t===v.IRRADIANCE_TEXTURE_TYPE&&(this._irradianceIndex=s,this._enableIrradiance=!0);}_setAttachments(t){this._attachmentsFromPrePass=t;}_linkInternalTexture(t){this._multiRenderTarget.setInternalTexture(t,0,!1);}get renderList(){return this._multiRenderTarget.renderList;}set renderList(t){this._multiRenderTarget.renderList=t;}get isSupported(){return this._multiRenderTarget.isSupported;}getTextureIndex(t){switch(t){case v.POSITION_TEXTURE_TYPE:return this._positionIndex;case v.VELOCITY_TEXTURE_TYPE:return this._velocityIndex;case v.VELOCITY_LINEAR_TEXTURE_TYPE:return this._velocityLinearIndex;case v.REFLECTIVITY_TEXTURE_TYPE:return this._reflectivityIndex;case v.DEPTH_TEXTURE_TYPE:return this._depthIndex;case v.NORMAL_TEXTURE_TYPE:return this._normalIndex;case v.SCREENSPACE_DEPTH_TEXTURE_TYPE:return this._screenspaceDepthIndex;case v.IRRADIANCE_TEXTURE_TYPE:return this._irradianceIndex;default:return-1;}}get enableDepth(){return this._enableDepth;}set enableDepth(t){this._enableDepth=t,this._linkedWithPrePass||(this.dispose(),this._createRenderTargets());}get enableNormal(){return this._enableNormal;}set enableNormal(t){this._enableNormal=t,this._linkedWithPrePass||(this.dispose(),this._createRenderTargets());}get enablePosition(){return this._enablePosition;}set enablePosition(t){this._enablePosition=t,this._linkedWithPrePass||(this.dispose(),this._createRenderTargets());}get enableVelocity(){return this._enableVelocity;}set enableVelocity(t){this._enableVelocity=t,t||(this._previousTransformationMatrices={}),this._linkedWithPrePass||(this.dispose(),this._createRenderTargets()),this._scene.needsPreviousWorldMatrices=t;}get enableVelocityLinear(){return this._enableVelocityLinear;}set enableVelocityLinear(t){this._enableVelocityLinear=t,this._linkedWithPrePass||(this.dispose(),this._createRenderTargets());}get enableReflectivity(){return this._enableReflectivity;}set enableReflectivity(t){this._enableReflectivity=t,this._linkedWithPrePass||(this.dispose(),this._createRenderTargets());}get enableScreenspaceDepth(){return this._enableScreenspaceDepth;}set enableScreenspaceDepth(t){this._enableScreenspaceDepth=t,this._linkedWithPrePass||(this.dispose(),this._createRenderTargets());}get enableIrradiance(){return this._enableIrradiance;}set enableIrradiance(t){this._enableIrradiance=t,this._linkedWithPrePass||(this.dispose(),this._createRenderTargets());}get scene(){return this._scene;}get ratio(){return typeof this._ratioOrDimensions=="object"?1:this._ratioOrDimensions;}get shaderLanguage(){return this._shaderLanguage;}constructor(t,s=1,e=15,i){this._previousTransformationMatrices={},this._previousBonesTransformationMatrices={},this.excludedSkinnedMeshesFromVelocity=[],this.renderTransparentMeshes=!0,this.generateNormalsInWorldSpace=!1,this._normalsAreUnsigned=!1,this._resizeObserver=null,this._enableDepth=!0,this._enableNormal=!0,this._enablePosition=!1,this._enableVelocity=!1,this._enableVelocityLinear=!1,this._enableReflectivity=!1,this._enableScreenspaceDepth=!1,this._enableIrradiance=!1,this._clearColor=new Ae(0,0,0,0),this._clearDepthColor=new Ae(0,0,0,1),this._positionIndex=-1,this._velocityIndex=-1,this._velocityLinearIndex=-1,this._reflectivityIndex=-1,this._depthIndex=-1,this._normalIndex=-1,this._screenspaceDepthIndex=-1,this._irradianceIndex=-1,this._linkedWithPrePass=!1,this.generateIrradianceWithScatterMask=!1,this.useSpecificClearForDepthTexture=!1,this._shaderLanguage=0,this._shadersLoaded=!1,this._scene=t,this._ratioOrDimensions=s,this._useUbo=t.getEngine().supportsUniformBuffers,this._depthFormat=e,this._textureTypesAndFormats=i||{},this._initShaderSourceAsync(),v._SceneComponentInitialization(this._scene),this._createRenderTargets();}async _initShaderSourceAsync(){this._scene.getEngine().isWebGPU&&!v.ForceGLSL?(this._shaderLanguage=1,await Promise.all([ie(()=>__import("./bjs-scene171-geometry.vertex-noh9nqI5.js"),[],import.meta.url),ie(()=>__import("./bjs-scene171-geometry.fragment-DPPShVm4.js"),[],import.meta.url)])):await Promise.all([ie(()=>Promise.resolve().then(()=>Kt),void 0,import.meta.url),ie(()=>Promise.resolve().then(()=>zt),void 0,import.meta.url)]),this._shadersLoaded=!0;}isReady(t,s){if(!this._shadersLoaded)return!1;const e=t.getMaterial();if(e&&e.disableDepthWrite)return!1;const i=[],n=[w.PositionKind],a=t.getMesh();a.isVerticesDataPresent(w.NormalKind)&&(i.push("#define HAS_NORMAL_ATTRIBUTE"),n.push(w.NormalKind));let S=!1,L=!1;const o=!1;if(e){let C=!1;if(e.needAlphaTestingForMesh(a)&&e.getAlphaTestTexture()&&(i.push("#define ALPHATEST"),i.push(`#define ALPHATEST_UV${e.getAlphaTestTexture().coordinatesIndex+1}`),C=!0),(e.bumpTexture||e.normalTexture||e.geometryNormalTexture)&&k.BumpTextureEnabled){const _=e.bumpTexture||e.normalTexture||e.geometryNormalTexture;i.push("#define BUMP"),i.push(`#define BUMP_UV${_.coordinatesIndex+1}`),C=!0;}if(this._enableReflectivity){let _=!1;if(e.getClassName()==="PBRMetallicRoughnessMaterial")e.metallicRoughnessTexture&&(i.push("#define ORMTEXTURE"),i.push(`#define REFLECTIVITY_UV${e.metallicRoughnessTexture.coordinatesIndex+1}`),i.push("#define METALLICWORKFLOW"),C=!0,_=!0),e.metallic!=null&&(i.push("#define METALLIC"),i.push("#define METALLICWORKFLOW"),_=!0),e.roughness!=null&&(i.push("#define ROUGHNESS"),i.push("#define METALLICWORKFLOW"),_=!0),_&&(e.baseTexture&&(i.push("#define ALBEDOTEXTURE"),i.push(`#define ALBEDO_UV${e.baseTexture.coordinatesIndex+1}`),e.baseTexture.gammaSpace&&i.push("#define GAMMAALBEDO"),C=!0),e.baseColor&&i.push("#define ALBEDOCOLOR"));else if(e.getClassName()==="PBRSpecularGlossinessMaterial")e.specularGlossinessTexture?(i.push("#define SPECULARGLOSSINESSTEXTURE"),i.push(`#define REFLECTIVITY_UV${e.specularGlossinessTexture.coordinatesIndex+1}`),C=!0,e.specularGlossinessTexture.gammaSpace&&i.push("#define GAMMAREFLECTIVITYTEXTURE")):e.specularColor&&i.push("#define REFLECTIVITYCOLOR"),e.glossiness!=null&&i.push("#define GLOSSINESS");else if(e.getClassName()==="PBRMaterial")e.metallicTexture&&(i.push("#define ORMTEXTURE"),i.push(`#define REFLECTIVITY_UV${e.metallicTexture.coordinatesIndex+1}`),i.push("#define METALLICWORKFLOW"),C=!0,_=!0),e.metallic!=null&&(i.push("#define METALLIC"),i.push("#define METALLICWORKFLOW"),_=!0),e.roughness!=null&&(i.push("#define ROUGHNESS"),i.push("#define METALLICWORKFLOW"),_=!0),_?(e.albedoTexture&&(i.push("#define ALBEDOTEXTURE"),i.push(`#define ALBEDO_UV${e.albedoTexture.coordinatesIndex+1}`),e.albedoTexture.gammaSpace&&i.push("#define GAMMAALBEDO"),C=!0),e.albedoColor&&i.push("#define ALBEDOCOLOR")):(e.reflectivityTexture?(i.push("#define SPECULARGLOSSINESSTEXTURE"),i.push(`#define REFLECTIVITY_UV${e.reflectivityTexture.coordinatesIndex+1}`),e.reflectivityTexture.gammaSpace&&i.push("#define GAMMAREFLECTIVITYTEXTURE"),C=!0):e.reflectivityColor&&i.push("#define REFLECTIVITYCOLOR"),e.microSurface!=null&&i.push("#define GLOSSINESS"));else if(e.getClassName()==="StandardMaterial")e.specularTexture&&(i.push("#define REFLECTIVITYTEXTURE"),i.push(`#define REFLECTIVITY_UV${e.specularTexture.coordinatesIndex+1}`),e.specularTexture.gammaSpace&&i.push("#define GAMMAREFLECTIVITYTEXTURE"),C=!0),e.specularColor&&i.push("#define REFLECTIVITYCOLOR");else if(e.getClassName()==="OpenPBRMaterial"){const m=e;i.push("#define METALLIC"),i.push("#define ROUGHNESS"),m._useRoughnessFromMetallicTextureGreen&&m.baseMetalnessTexture?(i.push("#define ORMTEXTURE"),i.push(`#define REFLECTIVITY_UV${m.baseMetalnessTexture.coordinatesIndex+1}`),C=!0):m.baseMetalnessTexture?(i.push("#define METALLIC_TEXTURE"),i.push(`#define METALLIC_UV${m.baseMetalnessTexture.coordinatesIndex+1}`),C=!0):m.specularRoughnessTexture&&(i.push("#define ROUGHNESS_TEXTURE"),i.push(`#define ROUGHNESS_UV${m.specularRoughnessTexture.coordinatesIndex+1}`),C=!0),m.baseColorTexture&&(i.push("#define ALBEDOTEXTURE"),i.push(`#define ALBEDO_UV${m.baseColorTexture.coordinatesIndex+1}`),m.baseColorTexture.gammaSpace&&i.push("#define GAMMAALBEDO"),C=!0),m.baseColor&&i.push("#define ALBEDOCOLOR");}}if(this._enableIrradiance&&this.generateIrradianceWithScatterMask&&(i.push("#define IRRADIANCE_SCATTER_MASK"),e.getClassName()==="OpenPBRMaterial")){const _=e;_.subsurfaceWeight>0&&_.subsurfaceWeightTexture&&(i.push("#define SUBSURFACE_WEIGHT"),i.push(`#define SUBSURFACEWEIGHT_UV${_.subsurfaceWeightTexture.coordinatesIndex+1}`),C=!0),_.transmissionWeight>0&&_.transmissionWeightTexture&&(i.push("#define TRANSMISSION_WEIGHT"),i.push(`#define TRANSMISSIONWEIGHT_UV${_.transmissionWeightTexture.coordinatesIndex+1}`),C=!0);}C&&(i.push("#define NEED_UV"),a.isVerticesDataPresent(w.UVKind)&&(n.push(w.UVKind),i.push("#define UV1"),S=!0),a.isVerticesDataPresent(w.UV2Kind)&&(n.push(w.UV2Kind),i.push("#define UV2"),L=!0));}if(this._enableDepth&&(i.push("#define DEPTH"),i.push("#define DEPTH_INDEX "+this._depthIndex)),this._enableNormal&&(i.push("#define NORMAL"),i.push("#define NORMAL_INDEX "+this._normalIndex)),this._enablePosition&&(i.push("#define POSITION"),i.push("#define POSITION_INDEX "+this._positionIndex)),this._enableVelocity&&(i.push("#define VELOCITY"),i.push("#define VELOCITY_INDEX "+this._velocityIndex),this.excludedSkinnedMeshesFromVelocity.indexOf(a)===-1&&i.push("#define BONES_VELOCITY_ENABLED")),this._enableVelocityLinear&&(i.push("#define VELOCITY_LINEAR"),i.push("#define VELOCITY_LINEAR_INDEX "+this._velocityLinearIndex),this.excludedSkinnedMeshesFromVelocity.indexOf(a)===-1&&i.push("#define BONES_VELOCITY_ENABLED")),this._enableReflectivity&&(i.push("#define REFLECTIVITY"),i.push("#define REFLECTIVITY_INDEX "+this._reflectivityIndex)),this._enableScreenspaceDepth&&this._screenspaceDepthIndex!==-1&&(i.push("#define SCREENSPACE_DEPTH_INDEX "+this._screenspaceDepthIndex),i.push("#define SCREENSPACE_DEPTH")),this._enableIrradiance&&this._irradianceIndex!==-1){i.push("#define IRRADIANCE_INDEX "+this._irradianceIndex),i.push("#define IRRADIANCE");const C=this._scene;if(C.environmentTexture){const _={};let m=!1,F=0;(e.getClassName()==="OpenPBRMaterial"||e.getClassName()==="StandardMaterial"||e.getClassName()==="PBRMetallicRoughnessMaterial"||e.getClassName()==="PBRSpecularGlossinessMaterial"||e.getClassName()==="PBRMaterial")&&(m=!!e.realtimeFiltering,F=e.realtimeFilteringQuality||0),Pe(C,C.environmentTexture,_,m,F,!0);for(const g in _)_[g]&&i.push("#define "+g);_.USEIRRADIANCEMAP||i.push("#define SPHERICAL_HARMONICS");const y=C.postProcessRenderPipelineManager.supportedPipelines.find(g=>g.getClassName()==="IBLShadowsRenderPipeline");if(y){const g=y;g._getAccumulatedTexture()&&(i.push("#define IBL_SHADOW_TEXTURE"),g.coloredShadows&&i.push("#define COLORED_IBL_SHADOWS"));}}}this.generateNormalsInWorldSpace&&i.push("#define NORMAL_WORLDSPACE"),this._normalsAreUnsigned&&i.push("#define ENCODE_NORMAL"),a.useBones&&a.computeBonesUsingShaders&&a.skeleton?(n.push(w.MatricesIndicesKind),n.push(w.MatricesWeightsKind),a.numBoneInfluencers>4&&(n.push(w.MatricesIndicesExtraKind),n.push(w.MatricesWeightsExtraKind)),i.push("#define NUM_BONE_INFLUENCERS "+a.numBoneInfluencers),i.push("#define BONETEXTURE "+a.skeleton.isUsingTextureForMatrices),i.push("#define BonesPerMesh "+(a.skeleton.bones.length+1))):(i.push("#define NUM_BONE_INFLUENCERS 0"),i.push("#define BONETEXTURE false"),i.push("#define BonesPerMesh 0"));const T=a.morphTargetManager?Xe(a.morphTargetManager,i,n,a,!0,!0,!1,S,L,o):0;s&&(i.push("#define INSTANCES"),Ye(n,this._enableVelocity||this._enableVelocityLinear),t.getRenderingMesh().hasThinInstances&&i.push("#define THIN_INSTANCES")),this._linkedWithPrePass?i.push("#define SCENE_MRT_COUNT "+this._attachmentsFromPrePass.length):i.push("#define SCENE_MRT_COUNT "+this._multiRenderTarget.textures.length),Ze(e,this._scene,i);const A=this._scene.getEngine(),M=t._getDrawWrapper(void 0,!0),N=M.defines,I=i.join(`
`);return N!==I&&M.setEffect(A.createEffect("geometry",{attributes:n,uniformsNames:me,samplers:ke,defines:I,onCompiled:null,fallbacks:null,onError:null,uniformBuffersNames:["Scene"],indexParameters:{buffersCount:this._multiRenderTarget.textures.length-1,maxSimultaneousMorphTargets:T},shaderLanguage:this.shaderLanguage},A),I),M.effect.isReady();}getGBuffer(){return this._multiRenderTarget;}get samples(){return this._multiRenderTarget.samples;}set samples(t){this._multiRenderTarget.samples=t;}dispose(){var _this$_multiRenderTar,_this$_multiRenderTar2;this._resizeObserver&&(this._scene.getEngine().onResizeObservable.remove(this._resizeObserver),this._resizeObserver=null),(_this$_multiRenderTar=this._multiRenderTarget)!==null&&_this$_multiRenderTar!==void 0&&_this$_multiRenderTar.renderTarget&&this.scene.getEngine()._currentRenderTarget===this._multiRenderTarget.renderTarget&&this.scene.getEngine().unBindFramebuffer((_this$_multiRenderTar2=this._multiRenderTarget)===null||_this$_multiRenderTar2===void 0?void 0:_this$_multiRenderTar2.renderTarget),this.getGBuffer().dispose();}_assignRenderTargetIndices(){const t=[],s=[];let e=0;return this._enableDepth&&(this._depthIndex=e,e++,t.push("gBuffer_Depth"),s.push(this._textureTypesAndFormats[v.DEPTH_TEXTURE_TYPE])),this._enableNormal&&(this._normalIndex=e,e++,t.push("gBuffer_Normal"),s.push(this._textureTypesAndFormats[v.NORMAL_TEXTURE_TYPE])),this._enablePosition&&(this._positionIndex=e,e++,t.push("gBuffer_Position"),s.push(this._textureTypesAndFormats[v.POSITION_TEXTURE_TYPE])),this._enableVelocity&&(this._velocityIndex=e,e++,t.push("gBuffer_Velocity"),s.push(this._textureTypesAndFormats[v.VELOCITY_TEXTURE_TYPE])),this._enableVelocityLinear&&(this._velocityLinearIndex=e,e++,t.push("gBuffer_VelocityLinear"),s.push(this._textureTypesAndFormats[v.VELOCITY_LINEAR_TEXTURE_TYPE])),this._enableReflectivity&&(this._reflectivityIndex=e,e++,t.push("gBuffer_Reflectivity"),s.push(this._textureTypesAndFormats[v.REFLECTIVITY_TEXTURE_TYPE])),this._enableScreenspaceDepth&&(this._screenspaceDepthIndex=e,e++,t.push("gBuffer_ScreenspaceDepth"),s.push(this._textureTypesAndFormats[v.SCREENSPACE_DEPTH_TEXTURE_TYPE])),this._enableIrradiance&&(this._irradianceIndex=e,e++,t.push("gBuffer_Irradiance"),s.push(this._textureTypesAndFormats[v.IRRADIANCE_TEXTURE_TYPE])),[e,t,s];}_createRenderTargets(){const t=this._scene.getEngine(),[s,e,i]=this._assignRenderTargetIndices();let n=0;t._caps.textureFloat&&t._caps.textureFloatLinearFiltering?n=1:t._caps.textureHalfFloat&&t._caps.textureHalfFloatLinearFiltering&&(n=2);const a=this._ratioOrDimensions.width!==void 0?this._ratioOrDimensions:{width:t.getRenderWidth()*this._ratioOrDimensions,height:t.getRenderHeight()*this._ratioOrDimensions},f=[],S=[],L=[];for(const _ of i){var _$samplingMode;_?(f.push(_.textureType),S.push(_.textureFormat),L.push((_$samplingMode=_.samplingMode)!==null&&_$samplingMode!==void 0?_$samplingMode:2)):(f.push(n),S.push(5),L.push(2));}if(this._normalsAreUnsigned=f[v.NORMAL_TEXTURE_TYPE]===11||f[v.NORMAL_TEXTURE_TYPE]===13,this._multiRenderTarget=new Pt("gBuffer",a,s,this._scene,{generateMipMaps:!1,generateDepthTexture:!0,types:f,formats:S,samplingModes:L,depthTextureFormat:this._depthFormat},e.concat("gBuffer_DepthBuffer")),!this.isSupported)return;this._multiRenderTarget.wrapU=ne.CLAMP_ADDRESSMODE,this._multiRenderTarget.wrapV=ne.CLAMP_ADDRESSMODE,this._multiRenderTarget.refreshRate=1,this._multiRenderTarget.renderParticles=!1,this._multiRenderTarget.renderList=null;const o=[!0],T=[!1],A=[!0];for(let _=1;_<s;++_)o.push(!0),A.push(!1),T.push(!0);const M=t.buildTextureLayout(o),N=t.buildTextureLayout(T),I=t.buildTextureLayout(A);this._multiRenderTarget.onClearObservable.add(_=>{_.bindAttachments(this.useSpecificClearForDepthTexture?N:M),_.clear(this._clearColor,!0,!0,!0),this.useSpecificClearForDepthTexture&&(_.bindAttachments(I),_.clear(this._clearDepthColor,!0,!0,!0)),_.bindAttachments(M);}),this._resizeObserver=t.onResizeObservable.add(()=>{if(this._multiRenderTarget){const _=this._ratioOrDimensions.width!==void 0?this._ratioOrDimensions:{width:t.getRenderWidth()*this._ratioOrDimensions,height:t.getRenderHeight()*this._ratioOrDimensions};this._multiRenderTarget.resize(_);}});const C=_=>{const m=_.getRenderingMesh(),F=_.getEffectiveMesh(),y=this._scene,g=y.getEngine(),c=_.getMaterial();if(!c)return;if(F._internalAbstractMeshDataInfo._isActiveIntermediate=!1,(this._enableVelocity||this._enableVelocityLinear)&&!this._previousTransformationMatrices[F.uniqueId]&&(this._previousTransformationMatrices[F.uniqueId]={world:Ke.Identity(),viewProjection:y.getTransformMatrix()},m.skeleton)){const d=m.skeleton.getTransformMatrices(m);this._previousBonesTransformationMatrices[m.uniqueId]=this._copyBonesTransformationMatrices(d,new Float32Array(d.length));}const Y=m._getInstancesRenderList(_._id,!!_.getReplacementMesh());if(Y.mustReturn)return;const Z=g.getCaps().instancedArrays&&(Y.visibleInstances[_._id]!==null||m.hasThinInstances),U=F.getWorldMatrix();if(this.isReady(_,Z)){const d=_._getDrawWrapper();if(!d)return;const u=d.effect;g.enableEffect(d),Z||m._bind(_,u,c.fillMode),this._useUbo?($e(u,this._scene.getSceneUniformBuffer()),this._scene.finalizeSceneUbo()):(u.setMatrix("viewProjection",y.getTransformMatrix()),u.setMatrix("view",y.getViewMatrix()),this._scene.bindEyePosition(u,"vEyePosition"));let ee;if(!m._instanceDataStorage.isFrozen&&(c.backFaceCulling||c.sideOrientation!==null)){const E=F._getWorldMatrixDeterminant();ee=c._getEffectiveOrientation(m),E<0&&(ee=ee===H.ClockWiseSideOrientation?H.CounterClockWiseSideOrientation:H.ClockWiseSideOrientation);}else ee=m._effectiveSideOrientation;if(c._preBind(d,ee),c.needAlphaTestingForMesh(F)){const E=c.getAlphaTestTexture();E&&(u.setTexture("diffuseSampler",E),u.setMatrix("diffuseMatrix",E.getTextureMatrix()));}if((c.bumpTexture||c.normalTexture||c.geometryNormalTexture)&&y.getEngine().getCaps().standardDerivatives&&k.BumpTextureEnabled){const E=c.bumpTexture||c.normalTexture||c.geometryNormalTexture;u.setFloat3("vBumpInfos",E.coordinatesIndex,1/E.level,c.parallaxScaleBias),u.setMatrix("bumpMatrix",E.getTextureMatrix()),u.setTexture("bumpSampler",E),u.setFloat2("vTangentSpaceParams",c.invertNormalMapX?-1:1,c.invertNormalMapY?-1:1);}if(this._enableReflectivity){if(c.getClassName()==="PBRMetallicRoughnessMaterial")c.metallicRoughnessTexture!==null&&(u.setTexture("reflectivitySampler",c.metallicRoughnessTexture),u.setMatrix("reflectivityMatrix",c.metallicRoughnessTexture.getTextureMatrix())),c.metallic!==null&&u.setFloat("metallic",c.metallic),c.roughness!==null&&u.setFloat("glossiness",1-c.roughness),c.baseTexture!==null&&(u.setTexture("albedoSampler",c.baseTexture),u.setMatrix("albedoMatrix",c.baseTexture.getTextureMatrix())),c.baseColor!==null&&u.setColor3("albedoColor",c.baseColor);else if(c.getClassName()==="PBRSpecularGlossinessMaterial")c.specularGlossinessTexture!==null?(u.setTexture("reflectivitySampler",c.specularGlossinessTexture),u.setMatrix("reflectivityMatrix",c.specularGlossinessTexture.getTextureMatrix())):c.specularColor!==null&&u.setColor3("reflectivityColor",c.specularColor),c.glossiness!==null&&u.setFloat("glossiness",c.glossiness);else if(c.getClassName()==="PBRMaterial")c.metallicTexture!==null&&(u.setTexture("reflectivitySampler",c.metallicTexture),u.setMatrix("reflectivityMatrix",c.metallicTexture.getTextureMatrix())),c.metallic!==null&&u.setFloat("metallic",c.metallic),c.roughness!==null&&u.setFloat("glossiness",1-c.roughness),c.roughness!==null||c.metallic!==null||c.metallicTexture!==null?(c.albedoTexture!==null&&(u.setTexture("albedoSampler",c.albedoTexture),u.setMatrix("albedoMatrix",c.albedoTexture.getTextureMatrix())),c.albedoColor!==null&&u.setColor3("albedoColor",c.albedoColor)):(c.reflectivityTexture!==null?(u.setTexture("reflectivitySampler",c.reflectivityTexture),u.setMatrix("reflectivityMatrix",c.reflectivityTexture.getTextureMatrix())):c.reflectivityColor!==null&&u.setColor3("reflectivityColor",c.reflectivityColor),c.microSurface!==null&&u.setFloat("glossiness",c.microSurface));else if(c.getClassName()==="StandardMaterial")c.specularTexture!==null&&(u.setTexture("reflectivitySampler",c.specularTexture),u.setMatrix("reflectivityMatrix",c.specularTexture.getTextureMatrix())),c.specularColor!==null&&u.setColor3("reflectivityColor",c.specularColor);else if(c.getClassName()==="OpenPBRMaterial"){const E=c;E._useRoughnessFromMetallicTextureGreen&&E.baseMetalnessTexture?(u.setTexture("reflectivitySampler",E.baseMetalnessTexture),u.setMatrix("reflectivityMatrix",E.baseMetalnessTexture.getTextureMatrix())):E.baseMetalnessTexture?(u.setTexture("metallicSampler",E.baseMetalnessTexture),u.setMatrix("metallicMatrix",E.baseMetalnessTexture.getTextureMatrix())):E.specularRoughnessTexture&&(u.setTexture("roughnessSampler",E.specularRoughnessTexture),u.setMatrix("roughnessMatrix",E.specularRoughnessTexture.getTextureMatrix())),u.setFloat("metallic",E.baseMetalness),u.setFloat("glossiness",1-E.specularRoughness),E.baseColorTexture!==null&&(u.setTexture("albedoSampler",E.baseColorTexture),u.setMatrix("albedoMatrix",E.baseColorTexture.getTextureMatrix())),E.baseColor!==null&&u.setColor3("albedoColor",E.baseColor);}}if(this._enableIrradiance&&y.environmentTexture){const E=y.environmentTexture,j=y.postProcessRenderPipelineManager.supportedPipelines.find(R=>R.getClassName()==="IBLShadowsRenderPipeline");if(j){const W=j._getAccumulatedTexture();W&&(u.setTexture("iblShadowSampler",W),u.setFloat2("shadowTextureSize",W.getSize().width,W.getSize().height));}if(u.setMatrix("reflectionMatrix",E.getReflectionTextureMatrix()),u.setFloat2("vReflectionInfos",E.level*y.iblIntensity,0),u.setTexture("reflectionSampler",E),E.irradianceTexture&&(u.setTexture("irradianceSampler",E.irradianceTexture),E.irradianceTexture._dominantDirection&&u.setVector3("vReflectionDominantDirection",E.irradianceTexture._dominantDirection)),E.sphericalPolynomial){const R=E.sphericalPolynomial;if(R.preScaledHarmonics){const W=R.preScaledHarmonics;u.setVector3("vSphericalL00",W.l00),u.setVector3("vSphericalL1_1",W.l1_1),u.setVector3("vSphericalL10",W.l10),u.setVector3("vSphericalL11",W.l11),u.setVector3("vSphericalL2_2",W.l2_2),u.setVector3("vSphericalL2_1",W.l2_1),u.setVector3("vSphericalL20",W.l20),u.setVector3("vSphericalL21",W.l21),u.setVector3("vSphericalL22",W.l22);}else u.setFloat3("vSphericalX",R.x.x,R.x.y,R.x.z),u.setFloat3("vSphericalY",R.y.x,R.y.y,R.y.z),u.setFloat3("vSphericalZ",R.z.x,R.z.y,R.z.z),u.setFloat3("vSphericalXX_ZZ",R.xx.x-R.zz.x,R.xx.y-R.zz.y,R.xx.z-R.zz.z),u.setFloat3("vSphericalYY_ZZ",R.yy.x-R.zz.x,R.yy.y-R.zz.y,R.yy.z-R.zz.z),u.setFloat3("vSphericalZZ",R.zz.x,R.zz.y,R.zz.z),u.setFloat3("vSphericalXY",R.xy.x,R.xy.y,R.xy.z),u.setFloat3("vSphericalYZ",R.yz.x,R.yz.y,R.yz.z),u.setFloat3("vSphericalZX",R.zx.x,R.zx.y,R.zx.z);}if(this.generateIrradianceWithScatterMask&&c.getClassName()==="OpenPBRMaterial"){const R=c;u.setFloat("vSubsurfaceWeight",R.subsurfaceWeight),R.subsurfaceWeightTexture&&(u.setTexture("subsurfaceWeightSampler",R.subsurfaceWeightTexture),u.setMatrix("subsurfaceWeightMatrix",R.subsurfaceWeightTexture.getTextureMatrix())),u.setFloat("vTransmissionWeight",R.transmissionWeight),R.transmissionWeightTexture&&(u.setTexture("transmissionWeightSampler",R.transmissionWeightTexture),u.setMatrix("transmissionWeightMatrix",R.transmissionWeightTexture.getTextureMatrix())),u.setFloat("vTransmissionScatterAnisotropy",R.transmissionScatterAnisotropy),u.setFloat("vSubsurfaceScatterAnisotropy",R.subsurfaceScatterAnisotropy);}}if(Ue(u,c,this._scene),m.useBones&&m.computeBonesUsingShaders&&m.skeleton){const E=m.skeleton;if(E.isUsingTextureForMatrices&&u.getUniformIndex("boneTextureInfo")>-1){const j=E.getTransformMatrixTexture(m);u.setTexture("boneSampler",j),u.setFloat2("boneTextureInfo",E._textureWidth,E._textureHeight);}else u.setMatrices("mBones",m.skeleton.getTransformMatrices(m));(this._enableVelocity||this._enableVelocityLinear)&&u.setMatrices("mPreviousBones",this._previousBonesTransformationMatrices[m.uniqueId]);}Be(m,u),m.morphTargetManager&&m.morphTargetManager.isUsingTextureForTargets&&m.morphTargetManager._bind(u),(this._enableVelocity||this._enableVelocityLinear)&&(u.setMatrix("previousWorld",this._previousTransformationMatrices[F.uniqueId].world),u.setMatrix("previousViewProjection",this._previousTransformationMatrices[F.uniqueId].viewProjection)),Z&&m.hasThinInstances&&u.setMatrix("world",U),m._processRendering(F,_,u,c.fillMode,Y,Z,(E,j)=>{E||u.setMatrix("world",j);});}(this._enableVelocity||this._enableVelocityLinear)&&(this._previousTransformationMatrices[F.uniqueId].world=U.clone(),this._previousTransformationMatrices[F.uniqueId].viewProjection=this._scene.getTransformMatrix().clone(),m.skeleton&&this._copyBonesTransformationMatrices(m.skeleton.getTransformMatrices(m),this._previousBonesTransformationMatrices[F.uniqueId]));};this._multiRenderTarget.customIsReadyFunction=(_,m,F)=>{if((F||m===0)&&_.subMeshes)for(let y=0;y<_.subMeshes.length;++y){const g=_.subMeshes[y],c=g.getMaterial(),Y=g.getRenderingMesh();if(!c)continue;const Z=Y._getInstancesRenderList(g._id,!!g.getReplacementMesh()),U=t.getCaps().instancedArrays&&(Z.visibleInstances[g._id]!==null||Y.hasThinInstances);if(!this.isReady(g,U))return!1;}return!0;},this._multiRenderTarget.customRenderFunction=(_,m,F,y)=>{let g;if(this._linkedWithPrePass){if(!this._prePassRenderer.enabled)return;this._scene.getEngine().bindAttachments(this._attachmentsFromPrePass);}if(y.length){for(t.setColorWrite(!1),g=0;g<y.length;g++)C(y.data[g]);t.setColorWrite(!0);}for(g=0;g<_.length;g++)C(_.data[g]);for(t.setDepthWrite(!1),g=0;g<m.length;g++)C(m.data[g]);if(this.renderTransparentMeshes)for(g=0;g<F.length;g++)C(F.data[g]);t.setDepthWrite(!0);};}_copyBonesTransformationMatrices(t,s){for(let e=0;e<t.length;e++)s[e]=t[e];return s;}}v.ForceGLSL=!1;v.DEPTH_TEXTURE_TYPE=0;v.NORMAL_TEXTURE_TYPE=1;v.POSITION_TEXTURE_TYPE=2;v.VELOCITY_TEXTURE_TYPE=3;v.REFLECTIVITY_TEXTURE_TYPE=4;v.SCREENSPACE_DEPTH_TEXTURE_TYPE=5;v.VELOCITY_LINEAR_TEXTURE_TYPE=6;v.IRRADIANCE_TEXTURE_TYPE=7;v._SceneComponentInitialization=p=>{throw je("GeometryBufferRendererSceneComponent");};const se={effect:null,subMesh:null};class ae{populateVectorFromLinkedProperties(t){const s=t.dimension[0];for(const e in this.linkedProperties){const i=this.linkedProperties[e],n=i.numComponents;if(s<n||i.targetUniformComponentOffset>s-n){n==1?re.Error(`Float property ${i.name} has an offset that is too large.`):re.Error(`Vector${n} property ${i.name} won't fit in Vector${s} or has an offset that is too large.`);return;}typeof i.value=="number"?ae._tmpArray[i.targetUniformComponentOffset]=i.value:i.value.toArray(ae._tmpArray,i.targetUniformComponentOffset);}t.fromArray(ae._tmpArray);}constructor(t,s){this.linkedProperties={},this.firstLinkedKey="",this.name=t,this.numComponents=s;}}ae._tmpArray=[0,0,0,0];class x{constructor(t,s,e,i,n=0,a){this.targetUniformComponentNum=4,this.targetUniformComponentOffset=0,this.name=t,this.targetUniformName=e,this.defaultValue=s,this.value=s,this.targetUniformComponentNum=i,this.targetUniformComponentOffset=n,this.requiredDefine=a;}get numComponents(){return typeof this.defaultValue=="number"?1:this.defaultValue.dimension[0];}}class O{get samplerName(){return this.samplerPrefix+"Sampler";}get samplerInfoName(){return"v"+this.samplerPrefix.charAt(0).toUpperCase()+this.samplerPrefix.slice(1)+"Infos";}get samplerMatrixName(){return this.samplerPrefix+"Matrix";}constructor(t,s,e){this.value=null,this.samplerPrefix="",this.textureDefine="",this.name=t,this.samplerPrefix=s,this.textureDefine=e;}}class $t extends Ot(Nt(Ft)){}class jt extends Dt($t){}class De extends bt(jt){constructor(t){super(t),this.NUM_SAMPLES="0",this.REALTIME_FILTERING=!1,this.IBL_CDF_FILTERING=!1,this.LIGHTCOUNT=0,this.VERTEXCOLOR=!1,this.BAKED_VERTEX_ANIMATION_TEXTURE=!1,this.VERTEXALPHA=!1,this.ALPHATEST=!1,this.DEPTHPREPASS=!1,this.ALPHABLEND=!1,this.ALPHA_FROM_BASE_COLOR_TEXTURE=!1,this.ALPHATESTVALUE="0.5",this.PREMULTIPLYALPHA=!1,this.REFLECTIVITY_GAMMA=!1,this.REFLECTIVITYDIRECTUV=0,this.SPECULARTERM=!1,this.LODBASEDMICROSFURACE=!0,this.SPECULAR_ROUGHNESS_FROM_METALNESS_TEXTURE_GREEN=!1,this.BASE_METALNESS_FROM_METALNESS_TEXTURE_BLUE=!1,this.AOSTOREINMETALMAPRED=!1,this.SPECULAR_WEIGHT_IN_ALPHA=!1,this.SPECULAR_WEIGHT_FROM_SPECULAR_COLOR_TEXTURE=!1,this.SPECULAR_ROUGHNESS_ANISOTROPY_FROM_TANGENT_TEXTURE=!1,this.COAT_ROUGHNESS_FROM_GREEN_CHANNEL=!1,this.COAT_ROUGHNESS_ANISOTROPY_FROM_TANGENT_TEXTURE=!1,this.USE_GLTF_STYLE_ANISOTROPY=!1,this.THIN_FILM_THICKNESS_FROM_THIN_FILM_TEXTURE=!1,this.FUZZ_ROUGHNESS_FROM_TEXTURE_ALPHA=!1,this.GEOMETRY_THICKNESS_FROM_GREEN_CHANNEL=!1,this.ENVIRONMENTBRDF=!1,this.ENVIRONMENTBRDF_RGBD=!1,this.FUZZENVIRONMENTBRDF=!1,this.NORMAL=!1,this.TANGENT=!1,this.OBJECTSPACE_NORMALMAP=!1,this.PARALLAX=!1,this.PARALLAX_RHS=!1,this.PARALLAXOCCLUSION=!1,this.NORMALXYSCALE=!0,this.ANISOTROPIC=!1,this.ANISOTROPIC_OPENPBR=!0,this.ANISOTROPIC_BASE=!1,this.ANISOTROPIC_COAT=!1,this.FUZZ_IBL_SAMPLES=6,this.FUZZ=!1,this.THIN_FILM=!1,this.IRIDESCENCE=!1,this.DISPERSION=!1,this.SCATTERING=!1,this.USE_IRRADIANCE_TEXTURE_FOR_SCATTERING=!1,this.USE_IRRADIANCE_TEXTURE_FOR_SCATTERING_GBUFFER=!1,this.TRANSMISSION_SLAB=!1,this.TRANSMISSION_SLAB_VOLUME=!1,this.SUBSURFACE_SLAB=!1,this.GEOMETRY_THIN_WALLED=!1,this.REFRACTED_BACKGROUND=!1,this.REFRACTED_LIGHTS=!1,this.REFRACTED_ENVIRONMENT=!1,this.REFRACTED_ENVIRONMENT_OPPOSITEZ=!1,this.REFRACTED_ENVIRONMENT_LOCAL_CUBE=!1,this.RADIANCEOCCLUSION=!1,this.HORIZONOCCLUSION=!1,this.INSTANCES=!1,this.THIN_INSTANCES=!1,this.INSTANCESCOLOR=!1,this.NUM_BONE_INFLUENCERS=0,this.BonesPerMesh=0,this.BONETEXTURE=!1,this.BONES_VELOCITY_ENABLED=!1,this.NONUNIFORMSCALING=!1,this.MORPHTARGETS=!1,this.MORPHTARGETS_POSITION=!1,this.MORPHTARGETS_NORMAL=!1,this.MORPHTARGETS_TANGENT=!1,this.MORPHTARGETS_UV=!1,this.MORPHTARGETS_UV2=!1,this.MORPHTARGETS_COLOR=!1,this.MORPHTARGETTEXTURE_HASPOSITIONS=!1,this.MORPHTARGETTEXTURE_HASNORMALS=!1,this.MORPHTARGETTEXTURE_HASTANGENTS=!1,this.MORPHTARGETTEXTURE_HASUVS=!1,this.MORPHTARGETTEXTURE_HASUV2S=!1,this.MORPHTARGETTEXTURE_HASCOLORS=!1,this.NUM_MORPH_INFLUENCERS=0,this.MORPHTARGETS_TEXTURE=!1,this.USEPHYSICALLIGHTFALLOFF=!1,this.USEGLTFLIGHTFALLOFF=!1,this.TWOSIDEDLIGHTING=!1,this.MIRRORED=!1,this.SHADOWFLOAT=!1,this.CLIPPLANE=!1,this.CLIPPLANE2=!1,this.CLIPPLANE3=!1,this.CLIPPLANE4=!1,this.CLIPPLANE5=!1,this.CLIPPLANE6=!1,this.POINTSIZE=!1,this.FOG=!1,this.LOGARITHMICDEPTH=!1,this.CAMERA_ORTHOGRAPHIC=!1,this.CAMERA_PERSPECTIVE=!1,this.AREALIGHTSUPPORTED=!0,this.FORCENORMALFORWARD=!1,this.SPECULARAA=!1,this.UNLIT=!1,this.DECAL_AFTER_DETAIL=!1,this.DEBUGMODE=0,this.USE_VERTEX_PULLING=!1,this.VERTEX_PULLING_USE_INDEX_BUFFER=!1,this.VERTEX_PULLING_INDEX_BUFFER_32BITS=!1,this.RIGHT_HANDED=!1,this.CLUSTLIGHT_SLICES=0,this.CLUSTLIGHT_BATCH=0,this.BRDF_V_HEIGHT_CORRELATED=!0,this.MS_BRDF_ENERGY_CONSERVATION=!0,this.SPHERICAL_HARMONICS=!0,this.SPECULAR_GLOSSINESS_ENERGY_CONSERVATION=!0,this.MIX_IBL_RADIANCE_WITH_IRRADIANCE=!0,this.LEGACY_SPECULAR_ENERGY_CONSERVATION=!1,this.BASE_DIFFUSE_MODEL=0,this.DIELECTRIC_SPECULAR_MODEL=1,this.CONDUCTOR_SPECULAR_MODEL=1,this.rebuild();}reset(){super.reset(),this.ALPHATESTVALUE="0.5",this.NORMALXYSCALE=!0;}}class qt extends Ct(Mt){}class r extends qt{get geometryTangentAngle(){return Math.atan2(this.geometryTangent.y,this.geometryTangent.x);}set geometryTangentAngle(t){this.geometryTangent=new oe(Math.cos(t),Math.sin(t));}get geometryCoatTangentAngle(){return Math.atan2(this.geometryCoatTangent.y,this.geometryCoatTangent.x);}set geometryCoatTangentAngle(t){this.geometryCoatTangent=new oe(Math.cos(t),Math.sin(t));}get sssIrradianceTexture(){return this._sssIrradianceTexture;}set sssIrradianceTexture(t){this._sssIrradianceTexture!==t&&(this._sssIrradianceTexture=t,this._markAllSubMeshesAsTexturesDirty());}get sssDepthTexture(){return this._sssDepthTexture;}set sssDepthTexture(t){this._sssDepthTexture!==t&&(this._sssDepthTexture=t,this._markAllSubMeshesAsTexturesDirty());}get hasTransparency(){return this.subsurfaceWeight>0||this.transmissionWeight>0;}get hasScattering(){return this.transmissionWeight>0&&this.transmissionDepth>0&&!this.transmissionScatter.equals(K.BlackReadOnly)||this.subsurfaceWeight>0;}get usePhysicalLightFalloff(){return this._lightFalloff===H.LIGHTFALLOFF_PHYSICAL;}set usePhysicalLightFalloff(t){t!==this.usePhysicalLightFalloff&&(this._markAllSubMeshesAsTexturesDirty(),t?this._lightFalloff=H.LIGHTFALLOFF_PHYSICAL:this._lightFalloff=H.LIGHTFALLOFF_STANDARD);}get useGLTFLightFalloff(){return this._lightFalloff===H.LIGHTFALLOFF_GLTF;}set useGLTFLightFalloff(t){t!==this.useGLTFLightFalloff&&(this._markAllSubMeshesAsTexturesDirty(),t?this._lightFalloff=H.LIGHTFALLOFF_GLTF:this._lightFalloff=H.LIGHTFALLOFF_STANDARD);}get backgroundRefractionTexture(){return this._backgroundRefractionTexture;}set backgroundRefractionTexture(t){this._backgroundRefractionTexture=t,this._markAllSubMeshesAsTexturesDirty();}get realTimeFiltering(){return this._realTimeFiltering;}set realTimeFiltering(t){this._realTimeFiltering=t,this.markAsDirty(1);}get realTimeFilteringQuality(){return this._realTimeFilteringQuality;}set realTimeFilteringQuality(t){this._realTimeFilteringQuality=t,this.markAsDirty(1);}get fuzzSampleNumber(){return this._fuzzSampleNumber;}set fuzzSampleNumber(t){this._fuzzSampleNumber=t,this.markAsDirty(1);}get canRenderToMRT(){return!0;}constructor(t,s,e=!1){var _this$getScene;super(t,s,void 0,e||r.ForceGLSL),this._baseWeight=new x("base_weight",1,"vBaseWeight",1),this._baseWeightTexture=new O("base_weight","baseWeight","BASE_WEIGHT"),this._baseColor=new x("base_color",K.White(),"vBaseColor",4),this._baseColorTexture=new O("base_color","baseColor","BASE_COLOR"),this._baseDiffuseRoughness=new x("base_diffuse_roughness",0,"vBaseDiffuseRoughness",1),this._baseDiffuseRoughnessTexture=new O("base_diffuse_roughness","baseDiffuseRoughness","BASE_DIFFUSE_ROUGHNESS"),this._baseMetalness=new x("base_metalness",0,"vReflectanceInfo",4,0),this._baseMetalnessTexture=new O("base_metalness","baseMetalness","BASE_METALNESS"),this._specularWeight=new x("specular_weight",1,"vReflectanceInfo",4,3),this._specularWeightTexture=new O("specular_weight","specularWeight","SPECULAR_WEIGHT"),this._specularColor=new x("specular_color",K.White(),"vSpecularColor",4),this._specularColorTexture=new O("specular_color","specularColor","SPECULAR_COLOR"),this._specularRoughness=new x("specular_roughness",.3,"vReflectanceInfo",4,1),this._specularRoughnessTexture=new O("specular_roughness","specularRoughness","SPECULAR_ROUGHNESS"),this._specularRoughnessAnisotropy=new x("specular_roughness_anisotropy",0,"vSpecularAnisotropy",3,2),this._specularRoughnessAnisotropyTexture=new O("specular_roughness_anisotropy","specularRoughnessAnisotropy","SPECULAR_ROUGHNESS_ANISOTROPY"),this._specularIor=new x("specular_ior",1.5,"vReflectanceInfo",4,2),this._transmissionWeight=new x("transmission_weight",0,"vTransmissionWeight",1),this._transmissionWeightTexture=new O("transmission_weight","transmissionWeight","TRANSMISSION_WEIGHT"),this._transmissionColor=new x("transmission_color",K.White(),"vTransmissionColor",3,0),this._transmissionColorTexture=new O("transmission_color","transmissionColor","TRANSMISSION_COLOR"),this._transmissionDepth=new x("transmission_depth",0,"vTransmissionDepth",1,0),this._transmissionDepthTexture=new O("transmission_depth","transmissionDepth","TRANSMISSION_DEPTH"),this._transmissionScatter=new x("transmission_scatter",K.Black(),"vTransmissionScatter",3,0),this._transmissionScatterTexture=new O("transmission_scatter","transmissionScatter","TRANSMISSION_SCATTER"),this._transmissionScatterAnisotropy=new x("transmission_scatter_anisotropy",0,"vTransmissionScatterAnisotropy",1,0),this._transmissionDispersionScale=new x("transmission_dispersion_scale",0,"vTransmissionDispersionScale",1,0),this._transmissionDispersionScaleTexture=new O("transmission_dispersion_scale","transmissionDispersionScale","TRANSMISSION_DISPERSION_SCALE"),this._transmissionDispersionAbbeNumber=new x("transmission_dispersion_abbe_number",20,"vTransmissionDispersionAbbeNumber",1,0),this._subsurfaceWeight=new x("subsurface_weight",0,"vSubsurfaceWeight",1,0,"SUBSURFACE_SLAB"),this._subsurfaceWeightTexture=new O("subsurface_weight","subsurfaceWeight","SUBSURFACE_WEIGHT"),this._subsurfaceColor=new x("subsurface_color",new K(.8,.8,.8),"vSubsurfaceColor",3,0,"SUBSURFACE_SLAB"),this._subsurfaceColorTexture=new O("subsurface_color","subsurfaceColor","SUBSURFACE_COLOR"),this._subsurfaceRadius=new x("subsurface_radius",1,"vSubsurfaceRadius",1,0,"SUBSURFACE_SLAB"),this._subsurfaceRadiusScale=new x("subsurface_radius_scale",new K(1,.5,.25),"vSubsurfaceRadiusScale",3,0,"SUBSURFACE_SLAB"),this._subsurfaceRadiusScaleTexture=new O("subsurface_radius_scale","subsurfaceRadiusScale","SUBSURFACE_RADIUS_SCALE"),this._subsurfaceScatterAnisotropy=new x("subsurface_scatter_anisotropy",0,"vSubsurfaceScatterAnisotropy",1,0,"SUBSURFACE_SLAB"),this._coatWeight=new x("coat_weight",0,"vCoatWeight",1,0),this._coatWeightTexture=new O("coat_weight","coatWeight","COAT_WEIGHT"),this._coatColor=new x("coat_color",K.White(),"vCoatColor",3,0),this._coatColorTexture=new O("coat_color","coatColor","COAT_COLOR"),this._coatRoughness=new x("coat_roughness",0,"vCoatRoughness",1,0),this._coatRoughnessTexture=new O("coat_roughness","coatRoughness","COAT_ROUGHNESS"),this._coatRoughnessAnisotropy=new x("coat_roughness_anisotropy",0,"vCoatRoughnessAnisotropy",1),this._coatRoughnessAnisotropyTexture=new O("coat_roughness_anisotropy","coatRoughnessAnisotropy","COAT_ROUGHNESS_ANISOTROPY"),this._coatIor=new x("coat_ior",1.5,"vCoatIor",1,0),this._coatDarkening=new x("coat_darkening",1,"vCoatDarkening",1,0),this._coatDarkeningTexture=new O("coat_darkening","coatDarkening","COAT_DARKENING"),this.useCoatRoughnessFromWeightTexture=!1,this._fuzzWeight=new x("fuzz_weight",0,"vFuzzWeight",1,0),this._fuzzWeightTexture=new O("fuzz_weight","fuzzWeight","FUZZ_WEIGHT"),this._fuzzColor=new x("fuzz_color",K.White(),"vFuzzColor",3,0),this._fuzzColorTexture=new O("fuzz_color","fuzzColor","FUZZ_COLOR"),this._fuzzRoughness=new x("fuzz_roughness",.5,"vFuzzRoughness",1,0),this._fuzzRoughnessTexture=new O("fuzz_roughness","fuzzRoughness","FUZZ_ROUGHNESS"),this._geometryThinWalled=new x("geometry_thin_walled",0,"vGeometryThinWalled",1,0),this._geometryNormalTexture=new O("geometry_normal","geometryNormal","GEOMETRY_NORMAL"),this._geometryTangent=new x("geometry_tangent",new oe(1,0),"vSpecularAnisotropy",3,0),this._geometryTangentTexture=new O("geometry_tangent","geometryTangent","GEOMETRY_TANGENT"),this._geometryCoatNormalTexture=new O("geometry_coat_normal","geometryCoatNormal","GEOMETRY_COAT_NORMAL"),this._geometryCoatTangent=new x("geometry_coat_tangent",new oe(1,0),"vGeometryCoatTangent",2,0),this._geometryCoatTangentTexture=new O("geometry_coat_tangent","geometryCoatTangent","GEOMETRY_COAT_TANGENT"),this._geometryOpacity=new x("geometry_opacity",1,"vBaseColor",4,3),this._geometryOpacityTexture=new O("geometry_opacity","geometryOpacity","GEOMETRY_OPACITY"),this._geometryThickness=new x("geometry_thickness",0,"vGeometryThickness",1,0),this._geometryThicknessTexture=new O("geometry_thickness","geometryThickness","GEOMETRY_THICKNESS"),this._emissionLuminance=new x("emission_luminance",1,"vLightingIntensity",4,1),this._emissionColor=new x("emission_color",K.Black(),"vEmissionColor",3),this._emissionColorTexture=new O("emission_color","emissionColor","EMISSION_COLOR"),this._thinFilmWeight=new x("thin_film_weight",0,"vThinFilmWeight",1,0),this._thinFilmWeightTexture=new O("thin_film_weight","thinFilmWeight","THIN_FILM_WEIGHT"),this._thinFilmThickness=new x("thin_film_thickness",.5,"vThinFilmThickness",2,0),this._thinFilmThicknessMin=new x("thin_film_thickness_min",0,"vThinFilmThickness",2,1),this._thinFilmThicknessTexture=new O("thin_film_thickness","thinFilmThickness","THIN_FILM_THICKNESS"),this._thinFilmIor=new x("thin_film_ior",1.4,"vThinFilmIor",1,0),this._ambientOcclusionTexture=new O("ambient_occlusion","ambientOcclusion","AMBIENT_OCCLUSION"),this._sssIrradianceTexture=null,this._sssDepthTexture=null,this._uniformsList={},this._uniformsArray=[],this._samplersList={},this._samplerDefines={},this.directIntensity=1,this.environmentIntensity=1,this.useSpecularWeightFromTextureAlpha=!1,this.forceAlphaTest=!1,this.alphaCutOff=.4,this.useAmbientOcclusionFromMetallicTextureRed=!1,this.useAmbientInGrayScale=!1,this.useObjectSpaceNormalMap=!1,this.useParallax=!1,this.useParallaxOcclusion=!1,this.parallaxScaleBias=.05,this.disableLighting=!1,this.forceIrradianceInFragment=!1,this.maxSimultaneousLights=4,this.invertNormalMapX=!1,this.invertNormalMapY=!1,this.twoSidedLighting=!1,this.useAlphaFresnel=!1,this.useLinearAlphaFresnel=!1,this.environmentBRDFTexture=null,this.forceNormalForward=!1,this.enableSpecularAntiAliasing=!1,this.useHorizonOcclusion=!0,this.useRadianceOcclusion=!0,this.unlit=!1,this.applyDecalMapAfterDetailMap=!1,this._lightingInfos=new qe(this.directIntensity,1,this.environmentIntensity,1),this._radianceTexture=null,this._useSpecularWeightFromAlpha=!1,this._useSpecularWeightFromSpecularColorTexture=!1,this._useSpecularRoughnessAnisotropyFromTangentTexture=!1,this._useCoatRoughnessAnisotropyFromTangentTexture=!1,this._useCoatRoughnessFromGreenChannel=!1,this._useGltfStyleAnisotropy=!1,this._useFuzzRoughnessFromTextureAlpha=!1,this._useHorizonOcclusion=!0,this._useRadianceOcclusion=!0,this._useAlphaFromBaseColorTexture=!1,this._useAmbientOcclusionFromMetallicTextureRed=!1,this._useRoughnessFromMetallicTextureGreen=!1,this._useMetallicFromMetallicTextureBlue=!1,this._useThinFilmThicknessFromTextureGreen=!1,this._useGeometryThicknessFromGreenChannel=!1,this._lightFalloff=H.LIGHTFALLOFF_PHYSICAL,this._useObjectSpaceNormalMap=!1,this._useParallax=!1,this._useParallaxOcclusion=!1,this._parallaxScaleBias=.05,this._disableLighting=!1,this._maxSimultaneousLights=4,this._invertNormalMapX=!1,this._invertNormalMapY=!1,this._twoSidedLighting=!1,this._alphaCutOff=.4,this._useAlphaFresnel=!1,this._useLinearAlphaFresnel=!1,this._environmentBRDFTexture=null,this._environmentFuzzBRDFTexture=null,this._backgroundRefractionTexture=null,this._forceIrradianceInFragment=!1,this._realTimeFiltering=!1,this._realTimeFilteringQuality=8,this._fuzzSampleNumber=4,this._forceNormalForward=!1,this._enableSpecularAntiAliasing=!1,this._renderTargets=new Qe(16),this._unlit=!1,this._applyDecalMapAfterDetailMap=!1,this._debugMode=0,this._shadersLoaded=!1,this._breakShaderLoadedCheck=!1,this._vertexPullingMetadata=null,this.debugMode=0,this.debugLimit=-1,this.debugFactor=1,this._cacheHasRenderTargetTextures=!1,this._transparencyMode=H.MATERIAL_OPAQUE,this.getScene()&&!((_this$getScene=this.getScene())!==null&&_this$getScene!==void 0&&_this$getScene.getEngine().isWebGPU)&&this.getScene().getEngine().webGLVersion<2&&re.Error("OpenPBRMaterial: WebGL 2.0 or above is required for this material."),r._noiseTextures[this.getScene().uniqueId]||(r._noiseTextures[this.getScene().uniqueId]=new ne(Je.GetAssetUrl("https://assets.babylonjs.com/core/blue_noise/blue_noise_rgb.png"),this.getScene(),!1,!0,1),this.getScene().onDisposeObservable.addOnce(()=>{var _r$_noiseTextures$thi;(_r$_noiseTextures$thi=r._noiseTextures[this.getScene().uniqueId])!==null&&_r$_noiseTextures$thi!==void 0&&_r$_noiseTextures$thi.dispose(),delete r._noiseTextures[this.getScene().uniqueId];})),this._attachImageProcessingConfiguration(null),this.getRenderTargetTextures=()=>(this._renderTargets.reset(),k.ReflectionTextureEnabled&&this._radianceTexture&&this._radianceTexture.isRenderTarget&&this._renderTargets.push(this._radianceTexture),k.RefractionTextureEnabled&&this._backgroundRefractionTexture&&this._backgroundRefractionTexture.isRenderTarget&&this._renderTargets.push(this._backgroundRefractionTexture),this._eventInfo.renderTargets=this._renderTargets,this._callbackPluginEventFillRenderTargetTextures(this._eventInfo),this._renderTargets),this._environmentBRDFTexture=et(this.getScene()),this._environmentFuzzBRDFTexture=Se(this.getScene()),this.prePassConfiguration=new Ie(),this._propertyList={};for(const n of Object.getOwnPropertyNames(this)){const a=this[n];a instanceof x&&(this._propertyList[n]=a);}Object.keys(this._propertyList).forEach(n=>{const a=this._propertyList[n];let f=this._uniformsList[a.targetUniformName];f?f.numComponents!==a.targetUniformComponentNum?re.Error(`Uniform ${a.targetUniformName} already exists of size ${f.numComponents}, but trying to set it to ${a.targetUniformComponentNum}.`):f.requiredDefine!==a.requiredDefine&&(f.requiredDefine=void 0):(f=new ae(a.targetUniformName,a.targetUniformComponentNum),f.requiredDefine=a.requiredDefine,this._uniformsList[a.targetUniformName]=f),f.firstLinkedKey===""&&(f.firstLinkedKey=a.name),f.linkedProperties[a.name]=a;}),this._uniformsArray=Object.values(this._uniformsList),this._samplersList={};for(const n of Object.getOwnPropertyNames(this)){const a=this[n];a instanceof O&&(this._samplersList[n]=a);}for(const n in this._samplersList){const f=this._samplersList[n].textureDefine;this._samplerDefines[f]={type:"boolean",default:!1},this._samplerDefines[f+"DIRECTUV"]={type:"number",default:0},this._samplerDefines[f+"_GAMMA"]={type:"boolean",default:!1};}this._baseWeight,this._baseWeightTexture,this._baseColor,this._baseColorTexture,this._baseDiffuseRoughness,this._baseDiffuseRoughnessTexture,this._baseMetalness,this._baseMetalnessTexture,this._specularWeight,this._specularWeightTexture,this._specularColor,this._specularColorTexture,this._specularRoughness,this._specularIor,this._specularRoughnessTexture,this._specularRoughnessAnisotropy,this._specularRoughnessAnisotropyTexture,this._transmissionWeight,this._transmissionWeightTexture,this._transmissionColor,this._transmissionColorTexture,this._transmissionDepth,this._transmissionDepthTexture,this._transmissionScatter,this._transmissionScatterTexture,this._transmissionScatterAnisotropy,this._transmissionDispersionScale,this._transmissionDispersionScaleTexture,this._transmissionDispersionAbbeNumber,this._subsurfaceWeight,this._subsurfaceWeightTexture,this._subsurfaceColor,this._subsurfaceColorTexture,this._subsurfaceRadius,this._subsurfaceRadiusScale,this._subsurfaceRadiusScaleTexture,this._subsurfaceScatterAnisotropy,this._coatWeight,this._coatWeightTexture,this._coatColor,this._coatColorTexture,this._coatRoughness,this._coatRoughnessTexture,this._coatRoughnessAnisotropy,this._coatRoughnessAnisotropyTexture,this._coatIor,this._coatDarkening,this._coatDarkeningTexture,this._fuzzWeight,this._fuzzWeightTexture,this._fuzzColor,this._fuzzColorTexture,this._fuzzRoughness,this._fuzzRoughnessTexture,this._geometryThinWalled,this._geometryNormalTexture,this._geometryTangent,this._geometryTangentTexture,this._geometryCoatNormalTexture,this._geometryCoatTangent,this._geometryCoatTangentTexture,this._geometryOpacity,this._geometryOpacityTexture,this._geometryThickness,this._geometryThicknessTexture,this._thinFilmWeight,this._thinFilmWeightTexture,this._thinFilmThickness,this._thinFilmThicknessMin,this._thinFilmThicknessTexture,this._thinFilmIor,this._emissionLuminance,this._emissionColor,this._emissionColorTexture,this._ambientOcclusionTexture;}get hasRenderTargetTextures(){return k.ReflectionTextureEnabled&&this._radianceTexture&&this._radianceTexture.isRenderTarget||k.RefractionTextureEnabled&&this._backgroundRefractionTexture&&this._backgroundRefractionTexture.isRenderTarget?!0:this._cacheHasRenderTargetTextures;}get isPrePassCapable(){return!this.disableDepthWrite;}getClassName(){return"OpenPBRMaterial";}get transparencyMode(){return this._transparencyMode;}set transparencyMode(t){this._transparencyMode!==t&&(this._transparencyMode=t,this._markAllSubMeshesAsTexturesAndMiscDirty());}_shouldUseAlphaFromBaseColorTexture(){return this._hasAlphaChannel()&&this._transparencyMode!==H.MATERIAL_OPAQUE&&!this.geometryOpacityTexture;}_hasAlphaChannel(){return this.baseColorTexture!=null&&this.baseColorTexture.hasAlpha&&this._useAlphaFromBaseColorTexture||this.geometryOpacityTexture!=null;}clone(t,s=!0,e=""){const i=xe.Clone(()=>new r(t,this.getScene()),this,{cloneTexturesOnlyOnce:s});return i.id=t,i.name=t,this.stencil.copyTo(i.stencil),this._clonePlugins(i,e),i;}serialize(){const t=super.serialize();return t.customType="BABYLON.OpenPBRMaterial",t;}static Parse(t,s,e){const i=xe.Parse(()=>new r(t.name,s),t,s,e);return t.stencil&&i.stencil.parse(t.stencil,s,e),H._ParsePlugins(t,i,s,e),i;}forceCompilation(t,s,e){const i=_objectSpread({clipPlane:!1,useInstances:!1},e);this._uniformBufferLayoutBuilt||this.buildUniformLayout(),this._callbackPluginEventGeneric(4,this._eventInfo),(()=>{if(this._breakShaderLoadedCheck)return;const a=new De(_objectSpread(_objectSpread({},this._eventInfo.defineNames||{}),this._samplerDefines||{})),f=this._prepareEffect(t,t,a,void 0,void 0,i.useInstances,i.clipPlane);this._onEffectCreatedObservable&&(se.effect=f,se.subMesh=null,this._onEffectCreatedObservable.notifyObservers(se)),f.isReady()?s&&s(this):f.onCompileObservable.add(()=>{s&&s(this);});})();}isReadyForSubMesh(t,s,e){this._uniformBufferLayoutBuilt||this.buildUniformLayout();const i=s._drawWrapper;if(i.effect&&this.isFrozen&&i._wasPreviouslyReady&&i._wasPreviouslyUsingInstances===e)return!0;s.materialDefines||(this._callbackPluginEventGeneric(4,this._eventInfo),s.materialDefines=new De(_objectSpread(_objectSpread({},this._eventInfo.defineNames||{}),this._samplerDefines||{})));const n=s.materialDefines;if(this._isReadyForSubMesh(s))return!0;const a=this.getScene(),f=a.getEngine();if(n._areTexturesDirty&&(this._eventInfo.hasRenderTargetTextures=!1,this._callbackPluginEventHasRenderTargetTextures(this._eventInfo),this._cacheHasRenderTargetTextures=this._eventInfo.hasRenderTargetTextures,a.texturesEnabled)){for(const M in this._samplersList){const N=this._samplersList[M];if(N.value&&!N.value.isReadyOrNotBlocking())return!1;}const A=this._getRadianceTexture();if(A&&k.ReflectionTextureEnabled){var _A$getInternalTexture;if(!A.isReadyOrNotBlocking())return!1;if(A.irradianceTexture){if(!A.irradianceTexture.isReadyOrNotBlocking())return!1;}else if(!A.sphericalPolynomial&&(_A$getInternalTexture=A.getInternalTexture())!==null&&_A$getInternalTexture!==void 0&&_A$getInternalTexture._sphericalPolynomialPromise)return!1;}if(this._environmentBRDFTexture&&k.ReflectionTextureEnabled&&!this._environmentBRDFTexture.isReady()||this._environmentFuzzBRDFTexture&&k.ReflectionTextureEnabled&&!this._environmentFuzzBRDFTexture.isReady()||this._backgroundRefractionTexture&&k.RefractionTextureEnabled&&!this._backgroundRefractionTexture.isReadyOrNotBlocking()||r._noiseTextures[a.uniqueId]&&!r._noiseTextures[a.uniqueId].isReady()||this._sssIrradianceTexture&&this._sssDepthTexture&&(!this._sssIrradianceTexture.isReady()||!this._sssDepthTexture.isReady()))return!1;}if(this._eventInfo.isReadyForSubMesh=!0,this._eventInfo.defines=n,this._eventInfo.subMesh=s,this._callbackPluginEventIsReadyForSubMesh(this._eventInfo),!this._eventInfo.isReadyForSubMesh||n._areImageProcessingDirty&&this._imageProcessingConfiguration&&!this._imageProcessingConfiguration.isReady())return!1;if(n.AREALIGHTUSED){for(let A=0;A<t.lightSources.length;A++)if(!t.lightSources[A]._isReady())return!1;}if(!f.getCaps().standardDerivatives&&!t.isVerticesDataPresent(w.NormalKind)&&(t.createNormals(!0),re.Warn("OpenPBRMaterial: Normals have been created for the mesh: "+t.name)),!tt(a,t,this._maxSimultaneousLights,this._disableLighting))return!1;const S=s.effect,L=n._areLightsDisposed,o=this._prepareEffect(t,s.getRenderingMesh(),n,this.onCompiled,this.onError,e,null);let T=!1;if(o)if(this._onEffectCreatedObservable&&(se.effect=o,se.subMesh=s,this._onEffectCreatedObservable.notifyObservers(se)),this.allowShaderHotSwapping&&S&&!o.isReady()){if(n.markAsUnprocessed(),T=this.isFrozen,L)return n._areLightsDisposed=!0,!1;}else a.resetCachedMaterial(),s.setEffect(o,n,this._materialContext);return!s.effect||!s.effect.isReady()?!1:(n._renderId=a.getRenderId(),i._wasPreviouslyReady=!T,i._wasPreviouslyUsingInstances=!!e,this._checkScenePerformancePriority(),!0);}buildUniformLayout(){const t=this._uniformBuffer;t.addUniform("vTangentSpaceParams",2),t.addUniform("vLightingIntensity",4),t.addUniform("pointSize",1),t.addUniform("vDebugMode",2),t.addUniform("renderTargetSize",2),t.addUniform("cameraInfo",4),t.addUniform("backgroundRefractionMatrix",16),t.addUniform("vBackgroundRefractionInfos",3),it(t,!0,!0,!0,!0,!0),Object.values(this._uniformsList).forEach(s=>{t.addUniform(s.name,s.numComponents);}),Object.values(this._samplersList).forEach(s=>{t.addUniform(s.samplerInfoName,2),t.addUniform(s.samplerMatrixName,16);}),super.buildUniformLayout();}bindPropertiesForSubMesh(t,s,e,i){if(this.geometryThickness===0)t.updateFloat("vGeometryThickness",0);else{i.getRenderingMesh().getWorldMatrix().decompose(X.Vector3[0]);const n=Math.max(Math.abs(X.Vector3[0].x),Math.abs(X.Vector3[0].y),Math.abs(X.Vector3[0].z));t.updateFloat("vGeometryThickness",this.geometryThickness*n);}}bindForSubMesh(t,s,e){var _s$bakedVertexAnimati;const i=this.getScene(),n=e.materialDefines;if(!n)return;const a=e.effect;if(!a)return;this._activeEffect=a,s.getMeshUniformBuffer().bindToEffect(a,"Mesh"),s.transferToEffect(t);const f=i.getEngine();this._uniformBuffer.bindToEffect(a,"Material"),this.prePassConfiguration.bindForSubMesh(this._activeEffect,i,s,t,this.isFrozen),he.Bind(f.currentRenderPassId,this._activeEffect,s,t,this);const S=i.activeCamera;S?this._uniformBuffer.updateFloat4("cameraInfo",S.minZ,S.maxZ,0,0):this._uniformBuffer.updateFloat4("cameraInfo",0,0,0,0),this._eventInfo.subMesh=e,this._callbackPluginEventHardBindForSubMesh(this._eventInfo),n.OBJECTSPACE_NORMALMAP&&(t.toNormalMatrix(this._normalMatrix),this.bindOnlyNormalMatrix(this._normalMatrix));const L=this._mustRebind(i,a,e,s.visibility);st(s,this._activeEffect,this.prePassConfiguration),this._vertexPullingMetadata&&rt(this._activeEffect,this._vertexPullingMetadata);const o=this._uniformBuffer;if(L){this.bindViewProjection(a);const T=this._getRadianceTexture();if(!o.useUbo||!this.isFrozen||!o.isSync||e._drawWrapper._forceRebindOnNextCall){if(i.texturesEnabled){for(const M in this._samplersList){const N=this._samplersList[M];N.value&&(o.updateFloat2(N.samplerInfoName,N.value.coordinatesIndex,N.value.level),nt(N.value,o,N.samplerPrefix));}this.geometryNormalTexture&&(i._mirroredCameraPosition?o.updateFloat2("vTangentSpaceParams",this._invertNormalMapX?1:-1,this._invertNormalMapY?1:-1):o.updateFloat2("vTangentSpaceParams",this._invertNormalMapX?-1:1,this._invertNormalMapY?-1:1)),at(i,n,o,K.White(),T,this.realTimeFiltering,!0,!0,!0,!0,!0);}this.pointsCloud&&o.updateFloat("pointSize",this.pointSize);const A=this._uniformsArray;for(let M=0,N=A.length;M<N;M++){const I=A[M];I.requiredDefine!==void 0&&!n[I.requiredDefine]||(I.numComponents===4?(I.populateVectorFromLinkedProperties(X.Vector4[0]),o.updateVector4(I.name,X.Vector4[0])):I.numComponents===3?(I.populateVectorFromLinkedProperties(X.Vector3[0]),o.updateVector3(I.name,X.Vector3[0])):I.numComponents===2?(I.populateVectorFromLinkedProperties(X.Vector2[0]),o.updateFloat2(I.name,X.Vector2[0].x,X.Vector2[0].y)):I.numComponents===1&&o.updateFloat(I.name,I.linkedProperties[I.firstLinkedKey].value));}this._lightingInfos.x=this.directIntensity,this._lightingInfos.y=this.emissionLuminance,this._lightingInfos.z=this.environmentIntensity*i.environmentIntensity,this._lightingInfos.w=1,o.updateVector4("vLightingIntensity",this._lightingInfos),o.updateFloat2("vDebugMode",this.debugLimit,this.debugFactor);}if(i.texturesEnabled){for(const A in this._samplersList){const M=this._samplersList[A];M.value&&o.setTexture(M.samplerName,M.value);}if(ot(i,n,o,T,this.realTimeFiltering),n.ENVIRONMENTBRDF&&o.setTexture("environmentBrdfSampler",this._environmentBRDFTexture),n.FUZZENVIRONMENTBRDF&&o.setTexture("environmentFuzzBrdfSampler",this._environmentFuzzBRDFTexture),n.REFRACTED_BACKGROUND&&(o.setTexture("backgroundRefractionSampler",this._backgroundRefractionTexture),o.updateMatrix("backgroundRefractionMatrix",this._backgroundRefractionTexture.getReflectionTextureMatrix()),X.Vector3[1].set(Math.log2(this._backgroundRefractionTexture.getSize().width),0,0),o.updateVector3("vBackgroundRefractionInfos",X.Vector3[1])),(n.ANISOTROPIC||n.FUZZ||n.REFRACTED_BACKGROUND||n.USE_IRRADIANCE_TEXTURE_FOR_SCATTERING)&&o.setTexture("blueNoiseSampler",r._noiseTextures[this.getScene().uniqueId]),n.USE_IRRADIANCE_TEXTURE_FOR_SCATTERING&&this.sssIrradianceTexture&&this.sssDepthTexture){const A=this.sssIrradianceTexture.getSize().width,M=this.sssIrradianceTexture.getSize().height;o.setTexture("sceneIrradianceSampler",this.sssIrradianceTexture),o.setTexture("sceneDepthSampler",this.sssDepthTexture),o.updateFloat2("renderTargetSize",A,M);}}this.getScene().useOrderIndependentTransparency&&this.needAlphaBlendingForMesh(s)&&this.getScene().depthPeelingRenderer.bind(a),this._eventInfo.subMesh=e,this._callbackPluginEventBindForSubMesh(this._eventInfo),Ue(this._activeEffect,this,i),this.bindEyePosition(a);}else i.getEngine()._features.needToAlwaysBindUniformBuffers&&(this._needToBindSceneUbo=!0);this.bindPropertiesForSubMesh(this._uniformBuffer,i,i.getEngine(),e),(L||!this.isFrozen)&&(i.lightsEnabled&&!this._disableLighting&&lt(i,s,this._activeEffect,n,this._maxSimultaneousLights),this.bindView(a),ut(i,s,this._activeEffect,!0),n.NUM_MORPH_INFLUENCERS&&Be(s,this._activeEffect),n.BAKED_VERTEX_ANIMATION_TEXTURE&&(_s$bakedVertexAnimati=s.bakedVertexAnimationManager)!==null&&_s$bakedVertexAnimati!==void 0&&_s$bakedVertexAnimati.bind(a,n.INSTANCES),this._imageProcessingConfiguration.bind(this._activeEffect),ft(n,this._activeEffect,i)),this._afterBind(s,this._activeEffect,e),o.update();}getAnimatables(){const t=super.getAnimatables();for(const s in this._samplersList){const e=this._samplersList[s];e.value&&e.value.animations&&e.value.animations.length>0&&t.push(e.value);}return this._radianceTexture&&this._radianceTexture.animations&&this._radianceTexture.animations.length>0&&t.push(this._radianceTexture),t;}getActiveTextures(){const t=super.getActiveTextures();for(const s in this._samplersList){const e=this._samplersList[s];e.value&&t.push(e.value);}return this._radianceTexture&&t.push(this._radianceTexture),t;}hasTexture(t){if(super.hasTexture(t))return!0;for(const s in this._samplersList)if(this._samplersList[s].value===t)return!0;return this._radianceTexture===t;}setPrePassRenderer(){return!1;}dispose(t,s){if(this._breakShaderLoadedCheck=!0,s){var _this$_radianceTextur;this._environmentBRDFTexture&&this.getScene().openPBREnvironmentBRDFTexture!==this._environmentBRDFTexture&&this._environmentBRDFTexture.dispose(),this._environmentFuzzBRDFTexture&&this.getScene().environmentFuzzBRDFTexture!==this._environmentFuzzBRDFTexture&&this._environmentFuzzBRDFTexture.dispose(),this._backgroundRefractionTexture=null;for(const e in this._samplersList){var _this$_samplersList$e;(_this$_samplersList$e=this._samplersList[e].value)===null||_this$_samplersList$e===void 0||_this$_samplersList$e.dispose();}(_this$_radianceTextur=this._radianceTexture)===null||_this$_radianceTextur===void 0||_this$_radianceTextur.dispose();}this._renderTargets.dispose(),this._imageProcessingConfiguration&&this._imageProcessingObserver&&this._imageProcessingConfiguration.onUpdateParameters.remove(this._imageProcessingObserver),super.dispose(t,s);}_getRadianceTexture(){return this._radianceTexture?this._radianceTexture:this.getScene().environmentTexture;}_prepareEffect(t,s,e,i=null,n=null,a=null,f=null){if(this._prepareDefines(t,s,e,a,f),!e.isDirty)return null;e.markAsProcessed();const L=this.getScene().getEngine(),o=new ct();let T=0;e.USESPHERICALINVERTEX&&o.addFallback(T++,"USESPHERICALINVERTEX"),e.FOG&&o.addFallback(T,"FOG"),e.SPECULARAA&&o.addFallback(T,"SPECULARAA"),e.POINTSIZE&&o.addFallback(T,"POINTSIZE"),e.LOGARITHMICDEPTH&&o.addFallback(T,"LOGARITHMICDEPTH"),e.PARALLAX&&o.addFallback(T,"PARALLAX"),e.PARALLAX_RHS&&o.addFallback(T,"PARALLAX_RHS"),e.PARALLAXOCCLUSION&&o.addFallback(T++,"PARALLAXOCCLUSION"),e.ENVIRONMENTBRDF&&o.addFallback(T++,"ENVIRONMENTBRDF"),e.TANGENT&&o.addFallback(T++,"TANGENT"),T=ht(e,o,this._maxSimultaneousLights,T),e.SPECULARTERM&&o.addFallback(T++,"SPECULARTERM"),e.USESPHERICALFROMREFLECTIONMAP&&o.addFallback(T++,"USESPHERICALFROMREFLECTIONMAP"),e.USEIRRADIANCEMAP&&o.addFallback(T++,"USEIRRADIANCEMAP"),e.NORMAL&&o.addFallback(T++,"NORMAL"),e.VERTEXCOLOR&&o.addFallback(T++,"VERTEXCOLOR"),e.MORPHTARGETS&&o.addFallback(T++,"MORPHTARGETS"),e.MULTIVIEW&&o.addFallback(0,"MULTIVIEW");const A=[w.PositionKind];e.NORMAL&&A.push(w.NormalKind),e.TANGENT&&A.push(w.TangentKind);for(let g=1;g<=6;++g)e["UV"+g]&&A.push(`uv${g===1?"":g}`);e.VERTEXCOLOR&&A.push(w.ColorKind),dt(A,t,e,o),_t(A,e),Tt(A,t,e),mt(A,t,e);let M="openpbr";const N=["world","view","viewProjection","projection","vEyePosition","inverseProjection","renderTargetSize","vLightsType","visibility","vFogInfos","vFogColor","pointSize","mBones","normalMatrix","vLightingIntensity","logarithmicDepthConstant","vTangentSpaceParams","boneTextureInfo","vDebugMode","morphTargetTextureInfo","morphTargetTextureIndices","cameraInfo","backgroundRefractionMatrix","vBackgroundRefractionInfos"];for(const g in this._uniformsList)N.push(g);const I=["environmentBrdfSampler","boneSampler","morphTargets","oitDepthSampler","oitFrontColorSampler","areaLightsLTC1Sampler","areaLightsLTC2Sampler"];e.FUZZENVIRONMENTBRDF&&I.push("environmentFuzzBrdfSampler"),e.REFRACTED_BACKGROUND&&I.push("backgroundRefractionSampler"),(e.ANISOTROPIC||e.FUZZ||e.REFRACTED_BACKGROUND||e.USE_IRRADIANCE_TEXTURE_FOR_SCATTERING)&&I.push("blueNoiseSampler"),e.USE_IRRADIANCE_TEXTURE_FOR_SCATTERING&&(I.push("sceneIrradianceSampler"),I.push("sceneDepthSampler"));for(const g in this._samplersList){const c=this._samplersList[g];I.push(c.samplerName),N.push(c.samplerInfoName),N.push(c.samplerMatrixName);}Ve(N,I,!0);const C=["Material","Scene","Mesh"],_={maxSimultaneousLights:this._maxSimultaneousLights,maxSimultaneousMorphTargets:e.NUM_MORPH_INFLUENCERS};if(this._eventInfo.fallbacks=o,this._eventInfo.fallbackRank=T,this._eventInfo.defines=e,this._eventInfo.uniforms=N,this._eventInfo.attributes=A,this._eventInfo.samplers=I,this._eventInfo.uniformBuffersNames=C,this._eventInfo.customCode=void 0,this._eventInfo.mesh=t,this._eventInfo.indexParameters=_,this._callbackPluginEventGeneric(128,this._eventInfo),he.AddUniformsAndSamplers(N,I),Ie.AddUniforms(N),we(N),this._useVertexPulling){const g=s===null||s===void 0?void 0:s.geometry;g&&(this._vertexPullingMetadata=pt(g),this._vertexPullingMetadata&&this._vertexPullingMetadata.forEach((c,Y)=>{N.push(`vp_${Y}_info`);}));}else this._vertexPullingMetadata=null;de&&(de.PrepareUniforms(N,e),de.PrepareSamplers(I,e)),Et({uniformsNames:N,uniformBuffersNames:C,samplers:I,defines:e,maxSimultaneousLights:this._maxSimultaneousLights});const m={};this.customShaderNameResolve&&(M=this.customShaderNameResolve(M,N,C,I,e,A,m));const F=e.toString(),y=L.createEffect(M,{attributes:A,uniformsNames:N,uniformBuffersNames:C,samplers:I,defines:F,fallbacks:o,onCompiled:i,onError:n,indexParameters:_,processFinalCode:m.processFinalCode,processCodeAfterIncludes:this._eventInfo.customCode,multiTarget:e.PREPASS,shaderLanguage:this._shaderLanguage,extraInitializationsAsync:this._shadersLoaded?void 0:async()=>{this.shaderLanguage===1?await Promise.all([ie(()=>__import("./bjs-scene171-openpbr.vertex-BGCoB-y3.js"),[],import.meta.url),ie(()=>__import("./bjs-scene171-openpbr.fragment-OEgEMmsC.js"),[],import.meta.url)]):await Promise.all([ie(()=>__import("./bjs-scene171-openpbr.vertex-BWd62hON.js"),[],import.meta.url),ie(()=>__import("./bjs-scene171-openpbr.fragment-Cww_hmqI.js"),[],import.meta.url)]),this._shadersLoaded=!0;}},L);return this._eventInfo.customCode=void 0,y;}_prepareDefines(t,s,e,i=null,n=null){const a=s.hasThinInstances,f=this.getScene(),S=f.getEngine();Rt(f,t,e,!0,this._maxSimultaneousLights,this._disableLighting),e._needNormals=!0,gt(f,e);const L=this.needAlphaBlendingForMesh(t)&&this.getScene().useOrderIndependentTransparency;if(At(f,e,this.canRenderToMRT&&!L),St(f,e,L),he.PrepareDefines(S.currentRenderPassId,t,e),e._areTexturesDirty){e._needUVs=!1;for(let o=1;o<=6;++o)e["MAINUV"+o]=!1;if(f.texturesEnabled){for(const A in this._samplersList){const M=this._samplersList[A];M.value?(It(M.value,e,M.textureDefine),e[M.textureDefine+"_GAMMA"]=M.value.gammaSpace):e[M.textureDefine]=!1;}const o=this._getRadianceTexture(),T=this._forceIrradianceInFragment||this.realTimeFiltering||this._twoSidedLighting||S.getCaps().maxVaryingVectors<=8||this._baseDiffuseRoughnessTexture!=null;if(Pe(f,o,e,this.realTimeFiltering,this.realTimeFilteringQuality,!T),this._baseMetalnessTexture&&(e.AOSTOREINMETALMAPRED=this._useAmbientOcclusionFromMetallicTextureRed),e.SPECULAR_WEIGHT_IN_ALPHA=this._useSpecularWeightFromAlpha,e.SPECULAR_WEIGHT_FROM_SPECULAR_COLOR_TEXTURE=this._useSpecularWeightFromSpecularColorTexture,e.SPECULAR_ROUGHNESS_ANISOTROPY_FROM_TANGENT_TEXTURE=this._useSpecularRoughnessAnisotropyFromTangentTexture,e.COAT_ROUGHNESS_ANISOTROPY_FROM_TANGENT_TEXTURE=this._useCoatRoughnessAnisotropyFromTangentTexture,e.COAT_ROUGHNESS_FROM_GREEN_CHANNEL=this._useCoatRoughnessFromGreenChannel,e.SPECULAR_ROUGHNESS_FROM_METALNESS_TEXTURE_GREEN=this._useRoughnessFromMetallicTextureGreen,e.FUZZ_ROUGHNESS_FROM_TEXTURE_ALPHA=this._useFuzzRoughnessFromTextureAlpha,e.BASE_METALNESS_FROM_METALNESS_TEXTURE_BLUE=this._useMetallicFromMetallicTextureBlue,e.THIN_FILM_THICKNESS_FROM_THIN_FILM_TEXTURE=this._useThinFilmThicknessFromTextureGreen,e.GEOMETRY_THICKNESS_FROM_GREEN_CHANNEL=this._useGeometryThicknessFromGreenChannel,this.geometryNormalTexture?(this._useParallax&&this.baseColorTexture&&k.DiffuseTextureEnabled?(e.PARALLAX=!0,e.PARALLAX_RHS=f.useRightHandedSystem,e.PARALLAXOCCLUSION=!!this._useParallaxOcclusion):e.PARALLAX=!1,e.OBJECTSPACE_NORMALMAP=this._useObjectSpaceNormalMap):(e.PARALLAX=!1,e.PARALLAX_RHS=!1,e.PARALLAXOCCLUSION=!1,e.OBJECTSPACE_NORMALMAP=!1),this._environmentBRDFTexture&&k.ReflectionTextureEnabled?(e.ENVIRONMENTBRDF=!0,e.ENVIRONMENTBRDF_RGBD=this._environmentBRDFTexture.isRGBD):(e.ENVIRONMENTBRDF=!1,e.ENVIRONMENTBRDF_RGBD=!1),this._environmentFuzzBRDFTexture?e.FUZZENVIRONMENTBRDF=!0:e.FUZZENVIRONMENTBRDF=!1,this.hasTransparency){e.REFRACTED_BACKGROUND=!!this._backgroundRefractionTexture&&k.RefractionTextureEnabled,e.REFRACTED_LIGHTS=!0;const A=this._getRadianceTexture();A?(e.REFRACTED_ENVIRONMENT=k.RefractionTextureEnabled,e.REFRACTED_ENVIRONMENT_OPPOSITEZ=this.getScene().useRightHandedSystem?!A.invertZ:A.invertZ,e.REFRACTED_ENVIRONMENT_LOCAL_CUBE=A.isCube&&A.boundingBoxSize):e.REFRACTED_ENVIRONMENT=!1;}else e.REFRACTED_BACKGROUND=!1,e.REFRACTED_LIGHTS=!1,e.REFRACTED_ENVIRONMENT=!1;this._shouldUseAlphaFromBaseColorTexture()?e.ALPHA_FROM_BASE_COLOR_TEXTURE=!0:e.ALPHA_FROM_BASE_COLOR_TEXTURE=!1;}this._lightFalloff===H.LIGHTFALLOFF_STANDARD?(e.USEPHYSICALLIGHTFALLOFF=!1,e.USEGLTFLIGHTFALLOFF=!1):this._lightFalloff===H.LIGHTFALLOFF_GLTF?(e.USEPHYSICALLIGHTFALLOFF=!1,e.USEGLTFLIGHTFALLOFF=!0):(e.USEPHYSICALLIGHTFALLOFF=!0,e.USEGLTFLIGHTFALLOFF=!1),!this.backFaceCulling&&this._twoSidedLighting?e.TWOSIDEDLIGHTING=!0:e.TWOSIDEDLIGHTING=!1,e.MIRRORED=!!f._mirroredCameraPosition,e.SPECULARAA=S.getCaps().standardDerivatives&&this._enableSpecularAntiAliasing;}if((e._areTexturesDirty||e._areMiscDirty)&&(e.ALPHATESTVALUE=`${this._alphaCutOff}${this._alphaCutOff%1===0?".":""}`,e.PREMULTIPLYALPHA=this.alphaMode===7||this.alphaMode===8,e.ALPHABLEND=this.needAlphaBlendingForMesh(t)),e._areImageProcessingDirty&&this._imageProcessingConfiguration&&this._imageProcessingConfiguration.prepareDefines(e),e.FORCENORMALFORWARD=this._forceNormalForward,e.RADIANCEOCCLUSION=this._useRadianceOcclusion,e.HORIZONOCCLUSION=this._useHorizonOcclusion,(this.specularRoughnessAnisotropy>0||this.coatRoughnessAnisotropy>0)&&r._noiseTextures[f.uniqueId]&&k.ReflectionTextureEnabled?(e.ANISOTROPIC=!0,t.isVerticesDataPresent(w.TangentKind)||(e._needUVs=!0,e.MAINUV1=!0),this._useGltfStyleAnisotropy&&(e.USE_GLTF_STYLE_ANISOTROPY=!0),e.ANISOTROPIC_BASE=this.specularRoughnessAnisotropy>0,e.ANISOTROPIC_COAT=this.coatRoughnessAnisotropy>0):(e.ANISOTROPIC=!1,e.USE_GLTF_STYLE_ANISOTROPY=!1,e.ANISOTROPIC_BASE=!1,e.ANISOTROPIC_COAT=!1),e.THIN_FILM=this.thinFilmWeight>0,e.IRIDESCENCE=this.thinFilmWeight>0,e.DISPERSION=this.transmissionDispersionScale>0,e.SCATTERING=this.hasScattering,e.TRANSMISSION_SLAB=this.transmissionWeight>0,e.TRANSMISSION_SLAB_VOLUME=this.transmissionWeight>0&&this.transmissionDepth>0,e.SUBSURFACE_SLAB=this.subsurfaceWeight>0,!e.PREPASS&&(e.SUBSURFACE_SLAB||e.TRANSMISSION_SLAB_VOLUME)){let o=!1;if(!this.sssIrradianceTexture&&f.geometryBufferRenderer){const T=f.geometryBufferRenderer.getTextureIndex(v.IRRADIANCE_TEXTURE_TYPE);this.sssIrradianceTexture=f.geometryBufferRenderer.getGBuffer().textures[T],o=!0;}if(!this.sssDepthTexture&&f.geometryBufferRenderer){const T=f.geometryBufferRenderer.getTextureIndex(v.SCREENSPACE_DEPTH_TEXTURE_TYPE);this.sssDepthTexture=f.geometryBufferRenderer.getGBuffer().textures[T],o=!0;}this.sssIrradianceTexture&&this.sssDepthTexture&&(e.USE_IRRADIANCE_TEXTURE_FOR_SCATTERING=!0,o&&(e.USE_IRRADIANCE_TEXTURE_FOR_SCATTERING_GBUFFER=!0));}e.FUZZ=this.fuzzWeight>0&&k.ReflectionTextureEnabled,e.GEOMETRY_THIN_WALLED=this.geometryThinWalled!=0,e.FUZZ?(t.isVerticesDataPresent(w.TangentKind)||(e._needUVs=!0,e.MAINUV1=!0),this._environmentFuzzBRDFTexture=Se(this.getScene()),e.FUZZ_IBL_SAMPLES=this.fuzzSampleNumber):(this._environmentFuzzBRDFTexture=null,e.FUZZENVIRONMENTBRDF=!1,e.FUZZ_IBL_SAMPLES=0),e._areMiscDirty&&(xt(t,f,this._useLogarithmicDepth,this.pointsCloud,this.fogEnabled,this.needAlphaTestingForMesh(t),e,this._applyDecalMapAfterDetailMap,this._useVertexPulling,s,this._isVertexOutputInvariant),e.UNLIT=this._unlit||(this.pointsCloud||this.wireframe)&&!t.isVerticesDataPresent(w.NormalKind),e.DEBUGMODE=this._debugMode),vt(f,S,this,e,!!i,n,a),this._eventInfo.defines=e,this._eventInfo.mesh=t,this._callbackPluginEventPrepareDefinesBeforeAttributes(this._eventInfo),Lt(t,e,!0,!0,!0,this._transparencyMode!==H.MATERIAL_OPAQUE),this._callbackPluginEventPrepareDefines(this._eventInfo);}}r._noiseTextures={};r.ForceGLSL=!1;l([h("_markAllSubMeshesAsTexturesDirty","baseWeight")],r.prototype,"_baseWeight",void 0);l([h("_markAllSubMeshesAsTexturesDirty","baseWeightTexture")],r.prototype,"_baseWeightTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","baseColor")],r.prototype,"_baseColor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","baseColorTexture")],r.prototype,"_baseColorTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","baseDiffuseRoughness")],r.prototype,"_baseDiffuseRoughness",void 0);l([h("_markAllSubMeshesAsTexturesDirty","baseDiffuseRoughnessTexture")],r.prototype,"_baseDiffuseRoughnessTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","baseMetalness")],r.prototype,"_baseMetalness",void 0);l([h("_markAllSubMeshesAsTexturesDirty","baseMetalnessTexture")],r.prototype,"_baseMetalnessTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularWeight")],r.prototype,"_specularWeight",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularWeightTexture")],r.prototype,"_specularWeightTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularColor")],r.prototype,"_specularColor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularColorTexture")],r.prototype,"_specularColorTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularRoughness")],r.prototype,"_specularRoughness",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularRoughnessTexture")],r.prototype,"_specularRoughnessTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularRoughnessAnisotropy")],r.prototype,"_specularRoughnessAnisotropy",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularRoughnessAnisotropyTexture")],r.prototype,"_specularRoughnessAnisotropyTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","specularIor")],r.prototype,"_specularIor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionWeight")],r.prototype,"_transmissionWeight",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionWeightTexture")],r.prototype,"_transmissionWeightTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionColor")],r.prototype,"_transmissionColor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionColorTexture")],r.prototype,"_transmissionColorTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionDepth")],r.prototype,"_transmissionDepth",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionDepthTexture")],r.prototype,"_transmissionDepthTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionScatter")],r.prototype,"_transmissionScatter",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionScatterTexture")],r.prototype,"_transmissionScatterTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionScatterAnisotropy")],r.prototype,"_transmissionScatterAnisotropy",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionDispersionScale")],r.prototype,"_transmissionDispersionScale",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionDispersionScaleTexture")],r.prototype,"_transmissionDispersionScaleTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","transmissionDispersionAbbeNumber")],r.prototype,"_transmissionDispersionAbbeNumber",void 0);l([h("_markAllSubMeshesAsTexturesDirty","subsurfaceWeight")],r.prototype,"_subsurfaceWeight",void 0);l([h("_markAllSubMeshesAsTexturesDirty","subsurfaceWeightTexture")],r.prototype,"_subsurfaceWeightTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","subsurfaceColor")],r.prototype,"_subsurfaceColor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","subsurfaceColorTexture")],r.prototype,"_subsurfaceColorTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","subsurfaceRadius")],r.prototype,"_subsurfaceRadius",void 0);l([h("_markAllSubMeshesAsTexturesDirty","subsurfaceRadiusScale")],r.prototype,"_subsurfaceRadiusScale",void 0);l([h("_markAllSubMeshesAsTexturesDirty","subsurfaceRadiusScaleTexture")],r.prototype,"_subsurfaceRadiusScaleTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","subsurfaceScatterAnisotropy")],r.prototype,"_subsurfaceScatterAnisotropy",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatWeight")],r.prototype,"_coatWeight",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatWeightTexture")],r.prototype,"_coatWeightTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatColor")],r.prototype,"_coatColor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatColorTexture")],r.prototype,"_coatColorTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatRoughness")],r.prototype,"_coatRoughness",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatRoughnessTexture")],r.prototype,"_coatRoughnessTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatRoughnessAnisotropy")],r.prototype,"_coatRoughnessAnisotropy",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatRoughnessAnisotropyTexture")],r.prototype,"_coatRoughnessAnisotropyTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatIor")],r.prototype,"_coatIor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatDarkening")],r.prototype,"_coatDarkening",void 0);l([h("_markAllSubMeshesAsTexturesDirty","coatDarkeningTexture")],r.prototype,"_coatDarkeningTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","fuzzWeight")],r.prototype,"_fuzzWeight",void 0);l([h("_markAllSubMeshesAsTexturesDirty","fuzzWeightTexture")],r.prototype,"_fuzzWeightTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","fuzzColor")],r.prototype,"_fuzzColor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","fuzzColorTexture")],r.prototype,"_fuzzColorTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","fuzzRoughness")],r.prototype,"_fuzzRoughness",void 0);l([h("_markAllSubMeshesAsTexturesDirty","fuzzRoughnessTexture")],r.prototype,"_fuzzRoughnessTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryThinWalled")],r.prototype,"_geometryThinWalled",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryNormalTexture")],r.prototype,"_geometryNormalTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryTangent")],r.prototype,"_geometryTangent",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryTangentTexture")],r.prototype,"_geometryTangentTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryCoatNormalTexture")],r.prototype,"_geometryCoatNormalTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryCoatTangent")],r.prototype,"_geometryCoatTangent",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryCoatTangentTexture")],r.prototype,"_geometryCoatTangentTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryOpacity")],r.prototype,"_geometryOpacity",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryOpacityTexture")],r.prototype,"_geometryOpacityTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryThickness")],r.prototype,"_geometryThickness",void 0);l([h("_markAllSubMeshesAsTexturesDirty","geometryThicknessTexture")],r.prototype,"_geometryThicknessTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","emissionLuminance")],r.prototype,"_emissionLuminance",void 0);l([h("_markAllSubMeshesAsTexturesDirty","emissionColor")],r.prototype,"_emissionColor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","emissionColorTexture")],r.prototype,"_emissionColorTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","thinFilmWeight")],r.prototype,"_thinFilmWeight",void 0);l([h("_markAllSubMeshesAsTexturesDirty","thinFilmWeightTexture")],r.prototype,"_thinFilmWeightTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","thinFilmThickness")],r.prototype,"_thinFilmThickness",void 0);l([h("_markAllSubMeshesAsTexturesDirty","thinFilmThicknessMin")],r.prototype,"_thinFilmThicknessMin",void 0);l([h("_markAllSubMeshesAsTexturesDirty","thinFilmThicknessTexture")],r.prototype,"_thinFilmThicknessTexture",void 0);l([h("_markAllSubMeshesAsTexturesDirty","thinFilmIor")],r.prototype,"_thinFilmIor",void 0);l([h("_markAllSubMeshesAsTexturesDirty","ambientOcclusionTexture")],r.prototype,"_ambientOcclusionTexture",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"directIntensity",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"environmentIntensity",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useSpecularWeightFromTextureAlpha",void 0);l([D(),P("_markAllSubMeshesAsTexturesAndMiscDirty")],r.prototype,"forceAlphaTest",void 0);l([D(),P("_markAllSubMeshesAsTexturesAndMiscDirty")],r.prototype,"alphaCutOff",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useAmbientOcclusionFromMetallicTextureRed",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useAmbientInGrayScale",void 0);l([D()],r.prototype,"usePhysicalLightFalloff",null);l([D()],r.prototype,"useGLTFLightFalloff",null);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useObjectSpaceNormalMap",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useParallax",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useParallaxOcclusion",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"parallaxScaleBias",void 0);l([D(),P("_markAllSubMeshesAsLightsDirty")],r.prototype,"disableLighting",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"forceIrradianceInFragment",void 0);l([D(),P("_markAllSubMeshesAsLightsDirty")],r.prototype,"maxSimultaneousLights",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"invertNormalMapX",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"invertNormalMapY",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"twoSidedLighting",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useAlphaFresnel",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useLinearAlphaFresnel",void 0);l([P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"environmentBRDFTexture",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"forceNormalForward",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"enableSpecularAntiAliasing",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useHorizonOcclusion",void 0);l([D(),P("_markAllSubMeshesAsTexturesDirty")],r.prototype,"useRadianceOcclusion",void 0);l([D(),P("_markAllSubMeshesAsMiscDirty")],r.prototype,"unlit",void 0);l([D(),P("_markAllSubMeshesAsMiscDirty")],r.prototype,"applyDecalMapAfterDetailMap",void 0);l([P("_markAllSubMeshesAsMiscDirty")],r.prototype,"debugMode",void 0);l([D()],r.prototype,"transparencyMode",null);yt("BABYLON.OpenPBRMaterial",r);export{r as OpenPBRMaterial,De as OpenPBRMaterialDefines};