#!/usr/bin/env bash
# Vendors the C source needed to build the k2pdfopt WASM engine.
# Output goes to vendor/ (gitignored — regenerated from pinned versions).
#
# Pinned versions (from k2pdfopt v2.55 readme_k2src.txt):
#   k2pdfopt : 2.55  (willuslib + k2pdfoptlib + k2pdfopt.c + mupdf_mod + include_mod)
#   MuPDF    : 1.23.7  (bundles its thirdparty/: freetype, harfbuzz, jbig2dec,
#                       openjpeg, lcms2, gumbo, mujs, zlib, libjpeg)
#
# Toolchain image (Phase 0/1 build): emscripten/emsdk  (pulled separately)
#
# HAVE_*_LIB macros live near the top of:
#   vendor/k2pdfopt-src/willuslib/../willus.h   and   k2pdfoptlib/../k2pdfopt.h
# Build turns OFF: TESSERACT, LEPTONICA, DJVU, GOCR, GHOSTSCRIPT, K2GUI; keeps MUPDF.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$ROOT/vendor"
mkdir -p "$VENDOR"
cd "$VENDOR"

K2_VER="2.55"
MUPDF_VER="1.23.7"

K2_ZIP="k2pdfopt_v${K2_VER}_src.zip"
K2_URL="https://www.willus.com/k2pdfopt/src/${K2_ZIP}"
MUPDF_TGZ="mupdf-${MUPDF_VER}-source.tar.gz"
MUPDF_URL="https://mupdf.com/downloads/archive/${MUPDF_TGZ}"

echo "==> Fetching k2pdfopt ${K2_VER}"
[ -f "$K2_ZIP" ] || curl -fL --retry 3 -o "$K2_ZIP" "$K2_URL"
rm -rf k2pdfopt-src && mkdir -p k2pdfopt-src
unzip -q -o "$K2_ZIP" -d k2pdfopt-src
# The zip may nest under a versioned folder; flatten if so.
if [ ! -f k2pdfopt-src/k2pdfopt.c ]; then
  inner="$(find k2pdfopt-src -maxdepth 2 -name k2pdfopt.c -printf '%h\n' | head -1)"
  if [ -n "${inner:-}" ] && [ "$inner" != "k2pdfopt-src" ]; then
    shopt -s dotglob; mv "$inner"/* k2pdfopt-src/ 2>/dev/null || true; shopt -u dotglob
  fi
fi

# MuPDF: only download the tarball. We do NOT extract it on the host — the
# Linux build container (scripts/in-docker.sh) extracts straight from the .tar.gz.
# Extracting here is redundant and breaks on Windows/NTFS (MuPDF ships symlinks
# that Git Bash `tar` can't create).
echo "==> Fetching MuPDF ${MUPDF_VER} (follows redirect to casper.mupdf.com)"
[ -f "$MUPDF_TGZ" ] || curl -fL --retry 3 -o "$MUPDF_TGZ" "$MUPDF_URL"

echo
echo "==> Vendored (under $VENDOR):"
echo "--- k2pdfopt-src ---"; ls k2pdfopt-src | head -40
echo "--- mupdf tarball ---"; ls -la "$MUPDF_TGZ"
echo
echo "Done. (MuPDF is extracted inside the build container, not here.)"
