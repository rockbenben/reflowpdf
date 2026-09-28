import { describe, it, expect, vi } from "vitest";
import { loadEngineBytes, openEngineStore, type CachedEngine, type EngineStore } from "./engineBytes.js";

const V8 = new Uint8Array([0, 97, 115, 109]); // wasm magic
const PAYLOAD = new Uint8Array(300).map((_, i) => i % 251);

/** Minimal Response stand-in: only the members the loader touches. */
function fakeResponse(
  bytes: Uint8Array,
  init: { status?: number; etag?: string | null; contentLength?: number | null; chunkSize?: number } = {},
): Response {
  const status = init.status ?? 200;
  const headers = new Map<string, string>();
  if (init.etag) headers.set("etag", init.etag);
  if (init.contentLength != null) headers.set("content-length", String(init.contentLength));
  const chunk = init.chunkSize ?? 0;

  const body = chunk
    ? {
        getReader() {
          let at = 0;
          return {
            read(): Promise<{ done: boolean; value?: Uint8Array }> {
              if (at >= bytes.length) return Promise.resolve({ done: true });
              const value = bytes.subarray(at, at + chunk);
              at += value.length;
              return Promise.resolve({ done: false, value });
            },
          };
        },
      }
    : null;

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
    body,
    arrayBuffer: async () => bytes.slice().buffer,
  } as unknown as Response;
}

function memStore(seed: Record<string, CachedEngine> = {}) {
  const map = new Map(Object.entries(seed));
  const store: EngineStore = {
    get: async (url) => map.get(url) ?? null,
    set: async (url, entry) => void map.set(url, entry),
  };
  return { store, map };
}

const URL_KEY = "https://site/k2pdfopt.wasm";

describe("loadEngineBytes", () => {
  it("streams a fresh engine with byte progress and caches it with the ETag", async () => {
    const { store, map } = memStore();
    const progress: Array<[number, number, string]> = [];
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      fakeResponse(PAYLOAD, { etag: '"e1"', contentLength: PAYLOAD.length, chunkSize: 128 }),
    );

    const bytes = await loadEngineBytes(URL_KEY, {
      store,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onProgress: (loaded, total, source) => progress.push([loaded, total, source]),
    });

    expect(Array.from(bytes)).toEqual(Array.from(PAYLOAD));
    expect(progress).toEqual([
      [128, 300, "network"],
      [256, 300, "network"],
      [300, 300, "network"],
    ]);
    expect(map.get(URL_KEY)).toMatchObject({ etag: '"e1"' });
    expect(Array.from(map.get(URL_KEY)!.bytes)).toEqual(Array.from(PAYLOAD));
    expect(fetchImpl.mock.calls[0][1]).toBeUndefined(); // nothing to revalidate yet
  });

  it("replays the stored ETag and reuses the cached bytes on 304", async () => {
    const cached: CachedEngine = { bytes: PAYLOAD, etag: '"e1"' };
    const { store } = memStore({ [URL_KEY]: cached });
    const fetchImpl = vi.fn(async (_u: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("if-none-match")).toBe('"e1"');
      return fakeResponse(new Uint8Array(0), { status: 304 });
    });
    const progress: Array<[number, string]> = [];

    const bytes = await loadEngineBytes(URL_KEY, {
      store,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onProgress: (loaded, _total, source) => progress.push([loaded, source]),
    });

    expect(bytes).toBe(cached.bytes);
    expect(progress).toEqual([[300, "cache"]]);
  });

  it("re-downloads when the engine was rebuilt (ETag no longer matches)", async () => {
    const { store, map } = memStore({ [URL_KEY]: { bytes: PAYLOAD, etag: '"e1"' } });
    const fetchImpl = vi.fn(async () => fakeResponse(V8, { etag: '"e2"' }));

    const bytes = await loadEngineBytes(URL_KEY, { store, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(Array.from(bytes)).toEqual(Array.from(V8));
    expect(map.get(URL_KEY)).toMatchObject({ etag: '"e2"' });
  });

  it("keeps converting from the cache when the network is unreachable", async () => {
    const { store } = memStore({ [URL_KEY]: { bytes: PAYLOAD, etag: '"e1"' } });
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const bytes = await loadEngineBytes(URL_KEY, { store, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(bytes).toBe(PAYLOAD);
  });

  it("prefers the cached engine over an error status", async () => {
    const { store } = memStore({ [URL_KEY]: { bytes: PAYLOAD, etag: '"e1"' } });
    const fetchImpl = vi.fn(async () => fakeResponse(new Uint8Array(0), { status: 500 }));

    const bytes = await loadEngineBytes(URL_KEY, { store, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(bytes).toBe(PAYLOAD);
  });

  it("fails when nothing is cached and the host errors", async () => {
    const fetchImpl = vi.fn(async () => fakeResponse(new Uint8Array(0), { status: 404 }));
    await expect(
      loadEngineBytes(URL_KEY, { store: null, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow(/404/);
  });

  it("reads a body it cannot stream (no ReadableStream)", async () => {
    const fetchImpl = vi.fn(async () => fakeResponse(PAYLOAD, {})); // body: null → arrayBuffer path
    const progress: number[] = [];
    const bytes = await loadEngineBytes(URL_KEY, {
      store: null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onProgress: (loaded) => progress.push(loaded),
    });
    expect(Array.from(bytes)).toEqual(Array.from(PAYLOAD));
    expect(progress).toEqual([300]);
  });

  // A gzip-compressed transfer reports the compressed length while the reader
  // yields decoded bytes, so loaded passes total — the UI must read these as a
  // byte counter rather than a percentage.
  it("reports raw counts when the transfer is compressed", async () => {
    const fetchImpl = vi.fn(async () => fakeResponse(PAYLOAD, { contentLength: 100, chunkSize: 128 }));
    const progress: Array<[number, number]> = [];
    await loadEngineBytes(URL_KEY, {
      store: null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onProgress: (loaded, total) => progress.push([loaded, total]),
    });
    expect(progress).toEqual([
      [128, 100],
      [256, 100],
      [300, 100],
    ]);
  });

  it("skips caching where IndexedDB is unavailable", async () => {
    // vitest's node environment has no indexedDB, which is the same shape as a
    // browser that blocks it.
    await expect(openEngineStore()).resolves.toBeNull();
    const fetchImpl = vi.fn(async () => fakeResponse(PAYLOAD, { etag: '"e1"' }));
    const bytes = await loadEngineBytes(URL_KEY, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(Array.from(bytes)).toEqual(Array.from(PAYLOAD));
  });
});
