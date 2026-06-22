// Convert a PDF with explicit k2pdfopt args (for comparing flag sets).
// Usage: node test/convert-cli.mjs <input.pdf> <output.pdf> -- <k2pdfopt args...>
import { readFileSync, writeFileSync } from "node:fs";

const [, , inPath, outPath, sep, ...rest] = process.argv;
if (!inPath || !outPath || sep !== "--") {
  console.error("usage: node test/convert-cli.mjs <in.pdf> <out.pdf> -- <args...>");
  process.exit(1);
}
const { default: createK2 } = await import(
  new URL("../dist/k2pdfopt.mjs", import.meta.url).href
);
const Module = await createK2({ noInitialRun: true, print: (s) => console.log("[k2]", s), printErr: () => {} });
Module.FS.writeFile("/in.pdf", new Uint8Array(readFileSync(inPath)));
const args = ["-x", ...rest, "-o", "/out.pdf", "/in.pdf"];
console.log("args:", args.join(" "));
Module.callMain(args);
const out = Buffer.from(Module.FS.readFile("/out.pdf"));
writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${out.length} bytes)`);
