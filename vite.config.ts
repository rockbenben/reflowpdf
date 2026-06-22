import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Sandbox dev/build for the browser demo (also the GitHub Pages build).
// - base "./" → works under any GitHub Pages subpath (https://user.github.io/<repo>/)
// - publicDir = dist/ → serves k2pdfopt.{mjs,wasm} at the site root
// - __REPO_URL__ is injected from GITHUB_REPOSITORY in CI (placeholder locally)
const repoUrl = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : "https://github.com/rockbenben/reflowpdf";

export default defineConfig({
  root: "sandbox",
  base: "./",
  publicDir: "../dist",
  plugins: [react()],
  define: { __REPO_URL__: JSON.stringify(repoUrl) },
  server: { fs: { allow: [".."] } },
  build: { outDir: "../sandbox-dist", emptyOutDir: true },
});
