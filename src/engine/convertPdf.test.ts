import { describe, it, expect, vi } from "vitest";
import { convertPdf, type WorkerLike } from "./convertPdf.js";
import type { MainToWorker, WorkerToMain } from "./protocol.js";

/** A fake worker driven by a scripted responder, exercising the real protocol. */
function makeFakeWorker(
  respond: (job: MainToWorker, emit: (m: WorkerToMain) => void) => void,
): WorkerLike {
  const listeners = new Set<(ev: { data: WorkerToMain }) => void>();
  return {
    postMessage(message: unknown) {
      const job = message as MainToWorker;
      const emit = (m: WorkerToMain) =>
        queueMicrotask(() => listeners.forEach((l) => l({ data: m })));
      respond(job, emit);
    },
    addEventListener(_t, cb) {
      listeners.add(cb);
    },
    removeEventListener(_t, cb) {
      listeners.delete(cb);
    },
    terminate() {
      listeners.clear();
    },
  };
}

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"

describe("convertPdf", () => {
  it("resolves with the worker's output bytes and reports progress", async () => {
    const progress: Array<{ page: number; total: number }> = [];
    const createWorker = () =>
      makeFakeWorker((job, emit) => {
        emit({ type: "progress", id: job.id, page: 1, total: 2 });
        emit({ type: "progress", id: job.id, page: 2, total: 2 });
        emit({ type: "done", id: job.id, output: PDF.slice().buffer });
      });

    const out = await convertPdf(
      PDF,
      { device: "phone", onProgress: (p) => progress.push(p) },
      { createWorker },
    );

    expect(Array.from(out)).toEqual(Array.from(PDF));
    expect(progress).toEqual([
      { page: 1, total: 2 },
      { page: 2, total: 2 },
    ]);
  });

  it("rejects when the worker reports an error", async () => {
    const createWorker = () =>
      makeFakeWorker((job, emit) =>
        emit({ type: "error", id: job.id, message: "boom" }),
      );
    await expect(
      convertPdf(PDF, {}, { createWorker }),
    ).rejects.toThrow("boom");
  });

  it("forwards device/columns options to the worker (minus onProgress)", async () => {
    const seen = vi.fn();
    const createWorker = () =>
      makeFakeWorker((job, emit) => {
        seen(job.opts);
        emit({ type: "done", id: job.id, output: PDF.slice().buffer });
      });
    await convertPdf(
      PDF,
      { device: "tablet", columns: 1, onProgress: () => {} },
      { createWorker },
    );
    expect(seen).toHaveBeenCalledWith({ device: "tablet", columns: 1 });
  });

  it("forwards worker notice messages to onNotice", async () => {
    const notices: Array<string> = [];
    const createWorker = () =>
      makeFakeWorker((job, emit) => {
        emit({ type: "notice", id: job.id, code: "noTextLayerFallback" });
        emit({ type: "done", id: job.id, output: PDF.slice().buffer });
      });

    const out = await convertPdf(
      PDF,
      { device: "phone", onNotice: (code) => notices.push(code) },
      { createWorker },
    );

    expect(Array.from(out)).toEqual(Array.from(PDF));
    expect(notices).toEqual(["noTextLayerFallback"]);
  });
});
