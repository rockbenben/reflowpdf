# ReflowPDF

[![Live Demo](https://img.shields.io/badge/demo-live-2563eb)](https://rockbenben.github.io/reflowpdf/)
[![Deploy](https://github.com/rockbenben/reflowpdf/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/rockbenben/reflowpdf/actions/workflows/deploy-pages.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](./LICENSE)

Enlarge / reflow a PDF into a phone-friendly layout — **entirely in the browser, no upload**.
Powered by [k2pdfopt](https://www.willus.com/k2pdfopt/) compiled to WebAssembly.

**Live demo:** https://rockbenben.github.io/reflowpdf/
**License:** AGPL-3.0 · **Status:** working demo (see scope below — not a "preserve-layout" tool)

> 365 Open Source Plan #017 · enlarge / reflow PDFs for phone reading, in the browser

[中文](./README.md)

![ReflowPDF screenshot](docs/screenshot-en.png)

---

## What it does / doesn't (read first)

ReflowPDF fixes "the PDF text is too small on my phone, I keep pinch-zooming" — by
**enlarging / reflowing**, entirely in your browser, nothing uploaded.

**"Will complex layouts (multi-column / figures / tables / equations) get mangled? Is reading order preserved?"** — the most-asked question, answered up front:

- ✅ **Multi-column / figures / tables / equations** (papers) → "Magnify" and "Smart hybrid" **preserve reading order** and enlarge each column/figure **as an intact block** — figures, tables and equations are kept as-is, **never flattened or torn apart**.
- ✅ **Mixed single/two-column pages** (a full-width title/abstract over a two-column body) → "Smart hybrid" keeps the two-column vector and enlarges the full-width parts into big text.
- ✅ **Text-heavy docs** (reports, books) → "Reflow text" reflows into a single big-text column; read on a phone without zooming.
- ⚠️ **It does NOT semantically reconstruct tables/equations.** This tool *magnifies*, it doesn't re-typeset — it won't re-lay a wide table into a portrait mobile table. That reconstruction needs an AI layout model (Adobe Liquid Mode / MinerU-class, backend + upload) and conflicts with the local, no-upload premise.
- ⚠️ **A single-column, full-width dense document** can't both keep its layout and get bigger text — an information-density limit. "Smart hybrid" lifts this for born-digital PDFs by reflowing only the full-width regions; otherwise use "Preserve layout" for a faithful view (text stays small) or "Reflow text" for the biggest type (breaks layout).
- ⚠️ **Scans** (no text layer): "Smart hybrid" falls back to "Magnify"; "Reflow text" would need OCR, which isn't done yet.

## Four layout modes

| Mode | Effect | Reading order / figures | Best for |
|---|---|---|---|
| **Magnify** (default) | Native vector + color kept; auto-detects columns and enlarges each region onto its own page; single-column pages fall back to fit-width | preserved; figures enlarged as intact blocks | multi-column / papers with figures |
| **Smart hybrid** | Per-page split: two-column regions kept as magnified vector, full-width regions (title/abstract) turned into big text (born-digital only) | preserved; two-column stays vector | pages mixing single & two-column |
| **Preserve layout** | Each page → one page scaled to phone width, vector + color, but text is small | preserved | faithful preview |
| **Reflow text** | Biggest, single-column text — but rasterizes, drops color, breaks layout; complex tables may garble | preserved but layout broken | plain prose |

> 🔒 Privacy: conversion runs in the browser via WebAssembly; your PDF is **never uploaded**.

## Use it online

Open the [demo](https://rockbenben.github.io/reflowpdf/) → drop a PDF → pick a mode →
Convert → Download. The ~36MB engine (with CJK fonts) loads once; conversions are local and fast.

## Build locally

```bash
bash scripts/fetch-src.sh          # vendor k2pdfopt v2.55 + MuPDF 1.23.7 (gitignored)
npm run build:wasm                 # Docker + Emscripten → dist/k2pdfopt.{mjs,wasm}
npm test && npm run test:engine    # unit + engine integration tests
npm run build:pages && npx vite preview   # local demo preview
```

> ⚠️ Don't use `npm run dev`: the engine glue is served from `publicDir`, and Vite dev
> refuses to `import()` a public asset from source. `build + preview` and GitHub Pages work fine.

## Deploy to GitHub Pages

Push to GitHub, then **Settings → Pages → Source: "GitHub Actions"**. The bundled
`.github/workflows/deploy-pages.yml` builds the wasm (Docker + Emscripten) and the demo
(relative base, subpath-safe) and publishes it. The footer GitHub link is injected from
`GITHUB_REPOSITORY` in CI. If `dist/k2pdfopt.wasm` is committed, CI skips the (slow) wasm rebuild.

## How it works

`PDF bytes → k2pdfopt (WASM) in a Web Worker → reflowed/enlarged PDF bytes`, off the main thread.
The engine (`src/engine/`) is decoupled from the UI (`src/ui/`) and reusable.

## API

```ts
import { convertPdf } from "./src/engine/convertPdf";

const out = await convertPdf(pdfBytes, {
  layout: "magnify",        // "magnify" (default) | "hybrid" | "preserve" | "reflow"
  device: "phone",          // "phone" | "tablet" | { width, height, dpi }
  columns: "auto", fontScale: 1.0, trimMargins: true,  // reflow-only
  onProgress: ({ page, total }) => console.log(`${page}/${total}`),
  onNotice: (code) => {},   // non-fatal notices, e.g. "noTextLayerFallback"
}, {
  // worker creation is bundler-specific — caller must provide it (see sandbox/main.tsx)
  moduleUrl: new URL("k2pdfopt.mjs", document.baseURI).href,
  createWorker: () => new Worker(new URL("./engine/worker.ts", import.meta.url), { type: "module" }),
});
```

## License & credits

Released under **AGPL-3.0**, because the distributed `.wasm` bundles
[MuPDF](https://mupdf.com/) (**AGPL-3.0** / commercial) and
[k2pdfopt](https://www.willus.com/k2pdfopt/) (**GPL-3.0**); their strong copyleft governs
the whole distribution (see [`LICENSE`](./LICENSE)). Thanks to willus.com (k2pdfopt) and
Artifex (MuPDF).

## About the 365 Open Source Plan

This is project #17 of the [365 Open Source Plan](https://github.com/rockbenben/365opensource).

One person + AI, 300+ open-source projects in a year. [Submit your idea →](https://my.feishu.cn/share/base/form/shrcnI6y7rrmlSjbzkYXh6sjmzb)
