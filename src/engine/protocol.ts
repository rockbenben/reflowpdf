/** Message protocol shared between the main thread and the k2pdfopt worker. */
import type { ConvertOptions } from "./flags.js";

/** Options sent to the worker (onProgress can't cross the boundary; stripped). */
export type WireOptions = Omit<ConvertOptions, "onProgress">;

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
  | { type: "progress"; id: number; page: number; total: number }
  | { type: "done"; id: number; output: ArrayBuffer }
  | { type: "error"; id: number; message: string };
