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

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\gaussian-splatting.wgsl
  var init_gaussian_splatting = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\gaussian-splatting.wgsl"() {
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
  var init_gaussian_splatting_pipeline = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gaussian-splatting-pipeline.ts"() {
      "use strict";
      init_gaussian_splatting();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gs-gpu-picking-fragment.ts
  function encodeIdToColor(id) {
    return [(id >> 16 & 255) / 255, (id >> 8 & 255) / 255, (id & 255) / 255];
  }
  var gsGpuPickingFragment;
  var init_gs_gpu_picking_fragment = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/mesh/GaussianSplatting/gs-gpu-picking-fragment.ts"() {
      "use strict";
      gsGpuPickingFragment = {
        id: "gsGpuPicking",
        helperFunctions: (
          /* wgsl */
          `
struct GsPickingU { pickingColor: vec3<f32> };
@group(2) @binding(0) var<uniform> picking: GsPickingU;
`
        ),
        fragmentSlots: {
          GS_FRAGMENT_BEFORE_FRAGCOLOR: (
            /* wgsl */
            `
            if (finalColor.a < 0.001) { discard; }
            finalColor = vec4<f32>(picking.pickingColor, 1.0);
        `
          )
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/picking-shader.ts
  function pickDiscardSource(opts) {
    return opts?.discardWgsl ?? DEFAULT_PICK_DISCARD;
  }
  function pickDiscardStorageDecls(opts) {
    const storage = opts?.storage;
    if (!storage || storage.length === 0) {
      return "";
    }
    return storage.map((s, binding) => `@group(2) @binding(${binding}) var<storage, read> ${s.name}: ${s.type};`).join("\n");
  }
  function pickingShaderSource(opts) {
    return (
      /* wgsl */
      `
struct SceneUniforms { viewProjection: mat4x4f };
struct MeshUniforms {
world: mat4x4f,
pickId: u32,
};
@group(0) @binding(0) var<uniform> scene: SceneUniforms;
@group(1) @binding(0) var<uniform> mesh: MeshUniforms;
${PICK_DISCARD_INPUT}
${pickDiscardStorageDecls(opts)}
${pickDiscardSource(opts)}
${PICK_FS}
@vertex fn vs(@location(0) position: vec3f) -> VsOut {
var out: VsOut;
let wp = (mesh.world * vec4f(position, 1.0)).xyz;
out.position = scene.viewProjection * vec4f(wp, 1.0);
out.pickId = mesh.pickId;
out.worldPos = wp;
out.thinInstanceIndex = 0xffffffffu;
out.hasThinInstance = 0u;
out.instanceExtras = vec4f(0.0);
return out;
}
`
    );
  }
  function pickingThinInstanceShaderSource(opts) {
    return (
      /* wgsl */
      `
struct SceneUniforms { viewProjection: mat4x4f };
struct TIMeshUniforms {
baseMeshPickId: u32,
};
@group(0) @binding(0) var<uniform> scene: SceneUniforms;
@group(1) @binding(0) var<uniform> tiMesh: TIMeshUniforms;
@group(1) @binding(1) var<storage, read> instances: array<mat4x4f>;
${PICK_DISCARD_INPUT}
${pickDiscardStorageDecls(opts)}
${pickDiscardSource(opts)}
${PICK_FS}
@vertex fn vs(@location(0) position: vec3f, @builtin(instance_index) instanceIndex: u32) -> VsOut {
let m = instances[instanceIndex];
// Treat the instance placement as an AFFINE transform: force the basis columns' homogeneous w to 0 and the
// translation column's w to 1. Thin-instanced ShaderMaterials may pack per-instance data in those spare w
// lanes (a sanctioned pattern \u2014 Lite injects world0..world3 and the app's own vertex shader zeroes them
// before transforming). Picking only needs the transform, so packed values are exposed separately.
let world = mat4x4f(
vec4f(m[0].xyz, 0.0),
vec4f(m[1].xyz, 0.0),
vec4f(m[2].xyz, 0.0),
vec4f(m[3].xyz, 1.0),
);
var out: VsOut;
let wp = (world * vec4f(position, 1.0)).xyz;
out.position = scene.viewProjection * vec4f(wp, 1.0);
out.pickId = tiMesh.baseMeshPickId + instanceIndex;
out.worldPos = wp;
out.thinInstanceIndex = instanceIndex;
out.hasThinInstance = 1u;
out.instanceExtras = vec4f(m[0].w, m[1].w, m[2].w, m[3].w);
return out;
}
`
    );
  }
  var PICK_DISCARD_INPUT, DEFAULT_PICK_DISCARD, PICK_FS;
  var init_picking_shader = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/picking/picking-shader.ts"() {
      "use strict";
      PICK_DISCARD_INPUT = /* wgsl */
      `
struct PickDiscardInput {
worldPos: vec3f,
pickId: u32,
thinInstanceIndex: u32,
hasThinInstance: u32,
instanceExtras: vec4f,
};
`;
      DEFAULT_PICK_DISCARD = /* wgsl */
      `
fn shouldDiscardPick(input: PickDiscardInput) -> bool {
return false;
}
`;
      PICK_FS = /* wgsl */
      `
struct VsOut {
@builtin(position) position: vec4f,
@location(0) @interpolate(flat) pickId: u32,
@location(1) worldPos: vec3f,
@location(2) @interpolate(flat) thinInstanceIndex: u32,
@location(3) @interpolate(flat) hasThinInstance: u32,
@location(4) @interpolate(flat) instanceExtras: vec4f,
};
struct FsOut { @location(0) color: vec4f, @location(1) depth: vec4f };
@fragment fn fs(input: VsOut) -> FsOut {
let discardInput = PickDiscardInput(input.worldPos, input.pickId, input.thinInstanceIndex, input.hasThinInstance, input.instanceExtras);
if (shouldDiscardPick(discardInput)) { discard; }
let id = input.pickId;
let r = f32((id >> 16u) & 0xFFu) / 255.0;
let g = f32((id >> 8u) & 0xFFu) / 255.0;
let b = f32(id & 0xFFu) / 255.0;
return FsOut(vec4f(r, g, b, 1.0), vec4f(input.position.z, 0.0, 0.0, 0.0));
}
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/bgl-helpers.ts
  function createSingleUniformBGL(engine, label, visibility) {
    return engine._device.createBindGroupLayout({
      label,
      entries: [{ binding: 0, visibility, buffer: { type: "uniform" } }]
    });
  }
  var init_bgl_helpers = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/bgl-helpers.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/picking-pipeline.ts
  function invalidateIfNeeded(engine) {
    const device = engine._device;
    if (device !== _cachedDevice4) {
      _sceneBGL = null;
      _meshBGL = null;
      _tiMeshBGL = null;
      _pipelineSets = null;
      _cachedDevice4 = device;
    }
  }
  function getPickingSceneBGL(engine) {
    invalidateIfNeeded(engine);
    if (!_sceneBGL) {
      _sceneBGL = createSingleUniformBGL(engine, "picking-scene-bgl", SS.VERTEX);
    }
    return _sceneBGL;
  }
  function getPickingMeshBGL(engine) {
    invalidateIfNeeded(engine);
    if (!_meshBGL) {
      _meshBGL = createSingleUniformBGL(engine, "picking-mesh-bgl", SS.VERTEX | SS.FRAGMENT);
    }
    return _meshBGL;
  }
  function getPickingTIMeshBGL(engine) {
    const device = engine._device;
    invalidateIfNeeded(engine);
    if (!_tiMeshBGL) {
      _tiMeshBGL = device.createBindGroupLayout({
        label: "picking-ti-mesh-bgl",
        entries: [
          {
            binding: 0,
            visibility: SS.VERTEX | SS.FRAGMENT,
            buffer: { type: "uniform" }
          },
          {
            binding: 1,
            visibility: SS.VERTEX,
            buffer: { type: "read-only-storage" }
          }
        ]
      });
    }
    return _tiMeshBGL;
  }
  function createDiscardBGL(engine, discard) {
    return engine._device.createBindGroupLayout({
      label: `picking-discard-${discard.key}-bgl`,
      entries: (discard.storage ?? []).map((_, binding) => ({
        binding,
        visibility: SS.FRAGMENT,
        buffer: { type: "read-only-storage" }
      }))
    });
  }
  function createPickingPipelineInternal(engine, opts) {
    const device = engine._device;
    const module = device.createShaderModule({ label: `${opts.label}-shader`, code: opts.shader });
    const bindGroupLayouts = opts.discardBGL ? [getPickingSceneBGL(engine), opts.meshBGL, opts.discardBGL] : [getPickingSceneBGL(engine), opts.meshBGL];
    const layout = device.createPipelineLayout({
      label: `${opts.label}-pipeline-layout`,
      bindGroupLayouts
    });
    return device.createRenderPipeline({
      label: `${opts.label}-pipeline`,
      layout,
      vertex: {
        module,
        entryPoint: "vs",
        buffers: [POSITION_VERTEX_LAYOUT]
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [{ format: "rgba8unorm" }, { format: "r32float" }]
      },
      depthStencil: {
        format: "depth24plus",
        depthCompare: "greater",
        depthWriteEnabled: true
      },
      primitive: {
        topology: "triangle-list",
        // Pick the NEAREST surface regardless of facing (matches Babylon.js Scene.pick, which intersects
        // both triangle sides). Culling back faces here would make any DOUBLE-SIDED mesh
        // unpickable wherever the renderer shows its back face.
        cullMode: "none"
      },
      multisample: { count: 1 }
    });
  }
  function getPickingPipelineSet(engine, discard) {
    invalidateIfNeeded(engine);
    const key = discard ? `discard:${discard.key}` : "default";
    const pipelineSets = _pipelineSets ?? (_pipelineSets = /* @__PURE__ */ new Map());
    const cached = pipelineSets.get(key);
    if (cached) {
      return cached;
    }
    const discardBGL = discard?.storage?.length ? createDiscardBGL(engine, discard) : null;
    const shaderOptions = discard ? { discardWgsl: discard.wgsl, storage: discard.storage } : void 0;
    const regularPipeline = createPickingPipelineInternal(engine, {
      shader: pickingShaderSource(shaderOptions),
      meshBGL: getPickingMeshBGL(engine),
      discardBGL,
      label: discard ? `picking-${discard.key}` : "picking"
    });
    const thinInstancePipeline = createPickingPipelineInternal(engine, {
      shader: pickingThinInstanceShaderSource(shaderOptions),
      meshBGL: getPickingTIMeshBGL(engine),
      discardBGL,
      label: discard ? `picking-ti-${discard.key}` : "picking-ti"
    });
    const set = { regularPipeline, thinInstancePipeline, discardBGL };
    pipelineSets.set(key, set);
    return set;
  }
  var _cachedDevice4, _sceneBGL, _meshBGL, _tiMeshBGL, _pipelineSets, POSITION_VERTEX_LAYOUT;
  var init_picking_pipeline = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/picking/picking-pipeline.ts"() {
      "use strict";
      init_gpu_flags();
      init_picking_shader();
      init_bgl_helpers();
      _cachedDevice4 = null;
      _sceneBGL = null;
      _meshBGL = null;
      _tiMeshBGL = null;
      _pipelineSets = null;
      POSITION_VERTEX_LAYOUT = {
        arrayStride: 12,
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }]
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/deformed-geometry.ts
  var deformed_geometry_exports = {};
  __export(deformed_geometry_exports, {
    computeDeformedNormals: () => computeDeformedNormals,
    computeDeformedPositions: () => computeDeformedPositions,
    hasCpuDeformation: () => hasCpuDeformation
  });
  function hasCpuDeformation(mesh) {
    return !!mesh._cpuPositions && (!!mesh.morphTargets || !!mesh.skeleton);
  }
  function computeDeformedPositions(mesh) {
    const base = mesh._cpuPositions;
    if (!base) {
      return null;
    }
    const out = new F32(base);
    applyMorphPositions(mesh, out);
    applySkinPositions(mesh, out);
    return out;
  }
  function computeDeformedNormals(mesh) {
    const base = mesh._cpuNormals;
    if (!base) {
      return null;
    }
    const out = new F32(base);
    applyMorphNormals(mesh, out);
    applySkinNormals(mesh, out);
    return out;
  }
  function applyMorphPositions(mesh, out) {
    const morph = mesh.morphTargets;
    if (!morph) {
      return;
    }
    const vertexCount = out.length / 3;
    const targetCount = Math.min(morph.count, morph.targets.length, 4);
    for (let t = 0; t < targetCount; t++) {
      const weight = morph.weights[t] ?? 0;
      if (weight === 0) {
        continue;
      }
      const positions = morph.targets[t].positions;
      for (let v = 0; v < vertexCount; v++) {
        const i = v * 3;
        out[i] = out[i] + positions[i] * weight;
        out[i + 1] = out[i + 1] + positions[i + 1] * weight;
        out[i + 2] = out[i + 2] + positions[i + 2] * weight;
      }
    }
  }
  function applyMorphNormals(mesh, out) {
    const morph = mesh.morphTargets;
    if (!morph) {
      return;
    }
    const vertexCount = out.length / 3;
    const targetCount = Math.min(morph.count, morph.targets.length, 4);
    for (let t = 0; t < targetCount; t++) {
      const weight = morph.weights[t] ?? 0;
      const normals = morph.targets[t].normals;
      if (weight === 0 || !normals) {
        continue;
      }
      for (let v = 0; v < vertexCount; v++) {
        const i = v * 3;
        out[i] = out[i] + normals[i] * weight;
        out[i + 1] = out[i + 1] + normals[i + 1] * weight;
        out[i + 2] = out[i + 2] + normals[i + 2] * weight;
      }
    }
  }
  function applySkinPositions(mesh, out) {
    const skeleton = mesh.skeleton;
    if (!skeleton) {
      return;
    }
    const source = new F32(out);
    const vertexCount = out.length / 3;
    for (let v = 0; v < vertexCount; v++) {
      const i = v * 3;
      const x = source[i];
      const y = source[i + 1];
      const z = source[i + 2];
      const result = skinVec3(skeleton.boneMatrices, skeleton.joints, skeleton.weights, skeleton.joints1, skeleton.weights1, v, x, y, z, 1);
      out[i] = result[0];
      out[i + 1] = result[1];
      out[i + 2] = result[2];
    }
  }
  function applySkinNormals(mesh, out) {
    const skeleton = mesh.skeleton;
    if (!skeleton) {
      return;
    }
    const source = new F32(out);
    const vertexCount = out.length / 3;
    for (let v = 0; v < vertexCount; v++) {
      const i = v * 3;
      const x = source[i];
      const y = source[i + 1];
      const z = source[i + 2];
      const result = skinVec3(skeleton.boneMatrices, skeleton.joints, skeleton.weights, skeleton.joints1, skeleton.weights1, v, x, y, z, 0);
      out[i] = result[0];
      out[i + 1] = result[1];
      out[i + 2] = result[2];
    }
  }
  function skinVec3(boneMatrices, joints, weights, joints1, weights1, vertexIndex, x, y, z, wCoord) {
    let rx = 0;
    let ry = 0;
    let rz = 0;
    const base = vertexIndex * 4;
    for (let i = 0; i < 4; i++) {
      const weight = weights[base + i] ?? 0;
      if (weight !== 0) {
        const joint = joints[base + i] ?? 0;
        const transformed = transformByBone(boneMatrices, joint, x, y, z, wCoord);
        rx += transformed[0] * weight;
        ry += transformed[1] * weight;
        rz += transformed[2] * weight;
      }
    }
    if (joints1 && weights1) {
      for (let i = 0; i < 4; i++) {
        const weight = weights1[base + i] ?? 0;
        if (weight !== 0) {
          const joint = joints1[base + i] ?? 0;
          const transformed = transformByBone(boneMatrices, joint, x, y, z, wCoord);
          rx += transformed[0] * weight;
          ry += transformed[1] * weight;
          rz += transformed[2] * weight;
        }
      }
    }
    return [rx, ry, rz];
  }
  function transformByBone(boneMatrices, joint, x, y, z, wCoord) {
    const o = joint * 16;
    return [
      boneMatrices[o] * x + boneMatrices[o + 4] * y + boneMatrices[o + 8] * z + boneMatrices[o + 12] * wCoord,
      boneMatrices[o + 1] * x + boneMatrices[o + 5] * y + boneMatrices[o + 9] * z + boneMatrices[o + 13] * wCoord,
      boneMatrices[o + 2] * x + boneMatrices[o + 6] * y + boneMatrices[o + 10] * z + boneMatrices[o + 14] * wCoord
    ];
  }
  var init_deformed_geometry = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/picking/deformed-geometry.ts"() {
      "use strict";
      init_typed_arrays();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/gs-picking-pipeline.ts
  var gs_picking_pipeline_exports = {};
  __export(gs_picking_pipeline_exports, {
    computeGsPickMatrix: () => computeGsPickMatrix,
    createGsPickMeshResources: () => createGsPickMeshResources,
    disposeGsPickMeshResources: () => disposeGsPickMeshResources,
    drawGsForPicking: () => drawGsForPicking,
    gsPickWritePickMatrixAndBind: () => gsPickWritePickMatrixAndBind
  });
  function buildPickingWgsl() {
    const wgsl = (
      /* wgsl */
      `
struct GsPickScene { pickMatrix: mat4x4<f32> };
@group(0) @binding(0) var<uniform> gsPickScene: GsPickScene;

struct U {
  world: mat4x4<f32>,
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
  viewport: vec2<f32>,
  focal: vec2<f32>,
  dataSize: vec2<f32>,
  alpha: f32,
  _pad: f32,
};
@group(1) @binding(0) var<uniform> u: U;
@group(1) @binding(1) var samp: sampler;
@group(1) @binding(2) var centersTex: texture_2d<f32>;
@group(1) @binding(3) var covATex: texture_2d<f32>;
@group(1) @binding(4) var covBTex: texture_2d<f32>;
@group(1) @binding(5) var colorsTex: texture_2d<f32>;

struct VOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) vColor: vec4<f32>,
  @location(1) vPos: vec2<f32>,
};

