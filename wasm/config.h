/*
 * Custom config.h for the k2pdfopt WASM build.
 *
 * willus.h does `#ifdef USE_CMAKE #include "config.h"` — so we compile with
 * -DUSE_CMAKE and put this file on the include path to control which optional
 * third-party libraries get compiled in.
 *
 * Enabled:
 *   HAVE_MUPDF_LIB  - PDF parsing/rendering (libmupdf.a + libmupdf-third.a)
 *   HAVE_Z_LIB      - zlib (in libmupdf-third.a) for PDF stream compression
 *
 * Disabled (omitted): PNG, JPEG (not needed for PDF->PDF), GHOSTSCRIPT, DJVU,
 *   GOCR, LEPTONICA, TESSERACT (OCR), JASPER, GSL.
 */
#ifndef __INCLUDED_CONFIG_H__
#define __INCLUDED_CONFIG_H__

#define HAVE_MUPDF_LIB
#define HAVE_Z_LIB

/*
 * Upstream bug workaround: k2pdfopt.h gates HAVE_OCR_LIB on `defined(HAVE_MUPDF)`
 * (no _LIB) — a typo that is normally masked because tesseract also enables
 * HAVE_OCR_LIB. With OCR off, code under the `HAVE_MUPDF_LIB||DJVU` blocks in
 * k2ocr.c references OCR-only settings fields (ocrvbb/ocrsort) that only exist
 * when HAVE_OCR_LIB is defined. Defining HAVE_MUPDF turns the OCR subsystem
 * (MuPDF text extraction, no tesseract) on consistently. HAVE_MUPDF is used
 * only at that one switch (verified across the source tree).
 */
#define HAVE_MUPDF

#endif
