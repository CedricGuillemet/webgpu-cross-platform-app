#!/usr/bin/env pwsh
# run-bench.ps1 — Windows wrapper for tools/bench/run-bench.mjs.
#
# Resolves Node from PATH (falls back to the Visual Studio dev shell's
# embedded node if not found), sets HOST=win32, then forwards all args
# to the cross-platform runner.

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# Prefer Node from PATH; fall back to common Windows install locations.
$node = (Get-Command node -ErrorAction SilentlyContinue)?.Source
if (-not $node) {
    foreach ($p in @(
        "$env:ProgramFiles\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
    )) {
        if (Test-Path $p) { $node = $p; break }
    }
}
if (-not $node) {
    Write-Error "node not found. Install Node 20+ and ensure it's on PATH."
    exit 1
}

# Forward args. All user-supplied flags pass through unchanged so this
# wrapper stays a thin shim; the heavy lifting is in run-bench.mjs.
& $node (Join-Path $here "run-bench.mjs") @args
exit $LASTEXITCODE
