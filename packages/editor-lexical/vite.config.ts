import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "unplugin-dts/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      outDirs: "dist",
      bundleTypes: false,
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        document: resolve(import.meta.dirname, "src/document/index.ts"),
        code: resolve(import.meta.dirname, "src/code/index.ts"),
        diagram: resolve(import.meta.dirname, "src/diagram/index.ts"),
      },
      name: "GrainEditorLexical",
      formats: ["es"],
    },
    rolldownOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "lexical",
        /^@lexical\//,
        "@grain/editor-core",
        "mermaid",
        "prismjs",
      ],
    },
    sourcemap: true,
    minify: false,
  },
});
