import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    emptyOutDir: true,
    outDir: "../../dist/normal",
    target: "baseline-widely-available",
  },
  plugins: [react()],
});
