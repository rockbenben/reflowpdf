// Generates a "business doc" style fixture: colored filled boxes with text,
// to reproduce the colors-lost / boxes-broken-apart symptoms. No deps.
import { writeFileSync, mkdirSync } from "node:fs";

const esc = (s) => s.replace(/([()\\])/g, "\\$1");

// Three colored callout boxes + a title, on a portrait letter page.
function box(x, y, w, h, r, g, b, label) {
  return (
    `${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f\n` + // filled colored rect
    `0 0 0 rg BT /F1 13 Tf ${x + 12} ${y + h - 24} Td (${esc(label)}) Tj ET\n`
  );
}

let c = "";
c += "0 0 0 rg BT /F1 20 Tf 60 740 Td (Quarterly Business Report) Tj ET\n";
c += box(60, 600, 480, 110, 0.85, 0.92, 1.0, "Summary box (light blue) — key results for Q2.");
c += box(60, 470, 230, 100, 1.0, 0.9, 0.85, "Revenue (orange)");
c += box(310, 470, 230, 100, 0.88, 1.0, 0.88, "Costs (green)");
c += box(60, 320, 480, 120, 0.95, 0.9, 1.0, "Outlook box (lavender) — next quarter plan and risks.");

const objs = [
  "<</Type/Catalog/Pages 2 0 R>>",
  "<</Type/Pages/Kids[3 0 R]/Count 1>>",
  "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
  "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  `<</Length ${c.length}>>\nstream\n${c}\nendstream`,
];
let pdf = "%PDF-1.4\n";
const off = [];
objs.forEach((o, i) => { off[i] = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
const xref = pdf.length;
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
off.forEach((n) => (pdf += String(n).padStart(10, "0") + " 00000 n \n"));
pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;

mkdirSync(new URL("./fixtures/", import.meta.url), { recursive: true });
writeFileSync(new URL("./fixtures/colorbox.pdf", import.meta.url), Buffer.from(pdf, "latin1"));
console.log("wrote test/fixtures/colorbox.pdf");
