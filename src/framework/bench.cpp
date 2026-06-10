#include "bench.h"

#include <algorithm>
#include <chrono>
#include <cstdio>

namespace bench {

double monotonicMillis() {
    using namespace std::chrono;
    static const auto kEpoch = steady_clock::now();
    return duration<double, std::milli>(steady_clock::now() - kEpoch).count();
}

void FrameTimer::setWarmupFrames(int n) {
    m_warmupFrames = n < 0 ? 0 : n;
}

void FrameTimer::reserve(size_t n) {
    m_deltas.reserve(n);
}

void FrameTimer::startFrame() {
    m_startMs = monotonicMillis();
    ++m_seenFrames;
}

void FrameTimer::endFrame() {
    if (m_seenFrames <= m_warmupFrames) return;  // skip warmup
    const double dt = monotonicMillis() - m_startMs;
    m_deltas.push_back(dt);
}

FrameStats FrameTimer::finish() const {
    FrameStats s{};
    if (m_deltas.empty()) return s;

    std::vector<double> sorted(m_deltas);
    std::sort(sorted.begin(), sorted.end());

    double sum = 0;
    for (double d : sorted) sum += d;

    // p95: nearest-rank, clamp to last element.
    const size_t n = sorted.size();
    size_t pIdx = static_cast<size_t>(0.95 * n);
    if (pIdx >= n) pIdx = n - 1;

    s.frameCount = static_cast<int>(n);
    s.wallMs     = sum;
    s.minMs      = sorted.front();
    s.avgMs      = sum / static_cast<double>(n);
    s.maxMs      = sorted.back();
    s.p95Ms      = sorted[pIdx];
    return s;
}

void FrameTimer::printBenchLine(const std::string& sceneName) const {
    const FrameStats s = finish();
    // Single line, machine-readable. Keys are stable; numeric formatting is
    // %.3f for sub-millisecond precision without trailing noise.
    std::fprintf(stdout,
        "BENCH scene=%s frames=%d wall_ms=%.3f min_ms=%.3f avg_ms=%.3f max_ms=%.3f p95_ms=%.3f\n",
        sceneName.c_str(),
        s.frameCount,
        s.wallMs,
        s.minMs,
        s.avgMs,
        s.maxMs,
        s.p95Ms);
    std::fflush(stdout);
}

} // namespace bench
