// Generates test fixtures with correct xref offsets. No dependencies.
//   test/fixtures/single-col.pdf  - one column of text (portrait letter)
//   test/fixtures/two-col.pdf     - two text columns (landscape letter)
import { writeFileSync, mkdirSync } from "node:fs";

const esc = (s) => s.replace(/([()\\])/g, "\\$1");

/** Build a PDF from a page MediaBox and an array of {x,y,size,lines} text blocks. */
function buildPdf(mediabox, blocks) {
  let content = "";
  for (const b of blocks) {
    content += `BT /F1 ${b.size} Tf ${b.size + 2} TL ${b.x} ${b.y} Td\n`;
    for (const ln of b.lines) content += `(${esc(ln)}) Tj T*\n`;
    content += "ET\n";
  }
  const objs = [];
  objs[1] = "<</Type/Catalog/Pages 2 0 R>>";
  objs[2] = "<</Type/Pages/Kids[3 0 R]/Count 1>>";
  objs[3] =
    `<</Type/Page/Parent 2 0 R/MediaBox[${mediabox.join(" ")}]` +
    "/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>";
  objs[4] = "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>";
  objs[5] = `<</Length ${content.length}>>\nstream\n${content}\nendstream`;

  let pdf = "%PDF-1.4\n";
  const off = [];
  for (let i = 1; i < objs.length; i++) {
    off[i] = pdf.length;
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++)
    pdf += String(off[i]).padStart(10, "0") + " 00000 n \n";
  pdf += `trailer\n<</Size ${objs.length}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

const para = (n) =>
  Array.from({ length: n }, (_, i) =>
    `Line ${i + 1}: lorem ipsum dolor sit amet consectetur adipiscing elit.`,
  );

// Short lines that fit inside a narrow column on a portrait page, so two columns
// leave a clean gutter (long `para` lines overflow past page center and erase it).
// Distinguishable per-column markers so reading order (left column before right) is
// testable from extracted text.
const leftcol = (n) => Array.from({ length: n }, (_, i) => `L${i + 1} left.`);
const rightcol = (n) => Array.from({ length: n }, (_, i) => `R${i + 1} right.`);

mkdirSync(new URL("./fixtures/", import.meta.url), { recursive: true });

// Single column, portrait letter (612 x 792)
writeFileSync(
  new URL("./fixtures/single-col.pdf", import.meta.url),
  buildPdf([0, 0, 612, 792], [{ x: 72, y: 740, size: 12, lines: para(30) }]),
);

// Two columns, landscape letter (792 x 612)
writeFileSync(
  new URL("./fixtures/two-col.pdf", import.meta.url),
  buildPdf(
    [0, 0, 792, 612],
    [
      { x: 60, y: 560, size: 11, lines: para(28) },
      { x: 430, y: 560, size: 11, lines: para(28) },
    ],
  ),
);

// Mixed page (portrait letter): full-width title band over a two-column body.
writeFileSync(
  new URL("./fixtures/mixed.pdf", import.meta.url),
  buildPdf(
    [0, 0, 612, 792],
    [
      { x: 72, y: 740, size: 16, lines: para(2) },            // full-width title (crosses center)
      { x: 60, y: 690, size: 10, lines: leftcol(30) },        // left column (ends before center)
      { x: 320, y: 690, size: 10, lines: rightcol(30) },      // right column (starts after center)
    ],
  ),
);

console.log("wrote test/fixtures/single-col.pdf, two-col.pdf, mixed.pdf");
