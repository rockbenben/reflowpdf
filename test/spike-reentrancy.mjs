// Spike: can we call callMain twice on ONE loaded k2pdfopt module?
// Loads the module once, converts two fixtures in sequence, asserts both outputs
// are valid PDFs. Exits non-zero if the 2nd call fails (module not re-entrant).
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const wasm = new URL("../dist/k2pdfopt.wasm", import.meta.url);
if (!existsSync(wasm)) {
  console.error("SKIP: dist/k2pdfopt.wasm missing — run `npm run build:wasm` first.");
  process.exit(0);
}
const { default: createK2 } = await import(new URL("../dist/k2pdfopt.mjs", import.meta.url).href);

const Module = await createK2({ noInitialRun: true, print: () => {}, printErr: () => {} });

function runOnce(name) {
  const bytes = new Uint8Array(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))),
  );
  Module.FS.writeFile("/in.pdf", bytes);
  const rc = Module.callMain(["-x", "-mode", "fw", "-ls-", "-w", "800", "-h", "1280", "-c", "-o", "/out.pdf", "/in.pdf"]);
  const out = Buffer.from(Module.FS.readFile("/out.pdf"));
  const ok = rc === 0 && out.slice(0, 5).toString("latin1") === "%PDF-" && out.length > 200;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: rc=${rc} bytes=${out.length}`);
  return ok;
}

const a = runOnce("single-col.pdf");
const b = runOnce("two-col.pdf"); // 2nd callMain on the SAME module — the real test
if (a && b) { console.log("\nRE-ENTRANT ✓ — hybrid can reuse one module across bands."); process.exit(0); }
console.error("\nNOT re-entrant ✗ — see plan Task 1 fallback before proceeding.");
process.exit(1);
