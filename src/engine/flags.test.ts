import { describe, it, expect } from "vitest";
import { optionsToArgs, DEVICES } from "./flags.js";

describe("optionsToArgs", () => {
  it("defaults to magnify (auto-column, native) + color + phone device", () => {
    const args = optionsToArgs({});
    expect(args).toEqual([
      "-mode", "2col",
      "-w", String(DEVICES.phone.width),
      "-h", String(DEVICES.phone.height),
      "-dpi", String(DEVICES.phone.dpi),
      "-c",
    ]);
  });

  it("always requests color output (-c)", () => {
    expect(optionsToArgs({})).toContain("-c");
    expect(optionsToArgs({ layout: "preserve" })).toContain("-c");
    expect(optionsToArgs({ layout: "reflow" })).toContain("-c");
  });

  it("preserve mode uses fit-width portrait", () => {
    expect(optionsToArgs({ layout: "preserve" }).join(" ")).toContain("-mode fw -ls-");
  });

  it("preserve mode ignores reflow-only opts", () => {
    const args = optionsToArgs({ layout: "preserve", columns: 1, fontScale: 2 });
    expect(args.join(" ")).toContain("-mode fw -ls-");
    expect(args).not.toContain("-col");
    expect(args).not.toContain("-fs");
  });

  it("magnify mode uses -mode 2col (auto column detect)", () => {
    const args = optionsToArgs({ layout: "magnify" });
    expect(args.join(" ")).toContain("-mode 2col");
  });

  it("reflow mode does not use -mode", () => {
    const args = optionsToArgs({ layout: "reflow" });
    expect(args).not.toContain("-mode");
  });

  it("maps the tablet preset", () => {
    const args = optionsToArgs({ device: "tablet" });
    expect(args).toContain(String(DEVICES.tablet.width));
    expect(args).toContain(String(DEVICES.tablet.height));
  });

  it("maps a custom device profile", () => {
    const args = optionsToArgs({ device: { width: 600, height: 900, dpi: 200 } });
    expect(args.join(" ")).toContain("-w 600 -h 900 -dpi 200");
  });

  it("omits -dpi when a custom device gives none", () => {
    const args = optionsToArgs({ device: { width: 600, height: 900 } });
    expect(args.join(" ")).toContain("-w 600 -h 900");
    expect(args).not.toContain("-dpi");
  });

  it("reflow: forces a single column with -col 1", () => {
    const a = optionsToArgs({ layout: "reflow", columns: 1 });
    expect(a[a.indexOf("-col") + 1]).toBe("1");
  });

  it("reflow: forces two columns with -col 2", () => {
    const a = optionsToArgs({ layout: "reflow", columns: 2 });
    expect(a[a.indexOf("-col") + 1]).toBe("2");
  });

  it("reflow: omits -col for auto column detection", () => {
    expect(optionsToArgs({ layout: "reflow", columns: "auto" })).not.toContain("-col");
  });

  it("reflow: maps fontScale to -fs target points (12pt base)", () => {
    const a = optionsToArgs({ layout: "reflow", fontScale: 1.5 });
    expect(a[a.indexOf("-fs") + 1]).toBe("18.0");
  });

  it("reflow: keeps source margins with -m 0 when trimMargins is false", () => {
    const a = optionsToArgs({ layout: "reflow", trimMargins: false });
    expect(a[a.indexOf("-m") + 1]).toBe("0");
  });
});
