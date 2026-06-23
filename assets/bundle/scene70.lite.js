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
  var F32, F64, U32, I32, U16, U8;
  var init_typed_arrays = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/typed-arrays.ts"() {
      "use strict";
      F32 = Float32Array;
      F64 = Float64Array;
      U32 = Uint32Array;
      I32 = Int32Array;
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
  function createDefaultPipelineDescriptor(opts) {
    const target = opts._blend ? { format: opts._format, blend: opts._blend } : { format: opts._format };
    return {
      label: opts._label,
      layout: opts._engine._device.createPipelineLayout({ bindGroupLayouts: opts._bgls }),
      vertex: { module: opts._vertModule, entryPoint: "main", buffers: opts._vertexBuffers },
      fragment: { module: opts._fragModule, entryPoint: "main", targets: [target] },
      depthStencil: {
        format: opts._depthStencilFormat ?? "depth24plus-stencil8",
        depthCompare: opts._depthCompare ?? REVERSE_DEPTH_COMPARE,
        depthWriteEnabled: opts._depthWriteEnabled ?? true
      },
      multisample: { count: opts._msaaSamples },
      primitive: { topology: "triangle-list", cullMode: opts._cullMode ?? "back", frontFace: "ccw" }
    };
  }
  var _cachedSceneBGL, _cachedDevice;
  var init_scene_helpers = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/render/scene-helpers.ts"() {
      "use strict";
      init_gpu_flags();
      init_render_target();
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
  function acquireGPUTexture(tex) {
    const m = texRefs();
    m.set(tex, (m.get(tex) ?? 0) + 1);
  }
  function releaseGPUTexture(tex) {
    const m = texRefs();
    const c = (m.get(tex) ?? 1) - 1;
    if (c <= 0) {
      tex.destroy();
      m.delete(tex);
      return true;
    }
    m.set(tex, c);
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
  function getTrilinearSampler(engine) {
    return getOrCreateSampler(engine, _trilinearDesc);
  }
  var _bilinearDesc, _trilinearDesc;
  var init_samplers = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/resource/samplers.ts"() {
      "use strict";
      init_gpu_pool();
      _bilinearDesc = { magFilter: "linear", minFilter: "linear" };
      _trilinearDesc = { magFilter: "linear", minFilter: "linear", mipmapFilter: "linear" };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/texture/mip-count.ts
  function mipLevelCount(width, height) {
    return Math.floor(Math.log2(Math.max(width, height))) + 1;
  }
  var init_mip_count = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/texture/mip-count.ts"() {
      "use strict";
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/light/point-light.ts
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
      set(v) {
        if (v !== _angle) {
          _angle = v;
          _cosHalfAngle = Math.cos(v * 0.5);
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-parser.ts
  function parseNodeMaterialSource(source) {
    const raw = source;
    if (!raw || !Array.isArray(raw.blocks)) {
      throw new Error("NodeMaterial: invalid source \u2014 expected `.blocks` array");
    }
    const blocks = /* @__PURE__ */ new Map();
    for (const rb of raw.blocks) {
      if (typeof rb.id !== "number") {
        throw new Error(`NodeMaterial: block missing numeric id (name=${rb.name})`);
      }
      const className = stripBabylonPrefix(rb.customType);
      const inputs = /* @__PURE__ */ new Map();
      for (const ri of rb.inputs ?? []) {
        const inName = (ri.name ?? "").trim();
        const outName = typeof ri.targetConnectionName === "string" ? ri.targetConnectionName.trim() : void 0;
        const source2 = typeof ri.targetBlockId === "number" && typeof outName === "string" ? { blockId: ri.targetBlockId, outputName: outName } : null;
        inputs.set(inName, {
          name: inName,
          source: source2
        });
      }
      const outputs = /* @__PURE__ */ new Set();
      for (const ro of rb.outputs ?? []) {
        outputs.add((ro.name ?? "").trim());
      }
      blocks.set(rb.id, {
        id: rb.id,
        className,
        name: rb.name,
        inputs,
        outputs,
        serialized: rb
      });
    }
    const namedInputs = /* @__PURE__ */ new Map();
    for (const b of blocks.values()) {
      if (b.className !== "InputBlock") {
        continue;
      }
      const mode = b.serialized["mode"] ?? b.serialized["_mode"];
      if (mode === 0 || mode === void 0) {
        if (typeof b.serialized["systemValue"] === "number") {
          continue;
        }
        if (b.name) {
          namedInputs.set(b.name, b.id);
        }
      }
    }
    const rawAlpha = raw;
    const alphaMode = typeof rawAlpha.alphaMode === "number" ? rawAlpha.alphaMode : 0;
    let needsAlphaBlending;
    if (rawAlpha.forceAlphaBlending === true) {
      needsAlphaBlending = true;
    } else if (typeof rawAlpha._needAlphaBlending === "boolean") {
      needsAlphaBlending = rawAlpha._needAlphaBlending;
    } else {
      const fragOut = findBlockByClassName({ blocks, namedInputs, alphaMode, needsAlphaBlending: false, backFaceCulling: true }, "FragmentOutputBlock");
      const aConn = fragOut?.inputs.get("a");
      needsAlphaBlending = alphaMode > 0 && !!aConn?.source;
    }
    return { blocks, namedInputs, alphaMode, needsAlphaBlending, backFaceCulling: rawAlpha.backFaceCulling !== false };
  }
  function stripBabylonPrefix(customType) {
    return customType.startsWith("BABYLON.") ? customType.slice("BABYLON.".length) : customType;
  }
  function findBlockByClassName(graph, className) {
    for (const b of graph.blocks.values()) {
      if (b.className === className) {
        return b;
      }
    }
    return null;
  }
  var init_node_parser = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-parser.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-types.ts
  var WGSL;
  var init_node_types = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-types.ts"() {
      "use strict";
      WGSL = {
        f32: "f32",
        vec2f: "vec2<f32>",
        vec3f: "vec3<f32>",
        vec4f: "vec4<f32>",
        mat4f: "mat4x4<f32>",
        texture2d: "texture_2d<f32>",
        textureCube: "texture_cube<f32>"
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/input-block.ts
  var input_block_exports = {};
  __export(input_block_exports, {
    emitter: () => emitter
  });
  function bjsTypeToNodeType(t) {
    if (t === 1 || t === 2) {
      return "f32";
    }
    if (t === 4) {
      return "vec2f";
    }
    if (t === 8 || t === 32) {
      return "vec3f";
    }
    if (t === 16 || t === 64) {
      return "vec4f";
    }
    if (t === 128) {
      return "mat4f";
    }
    throw new Error(`InputBlock: unsupported BJS connection point type 0x${t.toString(16)}`);
  }
  function wgslLiteral(value, type) {
    if (type === "f32") {
      const f = typeof value === "number" ? value : 0;
      return formatFloat(f);
    }
    if (Array.isArray(value)) {
      const parts = value.map((v) => formatFloat(typeof v === "number" ? v : 0)).join(", ");
      return `${WGSL[type]}(${parts})`;
    }
    if (type === "vec2f") {
      return "vec2<f32>(0.0, 0.0)";
    }
    if (type === "vec3f") {
      return "vec3<f32>(0.0, 0.0, 0.0)";
    }
    if (type === "vec4f") {
      return "vec4<f32>(0.0, 0.0, 0.0, 0.0)";
    }
    return "0.0";
  }
  function formatFloat(n) {
    if (Number.isInteger(n)) {
      return `${n}.0`;
    }
    return `${n}`;
  }
  function emitAttribute(block, stage, state) {
    const attrName = block.name;
    const type = ATTRIBUTE_TYPES[attrName];
    if (!type) {
      throw new Error(`InputBlock: unknown mesh attribute "${attrName}"`);
    }
    const wgslType = WGSL[type];
    if (!state.vertexAttributes.find((a) => a._name === attrName)) {
      state.vertexAttributes.push({
        _name: attrName,
        _type: wgslType,
        _gpuFormat: type === "vec2f" ? "float32x2" : type === "vec3f" ? "float32x3" : "float32x4",
        _arrayStride: (type === "vec2f" ? 2 : type === "vec3f" ? 3 : 4) * 4
      });
    }
    if (stage === "vertex") {
      return { expr: `in.${attrName}`, type };
    }
    const vname = `v_attr_${attrName}`;
    if (!state.varyings.find((v) => v._name === vname)) {
      state.varyings.push({ _name: vname, _type: wgslType });
      state.vertex.body.push(`out.${vname} = in.${attrName};`);
    }
    return { expr: `in.${vname}`, type };
  }
  function emitSystemValue(block, stage, state) {
    const sv = block.serialized["systemValue"];
    switch (sv) {
      case 1:
        return { expr: "meshU.world", type: "mat4f" };
      case 2:
        return { expr: "sceneU.view", type: "mat4f" };
      case 3:
        return { expr: "sceneU.projection", type: "mat4f" };
      case 4:
        return { expr: "sceneU.viewProjection", type: "mat4f" };
      case 5:
        return { expr: "(sceneU.view * meshU.world)", type: "mat4f" };
      case 6:
        return { expr: "(sceneU.viewProjection * meshU.world)", type: "mat4f" };
      case 7:
        return { expr: "sceneU.vEyePosition.xyz", type: "vec3f" };
      case 8:
        return { expr: "sceneU.vFogColor.xyz", type: "vec3f" };
      default:
        throw new Error(`InputBlock: unsupported systemValue ${sv} on block "${block.name}"`);
    }
  }
  function emitUniform(block, state) {
    const portType = block.serialized["type"] ?? 16;
    const type = bjsTypeToNodeType(portType);
    const fieldName = sanitize(block.name || `input${block.id}`);
    if (!state.nodeUboFields.find((f) => f._name === fieldName)) {
      state.nodeUboFields.push({ _name: fieldName, _type: WGSL[type] });
    }
    return { expr: `nodeU.${fieldName}`, type };
  }
  function sanitize(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
  }
  var ATTRIBUTE_TYPES, emitter;
  var init_input_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/input-block.ts"() {
      "use strict";
      init_node_types();
      ATTRIBUTE_TYPES = {
        position: "vec3f",
        normal: "vec3f",
        tangent: "vec4f",
        uv: "vec2f",
        uv2: "vec2f",
        color: "vec4f",
        matricesIndices: "vec4f",
        matricesWeights: "vec4f",
        matricesIndicesExtra: "vec4f",
        matricesWeightsExtra: "vec4f"
      };
      emitter = {
        className: "InputBlock",
        emit(block, _outputName, stage, state, _ctx) {
          const mode = block.serialized["mode"] ?? block.serialized["_mode"];
          if (mode === 1) {
            return emitAttribute(block, stage, state);
          }
          const sv = block.serialized["systemValue"];
          if (typeof sv === "number") {
            return emitSystemValue(block, stage, state);
          }
          return emitUniform(block, state);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/vector-merger.ts
  var vector_merger_exports = {};
  __export(vector_merger_exports, {
    emitter: () => emitter2
  });
  function tryResolve(block, inputName, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    if (!input || !input.source) {
      return null;
    }
    return ctx.resolve(block, inputName, stage, state);
  }
  function tryResolveAny(block, inputNames, stage, state, ctx) {
    for (const inputName of inputNames) {
      const resolved = tryResolve(block, inputName, stage, state, ctx);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }
  var emitter2;
  var init_vector_merger = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/vector-merger.ts"() {
      "use strict";
      emitter2 = {
        className: "VectorMergerBlock",
        emit(block, outputName, stage, state, ctx) {
          const xyzIn = tryResolveAny(block, ["xyzIn", "xyz"], stage, state, ctx);
          const xyIn = tryResolveAny(block, ["xyIn", "xy"], stage, state, ctx);
          const zwIn = tryResolveAny(block, ["zwIn", "zw"], stage, state, ctx);
          const x = tryResolve(block, "x", stage, state, ctx);
          const y = tryResolve(block, "y", stage, state, ctx);
          const z = tryResolve(block, "z", stage, state, ctx);
          const w = tryResolve(block, "w", stage, state, ctx);
          const sx = x ? ctx.cast(x, "f32").expr : xyIn ? `(${xyIn.expr}).x` : xyzIn ? `(${xyzIn.expr}).x` : "0.0";
          const sy = y ? ctx.cast(y, "f32").expr : xyIn ? `(${xyIn.expr}).y` : xyzIn ? `(${xyzIn.expr}).y` : "0.0";
          const sz = z ? ctx.cast(z, "f32").expr : zwIn ? `(${zwIn.expr}).x` : xyzIn ? `(${xyzIn.expr}).z` : "0.0";
          const sw = w ? ctx.cast(w, "f32").expr : zwIn ? `(${zwIn.expr}).y` : "0.0";
          if (outputName === "xy") {
            return { expr: `vec2<f32>(${sx}, ${sy})`, type: "vec2f" };
          }
          if (outputName === "xyz") {
            return { expr: `vec3<f32>(${sx}, ${sy}, ${sz})`, type: "vec3f" };
          }
          return { expr: `vec4<f32>(${sx}, ${sy}, ${sz}, ${sw})`, type: "vec4f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/fragment-output.ts
  var fragment_output_exports = {};
  __export(fragment_output_exports, {
    emitter: () => emitter3
  });
  var emitter3;
  var init_fragment_output = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/fragment-output.ts"() {
      "use strict";
      emitter3 = {
        className: "FragmentOutputBlock",
        stage: "fragment",
        emit(block, _outputName, stage, state, ctx) {
          const rgbaConn = block.inputs.get("rgba");
          let finalVec4;
          if (rgbaConn && rgbaConn.source) {
            const v = ctx.resolve(block, "rgba", stage, state);
            finalVec4 = ctx.cast(v, "vec4f");
          } else {
            const rgbConn = block.inputs.get("rgb");
            const aConn = block.inputs.get("a");
            const rgb = rgbConn && rgbConn.source ? ctx.cast(ctx.resolve(block, "rgb", stage, state), "vec3f") : { expr: "vec3<f32>(0.0, 0.0, 0.0)", type: "vec3f" };
            const a = aConn && aConn.source ? ctx.cast(ctx.resolve(block, "a", stage, state), "f32") : { expr: "1.0", type: "f32" };
            finalVec4 = { expr: `vec4<f32>(${rgb.expr}, ${a.expr})`, type: "vec4f" };
          }
          const t = ctx.temp(state, "frag");
          state.fragment.body.push(`let ${t} = ${finalVec4.expr};`);
          state.fragment.body.push(`_NME_FRAG_OUTPUT_ = ${t};`);
          return { expr: t, type: "vec4f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/_math-factory.ts
  function widerType(a, b) {
    const ra = RANK[a] || 0;
    const rb = RANK[b] || 0;
    const r = Math.max(ra, rb);
    if (!r) {
      throw new Error(`NodeMaterial: cannot pick common numeric type from ${a} and ${b}`);
    }
    return RANK_TYPE[r];
  }
  function binaryEmitter(className, op, leftName = "left", rightName = "right") {
    return {
      className,
      emit(block, _outputName, stage, state, ctx) {
        const l = ctx.resolve(block, leftName, stage, state);
        const r = ctx.resolve(block, rightName, stage, state);
        const t = widerType(l.type, r.type);
        const lc = ctx.cast(l, t).expr;
        const rc = ctx.cast(r, t).expr;
        return { expr: `(${op(lc, rc)})`, type: t };
      }
    };
  }
  function unaryEmitter(className, op, returnType, inputName = "input") {
    return {
      className,
      emit(block, _outputName, stage, state, ctx) {
        const v = ctx.resolve(block, inputName, stage, state);
        return { expr: `(${op(v.expr)})`, type: returnType ?? v.type };
      }
    };
  }
  function formatFloat2(n) {
    if (!Number.isFinite(n)) {
      return "0.0";
    }
    const s = n.toString();
    return s.includes(".") || s.includes("e") ? s : `${s}.0`;
  }
  var RANK, RANK_TYPE;
  var init_math_factory = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/_math-factory.ts"() {
      "use strict";
      RANK = {
        f32: 1,
        vec2f: 2,
        vec3f: 3,
        vec4f: 4,
        mat4f: 0,
        texture2d: 0,
        textureCube: 0
      };
      RANK_TYPE = { 1: "f32", 2: "vec2f", 3: "vec3f", 4: "vec4f" };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/add-block.ts
  var add_block_exports = {};
  __export(add_block_exports, {
    emitter: () => emitter4
  });
  var emitter4;
  var init_add_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/add-block.ts"() {
      "use strict";
      init_math_factory();
      emitter4 = binaryEmitter("AddBlock", (l, r) => `${l} + ${r}`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/subtract-block.ts
  var subtract_block_exports = {};
  __export(subtract_block_exports, {
    emitter: () => emitter5
  });
  var emitter5;
  var init_subtract_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/subtract-block.ts"() {
      "use strict";
      init_math_factory();
      emitter5 = binaryEmitter("SubtractBlock", (l, r) => `${l} - ${r}`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/multiply-block.ts
  var multiply_block_exports = {};
  __export(multiply_block_exports, {
    emitter: () => emitter6
  });
  var emitter6;
  var init_multiply_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/multiply-block.ts"() {
      "use strict";
      init_math_factory();
      emitter6 = binaryEmitter("MultiplyBlock", (l, r) => `${l} * ${r}`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/min-block.ts
  var min_block_exports = {};
  __export(min_block_exports, {
    emitter: () => emitter7
  });
  var emitter7;
  var init_min_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/min-block.ts"() {
      "use strict";
      init_math_factory();
      emitter7 = binaryEmitter("MinBlock", (l, r) => `min(${l}, ${r})`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/max-block.ts
  var max_block_exports = {};
  __export(max_block_exports, {
    emitter: () => emitter8
  });
  var emitter8;
  var init_max_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/max-block.ts"() {
      "use strict";
      init_math_factory();
      emitter8 = binaryEmitter("MaxBlock", (l, r) => `max(${l}, ${r})`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pow-block.ts
  var pow_block_exports = {};
  __export(pow_block_exports, {
    emitter: () => emitter9
  });
  var emitter9;
  var init_pow_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pow-block.ts"() {
      "use strict";
      emitter9 = {
        className: "PowBlock",
        emit(block, _outputName, stage, state, ctx) {
          const v = ctx.resolve(block, "value", stage, state);
          const p = ctx.resolve(block, "power", stage, state);
          const pc = ctx.cast(p, v.type).expr;
          return { expr: `pow(${v.expr}, ${pc})`, type: v.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/step-block.ts
  var step_block_exports = {};
  __export(step_block_exports, {
    emitter: () => emitter10
  });
  var emitter10;
  var init_step_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/step-block.ts"() {
      "use strict";
      emitter10 = {
        className: "StepBlock",
        emit(block, _outputName, stage, state, ctx) {
          const value = ctx.resolve(block, "value", stage, state);
          const edge = ctx.resolve(block, "edge", stage, state);
          const ec = ctx.cast(edge, value.type).expr;
          return { expr: `step(${ec}, ${value.expr})`, type: value.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/dot-block.ts
  var dot_block_exports = {};
  __export(dot_block_exports, {
    emitter: () => emitter11
  });
  var emitter11;
  var init_dot_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/dot-block.ts"() {
      "use strict";
      init_math_factory();
      emitter11 = {
        className: "DotBlock",
        emit(block, _outputName, stage, state, ctx) {
          const l = ctx.resolve(block, "left", stage, state);
          const r = ctx.resolve(block, "right", stage, state);
          const t = widerType(l.type, r.type);
          const lc = ctx.cast(l, t).expr;
          const rc = ctx.cast(r, t).expr;
          return { expr: `dot(${lc}, ${rc})`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/scale-block.ts
  var scale_block_exports = {};
  __export(scale_block_exports, {
    emitter: () => emitter12
  });
  var emitter12;
  var init_scale_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/scale-block.ts"() {
      "use strict";
      emitter12 = {
        className: "ScaleBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = ctx.resolve(block, "input", stage, state);
          const factor = ctx.resolve(block, "factor", stage, state);
          const fc = ctx.cast(factor, "f32").expr;
          return { expr: `(${input.expr} * ${fc})`, type: input.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/oneminus-block.ts
  var oneminus_block_exports = {};
  __export(oneminus_block_exports, {
    emitter: () => emitter13
  });
  var emitter13;
  var init_oneminus_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/oneminus-block.ts"() {
      "use strict";
      init_math_factory();
      emitter13 = unaryEmitter("OneMinusBlock", (v) => `1.0 - ${v}`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/negate-block.ts
  var negate_block_exports = {};
  __export(negate_block_exports, {
    emitter: () => emitter14
  });
  var emitter14;
  var init_negate_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/negate-block.ts"() {
      "use strict";
      init_math_factory();
      emitter14 = unaryEmitter("NegateBlock", (v) => `-${v}`, void 0, "value");
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/normalize-block.ts
  var normalize_block_exports = {};
  __export(normalize_block_exports, {
    emitter: () => emitter15
  });
  var emitter15;
  var init_normalize_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/normalize-block.ts"() {
      "use strict";
      init_math_factory();
      emitter15 = unaryEmitter("NormalizeBlock", (v) => `normalize(${v})`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/lerp-block.ts
  var lerp_block_exports = {};
  __export(lerp_block_exports, {
    emitter: () => emitter16
  });
  var emitter16;
  var init_lerp_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/lerp-block.ts"() {
      "use strict";
      init_math_factory();
      emitter16 = {
        className: "LerpBlock",
        emit(block, _outputName, stage, state, ctx) {
          const left = ctx.resolve(block, "left", stage, state);
          const right = ctx.resolve(block, "right", stage, state);
          const gradient = ctx.resolve(block, "gradient", stage, state);
          const t = widerType(left.type, right.type);
          const lc = ctx.cast(left, t).expr;
          const rc = ctx.cast(right, t).expr;
          const gc = ctx.cast(gradient, t).expr;
          return { expr: `mix(${lc}, ${rc}, ${gc})`, type: t };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/clamp-block.ts
  var clamp_block_exports = {};
  __export(clamp_block_exports, {
    emitter: () => emitter17
  });
  var emitter17;
  var init_clamp_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/clamp-block.ts"() {
      "use strict";
      init_math_factory();
      init_node_types();
      emitter17 = {
        className: "ClampBlock",
        emit(block, _outputName, stage, state, ctx) {
          const value = ctx.resolve(block, "value", stage, state);
          const minRaw = block.serialized.minimum;
          const maxRaw = block.serialized.maximum;
          const minScalar = typeof minRaw === "number" ? formatFloat2(minRaw) : "0.0";
          const maxScalar = typeof maxRaw === "number" ? formatFloat2(maxRaw) : "1.0";
          if (value.type === "f32") {
            return { expr: `clamp(${value.expr}, ${minScalar}, ${maxScalar})`, type: value.type };
          }
          const t = WGSL[value.type];
          return { expr: `clamp(${value.expr}, ${t}(${minScalar}), ${t}(${maxScalar}))`, type: value.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/smoothstep-block.ts
  var smoothstep_block_exports = {};
  __export(smoothstep_block_exports, {
    emitter: () => emitter18
  });
  var emitter18;
  var init_smoothstep_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/smoothstep-block.ts"() {
      "use strict";
      emitter18 = {
        className: "SmoothStepBlock",
        emit(block, _outputName, stage, state, ctx) {
          const value = ctx.resolve(block, "value", stage, state);
          const edge0 = ctx.resolve(block, "edge0", stage, state);
          const edge1 = ctx.resolve(block, "edge1", stage, state);
          const e0 = ctx.cast(edge0, value.type).expr;
          const e1 = ctx.cast(edge1, value.type).expr;
          return { expr: `smoothstep(${e0}, ${e1}, ${value.expr})`, type: value.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/remap-block.ts
  var remap_block_exports = {};
  __export(remap_block_exports, {
    emitter: () => emitter19
  });
  function resolveOrSerialized(block, inputName, serializedKey, fallback2, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    if (input?.source) {
      return ctx.cast(ctx.resolve(block, inputName, stage, state), "f32").expr;
    }
    const raw = block.serialized[serializedKey];
    return formatFloat2(typeof raw === "number" ? raw : fallback2);
  }
  var emitter19;
  var init_remap_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/remap-block.ts"() {
      "use strict";
      init_math_factory();
      emitter19 = {
        className: "RemapBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = ctx.resolve(block, "input", stage, state);
          const sMin = resolveOrSerialized(block, "sourceMin", "sourceRange.x", -1, stage, state, ctx);
          const sMax = resolveOrSerialized(block, "sourceMax", "sourceRange.y", 1, stage, state, ctx);
          const tMin = resolveOrSerialized(block, "targetMin", "targetRange.x", 0, stage, state, ctx);
          const tMax = resolveOrSerialized(block, "targetMax", "targetRange.y", 1, stage, state, ctx);
          return {
            expr: `(${tMin} + (${input.expr} - ${sMin}) * (${tMax} - ${tMin}) / (${sMax} - ${sMin}))`,
            type: input.type
          };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/trigonometry-block.ts
  var trigonometry_block_exports = {};
  __export(trigonometry_block_exports, {
    emitter: () => emitter20
  });
  var OP, emitter20;
  var init_trigonometry_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/trigonometry-block.ts"() {
      "use strict";
      OP = {
        0: "cos",
        1: "sin",
        2: "abs",
        3: "exp",
        4: "exp2",
        5: "round",
        6: "floor",
        7: "ceil",
        8: "sqrt",
        9: "log",
        10: "tan",
        11: "atan",
        12: "acos",
        13: "asin",
        14: "fract",
        15: "sign",
        16: "radians",
        17: "degrees"
      };
      emitter20 = {
        className: "TrigonometryBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = ctx.resolve(block, "input", stage, state);
          const opIdx = block.serialized.operation;
          const fn = typeof opIdx === "number" ? OP[opIdx] : void 0;
          if (!fn) {
            throw new Error(`NodeMaterial: unknown TrigonometryBlock operation ${String(opIdx)}`);
          }
          return { expr: `${fn}(${input.expr})`, type: input.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/vector-splitter.ts
  var vector_splitter_exports = {};
  __export(vector_splitter_exports, {
    emitter: () => emitter21
  });
  var COMPONENT, emitter21;
  var init_vector_splitter = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/vector-splitter.ts"() {
      "use strict";
      COMPONENT = {
        xyzw: { swizzle: "", type: "vec4f" },
        xyz: { swizzle: ".xyz", type: "vec3f" },
        xy: { swizzle: ".xy", type: "vec2f" },
        x: { swizzle: ".x", type: "f32" },
        y: { swizzle: ".y", type: "f32" },
        z: { swizzle: ".z", type: "f32" },
        w: { swizzle: ".w", type: "f32" }
      };
      emitter21 = {
        className: "VectorSplitterBlock",
        emit(block, outputName, stage, state, ctx) {
          let source = null;
          for (const key of ["xyzw", "xyz", "xy"]) {
            if (block.inputs.get(key)?.source) {
              source = ctx.resolve(block, key, stage, state);
              break;
            }
          }
          if (!source) {
            throw new Error(`NodeMaterial: VectorSplitterBlock (id=${block.id}) has no connected input`);
          }
          const c = COMPONENT[outputName];
          if (!c) {
            throw new Error(`NodeMaterial: VectorSplitterBlock has no output "${outputName}"`);
          }
          return { expr: `(${source.expr})${c.swizzle}`, type: c.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/color-splitter.ts
  var color_splitter_exports = {};
  __export(color_splitter_exports, {
    emitter: () => emitter22
  });
  var COMPONENT2, emitter22;
  var init_color_splitter = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/color-splitter.ts"() {
      "use strict";
      COMPONENT2 = {
        rgba: { swizzle: "", type: "vec4f" },
        rgb: { swizzle: ".xyz", type: "vec3f" },
        r: { swizzle: ".x", type: "f32" },
        g: { swizzle: ".y", type: "f32" },
        b: { swizzle: ".z", type: "f32" },
        a: { swizzle: ".w", type: "f32" }
      };
      emitter22 = {
        className: "ColorSplitterBlock",
        emit(block, outputName, stage, state, ctx) {
          let source = null;
          for (const key of ["rgba", "rgb"]) {
            if (block.inputs.get(key)?.source) {
              source = ctx.resolve(block, key, stage, state);
              break;
            }
          }
          if (!source) {
            throw new Error(`NodeMaterial: ColorSplitterBlock (id=${block.id}) has no connected input`);
          }
          const c = COMPONENT2[outputName];
          if (!c) {
            throw new Error(`NodeMaterial: ColorSplitterBlock has no output "${outputName}"`);
          }
          return { expr: `(${source.expr})${c.swizzle}`, type: c.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/transform-block.ts
  var transform_block_exports = {};
  __export(transform_block_exports, {
    emitter: () => emitter23
  });
  var emitter23;
  var init_transform_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/transform-block.ts"() {
      "use strict";
      init_math_factory();
      emitter23 = {
        className: "TransformBlock",
        stage: "vertex",
        emit(block, _outputName, stage, state, ctx) {
          const vector = ctx.resolve(block, "vector", stage, state);
          const transform = ctx.resolve(block, "transform", stage, state);
          const wRaw = block.serialized.complementW;
          const zRaw = block.serialized.complementZ;
          const cw = formatFloat2(typeof wRaw === "number" ? wRaw : 1);
          const cz = formatFloat2(typeof zRaw === "number" ? zRaw : 0);
          let vec4;
          switch (vector.type) {
            case "vec4f":
              vec4 = vector.expr;
              break;
            case "vec3f":
              vec4 = `vec4<f32>(${vector.expr}, ${cw})`;
              break;
            case "vec2f":
              vec4 = `vec4<f32>(${vector.expr}, ${cz}, ${cw})`;
              break;
            default:
              vec4 = `vec4<f32>(${ctx.cast(vector, "vec3f").expr}, ${cw})`;
          }
          return { expr: `(${transform.expr} * ${vec4})`, type: "vec4f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/vertex-output.ts
  var vertex_output_exports = {};
  __export(vertex_output_exports, {
    emitter: () => emitter24
  });
  var emitter24;
  var init_vertex_output = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/vertex-output.ts"() {
      "use strict";
      emitter24 = {
        className: "VertexOutputBlock",
        stage: "vertex",
        emit(block, _outputName, _stage, state, ctx) {
          const vector = ctx.resolve(block, "vector", "vertex", state);
          const pos = ctx.cast(vector, "vec4f").expr;
          state.vertex.body.push(`_NME_VTX_OUTPUT_ = ${pos};`);
          return { expr: pos, type: "vec4f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/texture-block.ts
  var texture_block_exports = {};
  __export(texture_block_exports, {
    emitter: () => emitter25
  });
  function applyColorSpace(expr, outputName, convertToLinear, convertToGamma) {
    if (!convertToLinear && !convertToGamma) {
      return expr;
    }
    const power = convertToLinear ? "2.2" : "0.45454545";
    if (outputName === "rgba") {
      return `vec4<f32>(pow(max(${expr}.xyz, vec3<f32>(0.0)), vec3<f32>(${power})), ${expr}.w)`;
    }
    if (outputName === "rgb") {
      return `pow(max(${expr}.xyz, vec3<f32>(0.0)), vec3<f32>(${power}))`;
    }
    if (outputName === "r" || outputName === "g" || outputName === "b") {
      return `pow(max(${expr}${OUTPUT[outputName].swizzle}, 0.0), ${power})`;
    }
    return expr;
  }
  function sanitize2(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
  }
  var OUTPUT, emitter25;
  var init_texture_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/texture-block.ts"() {
      "use strict";
      OUTPUT = {
        rgba: { swizzle: "", type: "vec4f" },
        rgb: { swizzle: ".xyz", type: "vec3f" },
        r: { swizzle: ".x", type: "f32" },
        g: { swizzle: ".y", type: "f32" },
        b: { swizzle: ".z", type: "f32" },
        a: { swizzle: ".w", type: "f32" }
      };
      emitter25 = {
        className: "TextureBlock",
        emit(block, outputName, stage, state, ctx) {
          let bindingName3;
          const source = block.inputs.get("source");
          if (source?.source) {
            const producer = ctx.graph.blocks.get(source.source.blockId);
            bindingName3 = sanitize2(producer?.name || `tex${block.id}`);
          } else {
            bindingName3 = sanitize2(block.name || `tex${block.id}`);
          }
          if (!state.textures.find((t) => t.name === bindingName3)) {
            state.textures.push({ name: bindingName3, kind: "texture2d", texture: null });
          }
          const uvInput = block.inputs.get("uv");
          let uv;
          if (uvInput?.source) {
            uv = ctx.cast(ctx.resolve(block, "uv", stage, state), "vec2f");
          } else {
            uv = { expr: "vec2<f32>(0.0, 0.0)", type: "vec2f" };
          }
          const memoKey2 = `_tex_${block.id}_sample`;
          const stageState = stage === "vertex" ? state.vertex : state.fragment;
          let sampleExpr = stageState.memo.get(memoKey2);
          if (!sampleExpr) {
            const sampleVar = `_s${ctx.temp(state, "tex")}`;
            stageState.body.push(`let ${sampleVar} = textureSample(nodeTex_${bindingName3}, nodeSamp_${bindingName3}, ${uv.expr});`);
            sampleExpr = { expr: sampleVar, type: "vec4f" };
            stageState.memo.set(memoKey2, sampleExpr);
          }
          if (outputName === "level") {
            return { expr: "0.0", type: "f32" };
          }
          const out = OUTPUT[outputName] ?? OUTPUT.rgba;
          const serialized = block.serialized;
          const expr = applyColorSpace(sampleExpr.expr, outputName, serialized.convertToLinearSpace === true, serialized.convertToGammaSpace === true);
          return { expr: expr === sampleExpr.expr ? `${sampleExpr.expr}${out.swizzle}` : expr, type: out.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/image-source.ts
  var image_source_exports = {};
  __export(image_source_exports, {
    emitter: () => emitter26
  });
  function sanitize3(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
  }
  var emitter26;
  var init_image_source = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/image-source.ts"() {
      "use strict";
      emitter26 = {
        className: "ImageSourceBlock",
        emit(block, _outputName, _stage, state, _ctx) {
          const bindingName3 = sanitize3(block.name || `img${block.id}`);
          if (!state.textures.find((t) => t.name === bindingName3)) {
            state.textures.push({ name: bindingName3, kind: "texture2d", texture: null });
          }
          return { expr: bindingName3, type: "texture2d" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/front-facing.ts
  var front_facing_exports = {};
  __export(front_facing_exports, {
    emitter: () => emitter27
  });
  var emitter27;
  var init_front_facing = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/front-facing.ts"() {
      "use strict";
      emitter27 = {
        className: "FrontFacingBlock",
        stage: "fragment",
        emit(_block, _outputName, _stage, _state, _ctx) {
          return { expr: "select(0.0, 1.0, _NME_FRONT_FACING_)", type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/view-direction.ts
  var view_direction_exports = {};
  __export(view_direction_exports, {
    emitter: () => emitter28
  });
  var emitter28;
  var init_view_direction = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/view-direction.ts"() {
      "use strict";
      emitter28 = {
        className: "ViewDirectionBlock",
        emit(block, _outputName, stage, state, ctx) {
          const wp = ctx.cast(ctx.resolve(block, "worldPosition", stage, state), "vec3f").expr;
          const cp = ctx.cast(ctx.resolve(block, "cameraPosition", stage, state), "vec3f").expr;
          return { expr: `normalize(${cp} - ${wp})`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/_lighting-helper.ts
  var NME_LIGHTING_HELPER_KEY, NME_LIGHTING_HELPER_WGSL;
  var init_lighting_helper = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/_lighting-helper.ts"() {
      "use strict";
      init_types();
      NME_LIGHTING_HELPER_KEY = "nme_lighting";
      NME_LIGHTING_HELPER_WGSL = `struct NmeLightResult {
    diffuse: vec3<f32>,
    specular: vec3<f32>,
    shadow: f32,
};

fn nme_computeLighting(
    worldPos: vec3<f32>,
    worldNormal: vec3<f32>,
    cameraPos: vec3<f32>,
    diffuseColor: vec3<f32>,
    specularColor: vec3<f32>,
    glossiness: f32,
    shadowFactors: array<f32, ${MAX_LIGHTS}>
) -> NmeLightResult {
    var result: NmeLightResult;
    result.diffuse = vec3<f32>(0.0);
    result.specular = vec3<f32>(0.0);
    var aggShadow: f32 = 0.0;
    var numLights: f32 = 0.0;
    let viewDir = normalize(cameraPos - worldPos);
    let N = normalize(worldNormal);
     let lc = min(meshU.lc, ${MAX_LIGHTS}u);
     for (var i: u32 = 0u; i < lc; i = i + 1u) {
        let lightIndex = nli(i);
        let L = nmeLights.lights[lightIndex];
        let t = u32(L.vLightData.w);
        let sh = shadowFactors[lightIndex];
        var lv: vec3<f32>;
        var atten: f32 = 1.0;
        if (t == 3u) {
            // Hemispheric: ground/sky mix via half-lambert.
            let nl = 0.5 + 0.5 * dot(N, normalize(L.vLightData.xyz));
            let diff = mix(L.vLightDirection.xyz, L.vLightDiffuse.rgb, nl);
            result.diffuse = result.diffuse + diff * diffuseColor * sh;
            let H = normalize(viewDir + normalize(L.vLightData.xyz));
            let sf = pow(max(0.0, dot(N, H)), max(1.0, glossiness));
            result.specular = result.specular + sf * L.vLightSpecular.rgb * specularColor * sh;
            aggShadow = aggShadow + sh;
            numLights = numLights + 1.0;
            continue;
        }
        if (t == 1u) {
            // Directional: vLightData.xyz is the light's forward direction.
            lv = normalize(-L.vLightData.xyz);
        } else {
            // Point / Spot: vLightData.xyz is world-space position; range in vLightDiffuse.a.
            let d = L.vLightData.xyz - worldPos;
            atten = max(0.0, 1.0 - length(d) / L.vLightDiffuse.a);
            lv = normalize(d);
            if (t == 2u) {
                // Spot cone falloff (vLightDirection.xyz=dir, .w=cosHalfAngle; vLightSpecular.a=exp).
                let c = max(0.0, dot(L.vLightDirection.xyz, -lv));
                if (c >= L.vLightDirection.w) {
                    atten = atten * max(0.0, pow(c, L.vLightSpecular.a));
                } else {
                    atten = 0.0;
                }
            }
        }
        let NdotL = max(0.0, dot(N, lv));
        result.diffuse = result.diffuse + L.vLightDiffuse.rgb * diffuseColor * NdotL * atten * sh;
        let H = normalize(lv + viewDir);
        let NdotH = max(0.0, dot(N, H));
        let specFactor = pow(NdotH, max(1.0, glossiness));
        result.specular = result.specular + L.vLightSpecular.rgb * specularColor * specFactor * atten * sh;
        aggShadow = aggShadow + sh;
        numLights = numLights + 1.0;
    }
    if (numLights > 0.0) {
        result.shadow = aggShadow / numLights;
    } else {
        result.shadow = 1.0;
    }
    return result;
}
`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/light-block.ts
  var light_block_exports = {};
  __export(light_block_exports, {
    emitter: () => emitter29
  });
  function resolveOptional(block, inputName, fallback2, stage, state, ctx, target) {
    const input = block.inputs.get(inputName);
    if (input?.source) {
      return ctx.cast(ctx.resolve(block, inputName, stage, state), target).expr;
    }
    return fallback2;
  }
  var SHADOW_FACTORS_ONE, emitter29;
  var init_light_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/light-block.ts"() {
      "use strict";
      init_lighting_helper();
      init_types();
      SHADOW_FACTORS_ONE = `array<f32, ${MAX_LIGHTS}>(${new Array(MAX_LIGHTS).fill("1.0").join(", ")})`;
      emitter29 = {
        className: "LightBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          state.fragment.helpers.set(NME_LIGHTING_HELPER_KEY, NME_LIGHTING_HELPER_WGSL);
          state.usesLightsUbo = true;
          const memoKey2 = `_light_${block.id}_call`;
          const callExpr = state.fragment.memo.get(memoKey2);
          let callVar;
          if (!callExpr) {
            const wp = resolveOptional(block, "worldPosition", "vec3<f32>(0.0)", stage, state, ctx, "vec3f");
            const wn = resolveOptional(block, "worldNormal", "vec3<f32>(0.0, 1.0, 0.0)", stage, state, ctx, "vec3f");
            const cp = resolveOptional(block, "cameraPosition", "_NME_CAMERA_POS_", stage, state, ctx, "vec3f");
            const dc = resolveOptional(block, "diffuseColor", "vec3<f32>(1.0)", stage, state, ctx, "vec3f");
            const sc = resolveOptional(block, "specularColor", "vec3<f32>(1.0)", stage, state, ctx, "vec3f");
            const gl = resolveOptional(block, "glossiness", "1.0", stage, state, ctx, "f32");
            const gp = resolveOptional(block, "glossPower", "1024.0", stage, state, ctx, "f32");
            const sf = state.shadowLights.length > 0 ? `nme_computeShadowFactors(in)` : SHADOW_FACTORS_ONE;
            callVar = `_lt${ctx.temp(state, "light")}`;
            state.fragment.body.push(`let ${callVar} = nme_computeLighting(${wp}, ${wn}, ${cp}, ${dc}, ${sc}, (${gl}) * (${gp}), ${sf});`);
            state.fragment.memo.set(memoKey2, { expr: callVar, type: "vec4f" });
          } else {
            callVar = callExpr.expr;
          }
          const out = {
            diffuseOutput: { expr: `${callVar}.diffuse`, type: "vec3f" },
            specularOutput: { expr: `${callVar}.specular`, type: "vec3f" },
            shadow: { expr: `${callVar}.shadow`, type: "f32" }
          };
          return out[outputName] ?? { expr: `${callVar}.diffuse`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/light-information.ts
  var light_information_exports = {};
  __export(light_information_exports, {
    emitter: () => emitter30
  });
  var emitter30;
  var init_light_information = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/light-information.ts"() {
      "use strict";
      emitter30 = {
        className: "LightInformationBlock",
        emit(block, outputName, _stage, state, _ctx) {
          state.usesLightsUbo = true;
          const idxRaw = block.serialized.lightId;
          const idx = typeof idxRaw === "number" ? idxRaw : 0;
          const base = `nmeLights.lights[nli(${idx}u)]`;
          const out = {
            direction: { expr: `${base}.vLightData.xyz`, type: "vec3f" },
            color: { expr: `${base}.vLightDiffuse.rgb`, type: "vec3f" },
            intensity: { expr: `${base}.vLightDiffuse.a`, type: "f32" }
          };
          return out[outputName] ?? out.direction;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/fog-block.ts
  var fog_block_exports = {};
  __export(fog_block_exports, {
    emitter: () => emitter31
  });
  var FOG_HELPER_KEY, FOG_HELPER_WGSL, emitter31;
  var init_fog_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/fog-block.ts"() {
      "use strict";
      FOG_HELPER_KEY = "nme_fog";
      FOG_HELPER_WGSL = `
fn nme_fogFactor(worldPos: vec3<f32>, cameraPos: vec3<f32>, fogParams: vec4<f32>) -> f32 {
    let dist = distance(worldPos, cameraPos);
    let mode = fogParams.x;
    let density = fogParams.y;
    let fstart = fogParams.z;
    let fend = fogParams.w;
    // mode: 1=EXP, 2=EXP2, 3=LINEAR
    if (mode < 1.5) {
        return clamp(exp(-dist * density), 0.0, 1.0);
    }
    if (mode < 2.5) {
        let d = dist * density;
        return clamp(exp(-d * d), 0.0, 1.0);
    }
    return clamp((fend - dist) / (fend - fstart), 0.0, 1.0);
}
`;
      emitter31 = {
        className: "FogBlock",
        stage: "fragment",
        emit(block, _outputName, stage, state, ctx) {
          state.fragment.helpers.set(FOG_HELPER_KEY, FOG_HELPER_WGSL);
          const wp = ctx.cast(ctx.resolve(block, "worldPosition", stage, state), "vec3f").expr;
          const input = ctx.resolve(block, "input", stage, state);
          const fogColor = ctx.cast(ctx.resolve(block, "fogColor", stage, state), "vec3f").expr;
          const inType = input.type === "vec4f" ? "vec4f" : "vec3f";
          const inVec3 = ctx.cast(input, "vec3f").expr;
          const factor = `nme_fogFactor(${wp}, _NME_CAMERA_POS_, _NME_FOG_PARAMS_)`;
          const mixed = `mix(${fogColor}, ${inVec3}, ${factor})`;
          if (inType === "vec4f") {
            return { expr: `vec4<f32>(${mixed}, (${input.expr}).w)`, type: "vec4f" };
          }
          return { expr: mixed, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/perturb-normal.ts
  var perturb_normal_exports = {};
  __export(perturb_normal_exports, {
    emitter: () => emitter32
  });
  var HELPER_KEY, HELPER_WGSL, emitter32;
  var init_perturb_normal = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/perturb-normal.ts"() {
      "use strict";
      HELPER_KEY = "nme_perturbNormal";
      HELPER_WGSL = `
fn nme_perturbNormal(worldPos: vec3<f32>, worldNormal: vec3<f32>, uv: vec2<f32>, sampled: vec3<f32>, strength: f32) -> vec3<f32> {
    // Construct ad-hoc TBN from screen-space derivatives. WebGPU's UV.y goes top-down
    // (BJS GLSL UV is bottom-up), so dpdy and duv2 both end up with opposite sign vs BJS.
    // Negating BOTH dp2 AND duv2 cancels the framebuffer Y-flip without flipping the
    // tangent orientation. This produces the same TBN as BJS does at the same fragment.
    let dp1 = dpdx(worldPos);
    let dp2 = -dpdy(worldPos);
    let duv1 = dpdx(uv);
    let duv2 = -dpdy(uv);
    let dp2perp = cross(dp2, worldNormal);
    let dp1perp = cross(worldNormal, dp1);
    let T = dp2perp * duv1.x + dp1perp * duv2.x;
    let B = dp2perp * duv1.y + dp1perp * duv2.y;
    let invmax = inverseSqrt(max(dot(T, T), dot(B, B)));
    let n = sampled * 2.0 - vec3<f32>(1.0);
    let scaled = vec3<f32>(n.xy * strength, n.z);
    return normalize(T * scaled.x * invmax + B * scaled.y * invmax + worldNormal * scaled.z);
}
`;
      emitter32 = {
        className: "PerturbNormalBlock",
        stage: "fragment",
        emit(block, _outputName, stage, state, ctx) {
          state.fragment.helpers.set(HELPER_KEY, HELPER_WGSL);
          const wp = ctx.cast(ctx.resolve(block, "worldPosition", stage, state), "vec3f").expr;
          const wn = ctx.cast(ctx.resolve(block, "worldNormal", stage, state), "vec3f").expr;
          const uv = ctx.cast(ctx.resolve(block, "uv", stage, state), "vec2f").expr;
          const nm = ctx.cast(ctx.resolve(block, "normalMapColor", stage, state), "vec3f").expr;
          const strInput = block.inputs.get("strength");
          const strength = strInput?.source ? ctx.cast(ctx.resolve(block, "strength", stage, state), "f32").expr : "1.0";
          return { expr: `nme_perturbNormal(${wp}, ${wn}, ${uv}, ${nm}, ${strength})`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/bones-block.ts
  var bones_block_exports = {};
  __export(bones_block_exports, {
    emitter: () => emitter33
  });
  var HELPER_KEY2, HELPER_WGSL2, emitter33;
  var init_bones_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/bones-block.ts"() {
      "use strict";
      HELPER_KEY2 = "nme_skinning";
      HELPER_WGSL2 = `
fn nme_skinningMatrix(indices: vec4<f32>, weights: vec4<f32>) -> mat4x4<f32> {
    let i0 = u32(indices.x);
    let i1 = u32(indices.y);
    let i2 = u32(indices.z);
    let i3 = u32(indices.w);
    return nmeBones[i0] * weights.x
         + nmeBones[i1] * weights.y
         + nmeBones[i2] * weights.z
         + nmeBones[i3] * weights.w;
}
`;
      emitter33 = {
        className: "BonesBlock",
        stage: "vertex",
        emit(block, _outputName, stage, state, ctx) {
          const world = ctx.resolve(block, "world", stage, state);
          if (!state.hasSkeleton) {
            return world;
          }
          state.vertex.helpers.set(HELPER_KEY2, HELPER_WGSL2);
          const indices = ctx.cast(ctx.resolve(block, "matricesIndices", stage, state), "vec4f").expr;
          const weights = ctx.cast(ctx.resolve(block, "matricesWeights", stage, state), "vec4f").expr;
          return { expr: `(${world.expr} * nme_skinningMatrix(${indices}, ${weights}))`, type: "mat4f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/instances-block.ts
  var instances_block_exports = {};
  __export(instances_block_exports, {
    emitter: () => emitter34
  });
  var emitter34;
  var init_instances_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/instances-block.ts"() {
      "use strict";
      emitter34 = {
        className: "InstancesBlock",
        stage: "vertex",
        emit(_block, _outputName, _stage, state, _ctx) {
          if (state.hasInstances) {
          }
          return { expr: "meshU.world", type: "mat4f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/morph-targets.ts
  var morph_targets_exports = {};
  __export(morph_targets_exports, {
    emitter: () => emitter35
  });
  function fallback(kind) {
    const type = kind === "uv" || kind === "uv2" ? "vec2f" : kind === "tangent" ? "vec4f" : "vec3f";
    const zero = type === "vec2f" ? "vec2<f32>(0.0)" : type === "vec4f" ? "vec4<f32>(0.0)" : "vec3<f32>(0.0)";
    return { expr: zero, type };
  }
  var PASSTHROUGH_KINDS, emitter35;
  var init_morph_targets = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/morph-targets.ts"() {
      "use strict";
      PASSTHROUGH_KINDS = /* @__PURE__ */ new Set(["tangent", "uv", "uv2"]);
      emitter35 = {
        className: "MorphTargetsBlock",
        stage: "vertex",
        emit(block, outputName, stage, state, ctx) {
          state.usesMorphTargets = true;
          const kind = outputName.replace(/Output$/, "");
          const input = block.inputs.get(kind);
          if (!input?.source) {
            return fallback(kind);
          }
          const v = ctx.resolve(block, kind, stage, state);
          if (kind === "position") {
            const base = ctx.cast(v, "vec3f").expr;
            return { expr: `nme_morphPosition(${base}, vertexIndex)`, type: "vec3f" };
          }
          if (kind === "normal") {
            const base = ctx.cast(v, "vec3f").expr;
            return { expr: `nme_morphNormal(${base}, vertexIndex)`, type: "vec3f" };
          }
          if (PASSTHROUGH_KINDS.has(kind)) {
            return v;
          }
          return v;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/shadow-map.ts
  var shadow_map_exports = {};
  __export(shadow_map_exports, {
    emitter: () => emitter36
  });
  var emitter36;
  var init_shadow_map = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/shadow-map.ts"() {
      "use strict";
      emitter36 = {
        className: "ShadowMapBlock",
        stage: "fragment",
        emit(block, _outputName, _stage, _state, _ctx) {
          const idxRaw = block.serialized.lightId;
          const idx = typeof idxRaw === "number" ? idxRaw : 0;
          return { expr: `_NME_SHADOW_${idx}_`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/discard-block.ts
  var discard_block_exports = {};
  __export(discard_block_exports, {
    emitter: () => emitter37
  });
  var emitter37;
  var init_discard_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/discard-block.ts"() {
      "use strict";
      emitter37 = {
        className: "DiscardBlock",
        stage: "fragment",
        sideEffect: true,
        emit(block, _outputName, stage, state, ctx) {
          const memoKey2 = `_discard_${block.id}_emit`;
          if (!state.fragment.memo.has(memoKey2)) {
            const valueIn = block.inputs.get("value");
            const cutoffIn = block.inputs.get("cutoff");
            const value = valueIn?.source ? ctx.cast(ctx.resolve(block, "value", stage, state), "f32") : { expr: "0.0", type: "f32" };
            const cutoff = cutoffIn?.source ? ctx.cast(ctx.resolve(block, "cutoff", stage, state), "f32") : { expr: "0.0", type: "f32" };
            state.fragment.body.push(`if (${value.expr} < ${cutoff.expr}) { discard; }`);
            state.fragment.memo.set(memoKey2, { expr: "0.0", type: "f32" });
          }
          return { expr: "0.0", type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reflection-texture-block.ts
  var reflection_texture_block_exports = {};
  __export(reflection_texture_block_exports, {
    emitter: () => emitter38
  });
  function sanitize4(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
  }
  var EQUIRECTANGULAR_MODE, RECIPROCAL_PI2, RECIPROCAL_PI, OUTPUTS, emitter38;
  var init_reflection_texture_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reflection-texture-block.ts"() {
      "use strict";
      EQUIRECTANGULAR_MODE = 7;
      RECIPROCAL_PI2 = "0.15915494309189535";
      RECIPROCAL_PI = "0.3183098861837907";
      OUTPUTS = {
        rgb: { swizzle: "", type: "vec3f" },
        r: { swizzle: ".x", type: "f32" },
        g: { swizzle: ".y", type: "f32" },
        b: { swizzle: ".z", type: "f32" }
      };
      emitter38 = {
        className: "ReflectionTextureBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          const mode = block.serialized["coordinatesMode"] ?? EQUIRECTANGULAR_MODE;
          if (mode !== EQUIRECTANGULAR_MODE) {
            throw new Error(`ReflectionTextureBlock: coordinatesMode ${mode} not supported (only EQUIRECTANGULAR_MODE=7)`);
          }
          const bindingName3 = sanitize4(block.name || `reflection${block.id}`);
          if (!state.textures.find((t) => t.name === bindingName3)) {
            state.textures.push({ name: bindingName3, kind: "texture2d", texture: null });
          }
          const memoKey2 = `_refl_${block.id}_rgb`;
          let sample = state.fragment.memo.get(memoKey2);
          if (!sample) {
            const wp = block.inputs.get("worldPosition")?.source ? ctx.cast(ctx.resolve(block, "worldPosition", stage, state), "vec3f").expr : `vec3<f32>(0.0)`;
            const wn = block.inputs.get("worldNormal")?.source ? ctx.cast(ctx.resolve(block, "worldNormal", stage, state), "vec3f").expr : `vec3<f32>(0.0, 1.0, 0.0)`;
            const cp = block.inputs.get("cameraPosition")?.source ? ctx.cast(ctx.resolve(block, "cameraPosition", stage, state), "vec3f").expr : `_NME_CAMERA_POS_`;
            const t = ctx.temp(state, "refl");
            const body = [
              `let _v${t} = normalize(${cp} - ${wp});`,
              `let _r${t} = reflect(-_v${t}, normalize(${wn}));`,
              // BJS flips the V coordinate after computing equirectangular UVs.
              `let _uv${t} = vec2<f32>(atan2(_r${t}.z, _r${t}.x) * ${RECIPROCAL_PI2} + 0.5, 1.0 - acos(clamp(_r${t}.y, -1.0, 1.0)) * ${RECIPROCAL_PI});`,
              `let _s${t} = textureSample(nodeTex_${bindingName3}, nodeSamp_${bindingName3}, _uv${t});`
            ];
            state.fragment.body.push(body.join("\n"));
            sample = { expr: `_s${t}.xyz`, type: "vec3f" };
            state.fragment.memo.set(memoKey2, sample);
          }
          if (outputName === "a") {
            return { expr: "1.0", type: "f32" };
          }
          if (outputName === "reflectionCoords") {
            return { expr: sample.expr, type: "vec3f" };
          }
          const out = OUTPUTS[outputName] ?? OUTPUTS.rgb;
          if (out.swizzle === "") {
            return sample;
          }
          return { expr: `${sample.expr}${out.swizzle}`, type: out.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pbr-metallic-roughness-block.ts
  var pbr_metallic_roughness_block_exports = {};
  __export(pbr_metallic_roughness_block_exports, {
    emitter: () => emitter39
  });
  function resolveOptional2(block, inputName, fallback2, target, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    if (input?.source) {
      return ctx.cast(ctx.resolve(block, inputName, stage, state), target).expr;
    }
    return fallback2;
  }
  var HELPER_KEY_PREFIX, SHADOW_FACTORS_ONE2, emitter39;
  var init_pbr_metallic_roughness_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pbr-metallic-roughness-block.ts"() {
      "use strict";
      init_types();
      HELPER_KEY_PREFIX = "nme_pbr_mr";
      SHADOW_FACTORS_ONE2 = `array<f32, ${MAX_LIGHTS}>(${new Array(MAX_LIGHTS).fill("1.0").join(", ")})`;
      emitter39 = {
        className: "PBRMetallicRoughnessBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          if (block.serialized.enableSpecularAntiAliasing === true || block.inputs.get("clearcoat")?.source || block.inputs.get("sheen")?.source || block.inputs.get("subsurface")?.source || block.inputs.get("anisotropy")?.source || block.inputs.get("iridescence")?.source) {
            throw new Error("NodeMaterial: PBR-MR core emitter cannot emit optional PBR feature code");
          }
          const reflectionConnected = !!block.inputs.get("reflection")?.source;
          if (reflectionConnected) {
            state.usesEnv = true;
            ctx.resolve(block, "reflection", stage, state);
          }
          const helperKey = `${HELPER_KEY_PREFIX}_${reflectionConnected ? "env" : "noenv"}_nocc_ccF0_nosh_norefr_noss_noani_noShAS___noaa`;
          if (!state.pbrMrHelperRequests.some((request) => request.key === helperKey)) {
            state.pbrMrHelperRequests.push({
              key: helperKey,
              useEnv: reflectionConnected,
              useClearcoat: false,
              useSheen: false,
              useRefraction: false,
              useSubsurface: false,
              useAnisotropy: false,
              useIridescence: false,
              useShAlbedoScaling: false,
              useCcBump: false,
              useCcTint: false,
              useSpecularAA: false,
              remapClearcoatF0: false
            });
          }
          state.usesLightsUbo = true;
          const memoKey2 = `_pbrmr_${block.id}_call`;
          let callVar;
          const existing = state.fragment.memo.get(memoKey2);
          if (existing) {
            callVar = existing.expr;
          } else {
            const wp = resolveOptional2(block, "worldPosition", "v3(0.0)", "vec3f", stage, state, ctx);
            const gn = resolveOptional2(block, "worldNormal", "v3(0.0, 1.0, 0.0)", "vec3f", stage, state, ctx);
            const perturbed = block.inputs.get("perturbedNormal");
            const wn = perturbed?.source ? ctx.cast(ctx.resolve(block, "perturbedNormal", stage, state), "vec3f").expr : gn;
            const cp = resolveOptional2(block, "cameraPosition", "_NME_CAMERA_POS_", "vec3f", stage, state, ctx);
            const bc = resolveOptional2(block, "baseColor", "v3(1.0)", "vec3f", stage, state, ctx);
            const me = resolveOptional2(block, "metallic", "0.0", "f32", stage, state, ctx);
            const ro = resolveOptional2(block, "roughness", "0.5", "f32", stage, state, ctx);
            const ao = resolveOptional2(block, "ambientOcc", "1.0", "f32", stage, state, ctx);
            const baseIorExpr = resolveOptional2(block, "indexOfRefraction", "1.5", "f32", stage, state, ctx);
            const sf = state.shadowLights.length > 0 ? `nme_computeShadowFactors(in)` : SHADOW_FACTORS_ONE2;
            callVar = `_pbrR${ctx.temp(state, "pbr")}`;
            state.fragment.body.push(
              `let ${callVar} = nme_pbr_mr_compute(${wp}, ${gn}, ${wn}, ${cp}, ${bc}, ${me}, ${ro}, ${ao}, 0.0, 0.0, 1.5, v3(0.5, 0.5, 1.0), v2(0.0), v3(1.0), 1.0, 0.0, 0.0, v3(1.0), 0.0, ${baseIorExpr}, 0.0, 1.5, 1.0, v3(1.0), 0.0, 0.0, v3(1.0), 0.0, v2(1.0, 0.0), v2(0.0), ${sf});`
            );
            state.fragment.memo.set(memoKey2, { expr: callVar, type: "vec4f" });
          }
          switch (outputName) {
            case "lighting":
              return { expr: `${callVar}.lighting`, type: "vec3f" };
            case "diffuseDir":
              return { expr: `${callVar}.diffuseDir`, type: "vec3f" };
            case "specularDir":
              return { expr: `${callVar}.specularDir`, type: "vec3f" };
            case "diffuseInd":
              return { expr: `${callVar}.diffuseInd`, type: "vec3f" };
            case "specularInd":
              return { expr: `${callVar}.specularInd`, type: "vec3f" };
            case "shadow":
              return { expr: `${callVar}.shadow`, type: "f32" };
            case "alpha": {
              const cfg = block.serialized;
              const useOverAlpha = cfg.useSpecularOverAlpha === true || cfg.useRadianceOverAlpha === true;
              const op = block.inputs.get("opacity");
              const baseAlpha = op?.source ? ctx.cast(ctx.resolve(block, "opacity", stage, state), "f32").expr : "1.0";
              if (useOverAlpha) {
                return { expr: `clamp(${baseAlpha} + ${callVar}.lumOverAlpha * ${callVar}.lumOverAlpha, 0.0, 1.0)`, type: "f32" };
              }
              return { expr: baseAlpha, type: "f32" };
            }
            case "ambientClr":
            case "clearcoatDir":
            case "clearcoatInd":
            case "sheenDir":
            case "sheenInd":
            case "refraction":
              return { expr: `v3(0.0)`, type: "vec3f" };
            default:
              return { expr: `${callVar}.lighting`, type: "vec3f" };
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pbr-mr-helper-full.ts
  function ccDirectBlock(useClearcoat, useCcTint) {
    if (!useClearcoat) {
      return "";
    }
    const Ncc = "ccNormalW";
    const NdotLcc = "ccNdotL";
    const declCcNdotL = `let ccNdotL = clamp(dot(ccNormalW, L), 0.0000001, 1.0);`;
    return `
${declCcNdotL}
if (${NdotLcc} > 0.0 && atten > 0.0) {
let ccH = normalize(V + L);
let ccNdotH = clamp(dot(${Ncc}, ccH), 0.0000001, 1.0);
let ccVdotH = saturate(dot(V, ccH));
let ccD = nme_pbr_distGGX(ccNdotH, ccAlphaG);
let ccVis = 0.25 / (ccVdotH * ccVdotH + 0.0000001);
let ccF_d = nme_pbr_ccSchlick(ccF0, ccVdotH);
let ccTerm = ccF_d * ccD * ccVis * ${NdotLcc};
ccDirectSpecAcc = ccDirectSpecAcc + v3(ccTerm) * color * atten * ccIntensity * sh;
baseLayerAtten = 1.0 - ccF_d * ccIntensity;
${useCcTint ? `let ccLRefract = -refract(L, ${Ncc}, ccIorInv);
let ccNdotLRefract = clamp(dot(${Ncc}, ccLRefract), 0.0000001, 1.0);
let ccDirectAbsorption = nme_pbr_cocaLambert(ccAbsorptionColor, ccTintThickness * ((ccNdotLRefract + ccNdotVRefract) / (ccNdotLRefract * ccNdotVRefract)));
baseLayerAbsorption = mix(v3(1.0), ccDirectAbsorption, v3(ccIntensity));` : ``}
}`;
  }
  function ccHemiBlock(useClearcoat, useCcTint) {
    if (!useClearcoat) {
      return "";
    }
    const Ncc = "ccNormalW";
    return `
let ccNdotL_h = clamp(dot(${Ncc}, Ldir), 0.0000001, 1.0);
if (nl > 0.0) {
let ccH_h = normalize(V + Ldir);
let ccNdotH_h = clamp(dot(${Ncc}, ccH_h), 0.0000001, 1.0);
let ccVdotH_h = saturate(dot(V, ccH_h));
let ccD_h = nme_pbr_distGGX(ccNdotH_h, ccAlphaG);
let ccVis_h = 0.25 / (ccVdotH_h * ccVdotH_h + 0.0000001);
let ccF_h = nme_pbr_ccSchlick(ccF0, ccVdotH_h);
let ccTerm_h = ccF_h * ccD_h * ccVis_h * ccNdotL_h;
ccDirectSpecAcc = ccDirectSpecAcc + v3(ccTerm_h) * entry.vLightDiffuse.rgb * ccIntensity * sh;
baseLayerAtten = 1.0 - ccF_h * ccIntensity;
${useCcTint ? `let ccLRefract_h = -refract(Ldir, ${Ncc}, ccIorInv);
let ccNdotLRefract_h = clamp(dot(${Ncc}, ccLRefract_h), 0.0000001, 1.0);
let ccDirectAbsorption_h = nme_pbr_cocaLambert(ccAbsorptionColor, ccTintThickness * ((ccNdotLRefract_h + ccNdotVRefract) / (ccNdotLRefract_h * ccNdotVRefract)));
baseLayerAbsorption = mix(v3(1.0), ccDirectAbsorption_h, v3(ccIntensity));` : ``}
}`;
  }
  function shDirectBlock(useSheen) {
    if (!useSheen) {
      return "";
    }
    return `
if (NdotL > 0.0 && atten > 0.0) {
let shH = normalize(V + L);
let shNdotH = clamp(dot(N, shH), 0.0000001, 1.0);
let shD = nme_pbr_charlieD(shNdotH, shAlphaG);
let shV = 1.0 / (4.0 * (NdotL + NdotV - NdotL * NdotV) + 0.0000001);
shDirectAcc = shDirectAcc + shColorScaled * shD * shV * NdotL * color * atten * sh * baseLayerAtten;
}`;
  }
  function shHemiBlock(useSheen) {
    if (!useSheen) {
      return "";
    }
    return `
if (nl > 0.0) {
let shH_h = normalize(V + Ldir);
let shNdotH_h = clamp(dot(N, shH_h), 0.0000001, 1.0);
let shD_h = nme_pbr_charlieD(shNdotH_h, shAlphaG);
let shV_h = 1.0 / (4.0 * (nl + NdotV - nl * NdotV) + 0.0000001);
shDirectAcc = shDirectAcc + shColorScaled * shD_h * shV_h * nl * entry.vLightSpecular.rgb * sh * baseLayerAtten;
}`;
  }
  function ssBlock(useSubsurface, useRefraction, useAnisotropy) {
    if (!useSubsurface && !useRefraction) {
      return `let finalRefraction = v3(0.0);
let refractionOpacity = 1.0;
let ssRefractionIrradiance = v3(0.0);`;
    }
    const refrPart = useRefraction ? `// Refraction: refract V through N at IOR, sample env at refraction LOD.
    let refrIntensity = clamp(refrIntensityIn, 0.0, 1.0);
    let invIor = 1.0 / max(refrIor, 1.0001);
    let refrV_raw = refract(-V, ${useAnisotropy ? "aniN" : "N"}, invIor);
    let refrV = v3(refrV_raw.x * cosA + refrV_raw.z * sinA, refrV_raw.y, -refrV_raw.x * sinA + refrV_raw.z * cosA);
    let refrAlphaG = mix(alphaG, 0.0, clamp(invIor * 3.0 - 2.0, 0.0, 1.0));
    let refrLod = log2(cubemapDim * refrAlphaG) * sceneU.vImageInfos.z;
    let envRefr = textureSampleLevel(nmeIblTexture, nmeIblSampler, refrV, clamp(refrLod, 0.0, maxLod)).rgb;
    let volumeAlbedo = nme_pbr_colorAtDistance(ssTintColor, refrTintAtDistance);
    let refrTransmittance = v3(refrIntensity) * nme_pbr_cocaLambert(volumeAlbedo, ssThickness);
    let finalRefractionRaw = envRefr * refrTransmittance * (v3(1.0) - refractionSpecEnvReflectance);
    let refractionOpacity = 1.0 - refrIntensity;` : `let finalRefractionRaw = v3(0.0);
let refractionOpacity = 1.0;`;
    const ssPart = useSubsurface ? `// Translucency: back-scattered SH irradiance with Burley transmittance.
    let nN_raw = -N;
    let nN_env = v3(nN_raw.x * cosA + nN_raw.z * sinA, nN_raw.y, -nN_raw.x * sinA + nN_raw.z * cosA);
    let backIrradiance = (sceneU.vSphericalL00.xyz
        + sceneU.vSphericalL1_1.xyz * nN_env.y + sceneU.vSphericalL10.xyz * nN_env.z + sceneU.vSphericalL11.xyz * nN_env.x
        + sceneU.vSphericalL2_2.xyz * (nN_env.y * nN_env.x) + sceneU.vSphericalL2_1.xyz * (nN_env.y * nN_env.z)
        + sceneU.vSphericalL20.xyz * (3.0 * nN_env.z * nN_env.z - 1.0) + sceneU.vSphericalL21.xyz * (nN_env.z * nN_env.x)
        + sceneU.vSphericalL22.xyz * (nN_env.x * nN_env.x - nN_env.y * nN_env.y));
    let ssRefractionIrradiance = backIrradiance * ssTransmittance;
    finalIrradiance = finalIrradiance * refractionOpacity;
    finalIrradiance = finalIrradiance * (1.0 - translucencyIntensity);` : `let ssRefractionIrradiance = v3(0.0);
finalIrradiance = finalIrradiance * refractionOpacity;`;
    return `${refrPart}
${ssPart}
let finalRefraction = finalRefractionRaw;`;
  }
  function buildPbrMrHelperFull(request) {
    return HELPER_WGSL3(
      request.useEnv,
      request.useClearcoat,
      request.useSheen,
      request.useRefraction,
      request.useSubsurface,
      request.useAnisotropy,
      request.useIridescence,
      request.useShAlbedoScaling,
      request.useCcBump,
      request.useCcTint,
      request.useSpecularAA,
      request.remapClearcoatF0
    );
  }
  function HELPER_WGSL3(useEnv, useClearcoat, useSheen, useRefraction, useSubsurface, useAnisotropy, useIridescence, useShAlbedoScaling, useCcBump, useCcTint, useSpecularAA, remapClearcoatF0) {
    const ccDecls = useClearcoat ? `let ccIntensity = clamp(ccIntensityIn, 0.0, 1.0);
let ccRough = clamp(ccRoughnessIn, 0.0, 1.0);
let ccF0_raw = (ccIor - 1.0) / (ccIor + 1.0);
let ccF0 = ccF0_raw * ccF0_raw;
var ccDirectSpecAcc = v3(0.0);` : `let ccDirectSpecAcc = v3(0.0);`;
    const ccAlphaSetup = useClearcoat ? `var ccAA_factor_y = 0.0;
${useSpecularAA ? `{ let ccNdfdx_AA = dpdx(ccNormalW);
let ccNdfdy_AA = dpdy(ccNormalW);
let ccSlopeSquare_AA = max(dot(ccNdfdx_AA, ccNdfdx_AA), dot(ccNdfdy_AA, ccNdfdy_AA));
ccAA_factor_y = sqrt(ccSlopeSquare_AA) * 0.75; }` : ``}
let ccAlphaG = ccRough * ccRough + 0.0005 + ccAA_factor_y;` : ``;
    const ccNormalSetup = useClearcoat ? useCcBump ? `let ccNormalW = nme_perturbNormal(worldPos, Ng, ccBumpUv, ccBumpColor, 1.0);
let ccNdotV = abs(dot(ccNormalW, V)) + 0.0000001;${useCcTint ? `
let ccIorInv = 1.0 / max(ccIor, 1.0001);
let ccAbsorptionColor = nme_pbr_colorAtDistance(max(ccTintColor, v3(0.0000001)), max(ccTintAtDistance, 0.0000001));
let ccVRefract = refract(-V, ccNormalW, ccIorInv);
let ccNdotVRefract = abs(dot(ccNormalW, ccVRefract)) + 0.0000001;` : ``}` : `let ccNormalW = Ng;
let ccNdotV = abs(dot(ccNormalW, V)) + 0.0000001;${useCcTint ? `
let ccIorInv = 1.0 / max(ccIor, 1.0001);
let ccAbsorptionColor = nme_pbr_colorAtDistance(max(ccTintColor, v3(0.0000001)), max(ccTintAtDistance, 0.0000001));
let ccVRefract = refract(-V, ccNormalW, ccIorInv);
let ccNdotVRefract = abs(dot(ccNormalW, ccVRefract)) + 0.0000001;` : ``}` : `let ccNormalW = N;
let ccNdotV: f32 = 0.0;`;
    const shDecls = useSheen ? `let shIntensityRaw = clamp(shIntensityIn, 0.0, 1.0);
${useShAlbedoScaling ? `let shIntensity = shIntensityRaw;` : `let reflectanceF0 = max(colorF0.r, max(colorF0.g, colorF0.b));
let shIntensity = shIntensityRaw * (1.0 - reflectanceF0);`}
let shRough = clamp(shRoughnessIn, 0.0, 1.0);
let shAlphaG = shRough * shRough + 0.0005;
let shColorScaled = shColorIn * shIntensity;
var shDirectAcc = v3(0.0);` : `let shDirectAcc = v3(0.0);`;
    const shIblTerm = useEnv && useSheen ? `let shSpecLod = log2(cubemapDim * shAlphaG) * sceneU.vImageInfos.z;
    let shEnvRadiance = textureSampleLevel(nmeIblTexture, nmeIblSampler, R, clamp(shSpecLod, 0.0, maxLod)).rgb;
    let shBrdfBlue = textureSample(nmeBrdfLUT, nmeBrdfSampler, v2(NdotV, shRough)).b;
    let shFinalIbl = shEnvRadiance * shColorScaled * shBrdfBlue * seo * eho;
    ${useShAlbedoScaling ? `// SHEEN_ALBEDOSCALING: surface albedo and base specular scale by (1 - shInt \xD7 max(shColor) \xD7 envSheenBrdf.b).
    let shAlbedoScaling = 1.0 - shIntensity * max(max(shColorIn.r, shColorIn.g), shColorIn.b) * shBrdfBlue;` : `let shAlbedoScaling: f32 = 1.0;`}` : `let shFinalIbl = v3(0.0);
let shAlbedoScaling: f32 = 1.0;`;
    const directSpecR0Decl = useClearcoat && remapClearcoatF0 ? `let _directF0S = sqrt(max(colorF0, v3(0.0)));
let _directF0T = ((1.0 - ccIor) + (1.0 + ccIor) * _directF0S) / ((1.0 + ccIor) + (1.0 - ccIor) * _directF0S);
let directSpecR0 = mix(colorF0, clamp(_directF0T * _directF0T, v3(0.0), v3(1.0)), ccIntensity);` : `let directSpecR0 = colorF0;`;
    const shIblScale = useClearcoat ? ` * ccConsIBL${useCcTint ? " * ccAbsorption" : ""}` : "";
    const refrCcScale = useClearcoat ? " * ccConsIBL" : "";
    const ccIblPre = useClearcoat ? `let ccFresnelIBL = nme_pbr_ccSchlick(ccF0, ccNdotV);
    let ccConsIBL = 1.0 - ccFresnelIBL * ccIntensity;
    let ccBrdfSample = textureSample(nmeBrdfLUT, nmeBrdfSampler, v2(ccNdotV, ccRough)).rgb;
    let ccSpecEnvReflRaw = (v3(ccF0) * ccBrdfSample.y + (v3(1.0) - v3(ccF0)) * ccBrdfSample.x) * ccIntensity;
    let ccEnergyConservation = 1.0 + _coloredR0 * (1.0 / max(ccBrdfSample.y, 0.001) - 1.0);
    let ccEhoT = clamp(1.0 + 1.1 * dot(reflect(-V, ccNormalW), Ng), 0.0, 1.0);
    let ccSpecEnvRefl = ccSpecEnvReflRaw * (ccEhoT * ccEhoT);
    let ccSpecLod = log2(cubemapDim * ccAlphaG) * sceneU.vImageInfos.z;
    let ccR_raw = reflect(-V, ccNormalW);
    let ccR = v3(ccR_raw.x * cosA + ccR_raw.z * sinA, ccR_raw.y, -ccR_raw.x * sinA + ccR_raw.z * cosA);
    let ccEnvRadiance = textureSampleLevel(nmeIblTexture, nmeIblSampler, ccR, clamp(ccSpecLod, 0.0, maxLod)).rgb;
    ${useCcTint ? `// Clearcoat absorption: BJS Beer-Lambert path length through the coat.
    let ccAbsorption = mix(v3(1.0), nme_pbr_cocaLambert(ccAbsorptionColor, ccTintThickness * ((ccNdotVRefract + ccNdotVRefract) / (ccNdotVRefract * ccNdotVRefract))), v3(ccIntensity));` : `let ccAbsorption = v3(1.0);`}
    let ccFinalRadiance = ccEnvRadiance * ccSpecEnvRefl;` : ``;
    const ccTintScale = useCcTint ? " * ccAbsorption" : "";
    const ccIblFinal = useClearcoat ? `${ccIblPre}
${shIblTerm}
r.lighting = finalIrradiance * shAlbedoScaling * ccConsIBL${ccTintScale}
+ finalRadianceScaled * shAlbedoScaling * ccConsIBL${ccTintScale}
+ ssRefractionIrradiance * ao_c
+ finalSpecularScaledDirect * shAlbedoScaling
+ diffuseAcc * shAlbedoScaling
+ diffuseTransmissionAcc
+ ccDirectSpecAcc * ccEnergyConservation
+ ccFinalRadiance
+ shDirectAcc
+ shFinalIbl${shIblScale}
+ finalRefraction${refrCcScale}${ccTintScale};` : `${shIblTerm}
r.lighting = finalIrradiance * shAlbedoScaling + ssRefractionIrradiance * ao_c + (finalRadianceScaled + finalSpecularScaledDirect + diffuseAcc) * shAlbedoScaling + diffuseTransmissionAcc + shDirectAcc + shFinalIbl + finalRefraction;`;
    const ccDirectFinal = useClearcoat ? `r.lighting = diffuseAcc + specAcc + diffuseTransmissionAcc + ccDirectSpecAcc + shDirectAcc;` : `r.lighting = diffuseAcc + diffuseTransmissionAcc + specAcc + shDirectAcc;`;
    const refractionSpecEnvReflectanceDecl = useRefraction ? `let refractionSpecEnvReflectance = baseSpecEnvReflectance;` : ``;
    const iblBlock = useEnv ? `
    let envRot = sceneU.envRotationY;
    let cosA = cos(envRot); let sinA = sin(envRot);
    let N_specSrc = ${useAnisotropy ? "aniN" : "N"};
    let R_raw = reflect(-V, N_specSrc);
    let R = v3(R_raw.x * cosA + R_raw.z * sinA, R_raw.y, -R_raw.x * sinA + R_raw.z * cosA);
    let N_env = v3(Ng.x * cosA + Ng.z * sinA, Ng.y, -Ng.x * sinA + Ng.z * cosA);
    let environmentIrradiance = (sceneU.vSphericalL00.xyz
        + sceneU.vSphericalL1_1.xyz * N_env.y + sceneU.vSphericalL10.xyz * N_env.z + sceneU.vSphericalL11.xyz * N_env.x
        + sceneU.vSphericalL2_2.xyz * (N_env.y * N_env.x) + sceneU.vSphericalL2_1.xyz * (N_env.y * N_env.z)
        + sceneU.vSphericalL20.xyz * (3.0 * N_env.z * N_env.z - 1.0) + sceneU.vSphericalL21.xyz * (N_env.z * N_env.x)
        + sceneU.vSphericalL22.xyz * (N_env.x * N_env.x - N_env.y * N_env.y));
    let brdfSample = textureSample(nmeBrdfLUT, nmeBrdfSampler, v2(NdotV, rough_c));
    let envBrdf = brdfSample.rgb;
    let reflectanceF0Scalar = max(colorF0.r, max(colorF0.g, colorF0.b));
    let baseSpecEnvReflectance = (colorF90 - v3(reflectanceF0Scalar)) * envBrdf.x + v3(reflectanceF0Scalar) * envBrdf.y;
    let seo = clamp((NdotVUnclamped + ao_c) * (NdotVUnclamped + ao_c) - 1.0 + ao_c, 0.0, 1.0);
    let _geoNF = select(-Ng, Ng, dot(Ng, V) > 0.0);
    let _ehoRefl = reflect(-V, N);
    let _ehoT = clamp(1.0 + 1.1 * dot(_ehoRefl, _geoNF), 0.0, 1.0);
    let eho = _ehoT * _ehoT;
    ${useClearcoat && remapClearcoatF0 ? `let _f0S = sqrt(max(colorF0, v3(0.0)));
    let _f0T = ((1.0 - ccIor) + (1.0 + ccIor) * _f0S) / ((1.0 + ccIor) + (1.0 - ccIor) * _f0S);
    let _coloredR0 = mix(colorF0, clamp(_f0T * _f0T, v3(0.0), v3(1.0)), ccIntensity);` : `let _coloredR0 = colorF0;`}
    let colorSpecEnvReflectance = ((colorF90 - _coloredR0) * envBrdf.x + _coloredR0 * envBrdf.y) * seo * eho;
    let energyConservation = 1.0 + _coloredR0 * (1.0 / max(envBrdf.y, 0.001) - 1.0);
    let maxLod = f32(textureNumLevels(nmeIblTexture) - 1);
    let cubemapDim = f32(textureDimensions(nmeIblTexture).x);
    let specLod = log2(cubemapDim * alphaG) * sceneU.vImageInfos.z;
    var environmentRadiance = textureSampleLevel(nmeIblTexture, nmeIblSampler, R, clamp(specLod, 0.0, maxLod)).rgb;
    ${refractionSpecEnvReflectanceDecl}
    var finalIrradiance = environmentIrradiance * surfaceAlbedo;
    let finalRadianceScaled = environmentRadiance * colorSpecEnvReflectance * energyConservation;
    let finalSpecularScaledDirect = specAcc * energyConservation;
    ${ssBlock(useSubsurface, useRefraction, useAnisotropy)}
    finalIrradiance = finalIrradiance * ao_c;
    r.diffuseInd = finalIrradiance;
    r.specularInd = finalRadianceScaled;
    ${ccIblFinal}` : `
r.diffuseInd = v3(0.0);
r.specularInd = v3(0.0);
${ccDirectFinal}`;
    const ccSchlickFn = useClearcoat ? `fn nme_pbr_ccSchlick(f0: f32, cosTheta: f32) -> f32 {
let t = 1.0 - cosTheta;
let t2 = t * t;
return f0 + (1.0 - f0) * (t2 * t2 * t);
}
` : ``;
    const charlieFn = useSheen ? `fn nme_pbr_charlieD(NdotH: f32, alphaG: f32) -> f32 {
let invR = 1.0 / max(alphaG, 0.0005);
let cos2h = NdotH * NdotH;
let sin2h = 1.0 - cos2h;
return (2.0 + invR) * pow(sin2h, invR * 0.5) / (2.0 * NME_PBR_PI);
}
` : ``;
    const anisoFns = useAnisotropy ? `fn nme_pbr_anisoRoughness(alphaG: f32, anisotropy: f32) -> v2 {
let alphaT = max(alphaG * (1.0 + anisotropy), 0.0005);
let alphaB = max(alphaG * (1.0 - anisotropy), 0.0005);
return v2(alphaT, alphaB);
}
fn nme_pbr_anisoBentNormal(T: v3, B: v3, N: v3, V: v3, anisotropy: f32) -> v3 {
var anisotropicFrameDirection = B;
if (anisotropy < 0.0) {
anisotropicFrameDirection = T;
}
let anisoTan = cross(normalize(anisotropicFrameDirection), V);
let anisoNormal = cross(anisoTan, anisotropicFrameDirection);
return normalize(mix(N, anisoNormal, abs(anisotropy)));
}
fn nme_pbr_burleyAnisoD(NdotH: f32, TdotH: f32, BdotH: f32, alphaTB: v2) -> f32 {
let a2 = alphaTB.x * alphaTB.y;
let v = v3(alphaTB.y * TdotH, alphaTB.x * BdotH, a2 * NdotH);
let v2 = dot(v, v);
let w2 = a2 / max(v2, 0.0000001);
return a2 * w2 * w2 * (1.0 / NME_PBR_PI);
}
fn nme_pbr_visAnisoSmith(NdotL: f32, NdotV: f32, TdotV: f32, BdotV: f32, TdotL: f32, BdotL: f32, alphaTB: v2) -> f32 {
let lambdaV = NdotL * length(v3(alphaTB.x * TdotV, alphaTB.y * BdotV, NdotV));
let lambdaL = NdotV * length(v3(alphaTB.x * TdotL, alphaTB.y * BdotL, NdotL));
return 0.5 / max(lambdaV + lambdaL, 0.0000001);
}
` : ``;
    const ssFns = useSubsurface || useRefraction || useCcTint ? `fn nme_pbr_transmittanceBurley(tintColor: v3, diffusionDist: v3, thickness: f32) -> v3 {
let S = v3(1.0) / max(diffusionDist, v3(0.0000001));
let temp = exp(-0.333333333 * thickness * S);
return tintColor * 0.25 * (temp * temp * temp + 3.0 * temp);
}
fn nme_pbr_cocaLambert(volumeAlbedo: v3, distance: f32) -> v3 {
return exp(-volumeAlbedo * distance);
}
fn nme_pbr_colorAtDistance(color: v3, distance: f32) -> v3 {
return -log(color) / distance;
}
` : ``;
    const anisoSetup = useAnisotropy ? `let _adp1 = dpdx(worldPos);
let _adp2 = -dpdy(worldPos);
let _aduv1 = dpdx(anisoUv);
let _aduv2 = -dpdy(anisoUv);
let _adp2perp = cross(_adp2, Ng);
let _adp1perp = cross(Ng, _adp1);
let _atan = _adp2perp * _aduv1.x + _adp1perp * _aduv2.x;
let _abit = _adp2perp * _aduv1.y + _adp1perp * _aduv2.y;
let _adet = max(dot(_atan, _atan), dot(_abit, _abit));
let _ainvmax = select(0.0, inverseSqrt(_adet), _adet > 0.0);
let _aTBN0 = normalize(_atan * _ainvmax);
let _aTBN1 = normalize(_abit * _ainvmax);
let anisoIntensity = clamp(anisoIntensityIn, -1.0, 1.0);
let anisoDir = v3(anisoDirection, 0.0);
let anisoT_raw = _aTBN0 * anisoDir.x + _aTBN1 * anisoDir.y;
let anisoT = normalize(anisoT_raw);
let anisoB = normalize(cross(Ng, anisoT));
let aniAlphaTB = nme_pbr_anisoRoughness(alphaG, anisoIntensity);
let aniN = nme_pbr_anisoBentNormal(anisoT, anisoB, N, V, anisoIntensity);` : `let anisoT = v3(1.0, 0.0, 0.0);
let anisoB = v3(0.0, 0.0, 1.0);
let aniAlphaTB = v2(alphaG, alphaG);
let aniN = N;`;
    const specularAABlock = useSpecularAA ? `var AA_factor_x = 0.0;
var AA_factor_y = 0.0;
{ let nDfdx_AA = dpdx(N);
let nDfdy_AA = dpdy(N);
let slopeSquare_AA = max(dot(nDfdx_AA, nDfdx_AA), dot(nDfdy_AA, nDfdy_AA));
AA_factor_x = pow(saturate(slopeSquare_AA), 0.333);
AA_factor_y = sqrt(slopeSquare_AA) * 0.75;
alphaG = alphaG + AA_factor_y; }` : `let AA_factor_x = 0.0;
let AA_factor_y = 0.0;`;
    return `alias v2 = vec2<f32>;
alias v3 = vec3<f32>;
alias v4 = vec4<f32>;
struct NmePbrMrResult {
lighting: v3,
diffuseDir: v3,
specularDir: v3,
diffuseInd: v3,
specularInd: v3,
shadow: f32,
lumOverAlpha: f32,
};
const NME_PBR_PI: f32 = 3.14159265358979323846;
fn nme_pbr_distGGX(NdotH: f32, alphaG: f32) -> f32 {
let a2 = alphaG * alphaG;
let d = NdotH * NdotH * (a2 - 1.0) + 1.0;
return a2 / (NME_PBR_PI * d * d);
}
fn nme_pbr_geomGGX(NdotL: f32, NdotV: f32, alphaG: f32) -> f32 {
let a2 = alphaG * alphaG;
let gl = NdotL * sqrt(NdotV * (NdotV - a2 * NdotV) + a2);
let gv = NdotV * sqrt(NdotL * (NdotL - a2 * NdotL) + a2);
return 0.5 / max(gl + gv, 0.00001);
}
fn nme_pbr_fresSchlick(c: f32, F0: v3, F90: v3) -> v3 {
let t = 1.0 - c;
let t2 = t * t;
return F0 + (F90 - F0) * (t2 * t2 * t);
}
fn nme_pbr_diffuseEON(albedo: v3, sigma: f32, NdotL: f32, NdotV: f32, LdotV: f32) -> v3 {
return albedo * (1.0 / NME_PBR_PI);
}
${ccSchlickFn}${charlieFn}${anisoFns}${ssFns}fn nme_pbr_mr_compute(
    worldPos: v3, geometricNormal: v3, worldNormal: v3, cameraPos: v3,
    baseColor: v3, metallic: f32, roughness: f32, ao: f32,
    ccIntensityIn: f32, ccRoughnessIn: f32, ccIor: f32,
    ccBumpColor: v3, ccBumpUv: v2,
    ccTintColor: v3, ccTintAtDistance: f32, ccTintThickness: f32,
    shIntensityIn: f32, shColorIn: v3, shRoughnessIn: f32,
    baseIor: f32,
    refrIntensityIn: f32, refrIor: f32, refrTintAtDistance: f32,
    ssTintColor: v3, ssThickness: f32,
    ssTranslucencyIntensityIn: f32, ssDiffusionDist: v3,
    anisoIntensityIn: f32, anisoDirection: v2, anisoUv: v2,
    iridescenceIntensityIn: f32, iridescenceIorIn: f32, iridescenceThicknessIn: f32,
    shadowFactors: array<f32, ${MAX_LIGHTS}>
) -> NmePbrMrResult {
    var r: NmePbrMrResult;
    let Ng = normalize(geometricNormal);
    let N = normalize(worldNormal);
    let V = normalize(cameraPos - worldPos);
    let NdotVUnclamped = dot(N, V);
    let NdotV = abs(NdotVUnclamped) + 0.0000001;
    let metallic_c = clamp(metallic, 0.0, 1.0);
    let rough_c = clamp(roughness, 0.0, 1.0);
    var alphaG = rough_c * rough_c + 0.0005;
    ${specularAABlock}
    let dielectricF0Raw = (baseIor - 1.0) / (baseIor + 1.0);
    let dielectricF0Scalar = dielectricF0Raw * dielectricF0Raw;
    let dielectricF0 = v3(dielectricF0Scalar);
    var surfaceAlbedo = baseColor * (1.0 - metallic_c) * (1.0 - dielectricF0Scalar);
    let colorF0Base = mix(dielectricF0, baseColor, metallic_c);
    let colorF0 = ${useIridescence ? `mix(colorF0Base, nme_pbr_evalIridescence(1.0, max(iridescenceIorIn, 1.0001), NdotV, max(iridescenceThicknessIn, 0.0), colorF0Base), clamp(iridescenceIntensityIn, 0.0, 1.0))` : `colorF0Base`};
    let colorF90 = v3(1.0);
    let ao_c = clamp(ao, 0.0, 1.0);
    let directRoughness = max(rough_c, AA_factor_x);
    let directAlphaG = directRoughness * directRoughness + 0.0005;
    ${anisoSetup}
    ${ccDecls}
    ${directSpecR0Decl}
    ${ccNormalSetup}
    ${ccAlphaSetup}
    ${shDecls}
    let translucencyIntensity = ${useSubsurface ? "clamp(ssTranslucencyIntensityIn, 0.0, 1.0)" : "0.0"};
    let ssTransmittance = ${useSubsurface ? "nme_pbr_transmittanceBurley(ssTintColor, ssDiffusionDist, max(ssThickness, 0.0000001)) * translucencyIntensity" : "v3(0.0)"};
    let directDiffuseTranslucencyScale = 1.0 - translucencyIntensity;
    ${useRefraction ? `// LEGACY_SPECULAR_ENERGY_CONSERVATION is on for BJS NME PBR-MR. When refraction
    let _refractionOpacityPre = 1.0 - clamp(refrIntensityIn, 0.0, 1.0);
    surfaceAlbedo = surfaceAlbedo * _refractionOpacityPre;` : ``}
    var diffuseAcc = v3(0.0);
    var diffuseTransmissionAcc = v3(0.0);
    var specAcc = v3(0.0);
    var aggShadow: f32 = 0.0;
    var nLights: f32 = 0.0;
    let lc = min(meshU.lc, ${MAX_LIGHTS}u);
    for (var i: u32 = 0u; i < lc; i = i + 1u) {
        let lightIndex = nli(i);
        let entry = nmeLights.lights[lightIndex];
        let t = u32(entry.vLightData.w);
        let sh = shadowFactors[lightIndex];
        if (t == 3u) {
            let Ldir = normalize(entry.vLightData.xyz);
            let nl = clamp(0.5 + 0.5 * dot(N, Ldir), 0.0000001, 1.0);
            let groundSky = mix(entry.vLightDirection.xyz, entry.vLightDiffuse.rgb, nl);
            var baseLayerAtten: f32 = 1.0;
            var baseLayerAbsorption = v3(1.0);${ccHemiBlock(useClearcoat, useCcTint)}
            let H_h = normalize(V + Ldir);
            let NdotH_h = clamp(dot(N, H_h), 0.0000001, 1.0);
            let VdotH_h = saturate(dot(V, H_h));
            let cF_h = nme_pbr_fresSchlick(VdotH_h, directSpecR0, colorF90);
            ${useAnisotropy ? `let TdotH_h = dot(anisoT, H_h);
            let BdotH_h = dot(anisoB, H_h);
            let TdotV_h = dot(anisoT, V);
            let BdotV_h = dot(anisoB, V);
            let TdotL_h = dot(anisoT, Ldir);
            let BdotL_h = dot(anisoB, Ldir);
            let D_h = nme_pbr_burleyAnisoD(NdotH_h, TdotH_h, BdotH_h, aniAlphaTB);
            let Vis_h = nme_pbr_visAnisoSmith(nl, NdotV, TdotV_h, BdotV_h, TdotL_h, BdotL_h, aniAlphaTB);
            specAcc = specAcc + cF_h * D_h * Vis_h * nl * entry.vLightDiffuse.rgb * sh * baseLayerAtten * baseLayerAbsorption;` : `let D_h = nme_pbr_distGGX(NdotH_h, directAlphaG);
            let G_h = nme_pbr_geomGGX(nl, NdotV, directAlphaG);
            specAcc = specAcc + cF_h * D_h * G_h * nl * entry.vLightDiffuse.rgb * sh * baseLayerAtten * baseLayerAbsorption;`}
            diffuseAcc = diffuseAcc + groundSky * surfaceAlbedo * sh * baseLayerAtten * baseLayerAbsorption;${shHemiBlock(useSheen)}
            aggShadow = aggShadow + sh;
            nLights = nLights + 1.0;
            continue;
        }
        var L: v3;
        var atten: f32 = 1.0;
        let color = entry.vLightDiffuse.rgb;
        if (t == 1u) {
            L = normalize(-entry.vLightData.xyz);
        } else {
            let toL = entry.vLightData.xyz - worldPos;
            let d2 = dot(toL, toL);
            let dist = sqrt(d2);
            L = toL / max(dist, 0.0001);
            let range = entry.vLightDiffuse.a;
            if (t == 2u) {
                let invD2 = 1.0 / max(d2, 0.0000001);
                let cosHalfAngle = entry.vLightDirection.w;
                let kappa = 6.64385618977 / max(1.0 - cosHalfAngle, 0.0001);
                let cd = dot(-entry.vLightDirection.xyz, L);
                let dirFall = exp2(kappa * (cd - 1.0));
                atten = invD2 * dirFall;
            } else {
                atten = 1.0 / max(d2, 0.0000001);
            }
        }
        let NdotLUnclamped = dot(N, L);
        let NdotL = clamp(NdotLUnclamped, 0.0000001, 1.0);
        var baseLayerAtten: f32 = 1.0;
        var baseLayerAbsorption = v3(1.0);${ccDirectBlock(useClearcoat, useCcTint)}
        let _LdotV = select(0.0, dot(L, V), t == 1u);
        let _eonDiffuse = nme_pbr_diffuseEON(surfaceAlbedo, 0.0, NdotL, NdotV, _LdotV);
        diffuseAcc = diffuseAcc + _eonDiffuse * directDiffuseTranslucencyScale * NdotL * color * atten * sh * baseLayerAtten * baseLayerAbsorption;
        if (NdotLUnclamped < 0.0 && translucencyIntensity > 0.0) {
            let _trNdotL = abs(NdotLUnclamped) + 0.0000001;
            let _wrapW = 0.02;
            let _wrapT = 1.0 + _wrapW;
            let _wrapNdotL = clamp((_trNdotL + _wrapW) / (_wrapT * _wrapT), 0.0, 1.0);
            let _clampedAlbT = clamp(surfaceAlbedo, v3(0.1), v3(1.0));
            let _eonTransmit = nme_pbr_diffuseEON(_clampedAlbT, 0.0, max(NdotL, 0.0000001), NdotV, _LdotV) / _clampedAlbT;
            diffuseTransmissionAcc = diffuseTransmissionAcc + _eonTransmit * (ssTransmittance * _wrapNdotL) * color * atten * sh * baseLayerAtten * baseLayerAbsorption;
        }
        if (NdotL > 0.0 && atten > 0.0) {
            let H = normalize(V + L);
            let NdotH = clamp(dot(N, H), 0.0000001, 1.0);
            let VdotH = saturate(dot(V, H));
            let cF = nme_pbr_fresSchlick(VdotH, directSpecR0, colorF90);
            ${useAnisotropy ? `let TdotH = dot(anisoT, H);
            let BdotH = dot(anisoB, H);
            let TdotV = dot(anisoT, V);
            let BdotV = dot(anisoB, V);
            let TdotL = dot(anisoT, L);
            let BdotL = dot(anisoB, L);
            let D = nme_pbr_burleyAnisoD(NdotH, TdotH, BdotH, aniAlphaTB);
            let Vis = nme_pbr_visAnisoSmith(NdotL, NdotV, TdotV, BdotV, TdotL, BdotL, aniAlphaTB);
            specAcc = specAcc + cF * D * Vis * NdotL * color * atten * sh * baseLayerAtten * baseLayerAbsorption;` : `let D = nme_pbr_distGGX(NdotH, directAlphaG);
            let G = nme_pbr_geomGGX(NdotL, NdotV, directAlphaG);
            specAcc = specAcc + cF * D * G * NdotL * color * atten * sh * baseLayerAtten * baseLayerAbsorption;`}
        }${shDirectBlock(useSheen)}
        aggShadow = aggShadow + sh;
        nLights = nLights + 1.0;
    }
    r.diffuseDir = diffuseAcc;
    r.specularDir = specAcc;
${iblBlock}
    ${useEnv ? `let _radLum = clamp(dot(finalRadianceScaled * shAlbedoScaling${useClearcoat ? ` * ccConsIBL${ccTintScale}` : ``}, v3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    let _specLum = clamp(dot(finalSpecularScaledDirect * shAlbedoScaling, v3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);${useClearcoat ? `
    let _ccLum = clamp(dot(ccFinalRadiance, v3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    r.lumOverAlpha = _radLum + _specLum + _ccLum;` : `
    r.lumOverAlpha = _radLum + _specLum;`}` : `let _specLum = clamp(dot(specAcc, v3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    r.lumOverAlpha = _specLum;`}
    var colorOut = max(r.lighting, v3(0.0)) * sceneU.vImageInfos.x;
    if (sceneU.vImageInfos.w > 0.5) {
        colorOut = 1.0 - exp2(-1.590579 * colorOut);
    }
    colorOut = pow(max(colorOut, v3(0.0)), v3(0.45454545));
    colorOut = clamp(colorOut, v3(0.0), v3(1.0));
    let highContrast = colorOut * colorOut * (v3(3.0) - colorOut * 2.0);
    if (sceneU.vImageInfos.y < 1.0) {
        colorOut = mix(v3(0.5), colorOut, sceneU.vImageInfos.y);
    } else {
        colorOut = mix(colorOut, highContrast, sceneU.vImageInfos.y - 1.0);
    }
    r.lighting = max(colorOut, v3(0.0));
    if (nLights > 0.0) { r.shadow = aggShadow / nLights; } else { r.shadow = 1.0; }
    return r;
}
`;
  }
  var init_pbr_mr_helper_full = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pbr-mr-helper-full.ts"() {
      "use strict";
      init_types();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pbr-metallic-roughness-block-full.ts
  var pbr_metallic_roughness_block_full_exports = {};
  __export(pbr_metallic_roughness_block_full_exports, {
    emitter: () => emitter40
  });
  function resolveOptional3(block, inputName, fallback2, target, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    if (input?.source) {
      return ctx.cast(ctx.resolve(block, inputName, stage, state), target).expr;
    }
    return fallback2;
  }
  var HELPER_KEY_PREFIX2, SHADOW_FACTORS_ONE3, emitter40;
  var init_pbr_metallic_roughness_block_full = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pbr-metallic-roughness-block-full.ts"() {
      "use strict";
      init_types();
      init_pbr_mr_helper_full();
      HELPER_KEY_PREFIX2 = "nme_pbr_mr";
      SHADOW_FACTORS_ONE3 = `array<f32, ${MAX_LIGHTS}>(${new Array(MAX_LIGHTS).fill("1.0").join(", ")})`;
      emitter40 = {
        className: "PBRMetallicRoughnessBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          const reflectionConnected = !!block.inputs.get("reflection")?.source;
          if (reflectionConnected) {
            state.usesEnv = true;
            ctx.resolve(block, "reflection", stage, state);
          }
          const ccInputRef = block.inputs.get("clearcoat")?.source;
          let ccIntensityExpr = "0.0";
          let ccRoughnessExpr = "0.0";
          let ccIorExpr = "1.5";
          let ccBumpExpr = "v3(0.5, 0.5, 1.0)";
          let ccBumpUvExpr = "v2(0.0)";
          let useCcBump = false;
          let ccTintColorExpr = "v3(1.0)";
          let ccTintAtDistanceExpr = "1.0";
          let ccTintThicknessExpr = "0.0";
          let useCcTint = false;
          let useClearcoat = false;
          let remapClearcoatF0 = false;
          if (ccInputRef) {
            const ccBlock = ctx.graph.blocks.get(ccInputRef.blockId);
            if (ccBlock && ccBlock.className === "ClearCoatBlock") {
              useClearcoat = true;
              remapClearcoatF0 = ccBlock.serialized.remapF0OnInterfaceChange === true;
              state.usesClearcoat = true;
              ctx.resolveOutput(ccBlock, ccInputRef.outputName, stage, state);
              ccIntensityExpr = resolveOptional3(ccBlock, "intensity", "1.0", "f32", stage, state, ctx);
              ccRoughnessExpr = resolveOptional3(ccBlock, "roughness", "0.0", "f32", stage, state, ctx);
              ccIorExpr = resolveOptional3(ccBlock, "indexOfRefraction", "1.5", "f32", stage, state, ctx);
              if (ccBlock.inputs.get("normalMapColor")?.source) {
                useCcBump = true;
                ccBumpExpr = resolveOptional3(ccBlock, "normalMapColor", "v3(0.5, 0.5, 1.0)", "vec3f", stage, state, ctx);
                const uvIn = ccBlock.inputs.get("uv");
                if (uvIn?.source) {
                  const e = ctx.resolve(ccBlock, "uv", stage, state);
                  ccBumpUvExpr = e.type === "vec2f" ? e.expr : `(${e.expr}).xy`;
                }
              }
              if (ccBlock.inputs.get("tintColor")?.source) {
                useCcTint = true;
                ccTintColorExpr = resolveOptional3(ccBlock, "tintColor", "v3(1.0)", "vec3f", stage, state, ctx);
                ccTintAtDistanceExpr = resolveOptional3(ccBlock, "tintAtDistance", "1.0", "f32", stage, state, ctx);
                ccTintThicknessExpr = resolveOptional3(ccBlock, "tintThickness", "0.0", "f32", stage, state, ctx);
              }
            }
          }
          const shInputRef = block.inputs.get("sheen")?.source;
          let shIntensityExpr = "0.0";
          let shColorExpr = "v3(1.0)";
          let shRoughnessExpr = "0.0";
          let useSheen = false;
          let useShAlbedoScaling = false;
          if (shInputRef) {
            const shBlock = ctx.graph.blocks.get(shInputRef.blockId);
            if (shBlock && shBlock.className === "SheenBlock") {
              useSheen = true;
              state.usesSheen = true;
              useShAlbedoScaling = shBlock.serialized.albedoScaling === true;
              ctx.resolveOutput(shBlock, shInputRef.outputName, stage, state);
              shIntensityExpr = resolveOptional3(shBlock, "intensity", "1.0", "f32", stage, state, ctx);
              shColorExpr = resolveOptional3(shBlock, "color", "v3(1.0)", "vec3f", stage, state, ctx);
              const shrIn = shBlock.inputs.get("roughness");
              shRoughnessExpr = shrIn?.source ? resolveOptional3(shBlock, "roughness", "0.0", "f32", stage, state, ctx) : `clamp(${resolveOptional3(block, "roughness", "0.5", "f32", stage, state, ctx)}, 0.0, 1.0)`;
            }
          }
          const ssInputRef = block.inputs.get("subsurface")?.source;
          let useSubsurface = false;
          let useRefraction = false;
          let ssTintColorExpr = "v3(1.0)";
          let ssThicknessExpr = "0.0";
          let ssTranslucencyIntensityExpr = "0.0";
          let ssDiffusionDistExpr = "v3(1.0)";
          let refrIntensityExpr = "0.0";
          let refrIorExpr = resolveOptional3(block, "indexOfRefraction", "1.5", "f32", stage, state, ctx);
          let refrTintAtDistanceExpr = "1.0";
          if (ssInputRef) {
            const ssBlk = ctx.graph.blocks.get(ssInputRef.blockId);
            if (ssBlk && ssBlk.className === "SubSurfaceBlock") {
              useSubsurface = true;
              state.usesSubsurface = true;
              ctx.resolveOutput(ssBlk, ssInputRef.outputName, stage, state);
              ssTintColorExpr = resolveOptional3(ssBlk, "tintColor", "v3(1.0)", "vec3f", stage, state, ctx);
              ssThicknessExpr = resolveOptional3(ssBlk, "thickness", "0.0", "f32", stage, state, ctx);
              ssTranslucencyIntensityExpr = resolveOptional3(ssBlk, "translucencyIntensity", "0.0", "f32", stage, state, ctx);
              ssDiffusionDistExpr = resolveOptional3(ssBlk, "translucencyDiffusionDist", "v3(1.0)", "vec3f", stage, state, ctx);
              const refrInputRef = ssBlk.inputs.get("refraction")?.source;
              if (refrInputRef) {
                const refrBlk = ctx.graph.blocks.get(refrInputRef.blockId);
                if (refrBlk && refrBlk.className === "RefractionBlock") {
                  useRefraction = true;
                  ctx.resolveOutput(refrBlk, refrInputRef.outputName, stage, state);
                  refrIntensityExpr = resolveOptional3(refrBlk, "intensity", "1.0", "f32", stage, state, ctx);
                  refrTintAtDistanceExpr = resolveOptional3(refrBlk, "tintAtDistance", "1.0", "f32", stage, state, ctx);
                  const volIor = refrBlk.inputs.get("volumeIndexOfRefraction");
                  if (volIor?.source) {
                    refrIorExpr = resolveOptional3(refrBlk, "volumeIndexOfRefraction", "1.5", "f32", stage, state, ctx);
                  }
                }
              }
            }
          }
          const aniInputRef = block.inputs.get("anisotropy")?.source;
          let useAnisotropy = false;
          let anisoIntensityExpr = "0.0";
          let anisoDirectionExpr = "v2(1.0, 0.0)";
          let anisoUvExpr = "v2(0.0)";
          if (aniInputRef) {
            const aniBlk = ctx.graph.blocks.get(aniInputRef.blockId);
            if (aniBlk && aniBlk.className === "AnisotropyBlock") {
              useAnisotropy = true;
              state.usesAnisotropy = true;
              ctx.resolveOutput(aniBlk, aniInputRef.outputName, stage, state);
              anisoIntensityExpr = resolveOptional3(aniBlk, "intensity", "0.0", "f32", stage, state, ctx);
              anisoDirectionExpr = resolveOptional3(aniBlk, "direction", "v2(1.0, 0.0)", "vec3f", stage, state, ctx);
              const dirIn = aniBlk.inputs.get("direction");
              if (dirIn?.source) {
                const e = ctx.resolve(aniBlk, "direction", stage, state);
                anisoDirectionExpr = e.type === "vec2f" ? e.expr : `(${e.expr}).xy`;
              }
              const uvIn = aniBlk.inputs.get("uv");
              if (uvIn?.source) {
                const e = ctx.resolve(aniBlk, "uv", stage, state);
                anisoUvExpr = e.type === "vec2f" ? e.expr : `(${e.expr}).xy`;
              }
            }
          }
          const iriInputRef = block.inputs.get("iridescence")?.source;
          let useIridescence = false;
          let iriIntensityExpr = "1.0";
          let iriIorExpr = "1.3";
          let iriThicknessExpr = "400.0";
          if (iriInputRef) {
            const iriBlk = ctx.graph.blocks.get(iriInputRef.blockId);
            if (iriBlk && iriBlk.className === "IridescenceBlock") {
              useIridescence = true;
              state.usesIridescence = true;
              ctx.resolveOutput(iriBlk, iriInputRef.outputName, stage, state);
              iriIntensityExpr = resolveOptional3(iriBlk, "intensity", "1.0", "f32", stage, state, ctx);
              iriIorExpr = resolveOptional3(iriBlk, "indexOfRefraction", "1.3", "f32", stage, state, ctx);
              iriThicknessExpr = resolveOptional3(iriBlk, "thickness", "400.0", "f32", stage, state, ctx);
            }
          }
          const useSpecularAA = block.serialized.enableSpecularAntiAliasing === true;
          const helperKey = `${HELPER_KEY_PREFIX2}_${reflectionConnected ? "env" : "noenv"}_${useClearcoat ? "cc" : "nocc"}_${remapClearcoatF0 ? "ccF0R" : "ccF0"}_${useSheen ? "sh" : "nosh"}_${useRefraction ? "refr" : "norefr"}_${useSubsurface ? "ss" : "noss"}_${useAnisotropy ? "ani" : "noani"}_${useIridescence ? "iri" : "noiri"}_${useShAlbedoScaling ? "shAS" : "noShAS"}_${useCcBump ? "ccB" : ""}_${useCcTint ? "ccT" : ""}_${useSpecularAA ? "aa" : "noaa"}`;
          state.fragment.helpers.set(
            helperKey,
            buildPbrMrHelperFull({
              key: helperKey,
              useEnv: reflectionConnected,
              useClearcoat,
              useSheen,
              useRefraction,
              useSubsurface,
              useAnisotropy,
              useIridescence,
              useShAlbedoScaling,
              useCcBump,
              useCcTint,
              useSpecularAA,
              remapClearcoatF0
            })
          );
          state.usesLightsUbo = true;
          const memoKey2 = `_pbrmr_${block.id}_call`;
          let callVar;
          const existing = state.fragment.memo.get(memoKey2);
          if (existing) {
            callVar = existing.expr;
          } else {
            const wp = resolveOptional3(block, "worldPosition", "v3(0.0)", "vec3f", stage, state, ctx);
            const gn = resolveOptional3(block, "worldNormal", "v3(0.0, 1.0, 0.0)", "vec3f", stage, state, ctx);
            const perturbed = block.inputs.get("perturbedNormal");
            const wn = perturbed?.source ? ctx.cast(ctx.resolve(block, "perturbedNormal", stage, state), "vec3f").expr : gn;
            const cp = resolveOptional3(block, "cameraPosition", "_NME_CAMERA_POS_", "vec3f", stage, state, ctx);
            const bc = resolveOptional3(block, "baseColor", "v3(1.0)", "vec3f", stage, state, ctx);
            const me = resolveOptional3(block, "metallic", "0.0", "f32", stage, state, ctx);
            const ro = resolveOptional3(block, "roughness", "0.5", "f32", stage, state, ctx);
            const ao = resolveOptional3(block, "ambientOcc", "1.0", "f32", stage, state, ctx);
            const baseIorExpr = resolveOptional3(block, "indexOfRefraction", "1.5", "f32", stage, state, ctx);
            const sf = state.shadowLights.length > 0 ? `nme_computeShadowFactors(in)` : SHADOW_FACTORS_ONE3;
            callVar = `_pbrR${ctx.temp(state, "pbr")}`;
            state.fragment.body.push(
              `let ${callVar} = nme_pbr_mr_compute(${wp}, ${gn}, ${wn}, ${cp}, ${bc}, ${me}, ${ro}, ${ao}, ${ccIntensityExpr}, ${ccRoughnessExpr}, ${ccIorExpr}, ${ccBumpExpr}, ${ccBumpUvExpr}, ${ccTintColorExpr}, ${ccTintAtDistanceExpr}, ${ccTintThicknessExpr}, ${shIntensityExpr}, ${shColorExpr}, ${shRoughnessExpr}, ${baseIorExpr}, ${refrIntensityExpr}, ${refrIorExpr}, ${refrTintAtDistanceExpr}, ${ssTintColorExpr}, ${ssThicknessExpr}, ${ssTranslucencyIntensityExpr}, ${ssDiffusionDistExpr}, ${anisoIntensityExpr}, ${anisoDirectionExpr}, ${anisoUvExpr}, ${iriIntensityExpr}, ${iriIorExpr}, ${iriThicknessExpr}, ${sf});`
            );
            state.fragment.memo.set(memoKey2, { expr: callVar, type: "vec4f" });
          }
          switch (outputName) {
            case "lighting":
              return { expr: `${callVar}.lighting`, type: "vec3f" };
            case "diffuseDir":
              return { expr: `${callVar}.diffuseDir`, type: "vec3f" };
            case "specularDir":
              return { expr: `${callVar}.specularDir`, type: "vec3f" };
            case "diffuseInd":
              return { expr: `${callVar}.diffuseInd`, type: "vec3f" };
            case "specularInd":
              return { expr: `${callVar}.specularInd`, type: "vec3f" };
            case "shadow":
              return { expr: `${callVar}.shadow`, type: "f32" };
            case "alpha": {
              const cfg = block.serialized;
              const useOverAlpha = cfg.useSpecularOverAlpha === true || cfg.useRadianceOverAlpha === true;
              const op = block.inputs.get("opacity");
              const baseAlpha = op?.source ? ctx.cast(ctx.resolve(block, "opacity", stage, state), "f32").expr : "1.0";
              if (useOverAlpha) {
                return { expr: `clamp(${baseAlpha} + ${callVar}.lumOverAlpha * ${callVar}.lumOverAlpha, 0.0, 1.0)`, type: "f32" };
              }
              return { expr: baseAlpha, type: "f32" };
            }
            case "ambientClr":
            case "clearcoatDir":
            case "clearcoatInd":
            case "sheenDir":
            case "sheenInd":
            case "refraction":
              return { expr: `v3(0.0)`, type: "vec3f" };
            default:
              return { expr: `${callVar}.lighting`, type: "vec3f" };
          }
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reflection-block.ts
  var reflection_block_exports = {};
  __export(reflection_block_exports, {
    emitter: () => emitter41
  });
  var emitter41;
  var init_reflection_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reflection-block.ts"() {
      "use strict";
      emitter41 = {
        className: "ReflectionBlock",
        stage: "fragment",
        emit(_block, _outputName, _stage, state, _ctx) {
          state.usesEnv = true;
          return { expr: `vec3<f32>(0.0)`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/clearcoat-block.ts
  var clearcoat_block_exports = {};
  __export(clearcoat_block_exports, {
    emitter: () => emitter42
  });
  var emitter42;
  var init_clearcoat_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/clearcoat-block.ts"() {
      "use strict";
      emitter42 = {
        className: "ClearCoatBlock",
        stage: "fragment",
        emit(_block, _outputName, _stage, state, _ctx) {
          state.usesClearcoat = true;
          return { expr: `vec3<f32>(0.0)`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/sheen-block.ts
  var sheen_block_exports = {};
  __export(sheen_block_exports, {
    emitter: () => emitter43
  });
  var emitter43;
  var init_sheen_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/sheen-block.ts"() {
      "use strict";
      emitter43 = {
        className: "SheenBlock",
        stage: "fragment",
        emit(_block, _outputName, _stage, state, _ctx) {
          state.usesSheen = true;
          return { expr: `vec3<f32>(0.0)`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/anisotropy-block.ts
  var anisotropy_block_exports = {};
  __export(anisotropy_block_exports, {
    emitter: () => emitter44
  });
  var emitter44;
  var init_anisotropy_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/anisotropy-block.ts"() {
      "use strict";
      emitter44 = {
        className: "AnisotropyBlock",
        stage: "fragment",
        emit(_block, _outputName, _stage, state, _ctx) {
          state.usesAnisotropy = true;
          return { expr: `vec3<f32>(0.0)`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/subsurface-block.ts
  var subsurface_block_exports = {};
  __export(subsurface_block_exports, {
    emitter: () => emitter45
  });
  var emitter45;
  var init_subsurface_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/subsurface-block.ts"() {
      "use strict";
      emitter45 = {
        className: "SubSurfaceBlock",
        stage: "fragment",
        emit(_block, _outputName, _stage, state, _ctx) {
          state.usesSubsurface = true;
          return { expr: `vec3<f32>(0.0)`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/refraction-block.ts
  var refraction_block_exports = {};
  __export(refraction_block_exports, {
    emitter: () => emitter46
  });
  var emitter46;
  var init_refraction_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/refraction-block.ts"() {
      "use strict";
      emitter46 = {
        className: "RefractionBlock",
        stage: "fragment",
        emit(_block, _outputName, _stage, _state, _ctx) {
          return { expr: `vec3<f32>(0.0)`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/divide-block.ts
  var divide_block_exports = {};
  __export(divide_block_exports, {
    emitter: () => emitter47
  });
  var emitter47;
  var init_divide_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/divide-block.ts"() {
      "use strict";
      init_math_factory();
      emitter47 = binaryEmitter("DivideBlock", (l, r) => `${l} / ${r}`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/mod-block.ts
  var mod_block_exports = {};
  __export(mod_block_exports, {
    emitter: () => emitter48
  });
  var emitter48;
  var init_mod_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/mod-block.ts"() {
      "use strict";
      init_math_factory();
      emitter48 = binaryEmitter("ModBlock", (l, r) => `${l} % ${r}`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reciprocal-block.ts
  var reciprocal_block_exports = {};
  __export(reciprocal_block_exports, {
    emitter: () => emitter49
  });
  var emitter49;
  var init_reciprocal_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reciprocal-block.ts"() {
      "use strict";
      emitter49 = {
        className: "ReciprocalBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = ctx.resolve(block, "input", stage, state);
          if (input.type === "mat4f") {
            return { expr: `inverse(${input.expr})`, type: "mat4f" };
          }
          return { expr: `(1.0 / ${input.expr})`, type: input.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/length-block.ts
  var length_block_exports = {};
  __export(length_block_exports, {
    emitter: () => emitter50
  });
  var emitter50;
  var init_length_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/length-block.ts"() {
      "use strict";
      emitter50 = {
        className: "LengthBlock",
        emit(block, _outputName, stage, state, ctx) {
          const value = ctx.resolve(block, "value", stage, state);
          return { expr: `length(${value.expr})`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/distance-block.ts
  var distance_block_exports = {};
  __export(distance_block_exports, {
    emitter: () => emitter51
  });
  var emitter51;
  var init_distance_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/distance-block.ts"() {
      "use strict";
      init_math_factory();
      emitter51 = {
        className: "DistanceBlock",
        emit(block, _outputName, stage, state, ctx) {
          const left = ctx.resolve(block, "left", stage, state);
          const right = ctx.resolve(block, "right", stage, state);
          const type = widerType(left.type, right.type);
          const lc = ctx.cast(left, type).expr;
          const rc = ctx.cast(right, type).expr;
          return { expr: `length(${lc} - ${rc})`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/cross-block.ts
  var cross_block_exports = {};
  __export(cross_block_exports, {
    emitter: () => emitter52
  });
  var emitter52;
  var init_cross_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/cross-block.ts"() {
      "use strict";
      emitter52 = {
        className: "CrossBlock",
        emit(block, _outputName, stage, state, ctx) {
          const left = ctx.cast(ctx.resolve(block, "left", stage, state), "vec3f").expr;
          const right = ctx.cast(ctx.resolve(block, "right", stage, state), "vec3f").expr;
          return { expr: `cross(${left}, ${right})`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reflect-block.ts
  var reflect_block_exports = {};
  __export(reflect_block_exports, {
    emitter: () => emitter53
  });
  var emitter53;
  var init_reflect_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reflect-block.ts"() {
      "use strict";
      emitter53 = {
        className: "ReflectBlock",
        emit(block, _outputName, stage, state, ctx) {
          const incident = ctx.cast(ctx.resolve(block, "incident", stage, state), "vec3f").expr;
          const normal = ctx.cast(ctx.resolve(block, "normal", stage, state), "vec3f").expr;
          return { expr: `reflect(${incident}, ${normal})`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/refract-block.ts
  var refract_block_exports = {};
  __export(refract_block_exports, {
    emitter: () => emitter54
  });
  var emitter54;
  var init_refract_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/refract-block.ts"() {
      "use strict";
      emitter54 = {
        className: "RefractBlock",
        emit(block, _outputName, stage, state, ctx) {
          const incident = ctx.cast(ctx.resolve(block, "incident", stage, state), "vec3f").expr;
          const normal = ctx.cast(ctx.resolve(block, "normal", stage, state), "vec3f").expr;
          const ior = ctx.cast(ctx.resolve(block, "ior", stage, state), "f32").expr;
          return { expr: `refract(${incident}, ${normal}, ${ior})`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/arc-tan2-block.ts
  var arc_tan2_block_exports = {};
  __export(arc_tan2_block_exports, {
    emitter: () => emitter55
  });
  var emitter55;
  var init_arc_tan2_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/arc-tan2-block.ts"() {
      "use strict";
      emitter55 = {
        className: "ArcTan2Block",
        emit(block, _outputName, stage, state, ctx) {
          const x = ctx.cast(ctx.resolve(block, "x", stage, state), "f32").expr;
          const y = ctx.cast(ctx.resolve(block, "y", stage, state), "f32").expr;
          return { expr: `atan2(${x}, ${y})`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/fresnel-block.ts
  var fresnel_block_exports = {};
  __export(fresnel_block_exports, {
    emitter: () => emitter56
  });
  var HELPER, emitter56;
  var init_fresnel_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/fresnel-block.ts"() {
      "use strict";
      HELPER = `fn nme_computeFresnelTerm(viewDirection: vec3<f32>, worldNormal: vec3<f32>, bias: f32, power: f32) -> f32 {
    let fresnelTerm = pow(bias + abs(dot(viewDirection, worldNormal)), power);
    return clamp(fresnelTerm, 0.0, 1.0);
}`;
      emitter56 = {
        className: "FresnelBlock",
        emit(block, _outputName, stage, state, ctx) {
          const worldNormal = ctx.cast(ctx.resolve(block, "worldNormal", stage, state), "vec3f").expr;
          const viewDirection = ctx.cast(ctx.resolve(block, "viewDirection", stage, state), "vec3f").expr;
          const bias = ctx.cast(ctx.resolve(block, "bias", stage, state), "f32").expr;
          const power = ctx.cast(ctx.resolve(block, "power", stage, state), "f32").expr;
          const stageState = stage === "vertex" ? state.vertex : state.fragment;
          stageState.helpers.set("nme_computeFresnelTerm", HELPER);
          return { expr: `nme_computeFresnelTerm(${viewDirection}, ${worldNormal}, ${bias}, ${power})`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/opposite-block.ts
  var opposite_block_exports = {};
  __export(opposite_block_exports, {
    emitter: () => emitter57
  });
  var emitter57;
  var init_opposite_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/opposite-block.ts"() {
      "use strict";
      init_math_factory();
      emitter57 = unaryEmitter("OppositeBlock", (v) => `1.0 - ${v}`);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/nlerp-block.ts
  var nlerp_block_exports = {};
  __export(nlerp_block_exports, {
    emitter: () => emitter58
  });
  var emitter58;
  var init_nlerp_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/nlerp-block.ts"() {
      "use strict";
      init_math_factory();
      emitter58 = {
        className: "NLerpBlock",
        emit(block, _outputName, stage, state, ctx) {
          const left = ctx.resolve(block, "left", stage, state);
          const right = ctx.resolve(block, "right", stage, state);
          const gradient = ctx.resolve(block, "gradient", stage, state);
          const t = widerType(left.type, right.type);
          if (t === "f32") {
            throw new Error("NodeMaterial: NLerpBlock requires a vector left/right input; Babylon.js emits normalize(mix(...)) for this block");
          }
          const lc = ctx.cast(left, t).expr;
          const rc = ctx.cast(right, t).expr;
          const gc = ctx.cast(gradient, t).expr;
          return { expr: `normalize(mix(${lc}, ${rc}, ${gc}))`, type: t };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/conditional-block.ts
  var conditional_block_exports = {};
  __export(conditional_block_exports, {
    emitter: () => emitter59
  });
  function connectedOrDefault(block, inputName, fallback2, type, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    if (input?.source) {
      return ctx.resolve(block, inputName, stage, state);
    }
    return { expr: fallback2, type };
  }
  function conditionExpr(condition, a, b) {
    switch (condition) {
      case 0:
        return `${a} == ${b}`;
      case 1:
        return `${a} != ${b}`;
      case 2:
        return `${a} < ${b}`;
      case 3:
        return `${a} > ${b}`;
      case 4:
        return `${a} <= ${b}`;
      case 5:
        return `${a} >= ${b}`;
      case 6:
        return `(((${a} + ${b}) - 2.0 * floor((${a} + ${b}) / 2.0)) > 0.0)`;
      case 7:
        return `(min(${a} + ${b}, 1.0) > 0.0)`;
      case 8:
        return `(${a} * ${b} > 0.0)`;
      default:
        throw new Error(`NodeMaterial: unknown ConditionalBlock condition ${condition}`);
    }
  }
  var emitter59;
  var init_conditional_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/conditional-block.ts"() {
      "use strict";
      init_math_factory();
      emitter59 = {
        className: "ConditionalBlock",
        emit(block, _outputName, stage, state, ctx) {
          const a = ctx.cast(ctx.resolve(block, "a", stage, state), "f32").expr;
          const b = ctx.cast(ctx.resolve(block, "b", stage, state), "f32").expr;
          const trueValue = connectedOrDefault(block, "true", "1.0", "f32", stage, state, ctx);
          const falseValue = connectedOrDefault(block, "false", "0.0", "f32", stage, state, ctx);
          const outputType = widerType(trueValue.type, falseValue.type);
          const t = ctx.cast(trueValue, outputType).expr;
          const f = ctx.cast(falseValue, outputType).expr;
          const rawCondition = block.serialized.condition;
          const condition = typeof rawCondition === "number" ? rawCondition : 2;
          return { expr: `select(${f}, ${t}, ${conditionExpr(condition, a, b)})`, type: outputType };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/curve-block.ts
  var curve_block_exports = {};
  __export(curve_block_exports, {
    emitter: () => emitter60
  });
  function curveScalar(type, v) {
    switch (type) {
      case 0:
        return `(1.0 - cos((${v} * 3.1415) / 2.0))`;
      case 1:
        return `sin((${v} * 3.1415) / 2.0)`;
      case 2:
        return `(-((cos(${v} * 3.1415) - 1.0)) / 2.0)`;
      case 3:
        return `(${v} * ${v})`;
      case 4:
        return `((1.0 - ${v}) * (1.0 - ${v}))`;
      case 5:
        return `select(1.0 - pow(-2.0 * ${v} + 2.0, 2.0) / 2.0, 2.0 * ${v} * ${v}, ${v} < 0.5)`;
      case 6:
        return `(${v} * ${v} * ${v})`;
      case 7:
        return `(1.0 - pow(1.0 - ${v}, 3.0))`;
      case 8:
        return `select(1.0 - pow(-2.0 * ${v} + 2.0, 3.0) / 2.0, 4.0 * ${v} * ${v} * ${v}, ${v} < 0.5)`;
      case 9:
        return `(${v} * ${v} * ${v} * ${v})`;
      case 10:
        return `(1.0 - pow(1.0 - ${v}, 4.0))`;
      case 11:
        return `select(1.0 - pow(-2.0 * ${v} + 2.0, 4.0) / 2.0, 8.0 * ${v} * ${v} * ${v} * ${v}, ${v} < 0.5)`;
      case 12:
        return `(${v} * ${v} * ${v} * ${v} * ${v})`;
      case 13:
        return `(1.0 - pow(1.0 - ${v}, 5.0))`;
      case 14:
        return `select(1.0 - pow(-2.0 * ${v} + 2.0, 5.0) / 2.0, 16.0 * ${v} * ${v} * ${v} * ${v} * ${v}, ${v} < 0.5)`;
      case 15:
        return `select(pow(2.0, 10.0 * ${v} - 10.0), 0.0, ${v} == 0.0)`;
      case 16:
        return `select(1.0 - pow(2.0, -10.0 * ${v}), 1.0, ${v} == 1.0)`;
      case 17:
        return `select(select(select((2.0 - pow(2.0, -20.0 * ${v} + 10.0)) / 2.0, pow(2.0, 20.0 * ${v} - 10.0) / 2.0, ${v} < 0.5), 1.0, ${v} == 1.0), 0.0, ${v} == 0.0)`;
      case 18:
        return `(1.0 - sqrt(1.0 - pow(${v}, 2.0)))`;
      case 19:
        return `sqrt(1.0 - pow(${v} - 1.0, 2.0))`;
      case 20:
        return `select((sqrt(1.0 - pow(-2.0 * ${v} + 2.0, 2.0)) + 1.0) / 2.0, (1.0 - sqrt(1.0 - pow(2.0 * ${v}, 2.0))) / 2.0, ${v} < 0.5)`;
      case 21:
        return `(2.70158 * ${v} * ${v} * ${v} - 1.70158 * ${v} * ${v})`;
      case 22:
        return `(2.70158 * pow(${v} - 1.0, 3.0) + 1.70158 * pow(${v} - 1.0, 2.0))`;
      case 23:
        return `select((pow(2.0 * ${v} - 2.0, 2.0) * (3.5949095 * (${v} * 2.0 - 2.0) + 3.5949095) + 2.0) / 2.0, (pow(2.0 * ${v}, 2.0) * (3.5949095 * 2.0 * ${v} - 2.5949095)) / 2.0, ${v} < 0.5)`;
      case 24:
        return `select(select(-pow(2.0, 10.0 * ${v} - 10.0) * sin((${v} * 10.0 - 10.75) * ((2.0 * 3.1415) / 3.0)), 1.0, ${v} == 1.0), 0.0, ${v} == 0.0)`;
      case 25:
        return `select(select(pow(2.0, -10.0 * ${v}) * sin((${v} * 10.0 - 0.75) * ((2.0 * 3.1415) / 3.0)) + 1.0, 1.0, ${v} == 1.0), 0.0, ${v} == 0.0)`;
      case 26:
        return `select(select(select((pow(2.0, -20.0 * ${v} + 10.0) * sin((20.0 * ${v} - 11.125) * ((2.0 * 3.1415) / 4.5))) / 2.0 + 1.0, -(pow(2.0, 20.0 * ${v} - 10.0) * sin((20.0 * ${v} - 11.125) * ((2.0 * 3.1415) / 4.5))) / 2.0, ${v} < 0.5), 1.0, ${v} == 1.0), 0.0, ${v} == 0.0)`;
      default:
        throw new Error(`NodeMaterial: unknown CurveBlock curveType ${type}`);
    }
  }
  function curveExpr(type, input, inputType) {
    if (inputType === "f32") {
      return curveScalar(type, input);
    }
    if (inputType === "vec2f") {
      return `${WGSL[inputType]}(${curveScalar(type, `(${input}).x`)}, ${curveScalar(type, `(${input}).y`)})`;
    }
    if (inputType === "vec3f") {
      return `${WGSL[inputType]}(${curveScalar(type, `(${input}).x`)}, ${curveScalar(type, `(${input}).y`)}, ${curveScalar(type, `(${input}).z`)})`;
    }
    if (inputType === "vec4f") {
      return `${WGSL[inputType]}(${curveScalar(type, `(${input}).x`)}, ${curveScalar(type, `(${input}).y`)}, ${curveScalar(type, `(${input}).z`)}, ${curveScalar(type, `(${input}).w`)})`;
    }
    throw new Error(`NodeMaterial: CurveBlock does not support ${inputType}`);
  }
  var emitter60;
  var init_curve_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/curve-block.ts"() {
      "use strict";
      init_node_types();
      emitter60 = {
        className: "CurveBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = ctx.resolve(block, "input", stage, state);
          const rawCurveType = block.serialized.curveType;
          const curveType = typeof rawCurveType === "number" ? rawCurveType : 2;
          return { expr: curveExpr(curveType, input.expr, input.type), type: input.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/wave-block.ts
  var wave_block_exports = {};
  __export(wave_block_exports, {
    emitter: () => emitter61
  });
  function scalar(type, value) {
    if (type === "f32") {
      return value;
    }
    if (type === "vec2f") {
      return `vec2<f32>(${value})`;
    }
    if (type === "vec3f") {
      return `vec3<f32>(${value})`;
    }
    if (type === "vec4f") {
      return `vec4<f32>(${value})`;
    }
    throw new Error(`NodeMaterial: WaveBlock does not support ${type}`);
  }
  var emitter61;
  var init_wave_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/wave-block.ts"() {
      "use strict";
      emitter61 = {
        className: "WaveBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = ctx.resolve(block, "input", stage, state);
          const v = input.expr;
          const half = scalar(input.type, "0.5");
          const one2 = scalar(input.type, "1.0");
          const two = scalar(input.type, "2.0");
          const rawKind = block.serialized.kind;
          const kind = typeof rawKind === "number" ? rawKind : 0;
          if (kind === 0) {
            return { expr: `(${v} - floor(${half} + ${v}))`, type: input.type };
          }
          if (kind === 1) {
            return { expr: `(${one2} - ${two} * round(fract(${v})))`, type: input.type };
          }
          if (kind === 2) {
            return { expr: `(${two} * abs(${two} * (${v} - floor(${half} + ${v}))) - ${one2})`, type: input.type };
          }
          throw new Error(`NodeMaterial: unknown WaveBlock kind ${kind}`);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/random-number-block.ts
  var random_number_block_exports = {};
  __export(random_number_block_exports, {
    emitter: () => emitter62
  });
  var emitter62;
  var init_random_number_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/random-number-block.ts"() {
      "use strict";
      emitter62 = {
        className: "RandomNumberBlock",
        emit(block, _outputName, stage, state, ctx) {
          const seed = ctx.resolve(block, "seed", stage, state);
          if (seed.type === "f32" || seed.type === "mat4f" || seed.type === "texture2d" || seed.type === "textureCube") {
            throw new Error(`NodeMaterial: RandomNumberBlock requires a vector seed so Babylon.js getRand(seed.xy) can be emitted; got ${seed.type}`);
          }
          state[stage].helpers.set("nme_getRand", "fn nme_getRand(seed: vec2<f32>) -> f32 { return fract(sin(dot(seed.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453); }");
          return { expr: `nme_getRand((${seed.expr}).xy)`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry-extra-math.ts
  var node_registry_extra_math_exports = {};
  __export(node_registry_extra_math_exports, {
    loadExtraEmitter: () => loadExtraEmitter
  });
  function blockLoader(key) {
    switch (key) {
      case "DivideBlock":
        return () => Promise.resolve().then(() => (init_divide_block(), divide_block_exports));
      case "ModBlock":
        return () => Promise.resolve().then(() => (init_mod_block(), mod_block_exports));
      case "ReciprocalBlock":
        return () => Promise.resolve().then(() => (init_reciprocal_block(), reciprocal_block_exports));
      case "LengthBlock":
        return () => Promise.resolve().then(() => (init_length_block(), length_block_exports));
      case "DistanceBlock":
        return () => Promise.resolve().then(() => (init_distance_block(), distance_block_exports));
      case "CrossBlock":
        return () => Promise.resolve().then(() => (init_cross_block(), cross_block_exports));
      case "ReflectBlock":
        return () => Promise.resolve().then(() => (init_reflect_block(), reflect_block_exports));
      case "RefractBlock":
        return () => Promise.resolve().then(() => (init_refract_block(), refract_block_exports));
      case "ArcTan2Block":
        return () => Promise.resolve().then(() => (init_arc_tan2_block(), arc_tan2_block_exports));
      case "FresnelBlock":
        return () => Promise.resolve().then(() => (init_fresnel_block(), fresnel_block_exports));
      case "OppositeBlock":
        return () => Promise.resolve().then(() => (init_opposite_block(), opposite_block_exports));
      case "NLerpBlock":
        return () => Promise.resolve().then(() => (init_nlerp_block(), nlerp_block_exports));
      case "ConditionalBlock":
        return () => Promise.resolve().then(() => (init_conditional_block(), conditional_block_exports));
      case "CurveBlock":
        return () => Promise.resolve().then(() => (init_curve_block(), curve_block_exports));
      case "WaveBlock":
        return () => Promise.resolve().then(() => (init_wave_block(), wave_block_exports));
      case "RandomNumberBlock":
        return () => Promise.resolve().then(() => (init_random_number_block(), random_number_block_exports));
      default:
        return null;
    }
  }
  async function loadExtraEmitter(key) {
    const loader = blockLoader(key);
    if (!loader) {
      throw new Error(`NodeMaterial: no math extension emitter registered for block "${key}"`);
    }
    return (await loader()).emitter;
  }
  var init_node_registry_extra_math = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry-extra-math.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/color-merger.ts
  var color_merger_exports = {};
  __export(color_merger_exports, {
    emitter: () => emitter63
  });
  function tryResolve2(block, inputName, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    if (!input?.source) {
      return null;
    }
    return ctx.resolve(block, inputName, stage, state);
  }
  function swizzleChar(raw, fallback2) {
    const s = typeof raw === "string" && raw.length > 0 ? raw[0] : fallback2;
    if (s === "r" || s === "x") {
      return "x";
    }
    if (s === "g" || s === "y") {
      return "y";
    }
    if (s === "b" || s === "z") {
      return "z";
    }
    if (s === "a" || s === "w") {
      return "w";
    }
    return fallback2;
  }
  function swizzle(block, len) {
    const s = swizzleChar(block.serialized.rSwizzle, "x") + swizzleChar(block.serialized.gSwizzle, "y") + swizzleChar(block.serialized.bSwizzle, "z") + swizzleChar(block.serialized.aSwizzle, "w");
    return `.${s.slice(0, len)}`;
  }
  var emitter63;
  var init_color_merger = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/color-merger.ts"() {
      "use strict";
      emitter63 = {
        className: "ColorMergerBlock",
        emit(block, outputName, stage, state, ctx) {
          const rgb = tryResolve2(block, "rgb", stage, state, ctx);
          const a = tryResolve2(block, "a", stage, state, ctx);
          if (rgb) {
            const rgbExpr = ctx.cast(rgb, "vec3f").expr;
            const aExpr2 = a ? ctx.cast(a, "f32").expr : "0.0";
            if (outputName === "rgba") {
              return { expr: `(vec4<f32>(${rgbExpr}, ${aExpr2})${swizzle(block, 4)})`, type: "vec4f" };
            }
            return { expr: `((${rgbExpr})${swizzle(block, 3)})`, type: "vec3f" };
          }
          const r = tryResolve2(block, "r", stage, state, ctx);
          const g = tryResolve2(block, "g", stage, state, ctx);
          const b = tryResolve2(block, "b", stage, state, ctx);
          const rExpr = r ? ctx.cast(r, "f32").expr : "0.0";
          const gExpr = g ? ctx.cast(g, "f32").expr : "0.0";
          const bExpr = b ? ctx.cast(b, "f32").expr : "0.0";
          const aExpr = a ? ctx.cast(a, "f32").expr : "0.0";
          if (outputName === "rgba") {
            return { expr: `(vec4<f32>(${rExpr}, ${gExpr}, ${bExpr}, ${aExpr})${swizzle(block, 4)})`, type: "vec4f" };
          }
          return { expr: `(vec3<f32>(${rExpr}, ${gExpr}, ${bExpr})${swizzle(block, 3)})`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/color-converter-block.ts
  var color_converter_block_exports = {};
  __export(color_converter_block_exports, {
    emitter: () => emitter64
  });
  function tryResolve3(block, inputName, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    if (!input?.source) {
      return null;
    }
    return ctx.resolve(block, inputName, stage, state);
  }
  function ensureRgb2HslHelper(state, stage) {
    state[stage].helpers.set(
      "nme_rgb2hsl",
      `fn nme_rgb2hsl(color: vec3<f32>) -> vec3<f32> {
    let r = color.x;
    let g = color.y;
    let b = color.z;
    let maxc = max(r, max(g, b));
    let minc = min(r, min(g, b));
    var h = 0.0;
    var s = 0.0;
    let l = (maxc + minc) / 2.0;
    if (maxc != minc) {
        let d = maxc - minc;
        if (l > 0.5) {
            s = d / (2.0 - maxc - minc);
        } else {
            s = d / (maxc + minc);
        }
        if (maxc == r) {
            var add = 0.0;
            if (g < b) {
                add = 6.0;
            }
            h = (g - b) / d + add;
        } else if (maxc == g) {
            h = (b - r) / d + 2.0;
        } else if (maxc == b) {
            h = (r - g) / d + 4.0;
        }
        h = h / 6.0;
    }
    return vec3<f32>(h, s, l);
}`
    );
  }
  function ensureHsl2RgbHelper(state, stage) {
    state[stage].helpers.set(
      "nme_hue2rgb",
      `fn nme_hue2rgb(p: f32, q: f32, tt: f32) -> f32 {
    var t = tt;
    if (t < 0.0) {
        t = t + 1.0;
    }
    if (t > 1.0) {
        t = t - 1.0;
    }
    if (t < 1.0 / 6.0) {
        return p + (q - p) * 6.0 * t;
    }
    if (t < 1.0 / 2.0) {
        return q;
    }
    if (t < 2.0 / 3.0) {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    return p;
}`
    );
    state[stage].helpers.set(
      "nme_hsl2rgb",
      `fn nme_hsl2rgb(hsl: vec3<f32>) -> vec3<f32> {
    let h = hsl.x;
    let s = hsl.y;
    let l = hsl.z;
    var r: f32;
    var g: f32;
    var b: f32;
    if (s == 0.0) {
        r = l;
        g = l;
        b = l;
    } else {
        var q: f32;
        if (l < 0.5) {
            q = l * (1.0 + s);
        } else {
            q = l + s - l * s;
        }
        let p = 2.0 * l - q;
        r = nme_hue2rgb(p, q, h + 1.0 / 3.0);
        g = nme_hue2rgb(p, q, h);
        b = nme_hue2rgb(p, q, h - 1.0 / 3.0);
    }
    return vec3<f32>(r, g, b);
}`
    );
  }
  var emitter64;
  var init_color_converter_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/color-converter-block.ts"() {
      "use strict";
      emitter64 = {
        className: "ColorConverterBlock",
        emit(block, outputName, stage, state, ctx) {
          const rgb = tryResolve3(block, "rgb", stage, state, ctx);
          if (rgb) {
            const rgbExpr = ctx.cast(rgb, "vec3f").expr;
            if (outputName === "hsl") {
              ensureRgb2HslHelper(state, stage);
              return { expr: `nme_rgb2hsl(${rgbExpr})`, type: "vec3f" };
            }
            return { expr: rgbExpr, type: "vec3f" };
          }
          const hsl = tryResolve3(block, "hsl", stage, state, ctx);
          if (hsl) {
            const hslExpr = ctx.cast(hsl, "vec3f").expr;
            if (outputName === "rgb") {
              ensureHsl2RgbHelper(state, stage);
              return { expr: `nme_hsl2rgb(${hslExpr})`, type: "vec3f" };
            }
            return { expr: hslExpr, type: "vec3f" };
          }
          return { expr: "vec3<f32>(0.0, 0.0, 0.0)", type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/desaturate-block.ts
  var desaturate_block_exports = {};
  __export(desaturate_block_exports, {
    emitter: () => emitter65
  });
  var emitter65;
  var init_desaturate_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/desaturate-block.ts"() {
      "use strict";
      emitter65 = {
        className: "DesaturateBlock",
        emit(block, _outputName, stage, state, ctx) {
          const color = ctx.cast(ctx.resolve(block, "color", stage, state), "vec3f").expr;
          const level = ctx.cast(ctx.resolve(block, "level", stage, state), "f32").expr;
          const minColor = `min(min((${color}).x, (${color}).y), (${color}).z)`;
          const maxColor = `max(max((${color}).x, (${color}).y), (${color}).z)`;
          const merge = `(0.5 * (${minColor} + ${maxColor}))`;
          return { expr: `mix(${color}, vec3<f32>(${merge}), ${level})`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/gradient-block.ts
  var gradient_block_exports = {};
  __export(gradient_block_exports, {
    emitter: () => emitter66
  });
  function readSteps(raw) {
    if (!Array.isArray(raw)) {
      return [
        { step: 0, color: { r: 0, g: 0, b: 0 } },
        { step: 1, color: { r: 1, g: 1, b: 1 } }
      ];
    }
    return raw.map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const e = entry;
      const c = e.color;
      if (typeof e.step !== "number" || !c || typeof c.r !== "number" || typeof c.g !== "number" || typeof c.b !== "number") {
        return null;
      }
      return { step: e.step, color: { r: c.r, g: c.g, b: c.b } };
    }).filter((entry) => entry !== null);
  }
  function colorLiteral(step) {
    return `vec3<f32>(${formatFloat2(step.color.r)}, ${formatFloat2(step.color.g)}, ${formatFloat2(step.color.b)})`;
  }
  var emitter66;
  var init_gradient_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/gradient-block.ts"() {
      "use strict";
      init_math_factory();
      emitter66 = {
        className: "GradientBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = block.inputs.get("gradient");
          const steps = readSteps(block.serialized.colorSteps);
          if (!input?.source || steps.length === 0) {
            return { expr: "vec3<f32>(0.0, 0.0, 0.0)", type: "vec3f" };
          }
          const gradient = ctx.resolve(block, "gradient", stage, state);
          const g = gradient.type === "f32" ? gradient.expr : `((${gradient.expr}).x)`;
          const tempColor = ctx.temp(state, "gradientColor");
          const tempPosition = ctx.temp(state, "gradientPosition");
          state[stage].body.push(`var ${tempColor}: vec3<f32> = ${colorLiteral(steps[0])};`);
          state[stage].body.push(`var ${tempPosition}: f32;`);
          for (let i = 1; i < steps.length; i++) {
            const previous = steps[i - 1];
            const current = steps[i];
            state[stage].body.push(`${tempPosition} = clamp((${g} - ${formatFloat2(previous.step)}) / (${formatFloat2(current.step)} - ${formatFloat2(previous.step)}), 0.0, 1.0);`);
            state[stage].body.push(`${tempColor} = mix(${tempColor}, ${colorLiteral(current)}, ${tempPosition});`);
          }
          return { expr: tempColor, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/posterize-block.ts
  var posterize_block_exports = {};
  __export(posterize_block_exports, {
    emitter: () => emitter67
  });
  function one(type) {
    if (type === "f32") {
      return "1.0";
    }
    if (type === "vec2f") {
      return "vec2<f32>(1.0)";
    }
    if (type === "vec3f") {
      return "vec3<f32>(1.0)";
    }
    if (type === "vec4f") {
      return "vec4<f32>(1.0)";
    }
    throw new Error(`NodeMaterial: PosterizeBlock does not support ${type}`);
  }
  var emitter67;
  var init_posterize_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/posterize-block.ts"() {
      "use strict";
      emitter67 = {
        className: "PosterizeBlock",
        emit(block, _outputName, stage, state, ctx) {
          const value = ctx.resolve(block, "value", stage, state);
          const steps = ctx.cast(ctx.resolve(block, "steps", stage, state), value.type).expr;
          const interval = `(${one(value.type)} / ${steps})`;
          return { expr: `(floor(${value.expr} / ${interval}) * ${interval})`, type: value.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/replace-color-block.ts
  var replace_color_block_exports = {};
  __export(replace_color_block_exports, {
    emitter: () => emitter68
  });
  var emitter68;
  var init_replace_color_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/replace-color-block.ts"() {
      "use strict";
      emitter68 = {
        className: "ReplaceColorBlock",
        emit(block, _outputName, stage, state, ctx) {
          const value = ctx.resolve(block, "value", stage, state);
          if (value.type === "f32" || value.type === "mat4f" || value.type === "texture2d" || value.type === "textureCube") {
            throw new Error(`NodeMaterial: ReplaceColorBlock requires a vector/color value; got ${value.type}`);
          }
          const reference = ctx.cast(ctx.resolve(block, "reference", stage, state), value.type).expr;
          const distance = ctx.cast(ctx.resolve(block, "distance", stage, state), "f32").expr;
          const replacement = ctx.cast(ctx.resolve(block, "replacement", stage, state), value.type).expr;
          return { expr: `select(${value.expr}, ${replacement}, length(${value.expr} - ${reference}) < ${distance})`, type: value.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/panner-block.ts
  var panner_block_exports = {};
  __export(panner_block_exports, {
    emitter: () => emitter69
  });
  var emitter69;
  var init_panner_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/panner-block.ts"() {
      "use strict";
      emitter69 = {
        className: "PannerBlock",
        emit(block, _outputName, stage, state, ctx) {
          const uv = ctx.cast(ctx.resolve(block, "uv", stage, state), "vec2f");
          const speed = ctx.cast(ctx.resolve(block, "speed", stage, state), "vec2f");
          const time = ctx.cast(ctx.resolve(block, "time", stage, state), "f32");
          return { expr: `(${uv.expr} + ${speed.expr} * ${time.expr})`, type: "vec2f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/rotate2d-block.ts
  var rotate2d_block_exports = {};
  __export(rotate2d_block_exports, {
    emitter: () => emitter70
  });
  var emitter70;
  var init_rotate2d_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/rotate2d-block.ts"() {
      "use strict";
      emitter70 = {
        className: "Rotate2dBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = ctx.cast(ctx.resolve(block, "input", stage, state), "vec2f");
          const angle = ctx.cast(ctx.resolve(block, "angle", stage, state), "f32");
          return {
            expr: `vec2<f32>(cos(${angle.expr}) * (${input.expr}).x - sin(${angle.expr}) * (${input.expr}).y, sin(${angle.expr}) * (${input.expr}).x + cos(${angle.expr}) * (${input.expr}).y)`,
            type: "vec2f"
          };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/triplanar-block.ts
  var triplanar_block_exports = {};
  __export(triplanar_block_exports, {
    emitter: () => emitter71
  });
  function sanitize5(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
  }
  function formatFloat3(value) {
    if (Number.isInteger(value)) {
      return `${value}.0`;
    }
    return `${value}`;
  }
  function textureTransform(block) {
    const tex = block.serialized["texture"];
    const num2 = (name, fallback2) => {
      const value = tex?.[name];
      return typeof value === "number" ? value : fallback2;
    };
    return {
      level: num2("level", 1),
      uAng: num2("uAng", 0),
      vAng: num2("vAng", 0),
      wAng: num2("wAng", 0),
      uOffset: num2("uOffset", 0),
      vOffset: num2("vOffset", 0),
      uScale: num2("uScale", 1),
      vScale: num2("vScale", 1)
    };
  }
  function bindingName(block, inputName, ctx, fallback2) {
    const input = block.inputs.get(inputName);
    if (input?.source) {
      const producer = ctx.graph.blocks.get(input.source.blockId);
      return sanitize5(producer?.name || fallback2);
    }
    return sanitize5(fallback2);
  }
  function ensureBinding(state, name) {
    if (!state.textures.find((t) => t.name === name)) {
      state.textures.push({ name, kind: "texture2d", texture: null });
    }
  }
  function applyColorSpace2(expr, outputName, convertToLinear, convertToGamma) {
    if (!convertToLinear && !convertToGamma) {
      return expr;
    }
    const power = convertToLinear ? "2.2" : "0.45454545";
    if (outputName === "rgba") {
      return `vec4<f32>(pow(max(${expr}.xyz, vec3<f32>(0.0)), vec3<f32>(${power})), ${expr}.w)`;
    }
    if (outputName === "rgb") {
      return `pow(max(${expr}.xyz, vec3<f32>(0.0)), vec3<f32>(${power}))`;
    }
    if (outputName === "r" || outputName === "g" || outputName === "b") {
      return `pow(max(${expr}${OUTPUT2[outputName].swizzle}, 0.0), ${power})`;
    }
    return expr;
  }
  function emitTriPlanarSample(block, stage, state, ctx) {
    if (stage !== "fragment") {
      throw new Error("TriPlanarBlock: texture projection is supported only in the fragment stage");
    }
    const stageState = state.fragment;
    const memoKey2 = `_triplanar_${block.id}_sample`;
    const memo = stageState.memo.get(memoKey2);
    if (memo) {
      return memo;
    }
    const baseName = sanitize5(block.name || `triPlanar${block.id}`);
    const texX = bindingName(block, "source", ctx, baseName);
    const texY = bindingName(block, "sourceY", ctx, texX);
    const texZ = bindingName(block, "sourceZ", ctx, texX);
    ensureBinding(state, texX);
    ensureBinding(state, texY);
    ensureBinding(state, texZ);
    const position = ctx.cast(ctx.resolve(block, "position", stage, state), "vec3f");
    const normal = ctx.cast(ctx.resolve(block, "normal", stage, state), "vec3f");
    const sharpnessInput = block.inputs.get("sharpness")?.source ? ctx.cast(ctx.resolve(block, "sharpness", stage, state), "f32").expr : "1.0";
    const transform = textureTransform(block);
    const temp = ctx.temp(state, "tri");
    const n = `_n${temp}`;
    const uvx = `_uvx${temp}`;
    const uvy = `_uvy${temp}`;
    const uvz = `_uvz${temp}`;
    const x = `_x${temp}`;
    const y = `_y${temp}`;
    const z = `_z${temp}`;
    const w = `_w${temp}`;
    const sample = `_sample${temp}`;
    stageState.body.push(`let ${n} = ${normal.expr};`);
    stageState.body.push(`var ${uvx} = (${position.expr}).yz;`);
    stageState.body.push(`var ${uvy} = (${position.expr}).zx;`);
    stageState.body.push(`var ${uvz} = (${position.expr}).xy;`);
    if (block.serialized["projectAsCube"] === true) {
      stageState.body.push(`${uvx} = (${uvx}).yx;`);
      stageState.body.push(`if (${n}.x >= 0.0) { ${uvx}.x = -${uvx}.x; }`);
      stageState.body.push(`if (${n}.y < 0.0) { ${uvy}.y = -${uvy}.y; }`);
      stageState.body.push(`if (${n}.z < 0.0) { ${uvz}.x = -${uvz}.x; }`);
    }
    stageState.body.push(`let _cU${temp} = cos(${formatFloat3(transform.uAng)});`);
    stageState.body.push(`let _sU${temp} = sin(${formatFloat3(transform.uAng)});`);
    stageState.body.push(`${uvx} = mat2x2<f32>(_cU${temp}, -_sU${temp}, _sU${temp}, _cU${temp}) * ${uvx};`);
    stageState.body.push(`let _cV${temp} = cos(${formatFloat3(transform.vAng)});`);
    stageState.body.push(`let _sV${temp} = sin(${formatFloat3(transform.vAng)});`);
    stageState.body.push(`${uvy} = mat2x2<f32>(_cV${temp}, _sV${temp}, -_sV${temp}, _cV${temp}) * ${uvy};`);
    stageState.body.push(`let _cW${temp} = cos(${formatFloat3(transform.wAng)});`);
    stageState.body.push(`let _sW${temp} = sin(${formatFloat3(transform.wAng)});`);
    stageState.body.push(`${uvz} = mat2x2<f32>(_cW${temp}, -_sW${temp}, _sW${temp}, _cW${temp}) * ${uvz};`);
    stageState.body.push(`let _scale${temp} = vec2<f32>(${formatFloat3(transform.uScale)}, ${formatFloat3(transform.vScale)});`);
    stageState.body.push(`let _offset${temp} = vec2<f32>(${formatFloat3(transform.uOffset)}, ${formatFloat3(transform.vOffset)});`);
    stageState.body.push(`${uvx} = ${uvx} * _scale${temp} + _offset${temp};`);
    stageState.body.push(`${uvy} = ${uvy} * _scale${temp} + _offset${temp};`);
    stageState.body.push(`${uvz} = ${uvz} * _scale${temp} + _offset${temp};`);
    stageState.body.push(`let ${x} = textureSample(nodeTex_${texX}, nodeSamp_${texX}, ${uvx});`);
    stageState.body.push(`let ${y} = textureSample(nodeTex_${texY}, nodeSamp_${texY}, ${uvy});`);
    stageState.body.push(`let ${z} = textureSample(nodeTex_${texZ}, nodeSamp_${texZ}, ${uvz});`);
    stageState.body.push(`let ${w} = pow(abs(${n}), vec3<f32>(${sharpnessInput}));`);
    stageState.body.push(
      `let ${sample} = ((${x} * ${w}.x + ${y} * ${w}.y + ${z} * ${w}.z) / (${w}.x + ${w}.y + ${w}.z)) * ${formatFloat3(block.serialized["disableLevelMultiplication"] === true ? 1 : transform.level)};`
    );
    const result = { expr: sample, type: "vec4f" };
    stageState.memo.set(memoKey2, result);
    return result;
  }
  var OUTPUT2, emitter71;
  var init_triplanar_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/triplanar-block.ts"() {
      "use strict";
      OUTPUT2 = {
        rgba: { swizzle: "", type: "vec4f" },
        rgb: { swizzle: ".xyz", type: "vec3f" },
        r: { swizzle: ".x", type: "f32" },
        g: { swizzle: ".y", type: "f32" },
        b: { swizzle: ".z", type: "f32" },
        a: { swizzle: ".w", type: "f32" }
      };
      emitter71 = {
        className: "TriPlanarBlock",
        emit(block, outputName, stage, state, ctx) {
          if (outputName === "level") {
            const transform = textureTransform(block);
            return { expr: formatFloat3(transform.level), type: "f32" };
          }
          const sample = emitTriPlanarSample(block, stage, state, ctx);
          const out = OUTPUT2[outputName] ?? OUTPUT2.rgba;
          const serialized = block.serialized;
          const converted = applyColorSpace2(sample.expr, outputName, serialized.convertToLinearSpace === true, serialized.convertToGammaSpace === true);
          return { expr: converted === sample.expr ? `${sample.expr}${out.swizzle}` : converted, type: out.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/biplanar-block.ts
  var biplanar_block_exports = {};
  __export(biplanar_block_exports, {
    emitter: () => emitter72
  });
  function sanitize6(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
  }
  function bindingName2(block, inputName, ctx, fallback2) {
    const input = block.inputs.get(inputName);
    if (input?.source) {
      const producer = ctx.graph.blocks.get(input.source.blockId);
      return sanitize6(producer?.name || fallback2);
    }
    return sanitize6(fallback2);
  }
  function ensureBinding2(state, name) {
    if (!state.textures.find((t) => t.name === name)) {
      state.textures.push({ name, kind: "texture2d", texture: null });
    }
  }
  function applyColorSpace3(expr, outputName, convertToLinear, convertToGamma) {
    if (!convertToLinear && !convertToGamma) {
      return expr;
    }
    const power = convertToLinear ? "2.2" : "0.45454545";
    if (outputName === "rgba") {
      return `vec4<f32>(pow(max(${expr}.xyz, vec3<f32>(0.0)), vec3<f32>(${power})), ${expr}.w)`;
    }
    if (outputName === "rgb") {
      return `pow(max(${expr}.xyz, vec3<f32>(0.0)), vec3<f32>(${power}))`;
    }
    if (outputName === "r" || outputName === "g" || outputName === "b") {
      return `pow(max(${expr}${OUTPUT3[outputName].swizzle}, 0.0), ${power})`;
    }
    return expr;
  }
  function emitBiPlanarSample(block, stage, state, ctx) {
    if (stage !== "fragment") {
      throw new Error("BiPlanarBlock: texture projection is supported only in the fragment stage");
    }
    const stageState = state.fragment;
    const memoKey2 = `_biplanar_${block.id}_sample`;
    const memo = stageState.memo.get(memoKey2);
    if (memo) {
      return memo;
    }
    const baseName = sanitize6(block.name || `biPlanar${block.id}`);
    const texX = bindingName2(block, "source", ctx, baseName);
    const texY = bindingName2(block, "sourceY", ctx, texX);
    ensureBinding2(state, texX);
    ensureBinding2(state, texY);
    const position = ctx.cast(ctx.resolve(block, "position", stage, state), "vec3f");
    const normal = ctx.cast(ctx.resolve(block, "normal", stage, state), "vec3f");
    const sharpness = block.inputs.get("sharpness")?.source ? ctx.cast(ctx.resolve(block, "sharpness", stage, state), "f32").expr : "1.0";
    const temp = ctx.temp(state, "bi");
    const p = `_p${temp}`;
    const dx = `_dx${temp}`;
    const dy = `_dy${temp}`;
    const n = `_n${temp}`;
    const ma = `_ma${temp}`;
    const mi = `_mi${temp}`;
    const me = `_me${temp}`;
    const x = `_x${temp}`;
    const y = `_y${temp}`;
    const w = `_w${temp}`;
    const sample = `_sample${temp}`;
    stageState.body.push(`let ${p} = ${position.expr};`);
    stageState.body.push(`let ${dx} = dpdx(${p});`);
    stageState.body.push(`let ${dy} = dpdy(${p});`);
    stageState.body.push(`let ${n} = abs(${normal.expr});`);
    stageState.body.push(`var ${ma}: vec3<i32>;`);
    stageState.body.push(
      `if (${n}.x > ${n}.y && ${n}.x > ${n}.z) { ${ma} = vec3<i32>(0, 1, 2); } else if (${n}.y > ${n}.z) { ${ma} = vec3<i32>(1, 2, 0); } else { ${ma} = vec3<i32>(2, 0, 1); }`
    );
    stageState.body.push(`var ${mi}: vec3<i32>;`);
    stageState.body.push(
      `if (${n}.x < ${n}.y && ${n}.x < ${n}.z) { ${mi} = vec3<i32>(0, 1, 2); } else if (${n}.y < ${n}.z) { ${mi} = vec3<i32>(1, 2, 0); } else { ${mi} = vec3<i32>(2, 0, 1); }`
    );
    stageState.body.push(`let ${me} = vec3<i32>(3, 3, 3) - ${mi} - ${ma};`);
    stageState.body.push(
      `let ${x} = textureSampleGrad(nodeTex_${texX}, nodeSamp_${texX}, vec2<f32>(${p}[${ma}.y], ${p}[${ma}.z]), vec2<f32>(${dx}[${ma}.y], ${dx}[${ma}.z]), vec2<f32>(${dy}[${ma}.y], ${dy}[${ma}.z]));`
    );
    stageState.body.push(
      `let ${y} = textureSampleGrad(nodeTex_${texY}, nodeSamp_${texY}, vec2<f32>(${p}[${me}.y], ${p}[${me}.z]), vec2<f32>(${dx}[${me}.y], ${dx}[${me}.z]), vec2<f32>(${dy}[${me}.y], ${dy}[${me}.z]));`
    );
    stageState.body.push(`var ${w} = vec2<f32>(${n}[${ma}.x], ${n}[${me}.x]);`);
    stageState.body.push(`${w} = clamp((${w} - vec2<f32>(0.5773)) / vec2<f32>(1.0 - 0.5773), vec2<f32>(0.0), vec2<f32>(1.0));`);
    stageState.body.push(`${w} = pow(${w}, vec2<f32>(${sharpness} / 8.0));`);
    stageState.body.push(`let ${sample} = (${x} * ${w}.x + ${y} * ${w}.y) / (${w}.x + ${w}.y);`);
    const result = { expr: sample, type: "vec4f" };
    stageState.memo.set(memoKey2, result);
    return result;
  }
  var OUTPUT3, emitter72;
  var init_biplanar_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/biplanar-block.ts"() {
      "use strict";
      OUTPUT3 = {
        rgba: { swizzle: "", type: "vec4f" },
        rgb: { swizzle: ".xyz", type: "vec3f" },
        r: { swizzle: ".x", type: "f32" },
        g: { swizzle: ".y", type: "f32" },
        b: { swizzle: ".z", type: "f32" },
        a: { swizzle: ".w", type: "f32" }
      };
      emitter72 = {
        className: "BiPlanarBlock",
        emit(block, outputName, stage, state, ctx) {
          if (outputName === "level") {
            return { expr: "1.0", type: "f32" };
          }
          const sample = emitBiPlanarSample(block, stage, state, ctx);
          const out = OUTPUT3[outputName] ?? OUTPUT3.rgba;
          const serialized = block.serialized;
          const converted = applyColorSpace3(sample.expr, outputName, serialized.convertToLinearSpace === true, serialized.convertToGammaSpace === true);
          return { expr: converted === sample.expr ? `${sample.expr}${out.swizzle}` : converted, type: out.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/cloud-block.ts
  var cloud_block_exports = {};
  __export(cloud_block_exports, {
    emitter: () => emitter73
  });
  function optional(block, inputName, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    return input?.source ? ctx.resolve(block, inputName, stage, state) : null;
  }
  function scalarOffset(block, inputName, stage, state, ctx) {
    const value = optional(block, inputName, stage, state, ctx);
    return value ? ctx.cast(value, "f32").expr : null;
  }
  var emitter73;
  var init_cloud_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/cloud-block.ts"() {
      "use strict";
      emitter73 = {
        className: "CloudBlock",
        emit(block, _outputName, stage, state, ctx) {
          const seed = ctx.resolve(block, "seed", stage, state);
          if (seed.type !== "vec2f" && seed.type !== "vec3f") {
            throw new Error(`NodeMaterial: CloudBlock requires vec2 or vec3 seed; got ${seed.type}`);
          }
          state[stage].helpers.set(
            "nme_cloudNoise",
            `fn nme_cloudRandom(p: f32) -> f32 {
var temp = fract(p * 0.011);
temp *= temp + 7.5;
temp *= temp + temp;
return fract(temp);
}
fn nme_cloudNoise2(x: vec2<f32>, chaos: vec2<f32>) -> f32 {
let stepv = chaos * vec2<f32>(75.0, 120.0) + vec2<f32>(75.0, 120.0);
let i = floor(x);
let f = fract(x);
let n = dot(i, stepv);
let u = f * f * (vec2<f32>(3.0) - 2.0 * f);
return mix(mix(nme_cloudRandom(n + dot(stepv, vec2<f32>(0.0, 0.0))), nme_cloudRandom(n + dot(stepv, vec2<f32>(1.0, 0.0))), u.x), mix(nme_cloudRandom(n + dot(stepv, vec2<f32>(0.0, 1.0))), nme_cloudRandom(n + dot(stepv, vec2<f32>(1.0, 1.0))), u.x), u.y);
}
fn nme_cloudNoise3(x: vec3<f32>, chaos: vec3<f32>) -> f32 {
let stepv = chaos * vec3<f32>(60.0, 120.0, 75.0) + vec3<f32>(60.0, 120.0, 75.0);
let i = floor(x);
let f = fract(x);
let n = dot(i, stepv);
let u = f * f * (vec3<f32>(3.0) - 2.0 * f);
return mix(mix(mix(nme_cloudRandom(n + dot(stepv, vec3<f32>(0.0, 0.0, 0.0))), nme_cloudRandom(n + dot(stepv, vec3<f32>(1.0, 0.0, 0.0))), u.x), mix(nme_cloudRandom(n + dot(stepv, vec3<f32>(0.0, 1.0, 0.0))), nme_cloudRandom(n + dot(stepv, vec3<f32>(1.0, 1.0, 0.0))), u.x), u.y), mix(mix(nme_cloudRandom(n + dot(stepv, vec3<f32>(0.0, 0.0, 1.0))), nme_cloudRandom(n + dot(stepv, vec3<f32>(1.0, 0.0, 1.0))), u.x), mix(nme_cloudRandom(n + dot(stepv, vec3<f32>(0.0, 1.0, 1.0))), nme_cloudRandom(n + dot(stepv, vec3<f32>(1.0, 1.0, 1.0))), u.x), u.y), u.z);
}`
          );
          const octaves = Math.max(0, Math.trunc(typeof block.serialized.octaves === "number" ? block.serialized.octaves : 6));
          const helperKey = `nme_cloudFbm_${octaves}`;
          state[stage].helpers.set(
            helperKey,
            `fn nme_cloudFbm2_${octaves}(st: vec2<f32>, chaos: vec2<f32>) -> f32 {
var value = 0.0;
var amplitude = 0.5;
var tempST = st;
for (var i = 0; i < ${octaves}; i = i + 1) {
value += amplitude * nme_cloudNoise2(tempST, chaos);
tempST *= 2.0;
amplitude *= 0.5;
}
return value;
}
fn nme_cloudFbm3_${octaves}(x: vec3<f32>, chaos: vec3<f32>) -> f32 {
var value = 0.0;
var amplitude = 0.5;
var tempX = x;
for (var i = 0; i < ${octaves}; i = i + 1) {
value += amplitude * nme_cloudNoise3(tempX, chaos);
tempX *= 2.0;
amplitude *= 0.5;
}
return value;
}`
          );
          const st = ctx.temp(state, "cloudSeed");
          state[stage].body.push(`var ${st}: ${seed.type === "vec2f" ? "vec2<f32>" : "vec3<f32>"} = ${seed.expr};`);
          const offsetX = scalarOffset(block, "offsetX", stage, state, ctx);
          const offsetY = scalarOffset(block, "offsetY", stage, state, ctx);
          const offsetZ = scalarOffset(block, "offsetZ", stage, state, ctx);
          if (offsetX) {
            state[stage].body.push(`${st}.x += 0.1 * ${offsetX};`);
          }
          if (offsetY) {
            state[stage].body.push(`${st}.y += 0.1 * ${offsetY};`);
          }
          if (offsetZ && seed.type === "vec3f") {
            state[stage].body.push(`${st}.z += 0.1 * ${offsetZ};`);
          }
          const chaos = optional(block, "chaos", stage, state, ctx);
          const chaosExpr = chaos ? ctx.cast(chaos, seed.type).expr : seed.type === "vec2f" ? "vec2<f32>(0.0, 0.0)" : "vec3<f32>(0.0, 0.0, 0.0)";
          return { expr: seed.type === "vec2f" ? `nme_cloudFbm2_${octaves}(${st}, ${chaosExpr})` : `nme_cloudFbm3_${octaves}(${st}, ${chaosExpr})`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/simplex-perlin-3d-block.ts
  var simplex_perlin_3d_block_exports = {};
  __export(simplex_perlin_3d_block_exports, {
    emitter: () => emitter74
  });
  var emitter74;
  var init_simplex_perlin_3d_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/simplex-perlin-3d-block.ts"() {
      "use strict";
      emitter74 = {
        className: "SimplexPerlin3DBlock",
        emit(block, _outputName, stage, state, ctx) {
          const seed = ctx.cast(ctx.resolve(block, "seed", stage, state), "vec3f");
          state[stage].helpers.set(
            "nme_simplexPerlin3D",
            `fn nme_simplexPerlin3D(source: vec3<f32>) -> f32 {
let SKEWFACTOR = 1.0 / 3.0;
let UNSKEWFACTOR = 1.0 / 6.0;
let SIMPLEX_CORNER_POS = 0.5;
let SIMPLEX_TETRAHEDRON_HEIGHT = 0.7071067811865476;
var P = source;
if (P.x == 0.0 && P.y == 0.0 && P.z == 0.0) {
P.x = 0.00001;
}
P *= SIMPLEX_TETRAHEDRON_HEIGHT;
var Pi = floor(P + dot(P, vec3<f32>(SKEWFACTOR)));
let x0 = P - Pi + dot(Pi, vec3<f32>(UNSKEWFACTOR));
let g = step(x0.yzx, x0.xyz);
let l = vec3<f32>(1.0) - g;
var Pi_1 = min(g.xyz, l.zxy);
var Pi_2 = max(g.xyz, l.zxy);
let x1 = x0 - Pi_1 + vec3<f32>(UNSKEWFACTOR);
let x2 = x0 - Pi_2 + vec3<f32>(SKEWFACTOR);
let x3 = x0 - vec3<f32>(SIMPLEX_CORNER_POS);
let v1234_x = vec4<f32>(x0.x, x1.x, x2.x, x3.x);
let v1234_y = vec4<f32>(x0.y, x1.y, x2.y, x3.y);
let v1234_z = vec4<f32>(x0.z, x1.z, x2.z, x3.z);
Pi = Pi - floor(Pi * (1.0 / 69.0)) * 69.0;
let Pi_inc1 = step(Pi, vec3<f32>(69.0 - 1.5)) * (Pi + vec3<f32>(1.0));
var Pt = vec4<f32>(Pi.x, Pi.y, Pi_inc1.x, Pi_inc1.y) + vec4<f32>(50.0, 161.0, 50.0, 161.0);
Pt *= Pt;
let V1xy_V2xy = mix(vec4<f32>(Pt.x, Pt.y, Pt.x, Pt.y), vec4<f32>(Pt.z, Pt.w, Pt.z, Pt.w), vec4<f32>(Pi_1.x, Pi_1.y, Pi_2.x, Pi_2.y));
Pt = vec4<f32>(Pt.x, V1xy_V2xy.x, V1xy_V2xy.z, Pt.z) * vec4<f32>(Pt.y, V1xy_V2xy.y, V1xy_V2xy.w, Pt.w);
let SOMELARGEFLOATS = vec3<f32>(635.298681, 682.357502, 668.926525);
let ZINC = vec3<f32>(48.500388, 65.294118, 63.934599);
let lowz_mods = vec3<f32>(1.0) / (SOMELARGEFLOATS + Pi.zzz * ZINC);
let highz_mods = vec3<f32>(1.0) / (SOMELARGEFLOATS + Pi_inc1.zzz * ZINC);
Pi_1 = select(highz_mods, lowz_mods, Pi_1.z < 0.5);
Pi_2 = select(highz_mods, lowz_mods, Pi_2.z < 0.5);
let hash_0 = fract(Pt * vec4<f32>(lowz_mods.x, Pi_1.x, Pi_2.x, highz_mods.x)) - vec4<f32>(0.49999);
let hash_1 = fract(Pt * vec4<f32>(lowz_mods.y, Pi_1.y, Pi_2.y, highz_mods.y)) - vec4<f32>(0.49999);
let hash_2 = fract(Pt * vec4<f32>(lowz_mods.z, Pi_1.z, Pi_2.z, highz_mods.z)) - vec4<f32>(0.49999);
let grad_results = inverseSqrt(hash_0 * hash_0 + hash_1 * hash_1 + hash_2 * hash_2) * (hash_0 * v1234_x + hash_1 * v1234_y + hash_2 * v1234_z);
let FINAL_NORMALIZATION = 37.837227241611314;
var kernel_weights = v1234_x * v1234_x + v1234_y * v1234_y + v1234_z * v1234_z;
kernel_weights = max(vec4<f32>(0.5) - kernel_weights, vec4<f32>(0.0));
kernel_weights = kernel_weights * kernel_weights * kernel_weights;
return dot(kernel_weights, grad_results) * FINAL_NORMALIZATION;
}`
          );
          return { expr: `nme_simplexPerlin3D(${seed.expr})`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/voronoi-noise-block.ts
  var voronoi_noise_block_exports = {};
  __export(voronoi_noise_block_exports, {
    emitter: () => emitter75
  });
  var emitter75;
  var init_voronoi_noise_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/voronoi-noise-block.ts"() {
      "use strict";
      emitter75 = {
        className: "VoronoiNoiseBlock",
        emit(block, outputName, stage, state, ctx) {
          const seed = ctx.cast(ctx.resolve(block, "seed", stage, state), "vec2f");
          const offset = ctx.cast(ctx.resolve(block, "offset", stage, state), "f32");
          const density = ctx.cast(ctx.resolve(block, "density", stage, state), "f32");
          state[stage].helpers.set(
            "nme_voronoi",
            `fn nme_voronoiRandom(pIn: vec2<f32>) -> vec2<f32> {
let p = vec2<f32>(dot(pIn, vec2<f32>(127.1, 311.7)), dot(pIn, vec2<f32>(269.5, 183.3)));
return fract(sin(p) * 18.5453);
}
fn nme_voronoi(seed: vec2<f32>, offset: f32, density: f32) -> vec2<f32> {
let n = floor(seed * density);
let f = fract(seed * density);
var outValue = 0.0;
var cells = 0.0;
var m = vec3<f32>(8.0);
for (var j = -1; j <= 1; j = j + 1) {
for (var i = -1; i <= 1; i = i + 1) {
let g = vec2<f32>(f32(i), f32(j));
let o = nme_voronoiRandom(n + g);
let r = g - f + (vec2<f32>(0.5) + 0.5 * sin(vec2<f32>(offset) + 6.2831 * o));
let d = dot(r, r);
if (d < m.x) {
m = vec3<f32>(d, o);
outValue = m.x;
cells = m.y;
}
}
}
return vec2<f32>(outValue, cells);
}`
          );
          const temp = ctx.temp(state, "voronoi");
          state[stage].body.push(`let ${temp} = nme_voronoi(${seed.expr}, ${offset.expr}, ${density.expr});`);
          return { expr: outputName === "cells" ? `${temp}.y` : `${temp}.x`, type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/worley-noise-3d-block.ts
  var worley_noise_3d_block_exports = {};
  __export(worley_noise_3d_block_exports, {
    emitter: () => emitter76
  });
  var emitter76;
  var init_worley_noise_3d_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/worley-noise-3d-block.ts"() {
      "use strict";
      emitter76 = {
        className: "WorleyNoise3DBlock",
        emit(block, outputName, stage, state, ctx) {
          const seed = ctx.cast(ctx.resolve(block, "seed", stage, state), "vec3f");
          const jitter = ctx.cast(ctx.resolve(block, "jitter", stage, state), "f32");
          const manhattan = block.serialized.manhattanDistance === true ? "true" : "false";
          state[stage].helpers.set(
            "nme_worley3D",
            `fn nme_worleyPermuteScalar(x: f32) -> f32 {
return ((34.0 * x + 1.0) * x) - floor(((34.0 * x + 1.0) * x) / 289.0) * 289.0;
}
fn nme_worleyDistance(x: f32, y: f32, z: f32, manhattanDistance: bool) -> f32 {
return select(x * x + y * y + z * z, abs(x) + abs(y) + abs(z), manhattanDistance);
}
fn nme_worley(P: vec3<f32>, jitter: f32, manhattanDistance: bool) -> vec2<f32> {
let K = 0.142857142857;
let Ko = 0.428571428571;
let K2 = 0.020408163265306;
let Kz = 0.166666666667;
let Kzo = 0.416666666667;
let Pi = floor(P) - floor(floor(P) / 289.0) * 289.0;
let Pf = fract(P) - vec3<f32>(0.5);
var d1 = 100000.0;
var d2 = 100000.0;
for (var zi = -1; zi <= 1; zi = zi + 1) {
for (var yi = -1; yi <= 1; yi = yi + 1) {
for (var xi = -1; xi <= 1; xi = xi + 1) {
let p0 = nme_worleyPermuteScalar(Pi.x + f32(xi));
let p1 = nme_worleyPermuteScalar(p0 + Pi.y + f32(yi));
let p2 = nme_worleyPermuteScalar(p1 + Pi.z + f32(zi));
let ox = fract(p2 * K) - Ko;
let oy = (floor(p2 * K) - floor(floor(p2 * K) / 7.0) * 7.0) * K - Ko;
let oz = floor(p2 * K2) * Kz - Kzo;
let dx = Pf.x - f32(xi) + jitter * ox;
let dy = Pf.y - f32(yi) + jitter * oy;
let dz = Pf.z - f32(zi) + jitter * oz;
let d = nme_worleyDistance(dx, dy, dz, manhattanDistance);
if (d < d1) {
d2 = d1;
d1 = d;
} else if (d < d2) {
d2 = d;
}
}
}
}
return sqrt(vec2<f32>(d1, d2));
}`
          );
          const temp = ctx.temp(state, "worley");
          state[stage].body.push(`let ${temp} = nme_worley(${seed.expr}, ${jitter.expr}, ${manhattan});`);
          return { expr: outputName === "y" ? `${temp}.y` : outputName === "output" ? temp : `${temp}.x`, type: outputName === "output" ? "vec2f" : "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry-extra-procedural.ts
  var node_registry_extra_procedural_exports = {};
  __export(node_registry_extra_procedural_exports, {
    loadExtraEmitter: () => loadExtraEmitter2
  });
  function blockLoader2(key) {
    switch (key) {
      case "ColorMergerBlock":
        return () => Promise.resolve().then(() => (init_color_merger(), color_merger_exports));
      case "ColorConverterBlock":
        return () => Promise.resolve().then(() => (init_color_converter_block(), color_converter_block_exports));
      case "DesaturateBlock":
        return () => Promise.resolve().then(() => (init_desaturate_block(), desaturate_block_exports));
      case "GradientBlock":
        return () => Promise.resolve().then(() => (init_gradient_block(), gradient_block_exports));
      case "PosterizeBlock":
        return () => Promise.resolve().then(() => (init_posterize_block(), posterize_block_exports));
      case "ReplaceColorBlock":
        return () => Promise.resolve().then(() => (init_replace_color_block(), replace_color_block_exports));
      case "PannerBlock":
        return () => Promise.resolve().then(() => (init_panner_block(), panner_block_exports));
      case "Rotate2dBlock":
        return () => Promise.resolve().then(() => (init_rotate2d_block(), rotate2d_block_exports));
      case "TriPlanarBlock":
        return () => Promise.resolve().then(() => (init_triplanar_block(), triplanar_block_exports));
      case "BiPlanarBlock":
        return () => Promise.resolve().then(() => (init_biplanar_block(), biplanar_block_exports));
      case "CloudBlock":
        return () => Promise.resolve().then(() => (init_cloud_block(), cloud_block_exports));
      case "SimplexPerlin3DBlock":
        return () => Promise.resolve().then(() => (init_simplex_perlin_3d_block(), simplex_perlin_3d_block_exports));
      case "VoronoiNoiseBlock":
        return () => Promise.resolve().then(() => (init_voronoi_noise_block(), voronoi_noise_block_exports));
      case "WorleyNoise3DBlock":
        return () => Promise.resolve().then(() => (init_worley_noise_3d_block(), worley_noise_3d_block_exports));
      default:
        return null;
    }
  }
  async function loadExtraEmitter2(key) {
    const loader = blockLoader2(key);
    if (!loader) {
      throw new Error(`NodeMaterial: no procedural extension emitter registered for block "${key}"`);
    }
    return (await loader()).emitter;
  }
  var init_node_registry_extra_procedural = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry-extra-procedural.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/matrix-blocks.ts
  var matrix_blocks_exports = {};
  __export(matrix_blocks_exports, {
    emitter: () => emitter77
  });
  function optionalVec4(block, inputName, fallback2, stage, state, ctx) {
    const input = block.inputs.get(inputName);
    if (!input?.source) {
      return fallback2;
    }
    return ctx.cast(ctx.resolve(block, inputName, stage, state), "vec4f").expr;
  }
  function emitMatrixBuilder(block, stage, state, ctx) {
    const row0 = optionalVec4(block, "row0", "vec4<f32>(1.0, 0.0, 0.0, 0.0)", stage, state, ctx);
    const row1 = optionalVec4(block, "row1", "vec4<f32>(0.0, 1.0, 0.0, 0.0)", stage, state, ctx);
    const row2 = optionalVec4(block, "row2", "vec4<f32>(0.0, 0.0, 1.0, 0.0)", stage, state, ctx);
    const row3 = optionalVec4(block, "row3", "vec4<f32>(0.0, 0.0, 0.0, 1.0)", stage, state, ctx);
    return { expr: `mat4x4<f32>(${row0}, ${row1}, ${row2}, ${row3})`, type: "mat4f" };
  }
  var SPLIT_OUTPUT, emitter77;
  var init_matrix_blocks = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/matrix-blocks.ts"() {
      "use strict";
      SPLIT_OUTPUT = {
        row0: { expr: (input) => `(${input})[0]`, type: "vec4f" },
        row1: { expr: (input) => `(${input})[1]`, type: "vec4f" },
        row2: { expr: (input) => `(${input})[2]`, type: "vec4f" },
        row3: { expr: (input) => `(${input})[3]`, type: "vec4f" },
        col0: { expr: (input) => `vec4<f32>((${input})[0][0], (${input})[1][0], (${input})[2][0], (${input})[3][0])`, type: "vec4f" },
        col1: { expr: (input) => `vec4<f32>((${input})[0][1], (${input})[1][1], (${input})[2][1], (${input})[3][1])`, type: "vec4f" },
        col2: { expr: (input) => `vec4<f32>((${input})[0][2], (${input})[1][2], (${input})[2][2], (${input})[3][2])`, type: "vec4f" },
        col3: { expr: (input) => `vec4<f32>((${input})[0][3], (${input})[1][3], (${input})[2][3], (${input})[3][3])`, type: "vec4f" }
      };
      emitter77 = {
        className: "MatrixBlocks",
        emit(block, outputName, stage, state, ctx) {
          if (block.className === "MatrixBuilder") {
            return emitMatrixBuilder(block, stage, state, ctx);
          }
          const input = ctx.cast(ctx.resolve(block, "input", stage, state), "mat4f");
          if (block.className === "MatrixTransposeBlock") {
            return { expr: `transpose(${input.expr})`, type: "mat4f" };
          }
          if (block.className === "MatrixDeterminantBlock") {
            return { expr: `determinant(${input.expr})`, type: "f32" };
          }
          if (block.className === "MatrixSplitterBlock") {
            const output = SPLIT_OUTPUT[outputName];
            if (!output) {
              throw new Error(`NodeMaterial: MatrixSplitterBlock has no output "${outputName}"`);
            }
            return { expr: output.expr(input.expr), type: output.type };
          }
          throw new Error(`NodeMaterial: unsupported matrix block "${block.className}"`);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/derivative-block.ts
  var derivative_block_exports = {};
  __export(derivative_block_exports, {
    emitter: () => emitter78
  });
  var OUTPUT_FN, emitter78;
  var init_derivative_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/derivative-block.ts"() {
      "use strict";
      OUTPUT_FN = {
        dx: "dpdx",
        dy: "dpdy"
      };
      emitter78 = {
        className: "DerivativeBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          const fn = OUTPUT_FN[outputName];
          if (!fn) {
            throw new Error(`NodeMaterial: DerivativeBlock output "${outputName}" is not supported`);
          }
          const input = ctx.resolve(block, "input", stage, state);
          return { expr: `${fn}(${input.expr})`, type: input.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/height-to-normal-block.ts
  var height_to_normal_block_exports = {};
  __export(height_to_normal_block_exports, {
    emitter: () => emitter79
  });
  function boolLiteral(value, fallback2) {
    return (typeof value === "boolean" ? value : fallback2) ? "true" : "false";
  }
  function emitHeightNormal(block, stage, state, ctx) {
    const stageState = stage === "vertex" ? state.vertex : state.fragment;
    const memoKey2 = `_heightToNormal_${block.id}`;
    const existing = stageState.memo.get(memoKey2);
    if (existing) {
      return existing;
    }
    state.fragment.helpers.set(HELPER_KEY3, HELPER_WGSL4);
    const height = ctx.cast(ctx.resolve(block, "input", stage, state), "f32").expr;
    const pos = ctx.cast(ctx.resolve(block, "worldPosition", stage, state), "vec3f").expr;
    const normal = ctx.cast(ctx.resolve(block, "worldNormal", stage, state), "vec3f").expr;
    const tangentInput = block.inputs.get("worldTangent");
    const generateInWorldSpace = block.serialized.generateInWorldSpace === true;
    if (!generateInWorldSpace && !tangentInput?.source) {
      throw new Error(`NodeMaterial: HeightToNormalBlock "${block.name}" requires worldTangent when generateInWorldSpace is false`);
    }
    const tangent = tangentInput?.source ? ctx.cast(ctx.resolve(block, "worldTangent", stage, state), "vec3f").expr : "vec3<f32>(0.0)";
    const out = `_hn${ctx.temp(state, "heightNormal")}`;
    stageState.body.push(
      `let ${out} = nme_heightToNormal(${height}, ${pos}, ${tangent}, ${normal}, ${boolLiteral(block.serialized.generateInWorldSpace, false)}, ${boolLiteral(block.serialized.automaticNormalizationNormal, true)}, ${boolLiteral(block.serialized.automaticNormalizationTangent, true)});`
    );
    const result = { expr: out, type: "vec4f" };
    stageState.memo.set(memoKey2, result);
    return result;
  }
  var HELPER_KEY3, HELPER_WGSL4, emitter79;
  var init_height_to_normal_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/height-to-normal-block.ts"() {
      "use strict";
      HELPER_KEY3 = "nme_heightToNormal";
      HELPER_WGSL4 = `
fn nme_heightToNormal(height: f32, position: vec3<f32>, tangent: vec3<f32>, normal: vec3<f32>, generateInWorldSpace: bool, normalizeNormal: bool, normalizeTangent: bool) -> vec4<f32> {
    let norm = select(normal, normalize(normal), normalizeNormal);
    let tgt = select(tangent, normalize(tangent), normalizeTangent);
    let worlddX = dpdx(position);
    let worlddY = dpdy(position);
    let crossX = cross(norm, worlddX);
    let crossY = cross(worlddY, norm);
    let d = abs(dot(crossY, worlddX));
    var inToNormal = (((height + dpdx(height)) - height) * crossY + ((height + dpdy(height)) - height) * crossX) * sign(d);
    inToNormal.y = -inToNormal.y;
    var result = normalize(d * norm - inToNormal);
    if (!generateInWorldSpace) {
        let biTangent = cross(norm, tgt);
        let tbn = mat3x3<f32>(tgt, biTangent, norm);
        result = tbn * result;
        result = result * vec3<f32>(0.5) + vec3<f32>(0.5);
    }
    return vec4<f32>(result, 0.0);
}
`;
      emitter79 = {
        className: "HeightToNormalBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          const value = emitHeightNormal(block, stage, state, ctx);
          if (outputName === "xyz") {
            return { expr: `${value.expr}.xyz`, type: "vec3f" };
          }
          return value;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/tbn-block.ts
  var tbn_block_exports = {};
  __export(tbn_block_exports, {
    emitter: () => emitter80
  });
  function emitTbnRows(block, stage, state, ctx) {
    const stageState = stage === "vertex" ? state.vertex : state.fragment;
    const memoKey2 = `_tbn_${block.id}`;
    const existing = stageState.memo.get(memoKey2);
    if (existing) {
      return existing;
    }
    const normal = ctx.cast(ctx.resolve(block, "normal", stage, state), "vec3f").expr;
    const tangent = ctx.cast(ctx.resolve(block, "tangent", stage, state), "vec4f").expr;
    const world = ctx.cast(ctx.resolve(block, "world", stage, state), "mat4f").expr;
    const prefix = `_tbn${ctx.temp(state, "tbn")}`;
    stageState.body.push(`let ${prefix}_normal = normalize(${normal});`);
    stageState.body.push(`let ${prefix}_tangent = normalize((${tangent}).xyz);`);
    stageState.body.push(`let ${prefix}_bitangent = cross(${prefix}_normal, ${prefix}_tangent) * (${tangent}).w;`);
    stageState.body.push(
      `let ${prefix}_mat = mat3x3<f32>((${world})[0].xyz, (${world})[1].xyz, (${world})[2].xyz) * mat3x3<f32>(${prefix}_tangent, ${prefix}_bitangent, ${prefix}_normal);`
    );
    stageState.body.push(`let ${prefix}_rows = vec4<f32>(${prefix}_mat[0][0], ${prefix}_mat[1][1], ${prefix}_mat[2][2], 0.0);`);
    const result = { expr: `${prefix}_rows`, type: "vec4f" };
    stageState.memo.set(memoKey2, result);
    return result;
  }
  var emitter80;
  var init_tbn_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/tbn-block.ts"() {
      "use strict";
      emitter80 = {
        className: "TBNBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          if (outputName === "TBN") {
            throw new Error("NodeMaterial: TBNBlock object output is not supported; use row0/row1/row2 outputs");
          }
          const rows = emitTbnRows(block, stage, state, ctx).expr;
          if (outputName === "row1") {
            return { expr: `vec3<f32>(0.0, (${rows}).y, 0.0)`, type: "vec3f" };
          }
          if (outputName === "row2") {
            return { expr: `vec3<f32>(0.0, 0.0, (${rows}).z)`, type: "vec3f" };
          }
          return { expr: `vec3<f32>((${rows}).x, 0.0, 0.0)`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/normal-blend-block.ts
  var normal_blend_block_exports = {};
  __export(normal_blend_block_exports, {
    emitter: () => emitter81
  });
  function emitBlend(block, stage, state, ctx) {
    const stageState = stage === "vertex" ? state.vertex : state.fragment;
    const memoKey2 = `_normalBlend_${block.id}`;
    const existing = stageState.memo.get(memoKey2);
    if (existing) {
      return existing;
    }
    const n0 = ctx.cast(ctx.resolve(block, "normalMap0", stage, state), "vec3f").expr;
    const n1 = ctx.cast(ctx.resolve(block, "normalMap1", stage, state), "vec3f").expr;
    const out = `_nb${ctx.temp(state, "normalBlend")}`;
    stageState.body.push(`let ${out}_stepR = step(0.5, (${n0}).r);`);
    stageState.body.push(`let ${out}_stepG = step(0.5, (${n0}).g);`);
    stageState.body.push(
      `let ${out} = vec3<f32>((1.0 - ${out}_stepR) * (${n0}).r * (${n1}).r * 2.0 + ${out}_stepR * (1.0 - (1.0 - (${n0}).r) * (1.0 - (${n1}).r) * 2.0), (1.0 - ${out}_stepG) * (${n0}).g * (${n1}).g * 2.0 + ${out}_stepG * (1.0 - (1.0 - (${n0}).g) * (1.0 - (${n1}).g) * 2.0), (${n0}).b * (${n1}).b);`
    );
    const result = { expr: out, type: "vec3f" };
    stageState.memo.set(memoKey2, result);
    return result;
  }
  var emitter81;
  var init_normal_blend_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/normal-blend-block.ts"() {
      "use strict";
      emitter81 = {
        className: "NormalBlendBlock",
        emit(block, _outputName, stage, state, ctx) {
          return emitBlend(block, stage, state, ctx);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/ambient-occlusion-block.ts
  var ambient_occlusion_block_exports = {};
  __export(ambient_occlusion_block_exports, {
    emitter: () => emitter82
  });
  function sanitize7(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
  }
  function num(value, fallback2) {
    return typeof value === "number" ? `${value}` : `${fallback2}`;
  }
  var HELPER_KEY4, HELPER_WGSL5, emitter82;
  var init_ambient_occlusion_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/ambient-occlusion-block.ts"() {
      "use strict";
      HELPER_KEY4 = "nme_ambientOcclusion";
      HELPER_WGSL5 = `
fn nme_aoNormalFromDepth(depthTex: texture_2d<f32>, depthSamp: sampler, depth: f32, coords: vec2<f32>, radius: f32) -> vec3<f32> {
    let offset1 = vec2<f32>(0.0, radius);
    let offset2 = vec2<f32>(radius, 0.0);
    let depth1 = textureSampleLevel(depthTex, depthSamp, coords + offset1, 0.0).r;
    let depth2 = textureSampleLevel(depthTex, depthSamp, coords + offset2, 0.0).r;
    let p1 = vec3<f32>(offset1, depth1 - depth);
    let p2 = vec3<f32>(offset2, depth2 - depth);
    var normal = cross(p1, p2);
    normal.z = -normal.z;
    return normalize(normal);
}

fn nme_aoRandom(uv: vec2<f32>) -> vec3<f32> {
    let x = fract(sin(dot(uv, vec2<f32>(12.9898, 78.233))) * 43758.5453);
    let y = fract(sin(dot(uv, vec2<f32>(39.3468, 11.135))) * 24634.6345);
    let z = fract(sin(dot(uv, vec2<f32>(73.156, 52.235))) * 12414.2347);
    return normalize(vec3<f32>(x, y, z));
}

fn nme_computeAo(depthTex: texture_2d<f32>, depthSamp: sampler, fragCoord: vec4<f32>, screenSize: vec2<f32>, radius: f32, area: f32, fallOff: f32) -> f32 {
    let uv = fragCoord.xy / screenSize;
    let random = nme_aoRandom(uv * 4.0);
    let depth = textureSampleLevel(depthTex, depthSamp, uv, 0.0).r;
    let position = vec3<f32>(uv, depth);
    let normal = nme_aoNormalFromDepth(depthTex, depthSamp, depth, uv, radius);
    let radiusDepth = radius / depth;
    let sampleSphere = array<vec3<f32>, 16>(
        vec3<f32>(0.5381, 0.1856, -0.4319), vec3<f32>(0.1379, 0.2486, 0.4430), vec3<f32>(0.3371, 0.5679, -0.0057), vec3<f32>(-0.6999, -0.0451, -0.0019),
        vec3<f32>(0.0689, -0.1598, -0.8547), vec3<f32>(0.0560, 0.0069, -0.1843), vec3<f32>(-0.0146, 0.1402, 0.0762), vec3<f32>(0.0100, -0.1924, -0.0344),
        vec3<f32>(-0.3577, -0.5301, -0.4358), vec3<f32>(-0.3169, 0.1063, 0.0158), vec3<f32>(0.0103, -0.5869, 0.0046), vec3<f32>(-0.0897, -0.4940, 0.3287),
        vec3<f32>(0.7119, -0.0154, -0.0918), vec3<f32>(-0.0533, 0.0596, -0.5411), vec3<f32>(0.0352, -0.0631, 0.5460), vec3<f32>(-0.4776, 0.2847, -0.0271)
    );
    var occlusion = 0.0;
    for (var i = 0; i < 16; i = i + 1) {
        let ray = radiusDepth * reflect(sampleSphere[i], random);
        let hemiRay = position + sign(dot(ray, normal)) * ray;
        let occlusionDepth = textureSample(depthTex, depthSamp, clamp(hemiRay.xy, vec2<f32>(0.001), vec2<f32>(0.999))).r;
        let difference = depth - occlusionDepth;
        occlusion += step(fallOff, difference) * (1.0 - smoothstep(fallOff, area, difference));
    }
    return clamp(1.0 - occlusion / 16.0, 0.0, 1.0);
}
`;
      emitter82 = {
        className: "AmbientOcclusionBlock",
        stage: "fragment",
        emit(block, _outputName, stage, state, ctx) {
          const source = block.inputs.get("source")?.source;
          if (!source) {
            throw new Error(`NodeMaterial: AmbientOcclusionBlock "${block.name}" requires an ImageSourceBlock source`);
          }
          const producer = ctx.graph.blocks.get(source.blockId);
          const bindingName3 = sanitize7(producer?.name || `ao${block.id}`);
          if (!state.textures.find((t) => t.name === bindingName3)) {
            state.textures.push({ name: bindingName3, kind: "texture2d", texture: null });
          }
          state.fragment.helpers.set(HELPER_KEY4, HELPER_WGSL5);
          const screenSize = ctx.cast(ctx.resolve(block, "screenSize", stage, state), "vec2f").expr;
          return {
            expr: `nme_computeAo(nodeTex_${bindingName3}, nodeSamp_${bindingName3}, _NME_FRAG_COORD_, ${screenSize}, ${num(block.serialized.radius, 1e-4)}, ${num(block.serialized.area, 75e-4)}, ${num(block.serialized.fallOff, 1e-6)})`,
            type: "f32"
          };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/frag-coord-block.ts
  var frag_coord_block_exports = {};
  __export(frag_coord_block_exports, {
    emitter: () => emitter83
  });
  var OUTPUTS2, emitter83;
  var init_frag_coord_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/frag-coord-block.ts"() {
      "use strict";
      OUTPUTS2 = {
        xyzw: { swizzle: "", type: "vec4f" },
        xyz: { swizzle: ".xyz", type: "vec3f" },
        xy: { swizzle: ".xy", type: "vec2f" },
        x: { swizzle: ".x", type: "f32" },
        y: { swizzle: ".y", type: "f32" },
        z: { swizzle: ".z", type: "f32" },
        w: { swizzle: ".w", type: "f32" }
      };
      emitter83 = {
        className: "FragCoordBlock",
        stage: "fragment",
        emit(_block, outputName, _stage, state) {
          state.usesScreenSize = true;
          const out = OUTPUTS2[outputName];
          if (!out) {
            throw new Error(`NodeMaterial: FragCoordBlock has no output "${outputName}"`);
          }
          return { expr: `vec4<f32>(_NME_FRAG_COORD_.x, _NME_SCREEN_SIZE_.y - _NME_FRAG_COORD_.y, 1.0 - _NME_FRAG_COORD_.z, _NME_FRAG_COORD_.w)${out.swizzle}`, type: out.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/screen-size-block.ts
  var screen_size_block_exports = {};
  __export(screen_size_block_exports, {
    emitter: () => emitter84
  });
  var OUTPUTS3, emitter84;
  var init_screen_size_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/screen-size-block.ts"() {
      "use strict";
      OUTPUTS3 = {
        xy: { swizzle: "", type: "vec2f" },
        x: { swizzle: ".x", type: "f32" },
        y: { swizzle: ".y", type: "f32" }
      };
      emitter84 = {
        className: "ScreenSizeBlock",
        stage: "fragment",
        emit(_block, outputName, _stage, state) {
          state.usesScreenSize = true;
          const out = OUTPUTS3[outputName];
          if (!out) {
            throw new Error(`NodeMaterial: ScreenSizeBlock has no output "${outputName}"`);
          }
          return { expr: `_NME_SCREEN_SIZE_${out.swizzle}`, type: out.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/screen-space-block.ts
  var screen_space_block_exports = {};
  __export(screen_space_block_exports, {
    emitter: () => emitter85
  });
  var OUTPUTS4, emitter85;
  var init_screen_space_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/screen-space-block.ts"() {
      "use strict";
      OUTPUTS4 = {
        output: { swizzle: ".xy", type: "vec2f" },
        x: { swizzle: ".x", type: "f32" },
        y: { swizzle: ".y", type: "f32" }
      };
      emitter85 = {
        className: "ScreenSpaceBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          const vectorRaw = ctx.resolve(block, "vector", stage, state);
          const vector = vectorRaw.type === "vec4f" ? vectorRaw : ctx.cast(vectorRaw, "vec3f");
          const wvp = ctx.cast(ctx.resolve(block, "worldViewProjection", stage, state), "mat4f");
          const clip = ctx.temp(state, "screenClip");
          const uv = ctx.temp(state, "screenUv");
          const vectorExpr = vector.type === "vec4f" ? vector.expr : `vec4<f32>(${vector.expr}, 1.0)`;
          state.fragment.body.push(`let ${clip} = ${wvp.expr} * ${vectorExpr};`);
          state.fragment.body.push(`let ${uv} = (${clip}.xy / ${clip}.w) * 0.5 + vec2<f32>(0.5, 0.5);`);
          const out = OUTPUTS4[outputName];
          if (!out) {
            throw new Error(`NodeMaterial: ScreenSpaceBlock has no output "${outputName}"`);
          }
          return { expr: `${uv}${out.swizzle}`, type: out.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/twirl-block.ts
  var twirl_block_exports = {};
  __export(twirl_block_exports, {
    emitter: () => emitter86
  });
  function defaultVec2(expr) {
    return { expr, type: "vec2f" };
  }
  function defaultF32(expr) {
    return { expr, type: "f32" };
  }
  var OUTPUTS5, emitter86;
  var init_twirl_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/twirl-block.ts"() {
      "use strict";
      OUTPUTS5 = {
        output: { swizzle: "", type: "vec2f" },
        x: { swizzle: ".x", type: "f32" },
        y: { swizzle: ".y", type: "f32" }
      };
      emitter86 = {
        className: "TwirlBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          const input = ctx.cast(ctx.resolve(block, "input", stage, state), "vec2f");
          const strength = ctx.cast(block.inputs.get("strength")?.source ? ctx.resolve(block, "strength", stage, state) : defaultF32("1.0"), "f32");
          const center = ctx.cast(block.inputs.get("center")?.source ? ctx.resolve(block, "center", stage, state) : defaultVec2("vec2<f32>(0.5, 0.5)"), "vec2f");
          const offset = ctx.cast(block.inputs.get("offset")?.source ? ctx.resolve(block, "offset", stage, state) : defaultVec2("vec2<f32>(0.0, 0.0)"), "vec2f");
          const delta = ctx.temp(state, "twirlDelta");
          const angle = ctx.temp(state, "twirlAngle");
          const result = ctx.temp(state, "twirl");
          state.fragment.body.push(`let ${delta} = ${input.expr} - ${center.expr};`);
          state.fragment.body.push(`let ${angle} = ${strength.expr} * length(${delta});`);
          state.fragment.body.push(
            `let ${result} = vec2<f32>(cos(${angle}) * ${delta}.x - sin(${angle}) * ${delta}.y, sin(${angle}) * ${delta}.x + cos(${angle}) * ${delta}.y) + ${center.expr} + ${offset.expr};`
          );
          const out = OUTPUTS5[outputName];
          if (!out) {
            throw new Error(`NodeMaterial: TwirlBlock has no output "${outputName}"`);
          }
          return { expr: `${result}${out.swizzle}`, type: out.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/frag-depth-block.ts
  var frag_depth_block_exports = {};
  __export(frag_depth_block_exports, {
    emitter: () => emitter87
  });
  var emitter87;
  var init_frag_depth_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/frag-depth-block.ts"() {
      "use strict";
      emitter87 = {
        className: "FragDepthBlock",
        stage: "fragment",
        sideEffect: true,
        emit(block, _outputName, stage, state, ctx) {
          const memoKey2 = `${block.id}|fragDepth`;
          const existing = state.fragment.memo.get(memoKey2);
          if (existing) {
            return existing;
          }
          state.usesFragDepth = true;
          const depthConn = block.inputs.get("depth");
          if (depthConn?.source) {
            const depth = ctx.cast(ctx.resolve(block, "depth", stage, state), "f32");
            state.fragment.body.push(`_NME_FRAG_DEPTH_ = 1.0 - (${depth.expr});`);
          } else if (block.inputs.get("worldPos")?.source && block.inputs.get("viewProjection")?.source) {
            const worldPos = ctx.cast(ctx.resolve(block, "worldPos", stage, state), "vec4f");
            const viewProjection = ctx.cast(ctx.resolve(block, "viewProjection", stage, state), "mat4f");
            const p = ctx.temp(state, "fragDepthP");
            state.fragment.body.push(`let ${p} = ${viewProjection.expr} * ${worldPos.expr};`);
            state.fragment.body.push(`_NME_FRAG_DEPTH_ = ${p}.z / ${p}.w;`);
          } else {
            throw new Error("NodeMaterial: FragDepthBlock requires `depth` or both `worldPos` and `viewProjection` inputs");
          }
          const result = { expr: "_NME_FRAG_DEPTH_", type: "f32" };
          state.fragment.memo.set(memoKey2, result);
          return result;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry-extra-advanced.ts
  var node_registry_extra_advanced_exports = {};
  __export(node_registry_extra_advanced_exports, {
    loadExtraEmitter: () => loadExtraEmitter3
  });
  function matrixBlocks() {
    return Promise.resolve().then(() => (init_matrix_blocks(), matrix_blocks_exports));
  }
  function blockLoader3(key) {
    switch (key) {
      case "DerivativeBlock":
        return () => Promise.resolve().then(() => (init_derivative_block(), derivative_block_exports));
      case "HeightToNormalBlock":
        return () => Promise.resolve().then(() => (init_height_to_normal_block(), height_to_normal_block_exports));
      case "TBNBlock":
        return () => Promise.resolve().then(() => (init_tbn_block(), tbn_block_exports));
      case "NormalBlendBlock":
        return () => Promise.resolve().then(() => (init_normal_blend_block(), normal_blend_block_exports));
      case "AmbientOcclusionBlock":
        return () => Promise.resolve().then(() => (init_ambient_occlusion_block(), ambient_occlusion_block_exports));
      case "FragCoordBlock":
        return () => Promise.resolve().then(() => (init_frag_coord_block(), frag_coord_block_exports));
      case "ScreenSizeBlock":
        return () => Promise.resolve().then(() => (init_screen_size_block(), screen_size_block_exports));
      case "ScreenSpaceBlock":
        return () => Promise.resolve().then(() => (init_screen_space_block(), screen_space_block_exports));
      case "TwirlBlock":
        return () => Promise.resolve().then(() => (init_twirl_block(), twirl_block_exports));
      case "FragDepthBlock":
        return () => Promise.resolve().then(() => (init_frag_depth_block(), frag_depth_block_exports));
      case "MatrixBuilder":
      case "MatrixSplitterBlock":
      case "MatrixTransposeBlock":
      case "MatrixDeterminantBlock":
        return matrixBlocks;
      default:
        return null;
    }
  }
  async function loadExtraEmitter3(key) {
    const loader = blockLoader3(key);
    if (!loader) {
      throw new Error(`NodeMaterial: no advanced extension emitter registered for block "${key}"`);
    }
    return (await loader()).emitter;
  }
  var init_node_registry_extra_advanced = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry-extra-advanced.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/elbow-block.ts
  var elbow_block_exports = {};
  __export(elbow_block_exports, {
    emitter: () => emitter88
  });
  var emitter88;
  var init_elbow_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/elbow-block.ts"() {
      "use strict";
      emitter88 = {
        className: "ElbowBlock",
        emit(block, _outputName, stage, state, ctx) {
          return ctx.resolve(block, "input", stage, state);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/teleport-in-block.ts
  var teleport_in_block_exports = {};
  __export(teleport_in_block_exports, {
    emitter: () => emitter89
  });
  var emitter89;
  var init_teleport_in_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/teleport-in-block.ts"() {
      "use strict";
      emitter89 = {
        className: "NodeMaterialTeleportInBlock",
        emit(block, _outputName, stage, state, ctx) {
          return ctx.resolve(block, "input", stage, state);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/teleport-out-block.ts
  var teleport_out_block_exports = {};
  __export(teleport_out_block_exports, {
    emitter: () => emitter90
  });
  var emitter90;
  var init_teleport_out_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/teleport-out-block.ts"() {
      "use strict";
      emitter90 = {
        className: "NodeMaterialTeleportOutBlock",
        emit(block, _outputName, stage, state, ctx) {
          const entryPoint = block.serialized["entryPoint"];
          const entryPointId = typeof entryPoint === "number" ? entryPoint : typeof entryPoint === "string" && entryPoint.length > 0 ? Number(entryPoint) : NaN;
          if (!Number.isFinite(entryPointId)) {
            throw new Error(`NodeMaterial: TeleportOutBlock (id=${block.id}) has no entryPoint`);
          }
          const entryBlock = ctx.graph.blocks.get(entryPointId);
          if (!entryBlock || entryBlock.className !== "NodeMaterialTeleportInBlock") {
            throw new Error(`NodeMaterial: TeleportOutBlock (id=${block.id}) points to missing TeleportInBlock ${entryPointId}`);
          }
          return ctx.resolve(entryBlock, "input", stage, state);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/debug-block.ts
  var debug_block_exports = {};
  __export(debug_block_exports, {
    emitter: () => emitter91
  });
  var emitter91;
  var init_debug_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/debug-block.ts"() {
      "use strict";
      emitter91 = {
        className: "NodeMaterialDebugBlock",
        emit(block, _outputName, stage, state, ctx) {
          const input = block.inputs.get("debug");
          if (!input?.source) {
            return { expr: "0.0", type: "f32" };
          }
          return ctx.resolve(block, "debug", stage, state);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/mesh-attribute-exists-block.ts
  var mesh_attribute_exists_block_exports = {};
  __export(mesh_attribute_exists_block_exports, {
    emitter: () => emitter92
  });
  function attributeFlag(attributeType) {
    switch (attributeType) {
      case 1:
        return "1.0";
      case 2:
        return "meshU.receivesShadow.z";
      case 3:
        return "meshU.receivesShadow.w";
      case 4:
        return "meshU.receivesShadow.y";
      case 5:
        return "0.0";
      case 6:
      // UV3
      case 7:
      // UV4
      case 8:
      // UV5
      case 9:
        return "0.0";
      default:
        return null;
    }
  }
  var emitter92;
  var init_mesh_attribute_exists_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/mesh-attribute-exists-block.ts"() {
      "use strict";
      emitter92 = {
        className: "MeshAttributeExistsBlock",
        emit(block, _outputName, stage, state, ctx) {
          state.usesMeshAttributeExists = true;
          const input = ctx.resolve(block, "input", stage, state);
          const flag = attributeFlag(block.serialized["attributeType"] ?? 0);
          if (flag === null) {
            return input;
          }
          const fallback2 = ctx.cast(ctx.resolve(block, "fallback", stage, state), input.type);
          const expr = ctx.temp(state, "attr");
          const s = stage === "vertex" ? state.vertex : state.fragment;
          s.body.push(`let ${expr} = select(${fallback2.expr}, ${input.expr}, ${flag} > 0.5);`);
          return { expr, type: input.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/clip-planes-block.ts
  var clip_planes_block_exports = {};
  __export(clip_planes_block_exports, {
    emitter: () => emitter93
  });
  var emitter93;
  var init_clip_planes_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/clip-planes-block.ts"() {
      "use strict";
      emitter93 = {
        className: "ClipPlanesBlock",
        stage: "vertex",
        sideEffect: true,
        emit(block, _outputName, _stage, state, ctx) {
          state.usesClipPlanes = true;
          const memoKey2 = `_clip_${block.id}`;
          if (!state.vertex.memo.has(memoKey2)) {
            const worldPosition = ctx.cast(ctx.resolve(block, "worldPosition", "vertex", state), "vec4f");
            if (!state.varyings.find((v) => v._name === "vClipDistance")) {
              state.varyings.push({ _name: "vClipDistance", _type: "f32" });
            }
            state.vertex.body.push(`out.vClipDistance = dot(${worldPosition.expr}, sceneU.clipPlane);`);
            state.vertex.memo.set(memoKey2, { expr: "out.vClipDistance", type: "f32" });
          }
          if (!state.fragment.memo.has(memoKey2)) {
            state.fragment.body.push(`if (in.vClipDistance > 0.0) { discard; }`);
            state.fragment.memo.set(memoKey2, { expr: "in.vClipDistance", type: "f32" });
          }
          return { expr: "0.0", type: "f32" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reflection-texture-base-block.ts
  var reflection_texture_base_block_exports = {};
  __export(reflection_texture_base_block_exports, {
    emitter: () => emitter94
  });
  var emitter94;
  var init_reflection_texture_base_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/reflection-texture-base-block.ts"() {
      "use strict";
      emitter94 = {
        className: "ReflectionTextureBaseBlock",
        emit(block) {
          throw new Error(`ReflectionTextureBaseBlock "${block.name}" is an abstract compatibility block and cannot be emitted directly.`);
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/image-processing-block.ts
  var image_processing_block_exports = {};
  __export(image_processing_block_exports, {
    emitter: () => emitter95
  });
  function imageProcessingHelper(convertInputToLinearSpace) {
    const linearize = convertInputToLinearSpace ? `rgb = pow(max(rgb, vec3<f32>(0.0)), vec3<f32>(2.2));` : ``;
    return `fn nme_apply_image_processing(inputColor: vec4<f32>) -> vec4<f32> {
    var rgb = inputColor.rgb;
    ${linearize}
    rgb = rgb * sceneU.vImageInfos.x;
    if (sceneU.vImageInfos.w > 0.5) {
        rgb = 1.0 - exp2(-1.590579 * rgb);
    }
    rgb = pow(max(rgb, vec3<f32>(0.0)), vec3<f32>(0.45454545));
    rgb = clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0));
    let highContrast = rgb * rgb * (vec3<f32>(3.0) - rgb * 2.0);
    if (sceneU.vImageInfos.y < 1.0) {
        rgb = mix(vec3<f32>(0.5), rgb, sceneU.vImageInfos.y);
    } else {
        rgb = mix(rgb, highContrast, sceneU.vImageInfos.y - 1.0);
    }
    return vec4<f32>(max(rgb, vec3<f32>(0.0)), inputColor.a);
}`;
  }
  var emitter95;
  var init_image_processing_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/image-processing-block.ts"() {
      "use strict";
      emitter95 = {
        className: "ImageProcessingBlock",
        stage: "fragment",
        emit(block, outputName, stage, state, ctx) {
          const convertInput = block.serialized.convertInputToLinearSpace !== false;
          const helperKey = `nme_image_processing_${convertInput ? "linear" : "as_is"}`;
          state.fragment.helpers.set(helperKey, imageProcessingHelper(convertInput));
          const color = ctx.cast(ctx.resolve(block, "color", stage, state), "vec4f");
          const t = ctx.temp(state, "ip");
          state.fragment.body.push(`let ${t} = nme_apply_image_processing(${color.expr});`);
          if (outputName === "rgb") {
            return { expr: `${t}.rgb`, type: "vec3f" };
          }
          return { expr: t, type: "vec4f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/iridescence-block.ts
  var iridescence_block_exports = {};
  __export(iridescence_block_exports, {
    emitter: () => emitter96
  });
  var IRIDESCENCE_HELPERS, emitter96;
  var init_iridescence_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/iridescence-block.ts"() {
      "use strict";
      IRIDESCENCE_HELPERS = `const NME_PBR_XYZ_TO_REC709: mat3x3<f32> = mat3x3<f32>(
    3.2404542, -0.9692660, 0.0556434,
    -1.5371385, 1.8760108, -0.2040259,
    -0.4985314, 0.0415560, 1.0572252
);
fn nme_pbr_square3(x: vec3<f32>) -> vec3<f32> { return x * x; }
fn nme_pbr_iorFromAirF0(f0: vec3<f32>) -> vec3<f32> {
    let s = sqrt(clamp(f0, vec3<f32>(0.0), vec3<f32>(0.9999)));
    return (vec3<f32>(1.0) + s) / (vec3<f32>(1.0) - s);
}
fn nme_pbr_r0FromIor3(iorT: vec3<f32>, iorI: f32) -> vec3<f32> { return nme_pbr_square3((iorT - vec3<f32>(iorI)) / (iorT + vec3<f32>(iorI))); }
fn nme_pbr_r0FromIor(iorT: f32, iorI: f32) -> f32 { let r = (iorT - iorI) / (iorT + iorI); return r * r; }
fn nme_pbr_evalSensitivity(opd: f32, shift: vec3<f32>) -> vec3<f32> {
    let phase = 6.283185307179586 * opd * 1.0e-9;
    let val = vec3<f32>(5.4856e-13, 4.4201e-13, 5.2481e-13);
    let pos = vec3<f32>(1.6810e+06, 1.7953e+06, 2.2084e+06);
    let vr = vec3<f32>(4.3278e+09, 9.3046e+09, 6.6121e+09);
    var xyz = val * sqrt(6.283185307179586 * vr) * cos(pos * phase + shift) * exp(-(phase * phase) * vr);
    xyz.x = xyz.x + 9.7470e-14 * sqrt(6.283185307179586 * 4.5282e+09) * cos(2.2399e+06 * phase + shift.x) * exp(-4.5282e+09 * phase * phase);
    xyz = xyz / 1.0685e-7;
    return NME_PBR_XYZ_TO_REC709 * xyz;
}
fn nme_pbr_evalIridescence(outsideIor: f32, eta2: f32, cosTheta1: f32, thickness: f32, baseF0: vec3<f32>) -> vec3<f32> {
    let iridescenceIor = mix(outsideIor, eta2, smoothstep(0.0, 0.03, thickness));
    let sinTheta2Sq = ((outsideIor / iridescenceIor) * (outsideIor / iridescenceIor)) * (1.0 - cosTheta1 * cosTheta1);
    let cosTheta2Sq = 1.0 - sinTheta2Sq;
    if (cosTheta2Sq < 0.0) { return vec3<f32>(1.0); }
    let cosTheta2 = sqrt(cosTheta2Sq);
    let r0 = nme_pbr_r0FromIor(iridescenceIor, outsideIor);
    let r12 = nme_pbr_fresSchlick(cosTheta1, vec3<f32>(r0), vec3<f32>(1.0)).x;
    let t121 = 1.0 - r12;
    var phi12 = 0.0;
    if (iridescenceIor < outsideIor) { phi12 = 3.141592653589793; }
    let phi21 = 3.141592653589793 - phi12;
    let baseIor = nme_pbr_iorFromAirF0(baseF0);
    let r1 = nme_pbr_r0FromIor3(baseIor, iridescenceIor);
    let r23 = nme_pbr_fresSchlick(cosTheta2, r1, vec3<f32>(1.0));
    var phi23 = vec3<f32>(0.0);
    if (baseIor.x < iridescenceIor) { phi23.x = 3.141592653589793; }
    if (baseIor.y < iridescenceIor) { phi23.y = 3.141592653589793; }
    if (baseIor.z < iridescenceIor) { phi23.z = 3.141592653589793; }
    let opd = 2.0 * iridescenceIor * thickness * cosTheta2;
    let phi = vec3<f32>(phi21) + phi23;
    let r123 = clamp(vec3<f32>(r12) * r23, vec3<f32>(1e-5), vec3<f32>(0.9999));
    let smallR123 = sqrt(r123);
    let rs = (t121 * t121) * r23 / (vec3<f32>(1.0) - r123);
    var outI = vec3<f32>(r12) + rs;
    var cm = rs - vec3<f32>(t121);
    for (var m: i32 = 1; m <= 2; m = m + 1) {
        cm = cm * smallR123;
        outI = outI + cm * (2.0 * nme_pbr_evalSensitivity(f32(m) * opd, f32(m) * phi));
    }
    return max(outI, vec3<f32>(0.0));
}`;
      emitter96 = {
        className: "IridescenceBlock",
        stage: "fragment",
        emit(_block, _outputName, _stage, state, _ctx) {
          state.usesIridescence = true;
          state.fragment.helpers.set("nme_pbr_iridescence_helpers", IRIDESCENCE_HELPERS);
          return { expr: `vec3<f32>(0.0)`, type: "vec3f" };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/loop-block.ts
  var loop_block_exports = {};
  __export(loop_block_exports, {
    emitter: () => emitter97
  });
  function loopKey(stage, blockId) {
    return `${stage}|${blockId}`;
  }
  function storageWritesForLoop(block, ctx) {
    const writes = [];
    for (const candidate of ctx.graph.blocks.values()) {
      if (candidate.className !== "StorageWriteBlock") {
        continue;
      }
      const loopID = candidate.inputs.get("loopID")?.source;
      if (loopID?.blockId === block.id && loopID.outputName === "loopID") {
        writes.push(candidate);
      }
    }
    return writes;
  }
  var emitter97;
  var init_loop_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/loop-block.ts"() {
      "use strict";
      init_node_types();
      emitter97 = {
        className: "LoopBlock",
        emit(block, outputName, stage, state, ctx) {
          const active = state.loopVariables.get(loopKey(stage, block.id));
          if (outputName === "index") {
            if (!active) {
              throw new Error(`LoopBlock "${block.name}": index can only be read while emitting the loop body`);
            }
            return { expr: `f32(${active.indexVar})`, type: "f32" };
          }
          if (outputName === "loopID") {
            throw new Error(`LoopBlock "${block.name}": loopID can only be consumed by StorageReadBlock/StorageWriteBlock`);
          }
          if (outputName !== "output") {
            throw new Error(`LoopBlock "${block.name}": unsupported output "${outputName}"`);
          }
          const initial = ctx.resolve(block, "input", stage, state);
          const valueVar = ctx.temp(state, "loop");
          const indexVar = ctx.temp(state, "loopIndex");
          const body = stage === "vertex" ? state.vertex.body : state.fragment.body;
          body.push(`var ${valueVar}: ${WGSL[initial.type]} = ${initial.expr};`);
          const iterationsInput = block.inputs.get("iterations");
          const iterations = iterationsInput?.source ? `i32(${ctx.cast(ctx.resolve(block, "iterations", stage, state), "f32").expr})` : String(Math.max(0, Math.floor(block.serialized["iterations"] ?? 4)));
          body.push(`for (var ${indexVar} = 0; ${indexVar} < ${iterations}; ${indexVar} = ${indexVar} + 1) {`);
          const key = loopKey(stage, block.id);
          const previous = state.loopVariables.get(key);
          const stageState = stage === "vertex" ? state.vertex : state.fragment;
          const previousMemo = new Map(stageState.memo);
          state.loopVariables.set(key, { valueVar, valueType: initial.type, indexVar });
          try {
            for (const write of storageWritesForLoop(block, ctx)) {
              const value = ctx.cast(ctx.resolve(write, "value", stage, state), initial.type);
              body.push(`${valueVar} = ${value.expr};`);
            }
          } finally {
            stageState.memo.clear();
            for (const [memoKey2, memoValue] of previousMemo) {
              stageState.memo.set(memoKey2, memoValue);
            }
            if (previous) {
              state.loopVariables.set(key, previous);
            } else {
              state.loopVariables.delete(key);
            }
          }
          body.push("}");
          return { expr: valueVar, type: initial.type };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/storage-read-block.ts
  var storage_read_block_exports = {};
  __export(storage_read_block_exports, {
    emitter: () => emitter98
  });
  function loopKey2(stage, blockId) {
    return `${stage}|${blockId}`;
  }
  var emitter98;
  var init_storage_read_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/storage-read-block.ts"() {
      "use strict";
      emitter98 = {
        className: "StorageReadBlock",
        emit(block, outputName, stage, state, _ctx) {
          if (outputName !== "value") {
            throw new Error(`StorageReadBlock "${block.name}": unsupported output "${outputName}"`);
          }
          const loopSource = block.inputs.get("loopID")?.source;
          if (!loopSource) {
            throw new Error(`StorageReadBlock "${block.name}": loopID input is not connected`);
          }
          const active = state.loopVariables.get(loopKey2(stage, loopSource.blockId));
          if (!active) {
            throw new Error(`StorageReadBlock "${block.name}": loop ${loopSource.blockId} is not active`);
          }
          return { expr: active.valueVar, type: active.valueType };
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/storage-write-block.ts
  var storage_write_block_exports = {};
  __export(storage_write_block_exports, {
    emitter: () => emitter99
  });
  var emitter99;
  var init_storage_write_block = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/storage-write-block.ts"() {
      "use strict";
      emitter99 = {
        className: "StorageWriteBlock",
        emit(block, _outputName, stage, state, ctx) {
          const value = ctx.resolve(block, "value", stage, state);
          return value;
        }
      };
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry-extra-compat.ts
  var node_registry_extra_compat_exports = {};
  __export(node_registry_extra_compat_exports, {
    loadExtraEmitter: () => loadExtraEmitter4
  });
  function blockLoader4(key) {
    switch (key) {
      case "ElbowBlock":
        return () => Promise.resolve().then(() => (init_elbow_block(), elbow_block_exports));
      case "NodeMaterialTeleportInBlock":
        return () => Promise.resolve().then(() => (init_teleport_in_block(), teleport_in_block_exports));
      case "NodeMaterialTeleportOutBlock":
        return () => Promise.resolve().then(() => (init_teleport_out_block(), teleport_out_block_exports));
      case "NodeMaterialDebugBlock":
        return () => Promise.resolve().then(() => (init_debug_block(), debug_block_exports));
      case "MeshAttributeExistsBlock":
        return () => Promise.resolve().then(() => (init_mesh_attribute_exists_block(), mesh_attribute_exists_block_exports));
      case "ClipPlanesBlock":
        return () => Promise.resolve().then(() => (init_clip_planes_block(), clip_planes_block_exports));
      case "ReflectionTextureBaseBlock":
        return () => Promise.resolve().then(() => (init_reflection_texture_base_block(), reflection_texture_base_block_exports));
      case "ImageProcessingBlock":
        return () => Promise.resolve().then(() => (init_image_processing_block(), image_processing_block_exports));
      case "IridescenceBlock":
        return () => Promise.resolve().then(() => (init_iridescence_block(), iridescence_block_exports));
      case "LoopBlock":
        return () => Promise.resolve().then(() => (init_loop_block(), loop_block_exports));
      case "StorageReadBlock":
        return () => Promise.resolve().then(() => (init_storage_read_block(), storage_read_block_exports));
      case "StorageWriteBlock":
        return () => Promise.resolve().then(() => (init_storage_write_block(), storage_write_block_exports));
      default:
        return null;
    }
  }
  async function loadExtraEmitter4(key) {
    const loader = blockLoader4(key);
    if (!loader) {
      throw new Error(`NodeMaterial: no compatibility extension emitter registered for block "${key}"`);
    }
    return (await loader()).emitter;
  }
  var init_node_registry_extra_compat = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry-extra-compat.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry.ts
  var node_registry_exports = {};
  __export(node_registry_exports, {
    hasBlockEmitter: () => hasBlockEmitter,
    loadBlockEmitter: () => loadBlockEmitter
  });
  async function loadBlockEmitter(key) {
    const baseLoader = baseBlockLoader(key);
    if (baseLoader) {
      return (await baseLoader()).emitter;
    }
    const extra = await loadExtraBlockEmitter(key);
    if (extra) {
      return extra;
    }
    throw new Error(`NodeMaterial: no emitter registered for block "${key}"`);
  }
  function hasBlockEmitter(key) {
    return !!baseBlockLoader(key) || !!extraRegistryLoader(key);
  }
  function baseBlockLoader(key) {
    switch (key) {
      case "InputBlock":
        return () => Promise.resolve().then(() => (init_input_block(), input_block_exports));
      case "VectorMergerBlock":
        return () => Promise.resolve().then(() => (init_vector_merger(), vector_merger_exports));
      case "FragmentOutputBlock":
        return () => Promise.resolve().then(() => (init_fragment_output(), fragment_output_exports));
      case "AddBlock":
        return () => Promise.resolve().then(() => (init_add_block(), add_block_exports));
      case "SubtractBlock":
        return () => Promise.resolve().then(() => (init_subtract_block(), subtract_block_exports));
      case "MultiplyBlock":
        return () => Promise.resolve().then(() => (init_multiply_block(), multiply_block_exports));
      case "MinBlock":
        return () => Promise.resolve().then(() => (init_min_block(), min_block_exports));
      case "MaxBlock":
        return () => Promise.resolve().then(() => (init_max_block(), max_block_exports));
      case "PowBlock":
        return () => Promise.resolve().then(() => (init_pow_block(), pow_block_exports));
      case "StepBlock":
        return () => Promise.resolve().then(() => (init_step_block(), step_block_exports));
      case "DotBlock":
        return () => Promise.resolve().then(() => (init_dot_block(), dot_block_exports));
      case "ScaleBlock":
        return () => Promise.resolve().then(() => (init_scale_block(), scale_block_exports));
      case "OneMinusBlock":
        return () => Promise.resolve().then(() => (init_oneminus_block(), oneminus_block_exports));
      case "NegateBlock":
        return () => Promise.resolve().then(() => (init_negate_block(), negate_block_exports));
      case "NormalizeBlock":
        return () => Promise.resolve().then(() => (init_normalize_block(), normalize_block_exports));
      case "LerpBlock":
        return () => Promise.resolve().then(() => (init_lerp_block(), lerp_block_exports));
      case "ClampBlock":
        return () => Promise.resolve().then(() => (init_clamp_block(), clamp_block_exports));
      case "SmoothStepBlock":
        return () => Promise.resolve().then(() => (init_smoothstep_block(), smoothstep_block_exports));
      case "RemapBlock":
        return () => Promise.resolve().then(() => (init_remap_block(), remap_block_exports));
      case "TrigonometryBlock":
        return () => Promise.resolve().then(() => (init_trigonometry_block(), trigonometry_block_exports));
      case "VectorSplitterBlock":
        return () => Promise.resolve().then(() => (init_vector_splitter(), vector_splitter_exports));
      case "ColorSplitterBlock":
        return () => Promise.resolve().then(() => (init_color_splitter(), color_splitter_exports));
      case "TransformBlock":
        return () => Promise.resolve().then(() => (init_transform_block(), transform_block_exports));
      case "VertexOutputBlock":
        return () => Promise.resolve().then(() => (init_vertex_output(), vertex_output_exports));
      case "TextureBlock":
        return () => Promise.resolve().then(() => (init_texture_block(), texture_block_exports));
      case "ImageSourceBlock":
        return () => Promise.resolve().then(() => (init_image_source(), image_source_exports));
      case "FrontFacingBlock":
        return () => Promise.resolve().then(() => (init_front_facing(), front_facing_exports));
      case "ViewDirectionBlock":
        return () => Promise.resolve().then(() => (init_view_direction(), view_direction_exports));
      case "LightBlock":
        return () => Promise.resolve().then(() => (init_light_block(), light_block_exports));
      case "LightInformationBlock":
        return () => Promise.resolve().then(() => (init_light_information(), light_information_exports));
      case "FogBlock":
        return () => Promise.resolve().then(() => (init_fog_block(), fog_block_exports));
      case "PerturbNormalBlock":
        return () => Promise.resolve().then(() => (init_perturb_normal(), perturb_normal_exports));
      case "BonesBlock":
        return () => Promise.resolve().then(() => (init_bones_block(), bones_block_exports));
      case "InstancesBlock":
        return () => Promise.resolve().then(() => (init_instances_block(), instances_block_exports));
      case "MorphTargetsBlock":
        return () => Promise.resolve().then(() => (init_morph_targets(), morph_targets_exports));
      case "ShadowMapBlock":
        return () => Promise.resolve().then(() => (init_shadow_map(), shadow_map_exports));
      case "DiscardBlock":
        return () => Promise.resolve().then(() => (init_discard_block(), discard_block_exports));
      case "ReflectionTextureBlock":
        return () => Promise.resolve().then(() => (init_reflection_texture_block(), reflection_texture_block_exports));
      case "PBRMetallicRoughnessBlock":
        return () => Promise.resolve().then(() => (init_pbr_metallic_roughness_block(), pbr_metallic_roughness_block_exports));
      case "PBRMetallicRoughnessBlock__full":
        return () => Promise.resolve().then(() => (init_pbr_metallic_roughness_block_full(), pbr_metallic_roughness_block_full_exports));
      case "ReflectionBlock":
        return () => Promise.resolve().then(() => (init_reflection_block(), reflection_block_exports));
      case "ClearCoatBlock":
        return () => Promise.resolve().then(() => (init_clearcoat_block(), clearcoat_block_exports));
      case "SheenBlock":
        return () => Promise.resolve().then(() => (init_sheen_block(), sheen_block_exports));
      case "AnisotropyBlock":
        return () => Promise.resolve().then(() => (init_anisotropy_block(), anisotropy_block_exports));
      case "SubSurfaceBlock":
        return () => Promise.resolve().then(() => (init_subsurface_block(), subsurface_block_exports));
      case "RefractionBlock":
        return () => Promise.resolve().then(() => (init_refraction_block(), refraction_block_exports));
      default:
        return null;
    }
  }
  async function loadExtraBlockEmitter(key) {
    const loader = extraRegistryLoader(key);
    if (!loader) {
      return null;
    }
    return (await loader()).loadExtraEmitter(key);
  }
  function extraRegistryLoader(key) {
    switch (key) {
      case "DivideBlock":
      case "ModBlock":
      case "ReciprocalBlock":
      case "LengthBlock":
      case "DistanceBlock":
      case "CrossBlock":
      case "ReflectBlock":
      case "RefractBlock":
      case "ArcTan2Block":
      case "FresnelBlock":
      case "OppositeBlock":
      case "NLerpBlock":
      case "ConditionalBlock":
      case "CurveBlock":
      case "WaveBlock":
      case "RandomNumberBlock":
        return () => Promise.resolve().then(() => (init_node_registry_extra_math(), node_registry_extra_math_exports));
      case "ColorMergerBlock":
      case "ColorConverterBlock":
      case "DesaturateBlock":
      case "GradientBlock":
      case "PosterizeBlock":
      case "ReplaceColorBlock":
      case "PannerBlock":
      case "Rotate2dBlock":
      case "TriPlanarBlock":
      case "BiPlanarBlock":
      case "CloudBlock":
      case "SimplexPerlin3DBlock":
      case "VoronoiNoiseBlock":
      case "WorleyNoise3DBlock":
        return () => Promise.resolve().then(() => (init_node_registry_extra_procedural(), node_registry_extra_procedural_exports));
      case "DerivativeBlock":
      case "HeightToNormalBlock":
      case "TBNBlock":
      case "NormalBlendBlock":
      case "AmbientOcclusionBlock":
      case "FragCoordBlock":
      case "ScreenSizeBlock":
      case "ScreenSpaceBlock":
      case "TwirlBlock":
      case "FragDepthBlock":
      case "MatrixBuilder":
      case "MatrixSplitterBlock":
      case "MatrixTransposeBlock":
      case "MatrixDeterminantBlock":
        return () => Promise.resolve().then(() => (init_node_registry_extra_advanced(), node_registry_extra_advanced_exports));
      case "ElbowBlock":
      case "NodeMaterialTeleportInBlock":
      case "NodeMaterialTeleportOutBlock":
      case "NodeMaterialDebugBlock":
      case "MeshAttributeExistsBlock":
      case "ClipPlanesBlock":
      case "ReflectionTextureBaseBlock":
      case "ImageProcessingBlock":
      case "IridescenceBlock":
      case "LoopBlock":
      case "StorageReadBlock":
      case "StorageWriteBlock":
        return () => Promise.resolve().then(() => (init_node_registry_extra_compat(), node_registry_extra_compat_exports));
      default:
        return null;
    }
  }
  var init_node_registry = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-registry.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-emitter.ts
  function newStageState() {
    return {
      helpers: /* @__PURE__ */ new Map(),
      body: [],
      memo: /* @__PURE__ */ new Map()
    };
  }
  function createBuildState() {
    return {
      vertex: newStageState(),
      fragment: newStageState(),
      vertexAttributes: [],
      varyings: [],
      nodeUboFields: [],
      bindings: [],
      textures: [],
      pbrMrHelperRequests: [],
      loopVariables: /* @__PURE__ */ new Map(),
      nextTemp: 0,
      usesLightsUbo: false,
      usesScreenSize: false,
      usesFragDepth: false,
      usesClipPlanes: false,
      usesMeshAttributeExists: false,
      usesMorphTargets: false,
      usesEnv: false,
      usesClearcoat: false,
      usesSheen: false,
      usesAnisotropy: false,
      usesIridescence: false,
      usesSubsurface: false,
      shadowLights: [],
      hasSkeleton: false,
      hasInstances: false
    };
  }
  function memoKey(blockId, outputName) {
    return `${blockId}|${outputName}`;
  }
  function stageOf(state, stage) {
    return stage === "vertex" ? state.vertex : state.fragment;
  }
  function mintTemp(state, prefix = "t") {
    const id = state.nextTemp++;
    return `_${prefix}${id}`;
  }
  function castExpr(value, target) {
    if (value.type === target) {
      return value;
    }
    const t = WGSL[target];
    if (value.type === "vec4f" && target === "vec3f") {
      return { expr: `(${value.expr}).xyz`, type: target };
    }
    if (value.type === "vec4f" && target === "vec2f") {
      return { expr: `(${value.expr}).xy`, type: target };
    }
    if (value.type === "vec3f" && target === "vec2f") {
      return { expr: `(${value.expr}).xy`, type: target };
    }
    if ((value.type === "vec4f" || value.type === "vec3f" || value.type === "vec2f") && target === "f32") {
      return { expr: `(${value.expr}).x`, type: target };
    }
    if (value.type === "f32" && (target === "vec2f" || target === "vec3f" || target === "vec4f")) {
      return { expr: `${t}(${value.expr})`, type: target };
    }
    if (value.type === "vec3f" && target === "vec4f") {
      return { expr: `vec4<f32>(${value.expr}, 1.0)`, type: target };
    }
    if (value.type === "vec2f" && target === "vec4f") {
      return { expr: `vec4<f32>(${value.expr}, 0.0, 1.0)`, type: target };
    }
    if (value.type === "vec2f" && target === "vec3f") {
      return { expr: `vec3<f32>(${value.expr}, 0.0)`, type: target };
    }
    throw new Error(`NodeMaterial: cannot cast ${value.type} to ${target} for expression \`${value.expr}\``);
  }
  function makeContext(graph, loadedEmitters) {
    const ctx = {
      graph,
      _loadedEmitters: loadedEmitters,
      temp: (state, prefix) => mintTemp(state, prefix),
      cast: castExpr,
      resolve: (block, inputName, stage, state) => {
        const input = block.inputs.get(inputName);
        if (!input) {
          throw new Error(`NodeMaterial: block "${block.className}" (id=${block.id}) has no input "${inputName}"`);
        }
        if (!input.source) {
          throw new Error(`NodeMaterial: block "${block.className}" (id=${block.id}) input "${inputName}" is not connected`);
        }
        const producer = graph.blocks.get(input.source.blockId);
        if (!producer) {
          throw new Error(`NodeMaterial: dangling connection ${block.id}.${inputName} -> block ${input.source.blockId}`);
        }
        return ctx.resolveOutput(producer, input.source.outputName, stage, state);
      },
      resolveOutput: (producer, outputName, stage, state) => {
        const stageState = stageOf(state, stage);
        const key = memoKey(producer.id, outputName);
        const existing = stageState.memo.get(key);
        if (existing) {
          return existing;
        }
        const emitter100 = loadedEmitters.get(producer.className);
        if (!emitter100) {
          throw new Error(`NodeMaterial: no emitter loaded for block "${producer.className}"`);
        }
        const targetStage = emitter100.stage ?? stage;
        const result = emitter100.emit(producer, outputName, targetStage, state, ctx);
        if (targetStage !== stage) {
          const vname = `v_${producer.id}_${outputName}`;
          bridgeVarying(state, vname, result, targetStage, stage);
          const bridged = { expr: `in.${vname}`, type: result.type };
          stageState.memo.set(key, bridged);
          return bridged;
        }
        stageState.memo.set(key, result);
        return result;
      }
    };
    return ctx;
  }
  function bridgeVarying(state, varyingName, value, from, to) {
    if (from !== "vertex" || to !== "fragment") {
      throw new Error("NodeMaterial: only vertex->fragment varyings are supported");
    }
    const already = state.varyings.find((v) => v._name === varyingName);
    if (!already) {
      state.varyings.push({ _name: varyingName, _type: WGSL[value.type] });
      state.vertex.body.push(`out.${varyingName} = ${value.expr};`);
    }
  }
  async function defaultBlockLoader(className) {
    defaultRegistry ?? (defaultRegistry = Promise.resolve().then(() => (init_node_registry(), node_registry_exports)));
    return (await defaultRegistry).loadBlockEmitter(className);
  }
  function pbrMrBlockNeedsFullEmitter(block) {
    return block.serialized.enableSpecularAntiAliasing === true || !!block.inputs.get("clearcoat")?.source || !!block.inputs.get("sheen")?.source || !!block.inputs.get("subsurface")?.source || !!block.inputs.get("anisotropy")?.source || !!block.inputs.get("iridescence")?.source;
  }
  function graphNeedsFullPbrMrEmitter(graph) {
    for (const block of graph.blocks.values()) {
      if (block.className === "PBRMetallicRoughnessBlock" && pbrMrBlockNeedsFullEmitter(block)) {
        return true;
      }
    }
    return false;
  }
  async function loadGraphEmitters(graph, blockLoader5 = defaultBlockLoader) {
    const classNames = /* @__PURE__ */ new Set();
    for (const b of graph.blocks.values()) {
      classNames.add(b.className);
    }
    const map = /* @__PURE__ */ new Map();
    const useFullPbrMrEmitter = blockLoader5 === defaultBlockLoader && graphNeedsFullPbrMrEmitter(graph);
    await Promise.all(
      Array.from(classNames).map(async (className) => {
        const loaderKey = className === "PBRMetallicRoughnessBlock" && useFullPbrMrEmitter ? "PBRMetallicRoughnessBlock__full" : className;
        const e = await blockLoader5(loaderKey);
        map.set(className, e);
      })
    );
    return map;
  }
  function emitGraph(graph, loadedEmitters, fragmentRootId, vertexRootId, shadowLights, meshCaps) {
    const state = createBuildState();
    if (shadowLights) {
      for (const sl of shadowLights) {
        state.shadowLights.push(sl);
      }
    }
    if (meshCaps) {
      if (meshCaps.hasSkeleton) {
        state.hasSkeleton = true;
      }
      if (meshCaps.hasInstances) {
        state.hasInstances = true;
      }
    }
    const ctx = makeContext(graph, loadedEmitters);
    const fragRoot = graph.blocks.get(fragmentRootId);
    if (!fragRoot) {
      throw new Error(`NodeMaterial: fragment root block ${fragmentRootId} not found`);
    }
    const fragEmitter = loadedEmitters.get(fragRoot.className);
    if (!fragEmitter) {
      throw new Error(`NodeMaterial: no emitter for fragment root "${fragRoot.className}"`);
    }
    fragEmitter.emit(fragRoot, "", "fragment", state, ctx);
    if (vertexRootId !== null) {
      const vertRoot = graph.blocks.get(vertexRootId);
      if (!vertRoot) {
        throw new Error(`NodeMaterial: vertex root block ${vertexRootId} not found`);
      }
      const vertEmitter = loadedEmitters.get(vertRoot.className);
      if (!vertEmitter) {
        throw new Error(`NodeMaterial: no emitter for vertex root "${vertRoot.className}"`);
      }
      vertEmitter.emit(vertRoot, "", "vertex", state, ctx);
    }
    for (const block of graph.blocks.values()) {
      const e = loadedEmitters.get(block.className);
      if (e?.sideEffect) {
        e.emit(block, "", e.stage ?? "fragment", state, ctx);
      }
    }
    return {
      vertexWgsl: composeStage(state, "vertex"),
      fragmentWgsl: composeStage(state, "fragment"),
      state
    };
  }
  function composeStage(state, stage) {
    const s = stageOf(state, stage);
    return s.body.join("\n");
  }
  var defaultRegistry;
  var init_node_emitter = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-emitter.ts"() {
      "use strict";
      init_node_types();
      defaultRegistry = null;
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-pipeline.ts
  function buildMeshStruct() {
    return `struct MeshU {
    world: mat4x4<f32>,
    receivesShadow: vec4<f32>,
    lc: u32,
    li: array<vec4<u32>, ${Math.ceil(MAX_LIGHTS / 4)}>,
};
@group(1) @binding(0) var<uniform> meshU: MeshU;
fn nli(i: u32) -> u32 { return meshU.li[i / 4u][i % 4u]; }`;
  }
  function getCache(engine) {
    if (!_cache || _cachedDevice2 !== engine._device) {
      _cache = /* @__PURE__ */ new Map();
      _cachedDevice2 = engine._device;
    }
    return _cache;
  }
  function buildVertexIn(state) {
    if (state.vertexAttributes.length === 0) {
      return `struct VertexIn {};`;
    }
    const lines = state.vertexAttributes.map((a, i) => `    @location(${i}) ${a._name}: ${a._type},`);
    return `struct VertexIn {
${lines.join("\n")}
};`;
  }
  function buildVertexOut(state) {
    const lines = [`    @builtin(position) position: vec4<f32>,`];
    state.varyings.forEach((v, i) => {
      lines.push(`    @location(${i}) ${v._name}: ${v._type},`);
    });
    return `struct VertexOut {
${lines.join("\n")}
};`;
  }
  function buildNodeUbo(state, binding) {
    if (state.nodeUboFields.length === 0) {
      return null;
    }
    const layout = computeUboLayout(state.nodeUboFields);
    const lines = state.nodeUboFields.map((f) => `    ${f._name}: ${f._type},`);
    const struct = `struct NodeU {
${lines.join("\n")}
};
@group(1) @binding(${binding}) var<uniform> nodeU: NodeU;`;
    return { struct, size: layout._totalBytes, offsets: layout._offsets };
  }
  function indent(body) {
    return body.split("\n").map((l) => l.length === 0 ? l : `    ${l}`).join("\n");
  }
  function compileNodePipeline(state, vertexBody, fragmentBody, opts) {
    const { _engine, _format, _msaaSamples } = opts;
    const device = _engine._device;
    const mrt = opts._mrtOutput;
    let nextBinding = 1;
    const _nodeUboBinding = state.nodeUboFields.length > 0 ? nextBinding++ : null;
    const nodeUbo = _nodeUboBinding !== null ? buildNodeUbo(state, _nodeUboBinding) : null;
    const _nodeUboSize = nodeUbo?.size ?? 0;
    const _nodeUboOffsets = nodeUbo?.offsets ?? /* @__PURE__ */ new Map();
    const _textureBindings = [];
    const textureWgslDecls = [];
    for (const tex of state.textures) {
      const _name = tex.name;
      const _texBinding = nextBinding++;
      const _sampBinding = nextBinding++;
      _textureBindings.push({ _name, _texBinding, _sampBinding });
      const wgslTexType = tex.kind === "textureCube" ? "texture_cube<f32>" : "texture_2d<f32>";
      textureWgslDecls.push(`@group(1) @binding(${_texBinding}) var nodeTex_${_name}: ${wgslTexType};`);
      textureWgslDecls.push(`@group(1) @binding(${_sampBinding}) var nodeSamp_${_name}: sampler;`);
    }
    const lightsWgslDecls = state.usesLightsUbo ? `struct LightEntry { vLightData: vec4<f32>, vLightDiffuse: vec4<f32>, vLightSpecular: vec4<f32>, vLightDirection: vec4<f32> };
struct lightsUniforms { count: u32, _p0: u32, _p1: u32, _p2: u32, lights: array<LightEntry, ${MAX_LIGHTS}> };
@group(0) @binding(1) var<uniform> nmeLights: lightsUniforms;` : "";
    let _morphBindings = null;
    const morphWgslDecls = [];
    if (state.usesMorphTargets) {
      const _textureBinding = nextBinding++;
      const _uboBinding = nextBinding++;
      _morphBindings = { _textureBinding, _uboBinding };
      morphWgslDecls.push(
        `@group(1) @binding(${_textureBinding}) var morphTargets: texture_2d<f32>;`,
        `struct morphUniforms { weights: vec4<f32>, count: u32, texWidth: u32, rowsPerBand: u32, _p0: u32 };`,
        `@group(1) @binding(${_uboBinding}) var<uniform> morph: morphUniforms;`,
        // Helpers are emitted inline (module-scope) so they can reference `morph` + `morphTargets`.
        `fn nme_morph_coord(vi: u32) -> vec2<i32> { let col = i32(vi % morph.texWidth); let row = i32(vi / morph.texWidth); return vec2<i32>(col, row); }`,
        `fn nme_morphPosition(base: vec3<f32>, vi: u32) -> vec3<f32> {
    var acc = base;
    let co = nme_morph_coord(vi);
    for (var i = 0u; i < morph.count; i = i + 1u) {
        let posBase = i32(i * 2u) * i32(morph.rowsPerBand);
        acc = acc + morph.weights[i] * textureLoad(morphTargets, vec2<i32>(co.x, posBase + co.y), 0).xyz;
    }
    return acc;
}`,
        `fn nme_morphNormal(base: vec3<f32>, vi: u32) -> vec3<f32> {
    var acc = base;
    let co = nme_morph_coord(vi);
    for (var i = 0u; i < morph.count; i = i + 1u) {
        let normBase = i32(i * 2u + 1u) * i32(morph.rowsPerBand);
        acc = acc + morph.weights[i] * textureLoad(morphTargets, vec2<i32>(co.x, normBase + co.y), 0).xyz;
    }
    return acc;
}`
      );
    }
    let _envBindings = null;
    let envWgslDecls = "";
    let envBglEntries = [];
    if (state.usesEnv && opts._envEmitter) {
      const env = opts._envEmitter(nextBinding);
      _envBindings = env.bindings;
      envWgslDecls = env.wgslDecls;
      envBglEntries = env.bglEntries;
      nextBinding += env.bindingCount;
    }
    const noColorOutput = opts._noColorOutput === true;
    const esmShadowOutput = opts._esmShadowOutput === true;
    const shadowOutput = noColorOutput || esmShadowOutput;
    const shadowEmit = !shadowOutput && state.shadowLights.length > 0 && opts._shadowEmitter ? opts._shadowEmitter(state.shadowLights, nextBinding, state.varyings) : null;
    if (shadowEmit) {
      nextBinding += shadowEmit._bindingCount;
    }
    const _shadowBindings = shadowEmit?._bindings ?? [];
    const shadowWgslDecls = shadowEmit?._wgslDecls ?? "";
    const shadowVertexInject = shadowEmit?._vertexInject ?? "";
    const esmShadowDepthCode = opts._esmShadowDepthCode ?? "";
    const _esmShadowParamsBinding = esmShadowOutput ? nextBinding++ : null;
    const _geometryGpBinding = mrt && mrt._needsGpUbo ? nextBinding++ : null;
    const _geomUbo = mrt && _geometryGpBinding !== null ? mrt._buildGeomUbo(_geometryGpBinding) : null;
    const shadowFragmentHelper = shadowEmit?._fragmentHelper ?? (shadowOutput && state.shadowLights.length > 0 ? `fn nme_computeShadowFactors(input: VertexOut) -> array<f32, ${MAX_LIGHTS}> {
    return array<f32, ${MAX_LIGHTS}>(${new Array(MAX_LIGHTS).fill("1.0").join(", ")});
}` : "");
    const helperSources = /* @__PURE__ */ new Map();
    for (const s of [state.vertex, state.fragment]) {
      for (const [k, v] of s.helpers) {
        const existing2 = helperSources.get(k);
        if (existing2 !== void 0 && existing2 !== v) {
          throw new Error(`NodeMaterial: helper key "${k}" registered with conflicting source bodies`);
        }
        helperSources.set(k, v);
      }
    }
    const vertexIn = buildVertexIn(state);
    const vertexOut = buildVertexOut(state);
    const fragmentOut = !mrt && !noColorOutput && state.usesFragDepth ? `struct FragmentOut {
    @location(0) color: vec4<f32>,
    @builtin(frag_depth) fragDepth: f32,
};` : "";
    const wgslParts = ["// Auto-generated by NodeMaterial \u2014 DO NOT EDIT", SCENE_UBO_WGSL, buildMeshStruct()];
    if (nodeUbo) {
      wgslParts.push(nodeUbo.struct);
    }
    if (textureWgslDecls.length > 0) {
      wgslParts.push(textureWgslDecls.join("\n"));
    }
    if (lightsWgslDecls) {
      wgslParts.push(lightsWgslDecls);
    }
    if (morphWgslDecls.length > 0) {
      wgslParts.push(morphWgslDecls.join("\n"));
    }
    if (envWgslDecls) {
      wgslParts.push(envWgslDecls);
    }
    wgslParts.push(vertexIn);
    wgslParts.push(vertexOut);
    if (fragmentOut) {
      wgslParts.push(fragmentOut);
    }
    if (mrt) {
      wgslParts.push(mrt._struct);
    }
    if (shadowWgslDecls) {
      wgslParts.push(shadowWgslDecls);
    }
    if (_esmShadowParamsBinding !== null) {
      wgslParts.push(
        `struct NmeShadowParams { biasAndScale: vec4<f32>, depthValues: vec4<f32> };
@group(1) @binding(${_esmShadowParamsBinding}) var<uniform> nmeShadowParams: NmeShadowParams;`
      );
    }
    if (_geomUbo) {
      wgslParts.push(_geomUbo._wgsl);
    }
    if (shadowFragmentHelper.length > 0) {
      wgslParts.push(shadowFragmentHelper);
    }
    for (const src of helperSources.values()) {
      wgslParts.push(src);
    }
    const vsSig = state.usesMorphTargets ? `(in: VertexIn, @builtin(vertex_index) vertexIndex: u32)` : `(in: VertexIn)`;
    wgslParts.push(
      `@vertex
fn vs_main${vsSig} -> VertexOut {
    var out: VertexOut;
    var ${SENTINEL_VTX_OUTPUT}: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
${indent(vertexBody)}
` + (!shadowOutput && shadowVertexInject.length > 0 ? `    ${shadowVertexInject}
` : ``) + `    out.position = ${SENTINEL_VTX_OUTPUT};
    return out;
}`
    );
    const fsReturnType = mrt ? mrt._fsReturnType : noColorOutput ? "" : state.usesFragDepth && !esmShadowOutput ? " -> FragmentOut" : " -> @location(0) vec4<f32>";
    const fragDepthDecl = !mrt && (noColorOutput || esmShadowOutput || state.usesFragDepth) ? `    var ${SENTINEL_FRAG_DEPTH}: f32 = in.position.z;
` : "";
    const fsReturn = mrt ? mrt._fsReturn : noColorOutput ? "" : esmShadowOutput ? `${indent(esmShadowDepthCode)}
` : state.usesFragDepth ? `    return FragmentOut(${SENTINEL_FRAG_OUTPUT}, ${SENTINEL_FRAG_DEPTH});
` : `    return ${SENTINEL_FRAG_OUTPUT};
`;
    wgslParts.push(
      `@fragment
fn fs_main(in: VertexOut, @builtin(front_facing) ${SENTINEL_FRONT_FACING}: bool)${fsReturnType} {
    var ${SENTINEL_FRAG_OUTPUT}: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
` + fragDepthDecl + `${indent(fragmentBody)}
` + fsReturn + `}`
    );
    const rawWgsl = wgslParts.join("\n\n");
    const _wgsl = rawWgsl.replaceAll("_NME_CAMERA_POS_", "scene.vEyePosition.xyz").replaceAll("_NME_FOG_PARAMS_", "scene.vFogInfos").replaceAll("sceneU.", "scene.").replaceAll(SENTINEL_FRAG_COORD, "in.position").replaceAll(SENTINEL_SCREEN_SIZE, "vec2<f32>(scene.vFogColor.w, scene._envPad0)");
    const alphaMode = opts._alphaMode ?? 0;
    const depthFormat = opts._depthStencilFormat ?? "depth24plus-stencil8";
    const cacheKey = `${_wgsl}|${_format}|${depthFormat}|${_msaaSamples}|${opts._backFaceCulling !== false ? 1 : 0}|${alphaMode}|${mrt ? mrt._cacheKey : noColorOutput ? 1 : esmShadowOutput ? 2 : 0}`;
    const cache = getCache(_engine);
    const existing = cache.get(cacheKey);
    if (existing) {
      return existing;
    }
    const blend = alphaModeToBlend(alphaMode);
    const depthWriteEnabled = blend === void 0;
    const sceneBGL = getSceneBindGroupLayout(_engine);
    const meshBglEntries = [{ binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } }];
    if (_nodeUboBinding !== null) {
      meshBglEntries.push({ binding: _nodeUboBinding, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } });
    }
    for (const tb of _textureBindings) {
      meshBglEntries.push({ binding: tb._texBinding, visibility: SS.VERTEX | SS.FRAGMENT, texture: { sampleType: "float", viewDimension: "2d" } });
      meshBglEntries.push({ binding: tb._sampBinding, visibility: SS.VERTEX | SS.FRAGMENT, sampler: { type: "filtering" } });
    }
    if (_morphBindings !== null) {
      meshBglEntries.push({
        binding: _morphBindings._textureBinding,
        visibility: SS.VERTEX,
        texture: { sampleType: "unfilterable-float", viewDimension: "2d" }
      });
      meshBglEntries.push({
        binding: _morphBindings._uboBinding,
        visibility: SS.VERTEX,
        buffer: { type: "uniform", minBindingSize: 32 }
      });
    }
    if (_envBindings) {
      meshBglEntries.push(...envBglEntries);
    }
    if (shadowEmit) {
      meshBglEntries.push(...shadowEmit._bglEntries);
    }
    if (_esmShadowParamsBinding !== null) {
      meshBglEntries.push({ binding: _esmShadowParamsBinding, visibility: SS.FRAGMENT, buffer: { type: "uniform" } });
    }
    if (_geomUbo) {
      meshBglEntries.push(_geomUbo._bglEntry);
    }
    const _meshBGL = device.createBindGroupLayout({ label: "node-mesh", entries: meshBglEntries });
    const _vertexBuffers = state.vertexAttributes.map((a, i) => ({
      arrayStride: a._arrayStride,
      stepMode: a._stepMode ?? "vertex",
      attributes: [{ format: a._gpuFormat, offset: a._offset ?? 0, shaderLocation: i }]
    }));
    const shaderModule = device.createShaderModule({ label: "node-material", code: _wgsl });
    const _pipeline = mrt ? mrt._buildPipeline(device, {
      _shaderModule: shaderModule,
      _sceneBGL: sceneBGL,
      _meshBGL,
      _vertexBuffers,
      _depthFormat: depthFormat,
      _depthCompare: opts._depthCompare ?? REVERSE_DEPTH_COMPARE,
      _msaaSamples
    }) : device.createRenderPipeline(
      noColorOutput ? {
        label: "node-material-depth",
        layout: device.createPipelineLayout({ bindGroupLayouts: [sceneBGL, _meshBGL] }),
        vertex: { module: shaderModule, entryPoint: "vs_main", buffers: _vertexBuffers },
        fragment: { module: shaderModule, entryPoint: "fs_main", targets: [] },
        depthStencil: { format: depthFormat, depthCompare: opts._depthCompare ?? REVERSE_DEPTH_COMPARE, depthWriteEnabled: true },
        multisample: { count: _msaaSamples },
        primitive: { topology: "triangle-list", cullMode: opts._backFaceCulling !== false ? "back" : "none" }
      } : {
        ...createDefaultPipelineDescriptor({
          _label: "node-material",
          _engine,
          _bgls: [sceneBGL, _meshBGL],
          _vertModule: shaderModule,
          _fragModule: shaderModule,
          _vertexBuffers,
          _format,
          _depthStencilFormat: opts._depthStencilFormat,
          _depthCompare: opts._depthCompare,
          _msaaSamples,
          _cullMode: opts._backFaceCulling !== false ? "back" : "none",
          _blend: esmShadowOutput ? void 0 : blend,
          _depthWriteEnabled: esmShadowOutput || depthWriteEnabled
        }),
        vertex: { module: shaderModule, entryPoint: "vs_main", buffers: _vertexBuffers },
        fragment: { module: shaderModule, entryPoint: "fs_main", targets: [!esmShadowOutput && blend ? { format: _format, blend } : { format: _format }] }
      }
    );
    const result = {
      _wgsl,
      _pipeline,
      _meshBGL,
      _nodeUboSize,
      _nodeUboOffsets,
      _nodeUboBinding,
      _textureBindings,
      _morphBindings,
      _envBindings,
      _shadowBindings,
      _usesClipPlanes: state.usesClipPlanes,
      _usesMeshAttributeFlags: state.usesMeshAttributeExists,
      _esmShadowParamsBinding,
      _geometryGpBinding
    };
    cache.set(cacheKey, result);
    return result;
  }
  function alphaModeToBlend(mode) {
    switch (mode) {
      case 1:
        return {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one", operation: "add" }
        };
      case 2:
        return {
          color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
        };
      case 7:
        return {
          color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
        };
      default:
        return void 0;
    }
  }
  var SENTINEL_FRAG_OUTPUT, SENTINEL_FRAG_DEPTH, SENTINEL_VTX_OUTPUT, SENTINEL_FRONT_FACING, SENTINEL_FRAG_COORD, SENTINEL_SCREEN_SIZE, _cache, _cachedDevice2;
  var init_node_pipeline = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-pipeline.ts"() {
      "use strict";
      init_gpu_flags();
      init_render_target();
      init_scene_helpers();
      init_scene_helpers();
      init_scene_uniforms2();
      init_ubo_layout();
      init_types();
      SENTINEL_FRAG_OUTPUT = "_NME_FRAG_OUTPUT_";
      SENTINEL_FRAG_DEPTH = "_NME_FRAG_DEPTH_";
      SENTINEL_VTX_OUTPUT = "_NME_VTX_OUTPUT_";
      SENTINEL_FRONT_FACING = "_NME_FRONT_FACING_";
      SENTINEL_FRAG_COORD = "_NME_FRAG_COORD_";
      SENTINEL_SCREEN_SIZE = "_NME_SCREEN_SIZE_";
      _cache = null;
      _cachedDevice2 = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-snippet.ts
  var node_snippet_exports = {};
  __export(node_snippet_exports, {
    fetchSnippetSource: () => fetchSnippetSource
  });
  async function fetchSnippetSource(snippetId, server = DEFAULT_SNIPPET_SERVER) {
    const [id, version] = snippetId.split("#");
    const url = version ? `${server}/${id}/${version}` : `${server}/${id}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`NodeMaterial: snippet fetch failed (${resp.status}) for ${url}`);
    }
    const outer = await resp.json();
    if (!outer.jsonPayload) {
      throw new Error(`NodeMaterial: snippet "${snippetId}" has no jsonPayload`);
    }
    const inner = JSON.parse(outer.jsonPayload);
    if (!inner.nodeMaterial) {
      throw new Error(`NodeMaterial: snippet "${snippetId}" has no nodeMaterial`);
    }
    return JSON.parse(inner.nodeMaterial);
  }
  var DEFAULT_SNIPPET_SERVER;
  var init_node_snippet = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-snippet.ts"() {
      "use strict";
      DEFAULT_SNIPPET_SERVER = "https://snippet.babylonjs.com";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-env.ts
  var node_env_exports = {};
  __export(node_env_exports, {
    emitEnv: () => emitEnv,
    pushEnvBindGroupEntries: () => pushEnvBindGroupEntries
  });
  function emitEnv(startBinding) {
    const iblTexBinding = startBinding;
    const iblSampBinding = startBinding + 1;
    const brdfTexBinding = startBinding + 2;
    const brdfSampBinding = startBinding + 3;
    const wgslDecls = [
      `@group(1) @binding(${iblTexBinding}) var nmeIblTexture: texture_cube<f32>;`,
      `@group(1) @binding(${iblSampBinding}) var nmeIblSampler: sampler;`,
      `@group(1) @binding(${brdfTexBinding}) var nmeBrdfLUT: texture_2d<f32>;`,
      `@group(1) @binding(${brdfSampBinding}) var nmeBrdfSampler: sampler;`
    ].join("\n");
    const bglEntries = [
      { binding: iblTexBinding, visibility: SS.FRAGMENT, texture: { sampleType: "float", viewDimension: "cube" } },
      { binding: iblSampBinding, visibility: SS.FRAGMENT, sampler: { type: "filtering" } },
      { binding: brdfTexBinding, visibility: SS.FRAGMENT, texture: { sampleType: "float", viewDimension: "2d" } },
      { binding: brdfSampBinding, visibility: SS.FRAGMENT, sampler: { type: "filtering" } }
    ];
    return {
      bindings: { _iblTexture: iblTexBinding, _iblSampler: iblSampBinding, _brdfLUT: brdfTexBinding, _brdfSampler: brdfSampBinding },
      wgslDecls,
      bglEntries,
      bindingCount: 4
    };
  }
  function pushEnvBindGroupEntries(scene, envBindings, entries) {
    const env = scene._envTextures;
    if (!env) {
      throw new Error("NodeMaterial: PBR/Reflection block requires scene environment but scene._envTextures is unset. Call loadEnvironment() before registerScene().");
    }
    entries.push({ binding: envBindings._iblTexture, resource: env.specularCubeView });
    entries.push({ binding: envBindings._iblSampler, resource: env.cubeSampler });
    entries.push({ binding: envBindings._brdfLUT, resource: env.brdfLutView });
    entries.push({ binding: envBindings._brdfSampler, resource: env.brdfSampler });
  }
  var init_node_env = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-env.ts"() {
      "use strict";
      init_gpu_flags();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-shadow.ts
  var node_shadow_exports = {};
  __export(node_shadow_exports, {
    emitShadow: () => emitShadow
  });
  function emitShadow(shadowLights, startBinding, varyings) {
    const _bindings = [];
    const wgslDecls = [];
    const _bglEntries = [];
    for (const sl of shadowLights) {
      const suf = `_${sl.lightIndex}`;
      if (!varyings.some((v) => v._name === `vPosFromLight${suf}`)) {
        varyings.push({ _name: `vPosFromLight${suf}`, _type: "vec4<f32>" });
      }
      if (!varyings.some((v) => v._name === `vDepthMetric${suf}`)) {
        varyings.push({ _name: `vDepthMetric${suf}`, _type: "f32" });
      }
    }
    const vertLines = [`let _shadowWp4 = meshU.world * vec4<f32>(in.position, 1.0);`];
    const dispatchLines = [`var _sf = ${SHADOW_FACTORS_ONE4};`];
    let nextBinding = startBinding;
    for (const sl of shadowLights) {
      const suf = `_${sl.lightIndex}`;
      const _lightIndex = sl.lightIndex;
      const _texBinding = nextBinding++;
      const _sampBinding = nextBinding++;
      const _uboBinding = nextBinding++;
      const _shadowType = sl.shadowType;
      _bindings.push({ _lightIndex, _texBinding, _sampBinding, _uboBinding, _shadowType });
      wgslDecls.push(
        `struct shadowInfo${suf}Uniforms { lightMatrix: mat4x4<f32>, depthValues: vec4<f32>, shadowsInfo: vec4<f32> };`,
        `@group(1) @binding(${_uboBinding}) var<uniform> shadowInfo${suf}: shadowInfo${suf}Uniforms;`
      );
      if (sl.shadowType === "pcf") {
        wgslDecls.push(
          `@group(1) @binding(${_texBinding}) var shadowTex${suf}: texture_depth_2d;`,
          `@group(1) @binding(${_sampBinding}) var shadowComp${suf}: sampler_comparison;`,
          `fn computeShadowPCF${suf}(posFromLight: vec4<f32>, depthMetric: f32, darkness: f32, mapSz: f32, invMapSz: f32) -> f32 {
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
    sh += uvw0.x * uvw0.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[0], v[0]), depthRef);
    sh += uvw1.x * uvw0.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[1], v[0]), depthRef);
    sh += uvw2.x * uvw0.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[2], v[0]), depthRef);
    sh += uvw0.x * uvw1.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[0], v[1]), depthRef);
    sh += uvw1.x * uvw1.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[1], v[1]), depthRef);
    sh += uvw2.x * uvw1.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[2], v[1]), depthRef);
    sh += uvw0.x * uvw2.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[0], v[2]), depthRef);
    sh += uvw1.x * uvw2.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[1], v[2]), depthRef);
    sh += uvw2.x * uvw2.y * textureSampleCompareLevel(shadowTex${suf}, shadowComp${suf}, base + vec2<f32>(u[2], v[2]), depthRef);
    sh /= 144.0;
    return mix(darkness, 1.0, sh);
}`
        );
        dispatchLines.push(
          `_sf[${sl.lightIndex}] = computeShadowPCF${suf}(input.vPosFromLight${suf}, input.vDepthMetric${suf}, shadowInfo${suf}.shadowsInfo.x, shadowInfo${suf}.shadowsInfo.y, shadowInfo${suf}.shadowsInfo.z);`
        );
        _bglEntries.push(
          { binding: _texBinding, visibility: SS.FRAGMENT, texture: { sampleType: "depth", viewDimension: "2d" } },
          { binding: _sampBinding, visibility: SS.FRAGMENT, sampler: { type: "comparison" } }
        );
      } else {
        wgslDecls.push(
          `@group(1) @binding(${_texBinding}) var shadowTex${suf}: texture_2d<f32>;`,
          `@group(1) @binding(${_sampBinding}) var shadowSamp${suf}: sampler;`,
          `fn computeFallOff${suf}(value: f32, clipSpace: vec2<f32>, frustumEdgeFalloff: f32) -> f32 {
    let mask = smoothstep(1.0 - frustumEdgeFalloff, 1.00000012, clamp(dot(clipSpace, clipSpace), 0.0, 1.0));
    return mix(value, 1.0, mask);
}
fn computeShadowESM${suf}(posFromLight: vec4<f32>, depthMetric: f32, darkness: f32, depthScale: f32, frustumEdgeFalloff: f32) -> f32 {
    let clipSpace = posFromLight.xyz / posFromLight.w;
    let uv = vec2<f32>(0.5 * clipSpace.x + 0.5, 0.5 - 0.5 * clipSpace.y);
    if (depthMetric < 0.0 || depthMetric > 1.0 || uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 1.0; }
    let shadowPixelDepth = clamp(depthMetric, 0.0, 1.0);
    let shadowMapSample = textureSampleLevel(shadowTex${suf}, shadowSamp${suf}, uv, 0.0).x;
    let esm = 1.0 - clamp(exp(min(87.0, depthScale * shadowPixelDepth)) * shadowMapSample, 0.0, 1.0 - darkness);
    return computeFallOff${suf}(esm, clipSpace.xy, frustumEdgeFalloff);
}`
        );
        dispatchLines.push(
          `_sf[${sl.lightIndex}] = computeShadowESM${suf}(input.vPosFromLight${suf}, input.vDepthMetric${suf}, shadowInfo${suf}.shadowsInfo.x, shadowInfo${suf}.shadowsInfo.z, shadowInfo${suf}.shadowsInfo.w);`
        );
        _bglEntries.push(
          { binding: _texBinding, visibility: SS.FRAGMENT, texture: { sampleType: "float", viewDimension: "2d" } },
          { binding: _sampBinding, visibility: SS.FRAGMENT, sampler: { type: "filtering" } }
        );
      }
      vertLines.push(
        `out.vPosFromLight${suf} = shadowInfo${suf}.lightMatrix * _shadowWp4;`,
        `out.vDepthMetric${suf} = (out.vPosFromLight${suf}.z + shadowInfo${suf}.depthValues.x) / shadowInfo${suf}.depthValues.y;`
      );
      _bglEntries.push({
        binding: _uboBinding,
        visibility: SS.VERTEX | SS.FRAGMENT,
        buffer: { type: "uniform", minBindingSize: 96 }
      });
    }
    dispatchLines.push(`for (var _i = 0u; _i < ${MAX_LIGHTS}u; _i++) { _sf[_i] = mix(1.0, _sf[_i], meshU.receivesShadow.x); }`);
    dispatchLines.push(`return _sf;`);
    return {
      _bindings,
      _wgslDecls: wgslDecls.join("\n"),
      _fragmentHelper: `fn nme_computeShadowFactors(input: VertexOut) -> ${SHADOW_FACTORS_TYPE} {
    ${dispatchLines.join("\n    ")}
}`,
      _vertexInject: vertLines.join("\n    "),
      _bglEntries,
      _bindingCount: shadowLights.length * 3
    };
  }
  var SHADOW_FACTORS_TYPE, SHADOW_FACTORS_ONE4;
  var init_node_shadow = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-shadow.ts"() {
      "use strict";
      init_gpu_flags();
      init_types();
      SHADOW_FACTORS_TYPE = `array<f32, ${MAX_LIGHTS}>`;
      SHADOW_FACTORS_ONE4 = `${SHADOW_FACTORS_TYPE}(${new Array(MAX_LIGHTS).fill("1.0").join(", ")})`;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-flags.ts
  var NODE_NO_COLOR_OUTPUT, NODE_ESM_SHADOW_OUTPUT, NODE_GEOMETRY_OUTPUT;
  var init_node_flags = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-flags.ts"() {
      "use strict";
      NODE_NO_COLOR_OUTPUT = 1 << 0;
      NODE_ESM_SHADOW_OUTPUT = 1 << 1;
      NODE_GEOMETRY_OUTPUT = 1 << 2;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-renderable.ts
  var node_renderable_exports = {};
  __export(node_renderable_exports, {
    buildNodeMeshRenderables: () => buildNodeMeshRenderables,
    getAttrBuffer: () => getAttrBuffer,
    writeAttributeFlags: () => writeAttributeFlags
  });
  function getEmptyMorph(engine) {
    const cached = emptyMorphByEngine.get(engine);
    if (cached) {
      return cached;
    }
    const texture = engine._device.createTexture({
      label: "node-morph-empty",
      size: [1, 1],
      format: "rgba32float",
      usage: TU.TEXTURE_BINDING | TU.COPY_DST
    });
    engine._device.queue.writeTexture({ texture }, new F32([0, 0, 0, 0]).buffer, { bytesPerRow: 16 }, { width: 1, height: 1 });
    const ubo = new ArrayBuffer(32);
    const u32 = new U32(ubo, 16, 4);
    u32[0] = 0;
    u32[1] = 1;
    u32[2] = 1;
    const weightsBuffer = engine._device.createBuffer({ label: "node-morph-empty-ubo", size: 32, usage: BU.UNIFORM | BU.COPY_DST });
    engine._device.queue.writeBuffer(weightsBuffer, 0, new U8(ubo));
    const entry = { texture, weightsBuffer };
    emptyMorphByEngine.set(engine, entry);
    return entry;
  }
  function buildNodeMeshRenderables(scene, meshes, materialOverride) {
    const engine = scene.surface.engine;
    const device = engine._device;
    const byMaterial = /* @__PURE__ */ new Map();
    for (const m of meshes) {
      const mat = materialOverride ?? m.material;
      let list = byMaterial.get(mat);
      if (!list) {
        list = [];
        byMaterial.set(mat, list);
      }
      list.push(m);
    }
    const renderables = [];
    for (const [material, matMeshes] of byMaterial) {
      const featureFlags = material._renderFeatures?.features ?? 0;
      const noColorOutput = (featureFlags & NODE_NO_COLOR_OUTPUT) !== 0;
      const esmShadowOutput = (featureFlags & NODE_ESM_SHADOW_OUTPUT) !== 0;
      const shadowOutput = noColorOutput || esmShadowOutput;
      const compile = shadowOutput ? compileNodePipeline(material._state, material._vertexBody, material._fragmentBody, {
        _engine: engine,
        _format: esmShadowOutput ? "rgba16float" : engine.format,
        _depthStencilFormat: "depth32float",
        _depthCompare: "less-equal",
        _msaaSamples: 1,
        _backFaceCulling: material._graph.backFaceCulling,
        _noColorOutput: noColorOutput,
        _esmShadowOutput: esmShadowOutput,
        _esmShadowDepthCode: esmShadowOutput ? material._esmShadowDepthCode : void 0,
        _alphaMode: esmShadowOutput ? 0 : void 0,
        // The shared fragment body still references env IBL/BRDF samplers
        // (e.g. nmeBrdfLUT) even in the no-color shadow-depth variant, so we
        // must emit the env decls + BGL entries here too; otherwise WGSL fails
        // to resolve those identifiers. _envEmitter is undefined for non-env
        // materials (state.usesEnv === false), leaving them unaffected.
        _envEmitter: material._envHelpers?.emitEnv
      }) : material._compile;
      const meshBGL = compile._meshBGL;
      let nodeUBO = null;
      if (compile._nodeUboBinding !== null && compile._nodeUboSize > 0) {
        nodeUBO = device.createBuffer({ label: "node-ubo", size: compile._nodeUboSize, usage: BU.UNIFORM | BU.COPY_DST });
        writeNodeUBO(engine, nodeUBO, material);
        material._nodeUBO = nodeUBO;
      }
      const _packMeshWorld = engine._makePackMeshWorld?.(scene) ?? packMat4IntoF32;
      const packets = [];
      for (const _mesh of matMeshes) {
        const meshUboBytes = 96 + 16 * Math.ceil(MAX_LIGHTS / 4);
        const _meshUBO = device.createBuffer({ label: "node-mesh-ubo", size: meshUboBytes + 15 & ~15, usage: BU.UNIFORM | BU.COPY_DST });
        const _meshScratch = new F32((meshUboBytes + 15 & ~15) / 4);
        _packMeshWorld(_meshScratch, _mesh.worldMatrix, 0, 0);
        const recv = _mesh.receiveShadows ? 1 : 0;
        _meshScratch[16] = recv;
        if (compile._usesMeshAttributeFlags) {
          writeAttributeFlags(_mesh, _meshScratch);
        }
        writeMeshLightSelection(_mesh, scene.lights, _meshScratch.subarray(4));
        device.queue.writeBuffer(_meshUBO, 0, _meshScratch);
        const entries = [{ binding: 0, resource: { buffer: _meshUBO } }];
        if (nodeUBO) {
          entries.push({ binding: compile._nodeUboBinding, resource: { buffer: nodeUBO } });
        }
        for (const tb of compile._textureBindings) {
          const slot = material._textureSlots.get(tb._name);
          const tex = slot?.current;
          if (!tex) {
            throw new Error(
              `NodeMaterial: texture binding "${tb._name}" not set. Provide it via options.textures or material.inputs["${tb._name}"].texture before the first render.`
            );
          }
          entries.push({ binding: tb._texBinding, resource: tex.view });
          entries.push({ binding: tb._sampBinding, resource: tex.sampler });
        }
        if (compile._morphBindings !== null) {
          const mt = _mesh.morphTargets ?? getEmptyMorph(engine);
          entries.push({ binding: compile._morphBindings._textureBinding, resource: mt.texture.createView() });
          entries.push({ binding: compile._morphBindings._uboBinding, resource: { buffer: mt.weightsBuffer } });
        }
        if (compile._envBindings) {
          material._envHelpers.pushEnvBindGroupEntries(scene, compile._envBindings, entries);
        }
        for (let si = 0; si < compile._shadowBindings.length; si++) {
          const sb = compile._shadowBindings[si];
          const sg = material._shadowGenerators[si];
          if (!sg) {
            throw new Error(`NodeMaterial: material requires shadow generator #${si} but none was supplied to parseNodeMaterialFromSnippet({ shadowGenerators }).`);
          }
          entries.push({ binding: sb._texBinding, resource: sg._depthTexture.createView() });
          entries.push({ binding: sb._sampBinding, resource: sg._depthSampler });
          entries.push({ binding: sb._uboBinding, resource: { buffer: sg._shadowUBO } });
        }
        if (compile._esmShadowParamsBinding !== null) {
          entries.push({
            binding: compile._esmShadowParamsBinding,
            resource: { buffer: material._esmShadowParamsUBO }
          });
        }
        const _meshBG = device.createBindGroup({ label: "node-mesh-bg", layout: meshBGL, entries });
        packets.push({
          _mesh,
          _meshUBO,
          _meshBG,
          _meshScratch,
          _lastWorldVersion: _mesh.worldMatrixVersion,
          _lastReceivesShadow: recv,
          _lastLightsCount: scene.lights.length
        });
      }
      const attrNames = material._vertexAttrNames;
      const updatePacketUBO = (pkt) => {
        const recv = pkt._mesh.receiveShadows ? 1 : 0;
        const worldVersion = pkt._mesh.worldMatrixVersion;
        const worldChanged = worldVersion !== pkt._lastWorldVersion;
        const recvChanged = recv !== pkt._lastReceivesShadow;
        const lightsChanged = scene.lights.length !== pkt._lastLightsCount;
        if (worldChanged || recvChanged || lightsChanged) {
          _packMeshWorld(pkt._meshScratch, pkt._mesh.worldMatrix, 0, 0);
          pkt._meshScratch[16] = recv;
          if (compile._usesMeshAttributeFlags) {
            writeAttributeFlags(pkt._mesh, pkt._meshScratch);
          }
          writeMeshLightSelection(pkt._mesh, scene.lights, pkt._meshScratch.subarray(4));
          device.queue.writeBuffer(pkt._meshUBO, 0, pkt._meshScratch);
          pkt._lastWorldVersion = worldVersion;
          pkt._lastReceivesShadow = recv;
          pkt._lastLightsCount = scene.lights.length;
        }
      };
      const updateNodeUBO = () => {
        if (nodeUBO && material._uboDirty) {
          material._uboDirty = false;
          writeNodeUBO(engine, nodeUBO, material);
        }
      };
      const drawPacket = (pass, pkt) => {
        const g = pkt._mesh._gpu;
        for (let i = 0; i < attrNames.length; i++) {
          const buf = getAttrBuffer(engine, g, attrNames[i]);
          pass.setVertexBuffer(i, buf);
        }
        pass.setIndexBuffer(g.indexBuffer, g.indexFormat);
        pass.setBindGroup(1, pkt._meshBG);
        pass.drawIndexed(g.indexCount);
      };
      const isTransparent = !noColorOutput && !esmShadowOutput && material._needsAlphaBlending;
      if (isTransparent) {
        for (const pkt of packets) {
          const wm = pkt._mesh.worldMatrix;
          const cx = pkt._mesh.position?.x ?? wm[12];
          const cy = pkt._mesh.position?.y ?? wm[13];
          const cz = pkt._mesh.position?.z ?? wm[14];
          const sortCenter = [cx, cy, cz];
          const _baseUpdate = () => {
            updatePacketUBO(pkt);
            updateNodeUBO();
            const m = pkt._mesh.worldMatrix;
            sortCenter[0] = m[12];
            sortCenter[1] = m[13];
            sortCenter[2] = m[14];
          };
          const _invalidate = () => {
            pkt._lastWorldVersion = -1;
          };
          const update = engine._wrapRenderableForFO?.(_baseUpdate, scene, _invalidate) ?? _baseUpdate;
          const draw = (pass) => {
            drawPacket(pass, pkt);
            return 1;
          };
          const rTrans = {
            order: 200,
            isTransparent: true,
            mesh: pkt._mesh,
            _worldCenter: sortCenter,
            bind() {
              return { renderable: rTrans, pipeline: compile._pipeline, update, draw };
            }
          };
          renderables.push(rTrans);
        }
      } else {
        const _baseUpdate = () => {
          for (const pkt of packets) {
            updatePacketUBO(pkt);
          }
          updateNodeUBO();
        };
        const _invalidate = () => {
          for (const pkt of packets) {
            pkt._lastWorldVersion = -1;
          }
        };
        const update = engine._wrapRenderableForFO?.(_baseUpdate, scene, _invalidate) ?? _baseUpdate;
        const draw = (pass) => {
          let draws = 0;
          for (const pkt of packets) {
            drawPacket(pass, pkt);
            draws++;
          }
          return draws;
        };
        const rOpaque = {
          order: 100,
          isTransparent: false,
          bind() {
            return { renderable: rOpaque, pipeline: compile._pipeline, update, draw };
          }
        };
        renderables.push(rOpaque);
      }
    }
    const rebuildSingle = (s, mesh, override) => {
      return buildNodeMeshRenderables(s, [mesh], override).renderables[0];
    };
    return { renderables, rebuildSingle };
  }
  function getZeroAttrBuffer(engine, gpu, name) {
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
    const stride = name === "uv" || name === "uv2" ? 8 : name === "normal" ? 12 : name === "tangent" || name === "color" ? 16 : 16;
    const buf = engine._device.createBuffer({ label: `node-zero-${name}`, size: vertexCount * stride, usage: BU.VERTEX | BU.COPY_DST });
    cache.set(name, buf);
    return buf;
  }
  function getAttrBuffer(engine, gpu, name) {
    switch (name) {
      case "position":
        return gpu.positionBuffer;
      case "normal":
        return gpu.normalBuffer;
      case "uv":
        return gpu.uvBuffer;
      case "uv2":
        return gpu.uv2Buffer ?? getZeroAttrBuffer(engine, gpu, "uv2");
      case "tangent":
        return gpu.tangentBuffer ?? getZeroAttrBuffer(engine, gpu, "tangent");
      case "color":
        return gpu.colorBuffer ?? getZeroAttrBuffer(engine, gpu, "color");
      default:
        throw new Error(`NodeMaterial: unsupported attribute "${name}"`);
    }
  }
  function writeAttributeFlags(mesh, scratch) {
    const gpu = mesh._gpu;
    scratch[17] = gpu.hasUv === false ? 0 : 1;
    scratch[18] = gpu.hasTangent ? 1 : 0;
    scratch[19] = gpu.hasColor ? 1 : 0;
  }
  var emptyMorphByEngine, zeroAttrCache;
  var init_node_renderable = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-renderable.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_node_material();
      init_node_pipeline();
      init_node_flags();
      init_lights_ubo();
      init_types();
      init_pack_mat4_into_f32();
      emptyMorphByEngine = /* @__PURE__ */ new WeakMap();
      zeroAttrCache = /* @__PURE__ */ new WeakMap();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pbr-mr-helper-core.ts
  var pbr_mr_helper_core_exports = {};
  __export(pbr_mr_helper_core_exports, {
    buildPbrMrHelperCore: () => buildPbrMrHelperCore
  });
  function buildPbrMrHelperCore(request) {
    if (request.useClearcoat || request.useSheen || request.useRefraction || request.useSubsurface || request.useAnisotropy || request.useIridescence || request.useShAlbedoScaling || request.useCcBump || request.useCcTint || request.useSpecularAA || request.remapClearcoatF0) {
      throw new Error("NodeMaterial: PBR-MR core helper cannot emit optional PBR feature code");
    }
    return HELPER_WGSL6(request.useEnv);
  }
  function HELPER_WGSL6(useEnv) {
    const iblBlock = useEnv ? `
    let envRot = sceneU.envRotationY;
    let cosA = cos(envRot); let sinA = sin(envRot);
    let N_specSrc = N;
    let R_raw = reflect(-V, N_specSrc);
    let R = v3(R_raw.x * cosA + R_raw.z * sinA, R_raw.y, -R_raw.x * sinA + R_raw.z * cosA);
    let N_env = v3(Ng.x * cosA + Ng.z * sinA, Ng.y, -Ng.x * sinA + Ng.z * cosA);
    let environmentIrradiance = (sceneU.vSphericalL00.xyz
        + sceneU.vSphericalL1_1.xyz * N_env.y + sceneU.vSphericalL10.xyz * N_env.z + sceneU.vSphericalL11.xyz * N_env.x
        + sceneU.vSphericalL2_2.xyz * (N_env.y * N_env.x) + sceneU.vSphericalL2_1.xyz * (N_env.y * N_env.z)
        + sceneU.vSphericalL20.xyz * (3.0 * N_env.z * N_env.z - 1.0) + sceneU.vSphericalL21.xyz * (N_env.z * N_env.x)
        + sceneU.vSphericalL22.xyz * (N_env.x * N_env.x - N_env.y * N_env.y));
    let brdfSample = textureSample(nmeBrdfLUT, nmeBrdfSampler, v2(NdotV, rough_c));
    let envBrdf = brdfSample.rgb;
    let reflectanceF0Scalar = max(colorF0.r, max(colorF0.g, colorF0.b));
    let baseSpecEnvReflectance = (colorF90 - v3(reflectanceF0Scalar)) * envBrdf.x + v3(reflectanceF0Scalar) * envBrdf.y;
    let seo = clamp((NdotVUnclamped + ao_c) * (NdotVUnclamped + ao_c) - 1.0 + ao_c, 0.0, 1.0);
    let _geoNF = select(-Ng, Ng, dot(Ng, V) > 0.0);
    let _ehoRefl = reflect(-V, N);
    let _ehoT = clamp(1.0 + 1.1 * dot(_ehoRefl, _geoNF), 0.0, 1.0);
    let eho = _ehoT * _ehoT;
    let _coloredR0 = colorF0;
    let colorSpecEnvReflectance = ((colorF90 - _coloredR0) * envBrdf.x + _coloredR0 * envBrdf.y) * seo * eho;
    let energyConservation = 1.0 + _coloredR0 * (1.0 / max(envBrdf.y, 0.001) - 1.0);
    let maxLod = f32(textureNumLevels(nmeIblTexture) - 1);
    let cubemapDim = f32(textureDimensions(nmeIblTexture).x);
    let specLod = log2(cubemapDim * alphaG) * sceneU.vImageInfos.z;
    var environmentRadiance = textureSampleLevel(nmeIblTexture, nmeIblSampler, R, clamp(specLod, 0.0, maxLod)).rgb;
    var finalIrradiance = environmentIrradiance * surfaceAlbedo;
    let finalRadianceScaled = environmentRadiance * colorSpecEnvReflectance * energyConservation;
    let finalSpecularScaledDirect = specAcc * energyConservation;
    let finalRefraction = v3(0.0);
    let refractionOpacity = 1.0;
    let ssRefractionIrradiance = v3(0.0);
    finalIrradiance = finalIrradiance * ao_c;
    r.diffuseInd = finalIrradiance;
    r.specularInd = finalRadianceScaled;
    let shFinalIbl = v3(0.0);
    let shAlbedoScaling: f32 = 1.0;
    r.lighting = finalIrradiance * shAlbedoScaling + ssRefractionIrradiance * ao_c + (finalRadianceScaled + finalSpecularScaledDirect + diffuseAcc) * shAlbedoScaling + diffuseTransmissionAcc + shDirectAcc + shFinalIbl + finalRefraction;` : `
    r.diffuseInd = v3(0.0);
    r.specularInd = v3(0.0);
    r.lighting = diffuseAcc + diffuseTransmissionAcc + specAcc + shDirectAcc;`;
    return `alias v2 = vec2<f32>;
alias v3 = vec3<f32>;
alias v4 = vec4<f32>;
struct NmePbrMrResult {
    lighting: v3,
    diffuseDir: v3,
    specularDir: v3,
    diffuseInd: v3,
    specularInd: v3,
    shadow: f32,
    lumOverAlpha: f32,
};
const NME_PBR_PI: f32 = 3.14159265358979323846;
fn nme_pbr_distGGX(NdotH: f32, alphaG: f32) -> f32 {
    let a2 = alphaG * alphaG;
    let d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    return a2 / (NME_PBR_PI * d * d);
}
fn nme_pbr_geomGGX(NdotL: f32, NdotV: f32, alphaG: f32) -> f32 {
    let a2 = alphaG * alphaG;
    let gl = NdotL * sqrt(NdotV * (NdotV - a2 * NdotV) + a2);
    let gv = NdotV * sqrt(NdotL * (NdotL - a2 * NdotL) + a2);
    return 0.5 / max(gl + gv, 0.00001);
}
fn nme_pbr_fresSchlick(c: f32, F0: v3, F90: v3) -> v3 {
    let t = 1.0 - c;
    let t2 = t * t;
    return F0 + (F90 - F0) * (t2 * t2 * t);
}
fn nme_pbr_diffuseEON(albedo: v3, sigma: f32, NdotL: f32, NdotV: f32, LdotV: f32) -> v3 {
    return albedo * (1.0 / NME_PBR_PI);
}
fn nme_pbr_mr_compute(
    worldPos: v3, geometricNormal: v3, worldNormal: v3, cameraPos: v3,
    baseColor: v3, metallic: f32, roughness: f32, ao: f32,
    ccIntensityIn: f32, ccRoughnessIn: f32, ccIor: f32,
    ccBumpColor: v3, ccBumpUv: v2,
    ccTintColor: v3, ccTintAtDistance: f32, ccTintThickness: f32,
    shIntensityIn: f32, shColorIn: v3, shRoughnessIn: f32,
    baseIor: f32,
    refrIntensityIn: f32, refrIor: f32, refrTintAtDistance: f32,
    ssTintColor: v3, ssThickness: f32,
    ssTranslucencyIntensityIn: f32, ssDiffusionDist: v3,
    anisoIntensityIn: f32, anisoDirection: v2, anisoUv: v2,
    shadowFactors: array<f32, ${MAX_LIGHTS}>
) -> NmePbrMrResult {
    var r: NmePbrMrResult;
    let Ng = normalize(geometricNormal);
    let N = normalize(worldNormal);
    let V = normalize(cameraPos - worldPos);
    let NdotVUnclamped = dot(N, V);
    let NdotV = abs(NdotVUnclamped) + 0.0000001;
    let metallic_c = clamp(metallic, 0.0, 1.0);
    let rough_c = clamp(roughness, 0.0, 1.0);
    var alphaG = rough_c * rough_c + 0.0005;
    let AA_factor_x = 0.0;
    let AA_factor_y = 0.0;
    let dielectricF0Raw = (baseIor - 1.0) / (baseIor + 1.0);
    let dielectricF0Scalar = dielectricF0Raw * dielectricF0Raw;
    let dielectricF0 = v3(dielectricF0Scalar);
    var surfaceAlbedo = baseColor * (1.0 - metallic_c) * (1.0 - dielectricF0Scalar);
    let colorF0 = mix(dielectricF0, baseColor, metallic_c);
    let colorF90 = v3(1.0);
    let ao_c = clamp(ao, 0.0, 1.0);
    let directRoughness = max(rough_c, AA_factor_x);
    let directAlphaG = directRoughness * directRoughness + 0.0005;
    let anisoT = v3(1.0, 0.0, 0.0);
    let anisoB = v3(0.0, 0.0, 1.0);
    let aniAlphaTB = v2(alphaG, alphaG);
    let aniN = N;
    let ccDirectSpecAcc = v3(0.0);
    let directSpecR0 = colorF0;
    let ccNormalW = N;
    let ccNdotV: f32 = 0.0;
    let shDirectAcc = v3(0.0);
    let translucencyIntensity = 0.0;
    let ssTransmittance = v3(0.0);
    let directDiffuseTranslucencyScale = 1.0;
    var diffuseAcc = v3(0.0);
    var diffuseTransmissionAcc = v3(0.0);
    var specAcc = v3(0.0);
    var aggShadow: f32 = 0.0;
    var nLights: f32 = 0.0;
    let lc = min(meshU.lc, ${MAX_LIGHTS}u);
    for (var i: u32 = 0u; i < lc; i = i + 1u) {
        let lightIndex = nli(i);
        let entry = nmeLights.lights[lightIndex];
        let t = u32(entry.vLightData.w);
        let sh = shadowFactors[lightIndex];
        if (t == 3u) {
            let Ldir = normalize(entry.vLightData.xyz);
            let nl = clamp(0.5 + 0.5 * dot(N, Ldir), 0.0000001, 1.0);
            let groundSky = mix(entry.vLightDirection.xyz, entry.vLightDiffuse.rgb, nl);
            var baseLayerAtten: f32 = 1.0;
            var baseLayerAbsorption = v3(1.0);
            let H_h = normalize(V + Ldir);
            let NdotH_h = clamp(dot(N, H_h), 0.0000001, 1.0);
            let VdotH_h = saturate(dot(V, H_h));
            let cF_h = nme_pbr_fresSchlick(VdotH_h, directSpecR0, colorF90);
            let D_h = nme_pbr_distGGX(NdotH_h, directAlphaG);
            let G_h = nme_pbr_geomGGX(nl, NdotV, directAlphaG);
            specAcc = specAcc + cF_h * D_h * G_h * nl * entry.vLightDiffuse.rgb * sh * baseLayerAtten * baseLayerAbsorption;
            diffuseAcc = diffuseAcc + groundSky * surfaceAlbedo * sh * baseLayerAtten * baseLayerAbsorption;
            aggShadow = aggShadow + sh;
            nLights = nLights + 1.0;
            continue;
        }
        var L: v3;
        var atten: f32 = 1.0;
        let color = entry.vLightDiffuse.rgb;
        if (t == 1u) {
            L = normalize(-entry.vLightData.xyz);
        } else {
            let toL = entry.vLightData.xyz - worldPos;
            let d2 = dot(toL, toL);
            let dist = sqrt(d2);
            L = toL / max(dist, 0.0001);
            let range = entry.vLightDiffuse.a;
            if (t == 2u) {
                let invD2 = 1.0 / max(d2, 0.0000001);
                let cosHalfAngle = entry.vLightDirection.w;
                let kappa = 6.64385618977 / max(1.0 - cosHalfAngle, 0.0001);
                let cd = dot(-entry.vLightDirection.xyz, L);
                let dirFall = exp2(kappa * (cd - 1.0));
                atten = invD2 * dirFall;
            } else {
                atten = 1.0 / max(d2, 0.0000001);
            }
        }
        let NdotLUnclamped = dot(N, L);
        let NdotL = clamp(NdotLUnclamped, 0.0000001, 1.0);
        var baseLayerAtten: f32 = 1.0;
        var baseLayerAbsorption = v3(1.0);
        let _LdotV = select(0.0, dot(L, V), t == 1u);
        let _eonDiffuse = nme_pbr_diffuseEON(surfaceAlbedo, 0.0, NdotL, NdotV, _LdotV);
        diffuseAcc = diffuseAcc + _eonDiffuse * directDiffuseTranslucencyScale * NdotL * color * atten * sh * baseLayerAtten * baseLayerAbsorption;
        if (NdotLUnclamped < 0.0 && translucencyIntensity > 0.0) {
            let _trNdotL = abs(NdotLUnclamped) + 0.0000001;
            let _wrapW = 0.02;
            let _wrapT = 1.0 + _wrapW;
            let _wrapNdotL = clamp((_trNdotL + _wrapW) / (_wrapT * _wrapT), 0.0, 1.0);
            let _clampedAlbT = clamp(surfaceAlbedo, v3(0.1), v3(1.0));
            let _eonTransmit = nme_pbr_diffuseEON(_clampedAlbT, 0.0, max(NdotL, 0.0000001), NdotV, _LdotV) / _clampedAlbT;
            diffuseTransmissionAcc = diffuseTransmissionAcc + _eonTransmit * (ssTransmittance * _wrapNdotL) * color * atten * sh * baseLayerAtten * baseLayerAbsorption;
        }
        if (NdotL > 0.0 && atten > 0.0) {
            let H = normalize(V + L);
            let NdotH = clamp(dot(N, H), 0.0000001, 1.0);
            let VdotH = saturate(dot(V, H));
            let cF = nme_pbr_fresSchlick(VdotH, directSpecR0, colorF90);
            let D = nme_pbr_distGGX(NdotH, directAlphaG);
            let G = nme_pbr_geomGGX(NdotL, NdotV, directAlphaG);
            specAcc = specAcc + cF * D * G * NdotL * color * atten * sh * baseLayerAtten * baseLayerAbsorption;
        }
        aggShadow = aggShadow + sh;
        nLights = nLights + 1.0;
    }
    r.diffuseDir = diffuseAcc;
    r.specularDir = specAcc;
${iblBlock}
    ${useEnv ? `let _radLum = clamp(dot(finalRadianceScaled * shAlbedoScaling, v3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    let _specLum = clamp(dot(finalSpecularScaledDirect * shAlbedoScaling, v3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    r.lumOverAlpha = _radLum + _specLum;` : `let _specLum = clamp(dot(specAcc, v3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    r.lumOverAlpha = _specLum;`}
    var colorOut = max(r.lighting, v3(0.0)) * sceneU.vImageInfos.x;
    if (sceneU.vImageInfos.w > 0.5) {
        colorOut = 1.0 - exp2(-1.590579 * colorOut);
    }
    colorOut = pow(max(colorOut, v3(0.0)), v3(0.45454545));
    colorOut = clamp(colorOut, v3(0.0), v3(1.0));
    let highContrast = colorOut * colorOut * (v3(3.0) - colorOut * 2.0);
    if (sceneU.vImageInfos.y < 1.0) {
        colorOut = mix(v3(0.5), colorOut, sceneU.vImageInfos.y);
    } else {
        colorOut = mix(colorOut, highContrast, sceneU.vImageInfos.y - 1.0);
    }
    r.lighting = max(colorOut, v3(0.0));
    if (nLights > 0.0) { r.shadow = aggShadow / nLights; } else { r.shadow = 1.0; }
    return r;
}
`;
  }
  var init_pbr_mr_helper_core = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/blocks/pbr-mr-helper-core.ts"() {
      "use strict";
      init_types();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-material.ts
  async function parseNodeMaterialFromSnippet(engine, snippetId, options = {}) {
    const source = options.json !== void 0 ? typeof options.json === "string" ? JSON.parse(options.json) : options.json : await (await Promise.resolve().then(() => (init_node_snippet(), node_snippet_exports))).fetchSnippetSource(snippetId, options.snippetServer);
    const graph = parseNodeMaterialSource(source);
    const emitters = await loadGraphEmitters(graph, options.blockLoader);
    const fragRoot = findBlockByClassName(graph, "FragmentOutputBlock");
    if (!fragRoot) {
      throw new Error("NodeMaterial: graph has no FragmentOutputBlock");
    }
    const vertRoot = findBlockByClassName(graph, "VertexOutputBlock");
    const shadowLightsPre = [];
    if (options.shadowGenerators && options.shadowGenerators.length > 0) {
      const defaultIdx = options.shadowGenerators.map((_, i) => i);
      const indices = options.shadowLightIndices ?? defaultIdx;
      for (let i = 0; i < options.shadowGenerators.length; i++) {
        shadowLightsPre.push({ lightIndex: indices[i], shadowType: options.shadowGenerators[i]._shadowType });
      }
    }
    const { vertexWgsl, fragmentWgsl, state } = emitGraph(graph, emitters, fragRoot.id, vertRoot ? vertRoot.id : null, shadowLightsPre, {
      hasSkeleton: options.hasSkeleton ?? false,
      hasInstances: options.hasInstances ?? false
    });
    await resolvePbrMrHelpers(state);
    let envHelpers = null;
    let _envEmitter;
    if (state.usesEnv) {
      envHelpers = await Promise.resolve().then(() => (init_node_env(), node_env_exports));
      _envEmitter = envHelpers.emitEnv;
    }
    let _shadowEmitter;
    if (options.shadowGenerators && options.shadowGenerators.length > 0) {
      _shadowEmitter = (await Promise.resolve().then(() => (init_node_shadow(), node_shadow_exports))).emitShadow;
    }
    const compile = compileNodePipeline(state, vertexWgsl, fragmentWgsl, {
      _engine: engine,
      _format: engine.format,
      _msaaSamples: engine.msaaSamples,
      _backFaceCulling: graph.backFaceCulling,
      _alphaMode: graph.needsAlphaBlending ? graph.alphaMode : 0,
      _envEmitter,
      _shadowEmitter
    });
    const inputs = {};
    const uniformValues = /* @__PURE__ */ new Map();
    for (const [name, blockId] of graph.namedInputs) {
      const block = graph.blocks.get(blockId);
      const _name = sanitize8(block.name || `input${block.id}`);
      const _offsetBytes = compile._nodeUboOffsets.get(_name);
      if (_offsetBytes === void 0) {
        continue;
      }
      const _type = bjsTypeToNodeType2(block.serialized["type"] ?? 16);
      if (_type === "mat4f") {
        continue;
      }
      const len = floatCount(_type);
      const defaultValues = extractDefault(block.serialized["value"], _type);
      const _values = new F32(len);
      _values.set(defaultValues);
      const slot = { _name, _type, _offsetBytes, _values };
      uniformValues.set(_name, slot);
      const handleType = handleTypeOf(_type);
      const setDirty = () => {
        material._uboDirty = true;
      };
      const handle = {
        type: handleType,
        get value() {
          return handleType === "f32" ? slot._values[0] : Array.from(slot._values);
        },
        set value(v) {
          if (typeof v === "number") {
            slot._values[0] = v;
          } else {
            slot._values.set(v);
          }
          setDirty();
        }
      };
      inputs[name] = handle;
    }
    for (const block of graph.blocks.values()) {
      if (block.className !== "InputBlock") {
        continue;
      }
      const _name = sanitize8(block.name || `input${block.id}`);
      if (uniformValues.has(_name)) {
        continue;
      }
      const _offsetBytes = compile._nodeUboOffsets.get(_name);
      if (_offsetBytes === void 0) {
        continue;
      }
      const _type = bjsTypeToNodeType2(block.serialized["type"] ?? 16);
      if (_type === "mat4f") {
        continue;
      }
      const len = floatCount(_type);
      const defaultValues = extractDefault(block.serialized["value"], _type);
      const _values = new F32(len);
      _values.set(defaultValues);
      uniformValues.set(_name, { _name, _type, _offsetBytes, _values });
    }
    const attrNames = state.vertexAttributes.map((a) => a._name);
    const textureSlots = /* @__PURE__ */ new Map();
    for (const tb of compile._textureBindings) {
      const slot = { current: options.textures?.[tb._name] ?? null };
      textureSlots.set(tb._name, slot);
      const handle = {
        type: "texture2d",
        get texture() {
          return slot.current;
        },
        set texture(v) {
          slot.current = v;
        }
      };
      inputs[tb._name] = handle;
    }
    const _buildGroup = async (scene, meshes) => {
      const { buildNodeMeshRenderables: buildNodeMeshRenderables2 } = await Promise.resolve().then(() => (init_node_renderable(), node_renderable_exports));
      const result = buildNodeMeshRenderables2(scene, meshes);
      _buildGroup._rebuildSingle = result.rebuildSingle;
      return result;
    };
    _buildGroup._materialFamily = "node";
    const material = {
      inputs,
      _renderFeatures: { features: 0 },
      _buildGroup,
      _uboVersion: 0,
      _compile: compile,
      _state: state,
      _graph: graph,
      _vertexBody: vertexWgsl,
      _fragmentBody: fragmentWgsl,
      _vertexAttrNames: attrNames,
      _shadowGenerators: options.shadowGenerators ?? [],
      _needsAlphaBlending: graph.needsAlphaBlending,
      _nodeUBO: null,
      _uboDirty: false,
      _uniformValues: uniformValues,
      _textureSlots: textureSlots,
      _envHelpers: envHelpers,
      _emitters: emitters,
      _hasSkeleton: options.hasSkeleton ?? false,
      _hasInstances: options.hasInstances ?? false
    };
    return material;
  }
  function isCorePbrMrRequest(request) {
    return !request.useClearcoat && !request.useSheen && !request.useRefraction && !request.useSubsurface && !request.useAnisotropy && !request.useShAlbedoScaling && !request.useCcBump && !request.useCcTint && !request.useSpecularAA && !request.remapClearcoatF0;
  }
  async function resolvePbrMrHelpers(state) {
    if (state.pbrMrHelperRequests.length === 0) {
      return;
    }
    if (state.pbrMrHelperRequests.some((request) => !isCorePbrMrRequest(request))) {
      throw new Error("NodeMaterial: advanced PBR-MR helper request must be emitted by the full PBR-MR block");
    }
    const core = await Promise.resolve().then(() => (init_pbr_mr_helper_core(), pbr_mr_helper_core_exports));
    for (const request of state.pbrMrHelperRequests) {
      state.fragment.helpers.set(request.key, core.buildPbrMrHelperCore(request));
    }
  }
  function sanitize8(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_");
  }
  function bjsTypeToNodeType2(t) {
    if (t === 1 || t === 2) {
      return "f32";
    }
    if (t === 4) {
      return "vec2f";
    }
    if (t === 8 || t === 32) {
      return "vec3f";
    }
    if (t === 16 || t === 64) {
      return "vec4f";
    }
    if (t === 128) {
      return "mat4f";
    }
    throw new Error(`NodeMaterial: unsupported BJS connection point type 0x${t.toString(16)}`);
  }
  function floatCount(type) {
    switch (type) {
      case "f32":
        return 1;
      case "vec2f":
        return 2;
      case "vec3f":
        return 3;
      case "vec4f":
        return 4;
      case "mat4f":
        return 16;
      default:
        return 0;
    }
  }
  function handleTypeOf(t) {
    if (t === "mat4f" || t === "texture2d" || t === "textureCube") {
      return "vec4f";
    }
    return t;
  }
  function extractDefault(raw, type) {
    const n = floatCount(type);
    if (typeof raw === "number") {
      return [raw];
    }
    if (Array.isArray(raw)) {
      const out = raw.slice(0, n).map((v) => typeof v === "number" ? v : 0);
      while (out.length < n) {
        out.push(0);
      }
      return out;
    }
    if (raw && typeof raw === "object") {
      const obj = raw;
      const picks = [];
      for (const k of ["x", "y", "z", "w"]) {
        if (typeof obj[k] === "number") {
          picks.push(obj[k]);
        }
      }
      if (picks.length > 0) {
        while (picks.length < n) {
          picks.push(0);
        }
        return picks.slice(0, n);
      }
      const rgba = [];
      for (const k of ["r", "g", "b", "a"]) {
        if (typeof obj[k] === "number") {
          rgba.push(obj[k]);
        }
      }
      if (rgba.length > 0) {
        while (rgba.length < n) {
          rgba.push(1);
        }
        return rgba.slice(0, n);
      }
    }
    return new Array(n).fill(0);
  }
  function writeNodeUBO(engine, buffer, material) {
    const size = material._compile._nodeUboSize;
    if (size === 0) {
      return;
    }
    const scratch = new F32(size / 4);
    for (const slot of material._uniformValues.values()) {
      const dstIdx = slot._offsetBytes >> 2;
      scratch.set(slot._values, dstIdx);
    }
    engine._device.queue.writeBuffer(buffer, 0, scratch);
  }
  var init_node_material = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/node/node-material.ts"() {
      "use strict";
      init_typed_arrays();
      init_node_parser();
      init_node_emitter();
      init_node_pipeline();
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/shader/wgsl-helpers.ts
  var WGSL_DITHER, WGSL_NO_DITHER;
  var init_wgsl_helpers = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/shader/wgsl-helpers.ts"() {
      "use strict";
      WGSL_DITHER = `
fn dither(seed: vec2<f32>, varianceAmount: f32) -> f32 {
let rand = fract(sin(dot(seed, vec2<f32>(12.9898, 78.233))) * 43758.5453);
let normVariance = varianceAmount / 255.0;
return mix(-normVariance, normVariance, rand);
}
`;
      WGSL_NO_DITHER = "fn dither(a:vec2<f32>,b:f32)->f32{return 0.0;}";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/scene-size.ts
  function computeSceneSize(scene, userSkyboxSize) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const m of scene.meshes) {
      if (!m.boundMin || !m.boundMax) {
        continue;
      }
      const w = m.worldMatrix;
      const tx = w[12], ty = w[13], tz = w[14];
      const wMinX = m.boundMin[0] + tx;
      const wMinY = m.boundMin[1] + ty;
      const wMinZ = m.boundMin[2] + tz;
      const wMaxX = m.boundMax[0] + tx;
      const wMaxY = m.boundMax[1] + ty;
      const wMaxZ = m.boundMax[2] + tz;
      if (wMinX < minX) {
        minX = wMinX;
      }
      if (wMinY < minY) {
        minY = wMinY;
      }
      if (wMinZ < minZ) {
        minZ = wMinZ;
      }
      if (wMaxX > maxX) {
        maxX = wMaxX;
      }
      if (wMaxY > maxY) {
        maxY = wMaxY;
      }
      if (wMaxZ > maxZ) {
        maxZ = wMaxZ;
      }
    }
    if (!isFinite(minX)) {
      return { groundSize: 15, skyboxSize: userSkyboxSize ?? 20, rootPosition: [0, 0, 0] };
    }
    const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
    const sceneDiagonalLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let groundSize = 15;
    let skyboxSize = userSkyboxSize ?? 20;
    const cam = scene.camera;
    if (cam && "upperRadiusLimit" in cam && cam.upperRadiusLimit) {
      groundSize = cam.upperRadiusLimit * 2;
      skyboxSize = groundSize;
    }
    if (sceneDiagonalLength > groundSize) {
      groundSize = sceneDiagonalLength * 2;
      skyboxSize = groundSize;
    }
    groundSize *= 1.1;
    skyboxSize *= 1.5;
    const rootPosition = [minX + dx * 0.5, minY - 1e-5, minZ + dz * 0.5];
    return { groundSize, skyboxSize, rootPosition };
  }
  var init_scene_size = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/scene-size.ts"() {
      "use strict";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-env/rgbd-decode.ts
  var rgbd_decode_exports = {};
  __export(rgbd_decode_exports, {
    decodeBrdfPng: () => decodeBrdfPng,
    uploadCubemapRGBD: () => uploadCubemapRGBD
  });
  function getPipeline(device, flipY) {
    if (device !== _device) {
      _device = device;
      _module = device.createShaderModule({ code: WGSL2 });
      _noFlip = null;
      _flip = null;
    }
    const slot = flipY ? _flip : _noFlip;
    if (slot) {
      return slot;
    }
    const p = device.createComputePipeline({
      layout: "auto",
      compute: { module: _module, entryPoint: "main", constants: { f: flipY ? 1 : 0 } }
    });
    if (flipY) {
      _flip = p;
    } else {
      _noFlip = p;
    }
    return p;
  }
  function makeBindGroup(device, pipeline, inView, outView) {
    return device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: inView },
        { binding: 1, resource: outView }
      ]
    });
  }
  function encodeDispatch(encoder, pipeline, bg, w, h) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
    pass.end();
  }
  function decodeBrdfPng(engine, image) {
    const device = engine._device;
    const pipeline = getPipeline(device, false);
    const w = image.width;
    const h = image.height;
    const inputTex = device.createTexture({
      size: { width: w, height: h },
      format: "rgba8unorm",
      usage: TU.TEXTURE_BINDING | TU.COPY_DST | TU.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture({ source: image, flipY: false }, { texture: inputTex, premultipliedAlpha: false }, { width: w, height: h });
    const texture = device.createTexture({
      size: { width: w, height: h },
      format: "rgba16float",
      usage: TU.TEXTURE_BINDING | TU.STORAGE_BINDING
    });
    const bg = makeBindGroup(device, pipeline, inputTex.createView(), texture.createView());
    const enc = device.createCommandEncoder();
    encodeDispatch(enc, pipeline, bg, w, h);
    device.queue.submit([enc.finish()]);
    inputTex.destroy();
    return texture;
  }
  function uploadCubemapRGBD(engine, images, width, mipCount) {
    const device = engine._device;
    const pipeline = getPipeline(device, true);
    const texture = device.createTexture({
      size: { width, height: width, depthOrArrayLayers: 6 },
      format: "rgba16float",
      mipLevelCount: mipCount,
      usage: TU.TEXTURE_BINDING | TU.COPY_DST | TU.COPY_SRC | TU.RENDER_ATTACHMENT,
      dimension: "2d"
    });
    for (let mip = 0; mip < mipCount; mip++) {
      const mipSize = Math.max(1, width >> mip);
      const inputTex = device.createTexture({
        size: { width: mipSize, height: mipSize },
        format: "rgba8unorm",
        usage: TU.TEXTURE_BINDING | TU.COPY_DST | TU.RENDER_ATTACHMENT
      });
      const outputTex = device.createTexture({
        size: { width: mipSize, height: mipSize },
        format: "rgba16float",
        usage: TU.STORAGE_BINDING | TU.COPY_SRC
      });
      const bindGroup = makeBindGroup(device, pipeline, inputTex.createView(), outputTex.createView());
      for (let face = 0; face < 6; face++) {
        const idx = mip * 6 + face;
        if (idx >= images.length) {
          break;
        }
        device.queue.copyExternalImageToTexture({ source: images[idx], flipY: false }, { texture: inputTex, premultipliedAlpha: false }, { width: mipSize, height: mipSize });
        const encoder = device.createCommandEncoder();
        encodeDispatch(encoder, pipeline, bindGroup, mipSize, mipSize);
        encoder.copyTextureToTexture({ texture: outputTex }, { texture, origin: { x: 0, y: 0, z: face }, mipLevel: mip }, { width: mipSize, height: mipSize });
        device.queue.submit([encoder.finish()]);
      }
      inputTex.destroy();
      outputTex.destroy();
    }
    return texture;
  }
  var WGSL2, _device, _module, _noFlip, _flip;
  var init_rgbd_decode = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/loader-env/rgbd-decode.ts"() {
      "use strict";
      init_gpu_flags();
      WGSL2 = `override f:bool=false;@group(0)@binding(0)var t:texture_2d<f32>;@group(0)@binding(1)var o:texture_storage_2d<rgba16float,write>;@compute @workgroup_size(8,8)fn main(@builtin(global_invocation_id)g:vec3u){let d=textureDimensions(t);if(any(g.xy>=d)){return;}let c=textureLoad(t,vec2u(g.x,select(g.y,d.y-1u-g.y,f)),0);textureStore(o,g.xy,vec4f(pow(c.rgb,vec3f(2.2))/max(c.a,1.0/255.0),1));}`;
      _device = null;
      _module = null;
      _noFlip = null;
      _flip = null;
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\skybox.vertex.wgsl
  var skybox_vertex_default;
  var init_skybox_vertex = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\skybox.vertex.wgsl"() {
      skybox_vertex_default = "// Skybox Vertex Shader \u2014 matches Babylon BackgroundMaterial (REFLECTIONMAP_SKYBOX)\r\n// Outputs local position as cubemap direction (vPositionUVW) + world position for dithering\r\n\r\nstruct MeshUniforms {\r\n  world: mat4x4<f32>,\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> mesh: MeshUniforms;\r\n\r\nstruct VertexOutput {\r\n  @builtin(position) clipPos: vec4<f32>,\r\n  @location(0) positionUVW: vec3<f32>,\r\n  @location(1) positionW: vec3<f32>,\r\n};\r\n\r\n@vertex\r\nfn main(@location(0) position: vec3<f32>) -> VertexOutput {\r\n  var output: VertexOutput;\r\n  output.positionUVW = position;\r\n  // Infinite distance: strip translation (w=0), center at camera.\r\n  // Matches BJS skybox.infiniteDistance = true.\r\n  let worldPos = (mesh.world * vec4<f32>(position, 0.0)).xyz + scene.vEyePosition.xyz;\r\n  output.positionW = worldPos;\r\n  output.clipPos = scene.viewProjection * vec4<f32>(worldPos, 1.0);\r\n  return output;\r\n}\r\n";
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\skybox.fragment.wgsl
  var skybox_fragment_default;
  var init_skybox_fragment = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\skybox.fragment.wgsl"() {
      skybox_fragment_default = "// Skybox Fragment Shader \u2014 matches Babylon BackgroundMaterial\r\n// BJS loads a separate CDN skybox texture (backgroundSkybox.dds) that produces\r\n// exactly scene.clearColor when rendered through the BackgroundMaterial pipeline.\r\n// We replicate this by outputting the pre-computed clearColor directly from a UBO.\r\n\r\nstruct MeshUniforms {\r\n  world: mat4x4<f32>,\r\n  primaryColor: vec3<f32>,\r\n  _pad: f32,\r\n  // Pre-computed sRGB output color for the sky background (= scene.clearColor).\r\n  skyOutputColor: vec3<f32>,\r\n  _pad2: f32,\r\n};\r\n@group(1) @binding(0) var<uniform> mesh: MeshUniforms;\r\n\r\nstruct FragmentInput {\r\n  @location(0) positionUVW: vec3<f32>,\r\n  @location(1) positionW: vec3<f32>,\r\n};\r\n\r\n@fragment\r\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\r\n  var result = vec4<f32>(mesh.skyOutputColor, 1.0);\r\n\r\n  // Dithering (enableNoise=true, variance=0.5)\r\n  result = vec4<f32>(result.rgb + vec3<f32>(dither(input.positionW.xy, 0.5)), result.a);\r\n  result = max(result, vec4<f32>(0.0));\r\n\r\n  return result;\r\n}\r\n";
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/background-solid-skybox.ts
  var background_solid_skybox_exports = {};
  __export(background_solid_skybox_exports, {
    buildSolidSkyboxRenderable: () => buildSolidSkyboxRenderable
  });
  function createSkyboxBuffers(engine, S) {
    const positions = new F32([
      S,
      -S,
      S,
      -S,
      -S,
      S,
      -S,
      S,
      S,
      S,
      S,
      S,
      S,
      S,
      -S,
      -S,
      S,
      -S,
      -S,
      -S,
      -S,
      S,
      -S,
      -S,
      S,
      S,
      -S,
      S,
      -S,
      -S,
      S,
      -S,
      S,
      S,
      S,
      S,
      -S,
      S,
      S,
      -S,
      -S,
      S,
      -S,
      -S,
      -S,
      -S,
      S,
      -S,
      -S,
      S,
      S,
      -S,
      S,
      -S,
      S,
      S,
      -S,
      S,
      S,
      S,
      S,
      -S,
      S,
      S,
      -S,
      -S,
      -S,
      -S,
      -S,
      -S,
      -S,
      S
    ]);
    const indices = new U16([
      2,
      1,
      0,
      3,
      2,
      0,
      6,
      5,
      4,
      7,
      6,
      4,
      10,
      9,
      8,
      11,
      10,
      8,
      14,
      13,
      12,
      15,
      14,
      12,
      18,
      17,
      16,
      19,
      18,
      16,
      22,
      21,
      20,
      23,
      22,
      20
    ]);
    return {
      posBuffer: createMappedBuffer(engine, positions, BU.VERTEX),
      idxBuffer: createMappedBuffer(engine, indices, BU.INDEX),
      idxCount: 36
    };
  }
  function buildSkyboxWorldMatrix(rootPosition) {
    const world = new F32(16);
    world[0] = 1;
    world[5] = 1;
    world[10] = 1;
    world[15] = 1;
    world[12] = rootPosition[0];
    world[13] = rootPosition[1];
    world[14] = rootPosition[2];
    return world;
  }
  function createSkyboxMaterial() {
    function getLayout(engine) {
      const device = engine._device;
      if (_skyLayout && _skyCachedDevice === device) {
        return _skyLayout;
      }
      _skyLayout = createSingleUniformBGL(engine, "skybox-material", SS.VERTEX | SS.FRAGMENT);
      return _skyLayout;
    }
    return {
      getPipeline(_engine, sig) {
        const device = _engine._device;
        if (_skyCachedDevice !== device) {
          _skyPipelines.clear();
          _skyLayout = null;
          _skyCachedDevice = device;
        }
        const key = targetSignatureKey(sig);
        const cached = _skyPipelines.get(key);
        if (cached) {
          return cached;
        }
        const _vertModule = device.createShaderModule({ code: SCENE_UBO_WGSL + skybox_vertex_default, label: "skybox-vert" });
        const _fragModule = device.createShaderModule({ code: WGSL_DITHER + skybox_fragment_default, label: "skybox-frag" });
        const pipeline = device.createRenderPipeline(
          createDefaultPipelineDescriptor({
            _label: "skybox-pipeline",
            _engine,
            _bgls: [getSceneBindGroupLayout(_engine), getLayout(_engine)],
            _vertModule,
            _fragModule,
            _vertexBuffers: SKYBOX_POS_BUFFER,
            _format: sig._colorFormat,
            _depthStencilFormat: sig._depthStencilFormat,
            _depthCompare: sig._depthCompare,
            _msaaSamples: sig._sampleCount,
            _depthWriteEnabled: false
          })
        );
        _skyPipelines.set(key, pipeline);
        return pipeline;
      },
      createBindGroup(engine, meshUBO, _env) {
        const device = engine._device;
        return device.createBindGroup({
          layout: getLayout(engine),
          entries: [{ binding: 0, resource: { buffer: meshUBO } }]
        });
      }
    };
  }
  function buildSolidSkyboxRenderable(scene, envTextures, skyHalfSize, rootPosition, primaryColor) {
    const engine = scene.surface.engine;
    const skyboxWorld = buildSkyboxWorldMatrix(rootPosition);
    const cc = scene.clearColor;
    const skyBufs = createSkyboxBuffers(engine, skyHalfSize);
    const skyMat = createSkyboxMaterial();
    const skyOutputColor = [cc.r, cc.g, cc.b];
    const skyUBO = createSkyMeshUBO(engine, skyboxWorld, primaryColor, skyOutputColor);
    const skyBG = skyMat.createBindGroup(engine, skyUBO, envTextures);
    const r = {
      order: 0,
      // skybox renders first (behind everything)
      isTransparent: false,
      bind(eng, sig) {
        return {
          renderable: r,
          pipeline: skyMat.getPipeline(eng, sig),
          draw(pass) {
            pass.setBindGroup(1, skyBG);
            pass.setVertexBuffer(0, skyBufs.posBuffer);
            pass.setIndexBuffer(skyBufs.idxBuffer, "uint16");
            pass.drawIndexed(skyBufs.idxCount);
            return 1;
          }
        };
      }
    };
    return r;
  }
  function createSkyMeshUBO(engine, world, primaryColor, skyOutputColor) {
    const data = new F32(SKY_MESH_UNIFORM_SIZE / 4);
    data.set(world, 0);
    data[16] = primaryColor[0];
    data[17] = primaryColor[1];
    data[18] = primaryColor[2];
    data[20] = skyOutputColor[0];
    data[21] = skyOutputColor[1];
    data[22] = skyOutputColor[2];
    return createUniformBuffer(engine, data);
  }
  var SKY_MESH_UNIFORM_SIZE, SKYBOX_POS_BUFFER, _skyPipelines, _skyLayout, _skyCachedDevice;
  var init_background_solid_skybox = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/background-solid-skybox.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_skybox_vertex();
      init_skybox_fragment();
      init_scene_helpers();
      init_render_target();
      init_wgsl_helpers();
      init_scene_uniforms2();
      init_gpu_buffers();
      init_bgl_helpers();
      SKY_MESH_UNIFORM_SIZE = 96;
      SKYBOX_POS_BUFFER = [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }];
      _skyPipelines = /* @__PURE__ */ new Map();
      _skyLayout = null;
      _skyCachedDevice = null;
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\background.vertex.wgsl
  var background_vertex_default;
  var init_background_vertex = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\background.vertex.wgsl"() {
      background_vertex_default = "// Background Ground Vertex Shader\r\n// Matches BJS shd_15: DIFFUSE, OPACITYFRESNEL, PREMULTIPLYALPHA (no REFLECTION)\r\n\r\nstruct MeshUniforms {\r\n  world: mat4x4<f32>,\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> mesh: MeshUniforms;\r\n\r\nstruct VertexInput {\r\n  @location(0) position: vec3<f32>,\r\n  @location(1) normal: vec3<f32>,\r\n  @location(2) uv: vec2<f32>,\r\n};\r\n\r\nstruct VertexOutput {\r\n  @builtin(position) clipPos: vec4<f32>,\r\n  @location(0) vPositionW: vec3<f32>,\r\n  @location(1) vNormalW: vec3<f32>,\r\n  @location(2) vUV: vec2<f32>,\r\n};\r\n\r\n@vertex\r\nfn main(input: VertexInput) -> VertexOutput {\r\n  var output: VertexOutput;\r\n  let finalWorld = mesh.world;\r\n  let worldPos4 = finalWorld * vec4<f32>(input.position, 1.0);\r\n  output.vPositionW = worldPos4.xyz;\r\n  output.clipPos = scene.viewProjection * worldPos4;\r\n  let normalWorld = mat3x3<f32>(finalWorld[0].xyz, finalWorld[1].xyz, finalWorld[2].xyz);\r\n  output.vNormalW = normalize(normalWorld * input.normal);\r\n  output.vUV = input.uv;\r\n  return output;\r\n}\r\n";
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\background.ground.fragment.wgsl
  var background_ground_fragment_default;
  var init_background_ground_fragment = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\background.ground.fragment.wgsl"() {
      background_ground_fragment_default = "// Background Ground Fragment Shader\r\n// Matches BJS shd_16: DIFFUSE, OPACITYFRESNEL, PREMULTIPLYALPHA (no REFLECTION)\r\n// Verified via Spector.GPU capture of BJS scene 1\r\n\r\nstruct MeshUniforms {\r\n  world: mat4x4<f32>,\r\n  primaryColor: vec3<f32>,\r\n  alpha: f32,\r\n  backgroundCenter: vec3<f32>,\r\n  _pad: f32,\r\n};\r\n@group(1) @binding(0) var<uniform> mesh: MeshUniforms;\r\n\r\n@group(1) @binding(1) var groundTexture: texture_2d<f32>;\r\n@group(1) @binding(2) var groundSampler: sampler;\r\n\r\nstruct FragmentInput {\r\n  @location(0) vPositionW: vec3<f32>,\r\n  @location(1) vNormalW: vec3<f32>,\r\n  @location(2) vUV: vec2<f32>,\r\n};\r\n\r\n@fragment\r\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\r\n  let normalW = normalize(input.vNormalW);\r\n\r\n  // Sample diffuse texture (BJS backgroundGround.png: white RGB, radial alpha gradient)\r\n  let diffuseMap = textureSample(groundTexture, groundSampler, input.vUV);\r\n\r\n  // BJS: reflectionColor = vec4(1) (no REFLECTION define)\r\n  let diffuseColor = diffuseMap.rgb;\r\n  let colorBase = max(diffuseColor, vec3<f32>(0.0));\r\n  let mainColor = mesh.primaryColor;\r\n  let finalColor = colorBase * mainColor;\r\n\r\n  // Alpha starts from material alpha, multiplied by texture alpha\r\n  var finalAlpha = mesh.alpha * diffuseMap.a;\r\n\r\n  // OPACITYFRESNEL \u2014 BJS shd_16 lines 367-370\r\n  let viewAngleToFloor = dot(normalW, normalize(scene.vEyePosition.xyz - mesh.backgroundCenter));\r\n  const startAngle: f32 = 0.1;\r\n  let fadeFactor = clamp(viewAngleToFloor / startAngle, 0.0, 1.0);\r\n  finalAlpha *= fadeFactor * fadeFactor;\r\n\r\n  // Image processing (preserves alpha)\r\n  var color = vec4<f32>(finalColor, finalAlpha);\r\n  if (scene.vImageInfos.w >= 0.0) {\r\n    color = applyImageProcessing(color);\r\n  }\r\n\r\n  // PREMULTIPLYALPHA \u2014 BJS shd_16 line 373\r\n  color = vec4<f32>(color.rgb * color.a, color.a);\r\n\r\n  // Dithering\r\n  color = vec4<f32>(color.rgb + vec3<f32>(dither(input.vPositionW.xy, 0.5)), color.a);\r\n  color = max(color, vec4<f32>(0.0));\r\n\r\n  return color;\r\n}\r\n";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/background-ground.ts
  var background_ground_exports = {};
  __export(background_ground_exports, {
    buildGroundRenderable: () => buildGroundRenderable
  });
  async function buildGroundRenderable(engine, groundSize, rootPosition, primaryColor, groundTextureUrl, groundImagePromise, enableNoise = true) {
    const fragCode = SCENE_UBO_WGSL + WGSL_IMAGE_PROCESSING + (enableNoise ? WGSL_DITHER : WGSL_NO_DITHER) + background_ground_fragment_default;
    const gndMat = createGroundMaterial(enableNoise, fragCode);
    const eps = 2220446049250313e-31;
    const groundWorld = new F32(16);
    groundWorld[0] = 1;
    groundWorld[5] = eps;
    groundWorld[6] = -1;
    groundWorld[9] = 1;
    groundWorld[10] = eps;
    groundWorld[12] = rootPosition[0];
    groundWorld[13] = rootPosition[1];
    groundWorld[14] = rootPosition[2];
    groundWorld[15] = 1;
    const gndBufs = createGroundBuffers(engine, groundSize);
    const gndUBO = createBgMeshUBO(engine, groundWorld, primaryColor);
    const groundTex = await loadGroundTexture(engine, groundTextureUrl, groundImagePromise);
    const groundTexView = groundTex.createView();
    const groundSamp = getBilinearSampler(engine);
    const gndBG = gndMat.createBindGroup(engine, gndUBO, groundTexView, groundSamp);
    const r = {
      order: 200,
      // ground renders last (transparent)
      isTransparent: true,
      bind(eng, sig) {
        return {
          renderable: r,
          pipeline: gndMat.getPipeline(eng, sig),
          draw(pass) {
            pass.setBindGroup(1, gndBG);
            pass.setVertexBuffer(0, gndBufs.posBuffer);
            pass.setVertexBuffer(1, gndBufs.normBuffer);
            pass.setVertexBuffer(2, gndBufs.uvBuffer);
            pass.setIndexBuffer(gndBufs.idxBuffer, "uint16");
            pass.drawIndexed(gndBufs.idxCount);
            return 1;
          }
        };
      }
    };
    return r;
  }
  function createGroundMaterial(enableNoise, fragCode) {
    function getLayout(engine) {
      const device = engine._device;
      if (_gndLayout && _gndCachedDevice === device) {
        return _gndLayout;
      }
      _gndLayout = device.createBindGroupLayout({
        label: "ground-material",
        entries: [
          { binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } },
          { binding: 1, visibility: SS.FRAGMENT, texture: { sampleType: "float", viewDimension: "2d" } },
          { binding: 2, visibility: SS.FRAGMENT, sampler: { type: "filtering" } }
        ]
      });
      _gndCachedDevice = device;
      return _gndLayout;
    }
    return {
      getPipeline(engine, sig) {
        const device = engine._device;
        if (_gndCachedDevice !== device) {
          _gndPipelines.clear();
          _gndLayout = null;
          _gndCachedDevice = device;
        }
        const key = `${+enableNoise}|${targetSignatureKey(sig)}`;
        const cached = _gndPipelines.get(key);
        if (cached) {
          return cached;
        }
        const vertModule = device.createShaderModule({ code: SCENE_UBO_WGSL + background_vertex_default, label: "ground-vert" });
        const fragModule = device.createShaderModule({ code: fragCode, label: "ground-frag" });
        const pipeline = device.createRenderPipeline({
          label: "ground-pipeline",
          layout: device.createPipelineLayout({ bindGroupLayouts: [getSceneBindGroupLayout(engine), getLayout(engine)] }),
          vertex: {
            module: vertModule,
            entryPoint: "main",
            buffers: [
              { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
              { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
              { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] }
            ]
          },
          fragment: {
            module: fragModule,
            entryPoint: "main",
            targets: [
              {
                format: sig._colorFormat,
                blend: {
                  color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
                }
              }
            ]
          },
          depthStencil: {
            format: sig._depthStencilFormat ?? "depth24plus-stencil8",
            depthCompare: sig._depthCompare ?? "greater-equal",
            depthWriteEnabled: false
          },
          multisample: { count: sig._sampleCount },
          primitive: { topology: "triangle-list", cullMode: "back", frontFace: "ccw" }
        });
        _gndPipelines.set(key, pipeline);
        return pipeline;
      },
      createBindGroup(engine, meshUBO, groundTextureView, groundSampler) {
        const device = engine._device;
        return device.createBindGroup({
          layout: getLayout(engine),
          entries: [
            { binding: 0, resource: { buffer: meshUBO } },
            { binding: 1, resource: groundTextureView },
            { binding: 2, resource: groundSampler }
          ]
        });
      }
    };
  }
  function createGroundBuffers(engine, groundSize) {
    const h = groundSize / 2;
    const positions = new F32([
      -h,
      -h,
      0,
      h,
      -h,
      0,
      h,
      h,
      0,
      -h,
      h,
      0
    ]);
    const normals = new F32([
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
      1
    ]);
    const uvs = new F32([
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1
    ]);
    const indices = new U16([0, 2, 1, 0, 3, 2]);
    return {
      posBuffer: createMappedBuffer(engine, positions, BU.VERTEX),
      normBuffer: createMappedBuffer(engine, normals, BU.VERTEX),
      uvBuffer: createMappedBuffer(engine, uvs, BU.VERTEX),
      idxBuffer: createMappedBuffer(engine, indices, BU.INDEX),
      idxCount: 6
    };
  }
  function createBgMeshUBO(engine, world, primaryColor) {
    const data = new F32(BG_MESH_UNIFORM_SIZE / 4);
    data.set(world, 0);
    data[16] = primaryColor[0];
    data[17] = primaryColor[1];
    data[18] = primaryColor[2];
    data[19] = 0.9;
    data[20] = 0;
    data[21] = 0;
    data[22] = 0;
    return createUniformBuffer(engine, data);
  }
  async function loadGroundTexture(engine, url, preloadedImage) {
    const device = engine._device;
    if (!url) {
      const tex2 = device.createTexture({
        size: [1, 1],
        format: "rgba8unorm",
        usage: TU.TEXTURE_BINDING | TU.COPY_DST
      });
      device.queue.writeTexture({ texture: tex2 }, new U8([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]);
      return tex2;
    }
    const bmp = preloadedImage ? await preloadedImage : await fetch(url).then((r) => r.blob()).then((b) => createImageBitmap(b, { premultiplyAlpha: "none" }));
    const tex = device.createTexture({
      size: [bmp.width, bmp.height],
      format: "rgba8unorm",
      usage: TU.TEXTURE_BINDING | TU.COPY_DST | TU.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex }, [bmp.width, bmp.height]);
    bmp.close();
    return tex;
  }
  var WGSL_IMAGE_PROCESSING, BG_MESH_UNIFORM_SIZE, _gndPipelines, _gndLayout, _gndCachedDevice;
  var init_background_ground = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/background-ground.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_samplers();
      init_gpu_buffers();
      init_scene_helpers();
      init_render_target();
      init_background_vertex();
      init_background_ground_fragment();
      init_gpu_buffers();
      init_scene_uniforms2();
      init_wgsl_helpers();
      WGSL_IMAGE_PROCESSING = `
fn applyImageProcessing(result: vec4<f32>) -> vec4<f32> {
var rgb = result.rgb;
rgb *= scene.vImageInfos.x;
const tonemappingCalibration: f32 = 1.590579;
rgb = 1.0 - exp2(-tonemappingCalibration * rgb);
rgb = pow(rgb, vec3<f32>(1.0 / 2.2));
rgb = clamp(rgb, vec3<f32>(0.0), vec3<f32>(1.0));
let highContrast = rgb * rgb * (3.0 - 2.0 * rgb);
if (scene.vImageInfos.y < 1.0) {
rgb = mix(vec3<f32>(0.5), rgb, scene.vImageInfos.y);
} else {
rgb = mix(rgb, highContrast, scene.vImageInfos.y - 1.0);
}
rgb = max(rgb, vec3<f32>(0.0));
return vec4<f32>(rgb, result.a);
}
`;
      BG_MESH_UNIFORM_SIZE = 96;
      _gndPipelines = /* @__PURE__ */ new Map();
      _gndLayout = null;
      _gndCachedDevice = null;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/cubemap-skybox-material.ts
  function createCubemapSkyboxMaterial(label, vertCode, fragCode) {
    function getLayout(engine) {
      const device = engine._device;
      if (_cmCachedDevice !== device) {
        _cmPipelines.clear();
        _cmLayouts.clear();
        _cmCachedDevice = device;
      }
      const cached = _cmLayouts.get(label);
      if (cached) {
        return cached;
      }
      const layout = device.createBindGroupLayout({
        label: `${label}-material`,
        entries: [
          { binding: 0, visibility: SS.VERTEX | SS.FRAGMENT, buffer: { type: "uniform" } },
          { binding: 1, visibility: SS.FRAGMENT, texture: { sampleType: "float", viewDimension: "cube" } },
          { binding: 2, visibility: SS.FRAGMENT, sampler: { type: "filtering" } }
        ]
      });
      _cmLayouts.set(label, layout);
      return layout;
    }
    return {
      getPipeline(_engine, sig) {
        const device = _engine._device;
        if (_cmCachedDevice !== device) {
          _cmPipelines.clear();
          _cmLayouts.clear();
          _cmCachedDevice = device;
        }
        const key = `${label}|${targetSignatureKey(sig)}`;
        const cached = _cmPipelines.get(key);
        if (cached) {
          return cached;
        }
        const _vertModule = device.createShaderModule({ code: vertCode, label: `${label}-vert` });
        const _fragModule = device.createShaderModule({ code: fragCode, label: `${label}-frag` });
        const pipeline = device.createRenderPipeline(
          createDefaultPipelineDescriptor({
            _label: `${label}-pipeline`,
            _engine,
            _bgls: [getSceneBindGroupLayout(_engine), getLayout(_engine)],
            _vertModule,
            _fragModule,
            _vertexBuffers: SKYBOX_POS_BUFFER2,
            _format: sig._colorFormat,
            _depthStencilFormat: sig._depthStencilFormat,
            _depthCompare: sig._depthCompare,
            _msaaSamples: sig._sampleCount,
            _depthWriteEnabled: false
          })
        );
        _cmPipelines.set(key, pipeline);
        return pipeline;
      },
      createBindGroup(engine, meshUBO, cubeView, cubeSampler) {
        const device = engine._device;
        return device.createBindGroup({
          layout: getLayout(engine),
          entries: [
            { binding: 0, resource: { buffer: meshUBO } },
            { binding: 1, resource: cubeView },
            { binding: 2, resource: cubeSampler }
          ]
        });
      }
    };
  }
  var SKYBOX_POS_BUFFER2, _cmPipelines, _cmLayouts, _cmCachedDevice;
  var init_cubemap_skybox_material = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/cubemap-skybox-material.ts"() {
      "use strict";
      init_gpu_flags();
      init_scene_helpers();
      init_render_target();
      SKYBOX_POS_BUFFER2 = [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] }];
      _cmPipelines = /* @__PURE__ */ new Map();
      _cmLayouts = /* @__PURE__ */ new Map();
      _cmCachedDevice = null;
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\skybox-dds.vertex.wgsl
  var skybox_dds_vertex_default;
  var init_skybox_dds_vertex = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\skybox-dds.vertex.wgsl"() {
      skybox_dds_vertex_default = "// DDS Skybox Vertex Shader \u2014 standard world transform.\r\n// positionUVW uses local position for cube direction lookup.\r\n\r\nstruct MeshUniforms {\r\n  world: mat4x4<f32>,\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> mesh: MeshUniforms;\r\n\r\nstruct VertexOutput {\r\n  @builtin(position) clipPos: vec4<f32>,\r\n  @location(0) positionUVW: vec3<f32>,\r\n  @location(1) positionW: vec3<f32>,\r\n};\r\n\r\n@vertex\r\nfn main(@location(0) position: vec3<f32>) -> VertexOutput {\r\n  var output: VertexOutput;\r\n  output.positionUVW = position;\r\n  let worldPos = (mesh.world * vec4<f32>(position, 1.0)).xyz;\r\n  output.positionW = worldPos;\r\n  output.clipPos = scene.viewProjection * vec4<f32>(worldPos, 1.0);\r\n  return output;\r\n}\r\n";
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\skybox-dds.fragment.wgsl
  var skybox_dds_fragment_default;
  var init_skybox_dds_fragment = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\skybox-dds.fragment.wgsl"() {
      skybox_dds_fragment_default = "// DDS Cube Skybox Fragment Shader \u2014 samples DDS cube texture with BJS image processing.\r\n// Used by scenes that load backgroundSkybox.dds (createDefaultEnvironment).\r\n// Pipeline: exposure \u2192 Reinhard tonemap \u2192 gamma \u2192 contrast \u2192 dither.\r\n\r\nstruct MeshUniforms {\r\n  world: mat4x4<f32>,\r\n  primaryColor: vec3<f32>,\r\n  exposureLinear: f32,\r\n  contrast: f32,\r\n  _pad1: f32,\r\n  _pad2: f32,\r\n  _pad3: f32,\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> mesh: MeshUniforms;\r\n@group(1) @binding(1) var envCubemap: texture_cube<f32>;\r\n@group(1) @binding(2) var envSampler: sampler;\r\n\r\nstruct FragmentInput {\r\n  @location(0) positionUVW: vec3<f32>,\r\n  @location(1) positionW: vec3<f32>,\r\n};\r\n\r\n@fragment\r\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\r\n  let dir = normalize(input.positionUVW);\r\n  var color = textureSampleLevel(envCubemap, envSampler, dir, 0.0).rgb;\r\n\r\n  // BJS BackgroundMaterial: colorBase = reflectionColor.rgb * primaryColor.rgb\r\n  color *= mesh.primaryColor;\r\n\r\n  if (scene.vImageInfos.w >= 0.0) {\r\n    // Exposure\r\n    color *= mesh.exposureLinear;\r\n    // Reinhard tonemap (matches BJS toneMappingType 0)\r\n    color = 1.0 - exp2(-1.590579 * color);\r\n    // Gamma\r\n    color = pow(color, vec3<f32>(1.0 / 2.2));\r\n    color = saturate(color);\r\n\r\n    // Contrast\r\n    let highContrast = color * color * (3.0 - 2.0 * color);\r\n    color = mix(color, highContrast, mesh.contrast - 1.0);\r\n\r\n    // Dithering (enableNoise=true, variance=0.5)\r\n    color = color + vec3<f32>(dither(input.positionW.xy, 0.5));\r\n    color = max(color, vec3<f32>(0.0));\r\n  }\r\n\r\n  return vec4<f32>(color, 1.0);\r\n}\r\n";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/background-dds-skybox.ts
  var background_dds_skybox_exports = {};
  __export(background_dds_skybox_exports, {
    buildDdsSkyboxRenderable: () => buildDdsSkyboxRenderable
  });
  function createSkyboxBuffers2(engine, S) {
    const positions = new F32([
      S,
      -S,
      S,
      -S,
      -S,
      S,
      -S,
      S,
      S,
      S,
      S,
      S,
      S,
      S,
      -S,
      -S,
      S,
      -S,
      -S,
      -S,
      -S,
      S,
      -S,
      -S,
      S,
      S,
      -S,
      S,
      -S,
      -S,
      S,
      -S,
      S,
      S,
      S,
      S,
      -S,
      S,
      S,
      -S,
      -S,
      S,
      -S,
      -S,
      -S,
      -S,
      S,
      -S,
      -S,
      S,
      S,
      -S,
      S,
      -S,
      S,
      S,
      -S,
      S,
      S,
      S,
      S,
      -S,
      S,
      S,
      -S,
      -S,
      -S,
      -S,
      -S,
      -S,
      -S,
      S
    ]);
    const indices = new U16([
      2,
      1,
      0,
      3,
      2,
      0,
      6,
      5,
      4,
      7,
      6,
      4,
      10,
      9,
      8,
      11,
      10,
      8,
      14,
      13,
      12,
      15,
      14,
      12,
      18,
      17,
      16,
      19,
      18,
      16,
      22,
      21,
      20,
      23,
      22,
      20
    ]);
    return {
      posBuffer: createMappedBuffer(engine, positions, BU.VERTEX),
      idxBuffer: createMappedBuffer(engine, indices, BU.INDEX),
      idxCount: 36
    };
  }
  function buildSkyboxWorldMatrix2(rootPosition) {
    const world = new F32(16);
    world[0] = 1;
    world[5] = 1;
    world[10] = 1;
    world[15] = 1;
    world[12] = rootPosition[0];
    world[13] = rootPosition[1];
    world[14] = rootPosition[2];
    return world;
  }
  async function buildDdsSkyboxRenderable(scene, skyHalfSize, rootPosition, primaryColor, skyboxTextureUrl, enableNoise = true) {
    const engine = scene.surface.engine;
    const skyboxWorld = buildSkyboxWorldMatrix2(rootPosition);
    const skyBufs = createSkyboxBuffers2(engine, skyHalfSize);
    const { cubeView, sampler } = await loadDdsCube(engine, skyboxTextureUrl ?? DEFAULT_SKY_URL);
    const fragCode = SCENE_UBO_WGSL + (enableNoise ? WGSL_DITHER : WGSL_NO_DITHER) + skybox_dds_fragment_default;
    const mat = createCubemapSkyboxMaterial(enableNoise ? "skybox-dds" : "skybox-dds0", SCENE_UBO_WGSL + skybox_dds_vertex_default, fragCode);
    const ubo = createDdsMeshUBO(engine, skyboxWorld, primaryColor, scene.imageProcessing.exposure, scene.imageProcessing.contrast);
    const bindGroup = mat.createBindGroup(engine, ubo, cubeView, sampler);
    const r = {
      order: 0,
      isTransparent: false,
      bind(eng, sig) {
        return {
          renderable: r,
          pipeline: mat.getPipeline(eng, sig),
          draw(pass) {
            pass.setBindGroup(1, bindGroup);
            pass.setVertexBuffer(0, skyBufs.posBuffer);
            pass.setIndexBuffer(skyBufs.idxBuffer, "uint16");
            pass.drawIndexed(skyBufs.idxCount);
            return 1;
          }
        };
      }
    };
    return r;
  }
  function createDdsMeshUBO(engine, world, primaryColor, exposureLinear, contrast) {
    const data = new F32(SKY_DDS_UNIFORM_SIZE / 4);
    data.set(world, 0);
    data[16] = primaryColor[0];
    data[17] = primaryColor[1];
    data[18] = primaryColor[2];
    data[19] = exposureLinear;
    data[20] = contrast;
    return createUniformBuffer(engine, data);
  }
  async function loadDdsCube(engine, url) {
    const device = engine._device;
    const buf = await (await fetch(url)).arrayBuffer();
    const header = new I32(buf, 0, 32);
    const width = header[3];
    const height = header[4];
    const mipCount = Math.max(header[7], 1);
    const dataOffset = header[21] === 808540228 ? 128 + 20 : 128;
    const raw = new U8(buf, dataOffset);
    const fmt = "rgba16float";
    const tex = device.createTexture({
      size: [width, height, 6],
      format: fmt,
      mipLevelCount: mipCount,
      usage: TU.TEXTURE_BINDING | TU.COPY_DST | TU.RENDER_ATTACHMENT,
      dimension: "2d"
    });
    let offset = 0;
    for (let face = 0; face < 6; face++) {
      for (let m = 0; m < mipCount; m++) {
        const s = Math.max(width >> m, 1);
        device.queue.writeTexture(
          { texture: tex, origin: { x: 0, y: 0, z: face }, mipLevel: m },
          raw.buffer,
          { offset: raw.byteOffset + offset, bytesPerRow: s * 8 },
          { width: s, height: s }
        );
        offset += s * s * 8;
      }
    }
    const cubeView = tex.createView({ dimension: "cube" });
    const sampler = getOrCreateSampler(engine, {
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
      maxAnisotropy: 4
    });
    return { cubeView, sampler };
  }
  var SKY_DDS_UNIFORM_SIZE, DEFAULT_SKY_URL;
  var init_background_dds_skybox = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/background-dds-skybox.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_gpu_pool();
      init_gpu_buffers();
      init_wgsl_helpers();
      init_scene_uniforms2();
      init_cubemap_skybox_material();
      init_skybox_dds_vertex();
      init_skybox_dds_fragment();
      SKY_DDS_UNIFORM_SIZE = 96;
      DEFAULT_SKY_URL = "https://assets.babylonjs.com/core/environments/backgroundSkybox.dds";
    }
  });

  // vite-raw:E:\dev\babylon\DawnTest\Babylon-Lite\packages\babylon-lite\shaders\skybox-hdr.fragment.wgsl
  var skybox_hdr_fragment_default;
  var init_skybox_hdr_fragment = __esm({
    "vite-raw:E:\\dev\\babylon\\DawnTest\\Babylon-Lite\\packages\\babylon-lite\\shaders\\skybox-hdr.fragment.wgsl"() {
      skybox_hdr_fragment_default = "// HDR Skybox Fragment Shader \u2014 samples HDR environment cubemap with image processing.\r\n// Used when scene has an HDR environment rendered as the background.\r\n// Matches BJS BackgroundMaterial: cubemap at LOD 0 + exposure + gamma + contrast.\r\n\r\nstruct MeshUniforms {\r\n  world: mat4x4<f32>,\r\n  primaryColor: vec3<f32>,\r\n  _pad: f32,\r\n  skyOutputColor: vec3<f32>,\r\n  _pad2: f32,\r\n  exposureLinear: f32,\r\n  contrast: f32,\r\n  _pad3: f32,\r\n  _pad4: f32,\r\n};\r\n\r\n@group(1) @binding(0) var<uniform> mesh: MeshUniforms;\r\n@group(1) @binding(1) var envCubemap: texture_cube<f32>;\r\n@group(1) @binding(2) var envSampler: sampler;\r\n\r\nstruct FragmentInput {\r\n  @location(0) positionUVW: vec3<f32>,\r\n  @location(1) positionW: vec3<f32>,\r\n};\r\n\r\n@fragment\r\nfn main(input: FragmentInput) -> @location(0) vec4<f32> {\r\n  let dir = normalize(input.positionUVW);\r\n  var color = textureSampleLevel(envCubemap, envSampler, dir, 0.0).rgb;\r\n\r\n  // Image processing: exposure \u2192 gamma \u2192 contrast (matches BJS applyImageProcessing)\r\n  color *= mesh.exposureLinear;\r\n  color = pow(color, vec3<f32>(1.0 / 2.2));\r\n  color = clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));\r\n\r\n  let highContrast = color * color * (3.0 - 2.0 * color);\r\n  if (mesh.contrast < 1.0) { color = mix(vec3<f32>(0.5), color, mesh.contrast); }\r\n  else { color = mix(color, highContrast, mesh.contrast - 1.0); }\r\n  color = max(color, vec3<f32>(0.0));\r\n\r\n  return vec4<f32>(color, 1.0);\r\n}\r\n";
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/background-hdr-skybox.ts
  var background_hdr_skybox_exports = {};
  __export(background_hdr_skybox_exports, {
    buildHdrSkyboxRenderable: () => buildHdrSkyboxRenderable
  });
  function createSkyboxBuffers3(engine, S) {
    const positions = new F32([
      S,
      -S,
      S,
      -S,
      -S,
      S,
      -S,
      S,
      S,
      S,
      S,
      S,
      S,
      S,
      -S,
      -S,
      S,
      -S,
      -S,
      -S,
      -S,
      S,
      -S,
      -S,
      S,
      S,
      -S,
      S,
      -S,
      -S,
      S,
      -S,
      S,
      S,
      S,
      S,
      -S,
      S,
      S,
      -S,
      -S,
      S,
      -S,
      -S,
      -S,
      -S,
      S,
      -S,
      -S,
      S,
      S,
      -S,
      S,
      -S,
      S,
      S,
      -S,
      S,
      S,
      S,
      S,
      -S,
      S,
      S,
      -S,
      -S,
      -S,
      -S,
      -S,
      -S,
      -S,
      S
    ]);
    const indices = new U16([
      2,
      1,
      0,
      3,
      2,
      0,
      6,
      5,
      4,
      7,
      6,
      4,
      10,
      9,
      8,
      11,
      10,
      8,
      14,
      13,
      12,
      15,
      14,
      12,
      18,
      17,
      16,
      19,
      18,
      16,
      22,
      21,
      20,
      23,
      22,
      20
    ]);
    return {
      posBuffer: createMappedBuffer(engine, positions, BU.VERTEX),
      idxBuffer: createMappedBuffer(engine, indices, BU.INDEX),
      idxCount: 36
    };
  }
  function buildSkyboxWorldMatrix3(rootPosition) {
    const world = new F32(16);
    world[0] = 1;
    world[5] = 1;
    world[10] = 1;
    world[15] = 1;
    world[12] = rootPosition[0];
    world[13] = rootPosition[1];
    world[14] = rootPosition[2];
    return world;
  }
  function buildHdrSkyboxRenderable(scene, envTextures, skyHalfSize, rootPosition, primaryColor) {
    const engine = scene.surface.engine;
    const skyboxWorld = buildSkyboxWorldMatrix3(rootPosition);
    const cc = scene.clearColor;
    const skyBufs = createSkyboxBuffers3(engine, skyHalfSize);
    const mat = createCubemapSkyboxMaterial("skybox-hdr", SCENE_UBO_WGSL + skybox_vertex_default, skybox_hdr_fragment_default);
    const ubo = createSkyHdrMeshUBO(engine, skyboxWorld, primaryColor, [cc.r, cc.g, cc.b], scene.imageProcessing.exposure, scene.imageProcessing.contrast);
    const bindGroup = mat.createBindGroup(engine, ubo, envTextures.specularCubeView, envTextures.cubeSampler);
    const r = {
      order: 0,
      isTransparent: false,
      bind(eng, sig) {
        return {
          renderable: r,
          pipeline: mat.getPipeline(eng, sig),
          draw(pass) {
            pass.setBindGroup(1, bindGroup);
            pass.setVertexBuffer(0, skyBufs.posBuffer);
            pass.setIndexBuffer(skyBufs.idxBuffer, "uint16");
            pass.drawIndexed(skyBufs.idxCount);
            return 1;
          }
        };
      }
    };
    return r;
  }
  function createSkyHdrMeshUBO(engine, world, primaryColor, skyOutputColor, exposure, contrast) {
    const data = new F32(SKY_HDR_UNIFORM_SIZE / 4);
    data.set(world, 0);
    data[16] = primaryColor[0];
    data[17] = primaryColor[1];
    data[18] = primaryColor[2];
    data[20] = skyOutputColor[0];
    data[21] = skyOutputColor[1];
    data[22] = skyOutputColor[2];
    data[24] = exposure;
    data[25] = contrast;
    return createUniformBuffer(engine, data);
  }
  var SKY_HDR_UNIFORM_SIZE;
  var init_background_hdr_skybox = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/material/pbr/background-hdr-skybox.ts"() {
      "use strict";
      init_typed_arrays();
      init_gpu_flags();
      init_cubemap_skybox_material();
      init_skybox_vertex();
      init_skybox_hdr_fragment();
      init_scene_uniforms2();
      init_gpu_buffers();
      SKY_HDR_UNIFORM_SIZE = 112;
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/scene/scene-ubo-extras.ts
  function writeEnvShUbo(data, scene) {
    const sh = scene._envTextures?.sphericalHarmonics;
    if (sh) {
      data.set(sh, 40);
    }
  }
  function registerContributor(scene, contributor) {
    const list = scene._sceneUboContributors ?? (scene._sceneUboContributors = []);
    if (!list.includes(contributor)) {
      list.push(contributor);
    }
  }
  function registerEnvSceneUniforms(scene) {
    registerContributor(scene, writeEnvShUbo);
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

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_point_light();
  init_directional_light();
  init_spot_light();

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

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_node_material();

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-env/load-env.ts
  init_typed_arrays();
  init_gpu_pool();

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-env/env-helpers.ts
  init_samplers();
  function createEnvSamplers(engine) {
    return {
      cubeSampler: getTrilinearSampler(engine),
      brdfSampler: getBilinearSampler(engine)
    };
  }
  function assembleEnvironmentTextures(specularCube, brdfLut, irradianceSH, lodGenerationScale, engine) {
    const { cubeSampler, brdfSampler } = createEnvSamplers(engine);
    return {
      specularCube,
      specularCubeView: specularCube.createView({ dimension: "cube" }),
      brdfLut,
      brdfLutView: brdfLut.createView(),
      cubeSampler,
      brdfSampler,
      irradianceSH,
      sphericalHarmonics: polynomialToPreScaledHarmonics(irradianceSH),
      lodGenerationScale
    };
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/loader-env/load-env.ts
  init_mip_count();
  init_scene_size();
  var ENV_MAGIC = new U8([134, 22, 135, 150, 246, 214, 150, 54]);
  async function loadEnvironment(scene, url, options) {
    const engine = scene.surface.engine;
    const envPromise = fetch(url).then((r) => r.arrayBuffer());
    const brdfPromise = fetch(options.brdfUrl).then((r) => r.blob()).then((b) => createImageBitmap(b, { premultiplyAlpha: "none", colorSpaceConversion: "none" }));
    const envBuffer = await envPromise;
    const { faceBlobs, irradianceSH, width, mipCount } = parseEnvFile(envBuffer);
    const faceImages = await Promise.all(faceBlobs.map((blob) => createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" })));
    const { uploadCubemapRGBD: uploadCubemapRGBD2, decodeBrdfPng: decodeBrdfPng2 } = await Promise.resolve().then(() => (init_rgbd_decode(), rgbd_decode_exports));
    const specularCube = uploadCubemapRGBD2(engine, faceImages, width, mipCount);
    for (const img of faceImages) {
      img.close();
    }
    const brdfImage = await brdfPromise;
    const brdfLut = decodeBrdfPng2(engine, brdfImage);
    brdfImage.close();
    const textures = assembleEnvironmentTextures(specularCube, brdfLut, irradianceSH, 0.8, engine);
    scene._envTextures = textures;
    registerEnvSceneUniforms(scene);
    acquireGPUTexture(specularCube);
    acquireGPUTexture(brdfLut);
    scene._disposables.push(() => {
      releaseGPUTexture(specularCube);
      releaseGPUTexture(brdfLut);
    });
    scene.imageProcessing.toneMappingEnabled = true;
    scene.imageProcessing.exposure = 0.8;
    scene.imageProcessing.contrast = 1.2;
    const groundUrl = options?.groundTextureUrl;
    const groundTexPromise = groundUrl ? fetch(groundUrl).then((r) => r.blob()).then((b) => createImageBitmap(b, { premultiplyAlpha: "none" })) : void 0;
    const skyboxUrl = options?.skyboxUrl;
    const skyboxIsDds = skyboxUrl != null && skyboxUrl.toLowerCase().endsWith(".dds");
    const skyboxIsEnv = skyboxUrl != null && (skyboxUrl === url || skyboxUrl.toLowerCase().endsWith(".env"));
    const bgOptions = {
      skipSkybox: skyboxIsDds || skyboxIsEnv || options?.skipSkybox,
      skipGround: options?.skipGround
    };
    scene._deferredBuilders.push(async () => {
      const primaryColor = scene.environmentPrimaryColor ?? [0.08697355964132344, 0.08697355964132344, 0.2122208331110881];
      const { groundSize, skyboxSize: autoSkyboxSize, rootPosition } = computeSceneSize(scene, options?.skyboxSize);
      const skyHalfSize = autoSkyboxSize / 2;
      if (!bgOptions.skipSkybox) {
        const { buildSolidSkyboxRenderable: buildSolidSkyboxRenderable2 } = await Promise.resolve().then(() => (init_background_solid_skybox(), background_solid_skybox_exports));
        scene._renderables.push(buildSolidSkyboxRenderable2(scene, textures, skyHalfSize, rootPosition, primaryColor));
      }
      if (!bgOptions.skipGround) {
        const { buildGroundRenderable: buildGroundRenderable2 } = await Promise.resolve().then(() => (init_background_ground(), background_ground_exports));
        scene._renderables.push(await buildGroundRenderable2(engine, groundSize, rootPosition, primaryColor, groundUrl, groundTexPromise));
      }
      if (skyboxIsDds) {
        const { buildDdsSkyboxRenderable: buildDdsSkyboxRenderable2 } = await Promise.resolve().then(() => (init_background_dds_skybox(), background_dds_skybox_exports));
        scene._renderables.push(await buildDdsSkyboxRenderable2(scene, skyHalfSize, rootPosition, primaryColor, skyboxUrl));
      }
      if (skyboxIsEnv) {
        const { buildHdrSkyboxRenderable: buildHdrSkyboxRenderable2 } = await Promise.resolve().then(() => (init_background_hdr_skybox(), background_hdr_skybox_exports));
        scene._renderables.push(buildHdrSkyboxRenderable2(scene, textures, skyHalfSize, rootPosition, primaryColor));
      }
    });
    return textures;
  }
  function parseEnvFile(buffer) {
    const bytes = new U8(buffer);
    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== ENV_MAGIC[i]) {
        throw new Error("Invalid .env file: bad magic");
      }
    }
    let pos = 8;
    while (pos < bytes.length && bytes[pos] !== 0) {
      pos++;
    }
    const jsonStr = new TextDecoder().decode(bytes.subarray(8, pos));
    pos++;
    const binaryStart = pos;
    const manifest = JSON.parse(jsonStr);
    const width = manifest.width;
    const mipCount = mipLevelCount(width, width);
    const irr = manifest.irradiance;
    const irradianceSH = new F32(27);
    const shKeys = ["x", "y", "z", "xx", "yy", "zz", "yz", "zx", "xy"];
    for (let i = 0; i < 9; i++) {
      const coeff = irr[shKeys[i]];
      irradianceSH[i * 3] = coeff[0];
      irradianceSH[i * 3 + 1] = coeff[1];
      irradianceSH[i * 3 + 2] = coeff[2];
    }
    const mipmaps = manifest.specular.mipmaps;
    const imageType = manifest.imageType || "image/png";
    const faceBlobs = [];
    for (const entry of mipmaps) {
      const start = binaryStart + entry.position;
      const slice = buffer.slice(start, start + entry.length);
      faceBlobs.push(new Blob([slice], { type: imageType }));
    }
    return { faceBlobs, irradianceSH, width, mipCount };
  }
  function polynomialToPreScaledHarmonics(poly) {
    const C00xy = 0.3333338747897695;
    const C00z = 0.33333298856284405;
    const C1 = 1.4999984284682104;
    const C2 = 3.999982863580422;
    const C20zz = 1.3333326611423701;
    const C20xy = 0.6666653397393608;
    const C22 = 1.999991431790211;
    const out = new F32(36);
    for (let i = 0; i < 3; i++) {
      const x = poly[i];
      const y = poly[3 + i];
      const z = poly[6 + i];
      const xx = poly[9 + i];
      const yy = poly[12 + i];
      const zz = poly[15 + i];
      const yz = poly[18 + i];
      const zx = poly[21 + i];
      const xy = poly[24 + i];
      out[i] = (xx + yy) * C00xy + zz * C00z;
      out[4 + i] = y * C1;
      out[8 + i] = z * C1;
      out[12 + i] = x * C1;
      out[16 + i] = xy * C2;
      out[20 + i] = yz * C2;
      out[24 + i] = zz * C20zz - (xx + yy) * C20xy;
      out[28 + i] = zx * C2;
      out[32 + i] = (xx - yy) * C22;
    }
    return out;
  }

  // ../../../Babylon-Lite/lab/lite/src/shared/scene70-nme.ts
  var SCENE70_NME_JSON = {
    tags: null,
    ignoreAlpha: false,
    maxSimultaneousLights: 4,
    mode: 0,
    forceAlphaBlending: false,
    id: "scene70nm",
    name: "Scene70NME",
    customType: "BABYLON.NodeMaterial",
    checkReadyOnEveryCall: false,
    checkReadyOnlyOnce: false,
    state: "",
    alpha: 1,
    backFaceCulling: true,
    sideOrientation: 1,
    alphaMode: 2,
    _needAlphaBlending: false,
    _needAlphaTesting: false,
    forceDepthWrite: false,
    separateCullingPass: false,
    fogEnabled: true,
    pointSize: 1,
    zOffset: 0,
    zOffsetUnits: 0,
    pointsCloud: false,
    fillMode: 0,
    editorData: null,
    customBlocks: [],
    blocks: [
      // Vertex inputs (positions/normals/system matrices) — same as scene 67.
      {
        customType: "BABYLON.InputBlock",
        id: 1,
        name: "position",
        target: 1,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 8,
        mode: 1,
        systemValue: null,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 2,
        name: "normal",
        target: 1,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 8,
        mode: 1,
        systemValue: null,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 3,
        name: "worldViewProjection",
        target: 1,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 128,
        mode: 0,
        systemValue: 6,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 4,
        name: "world",
        target: 1,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 128,
        mode: 0,
        systemValue: 1,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 5,
        name: "cameraPosition",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 8,
        mode: 0,
        systemValue: 7,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 6,
        name: "baseColor",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 32,
        mode: 0,
        systemValue: null,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "BABYLON.Color3",
        value: [1, 0.55, 0.08],
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 7,
        name: "metallic",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 1,
        mode: 0,
        systemValue: null,
        animationType: 0,
        min: 0,
        max: 1,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "number",
        value: 1,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 8,
        name: "roughness",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 1,
        mode: 0,
        systemValue: null,
        animationType: 0,
        min: 0,
        max: 1,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "number",
        value: 0.28,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      // Vertex transform chain.
      {
        customType: "BABYLON.TransformBlock",
        id: 9,
        name: "TransformWVP",
        target: 1,
        inputs: [
          { name: "vector", inputName: "vector", targetBlockId: 1, targetConnectionName: "output" },
          { name: "transform", inputName: "transform", targetBlockId: 3, targetConnectionName: "output" }
        ],
        outputs: [{ name: "output" }, { name: "xyz" }],
        complementZ: 0,
        complementW: 1
      },
      {
        customType: "BABYLON.TransformBlock",
        id: 10,
        name: "TransformWorldPos",
        target: 1,
        inputs: [
          { name: "vector", inputName: "vector", targetBlockId: 1, targetConnectionName: "output" },
          { name: "transform", inputName: "transform", targetBlockId: 4, targetConnectionName: "output" }
        ],
        outputs: [{ name: "output" }, { name: "xyz" }],
        complementZ: 0,
        complementW: 1
      },
      {
        customType: "BABYLON.TransformBlock",
        id: 11,
        name: "TransformWorldNormal",
        target: 1,
        inputs: [
          { name: "vector", inputName: "vector", targetBlockId: 2, targetConnectionName: "output" },
          { name: "transform", inputName: "transform", targetBlockId: 4, targetConnectionName: "output" }
        ],
        outputs: [{ name: "output" }, { name: "xyz" }],
        complementZ: 0,
        complementW: 0
      },
      {
        customType: "BABYLON.VertexOutputBlock",
        id: 12,
        name: "VertexOutput",
        target: 1,
        inputs: [{ name: "vector", inputName: "vector", targetBlockId: 9, targetConnectionName: "output" }],
        outputs: []
      },
      // ReflectionBlock — env IBL marker (same as scene 67).
      {
        customType: "BABYLON.ReflectionBlock",
        id: 15,
        name: "Reflection",
        target: 4,
        inputs: [
          { name: "position", inputName: "position", targetBlockId: 1, targetConnectionName: "output" },
          { name: "world", inputName: "world", targetBlockId: 4, targetConnectionName: "output" },
          { name: "cameraPosition", inputName: "cameraPosition", targetBlockId: 5, targetConnectionName: "output" },
          { name: "view", inputName: "view" }
        ],
        outputs: [{ name: "reflection" }],
        useSphericalHarmonics: true,
        forceIrradianceInFragment: false
      },
      // ── Clear-coat parameters (scene 68 additions) ──
      {
        customType: "BABYLON.InputBlock",
        id: 20,
        name: "ccIntensity",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 1,
        mode: 0,
        systemValue: null,
        animationType: 0,
        min: 0,
        max: 1,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "number",
        value: 1,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 21,
        name: "ccRoughness",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 1,
        mode: 0,
        systemValue: null,
        animationType: 0,
        min: 0,
        max: 1,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "number",
        value: 0,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 22,
        name: "ccIor",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 1,
        mode: 0,
        systemValue: null,
        animationType: 0,
        min: 1,
        max: 3,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "number",
        value: 1.5,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.ClearCoatBlock",
        id: 23,
        name: "ClearCoat",
        target: 4,
        inputs: [
          { name: "intensity", inputName: "intensity", targetBlockId: 20, targetConnectionName: "output" },
          { name: "roughness", inputName: "roughness", targetBlockId: 21, targetConnectionName: "output" },
          { name: "indexOfRefraction", inputName: "indexOfRefraction", targetBlockId: 22, targetConnectionName: "output" },
          { name: "normalMapColor", inputName: "normalMapColor" },
          { name: "uv", inputName: "uv" },
          { name: "tintColor", inputName: "tintColor" },
          { name: "tintAtDistance", inputName: "tintAtDistance" },
          { name: "tintThickness", inputName: "tintThickness" },
          { name: "worldTangent", inputName: "worldTangent" },
          { name: "worldNormal", inputName: "worldNormal" },
          { name: "TBN", inputName: "TBN" }
        ],
        outputs: [{ name: "clearcoat" }],
        remapF0OnInterfaceChange: true
      },
      // ── Anisotropy parameters (scene 70 additions) ──
      {
        customType: "BABYLON.InputBlock",
        id: 39,
        name: "uv",
        target: 1,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 4,
        mode: 1,
        systemValue: null,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 40,
        name: "anisoIntensity",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 1,
        mode: 0,
        systemValue: null,
        animationType: 0,
        min: 0,
        max: 1,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "number",
        value: 0.85,
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.InputBlock",
        id: 41,
        name: "anisoDirection",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 4,
        mode: 0,
        systemValue: null,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "BABYLON.Vector2",
        value: [1, 0.35],
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      {
        customType: "BABYLON.AnisotropyBlock",
        id: 42,
        name: "Anisotropy",
        target: 4,
        inputs: [
          { name: "intensity", inputName: "intensity", targetBlockId: 40, targetConnectionName: "output" },
          { name: "direction", inputName: "direction", targetBlockId: 41, targetConnectionName: "output" },
          { name: "uv", inputName: "uv", targetBlockId: 39, targetConnectionName: "output" },
          { name: "worldTangent", inputName: "worldTangent" },
          { name: "TBN", inputName: "TBN" },
          { name: "roughness", inputName: "roughness" }
        ],
        outputs: [{ name: "anisotropy" }]
      },
      // Flat tangent-space normal map color (0.5, 0.5, 1) → normal unchanged.
      // Required so PerturbNormalBlock has a normalMapColor input.
      {
        customType: "BABYLON.InputBlock",
        id: 50,
        name: "flatNormalColor",
        target: 2,
        inputs: [],
        outputs: [{ name: "output" }],
        type: 32,
        mode: 0,
        systemValue: null,
        animationType: 0,
        isBoolean: false,
        matrixMode: 0,
        isConstant: false,
        valueType: "BABYLON.Color3",
        value: [0.5, 0.5, 1],
        convertToGammaSpace: false,
        convertToLinearSpace: false
      },
      // PerturbNormalBlock with a flat normal — output normal == input normal.
      // Wired to PBR-MR.perturbedNormal so BJS skips the AnisotropyBlock's
      // _generateTBNSpace path (which has a worldNormal varying-prefix bug).
      {
        customType: "BABYLON.PerturbNormalBlock",
        id: 51,
        name: "PerturbNormal",
        target: 4,
        inputs: [
          { name: "worldPosition", inputName: "worldPosition", targetBlockId: 10, targetConnectionName: "output" },
          { name: "worldNormal", inputName: "worldNormal", targetBlockId: 11, targetConnectionName: "output" },
          { name: "worldTangent", inputName: "worldTangent" },
          { name: "uv", inputName: "uv", targetBlockId: 39, targetConnectionName: "output" },
          { name: "normalMapColor", inputName: "normalMapColor", targetBlockId: 50, targetConnectionName: "output" },
          { name: "strength", inputName: "strength" }
        ],
        outputs: [{ name: "output" }],
        invertX: false,
        invertY: false
      },
      // PBR-MR — scene 67 setup (no clearcoat / sheen) + anisotropy.
      {
        customType: "BABYLON.PBRMetallicRoughnessBlock",
        id: 13,
        name: "PBR",
        target: 4,
        inputs: [
          { name: "worldPosition", inputName: "worldPosition", targetBlockId: 10, targetConnectionName: "output" },
          { name: "worldNormal", inputName: "worldNormal", targetBlockId: 11, targetConnectionName: "output" },
          { name: "view", inputName: "view" },
          { name: "cameraPosition", inputName: "cameraPosition", targetBlockId: 5, targetConnectionName: "output" },
          { name: "perturbedNormal", inputName: "perturbedNormal", targetBlockId: 51, targetConnectionName: "output" },
          { name: "baseColor", inputName: "baseColor", targetBlockId: 6, targetConnectionName: "output" },
          { name: "metallic", inputName: "metallic", targetBlockId: 7, targetConnectionName: "output" },
          { name: "roughness", inputName: "roughness", targetBlockId: 8, targetConnectionName: "output" },
          { name: "ambientOcc", inputName: "ambientOcc" },
          { name: "opacity", inputName: "opacity" },
          { name: "indexOfRefraction", inputName: "indexOfRefraction" },
          { name: "ambientColor", inputName: "ambientColor" },
          { name: "reflection", inputName: "reflection", targetBlockId: 15, targetConnectionName: "reflection" },
          { name: "clearcoat", inputName: "clearcoat" },
          { name: "sheen", inputName: "sheen" },
          { name: "subsurface", inputName: "subsurface" },
          { name: "anisotropy", inputName: "anisotropy", targetBlockId: 42, targetConnectionName: "anisotropy" }
        ],
        outputs: [
          { name: "ambientClr" },
          { name: "diffuseDir" },
          { name: "specularDir" },
          { name: "clearcoatDir" },
          { name: "sheenDir" },
          { name: "diffuseInd" },
          { name: "specularInd" },
          { name: "clearcoatInd" },
          { name: "sheenInd" },
          { name: "refraction" },
          { name: "lighting" },
          { name: "shadow" },
          { name: "alpha" }
        ],
        lightFalloff: 0,
        useAlphaTest: false,
        alphaTestCutoff: 0.4,
        useAlphaBlending: false,
        useRadianceOverAlpha: false,
        useSpecularOverAlpha: false,
        enableSpecularAntiAliasing: false,
        realTimeFiltering: false,
        realTimeFilteringQuality: 8,
        useEnergyConservation: true,
        useRadianceOcclusion: true,
        useHorizonOcclusion: true,
        unlit: false,
        forceNormalForward: false,
        debugMode: 0,
        debugLimit: 0,
        debugFactor: 1
      },
      {
        customType: "BABYLON.FragmentOutputBlock",
        id: 14,
        name: "FragmentOutput",
        target: 2,
        inputs: [
          { name: "rgba", inputName: "rgba" },
          { name: "rgb", inputName: "rgb", targetBlockId: 13, targetConnectionName: "lighting" },
          { name: "a", inputName: "a" }
        ],
        outputs: [],
        convertToGammaSpace: false,
        convertToLinearSpace: false,
        useLogarithmicDepth: false
      }
    ],
    outputNodes: [12, 14]
  };

  // ../../../Babylon-Lite/lab/lite/src/lite/scene70.ts
  async function main() {
    const __initStart = performance.now();
    const canvas = document.getElementById("renderCanvas");
    const engine = await createEngine(canvas);
    const scene = createSceneContext(engine);
    scene.clearColor = { r: 0, g: 0, b: 0, a: 1 };
    scene.camera = createArcRotateCamera(-Math.PI / 2, Math.PI / 2, 7, { x: 0, y: 0, z: 0 });
    scene.camera.nearPlane = 0.1;
    scene.camera.farPlane = 1e3;
    attachControl(scene.camera, canvas, scene);
    await loadEnvironment(scene, "https://assets.babylonjs.com/core/environments/environmentSpecular.env", {
      skipSkybox: true,
      skipGround: true,
      brdfUrl: "/brdf-lut.png"
    });
    scene.imageProcessing.toneMappingEnabled = false;
    scene.imageProcessing.exposure = 1;
    scene.imageProcessing.contrast = 1;
    const hemi = createHemisphericLight([0, 1, 0], 1);
    addToScene(scene, hemi);
    const point = createPointLight([0, 5, -2], 1);
    addToScene(scene, point);
    const spot = createSpotLight([-0.5, 0, -2], [0, 0, 1], Math.PI / 2, 1, 1);
    addToScene(scene, spot);
    const dir = createDirectionalLight([1, -1, 1], 10);
    addToScene(scene, dir);
    const sphere = createSphere(engine, { segments: 32, diameter: 2 });
    const material = await parseNodeMaterialFromSnippet(engine, "", { json: SCENE70_NME_JSON });
    sphere.material = material;
    addToScene(scene, sphere);
    await registerScene(scene);
    await startEngine(engine);
    canvas.dataset.drawCalls = String(engine.drawCallCount);
    canvas.dataset.initMs = String(performance.now() - __initStart);
    canvas.dataset.ready = "true";
  }
  main().catch((err) => {
    console.error(err);
    const canvas = document.getElementById("renderCanvas");
    if (canvas) {
      canvas.dataset.error = String(err);
    }
  });
})();
