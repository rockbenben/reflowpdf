import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, Segmented } from "antd";
import { PdfToMobile } from "../src/ui/PdfToMobile.js";
import { zh, en } from "../src/ui/messages.js";
import { convertPdf, type ConvertPdfConfig } from "../src/engine/convertPdf.js";
import { opticalTheme } from "./theme.js";
import "./design.css";

// Injected at build time from GITHUB_REPOSITORY (see vite.config.ts).
declare const __REPO_URL__: string;

// Resolve the engine glue relative to the current page so it works both at the
// site root (local preview) and under a GitHub Pages subpath (/<repo>/).
const moduleUrl = new URL("k2pdfopt.mjs", document.baseURI).href;

const engineConfig: ConvertPdfConfig = {
  moduleUrl,
  createWorker: () =>
    new Worker(new URL("../src/engine/worker.ts", import.meta.url), { type: "module" }),
};

/** First-load language: Chinese browsers → zh, everyone else → en. */
const initialLang: "zh" | "en" =
  typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("zh")
    ? "zh"
    : "en";

/** Demo-page (hero) copy — kept out of the reusable component's message dict. */
const HERO = {
  zh: {
    nav: ["模式", "原理", "本地 · 不上传"],
    kicker: "光学重排",
    kickerId: "本地引擎",
    h1: ["把小字分栏，重新", "对焦", "到手机。"] as const,
    lede: "逐栏放大到铺满手机，或把整页重排成一条大字轨道。转换全程在你的浏览器里完成，文件不上传。",
    specs: [
      ["引擎", "k2pdfopt · WASM"],
      ["数据", "仅本机"],
      ["适用", "多栏 · 扫描件"],
      ["输出", "手机版 PDF"],
    ],
    specimen:
      "原生放大受几何约束：一个区块被缩放到铺满屏幕宽度时，能变大的倍数只取决于它原本有多窄。半栏宽的区块放大约两倍，满页宽的区块几乎不动。这正是双栏页能干净放大、而单栏页放大不了的原因——也是为什么在手机上让满宽文字变大，靠的是重排，而不是缩放。",
    loupe: ["半栏宽 = ", "两倍", "字号"] as const,
    formula: ["字号 ≈", "屏宽", "÷", "栏宽"] as const,
    toolsTitle: "更多工具 · 同款作者",
  },
  en: {
    nav: ["MODES", "OPTICS", "LOCAL · NO UPLOAD"],
    kicker: "Optical reflow",
    kickerId: "on-device",
    h1: ["Bring small columns into ", "focus.", ""] as const,
    lede: "Magnify each column to fill the phone, or reflow the page into one large, legible track. The whole conversion runs in your browser — nothing uploaded.",
    specs: [
      ["Engine", "k2pdfopt · WASM"],
      ["Data path", "on-device only"],
      ["Handles", "multi-col · scans"],
      ["Output", "phone PDF"],
    ],
    specimen:
      "The magnification a native column gains is bounded by geometry: a region scaled to fit the screen width grows only in proportion to how narrow it already is. A half-width column doubles; a full-width column barely moves. This is why two-column pages enlarge cleanly while single-column pages resist — and why reflow, not scaling, is the lever for full-width text on a phone.",
    loupe: ["A half-width column ", "doubles", ""] as const,
    formula: ["text size ≈", "screen width", "÷", "column width"] as const,
    toolsTitle: "More tools · same author",
  },
} as const;

/** Sibling tools (the newzone.top family) — cross-links, opens in a new tab. */
const TOOLS = [
  {
    href: "https://www.aishort.top",
    name: { zh: "AI Short", en: "AI Short" },
    desc: { zh: "ChatGPT 快捷指令 / 提示词库", en: "ChatGPT prompt shortcuts" },
  },
  {
    href: "https://prompt.newzone.top",
    name: { zh: "AI 绘图提示词", en: "AI Image Prompts" },
    desc: { zh: "AI 绘图关键词生成器", en: "AI image-prompt generator" },
  },
  {
    href: "https://tools.newzone.top",
    name: { zh: "AI 工具箱", en: "AI Toolbox" },
    desc: { zh: "在线 AI 小工具集", en: "Handy in-browser AI tools" },
  },
  {
    href: "https://talk.newzone.top",
    name: { zh: "AI 思想家圆桌", en: "AI Thinkers’ Roundtable" },
    desc: { zh: "多 AI 圆桌讨论", en: "Multi-AI roundtable chat" },
  },
] as const;

function App() {
  const [lang, setLang] = useState<"zh" | "en">(initialLang);
  const messages = lang === "en" ? en : zh;
  const h = HERO[lang];
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <ConfigProvider theme={opticalTheme}>
      <div className="rp">
        <div className="rp-topline" />
        <header className="rp-top">
          <div className="rp-brand">
            <span className="rp-lensmark" />
            ReflowPDF
          </div>
          <nav>
            <span className="k">{h.nav[0]}</span>
            <span className="k">{h.nav[1]}</span>
            <span className="k b">{h.nav[2]}</span>
            <span className="rp-lang">
              <Segmented
                size="small"
                value={lang}
                onChange={(v) => setLang(v as "zh" | "en")}
                options={[
                  { label: "中", value: "zh" },
                  { label: "EN", value: "en" },
                ]}
              />
            </span>
          </nav>
        </header>

        <main>
          <section className="rp-hero">
          <div className="rp-hcol left">
            <div className="rp-kicker">
              <span>{h.kicker}</span>
              <span className="id">{h.kickerId}</span>
            </div>
            <h1 className="rp-h1">
              {h.h1[0]}
              <span className="hl">{h.h1[1]}</span>
              {h.h1[2]}
            </h1>
            <p className="rp-lede">{h.lede}</p>
            <div className="rp-specs">
              {h.specs.map(([k, v]) => (
                <div className="rp-spec" key={k}>
                  <div className="k">{k}</div>
                  <div className="v">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rp-hcol bench rp-bench">
            <div className="rp-specimen" aria-hidden="true">{h.specimen}</div>
            <div className="rp-loupe">
              <div className="z">
                {h.loupe[0]}
                <span className="rp-loupe-keep">
                  <b>{h.loupe[1]}</b>
                  {h.loupe[2]}
                </span>
              </div>
            </div>
            <div className="rp-formula">
              <span className="eq">{h.formula[0]}</span>
              <span className="r">{h.formula[1]}</span>
              <span>{h.formula[2]}</span>
              <span className="r">{h.formula[3]}</span>
            </div>
          </div>
        </section>

        <section className="rp-panelwrap">
          <span className="rp-paneltag">{messages.panelTag}</span>
          <PdfToMobile engineConfig={engineConfig} messages={messages} showHeader={false} />
        </section>

        <section className="rp-tools">
          <div className="rp-tools-head">{h.toolsTitle}</div>
          <div className="rp-tools-grid">
            {TOOLS.map((tool) => (
              <a className="rp-tool" href={tool.href} target="_blank" rel="noopener noreferrer" key={tool.href}>
                <span className="rp-tool-name">
                  {tool.name[lang]}
                  <i>↗</i>
                </span>
                <span className="rp-tool-desc">{tool.desc[lang]}</span>
              </a>
            ))}
          </div>
          </section>
        </main>

        <footer className="rp-footer">
          <a href={__REPO_URL__} target="_blank" rel="noopener noreferrer">
            ⭐ GitHub:{__REPO_URL__.replace("https://github.com/", "")}
          </a>
          <span>{messages.footerNote}</span>
        </footer>
      </div>
    </ConfigProvider>
  );
}

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

if (new URLSearchParams(location.search).has("selftest")) {
  void selfTest();
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
