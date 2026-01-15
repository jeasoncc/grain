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
import { persist } from "zustand/middleware"
import {
	DEFAULT_THEME_CONFIG,
	DEFAULT_THEME_STATE,
	type ThemeActions,
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

type ThemeStore = ThemeState & InternalThemeState & ThemeActions

// ==============================
// Store Implementation
// ==============================

export const useThemeStore = create<ThemeStore>()(
	persist(
		(set, get) => ({
			// Initial State
			...DEFAULT_THEME_STATE,
			_initialized: false,

			setEnableTransition: (enable: boolean) => {
				set((state) => ({
					...state,
					enableTransition: enable,
				}))
			},

			setInitialized: (initialized: boolean) => {
				set((state) => ({
					...state,
					_initialized: initialized,
				}))
			},

			setMode: (mode: ThemeMode) => {
				set((state) => ({
					...state,
					// Update effective theme based on mode
					effectiveTheme: mode === "system" ? state.systemTheme : mode,
					mode,
				}))
			},

			setSystemTheme: (theme: "light" | "dark") => {
				set((state) => ({
					...state,
					// Update effective theme if in system mode
					effectiveTheme: state.mode === "system" ? theme : state.effectiveTheme,
					systemTheme: theme,
				}))
			},

			// ==============================
			// Pure State Setters (no business logic)
			// ==============================

			setTheme: (key: string) => {
				set((state) => ({
					...state,
					effectiveTheme: key.includes("dark")
						? "dark"
						: key.includes("light")
							? "light"
							: state.effectiveTheme,
					// Update mode based on theme key
					mode: key.includes("dark") ? "dark" : key.includes("light") ? "light" : state.mode,
					themeKey: key,
				}))
			},

			toggleMode: () => {
				const currentMode = get().mode
				let nextMode: ThemeMode

				// Cycle: light → dark → system → light
				if (currentMode === "light") {
					nextMode = "dark"
				} else if (currentMode === "dark") {
					nextMode = "system"
				} else {
					nextMode = "light"
				}

				set((state) => ({
					...state,
					// Update effective theme
					effectiveTheme: nextMode === "system" ? state.systemTheme : nextMode,
					mode: nextMode,
				}))
			},
		}),
		{
			name: DEFAULT_THEME_CONFIG.storageKey,
			partialize: (state) => ({
				effectiveTheme: state.effectiveTheme,
				enableTransition: state.enableTransition,
				mode: state.mode,
				systemTheme: state.systemTheme,
				themeKey: state.themeKey,
			}),
		},
	),
)

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

// ==============================
// Action Hooks
// ==============================

/**
 * Get theme actions.
 */
export const useThemeActions = () => ({
	setEnableTransition: useThemeStore((s) => s.setEnableTransition),
	setInitialized: useThemeStore((s) => s.setInitialized),
	setMode: useThemeStore((s) => s.setMode),
	setSystemTheme: useThemeStore((s) => s.setSystemTheme),
	setTheme: useThemeStore((s) => s.setTheme),
	toggleMode: useThemeStore((s) => s.toggleMode),
})
