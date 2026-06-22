# Phase 0 Spike — Result: ✅ PASS

Date: 2026-06-21

## Verdict

**PASS — proceed to Phase 1 (full k2pdfopt WASM engine).**

The full k2pdfopt → WebAssembly port is feasible and working. k2pdfopt v2.55
(with MuPDF) compiled and linked under Emscripten, and the complete pipeline
runs client-side (verified in Node):

```
Reading 1 page from /in.pdf ...
SOURCE PAGE 1 of 1 (8.5 x 11.0 in) ... 1 page saved
2 pages (88 words) written to /out.pdf (0.1 MB).
exit code: 0
output /out.pdf: 67136 bytes, magic="%PDF-"   ← valid, reflowed, portrait device
```

So the planned fallback (`mupdf.js + JS reflow`) is **not needed**.

## Working recipe

- Toolchain: `emscripten/emsdk:latest` (emcc 6.0.0). EMSDK at `/emsdk`.
- MuPDF 1.23.7 builds its own WASM static libs:
  `make -C mupdf build=release OS=wasm XCFLAGS="<opts>" libs`
  → `build/wasm/release/libmupdf.a` + `libmupdf-third.a`. `thirdparty/` bundles
  zlib/jpeg/freetype/openjpeg/jbig2dec/lcms2/gumbo/mujs.
- k2pdfopt config: compile with `-DUSE_CMAKE` + custom `wasm/config.h` enabling
  only `HAVE_MUPDF_LIB`, `HAVE_Z_LIB`, `HAVE_MUPDF` (OCR/DjVu/Ghostscript/PNG/JPEG off).
- Link `dist/k2pdfopt.{mjs,wasm}` with `MODULARIZE/EXPORT_ES6/EXPORT_NAME=createK2`,
  `callMain`+`FS` exported, `INVOKE_RUN=0`.
- Invoke: write `/in.pdf` to MEMFS, `callMain(['-x','-w','720','-h','1280','-o','/out.pdf','/in.pdf'])`,
  read `/out.pdf`.

See `scripts/in-docker.sh` for the exact, reproducible build.

## Patches applied (for the MuPDF-on / OCR-off WASM config)

These live in `scripts/in-docker.sh` (applied to a working copy; vendor stays pristine):

1. **strlwr/strupr** — renamed to `k2strlwr/k2strupr` (willus declares `void`,
   emscripten's `compat/string.h` declares `char*` → conflict + link dup).
2. **OCR/leptonica source files excluded** — `ocrtess.c`, `ocrgocr.c`,
   `wleptonica.c` hard-include disabled-lib headers.
3. **`HAVE_MUPDF` defined** — `k2pdfopt.h:110` gates `HAVE_OCR_LIB` on
   `defined(HAVE_MUPDF)` (a typo for `HAVE_MUPDF_LIB`, normally masked by
   tesseract). Defining it makes `HAVE_OCR_LIB` consistent so `ocrvbb`/`ocrsort`
   struct fields exist where referenced.
4. **Inert tesseract statics** — `k2ocr_tess_status` / `ocrtess_api` are
   referenced unguarded in `k2ocr.c` (`k2ocr_showlog`, `k2ocr_multithreaded_ocr`,
   neither on the no-tesseract reflow path). Injected inert file-scope decls.
5. **font shim** — `wasm/shim.c` no-ops `pdf_install_load_system_font_funcs`
   (a Win32-only willus mod). MuPDF uses embedded + base-14 fonts.
6. **zlib gz API** — link MuPDF's bundled `thirdparty/zlib/gz*.c` (the file API
   MuPDF omits from `libmupdf-third`).
7. **CRLF normalization** — the willus zip is unpacked on Windows; strip CRs so
   anchored seds and the compiler behave.

## Known follow-ups for Phase 1

- **CJK fonts**: DONE — the build omits both `-DTOFU` and `-DTOFU_CJK`, so
  SourceHanSerif is bundled (verified in the build log) and non-embedded Chinese
  text substitutes correctly. This is most of the binary size. Still worth a
  real-Chinese-PDF visual check during browser QA.
- **zlib `gz*` lseek/off_t mismatch**: non-fatal signature warning (i32 vs i64).
  Only affects gz-seeking gzipped *input* (not the PDF path). Fix with
  `-D_FILE_OFFSET_BITS=64` or proper large-file zlib config.
- **wasm size**: 36 MB (fonts + ICC). Consider `-Os`, dropping unused resources,
  and gzip/brotli transfer for the web deploy.
- **Device presets**: `-w/-h/-dpi` mapping to phone/tablet presets (Task 1.2).
