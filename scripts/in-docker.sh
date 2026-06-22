#!/usr/bin/env bash
# Runs INSIDE the emscripten/emsdk container.
# Mounts:
#   /src   = project root (rw)  -> reads vendor/, wasm/config.h ; writes dist/
#   /work  = named docker volume (Linux fs; caches the slow MuPDF build)
#
# Stages (each cached in /work so re-runs are fast):
#   1. extract MuPDF into /work/mupdf
#   2. build libmupdf.a + libmupdf-third.a (OS=wasm) — the long pole
#   3. compile k2pdfopt (willuslib + k2pdfoptlib + k2pdfopt.c), link -> /src/dist
set -euo pipefail

SRC=/src
WORK=/work
MUPDF_VER=1.23.7
MUPDF="$WORK/mupdf/mupdf-${MUPDF_VER}-source"
MUPDF_LIBDIR="$MUPDF/build/wasm/release"

mkdir -p "$WORK"

echo "==> emcc: $(emcc --version | head -1)"

# ---- Stage 1: extract MuPDF (cached) ------------------------------------
if [ ! -f "$MUPDF/include/mupdf/fitz.h" ]; then
  echo "==> [1/3] Extracting MuPDF ${MUPDF_VER} into volume"
  rm -rf "$WORK/mupdf" && mkdir -p "$WORK/mupdf"
  tar xzf "$SRC/vendor/mupdf-${MUPDF_VER}-source.tar.gz" -C "$WORK/mupdf"
else
  echo "==> [1/3] MuPDF already extracted (cached)"
fi

# ---- Stage 2: build MuPDF static libs (cached; the slow part) ------------
# Match the official platform/wasm opts but KEEP all fonts: NO -DTOFU and NO
# -DTOFU_CJK, so non-embedded text renders with the base-14 fonts AND CJK
# (SourceHanSerif) — needed for Chinese business docs. This is most of the
# ~36MB binary size; mitigate with brotli/gzip at deploy time.
MUPDF_OPTS="-Os -DFZ_ENABLE_XPS=0 -DFZ_ENABLE_SVG=0 -DFZ_ENABLE_CBZ=0 -DFZ_ENABLE_IMG=0 -DFZ_ENABLE_HTML=0 -DFZ_ENABLE_EPUB=0 -DFZ_ENABLE_JS=0 -DFZ_ENABLE_OCR_OUTPUT=0 -DFZ_ENABLE_DOCX_OUTPUT=0 -DFZ_ENABLE_ODT_OUTPUT=0"
if [ ! -f "$MUPDF_LIBDIR/libmupdf.a" ] || [ ! -f "$MUPDF_LIBDIR/libmupdf-third.a" ]; then
  echo "==> [2/3] Building MuPDF libs (OS=wasm) — this is the long pole"
  make -j"$(nproc)" -C "$MUPDF" build=release OS=wasm XCFLAGS="$MUPDF_OPTS" libs
else
  echo "==> [2/3] MuPDF libs already built (cached)"
fi
ls -la "$MUPDF_LIBDIR"/libmupdf*.a

# ---- Stage 3: compile + link k2pdfopt -----------------------------------
echo "==> [3/3] Compiling k2pdfopt -> WASM"
K2="$WORK/k2pdfopt-src"
rm -rf "$K2" && cp -r "$SRC/vendor/k2pdfopt-src" "$K2"
cp "$SRC/wasm/config.h" "$K2/config.h"     # picked up via -DUSE_CMAKE, -I "$K2"

# --- Source patches (applied to the WORK copy; vendor stays pristine) ---
# The k2pdfopt zip is unpacked on Windows (CRLF); strip CRs so anchored seds and
# the compiler behave. (MuPDF is extracted in-container, already LF.)
find "$K2" -type f \( -name '*.c' -o -name '*.h' \) -exec sed -i 's/\r$//' {} +

# emscripten's <compat/string.h> declares `char* strlwr/strupr(char*)`, which
# conflicts with willus's `void strlwr/strupr(char*)` (and would duplicate the
# libc symbol at link). Rename willus's versions uniformly across all sources.
grep -rlZ -E '\bstr(lwr|upr)\b' "$K2" \
  | xargs -0 -r sed -i -E 's/\bstrlwr\b/k2strlwr/g; s/\bstrupr\b/k2strupr/g'

# With HAVE_OCR_LIB on but tesseract off, two tesseract-only statics
# (k2ocr_tess_status, ocrtess_api) are referenced at file scope without a
# HAVE_TESSERACT_LIB guard (k2ocr_showlog / k2ocr_multithreaded_ocr — neither
# runs in the no-tesseract reflow path). Inject inert unconditional declarations
# before the first guard so the build links. The guarded originals are excluded
# since tesseract is off — no duplicates.
sed -i '0,/^#ifdef HAVE_OCR_LIB$/ s//static int k2ocr_tess_status=0;\nstatic void **ocrtess_api=0;\n#ifdef HAVE_OCR_LIB/' \
  "$K2/k2pdfoptlib/k2ocr.c"

mkdir -p "$SRC/dist"
cd "$K2"

# willuslib sources, excluding files that hard-require disabled optional libs
# (OCR: tesseract/gocr; leptonica). The CMake build omits these the same way.
WSRC=""
for f in willuslib/*.c; do
  case "$(basename "$f")" in
    ocrtess.c|ocrgocr.c|wleptonica.c) continue ;;
  esac
  WSRC="$WSRC $f"
done
echo "==> willuslib files: $(echo $WSRC | wc -w)"

emcc -O2 -DUSE_CMAKE \
  -Wno-implicit-function-declaration -Wno-incompatible-pointer-types \
  -I "$K2" -I "$K2/willuslib" -I "$K2/k2pdfoptlib" \
  -I "$MUPDF/include" -I "$MUPDF/thirdparty/zlib" \
  $WSRC k2pdfoptlib/*.c k2pdfopt.c \
  "$SRC/wasm/shim.c" \
  "$MUPDF"/thirdparty/zlib/gz*.c \
  "$MUPDF_LIBDIR/libmupdf.a" "$MUPDF_LIBDIR/libmupdf-third.a" \
  -lm \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createK2 \
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=64MB -sSTACK_SIZE=8MB \
  -sFORCE_FILESYSTEM=1 -sINVOKE_RUN=0 -sEXIT_RUNTIME=0 \
  -sEXPORTED_RUNTIME_METHODS=callMain,FS,getValue,setValue \
  -sNODEJS_CATCH_EXIT=0 -sNODEJS_CATCH_REJECTION=0 \
  -o "$SRC/dist/k2pdfopt.mjs"

echo "==> Build artifacts:"
ls -la "$SRC/dist"
