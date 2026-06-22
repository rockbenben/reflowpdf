/**
 * Web Worker that runs the k2pdfopt WASM engine off the main thread.
 *
 * It imports the Emscripten glue (k2pdfopt.mjs) from the URL given in each job
 * (so the host app controls where the .wasm is served from), caches the module
 * factory, and streams progress parsed from k2pdfopt's stdout.
 *
 * Build this as a module worker: new Worker(url, { type: "module" }).
 */
/// <reference lib="webworker" />
import { optionsToArgs } from "./flags.js";
import type { MainToWorker, WorkerToMain } from "./protocol.js";

interface K2Module {
  FS: {
    writeFile(p: string, d: Uint8Array): void;
    readFile(p: string): Uint8Array;
  };
  callMain(args: string[]): number;
}
type K2Factory = (opts?: Record<string, unknown>) => Promise<K2Module>;

// Cache the module factory per URL (not a single global) so different moduleUrls
// load independently; drop the entry if loading fails so a retry isn't poisoned
// by a cached rejected promise.
const factoryCache = new Map<string, Promise<K2Factory>>();
function loadFactory(moduleUrl: string): Promise<K2Factory> {
  let p = factoryCache.get(moduleUrl);
  if (!p) {
    p = import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ moduleUrl
    )
      .then((m) => m.default as K2Factory)
      .catch((e) => {
        factoryCache.delete(moduleUrl);
        throw e;
      });
    factoryCache.set(moduleUrl, p);
  }
  return p;
}

const post = (msg: WorkerToMain, transfer?: Transferable[]) =>
  (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer ?? []);

self.addEventListener("message", async (ev: MessageEvent<MainToWorker>) => {
  const job = ev.data;
  if (job?.type !== "convert") return;
  const { id, input, opts, moduleUrl } = job;
  try {
    const createK2 = await loadFactory(moduleUrl);
    const Module = await createK2({
      noInitialRun: true,
      print: (s: string) => {
        const m = /SOURCE PAGE (\d+) of (\d+)/.exec(s);
        if (m) post({ type: "progress", id, page: +m[1], total: +m[2] });
      },
      printErr: () => {},
    });

    Module.FS.writeFile("/in.pdf", new Uint8Array(input));
    const args = ["-x", ...optionsToArgs(opts), "-o", "/out.pdf", "/in.pdf"];
    const rc = Module.callMain(args);
    if (rc) throw new Error(`k2pdfopt exited with code ${rc}`);

    const out = Module.FS.readFile("/out.pdf");
    if (!out || out.length === 0) throw new Error("k2pdfopt produced no output");
    // copy into a fresh ArrayBuffer we can transfer
    const buf = out.slice().buffer;
    post({ type: "done", id, output: buf }, [buf]);
  } catch (e) {
    post({ type: "error", id, message: e instanceof Error ? e.message : String(e) });
  }
});
