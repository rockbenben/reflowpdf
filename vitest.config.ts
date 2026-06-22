import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Separate from vite.config.ts (which roots at sandbox/ for the browser demo).
// Tests live under src/ at the project root.
export default defineConfig({
  plugins: [react()],
  test: {
    root: ".",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
