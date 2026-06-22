// Engine integration check (plain Node — NOT vitest, to avoid the emscripten/
// worker-pool hang). Loads the built WASM engine and asserts each fixture
// converts to a valid PDF across ALL layout modes, using the real flag mapping.
// Exits non-zero on failure.
//
// Run: node test/make-fixtures.mjs && node test/engine-check.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { optionsToArgs } from "../src/engine/flags.ts";

const wasm = new URL("../dist/k2pdfopt.wasm", import.meta.url);
if (!existsSync(wasm)) {
  console.error("SKIP: dist/k2pdfopt.wasm missing — run `npm run build:wasm` first.");
  process.exit(0);
}

const { default: createK2 } = await import(
  new URL("../dist/k2pdfopt.mjs", import.meta.url).href
);

const fixtures = ["single-col.pdf", "two-col.pdf"];
const modes = ["magnify", "preserve", "reflow"]; // the three layout strategies
let failures = 0;

for (const name of fixtures) {
  const input = new Uint8Array(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))),
  );
  for (const layout of modes) {
    let total = 0;
    const Module = await createK2({
      noInitialRun: true,
      print: (s) => {
        const m = /SOURCE PAGE (\d+) of (\d+)/.exec(s);
        if (m) total = Number(m[2]);
      },
      printErr: () => {},
    });
    Module.FS.writeFile("/in.pdf", input);
    // Drive the engine through the SAME arg mapping the app uses.
    const args = ["-x", ...optionsToArgs({ layout, device: "phone" }), "-o", "/out.pdf", "/in.pdf"];
    const rc = Module.callMain(args);
    const out = Buffer.from(Module.FS.readFile("/out.pdf"));

    const checks = [
      ["exit 0", rc === 0],
      ["valid %PDF", out.slice(0, 5).toString("latin1") === "%PDF-"],
      ["non-trivial size", out.length > 200],
      ["processed >=1 src page", total > 0],
    ];
    const failed = checks.filter(([, ok]) => !ok);
    if (failed.length) {
      failures++;
      console.error(`FAIL ${name} [${layout}]: ${failed.map(([d]) => d).join(", ")}  args=${args.join(" ")}`);
    } else {
      console.log(`PASS ${name} [${layout}] (${out.length} bytes, ${total} src page)`);
    }
  }
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll engine checks passed ✓");
process.exit(0);
