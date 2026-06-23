"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../../../Babylon-Lite/packages/babylon-lite/src/engine/typed-arrays.ts
  var F32, F64, U32, I32, U16, U8, U8C, DV;
  var init_typed_arrays = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/typed-arrays.ts"() {
      "use strict";
      F32 = Float32Array;
      F64 = Float64Array;
      U32 = Uint32Array;
      I32 = Int32Array;
      U16 = Uint16Array;
      U8 = Uint8Array;
      U8C = Uint8ClampedArray;
      DV = DataView;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/_matrix-allocator.ts
  function _defaultAllocate() {
    return new F32(16);
  }
  function allocateMat4() {
    return (_allocate ?? _defaultAllocate)();
  }
  function _setHpmAllocator(allocate) {
    _allocate = allocate;
  }
  var _allocate;
  var init_matrix_allocator = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/_matrix-allocator.ts"() {
      "use strict";
      init_typed_arrays();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/engine/gpu-flags.ts
  var TU, BU, SS, CW;
  var init_gpu_flags = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/gpu-flags.ts"() {
      "use strict";
      TU = globalThis.GPUTextureUsage;
      BU = globalThis.GPUBufferUsage;
      SS = globalThis.GPUShaderStage;
      CW = globalThis.GPUColorWrite;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/engine/render-target.ts
  function targetSignatureKey(desc) {
    return `${desc._colorFormat ?? "-"}|${desc._depthStencilFormat ?? "-"}|${desc._depthCompare ?? ""}|${desc._sampleCount}`;
  }
  function createRenderTarget(descriptor) {
    return {
      _descriptor: descriptor,
      _colorTexture: null,
      _colorView: null,
      _depthTexture: null,
      _depthView: null,
      _width: 0,
      _height: 0
    };
  }
  function buildRenderTarget(rt, engine) {
    if (rt._eager) {
      return;
    }
    disposeRenderTarget(rt);
    const desc = rt._descriptor;
    const { width, height } = resolveSize(desc);
    rt._width = width;
    rt._height = height;
    const device = engine._device;
    const allocColor = !!desc.format;
    if (allocColor) {
      rt._colorTexture = device.createTexture({
        label: desc.lbl,
        size: { width, height },
        format: desc.format,
        sampleCount: desc.samples,
        usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING | TU.COPY_SRC
      });
      rt._colorView = rt._colorTexture.createView();
    }
    if (desc.dFormat) {
      rt._depthTexture = device.createTexture({
        label: desc.lbl,
        size: { width, height },
        format: desc.dFormat,
        sampleCount: desc.samples,
        usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING
      });
      rt._depthView = rt._depthTexture.createView();
    }
  }
  function disposeRenderTarget(rt) {
    if (!rt || rt._eager) {
      return;
    }
    if (rt._colorTexture) {
      rt._colorTexture.destroy();
      rt._colorTexture = null;
      rt._colorView = null;
    }
    if (rt._depthTexture) {
      if (rt._ownsDepthTexture !== false) {
        rt._depthTexture.destroy();
      }
      rt._depthTexture = null;
      rt._depthView = null;
    }
    rt._width = 0;
    rt._height = 0;
  }
  function resolveSize(desc) {
    const size = desc.size;
    if ("canvas" in size) {
      const canvas = size.canvas;
      return { width: canvas.width, height: canvas.height };
    }
    return size;
  }
  var init_render_target = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/render-target.ts"() {
      "use strict";
      init_gpu_flags();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/engine/surface.ts
  function isDomCanvas(canvas) {
    return "clientWidth" in canvas;
  }
  function _buildSurface(engine, canvas, options) {
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("WebGPU context not available");
    }
    const format = options?.format ?? navigator.gpu.getPreferredCanvasFormat();
    const alphaMode = options?.alphaMode ?? "opaque";
    context.configure({ device: engine._device, format, alphaMode });
    const msaaSamples = options?.msaaSamples === 1 ? 1 : 4;
    const scRT = createRenderTarget({ lbl: "swapchain", format, samples: 1, size: { width: 0, height: 0 } });
    scRT._eager = true;
    return {
      engine,
      canvas,
      format,
      msaaSamples,
      scRT,
      maxDevicePixelRatio: options?.maxDevicePixelRatio ?? Infinity,
      _uniqueId: _nextSurfaceId++,
      _context: context,
      _alphaMode: alphaMode,
      _renderingContexts: []
    };
  }
  function _refreshScRT(surface) {
    const tex = surface._context.getCurrentTexture();
    const swap = surface.scRT;
    swap._colorTexture = tex;
    swap._colorView = tex.createView();
    swap._width = tex.width;
    swap._height = tex.height;
  }
  function resizeSurface(surface) {
    const canvas = surface.canvas;
    if (!isDomCanvas(canvas)) {
      return;
    }
    const clientWidth = canvas.clientWidth;
    const clientHeight = canvas.clientHeight;
    if (!(clientWidth > 0 && clientHeight > 0)) {
      return;
    }
    const scale = Math.min(globalThis.devicePixelRatio || 1, surface.maxDevicePixelRatio);
    const w = clientWidth * scale | 0;
    const h = clientHeight * scale | 0;
    setSurfaceSize(surface, w, h);
  }
  function setSurfaceSize(surface, widthPx, heightPx) {
    const canvas = surface.canvas;
    const w = widthPx | 0;
    const h = heightPx | 0;
    if (!(w > 0 && h > 0)) {
      return;
    }
    if (w === canvas.width && h === canvas.height) {
      return;
    }
    canvas.width = w;
    canvas.height = h;
    surface.scRT._width = w;
    surface.scRT._height = h;
    for (const c of surface._renderingContexts) {
      c._resize?.();
    }
  }
  var _nextSurfaceId;
  var init_surface = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/surface.ts"() {
      "use strict";
      init_render_target();
      _nextSurfaceId = 1;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/_mat4-storage-f64.ts
  var mat4_storage_f64_exports = {};
  __export(mat4_storage_f64_exports, {
    MAT4_STORAGE_F64_BUILD_TAG: () => MAT4_STORAGE_F64_BUILD_TAG,
    allocateF64Mat4: () => allocateF64Mat4
  });
  function allocateF64Mat4() {
    return new F64(16);
  }
  var MAT4_STORAGE_F64_BUILD_TAG;
  var init_mat4_storage_f64 = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/_mat4-storage-f64.ts"() {
      "use strict";
      init_typed_arrays();
      MAT4_STORAGE_F64_BUILD_TAG = "@@MAT4_STORAGE_F64@@";
      allocateF64Mat4[MAT4_STORAGE_F64_BUILD_TAG] = true;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/light/types.ts
  var MAX_LIGHTS, LIGHT_ENTRY_FLOATS;
  var init_types = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/light/types.ts"() {
      "use strict";
      MAX_LIGHTS = 16;
      LIGHT_ENTRY_FLOATS = 16;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/large-world/floating-origin.ts
  var floating_origin_exports = {};
  __export(floating_origin_exports, {
    applyLightFoOffset: () => applyLightFoOffset,
    getFloatingOriginOffset: () => getFloatingOriginOffset,
    lightFoVersion: () => lightFoVersion,
    wrapRenderableForFO: () => wrapRenderableForFO
  });
  function getFloatingOriginOffset(scene) {
    const cam = scene.camera;
    if (!cam) {
      return { x: 0, y: 0, z: 0 };
    }
    const w = cam.worldMatrix;
    return { x: w[12], y: w[13], z: w[14] };
  }
  function lightFoVersion(scene) {
    return scene.camera ? scene.camera.worldMatrixVersion : 0;
  }
  function applyLightFoOffset(data, scene) {
    const cam = scene.camera;
    const w = cam?.worldMatrix;
    if (!w) {
      return;
    }
    const ox = w[12];
    const oy = w[13];
    const oz = w[14];
    let count = 0;
    for (const light of scene.lights) {
      if (count >= MAX_LIGHTS) {
        break;
      }
      if (!light._writeLightUbo) {
        continue;
      }
      const o = 4 + count * LIGHT_ENTRY_FLOATS;
      const type = data[o + 3];
      if (type === 0 || type === 2) {
        const lw = light.worldMatrix;
        data[o] = lw[12] - ox;
        data[o + 1] = lw[13] - oy;
        data[o + 2] = lw[14] - oz;
      }
      count++;
    }
  }
  function wrapRenderableForFO(inner, scene, invalidate) {
    let _lastCameraVersion = -1;
    return () => {
      const cv = scene.camera ? scene.camera.worldMatrixVersion : -1;
      if (cv !== _lastCameraVersion) {
        invalidate();
        _lastCameraVersion = cv;
      }
      inner();
    };
  }
  var init_floating_origin = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/large-world/floating-origin.ts"() {
      "use strict";
      init_types();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/large-world/pack-mat4-with-offset.ts
  var pack_mat4_with_offset_exports = {};
  __export(pack_mat4_with_offset_exports, {
    makePackMeshWorld: () => makePackMeshWorld,
    packMat4IntoF32WithOffset: () => packMat4IntoF32WithOffset
  });
  function packMat4IntoF32WithOffset(view, mat, offsetFloats, srcOffsetFloats, offsetX, offsetY, offsetZ) {
    const src = mat;
    const s = srcOffsetFloats;
    const o = offsetFloats;
    view[o + 0] = src[s + 0];
    view[o + 1] = src[s + 1];
    view[o + 2] = src[s + 2];
    view[o + 3] = src[s + 3];
    view[o + 4] = src[s + 4];
    view[o + 5] = src[s + 5];
    view[o + 6] = src[s + 6];
    view[o + 7] = src[s + 7];
    view[o + 8] = src[s + 8];
    view[o + 9] = src[s + 9];
    view[o + 10] = src[s + 10];
    view[o + 11] = src[s + 11];
    view[o + 12] = src[s + 12] - offsetX;
    view[o + 13] = src[s + 13] - offsetY;
    view[o + 14] = src[s + 14] - offsetZ;
    view[o + 15] = src[s + 15];
  }
  function makePackMeshWorld(scene) {
    return (view, mat, offsetFloats, srcOffsetFloats) => {
      const cam = scene.camera;
      if (!cam) {
        packMat4IntoF32WithOffset(view, mat, offsetFloats, srcOffsetFloats, 0, 0, 0);
        return;
      }
      const w = cam.worldMatrix;
      packMat4IntoF32WithOffset(view, mat, offsetFloats, srcOffsetFloats, w[12], w[13], w[14]);
    };
  }
  var init_pack_mat4_with_offset = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/large-world/pack-mat4-with-offset.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/engine/engine.ts
  function isRenderingContextRegistered(surface, context) {
    return surface._renderingContexts.indexOf(context) !== -1;
  }
  function registerRenderingContext(surface, context) {
    if (surface._renderingContexts.indexOf(context) !== -1) {
      return false;
    }
    surface._renderingContexts.push(context);
    return true;
  }
  async function createEngine(canvas, options) {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) {
      throw new Error("WebGPU adapter not available");
    }
    const features = [];
    if (adapter.features.has("float32-filterable")) {
      features.push("float32-filterable");
    }
    for (const f of ["texture-compression-astc", "texture-compression-bc", "texture-compression-etc2", "timestamp-query"]) {
      if (adapter.features.has(f)) {
        features.push(f);
      }
    }
    const device = await adapter.requestDevice({ requiredFeatures: features, requiredLimits: options?.requiredLimits });
    const versionToLog = `Babylon Lite v${VERSION}`;
    console.log(`${versionToLog} - WebGPU engine`);
    if (isDomCanvas(canvas)) {
      canvas.setAttribute("data-engine", versionToLog);
    }
    const useHpm = options?.useHighPrecisionMatrix === true;
    const useFO = options?.useFloatingOrigin === true;
    if (useFO && !useHpm) {
      throw new Error("Babylon Lite: useFloatingOrigin requires useHighPrecisionMatrix on the engine.");
    }
    if (useHpm) {
      const { allocateF64Mat4: allocateF64Mat42 } = await Promise.resolve().then(() => (init_mat4_storage_f64(), mat4_storage_f64_exports));
      _setHpmAllocator(allocateF64Mat42);
    }
    let _wrapRenderableForFO;
    let _makePackMeshWorld;
    let _lightFoVersion;
    let _applyLightFoOffset;
    if (useFO) {
      const [{ wrapRenderableForFO: wrapRenderableForFO2, lightFoVersion: lightFoVersion2, applyLightFoOffset: applyLightFoOffset2 }, { makePackMeshWorld: makePackMeshWorld2 }] = await Promise.all([
        Promise.resolve().then(() => (init_floating_origin(), floating_origin_exports)),
        Promise.resolve().then(() => (init_pack_mat4_with_offset(), pack_mat4_with_offset_exports))
      ]);
      _wrapRenderableForFO = wrapRenderableForFO2;
      _makePackMeshWorld = makePackMeshWorld2;
      _lightFoVersion = lightFoVersion2;
      _applyLightFoOffset = applyLightFoOffset2;
    }
    const engine = { _device: device };
    const surfaces = [engine];
    Object.assign(
      engine,
      {
        engine,
        // self-reference: the engine IS its primary surface
        surfaces,
        // public readonly view of `_surfaces` (same underlying array)
        _surfaces: surfaces,
        _device: device,
        drawCallCount: 0,
        gpuFrameTimeMs: 0,
        useHighPrecisionMatrix: useHpm,
        useFloatingOrigin: useFO,
        _animFrameId: 0,
        _renderFn: null,
        _currentEncoder: void 0,
        _currentDelta: 0,
        _cbs: [],
        _wrapRenderableForFO,
        _makePackMeshWorld,
        _lightFoVersion,
        _applyLightFoOffset
      },
      _buildSurface(engine, canvas, options)
    );
    resizeSurface(engine);
    _refreshScRT(engine);
    return engine;
  }
  function resizeEngine(engine) {
    for (const surface of engine.surfaces) {
      resizeSurface(surface);
    }
  }
  function getRenderTargetSize(surface) {
    const c = surface.canvas;
    return { width: c.width, height: c.height };
  }
  function startEngine(engine) {
    return new Promise((resolve) => {
      let firstRafFrame = true;
      let lastTime = 0;
      engine._renderFn = (now) => {
        const delta = firstRafFrame ? 0 : lastTime > 0 ? now - lastTime : 16.667;
        lastTime = now;
        resizeEngine(engine);
        renderFrame(engine, delta);
        if (firstRafFrame) {
          firstRafFrame = false;
          resolve();
        }
        engine._animFrameId = requestAnimationFrame(engine._renderFn);
      };
      engine._animFrameId = requestAnimationFrame(engine._renderFn);
    });
  }
  function renderFrame(engine, delta) {
    const surfaces = engine.surfaces;
    let total = 0;
    for (let i = 0; i < surfaces.length; i++) {
      total += surfaces[i]._renderingContexts.length;
    }
    if (total === 0) {
      return;
    }
    const encoder = engine._device.createCommandEncoder({ label: "frame" });
    engine._currentEncoder = encoder;
    engine._currentDelta = delta;
    engine._gpuTimerBegin?.(encoder);
    let drawCalls = 0;
    for (let i = 0; i < surfaces.length; i++) {
      const surface = surfaces[i];
      surface._capturePreFrame?.(surface);
      _refreshScRT(surface);
      const ctxs = surface._renderingContexts;
      for (let j = 0; j < ctxs.length; j++) {
        const s = ctxs[j];
        s._update();
        drawCalls += s._drawCallsPre;
        drawCalls += s._record();
      }
    }
    const finalEncoder = engine._currentEncoder;
    for (let i = 0; i < surfaces.length; i++) {
      const surface = surfaces[i];
      surface._captureService?.(surface, finalEncoder);
    }
    engine._gpuTimerEnd?.(finalEncoder);
    engine._cbs[0] = finalEncoder.finish();
    engine._device.queue.submit(engine._cbs);
    engine.drawCallCount = drawCalls;
    engine._gpuTimerResolve?.();
  }
  var VERSION, _vis;
  var init_engine = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/engine.ts"() {
      "use strict";
      init_matrix_allocator();
      init_surface();
      VERSION = "0.1.0";
      _vis = 0;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/scene-material-swap.ts
  var scene_material_swap_exports = {};
  __export(scene_material_swap_exports, {
    processMaterialSwaps: () => processMaterialSwaps
  });
  function processMaterialSwaps(scene) {
    const q = scene._materialSwapQueue;
    const device = scene.surface.engine._device;
    for (const mesh of q) {
      const old = scene._meshDisposables.get(mesh);
      if (old) {
        scene._meshDisposables.delete(mesh);
        void device.queue.onSubmittedWorkDone().then(() => {
          try {
            for (const fn of old) {
              fn();
            }
          } catch {
          }
        }).catch(() => {
        });
      }
      const mat = mesh.material;
      const builder = mat?._buildGroup;
      if (!builder) {
        continue;
      }
      const rebuild = builder._rebuildSingle;
      if (!rebuild) {
        continue;
      }
      const renderable = rebuild(scene, mesh);
      let i = scene._renderables.length;
      while (i > 0 && scene._renderables[i - 1].order > renderable.order) {
        i--;
      }
      scene._renderables.splice(i, 0, renderable);
    }
    q.length = 0;
    scene._renderableVersion++;
  }
  var init_scene_material_swap = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/scene/scene-material-swap.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/mesh-scene-registry.ts
  function enqueueMaterialSwap(scene, mesh) {
    if (scene._materialSwapQueue.indexOf(mesh) >= 0) {
      return;
    }
    scene._materialSwapQueue.push(mesh);
    if (!scene._processSwaps) {
      void Promise.resolve().then(() => (init_scene_material_swap(), scene_material_swap_exports)).then((m) => {
        scene._processSwaps = m.processMaterialSwaps;
      });
    }
  }
  function installMaterialSetter(mesh) {
    let _mat = mesh.material;
    Object.defineProperty(mesh, "material", {
      get() {
        return _mat;
      },
      set(v) {
        if (v !== _mat) {
          _mat = v;
          const scenes = _meshScenes?.get(mesh);
          if (scenes) {
            for (const scene of scenes) {
              enqueueMaterialSwap(scene, mesh);
            }
          }
        }
      },
      configurable: true,
      enumerable: true
    });
  }
  function registerMeshScene(scene, mesh) {
    const map = _meshScenes ?? (_meshScenes = /* @__PURE__ */ new WeakMap());
    let scenes = map.get(mesh);
    if (!scenes) {
      map.set(mesh, scenes = /* @__PURE__ */ new Set());
      installMaterialSetter(mesh);
    }
    scenes.add(scene);
  }
  var _meshScenes;
  var init_mesh_scene_registry = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/scene/mesh-scene-registry.ts"() {
      "use strict";
      _meshScenes = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/frame-graph.ts
  function createFrameGraph(_engine) {
    const fg = {
      _tasks: [],
      _currentProcessedTask: null,
      build() {
        for (let i = 0; i < fg._tasks.length; i++) {
          const task = fg._tasks[i];
          task._passes.length = 0;
          fg._currentProcessedTask = task;
          task.record();
          fg._currentProcessedTask = null;
        }
        for (let i = 0; i < fg._tasks.length; i++) {
          const passes = fg._tasks[i]._passes;
          for (let j = 0; j < passes.length; j++) {
            passes[j]._initialize();
          }
        }
      },
      execute() {
        let drawCalls = 0;
        for (const task of fg._tasks) {
          if (task.execute) {
            drawCalls += task.execute();
          } else {
            for (const pass of task._passes) {
              drawCalls += pass._execute();
            }
          }
        }
        return drawCalls;
      },
      dispose() {
        for (const task of fg._tasks) {
          task.dispose();
        }
        fg._tasks.length = 0;
        fg._currentProcessedTask = null;
      }
    };
    return fg;
  }
  function _appendTask(fg, task) {
    fg._tasks.push(task);
  }
  var init_frame_graph = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/frame-graph.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-multiply-into.ts
  function mat4MultiplyInto(dst, d, a, i, b, j) {
    const a0 = a[i], a1 = a[i + 1], a2 = a[i + 2], a3 = a[i + 3];
    const a4 = a[i + 4], a5 = a[i + 5], a6 = a[i + 6], a7 = a[i + 7];
    const a8 = a[i + 8], a9 = a[i + 9], a10 = a[i + 10], a11 = a[i + 11];
    const a12 = a[i + 12], a13 = a[i + 13], a14 = a[i + 14], a15 = a[i + 15];
    let b0 = b[j], b1 = b[j + 1], b2 = b[j + 2], b3 = b[j + 3];
    dst[d] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
    dst[d + 1] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
    dst[d + 2] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
    dst[d + 3] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
    b0 = b[j + 4];
    b1 = b[j + 5];
    b2 = b[j + 6];
    b3 = b[j + 7];
    dst[d + 4] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
    dst[d + 5] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
    dst[d + 6] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
    dst[d + 7] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
    b0 = b[j + 8];
    b1 = b[j + 9];
    b2 = b[j + 10];
    b3 = b[j + 11];
    dst[d + 8] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
    dst[d + 9] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
    dst[d + 10] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
    dst[d + 11] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
    b0 = b[j + 12];
    b1 = b[j + 13];
    b2 = b[j + 14];
    b3 = b[j + 15];
    dst[d + 12] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
    dst[d + 13] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
    dst[d + 14] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
    dst[d + 15] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
  }
  var init_mat4_multiply_into = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-multiply-into.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-perspective-lh-to-ref.ts
  function mat4PerspectiveLHToRef(out, fov, aspect, near, far) {
    const tan = 1 / Math.tan(fov * 0.5);
    const range = far - near;
    out[0] = tan / aspect;
    out[5] = tan;
    out[10] = -near / range;
    out[11] = 1;
    out[14] = far * near / range;
  }
  var init_mat4_perspective_lh_to_ref = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-perspective-lh-to-ref.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/camera/camera.ts
  function getViewMatrix(camera) {
    const ver = camera.worldMatrixVersion;
    if (camera._viewVer === ver) {
      return camera._viewCache;
    }
    const v = camera._viewCache;
    const w = camera.worldMatrix;
    const useFO = camera._useFloatingOrigin;
    const cx = useFO ? 0 : w[12];
    const cy = useFO ? 0 : w[13];
    const cz = useFO ? 0 : w[14];
    v[0] = w[0];
    v[1] = w[4];
    v[2] = w[8];
    v[3] = 0;
    v[4] = w[1];
    v[5] = w[5];
    v[6] = w[9];
    v[7] = 0;
    v[8] = w[2];
    v[9] = w[6];
    v[10] = w[10];
    v[11] = 0;
    v[12] = -(w[0] * cx + w[1] * cy + w[2] * cz);
    v[13] = -(w[4] * cx + w[5] * cy + w[6] * cz);
    v[14] = -(w[8] * cx + w[9] * cy + w[10] * cz);
    v[15] = 1;
    camera._viewVer = ver;
    return v;
  }
  function getProjectionMatrix(camera, aspectRatio) {
    const ver = camera.worldMatrixVersion;
    if (camera._projVer === ver && camera._projAspect === aspectRatio) {
      return camera._projCache;
    }
    const p = camera._projCache;
    mat4PerspectiveLHToRef(p, camera.fov, aspectRatio, camera.nearPlane, camera.farPlane);
    camera._projVer = ver;
    camera._projAspect = aspectRatio;
    return p;
  }
  function getViewProjectionMatrix(camera, aspectRatio) {
    const ver = camera.worldMatrixVersion;
    if (camera._vpVer === ver && camera._vpAspect === aspectRatio) {
      return camera._vpCache;
    }
    const vp = camera._vpCache;
    mat4MultiplyInto(vp, 0, getProjectionMatrix(camera, aspectRatio), 0, getViewMatrix(camera), 0);
    camera._vpVer = ver;
    camera._vpAspect = aspectRatio;
    return vp;
  }
  function getCameraPosition(camera) {
    const w = camera.worldMatrix;
    return { x: w[12], y: w[13], z: w[14] };
  }
  function getEffectiveAspectRatio(camera, targetWidth, targetHeight) {
    const v = camera?.viewport;
    return targetWidth / targetHeight * (v ? v.width / v.height : 1);
  }
  var init_camera = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/camera/camera.ts"() {
      "use strict";
      init_mat4_multiply_into();
      init_mat4_perspective_lh_to_ref();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/render/scene-helpers.ts
  function getSceneBindGroupLayout(engine) {
    const device = engine._device;
    if (_cachedSceneBGL && _cachedDevice === device) {
      return _cachedSceneBGL;
    }
    _cachedDevice = device;
    _cachedSceneBGL = device.createBindGroupLayout({
      label: "scene",
      entries: [
        { binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: SS.FRAGMENT, buffer: { type: "uniform" } }
      ]
    });
    return _cachedSceneBGL;
  }
  var _cachedSceneBGL, _cachedDevice;
  var init_scene_helpers = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/render/scene-helpers.ts"() {
      "use strict";
      init_gpu_flags();
      _cachedSceneBGL = null;
      _cachedDevice = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/pack-mat4-into-f32.ts
  function packMat4IntoF32(view, mat, offsetFloats = 0, srcOffsetFloats = 0) {
    const src = mat;
    if (srcOffsetFloats === 0 && src.length === 16) {
      view.set(src, offsetFloats);
      return;
    }
    const s = srcOffsetFloats;
    const o = offsetFloats;
    view[o + 0] = src[s + 0];
    view[o + 1] = src[s + 1];
    view[o + 2] = src[s + 2];
    view[o + 3] = src[s + 3];
    view[o + 4] = src[s + 4];
    view[o + 5] = src[s + 5];
    view[o + 6] = src[s + 6];
    view[o + 7] = src[s + 7];
    view[o + 8] = src[s + 8];
    view[o + 9] = src[s + 9];
    view[o + 10] = src[s + 10];
    view[o + 11] = src[s + 11];
    view[o + 12] = src[s + 12];
    view[o + 13] = src[s + 13];
    view[o + 14] = src[s + 14];
    view[o + 15] = src[s + 15];
  }
  var init_pack_mat4_into_f32 = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/pack-mat4-into-f32.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/scene-uniforms-pack.ts
  function _packSceneUniforms(data, eng, scene, camera, aspect) {
    data.fill(0);
    const viewProj = getViewProjectionMatrix(camera, aspect);
    const viewMat = getViewMatrix(camera);
    const wm = camera.worldMatrix;
    packMat4IntoF32(data, viewProj, 0);
    packMat4IntoF32(data, viewMat, 16);
    if (eng.useFloatingOrigin) {
      data[32] = 0;
      data[33] = 0;
      data[34] = 0;
    } else {
      data[32] = wm[12];
      data[33] = wm[13];
      data[34] = wm[14];
    }
    data[87] = eng.canvas.width;
    data[36] = scene.envRotationY || 0;
    const envTextures = scene._envTextures;
    const img = scene.imageProcessing;
    data[76] = img.exposure;
    data[77] = img.contrast;
    data[78] = envTextures?.lodGenerationScale ?? 0.8;
    data[79] = +img.toneMappingEnabled;
    data[37] = eng.canvas.height;
  }
  var init_scene_uniforms_pack = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/scene-uniforms-pack.ts"() {
      "use strict";
      init_camera();
      init_pack_mat4_into_f32();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/resource/gpu-buffers.ts
  function align(n, to) {
    return n + to - 1 & ~(to - 1);
  }
  function createUniformBuffer(engine, data, label) {
    const device = engine._device;
    const buf = device.createBuffer({
      label,
      size: align(data.byteLength, 16),
      usage: BU.UNIFORM | BU.COPY_DST
    });
    device.queue.writeBuffer(buf, 0, data.buffer, data.byteOffset, data.byteLength);
    return buf;
  }
  function createEmptyUniformBuffer(engine, byteLength, label) {
    return engine._device.createBuffer({
      label,
      size: align(byteLength, 16),
      usage: BU.UNIFORM | BU.COPY_DST
    });
  }
  function createMappedBuffer(engine, data, usage) {
    const size = align(Math.max(data.byteLength, 4), 4);
    const buf = engine._device.createBuffer({
      size,
      usage: usage | BU.COPY_DST,
      mappedAtCreation: true
    });
    new U8(buf.getMappedRange()).set(new U8(data.buffer, data.byteOffset, data.byteLength));
    buf.unmap();
    return buf;
  }
  var init_gpu_buffers = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/resource/gpu-buffers.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/scene-uniforms-size.ts
  var SCENE_UBO_BYTES;
  var init_scene_uniforms_size = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/scene-uniforms-size.ts"() {
      "use strict";
      SCENE_UBO_BYTES = 368;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/render/lights-ubo.ts
  function getLightsUboSize() {
    return 16 + MAX_LIGHTS * LIGHT_ENTRY_FLOATS * 4;
  }
  function computeLightsVersion(lights) {
    let v = 0;
    for (const light of lights) {
      v += light._lightVersion ?? 0;
    }
    return v;
  }
  function fillLightsData(data, lights) {
    data.fill(0);
    let count = 0;
    const headerFloats = 4;
    for (const light of lights) {
      if (count >= MAX_LIGHTS) {
        break;
      }
      if (!light._writeLightUbo) {
        continue;
      }
      light._writeLightUbo(data, headerFloats + count * LIGHT_ENTRY_FLOATS);
      count++;
    }
    _countU32[0] = count;
    data[0] = _countF32[0];
  }
  function ensureSceneLightState(engine, scene) {
    let state = scene._lightGpuState;
    const byteSize = getLightsUboSize();
    if (state && state._byteSize === byteSize) {
      return state;
    }
    const registerDisposer = !state;
    state?._buffer.destroy();
    const scratch = new F32(byteSize / 4);
    fillLightsData(scratch, scene.lights);
    engine._applyLightFoOffset?.(scratch, scene);
    state = {
      _buffer: createUniformBuffer(engine, scratch),
      _scratch: scratch,
      _version: computeLightsVersion(scene.lights) + (engine._lightFoVersion?.(scene) ?? 0),
      _lightCount: scene.lights.length,
      _byteSize: byteSize
    };
    scene._lightGpuState = state;
    if (registerDisposer) {
      scene._disposables.push(() => {
        scene._lightGpuState?._buffer.destroy();
        scene._lightGpuState = void 0;
      });
    }
    return state;
  }
  function refreshSceneLightsUBO(engine, scene) {
    const state = ensureSceneLightState(engine, scene);
    const version = computeLightsVersion(scene.lights) + (engine._lightFoVersion?.(scene) ?? 0);
    if (version !== state._version || scene.lights.length !== state._lightCount) {
      state._version = version;
      state._lightCount = scene.lights.length;
      fillLightsData(state._scratch, scene.lights);
      engine._applyLightFoOffset?.(state._scratch, scene);
      engine._device.queue.writeBuffer(state._buffer, 0, state._scratch);
    }
    return state._buffer;
  }
  var _countU32, _countF32;
  var init_lights_ubo = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/render/lights-ubo.ts"() {
      "use strict";
      init_typed_arrays();
      init_types();
      init_gpu_buffers();
      _countU32 = new U32(1);
      _countF32 = new F32(_countU32.buffer);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/render-task.ts
  function createRenderTask(config, engine, scene) {
    const sc = scene;
    config.clrColor ?? (config.clrColor = { r: 0.2, g: 0.2, b: 0.3, a: 1 });
    config.clr ?? (config.clr = true);
    const desc = config.rt._descriptor;
    const targetSignature = {
      _colorFormat: desc.format,
      _depthStencilFormat: config.depth?._descriptor.dFormat ?? desc.dFormat,
      _depthCompare: desc._depthCompare,
      _sampleCount: desc.samples ?? 1
    };
    const sceneBGL = getSceneBindGroupLayout(engine);
    const sceneUBO = createEmptyUniformBuffer(engine, SCENE_UBO_BYTES);
    const lightsUBO = ensureSceneLightState(engine, sc)._buffer;
    const sceneBG = engine._device.createBindGroup({
      layout: sceneBGL,
      entries: [
        { binding: 0, resource: { buffer: sceneUBO } },
        { binding: 1, resource: { buffer: lightsUBO } }
      ]
    });
    const colorAttachment = { loadOp: "clear", storeOp: "store" };
    const updateContext = { targetWidth: 0, targetHeight: 0 };
    const task = {
      name: config.name,
      _config: config,
      engine,
      scene: sc,
      _passes: [],
      _autoFromScene: false,
      _renderables: [],
      _opaqueBindings: [],
      _directBindings: [],
      _transparentBindings: [],
      _opaqueBundles: [],
      _lastVersion: -1,
      _lastVis: 0,
      _renderPassDescriptor: { colorAttachments: [colorAttachment] },
      _colorAttachment: colorAttachment,
      _depthSrc: config.depth,
      _depthLoadOp: config.depth ? config.depth._eager ? "load" : "clear" : void 0,
      _sceneUBO: sceneUBO,
      _sceneBG: sceneBG,
      _lightsUBO: lightsUBO,
      _suData: new F32(SCENE_UBO_BYTES / 4),
      _su: [],
      _targetSignature: targetSignature,
      _pendingMeshes: [],
      addMesh(mesh, opts) {
        const material = opts?.material ?? mesh.material;
        if (!material) {
          return;
        }
        task._pendingMeshes.push({ mesh, material });
      },
      record() {
        if (task._autoFromScene) {
          task._renderables.length = 0;
        }
        resolvePendingMeshes(task, sc);
        task._autoFromScene = task._renderables.length === 0;
        if (task._autoFromScene) {
          task._renderables.push(...sc._renderables);
        }
        const rt = config.rt;
        buildRenderTarget(rt, engine);
        if (config.rst && (rt._descriptor.samples ?? 1) > 1) {
          buildRenderTarget(config.rst, engine);
        }
        if (config.depth && !config.depth._eager) {
          buildRenderTarget(config.depth, engine);
        }
        updateContext.targetWidth = rt._width;
        updateContext.targetHeight = rt._height;
        refreshTaskSceneBindGroup(task, engine);
        buildBindings(task, engine, targetSignature);
        buildRenderPassDescriptor(task, rt);
      },
      execute() {
        return executePass(task, engine, targetSignature, updateContext);
      },
      dispose() {
        task._passes.length = 0;
        disposeRenderTarget(config.rt);
        disposeRenderTarget(config.rst);
        disposeRenderTarget(config.depth);
        task._opaqueBindings.length = 0;
        task._directBindings.length = 0;
        task._transparentBindings.length = 0;
        task._renderables.length = 0;
        task._opaqueBundles.length = 0;
        task._sceneUBO.destroy();
      }
    };
    return task;
  }
  function resolvePendingMeshes(task, sc) {
    if (task._pendingMeshes.length === 0) {
      return;
    }
    for (const { mesh, material } of task._pendingMeshes) {
      const rebuild = material._buildGroup?._rebuildSingle;
      if (!rebuild) {
        throw new Error();
      }
      const renderable = rebuild(sc, mesh, material);
      if (!task._renderables.includes(renderable)) {
        task._renderables.push(renderable);
      }
    }
    task._pendingMeshes.length = 0;
  }
  function sortTransparentBindings(task, camera) {
    const arr = task._transparentBindings;
    if (arr.length <= 1 || !camera) {
      return;
    }
    const v = getViewMatrix(camera);
    for (const b of arr) {
      const wc = b.renderable._worldCenter;
      b._sortDistance = wc ? wc[0] * v[2] + wc[1] * v[6] + wc[2] * v[10] + v[14] : 0;
    }
    arr.sort((a, b) => b._sortDistance - a._sortDistance || a.renderable.order - b.renderable.order);
  }
  function buildBindings(task, eng, targetSignature) {
    const opaque = task._opaqueBindings;
    const direct = task._directBindings;
    const transparent = task._transparentBindings;
    opaque.length = 0;
    direct.length = 0;
    transparent.length = 0;
    for (const r of task._renderables) {
      const binding = r.bind(eng, targetSignature);
      if (r.isTransparent || r._transmissive) {
        transparent.push(binding);
      } else if (r._direct) {
        direct.push(binding);
      } else {
        opaque.push(binding);
      }
    }
    opaque.sort((a, b) => a.renderable.order - b.renderable.order);
    direct.sort((a, b) => a.renderable.order - b.renderable.order);
    task._opaqueBundles.length = 0;
    task._lastVersion = task.scene._renderableVersion;
  }
  function buildRenderPassDescriptor(task, rt) {
    const att = task._colorAttachment;
    att.view = rt._colorView;
    att.resolveTarget = task._config.rst?._colorView ?? void 0;
    task._renderPassDescriptor.colorAttachments = rt._colorView ? [att] : [];
    const depthSrc = task._depthSrc ?? rt;
    const depthView = depthSrc._depthView;
    let depthAttachment;
    if (depthView) {
      const dd = depthSrc._descriptor;
      const loadOp = task._depthLoadOp ?? "clear";
      depthAttachment = {
        view: depthView,
        depthClearValue: dd._depthClearValue ?? 0,
        depthLoadOp: loadOp,
        depthStoreOp: "store"
      };
      if (dd.dFormat?.includes("stencil")) {
        depthAttachment.stencilClearValue = 0;
        depthAttachment.stencilLoadOp = loadOp;
        depthAttachment.stencilStoreOp = "store";
      }
    }
    task._renderPassDescriptor.depthStencilAttachment = depthAttachment;
  }
  function prepareRenderTaskPass(task, eng, targetSignature, context) {
    const sc = task.scene;
    if (task._autoFromScene && task._lastVersion !== sc._renderableVersion) {
      task._renderables.length = 0;
      task._renderables.push(...sc._renderables);
      buildBindings(task, eng, targetSignature);
    }
    refreshTaskSceneBindGroup(task, eng);
    const camera = task._config.cam ?? sc.camera;
    sc._clusteredLightUpdater?.(camera, context.targetWidth, context.targetHeight);
    writePassSceneUBO(task, eng, sc, camera);
    refreshSceneLightsUBO(eng, sc);
    context._camera = camera;
    updateBindings(task._opaqueBindings, context);
    updateBindings(task._directBindings, context);
    updateBindings(task._transparentBindings, context);
    sortTransparentBindings(task, camera);
  }
  function executePass(task, eng, targetSignature, context) {
    const sc = task.scene;
    const sampleCount = targetSignature._sampleCount;
    prepareRenderTaskPass(task, eng, targetSignature, context);
    const att = task._colorAttachment;
    const cfg = task._config;
    if (cfg.rt._colorView) {
      if (cfg.rt === eng.scRT) {
        att.view = cfg.rt._colorView;
      }
      att.resolveTarget = cfg.rst?._colorView ?? void 0;
      att.clearValue = task._autoFromScene ? sc.clearColor : cfg.clrColor;
      att.loadOp = cfg.clr ? "clear" : "load";
    }
    if (task._executeWithTransmission) {
      return task._executeWithTransmission(sampleCount);
    }
    const pass = eng._currentEncoder.beginRenderPass(task._renderPassDescriptor);
    const draws = executePassBody(task, pass);
    pass.end();
    return draws;
  }
  function executePassBody(task, pass) {
    const eng = task.engine;
    const cfg = task._config;
    const rt = cfg.rt;
    const scene = task.scene;
    const opaqueBindings = task._opaqueBindings;
    const opaqueBundles = task._opaqueBundles;
    const sceneBG = task._sceneBG;
    const camera = cfg.cam ?? scene.camera;
    const v = camera?.viewport;
    if (v) {
      const rw = rt._width;
      const rh = rt._height;
      const x = Math.floor(v.x * rw);
      const y = Math.floor((1 - v.y - v.height) * rh);
      const w = Math.ceil((v.x + v.width) * rw) - x;
      const h = Math.ceil((1 - v.y) * rh) - y;
      pass.setViewport(x, y, w, h, 0, 1);
      pass.setScissorRect(x, y, w, h);
    }
    pass.setBindGroup(0, sceneBG);
    if (task._lastVersion !== scene._renderableVersion || task._lastVis !== _vis || opaqueBundles.length === 0) {
      const desc = rt._descriptor;
      const be = eng._device.createRenderBundleEncoder({
        colorFormats: desc.format ? [desc.format] : [],
        // Use the task's target signature, not the RT descriptor: a depth
        // override (config.depth) supplies the depth format externally, so
        // the cached opaque pipelines are built with it while the colour RT
        // carries no depthStencilFormat of its own. The bundle encoder's
        // attachment state must match those pipelines exactly.
        depthStencilFormat: task._targetSignature._depthStencilFormat,
        sampleCount: desc.samples ?? 1
      });
      be.setBindGroup(0, sceneBG);
      drawList(be, opaqueBindings, eng);
      opaqueBundles[0] = be.finish();
      task._lastVersion = scene._renderableVersion;
      task._lastVis = _vis;
    }
    let draws = opaqueBindings.length;
    pass.executeBundles(opaqueBundles);
    pass.setBindGroup(0, sceneBG);
    draws += drawList(pass, task._directBindings, eng);
    draws += drawList(pass, task._transparentBindings, eng);
    return draws;
  }
  function refreshTaskSceneBindGroup(task, eng) {
    const lightsUBO = ensureSceneLightState(eng, task.scene)._buffer;
    if (lightsUBO === task._lightsUBO) {
      return;
    }
    task._lightsUBO = lightsUBO;
    task._sceneBG = eng._device.createBindGroup({
      layout: getSceneBindGroupLayout(eng),
      entries: [
        { binding: 0, resource: { buffer: task._sceneUBO } },
        { binding: 1, resource: { buffer: lightsUBO } }
      ]
    });
    task._opaqueBundles.length = 0;
    task._lastVersion = -1;
  }
  function writePassSceneUBO(task, eng, scene, camera) {
    if (!camera) {
      return;
    }
    const v = camera.viewport;
    const rt = task._config.rt;
    const aspect = (task._config.cs ? eng.canvas.width / eng.canvas.height : rt._width / rt._height) * (v ? v.width / v.height : 1);
    const fog = scene.fog;
    const img = scene.imageProcessing;
    const envRotationY = scene.envRotationY || 0;
    const wv = camera.worldMatrixVersion;
    const s = task._su;
    if (s[0] === camera && s[1] === fog && s[2] === wv && s[3] === aspect && s[4] === envRotationY && s[5] === img.exposure && s[6] === img.contrast) {
      return;
    }
    s[0] = camera;
    s[1] = fog;
    s[2] = wv;
    s[3] = aspect;
    s[4] = envRotationY;
    s[5] = img.exposure;
    s[6] = img.contrast;
    const data = task._suData;
    _packSceneUniforms(data, eng, scene, camera, aspect);
    const contribs = scene._sceneUboContributors;
    if (contribs) {
      for (const c of contribs) {
        c(data, scene);
      }
    }
    eng._device.queue.writeBuffer(task._sceneUBO, 0, data);
  }
  function updateBindings(list, context) {
    for (const b of list) {
      b.update?.(context);
    }
  }
  function drawList(enc, list, engine) {
    let lp = null;
    let draws = 0;
    for (const b of list) {
      const mesh = b.renderable.mesh;
      if (mesh && mesh.visible === false) {
        continue;
      }
      if (b.pipeline !== lp) {
        enc.setPipeline(b.pipeline);
        lp = b.pipeline;
      }
      draws += b.draw(enc, engine);
    }
    return draws;
  }
  var init_render_task = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/render-task.ts"() {
      "use strict";
      init_typed_arrays();
      init_engine();
      init_render_target();
      init_camera();
      init_scene_helpers();
      init_scene_uniforms_pack();
      init_gpu_buffers();
      init_scene_uniforms_size();
      init_lights_ubo();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/swapchain-overlay.ts
  var swapchain_overlay_exports = {};
  __export(swapchain_overlay_exports, {
    configureSwapchainOverlayScene: () => configureSwapchainOverlayScene
  });
  function getDefaultSwapchainTask(scene, surface) {
    for (const task of scene._frameGraph._tasks) {
      const ptask = task;
      if (!ptask?._config || !ptask._colorAttachment) {
        continue;
      }
      const renderTask = task;
      if (renderTask._config.rt === surface.scRT || renderTask._config.rst === surface.scRT) {
        return renderTask;
      }
    }
    return null;
  }
  function configureSwapchainOverlayScene(surface, overlay) {
    const base = surface._renderingContexts[surface._renderingContexts.length - 1];
    if (!base?._frameGraph) {
      return;
    }
    const baseTask = getDefaultSwapchainTask(base, surface);
    const overlayTask = getDefaultSwapchainTask(overlay, surface);
    if (!baseTask || !overlayTask) {
      return;
    }
    overlayTask._config.clr = false;
    overlay._beforeRender.unshift(() => {
      if (surface.msaaSamples > 1) {
        const view = baseTask._config.rt._colorView;
        if (view) {
          overlayTask._colorAttachment.view = view;
        }
      }
    });
  }
  var init_swapchain_overlay = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/scene/swapchain-overlay.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/scene-core.ts
  function createSceneContext(surface, options) {
    const eng = surface.engine;
    const ctxLocal = {
      surface,
      clearColor: { r: 0.2, g: 0.2, b: 0.3, a: 1 },
      camera: null,
      lights: [],
      meshes: [],
      animationGroups: [],
      fog: null,
      clipPlane: null,
      shadowGenerators: [],
      imageProcessing: { exposure: 1, contrast: 1, toneMappingEnabled: false },
      _renderables: [],
      _prePasses: [],
      _gsMeshes: [],
      _uniformUpdaters: [],
      fixedDeltaMs: 0,
      _beforeRender: [],
      _deferredBuilders: [],
      _groups: /* @__PURE__ */ new Map(),
      _disposables: [],
      _meshDisposables: /* @__PURE__ */ new Map(),
      _materialSwapQueue: [],
      _renderableVersion: 0,
      _built: false,
      _drawCallsPre: 0,
      _update() {
        if (eng.useFloatingOrigin && ctx.camera && !ctx.camera._useFloatingOrigin) {
          ctx.camera._useFloatingOrigin = true;
          ctx.camera._viewVer = -1;
          ctx.camera._vpVer = -1;
        }
        const d = ctx.fixedDeltaMs > 0 ? ctx.fixedDeltaMs : eng._currentDelta;
        const encoder = eng._currentEncoder;
        let draws = 0;
        for (const cb of ctx._beforeRender) {
          cb(d);
        }
        if (ctx._materialSwapQueue.length > 0) {
          ctx._processSwaps?.(ctx);
        }
        for (const pp of ctx._prePasses) {
          draws += pp.execute(encoder, eng);
        }
        for (const u of ctx._uniformUpdaters) {
          u.update(eng);
        }
        ctx._drawCallsPre = draws;
      },
      _record() {
        return ctx._frameGraph.execute();
      },
      _resize() {
        ctx._frameGraph.build();
      }
    };
    const ctx = ctxLocal;
    const fg = createFrameGraph(eng);
    ctx._frameGraph = fg;
    if (options?.defaultRenderTask !== false) {
      const msaa = surface.msaaSamples > 1;
      const rt = msaa ? createRenderTarget({ lbl: "scene-color", format: surface.format, dFormat: "depth24plus-stencil8", samples: surface.msaaSamples, size: surface }) : surface.scRT;
      const depth = msaa ? void 0 : createRenderTarget({ lbl: "scene-depth", dFormat: "depth24plus-stencil8", samples: 1, size: surface });
      _appendTask(fg, createRenderTask({ name: "scene", rt, rst: msaa ? surface.scRT : void 0, depth, clrColor: ctx.clearColor }, eng, ctx));
    }
    ctx._disposables.push(() => fg.dispose());
    return ctx;
  }
  function addToScene(scene, entity) {
    const ctx = scene;
    if ("entities" in entity) {
      const result = entity;
      for (const e of result.entities) {
        addToScene(scene, e);
      }
      if (result.clearColor) {
        ctx.clearColor = result.clearColor;
      }
      if (result.camera && !ctx.camera) {
        ctx.camera = result.camera;
      }
      if (result.animationGroups?.length) {
        const engine = ctx.surface.engine;
        const groups = result.animationGroups;
        ctx.animationGroups.push(...groups);
        ctx._beforeRender.push((deltaMs) => {
          for (const g of groups) {
            if (!g._stopped && g._ctrl) {
              g._ctrl.tick(deltaMs, engine);
            }
          }
        });
      }
      return;
    }
    if ("_gpu" in entity && "material" in entity) {
      const mesh = entity;
      ctx.meshes.push(mesh);
      registerMeshScene(ctx, mesh);
      const build = mesh.material ? mesh.material._buildGroup : void 0;
      if (build) {
        let group = ctx._groups.get(build);
        if (!group) {
          group = [];
          ctx._groups.set(build, group);
          ctx._deferredBuilders.push(async () => {
            const result = await build(ctx, group);
            ctx._renderables.push(...result.renderables);
            if (result.updater) {
              ctx._uniformUpdaters.push(result.updater);
            }
          });
        }
        group.push(mesh);
        if (ctx._built) {
          enqueueMaterialSwap(ctx, mesh);
        }
      }
    } else if ("lightType" in entity) {
      ctx.lights.push(entity);
    }
    const kids = entity.children;
    if (kids?.length) {
      for (const child of kids) {
        child.parent = entity;
        addToScene(scene, child);
      }
    }
  }
  async function buildScene(scene) {
    const ctx = scene;
    while (ctx._deferredBuilders.length > 0) {
      const builders = [...ctx._deferredBuilders];
      ctx._deferredBuilders = [];
      await Promise.all(builders.map(async (b) => b()));
    }
    ctx._materialSwapQueue.length = 0;
    ctx._renderableVersion++;
    ctx._built = true;
  }
  async function registerScene(scene) {
    const ctx = scene;
    const surface = ctx.surface;
    if (isRenderingContextRegistered(surface, ctx)) {
      return;
    }
    await buildScene(scene);
    ctx._renderables.sort(byOrder);
    await Promise.all(ctx._frameGraph._tasks.map((task) => task._preload?.()).filter((preload) => preload !== void 0));
    ctx._frameGraph.build();
    if (surface._renderingContexts.length > 0) {
      (await Promise.resolve().then(() => (init_swapchain_overlay(), swapchain_overlay_exports))).configureSwapchainOverlayScene(surface, ctx);
    }
    registerRenderingContext(surface, ctx);
  }
  var byOrder;
  var init_scene_core = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/scene/scene-core.ts"() {
      "use strict";
      init_engine();
      init_mesh_scene_registry();
      init_frame_graph();
      init_render_task();
      init_render_target();
      byOrder = (a, b) => a.order - b.order;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-identity.ts
  function mat4Identity() {
    const m = new F32(16);
    m[0] = 1;
    m[5] = 1;
    m[10] = 1;
    m[15] = 1;
    return m;
  }
  var init_mat4_identity = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-identity.ts"() {
      "use strict";
      init_typed_arrays();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-look-at-lh.ts
  function mat4LookAtLH(eye, target, up) {
    const zAxis = { x: target.x - eye.x, y: target.y - eye.y, z: target.z - eye.z };
    const zLen = Math.sqrt(zAxis.x * zAxis.x + zAxis.y * zAxis.y + zAxis.z * zAxis.z);
    if (zLen < 1e-10) {
      return mat4Identity();
    }
    const invZ = 1 / zLen;
    zAxis.x *= invZ;
    zAxis.y *= invZ;
    zAxis.z *= invZ;
    const xAxis = {
      x: up.y * zAxis.z - up.z * zAxis.y,
      y: up.z * zAxis.x - up.x * zAxis.z,
      z: up.x * zAxis.y - up.y * zAxis.x
    };
    const xLen = Math.sqrt(xAxis.x * xAxis.x + xAxis.y * xAxis.y + xAxis.z * xAxis.z);
    if (xLen < 1e-10) {
      return mat4Identity();
    }
    const invX = 1 / xLen;
    xAxis.x *= invX;
    xAxis.y *= invX;
    xAxis.z *= invX;
    const yAxis = {
      x: zAxis.y * xAxis.z - zAxis.z * xAxis.y,
      y: zAxis.z * xAxis.x - zAxis.x * xAxis.z,
      z: zAxis.x * xAxis.y - zAxis.y * xAxis.x
    };
    return new F32([
      xAxis.x,
      yAxis.x,
      zAxis.x,
      0,
      xAxis.y,
      yAxis.y,
      zAxis.y,
      0,
      xAxis.z,
      yAxis.z,
      zAxis.z,
      0,
      -(xAxis.x * eye.x + xAxis.y * eye.y + xAxis.z * eye.z),
      -(yAxis.x * eye.x + yAxis.y * eye.y + yAxis.z * eye.z),
      -(zAxis.x * eye.x + zAxis.y * eye.y + zAxis.z * eye.z),
      1
    ]);
  }
  var init_mat4_look_at_lh = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-look-at-lh.ts"() {
      "use strict";
      init_typed_arrays();
      init_mat4_identity();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/vec3-up.ts
  var Vec3Up;
  var init_vec3_up = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/vec3-up.ts"() {
      "use strict";
      Vec3Up = { x: 0, y: 1, z: 0 };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/world-matrix-state.ts
  function attachWorldMatrixState(host, state) {
    host[WM_STATE] = state;
  }
  function peekWorldMatrixState(p) {
    if (p === null) {
      return null;
    }
    const s = p[WM_STATE];
    return s ?? null;
  }
  function createWorldMatrixState(getLocalMatrix) {
    let _worldVersion = 0;
    let _lastSeenParentVersion = -1;
    let _cachedWorld = null;
    const _ownedWorld = allocateMat4();
    let _parent = null;
    let _parentState = null;
    const _children = [];
    function invalidate() {
      _cachedWorld = null;
      _worldVersion++;
      for (const child of _children) {
        child._invalidate();
      }
    }
    function pollForeignParent() {
      const pv = _parent.worldMatrixVersion;
      if (pv !== _lastSeenParentVersion) {
        _lastSeenParentVersion = pv;
        invalidate();
      }
    }
    const state = {
      get parent() {
        return _parent;
      },
      set parent(p) {
        if (p === _parent) {
          return;
        }
        if (_parentState !== null) {
          _parentState._removeChild(state);
        }
        _parent = p;
        _parentState = peekWorldMatrixState(p);
        if (_parentState !== null) {
          _parentState._addChild(state);
        }
        _lastSeenParentVersion = -1;
        invalidate();
      },
      markLocalDirty() {
        invalidate();
      },
      getWorldMatrix() {
        if (_parentState === null && _parent !== null) {
          pollForeignParent();
        }
        if (_cachedWorld !== null) {
          return _cachedWorld;
        }
        const local = getLocalMatrix();
        if (_parent !== null) {
          const pw = _parent.worldMatrix;
          mat4MultiplyInto(_ownedWorld, 0, pw, 0, local, 0);
          _cachedWorld = _ownedWorld;
        } else {
          _cachedWorld = local;
        }
        return _cachedWorld;
      },
      getWorldMatrixVersion() {
        if (_parentState === null && _parent !== null) {
          pollForeignParent();
        }
        return _worldVersion;
      },
      _invalidate() {
        invalidate();
      },
      _addChild(child) {
        _children.push(child);
      },
      _removeChild(child) {
        const i = _children.indexOf(child);
        if (i >= 0) {
          _children.splice(i, 1);
        }
      }
    };
    return state;
  }
  var WM_STATE;
  var init_world_matrix_state = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/scene/world-matrix-state.ts"() {
      "use strict";
      init_mat4_multiply_into();
      init_matrix_allocator();
      WM_STATE = Symbol("wmState");
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/observable-vec3.ts
  var ObservableVec3;
  var init_observable_vec3 = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/observable-vec3.ts"() {
      "use strict";
      ObservableVec3 = class {
        constructor(x, y, z, onDirty) {
          __publicField(this, "_x");
          __publicField(this, "_y");
          __publicField(this, "_z");
          __publicField(this, "_onDirty");
          this._x = x;
          this._y = y;
          this._z = z;
          this._onDirty = onDirty;
        }
        get x() {
          return this._x;
        }
        set x(v) {
          if (this._x !== v) {
            this._x = v;
            this._onDirty();
          }
        }
        get y() {
          return this._y;
        }
        set y(v) {
          if (this._y !== v) {
            this._y = v;
            this._onDirty();
          }
        }
        get z() {
          return this._z;
        }
        set z(v) {
          if (this._z !== v) {
            this._z = v;
            this._onDirty();
          }
        }
        /** Bulk set — one dirty notification instead of three. */
        set(x, y, z) {
          this._x = x;
          this._y = y;
          this._z = z;
          this._onDirty();
        }
        /** Copy values from another vector. */
        copyFrom(v) {
          this.set(v.x, v.y, v.z);
        }
        /** Copy into a Float32Array at offset. */
        toArray(out, offset = 0) {
          out[offset] = this._x;
          out[offset + 1] = this._y;
          out[offset + 2] = this._z;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/resource/gpu-pool.ts
  function texRefs() {
    if (!_texRefs) {
      _texRefs = /* @__PURE__ */ new WeakMap();
    }
    return _texRefs;
  }
  function acquireTexture(tex) {
    const m = texRefs();
    m.set(tex.texture, (m.get(tex.texture) ?? 0) + 1);
  }
  function releaseTexture(tex) {
    const m = texRefs();
    const c = (m.get(tex.texture) ?? 1) - 1;
    if (c <= 0) {
      tex.texture.destroy();
      m.delete(tex.texture);
      return true;
    }
    m.set(tex.texture, c);
    return false;
  }
  var _texRefs;
  var init_gpu_pool = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/resource/gpu-pool.ts"() {
      "use strict";
      _texRefs = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-compose-into.ts
  function mat4ComposeInto(dst, off, tx, ty, tz, qx, qy, qz, qw, sx, sy, sz) {
    const xx = qx * qx, yy = qy * qy, zz = qz * qz;
    const xy = qx * qy, xz = qx * qz, yz = qy * qz;
    const wx = qw * qx, wy = qw * qy, wz = qw * qz;
    dst[off] = (1 - 2 * (yy + zz)) * sx;
    dst[off + 1] = 2 * (xy + wz) * sx;
    dst[off + 2] = 2 * (xz - wy) * sx;
    dst[off + 3] = 0;
    dst[off + 4] = 2 * (xy - wz) * sy;
    dst[off + 5] = (1 - 2 * (xx + zz)) * sy;
    dst[off + 6] = 2 * (yz + wx) * sy;
    dst[off + 7] = 0;
    dst[off + 8] = 2 * (xz + wy) * sz;
    dst[off + 9] = 2 * (yz - wx) * sz;
    dst[off + 10] = (1 - 2 * (xx + yy)) * sz;
    dst[off + 11] = 0;
    dst[off + 12] = tx;
    dst[off + 13] = ty;
    dst[off + 14] = tz;
    dst[off + 15] = 1;
  }
  var init_mat4_compose_into = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-compose-into.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-compose.ts
  function mat4Compose(tx, ty, tz, qx, qy, qz, qw, sx, sy, sz) {
    const out = new F32(16);
    mat4ComposeInto(out, 0, tx, ty, tz, qx, qy, qz, qw, sx, sy, sz);
    return out;
  }
  var init_mat4_compose = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-compose.ts"() {
      "use strict";
      init_typed_arrays();
      init_mat4_compose_into();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/observable-quat.ts
  var ObservableQuat;
  var init_observable_quat = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/observable-quat.ts"() {
      "use strict";
      ObservableQuat = class {
        constructor(x, y, z, w, onDirty) {
          __publicField(this, "_x");
          __publicField(this, "_y");
          __publicField(this, "_z");
          __publicField(this, "_w");
          __publicField(this, "_onDirty");
          /** Bumped on every value change. Lets derived caches (e.g. the Euler proxy) detect
           *  external quaternion writes and re-sync only when needed. */
          __publicField(this, "_version", 0);
          this._x = x;
          this._y = y;
          this._z = z;
          this._w = w;
          this._onDirty = onDirty;
        }
        /** Monotonic change counter — incremented whenever any component changes. */
        get version() {
          return this._version;
        }
        get x() {
          return this._x;
        }
        set x(v) {
          if (this._x !== v) {
            this._x = v;
            this._version++;
            this._onDirty();
          }
        }
        get y() {
          return this._y;
        }
        set y(v) {
          if (this._y !== v) {
            this._y = v;
            this._version++;
            this._onDirty();
          }
        }
        get z() {
          return this._z;
        }
        set z(v) {
          if (this._z !== v) {
            this._z = v;
            this._version++;
            this._onDirty();
          }
        }
        get w() {
          return this._w;
        }
        set w(v) {
          if (this._w !== v) {
            this._w = v;
            this._version++;
            this._onDirty();
          }
        }
        /** Bulk set — one dirty notification instead of four. */
        set(x, y, z, w) {
          this._x = x;
          this._y = y;
          this._z = z;
          this._w = w;
          this._version++;
          this._onDirty();
        }
        /** Copy values from another quaternion. */
        copyFrom(q) {
          this.set(q.x, q.y, q.z, q.w);
        }
        /** Copy into a Float32Array at offset. */
        toArray(out, offset = 0) {
          out[offset] = this._x;
          out[offset + 1] = this._y;
          out[offset + 2] = this._z;
          out[offset + 3] = this._w;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/scene-node.ts
  function eulerToQuat(rx, ry, rz) {
    const cx = Math.cos(rx * 0.5), sx_ = Math.sin(rx * 0.5);
    const cy = Math.cos(ry * 0.5), sy_ = Math.sin(ry * 0.5);
    const cz = Math.cos(rz * 0.5), sz_ = Math.sin(rz * 0.5);
    return [sx_ * cy * cz + cx * sy_ * sz_, cx * sy_ * cz - sx_ * cy * sz_, cx * cy * sz_ + sx_ * sy_ * cz, cx * cy * cz - sx_ * sy_ * sz_];
  }
  function quatToEulerXYZ(qx, qy, qz, qw) {
    const sinY = 2 * (qx * qz + qw * qy);
    const ry = Math.asin(Math.max(-1, Math.min(1, sinY)));
    const rx = Math.atan2(-(2 * (qy * qz - qw * qx)), 1 - 2 * (qx * qx + qy * qy));
    const rz = Math.atan2(-(2 * (qx * qy - qw * qz)), 1 - 2 * (qy * qy + qz * qz));
    return [rx, ry, rz];
  }
  function createEulerProxy(rq) {
    let ex = 0;
    let ey = 0;
    let ez = 0;
    let syncedVersion = -1;
    const sync = () => {
      if (rq.version !== syncedVersion) {
        const e = quatToEulerXYZ(rq.x, rq.y, rq.z, rq.w);
        ex = e[0];
        ey = e[1];
        ez = e[2];
        syncedVersion = rq.version;
      }
    };
    const apply = (x, y, z) => {
      ex = x;
      ey = y;
      ez = z;
      const [a, b, c, d] = eulerToQuat(x, y, z);
      rq.set(a, b, c, d);
      syncedVersion = rq.version;
    };
    return {
      get x() {
        sync();
        return ex;
      },
      set x(v) {
        sync();
        apply(v, ey, ez);
      },
      get y() {
        sync();
        return ey;
      },
      set y(v) {
        sync();
        apply(ex, v, ez);
      },
      get z() {
        sync();
        return ez;
      },
      set z(v) {
        sync();
        apply(ex, ey, v);
      },
      set: apply
    };
  }
  var init_scene_node = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/scene/scene-node.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/mesh.ts
  function initMeshTransform(mesh, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const wm = createWorldMatrixState(() => {
      const p = mesh.position, rq2 = mesh.rotationQuaternion, s = mesh.scaling;
      const isIdentity = p.x === 0 && p.y === 0 && p.z === 0 && rq2.x === 0 && rq2.y === 0 && rq2.z === 0 && rq2.w === 1 && s.x === 1 && s.y === 1 && s.z === 1;
      return isIdentity ? mat4Identity() : mat4Compose(p.x, p.y, p.z, rq2.x, rq2.y, rq2.z, rq2.w, s.x, s.y, s.z);
    });
    const onWmDirty = () => wm.markLocalDirty();
    const [iqx, iqy, iqz, iqw] = eulerToQuat(rx, ry, rz);
    const rq = new ObservableQuat(iqx, iqy, iqz, iqw, onWmDirty);
    mesh.rotationQuaternion = rq;
    mesh.rotation = createEulerProxy(rq);
    mesh.position = new ObservableVec3(px, py, pz, onWmDirty);
    mesh.scaling = new ObservableVec3(sx, sy, sz, onWmDirty);
    if (!mesh.children) {
      mesh.children = [];
    }
    Object.defineProperty(mesh, "parent", {
      get() {
        return wm.parent;
      },
      set(v) {
        wm.parent = v;
      },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(mesh, "worldMatrix", {
      get() {
        return wm.getWorldMatrix();
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(mesh, "worldMatrixVersion", {
      get() {
        return wm.getWorldMatrixVersion();
      },
      configurable: true,
      enumerable: false
    });
    attachWorldMatrixState(mesh, wm);
  }
  function uploadMeshToGPU(engine, positions, normals, indices, uvs, uvs2, tangents, colors) {
    const device = engine._device;
    const positionBuffer = createMappedBuffer(engine, positions, BU.VERTEX);
    const normalBuffer = createMappedBuffer(engine, normals, BU.VERTEX);
    const indexBuffer = createMappedBuffer(engine, indices, BU.INDEX);
    let uvBuffer;
    if (uvs && uvs.length > 0) {
      uvBuffer = createMappedBuffer(engine, uvs, BU.VERTEX);
    } else {
      uvBuffer = device.createBuffer({
        size: positions.length / 3 * 8,
        usage: BU.VERTEX,
        mappedAtCreation: true
      });
      uvBuffer.unmap();
    }
    let uv2Buffer = null;
    if (uvs2 && uvs2.length > 0) {
      uv2Buffer = createMappedBuffer(engine, uvs2, BU.VERTEX);
    }
    const tangentBuffer = tangents && tangents.length > 0 ? createMappedBuffer(engine, tangents, BU.VERTEX) : null;
    const colorBuffer = colors && colors.length > 0 ? createMappedBuffer(engine, colors, BU.VERTEX) : null;
    return {
      positionBuffer,
      normalBuffer,
      uvBuffer,
      uv2Buffer,
      tangentBuffer,
      colorBuffer,
      hasUv: !!uvs && uvs.length > 0,
      hasUv2: !!uvs2 && uvs2.length > 0,
      hasTangent: !!tangents && tangents.length > 0,
      hasColor: !!colors && colors.length > 0,
      indexBuffer,
      indexCount: indices.length,
      indexFormat: "uint32"
    };
  }
  var init_mesh = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/mesh.ts"() {
      "use strict";
      init_gpu_flags();
      init_gpu_buffers();
      init_mat4_compose();
      init_mat4_identity();
      init_observable_vec3();
      init_observable_quat();
      init_world_matrix_state();
      init_scene_node();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/compute-aabb.ts
  function computeAabb(positions, world) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    if (world) {
      const m0 = world[0], m1 = world[1], m2 = world[2], m4 = world[4], m5 = world[5], m6 = world[6], m8 = world[8], m9 = world[9], m10 = world[10], m12 = world[12], m13 = world[13], m14 = world[14];
      for (let i = 0; i < positions.length; i += 3) {
        const lx = positions[i];
        const ly = positions[i + 1];
        const lz = positions[i + 2];
        const x = m0 * lx + m4 * ly + m8 * lz + m12;
        const y = m1 * lx + m5 * ly + m9 * lz + m13;
        const z = m2 * lx + m6 * ly + m10 * lz + m14;
        if (x < minX) {
          minX = x;
        }
        if (x > maxX) {
          maxX = x;
        }
        if (y < minY) {
          minY = y;
        }
        if (y > maxY) {
          maxY = y;
        }
        if (z < minZ) {
          minZ = z;
        }
        if (z > maxZ) {
          maxZ = z;
        }
      }
    } else {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        if (x < minX) {
          minX = x;
        }
        if (x > maxX) {
          maxX = x;
        }
        if (y < minY) {
          minY = y;
        }
        if (y > maxY) {
          maxY = y;
        }
        if (z < minZ) {
          minZ = z;
        }
        if (z > maxZ) {
          maxZ = z;
        }
      }
    }
    return [
      [minX, minY, minZ],
      [maxX, maxY, maxZ]
    ];
  }
  var init_compute_aabb = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/compute-aabb.ts"() {
      "use strict";
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\scene-uniforms.wgsl
  var scene_uniforms_default;
  var init_scene_uniforms = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\scene-uniforms.wgsl"() {
      scene_uniforms_default = "struct SceneUniforms {\r\nviewProjection: mat4x4<f32>,\r\nview: mat4x4<f32>,\r\nvEyePosition: vec4<f32>,\r\nenvRotationY: f32,\r\n_envPad0: f32, _envPad1: f32, _envPad2: f32,\r\nvSphericalL00: vec4<f32>,\r\nvSphericalL1_1: vec4<f32>,\r\nvSphericalL10: vec4<f32>,\r\nvSphericalL11: vec4<f32>,\r\nvSphericalL2_2: vec4<f32>,\r\nvSphericalL2_1: vec4<f32>,\r\nvSphericalL20: vec4<f32>,\r\nvSphericalL21: vec4<f32>,\r\nvSphericalL22: vec4<f32>,\r\nvImageInfos: vec4<f32>, // exposureLinear, contrast, lodGenerationScale, toneMappingEnabled\r\nvFogInfos: vec4<f32>,\r\nvFogColor: vec4<f32>,\r\nclipPlane: vec4<f32>,\r\n}\r\n@group(0) @binding(0) var<uniform> scene: SceneUniforms;\r\n";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/scene-uniforms.ts
  var SCENE_UBO_WGSL;
  var init_scene_uniforms2 = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/scene-uniforms.ts"() {
      "use strict";
      init_scene_uniforms();
      SCENE_UBO_WGSL = scene_uniforms_default;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/ubo-layout.ts
  function alignUp(offset, alignment) {
    return offset + alignment - 1 & ~(alignment - 1);
  }
  function typeInfo(type) {
    const info = TYPE_INFO[type];
    if (info) {
      return info;
    }
    const m = /^array<vec4<u32>,\s*(\d+)>$/.exec(type);
    if (m) {
      return { align: 16, size: Number(m[1]) * 16 };
    }
    throw new Error(`Unknown UBO field type: ${type}`);
  }
  function computeUboLayout(fields) {
    const _offsets = /* @__PURE__ */ new Map();
    const lines = [];
    let cursor = 0;
    for (const field of fields) {
      const info = typeInfo(field._type);
      cursor = alignUp(cursor, info.align);
      _offsets.set(field._name, cursor);
      lines.push(`${field._name}: ${field._type},`);
      cursor += info.size;
    }
    const _totalBytes = fields.length > 0 ? alignUp(cursor, 16) : 0;
    const _structBody = lines.join("\n");
    return {
      _totalBytes,
      _offsets,
      _structBody
    };
  }
  var TYPE_INFO;
  var init_ubo_layout = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/ubo-layout.ts"() {
      "use strict";
      TYPE_INFO = {
        f32: { align: 4, size: 4 },
        u32: { align: 4, size: 4 },
        i32: { align: 4, size: 4 },
        "vec2<f32>": { align: 8, size: 8 },
        "vec3<f32>": { align: 16, size: 12 },
        "vec4<f32>": { align: 16, size: 16 },
        "vec4<u32>": { align: 16, size: 16 },
        "mat4x4<f32>": { align: 16, size: 64 }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-pipeline.ts
  function getOrCreateShaderPipelineBindings(engine, material) {
    const state = material;
    if (state._shaderBindings && state._shaderDevice === engine._device) {
      return state._shaderBindings;
    }
    state._shaderDevice = engine._device;
    const systemFields = material.uniformDecls.filter((u) => _isShaderSystemUniform(u.name)).map(toUboField);
    const customFields = material.uniformDecls.filter((u) => !_isShaderSystemUniform(u.name)).map(toUboField);
    const systemSpec = computeUboLayout(systemFields.length > 0 ? systemFields : [{ _name: "_pad", _type: "vec4<f32>" }]);
    const customSpec = customFields.length > 0 ? computeUboLayout(customFields) : null;
    const group1BGL = engine._device.createBindGroupLayout({
      label: "shader-material-group1",
      entries: buildBindGroupLayoutEntries(material.samplerDecls, material.storageBufferDecls, customSpec !== null)
    });
    const bindings = {
      group1BGL,
      systemSpec,
      customSpec,
      vertexBuffers: material.attributes.map(attributeLayout),
      pipelines: /* @__PURE__ */ new Map()
    };
    state._shaderBindings = bindings;
    state._shaderCustomSpec = customSpec;
    state._shaderCustomUbo = null;
    state._shaderCustomData = null;
    state._shaderCustomVersion = -1;
    return bindings;
  }
  function getOrCreateShaderPipeline(engine, sig, material, bindings, variantKey = "", vertexBuffers = bindings.vertexBuffers, instanceAttrs = "") {
    const key = `${targetSignatureKey(sig)}${variantKey}`;
    const cached = bindings.pipelines.get(key);
    if (cached) {
      return cached;
    }
    const stencil = material.stencil && _stencilResolver ? _stencilResolver(material.stencil) : null;
    const device = engine._device;
    const prelude = buildShaderPrelude(material, bindings.systemSpec, bindings.customSpec, instanceAttrs);
    const vertModule = device.createShaderModule({ label: `${material.name ?? "shader"}-vertex`, code: `${prelude}
${material.vertexSource}` });
    const wantsFragment = !!sig._colorFormat || material.depthOnlyFragment;
    const fragModule = wantsFragment ? device.createShaderModule({ label: `${material.name ?? "shader"}-fragment`, code: `${prelude}
${material.fragmentSource}` }) : null;
    const colorTarget = sig._colorFormat ? {
      format: sig._colorFormat,
      ...material.needAlphaBlending ? {
        blend: material.blendMode === "additive" ? {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one", operation: "add" }
        } : {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
        }
      } : {}
    } : null;
    const pipeline = device.createRenderPipeline({
      label: `${material.name ?? "shader"}-pipeline`,
      layout: device.createPipelineLayout({ bindGroupLayouts: [getSceneBindGroupLayout(engine), bindings.group1BGL] }),
      vertex: { module: vertModule, entryPoint: "mainVertex", buffers: vertexBuffers },
      ...fragModule ? { fragment: { module: fragModule, entryPoint: "mainFragment", targets: colorTarget ? [colorTarget] : [] } } : {},
      ...sig._depthStencilFormat ? {
        depthStencil: {
          format: sig._depthStencilFormat,
          // The target's declared depth convention wins over the material default: a depth-only
          // caster authored for the forward-Z shadow map ("less-equal") must still depth-test
          // correctly when drawn into a reverse-Z camera depth prepass that declares
          // "greater-equal" — otherwise every fragment fails against the 0-cleared buffer.
          depthCompare: sig._depthCompare ?? material.depthCompare,
          depthWriteEnabled: material.needAlphaBlending ? false : material.depthWrite,
          ...material.depthBias ? { depthBias: material.depthBias } : {},
          ...material.depthBiasSlopeScale ? { depthBiasSlopeScale: material.depthBiasSlopeScale } : {},
          // Pre-baked stencil sub-fields, resolved through the opt-in `_stencilResolver` hook above;
          // applied only on a stencil-capable target — a material reused in the depth32float
          // shadow/depth pass keeps plain depth state (no stencil → no format mismatch). `stencil`
          // is a local const that folds to null in stencil-free bundles, so this branch disappears.
          ...stencil && sig._depthStencilFormat.includes("stencil") ? stencil._desc : {}
        }
      } : {},
      multisample: { count: sig._sampleCount },
      primitive: { topology: "triangle-list", cullMode: material.backFaceCulling ? "back" : "none", frontFace: "ccw" }
    });
    bindings.pipelines.set(key, pipeline);
    return pipeline;
  }
  function toUboField(decl) {
    return { _name: decl.name, _type: decl.type };
  }
  function buildBindGroupLayoutEntries(samplers, storageBuffers, hasCustomUbo) {
    const entries = [{ binding: 0, visibility: SHADER_STAGE_ALL, buffer: { type: "uniform" } }];
    let nextBinding = 1;
    if (hasCustomUbo) {
      entries.push({ binding: nextBinding++, visibility: SHADER_STAGE_ALL, buffer: { type: "uniform" } });
    }
    for (const sampler of samplers) {
      const isArray = sampler.viewDimension === "2d-array";
      const sampleType = sampler.comparison === true ? "depth" : sampler.sampleType ?? "float";
      entries.push({
        binding: nextBinding++,
        visibility: SHADER_STAGE_ALL,
        texture: {
          sampleType,
          viewDimension: isArray ? "2d-array" : "2d"
        }
      });
      entries.push({
        binding: nextBinding++,
        visibility: SHADER_STAGE_ALL,
        sampler: { type: sampler.comparison === true ? "comparison" : sampleType === "float" ? "filtering" : "non-filtering" }
      });
    }
    for (const _storage of storageBuffers) {
      entries.push({
        binding: nextBinding++,
        visibility: SHADER_STAGE_ALL,
        buffer: { type: "read-only-storage" }
      });
    }
    return entries;
  }
  function attributeLayout(name, shaderLocation) {
    switch (name) {
      case "position":
      case "normal":
        return { arrayStride: 12, attributes: [{ shaderLocation, offset: 0, format: "float32x3" }] };
      case "uv":
      case "uv2":
        return { arrayStride: 8, attributes: [{ shaderLocation, offset: 0, format: "float32x2" }] };
      case "tangent":
      case "color":
        return { arrayStride: 16, attributes: [{ shaderLocation, offset: 0, format: "float32x4" }] };
    }
  }
  function buildShaderPrelude(material, systemSpec, customSpec, instanceAttrs = "") {
    let wgsl = `${SCENE_UBO_WGSL}
struct ShaderSystemUniforms {
${systemSpec._structBody}
}
@group(1) @binding(0) var<uniform> shaderSystem: ShaderSystemUniforms;
`;
    if (customSpec) {
      wgsl += `struct ShaderUniforms {
${customSpec._structBody}
}
@group(1) @binding(1) var<uniform> shaderUniforms: ShaderUniforms;
`;
    }
    let nextBinding = customSpec ? 2 : 1;
    for (const sampler of material.samplerDecls) {
      const isArray = sampler.viewDimension === "2d-array";
      const isDepth = sampler.comparison === true || sampler.sampleType === "depth";
      const texType = isDepth ? isArray ? "texture_depth_2d_array" : "texture_depth_2d" : isArray ? "texture_2d_array<f32>" : "texture_2d<f32>";
      const samplerType = sampler.comparison === true ? "sampler_comparison" : "sampler";
      wgsl += `@group(1) @binding(${nextBinding++}) var ${sampler.name}: ${texType};
@group(1) @binding(${nextBinding++}) var ${sampler.name}Sampler: ${samplerType};
`;
    }
    for (const storage of material.storageBufferDecls) {
      wgsl += `@group(1) @binding(${nextBinding++}) var<storage, read> ${storage.name}: ${storage.type};
`;
    }
    for (const define of material.defines) {
      wgsl += `const ${define.name}: ${typeof define.value === "boolean" ? "bool" : "f32"} = ${formatDefineValue(define.value)};
`;
    }
    wgsl += `struct VertexInput {
`;
    for (let i = 0; i < material.attributes.length; i++) {
      const attr = material.attributes[i];
      wgsl += `@location(${i}) ${attr}: ${attributeWgslType(attr)},
`;
    }
    wgsl += instanceAttrs;
    wgsl += `};
`;
    return wgsl;
  }
  function formatDefineValue(value) {
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (Number.isInteger(value)) {
      return `${value}.0`;
    }
    return String(value);
  }
  function attributeWgslType(name) {
    switch (name) {
      case "position":
      case "normal":
        return "vec3<f32>";
      case "uv":
      case "uv2":
        return "vec2<f32>";
      case "tangent":
      case "color":
        return "vec4<f32>";
    }
  }
  var _stencilResolver, SHADER_STAGE_ALL;
  var init_shader_pipeline = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-pipeline.ts"() {
      "use strict";
      init_gpu_flags();
      init_render_target();
      init_scene_helpers();
      init_scene_uniforms2();
      init_ubo_layout();
      init_shader_material();
      _stencilResolver = null;
      SHADER_STAGE_ALL = SS.VERTEX | SS.FRAGMENT;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance-gpu.ts
  function syncThinInstanceGpuData(engine, ti, hasColor) {
    const device = engine._device;
    const needsStorage = ti._gpuCullingEnabled;
    if (ti._version !== ti._gpuVersion || ti._gpuBufferStorage !== needsStorage) {
      const byteSize = ti.count * 64;
      let bufferRecreated = false;
      if (!ti._gpuBuffer || ti._gpuBuffer.size < byteSize || ti._gpuBufferStorage !== needsStorage) {
        ti._gpuBuffer?.destroy();
        ti._gpuBuffer = device.createBuffer({
          size: Math.max(ti._capacity * 64, 4),
          // STORAGE is always included: the GPU picker binds this matrix
          // buffer as a read-only storage buffer for thin-instance picking,
          // so it must be storage-capable even when compute culling is off
          // (otherwise the whole pick pass is invalidated → nothing is pickable).
          usage: BU.VERTEX | BU.COPY_DST | BU.STORAGE
        });
        ti._gpuBufferStorage = needsStorage;
        bufferRecreated = true;
      }
      const dirtyMin = bufferRecreated ? 0 : ti._dirtyMin;
      const dirtyMax = bufferRecreated ? ti.count : Math.min(ti._dirtyMax, ti.count);
      if (dirtyMax > dirtyMin) {
        const minByte = dirtyMin * 64;
        const maxByte = dirtyMax * 64;
        if (ti.matrices instanceof F32) {
          device.queue.writeBuffer(ti._gpuBuffer, minByte, ti.matrices.buffer, ti.matrices.byteOffset + minByte, maxByte - minByte);
        } else {
          const neededFloats = ti._capacity * 16;
          if (!ti._uploadF32 || ti._uploadF32.length < neededFloats) {
            ti._uploadF32 = new F32(neededFloats);
          }
          const upload = ti._uploadF32;
          for (let i = dirtyMin; i < dirtyMax; i++) {
            packMat4IntoF32(upload, ti.matrices, i * 16, i * 16);
          }
          device.queue.writeBuffer(ti._gpuBuffer, minByte, upload.buffer, upload.byteOffset + minByte, maxByte - minByte);
        }
      }
      ti._dirtyMin = ti.count;
      ti._dirtyMax = 0;
      ti._gpuVersion = ti._version;
    }
    if (hasColor && ti.colors) {
      if (ti._colorVersion !== ti._colorGpuVersion || ti._colorGpuBufferStorage !== needsStorage) {
        const colorByteSize = ti.count * 16;
        let colorRecreated = false;
        if (!ti._colorGpuBuffer || ti._colorGpuBuffer.size < colorByteSize || ti._colorGpuBufferStorage !== needsStorage) {
          ti._colorGpuBuffer?.destroy();
          ti._colorGpuBuffer = device.createBuffer({
            size: Math.max(ti._capacity * 16, 4),
            usage: BU.VERTEX | BU.COPY_DST | (needsStorage ? BU.STORAGE : 0)
          });
          ti._colorGpuBufferStorage = needsStorage;
          colorRecreated = true;
        }
        const cMin = colorRecreated ? 0 : ti._colorDirtyMin;
        const cMax = colorRecreated ? ti.count : Math.min(ti._colorDirtyMax, ti.count);
        if (cMax > cMin) {
          device.queue.writeBuffer(ti._colorGpuBuffer, cMin * 16, ti.colors.buffer, ti.colors.byteOffset + cMin * 16, (cMax - cMin) * 16);
        }
        ti._colorDirtyMin = ti.count;
        ti._colorDirtyMax = 0;
        ti._colorGpuVersion = ti._colorVersion;
      }
    }
  }
  function syncThinInstanceBuffers(engine, ti, pass, slot, hasColor, drawBuffers) {
    syncThinInstanceGpuData(engine, ti, hasColor);
    const matrixBuffer = drawBuffers?.matrixBuffer ?? ti._gpuBuffer;
    if (matrixBuffer) {
      pass.setVertexBuffer(slot++, matrixBuffer);
    }
    if (hasColor) {
      const colorBuffer = drawBuffers?.colorBuffer ?? ti._colorGpuBuffer;
      if (colorBuffer) {
        pass.setVertexBuffer(slot++, colorBuffer);
      }
    }
    return slot;
  }
  var init_thin_instance_gpu = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance-gpu.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_pack_mat4_into_f32();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-thin-instance.ts
  var shader_thin_instance_exports = {};
  __export(shader_thin_instance_exports, {
    buildShaderRenderablesWithInstancing: () => buildShaderRenderablesWithInstancing
  });
  function instanceVertexLayouts(baseLocation, hasColor) {
    const layouts = [
      {
        arrayStride: 64,
        stepMode: "instance",
        attributes: [
          { shaderLocation: baseLocation, offset: 0, format: "float32x4" },
          { shaderLocation: baseLocation + 1, offset: 16, format: "float32x4" },
          { shaderLocation: baseLocation + 2, offset: 32, format: "float32x4" },
          { shaderLocation: baseLocation + 3, offset: 48, format: "float32x4" }
        ]
      }
    ];
    if (hasColor) {
      layouts.push({
        arrayStride: 16,
        stepMode: "instance",
        attributes: [{ shaderLocation: baseLocation + 4, offset: 0, format: "float32x4" }]
      });
    }
    return layouts;
  }
  function instancePreludeAttributes(baseLocation, hasColor) {
    let wgsl = `@location(${baseLocation}) world0: vec4<f32>,
@location(${baseLocation + 1}) world1: vec4<f32>,
@location(${baseLocation + 2}) world2: vec4<f32>,
@location(${baseLocation + 3}) world3: vec4<f32>,
`;
    if (hasColor) {
      wgsl += `@location(${baseLocation + 4}) instanceColor: vec4<f32>,
`;
    }
    return wgsl;
  }
  function createShaderInstancedRenderable(scene, material, packet, isOverride, h, cull) {
    const isTransparent = material.needAlphaBlending;
    const mesh = packet.mesh;
    const ti = mesh.thinInstances;
    const hasColor = !!ti.colors;
    const baseLocation = material.attributes.length;
    const instanceLayouts = instanceVertexLayouts(baseLocation, hasColor);
    const instanceAttrs = instancePreludeAttributes(baseLocation, hasColor);
    const variantKey = `|ti1c${hasColor ? 1 : 0}`;
    const wm = mesh.worldMatrix;
    const sortCenter = [wm[12], wm[13], wm[14]];
    const update = (context) => {
      if (packet._disposed) {
        return;
      }
      if (!isOverride && mesh.material !== material) {
        return;
      }
      h.updateCustomUbo(scene.surface.engine, material);
      h.updatePacket(scene, material, packet, context);
      if (isTransparent) {
        const m = mesh.worldMatrix;
        sortCenter[0] = m[12];
        sortCenter[1] = m[13];
        sortCenter[2] = m[14];
      }
    };
    const draw = (pass, engine, cullBinding) => {
      if (packet._disposed) {
        return 0;
      }
      if (!isOverride && mesh.material !== material) {
        return 0;
      }
      if (ti.count <= 0) {
        return 0;
      }
      const gpu = mesh._gpu;
      let slot = 0;
      for (let i = 0; i < material.attributes.length; i++) {
        pass.setVertexBuffer(slot++, h.getAttrBuffer(engine, gpu, material.attributes[i]));
      }
      slot = syncThinInstanceBuffers(engine, ti, pass, slot, hasColor, cullBinding?.cullDrawBufs);
      pass.setIndexBuffer(gpu.indexBuffer, gpu.indexFormat);
      pass.setBindGroup(1, packet._bindGroup);
      if (cullBinding) {
        cullBinding.draw(pass, gpu.indexCount, ti.count);
      } else {
        pass.drawIndexed(gpu.indexCount, ti.count);
      }
      return 1;
    };
    const r = {
      order: mesh.renderOrder ?? (isTransparent ? 200 : 100),
      isTransparent,
      mesh,
      _worldCenter: sortCenter,
      bind(eng, sig) {
        const bindings = h.getOrCreateShaderPipelineBindings(eng, material);
        const vertexBuffers = [...bindings.vertexBuffers, ...instanceLayouts];
        const pipeline = h.getOrCreateShaderPipeline(eng, sig, material, bindings, variantKey, vertexBuffers, instanceAttrs);
        const cb = cull?.tryBind(r, scene, mesh, eng, hasColor, isTransparent, update);
        return {
          renderable: r,
          pipeline,
          update: cb ? cb.update : update,
          draw: (pass) => draw(pass, eng, cb)
        };
      }
    };
    r._direct = true;
    return r;
  }
  function buildInstancedSingle(scene, mesh, material, isOverride, h, cull) {
    const bindings = h.getOrCreateShaderPipelineBindings(scene.surface.engine, material);
    const packet = h.createPacket(scene, material, bindings.systemSpec, mesh);
    return createShaderInstancedRenderable(scene, material, packet, isOverride, h, cull);
  }
  function buildShaderRenderablesWithInstancing(scene, meshes, buildPlain, createPacket2, updatePacket2, updateCustomUbo2, getAttrBuffer2, getOrCreateShaderPipeline2, getOrCreateShaderPipelineBindings2, cull) {
    const h = { buildPlain, createPacket: createPacket2, updatePacket: updatePacket2, updateCustomUbo: updateCustomUbo2, getAttrBuffer: getAttrBuffer2, getOrCreateShaderPipeline: getOrCreateShaderPipeline2, getOrCreateShaderPipelineBindings: getOrCreateShaderPipelineBindings2 };
    const instanced = [];
    const plain = [];
    for (const mesh of meshes) {
      if (mesh.thinInstances) {
        instanced.push(mesh);
      } else {
        plain.push(mesh);
      }
    }
    const renderables = [];
    let plainRebuild;
    if (plain.length > 0) {
      const plainResult = buildPlain(scene, plain);
      renderables.push(...plainResult.renderables);
      plainRebuild = plainResult.rebuildSingle;
    }
    for (const mesh of instanced) {
      renderables.push(buildInstancedSingle(scene, mesh, mesh.material, false, h, cull));
    }
    const rebuildSingle = (s, mesh, materialOverride) => {
      const material = materialOverride ?? mesh.material;
      if (mesh.thinInstances) {
        return buildInstancedSingle(s, mesh, material, materialOverride != null, h, cull);
      }
      if (plainRebuild) {
        return plainRebuild(s, mesh, materialOverride);
      }
      return buildPlain(s, [mesh]).rebuildSingle(s, mesh, materialOverride);
    };
    return { renderables, rebuildSingle };
  }
  var init_shader_thin_instance = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-thin-instance.ts"() {
      "use strict";
      init_thin_instance_gpu();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance-gpu-culling.ts
  function createTiCullState() {
    const paramsBytes = new ArrayBuffer(PARAM_BYTES);
    return {
      _capacity: 0,
      _visibleMatrixBuffer: null,
      _visibleColorBuffer: null,
      _argsBuffer: null,
      _paramsBuffer: null,
      _bindGroup: null,
      _srcMatrixBuffer: null,
      _srcColorBuffer: null,
      _hasColor: false,
      _localSphereReady: false,
      _localSphere: new F32(4),
      _paramsBytes: paramsBytes,
      _paramsF32: new F32(paramsBytes),
      _paramsU32: new U32(paramsBytes),
      _argsData: new U32(5),
      _drawBuffers: null
    };
  }
  function destroyTiCullState(state) {
    state._visibleMatrixBuffer?.destroy();
    state._visibleColorBuffer?.destroy();
    state._argsBuffer?.destroy();
    state._paramsBuffer?.destroy();
    state._visibleMatrixBuffer = null;
    state._visibleColorBuffer = null;
    state._argsBuffer = null;
    state._paramsBuffer = null;
    state._bindGroup = null;
    state._drawBuffers = null;
  }
  function prepareTiCull(engine, state, mesh, gpu, ti, hasColor, context) {
    const camera = context._camera;
    if (!ti._gpuCullingEnabled || !camera || mesh.visible === false || ti.count === 0) {
      state._drawBuffers = null;
      return null;
    }
    if (hasColor && !ti.colors) {
      state._drawBuffers = null;
      return null;
    }
    if (!state._localSphereReady && !computeLocalSphere(mesh, state._localSphere)) {
      state._drawBuffers = null;
      return null;
    }
    state._localSphereReady = true;
    syncThinInstanceGpuData(engine, ti, hasColor);
    const sourceMatrixBuffer = ti._gpuBuffer;
    const sourceColorBuffer = hasColor ? ti._colorGpuBuffer : null;
    if (!sourceMatrixBuffer || hasColor && !sourceColorBuffer) {
      state._drawBuffers = null;
      return null;
    }
    ensureCullBuffers(engine, state, ti._capacity, hasColor);
    const visibleMatrixBuffer = state._visibleMatrixBuffer;
    const visibleColorBuffer = hasColor ? state._visibleColorBuffer : null;
    const argsBuffer = state._argsBuffer;
    const paramsBuffer = state._paramsBuffer;
    const pipeline = getCullPipeline(engine, hasColor);
    if (state._bindGroup === null || state._srcMatrixBuffer !== sourceMatrixBuffer || state._srcColorBuffer !== sourceColorBuffer || state._hasColor !== hasColor) {
      const entries = [
        { binding: 0, resource: { buffer: sourceMatrixBuffer } },
        { binding: 1, resource: { buffer: visibleMatrixBuffer } },
        { binding: 2, resource: { buffer: argsBuffer } },
        { binding: 3, resource: { buffer: paramsBuffer } }
      ];
      if (hasColor) {
        entries.push({ binding: 4, resource: { buffer: sourceColorBuffer } }, { binding: 5, resource: { buffer: visibleColorBuffer } });
      }
      state._bindGroup = engine._device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
      state._srcMatrixBuffer = sourceMatrixBuffer;
      state._srcColorBuffer = sourceColorBuffer;
      state._hasColor = hasColor;
    }
    const v = camera.viewport;
    const aspect = context.targetWidth / context.targetHeight * (v ? v.width / v.height : 1);
    writeCullParams(engine, state, mesh, gpu.indexCount, ti.count, camera, aspect);
    const pass = engine._currentEncoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, state._bindGroup);
    pass.dispatchWorkgroups(Math.ceil(ti.count / WORKGROUP_SIZE));
    pass.end();
    state._drawBuffers = { matrixBuffer: visibleMatrixBuffer, colorBuffer: visibleColorBuffer };
    return { drawBuffers: state._drawBuffers, argsBuffer };
  }
  function ensureCullBuffers(engine, state, capacity, hasColor) {
    const device = engine._device;
    if (state._capacity < capacity) {
      state._visibleMatrixBuffer?.destroy();
      state._visibleColorBuffer?.destroy();
      state._visibleMatrixBuffer = device.createBuffer({
        size: Math.max(capacity * 64, 4),
        usage: BU.VERTEX | BU.STORAGE
      });
      state._visibleColorBuffer = hasColor ? device.createBuffer({
        size: Math.max(capacity * 16, 4),
        usage: BU.VERTEX | BU.STORAGE
      }) : null;
      state._capacity = capacity;
      state._bindGroup = null;
      state._drawBuffers = null;
    } else if (hasColor && !state._visibleColorBuffer) {
      state._visibleColorBuffer = device.createBuffer({
        size: Math.max(state._capacity * 16, 4),
        usage: BU.VERTEX | BU.STORAGE
      });
      state._bindGroup = null;
      state._drawBuffers = null;
    }
    if (!state._argsBuffer) {
      state._argsBuffer = device.createBuffer({
        size: INDIRECT_ARGS_BYTES,
        usage: BU.INDIRECT | BU.STORAGE | BU.COPY_DST
      });
    }
    if (!state._paramsBuffer) {
      state._paramsBuffer = device.createBuffer({
        size: PARAM_BYTES,
        usage: BU.UNIFORM | BU.COPY_DST
      });
    }
  }
  function getCullPipeline(engine, hasColor) {
    const device = engine._device;
    if (_cachedDevice2 !== device) {
      _cachedDevice2 = device;
      _pipelineNoColor = null;
      _pipelineColor = null;
    }
    if (hasColor) {
      _pipelineColor ?? (_pipelineColor = device.createComputePipeline({
        layout: "auto",
        compute: { module: device.createShaderModule({ code: CULL_WGSL_COLOR }), entryPoint: "mainColor" }
      }));
      return _pipelineColor;
    }
    _pipelineNoColor ?? (_pipelineNoColor = device.createComputePipeline({
      layout: "auto",
      compute: { module: device.createShaderModule({ code: CULL_WGSL_NO_COLOR }), entryPoint: "main" }
    }));
    return _pipelineNoColor;
  }
  function writeCullParams(engine, state, mesh, indexCount, instanceCount, camera, aspect) {
    const params = state._paramsF32;
    const viewProjection = getViewProjectionMatrix(camera, aspect);
    writeFrustumPlanes(params, viewProjection);
    params.set(mesh.worldMatrix, MESH_WORLD_FLOAT_OFFSET);
    params.set(state._localSphere, LOCAL_SPHERE_FLOAT_OFFSET);
    state._paramsU32[COUNT_U32_OFFSET] = instanceCount;
    const args = state._argsData;
    args[0] = indexCount;
    args[1] = 0;
    args[2] = 0;
    args[3] = 0;
    args[4] = 0;
    engine._device.queue.writeBuffer(state._argsBuffer, 0, args.buffer, args.byteOffset, args.byteLength);
    engine._device.queue.writeBuffer(state._paramsBuffer, 0, state._paramsBytes);
  }
  function writeFrustumPlanes(out, m) {
    writePlane(out, 0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
    writePlane(out, 4, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
    writePlane(out, 8, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
    writePlane(out, 12, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
    writePlane(out, 16, m[2], m[6], m[10], m[14]);
    writePlane(out, 20, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
  }
  function writePlane(out, offset, x, y, z, w) {
    const invLen = 1 / Math.hypot(x, y, z);
    out[offset] = x * invLen;
    out[offset + 1] = y * invLen;
    out[offset + 2] = z * invLen;
    out[offset + 3] = w * invLen;
  }
  function computeLocalSphere(mesh, out) {
    const positions = mesh._cpuPositions;
    if (!positions || positions.length < 3) {
      return false;
    }
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      if (x < minX) {
        minX = x;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (y > maxY) {
        maxY = y;
      }
      if (z < minZ) {
        minZ = z;
      }
      if (z > maxZ) {
        maxZ = z;
      }
    }
    if (!isFinite(minX)) {
      return false;
    }
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const dx = maxX - cx;
    const dy = maxY - cy;
    const dz = maxZ - cz;
    out[0] = cx;
    out[1] = cy;
    out[2] = cz;
    out[3] = Math.hypot(dx, dy, dz);
    return true;
  }
  var WORKGROUP_SIZE, PARAM_BYTES, COUNT_U32_OFFSET, MESH_WORLD_FLOAT_OFFSET, LOCAL_SPHERE_FLOAT_OFFSET, INDIRECT_ARGS_BYTES, CULL_WGSL_NO_COLOR, CULL_WGSL_COLOR, _cachedDevice2, _pipelineNoColor, _pipelineColor;
  var init_thin_instance_gpu_culling = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance-gpu-culling.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_camera();
      init_thin_instance_gpu();
      WORKGROUP_SIZE = 64;
      PARAM_BYTES = 192;
      COUNT_U32_OFFSET = 44;
      MESH_WORLD_FLOAT_OFFSET = 24;
      LOCAL_SPHERE_FLOAT_OFFSET = 40;
      INDIRECT_ARGS_BYTES = 20;
      CULL_WGSL_NO_COLOR = /* wgsl */
      `
struct CullParams{planes:array<vec4<f32>,6>,meshWorld:mat4x4<f32>,localSphere:vec4<f32>,count:u32};
@group(0)@binding(0)var<storage,read> srcMatrices:array<mat4x4<f32>>;
@group(0)@binding(1)var<storage,read_write> dstMatrices:array<mat4x4<f32>>;
@group(0)@binding(2)var<storage,read_write> args:array<atomic<u32>>;
@group(0)@binding(3)var<uniform> params:CullParams;
fn visible(world:mat4x4<f32>)->bool{
let center=(world*vec4<f32>(params.localSphere.xyz,1.0)).xyz;
let sx=length(world[0].xyz);
let sy=length(world[1].xyz);
let sz=length(world[2].xyz);
let radius=params.localSphere.w*max(max(sx,sy),sz)+0.0001;
for(var i=0u;i<6u;i++){
let p=params.planes[i];
if(dot(p.xyz,center)+p.w < -radius){return false;}
}
return true;
}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid:vec3<u32>){
let i=gid.x;
if(i>=params.count){return;}
let world=params.meshWorld*srcMatrices[i];
if(!visible(world)){return;}
let outIndex=atomicAdd(&args[1],1u);
dstMatrices[outIndex]=srcMatrices[i];
}`;
      CULL_WGSL_COLOR = `${CULL_WGSL_NO_COLOR}
@group(0)@binding(4)var<storage,read> srcColors:array<vec4<f32>>;
@group(0)@binding(5)var<storage,read_write> dstColors:array<vec4<f32>>;
@compute @workgroup_size(64)
fn mainColor(@builtin(global_invocation_id) gid:vec3<u32>){
let i=gid.x;
if(i>=params.count){return;}
let world=params.meshWorld*srcMatrices[i];
if(!visible(world)){return;}
let outIndex=atomicAdd(&args[1],1u);
dstMatrices[outIndex]=srcMatrices[i];
dstColors[outIndex]=srcColors[i];
}`;
      _cachedDevice2 = null;
      _pipelineNoColor = null;
      _pipelineColor = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance-cull-binding.ts
  var thin_instance_cull_binding_exports = {};
  __export(thin_instance_cull_binding_exports, {
    tryBind: () => tryBind
  });
  function tryBind(renderable, scene, mesh, engine, hasColor, excluded, baseUpdate) {
    const ti = mesh.thinInstances;
    if (excluded || !ti?._gpuCullingEnabled) {
      return void 0;
    }
    renderable._direct = true;
    const state = createTiCullState();
    scene._meshDisposables.get(mesh)?.push(() => {
      destroyTiCullState(state);
    });
    const binding = {
      cullDrawBufs: null,
      _args: null,
      update(context) {
        baseUpdate?.(context);
        const res = prepareTiCull(engine, state, mesh, mesh._gpu, ti, hasColor, context);
        binding.cullDrawBufs = res?.drawBuffers ?? null;
        binding._args = res?.argsBuffer ?? null;
      },
      draw(pass, indexCount, instanceCount) {
        if (binding._args) {
          pass.drawIndexedIndirect(binding._args, 0);
        } else {
          pass.drawIndexed(indexCount, instanceCount);
        }
      }
    };
    return binding;
  }
  var init_thin_instance_cull_binding = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance-cull-binding.ts"() {
      "use strict";
      init_thin_instance_gpu_culling();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-renderable.ts
  var shader_renderable_exports = {};
  __export(shader_renderable_exports, {
    buildShaderGroup: () => buildShaderGroup,
    buildShaderMaterialRenderables: () => buildShaderMaterialRenderables
  });
  function buildShaderMaterialRenderables(scene, meshes) {
    const renderables = [];
    const rebuildSingle = (s, mesh, materialOverride) => buildSingleShaderRenderable(s, mesh, materialOverride ?? mesh.material, materialOverride != null);
    const byMaterial = /* @__PURE__ */ new Map();
    for (const mesh of meshes) {
      const material = mesh.material;
      let list = byMaterial.get(material);
      if (!list) {
        list = [];
        byMaterial.set(material, list);
      }
      list.push(mesh);
    }
    for (const [material, matMeshes] of byMaterial) {
      const built = buildMaterialRenderables(scene, material, matMeshes);
      renderables.push(...built);
    }
    return { renderables, rebuildSingle };
  }
  async function buildShaderGroup(scene, meshes) {
    if (!meshes.some((m) => !!m.thinInstances)) {
      return buildShaderMaterialRenderables(scene, meshes);
    }
    const mod = await Promise.resolve().then(() => (init_shader_thin_instance(), shader_thin_instance_exports));
    const cull = meshes.some((m) => !!m.thinInstances?._gpuCullingEnabled) ? await Promise.resolve().then(() => (init_thin_instance_cull_binding(), thin_instance_cull_binding_exports)) : void 0;
    return mod.buildShaderRenderablesWithInstancing(
      scene,
      meshes,
      buildShaderMaterialRenderables,
      createPacket,
      updatePacket,
      updateCustomUbo,
      getAttrBuffer,
      getOrCreateShaderPipeline,
      getOrCreateShaderPipelineBindings,
      cull
    );
  }
  function buildSingleShaderRenderable(scene, mesh, material, isOverride) {
    return buildMaterialRenderables(scene, material, [mesh], isOverride)[0];
  }
  function buildMaterialRenderables(scene, material, meshes, isOverride = false) {
    const engine = scene.surface.engine;
    const bindings = getOrCreateShaderPipelineBindings(engine, material);
    ensureCustomUbo(engine, material, bindings.customSpec);
    const packets = meshes.map((mesh) => createPacket(scene, material, bindings.systemSpec, mesh));
    const isTransparent = material.needAlphaBlending;
    if (isTransparent) {
      return packets.map((packet) => createTransparentRenderable(scene, material, packet, isOverride));
    }
    return [createOpaqueRenderable(scene, material, packets, isOverride)];
  }
  function createPacket(scene, material, systemSpec, mesh) {
    const engine = scene.surface.engine;
    const systemUBO = createEmptyUniformBuffer(engine, systemSpec._totalBytes, "shader-system-ubo");
    const systemData = new F32(systemSpec._totalBytes / 4);
    writeSystemUniforms(systemData, systemSpec, material, mesh, scene.camera, engine.canvas.width || 1, engine.canvas.height || 1);
    engine._device.queue.writeBuffer(systemUBO, 0, systemData);
    const packet = {
      mesh,
      systemUBO,
      systemData,
      _bindGroup: createShaderBindGroup(engine, material, systemUBO),
      _lastResourceVersion: material._resourceVersion,
      _boundTextures: collectShaderTextures(material),
      _boundStorageBuffers: collectShaderStorageBuffers(material)
    };
    for (const tex of packet._boundTextures) {
      acquireTexture(tex);
    }
    registerMeshTextureDisposer(scene, mesh, packet);
    return packet;
  }
  function createOpaqueRenderable(scene, material, packets, isOverride) {
    if (packets.length > 1) {
      for (const packet of packets) {
        packet._owner = packets;
      }
    }
    const update = (context) => {
      updateCustomUbo(scene.surface.engine, material);
      for (const packet of packets) {
        if (packet._disposed) {
          continue;
        }
        if (!isOverride && packet.mesh.material !== material) {
          continue;
        }
        updatePacket(scene, material, packet, context);
      }
    };
    const draw = (pass, engine) => {
      let draws = 0;
      for (const packet of packets) {
        if (packet._disposed) {
          continue;
        }
        if (!isOverride && packet.mesh.material !== material) {
          continue;
        }
        drawPacket(pass, engine, material, packet);
        draws++;
      }
      return draws;
    };
    const r = {
      order: packets.length === 1 ? packets[0].mesh.renderOrder ?? 100 : Math.min(...packets.map((p) => p.mesh.renderOrder ?? 100)),
      isTransparent: false,
      mesh: packets.length === 1 ? packets[0].mesh : void 0,
      bind(eng, sig) {
        const bindings = getOrCreateShaderPipelineBindings(eng, material);
        return { renderable: r, pipeline: getOrCreateShaderPipeline(eng, sig, material, bindings), update, draw: (pass) => draw(pass, eng) };
      }
    };
    return r;
  }
  function createTransparentRenderable(scene, material, packet, isOverride) {
    const wm = packet.mesh.worldMatrix;
    const sortCenter = [wm[12], wm[13], wm[14]];
    const update = (context) => {
      if (packet._disposed) {
        return;
      }
      if (!isOverride && packet.mesh.material !== material) {
        return;
      }
      updateCustomUbo(scene.surface.engine, material);
      updatePacket(scene, material, packet, context);
      const m = packet.mesh.worldMatrix;
      sortCenter[0] = m[12];
      sortCenter[1] = m[13];
      sortCenter[2] = m[14];
    };
    const draw = (pass, engine) => {
      if (packet._disposed) {
        return 0;
      }
      if (!isOverride && packet.mesh.material !== material) {
        return 0;
      }
      drawPacket(pass, engine, material, packet);
      return 1;
    };
    const r = {
      order: packet.mesh.renderOrder ?? 200,
      isTransparent: true,
      _transmissive: material.transmissive,
      mesh: packet.mesh,
      _worldCenter: sortCenter,
      bind(eng, sig) {
        const bindings = getOrCreateShaderPipelineBindings(eng, material);
        return { renderable: r, pipeline: getOrCreateShaderPipeline(eng, sig, material, bindings), update, draw: (pass) => draw(pass, eng) };
      }
    };
    return r;
  }
  function updatePacket(scene, material, packet, context) {
    const engine = scene.surface.engine;
    const state = material;
    writeSystemUniforms(packet.systemData, state._shaderBindings.systemSpec, material, packet.mesh, context._camera ?? scene.camera, context.targetWidth, context.targetHeight);
    engine._device.queue.writeBuffer(packet.systemUBO, 0, packet.systemData);
    if (packet._lastResourceVersion !== material._resourceVersion) {
      for (const tex of packet._boundTextures) {
        releaseTexture(tex);
      }
      packet._bindGroup = createShaderBindGroup(engine, material, packet.systemUBO);
      packet._boundTextures = collectShaderTextures(material);
      packet._boundStorageBuffers = collectShaderStorageBuffers(material);
      for (const tex of packet._boundTextures) {
        acquireTexture(tex);
      }
      packet._lastResourceVersion = material._resourceVersion;
    }
  }
  function drawPacket(pass, engine, material, packet) {
    const gpu = packet.mesh._gpu;
    for (let i = 0; i < material.attributes.length; i++) {
      pass.setVertexBuffer(i, getAttrBuffer(engine, gpu, material.attributes[i]));
    }
    pass.setIndexBuffer(gpu.indexBuffer, gpu.indexFormat);
    pass.setBindGroup(1, packet._bindGroup);
    pass.drawIndexed(gpu.indexCount);
  }
  function ensureCustomUbo(engine, material, customSpec) {
    const state = material;
    if (!customSpec) {
      state._shaderCustomUbo = null;
      state._shaderCustomData = null;
      state._shaderCustomVersion = material._uniformVersion;
      return;
    }
    if (state._shaderCustomUbo && state._shaderCustomData) {
      updateCustomUbo(engine, material);
      return;
    }
    state._shaderCustomUbo = createEmptyUniformBuffer(engine, customSpec._totalBytes, "shader-custom-ubo");
    state._shaderCustomData = new ArrayBuffer(customSpec._totalBytes);
    state._shaderCustomVersion = -1;
    updateCustomUbo(engine, material);
  }
  function updateCustomUbo(engine, material) {
    const state = material;
    const customSpec = state._shaderCustomSpec;
    const customUbo = state._shaderCustomUbo;
    const customData = state._shaderCustomData;
    if (!customSpec || !customUbo || !customData || state._shaderCustomVersion === material._uniformVersion) {
      return;
    }
    const bytes = new U8(customData);
    bytes.fill(0);
    for (const [name, slot] of material._uniformValues) {
      if (_isShaderSystemUniform(name)) {
        continue;
      }
      const offset = customSpec._offsets.get(name);
      if (offset !== void 0) {
        writeTypedValue(customData, offset, slot.decl.type, slot.value);
      }
    }
    engine._device.queue.writeBuffer(customUbo, 0, bytes);
    state._shaderCustomVersion = material._uniformVersion;
  }
  function writeTypedValue(data, offset, type, value) {
    if (type === "u32") {
      new U32(data, offset, 1)[0] = value[0];
      return;
    }
    if (type === "i32") {
      new I32(data, offset, 1)[0] = value[0];
      return;
    }
    new F32(data, offset, value.length).set(value);
  }
  function createShaderBindGroup(engine, material, systemUBO) {
    const bindings = getOrCreateShaderPipelineBindings(engine, material);
    const entries = [{ binding: 0, resource: { buffer: systemUBO } }];
    let nextBinding = 1;
    if (bindings.customSpec) {
      ensureCustomUbo(engine, material, bindings.customSpec);
      entries.push({ binding: nextBinding++, resource: { buffer: material._shaderCustomUbo } });
    }
    for (const sampler of material.samplerDecls) {
      const slot = material._textureSlots.get(sampler.name);
      const tex = slot?.current;
      if (!tex) {
        throw new Error(`ShaderMaterial: sampler "${sampler.name}" has no Texture2D. Call setShaderTexture() before rendering.`);
      }
      entries.push({ binding: nextBinding++, resource: tex.view }, { binding: nextBinding++, resource: tex.sampler });
    }
    for (const storage of material.storageBufferDecls) {
      const slot = material._storageBufferSlots.get(storage.name);
      const buffer = slot?.current;
      if (!buffer) {
        throw new Error(`ShaderMaterial: storage buffer "${storage.name}" has no GPUBuffer. Call setShaderStorageBuffer() before rendering.`);
      }
      entries.push({ binding: nextBinding++, resource: { buffer } });
    }
    return engine._device.createBindGroup({ label: "shader-material-bg", layout: bindings.group1BGL, entries });
  }
  function collectShaderTextures(material) {
    const textures = [];
    for (const slot of material._textureSlots.values()) {
      if (slot.current) {
        textures.push(slot.current);
      }
    }
    return textures;
  }
  function collectShaderStorageBuffers(material) {
    const buffers = [];
    for (const slot of material._storageBufferSlots.values()) {
      if (slot.current) {
        buffers.push(slot.current);
      }
    }
    return buffers;
  }
  function registerMeshTextureDisposer(scene, mesh, packet) {
    const list = scene._meshDisposables.get(mesh) ?? [];
    list.push(() => {
      packet._disposed = true;
      if (packet._owner) {
        const oi = packet._owner.indexOf(packet);
        if (oi >= 0) {
          packet._owner.splice(oi, 1);
        }
        packet._owner = void 0;
      }
      packet.systemUBO.destroy();
      for (const tex of packet._boundTextures) {
        releaseTexture(tex);
      }
      packet._boundTextures = [];
      packet._boundStorageBuffers = [];
    });
    scene._meshDisposables.set(mesh, list);
  }
  function writeSystemUniforms(data, spec, material, mesh, camera, targetWidth, targetHeight) {
    data.fill(0);
    const world = mesh.worldMatrix;
    const aspect = camera ? getEffectiveAspectRatio(camera, targetWidth, targetHeight) : 1;
    const view = camera ? getViewMatrix(camera) : null;
    const projection = camera ? getProjectionMatrix(camera, aspect) : null;
    const viewProjection = camera ? getViewProjectionMatrix(camera, aspect) : null;
    for (const uniform of material.uniformDecls) {
      if (!_isShaderSystemUniform(uniform.name)) {
        continue;
      }
      const offset = spec._offsets.get(uniform.name);
      if (offset === void 0) {
        continue;
      }
      const f = offset / 4;
      switch (uniform.name) {
        case "world":
          data.set(world, f);
          break;
        case "view":
          if (view) {
            data.set(view, f);
          }
          break;
        case "projection":
          if (projection) {
            data.set(projection, f);
          }
          break;
        case "viewProjection":
          if (viewProjection) {
            data.set(viewProjection, f);
          }
          break;
        case "worldView":
          if (view) {
            mat4MultiplyInto(data, f, view, 0, world, 0);
          }
          break;
        case "worldViewProjection":
          if (viewProjection) {
            mat4MultiplyInto(data, f, viewProjection, 0, world, 0);
          }
          break;
        case "cameraPosition":
          if (camera) {
            const wm = camera.worldMatrix;
            data[f] = wm[12];
            data[f + 1] = wm[13];
            data[f + 2] = wm[14];
          }
          break;
        case "screenSize":
          data[f] = targetWidth;
          data[f + 1] = targetHeight;
          break;
        case "alphaCutoff":
          data[f] = material._uniformValues.get("alphaCutoff")?.value[0] ?? 0.4;
          break;
      }
    }
  }
  function getZeroAttrBuffer(engine, gpu, name) {
    if (!zeroAttrCache) {
      zeroAttrCache = /* @__PURE__ */ new WeakMap();
    }
    let cache = zeroAttrCache.get(gpu);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      zeroAttrCache.set(gpu, cache);
    }
    const existing = cache.get(name);
    if (existing) {
      return existing;
    }
    const vertexCount = gpu.positionBuffer.size / 12;
    const stride = name === "uv" || name === "uv2" ? 8 : name === "normal" ? 12 : 16;
    const buffer = engine._device.createBuffer({ label: `shader-zero-${name}`, size: vertexCount * stride, usage: BU.VERTEX | BU.COPY_DST });
    cache.set(name, buffer);
    return buffer;
  }
  function getAttrBuffer(engine, gpu, name) {
    switch (name) {
      case "position":
        return gpu.positionBuffer;
      case "normal":
        return gpu.normalBuffer ?? getZeroAttrBuffer(engine, gpu, "normal");
      case "uv":
        return gpu.uvBuffer ?? getZeroAttrBuffer(engine, gpu, "uv");
      case "uv2":
        return gpu.uv2Buffer ?? getZeroAttrBuffer(engine, gpu, "uv2");
      case "tangent":
        return gpu.tangentBuffer ?? getZeroAttrBuffer(engine, gpu, "tangent");
      case "color":
        return gpu.colorBuffer ?? getZeroAttrBuffer(engine, gpu, "color");
    }
  }
  var zeroAttrCache;
  var init_shader_renderable = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-renderable.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_gpu_buffers();
      init_gpu_pool();
      init_camera();
      init_mat4_multiply_into();
      init_shader_material();
      init_shader_pipeline();
      zeroAttrCache = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-group-builder.ts
  var shaderGroupBuilder;
  var init_shader_group_builder = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-group-builder.ts"() {
      "use strict";
      shaderGroupBuilder = async (scene, meshes) => {
        const { buildShaderGroup: buildShaderGroup2 } = await Promise.resolve().then(() => (init_shader_renderable(), shader_renderable_exports));
        const result = await buildShaderGroup2(scene, meshes);
        shaderGroupBuilder._rebuildSingle = result.rebuildSingle;
        return result;
      };
      shaderGroupBuilder._materialFamily = "shader";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-material.ts
  function isIdentifier(name) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
  }
  function assertIdentifier(kind, name) {
    if (!isIdentifier(name)) {
      throw new Error(`ShaderMaterial: ${kind} name "${name}" is not a valid WGSL identifier.`);
    }
  }
  function isSupportedAttribute(name) {
    return name === "position" || name === "normal" || name === "uv" || name === "uv2" || name === "tangent" || name === "color";
  }
  function isSystemUniform(name) {
    return name === "world" || name === "view" || name === "projection" || name === "viewProjection" || name === "worldView" || name === "worldViewProjection" || name === "cameraPosition" || name === "screenSize" || name === "alphaCutoff";
  }
  function systemUniformType(name) {
    if (name === "cameraPosition") {
      return "vec3<f32>";
    }
    if (name === "screenSize") {
      return "vec2<f32>";
    }
    if (name === "alphaCutoff") {
      return "f32";
    }
    return "mat4x4<f32>";
  }
  function _isShaderSystemUniform(name) {
    return isSystemUniform(name);
  }
  function createShaderMaterial(options) {
    if (!options.vertexSource || !options.fragmentSource) {
      throw new Error("ShaderMaterial: vertexSource and fragmentSource must be non-empty WGSL strings.");
    }
    const attributes = [];
    const seenAttributes = /* @__PURE__ */ new Set();
    for (const attr of options.attributes) {
      if (!isSupportedAttribute(attr)) {
        throw new Error(`ShaderMaterial: unsupported attribute "${String(attr)}". Supported attributes: position, normal, uv, uv2, tangent, color.`);
      }
      if (seenAttributes.has(attr)) {
        throw new Error(`ShaderMaterial: duplicate attribute "${attr}".`);
      }
      seenAttributes.add(attr);
      attributes.push(attr);
    }
    if (!seenAttributes.has("position")) {
      throw new Error('ShaderMaterial: "position" attribute is required for mesh rendering.');
    }
    const uniformDecls = [];
    const uniformValues = /* @__PURE__ */ new Map();
    const usedNames = /* @__PURE__ */ new Set();
    for (const opt of options.uniforms ?? []) {
      const decl = typeof opt === "string" ? normalizeSystemUniform(opt) : normalizeCustomUniform(opt);
      assertUniqueName(usedNames, "uniform", decl.name);
      uniformDecls.push(decl);
      uniformValues.set(decl.name, { decl, value: normalizeUniformValue(decl, decl.defaultValue ?? defaultUniformValue(decl)) });
    }
    const samplerDecls = [];
    const textureSlots = /* @__PURE__ */ new Map();
    for (const opt of options.samplers ?? []) {
      const decl = typeof opt === "string" ? { name: opt, sampleType: "float" } : {
        name: opt.name,
        sampleType: opt.sampleType ?? (opt.comparison ? "depth" : "float"),
        viewDimension: opt.viewDimension ?? "2d",
        comparison: opt.comparison ?? false
      };
      assertIdentifier("sampler", decl.name);
      assertUniqueName(usedNames, "sampler", decl.name);
      assertUniqueName(usedNames, "sampler", `${decl.name}Sampler`);
      samplerDecls.push(decl);
      textureSlots.set(decl.name, { decl, current: null });
    }
    const storageBufferDecls = [];
    const storageBufferSlots = /* @__PURE__ */ new Map();
    for (const opt of options.storageBuffers ?? []) {
      assertIdentifier("storage buffer", opt.name);
      assertUniqueName(usedNames, "storage buffer", opt.name);
      storageBufferDecls.push(opt);
      storageBufferSlots.set(opt.name, { decl: opt, current: null });
    }
    const defines = [];
    for (const [name, value] of Object.entries(options.defines ?? {})) {
      assertIdentifier("define", name);
      assertUniqueName(usedNames, "define", name);
      if (typeof value !== "boolean" && typeof value !== "number") {
        throw new Error(`ShaderMaterial: define "${name}" must be a boolean or number.`);
      }
      defines.push({ name, value });
    }
    defines.sort((a, b) => a.name.localeCompare(b.name));
    if (options.transmissive && !(options.needAlphaBlending ?? false)) {
      throw new Error("ShaderMaterial: `transmissive` requires `needAlphaBlending` (the surface composites over the grabbed opaque scene color).");
    }
    return {
      name: options.name,
      vertexSource: options.vertexSource,
      fragmentSource: options.fragmentSource,
      attributes,
      uniformDecls,
      samplerDecls,
      storageBufferDecls,
      defines,
      needAlphaBlending: options.needAlphaBlending ?? false,
      blendMode: options.blendMode ?? "alpha",
      transmissive: options.transmissive ?? false,
      needAlphaTesting: options.needAlphaTesting ?? false,
      backFaceCulling: options.backFaceCulling ?? true,
      depthWrite: options.depthWrite ?? true,
      depthCompare: options.depthCompare ?? "greater-equal",
      depthOnlyFragment: options.depthOnlyFragment ?? false,
      depthBias: options.depthBias ?? 0,
      depthBiasSlopeScale: options.depthBiasSlopeScale ?? 0,
      _buildGroup: shaderGroupBuilder,
      _uboVersion: 0,
      _uniformValues: uniformValues,
      _textureSlots: textureSlots,
      _storageBufferSlots: storageBufferSlots,
      _uniformVersion: 0,
      _resourceVersion: 0
    };
  }
  function normalizeSystemUniform(name) {
    if (!isSystemUniform(name)) {
      throw new Error(`ShaderMaterial: custom uniform "${name}" must use an explicit typed declaration.`);
    }
    return { name, type: systemUniformType(name) };
  }
  function normalizeCustomUniform(decl) {
    assertIdentifier("uniform", decl.name);
    if (!isUniformType(decl.type)) {
      throw new Error(`ShaderMaterial: unsupported uniform type "${String(decl.type)}" for "${decl.name}".`);
    }
    return decl;
  }
  function isUniformType(type) {
    return type === "f32" || type === "u32" || type === "i32" || type === "vec2<f32>" || type === "vec3<f32>" || type === "vec4<f32>" || type === "mat4x4<f32>";
  }
  function assertUniqueName(usedNames, kind, name) {
    if (usedNames.has(name)) {
      throw new Error(`ShaderMaterial: duplicate generated identifier "${name}" while adding ${kind}.`);
    }
    usedNames.add(name);
  }
  function elementCount(type) {
    switch (type) {
      case "f32":
      case "u32":
      case "i32":
        return 1;
      case "vec2<f32>":
        return 2;
      case "vec3<f32>":
        return 3;
      case "vec4<f32>":
        return 4;
      case "mat4x4<f32>":
        return 16;
    }
  }
  function defaultUniformValue(decl) {
    if (decl.name === "alphaCutoff") {
      return 0.4;
    }
    const count = elementCount(decl.type);
    return count === 1 ? 0 : new Array(count).fill(0);
  }
  function normalizeUniformValue(decl, value) {
    const count = elementCount(decl.type);
    const arr = typeof value === "number" ? new F32([value]) : value instanceof F32 ? new F32(value) : new F32(value);
    if (arr.length !== count) {
      throw new Error(`ShaderMaterial: uniform "${decl.name}" of type ${decl.type} expects ${count} value(s), got ${arr.length}.`);
    }
    return arr;
  }
  var init_shader_material = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/shader/shader-material.ts"() {
      "use strict";
      init_typed_arrays();
      init_shader_group_builder();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-splat/splat-data.ts
  function chooseTextureSize(length) {
    const width = 4096;
    const height = Math.max(1, Math.ceil(length / width));
    return { width, height };
  }
  function buildSplatGeometry(splatBuffer) {
    const u = new U8(splatBuffer);
    const f = new F32(splatBuffer);
    const vertexCount = u.byteLength / ROW_LENGTH | 0;
    if (vertexCount === 0) {
      throw new Error("splat buffer is empty");
    }
    const { width, height } = chooseTextureSize(vertexCount);
    const texelCount = width * height;
    const positions = new F32(vertexCount * 3);
    const centersRGBA = new F32(texelCount * 4);
    const covARGBA = new F32(texelCount * 4);
    const covBRGBA = new F32(texelCount * 4);
    const colorsRGBA = new F32(texelCount * 4);
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    const M = new F32(9);
    for (let i = 0; i < vertexCount; i++) {
      const fi = i * 8;
      const ui = i * ROW_LENGTH;
      const x = f[fi];
      const y = -f[fi + 1];
      const z = f[fi + 2];
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (z < minZ) {
        minZ = z;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
      if (z > maxZ) {
        maxZ = z;
      }
      centersRGBA[i * 4] = x;
      centersRGBA[i * 4 + 1] = y;
      centersRGBA[i * 4 + 2] = z;
      centersRGBA[i * 4 + 3] = 1;
      colorsRGBA[i * 4] = u[ui + 24] / 255;
      colorsRGBA[i * 4 + 1] = u[ui + 25] / 255;
      colorsRGBA[i * 4 + 2] = u[ui + 26] / 255;
      colorsRGBA[i * 4 + 3] = u[ui + 27] / 255;
      let qw = -(u[ui + 28] - 127.5) / 127.5;
      let qx = (u[ui + 29] - 127.5) / 127.5;
      let qy = -(u[ui + 30] - 127.5) / 127.5;
      let qz = (u[ui + 31] - 127.5) / 127.5;
      const qLen = Math.hypot(qw, qx, qy, qz) || 1;
      const qInv = 1 / qLen;
      qw *= qInv;
      qx *= qInv;
      qy *= qInv;
      qz *= qInv;
      const sx = f[fi + 3] * 2;
      const sy = f[fi + 4] * 2;
      const sz = f[fi + 5] * 2;
      const xx = qx * qx, yy = qy * qy, zz = qz * qz;
      const xy = qx * qy, xz = qx * qz, yz = qy * qz;
      const wx = qw * qx, wy = qw * qy, wz = qw * qz;
      const r00 = 1 - 2 * (yy + zz);
      const r01 = 2 * (xy + wz);
      const r02 = 2 * (xz - wy);
      const r10 = 2 * (xy - wz);
      const r11 = 1 - 2 * (xx + zz);
      const r12 = 2 * (yz + wx);
      const r20 = 2 * (xz + wy);
      const r21 = 2 * (yz - wx);
      const r22 = 1 - 2 * (xx + yy);
      M[0] = r00 * sx;
      M[1] = r01 * sx;
      M[2] = r02 * sx;
      M[3] = r10 * sy;
      M[4] = r11 * sy;
      M[5] = r12 * sy;
      M[6] = r20 * sz;
      M[7] = r21 * sz;
      M[8] = r22 * sz;
      const a0 = M[0] * M[0] + M[3] * M[3] + M[6] * M[6];
      const a1 = M[0] * M[1] + M[3] * M[4] + M[6] * M[7];
      const a2 = M[0] * M[2] + M[3] * M[5] + M[6] * M[8];
      const b0 = M[1] * M[1] + M[4] * M[4] + M[7] * M[7];
      const b1 = M[1] * M[2] + M[4] * M[5] + M[7] * M[8];
      const b2 = M[2] * M[2] + M[5] * M[5] + M[8] * M[8];
      covARGBA[i * 4] = a0;
      covARGBA[i * 4 + 1] = a1;
      covARGBA[i * 4 + 2] = a2;
      covARGBA[i * 4 + 3] = 1;
      covBRGBA[i * 4] = b0;
      covBRGBA[i * 4 + 1] = b1;
      covBRGBA[i * 4 + 2] = b2;
      covBRGBA[i * 4 + 3] = 1;
    }
    return {
      vertexCount,
      boundMin: [minX, minY, minZ],
      boundMax: [maxX, maxY, maxZ],
      textureWidth: width,
      textureHeight: height,
      positions,
      centersRGBA,
      covARGBA,
      covBRGBA,
      colorsRGBA
    };
  }
  var ROW_LENGTH;
  var init_splat_data = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-splat/splat-data.ts"() {
      "use strict";
      init_typed_arrays();
      ROW_LENGTH = 32;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4.ts
  var init_mat4 = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4.ts"() {
      "use strict";
      init_mat4_identity();
      init_mat4_compose();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gaussian-splatting-mesh.ts
  function createGaussianSplattingMesh(engine, name, geom, worker, parsed) {
    const device = engine._device;
    const queue = device.queue;
    const { textureWidth, textureHeight, vertexCount } = geom;
    const makeRgba32f = (data) => {
      const tex = device.createTexture({
        size: [textureWidth, textureHeight],
        format: "rgba32float",
        usage: TU.TEXTURE_BINDING | TU.COPY_DST
      });
      queue.writeTexture({ texture: tex }, data.buffer, { bytesPerRow: textureWidth * 16 }, { width: textureWidth, height: textureHeight });
      return { tex, view: tex.createView() };
    };
    const centers = makeRgba32f(geom.centersRGBA);
    const covA = makeRgba32f(geom.covARGBA);
    const covB = makeRgba32f(geom.covBRGBA);
    const colors = makeRgba32f(geom.colorsRGBA);
    const sampler = device.createSampler({
      magFilter: "nearest",
      minFilter: "nearest",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    const quadBuffer = device.createBuffer({ size: 32, usage: BU.VERTEX, mappedAtCreation: true });
    new F32(quadBuffer.getMappedRange()).set([-2, -2, 2, -2, 2, 2, -2, 2]);
    quadBuffer.unmap();
    const indexBuffer = device.createBuffer({ size: 12, usage: BU.INDEX, mappedAtCreation: true });
    new U16(indexBuffer.getMappedRange()).set([0, 1, 2, 0, 2, 3]);
    indexBuffer.unmap();
    const splatIndexCpu = new F32(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      splatIndexCpu[i] = i;
    }
    const splatIndexBuffer = device.createBuffer({
      size: splatIndexCpu.byteLength,
      usage: BU.VERTEX | BU.COPY_DST
    });
    queue.writeBuffer(splatIndexBuffer, 0, splatIndexCpu.buffer, 0, splatIndexCpu.byteLength);
    let firstResolve = null;
    const firstSortReady = new Promise((res) => {
      firstResolve = res;
    });
    let retainedSplatsData = parsed.data;
    const mesh = {
      _kind: "gs-mesh",
      name,
      vertexCount,
      textureWidth,
      textureHeight,
      boundMin: geom.boundMin.slice(),
      boundMax: geom.boundMax.slice(),
      shDegree: parsed.shDegree ?? 0,
      _worker: worker,
      _depthMix: new BigInt64Array(vertexCount),
      _sortWorldMatrix: new F32(16),
      _sortCameraForward: new F32(3),
      _sortCameraPosition: new F32(3),
      _canPostToWorker: true,
      firstSortReady,
      _firstSortResolve: firstResolve,
      _gs: {
        _centersTex: centers.tex,
        _centersView: centers.view,
        _covATex: covA.tex,
        _covAView: covA.view,
        _covBTex: covB.tex,
        _covBView: covB.view,
        _colorsTex: colors.tex,
        _colorsView: colors.view,
        _sampler: sampler,
        _quadBuffer: quadBuffer,
        _indexBuffer: indexBuffer,
        _splatIndexBuffer: splatIndexBuffer,
        _splatIndexCpu: splatIndexCpu,
        _shTextures: null,
        _shViews: null
      }
    };
    Object.defineProperty(mesh, "splatsData", {
      get: () => retainedSplatsData
    });
    mesh.updateData = (newBuffer) => {
      const newGeom = buildSplatGeometry(newBuffer);
      if (newGeom.vertexCount !== mesh.vertexCount) {
        throw Error("GS vertex count mismatch");
      }
      const gs = mesh._gs;
      const writeTex = (tex, data) => {
        queue.writeTexture({ texture: tex }, data.buffer, { bytesPerRow: newGeom.textureWidth * 16 }, { width: newGeom.textureWidth, height: newGeom.textureHeight });
      };
      writeTex(gs._centersTex, newGeom.centersRGBA);
      writeTex(gs._covATex, newGeom.covARGBA);
      writeTex(gs._covBTex, newGeom.covBRGBA);
      writeTex(gs._colorsTex, newGeom.colorsRGBA);
      mesh.boundMin = newGeom.boundMin.slice();
      mesh.boundMax = newGeom.boundMax.slice();
      mesh._worker.postMessage({ p: newGeom.positions, n: newGeom.vertexCount }, [newGeom.positions.buffer]);
      mesh._sortWorldMatrix.fill(0);
      mesh._sortCameraForward.fill(0);
      mesh._sortCameraPosition.fill(0);
      retainedSplatsData = newBuffer;
    };
    initSplatTransform(mesh);
    worker.postMessage({ p: geom.positions, n: vertexCount }, [geom.positions.buffer]);
    worker.onmessage = (e) => {
      const data = e.data;
      mesh._depthMix = data.d;
      const indices = new U32(data.d.buffer);
      const cpu = mesh._gs._splatIndexCpu;
      for (let j = 0; j < mesh.vertexCount; j++) {
        cpu[j] = indices[2 * j];
      }
      queue.writeBuffer(mesh._gs._splatIndexBuffer, 0, cpu.buffer, 0, cpu.byteLength);
      mesh._canPostToWorker = true;
      if (mesh._firstSortResolve) {
        mesh._firstSortResolve();
        mesh._firstSortResolve = null;
      }
    };
    return mesh;
  }
  function disposeGaussianSplattingMesh(mesh) {
    const gs = mesh._gs;
    [gs._centersTex, gs._covATex, gs._covBTex, gs._colorsTex, gs._quadBuffer, gs._indexBuffer, gs._splatIndexBuffer, ...gs._shTextures ?? []].forEach(
      (resource) => resource.destroy()
    );
    mesh._worker.terminate();
  }
  function initSplatTransform(node) {
    const wm = createWorldMatrixState(() => {
      const p = node.position, rq2 = node.rotationQuaternion, s = node.scaling;
      const isIdentity = p.x === 0 && p.y === 0 && p.z === 0 && rq2.x === 0 && rq2.y === 0 && rq2.z === 0 && rq2.w === 1 && s.x === 1 && s.y === 1 && s.z === 1;
      return isIdentity ? mat4Identity() : mat4Compose(p.x, p.y, p.z, rq2.x, rq2.y, rq2.z, rq2.w, s.x, s.y, s.z);
    });
    const onDirty = () => wm.markLocalDirty();
    const [iqx, iqy, iqz, iqw] = eulerToQuat(0, 0, 0);
    const rq = new ObservableQuat(iqx, iqy, iqz, iqw, onDirty);
    node.rotationQuaternion = rq;
    node.rotation = createEulerProxy(rq);
    node.position = new ObservableVec3(0, 0, 0, onDirty);
    node.scaling = new ObservableVec3(1, 1, 1, onDirty);
    node.children = [];
    Object.defineProperty(node, "parent", {
      get() {
        return wm.parent;
      },
      set(v) {
        wm.parent = v;
      },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(node, "worldMatrix", {
      get() {
        return wm.getWorldMatrix();
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(node, "worldMatrixVersion", {
      get() {
        return wm.getWorldMatrixVersion();
      },
      configurable: true,
      enumerable: false
    });
    attachWorldMatrixState(node, wm);
  }
  var init_gaussian_splatting_mesh = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gaussian-splatting-mesh.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_mat4();
      init_observable_vec3();
      init_observable_quat();
      init_world_matrix_state();
      init_scene_node();
      init_splat_data();
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\gaussian-splatting.wgsl
  var gaussian_splatting_default;
  var init_gaussian_splatting = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\gaussian-splatting.wgsl"() {
      gaussian_splatting_default = "// Gaussian Splatting \u2014 vertex + fragment WGSL.\r\n// Mirrors the math in BJS gaussianSplatting.vertex.fx / .fragment.fx\r\n// (static splat path: no SH, no compound transforms).\r\nstruct U {\r\n  world: mat4x4<f32>,\r\n  view: mat4x4<f32>,\r\n  projection: mat4x4<f32>,\r\n  viewport: vec2<f32>,\r\n  focal: vec2<f32>,\r\n  dataSize: vec2<f32>,\r\n  alpha: f32,\r\n  _pad: f32,\r\n};\r\n@group(1) @binding(0) var<uniform> u: U;\r\n@group(1) @binding(1) var samp: sampler;\r\n@group(1) @binding(2) var centersTex: texture_2d<f32>;\r\n@group(1) @binding(3) var covATex: texture_2d<f32>;\r\n@group(1) @binding(4) var covBTex: texture_2d<f32>;\r\n@group(1) @binding(5) var colorsTex: texture_2d<f32>;\r\n\r\nstruct VOut {\r\n  @builtin(position) pos: vec4<f32>,\r\n  @location(0) vColor: vec4<f32>,\r\n  @location(1) vPos: vec2<f32>,\r\n};\r\n\r\nfn dataUv(idx: f32) -> vec2<f32> {\r\n  let y = floor(idx / u.dataSize.x);\r\n  let x = idx - y * u.dataSize.x;\r\n  return vec2<f32>((x + 0.5) / u.dataSize.x, (y + 0.5) / u.dataSize.y);\r\n}\r\n\r\n@vertex\r\nfn vs(@location(0) corner: vec2<f32>, @location(1) splatIndex: f32) -> VOut {\r\n  var out: VOut;\r\n  let uv = dataUv(splatIndex);\r\n  let center = textureSampleLevel(centersTex, samp, uv, 0.0).xyz;\r\n  let color  = textureSampleLevel(colorsTex,  samp, uv, 0.0);\r\n  let covA   = textureSampleLevel(covATex,    samp, uv, 0.0).xyz;\r\n  let covB   = textureSampleLevel(covBTex,    samp, uv, 0.0).xyz;\r\n\r\n  let worldPos  = u.world * vec4<f32>(center, 1.0);\r\n  let modelView = u.view  * u.world;\r\n  let camspace  = u.view  * worldPos;\r\n  let pos2d     = u.projection * camspace;\r\n\r\n  let bounds = 1.2 * pos2d.w;\r\n  if (pos2d.z < 0.0\r\n      || pos2d.x < -bounds || pos2d.x > bounds\r\n      || pos2d.y < -bounds || pos2d.y > bounds) {\r\n    out.pos = vec4<f32>(0.0, 0.0, 2.0, 1.0);\r\n    out.vColor = vec4<f32>(0.0);\r\n    out.vPos = vec2<f32>(0.0);\r\n    return out;\r\n  }\r\n\r\n  let Vrk = mat3x3<f32>(\r\n    vec3<f32>(covA.x, covA.y, covA.z),\r\n    vec3<f32>(covA.y, covB.x, covB.y),\r\n    vec3<f32>(covA.z, covB.y, covB.z));\r\n\r\n  let invZ  = 1.0 / camspace.z;\r\n  let invZ2 = invZ * invZ;\r\n  // J is written in the SAME transposed-storage form BJS uses in\r\n  // gaussianSplatting.fx \u2014 i.e. the perspective-correction terms\r\n  // -focal\xB7x/z\xB2 and -focal\xB7y/z\xB2 sit in math row 2 (columns 0,1), not in\r\n  // math column 2.  This is required because the next two lines compute\r\n  // `T = transpose(mv3) * J` and `cov2d = transpose(T) * Vrk * T`,\r\n  // which only collapses to the correct EWA projection\r\n  //     cov2d = (J_std \xB7 mv3) \xB7 \u03A3 \xB7 (J_std \xB7 mv3)\u1D40\r\n  // when J here equals J_std\u1D40.  Using J in standard form would compute\r\n  // the wrong product J\u1D40\xB7mv3\xB7\u03A3\xB7mv3\u1D40\xB7J, agreeing with BJS only for splats\r\n  // on the optical axis (x=y=0) and producing visible per-splat\r\n  // orientation differences off-centre.\r\n  let J = mat3x3<f32>(\r\n    vec3<f32>(u.focal.x * invZ, 0.0, -u.focal.x * camspace.x * invZ2),\r\n    vec3<f32>(0.0, u.focal.y * invZ, -u.focal.y * camspace.y * invZ2),\r\n    vec3<f32>(0.0, 0.0, 0.0));\r\n\r\n  let mv3 = mat3x3<f32>(modelView[0].xyz, modelView[1].xyz, modelView[2].xyz);\r\n  let T = transpose(mv3) * J;\r\n  var cov2d = transpose(T) * Vrk * T;\r\n\r\n  // BJS GaussianSplattingMaterial defaults: KernelSize = 0.3 (low-pass dilation\r\n  // \u2014 keeps sub-pixel splats from disappearing, see gaussianSplatting.fx).\r\n  // The +epsilon in the eigenvalues mirrors the same shader's numerical safety.\r\n  let kernelSize: f32 = 0.3;\r\n  cov2d[0][0] += kernelSize;\r\n  cov2d[1][1] += kernelSize;\r\n\r\n  let mid = (cov2d[0][0] + cov2d[1][1]) * 0.5;\r\n  let dxy = (cov2d[0][0] - cov2d[1][1]) * 0.5;\r\n  let radius = length(vec2<f32>(dxy, cov2d[0][1]));\r\n  let epsilon: f32 = 0.0001;\r\n  let lambda1 = mid + radius + epsilon;\r\n  let lambda2 = mid - radius + epsilon;\r\n  if (lambda2 < 0.0) {\r\n    out.pos = vec4<f32>(0.0, 0.0, 2.0, 1.0);\r\n    out.vColor = vec4<f32>(0.0);\r\n    out.vPos = vec2<f32>(0.0);\r\n    return out;\r\n  }\r\n\r\n  let diag = normalize(vec2<f32>(cov2d[0][1], lambda1 - cov2d[0][0]));\r\n  let majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diag;\r\n  let minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2<f32>(diag.y, -diag.x);\r\n\r\n  let vCenter = pos2d.xy;\r\n  out.pos = vec4<f32>(\r\n    vCenter + (corner.x * majorAxis + corner.y * minorAxis) * pos2d.w / u.viewport,\r\n    pos2d.z, pos2d.w);\r\n  out.vColor = vec4<f32>(color.rgb, color.a * u.alpha);\r\n  out.vPos = corner;\r\n  return out;\r\n}\r\n\r\n/*GS_FRAGMENT_DEFINITIONS*/\r\n@fragment\r\nfn fs(in: VOut) -> @location(0) vec4<f32> {\r\n  /*GS_FRAGMENT_MAIN_BEGIN*/\r\n  let A = -dot(in.vPos, in.vPos);\r\n  var finalColor: vec4<f32>;\r\n  if (A > -4.0) {\r\n    let B = exp(A) * in.vColor.a;\r\n    finalColor = vec4<f32>(in.vColor.rgb, B);\r\n  } else {\r\n    finalColor = vec4<f32>(0.0);\r\n  }\r\n  /*GS_FRAGMENT_BEFORE_FRAGCOLOR*/\r\n  /*GS_FRAGMENT_MAIN_END*/\r\n  return finalColor;\r\n}\r\n";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gaussian-splatting-pipeline.ts
  function applyGsFragments(wgsl, fragments) {
    const slotCode = {};
    for (const frag of fragments) {
      if (frag.helperFunctions) {
        slotCode["GS_FRAGMENT_DEFINITIONS"] = (slotCode["GS_FRAGMENT_DEFINITIONS"] ?? "") + frag.helperFunctions + "\n";
      }
      for (const [slot, code] of Object.entries(frag.fragmentSlots ?? {})) {
        slotCode[slot] = (slotCode[slot] ?? "") + code + "\n";
      }
    }
    const spliced = wgsl.replace(/\/\*(GS_FRAGMENT_\w+)\*\//g, (_, slot) => slotCode[slot] ?? "");
    const mangles = [
      ["world", "w"],
      ["view", "v"],
      ["projection", "p"],
      ["viewport", "vp"],
      ["focal", "f"],
      ["dataSize", "ds"],
      ["alpha", "a"],
      ["_pad", "_p"],
      ["vColor", "vc"],
      ["vPos", "vq"],
      ["dataUv", "du"],
      ["splatIndex", "si"],
      ["corner", "co"],
      ["center", "ce"],
      ["color", "cl"],
      ["covA", "ca"],
      ["covB", "cb"],
      ["worldPos", "wp"],
      ["modelView", "mv"],
      ["camspace", "cs"],
      ["pos2d", "p2"],
      ["bounds", "bd"],
      ["Vrk", "vr"],
      ["invZ2", "iz2"],
      ["invZ", "iz"],
      ["cov2d", "c2"],
      ["kernelSize", "ks"],
      ["radius", "ra"],
      ["epsilon", "ep"],
      ["lambda1", "l1"],
      ["lambda2", "l2"],
      ["diag", "dg"],
      ["majorAxis", "ma"],
      ["minorAxis", "mi"],
      ["vCenter", "vc2"]
    ];
    let mangled = spliced;
    for (const [from, to] of mangles) {
      mangled = mangled.replace(new RegExp(`\\b${from}\\b`, "g"), to);
    }
    return mangled;
  }
  function getOrCreatePipeline(engine, sig, fragments) {
    const device = engine._device;
    if (!_cache || _cache.device !== device) {
      _cache = { device, modules: /* @__PURE__ */ new Map(), entries: /* @__PURE__ */ new Map() };
    }
    const fragKey = fragments && fragments.length > 0 ? "|" + fragments.map((f) => f.id).join(",") : "";
    const key = targetSignatureKey(sig) + fragKey;
    let entry = _cache.entries.get(key);
    if (entry) {
      return entry;
    }
    let module = _cache.modules.get(fragKey);
    if (!module) {
      module = device.createShaderModule({ code: fragments && fragments.length > 0 ? applyGsFragments(gaussian_splatting_default, fragments) : gaussian_splatting_default });
      _cache.modules.set(fragKey, module);
    }
    const meshBindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: SS.VERTEX, sampler: { type: "non-filtering" } },
        { binding: 2, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
        { binding: 3, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
        { binding: 4, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
        { binding: 5, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } }
      ]
    });
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [getSceneBindGroupLayout(engine), meshBindGroupLayout] }),
      vertex: {
        module,
        entryPoint: "vs",
        buffers: [
          {
            arrayStride: 8,
            stepMode: "vertex",
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }]
          },
          {
            arrayStride: 4,
            stepMode: "instance",
            attributes: [{ shaderLocation: 1, offset: 0, format: "float32" }]
          }
        ]
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [
          {
            format: sig._colorFormat,
            blend: {
              // BJS GS material uses ALPHA_COMBINE: src*srcAlpha + dst*(1-srcAlpha)
              color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
            },
            writeMask: CW.ALL
          }
        ]
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: {
        format: sig._depthStencilFormat ?? "depth24plus-stencil8",
        depthCompare: sig._depthCompare ?? "greater-equal",
        depthWriteEnabled: false
      },
      multisample: { count: sig._sampleCount }
    });
    entry = { pipeline, meshBindGroupLayout };
    _cache.entries.set(key, entry);
    return entry;
  }
  function buildGaussianSplattingRenderable(scene, mesh, fragments) {
    const engine = scene.surface.engine;
    const device = engine._device;
    const UBO_BYTES = 16 * 4 * 3 + 8 * 4;
    const ubo = device.createBuffer({
      size: UBO_BYTES,
      usage: BU.UNIFORM | BU.COPY_DST
    });
    const cpu = new F32(UBO_BYTES / 4);
    cpu[48 + 4] = mesh.textureWidth;
    cpu[48 + 5] = mesh.textureHeight;
    cpu[48 + 6] = 1;
    cpu[48 + 7] = 0;
    const bindGroups = /* @__PURE__ */ new Map();
    const getBindGroup = (entry) => {
      let bg = bindGroups.get(entry.pipeline);
      if (bg) {
        return bg;
      }
      bg = device.createBindGroup({
        layout: entry.meshBindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: ubo } },
          { binding: 1, resource: mesh._gs._sampler },
          { binding: 2, resource: mesh._gs._centersView },
          { binding: 3, resource: mesh._gs._covAView },
          { binding: 4, resource: mesh._gs._covBView },
          { binding: 5, resource: mesh._gs._colorsView }
        ]
      });
      bindGroups.set(entry.pipeline, bg);
      return bg;
    };
    const SORT_EPS = 1e-4;
    const update = () => {
      const cam = scene.camera;
      if (!cam) {
        return;
      }
      const size = getRenderTargetSize(engine);
      const aspect = size.width / size.height;
      const view = getViewMatrix(cam);
      const proj = getProjectionMatrix(cam, aspect);
      const world = mesh.worldMatrix;
      cpu.set(world, 0);
      cpu.set(view, 16);
      cpu.set(proj, 32);
      cpu[48] = size.width;
      cpu[48 + 1] = size.height;
      cpu[48 + 2] = size.width * 0.5 * proj[0];
      cpu[48 + 3] = size.height * 0.5 * proj[5];
      device.queue.writeBuffer(ubo, 0, cpu.buffer, 0, UBO_BYTES);
      if (!mesh._canPostToWorker) {
        return;
      }
      const camPos = getCameraPosition(cam);
      const cf0 = view[2], cf1 = view[6], cf2 = view[10];
      let dirty = false;
      const lastW = mesh._sortWorldMatrix;
      for (let i = 0; i < 16; i++) {
        if (Math.abs(lastW[i] - world[i]) > SORT_EPS) {
          dirty = true;
          break;
        }
      }
      if (!dirty) {
        const lastCf = mesh._sortCameraForward;
        if (Math.abs(lastCf[0] - cf0) > SORT_EPS || Math.abs(lastCf[1] - cf1) > SORT_EPS || Math.abs(lastCf[2] - cf2) > SORT_EPS) {
          dirty = true;
        }
      }
      if (!dirty) {
        const lastCp = mesh._sortCameraPosition;
        if (Math.abs(lastCp[0] - camPos.x) > SORT_EPS || Math.abs(lastCp[1] - camPos.y) > SORT_EPS || Math.abs(lastCp[2] - camPos.z) > SORT_EPS) {
          dirty = true;
        }
      }
      if (!dirty) {
        return;
      }
      mesh._sortWorldMatrix.set(world);
      mesh._sortCameraForward[0] = cf0;
      mesh._sortCameraForward[1] = cf1;
      mesh._sortCameraForward[2] = cf2;
      mesh._sortCameraPosition[0] = camPos.x;
      mesh._sortCameraPosition[1] = camPos.y;
      mesh._sortCameraPosition[2] = camPos.z;
      mesh._canPostToWorker = false;
      mesh._worker.postMessage(
        {
          m: new F32(world),
          f: new F32([cf0, cf1, cf2]),
          c: new F32([camPos.x, camPos.y, camPos.z]),
          d: mesh._depthMix
        },
        [mesh._depthMix.buffer]
      );
    };
    const r = {
      order: 200,
      isTransparent: true,
      bind(eng, sig) {
        const entry = getOrCreatePipeline(eng, sig, fragments);
        const bindGroup = getBindGroup(entry);
        return {
          renderable: r,
          pipeline: entry.pipeline,
          update,
          draw(pass) {
            pass.setBindGroup(1, bindGroup);
            pass.setVertexBuffer(0, mesh._gs._quadBuffer);
            pass.setVertexBuffer(1, mesh._gs._splatIndexBuffer);
            pass.setIndexBuffer(mesh._gs._indexBuffer, "uint16");
            pass.drawIndexed(6, mesh.vertexCount);
            return 1;
          }
        };
      }
    };
    return r;
  }
  function attachGaussianSplattingMesh(scene, mesh, fragments) {
    const ctx = scene;
    ctx._renderables.push(buildGaussianSplattingRenderable(scene, mesh, fragments));
    ctx._gsMeshes.push(mesh);
    ctx._disposables.push(() => {
      const i = ctx._gsMeshes.indexOf(mesh);
      if (i >= 0) {
        ctx._gsMeshes.splice(i, 1);
      }
      disposeGaussianSplattingMesh(mesh);
    });
  }
  var _cache;
  var init_gaussian_splatting_pipeline = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gaussian-splatting-pipeline.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_render_target();
      init_camera();
      init_scene_helpers();
      init_engine();
      init_gaussian_splatting_mesh();
      init_gaussian_splatting();
      _cache = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gaussian-splatting-pipeline-sh.ts
  var gaussian_splatting_pipeline_sh_exports = {};
  __export(gaussian_splatting_pipeline_sh_exports, {
    attachGaussianSplattingMeshSH: () => attachGaussianSplattingMeshSH,
    buildGaussianSplattingRenderableSH: () => buildGaussianSplattingRenderableSH
  });
  function buildShShaderSource(shDegree) {
    const shVectorCount = (shDegree + 1) * (shDegree + 1) - 1;
    const shCoefficientCount = shVectorCount * 3;
    const textureCount = Math.ceil(shCoefficientCount / 16);
    let textureBindings = "";
    for (let i = 0; i < textureCount; i++) {
      textureBindings += `@group(1) @binding(${6 + i}) var shTexture${i}: texture_2d<u32>;
`;
    }
    let textureLoads = "";
    for (let i = 0; i < textureCount; i++) {
      textureLoads += `  let sh${i}_u32 = textureLoad(shTexture${i}, splatUVi32, 0);
`;
    }
    let shUnpack = `  var sh: array<vec3<f32>, ${shVectorCount + 1}>;
  sh[0] = vec3<f32>(0.0);
`;
    const byteRef = (j) => {
      const tex = j / 16 | 0;
      const u32Idx = j % 16 / 4 | 0;
      const byteIdx = j % 4;
      const u32Field = ["x", "y", "z", "w"][u32Idx];
      const byteField = ["x", "y", "z", "w"][byteIdx];
      return `decompose(sh${tex}_u32.${u32Field}).${byteField}`;
    };
    for (let k = 0; k < shVectorCount; k++) {
      const j = k * 3;
      shUnpack += `  sh[${k + 1}] = vec3<f32>(${byteRef(j)}, ${byteRef(j + 1)}, ${byteRef(j + 2)});
`;
    }
    let shPoly = "  result = sh[0];\n";
    if (shDegree >= 1) {
      shPoly += `  result += -SH_C1 * y * sh[1] + SH_C1 * z * sh[2] - SH_C1 * x * sh[3];
`;
    }
    if (shDegree >= 2) {
      shPoly += `  result +=
    SH_C2[0] * xy * sh[4] +
    SH_C2[1] * yz * sh[5] +
    SH_C2[2] * (2.0 * zz - xx - yy) * sh[6] +
    SH_C2[3] * xz * sh[7] +
    SH_C2[4] * (xx - yy) * sh[8];
`;
    }
    if (shDegree >= 3) {
      shPoly += `  result +=
    SH_C3[0] * y * (3.0 * xx - yy) * sh[9] +
    SH_C3[1] * xy * z * sh[10] +
    SH_C3[2] * y * (4.0 * zz - xx - yy) * sh[11] +
    SH_C3[3] * z * (2.0 * zz - 3.0 * xx - 3.0 * yy) * sh[12] +
    SH_C3[4] * x * (4.0 * zz - xx - yy) * sh[13] +
    SH_C3[5] * z * (xx - yy) * sh[14] +
    SH_C3[6] * x * (xx - 3.0 * yy) * sh[15];
`;
    }
    if (shDegree >= 4) {
      shPoly += `  result +=
    SH_C4[0] * x * y * (xx - yy) * sh[16] +
    SH_C4[1] * y * z * (3.0 * xx - yy) * sh[17] +
    SH_C4[2] * x * y * (7.0 * zz - 1.0) * sh[18] +
    SH_C4[3] * y * z * (7.0 * zz - 3.0) * sh[19] +
    SH_C4[4] * (zz * (35.0 * zz - 30.0) + 3.0) * sh[20] +
    SH_C4[5] * x * z * (7.0 * zz - 3.0) * sh[21] +
    SH_C4[6] * (xx - yy) * (7.0 * zz - 1.0) * sh[22] +
    SH_C4[7] * x * z * (xx - 3.0 * yy) * sh[23] +
    SH_C4[8] * (xx * (xx - 3.0 * yy) - yy * (3.0 * xx - yy)) * sh[24];
`;
    }
    let constantsBlock = `const SH_C1: f32 = 0.48860251;
`;
    if (shDegree >= 2) {
      constantsBlock += `const SH_C2: array<f32, 5> = array<f32, 5>(1.092548430, -1.09254843, 0.315391565, -1.09254843, 0.546274215);
`;
    }
    if (shDegree >= 3) {
      constantsBlock += `const SH_C3: array<f32, 7> = array<f32, 7>(-0.59004358, 2.890611442, -0.45704579, 0.373176332, -0.45704579, 1.445305721, -0.59004358);
`;
    }
    if (shDegree >= 4) {
      constantsBlock += `const SH_C4: array<f32, 9> = array<f32, 9>(2.5033429418, -1.7701307698, 0.9461746958, -0.6690465436, 0.1057855469, -0.6690465436, 0.4730873479, -1.7701307698, 0.6258357354);
`;
    }
    return `// Gaussian Splatting \u2014 vertex + fragment WGSL (SH degree ${shDegree}).
// Generated by buildShShaderSource. Mirrors BJS gaussianSplatting.vertex.fx +
// gaussianSplatting.fx (SH_DEGREE = ${shDegree}, no compound parts).
struct U {
  world: mat4x4<f32>,
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
  viewport: vec2<f32>,
  focal: vec2<f32>,
  dataSize: vec2<f32>,
  alpha: f32,
  _pad0: f32,
  eyePosition: vec3<f32>,
  _pad1: f32,
};
@group(1) @binding(0) var<uniform> u: U;
@group(1) @binding(1) var samp: sampler;
@group(1) @binding(2) var centersTex: texture_2d<f32>;
@group(1) @binding(3) var covATex: texture_2d<f32>;
@group(1) @binding(4) var covBTex: texture_2d<f32>;
@group(1) @binding(5) var colorsTex: texture_2d<f32>;
${textureBindings}

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) vColor: vec4<f32>,
  @location(1) vPos: vec2<f32>,
};

${constantsBlock}

fn dataUv(idx: f32) -> vec2<f32> {
  let y = floor(idx / u.dataSize.x);
  let x = idx - y * u.dataSize.x;
  return vec2<f32>((x + 0.5) / u.dataSize.x, (y + 0.5) / u.dataSize.y);
}

fn dataUvI(idx: f32) -> vec2<i32> {
  let y = floor(idx / u.dataSize.x);
  let x = idx - y * u.dataSize.x;
  return vec2<i32>(i32(x), i32(y));
}

// Unpack a u32 of 4 packed bytes into (b0 b1 b2 b3) * 2/255 - 1.
fn decompose(value: u32) -> vec4<f32> {
  let v = vec4<f32>(
    f32((value >> 0u) & 255u),
    f32((value >> 8u) & 255u),
    f32((value >> 16u) & 255u),
    f32((value >> 24u) & 255u));
  return v * vec4<f32>(2.0 / 255.0) - vec4<f32>(1.0);
}

fn inverseMat3(m: mat3x3<f32>) -> mat3x3<f32> {
  let a00 = m[0][0]; let a01 = m[0][1]; let a02 = m[0][2];
  let a10 = m[1][0]; let a11 = m[1][1]; let a12 = m[1][2];
  let a20 = m[2][0]; let a21 = m[2][1]; let a22 = m[2][2];
  let b01 = a22 * a11 - a12 * a21;
  let b11 = -a22 * a10 + a12 * a20;
  let b21 = a21 * a10 - a11 * a20;
  let det = a00 * b01 + a01 * b11 + a02 * b21;
  return mat3x3<f32>(
    vec3<f32>(b01 / det, (-a22 * a01 + a02 * a21) / det, (a12 * a01 - a02 * a11) / det),
    vec3<f32>(b11 / det, (a22 * a00 - a02 * a20) / det, (-a12 * a00 + a02 * a10) / det),
    vec3<f32>(b21 / det, (-a21 * a00 + a01 * a20) / det, (a11 * a00 - a01 * a10) / det));
}

fn computeSH(dir: vec3<f32>, splatUVi32: vec2<i32>) -> vec3<f32> {
${textureLoads}${shUnpack}  let x = dir.x;
  let y = dir.y;
  let z = dir.z;
  let xx = x * x; let yy = y * y; let zz = z * z;
  let xy = x * y; let yz = y * z; let xz = x * z;
  var result: vec3<f32>;
${shPoly}  return result;
}

@vertex
fn vs(@location(0) corner: vec2<f32>, @location(1) splatIndex: f32) -> VOut {
  var out: VOut;
  let uv = dataUv(splatIndex);
  let splatUVi32 = dataUvI(splatIndex);
  let center = textureSampleLevel(centersTex, samp, uv, 0.0).xyz;
  let color  = textureSampleLevel(colorsTex,  samp, uv, 0.0);
  let covA   = textureSampleLevel(covATex,    samp, uv, 0.0).xyz;
  let covB   = textureSampleLevel(covBTex,    samp, uv, 0.0).xyz;

  let worldPos  = u.world * vec4<f32>(center, 1.0);
  let modelView = u.view  * u.world;
  let camspace  = u.view  * worldPos;
  let pos2d     = u.projection * camspace;

  let bounds = 1.2 * pos2d.w;
  if (pos2d.z < 0.0
      || pos2d.x < -bounds || pos2d.x > bounds
      || pos2d.y < -bounds || pos2d.y > bounds) {
    out.pos = vec4<f32>(0.0, 0.0, 2.0, 1.0);
    out.vColor = vec4<f32>(0.0);
    out.vPos = vec2<f32>(0.0);
    return out;
  }

  // \u2500\u2500 View-dependent SH evaluation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  let worldRot = mat3x3<f32>(u.world[0].xyz, u.world[1].xyz, u.world[2].xyz);
  let normWorldRot = inverseMat3(worldRot);
  var dir = normalize(normWorldRot * (worldPos.xyz - u.eyePosition));
  // Lite-side Y-flip: compensates for our data-path Y pre-flip vs BJS's
  // mesh.scaling.y *= -1 (see file header for derivation).
  dir.y = -dir.y;
  let shColor = computeSH(dir, splatUVi32);

  let Vrk = mat3x3<f32>(
    vec3<f32>(covA.x, covA.y, covA.z),
    vec3<f32>(covA.y, covB.x, covB.y),
    vec3<f32>(covA.z, covB.y, covB.z));

  let invZ  = 1.0 / camspace.z;
  let invZ2 = invZ * invZ;
  let J = mat3x3<f32>(
    vec3<f32>(u.focal.x * invZ, 0.0, -u.focal.x * camspace.x * invZ2),
    vec3<f32>(0.0, u.focal.y * invZ, -u.focal.y * camspace.y * invZ2),
    vec3<f32>(0.0, 0.0, 0.0));

  let mv3 = mat3x3<f32>(modelView[0].xyz, modelView[1].xyz, modelView[2].xyz);
  let T = transpose(mv3) * J;
  var cov2d = transpose(T) * Vrk * T;

  let kernelSize: f32 = 0.3;
  cov2d[0][0] += kernelSize;
  cov2d[1][1] += kernelSize;

  let mid = (cov2d[0][0] + cov2d[1][1]) * 0.5;
  let dxy = (cov2d[0][0] - cov2d[1][1]) * 0.5;
  let radius = length(vec2<f32>(dxy, cov2d[0][1]));
  let epsilon: f32 = 0.0001;
  let lambda1 = mid + radius + epsilon;
  let lambda2 = mid - radius + epsilon;
  if (lambda2 < 0.0) {
    out.pos = vec4<f32>(0.0, 0.0, 2.0, 1.0);
    out.vColor = vec4<f32>(0.0);
    out.vPos = vec2<f32>(0.0);
    return out;
  }

  let diag = normalize(vec2<f32>(cov2d[0][1], lambda1 - cov2d[0][0]));
  let majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diag;
  let minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2<f32>(diag.y, -diag.x);

  let vCenter = pos2d.xy;
  out.pos = vec4<f32>(
    vCenter + (corner.x * majorAxis + corner.y * minorAxis) * pos2d.w / u.viewport,
    pos2d.z, pos2d.w);
  out.vColor = vec4<f32>(color.rgb + shColor, color.a * u.alpha);
  out.vPos = corner;
  return out;
}

/*GS_FRAGMENT_DEFINITIONS*/
@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
  /*GS_FRAGMENT_MAIN_BEGIN*/
  let A = -dot(in.vPos, in.vPos);
  if (A < -4.0) { discard; }
  let B = exp(A) * in.vColor.a;
  var finalColor = vec4<f32>(in.vColor.rgb, B);
  /*GS_FRAGMENT_BEFORE_FRAGCOLOR*/
  /*GS_FRAGMENT_MAIN_END*/
  return finalColor;
}
`;
  }
  function getOrCreateShPipeline(engine, sig, shDegree, fragments) {
    const device = engine._device;
    if (!_cache2 || _cache2.device !== device) {
      _cache2 = { device, modules: /* @__PURE__ */ new Map(), entries: /* @__PURE__ */ new Map() };
    }
    const fragKey = fragments && fragments.length > 0 ? "|" + fragments.map((f) => f.id).join(",") : "";
    let module = _cache2.modules.get(shDegree + fragKey);
    if (!module) {
      module = device.createShaderModule({
        code: fragments && fragments.length > 0 ? applyGsFragments(buildShShaderSource(shDegree), fragments) : buildShShaderSource(shDegree)
      });
      _cache2.modules.set(shDegree + fragKey, module);
    }
    const key = `${targetSignatureKey(sig)}|sh${shDegree}${fragKey}`;
    let entry = _cache2.entries.get(key);
    if (entry) {
      return entry;
    }
    const shTextureCount = SH_TEXTURE_COUNT[shDegree];
    const layoutEntries = [
      { binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: SS.VERTEX, sampler: { type: "non-filtering" } },
      { binding: 2, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
      { binding: 3, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
      { binding: 4, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
      { binding: 5, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } }
    ];
    for (let i = 0; i < shTextureCount; i++) {
      layoutEntries.push({ binding: 6 + i, visibility: SS.VERTEX, texture: { sampleType: "uint" } });
    }
    const meshBindGroupLayout = device.createBindGroupLayout({ entries: layoutEntries });
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [getSceneBindGroupLayout(engine), meshBindGroupLayout] }),
      vertex: {
        module,
        entryPoint: "vs",
        buffers: [
          { arrayStride: 8, stepMode: "vertex", attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] },
          { arrayStride: 4, stepMode: "instance", attributes: [{ shaderLocation: 1, offset: 0, format: "float32" }] }
        ]
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [
          {
            format: sig._colorFormat,
            blend: {
              color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
            },
            writeMask: CW.ALL
          }
        ]
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: {
        format: sig._depthStencilFormat ?? "depth24plus-stencil8",
        depthCompare: sig._depthCompare ?? "greater-equal",
        depthWriteEnabled: false
      },
      multisample: { count: sig._sampleCount }
    });
    entry = { pipeline, meshBindGroupLayout, shTextureCount };
    _cache2.entries.set(key, entry);
    return entry;
  }
  function buildGaussianSplattingRenderableSH(scene, mesh, fragments) {
    const engine = scene.surface.engine;
    const device = engine._device;
    const UBO_BYTES = 16 * 4 * 3 + 8 * 4 + 4 * 4;
    const ubo = device.createBuffer({
      size: UBO_BYTES,
      usage: BU.UNIFORM | BU.COPY_DST
    });
    const cpu = new F32(UBO_BYTES / 4);
    cpu[48 + 4] = mesh.textureWidth;
    cpu[48 + 5] = mesh.textureHeight;
    cpu[48 + 6] = 1;
    cpu[48 + 7] = 0;
    const bindGroups = /* @__PURE__ */ new Map();
    const getBindGroup = (entry) => {
      let bg = bindGroups.get(entry.pipeline);
      if (bg) {
        return bg;
      }
      const shViews = mesh._gs._shViews ?? [];
      const entries = [
        { binding: 0, resource: { buffer: ubo } },
        { binding: 1, resource: mesh._gs._sampler },
        { binding: 2, resource: mesh._gs._centersView },
        { binding: 3, resource: mesh._gs._covAView },
        { binding: 4, resource: mesh._gs._covBView },
        { binding: 5, resource: mesh._gs._colorsView }
      ];
      for (let i = 0; i < entry.shTextureCount; i++) {
        entries.push({ binding: 6 + i, resource: shViews[i] });
      }
      bg = device.createBindGroup({ layout: entry.meshBindGroupLayout, entries });
      bindGroups.set(entry.pipeline, bg);
      return bg;
    };
    const SORT_EPS = 1e-4;
    const update = () => {
      const cam = scene.camera;
      if (!cam) {
        return;
      }
      const size = getRenderTargetSize(engine);
      const aspect = size.width / size.height;
      const view = getViewMatrix(cam);
      const proj = getProjectionMatrix(cam, aspect);
      const world = mesh.worldMatrix;
      const camPos = getCameraPosition(cam);
      cpu.set(world, 0);
      cpu.set(view, 16);
      cpu.set(proj, 32);
      cpu[48] = size.width;
      cpu[48 + 1] = size.height;
      cpu[48 + 2] = size.width * 0.5 * proj[0];
      cpu[48 + 3] = size.height * 0.5 * proj[5];
      cpu[56] = camPos.x;
      cpu[57] = camPos.y;
      cpu[58] = camPos.z;
      cpu[59] = 0;
      device.queue.writeBuffer(ubo, 0, cpu.buffer, 0, UBO_BYTES);
      if (!mesh._canPostToWorker) {
        return;
      }
      const cf0 = view[2], cf1 = view[6], cf2 = view[10];
      let dirty = false;
      const lastW = mesh._sortWorldMatrix;
      for (let i = 0; i < 16; i++) {
        if (Math.abs(lastW[i] - world[i]) > SORT_EPS) {
          dirty = true;
          break;
        }
      }
      if (!dirty) {
        const lastCf = mesh._sortCameraForward;
        if (Math.abs(lastCf[0] - cf0) > SORT_EPS || Math.abs(lastCf[1] - cf1) > SORT_EPS || Math.abs(lastCf[2] - cf2) > SORT_EPS) {
          dirty = true;
        }
      }
      if (!dirty) {
        const lastCp = mesh._sortCameraPosition;
        if (Math.abs(lastCp[0] - camPos.x) > SORT_EPS || Math.abs(lastCp[1] - camPos.y) > SORT_EPS || Math.abs(lastCp[2] - camPos.z) > SORT_EPS) {
          dirty = true;
        }
      }
      if (!dirty) {
        return;
      }
      mesh._sortWorldMatrix.set(world);
      mesh._sortCameraForward[0] = cf0;
      mesh._sortCameraForward[1] = cf1;
      mesh._sortCameraForward[2] = cf2;
      mesh._sortCameraPosition[0] = camPos.x;
      mesh._sortCameraPosition[1] = camPos.y;
      mesh._sortCameraPosition[2] = camPos.z;
      mesh._canPostToWorker = false;
      mesh._worker.postMessage(
        {
          m: new F32(world),
          f: new F32([cf0, cf1, cf2]),
          c: new F32([camPos.x, camPos.y, camPos.z]),
          d: mesh._depthMix
        },
        [mesh._depthMix.buffer]
      );
    };
    const r = {
      order: 200,
      isTransparent: true,
      bind(eng, sig) {
        const entry = getOrCreateShPipeline(eng, sig, mesh.shDegree, fragments);
        const bindGroup = getBindGroup(entry);
        return {
          renderable: r,
          pipeline: entry.pipeline,
          update,
          draw(pass) {
            pass.setBindGroup(1, bindGroup);
            pass.setVertexBuffer(0, mesh._gs._quadBuffer);
            pass.setVertexBuffer(1, mesh._gs._splatIndexBuffer);
            pass.setIndexBuffer(mesh._gs._indexBuffer, "uint16");
            pass.drawIndexed(6, mesh.vertexCount);
            return 1;
          }
        };
      }
    };
    return r;
  }
  function attachGaussianSplattingMeshSH(scene, mesh, shFlat, fragments) {
    const engine = scene.surface.engine;
    const device = engine._device;
    const shDegree = mesh.shDegree;
    const shVectorCount = (shDegree + 1) * (shDegree + 1) - 1;
    const shCoefficientCount = shVectorCount * 3;
    const textureCount = Math.ceil(shCoefficientCount / 16);
    const width = mesh.textureWidth;
    const height = mesh.textureHeight;
    const textures = [];
    const views = [];
    const vertexCount = mesh.vertexCount;
    for (let t = 0; t < textureCount; t++) {
      const dst = new U8(width * height * 16);
      const tBase = t * 16;
      const bytesThisTex = Math.min(16, shCoefficientCount - tBase);
      for (let i = 0; i < vertexCount; i++) {
        const srcOff = i * shCoefficientCount + tBase;
        const dstOff = i * 16;
        for (let b = 0; b < bytesThisTex; b++) {
          dst[dstOff + b] = shFlat[srcOff + b];
        }
      }
      const tex = device.createTexture({
        size: [width, height],
        format: "rgba32uint",
        usage: TU.TEXTURE_BINDING | TU.COPY_DST
      });
      device.queue.writeTexture({ texture: tex }, dst.buffer, { bytesPerRow: width * 16 }, { width, height });
      textures.push(tex);
      views.push(tex.createView());
    }
    mesh._gs._shTextures = textures;
    mesh._gs._shViews = views;
    const ctx = scene;
    ctx._renderables.push(buildGaussianSplattingRenderableSH(scene, mesh, fragments));
    ctx._gsMeshes.push(mesh);
    ctx._disposables.push(() => {
      const i = ctx._gsMeshes.indexOf(mesh);
      if (i >= 0) {
        ctx._gsMeshes.splice(i, 1);
      }
      disposeGaussianSplattingMesh(mesh);
    });
  }
  var SH_TEXTURE_COUNT, _cache2;
  var init_gaussian_splatting_pipeline_sh = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gaussian-splatting-pipeline-sh.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_render_target();
      init_camera();
      init_scene_helpers();
      init_engine();
      init_gaussian_splatting_mesh();
      init_gaussian_splatting_pipeline();
      SH_TEXTURE_COUNT = [0, 1, 2, 3, 5];
      _cache2 = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-splat/splat-ply-compressed.ts
  var splat_ply_compressed_exports = {};
  __export(splat_ply_compressed_exports, {
    convertCompressedPlyToParsedSplat: () => convertCompressedPlyToParsedSplat
  });
  function shDegreeForIndex(i) {
    if (i >= 71) {
      return 4;
    }
    if (i >= 44) {
      return 3;
    }
    if (i >= 23) {
      return 2;
    }
    if (i >= 8) {
      return 1;
    }
    return 0;
  }
  function parseHeader(data) {
    const headerText = new TextDecoder().decode(new U8(data, 0, Math.min(data.byteLength, 1024 * 10)));
    const headerEnd = "end_header\n";
    const idx = headerText.indexOf(headerEnd);
    if (idx < 0) {
      return null;
    }
    const vmatch = /element vertex (\d+)\n/.exec(headerText);
    if (!vmatch) {
      return null;
    }
    const vertexCount = parseInt(vmatch[1], 10);
    const cmatch = /element chunk (\d+)\n/.exec(headerText);
    const chunkCount = cmatch ? parseInt(cmatch[1], 10) : 0;
    let section = 1 /* Chunk */;
    let rowVertex = 0;
    let rowChunk = 0;
    const vertexProps = [];
    const chunkProps = [];
    const shProps = [];
    let shDegree = 0;
    for (const line of headerText.slice(0, idx).split("\n")) {
      if (line.startsWith("element ")) {
        const [, kind] = line.split(" ");
        section = kind === "chunk" ? 1 /* Chunk */ : kind === "vertex" ? 0 /* Vertex */ : kind === "sh" ? 2 /* SH */ : 3 /* Unused */;
        continue;
      }
      if (!line.startsWith("property ")) {
        continue;
      }
      const [, type, name] = line.split(" ");
      if (!type || !name || TYPE_SIZE[type] === void 0) {
        return null;
      }
      const sz = TYPE_SIZE[type];
      if (section === 1 /* Chunk */) {
        chunkProps.push({ name, type, offset: rowChunk });
        rowChunk += sz;
      } else if (section === 0 /* Vertex */) {
        vertexProps.push({ name, type, offset: rowVertex });
        rowVertex += sz;
        if (name.startsWith("f_rest_")) {
          shDegree = Math.max(shDegree, shDegreeForIndex(parseInt(name.slice(7), 10)));
        }
      } else if (section === 2 /* SH */) {
        shProps.push({ name, type, offset: 0 });
        if (name.startsWith("f_rest_")) {
          shDegree = Math.max(shDegree, shDegreeForIndex(parseInt(name.slice(7), 10)));
        }
      }
    }
    const shCoefficientCount = shDegree ? ((shDegree + 1) * (shDegree + 1) - 1) * 3 : 0;
    return {
      vertexCount,
      chunkCount,
      rowVertexLength: rowVertex,
      rowChunkLength: rowChunk,
      vertexProps,
      chunkProps,
      shProps,
      shDegree,
      shCoefficientCount,
      dataStart: idx + headerEnd.length
    };
  }
  function readChunks(header, dv, offsetRef) {
    const out = [];
    for (let i = 0; i < header.chunkCount; i++) {
      const c = {
        minX: 0,
        minY: 0,
        minZ: 0,
        maxX: 0,
        maxY: 0,
        maxZ: 0,
        minSX: 0,
        minSY: 0,
        minSZ: 0,
        maxSX: 0,
        maxSY: 0,
        maxSZ: 0,
        minR: 0,
        minG: 0,
        minB: 0,
        maxR: 1,
        maxG: 1,
        maxB: 1
      };
      for (const p of header.chunkProps) {
        if (p.type !== "float") {
          continue;
        }
        const v = dv.getFloat32(offsetRef.value + p.offset, true);
        switch (p.name) {
          case "min_x":
            c.minX = v;
            break;
          case "min_y":
            c.minY = v;
            break;
          case "min_z":
            c.minZ = v;
            break;
          case "max_x":
            c.maxX = v;
            break;
          case "max_y":
            c.maxY = v;
            break;
          case "max_z":
            c.maxZ = v;
            break;
          case "min_scale_x":
            c.minSX = v;
            break;
          case "min_scale_y":
            c.minSY = v;
            break;
          case "min_scale_z":
            c.minSZ = v;
            break;
          case "max_scale_x":
            c.maxSX = v;
            break;
          case "max_scale_y":
            c.maxSY = v;
            break;
          case "max_scale_z":
            c.maxSZ = v;
            break;
          case "min_r":
            c.minR = v;
            break;
          case "min_g":
            c.minG = v;
            break;
          case "min_b":
            c.minB = v;
            break;
          case "max_r":
            c.maxR = v;
            break;
          case "max_g":
            c.maxG = v;
            break;
          case "max_b":
            c.maxB = v;
            break;
        }
      }
      out.push(c);
      offsetRef.value += header.rowChunkLength;
    }
    return out;
  }
  function unpack111011(value, out) {
    out[0] = (value >>> 21 & 2047) / 2047;
    out[1] = (value >>> 11 & 1023) / 1023;
    out[2] = (value & 2047) / 2047;
  }
  function unpack8888(value, out) {
    out[0] = (value >>> 24 & 255) / 255;
    out[1] = (value >>> 16 & 255) / 255;
    out[2] = (value >>> 8 & 255) / 255;
    out[3] = (value & 255) / 255;
  }
  function unpackRot(value, out) {
    const norm = 1 / (SQRT2 * 0.5);
    const a = ((value >>> 20 & 1023) / 1023 - 0.5) * norm;
    const b = ((value >>> 10 & 1023) / 1023 - 0.5) * norm;
    const c = ((value & 1023) / 1023 - 0.5) * norm;
    const m = Math.sqrt(Math.max(0, 1 - (a * a + b * b + c * c)));
    switch (value >>> 30) {
      case 0:
        out[0] = a;
        out[1] = b;
        out[2] = c;
        out[3] = m;
        break;
      case 1:
        out[0] = m;
        out[1] = b;
        out[2] = c;
        out[3] = a;
        break;
      case 2:
        out[0] = b;
        out[1] = m;
        out[2] = c;
        out[3] = a;
        break;
      default:
        out[0] = b;
        out[1] = c;
        out[2] = m;
        out[3] = a;
        break;
    }
  }
  function convertCompressedPlyToParsedSplat(data) {
    const header = parseHeader(data);
    if (!header) {
      return { data };
    }
    const isCompressed = header.chunkCount > 0;
    const dv = new DV(data, header.dataStart);
    const out = new ArrayBuffer(ROW_OUTPUT_LENGTH * header.vertexCount);
    const tmpPos = [0, 0, 0];
    const tmpScl = [0, 0, 0];
    const tmpRgba = [0, 0, 0, 0];
    const tmpQuat = [0, 0, 0, 1];
    const offsetRef = { value: 0 };
    const chunks = isCompressed ? readChunks(header, dv, offsetRef) : null;
    const shFlat = header.shDegree && header.shCoefficientCount ? new U8(header.shCoefficientCount * header.vertexCount) : null;
    const shBlockBase = header.rowChunkLength * header.chunkCount + header.vertexCount * header.rowVertexLength;
    const shDim = header.shCoefficientCount / 3;
    for (let i = 0; i < header.vertexCount; i++) {
      const position = new F32(out, i * ROW_OUTPUT_LENGTH, 3);
      const scale = new F32(out, i * ROW_OUTPUT_LENGTH + 12, 3);
      const rgba = new U8C(out, i * ROW_OUTPUT_LENGTH + 24, 4);
      const rot = new U8C(out, i * ROW_OUTPUT_LENGTH + 28, 4);
      const chunk = chunks ? chunks[i >> 8] : null;
      let r0 = 255, r1 = 0, r2 = 0, r3 = 0;
      const plySH = shFlat ? new Array(header.shCoefficientCount) : null;
      for (const prop of header.vertexProps) {
        let value;
        switch (prop.type) {
          case "float":
            value = dv.getFloat32(offsetRef.value + prop.offset, true);
            break;
          case "int":
            value = dv.getInt32(offsetRef.value + prop.offset, true);
            break;
          case "uint":
            value = dv.getUint32(offsetRef.value + prop.offset, true);
            break;
          case "uchar":
            value = dv.getUint8(offsetRef.value + prop.offset);
            break;
          case "short":
            value = dv.getInt16(offsetRef.value + prop.offset, true);
            break;
          case "ushort":
            value = dv.getUint16(offsetRef.value + prop.offset, true);
            break;
          case "double":
            value = dv.getFloat64(offsetRef.value + prop.offset, true);
            break;
          default:
            continue;
        }
        switch (prop.name) {
          case "packed_position":
            unpack111011(value, tmpPos);
            position[0] = lerp(chunk.minX, chunk.maxX, tmpPos[0]);
            position[1] = lerp(chunk.minY, chunk.maxY, tmpPos[1]);
            position[2] = lerp(chunk.minZ, chunk.maxZ, tmpPos[2]);
            break;
          case "packed_rotation":
            unpackRot(value, tmpQuat);
            r0 = tmpQuat[3];
            r1 = tmpQuat[0];
            r2 = tmpQuat[1];
            r3 = tmpQuat[2];
            break;
          case "packed_scale":
            unpack111011(value, tmpScl);
            scale[0] = Math.exp(lerp(chunk.minSX, chunk.maxSX, tmpScl[0]));
            scale[1] = Math.exp(lerp(chunk.minSY, chunk.maxSY, tmpScl[1]));
            scale[2] = Math.exp(lerp(chunk.minSZ, chunk.maxSZ, tmpScl[2]));
            break;
          case "packed_color":
            unpack8888(value, tmpRgba);
            rgba[0] = lerp(chunk.minR, chunk.maxR, tmpRgba[0]) * 255;
            rgba[1] = lerp(chunk.minG, chunk.maxG, tmpRgba[1]) * 255;
            rgba[2] = lerp(chunk.minB, chunk.maxB, tmpRgba[2]) * 255;
            rgba[3] = tmpRgba[3] * 255;
            break;
          case "x":
            position[0] = value;
            break;
          case "y":
            position[1] = value;
            break;
          case "z":
            position[2] = value;
            break;
          case "scale_0":
            scale[0] = Math.exp(value);
            break;
          case "scale_1":
            scale[1] = Math.exp(value);
            break;
          case "scale_2":
            scale[2] = Math.exp(value);
            break;
          case "red":
          case "diffuse_red":
            rgba[0] = value;
            break;
          case "green":
          case "diffuse_green":
            rgba[1] = value;
            break;
          case "blue":
          case "diffuse_blue":
            rgba[2] = value;
            break;
          case "f_dc_0":
            rgba[0] = (0.5 + SH_C02 * value) * 255;
            break;
          case "f_dc_1":
            rgba[1] = (0.5 + SH_C02 * value) * 255;
            break;
          case "f_dc_2":
            rgba[2] = (0.5 + SH_C02 * value) * 255;
            break;
          case "f_dc_3":
            rgba[3] = (0.5 + SH_C02 * value) * 255;
            break;
          case "opacity":
            rgba[3] = 1 / (1 + Math.exp(-value)) * 255;
            break;
          case "rot_0":
            r0 = value;
            break;
          case "rot_1":
            r1 = value;
            break;
          case "rot_2":
            r2 = value;
            break;
          case "rot_3":
            r3 = value;
            break;
          default:
            if (plySH && prop.name.startsWith("f_rest_")) {
              const shIdx = parseInt(prop.name.slice(7), 10);
              plySH[shIdx] = clamp255(value * 127.5 + 127.5);
            }
            break;
        }
      }
      if (plySH && header.shProps.length > 0) {
        for (let k = 0; k < header.shCoefficientCount; k++) {
          const b = dv.getUint8(shBlockBase + i * header.shCoefficientCount + k);
          plySH[k] = clamp255((b * (8 / 255) - 4) * 127.5 + 127.5);
        }
      }
      if (plySH && shFlat) {
        for (let j = 0; j < shDim; j++) {
          shFlat[i * header.shCoefficientCount + j * 3 + 0] = plySH[j];
          shFlat[i * header.shCoefficientCount + j * 3 + 1] = plySH[j + shDim];
          shFlat[i * header.shCoefficientCount + j * 3 + 2] = plySH[j + shDim * 2];
        }
      }
      const len = Math.hypot(r0, r1, r2, r3) || 1;
      const inv = 1 / len;
      rot[0] = r0 * inv * 127.5 + 127.5;
      rot[1] = r1 * inv * 127.5 + 127.5;
      rot[2] = r2 * inv * 127.5 + 127.5;
      rot[3] = r3 * inv * 127.5 + 127.5;
      offsetRef.value += header.rowVertexLength;
    }
    if (shFlat && header.shDegree) {
      return { data: out, sh: shFlat, shDegree: header.shDegree };
    }
    return { data: out };
  }
  var SH_C02, SQRT2, ROW_OUTPUT_LENGTH, TYPE_SIZE, lerp, clamp255;
  var init_splat_ply_compressed = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-splat/splat-ply-compressed.ts"() {
      "use strict";
      init_typed_arrays();
      SH_C02 = 0.28209479177387814;
      SQRT2 = Math.SQRT2;
      ROW_OUTPUT_LENGTH = 32;
      TYPE_SIZE = { double: 8, int: 4, uint: 4, float: 4, short: 2, ushort: 2, uchar: 1 };
      lerp = (a, b, t) => a + (b - a) * t;
      clamp255 = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_engine();

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/scene.ts
  init_scene_core();

  // ../../../Babylon-Lite/packages/babylon-lite/src/camera/arc-rotate.ts
  init_mat4_look_at_lh();
  init_vec3_up();
  init_world_matrix_state();
  init_observable_vec3();
  init_matrix_allocator();
  function createArcRotateCamera(alpha, beta, radius, target) {
    function localEyePosition() {
      const cosA = Math.cos(cam.alpha), sinA = Math.sin(cam.alpha);
      const cosB = Math.cos(cam.beta);
      let sinB = Math.sin(cam.beta);
      if (sinB === 0) {
        sinB = 1e-4;
      }
      return {
        x: cam.target.x + cam.radius * cosA * sinB,
        y: cam.target.y + cam.radius * cosB,
        z: cam.target.z + cam.radius * sinA * sinB
      };
    }
    const _localMat = allocateMat4();
    function cameraLocalWorldMatrix() {
      const eye = localEyePosition();
      const v = mat4LookAtLH(eye, cam.target, Vec3Up);
      const m = _localMat;
      m[0] = v[0];
      m[1] = v[4];
      m[2] = v[8];
      m[3] = 0;
      m[4] = v[1];
      m[5] = v[5];
      m[6] = v[9];
      m[7] = 0;
      m[8] = v[2];
      m[9] = v[6];
      m[10] = v[10];
      m[11] = 0;
      m[12] = eye.x;
      m[13] = eye.y;
      m[14] = eye.z;
      m[15] = 1;
      return _localMat;
    }
    const wm = createWorldMatrixState(cameraLocalWorldMatrix);
    const onDirty = () => wm.markLocalDirty();
    const scalars = { alpha, beta, radius };
    const cam = {
      alpha: 0,
      // placeholder — overridden by defineProperty below
      beta: 0,
      radius: 0,
      target: new ObservableVec3(target.x, target.y, target.z, onDirty),
      fov: 0.8,
      nearPlane: 0.1,
      farPlane: 1e3,
      children: [],
      inertia: 0.9,
      panningInertia: 0.9,
      inertialAlphaOffset: 0,
      inertialBetaOffset: 0,
      inertialRadiusOffset: 0,
      inertialPanningX: 0,
      inertialPanningY: 0,
      // Matrix caches use the process-global allocator — F32 by default,
      // F64 after an HPM engine is created. Same backing as the camera world
      // matrix above, so the camera's storage precision is uniform.
      _viewCache: allocateMat4(),
      _projCache: allocateMat4(),
      _vpCache: allocateMat4(),
      get parent() {
        return wm.parent;
      },
      set parent(v) {
        wm.parent = v;
      },
      get worldMatrix() {
        return wm.getWorldMatrix();
      },
      get worldMatrixVersion() {
        return wm.getWorldMatrixVersion();
      }
    };
    for (const key of ["alpha", "beta", "radius"]) {
      Object.defineProperty(cam, key, {
        get: () => scalars[key],
        set: (v) => {
          if (scalars[key] !== v) {
            scalars[key] = v;
            onDirty();
            cam._clampToLimits?.();
          }
        },
        configurable: true,
        enumerable: true
      });
    }
    attachWorldMatrixState(cam, wm);
    return cam;
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/camera/arc-rotate-controls.ts
  function attachControl(camera, canvas, scene, options) {
    const angularSensibility = 1e3;
    const panningSensibility = 50;
    const wheelPrecision = 3;
    const ROTATION_EPSILON = 1e-3;
    const RADIUS_EPSILON = 1e-3;
    const PANNING_EPSILON = 1e-4;
    let isDragging = false;
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;
    const activeTouches = /* @__PURE__ */ new Map();
    let pinchStartDist = 0;
    let pinchStartRadius = 0;
    function onPointerDown(e) {
      if (options?.shouldHandlePointerDown && !options.shouldHandlePointerDown(e)) {
        return;
      }
      canvas.setPointerCapture(e.pointerId);
      lastX = e.clientX;
      lastY = e.clientY;
      if (e.button === 0) {
        isDragging = true;
        isPanning = false;
      } else if (e.button === 2) {
        isDragging = false;
        isPanning = true;
      }
    }
    function onPointerMove(e) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (activeTouches.size >= 2) {
        return;
      }
      if (!isDragging && !isPanning) {
        return;
      }
      if (options?.isExternalDragActive?.()) {
        isDragging = false;
        isPanning = false;
        camera.inertialAlphaOffset = 0;
        camera.inertialBetaOffset = 0;
        camera.inertialPanningX = 0;
        camera.inertialPanningY = 0;
        return;
      }
      if (options?.isExternalPickPending?.()) {
        return;
      }
      if (isDragging) {
        camera.inertialAlphaOffset -= dx / angularSensibility;
        camera.inertialBetaOffset -= dy / angularSensibility;
      }
      if (isPanning) {
        camera.inertialPanningX += -dx / panningSensibility;
        camera.inertialPanningY += dy / panningSensibility;
      }
    }
    function onPointerUp(e) {
      canvas.releasePointerCapture(e.pointerId);
      isDragging = false;
      isPanning = false;
    }
    function onWheel(e) {
      e.preventDefault();
      camera.inertialRadiusOffset -= e.deltaY * camera.radius / (wheelPrecision * 1e3);
    }
    function onContextMenu(e) {
      e.preventDefault();
    }
    function onTouchStart(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
      if (activeTouches.size >= 2) {
        isDragging = false;
        isPanning = false;
        const iter = activeTouches.values();
        const p0 = iter.next().value;
        const p1 = iter.next().value;
        pinchStartDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        pinchStartRadius = camera.radius;
        e.preventDefault();
      }
    }
    function onTouchMove(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
      if (activeTouches.size >= 2) {
        e.preventDefault();
        const iter = activeTouches.values();
        const p0 = iter.next().value;
        const p1 = iter.next().value;
        const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        if (pinchStartDist > 0 && dist > 0) {
          camera.radius = pinchStartRadius * (pinchStartDist / dist);
          camera.radius = Math.max(0.01, camera.radius);
        }
      }
    }
    function onTouchEnd(e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        activeTouches.delete(e.changedTouches[i].identifier);
      }
      if (activeTouches.size === 1) {
        const p = activeTouches.values().next().value;
        lastX = p.x;
        lastY = p.y;
      }
      if (activeTouches.size < 2) {
        pinchStartDist = 0;
      }
    }
    function onGesture(e) {
      e.preventDefault();
    }
    function applyInertia() {
      if (camera.inertialAlphaOffset !== 0 || camera.inertialBetaOffset !== 0) {
        camera.alpha += camera.inertialAlphaOffset;
        camera.beta += camera.inertialBetaOffset;
        const eps = 0.01;
        camera.beta = Math.max(eps, Math.min(Math.PI - eps, camera.beta));
        camera.inertialAlphaOffset *= camera.inertia;
        camera.inertialBetaOffset *= camera.inertia;
        if (Math.abs(camera.inertialAlphaOffset) < ROTATION_EPSILON) {
          camera.inertialAlphaOffset = 0;
        }
        if (Math.abs(camera.inertialBetaOffset) < ROTATION_EPSILON) {
          camera.inertialBetaOffset = 0;
        }
      }
      if (camera.inertialRadiusOffset !== 0) {
        camera.radius -= camera.inertialRadiusOffset;
        camera.radius = Math.max(0.01, camera.radius);
        camera.inertialRadiusOffset *= camera.inertia;
        if (Math.abs(camera.inertialRadiusOffset) < RADIUS_EPSILON) {
          camera.inertialRadiusOffset = 0;
        }
      }
      if (camera.inertialPanningX !== 0 || camera.inertialPanningY !== 0) {
        const cosA = Math.cos(camera.alpha);
        const sinA = Math.sin(camera.alpha);
        const rightX = -sinA;
        const rightZ = cosA;
        const panScale = camera.radius * 1e-3;
        camera.target.x += rightX * camera.inertialPanningX * panScale;
        camera.target.y += camera.inertialPanningY * panScale;
        camera.target.z += rightZ * camera.inertialPanningX * panScale;
        camera.inertialPanningX *= camera.panningInertia;
        camera.inertialPanningY *= camera.panningInertia;
        if (Math.abs(camera.inertialPanningX) < PANNING_EPSILON) {
          camera.inertialPanningX = 0;
        }
        if (Math.abs(camera.inertialPanningY) < PANNING_EPSILON) {
          camera.inertialPanningY = 0;
        }
      }
    }
    if (scene) {
      scene._beforeRender.push(applyInertia);
    }
    const listeners = [
      ["pointerdown", onPointerDown],
      ["pointermove", onPointerMove],
      ["pointerup", onPointerUp],
      ["wheel", onWheel, { passive: false }],
      ["contextmenu", onContextMenu],
      ["touchstart", onTouchStart, { passive: false }],
      ["touchmove", onTouchMove, { passive: false }],
      ["touchend", onTouchEnd],
      ["gesturestart", onGesture, { passive: false }],
      ["gesturechange", onGesture, { passive: false }],
      ["gestureend", onGesture, { passive: false }]
    ];
    for (const [ev, h, opts] of listeners) {
      canvas.addEventListener(ev, h, opts);
    }
    return () => {
      if (scene) {
        const idx = scene._beforeRender.indexOf(applyInertia);
        if (idx >= 0) {
          scene._beforeRender.splice(idx, 1);
        }
      }
      for (const [ev, h] of listeners) {
        canvas.removeEventListener(ev, h);
      }
    };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/mesh-factories.ts
  init_mesh();
  init_compute_aabb();

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/create-sphere.ts
  init_typed_arrays();
  function createSphereData(options = {}) {
    const segments = Math.max(3, options.segments ?? 32);
    const baseDiameter = options.diameter ?? 1;
    const rx = (options.diameterX ?? baseDiameter) / 2;
    const ry = (options.diameterY ?? baseDiameter) / 2;
    const rz = (options.diameterZ ?? baseDiameter) / 2;
    const totalZRotationSteps = 2 + segments;
    const totalYRotationSteps = 2 * totalZRotationSteps;
    const totalVertices = (totalZRotationSteps + 1) * (totalYRotationSteps + 1);
    const totalIndices = totalZRotationSteps * totalYRotationSteps * 6;
    const positions = new F32(totalVertices * 3);
    const normals = new F32(totalVertices * 3);
    const uvs = new F32(totalVertices * 2);
    const indices = new U32(totalIndices);
    let vIdx = 0;
    for (let zStep = 0; zStep <= totalZRotationSteps; zStep++) {
      const normalizedZ = zStep / totalZRotationSteps;
      const angleZ = normalizedZ * Math.PI;
      for (let yStep = 0; yStep <= totalYRotationSteps; yStep++) {
        const normalizedY = yStep / totalYRotationSteps;
        const angleY = normalizedY * Math.PI * 2;
        const nx = Math.sin(angleZ) * Math.cos(angleY);
        const ny = Math.cos(angleZ);
        const nz = -Math.sin(angleZ) * Math.sin(angleY);
        positions[vIdx * 3] = rx * nx;
        positions[vIdx * 3 + 1] = ry * ny;
        positions[vIdx * 3 + 2] = rz * nz;
        normals[vIdx * 3] = nx;
        normals[vIdx * 3 + 1] = ny;
        normals[vIdx * 3 + 2] = nz;
        uvs[vIdx * 2] = normalizedY;
        uvs[vIdx * 2 + 1] = normalizedZ;
        vIdx++;
      }
    }
    let iIdx = 0;
    for (let zStep = 0; zStep < totalZRotationSteps; zStep++) {
      for (let yStep = 0; yStep < totalYRotationSteps; yStep++) {
        const a = zStep * (totalYRotationSteps + 1) + yStep;
        const b = a + totalYRotationSteps + 1;
        indices[iIdx++] = a;
        indices[iIdx++] = a + 1;
        indices[iIdx++] = b;
        indices[iIdx++] = b;
        indices[iIdx++] = a + 1;
        indices[iIdx++] = b + 1;
      }
    }
    return {
      positions,
      normals,
      uvs,
      indices,
      vertexCount: totalVertices,
      indexCount: totalIndices
    };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/create-box.ts
  init_typed_arrays();
  var BOX_POSITIONS = new F32([
    // +Z face
    0.5,
    -0.5,
    0.5,
    -0.5,
    -0.5,
    0.5,
    -0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    // -Z face
    0.5,
    0.5,
    -0.5,
    -0.5,
    0.5,
    -0.5,
    -0.5,
    -0.5,
    -0.5,
    0.5,
    -0.5,
    -0.5,
    // +X face
    0.5,
    0.5,
    -0.5,
    0.5,
    -0.5,
    -0.5,
    0.5,
    -0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    // -X face
    -0.5,
    0.5,
    0.5,
    -0.5,
    -0.5,
    0.5,
    -0.5,
    -0.5,
    -0.5,
    -0.5,
    0.5,
    -0.5,
    // +Y face
    -0.5,
    0.5,
    0.5,
    -0.5,
    0.5,
    -0.5,
    0.5,
    0.5,
    -0.5,
    0.5,
    0.5,
    0.5,
    // -Y face
    0.5,
    -0.5,
    0.5,
    0.5,
    -0.5,
    -0.5,
    -0.5,
    -0.5,
    -0.5,
    -0.5,
    -0.5,
    0.5
  ]);
  var BOX_NORMALS = new F32([
    // +Z
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    // -Z
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    // +X
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    // -X
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    // +Y
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    // -Y
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0,
    0,
    -1,
    0
  ]);
  var BOX_UVS = new F32([
    // Each face: (1,1), (0,1), (0,0), (1,0) — matching BJS box UV layout
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    // +Z
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    // -Z
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    // +X
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    // -X
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    // +Y
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0
    // -Y
  ]);
  var BOX_INDICES = new U32([
    0,
    1,
    2,
    0,
    2,
    3,
    4,
    5,
    6,
    4,
    6,
    7,
    8,
    9,
    10,
    8,
    10,
    11,
    12,
    13,
    14,
    12,
    14,
    15,
    16,
    17,
    18,
    16,
    18,
    19,
    20,
    21,
    22,
    20,
    22,
    23
  ]);
  function createBoxData(size = 1) {
    if (size === 1) {
      return {
        positions: BOX_POSITIONS,
        normals: BOX_NORMALS,
        uvs: BOX_UVS,
        indices: BOX_INDICES,
        vertexCount: 24,
        indexCount: 36
      };
    }
    const positions = new F32(BOX_POSITIONS.length);
    for (let i = 0; i < positions.length; i++) {
      positions[i] = BOX_POSITIONS[i] * size;
    }
    return {
      positions,
      normals: BOX_NORMALS,
      uvs: BOX_UVS,
      indices: BOX_INDICES,
      vertexCount: 24,
      indexCount: 36
    };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/create-ground.ts
  init_typed_arrays();
  function createFlatGroundData(opts = {}) {
    const width = opts.width ?? 1;
    const height = opts.height ?? 1;
    const subdivisions = opts.subdivisions ?? 1;
    const cols = subdivisions + 1;
    const rows = cols;
    const vertexCount = cols * rows;
    const indexCount = subdivisions * subdivisions * 6;
    const positions = new F32(vertexCount * 3);
    const normals = new F32(vertexCount * 3);
    const uvs = new F32(vertexCount * 2);
    const indices = new U32(indexCount);
    let vi = 0;
    let ui = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = -width / 2 + col / subdivisions * width;
        const z = -height / 2 + (1 - row / subdivisions) * height;
        positions[vi] = x;
        positions[vi + 1] = 0;
        positions[vi + 2] = z;
        normals[vi] = 0;
        normals[vi + 1] = 1;
        normals[vi + 2] = 0;
        vi += 3;
        uvs[ui] = col / subdivisions;
        uvs[ui + 1] = 1 - row / subdivisions;
        ui += 2;
      }
    }
    const uScale = opts.uvScale?.[0] ?? 1;
    const vScale = opts.uvScale?.[1] ?? 1;
    if (uScale !== 1 || vScale !== 1) {
      for (let i = 0; i < uvs.length; i += 2) {
        uvs[i] = uvs[i] * uScale;
        uvs[i + 1] = uvs[i + 1] * vScale;
      }
    }
    let ii = 0;
    for (let row = 0; row < subdivisions; row++) {
      for (let col = 0; col < subdivisions; col++) {
        const topLeft = row * cols + col;
        const topRight = topLeft + 1;
        const bottomLeft = (row + 1) * cols + col;
        const bottomRight = bottomLeft + 1;
        indices[ii++] = bottomRight;
        indices[ii++] = topRight;
        indices[ii++] = topLeft;
        indices[ii++] = bottomLeft;
        indices[ii++] = bottomRight;
        indices[ii++] = topLeft;
      }
    }
    return { positions, normals, uvs, indices };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/mesh-factories.ts
  function createMeshFromData(engine, name, positions, normals, indices, uvs, uvs2, tangents, colors) {
    const [min, max] = computeAabb(positions);
    const mesh = {
      name,
      material: null,
      receiveShadows: false,
      boundMin: isFinite(min[0]) ? min : void 0,
      boundMax: isFinite(max[0]) ? max : void 0,
      _gpu: uploadMeshToGPU(engine, positions, normals, indices, uvs, uvs2, tangents, colors)
    };
    initMeshTransform(mesh);
    mesh._cpuPositions = positions;
    mesh._cpuNormals = normals;
    mesh._cpuUvs = uvs;
    mesh._cpuIndices = indices;
    engine._dlr?.m(mesh, uvs2 ?? null, tangents ?? null, colors ?? null, indices, "uint32");
    return mesh;
  }
  function createSphere(engine, options) {
    const data = createSphereData(options);
    return createMeshFromData(engine, "sphere", data.positions, data.normals, data.indices, data.uvs);
  }
  function createBox(engine, size = 1) {
    const data = createBoxData(size);
    return createMeshFromData(engine, "box", data.positions, data.normals, data.indices, data.uvs);
  }
  function createGround(engine, options) {
    const data = createFlatGroundData(options);
    return createMeshFromData(engine, "ground", data.positions, data.normals, data.indices, data.uvs);
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-splat/splat-ply-parser.ts
  init_typed_arrays();
  var SH_C0 = 0.28209479177387814;
  function isPly(data) {
    const ubuf = new U8(data, 0, Math.min(data.byteLength, 1024 * 10));
    const header = new TextDecoder().decode(ubuf);
    return header.startsWith("ply") && header.indexOf("end_header\n") >= 0;
  }
  function isPlyCompressedOrSH(data) {
    const ubuf = new U8(data, 0, Math.min(data.byteLength, 1024 * 10));
    const header = new TextDecoder().decode(ubuf);
    const end = header.indexOf("end_header\n");
    if (end < 0) {
      return false;
    }
    const slice = header.slice(0, end);
    return slice.indexOf("element chunk ") >= 0 || slice.indexOf("element sh ") >= 0 || slice.indexOf("f_rest_") >= 0;
  }
  function convertPlyToSplat(data) {
    const ubuf = new U8(data);
    const header = new TextDecoder().decode(ubuf.slice(0, 1024 * 10));
    const headerEnd = "end_header\n";
    const headerEndIndex = header.indexOf(headerEnd);
    if (headerEndIndex < 0) {
      return { data };
    }
    const vmatch = /element vertex (\d+)\n/.exec(header);
    if (!vmatch) {
      return { data };
    }
    const vertexCount = parseInt(vmatch[1], 10);
    const offsets = { double: 8, int: 4, uint: 4, float: 4, short: 2, ushort: 2, uchar: 1 };
    const properties = [];
    let rowOffset = 0;
    for (const line of header.slice(0, headerEndIndex).split("\n")) {
      if (!line.startsWith("property ")) {
        continue;
      }
      const [, type, name] = line.split(" ");
      if (!type || !name || offsets[type] === void 0) {
        return { data: new ArrayBuffer(0) };
      }
      properties.push({ name, type, offset: rowOffset });
      rowOffset += offsets[type];
    }
    const dv = new DV(data, headerEndIndex + headerEnd.length);
    const ROW_OUTPUT_LENGTH2 = 32;
    const out = new ArrayBuffer(ROW_OUTPUT_LENGTH2 * vertexCount);
    let off = 0;
    for (let i = 0; i < vertexCount; i++) {
      const position = new F32(out, i * ROW_OUTPUT_LENGTH2, 3);
      const scale = new F32(out, i * ROW_OUTPUT_LENGTH2 + 12, 3);
      const rgba = new U8C(out, i * ROW_OUTPUT_LENGTH2 + 24, 4);
      const rot = new U8C(out, i * ROW_OUTPUT_LENGTH2 + 28, 4);
      let r0 = 255, r1 = 0, r2 = 0, r3 = 0;
      for (const prop of properties) {
        let value;
        switch (prop.type) {
          case "float":
            value = dv.getFloat32(off + prop.offset, true);
            break;
          case "int":
            value = dv.getInt32(off + prop.offset, true);
            break;
          case "uint":
            value = dv.getUint32(off + prop.offset, true);
            break;
          case "uchar":
            value = dv.getUint8(off + prop.offset);
            break;
          case "short":
            value = dv.getInt16(off + prop.offset, true);
            break;
          case "ushort":
            value = dv.getUint16(off + prop.offset, true);
            break;
          case "double":
            value = dv.getFloat64(off + prop.offset, true);
            break;
          default:
            continue;
        }
        switch (prop.name) {
          case "x":
            position[0] = value;
            break;
          case "y":
            position[1] = value;
            break;
          case "z":
            position[2] = value;
            break;
          case "scale_0":
            scale[0] = Math.exp(value);
            break;
          case "scale_1":
            scale[1] = Math.exp(value);
            break;
          case "scale_2":
            scale[2] = Math.exp(value);
            break;
          case "red":
          case "diffuse_red":
            rgba[0] = value;
            break;
          case "green":
          case "diffuse_green":
            rgba[1] = value;
            break;
          case "blue":
          case "diffuse_blue":
            rgba[2] = value;
            break;
          case "f_dc_0":
            rgba[0] = (0.5 + SH_C0 * value) * 255;
            break;
          case "f_dc_1":
            rgba[1] = (0.5 + SH_C0 * value) * 255;
            break;
          case "f_dc_2":
            rgba[2] = (0.5 + SH_C0 * value) * 255;
            break;
          case "f_dc_3":
            rgba[3] = (0.5 + SH_C0 * value) * 255;
            break;
          case "opacity":
            rgba[3] = 1 / (1 + Math.exp(-value)) * 255;
            break;
          case "rot_0":
            r0 = value;
            break;
          case "rot_1":
            r1 = value;
            break;
          case "rot_2":
            r2 = value;
            break;
          case "rot_3":
            r3 = value;
            break;
        }
      }
      const len = Math.hypot(r0, r1, r2, r3) || 1;
      const inv = 1 / len;
      rot[0] = r0 * inv * 127.5 + 127.5;
      rot[1] = r1 * inv * 127.5 + 127.5;
      rot[2] = r2 * inv * 127.5 + 127.5;
      rot[3] = r3 * inv * 127.5 + 127.5;
      off += rowOffset;
    }
    return { data: out };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-splat/load-splat.ts
  init_splat_data();
  init_gaussian_splatting_mesh();
  init_gaussian_splatting_pipeline();

  // vite-worker:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\src\loader-splat\splat-sort-worker.ts
  var StubWorker = class {
    constructor() {
    }
    postMessage() {
    }
    terminate() {
    }
    addEventListener() {
    }
    removeEventListener() {
    }
    set onmessage(_) {
    }
    set onerror(_) {
    }
  };

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-splat/load-splat.ts
  async function attachParsedSplat(scene, name, parsed, fragments) {
    const geom = buildSplatGeometry(parsed.data);
    const worker = new StubWorker({ name: "babylon-lite-splat-sort" });
    const eng = scene.surface.engine;
    const mesh = createGaussianSplattingMesh(eng, name, geom, worker, parsed);
    if (parsed.sh && parsed.shDegree && parsed.shDegree > 0) {
      const { attachGaussianSplattingMeshSH: attachGaussianSplattingMeshSH2 } = await Promise.resolve().then(() => (init_gaussian_splatting_pipeline_sh(), gaussian_splatting_pipeline_sh_exports));
      attachGaussianSplattingMeshSH2(scene, mesh, parsed.sh, fragments);
    } else {
      attachGaussianSplattingMesh(scene, mesh, fragments);
    }
    return mesh;
  }
  async function loadSplat(scene, url, fragments) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`loadSplat: HTTP ${response.status} for ${url}`);
    }
    const data = await response.arrayBuffer();
    let parsed;
    if (isPly(data)) {
      if (isPlyCompressedOrSH(data)) {
        const { convertCompressedPlyToParsedSplat: convertCompressedPlyToParsedSplat2 } = await Promise.resolve().then(() => (init_splat_ply_compressed(), splat_ply_compressed_exports));
        parsed = convertCompressedPlyToParsedSplat2(data);
      } else {
        parsed = convertPlyToSplat(data);
      }
      if (parsed.data.byteLength === 0) {
        throw new Error(`loadSplat: failed to parse PLY at ${url} (unsupported property layout)`);
      }
    } else {
      parsed = { data };
    }
    const name = url.substring(url.lastIndexOf("/") + 1) || "splat";
    return await attachParsedSplat(scene, name, parsed, fragments);
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gs-depth-fragments.ts
  var GS_LINEAR_DEPTH_HELPERS = (
    /* wgsl */
    `
fn gsLinearDepth(ndcZ: f32) -> f32 {
    // Lite uses a reverse-Z left-handed perspective matrix:
    //   projection[2][2] = -near / (far-near)
    //   projection[3][2] =  far*near / (far-near)
    // For a point at camera-space depth viewZ (positive in front in LH):
    //   pos2d.z = projection[2][2] * viewZ + projection[3][2]
    //   pos2d.w = viewZ
    // After perspective divide (what we get as in.pos.z):
    //   ndcZ = pos2d.z / pos2d.w = projection[2][2] + projection[3][2] / viewZ
    // So we can recover viewZ and the camera near/far purely from the projection:
    let p22 = u.projection[2][2];
    let p32 = u.projection[3][2];
    let viewZ = p32 / (ndcZ - p22);
    let near = p32 / (1.0 - p22);
    let far  = -p32 / p22;
    return clamp((viewZ - near) / (far - near), 0.0, 1.0);
}
`
  );
  var gsLinearDepthFragment = {
    id: "gsLinearDepth",
    helperFunctions: GS_LINEAR_DEPTH_HELPERS,
    fragmentSlots: {
      GS_FRAGMENT_BEFORE_FRAGCOLOR: (
        /* wgsl */
        `
            if (dot(in.vPos, in.vPos) > in.vColor.a) { discard; }
            let _gsDepth = gsLinearDepth(in.pos.z);
            finalColor = vec4<f32>(_gsDepth, _gsDepth, _gsDepth, 1.0);
        `
      )
    }
  };

  // ../../../Babylon-Lite/packages/babylon-lite/src/render/linear-depth-material.ts
  init_shader_material();
  var VERTEX = (
    /* wgsl */
    `
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) viewZ: f32,
};
@vertex
fn mainVertex(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let worldPos = shaderSystem.world * vec4<f32>(input.position, 1.0);
    let viewPos  = shaderSystem.view * worldPos;
    out.position = shaderSystem.projection * viewPos;
    // LH view space: positive z is in front of the camera.
    out.viewZ = viewPos.z;
    return out;
}
`
  );
  var FRAGMENT = (
    /* wgsl */
    `
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) viewZ: f32,
};
@fragment
fn mainFragment(input: VertexOutput) -> @location(0) vec4<f32> {
    let near = shaderUniforms.nearFar.x;
    let far  = shaderUniforms.nearFar.y;
    let d = clamp((input.viewZ - near) / (far - near), 0.0, 1.0);
    return vec4<f32>(d, d, d, 1.0);
}
`
  );
  function createLinearDepthMaterial(options = {}) {
    const near = options.near ?? 0.03;
    const far = options.far ?? 15;
    return createShaderMaterial({
      name: options.name ?? "linearDepth",
      vertexSource: VERTEX,
      fragmentSource: FRAGMENT,
      attributes: ["position"],
      uniforms: ["world", "view", "projection", { name: "nearFar", type: "vec2<f32>", defaultValue: [near, far] }],
      backFaceCulling: true,
      depthWrite: true,
      depthCompare: "greater-equal"
    });
  }

  // ../../../Babylon-Lite/lab/lite/src/lite/scene127.ts
  var SPLAT_URL = "https://raw.githubusercontent.com/CedricGuillemet/dump/master/Halo_Believe.splat";
  var NEAR = 0.03;
  var FAR = 15;
  async function main() {
    const __initStart = performance.now();
    const canvas = document.getElementById("renderCanvas");
    const engine = await createEngine(canvas);
    const scene = createSceneContext(engine);
    scene.clearColor = { r: 1, g: 1, b: 1, a: 1 };
    const camera = createArcRotateCamera(-Math.PI / 2, Math.PI / 2.5, 10, { x: 0, y: 1, z: 0 });
    camera.nearPlane = NEAR;
    camera.farPlane = FAR;
    scene.camera = camera;
    attachControl(camera, canvas, scene);
    const depthMaterial = createLinearDepthMaterial({ near: NEAR, far: FAR });
    const box = createBox(engine, 2);
    box.position.x = -2;
    box.material = depthMaterial;
    addToScene(scene, box);
    const sphere = createSphere(engine, { diameter: 2 });
    sphere.position.x = 2;
    sphere.material = depthMaterial;
    addToScene(scene, sphere);
    const ground = createGround(engine, { width: 6, height: 6 });
    ground.position.y = -1;
    ground.material = depthMaterial;
    addToScene(scene, ground);
    const splat = await loadSplat(scene, SPLAT_URL, [gsLinearDepthFragment]);
    splat.position.y = 3;
    splat.position.z = 0;
    await registerScene(scene);
    await startEngine(engine);
    await splat.firstSortReady;
    await new Promise((r) => requestAnimationFrame(() => r()));
    canvas.dataset.drawCalls = String(engine.drawCallCount);
    canvas.dataset.initMs = String(performance.now() - __initStart);
    canvas.dataset.ready = "true";
  }
  main().catch((err) => {
    console.error(err);
  });
})();
