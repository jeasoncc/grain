import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        document: resolve(__dirname, "src/document/index.ts"),
        code: resolve(__dirname, "src/code/index.ts"),
        diagram: resolve(__dirname, "src/diagram/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@grain/editor-core",
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
        preserveModules: false,
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    minify: false,
  },
});
