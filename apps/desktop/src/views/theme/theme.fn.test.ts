/**
 * @file fn/theme/theme.fn.test.ts
 * @description Theme 纯函数的单元测试
 */

import { describe, expect, it } from "vitest";
import type { Theme } from "@/utils/themes.util";
import {
	getDefaultThemeKey,
	getEffectiveThemeType,
	getNextMode,
	isThemeTypeMatch,
} from "./theme.fn";

// ============================================================================
// Test Data
// ============================================================================

const createMockTheme = (type: "light" | "dark"): Theme => ({
	key: `test-${type}`,
	name: `Test ${type}`,
	description: `Test ${type} theme`,
	type,
	colors: {
		background: type === "dark" ? "#000" : "#fff",
		foreground: type === "dark" ? "#fff" : "#000",
		card: type === "dark" ? "#111" : "#fafafa",
		cardForeground: type === "dark" ? "#fff" : "#000",
		popover: type === "dark" ? "#111" : "#fafafa",
		popoverForeground: type === "dark" ? "#fff" : "#000",
		primary: "#007acc",
		primaryForeground: "#ffffff",
		secondary: "#6c757d",
		secondaryForeground: "#ffffff",
		muted: "#6c757d",
		mutedForeground: "#aaaaaa",
		accent: "#17a2b8",
		accentForeground: "#ffffff",
		border: "#dee2e6",
		input: "#dee2e6",
		ring: "#007acc",
		sidebar: type === "dark" ? "#111" : "#f5f5f5",
		sidebarForeground: type === "dark" ? "#fff" : "#000",
		sidebarPrimary: "#007acc",
		sidebarPrimaryForeground: "#ffffff",
		sidebarAccent: "#17a2b8",
		sidebarAccentForeground: "#ffffff",
		sidebarBorder: "#dee2e6",
		folderColor: "#007acc",
		editorSelection: type === "dark" ? "#264f78" : "#add6ff",
	},
});

// ============================================================================
// getNextMode Tests
// ============================================================================

describe("getNextMode", () => {
	it("should return dark when current mode is light", () => {
		expect(getNextMode("light")).toBe("dark");
	});

	it("should return system when current mode is dark", () => {
		expect(getNextMode("dark")).toBe("system");
	});

	it("should return light when current mode is system", () => {
		expect(getNextMode("system")).toBe("light");
	});

	it("should return light for unknown mode", () => {
		// 测试未知模式时的默认行为
		expect(getNextMode("unknown" as "light" | "dark" | "system")).toBe("light");
	});

	it("should cycle through all modes correctly", () => {
		let mode: "light" | "dark" | "system" = "light";
		mode = getNextMode(mode); // dark
		expect(mode).toBe("dark");
		mode = getNextMode(mode); // system
		expect(mode).toBe("system");
		mode = getNextMode(mode); // light
		expect(mode).toBe("light");
	});
});

// ============================================================================
// getEffectiveThemeType Tests
// ============================================================================

describe("getEffectiveThemeType", () => {
	it("should return light when mode is light", () => {
		expect(getEffectiveThemeType("light")).toBe("light");
		expect(getEffectiveThemeType("light", "dark")).toBe("light");
	});

	it("should return dark when mode is dark", () => {
		expect(getEffectiveThemeType("dark")).toBe("dark");
		expect(getEffectiveThemeType("dark", "light")).toBe("dark");
	});

	it("should return system preference when mode is system", () => {
		expect(getEffectiveThemeType("system", "light")).toBe("light");
		expect(getEffectiveThemeType("system", "dark")).toBe("dark");
	});

	it("should default to light when system preference not provided", () => {
		expect(getEffectiveThemeType("system")).toBe("light");
	});
});

// ============================================================================
// getDefaultThemeKey Tests
// ============================================================================

describe("getDefaultThemeKey", () => {
	it("should return default-dark for dark type", () => {
		expect(getDefaultThemeKey("dark")).toBe("default-dark");
	});

	it("should return default-light for light type", () => {
		expect(getDefaultThemeKey("light")).toBe("default-light");
	});
});

// ============================================================================
// isThemeTypeMatch Tests
// ============================================================================

describe("isThemeTypeMatch", () => {
	it("should return true when theme type matches expected type", () => {
		const lightTheme = createMockTheme("light");
		const darkTheme = createMockTheme("dark");

		expect(isThemeTypeMatch(lightTheme, "light")).toBe(true);
		expect(isThemeTypeMatch(darkTheme, "dark")).toBe(true);
	});

	it("should return false when theme type does not match expected type", () => {
		const lightTheme = createMockTheme("light");
		const darkTheme = createMockTheme("dark");

		expect(isThemeTypeMatch(lightTheme, "dark")).toBe(false);
		expect(isThemeTypeMatch(darkTheme, "light")).toBe(false);
	});
});
