/**
 * Engine binary loader (worker side).
 *
 * The k2pdfopt wasm is far bigger than the rest of the site combined, and a
 * static host gives it a short cache lifetime — so a plain load means every
 * returning visitor re-downloads it. Here the bytes are fetched with byte-level
 * progress and kept in IndexedDB; the stored ETag is replayed as `If-None-Match`
 * so a rebuilt engine is still picked up (304 → reuse the cache, 200 → download
 * and overwrite).
 *
 * The bytes go to the Emscripten glue as `wasmBinary`, which makes the glue skip
 * its own wasm fetch entirely.
 */
import type { EngineSource } from "./protocol.js";

export interface CachedEngine {
  bytes: Uint8Array;
  /** the response ETag used for revalidation; null when the host sends none */
  etag: string | null;
}

export interface EngineStore {
  get(url: string): Promise<CachedEngine | null>;
  set(url: string, entry: CachedEngine): Promise<void>;
}

const DB_NAME = "reflowpdf-engine";
const DB_VERSION = 1;
const OBJ_STORE = "wasm";

/** IndexedDB-backed store, or null where IndexedDB is missing or blocked. */
export async function openEngineStore(): Promise<EngineStore | null> {
  if (typeof indexedDB === "undefined") return null;
  let db: IDBDatabase;
  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(OBJ_STORE)) req.result.createObjectStore(OBJ_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }

  // A handle that goes bad (database deleted elsewhere) must not take the
  // conversion down with it: reads fall back to "nothing cached", writes are
  // dropped. Writes wait for the transaction to commit, because the worker is
  // terminated as soon as the conversion returns.
  return {
    get: (url) =>
      new Promise<CachedEngine | null>((resolve) => {
        try {
          const req = db.transaction(OBJ_STORE, "readonly").objectStore(OBJ_STORE).get(url);
          req.onsuccess = () => resolve(isCachedEngine(req.result) ? req.result : null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
    set: (url, entry) =>
      new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(OBJ_STORE, "readwrite");
          tx.objectStore(OBJ_STORE).put(entry, url);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        } catch {
          resolve();
        }
      }),
  };
}

function isCachedEngine(v: unknown): v is CachedEngine {
  return (
    !!v &&
    typeof v === "object" &&
    (v as CachedEngine).bytes instanceof Uint8Array &&
    ((v as CachedEngine).etag === null || typeof (v as CachedEngine).etag === "string")
  );
}

/**
 * `loaded` counts decoded bytes; `total` is the response `Content-Length` or 0
 * when absent. When the host transfers a compressed body `total` is the
 * compressed length, so `loaded` can pass it — read these as a byte counter,
 * not as a percentage.
 */
export interface EngineLoadOptions {
  onProgress?: (loaded: number, total: number, source: EngineSource) => void;
  fetchImpl?: typeof fetch;
  /** undefined → open IndexedDB; null → skip caching (tests, blocked storage). */
  store?: EngineStore | null;
}

export async function loadEngineBytes(
  url: string,
  opts: EngineLoadOptions = {},
): Promise<Uint8Array> {
  const doFetch = opts.fetchImpl ?? fetch;
  const store = opts.store === undefined ? await openEngineStore() : opts.store;
  const cached = (await store?.get(url)) ?? null;
  const fromCache = () => {
    if (!cached) return null;
    opts.onProgress?.(cached.bytes.length, cached.bytes.length, "cache");
    return cached.bytes;
  };

  let res: Response;
  try {
    res = await doFetch(url, cached?.etag ? { headers: { "if-none-match": cached.etag } } : undefined);
  } catch (e) {
    const stale = fromCache(); // offline / unreachable: stale engine still works
    if (stale) return stale;
    throw e;
  }

  // 304, and any error status we have a copy for, resolve to the cached bytes.
  if (res.status === 304 || (!res.ok && cached)) {
    const hit = fromCache();
    if (hit) return hit;
  }
  if (!res.ok) throw new Error(`engine download failed: HTTP ${res.status} ${url}`);

  const total = Number(res.headers.get("content-length")) || 0;
  const bytes = await readBody(res, (loaded) => opts.onProgress?.(loaded, total, "network"));
  await store?.set(url, { bytes, etag: res.headers.get("etag") });
  return bytes;
}

async function readBody(res: Response, onLoaded: (loaded: number) => void): Promise<Uint8Array> {
  if (!res.body) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    onLoaded(bytes.length);
    return bytes;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    loaded += value.length;
    onLoaded(loaded);
  }
  const out = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
