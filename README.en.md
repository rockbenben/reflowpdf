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

![ReflowPDF screenshot](docs/screenshot.png)

---

## What it does / doesn't (read first)

ReflowPDF fixes "the PDF text is too small on my phone, I keep pinch-zooming" — by
**enlarging / reflowing**.

- ✅ **Text-heavy docs** (reports, books) → reflowed into a single big-text column; read on a phone without zooming.
- ✅ **Multi-column / side-by-side regions** → "Magnify" puts each region on its own enlarged page.
- ⚠️ **It does NOT guarantee preserving the original layout.** For a single-column,
  full-width dense document you cannot both keep the layout and make the text bigger —
  that's an information-density limit. Only AI reflow (Adobe Liquid Mode / MinerU-class
  models, which need a backend + upload) can do that, conflicting with this project's
  static / no-upload premise. Use "Preserve layout" mode for a faithful view (text stays small).

## Three layout modes

| Mode | Effect | Best for |
|---|---|---|
| **Magnify** (default) | Native vector + color kept; auto-detects columns and enlarges each region onto its own page; single-column pages fall back to fit-width | multi-column / boxed |
| **Preserve layout** | Each page → one page scaled to phone width, vector + color, but text is small | faithful preview |
| **Reflow text** | Biggest, single-column text — but rasterizes, drops color, breaks layout | plain prose |

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
  layout: "magnify",        // "magnify" (default) | "preserve" | "reflow"
  device: "phone",          // "phone" | "tablet" | { width, height, dpi }
  columns: "auto", fontScale: 1.0, trimMargins: true,  // reflow-only
  onProgress: ({ page, total }) => console.log(`${page}/${total}`),
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
