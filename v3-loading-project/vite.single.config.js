import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "dist-single",
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    lib: { entry: "src/preview.jsx", formats: ["iife"], name: "NetCorePreview", fileName: () => "p.js", cssFileName: "p" }
  }
});
