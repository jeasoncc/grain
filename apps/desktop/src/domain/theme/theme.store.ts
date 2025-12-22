/**
 * Theme Domain - Zustand Store with Immer
 *
 * Manages theme state including theme selection, mode, and transitions.
 * Uses Zustand + Immer for immutable state management.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { getThemeByKey, type Theme, themes } from "@/lib/themes";
import type { ThemeActions, ThemeMode, ThemeState } from "./theme.interface";
import { DEFAULT_THEME_CONFIG, DEFAULT_THEME_STATE } from "./theme.interface";
import {
	applyThemeWithTransition,
	getDefaultThemeKey,
	getEffectiveThemeType,
	getNextMode,
	getSystemTheme,
	isThemeTypeMatch,
} from "./theme.utils";

// ==============================
// Internal State
// ==============================

interface InternalThemeState {
	/** Whether the theme has been initialized */
	_initialized: boolean;
}

// ==============================
// Store Type
// ==============================

type ThemeStore = ThemeState & ThemeActions & InternalThemeState;

// ==============================
// Store Implementation
// ==============================

export const useThemeStore = create<ThemeStore>()(
	persist(
		immer((set, get) => ({
			// Initial State
			...DEFAULT_THEME_STATE,
			_initialized: false,

			// ==============================
			// Actions
			// ==============================

			setTheme: (key: string) => {
				const theme = getThemeByKey(key);
				if (!theme) return;

				const { enableTransition } = get();

				set((state) => {
					state.themeKey = key;
					// When selecting a specific theme, exit system mode
					state.mode = theme.type;
				});

				// Apply theme with transition
				applyThemeWithTransition(theme, enableTransition);
			},

			setMode: (mode: ThemeMode) => {
				const { themeKey, enableTransition } = get();
				const currentTheme = getThemeByKey(themeKey);

				set((state) => {
					state.mode = mode;
				});

				if (mode === "system") {
					// System mode: select theme based on system preference
					const systemType = getSystemTheme();
					if (currentTheme && !isThemeTypeMatch(currentTheme, systemType)) {
						// Find matching default theme
						const defaultThemeKey = getDefaultThemeKey(systemType);
						const newTheme = getThemeByKey(defaultThemeKey);
						if (newTheme) {
							set((state) => {
								state.themeKey = defaultThemeKey;
							});
							applyThemeWithTransition(newTheme, enableTransition);
						}
					} else if (currentTheme) {
						applyThemeWithTransition(currentTheme, enableTransition);
					}
				} else {
					// Manual mode: switch to default theme if current doesn't match
					if (currentTheme && !isThemeTypeMatch(currentTheme, mode)) {
						const defaultThemeKey = getDefaultThemeKey(mode);
						const newTheme = getThemeByKey(defaultThemeKey);
						if (newTheme) {
							set((state) => {
								state.themeKey = defaultThemeKey;
							});
							applyThemeWithTransition(newTheme, enableTransition);
						}
					} else if (currentTheme) {
						applyThemeWithTransition(currentTheme, enableTransition);
					}
				}
			},

			toggleMode: () => {
				const { mode, setMode } = get();
				const newMode = getNextMode(mode);
				setMode(newMode);
			},

			setEnableTransition: (enable: boolean) => {
				set((state) => {
					state.enableTransition = enable;
				});
			},
		})),
		{
			name: DEFAULT_THEME_CONFIG.storageKey,
			partialize: (state) => ({
				themeKey: state.themeKey,
				mode: state.mode,
				enableTransition: state.enableTransition,
			}),
		},
	),
);

// ==============================
// System Theme Listener
// ==============================

/** Cleanup function for system theme listener */
let systemThemeCleanup: (() => void) | null = null;

/**
 * Initialize theme on application startup.
 * Sets up the initial theme and system theme listener.
 *
 * @returns Cleanup function to remove the system theme listener
 */
export function initializeTheme(): (() => void) | undefined {
	// Prevent duplicate initialization
	if (useThemeStore.getState()._initialized) {
		return systemThemeCleanup || undefined;
	}

	const { themeKey, mode } = useThemeStore.getState();

	// Determine effective theme based on mode
	let effectiveThemeKey = themeKey;

	if (mode === "system") {
		const systemType = getSystemTheme();
		const currentTheme = getThemeByKey(themeKey);

		// If current theme type doesn't match system, use default
		if (currentTheme && !isThemeTypeMatch(currentTheme, systemType)) {
			effectiveThemeKey = getDefaultThemeKey(systemType);
			useThemeStore.setState({ themeKey: effectiveThemeKey });
		}
	}

	const theme = getThemeByKey(effectiveThemeKey);
	if (theme) {
		// No animation on initialization
		applyThemeWithTransition(theme, false);
	}

	// Mark as initialized
	useThemeStore.setState({ _initialized: true });

	// Set up system theme change listener
	if (typeof window !== "undefined") {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (e: MediaQueryListEvent) => {
			const { mode, enableTransition } = useThemeStore.getState();

			if (mode === "system") {
				const newType = e.matches ? "dark" : "light";
				const defaultThemeKey = getDefaultThemeKey(newType);
				const theme = getThemeByKey(defaultThemeKey);

				if (theme) {
					useThemeStore.setState({ themeKey: defaultThemeKey });
					applyThemeWithTransition(theme, enableTransition);
				}
			}
		};

		mediaQuery.addEventListener("change", handleChange);

		// Save cleanup function
		systemThemeCleanup = () =>
			mediaQuery.removeEventListener("change", handleChange);

		return systemThemeCleanup;
	}
}

// ==============================
// Selector Hooks
// ==============================

/**
 * Get the current theme key.
 */
export const useThemeKey = (): string => {
	return useThemeStore((state) => state.themeKey);
};

/**
 * Get the current theme mode.
 */
export const useThemeMode = (): ThemeMode => {
	return useThemeStore((state) => state.mode);
};

/**
 * Get whether transitions are enabled.
 */
export const useEnableTransition = (): boolean => {
	return useThemeStore((state) => state.enableTransition);
};

/**
 * Check if the current theme is dark.
 */
export const useIsDarkTheme = (): boolean => {
	return useThemeStore((state) => {
		const theme = getThemeByKey(state.themeKey);
		return theme?.type === "dark";
	});
};

/**
 * Check if system mode is active.
 */
export const useIsSystemMode = (): boolean => {
	return useThemeStore((state) => state.mode === "system");
};

// ==============================
// Convenience Hook
// ==============================

/**
 * Convenience hook providing all theme-related state and actions.
 */
export function useTheme() {
	const store = useThemeStore();
	const currentTheme = getThemeByKey(store.themeKey);

	return {
		theme: store.themeKey,
		mode: store.mode,
		currentTheme,
		themes,
		isDark: currentTheme?.type === "dark",
		isSystem: store.mode === "system",
		enableTransition: store.enableTransition,
		setTheme: store.setTheme,
		setMode: store.setMode,
		toggleMode: store.toggleMode,
		setEnableTransition: store.setEnableTransition,
	};
}
