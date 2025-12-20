/**
 * Theme Domain - Pure Utility Functions
 *
 * All pure functions for theme management.
 * - No side effects
 * - Same input → Same output
 * - Does not modify input parameters
 */

import type { ThemeMode } from "./theme.interface";
import { DEFAULT_THEME_CONFIG } from "./theme.interface";
import { applyTheme, type Theme } from "@/lib/themes";

// ==============================
// System Theme Detection
// ==============================

/**
 * Get the current system theme preference.
 * Returns "light" or "dark" based on the system's color scheme.
 *
 * @returns The system theme preference
 */
export const getSystemTheme = (): "light" | "dark" => {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

// ==============================
// Theme Application
// ==============================

/**
 * Apply a theme with optional transition animation.
 * Adds a CSS class for smooth transitions when enabled.
 *
 * @param theme - The theme to apply
 * @param enableTransition - Whether to enable transition animation
 */
export const applyThemeWithTransition = (
	theme: Theme,
	enableTransition: boolean
): void => {
	const root = document.documentElement;

	if (enableTransition) {
		// Add transition class
		root.classList.add("theme-transition");

		// Apply theme
		applyTheme(theme);

		// Remove transition class after animation completes
		setTimeout(() => {
			root.classList.remove("theme-transition");
		}, DEFAULT_THEME_CONFIG.transitionDuration);
	} else {
		applyTheme(theme);
	}
};

// ==============================
// Mode Calculations
// ==============================

/**
 * Calculate the next mode in the toggle cycle.
 * Cycles: light → dark → system → light
 *
 * @param currentMode - The current theme mode
 * @returns The next theme mode in the cycle
 */
export const getNextMode = (currentMode: ThemeMode): ThemeMode => {
	switch (currentMode) {
		case "light":
			return "dark";
		case "dark":
			return "system";
		case "system":
			return "light";
		default:
			return "light";
	}
};

/**
 * Get the effective theme type based on mode.
 * For "system" mode, returns the system preference.
 *
 * @param mode - The theme mode
 * @returns The effective theme type ("light" or "dark")
 */
export const getEffectiveThemeType = (mode: ThemeMode): "light" | "dark" => {
	if (mode === "system") {
		return getSystemTheme();
	}
	return mode;
};

/**
 * Get the default theme key for a given theme type.
 *
 * @param type - The theme type ("light" or "dark")
 * @returns The default theme key for that type
 */
export const getDefaultThemeKey = (type: "light" | "dark"): string => {
	return type === "dark" ? "default-dark" : "default-light";
};

/**
 * Check if a theme matches the expected type.
 *
 * @param theme - The theme to check
 * @param expectedType - The expected theme type
 * @returns Whether the theme matches the expected type
 */
export const isThemeTypeMatch = (
	theme: Theme,
	expectedType: "light" | "dark"
): boolean => {
	return theme.type === expectedType;
};
