/**
 * Theme Domain - Property-Based Tests
 *
 * Property tests for theme utility functions.
 * Uses fast-check for property-based testing.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ThemeMode } from "../theme.interface";
import {
	getDefaultThemeKey,
	getNextMode,
	isThemeTypeMatch,
} from "../theme.utils";

/**
 * **Feature: domain-driven-architecture, Property 1: Pure Functions Produce Consistent Output**
 * **Validates: Requirements 5.1**
 *
 * For any utility function and any valid input, calling the function multiple times
 * with the same input SHALL produce identical output.
 */
describe("Property 1: Pure Functions Produce Consistent Output", () => {
	it("getNextMode produces consistent output for any ThemeMode", () => {
		const themeModeArb = fc.constantFrom<ThemeMode>("light", "dark", "system");

		fc.assert(
			fc.property(themeModeArb, (mode) => {
				const result1 = getNextMode(mode);
				const result2 = getNextMode(mode);
				expect(result1).toBe(result2);
			}),
			{ numRuns: 100 },
		);
	});

	it("getDefaultThemeKey produces consistent output for any theme type", () => {
		const themeTypeArb = fc.constantFrom<"light" | "dark">("light", "dark");

		fc.assert(
			fc.property(themeTypeArb, (type) => {
				const result1 = getDefaultThemeKey(type);
				const result2 = getDefaultThemeKey(type);
				expect(result1).toBe(result2);
			}),
			{ numRuns: 100 },
		);
	});

	it("isThemeTypeMatch produces consistent output for any theme and type combination", () => {
		const themeTypeArb = fc.constantFrom<"light" | "dark">("light", "dark");
		const themeArb = fc.record({
			key: fc.string({ minLength: 1 }),
			name: fc.string({ minLength: 1 }),
			type: themeTypeArb,
		});

		fc.assert(
			fc.property(themeArb, themeTypeArb, (theme, expectedType) => {
				const result1 = isThemeTypeMatch(theme as any, expectedType);
				const result2 = isThemeTypeMatch(theme as any, expectedType);
				expect(result1).toBe(result2);
			}),
			{ numRuns: 100 },
		);
	});

	it("getNextMode cycles correctly through all modes", () => {
		// Verify the cycle: light → dark → system → light
		expect(getNextMode("light")).toBe("dark");
		expect(getNextMode("dark")).toBe("system");
		expect(getNextMode("system")).toBe("light");
	});

	it("getDefaultThemeKey returns correct theme keys", () => {
		expect(getDefaultThemeKey("light")).toBe("default-light");
		expect(getDefaultThemeKey("dark")).toBe("default-dark");
	});

	it("isThemeTypeMatch correctly matches theme types", () => {
		const lightTheme = { key: "test", name: "Test", type: "light" as const };
		const darkTheme = { key: "test", name: "Test", type: "dark" as const };

		expect(isThemeTypeMatch(lightTheme as any, "light")).toBe(true);
		expect(isThemeTypeMatch(lightTheme as any, "dark")).toBe(false);
		expect(isThemeTypeMatch(darkTheme as any, "dark")).toBe(true);
		expect(isThemeTypeMatch(darkTheme as any, "light")).toBe(false);
	});
});
