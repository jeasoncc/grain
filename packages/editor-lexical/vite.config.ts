import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        document: resolve(__dirname, "src/document/index.ts"),
        code: resolve(__dirname, "src/code/index.ts"),
        diagram: resolve(__dirname, "src/diagram/index.ts"),
      },
      name: "GrainEditorLexical",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "lexical",
        "@lexical/react",
        "@lexical/code",
        "@lexical/hashtag",
        "@lexical/link",
        "@lexical/list",
        "@lexical/markdown",
        "@lexical/overflow",
        "@lexical/rich-text",
        "@lexical/table",
        "@lexical/selection",
        "@lexical/text",
        "@lexical/utils",
        "@grain/editor-core",
        "mermaid",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          lexical: "Lexical",
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});
