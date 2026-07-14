/**
 * pdf.js adapter: extract per-page text-item boxes (top-left origin, PDF points)
 * and detect whether the document has a usable text layer. Isomorphic — uses the
 * legacy build so it runs both in the browser worker and in Node integration tests.
 * pdf.js runs without a separate worker here (fine for text extraction).
 */
import { getDocument, Util } from "pdfjs-dist/legacy/build/pdf.mjs";
// pdf.js always talks to a "worker" message handler, even for the in-process fake
// worker it falls back to when no thread is available. Importing the worker build
// directly (instead of pointing GlobalWorkerOptions.workerSrc at a URL) satisfies
// that handshake without requiring a separately-served worker asset, and works
// identically under Node and inside the browser worker that hosts this module.
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import type { TextItem } from "./segment.js";

(globalThis as { pdfjsWorker?: typeof pdfjsWorker }).pdfjsWorker = pdfjsWorker;

export interface PageGeometry { pageW: number; pageH: number; items: TextItem[] }
export interface DocText { pages: PageGeometry[]; hasTextLayer: boolean }

const MIN_ITEMS_FOR_TEXT_LAYER = 20;

export async function extractDocText(pdfBytes: Uint8Array): Promise<DocText> {
  // getDocument() returns a PDFDocumentLoadingTask; the loaded PDFDocumentProxy
  // itself has no destroy() — cleanup goes through the task (per pdf.js API).
  // standardFontDataUrl intentionally unset here; wired at the worker/bundler layer (see plan Task 7).
  // pdf.js detaches (transfers) the ArrayBuffer it is given, which would zero-length
  // whatever the caller passed in — so hand it a private copy; never assume ownership
  // of a caller-supplied buffer. Use the Uint8Array constructor (not .slice()): if the
  // caller passes a Node Buffer (a Uint8Array subclass), Buffer.prototype.slice()
  // returns a VIEW onto the same backing memory, not a copy, so the detach would still
  // corrupt the caller's data. `new Uint8Array(pdfBytes)` always allocates fresh memory.
  const task = getDocument({ data: new Uint8Array(pdfBytes) });
  const pages: PageGeometry[] = [];
  let totalItems = 0;
  try {
    const doc = await task.promise;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 }); // top-left origin, PDF points; honors /Rotate
      const content = await page.getTextContent();
      const items: TextItem[] = [];
      for (const it of content.items as Array<{ str: string; transform: number[]; width: number; height: number }>) {
        if (!("width" in it) || !it.str.trim()) continue;
        // Compose the page viewport transform with the item transform to get the
        // item origin in TOP-LEFT device space (points at scale 1). This is what
        // pdf.js's own text layer does (#appendText), and unlike a bare `vp.height - f`
        // it stays correct for /Rotate pages and non-origin media boxes.
        const tx = Util.transform(vp.transform, it.transform);
        const x0 = tx[4];
        const baselineY = tx[5]; // top-left-space y of the text baseline
        const w = it.width; // text-space width in points (viewport scale = 1)
        const h = it.height; // text-space height in points
        const y1 = baselineY; // baseline ≈ bottom of the glyph box
        const y0 = baselineY - h; // top of the glyph box (smaller y = higher on page)
        items.push({ x0, y0, x1: x0 + w, y1, str: it.str });
      }
      totalItems += items.length;
      pages.push({ pageW: vp.width, pageH: vp.height, items });
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return { pages, hasTextLayer: totalItems >= MIN_ITEMS_FOR_TEXT_LAYER };
}
