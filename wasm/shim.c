/*
 * WASM build shims for k2pdfopt.
 *
 * k2pdfopt's bmpmupdf.c / wmupdf.c call pdf_install_load_system_font_funcs(),
 * a willus modification (mupdf_mod/font-win32.c) that loads OS system fonts via
 * Win32. There are no system fonts in a browser, so this is a no-op — MuPDF
 * falls back to fonts embedded in the PDF plus its built-in base-14 fonts.
 * (CJK system fonts are a Phase 1 concern; see the design doc.)
 */
#include <mupdf/fitz.h>

void pdf_install_load_system_font_funcs(fz_context *ctx)
{
    (void)ctx;
}
