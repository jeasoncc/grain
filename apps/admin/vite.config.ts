import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			routesDirectory: "./src/routes",
			generatedRouteTree: "./src/routeTree.gen.ts",
			autoCodeSplitting: true,
		}),
		tailwindcss(),
		react(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	server: {
		port: 4000,
		strictPort: false,
		proxy: {
			"/api": {
				target: "http://localhost:4001",
				changeOrigin: true,
			},
		},
	},
});
