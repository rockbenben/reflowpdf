/**
 * Hybrid-layout orchestration (pure logic, dependency-injected so it is unit-
 * testable with fakes and reusable from both the browser worker and Node tests):
 *   detect text layer → segment each page into bands → convert each band via
 *   k2pdfopt (-cbox) → merge outputs in reading order.
 * Falls back to a single whole-doc magnify pass when there is no text layer.
 */
import { segmentPage } from "./segment.js";
import { bandArgs, optionsToArgs, type ConvertOptions } from "./flags.js";
import type { DocText } from "./segmentPdf.js";

export interface HybridDeps {
  extractDocText: (bytes: Uint8Array) => Promise<DocText>;
  /** convert with the given args; writes /in.pdf, runs callMain, returns /out.pdf bytes. */
  runK2: (args: string[], input: Uint8Array) => Uint8Array;
  mergePdfs: (parts: Uint8Array[]) => Promise<Uint8Array>;
  onProgress?: (done: number, total: number) => void;
  onNotice?: (code: "noTextLayerFallback") => void;
}

export async function convertHybrid(
  input: Uint8Array,
  opts: { device?: ConvertOptions["device"] },
  deps: HybridDeps,
): Promise<Uint8Array> {
  const doc = await deps.extractDocText(input);

  if (!doc.hasTextLayer) {
    deps.onNotice?.("noTextLayerFallback");
    return deps.runK2(optionsToArgs({ layout: "magnify", device: opts.device }), input);
  }

  // Plan every band across the whole doc in reading order (page, then top→down).
  const jobs: Array<{ args: string[] }> = [];
  doc.pages.forEach((page, pageIdx) => {
    const bands = segmentPage(page.items, page.pageW, page.pageH);
    for (const band of bands) jobs.push({ args: bandArgs(band, pageIdx + 1, { device: opts.device }) });
  });

  const parts: Uint8Array[] = [];
  for (let i = 0; i < jobs.length; i++) {
    parts.push(deps.runK2(jobs[i].args, input));
    deps.onProgress?.(i + 1, jobs.length);
  }
  return deps.mergePdfs(parts);
}
