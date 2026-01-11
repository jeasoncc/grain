/**
 * @file state/theme.state.ts
 * @description Theme 状态管理
 *
 * 只存储主题状态数据，不包含业务逻辑。
 * 业务逻辑（如应用主题、DOM 操作）在 flows/theme/ 中。
 *
 * 依赖规则：state/ 只能依赖 types/
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
	DEFAULT_THEME_CONFIG,
	DEFAULT_THEME_STATE,
	type ThemeActions,
	type ThemeMode,
	type ThemeState,
} from "@/types/theme";

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

type ThemeStore = ThemeState & InternalThemeState & ThemeActions;

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
			// Pure State Setters (no business logic)
			// ==============================

			setTheme: (key: string) => {
				set((state) => {
					state.themeKey = key;
					// Update mode based on theme key
					if (key.includes("dark")) {
						state.mode = "dark";
						state.effectiveTheme = "dark";
					} else if (key.includes("light")) {
						state.mode = "light";
						state.effectiveTheme = "light";
					}
				});
			},

			setMode: (mode: ThemeMode) => {
				set((state) => {
					state.mode = mode;
					// Update effective theme based on mode
					if (mode === "system") {
						state.effectiveTheme = state.systemTheme;
					} else {
						state.effectiveTheme = mode;
					}
				});
			},

			setSystemTheme: (theme: "light" | "dark") => {
				set((state) => {
					state.systemTheme = theme;
					// Update effective theme if in system mode
					if (state.mode === "system") {
						state.effectiveTheme = theme;
					}
				});
			},

			toggleMode: () => {
				const currentMode = get().mode;
				let nextMode: ThemeMode;

				// Cycle: light → dark → system → light
				if (currentMode === "light") {
					nextMode = "dark";
				} else if (currentMode === "dark") {
					nextMode = "system";
				} else {
					nextMode = "light";
				}

				set((state) => {
					state.mode = nextMode;
					// Update effective theme
					if (nextMode === "system") {
						state.effectiveTheme = state.systemTheme;
					} else {
						state.effectiveTheme = nextMode;
					}
				});
			},

			setEnableTransition: (enable: boolean) => {
				set((draft) => {
					draft.enableTransition = enable;
				});
			},

			setInitialized: (initialized: boolean) => {
				set((draft) => {
					draft._initialized = initialized;
				});
			},
		})),
		{
			name: DEFAULT_THEME_CONFIG.storageKey,
			partialize: (state) => ({
				themeKey: state.themeKey,
				mode: state.mode,
				systemTheme: state.systemTheme,
				effectiveTheme: state.effectiveTheme,
				enableTransition: state.enableTransition,
			}),
		},
	),
);

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
 * Get the system theme preference.
 */
export const useSystemTheme = (): "light" | "dark" => {
	return useThemeStore((state) => state.systemTheme);
};

/**
 * Get the effective theme being applied.
 */
export const useEffectiveTheme = (): "light" | "dark" => {
	return useThemeStore((state) => state.effectiveTheme);
};

/**
 * Get whether transitions are enabled.
 */
export const useEnableTransition = (): boolean => {
	return useThemeStore((state) => state.enableTransition);
};

/**
 * Check if theme is initialized.
 */
export const useIsThemeInitialized = (): boolean => {
	return useThemeStore((state) => state._initialized);
};

// ==============================
// Action Hooks
// ==============================

/**
 * Get theme actions.
 */
export const useThemeActions = () => ({
	setTheme: useThemeStore((s) => s.setTheme),
	setMode: useThemeStore((s) => s.setMode),
	setSystemTheme: useThemeStore((s) => s.setSystemTheme),
	toggleMode: useThemeStore((s) => s.toggleMode),
	setEnableTransition: useThemeStore((s) => s.setEnableTransition),
	setInitialized: useThemeStore((s) => s.setInitialized),
});
