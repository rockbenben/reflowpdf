/**
 * Main-thread API: convert a PDF to a phone-friendly PDF using the k2pdfopt
 * WASM engine running in a Web Worker.
 *
 *   const out = await convertPdf(bytes, { device: "phone", onProgress });
 *
 * The worker is created per call and terminated when done (conversions are
 * one-shot and the WASM heap is large, so we don't keep it resident). The worker
 * factory is injectable so this module is unit-testable without a real Worker.
 */
import type { ConvertOptions } from "./flags.js";
import type { MainToWorker, WorkerToMain } from "./protocol.js";

export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: "message", cb: (ev: { data: WorkerToMain }) => void): void;
  removeEventListener?(type: "message", cb: (ev: { data: WorkerToMain }) => void): void;
  terminate?(): void;
}

export interface ConvertPdfConfig {
  /** URL of the k2pdfopt.mjs glue served by the host app. */
  moduleUrl?: string;
  /** Worker factory; injectable for tests. */
  createWorker?: () => WorkerLike;
}

let nextId = 0;

// Worker construction is bundler-specific (Vite/Turbopack/webpack each need their
// own `new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`),
// so callers must supply config.createWorker. See sandbox/main.tsx for the Vite
// form and the Next.js page for the Turbopack form.
function defaultWorker(): WorkerLike {
  throw new Error(
    "convertPdf: provide config.createWorker — worker creation is bundler-specific.",
  );
}

export async function convertPdf(
  input: Uint8Array,
  opts: ConvertOptions = {},
  config: ConvertPdfConfig = {},
): Promise<Uint8Array> {
  const { onProgress, ...wire } = opts;
  const moduleUrl = config.moduleUrl ?? "/wasm/k2pdfopt.mjs";
  const worker = (config.createWorker ?? defaultWorker)();
  const id = ++nextId;

  return new Promise<Uint8Array>((resolve, reject) => {
    const onMessage = (ev: { data: WorkerToMain }) => {
      const msg = ev.data;
      if (!msg || msg.id !== id) return;
      if (msg.type === "progress") {
        onProgress?.({ page: msg.page, total: msg.total });
        return;
      }
      cleanup();
      if (msg.type === "done") resolve(new Uint8Array(msg.output));
      else reject(new Error(msg.message));
    };
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      worker.removeEventListener?.("message", onMessage);
      worker.terminate?.(); // free the ~36MB wasm heap
    };

    worker.addEventListener("message", onMessage);
    try {
      const buf = input.slice().buffer;
      const message: MainToWorker = { type: "convert", id, input: buf, opts: wire, moduleUrl };
      worker.postMessage(message, [buf]);
    } catch (e) {
      // postMessage/transfer failed — don't leak the worker.
      cleanup();
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
