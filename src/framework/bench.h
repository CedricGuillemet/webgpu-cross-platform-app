// FrameTimer — collects per-frame wall-time deltas for benchmark mode.
//
// Records each completed-frame delta into a vector after a configurable warmup
// window. On `finish()`, sorts a copy of the deltas to compute min / avg / max
// / p95. The first frame is always skipped (warmup contains shader compile,
// PSO build, asset upload, etc.). Additional warmup frames can be skipped via
// `setWarmupFrames(N)`.
//
// Designed to be called inside the main render loop on the host thread; the
// only synchronisation is the implicit ordering of `startFrame()` /
// `endFrame()`. The class is not thread-safe.

#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace bench {

struct FrameStats {
    int     frameCount  = 0;   // frames included in the stats (excludes warmup)
    double  wallMs      = 0;   // sum of all included per-frame deltas, ms
    double  minMs       = 0;
    double  avgMs       = 0;
    double  maxMs       = 0;
    double  p95Ms       = 0;
};

class FrameTimer {
public:
    // The first `warmupFrames` rendered frames are excluded from the timing
    // stats (default 1: skip the very first frame which is always slow due to
    // shader compile / first-use asset upload). Set to 0 to include every
    // frame.
    void setWarmupFrames(int n);

    // Reserve capacity so we don't allocate inside the render loop.
    void reserve(size_t n);

    // Mark the start of a frame. Call once per frame, before any per-frame
    // work begins.
    void startFrame();

    // Mark the end of a frame. Records the elapsed ms since the matching
    // startFrame() into the deltas vector if past warmup.
    void endFrame();

    // Compute stats from the collected deltas. Safe to call multiple times.
    FrameStats finish() const;

    // Emit a single line of the form:
    //   BENCH scene=<name> frames=<N> wall_ms=<X> min_ms=<X> avg_ms=<X> max_ms=<X> p95_ms=<X>
    // to stdout. Designed to be parsed by tools/bench/run-bench.mjs.
    void printBenchLine(const std::string& sceneName) const;

private:
    int                 m_warmupFrames = 1;
    int                 m_seenFrames   = 0;  // total startFrame() calls
    double              m_startMs      = 0;
    std::vector<double> m_deltas;            // ms per frame, post-warmup
};

// Cross-platform monotonic millisecond clock helper. Lives here so callers
// don't have to duplicate the std::chrono boilerplate.
double monotonicMillis();

} // namespace bench
