/** Merge multiple PDFs (in order) into one, using pdf-lib. Isomorphic (worker + node). */
import { PDFDocument } from "pdf-lib";

export async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  if (parts.length === 0) throw new Error("mergePdfs: no parts to merge");
  const out = await PDFDocument.create();
  for (const bytes of parts) {
    const src = await PDFDocument.load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
  }
  return out.save();
}
