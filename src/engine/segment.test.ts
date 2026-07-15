import { describe, it, expect } from "vitest";
import { segmentPage, type TextItem } from "./segment.js";

// helper: a horizontal run of "rows", each row = one text box [x0,x1] at given y
const rows = (n: number, x0: number, x1: number, yStart: number, lh = 14): TextItem[] =>
  Array.from({ length: n }, (_, i) => ({ x0, x1, y0: yStart + i * lh, y1: yStart + i * lh + 10 }));

const W = 612, H = 792, CX = 306; // portrait letter, center x

describe("segmentPage", () => {
  it("pure single column → one full band", () => {
    const items = rows(30, 72, 540, 80); // spans across center 306 → full rows
    const bands = segmentPage(items, W, H);
    expect(bands.map((b) => b.type)).toEqual(["full"]);
  });

  it("pure two column → one multi band", () => {
    // left col 60..290 and right col 320..550 at the SAME y (each visual row has both)
    const items = [...rows(28, 60, 290, 80), ...rows(28, 320, 550, 80)];
    const bands = segmentPage(items, W, H);
    expect(bands.map((b) => b.type)).toEqual(["multi"]);
  });

  it("title over two-column body → [full, multi]", () => {
    const title = rows(3, 72, 540, 60);                 // full-width title, crosses center
    const bodyL = rows(20, 60, 290, 130);
    const bodyR = rows(20, 320, 550, 130);
    const bands = segmentPage([...title, ...bodyL, ...bodyR], W, H);
    expect(bands.map((b) => b.type)).toEqual(["full", "multi"]);
    // title band sits above the body band
    expect(bands[0].rect.y).toBeLessThan(bands[1].rect.y);
  });

  it("full-width figure inside body → [full, multi, full, multi]", () => {
    const title = rows(3, 72, 540, 60);
    const bodyL1 = rows(8, 60, 290, 130);
    const bodyR1 = rows(8, 320, 550, 130);
    const figure = rows(4, 72, 540, 260);               // full-width band mid-body
    const bodyL2 = rows(8, 60, 290, 340);
    const bodyR2 = rows(8, 320, 550, 340);
    const bands = segmentPage(
      [...title, ...bodyL1, ...bodyR1, ...figure, ...bodyL2, ...bodyR2], W, H,
    );
    expect(bands.map((b) => b.type)).toEqual(["full", "multi", "full", "multi"]);
  });

  it("empty page (no text) → one multi band (magnify preserves images)", () => {
    expect(segmentPage([], W, H).map((b) => b.type)).toEqual(["multi"]);
  });

  it("multi band rect spans both columns' width", () => {
    const items = [...rows(28, 60, 290, 80), ...rows(28, 320, 550, 80)];
    const [band] = segmentPage(items, W, H);
    expect(band.rect.x).toBeLessThanOrEqual(60 + 3);
    expect(band.rect.x + band.rect.w).toBeGreaterThanOrEqual(550 - 3);
  });

  it("short column run (< minColRows) is demoted and merged into full", () => {
    const bodyL = rows(10, 60, 290, 130);
    const bodyR = rows(10, 320, 550, 130);
    const figure = rows(2, 72, 540, 320);        // 2 full-width rows
    const shortColL = rows(2, 60, 290, 360);     // 2-row col run (< minColRows=3) → demoted
    const shortColR = rows(2, 320, 550, 360);
    const footer = rows(2, 72, 540, 400);        // 2 full-width rows
    const bands = segmentPage(
      [...bodyL, ...bodyR, ...figure, ...shortColL, ...shortColR, ...footer], W, H,
    );
    // col(10)→multi; then full + demoted-short-col + full all merge → one full band
    expect(bands.map((b) => b.type)).toEqual(["multi", "full"]);
  });

  it("column run of exactly minColRows stays multi (boundary)", () => {
    const title = rows(3, 72, 540, 60);          // full-width
    const bodyL = rows(3, 60, 290, 130);         // exactly minColRows col rows
    const bodyR = rows(3, 320, 550, 130);
    const bands = segmentPage([...title, ...bodyL, ...bodyR], W, H);
    expect(bands.map((b) => b.type)).toEqual(["full", "multi"]);
  });

  it("drops a narrow centered element (page number) that only straddles the gutter", () => {
    const bodyL = rows(20, 60, 290, 80);
    const bodyR = rows(20, 320, 550, 80);
    const pageNum = rows(1, 300, 314, 380);      // ~14pt wide, crosses center → misread as full
    const bands = segmentPage([...bodyL, ...bodyR, ...pageNum], W, H);
    // the tiny "full" band must NOT survive as its own (reflowed) band
    expect(bands.map((b) => b.type)).toEqual(["multi"]);
  });

  it("keeps a genuinely wide full-width band (real title)", () => {
    const title = rows(2, 72, 540, 60);          // 468pt wide → real full-width
    const bodyL = rows(20, 60, 290, 130);
    const bodyR = rows(20, 320, 550, 130);
    const bands = segmentPage([...title, ...bodyL, ...bodyR], W, H);
    expect(bands.map((b) => b.type)).toEqual(["full", "multi"]);
  });
});
