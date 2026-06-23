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
  var F32, F64, U32, U16, U8;
  var init_typed_arrays = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/typed-arrays.ts"() {
      "use strict";
      F32 = Float32Array;
      F64 = Float64Array;
      U32 = Uint32Array;
      U16 = Uint16Array;
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
  function addDeferredSceneRenderables(scene, build) {
    const ctx = scene;
    ctx._deferredBuilders.push(async () => {
      const built = await build(ctx.surface.engine, ctx);
      ctx._renderables.push(...built.renderables);
      if (built.dispose) {
        ctx._disposables.push(built.dispose);
      }
    });
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/texture/texture-2d.ts
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
    const mipLevelCount = mipMaps ? Math.floor(Math.log2(Math.max(width, height))) + 1 : 1;
    const texture = device.createTexture({
      size: { width, height },
      format,
      mipLevelCount,
      usage: TU.TEXTURE_BINDING | TU.COPY_DST | TU.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture({ source: imageBitmap, flipY: invertY }, { texture, premultipliedAlpha: premultiplyAlpha }, { width, height });
    imageBitmap.close();
    if (mipMaps && mipLevelCount > 1) {
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/shared/sprite-atlas.ts
  function createGridSpriteAtlas(texture, options) {
    const cellW = options.cellWidthPx;
    const cellH = options.cellHeightPx;
    const margin = options.marginPx ?? 0;
    const spacing = options.spacingPx ?? 0;
    const cols = options.columns ?? Math.max(1, Math.floor((texture.width - margin * 2 + spacing) / (cellW + spacing)));
    const rows = options.rows ?? Math.max(1, Math.floor((texture.height - margin * 2 + spacing) / (cellH + spacing)));
    const pivot = options.pivot ?? [0.5, 0.5];
    const tw = texture.width;
    const th = texture.height;
    const frames = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = margin + c * (cellW + spacing);
        const y = margin + r * (cellH + spacing);
        frames.push({
          uvMin: [x / tw, y / th],
          uvMax: [(x + cellW) / tw, (y + cellH) / th],
          sourceSizePx: [cellW, cellH],
          pivot: [pivot[0], pivot[1]]
        });
      }
    }
    return {
      texture,
      textureSizePx: [tw, th],
      frames,
      premultipliedAlpha: options.premultipliedAlpha ?? false
    };
  }
  async function loadSpriteAtlas(engine, textureUrl, options = {}) {
    if (options.metadataUrl !== void 0) {
      throw new Error("loadSpriteAtlas: metadataUrl is not implemented in PR 1.");
    }
    if (!options.gridSize) {
      throw new Error("loadSpriteAtlas: options.gridSize is required in PR 1.");
    }
    const texOpts = {
      // Sprite UVs are top-down (origin at image top-left); do not flip.
      invertY: false,
      // Atlas frames typically tile cleanly; use clamp to avoid bleeding from neighbouring cells at edges.
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      // Sprites usually look best with bilinear filtering and no mip chain — sharp pixel art still works in nearest.
      mipMaps: false,
      minFilter: options.sampling === "nearest" ? "nearest" : "linear",
      magFilter: options.sampling === "nearest" ? "nearest" : "linear",
      // Premultiply at decode if requested. Pair with `premultipliedAlpha: true` for
      // a mathematically honest premultiplied pipeline.
      premultiplyAlpha: options.premultiplyOnLoad ?? false,
      ...options.textureOptions
    };
    const texture = await loadTexture2D(engine, textureUrl, texOpts);
    return createGridSpriteAtlas(texture, {
      cellWidthPx: options.gridSize[0],
      cellHeightPx: options.gridSize[1],
      // Default `false` — matches the straight RGBA bits the PNG decoder produces.
      // Callers wanting premultiplied blending should pass `premultiplyOnLoad: true`
      // *and* `premultipliedAlpha: true` together so storage and blend factors agree.
      premultipliedAlpha: options.premultipliedAlpha ?? false
    });
  }
  function resolveSpriteFrame(atlas, frame) {
    if (frame < 0 || frame >= atlas.frames.length) {
      throw new Error(`resolveSpriteFrame: index ${frame} out of range [0, ${atlas.frames.length})`);
    }
    return frame;
  }
  var init_sprite_atlas = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/sprite/shared/sprite-atlas.ts"() {
      "use strict";
      init_texture_2d();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/blend-descriptors.ts
  var _ALPHA_BLEND_STATE;
  var init_blend_descriptors = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/sprite/blend-descriptors.ts"() {
      "use strict";
      _ALPHA_BLEND_STATE = {
        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/sprite-fx-hook.ts
  function _getSpriteFxHook() {
    return _spriteFxHook;
  }
  var _spriteFxHook;
  var init_sprite_fx_hook = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/sprite/sprite-fx-hook.ts"() {
      "use strict";
      _spriteFxHook = null;
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_create_standard_material();
  init_sprite_atlas();

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/sprite-blend.ts
  init_blend_descriptors();
  var spriteBlendAlpha = {
    _key: "alpha",
    _descriptor: _ALPHA_BLEND_STATE
  };

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/sprite-2d.ts
  init_typed_arrays();
  init_sprite_atlas();
  init_sprite_fx_hook();
  var PURE_2D_INSTANCE_FLOATS_PER_SPRITE = 13;
  var DEPTH_INSTANCE_FLOATS_PER_SPRITE = 14;
  var PURE_2D_INSTANCE_STRIDE_BYTES = PURE_2D_INSTANCE_FLOATS_PER_SPRITE * 4;
  var DEPTH_INSTANCE_STRIDE_BYTES = DEPTH_INSTANCE_FLOATS_PER_SPRITE * 4;
  var UVSCROLL_EXTRA_FLOATS_PER_SPRITE = 2;
  var PURE_2D_UVSCROLL_FLOATS_PER_SPRITE = PURE_2D_INSTANCE_FLOATS_PER_SPRITE + UVSCROLL_EXTRA_FLOATS_PER_SPRITE;
  var DEPTH_UVSCROLL_FLOATS_PER_SPRITE = DEPTH_INSTANCE_FLOATS_PER_SPRITE + UVSCROLL_EXTRA_FLOATS_PER_SPRITE;
  var PURE_2D_UVSCROLL_STRIDE_BYTES = PURE_2D_UVSCROLL_FLOATS_PER_SPRITE * 4;
  var DEPTH_UVSCROLL_STRIDE_BYTES = DEPTH_UVSCROLL_FLOATS_PER_SPRITE * 4;
  var SAVED_SIZE_FLOATS_PER_SPRITE = 2;
  var DEFAULT_CAPACITY = 16;
  function createSprite2DLayer(atlas, opts = {}) {
    const depth = opts.depth ?? "none";
    const blendMode = opts.blendMode ?? spriteBlendAlpha;
    const capacity = Math.max(1, opts.capacity ?? DEFAULT_CAPACITY);
    const view = {
      positionPx: [opts.view?.positionPx?.[0] ?? 0, opts.view?.positionPx?.[1] ?? 0],
      zoom: opts.view?.zoom ?? 1,
      rotation: opts.view?.rotation ?? 0
    };
    const uvScroll = opts.uvScroll === true;
    const baseFloatsPerSprite = depth === "none" ? PURE_2D_INSTANCE_FLOATS_PER_SPRITE : DEPTH_INSTANCE_FLOATS_PER_SPRITE;
    const instanceFloatsPerSprite = uvScroll ? baseFloatsPerSprite + UVSCROLL_EXTRA_FLOATS_PER_SPRITE : baseFloatsPerSprite;
    const instanceStrideBytes = instanceFloatsPerSprite * 4;
    const instanceData = new F32(capacity * instanceFloatsPerSprite);
    const layer = {
      _entityType: "sprite-2d-layer",
      atlas,
      depth,
      blendMode,
      opacity: opts.opacity ?? 1,
      visible: opts.visible ?? true,
      order: opts.order ?? 0,
      view,
      pivot: [opts.pivot?.[0] ?? 0.5, opts.pivot?.[1] ?? 0.5],
      layerZ: opts.layerZ ?? 0.5,
      count: 0,
      _capacity: capacity,
      _instanceFloatsPerSprite: instanceFloatsPerSprite,
      _instanceStrideBytes: instanceStrideBytes,
      _instanceData: instanceData,
      _savedSize: new F32(capacity * SAVED_SIZE_FLOATS_PER_SPRITE),
      _version: 0,
      _dirtyMin: 0,
      _dirtyMax: 0
    };
    if (uvScroll) {
      layer._uvScroll = true;
    }
    _getSpriteFxHook()?.initLayer(layer, opts);
    return layer;
  }
  function growCapacity(layer, minCapacity) {
    let cap = layer._capacity;
    while (cap < minCapacity) {
      cap *= 2;
    }
    const next = new F32(cap * layer._instanceFloatsPerSprite);
    next.set(layer._instanceData);
    layer._instanceData = next;
    const nextSaved = new F32(cap * SAVED_SIZE_FLOATS_PER_SPRITE);
    nextSaved.set(layer._savedSize);
    layer._savedSize = nextSaved;
    layer._capacity = cap;
  }
  function setSprite2DCount(layer, count) {
    layer.count = count;
  }
  function writeInstance(layer, slotIndex, props, prev) {
    const data = layer._instanceData;
    const base = slotIndex * layer._instanceFloatsPerSprite;
    const savedBase = slotIndex * SAVED_SIZE_FLOATS_PER_SPRITE;
    const isAdd = prev === null;
    const frame = props.frame !== void 0 ? layer.atlas.frames[resolveSpriteFrame(layer.atlas, props.frame)] : null;
    const posX = props.positionPx ? props.positionPx[0] : prev[0];
    const posY = props.positionPx ? props.positionPx[1] : prev[1];
    let trueW;
    let trueH;
    if (props.sizePx) {
      trueW = props.sizePx[0];
      trueH = props.sizePx[1];
    } else if (frame) {
      trueW = frame.sourceSizePx[0];
      trueH = frame.sourceSizePx[1];
    } else if (isAdd) {
      trueW = 0;
      trueH = 0;
    } else {
      trueW = layer._savedSize[savedBase];
      trueH = layer._savedSize[savedBase + 1];
    }
    layer._savedSize[savedBase] = trueW;
    layer._savedSize[savedBase + 1] = trueH;
    let visible;
    if (props.visible !== void 0) {
      visible = props.visible;
    } else if (isAdd) {
      visible = true;
    } else {
      visible = prev[2] !== 0 || prev[3] !== 0;
    }
    let uMin;
    let vMin;
    let uMax;
    let vMax;
    if (frame) {
      uMin = frame.uvMin[0];
      vMin = frame.uvMin[1];
      uMax = frame.uvMax[0];
      vMax = frame.uvMax[1];
    } else if (isAdd) {
      uMin = 0;
      vMin = 0;
      uMax = 1;
      vMax = 1;
    } else {
      uMin = prev[4];
      vMin = prev[5];
      uMax = prev[6];
      vMax = prev[7];
    }
    if (props.flipX === true) {
      const t = uMin;
      uMin = uMax;
      uMax = t;
    }
    if (props.flipY === true) {
      const t = vMin;
      vMin = vMax;
      vMax = t;
    }
    const rotation = props.rotation ?? (prev ? prev[8] : 0);
    const hasDepthSlot = layer.depth !== "none";
    const z = hasDepthSlot ? props.z ?? (prev ? prev[13] : layer.layerZ) : 0;
    data[base + 0] = posX;
    data[base + 1] = posY;
    data[base + 2] = visible ? trueW : 0;
    data[base + 3] = visible ? trueH : 0;
    data[base + 4] = uMin;
    data[base + 5] = vMin;
    data[base + 6] = uMax;
    data[base + 7] = vMax;
    data[base + 8] = rotation;
    if (props.color) {
      data[base + 9] = props.color[0];
      data[base + 10] = props.color[1];
      data[base + 11] = props.color[2];
      data[base + 12] = props.color[3];
    } else if (isAdd) {
      data[base + 9] = 1;
      data[base + 10] = 1;
      data[base + 11] = 1;
      data[base + 12] = 1;
    }
    if (hasDepthSlot) {
      data[base + 13] = z;
    }
    if (layer._uvScroll) {
      const uvSlot = base + (hasDepthSlot ? 14 : 13);
      if (props.uvOffset) {
        data[uvSlot] = props.uvOffset[0];
        data[uvSlot + 1] = props.uvOffset[1];
      } else if (isAdd) {
        data[uvSlot] = 0;
        data[uvSlot + 1] = 0;
      }
    }
  }
  function markDirty(layer, lo, hi) {
    if (layer._dirtyMin >= layer._dirtyMax) {
      layer._dirtyMin = lo;
      layer._dirtyMax = hi;
    } else {
      if (lo < layer._dirtyMin) {
        layer._dirtyMin = lo;
      }
      if (hi > layer._dirtyMax) {
        layer._dirtyMax = hi;
      }
    }
    layer._version = layer._version + 1 | 0;
  }
  function addSprite2DIndex(layer, props) {
    if (props.positionPx === void 0) {
      throw new Error("addSprite2DIndex: props.positionPx is required.");
    }
    const idx = layer.count;
    if (idx >= layer._capacity) {
      growCapacity(layer, idx + 1);
    }
    writeInstance(layer, idx, props, null);
    setSprite2DCount(layer, layer.count + 1);
    markDirty(layer, idx, idx + 1);
    return idx;
  }
  function updateSprite2DIndex(layer, index, patch) {
    if (index < 0 || index >= layer.count) {
      throw new Error(`updateSprite2DIndex: index ${index} out of range [0, ${layer.count})`);
    }
    const base = index * layer._instanceFloatsPerSprite;
    const prev = layer._instanceData.subarray(base, base + layer._instanceFloatsPerSprite);
    writeInstance(layer, index, patch, prev);
    markDirty(layer, index, index + 1);
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/sprite-pipeline.ts
  init_typed_arrays();
  init_gpu_flags();
  init_sprite_fx_hook();
  var SPRITE_POSITION_OFFSET_BYTES = 0;
  var SPRITE_SIZE_OFFSET_BYTES = 8;
  var SPRITE_UV_MIN_OFFSET_BYTES = 16;
  var SPRITE_UV_MAX_OFFSET_BYTES = 24;
  var SPRITE_ROTATION_OFFSET_BYTES = 32;
  var SPRITE_COLOR_OFFSET_BYTES = 36;
  var SPRITE_DEPTH_OFFSET_BYTES = 52;
  var SPRITE_UVOFFSET_OFFSET_PURE_2D_BYTES = 52;
  var SPRITE_UVOFFSET_OFFSET_DEPTH_BYTES = 56;
  function makeSpriteWgsl(hasDepth, spriteGroupIndex, uvScroll) {
    return `${makeSpritePrologueWgsl(hasDepth, spriteGroupIndex, uvScroll)}
@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
let s = textureSample(atlasTex, atlasSamp, in.uv);
return s * in.tint * L.opacityMul;
}`;
  }
  function makeSpritePrologueWgsl(hasDepth, spriteGroupIndex, uvScroll = false) {
    const group = `@group(${spriteGroupIndex})`;
    const zAttribute = hasDepth ? `,
@location(6) iZ: f32` : "";
    const uvOffsetAttribute = uvScroll ? `,
@location(7) iUvOffset: vec2<f32>` : "";
    const zPosition = hasDepth ? "1.0 - in.iZ" : "0.0";
    return `struct Layer {
viewPos: vec2<f32>,
viewScale: f32,
viewRot: f32,
screenSize: vec2<f32>,
pivot: vec2<f32>,
// Per-layer opacity, pre-shaped for the layer's blend mode (CPU-side):
//   straight-alpha:  (1, 1, 1, opacity)  \u2014 only alpha is scaled
//   premultiplied:   (opacity, opacity, opacity, opacity) \u2014 RGB and A scale together
// One uniform, no shader branch.
opacityMul: vec4<f32>,
};
${group} @binding(0) var<uniform> L: Layer;
${group} @binding(1) var atlasTex: texture_2d<f32>;
${group} @binding(2) var atlasSamp: sampler;
struct VIn {
@builtin(vertex_index) vid: u32,
@location(0) iPos: vec2<f32>,
@location(1) iSize: vec2<f32>,
@location(2) iUvMin: vec2<f32>,
@location(3) iUvMax: vec2<f32>,
@location(4) iRot: f32,
@location(5) iColor: vec4<f32>${zAttribute}${uvOffsetAttribute}
};
struct VOut {
@builtin(position) pos: vec4<f32>,
@location(0) uv: vec2<f32>,
@location(1) tint: vec4<f32>,
};
@vertex
fn vs(in: VIn) -> VOut {
var corners = array<vec2<f32>, 4>(vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0), vec2<f32>(0.0, 1.0));
let c = corners[in.vid];
let local = (c - L.pivot) * in.iSize;
let cr = cos(in.iRot);
let sr = sin(in.iRot);
let rotated = vec2<f32>(local.x * cr - local.y * sr, local.x * sr + local.y * cr);
let layerPx = in.iPos + rotated;
let centered = layerPx - L.viewPos;
let lc = cos(L.viewRot);
let ls = sin(L.viewRot);
let viewRot = vec2<f32>(centered.x * lc - centered.y * ls, centered.x * ls + centered.y * lc);
let screenPx = viewRot * L.viewScale;
let ndc = vec2<f32>(screenPx.x / L.screenSize.x * 2.0 - 1.0, 1.0 - screenPx.y / L.screenSize.y * 2.0);
let uv = mix(in.iUvMin, in.iUvMax, c)${uvScroll ? " + in.iUvOffset" : ""};
var out: VOut;
out.pos = vec4<f32>(ndc, ${zPosition}, 1.0);
out.uv = uv;
out.tint = in.iColor;
return out;
}`;
  }
  function createSpritePipelineCache() {
    return {
      _devices: /* @__PURE__ */ new WeakMap()
    };
  }
  function resetSpritePipelineCache(cache) {
    cache._devices = /* @__PURE__ */ new WeakMap();
  }
  function getOrCreateSpritePipeline(engine, cache, format, sampleCount, blendMode, hasDepth, depthWrite = false, depthStencilFormat, sceneBindGroupLayout, layer) {
    const deviceCache = getSpritePipelineDeviceCache(engine, cache);
    const resolvedDepthStencilFormat = normalizeDepthStencilFormat(hasDepth, depthStencilFormat);
    const key = spritePipelineKey(format, sampleCount, blendMode, hasDepth, depthWrite, resolvedDepthStencilFormat, layer);
    const cached = deviceCache._pipelines.get(key);
    if (cached) {
      return cached;
    }
    const pipeline = buildSpritePipeline(engine, deviceCache, format, sampleCount, blendMode, hasDepth, depthWrite, resolvedDepthStencilFormat, sceneBindGroupLayout, layer);
    deviceCache._pipelines.set(key, pipeline);
    return pipeline;
  }
  function createSpriteLayerBindGroup(engine, pipeline, spriteBindGroupIndex, layer, uniformBuffer, fx) {
    const tex = layer.atlas.texture;
    const entries = [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: tex.view },
      { binding: 2, resource: tex.sampler }
    ];
    if (fx) {
      for (const entry of _getSpriteFxHook().bindEntries(fx, 3)) {
        entries.push(entry);
      }
    }
    return engine._device.createBindGroup({
      layout: pipeline.getBindGroupLayout(spriteBindGroupIndex),
      entries
    });
  }
  function getSpritePipelineDeviceCache(engine, cache) {
    let deviceCache = cache._devices.get(engine._device);
    if (!deviceCache) {
      deviceCache = {
        _shaderModule: null,
        _sceneShaderModule: null,
        _shaderModuleUv: null,
        _sceneShaderModuleUv: null,
        _pipelines: /* @__PURE__ */ new Map()
      };
      cache._devices.set(engine._device, deviceCache);
    }
    return deviceCache;
  }
  function normalizeDepthStencilFormat(hasDepth, depthStencilFormat) {
    if (!hasDepth) {
      return null;
    }
    if (!depthStencilFormat) {
      throw new Error("Sprite pipeline: depth-enabled pipelines require a depth-stencil format.");
    }
    return depthStencilFormat;
  }
  function spritePipelineKey(format, sampleCount, blendMode, hasDepth, depthWrite, depthStencilFormat, layer) {
    const customKey = layer ? _getSpriteFxHook()?.pipelineKeyPart(layer) ?? "" : "";
    const uvKey = layer?._uvScroll ? "1" : "0";
    return `${format}:${sampleCount}:${blendMode._key}:${hasDepth ? 1 : 0}:${depthWrite ? 1 : 0}:${depthStencilFormat ?? "-"}:cs${customKey}:uv${uvKey}`;
  }
  function getShaderModule(engine, cache, hasDepth, layer) {
    const customModule = layer ? _getSpriteFxHook()?.shaderModule(engine, hasDepth, layer) : null;
    if (customModule) {
      return customModule;
    }
    const uvScroll = layer?._uvScroll === true;
    if (hasDepth) {
      if (uvScroll) {
        cache._sceneShaderModuleUv ?? (cache._sceneShaderModuleUv = engine._device.createShaderModule({ code: makeSpriteWgsl(true, 1, true) }));
        return cache._sceneShaderModuleUv;
      }
      cache._sceneShaderModule ?? (cache._sceneShaderModule = engine._device.createShaderModule({ code: makeSpriteWgsl(true, 1, false) }));
      return cache._sceneShaderModule;
    }
    if (uvScroll) {
      cache._shaderModuleUv ?? (cache._shaderModuleUv = engine._device.createShaderModule({ code: makeSpriteWgsl(false, 0, true) }));
      return cache._shaderModuleUv;
    }
    cache._shaderModule ?? (cache._shaderModule = engine._device.createShaderModule({ code: makeSpriteWgsl(false, 0, false) }));
    return cache._shaderModule;
  }
  function buildSpritePipeline(engine, cache, format, sampleCount, blendMode, hasDepth, depthWrite, depthStencilFormat, sceneBindGroupLayout, layer) {
    const device = engine._device;
    const layoutEntries = [
      { binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: SS.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 2, visibility: SS.FRAGMENT, sampler: { type: "filtering" } }
    ];
    const extraLayoutEntries = layer ? _getSpriteFxHook()?.layoutEntries(layer, 3) : null;
    if (extraLayoutEntries) {
      for (const entry of extraLayoutEntries) {
        layoutEntries.push(entry);
      }
    }
    const bindGroupLayout2 = device.createBindGroupLayout({ entries: layoutEntries });
    const module = getShaderModule(engine, cache, hasDepth, layer);
    if (hasDepth && !sceneBindGroupLayout) {
      throw new Error("Sprite pipeline: depth-enabled pipelines require a scene bind-group layout.");
    }
    const bindGroupLayouts = hasDepth ? [sceneBindGroupLayout, bindGroupLayout2] : [bindGroupLayout2];
    const instanceAttributes = [
      { shaderLocation: 0, offset: SPRITE_POSITION_OFFSET_BYTES, format: "float32x2" },
      { shaderLocation: 1, offset: SPRITE_SIZE_OFFSET_BYTES, format: "float32x2" },
      { shaderLocation: 2, offset: SPRITE_UV_MIN_OFFSET_BYTES, format: "float32x2" },
      { shaderLocation: 3, offset: SPRITE_UV_MAX_OFFSET_BYTES, format: "float32x2" },
      { shaderLocation: 4, offset: SPRITE_ROTATION_OFFSET_BYTES, format: "float32" },
      { shaderLocation: 5, offset: SPRITE_COLOR_OFFSET_BYTES, format: "float32x4" }
    ];
    if (hasDepth) {
      instanceAttributes.push({ shaderLocation: 6, offset: SPRITE_DEPTH_OFFSET_BYTES, format: "float32" });
    }
    const uvScroll = layer?._uvScroll === true;
    if (uvScroll) {
      instanceAttributes.push({
        shaderLocation: 7,
        offset: hasDepth ? SPRITE_UVOFFSET_OFFSET_DEPTH_BYTES : SPRITE_UVOFFSET_OFFSET_PURE_2D_BYTES,
        format: "float32x2"
      });
    }
    const arrayStride = uvScroll ? hasDepth ? DEPTH_UVSCROLL_STRIDE_BYTES : PURE_2D_UVSCROLL_STRIDE_BYTES : hasDepth ? DEPTH_INSTANCE_STRIDE_BYTES : PURE_2D_INSTANCE_STRIDE_BYTES;
    const descriptor = {
      layout: device.createPipelineLayout({ bindGroupLayouts }),
      vertex: {
        module,
        entryPoint: "vs",
        buffers: [
          {
            arrayStride,
            stepMode: "instance",
            attributes: instanceAttributes
          }
        ]
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [{ format, blend: blendMode._descriptor, writeMask: CW.ALL }]
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      multisample: { count: sampleCount }
    };
    if (hasDepth) {
      descriptor.depthStencil = {
        format: depthStencilFormat,
        depthCompare: "greater-equal",
        depthWriteEnabled: depthWrite
      };
    }
    return device.createRenderPipeline(descriptor);
  }
  var LAYER_UBO_BYTES = 48;
  var LAYER_UBO_FLOATS = LAYER_UBO_BYTES / 4;
  var SHARED_SPRITE_INDEX_DATA = new U16([0, 1, 2, 0, 2, 3]);
  function createSpriteInstanceBuffer(device, layer, label) {
    return device.createBuffer({
      size: layer._capacity * layer._instanceStrideBytes,
      usage: BU.VERTEX | BU.COPY_DST,
      label
    });
  }
  function ensureSpriteInstanceBuffer(device, layer, currentBuffer, currentCapacity, label) {
    if (currentCapacity >= layer._capacity) {
      return { buffer: currentBuffer, capacity: currentCapacity, reallocated: false };
    }
    currentBuffer.destroy();
    return {
      buffer: createSpriteInstanceBuffer(device, layer, label),
      capacity: layer._capacity,
      reallocated: true
    };
  }
  function uploadSpriteInstances(device, layer, instanceBuffer, uploadedVersion) {
    if (uploadedVersion === layer._version) {
      return uploadedVersion;
    }
    if (layer.count === 0) {
      layer._dirtyMin = 0;
      layer._dirtyMax = 0;
      return layer._version;
    }
    let lo;
    let hi;
    if (uploadedVersion === -1) {
      lo = 0;
      hi = layer.count;
    } else {
      lo = layer._dirtyMin;
      hi = Math.min(layer._dirtyMax, layer.count);
    }
    if (hi > lo) {
      const offsetBytes = lo * layer._instanceStrideBytes;
      const bytes = (hi - lo) * layer._instanceStrideBytes;
      device.queue.writeBuffer(instanceBuffer, offsetBytes, layer._instanceData.buffer, layer._instanceData.byteOffset + offsetBytes, bytes);
    }
    layer._dirtyMin = 0;
    layer._dirtyMax = 0;
    return layer._version;
  }
  function buildSpriteLayerUbo(layer, screenWidth, screenHeight, ubo) {
    ubo[0] = layer.view.positionPx[0];
    ubo[1] = layer.view.positionPx[1];
    ubo[2] = layer.view.zoom;
    ubo[3] = layer.view.rotation;
    ubo[4] = screenWidth;
    ubo[5] = screenHeight;
    ubo[6] = layer.pivot[0];
    ubo[7] = layer.pivot[1];
    const op = layer.opacity;
    if (layer.blendMode._premultipliedOpacity) {
      ubo[8] = op;
      ubo[9] = op;
      ubo[10] = op;
      ubo[11] = op;
    } else {
      ubo[8] = 1;
      ubo[9] = 1;
      ubo[10] = 1;
      ubo[11] = op;
    }
  }
  function writeSpriteLayerUboIfDirty(device, uniformBuffer, scratchUbo, lastUbo, alreadyUploaded) {
    let dirty = !alreadyUploaded;
    if (!dirty) {
      for (let i = 0; i < LAYER_UBO_FLOATS; i++) {
        if (lastUbo[i] !== scratchUbo[i]) {
          dirty = true;
          break;
        }
      }
    }
    if (dirty) {
      device.queue.writeBuffer(uniformBuffer, 0, scratchUbo.buffer, scratchUbo.byteOffset, LAYER_UBO_BYTES);
      lastUbo.set(scratchUbo);
    }
    return true;
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/sprite-scene.ts
  init_scene_core();

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/sprite-renderable.ts
  init_typed_arrays();
  init_gpu_flags();
  init_scene_helpers();
  init_gpu_buffers();
  init_sprite_fx_hook();
  var _sharedPipelineCache = null;
  var _sharedPipelineCacheRefs = 0;
  function acquireSharedPipelineCache() {
    _sharedPipelineCache ?? (_sharedPipelineCache = createSpritePipelineCache());
    _sharedPipelineCacheRefs++;
    return _sharedPipelineCache;
  }
  function releaseSharedPipelineCache() {
    if (_sharedPipelineCacheRefs === 0) {
      return;
    }
    _sharedPipelineCacheRefs--;
    if (_sharedPipelineCacheRefs === 0 && _sharedPipelineCache) {
      resetSpritePipelineCache(_sharedPipelineCache);
      _sharedPipelineCache = null;
    }
  }
  function buildSpriteRenderable(engine, layer) {
    if (layer.depth === "none") {
      throw new Error('Sprite2DLayer with depth: "none" must be rendered via createSpriteRenderer, not addDepthHostedSpriteLayer.');
    }
    const indexBuffer = createMappedBuffer(engine, SHARED_SPRITE_INDEX_DATA, BU.INDEX);
    const uniformBuffer = createEmptyUniformBuffer(engine, LAYER_UBO_BYTES, "sprite-depth-hosted-ubo");
    const cap = layer._capacity;
    const instanceBuffer = createSpriteInstanceBuffer(engine._device, layer, "sprite-depth-hosted-instances");
    const fx = _getSpriteFxHook()?.createLayerFx(engine, "sprite-depth-hosted-fx-ubo", layer) ?? null;
    const isTransparent = layer.depth === "test";
    const isDirect = layer.depth === "test-write";
    const renderable = {
      // Depth-write sprite layers are mutable instanced batches, so route them through
      // the direct-draw phase after cached opaque meshes and before transparent draws.
      order: isTransparent ? 200 : 100,
      isTransparent,
      _direct: isDirect,
      _engine: engine,
      _layer: layer,
      _indexBuffer: indexBuffer,
      _uniformBuffer: uniformBuffer,
      _instanceBuffer: instanceBuffer,
      _instanceBufferCapacity: cap,
      _pipelineCache: acquireSharedPipelineCache(),
      _bindGroups: /* @__PURE__ */ new Map(),
      _uploadedVersion: -1,
      _uboUploaded: false,
      _lastUbo: new F32(LAYER_UBO_BYTES / 4),
      _scratchUbo: new F32(LAYER_UBO_BYTES / 4),
      _fx: fx,
      _disposed: false,
      bind(engine2, target) {
        return bindLayer(renderable, engine2, target);
      }
    };
    return {
      renderable,
      dispose() {
        disposeRenderable(renderable);
      }
    };
  }
  function bindLayer(r, engine, target) {
    if (!target._depthStencilFormat) {
      throw new Error("Depth-hosted Sprite2DLayer requires a depth-stencil render target.");
    }
    const sampleCount = target._sampleCount === 1 ? 1 : 4;
    const depthWrite = r._layer.depth === "test-write";
    const pipeline = getOrCreateSpritePipeline(
      engine,
      r._pipelineCache,
      target._colorFormat,
      sampleCount,
      r._layer.blendMode,
      true,
      depthWrite,
      target._depthStencilFormat,
      getSceneBindGroupLayout(engine),
      r._layer
    );
    let bindGroup = r._bindGroups.get(pipeline);
    if (!bindGroup) {
      bindGroup = createSpriteLayerBindGroup(engine, pipeline, 1, r._layer, r._uniformBuffer, r._fx);
      r._bindGroups.set(pipeline, bindGroup);
    }
    return {
      renderable: r,
      pipeline,
      update(context) {
        uploadLayer(r, context);
      },
      draw(pass) {
        return drawLayer(r, bindGroup, pass);
      }
    };
  }
  function uploadLayer(r, target) {
    if (r._disposed) {
      return;
    }
    if (!r._layer.visible || r._layer.count === 0) {
      return;
    }
    if (r._fx) {
      _getSpriteFxHook().updateFx(r._fx, r._layer, r._engine._currentDelta);
    }
    const grown = ensureSpriteInstanceBuffer(r._engine._device, r._layer, r._instanceBuffer, r._instanceBufferCapacity, "sprite-depth-hosted-instances");
    if (grown.reallocated) {
      r._instanceBuffer = grown.buffer;
      r._instanceBufferCapacity = grown.capacity;
      r._uploadedVersion = -1;
    }
    r._uploadedVersion = uploadSpriteInstances(r._engine._device, r._layer, r._instanceBuffer, r._uploadedVersion);
    buildSpriteLayerUbo(r._layer, target.targetWidth, target.targetHeight, r._scratchUbo);
    r._uboUploaded = writeSpriteLayerUboIfDirty(r._engine._device, r._uniformBuffer, r._scratchUbo, r._lastUbo, r._uboUploaded);
  }
  function drawLayer(r, bindGroup, pass) {
    if (r._disposed || !r._layer.visible || r._layer.count === 0) {
      return 0;
    }
    pass.setBindGroup(1, bindGroup);
    pass.setIndexBuffer(r._indexBuffer, "uint16");
    pass.setVertexBuffer(0, r._instanceBuffer);
    pass.drawIndexed(6, r._layer.count, 0, 0, 0);
    return 1;
  }
  function disposeRenderable(r) {
    if (r._disposed) {
      return;
    }
    r._disposed = true;
    r._instanceBuffer.destroy();
    r._uniformBuffer.destroy();
    r._indexBuffer.destroy();
    if (r._fx) {
      _getSpriteFxHook().disposeFx(r._fx);
    }
    r._bindGroups.clear();
    r._layer = null;
    releaseSharedPipelineCache();
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/sprite/sprite-scene.ts
  function addDepthHostedSpriteLayer(scene, layer) {
    if (layer.depth === "none") {
      throw new Error('Sprite2DLayer with depth: "none" must be rendered via createSpriteRenderer, not addDepthHostedSpriteLayer.');
    }
    addDeferredSceneRenderables(scene, (engine) => {
      const built = buildSpriteRenderable(engine, layer);
      return { renderables: [built.renderable], dispose: built.dispose };
    });
  }

  // ../../../Babylon-Lite/lab/lite/src/_shared/sprite-atlas-image.ts
  var ATLAS_WIDTH = 256;
  var ATLAS_HEIGHT = 128;
  var CELL = 32;
  var _cached = null;
  function getSpriteAtlasDataUrl() {
    if (_cached) {
      return _cached;
    }
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_WIDTH;
    canvas.height = ATLAS_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 8 + c;
        drawCell(ctx, c * CELL, r * CELL, idx);
      }
    }
    _cached = canvas.toDataURL("image/png");
    return _cached;
  }
  function drawCell(ctx, x, y, idx) {
    if (idx < 8) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, CELL, CELL);
      const cx = x + CELL / 2;
      const cy = y + CELL / 2;
      const angle = idx * Math.PI / 4;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, -4);
      ctx.lineTo(14, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    if (idx < 24) {
      const i = idx - 8;
      const bgHue = i * 360 / 16;
      const fgHue = (bgHue + 180) % 360;
      ctx.fillStyle = `hsl(${bgHue}, 60%, 30%)`;
      ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = `hsl(${fgHue}, 80%, 65%)`;
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + CELL / 2, 11, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const digit = idx - 24;
    ctx.fillStyle = "#0a4020";
    ctx.fillRect(x, y, CELL, CELL);
    ctx.fillStyle = "#cfe8d5";
    for (let i = 0; i < digit; i++) {
      const bx = x + 4 + i * 3;
      ctx.fillRect(bx, y + 6, 2, 20);
    }
  }
  var SPRITE_ATLAS_INFO = {
    widthPx: ATLAS_WIDTH,
    heightPx: ATLAS_HEIGHT,
    cellWidthPx: CELL,
    cellHeightPx: CELL,
    columns: 8,
    rows: 4
  };

  // ../../../Babylon-Lite/lab/lite/src/lite/scene53.ts
  var DESIGN_HEIGHT = 720;
  var SPRITE_SIZE = 180;
  var SPRITE_SPACING = 200;
  async function main() {
    const __initStart = performance.now();
    const canvas = document.getElementById("renderCanvas");
    const engine = await createEngine(canvas);
    const scene = createSceneContext(engine);
    scene.camera = createArcRotateCamera(-Math.PI / 2, Math.PI / 2, 8, { x: 0, y: 0, z: 0 });
    scene.camera.nearPlane = 1;
    scene.camera.farPlane = 100;
    addToScene(scene, createHemisphericLight([0, 1, 0], 1));
    const frontBox = createBox(engine, 2);
    frontBox.position.set(-1.5, 0, -2);
    const frontMat = createStandardMaterial();
    frontMat.diffuseColor = [0.85, 0.25, 0.25];
    frontBox.material = frontMat;
    addToScene(scene, frontBox);
    const backBox = createBox(engine, 2);
    backBox.position.set(1.5, 0, 2);
    const backMat = createStandardMaterial();
    backMat.diffuseColor = [0.25, 0.4, 0.85];
    backBox.material = backMat;
    addToScene(scene, backBox);
    const atlas = await loadSpriteAtlas(engine, getSpriteAtlasDataUrl(), {
      gridSize: [SPRITE_ATLAS_INFO.cellWidthPx, SPRITE_ATLAS_INFO.cellHeightPx],
      sampling: "linear"
    });
    const sprites = createSprite2DLayer(atlas, {
      capacity: 4,
      depth: "test-write"
    });
    const spriteIndices = addPerInstanceZSprites(sprites, canvas);
    let lastLayoutWidth = canvas.width;
    let lastLayoutHeight = canvas.height;
    onBeforeRender(scene, () => {
      if (canvas.width === lastLayoutWidth && canvas.height === lastLayoutHeight) {
        return;
      }
      lastLayoutWidth = canvas.width;
      lastLayoutHeight = canvas.height;
      updatePerInstanceZSprites(sprites, spriteIndices, canvas);
    });
    addDepthHostedSpriteLayer(scene, sprites);
    await registerScene(scene);
    await startEngine(engine);
    canvas.dataset.drawCalls = String(engine.drawCallCount);
    canvas.dataset.initMs = String(performance.now() - __initStart);
    canvas.dataset.ready = "true";
  }
  function addPerInstanceZSprites(layer, canvas) {
    const layout = getSpriteLayout(canvas);
    const a = addSprite2DIndex(layer, {
      positionPx: layout.a.position,
      sizePx: layout.size,
      frame: 24,
      // tally digit "0"
      color: [1, 0.95, 0.4, 1],
      z: 0.6
    });
    const b = addSprite2DIndex(layer, {
      positionPx: layout.b.position,
      sizePx: layout.size,
      frame: 25,
      // tally digit "1"
      color: [0.4, 0.9, 1, 1],
      z: 0.87
    });
    const c = addSprite2DIndex(layer, {
      positionPx: layout.c.position,
      sizePx: layout.size,
      frame: 26,
      // tally digit "2"
      color: [1, 0.5, 0.9, 1],
      z: 0.95
    });
    return [a, b, c];
  }
  function updatePerInstanceZSprites(layer, [a, b, c], canvas) {
    const layout = getSpriteLayout(canvas);
    updateSprite2DIndex(layer, a, { positionPx: layout.a.position, sizePx: layout.size });
    updateSprite2DIndex(layer, b, { positionPx: layout.b.position, sizePx: layout.size });
    updateSprite2DIndex(layer, c, { positionPx: layout.c.position, sizePx: layout.size });
  }
  function getSpriteLayout(canvas) {
    const scale = canvas.height / DESIGN_HEIGHT;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const size = SPRITE_SIZE * scale;
    const dx = SPRITE_SPACING * scale;
    return {
      a: { position: [cx - dx, cy] },
      b: { position: [cx, cy] },
      c: { position: [cx + dx, cy] },
      size: [size, size]
    };
  }
  main().catch((err) => {
    console.error(err);
  });
})();
