// Builds the README screenshot's input document: a realistic Chinese two-column
// paper, laid out by headless Chrome rather than drawn by hand.
//
// Chrome is used on purpose — it subsets and embeds the CJK font for real, so
// the sample behaves like a genuine document in front of the engine, and no
// font-packaging dependency is added to the project for a marketing asset.
//
//   node test/make-sample-pdf.mjs        # → test/out/sample-zh-two-col.pdf
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(existsSync);

if (!CHROME) {
  console.error("No Chrome found — install Chrome or point CHROME_PATH at it.");
  process.exit(1);
}

const html = fileURLToPath(new URL("./sample-paper.html", import.meta.url));
const outDir = fileURLToPath(new URL("./out/", import.meta.url));
const out = `${outDir}sample-zh-two-col.pdf`;
mkdirSync(outDir, { recursive: true });

const r = spawnSync(
  process.env.CHROME_PATH ?? CHROME,
  ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${out}`, `file:///${html.replace(/\\/g, "/")}`],
  { stdio: "inherit" },
);
if (r.status !== 0 || !existsSync(out)) {
  console.error("Chrome failed to print the sample.");
  process.exit(1);
}
console.log(`${out}  ${(statSync(out).size / 1024).toFixed(0)} KB`);
