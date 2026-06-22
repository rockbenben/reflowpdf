/**
 * Maps the high-level ConvertOptions to k2pdfopt CLI arguments.
 *
 * This module is pure (no I/O), so it is unit-tested in isolation and shared by
 * both the Node runner and the browser Web Worker.
 */

export interface DeviceProfile {
  /** device screen width in pixels (k2pdfopt -w) */
  width: number;
  /** device screen height in pixels (k2pdfopt -h) */
  height: number;
  /** output DPI (k2pdfopt -dpi); omitted if undefined */
  dpi?: number;
}

export interface ConvertOptions {
  /** target device; named preset or explicit profile. Default: "phone". */
  device?: "phone" | "tablet" | DeviceProfile;
  /**
   * Layout strategy:
   * - "magnify" (default): keep colors + native vector layout, but auto-detect
   *   columns/regions and put each on its own page magnified to the phone width,
   *   so text gets bigger. Single-column pages gracefully stay fit-width. Best
   *   all-round for business docs (preserve look AND larger text).
   * - "preserve": each source page → one page, scaled to fit the phone width,
   *   native vector + color. Most faithful, but text is as small as fit-width.
   * - "reflow": re-flow text into a single large column. Biggest text, but
   *   rasterizes and breaks multi-column / boxed layouts apart. Plain prose only.
   */
  layout?: "magnify" | "preserve" | "reflow";
  /** [reflow only] font scale multiplier (1.0 ≈ 12pt). */
  fontScale?: number;
  /** [reflow only] trim white margins. Default true. (preserve always trims.) */
  trimMargins?: boolean;
  /** [reflow only] column handling: force 1 or 2, or "auto" to detect. */
  columns?: 1 | 2 | "auto";
  /** progress callback as pages are processed. */
  onProgress?: (p: { page: number; total: number }) => void;
}

/**
 * Built-in device presets (pixels + dpi).
 *
 * NOTE: sensible starting values; exact pixel/dpi tuning is calibrated against
 * real on-device output (see docs/build-notes.md).
 */
export const DEVICES = {
  phone: { width: 800, height: 1280, dpi: 167 } as Required<DeviceProfile>,
  tablet: { width: 1200, height: 1600, dpi: 150 } as Required<DeviceProfile>,
};

/** 12pt baseline that fontScale multiplies (k2pdfopt -fs is absolute points). */
const FONT_BASE_PT = 12;

/**
 * Convert options to k2pdfopt option flags (WITHOUT input/output paths or -x;
 * the runner adds those).
 */
export function optionsToArgs(opts: ConvertOptions = {}): string[] {
  const args: string[] = [];
  const layout = opts.layout ?? "magnify";

  if (layout === "magnify") {
    // Native output + auto column/region detection: each detected column/region
    // becomes its own page magnified to the device width (bigger text), while
    // colors and within-region layout are preserved. Single-column pages stay
    // fit-width (no line breaking). k2pdfopt "2col" = -n -wrap- -col 2 -vb -2 -t.
    args.push("-mode", "2col");
  } else if (layout === "preserve") {
    // Fit-width, portrait (-ls-), no text re-flow, native PDF output. This is
    // k2pdfopt's documented "best way to preserve the original layout" — keeps
    // colors, boxes and relative sizes; the page stays a single page.
    args.push("-mode", "fw", "-ls-");
  } else {
    // reflow: intentionally NO -mode flag — k2pdfopt's *default* behavior is
    // full text re-flow (verified: emits flowed word stream). The reflow-only
    // knobs below (columns/fontScale/margins) tune that default.
    if (opts.columns === 1 || opts.columns === 2) {
      args.push("-col", String(opts.columns));
    }
    if (typeof opts.fontScale === "number" && opts.fontScale > 0) {
      args.push("-fs", (opts.fontScale * FONT_BASE_PT).toFixed(1));
    }
    // k2pdfopt auto-trims margins by default; only act when explicitly disabled.
    if (opts.trimMargins === false) {
      args.push("-m", "0");
    }
  }

  const dev = opts.device ?? "phone";
  const profile: DeviceProfile =
    typeof dev === "string" ? DEVICES[dev] ?? DEVICES.phone : dev;
  args.push("-w", String(profile.width), "-h", String(profile.height));
  if (typeof profile.dpi === "number") args.push("-dpi", String(profile.dpi));

  // Always output in color (k2pdfopt defaults to grayscale otherwise).
  args.push("-c");

  return args;
}
