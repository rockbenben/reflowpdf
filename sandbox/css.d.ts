// Ambient declaration so side-effect CSS imports (e.g. `import "./design.css"`)
// type-check. Vite handles the actual bundling; TypeScript only needs to know
// the module exists. (TypeScript 7 enforces this; TS 5 was lenient.)
declare module "*.css";
