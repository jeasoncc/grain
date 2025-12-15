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
      rollupTypes: true,
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "WheatEditor",
      formats: ["es"],
      fileName: "index",
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
