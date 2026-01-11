/**
 * @file flows/theme/init-theme.flow.ts
 * @description 主题系统初始化流程
 *
 * 职责：应用启动时初始化主题系统
 * 依赖：io/dom/, state/, types/
 *
 * 设计原则：
 * - 读取持久化的主题设置
 * - 监听系统主题变化
 * - 应用主题到 DOM
 */

import { getSystemTheme } from "@/io/dom/theme.dom";
import { info, debug, warn, error } from "@/io/log/logger.api";
import { useThemeStore } from "@/state";
import {
	handleSystemThemeChangeFlow,
	initializeThemeFlow,
} from "./apply-theme.flow";

// ============================================================================
// Theme Initialization Flow
// ============================================================================

/**
 * Initialize theme system on app startup
 *
 * Flow:
 * 1. Get current theme settings from store
 * 2. Detect system theme preference
 * 3. Apply theme to DOM
 * 4. Set up system theme change listener
 * 5. Mark as initialized
 *
 * @returns Cleanup function to remove listeners
 */
export function initThemeFlow(): () => void {
	try {
		info("[Theme Flow] Initializing theme system...");

		const store = useThemeStore.getState();
		const { themeKey, mode } = store;

		// Detect system theme
		const systemTheme = getSystemTheme();
		store.setSystemTheme(systemTheme);

		// Initialize theme (applies to DOM and sets up listener)
		const { cleanup, newThemeKey } = initializeThemeFlow(themeKey, mode);

		// Update theme key if it changed
		if (newThemeKey !== themeKey) {
			store.setTheme(newThemeKey);
		}

		// Set up system theme change listener
		let systemThemeCleanup: (() => void) | undefined;

		if (typeof window !== "undefined") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

			const handleChange = (e: MediaQueryListEvent) => {
				const isDark = e.matches;
				const newSystemTheme = isDark ? "dark" : "light";

				info("[Theme Flow] System theme changed", { newSystemTheme }, "init-theme.flow");

				// Update system theme in store
				store.setSystemTheme(newSystemTheme);

				// Apply theme if in system mode
				const currentStore = useThemeStore.getState();
				const updatedThemeKey = handleSystemThemeChangeFlow(
					currentStore.mode,
					currentStore.enableTransition,
					isDark,
				);

				if (updatedThemeKey) {
					store.setTheme(updatedThemeKey);
				}
			};

			mediaQuery.addEventListener("change", handleChange);
			systemThemeCleanup = () =>
				mediaQuery.removeEventListener("change", handleChange);
		}

		// Mark as initialized
		store.setInitialized(true);

		info("[Theme Flow] Theme system initialized successfully");

		// Return combined cleanup function
		return () => {
			cleanup?.();
			systemThemeCleanup?.();
		};
	} catch (error) {
		error("[Theme Flow] Failed to initialize theme system", { error }, "init-theme.flow");

		// Return no-op cleanup
		return () => {};
	}
}

/**
 * Reset theme to default
 */
export function resetThemeFlow(): void {
	try {
		info("[Theme Flow] Resetting theme to default...");

		const store = useThemeStore.getState();

		// Reset to default values
		store.setTheme("default-dark");
		store.setMode("dark");
		store.setEnableTransition(true);

		// Detect and set system theme
		const systemTheme = getSystemTheme();
		store.setSystemTheme(systemTheme);

		info("[Theme Flow] Theme reset successfully");
	} catch (error) {
		error("[Theme Flow] Failed to reset theme", { error }, "init-theme.flow");
	}
}
