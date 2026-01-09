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
import { initThemeFlow } from "@/flows/theme/init-theme.flow";
import {
	useEnableTransition,
	useIsThemeInitialized,
	useThemeKey,
	useThemeMode,
	useSystemTheme,
	useEffectiveTheme,
	useThemeStore,
	useThemeActions,
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
	const systemTheme = useSystemTheme();
	const effectiveTheme = useEffectiveTheme();
	const enableTransition = useEnableTransition();
	const isInitialized = useIsThemeInitialized();

	const actions = useThemeActions();
	const currentTheme = getThemeByKey(themeKey);

	// Set theme
	const setTheme = useCallback(
		(key: string) => {
			const theme = getThemeByKey(key);
			if (!theme) return;

			actions.setTheme(key);
			applyThemeFlow(key, enableTransition);
		},
		[actions, enableTransition],
	);

	// Set mode
	const setMode = useCallback(
		(newMode: ThemeMode) => {
			actions.setMode(newMode);
			const newThemeKey = setModeFlow(newMode, themeKey, enableTransition);
			if (newThemeKey !== themeKey) {
				actions.setTheme(newThemeKey);
			}
		},
		[actions, themeKey, enableTransition],
	);

	// Toggle mode
	const toggleMode = useCallback(() => {
		actions.toggleMode();
		const newMode = useThemeStore.getState().mode;
		const newThemeKey = setModeFlow(newMode, themeKey, enableTransition);
		if (newThemeKey !== themeKey) {
			actions.setTheme(newThemeKey);
		}
	}, [actions, themeKey, enableTransition]);

	// Set enable transition
	const setEnableTransition = useCallback(
		(enable: boolean) => {
			actions.setEnableTransition(enable);
		},
		[actions],
	);

	return {
		theme: themeKey,
		mode,
		systemTheme,
		effectiveTheme,
		currentTheme,
		themes: getThemes(),
		isDark: effectiveTheme === "dark",
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
	const isInitialized = useIsThemeInitialized();

	// Use ref to track cleanup function
	const cleanupRef = useRef<(() => void) | null>(null);

	// Initialize theme
	useEffect(() => {
		if (isInitialized) return;

		// Initialize theme system (sets up listeners and applies theme)
		const cleanup = initThemeFlow();
		cleanupRef.current = cleanup;

		return () => {
			if (cleanupRef.current) {
				cleanupRef.current();
				cleanupRef.current = null;
			}
		};
	}, [isInitialized]);
}

// ==============================
// Convenience Hooks
// ==============================

/**
 * Check if the current theme is dark.
 */
export const useIsDarkTheme = (): boolean => {
	const effectiveTheme = useEffectiveTheme();
	return effectiveTheme === "dark";
};

/**
 * Check if system mode is active.
 */
export const useIsSystemMode = (): boolean => {
	const mode = useThemeMode();
	return mode === "system";
};

// Re-export state selectors for convenience
export {
	useEnableTransition,
	useThemeKey,
	useThemeMode,
	useSystemTheme,
	useEffectiveTheme,
} from "@/state/theme.state";

// Re-export types for convenience
export type { ThemeMode } from "@/types/theme";

