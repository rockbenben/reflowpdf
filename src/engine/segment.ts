/**
 * Pure page segmentation: given text-item boxes (top-left origin, PDF points),
 * split a page into ordered horizontal bands, each tagged "full" (full-width
 * single column → reflow) or "multi" (two-column region → magnify). No I/O, no
 * pdf.js — fed plain data by segmentPdf.ts, so it is unit-tested in isolation.
 */
// `str` is optional: segmentation only uses geometry (x0/y0/x1/y1); `str` is populated
// by segmentPdf.ts's extractDocText so tests/downstream consumers can inspect the
// actual extracted text (e.g. to assert reading order), without segmentPage caring.
export interface TextItem { x0: number; y0: number; x1: number; y1: number; str?: string }
export type BandType = "full" | "multi";
export interface Rect { x: number; y: number; w: number; h: number }
export interface Band { type: BandType; rect: Rect }

export interface SegmentConfig {
  /** min gutter gap width (pt) to accept a column separator (~0.25in). */
  gutterMinGapPt: number;
  /** fraction of rows that must be "split" by the gutter to accept 2-col. */
  gutterMinRowFrac: number;
  /** min consecutive column rows to form a multi band. */
  minColRows: number;
  /** padding (pt) added around each band rect, clamped to page. */
  padPt: number;
}
export const SEGMENT_DEFAULTS: SegmentConfig = {
  gutterMinGapPt: 18,
  gutterMinRowFrac: 0.5,
  minColRows: 3,
  padPt: 3,
};

interface Row { items: TextItem[]; xL: number; xR: number; yTop: number; yBot: number }

/** Cluster items into rows by vertical overlap (ascending y = top → down). */
function toRows(items: TextItem[]): Row[] {
  const sorted = [...items].sort((a, b) => a.y0 - b.y0);
  const out: Row[] = [];
  for (const it of sorted) {
    const cur = out[out.length - 1];
    if (cur && it.y0 <= cur.yBot) {
      cur.items.push(it);
      cur.xL = Math.min(cur.xL, it.x0);
      cur.xR = Math.max(cur.xR, it.x1);
      cur.yTop = Math.min(cur.yTop, it.y0);
      cur.yBot = Math.max(cur.yBot, it.y1);
    } else {
      out.push({ items: [it], xL: it.x0, xR: it.x1, yTop: it.y0, yBot: it.y1 });
    }
  }
  return out;
}

/** Largest horizontal gap in a row near the page middle; returns its center or null. */
function midGapCenter(row: Row, pageW: number, minGap: number): number | null {
  const ivs = row.items.map((i) => [i.x0, i.x1] as const).sort((a, b) => a[0] - b[0]);
  let best: { c: number; w: number } | null = null;
  let reach = ivs.length ? ivs[0][1] : 0;
  for (let k = 1; k < ivs.length; k++) {
    const gap = ivs[k][0] - reach;
    const center = reach + gap / 2;
    if (gap >= minGap && center > pageW * 0.3 && center < pageW * 0.7) {
      if (!best || gap > best.w) best = { c: center, w: gap };
    }
    reach = Math.max(reach, ivs[k][1]);
  }
  return best ? best.c : null;
}

/** Find the dominant two-column gutter x, or null if the page is single-column. */
function findGutter(rows: Row[], pageW: number, cfg: SegmentConfig): number | null {
  const centers: number[] = [];
  for (const r of rows) {
    const c = midGapCenter(r, pageW, cfg.gutterMinGapPt);
    if (c !== null) centers.push(c);
  }
  if (rows.length === 0 || centers.length / rows.length < cfg.gutterMinRowFrac) return null;
  centers.sort((a, b) => a - b);
  return centers[Math.floor(centers.length / 2)]; // median
}

/** A row is "full" iff some item straddles the gutter x (text crosses it). */
function isFullRow(row: Row, gutterX: number): boolean {
  return row.items.some((i) => i.x0 < gutterX && i.x1 > gutterX);
}

function bandRect(rows: Row[], pageW: number, pageH: number, cfg: SegmentConfig): Rect {
  const xL = Math.min(...rows.map((r) => r.xL));
  const xR = Math.max(...rows.map((r) => r.xR));
  const yT = Math.min(...rows.map((r) => r.yTop));
  const yB = Math.max(...rows.map((r) => r.yBot));
  const x = Math.max(0, xL - cfg.padPt);
  const y = Math.max(0, yT - cfg.padPt);
  return {
    x,
    y,
    w: Math.min(pageW, xR + cfg.padPt) - x,
    h: Math.min(pageH, yB + cfg.padPt) - y,
  };
}

export function segmentPage(
  items: TextItem[],
  pageW: number,
  pageH: number,
  cfgIn: Partial<SegmentConfig> = {},
): Band[] {
  const cfg = { ...SEGMENT_DEFAULTS, ...cfgIn };
  if (items.length === 0) return [{ type: "multi", rect: { x: 0, y: 0, w: pageW, h: pageH } }];

  const rows = toRows(items);
  const gutterX = findGutter(rows, pageW, cfg);
  if (gutterX === null) return [{ type: "full", rect: bandRect(rows, pageW, pageH, cfg) }];

  // classify each row, then build runs by class
  const cls = rows.map((r) => (isFullRow(r, gutterX) ? "full" : "col"));
  interface Run { type: "full" | "col"; rows: Row[] }
  const runs: Run[] = [];
  rows.forEach((r, i) => {
    const t = cls[i];
    const cur = runs[runs.length - 1];
    if (cur && cur.type === t) cur.rows.push(r);
    else runs.push({ type: t, rows: [r] });
  });

  // demote short column runs to "full" (avoid over-splitting on a stray short line)
  for (const run of runs) if (run.type === "col" && run.rows.length < cfg.minColRows) run.type = "full";

  // merge adjacent full runs
  const merged: Run[] = [];
  for (const run of runs) {
    const cur = merged[merged.length - 1];
    if (cur && cur.type === "full" && run.type === "full") cur.rows.push(...run.rows);
    else merged.push({ type: run.type, rows: [...run.rows] });
  }

  return merged.map((run) => ({
    type: run.type === "col" ? "multi" : "full",
    rect: bandRect(run.rows, pageW, pageH, cfg),
  }));
}
