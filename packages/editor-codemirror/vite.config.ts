import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      outDirs: "dist",
      bundleTypes: false,
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        document: resolve(import.meta.dirname, "src/document/index.ts"),
        code: resolve(import.meta.dirname, "src/code/index.ts"),
        diagram: resolve(import.meta.dirname, "src/diagram/index.ts"),
      },
      formats: ["es"],
    },
    rolldownOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@grain/editor-core",
        "mermaid",
        "@codemirror/state",
        "@codemirror/view",
        "@codemirror/language",
        "@codemirror/commands",
        "@codemirror/autocomplete",
        "@codemirror/lang-javascript",
        "@codemirror/lang-python",
        "@codemirror/lang-rust",
        "@codemirror/lang-markdown",
        "@codemirror/lang-json",
        "@codemirror/lang-html",
        "@codemirror/lang-css",
        "@codemirror/lang-sql",
      ],
      output: {
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    minify: false,
  },
});
