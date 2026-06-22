/**
 * Node-side k2pdfopt WASM runner. Loads the Emscripten module, stages the input
 * PDF in MEMFS, runs the CLI, and returns the reflowed PDF bytes.
 *
 * The browser worker (Phase 2) reuses optionsToArgs() and the same MEMFS dance;
 * only the module-loading differs.
 */
import { optionsToArgs, type ConvertOptions } from "./flags.js";

interface K2Module {
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    readdir(path: string): string[];
    stat(path: string): { size: number };
  };
  callMain(args: string[]): number;
}
type K2Factory = (opts?: Record<string, unknown>) => Promise<K2Module>;

/** Resolve dist/k2pdfopt.mjs relative to this source file (src/engine → ../../dist). */
const MODULE_URL = new URL("../../dist/k2pdfopt.mjs", import.meta.url);

let factory: K2Factory | undefined;
async function loadFactory(): Promise<K2Factory> {
  if (!factory) {
    const mod = await import(/* @vite-ignore */ MODULE_URL.href);
    factory = mod.default as K2Factory;
  }
  return factory;
}

export async function convertPdfNode(
  input: Uint8Array,
  opts: ConvertOptions = {},
): Promise<Uint8Array> {
  const createK2 = await loadFactory();

  const onProgress = opts.onProgress;
  const onLine = (s: string) => {
    const m = /SOURCE PAGE (\d+) of (\d+)/.exec(s);
    if (m) onProgress?.({ page: Number(m[1]), total: Number(m[2]) });
  };

  const Module = await createK2({
    noInitialRun: true,
    print: onLine,
    printErr: () => {},
  });

  Module.FS.writeFile("/in.pdf", input);
  const args = ["-x", ...optionsToArgs(opts), "-o", "/out.pdf", "/in.pdf"];
  const rc = Module.callMain(args);
  if (rc) throw new Error(`k2pdfopt exited with code ${rc}`);

  const out = Module.FS.readFile("/out.pdf");
  if (!out || out.length === 0) throw new Error("k2pdfopt produced no output");
  return out;
}
