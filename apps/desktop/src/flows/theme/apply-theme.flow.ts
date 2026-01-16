/**
 * @file flows/theme/apply-theme.flow.ts
 * @description Theme 应用流程
 *
 * 组合 pipes + io + state 形成完整的主题应用流程
 *
 * 依赖规则：flows/ 只能依赖 pipes/, io/, state/, types/
 */

import { applyThemeWithTransition, getSystemTheme } from "@/io/dom/theme.dom"
import { getDefaultThemeKey, getNextMode, isThemeTypeMatch } from "@/pipes/theme"
import { getThemeByKey, themes } from "@/pipes/theme/theme-lookup.pipe"
import type { ThemeMode } from "@/types/theme"

// ==============================
// Theme Application Flow
// ==============================

/**
 * 应用主题
 * @returns 新的 themeKey（如果需要更新）
 */
export const applyThemeFlow = (themeKey: string, enableTransition: boolean): void => {
	const theme = getThemeByKey(themeKey)
	if (theme) {
		applyThemeWithTransition(theme, enableTransition)
	}
}

/**
 * 设置主题模式并应用
 * @returns 新的 themeKey（如果需要更新）
 */
export const setModeFlow = (
	mode: ThemeMode,
	currentThemeKey: string,
	enableTransition: boolean,
): string => {
	const currentTheme = getThemeByKey(currentThemeKey)

	if (mode === "system") {
		const systemType = getSystemTheme()
		if (currentTheme && !isThemeTypeMatch(currentTheme, systemType)) {
			const defaultThemeKey = getDefaultThemeKey(systemType)
			const newTheme = getThemeByKey(defaultThemeKey)
			if (newTheme) {
				applyThemeWithTransition(newTheme, enableTransition)
				return defaultThemeKey
			}
		} else if (currentTheme) {
			applyThemeWithTransition(currentTheme, enableTransition)
		}
	} else {
		if (currentTheme && !isThemeTypeMatch(currentTheme, mode)) {
			const defaultThemeKey = getDefaultThemeKey(mode)
			const newTheme = getThemeByKey(defaultThemeKey)
			if (newTheme) {
				applyThemeWithTransition(newTheme, enableTransition)
				return defaultThemeKey
			}
		} else if (currentTheme) {
			applyThemeWithTransition(currentTheme, enableTransition)
		}
	}

	return currentThemeKey
}

/**
 * 初始化主题
 * @returns cleanup 函数和新的 themeKey
 */
export const initializeThemeFlow = (
	themeKey: string,
	mode: ThemeMode,
): { readonly cleanup: (() => void) | undefined; readonly newThemeKey: string } => {
	let effectiveThemeKey = themeKey

	if (mode === "system") {
		const systemType = getSystemTheme()
		const currentTheme = getThemeByKey(themeKey)

		if (currentTheme && !isThemeTypeMatch(currentTheme, systemType)) {
			effectiveThemeKey = getDefaultThemeKey(systemType)
		}
	}

	const theme = getThemeByKey(effectiveThemeKey)
	if (theme) {
		applyThemeWithTransition(theme, false)
	}

	// Set up system theme change listener
	let cleanup: (() => void) | undefined

	if (typeof window !== "undefined") {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

		const handleChange = (_e: MediaQueryListEvent) => {
			// This will be called by the hook with current state
		}

		mediaQuery.addEventListener("change", handleChange)
		cleanup = () => mediaQuery.removeEventListener("change", handleChange)
	}

	return { cleanup, newThemeKey: effectiveThemeKey }
}

/**
 * 处理系统主题变化
 */
export const handleSystemThemeChangeFlow = (
	mode: ThemeMode,
	enableTransition: boolean,
	isDark: boolean,
): string | null => {
	if (mode !== "system") {
		return null
	}

	const newType = isDark ? "dark" : "light"
	const defaultThemeKey = getDefaultThemeKey(newType)
	const theme = getThemeByKey(defaultThemeKey)

	if (theme) {
		applyThemeWithTransition(theme, enableTransition)
		return defaultThemeKey
	}

	return null
}

/**
 * 获取所有主题
 */
export const getThemes = () => themes

/**
 * 获取下一个模式
 */
export const getNextModeFlow = (currentMode: ThemeMode): ThemeMode => {
	return getNextMode(currentMode)
}

/**
 * 获取主题
 */
export { getThemeByKey }
