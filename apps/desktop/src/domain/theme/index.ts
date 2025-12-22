/**
 * Theme Domain - Module Entry Point
 *
 * Unified exports for theme state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	ThemeActions,
	ThemeConfig,
	ThemeMode,
	ThemeState,
} from "./theme.interface";

export { DEFAULT_THEME_CONFIG, DEFAULT_THEME_STATE } from "./theme.interface";

// ==============================
// Utility Functions
// ==============================

export {
	applyThemeWithTransition,
	getDefaultThemeKey,
	getEffectiveThemeType,
	getNextMode,
	getSystemTheme,
	isThemeTypeMatch,
} from "./theme.utils";

// ==============================
// Store & Hooks
// ==============================

export {
	initializeTheme,
	useEnableTransition,
	useIsDarkTheme,
	useIsSystemMode,
	useTheme,
	useThemeKey,
	useThemeMode,
	useThemeStore,
} from "./theme.store";
