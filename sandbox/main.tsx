import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PdfToMobile } from "../src/ui/PdfToMobile.js";
import { convertPdf, type ConvertPdfConfig } from "../src/engine/convertPdf.js";

// Injected at build time from GITHUB_REPOSITORY (see vite.config.ts).
declare const __REPO_URL__: string;

// Resolve the engine glue relative to the current page so it works both at the
// site root (local preview) and under a GitHub Pages subpath (/<repo>/). The
// glue then fetches k2pdfopt.wasm relative to its own URL — both live in
// publicDir (dist/) and are copied to the site root.
const moduleUrl = new URL("k2pdfopt.mjs", document.baseURI).href;

const engineConfig: ConvertPdfConfig = {
  moduleUrl,
  createWorker: () =>
    new Worker(new URL("../src/engine/worker.ts", import.meta.url), { type: "module" }),
};

/** A minimal valid one-page text PDF, for the headless browser self-test. */
function tinyPdf(): Uint8Array {
  const content = "BT /F1 14 Tf 72 720 Td (Hello mobile browser selftest.) Tj ET";
  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const off: number[] = [];
  objs.forEach((o, i) => { off[i] = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  off.forEach((n) => (pdf += String(n).padStart(10, "0") + " 00000 n \n"));
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array([...pdf].map((c) => c.charCodeAt(0)));
}

async function selfTest() {
  const el = document.getElementById("root")!;
  el.textContent = "SELFTEST: running…";
  try {
    const out = await convertPdf(tinyPdf(), { device: "phone" }, engineConfig);
    const magic = String.fromCharCode(...out.subarray(0, 5));
    const ok = magic === "%PDF-" && out.length > 200;
    el.textContent = `SELFTEST: ${ok ? "PASS" : "FAIL"} size=${out.length} magic=${magic}`;
    document.title = ok ? "SELFTEST-PASS" : "SELFTEST-FAIL";
  } catch (e) {
    el.textContent = `SELFTEST: ERROR ${e instanceof Error ? e.message : e}`;
    document.title = "SELFTEST-FAIL";
  }
}

function App() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 12px 40px" }}>
      <PdfToMobile engineConfig={engineConfig} />
      <footer
        style={{
          marginTop: 28,
          paddingTop: 16,
          borderTop: "1px solid #eee",
          textAlign: "center",
          fontSize: 13,
          color: "#888",
        }}>
        <a href={__REPO_URL__} target="_blank" rel="noopener noreferrer" style={{ color: "#555" }}>
          ⭐ GitHub:{__REPO_URL__.replace("https://github.com/", "")}
        </a>
        <div style={{ marginTop: 6 }}>
          纯浏览器本地转换,文件不上传 · 引擎 k2pdfopt(WASM)
        </div>
      </footer>
    </div>
  );
}

if (new URLSearchParams(location.search).has("selftest")) {
  void selfTest();
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
