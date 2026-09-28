/** Message protocol shared between the main thread and the k2pdfopt worker. */
import type { ConvertOptions } from "./flags.js";

/** Where the engine bytes came from: freshly downloaded, or the local cache. */
export type EngineSource = "network" | "cache";

/** Options sent to the worker (callbacks and the abort signal can't cross the
 *  boundary, so they are stripped). */
export type WireOptions = Omit<
  ConvertOptions,
  "onProgress" | "onNotice" | "onEngineProgress" | "signal"
>;

export type MainToWorker = {
  type: "convert";
  id: number;
  /** the input PDF bytes (transferred) */
  input: ArrayBuffer;
  opts: WireOptions;
  /** URL of the emscripten glue (k2pdfopt.mjs) to import inside the worker */
  moduleUrl: string;
};

export type WorkerToMain =
  | { type: "engine"; id: number; loaded: number; total: number; source: EngineSource }
  | { type: "progress"; id: number; page: number; total: number }
  | { type: "notice"; id: number; code: string }
  | { type: "done"; id: number; output: ArrayBuffer }
  | { type: "error"; id: number; message: string };
