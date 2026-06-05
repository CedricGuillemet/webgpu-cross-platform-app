#pragma once

#include "chakra_host.h"

#include <atomic>
#include <condition_variable>
#include <memory>
#include <mutex>
#include <queue>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

namespace worker_shim {

// Pumps any pending worker -> main messages. Call once per main-loop iteration
// (after host.pumpMicrotasks()) so the main runtime can deliver them to JS
// `onmessage` handlers.
void pumpIncoming(cx::Host& host);

// Tear down any live workers (called from main on shutdown).
void shutdownAll();

// Install the Worker constructor onto the main runtime's global. Must be
// called after the runtime-shim has loaded (since it relies on Promise + Event).
void install(cx::Host& host);

// Set the base directory used to resolve worker script URLs (typically the
// bundle directory).
void setWorkerBaseDir(const std::string& dir);

} // namespace worker_shim