fn dataUv(idx: f32) -> vec2<f32> {
  let y = floor(idx / u.dataSize.x);
  let x = idx - y * u.dataSize.x;
  return vec2<f32>((x + 0.5) / u.dataSize.x, (y + 0.5) / u.dataSize.y);
}

@vertex
fn vs(@location(0) corner: vec2<f32>, @location(1) splatIndex: f32) -> VOut {
  var out: VOut;
  let uv = dataUv(splatIndex);
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
  out.pos = gsPickScene.pickMatrix * vec4<f32>(
    vCenter + (corner.x * majorAxis + corner.y * minorAxis) * pos2d.w / u.viewport,
    pos2d.z, pos2d.w);
  out.vColor = vec4<f32>(color.rgb, color.a * u.alpha);
  out.vPos = corner;
  return out;
}

/*GS_FRAGMENT_DEFINITIONS*/
struct FsOut { @location(0) color: vec4<f32>, @location(1) depth: vec4<f32> };
@fragment
fn fs(in: VOut) -> FsOut {
  /*GS_FRAGMENT_MAIN_BEGIN*/
  let A = -dot(in.vPos, in.vPos);
  var finalColor: vec4<f32>;
  if (A > -4.0) {
    let B = exp(A) * in.vColor.a;
    finalColor = vec4<f32>(in.vColor.rgb, B);
  } else {
    finalColor = vec4<f32>(0.0);
  }
  /*GS_FRAGMENT_BEFORE_FRAGCOLOR*/
  /*GS_FRAGMENT_MAIN_END*/
  return FsOut(finalColor, vec4<f32>(in.pos.z, 0.0, 0.0, 0.0));
}
`
    );
    return applyGsFragments(wgsl, [gsGpuPickingFragment]);
  }
  function getCache(engine) {
    const device = engine._device;
    if (_cache && _cache.device === device) {
      return _cache;
    }
    const meshBGL = device.createBindGroupLayout({
      label: "gs-picking-mesh-bgl",
      entries: [
        { binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } },
        { binding: 1, visibility: SS.VERTEX, sampler: { type: "non-filtering" } },
        { binding: 2, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
        { binding: 3, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
        { binding: 4, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } },
        { binding: 5, visibility: SS.VERTEX, texture: { sampleType: "unfilterable-float" } }
      ]
    });
    const pickingBGL = device.createBindGroupLayout({
      label: "gs-picking-pick-bgl",
      entries: [{ binding: 0, visibility: SS.FRAGMENT, buffer: { type: "uniform" } }]
    });
    const module = device.createShaderModule({ label: "gs-picking-shader", code: buildPickingWgsl() });
    const pipeline = device.createRenderPipeline({
      label: "gs-picking-pipeline",
      layout: device.createPipelineLayout({ bindGroupLayouts: [getPickingSceneBGL(engine), meshBGL, pickingBGL] }),
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
        targets: [{ format: "rgba8unorm" }, { format: "r32float" }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: { format: "depth24plus", depthCompare: "less", depthWriteEnabled: true },
      multisample: { count: 1 }
    });
    const pickMatrixUbo = device.createBuffer({ size: 64, usage: BU.UNIFORM | BU.COPY_DST, label: "gs-picking-scene-ubo" });
    const sceneBG = device.createBindGroup({
      label: "gs-picking-scene-bg",
      layout: getPickingSceneBGL(engine),
      entries: [{ binding: 0, resource: { buffer: pickMatrixUbo } }]
    });
    _cache = { device, pipeline, meshBGL, pickingBGL, pickMatrixUbo, sceneBG };
    return _cache;
  }
  function gsPickWritePickMatrixAndBind(pass, engine, pickMatrix) {
    const cache = getCache(engine);
    engine._device.queue.writeBuffer(cache.pickMatrixUbo, 0, pickMatrix.buffer, pickMatrix.byteOffset, pickMatrix.byteLength);
    pass.setBindGroup(0, cache.sceneBG);
  }
  function createGsPickMeshResources(engine, mesh) {
    const device = engine._device;
    const cache = getCache(engine);
    const UBO_BYTES = 16 * 4 * 3 + 8 * 4;
    const meshUbo = device.createBuffer({ size: UBO_BYTES, usage: BU.UNIFORM | BU.COPY_DST, label: "gs-picking-mesh-ubo" });
    const meshCpu = new F32(UBO_BYTES / 4);
    meshCpu[48 + 4] = mesh.textureWidth;
    meshCpu[48 + 5] = mesh.textureHeight;
    meshCpu[48 + 6] = 1;
    const meshBG = device.createBindGroup({
      label: "gs-picking-mesh-bg",
      layout: cache.meshBGL,
      entries: [
        { binding: 0, resource: { buffer: meshUbo } },
        { binding: 1, resource: mesh._gs._sampler },
        { binding: 2, resource: mesh._gs._centersView },
        { binding: 3, resource: mesh._gs._covAView },
        { binding: 4, resource: mesh._gs._covBView },
        { binding: 5, resource: mesh._gs._colorsView }
      ]
    });
    const pickingUbo = device.createBuffer({ size: 16, usage: BU.UNIFORM | BU.COPY_DST, label: "gs-picking-color-ubo" });
    const pickingCpu = new F32(4);
    const pickingBG = device.createBindGroup({
      label: "gs-picking-color-bg",
      layout: cache.pickingBGL,
      entries: [{ binding: 0, resource: { buffer: pickingUbo } }]
    });
    return { meshUbo, meshBG, pickingUbo, pickingBG, meshCpu, pickingCpu };
  }
  function disposeGsPickMeshResources(res) {
    res.meshUbo.destroy();
    res.pickingUbo.destroy();
  }
  function drawGsForPicking(pass, engine, scene, mesh, res, pickId, targetWidth, targetHeight) {
    const cache = getCache(engine);
    const cam = scene.camera;
    if (!cam) {
      return;
    }
    const size = getRenderTargetSize(engine);
    const aspect = (targetWidth || size.width) / (targetHeight || size.height);
    const view = getViewMatrix(cam);
    const proj = getProjectionMatrix(cam, aspect);
    const world = mesh.worldMatrix;
    const cpu = res.meshCpu;
    cpu.set(world, 0);
    cpu.set(view, 16);
    cpu.set(proj, 32);
    cpu[48] = size.width;
    cpu[48 + 1] = size.height;
    cpu[48 + 2] = size.width * 0.5 * proj[0];
    cpu[48 + 3] = size.height * 0.5 * proj[5];
    engine._device.queue.writeBuffer(res.meshUbo, 0, cpu.buffer, 0, cpu.byteLength);
    const [r, g, b] = encodeIdToColor(pickId);
    res.pickingCpu[0] = r;
    res.pickingCpu[1] = g;
    res.pickingCpu[2] = b;
    res.pickingCpu[3] = 0;
    engine._device.queue.writeBuffer(res.pickingUbo, 0, res.pickingCpu.buffer, 0, 16);
    pass.setPipeline(cache.pipeline);
    pass.setBindGroup(1, res.meshBG);
    pass.setBindGroup(2, res.pickingBG);
    pass.setVertexBuffer(0, mesh._gs._quadBuffer);
    pass.setVertexBuffer(1, mesh._gs._splatIndexBuffer);
    pass.setIndexBuffer(mesh._gs._indexBuffer, "uint16");
    pass.drawIndexed(6, mesh.vertexCount);
  }
  function computeGsPickMatrix(out, px, py, w, h) {
    const ndcX = 2 * (px + 0.5) / w - 1;
    const ndcY = 1 - 2 * (py + 0.5) / h;
    out[0] = w;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = h;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = -ndcX * w;
    out[13] = -ndcY * h;
    out[14] = 0;
    out[15] = 1;
  }
  var _cache;
  var init_gs_picking_pipeline = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/picking/gs-picking-pipeline.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_gaussian_splatting_pipeline();
      init_gs_gpu_picking_fragment();
      init_picking_pipeline();
      init_engine();
      init_camera();
      _cache = null;
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/ray.ts
  init_mat4_invert();
  function createPickingRay(x, y, vpMatrix, width, height) {
    const invVP = mat4Invert(vpMatrix);
    if (!invVP) {
      return null;
    }
    const ndcX = 2 * x / width - 1;
    const ndcY = 1 - 2 * y / height;
    const near = unprojectPoint(invVP, ndcX, ndcY, 1);
    const far = unprojectPoint(invVP, ndcX, ndcY, 0);
    const dx = far[0] - near[0];
    const dy = far[1] - near[1];
    const dz = far[2] - near[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-10) {
      return null;
    }
    const invLen = 1 / len;
    return {
      origin: near,
      direction: [dx * invLen, dy * invLen, dz * invLen],
      length: len
    };
  }
  function unprojectPoint(invVP, ndcX, ndcY, depth) {
    const x = invVP[0] * ndcX + invVP[4] * ndcY + invVP[8] * depth + invVP[12];
    const y = invVP[1] * ndcX + invVP[5] * ndcY + invVP[9] * depth + invVP[13];
    const z = invVP[2] * ndcX + invVP[6] * ndcY + invVP[10] * depth + invVP[14];
    const w = invVP[3] * ndcX + invVP[7] * ndcY + invVP[11] * depth + invVP[15];
    const invW = 1 / w;
    return [x * invW, y * invW, z * invW];
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/math/normalize-vec3.ts
  function normalizeVec3(x, y, z, epsilon = 1e-10) {
    const len = Math.hypot(x, y, z);
    if (len <= epsilon) {
      return [0, 1, 0];
    }
    return [x / len, y / len, z / len];
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_create_standard_material();

  // ../../../Babylon-Lite/packages/babylon-lite/src/camera/viewport.ts
  var FULL_VIEWPORT = { x: 0, y: 0, width: 1, height: 1 };
  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }
  function resolveCameraViewport(camera, targetWidth, targetHeight) {
    const v = camera?.viewport ?? FULL_VIEWPORT;
    const x0 = clamp01(v.x);
    const y0 = clamp01(1 - v.y - v.height);
    const x1 = clamp01(v.x + v.width);
    const y1 = clamp01(1 - v.y);
    const x = Math.floor(x0 * targetWidth);
    const y = Math.floor(y0 * targetHeight);
    const width = Math.max(0, Math.ceil(x1 * targetWidth) - x);
    const height = Math.max(0, Math.ceil(y1 * targetHeight) - y);
    return { x, y, width, height };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/gpu-picker.ts
  init_typed_arrays();
  init_gpu_flags();

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/picking-info.ts
  function createEmptyPickingInfo() {
    return {
      hit: false,
      distance: 0,
      pickedPoint: null,
      pickedNormal: null,
      pickedNormalWorld: null,
      pickedFaceNormal: null,
      pickedFaceNormalWorld: null,
      pickedMesh: null,
      faceId: -1,
      bu: 0,
      bv: 0,
      subMeshId: 0,
      thinInstanceIndex: -1,
      ray: null
    };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/gpu-picker.ts
  init_mat4_invert();
  init_picking_pipeline();
  init_camera();
  init_gpu_buffers();
  var _pickVP = new F32(16);
  var _gsPickMatrix = new F32(16);
  var PICK_MESH_UBO_BYTES = 80;
  var PICK_TI_UBO_BYTES = 16;
  var _uboScratch = new ArrayBuffer(PICK_MESH_UBO_BYTES);
  var _uboF32 = new F32(_uboScratch);
  var _uboU32 = new U32(_uboScratch);
  var _uboView = new U8(_uboScratch);
  var _tiUboScratch = new ArrayBuffer(PICK_TI_UBO_BYTES);
  var _tiUboU32 = new U32(_tiUboScratch);
  var _tiUboView = new U8(_tiUboScratch);
  function createGpuPicker(scene) {
    return {
      _detailedPick: null,
      _scene: scene,
      _rt: null,
      _sceneUbo: null,
      _sceneBG: null,
      _gsMeshResources: null
    };
  }
  function ensureTargets(engine, picker) {
    const device = engine._device;
    if (picker._rt) {
      return picker._rt;
    }
    const colorTex = device.createTexture({ label: "pick-color", size: [1, 1], format: "rgba8unorm", usage: TU.RENDER_ATTACHMENT | TU.COPY_SRC });
    const depthColorTex = device.createTexture({
      label: "pick-depth-color",
      size: [1, 1],
      format: "r32float",
      usage: TU.RENDER_ATTACHMENT | TU.COPY_SRC
    });
    const depthTex = device.createTexture({ label: "pick-depth", size: [1, 1], format: "depth24plus", usage: TU.RENDER_ATTACHMENT });
    picker._rt = {
      colorTex,
      colorView: colorTex.createView(),
      depthColorTex,
      depthColorView: depthColorTex.createView(),
      depthTex,
      depthView: depthTex.createView(),
      colorStaging: device.createBuffer({ label: "pick-color-staging", size: 256, usage: BU.COPY_DST | BU.MAP_READ }),
      depthStaging: device.createBuffer({ label: "pick-depth-staging", size: 256, usage: BU.COPY_DST | BU.MAP_READ })
    };
    return picker._rt;
  }
  function ensureSceneUbo(engine, picker) {
    const device = engine._device;
    if (!picker._sceneUbo) {
      picker._sceneUbo = createEmptyUniformBuffer(engine, 64, "pick-scene-ubo");
      const sceneBGL = getPickingSceneBGL(engine);
      picker._sceneBG = device.createBindGroup({ label: "pick-scene-bg", layout: sceneBGL, entries: [{ binding: 0, resource: { buffer: picker._sceneUbo } }] });
    }
    return picker._sceneUbo;
  }
  function computePickVP(out, vp, px, py, w, h) {
    const ndcX = 2 * (px + 0.5) / w - 1;
    const ndcY = 1 - 2 * (py + 0.5) / h;
    for (let c = 0; c < 4; c++) {
      const base = c * 4;
      const w3 = vp[base + 3];
      out[base] = w * (vp[base] - ndcX * w3);
      out[base + 1] = h * (vp[base + 1] - ndcY * w3);
      out[base + 2] = vp[base + 2];
      out[base + 3] = w3;
    }
  }
  function createPickDiscardBindGroup(engine, layout, discard, mesh, tempBuffers) {
    const storage = discard.storage;
    if (!storage || storage.length === 0) {
      return null;
    }
    const entries = [];
    for (let i = 0; i < storage.length; i++) {
      const data = storage[i].data(mesh);
      if (!data) {
        return null;
      }
      const buffer = createMappedBuffer(engine, data, BU.STORAGE);
      tempBuffers.push(buffer);
      entries.push({ binding: i, resource: { buffer } });
    }
    const device = engine._device;
    return device.createBindGroup({
      label: `pick-discard-${discard.key}-bg`,
      layout,
      entries
    });
  }
  async function pickAsync(picker, x, y, options) {
    const scene = picker._scene;
    const pickFilter = options?.filter ?? null;
    const pickDiscard = options?.discard ?? null;
    const debugLabel = options?.debugLabel;
    const engine = scene.surface.engine;
    const device = engine._device;
    const canvas = scene.surface.canvas;
    const camera = scene.camera;
    if (!camera) {
      return createEmptyPickingInfo();
    }
    const backingWidth = canvas.width;
    const backingHeight = canvas.height;
    const clientWidth = ("clientWidth" in canvas ? canvas.clientWidth : 0) || backingWidth;
    const clientHeight = ("clientHeight" in canvas ? canvas.clientHeight : 0) || backingHeight;
    const scaleX = backingWidth / clientWidth;
    const scaleY = backingHeight / clientHeight;
    const pickX = x * scaleX;
    const pickY = y * scaleY;
    const viewport = resolveCameraViewport(camera, backingWidth, backingHeight);
    const w = viewport.width;
    const h = viewport.height;
    if (w === 0 || h === 0) {
      return createEmptyPickingInfo();
    }
    if (pickX < viewport.x || pickY < viewport.y || pickX >= viewport.x + viewport.width || pickY >= viewport.y + viewport.height) {
      return createEmptyPickingInfo();
    }
    const px = Math.max(0, Math.min(Math.floor(pickX - viewport.x), w - 1));
    const py = Math.max(0, Math.min(Math.floor(pickY - viewport.y), h - 1));
    const aspect = w / h;
    const vp = getViewProjectionMatrix(camera, aspect);
    const debugRay = debugLabel ? createPickingRay(px, py, vp, w, h) : null;
    computePickVP(_pickVP, vp, px, py, w, h);
    const rt = ensureTargets(engine, picker);
    const sceneUbo = ensureSceneUbo(engine, picker);
    device.queue.writeBuffer(sceneUbo, 0, _pickVP);
    const meshes = scene.meshes;
    const meshCount = meshes.length;
    let nextId = 1;
    let deformedGeometry = null;
    for (let mi = 0; mi < meshCount; mi++) {
      const mesh = meshes[mi];
      if ((mesh.morphTargets || mesh.skeleton) && mesh._cpuPositions) {
        deformedGeometry = await Promise.resolve().then(() => (init_deformed_geometry(), deformed_geometry_exports));
        break;
      }
    }
    const encoder = device.createCommandEncoder({ label: "pick" });
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: rt.colorView, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" },
        { view: rt.depthColorView, clearValue: { r: 1, g: 0, b: 0, a: 0 }, loadOp: "clear", storeOp: "store" }
      ],
      depthStencilAttachment: { view: rt.depthView, depthClearValue: 0, depthLoadOp: "clear", depthStoreOp: "discard" }
    });
    const defaultPipelines = getPickingPipelineSet(engine);
    const discardPipelines = pickDiscard ? getPickingPipelineSet(engine, pickDiscard) : null;
    const tempBuffers = [];
    for (let mi = 0; mi < meshCount; mi++) {
      const mesh = meshes[mi];
      if (mesh.pickable === false) {
        continue;
      }
      if (pickFilter && !pickFilter(mesh)) {
        continue;
      }
      const gpu = mesh._gpu;
      const ti = mesh.thinInstances;
      const discardBG = pickDiscard && discardPipelines?.discardBGL ? createPickDiscardBindGroup(engine, discardPipelines.discardBGL, pickDiscard, mesh, tempBuffers) : null;
      const pipelines = discardPipelines && (!discardPipelines.discardBGL || discardBG) ? discardPipelines : defaultPipelines;
      if (ti) {
        if (ti.count <= 0 || !ti._gpuBuffer) {
          continue;
        }
        _tiUboU32[0] = nextId;
        const tiUbo = createUniformBuffer(engine, _tiUboView);
        tempBuffers.push(tiUbo);
        pass.setPipeline(pipelines.thinInstancePipeline);
        pass.setBindGroup(0, picker._sceneBG);
        pass.setBindGroup(
          1,
          device.createBindGroup({
            layout: pipelines.thinInstancePipeline.getBindGroupLayout(1),
            entries: [
              { binding: 0, resource: { buffer: tiUbo } },
              { binding: 1, resource: { buffer: ti._gpuBuffer } }
            ]
          })
        );
        if (discardBG) {
          pass.setBindGroup(2, discardBG);
        }
        pass.setVertexBuffer(0, gpu.positionBuffer);
        pass.setIndexBuffer(gpu.indexBuffer, gpu.indexFormat);
        pass.drawIndexed(gpu.indexCount, ti.count);
        nextId += ti.count;
      } else {
        _uboF32.set(mesh.worldMatrix, 0);
        _uboU32[16] = nextId;
        const meshUbo = createUniformBuffer(engine, _uboView);
        tempBuffers.push(meshUbo);
        let positionBuffer = gpu.positionBuffer;
        if (deformedGeometry && (mesh.morphTargets || mesh.skeleton) && mesh._cpuPositions) {
          const deformedPositions = deformedGeometry.computeDeformedPositions(mesh);
          if (deformedPositions) {
            positionBuffer = createMappedBuffer(engine, deformedPositions, BU.VERTEX);
            tempBuffers.push(positionBuffer);
          }
        }
        pass.setPipeline(pipelines.regularPipeline);
        pass.setBindGroup(0, picker._sceneBG);
        pass.setBindGroup(
          1,
          device.createBindGroup({
            layout: pipelines.regularPipeline.getBindGroupLayout(1),
            entries: [{ binding: 0, resource: { buffer: meshUbo } }]
          })
        );
        if (discardBG) {
          pass.setBindGroup(2, discardBG);
        }
        pass.setVertexBuffer(0, positionBuffer);
        pass.setIndexBuffer(gpu.indexBuffer, gpu.indexFormat);
        pass.drawIndexed(gpu.indexCount);
        nextId++;
      }
    }
    const gsMeshes = scene._gsMeshes;
    const gsMeshCount = gsMeshes.length;
    const gsNextIdStart = nextId;
    if (gsMeshCount > 0) {
      const gsModule = await Promise.resolve().then(() => (init_gs_picking_pipeline(), gs_picking_pipeline_exports));
      gsModule.computeGsPickMatrix(_gsPickMatrix, px, py, w, h);
      gsModule.gsPickWritePickMatrixAndBind(pass, engine, _gsPickMatrix);
      const resMap = picker._gsMeshResources ?? (picker._gsMeshResources = /* @__PURE__ */ new Map());
      for (let gi = 0; gi < gsMeshCount; gi++) {
        const gsMesh = gsMeshes[gi];
        let res = resMap.get(gsMesh);
        if (!res) {
          res = gsModule.createGsPickMeshResources(engine, gsMesh);
          resMap.set(gsMesh, res);
        }
        gsModule.drawGsForPicking(pass, engine, scene, gsMesh, res, nextId, w, h);
        nextId++;
      }
    }
    pass.end();
    encoder.copyTextureToBuffer({ texture: rt.colorTex }, { buffer: rt.colorStaging, bytesPerRow: 256 }, { width: 1, height: 1 });
    encoder.copyTextureToBuffer({ texture: rt.depthColorTex }, { buffer: rt.depthStaging, bytesPerRow: 256 }, { width: 1, height: 1 });
    device.queue.submit([encoder.finish()]);
    await Promise.all([rt.colorStaging.mapAsync(GPUMapMode.READ), rt.depthStaging.mapAsync(GPUMapMode.READ)]);
    const colorData = new U8(rt.colorStaging.getMappedRange());
    const pickId = colorData[0] << 16 | colorData[1] << 8 | colorData[2];
    const depth = new F32(rt.depthStaging.getMappedRange())[0];
    rt.colorStaging.unmap();
    rt.depthStaging.unmap();
    for (let i = 0; i < tempBuffers.length; i++) {
      tempBuffers[i].destroy();
    }
    if (pickId === 0) {
      if (debugLabel) {
        console.trace("pick-debug", {
          label: debugLabel,
          input: { x, y, pickX, pickY, px, py, backingWidth, backingHeight, clientWidth, clientHeight, viewport },
          ray: debugRay,
          pickId,
          depth,
          hit: false
        });
      }
      return createEmptyPickingInfo();
    }
    let hitMesh = null;
    let hitThinIdx = -1;
    let hitIsGs = false;
    let scanId = 1;
    for (let mi = 0; mi < meshCount; mi++) {
      const mesh = meshes[mi];
      if (mesh.pickable === false) {
        continue;
      }
      if (pickFilter && !pickFilter(mesh)) {
        continue;
      }
      const ti = mesh.thinInstances;
      if (ti) {
        if (ti.count <= 0 || !ti._gpuBuffer) {
          continue;
        }
        if (pickId >= scanId && pickId < scanId + ti.count) {
          hitMesh = mesh;
          hitThinIdx = pickId - scanId;
          break;
        }
        scanId += ti.count;
      } else {
        if (pickId === scanId) {
          hitMesh = mesh;
          break;
        }
        scanId++;
      }
    }
    if (!hitMesh && gsMeshCount > 0 && pickId >= gsNextIdStart) {
      const gsIdx = pickId - gsNextIdStart;
      if (gsIdx < gsMeshCount) {
        hitMesh = gsMeshes[gsIdx];
        hitIsGs = true;
      }
    }
    if (!hitMesh) {
      if (debugLabel) {
        console.trace("pick-debug", {
          label: debugLabel,
          input: { x, y, pickX, pickY, px, py, backingWidth, backingHeight, clientWidth, clientHeight, viewport },
          ray: debugRay,
          pickId,
          depth,
          hit: false,
          unresolved: true
        });
      }
      return createEmptyPickingInfo();
    }
    const info = createEmptyPickingInfo();
    info.hit = true;
    info.pickedMesh = hitMesh;
    info.thinInstanceIndex = hitThinIdx;
    const invVP = mat4Invert(vp);
    if (invVP) {
      const ndcX = 2 * (pickX - viewport.x) / w - 1;
      const ndcY = 1 - 2 * (pickY - viewport.y) / h;
      const wx = invVP[0] * ndcX + invVP[4] * ndcY + invVP[8] * depth + invVP[12];
      const wy = invVP[1] * ndcX + invVP[5] * ndcY + invVP[9] * depth + invVP[13];
      const wz = invVP[2] * ndcX + invVP[6] * ndcY + invVP[10] * depth + invVP[14];
      const ww = invVP[3] * ndcX + invVP[7] * ndcY + invVP[11] * depth + invVP[15];
      const invW = 1 / ww;
      info.pickedPoint = [wx * invW, wy * invW, wz * invW];
      const camPos = getCameraPosition(camera);
      const dx = info.pickedPoint[0] - camPos.x;
      const dy = info.pickedPoint[1] - camPos.y;
      const dz = info.pickedPoint[2] - camPos.z;
      info.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    if (picker._detailedPick && !hitIsGs) {
      const ray = createPickingRay(pickX - viewport.x, pickY - viewport.y, vp, w, h);
      if (ray) {
        info.ray = ray;
        await picker._detailedPick(info, ray);
      }
    }
    if (debugLabel) {
      console.trace("pick-debug", {
        label: debugLabel,
        input: { x, y, pickX, pickY, px, py, backingWidth, backingHeight, clientWidth, clientHeight, viewport },
        ray: info.ray ?? debugRay,
        pickId,
        depth,
        hit: true,
        mesh: hitMesh.name ?? "(unnamed)",
        thinInstanceIndex: hitThinIdx,
        pickedPoint: info.pickedPoint,
        distance: info.distance
      });
    }
    return info;
  }
  function disposePicker(picker) {
    if (picker._rt) {
      picker._rt.colorTex.destroy();
      picker._rt.depthColorTex.destroy();
      picker._rt.depthTex.destroy();
      picker._rt.colorStaging.destroy();
      picker._rt.depthStaging.destroy();
      picker._rt = null;
    }
    if (picker._sceneUbo) {
      picker._sceneUbo.destroy();
      picker._sceneUbo = null;
      picker._sceneBG = null;
    }
    if (picker._gsMeshResources) {
      void Promise.resolve().then(() => (init_gs_picking_pipeline(), gs_picking_pipeline_exports)).then((m) => {
        if (!picker._gsMeshResources) {
          return;
        }
        for (const res of picker._gsMeshResources.values()) {
          m.disposeGsPickMeshResources(res);
        }
        picker._gsMeshResources = null;
      });
    }
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/detailed-picking.ts
  init_deformed_geometry();
  function enableDetailedPicking(picker) {
    picker._detailedPick = detailedPick;
  }
  async function detailedPick(info, ray) {
    const mesh = info.pickedMesh;
    const mi = mesh;
    if (!mi || !mi._cpuPositions || !mi._cpuIndices) {
      return;
    }
    const deformedPositions = hasCpuDeformationData(mi) ? computeDeformedPositions(mi) : null;
    const positions = deformedPositions ?? mi._cpuPositions;
    const normals = mi._cpuNormals;
    const indices = mi._cpuIndices;
    let worldMatrix = mi.worldMatrix;
    if (info.thinInstanceIndex >= 0 && mi.thinInstances) {
      const offset = info.thinInstanceIndex * 16;
      worldMatrix = mi.thinInstances.matrices.subarray(offset, offset + 16);
    }
    const triCount = indices.length / 3;
    let closestT = Infinity;
    let closestFace = -1;
    let closestBu = 0;
    let closestBv = 0;
    for (let i = 0; i < triCount; i++) {
      const i0 = indices[i * 3];
      const i1 = indices[i * 3 + 1];
      const i2 = indices[i * 3 + 2];
      const ax = positions[i0 * 3], ay = positions[i0 * 3 + 1], az = positions[i0 * 3 + 2];
      const bx = positions[i1 * 3], by = positions[i1 * 3 + 1], bz = positions[i1 * 3 + 2];
      const cx = positions[i2 * 3], cy = positions[i2 * 3 + 1], cz = positions[i2 * 3 + 2];
      const wax = worldMatrix[0] * ax + worldMatrix[4] * ay + worldMatrix[8] * az + worldMatrix[12];
      const way = worldMatrix[1] * ax + worldMatrix[5] * ay + worldMatrix[9] * az + worldMatrix[13];
      const waz = worldMatrix[2] * ax + worldMatrix[6] * ay + worldMatrix[10] * az + worldMatrix[14];
      const wbx = worldMatrix[0] * bx + worldMatrix[4] * by + worldMatrix[8] * bz + worldMatrix[12];
      const wby = worldMatrix[1] * bx + worldMatrix[5] * by + worldMatrix[9] * bz + worldMatrix[13];
      const wbz = worldMatrix[2] * bx + worldMatrix[6] * by + worldMatrix[10] * bz + worldMatrix[14];
      const wcx = worldMatrix[0] * cx + worldMatrix[4] * cy + worldMatrix[8] * cz + worldMatrix[12];
      const wcy = worldMatrix[1] * cx + worldMatrix[5] * cy + worldMatrix[9] * cz + worldMatrix[13];
      const wcz = worldMatrix[2] * cx + worldMatrix[6] * cy + worldMatrix[10] * cz + worldMatrix[14];
      const result = rayTriangleIntersect(
        ray.origin[0],
        ray.origin[1],
        ray.origin[2],
        ray.direction[0],
        ray.direction[1],
        ray.direction[2],
        ray.length,
        wax,
        way,
        waz,
        wbx,
        wby,
        wbz,
        wcx,
        wcy,
        wcz
      );
      if (result && result.t > 0 && result.t < closestT) {
        closestT = result.t;
        closestFace = i;
        closestBu = result.u;
        closestBv = result.v;
      }
    }
    if (closestFace >= 0) {
      const bjsBu = clampBarycentric(1 - closestBu - closestBv);
      info.faceId = closestFace;
      info.bu = bjsBu;
      info.bv = clampBarycentric(closestBu);
      info.distance = closestT;
      info.pickedPoint = [ray.origin[0] + ray.direction[0] * closestT, ray.origin[1] + ray.direction[1] * closestT, ray.origin[2] + ray.direction[2] * closestT];
      if (normals) {
        const i02 = indices[closestFace * 3];
        const i12 = indices[closestFace * 3 + 1];
        const i22 = indices[closestFace * 3 + 2];
        const bw = 1 - info.bu - info.bv;
        const localNormal = normalizeVec3(
          info.bu * normals[i02 * 3] + info.bv * normals[i12 * 3] + bw * normals[i22 * 3],
          info.bu * normals[i02 * 3 + 1] + info.bv * normals[i12 * 3 + 1] + bw * normals[i22 * 3 + 1],
          info.bu * normals[i02 * 3 + 2] + info.bv * normals[i12 * 3 + 2] + bw * normals[i22 * 3 + 2]
        );
        const worldNormal = normalizeVec3(
          worldMatrix[0] * localNormal[0] + worldMatrix[4] * localNormal[1] + worldMatrix[8] * localNormal[2],
          worldMatrix[1] * localNormal[0] + worldMatrix[5] * localNormal[1] + worldMatrix[9] * localNormal[2],
          worldMatrix[2] * localNormal[0] + worldMatrix[6] * localNormal[1] + worldMatrix[10] * localNormal[2]
        );
        const flip2 = worldNormal[0] * ray.direction[0] + worldNormal[1] * ray.direction[1] + worldNormal[2] * ray.direction[2] > 0;
        info.pickedNormal = flip2 ? [-localNormal[0], -localNormal[1], -localNormal[2]] : localNormal;
        info.pickedNormalWorld = flip2 ? [-worldNormal[0], -worldNormal[1], -worldNormal[2]] : worldNormal;
      }
      const i0 = indices[closestFace * 3];
      const i1 = indices[closestFace * 3 + 1];
      const i2 = indices[closestFace * 3 + 2];
      const ax = positions[i0 * 3];
      const ay = positions[i0 * 3 + 1];
      const az = positions[i0 * 3 + 2];
      const bx = positions[i1 * 3];
      const by = positions[i1 * 3 + 1];
      const bz = positions[i1 * 3 + 2];
      const cx = positions[i2 * 3];
      const cy = positions[i2 * 3 + 1];
      const cz = positions[i2 * 3 + 2];
      const faceNormal = normalizeVec3(
        (by - ay) * (cz - az) - (bz - az) * (cy - ay),
        (bz - az) * (cx - ax) - (bx - ax) * (cz - az),
        (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
      );
      const faceWorldNormal = normalizeVec3(
        worldMatrix[0] * faceNormal[0] + worldMatrix[4] * faceNormal[1] + worldMatrix[8] * faceNormal[2],
        worldMatrix[1] * faceNormal[0] + worldMatrix[5] * faceNormal[1] + worldMatrix[9] * faceNormal[2],
        worldMatrix[2] * faceNormal[0] + worldMatrix[6] * faceNormal[1] + worldMatrix[10] * faceNormal[2]
      );
      const flip = faceWorldNormal[0] * ray.direction[0] + faceWorldNormal[1] * ray.direction[1] + faceWorldNormal[2] * ray.direction[2] > 0;
      info.pickedFaceNormal = flip ? [-faceNormal[0], -faceNormal[1], -faceNormal[2]] : faceNormal;
      info.pickedFaceNormalWorld = flip ? [-faceWorldNormal[0], -faceWorldNormal[1], -faceWorldNormal[2]] : faceWorldNormal;
    }
  }
  function clampBarycentric(value) {
    return Math.abs(value) < 1e-12 ? 0 : value;
  }
  function hasCpuDeformationData(mesh) {
    const morph = mesh.morphTargets;
    const skeleton = mesh.skeleton;
    return !!morph?.targets && !!morph.weights || !!skeleton?.boneMatrices && !!skeleton.joints && !!skeleton.weights;
  }
  function rayTriangleIntersect(ox, oy, oz, dx, dy, dz, length, v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z) {
    const EPSILON = 1e-3;
    const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
    const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
    const hx = dy * e2z - dz * e2y;
    const hy = dz * e2x - dx * e2z;
    const hz = dx * e2y - dy * e2x;
    const det = e1x * hx + e1y * hy + e1z * hz;
    if (det === 0) {
      return null;
    }
    const invDet = 1 / det;
    const sx = ox - v0x, sy = oy - v0y, sz = oz - v0z;
    const u = (sx * hx + sy * hy + sz * hz) * invDet;
    if (u < -EPSILON || u > 1 + EPSILON) {
      return null;
    }
    const qx = sy * e1z - sz * e1y;
    const qy = sz * e1x - sx * e1z;
    const qz = sx * e1y - sy * e1x;
    const v = (dx * qx + dy * qy + dz * qz) * invDet;
    if (v < -EPSILON || u + v > 1 + EPSILON) {
      return null;
    }
    const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
    if (t > length || t < 0) {
      return null;
    }
    return { t, u, v };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/picking/picking-helpers.ts
  function getPickedNormal(info, useWorldCoordinates = false) {
    if (useWorldCoordinates && info.pickedNormalWorld) {
      return info.pickedNormalWorld;
    }
    if (!useWorldCoordinates && info.pickedNormal) {
      return info.pickedNormal;
    }
    const mi = info.pickedMesh;
    if (info.faceId < 0 || !mi || !mi._cpuNormals || !mi._cpuIndices) {
      return null;
    }
    const normals = mi._cpuNormals;
    const indices = mi._cpuIndices;
    const face = info.faceId;
    const i0 = indices[face * 3];
    const i1 = indices[face * 3 + 1];
    const i2 = indices[face * 3 + 2];
    const bw = 1 - info.bu - info.bv;
    const nx = info.bu * normals[i0 * 3] + info.bv * normals[i1 * 3] + bw * normals[i2 * 3];
    const ny = info.bu * normals[i0 * 3 + 1] + info.bv * normals[i1 * 3 + 1] + bw * normals[i2 * 3 + 1];
    const nz = info.bu * normals[i0 * 3 + 2] + info.bv * normals[i1 * 3 + 2] + bw * normals[i2 * 3 + 2];
    const localNormal = normalizeVec3(nx, ny, nz);
    const wm = mi.worldMatrix;
    const wnx = wm[0] * localNormal[0] + wm[4] * localNormal[1] + wm[8] * localNormal[2];
    const wny = wm[1] * localNormal[0] + wm[5] * localNormal[1] + wm[9] * localNormal[2];
    const wnz = wm[2] * localNormal[0] + wm[6] * localNormal[1] + wm[10] * localNormal[2];
    const worldNormal = normalizeVec3(wnx, wny, wnz);
    const flip = info.ray ? worldNormal[0] * info.ray.direction[0] + worldNormal[1] * info.ray.direction[1] + worldNormal[2] * info.ray.direction[2] > 0 : false;
    if (!useWorldCoordinates) {
      return flip ? [-localNormal[0], -localNormal[1], -localNormal[2]] : localNormal;
    }
    return flip ? [-worldNormal[0], -worldNormal[1], -worldNormal[2]] : worldNormal;
  }

  // ../../../Babylon-Lite/lab/lite/src/lite/scene113.ts
  var PICK_TARGET_X_RATIO = 0.625;
  var PICK_TARGET_Y_RATIO = 0.625;
  function createUnlitMaterial(color) {
    const material = createStandardMaterial();
    material.diffuseColor = [1, 1, 1];
    material.emissiveColor = color;
    material.specularColor = [0, 0, 0];
    material.disableLighting = true;
    return material;
  }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function computeNormalBasisQuaternion(normal) {
    const yAxis = normalizeVec3(normal[0], normal[1], normal[2], 1e-8);
    const reference = Math.abs(yAxis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const xBasis = cross(reference, yAxis);
    const xAxis = normalizeVec3(xBasis[0], xBasis[1], xBasis[2], 1e-8);
    const zAxis = cross(xAxis, yAxis);
    const m00 = xAxis[0];
    const m01 = yAxis[0];
    const m02 = zAxis[0];
    const m10 = xAxis[1];
    const m11 = yAxis[1];
    const m12 = zAxis[1];
    const m20 = xAxis[2];
    const m21 = yAxis[2];
    const m22 = zAxis[2];
    const trace = m00 + m11 + m22;
    let qx;
    let qy;
    let qz;
    let qw;
    if (trace > 0) {
      const s = Math.sqrt(trace + 1) * 2;
      qw = 0.25 * s;
      qx = (m21 - m12) / s;
      qy = (m02 - m20) / s;
      qz = (m10 - m01) / s;
    } else if (m00 > m11 && m00 > m22) {
      const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      qw = (m21 - m12) / s;
      qx = 0.25 * s;
      qy = (m01 + m10) / s;
      qz = (m02 + m20) / s;
    } else if (m11 > m22) {
      const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      qw = (m02 - m20) / s;
      qx = (m01 + m10) / s;
      qy = 0.25 * s;
      qz = (m12 + m21) / s;
    } else {
      const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
      qw = (m10 - m01) / s;
      qx = (m02 + m20) / s;
      qy = (m12 + m21) / s;
      qz = 0.25 * s;
    }
    const len = Math.hypot(qx, qy, qz, qw);
    return len < 1e-8 ? [0, 0, 0, 1] : [qx / len, qy / len, qz / len, qw / len];
  }
  function rotateLocalYAxis(q) {
    const [x, y, z, w] = q;
    return [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)];
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function createMarkerSphere(engine) {
    const marker = createSphere(engine, { segments: 16, diameter: 0.14 });
    marker.name = "scene113-surface-marker";
    marker.material = createUnlitMaterial([1, 0.18, 0.82]);
    marker.position.set(0, -4, 0);
    return marker;
  }
  function createNormalMarker(engine) {
    const marker = createBox(engine, 1);
    marker.name = "scene113-normal-marker";
    marker.material = createUnlitMaterial([0.12, 0.92, 1]);
    marker.position.set(0, -4, 0);
    marker.scaling.set(0.055, 0.48, 0.055);
    return marker;
  }
  function markerNearPick(marker, point, maxDistanceSquared) {
    const dx = marker.position.x - point[0];
    const dy = marker.position.y - point[1];
    const dz = marker.position.z - point[2];
    return dx * dx + dy * dy + dz * dz < maxDistanceSquared;
  }
  function formatVec3(value) {
    return value ? value.map((v) => v.toPrecision(12)).join(",") : "";
  }
  function placeMarkers(info, surfaceMarker, normalMarker) {
    if (!info.hit || !info.pickedPoint) {
      return { markerPlaced: false, normalMarkerPlaced: false, normalMarkerAligned: false, markerNearPick: false, normalMarkerNearPick: false, point: null };
    }
    const point = info.pickedPoint;
    const pickedNormal = getPickedNormal(info);
    const normal = pickedNormal ? normalizeVec3(pickedNormal[0], pickedNormal[1], pickedNormal[2], 1e-8) : [0, 0, -1];
    surfaceMarker.position.set(point[0], point[1], point[2]);
    normalMarker.position.set(point[0] + normal[0] * 0.38, point[1] + normal[1] * 0.38, point[2] + normal[2] * 0.38);
    const q = computeNormalBasisQuaternion(normal);
    normalMarker.rotationQuaternion.set(q[0], q[1], q[2], q[3]);
    const alignedAxis = rotateLocalYAxis(q);
    return {
      markerPlaced: true,
      normalMarkerPlaced: true,
      normalMarkerAligned: dot(alignedAxis, normal) > 0.999,
      markerNearPick: markerNearPick(surfaceMarker, point, 1e-8),
      normalMarkerNearPick: markerNearPick(normalMarker, point, 0.2),
      point
    };
  }
  async function waitFrames(frameCount) {
    for (let i = 0; i < frameCount; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
  async function main() {
    const __initStart = performance.now();
    const canvas = document.getElementById("renderCanvas");
    const engine = await createEngine(canvas);
    const scene = createSceneContext(engine);
    const camera = createArcRotateCamera(-Math.PI / 2, Math.PI / 2.28, 4.2, { x: 0, y: 0, z: 0 });
    camera.fov = 0.74;
    camera.nearPlane = 1;
    camera.farPlane = 1e4;
    scene.camera = camera;
    const sphere = createSphere(engine, { segments: 32, diameter: 1.8 });
    sphere.name = "scene113-picked-sphere";
    sphere.material = createUnlitMaterial([0.18, 0.48, 0.95]);
    addToScene(scene, sphere);
    const surfaceMarker = createMarkerSphere(engine);
    const normalMarker = createNormalMarker(engine);
    addToScene(scene, surfaceMarker);
    addToScene(scene, normalMarker);
    await registerScene(scene);
    await startEngine(engine);
    await waitFrames(4);
    const picker = createGpuPicker(scene);
    enableDetailedPicking(picker);
    const pickInfo = await pickAsync(picker, canvas.clientWidth * PICK_TARGET_X_RATIO, canvas.clientHeight * PICK_TARGET_Y_RATIO);
    const state = placeMarkers(pickInfo, surfaceMarker, normalMarker);
    disposePicker(picker);
    await waitFrames(4);
    canvas.dataset.drawCalls = String(engine.drawCallCount);
    canvas.dataset.initMs = String(performance.now() - __initStart);
    canvas.dataset.pickedHit = pickInfo.hit ? pickInfo.pickedMesh?.name ?? "" : "miss";
    canvas.dataset.pickPoint = formatVec3(state.point);
    canvas.dataset.markerPlaced = String(state.markerPlaced);
    canvas.dataset.normalMarkerPlaced = String(state.normalMarkerPlaced);
    canvas.dataset.normalMarkerAligned = String(state.normalMarkerAligned);
    canvas.dataset.markerNearPick = String(state.markerNearPick);
    canvas.dataset.normalMarkerNearPick = String(state.normalMarkerNearPick);
    canvas.dataset.ready = "true";
  }
  main().catch(console.error);
})();
