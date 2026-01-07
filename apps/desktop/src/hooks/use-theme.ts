/**
 * @file hooks/use-theme.ts
 * @description Theme React 绑定
 *
 * 连接 state 和 flows，提供 React 组件使用的主题功能。
 *
 * 依赖规则：hooks/ 只能依赖 flows/, state/, types/
 */

import { useCallback, useEffect, useRef } from "react";
import {
	applyThemeFlow,
	getNextModeFlow,
	getThemeByKey,
	getThemes,
	handleSystemThemeChangeFlow,
	initializeThemeFlow,
	setModeFlow,
} from "@/flows/theme";
import {
	useEnableTransition,
	useIsThemeInitialized,
	useThemeKey,
	useThemeMode,
	useThemeStore,
} from "@/state/theme.state";
import type { ThemeMode } from "@/types/theme";

// ==============================
// Theme Hook
// ==============================

/**
 * Main theme hook providing all theme-related state and actions.
 */
export function useTheme() {
	const themeKey = useThemeKey();
	const mode = useThemeMode();
	const enableTransition = useEnableTransition();
	const isInitialized = useIsThemeInitialized();

	const store = useThemeStore();
	const currentTheme = getThemeByKey(themeKey);

	// Set theme
	const setTheme = useCallback(
		(key: string) => {
			const theme = getThemeByKey(key);
			if (!theme) return;

			store.setThemeKey(key);
			store.setMode(theme.type);
			applyThemeFlow(key, enableTransition);
		},
		[store, enableTransition],
	);

	// Set mode
	const setMode = useCallback(
		(newMode: ThemeMode) => {
			store.setMode(newMode);
			const newThemeKey = setModeFlow(newMode, themeKey, enableTransition);
			if (newThemeKey !== themeKey) {
				store.setThemeKey(newThemeKey);
			}
		},
		[store, themeKey, enableTransition],
	);

	// Toggle mode
	const toggleMode = useCallback(() => {
		const newMode = getNextModeFlow(mode);
		setMode(newMode);
	}, [mode, setMode]);

	// Set enable transition
	const setEnableTransition = useCallback(
		(enable: boolean) => {
			store.setEnableTransition(enable);
		},
		[store],
	);

	return {
		theme: themeKey,
		mode,
		currentTheme,
		themes: getThemes(),
		isDark: currentTheme?.type === "dark",
		isSystem: mode === "system",
		enableTransition,
		isInitialized,
		setTheme,
		setMode,
		toggleMode,
		setEnableTransition,
	};
}

// ==============================
// Theme Initialization Hook
// ==============================

/**
 * Initialize theme on application startup.
 * Should be called once at the root component.
 */
export function useThemeInitialization(): void {
	const store = useThemeStore();
	const isInitialized = useIsThemeInitialized();
	const themeKey = useThemeKey();
	const mode = useThemeMode();
	const enableTransition = useEnableTransition();

	// Use ref to track if we've set up the listener
	const listenerRef = useRef<(() => void) | null>(null);

	// Initialize theme
	useEffect(() => {
		if (isInitialized) return;

		const { newThemeKey } = initializeThemeFlow(themeKey, mode);

		if (newThemeKey !== themeKey) {
			store.setThemeKey(newThemeKey);
		}

		store.setInitialized(true);
	}, [isInitialized, themeKey, mode, store]);

	// Set up system theme change listener
	useEffect(() => {
		if (typeof window === "undefined") return;

		// Clean up previous listener
		if (listenerRef.current) {
			listenerRef.current();
		}

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (e: MediaQueryListEvent) => {
			const currentMode = useThemeStore.getState().mode;
			const currentEnableTransition =
				useThemeStore.getState().enableTransition;

			const newThemeKey = handleSystemThemeChangeFlow(
				currentMode,
				currentEnableTransition,
				e.matches,
			);

			if (newThemeKey) {
				useThemeStore.getState().setThemeKey(newThemeKey);
			}
		};

		mediaQuery.addEventListener("change", handleChange);
		listenerRef.current = () =>
			mediaQuery.removeEventListener("change", handleChange);

		return () => {
			if (listenerRef.current) {
				listenerRef.current();
				listenerRef.current = null;
			}
		};
	}, []);
}

// ==============================
// Convenience Hooks
// ==============================

/**
 * Check if the current theme is dark.
 */
export const useIsDarkTheme = (): boolean => {
	const themeKey = useThemeKey();
	const theme = getThemeByKey(themeKey);
	return theme?.type === "dark";
};

/**
 * Check if system mode is active.
 */
export const useIsSystemMode = (): boolean => {
	const mode = useThemeMode();
	return mode === "system";
};

// Re-export state selectors for convenience
export { useEnableTransition, useThemeKey, useThemeMode } from "@/state/theme.state";
