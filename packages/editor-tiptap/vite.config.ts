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
        "@tiptap/core",
        "@tiptap/react",
        "@tiptap/starter-kit",
        "@tiptap/pm",
        "@tiptap/extension-code-block-lowlight",
        "@tiptap/extension-link",
        "@tiptap/extension-placeholder",
        "@tiptap/extension-table",
        "@tiptap/extension-table-cell",
        "@tiptap/extension-table-header",
        "@tiptap/extension-table-row",
        "@tiptap/extension-task-item",
        "@tiptap/extension-task-list",
        "lowlight",
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
