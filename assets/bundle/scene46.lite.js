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
  var F32, F64, U32, U8;
  var init_typed_arrays = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/typed-arrays.ts"() {
      "use strict";
      F32 = Float32Array;
      F64 = Float64Array;
      U32 = Uint32Array;
      U8 = Uint8Array;
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
    Object.defineProperty(cam, "_yaw", {
      get() {
        return _yaw;
      },
      set(v) {
        if (_yaw !== v) {
          _yaw = v;
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
      set(v) {
        if (_pitch !== v) {
          _pitch = v;
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
        set(v) {
          wm.parent = v;
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/standard/standard-flags.ts
  function _registerStdExt(ext) {
    (_stdExts ?? (_stdExts = /* @__PURE__ */ new Map())).set(ext._id, ext);
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
  var _stdFactory;
  var init_csm_receiver_registry = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shadow/csm-receiver-registry.ts"() {
      "use strict";
      _stdFactory = null;
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
    for (const ext of _getStdExts().values()) {
      ext._textures?.(mat, t);
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
    for (const v of base) {
      if (!seen.has(v._name)) {
        seen.add(v._name);
        all.push(v);
      }
    }
    for (const v of extra) {
      if (!seen.has(v._name)) {
        seen.add(v._name);
        all.push(v);
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
` + allVary.map((v, i) => `@location(${i}) ${v._name}:${v._type},`).join("\n");
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
    for (const ext of sortedExts) {
      if (features & ext._feature && ext._bind) {
        nextBinding = ext._bind(material, entries, nextBinding);
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
      for (const ext of _getStdExts().values()) {
        if (features & ext._feature) {
          const f = ext._frag(features);
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
  function vec3Array(v) {
    return [v.x, v.y, v.z];
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
  function normalizeVec3(v) {
    const inv = 1 / Math.max(1e-8, Math.hypot(v.x, v.y, v.z));
    return { x: v.x * inv, y: v.y * inv, z: v.z * inv };
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
  var ZERO_VEC3, X_AXIS;
  var init_havok = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/physics/havok.ts"() {
      "use strict";
      init_scene_core();
      ZERO_VEC3 = { x: 0, y: 0, z: 0 };
      X_AXIS = { x: 1, y: 0, z: 0 };
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
      var embindRepr = (v) => {
        if (v === null) {
          return "null";
        }
        var t = typeof v;
        if (t === "object" || t === "array" || t === "function") {
          return v.toString();
        } else {
          return "" + v;
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_create_standard_material();
  init_havok();

  // ../../../Babylon-Lite/lab/lite/src/lite/scene46.ts
  var PHYSICS_FPS = 60;
  var curX = -8;
  function readCaptureAfterFrames() {
    const params = new URLSearchParams(window.location.search);
    const frameValue = params.get("captureFrame");
    if (frameValue !== null) {
      const frame = Number(frameValue);
      return Number.isFinite(frame) && frame >= 0 ? Math.round(frame) : null;
    }
    return null;
  }
  function colorFor(index) {
    return [(index * 83 + 37 & 255) / 255, (index * 149 + 91 & 255) / 255, (index * 211 + 53 & 255) / 255];
  }
  function makeMaterial(color) {
    const mat = createStandardMaterial();
    mat.diffuseColor = color;
    mat.specularColor = [0.08, 0.08, 0.08];
    return mat;
  }
  function addBox(scene, engine, name, x, y, z, sx, sy, sz, color) {
    const mesh = createBox(engine, 1);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scaling.set(sx, sy, sz);
    mesh.material = makeMaterial(color);
    addToScene(scene, mesh);
    return mesh;
  }
  function addAggregate(world, mesh, mass) {
    return createPhysicsAggregate(world, mesh, 3 /* BOX */, { mass, restitution: 1, extents: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z } });
  }
  function ballAndSocket(scene, engine, world) {
    const col = colorFor(0);
    const box1 = addBox(scene, engine, "ballAndSocketBox1", curX, 1, 0, 1, 0.2, 1, col);
    const box2 = addBox(scene, engine, "ballAndSocketBox2", curX, 1, -1, 1, 0.2, 1, col);
    const agg1 = addAggregate(world, box1, 0);
    const agg2 = addAggregate(world, box2, 1);
    createPhysicsConstraint(world, agg1.body, agg2.body, 1 /* BALL_AND_SOCKET */, {
      pivotA: { x: -0.5, y: 0, z: -0.5 },
      pivotB: { x: -0.5, y: 0, z: 0.5 },
      axisA: { x: 0, y: 1, z: 0 },
      axisB: { x: 0, y: 1, z: 0 }
    });
    curX += 2;
  }
  function distance(scene, engine, world) {
    const col = colorFor(1);
    const sphere = createSphere(engine, { diameter: 1, segments: 5 });
    sphere.name = "distanceSphere1";
    sphere.position.set(curX, 1, 0);
    sphere.material = makeMaterial(col);
    addToScene(scene, sphere);
    const box = addBox(scene, engine, "distanceBox1", curX, 1, -2, 1, 1, 1, col);
    const agg1 = createPhysicsAggregate(world, sphere, 0 /* SPHERE */, { mass: 0, restitution: 0.9 });
    const agg2 = addAggregate(world, box, 1);
    createPhysicsConstraint(world, agg1.body, agg2.body, 2 /* DISTANCE */, { maxDistance: 2 });
    curX += 2;
  }
  function hinge(scene, engine, world) {
    const col = colorFor(2);
    const box1 = addBox(scene, engine, "hingeBox1", curX, 1, 0, 1, 0.2, 1, col);
    const box2 = addBox(scene, engine, "hingeBox2", curX, 1, -1, 1, 0.2, 1, col);
    const agg1 = addAggregate(world, box1, 0);
    const agg2 = addAggregate(world, box2, 1);
    createPhysicsConstraint(world, agg1.body, agg2.body, 3 /* HINGE */, {
      pivotA: { x: 0, y: 0, z: -0.5 },
      pivotB: { x: 0, y: 0, z: 0.5 },
      axisA: { x: 1, y: 0, z: 0 },
      axisB: { x: 1, y: 0, z: 0 }
    });
    curX += 2;
  }
  function prismatic(scene, engine, world, slider = false) {
    const col = colorFor(slider ? 5 : 3);
    const box1 = addBox(scene, engine, slider ? "sliderBox1" : "prismaticBox1", curX, 0, 0, 0.2, 3, 0.2, col);
    const box2 = addBox(scene, engine, slider ? "sliderBox2" : "prismaticBox2", curX, 1.5, -0.2, 0.2, 0.5, 0.2, col);
    const box3 = addBox(scene, engine, slider ? "sliderBase" : "prismaticBase", curX, -1.5, 0, 1.5, 0.1, 1.5, col);
    const agg1 = addAggregate(world, box1, 0);
    const agg2 = addAggregate(world, box2, 1);
    addAggregate(world, box3, 0);
    createPhysicsConstraint(world, agg1.body, agg2.body, slider ? 4 /* SLIDER */ : 6 /* PRISMATIC */, {
      pivotA: { x: 0, y: 0, z: -0.2 },
      pivotB: { x: 0, y: 0, z: 0.25 },
      axisA: { x: 0, y: 1, z: 0 },
      axisB: { x: 0, y: 1, z: 0 }
    });
    curX += 2;
  }
  function locked(scene, engine, world) {
    const col = colorFor(4);
    const box1 = addBox(scene, engine, "fixedBox1", curX, 0, 0, 1, 1, 1, col);
    const box2 = addBox(scene, engine, "fixedBox2", curX, 0, -2, 1, 1, 1, col);
    const agg1 = addAggregate(world, box1, 0);
    const agg2 = addAggregate(world, box2, 1);
    createPhysicsConstraint(world, agg1.body, agg2.body, 5 /* LOCK */, {
      pivotA: { x: 0.5, y: 0.5, z: -0.5 },
      pivotB: { x: -0.5, y: -0.5, z: 0.5 },
      axisA: { x: 0, y: 1, z: 0 },
      axisB: { x: 0, y: 1, z: 0 }
    });
    curX += 2;
  }
  function sixdof(scene, engine, world) {
    const col = colorFor(6);
    const box1 = addBox(scene, engine, "sixdofBox1", curX, 0, 0, 1, 1, 1, col);
    const box2 = addBox(scene, engine, "sixdofBox2", curX, 1.5, -0.2, 1, 1, 1, col);
    const agg1 = addAggregate(world, box1, 0);
    const agg2 = addAggregate(world, box2, 1);
    createPhysicsConstraint(
      world,
      agg1.body,
      agg2.body,
      7 /* SIX_DOF */,
      { pivotA: { x: 0, y: -0.5, z: 0 }, pivotB: { x: 0, y: 0.5, z: 0 }, perpAxisA: { x: 1, y: 0, z: 0 }, perpAxisB: { x: 1, y: 0, z: 0 } },
      [{ axis: 6 /* LINEAR_DISTANCE */, minLimit: 1, maxLimit: 2 }]
    );
    curX += 2;
  }
  async function main() {
    const __initStart = performance.now();
    const canvas = document.getElementById("renderCanvas");
    const engine = await createEngine(canvas);
    const scene = createSceneContext(engine);
    scene.fixedDeltaMs = 1e3 / PHYSICS_FPS;
    const captureAfterFrames = readCaptureAfterFrames();
    curX = -8;
    scene.camera = createFreeCamera({ x: 0, y: 4, z: -24 }, { x: 0, y: 0, z: 0 });
    const light = createHemisphericLight([0, 1, 0]);
    light.intensity = 0.7;
    addToScene(scene, light);
    const light2 = createHemisphericLight([0, -1, 0]);
    light2.intensity = 0.2;
    addToScene(scene, light2);
    let simulationStarted = false;
    let simulatedFrames = 0;
    let captureQueued = false;
    onBeforeRender(scene, () => {
      canvas.dataset.drawCalls = String(engine.drawCallCount);
      if (simulationStarted) {
        simulatedFrames++;
      }
      if (captureAfterFrames !== null && !captureQueued && simulatedFrames >= captureAfterFrames) {
        captureQueued = true;
        canvas.dataset.captureReady = "true";
        window.setTimeout(() => stopEngine(engine), 0);
      }
    });
    const hknp = await HavokPhysics_es_default({ locateFile: () => "/HavokPhysics.wasm" });
    const world = createHavokWorld(scene, hknp, { x: 0, y: -10, z: 0 });
    ballAndSocket(scene, engine, world);
    distance(scene, engine, world);
    hinge(scene, engine, world);
    prismatic(scene, engine, world);
    locked(scene, engine, world);
    prismatic(scene, engine, world, true);
    sixdof(scene, engine, world);
    await registerScene(scene);
    await startEngine(engine);
    simulationStarted = true;
    canvas.dataset.initMs = String(performance.now() - __initStart);
    canvas.dataset.ready = "true";
  }
  main().catch((err) => {
    const canvas = document.getElementById("renderCanvas");
    if (canvas) {
      canvas.dataset.error = err instanceof Error ? err.message : String(err);
    }
    console.error(err);
  });
})();
