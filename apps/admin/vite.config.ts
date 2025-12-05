import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'

import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 4000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
});

