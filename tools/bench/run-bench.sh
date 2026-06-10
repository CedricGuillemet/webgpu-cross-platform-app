#!/usr/bin/env bash
# run-bench.sh — POSIX wrapper for tools/bench/run-bench.mjs.
#
# Resolves node from PATH; on macOS, also probes Homebrew + nvm install
# locations. Forwards all args to the cross-platform runner unchanged.

set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

node_bin="$(command -v node || true)"
if [ -z "$node_bin" ]; then
    for p in \
        /opt/homebrew/bin/node \
        /usr/local/bin/node \
        "$HOME/.nvm/versions/node/*/bin/node"
    do
        for q in $p; do
            if [ -x "$q" ]; then node_bin="$q"; break 2; fi
        done
    done
fi
if [ -z "$node_bin" ]; then
    echo "node not found. Install Node 20+ and ensure it's on PATH." >&2
    exit 1
fi

exec "$node_bin" "$here/run-bench.mjs" "$@"
