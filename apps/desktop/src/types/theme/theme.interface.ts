/**
 * Theme Domain - Interface Definitions
 *
 * Type definitions for theme state management.
 * Handles theme selection, mode (light/dark/system), and transitions.
 */

// ==============================
// Types
// ==============================

/**
 * Theme mode options.
 * - "light": Force light theme
 * - "dark": Force dark theme
 * - "system": Follow system preference
 */
export type ThemeMode = "light" | "dark" | "system";

// ==============================
// State Interface
// ==============================

/**
 * Theme state representing current theme configuration.
 * All properties are readonly to enforce immutability.
 */
export interface ThemeState {
	/** Current theme key (e.g., "default-dark", "default-light") */
	readonly themeKey: string;
	/** Theme mode: light, dark, or system */
	readonly mode: ThemeMode;
	/** Current system theme preference (detected from OS) */
	readonly systemTheme: "light" | "dark";
	/** Effective theme being applied (resolved from mode and systemTheme) */
	readonly effectiveTheme: "light" | "dark";
	/** Whether to enable transition animations when switching themes */
	readonly enableTransition: boolean;
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating theme state.
 */
export interface ThemeActions {
	/**
	 * Set the current theme by key.
	 * Also updates mode to match the theme type.
	 */
	setTheme: (key: string) => void;

	/**
	 * Set the theme mode.
	 * May trigger theme change if current theme doesn't match mode.
	 */
	setMode: (mode: ThemeMode) => void;

	/**
	 * Set the system theme preference (detected from OS).
	 * Updates effectiveTheme if mode is "system".
	 */
	setSystemTheme: (theme: "light" | "dark") => void;

	/**
	 * Toggle between light, dark, and system modes.
	 * Cycles: light → dark → system → light
	 */
	toggleMode: () => void;

	/**
	 * Enable or disable transition animations.
	 */
	setEnableTransition: (enable: boolean) => void;
}

// ==============================
// Configuration
// ==============================

/**
 * Configuration for theme state persistence.
 */
export interface ThemeConfig {
	/** Storage key for persistence */
	readonly storageKey: string;
	/** Transition duration in milliseconds */
	readonly transitionDuration: number;
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
	storageKey: "grain-theme",
	transitionDuration: 300,
} as const;

// ==============================
// Default Values
// ==============================

export const DEFAULT_THEME_STATE: ThemeState = {
	themeKey: "default-dark",
	mode: "dark",
	systemTheme: "dark",
	effectiveTheme: "dark",
	enableTransition: true,
} as const;
