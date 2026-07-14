// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PdfToMobile from "./PdfToMobile.js";
import { zh } from "./messages.js";

afterEach(cleanup);

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]); // "%PDF-1"

beforeAll(() => {
  // jsdom lacks these; stub them for the component's blob/preview path.
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });
  if (!File.prototype.arrayBuffer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (File.prototype as any).arrayBuffer = function () {
      return Promise.resolve(PDF.buffer);
    };
  }
});

function pickFile() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([PDF], "doc.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    // fresh copy per call so a transfer in one conversion can't detach the next
    value: () => Promise.resolve(PDF.slice().buffer),
  });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe("PdfToMobile", () => {
  it("renders the title, dragger and a disabled convert button initially", () => {
    render(<PdfToMobile convert={vi.fn()} />);
    expect(screen.getByText(zh.title)).toBeTruthy();
    expect(screen.getByText(zh.dragHint)).toBeTruthy();
    const btn = screen.getByTestId("convert-btn").querySelector("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("converts a selected file and shows a download button", async () => {
    const convert = vi.fn().mockResolvedValue(PDF);
    render(<PdfToMobile convert={convert} />);

    pickFile();
    const btn = screen.getByTestId("convert-btn").querySelector("button") as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(false));
    fireEvent.click(btn);

    await waitFor(() => expect(convert).toHaveBeenCalledTimes(1));
    const [bytes, opts] = convert.mock.calls[0];
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(opts).toMatchObject({ device: "phone", columns: "auto", trimMargins: true });

    await screen.findByText(zh.resultTitle);
    expect(screen.getByTestId("download-btn")).toBeTruthy();
  });

  it("revokes the previous blob URL when converting again (no leak)", async () => {
    let n = 0;
    (URL.createObjectURL as ReturnType<typeof vi.fn>).mockImplementation(
      () => `blob:mock-${++n}`,
    );
    const revoke = URL.revokeObjectURL as ReturnType<typeof vi.fn>;
    revoke.mockClear();

    const convert = vi.fn().mockResolvedValue(PDF);
    render(<PdfToMobile convert={convert} />);

    pickFile();
    const btn = screen.getByTestId("convert-btn").querySelector("button") as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(false));

    // Re-query each time and wait until the button is idle (not loading) before
    // clicking — antd swallows clicks while a button is in its loading state, so
    // clicking too early silently drops the conversion.
    const clickConvertWhenIdle = async () => {
      const btn = () =>
        screen.getByTestId("convert-btn").querySelector("button") as HTMLButtonElement;
      await waitFor(() => {
        expect(btn().disabled).toBe(false);
        expect(btn().className).not.toContain("ant-btn-loading");
      });
      fireEvent.click(btn());
    };

    // First conversion → blob:mock-1
    await clickConvertWhenIdle();
    await screen.findByText(zh.resultTitle);

    // Second conversion (e.g. user tweaked a layout option, hit Convert again).
    await clickConvertWhenIdle();
    await waitFor(() => expect(convert).toHaveBeenCalledTimes(2));
    await screen.findByText(zh.resultTitle);

    // The first object URL must have been revoked; otherwise it leaks.
    expect(revoke).toHaveBeenCalledWith("blob:mock-1");
  });

  it("shows an error alert when conversion fails", async () => {
    const convert = vi.fn().mockRejectedValue(new Error("kaboom"));
    render(<PdfToMobile convert={convert} />);
    pickFile();
    const btn = screen.getByTestId("convert-btn").querySelector("button") as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(false));
    fireEvent.click(btn);
    await screen.findByText(zh.errGeneric);
  });

  it("passes layout=hybrid to convert when the hybrid mode is selected", async () => {
    const convert = vi.fn(async () => new Uint8Array([37, 80, 68, 70])); // %PDF
    const user = userEvent.setup();
    render(<PdfToMobile convert={convert} />);
    // select the file
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File([new Uint8Array([1, 2, 3])], "a.pdf", { type: "application/pdf" }));
    await user.click(screen.getByText(zh.layoutHybrid));
    await user.click(screen.getByTestId("convert-btn").querySelector("button")!);
    expect(convert).toHaveBeenCalledWith(expect.any(Uint8Array), expect.objectContaining({ layout: "hybrid" }));
  });

  it("shows no-text-layer notice banner when convert calls onNotice", async () => {
    const convert = vi.fn(async (_input, opts) => {
      opts.onNotice?.("noTextLayerFallback");
      return new Uint8Array([37, 80, 68, 70]); // %PDF
    });
    const user = userEvent.setup();
    render(<PdfToMobile convert={convert} />);
    // select the file
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File([new Uint8Array([1, 2, 3])], "a.pdf", { type: "application/pdf" }));
    await user.click(screen.getByTestId("convert-btn").querySelector("button")!);

    // Assert the notice banner appears
    expect(await screen.findByText(zh.noticeNoTextLayer)).toBeTruthy();
  });
});
