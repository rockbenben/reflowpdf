// Hybrid end-to-end check (plain Node). Loads the real WASM engine ONCE and runs
// convertHybrid over a mixed-layout fixture, reusing callMain across bands.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { register } from "node:module";
import { PDFDocument } from "pdf-lib";

// hybrid.ts imports its sibling modules with TS "bundler"-style ".js" specifiers
// (e.g. "./segment.js" for segment.ts) — correct under Vite/Vitest, which remap
// those to the .ts source on disk. Plain Node's native type-stripping does NOT do
// that remap (the specifier extension must match the file on disk exactly), so a
// static `import ... from "../src/engine/hybrid.ts"` here would throw
// ERR_MODULE_NOT_FOUND resolving hybrid.ts's internal "./segment.js"/"./flags.js".
// Register a resolve hook that retries any unresolved relative ".js" specifier as
// ".ts", then import everything dynamically so the hook is active first.
const loaderSrc = `
  export async function resolve(specifier, context, nextResolve) {
    try {
      return await nextResolve(specifier, context);
    } catch (err) {
      if (
        err && err.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.endsWith(".js") &&
        (specifier.startsWith("./") || specifier.startsWith("../"))
      ) {
        return nextResolve(specifier.slice(0, -3) + ".ts", context);
      }
      throw err;
    }
  }
`;
register(`data:text/javascript,${encodeURIComponent(loaderSrc)}`, import.meta.url);

const { convertHybrid } = await import(new URL("../src/engine/hybrid.ts", import.meta.url).href);
const { extractDocText } = await import(new URL("../src/engine/segmentPdf.ts", import.meta.url).href);
const { mergePdfs } = await import(new URL("../src/engine/pdfCompose.ts", import.meta.url).href);

const wasm = new URL("../dist/k2pdfopt.wasm", import.meta.url);
if (!existsSync(wasm)) {
  console.error("SKIP: dist/k2pdfopt.wasm missing — run `npm run build:wasm` first.");
  process.exit(0);
}
const { default: createK2 } = await import(new URL("../dist/k2pdfopt.mjs", import.meta.url).href);
const Module = await createK2({ noInitialRun: true, print: () => {}, printErr: () => {} });

const runK2 = (args, inBytes) => {
  Module.FS.writeFile("/in.pdf", inBytes);
  try { Module.FS.unlink("/out.pdf"); } catch { /* first run: no prior output */ }
  const rc = Module.callMain(["-x", ...args, "-o", "/out.pdf", "/in.pdf"]);
  if (rc) throw new Error(`k2pdfopt rc=${rc}`);
  const o = Module.FS.readFile("/out.pdf");
  if (!o || o.length === 0) throw new Error("k2pdfopt produced no output");
  return o;
};

const input = new Uint8Array(
  readFileSync(fileURLToPath(new URL("./fixtures/mixed.pdf", import.meta.url))),
);
let bands = 0;
const out = Buffer.from(
  await convertHybrid(input, { device: "phone" }, {
    extractDocText, runK2, mergePdfs,
    onProgress: (_d, total) => { bands = total; },
  }),
);

const pageCount = (await PDFDocument.load(out)).getPageCount();

mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
writeFileSync(new URL("./out/mixed-hybrid.pdf", import.meta.url), out);

const outDoc = await extractDocText(out);
const pageTexts = outDoc.pages.map((pg) => pg.items.map((it) => it.str).join(""));
const allText = pageTexts.join("\n");
const li = allText.indexOf("L1 left"), ri = allText.indexOf("R1 right");

const checks = [
  ["valid %PDF", out.slice(0, 5).toString("latin1") === "%PDF-"],
  ["non-trivial size", out.length > 400],
  [">=2 bands planned (title + body)", bands >= 2],
  // mixed.pdf = 1 source page, 2 bands (full title + 2-col body).
  // Expect a small number of output pages; a runaway (cbox not restricting) would be far larger.
  [`sane page count (2..15), got ${pageCount}`, pageCount >= 2 && pageCount <= 15],
  ["page 1 is the title band", (pageTexts[0] || "").includes("Line 1:")],
  ["left column content present", li >= 0],
  ["right column content present", ri >= 0],
  ["reading order: left column before right", li >= 0 && ri >= 0 && li < ri],
];
const failed = checks.filter(([, ok]) => !ok);
console.log(`mixed-hybrid.pdf: ${out.length} bytes, ${bands} bands, ${pageCount} pages, ${allText.length} extracted chars`);
if (failed.length) { console.error("FAIL hybrid:", failed.map(([d]) => d).join(", ")); process.exit(1); }
console.log(`PASS hybrid (${out.length} bytes, ${bands} bands, ${pageCount} pages) ✓`);
process.exit(0);
