/**
 * @file state/theme.state.ts
 * @description Theme 状态管理
 *
 * 只存储主题状态数据，不包含业务逻辑。
 * 业务逻辑（如应用主题、DOM 操作）在 flows/theme/ 中。
 *
 * 依赖规则：state/ 只能依赖 types/
 */

import { create } from "zustand"
import {
	DEFAULT_THEME_STATE,
	type ThemeMode,
	type ThemeState,
} from "@/types/theme"

// ==============================
// Internal State
// ==============================

interface InternalThemeState {
	/** Whether the theme has been initialized */
	readonly _initialized: boolean
}

// ==============================
// Store Type
// ==============================

type ThemeStore = ThemeState & InternalThemeState

// ==============================
// Store Implementation
// ==============================

/** File-selected preferences and native system appearance; no independent persistence. */
export const useThemeStore = create<ThemeStore>(() => ({
	...DEFAULT_THEME_STATE,
	_initialized: false,
}))

// ==============================
// Selector Hooks
// ==============================

/**
 * Get the current theme key.
 */
export const useThemeKey = (): string => {
	return useThemeStore((state) => state.themeKey)
}

/**
 * Get the current theme mode.
 */
export const useThemeMode = (): ThemeMode => {
	return useThemeStore((state) => state.mode)
}

/**
 * Get the system theme preference.
 */
export const useSystemTheme = (): "light" | "dark" => {
	return useThemeStore((state) => state.systemTheme)
}

/**
 * Get the effective theme being applied.
 */
export const useEffectiveTheme = (): "light" | "dark" => {
	return useThemeStore((state) => state.effectiveTheme)
}

/**
 * Get whether transitions are enabled.
 */
export const useEnableTransition = (): boolean => {
	return useThemeStore((state) => state.enableTransition)
}

/**
 * Check if theme is initialized.
 */
export const useIsThemeInitialized = (): boolean => {
	return useThemeStore((state) => state._initialized)
}

