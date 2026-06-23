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
  var F32, F64, U32, I32, U16, I16, U8, I8, U8C, DV;
  var init_typed_arrays = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/typed-arrays.ts"() {
      "use strict";
      F32 = Float32Array;
      F64 = Float64Array;
      U32 = Uint32Array;
      I32 = Int32Array;
      U16 = Uint16Array;
      I16 = Int16Array;
      U8 = Uint8Array;
      I8 = Int8Array;
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
  var REVERSE_DEPTH_COMPARE;
  var init_render_target = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/render-target.ts"() {
      "use strict";
      init_gpu_flags();
      REVERSE_DEPTH_COMPARE = "greater-equal";
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
  function setMaxLights(n) {
    if (!Number.isFinite(n) || n < 1) {
      throw new Error(`setMaxLights: expected positive integer, got ${n}`);
    }
    MAX_LIGHTS = n | 0;
  }
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
  function bumpVisibilityEpoch() {
    _vis = _vis + 1 | 0;
  }
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
  function stopEngine(engine) {
    if (engine._animFrameId) {
      cancelAnimationFrame(engine._animFrameId);
    }
    engine._animFrameId = 0;
    engine._renderFn = null;
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
      set(v2) {
        if (v2 !== _mat) {
          _mat = v2;
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
    const v2 = camera._viewCache;
    const w = camera.worldMatrix;
    const useFO = camera._useFloatingOrigin;
    const cx = useFO ? 0 : w[12];
    const cy = useFO ? 0 : w[13];
    const cz = useFO ? 0 : w[14];
    v2[0] = w[0];
    v2[1] = w[4];
    v2[2] = w[8];
    v2[3] = 0;
    v2[4] = w[1];
    v2[5] = w[5];
    v2[6] = w[9];
    v2[7] = 0;
    v2[8] = w[2];
    v2[9] = w[6];
    v2[10] = w[10];
    v2[11] = 0;
    v2[12] = -(w[0] * cx + w[1] * cy + w[2] * cz);
    v2[13] = -(w[4] * cx + w[5] * cy + w[6] * cz);
    v2[14] = -(w[8] * cx + w[9] * cy + w[10] * cz);
    v2[15] = 1;
    camera._viewVer = ver;
    return v2;
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
  function clearSceneBGLCache() {
    _cachedSceneBGL = null;
    _cachedDevice = null;
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
  function meshLightIndexVec4Count() {
    return Math.ceil(MAX_LIGHTS / 4);
  }
  function getLightsUboSize() {
    return 16 + MAX_LIGHTS * LIGHT_ENTRY_FLOATS * 4;
  }
  function computeLightsVersion(lights) {
    let v2 = 0;
    for (const light of lights) {
      v2 += light._lightVersion ?? 0;
    }
    return v2;
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
  function appendMeshLightUboFields(fields) {
    fields.push({ _name: "lc", _type: "u32" });
    fields.push({ _name: "li", _type: `array<vec4<u32>, ${meshLightIndexVec4Count()}>` });
  }
  function meshLightIndexWGSL(meshVar, functionName = "mli") {
    return `fn ${functionName}(i: u32) -> u32 { return ${meshVar}.li[i / 4u][i % 4u]; }`;
  }
  function affectsMesh(light, mesh) {
    const meshId = mesh.id;
    const included = light.includedOnlyMeshIds;
    if (included?.size) {
      return !!meshId && included.has(meshId);
    }
    return !meshId || !light.excludedMeshIds?.has(meshId);
  }
  function writeMeshLightSelection(mesh, lights, data) {
    const u32 = data ? new U32(data.buffer, data.byteOffset, data.byteLength / 4) : null;
    let count = 0;
    let single = -1;
    let pi = 0;
    for (const light of lights) {
      if (pi >= MAX_LIGHTS) {
        break;
      }
      if (!light._writeLightUbo) {
        continue;
      }
      if (affectsMesh(light, mesh)) {
        single = pi;
        if (u32) {
          u32[MSH_LIGHT_INDEX_WORD_OFFSET + count] = pi;
        }
        count++;
      }
      pi++;
    }
    if (u32) {
      u32[16] = count;
      for (let i = count; i < MAX_LIGHTS; i++) {
        u32[MSH_LIGHT_INDEX_WORD_OFFSET + i] = 0;
      }
    }
    return count === 1 ? single + 1 : -count;
  }
  var _countU32, _countF32, MSH_LIGHT_INDEX_WORD_OFFSET;
  var init_lights_ubo = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/render/lights-ubo.ts"() {
      "use strict";
      init_typed_arrays();
      init_types();
      init_gpu_buffers();
      _countU32 = new U32(1);
      _countF32 = new F32(_countU32.buffer);
      MSH_LIGHT_INDEX_WORD_OFFSET = 20;
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
    const v2 = getViewMatrix(camera);
    for (const b of arr) {
      const wc = b.renderable._worldCenter;
      b._sortDistance = wc ? wc[0] * v2[2] + wc[1] * v2[6] + wc[2] * v2[10] + v2[14] : 0;
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
    const v2 = camera?.viewport;
    if (v2) {
      const rw = rt._width;
      const rh = rt._height;
      const x = Math.floor(v2.x * rw);
      const y = Math.floor((1 - v2.y - v2.height) * rh);
      const w = Math.ceil((v2.x + v2.width) * rw) - x;
      const h = Math.ceil((1 - v2.y) * rh) - y;
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
    const v2 = camera.viewport;
    const rt = task._config.rt;
    const aspect = (task._config.cs ? eng.canvas.width / eng.canvas.height : rt._width / rt._height) * (v2 ? v2.width / v2.height : 1);
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
  function onBeforeRender(scene, cb) {
    scene._beforeRender.unshift(cb);
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
        set x(v2) {
          if (this._x !== v2) {
            this._x = v2;
            this._onDirty();
          }
        }
        get y() {
          return this._y;
        }
        set y(v2) {
          if (this._y !== v2) {
            this._y = v2;
            this._onDirty();
          }
        }
        get z() {
          return this._z;
        }
        set z(v2) {
          if (this._z !== v2) {
            this._z = v2;
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
        copyFrom(v2) {
          this.set(v2.x, v2.y, v2.z);
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/visibility.ts
  function setSubtreeVisible(node, v2) {
    cascade(node, v2);
    bumpVisibilityEpoch();
  }
  function cascade(node, v2) {
    node.visible = v2;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) {
      cascade(kids[i], v2);
    }
  }
  var init_visibility = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/scene/visibility.ts"() {
      "use strict";
      init_engine();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/image-processing-task.ts
  function createImageProcessingTask(config, engine, scene) {
    let state = null;
    const task = {
      name: config.name ?? "image-processing",
      engine,
      scene,
      _passes: [],
      record() {
        disposeImageProcessingState(state);
        state = createImageProcessingState(engine, config.source);
      },
      execute() {
        if (!state) {
          return 0;
        }
        const img = scene.imageProcessing;
        const data = new F32([img.exposure, img.contrast, img.toneMappingEnabled === true ? 1 : 0, 0]);
        engine._device.queue.writeBuffer(state.params, 0, data);
        const pass = engine._currentEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: engine.scRT._colorView,
              loadOp: "clear",
              storeOp: "store",
              clearValue: scene.clearColor
            }
          ]
        });
        pass.setPipeline(state.pipeline);
        pass.setBindGroup(0, state.bindGroup);
        pass.draw(3);
        pass.end();
        return 1;
      },
      dispose() {
        disposeImageProcessingState(state);
        state = null;
        this._passes.length = 0;
      }
    };
    return task;
  }
  function createImageProcessingState(engine, source) {
    const texture = resolveImageProcessingTexture(source);
    if (!texture) {
      throw new Error("Image processing source has no color texture");
    }
    const device = engine._device;
    const sampleCount = texture.sampleCount ?? 1;
    const multisampled = sampleCount > 1;
    const params = device.createBuffer({ size: 16, usage: BU.UNIFORM | BU.COPY_DST });
    const bgl = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: SS.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: SS.FRAGMENT, texture: { sampleType: multisampled ? "unfilterable-float" : "float", multisampled } }
      ]
    });
    const common = `struct P{e:f32,c:f32,t:f32,p:f32}
@group(0)@binding(0)var<uniform> p:P;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position) vec4f{var a=array<vec2f,3>(vec2f(-1,-3),vec2f(3,1),vec2f(-1,1));return vec4f(a[i],0,1);}
fn ip(r:vec4f)->vec4f{var c=r.rgb*p.e;
if(p.t>0.5){c=1.0-exp2(-1.590579*c);}
c=clamp(pow(max(c,vec3f(0)),vec3f(1/2.2)),vec3f(0),vec3f(1));
let h=c*c*(3.0-2.0*c);
if(p.c<1.0){c=mix(vec3f(0.5),c,p.c);}else{c=mix(c,h,p.c-1.0);}
return vec4f(max(c,vec3f(0)),r.a);}`;
    const textureDecl = multisampled ? `@group(0)@binding(1)var s:texture_multisampled_2d<f32>;` : `@group(0)@binding(1)var s:texture_2d<f32>;`;
    const fragment = multisampled ? `@fragment fn fs(@builtin(position) q:vec4f)->@location(0) vec4f{let d=textureDimensions(s);let px=clamp(vec2i(q.xy),vec2i(0),vec2i(d)-1);let n=textureNumSamples(s);var c=vec4f(0);for(var i=0u;i<n;i++){c+=ip(textureLoad(s,px,i));}return c/f32(n);}` : `@fragment fn fs(@builtin(position) q:vec4f)->@location(0) vec4f{let d=textureDimensions(s);return ip(textureLoad(s,clamp(vec2i(q.xy),vec2i(0),vec2i(d)-1),0));}`;
    const shader = device.createShaderModule({ code: `${common}${textureDecl}${fragment}` });
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
      vertex: { module: shader, entryPoint: "vs" },
      fragment: { module: shader, entryPoint: "fs", targets: [{ format: engine.format }] },
      primitive: { topology: "triangle-list" }
    });
    const bindGroup = device.createBindGroup({
      layout: bgl,
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: texture.createView() }
      ]
    });
    return { pipeline, bindGroup, params };
  }
  function resolveImageProcessingTexture(source) {
    const resolved = typeof source === "function" ? source() : source;
    if (!resolved) {
      return null;
    }
    if ("_colorTexture" in resolved) {
      return resolved._colorTexture;
    }
    return resolved.texture;
  }
  function disposeImageProcessingState(state) {
    state?.params.destroy();
  }
  var init_image_processing_task = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/image-processing-task.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
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
  function samplerKey(desc) {
    return `${desc.minFilter ?? "nearest"}:${desc.magFilter ?? "nearest"}:${desc.mipmapFilter ?? "nearest"}:${desc.addressModeU ?? "clamp-to-edge"}:${desc.addressModeV ?? "clamp-to-edge"}:${desc.addressModeW ?? "clamp-to-edge"}:${desc.maxAnisotropy ?? 1}`;
  }
  function getOrCreateSampler(engine, desc = {}) {
    const device = engine._device;
    if (!_samplerCache) {
      _samplerCache = /* @__PURE__ */ new WeakMap();
    }
    let dc = _samplerCache.get(device);
    if (!dc) {
      dc = /* @__PURE__ */ new Map();
      _samplerCache.set(device, dc);
    }
    const key = samplerKey(desc);
    let s = dc.get(key);
    if (!s) {
      s = device.createSampler(desc);
      dc.set(key, s);
    }
    return s;
  }
  function clearSamplerCache(engine) {
    const device = engine._device;
    _samplerCache?.delete(device);
  }
  var _texRefs, _samplerCache;
  var init_gpu_pool = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/resource/gpu-pool.ts"() {
      "use strict";
      _texRefs = null;
      _samplerCache = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/resource/samplers.ts
  function getBilinearSampler(engine) {
    return getOrCreateSampler(engine, _bilinearDesc);
  }
  var _bilinearDesc;
  var init_samplers = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/resource/samplers.ts"() {
      "use strict";
      init_gpu_pool();
      _bilinearDesc = { magFilter: "linear", minFilter: "linear" };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/resource/trilinear-anisotropic-sampler.ts
  function getTrilinearAnisotropicSampler(engine) {
    return getOrCreateSampler(engine, _trilinearAnisotropicDesc);
  }
  var _trilinearAnisotropicDesc;
  var init_trilinear_anisotropic_sampler = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/resource/trilinear-anisotropic-sampler.ts"() {
      "use strict";
      init_gpu_pool();
      _trilinearAnisotropicDesc = {
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
        addressModeW: "repeat",
        maxAnisotropy: 4
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/texture/generate-mipmaps.ts
  var generate_mipmaps_exports = {};
  __export(generate_mipmaps_exports, {
    generateMipmaps: () => generateMipmaps,
    recordMipmaps: () => recordMipmaps
  });
  function clearCache() {
    pipelineCache?.clear();
    pipelineCache = null;
    shaderModule = null;
    linearSampler = null;
    bindGroupLayout = null;
    cachedDevice = null;
  }
  function ensureResources(engine) {
    const device = engine._device;
    if (device !== cachedDevice) {
      clearCache();
      cachedDevice = device;
    }
    shaderModule ?? (shaderModule = device.createShaderModule({ code: BLIT_SHADER }));
    linearSampler ?? (linearSampler = getBilinearSampler(engine));
    bindGroupLayout ?? (bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: SS.FRAGMENT, texture: { sampleType: "float" } },
        { binding: 1, visibility: SS.FRAGMENT, sampler: {} }
      ]
    }));
  }
  function getPipeline(engine, format) {
    const device = engine._device;
    ensureResources(engine);
    pipelineCache ?? (pipelineCache = /* @__PURE__ */ new Map());
    let pipeline = pipelineCache.get(format);
    if (!pipeline) {
      pipeline = device.createRenderPipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
        vertex: { module: shaderModule, entryPoint: "vs" },
        fragment: { module: shaderModule, entryPoint: "fs", targets: [{ format }] },
        primitive: { topology: "triangle-list" }
      });
      pipelineCache.set(format, pipeline);
    }
    return pipeline;
  }
  function generateMipmaps(engine, texture, face) {
    const device = engine._device;
    const encoder = device.createCommandEncoder();
    recordMipmaps(engine, texture, encoder, face);
    device.queue.submit([encoder.finish()]);
  }
  function recordMipmaps(engine, texture, encoder, face) {
    if (texture.mipLevelCount <= 1) {
      return;
    }
    const device = engine._device;
    const pipeline = getPipeline(engine, texture.format);
    const vp = face != null ? { dimension: "2d", baseArrayLayer: face, arrayLayerCount: 1 } : {};
    for (let mip = 1; mip < texture.mipLevelCount; mip++) {
      const srcView = texture.createView({ baseMipLevel: mip - 1, mipLevelCount: 1, ...vp });
      const dstView = texture.createView({ baseMipLevel: mip, mipLevelCount: 1, ...vp });
      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: srcView },
          { binding: 1, resource: linearSampler }
        ]
      });
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: dstView, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }]
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
    }
  }
  var BLIT_SHADER, pipelineCache, shaderModule, linearSampler, bindGroupLayout, cachedDevice;
  var init_generate_mipmaps = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/texture/generate-mipmaps.ts"() {
      "use strict";
      init_gpu_flags();
      init_samplers();
      BLIT_SHADER = `@group(0)@binding(0)var t:texture_2d<f32>;@group(0)@binding(1)var s:sampler;
struct V{@builtin(position)p:vec4f,@location(0)u:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i];return V(vec4f(p,0,1),p*vec2f(.5,-.5)+.5);}
@fragment fn fs(v:V)->@location(0)vec4f{return textureSample(t,s,v.u);}`;
      pipelineCache = null;
      shaderModule = null;
      linearSampler = null;
      bindGroupLayout = null;
      cachedDevice = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/texture/mip-count.ts
  function mipLevelCount(width, height) {
    return Math.floor(Math.log2(Math.max(width, height))) + 1;
  }
  function biasedMipLevelCount(width, height, lodBias) {
    const maxDim = Math.max(width, height);
    return Math.max(1, Math.floor(Math.log2(maxDim) - lodBias) + 1);
  }
  var init_mip_count = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/texture/mip-count.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/transmission.ts
  function enableSceneTransmission(scene, engine) {
    markPbrMaterialsLinear(scene);
    let lastRenderTask = null;
    for (const task of scene._frameGraph._tasks) {
      if ("_renderables" in task) {
        const renderTask = task;
        enableRenderTaskTransmission(renderTask, engine);
        lastRenderTask = renderTask;
      }
    }
    if (lastRenderTask && !scene._frameGraph._tasks.some((task) => task.name === "transmission-image-processing")) {
      scene._frameGraph._tasks.push(createImageProcessingTask({ name: "transmission-image-processing", source: lastRenderTask._config.rt }, engine, scene));
    }
  }
  function enableRenderTaskTransmission(task, engine, options) {
    const linear = options?.linear !== false;
    applyTransmissionOptions(task, options);
    const grab = {
      get texture() {
        return task._targetSignature._transmissionTexture ?? null;
      }
    };
    if (task._executeWithTransmission) {
      return grab;
    }
    if (linear) {
      retargetRenderTaskToLinearOffscreen(task);
    }
    let state = null;
    const record = task.record.bind(task);
    const execute = task.execute?.bind(task);
    const dispose = task.dispose?.bind(task);
    task.record = () => {
      disposeRenderTaskTransmission(state);
      state = createRenderTaskTransmission(task, engine);
      task._targetSignature._transmissionTexture = state.texture;
      record();
      configureTransmissionSource(state, task, engine);
    };
    if (linear && execute) {
      task.execute = () => executeRenderTaskLinear(task.scene, execute);
    }
    task.dispose = () => {
      disposeRenderTaskTransmission(state);
      state = null;
      dispose?.();
    };
    task._executeWithTransmission = (sampleCount) => executePassWithTransmission(task, engine, state, sampleCount);
    return grab;
  }
  function retargetRenderTaskToLinearOffscreen(task) {
    const cfg = task._config;
    const oldDesc = cfg.rt._descriptor;
    const surface = task.scene.surface;
    const sampleCount = surface.msaaSamples;
    const ownsDepth = !cfg.depth;
    const newRt = createRenderTarget({
      lbl: "transmission-linear",
      format: "rgba16float",
      dFormat: ownsDepth ? oldDesc.dFormat ?? "depth24plus-stencil8" : void 0,
      _depthClearValue: oldDesc._depthClearValue,
      _depthCompare: oldDesc._depthCompare,
      samples: sampleCount,
      size: surface
    });
    cfg.rt = newRt;
    cfg.rst = void 0;
    const sig = task._targetSignature;
    sig._colorFormat = "rgba16float";
    sig._depthStencilFormat = cfg.depth?._descriptor.dFormat ?? newRt._descriptor.dFormat;
    sig._depthCompare = newRt._descriptor._depthCompare;
    sig._sampleCount = sampleCount;
    task._opaqueBundles.length = 0;
    task._lastVersion = -1;
  }
  function executeRenderTaskLinear(scene, execute) {
    const imageProcessing = scene.imageProcessing;
    const toneMappingEnabled = imageProcessing.toneMappingEnabled;
    const clearColor = scene.clearColor;
    const linearClearColor = inverseImageProcessedColor(clearColor, imageProcessing.exposure, imageProcessing.contrast, toneMappingEnabled === true);
    imageProcessing.toneMappingEnabled = -1;
    scene.clearColor = linearClearColor;
    try {
      return execute();
    } finally {
      scene.clearColor = clearColor;
      imageProcessing.toneMappingEnabled = toneMappingEnabled;
    }
  }
  function inverseImageProcessedColor(color, exposure, contrast, toneMapping) {
    return {
      r: inverseImageProcessedChannel(color.r, exposure, contrast, toneMapping),
      g: inverseImageProcessedChannel(color.g, exposure, contrast, toneMapping),
      b: inverseImageProcessedChannel(color.b, exposure, contrast, toneMapping),
      a: color.a
    };
  }
  function inverseImageProcessedChannel(value, exposure, contrast, toneMapping) {
    let c = clamp01(value);
    if (contrast < 1) {
      c = contrast > 0 ? clamp01((c - 0.5 * (1 - contrast)) / contrast) : 0.5;
    } else if (contrast > 1) {
      const mixAmount = contrast - 1;
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) * 0.5;
        const high = mid * mid * (3 - 2 * mid);
        const out = mid + (high - mid) * mixAmount;
        if (out < c) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      c = (lo + hi) * 0.5;
    }
    c = c ** 2.2;
    if (toneMapping) {
      c = -Math.log2(Math.max(1 - c, 1e-6)) / 1.5905790328979492;
    }
    return exposure > 0 ? c / exposure : c;
  }
  function clamp01(v2) {
    return Math.min(Math.max(v2, 0), 1);
  }
  function markPbrMaterialsLinear(scene) {
    for (const mesh of scene.meshes) {
      const mat = mesh.material;
      if (mat) {
        mat._linearImageProcessing = true;
        mat._renderFeatures = void 0;
      }
    }
  }
  function createRenderTaskTransmission(task, engine) {
    const rt = task._config.rt;
    const width = 1024;
    const height = 1024;
    const format = "rgba16float";
    const mipLevelCount2 = transmissionMipLevelCount(task._config.transmission, width, height);
    const generateMipmaps2 = mipLevelCount2 > 1;
    const texture = engine._device.createTexture({
      label: task.name,
      size: { width, height },
      format,
      mipLevelCount: mipLevelCount2,
      usage: TU.RENDER_ATTACHMENT | TU.TEXTURE_BINDING | TU.COPY_DST
    });
    const tex = {
      texture,
      view: texture.createView(),
      sampler: getTrilinearAnisotropicSampler(engine),
      width,
      height,
      invertY: false
    };
    return {
      texture: tex,
      _baseView: texture.createView({ baseMipLevel: 0, mipLevelCount: 1 }),
      _sourceWidth: rt._width,
      _sourceHeight: rt._height,
      _sourceTexture: null,
      _blit: null,
      _copyCount: normalizeCopyCount(task._config.transmission),
      _generateMipmaps: generateMipmaps2,
      _copies: 0
    };
  }
  function configureTransmissionSource(state, task, engine) {
    const rt = task._config.rt;
    state._sourceWidth = rt._width;
    state._sourceHeight = rt._height;
    state._sourceTexture = rt._colorTexture;
    const sampleCount = task._targetSignature._sampleCount;
    if (!state._sourceTexture) {
      return;
    }
    state._blit = shouldBlitTransmission(state, sampleCount) ? createTransmissionBlit(state, engine, state._sourceTexture, sampleCount > 1) : null;
  }
  function disposeRenderTaskTransmission(state) {
    state?.texture.texture.destroy();
  }
  function executePassWithTransmission(task, engine, state, sampleCount) {
    state._copies = 0;
    const transparent = task._transparentBindings;
    let pass = beginTaskPass(task, null, sampleCount, false);
    let draws = drawBaseTask(task, pass);
    let lastPipeline = null;
    let overlay = null;
    for (let i = 0; i < transparent.length; i++) {
      const binding = transparent[i];
      if (binding.renderable.mesh?.renderOnTop === true) {
        (overlay ?? (overlay = [])).push(binding);
        continue;
      }
      const transmissive = binding.renderable._transmissive === true;
      if (transmissive && canUpdateTransmission(state)) {
        pass.end();
        updateTransmissionTexture(state, engine);
        pass = beginTaskPass(task, null, sampleCount, true);
        setPassState(task, pass);
        lastPipeline = null;
      }
      const mesh = binding.renderable.mesh;
      if (mesh && mesh.visible === false) {
        continue;
      }
      if (binding.pipeline !== lastPipeline) {
        pass.setPipeline(binding.pipeline);
        lastPipeline = binding.pipeline;
      }
      draws += binding.draw(pass, engine);
    }
    if (overlay) {
      draws += drawList2(pass, overlay, engine);
    }
    pass.end();
    return draws;
  }
  function updateTransmissionTexture(state, engine) {
    if (!state._sourceTexture) {
      throw new Error("No transmission source");
    }
    if (state._blit) {
      blitToTransmission(state, engine);
    } else {
      engine._currentEncoder.copyTextureToTexture(
        { texture: state._sourceTexture },
        { texture: state.texture.texture },
        { width: state.texture.width, height: state.texture.height }
      );
    }
    if (state._generateMipmaps) {
      recordMipmaps(engine, state.texture.texture, engine._currentEncoder);
    }
    state._copies++;
  }
  function getBlitPipeline(engine, format, multisampled) {
    const device = engine._device;
    if (device !== blitDevice) {
      blitPipelines?.clear();
      blitPipelines = null;
      blitShader = null;
      blitMsaaShader = null;
      blitBgl = null;
      blitMsaaBgl = null;
      blitDevice = device;
    }
    if (multisampled) {
      blitMsaaShader ?? (blitMsaaShader = device.createShaderModule({ code: BLIT_MSAA_SHADER }));
      blitMsaaBgl ?? (blitMsaaBgl = device.createBindGroupLayout({
        entries: [{ binding: 0, visibility: SS.FRAGMENT, texture: { sampleType: "unfilterable-float", multisampled: true } }]
      }));
    } else {
      blitShader ?? (blitShader = device.createShaderModule({ code: BLIT_SHADER2 }));
      blitBgl ?? (blitBgl = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: SS.FRAGMENT, texture: { sampleType: "float" } },
          { binding: 1, visibility: SS.FRAGMENT, sampler: {} }
        ]
      }));
    }
    blitPipelines ?? (blitPipelines = /* @__PURE__ */ new Map());
    const key = `${format}:${multisampled ? "msaa" : ""}`;
    let pipeline = blitPipelines.get(key);
    if (!pipeline) {
      const bgl = multisampled ? blitMsaaBgl : blitBgl;
      pipeline = device.createRenderPipeline({
        label: "transmission-copy",
        layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
        vertex: { module: multisampled ? blitMsaaShader : blitShader, entryPoint: "vs" },
        fragment: { module: multisampled ? blitMsaaShader : blitShader, entryPoint: "fs", targets: [{ format }] },
        primitive: { topology: "triangle-list" }
      });
      blitPipelines.set(key, pipeline);
    }
    return pipeline;
  }
  function shouldBlitTransmission(state, sampleCount) {
    return sampleCount > 1 || state._sourceWidth !== state.texture.width || state._sourceHeight !== state.texture.height;
  }
  function createTransmissionBlit(state, engine, source, multisampled) {
    const device = engine._device;
    const pipeline = getBlitPipeline(engine, state.texture.texture.format, multisampled);
    const bindGroup = device.createBindGroup({
      layout: multisampled ? blitMsaaBgl : blitBgl,
      entries: multisampled ? [{ binding: 0, resource: source.createView() }] : [
        { binding: 0, resource: source.createView() },
        { binding: 1, resource: getBilinearSampler(engine) }
      ]
    });
    return { _pipeline: pipeline, _bindGroup: bindGroup };
  }
  function blitToTransmission(state, engine) {
    const blit = state._blit;
    const pass = engine._currentEncoder.beginRenderPass({
      colorAttachments: [{ view: state._baseView, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }]
    });
    pass.setPipeline(blit._pipeline);
    pass.setBindGroup(0, blit._bindGroup);
    pass.draw(3);
    pass.end();
  }
  function canUpdateTransmission(state) {
    return state._copyCount === 0 || state._copies < state._copyCount;
  }
  function beginTaskPass(task, resolveTarget, sampleCount, load) {
    const att = task._colorAttachment;
    const depthLoadOp = load || !task._config.clr ? "load" : "clear";
    if (load) {
      att.loadOp = "load";
    }
    const depthAttachment = task._renderPassDescriptor.depthStencilAttachment;
    if (depthAttachment) {
      depthAttachment.depthLoadOp = depthLoadOp;
      if (depthAttachment.stencilLoadOp) {
        depthAttachment.stencilLoadOp = depthLoadOp;
      }
    }
    if (sampleCount > 1) {
      att.resolveTarget = resolveTarget ?? void 0;
    } else {
      att.resolveTarget = void 0;
    }
    return task.engine._currentEncoder.beginRenderPass(task._renderPassDescriptor);
  }
  function setPassState(task, pass) {
    const cfg = task._config;
    const rt = cfg.rt;
    const scene = task.scene;
    const camera = cfg.cam ?? scene.camera;
    const v2 = camera?.viewport;
    if (v2) {
      const rw = rt._width;
      const rh = rt._height;
      const x = Math.floor(v2.x * rw);
      const y = Math.floor((1 - v2.y - v2.height) * rh);
      const w = Math.ceil((v2.x + v2.width) * rw) - x;
      const h = Math.ceil((1 - v2.y) * rh) - y;
      pass.setViewport(x, y, w, h, 0, 1);
      pass.setScissorRect(x, y, w, h);
    }
    pass.setBindGroup(0, task._sceneBG);
  }
  function drawBaseTask(task, pass) {
    const eng = task.engine;
    const rt = task._config.rt;
    const scene = task.scene;
    const opaqueBindings = task._opaqueBindings;
    const opaqueBundles = task._opaqueBundles;
    setPassState(task, pass);
    if (task._lastVersion !== scene._renderableVersion || task._lastVis !== _vis || opaqueBundles.length === 0) {
      const desc = rt._descriptor;
      const be = eng._device.createRenderBundleEncoder({
        colorFormats: desc.format ? [desc.format] : [],
        depthStencilFormat: desc.dFormat,
        sampleCount: desc.samples ?? 1
      });
      be.setBindGroup(0, task._sceneBG);
      drawList2(be, opaqueBindings, eng);
      opaqueBundles[0] = be.finish();
      task._lastVersion = scene._renderableVersion;
      task._lastVis = _vis;
    }
    let draws = opaqueBindings.length;
    pass.executeBundles(opaqueBundles);
    pass.setBindGroup(0, task._sceneBG);
    draws += drawList2(pass, task._directBindings, eng);
    return draws;
  }
  function drawList2(enc, list, engine) {
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
  function normalizeCopyCount(cfg) {
    const count = cfg?.copyCount ?? 1;
    return count === Infinity ? 0 : Math.max(0, count | 0);
  }
  function applyTransmissionOptions(task, options) {
    if (!options) {
      return;
    }
    let next = task._config.transmission;
    let changed = false;
    const set = (key, value) => {
      if (value === void 0) {
        return;
      }
      next = { ...next, [key]: value };
      changed = true;
    };
    set("copyCount", options.copyCount);
    set("generateMipmaps", options.generateMipmaps);
    set("mipLevelCount", options.mipLevelCount);
    if (changed) {
      task._config.transmission = next;
    }
  }
  function transmissionMipLevelCount(cfg, width, height) {
    if (cfg?.generateMipmaps === false) {
      return 1;
    }
    const full = Math.floor(Math.log2(Math.max(width, height))) + 1;
    const defaultCount = biasedMipLevelCount(width, height, REFRACTION_LOD_BIAS);
    const requested = cfg?.mipLevelCount;
    if (requested === void 0) {
      return Math.min(full, defaultCount);
    }
    return Math.min(full, Math.max(1, requested | 0));
  }
  var BLIT_SHADER2, BLIT_MSAA_SHADER, REFRACTION_LOD_BIAS, blitPipelines, blitShader, blitMsaaShader, blitBgl, blitMsaaBgl, blitDevice;
  var init_transmission = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/frame-graph/transmission.ts"() {
      "use strict";
      init_gpu_flags();
      init_engine();
      init_render_target();
      init_samplers();
      init_trilinear_anisotropic_sampler();
      init_generate_mipmaps();
      init_mip_count();
      init_image_processing_task();
      BLIT_SHADER2 = `@group(0)@binding(0)var t:texture_2d<f32>;@group(0)@binding(1)var s:sampler;struct V{@builtin(position)p:vec4f,@location(0)u:vec2f};@vertex fn vs(@builtin(vertex_index)i:u32)->V{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var u=array<vec2f,3>(vec2f(0,1),vec2f(2,1),vec2f(0,-1));return V(vec4f(p[i],0,1),u[i]);}@fragment fn fs(v:V)->@location(0)vec4f{return textureSample(t,s,v.u);}`;
      BLIT_MSAA_SHADER = `@group(0)@binding(0)var t:texture_multisampled_2d<f32>;struct V{@builtin(position)p:vec4f,@location(0)u:vec2f};@vertex fn vs(@builtin(vertex_index)i:u32)->V{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var u=array<vec2f,3>(vec2f(0,1),vec2f(2,1),vec2f(0,-1));return V(vec4f(p[i],0,1),u[i]);}fn l(p:vec2i)->vec4f{let n=textureNumSamples(t);var c=vec4f(0);for(var i=0u;i<n;i++){c+=textureLoad(t,p,i);}return c/f32(n);}@fragment fn fs(v:V)->@location(0)vec4f{let d=vec2i(textureDimensions(t));let q=clamp(v.u*vec2f(d)-.5,vec2f(0),vec2f(d-vec2i(1)));let p=vec2i(floor(q));let f=fract(q);let p1=min(p+vec2i(1),d-vec2i(1));return mix(mix(l(p),l(vec2i(p1.x,p.y)),f.x),mix(l(vec2i(p.x,p1.y)),l(p1),f.x),f.y);}`;
      REFRACTION_LOD_BIAS = 4;
      blitPipelines = null;
      blitShader = null;
      blitMsaaShader = null;
      blitBgl = null;
      blitMsaaBgl = null;
      blitDevice = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/camera/free-camera.ts
  function createFreeCamera(position, target) {
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const dz = target.z - position.z;
    const _localMat = allocateMat4();
    function cameraLocalWorldMatrix() {
      const view = mat4LookAtLH(cam.position, cam.target, Vec3Up);
      const m = _localMat;
      m[0] = view[0];
      m[1] = view[4];
      m[2] = view[8];
      m[3] = 0;
      m[4] = view[1];
      m[5] = view[5];
      m[6] = view[9];
      m[7] = 0;
      m[8] = view[2];
      m[9] = view[6];
      m[10] = view[10];
      m[11] = 0;
      m[12] = cam.position.x;
      m[13] = cam.position.y;
      m[14] = cam.position.z;
      m[15] = 1;
      return _localMat;
    }
    const wm = createWorldMatrixState(cameraLocalWorldMatrix);
    const onDirty = () => wm.markLocalDirty();
    let _yaw = Math.atan2(dx, dz);
    let _pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    const cam = {
      position: new ObservableVec3(position.x, position.y, position.z, onDirty),
      target: new ObservableVec3(target.x, target.y, target.z, onDirty),
      fov: 0.8,
      nearPlane: 1,
      farPlane: 1e4,
      speed: 2,
      angularSensitivity: 2e3,
      inertia: 0.9,
      children: [],
      // Matrix caches use the process-global allocator.
      _viewCache: allocateMat4(),
      _projCache: allocateMat4(),
      _vpCache: allocateMat4(),
      get parent() {
        return wm.parent;
      },
      set parent(v2) {
        wm.parent = v2;
      },
      get worldMatrix() {
        return wm.getWorldMatrix();
      },
      get worldMatrixVersion() {
        return wm.getWorldMatrixVersion();
      }
    };
    Object.defineProperty(cam, "_yaw", {
      get() {
        return _yaw;
      },
      set(v2) {
        if (_yaw !== v2) {
          _yaw = v2;
          onDirty();
        }
      },
      configurable: true,
      enumerable: true
    });
    Object.defineProperty(cam, "_pitch", {
      get() {
        return _pitch;
      },
      set(v2) {
        if (_pitch !== v2) {
          _pitch = v2;
          onDirty();
        }
      },
      configurable: true,
      enumerable: true
    });
    attachWorldMatrixState(cam, wm);
    return cam;
  }
  var init_free_camera = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/camera/free-camera.ts"() {
      "use strict";
      init_mat4_look_at_lh();
      init_vec3_up();
      init_world_matrix_state();
      init_observable_vec3();
      init_matrix_allocator();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-invert.ts
  function mat4Invert(input) {
    const m = input;
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (Math.abs(det) < 1e-10) {
      return null;
    }
    det = 1 / det;
    const out = new F32(16);
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  var init_mat4_invert = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-invert.ts"() {
      "use strict";
      init_typed_arrays();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/light/light-base.ts
  function createLightBase(getLocalMatrix) {
    const wm = createWorldMatrixState(getLocalMatrix);
    const lvs = {
      _lightVersion: 0,
      bump() {
        lvs._lightVersion++;
      }
    };
    const onDirty = () => {
      wm.markLocalDirty();
      lvs._lightVersion++;
    };
    return { wm, onDirty, lvs };
  }
  function applyWorldMatrixAccessors(target, wm, lvs) {
    Object.defineProperties(target, {
      parent: {
        get() {
          return wm.parent;
        },
        set(v2) {
          wm.parent = v2;
        },
        enumerable: true,
        configurable: true
      },
      worldMatrix: {
        get() {
          return wm.getWorldMatrix();
        },
        enumerable: true,
        configurable: true
      },
      worldMatrixVersion: {
        get() {
          return wm.getWorldMatrixVersion();
        },
        enumerable: true,
        configurable: true
      }
    });
    if (lvs) {
      Object.defineProperty(target, "_lightVersion", {
        get() {
          return lvs._lightVersion;
        },
        enumerable: false,
        configurable: true
      });
    }
    attachWorldMatrixState(target, wm);
    return target;
  }
  var init_light_base = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/light/light-base.ts"() {
      "use strict";
      init_world_matrix_state();
      init_observable_vec3();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/light/light-matrix.ts
  function localMatrixFromDirection(dx, dy, dz, px = 0, py = 0, pz = 0, out) {
    const flen = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const fx = dx / flen, fy = dy / flen, fz = dz / flen;
    let rx = -fz, rz = fx;
    const ry = 0;
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rlen;
    rz /= rlen;
    const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    const out4 = out ?? new F32(16);
    const m = out4;
    m[0] = rx;
    m[1] = ry;
    m[2] = rz;
    m[3] = 0;
    m[4] = ux;
    m[5] = uy;
    m[6] = uz;
    m[7] = 0;
    m[8] = fx;
    m[9] = fy;
    m[10] = fz;
    m[11] = 0;
    m[12] = px;
    m[13] = py;
    m[14] = pz;
    m[15] = 1;
    return out4;
  }
  var init_light_matrix = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/light/light-matrix.ts"() {
      "use strict";
      init_typed_arrays();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/light/point-light.ts
  var point_light_exports = {};
  __export(point_light_exports, {
    createPointLight: () => createPointLight
  });
  function createPointLight(position, intensity = 1) {
    const m = allocateMat4();
    m[0] = 1;
    m[5] = 1;
    m[10] = 1;
    m[15] = 1;
    const _localMatrix = m;
    const { wm, onDirty, lvs } = createLightBase(() => {
      m[12] = light.position.x;
      m[13] = light.position.y;
      m[14] = light.position.z;
      return _localMatrix;
    });
    const light = applyWorldMatrixAccessors(
      {
        lightType: "point",
        children: [],
        position: new ObservableVec3(position[0], position[1], position[2], onDirty),
        diffuse: [1, 1, 1],
        specular: [1, 1, 1],
        intensity,
        range: Number.MAX_VALUE,
        _writeLightUbo: (data, offset) => {
          const o = offset;
          const w = light.worldMatrix;
          data[o] = w[12];
          data[o + 1] = w[13];
          data[o + 2] = w[14];
          data[o + 3] = 0;
          data[o + 4] = light.diffuse[0] * light.intensity;
          data[o + 5] = light.diffuse[1] * light.intensity;
          data[o + 6] = light.diffuse[2] * light.intensity;
          data[o + 7] = light.range;
          data[o + 8] = light.specular[0] * light.intensity;
          data[o + 9] = light.specular[1] * light.intensity;
          data[o + 10] = light.specular[2] * light.intensity;
        }
      },
      wm,
      lvs
    );
    return light;
  }
  var init_point_light = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/light/point-light.ts"() {
      "use strict";
      init_light_base();
      init_matrix_allocator();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/light/directional-light.ts
  var directional_light_exports = {};
  __export(directional_light_exports, {
    createDirectionalLight: () => createDirectionalLight
  });
  function createDirectionalLight(direction, intensity = 1) {
    const _localMatrix = allocateMat4();
    const { wm, onDirty, lvs } = createLightBase(() => {
      return localMatrixFromDirection(light.direction.x, light.direction.y, light.direction.z, light.position.x, light.position.y, light.position.z, _localMatrix);
    });
    const light = applyWorldMatrixAccessors(
      {
        lightType: "directional",
        children: [],
        direction: new ObservableVec3(direction[0], direction[1], direction[2], onDirty),
        position: new ObservableVec3(0, 0, 0, onDirty),
        diffuse: [1, 1, 1],
        specular: [1, 1, 1],
        intensity,
        _writeLightUbo: (data, offset) => {
          const o = offset;
          const w = light.worldMatrix;
          data[o] = w[8];
          data[o + 1] = w[9];
          data[o + 2] = w[10];
          data[o + 3] = 1;
          data[o + 4] = light.diffuse[0] * light.intensity;
          data[o + 5] = light.diffuse[1] * light.intensity;
          data[o + 6] = light.diffuse[2] * light.intensity;
          data[o + 7] = Number.MAX_VALUE;
          data[o + 8] = light.specular[0] * light.intensity;
          data[o + 9] = light.specular[1] * light.intensity;
          data[o + 10] = light.specular[2] * light.intensity;
        }
      },
      wm,
      lvs
    );
    return light;
  }
  var init_directional_light = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/light/directional-light.ts"() {
      "use strict";
      init_light_base();
      init_light_matrix();
      init_matrix_allocator();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/light/spot-light.ts
  var spot_light_exports = {};
  __export(spot_light_exports, {
    createSpotLight: () => createSpotLight
  });
  function createSpotLight(position, direction, angle, exponent, intensity = 1) {
    const _localMatrix = allocateMat4();
    const { wm, onDirty, lvs } = createLightBase(() => {
      return localMatrixFromDirection(light.direction.x, light.direction.y, light.direction.z, light.position.x, light.position.y, light.position.z, _localMatrix);
    });
    let _angle = angle;
    let _cosHalfAngle = Math.cos(angle * 0.5);
    const light = applyWorldMatrixAccessors(
      {
        lightType: "spot",
        children: [],
        position: new ObservableVec3(position[0], position[1], position[2], onDirty),
        direction: new ObservableVec3(direction[0], direction[1], direction[2], onDirty),
        angle: 0,
        // placeholder — overridden by defineProperty below
        exponent,
        diffuse: [1, 1, 1],
        specular: [1, 1, 1],
        intensity,
        range: Number.MAX_VALUE,
        _writeLightUbo: (data, offset) => {
          const o = offset;
          const w = light.worldMatrix;
          data[o] = w[12];
          data[o + 1] = w[13];
          data[o + 2] = w[14];
          data[o + 3] = 2;
          data[o + 4] = light.diffuse[0] * light.intensity;
          data[o + 5] = light.diffuse[1] * light.intensity;
          data[o + 6] = light.diffuse[2] * light.intensity;
          data[o + 7] = light.range;
          data[o + 8] = light.specular[0] * light.intensity;
          data[o + 9] = light.specular[1] * light.intensity;
          data[o + 10] = light.specular[2] * light.intensity;
          data[o + 11] = light.exponent;
          data[o + 12] = w[8];
          data[o + 13] = w[9];
          data[o + 14] = w[10];
          data[o + 15] = _cosHalfAngle;
        }
      },
      wm,
      lvs
    );
    Object.defineProperty(light, "angle", {
      get() {
        return _angle;
      },
      set(v2) {
        if (v2 !== _angle) {
          _angle = v2;
          _cosHalfAngle = Math.cos(v2 * 0.5);
          lvs.bump();
        }
      },
      configurable: true,
      enumerable: true
    });
    return light;
  }
  var init_spot_light = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/light/spot-light.ts"() {
      "use strict";
      init_light_base();
      init_light_matrix();
      init_matrix_allocator();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-flag-bits.ts
  var PBR_HAS_NORMAL_MAP, PBR_HAS_EMISSIVE, PBR_HAS_ENV, PBR_HAS_ALPHA_TEST, PBR_HAS_TONEMAP, PBR_HAS_FOG, PBR_HAS_ALPHA_BLEND, PBR_HAS_SPEC_GLOSS, PBR_HAS_DOUBLE_SIDED, PBR_HAS_COTANGENT_NORMAL, PBR_HAS_METALLIC_REFLECTANCE_MAP, PBR_HAS_REFLECTANCE_MAP, PBR_HAS_USE_ALPHA_ONLY_MR, PBR_HAS_OCCLUSION, PBR_HAS_SPECULAR_AA, PBR_HAS_CLEARCOAT, PBR_HAS_EMISSIVE_COLOR, PBR_HAS_SHEEN, PBR_HAS_SHEEN_TEXTURE, PBR_HAS_GAMMA_ALBEDO, PBR_HAS_ANISOTROPY, PBR_HAS_SUBSURFACE, PBR_HAS_THICKNESS_MAP, PBR_HAS_SKYBOX, PBR_HAS_SHEEN_ALBEDO_SCALING, PBR2_CC_INT_MAP, PBR2_CC_ROUGH_MAP, PBR2_CC_NORMAL_MAP, PBR2_CC_F0_REMAP_OFF, PBR2_HAS_REFRACTION, PBR2_HAS_VOLUME, PBR2_HAS_REFRACTION_MAP, PBR2_HAS_THICKNESS_GLTF_CHANNEL, PBR2_HAS_UNLIT, PBR2_HAS_UV_TRANSFORM, PBR2_HAS_REFLECTANCE_FACTORS, PBR2_HAS_UV2, PBR2_HAS_BASE_COLOR_FACTOR, PBR2_HAS_SHEEN_UV_TX, PBR2_LINEAR_IMAGE_PROCESSING, PBR2_NO_COLOR_OUTPUT, PBR2_ESM_SHADOW_OUTPUT, PBR2_HAS_IRIDESCENCE, PBR2_HAS_IRIDESCENCE_MAP, PBR2_HAS_IRIDESCENCE_THICKNESS_MAP, PBR2_HAS_DISPERSION, PBR2_GEOMETRY_OUTPUT;
  var init_pbr_flag_bits = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-flag-bits.ts"() {
      "use strict";
      PBR_HAS_NORMAL_MAP = 1 << 0;
      PBR_HAS_EMISSIVE = 1 << 1;
      PBR_HAS_ENV = 1 << 2;
      PBR_HAS_ALPHA_TEST = 1 << 3;
      PBR_HAS_TONEMAP = 1 << 4;
      PBR_HAS_FOG = 1 << 5;
      PBR_HAS_ALPHA_BLEND = 1 << 6;
      PBR_HAS_SPEC_GLOSS = 1 << 7;
      PBR_HAS_DOUBLE_SIDED = 1 << 8;
      PBR_HAS_COTANGENT_NORMAL = 1 << 9;
      PBR_HAS_METALLIC_REFLECTANCE_MAP = 1 << 10;
      PBR_HAS_REFLECTANCE_MAP = 1 << 11;
      PBR_HAS_USE_ALPHA_ONLY_MR = 1 << 12;
      PBR_HAS_OCCLUSION = 1 << 15;
      PBR_HAS_SPECULAR_AA = 1 << 17;
      PBR_HAS_CLEARCOAT = 1 << 20;
      PBR_HAS_EMISSIVE_COLOR = 1 << 21;
      PBR_HAS_SHEEN = 1 << 22;
      PBR_HAS_SHEEN_TEXTURE = 1 << 23;
      PBR_HAS_GAMMA_ALBEDO = 1 << 25;
      PBR_HAS_ANISOTROPY = 1 << 26;
      PBR_HAS_SUBSURFACE = 1 << 27;
      PBR_HAS_THICKNESS_MAP = 1 << 28;
      PBR_HAS_SKYBOX = 1 << 29;
      PBR_HAS_SHEEN_ALBEDO_SCALING = 1 << 30;
      PBR2_CC_INT_MAP = 1 << 0;
      PBR2_CC_ROUGH_MAP = 1 << 1;
      PBR2_CC_NORMAL_MAP = 1 << 2;
      PBR2_CC_F0_REMAP_OFF = 1 << 3;
      PBR2_HAS_REFRACTION = 1 << 4;
      PBR2_HAS_VOLUME = 1 << 5;
      PBR2_HAS_REFRACTION_MAP = 1 << 6;
      PBR2_HAS_THICKNESS_GLTF_CHANNEL = 1 << 7;
      PBR2_HAS_UNLIT = 1 << 8;
      PBR2_HAS_UV_TRANSFORM = 1 << 9;
      PBR2_HAS_REFLECTANCE_FACTORS = 1 << 10;
      PBR2_HAS_UV2 = 1 << 11;
      PBR2_HAS_BASE_COLOR_FACTOR = 1 << 12;
      PBR2_HAS_SHEEN_UV_TX = 1 << 13;
      PBR2_LINEAR_IMAGE_PROCESSING = 1 << 14;
      PBR2_NO_COLOR_OUTPUT = 1 << 15;
      PBR2_ESM_SHADOW_OUTPUT = 1 << 16;
      PBR2_HAS_IRIDESCENCE = 1 << 17;
      PBR2_HAS_IRIDESCENCE_MAP = 1 << 18;
      PBR2_HAS_IRIDESCENCE_THICKNESS_MAP = 1 << 19;
      PBR2_HAS_DISPERSION = 1 << 20;
      PBR2_GEOMETRY_OUTPUT = 1 << 21;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-flags.ts
  function _registerPbrExt(ext14) {
    (_pbrExts ?? (_pbrExts = /* @__PURE__ */ new Map())).set(ext14.id, ext14);
    _pbrExtsSorted = null;
  }
  function _getPbrExts() {
    return _pbrExts ?? (_pbrExts = /* @__PURE__ */ new Map());
  }
  function _getPbrExtsSorted() {
    if (!_pbrExtsSorted) {
      const map = _pbrExts;
      _pbrExtsSorted = map ? Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id)) : [];
    }
    return _pbrExtsSorted;
  }
  var _pbrExts, _pbrExtsSorted;
  var init_pbr_flags = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-flags.ts"() {
      "use strict";
      init_pbr_flag_bits();
      _pbrExts = null;
      _pbrExtsSorted = null;
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
        set x(v2) {
          if (this._x !== v2) {
            this._x = v2;
            this._version++;
            this._onDirty();
          }
        }
        get y() {
          return this._y;
        }
        set y(v2) {
          if (this._y !== v2) {
            this._y = v2;
            this._version++;
            this._onDirty();
          }
        }
        get z() {
          return this._z;
        }
        set z(v2) {
          if (this._z !== v2) {
            this._z = v2;
            this._version++;
            this._onDirty();
          }
        }
        get w() {
          return this._w;
        }
        set w(v2) {
          if (this._w !== v2) {
            this._w = v2;
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
      set x(v2) {
        sync();
        apply(v2, ey, ez);
      },
      get y() {
        sync();
        return ey;
      },
      set y(v2) {
        sync();
        apply(ex, v2, ez);
      },
      get z() {
        sync();
        return ez;
      },
      set z(v2) {
        sync();
        apply(ex, ey, v2);
      },
      set: apply
    };
  }
  function createSceneNode(name, px = 0, py = 0, pz = 0, qx = 0, qy = 0, qz = 0, qw = 1, sx = 1, sy = 1, sz = 1) {
    return createSceneNodeCore(name, null, px, py, pz, qx, qy, qz, qw, sx, sy, sz);
  }
  function createSceneNodeFromMatrix(name, matrix) {
    return createSceneNodeCore(name, matrix);
  }
  function createSceneNodeCore(name, matrix, px = 0, py = 0, pz = 0, qx = 0, qy = 0, qz = 0, qw = 1, sx = 1, sy = 1, sz = 1) {
    const wm = createWorldMatrixState(() => {
      if (matrix) {
        return matrix;
      }
      const p = node.position, rq2 = node.rotationQuaternion, s = node.scaling;
      const isIdentity = p.x === 0 && p.y === 0 && p.z === 0 && rq2.x === 0 && rq2.y === 0 && rq2.z === 0 && rq2.w === 1 && s.x === 1 && s.y === 1 && s.z === 1;
      return isIdentity ? mat4Identity() : mat4Compose(p.x, p.y, p.z, rq2.x, rq2.y, rq2.z, rq2.w, s.x, s.y, s.z);
    });
    const onWmDirty = () => {
      if (!matrix) {
        wm.markLocalDirty();
      }
    };
    const rq = new ObservableQuat(qx, qy, qz, qw, onWmDirty);
    const node = {
      name,
      children: [],
      position: new ObservableVec3(px, py, pz, onWmDirty),
      rotationQuaternion: rq,
      rotation: createEulerProxy(rq),
      scaling: new ObservableVec3(sx, sy, sz, onWmDirty),
      get parent() {
        return wm.parent;
      },
      set parent(v2) {
        wm.parent = v2;
      },
      get worldMatrix() {
        return wm.getWorldMatrix();
      },
      get worldMatrixVersion() {
        return wm.getWorldMatrixVersion();
      }
    };
    if (matrix) {
      node._localMatrix = matrix;
    }
    attachWorldMatrixState(node, wm);
    return node;
  }
  var init_scene_node = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/scene/scene-node.ts"() {
      "use strict";
      init_mat4_compose();
      init_mat4_identity();
      init_observable_vec3();
      init_observable_quat();
      init_world_matrix_state();
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
      set(v2) {
        wm.parent = v2;
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/texture/texture-2d.ts
  function cloneTexture2D(base, transform) {
    return { ...base, ...transform };
  }
  function loadTexture2D(engine, url, opts = {}) {
    const device = engine._device;
    if (!_tex2dCache) {
      _tex2dCache = /* @__PURE__ */ new WeakMap();
    }
    let dc = _tex2dCache.get(device);
    if (!dc) {
      dc = /* @__PURE__ */ new Map();
      _tex2dCache.set(device, dc);
    }
    const key = `${url}\0${opts.mipMaps ?? true}\0${opts.addressModeU ?? "repeat"}\0${opts.addressModeV ?? "repeat"}\0${opts.minFilter ?? "linear"}\0${opts.magFilter ?? "linear"}\0${opts.invertY ?? true}\0${opts.srgb ?? false}\0${opts.premultiplyAlpha ?? false}`;
    const hit = dc.get(key);
    if (hit) {
      return hit;
    }
    const map = dc;
    const p = loadTexture2DImpl(engine, url, opts);
    map.set(key, p);
    p.catch(() => map.delete(key));
    return p;
  }
  async function loadTexture2DImpl(engine, url, opts) {
    const device = engine._device;
    const mipMaps = opts.mipMaps ?? true;
    const addressModeU = opts.addressModeU ?? "repeat";
    const addressModeV = opts.addressModeV ?? "repeat";
    const invertY = opts.invertY ?? true;
    const srgb = opts.srgb ?? false;
    const premultiplyAlpha = opts.premultiplyAlpha ?? false;
    const format = srgb ? "rgba8unorm-srgb" : "rgba8unorm";
    const response = await fetch(url);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob, {
      premultiplyAlpha: premultiplyAlpha ? "premultiply" : "none",
      colorSpaceConversion: "none"
    });
    const width = imageBitmap.width;
    const height = imageBitmap.height;
    const mipLevelCount2 = mipMaps ? Math.floor(Math.log2(Math.max(width, height))) + 1 : 1;
    const texture = device.createTexture({
      size: { width, height },
      format,
      mipLevelCount: mipLevelCount2,
      usage: TU.TEXTURE_BINDING | TU.COPY_DST | TU.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture({ source: imageBitmap, flipY: invertY }, { texture, premultipliedAlpha: premultiplyAlpha }, { width, height });
    imageBitmap.close();
    if (mipMaps && mipLevelCount2 > 1) {
      const { generateMipmaps: generateMipmaps2 } = await Promise.resolve().then(() => (init_generate_mipmaps(), generate_mipmaps_exports));
      generateMipmaps2(engine, texture);
    }
    const minF = opts.minFilter ?? "linear";
    const magF = opts.magFilter ?? "linear";
    const mipF = mipMaps ? "linear" : "nearest";
    const allLinear = minF === "linear" && magF === "linear" && mipF === "linear";
    const sampler = getOrCreateSampler(engine, {
      addressModeU,
      addressModeV,
      minFilter: minF,
      magFilter: magF,
      mipmapFilter: mipF,
      maxAnisotropy: allLinear ? 4 : 1
    });
    const tex2d = { texture, view: texture.createView(), sampler, width, height };
    engine._dlr?.u(tex2d, url, opts);
    acquireTexture(tex2d);
    return tex2d;
  }
  var _tex2dCache;
  var init_texture_2d = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/texture/texture-2d.ts"() {
      "use strict";
      init_gpu_flags();
      init_gpu_pool();
      _tex2dCache = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/texture/compressed-formats.ts
  function getTable() {
    if (_table) {
      return _table;
    }
    const t = /* @__PURE__ */ new Map();
    _table = t;
    function add(gl, gpuFormat, feature11, blockW, blockH, blockBytes) {
      t.set(gl, { gpuFormat, feature: feature11, blockW, blockH, blockBytes });
    }
    const BC = "texture-compression-bc";
    const ETC = "texture-compression-etc2";
    const ASTC = "texture-compression-astc";
    add(33776, "bc1-rgba-unorm", BC, 4, 4, 8);
    add(33777, "bc1-rgba-unorm", BC, 4, 4, 8);
    add(33778, "bc2-rgba-unorm", BC, 4, 4, 16);
    add(33779, "bc3-rgba-unorm", BC, 4, 4, 16);
    add(36283, "bc4-r-unorm", BC, 4, 4, 8);
    add(36284, "bc4-r-snorm", BC, 4, 4, 8);
    add(36285, "bc5-rg-unorm", BC, 4, 4, 16);
    add(36286, "bc5-rg-snorm", BC, 4, 4, 16);
    add(36495, "bc6h-rgb-ufloat", BC, 4, 4, 16);
    add(36494, "bc6h-rgb-float", BC, 4, 4, 16);
    add(36492, "bc7-rgba-unorm", BC, 4, 4, 16);
    add(36493, "bc7-rgba-unorm-srgb", BC, 4, 4, 16);
    add(37488, "eac-r11unorm", ETC, 4, 4, 8);
    add(37489, "eac-r11snorm", ETC, 4, 4, 8);
    add(37490, "eac-rg11unorm", ETC, 4, 4, 16);
    add(37491, "eac-rg11snorm", ETC, 4, 4, 16);
    add(37492, "etc2-rgb8unorm", ETC, 4, 4, 8);
    add(37493, "etc2-rgb8unorm-srgb", ETC, 4, 4, 8);
    add(37494, "etc2-rgb8a1unorm", ETC, 4, 4, 8);
    add(37495, "etc2-rgb8a1unorm-srgb", ETC, 4, 4, 8);
    add(37496, "etc2-rgba8unorm", ETC, 4, 4, 16);
    add(37497, "etc2-rgba8unorm-srgb", ETC, 4, 4, 16);
    const ASTC_BLOCKS = [
      [4, 4],
      [5, 4],
      [5, 5],
      [6, 5],
      [6, 6],
      [8, 5],
      [8, 6],
      [8, 8],
      [10, 5],
      [10, 6],
      [10, 8],
      [10, 10],
      [12, 10],
      [12, 12]
    ];
    for (let i = 0; i < ASTC_BLOCKS.length; i++) {
      const [w, h] = ASTC_BLOCKS[i];
      const tag = `${w}x${h}`;
      add(37808 + i, `astc-${tag}-unorm`, ASTC, w, h, 16);
      add(37840 + i, `astc-${tag}-unorm-srgb`, ASTC, w, h, 16);
    }
    return t;
  }
  function getCompressedFormat(glInternalFormat) {
    return getTable().get(glInternalFormat);
  }
  var _table;
  var init_compressed_formats = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/texture/compressed-formats.ts"() {
      "use strict";
      _table = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/texture/ktx2-loader.ts
  function deviceKtx2Caps(engine) {
    const f = engine._device.features;
    const bc = f.has("texture-compression-bc");
    const etc2 = f.has("texture-compression-etc2");
    return {
      astc: f.has("texture-compression-astc"),
      bptc: bc,
      // BC6H/BC7
      s3tc: bc,
      // BC1/BC2/BC3
      pvrtc: false,
      // unsupported on WebGPU
      etc2,
      etc1: etc2
      // ETC1 content transcodes on ETC2-capable GPUs
    };
  }
  function loadKtx2Decoder() {
    if (_ktx2DecoderPromise) {
      return _ktx2DecoderPromise;
    }
    _ktx2DecoderPromise = new Promise((resolve, reject) => {
      const w = globalThis;
      const init = () => {
        const mod = w.KTX2DECODER;
        if (!mod) {
          reject(new Error("KTX2: decoder global KTX2DECODER not found after script load"));
          return;
        }
        mod.MSCTranscoder.UseFromWorkerThread = false;
        mod.WASMMemoryManager.LoadBinariesFromCurrentThread = true;
        if (_ktx2WasmUrls) {
          const m = mod;
          for (const tName of Object.keys(_ktx2WasmUrls)) {
            const t = m[tName];
            if (t) {
              for (const prop of Object.keys(_ktx2WasmUrls[tName])) {
                t[prop] = _ktx2WasmUrls[tName][prop];
              }
            }
          }
        }
        resolve(new mod.KTX2Decoder());
      };
      if (w.KTX2DECODER) {
        init();
        return;
      }
      const script = document.createElement("script");
      script.src = _ktx2DecoderUrl;
      script.async = true;
      script.onload = init;
      script.onerror = () => reject(new Error(`KTX2: failed to load ${script.src}`));
      document.head.appendChild(script);
    });
    _ktx2DecoderPromise.catch(() => {
      _ktx2DecoderPromise = null;
    });
    return _ktx2DecoderPromise;
  }
  function srgbFormat(format) {
    switch (format) {
      case "rgba8unorm":
        return "rgba8unorm-srgb";
      case "bc1-rgba-unorm":
        return "bc1-rgba-unorm-srgb";
      case "bc2-rgba-unorm":
        return "bc2-rgba-unorm-srgb";
      case "bc3-rgba-unorm":
        return "bc3-rgba-unorm-srgb";
      case "bc7-rgba-unorm":
        return "bc7-rgba-unorm-srgb";
      case "etc2-rgb8unorm":
        return "etc2-rgb8unorm-srgb";
      case "etc2-rgb8a1unorm":
        return "etc2-rgb8a1unorm-srgb";
      case "etc2-rgba8unorm":
        return "etc2-rgba8unorm-srgb";
      case "astc-4x4-unorm":
        return "astc-4x4-unorm-srgb";
      case "astc-5x4-unorm":
        return "astc-5x4-unorm-srgb";
      case "astc-5x5-unorm":
        return "astc-5x5-unorm-srgb";
      case "astc-6x5-unorm":
        return "astc-6x5-unorm-srgb";
      case "astc-6x6-unorm":
        return "astc-6x6-unorm-srgb";
      case "astc-8x5-unorm":
        return "astc-8x5-unorm-srgb";
      case "astc-8x6-unorm":
        return "astc-8x6-unorm-srgb";
      case "astc-8x8-unorm":
        return "astc-8x8-unorm-srgb";
      case "astc-10x5-unorm":
        return "astc-10x5-unorm-srgb";
      case "astc-10x6-unorm":
        return "astc-10x6-unorm-srgb";
      case "astc-10x8-unorm":
        return "astc-10x8-unorm-srgb";
      case "astc-10x10-unorm":
        return "astc-10x10-unorm-srgb";
      case "astc-12x10-unorm":
        return "astc-12x10-unorm-srgb";
      case "astc-12x12-unorm":
        return "astc-12x12-unorm-srgb";
      default:
        return format;
    }
  }
  function uncompressedInfo(glFormat) {
    switch (glFormat) {
      case GL_RGBA8:
        return { format: "rgba8unorm", bytesPerPixel: 4 };
      case GL_R8:
        return { format: "r8unorm", bytesPerPixel: 1 };
      case GL_RG8:
        return { format: "rg8unorm", bytesPerPixel: 2 };
      default:
        return null;
    }
  }
  function validateDecoded(decoded) {
    if (decoded.errors) {
      throw new Error(`KTX2: ${decoded.errors}`);
    }
    if (!decoded.mipmaps.length) {
      throw new Error("KTX2: decoder produced no mipmaps");
    }
    for (let i = 0; i < decoded.mipmaps.length; i++) {
      if (!decoded.mipmaps[i]?.data) {
        throw new Error(`KTX2: decoder produced an empty mip ${i}`);
      }
    }
    return decoded.mipmaps;
  }
  function makeSampler(engine, mipCount) {
    return getOrCreateSampler(engine, {
      addressModeU: "repeat",
      addressModeV: "repeat",
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: mipCount > 1 ? "linear" : "nearest",
      maxAnisotropy: mipCount > 1 ? 4 : 1
    });
  }
  function uploadCompressed(engine, mips, format, sRGB) {
    if (!engine._device.features.has(format.feature)) {
      throw new Error(`KTX2: device does not support ${format.feature}`);
    }
    const width = mips[0].width;
    const height = mips[0].height;
    const texture = engine._device.createTexture({
      size: { width, height },
      format: sRGB ? srgbFormat(format.gpuFormat) : format.gpuFormat,
      mipLevelCount: mips.length,
      usage: TU.TEXTURE_BINDING | TU.COPY_DST
    });
    for (let level = 0; level < mips.length; level++) {
      const mip = mips[level];
      const blocksPerRow = Math.ceil(mip.width / format.blockW);
      const rowBytes = blocksPerRow * format.blockBytes;
      const copyW = blocksPerRow * format.blockW;
      const copyH = Math.ceil(mip.height / format.blockH) * format.blockH;
      engine._device.queue.writeTexture({ texture, mipLevel: level }, mip.data, { bytesPerRow: rowBytes }, { width: copyW, height: copyH });
    }
    const tex2d = { texture, view: texture.createView(), sampler: makeSampler(engine, mips.length), width, height, invertY: true };
    acquireTexture(tex2d);
    return tex2d;
  }
  function uploadUncompressed(engine, mips, info, sRGB) {
    const width = mips[0].width;
    const height = mips[0].height;
    const texture = engine._device.createTexture({
      size: { width, height },
      format: sRGB ? srgbFormat(info.format) : info.format,
      mipLevelCount: mips.length,
      usage: TU.TEXTURE_BINDING | TU.COPY_DST
    });
    for (let level = 0; level < mips.length; level++) {
      const mip = mips[level];
      const expected = mip.width * mip.height * info.bytesPerPixel;
      if (mip.data.length !== expected) {
        throw new Error(`KTX2: uncompressed mip ${level} has ${mip.data.length} bytes, expected ${expected}`);
      }
      engine._device.queue.writeTexture(
        { texture, mipLevel: level },
        mip.data,
        { bytesPerRow: mip.width * info.bytesPerPixel },
        { width: mip.width, height: mip.height }
      );
    }
    const tex2d = { texture, view: texture.createView(), sampler: makeSampler(engine, mips.length), width, height, invertY: true };
    acquireTexture(tex2d);
    return tex2d;
  }
  async function uploadKtx2Texture2D(engine, buffer, sRGB) {
    const decoder = await loadKtx2Decoder();
    const decoded = await decoder.decode(new U8(buffer), deviceKtx2Caps(engine));
    const mips = validateDecoded(decoded);
    const compressed = getCompressedFormat(decoded.transcodedFormat);
    if (compressed) {
      return uploadCompressed(engine, mips, compressed, sRGB);
    }
    const uncompressed = uncompressedInfo(decoded.transcodedFormat);
    if (uncompressed) {
      return uploadUncompressed(engine, mips, uncompressed, sRGB);
    }
    throw new Error(`KTX2: unsupported transcoded format 0x${decoded.transcodedFormat.toString(16)}`);
  }
  async function decodeKtx2ImageBitmapFromBuffer(buffer) {
    const decoder = await loadKtx2Decoder();
    const decoded = await decoder.decode(new U8(buffer), RGBA_CAPS, { forceRGBA: true });
    const mip0 = validateDecoded(decoded)[0];
    if (mip0.data.length !== mip0.width * mip0.height * 4) {
      throw new Error("KTX2: RGBA decode size does not match image dimensions");
    }
    const pixels = new U8C(mip0.data.length);
    pixels.set(mip0.data);
    return createImageBitmap(new ImageData(pixels, mip0.width, mip0.height));
  }
  var _ktx2DecoderUrl, _ktx2WasmUrls, _ktx2DecoderPromise, GL_RGBA8, GL_R8, GL_RG8, RGBA_CAPS;
  var init_ktx2_loader = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/texture/ktx2-loader.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_gpu_pool();
      init_compressed_formats();
      _ktx2DecoderUrl = "https://cdn.babylonjs.com/babylon.ktx2Decoder.js";
      _ktx2WasmUrls = null;
      _ktx2DecoderPromise = null;
      GL_RGBA8 = 32856;
      GL_R8 = 33321;
      GL_RG8 = 33323;
      RGBA_CAPS = { astc: false, bptc: false, s3tc: false, pvrtc: false, etc2: false, etc1: false };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-flags.ts
  function _registerStdExt(ext14) {
    (_stdExts ?? (_stdExts = /* @__PURE__ */ new Map())).set(ext14._id, ext14);
    _stdExtsSorted = null;
  }
  function _getStdExts() {
    return _stdExts ?? (_stdExts = /* @__PURE__ */ new Map());
  }
  function _getStdExtsSorted() {
    if (!_stdExtsSorted) {
      const map = _stdExts;
      _stdExtsSorted = map ? Array.from(map.values()).sort((a, b) => a._id.localeCompare(b._id)) : [];
    }
    return _stdExtsSorted;
  }
  var HAS_DIFFUSE_TEXTURE, HAS_EMISSIVE_TEXTURE, HAS_BUMP_TEXTURE, HAS_SPECULAR_TEXTURE, HAS_AMBIENT_TEXTURE, HAS_LIGHTMAP_TEXTURE, HAS_OPACITY_TEXTURE, LIGHTMAP_USES_UV2, AMBIENT_USES_UV2, DOUBLE_SIDED, DIFFUSE_USES_UV2, SPECULAR_USES_UV2, OPACITY_FROM_RGB, HAS_REFLECTION_TEXTURE, DISABLE_LIGHTING, MATERIAL_ALPHA_BLEND, HAS_CUBE_REFLECTION, NO_COLOR_OUTPUT, HAS_DEPTH_EMISSIVE_TEXTURE, ESM_SHADOW_OUTPUT, GEOMETRY_OUTPUT, LIGHTMAP_SHADOWMAP, LIGHTMAP_FLIP_V, _stdExts, _stdExtsSorted, NEEDS_UV, NEEDS_UV2;
  var init_standard_flags = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-flags.ts"() {
      "use strict";
      HAS_DIFFUSE_TEXTURE = 1 << 0;
      HAS_EMISSIVE_TEXTURE = 1 << 1;
      HAS_BUMP_TEXTURE = 1 << 2;
      HAS_SPECULAR_TEXTURE = 1 << 3;
      HAS_AMBIENT_TEXTURE = 1 << 4;
      HAS_LIGHTMAP_TEXTURE = 1 << 5;
      HAS_OPACITY_TEXTURE = 1 << 6;
      LIGHTMAP_USES_UV2 = 1 << 7;
      AMBIENT_USES_UV2 = 1 << 8;
      DOUBLE_SIDED = 1 << 9;
      DIFFUSE_USES_UV2 = 1 << 10;
      SPECULAR_USES_UV2 = 1 << 11;
      OPACITY_FROM_RGB = 1 << 12;
      HAS_REFLECTION_TEXTURE = 1 << 13;
      DISABLE_LIGHTING = 1 << 14;
      MATERIAL_ALPHA_BLEND = 1 << 16;
      HAS_CUBE_REFLECTION = 1 << 17;
      NO_COLOR_OUTPUT = 1 << 18;
      HAS_DEPTH_EMISSIVE_TEXTURE = 1 << 19;
      ESM_SHADOW_OUTPUT = 1 << 20;
      GEOMETRY_OUTPUT = 1 << 21;
      LIGHTMAP_SHADOWMAP = 1 << 15;
      LIGHTMAP_FLIP_V = 1 << 22;
      _stdExts = null;
      _stdExtsSorted = null;
      NEEDS_UV = HAS_DIFFUSE_TEXTURE | HAS_EMISSIVE_TEXTURE | HAS_BUMP_TEXTURE | HAS_SPECULAR_TEXTURE | HAS_AMBIENT_TEXTURE | HAS_LIGHTMAP_TEXTURE | HAS_OPACITY_TEXTURE;
      NEEDS_UV2 = LIGHTMAP_USES_UV2 | AMBIENT_USES_UV2 | DIFFUSE_USES_UV2 | SPECULAR_USES_UV2;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/wgsl-helpers.ts
  var WGSL_PERTURB_NORMAL, WGSL_FOG;
  var init_wgsl_helpers = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/wgsl-helpers.ts"() {
      "use strict";
      WGSL_PERTURB_NORMAL = `
fn perturbNormal(vNormalW: vec3<f32>, positionW: vec3<f32>, uv: vec2<f32>, bumpScale: f32) -> vec3<f32> {
let normalSample = textureSample(bT, bS, uv).rgb * 2.0 - 1.0;
let N = normalize(vNormalW) * bumpScale;
let dp1 = dpdx(positionW);
let dp2 = -dpdy(positionW);
let duv1 = dpdx(uv);
let duv2 = -dpdy(uv);
let dp2perp = cross(dp2, N);
let dp1perp = cross(N, dp1);
var tangent = dp2perp * duv1.x + dp1perp * duv2.x;
var bitangent = dp2perp * duv1.y + dp1perp * duv2.y;
let det = max(dot(tangent, tangent), dot(bitangent, bitangent));
let invmax = select(inverseSqrt(det), 0.0, det == 0.0);
let cotangentFrame = mat3x3<f32>(tangent * invmax, bitangent * invmax, N);
return normalize(cotangentFrame * normalSample);
}
`;
      WGSL_FOG = `
const E_FOG: f32 = 2.71828;
fn calcFogFactor(fogDistance: vec3<f32>) -> f32 {
var fogCoeff: f32 = 1.0;
let fogMode = scene.vFogInfos.x;
let fogStart = scene.vFogInfos.y;
let fogEnd = scene.vFogInfos.z;
let fogDensity = scene.vFogInfos.w;
let dist = length(fogDistance);
if (fogMode == 3.0) { fogCoeff = (fogEnd - dist) / (fogEnd - fogStart); }
else if (fogMode == 1.0) { fogCoeff = 1.0 / pow(E_FOG, dist * fogDensity); }
else if (fogMode == 2.0) { fogCoeff = 1.0 / pow(E_FOG, dist * dist * fogDensity * fogDensity); }
return clamp(fogCoeff, 0.0, 1.0);
}
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/normal-map-fragment.ts
  var normal_map_fragment_exports = {};
  __export(normal_map_fragment_exports, {
    bumpStdExt: () => bumpStdExt,
    createNormalMapFragment: () => createNormalMapFragment
  });
  function createNormalMapFragment() {
    return {
      _id: "normal-map",
      _bindings: [
        { _name: "bT", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT },
        { _name: "bS", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT }
      ],
      _helperFunctions: WGSL_PERTURB_NORMAL,
      _fragmentSlots: {
        AC: `normalW = perturbNormal(input.vn, input.vp, input.vu, mat.bs);`
      }
    };
  }
  var STAGE_FRAGMENT, bumpStdExt;
  var init_normal_map_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/normal-map-fragment.ts"() {
      "use strict";
      init_standard_flags();
      init_wgsl_helpers();
      STAGE_FRAGMENT = 2;
      bumpStdExt = {
        _id: "normal-map",
        _phase: "mesh",
        _feature: HAS_BUMP_TEXTURE,
        _frag: createNormalMapFragment,
        _bind(mat, entries, b) {
          const tex = mat.bumpTexture;
          entries.push({ binding: b++, resource: tex.texture.createView() });
          entries.push({ binding: b++, resource: tex.sampler });
          return b;
        },
        _textures(mat, out) {
          if (mat.bumpTexture) {
            out.push(mat.bumpTexture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-emissive-fragment.ts
  var std_emissive_fragment_exports = {};
  __export(std_emissive_fragment_exports, {
    createStdEmissiveFragment: () => createStdEmissiveFragment,
    stdEmissiveExt: () => stdEmissiveExt
  });
  function createStdEmissiveFragment(depthTexture) {
    return {
      _id: "std-emissive",
      _bindings: [
        {
          _name: "eT",
          _type: { _kind: "texture", _textureType: "texture_2d<f32>", _sampleType: depthTexture ? "unfilterable-float" : void 0 },
          _visibility: STAGE_FRAGMENT2
        },
        { _name: "eS", _type: { _kind: "sampler", _samplerType: depthTexture ? "sampler_non_filtering" : "sampler" }, _visibility: STAGE_FRAGMENT2 }
      ],
      _fragmentSlots: {
        AT: `emissiveContrib = mat.ec + textureSample(eT, eS, input.vu).rgb * mat.tl;`
      }
    };
  }
  var STAGE_FRAGMENT2, stdEmissiveExt;
  var init_std_emissive_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-emissive-fragment.ts"() {
      "use strict";
      init_standard_flags();
      STAGE_FRAGMENT2 = 2;
      stdEmissiveExt = {
        _id: "std-emissive",
        _phase: "mesh",
        _feature: HAS_EMISSIVE_TEXTURE,
        _frag: (features) => createStdEmissiveFragment((features & HAS_DEPTH_EMISSIVE_TEXTURE) !== 0),
        _bind(mat, entries, b) {
          const tex = mat.emissiveTexture;
          entries.push({ binding: b++, resource: tex.view });
          entries.push({ binding: b++, resource: tex.sampler });
          return b;
        },
        _textures(mat, out) {
          if (mat.emissiveTexture) {
            out.push(mat.emissiveTexture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-specular-fragment.ts
  var std_specular_fragment_exports = {};
  __export(std_specular_fragment_exports, {
    createStdSpecularFragment: () => createStdSpecularFragment,
    stdSpecularExt: () => stdSpecularExt
  });
  function createStdSpecularFragment(usesUV2) {
    const uv = usesUV2 ? "input.vv" : "input.vu";
    return {
      _id: "std-specular",
      _bindings: [
        { _name: "sT", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT3 },
        { _name: "sS", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT3 }
      ],
      _fragmentSlots: {
        AT: `specularColor = textureSample(sT, sS, ${uv}).rgb;`
      }
    };
  }
  var STAGE_FRAGMENT3, stdSpecularExt;
  var init_std_specular_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-specular-fragment.ts"() {
      "use strict";
      init_standard_flags();
      STAGE_FRAGMENT3 = 2;
      stdSpecularExt = {
        _id: "std-specular",
        _phase: "mesh",
        _feature: HAS_SPECULAR_TEXTURE,
        _frag: (features) => createStdSpecularFragment((features & SPECULAR_USES_UV2) !== 0),
        _bind(mat, entries, b) {
          const tex = mat.specularTexture;
          entries.push({ binding: b++, resource: tex.texture.createView() });
          entries.push({ binding: b++, resource: tex.sampler });
          return b;
        },
        _textures(mat, out) {
          if (mat.specularTexture) {
            out.push(mat.specularTexture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-ambient-fragment.ts
  var std_ambient_fragment_exports = {};
  __export(std_ambient_fragment_exports, {
    createStdAmbientFragment: () => createStdAmbientFragment,
    stdAmbientExt: () => stdAmbientExt
  });
  function createStdAmbientFragment(usesUV2) {
    const uv = usesUV2 ? "input.vv" : "input.vu";
    return {
      _id: "std-ambient",
      _bindings: [
        { _name: "aT", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT4 },
        { _name: "aS", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT4 }
      ],
      _fragmentSlots: {
        AD: `baseAmbientColor = textureSample(aT, aS, ${uv}).rgb * mat.ambTexLvl;`
      }
    };
  }
  var STAGE_FRAGMENT4, stdAmbientExt;
  var init_std_ambient_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-ambient-fragment.ts"() {
      "use strict";
      init_standard_flags();
      STAGE_FRAGMENT4 = 2;
      stdAmbientExt = {
        _id: "std-ambient",
        _phase: "mesh",
        _feature: HAS_AMBIENT_TEXTURE,
        _frag: (features) => createStdAmbientFragment((features & AMBIENT_USES_UV2) !== 0),
        _bind(mat, entries, b) {
          const tex = mat.ambientTexture;
          entries.push({ binding: b++, resource: tex.texture.createView() });
          entries.push({ binding: b++, resource: tex.sampler });
          return b;
        },
        _textures(mat, out) {
          if (mat.ambientTexture) {
            out.push(mat.ambientTexture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-lightmap-fragment.ts
  var std_lightmap_fragment_exports = {};
  __export(std_lightmap_fragment_exports, {
    createStdLightmapFragment: () => createStdLightmapFragment,
    stdLightmapExt: () => stdLightmapExt
  });
  function createStdLightmapFragment(usesUV2, shadowmap, flipV) {
    const baseUv = usesUV2 ? "input.vv" : "input.vu";
    const uv = flipV ? `vec2<f32>(${baseUv}.x, 1.0 - ${baseUv}.y)` : baseUv;
    const lm = `textureSample(lT, lS, ${uv}).rgb * mat.lmLvl`;
    const apply = shadowmap ? `color.rgb * (${lm})` : `color.rgb + ${lm}`;
    return {
      _id: "std-lightmap",
      _bindings: [
        { _name: "lT", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT5 },
        { _name: "lS", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT5 }
      ],
      _fragmentSlots: {
        BC: `color = vec4<f32>(${apply}, color.a);`
      }
    };
  }
  var STAGE_FRAGMENT5, stdLightmapExt;
  var init_std_lightmap_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-lightmap-fragment.ts"() {
      "use strict";
      init_standard_flags();
      STAGE_FRAGMENT5 = 2;
      stdLightmapExt = {
        _id: "std-lightmap",
        _phase: "mesh",
        _feature: HAS_LIGHTMAP_TEXTURE,
        _frag: (features) => createStdLightmapFragment((features & LIGHTMAP_USES_UV2) !== 0, (features & LIGHTMAP_SHADOWMAP) !== 0, (features & LIGHTMAP_FLIP_V) !== 0),
        _bind(mat, entries, b) {
          const tex = mat.lightmapTexture;
          entries.push({ binding: b++, resource: tex.texture.createView() });
          entries.push({ binding: b++, resource: tex.sampler });
          return b;
        },
        _textures(mat, out) {
          if (mat.lightmapTexture) {
            out.push(mat.lightmapTexture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-opacity-fragment.ts
  var std_opacity_fragment_exports = {};
  __export(std_opacity_fragment_exports, {
    createStdOpacityFragment: () => createStdOpacityFragment,
    stdOpacityExt: () => stdOpacityExt
  });
  function createStdOpacityFragment(fromRGB) {
    const opacityCalc = fromRGB ? `{ let opSample = textureSample(oT, oS, input.vu); alpha *= dot(opSample.rgb, vec3<f32>(0.3, 0.59, 0.11)) * mat.opLvl; }` : `alpha *= textureSample(oT, oS, input.vu).a * mat.opLvl;`;
    return {
      _id: "std-opacity",
      _bindings: [
        { _name: "oT", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT6 },
        { _name: "oS", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT6 }
      ],
      _fragmentSlots: {
        AT: opacityCalc
      }
    };
  }
  var STAGE_FRAGMENT6, stdOpacityExt;
  var init_std_opacity_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-opacity-fragment.ts"() {
      "use strict";
      init_standard_flags();
      STAGE_FRAGMENT6 = 2;
      stdOpacityExt = {
        _id: "std-opacity",
        _phase: "mesh",
        _feature: HAS_OPACITY_TEXTURE,
        _frag: (features) => createStdOpacityFragment((features & OPACITY_FROM_RGB) !== 0),
        _bind(mat, entries, b) {
          const tex = mat.opacityTexture;
          entries.push({ binding: b++, resource: tex.texture.createView() });
          entries.push({ binding: b++, resource: tex.sampler });
          return b;
        },
        _textures(mat, out) {
          if (mat.opacityTexture) {
            out.push(mat.opacityTexture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-reflection-fragment.ts
  var std_reflection_fragment_exports = {};
  __export(std_reflection_fragment_exports, {
    createStdReflectionFragment: () => createStdReflectionFragment,
    stdReflectionExt: () => stdReflectionExt
  });
  function createStdReflectionFragment() {
    return {
      _id: "std-reflection",
      _bindings: [
        { _name: "rT", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT7 },
        { _name: "rS", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT7 }
      ],
      _helperFunctions: REFLECTION_HELPERS,
      _fragmentSlots: {
        AD: `{
var reflCoords: vec2<f32>;
if (mat.rCm < 1.5) { reflCoords = computeSphericalCoords(input.vp, normalW); }
else { reflCoords = computePlanarCoords(input.vp, normalW); }
reflectionColor = textureSample(rT, rS, reflCoords).rgb * mat.rLvl;
}`
      }
    };
  }
  var STAGE_FRAGMENT7, REFLECTION_HELPERS, stdReflectionExt;
  var init_std_reflection_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-reflection-fragment.ts"() {
      "use strict";
      init_standard_flags();
      STAGE_FRAGMENT7 = 2;
      REFLECTION_HELPERS = `
fn computeSphericalCoords(worldPos: vec3<f32>, worldNormal: vec3<f32>) -> vec2<f32> {
let viewDir = normalize((scene.view * vec4<f32>(worldPos, 1.0)).xyz);
let viewNormal = normalize((scene.view * vec4<f32>(worldNormal, 0.0)).xyz);
var r = reflect(viewDir, viewNormal);
r.z = r.z - 1.0;
let m = 2.0 * length(r);
return vec2<f32>(r.x / m + 0.5, r.y / m + 0.5);
}
fn computePlanarCoords(worldPos: vec3<f32>, worldNormal: vec3<f32>) -> vec2<f32> {
let viewDir = worldPos - scene.vEyePosition.xyz;
let coords = normalize(reflect(viewDir, worldNormal));
return vec2<f32>(coords.x, 1.0 - coords.y);
}
`;
      stdReflectionExt = {
        _id: "std-reflection",
        _phase: "mesh",
        _feature: HAS_REFLECTION_TEXTURE,
        _frag: createStdReflectionFragment,
        _bind(mat, entries, b) {
          const tex = mat.reflectionTexture;
          entries.push({ binding: b++, resource: tex.texture.createView() });
          entries.push({ binding: b++, resource: tex.sampler });
          return b;
        },
        _textures(mat, out) {
          if (mat.reflectionTexture) {
            out.push(mat.reflectionTexture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-cube-reflection-fragment.ts
  var std_cube_reflection_fragment_exports = {};
  __export(std_cube_reflection_fragment_exports, {
    createStdCubeReflectionFragment: () => createStdCubeReflectionFragment,
    stdCubeReflectionExt: () => stdCubeReflectionExt
  });
  function createStdCubeReflectionFragment() {
    return {
      _id: "std-cube-reflection",
      _bindings: [
        { _name: "cRT", _type: { _kind: "texture", _textureType: "texture_cube<f32>" }, _visibility: 2 },
        { _name: "cRS", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: 2 }
      ],
      _fragmentSlots: {
        AD: `{let v=normalize(input.vp-scene.vEyePosition.xyz);reflectionColor=textureSample(cRT,cRS,reflect(v,normalW)).rgb*mat.rLvl;}`
      }
    };
  }
  var stdCubeReflectionExt;
  var init_std_cube_reflection_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-cube-reflection-fragment.ts"() {
      "use strict";
      init_standard_flags();
      stdCubeReflectionExt = {
        _id: "std-cube-reflection",
        _phase: "mesh",
        _feature: HAS_CUBE_REFLECTION,
        _frag: createStdCubeReflectionFragment,
        _bind(mat, entries, b) {
          const cube = mat.reflectionCubeTexture;
          entries.push({ binding: b++, resource: cube.view });
          entries.push({ binding: b++, resource: cube.sampler });
          return b;
        }
        // Cube textures are tracked separately; no Texture2D[] contribution.
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance-gpu.ts
  var thin_instance_gpu_exports = {};
  __export(thin_instance_gpu_exports, {
    syncThinInstanceBuffers: () => syncThinInstanceBuffers,
    syncThinInstanceGpuData: () => syncThinInstanceGpuData
  });
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/fragments/thin-instance-fragment.ts
  var thin_instance_fragment_exports = {};
  __export(thin_instance_fragment_exports, {
    createThinInstanceFragment: () => createThinInstanceFragment
  });
  function createThinInstanceFragment(hasInstanceColor) {
    const attrs = [
      {
        _name: "world0",
        _type: "vec4<f32>",
        _gpuFormat: "float32x4",
        _arrayStride: 64,
        _stepMode: "instance",
        _bufferGroup: "ti-matrix",
        _offset: 0
      },
      {
        _name: "world1",
        _type: "vec4<f32>",
        _gpuFormat: "float32x4",
        _arrayStride: 64,
        _stepMode: "instance",
        _bufferGroup: "ti-matrix",
        _offset: 16
      },
      {
        _name: "world2",
        _type: "vec4<f32>",
        _gpuFormat: "float32x4",
        _arrayStride: 64,
        _stepMode: "instance",
        _bufferGroup: "ti-matrix",
        _offset: 32
      },
      {
        _name: "world3",
        _type: "vec4<f32>",
        _gpuFormat: "float32x4",
        _arrayStride: 64,
        _stepMode: "instance",
        _bufferGroup: "ti-matrix",
        _offset: 48
      }
    ];
    if (hasInstanceColor) {
      attrs.push({
        _name: "instanceColor",
        _type: "vec4<f32>",
        _gpuFormat: "float32x4",
        _arrayStride: 16,
        _stepMode: "instance",
        _bufferGroup: "ti-color",
        _offset: 0
      });
    }
    return {
      _id: "thin-instance",
      _vertexAttributes: attrs,
      _varyings: hasInstanceColor ? [{ _name: "vInstanceColor", _type: "vec4<f32>" }] : [],
      _vertexSlots: {
        VW: `let instanceWorld = mat4x4<f32>(world0, world1, world2, world3);
finalWorld = mesh.world * instanceWorld;`,
        VB: hasInstanceColor ? `out.vInstanceColor = instanceColor;` : ""
      },
      _fragmentSlots: hasInstanceColor ? {
        AT: `baseColor *= input.vInstanceColor.rgb;
alpha *= input.vInstanceColor.a;`
      } : {}
    };
  }
  var init_thin_instance_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/fragments/thin-instance-fragment.ts"() {
      "use strict";
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
    const v2 = camera.viewport;
    const aspect = context.targetWidth / context.targetHeight * (v2 ? v2.width / v2.height : 1);
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/fragments/shadow-fragment-core.ts
  function createShadowFragment(id, shadowLights) {
    const varyings = [];
    const bindings = [];
    const vertexLines = [];
    const fragmentLines = [];
    const helperParts = [];
    for (const slot of shadowLights) {
      const li = slot.lightIndex;
      const suffix = `_${li}`;
      varyings.push({ _name: `vPosFromLight${suffix}`, _type: "vec4<f32>" }, { _name: `vDepthMetric${suffix}`, _type: "f32" });
      if (slot.shadowType === "pcf") {
        bindings.push(
          { _name: `shadowTex${suffix}`, _type: { _kind: "texture", _textureType: "texture_depth_2d", _sampleType: "depth" }, _group: "shadow", _visibility: STAGE_FRAGMENT8 },
          { _name: `shadowComp${suffix}`, _type: { _kind: "sampler", _samplerType: "sampler_comparison" }, _group: "shadow", _visibility: STAGE_FRAGMENT8 }
        );
      } else {
        bindings.push(
          { _name: `shadowTex${suffix}`, _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _group: "shadow", _visibility: STAGE_FRAGMENT8 },
          { _name: `shadowSamp${suffix}`, _type: { _kind: "sampler", _samplerType: "sampler" }, _group: "shadow", _visibility: STAGE_FRAGMENT8 }
        );
      }
      bindings.push({ _name: `shadowInfo${suffix}`, _type: { _kind: "uniform-buffer" }, _group: "shadow", _visibility: STAGE_FRAGMENT8 | STAGE_VERTEX });
      vertexLines.push(
        `out.vPosFromLight${suffix} = shadowInfo${suffix}.lightMatrix * worldPos4;`,
        `out.vDepthMetric${suffix} = (out.vPosFromLight${suffix}.z + shadowInfo${suffix}.depthValues.x) / shadowInfo${suffix}.depthValues.y;`
      );
      if (slot.shadowType === "pcf") {
        fragmentLines.push(
          `shadowFactors[${li}] = computeShadowPCF${suffix}(input.vPosFromLight${suffix}, input.vDepthMetric${suffix}, shadowInfo${suffix}.shadowsInfo.x, shadowInfo${suffix}.shadowsInfo.y, shadowInfo${suffix}.shadowsInfo.z);`
        );
      } else {
        fragmentLines.push(
          `shadowFactors[${li}] = computeShadowESM${suffix}(input.vPosFromLight${suffix}, input.vDepthMetric${suffix}, shadowInfo${suffix}.shadowsInfo.x, shadowInfo${suffix}.shadowsInfo.z, shadowInfo${suffix}.shadowsInfo.w);`
        );
      }
    }
    for (const slot of shadowLights) {
      const li = slot.lightIndex;
      const suffix = `_${li}`;
      helperParts.push(`struct shadowInfo${suffix}Uniforms { lightMatrix: mat4x4<f32>, depthValues: vec4<f32>, shadowsInfo: vec4<f32> };`);
      if (slot.shadowType === "pcf") {
        helperParts.push(`
fn computeShadowPCF${suffix}(posFromLight: vec4<f32>, depthMetric: f32, darkness: f32, mapSz: f32, invMapSz: f32) -> f32 {
let clipSpace = posFromLight.xyz / posFromLight.w;
let uv = vec2<f32>(0.5 * clipSpace.x + 0.5, 0.5 - 0.5 * clipSpace.y);
if (depthMetric < 0.0 || depthMetric > 1.0 || uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 1.0; }
let depthRef = clamp(clipSpace.z, 0.0, 1.0);
var tc = uv * mapSz + 0.5;
let st = fract(tc);
let base = (floor(tc) - 0.5) * invMapSz;
let uvw0 = 4.0 - 3.0 * st;
let uvw1 = vec2<f32>(7.0);
let uvw2 = 1.0 + 3.0 * st;
let u = vec3<f32>((3.0 - 2.0 * st.x) / uvw0.x - 2.0, (3.0 + st.x) / uvw1.x, st.x / uvw2.x + 2.0) * invMapSz;
let v = vec3<f32>((3.0 - 2.0 * st.y) / uvw0.y - 2.0, (3.0 + st.y) / uvw1.y, st.y / uvw2.y + 2.0) * invMapSz;
var sh = 0.0;
sh += uvw0.x * uvw0.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[0], v[0]), depthRef);
sh += uvw1.x * uvw0.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[1], v[0]), depthRef);
sh += uvw2.x * uvw0.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[2], v[0]), depthRef);
sh += uvw0.x * uvw1.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[0], v[1]), depthRef);
sh += uvw1.x * uvw1.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[1], v[1]), depthRef);
sh += uvw2.x * uvw1.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[2], v[1]), depthRef);
sh += uvw0.x * uvw2.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[0], v[2]), depthRef);
sh += uvw1.x * uvw2.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[1], v[2]), depthRef);
sh += uvw2.x * uvw2.y * textureSampleCompareLevel(shadowTex${suffix}, shadowComp${suffix}, base + vec2<f32>(u[2], v[2]), depthRef);
sh /= 144.0;
return mix(darkness, 1.0, sh);
}`);
      } else {
        helperParts.push(`
fn computeFallOff${suffix}(value: f32, clipSpace: vec2<f32>, frustumEdgeFalloff: f32) -> f32 {
let mask = smoothstep(1.0 - frustumEdgeFalloff, 1.00000012, clamp(dot(clipSpace, clipSpace), 0.0, 1.0));
return mix(value, 1.0, mask);
}
fn computeShadowESM${suffix}(posFromLight: vec4<f32>, depthMetric: f32, darkness: f32, depthScale: f32, frustumEdgeFalloff: f32) -> f32 {
let clipSpace = posFromLight.xyz / posFromLight.w;
let uv = vec2<f32>(0.5 * clipSpace.x + 0.5, 0.5 - 0.5 * clipSpace.y);
if (depthMetric < 0.0 || depthMetric > 1.0 || uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 1.0; }
let shadowPixelDepth = clamp(depthMetric, 0.0, 1.0);
let shadowMapSample = textureSampleLevel(shadowTex${suffix}, shadowSamp${suffix}, uv, 0.0).x;
let esm = 1.0 - clamp(exp(min(87.0, depthScale * shadowPixelDepth)) * shadowMapSample, 0.0, 1.0 - darkness);
return computeFallOff${suffix}(esm, clipSpace.xy, frustumEdgeFalloff);
}`);
      }
    }
    const vertexHelperParts = [];
    for (const slot of shadowLights) {
      const suffix = `_${slot.lightIndex}`;
      vertexHelperParts.push(`struct shadowInfo${suffix}Uniforms { lightMatrix: mat4x4<f32>, depthValues: vec4<f32>, shadowsInfo: vec4<f32> };`);
    }
    return {
      _id: id,
      _varyings: varyings,
      _bindings: bindings,
      _helperFunctions: helperParts.join("\n"),
      _vertexHelperFunctions: vertexHelperParts.join("\n"),
      _vertexSlots: {
        VB: vertexLines.join("\n")
      },
      _fragmentSlots: {
        AD: fragmentLines.join("\n")
      }
    };
  }
  var STAGE_FRAGMENT8, STAGE_VERTEX;
  var init_shadow_fragment_core = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/fragments/shadow-fragment-core.ts"() {
      "use strict";
      STAGE_FRAGMENT8 = 2;
      STAGE_VERTEX = 1;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/shadow/csm-receiver-registry.ts
  function getCsmStdReceiverFactory() {
    return _stdFactory;
  }
  function getCsmPbrReceiverFactory() {
    return _pbrFactory;
  }
  var _stdFactory, _pbrFactory;
  var init_csm_receiver_registry = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shadow/csm-receiver-registry.ts"() {
      "use strict";
      _stdFactory = null;
      _pbrFactory = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-shadow-fragment.ts
  var std_shadow_fragment_exports = {};
  __export(std_shadow_fragment_exports, {
    createStdShadowFragment: () => createStdShadowFragment
  });
  function createStdShadowFragment(shadowLights) {
    const csmSlots = shadowLights.filter((sl) => sl.shadowType === "csm");
    if (csmSlots.length > 0) {
      return getCsmStdReceiverFactory()(csmSlots.map((s) => ({ lightIndex: s.lightIndex })));
    }
    return createShadowFragment("std-shadow", shadowLights);
  }
  var init_std_shadow_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/fragments/std-shadow-fragment.ts"() {
      "use strict";
      init_shadow_fragment_core();
      init_csm_receiver_registry();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/collect-std-bound-textures.ts
  function collectStdBoundTextures(mat) {
    const t = [];
    if (mat.diffuseTexture) {
      t.push(mat.diffuseTexture);
    }
    for (const ext14 of _getStdExts().values()) {
      ext14._textures?.(mat, t);
    }
    return t;
  }
  var init_collect_std_bound_textures = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/collect-std-bound-textures.ts"() {
      "use strict";
      init_standard_flags();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-material.ts
  function _computeStandardMaterialFeatures(m) {
    let f = 0;
    if (m.diffuseTexture) {
      f |= HAS_DIFFUSE_TEXTURE;
      if (m.diffuseCoordIndex === 1) {
        f |= DIFFUSE_USES_UV2;
      }
    }
    if (m.emissiveTexture) {
      f |= HAS_EMISSIVE_TEXTURE;
      if (m.emissiveTexture._sampleType === "depth") {
        f |= HAS_DEPTH_EMISSIVE_TEXTURE;
      }
    }
    if (m.bumpTexture) {
      f |= HAS_BUMP_TEXTURE;
    }
    if (m.specularTexture) {
      f |= HAS_SPECULAR_TEXTURE;
      if (m.specularCoordIndex === 1) {
        f |= SPECULAR_USES_UV2;
      }
    }
    if (m.ambientTexture) {
      f |= HAS_AMBIENT_TEXTURE;
      if (m.ambientCoordIndex === 1) {
        f |= AMBIENT_USES_UV2;
      }
    }
    if (m.lightmapTexture) {
      f |= HAS_LIGHTMAP_TEXTURE;
      if (m.lightmapCoordIndex === 1) {
        f |= LIGHTMAP_USES_UV2;
      }
      if (m.useLightmapAsShadowmap) {
        f |= LIGHTMAP_SHADOWMAP;
      }
      if (m.lightmapTexture.uAng === Math.PI) {
        f |= LIGHTMAP_FLIP_V;
      }
    }
    if (m.opacityTexture) {
      f |= HAS_OPACITY_TEXTURE;
      if (m.opacityFromRGB) {
        f |= OPACITY_FROM_RGB;
      }
    }
    if (!m.backFaceCulling) {
      f |= DOUBLE_SIDED;
    }
    if (m.reflectionTexture) {
      f |= HAS_REFLECTION_TEXTURE;
    }
    if (m.reflectionCubeTexture) {
      f |= HAS_CUBE_REFLECTION;
    }
    if (m.disableLighting) {
      f |= DISABLE_LIGHTING;
    }
    if (m.alpha < 1) {
      f |= MATERIAL_ALPHA_BLEND;
    }
    return f;
  }
  function _standardFeatureKey(features, meshFeatures, variant = "") {
    return variant ? `${features}:${meshFeatures}:${variant}` : `${features}:${meshFeatures}`;
  }
  function _standardShaderVariantKey(shadowLights) {
    return shadowLights.length === 0 ? "" : shadowLights.map((sl) => `${sl.lightIndex}${sl.shadowType === "pcf" ? "p" : "e"}`).join(",");
  }
  var init_standard_material = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-material.ts"() {
      "use strict";
      init_standard_flags();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-template.ts
  function createStandardTemplate(config, esmShadowDepthCode = "") {
    const { _diffuse, _needsUV, _needsUV2, _diffuseUsesUV2, _disableLighting, _noColorOutput, _esmShadowOutput } = config;
    const _baseVertexAttributes = [
      { _name: "position", _type: "vec3<f32>", _gpuFormat: "float32x3", _arrayStride: 12 },
      { _name: "normal", _type: "vec3<f32>", _gpuFormat: "float32x3", _arrayStride: 12 }
    ];
    if (_needsUV) {
      _baseVertexAttributes.push({ _name: "uv", _type: "vec2<f32>", _gpuFormat: "float32x2", _arrayStride: 8 });
    }
    if (_needsUV2) {
      _baseVertexAttributes.push({ _name: "uv2", _type: "vec2<f32>", _gpuFormat: "float32x2", _arrayStride: 8 });
    }
    const _baseVaryings = [
      { _name: "vp", _type: "vec3<f32>" },
      { _name: "vn", _type: "vec3<f32>" },
      { _name: "vf", _type: "vec3<f32>" }
    ];
    if (_needsUV) {
      _baseVaryings.push({ _name: "vu", _type: "vec2<f32>" });
    }
    if (_needsUV2) {
      _baseVaryings.push({ _name: "vv", _type: "vec2<f32>" });
    }
    const _baseMeshUboFields = [{ _name: "world", _type: "mat4x4<f32>" }];
    appendMeshLightUboFields(_baseMeshUboFields);
    const _baseBindings = [{ _name: "mat", _type: { _kind: "uniform-buffer" }, _visibility: STAGE_FRAGMENT9 }];
    if (_diffuse) {
      _baseBindings.push(
        { _name: "dT", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT9 },
        { _name: "dS", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT9 }
      );
    }
    if (_needsUV) {
      _baseBindings.push({ _name: "up", _type: { _kind: "uniform-buffer" }, _visibility: STAGE_VERTEX2 });
    }
    if (_esmShadowOutput) {
      _baseBindings.push({ _name: "shadowParams", _type: { _kind: "uniform-buffer" }, _visibility: STAGE_FRAGMENT9 });
    }
    const uvPassthrough = _needsUV ? `out.vu = uv * up.u.xy + up.u.zw;` : "";
    const uv2Passthrough = _needsUV2 ? `out.vv = uv2;` : "";
    const vertexUboStructs = _needsUV ? `struct upUniforms { u: vec4<f32>, }` : "";
    const _vertexTemplate = `/*SU*/
/*MU*/
@group(1) @binding(0) var<uniform> mesh: MeshUniforms;
${vertexUboStructs}
/*VH*/
/*VD*/
/*VO*/
@vertex fn main(
/*VP*/
) -> VertexOutput {
var out: VertexOutput;
/*VR*/
var finalWorld = mesh.world;
/*VW*/
let worldPos4 = finalWorld * vec4<f32>(position, 1.0);
out.vp = worldPos4.xyz;
let normalWorld = mat3x3<f32>(finalWorld[0].xyz, finalWorld[1].xyz, finalWorld[2].xyz);
out.vn = normalize(normalWorld * normal);
out.clipPos = scene.viewProjection * worldPos4;
out.vf = (scene.view * worldPos4).xyz;
${uvPassthrough}
${uv2Passthrough}
/*VB*/
return out;
}`;
    const lightsStructs = `
struct LightEntry { vLightData: vec4<f32>, vLightDiffuse: vec4<f32>, vLightSpecular: vec4<f32>, vLightDirection: vec4<f32> };
struct lightsUniforms { count: u32, _p0: u32, _p1: u32, _p2: u32, lights: array<LightEntry, ${MAX_LIGHTS}> };
@group(0) @binding(1) var<uniform> lights: lightsUniforms;
`;
    const materialStruct = `
struct matUniforms {
dc: vec4<f32>,
sc: vec4<f32>,
ec: vec3<f32>,
bs: f32,
ac: vec3<f32>,
tl: f32,
ambTexLvl: f32,
lmLvl: f32,
opLvl: f32,
aCut: f32,
rLvl: f32,
rCm: f32,
_0: f32,
_1: f32,
};
`;
    const helpers = _disableLighting ? WGSL_FOG : WGSL_FOG + LIGHTING_FN;
    const doubleSidedEntry = `@fragment fn main(input: FragmentInput)${_noColorOutput ? "" : " -> @location(0) vec4<f32>"} {`;
    const viewDirCode = !_disableLighting ? `let viewDirectionW = normalize(scene.vEyePosition.xyz - input.vp);` : "";
    const normalCode = _disableLighting ? "" : `var normalW = normalize(input.vn);`;
    const opacityCode = `var alpha = mat.dc.a;`;
    const baseColorCode = _diffuse ? `let _ds = textureSample(dT, dS, ${_diffuseUsesUV2 ? "input.vv" : "input.vu"});
if (_ds.a < mat.aCut) { discard; }
var baseColor = _ds.rgb * mat.tl;` : `var baseColor = vec3<f32>(1.0, 1.0, 1.0);`;
    const diffuseColorCode = `let diffuseColor = mat.dc.rgb;`;
    const emissiveCode = `var emissiveContrib = mat.ec;`;
    const specularColorCode = !_disableLighting ? `var specularColor = mat.sc.rgb;` : "";
    let lightingBlock;
    if (!_disableLighting) {
      lightingBlock = `var glossiness = mat.sc.a;
var diffuseBase = vec3<f32>(0.0);
var specularBase = vec3<f32>(0.0);
var shadowFactors = array<f32, ${MAX_LIGHTS}>(${new Array(MAX_LIGHTS).fill("1.0").join(", ")});
var baseAmbientColor = vec3<f32>(1.0, 1.0, 1.0);
var reflectionColor = vec3<f32>(0.0);
let lc = min(mesh.lc, ${MAX_LIGHTS}u);
/*AD*/
for (var li = 0u; li < lc; li++) {
let lightIndex = mli(li);
let r = computeLighting(viewDirectionW, normalW, lights.lights[lightIndex], glossiness, input.vp);
let sf = shadowFactors[lightIndex];
diffuseBase += r[0] * sf;
specularBase += r[1] * sf;
}
let finalDiffuse = clamp(diffuseBase * diffuseColor + emissiveContrib + mat.ac, vec3<f32>(0.0), vec3<f32>(1.0)) * baseColor;
let finalSpecular = specularBase * specularColor;
var color = vec4<f32>(finalDiffuse * baseAmbientColor + finalSpecular + reflectionColor, alpha);`;
    } else {
      lightingBlock = `var color = vec4<f32>(clamp(emissiveContrib * diffuseColor, vec3<f32>(0.0), vec3<f32>(1.0)) * baseColor, alpha);`;
    }
    const _fragmentTemplate = `/*SU*/
${lightsStructs}
${materialStruct}
${_esmShadowOutput ? "struct shadowParamsUniforms { biasAndScale: vec4<f32>, depthValues: vec4<f32>, }" : ""}
/*MU*/
@group(1) @binding(0) var<uniform> mesh: MeshUniforms;
${!_disableLighting ? meshLightIndexWGSL("mesh") : ""}
${helpers}
/*HF*/
/*FB*/
/*FI*/
${doubleSidedEntry}
/*SV*/
${viewDirCode}
${normalCode}
/*AC*/
${opacityCode}
${baseColorCode}
${diffuseColorCode}
${emissiveCode}
${specularColorCode}
/*AT*/
${_noColorOutput ? "return;" : _esmShadowOutput ? esmShadowDepthCode : ""}
${lightingBlock}
/*BC*/
color = vec4<f32>(max(color.rgb, vec3<f32>(0.0)), color.a);
if (scene.vFogInfos.x > 0.0) {
let fog = calcFogFactor(input.vf);
color = vec4<f32>(mix(scene.vFogColor.rgb, color.rgb, fog), color.a);
}
/*BA*/
${_noColorOutput ? "" : "return color;"}
}`;
    return {
      _vertexTemplate,
      _fragmentTemplate,
      _baseMeshUboFields,
      _baseVertexAttributes,
      _baseVaryings,
      _baseBindings
    };
  }
  var STAGE_VERTEX2, STAGE_FRAGMENT9, LIGHTING_FN;
  var init_standard_template = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-template.ts"() {
      "use strict";
      init_wgsl_helpers();
      init_types();
      init_lights_ubo();
      STAGE_VERTEX2 = 1;
      STAGE_FRAGMENT9 = 2;
      LIGHTING_FN = `
fn computeLighting(viewDir: vec3<f32>, N: vec3<f32>, L: LightEntry, g: f32, P: vec3<f32>) -> array<vec3<f32>, 2> {
var lv: vec3<f32>;
var a: f32 = 1.0;
let t = u32(L.vLightData.w);
if (t == 3u) {
let nl = 0.5 + 0.5 * dot(N, normalize(L.vLightData.xyz));
let diff = mix(L.vLightDirection.xyz, L.vLightDiffuse.rgb, nl);
let h = normalize(viewDir + normalize(L.vLightData.xyz));
var s = pow(max(0.0, dot(N, h)), max(1.0, g));
return array<vec3<f32>, 2>(diff, s * L.vLightSpecular.rgb);
}
if (t == 1u) {
lv = normalize(-L.vLightData.xyz);
} else {
let d = L.vLightData.xyz - P;
a = max(0.0, 1.0 - length(d) / L.vLightDiffuse.a);
lv = normalize(d);
if (t == 2u) {
let c = max(0.0, dot(L.vLightDirection.xyz, -lv));
if (c >= L.vLightDirection.w) { a *= max(0.0, pow(c, L.vLightSpecular.a)); } else { a = 0.0; }
}
}
let nl = max(0.0, dot(N, lv));
let diff = nl * L.vLightDiffuse.rgb * a;
let h = normalize(viewDir + lv);
var s = max(0.0, dot(N, h));
s = pow(s, max(1.0, g));
return array<vec3<f32>, 2>(diff, s * L.vLightSpecular.rgb * a);
}
`;
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/shader-composer.ts
  function topoSort(fragments) {
    const byId = /* @__PURE__ */ new Map();
    for (const f of fragments) {
      if (byId.has(f._id)) {
        throw Error();
      }
      byId.set(f._id, f);
    }
    const inDeg = /* @__PURE__ */ new Map();
    const deps = /* @__PURE__ */ new Map();
    for (const f of fragments) {
      if (!inDeg.has(f._id)) {
        inDeg.set(f._id, 0);
      }
      for (const d of f._dependencies ?? []) {
        if (!byId.has(d)) {
          throw Error();
        }
        inDeg.set(f._id, (inDeg.get(f._id) ?? 0) + 1);
        let arr = deps.get(d);
        if (!arr) {
          arr = [];
          deps.set(d, arr);
        }
        arr.push(f._id);
      }
    }
    const q = [];
    for (const [id, d] of inDeg) {
      if (d === 0) {
        q.push(id);
      }
    }
    q.sort();
    const out = [];
    let qi = 0;
    while (qi < q.length) {
      const id = q[qi++];
      out.push(byId.get(id));
      for (const d of deps.get(id) ?? []) {
        const nd = (inDeg.get(d) ?? 1) - 1;
        inDeg.set(d, nd);
        if (nd === 0) {
          let i = qi;
          while (i < q.length && q[i] < d) {
            i++;
          }
          q.splice(i, 0, d);
        }
      }
    }
    if (out.length !== fragments.length) {
      throw Error();
    }
    return out;
  }
  function dedup(base, extra) {
    const seen = /* @__PURE__ */ new Set();
    const all = [];
    for (const v2 of base) {
      if (!seen.has(v2._name)) {
        seen.add(v2._name);
        all.push(v2);
      }
    }
    for (const v2 of extra) {
      if (!seen.has(v2._name)) {
        seen.add(v2._name);
        all.push(v2);
      }
    }
    return all;
  }
  function bglEntry(binding, decl) {
    const e = { binding, visibility: decl._visibility };
    switch (decl._type._kind) {
      case "uniform-buffer":
        e.buffer = { type: "uniform" };
        break;
      case "texture": {
        const def = decl._type._textureType === "texture_depth_2d" ? "depth" : decl._type._textureType === "texture_2d<u32>" ? "uint" : "float";
        e.texture = {
          sampleType: decl._type._sampleType ?? def,
          viewDimension: decl._type._textureType.includes("array") ? "2d-array" : decl._type._textureType.includes("cube") ? "cube" : "2d"
        };
        break;
      }
      case "sampler":
        e.sampler = {
          type: decl._type._samplerType === "sampler_comparison" ? "comparison" : decl._type._samplerType === "sampler_non_filtering" ? "non-filtering" : "filtering"
        };
        break;
      case "storage-texture":
        e.storageTexture = { access: decl._type._access, format: decl._type._format };
        break;
    }
    return e;
  }
  function declWGSL(g, b, d) {
    switch (d._type._kind) {
      case "uniform-buffer":
        return `@group(${g})@binding(${b}) var<uniform> ${d._name}:${d._name}Uniforms;`;
      case "texture":
        return `@group(${g})@binding(${b}) var ${d._name}:${d._type._textureType};`;
      case "sampler":
        return `@group(${g})@binding(${b}) var ${d._name}:${d._type._samplerType === "sampler_non_filtering" ? "sampler" : d._type._samplerType};`;
      case "storage-texture":
        return `@group(${g})@binding(${b}) var ${d._name}:texture_storage_2d<${d._type._format},${d._type._access}>;`;
    }
  }
  function injectSlots(tpl, sorted, key) {
    return tpl.replace(SLOT_RE, (_, slot) => {
      const parts = [];
      for (const f of sorted) {
        const s = f[key];
        if (s?.[slot]) {
          parts.push(s[slot]);
        }
      }
      return parts.join("\n");
    });
  }
  function composeShader(template, fragments) {
    const sorted = topoSort(fragments);
    const fragAttrs = [];
    const fragVaryings = [];
    const helpers = [];
    const vHelpers = [];
    const vBuiltins = [];
    for (const f of sorted) {
      if (f._vertexAttributes) {
        fragAttrs.push(...f._vertexAttributes);
      }
      if (f._varyings) {
        fragVaryings.push(...f._varyings);
      }
      if (f._helperFunctions) {
        helpers.push(f._helperFunctions);
      }
      if (f._vertexHelperFunctions) {
        vHelpers.push(f._vertexHelperFunctions);
      }
      for (const b of f._vertexBuiltins ?? []) {
        vBuiltins.push(`@builtin(${b._builtin}) ${b._name}:${b._type},`);
      }
    }
    const allAttrs = dedup(template._baseVertexAttributes, fragAttrs);
    const inputLines = [];
    const _vertexBufferLayouts = [];
    const groups = /* @__PURE__ */ new Map();
    const firstOfGroup = /* @__PURE__ */ new Map();
    for (let i = 0; i < allAttrs.length; i++) {
      const a = allAttrs[i];
      inputLines.push(`@location(${i}) ${a._name}:${a._type},`);
      if (a._bufferGroup) {
        if (!groups.has(a._bufferGroup)) {
          groups.set(a._bufferGroup, []);
          firstOfGroup.set(a._bufferGroup, a);
        }
        groups.get(a._bufferGroup).push({ loc: i, off: a._offset ?? 0, fmt: a._gpuFormat });
      } else {
        _vertexBufferLayouts.push({
          arrayStride: a._arrayStride,
          stepMode: a._stepMode ?? "vertex",
          attributes: [{ shaderLocation: i, offset: a._offset ?? 0, format: a._gpuFormat }]
        });
      }
    }
    for (const [grp, attrs] of groups) {
      const f = firstOfGroup.get(grp);
      _vertexBufferLayouts.push({
        arrayStride: f._arrayStride,
        stepMode: f._stepMode ?? "vertex",
        attributes: attrs.map((a) => ({ shaderLocation: a.loc, offset: a.off, format: a.fmt }))
      });
    }
    let nextLoc = allAttrs.length;
    for (const f of sorted) {
      if (f._pipelineVertexBuffers) {
        const r = f._pipelineVertexBuffers(nextLoc);
        _vertexBufferLayouts.push(...r._buffers);
        nextLoc = r._nextLoc;
      }
    }
    const allVary = dedup(template._baseVaryings, fragVaryings);
    const varyBody = `@builtin(position) clipPos:vec4f,
` + allVary.map((v2, i) => `@location(${i}) ${v2._name}:${v2._type},`).join("\n");
    const hasMaterialUbo = !!(template._baseMaterialUboFields && template._baseMaterialUboFields.length > 0);
    const meshFields = [...template._baseMeshUboFields];
    const materialFields = hasMaterialUbo ? [...template._baseMaterialUboFields] : [];
    for (const f of sorted) {
      if (f._uboFields?.length) {
        (hasMaterialUbo ? materialFields : meshFields).push(...f._uboFields);
      }
    }
    const _meshUboSpec = computeUboLayout(meshFields);
    const _materialUboSpec = hasMaterialUbo ? computeUboLayout(materialFields) : void 0;
    const meshBGL = [{ binding: 0, visibility: STAGE_VERTEX3 | STAGE_FRAGMENT10, buffer: { type: "uniform" } }];
    if (hasMaterialUbo) {
      meshBGL.push({ binding: 1, visibility: STAGE_FRAGMENT10, buffer: { type: "uniform" } });
    }
    const shadowBGL = [];
    const vDecls = [];
    const fDecls = [];
    let mb = hasMaterialUbo ? 2 : 1, sb = 0;
    function addBinding(d, _isVertex) {
      const isShadow = d._group === "shadow";
      const b = isShadow ? sb++ : mb++;
      const g = isShadow ? 2 : 1;
      (isShadow ? shadowBGL : meshBGL).push(bglEntry(b, d));
      const w = declWGSL(g, b, d);
      if (d._visibility & STAGE_VERTEX3) {
        vDecls.push(w);
      }
      if (d._visibility & STAGE_FRAGMENT10) {
        fDecls.push(w);
      }
    }
    for (const d of template._baseVertexBindings ?? []) {
      addBinding(d, true);
    }
    for (const f of sorted) {
      for (const d of f._vertexBindings ?? []) {
        addBinding(d, true);
      }
    }
    for (const d of template._baseBindings ?? []) {
      addBinding(d, false);
    }
    for (const f of sorted) {
      for (const d of (f._bindings ?? []).filter((b) => (b._group ?? "mesh") === "mesh")) {
        addBinding(d, false);
      }
    }
    for (const f of sorted) {
      for (const d of (f._bindings ?? []).filter((b) => b._group === "shadow")) {
        addBinding(d, false);
      }
    }
    const _fragmentKey = sorted.map((f) => f._id).join("|");
    const vParams = (vBuiltins.length ? vBuiltins.join("\n") + "\n" : "") + inputLines.join("\n");
    const meshStruct = `struct MeshUniforms{
${_meshUboSpec._structBody}
}`;
    const materialStruct = _materialUboSpec ? `
struct MaterialUniforms{
${_materialUboSpec._structBody}
}
@group(1)@binding(1) var<uniform> material:MaterialUniforms;` : "";
    let _vertexWGSL = template._vertexTemplate;
    _vertexWGSL = _vertexWGSL.replace("/*SU*/", SCENE_UBO_WGSL);
    _vertexWGSL = _vertexWGSL.replace("/*MU*/", meshStruct);
    _vertexWGSL = _vertexWGSL.replace("/*VI*/", `struct VertexInput{
${inputLines.join("\n")}
}`);
    _vertexWGSL = _vertexWGSL.replace("/*VO*/", `struct VertexOutput{
${varyBody}
}`);
    _vertexWGSL = _vertexWGSL.replace("/*VD*/", vDecls.join("\n"));
    _vertexWGSL = _vertexWGSL.replace("/*VP*/", vParams);
    _vertexWGSL = _vertexWGSL.replace("/*VH*/", vHelpers.join("\n"));
    _vertexWGSL = injectSlots(_vertexWGSL, sorted, "_vertexSlots");
    let _fragmentWGSL = template._fragmentTemplate;
    _fragmentWGSL = _fragmentWGSL.replace("/*SU*/", SCENE_UBO_WGSL);
    _fragmentWGSL = _fragmentWGSL.replace("/*MU*/", meshStruct + materialStruct);
    _fragmentWGSL = _fragmentWGSL.replace("/*FI*/", `struct FragmentInput{
${varyBody}
}`);
    _fragmentWGSL = _fragmentWGSL.replace("/*HF*/", helpers.join("\n"));
    _fragmentWGSL = _fragmentWGSL.replace("/*FB*/", fDecls.join("\n"));
    _fragmentWGSL = injectSlots(_fragmentWGSL, sorted, "_fragmentSlots");
    const _meshBGLDescriptor = { entries: meshBGL };
    const _shadowBGLDescriptor = shadowBGL.length ? { entries: shadowBGL } : null;
    return {
      _vertexWGSL,
      _fragmentWGSL,
      _meshBGLDescriptor,
      _shadowBGLDescriptor,
      _vertexBufferLayouts,
      _meshUboSpec,
      _materialUboSpec,
      _fragmentKey
    };
  }
  var STAGE_VERTEX3, STAGE_FRAGMENT10, SLOT_RE;
  var init_shader_composer = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/shader-composer.ts"() {
      "use strict";
      init_ubo_layout();
      init_scene_uniforms2();
      STAGE_VERTEX3 = 1;
      STAGE_FRAGMENT10 = 2;
      SLOT_RE = /\/\*([A-Z_0-9]+)\*\//g;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/mesh-features.ts
  function _computeMeshFeatures(mesh, receiveShadows = false) {
    const gpu = mesh._gpu;
    let features = 0;
    if (gpu.tangentBuffer) {
      features |= MSH_HAS_TANGENTS;
    }
    if (mesh.vat) {
      features |= MSH_VAT;
      if (mesh.vat.joints1Buffer) {
        features |= MSH_HAS_SKELETON_8;
      }
    } else if (mesh.skeleton) {
      features |= MSH_HAS_SKELETON;
      if (mesh.skeleton.joints1Buffer) {
        features |= MSH_HAS_SKELETON_8;
      }
    }
    if (mesh.morphTargets) {
      features |= MSH_HAS_MORPH_TARGETS;
    }
    if (mesh.thinInstances) {
      features |= MSH_HAS_THIN_INSTANCES;
      if (mesh.thinInstances.colors) {
        features |= MSH_HAS_INSTANCE_COLOR;
      }
    }
    if (gpu.colorBuffer) {
      features |= MSH_HAS_VERTEX_COLOR;
    }
    if (gpu.uv2Buffer) {
      features |= MSH_HAS_UV2;
    }
    if (receiveShadows) {
      features |= MSH_RECEIVE_SHADOWS;
    }
    return features;
  }
  var MSH_HAS_TANGENTS, MSH_HAS_SKELETON, MSH_HAS_SKELETON_8, MSH_HAS_MORPH_TARGETS, MSH_HAS_THIN_INSTANCES, MSH_HAS_INSTANCE_COLOR, MSH_HAS_VERTEX_COLOR, MSH_HAS_UV2, MSH_RECEIVE_SHADOWS, MSH_VAT;
  var init_mesh_features = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/mesh-features.ts"() {
      "use strict";
      MSH_HAS_TANGENTS = 1 << 0;
      MSH_HAS_SKELETON = 1 << 1;
      MSH_HAS_SKELETON_8 = 1 << 2;
      MSH_HAS_MORPH_TARGETS = 1 << 3;
      MSH_HAS_THIN_INSTANCES = 1 << 4;
      MSH_HAS_INSTANCE_COLOR = 1 << 5;
      MSH_HAS_VERTEX_COLOR = 1 << 6;
      MSH_HAS_UV2 = 1 << 7;
      MSH_RECEIVE_SHADOWS = 1 << 8;
      MSH_VAT = 1 << 9;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-pipeline.ts
  function composeStandardShader(features, _meshFeatures = 0, fragments = [], esmShadowDepthCode = "") {
    const has = (bit) => (features & bit) !== 0;
    const template = createStandardTemplate(
      {
        _diffuse: has(HAS_DIFFUSE_TEXTURE),
        _needsUV: has(NEEDS_UV),
        _needsUV2: has(NEEDS_UV2),
        _diffuseUsesUV2: has(DIFFUSE_USES_UV2),
        _disableLighting: has(DISABLE_LIGHTING),
        _noColorOutput: has(NO_COLOR_OUTPUT),
        _esmShadowOutput: has(ESM_SHADOW_OUTPUT)
      },
      esmShadowDepthCode
    );
    return composeShader(template, fragments);
  }
  function getComposedCache() {
    if (!_composedCache) {
      _composedCache = /* @__PURE__ */ new Map();
    }
    return _composedCache;
  }
  function ensureDevice(engine) {
    if (_cachedDevice3 !== engine._device) {
      _bindingsCache.clear();
      _composedCache?.clear();
      clearSceneBGLCache();
      _cachedDevice3 = engine._device;
    }
  }
  function clearStandardPipelineCache() {
    _bindingsCache.clear();
    _composedCache?.clear();
    clearSceneBGLCache();
    _cachedDevice3 = null;
  }
  function getOrCreateStandardBindings(engine, features, meshFeatures, fragments = [], shaderKey = "", esmShadowDepthCode = "", stencil = null) {
    ensureDevice(engine);
    const resolvedStencil = stencil && _stencilResolver ? _stencilResolver(stencil) : null;
    const key = _standardFeatureKey(features, meshFeatures, shaderKey) + (resolvedStencil ? resolvedStencil._key : "");
    const cached = _bindingsCache.get(key);
    if (cached) {
      return cached;
    }
    const cc = getComposedCache();
    let composed = cc.get(key);
    if (!composed) {
      composed = composeStandardShader(features, meshFeatures, fragments, esmShadowDepthCode);
      cc.set(key, composed);
    }
    const device = engine._device;
    const meshBGL = device.createBindGroupLayout(composed._meshBGLDescriptor);
    let shadowBGL = null;
    const hasShadow = (meshFeatures & MSH_RECEIVE_SHADOWS) !== 0;
    if (hasShadow && composed._shadowBGLDescriptor) {
      shadowBGL = device.createBindGroupLayout(composed._shadowBGLDescriptor);
    }
    const bindings = {
      _features: features,
      _meshFeatures: meshFeatures,
      _meshBGL: meshBGL,
      _shadowBGL: shadowBGL,
      _composed: composed,
      _pipelines: /* @__PURE__ */ new Map()
    };
    if (resolvedStencil) {
      bindings._stencil = resolvedStencil._desc;
    }
    _bindingsCache.set(key, bindings);
    return bindings;
  }
  function getOrCreateStandardPipeline(engine, sig, bindings) {
    ensureDevice(engine);
    const key = targetSignatureKey(sig);
    const cached = bindings._pipelines.get(key);
    if (cached) {
      return cached;
    }
    const device = engine._device;
    const composed = bindings._composed;
    const features = bindings._features;
    const sceneBGL = getSceneBindGroupLayout(engine);
    const bgls = bindings._shadowBGL ? [sceneBGL, bindings._meshBGL, bindings._shadowBGL] : [sceneBGL, bindings._meshBGL];
    const vertModule = device.createShaderModule({ code: composed._vertexWGSL });
    const noColorOutput = (features & NO_COLOR_OUTPUT) !== 0;
    const esmShadowOutput = (features & ESM_SHADOW_OUTPUT) !== 0;
    const fragModule = !sig._colorFormat && !noColorOutput ? null : device.createShaderModule({ code: composed._fragmentWGSL });
    const needsBlend = !esmShadowOutput && ((features & HAS_OPACITY_TEXTURE) !== 0 || (features & MATERIAL_ALPHA_BLEND) !== 0);
    const colorTarget = noColorOutput ? null : needsBlend ? {
      format: sig._colorFormat,
      blend: {
        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
      }
    } : { format: sig._colorFormat };
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: bgls }),
      vertex: { module: vertModule, entryPoint: "main", buffers: composed._vertexBufferLayouts },
      ...fragModule ? { fragment: { module: fragModule, entryPoint: "main", targets: colorTarget ? [colorTarget] : [] } } : {},
      ...sig._depthStencilFormat ? {
        depthStencil: {
          format: sig._depthStencilFormat,
          depthCompare: sig._depthCompare ?? REVERSE_DEPTH_COMPARE,
          depthWriteEnabled: noColorOutput || esmShadowOutput || !needsBlend,
          // Pre-baked stencil sub-fields, applied only on a stencil-capable target — the same
          // material in the depth32float shadow/depth pass keeps plain depth state (no stencil → no
          // format mismatch). Gated on `_stencilResolver` (the opt-in hook) so the entire branch —
          // including the `bindings._stencil` reads — folds out of stencil-free bundles.
          ..._stencilResolver && bindings._stencil && sig._depthStencilFormat.includes("stencil") ? bindings._stencil : {}
        }
      } : {},
      multisample: { count: sig._sampleCount },
      primitive: { topology: "triangle-list", cullMode: features & DOUBLE_SIDED ? "none" : "back", frontFace: "ccw" }
    });
    bindings._pipelines.set(key, pipeline);
    return pipeline;
  }
  function createStandardMeshBindGroup(engine, bindings, meshUBO, materialUBO, material) {
    const device = engine._device;
    const features = bindings._features;
    const needsUV = (features & NEEDS_UV) !== 0;
    const hasDiffuseTex = (features & HAS_DIFFUSE_TEXTURE) !== 0;
    const esmShadowOutput = (features & ESM_SHADOW_OUTPUT) !== 0;
    let nextBinding = 0;
    const entries = [
      { binding: nextBinding++, resource: { buffer: meshUBO } },
      { binding: nextBinding++, resource: { buffer: materialUBO } }
    ];
    if (hasDiffuseTex) {
      const tex = material.diffuseTexture;
      entries.push({ binding: nextBinding++, resource: tex.texture.createView() }, { binding: nextBinding++, resource: tex.sampler });
    }
    if (needsUV) {
      const uvData = new F32(4);
      const scaleX = material.uvScale[0];
      let scaleY = material.uvScale[1];
      let offsetY = 0;
      if (material.diffuseTexture?.invertY) {
        offsetY = scaleY;
        scaleY = -scaleY;
      }
      uvData[0] = scaleX;
      uvData[1] = scaleY;
      uvData[2] = 0;
      uvData[3] = offsetY;
      entries.push({ binding: nextBinding++, resource: { buffer: createUniformBuffer(engine, uvData) } });
    }
    if (esmShadowOutput) {
      entries.push({
        binding: nextBinding++,
        resource: { buffer: material._esmShadowParamsUBO }
      });
    }
    const sortedExts = _getStdExtsSorted();
    for (const ext14 of sortedExts) {
      if (features & ext14._feature && ext14._bind) {
        nextBinding = ext14._bind(material, entries, nextBinding);
      }
    }
    return device.createBindGroup({ layout: bindings._meshBGL, entries });
  }
  function writeStdMaterialData(data, mat, textureLevel) {
    const { diffuseColor: dc, specularColor: sc, emissiveColor: ec, ambientColor: ac } = mat;
    data[0] = dc[0];
    data[1] = dc[1];
    data[2] = dc[2];
    data[3] = mat.alpha;
    data[4] = sc[0];
    data[5] = sc[1];
    data[6] = sc[2];
    data[7] = mat.specularPower;
    data[8] = ec[0];
    data[9] = ec[1];
    data[10] = ec[2];
    data[11] = 1 / mat.bumpLevel;
    data[12] = ac[0];
    data[13] = ac[1];
    data[14] = ac[2];
    data[15] = textureLevel;
    data[16] = mat.ambientTexLevel;
    data[17] = mat.lightmapLevel;
    data[18] = mat.opacityLevel;
    data[19] = mat.alphaCutOff;
    data[20] = mat.reflectionLevel;
    data[21] = mat.reflectionCoordMode;
  }
  var _stencilResolver, _bindingsCache, _composedCache, _cachedDevice3;
  var init_standard_pipeline = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-pipeline.ts"() {
      "use strict";
      init_typed_arrays();
      init_standard_material();
      init_scene_helpers();
      init_standard_template();
      init_shader_composer();
      init_gpu_buffers();
      init_render_target();
      init_standard_flags();
      init_mesh_features();
      _stencilResolver = null;
      _bindingsCache = /* @__PURE__ */ new Map();
      _composedCache = null;
      _cachedDevice3 = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-renderable.ts
  var standard_renderable_exports = {};
  __export(standard_renderable_exports, {
    buildStandardMeshRenderables: () => buildStandardMeshRenderables
  });
  function buildStandardMeshRenderables(scene, meshes, factories) {
    const engine = scene.surface.engine;
    const device = engine._device;
    const { tiSync, tiFragment, shadowFragment, cull } = factories;
    const shadowLights = [];
    for (let i = 0; i < scene.lights.length; i++) {
      const sg = scene.lights[i].shadowGenerator;
      if (sg) {
        shadowLights.push({ lightIndex: i, shadowType: sg._shadowType, gen: sg });
      }
    }
    const hasSomeShadows = shadowLights.length > 0;
    const shadowBGCache = /* @__PURE__ */ new Map();
    const rebuildSingle = (s, mesh, materialOverride) => {
      const mat = materialOverride ?? mesh.material;
      const renderFeatures = mat._renderFeatures ?? (mat._renderFeatures = { features: _computeStandardMaterialFeatures(mat) });
      const isOverride = materialOverride != null;
      const features = renderFeatures.features;
      const shadowOutput = (features & (NO_COLOR_OUTPUT | ESM_SHADOW_OUTPUT)) !== 0;
      const receiveShadows = !shadowOutput && mesh.receiveShadows && hasSomeShadows;
      const meshFeatures = _computeMeshFeatures(mesh, receiveShadows);
      const frags = [];
      for (const ext14 of _getStdExts().values()) {
        if (features & ext14._feature) {
          const f = ext14._frag(features);
          if (f) {
            frags.push(f);
          }
        }
      }
      let shaderKey = "";
      if (meshFeatures & MSH_RECEIVE_SHADOWS && shadowFragment) {
        const slots = shadowLights.map((sl) => ({ lightIndex: sl.lightIndex, shadowType: sl.shadowType }));
        shaderKey = _standardShaderVariantKey(slots);
        frags.push(shadowFragment(slots));
      }
      if (meshFeatures & MSH_HAS_THIN_INSTANCES && tiFragment) {
        const hasColor = !!(meshFeatures & MSH_HAS_INSTANCE_COLOR);
        const tiFrag = tiFragment(hasColor);
        if (hasColor) {
          const { _fragmentSlots, ...rest } = tiFrag;
          frags.push({
            ...rest,
            _fragmentSlots: {
              BC: `color = vec4<f32>(color.rgb * input.vInstanceColor.rgb, color.a * input.vInstanceColor.a);`
            }
          });
        } else {
          frags.push(tiFrag);
        }
      }
      const esmShadowDepthCode = (features & ESM_SHADOW_OUTPUT) !== 0 ? mat._esmShadowDepthCode : "";
      const bindings = getOrCreateStandardBindings(engine, features, meshFeatures, frags, shaderKey, esmShadowDepthCode, mat.stencil ?? null);
      const meshShadowGens = receiveShadows ? shadowLights.map((sl) => sl.gen) : [];
      const meshUboData = new F32(bindings._composed._meshUboSpec._totalBytes / 4);
      const _packMeshWorld = engine._makePackMeshWorld?.(s) ?? packMat4IntoF32;
      _packMeshWorld(meshUboData, mesh.worldMatrix, 0, 0);
      writeMeshLightSelection(mesh, s.lights, meshUboData);
      const meshUBO = createUniformBuffer(engine, meshUboData);
      const textureLevel = (features & NEEDS_UV) !== 0 ? 1 : 0;
      const matData = new F32(24);
      writeStdMaterialData(matData, mat, textureLevel);
      const materialUBO = createUniformBuffer(engine, matData);
      const meshBindGroup = createStandardMeshBindGroup(engine, bindings, meshUBO, materialUBO, mat);
      let shadowBindGroup = null;
      if (meshShadowGens.length > 0 && bindings._shadowBGL) {
        let cached = shadowBGCache.get(bindings._shadowBGL);
        if (!cached) {
          const entries = [];
          let b = 0;
          for (const sg of meshShadowGens) {
            entries.push({ binding: b++, resource: sg._depthTexture.createView() });
            entries.push({ binding: b++, resource: sg._depthSampler });
            entries.push({ binding: b++, resource: { buffer: sg._shadowUBO } });
          }
          cached = device.createBindGroup({ layout: bindings._shadowBGL, entries });
          shadowBGCache.set(bindings._shadowBGL, cached);
        }
        shadowBindGroup = cached;
      }
      const needsUV = (features & NEEDS_UV) !== 0;
      const needsUV2 = (features & NEEDS_UV2) !== 0;
      const hasThinInstances = (meshFeatures & MSH_HAS_THIN_INSTANCES) !== 0;
      const hasInstanceColor = (meshFeatures & MSH_HAS_INSTANCE_COLOR) !== 0;
      const isTransparent = !shadowOutput && ((features & HAS_OPACITY_TEXTURE) !== 0 || mat.alpha < 1);
      const boundTextures = collectStdBoundTextures(mat);
      for (const t of boundTextures) {
        acquireTexture(t);
      }
      s._meshDisposables.set(mesh, [
        () => {
          for (const t of boundTextures) {
            releaseTexture(t);
          }
        }
      ]);
      let _lastWorldVersion = mesh.worldMatrixVersion;
      let _lastLightsCount = s.lights.length;
      const sortCenter = [mesh.worldMatrix[12], mesh.worldMatrix[13], mesh.worldMatrix[14]];
      const _baseUpdate = () => {
        const worldVersion = mesh.worldMatrixVersion;
        if (worldVersion !== _lastWorldVersion || s.lights.length !== _lastLightsCount) {
          sortCenter[0] = mesh.worldMatrix[12];
          sortCenter[1] = mesh.worldMatrix[13];
          sortCenter[2] = mesh.worldMatrix[14];
          _packMeshWorld(meshUboData, mesh.worldMatrix, 0, 0);
          writeMeshLightSelection(mesh, s.lights, meshUboData);
          device.queue.writeBuffer(meshUBO, 0, meshUboData);
          _lastWorldVersion = worldVersion;
          _lastLightsCount = s.lights.length;
        }
        const uboVersion = mat._uboVersion;
        if (uboVersion !== _lastUboVersion) {
          _lastUboVersion = uboVersion;
          _stdMatScratch.fill(0);
          writeStdMaterialData(_stdMatScratch, mat, textureLevel);
          device.queue.writeBuffer(materialUBO, 0, _stdMatScratch.buffer, 0, 96);
        }
      };
      const _invalidate = () => {
        _lastWorldVersion = -1;
      };
      const update = engine._wrapRenderableForFO?.(_baseUpdate, s, _invalidate) ?? _baseUpdate;
      const draw = (pass, cullBinding) => {
        if (!isOverride && mesh.material !== mat) {
          return 0;
        }
        const g = mesh._gpu;
        let slot = 0;
        const vb = g._vbLayout;
        pass.setVertexBuffer(slot++, g.positionBuffer, vb?._p?._offset);
        pass.setVertexBuffer(slot++, g.normalBuffer, vb?._n?._offset);
        if (needsUV) {
          pass.setVertexBuffer(slot++, g.uvBuffer, vb?._u?._offset);
        }
        if (needsUV2 && g.uv2Buffer) {
          pass.setVertexBuffer(slot++, g.uv2Buffer, vb?._u2?._offset);
        }
        const ti = hasThinInstances ? mesh.thinInstances : null;
        if (ti && tiSync) {
          slot = tiSync(engine, ti, pass, slot, hasInstanceColor, cullBinding?.cullDrawBufs);
        }
        pass.setIndexBuffer(g.indexBuffer, g.indexFormat);
        pass.setBindGroup(1, meshBindGroup);
        if (receiveShadows && shadowBindGroup) {
          pass.setBindGroup(2, shadowBindGroup);
        }
        if (cullBinding) {
          cullBinding.draw(pass, g.indexCount, ti.count);
        } else if (ti && ti.count > 0) {
          pass.drawIndexed(g.indexCount, ti.count);
        } else {
          pass.drawIndexed(g.indexCount);
        }
        return 1;
      };
      const r = {
        order: mesh.renderOrder ?? (isTransparent ? 200 : 100),
        isTransparent,
        mesh,
        bind(eng, sig) {
          const pipeline = getOrCreateStandardPipeline(eng, sig, bindings);
          const cb = cull?.tryBind(r, s, mesh, engine, hasInstanceColor, isTransparent, update);
          return {
            renderable: r,
            pipeline,
            update: cb ? cb.update : update,
            draw: (pass) => draw(pass, cb)
          };
        }
      };
      r._worldCenter = sortCenter;
      let _lastUboVersion = mat._uboVersion;
      return r;
    };
    const renderables = meshes.map((m) => rebuildSingle(scene, m));
    scene._disposables.push(
      () => clearStandardPipelineCache(),
      () => clearSamplerCache(engine)
    );
    return { renderables, rebuildSingle };
  }
  var _stdMatScratch;
  var init_standard_renderable = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-renderable.ts"() {
      "use strict";
      init_typed_arrays();
      init_collect_std_bound_textures();
      init_standard_material();
      init_gpu_pool();
      init_gpu_buffers();
      init_standard_pipeline();
      init_standard_flags();
      init_lights_ubo();
      init_mesh_features();
      init_pack_mat4_into_f32();
      _stdMatScratch = new F32(24);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-group-builder.ts
  var _STD_MAT_EXTS, standardGroupBuilder;
  var init_standard_group_builder = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-group-builder.ts"() {
      "use strict";
      init_standard_flags();
      _STD_MAT_EXTS = [
        ["bumpTexture", () => Promise.resolve().then(() => (init_normal_map_fragment(), normal_map_fragment_exports)), "bumpStdExt"],
        ["emissiveTexture", () => Promise.resolve().then(() => (init_std_emissive_fragment(), std_emissive_fragment_exports)), "stdEmissiveExt"],
        ["specularTexture", () => Promise.resolve().then(() => (init_std_specular_fragment(), std_specular_fragment_exports)), "stdSpecularExt"],
        ["ambientTexture", () => Promise.resolve().then(() => (init_std_ambient_fragment(), std_ambient_fragment_exports)), "stdAmbientExt"],
        ["lightmapTexture", () => Promise.resolve().then(() => (init_std_lightmap_fragment(), std_lightmap_fragment_exports)), "stdLightmapExt"],
        ["opacityTexture", () => Promise.resolve().then(() => (init_std_opacity_fragment(), std_opacity_fragment_exports)), "stdOpacityExt"],
        ["reflectionTexture", () => Promise.resolve().then(() => (init_std_reflection_fragment(), std_reflection_fragment_exports)), "stdReflectionExt"],
        ["reflectionCubeTexture", () => Promise.resolve().then(() => (init_std_cube_reflection_fragment(), std_cube_reflection_fragment_exports)), "stdCubeReflectionExt"]
      ];
      standardGroupBuilder = async (scene, meshes) => {
        const hasTI = meshes.some((m) => !!m.thinInstances);
        const hasCulling = meshes.some((m) => !!m.thinInstances?._gpuCullingEnabled);
        const hasShadow = meshes.some((m) => m.receiveShadows) && scene.lights.some((l) => !!l.shadowGenerator);
        let tiSync;
        let tiFragment;
        let shadowFragment;
        let cull;
        const imports = [];
        if (hasTI) {
          imports.push(
            Promise.resolve().then(() => (init_thin_instance_gpu(), thin_instance_gpu_exports)).then((m) => {
              tiSync = m.syncThinInstanceBuffers;
            }),
            Promise.resolve().then(() => (init_thin_instance_fragment(), thin_instance_fragment_exports)).then((m) => {
              tiFragment = m.createThinInstanceFragment;
            })
          );
          if (hasCulling) {
            imports.push(
              Promise.resolve().then(() => (init_thin_instance_cull_binding(), thin_instance_cull_binding_exports)).then((m) => {
                cull = m;
              })
            );
          }
        }
        if (hasShadow) {
          imports.push(
            Promise.resolve().then(() => (init_std_shadow_fragment(), std_shadow_fragment_exports)).then((m) => {
              shadowFragment = m.createStdShadowFragment;
            })
          );
        }
        for (const [prop, load, key] of _STD_MAT_EXTS) {
          if (meshes.some((m) => !!m.material[prop])) {
            imports.push(load().then((mod) => _registerStdExt(mod[key])));
          }
        }
        if (imports.length > 0) {
          await Promise.all(imports);
        }
        const renderableMod = await Promise.resolve().then(() => (init_standard_renderable(), standard_renderable_exports));
        const result = renderableMod.buildStandardMeshRenderables(scene, meshes, { tiSync, tiFragment, shadowFragment, cull });
        standardGroupBuilder._rebuildSingle = result.rebuildSingle;
        return result;
      };
      standardGroupBuilder._materialFamily = "standard";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/create-standard-material.ts
  function createStandardMaterial() {
    return {
      diffuseColor: [1, 1, 1],
      alpha: 1,
      specularColor: [1, 1, 1],
      specularPower: 64,
      emissiveColor: [0, 0, 0],
      ambientColor: [0, 0, 0],
      diffuseTexture: null,
      diffuseCoordIndex: 0,
      emissiveTexture: null,
      bumpTexture: null,
      bumpLevel: 1,
      specularTexture: null,
      specularCoordIndex: 0,
      ambientTexture: null,
      ambientTexLevel: 1,
      ambientCoordIndex: 0,
      lightmapTexture: null,
      lightmapLevel: 1,
      lightmapCoordIndex: 1,
      useLightmapAsShadowmap: false,
      opacityTexture: null,
      opacityLevel: 1,
      opacityFromRGB: false,
      alphaCutOff: 0,
      reflectionTexture: null,
      reflectionCubeTexture: null,
      reflectionLevel: 1,
      reflectionCoordMode: 1,
      uvScale: [1, 1],
      backFaceCulling: true,
      disableLighting: false,
      _buildGroup: standardGroupBuilder,
      _uboVersion: 0
    };
  }
  var init_create_standard_material = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/standard/create-standard-material.ts"() {
      "use strict";
      init_standard_group_builder();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-pipeline.ts
  function ensureDevice2(engine) {
    if (_cachedDevice4 !== engine._device) {
      _bindingsCache2.clear();
      _cachedDevice4 = engine._device;
    }
  }
  function clearPbrPipelineCache() {
    _bindingsCache2.clear();
    _cachedDevice4 = null;
  }
  function getOrCreatePbrBindings(engine, features, features2, meshFeatures, sceneFeatures, composed, shaderKey = "", stencil = null) {
    ensureDevice2(engine);
    const resolvedStencil = stencil && _stencilResolver2 ? _stencilResolver2(stencil) : null;
    const key = `${features}:${features2}:${meshFeatures}:${sceneFeatures}:${shaderKey}${resolvedStencil ? resolvedStencil._key : ""}`;
    const cached = _bindingsCache2.get(key);
    if (cached) {
      return cached;
    }
    const device = engine._device;
    const meshBGL = device.createBindGroupLayout(composed._meshBGLDescriptor);
    let shadowBGL = null;
    if (composed._shadowBGLDescriptor) {
      shadowBGL = device.createBindGroupLayout(composed._shadowBGLDescriptor);
    }
    const bindings = {
      _features: features,
      _features2: features2,
      _meshFeatures: meshFeatures,
      _meshBGL: meshBGL,
      _shadowBGL: shadowBGL,
      _composed: composed,
      _pipelines: /* @__PURE__ */ new Map()
    };
    if (resolvedStencil) {
      bindings._stencil = resolvedStencil._desc;
    }
    _bindingsCache2.set(key, bindings);
    return bindings;
  }
  function getOrCreatePbrPipeline(engine, sig, bindings) {
    ensureDevice2(engine);
    const key = targetSignatureKey(sig);
    const cached = bindings._pipelines.get(key);
    if (cached) {
      return cached;
    }
    const device = engine._device;
    const { _features: features, _features2: features2, _composed: composed } = bindings;
    const esmShadowOutput = (features2 & PBR2_ESM_SHADOW_OUTPUT) !== 0;
    const hasAlpha = !esmShadowOutput && (features & PBR_HAS_ALPHA_BLEND) !== 0;
    const hasDoubleSided = (features & PBR_HAS_DOUBLE_SIDED) !== 0;
    const sceneBGL = getSceneBindGroupLayout(engine);
    const bgls = bindings._shadowBGL ? [sceneBGL, bindings._meshBGL, bindings._shadowBGL] : [sceneBGL, bindings._meshBGL];
    const vertModule = device.createShaderModule({ code: composed._vertexWGSL });
    const noColorOutput = (features2 & PBR2_NO_COLOR_OUTPUT) !== 0;
    const fragModule = !sig._colorFormat && !noColorOutput ? null : device.createShaderModule({ code: composed._fragmentWGSL });
    const fragTarget = noColorOutput ? null : { format: sig._colorFormat, writeMask: CW.ALL };
    if (hasAlpha && fragTarget) {
      fragTarget.blend = {
        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one", operation: "add" }
      };
    }
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: bgls }),
      vertex: { module: vertModule, entryPoint: "main", buffers: composed._vertexBufferLayouts },
      ...fragModule ? { fragment: { module: fragModule, entryPoint: "main", targets: fragTarget ? [fragTarget] : [] } } : {},
      ...sig._depthStencilFormat ? {
        depthStencil: {
          format: sig._depthStencilFormat,
          depthCompare: sig._depthCompare ?? REVERSE_DEPTH_COMPARE,
          depthWriteEnabled: noColorOutput || esmShadowOutput || !hasAlpha,
          // Pre-baked stencil sub-fields, applied only on a stencil-capable target — the same
          // material in the depth32float shadow/depth pass keeps plain depth state (no stencil → no
          // format mismatch). Gated on `_stencilResolver` (the opt-in hook) so the entire branch —
          // including the `bindings._stencil` reads — folds out of stencil-free bundles.
          ..._stencilResolver2 && bindings._stencil && sig._depthStencilFormat.includes("stencil") ? bindings._stencil : {}
        }
      } : {},
      multisample: { count: sig._sampleCount },
      primitive: { topology: "triangle-list", cullMode: hasDoubleSided ? "none" : "back", frontFace: "ccw" }
    });
    bindings._pipelines.set(key, pipeline);
    return pipeline;
  }
  function createPbrMeshBindGroup(engine, bindings, composed, meshUBO, materialUBO, material, env, meshCtx, refractionTexture) {
    const device = engine._device;
    const features = bindings._features;
    const features2 = bindings._features2;
    const meshFeatures = bindings._meshFeatures;
    const hasNormal = (features & PBR_HAS_NORMAL_MAP) !== 0 && (meshFeatures & MSH_HAS_TANGENTS) !== 0;
    const hasCotangentNormal = (features & PBR_HAS_NORMAL_MAP) !== 0 && (meshFeatures & MSH_HAS_TANGENTS) === 0;
    const hasAnyNormal = hasNormal || hasCotangentNormal;
    const hasEmissive = (features & PBR_HAS_EMISSIVE) !== 0;
    const hasSpecGloss = (features & PBR_HAS_SPEC_GLOSS) !== 0;
    const esmShadowOutput = (features2 & PBR2_ESM_SHADOW_OUTPUT) !== 0;
    const entries = [];
    let b = 0;
    const addTex = (t) => {
      entries.push({ binding: b++, resource: t.view });
      entries.push({ binding: b++, resource: t.sampler });
    };
    const ctx = {
      _engine: engine,
      _features: features,
      _features2: features2,
      _meshFeatures: meshFeatures,
      _material: material,
      _mesh: meshCtx ?? void 0,
      _env: env,
      _refractionTexture: refractionTexture
    };
    const sortedExts = _getPbrExtsSorted();
    const fragIds = composed._fragmentKey ? composed._fragmentKey.split("|").filter((s) => s.length > 0) : [];
    entries.push({ binding: b++, resource: { buffer: meshUBO } });
    entries.push({ binding: b++, resource: { buffer: materialUBO } });
    for (const ext14 of sortedExts) {
      if (ext14.phase === "vertex" && ext14.bind) {
        b = ext14.bind(ctx, entries, b);
      }
    }
    addTex(material.baseColorTexture ?? _pbrFallbackResolver?.(engine));
    if (hasAnyNormal) {
      addTex(material.normalTexture);
    }
    addTex(material.ormTexture ?? _pbrFallbackResolver?.(engine));
    if ((features2 & PBR2_HAS_UV2) !== 0 && (meshFeatures & MSH_HAS_UV2) !== 0 && material.occlusionTexture) {
      addTex(material.occlusionTexture);
    }
    if (hasEmissive) {
      addTex(material.emissiveTexture);
    }
    if (hasSpecGloss) {
      addTex(material.specGlossTexture);
    }
    if (esmShadowOutput) {
      entries.push({
        binding: b++,
        resource: { buffer: material._esmShadowParamsUBO }
      });
    }
    const seenExts = [];
    for (const fid of fragIds) {
      const ext14 = sortedExts.find((e) => e.id === fid || fid.startsWith(e.id + "-"));
      if (!ext14 || ext14.phase === "vertex" || !ext14.bind || seenExts.includes(ext14)) {
        continue;
      }
      seenExts.push(ext14);
      b = ext14.bind(ctx, entries, b);
    }
    return device.createBindGroup({ layout: bindings._meshBGL, entries });
  }
  var _stencilResolver2, _pbrFallbackResolver, _bindingsCache2, _cachedDevice4;
  var init_pbr_pipeline = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-pipeline.ts"() {
      "use strict";
      init_gpu_flags();
      init_pbr_flags();
      init_pbr_flags();
      init_mesh_features();
      init_render_target();
      init_scene_helpers();
      _stencilResolver2 = null;
      _pbrFallbackResolver = null;
      _bindingsCache2 = /* @__PURE__ */ new Map();
      _cachedDevice4 = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-template.ts
  function createPbrTemplate(config) {
    const {
      _hasSingleLight = false,
      _hasMultiLight = false,
      _singleLightWGSL = "",
      _singleLightBlock = "",
      _multiLightWGSL = "",
      _multiLightLoop = "",
      _normalMode = "none",
      _hasEmissiveTexture = false,
      _hasSpecGloss = false,
      _hasDoubleSided = false,
      _hasTonemap = false,
      _fogHelper = "",
      _fogBlock = "",
      _acesHelpers = "",
      _acesTonemapCall = "",
      _hasAlphaBlend = false,
      _hasSpecularAA = false,
      _hasGammaAlbedo = false,
      _hasBaseColorFactor = false,
      _hasMorph = false,
      _hasOcclusion = false,
      _hasEmissiveColor = false,
      _hasReflectanceExt = false,
      _hasIbl = false,
      _hasAnisotropy = false,
      _anisoBrdfFunctions = "",
      _anisoTBBlock = "",
      _ext,
      _noColorOutput = false,
      _esmShadowOutput = false,
      _esmShadowDepthCode = "",
      _vbStrides
    } = config;
    const hasNormal = _normalMode === "tangent";
    const hasCotangentNormal = _normalMode === "cotangent";
    const hasAnyNormal = hasNormal || hasCotangentNormal;
    const _baseVertexAttributes = [
      { _name: "position", _type: "vec3<f32>", _gpuFormat: "float32x3", _arrayStride: _vbStrides?._p?._stride ?? 12, _offset: _vbStrides?._p?._offset ?? 0 },
      { _name: "normal", _type: "vec3<f32>", _gpuFormat: "float32x3", _arrayStride: _vbStrides?._n?._stride ?? 12, _offset: _vbStrides?._n?._offset ?? 0 }
    ];
    if (hasNormal) {
      _baseVertexAttributes.push({
        _name: "tangent",
        _type: "vec4<f32>",
        _gpuFormat: "float32x4",
        _arrayStride: _vbStrides?._t?._stride ?? 16,
        _offset: _vbStrides?._t?._offset ?? 0
      });
    }
    _baseVertexAttributes.push({ _name: "uv", _type: "vec2<f32>", _gpuFormat: "float32x2", _arrayStride: _vbStrides?._u?._stride ?? 8, _offset: _vbStrides?._u?._offset ?? 0 });
    if (_ext) {
      _baseVertexAttributes.push(..._ext.extraVertexAttributes);
    }
    const _baseVaryings = [
      { _name: "worldPos", _type: "vec3<f32>" },
      { _name: "worldNormal", _type: "vec3<f32>" }
    ];
    if (hasNormal) {
      _baseVaryings.push({ _name: "worldTangent", _type: "vec3<f32>" }, { _name: "worldBitangent", _type: "vec3<f32>" });
    }
    _baseVaryings.push({ _name: "uv", _type: "vec2<f32>" });
    if (_ext) {
      _baseVaryings.push(..._ext.extraVaryings);
    }
    const _baseMeshUboFields = [{ _name: "world", _type: "mat4x4<f32>" }];
    appendMeshLightUboFields(_baseMeshUboFields);
    const _baseMaterialUboFields = [
      { _name: "environmentIntensity", _type: "f32" },
      { _name: "directIntensity", _type: "f32" },
      { _name: "reflectance", _type: "f32" },
      { _name: "materialAlpha", _type: "f32" },
      ..._hasBaseColorFactor ? [{ _name: "baseColorFactor", _type: "vec4<f32>" }] : [],
      // glTF metallicFactor / roughnessFactor (default 1.0) — applied over MR texture channels.
      { _name: "metallicFactor", _type: "f32" },
      { _name: "roughnessFactor", _type: "f32" },
      { _name: "normalScale", _type: "f32" },
      { _name: "lightFalloffMode", _type: "f32" },
      // Anisotropy UBO field stays on the base template because anisotropy is
      // template-only (no ShaderFragment) — the anisotropyExt just writes its
      // slice through the unified ext.writeUbo hook.
      ..._hasAnisotropy ? [{ _name: "anisotropyParams", _type: "vec4<f32>" }] : [],
      // ── Extension fields (per-texture UV transforms, etc.) ─
      ..._ext ? _ext.extraMaterialUboFields : []
    ];
    const tex2d = (name, sampler) => [
      { _name: name, _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT11 },
      { _name: sampler, _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT11 }
    ];
    const _baseBindings = tex2d("baseColorTexture", "baseColorSampler");
    if (hasAnyNormal) {
      _baseBindings.push(...tex2d("normalTexture", "normalSampler_"));
    }
    _baseBindings.push(...tex2d("ormTexture", "ormSampler"));
    if (_ext) {
      _baseBindings.push(..._ext.extraBindings);
    }
    if (_hasEmissiveTexture) {
      _baseBindings.push(...tex2d("emissiveTexture", "emissiveSampler"));
    }
    if (_hasSpecGloss) {
      _baseBindings.push(...tex2d("specGlossTexture", "specGlossSampler"));
    }
    if (_esmShadowOutput) {
      _baseBindings.push({ _name: "shadowParams", _type: { _kind: "uniform-buffer" }, _visibility: STAGE_FRAGMENT11 });
    }
    const posVar = _hasMorph ? "morphedPos" : "position";
    const normVar = _hasMorph ? "morphedNorm" : "normal";
    const tangentBlock = hasNormal ? `let N_local=normalize(${normVar});
let T_local=normalize(tangent.xyz);
let B_local=cross(N_local,T_local)*tangent.w;
out.worldTangent=(finalWorld*vec4<f32>(T_local,0.0)).xyz;
out.worldBitangent=(finalWorld*vec4<f32>(B_local,0.0)).xyz;` : "";
    const _vertexTemplate = `/*SU*/
/*MU*/
@group(1) @binding(0) var<uniform> mesh: MeshUniforms;
/*VH*/
/*VD*/
/*VO*/
@vertex fn main(
/*VP*/
) -> VertexOutput {
var out: VertexOutput;
/*VR*/
var finalWorld = mesh.world;
/*VW*/
let worldPos4 = finalWorld * vec4<f32>(${posVar}, 1.0);
out.worldPos = worldPos4.xyz;
out.clipPos = scene.viewProjection * worldPos4;
out.worldNormal = (finalWorld * vec4<f32>(normalize(${normVar}), 0.0)).xyz;
${tangentBlock}
out.uv = uv;
    ${_ext ? _ext.vertexBodyExtra : ""}/*VB*/
return out;
}`;
    const normalUV = _ext?.uvForNormal ?? "input.uv";
    const normalScaleMod = _ext?.normalScaleMod ?? "";
    const normalRef = _ext?.normalScaleMod ? "scaledNormal" : "normalMapRaw";
    const normalRefCt = _ext?.normalScaleMod ? "scaledNormalCT" : "normalMapSample";
    let normalBlock;
    if (hasNormal) {
      normalBlock = `let normalMapRaw=textureSample(normalTexture,normalSampler_,${normalUV}).rgb*2.0-1.0;
${normalScaleMod}let normalMapNorm=normalize(${normalRef});
let N_geom=normalize(input.worldNormal);
let TBN=mat3x3<f32>(input.worldTangent,input.worldBitangent,input.worldNormal);
var N=normalize(TBN*normalMapNorm);`;
    } else if (hasCotangentNormal) {
      normalBlock = `let normalMapSample=textureSample(normalTexture,normalSampler_,${normalUV}).rgb*2.0-1.0;
${normalScaleMod.replace(/normalMapRaw/g, "normalMapSample").replace(/scaledNormal/g, "scaledNormalCT")}let N_geom=normalize(input.worldNormal);
let dp1=dpdx(input.worldPos);
let dp2=dpdy(input.worldPos);
let duv1=dpdx(${normalUV});
let duv2=dpdy(${normalUV});
let dp2perp=cross(dp2,N_geom);
let dp1perp=cross(N_geom,dp1);
let tangent_ct=dp2perp*duv1.x+dp1perp*duv2.x;
let bitangent_ct=-(dp2perp*duv1.y+dp1perp*duv2.y);
let det=max(dot(tangent_ct,tangent_ct),dot(bitangent_ct,bitangent_ct));
let invmax=select(inverseSqrt(det),0.0,det==0.0);
let cotangentFrame=mat3x3<f32>(tangent_ct*invmax,bitangent_ct*invmax,N_geom);
var N=normalize(cotangentFrame*normalize(${normalRefCt}));`;
    } else {
      normalBlock = `let N_geom=normalize(input.worldNormal);
var N=N_geom;`;
    }
    const anisotropyTBBlock = _hasAnisotropy ? _anisoTBBlock : "";
    const vertexColorMod = _ext?.baseColorMod ?? "";
    const baseColorFactorRgb = _hasBaseColorFactor ? "*material.baseColorFactor.rgb" : "";
    const baseColorFactorAlpha = _hasBaseColorFactor ? "*material.baseColorFactor.a" : "";
    const baseColorDecode = _hasGammaAlbedo ? `var baseColor=pow(baseColorSample.rgb,vec3<f32>(2.2))${baseColorFactorRgb};
var alpha=baseColorSample.a${baseColorFactorAlpha};${vertexColorMod}` : `var baseColor=baseColorSample.rgb${baseColorFactorRgb};
var alpha=baseColorSample.a${baseColorFactorAlpha};${vertexColorMod}`;
    const specGlossUV = _ext?.uvForSpecGloss ?? "input.uv";
    const roughnessMetallic = _hasSpecGloss ? `let specGloss=textureSample(specGlossTexture,specGlossSampler,${specGlossUV});
let roughness=clamp(1.0-specGloss.a,0.0,1.0);
let metallic=0.0;` : `let roughness=clamp(orm.g*material.roughnessFactor,0.0,1.0);
let metallic=orm.b*material.metallicFactor;`;
    const emissiveUV = _ext?.uvForEmissive ?? "input.uv";
    const emissiveDefault = _hasEmissiveColor || !_hasEmissiveTexture ? `var emissive:vec3f;` : `let emissive=textureSample(emissiveTexture,emissiveSampler,${emissiveUV}).rgb;`;
    const occlusionDefault = _hasReflectanceExt ? `` : _ext?.occlusionOverride ? _ext.occlusionOverride : _hasOcclusion ? `let occlusion=orm.r;` : `let occlusion=1.0;`;
    const f0Default = _hasReflectanceExt ? `` : _hasSpecGloss ? `var colorF0=specGloss.rgb;
let colorF90=vec3<f32>(1.0);
let maxSpecular=max(colorF0.r,max(colorF0.g,colorF0.b));
let surfaceAlbedo=baseColor*(1.0-maxSpecular);` : `let dielectricF0=material.reflectance;
var colorF0=mix(vec3<f32>(dielectricF0),baseColor,metallic);
let colorF90=vec3<f32>(1.0);
let surfaceAlbedo=baseColor*(1.0-dielectricF0)*(1.0-metallic);`;
    const specularAABlock = _hasSpecularAA || hasAnyNormal ? `var AA_factor_x=0.0;
var AA_factor_y=0.0;
{let nDfdx_AA=dpdx(N);
let nDfdy_AA=dpdy(N);
let slopeSquare_AA=max(dot(nDfdx_AA,nDfdx_AA),dot(nDfdy_AA,nDfdy_AA));
AA_factor_x=pow(saturate(slopeSquare_AA),0.333);
AA_factor_y=sqrt(slopeSquare_AA)*0.75;
alphaG+=AA_factor_y;}` : `var AA_factor_x=0.0;
var AA_factor_y=0.0;`;
    const directLightBlock = _hasMultiLight ? _multiLightLoop : _hasSingleLight ? _singleLightBlock : `var directDiffuse=vec3<f32>(0.0);
var directSpecular=vec3<f32>(0.0);
/*BL*/`;
    const useAces = _hasTonemap && _acesTonemapCall !== "";
    const acesBlock = useAces ? _acesHelpers : "";
    const tonemapBlock = _hasTonemap ? useAces ? _acesTonemapCall : `color*=scene.vImageInfos.x;
color=1.0-exp2(-1.590579*color);` : `color*=scene.vImageInfos.x;`;
    const fogHelper = _fogHelper;
    const fogBlock = _fogBlock;
    const alphaBlock = _noColorOutput ? "" : _hasAlphaBlend ? `var finalAlpha=alpha*material.materialAlpha;
var luminanceOverAlpha=0.0;
/*BA*/
luminanceOverAlpha+=dot(${_hasIbl ? `finalSpecularScaled` : `directSpecular`},vec3<f32>(0.2126,0.7152,0.0722));
finalAlpha=saturate(finalAlpha+luminanceOverAlpha*luminanceOverAlpha);
return vec4<f32>(color,finalAlpha);` : `return vec4<f32>(color,alpha*material.materialAlpha);`;
    const doubleSidedEntry = _hasDoubleSided ? `@fragment fn main(input: FragmentInput, @builtin(front_facing) frontFacing: bool)${_noColorOutput ? "" : " -> @location(0) vec4<f32>"} {` : `@fragment fn main(input: FragmentInput)${_noColorOutput ? "" : " -> @location(0) vec4<f32>"} {`;
    const doubleSidedFlip = _hasDoubleSided ? `if (!frontFacing) { N = -N; }` : "";
    const lightDecls = _hasMultiLight ? _multiLightWGSL : _hasSingleLight ? _singleLightWGSL : "";
    const lightBindingDecl = _hasSingleLight || _hasMultiLight ? `@group(0) @binding(1) var<uniform> lights: lightsUniforms;` : "";
    const meshLightIndexHelper = _hasSingleLight || _hasMultiLight ? meshLightIndexWGSL("mesh") : "";
    const anisoBrdfBlock = _hasAnisotropy ? _anisoBrdfFunctions : "";
    const fragmentHelpers = _ext?.fragmentHelpers ?? "";
    const fragmentPrelude = _ext?.fragmentPrelude ?? "";
    const baseColorUV = _ext?.uvForBaseColor ?? "input.uv";
    const ormUV = _ext?.uvForOrm ?? "input.uv";
    const _fragmentTemplate = `/*SU*/
${_esmShadowOutput ? "struct shadowParamsUniforms { biasAndScale: vec4<f32>, depthValues: vec4<f32>, }" : ""}
/*MU*/
@group(1) @binding(0) var<uniform> mesh: MeshUniforms;
/*HF*/
/*FB*/
/*FI*/
${BRDF_FUNCTIONS}
${acesBlock}
${fogHelper}
${anisoBrdfBlock}
${lightDecls}
${lightBindingDecl}
${meshLightIndexHelper}
${fragmentHelpers}
${doubleSidedEntry}
${fragmentPrelude}/*SV*/
let baseColorSample=textureSample(baseColorTexture,baseColorSampler,${baseColorUV});
${baseColorDecode}
let orm=textureSample(ormTexture,ormSampler,${ormUV}).rgb;
${occlusionDefault}
${roughnessMetallic}
${emissiveDefault}
/*AT*/
${// When the fragment terminates early (no color output, or ESM shadow
    // depth output), emit only the terminating return. Appending the
    // color-path body after the return would make it unreachable and
    // trigger a "code is unreachable" shader compilation warning.
    _noColorOutput ? "return;" : _esmShadowOutput ? _esmShadowDepthCode : `${normalBlock}
${doubleSidedFlip}
${anisotropyTBBlock}
/*AC*/
let V=normalize(scene.vEyePosition.xyz-input.worldPos);
let NdotVUnclamped=dot(N,V);
let NdotV=abs(NdotVUnclamped)+0.0000001;
${f0Default}
/*MF*/
var alphaG=roughness*roughness+0.0005;
${specularAABlock}
${directLightBlock}
var color=directDiffuse+directSpecular+emissive;
/*AI*/
/*NI*/
${fogBlock}
${tonemapBlock}
color=pow(color,vec3<f32>(1.0/2.2));
color=clamp(color,vec3<f32>(0.0),vec3<f32>(1.0));
let highContrast=color*color*(3.0-2.0*color);
if(scene.vImageInfos.y<1.0){color=mix(vec3<f32>(0.5),color,scene.vImageInfos.y);}
else{color=mix(color,highContrast,scene.vImageInfos.y-1.0);}
color=max(color,vec3<f32>(0.0));
/*BC*/
${alphaBlock}`}
}`;
    return {
      _vertexTemplate,
      _fragmentTemplate,
      _baseMeshUboFields,
      _baseMaterialUboFields,
      _baseVertexAttributes,
      _baseVaryings,
      _baseBindings
    };
  }
  var STAGE_FRAGMENT11, BRDF_FUNCTIONS;
  var init_pbr_template = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-template.ts"() {
      "use strict";
      init_lights_ubo();
      STAGE_FRAGMENT11 = 2;
      BRDF_FUNCTIONS = `
const PI:f32=3.14159265358979323846;
fn distributionGGX(NdotH:f32,alphaG:f32)->f32{
let a2=alphaG*alphaG;
let d=NdotH*NdotH*(a2-1.0)+1.0;
return a2/(PI*d*d);
}
fn geometrySmithGGX(NdotL:f32,NdotV:f32,alphaG:f32)->f32{
let a2=alphaG*alphaG;
let gl=NdotL*sqrt(NdotV*(NdotV-a2*NdotV)+a2);
let gv=NdotV*sqrt(NdotL*(NdotL-a2*NdotL)+a2);
return 0.5/(gl+gv);
}
fn fresnelSchlick(cosTheta:f32,F0:vec3<f32>,F90:vec3<f32>)->vec3<f32>{
let t=1.0-cosTheta;
let t2=t*t;
return F0+(F90-F0)*(t2*t2*t);
}
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-compose.ts
  function createPbrComposer(deps) {
    const cache = /* @__PURE__ */ new Map();
    const {
      _singleLightWGSL,
      _getSingleLightBlock,
      _multiLightWGSL,
      _multiLightLoop,
      _acesHelpers,
      _acesTonemapCall,
      _fogHelper,
      _fogBlock,
      _createPbrTemplateExt,
      _anisoExt,
      _iblSkyboxCalc,
      _createPbrShadowFragment,
      _shadowLights,
      _createThinInstanceFragment
    } = deps;
    return function composePbr(features, features2 = 0, meshFeatures = 0, sceneFeatures = 0, lightMode = 0, singleLightType = "", _esmShadowDepthCode = "", vbStrides, vbKey = "") {
      const ckey = `${features}:${features2}:${meshFeatures}:${sceneFeatures}:${lightMode}:${singleLightType}${vbKey}`;
      const cached = cache.get(ckey);
      if (cached) {
        return cached;
      }
      const has = (bit) => (features & bit) !== 0;
      const hasMesh = (bit) => (meshFeatures & bit) !== 0;
      const hasScene = (bit) => (sceneFeatures & bit) !== 0;
      const hasNormal = has(PBR_HAS_NORMAL_MAP) && hasMesh(MSH_HAS_TANGENTS);
      const hasCotangent = has(PBR_HAS_NORMAL_MAP) && !hasMesh(MSH_HAS_TANGENTS);
      const _hasAnyNormal = hasNormal || hasCotangent;
      const _hasReflectanceExt = has(PBR_HAS_METALLIC_REFLECTANCE_MAP | PBR_HAS_REFLECTANCE_MAP) || (features2 & PBR2_HAS_REFLECTANCE_FACTORS) !== 0;
      const _hasIbl = hasScene(PBR_HAS_ENV);
      const _hasMorph = hasMesh(MSH_HAS_MORPH_TARGETS);
      const hasShadow = hasMesh(MSH_RECEIVE_SHADOWS);
      const _hasAnisotropy = has(PBR_HAS_ANISOTROPY);
      const _hasEmissiveColor = has(PBR_HAS_EMISSIVE_COLOR);
      const _hasEmissiveTexture = has(PBR_HAS_EMISSIVE);
      const hasTI = hasMesh(MSH_HAS_THIN_INSTANCES);
      const _hasUvTransform = (features2 & PBR2_HAS_UV_TRANSFORM) !== 0;
      const _hasVertexColor = hasMesh(MSH_HAS_VERTEX_COLOR);
      const _hasUv2 = (features2 & PBR2_HAS_UV2) !== 0 && hasMesh(MSH_HAS_UV2);
      const needsExt = _hasUvTransform || _hasVertexColor || _hasUv2;
      const _hasSpecularAA = has(PBR_HAS_SPECULAR_AA);
      const _ext = needsExt && _createPbrTemplateExt ? _createPbrTemplateExt({
        _hasUvTransform,
        _hasVertexColor,
        _hasUv2,
        _hasOcclusionUv2: _hasUv2,
        _hasAnyNormal,
        _hasEmissiveTexture,
        _hasSpecGloss: has(PBR_HAS_SPEC_GLOSS)
      }) : void 0;
      const template = createPbrTemplate({
        _hasSingleLight: lightMode === 1,
        _hasMultiLight: lightMode === 2,
        _singleLightWGSL,
        _singleLightBlock: lightMode === 1 && _getSingleLightBlock ? _getSingleLightBlock(singleLightType) : "",
        _multiLightWGSL,
        _multiLightLoop,
        _normalMode: hasNormal ? "tangent" : hasCotangent ? "cotangent" : "none",
        _hasEmissiveTexture,
        _hasSpecGloss: has(PBR_HAS_SPEC_GLOSS),
        _hasDoubleSided: has(PBR_HAS_DOUBLE_SIDED),
        _hasTonemap: hasScene(PBR_HAS_TONEMAP),
        _fogHelper: hasScene(PBR_HAS_FOG) ? _fogHelper : "",
        _fogBlock: hasScene(PBR_HAS_FOG) ? _fogBlock : "",
        _acesHelpers,
        _acesTonemapCall,
        _hasAlphaBlend: has(PBR_HAS_ALPHA_BLEND),
        _hasSpecularAA,
        _hasGammaAlbedo: has(PBR_HAS_GAMMA_ALBEDO),
        _hasBaseColorFactor: (features2 & PBR2_HAS_BASE_COLOR_FACTOR) !== 0,
        _hasMorph,
        _hasOcclusion: has(PBR_HAS_OCCLUSION) && !_hasReflectanceExt,
        _hasEmissiveColor,
        _hasReflectanceExt,
        _hasIbl,
        _hasAnisotropy,
        _anisoBrdfFunctions: _hasAnisotropy && _anisoExt ? _anisoExt.ANISO_BRDF_FUNCTIONS : "",
        _anisoTBBlock: _hasAnisotropy && _anisoExt ? _anisoExt.makeAnisotropyTBBlock(hasNormal) : "",
        _ext,
        _noColorOutput: (features2 & PBR2_NO_COLOR_OUTPUT) !== 0,
        _esmShadowOutput: (features2 & PBR2_ESM_SHADOW_OUTPUT) !== 0,
        _esmShadowDepthCode,
        _vbStrides: vbStrides
      });
      const frags = [];
      const fragCtx = {
        _features: features,
        _features2: features2,
        _meshFeatures: meshFeatures,
        _hasIbl,
        _hasAnyNormal,
        _hasSpecularAA,
        _anisoBentNormalCode: _hasAnisotropy && _anisoExt ? _anisoExt.ANISO_BENT_NORMAL : "",
        _iblSkyboxCalc: has(PBR_HAS_SKYBOX) ? _iblSkyboxCalc : ""
      };
      for (const regExt of _getPbrExts().values()) {
        if (regExt.frag) {
          const fr = regExt.frag(fragCtx);
          if (fr) {
            frags.push(fr);
          }
        }
      }
      if (hasShadow && _createPbrShadowFragment) {
        const slots = _shadowLights.map((sl) => ({ lightIndex: sl.lightIndex, shadowType: sl.shadowType }));
        frags.push(_createPbrShadowFragment(slots));
      }
      if (hasTI && _createThinInstanceFragment) {
        frags.push(_createThinInstanceFragment(hasMesh(MSH_HAS_INSTANCE_COLOR)));
      }
      const composed = composeShader(template, frags);
      cache.set(ckey, composed);
      return composed;
    };
  }
  var init_pbr_compose = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-compose.ts"() {
      "use strict";
      init_shader_composer();
      init_pbr_template();
      init_pbr_flag_bits();
      init_pbr_flags();
      init_mesh_features();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/ibl-fragment.ts
  var ibl_fragment_exports = {};
  __export(ibl_fragment_exports, {
    createIblFragment: () => createIblFragment,
    pbrExt: () => pbrExt
  });
  function makeIblCalculation(hasNormalMap, anisoBentNormalCode = "", skyboxCalculation = "") {
    if (skyboxCalculation) {
      return skyboxCalculation;
    }
    const ehoLine = hasNormalMap ? `let eho = environmentHorizonOcclusion(-V, N, N_geom);` : `let eho = 1.0;`;
    const reflectionDir = anisoBentNormalCode ? anisoBentNormalCode : `let R_raw = reflect(-V, N);`;
    const irradianceCode = `let environmentIrradiance = (scene.vSphericalL00.rgb
  + scene.vSphericalL1_1.rgb * N_env.y + scene.vSphericalL10.rgb * N_env.z + scene.vSphericalL11.rgb * N_env.x
  + scene.vSphericalL2_2.rgb * (N_env.y * N_env.x) + scene.vSphericalL2_1.rgb * (N_env.y * N_env.z)
  + scene.vSphericalL20.rgb * (3.0 * N_env.z * N_env.z - 1.0) + scene.vSphericalL21.rgb * (N_env.z * N_env.x)
  + scene.vSphericalL22.rgb * (N_env.x * N_env.x - N_env.y * N_env.y)) * material.environmentIntensity;`;
    return `${reflectionDir}
let R = rotateY(R_raw, scene.envRotationY);
let N_env = rotateY(N, scene.envRotationY);
let brdf = textureSample(brdfLUT, brdfSampler_, vec2<f32>(NdotV, roughness));
let environmentBrdf = brdf.rgb;
let specularEnvironmentReflectance = (colorF90 - colorF0) * environmentBrdf.x + colorF0 * environmentBrdf.y;
let seo = clamp((NdotVUnclamped + occlusion) * (NdotVUnclamped + occlusion) - 1.0 + occlusion, 0.0, 1.0);
${ehoLine}
let colorSpecularEnvReflectance = specularEnvironmentReflectance * seo * eho;
let energyConservation = getEnergyConservationFactor(colorF0, max(environmentBrdf.y, 0.001));
${irradianceCode}
let maxLod = f32(textureNumLevels(iblTexture) - 1);
let cubemapDim = f32(textureDimensions(iblTexture).x);
var specLod = log2(cubemapDim * alphaG) * scene.vImageInfos.z;
var environmentRadiance = textureSampleLevel(iblTexture, iblSampler, R, clamp(specLod, 0.0, maxLod)).rgb * material.environmentIntensity;
environmentRadiance = mix(environmentRadiance, environmentIrradiance, alphaG);
let finalIrradiance = environmentIrradiance * surfaceAlbedo * occlusion;
let finalSpecularScaled = directSpecular * energyConservation;
let finalRadianceScaled = environmentRadiance * colorSpecularEnvReflectance * energyConservation;
color = finalIrradiance + finalRadianceScaled + finalSpecularScaled + directDiffuse + emissive;`;
  }
  function createIblFragment(hasNormalMap, anisoBentNormalCode = "", skyboxCalculation = "") {
    return {
      _id: "ibl",
      // SH coefficients are in the PBR template's baseSceneUboFields (not here)
      // to preserve fixed scene UBO layout compatibility.
      _bindings: [
        { _name: "brdfLUT", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT12 },
        { _name: "brdfSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT12 },
        { _name: "iblTexture", _type: { _kind: "texture", _textureType: "texture_cube<f32>" }, _visibility: STAGE_FRAGMENT12 },
        { _name: "iblSampler", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT12 }
      ],
      _helperFunctions: IBL_HELPERS,
      _fragmentSlots: {
        AI: makeIblCalculation(hasNormalMap, anisoBentNormalCode, skyboxCalculation),
        BA: `luminanceOverAlpha += dot(finalRadianceScaled, vec3<f32>(0.2126, 0.7152, 0.0722));`
      }
    };
  }
  var STAGE_FRAGMENT12, IBL_HELPERS, pbrExt;
  var init_ibl_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/ibl-fragment.ts"() {
      "use strict";
      STAGE_FRAGMENT12 = 2;
      IBL_HELPERS = `
fn environmentHorizonOcclusion(V: vec3<f32>, N: vec3<f32>, geoN: vec3<f32>) -> f32 {
let R = reflect(V, N);
let temp = saturate(1.0 + 1.1 * dot(R, geoN));
return temp * temp;
}
fn getEnergyConservationFactor(F0: vec3<f32>, brdfY: f32) -> vec3<f32> {
return 1.0 + F0 * (1.0 / brdfY - 1.0);
}
fn rotateY(v: vec3<f32>, angle: f32) -> vec3<f32> {
let c = cos(angle);
let s = sin(angle);
return vec3<f32>(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}
`;
      pbrExt = {
        id: "ibl",
        phase: "ibl",
        frag(ctx) {
          if (!ctx._hasIbl) {
            return null;
          }
          return createIblFragment(ctx._hasAnyNormal, ctx._anisoBentNormalCode ?? "", ctx._iblSkyboxCalc ?? "");
        },
        bind(ctx, entries, b) {
          if (!ctx._env) {
            return b;
          }
          entries.push({ binding: b++, resource: ctx._env.brdfLutView });
          entries.push({ binding: b++, resource: ctx._env.brdfSampler });
          entries.push({ binding: b++, resource: ctx._env.specularCubeView });
          entries.push({ binding: b++, resource: ctx._env.cubeSampler });
          return b;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/ibl-skybox-wgsl.ts
  var ibl_skybox_wgsl_exports = {};
  __export(ibl_skybox_wgsl_exports, {
    IBL_SKYBOX_CALCULATION: () => IBL_SKYBOX_CALCULATION
  });
  var IBL_SKYBOX_CALCULATION;
  var init_ibl_skybox_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/ibl-skybox-wgsl.ts"() {
      "use strict";
      IBL_SKYBOX_CALCULATION = `let R = input.worldPos - scene.vEyePosition.xyz;
let maxLod = f32(textureNumLevels(iblTexture) - 1);
let cubemapDim = f32(textureDimensions(iblTexture).x);
let skyboxAlphaG = max(roughness * roughness, 0.000001);
var specLod = log2(cubemapDim * skyboxAlphaG) * scene.vImageInfos.z;
var environmentRadiance = textureSampleLevel(iblTexture, iblSampler, R, clamp(specLod, 0.0, maxLod)).rgb * material.environmentIntensity;
let finalSpecularScaled = vec3<f32>(0.0);
let finalRadianceScaled = environmentRadiance;
color = finalRadianceScaled + emissive;`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/multilight-wgsl.ts
  var multilight_wgsl_exports = {};
  __export(multilight_wgsl_exports, {
    COMPUTE_PBR_LIGHT: () => COMPUTE_PBR_LIGHT,
    MULTI_LIGHT_STRUCTS: () => MULTI_LIGHT_STRUCTS,
    getMultiLightLoop: () => getMultiLightLoop
  });
  function MULTI_LIGHT_STRUCTS() {
    return `
struct LightEntry {
vLightData: vec4<f32>,
vLightDiffuse: vec4<f32>,
vLightSpecular: vec4<f32>,
vLightDirection: vec4<f32>,
};
struct lightsUniforms {
count: u32, _p0: u32, _p1: u32, _p2: u32,
lights: array<LightEntry, ${MAX_LIGHTS}>,
};
`;
  }
  function getMultiLightLoop() {
    return `var directDiffuse = vec3<f32>(0.0);
var directSpecular = vec3<f32>(0.0);
// BJS direct-light specular: roughness is clamped by the geometric AA factor
// BEFORE being squared (matches BJS pbrDirectLightingFunctions.fx line 103).
// The IBL-path alphaG already has AA_factor_y additively baked in; direct
// specular uses its own squaring after max(roughness, AA_factor_x).
let directRoughness = max(roughness, AA_factor_x);
let directAlphaG = directRoughness * directRoughness + 0.0005;
var shadowFactors = array<f32, ${MAX_LIGHTS}>(${new Array(MAX_LIGHTS).fill("1.0").join(", ")});
let lightCount = min(mesh.lc, ${MAX_LIGHTS}u);
/*AS*/
// First-light aliases \u2014 kept at directLightBlock scope so the AD slot below
// (clearcoat / sheen / subsurface) sees the same single-light variable names
// it was originally written against. Multi-light direct contributions
// for those ancillary BRDFs are not yet supported (single-light parity only).
let lightIndex0 = mli(0u);
let entry0 = lights.lights[lightIndex0];
let pl0 = computePbrLight(entry0, N, input.worldPos, material.lightFalloffMode);
let L = pl0.L;
let NdotL = pl0.NdotL;
let lightColor = pl0.specColor;
let lightAtten = pl0.atten * shadowFactors[lightIndex0];
let H = normalize(V + L);
let NdotH = clamp(dot(N, H), 0.0000001, 1.0);
let VdotH = saturate(dot(V, H));
for (var li = 0u; li < lightCount; li++) {
var pl: PbrLightResult;
let lightIndex = mli(li);
if (li == 0u) { pl = pl0; } else { pl = computePbrLight(lights.lights[lightIndex], N, input.worldPos, material.lightFalloffMode); }
let sf = shadowFactors[lightIndex];
if (pl.isHemi) {
directDiffuse += pl.color * surfaceAlbedo * material.directIntensity * sf;
} else {
directDiffuse += surfaceAlbedo * (1.0 / PI) * pl.NdotL * pl.color * pl.atten * material.directIntensity * sf;
}
// Specular uses pl.NdotL (hemispheric 0.5+0.5*dot for hemi, max(dot,0) for others)
// and pl.specColor (un-mixed light diffuse \u2014 matches single-light fast path
// and Std's LIGHTING_FN which uses vLightSpecular for the specular bounce).
if (pl.NdotL > 0.0 && pl.atten > 0.0) {
let specH = normalize(V + pl.L);
let specNdotH = clamp(dot(N, specH), 0.0000001, 1.0);
let specVdotH = saturate(dot(V, specH));
let D = distributionGGX(specNdotH, directAlphaG);
let G = geometrySmithGGX(pl.NdotL, NdotV, directAlphaG);
let coloredFresnel = fresnelSchlick(specVdotH, colorF0, colorF90);
directSpecular += coloredFresnel * D * G * pl.NdotL * pl.specColor * pl.atten * material.directIntensity * sf;
}
}
/*AD*/`;
  }
  var COMPUTE_PBR_LIGHT;
  var init_multilight_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/multilight-wgsl.ts"() {
      "use strict";
      init_types();
      COMPUTE_PBR_LIGHT = `
struct PbrLightResult { L: vec3<f32>, NdotL: f32, atten: f32, color: vec3<f32>, specColor: vec3<f32>, isHemi: bool };
fn computePbrLight(entry: LightEntry, N: vec3<f32>, worldPos: vec3<f32>, lightFalloffMode: f32) -> PbrLightResult {
var r: PbrLightResult;
let t = u32(entry.vLightData.w);
r.isHemi = t == 3u;
r.specColor = entry.vLightDiffuse.rgb;
if (t == 3u) {
r.L = normalize(entry.vLightData.xyz);
r.NdotL = dot(N, r.L) * 0.5 + 0.5;
r.atten = 1.0;
r.color = mix(entry.vLightDirection.xyz, entry.vLightDiffuse.rgb, r.NdotL);
return r;
}
if (t == 1u) {
r.L = normalize(-entry.vLightData.xyz);
r.atten = 1.0;
} else {
let toLight = entry.vLightData.xyz - worldPos;
let d2 = dot(toLight, toLight);
let dist = sqrt(d2);
r.L = toLight / max(dist, 0.0001);
        let physicalFalloff = lightFalloffMode >= 0.5;
        let rangeAtt = select(max(0.0, 1.0 - dist / entry.vLightDiffuse.a), 1.0 / max(d2, 0.0000001), physicalFalloff);
        if (t == 2u) {
        let cosHalfAngle = entry.vLightDirection.w;
        let c = dot(-entry.vLightDirection.xyz, r.L);
        let standardDirFalloff = select(0.0, max(0.0, pow(max(c, 0.0), entry.vLightSpecular.a)), c >= cosHalfAngle);
        let kappa = 6.64385618977 / max(1.0 - cosHalfAngle, 0.0001);
        let physicalDirFalloff = exp2(kappa * (c - 1.0));
        r.atten = rangeAtt * select(standardDirFalloff, physicalDirFalloff, physicalFalloff);
        } else {
        r.atten = rangeAtt;
        }
}
r.NdotL = max(dot(N, r.L), 0.0);
r.color = entry.vLightDiffuse.rgb;
return r;
}
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/pbr-shadow-fragment.ts
  var pbr_shadow_fragment_exports = {};
  __export(pbr_shadow_fragment_exports, {
    createPbrShadowFragment: () => createPbrShadowFragment
  });
  function createPbrShadowFragment(shadowLights = [{ lightIndex: 0, shadowType: "esm" }]) {
    const csmSlots = shadowLights.filter((sl) => sl.shadowType === "csm");
    if (csmSlots.length > 0) {
      return getCsmPbrReceiverFactory()(csmSlots.map((s) => ({ lightIndex: s.lightIndex })));
    }
    const fragment = createShadowFragment("pbr-shadow", shadowLights);
    const shadowCode = fragment._fragmentSlots?.AD;
    return {
      ...fragment,
      _fragmentSlots: shadowCode ? { AS: shadowCode } : void 0
    };
  }
  var init_pbr_shadow_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/pbr-shadow-fragment.ts"() {
      "use strict";
      init_shadow_fragment_core();
      init_csm_receiver_registry();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/alpha-test-fragment.ts
  var alpha_test_fragment_exports = {};
  __export(alpha_test_fragment_exports, {
    pbrExt: () => pbrExt2
  });
  var pbrExt2;
  var init_alpha_test_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/alpha-test-fragment.ts"() {
      "use strict";
      init_pbr_flag_bits();
      pbrExt2 = {
        id: "alpha-test",
        phase: "fragment",
        frag(ctx) {
          return ctx._features & PBR_HAS_ALPHA_TEST ? {
            _id: "alpha-test",
            _uboFields: [{ _name: "alphaCutOff", _type: "f32" }],
            _fragmentSlots: { AT: `if(alpha*material.materialAlpha<material.alphaCutOff){discard;}` }
          } : null;
        },
        writeUbo(data, mat, offsets) {
          const off = offsets.get("alphaCutOff");
          if (off !== void 0) {
            data[off / 4] = mat.alphaCutOff ?? 0;
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/reflectance-fragment.ts
  var reflectance_fragment_exports = {};
  __export(reflectance_fragment_exports, {
    createReflectanceFragment: () => createReflectanceFragment,
    pbrExt: () => pbrExt3,
    writeReflectanceUBO: () => writeReflectanceUBO
  });
  function writeReflectanceUBO(data, material, offsets) {
    if (!offsets.has("occlusionStrength")) {
      return;
    }
    const off = offsets.get("occlusionStrength") / 4;
    data[off] = material.occlusionStrength ?? 1;
    data[off + 1] = material.metallicF0Factor ?? 1;
    data[off + 2] = material.specularWeight ?? material.metallicF0Factor ?? 1;
    const mrc = material.metallicReflectanceColor;
    data[off + 4] = mrc ? mrc[0] : 1;
    data[off + 5] = mrc ? mrc[1] : 1;
    data[off + 6] = mrc ? mrc[2] : 1;
  }
  function createReflectanceFragment(hasMetallicReflectanceMap, hasReflectanceMap, useAlphaOnlyMR, hasOcclusionUv2 = false) {
    const bindings = [];
    if (hasMetallicReflectanceMap) {
      bindings.push(
        { _name: "metallicReflectanceMap", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT13 },
        { _name: "metallicReflectanceMapSampler", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT13 }
      );
    }
    if (hasReflectanceMap) {
      bindings.push(
        { _name: "reflectanceMap", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT13 },
        { _name: "reflectanceMapSampler", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT13 }
      );
    }
    let f0Code = `var mrFactors = vec4<f32>(material.metallicReflectanceColor, material.metallicF0Factor);
var specularWeight = material.specularWeight;`;
    if (hasReflectanceMap) {
      f0Code += `
{ let rSample = textureSample(reflectanceMap, reflectanceMapSampler, input.uv);
  let rLinear = pow(rSample.rgb, vec3<f32>(2.2));
  mrFactors = vec4<f32>(mrFactors.rgb * rLinear, mrFactors.a); }`;
    }
    if (hasMetallicReflectanceMap) {
      if (!useAlphaOnlyMR) {
        f0Code += `
{ let mrSample = textureSample(metallicReflectanceMap, metallicReflectanceMapSampler, input.uv);
  let mrLinear = pow(mrSample.rgb, vec3<f32>(2.2));
  mrFactors = vec4<f32>(mrFactors.rgb * mrLinear, mrFactors.a * mrSample.a);
  specularWeight *= mrSample.a; }`;
      } else {
        f0Code += `
{ let mrSample = textureSample(metallicReflectanceMap, metallicReflectanceMapSampler, input.uv);
  mrFactors = vec4<f32>(mrFactors.rgb, mrFactors.a * mrSample.a);
  specularWeight *= mrSample.a; }`;
      }
    }
    f0Code += `
let dielectricF0 = material.reflectance * mrFactors.a;
let surfaceReflectivityColor = mrFactors.rgb;
let dielectricColorF0 = vec3<f32>(dielectricF0) * surfaceReflectivityColor;
let metallicColorF0 = baseColor;
var colorF0 = mix(dielectricColorF0, metallicColorF0, metallic);
let colorF90 = vec3<f32>(mix(specularWeight, 1.0, metallic));
let surfaceAlbedo = baseColor * (vec3<f32>(1.0) - vec3<f32>(dielectricF0) * surfaceReflectivityColor) * (1.0 - metallic);`;
    return {
      _id: "reflectance",
      _uboFields: [
        { _name: "occlusionStrength", _type: "f32" },
        { _name: "metallicF0Factor", _type: "f32" },
        { _name: "specularWeight", _type: "f32" },
        { _name: "_mrPad1", _type: "f32" },
        { _name: "metallicReflectanceColor", _type: "vec3<f32>" },
        { _name: "_mrPad2", _type: "f32" }
      ],
      _bindings: bindings,
      _fragmentSlots: {
        MF: f0Code,
        AT: hasOcclusionUv2 ? `let occlusion = mix(1.0, textureSample(occlusionTexture, occlusionSampler_, input.uv2).r, material.occlusionStrength);` : `let occlusion = mix(1.0, orm.r, material.occlusionStrength);`
      }
    };
  }
  var STAGE_FRAGMENT13, pbrExt3;
  var init_reflectance_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/reflectance-fragment.ts"() {
      "use strict";
      init_pbr_flag_bits();
      STAGE_FRAGMENT13 = 2;
      pbrExt3 = {
        id: "reflectance",
        phase: "fragment",
        detect(mat) {
          const m = mat;
          let f = 0;
          let f2 = 0;
          if (m.metallicReflectanceTexture) {
            f |= PBR_HAS_METALLIC_REFLECTANCE_MAP;
          }
          if (m.reflectanceTexture) {
            f |= PBR_HAS_REFLECTANCE_MAP;
          }
          if (f === 0) {
            const hasNonDefaultF0 = m.metallicF0Factor != null && Math.abs(m.metallicF0Factor - 1) > 1e-6;
            const mrc = m.metallicReflectanceColor;
            const hasNonDefaultColor = mrc != null && (mrc[0] !== 1 || mrc[1] !== 1 || mrc[2] !== 1);
            if (hasNonDefaultF0 || hasNonDefaultColor) {
              f2 |= PBR2_HAS_REFLECTANCE_FACTORS;
            }
          }
          if ((f !== 0 || f2 & PBR2_HAS_REFLECTANCE_FACTORS) && m.useOnlyMetallicFromMetallicReflectanceTexture) {
            f |= PBR_HAS_USE_ALPHA_ONLY_MR;
          }
          return { f, f2 };
        },
        frag(ctx) {
          const hasMR = (ctx._features & PBR_HAS_METALLIC_REFLECTANCE_MAP) !== 0;
          const hasR = (ctx._features & PBR_HAS_REFLECTANCE_MAP) !== 0;
          const hasFactors = (ctx._features2 & PBR2_HAS_REFLECTANCE_FACTORS) !== 0;
          if (!hasMR && !hasR && !hasFactors) {
            return null;
          }
          return createReflectanceFragment(hasMR, hasR, (ctx._features & PBR_HAS_USE_ALPHA_ONLY_MR) !== 0, (ctx._features2 & PBR2_HAS_UV2) !== 0);
        },
        writeUbo: writeReflectanceUBO,
        bind(ctx, entries, b) {
          if ((ctx._features & (PBR_HAS_METALLIC_REFLECTANCE_MAP | PBR_HAS_REFLECTANCE_MAP)) === 0) {
            return b;
          }
          const m = ctx._material;
          if (m.metallicReflectanceTexture) {
            entries.push({ binding: b++, resource: m.metallicReflectanceTexture.view });
            entries.push({ binding: b++, resource: m.metallicReflectanceTexture.sampler });
          }
          if (m.reflectanceTexture) {
            entries.push({ binding: b++, resource: m.reflectanceTexture.view });
            entries.push({ binding: b++, resource: m.reflectanceTexture.sampler });
          }
          return b;
        },
        textures(mat, t) {
          const m = mat;
          if (m.metallicReflectanceTexture) {
            t.push(m.metallicReflectanceTexture);
          }
          if (m.reflectanceTexture) {
            t.push(m.reflectanceTexture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/clearcoat-fragment.ts
  var clearcoat_fragment_exports = {};
  __export(clearcoat_fragment_exports, {
    createClearcoatFragment: () => createClearcoatFragment,
    pbrExt: () => pbrExt4,
    writeClearcoatUBO: () => writeClearcoatUBO
  });
  function makeF0Remap(intensityExpr) {
    return `
{
let ccInt_r = ${intensityExpr};
let remappedF0 = getR0RemappedForClearCoat(colorF0, material.ccRefractionParams.z, material.ccRefractionParams.w);
colorF0 = mix(colorF0, remappedF0, ccInt_r);
}
`;
  }
  function makeDirectMod(intensityExpr, roughnessExpr, hasNormalMap) {
    const N = hasNormalMap ? "ccN" : "N_geom";
    return `
var ccDirectAttenuation = 1.0;
var ccDirectSpecularTerm = vec3<f32>(0.0);
{
let ccInt_dl = ${intensityExpr};
let ccRough_dl = ${roughnessExpr};
let ccF0_dl = material.ccRefractionParams.x;
let ccAlphaG_dl = ccRough_dl * ccRough_dl + 0.0005;
let ccNdotL_dl = saturate(dot(${N}, L));
let ccH_dl = normalize(V + L);
let ccNdotH_dl = clamp(dot(${N}, ccH_dl), 0.0000001, 1.0);
let ccVdotH_dl = saturate(dot(V, ccH_dl));
let ccD_dl = distributionGGX(ccNdotH_dl, ccAlphaG_dl);
let ccVis_dl = visibility_Kelemen(ccVdotH_dl);
let ccFresnel_dl = ccSchlick(ccF0_dl, ccVdotH_dl);
let ccTerm = ccFresnel_dl * ccD_dl * ccVis_dl * ccNdotL_dl;
ccDirectSpecularTerm = vec3<f32>(ccTerm) * lightColor * lightAtten * material.directIntensity * ccInt_dl;
ccDirectAttenuation = 1.0 - ccFresnel_dl * ccInt_dl;
}
`;
  }
  function makeIblMod(intensityExpr, roughnessExpr, hasNormalMap, hasSpecularAA, hasBaseNormalMap) {
    const N = hasNormalMap ? "ccN" : "N_geom";
    const alphaG = hasSpecularAA ? `let ccAlphaG_ibl_base = ccRough_ibl * ccRough_ibl + 0.0005;
let cc_nDfdx_AA = dpdx(${N});
let cc_nDfdy_AA = dpdy(${N});
let cc_slopeSquare_AA = max(dot(cc_nDfdx_AA, cc_nDfdx_AA), dot(cc_nDfdy_AA, cc_nDfdy_AA));
let ccAlphaG_ibl = ccAlphaG_ibl_base + sqrt(cc_slopeSquare_AA) * 0.75;` : `let ccAlphaG_ibl = ccRough_ibl * ccRough_ibl + 0.0005;`;
    const ehoLine = hasBaseNormalMap ? `let ccEho_ibl = environmentHorizonOcclusion(-V, ${N}, N_geom);` : `let ccEho_ibl = 1.0;`;
    return `
{
let ccInt_ibl = ${intensityExpr};
let ccRough_ibl = ${roughnessExpr};
let ccF0_ibl = material.ccRefractionParams.x;
let ccR_raw = reflect(-V, ${N});
let ccR_ibl = rotateY(ccR_raw, scene.envRotationY);
let ccNdotV_ibl = abs(dot(${N}, V)) + 0.0000001;
${alphaG}
var ccSpecLod_ibl = log2(cubemapDim * ccAlphaG_ibl) * scene.vImageInfos.z;
let ccEnvRadiance_ibl = textureSampleLevel(iblTexture, iblSampler, ccR_ibl, clamp(ccSpecLod_ibl, 0.0, maxLod)).rgb * material.environmentIntensity;
let ccBrdf_ibl = textureSample(brdfLUT, brdfSampler_, vec2<f32>(ccNdotV_ibl, ccRough_ibl)).rgb;
${ehoLine}
let ccSpecEnvRefl = (vec3<f32>(ccF0_ibl) * ccBrdf_ibl.y + (vec3<f32>(1.0) - vec3<f32>(ccF0_ibl)) * ccBrdf_ibl.x) * ccInt_ibl * ccEho_ibl;
let ccFresnelIBL = ccSchlick(ccF0_ibl, ccNdotV_ibl);
let ccConservation_ibl = 1.0 - ccFresnelIBL * ccInt_ibl;
let ccFinalRadiance_ibl = ccEnvRadiance_ibl * ccSpecEnvRefl;
color = finalIrradiance * ccConservation_ibl
      + finalRadianceScaled * ccConservation_ibl
      + finalSpecularScaled * ccDirectAttenuation
      + directDiffuse * ccDirectAttenuation
      + ccDirectSpecularTerm
      + ccFinalRadiance_ibl
      + emissive;
}
`;
  }
  function makeNonIblMod(intensityExpr) {
    return `
{
let ccF0_noIbl = material.ccRefractionParams.x;
let ccInt_noIbl = ${intensityExpr};
let ccFresnelNoIbl = ccSchlick(ccF0_noIbl, NdotV);
let ccCons_noIbl = 1.0 - ccFresnelNoIbl * ccInt_noIbl;
color = (color - emissive) * ccCons_noIbl + emissive + ccDirectSpecularTerm;
}
`;
  }
  function createClearcoatFragment(features, features2, hasIbl, hasBaseNormalMap, hasSpecularAA) {
    if ((features & PBR_HAS_CLEARCOAT) === 0) {
      return null;
    }
    const hasReflectance = (features & (PBR_HAS_METALLIC_REFLECTANCE_MAP | PBR_HAS_REFLECTANCE_MAP)) !== 0;
    const hasIntensityMap = (features2 & PBR2_CC_INT_MAP) !== 0;
    const hasRoughnessMap = (features2 & PBR2_CC_ROUGH_MAP) !== 0;
    const hasNormalMap = (features2 & PBR2_CC_NORMAL_MAP) !== 0;
    const disableF0Remap = (features2 & PBR2_CC_F0_REMAP_OFF) !== 0;
    const intensityExpr = hasIntensityMap ? CC_INT_TEX : CC_INT_PLAIN;
    const roughnessExpr = hasRoughnessMap ? CC_ROUGH_TEX : CC_ROUGH_PLAIN;
    const slots = {
      MF: disableF0Remap ? "" : makeF0Remap(intensityExpr),
      AD: makeDirectMod(intensityExpr, roughnessExpr, hasNormalMap),
      BL: `var ccDirectAttenuation = 1.0;
var ccDirectSpecularTerm = vec3<f32>(0.0);`
    };
    if (hasNormalMap) {
      slots.AC = CC_NORMAL_COMPUTE;
    }
    if (hasIbl) {
      slots.AI = makeIblMod(intensityExpr, roughnessExpr, hasNormalMap, hasSpecularAA, hasBaseNormalMap);
    } else {
      slots.NI = makeNonIblMod(intensityExpr);
    }
    const deps = [];
    if (hasIbl) {
      deps.push("ibl");
    }
    if (hasReflectance) {
      deps.push("reflectance");
    }
    const suffix = (hasIntensityMap ? "I" : "") + (hasRoughnessMap ? "R" : "") + (hasNormalMap ? "N" : "") + (disableF0Remap ? "X" : "") + (hasSpecularAA ? "A" : "") + (hasBaseNormalMap ? "B" : "");
    const bindings = [];
    if (hasIntensityMap) {
      bindings.push(
        { _name: "ccIntensityTexture", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT14 },
        { _name: "ccIntensitySampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT14 }
      );
    }
    if (hasRoughnessMap) {
      bindings.push(
        { _name: "ccRoughnessTexture", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT14 },
        { _name: "ccRoughnessSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT14 }
      );
    }
    if (hasNormalMap) {
      bindings.push(
        { _name: "ccNormalTexture", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT14 },
        { _name: "ccNormalSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT14 }
      );
    }
    return {
      _id: suffix ? `clearcoat-${suffix}` : "clearcoat",
      _dependencies: deps.length > 0 ? deps : void 0,
      _uboFields: [
        { _name: "ccParams", _type: "vec4<f32>" },
        { _name: "ccRefractionParams", _type: "vec4<f32>" }
      ],
      _bindings: bindings,
      _helperFunctions: CC_HELPERS,
      _fragmentSlots: slots
    };
  }
  function writeClearcoatUBO(data, material, offsets) {
    const cc = material.clearCoat;
    if (!cc?.isEnabled || !offsets.has("ccParams")) {
      return;
    }
    const off = offsets.get("ccParams") / 4;
    const ior = cc.indexOfRefraction ?? 1.5;
    const a = 1 - ior;
    const b = 1 + ior;
    data[off] = cc.intensity ?? 1;
    data[off + 1] = cc.roughness ?? 0;
    data[off + 2] = cc.bumpTextureScale ?? 1;
    data[off + 4] = Math.pow(-a / b, 2);
    data[off + 5] = 1 / ior;
    data[off + 6] = a;
    data[off + 7] = b;
  }
  var STAGE_FRAGMENT14, CC_HELPERS, CC_INT_TEX, CC_INT_PLAIN, CC_ROUGH_TEX, CC_ROUGH_PLAIN, CC_NORMAL_COMPUTE, CC_TEX, pbrExt4;
  var init_clearcoat_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/clearcoat-fragment.ts"() {
      "use strict";
      init_pbr_flag_bits();
      STAGE_FRAGMENT14 = 2;
      CC_HELPERS = `
fn visibility_Kelemen(VdotH_kl: f32) -> f32 {
return 0.25 / (VdotH_kl * VdotH_kl + 0.0000001);
}
fn getR0RemappedForClearCoat(f0_rc: vec3<f32>, ccA: f32, ccB: f32) -> vec3<f32> {
let sf0 = sqrt(f0_rc);
let num = ccA + ccB * sf0;
let den = ccB + ccA * sf0;
return saturate((num / den) * (num / den));
}
fn ccSchlick(f0: f32, cosTheta: f32) -> f32 {
let t = 1.0 - cosTheta;
let t2 = t * t;
return f0 + (1.0 - f0) * (t2 * t2 * t);
}
`;
      CC_INT_TEX = `material.ccParams.x * textureSample(ccIntensityTexture, ccIntensitySampler_, input.uv).r`;
      CC_INT_PLAIN = `material.ccParams.x`;
      CC_ROUGH_TEX = `clamp(material.ccParams.y * textureSample(ccRoughnessTexture, ccRoughnessSampler_, input.uv).g, 0.0, 1.0)`;
      CC_ROUGH_PLAIN = `material.ccParams.y`;
      CC_NORMAL_COMPUTE = `
let cc_dp1 = dpdx(input.worldPos);
let cc_dp2 = dpdy(input.worldPos);
let cc_duv1 = dpdx(input.uv);
let cc_duv2 = dpdy(input.uv);
let cc_dp2perp = cross(cc_dp2, N_geom);
let cc_dp1perp = cross(N_geom, cc_dp1);
let cc_tFrame = cc_dp2perp * cc_duv1.x + cc_dp1perp * cc_duv2.x;
let cc_bFrame = -(cc_dp2perp * cc_duv1.y + cc_dp1perp * cc_duv2.y);
let cc_det = max(dot(cc_tFrame, cc_tFrame), dot(cc_bFrame, cc_bFrame));
let cc_invmax = select(inverseSqrt(cc_det), 0.0, cc_det == 0.0);
let cc_frame = mat3x3<f32>(cc_tFrame * cc_invmax, cc_bFrame * cc_invmax, N_geom);
let ccNormSampleRaw = textureSample(ccNormalTexture, ccNormalSampler_, input.uv).rgb * 2.0 - 1.0;
let ccNormScale = material.ccParams.z;
var ccN = normalize(cc_frame * normalize(ccNormSampleRaw * vec3<f32>(ccNormScale, ccNormScale, 1.0)));
`;
      CC_TEX = [
        [PBR2_CC_INT_MAP, "texture"],
        [PBR2_CC_ROUGH_MAP, "roughnessTexture"],
        [PBR2_CC_NORMAL_MAP, "bumpTexture"]
      ];
      pbrExt4 = {
        id: "clearcoat",
        phase: "base-tex",
        detect(mat) {
          const cc = mat.clearCoat;
          if (!cc?.isEnabled) {
            return { f: 0, f2: 0 };
          }
          let f2 = 0;
          for (const [flag, key] of CC_TEX) {
            if (cc[key]) {
              f2 |= flag;
            }
          }
          if (cc.useF0Remap === false) {
            f2 |= PBR2_CC_F0_REMAP_OFF;
          }
          return { f: PBR_HAS_CLEARCOAT, f2 };
        },
        frag: (ctx) => createClearcoatFragment(ctx._features, ctx._features2, ctx._hasIbl, ctx._hasAnyNormal, ctx._hasSpecularAA),
        writeUbo: writeClearcoatUBO,
        bind(ctx, entries, b) {
          const cc = ctx._material.clearCoat;
          if (!cc) {
            return b;
          }
          for (const [flag, key] of CC_TEX) {
            const tex = cc[key];
            if ((ctx._features2 & flag) !== 0 && tex) {
              entries.push({ binding: b++, resource: tex.view });
              entries.push({ binding: b++, resource: tex.sampler });
            }
          }
          return b;
        },
        textures(mat, t) {
          const cc = mat.clearCoat;
          if (!cc) {
            return;
          }
          for (const [, key] of CC_TEX) {
            const tex = cc[key];
            if (tex) {
              t.push(tex);
            }
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/sheen-fragment.ts
  var sheen_fragment_exports = {};
  __export(sheen_fragment_exports, {
    createSheenFragment: () => createSheenFragment,
    pbrExt: () => pbrExt5,
    writeSheenUBO: () => writeSheenUBO
  });
  function createSheenFragment(hasSheenTexture, hasIbl = false, hasAlbedoScaling = false, hasSheenUvTx = false) {
    let scopeVars = `var sheenDirectTerm = vec3<f32>(0.0);
var sheenIblTerm = vec3<f32>(0.0);
var sheenAlbedoScaling = 1.0;
var sheenColorFinal = material.sheenParams.rgb;
var sheenRoughnessAdjusted = material.sheenParams2.x;`;
    if (hasSheenTexture) {
      const gammaStmt = hasAlbedoScaling ? "sheenMapData.rgb" : "pow(sheenMapData.rgb, vec3<f32>(2.2))";
      const sheenUvDecl = hasSheenUvTx ? "let sheenUV = vec2<f32>(dot(material.sheenUVm.xy, input.uv), dot(material.sheenUVm.zw, input.uv)) + material.sheenUVt.xy;" : "let sheenUV = input.uv;";
      scopeVars += `
{
${sheenUvDecl}
let sheenMapData = textureSample(sheenTexture_, sheenSampler_, sheenUV);
sheenColorFinal *= ${gammaStmt};
sheenRoughnessAdjusted *= sheenMapData.a;
}`;
    }
    const intensityExpr = hasAlbedoScaling ? "material.sheenParams.a" : "material.sheenParams.a * (1.0 - dielectricF0)";
    const slots = {
      SV: scopeVars,
      AD: SHEEN_DIRECT_MOD(intensityExpr)
    };
    if (hasIbl) {
      slots.AI = SHEEN_IBL_MOD(intensityExpr, hasAlbedoScaling) + SHEEN_IBL_COLOR_MOD(hasAlbedoScaling);
    } else {
      slots.NI = SHEEN_NON_IBL_MOD;
    }
    const bindings = [];
    if (hasSheenTexture) {
      bindings.push(
        { _name: "sheenTexture_", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT15 },
        { _name: "sheenSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT15 }
      );
    }
    const uboFields = [
      { _name: "sheenParams", _type: "vec4<f32>" },
      { _name: "sheenParams2", _type: "vec4<f32>" }
    ];
    if (hasSheenUvTx) {
      uboFields.push({ _name: "sheenUVm", _type: "vec4<f32>" }, { _name: "sheenUVt", _type: "vec4<f32>" });
    }
    return {
      _id: "sheen",
      _dependencies: hasIbl ? ["ibl"] : void 0,
      _uboFields: uboFields,
      _bindings: bindings,
      _helperFunctions: SHEEN_HELPERS,
      _fragmentSlots: slots
    };
  }
  function writeSheenUBO(data, material, offsets) {
    const sh = material.sheen;
    if (!sh?.isEnabled || !offsets.has("sheenParams")) {
      return;
    }
    const off = offsets.get("sheenParams") / 4;
    const color = sh.color ?? [1, 1, 1];
    data[off] = color[0];
    data[off + 1] = color[1];
    data[off + 2] = color[2];
    data[off + 3] = sh.intensity ?? 1;
    data[off + 4] = sh.roughness ?? 0;
    data[off + 5] = sh.texture ? 1 : 0;
    const mOff = offsets.get("sheenUVm");
    const tOff = offsets.get("sheenUVt");
    if (mOff === void 0 || tOff === void 0) {
      return;
    }
    const tex = sh.texture;
    const sx = tex?.uScale ?? 1;
    const sy = tex?.vScale ?? 1;
    const ang = tex?.uAng ?? 0;
    const ox = tex?.uOffset ?? 0;
    const oy = tex?.vOffset ?? 0;
    const mi = mOff / 4;
    const ti = tOff / 4;
    if (ang === 0) {
      data[mi] = sx;
      data[mi + 1] = 0;
      data[mi + 2] = 0;
      data[mi + 3] = sy;
    } else {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      data[mi] = c * sx;
      data[mi + 1] = -s * sy;
      data[mi + 2] = s * sx;
      data[mi + 3] = c * sy;
    }
    data[ti] = ox;
    data[ti + 1] = oy;
    data[ti + 2] = 0;
    data[ti + 3] = 0;
  }
  var STAGE_FRAGMENT15, SHEEN_HELPERS, SHEEN_DIRECT_MOD, SHEEN_IBL_MOD, SHEEN_IBL_COLOR_MOD, SHEEN_NON_IBL_MOD, pbrExt5;
  var init_sheen_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/sheen-fragment.ts"() {
      "use strict";
      init_pbr_flag_bits();
      STAGE_FRAGMENT15 = 2;
      SHEEN_HELPERS = `
fn normalDistributionFunction_CharlieSheen(NdotH_sh: f32, alphaG_sh: f32) -> f32 {
let invR = 1.0 / alphaG_sh;
let cos2h = NdotH_sh * NdotH_sh;
let sin2h = 1.0 - cos2h;
return (2.0 + invR) * pow(sin2h, invR * 0.5) / (2.0 * 3.141592653589793);
}
fn visibility_Ashikhmin(NdotL_sh: f32, NdotV_sh: f32) -> f32 {
return 1.0 / (4.0 * (NdotL_sh + NdotV_sh - NdotL_sh * NdotV_sh));
}
`;
      SHEEN_DIRECT_MOD = (intensityExpr) => `
{
let shIntensity = ${intensityExpr};
let shColorScaled = sheenColorFinal * shIntensity;
let shRoughness_clamped = max(sheenRoughnessAdjusted, AA_factor_x);
let shAlphaG = shRoughness_clamped * shRoughness_clamped + 0.0005;
let shD = normalDistributionFunction_CharlieSheen(NdotH, shAlphaG);
let shV = visibility_Ashikhmin(NdotL, NdotV);
sheenDirectTerm = shColorScaled * shD * shV * NdotL * lightColor * lightAtten * material.directIntensity;
}
`;
      SHEEN_IBL_MOD = (intensityExpr, albedoScaling) => `
{
let shIntensity_ibl = ${intensityExpr};
let shColorScaled = sheenColorFinal * shIntensity_ibl;
let shRoughness_ibl = sheenRoughnessAdjusted;
let shAlphaG_ibl = shRoughness_ibl * shRoughness_ibl + 0.0005 + AA_factor_y;
var shSpecLod = log2(cubemapDim * shAlphaG_ibl) * scene.vImageInfos.z;
let shEnvRadiance = textureSampleLevel(iblTexture, iblSampler, R, clamp(shSpecLod, 0.0, maxLod)).rgb * material.environmentIntensity;
let shBrdf = textureSampleLevel(brdfLUT, brdfSampler_, vec2<f32>(NdotV, shRoughness_ibl), 0.0);
let shEnvReflectance = shColorScaled * shBrdf.b${albedoScaling ? " * seo * eho" : ""};
sheenIblTerm = shEnvRadiance * shEnvReflectance;
${albedoScaling ? "let shMax = max(shColorScaled.r, max(shColorScaled.g, shColorScaled.b));\nsheenAlbedoScaling = 1.0 - shMax * shBrdf.b;" : ""}
}
`;
      SHEEN_IBL_COLOR_MOD = (albedoScaling) => albedoScaling ? `
{
color = (finalIrradiance
      + finalRadianceScaled
      + finalSpecularScaled
      + directDiffuse) * sheenAlbedoScaling
      + sheenDirectTerm
      + sheenIblTerm
      + emissive;
}
` : `
{
color = finalIrradiance
      + finalRadianceScaled
      + finalSpecularScaled
      + directDiffuse
      + sheenDirectTerm
      + sheenIblTerm
      + emissive;
}
`;
      SHEEN_NON_IBL_MOD = `
{
color = color + sheenDirectTerm;
}
`;
      pbrExt5 = {
        id: "sheen",
        phase: "base-tex",
        detect(mat) {
          const sh = mat.sheen;
          if (!sh?.isEnabled) {
            return { f: 0, f2: 0 };
          }
          let f = PBR_HAS_SHEEN;
          let f2 = 0;
          if (sh.texture) {
            f |= PBR_HAS_SHEEN_TEXTURE;
            if (sh.texture._hasTx) {
              f2 |= PBR2_HAS_SHEEN_UV_TX;
            }
          }
          if (sh.albedoScaling) {
            f |= PBR_HAS_SHEEN_ALBEDO_SCALING;
          }
          return { f, f2 };
        },
        frag(ctx) {
          if (!(ctx._features & PBR_HAS_SHEEN)) {
            return null;
          }
          return createSheenFragment(
            (ctx._features & PBR_HAS_SHEEN_TEXTURE) !== 0,
            ctx._hasIbl,
            (ctx._features & PBR_HAS_SHEEN_ALBEDO_SCALING) !== 0,
            (ctx._features2 & PBR2_HAS_SHEEN_UV_TX) !== 0
          );
        },
        writeUbo: writeSheenUBO,
        bind(ctx, entries, b) {
          if ((ctx._features & PBR_HAS_SHEEN_TEXTURE) === 0) {
            return b;
          }
          const sh = ctx._material.sheen;
          if (sh?.texture) {
            entries.push({ binding: b++, resource: sh.texture.view });
            entries.push({ binding: b++, resource: sh.texture.sampler });
          }
          return b;
        },
        textures(mat, out) {
          const sh = mat.sheen;
          if (sh?.texture) {
            out.push(sh.texture);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/iridescence-fragment.ts
  var iridescence_fragment_exports = {};
  __export(iridescence_fragment_exports, {
    pbrExt: () => pbrExt6,
    writeIridescenceUBO: () => writeIridescenceUBO
  });
  function uvBaseExpr(features2, meshFeatures, uv2Flag) {
    return (features2 & uv2Flag) !== 0 && (meshFeatures & IRI_MSH_HAS_UV2) !== 0 ? "input.uv2" : "input.uv";
  }
  function uvDecl(name, baseUv, hasTx) {
    return hasTx ? `let ${name}=vec2<f32>(dot(material.${name}m.xy,${baseUv}),dot(material.${name}m.zw,${baseUv}))+material.${name}t.xy;` : `let ${name}=${baseUv};`;
  }
  function uvTransformUboFields(name) {
    return [
      { _name: `${name}m`, _type: "vec4<f32>" },
      { _name: `${name}t`, _type: "vec4<f32>" }
    ];
  }
  function writeUvTransform(data, offsets, name, tex) {
    const mOff = offsets.get(`${name}m`);
    const tOff = offsets.get(`${name}t`);
    if (mOff === void 0 || tOff === void 0) {
      return;
    }
    const mi = mOff / 4;
    const ti = tOff / 4;
    const sx = tex?.uScale ?? 1;
    const sy = tex?.vScale ?? 1;
    const ang = tex?.uAng ?? 0;
    const ox = tex?.uOffset ?? 0;
    const oy = tex?.vOffset ?? 0;
    if (ang === 0) {
      data[mi] = sx;
      data[mi + 1] = 0;
      data[mi + 2] = 0;
      data[mi + 3] = sy;
    } else {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      data[mi] = c * sx;
      data[mi + 1] = -s * sy;
      data[mi + 2] = s * sx;
      data[mi + 3] = c * sy;
    }
    data[ti] = ox;
    data[ti + 1] = oy;
    data[ti + 2] = 0;
    data[ti + 3] = 0;
  }
  function createIridescenceFragment(features, features2, meshFeatures) {
    if ((features2 & PBR2_HAS_IRIDESCENCE) === 0) {
      return null;
    }
    const hasIntensityMap = (features2 & PBR2_HAS_IRIDESCENCE_MAP) !== 0;
    const hasThicknessMap = (features2 & PBR2_HAS_IRIDESCENCE_THICKNESS_MAP) !== 0;
    const hasIntensityUvTx = (features2 & PBR2_HAS_IRIDESCENCE_UV_TX) !== 0;
    const hasThicknessUvTx = (features2 & PBR2_HAS_IRIDESCENCE_THICKNESS_UV_TX) !== 0;
    const bindings = [];
    const uboFields = [{ _name: "iridescenceParams", _type: "vec4<f32>" }];
    if (hasIntensityMap) {
      bindings.push(
        { _name: "iridescenceTexture", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT16 },
        { _name: "iridescenceSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT16 }
      );
      if (hasIntensityUvTx) {
        uboFields.push(...uvTransformUboFields("iridescenceUV"));
      }
    }
    if (hasThicknessMap) {
      bindings.push(
        { _name: "iridescenceThicknessTexture", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT16 },
        { _name: "iridescenceThicknessSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT16 }
      );
      if (hasThicknessUvTx) {
        uboFields.push(...uvTransformUboFields("iridescenceThicknessUV"));
      }
    }
    const scopeVars = [];
    if (hasIntensityMap) {
      scopeVars.push(uvDecl("iridescenceUV", uvBaseExpr(features2, meshFeatures, PBR2_HAS_IRIDESCENCE_UV2), hasIntensityUvTx));
    }
    if (hasThicknessMap) {
      scopeVars.push(uvDecl("iridescenceThicknessUV", uvBaseExpr(features2, meshFeatures, PBR2_HAS_IRIDESCENCE_THICKNESS_UV2), hasThicknessUvTx));
    }
    const intensity = hasIntensityMap ? "material.iridescenceParams.x*textureSample(iridescenceTexture,iridescenceSampler_,iridescenceUV).r" : "material.iridescenceParams.x";
    const thickness = hasThicknessMap ? "mix(material.iridescenceParams.z,material.iridescenceParams.w,textureSample(iridescenceThicknessTexture,iridescenceThicknessSampler_,iridescenceThicknessUV).g)" : "material.iridescenceParams.w";
    return {
      _id: "iridescence",
      _dependencies: (features & (PBR_HAS_METALLIC_REFLECTANCE_MAP | PBR_HAS_REFLECTANCE_MAP)) !== 0 || (features2 & PBR2_HAS_REFLECTANCE_FACTORS) !== 0 ? ["reflectance"] : void 0,
      _uboFields: uboFields,
      _bindings: bindings,
      _helperFunctions: IRIDESCENCE_HELPERS,
      _fragmentSlots: {
        ...scopeVars.length ? { SV: scopeVars.join("\n") } : void 0,
        MF: `{
let iriIntensity=clamp(${intensity},0.0,1.0);
let iriThickness=max(${thickness},0.0);
let iriF0=iri_eval(1.0,max(material.iridescenceParams.y,1.0001),NdotV,iriThickness,colorF0);
colorF0=mix(colorF0,iriF0,iriIntensity);
}`
      }
    };
  }
  function writeIridescenceUBO(data, material, offsets) {
    const iri = material.iridescence;
    if (!iri?.isEnabled || !offsets.has("iridescenceParams")) {
      return;
    }
    const off = offsets.get("iridescenceParams") / 4;
    data[off] = iri.intensity ?? 1;
    data[off + 1] = iri.indexOfRefraction ?? 1.3;
    data[off + 2] = iri.minimumThickness ?? 100;
    data[off + 3] = iri.maximumThickness ?? 400;
    writeUvTransform(data, offsets, "iridescenceUV", iri.texture);
    writeUvTransform(data, offsets, "iridescenceThicknessUV", iri.thicknessTexture);
  }
  var STAGE_FRAGMENT16, PBR2_HAS_IRIDESCENCE_UV_TX, PBR2_HAS_IRIDESCENCE_THICKNESS_UV_TX, PBR2_HAS_IRIDESCENCE_UV2, PBR2_HAS_IRIDESCENCE_THICKNESS_UV2, IRI_MSH_HAS_UV2, IRIDESCENCE_HELPERS, IRI_TEX, pbrExt6;
  var init_iridescence_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/iridescence-fragment.ts"() {
      "use strict";
      init_pbr_flag_bits();
      STAGE_FRAGMENT16 = 2;
      PBR2_HAS_IRIDESCENCE_UV_TX = 1 << 20;
      PBR2_HAS_IRIDESCENCE_THICKNESS_UV_TX = 1 << 21;
      PBR2_HAS_IRIDESCENCE_UV2 = 1 << 22;
      PBR2_HAS_IRIDESCENCE_THICKNESS_UV2 = 1 << 23;
      IRI_MSH_HAS_UV2 = 1 << 7;
      IRIDESCENCE_HELPERS = `const IRI_XYZ_TO_REC709:mat3x3<f32>=mat3x3<f32>(
3.2404542,-0.9692660,0.0556434,
-1.5371385,1.8760108,-0.2040259,
-0.4985314,0.0415560,1.0572252);
fn iri_square3(x:vec3<f32>)->vec3<f32>{return x*x;}
fn iri_iorFromAirF0(f0:vec3<f32>)->vec3<f32>{
let s=sqrt(clamp(f0,vec3<f32>(0.0),vec3<f32>(0.9999)));
return (vec3<f32>(1.0)+s)/(vec3<f32>(1.0)-s);
}
fn iri_r0FromIor3(iorT:vec3<f32>,iorI:f32)->vec3<f32>{return iri_square3((iorT-vec3<f32>(iorI))/(iorT+vec3<f32>(iorI)));}
fn iri_r0FromIor(iorT:f32,iorI:f32)->f32{let r=(iorT-iorI)/(iorT+iorI);return r*r;}
fn iri_fresSchlick(c:f32,F0:vec3<f32>,F90:vec3<f32>)->vec3<f32>{
let t=1.0-c;
let t2=t*t;
return F0+(F90-F0)*(t2*t2*t);
}
fn iri_evalSensitivity(opd:f32,shift:vec3<f32>)->vec3<f32>{
let phase=6.283185307179586*opd*1.0e-9;
let val=vec3<f32>(5.4856e-13,4.4201e-13,5.2481e-13);
let pos=vec3<f32>(1.6810e+06,1.7953e+06,2.2084e+06);
let vr=vec3<f32>(4.3278e+09,9.3046e+09,6.6121e+09);
var xyz=val*sqrt(6.283185307179586*vr)*cos(pos*phase+shift)*exp(-(phase*phase)*vr);
xyz.x=xyz.x+9.7470e-14*sqrt(6.283185307179586*4.5282e+09)*cos(2.2399e+06*phase+shift.x)*exp(-4.5282e+09*phase*phase);
xyz=xyz/1.0685e-7;
return IRI_XYZ_TO_REC709*xyz;
}
fn iri_eval(outsideIor:f32,eta2:f32,cosTheta1:f32,thickness:f32,baseF0:vec3<f32>)->vec3<f32>{
let iridescenceIor=mix(outsideIor,eta2,smoothstep(0.0,0.03,thickness));
let eta=outsideIor/iridescenceIor;
let sinTheta2Sq=eta*eta*(1.0-cosTheta1*cosTheta1);
let cosTheta2Sq=1.0-sinTheta2Sq;
if(cosTheta2Sq<0.0){return vec3<f32>(1.0);}
let cosTheta2=sqrt(cosTheta2Sq);
let r0=iri_r0FromIor(iridescenceIor,outsideIor);
let r12=iri_fresSchlick(cosTheta1,vec3<f32>(r0),vec3<f32>(1.0)).x;
let t121=1.0-r12;
var phi12=0.0;
if(iridescenceIor<outsideIor){phi12=3.141592653589793;}
let phi21=3.141592653589793-phi12;
let baseIor=iri_iorFromAirF0(baseF0);
let r1=iri_r0FromIor3(baseIor,iridescenceIor);
let r23=iri_fresSchlick(cosTheta2,r1,vec3<f32>(1.0));
var phi23=vec3<f32>(0.0);
if(baseIor.x<iridescenceIor){phi23.x=3.141592653589793;}
if(baseIor.y<iridescenceIor){phi23.y=3.141592653589793;}
if(baseIor.z<iridescenceIor){phi23.z=3.141592653589793;}
let opd=2.0*iridescenceIor*thickness*cosTheta2;
let phi=vec3<f32>(phi21)+phi23;
let r123=clamp(vec3<f32>(r12)*r23,vec3<f32>(1e-5),vec3<f32>(0.9999));
let smallR123=sqrt(r123);
let rs=(t121*t121)*r23/(vec3<f32>(1.0)-r123);
var outI=vec3<f32>(r12)+rs;
var cm=rs-vec3<f32>(t121);
for(var m:i32=1;m<=2;m=m+1){
cm=cm*smallR123;
outI=outI+cm*(2.0*iri_evalSensitivity(f32(m)*opd,f32(m)*phi));
}
return max(outI,vec3<f32>(0.0));
}`;
      IRI_TEX = [
        [PBR2_HAS_IRIDESCENCE_MAP, "texture"],
        [PBR2_HAS_IRIDESCENCE_THICKNESS_MAP, "thicknessTexture"]
      ];
      pbrExt6 = {
        id: "iridescence",
        phase: "base-tex",
        detect(mat) {
          const iri = mat.iridescence;
          if (!iri?.isEnabled) {
            return { f: 0, f2: 0 };
          }
          let f2 = PBR2_HAS_IRIDESCENCE;
          if (iri.texture) {
            f2 |= PBR2_HAS_IRIDESCENCE_MAP;
            if (iri.texture._hasTx) {
              f2 |= PBR2_HAS_IRIDESCENCE_UV_TX;
            }
            if (iri.texture._texCoord === 1) {
              f2 |= PBR2_HAS_IRIDESCENCE_UV2;
            }
          }
          if (iri.thicknessTexture) {
            f2 |= PBR2_HAS_IRIDESCENCE_THICKNESS_MAP;
            if (iri.thicknessTexture._hasTx) {
              f2 |= PBR2_HAS_IRIDESCENCE_THICKNESS_UV_TX;
            }
            if (iri.thicknessTexture._texCoord === 1) {
              f2 |= PBR2_HAS_IRIDESCENCE_THICKNESS_UV2;
            }
          }
          return { f: 0, f2 };
        },
        frag: (ctx) => createIridescenceFragment(ctx._features, ctx._features2, ctx._meshFeatures),
        writeUbo: writeIridescenceUBO,
        bind(ctx, entries, b) {
          const iri = ctx._material.iridescence;
          if (!iri) {
            return b;
          }
          for (const [flag, key] of IRI_TEX) {
            const tex = iri[key];
            if ((ctx._features2 & flag) !== 0 && tex) {
              entries.push({ binding: b++, resource: tex.view });
              entries.push({ binding: b++, resource: tex.sampler });
            }
          }
          return b;
        },
        textures(mat, t) {
          const iri = mat.iridescence;
          if (!iri) {
            return;
          }
          for (const [, key] of IRI_TEX) {
            const tex = iri[key];
            if (tex) {
              t.push(tex);
            }
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/subsurface-fragment.ts
  var subsurface_fragment_exports = {};
  __export(subsurface_fragment_exports, {
    createSubsurfaceFragment: () => createSubsurfaceFragment,
    pbrExt: () => pbrExt7,
    writeSubsurfaceUBO: () => writeSubsurfaceUBO
  });
  function makeThicknessBlock(hasThicknessMap, useGltfChannel) {
    const chan = useGltfChannel ? "g" : "r";
    const texSample = hasThicknessMap ? `let thicknessSample = textureSample(thicknessTexture_, thicknessSampler_, input.uv).${chan};` : `let thicknessSample = 1.0;`;
    return `${texSample}
let ssThickness = max(material.subsurfaceParams.y + thicknessSample * material.subsurfaceParams.z, 0.000001);
let ssTranslucencyColor = material.subsurfaceParams3.rgb;
let ssDiffDist = material.subsurfaceParams2.rgb;
ssIntensity = material.subsurfaceParams.x;
ssTransmittance = transmittanceBRDF_Burley(ssTranslucencyColor, ssDiffDist, ssThickness) * ssIntensity;`;
  }
  function createSubsurfaceFragment(hasThicknessMap, hasIbl, useGltfThicknessChannel) {
    const bindings = hasThicknessMap ? [
      { _name: "thicknessTexture_", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT17 },
      { _name: "thicknessSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT17 }
    ] : [];
    const slots = {
      SV: SS_SCOPE_VARS,
      AT: makeThicknessBlock(hasThicknessMap, useGltfThicknessChannel),
      AD: SS_DIRECT
    };
    if (hasIbl) {
      slots.AI = SS_IBL_MOD;
    } else {
      slots.NI = SS_NO_IBL_MOD;
    }
    const deps = [];
    if (hasIbl) {
      deps.push("ibl");
    }
    return {
      _id: "subsurface",
      _dependencies: deps.length > 0 ? deps : void 0,
      _bindings: bindings.length > 0 ? bindings : void 0,
      _uboFields: [
        { _name: "subsurfaceParams", _type: "vec4<f32>" },
        { _name: "subsurfaceParams2", _type: "vec4<f32>" },
        { _name: "subsurfaceParams3", _type: "vec4<f32>" }
      ],
      _helperFunctions: SS_HELPERS,
      _fragmentSlots: slots
    };
  }
  function writeSubsurfaceUBO(data, ss, offsets) {
    const trans = ss.translucency;
    const thick = ss.thickness;
    const off = offsets.get("subsurfaceParams") / 4;
    data[off] = trans.intensity ?? 1;
    const minThick = thick?.min ?? 0;
    const maxThick = thick?.max ?? 1;
    data[off + 1] = minThick;
    data[off + 2] = maxThick - minThick;
    const off2 = offsets.get("subsurfaceParams2") / 4;
    const dd = trans.diffusionDistance ?? [1, 1, 1];
    data[off2] = dd[0];
    data[off2 + 1] = dd[1];
    data[off2 + 2] = dd[2];
    const off3 = offsets.get("subsurfaceParams3") / 4;
    const tc = trans.color ?? [1, 1, 1];
    data[off3] = tc[0];
    data[off3 + 1] = tc[1];
    data[off3 + 2] = tc[2];
  }
  var SS_HELPERS, SS_SCOPE_VARS, SS_DIRECT, SS_IBL_MOD, SS_NO_IBL_MOD, STAGE_FRAGMENT17, pbrExt7;
  var init_subsurface_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/subsurface-fragment.ts"() {
      "use strict";
      init_pbr_flag_bits();
      SS_HELPERS = `
fn transmittanceBRDF_Burley(tintColor: vec3<f32>, diffusionDistance: vec3<f32>, thickness: f32) -> vec3<f32> {
let S = 1.0 / max(vec3<f32>(0.000001), diffusionDistance);
let temp = exp((-0.333333333 * thickness) * S);
return tintColor * 0.25 * (temp * temp * temp + 3.0 * temp);
}
fn computeWrappedDiffuseNdotL(NdotL: f32, w: f32) -> f32 {
let t = 1.0 + w;
let invt2 = 1.0 / (t * t);
return saturate((NdotL + w) * invt2);
}
`;
      SS_SCOPE_VARS = `var translucencyDirect = vec3<f32>(0.0);
var ssTransmittance = vec3<f32>(0.0);
var ssIntensity = 0.0;`;
      SS_DIRECT = `{
let NdotLU = dot(N, L);
if (NdotLU < 0.0) {
let wrapNdotL = computeWrappedDiffuseNdotL(abs(NdotLU), 0.02);
translucencyDirect += (1.0 / PI) * wrapNdotL * ssTransmittance * lightAtten * lightColor * material.directIntensity;
}
}`;
      SS_IBL_MOD = `{
let N_back = -N_env;
let envIrrBack = (scene.vSphericalL00.rgb
  + scene.vSphericalL1_1.rgb * N_back.y + scene.vSphericalL10.rgb * N_back.z + scene.vSphericalL11.rgb * N_back.x
  + scene.vSphericalL2_2.rgb * (N_back.y * N_back.x) + scene.vSphericalL2_1.rgb * (N_back.y * N_back.z)
  + scene.vSphericalL20.rgb * (3.0 * N_back.z * N_back.z - 1.0) + scene.vSphericalL21.rgb * (N_back.z * N_back.x)
  + scene.vSphericalL22.rgb * (N_back.x * N_back.x - N_back.y * N_back.y)) * material.environmentIntensity;
let refractionIrradiance = envIrrBack * ssTransmittance;
color -= finalIrradiance * ssIntensity;
color += refractionIrradiance * occlusion;
color -= directDiffuse * ssIntensity;
color += translucencyDirect * occlusion;
}`;
      SS_NO_IBL_MOD = `color -= directDiffuse * ssIntensity;
color += translucencyDirect;`;
      STAGE_FRAGMENT17 = 2;
      pbrExt7 = {
        id: "subsurface",
        phase: "fragment",
        detect(mat) {
          const m = mat;
          if (!m.subsurface?.translucency) {
            return { f: 0, f2: 0 };
          }
          let f = PBR_HAS_SUBSURFACE;
          let f2 = 0;
          if (m.subsurface.thickness?.texture) {
            f |= PBR_HAS_THICKNESS_MAP;
          }
          if (m.subsurface.thickness?.useGlTFChannel) {
            f2 |= PBR2_HAS_THICKNESS_GLTF_CHANNEL;
          }
          return { f, f2 };
        },
        frag(ctx) {
          if (!(ctx._features & PBR_HAS_SUBSURFACE)) {
            return null;
          }
          return createSubsurfaceFragment((ctx._features & PBR_HAS_THICKNESS_MAP) !== 0, ctx._hasIbl, (ctx._features2 & PBR2_HAS_THICKNESS_GLTF_CHANNEL) !== 0);
        },
        writeUbo(data, mat, offsets) {
          const m = mat;
          if (m.subsurface?.translucency && offsets.has("subsurfaceParams")) {
            writeSubsurfaceUBO(data, m.subsurface, offsets);
          }
        },
        bind(ctx, entries, b) {
          if ((ctx._features & PBR_HAS_THICKNESS_MAP) !== 0) {
            const tex = ctx._material.subsurface?.thickness?.texture;
            if (tex) {
              entries.push({ binding: b++, resource: tex.view });
              entries.push({ binding: b++, resource: tex.sampler });
            }
          }
          return b;
        },
        textures(mat, out) {
          const t = mat.subsurface?.thickness?.texture;
          if (t) {
            out.push(t);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/refraction-dispersion-wgsl.ts
  var refraction_dispersion_wgsl_exports = {};
  __export(refraction_dispersion_wgsl_exports, {
    DISPERSION_SAMPLE_WGSL: () => DISPERSION_SAMPLE_WGSL
  });
  var DISPERSION_SAMPLE_WGSL;
  var init_refraction_dispersion_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/refraction-dispersion-wgsl.ts"() {
      "use strict";
      DISPERSION_SAMPLE_WGSL = `let eta=material.refractionParams.y;
let realIOR=1.0/eta;
let spread=0.04*material.volumeParams.w*(realIOR-1.0);
let etaR=1.0/(realIOR-spread);
let etaB=1.0/(realIOR+spread);
let cpR=scene.viewProjection*vec4<f32>(input.worldPos+refract(-V,N,etaR)*th,1.0);
let cpG=scene.viewProjection*vec4<f32>(input.worldPos+refract(-V,N,eta)*th,1.0);
let cpB=scene.viewProjection*vec4<f32>(input.worldPos+refract(-V,N,etaB)*th,1.0);
let uvR=(cpR.xy/cpR.w)*vec2<f32>(0.5,-0.5)+vec2<f32>(0.5,0.5);
let uvG=(cpG.xy/cpG.w)*vec2<f32>(0.5,-0.5)+vec2<f32>(0.5,0.5);
let uvB=(cpB.xy/cpB.w)*vec2<f32>(0.5,-0.5)+vec2<f32>(0.5,0.5);
let er=vec3<f32>(textureSampleLevel(refractionTexture,refractionSampler_,uvR,lv).r,textureSampleLevel(refractionTexture,refractionSampler_,uvG,lv).g,textureSampleLevel(refractionTexture,refractionSampler_,uvB,lv).b)*material.environmentIntensity;`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/refraction-rtt-fragment.ts
  function makeRefractionMod(hasVolume, hasMap, hasThicknessMap, useGltfThicknessChannel, hasDispersion, dispersionSampleWgsl) {
    const thicknessScaleLine = hasVolume || hasThicknessMap ? `let ts=max(length(mesh.world[0].xyz),max(length(mesh.world[1].xyz),length(mesh.world[2].xyz)));` : ``;
    const thicknessLine = hasThicknessMap ? `let ths=textureSample(thicknessTexture_,thicknessSampler_,input.uv).${useGltfThicknessChannel ? "g" : "r"};
let th=(material.thicknessParams.x+ths*material.thicknessParams.y)*ts;` : hasVolume ? `let th=material.refractionParams.z*ts;` : `let th=material.refractionParams.z;`;
    const textureLine = hasMap ? `let ri=material.refractionParams.x*textureSample(refractionMapTexture,refractionMapSampler,input.uv).r;` : `let ri=material.refractionParams.x;`;
    const absorptionLine = hasVolume ? `let ab=exp(material.volumeParams.rgb*th);` : ``;
    const refractionLine = hasVolume ? `let fr=er*surfaceAlbedo*(ri*ab)*(vec3<f32>(1.0)-colorSpecularEnvReflectance.rgb);` : `let fr=er*surfaceAlbedo*ri*(vec3<f32>(1.0)-colorSpecularEnvReflectance.rgb);`;
    const sampleLines = hasDispersion && dispersionSampleWgsl ? dispersionSampleWgsl : `let rd=refract(-V,N,material.refractionParams.y);
let cp=scene.viewProjection*vec4<f32>(input.worldPos+rd*th,1.0);
let ruv=(cp.xy/cp.w)*vec2<f32>(0.5,-0.5)+vec2<f32>(0.5,0.5);
let er=textureSampleLevel(refractionTexture,refractionSampler_,ruv,lv).rgb*material.environmentIntensity;`;
    return `{
${thicknessScaleLine}
${textureLine}
${thicknessLine}
let ro=1.0-ri;
let ra=mix(alphaG,0.0,clamp(material.refractionParams.w*3.0-2.0,0.0,1.0));
let lv=clamp(log2(f32(textureDimensions(refractionTexture).x)*ra)-4.0,0.0,f32(textureNumLevels(refractionTexture)-1));
${sampleLines}
${absorptionLine}
${refractionLine}
color=finalIrradiance*ro*ro+finalRadianceScaled+finalSpecularScaled+directDiffuse*ro*ro+fr+emissive;
}`;
  }
  function createRefractionRttFragment(hasVolume, hasMap, hasThicknessMap, useGltfThicknessChannel, linearImageProcessing, hasDispersion, dispersionSampleWgsl) {
    const uboFields = [{ _name: "refractionParams", _type: "vec4<f32>" }];
    if (hasVolume) {
      uboFields.push({ _name: "volumeParams", _type: "vec4<f32>" });
    }
    if (hasThicknessMap) {
      uboFields.push({ _name: "thicknessParams", _type: "vec4<f32>" });
    }
    const bindings = [
      { _name: "refractionTexture", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: 2 },
      { _name: "refractionSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: 2 }
    ];
    if (hasMap) {
      bindings.push(
        { _name: "refractionMapTexture", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: 2 },
        { _name: "refractionMapSampler", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: 2 }
      );
    }
    if (hasThicknessMap) {
      bindings.push(
        { _name: "thicknessTexture_", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: 2 },
        { _name: "thicknessSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: 2 }
      );
    }
    return {
      _id: "refraction",
      _dependencies: ["ibl"],
      _uboFields: uboFields,
      _bindings: bindings,
      _fragmentSlots: linearImageProcessing ? { AI: makeRefractionMod(hasVolume, hasMap, hasThicknessMap, useGltfThicknessChannel, hasDispersion, dispersionSampleWgsl), ...LINEAR_IMAGE_PROCESSING_SLOTS } : { AI: makeRefractionMod(hasVolume, hasMap, hasThicknessMap, useGltfThicknessChannel, hasDispersion, dispersionSampleWgsl) }
    };
  }
  function writeRefractionUBO(data, mat, offsets) {
    const ss = mat.subsurface;
    const refr = ss?.refraction;
    if (!refr) {
      return;
    }
    const off = offsets.get("refractionParams");
    if (off === void 0) {
      return;
    }
    const o = off / 4;
    data[o] = refr.intensity ?? 0;
    const ior = refr.indexOfRefraction ?? 1.5;
    const thick = ss.thickness;
    data[o + 1] = 1 / (refr.useThicknessAsDepth && thick?.max ? ior : 1);
    data[o + 2] = refr.useThicknessAsDepth ? thick?.max ?? 0 : 1;
    data[o + 3] = 1 / ior;
    const vOff = offsets.get("volumeParams");
    if (vOff !== void 0) {
      const vo = vOff / 4;
      const tint = ss.tint?.color ?? [1, 1, 1];
      const dist = Math.max(ss.tint?.atDistance ?? 1, 1e-4);
      data[vo] = Math.log(Math.max(tint[0], 1e-6)) / dist;
      data[vo + 1] = Math.log(Math.max(tint[1], 1e-6)) / dist;
      data[vo + 2] = Math.log(Math.max(tint[2], 1e-6)) / dist;
      data[vo + 3] = refr.dispersion ?? 0;
    }
    const tOff = offsets.get("thicknessParams");
    if (tOff !== void 0) {
      const to = tOff / 4;
      const min = thick?.min ?? 0;
      const max = thick?.max ?? 1;
      data[to] = min;
      data[to + 1] = max - min;
    }
  }
  function makeRefractionRttExt(dispersionSampleWgsl) {
    return {
      id: "refraction",
      phase: "fragment",
      detect(mat) {
        const m = mat;
        const ss = m.subsurface;
        const refr = ss?.refraction;
        const linearImageProcessing = m._linearImageProcessing ? PBR2_LINEAR_IMAGE_PROCESSING : 0;
        const intensity = m.transmissive ? refr?.intensity ?? 0 : 0;
        if (intensity <= 0) {
          return { f: 0, f2: linearImageProcessing };
        }
        let f = 0;
        let f2 = linearImageProcessing | PBR2_HAS_REFRACTION;
        if (refr?.texture) {
          f2 |= PBR2_HAS_REFRACTION_MAP;
        }
        if (ss?.thickness?.texture) {
          f |= PBR_HAS_THICKNESS_MAP;
        }
        if (ss?.thickness?.useGlTFChannel) {
          f2 |= PBR2_HAS_THICKNESS_GLTF_CHANNEL;
        }
        if (ss?.tint?.atDistance !== void 0) {
          f2 |= PBR2_HAS_VOLUME;
          if (refr?.dispersion) {
            f2 |= PBR2_HAS_DISPERSION;
          }
        }
        return { f, f2 };
      },
      frag(ctx) {
        const linearImageProcessing = (ctx._features2 & PBR2_LINEAR_IMAGE_PROCESSING) !== 0;
        if (!(ctx._features2 & PBR2_HAS_REFRACTION)) {
          return linearImageProcessing ? { _id: "linear", _fragmentSlots: LINEAR_IMAGE_PROCESSING_SLOTS } : null;
        }
        return createRefractionRttFragment(
          (ctx._features2 & PBR2_HAS_VOLUME) !== 0,
          (ctx._features2 & PBR2_HAS_REFRACTION_MAP) !== 0,
          (ctx._features & PBR_HAS_THICKNESS_MAP) !== 0,
          (ctx._features2 & PBR2_HAS_THICKNESS_GLTF_CHANNEL) !== 0,
          linearImageProcessing,
          (ctx._features2 & PBR2_HAS_DISPERSION) !== 0,
          dispersionSampleWgsl
        );
      },
      writeUbo(data, mat, offsets) {
        writeRefractionUBO(data, mat, offsets);
      },
      bind(ctx, entries, b) {
        if (!(ctx._features2 & PBR2_HAS_REFRACTION)) {
          return b;
        }
        const texture = ctx._refractionTexture;
        if (!texture) {
          throw new Error("PBR transmission requires a frame-graph refraction texture.");
        }
        entries.push({ binding: b++, resource: texture.view });
        entries.push({ binding: b++, resource: texture.sampler });
        if ((ctx._features2 & PBR2_HAS_REFRACTION_MAP) !== 0) {
          const map = ctx._material.subsurface?.refraction?.texture;
          entries.push({ binding: b++, resource: map.view });
          entries.push({ binding: b++, resource: getTrilinearAnisotropicSampler(ctx._engine) });
        }
        if ((ctx._features & PBR_HAS_THICKNESS_MAP) !== 0) {
          const thickness = ctx._material.subsurface?.thickness?.texture;
          entries.push({ binding: b++, resource: thickness.view });
          entries.push({ binding: b++, resource: thickness.sampler });
        }
        return b;
      },
      textures(mat, out) {
        const tex = mat.subsurface?.refraction?.texture;
        if (tex) {
          out.push(tex);
        }
        const thickness = mat.subsurface?.thickness?.texture;
        if (thickness) {
          out.push(thickness);
        }
      }
    };
  }
  var LINEAR_IMAGE_PROCESSING_SLOTS;
  var init_refraction_rtt_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/refraction-rtt-fragment.ts"() {
      "use strict";
      init_trilinear_anisotropic_sampler();
      init_pbr_flag_bits();
      LINEAR_IMAGE_PROCESSING_SLOTS = { NI: `if(scene.vImageInfos.w>=0.0){`, BC: `}` };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-transmission-ext.ts
  var pbr_transmission_ext_exports = {};
  __export(pbr_transmission_ext_exports, {
    registerPbrTransmission: () => registerPbrTransmission
  });
  function registerPbrTransmission(scene, engine, register, dispersionSampleWgsl) {
    enableSceneTransmission(scene, engine);
    register(makeRefractionRttExt(dispersionSampleWgsl));
  }
  var init_pbr_transmission_ext = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-transmission-ext.ts"() {
      "use strict";
      init_transmission();
      init_refraction_rtt_fragment();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-refraction.ts
  var pbr_refraction_exports = {};
  __export(pbr_refraction_exports, {
    registerPbrRefraction: () => registerPbrRefraction
  });
  async function registerPbrRefraction(scene, engine, register) {
    let dispersionSampleWgsl;
    for (const mesh of scene.meshes) {
      const refr = mesh.material?.subsurface?.refraction;
      if (refr?.dispersion) {
        dispersionSampleWgsl = (await Promise.resolve().then(() => (init_refraction_dispersion_wgsl(), refraction_dispersion_wgsl_exports))).DISPERSION_SAMPLE_WGSL;
        break;
      }
    }
    const mod = await Promise.resolve().then(() => (init_pbr_transmission_ext(), pbr_transmission_ext_exports));
    mod.registerPbrTransmission(scene, engine, register, dispersionSampleWgsl);
  }
  var init_pbr_refraction = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-refraction.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/emissive-fragment.ts
  var emissive_fragment_exports = {};
  __export(emissive_fragment_exports, {
    createEmissiveColorFragment: () => createEmissiveColorFragment,
    pbrExt: () => pbrExt8,
    writeEmissiveUBO: () => writeEmissiveUBO
  });
  function createEmissiveColorFragment(hasEmissiveTexture) {
    return {
      _id: "emissive-color",
      _uboFields: [
        { _name: "emissiveColor", _type: "vec3<f32>" },
        { _name: "_emissiveColorPad", _type: "f32" }
      ],
      _fragmentSlots: {
        AT: hasEmissiveTexture ? `emissive=material.emissiveColor*textureSample(emissiveTexture,emissiveSampler,input.uv).rgb;` : `emissive=material.emissiveColor;`
      }
    };
  }
  function writeEmissiveUBO(data, material, offsets) {
    if (!material.emissiveColor || !offsets.has("emissiveColor")) {
      return;
    }
    const off = offsets.get("emissiveColor") / 4;
    data[off] = material.emissiveColor[0];
    data[off + 1] = material.emissiveColor[1];
    data[off + 2] = material.emissiveColor[2];
  }
  var pbrExt8;
  var init_emissive_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/emissive-fragment.ts"() {
      "use strict";
      init_pbr_flag_bits();
      pbrExt8 = {
        id: "emissive-color",
        phase: "fragment",
        frag(ctx) {
          if (!(ctx._features & PBR_HAS_EMISSIVE_COLOR)) {
            return null;
          }
          return createEmissiveColorFragment((ctx._features & PBR_HAS_EMISSIVE) !== 0);
        },
        writeUbo: writeEmissiveUBO
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/unlit-fragment.ts
  var unlit_fragment_exports = {};
  __export(unlit_fragment_exports, {
    createUnlitFragment: () => createUnlitFragment,
    pbrExt: () => pbrExt9,
    writeUnlitUBO: () => writeUnlitUBO
  });
  function createUnlitFragment(hasIbl) {
    const assign = `color = baseColor * material.unlitColor;`;
    return {
      _id: "unlit",
      _dependencies: hasIbl ? ["ibl"] : void 0,
      _uboFields: [
        { _name: "unlitColor", _type: "vec3<f32>" },
        { _name: "_unlitColorPad", _type: "f32" }
      ],
      _fragmentSlots: hasIbl ? { AI: assign } : { NI: assign }
    };
  }
  function writeUnlitUBO(data, material, offsets) {
    if (!material.unlit || !offsets.has("unlitColor")) {
      return;
    }
    const off = offsets.get("unlitColor") / 4;
    const tint = material.unlitColor ?? [1, 1, 1];
    data[off] = tint[0];
    data[off + 1] = tint[1];
    data[off + 2] = tint[2];
  }
  var pbrExt9;
  var init_unlit_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/unlit-fragment.ts"() {
      "use strict";
      init_pbr_flag_bits();
      pbrExt9 = {
        id: "unlit",
        phase: "fragment",
        detect(mat) {
          return mat.unlit ? { f: 0, f2: PBR2_HAS_UNLIT } : { f: 0, f2: 0 };
        },
        frag(ctx) {
          if (!(ctx._features2 & PBR2_HAS_UNLIT)) {
            return null;
          }
          return createUnlitFragment(ctx._hasIbl);
        },
        writeUbo: writeUnlitUBO
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/skeleton-fragment.ts
  var skeleton_fragment_exports = {};
  __export(skeleton_fragment_exports, {
    createSkeletonFragment: () => createSkeletonFragment,
    pbrExt: () => pbrExt10
  });
  function makeSkinningCode(has8Bones) {
    let code = `var influence: mat4x4<f32> = readMatrixFromRawSampler(boneSampler, f32(joints[0])) * weights[0];
influence = influence + readMatrixFromRawSampler(boneSampler, f32(joints[1])) * weights[1];
influence = influence + readMatrixFromRawSampler(boneSampler, f32(joints[2])) * weights[2];
influence = influence + readMatrixFromRawSampler(boneSampler, f32(joints[3])) * weights[3];`;
    if (has8Bones) {
      code += `
influence = influence + readMatrixFromRawSampler(boneSampler, f32(joints1[0])) * weights1[0];
influence = influence + readMatrixFromRawSampler(boneSampler, f32(joints1[1])) * weights1[1];
influence = influence + readMatrixFromRawSampler(boneSampler, f32(joints1[2])) * weights1[2];
influence = influence + readMatrixFromRawSampler(boneSampler, f32(joints1[3])) * weights1[3];`;
    }
    code += `
finalWorld = mesh.world * influence;`;
    return code;
  }
  function createSkeletonFragment(has8Bones) {
    return {
      _id: "skeleton",
      _vertexAttributes: [
        { _name: "joints", _type: "vec4<u32>", _gpuFormat: "uint32x4", _arrayStride: 16 },
        { _name: "weights", _type: "vec4<f32>", _gpuFormat: "float32x4", _arrayStride: 16 },
        ...has8Bones ? [
          { _name: "joints1", _type: "vec4<u32>", _gpuFormat: "uint32x4", _arrayStride: 16 },
          { _name: "weights1", _type: "vec4<f32>", _gpuFormat: "float32x4", _arrayStride: 16 }
        ] : []
      ],
      _vertexBindings: [
        { _name: "boneSampler", _type: { _kind: "texture", _textureType: "texture_2d<f32>", _sampleType: "unfilterable-float" }, _visibility: STAGE_VERTEX4 }
      ],
      _vertexHelperFunctions: SKELETON_HELPERS,
      _vertexSlots: {
        VW: makeSkinningCode(has8Bones)
      }
    };
  }
  var STAGE_VERTEX4, SKELETON_HELPERS, pbrExt10;
  var init_skeleton_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/skeleton-fragment.ts"() {
      "use strict";
      init_mesh_features();
      STAGE_VERTEX4 = 1;
      SKELETON_HELPERS = `
fn readMatrixFromRawSampler(smp: texture_2d<f32>, index: f32) -> mat4x4<f32> {
let offset = i32(index) * 4;
let m0 = textureLoad(smp, vec2<i32>(offset + 0, 0), 0);
let m1 = textureLoad(smp, vec2<i32>(offset + 1, 0), 0);
let m2 = textureLoad(smp, vec2<i32>(offset + 2, 0), 0);
let m3 = textureLoad(smp, vec2<i32>(offset + 3, 0), 0);
return mat4x4f(m0, m1, m2, m3);
}
`;
      pbrExt10 = {
        id: "skeleton",
        phase: "vertex",
        frag(ctx) {
          if (!(ctx._meshFeatures & MSH_HAS_SKELETON)) {
            return null;
          }
          return createSkeletonFragment((ctx._meshFeatures & MSH_HAS_SKELETON_8) !== 0);
        },
        bind(ctx, entries, b) {
          const mesh = ctx._mesh;
          if (!(ctx._meshFeatures & MSH_HAS_SKELETON) || !mesh?.skeleton) {
            return b;
          }
          entries.push({ binding: b++, resource: mesh.skeleton.boneTexture.createView() });
          return b;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/morph-fragment.ts
  var morph_fragment_exports = {};
  __export(morph_fragment_exports, {
    createMorphFragment: () => createMorphFragment,
    pbrExt: () => pbrExt11
  });
  function createMorphFragment() {
    return {
      _id: "morph",
      _vertexBuiltins: [{ _name: "vertexIndex", _builtin: "vertex_index", _type: "u32" }],
      _vertexHelperFunctions: `struct morphUniforms {
weights: vec4<f32>,
count: u32,
texWidth: u32,
rowsPerBand: u32,
_p0: u32,
}`,
      _vertexBindings: [
        { _name: "morphTargets", _type: { _kind: "texture", _textureType: "texture_2d<f32>", _sampleType: "unfilterable-float" }, _visibility: STAGE_VERTEX5 },
        { _name: "morph", _type: { _kind: "uniform-buffer" }, _visibility: STAGE_VERTEX5 }
      ],
      _vertexSlots: {
        VR: MORPH_PRE_SKINNING
      }
    };
  }
  var STAGE_VERTEX5, MORPH_PRE_SKINNING, pbrExt11;
  var init_morph_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/morph-fragment.ts"() {
      "use strict";
      init_mesh_features();
      STAGE_VERTEX5 = 1;
      MORPH_PRE_SKINNING = `var morphedPos = position;
var morphedNorm = normal;
let mCol = i32(vertexIndex % morph.texWidth);
let mRowInBand = i32(vertexIndex / morph.texWidth);
for (var i = 0u; i < morph.count; i = i + 1u) {
  let w = morph.weights[i];
  let posBase = i32(i * 2u) * i32(morph.rowsPerBand);
  let normBase = i32(i * 2u + 1u) * i32(morph.rowsPerBand);
  morphedPos = morphedPos + w * textureLoad(morphTargets, vec2<i32>(mCol, posBase + mRowInBand), 0).xyz;
  morphedNorm = morphedNorm + w * textureLoad(morphTargets, vec2<i32>(mCol, normBase + mRowInBand), 0).xyz;
}`;
      pbrExt11 = {
        id: "morph",
        phase: "vertex",
        frag(ctx) {
          if (!(ctx._meshFeatures & MSH_HAS_MORPH_TARGETS)) {
            return null;
          }
          return createMorphFragment();
        },
        bind(ctx, entries, b) {
          const mesh = ctx._mesh;
          if (!(ctx._meshFeatures & MSH_HAS_MORPH_TARGETS) || !mesh?.morphTargets) {
            return b;
          }
          entries.push({ binding: b++, resource: mesh.morphTargets.texture.createView() });
          if (mesh.morphTargets.weightsBuffer) {
            entries.push({ binding: b++, resource: { buffer: mesh.morphTargets.weightsBuffer } });
          }
          return b;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/uv-transform-fragment.ts
  var uv_transform_fragment_exports = {};
  __export(uv_transform_fragment_exports, {
    pbrExt: () => pbrExt12
  });
  function writeOne(data, offsets, texName, tex) {
    const mOff = offsets.get(`${texName}UVm`);
    const tOff = offsets.get(`${texName}UVt`);
    if (mOff === void 0 || tOff === void 0) {
      return;
    }
    const mi = mOff / 4;
    const ti = tOff / 4;
    const sx = tex?.uScale ?? 1;
    const sy = tex?.vScale ?? 1;
    const ang = tex?.uAng ?? 0;
    const ox = tex?.uOffset ?? 0;
    const oy = tex?.vOffset ?? 0;
    if (ang === 0) {
      data[mi] = sx;
      data[mi + 1] = 0;
      data[mi + 2] = 0;
      data[mi + 3] = sy;
    } else {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      data[mi] = c * sx;
      data[mi + 1] = -s * sy;
      data[mi + 2] = s * sx;
      data[mi + 3] = c * sy;
    }
    data[ti] = ox;
    data[ti + 1] = oy;
    data[ti + 2] = 0;
    data[ti + 3] = 0;
  }
  var pbrExt12;
  var init_uv_transform_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/uv-transform-fragment.ts"() {
      "use strict";
      pbrExt12 = {
        id: "uv-transform",
        phase: "fragment",
        writeUbo(data, material, offsets) {
          const m = material;
          writeOne(data, offsets, "baseColor", m.baseColorTexture);
          writeOne(data, offsets, "normal", m.normalTexture);
          writeOne(data, offsets, "orm", m.ormTexture);
          writeOne(data, offsets, "emissive", m.emissiveTexture);
          writeOne(data, offsets, "specGloss", m.specGlossTexture);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/anisotropy-fragment.ts
  var anisotropy_fragment_exports = {};
  __export(anisotropy_fragment_exports, {
    ANISO_BENT_NORMAL: () => ANISO_BENT_NORMAL,
    ANISO_BRDF_FUNCTIONS: () => ANISO_BRDF_FUNCTIONS,
    ANISO_DIRECT_DG: () => ANISO_DIRECT_DG,
    makeAnisotropyTBBlock: () => makeAnisotropyTBBlock,
    pbrExt: () => pbrExt13
  });
  function makeAnisotropyTBBlock(hasNormal) {
    if (hasNormal) {
      return `var anisoT = normalize(input.worldTangent);
var anisoB = normalize(input.worldBitangent);
{
let anisoDir = normalize(vec2<f32>(material.anisotropyParams.y, material.anisotropyParams.z));
anisoT = normalize(anisoT * anisoDir.x + anisoB * anisoDir.y);
anisoB = normalize(cross(N, anisoT));
}`;
    }
    return `var anisoT: vec3<f32>;
var anisoB: vec3<f32>;
{
let aniso_dp1 = dpdx(input.worldPos);
let aniso_dp2 = -dpdy(input.worldPos);
let aniso_duv1 = dpdx(input.uv);
let aniso_duv2 = -dpdy(input.uv);
let aniso_dp2perp = cross(aniso_dp2, N);
let aniso_dp1perp = cross(N, aniso_dp1);
var aniso_t = aniso_dp2perp * aniso_duv1.x + aniso_dp1perp * aniso_duv2.x;
var aniso_b = aniso_dp2perp * aniso_duv1.y + aniso_dp1perp * aniso_duv2.y;
let aniso_det = max(dot(aniso_t, aniso_t), dot(aniso_b, aniso_b));
let aniso_inv = select(inverseSqrt(aniso_det), 0.0, aniso_det == 0.0);
aniso_t *= aniso_inv;
aniso_b *= aniso_inv;
let aniso_tn = normalize(aniso_t);
let aniso_bn = normalize(aniso_b);
let anisoTBN = mat3x3<f32>(aniso_tn, aniso_bn, N);
let anisoDir = vec3<f32>(material.anisotropyParams.y, material.anisotropyParams.z, 0.0);
anisoT = normalize(anisoTBN * anisoDir);
anisoB = normalize(cross(anisoTBN[2], anisoT));
}`;
  }
  var ANISO_BRDF_FUNCTIONS, ANISO_DIRECT_DG, ANISO_BENT_NORMAL, pbrExt13;
  var init_anisotropy_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/anisotropy-fragment.ts"() {
      "use strict";
      ANISO_BRDF_FUNCTIONS = `
const RECIPROCAL_PI: f32 = 0.3183098861837907;
fn getAnisotropicRoughness(alphaG: f32, anisotropy: f32) -> vec2<f32> {
let aT = max(mix(alphaG, 1.0, anisotropy * anisotropy), 0.0005);
let aB = max(alphaG, 0.0005);
return vec2<f32>(aT, aB);
}
fn D_GGX_Anisotropic(NdotH: f32, TdotH: f32, BdotH: f32, alphaTB: vec2<f32>) -> f32 {
let a2 = alphaTB.x * alphaTB.y;
let v = vec3<f32>(alphaTB.y * TdotH, alphaTB.x * BdotH, a2 * NdotH);
let v2 = dot(v, v);
let w2 = a2 / v2;
return a2 * w2 * w2 * RECIPROCAL_PI;
}
fn V_GGXCorrelated_Anisotropic(NdotL: f32, NdotV: f32, TdotV: f32, BdotV: f32, TdotL: f32, BdotL: f32, alphaTB: vec2<f32>) -> f32 {
let lambdaV = NdotL * length(vec3<f32>(alphaTB.x * TdotV, alphaTB.y * BdotV, NdotV));
let lambdaL = NdotV * length(vec3<f32>(alphaTB.x * TdotL, alphaTB.y * BdotL, NdotL));
return 0.5 / (lambdaV + lambdaL);
}
`;
      ANISO_DIRECT_DG = `let aniso_alphaTB = getAnisotropicRoughness(directAlphaG, material.anisotropyParams.x);
let dl_TdotH = dot(anisoT, H); let dl_BdotH = dot(anisoB, H);
let dl_TdotV = dot(anisoT, V); let dl_BdotV = dot(anisoB, V);
let dl_TdotL = dot(anisoT, L); let dl_BdotL = dot(anisoB, L);
let D = D_GGX_Anisotropic(NdotH, dl_TdotH, dl_BdotH, aniso_alphaTB);
let G = V_GGXCorrelated_Anisotropic(NdotL, NdotV, dl_TdotV, dl_BdotV, dl_TdotL, dl_BdotL, aniso_alphaTB);`;
      ANISO_BENT_NORMAL = `let anisoIntensity = material.anisotropyParams.x;
var anisoBentNormal = cross(anisoB, V);
anisoBentNormal = normalize(cross(anisoBentNormal, anisoB));
let anisoSq = 1.0 - anisoIntensity * (1.0 - roughness);
let anisoA = anisoSq * anisoSq * anisoSq * anisoSq;
anisoBentNormal = normalize(mix(anisoBentNormal, N, anisoA));
let R_raw = reflect(-V, anisoBentNormal);`;
      pbrExt13 = {
        id: "anisotropy",
        phase: "fragment",
        writeUbo(data, material, offsets) {
          const aniso = material.anisotropy;
          if (!aniso?.isEnabled || !offsets.has("anisotropyParams")) {
            return;
          }
          const off = offsets.get("anisotropyParams") / 4;
          const dir = aniso.direction ?? [1, 0];
          data[off] = aniso.intensity ?? 1;
          data[off + 1] = dir[0];
          data[off + 2] = dir[1];
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-template-ext.ts
  var pbr_template_ext_exports = {};
  __export(pbr_template_ext_exports, {
    createPbrTemplateExt: () => createPbrTemplateExt
  });
  function createPbrTemplateExt(flags) {
    const { _hasUvTransform, _hasVertexColor, _hasUv2, _hasOcclusionUv2, _hasAnyNormal, _hasEmissiveTexture, _hasSpecGloss } = flags;
    const uvTransformUboFields2 = (name) => [
      { _name: `${name}UVm`, _type: "vec4<f32>" },
      { _name: `${name}UVt`, _type: "vec4<f32>" }
    ];
    const uvVarName = (name) => _hasUvTransform ? `${name}UV` : "input.uv";
    const uvTransformDecl = (name) => _hasUvTransform ? `let ${name}UV = txfUV(input.uv, material.${name}UVm, material.${name}UVt.xy);
` : "";
    const UV_TRANSFORM_HELPER_WGSL = _hasUvTransform ? `fn txfUV(uv: vec2<f32>, m: vec4<f32>, t: vec2<f32>) -> vec2<f32> {
return vec2<f32>(dot(m.xy, uv), dot(m.zw, uv)) + t;
}
` : "";
    const extraVertexAttributes = [];
    if (_hasUv2) {
      extraVertexAttributes.push({ _name: "uv2", _type: "vec2<f32>", _gpuFormat: "float32x2", _arrayStride: 8 });
    }
    if (_hasVertexColor) {
      extraVertexAttributes.push({ _name: "color", _type: "vec3<f32>", _gpuFormat: "float32x3", _arrayStride: 12 });
    }
    const extraVaryings = [];
    if (_hasUv2) {
      extraVaryings.push({ _name: "uv2", _type: "vec2<f32>" });
    }
    if (_hasVertexColor) {
      extraVaryings.push({ _name: "vColor", _type: "vec3<f32>" });
    }
    const extraMaterialUboFields = [];
    if (_hasUvTransform) {
      extraMaterialUboFields.push(...uvTransformUboFields2("baseColor"));
      if (_hasAnyNormal) {
        extraMaterialUboFields.push(...uvTransformUboFields2("normal"));
      }
      extraMaterialUboFields.push(...uvTransformUboFields2("orm"));
      if (_hasEmissiveTexture) {
        extraMaterialUboFields.push(...uvTransformUboFields2("emissive"));
      }
      if (_hasSpecGloss) {
        extraMaterialUboFields.push(...uvTransformUboFields2("specGloss"));
      }
    }
    const extraBindings = [];
    if (_hasOcclusionUv2) {
      extraBindings.push(
        { _name: "occlusionTexture", _type: { _kind: "texture", _textureType: "texture_2d<f32>" }, _visibility: STAGE_FRAGMENT18 },
        { _name: "occlusionSampler_", _type: { _kind: "sampler", _samplerType: "sampler" }, _visibility: STAGE_FRAGMENT18 }
      );
    }
    let vertexBodyExtra = "";
    if (_hasUv2) {
      vertexBodyExtra += "out.uv2 = uv2;\n";
    }
    if (_hasVertexColor) {
      vertexBodyExtra += "out.vColor = color;\n";
    }
    const fragmentHelpers = UV_TRANSFORM_HELPER_WGSL;
    const fragmentPrelude = _hasUvTransform ? uvTransformDecl("baseColor") + (_hasAnyNormal ? uvTransformDecl("normal") : "") + uvTransformDecl("orm") + (_hasEmissiveTexture ? uvTransformDecl("emissive") : "") + (_hasSpecGloss ? uvTransformDecl("specGloss") : "") : "";
    const uvForBaseColor = uvVarName("baseColor");
    const uvForNormal = uvVarName("normal");
    const uvForOrm = uvVarName("orm");
    const uvForEmissive = uvVarName("emissive");
    const uvForSpecGloss = uvVarName("specGloss");
    const baseColorMod = _hasVertexColor ? `
baseColor *= input.vColor;` : "";
    const normalScaleMod = "let scaledNormal = vec3<f32>(normalMapRaw.xy * material.normalScale, normalMapRaw.z);\n";
    const occlusionOverride = _hasOcclusionUv2 ? "let occlusion = textureSample(occlusionTexture, occlusionSampler_, input.uv2).r;" : null;
    return {
      extraVertexAttributes,
      extraVaryings,
      extraMaterialUboFields,
      extraBindings,
      vertexBodyExtra,
      fragmentHelpers,
      fragmentPrelude,
      uvForBaseColor,
      uvForNormal,
      uvForOrm,
      uvForEmissive,
      uvForSpecGloss,
      baseColorMod,
      normalScaleMod,
      occlusionOverride
    };
  }
  var STAGE_FRAGMENT18;
  var init_pbr_template_ext = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-template-ext.ts"() {
      "use strict";
      STAGE_FRAGMENT18 = 2;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-aces-wgsl.ts
  var pbr_aces_wgsl_exports = {};
  __export(pbr_aces_wgsl_exports, {
    ACES_HELPERS_WGSL: () => ACES_HELPERS_WGSL,
    ACES_TONEMAP_CALL_WGSL: () => ACES_TONEMAP_CALL_WGSL
  });
  var ACES_HELPERS_WGSL, ACES_TONEMAP_CALL_WGSL;
  var init_pbr_aces_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-aces-wgsl.ts"() {
      "use strict";
      ACES_HELPERS_WGSL = `
const ACESInputMat = mat3x3<f32>(vec3<f32>(0.59719,0.07600,0.02840),vec3<f32>(0.35458,0.90834,0.13383),vec3<f32>(0.04823,0.01566,0.83777));
const ACESOutputMat = mat3x3<f32>(vec3<f32>(1.60475,-0.10208,-0.00327),vec3<f32>(-0.53108,1.10813,-0.07276),vec3<f32>(-0.07367,-0.00605,1.07602));
fn RRTAndODTFit(v: vec3<f32>) -> vec3<f32> { let a = v*(v+0.0245786)-0.000090537; let b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
fn ACESFitted(color: vec3<f32>) -> vec3<f32> { var c = ACESInputMat*color; c = RRTAndODTFit(c); c = ACESOutputMat*c; return saturate(c); }
`;
      ACES_TONEMAP_CALL_WGSL = `color *= scene.vImageInfos.x;
color = ACESFitted(color);`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-fog-wgsl.ts
  var pbr_fog_wgsl_exports = {};
  __export(pbr_fog_wgsl_exports, {
    PBR_FOG_BLOCK: () => PBR_FOG_BLOCK,
    PBR_FOG_HELPER: () => PBR_FOG_HELPER
  });
  var PBR_FOG_HELPER, PBR_FOG_BLOCK;
  var init_pbr_fog_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-fog-wgsl.ts"() {
      "use strict";
      init_wgsl_helpers();
      PBR_FOG_HELPER = WGSL_FOG;
      PBR_FOG_BLOCK = `if(scene.vFogInfos.x>0.0){var fogFactor=calcFogFactor((scene.view*vec4<f32>(input.worldPos,1.0)).xyz);fogFactor=pow(fogFactor,2.2);color=mix(pow(scene.vFogColor.rgb,vec3<f32>(2.2)),color,fogFactor);}`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/singlelight-hemispheric-wgsl.ts
  var singlelight_hemispheric_wgsl_exports = {};
  __export(singlelight_hemispheric_wgsl_exports, {
    SINGLE_LIGHT_STRUCTS: () => SINGLE_LIGHT_STRUCTS,
    getSingleLightBlock: () => getSingleLightBlock
  });
  function specularBlock() {
    return `let H = normalize(V + L);
let NdotH = clamp(dot(N, H), 0.0000001, 1.0);
let VdotH = saturate(dot(V, H));
let directRoughness = max(roughness, AA_factor_x);
let directAlphaG = directRoughness * directRoughness + 0.0005;
let D = distributionGGX(NdotH, directAlphaG);
let G = geometrySmithGGX(NdotL, NdotV, directAlphaG);
let coloredFresnel = fresnelSchlick(VdotH, colorF0, colorF90);
var directSpecular = coloredFresnel * D * G * NdotL * lightColor * lightAtten * material.directIntensity;`;
  }
  function getSingleLightBlock() {
    return `let entry = lights.lights[mli(0u)];
let L = normalize(entry.vLightData.xyz);
let NdotL = dot(N, L) * 0.5 + 0.5;
let lightAtten = 1.0;
let lightColor = entry.vLightDiffuse.rgb;
let hemiDiffuse = mix(entry.vLightDirection.xyz, lightColor, NdotL);
var directDiffuse = hemiDiffuse * surfaceAlbedo * material.directIntensity;
${specularBlock()}
/*AD*/`;
  }
  var SINGLE_LIGHT_STRUCTS;
  var init_singlelight_hemispheric_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/singlelight-hemispheric-wgsl.ts"() {
      "use strict";
      init_types();
      SINGLE_LIGHT_STRUCTS = `
struct LightEntry {
vLightData: vec4<f32>,
vLightDiffuse: vec4<f32>,
vLightSpecular: vec4<f32>,
vLightDirection: vec4<f32>,
};
struct lightsUniforms {
count: u32, _p0: u32, _p1: u32, _p2: u32,
    lights: array<LightEntry, ${MAX_LIGHTS}>,
};
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/singlelight-directional-wgsl.ts
  var singlelight_directional_wgsl_exports = {};
  __export(singlelight_directional_wgsl_exports, {
    SINGLE_LIGHT_STRUCTS: () => SINGLE_LIGHT_STRUCTS2,
    getSingleLightBlock: () => getSingleLightBlock2
  });
  function specularBlock2() {
    return `let H = normalize(V + L);
let NdotH = clamp(dot(N, H), 0.0000001, 1.0);
let VdotH = saturate(dot(V, H));
let directRoughness = max(roughness, AA_factor_x);
let directAlphaG = directRoughness * directRoughness + 0.0005;
let D = distributionGGX(NdotH, directAlphaG);
let G = geometrySmithGGX(NdotL, NdotV, directAlphaG);
let coloredFresnel = fresnelSchlick(VdotH, colorF0, colorF90);
var directSpecular = coloredFresnel * D * G * NdotL * lightColor * lightAtten * material.directIntensity;`;
  }
  function getSingleLightBlock2() {
    return `let entry = lights.lights[mli(0u)];
let L = normalize(-entry.vLightData.xyz);
let NdotL = max(dot(N, L), 0.0);
let lightAtten = 1.0;
let lightColor = entry.vLightDiffuse.rgb;
var directDiffuse = surfaceAlbedo * (1.0 / PI) * NdotL * lightColor * material.directIntensity;
${specularBlock2()}
/*AD*/`;
  }
  var SINGLE_LIGHT_STRUCTS2;
  var init_singlelight_directional_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/singlelight-directional-wgsl.ts"() {
      "use strict";
      init_types();
      SINGLE_LIGHT_STRUCTS2 = `
struct LightEntry {
vLightData: vec4<f32>,
vLightDiffuse: vec4<f32>,
vLightSpecular: vec4<f32>,
vLightDirection: vec4<f32>,
};
struct lightsUniforms {
count: u32, _p0: u32, _p1: u32, _p2: u32,
    lights: array<LightEntry, ${MAX_LIGHTS}>,
};
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/singlelight-spot-wgsl.ts
  var singlelight_spot_wgsl_exports = {};
  __export(singlelight_spot_wgsl_exports, {
    SINGLE_LIGHT_STRUCTS: () => SINGLE_LIGHT_STRUCTS3,
    getSingleLightBlock: () => getSingleLightBlock3
  });
  function specularBlock3() {
    return `let H = normalize(V + L);
let NdotH = clamp(dot(N, H), 0.0000001, 1.0);
let VdotH = saturate(dot(V, H));
let directRoughness = max(roughness, AA_factor_x);
let directAlphaG = directRoughness * directRoughness + 0.0005;
let D = distributionGGX(NdotH, directAlphaG);
let G = geometrySmithGGX(NdotL, NdotV, directAlphaG);
let coloredFresnel = fresnelSchlick(VdotH, colorF0, colorF90);
var directSpecular = coloredFresnel * D * G * NdotL * lightColor * lightAtten * material.directIntensity;`;
  }
  function getSingleLightBlock3() {
    return `let entry = lights.lights[mli(0u)];
let lightToFrag = entry.vLightData.xyz - input.worldPos;
let lightDist = length(lightToFrag);
let L = lightToFrag / max(lightDist, 0.0001);
let NdotL = max(dot(N, L), 0.0);
let spotC = dot(entry.vLightDirection.xyz, -L);
let physicalFalloff = material.lightFalloffMode >= 0.5;
let rangeAtt = select(max(0.0, 1.0 - lightDist / entry.vLightDiffuse.a), 1.0 / max(dot(lightToFrag, lightToFrag), 0.0000001), physicalFalloff);
let standardDirFalloff = select(0.0, max(0.0, pow(max(spotC, 0.0), entry.vLightSpecular.a)), spotC >= entry.vLightDirection.w);
let kappa = 6.64385618977 / max(1.0 - entry.vLightDirection.w, 0.0001);
let physicalDirFalloff = exp2(kappa * (spotC - 1.0));
let lightAtten = rangeAtt * select(standardDirFalloff, physicalDirFalloff, physicalFalloff);
let lightColor = entry.vLightDiffuse.rgb;
var directDiffuse = surfaceAlbedo * (1.0 / PI) * NdotL * lightColor * lightAtten * material.directIntensity;
${specularBlock3()}
/*AD*/`;
  }
  var SINGLE_LIGHT_STRUCTS3;
  var init_singlelight_spot_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/singlelight-spot-wgsl.ts"() {
      "use strict";
      init_types();
      SINGLE_LIGHT_STRUCTS3 = `
struct LightEntry {
vLightData: vec4<f32>,
vLightDiffuse: vec4<f32>,
vLightSpecular: vec4<f32>,
vLightDirection: vec4<f32>,
};
struct lightsUniforms {
count: u32, _p0: u32, _p1: u32, _p2: u32,
    lights: array<LightEntry, ${MAX_LIGHTS}>,
};
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/singlelight-point-wgsl.ts
  var singlelight_point_wgsl_exports = {};
  __export(singlelight_point_wgsl_exports, {
    SINGLE_LIGHT_STRUCTS: () => SINGLE_LIGHT_STRUCTS4,
    getSingleLightBlock: () => getSingleLightBlock4
  });
  function specularBlock4() {
    return `let H = normalize(V + L);
let NdotH = clamp(dot(N, H), 0.0000001, 1.0);
let VdotH = saturate(dot(V, H));
let directRoughness = max(roughness, AA_factor_x);
let directAlphaG = directRoughness * directRoughness + 0.0005;
let D = distributionGGX(NdotH, directAlphaG);
let G = geometrySmithGGX(NdotL, NdotV, directAlphaG);
let coloredFresnel = fresnelSchlick(VdotH, colorF0, colorF90);
var directSpecular = coloredFresnel * D * G * NdotL * lightColor * lightAtten * material.directIntensity;`;
  }
  function getSingleLightBlock4() {
    return `let entry = lights.lights[mli(0u)];
let lightToFrag = entry.vLightData.xyz - input.worldPos;
let lightDist2 = dot(lightToFrag, lightToFrag);
let L = normalize(lightToFrag);
let NdotL = max(dot(N, L), 0.0);
let range = entry.vLightDiffuse.a;
let physicalFalloff = material.lightFalloffMode >= 0.5;
let physicalAtten = 1.0 / max(lightDist2, 0.0001);
let standardAtten = max(0.0, 1.0 - sqrt(lightDist2) / range);
let lightAtten = select(standardAtten, physicalAtten, physicalFalloff);
let lightColor = entry.vLightDiffuse.rgb;
var directDiffuse = surfaceAlbedo * (1.0 / PI) * NdotL * lightColor * lightAtten * material.directIntensity;
${specularBlock4()}
/*AD*/`;
  }
  var SINGLE_LIGHT_STRUCTS4;
  var init_singlelight_point_wgsl = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/fragments/singlelight-point-wgsl.ts"() {
      "use strict";
      init_types();
      SINGLE_LIGHT_STRUCTS4 = `
struct LightEntry {
vLightData: vec4<f32>,
vLightDiffuse: vec4<f32>,
vLightSpecular: vec4<f32>,
vLightDirection: vec4<f32>,
};
struct lightsUniforms {
count: u32, _p0: u32, _p1: u32, _p2: u32,
    lights: array<LightEntry, ${MAX_LIGHTS}>,
};
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-renderable.ts
  var pbr_renderable_exports = {};
  __export(pbr_renderable_exports, {
    _writeMaterialData: () => _writeMaterialData,
    buildPbrRenderables: () => buildPbrRenderables
  });
  async function buildPbrRenderables(scene, meshes, envTextures) {
    const engine = scene.surface.engine;
    const device = engine._device;
    const materialScratch = /* @__PURE__ */ new Map();
    const hasEnv = !!envTextures;
    const shadowLights = [];
    for (let i = 0; i < scene.lights.length; i++) {
      const sg = scene.lights[i].shadowGenerator;
      if (sg) {
        shadowLights.push({ lightIndex: i, shadowType: sg._shadowType, gen: sg });
      }
    }
    const hasSomeShadows = shadowLights.length > 0;
    let hasAnyAffectedLight = false;
    let needsSingleLightPath = false;
    let needsMultiLightPath = false;
    const singleLightTypes = [];
    for (const mesh of meshes) {
      const lr = writeMeshLightSelection(mesh, scene.lights);
      const affectedCount = lr > 0 ? 1 : -lr;
      hasAnyAffectedLight || (hasAnyAffectedLight = affectedCount > 0);
      if (affectedCount === 1 && !(mesh.receiveShadows && hasSomeShadows)) {
        needsSingleLightPath = true;
        const type = getPackedSingleLightType(scene.lights, lr - 1);
        if (!singleLightTypes.includes(type)) {
          singleLightTypes.push(type);
        }
      } else if (affectedCount > 0) {
        needsMultiLightPath = true;
      }
    }
    let hasSkybox = false;
    let hasMetallicReflectance = false;
    let hasClearcoat = false;
    let hasSheen = false;
    let hasIridescence = false;
    let hasAnyAnisotropy = false;
    let hasAnySubsurface = false;
    let hasAlphaTest = false;
    let hasTransmissionRefraction = false;
    let needsEmissiveColor = false;
    let hasSomeSkeletons = false;
    let hasSomeMorphs = false;
    let hasSomeThinInstances = false;
    let hasCullingTI = false;
    let hasAnyUnlit = false;
    let hasAnyUvTransform = false;
    let hasAnyUv2 = false;
    let hasAnyVertexColor = false;
    for (let i = 0; i < meshes.length; i++) {
      const m = meshes[i];
      const mat = m.material;
      const refractionIntensity = mat.subsurface?.refraction?.intensity ?? 0;
      hasSkybox || (hasSkybox = !!mat.skyboxMode);
      hasMetallicReflectance || (hasMetallicReflectance = !!(mat.metallicReflectanceTexture || mat.reflectanceTexture || mat._hasReflExt));
      hasClearcoat || (hasClearcoat = !!mat.clearCoat?.isEnabled);
      hasSheen || (hasSheen = !!mat.sheen?.isEnabled);
      hasIridescence || (hasIridescence = !!mat.iridescence?.isEnabled);
      hasAnyAnisotropy || (hasAnyAnisotropy = !!mat.anisotropy?.isEnabled);
      hasAnySubsurface || (hasAnySubsurface = !!mat.subsurface?.translucency);
      hasAlphaTest || (hasAlphaTest = mat.alphaCutOff > 0);
      hasTransmissionRefraction || (hasTransmissionRefraction = refractionIntensity > 0 && !!mat.transmissive);
      needsEmissiveColor || (needsEmissiveColor = !!mat.emissiveColor);
      hasSomeSkeletons || (hasSomeSkeletons = !!m.skeleton);
      hasSomeMorphs || (hasSomeMorphs = !!m.morphTargets);
      hasSomeThinInstances || (hasSomeThinInstances = !!m.thinInstances);
      hasCullingTI || (hasCullingTI = !!m.thinInstances?._gpuCullingEnabled);
      hasAnyUnlit || (hasAnyUnlit = !!mat.unlit);
      hasAnyUvTransform || (hasAnyUvTransform = !!mat._hasUvTx);
      hasAnyUv2 || (hasAnyUv2 = !!m._gpu.uv2Buffer && mat.occlusionTexCoord === 1);
      hasAnyVertexColor || (hasAnyVertexColor = !!m._gpu.colorBuffer);
    }
    let _iblSkyboxCalc = "";
    if (hasEnv) {
      const mod = await Promise.resolve().then(() => (init_ibl_fragment(), ibl_fragment_exports));
      _registerPbrExt(mod.pbrExt);
      if (hasSkybox) {
        const sky = await Promise.resolve().then(() => (init_ibl_skybox_wgsl(), ibl_skybox_wgsl_exports));
        _iblSkyboxCalc = sky.IBL_SKYBOX_CALCULATION;
      }
    }
    let _createPbrShadowFragment = null;
    let _singleLightWGSL = "";
    let _getSingleLightBlock = null;
    const singleLightBlocks = {};
    let _multiLightWGSL = "";
    let _multiLightLoop = "";
    if (needsSingleLightPath) {
      for (const type of singleLightTypes) {
        const single = await importSingleLightWgsl(type);
        _singleLightWGSL = single.SINGLE_LIGHT_STRUCTS;
        singleLightBlocks[type] = single.getSingleLightBlock;
      }
      _getSingleLightBlock = (type) => singleLightBlocks[toSingleLightType(type)]?.() ?? "";
    }
    if (needsMultiLightPath) {
      const wgslMod = await Promise.resolve().then(() => (init_multilight_wgsl(), multilight_wgsl_exports));
      _multiLightWGSL = wgslMod.MULTI_LIGHT_STRUCTS() + wgslMod.COMPUTE_PBR_LIGHT;
      _multiLightLoop = wgslMod.getMultiLightLoop();
    }
    if (hasAnyAffectedLight && hasSomeShadows) {
      const shadowMod = await Promise.resolve().then(() => (init_pbr_shadow_fragment(), pbr_shadow_fragment_exports));
      _createPbrShadowFragment = shadowMod.createPbrShadowFragment;
    }
    const _drainPbrExts = async (loaders) => {
      for (const [flag, load] of loaders) {
        if (flag) {
          _registerPbrExt((await load()).pbrExt);
        }
      }
    };
    await _drainPbrExts([
      [hasAlphaTest, () => Promise.resolve().then(() => (init_alpha_test_fragment(), alpha_test_fragment_exports))],
      [hasMetallicReflectance, () => Promise.resolve().then(() => (init_reflectance_fragment(), reflectance_fragment_exports))],
      [hasClearcoat, () => Promise.resolve().then(() => (init_clearcoat_fragment(), clearcoat_fragment_exports))],
      [hasSheen, () => Promise.resolve().then(() => (init_sheen_fragment(), sheen_fragment_exports))],
      [hasIridescence, () => Promise.resolve().then(() => (init_iridescence_fragment(), iridescence_fragment_exports))],
      [hasAnySubsurface, () => Promise.resolve().then(() => (init_subsurface_fragment(), subsurface_fragment_exports))]
    ]);
    if (hasTransmissionRefraction) {
      const mod = await Promise.resolve().then(() => (init_pbr_refraction(), pbr_refraction_exports));
      await mod.registerPbrRefraction(scene, engine, _registerPbrExt);
    }
    await _drainPbrExts([
      [needsEmissiveColor, () => Promise.resolve().then(() => (init_emissive_fragment(), emissive_fragment_exports))],
      [hasAnyUnlit, () => Promise.resolve().then(() => (init_unlit_fragment(), unlit_fragment_exports))],
      [hasSomeSkeletons, () => Promise.resolve().then(() => (init_skeleton_fragment(), skeleton_fragment_exports))],
      [hasSomeMorphs, () => Promise.resolve().then(() => (init_morph_fragment(), morph_fragment_exports))],
      [hasAnyUvTransform, () => Promise.resolve().then(() => (init_uv_transform_fragment(), uv_transform_fragment_exports))]
    ]);
    let _anisoExt = null;
    if (hasAnyAnisotropy) {
      _anisoExt = await Promise.resolve().then(() => (init_anisotropy_fragment(), anisotropy_fragment_exports));
      _registerPbrExt(_anisoExt.pbrExt);
    }
    let _createPbrTemplateExt = null;
    if (hasAnyUvTransform || hasAnyVertexColor || hasAnyUv2) {
      const extMod = await Promise.resolve().then(() => (init_pbr_template_ext(), pbr_template_ext_exports));
      _createPbrTemplateExt = extMod.createPbrTemplateExt;
    }
    let _createThinInstanceFragment = null;
    let _syncThinInstanceBuffers = null;
    let _cull;
    let _syncThinInstanceGpuData = null;
    if (hasSomeThinInstances) {
      const mod = await Promise.resolve().then(() => (init_thin_instance_fragment(), thin_instance_fragment_exports));
      _createThinInstanceFragment = mod.createThinInstanceFragment;
      const gpuMod = await Promise.resolve().then(() => (init_thin_instance_gpu(), thin_instance_gpu_exports));
      _syncThinInstanceBuffers = gpuMod.syncThinInstanceBuffers;
      if (hasCullingTI) {
        _cull = await Promise.resolve().then(() => (init_thin_instance_cull_binding(), thin_instance_cull_binding_exports));
      }
      _syncThinInstanceGpuData = gpuMod.syncThinInstanceGpuData;
    }
    let _acesHelpers = "";
    let _acesTonemapCall = "";
    const hasTonemap = scene.imageProcessing.toneMappingEnabled;
    if (hasTonemap && scene.imageProcessing.toneMappingType === "aces") {
      const acesMod = await Promise.resolve().then(() => (init_pbr_aces_wgsl(), pbr_aces_wgsl_exports));
      _acesHelpers = acesMod.ACES_HELPERS_WGSL;
      _acesTonemapCall = acesMod.ACES_TONEMAP_CALL_WGSL;
    }
    let _fogHelper = "";
    let _fogBlock = "";
    if (scene.fog) {
      const fogMod = await Promise.resolve().then(() => (init_pbr_fog_wgsl(), pbr_fog_wgsl_exports));
      _fogHelper = fogMod.PBR_FOG_HELPER;
      _fogBlock = fogMod.PBR_FOG_BLOCK;
    }
    const composePbr = createPbrComposer({
      _singleLightWGSL,
      _getSingleLightBlock,
      _multiLightWGSL,
      _multiLightLoop,
      _acesHelpers,
      _acesTonemapCall,
      _fogHelper,
      _fogBlock,
      _createPbrTemplateExt,
      _anisoExt,
      _iblSkyboxCalc,
      _createPbrShadowFragment,
      _shadowLights: shadowLights,
      _createThinInstanceFragment
    });
    const sceneFeatures = (hasEnv ? PBR_HAS_ENV : 0) | (hasTonemap ? PBR_HAS_TONEMAP : 0) | (scene.fog ? PBR_HAS_FOG : 0);
    const shadowBGCache = /* @__PURE__ */ new Map();
    const syncThinInstanceBuffers2 = _syncThinInstanceBuffers;
    const syncThinInstanceGpuData2 = _syncThinInstanceGpuData;
    const rebuildSingle = (s, mesh, materialOverride) => {
      const materialInput = materialOverride ?? mesh.material;
      const mat = materialInput;
      const renderFeatures = mat._renderFeatures ?? (mat._renderFeatures = _computePbrMaterialFeatures(mat));
      const isOverride = materialOverride != null;
      const mi = mesh;
      const lr = writeMeshLightSelection(mesh, s.lights);
      const lightCount = lr > 0 ? 1 : -lr;
      const features = renderFeatures.features;
      const features2 = renderFeatures.features2 ?? 0;
      const shadowOutput = (features2 & (PBR2_NO_COLOR_OUTPUT | PBR2_ESM_SHADOW_OUTPUT)) !== 0;
      const receiveShadows = !shadowOutput && mesh.receiveShadows && hasSomeShadows;
      const lightMode = lightCount === 0 ? 0 : lightCount === 1 && !receiveShadows ? 1 : 2;
      const singleLightType = lightMode === 1 ? getPackedSingleLightType(s.lights, lr - 1) : "";
      const meshFeatures = _computeMeshFeatures(mesh, receiveShadows);
      const esmShadowDepthCode = (features2 & PBR2_ESM_SHADOW_OUTPUT) !== 0 ? mat._esmShadowDepthCode : "";
      const vbLayout = mi._gpu._vbLayout;
      const vbKey = mi._gpu._vbKey ?? "";
      const composed = composePbr(features, features2, meshFeatures, sceneFeatures, lightMode, singleLightType, esmShadowDepthCode, vbLayout, vbKey);
      const bindings = getOrCreatePbrBindings(engine, features, features2, meshFeatures, sceneFeatures, composed, `${lightMode}:${singleLightType}${vbKey}`, mat.stencil ?? null);
      const meshUboData = new F32(composed._meshUboSpec._totalBytes / 4);
      const _packMeshWorld = engine._makePackMeshWorld?.(s) ?? packMat4IntoF32;
      _packMeshWorld(meshUboData, mesh.worldMatrix, 0, 0);
      writeMeshLightSelection(mesh, s.lights, meshUboData);
      const meshUBO = createUniformBuffer(engine, meshUboData);
      const materialSpec = composed._materialUboSpec;
      const matInitData = new F32(materialSpec._totalBytes / 4);
      _writeMaterialData(matInitData, mat, materialSpec);
      const materialUBO = createUniformBuffer(engine, matInitData);
      const needsTaskRefraction = !!mat.transmissive && (features2 & PBR2_HAS_REFRACTION) !== 0;
      const materialBindGroupStatic = needsTaskRefraction ? null : createPbrMeshBindGroup(engine, bindings, composed, meshUBO, materialUBO, mat, envTextures ?? null, mesh);
      let shadowBindGroup = null;
      const meshShadowLights = receiveShadows ? shadowLights : [];
      if (meshShadowLights.length > 0 && bindings._shadowBGL) {
        let cached = shadowBGCache.get(bindings._shadowBGL);
        if (!cached) {
          const entries = [];
          let b = 0;
          for (const sl of meshShadowLights) {
            const sg = sl.gen;
            entries.push({ binding: b++, resource: sg._depthTexture.createView() });
            entries.push({ binding: b++, resource: sg._depthSampler });
            entries.push({ binding: b++, resource: { buffer: sg._shadowUBO } });
          }
          cached = device.createBindGroup({ layout: bindings._shadowBGL, entries });
          shadowBGCache.set(bindings._shadowBGL, cached);
        }
        shadowBindGroup = cached;
      }
      const boundTextures = collectPbrBoundTextures(mat);
      for (const t of boundTextures) {
        acquireTexture(t);
      }
      s._meshDisposables.set(mesh, [
        () => {
          meshUBO.destroy();
          materialUBO.destroy();
        },
        () => {
          for (const t of boundTextures) {
            releaseTexture(t);
          }
        }
      ]);
      const isTransparent = (features2 & (PBR2_NO_COLOR_OUTPUT | PBR2_ESM_SHADOW_OUTPUT)) === 0 && (features & PBR_HAS_ALPHA_BLEND) !== 0;
      const order = mesh.renderOrder ?? (isTransparent || needsTaskRefraction ? 150 : 100);
      const hasNormalMap = (features & PBR_HAS_NORMAL_MAP) !== 0;
      const hasUV2 = (features2 & PBR2_HAS_UV2) !== 0 && (meshFeatures & MSH_HAS_UV2) !== 0;
      const hasVertexColor = (meshFeatures & MSH_HAS_VERTEX_COLOR) !== 0;
      const hasTI = (meshFeatures & MSH_HAS_THIN_INSTANCES) !== 0;
      const hasTIColor = (meshFeatures & MSH_HAS_INSTANCE_COLOR) !== 0;
      let _lastWorldVersion = mesh.worldMatrixVersion;
      let _lastLightsCount = s.lights.length;
      const sortCenter = isTransparent || needsTaskRefraction ? [mesh.worldMatrix[12], mesh.worldMatrix[13], mesh.worldMatrix[14]] : null;
      const _baseUpdate = () => {
        const worldVersion = mesh.worldMatrixVersion;
        if (worldVersion !== _lastWorldVersion || s.lights.length !== _lastLightsCount) {
          if (sortCenter) {
            sortCenter[0] = mesh.worldMatrix[12];
            sortCenter[1] = mesh.worldMatrix[13];
            sortCenter[2] = mesh.worldMatrix[14];
          }
          _packMeshWorld(meshUboData, mesh.worldMatrix, 0, 0);
          writeMeshLightSelection(mesh, s.lights, meshUboData);
          device.queue.writeBuffer(meshUBO, 0, meshUboData);
          _lastWorldVersion = worldVersion;
          _lastLightsCount = s.lights.length;
        }
        const uboVersion = mat._uboVersion;
        if (uboVersion !== _lastUboVersion) {
          _lastUboVersion = uboVersion;
          let data = materialScratch.get(materialSpec._totalBytes);
          if (!data) {
            data = new F32(materialSpec._totalBytes / 4);
            materialScratch.set(materialSpec._totalBytes, data);
          } else {
            data.fill(0);
          }
          _writeMaterialData(data, mat, materialSpec);
          device.queue.writeBuffer(materialUBO, 0, data.buffer, 0, data.byteLength);
        }
        if (hasTI && syncThinInstanceGpuData2) {
          const ti = mesh.thinInstances;
          if (ti) {
            syncThinInstanceGpuData2(engine, ti, hasTIColor);
          }
        }
      };
      const _invalidate = () => {
        _lastWorldVersion = -1;
      };
      const update = engine._wrapRenderableForFO?.(_baseUpdate, s, _invalidate) ?? _baseUpdate;
      const drawWith = (pass, materialBindGroup, cullBinding) => {
        if (!isOverride && mesh.material !== materialInput) {
          return 0;
        }
        const gpu = mi._gpu;
        pass.setBindGroup(1, materialBindGroup);
        if (shadowBindGroup) {
          pass.setBindGroup(2, shadowBindGroup);
        }
        let slot = 0;
        pass.setVertexBuffer(slot++, gpu.positionBuffer);
        pass.setVertexBuffer(slot++, gpu.normalBuffer);
        if (hasNormalMap && gpu.tangentBuffer) {
          pass.setVertexBuffer(slot++, gpu.tangentBuffer);
        }
        pass.setVertexBuffer(slot++, gpu.uvBuffer);
        if (hasUV2 && gpu.uv2Buffer) {
          pass.setVertexBuffer(slot++, gpu.uv2Buffer);
        }
        if (hasVertexColor && gpu.colorBuffer) {
          pass.setVertexBuffer(slot++, gpu.colorBuffer);
        }
        const skin = mesh.skeleton ?? mesh.vat;
        if (skin) {
          pass.setVertexBuffer(slot++, skin.jointsBuffer);
          pass.setVertexBuffer(slot++, skin.weightsBuffer);
          if (skin.joints1Buffer && skin.weights1Buffer) {
            pass.setVertexBuffer(slot++, skin.joints1Buffer);
            pass.setVertexBuffer(slot++, skin.weights1Buffer);
          }
        }
        const ti = hasTI ? mesh.thinInstances : null;
        if (ti && syncThinInstanceBuffers2) {
          slot = syncThinInstanceBuffers2(engine, ti, pass, slot, hasTIColor, cullBinding?.cullDrawBufs);
        }
        pass.setIndexBuffer(gpu.indexBuffer, gpu.indexFormat);
        if (cullBinding) {
          cullBinding.draw(pass, gpu.indexCount, ti.count);
        } else if (ti && ti.count > 0) {
          pass.drawIndexed(gpu.indexCount, ti.count);
        } else {
          pass.drawIndexed(gpu.indexCount);
        }
        return 1;
      };
      const r = {
        order,
        isTransparent,
        _transmissive: needsTaskRefraction,
        mesh,
        bind(eng, sig) {
          const pipeline = getOrCreatePbrPipeline(eng, sig, bindings);
          const materialBindGroup = needsTaskRefraction ? createPbrMeshBindGroup(engine, bindings, composed, meshUBO, materialUBO, mat, envTextures ?? null, mesh, sig._transmissionTexture) : materialBindGroupStatic;
          const cb = _cull?.tryBind(r, s, mesh, engine, hasTIColor, isTransparent || needsTaskRefraction, update);
          return {
            renderable: r,
            pipeline,
            update: cb ? cb.update : update,
            draw: (pass) => drawWith(pass, materialBindGroup, cb)
          };
        }
      };
      if (sortCenter) {
        r._worldCenter = sortCenter;
      }
      let _lastUboVersion = mat._uboVersion;
      return r;
    };
    const renderables = meshes.map((m) => rebuildSingle(scene, m));
    scene._pbrGeomContext = {
      _composePbr: composePbr,
      _sceneFeatures: sceneFeatures,
      _envTextures: envTextures ?? null,
      _shadowLights: shadowLights,
      _syncThinInstanceBuffers
    };
    scene._disposables.push(
      () => clearPbrPipelineCache(),
      () => clearSamplerCache(engine)
    );
    return { renderables, rebuildSingle };
  }
  function toSingleLightType(type) {
    return type === "hemispheric" || type === "directional" || type === "spot" ? type : "point";
  }
  function getPackedSingleLightType(lights, packedIndex) {
    let packed = 0;
    for (const light of lights) {
      if (!light._writeLightUbo) {
        continue;
      }
      if (packed === packedIndex) {
        return toSingleLightType(light.lightType);
      }
      packed++;
    }
    return "point";
  }
  async function importSingleLightWgsl(type) {
    if (type === "hemispheric") {
      return Promise.resolve().then(() => (init_singlelight_hemispheric_wgsl(), singlelight_hemispheric_wgsl_exports));
    }
    if (type === "directional") {
      return Promise.resolve().then(() => (init_singlelight_directional_wgsl(), singlelight_directional_wgsl_exports));
    }
    if (type === "spot") {
      return Promise.resolve().then(() => (init_singlelight_spot_wgsl(), singlelight_spot_wgsl_exports));
    }
    return Promise.resolve().then(() => (init_singlelight_point_wgsl(), singlelight_point_wgsl_exports));
  }
  function _writeMaterialData(data, material, spec) {
    data[0] = material.environmentIntensity ?? 1;
    data[1] = material.directIntensity ?? 1;
    data[2] = material.reflectance ?? 0.04;
    data[3] = material.alpha ?? 1;
    const baseColorFactorOffset = spec._offsets.get("baseColorFactor");
    if (baseColorFactorOffset !== void 0) {
      const off = baseColorFactorOffset / 4;
      const factor = material.baseColorFactor;
      data[off] = factor ? factor[0] : 1;
      data[off + 1] = factor ? factor[1] : 1;
      data[off + 2] = factor ? factor[2] : 1;
      data[off + 3] = factor ? factor[3] : 1;
    }
    if (spec._offsets.has("metallicFactor")) {
      const off = spec._offsets.get("metallicFactor") / 4;
      data[off] = material.metallicFactor ?? 1;
      data[off + 1] = material.roughnessFactor ?? 1;
      data[off + 2] = material.normalTextureScale ?? 1;
      data[off + 3] = material.usePhysicalLightFalloff === false ? 0 : 1;
    }
    for (const ext14 of _getPbrExts().values()) {
      if (ext14.writeUbo) {
        ext14.writeUbo(data, material, spec._offsets);
      }
    }
  }
  var init_pbr_renderable = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-renderable.ts"() {
      "use strict";
      init_typed_arrays();
      init_pbr_material();
      init_gpu_pool();
      init_gpu_buffers();
      init_pbr_pipeline();
      init_pbr_flags();
      init_pbr_compose();
      init_pbr_material();
      init_lights_ubo();
      init_mesh_features();
      init_pack_mat4_into_f32();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-material.ts
  function _computePbrMaterialFeatures(mat) {
    let features = (mat.emissiveTexture ? PBR_HAS_EMISSIVE : 0) | (mat.emissiveColor ? PBR_HAS_EMISSIVE_COLOR : 0) | (mat.normalTexture ? PBR_HAS_NORMAL_MAP : 0) | ((mat.alphaCutOff ?? 0) > 0 ? PBR_HAS_ALPHA_TEST : 0) | (mat.alphaBlend === true || (mat.alphaCutOff ?? 0) <= 0 && mat.alpha < 1 ? PBR_HAS_ALPHA_BLEND : 0) | (mat.specGlossTexture ? PBR_HAS_SPEC_GLOSS : 0) | (mat.doubleSided ? PBR_HAS_DOUBLE_SIDED : 0);
    if ((mat.occlusionStrength ?? 1) > 0) {
      features |= PBR_HAS_OCCLUSION;
    }
    if (mat.enableSpecularAA) {
      features |= PBR_HAS_SPECULAR_AA;
    }
    if (mat.gammaAlbedo) {
      features |= PBR_HAS_GAMMA_ALBEDO;
    }
    if (mat.anisotropy?.isEnabled) {
      features |= PBR_HAS_ANISOTROPY;
    }
    if (mat.skyboxMode) {
      features |= PBR_HAS_SKYBOX;
    }
    let features2 = 0;
    for (const ext14 of _getPbrExts().values()) {
      if (ext14.detect) {
        const d = ext14.detect(mat);
        features |= d.f;
        features2 |= d.f2;
      }
    }
    if (mat._hasUvTx) {
      features2 |= PBR2_HAS_UV_TRANSFORM;
    }
    if (mat.occlusionTexCoord) {
      features2 |= PBR2_HAS_UV2;
    }
    if (mat.baseColorFactor) {
      features2 |= PBR2_HAS_BASE_COLOR_FACTOR;
    }
    return { features, features2 };
  }
  function collectPbrBoundTextures(mat) {
    const t = [];
    if (mat.baseColorTexture) {
      t.push(mat.baseColorTexture);
    }
    if (mat.normalTexture) {
      t.push(mat.normalTexture);
    }
    if (mat.ormTexture) {
      t.push(mat.ormTexture);
    }
    if (mat.occlusionTexture) {
      t.push(mat.occlusionTexture);
    }
    if (mat.emissiveTexture) {
      t.push(mat.emissiveTexture);
    }
    if (mat.specGlossTexture) {
      t.push(mat.specGlossTexture);
    }
    for (const ext14 of _getPbrExts().values()) {
      ext14.textures?.(mat, t);
    }
    return t;
  }
  var pbrGroupBuilder;
  var init_pbr_material = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/pbr-material.ts"() {
      "use strict";
      init_pbr_flags();
      pbrGroupBuilder = async (scene, meshes) => {
        const envTex = scene._envTextures;
        const renderableMod = await Promise.resolve().then(() => (init_pbr_renderable(), pbr_renderable_exports));
        const result = await renderableMod.buildPbrRenderables(scene, meshes, envTex);
        pbrGroupBuilder._rebuildSingle = result.rebuildSingle;
        return result;
      };
      pbrGroupBuilder._materialFamily = "pbr";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/_loader-scratch.ts
  function getLoaderTmpLocal() {
    return _tmpLocal ?? (_tmpLocal = allocateMat4());
  }
  function getLoaderTmpAnim() {
    return _tmpAnim ?? (_tmpAnim = allocateMat4());
  }
  function getLoaderTmpInstance() {
    return _tmpInstance ?? (_tmpInstance = allocateMat4());
  }
  var _tmpLocal, _tmpAnim, _tmpInstance;
  var init_loader_scratch = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/_loader-scratch.ts"() {
      "use strict";
      init_matrix_allocator();
      _tmpLocal = null;
      _tmpAnim = null;
      _tmpInstance = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-parser.ts
  function resolveAccessor(json, binChunk, accessorIdx) {
    const accessor = json.accessors[accessorIdx];
    const componentCount = TYPE_SIZES[accessor.type] ?? 1;
    const count = accessor.count;
    const len = count * componentCount;
    let Ctor;
    switch (accessor.componentType) {
      case FLOAT:
        Ctor = F32;
        break;
      case UNSIGNED_SHORT:
        Ctor = U16;
        break;
      case UNSIGNED_INT:
        Ctor = U32;
        break;
      case UNSIGNED_BYTE:
        Ctor = U8;
        break;
      default:
        throw new Error(`Unsupported component type: ${accessor.componentType}`);
    }
    const data = accessor.bufferView === void 0 ? new Ctor(len) : new Ctor(binChunk.buffer, binChunk.byteOffset + (json.bufferViews[accessor.bufferView].byteOffset ?? 0) + (accessor.byteOffset ?? 0), len);
    return { _data: data, _count: count, _componentCount: componentCount };
  }
  function getTextureImageIndex(tex) {
    return tex.extensions?.EXT_texture_webp?.source ?? tex.source;
  }
  function anyPrimitive(json, pred) {
    for (const m of json.meshes ?? []) {
      for (const p of m.primitives ?? []) {
        if (pred(p)) {
          return true;
        }
      }
    }
    return false;
  }
  function needsOrmComposite(json) {
    const mats = json.materials ?? [];
    const textures = json.textures ?? [];
    for (const m of mats) {
      const mr = m.pbrMetallicRoughness?.metallicRoughnessTexture;
      const occ = m.occlusionTexture;
      if (mr && occ && textures[mr.index] && textures[occ.index] && getTextureImageIndex(textures[mr.index]) !== getTextureImageIndex(textures[occ.index])) {
        return true;
      }
    }
    return false;
  }
  async function resolveImage(json, binChunk, imageIdx, baseUrl) {
    const image = json.images[imageIdx];
    if (image.bufferView !== void 0) {
      const bv = json.bufferViews[image.bufferView];
      const offset = binChunk.byteOffset + (bv.byteOffset ?? 0);
      const slice = binChunk.buffer.slice(offset, offset + bv.byteLength);
      const blob = new Blob([slice], { type: image.mimeType ?? "image/png" });
      return createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    }
    if (image.uri) {
      const imageUrl = new URL(image.uri, baseUrl + "x").href;
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const bmp = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
      return bmp;
    }
    throw new Error("Image has neither bufferView nor uri");
  }
  function buildParentMap(json) {
    const parentMap = /* @__PURE__ */ new Map();
    const nodes = json.nodes ?? [];
    for (let i = 0; i < nodes.length; i++) {
      const children = nodes[i].children;
      if (children) {
        for (const childIdx of children) {
          parentMap.set(childIdx, i);
        }
      }
    }
    return parentMap;
  }
  function findParent(parentMap, childIdx) {
    return parentMap.get(childIdx) ?? -1;
  }
  function computeNodeWorldMatrix(json, nodeIdx, parentMap, cache) {
    const cached = cache.get(nodeIdx);
    if (cached) {
      return cached;
    }
    const node = json.nodes[nodeIdx];
    const parentIdx = findParent(parentMap, nodeIdx);
    const parentWorld = parentIdx !== -1 ? computeNodeWorldMatrix(json, parentIdx, parentMap, cache) : RH_TO_LH_ROOT;
    let localBuf;
    if (node.matrix) {
      localBuf = new F32(node.matrix);
    } else {
      const t = node.translation ?? [0, 0, 0];
      const r = node.rotation ?? [0, 0, 0, 1];
      const s = node.scale ?? [1, 1, 1];
      const local = getLoaderTmpLocal();
      mat4ComposeInto(local, 0, t[0], t[1], t[2], r[0], r[1], r[2], r[3], s[0], s[1], s[2]);
      localBuf = local;
    }
    const world = new F32(16);
    mat4MultiplyInto(world, 0, parentWorld, 0, localBuf, 0);
    cache.set(nodeIdx, world);
    return world;
  }
  var FLOAT, UNSIGNED_SHORT, UNSIGNED_INT, UNSIGNED_BYTE, TYPE_SIZES, RH_TO_LH_ROOT;
  var init_gltf_parser = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-parser.ts"() {
      "use strict";
      init_typed_arrays();
      init_mat4_compose_into();
      init_mat4_multiply_into();
      init_loader_scratch();
      FLOAT = 5126;
      UNSIGNED_SHORT = 5123;
      UNSIGNED_INT = 5125;
      UNSIGNED_BYTE = 5121;
      TYPE_SIZES = {
        SCALAR: 1,
        VEC2: 2,
        VEC3: 3,
        VEC4: 4,
        MAT2: 4,
        MAT3: 9,
        MAT4: 16
      };
      RH_TO_LH_ROOT = new F32([-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-material.ts
  async function assembleMaterial(json, binChunk, materialIdx, baseUrl, imageCache) {
    const mat = json.materials?.[materialIdx];
    if (!mat) {
      return {
        _baseColorFactor: [1, 1, 1, 1],
        _metallicFactor: 1,
        _roughnessFactor: 1,
        _emissiveFactor: [0, 0, 0],
        _baseColorImage: null,
        _metallicRoughnessImage: null,
        _normalImage: null,
        _normalScale: 1,
        _occlusionTexCoord: 0,
        _occlusionImage: null,
        _emissiveImage: null,
        _doubleSided: false,
        _alphaMode: "OPAQUE",
        _alphaCutoff: 0.5
      };
    }
    const pbr = mat.pbrMetallicRoughness ?? {};
    const fetchImg = makeImageFetcher(json, binChunk, baseUrl, imageCache);
    const [baseColorImg, mrImg, normalImg, occlusionImg, emissiveImg] = await Promise.all([
      fetchImg(pbr.baseColorTexture),
      fetchImg(pbr.metallicRoughnessTexture),
      fetchImg(mat.normalTexture),
      fetchImg(mat.occlusionTexture),
      fetchImg(mat.emissiveTexture)
    ]);
    return {
      _baseColorFactor: pbr.baseColorFactor ?? [1, 1, 1, 1],
      _metallicFactor: pbr.metallicFactor ?? 1,
      _roughnessFactor: pbr.roughnessFactor ?? 1,
      _emissiveFactor: mat.emissiveFactor ?? [0, 0, 0],
      _baseColorImage: baseColorImg,
      _metallicRoughnessImage: mrImg,
      _normalImage: normalImg,
      _normalScale: typeof mat.normalTexture?.scale === "number" ? mat.normalTexture.scale : 1,
      _occlusionTexCoord: typeof mat.occlusionTexture?.texCoord === "number" ? mat.occlusionTexture.texCoord : 0,
      _occlusionImage: occlusionImg,
      _emissiveImage: emissiveImg,
      _doubleSided: !!mat.doubleSided,
      _alphaMode: mat.alphaMode ?? "OPAQUE",
      _alphaCutoff: mat.alphaCutoff ?? 0.5,
      _rawMatDef: mat
    };
  }
  function makeImageFetcher(json, binChunk, baseUrl, imageCache) {
    return (texInfo) => {
      if (!texInfo) {
        return Promise.resolve(null);
      }
      const imgIdx = getTextureImageIndex(json.textures[texInfo.index]);
      if (imageCache) {
        let cached = imageCache.get(imgIdx);
        if (!cached) {
          cached = resolveImage(json, binChunk, imgIdx, baseUrl);
          imageCache.set(imgIdx, cached);
        }
        return cached;
      }
      return resolveImage(json, binChunk, imgIdx, baseUrl);
    };
  }
  var init_gltf_material = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-material.ts"() {
      "use strict";
      init_gltf_parser();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/color.ts
  function linearToSrgbByte(v2) {
    const c = Math.max(0, Math.min(1, v2));
    return Math.round((c <= 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
  }
  var init_color = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/color.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-pbr-builder.ts
  function uploadTex(engine, bitmap, srgb, sampler, generateMipmaps2, fallback) {
    const device = engine._device;
    const w = bitmap?.width ?? 1;
    const h = bitmap?.height ?? 1;
    const fmt = srgb ? "rgba8unorm-srgb" : "rgba8unorm";
    const mips = bitmap ? mipLevelCount(w, h) : 1;
    const tex = device.createTexture({
      size: { width: w, height: h },
      format: fmt,
      usage: TU.TEXTURE_BINDING | TU.COPY_DST | TU.COPY_SRC | TU.RENDER_ATTACHMENT,
      mipLevelCount: mips
    });
    if (bitmap) {
      device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: tex, premultipliedAlpha: false }, { width: w, height: h });
      generateMipmaps2(engine, tex);
    } else {
      device.queue.writeTexture({ texture: tex }, fallback ?? new U8([255, 255, 255, 255]), { bytesPerRow: 4 }, { width: 1, height: 1 });
    }
    const result = {
      texture: tex,
      view: tex.createView(),
      sampler,
      width: w,
      height: h
    };
    engine._dlr?.b(result, bitmap, srgb, !!bitmap, fallback);
    return result;
  }
  function assemblePbrProps(mat, baseColorTexture, ormTexture, normalTexture, emissiveTexture, extLayers) {
    const ef = mat._emissiveFactor;
    const defaultFactor = ef[0] === 1 && ef[1] === 1 && ef[2] === 1 || ef[0] === 0 && ef[1] === 0 && ef[2] === 0;
    return {
      baseColorTexture,
      normalTexture,
      ormTexture,
      emissiveTexture,
      ...mat._baseColorImage && !isDefaultBaseColorFactor(mat._baseColorFactor) ? { baseColorFactor: mat._baseColorFactor } : void 0,
      doubleSided: mat._doubleSided,
      occlusionStrength: mat._occlusionImage ? 1 : 0,
      ...mat._normalScale !== 1 ? { normalTextureScale: mat._normalScale } : void 0,
      ...mat._metallicRoughnessImage ? { metallicFactor: mat._metallicFactor, roughnessFactor: mat._roughnessFactor } : void 0,
      ...!defaultFactor ? { emissiveColor: [ef[0], ef[1], ef[2]] } : void 0,
      enableSpecularAA: true,
      ...mat._alphaMode === "BLEND" ? { alphaBlend: true, alpha: mat._baseColorFactor[3] } : void 0,
      ...mat._alphaMode === "MASK" ? { alpha: mat._baseColorFactor[3], alphaCutOff: mat._alphaCutoff } : void 0,
      ...mat._rawMatDef?.name ? { name: mat._rawMatDef.name } : void 0,
      ...extLayers,
      _buildGroup: pbrGroupBuilder,
      _uboVersion: 0
    };
  }
  function isDefaultBaseColorFactor(f) {
    return f[0] === 1 && f[1] === 1 && f[2] === 1 && f[3] === 1;
  }
  function buildDefaultPbrTextures(engine, mat, sampler, generateMipmaps2, getCachedTex) {
    const baseColorTexture = mat._baseColorImage ? getCachedTex(mat._baseColorImage, true) : (() => {
      const f = mat._baseColorFactor;
      return uploadTex(
        engine,
        null,
        true,
        sampler,
        generateMipmaps2,
        new U8([linearToSrgbByte(f[0]), linearToSrgbByte(f[1]), linearToSrgbByte(f[2]), Math.round(Math.max(0, Math.min(1, f[3])) * 255)])
      );
    })();
    const normalTexture = mat._normalImage ? getCachedTex(mat._normalImage, false) : void 0;
    const emissiveTexture = mat._emissiveImage ? getCachedTex(mat._emissiveImage, true) : void 0;
    const single = mat._metallicRoughnessImage ?? mat._occlusionImage;
    let ormTexture;
    if (single && (!mat._metallicRoughnessImage || !mat._occlusionImage || mat._metallicRoughnessImage === mat._occlusionImage)) {
      ormTexture = getCachedTex(single, false);
    } else if (!single) {
      const clamp2 = (v2) => Math.round(Math.max(0, Math.min(1, v2)) * 255);
      ormTexture = uploadTex(engine, null, false, sampler, generateMipmaps2, new U8([255, clamp2(mat._roughnessFactor), clamp2(mat._metallicFactor), 255]));
    } else {
      ormTexture = getCachedTex(mat._metallicRoughnessImage, false);
    }
    return { baseColorTexture, ormTexture, normalTexture, emissiveTexture };
  }
  async function runMatExts(mat, exts, ctx) {
    if (!exts.length) {
      return void 0;
    }
    const fragments = await Promise.all(exts.map((ext14) => ext14.applyMaterial(mat, ctx)));
    let layers;
    for (const f of fragments) {
      if (f) {
        layers ?? (layers = {});
        Object.assign(layers, f);
      }
    }
    return layers;
  }
  var identityTexWrap;
  var init_gltf_pbr_builder = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-pbr-builder.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_pbr_material();
      init_mip_count();
      init_color();
      identityTexWrap = (tex) => tex;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-interleave.ts
  var gltf_interleave_exports = {};
  __export(gltf_interleave_exports, {
    accessorIsStrided: () => accessorIsStrided,
    buildInterleavedMesh: () => buildInterleavedMesh,
    buildInterleavedPartial: () => buildInterleavedPartial,
    computeAabbStrided: () => computeAabbStrided,
    installLazyCpu: () => installLazyCpu
  });
  function createSequentialIndices(vertexCount) {
    const indices = vertexCount > 65535 ? new U32(vertexCount) : new U16(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      indices[i] = i;
    }
    return indices;
  }
  function accessorIsStrided(json, idx) {
    const a = json.accessors[idx];
    const bv = json.bufferViews[a.bufferView];
    const stride = bv.byteStride;
    if (stride === void 0) {
      return false;
    }
    const elemBytes = (TYPE_SIZES[a.type] ?? 1) * (COMP_BYTES[a.componentType] ?? 4);
    return stride !== elemBytes;
  }
  function resolveStrided(json, binChunk, accessorIdx) {
    const accessor = json.accessors[accessorIdx];
    const bufferView = json.bufferViews[accessor.bufferView];
    const ab = binChunk.buffer;
    return {
      _bufferView: accessor.bufferView,
      _stride: bufferView.byteStride,
      _offset: accessor.byteOffset ?? 0,
      _componentType: accessor.componentType,
      _componentCount: TYPE_SIZES[accessor.type] ?? 1,
      _count: accessor.count,
      _slice: new U8(ab, binChunk.byteOffset + (bufferView.byteOffset ?? 0), bufferView.byteLength)
    };
  }
  function destrideToTight(il) {
    const dv = new DV(il._slice.buffer, il._slice.byteOffset, il._slice.byteLength);
    const cb = COMP_BYTES[il._componentType] ?? 4;
    const ct = il._componentType;
    const cc = il._componentCount;
    const out = new F32(il._count * cc);
    for (let v2 = 0; v2 < il._count; v2++) {
      const rowBase = il._offset + v2 * il._stride;
      for (let c = 0; c < cc; c++) {
        const off = rowBase + c * cb;
        out[v2 * cc + c] = ct === FLOAT2 ? dv.getFloat32(off, true) : ct === UNSIGNED_SHORT2 ? dv.getUint16(off, true) : ct === UNSIGNED_INT2 ? dv.getUint32(off, true) : dv.getUint8(off);
      }
    }
    return out;
  }
  function buildInterleavedPartial(json, binChunk, primitive, worldMatrix, nodeIdx) {
    const attrs = primitive.attributes;
    let anyStrided = false;
    for (const name in attrs) {
      if (accessorIsStrided(json, attrs[name])) {
        anyStrided = true;
        break;
      }
    }
    if (!anyStrided) {
      return void 0;
    }
    const vb = {};
    let vertexCount = 0;
    const resolveOne = (name, eager) => {
      const idx = attrs[name];
      if (idx === void 0) {
        return { _tight: null, _count: 0 };
      }
      if (accessorIsStrided(json, idx)) {
        const il = resolveStrided(json, binChunk, idx);
        return { _tight: eager ? destrideToTight(il) : null, _il: il, _count: il._count };
      }
      const av = resolveAccessor(json, binChunk, idx);
      return { _tight: av._data, _count: av._count };
    };
    const pos = resolveOne("POSITION", false);
    vb._p = pos._il;
    vertexCount = pos._count;
    const nrm = resolveOne("NORMAL", false);
    vb._n = nrm._il;
    const uv = resolveOne("TEXCOORD_0", false);
    vb._u = uv._il;
    const tan = resolveOne("TANGENT", true);
    vb._t = tan._il;
    const uv2 = resolveOne("TEXCOORD_1", true);
    vb._u2 = uv2._il;
    const col = resolveOne("COLOR_0", true);
    vb._c = col._il;
    const positions = pos._tight;
    let normals = nrm._tight;
    let uvs = uv._tight;
    const tangents = tan._tight;
    const uv2s = uv2._tight;
    const colors = col._tight;
    if (!normals && !vb._n) {
      normals = new F32(vertexCount * 3);
    }
    if (!uvs && !vb._u) {
      uvs = new F32(vertexCount * 2);
    }
    const idxData = primitive.indices !== void 0 ? resolveAccessor(json, binChunk, primitive.indices) : null;
    const indices = idxData ? idxData._data instanceof U32 ? new U32(idxData._data) : idxData._data instanceof U8 ? Uint16Array.from(idxData._data) : new U16(idxData._data.buffer, idxData._data.byteOffset, idxData._count) : createSequentialIndices(vertexCount);
    return {
      _positions: positions,
      _normals: normals,
      _tangents: tangents,
      _uvs: uvs,
      _uv2s: uv2s,
      _colors: colors,
      _indices: indices,
      _vertexCount: vertexCount,
      _indexCount: indices.length,
      _worldMatrix: worldMatrix,
      _vb: vb,
      _nodeIndex: nodeIdx,
      _primitive: primitive
    };
  }
  function buildInterleavedGpu(engine, m) {
    const vbsrc = m._vb;
    const shared = /* @__PURE__ */ new Map();
    const vbuf = (a, tight) => {
      if (!a) {
        return tight ? createMappedBuffer(engine, tight, BU.VERTEX) : null;
      }
      let b = shared.get(a._bufferView);
      if (!b) {
        shared.set(a._bufferView, b = createMappedBuffer(engine, a._slice, BU.VERTEX));
      }
      return b;
    };
    const k = (a) => `${a?._stride ?? 0},${a?._offset ?? 0}`;
    return {
      positionBuffer: vbuf(vbsrc._p, m._positions),
      normalBuffer: vbuf(vbsrc._n, m._normals),
      tangentBuffer: m._tangents ? vbuf(vbsrc._t, m._tangents) : null,
      uvBuffer: vbuf(vbsrc._u, m._uvs),
      uv2Buffer: m._uv2s ? vbuf(vbsrc._u2, m._uv2s) : null,
      colorBuffer: m._colors ? vbuf(vbsrc._c, m._colors) : null,
      indexBuffer: createMappedBuffer(engine, m._indices, BU.INDEX),
      indexCount: m._indexCount,
      indexFormat: m._indices instanceof U32 ? "uint32" : "uint16",
      _vbLayout: vbsrc,
      _vbKey: `vb${k(vbsrc._p)}.${k(vbsrc._n)}.${k(vbsrc._t)}.${k(vbsrc._u)}`
    };
  }
  function buildInterleavedMesh(engine, m, index, material) {
    const gpu = buildInterleavedGpu(engine, m);
    const [boundMin, boundMax] = m._vb._p ? computeAabbStrided(m._vb._p, m._worldMatrix) : computeAabb(m._positions, m._worldMatrix);
    const mesh = {
      name: `gltf_mesh_${index}`,
      material,
      receiveShadows: false,
      boundMin,
      boundMax,
      skeleton: null,
      morphTargets: null,
      _gpu: gpu
    };
    initMeshTransform(mesh);
    installLazyCpu(mesh, m);
    mesh._cpuIndices = m._indices instanceof U32 ? m._indices : new U32(m._indices);
    engine._dlr?.m(mesh, m._uv2s, m._tangents, m._colors, m._indices, gpu.indexFormat);
    return mesh;
  }
  function computeAabbStrided(il, world) {
    const dv = new DV(il._slice.buffer, il._slice.byteOffset, il._slice.byteLength);
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let v2 = 0; v2 < il._count; v2++) {
      const base = il._offset + v2 * il._stride;
      const lx = dv.getFloat32(base, true);
      const ly = dv.getFloat32(base + 4, true);
      const lz = dv.getFloat32(base + 8, true);
      let x = lx, y = ly, z = lz;
      if (world) {
        x = world[0] * lx + world[4] * ly + world[8] * lz + world[12];
        y = world[1] * lx + world[5] * ly + world[9] * lz + world[13];
        z = world[2] * lx + world[6] * ly + world[10] * lz + world[14];
      }
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
    return [
      [minX, minY, minZ],
      [maxX, maxY, maxZ]
    ];
  }
  function installLazyCpu(mesh, m) {
    const vb = m._vb;
    if (vb._p) {
      Object.defineProperty(mesh, "_cpuPositions", lazyCpuDesc(vb._p));
    } else if (m._positions) {
      mesh._cpuPositions = m._positions;
    }
    if (vb._n) {
      Object.defineProperty(mesh, "_cpuNormals", lazyCpuDesc(vb._n));
    } else if (m._normals) {
      mesh._cpuNormals = m._normals;
    }
    if (vb._u) {
      Object.defineProperty(mesh, "_cpuUvs", lazyCpuDesc(vb._u));
    } else if (m._uvs) {
      mesh._cpuUvs = m._uvs;
    }
  }
  function lazyCpuDesc(il) {
    let cached;
    return {
      configurable: true,
      enumerable: true,
      get() {
        return cached ?? (cached = destrideToTight(il));
      },
      set(v2) {
        cached = v2;
      }
    };
  }
  var FLOAT2, UNSIGNED_SHORT2, UNSIGNED_INT2, UNSIGNED_BYTE2, COMP_BYTES;
  var init_gltf_interleave = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-interleave.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_compute_aabb();
      init_mesh();
      init_gpu_buffers();
      init_gltf_parser();
      FLOAT2 = 5126;
      UNSIGNED_SHORT2 = 5123;
      UNSIGNED_INT2 = 5125;
      UNSIGNED_BYTE2 = 5121;
      COMP_BYTES = { [UNSIGNED_BYTE2]: 1, [UNSIGNED_SHORT2]: 2, [UNSIGNED_INT2]: 4, [FLOAT2]: 4 };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/meshopt-decode.ts
  function loadMeshoptScript() {
    if (scriptLoadPromise) {
      return scriptLoadPromise;
    }
    scriptLoadPromise = new Promise((resolve, reject) => {
      const existing = globalThis.MeshoptDecoder;
      if (existing) {
        resolve(existing);
        return;
      }
      const script = document.createElement("script");
      script.src = meshoptBaseUrl + "meshopt_decoder.js";
      script.onload = () => {
        const mod = globalThis.MeshoptDecoder;
        if (!mod) {
          reject(new Error("meshopt_decoder.js loaded but MeshoptDecoder is undefined"));
        } else {
          resolve(mod);
        }
      };
      script.onerror = () => reject(new Error("Failed to load meshopt_decoder.js from " + script.src));
      document.head.appendChild(script);
    });
    return scriptLoadPromise;
  }
  async function getMeshoptDecoder() {
    const mod = await loadMeshoptScript();
    await mod.ready;
    return mod;
  }
  var meshoptBaseUrl, scriptLoadPromise;
  var init_meshopt_decode = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/meshopt-decode.ts"() {
      "use strict";
      meshoptBaseUrl = "/";
      scriptLoadPromise = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-meshopt.ts
  var gltf_feature_meshopt_exports = {};
  __export(gltf_feature_meshopt_exports, {
    default: () => gltf_feature_meshopt_default
  });
  function align4(n) {
    return n + 3 & ~3;
  }
  var feature, gltf_feature_meshopt_default;
  var init_gltf_feature_meshopt = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-meshopt.ts"() {
      "use strict";
      init_typed_arrays();
      init_meshopt_decode();
      feature = {
        id: "EXT_meshopt_compression",
        async preParse(json, binChunk) {
          const bufferViews = json.bufferViews ?? [];
          const decoder = await getMeshoptDecoder();
          const materialized = new Array(bufferViews.length);
          const newOffsets = new Array(bufferViews.length);
          let total = 0;
          for (let i = 0; i < bufferViews.length; i++) {
            const bv = bufferViews[i];
            const ext14 = bv.extensions?.EXT_meshopt_compression;
            let bytes;
            if (ext14) {
              if ((ext14.buffer ?? 0) !== 0) {
                throw new Error(`EXT_meshopt_compression: compressed source buffer ${ext14.buffer} is not buffer 0 (unsupported)`);
              }
              const source = new U8(binChunk.buffer, binChunk.byteOffset + (ext14.byteOffset ?? 0), ext14.byteLength);
              const target = new U8(ext14.count * ext14.byteStride);
              decoder.decodeGltfBuffer(target, ext14.count, ext14.byteStride, source, ext14.mode, ext14.filter ?? "NONE");
              bytes = target;
            } else {
              if ((bv.buffer ?? 0) !== 0) {
                throw new Error(`EXT_meshopt_compression: uncompressed bufferView in buffer ${bv.buffer} is not buffer 0 (unsupported)`);
              }
              bytes = new U8(binChunk.buffer.slice(binChunk.byteOffset + (bv.byteOffset ?? 0), binChunk.byteOffset + (bv.byteOffset ?? 0) + bv.byteLength));
            }
            materialized[i] = bytes;
            newOffsets[i] = total;
            total = align4(total + bytes.length);
          }
          const packed = new U8(total);
          for (let i = 0; i < bufferViews.length; i++) {
            const bv = bufferViews[i];
            packed.set(materialized[i], newOffsets[i]);
            bv.buffer = 0;
            bv.byteOffset = newOffsets[i];
            bv.byteLength = materialized[i].length;
            if (bv.extensions) {
              delete bv.extensions.EXT_meshopt_compression;
            }
          }
          return new DV(packed.buffer);
        }
      };
      gltf_feature_meshopt_default = feature;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-quantization.ts
  var gltf_ext_quantization_exports = {};
  __export(gltf_ext_quantization_exports, {
    default: () => gltf_ext_quantization_default
  });
  function align42(n) {
    return n + 3 & ~3;
  }
  function readComponent(view, offset, componentType, normalized) {
    switch (componentType) {
      case BYTE: {
        const c = view.getInt8(offset);
        return normalized ? Math.max(c / 127, -1) : c;
      }
      case UNSIGNED_BYTE3: {
        const c = view.getUint8(offset);
        return normalized ? c / 255 : c;
      }
      case SHORT: {
        const c = view.getInt16(offset, true);
        return normalized ? Math.max(c / 32767, -1) : c;
      }
      case UNSIGNED_SHORT3: {
        const c = view.getUint16(offset, true);
        return normalized ? c / 65535 : c;
      }
      case FLOAT3:
        return view.getFloat32(offset, true);
      default:
        throw new Error(`KHR_mesh_quantization: unsupported componentType ${componentType}`);
    }
  }
  var BYTE, UNSIGNED_BYTE3, SHORT, UNSIGNED_SHORT3, FLOAT3, TYPE_COMPONENTS, COMPONENT_BYTES, feature2, gltf_ext_quantization_default;
  var init_gltf_ext_quantization = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-quantization.ts"() {
      "use strict";
      init_typed_arrays();
      BYTE = 5120;
      UNSIGNED_BYTE3 = 5121;
      SHORT = 5122;
      UNSIGNED_SHORT3 = 5123;
      FLOAT3 = 5126;
      TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
      COMPONENT_BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
      feature2 = {
        id: "KHR_mesh_quantization",
        async preParse(json, binChunk) {
          const accessors = json.accessors ?? [];
          const bufferViews = json.bufferViews ?? [];
          const convert = [];
          let appended = 0;
          for (let i = 0; i < accessors.length; i++) {
            const a = accessors[i];
            if (a.bufferView === void 0) {
              continue;
            }
            const componentCount = TYPE_COMPONENTS[a.type] ?? 1;
            const stride = bufferViews[a.bufferView]?.byteStride;
            const signed = a.componentType === BYTE || a.componentType === SHORT;
            const stridedFloat = a.componentType === FLOAT3 && stride !== void 0 && stride !== componentCount * 4;
            if (signed || a.normalized === true || stridedFloat) {
              convert.push(i);
              appended = align42(appended + a.count * componentCount * 4);
            }
          }
          if (convert.length === 0) {
            return;
          }
          const baseLen = align42(binChunk.byteLength);
          const out = new ArrayBuffer(baseLen + appended);
          new U8(out).set(new U8(binChunk.buffer, binChunk.byteOffset, binChunk.byteLength));
          const outView = new DV(out);
          let cursor = baseLen;
          for (const i of convert) {
            const a = accessors[i];
            const bv = bufferViews[a.bufferView];
            const componentCount = TYPE_COMPONENTS[a.type] ?? 1;
            const compBytes = COMPONENT_BYTES[a.componentType];
            const stride = bv.byteStride ?? componentCount * compBytes;
            const srcBase = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
            const dstOffset = cursor;
            for (let v2 = 0; v2 < a.count; v2++) {
              for (let c = 0; c < componentCount; c++) {
                const value = readComponent(binChunk, srcBase + v2 * stride + c * compBytes, a.componentType, !!a.normalized);
                outView.setFloat32(dstOffset + (v2 * componentCount + c) * 4, value, true);
              }
            }
            const byteLength = a.count * componentCount * 4;
            const newBvIndex = bufferViews.length;
            bufferViews.push({ buffer: 0, byteOffset: dstOffset, byteLength });
            a.bufferView = newBvIndex;
            a.byteOffset = 0;
            a.componentType = FLOAT3;
            a.normalized = false;
            cursor = align42(cursor + byteLength);
          }
          return outView;
        }
      };
      gltf_ext_quantization_default = feature2;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/draco-decode.ts
  function loadDracoScript() {
    if (scriptLoadPromise2) {
      return scriptLoadPromise2;
    }
    scriptLoadPromise2 = new Promise((resolve, reject) => {
      const existing = globalThis.DracoDecoderModule;
      if (existing) {
        resolve(existing);
        return;
      }
      const script = document.createElement("script");
      script.src = dracoBaseUrl + "draco_decoder.js";
      script.onload = () => {
        const factory = globalThis.DracoDecoderModule;
        if (!factory) {
          reject(new Error("draco_decoder.js loaded but DracoDecoderModule is undefined"));
        } else {
          resolve(factory);
        }
      };
      script.onerror = () => reject(new Error("Failed to load draco_decoder.js from " + script.src));
      document.head.appendChild(script);
    });
    return scriptLoadPromise2;
  }
  async function getDracoModule() {
    if (modulePromise) {
      return modulePromise;
    }
    modulePromise = (async () => {
      const factory = await loadDracoScript();
      return factory({ locateFile: (f) => dracoBaseUrl + f });
    })();
    return modulePromise;
  }
  async function decodeDracoPrimitive(compressed, attributeMap, accessorTypes) {
    const module = await getDracoModule();
    const decoder = new module.Decoder();
    const buffer = new module.DecoderBuffer();
    buffer.Init(compressed, compressed.byteLength);
    const mesh = new module.Mesh();
    const status = decoder.DecodeBufferToMesh(buffer, mesh);
    if (!status.ok()) {
      const err = status.error_msg();
      module.destroy(buffer);
      module.destroy(mesh);
      module.destroy(decoder);
      throw new Error("Draco decode failed: " + err);
    }
    const numPoints = mesh.num_points();
    const numFaces = mesh.num_faces();
    const indexCount = numFaces * 3;
    const indexByteLength = indexCount * 4;
    const indexPtr = module._malloc(indexByteLength);
    decoder.GetTrianglesUInt32Array(mesh, indexByteLength, indexPtr);
    const indices = new U32(module.HEAPU32.buffer, indexPtr, indexCount).slice();
    module._free(indexPtr);
    const attributes = /* @__PURE__ */ new Map();
    for (const name of Object.keys(attributeMap)) {
      const uniqueId = attributeMap[name];
      const attr = decoder.GetAttributeByUniqueId(mesh, uniqueId);
      const componentCount = accessorTypes[name] ?? 3;
      const totalComponents = numPoints * componentCount;
      const isIntAttr = name === "JOINTS_0" || name === "JOINTS_1";
      const bytesPerElement = 4;
      const byteLength = totalComponents * bytesPerElement;
      const ptr = module._malloc(byteLength);
      const dataType = isIntAttr ? module.DT_INT32 : module.DT_FLOAT32;
      decoder.GetAttributeDataArrayForAllPoints(mesh, attr, dataType, byteLength, ptr);
      if (isIntAttr) {
        attributes.set(name, new I32(module.HEAP32.buffer, ptr, totalComponents).slice());
      } else {
        attributes.set(name, new F32(module.HEAPF32.buffer, ptr, totalComponents).slice());
      }
      module._free(ptr);
    }
    module.destroy(buffer);
    module.destroy(mesh);
    module.destroy(decoder);
    return { _attributes: attributes, _indices: indices, _vertexCount: numPoints, _indexCount: indexCount };
  }
  function getDracoBufferViewBytes(json, binChunk, bufferViewIdx) {
    const view = json.bufferViews[bufferViewIdx];
    if (!view) {
      throw new Error(`Draco bufferView ${bufferViewIdx} not found`);
    }
    const offset = binChunk.byteOffset + (view.byteOffset ?? 0);
    return new U8(binChunk.buffer, offset, view.byteLength);
  }
  var dracoBaseUrl, modulePromise, scriptLoadPromise2;
  var init_draco_decode = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/draco-decode.ts"() {
      "use strict";
      init_typed_arrays();
      dracoBaseUrl = "/";
      modulePromise = null;
      scriptLoadPromise2 = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-draco.ts
  var gltf_feature_draco_exports = {};
  __export(gltf_feature_draco_exports, {
    default: () => gltf_feature_draco_default
  });
  var TYPE_COMPONENT_COUNTS, feature3, gltf_feature_draco_default;
  var init_gltf_feature_draco = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-draco.ts"() {
      "use strict";
      init_draco_decode();
      TYPE_COMPONENT_COUNTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
      feature3 = {
        id: "KHR_draco_mesh_compression",
        async preMesh(jsonIn, binChunk) {
          const json = jsonIn;
          const out = /* @__PURE__ */ new Map();
          for (const mesh of json.meshes ?? []) {
            for (const primitive of mesh.primitives ?? []) {
              const ext14 = primitive.extensions?.KHR_draco_mesh_compression;
              if (!ext14) {
                continue;
              }
              const bytes = getDracoBufferViewBytes(json, binChunk, ext14.bufferView);
              const accessorTypes = {};
              for (const name of Object.keys(ext14.attributes)) {
                const accIdx = primitive.attributes?.[name];
                if (accIdx !== void 0 && json.accessors?.[accIdx]) {
                  accessorTypes[name] = TYPE_COMPONENT_COUNTS[json.accessors[accIdx].type] ?? 3;
                }
              }
              const decoded = await decodeDracoPrimitive(bytes, ext14.attributes, accessorTypes);
              out.set(primitive, decoded);
            }
          }
          return out;
        }
      };
      gltf_feature_draco_default = feature3;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-clearcoat.ts
  var gltf_ext_clearcoat_exports = {};
  __export(gltf_ext_clearcoat_exports, {
    default: () => gltf_ext_clearcoat_default
  });
  var ext, gltf_ext_clearcoat_default;
  var init_gltf_ext_clearcoat = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-clearcoat.ts"() {
      "use strict";
      ext = {
        id: "KHR_materials_clearcoat",
        async applyMaterial(mat, ctx) {
          const c = mat._rawMatDef?.extensions?.KHR_materials_clearcoat;
          if (!c) {
            return null;
          }
          const [tex, rough, normal] = await Promise.all([
            ctx._texture(c.clearcoatTexture, false),
            ctx._texture(c.clearcoatRoughnessTexture, false),
            ctx._texture(c.clearcoatNormalTexture, false)
          ]);
          return {
            clearCoat: {
              isEnabled: true,
              intensity: c.clearcoatFactor ?? (c.clearcoatTexture ? 1 : 0),
              roughness: c.clearcoatRoughnessFactor ?? (c.clearcoatRoughnessTexture ? 1 : 0),
              texture: tex,
              roughnessTexture: rough,
              bumpTexture: normal,
              bumpTextureScale: c.clearcoatNormalTexture?.scale ?? 1,
              useF0Remap: false
            }
          };
        }
      };
      gltf_ext_clearcoat_default = ext;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-iridescence.ts
  var gltf_ext_iridescence_exports = {};
  __export(gltf_ext_iridescence_exports, {
    default: () => gltf_ext_iridescence_default
  });
  var ext2, gltf_ext_iridescence_default;
  var init_gltf_ext_iridescence = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-iridescence.ts"() {
      "use strict";
      ext2 = {
        id: "KHR_materials_iridescence",
        async applyMaterial(mat, ctx) {
          const iri = mat._rawMatDef?.extensions?.KHR_materials_iridescence;
          if (!iri) {
            return null;
          }
          const [tex, thicknessTex] = await Promise.all([ctx._texture(iri.iridescenceTexture, true), ctx._texture(iri.iridescenceThicknessTexture, true)]);
          return {
            iridescence: {
              isEnabled: true,
              intensity: iri.iridescenceFactor ?? 0,
              indexOfRefraction: iri.iridescenceIor ?? 1.3,
              minimumThickness: iri.iridescenceThicknessMinimum ?? 100,
              maximumThickness: iri.iridescenceThicknessMaximum ?? 400,
              texture: tex,
              thicknessTexture: thicknessTex
            }
          };
        }
      };
      gltf_ext_iridescence_default = ext2;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-emissive-strength.ts
  var gltf_ext_emissive_strength_exports = {};
  __export(gltf_ext_emissive_strength_exports, {
    default: () => gltf_ext_emissive_strength_default
  });
  var ext3, gltf_ext_emissive_strength_default;
  var init_gltf_ext_emissive_strength = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-emissive-strength.ts"() {
      "use strict";
      ext3 = {
        id: "KHR_materials_emissive_strength",
        async applyMaterial(mat) {
          const e = mat._rawMatDef?.extensions?.KHR_materials_emissive_strength;
          if (!e) {
            return null;
          }
          const s = e.emissiveStrength ?? 1;
          const f = mat._emissiveFactor;
          return {
            emissiveColor: [f[0] * s, f[1] * s, f[2] * s]
          };
        }
      };
      gltf_ext_emissive_strength_default = ext3;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-sheen.ts
  var gltf_ext_sheen_exports = {};
  __export(gltf_ext_sheen_exports, {
    default: () => gltf_ext_sheen_default
  });
  var ext4, gltf_ext_sheen_default;
  var init_gltf_ext_sheen = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-sheen.ts"() {
      "use strict";
      ext4 = {
        id: "KHR_materials_sheen",
        async applyMaterial(mat, ctx) {
          const s = mat._rawMatDef?.extensions?.KHR_materials_sheen;
          if (!s) {
            return null;
          }
          const tex = await ctx._texture(s.sheenColorTexture, true);
          return {
            sheen: {
              isEnabled: true,
              color: s.sheenColorFactor ?? [0, 0, 0],
              roughness: s.sheenRoughnessFactor ?? 0,
              intensity: 1,
              texture: tex,
              albedoScaling: true
            }
          };
        }
      };
      gltf_ext_sheen_default = ext4;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-anisotropy.ts
  var gltf_ext_anisotropy_exports = {};
  __export(gltf_ext_anisotropy_exports, {
    default: () => gltf_ext_anisotropy_default
  });
  var ext5, gltf_ext_anisotropy_default;
  var init_gltf_ext_anisotropy = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-anisotropy.ts"() {
      "use strict";
      ext5 = {
        id: "KHR_materials_anisotropy",
        async applyMaterial(mat) {
          const a = mat._rawMatDef?.extensions?.KHR_materials_anisotropy;
          if (!a) {
            return null;
          }
          const rot = a.anisotropyRotation ?? 0;
          return {
            anisotropy: {
              isEnabled: true,
              intensity: a.anisotropyStrength ?? 0,
              direction: [Math.cos(rot), Math.sin(rot)]
            }
          };
        }
      };
      gltf_ext_anisotropy_default = ext5;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-unlit.ts
  var gltf_ext_unlit_exports = {};
  __export(gltf_ext_unlit_exports, {
    default: () => gltf_ext_unlit_default
  });
  var ext6, gltf_ext_unlit_default;
  var init_gltf_ext_unlit = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-unlit.ts"() {
      "use strict";
      ext6 = {
        id: "KHR_materials_unlit",
        async applyMaterial(mat) {
          if (!mat._rawMatDef?.extensions?.KHR_materials_unlit) {
            return null;
          }
          const f = mat._baseColorFactor;
          const tint = mat._baseColorImage ? [f[0], f[1], f[2]] : void 0;
          return tint ? { unlit: true, unlitColor: tint } : { unlit: true };
        }
      };
      gltf_ext_unlit_default = ext6;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-spec-gloss.ts
  var gltf_ext_spec_gloss_exports = {};
  __export(gltf_ext_spec_gloss_exports, {
    default: () => gltf_ext_spec_gloss_default
  });
  var ext7, gltf_ext_spec_gloss_default;
  var init_gltf_ext_spec_gloss = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-spec-gloss.ts"() {
      "use strict";
      ext7 = {
        id: "KHR_materials_pbrSpecularGlossiness",
        async applyMaterial(mat, ctx) {
          const sg = mat._rawMatDef?.extensions?.KHR_materials_pbrSpecularGlossiness;
          if (!sg) {
            return null;
          }
          const [diffuse, specGloss] = await Promise.all([ctx._texture(sg.diffuseTexture, true), ctx._texture(sg.specularGlossinessTexture, true)]);
          const sf = sg.specularFactor;
          const out = { metallicFactor: 0, roughnessFactor: 1 - (sg.glossinessFactor ?? 1), reflectance: sf ? Math.max(sf[0], sf[1], sf[2]) : 1 };
          if (diffuse) {
            out.baseColorTexture = diffuse;
          }
          if (specGloss) {
            out.specGlossTexture = specGloss;
          }
          return out;
        }
      };
      gltf_ext_spec_gloss_default = ext7;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-dielectric.ts
  var gltf_ext_dielectric_exports = {};
  __export(gltf_ext_dielectric_exports, {
    default: () => gltf_ext_dielectric_default
  });
  var ext8, gltf_ext_dielectric_default;
  var init_gltf_ext_dielectric = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-dielectric.ts"() {
      "use strict";
      ext8 = {
        id: "KHR_materials_dielectric",
        async applyMaterial(mat, ctx) {
          const exts = mat._rawMatDef?.extensions;
          if (!exts) {
            return null;
          }
          const eIor = exts.KHR_materials_ior;
          const eSp = exts.KHR_materials_specular;
          const eVol = exts.KHR_materials_volume;
          const eTx = exts.KHR_materials_transmission;
          const eDisp = exts.KHR_materials_dispersion;
          if (!eIor && !eSp && !eVol && !eTx && !eDisp) {
            return null;
          }
          const [specTex, specColTex, thickTex, transTex] = await Promise.all([
            ctx._texture(eSp?.specularTexture, false),
            ctx._texture(eSp?.specularColorTexture, true),
            ctx._texture(eVol?.thicknessTexture, false),
            ctx._texture(eTx?.transmissionTexture, false)
          ]);
          const out = {};
          const subsurface = {};
          if (eIor) {
            const ior = typeof eIor.ior === "number" ? eIor.ior : 1.5;
            if (ior !== 1.5) {
              out.metallicF0Factor = ((ior - 1) / (ior + 1)) ** 2 / 0.04;
              out.specularWeight = 1;
              out._hasReflExt = true;
            }
            subsurface.refraction = { indexOfRefraction: ior };
          }
          if (eSp) {
            if (typeof eSp.specularFactor === "number") {
              if (Math.abs(eSp.specularFactor - 1) > 1e-6) {
                out.metallicF0Factor = eSp.specularFactor;
                out.specularWeight = eSp.specularFactor;
                out._hasReflExt = true;
              } else {
                delete out.metallicF0Factor;
                delete out.specularWeight;
              }
            }
            if (Array.isArray(eSp.specularColorFactor) && eSp.specularColorFactor.length === 3) {
              if (eSp.specularColorFactor[0] !== 1 || eSp.specularColorFactor[1] !== 1 || eSp.specularColorFactor[2] !== 1) {
                out.metallicReflectanceColor = [eSp.specularColorFactor[0], eSp.specularColorFactor[1], eSp.specularColorFactor[2]];
                out._hasReflExt = true;
              }
            }
            if (specTex) {
              out.metallicReflectanceTexture = specTex;
              out.useOnlyMetallicFromMetallicReflectanceTexture = true;
            }
            if (specColTex) {
              out.reflectanceTexture = specColTex;
            }
          }
          if (eVol) {
            const thicknessFactor = typeof eVol.thicknessFactor === "number" ? eVol.thicknessFactor : 0;
            if (thicknessFactor > 0 || thickTex) {
              subsurface.thickness = {
                min: 0,
                max: thicknessFactor || 1,
                useGlTFChannel: true,
                ...thickTex ? { texture: thickTex } : void 0
              };
            }
            const color = Array.isArray(eVol.attenuationColor) && eVol.attenuationColor.length === 3 ? eVol.attenuationColor : void 0;
            const atDistance = typeof eVol.attenuationDistance === "number" ? eVol.attenuationDistance : void 0;
            if (color || atDistance !== void 0) {
              subsurface.tint = {
                ...color ? { color } : void 0,
                ...atDistance !== void 0 ? { atDistance } : void 0
              };
            } else if (subsurface.thickness) {
              subsurface.tint = { color: [1, 1, 1], atDistance: 1 };
            }
          }
          if (eTx) {
            const intensity = typeof eTx.transmissionFactor === "number" ? eTx.transmissionFactor : 0;
            if (intensity > 0 || transTex) {
              out.transmissive = true;
              const refraction = {
                ...subsurface.refraction ?? {},
                intensity,
                useThicknessAsDepth: !!subsurface.thickness,
                ...transTex ? { texture: transTex } : void 0
              };
              subsurface.refraction = refraction;
            }
          }
          if (eDisp && typeof eDisp.dispersion === "number" && eDisp.dispersion > 0 && subsurface.refraction && subsurface.thickness) {
            subsurface.refraction = { ...subsurface.refraction, dispersion: 20 / eDisp.dispersion };
          }
          if (Object.keys(subsurface).length > 0) {
            out.subsurface = subsurface;
          }
          return Object.keys(out).length > 0 ? out : null;
        }
      };
      gltf_ext_dielectric_default = ext8;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-uv-transform.ts
  var gltf_ext_uv_transform_exports = {};
  __export(gltf_ext_uv_transform_exports, {
    default: () => gltf_ext_uv_transform_default
  });
  var ext9, gltf_ext_uv_transform_default;
  var init_gltf_ext_uv_transform = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-uv-transform.ts"() {
      "use strict";
      init_texture_2d();
      ext9 = {
        id: "KHR_texture_transform",
        wrapTexture(tex, texInfo) {
          const info = texInfo;
          if (!info) {
            return tex;
          }
          const kt = info.extensions?.KHR_texture_transform;
          const patch = {};
          if (kt) {
            if (kt.scale) {
              patch.uScale = kt.scale[0];
              patch.vScale = kt.scale[1];
            }
            if (kt.offset) {
              patch.uOffset = kt.offset[0];
              patch.vOffset = kt.offset[1];
            }
            if (kt.rotation) {
              patch.uAng = kt.rotation;
            }
            if (Object.keys(patch).length) {
              patch._hasTx = true;
            }
          }
          const tc = kt?.texCoord ?? info.texCoord;
          if (tc === 1) {
            patch._texCoord = 1;
          }
          return Object.keys(patch).length ? cloneTexture2D(tex, patch) : tex;
        }
      };
      gltf_ext_uv_transform_default = ext9;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-basisu.ts
  var gltf_ext_basisu_exports = {};
  __export(gltf_ext_basisu_exports, {
    default: () => gltf_ext_basisu_default
  });
  function basisSourceIndex(tex) {
    const source = tex?.extensions?.KHR_texture_basisu?.source;
    return typeof source === "number" ? source : null;
  }
  function textureIndex(texInfo) {
    const index = texInfo?.index;
    return typeof index === "number" ? index : null;
  }
  function textureUsesBasisu(json, texInfo) {
    const index = textureIndex(texInfo);
    return index !== null && basisSourceIndex(json.textures?.[index]) !== null;
  }
  function stripBasisuTexture(json, owner, slot, data) {
    if (!textureUsesBasisu(json, owner?.[slot])) {
      return false;
    }
    data[slot] = owner[slot];
    delete owner[slot];
    return true;
  }
  function prepareBasisuMaterials(json, binChunk, baseUrl) {
    for (const mat of json.materials ?? []) {
      const data = { json, binChunk, baseUrl };
      const pbr = mat.pbrMetallicRoughness ?? {};
      let hasBasisu = stripBasisuTexture(json, pbr, "baseColorTexture", data);
      hasBasisu = stripBasisuTexture(json, pbr, "metallicRoughnessTexture", data) || hasBasisu;
      hasBasisu = stripBasisuTexture(json, mat, "normalTexture", data) || hasBasisu;
      hasBasisu = stripBasisuTexture(json, mat, "occlusionTexture", data) || hasBasisu;
      hasBasisu = stripBasisuTexture(json, mat, "emissiveTexture", data) || hasBasisu;
      const spec = mat.extensions?.KHR_materials_specular;
      if (spec) {
        hasBasisu = stripBasisuTexture(json, spec, "specularTexture", data) || hasBasisu;
        hasBasisu = stripBasisuTexture(json, spec, "specularColorTexture", data) || hasBasisu;
      }
      if (hasBasisu) {
        Object.defineProperty(mat, BASISU_MATERIAL_DATA, { value: data });
      }
    }
  }
  async function resolveImageBuffer(ctx, imageIdx) {
    const image = ctx.json.images?.[imageIdx];
    if (!image) {
      throw new Error(`${NAME}: image ${imageIdx} not found`);
    }
    if (image.bufferView !== void 0) {
      const bv = ctx.json.bufferViews?.[image.bufferView];
      if (!bv) {
        throw new Error(`${NAME}: bufferView ${image.bufferView} not found`);
      }
      const offset = ctx.binChunk.byteOffset + (bv.byteOffset ?? 0);
      const copy = new U8(bv.byteLength);
      copy.set(new U8(ctx.binChunk.buffer, offset, bv.byteLength));
      return copy.buffer;
    }
    if (image.uri) {
      const url = new URL(image.uri, ctx.baseUrl + "x").href;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${NAME}: failed to load image ${response.status} ${response.statusText}`);
      }
      return response.arrayBuffer();
    }
    throw new Error(`${NAME}: image has neither bufferView nor uri`);
  }
  async function loadBasisuBitmap(data, texInfo) {
    const index = textureIndex(texInfo);
    if (index === null) {
      return null;
    }
    const source = basisSourceIndex(data.json.textures?.[index]);
    if (source === null) {
      return null;
    }
    data.bitmaps ?? (data.bitmaps = /* @__PURE__ */ new Map());
    let bitmap = data.bitmaps.get(index);
    if (!bitmap) {
      bitmap = resolveImageBuffer(data, source).then(decodeKtx2ImageBitmapFromBuffer);
      data.bitmaps.set(index, bitmap);
    }
    return bitmap;
  }
  async function uploadBasisuTexture(data, ctx, texInfo, sRGB) {
    const index = textureIndex(texInfo);
    if (index === null) {
      return void 0;
    }
    data.textures ?? (data.textures = /* @__PURE__ */ new Map());
    const key = `${index}:${sRGB ? 1 : 0}`;
    let tex = data.textures.get(key);
    if (!tex) {
      const source = basisSourceIndex(data.json.textures?.[index]);
      if (source === null) {
        return void 0;
      }
      tex = await uploadKtx2Texture2D(ctx._engine, await resolveImageBuffer(data, source), sRGB);
      data.textures.set(key, tex);
    }
    return tex;
  }
  async function compositeOrm(mr, occ) {
    const w = mr.width;
    const h = mr.height;
    const c1 = new OffscreenCanvas(w, h);
    const x1 = c1.getContext("2d");
    x1.drawImage(mr, 0, 0, w, h);
    const d1 = x1.getImageData(0, 0, w, h);
    const c2 = new OffscreenCanvas(w, h);
    const x2 = c2.getContext("2d");
    x2.drawImage(occ, 0, 0, w, h);
    const d2 = x2.getImageData(0, 0, w, h);
    for (let j = 0; j < d1.data.length; j += 4) {
      d1.data[j] = d2.data[j];
    }
    x1.putImageData(d1, 0, 0);
    return createImageBitmap(c1);
  }
  async function uploadOrmTexture(data, ctx) {
    const mrInfo = data.metallicRoughnessTexture;
    const occInfo = data.occlusionTexture;
    const mrIndex = textureIndex(mrInfo);
    const occIndex = textureIndex(occInfo);
    if (mrIndex === null && occIndex === null) {
      return void 0;
    }
    if (mrIndex === null || occIndex === null || mrIndex === occIndex) {
      return uploadBasisuTexture(data, ctx, mrInfo ?? occInfo, false);
    }
    data.textures ?? (data.textures = /* @__PURE__ */ new Map());
    const key = `orm:${mrIndex}:${occIndex}`;
    let tex = data.textures.get(key);
    if (!tex) {
      const [mr, occ] = await Promise.all([loadBasisuBitmap(data, mrInfo), loadBasisuBitmap(data, occInfo)]);
      if (!mr || !occ) {
        return void 0;
      }
      tex = ctx._uploadImage(await compositeOrm(mr, occ), false);
      data.textures.set(key, tex);
    }
    return tex;
  }
  function readComponent2(view, offset, componentType, normalized) {
    switch (componentType) {
      case FLOAT4:
        return view.getFloat32(offset, true);
      case 5125: {
        const v2 = view.getUint32(offset, true);
        return normalized ? v2 / 4294967295 : v2;
      }
      case 5123: {
        const v2 = view.getUint16(offset, true);
        return normalized ? v2 / 65535 : v2;
      }
      case 5122: {
        const v2 = view.getInt16(offset, true);
        return normalized ? Math.max(v2 / 32767, -1) : v2;
      }
      case 5121: {
        const v2 = view.getUint8(offset);
        return normalized ? v2 / 255 : v2;
      }
      case 5120: {
        const v2 = view.getInt8(offset);
        return normalized ? Math.max(v2 / 127, -1) : v2;
      }
      default:
        throw new Error(`${NAME}: strided accessor uses unsupported component type: ${componentType}`);
    }
  }
  function readStridedFloat(json, binChunk, accessorIdx) {
    const accessor = json.accessors[accessorIdx];
    const bufferView = json.bufferViews[accessor.bufferView];
    const componentType = accessor.componentType;
    const compBytes = COMPONENT_BYTES2[componentType];
    if (!compBytes) {
      throw new Error(`${NAME}: strided accessor ${accessorIdx} uses unsupported component type: ${componentType}`);
    }
    const componentCount = TYPE_SIZES2[accessor.type] ?? 1;
    const elementBytes = componentCount * compBytes;
    const byteStride = bufferView.byteStride ?? elementBytes;
    if (byteStride < elementBytes) {
      throw new Error(`${NAME}: invalid accessor stride ${byteStride} for accessor ${accessorIdx}`);
    }
    const normalized = accessor.normalized === true;
    const baseOffset = binChunk.byteOffset + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const view = new DV(binChunk.buffer);
    const out = new F32(accessor.count * componentCount);
    for (let i = 0, o = 0; i < accessor.count; i++) {
      const src = baseOffset + i * byteStride;
      for (let c = 0; c < componentCount; c++, o++) {
        out[o] = readComponent2(view, src + c * compBytes, componentType, normalized);
      }
    }
    return out;
  }
  var NAME, FLOAT4, COMPONENT_BYTES2, TYPE_SIZES2, BASISU_MATERIAL_DATA, ext10, gltf_ext_basisu_default;
  var init_gltf_ext_basisu = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-basisu.ts"() {
      "use strict";
      init_typed_arrays();
      init_gltf_parser();
      init_ktx2_loader();
      NAME = "KHR_texture_basisu";
      FLOAT4 = 5126;
      COMPONENT_BYTES2 = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
      TYPE_SIZES2 = {
        SCALAR: 1,
        VEC2: 2,
        VEC3: 3,
        VEC4: 4,
        MAT2: 4,
        MAT3: 9,
        MAT4: 16
      };
      BASISU_MATERIAL_DATA = "__basisuMaterialData";
      ext10 = {
        id: NAME,
        async preMesh(json, binChunk, baseUrl) {
          const gltf = json;
          prepareBasisuMaterials(gltf, binChunk, baseUrl);
          const decoded = /* @__PURE__ */ new Map();
          for (const mesh of gltf.meshes ?? []) {
            for (const primitive of mesh.primitives ?? []) {
              const attrs = primitive.attributes ?? {};
              const strided = Object.keys(attrs).some((name) => gltf.bufferViews?.[gltf.accessors?.[attrs[name]]?.bufferView]?.byteStride !== void 0);
              if (!strided) {
                continue;
              }
              const attributes = /* @__PURE__ */ new Map();
              for (const name of Object.keys(attrs)) {
                const accessorIdx = attrs[name];
                const accessor = gltf.accessors[accessorIdx];
                if (gltf.bufferViews?.[accessor.bufferView]?.byteStride !== void 0) {
                  attributes.set(name, readStridedFloat(gltf, binChunk, accessorIdx));
                }
              }
              const posAcc = gltf.accessors[attrs.POSITION];
              const idx = primitive.indices === void 0 ? new U32(0) : new U32(resolveAccessor(gltf, binChunk, primitive.indices)._data);
              decoded.set(primitive, {
                _attributes: attributes,
                _indices: idx,
                _vertexCount: posAcc.count,
                _indexCount: idx.length
              });
            }
          }
          return decoded;
        },
        async applyMaterial(mat, ctx) {
          const data = mat._rawMatDef?.[BASISU_MATERIAL_DATA];
          if (!data) {
            return null;
          }
          const [baseColorTexture, ormTexture, normalTexture, emissiveTexture, specularTexture, specularColorTexture] = await Promise.all([
            uploadBasisuTexture(data, ctx, data.baseColorTexture, true),
            uploadOrmTexture(data, ctx),
            uploadBasisuTexture(data, ctx, data.normalTexture, false),
            uploadBasisuTexture(data, ctx, data.emissiveTexture, true),
            uploadBasisuTexture(data, ctx, data.specularTexture, false),
            uploadBasisuTexture(data, ctx, data.specularColorTexture, true)
          ]);
          const out = {
            ...baseColorTexture ? { baseColorTexture } : void 0,
            ...ormTexture ? {
              ormTexture,
              ...data.metallicRoughnessTexture ? { metallicFactor: mat._metallicFactor, roughnessFactor: mat._roughnessFactor } : void 0,
              ...data.occlusionTexture ? { occlusionStrength: 1, occlusionTexCoord: data.occlusionTexture.texCoord ?? 0 } : void 0
            } : void 0,
            ...normalTexture ? { normalTexture, normalTextureScale: data.normalTexture?.scale ?? 1 } : void 0,
            ...emissiveTexture ? { emissiveTexture } : void 0,
            ...specularTexture ? { metallicReflectanceTexture: specularTexture, useOnlyMetallicFromMetallicReflectanceTexture: true } : void 0,
            ...specularColorTexture ? { reflectanceTexture: specularColorTexture } : void 0
          };
          if (!out.baseColorTexture && !out.ormTexture && !out.normalTexture && !out.emissiveTexture && !out.metallicReflectanceTexture && !out.reflectanceTexture) {
            return null;
          }
          return out;
        }
      };
      gltf_ext_basisu_default = ext10;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-orm.ts
  var gltf_ext_orm_exports = {};
  __export(gltf_ext_orm_exports, {
    default: () => gltf_ext_orm_default
  });
  async function compositeOrm2(mr, occ) {
    const w = mr.width;
    const h = mr.height;
    const c1 = new OffscreenCanvas(w, h);
    const x1 = c1.getContext("2d");
    x1.drawImage(mr, 0, 0, w, h);
    const d1 = x1.getImageData(0, 0, w, h);
    const c2 = new OffscreenCanvas(w, h);
    const x2 = c2.getContext("2d");
    x2.drawImage(occ, 0, 0, w, h);
    const d2 = x2.getImageData(0, 0, w, h);
    for (let j = 0; j < d1.data.length; j += 4) {
      d1.data[j] = d2.data[j];
    }
    x1.putImageData(d1, 0, 0);
    return createImageBitmap(c1);
  }
  var ext11, gltf_ext_orm_default;
  var init_gltf_ext_orm = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-orm.ts"() {
      "use strict";
      ext11 = {
        id: "_orm-composite",
        async applyMaterial(mat, ctx) {
          const mr = mat._metallicRoughnessImage;
          const occ = mat._occlusionImage;
          if (!mr || !occ || mr === occ) {
            return null;
          }
          const bmp = await compositeOrm2(mr, occ);
          return { ormTexture: ctx._uploadImage(bmp, false) };
        }
      };
      gltf_ext_orm_default = ext11;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/skeleton/bone-control-hooks.ts
  var _boneBuilder, _boneApplier;
  var init_bone_control_hooks = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/skeleton/bone-control-hooks.ts"() {
      "use strict";
      _boneBuilder = null;
      _boneApplier = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/types.ts
  var INTERP_LINEAR, INTERP_STEP, INTERP_CUBICSPLINE, PATH_TRANSLATION, PATH_ROTATION, PATH_SCALE, PATH_WEIGHTS, PATH_POINTER;
  var init_types2 = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/animation/types.ts"() {
      "use strict";
      INTERP_LINEAR = 0;
      INTERP_STEP = 1;
      INTERP_CUBICSPLINE = 2;
      PATH_TRANSLATION = 0;
      PATH_ROTATION = 1;
      PATH_SCALE = 2;
      PATH_WEIGHTS = 3;
      PATH_POINTER = 4;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-animation.ts
  var gltf_animation_exports = {};
  __export(gltf_animation_exports, {
    _installPointerHandlers: () => _installPointerHandlers,
    computeBoneTextureData: () => computeBoneTextureData,
    extractSkin: () => extractSkin,
    parseAnimationData: () => parseAnimationData
  });
  function _installPointerHandlers(parser, converter) {
    _parsePointerChannel = parser;
    _convertSampler = converter;
  }
  function toSamplerFloat32(src, length, normalized) {
    if (_convertSampler) {
      return _convertSampler(src, length, normalized);
    }
    return new F32(src.buffer, src.byteOffset, length);
  }
  function resolveIBMs(json, binChunk, skin) {
    const jointCount = skin.joints.length;
    if (skin.inverseBindMatrices !== void 0) {
      const ibmData = resolveAccessor(json, binChunk, skin.inverseBindMatrices);
      return new F32(ibmData._data.buffer, ibmData._data.byteOffset, jointCount * 16);
    }
    const out = new F32(jointCount * 16);
    for (let i = 0; i < jointCount; i++) {
      const o = i * 16;
      out[o] = out[o + 5] = out[o + 10] = out[o + 15] = 1;
    }
    return out;
  }
  function extractSkin(json, binChunk, skinIdx, meshWorldMatrix, parentMap, worldMatrixCache) {
    const skin = json.skins[skinIdx];
    const jointNodes = skin.joints;
    const inverseBindMatrices = resolveIBMs(json, binChunk, skin);
    const jointWorldMatrices = jointNodes.map((nodeIdx) => computeNodeWorldMatrix(json, nodeIdx, parentMap, worldMatrixCache));
    return { jointNodes, inverseBindMatrices, jointWorldMatrices, meshWorldMatrix };
  }
  function computeBoneTextureData(skin) {
    const numBones = skin.jointNodes.length;
    const data = new F32(numBones * 16);
    const invMeshWorld = mat4Invert(skin.meshWorldMatrix) ?? mat4Identity();
    const tmp = getLoaderTmpAnim();
    for (let i = 0; i < numBones; i++) {
      mat4MultiplyInto(tmp, 0, invMeshWorld, 0, skin.jointWorldMatrices[i], 0);
      mat4MultiplyInto(data, i * 16, tmp, 0, skin.inverseBindMatrices, i * 16);
    }
    return data;
  }
  function parseAnimationData(json, binChunk, meshes, parentMap, worldMatrixCache, nodeMap, boneOverrides) {
    if (!json.animations || json.animations.length === 0) {
      return null;
    }
    let pointerChannelCount = 0;
    const clips = [];
    for (const anim of json.animations) {
      const samplers = [];
      for (const s of anim.samplers) {
        const inputAcc = resolveAccessor(json, binChunk, s.input);
        const outputAcc = resolveAccessor(json, binChunk, s.output);
        const inNorm = json.accessors[s.input]?.normalized === true;
        const outNorm = json.accessors[s.output]?.normalized === true;
        samplers.push({
          input: toSamplerFloat32(inputAcc._data, inputAcc._count, inNorm),
          output: toSamplerFloat32(outputAcc._data, outputAcc._count * outputAcc._componentCount, outNorm),
          interpolation: INTERP_MAP[s.interpolation ?? "LINEAR"] ?? INTERP_LINEAR
        });
      }
      const channels = [];
      for (const c of anim.channels) {
        const ptr = c.target?.extensions?.KHR_animation_pointer?.pointer;
        if (ptr) {
          if (!_parsePointerChannel) {
            continue;
          }
          const ch = _parsePointerChannel(ptr, c, nodeMap, json, meshes);
          if (ch) {
            channels.push(ch);
            pointerChannelCount++;
          }
          continue;
        }
        if (c.target.node === void 0) {
          continue;
        }
        const path = PATH_MAP[c.target.path];
        if (path === void 0) {
          continue;
        }
        channels.push({ samplerIdx: c.sampler, nodeIdx: c.target.node, path });
      }
      let duration = 0;
      for (const s of samplers) {
        if (s.input.length > 0) {
          const last = s.input[s.input.length - 1];
          if (last > duration) {
            duration = last;
          }
        }
      }
      clips.push({ name: anim.name ?? "", channels, samplers, duration });
    }
    const nodeCount = json.nodes?.length ?? 0;
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const n = json.nodes[i];
      const t = n.translation ?? [0, 0, 0];
      const r = n.rotation ?? [0, 0, 0, 1];
      const s = n.scale ?? [1, 1, 1];
      nodes.push({
        parentIdx: findParent(parentMap, i),
        _matrix: n.matrix,
        tx: t[0],
        ty: t[1],
        tz: t[2],
        rx: r[0],
        ry: r[1],
        rz: r[2],
        rw: r[3],
        sx: s[0],
        sy: s[1],
        sz: s[2]
      });
    }
    const nodeToMeshIndices = /* @__PURE__ */ new Map();
    let gpuIdx = 0;
    for (let ni = 0; ni < nodeCount; ni++) {
      const node = json.nodes[ni];
      if (node.mesh === void 0) {
        continue;
      }
      const mesh = json.meshes[node.mesh];
      const indices = [];
      for (let p = 0; p < mesh.primitives.length; p++) {
        indices.push(gpuIdx++);
      }
      nodeToMeshIndices.set(ni, indices);
    }
    const skeletons = [];
    for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
      const node = json.nodes[nodeIdx];
      if (node.skin === void 0 || !json.skins) {
        continue;
      }
      const meshIndices = nodeToMeshIndices.get(nodeIdx);
      if (!meshIndices) {
        continue;
      }
      const skin = json.skins[node.skin];
      const jointNodes = skin.joints;
      const inverseBindMatrices = resolveIBMs(json, binChunk, skin);
      const meshWorldMatrix = computeNodeWorldMatrix(json, nodeIdx, parentMap, worldMatrixCache);
      const invMeshWorld = mat4Invert(meshWorldMatrix) ?? mat4Identity();
      for (const mi of meshIndices) {
        const mesh = meshes[mi];
        const skeleton = mesh?.skeleton;
        if (!skeleton) {
          continue;
        }
        skeletons.push({
          jointNodes,
          inverseBindMatrices,
          invMeshWorld,
          boneTexture: skeleton.boneTexture,
          boneCount: jointNodes.length,
          boneMatrices: skeleton.boneMatrices,
          runtimeSkeleton: skeleton
        });
      }
    }
    const morphBindings = [];
    for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
      const node = json.nodes[nodeIdx];
      if (node.mesh === void 0) {
        continue;
      }
      const gltfMesh = json.meshes[node.mesh];
      if (!gltfMesh.primitives?.[0]?.targets?.length) {
        continue;
      }
      const meshIndices = nodeToMeshIndices.get(nodeIdx);
      if (!meshIndices) {
        continue;
      }
      for (const mi of meshIndices) {
        const mesh = meshes[mi];
        const morphTargets = mesh?.morphTargets;
        if (!morphTargets) {
          continue;
        }
        morphBindings.push({
          nodeIdx,
          weightsBuffer: morphTargets.weightsBuffer,
          weights: morphTargets.weights,
          targetCount: morphTargets.count,
          runtimeMorphTargets: morphTargets
        });
      }
    }
    const nodeTargets = nodeMap ?? [];
    const excludedNodeIndices = /* @__PURE__ */ new Set();
    for (const skin of json.skins ?? []) {
      for (const ji of skin.joints ?? []) {
        excludedNodeIndices.add(ji);
      }
    }
    for (let ni = 0; ni < nodeCount; ni++) {
      if (json.nodes[ni]?.skin === void 0) {
        continue;
      }
      let p = ni;
      while (p >= 0 && !excludedNodeIndices.has(p)) {
        excludedNodeIndices.add(p);
        p = findParent(parentMap, p);
      }
    }
    if (clips.length === 0 || skeletons.length === 0 && morphBindings.length === 0 && pointerChannelCount === 0 && !hasWritableNodeChannel(clips, nodeTargets, excludedNodeIndices)) {
      return null;
    }
    const nodeNames = (json.nodes ?? []).map((n) => n?.name);
    return { clips, nodes, skeletons, morphBindings, nodeTargets, excludedNodeIndices, nodeNames, boneOverrides };
  }
  function hasWritableNodeChannel(clips, nodeTargets, excludedNodeIndices) {
    for (const clip of clips) {
      for (const ch of clip.channels) {
        if ((ch.path === PATH_TRANSLATION || ch.path === PATH_ROTATION || ch.path === PATH_SCALE) && ch.nodeIdx >= 0 && !excludedNodeIndices.has(ch.nodeIdx) && nodeTargets[ch.nodeIdx]) {
          return true;
        }
      }
    }
    return false;
  }
  var _parsePointerChannel, _convertSampler, INTERP_MAP, PATH_MAP;
  var init_gltf_animation = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-animation.ts"() {
      "use strict";
      init_typed_arrays();
      init_types2();
      init_mat4_identity();
      init_mat4_invert();
      init_mat4_multiply_into();
      init_gltf_parser();
      init_loader_scratch();
      _parsePointerChannel = null;
      _convertSampler = null;
      INTERP_MAP = {
        LINEAR: INTERP_LINEAR,
        STEP: INTERP_STEP,
        CUBICSPLINE: INTERP_CUBICSPLINE
      };
      PATH_MAP = {
        translation: PATH_TRANSLATION,
        rotation: PATH_ROTATION,
        scale: PATH_SCALE,
        weights: PATH_WEIGHTS
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/skeleton/create-skeleton.ts
  var create_skeleton_exports = {};
  __export(create_skeleton_exports, {
    createSkeleton: () => createSkeleton
  });
  function createSkeleton(engine, joints, weights, boneCount, boneData, joints1, weights1) {
    const device = engine._device;
    const texWidth = boneCount * 4;
    const boneTexture = device.createTexture({
      size: [texWidth, 1],
      format: "rgba32float",
      usage: TU.TEXTURE_BINDING | TU.COPY_DST
    });
    device.queue.writeTexture({ texture: boneTexture }, boneData.buffer, { bytesPerRow: texWidth * 16 }, { width: texWidth, height: 1 });
    const joints32 = new U32(joints.length);
    for (let i = 0; i < joints.length; i++) {
      joints32[i] = joints[i];
    }
    const jointsBuffer = createMappedBuffer(engine, joints32, BU.VERTEX);
    const weightsBuffer = createMappedBuffer(engine, weights, BU.VERTEX);
    let joints1Buffer = null;
    let weights1Buffer = null;
    if (joints1 && weights1) {
      const joints132 = new U32(joints1.length);
      for (let i = 0; i < joints1.length; i++) {
        joints132[i] = joints1[i];
      }
      joints1Buffer = createMappedBuffer(engine, joints132, BU.VERTEX);
      weights1Buffer = createMappedBuffer(engine, weights1, BU.VERTEX);
    }
    return {
      boneTexture,
      boneCount,
      jointsBuffer,
      weightsBuffer,
      joints,
      weights,
      boneMatrices: boneData,
      joints1Buffer,
      weights1Buffer,
      joints1: joints1 ?? null,
      weights1: weights1 ?? null
    };
  }
  var init_create_skeleton = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/skeleton/create-skeleton.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_gpu_buffers();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-skeleton.ts
  var gltf_feature_skeleton_exports = {};
  __export(gltf_feature_skeleton_exports, {
    default: () => gltf_feature_skeleton_default
  });
  function resolveAttr(name, primitive, decoded, json, binChunk) {
    if (decoded && decoded._attributes.has(name)) {
      return decoded._attributes.get(name);
    }
    const idx = primitive.attributes?.[name];
    return idx !== void 0 ? resolveAccessor(json, binChunk, idx)._data : null;
  }
  var feature4, gltf_feature_skeleton_default;
  var init_gltf_feature_skeleton = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-skeleton.ts"() {
      "use strict";
      init_gltf_parser();
      init_bone_control_hooks();
      feature4 = {
        id: "_skeleton",
        async applyMesh(meshData, mesh, ctx) {
          const { _json: json, _binChunk: binChunk, _parentMap: parentMap, _worldMatrixCache: worldMatrixCache } = ctx;
          const node = json.nodes[meshData._nodeIndex];
          if (node.skin === void 0 || !json.skins) {
            return;
          }
          const primitive = meshData._primitive;
          const decoded = meshData._decoded;
          const joints = resolveAttr("JOINTS_0", primitive, decoded, json, binChunk);
          const weights = resolveAttr("WEIGHTS_0", primitive, decoded, json, binChunk);
          if (!joints || !weights) {
            return;
          }
          const joints1 = resolveAttr("JOINTS_1", primitive, decoded, json, binChunk);
          const weights1 = resolveAttr("WEIGHTS_1", primitive, decoded, json, binChunk);
          const [{ extractSkin: extractSkin2, computeBoneTextureData: computeBoneTextureData2 }, { createSkeleton: createSkeleton2 }] = await Promise.all([Promise.resolve().then(() => (init_gltf_animation(), gltf_animation_exports)), Promise.resolve().then(() => (init_create_skeleton(), create_skeleton_exports))]);
          const skin = extractSkin2(json, binChunk, node.skin, meshData._worldMatrix, parentMap, worldMatrixCache);
          const boneData = computeBoneTextureData2(skin);
          mesh.skeleton = createSkeleton2(ctx._engine, joints, weights, skin.jointNodes.length, boneData, joints1, weights1);
          if (_boneBuilder && !ctx._boneOverrides) {
            ctx._boneOverrides = /* @__PURE__ */ new Map();
          }
        },
        async applyAsset(meshes, _root, ctx) {
          if (!_boneBuilder || !ctx._boneOverrides) {
            return {};
          }
          return _boneBuilder(ctx, meshes, ctx._boneOverrides);
        }
      };
      gltf_feature_skeleton_default = feature4;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/morph/create-morph-targets.ts
  var create_morph_targets_exports = {};
  __export(create_morph_targets_exports, {
    createMorphTargets: () => createMorphTargets,
    setMorphTargetWeights: () => setMorphTargetWeights
  });
  function createMorphTargets(engine, targets, vertexCount, morphWeights) {
    const device = engine._device;
    const targetCount = Math.min(targets.length, 4);
    const texWidth = Math.min(vertexCount, 2048);
    const rowsPerBand = Math.ceil(vertexCount / texWidth);
    const totalRows = targetCount * 2 * rowsPerBand;
    const texData = new F32(texWidth * totalRows * 4);
    for (let t = 0; t < targetCount; t++) {
      const tgt = targets[t];
      const posBandRow = t * 2 * rowsPerBand;
      const normBandRow = (t * 2 + 1) * rowsPerBand;
      for (let v2 = 0; v2 < vertexCount; v2++) {
        const col = v2 % texWidth;
        const row = Math.floor(v2 / texWidth);
        const posIdx = ((posBandRow + row) * texWidth + col) * 4;
        texData[posIdx] = tgt.positions[v2 * 3];
        texData[posIdx + 1] = tgt.positions[v2 * 3 + 1];
        texData[posIdx + 2] = tgt.positions[v2 * 3 + 2];
        if (tgt.normals) {
          const normIdx = ((normBandRow + row) * texWidth + col) * 4;
          texData[normIdx] = tgt.normals[v2 * 3];
          texData[normIdx + 1] = tgt.normals[v2 * 3 + 1];
          texData[normIdx + 2] = tgt.normals[v2 * 3 + 2];
        }
      }
    }
    const texture = device.createTexture({
      size: [texWidth, totalRows],
      format: "rgba32float",
      usage: TU.TEXTURE_BINDING | TU.COPY_DST
    });
    device.queue.writeTexture({ texture }, texData.buffer, { bytesPerRow: texWidth * 16 }, { width: texWidth, height: totalRows });
    const uboData = new ArrayBuffer(32);
    const weights = new F32(uboData, 0, 4);
    const u32 = new U32(uboData, 16, 4);
    for (let i = 0; i < targetCount; i++) {
      weights[i] = morphWeights?.[i] ?? 0;
    }
    u32[0] = targetCount;
    u32[1] = texWidth;
    u32[2] = rowsPerBand;
    const weightsBuffer = createMappedBuffer(engine, new U8(uboData), BU.UNIFORM);
    return { texture, count: targetCount, weightsBuffer, targets: targets.slice(0, targetCount), weights };
  }
  function setMorphTargetWeights(engine, morphTargets, weights) {
    const count = Math.min(morphTargets.count, 4, weights.length);
    morphTargets.weights.fill(0);
    for (let i = 0; i < count; i++) {
      morphTargets.weights[i] = weights[i] ?? 0;
    }
    engine._device.queue.writeBuffer(morphTargets.weightsBuffer, 0, morphTargets.weights);
  }
  var init_create_morph_targets = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/morph/create-morph-targets.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_gpu_buffers();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-morph.ts
  var gltf_feature_morph_exports = {};
  __export(gltf_feature_morph_exports, {
    default: () => gltf_feature_morph_default
  });
  var feature5, gltf_feature_morph_default;
  var init_gltf_feature_morph = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-morph.ts"() {
      "use strict";
      init_typed_arrays();
      init_gltf_parser();
      feature5 = {
        id: "_morph",
        async applyMesh(meshData, mesh, ctx) {
          const primitive = meshData._primitive;
          const targets = primitive.targets;
          if (!targets || targets.length === 0) {
            return;
          }
          const { _json: json, _binChunk: binChunk } = ctx;
          const morphTargets = [];
          for (const target of targets) {
            const posAcc = target.POSITION !== void 0 ? resolveAccessor(json, binChunk, target.POSITION) : null;
            const normAcc = target.NORMAL !== void 0 ? resolveAccessor(json, binChunk, target.NORMAL) : null;
            morphTargets.push({
              positions: posAcc ? posAcc._data : new F32(meshData._vertexCount * 3),
              normals: normAcc ? normAcc._data : null
            });
          }
          const parentMesh = json.meshes[json.nodes[meshData._nodeIndex].mesh];
          const morphWeights = parentMesh.weights ?? new Array(targets.length).fill(0);
          const { createMorphTargets: createMorphTargets2 } = await Promise.resolve().then(() => (init_create_morph_targets(), create_morph_targets_exports));
          mesh.morphTargets = createMorphTargets2(ctx._engine, morphTargets, meshData._vertexCount, morphWeights);
        }
      };
      gltf_feature_morph_default = feature5;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-lights-punctual.ts
  var gltf_feature_lights_punctual_exports = {};
  __export(gltf_feature_lights_punctual_exports, {
    default: () => gltf_feature_lights_punctual_default
  });
  var feature6, gltf_feature_lights_punctual_default;
  var init_gltf_feature_lights_punctual = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-lights-punctual.ts"() {
      "use strict";
      init_types();
      init_gltf_parser();
      feature6 = {
        id: "KHR_lights_punctual",
        async applyAsset(_meshes, _root, ctx) {
          const defs = ctx._json.extensions?.KHR_lights_punctual?.lights;
          if (!defs?.length) {
            return {};
          }
          const lights = [];
          const nodes = ctx._json.nodes ?? [];
          let lightNodeCount = 0;
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i]?.extensions?.KHR_lights_punctual?.light !== void 0) {
              lightNodeCount++;
            }
          }
          if (lightNodeCount > MAX_LIGHTS) {
            setMaxLights(lightNodeCount);
          }
          for (let nodeIdx = 0; nodeIdx < nodes.length; nodeIdx++) {
            const lightIdx = nodes[nodeIdx]?.extensions?.KHR_lights_punctual?.light;
            if (lightIdx === void 0) {
              continue;
            }
            const def = defs[lightIdx];
            if (!def) {
              continue;
            }
            const world = computeNodeWorldMatrix(ctx._json, nodeIdx, ctx._parentMap, ctx._worldMatrixCache);
            const px = world[12];
            const py = world[13];
            const pz = world[14];
            const fx = -world[8];
            const fy = -world[9];
            const fz = -world[10];
            const flen = Math.hypot(fx, fy, fz) || 1;
            const dir = [fx / flen, fy / flen, fz / flen];
            const color = def.color ? [def.color[0], def.color[1], def.color[2]] : [1, 1, 1];
            const intensity = def.intensity ?? 1;
            const range = def.range !== void 0 ? def.range : Number.MAX_VALUE;
            if (def.type === "point") {
              const { createPointLight: createPointLight2 } = await Promise.resolve().then(() => (init_point_light(), point_light_exports));
              const pl = createPointLight2([px, py, pz], intensity);
              pl.diffuse = color;
              pl.specular = color;
              pl.range = range;
              lights.push(pl);
            } else if (def.type === "directional") {
              const { createDirectionalLight: createDirectionalLight2 } = await Promise.resolve().then(() => (init_directional_light(), directional_light_exports));
              const dl = createDirectionalLight2(dir, intensity);
              dl.diffuse = color;
              dl.specular = color;
              lights.push(dl);
            } else if (def.type === "spot") {
              const { createSpotLight: createSpotLight2 } = await Promise.resolve().then(() => (init_spot_light(), spot_light_exports));
              const outer = def.spot?.outerConeAngle ?? Math.PI / 4;
              const sl = createSpotLight2([px, py, pz], dir, outer * 2, 1, intensity);
              sl.diffuse = color;
              sl.specular = color;
              sl.range = range;
              lights.push(sl);
            }
          }
          return { entities: lights };
        }
      };
      gltf_feature_lights_punctual_default = feature6;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/evaluate.ts
  function findKeyframe(input, t) {
    let lo = 0;
    let hi = input.length - 1;
    if (t <= input[0]) {
      return 0;
    }
    if (t >= input[hi]) {
      return hi > 0 ? hi - 1 : 0;
    }
    while (lo < hi - 1) {
      const mid = lo + hi >> 1;
      if (input[mid] <= t) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return lo;
  }
  function normalizeQuat4(buf, o) {
    const x = buf[o];
    const y = buf[o + 1];
    const z = buf[o + 2];
    const w = buf[o + 3];
    const lenSq = x * x + y * y + z * z + w * w;
    if (lenSq > 0) {
      const inv = 1 / Math.sqrt(lenSq);
      buf[o] = x * inv;
      buf[o + 1] = y * inv;
      buf[o + 2] = z * inv;
      buf[o + 3] = w * inv;
    }
  }
  function quatSlerp(out, ax, ay, az, aw, bx, by, bz, bw, t) {
    let dot = ax * bx + ay * by + az * bz + aw * bw;
    if (dot < 0) {
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
      dot = -dot;
    }
    if (dot > 0.9995) {
      out[0] = ax + t * (bx - ax);
      out[1] = ay + t * (by - ay);
      out[2] = az + t * (bz - az);
      out[3] = aw + t * (bw - aw);
      normalizeQuat4(out, 0);
      return;
    }
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;
    out[0] = wa * ax + wb * bx;
    out[1] = wa * ay + wb * by;
    out[2] = wa * az + wb * bz;
    out[3] = wa * aw + wb * bw;
  }
  function evaluateSampler(sampler, t, stride, isQuat, dst, dstOffset) {
    const { input, output, interpolation } = sampler;
    const keyCount = input.length;
    if (keyCount === 0) {
      return;
    }
    if (keyCount === 1 || t <= input[0]) {
      const srcOff = interpolation === INTERP_CUBICSPLINE ? stride : 0;
      for (let c = 0; c < stride; c++) {
        dst[dstOffset + c] = output[srcOff + c];
      }
      return;
    }
    const idx = findKeyframe(input, t);
    const t0 = input[idx];
    const t1 = input[idx + 1];
    if (interpolation === INTERP_STEP) {
      const srcOff = (t >= t1 ? idx + 1 : idx) * stride;
      for (let c = 0; c < stride; c++) {
        dst[dstOffset + c] = output[srcOff + c];
      }
      return;
    }
    const dt = t1 - t0;
    const f = t >= t1 ? 1 : dt > 0 ? (t - t0) / dt : 0;
    if (interpolation === INTERP_CUBICSPLINE) {
      const f2 = f * f;
      const f3 = f2 * f;
      const h00 = 2 * f3 - 3 * f2 + 1;
      const h10 = f3 - 2 * f2 + f;
      const h01 = -2 * f3 + 3 * f2;
      const h11 = f3 - f2;
      const k0 = idx * stride * 3;
      const k1 = (idx + 1) * stride * 3;
      for (let c = 0; c < stride; c++) {
        const p0 = output[k0 + stride + c];
        const m0 = output[k0 + 2 * stride + c] * dt;
        const p1 = output[k1 + stride + c];
        const m1 = output[k1 + c] * dt;
        dst[dstOffset + c] = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
      }
      if (isQuat) {
        normalizeQuat4(dst, dstOffset);
      }
      return;
    }
    const s0 = idx * stride;
    const s1 = (idx + 1) * stride;
    if (isQuat) {
      quatSlerp(_quat, output[s0], output[s0 + 1], output[s0 + 2], output[s0 + 3], output[s1], output[s1 + 1], output[s1 + 2], output[s1 + 3], f);
      dst[dstOffset] = _quat[0];
      dst[dstOffset + 1] = _quat[1];
      dst[dstOffset + 2] = _quat[2];
      dst[dstOffset + 3] = _quat[3];
    } else {
      for (let c = 0; c < stride; c++) {
        dst[dstOffset + c] = output[s0 + c] + f * (output[s1 + c] - output[s0 + c]);
      }
    }
  }
  var _quat;
  var init_evaluate = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/animation/evaluate.ts"() {
      "use strict";
      init_typed_arrays();
      init_types2();
      _quat = new F32([0, 0, 0, 1]);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/skeleton/skeleton-updater.ts
  function computeTopoOrder(nodes) {
    const n = nodes.length;
    const order = new I32(n);
    const visited = new U8(n);
    let cursor = 0;
    function visit(idx) {
      if (visited[idx]) {
        return;
      }
      visited[idx] = 1;
      const p = nodes[idx].parentIdx;
      if (p >= 0) {
        visit(p);
      }
      order[cursor++] = idx;
    }
    for (let i = 0; i < n; i++) {
      visit(i);
    }
    return order;
  }
  function createAnimationController(clip, nodes, skeletons, morphBindings, nodeTargets, excludedNodeIndices, boneOverrides, nodeNames) {
    const requiresEngine = skeletons.length > 0 || morphBindings.length > 0;
    const numNodes = nodes.length;
    const nodeTrsBindings = [];
    if (nodeTargets) {
      const maskByNode = /* @__PURE__ */ new Map();
      for (let ci = 0; ci < clip.channels.length; ci++) {
        const ch = clip.channels[ci];
        const bit = ch.path === PATH_TRANSLATION ? 1 : ch.path === PATH_ROTATION ? 2 : ch.path === PATH_SCALE ? 4 : 0;
        if (bit === 0) {
          continue;
        }
        const ni = ch.nodeIdx;
        if (ni < 0 || excludedNodeIndices?.has(ni) || !nodeTargets[ni]) {
          continue;
        }
        maskByNode.set(ni, (maskByNode.get(ni) ?? 0) | bit);
      }
      for (const [ni, mask] of maskByNode) {
        nodeTrsBindings.push({ target: nodeTargets[ni], off: ni * TRS_STRIDE, mask });
      }
    }
    const currentTRS = new F32(numNodes * TRS_STRIDE);
    const localMat = new F32(numNodes * 16);
    const worldMat = new F32(numNodes * 16);
    const topoOrder = computeTopoOrder(nodes);
    const boneScratch = skeletons.map((s) => s.boneMatrices);
    const morphBindingsByNode = [];
    for (let morphIndex = 0; morphIndex < morphBindings.length; morphIndex++) {
      const mb = morphBindings[morphIndex];
      let arr = morphBindingsByNode[mb.nodeIdx];
      if (!arr) {
        arr = [];
        morphBindingsByNode[mb.nodeIdx] = arr;
      }
      arr.push(mb);
    }
    const morphUploadF32 = new F32(4);
    const pointerScratch = new F32(16);
    let cachedEngine;
    let maskedNodes = null;
    let maskActive = false;
    let cMask = null;
    let cNames = null;
    let cLen = -1;
    let cMode = -1;
    let cDisabled = false;
    const _setMask = (mask) => {
      if (!mask || mask.disabled || !nodeNames || !_maskResolver) {
        maskActive = false;
        return;
      }
      const names = mask.names;
      if (mask === cMask && names === cNames && names.length === cLen && mask.mode === cMode && mask.disabled === cDisabled) {
        maskActive = true;
        return;
      }
      cMask = mask;
      cNames = names;
      cLen = names.length;
      cMode = mask.mode;
      cDisabled = mask.disabled;
      if (!maskedNodes) {
        maskedNodes = new U8(numNodes);
      }
      _maskResolver(mask, nodeNames, maskedNodes, numNodes);
      maskActive = true;
    };
    const ctrl = {
      time: 0,
      playing: true,
      speedRatio: 1,
      loop: true,
      _setMask,
      _debugWorldMat: worldMat,
      tick: clip.duration <= 0 ? noopAnimationTick : (deltaMs, engine) => {
        if (engine) {
          cachedEngine = engine;
        }
        const activeEngine = engine ?? cachedEngine;
        if (requiresEngine && !activeEngine) {
          throw new Error("AnimationController.tick requires an EngineContext for skeleton or morph animation");
        }
        const device = requiresEngine ? activeEngine._device : null;
        if (ctrl.playing) {
          ctrl.time += deltaMs / 1e3 * ctrl.speedRatio;
        }
        if (ctrl.loop) {
          ctrl.time %= clip.duration;
          if (ctrl.time < 0) {
            ctrl.time += clip.duration;
          }
        } else {
          ctrl.time = Math.min(Math.max(ctrl.time, 0), clip.duration);
        }
        const t = ctrl.time;
        for (let i = 0; i < numNodes; i++) {
          const n = nodes[i];
          const off = i * TRS_STRIDE;
          currentTRS[off + T_OFF] = n.tx;
          currentTRS[off + T_OFF + 1] = n.ty;
          currentTRS[off + T_OFF + 2] = n.tz;
          currentTRS[off + R_OFF] = n.rx;
          currentTRS[off + R_OFF + 1] = n.ry;
          currentTRS[off + R_OFF + 2] = n.rz;
          currentTRS[off + R_OFF + 3] = n.rw;
          currentTRS[off + S_OFF] = n.sx;
          currentTRS[off + S_OFF + 1] = n.sy;
          currentTRS[off + S_OFF + 2] = n.sz;
        }
        if (boneOverrides !== void 0 && boneOverrides.size > 0) {
          _boneApplier?.(boneOverrides, currentTRS, numNodes);
        }
        for (let channelIndex = 0; channelIndex < clip.channels.length; channelIndex++) {
          const ch = clip.channels[channelIndex];
          if (_maskResolver !== null && maskActive && ch.nodeIdx >= 0 && maskedNodes[ch.nodeIdx]) {
            continue;
          }
          const sampler = clip.samplers[ch.samplerIdx];
          const base = ch.nodeIdx * TRS_STRIDE;
          switch (ch.path) {
            case PATH_TRANSLATION:
              evaluateSampler(sampler, t, 3, false, currentTRS, base + T_OFF);
              break;
            case PATH_ROTATION:
              evaluateSampler(sampler, t, 4, true, currentTRS, base + R_OFF);
              break;
            case PATH_SCALE:
              evaluateSampler(sampler, t, 3, false, currentTRS, base + S_OFF);
              break;
            case PATH_WEIGHTS: {
              const bindings = morphBindingsByNode[ch.nodeIdx];
              if (bindings) {
                const tc = bindings[0].targetCount;
                morphUploadF32.fill(0);
                evaluateSampler(sampler, t, tc, false, morphUploadF32, 0);
                for (let bindingIndex = 0; bindingIndex < bindings.length; bindingIndex++) {
                  const mb = bindings[bindingIndex];
                  mb.weights.set(morphUploadF32);
                  device.queue.writeBuffer(mb.runtimeMorphTargets?.weightsBuffer ?? mb.weightsBuffer, 0, morphUploadF32.buffer, 0, 16);
                }
              }
              break;
            }
            case PATH_POINTER: {
              if (ch.pointerArity && ch.pointerWriter) {
                evaluateSampler(sampler, t, ch.pointerArity, ch.pointerQuaternion === true, pointerScratch, 0);
                ch.pointerWriter(pointerScratch, 0);
              }
              break;
            }
          }
        }
        for (let bi = 0; bi < nodeTrsBindings.length; bi++) {
          const b = nodeTrsBindings[bi];
          const o = b.off;
          if (b.mask & 1) {
            b.target.position.set(currentTRS[o + T_OFF], currentTRS[o + T_OFF + 1], currentTRS[o + T_OFF + 2]);
          }
          if (b.mask & 2) {
            b.target.rotationQuaternion.set(currentTRS[o + R_OFF], currentTRS[o + R_OFF + 1], currentTRS[o + R_OFF + 2], currentTRS[o + R_OFF + 3]);
          }
          if (b.mask & 4) {
            b.target.scaling.set(currentTRS[o + S_OFF], currentTRS[o + S_OFF + 1], currentTRS[o + S_OFF + 2]);
          }
        }
        for (let idx = 0; idx < numNodes; idx++) {
          const nodeIdx = topoOrder[idx];
          const node = nodes[nodeIdx];
          const off = nodeIdx * TRS_STRIDE;
          if (node._matrix) {
            localMat.set(node._matrix, nodeIdx * 16);
          } else {
            mat4ComposeInto(
              localMat,
              nodeIdx * 16,
              currentTRS[off + T_OFF],
              currentTRS[off + T_OFF + 1],
              currentTRS[off + T_OFF + 2],
              currentTRS[off + R_OFF],
              currentTRS[off + R_OFF + 1],
              currentTRS[off + R_OFF + 2],
              currentTRS[off + R_OFF + 3],
              currentTRS[off + S_OFF],
              currentTRS[off + S_OFF + 1],
              currentTRS[off + S_OFF + 2]
            );
          }
          const parentIdx = node.parentIdx;
          if (parentIdx >= 0) {
            mat4MultiplyInto(worldMat, nodeIdx * 16, worldMat, parentIdx * 16, localMat, nodeIdx * 16);
          } else {
            mat4MultiplyInto(worldMat, nodeIdx * 16, RH_TO_LH, 0, localMat, nodeIdx * 16);
          }
        }
        for (let si = 0; si < skeletons.length; si++) {
          const skel = skeletons[si];
          const boneData = boneScratch[si];
          for (let bi = 0; bi < skel.boneCount; bi++) {
            const jointIdx = skel.jointNodes[bi];
            const ibmOff = bi * 16;
            mat4MultiplyInto(_boneTmp, 0, skel.invMeshWorld, 0, worldMat, jointIdx * 16);
            mat4MultiplyInto(boneData, bi * 16, _boneTmp, 0, skel.inverseBindMatrices, ibmOff);
          }
          const texWidth = skel.boneCount * 4;
          device.queue.writeTexture(
            { texture: skel.runtimeSkeleton?.boneTexture ?? skel.boneTexture },
            boneData.buffer,
            { bytesPerRow: texWidth * 16 },
            { width: texWidth, height: 1 }
          );
        }
      }
    };
    return ctrl;
  }
  function noopAnimationTick() {
  }
  var _boneTmp, _maskResolver, RH_TO_LH, TRS_STRIDE, T_OFF, R_OFF, S_OFF;
  var init_skeleton_updater = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/skeleton/skeleton-updater.ts"() {
      "use strict";
      init_typed_arrays();
      init_types2();
      init_evaluate();
      init_mat4_compose_into();
      init_mat4_multiply_into();
      init_bone_control_hooks();
      _boneTmp = new F32(16);
      _maskResolver = null;
      RH_TO_LH = new F32([-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
      TRS_STRIDE = 12;
      T_OFF = 0;
      R_OFF = 3;
      S_OFF = 7;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/animation-group.ts
  var animation_group_exports = {};
  __export(animation_group_exports, {
    createAnimationGroups: () => createAnimationGroups,
    goToFrame: () => goToFrame,
    pauseAnimation: () => pauseAnimation,
    playAnimation: () => playAnimation,
    stopAnimation: () => stopAnimation,
    tickAnimation: () => tickAnimation
  });
  function playAnimation(group) {
    group.isPlaying = true;
    group._stopped = false;
  }
  function pauseAnimation(group) {
    group.isPlaying = false;
  }
  function stopAnimation(group) {
    group.isPlaying = false;
    group.currentFrame = 0;
    group._stopped = true;
  }
  function goToFrame(group, frame, engine) {
    const ctrl = group._ctrl;
    group.currentFrame = frame / (group.frameRate || DEFAULT_FRAME_RATE);
    group.isPlaying = false;
    if (ctrl) {
      syncControllerFromGroup(group, ctrl);
      if (engine || !group._stopped || !group._gltfMixer) {
        ctrl.tick(0, engine);
        group.currentFrame = ctrl.time;
      }
    }
  }
  function tickAnimation(group, deltaMs, engine) {
    if (!group._stopped && group._ctrl) {
      syncControllerFromGroup(group, group._ctrl);
      group._ctrl.tick(deltaMs, engine);
      group.currentFrame = group._ctrl.time;
    }
  }
  function syncControllerFromGroup(group, ctrl) {
    ctrl.time = group.currentFrame;
    ctrl.playing = group.isPlaying;
    ctrl.speedRatio = group.speedRatio;
    ctrl.loop = group.loopAnimation;
    ctrl._setMask?.(group.mask ?? null);
  }
  function createAnimationGroups(animData) {
    const { clips, nodes, skeletons, morphBindings, nodeTargets, excludedNodeIndices, nodeNames, boneOverrides } = animData;
    const hasPointer = clips.some((c) => c.channels.some((ch) => ch.path === PATH_POINTER));
    const hasNodeWriteback = clips.some(
      (c) => c.channels.some(
        (ch) => (ch.path === PATH_TRANSLATION || ch.path === PATH_ROTATION || ch.path === PATH_SCALE) && ch.nodeIdx >= 0 && !excludedNodeIndices.has(ch.nodeIdx) && !!nodeTargets[ch.nodeIdx]
      )
    );
    if (clips.length === 0 || skeletons.length === 0 && morphBindings.length === 0 && !hasPointer && !hasNodeWriteback) {
      return [];
    }
    return clips.map((clip, clipIndex) => {
      const ctrl = createAnimationController(clip, nodes, skeletons, morphBindings, nodeTargets, excludedNodeIndices, boneOverrides, nodeNames);
      const group = {
        name: clip.name || `animation_${clipIndex}`,
        duration: clip.duration,
        frameRate: clip.frameRate || DEFAULT_FRAME_RATE,
        isPlaying: true,
        currentFrame: 0,
        speedRatio: 1,
        loopAnimation: true,
        weight: 1,
        _ctrl: ctrl,
        _stopped: false
      };
      if (skeletons[0]) {
        group._gltfMixer = [clip, nodes, skeletons];
      }
      return group;
    });
  }
  var DEFAULT_FRAME_RATE;
  var init_animation_group = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/animation/animation-group.ts"() {
      "use strict";
      init_types2();
      init_skeleton_updater();
      DEFAULT_FRAME_RATE = 60;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-animations.ts
  var gltf_feature_animations_exports = {};
  __export(gltf_feature_animations_exports, {
    default: () => gltf_feature_animations_default
  });
  var feature7, gltf_feature_animations_default;
  var init_gltf_feature_animations = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-animations.ts"() {
      "use strict";
      feature7 = {
        id: "_animations",
        async applyAsset(meshes, _root, ctx) {
          const [{ parseAnimationData: parseAnimationData2 }, { createAnimationGroups: createAnimationGroups2 }] = await Promise.all([Promise.resolve().then(() => (init_gltf_animation(), gltf_animation_exports)), Promise.resolve().then(() => (init_animation_group(), animation_group_exports))]);
          const animData = parseAnimationData2(ctx._json, ctx._binChunk, meshes, ctx._parentMap, ctx._worldMatrixCache, ctx._nodeMap, ctx._boneOverrides);
          if (!animData) {
            return {};
          }
          return { animationGroups: createAnimationGroups2(animData) };
        }
      };
      gltf_feature_animations_default = feature7;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-pbr-builder-ext.ts
  var gltf_pbr_builder_ext_exports = {};
  __export(gltf_pbr_builder_ext_exports, {
    assemblePbrPropsExt: () => assemblePbrPropsExt,
    buildDefaultPbrTexturesExt: () => buildDefaultPbrTexturesExt
  });
  function wrapTexCoord(tex, texInfo) {
    if (!texInfo) {
      return tex;
    }
    if (tex._texCoord === 1) {
      return tex;
    }
    const ti = texInfo;
    const tc = ti.extensions?.KHR_texture_transform?.texCoord ?? ti.texCoord;
    return tc === 1 ? cloneTexture2D(tex, { _texCoord: 1 }) : tex;
  }
  function buildDefaultPbrTexturesExt(engine, mat, sampler, generateMipmaps2, getCachedTex, wrapTex) {
    const wrap = (tex, ti) => wrapTexCoord(wrapTex(tex, ti), ti);
    const raw = mat._rawMatDef ?? {};
    const pbr = raw.pbrMetallicRoughness ?? {};
    const baseColorTexture = mat._baseColorImage ? wrap(getCachedTex(mat._baseColorImage, true), pbr.baseColorTexture) : (() => {
      const f = mat._baseColorFactor;
      return uploadTex(
        engine,
        null,
        true,
        sampler,
        generateMipmaps2,
        new U8([linearToSrgbByte(f[0]), linearToSrgbByte(f[1]), linearToSrgbByte(f[2]), Math.round(Math.max(0, Math.min(1, f[3])) * 255)])
      );
    })();
    const normalTexture = mat._normalImage ? wrap(getCachedTex(mat._normalImage, false), raw.normalTexture) : void 0;
    const emissiveTexture = mat._emissiveImage ? wrap(getCachedTex(mat._emissiveImage, true), raw.emissiveTexture) : void 0;
    const occlusionOnUv2 = mat._occlusionTexCoord !== 0 && mat._occlusionImage && !mat._metallicRoughnessImage;
    let occlusionTexture;
    const single = mat._metallicRoughnessImage ?? (occlusionOnUv2 ? null : mat._occlusionImage);
    let ormTexture;
    if (occlusionOnUv2) {
      const clamp2 = (v2) => Math.round(Math.max(0, Math.min(1, v2)) * 255);
      ormTexture = uploadTex(engine, null, false, sampler, generateMipmaps2, new U8([255, clamp2(mat._roughnessFactor), clamp2(mat._metallicFactor), 255]));
      occlusionTexture = wrap(getCachedTex(mat._occlusionImage, false), raw.occlusionTexture);
    } else if (single && (!mat._metallicRoughnessImage || !mat._occlusionImage || mat._metallicRoughnessImage === mat._occlusionImage)) {
      const ormTi = mat._metallicRoughnessImage ? pbr.metallicRoughnessTexture : raw.occlusionTexture;
      ormTexture = wrap(getCachedTex(single, false), ormTi);
    } else if (!single) {
      const clamp2 = (v2) => Math.round(Math.max(0, Math.min(1, v2)) * 255);
      ormTexture = uploadTex(engine, null, false, sampler, generateMipmaps2, new U8([255, clamp2(mat._roughnessFactor), clamp2(mat._metallicFactor), 255]));
    } else {
      ormTexture = wrap(getCachedTex(mat._metallicRoughnessImage, false), pbr.metallicRoughnessTexture);
    }
    return { baseColorTexture, ormTexture, normalTexture, emissiveTexture, occlusionTexture };
  }
  function assemblePbrPropsExt(mat, tex, extLayers) {
    const ef = mat._emissiveFactor;
    const defaultFactor = ef[0] === 1 && ef[1] === 1 && ef[2] === 1 || ef[0] === 0 && ef[1] === 0 && ef[2] === 0;
    const hasAnyUvTx = !!tex.baseColorTexture._hasTx || !!tex.normalTexture?._hasTx || !!tex.ormTexture._hasTx || !!tex.emissiveTexture?._hasTx || !!tex.occlusionTexture?._hasTx;
    return {
      baseColorTexture: tex.baseColorTexture,
      normalTexture: tex.normalTexture,
      ormTexture: tex.ormTexture,
      emissiveTexture: tex.emissiveTexture,
      ...mat._baseColorImage && !isDefaultBaseColorFactor2(mat._baseColorFactor) ? { baseColorFactor: mat._baseColorFactor } : void 0,
      doubleSided: mat._doubleSided,
      occlusionStrength: mat._occlusionImage ? 1 : 0,
      ...mat._occlusionTexCoord ? { occlusionTexCoord: mat._occlusionTexCoord } : void 0,
      ...tex.occlusionTexture ? { occlusionTexture: tex.occlusionTexture } : void 0,
      ...mat._normalScale !== 1 ? { normalTextureScale: mat._normalScale } : void 0,
      ...mat._metallicRoughnessImage ? { metallicFactor: mat._metallicFactor, roughnessFactor: mat._roughnessFactor } : void 0,
      ...!defaultFactor ? { emissiveColor: [ef[0], ef[1], ef[2]] } : void 0,
      enableSpecularAA: true,
      ...mat._alphaMode === "BLEND" ? { alphaBlend: true, alpha: mat._baseColorFactor[3] } : void 0,
      ...mat._alphaMode === "MASK" ? { alpha: mat._baseColorFactor[3], alphaCutOff: mat._alphaCutoff } : void 0,
      ...hasAnyUvTx ? { _hasUvTx: true } : void 0,
      ...mat._rawMatDef?.name ? { name: mat._rawMatDef.name } : void 0,
      ...extLayers,
      _buildGroup: pbrGroupBuilder,
      _uboVersion: 0
    };
  }
  function isDefaultBaseColorFactor2(f) {
    return f[0] === 1 && f[1] === 1 && f[2] === 1 && f[3] === 1;
  }
  var init_gltf_pbr_builder_ext = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-pbr-builder-ext.ts"() {
      "use strict";
      init_typed_arrays();
      init_texture_2d();
      init_pbr_material();
      init_color();
      init_gltf_pbr_builder();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-variants.ts
  var gltf_variants_exports = {};
  __export(gltf_variants_exports, {
    loadVariantMaterials: () => loadVariantMaterials
  });
  async function loadVariantMaterials(json, binChunk, baseUrl, variantNames, meshes, engine, exts, wrapTex = identityTexWrap) {
    const generateMipmaps2 = (await Promise.resolve().then(() => (init_generate_mipmaps(), generate_mipmaps_exports))).generateMipmaps;
    const sampler = getOrCreateSampler(engine, {
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
      maxAnisotropy: 4
    });
    const matCache = /* @__PURE__ */ new Map();
    const imageCache = /* @__PURE__ */ new Map();
    const fetchImg = makeImageFetcher(json, binChunk, baseUrl, imageCache);
    const getCachedTex = (bitmap, srgb) => uploadTex(engine, bitmap, srgb, sampler, generateMipmaps2);
    const extCtx = {
      _engine: engine,
      async _texture(texInfo, sRGB) {
        if (!texInfo) {
          return void 0;
        }
        const img = await fetchImg(texInfo);
        return img ? wrapTex(uploadTex(engine, img, sRGB, sampler, generateMipmaps2), texInfo) : void 0;
      },
      _uploadImage(bitmap, sRGB) {
        return uploadTex(engine, bitmap, sRGB, sampler, generateMipmaps2);
      }
    };
    const getMat = (matIdx) => {
      let p = matCache.get(matIdx);
      if (!p) {
        p = assembleMaterial(json, binChunk, matIdx, baseUrl, imageCache);
        matCache.set(matIdx, p);
      }
      return p;
    };
    const pbrCache = /* @__PURE__ */ new Map();
    const getPbr = (gltfMat) => {
      let p = pbrCache.get(gltfMat);
      if (!p) {
        p = (async () => {
          const tex = buildDefaultPbrTexturesExt(engine, gltfMat, sampler, generateMipmaps2, getCachedTex, wrapTex);
          const layers = await runMatExts(gltfMat, exts, extCtx);
          return assemblePbrPropsExt(gltfMat, tex, layers);
        })();
        pbrCache.set(gltfMat, p);
      }
      return p;
    };
    const originals = [];
    const variants = {};
    for (const name of variantNames) {
      variants[name] = [];
    }
    let meshIdx = 0;
    for (let nodeIdx = 0; nodeIdx < json.nodes.length; nodeIdx++) {
      const node = json.nodes[nodeIdx];
      if (node.mesh === void 0) {
        continue;
      }
      const gltfMesh = json.meshes[node.mesh];
      for (const primitive of gltfMesh.primitives) {
        const mesh = meshes[meshIdx];
        const variantExt = primitive.extensions?.KHR_materials_variants;
        if (variantExt?.mappings) {
          originals.push({ mesh, material: mesh.material });
          for (const mapping of variantExt.mappings) {
            const gltfMat = await getMat(mapping.material);
            const pbrMat = await getPbr(gltfMat);
            for (const vi of mapping.variants) {
              const name = variantNames[vi];
              if (name) {
                variants[name].push({ mesh, material: pbrMat });
              }
            }
          }
        }
        meshIdx++;
      }
    }
    return { names: variantNames, variants, originals };
  }
  var init_gltf_variants = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-variants.ts"() {
      "use strict";
      init_gltf_material();
      init_gpu_pool();
      init_gltf_pbr_builder();
      init_gltf_pbr_builder_ext();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-variants.ts
  var gltf_feature_variants_exports = {};
  __export(gltf_feature_variants_exports, {
    default: () => gltf_feature_variants_default
  });
  var feature8, gltf_feature_variants_default;
  var init_gltf_feature_variants = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-variants.ts"() {
      "use strict";
      feature8 = {
        id: "KHR_materials_variants",
        async applyAsset(meshes, _root, ctx) {
          const variantNames = ctx._json.extensions?.KHR_materials_variants?.variants?.map((v2) => v2.name);
          if (!variantNames?.length) {
            return {};
          }
          const { loadVariantMaterials: loadVariantMaterials2 } = await Promise.resolve().then(() => (init_gltf_variants(), gltf_variants_exports));
          const materialVariants = await loadVariantMaterials2(ctx._json, ctx._binChunk, ctx._baseUrl, variantNames, meshes, ctx._engine, ctx._matExts, ctx._wrapTex);
          return { materialVariants };
        }
      };
      gltf_feature_variants_default = feature8;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-node-visibility.ts
  var gltf_ext_node_visibility_exports = {};
  __export(gltf_ext_node_visibility_exports, {
    default: () => gltf_ext_node_visibility_default
  });
  function applyVisibility(json, nodeMap) {
    const nodes = json.nodes ?? [];
    for (let i = 0; i < nodes.length; i++) {
      const vis = nodes[i]?.extensions?.KHR_node_visibility?.visible;
      const sn = nodeMap[i];
      if (vis === false && sn) {
        setSubtreeVisible(sn, false);
      }
    }
  }
  var ext12, gltf_ext_node_visibility_default;
  var init_gltf_ext_node_visibility = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-ext-node-visibility.ts"() {
      "use strict";
      init_visibility();
      ext12 = {
        id: "KHR_node_visibility",
        async applyAsset(_meshes, _root, ctx) {
          if (ctx._nodeMap) {
            applyVisibility(ctx._json, ctx._nodeMap);
          }
          return {};
        }
      };
      gltf_ext_node_visibility_default = ext12;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/animation-pointer.ts
  function resolveAnimationPointer(pointer, ctx) {
    for (const [rx, make] of _registry) {
      const m = rx.exec(pointer);
      if (m) {
        return make(m, ctx);
      }
    }
    if (!_warned.has(pointer)) {
      _warned.add(pointer);
      console.warn(`[babylon-lite] KHR_animation_pointer: no handler for "${pointer}"`);
    }
    return null;
  }
  var TX_SLOT, _registry, _warned;
  var init_animation_pointer = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/animation-pointer.ts"() {
      "use strict";
      init_visibility();
      TX_SLOT = {
        "pbrMetallicRoughness/baseColorTexture": "baseColorTexture",
        emissiveTexture: "emissiveTexture",
        normalTexture: "normalTexture",
        occlusionTexture: "ormTexture",
        "pbrMetallicRoughness/metallicRoughnessTexture": "ormTexture"
      };
      _registry = [
        // /nodes/{n}/extensions/KHR_node_visibility/visible — scalar (0 = hidden).
        // The setter cascade handles descendants per the KHR_node_visibility spec
        // and bumps the module-scoped visibility epoch so the engine invalidates
        // its cached render bundle.
        [
          /^\/nodes\/(\d+)\/extensions\/KHR_node_visibility\/visible$/,
          (m, ctx) => {
            const n = ctx.nodes[+m[1]];
            if (!n) {
              return null;
            }
            return {
              arity: 1,
              writer: (out, off) => {
                setSubtreeVisible(n, out[off] !== 0);
              }
            };
          }
        ],
        // /materials/{m}/.../KHR_texture_transform/{offset|scale} — animated UV scroll
        // (vec2). Mutates the slot texture's uOffset/vOffset (or uScale/vScale) and
        // bumps the material's UBO version so the renderable re-uploads the UV matrix.
        [
          /^\/materials\/(\d+)\/(pbrMetallicRoughness\/baseColorTexture|pbrMetallicRoughness\/metallicRoughnessTexture|emissiveTexture|normalTexture|occlusionTexture)\/extensions\/KHR_texture_transform\/(offset|scale)$/,
          (m, ctx) => {
            const mat = ctx.materials?.[+m[1]];
            const tex = mat?.[TX_SLOT[m[2]]];
            if (!mat || !tex) {
              return null;
            }
            const isScale = m[3] === "scale";
            return {
              arity: 2,
              writer: (out, off) => {
                if (isScale) {
                  tex.uScale = out[off];
                  tex.vScale = out[off + 1];
                } else {
                  tex.uOffset = out[off];
                  tex.vOffset = out[off + 1];
                }
                mat._uboVersion++;
              }
            };
          }
        ]
      ];
      _warned = /* @__PURE__ */ new Set();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-animation-pointer.ts
  var gltf_feature_animation_pointer_exports = {};
  __export(gltf_feature_animation_pointer_exports, {
    default: () => gltf_feature_animation_pointer_default
  });
  function materialMap(json, meshes) {
    if (meshes === _matMapKey) {
      return _matMap;
    }
    _matMapKey = meshes;
    const map = [];
    const nodes = json.nodes ?? [];
    let gpuIdx = 0;
    for (let ni = 0; ni < nodes.length; ni++) {
      const meshRef = nodes[ni]?.mesh;
      if (meshRef === void 0) {
        continue;
      }
      const prims = json.meshes?.[meshRef]?.primitives ?? [];
      for (let p = 0; p < prims.length; p++) {
        const matIdx = prims[p]?.material;
        const mesh = meshes[gpuIdx++];
        if (matIdx !== void 0 && mesh) {
          map[matIdx] = mesh.material;
        }
      }
    }
    _matMap = map;
    return map;
  }
  var NODE_TRS_PATH, _matMapKey, _matMap, feature9, gltf_feature_animation_pointer_default;
  var init_gltf_feature_animation_pointer = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-animation-pointer.ts"() {
      "use strict";
      init_typed_arrays();
      init_types2();
      init_animation_pointer();
      init_gltf_animation();
      NODE_TRS_PATH = {
        translation: PATH_TRANSLATION,
        rotation: PATH_ROTATION,
        scale: PATH_SCALE,
        weights: PATH_WEIGHTS
      };
      _matMapKey = null;
      _matMap = [];
      _installPointerHandlers(
        (ptr, c, nodeMap, json, meshes) => {
          if (!nodeMap) {
            return null;
          }
          const trs = /^\/nodes\/(\d+)\/(translation|rotation|scale|weights)$/.exec(ptr);
          if (trs) {
            return { samplerIdx: c.sampler, nodeIdx: +trs[1], path: NODE_TRS_PATH[trs[2]] };
          }
          const resolved = resolveAnimationPointer(ptr, { nodes: nodeMap, materials: materialMap(json, meshes) });
          if (!resolved) {
            return null;
          }
          const ch = {
            samplerIdx: c.sampler,
            nodeIdx: -1,
            path: PATH_POINTER,
            pointerWriter: resolved.writer,
            pointerArity: resolved.arity
          };
          return ch;
        },
        (src, length, normalized) => {
          const out = new F32(length);
          if (src instanceof F32) {
            for (let i = 0; i < length; i++) {
              out[i] = src[i];
            }
          } else if (src instanceof U8) {
            const k = normalized ? 1 / 255 : 1;
            for (let i = 0; i < length; i++) {
              out[i] = src[i] * k;
            }
          } else if (src instanceof U16) {
            const k = normalized ? 1 / 65535 : 1;
            for (let i = 0; i < length; i++) {
              out[i] = src[i] * k;
            }
          } else if (src instanceof I8) {
            for (let i = 0; i < length; i++) {
              out[i] = normalized ? Math.max(src[i] / 127, -1) : src[i];
            }
          } else if (src instanceof I16) {
            for (let i = 0; i < length; i++) {
              out[i] = normalized ? Math.max(src[i] / 32767, -1) : src[i];
            }
          }
          return out;
        }
      );
      feature9 = { id: "KHR_animation_pointer" };
      gltf_feature_animation_pointer_default = feature9;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-multiply.ts
  function mat4Multiply(a, b) {
    const out = new F32(16);
    mat4MultiplyInto(out, 0, a, 0, b, 0);
    return out;
  }
  var init_mat4_multiply = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-multiply.ts"() {
      "use strict";
      init_typed_arrays();
      init_mat4_multiply_into();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance.ts
  function setThinInstances(mesh, matrices, count) {
    if (!mesh.thinInstances) {
      mesh.thinInstances = {
        matrices,
        count,
        _capacity: count,
        _version: 1,
        _gpuBuffer: null,
        _gpuBufferStorage: false,
        _gpuVersion: 0,
        _dirtyMin: 0,
        _dirtyMax: count,
        _colorVersion: 0,
        _colorDirtyMin: 0,
        _colorDirtyMax: 0,
        _colorGpuBuffer: null,
        _colorGpuBufferStorage: false,
        _colorGpuVersion: 0,
        _gpuCullingEnabled: false
      };
    } else {
      mesh.thinInstances.matrices = matrices;
      mesh.thinInstances.count = count;
      mesh.thinInstances._capacity = count;
      mesh.thinInstances._version++;
      mesh.thinInstances._dirtyMin = 0;
      mesh.thinInstances._dirtyMax = count;
    }
  }
  var init_thin_instance = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/thin-instance.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-gpu-instancing.ts
  var gltf_feature_gpu_instancing_exports = {};
  __export(gltf_feature_gpu_instancing_exports, {
    default: () => gltf_feature_gpu_instancing_default
  });
  function collectMeshesUnderNode(tn) {
    const out = [];
    for (const c of tn?.children ?? []) {
      if (c && typeof c === "object" && "material" in c) {
        out.push(c);
      }
    }
    return out;
  }
  function buildInstanceMatrices(translation, rotation, scale, count) {
    const matrices = new F32(count * 16);
    for (let i = 0; i < count; i++) {
      const tx = translation ? translation[i * 3] : 0;
      const ty = translation ? translation[i * 3 + 1] : 0;
      const tz = translation ? translation[i * 3 + 2] : 0;
      const qx = rotation ? rotation[i * 4] : 0;
      const qy = rotation ? rotation[i * 4 + 1] : 0;
      const qz = rotation ? rotation[i * 4 + 2] : 0;
      const qw = rotation ? rotation[i * 4 + 3] : 1;
      const sx = scale ? scale[i * 3] : 1;
      const sy = scale ? scale[i * 3 + 1] : 1;
      const sz = scale ? scale[i * 3 + 2] : 1;
      mat4ComposeInto(matrices, i * 16, tx, ty, tz, qx, qy, qz, qw, sx, sy, sz);
    }
    return matrices;
  }
  function expandMeshAabbForInstances(mesh, matrices, count, nodeWorld) {
    const positions = mesh._cpuPositions;
    if (!positions || !nodeWorld || count === 0) {
      return;
    }
    const [lmin, lmax] = computeAabb(positions);
    if (!isFinite(lmin[0])) {
      return;
    }
    const corners = new F32([
      lmin[0],
      lmin[1],
      lmin[2],
      lmax[0],
      lmin[1],
      lmin[2],
      lmin[0],
      lmax[1],
      lmin[2],
      lmax[0],
      lmax[1],
      lmin[2],
      lmin[0],
      lmin[1],
      lmax[2],
      lmax[0],
      lmin[1],
      lmax[2],
      lmin[0],
      lmax[1],
      lmax[2],
      lmax[0],
      lmax[1],
      lmax[2]
    ]);
    let wMinX = Infinity, wMinY = Infinity, wMinZ = Infinity;
    let wMaxX = -Infinity, wMaxY = -Infinity, wMaxZ = -Infinity;
    const instWorld = getLoaderTmpInstance();
    const instBuf = instWorld;
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 16; k++) {
        instBuf[k] = matrices[i * 16 + k];
      }
      const combined = mat4Multiply(nodeWorld, instWorld);
      const [imin, imax] = computeAabb(corners, combined);
      if (imin[0] < wMinX) {
        wMinX = imin[0];
      }
      if (imin[1] < wMinY) {
        wMinY = imin[1];
      }
      if (imin[2] < wMinZ) {
        wMinZ = imin[2];
      }
      if (imax[0] > wMaxX) {
        wMaxX = imax[0];
      }
      if (imax[1] > wMaxY) {
        wMaxY = imax[1];
      }
      if (imax[2] > wMaxZ) {
        wMaxZ = imax[2];
      }
    }
    mesh.boundMin = [wMinX, wMinY, wMinZ];
    mesh.boundMax = [wMaxX, wMaxY, wMaxZ];
  }
  var ext13, gltf_feature_gpu_instancing_default;
  var init_gltf_feature_gpu_instancing = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-gpu-instancing.ts"() {
      "use strict";
      init_typed_arrays();
      init_gltf_parser();
      init_compute_aabb();
      init_mat4_compose_into();
      init_mat4_multiply();
      init_thin_instance();
      init_loader_scratch();
      ext13 = {
        id: "EXT_mesh_gpu_instancing",
        async applyAsset(_meshes, _root, ctx) {
          const { _json: json, _binChunk: binChunk, _nodeMap: nodeMap } = ctx;
          if (!nodeMap) {
            return {};
          }
          const nodes = json.nodes ?? [];
          for (let nodeIdx = 0; nodeIdx < nodes.length; nodeIdx++) {
            const attrs = nodes[nodeIdx]?.extensions?.EXT_mesh_gpu_instancing?.attributes;
            if (!attrs) {
              continue;
            }
            const tn = nodeMap[nodeIdx];
            if (!tn) {
              continue;
            }
            const meshesForNode = collectMeshesUnderNode(tn);
            if (meshesForNode.length === 0) {
              continue;
            }
            const tAcc = attrs.TRANSLATION !== void 0 ? resolveAccessor(json, binChunk, attrs.TRANSLATION) : null;
            const rAcc = attrs.ROTATION !== void 0 ? resolveAccessor(json, binChunk, attrs.ROTATION) : null;
            const sAcc = attrs.SCALE !== void 0 ? resolveAccessor(json, binChunk, attrs.SCALE) : null;
            let count = 0;
            for (const acc of [tAcc, rAcc, sAcc]) {
              if (!acc) {
                continue;
              }
              if (count === 0) {
                count = acc._count;
              } else if (acc._count !== count) {
                throw new Error(`EXT_mesh_gpu_instancing: accessor count mismatch on node ${nodeIdx}`);
              }
            }
            if (count === 0) {
              continue;
            }
            const matrices = buildInstanceMatrices(
              tAcc ? tAcc._data : null,
              rAcc ? rAcc._data : null,
              sAcc ? sAcc._data : null,
              count
            );
            const nodeWorld = ctx._worldMatrixCache.get(nodeIdx);
            for (const mesh of meshesForNode) {
              setThinInstances(mesh, matrices, count);
              expandMeshAabbForInstances(mesh, matrices, count, nodeWorld);
            }
          }
          return {};
        }
      };
      gltf_feature_gpu_instancing_default = ext13;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-xmp.ts
  var gltf_feature_xmp_exports = {};
  __export(gltf_feature_xmp_exports, {
    default: () => gltf_feature_xmp_default
  });
  var feature10, gltf_feature_xmp_default;
  var init_gltf_feature_xmp = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-xmp.ts"() {
      "use strict";
      feature10 = {
        id: "KHR_xmp_json_ld",
        async applyAsset(_meshes, _root, ctx) {
          const json = ctx._json;
          const packets = json.extensions?.KHR_xmp_json_ld?.packets ?? [];
          const assetPacketIndex = json.asset?.extensions?.KHR_xmp_json_ld?.packet;
          const assetPacket = assetPacketIndex !== void 0 ? packets[assetPacketIndex] : void 0;
          return { xmpMetadata: { packets, assetPacket } };
        }
      };
      gltf_feature_xmp_default = feature10;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-registry.ts
  var gltf_feature_registry_exports = {};
  __export(gltf_feature_registry_exports, {
    loadGltfFeatures: () => loadGltfFeatures
  });
  async function loadGltfFeatures(json) {
    const used = json.extensionsUsed ?? [];
    const mods = await Promise.all(_features.flatMap(([t, load]) => (typeof t === "string" ? used.includes(t) : t(json)) ? [load()] : []));
    return mods.map((m) => m.default);
  }
  var M, _features;
  var init_gltf_feature_registry = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-feature-registry.ts"() {
      "use strict";
      init_gltf_parser();
      M = "KHR_materials_";
      _features = [
        // Pre-parse features (buffer-level): order matters — meshopt decompresses
        // bufferViews first, then quantization dequantizes the resulting accessors.
        ["EXT_meshopt_compression", () => Promise.resolve().then(() => (init_gltf_feature_meshopt(), gltf_feature_meshopt_exports))],
        ["KHR_mesh_quantization", () => Promise.resolve().then(() => (init_gltf_ext_quantization(), gltf_ext_quantization_exports))],
        // Pre-mesh features (geometry decompression)
        ["KHR_draco_mesh_compression", () => Promise.resolve().then(() => (init_gltf_feature_draco(), gltf_feature_draco_exports))],
        // Material extensions
        [M + "clearcoat", () => Promise.resolve().then(() => (init_gltf_ext_clearcoat(), gltf_ext_clearcoat_exports))],
        [M + "iridescence", () => Promise.resolve().then(() => (init_gltf_ext_iridescence(), gltf_ext_iridescence_exports))],
        [M + "emissive_strength", () => Promise.resolve().then(() => (init_gltf_ext_emissive_strength(), gltf_ext_emissive_strength_exports))],
        [M + "sheen", () => Promise.resolve().then(() => (init_gltf_ext_sheen(), gltf_ext_sheen_exports))],
        [M + "anisotropy", () => Promise.resolve().then(() => (init_gltf_ext_anisotropy(), gltf_ext_anisotropy_exports))],
        [M + "unlit", () => Promise.resolve().then(() => (init_gltf_ext_unlit(), gltf_ext_unlit_exports))],
        [M + "pbrSpecularGlossiness", () => Promise.resolve().then(() => (init_gltf_ext_spec_gloss(), gltf_ext_spec_gloss_exports))],
        // Dielectric cluster (ior/specular/transmission/volume/dispersion) — any of the five triggers the
        // loader; transmission refraction is wired dynamically by the PBR material path when needed.
        [(j) => ["transmission", "volume", "ior", "specular", "dispersion"].some((e) => j.extensionsUsed?.includes(M + e)), () => Promise.resolve().then(() => (init_gltf_ext_dielectric(), gltf_ext_dielectric_exports))],
        ["KHR_texture_transform", () => Promise.resolve().then(() => (init_gltf_ext_uv_transform(), gltf_ext_uv_transform_exports))],
        ["KHR_texture_basisu", () => Promise.resolve().then(() => (init_gltf_ext_basisu(), gltf_ext_basisu_exports))],
        [needsOrmComposite, () => Promise.resolve().then(() => (init_gltf_ext_orm(), gltf_ext_orm_exports))],
        // Per-mesh features (predicates inlined to avoid eager imports)
        [(j) => !!j.skins?.length && anyPrimitive(j, (p) => p.attributes?.JOINTS_0 !== void 0), () => Promise.resolve().then(() => (init_gltf_feature_skeleton(), gltf_feature_skeleton_exports))],
        [(j) => anyPrimitive(j, (p) => !!p.targets?.length), () => Promise.resolve().then(() => (init_gltf_feature_morph(), gltf_feature_morph_exports))],
        // Per-asset features
        ["KHR_lights_punctual", () => Promise.resolve().then(() => (init_gltf_feature_lights_punctual(), gltf_feature_lights_punctual_exports))],
        [(j) => !!j.animations?.length, () => Promise.resolve().then(() => (init_gltf_feature_animations(), gltf_feature_animations_exports))],
        [M + "variants", () => Promise.resolve().then(() => (init_gltf_feature_variants(), gltf_feature_variants_exports))],
        ["KHR_node_visibility", () => Promise.resolve().then(() => (init_gltf_ext_node_visibility(), gltf_ext_node_visibility_exports))],
        ["KHR_animation_pointer", () => Promise.resolve().then(() => (init_gltf_feature_animation_pointer(), gltf_feature_animation_pointer_exports))],
        ["EXT_mesh_gpu_instancing", () => Promise.resolve().then(() => (init_gltf_feature_gpu_instancing(), gltf_feature_gpu_instancing_exports))],
        ["KHR_xmp_json_ld", () => Promise.resolve().then(() => (init_gltf_feature_xmp(), gltf_feature_xmp_exports))]
      ];
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-glb-parser.ts
  var gltf_glb_parser_exports = {};
  __export(gltf_glb_parser_exports, {
    parseGlbContainer: () => parseGlbContainer
  });
  function parseGlbContainer(buffer) {
    const view = new DV(buffer);
    const magic = view.getUint32(0, true);
    if (magic !== 1179937895) {
      throw new Error("Not a valid GLB file");
    }
    let offset = 12;
    const jsonLength = view.getUint32(offset, true);
    const jsonType = view.getUint32(offset + 4, true);
    if (jsonType !== 1313821514) {
      throw new Error("First GLB chunk is not JSON");
    }
    const jsonStr = new TextDecoder().decode(new U8(buffer, offset + 8, jsonLength));
    const json = JSON.parse(jsonStr);
    offset += 8 + jsonLength;
    const binLength = view.getUint32(offset, true);
    const binType = view.getUint32(offset + 4, true);
    if (binType !== 5130562) {
      throw new Error("Second GLB chunk is not BIN");
    }
    const binChunk = new DV(buffer, offset + 8, binLength);
    return { json, binChunk };
  }
  var init_gltf_glb_parser = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-glb-parser.ts"() {
      "use strict";
      init_typed_arrays();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-normals.ts
  var gltf_normals_exports = {};
  __export(gltf_normals_exports, {
    computeSmoothNormals: () => computeSmoothNormals,
    createSequentialIndices: () => createSequentialIndices2
  });
  function createSequentialIndices2(vertexCount) {
    const indices = vertexCount > 65535 ? new Uint32Array(vertexCount) : new Uint16Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      indices[i] = i;
    }
    return indices;
  }
  function computeSmoothNormals(positions, indices, vertexCount) {
    const normals = new Float32Array(vertexCount * 3);
    const indexed = indices.length > 0;
    const triCount = indexed ? indices.length / 3 | 0 : vertexCount / 3 | 0;
    for (let f = 0; f < triCount; f++) {
      const ia = indexed ? indices[f * 3] : f * 3;
      const ib = indexed ? indices[f * 3 + 1] : f * 3 + 1;
      const ic = indexed ? indices[f * 3 + 2] : f * 3 + 2;
      const ax = positions[ia * 3], ay = positions[ia * 3 + 1], az = positions[ia * 3 + 2];
      const bx = positions[ib * 3], by = positions[ib * 3 + 1], bz = positions[ib * 3 + 2];
      const cx = positions[ic * 3], cy = positions[ic * 3 + 1], cz = positions[ic * 3 + 2];
      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      normals[ia * 3] += nx;
      normals[ia * 3 + 1] += ny;
      normals[ia * 3 + 2] += nz;
      normals[ib * 3] += nx;
      normals[ib * 3 + 1] += ny;
      normals[ib * 3 + 2] += nz;
      normals[ic * 3] += nx;
      normals[ic * 3 + 1] += ny;
      normals[ic * 3 + 2] += nz;
    }
    for (let i = 0; i < vertexCount; i++) {
      const x = normals[i * 3], y = normals[i * 3 + 1], z = normals[i * 3 + 2];
      const len = Math.hypot(x, y, z) || 1;
      normals[i * 3] = x / len;
      normals[i * 3 + 1] = y / len;
      normals[i * 3 + 2] = z / len;
    }
    return normals;
  }
  var init_gltf_normals = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-normals.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-color-normalize.ts
  var gltf_color_normalize_exports = {};
  __export(gltf_color_normalize_exports, {
    normalizeColorToVec3: () => normalizeColorToVec3
  });
  function normalizeColorToVec3(data, count, comps) {
    const out = new Float32Array(count * 3);
    if (data instanceof Float32Array) {
      for (let v2 = 0; v2 < count; v2++) {
        out[v2 * 3] = data[v2 * comps];
        out[v2 * 3 + 1] = data[v2 * comps + 1];
        out[v2 * 3 + 2] = data[v2 * comps + 2];
      }
    } else if (data instanceof Uint16Array) {
      const inv = 1 / 65535;
      for (let v2 = 0; v2 < count; v2++) {
        out[v2 * 3] = data[v2 * comps] * inv;
        out[v2 * 3 + 1] = data[v2 * comps + 1] * inv;
        out[v2 * 3 + 2] = data[v2 * comps + 2] * inv;
      }
    } else if (data instanceof Uint8Array) {
      const inv = 1 / 255;
      for (let v2 = 0; v2 < count; v2++) {
        out[v2 * 3] = data[v2 * comps] * inv;
        out[v2 * 3 + 1] = data[v2 * comps + 1] * inv;
        out[v2 * 3 + 2] = data[v2 * comps + 2] * inv;
      }
    }
    return out;
  }
  var init_gltf_color_normalize = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/gltf-color-normalize.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-scale.ts
  function mat4Scale(x, y, z) {
    const out = new F32(16);
    out[0] = x;
    out[5] = y;
    out[10] = z;
    out[15] = 1;
    return out;
  }
  var init_mat4_scale = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/math/mat4-scale.ts"() {
      "use strict";
      init_typed_arrays();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/physics/havok.ts
  function createHavokWorld(scene, hknp, gravity) {
    const hkWorld = hknp.HP_World_Create()[1];
    const g = gravity ?? { x: 0, y: -9.81, z: 0 };
    hknp.HP_World_SetGravity(hkWorld, [g.x, g.y, g.z]);
    const world = {
      _hknp: hknp,
      _hkWorld: hkWorld,
      _bodies: [],
      _timestep: 1 / 60,
      _gravity: [g.x, g.y, g.z]
    };
    onBeforeRender(scene, (deltaMs) => {
      _stepWorld(world, deltaMs);
    });
    return world;
  }
  function _stepWorld(world, deltaMs) {
    const { _hknp: hknp, _hkWorld: hkWorld, _bodies: bodies } = world;
    const dt = Math.min(deltaMs / 1e3, 0.1);
    if (dt <= 0) {
      return;
    }
    if (world._fo) {
      world._fo.step(world);
      return;
    }
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b._prestepType !== 0 /* DISABLED */ && (b.motionType === 1 /* ANIMATED */ || b._preStep)) {
        if (b._prestepType === 2 /* ACTION */) {
          _syncNodeToBodyTarget(hknp, b);
        } else {
          _syncNodeToBody(hknp, b);
        }
      }
    }
    hknp.HP_World_Step(hkWorld, world._timestep);
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.motionType === 2 /* DYNAMIC */) {
        _syncBodyToNode(hknp, b);
      }
    }
    if (world._afterStep) {
      const cbs = world._afterStep;
      for (let i = 0; i < cbs.length; i++) {
        cbs[i](world._timestep);
      }
    }
  }
  function onPhysicsAfterStep(world, cb) {
    (world._afterStep ?? (world._afterStep = [])).push(cb);
  }
  function _syncBodyToNode(hknp, body) {
    const t = hknp.HP_Body_GetQTransform(body._hkBody)[1];
    const pos = t[0];
    const rot = t[1];
    const node = body.node;
    node.position.set(pos[0], pos[1], pos[2]);
    node.rotationQuaternion.set(rot[0], rot[1], rot[2], rot[3]);
  }
  function _syncNodeToBody(hknp, body) {
    const node = body.node;
    const p = node.position;
    const q = node.rotationQuaternion;
    hknp.HP_Body_SetQTransform(body._hkBody, [
      [p.x, p.y, p.z],
      [q.x, q.y, q.z, q.w]
    ]);
  }
  function _syncNodeToBodyTarget(hknp, body) {
    const node = body.node;
    const p = node.position;
    const q = node.rotationQuaternion;
    hknp.HP_Body_SetTargetQTransform(body._hkBody, [
      [p.x, p.y, p.z],
      [q.x, q.y, q.z, q.w]
    ]);
  }
  function createPhysicsBody(world, node, motionType, startsAsleep = false) {
    const { _hknp: hknp, _hkWorld: hkWorld } = world;
    const hkBody = hknp.HP_Body_Create()[1];
    const hkMotion = motionType === 0 /* STATIC */ ? hknp.MotionType.STATIC : motionType === 1 /* ANIMATED */ ? hknp.MotionType.KINEMATIC : hknp.MotionType.DYNAMIC;
    hknp.HP_Body_SetMotionType(hkBody, hkMotion);
    const body = {
      _hkBody: hkBody,
      _shape: null,
      _preStep: false,
      _prestepType: 1 /* TELEPORT */,
      _world: world,
      node,
      motionType
    };
    if (world._fo) {
      world._fo.placeBody(world, body, startsAsleep);
    } else {
      hknp.HP_World_AddBody(hkWorld, hkBody, startsAsleep);
      const p = node.position;
      const q = node.rotationQuaternion;
      hknp.HP_Body_SetQTransform(hkBody, [
        [p.x, p.y, p.z],
        [q.x, q.y, q.z, q.w]
      ]);
    }
    world._bodies.push(body);
    return body;
  }
  function setPhysicsBodyPreStep(body, enabled) {
    body._preStep = enabled;
  }
  function createPhysicsConstraint(world, bodyA, bodyB, type, options = {}, limits = []) {
    const hknp = world._hknp;
    const joint = hknp.HP_Constraint_Create()[1];
    hknp.HP_Constraint_SetParentBody(joint, bodyA._hkBody);
    hknp.HP_Constraint_SetChildBody(joint, bodyB._hkBody);
    const pivotA = options.pivotA ?? ZERO_VEC3;
    const pivotB = options.pivotB ?? ZERO_VEC3;
    const axisA = options.axisA ?? X_AXIS;
    const axisB = options.axisB ?? X_AXIS;
    const perpAxisA = options.perpAxisA ?? normalTo(axisA);
    const perpAxisB = options.perpAxisB ?? normalTo(axisB);
    hknp.HP_Constraint_SetAnchorInParent(joint, vec3Array(pivotA), vec3Array(axisA), vec3Array(perpAxisA));
    hknp.HP_Constraint_SetAnchorInChild(joint, vec3Array(pivotB), vec3Array(axisB), vec3Array(perpAxisB));
    configureConstraintAxes(hknp, joint, type, options, limits);
    hknp.HP_Constraint_SetCollisionsEnabled(joint, !!options.collision);
    hknp.HP_Constraint_SetEnabled(joint, true);
    return { _hkConstraint: joint, bodyA, bodyB, type, options: { ...options, axisA, axisB, perpAxisA, perpAxisB }, limits };
  }
  function vec3Array(v2) {
    return [v2.x, v2.y, v2.z];
  }
  function normalTo(axis) {
    const ax = Math.abs(axis.x);
    const ay = Math.abs(axis.y);
    const az = Math.abs(axis.z);
    if (ax <= ay && ax <= az) {
      return normalizeVec3({ x: 0, y: -axis.z, z: axis.y });
    }
    if (ay <= ax && ay <= az) {
      return normalizeVec3({ x: -axis.z, y: 0, z: axis.x });
    }
    return normalizeVec3({ x: -axis.y, y: axis.x, z: 0 });
  }
  function normalizeVec3(v2) {
    const inv = 1 / Math.max(1e-8, Math.hypot(v2.x, v2.y, v2.z));
    return { x: v2.x * inv, y: v2.y * inv, z: v2.z * inv };
  }
  function configureConstraintAxes(hknp, joint, type, options, limits) {
    const axis = hknp.ConstraintAxis;
    const mode = hknp.ConstraintAxisLimitMode;
    const lock = (a) => hknp.HP_Constraint_SetAxisMode(joint, a, mode.LOCKED);
    const limit = (a, min, max) => {
      hknp.HP_Constraint_SetAxisMode(joint, a, mode.LIMITED);
      hknp.HP_Constraint_SetAxisMinLimit(joint, a, min);
      hknp.HP_Constraint_SetAxisMaxLimit(joint, a, max);
    };
    switch (type) {
      case 5 /* LOCK */:
        lock(axis.LINEAR_X);
        lock(axis.LINEAR_Y);
        lock(axis.LINEAR_Z);
        lock(axis.ANGULAR_X);
        lock(axis.ANGULAR_Y);
        lock(axis.ANGULAR_Z);
        break;
      case 2 /* DISTANCE */: {
        const d = options.maxDistance ?? 0;
        limit(axis.LINEAR_DISTANCE, d, d);
        break;
      }
      case 3 /* HINGE */:
        lock(axis.LINEAR_X);
        lock(axis.LINEAR_Y);
        lock(axis.LINEAR_Z);
        lock(axis.ANGULAR_Y);
        lock(axis.ANGULAR_Z);
        break;
      case 6 /* PRISMATIC */:
        lock(axis.LINEAR_Y);
        lock(axis.LINEAR_Z);
        lock(axis.ANGULAR_X);
        lock(axis.ANGULAR_Y);
        lock(axis.ANGULAR_Z);
        break;
      case 4 /* SLIDER */:
        lock(axis.LINEAR_Y);
        lock(axis.LINEAR_Z);
        lock(axis.ANGULAR_Y);
        lock(axis.ANGULAR_Z);
        break;
      case 1 /* BALL_AND_SOCKET */:
        lock(axis.LINEAR_X);
        lock(axis.LINEAR_Y);
        lock(axis.LINEAR_Z);
        break;
      case 7 /* SIX_DOF */:
        for (const l of limits) {
          const nativeAxis = constraintAxisToNative(axis, l.axis);
          if ((l.minLimit ?? -1) === 0 && (l.maxLimit ?? -1) === 0) {
            lock(nativeAxis);
          } else {
            if (l.minLimit !== void 0 || l.maxLimit !== void 0) {
              hknp.HP_Constraint_SetAxisMode(joint, nativeAxis, mode.LIMITED);
            }
            if (l.minLimit !== void 0) {
              hknp.HP_Constraint_SetAxisMinLimit(joint, nativeAxis, l.minLimit);
            }
            if (l.maxLimit !== void 0) {
              hknp.HP_Constraint_SetAxisMaxLimit(joint, nativeAxis, l.maxLimit);
            }
          }
          if (l.stiffness !== void 0) {
            hknp.HP_Constraint_SetAxisStiffness(joint, nativeAxis, l.stiffness);
          }
          if (l.damping !== void 0) {
            hknp.HP_Constraint_SetAxisDamping(joint, nativeAxis, l.damping);
          }
        }
        break;
    }
  }
  function constraintAxisToNative(axis, value) {
    switch (value) {
      case 0 /* LINEAR_X */:
        return axis.LINEAR_X;
      case 1 /* LINEAR_Y */:
        return axis.LINEAR_Y;
      case 2 /* LINEAR_Z */:
        return axis.LINEAR_Z;
      case 3 /* ANGULAR_X */:
        return axis.ANGULAR_X;
      case 4 /* ANGULAR_Y */:
        return axis.ANGULAR_Y;
      case 5 /* ANGULAR_Z */:
        return axis.ANGULAR_Z;
      case 6 /* LINEAR_DISTANCE */:
        return axis.LINEAR_DISTANCE;
    }
  }
  function isMesh(node) {
    return "_gpu" in node && "_cpuPositions" in node;
  }
  function transformPositionInto(dst, m, x, y, z) {
    dst.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
  }
  function createPhysicsShape(world, options) {
    const { _hknp: hknp } = world;
    const params = options.parameters ?? {};
    let hkShape;
    const primitiveShape = createPrimitivePhysicsShapeHandle(hknp, options.type, params);
    if (primitiveShape !== null) {
      return { _hkShape: primitiveShape, _type: options.type };
    }
    switch (options.type) {
      case 5 /* CONTAINER */: {
        hkShape = hknp.HP_Shape_CreateContainer()[1];
        break;
      }
      case 4 /* CONVEX_HULL */:
      case 6 /* MESH */: {
        if (!options.mesh) {
          throw new Error("Physics mesh shapes require a mesh or transform hierarchy.");
        }
        const collectIndices = options.type === 6 /* MESH */;
        const accum = new MeshAccumulator(collectIndices);
        accum.addNodeMeshes(options.mesh, options.includeChildMeshes ?? false);
        const positions = accum.getVertices(hknp);
        const numVec3s = positions.numObjects / 3;
        if (options.type === 4 /* CONVEX_HULL */) {
          hkShape = hknp.HP_Shape_CreateConvexHull(positions.offset, numVec3s)[1];
        } else {
          const triangles = accum.getTriangles(hknp);
          const numTriangles = triangles.numObjects / 3;
          hkShape = hknp.HP_Shape_CreateMesh(positions.offset, numVec3s, triangles.offset, numTriangles)[1];
          accum.freeBuffer(hknp, triangles);
        }
        accum.freeBuffer(hknp, positions);
        break;
      }
      default:
        throw new Error(`Unsupported shape type: ${options.type}`);
    }
    return { _hkShape: hkShape, _type: options.type };
  }
  function createPrimitivePhysicsShapeHandle(hknp, type, params) {
    switch (type) {
      case 0 /* SPHERE */: {
        const c = params.center ?? { x: 0, y: 0, z: 0 };
        const r = params.radius ?? 0.5;
        return hknp.HP_Shape_CreateSphere([c.x, c.y, c.z], r)[1];
      }
      case 3 /* BOX */: {
        const c = params.center ?? { x: 0, y: 0, z: 0 };
        const q = params.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
        const e = params.extents ?? { x: 1, y: 1, z: 1 };
        return hknp.HP_Shape_CreateBox([c.x, c.y, c.z], [q.x, q.y, q.z, q.w], [e.x, e.y, e.z])[1];
      }
      case 1 /* CAPSULE */: {
        const a = params.pointA ?? { x: 0, y: 0, z: 0 };
        const b = params.pointB ?? { x: 0, y: 1, z: 0 };
        const r = params.radius ?? 0.5;
        return hknp.HP_Shape_CreateCapsule([a.x, a.y, a.z], [b.x, b.y, b.z], r)[1];
      }
      case 2 /* CYLINDER */: {
        const a = params.pointA ?? { x: 0, y: 0, z: 0 };
        const b = params.pointB ?? { x: 0, y: 1, z: 0 };
        const r = params.radius ?? 0.5;
        return hknp.HP_Shape_CreateCylinder([a.x, a.y, a.z], [b.x, b.y, b.z], r)[1];
      }
      default:
        return null;
    }
  }
  function setPhysicsBodyShape(world, body, shape) {
    world._hknp.HP_Body_SetShape(body._hkBody, shape._hkShape);
    body._shape = shape;
  }
  function setPhysicsShapeMaterial(world, shape, friction, restitution) {
    const combines = world._hknp.MaterialCombine;
    const material = [friction, friction, restitution, combines.MINIMUM, combines.MAXIMUM];
    world._hknp.HP_Shape_SetMaterial(shape._hkShape, material);
  }
  function setPhysicsBodyMass(world, body, mass, centerOfMass) {
    const massProps = body._shape ? buildMassProperties(world, body) : [[0, 0, 0], mass, [mass, mass, mass], [0, 0, 0, 1]];
    massProps[1] = mass;
    if (centerOfMass) {
      massProps[0] = [centerOfMass.x, centerOfMass.y, centerOfMass.z];
    }
    world._hknp.HP_Body_SetMassProperties(body._hkBody, massProps);
  }
  function setPhysicsBodyMassProperties(world, body, properties) {
    const massProps = buildMassProperties(world, body);
    if (properties.centerOfMass) {
      massProps[0] = [properties.centerOfMass.x, properties.centerOfMass.y, properties.centerOfMass.z];
    }
    if (properties.mass !== void 0) {
      massProps[1] = properties.mass;
    }
    if (properties.inertia) {
      massProps[2] = [properties.inertia.x, properties.inertia.y, properties.inertia.z];
    }
    if (properties.inertiaOrientation) {
      massProps[3] = [properties.inertiaOrientation.x, properties.inertiaOrientation.y, properties.inertiaOrientation.z, properties.inertiaOrientation.w];
    }
    world._hknp.HP_Body_SetMassProperties(body._hkBody, massProps);
  }
  function buildMassProperties(world, body) {
    const hknp = world._hknp;
    const ok = hknp.Result?.RESULT_OK ?? 0;
    const shape = hknp.HP_Body_GetShape(body._hkBody);
    if (shape[0] === ok) {
      const shapeMass = hknp.HP_Shape_BuildMassProperties(shape[1]);
      if (shapeMass[0] === ok) {
        return shapeMass[1];
      }
    }
    return [[0, 0, 0], 1, [1, 1, 1], [0, 0, 0, 1]];
  }
  function removePhysicsBody(world, body) {
    const { _hknp: hknp, _hkWorld: hkWorld, _bodies: bodies } = world;
    const i = bodies.indexOf(body);
    if (i < 0) {
      return;
    }
    bodies.splice(i, 1);
    hknp.HP_World_RemoveBody(hkWorld, body._hkBody);
    hknp.HP_Body_Release(body._hkBody);
  }
  function createPhysicsAggregate(world, node, type, options) {
    const motionType = options.mass === 0 ? 0 /* STATIC */ : 2 /* DYNAMIC */;
    let shape = options.shape;
    if (!shape) {
      const shapeParams = _buildShapeParams(node, type, options);
      const hkShape = createPrimitivePhysicsShapeHandle(world._hknp, type, shapeParams);
      if (hkShape === null) {
        throw new Error("createPhysicsAggregate supports only primitive physics shapes.");
      }
      shape = { _hkShape: hkShape, _type: type };
    }
    const body = createPhysicsBody(world, node, motionType, options.startAsleep);
    setPhysicsBodyShape(world, body, shape);
    const friction = options.friction ?? 0.2;
    const restitution = options.restitution ?? 0.2;
    setPhysicsShapeMaterial(world, shape, friction, restitution);
    if (options.mass > 0) {
      setPhysicsBodyMass(world, body, options.mass);
    }
    return { body, shape };
  }
  function _buildShapeParams(node, type, options) {
    const params = {};
    if (options.center) {
      params.center = options.center;
    }
    if (options.rotation) {
      params.rotation = options.rotation;
    }
    switch (type) {
      case 0 /* SPHERE */: {
        params.radius = options.radius ?? _boundingRadius(node);
        params.center = params.center ?? _boundingCenter(node);
        break;
      }
      case 3 /* BOX */: {
        params.extents = options.extents ?? _boundingExtents(node);
        params.center = params.center ?? _boundingCenter(node);
        break;
      }
      case 1 /* CAPSULE */:
      case 2 /* CYLINDER */: {
        params.radius = options.radius ?? _boundingRadius(node);
        params.pointA = options.pointA ?? { x: 0, y: 0, z: 0 };
        params.pointB = options.pointB ?? { x: 0, y: 1, z: 0 };
        break;
      }
    }
    return params;
  }
  function _boundingCenter(mesh) {
    if (mesh.boundMin && mesh.boundMax) {
      return {
        x: (mesh.boundMin[0] + mesh.boundMax[0]) * 0.5,
        y: (mesh.boundMin[1] + mesh.boundMax[1]) * 0.5,
        z: (mesh.boundMin[2] + mesh.boundMax[2]) * 0.5
      };
    }
    return { x: 0, y: 0, z: 0 };
  }
  function _boundingExtents(mesh) {
    if (mesh.boundMin && mesh.boundMax) {
      return {
        x: mesh.boundMax[0] - mesh.boundMin[0],
        y: mesh.boundMax[1] - mesh.boundMin[1],
        z: mesh.boundMax[2] - mesh.boundMin[2]
      };
    }
    return { x: 1, y: 1, z: 1 };
  }
  function _boundingRadius(mesh) {
    if (mesh.boundMin && mesh.boundMax) {
      const dx = mesh.boundMax[0] - mesh.boundMin[0];
      const dy = mesh.boundMax[1] - mesh.boundMin[1];
      const dz = mesh.boundMax[2] - mesh.boundMin[2];
      return Math.max(dx, dy, dz) * 0.5;
    }
    return 0.5;
  }
  var ZERO_VEC3, X_AXIS, MeshAccumulator;
  var init_havok = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/physics/havok.ts"() {
      "use strict";
      init_scene_core();
      init_mat4_invert();
      init_mat4_multiply();
      init_mat4_scale();
      ZERO_VEC3 = { x: 0, y: 0, z: 0 };
      X_AXIS = { x: 1, y: 0, z: 0 };
      MeshAccumulator = class {
        constructor(collectIndices) {
          __publicField(this, "_vertices", []);
          __publicField(this, "_indices", []);
          __publicField(this, "_collectIndices");
          this._collectIndices = collectIndices;
        }
        addNodeMeshes(root, includeChildren) {
          const invRoot = mat4Invert(root.worldMatrix);
          if (!invRoot) {
            throw new Error("Cannot create physics mesh shape from a singular root transform.");
          }
          const rootScale = mat4Scale(root.scaling.x, root.scaling.y, root.scaling.z);
          const rootToBody = mat4Multiply(rootScale, invRoot);
          this._addNodeMesh(root, rootToBody);
          if (includeChildren) {
            for (const child of root.children) {
              this._addDescendantMeshes(child, rootToBody);
            }
          }
          if (this._vertices.length === 0) {
            throw new Error("Cannot create physics mesh shape without vertex positions.");
          }
          if (this._collectIndices && this._indices.length === 0) {
            throw new Error("Cannot create physics mesh shape without triangle indices.");
          }
        }
        getVertices(hknp) {
          const numObjects = this._vertices.length;
          const offset = hknp._malloc(numObjects * 4);
          new Float32Array(hknp.HEAPU8.buffer, offset, numObjects).set(this._vertices);
          return { offset, numObjects };
        }
        getTriangles(hknp) {
          const numObjects = this._indices.length;
          const offset = hknp._malloc(numObjects * 4);
          new Int32Array(hknp.HEAPU8.buffer, offset, numObjects).set(this._indices);
          return { offset, numObjects };
        }
        freeBuffer(hknp, buffer) {
          hknp._free(buffer.offset);
        }
        _addDescendantMeshes(node, rootToBody) {
          this._addNodeMesh(node, rootToBody);
          for (const child of node.children) {
            this._addDescendantMeshes(child, rootToBody);
          }
        }
        _addNodeMesh(node, rootToBody) {
          if (!isMesh(node)) {
            return;
          }
          const positions = node._cpuPositions;
          if (!positions || positions.length === 0) {
            return;
          }
          const meshToBody = mat4Multiply(rootToBody, node.worldMatrix);
          const indexOffset = this._vertices.length / 3;
          for (let i = 0; i < positions.length; i += 3) {
            transformPositionInto(this._vertices, meshToBody, positions[i], positions[i + 1], positions[i + 2]);
          }
          if (!this._collectIndices) {
            return;
          }
          const indices = node._cpuIndices;
          if (!indices) {
            return;
          }
          for (let i = 0; i < indices.length; i += 3) {
            const a = indices[i] + indexOffset;
            const b = indices[i + 1] + indexOffset;
            const c = indices[i + 2] + indexOffset;
            this._indices.push(c, b, a);
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/node_modules/.pnpm/@babylonjs+havok@1.3.12/node_modules/@babylonjs/havok/lib/esm/HavokPhysics_es.js
  var HavokPhysics = /* @__PURE__ */ (() => {
    var _scriptName = "file:///app/";
    return function(moduleArg = {}) {
      var moduleRtn;
      var Module = moduleArg;
      var readyPromiseResolve, readyPromiseReject;
      var readyPromise = new Promise((resolve, reject) => {
        readyPromiseResolve = resolve;
        readyPromiseReject = reject;
      });
      var ENVIRONMENT_IS_WEB = true;
      var ENVIRONMENT_IS_WORKER = false;
      var moduleOverrides = Object.assign({}, Module);
      var arguments_ = [];
      var thisProgram = "./this.program";
      var quit_ = (status, toThrow) => {
        throw toThrow;
      };
      var scriptDirectory = "";
      function locateFile(path) {
        if (Module["locateFile"]) {
          return Module["locateFile"](path, scriptDirectory);
        }
        return scriptDirectory + path;
      }
      var readAsync, readBinary;
      if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
        if (ENVIRONMENT_IS_WORKER) {
          scriptDirectory = self.location.href;
        } else if (typeof document != "undefined" && document.currentScript) {
          scriptDirectory = document.currentScript.src;
        }
        if (_scriptName) {
          scriptDirectory = _scriptName;
        }
        if (scriptDirectory.startsWith("blob:")) {
          scriptDirectory = "";
        } else {
          scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
        }
        {
          readAsync = (url) => fetch(url, { credentials: "same-origin" }).then((response) => {
            if (response.ok) {
              return response.arrayBuffer();
            }
            return Promise.reject(new Error(response.status + " : " + response.url));
          });
        }
      } else {
      }
      var out = Module["print"] || console.log.bind(console);
      var err = Module["printErr"] || console.error.bind(console);
      Object.assign(Module, moduleOverrides);
      moduleOverrides = null;
      if (Module["arguments"]) arguments_ = Module["arguments"];
      if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
      var wasmBinary = Module["wasmBinary"];
      var wasmMemory;
      var ABORT = false;
      var EXITSTATUS;
      var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAP64, HEAPU64, HEAPF64;
      function updateMemoryViews() {
        var b = wasmMemory.buffer;
        Module["HEAP8"] = HEAP8 = new Int8Array(b);
        Module["HEAP16"] = HEAP16 = new Int16Array(b);
        Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
        Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
        Module["HEAP32"] = HEAP32 = new Int32Array(b);
        Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
        Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
        Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
        Module["HEAP64"] = HEAP64 = new BigInt64Array(b);
        Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
      }
      var __ATPRERUN__ = [];
      var __ATINIT__ = [];
      var __ATMAIN__ = [];
      var __ATPOSTRUN__ = [];
      var runtimeInitialized = false;
      function preRun() {
        var preRuns = Module["preRun"];
        if (preRuns) {
          if (typeof preRuns == "function") preRuns = [preRuns];
          preRuns.forEach(addOnPreRun);
        }
        callRuntimeCallbacks(__ATPRERUN__);
      }
      function initRuntime() {
        runtimeInitialized = true;
        callRuntimeCallbacks(__ATINIT__);
      }
      function preMain() {
        callRuntimeCallbacks(__ATMAIN__);
      }
      function postRun() {
        var postRuns = Module["postRun"];
        if (postRuns) {
          if (typeof postRuns == "function") postRuns = [postRuns];
          postRuns.forEach(addOnPostRun);
        }
        callRuntimeCallbacks(__ATPOSTRUN__);
      }
      function addOnPreRun(cb) {
        __ATPRERUN__.unshift(cb);
      }
      function addOnInit(cb) {
        __ATINIT__.unshift(cb);
      }
      function addOnPostRun(cb) {
        __ATPOSTRUN__.unshift(cb);
      }
      var runDependencies = 0;
      var runDependencyWatcher = null;
      var dependenciesFulfilled = null;
      function addRunDependency(id) {
        runDependencies++;
        Module["monitorRunDependencies"]?.(runDependencies);
      }
      function removeRunDependency(id) {
        runDependencies--;
        Module["monitorRunDependencies"]?.(runDependencies);
        if (runDependencies == 0) {
          if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
          }
          if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback();
          }
        }
      }
      function abort(what) {
        Module["onAbort"]?.(what);
        what = "Aborted(" + what + ")";
        err(what);
        ABORT = true;
        what += ". Build with -sASSERTIONS for more info.";
        var e = new WebAssembly.RuntimeError(what);
        readyPromiseReject(e);
        throw e;
      }
      var dataURIPrefix = "data:application/octet-stream;base64,";
      var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
      function findWasmBinary() {
        if (Module["locateFile"]) {
          var f = "HavokPhysics.wasm";
          if (!isDataURI(f)) {
            return locateFile(f);
          }
          return f;
        }
        return new URL("HavokPhysics.wasm", "file:///app/").href;
      }
      var wasmBinaryFile;
      function getBinarySync(file) {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) {
          return readBinary(file);
        }
        throw "both async and sync fetching of the wasm failed";
      }
      function getBinaryPromise(binaryFile) {
        if (!wasmBinary) {
          return readAsync(binaryFile).then((response) => new Uint8Array(response), () => getBinarySync(binaryFile));
        }
        return Promise.resolve().then(() => getBinarySync(binaryFile));
      }
      function instantiateArrayBuffer(binaryFile, imports, receiver) {
        return getBinaryPromise(binaryFile).then((binary) => WebAssembly.instantiate(binary, imports)).then(receiver, (reason) => {
          err(`failed to asynchronously prepare wasm: ${reason}`);
          abort(reason);
        });
      }
      function instantiateAsync(binary, binaryFile, imports, callback) {
        if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && typeof fetch == "function") {
          return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
            var result = WebAssembly.instantiateStreaming(response, imports);
            return result.then(callback, function(reason) {
              err(`wasm streaming compile failed: ${reason}`);
              err("falling back to ArrayBuffer instantiation");
              return instantiateArrayBuffer(binaryFile, imports, callback);
            });
          });
        }
        return instantiateArrayBuffer(binaryFile, imports, callback);
      }
      function getWasmImports() {
        return { env: wasmImports, wasi_snapshot_preview1: wasmImports };
      }
      function createWasm() {
        var info = getWasmImports();
        function receiveInstance(instance, module) {
          wasmExports = instance.exports;
          wasmMemory = wasmExports["memory"];
          updateMemoryViews();
          wasmTable = wasmExports["__indirect_function_table"];
          addOnInit(wasmExports["__wasm_call_ctors"]);
          removeRunDependency("wasm-instantiate");
          return wasmExports;
        }
        addRunDependency("wasm-instantiate");
        function receiveInstantiationResult(result) {
          receiveInstance(result["instance"]);
        }
        if (Module["instantiateWasm"]) {
          try {
            return Module["instantiateWasm"](info, receiveInstance);
          } catch (e) {
            err(`Module.instantiateWasm callback failed with error: ${e}`);
            readyPromiseReject(e);
          }
        }
        wasmBinaryFile ?? (wasmBinaryFile = findWasmBinary());
        instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
        return {};
      }
      function ExitStatus(status) {
        this.name = "ExitStatus";
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
      var callRuntimeCallbacks = (callbacks) => {
        callbacks.forEach((f) => f(Module));
      };
      var noExitRuntime = Module["noExitRuntime"] || true;
      var __abort_js = () => {
        abort("");
      };
      var tupleRegistrations = {};
      var runDestructors = (destructors) => {
        while (destructors.length) {
          var ptr = destructors.pop();
          var del = destructors.pop();
          del(ptr);
        }
      };
      function readPointer(pointer) {
        return this["fromWireType"](HEAPU32[pointer >> 2]);
      }
      var awaitingDependencies = {};
      var registeredTypes = {};
      var typeDependencies = {};
      var InternalError;
      var throwInternalError = (message) => {
        throw new InternalError(message);
      };
      var whenDependentTypesAreResolved = (myTypes, dependentTypes, getTypeConverters) => {
        myTypes.forEach((type) => typeDependencies[type] = dependentTypes);
        function onComplete(typeConverters2) {
          var myTypeConverters = getTypeConverters(typeConverters2);
          if (myTypeConverters.length !== myTypes.length) {
            throwInternalError("Mismatched type converter count");
          }
          for (var i = 0; i < myTypes.length; ++i) {
            registerType(myTypes[i], myTypeConverters[i]);
          }
        }
        var typeConverters = new Array(dependentTypes.length);
        var unregisteredTypes = [];
        var registered = 0;
        dependentTypes.forEach((dt, i) => {
          if (registeredTypes.hasOwnProperty(dt)) {
            typeConverters[i] = registeredTypes[dt];
          } else {
            unregisteredTypes.push(dt);
            if (!awaitingDependencies.hasOwnProperty(dt)) {
              awaitingDependencies[dt] = [];
            }
            awaitingDependencies[dt].push(() => {
              typeConverters[i] = registeredTypes[dt];
              ++registered;
              if (registered === unregisteredTypes.length) {
                onComplete(typeConverters);
              }
            });
          }
        });
        if (0 === unregisteredTypes.length) {
          onComplete(typeConverters);
        }
      };
      var __embind_finalize_value_array = (rawTupleType) => {
        var reg = tupleRegistrations[rawTupleType];
        delete tupleRegistrations[rawTupleType];
        var elements = reg.elements;
        var elementsLength = elements.length;
        var elementTypes = elements.map((elt) => elt.getterReturnType).concat(elements.map((elt) => elt.setterArgumentType));
        var rawConstructor = reg.rawConstructor;
        var rawDestructor = reg.rawDestructor;
        whenDependentTypesAreResolved([rawTupleType], elementTypes, (elementTypes2) => {
          elements.forEach((elt, i) => {
            var getterReturnType = elementTypes2[i];
            var getter = elt.getter;
            var getterContext = elt.getterContext;
            var setterArgumentType = elementTypes2[i + elementsLength];
            var setter = elt.setter;
            var setterContext = elt.setterContext;
            elt.read = (ptr) => getterReturnType["fromWireType"](getter(getterContext, ptr));
            elt.write = (ptr, o) => {
              var destructors = [];
              setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
              runDestructors(destructors);
            };
          });
          return [{ name: reg.name, fromWireType: (ptr) => {
            var rv = new Array(elementsLength);
            for (var i = 0; i < elementsLength; ++i) {
              rv[i] = elements[i].read(ptr);
            }
            rawDestructor(ptr);
            return rv;
          }, toWireType: (destructors, o) => {
            if (elementsLength !== o.length) {
              throw new TypeError(`Incorrect number of tuple elements for ${reg.name}: expected=${elementsLength}, actual=${o.length}`);
            }
            var ptr = rawConstructor();
            for (var i = 0; i < elementsLength; ++i) {
              elements[i].write(ptr, o[i]);
            }
            if (destructors !== null) {
              destructors.push(rawDestructor, ptr);
            }
            return ptr;
          }, argPackAdvance: GenericWireTypeSize, readValueFromPointer: readPointer, destructorFunction: rawDestructor }];
        });
      };
      var embindRepr = (v2) => {
        if (v2 === null) {
          return "null";
        }
        var t = typeof v2;
        if (t === "object" || t === "array" || t === "function") {
          return v2.toString();
        } else {
          return "" + v2;
        }
      };
      var embind_init_charCodes = () => {
        var codes = new Array(256);
        for (var i = 0; i < 256; ++i) {
          codes[i] = String.fromCharCode(i);
        }
        embind_charCodes = codes;
      };
      var embind_charCodes;
      var readLatin1String = (ptr) => {
        var ret = "";
        var c = ptr;
        while (HEAPU8[c]) {
          ret += embind_charCodes[HEAPU8[c++]];
        }
        return ret;
      };
      var BindingError;
      var throwBindingError = (message) => {
        throw new BindingError(message);
      };
      function sharedRegisterType(rawType, registeredInstance, options = {}) {
        var name = registeredInstance.name;
        if (!rawType) {
          throwBindingError(`type "${name}" must have a positive integer typeid pointer`);
        }
        if (registeredTypes.hasOwnProperty(rawType)) {
          if (options.ignoreDuplicateRegistrations) {
            return;
          } else {
            throwBindingError(`Cannot register type '${name}' twice`);
          }
        }
        registeredTypes[rawType] = registeredInstance;
        delete typeDependencies[rawType];
        if (awaitingDependencies.hasOwnProperty(rawType)) {
          var callbacks = awaitingDependencies[rawType];
          delete awaitingDependencies[rawType];
          callbacks.forEach((cb) => cb());
        }
      }
      function registerType(rawType, registeredInstance, options = {}) {
        return sharedRegisterType(rawType, registeredInstance, options);
      }
      var integerReadValueFromPointer = (name, width, signed) => {
        switch (width) {
          case 1:
            return signed ? (pointer) => HEAP8[pointer] : (pointer) => HEAPU8[pointer];
          case 2:
            return signed ? (pointer) => HEAP16[pointer >> 1] : (pointer) => HEAPU16[pointer >> 1];
          case 4:
            return signed ? (pointer) => HEAP32[pointer >> 2] : (pointer) => HEAPU32[pointer >> 2];
          case 8:
            return signed ? (pointer) => HEAP64[pointer >> 3] : (pointer) => HEAPU64[pointer >> 3];
          default:
            throw new TypeError(`invalid integer width (${width}): ${name}`);
        }
      };
      var __embind_register_bigint = (primitiveType, name, size, minRange, maxRange) => {
        name = readLatin1String(name);
        var isUnsignedType = name.indexOf("u") != -1;
        if (isUnsignedType) {
          maxRange = (1n << 64n) - 1n;
        }
        registerType(primitiveType, { name, fromWireType: (value) => value, toWireType: function(destructors, value) {
          if (typeof value != "bigint" && typeof value != "number") {
            throw new TypeError(`Cannot convert "${embindRepr(value)}" to ${this.name}`);
          }
          if (typeof value == "number") {
            value = BigInt(value);
          }
          return value;
        }, argPackAdvance: GenericWireTypeSize, readValueFromPointer: integerReadValueFromPointer(name, size, !isUnsignedType), destructorFunction: null });
      };
      var GenericWireTypeSize = 8;
      var __embind_register_bool = (rawType, name, trueValue, falseValue) => {
        name = readLatin1String(name);
        registerType(rawType, { name, fromWireType: function(wt) {
          return !!wt;
        }, toWireType: function(destructors, o) {
          return o ? trueValue : falseValue;
        }, argPackAdvance: GenericWireTypeSize, readValueFromPointer: function(pointer) {
          return this["fromWireType"](HEAPU8[pointer]);
        }, destructorFunction: null });
      };
      var emval_freelist = [];
      var emval_handles = [];
      var __emval_decref = (handle) => {
        if (handle > 9 && 0 === --emval_handles[handle + 1]) {
          emval_handles[handle] = void 0;
          emval_freelist.push(handle);
        }
      };
      var count_emval_handles = () => emval_handles.length / 2 - 5 - emval_freelist.length;
      var init_emval = () => {
        emval_handles.push(0, 1, void 0, 1, null, 1, true, 1, false, 1);
        Module["count_emval_handles"] = count_emval_handles;
      };
      var Emval = { toValue: (handle) => {
        if (!handle) {
          throwBindingError("Cannot use deleted val. handle = " + handle);
        }
        return emval_handles[handle];
      }, toHandle: (value) => {
        switch (value) {
          case void 0:
            return 2;
          case null:
            return 4;
          case true:
            return 6;
          case false:
            return 8;
          default: {
            const handle = emval_freelist.pop() || emval_handles.length;
            emval_handles[handle] = value;
            emval_handles[handle + 1] = 1;
            return handle;
          }
        }
      } };
      var EmValType = { name: "emscripten::val", fromWireType: (handle) => {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv;
      }, toWireType: (destructors, value) => Emval.toHandle(value), argPackAdvance: GenericWireTypeSize, readValueFromPointer: readPointer, destructorFunction: null };
      var __embind_register_emval = (rawType) => registerType(rawType, EmValType);
      var ensureOverloadTable = (proto, methodName, humanName) => {
        if (void 0 === proto[methodName].overloadTable) {
          var prevFunc = proto[methodName];
          proto[methodName] = function(...args) {
            if (!proto[methodName].overloadTable.hasOwnProperty(args.length)) {
              throwBindingError(`Function '${humanName}' called with an invalid number of arguments (${args.length}) - expects one of (${proto[methodName].overloadTable})!`);
            }
            return proto[methodName].overloadTable[args.length].apply(this, args);
          };
          proto[methodName].overloadTable = [];
          proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
        }
      };
      var exposePublicSymbol = (name, value, numArguments) => {
        if (Module.hasOwnProperty(name)) {
          if (void 0 === numArguments || void 0 !== Module[name].overloadTable && void 0 !== Module[name].overloadTable[numArguments]) {
            throwBindingError(`Cannot register public name '${name}' twice`);
          }
          ensureOverloadTable(Module, name, name);
          if (Module[name].overloadTable.hasOwnProperty(numArguments)) {
            throwBindingError(`Cannot register multiple overloads of a function with the same number of arguments (${numArguments})!`);
          }
          Module[name].overloadTable[numArguments] = value;
        } else {
          Module[name] = value;
          Module[name].argCount = numArguments;
        }
      };
      var enumReadValueFromPointer = (name, width, signed) => {
        switch (width) {
          case 1:
            return signed ? function(pointer) {
              return this["fromWireType"](HEAP8[pointer]);
            } : function(pointer) {
              return this["fromWireType"](HEAPU8[pointer]);
            };
          case 2:
            return signed ? function(pointer) {
              return this["fromWireType"](HEAP16[pointer >> 1]);
            } : function(pointer) {
              return this["fromWireType"](HEAPU16[pointer >> 1]);
            };
          case 4:
            return signed ? function(pointer) {
              return this["fromWireType"](HEAP32[pointer >> 2]);
            } : function(pointer) {
              return this["fromWireType"](HEAPU32[pointer >> 2]);
            };
          default:
            throw new TypeError(`invalid integer width (${width}): ${name}`);
        }
      };
      var __embind_register_enum = (rawType, name, size, isSigned) => {
        name = readLatin1String(name);
        function ctor() {
        }
        ctor.values = {};
        registerType(rawType, { name, constructor: ctor, fromWireType: function(c) {
          return this.constructor.values[c];
        }, toWireType: (destructors, c) => c.value, argPackAdvance: GenericWireTypeSize, readValueFromPointer: enumReadValueFromPointer(name, size, isSigned), destructorFunction: null });
        exposePublicSymbol(name, ctor);
      };
      var createNamedFunction = (name, body) => Object.defineProperty(body, "name", { value: name });
      var getTypeName = (type) => {
        var ptr = ___getTypeName(type);
        var rv = readLatin1String(ptr);
        _free(ptr);
        return rv;
      };
      var requireRegisteredType = (rawType, humanName) => {
        var impl = registeredTypes[rawType];
        if (void 0 === impl) {
          throwBindingError(`${humanName} has unknown type ${getTypeName(rawType)}`);
        }
        return impl;
      };
      var __embind_register_enum_value = (rawEnumType, name, enumValue) => {
        var enumType = requireRegisteredType(rawEnumType, "enum");
        name = readLatin1String(name);
        var Enum = enumType.constructor;
        var Value = Object.create(enumType.constructor.prototype, { value: { value: enumValue }, constructor: { value: createNamedFunction(`${enumType.name}_${name}`, function() {
        }) } });
        Enum.values[enumValue] = Value;
        Enum[name] = Value;
      };
      var floatReadValueFromPointer = (name, width) => {
        switch (width) {
          case 4:
            return function(pointer) {
              return this["fromWireType"](HEAPF32[pointer >> 2]);
            };
          case 8:
            return function(pointer) {
              return this["fromWireType"](HEAPF64[pointer >> 3]);
            };
          default:
            throw new TypeError(`invalid float width (${width}): ${name}`);
        }
      };
      var __embind_register_float = (rawType, name, size) => {
        name = readLatin1String(name);
        registerType(rawType, { name, fromWireType: (value) => value, toWireType: (destructors, value) => value, argPackAdvance: GenericWireTypeSize, readValueFromPointer: floatReadValueFromPointer(name, size), destructorFunction: null });
      };
      function usesDestructorStack(argTypes) {
        for (var i = 1; i < argTypes.length; ++i) {
          if (argTypes[i] !== null && argTypes[i].destructorFunction === void 0) {
            return true;
          }
        }
        return false;
      }
      var InvokerFunctions = { ftf: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam) {
        return function() {
          var rv = invoker(fn);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftfn: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0) {
        return function(arg0) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var rv = invoker(fn, arg0Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, fffn: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0) {
        return function(arg0) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          invoker(fn, arg0Wired);
        };
      }, ftfnnnn: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1, argType2, argType3) {
        return function(arg0, arg1, arg2, arg3) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var arg2Wired = argType2["toWireType"](null, arg2);
          var arg3Wired = argType3["toWireType"](null, arg3);
          var rv = invoker(fn, arg0Wired, arg1Wired, arg2Wired, arg3Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftfnn: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1) {
        return function(arg0, arg1) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var rv = invoker(fn, arg0Wired, arg1Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftftt: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1, arg0Wired_dtor, arg1Wired_dtor) {
        return function(arg0, arg1) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var rv = invoker(fn, arg0Wired, arg1Wired);
          arg0Wired_dtor(arg0Wired);
          arg1Wired_dtor(arg1Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftft: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, arg0Wired_dtor) {
        return function(arg0) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var rv = invoker(fn, arg0Wired);
          arg0Wired_dtor(arg0Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftftn: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1, arg0Wired_dtor) {
        return function(arg0, arg1) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var rv = invoker(fn, arg0Wired, arg1Wired);
          arg0Wired_dtor(arg0Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftftnn: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1, argType2, arg0Wired_dtor) {
        return function(arg0, arg1, arg2) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var arg2Wired = argType2["toWireType"](null, arg2);
          var rv = invoker(fn, arg0Wired, arg1Wired, arg2Wired);
          arg0Wired_dtor(arg0Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftfttn: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1, argType2, arg0Wired_dtor, arg1Wired_dtor) {
        return function(arg0, arg1, arg2) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var arg2Wired = argType2["toWireType"](null, arg2);
          var rv = invoker(fn, arg0Wired, arg1Wired, arg2Wired);
          arg0Wired_dtor(arg0Wired);
          arg1Wired_dtor(arg1Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftfttt: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1, argType2, arg0Wired_dtor, arg1Wired_dtor, arg2Wired_dtor) {
        return function(arg0, arg1, arg2) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var arg2Wired = argType2["toWireType"](null, arg2);
          var rv = invoker(fn, arg0Wired, arg1Wired, arg2Wired);
          arg0Wired_dtor(arg0Wired);
          arg1Wired_dtor(arg1Wired);
          arg2Wired_dtor(arg2Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftfnntn: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1, argType2, argType3, arg2Wired_dtor) {
        return function(arg0, arg1, arg2, arg3) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var arg2Wired = argType2["toWireType"](null, arg2);
          var arg3Wired = argType3["toWireType"](null, arg3);
          var rv = invoker(fn, arg0Wired, arg1Wired, arg2Wired, arg3Wired);
          arg2Wired_dtor(arg2Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      }, ftftttt: function(humanName, throwBindingError2, invoker, fn, runDestructors2, retType, classParam, argType0, argType1, argType2, argType3, arg0Wired_dtor, arg1Wired_dtor, arg2Wired_dtor, arg3Wired_dtor) {
        return function(arg0, arg1, arg2, arg3) {
          var arg0Wired = argType0["toWireType"](null, arg0);
          var arg1Wired = argType1["toWireType"](null, arg1);
          var arg2Wired = argType2["toWireType"](null, arg2);
          var arg3Wired = argType3["toWireType"](null, arg3);
          var rv = invoker(fn, arg0Wired, arg1Wired, arg2Wired, arg3Wired);
          arg0Wired_dtor(arg0Wired);
          arg1Wired_dtor(arg1Wired);
          arg2Wired_dtor(arg2Wired);
          arg3Wired_dtor(arg3Wired);
          var ret = retType["fromWireType"](rv);
          return ret;
        };
      } };
      function createJsInvokerSignature(argTypes, isClassMethodFunc, returns, isAsync) {
        const signature = [isClassMethodFunc ? "t" : "f", returns ? "t" : "f", isAsync ? "t" : "f"];
        for (let i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
          const arg = argTypes[i];
          let destructorSig = "";
          if (arg.destructorFunction === void 0) {
            destructorSig = "u";
          } else if (arg.destructorFunction === null) {
            destructorSig = "n";
          } else {
            destructorSig = "t";
          }
          signature.push(destructorSig);
        }
        return signature.join("");
      }
      function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, isAsync) {
        var argCount = argTypes.length;
        if (argCount < 2) {
          throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
        }
        var isClassMethodFunc = argTypes[1] !== null && classType !== null;
        var needsDestructorStack = usesDestructorStack(argTypes);
        var returns = argTypes[0].name !== "void";
        var closureArgs = [humanName, throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
        for (var i = 0; i < argCount - 2; ++i) {
          closureArgs.push(argTypes[i + 2]);
        }
        if (!needsDestructorStack) {
          for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
            if (argTypes[i].destructorFunction !== null) {
              closureArgs.push(argTypes[i].destructorFunction);
            }
          }
        }
        var signature = createJsInvokerSignature(argTypes, isClassMethodFunc, returns, isAsync);
        var invokerFn = InvokerFunctions[signature](...closureArgs);
        return createNamedFunction(humanName, invokerFn);
      }
      var heap32VectorToArray = (count, firstElement) => {
        var array = [];
        for (var i = 0; i < count; i++) {
          array.push(HEAPU32[firstElement + i * 4 >> 2]);
        }
        return array;
      };
      var replacePublicSymbol = (name, value, numArguments) => {
        if (!Module.hasOwnProperty(name)) {
          throwInternalError("Replacing nonexistent public symbol");
        }
        if (void 0 !== Module[name].overloadTable && void 0 !== numArguments) {
          Module[name].overloadTable[numArguments] = value;
        } else {
          Module[name] = value;
          Module[name].argCount = numArguments;
        }
      };
      var wasmTableMirror = [];
      var wasmTable;
      var getWasmTableEntry = (funcPtr) => {
        var func = wasmTableMirror[funcPtr];
        if (!func) {
          if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
          wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
        }
        return func;
      };
      var embind__requireFunction = (signature, rawFunction) => {
        signature = readLatin1String(signature);
        function makeDynCaller() {
          return getWasmTableEntry(rawFunction);
        }
        var fp = makeDynCaller();
        if (typeof fp != "function") {
          throwBindingError(`unknown function pointer with signature ${signature}: ${rawFunction}`);
        }
        return fp;
      };
      var extendError = (baseErrorType, errorName) => {
        var errorClass = createNamedFunction(errorName, function(message) {
          this.name = errorName;
          this.message = message;
          var stack = new Error(message).stack;
          if (stack !== void 0) {
            this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
          }
        });
        errorClass.prototype = Object.create(baseErrorType.prototype);
        errorClass.prototype.constructor = errorClass;
        errorClass.prototype.toString = function() {
          if (this.message === void 0) {
            return this.name;
          } else {
            return `${this.name}: ${this.message}`;
          }
        };
        return errorClass;
      };
      var UnboundTypeError;
      var throwUnboundTypeError = (message, types) => {
        var unboundTypes = [];
        var seen = {};
        function visit(type) {
          if (seen[type]) {
            return;
          }
          if (registeredTypes[type]) {
            return;
          }
          if (typeDependencies[type]) {
            typeDependencies[type].forEach(visit);
            return;
          }
          unboundTypes.push(type);
          seen[type] = true;
        }
        types.forEach(visit);
        throw new UnboundTypeError(`${message}: ` + unboundTypes.map(getTypeName).join([", "]));
      };
      var getFunctionName = (signature) => {
        signature = signature.trim();
        const argsIndex = signature.indexOf("(");
        if (argsIndex !== -1) {
          return signature.substr(0, argsIndex);
        } else {
          return signature;
        }
      };
      var __embind_register_function = (name, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync, isNonnullReturn) => {
        var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
        name = readLatin1String(name);
        name = getFunctionName(name);
        rawInvoker = embind__requireFunction(signature, rawInvoker);
        exposePublicSymbol(name, function() {
          throwUnboundTypeError(`Cannot call ${name} due to unbound types`, argTypes);
        }, argCount - 1);
        whenDependentTypesAreResolved([], argTypes, (argTypes2) => {
          var invokerArgsArray = [argTypes2[0], null].concat(argTypes2.slice(1));
          replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn, isAsync), argCount - 1);
          return [];
        });
      };
      var __embind_register_integer = (primitiveType, name, size, minRange, maxRange) => {
        name = readLatin1String(name);
        if (maxRange === -1) {
          maxRange = 4294967295;
        }
        var fromWireType = (value) => value;
        if (minRange === 0) {
          var bitshift = 32 - 8 * size;
          fromWireType = (value) => value << bitshift >>> bitshift;
        }
        var isUnsignedType = name.includes("unsigned");
        var checkAssertions = (value, toTypeName) => {
        };
        var toWireType;
        if (isUnsignedType) {
          toWireType = function(destructors, value) {
            checkAssertions(value, this.name);
            return value >>> 0;
          };
        } else {
          toWireType = function(destructors, value) {
            checkAssertions(value, this.name);
            return value;
          };
        }
        registerType(primitiveType, { name, fromWireType, toWireType, argPackAdvance: GenericWireTypeSize, readValueFromPointer: integerReadValueFromPointer(name, size, minRange !== 0), destructorFunction: null });
      };
      var __embind_register_memory_view = (rawType, dataTypeIndex, name) => {
        var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array];
        var TA = typeMapping[dataTypeIndex];
        function decodeMemoryView(handle) {
          var size = HEAPU32[handle >> 2];
          var data = HEAPU32[handle + 4 >> 2];
          return new TA(HEAP8.buffer, data, size);
        }
        name = readLatin1String(name);
        registerType(rawType, { name, fromWireType: decodeMemoryView, argPackAdvance: GenericWireTypeSize, readValueFromPointer: decodeMemoryView }, { ignoreDuplicateRegistrations: true });
      };
      var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
        if (!(maxBytesToWrite > 0)) return 0;
        var startIdx = outIdx;
        var endIdx = outIdx + maxBytesToWrite - 1;
        for (var i = 0; i < str.length; ++i) {
          var u = str.charCodeAt(i);
          if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | u1 & 1023;
          }
          if (u <= 127) {
            if (outIdx >= endIdx) break;
            heap[outIdx++] = u;
          } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx) break;
            heap[outIdx++] = 192 | u >> 6;
            heap[outIdx++] = 128 | u & 63;
          } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx) break;
            heap[outIdx++] = 224 | u >> 12;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63;
          } else {
            if (outIdx + 3 >= endIdx) break;
            heap[outIdx++] = 240 | u >> 18;
            heap[outIdx++] = 128 | u >> 12 & 63;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63;
          }
        }
        heap[outIdx] = 0;
        return outIdx - startIdx;
      };
      var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
      var lengthBytesUTF8 = (str) => {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
          var c = str.charCodeAt(i);
          if (c <= 127) {
            len++;
          } else if (c <= 2047) {
            len += 2;
          } else if (c >= 55296 && c <= 57343) {
            len += 4;
            ++i;
          } else {
            len += 3;
          }
        }
        return len;
      };
      var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
      var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
        var endIdx = idx + maxBytesToRead;
        var endPtr = idx;
        while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
        if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
          return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
        }
        var str = "";
        while (idx < endPtr) {
          var u0 = heapOrArray[idx++];
          if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue;
          }
          var u1 = heapOrArray[idx++] & 63;
          if ((u0 & 224) == 192) {
            str += String.fromCharCode((u0 & 31) << 6 | u1);
            continue;
          }
          var u2 = heapOrArray[idx++] & 63;
          if ((u0 & 240) == 224) {
            u0 = (u0 & 15) << 12 | u1 << 6 | u2;
          } else {
            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
          }
          if (u0 < 65536) {
            str += String.fromCharCode(u0);
          } else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
          }
        }
        return str;
      };
      var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
      var __embind_register_std_string = (rawType, name) => {
        name = readLatin1String(name);
        var stdStringIsUTF8 = name === "std::string";
        registerType(rawType, { name, fromWireType(value) {
          var length = HEAPU32[value >> 2];
          var payload = value + 4;
          var str;
          if (stdStringIsUTF8) {
            var decodeStartPtr = payload;
            for (var i = 0; i <= length; ++i) {
              var currentBytePtr = payload + i;
              if (i == length || HEAPU8[currentBytePtr] == 0) {
                var maxRead = currentBytePtr - decodeStartPtr;
                var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
                if (str === void 0) {
                  str = stringSegment;
                } else {
                  str += String.fromCharCode(0);
                  str += stringSegment;
                }
                decodeStartPtr = currentBytePtr + 1;
              }
            }
          } else {
            var a = new Array(length);
            for (var i = 0; i < length; ++i) {
              a[i] = String.fromCharCode(HEAPU8[payload + i]);
            }
            str = a.join("");
          }
          _free(value);
          return str;
        }, toWireType(destructors, value) {
          if (value instanceof ArrayBuffer) {
            value = new Uint8Array(value);
          }
          var length;
          var valueIsOfTypeString = typeof value == "string";
          if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
            throwBindingError("Cannot pass non-string to std::string");
          }
          if (stdStringIsUTF8 && valueIsOfTypeString) {
            length = lengthBytesUTF8(value);
          } else {
            length = value.length;
          }
          var base = _malloc(4 + length + 1);
          var ptr = base + 4;
          HEAPU32[base >> 2] = length;
          if (stdStringIsUTF8 && valueIsOfTypeString) {
            stringToUTF8(value, ptr, length + 1);
          } else {
            if (valueIsOfTypeString) {
              for (var i = 0; i < length; ++i) {
                var charCode = value.charCodeAt(i);
                if (charCode > 255) {
                  _free(ptr);
                  throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
                }
                HEAPU8[ptr + i] = charCode;
              }
            } else {
              for (var i = 0; i < length; ++i) {
                HEAPU8[ptr + i] = value[i];
              }
            }
          }
          if (destructors !== null) {
            destructors.push(_free, base);
          }
          return base;
        }, argPackAdvance: GenericWireTypeSize, readValueFromPointer: readPointer, destructorFunction(ptr) {
          _free(ptr);
        } });
      };
      var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : void 0;
      var UTF16ToString = (ptr, maxBytesToRead) => {
        var endPtr = ptr;
        var idx = endPtr >> 1;
        var maxIdx = idx + maxBytesToRead / 2;
        while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
        endPtr = idx << 1;
        if (endPtr - ptr > 32 && UTF16Decoder) return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
        var str = "";
        for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
          var codeUnit = HEAP16[ptr + i * 2 >> 1];
          if (codeUnit == 0) break;
          str += String.fromCharCode(codeUnit);
        }
        return str;
      };
      var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
        maxBytesToWrite ?? (maxBytesToWrite = 2147483647);
        if (maxBytesToWrite < 2) return 0;
        maxBytesToWrite -= 2;
        var startPtr = outPtr;
        var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
        for (var i = 0; i < numCharsToWrite; ++i) {
          var codeUnit = str.charCodeAt(i);
          HEAP16[outPtr >> 1] = codeUnit;
          outPtr += 2;
        }
        HEAP16[outPtr >> 1] = 0;
        return outPtr - startPtr;
      };
      var lengthBytesUTF16 = (str) => str.length * 2;
      var UTF32ToString = (ptr, maxBytesToRead) => {
        var i = 0;
        var str = "";
        while (!(i >= maxBytesToRead / 4)) {
          var utf32 = HEAP32[ptr + i * 4 >> 2];
          if (utf32 == 0) break;
          ++i;
          if (utf32 >= 65536) {
            var ch = utf32 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
          } else {
            str += String.fromCharCode(utf32);
          }
        }
        return str;
      };
      var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
        maxBytesToWrite ?? (maxBytesToWrite = 2147483647);
        if (maxBytesToWrite < 4) return 0;
        var startPtr = outPtr;
        var endPtr = startPtr + maxBytesToWrite - 4;
        for (var i = 0; i < str.length; ++i) {
          var codeUnit = str.charCodeAt(i);
          if (codeUnit >= 55296 && codeUnit <= 57343) {
            var trailSurrogate = str.charCodeAt(++i);
            codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
          }
          HEAP32[outPtr >> 2] = codeUnit;
          outPtr += 4;
          if (outPtr + 4 > endPtr) break;
        }
        HEAP32[outPtr >> 2] = 0;
        return outPtr - startPtr;
      };
      var lengthBytesUTF32 = (str) => {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
          var codeUnit = str.charCodeAt(i);
          if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
          len += 4;
        }
        return len;
      };
      var __embind_register_std_wstring = (rawType, charSize, name) => {
        name = readLatin1String(name);
        var decodeString, encodeString, readCharAt, lengthBytesUTF;
        if (charSize === 2) {
          decodeString = UTF16ToString;
          encodeString = stringToUTF16;
          lengthBytesUTF = lengthBytesUTF16;
          readCharAt = (pointer) => HEAPU16[pointer >> 1];
        } else if (charSize === 4) {
          decodeString = UTF32ToString;
          encodeString = stringToUTF32;
          lengthBytesUTF = lengthBytesUTF32;
          readCharAt = (pointer) => HEAPU32[pointer >> 2];
        }
        registerType(rawType, { name, fromWireType: (value) => {
          var length = HEAPU32[value >> 2];
          var str;
          var decodeStartPtr = value + 4;
          for (var i = 0; i <= length; ++i) {
            var currentBytePtr = value + 4 + i * charSize;
            if (i == length || readCharAt(currentBytePtr) == 0) {
              var maxReadBytes = currentBytePtr - decodeStartPtr;
              var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
              if (str === void 0) {
                str = stringSegment;
              } else {
                str += String.fromCharCode(0);
                str += stringSegment;
              }
              decodeStartPtr = currentBytePtr + charSize;
            }
          }
          _free(value);
          return str;
        }, toWireType: (destructors, value) => {
          if (!(typeof value == "string")) {
            throwBindingError(`Cannot pass non-string to C++ string type ${name}`);
          }
          var length = lengthBytesUTF(value);
          var ptr = _malloc(4 + length + charSize);
          HEAPU32[ptr >> 2] = length / charSize;
          encodeString(value, ptr + 4, length + charSize);
          if (destructors !== null) {
            destructors.push(_free, ptr);
          }
          return ptr;
        }, argPackAdvance: GenericWireTypeSize, readValueFromPointer: readPointer, destructorFunction(ptr) {
          _free(ptr);
        } });
      };
      var __embind_register_value_array = (rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) => {
        tupleRegistrations[rawType] = { name: readLatin1String(name), rawConstructor: embind__requireFunction(constructorSignature, rawConstructor), rawDestructor: embind__requireFunction(destructorSignature, rawDestructor), elements: [] };
      };
      var __embind_register_value_array_element = (rawTupleType, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) => {
        tupleRegistrations[rawTupleType].elements.push({ getterReturnType, getter: embind__requireFunction(getterSignature, getter), getterContext, setterArgumentType, setter: embind__requireFunction(setterSignature, setter), setterContext });
      };
      var __embind_register_void = (rawType, name) => {
        name = readLatin1String(name);
        registerType(rawType, { isVoid: true, name, argPackAdvance: 0, fromWireType: () => void 0, toWireType: (destructors, o) => void 0 });
      };
      var nowIsMonotonic = 1;
      var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;
      var emval_symbols = {};
      var getStringOrSymbol = (address) => {
        var symbol = emval_symbols[address];
        if (symbol === void 0) {
          return readLatin1String(address);
        }
        return symbol;
      };
      var emval_methodCallers = [];
      var __emval_call_method = (caller, objHandle, methodName, destructorsRef, args) => {
        caller = emval_methodCallers[caller];
        objHandle = Emval.toValue(objHandle);
        methodName = getStringOrSymbol(methodName);
        return caller(objHandle, objHandle[methodName], destructorsRef, args);
      };
      var emval_addMethodCaller = (caller) => {
        var id = emval_methodCallers.length;
        emval_methodCallers.push(caller);
        return id;
      };
      var emval_lookupTypes = (argCount, argTypes) => {
        var a = new Array(argCount);
        for (var i = 0; i < argCount; ++i) {
          a[i] = requireRegisteredType(HEAPU32[argTypes + i * 4 >> 2], "parameter " + i);
        }
        return a;
      };
      var reflectConstruct = Reflect.construct;
      var emval_returnValue = (returnType, destructorsRef, handle) => {
        var destructors = [];
        var result = returnType["toWireType"](destructors, handle);
        if (destructors.length) {
          HEAPU32[destructorsRef >> 2] = Emval.toHandle(destructors);
        }
        return result;
      };
      var __emval_get_method_caller = (argCount, argTypes, kind) => {
        var types = emval_lookupTypes(argCount, argTypes);
        var retType = types.shift();
        argCount--;
        var argN = new Array(argCount);
        var invokerFunction = (obj, func, destructorsRef, args) => {
          var offset = 0;
          for (var i = 0; i < argCount; ++i) {
            argN[i] = types[i]["readValueFromPointer"](args + offset);
            offset += types[i].argPackAdvance;
          }
          var rv = kind === 1 ? reflectConstruct(func, argN) : func.apply(obj, argN);
          return emval_returnValue(retType, destructorsRef, rv);
        };
        var functionName = `methodCaller<(${types.map((t) => t.name).join(", ")}) => ${retType.name}>`;
        return emval_addMethodCaller(createNamedFunction(functionName, invokerFunction));
      };
      var __emval_run_destructors = (handle) => {
        var destructors = Emval.toValue(handle);
        runDestructors(destructors);
        __emval_decref(handle);
      };
      var _emscripten_date_now = () => Date.now();
      var getHeapMax = () => 2147483648;
      var _emscripten_get_heap_max = () => getHeapMax();
      var _emscripten_get_now = () => performance.now();
      var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
      var growMemory = (size) => {
        var b = wasmMemory.buffer;
        var pages = (size - b.byteLength + 65535) / 65536 | 0;
        try {
          wasmMemory.grow(pages);
          updateMemoryViews();
          return 1;
        } catch (e) {
        }
      };
      var _emscripten_resize_heap = (requestedSize) => {
        var oldSize = HEAPU8.length;
        requestedSize >>>= 0;
        var maxHeapSize = getHeapMax();
        if (requestedSize > maxHeapSize) {
          return false;
        }
        for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
          var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
          overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
          var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
          var replacement = growMemory(newSize);
          if (replacement) {
            return true;
          }
        }
        return false;
      };
      var printCharBuffers = [null, [], []];
      var printChar = (stream, curr) => {
        var buffer = printCharBuffers[stream];
        if (curr === 0 || curr === 10) {
          (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
          buffer.length = 0;
        } else {
          buffer.push(curr);
        }
      };
      var _fd_write = (fd, iov, iovcnt, pnum) => {
        var num = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAPU32[iov >> 2];
          var len = HEAPU32[iov + 4 >> 2];
          iov += 8;
          for (var j = 0; j < len; j++) {
            printChar(fd, HEAPU8[ptr + j]);
          }
          num += len;
        }
        HEAPU32[pnum >> 2] = num;
        return 0;
      };
      var runtimeKeepaliveCounter = 0;
      var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
      var _proc_exit = (code) => {
        EXITSTATUS = code;
        if (!keepRuntimeAlive()) {
          Module["onExit"]?.(code);
          ABORT = true;
        }
        quit_(code, new ExitStatus(code));
      };
      var exitJS = (status, implicit) => {
        EXITSTATUS = status;
        _proc_exit(status);
      };
      var handleException = (e) => {
        if (e instanceof ExitStatus || e == "unwind") {
          return EXITSTATUS;
        }
        quit_(1, e);
      };
      InternalError = Module["InternalError"] = class InternalError extends Error {
        constructor(message) {
          super(message);
          this.name = "InternalError";
        }
      };
      embind_init_charCodes();
      BindingError = Module["BindingError"] = class BindingError extends Error {
        constructor(message) {
          super(message);
          this.name = "BindingError";
        }
      };
      init_emval();
      UnboundTypeError = Module["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
      var wasmImports = { _abort_js: __abort_js, _embind_finalize_value_array: __embind_finalize_value_array, _embind_register_bigint: __embind_register_bigint, _embind_register_bool: __embind_register_bool, _embind_register_emval: __embind_register_emval, _embind_register_enum: __embind_register_enum, _embind_register_enum_value: __embind_register_enum_value, _embind_register_float: __embind_register_float, _embind_register_function: __embind_register_function, _embind_register_integer: __embind_register_integer, _embind_register_memory_view: __embind_register_memory_view, _embind_register_std_string: __embind_register_std_string, _embind_register_std_wstring: __embind_register_std_wstring, _embind_register_value_array: __embind_register_value_array, _embind_register_value_array_element: __embind_register_value_array_element, _embind_register_void: __embind_register_void, _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic, _emval_call_method: __emval_call_method, _emval_decref: __emval_decref, _emval_get_method_caller: __emval_get_method_caller, _emval_run_destructors: __emval_run_destructors, emscripten_date_now: _emscripten_date_now, emscripten_get_heap_max: _emscripten_get_heap_max, emscripten_get_now: _emscripten_get_now, emscripten_resize_heap: _emscripten_resize_heap, fd_write: _fd_write };
      var wasmExports = createWasm();
      var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["__wasm_call_ctors"])();
      var _HP_GetStatistics = Module["_HP_GetStatistics"] = (a0) => (_HP_GetStatistics = Module["_HP_GetStatistics"] = wasmExports["HP_GetStatistics"])(a0);
      var _HP_Shape_CreateSphere = Module["_HP_Shape_CreateSphere"] = (a0, a1, a2) => (_HP_Shape_CreateSphere = Module["_HP_Shape_CreateSphere"] = wasmExports["HP_Shape_CreateSphere"])(a0, a1, a2);
      var _HP_Shape_CreateCapsule = Module["_HP_Shape_CreateCapsule"] = (a0, a1, a2, a3) => (_HP_Shape_CreateCapsule = Module["_HP_Shape_CreateCapsule"] = wasmExports["HP_Shape_CreateCapsule"])(a0, a1, a2, a3);
      var _HP_Shape_CreateCylinder = Module["_HP_Shape_CreateCylinder"] = (a0, a1, a2, a3) => (_HP_Shape_CreateCylinder = Module["_HP_Shape_CreateCylinder"] = wasmExports["HP_Shape_CreateCylinder"])(a0, a1, a2, a3);
      var _HP_Shape_CreateBox = Module["_HP_Shape_CreateBox"] = (a0, a1, a2, a3) => (_HP_Shape_CreateBox = Module["_HP_Shape_CreateBox"] = wasmExports["HP_Shape_CreateBox"])(a0, a1, a2, a3);
      var _HP_Shape_CreateConvexHull = Module["_HP_Shape_CreateConvexHull"] = (a0, a1, a2) => (_HP_Shape_CreateConvexHull = Module["_HP_Shape_CreateConvexHull"] = wasmExports["HP_Shape_CreateConvexHull"])(a0, a1, a2);
      var _HP_Shape_CreateMesh = Module["_HP_Shape_CreateMesh"] = (a0, a1, a2, a3, a4) => (_HP_Shape_CreateMesh = Module["_HP_Shape_CreateMesh"] = wasmExports["HP_Shape_CreateMesh"])(a0, a1, a2, a3, a4);
      var _HP_Shape_CreateHeightField = Module["_HP_Shape_CreateHeightField"] = (a0, a1, a2, a3, a4) => (_HP_Shape_CreateHeightField = Module["_HP_Shape_CreateHeightField"] = wasmExports["HP_Shape_CreateHeightField"])(a0, a1, a2, a3, a4);
      var _HP_Shape_CreateContainer = Module["_HP_Shape_CreateContainer"] = (a0) => (_HP_Shape_CreateContainer = Module["_HP_Shape_CreateContainer"] = wasmExports["HP_Shape_CreateContainer"])(a0);
      var _HP_Shape_Release = Module["_HP_Shape_Release"] = (a0) => (_HP_Shape_Release = Module["_HP_Shape_Release"] = wasmExports["HP_Shape_Release"])(a0);
      var _HP_Shape_GetType = Module["_HP_Shape_GetType"] = (a0, a1) => (_HP_Shape_GetType = Module["_HP_Shape_GetType"] = wasmExports["HP_Shape_GetType"])(a0, a1);
      var _HP_Shape_AddChild = Module["_HP_Shape_AddChild"] = (a0, a1, a2) => (_HP_Shape_AddChild = Module["_HP_Shape_AddChild"] = wasmExports["HP_Shape_AddChild"])(a0, a1, a2);
      var _HP_Shape_RemoveChild = Module["_HP_Shape_RemoveChild"] = (a0, a1) => (_HP_Shape_RemoveChild = Module["_HP_Shape_RemoveChild"] = wasmExports["HP_Shape_RemoveChild"])(a0, a1);
      var _HP_Shape_GetNumChildren = Module["_HP_Shape_GetNumChildren"] = (a0, a1) => (_HP_Shape_GetNumChildren = Module["_HP_Shape_GetNumChildren"] = wasmExports["HP_Shape_GetNumChildren"])(a0, a1);
      var _HP_Shape_GetChildShape = Module["_HP_Shape_GetChildShape"] = (a0, a1, a2) => (_HP_Shape_GetChildShape = Module["_HP_Shape_GetChildShape"] = wasmExports["HP_Shape_GetChildShape"])(a0, a1, a2);
      var _HP_Shape_SetChildQSTransform = Module["_HP_Shape_SetChildQSTransform"] = (a0, a1, a2) => (_HP_Shape_SetChildQSTransform = Module["_HP_Shape_SetChildQSTransform"] = wasmExports["HP_Shape_SetChildQSTransform"])(a0, a1, a2);
      var _HP_Shape_GetChildQSTransform = Module["_HP_Shape_GetChildQSTransform"] = (a0, a1, a2) => (_HP_Shape_GetChildQSTransform = Module["_HP_Shape_GetChildQSTransform"] = wasmExports["HP_Shape_GetChildQSTransform"])(a0, a1, a2);
      var _HP_Shape_SetFilterInfo = Module["_HP_Shape_SetFilterInfo"] = (a0, a1) => (_HP_Shape_SetFilterInfo = Module["_HP_Shape_SetFilterInfo"] = wasmExports["HP_Shape_SetFilterInfo"])(a0, a1);
      var _HP_Shape_GetFilterInfo = Module["_HP_Shape_GetFilterInfo"] = (a0, a1) => (_HP_Shape_GetFilterInfo = Module["_HP_Shape_GetFilterInfo"] = wasmExports["HP_Shape_GetFilterInfo"])(a0, a1);
      var _HP_Shape_SetMaterial = Module["_HP_Shape_SetMaterial"] = (a0, a1) => (_HP_Shape_SetMaterial = Module["_HP_Shape_SetMaterial"] = wasmExports["HP_Shape_SetMaterial"])(a0, a1);
      var _HP_Shape_GetMaterial = Module["_HP_Shape_GetMaterial"] = (a0, a1) => (_HP_Shape_GetMaterial = Module["_HP_Shape_GetMaterial"] = wasmExports["HP_Shape_GetMaterial"])(a0, a1);
      var _HP_Shape_SetDensity = Module["_HP_Shape_SetDensity"] = (a0, a1) => (_HP_Shape_SetDensity = Module["_HP_Shape_SetDensity"] = wasmExports["HP_Shape_SetDensity"])(a0, a1);
      var _HP_Shape_GetDensity = Module["_HP_Shape_GetDensity"] = (a0, a1) => (_HP_Shape_GetDensity = Module["_HP_Shape_GetDensity"] = wasmExports["HP_Shape_GetDensity"])(a0, a1);
      var _HP_Shape_GetBoundingBox = Module["_HP_Shape_GetBoundingBox"] = (a0, a1, a2) => (_HP_Shape_GetBoundingBox = Module["_HP_Shape_GetBoundingBox"] = wasmExports["HP_Shape_GetBoundingBox"])(a0, a1, a2);
      var _HP_Shape_CastRay = Module["_HP_Shape_CastRay"] = (a0, a1, a2, a3, a4) => (_HP_Shape_CastRay = Module["_HP_Shape_CastRay"] = wasmExports["HP_Shape_CastRay"])(a0, a1, a2, a3, a4);
      var _HP_Shape_BuildMassProperties = Module["_HP_Shape_BuildMassProperties"] = (a0, a1) => (_HP_Shape_BuildMassProperties = Module["_HP_Shape_BuildMassProperties"] = wasmExports["HP_Shape_BuildMassProperties"])(a0, a1);
      var _HP_ShapePathIterator_GetNext = Module["_HP_ShapePathIterator_GetNext"] = (a0, a1, a2) => (_HP_ShapePathIterator_GetNext = Module["_HP_ShapePathIterator_GetNext"] = wasmExports["HP_ShapePathIterator_GetNext"])(a0, a1, a2);
      var _HP_Shape_SetTrigger = Module["_HP_Shape_SetTrigger"] = (a0, a1) => (_HP_Shape_SetTrigger = Module["_HP_Shape_SetTrigger"] = wasmExports["HP_Shape_SetTrigger"])(a0, a1);
      var _HP_Shape_CreateDebugDisplayGeometry = Module["_HP_Shape_CreateDebugDisplayGeometry"] = (a0, a1) => (_HP_Shape_CreateDebugDisplayGeometry = Module["_HP_Shape_CreateDebugDisplayGeometry"] = wasmExports["HP_Shape_CreateDebugDisplayGeometry"])(a0, a1);
      var _HP_DebugGeometry_GetInfo = Module["_HP_DebugGeometry_GetInfo"] = (a0, a1) => (_HP_DebugGeometry_GetInfo = Module["_HP_DebugGeometry_GetInfo"] = wasmExports["HP_DebugGeometry_GetInfo"])(a0, a1);
      var _HP_DebugGeometry_Release = Module["_HP_DebugGeometry_Release"] = (a0) => (_HP_DebugGeometry_Release = Module["_HP_DebugGeometry_Release"] = wasmExports["HP_DebugGeometry_Release"])(a0);
      var _HP_Body_Create = Module["_HP_Body_Create"] = (a0) => (_HP_Body_Create = Module["_HP_Body_Create"] = wasmExports["HP_Body_Create"])(a0);
      var _HP_Body_Release = Module["_HP_Body_Release"] = (a0) => (_HP_Body_Release = Module["_HP_Body_Release"] = wasmExports["HP_Body_Release"])(a0);
      var _HP_Body_SetShape = Module["_HP_Body_SetShape"] = (a0, a1) => (_HP_Body_SetShape = Module["_HP_Body_SetShape"] = wasmExports["HP_Body_SetShape"])(a0, a1);
      var _HP_Body_GetShape = Module["_HP_Body_GetShape"] = (a0, a1) => (_HP_Body_GetShape = Module["_HP_Body_GetShape"] = wasmExports["HP_Body_GetShape"])(a0, a1);
      var _HP_Body_SetMotionType = Module["_HP_Body_SetMotionType"] = (a0, a1) => (_HP_Body_SetMotionType = Module["_HP_Body_SetMotionType"] = wasmExports["HP_Body_SetMotionType"])(a0, a1);
      var _HP_Body_GetMotionType = Module["_HP_Body_GetMotionType"] = (a0, a1) => (_HP_Body_GetMotionType = Module["_HP_Body_GetMotionType"] = wasmExports["HP_Body_GetMotionType"])(a0, a1);
      var _HP_Body_SetEventMask = Module["_HP_Body_SetEventMask"] = (a0, a1) => (_HP_Body_SetEventMask = Module["_HP_Body_SetEventMask"] = wasmExports["HP_Body_SetEventMask"])(a0, a1);
      var _HP_Body_GetEventMask = Module["_HP_Body_GetEventMask"] = (a0, a1) => (_HP_Body_GetEventMask = Module["_HP_Body_GetEventMask"] = wasmExports["HP_Body_GetEventMask"])(a0, a1);
      var _HP_Body_SetMassProperties = Module["_HP_Body_SetMassProperties"] = (a0, a1) => (_HP_Body_SetMassProperties = Module["_HP_Body_SetMassProperties"] = wasmExports["HP_Body_SetMassProperties"])(a0, a1);
      var _HP_Body_GetMassProperties = Module["_HP_Body_GetMassProperties"] = (a0, a1) => (_HP_Body_GetMassProperties = Module["_HP_Body_GetMassProperties"] = wasmExports["HP_Body_GetMassProperties"])(a0, a1);
      var _HP_Body_SetLinearDamping = Module["_HP_Body_SetLinearDamping"] = (a0, a1) => (_HP_Body_SetLinearDamping = Module["_HP_Body_SetLinearDamping"] = wasmExports["HP_Body_SetLinearDamping"])(a0, a1);
      var _HP_Body_GetLinearDamping = Module["_HP_Body_GetLinearDamping"] = (a0, a1) => (_HP_Body_GetLinearDamping = Module["_HP_Body_GetLinearDamping"] = wasmExports["HP_Body_GetLinearDamping"])(a0, a1);
      var _HP_Body_SetAngularDamping = Module["_HP_Body_SetAngularDamping"] = (a0, a1) => (_HP_Body_SetAngularDamping = Module["_HP_Body_SetAngularDamping"] = wasmExports["HP_Body_SetAngularDamping"])(a0, a1);
      var _HP_Body_GetAngularDamping = Module["_HP_Body_GetAngularDamping"] = (a0, a1) => (_HP_Body_GetAngularDamping = Module["_HP_Body_GetAngularDamping"] = wasmExports["HP_Body_GetAngularDamping"])(a0, a1);
      var _HP_Body_SetGravityFactor = Module["_HP_Body_SetGravityFactor"] = (a0, a1) => (_HP_Body_SetGravityFactor = Module["_HP_Body_SetGravityFactor"] = wasmExports["HP_Body_SetGravityFactor"])(a0, a1);
      var _HP_Body_GetGravityFactor = Module["_HP_Body_GetGravityFactor"] = (a0, a1) => (_HP_Body_GetGravityFactor = Module["_HP_Body_GetGravityFactor"] = wasmExports["HP_Body_GetGravityFactor"])(a0, a1);
      var _HP_Body_GetWorld = Module["_HP_Body_GetWorld"] = (a0, a1) => (_HP_Body_GetWorld = Module["_HP_Body_GetWorld"] = wasmExports["HP_Body_GetWorld"])(a0, a1);
      var _HP_Body_SetPosition = Module["_HP_Body_SetPosition"] = (a0, a1) => (_HP_Body_SetPosition = Module["_HP_Body_SetPosition"] = wasmExports["HP_Body_SetPosition"])(a0, a1);
      var _HP_Body_GetPosition = Module["_HP_Body_GetPosition"] = (a0, a1) => (_HP_Body_GetPosition = Module["_HP_Body_GetPosition"] = wasmExports["HP_Body_GetPosition"])(a0, a1);
      var _HP_Body_SetOrientation = Module["_HP_Body_SetOrientation"] = (a0, a1) => (_HP_Body_SetOrientation = Module["_HP_Body_SetOrientation"] = wasmExports["HP_Body_SetOrientation"])(a0, a1);
      var _HP_Body_GetOrientation = Module["_HP_Body_GetOrientation"] = (a0, a1) => (_HP_Body_GetOrientation = Module["_HP_Body_GetOrientation"] = wasmExports["HP_Body_GetOrientation"])(a0, a1);
      var _HP_Body_SetQTransform = Module["_HP_Body_SetQTransform"] = (a0, a1) => (_HP_Body_SetQTransform = Module["_HP_Body_SetQTransform"] = wasmExports["HP_Body_SetQTransform"])(a0, a1);
      var _HP_Body_GetWorldTransformOffset = Module["_HP_Body_GetWorldTransformOffset"] = (a0, a1) => (_HP_Body_GetWorldTransformOffset = Module["_HP_Body_GetWorldTransformOffset"] = wasmExports["HP_Body_GetWorldTransformOffset"])(a0, a1);
      var _HP_Body_GetQTransform = Module["_HP_Body_GetQTransform"] = (a0, a1) => (_HP_Body_GetQTransform = Module["_HP_Body_GetQTransform"] = wasmExports["HP_Body_GetQTransform"])(a0, a1);
      var _HP_Body_SetLinearVelocity = Module["_HP_Body_SetLinearVelocity"] = (a0, a1) => (_HP_Body_SetLinearVelocity = Module["_HP_Body_SetLinearVelocity"] = wasmExports["HP_Body_SetLinearVelocity"])(a0, a1);
      var _HP_Body_GetLinearVelocity = Module["_HP_Body_GetLinearVelocity"] = (a0, a1) => (_HP_Body_GetLinearVelocity = Module["_HP_Body_GetLinearVelocity"] = wasmExports["HP_Body_GetLinearVelocity"])(a0, a1);
      var _HP_Body_SetAngularVelocity = Module["_HP_Body_SetAngularVelocity"] = (a0, a1) => (_HP_Body_SetAngularVelocity = Module["_HP_Body_SetAngularVelocity"] = wasmExports["HP_Body_SetAngularVelocity"])(a0, a1);
      var _HP_Body_GetAngularVelocity = Module["_HP_Body_GetAngularVelocity"] = (a0, a1) => (_HP_Body_GetAngularVelocity = Module["_HP_Body_GetAngularVelocity"] = wasmExports["HP_Body_GetAngularVelocity"])(a0, a1);
      var _HP_Body_ApplyImpulse = Module["_HP_Body_ApplyImpulse"] = (a0, a1, a2) => (_HP_Body_ApplyImpulse = Module["_HP_Body_ApplyImpulse"] = wasmExports["HP_Body_ApplyImpulse"])(a0, a1, a2);
      var _HP_Body_ApplyAngularImpulse = Module["_HP_Body_ApplyAngularImpulse"] = (a0, a1) => (_HP_Body_ApplyAngularImpulse = Module["_HP_Body_ApplyAngularImpulse"] = wasmExports["HP_Body_ApplyAngularImpulse"])(a0, a1);
      var _HP_Body_SetTargetQTransform = Module["_HP_Body_SetTargetQTransform"] = (a0, a1) => (_HP_Body_SetTargetQTransform = Module["_HP_Body_SetTargetQTransform"] = wasmExports["HP_Body_SetTargetQTransform"])(a0, a1);
      var _HP_Body_SetActivationState = Module["_HP_Body_SetActivationState"] = (a0, a1) => (_HP_Body_SetActivationState = Module["_HP_Body_SetActivationState"] = wasmExports["HP_Body_SetActivationState"])(a0, a1);
      var _HP_Body_GetActivationState = Module["_HP_Body_GetActivationState"] = (a0, a1) => (_HP_Body_GetActivationState = Module["_HP_Body_GetActivationState"] = wasmExports["HP_Body_GetActivationState"])(a0, a1);
      var _HP_Body_SetActivationControl = Module["_HP_Body_SetActivationControl"] = (a0, a1) => (_HP_Body_SetActivationControl = Module["_HP_Body_SetActivationControl"] = wasmExports["HP_Body_SetActivationControl"])(a0, a1);
      var _HP_Body_SetActivationPriority = Module["_HP_Body_SetActivationPriority"] = (a0, a1) => (_HP_Body_SetActivationPriority = Module["_HP_Body_SetActivationPriority"] = wasmExports["HP_Body_SetActivationPriority"])(a0, a1);
      var _HP_Constraint_Create = Module["_HP_Constraint_Create"] = (a0) => (_HP_Constraint_Create = Module["_HP_Constraint_Create"] = wasmExports["HP_Constraint_Create"])(a0);
      var _HP_Constraint_Release = Module["_HP_Constraint_Release"] = (a0) => (_HP_Constraint_Release = Module["_HP_Constraint_Release"] = wasmExports["HP_Constraint_Release"])(a0);
      var _HP_Constraint_SetParentBody = Module["_HP_Constraint_SetParentBody"] = (a0, a1) => (_HP_Constraint_SetParentBody = Module["_HP_Constraint_SetParentBody"] = wasmExports["HP_Constraint_SetParentBody"])(a0, a1);
      var _HP_Constraint_GetParentBody = Module["_HP_Constraint_GetParentBody"] = (a0, a1) => (_HP_Constraint_GetParentBody = Module["_HP_Constraint_GetParentBody"] = wasmExports["HP_Constraint_GetParentBody"])(a0, a1);
      var _HP_Constraint_SetChildBody = Module["_HP_Constraint_SetChildBody"] = (a0, a1) => (_HP_Constraint_SetChildBody = Module["_HP_Constraint_SetChildBody"] = wasmExports["HP_Constraint_SetChildBody"])(a0, a1);
      var _HP_Constraint_GetChildBody = Module["_HP_Constraint_GetChildBody"] = (a0, a1) => (_HP_Constraint_GetChildBody = Module["_HP_Constraint_GetChildBody"] = wasmExports["HP_Constraint_GetChildBody"])(a0, a1);
      var _HP_Constraint_SetAnchorInParent = Module["_HP_Constraint_SetAnchorInParent"] = (a0, a1, a2, a3) => (_HP_Constraint_SetAnchorInParent = Module["_HP_Constraint_SetAnchorInParent"] = wasmExports["HP_Constraint_SetAnchorInParent"])(a0, a1, a2, a3);
      var _HP_Constraint_SetAnchorInChild = Module["_HP_Constraint_SetAnchorInChild"] = (a0, a1, a2, a3) => (_HP_Constraint_SetAnchorInChild = Module["_HP_Constraint_SetAnchorInChild"] = wasmExports["HP_Constraint_SetAnchorInChild"])(a0, a1, a2, a3);
      var _HP_Constraint_SetCollisionsEnabled = Module["_HP_Constraint_SetCollisionsEnabled"] = (a0, a1) => (_HP_Constraint_SetCollisionsEnabled = Module["_HP_Constraint_SetCollisionsEnabled"] = wasmExports["HP_Constraint_SetCollisionsEnabled"])(a0, a1);
      var _HP_Constraint_GetCollisionsEnabled = Module["_HP_Constraint_GetCollisionsEnabled"] = (a0, a1) => (_HP_Constraint_GetCollisionsEnabled = Module["_HP_Constraint_GetCollisionsEnabled"] = wasmExports["HP_Constraint_GetCollisionsEnabled"])(a0, a1);
      var _HP_Constraint_GetAppliedImpulses = Module["_HP_Constraint_GetAppliedImpulses"] = (a0, a1, a2) => (_HP_Constraint_GetAppliedImpulses = Module["_HP_Constraint_GetAppliedImpulses"] = wasmExports["HP_Constraint_GetAppliedImpulses"])(a0, a1, a2);
      var _HP_Constraint_SetEnabled = Module["_HP_Constraint_SetEnabled"] = (a0, a1) => (_HP_Constraint_SetEnabled = Module["_HP_Constraint_SetEnabled"] = wasmExports["HP_Constraint_SetEnabled"])(a0, a1);
      var _HP_Constraint_GetEnabled = Module["_HP_Constraint_GetEnabled"] = (a0, a1) => (_HP_Constraint_GetEnabled = Module["_HP_Constraint_GetEnabled"] = wasmExports["HP_Constraint_GetEnabled"])(a0, a1);
      var _HP_Constraint_SetAxisMinLimit = Module["_HP_Constraint_SetAxisMinLimit"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMinLimit = Module["_HP_Constraint_SetAxisMinLimit"] = wasmExports["HP_Constraint_SetAxisMinLimit"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMinLimit = Module["_HP_Constraint_GetAxisMinLimit"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMinLimit = Module["_HP_Constraint_GetAxisMinLimit"] = wasmExports["HP_Constraint_GetAxisMinLimit"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMaxLimit = Module["_HP_Constraint_SetAxisMaxLimit"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMaxLimit = Module["_HP_Constraint_SetAxisMaxLimit"] = wasmExports["HP_Constraint_SetAxisMaxLimit"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMaxLimit = Module["_HP_Constraint_GetAxisMaxLimit"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMaxLimit = Module["_HP_Constraint_GetAxisMaxLimit"] = wasmExports["HP_Constraint_GetAxisMaxLimit"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMode = Module["_HP_Constraint_GetAxisMode"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMode = Module["_HP_Constraint_GetAxisMode"] = wasmExports["HP_Constraint_GetAxisMode"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMode = Module["_HP_Constraint_SetAxisMode"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMode = Module["_HP_Constraint_SetAxisMode"] = wasmExports["HP_Constraint_SetAxisMode"])(a0, a1, a2);
      var _HP_Constraint_SetAxisFriction = Module["_HP_Constraint_SetAxisFriction"] = (a0, a1, a2) => (_HP_Constraint_SetAxisFriction = Module["_HP_Constraint_SetAxisFriction"] = wasmExports["HP_Constraint_SetAxisFriction"])(a0, a1, a2);
      var _HP_Constraint_GetAxisFriction = Module["_HP_Constraint_GetAxisFriction"] = (a0, a1, a2) => (_HP_Constraint_GetAxisFriction = Module["_HP_Constraint_GetAxisFriction"] = wasmExports["HP_Constraint_GetAxisFriction"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMotorType = Module["_HP_Constraint_SetAxisMotorType"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMotorType = Module["_HP_Constraint_SetAxisMotorType"] = wasmExports["HP_Constraint_SetAxisMotorType"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMotorType = Module["_HP_Constraint_GetAxisMotorType"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMotorType = Module["_HP_Constraint_GetAxisMotorType"] = wasmExports["HP_Constraint_GetAxisMotorType"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMotorPositionTarget = Module["_HP_Constraint_SetAxisMotorPositionTarget"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMotorPositionTarget = Module["_HP_Constraint_SetAxisMotorPositionTarget"] = wasmExports["HP_Constraint_SetAxisMotorPositionTarget"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMotorPositionTarget = Module["_HP_Constraint_GetAxisMotorPositionTarget"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMotorPositionTarget = Module["_HP_Constraint_GetAxisMotorPositionTarget"] = wasmExports["HP_Constraint_GetAxisMotorPositionTarget"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMotorVelocityTarget = Module["_HP_Constraint_SetAxisMotorVelocityTarget"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMotorVelocityTarget = Module["_HP_Constraint_SetAxisMotorVelocityTarget"] = wasmExports["HP_Constraint_SetAxisMotorVelocityTarget"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMotorVelocityTarget = Module["_HP_Constraint_GetAxisMotorVelocityTarget"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMotorVelocityTarget = Module["_HP_Constraint_GetAxisMotorVelocityTarget"] = wasmExports["HP_Constraint_GetAxisMotorVelocityTarget"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMotorMaxForce = Module["_HP_Constraint_SetAxisMotorMaxForce"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMotorMaxForce = Module["_HP_Constraint_SetAxisMotorMaxForce"] = wasmExports["HP_Constraint_SetAxisMotorMaxForce"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMotorMaxForce = Module["_HP_Constraint_GetAxisMotorMaxForce"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMotorMaxForce = Module["_HP_Constraint_GetAxisMotorMaxForce"] = wasmExports["HP_Constraint_GetAxisMotorMaxForce"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMotorStiffness = Module["_HP_Constraint_SetAxisMotorStiffness"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMotorStiffness = Module["_HP_Constraint_SetAxisMotorStiffness"] = wasmExports["HP_Constraint_SetAxisMotorStiffness"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMotorStiffness = Module["_HP_Constraint_GetAxisMotorStiffness"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMotorStiffness = Module["_HP_Constraint_GetAxisMotorStiffness"] = wasmExports["HP_Constraint_GetAxisMotorStiffness"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMotorDamping = Module["_HP_Constraint_SetAxisMotorDamping"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMotorDamping = Module["_HP_Constraint_SetAxisMotorDamping"] = wasmExports["HP_Constraint_SetAxisMotorDamping"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMotorDamping = Module["_HP_Constraint_GetAxisMotorDamping"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMotorDamping = Module["_HP_Constraint_GetAxisMotorDamping"] = wasmExports["HP_Constraint_GetAxisMotorDamping"])(a0, a1, a2);
      var _HP_Constraint_SetAxisStiffness = Module["_HP_Constraint_SetAxisStiffness"] = (a0, a1, a2) => (_HP_Constraint_SetAxisStiffness = Module["_HP_Constraint_SetAxisStiffness"] = wasmExports["HP_Constraint_SetAxisStiffness"])(a0, a1, a2);
      var _HP_Constraint_SetAxisDamping = Module["_HP_Constraint_SetAxisDamping"] = (a0, a1, a2) => (_HP_Constraint_SetAxisDamping = Module["_HP_Constraint_SetAxisDamping"] = wasmExports["HP_Constraint_SetAxisDamping"])(a0, a1, a2);
      var _HP_Constraint_SetAxisMotorTarget = Module["_HP_Constraint_SetAxisMotorTarget"] = (a0, a1, a2) => (_HP_Constraint_SetAxisMotorTarget = Module["_HP_Constraint_SetAxisMotorTarget"] = wasmExports["HP_Constraint_SetAxisMotorTarget"])(a0, a1, a2);
      var _HP_Constraint_GetAxisMotorTarget = Module["_HP_Constraint_GetAxisMotorTarget"] = (a0, a1, a2) => (_HP_Constraint_GetAxisMotorTarget = Module["_HP_Constraint_GetAxisMotorTarget"] = wasmExports["HP_Constraint_GetAxisMotorTarget"])(a0, a1, a2);
      var _HP_World_Create = Module["_HP_World_Create"] = (a0) => (_HP_World_Create = Module["_HP_World_Create"] = wasmExports["HP_World_Create"])(a0);
      var _HP_World_Release = Module["_HP_World_Release"] = (a0) => (_HP_World_Release = Module["_HP_World_Release"] = wasmExports["HP_World_Release"])(a0);
      var _HP_World_GetBodyBuffer = Module["_HP_World_GetBodyBuffer"] = (a0, a1) => (_HP_World_GetBodyBuffer = Module["_HP_World_GetBodyBuffer"] = wasmExports["HP_World_GetBodyBuffer"])(a0, a1);
      var _HP_World_SetGravity = Module["_HP_World_SetGravity"] = (a0, a1) => (_HP_World_SetGravity = Module["_HP_World_SetGravity"] = wasmExports["HP_World_SetGravity"])(a0, a1);
      var _HP_World_GetGravity = Module["_HP_World_GetGravity"] = (a0, a1) => (_HP_World_GetGravity = Module["_HP_World_GetGravity"] = wasmExports["HP_World_GetGravity"])(a0, a1);
      var _HP_World_AddBody = Module["_HP_World_AddBody"] = (a0, a1, a2) => (_HP_World_AddBody = Module["_HP_World_AddBody"] = wasmExports["HP_World_AddBody"])(a0, a1, a2);
      var _HP_World_RemoveBody = Module["_HP_World_RemoveBody"] = (a0, a1) => (_HP_World_RemoveBody = Module["_HP_World_RemoveBody"] = wasmExports["HP_World_RemoveBody"])(a0, a1);
      var _HP_World_GetNumBodies = Module["_HP_World_GetNumBodies"] = (a0, a1) => (_HP_World_GetNumBodies = Module["_HP_World_GetNumBodies"] = wasmExports["HP_World_GetNumBodies"])(a0, a1);
      var _HP_World_CastRayWithCollector = Module["_HP_World_CastRayWithCollector"] = (a0, a1, a2) => (_HP_World_CastRayWithCollector = Module["_HP_World_CastRayWithCollector"] = wasmExports["HP_World_CastRayWithCollector"])(a0, a1, a2);
      var _HP_World_PointProximityWithCollector = Module["_HP_World_PointProximityWithCollector"] = (a0, a1, a2) => (_HP_World_PointProximityWithCollector = Module["_HP_World_PointProximityWithCollector"] = wasmExports["HP_World_PointProximityWithCollector"])(a0, a1, a2);
      var _HP_World_ShapeProximityWithCollector = Module["_HP_World_ShapeProximityWithCollector"] = (a0, a1, a2) => (_HP_World_ShapeProximityWithCollector = Module["_HP_World_ShapeProximityWithCollector"] = wasmExports["HP_World_ShapeProximityWithCollector"])(a0, a1, a2);
      var _HP_World_ShapeCastWithCollector = Module["_HP_World_ShapeCastWithCollector"] = (a0, a1, a2) => (_HP_World_ShapeCastWithCollector = Module["_HP_World_ShapeCastWithCollector"] = wasmExports["HP_World_ShapeCastWithCollector"])(a0, a1, a2);
      var _HP_World_Step = Module["_HP_World_Step"] = (a0, a1) => (_HP_World_Step = Module["_HP_World_Step"] = wasmExports["HP_World_Step"])(a0, a1);
      var _HP_World_SetIdealStepTime = Module["_HP_World_SetIdealStepTime"] = (a0, a1) => (_HP_World_SetIdealStepTime = Module["_HP_World_SetIdealStepTime"] = wasmExports["HP_World_SetIdealStepTime"])(a0, a1);
      var _HP_World_SetSpeedLimit = Module["_HP_World_SetSpeedLimit"] = (a0, a1, a2) => (_HP_World_SetSpeedLimit = Module["_HP_World_SetSpeedLimit"] = wasmExports["HP_World_SetSpeedLimit"])(a0, a1, a2);
      var _HP_World_GetSpeedLimit = Module["_HP_World_GetSpeedLimit"] = (a0, a1, a2) => (_HP_World_GetSpeedLimit = Module["_HP_World_GetSpeedLimit"] = wasmExports["HP_World_GetSpeedLimit"])(a0, a1, a2);
      var _HP_World_GetNextCollisionEvent = Module["_HP_World_GetNextCollisionEvent"] = (a0, a1) => (_HP_World_GetNextCollisionEvent = Module["_HP_World_GetNextCollisionEvent"] = wasmExports["HP_World_GetNextCollisionEvent"])(a0, a1);
      var _HP_World_GetNextTriggerEvent = Module["_HP_World_GetNextTriggerEvent"] = (a0, a1) => (_HP_World_GetNextTriggerEvent = Module["_HP_World_GetNextTriggerEvent"] = wasmExports["HP_World_GetNextTriggerEvent"])(a0, a1);
      var _HP_QueryCollector_Create = Module["_HP_QueryCollector_Create"] = (a0, a1) => (_HP_QueryCollector_Create = Module["_HP_QueryCollector_Create"] = wasmExports["HP_QueryCollector_Create"])(a0, a1);
      var _HP_QueryCollector_Release = Module["_HP_QueryCollector_Release"] = (a0) => (_HP_QueryCollector_Release = Module["_HP_QueryCollector_Release"] = wasmExports["HP_QueryCollector_Release"])(a0);
      var _HP_QueryCollector_GetNumHits = Module["_HP_QueryCollector_GetNumHits"] = (a0, a1) => (_HP_QueryCollector_GetNumHits = Module["_HP_QueryCollector_GetNumHits"] = wasmExports["HP_QueryCollector_GetNumHits"])(a0, a1);
      var _HP_QueryCollector_GetCastRayResult = Module["_HP_QueryCollector_GetCastRayResult"] = (a0, a1, a2) => (_HP_QueryCollector_GetCastRayResult = Module["_HP_QueryCollector_GetCastRayResult"] = wasmExports["HP_QueryCollector_GetCastRayResult"])(a0, a1, a2);
      var _HP_QueryCollector_GetPointProximityResult = Module["_HP_QueryCollector_GetPointProximityResult"] = (a0, a1, a2) => (_HP_QueryCollector_GetPointProximityResult = Module["_HP_QueryCollector_GetPointProximityResult"] = wasmExports["HP_QueryCollector_GetPointProximityResult"])(a0, a1, a2);
      var _HP_QueryCollector_GetShapeProximityResult = Module["_HP_QueryCollector_GetShapeProximityResult"] = (a0, a1, a2) => (_HP_QueryCollector_GetShapeProximityResult = Module["_HP_QueryCollector_GetShapeProximityResult"] = wasmExports["HP_QueryCollector_GetShapeProximityResult"])(a0, a1, a2);
      var _HP_QueryCollector_GetShapeCastResult = Module["_HP_QueryCollector_GetShapeCastResult"] = (a0, a1, a2) => (_HP_QueryCollector_GetShapeCastResult = Module["_HP_QueryCollector_GetShapeCastResult"] = wasmExports["HP_QueryCollector_GetShapeCastResult"])(a0, a1, a2);
      var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["main"])(a0, a1);
      var _malloc = (a0) => (_malloc = wasmExports["malloc"])(a0);
      var _free = (a0) => (_free = wasmExports["free"])(a0);
      var _HP_Debug_StartRecordingStats = Module["_HP_Debug_StartRecordingStats"] = (a0) => (_HP_Debug_StartRecordingStats = Module["_HP_Debug_StartRecordingStats"] = wasmExports["HP_Debug_StartRecordingStats"])(a0);
      var _HP_Debug_StopRecordingStats = Module["_HP_Debug_StopRecordingStats"] = (a0, a1) => (_HP_Debug_StopRecordingStats = Module["_HP_Debug_StopRecordingStats"] = wasmExports["HP_Debug_StopRecordingStats"])(a0, a1);
      var ___getTypeName = (a0) => (___getTypeName = wasmExports["__getTypeName"])(a0);
      var _htons = (a0) => (_htons = wasmExports["htons"])(a0);
      var _ntohs = (a0) => (_ntohs = wasmExports["ntohs"])(a0);
      var _htonl = (a0) => (_htonl = wasmExports["htonl"])(a0);
      var __emscripten_stack_restore = (a0) => (__emscripten_stack_restore = wasmExports["_emscripten_stack_restore"])(a0);
      var __emscripten_stack_alloc = (a0) => (__emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"])(a0);
      var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();
      var calledRun;
      var calledPrerun;
      dependenciesFulfilled = function runCaller() {
        if (!calledRun) run();
        if (!calledRun) dependenciesFulfilled = runCaller;
      };
      function callMain() {
        var entryFunction = _main;
        var argc = 0;
        var argv = 0;
        try {
          var ret = entryFunction(argc, argv);
          exitJS(ret, true);
          return ret;
        } catch (e) {
          return handleException(e);
        }
      }
      function run() {
        if (runDependencies > 0) {
          return;
        }
        if (!calledPrerun) {
          calledPrerun = 1;
          preRun();
          if (runDependencies > 0) {
            return;
          }
        }
        function doRun() {
          if (calledRun) return;
          calledRun = 1;
          Module["calledRun"] = 1;
          if (ABORT) return;
          initRuntime();
          preMain();
          readyPromiseResolve(Module);
          Module["onRuntimeInitialized"]?.();
          if (shouldRunNow) callMain();
          postRun();
        }
        if (Module["setStatus"]) {
          Module["setStatus"]("Running...");
          setTimeout(() => {
            setTimeout(() => Module["setStatus"](""), 1);
            doRun();
          }, 1);
        } else {
          doRun();
        }
      }
      if (Module["preInit"]) {
        if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
        while (Module["preInit"].length > 0) {
          Module["preInit"].pop()();
        }
      }
      var shouldRunNow = true;
      if (Module["noInitialRun"]) shouldRunNow = false;
      run();
      moduleRtn = readyPromise;
      return moduleRtn;
    };
  })();
  var HavokPhysics_es_default = HavokPhysics;

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_engine();

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/scene.ts
  init_scene_core();

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_free_camera();

  // ../../../Babylon-Lite/packages/babylon-lite/src/light/hemispheric.ts
  init_light_base();
  init_light_matrix();
  init_matrix_allocator();
  function createHemisphericLight(direction = [0, 1, 0], intensity = 1) {
    const _localMatrix = allocateMat4();
    const { wm, onDirty, lvs } = createLightBase(() => {
      return localMatrixFromDirection(light.direction.x, light.direction.y, light.direction.z, 0, 0, 0, _localMatrix);
    });
    const light = applyWorldMatrixAccessors(
      {
        lightType: "hemispheric",
        children: [],
        direction: new ObservableVec3(direction[0], direction[1], direction[2], onDirty),
        intensity,
        diffuseColor: [1, 1, 1],
        specularColor: [1, 1, 1],
        groundColor: [0, 0, 0],
        _writeLightUbo: (data, offset) => {
          const o = offset;
          const w = light.worldMatrix;
          data[o] = w[8];
          data[o + 1] = w[9];
          data[o + 2] = w[10];
          data[o + 3] = 3;
          data[o + 4] = light.diffuseColor[0] * light.intensity;
          data[o + 5] = light.diffuseColor[1] * light.intensity;
          data[o + 6] = light.diffuseColor[2] * light.intensity;
          data[o + 8] = light.specularColor[0] * light.intensity;
          data[o + 9] = light.specularColor[1] * light.intensity;
          data[o + 10] = light.specularColor[2] * light.intensity;
          data[o + 12] = light.groundColor[0] * light.intensity;
          data[o + 13] = light.groundColor[1] * light.intensity;
          data[o + 14] = light.groundColor[2] * light.intensity;
        }
      },
      wm,
      lvs
    );
    return light;
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/mesh-factories.ts
  init_mesh();
  init_compute_aabb();

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

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/create-capsule.ts
  init_typed_arrays();
  function createCapsuleData(options = {}) {
    const subdivisions = Math.max(options.subdivisions ? options.subdivisions : 2, 1) | 0;
    const tessellation = Math.max(options.tessellation ? options.tessellation : 16, 3) | 0;
    const height = Math.max(options.height ? options.height : 1, 0);
    const radius = Math.max(options.radius ? options.radius : 0.25, 0);
    const capDetail = Math.max(options.capSubdivisions ? options.capSubdivisions : 6, 1) | 0;
    const radialSegments = tessellation;
    const heightSegments = subdivisions;
    const radiusTop = Math.max(options.radiusTop ? options.radiusTop : radius, 0);
    const radiusBottom = Math.max(options.radiusBottom ? options.radiusBottom : radius, 0);
    const heightMinusCaps = height - (radiusTop + radiusBottom);
    const thetaStart = 0;
    const thetaLength = 2 * Math.PI;
    const capsTopSegments = Math.max(options.topCapSubdivisions ? options.topCapSubdivisions : capDetail, 1);
    const capsBottomSegments = Math.max(options.bottomCapSubdivisions ? options.bottomCapSubdivisions : capDetail, 1);
    const alpha = Math.acos((radiusBottom - radiusTop) / height);
    let indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    let index = 0;
    const indexArray = [];
    const halfHeight = heightMinusCaps * 0.5;
    const pi2 = Math.PI * 0.5;
    let x;
    let y;
    const cosAlpha = Math.cos(alpha);
    const sinAlpha = Math.sin(alpha);
    const coneLengthX = radiusTop * sinAlpha - radiusBottom * sinAlpha;
    const coneLengthY = halfHeight + radiusTop * cosAlpha - (-halfHeight + radiusBottom * cosAlpha);
    const coneLength = Math.sqrt(coneLengthX * coneLengthX + coneLengthY * coneLengthY);
    const vl = radiusTop * alpha + coneLength + radiusBottom * (pi2 - alpha);
    let v2 = 0;
    for (y = 0; y <= capsTopSegments; y++) {
      const indexRow = [];
      const a = pi2 - alpha * (y / capsTopSegments);
      v2 += radiusTop * alpha / capsTopSegments;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const ringRadius = cosA * radiusTop;
      for (x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments;
        const theta = u * thetaLength + thetaStart;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        vertices.push(ringRadius * sinTheta, halfHeight + sinA * radiusTop, ringRadius * cosTheta);
        normals.push(cosA * sinTheta, sinA, cosA * cosTheta);
        uvs.push(u, 1 - v2 / vl);
        indexRow.push(index);
        index++;
      }
      indexArray.push(indexRow);
    }
    const coneHeight = height - radiusTop - radiusBottom + cosAlpha * radiusTop - cosAlpha * radiusBottom;
    const slope = sinAlpha * (radiusBottom - radiusTop) / coneHeight;
    for (y = 1; y <= heightSegments; y++) {
      const indexRow = [];
      v2 += coneLength / heightSegments;
      const ringRadius = sinAlpha * (y * (radiusBottom - radiusTop) / heightSegments + radiusTop);
      for (x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments;
        const theta = u * thetaLength + thetaStart;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        vertices.push(ringRadius * sinTheta, halfHeight + cosAlpha * radiusTop - y * coneHeight / heightSegments, ringRadius * cosTheta);
        const inv = 1 / Math.sqrt(sinTheta * sinTheta + slope * slope + cosTheta * cosTheta);
        normals.push(sinTheta * inv, slope * inv, cosTheta * inv);
        uvs.push(u, 1 - v2 / vl);
        indexRow.push(index);
        index++;
      }
      indexArray.push(indexRow);
    }
    for (y = 1; y <= capsBottomSegments; y++) {
      const indexRow = [];
      const a = pi2 - alpha - (Math.PI - alpha) * (y / capsBottomSegments);
      v2 += radiusBottom * alpha / capsBottomSegments;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const ringRadius = cosA * radiusBottom;
      for (x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments;
        const theta = u * thetaLength + thetaStart;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        vertices.push(ringRadius * sinTheta, -halfHeight + sinA * radiusBottom, ringRadius * cosTheta);
        normals.push(cosA * sinTheta, sinA, cosA * cosTheta);
        uvs.push(u, 1 - v2 / vl);
        indexRow.push(index);
        index++;
      }
      indexArray.push(indexRow);
    }
    for (x = 0; x < radialSegments; x++) {
      for (y = 0; y < capsTopSegments + heightSegments + capsBottomSegments; y++) {
        const i1 = indexArray[y][x];
        const i2 = indexArray[y + 1][x];
        const i3 = indexArray[y + 1][x + 1];
        const i4 = indexArray[y][x + 1];
        indices.push(i1, i2, i4);
        indices.push(i2, i3, i4);
      }
    }
    indices = indices.reverse();
    return {
      positions: new F32(vertices),
      normals: new F32(normals),
      uvs: new F32(uvs),
      indices: new U32(indices)
    };
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
  function createBox(engine, size = 1) {
    const data = createBoxData(size);
    return createMeshFromData(engine, "box", data.positions, data.normals, data.indices, data.uvs);
  }
  function createCapsule(engine, options) {
    const data = createCapsuleData(options);
    return createMeshFromData(engine, "capsule", data.positions, data.normals, data.indices, data.uvs);
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_create_standard_material();

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/load-gltf.ts
  init_typed_arrays();
  init_gpu_flags();
  init_compute_aabb();

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/transform-node.ts
  init_mesh();
  init_scene_node();
  function createTransformNode(name, px = 0, py = 0, pz = 0, qx = 0, qy = 0, qz = 0, qw = 1, sx = 1, sy = 1, sz = 1) {
    return createSceneNode(name, px, py, pz, qx, qy, qz, qw, sx, sy, sz);
  }
  function cloneTransformNode(src) {
    if ("_gpu" in src) {
      return cloneMeshNode(src);
    }
    const clone = src._localMatrix ? createSceneNodeFromMatrix(src.name + "_clone", src._localMatrix) : createTransformNode(
      src.name + "_clone",
      src.position.x,
      src.position.y,
      src.position.z,
      src.rotationQuaternion.x,
      src.rotationQuaternion.y,
      src.rotationQuaternion.z,
      src.rotationQuaternion.w,
      src.scaling.x,
      src.scaling.y,
      src.scaling.z
    );
    for (const child of src.children) {
      if (!("lightType" in child)) {
        const childClone = cloneTransformNode(child);
        childClone.parent = clone;
        clone.children.push(childClone);
      } else {
        const childClone = { ...child, name: child.name + "_clone", children: [] };
        childClone.parent = clone;
        clone.children.push(childClone);
      }
    }
    return clone;
  }
  function cloneMeshNode(mesh) {
    const meshClone = {
      ...mesh,
      name: mesh.name + "_clone",
      children: [],
      _gpu: { ...mesh._gpu }
    };
    initMeshTransform(meshClone, mesh.position.x, mesh.position.y, mesh.position.z, 0, 0, 0, mesh.scaling.x, mesh.scaling.y, mesh.scaling.z);
    const rq = mesh.rotationQuaternion;
    meshClone.rotationQuaternion.set(rq.x, rq.y, rq.z, rq.w);
    for (const child of mesh.children) {
      const childClone = cloneTransformNode(child);
      childClone.parent = meshClone;
      meshClone.children.push(childClone);
    }
    return meshClone;
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-gltf/load-gltf.ts
  init_scene_node();
  init_mesh();
  init_gpu_pool();
  init_gpu_buffers();
  init_gltf_parser();
  init_gltf_material();
  init_gltf_pbr_builder();
  var _interleavePromise;
  function loadInterleave() {
    return _interleavePromise ?? (_interleavePromise = Promise.resolve().then(() => (init_gltf_interleave(), gltf_interleave_exports)));
  }
  async function loadGltf(engine, source) {
    const { json, binChunk, baseUrl } = await fetchGltfAsset(source);
    const parentMap = buildParentMap(json);
    const worldMatrixCache = /* @__PURE__ */ new Map();
    const features = assetUsesGltfFeatures(json) ? await (await Promise.resolve().then(() => (init_gltf_feature_registry(), gltf_feature_registry_exports))).loadGltfFeatures(json) : [];
    let activeBin = binChunk;
    for (const f of features) {
      if (f.preParse) {
        const replacement = await f.preParse(json, activeBin);
        if (replacement) {
          activeBin = replacement;
        }
      }
    }
    const matExts = features.filter((f) => f.applyMaterial);
    const texWraps = features.filter((f) => f.wrapTexture).map((f) => f.wrapTexture);
    const wrapTex = !texWraps.length ? identityTexWrap : (tex, ti) => texWraps.reduce((acc, w) => w(acc, ti), tex);
    const decodedPrimitives = /* @__PURE__ */ new Map();
    for (const frag of await Promise.all(features.flatMap((f) => f.preMesh ? [f.preMesh(json, activeBin, baseUrl)] : []))) {
      for (const [k, v2] of frag) {
        decodedPrimitives.set(k, v2);
      }
    }
    const meshDatas = await extractAllMeshes(json, activeBin, baseUrl, parentMap, worldMatrixCache, decodedPrimitives);
    const ctx = {
      _engine: engine,
      _json: json,
      _binChunk: activeBin,
      _baseUrl: baseUrl,
      _parentMap: parentMap,
      _worldMatrixCache: worldMatrixCache,
      _matExts: matExts,
      _wrapTex: wrapTex
    };
    const meshes = await uploadMeshes(meshDatas, features, ctx);
    const { root, nodeMap } = buildNodeHierarchy(json, meshes, meshDatas);
    ctx._nodeMap = nodeMap;
    const assetFragments = await Promise.all(features.flatMap((f) => f.applyAsset ? [f.applyAsset(meshes, root, ctx)] : []));
    const container = { entities: [root] };
    for (const frag of assetFragments) {
      if (frag.entities?.length) {
        container.entities.push(...frag.entities);
      }
      const { entities: _ignored, ...rest } = frag;
      Object.assign(container, rest);
    }
    return container;
  }
  async function fetchGltfAsset(source) {
    const isUrl = typeof source === "string";
    const baseUrl = isUrl ? source.substring(0, source.lastIndexOf("/") + 1) : "";
    const buffer = isUrl ? await fetch(source).then((r) => r.arrayBuffer()) : source instanceof Blob ? await source.arrayBuffer() : source;
    if (buffer.byteLength >= 4 && new DV(buffer).getUint32(0, true) === 1179937895) {
      const { parseGlbContainer: parseGlbContainer2 } = await Promise.resolve().then(() => (init_gltf_glb_parser(), gltf_glb_parser_exports));
      return { ...parseGlbContainer2(buffer), baseUrl };
    }
    const json = JSON.parse(new TextDecoder().decode(buffer));
    const bufferDef = json.buffers?.[0];
    let binChunk;
    if (bufferDef?.uri) {
      binChunk = new DV(await fetch(resolveBufferUri(bufferDef.uri, baseUrl)).then((r) => r.arrayBuffer()));
    } else {
      binChunk = new DV(new ArrayBuffer(0));
    }
    return { json, binChunk, baseUrl };
  }
  function resolveBufferUri(uri, baseUrl) {
    if (baseUrl) {
      return new URL(uri, baseUrl + "x").href;
    }
    try {
      return new URL(uri).href;
    } catch {
      throw new Error(`loadGltf: relative buffer URI "${uri}" needs a base URL \u2014 load from a URL, or use a self-contained GLB/data: URI glTF.`);
    }
  }
  function assetUsesGltfFeatures(json) {
    return !!(json.extensionsUsed?.length || json.animations?.length || json.skins?.length && anyPrimitive(json, (p) => p.attributes?.JOINTS_0 !== void 0) || anyPrimitive(json, (p) => !!p.targets?.length) || needsOrmComposite(json));
  }
  function buildNodeHierarchy(json, meshes, meshDatas) {
    const nodeToMeshes = /* @__PURE__ */ new Map();
    for (let i = 0; i < meshDatas.length; i++) {
      const ni = meshDatas[i]._nodeIndex;
      let arr = nodeToMeshes.get(ni);
      if (!arr) {
        arr = [];
        nodeToMeshes.set(ni, arr);
      }
      arr.push(meshes[i]);
    }
    const nodeMap = new Array(json.nodes?.length ?? 0);
    function buildNode(nodeIdx) {
      const node = json.nodes[nodeIdx];
      const name = node.name ?? `node_${nodeIdx}`;
      let tn;
      if (node.matrix) {
        tn = createSceneNodeFromMatrix(name, node.matrix);
      } else {
        const t = node.translation ?? [0, 0, 0];
        const r = node.rotation ?? [0, 0, 0, 1];
        const s = node.scale ?? [1, 1, 1];
        tn = createTransformNode(name, t[0], t[1], t[2], r[0], r[1], r[2], r[3], s[0], s[1], s[2]);
      }
      nodeMap[nodeIdx] = tn;
      if (node.children) {
        for (const childIdx of node.children) {
          tn.children.push(buildNode(childIdx));
        }
      }
      const nodeMeshes = nodeToMeshes.get(nodeIdx) ?? [];
      tn.children.push(...nodeMeshes);
      return tn;
    }
    const sceneRoots = json.scenes?.[json.scene ?? 0]?.nodes ?? [];
    const rootChildren = sceneRoots.map((ni) => buildNode(ni));
    const root = createTransformNode("__root__", 0, 0, 0, 0, 0, 0, 1, -1, 1, 1);
    root.children.push(...rootChildren);
    return { root, nodeMap };
  }
  async function extractAllMeshes(json, binChunk, baseUrl, parentMap, worldMatrixCache, decodedPrimitives) {
    const imageCache = /* @__PURE__ */ new Map();
    const matCache = /* @__PURE__ */ new Map();
    const getMat = (matIdx) => {
      const key = matIdx ?? -1;
      let p = matCache.get(key);
      if (!p) {
        p = assembleMaterial(json, binChunk, matIdx, baseUrl, imageCache);
        matCache.set(key, p);
      }
      return p;
    };
    const partials = [];
    const matPromises = [];
    const _accs = json.accessors;
    const _bvs = json.bufferViews;
    const _strided = (p) => {
      for (const k in p.attributes) {
        const a = _accs[p.attributes[k]];
        const s = _bvs?.[a?.bufferView]?.byteStride;
        if (s !== void 0 && s !== (TYPE_SIZES[a.type] ?? 1) * (a.componentType === 5126 || a.componentType === 5125 ? 4 : a.componentType === 5123 || a.componentType === 5122 ? 2 : 1)) {
          return true;
        }
      }
      return false;
    };
    for (let nodeIdx = 0; nodeIdx < json.nodes.length; nodeIdx++) {
      const node = json.nodes[nodeIdx];
      if (node.mesh === void 0) {
        continue;
      }
      const mesh = json.meshes[node.mesh];
      const worldMatrix = computeNodeWorldMatrix(json, nodeIdx, parentMap, worldMatrixCache);
      for (const primitive of mesh.primitives) {
        const attrs = primitive.attributes;
        const decoded = decodedPrimitives.get(primitive);
        if (!decoded && _strided(primitive)) {
          const ip = (await loadInterleave()).buildInterleavedPartial(json, binChunk, primitive, worldMatrix, nodeIdx);
          if (ip) {
            matPromises.push(getMat(primitive.material));
            partials.push(ip);
            continue;
          }
        }
        const resolveAttr2 = (name) => {
          if (decoded && decoded._attributes.has(name)) {
            const data = decoded._attributes.get(name);
            const componentCount = data.length / decoded._vertexCount;
            return { _data: data, _count: decoded._vertexCount, _componentCount: componentCount };
          }
          const idx = attrs[name];
          return idx !== void 0 ? resolveAccessor(json, binChunk, idx) : null;
        };
        const posData = resolveAttr2("POSITION");
        const normData = resolveAttr2("NORMAL");
        const uvData = resolveAttr2("TEXCOORD_0");
        const uv2Data = resolveAttr2("TEXCOORD_1");
        const tanData = resolveAttr2("TANGENT");
        const colorData = resolveAttr2("COLOR_0");
        const idxData = decoded ? decoded._indexCount > 0 ? { _data: decoded._indices, _count: decoded._indexCount, _componentCount: 1 } : null : primitive.indices !== void 0 ? resolveAccessor(json, binChunk, primitive.indices) : null;
        const normalsHelper = !idxData || !normData ? await Promise.resolve().then(() => (init_gltf_normals(), gltf_normals_exports)) : null;
        const colors = colorData ? (await Promise.resolve().then(() => (init_gltf_color_normalize(), gltf_color_normalize_exports))).normalizeColorToVec3(colorData._data, colorData._count, colorData._componentCount) : null;
        const indices = idxData ? idxData._data instanceof U32 ? new U32(idxData._data) : idxData._data instanceof U8 ? Uint16Array.from(idxData._data) : new U16(idxData._data.buffer, idxData._data.byteOffset, idxData._count) : normalsHelper.createSequentialIndices(posData._count);
        matPromises.push(getMat(primitive.material));
        const normals = normData ? normData._data : normalsHelper.computeSmoothNormals(posData._data, indices, posData._count);
        partials.push({
          _positions: posData._data,
          _normals: normals,
          _tangents: tanData ? tanData._data : null,
          _uvs: uvData ? uvData._data : new F32(posData._count * 2),
          _uv2s: uv2Data ? uv2Data._data : null,
          _colors: colors,
          _indices: indices,
          _vertexCount: posData._count,
          _indexCount: indices.length,
          _worldMatrix: worldMatrix,
          _nodeIndex: nodeIdx,
          _primitive: primitive,
          _decoded: decoded
        });
      }
    }
    const materials = await Promise.all(matPromises);
    return partials.map((p, i) => ({ ...p, _material: materials[i] }));
  }
  var _generateMipmaps = null;
  async function ensureMipmapModule() {
    if (!_generateMipmaps) {
      _generateMipmaps = (await Promise.resolve().then(() => (init_generate_mipmaps(), generate_mipmaps_exports))).generateMipmaps;
    }
  }
  async function uploadMeshes(meshDatas, features, ctx) {
    const { _engine: engine, _json: json, _binChunk: binChunk, _baseUrl: baseUrl, _matExts: matExts, _wrapTex: wrapTex } = ctx;
    const sampler = getOrCreateSampler(engine, {
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
      maxAnisotropy: 4
    });
    await ensureMipmapModule();
    const meshFeatures = features.filter((f) => f.applyMesh);
    const texCache = /* @__PURE__ */ new Map();
    let texId = 0;
    const bitmapIds = /* @__PURE__ */ new Map();
    function getCachedTexture(bitmap, srgb) {
      let id = bitmapIds.get(bitmap);
      if (id === void 0) {
        bitmapIds.set(bitmap, id = texId++);
      }
      const key = id * 2 + +srgb;
      let tex = texCache.get(key);
      if (!tex) {
        tex = uploadTex(engine, bitmap, srgb, sampler, _generateMipmaps);
        texCache.set(key, tex);
      }
      return tex;
    }
    const extImageCache = matExts.length ? /* @__PURE__ */ new Map() : null;
    const extFetchImg = extImageCache ? makeImageFetcher(json, binChunk, baseUrl, extImageCache) : null;
    const extCtx = {
      _engine: engine,
      async _texture(texInfo, sRGB) {
        if (!texInfo || !extFetchImg) {
          return void 0;
        }
        const img = await extFetchImg(texInfo);
        return img ? wrapTex(getCachedTexture(img, sRGB), texInfo) : void 0;
      },
      _uploadImage(bitmap, sRGB) {
        return uploadTex(engine, bitmap, sRGB, sampler, _generateMipmaps);
      }
    };
    let _needsPbrExt = wrapTex !== identityTexWrap;
    if (!_needsPbrExt) {
      const mats = json.materials;
      if (mats && JSON.stringify(mats).includes('"texCoord":1')) {
        _needsPbrExt = true;
      }
    }
    let _pbrExtPromise = null;
    const _ensurePbrExt = () => _pbrExtPromise ?? (_pbrExtPromise = Promise.resolve().then(() => (init_gltf_pbr_builder_ext(), gltf_pbr_builder_ext_exports)));
    const builtMaterialCache = /* @__PURE__ */ new Map();
    async function buildPbrFromGltfMat(mat) {
      let cached = builtMaterialCache.get(mat);
      if (cached) {
        return cached;
      }
      cached = (async () => {
        const extLayers = await runMatExts(mat, matExts, extCtx);
        if (_needsPbrExt) {
          const extMod = await _ensurePbrExt();
          const tex2 = extMod.buildDefaultPbrTexturesExt(engine, mat, sampler, _generateMipmaps, getCachedTexture, wrapTex);
          return extMod.assemblePbrPropsExt(mat, tex2, extLayers);
        }
        const tex = buildDefaultPbrTextures(engine, mat, sampler, _generateMipmaps, getCachedTexture);
        return assemblePbrProps(mat, tex.baseColorTexture, tex.ormTexture, tex.normalTexture, tex.emissiveTexture, extLayers);
      })();
      builtMaterialCache.set(mat, cached);
      return cached;
    }
    const meshes = await Promise.all(
      meshDatas.map(async (m, i) => {
        const material = await buildPbrFromGltfMat(m._material);
        let mesh;
        if (m._vb) {
          mesh = (await loadInterleave()).buildInterleavedMesh(engine, m, i, material);
        } else {
          const [boundMin, boundMax] = computeAabb(m._positions, m._worldMatrix);
          const gpu = {
            positionBuffer: createMappedBuffer(engine, m._positions, BU.VERTEX),
            normalBuffer: createMappedBuffer(engine, m._normals, BU.VERTEX),
            tangentBuffer: m._tangents ? createMappedBuffer(engine, m._tangents, BU.VERTEX) : null,
            uvBuffer: createMappedBuffer(engine, m._uvs, BU.VERTEX),
            uv2Buffer: m._uv2s ? createMappedBuffer(engine, m._uv2s, BU.VERTEX) : null,
            colorBuffer: m._colors ? createMappedBuffer(engine, m._colors, BU.VERTEX) : null,
            indexBuffer: createMappedBuffer(engine, m._indices, BU.INDEX),
            indexCount: m._indexCount,
            indexFormat: m._indices instanceof U32 ? "uint32" : "uint16"
          };
          mesh = {
            name: `gltf_mesh_${i}`,
            material,
            receiveShadows: false,
            boundMin,
            boundMax,
            skeleton: null,
            morphTargets: null,
            _gpu: gpu
          };
          initMeshTransform(mesh);
          mesh._cpuPositions = m._positions;
          mesh._cpuNormals = m._normals;
          mesh._cpuUvs = m._uvs;
          mesh._cpuIndices = m._indices instanceof U32 ? m._indices : new U32(m._indices);
          engine._dlr?.m(mesh, m._uv2s, m._tangents, m._colors, m._indices, gpu.indexFormat);
        }
        if (meshFeatures.length > 0) {
          await Promise.all(meshFeatures.map((f) => f.applyMesh(m, mesh, ctx)));
        }
        return mesh;
      })
    );
    return meshes;
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_texture_2d();
  init_havok();

  // ../../../Babylon-Lite/packages/babylon-lite/src/physics/character-controller.ts
  init_mat4_invert();
  init_havok();
  var CharacterCollisionObservable = class {
    constructor() {
      __publicField(this, "_subs", []);
    }
    /**
     * Subscribe to collision events.
     * @param cb - Callback invoked for each dynamic-body contact during a step.
     * @returns A disposer that removes the subscription when called.
     */
    add(cb) {
      this._subs.push(cb);
      return () => {
        const i = this._subs.indexOf(cb);
        if (i >= 0) {
          this._subs.splice(i, 1);
        }
      };
    }
    /**
     * Notify all subscribers of a collision event.
     * @param event - The collision event payload.
     */
    notify(event) {
      for (const s of this._subs) {
        s(event);
      }
    }
  };
  function v(x = 0, y = 0, z = 0) {
    return { x, y, z };
  }
  function vclone(a) {
    return { x: a.x, y: a.y, z: a.z };
  }
  function vcopy(d, s) {
    d.x = s.x;
    d.y = s.y;
    d.z = s.z;
  }
  function vset(d, x, y, z) {
    d.x = x;
    d.y = y;
    d.z = z;
  }
  function vadd(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }
  function vsub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }
  function vscale(a, s) {
    return { x: a.x * s, y: a.y * s, z: a.z * s };
  }
  function vaddIn(d, a) {
    d.x += a.x;
    d.y += a.y;
    d.z += a.z;
  }
  function vsubIn(d, a) {
    d.x -= a.x;
    d.y -= a.y;
    d.z -= a.z;
  }
  function vscaleIn(d, s) {
    d.x *= s;
    d.y *= s;
    d.z *= s;
  }
  function vdot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  function vcross(a, b) {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
  }
  function vlenSq(a) {
    return a.x * a.x + a.y * a.y + a.z * a.z;
  }
  function vlen(a) {
    return Math.sqrt(vlenSq(a));
  }
  function vnormIn(a) {
    const l = vlen(a);
    if (l > 1e-12) {
      const inv = 1 / l;
      a.x *= inv;
      a.y *= inv;
      a.z *= inv;
    }
  }
  function vequalsEps(a, b, eps) {
    return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps && Math.abs(a.z - b.z) <= eps;
  }
  function clamp(value, lo, hi) {
    return Math.min(Math.max(value, lo), hi);
  }
  function transformCoord(m, p) {
    return {
      x: p.x * m[0] + p.y * m[4] + p.z * m[8] + m[12],
      y: p.x * m[1] + p.y * m[5] + p.z * m[9] + m[13],
      z: p.x * m[2] + p.y * m[6] + p.z * m[10] + m[14]
    };
  }
  var PhysicsCharacterController = class {
    /** Construct a controller. Prefer the {@link createPhysicsCharacterController} factory. */
    constructor(world, position, options) {
      /** Minimum separation kept from surfaces, in metres. Default `0.05`. */
      __publicField(this, "keepDistance", 0.05);
      /** Extra distance over which a contact is still tracked. Default `0.1`. */
      __publicField(this, "keepContactTolerance", 0.1);
      /** Maximum number of cast iterations per integration step. Default `10`. */
      __publicField(this, "maxCastIterations", 10);
      /** Speed at which penetrations are pushed out. Default `1.0`. */
      __publicField(this, "penetrationRecoverySpeed", 1);
      /** Static-friction coefficient against surfaces. Default `0`. */
      __publicField(this, "staticFriction", 0);
      /** Dynamic-friction coefficient against surfaces. Default `1`. */
      __publicField(this, "dynamicFriction", 1);
      /** Cosine of the steepest slope the character can stand on. Default `0.5` (60°). */
      __publicField(this, "maxSlopeCosine", 0.5);
      /** Upper bound on per-solve character speed. Default `10`. */
      __publicField(this, "maxCharacterSpeedForSolver", 10);
      /** World up vector. Default `(0, 1, 0)`. */
      __publicField(this, "up", { x: 0, y: 1, z: 0 });
      /** Push strength applied to dynamic bodies the character contacts. Default `1e38`. */
      __publicField(this, "characterStrength", 1e38);
      /** Acceleration factor used by {@link calculateMovement}. Default `0.05`. */
      __publicField(this, "acceleration", 0.05);
      /** Maximum world-space acceleration used by {@link calculateMovement}. Default `50`. */
      __publicField(this, "maxAcceleration", 50);
      /** Character mass used when reacting to gravity against dynamic bodies. Default `0`. */
      __publicField(this, "characterMass", 0);
      /**
       * Fires once per dynamic body the character pushes during a step, just before the reactive
       * impulse is applied. Mirrors Babylon.js' `onTriggerCollisionObservable`. Subscribe with
       * `.add(cb)`; the returned disposer removes the subscription.
       */
      __publicField(this, "onTriggerCollisionObservable", new CharacterCollisionObservable());
      __publicField(this, "_world");
      __publicField(this, "_shape");
      __publicField(this, "_node");
      __publicField(this, "_body");
      __publicField(this, "_startCollector");
      __publicField(this, "_castCollector");
      __publicField(this, "_position");
      __publicField(this, "_velocity", v());
      __publicField(this, "_lastVelocity", v());
      __publicField(this, "_lastDisplacement", v());
      __publicField(this, "_orientation", { x: 0, y: 0, z: 0, w: 1 });
      __publicField(this, "_manifold", []);
      __publicField(this, "_lastInvDeltaTime", 60);
      __publicField(this, "_frameId", 0);
      __publicField(this, "_contactAngleSensitivity", 10);
      __publicField(this, "_displacementEps", 1e-4);
      __publicField(this, "_bodyTracking", /* @__PURE__ */ new Map());
      this._world = world;
      this._position = vclone(position);
      const r = options.capsuleRadius ?? 0.6;
      const h = options.capsuleHeight ?? 1.8;
      this._shape = createPhysicsShape(world, {
        type: 1 /* CAPSULE */,
        parameters: { pointA: { x: 0, y: h * 0.5 - r, z: 0 }, pointB: { x: 0, y: -h * 0.5 + r, z: 0 }, radius: r }
      });
      this._node = createTransformNode("CCTransformNode", position.x, position.y, position.z);
      this._body = createPhysicsBody(world, this._node, 1 /* ANIMATED */);
      setPhysicsBodyShape(world, this._body, this._shape);
      setPhysicsBodyMassProperties(world, this._body, { inertia: { x: 0, y: 0, z: 0 } });
      setPhysicsBodyPreStep(this._body, true);
      const hknp = world._hknp;
      this._startCollector = hknp.HP_QueryCollector_Create(16)[1];
      this._castCollector = hknp.HP_QueryCollector_Create(16)[1];
    }
    /** Release the controller's body, shape, and query collectors. */
    dispose() {
      const hknp = this._world._hknp;
      removePhysicsBody(this._world, this._body);
      hknp.HP_Shape_Release(this._shape._hkShape);
      hknp.HP_QueryCollector_Release(this._startCollector);
      hknp.HP_QueryCollector_Release(this._castCollector);
    }
    /** Get the current character position (world space). The returned vector is owned by the controller. */
    getPosition() {
      return this._position;
    }
    /** Teleport the character to a new position, clearing any swept motion. */
    setPosition(position) {
      vcopy(this._position, position);
      this._node.position.set(position.x, position.y, position.z);
    }
    /** Get the current character velocity (world space). The returned vector is owned by the controller. */
    getVelocity() {
      return this._velocity;
    }
    /** Set the character velocity (world space). */
    setVelocity(velocity) {
      vcopy(this._velocity, velocity);
    }
    /**
     * Move the character by a displacement this physics step, sliding along any geometry it meets.
     * @param displacement - Requested world-space displacement for this step.
     */
    moveWithCollisions(displacement) {
      const deltaTime = this._world._timestep;
      if (!deltaTime || deltaTime <= 0) {
        return;
      }
      const invDeltaTime = 1 / deltaTime;
      this._frameId++;
      vcopy(this._velocity, vscale(displacement, invDeltaTime));
      vcopy(this._lastDisplacement, displacement);
      vcopy(this._lastVelocity, this._velocity);
      this._lastInvDeltaTime = invDeltaTime;
      this._integrateManifolds(deltaTime, ZERO);
    }
    /**
     * Advance the controller using a velocity already chosen for this step (instead of a raw
     * displacement). Mirrors Babylon.js' `integrate`: it picks a cast direction from the current
     * velocity and surface info, then runs the collide-and-slide.
     * @param deltaTime - Step duration in seconds.
     * @param surfaceInfo - Surface info from a prior {@link checkSupport} call.
     * @param gravity - Gravity applied to the character this step.
     */
    integrate(deltaTime, surfaceInfo, gravity) {
      const invDeltaTime = 1 / deltaTime;
      const tolerance = this._displacementEps * invDeltaTime;
      if (vequalsEps(this._velocity, this._lastVelocity, tolerance)) {
        vscaleIn(this._lastDisplacement, deltaTime * this._lastInvDeltaTime);
      } else {
        const displacementVelocity = vclone(this._velocity);
        if (surfaceInfo.supportedState === 2 /* SUPPORTED */) {
          const relative = vsub(this._velocity, surfaceInfo.averageSurfaceVelocity);
          const normalDotVelocity = vdot(surfaceInfo.averageSurfaceNormal, relative);
          if (normalDotVelocity < 0) {
            vsubIn(relative, vscale(surfaceInfo.averageSurfaceNormal, normalDotVelocity));
            vcopy(displacementVelocity, relative);
            vaddIn(displacementVelocity, surfaceInfo.averageSurfaceVelocity);
          }
        }
        vcopy(this._lastDisplacement, vscale(displacementVelocity, deltaTime));
      }
      vcopy(this._lastVelocity, this._velocity);
      this._lastInvDeltaTime = invDeltaTime;
      this._frameId++;
      this._integrateManifolds(deltaTime, gravity);
    }
    /**
     * Probe the surface under the character along a direction (usually gravity) to classify support.
     * @param deltaTime - Step duration in seconds.
     * @param direction - Direction to probe, usually the gravity direction.
     * @returns Support classification and averaged surface motion/normal.
     */
    checkSupport(deltaTime, direction) {
      const eps = 1e-4;
      const info = {
        isSurfaceDynamic: false,
        supportedState: 0 /* UNSUPPORTED */,
        averageSurfaceNormal: v(),
        averageSurfaceVelocity: v(),
        averageAngularSurfaceVelocity: v()
      };
      this._validateManifold();
      const constraints = this._createConstraintsFromManifold(deltaTime, 0);
      const storedVelocities = [];
      for (const c of constraints) {
        storedVelocities.push(vclone(c.velocity));
        vset(c.velocity, 0, 0, 0);
      }
      const maxSurfaceVelocity = v(this.maxCharacterSpeedForSolver, this.maxCharacterSpeedForSolver, this.maxCharacterSpeedForSolver);
      const output = this._simplexSolverSolve(constraints, direction, deltaTime, deltaTime, maxSurfaceVelocity);
      if (vequalsEps(output.velocity, direction, eps)) {
        info.supportedState = 0 /* UNSUPPORTED */;
        return info;
      }
      if (vlenSq(output.velocity) < eps) {
        info.supportedState = 2 /* SUPPORTED */;
      } else {
        vnormIn(output.velocity);
        const angleSin = vdot(output.velocity, direction);
        const cosSqr = 1 - angleSin * angleSin;
        info.supportedState = cosSqr < this.maxSlopeCosine * this.maxSlopeCosine ? 1 /* SLIDING */ : 2 /* SUPPORTED */;
      }
      let numTouching = 0;
      for (let i = 0; i < constraints.length; i++) {
        if (output.planeInteractions[i].touched && vdot(constraints[i].planeNormal, direction) < -0.08) {
          vaddIn(info.averageSurfaceNormal, constraints[i].planeNormal);
          vaddIn(info.averageSurfaceVelocity, storedVelocities[i]);
          vaddIn(info.averageAngularSurfaceVelocity, constraints[i].angularVelocity);
          numTouching++;
        }
      }
      if (numTouching > 0) {
        vnormIn(info.averageSurfaceNormal);
        vscaleIn(info.averageSurfaceVelocity, 1 / numTouching);
        vscaleIn(info.averageAngularSurfaceVelocity, 1 / numTouching);
      }
      if (info.supportedState === 2 /* SUPPORTED */) {
        for (const m of this._manifold) {
          if (vdot(m.normal, direction) < -0.08 && m.body?.motionType === 2 /* DYNAMIC */) {
            info.isSurfaceDynamic = true;
            break;
          }
        }
      }
      return info;
    }
    /**
     * Compute a target velocity from the current state, a desired velocity, and surface info — a
     * helper for steering input into surface-aware motion.
     * @param deltaTime - Step duration in seconds.
     * @param forwardWorld - Character forward direction (world space).
     * @param surfaceNormal - Supporting surface normal.
     * @param currentVelocity - Current character velocity.
     * @param surfaceVelocity - Velocity induced by the surface.
     * @param desiredVelocity - Desired character velocity.
     * @param upWorld - Up vector (world space).
     * @returns The new velocity vector.
     */
    calculateMovement(deltaTime, forwardWorld, surfaceNormal, currentVelocity, surfaceVelocity, desiredVelocity, upWorld) {
      const eps = 1e-5;
      let binorm = vcross(forwardWorld, upWorld);
      if (vlenSq(binorm) < eps) {
        return v();
      }
      vnormIn(binorm);
      const tangent = vcross(binorm, surfaceNormal);
      vnormIn(tangent);
      binorm = vcross(tangent, surfaceNormal);
      vnormIn(binorm);
      const rel = vsub(currentVelocity, surfaceVelocity);
      const relative = { x: vdot(rel, tangent), y: vdot(rel, binorm), z: vdot(rel, surfaceNormal) };
      const sideVec = vcross(upWorld, forwardWorld);
      const fwd = vdot(desiredVelocity, forwardWorld);
      const side = vdot(desiredVelocity, sideVec);
      const len = vlen(desiredVelocity);
      const desiredSF = v(-fwd, side, 0);
      vnormIn(desiredSF);
      vscaleIn(desiredSF, len);
      const diff = vsub(desiredSF, relative);
      const lenSq = vlenSq(diff);
      const maxVelocityDelta = this.maxAcceleration * deltaTime;
      const factor = lenSq * this.acceleration * this.acceleration > maxVelocityDelta * maxVelocityDelta ? maxVelocityDelta / Math.sqrt(lenSq) : this.acceleration;
      vscaleIn(diff, factor);
      vaddIn(relative, diff);
      const result = {
        x: relative.x * tangent.x + relative.y * binorm.x + relative.z * surfaceNormal.x,
        y: relative.x * tangent.y + relative.y * binorm.y + relative.z * surfaceNormal.y,
        z: relative.x * tangent.z + relative.y * binorm.z + relative.z * surfaceNormal.z
      };
      vaddIn(result, surfaceVelocity);
      return result;
    }
    // ─── Manifold integration ────────────────────────────────────────
    _integrateManifolds(deltaTime, gravity) {
      const epsSqrd = 1e-8;
      let newVelocity = v();
      let remainingTime = deltaTime;
      this._validateManifold();
      for (let iter = 0; iter < this.maxCastIterations && remainingTime > 1e-5; iter++) {
        this._castWithCollectors(this._position, vadd(this._position, this._lastDisplacement));
        const updateResult = this._updateManifold(this._lastDisplacement);
        const constraints = this._createConstraintsFromManifold(deltaTime, deltaTime - remainingTime);
        const maxSurfaceVelocity = v(this.maxCharacterSpeedForSolver, this.maxCharacterSpeedForSolver, this.maxCharacterSpeedForSolver);
        const minDeltaTime = vlenSq(this._velocity) === 0 ? 0 : 0.5 * this.keepDistance / vlen(this._velocity);
        const solveResults = this._simplexSolverSolve(constraints, this._velocity, remainingTime, minDeltaTime, maxSurfaceVelocity);
        const newDisplacement = solveResults.position;
        const solverDeltaTime = solveResults.deltaTime;
        newVelocity = solveResults.velocity;
        this._resolveContacts(deltaTime, gravity);
        let newContactIndex = -1;
        if (updateResult !== 0 || vlenSq(newDisplacement) > epsSqrd && !vequalsEps(this._lastDisplacement, newDisplacement, this._displacementEps)) {
          this._castWithCollectors(this._position, vadd(this._position, newDisplacement), true);
          const hknp = this._world._hknp;
          const numCastHits = hknp.HP_QueryCollector_GetNumHits(this._castCollector)[1];
          for (let i = 0; i < numCastHits; i++) {
            const [fraction, , hitWorld] = hknp.HP_QueryCollector_GetShapeCastResult(this._castCollector, i)[1];
            const newContact = this._contactFromCast(hitWorld, newDisplacement, fraction);
            if (this._findContact(newContact, this._manifold, 0.1) === -1) {
              newContactIndex = this._manifold.length;
              this._manifold.push(newContact);
              break;
            }
          }
        }
        if (newContactIndex >= 0) {
          const newContact = this._manifold[newContactIndex];
          const displacementLengthInv = 1 / vlen(newDisplacement);
          const angleBetween = vdot(newDisplacement, newContact.normal) * displacementLengthInv;
          const keepDistanceAlongMovement = this.keepDistance / -angleBetween;
          let fraction = newContact.fraction - keepDistanceAlongMovement * displacementLengthInv;
          fraction = clamp(fraction, 0, 1);
          vaddIn(this._position, vscale(newDisplacement, fraction));
          remainingTime -= solverDeltaTime * fraction;
        } else {
          vaddIn(this._position, newDisplacement);
          remainingTime -= solverDeltaTime;
        }
        vcopy(this._lastDisplacement, newDisplacement);
      }
      vcopy(this._velocity, newVelocity);
      this._node.position.set(this._position.x, this._position.y, this._position.z);
    }
    _castWithCollectors(startPos, endPos, castOnly = false) {
      const hknp = this._world._hknp;
      const hkWorld = this._world._hkWorld;
      const shapeHandle = this._shape._hkShape;
      const startNative = [startPos.x, startPos.y, startPos.z];
      const orientation = [this._orientation.x, this._orientation.y, this._orientation.z, this._orientation.w];
      const ignoreSelf = [this._body._hkBody[0]];
      if (!castOnly) {
        const proxQuery = [shapeHandle, startNative, orientation, this.keepDistance + this.keepContactTolerance, false, ignoreSelf];
        hknp.HP_World_ShapeProximityWithCollector(hkWorld, this._startCollector, proxQuery);
      }
      const castQuery = [shapeHandle, orientation, startNative, [endPos.x, endPos.y, endPos.z], false, ignoreSelf];
      hknp.HP_World_ShapeCastWithCollector(hkWorld, this._castCollector, castQuery);
    }
    _findBody(id) {
      const bodies = this._world._bodies;
      for (let i = 0; i < bodies.length; i++) {
        if (bodies[i]._hkBody[0] === id) {
          return bodies[i];
        }
      }
      return null;
    }
    _contactFromCast(cp, castPath, hitFraction) {
      const normal = v(cp[4][0], cp[4][1], cp[4][2]);
      const dist = -hitFraction * vdot(castPath, normal);
      return {
        position: v(cp[3][0], cp[3][1], cp[3][2]),
        normal,
        distance: dist,
        fraction: hitFraction,
        body: this._findBody(cp[0][0]),
        allowedPenetration: clamp(this.keepDistance - dist, 0, this.keepDistance)
      };
    }
    _validateManifold() {
      this._manifold = this._manifold.filter((c) => c.body === null || this._world._bodies.indexOf(c.body) !== -1);
    }
    _updateManifold(castPath) {
      const hknp = this._world._hknp;
      const numProximityHits = hknp.HP_QueryCollector_GetNumHits(this._startCollector)[1];
      if (numProximityHits > 0) {
        const newContacts = [];
        let minDistance = 1e38;
        for (let i = 0; i < numProximityHits; i++) {
          const [distance, , contactWorld] = hknp.HP_QueryCollector_GetShapeProximityResult(this._startCollector, i)[1];
          minDistance = Math.min(minDistance, distance);
          newContacts.push({
            position: v(contactWorld[3][0], contactWorld[3][1], contactWorld[3][2]),
            normal: v(contactWorld[4][0], contactWorld[4][1], contactWorld[4][2]),
            distance,
            fraction: 0,
            body: this._findBody(contactWorld[0][0]),
            allowedPenetration: clamp(this.keepDistance - distance, 0, this.keepDistance)
          });
        }
        for (let i = this._manifold.length - 1; i >= 0; i--) {
          const bestMatch = this._findContact(this._manifold[i], newContacts, 1.1);
          if (bestMatch >= 0) {
            const newAllowed = Math.min(clamp(this.keepDistance - newContacts[bestMatch].distance, 0, this.keepDistance), this._manifold[i].allowedPenetration);
            this._manifold[i] = newContacts[bestMatch];
            this._manifold[i].allowedPenetration = newAllowed;
            newContacts.splice(bestMatch, 1);
          } else {
            this._manifold.splice(i, 1);
          }
        }
        const closestContactIndex = newContacts.findIndex((c) => c.distance === minDistance);
        if (closestContactIndex >= 0) {
          const closest = newContacts[closestContactIndex];
          const bestMatch = this._findContact(closest, this._manifold, 0.1);
          if (bestMatch >= 0) {
            const newAllowed = Math.min(clamp(this.keepDistance - closest.distance, 0, this.keepDistance), this._manifold[bestMatch].allowedPenetration);
            this._manifold[bestMatch] = closest;
            this._manifold[bestMatch].allowedPenetration = newAllowed;
          } else {
            this._manifold.push(closest);
          }
        }
      } else {
        this._manifold.length = 0;
      }
      let numHitBodies = 0;
      const numCastHits = hknp.HP_QueryCollector_GetNumHits(this._castCollector)[1];
      if (numCastHits > 0) {
        let closestHitBodyId = null;
        for (let i = 0; i < numCastHits; i++) {
          const [fraction, , hitWorld] = hknp.HP_QueryCollector_GetShapeCastResult(this._castCollector, i)[1];
          if (closestHitBodyId === null) {
            const contact = this._contactFromCast(hitWorld, castPath, fraction);
            closestHitBodyId = hitWorld[0][0];
            if (this._findContact(contact, this._manifold, 0.1) === -1) {
              this._manifold.push(contact);
            }
            if (contact.body?.motionType === 0 /* STATIC */ || contact.body === null) {
              break;
            }
          } else if (hitWorld[0][0] !== closestHitBodyId) {
            numHitBodies++;
            break;
          }
        }
      }
      return numHitBodies;
    }
    // ─── Contact comparison ──────────────────────────────────────────
    _compareContacts(a, b) {
      const angSquared = (1 - vdot(a.normal, b.normal)) * this._contactAngleSensitivity * this._contactAngleSensitivity;
      const planeDistSquared = (a.distance - b.distance) * (a.distance * b.distance);
      const aVel = this._getPointVelocity(a.body, a.position);
      const bVel = this._getPointVelocity(b.body, b.position);
      const velocityDiffSquared = vlenSq(vsub(aVel, bVel));
      return angSquared * 10 + velocityDiffSquared * 0.1 + planeDistSquared;
    }
    _findContact(reference, list, threshold) {
      let bestIdx = -1;
      let bestFitness = threshold;
      for (let i = 0; i < list.length; i++) {
        const fitness = this._compareContacts(reference, list[i]);
        if (fitness < bestFitness) {
          bestFitness = fitness;
          bestIdx = i;
        }
      }
      return bestIdx;
    }
    // ─── Body kinematics ─────────────────────────────────────────────
    _getMassProperties(body) {
      return this._world._hknp.HP_Body_GetMassProperties(body._hkBody)[1];
    }
    _getComWorld(body) {
      const com = this._getMassProperties(body)[0];
      return transformCoord(body.node.worldMatrix, v(com[0], com[1], com[2]));
    }
    _getPointVelocity(body, pointWorld) {
      if (!body) {
        return v();
      }
      const hknp = this._world._hknp;
      const comWorld = this._getComWorld(body);
      const relPos = vsub(pointWorld, comWorld);
      const avArr = hknp.HP_Body_GetAngularVelocity(body._hkBody)[1];
      const av = v(avArr[0], avArr[1], avArr[2]);
      const lvArr = hknp.HP_Body_GetLinearVelocity(body._hkBody)[1];
      return vadd(vcross(av, relPos), v(lvArr[0], lvArr[1], lvArr[2]));
    }
    _getInvMass(body) {
      const mass = this._getMassProperties(body)[1];
      return mass > 0 ? 1 / mass : 0;
    }
    // ─── Surface constraints ─────────────────────────────────────────
    _createSurfaceConstraint(dt, contact, timeTravelled) {
      const constraint = {
        planeNormal: vclone(contact.normal),
        planeDistance: contact.distance,
        staticFriction: this.staticFriction,
        dynamicFriction: this.dynamicFriction,
        extraUpStaticFriction: 0,
        extraDownStaticFriction: 0,
        velocity: v(),
        angularVelocity: v(),
        priority: 0
      };
      const maxSlopeCosine = Math.max(this.maxSlopeCosine, 0.1);
      const normalDotUp = vdot(contact.normal, this.up);
      if (normalDotUp > maxSlopeCosine) {
        const com = this._position;
        const contactArm = vsub(contact.position, com);
        const scale = vdot(contact.normal, contactArm);
        contact.position.x = com.x + this.up.x * scale;
        contact.position.y = com.y + this.up.y * scale;
        contact.position.z = com.z + this.up.z * scale;
      }
      const motionType = contact.body?.motionType ?? 0 /* STATIC */;
      const shift = vdot(constraint.velocity, constraint.planeNormal) * timeTravelled;
      constraint.planeDistance -= shift;
      if (motionType === 0 /* STATIC */) {
        constraint.priority = 2;
      } else if (motionType === 1 /* ANIMATED */ && contact.body) {
        const body = contact.body;
        const currentWorld = matToArray(body.node.worldMatrix);
        const tracking = this._bodyTracking.get(body);
        if (!tracking) {
          this._bodyTracking.set(body, { prev: currentWorld, frameId: this._frameId });
        } else {
          if (tracking.frameId + 1 === this._frameId) {
            const inv = mat4Invert(body.node.worldMatrix);
            if (inv) {
              const characterLocal = transformCoord(inv, this._position);
              const characterWorld = transformCoord(tracking.prev, characterLocal);
              const playerDelta = vsub(this._position, characterWorld);
              vcopy(constraint.velocity, playerDelta);
              vscaleIn(constraint.velocity, 1 / dt);
              constraint.priority = 1;
            }
          }
          tracking.prev = currentWorld;
          tracking.frameId = this._frameId;
        }
      }
      return constraint;
    }
    _addMaxSlopePlane(maxSlopeCos, index, constraints, allowedPenetration) {
      const src = constraints[index];
      const verticalComponent = vdot(src.planeNormal, this.up);
      if (verticalComponent > 0.01 && verticalComponent < maxSlopeCos) {
        const newConstraint = {
          planeNormal: vclone(src.planeNormal),
          planeDistance: src.planeDistance,
          velocity: vclone(src.velocity),
          angularVelocity: vclone(src.angularVelocity),
          priority: src.priority,
          dynamicFriction: src.dynamicFriction,
          staticFriction: src.staticFriction,
          extraDownStaticFriction: src.extraDownStaticFriction,
          extraUpStaticFriction: src.extraUpStaticFriction
        };
        const distance = newConstraint.planeDistance;
        vsubIn(newConstraint.planeNormal, vscale(this.up, verticalComponent));
        vnormIn(newConstraint.planeNormal);
        if (distance >= 0) {
          newConstraint.planeDistance = distance * vdot(newConstraint.planeNormal, src.planeNormal);
        } else {
          const penetrationToResolve = Math.min(0, distance + allowedPenetration);
          newConstraint.planeDistance = penetrationToResolve / vdot(newConstraint.planeNormal, src.planeNormal);
          src.planeDistance = 0;
          this._resolveConstraintPenetration(newConstraint);
        }
        constraints.push(newConstraint);
      }
    }
    _resolveConstraintPenetration(constraint) {
      if (constraint.planeDistance < -1e-6) {
        vsubIn(constraint.velocity, vscale(constraint.planeNormal, constraint.planeDistance * this.penetrationRecoverySpeed));
      }
    }
    _createConstraintsFromManifold(dt, timeTravelled) {
      const constraints = [];
      for (let i = 0; i < this._manifold.length; i++) {
        const surfaceConstraint = this._createSurfaceConstraint(dt, this._manifold[i], timeTravelled);
        constraints.push(surfaceConstraint);
        this._addMaxSlopePlane(this.maxSlopeCosine, i, constraints, this._manifold[i].allowedPenetration);
        this._resolveConstraintPenetration(surfaceConstraint);
      }
      return constraints;
    }
    // ─── Contact resolution (push dynamic bodies) ────────────────────
    _resolveContacts(deltaTime, gravity) {
      const eps = 1e-12;
      const hknp = this._world._hknp;
      for (const contact of this._manifold) {
        const body = contact.body;
        if (!body || body.motionType !== 2 /* DYNAMIC */) {
          continue;
        }
        const pointRelVel = this._getPointVelocity(body, contact.position);
        vsubIn(pointRelVel, this._velocity);
        const inputProjectedVelocity = vdot(pointRelVel, contact.normal);
        let deltaVelocity = -inputProjectedVelocity * 0.9;
        if (contact.distance < 0) {
          deltaVelocity += contact.distance * 0.4 / deltaTime;
        }
        let outputImpulse = v();
        if (deltaVelocity < 0) {
          const comWorld = this._getComWorld(body);
          const r = vsub(contact.position, comWorld);
          const jacAng = vcross(r, contact.normal);
          const inputObjectMassInv = vlenSq(jacAng) * this._getInvMass(body) + this._getInvMass(body);
          let impulseMag = inputObjectMassInv > 0 ? deltaVelocity / inputObjectMassInv : 0;
          const maxPushImpulse = -this.characterStrength * deltaTime;
          if (impulseMag < maxPushImpulse) {
            impulseMag = maxPushImpulse;
          }
          outputImpulse = vscale(contact.normal, impulseMag);
        }
        let relVelN = vdot(contact.normal, vscale(gravity, deltaTime));
        if (inputProjectedVelocity < 0) {
          relVelN -= inputProjectedVelocity;
        }
        if (relVelN < -eps) {
          vaddIn(outputImpulse, vscale(contact.normal, this.characterMass * relVelN));
        }
        this.onTriggerCollisionObservable.notify({ collider: body, impulse: outputImpulse, impulsePosition: contact.position });
        hknp.HP_Body_ApplyImpulse(body._hkBody, [contact.position.x, contact.position.y, contact.position.z], [outputImpulse.x, outputImpulse.y, outputImpulse.z]);
      }
    }
    // ─── Simplex velocity solver ─────────────────────────────────────
    _getOutput(info, constraint) {
      return info.outputInteractions[info.inputConstraints.indexOf(constraint)];
    }
    _sortInfo(info) {
      for (let i = 0; i < info.numSupportPlanes - 1; i++) {
        for (let j = i + 1; j < info.numSupportPlanes; j++) {
          const p0 = info.supportPlanes[i];
          const p1 = info.supportPlanes[j];
          if (p0.constraint.priority < p1.constraint.priority) {
            continue;
          }
          if (p0.constraint.priority === p1.constraint.priority && vlenSq(p0.constraint.velocity) < vlenSq(p1.constraint.velocity)) {
            continue;
          }
          info.supportPlanes[i] = p1;
          info.supportPlanes[j] = p0;
        }
      }
    }
    _solve1d(sci, velocityIn, velocityOut) {
      const eps = 1e-5;
      const groundVelocity = sci.velocity;
      const relativeVelocity = vsub(velocityIn, groundVelocity);
      const planeVel = vdot(relativeVelocity, sci.planeNormal);
      const origVelocity2 = vlenSq(relativeVelocity);
      vsubIn(relativeVelocity, vscale(sci.planeNormal, planeVel));
      const vp2 = planeVel * planeVel;
      const extraStaticFriction = vdot(relativeVelocity, this.up) > 0 ? sci.extraUpStaticFriction : sci.extraDownStaticFriction;
      if (extraStaticFriction > 0) {
        const horizontal = vcross(this.up, sci.planeNormal);
        const hor2 = vlenSq(horizontal);
        let horVel = 0;
        if (hor2 > eps) {
          vscaleIn(horizontal, 1 / Math.sqrt(hor2));
          horVel = vdot(relativeVelocity, horizontal);
          const horVel2 = horVel * horVel;
          const f22 = sci.staticFriction * sci.staticFriction;
          if (vp2 * f22 >= horVel2) {
            vsubIn(relativeVelocity, vscale(horizontal, horVel));
            horVel = 0;
          }
        }
        const vertVel2 = origVelocity2 - horVel * horVel - vp2;
        const f2 = (sci.staticFriction + extraStaticFriction) * (sci.staticFriction + extraStaticFriction);
        if (vp2 * f2 >= vertVel2 && horVel === 0) {
          vcopy(velocityOut, groundVelocity);
          return;
        }
      } else {
        const f2 = sci.staticFriction * sci.staticFriction;
        if (vp2 * (1 + f2) >= origVelocity2) {
          vcopy(velocityOut, groundVelocity);
          return;
        }
      }
      if (sci.dynamicFriction < 1) {
        const velOut2 = vlenSq(relativeVelocity);
        if (velOut2 >= eps && velOut2 > 1e-4 * origVelocity2) {
          let f = Math.sqrt(origVelocity2 / velOut2);
          f = sci.dynamicFriction + (1 - sci.dynamicFriction) * f;
          vscaleIn(relativeVelocity, f);
          const p = vdot(sci.planeNormal, relativeVelocity);
          vsubIn(relativeVelocity, vscale(sci.planeNormal, p));
        }
      }
      vcopy(velocityOut, relativeVelocity);
      vaddIn(velocityOut, groundVelocity);
    }
    _solveTest1d(sci, velocityIn) {
      const relativeVelocity = vsub(velocityIn, sci.velocity);
      return vdot(relativeVelocity, sci.planeNormal) < -1e-3;
    }
    _solve2d(info, maxSurfaceVelocity, sci0, sci1, velocityIn, velocityOut) {
      const eps = 1e-5;
      const axis = vcross(sci0.planeNormal, sci1.planeNormal);
      const axisLen2 = vlenSq(axis);
      let solveSequentially = false;
      let axisVel = v();
      while (true) {
        if (axisLen2 <= eps || solveSequentially) {
          this._getOutput(info, sci0).status = 2 /* FAILURE_2D */;
          this._getOutput(info, sci1).status = 2 /* FAILURE_2D */;
          if (sci0.priority > sci1.priority) {
            this._solve1d(sci1, velocityIn, velocityOut);
            this._solve1d(sci0, velocityIn, velocityOut);
          } else {
            this._solve1d(sci0, velocityIn, velocityOut);
            this._solve1d(sci1, velocityIn, velocityOut);
          }
          return;
        }
        const invAxisLen = 1 / Math.sqrt(axisLen2);
        vscaleIn(axis, invAxisLen);
        const r0 = vcross(sci0.planeNormal, sci1.planeNormal);
        const r1 = vcross(sci1.planeNormal, axis);
        const r2 = vcross(axis, sci0.planeNormal);
        const sVel = vadd(sci0.velocity, sci1.velocity);
        const t = v(0.5 * vdot(axis, sVel), vdot(sci0.planeNormal, sci0.velocity), vdot(sci1.planeNormal, sci1.velocity));
        axisVel = v(vdot(t, r0), vdot(t, r1), vdot(t, r2));
        vscaleIn(axisVel, invAxisLen);
        if (Math.abs(axisVel.x) > maxSurfaceVelocity.x || Math.abs(axisVel.y) > maxSurfaceVelocity.y || Math.abs(axisVel.z) > maxSurfaceVelocity.z) {
          solveSequentially = true;
        } else {
          break;
        }
      }
      const groundVelocity = axisVel;
      const relativeVelocity = vsub(velocityIn, groundVelocity);
      const vel2 = vlenSq(relativeVelocity);
      const axisVert = vdot(this.up, axis);
      let axisProjVelocity = vdot(relativeVelocity, axis);
      let staticFriction = sci0.staticFriction + sci1.staticFriction;
      if (axisVert * axisProjVelocity > 0) {
        staticFriction += (sci0.extraUpStaticFriction + sci1.extraUpStaticFriction) * axisVert;
      } else {
        staticFriction += (sci0.extraDownStaticFriction + sci1.extraDownStaticFriction) * axisVert;
      }
      staticFriction *= 0.5;
      const dynamicFriction = (sci0.dynamicFriction + sci1.dynamicFriction) * 0.5;
      const f2 = staticFriction * staticFriction;
      const av2 = axisProjVelocity * axisProjVelocity;
      if ((vel2 - av2) * f2 >= av2) {
        vcopy(velocityOut, groundVelocity);
        return;
      }
      if (dynamicFriction < 1 && axisProjVelocity * axisProjVelocity > 1e-4 * vel2) {
        const f = Math.abs(1 / axisProjVelocity) * Math.sqrt(vel2) * (1 - dynamicFriction) + dynamicFriction;
        axisProjVelocity *= f;
      }
      vcopy(velocityOut, groundVelocity);
      vaddIn(velocityOut, vscale(axis, axisProjVelocity));
    }
    _solve3d(info, maxSurfaceVelocity, sci0, sci1, sci2, allowResort, velocityIn, velocityOut) {
      const eps = 1e-5;
      let pointVel = v();
      let r0 = vcross(sci1.planeNormal, sci2.planeNormal);
      let r1 = vcross(sci2.planeNormal, sci0.planeNormal);
      let r2 = vcross(sci0.planeNormal, sci1.planeNormal);
      let det = vdot(r0, sci0.planeNormal);
      let solveSequentially = false;
      while (true) {
        if (Math.abs(det) < eps || solveSequentially) {
          if (allowResort) {
            this._sortInfo(info);
            sci0 = info.supportPlanes[0].constraint;
            sci1 = info.supportPlanes[1].constraint;
            sci2 = info.supportPlanes[2].constraint;
          }
          this._getOutput(info, sci0).status = 1 /* FAILURE_3D */;
          this._getOutput(info, sci1).status = 1 /* FAILURE_3D */;
          this._getOutput(info, sci2).status = 1 /* FAILURE_3D */;
          const oldNum = info.numSupportPlanes;
          this._solve2d(info, maxSurfaceVelocity, sci0, sci1, velocityIn, velocityOut);
          if (oldNum === info.numSupportPlanes) {
            this._solve2d(info, maxSurfaceVelocity, sci0, sci2, velocityIn, velocityOut);
          }
          if (oldNum === info.numSupportPlanes) {
            this._solve2d(info, maxSurfaceVelocity, sci1, sci2, velocityIn, velocityOut);
          }
          return;
        }
        const t = v(vdot(sci0.planeNormal, sci0.velocity), vdot(sci1.planeNormal, sci1.velocity), vdot(sci2.planeNormal, sci2.velocity));
        pointVel = {
          x: t.x * r0.x + t.y * r1.x + t.z * r2.x,
          y: t.x * r0.y + t.y * r1.y + t.z * r2.y,
          z: t.x * r0.z + t.y * r1.z + t.z * r2.z
        };
        vscaleIn(pointVel, 1 / det);
        if (Math.abs(pointVel.x) > maxSurfaceVelocity.x || Math.abs(pointVel.y) > maxSurfaceVelocity.y || Math.abs(pointVel.z) > maxSurfaceVelocity.z) {
          solveSequentially = true;
        } else {
          break;
        }
        r0 = vcross(sci1.planeNormal, sci2.planeNormal);
        r1 = vcross(sci2.planeNormal, sci0.planeNormal);
        r2 = vcross(sci0.planeNormal, sci1.planeNormal);
        det = vdot(r0, sci0.planeNormal);
      }
      vcopy(velocityOut, pointVel);
    }
    _examineActivePlanes(info, maxSurfaceVelocity, velocityIn, velocityOut) {
      while (true) {
        switch (info.numSupportPlanes) {
          case 1: {
            this._solve1d(info.supportPlanes[0].constraint, velocityIn, velocityOut);
            return;
          }
          case 2: {
            const velocity = v();
            this._solve1d(info.supportPlanes[1].constraint, velocityIn, velocity);
            if (!this._solveTest1d(info.supportPlanes[0].constraint, velocity)) {
              this._copyPlane(info.supportPlanes[0], info.supportPlanes[1]);
              info.numSupportPlanes = 1;
              vcopy(velocityOut, velocity);
            } else {
              this._solve2d(info, maxSurfaceVelocity, info.supportPlanes[0].constraint, info.supportPlanes[1].constraint, velocityIn, velocityOut);
            }
            return;
          }
          case 3: {
            {
              const velocity = v();
              this._solve1d(info.supportPlanes[2].constraint, velocityIn, velocityOut);
              if (!this._solveTest1d(info.supportPlanes[0].constraint, velocity) && !this._solveTest1d(info.supportPlanes[1].constraint, velocity)) {
                vcopy(velocityOut, velocity);
                this._copyPlane(info.supportPlanes[0], info.supportPlanes[2]);
                info.numSupportPlanes = 1;
                continue;
              }
            }
            {
              let droppedAPlane = false;
              for (let testPlane = 0; testPlane < 2; testPlane++) {
                this._solve2d(info, maxSurfaceVelocity, info.supportPlanes[testPlane].constraint, info.supportPlanes[2].constraint, velocityIn, velocityOut);
                if (!this._solveTest1d(info.supportPlanes[1 - testPlane].constraint, velocityOut)) {
                  this._copyPlane(info.supportPlanes[0], info.supportPlanes[testPlane]);
                  this._copyPlane(info.supportPlanes[1], info.supportPlanes[2]);
                  info.numSupportPlanes--;
                  droppedAPlane = true;
                  break;
                }
              }
              if (droppedAPlane) {
                continue;
              }
            }
            this._solve3d(
              info,
              maxSurfaceVelocity,
              info.supportPlanes[0].constraint,
              info.supportPlanes[1].constraint,
              info.supportPlanes[2].constraint,
              true,
              velocityIn,
              velocityOut
            );
            return;
          }
          case 4: {
            this._sortInfo(info);
            let droppedAPlane = false;
            for (let i = 0; i < 3; i++) {
              const velocity = v();
              this._solve3d(
                info,
                maxSurfaceVelocity,
                info.supportPlanes[(i + 1) % 3].constraint,
                info.supportPlanes[(i + 2) % 3].constraint,
                info.supportPlanes[3].constraint,
                false,
                velocityIn,
                velocity
              );
              if (!this._solveTest1d(info.supportPlanes[i].constraint, velocity)) {
                this._copyPlane(info.supportPlanes[i], info.supportPlanes[2]);
                this._copyPlane(info.supportPlanes[2], info.supportPlanes[3]);
                info.numSupportPlanes = 3;
                droppedAPlane = true;
                break;
              }
            }
            if (droppedAPlane) {
              continue;
            }
            {
              const velocity = vclone(velocityIn);
              this._solve3d(
                info,
                maxSurfaceVelocity,
                info.supportPlanes[0].constraint,
                info.supportPlanes[1].constraint,
                info.supportPlanes[2].constraint,
                false,
                velocity,
                velocity
              );
              vcopy(velocityOut, velocity);
            }
            {
              let maxStatus = 0 /* OK */;
              for (let i = 0; i < 4; i++) {
                maxStatus = Math.max(maxStatus, info.supportPlanes[i].interaction.status);
              }
              for (let i = 0; i < 4; i++) {
                if (maxStatus === info.supportPlanes[i].interaction.status) {
                  this._copyPlane(info.supportPlanes[i], info.supportPlanes[3]);
                  break;
                }
                info.numSupportPlanes--;
              }
            }
            for (let i = 0; i < 3; i++) {
              info.supportPlanes[i].interaction.status = 0 /* OK */;
            }
            continue;
          }
          default:
            return;
        }
      }
    }
    _copyPlane(dst, src) {
      dst.index = src.index;
      dst.constraint = src.constraint;
      dst.interaction = src.interaction;
    }
    _simplexSolverSolve(constraints, velocity, deltaTime, minDeltaTime, maxSurfaceVelocity) {
      const eps = 1e-6;
      const output = {
        position: v(),
        velocity: vclone(velocity),
        deltaTime,
        planeInteractions: []
      };
      for (let i = 0; i < constraints.length; i++) {
        output.planeInteractions.push({ touched: false, stopped: false, surfaceTime: 0, penaltyDistance: 0, status: 0 /* OK */ });
      }
      const info = {
        supportPlanes: [],
        numSupportPlanes: 0,
        currentTime: 0,
        inputConstraints: constraints,
        outputInteractions: output.planeInteractions
      };
      const emptyConstraint = () => ({
        planeNormal: v(),
        planeDistance: 0,
        staticFriction: 0,
        dynamicFriction: 0,
        extraUpStaticFriction: 0,
        extraDownStaticFriction: 0,
        velocity: v(),
        angularVelocity: v(),
        priority: 0
      });
      const emptyInteraction = () => ({ touched: false, stopped: false, surfaceTime: 0, penaltyDistance: 0, status: 0 /* OK */ });
      for (let i = 0; i < 4; i++) {
        info.supportPlanes.push({ index: -1, constraint: emptyConstraint(), interaction: emptyInteraction() });
      }
      let remainingTime = deltaTime;
      while (remainingTime > 0) {
        let hitIndex = -1;
        let minCollisionTime = remainingTime;
        for (let i = 0; i < constraints.length; i++) {
          if (info.numSupportPlanes >= 1 && info.supportPlanes[0].index === i) {
            continue;
          }
          if (info.numSupportPlanes >= 2 && info.supportPlanes[1].index === i) {
            continue;
          }
          if (info.numSupportPlanes >= 3 && info.supportPlanes[2].index === i) {
            continue;
          }
          if (output.planeInteractions[i].status !== 0 /* OK */) {
            continue;
          }
          const sci = constraints[i];
          const relativeVel = vsub(output.velocity, sci.velocity);
          const relativeProjectedVel = -vdot(relativeVel, sci.planeNormal);
          if (relativeProjectedVel <= 0) {
            continue;
          }
          const relativePos = vsub(output.position, vscale(sci.velocity, info.currentTime));
          let projectedPos = vdot(sci.planeNormal, relativePos);
          const penaltyDist = output.planeInteractions[i].penaltyDistance;
          if (penaltyDist < eps) {
            projectedPos = 0;
          }
          projectedPos += penaltyDist;
          if (projectedPos < minCollisionTime * relativeProjectedVel) {
            minCollisionTime = projectedPos / relativeProjectedVel;
            hitIndex = i;
          }
        }
        if (minCollisionTime > 1e-4) {
          info.currentTime += minCollisionTime;
          remainingTime -= minCollisionTime;
          vaddIn(output.position, vscale(output.velocity, minCollisionTime));
          for (let i = 0; i < info.numSupportPlanes; i++) {
            info.supportPlanes[i].interaction.surfaceTime += minCollisionTime;
            info.supportPlanes[i].interaction.touched = true;
          }
          output.deltaTime = info.currentTime;
          if (info.currentTime > minDeltaTime) {
            return output;
          }
        }
        if (hitIndex < 0) {
          output.deltaTime = deltaTime;
          break;
        }
        const supportPlane = info.supportPlanes[info.numSupportPlanes++];
        supportPlane.constraint = constraints[hitIndex];
        supportPlane.interaction = output.planeInteractions[hitIndex];
        supportPlane.interaction.penaltyDistance = (supportPlane.interaction.penaltyDistance + eps) * 2;
        supportPlane.index = hitIndex;
        this._examineActivePlanes(info, maxSurfaceVelocity, velocity, output.velocity);
      }
      return output;
    }
  };
  var ZERO = { x: 0, y: 0, z: 0 };
  function matToArray(m) {
    const out = new Array(16);
    for (let i = 0; i < 16; i++) {
      out[i] = m[i];
    }
    return out;
  }
  function createPhysicsCharacterController(world, position, options) {
    return new PhysicsCharacterController(world, position, options);
  }

  // ../../../Babylon-Lite/lab/lite/src/lite/scene104.ts
  var PHYSICS_FPS = 60;
  var LEVEL_URL = "https://raw.githubusercontent.com/CedricGuillemet/dump/master/CharController/levelTest.glb";
  var LIGHTMAP_URL = "https://raw.githubusercontent.com/CedricGuillemet/dump/master/CharController/lightmap.jpg";
  var CAPTURE_FRAMES = 55;
  var CHARACTER_START = { x: 3, y: 0.3, z: -8 };
  var CAPSULE_HEIGHT = 1.8;
  var CAPSULE_RADIUS = 0.6;
  var AUTOTEST_INPUT = { x: 0, y: -0.5, z: 1 };
  var IDLE_INPUT = { x: 0, y: -0.5, z: 0 };
  var CUBES = [
    { x: 5.1167, y: -0.2178, z: -8.9338 },
    { x: 5.1167, y: -0.2178, z: -10.194 },
    { x: 5.1167, y: 0.7922, z: -9.5777 },
    { x: 5.1167, y: -0.2178, z: -11.4473 },
    { x: 5.2025, y: 0.7852, z: -10.9095 },
    { x: 5.0466, y: 1.7915, z: -10.2446 }
  ];
  var CUBE_COLOR = [0.45, 0.55, 0.85];
  function readCaptureFrames() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("captureFrame");
    if (value !== null) {
      const frame = Number(value);
      return Number.isFinite(frame) && frame >= 0 ? Math.round(frame) : CAPTURE_FRAMES;
    }
    return CAPTURE_FRAMES;
  }
  function updateCameraFollow(camera, target) {
    let fx = camera.target.x - camera.position.x;
    let fz = camera.target.z - camera.position.z;
    const flen = Math.hypot(fx, fz) || 1;
    fx /= flen;
    fz /= flen;
    camera.target.set(
      camera.target.x + (target.x - camera.target.x) * 0.1,
      camera.target.y + (target.y - camera.target.y) * 0.1,
      camera.target.z + (target.z - camera.target.z) * 0.1
    );
    const dist = Math.hypot(camera.position.x - target.x, camera.position.y - target.y, camera.position.z - target.z);
    const amount = (Math.min(dist - 6, 0) + Math.max(dist - 9, 0)) * 0.04;
    camera.position.set(camera.position.x + fx * amount, camera.position.y + (target.y + 2 - camera.position.y) * 0.04, camera.position.z + fz * amount);
  }
  function makeMaterial(color) {
    const mat = createStandardMaterial();
    mat.diffuseColor = color;
    mat.specularColor = [0.04, 0.04, 0.04];
    return mat;
  }
  function wireKeyboardInput(input) {
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "w":
        case "ArrowUp":
          input.z = 1;
          break;
        case "s":
        case "ArrowDown":
          input.z = -1;
          break;
        case "a":
        case "ArrowLeft":
          input.x = -1;
          break;
        case "d":
        case "ArrowRight":
          input.x = 1;
          break;
        case " ":
          input.y = 1;
          break;
      }
    });
    window.addEventListener("keyup", (e) => {
      switch (e.key) {
        case "w":
        case "s":
        case "ArrowUp":
        case "ArrowDown":
          input.z = 0;
          break;
        case "a":
        case "d":
        case "ArrowLeft":
        case "ArrowRight":
          input.x = 0;
          break;
        case " ":
          input.y = -0.5;
          break;
      }
    });
  }
  function isMeshNode(node) {
    return typeof node === "object" && node !== null && "_gpu" in node;
  }
  function hasChildren(node) {
    return typeof node === "object" && node !== null && "children" in node && Array.isArray(node.children);
  }
  function collectByOwner(node, ownerName, out) {
    for (const child of node.children) {
      if (isMeshNode(child)) {
        const list = out.get(ownerName) ?? [];
        list.push(child);
        out.set(ownerName, list);
      }
      if (hasChildren(child)) {
        collectByOwner(child, isMeshNode(child) ? ownerName : child.name, out);
      }
    }
  }
  function buildOwnerMap(container) {
    const out = /* @__PURE__ */ new Map();
    for (const entity of container.entities) {
      if (hasChildren(entity)) {
        collectByOwner(entity, entity.name, out);
      }
    }
    return out;
  }
  function collectAllMeshes(node, out) {
    if (isMeshNode(node)) {
      out.push(node);
    }
    if (hasChildren(node)) {
      for (const child of node.children) {
        collectAllMeshes(child, out);
      }
    }
  }
  function buildLevelCollider(world, levelMeshes) {
    const flip = createTransformNode("levelFlip", 0, 0, 0, 0, 0, 0, 1, -1, 1, 1);
    for (const mesh of levelMeshes) {
      const clone = cloneTransformNode(mesh);
      clone.position.set(0, 0, 0);
      clone.scaling.set(1, 1, 1);
      clone.rotationQuaternion.set(0, 0, 0, 1);
      clone.parent = flip;
      flip.children.push(clone);
    }
    const shape = createPhysicsShape(world, { type: 6 /* MESH */, mesh: flip, includeChildMeshes: true });
    const body = createPhysicsBody(world, flip, 0 /* STATIC */);
    setPhysicsBodyShape(world, body, shape);
  }
  async function main() {
    const __initStart = performance.now();
    const canvas = document.getElementById("renderCanvas");
    const engine = await createEngine(canvas);
    const scene = createSceneContext(engine);
    scene.fixedDeltaMs = 1e3 / PHYSICS_FPS;
    const autoTest = new URLSearchParams(window.location.search).has("captureFrame");
    const captureFrames = readCaptureFrames();
    const camera = createFreeCamera({ x: 0, y: 5, z: -5 }, CHARACTER_START);
    scene.camera = camera;
    const light = createHemisphericLight([0, 1, 0]);
    light.intensity = 0.7;
    addToScene(scene, light);
    const hknp = await HavokPhysics_es_default({ locateFile: () => "/HavokPhysics.wasm" });
    const world = createHavokWorld(scene, hknp, { x: 0, y: -9.8, z: 0 });
    const container = await loadGltf(engine, LEVEL_URL);
    const owners = buildOwnerMap(container);
    const levelMeshes = owners.get("level") ?? [];
    const levelSet = new Set(levelMeshes);
    const lightmap = await loadTexture2D(engine, LIGHTMAP_URL);
    lightmap.uAng = Math.PI;
    const allMeshes = [];
    for (const entity of container.entities) {
      collectAllMeshes(entity, allMeshes);
    }
    for (const mesh of allMeshes) {
      const isLevel = levelSet.has(mesh);
      if (isLevel) {
        const pbr = mesh.material;
        const mat = createStandardMaterial();
        if (pbr.baseColorTexture) {
          mat.diffuseTexture = pbr.baseColorTexture;
        }
        mat.specularColor = [0, 0, 0];
        mat.lightmapTexture = lightmap;
        mat.useLightmapAsShadowmap = true;
        mat.lightmapLevel = 3.2;
        mat.lightmapCoordIndex = 1;
        mesh.material = mat;
      } else {
        mesh.material = makeMaterial(CUBE_COLOR);
        mesh.visible = false;
      }
    }
    addToScene(scene, container);
    buildLevelCollider(world, levelMeshes);
    const boxMass = 0.1;
    CUBES.forEach((p, i) => {
      const box = createBox(engine, 1);
      box.name = "cube" + i;
      box.position.set(p.x, p.y, p.z);
      box.material = makeMaterial(CUBE_COLOR);
      addToScene(scene, box);
      createPhysicsAggregate(world, box, 3 /* BOX */, { mass: boxMass });
    });
    if (!autoTest) {
      const fixedMesh = createBox(engine, 2);
      fixedMesh.position.set(19.0498, -0.4281, -11.6688);
      fixedMesh.rotationQuaternion.set(0, 0, -0.70710678, 0.70710678);
      fixedMesh.scaling.set(0.2782, 0.0667, 0.6894);
      fixedMesh.material = makeMaterial(CUBE_COLOR);
      addToScene(scene, fixedMesh);
      const fixed = createPhysicsAggregate(world, fixedMesh, 3 /* BOX */, {
        mass: 0,
        extents: { x: 2 * 0.2782, y: 2 * 0.0667, z: 2 * 0.6894 }
      });
      const planeMesh = createBox(engine, 2);
      planeMesh.position.set(19.045139, 0.071943, -11.6688);
      planeMesh.rotationQuaternion.set(0.713661, 0.700491, 0, 0);
      planeMesh.scaling.set(0.03, 3, 1);
      planeMesh.material = makeMaterial(CUBE_COLOR);
      addToScene(scene, planeMesh);
      const plane = createPhysicsAggregate(world, planeMesh, 3 /* BOX */, {
        mass: 0.1,
        extents: { x: 2 * 0.03, y: 2 * 3, z: 2 * 1 }
      });
      createPhysicsConstraint(world, fixed.body, plane.body, 3 /* HINGE */, {
        // Pivots have their X negated vs the playground because the bodies live in the -X
        // reflected world (anchors then coincide as in PG #WO0H1U#165). Axes have X=0 so are unchanged.
        pivotA: { x: -0.75, y: 0, z: 0 },
        pivotB: { x: 0.25, y: 0, z: 0 },
        axisA: { x: 0, y: 0, z: -1 },
        axisB: { x: 0, y: 0, z: 1 }
      });
    }
    const displayCapsule = createCapsule(engine, { height: CAPSULE_HEIGHT, radius: CAPSULE_RADIUS });
    displayCapsule.material = makeMaterial([0.85, 0.55, 0.2]);
    displayCapsule.position.set(CHARACTER_START.x, CHARACTER_START.y, CHARACTER_START.z);
    addToScene(scene, displayCapsule);
    const character = createPhysicsCharacterController(world, CHARACTER_START, { capsuleHeight: CAPSULE_HEIGHT, capsuleRadius: CAPSULE_RADIUS });
    const collisions = [];
    character.onTriggerCollisionObservable.add((event) => {
      const pos = event.impulsePosition;
      console.log(`Character collision : ${event.collider.node.name} at (${pos.x}, ${pos.y}, ${pos.z})`);
      if (autoTest) {
        collisions.push({ collider: event.collider.node.name, impulsePosition: { x: round(pos.x), y: round(pos.y), z: round(pos.z) } });
      }
    });
    const inputDirection = autoTest ? { ...AUTOTEST_INPUT } : { ...IDLE_INPUT };
    if (!autoTest) {
      wireKeyboardInput(inputDirection);
    }
    let steps = 0;
    let captureQueued = false;
    onPhysicsAfterStep(world, (dt) => {
      const yaw = Math.atan2(camera.target.x - camera.position.x, camera.target.z - camera.position.z);
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const s = dt * 2;
      const displacement = {
        x: (inputDirection.x * cos + inputDirection.z * sin) * s,
        y: inputDirection.y * s,
        z: (-inputDirection.x * sin + inputDirection.z * cos) * s
      };
      character.moveWithCollisions(displacement);
      const p = character.getPosition();
      displayCapsule.position.set(p.x, p.y, p.z);
      updateCameraFollow(camera, p);
      if (!autoTest) {
        return;
      }
      steps++;
      if (!captureQueued && steps >= captureFrames) {
        captureQueued = true;
        window.setTimeout(() => {
          canvas.dataset.charPos = JSON.stringify({ x: round(p.x), y: round(p.y), z: round(p.z) });
          canvas.dataset.collisions = JSON.stringify(collisions);
          canvas.dataset.captureReady = "true";
          stopEngine(engine);
        }, 0);
      }
    });
    await registerScene(scene);
    await startEngine(engine);
    canvas.dataset.initMs = String(performance.now() - __initStart);
    canvas.dataset.ready = "true";
  }
  function round(value) {
    return Math.round(value * 1e3) / 1e3;
  }
  main().catch((err) => {
    const canvas = document.getElementById("renderCanvas");
    if (canvas) {
      canvas.dataset.error = err instanceof Error ? err.message : String(err);
    }
    console.error(err);
  });
})();
