/**
 * Theme Domain - Module Entry Point
 *
 * Unified exports for theme state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	ThemeMode,
	ThemeState,
	ThemeActions,
	ThemeConfig,
} from "./theme.interface";

export { DEFAULT_THEME_CONFIG, DEFAULT_THEME_STATE } from "./theme.interface";

// ==============================
// Utility Functions
// ==============================

export {
	getSystemTheme,
	applyThemeWithTransition,
	getNextMode,
	getEffectiveThemeType,
	getDefaultThemeKey,
	isThemeTypeMatch,
} from "./theme.utils";

// ==============================
// Store & Hooks
// ==============================

export {
	useThemeStore,
	initializeTheme,
	useThemeKey,
	useThemeMode,
	useEnableTransition,
	useIsDarkTheme,
	useIsSystemMode,
	useTheme,
} from "./theme.store";
