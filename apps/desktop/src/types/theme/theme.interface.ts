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
export type ThemeMode = "light" | "dark" | "system"

// ==============================
// State Interface
// ==============================

/**
 * Theme state representing current theme configuration.
 * All properties are readonly to enforce immutability.
 */
export interface ThemeState {
	/** Current theme key (e.g., "default-dark", "default-light") */
	readonly themeKey: string
	/** Exact named palettes used when following native system appearance. */
	readonly lightThemeKey: string
	readonly darkThemeKey: string
	/** Theme mode: light, dark, or system */
	readonly mode: ThemeMode
	/** Current system theme preference (detected from OS) */
	readonly systemTheme: "light" | "dark"
	/** Effective theme being applied (resolved from mode and systemTheme) */
	readonly effectiveTheme: "light" | "dark"
	/** Whether to enable transition animations when switching themes */
	readonly enableTransition: boolean
}


// ==============================
// Default Values
// ==============================

export const DEFAULT_THEME_STATE: ThemeState = {
	effectiveTheme: "dark",
	enableTransition: true,
	mode: "dark",
	systemTheme: "dark",
	lightThemeKey: "GitHub",
	darkThemeKey: "GitHub Dark",
	themeKey: "GitHub Dark",
} as const
