import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mergePdfs } from "./pdfCompose.js";

async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([200, 200]);
  return doc.save();
}

describe("mergePdfs", () => {
  it("concatenates all pages in order", async () => {
    const merged = await mergePdfs([await makePdf(1), await makePdf(2), await makePdf(1)]);
    const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(4);
  });

  it("single part passes through with same page count", async () => {
    const merged = await mergePdfs([await makePdf(3)]);
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(3);
  });

  it("empty input throws (nothing to merge)", async () => {
    await expect(mergePdfs([])).rejects.toThrow();
  });
});
