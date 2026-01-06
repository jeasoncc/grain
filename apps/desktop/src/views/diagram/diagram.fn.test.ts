/**
 * @file fn/diagram/diagram.fn.test.ts
 * @description Diagram 纯函数测试
 */

import { describe, expect, it } from "vitest";
import type { DiagramState } from "@/types/diagram";
import {
	createDefaultDiagramState,
	DEFAULT_KROKI_URL,
	getKrokiMermaidUrl,
	getKrokiPlantUMLUrl,
	isKrokiEnabled,
	isValidKrokiUrl,
	normalizeKrokiUrl,
} from "./diagram.fn";

describe("getKrokiPlantUMLUrl", () => {
	it("should generate correct URL for svg", () => {
		const url = getKrokiPlantUMLUrl("https://kroki.io", "svg");
		expect(url).toBe("https://kroki.io/plantuml/svg");
	});

	it("should generate correct URL for png", () => {
		const url = getKrokiPlantUMLUrl("https://kroki.io", "png");
		expect(url).toBe("https://kroki.io/plantuml/png");
	});

	it("should default to svg format", () => {
		const url = getKrokiPlantUMLUrl("https://kroki.io");
		expect(url).toBe("https://kroki.io/plantuml/svg");
	});

	it("should throw when URL not configured", () => {
		expect(() => getKrokiPlantUMLUrl("")).toThrow(
			"Kroki server URL not configured",
		);
	});
});

describe("getKrokiMermaidUrl", () => {
	it("should generate correct URL for svg", () => {
		const url = getKrokiMermaidUrl("https://kroki.io", "svg");
		expect(url).toBe("https://kroki.io/mermaid/svg");
	});

	it("should generate correct URL for png", () => {
		const url = getKrokiMermaidUrl("https://kroki.io", "png");
		expect(url).toBe("https://kroki.io/mermaid/png");
	});

	it("should throw when URL not configured", () => {
		expect(() => getKrokiMermaidUrl("")).toThrow(
			"Kroki server URL not configured",
		);
	});
});

describe("isKrokiEnabled", () => {
	it("should return true when enabled and URL configured", () => {
		const state: DiagramState = {
			enableKroki: true,
			krokiServerUrl: "https://kroki.io",
		};
		expect(isKrokiEnabled(state)).toBe(true);
	});

	it("should return false when disabled", () => {
		const state: DiagramState = {
			enableKroki: false,
			krokiServerUrl: "https://kroki.io",
		};
		expect(isKrokiEnabled(state)).toBe(false);
	});

	it("should return false when URL empty", () => {
		const state: DiagramState = {
			enableKroki: true,
			krokiServerUrl: "",
		};
		expect(isKrokiEnabled(state)).toBe(false);
	});
});

describe("isValidKrokiUrl", () => {
	it("should return true for valid http URL", () => {
		expect(isValidKrokiUrl("http://localhost:8000")).toBe(true);
	});

	it("should return true for valid https URL", () => {
		expect(isValidKrokiUrl("https://kroki.io")).toBe(true);
	});

	it("should return false for empty string", () => {
		expect(isValidKrokiUrl("")).toBe(false);
	});

	it("should return false for invalid URL", () => {
		expect(isValidKrokiUrl("not-a-url")).toBe(false);
	});

	it("should return false for non-http protocol", () => {
		expect(isValidKrokiUrl("ftp://example.com")).toBe(false);
	});
});

describe("normalizeKrokiUrl", () => {
	it("should remove trailing slash", () => {
		expect(normalizeKrokiUrl("https://kroki.io/")).toBe("https://kroki.io");
	});

	it("should remove multiple trailing slashes", () => {
		expect(normalizeKrokiUrl("https://kroki.io///")).toBe("https://kroki.io");
	});

	it("should not modify URL without trailing slash", () => {
		expect(normalizeKrokiUrl("https://kroki.io")).toBe("https://kroki.io");
	});
});

describe("DEFAULT_KROKI_URL", () => {
	it("should be the official Kroki URL", () => {
		expect(DEFAULT_KROKI_URL).toBe("https://kroki.io");
	});
});

describe("createDefaultDiagramState", () => {
	it("should create state with default values", () => {
		const state = createDefaultDiagramState();
		expect(state.krokiServerUrl).toBe(DEFAULT_KROKI_URL);
		expect(state.enableKroki).toBe(true);
	});
});
