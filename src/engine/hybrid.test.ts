import { describe, it, expect, vi } from "vitest";
import { convertHybrid, type HybridDeps } from "./hybrid.js";
import type { DocText } from "./segmentPdf.js";
import type { TextItem } from "./segment.js";

const rows = (n: number, x0: number, x1: number, y: number): TextItem[] =>
  Array.from({ length: n }, (_, i) => ({ x0, x1, y0: y + i * 14, y1: y + i * 14 + 10 }));

function deps(doc: DocText, over: Partial<HybridDeps> = {}): HybridDeps {
  return {
    extractDocText: vi.fn(async () => doc),
    runK2: vi.fn((args: string[]) => new TextEncoder().encode("PDF:" + args.join(" "))),
    mergePdfs: vi.fn(async (parts: Uint8Array[]) => new TextEncoder().encode("MERGED:" + parts.length)),
    ...over,
  };
}

describe("convertHybrid", () => {
  it("no text layer → one whole-doc magnify call + notice, no segmentation", async () => {
    const d = deps({ pages: [{ pageW: 612, pageH: 792, items: [] }], hasTextLayer: false });
    const notice = vi.fn();
    const out = await convertHybrid(new Uint8Array([1]), {}, { ...d, onNotice: notice });
    expect(notice).toHaveBeenCalledWith("noTextLayerFallback");
    expect(d.runK2).toHaveBeenCalledTimes(1);
    // whole-doc magnify → args contain -mode 2col and NO -cbox
    const args = (d.runK2 as any).mock.calls[0][0] as string[];
    expect(args.join(" ")).toContain("-mode 2col");
    expect(args.some((a) => a.startsWith("-cbox"))).toBe(false);
    expect(new TextDecoder().decode(out)).toBe("PDF:" + args.join(" "));
  });

  it("mixed page → one runK2 per band, merged in order", async () => {
    const items = [...rows(3, 72, 540, 60), ...rows(20, 60, 290, 130), ...rows(20, 320, 550, 130)];
    const d = deps({ pages: [{ pageW: 612, pageH: 792, items }], hasTextLayer: true });
    await convertHybrid(new Uint8Array([1]), { device: "phone" }, d);
    expect((d.runK2 as any).mock.calls.length).toBe(2); // [full, multi]
    expect(((d.runK2 as any).mock.calls[0][0] as string[]).join(" ")).not.toContain("-mode"); // full=reflow
    expect(((d.runK2 as any).mock.calls[1][0] as string[]).join(" ")).toContain("-mode 2col"); // multi
    expect(d.mergePdfs).toHaveBeenCalledTimes(1);
    const partsIn = (d.mergePdfs as any).mock.calls[0][0];
    const results = (d.runK2 as any).mock.results.map((r: any) => r.value);
    expect(partsIn).toEqual(results); // merged in the exact order bands were converted
  });

  it("reports progress as bands complete", async () => {
    const items = [...rows(3, 72, 540, 60), ...rows(20, 60, 290, 130), ...rows(20, 320, 550, 130)];
    const onProgress = vi.fn();
    const d = deps({ pages: [{ pageW: 612, pageH: 792, items }], hasTextLayer: true }, { onProgress });
    await convertHybrid(new Uint8Array([1]), {}, d);
    expect((onProgress as any).mock.calls).toEqual([[1, 2], [2, 2]]); // one call per band, in order
  });

  it("multi-page doc: 1-based page numbers and cross-page reading order", async () => {
    const page1 = rows(30, 72, 540, 80);                                   // single column → [full]
    const page2 = [...rows(28, 60, 290, 80), ...rows(28, 320, 550, 80)];   // two column → [multi]
    const d = deps({
      pages: [
        { pageW: 612, pageH: 792, items: page1 },
        { pageW: 612, pageH: 792, items: page2 },
      ],
      hasTextLayer: true,
    });
    await convertHybrid(new Uint8Array([1]), { device: "phone" }, d);
    const calls = (d.runK2 as any).mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[0][0]).toContain("-cbox1"); // page 1's band uses 1-based page number
    expect(calls[1][0]).toContain("-cbox2"); // page 2's band
    const results = (d.runK2 as any).mock.results.map((r: any) => r.value);
    expect((d.mergePdfs as any).mock.calls[0][0]).toEqual(results); // page1 part before page2 part
  });
});
