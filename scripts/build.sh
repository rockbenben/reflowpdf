#!/usr/bin/env bash
# Host wrapper: builds the k2pdfopt WASM engine in Docker.
# Usage: bash scripts/build.sh
#
# Uses a named volume (k2pdfopt-build) as a Linux workspace so the slow MuPDF
# build is cached across runs and NTFS symlink issues are avoided.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Pinned for reproducibility (emcc 6.0.0 — the version the engine was built with).
IMAGE="emscripten/emsdk:6.0.0"
VOL="k2pdfopt-build"

docker volume create "$VOL" >/dev/null

# MSYS_NO_PATHCONV stops Git Bash from mangling the Windows mount path.
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "${ROOT}:/src" \
  -v "${VOL}:/work" \
  "$IMAGE" \
  bash /src/scripts/in-docker.sh
