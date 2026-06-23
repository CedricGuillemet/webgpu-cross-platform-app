"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };

  // ../../../Babylon-Lite/packages/babylon-lite/src/engine/typed-arrays.ts
  var F32;
  var init_typed_arrays = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/engine/typed-arrays.ts"() {
      "use strict";
      F32 = Float32Array;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/types.ts
  var INTERP_LINEAR, INTERP_STEP, INTERP_CUBICSPLINE;
  var init_types = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/animation/types.ts"() {
      "use strict";
      INTERP_LINEAR = 0;
      INTERP_STEP = 1;
      INTERP_CUBICSPLINE = 2;
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
      init_types();
      _quat = new F32([0, 0, 0, 1]);
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/animation-group.ts
  function playAnimation(group) {
    group.isPlaying = true;
    group._stopped = false;
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
  var DEFAULT_FRAME_RATE;
  var init_animation_group = __esm({
    "../../../Babylon-Lite/packages/babylon-lite/src/animation/animation-group.ts"() {
      "use strict";
      DEFAULT_FRAME_RATE = 60;
    }
  });

  // ../../../Babylon-Lite/packages/babylon-lite/src/index.ts
  init_animation_group();

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/animation-group-task.ts
  init_animation_group();

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/animation-manager.ts
  function createAnimationTask(update, options) {
    return {
      _entityType: "animation-task",
      active: true,
      _update: update,
      _category: options?.category,
      _dispose: options?.dispose
    };
  }
  function createAnimationManager(options) {
    return {
      animations: [],
      fixedDeltaMs: options?.fixedDeltaMs ?? 0,
      running: false,
      engine: options?.engine,
      onUpdate: options?.onUpdate,
      _rafId: 0,
      _lastTime: 0
    };
  }
  function addAnimationTask(manager, task) {
    const owner = task._owner;
    if (owner === manager) {
      return;
    }
    if (owner) {
      throw new Error("AnimationTask is already attached to another AnimationManager");
    }
    task.active = true;
    task._owner = manager;
    manager.animations.push(task);
  }
  function updateAnimationManager(manager, deltaMs) {
    const step = manager.fixedDeltaMs > 0 ? manager.fixedDeltaMs : deltaMs;
    if (!Number.isFinite(step) || step < 0) {
      return;
    }
    const handledCategory = manager._taskCategoryHandler?.(manager, step) ? manager._taskCategory : void 0;
    const tasks = manager.animations.slice();
    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];
      if (!task.active || task._category && task._category === handledCategory) {
        continue;
      }
      task._update(manager, step, task);
    }
  }
  function startAnimationManager(manager) {
    if (manager.running) {
      return;
    }
    if (typeof requestAnimationFrame !== "function" || typeof cancelAnimationFrame !== "function") {
      throw new Error("AnimationManager autonomous mode requires requestAnimationFrame");
    }
    manager.running = true;
    manager._lastTime = 0;
    const tick = (now) => {
      if (!manager.running) {
        return;
      }
      const deltaMs = manager._lastTime > 0 ? now - manager._lastTime : 0;
      manager._lastTime = now;
      const step = manager.fixedDeltaMs > 0 ? manager.fixedDeltaMs : deltaMs;
      updateAnimationManager(manager, deltaMs);
      manager.onUpdate?.(step);
      manager._rafId = requestAnimationFrame(tick);
    };
    manager._rafId = requestAnimationFrame(tick);
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/animation-group-task.ts
  var ANIMATION_GROUP_TASK_CATEGORY = "animation-group";
  function getMutableAnimationGroups(manager) {
    const managerInternal = manager;
    let groups = managerInternal._animationGroups;
    if (!groups) {
      groups = [];
      managerInternal._animationGroups = groups;
    }
    return groups;
  }
  function addAnimationGroup(manager, group) {
    const groupInternal = group;
    const owner = groupInternal._animationManager;
    if (owner && owner !== manager) {
      throw new Error(`AnimationGroup "${group.name}" is already attached to another AnimationManager`);
    }
    if (owner === manager) {
      return;
    }
    const task = groupInternal._animationTask ?? createAnimationTask(
      (taskManager, deltaMs) => {
        tickAnimation(group, deltaMs, taskManager.engine);
      },
      {
        category: ANIMATION_GROUP_TASK_CATEGORY,
        dispose: (ownerManager) => {
          const groups = ownerManager._animationGroups;
          const index = groups?.indexOf(group) ?? -1;
          if (groups && index !== -1) {
            groups.splice(index, 1);
          }
          if (groupInternal._animationManager === ownerManager) {
            groupInternal._animationManager = void 0;
          }
        }
      }
    );
    getMutableAnimationGroups(manager).push(group);
    groupInternal._animationManager = manager;
    groupInternal._animationTask = task;
    addAnimationTask(manager, task);
  }

  // ../../../Babylon-Lite/packages/babylon-lite/src/animation/property-animation.ts
  init_typed_arrays();
  init_animation_group();
  init_types();
  init_evaluate();
  var DEFAULT_FRAME_RATE2 = 60;
  function createPropertyAnimationClip(name, tracks, options) {
    if (tracks.length === 0) {
      throw new Error("createPropertyAnimationClip requires at least one track");
    }
    const frameRate = options?.frameRate ?? tracks[0]?.frameRate ?? DEFAULT_FRAME_RATE2;
    let duration = 0;
    const builtTracks = tracks.map((track) => {
      const trackFrameRate = track.frameRate ?? frameRate;
      const sampler = createSampler(track, trackFrameRate);
      const trackDuration = sampler.input[sampler.input.length - 1] ?? 0;
      if (trackDuration > duration) {
        duration = trackDuration;
      }
      return {
        path: track.path,
        sampler,
        stride: getTrackStride(track),
        quaternion: track.quaternion === true || track.path === "rotationQuaternion" || track.path.endsWith(".rotationQuaternion")
      };
    });
    return { name, tracks: builtTracks, duration, frameRate };
  }
  function createPropertyAnimationGroup(manager, target, clip, options) {
    const runtimeTracks = [];
    for (let i = 0; i < clip.tracks.length; i++) {
      const track = clip.tracks[i];
      const binding = resolvePropertyBinding(target, track.path, track.stride);
      runtimeTracks.push({
        sampler: track.sampler,
        stride: track.stride,
        quaternion: track.quaternion,
        writer: binding.writer,
        mixTarget: binding.mixTarget,
        mixProperty: binding.mixProperty
      });
    }
    const fromTime = options?.fromTime ?? (options?.fromFrame !== void 0 ? options.fromFrame / clip.frameRate : 0);
    const toTime = options?.toTime ?? (options?.toFrame !== void 0 ? options.toFrame / clip.frameRate : clip.duration);
    if (!(toTime > fromTime)) {
      throw new Error("Animation play range must have toTime greater than fromTime");
    }
    const group = createPointerAnimationGroup(clip.name, clip.duration, clip.frameRate, runtimeTracks, fromTime, toTime, options);
    group.loopAnimation = options?.loop ?? true;
    group.speedRatio = options?.speedRatio ?? 1;
    group._propertyMixer = [runtimeTracks, fromTime, toTime, clip.duration];
    playAnimation(group);
    addAnimationGroup(manager, group);
    return group;
  }
  function createPointerAnimationGroup(name, duration, frameRate, tracks, fromTime, toTime, options) {
    const ctrl = {
      time: fromTime,
      playing: false,
      speedRatio: options?.speedRatio ?? 1,
      loop: options?.loop ?? true,
      tick(deltaMs) {
        if (ctrl.playing) {
          ctrl.time += deltaMs / 1e3 * ctrl.speedRatio;
        }
        const duration2 = Math.max(0, toTime - fromTime);
        if (duration2 <= 0) {
          return;
        }
        if (ctrl.loop && ctrl.playing) {
          ctrl.time = fromTime + (ctrl.time - fromTime) % duration2;
          if (ctrl.time < fromTime) {
            ctrl.time += duration2;
          }
        } else {
          ctrl.time = Math.min(Math.max(ctrl.time, fromTime), toTime);
        }
        for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
          const track = tracks[trackIndex];
          evaluateSampler(track.sampler, ctrl.time, track.stride, track.quaternion, _pointerScratch, 0);
          track.writer(_pointerScratch, 0);
        }
      }
    };
    return {
      name,
      duration,
      frameRate: frameRate || DEFAULT_FRAME_RATE2,
      isPlaying: false,
      currentFrame: fromTime,
      speedRatio: options?.speedRatio ?? 1,
      loopAnimation: options?.loop ?? true,
      weight: 1,
      _ctrl: ctrl,
      _stopped: false
    };
  }
  var _pointerScratch = new F32(16);
  function createSampler(track, frameRate) {
    if (track.keys.length === 0) {
      throw new Error(`Animation track "${track.path}" requires at least one key`);
    }
    if (!(frameRate > 0)) {
      throw new Error(`Animation track "${track.path}" requires a positive frameRate`);
    }
    const stride = getTrackStride(track);
    const sorted = [...track.keys].sort((a, b) => getKeyTime(a, frameRate, track.path) - getKeyTime(b, frameRate, track.path));
    const input = new F32(sorted.length);
    const output = new F32(sorted.length * stride);
    let lastTime = -Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const key = sorted[i];
      const time = getKeyTime(key, frameRate, track.path);
      if (time < lastTime) {
        throw new Error(`Animation track "${track.path}" key times must be monotonically increasing`);
      }
      input[i] = time;
      lastTime = time;
      writeKeyValue(track.path, key.value, stride, output, i * stride);
    }
    return {
      input,
      output,
      interpolation: track.interpolation === "step" ? INTERP_STEP : INTERP_LINEAR
    };
  }
  function getTrackStride(track) {
    const value = track.keys[0]?.value;
    if (value === void 0) {
      throw new Error(`Animation track "${track.path}" requires at least one key`);
    }
    return typeof value === "number" ? 1 : value.length;
  }
  function getKeyTime(key, frameRate, path) {
    const hasTime = key.time !== void 0;
    const hasFrame = key.frame !== void 0;
    if (hasTime === hasFrame) {
      throw new Error(`Animation key for "${path}" must provide exactly one of time or frame`);
    }
    const time = hasTime ? key.time : key.frame / frameRate;
    if (!(time >= 0)) {
      throw new Error(`Animation key for "${path}" must have a non-negative time`);
    }
    return time;
  }
  function writeKeyValue(path, value, stride, output, offset) {
    if (typeof value === "number") {
      if (stride !== 1) {
        throw new Error(`Animation key for "${path}" expected ${stride} values`);
      }
      output[offset] = value;
      return;
    }
    if (value.length !== stride) {
      throw new Error(`Animation key for "${path}" expected ${stride} values`);
    }
    for (let i = 0; i < stride; i++) {
      output[offset + i] = value[i];
    }
  }
  function resolvePropertyBinding(target, path, stride) {
    const parts = path.split(".");
    if (parts.length === 0 || parts.some((p) => p.length === 0)) {
      throw new Error(`Invalid animation property path "${path}"`);
    }
    let owner = target;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const record2 = asRecord(owner, path);
      if (!(part in record2)) {
        throw new Error(`Animation property path "${path}" could not resolve "${part}"`);
      }
      owner = record2[part];
    }
    const property = parts[parts.length - 1];
    const record = asRecord(owner, path);
    if (!(property in record)) {
      throw new Error(`Animation property path "${path}" could not resolve "${property}"`);
    }
    return { mixTarget: record, mixProperty: property, writer: createPropertyWriter(record, property, stride, path) };
  }
  function asRecord(value, path) {
    if (typeof value !== "object" && typeof value !== "function" || value === null) {
      throw new Error(`Animation property path "${path}" reached a non-object value`);
    }
    return value;
  }
  function isSettable(value) {
    return (typeof value === "object" || typeof value === "function") && value !== null && typeof value.set === "function";
  }
  function createPropertyWriter(target, property, stride, path) {
    if (stride === 1) {
      return (output, offset) => {
        target[property] = output[offset];
      };
    }
    if (stride > 4) {
      throw new Error(`Animation property path "${path}" has unsupported vector size ${stride}`);
    }
    const targetValue = target[property];
    if (isSettable(targetValue)) {
      switch (stride) {
        case 2:
          return (output, offset) => targetValue.set(output[offset], output[offset + 1]);
        case 3:
          return (output, offset) => targetValue.set(output[offset], output[offset + 1], output[offset + 2]);
        case 4:
          return (output, offset) => targetValue.set(output[offset], output[offset + 1], output[offset + 2], output[offset + 3]);
      }
    }
    const valueRecord = asRecord(targetValue, path);
    const components = "xyzw";
    for (let i = 0; i < stride; i++) {
      if (!(components[i] in valueRecord)) {
        throw new Error(`Animation property path "${path}" could not resolve component "${components[i]}"`);
      }
    }
    return (output, offset) => {
      for (let i = 0; i < stride; i++) {
        valueRecord[components[i]] = output[offset + i];
      }
    };
  }

  // ../../../Babylon-Lite/lab/lite/src/lite/scene153.ts
  var FRAME_RATE = 10;
  var END_FRAME = 2 * FRAME_RATE;
  var BACKGROUND = "#1f2433";
  var TRACK = "#596274";
  var BOX = "#f2b84b";
  function resizeCanvas(canvas) {
    const width = Math.max(1, Math.floor(canvas.clientWidth));
    const height = Math.max(1, Math.floor(canvas.clientHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }
  function draw(canvas, target) {
    resizeCanvas(canvas);
    canvas.dataset.animatedX = target.position.x.toFixed(4);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Scene 153 requires a 2D canvas context");
    }
    const w = canvas.width;
    const h = canvas.height;
    const y = h * 0.5;
    const centerX = w * 0.5;
    const scale = w * 0.18;
    const x = centerX + target.position.x * scale;
    const size = Math.max(28, Math.min(w, h) * 0.09);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = TRACK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(centerX - 2 * scale, y);
    ctx.lineTo(centerX + 2 * scale, y);
    ctx.stroke();
    ctx.fillStyle = BOX;
    ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
  }
  async function main() {
    const __initStart = performance.now();
    const canvas = document.getElementById("renderCanvas");
    const target = { position: { x: -2 } };
    const manager = createAnimationManager({
      onUpdate: () => draw(canvas, target)
    });
    const xSlide = createPropertyAnimationClip("standaloneXSlide", [
      {
        path: "position.x",
        frameRate: FRAME_RATE,
        keys: [
          { frame: 0, value: -2 },
          { frame: FRAME_RATE, value: 2 },
          { frame: END_FRAME, value: -2 }
        ]
      }
    ]);
    const group = createPropertyAnimationGroup(manager, target, xSlide, { fromFrame: 0, toFrame: END_FRAME, loop: true });
    const seekTime = parseFloat(new URLSearchParams(window.location.search).get("seekTime") || "");
    if (Number.isFinite(seekTime)) {
      goToFrame(group, seekTime * FRAME_RATE);
      draw(canvas, target);
      canvas.dataset.animationFrozen = "true";
    } else {
      draw(canvas, target);
      startAnimationManager(manager);
    }
    window.addEventListener("resize", () => draw(canvas, target));
    canvas.dataset.drawCalls = "0";
    canvas.dataset.initMs = String(performance.now() - __initStart);
    canvas.dataset.ready = "true";
  }
  main().catch(console.error);
})();
