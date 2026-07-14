// pdfjs-dist ships type declarations for the main "pdf.mjs" entry point but not
// for the worker build, even though importing it directly (see segmentPdf.ts) is
// how we avoid needing a separately-served worker asset. Declare it as `any` so
// TypeScript compiles; the only member we use (`WorkerMessageHandler`) is
// consumed dynamically by pdf.js itself via `globalThis.pdfjsWorker`.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
