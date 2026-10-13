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
        /^@tiptap\//,
        "lowlight",
        "mermaid",
      ],
      output: {
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    minify: false,
  },
});
