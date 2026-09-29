import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		environmentOptions: {
			jsdom: {
				url: "http://localhost/",
			},
		},
		include: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/*.property.test.ts"],
		setupFiles: ["./src/test/setup.ts"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
