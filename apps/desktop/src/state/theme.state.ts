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
import type { ThemeMode, ThemeState } from "@/types/theme";
import { DEFAULT_THEME_CONFIG, DEFAULT_THEME_STATE } from "@/types/theme";

// ==============================
// Internal State
// ==============================

interface InternalThemeState {
	/** Whether the theme has been initialized */
	_initialized: boolean;
}

// ==============================
// Store Actions Interface
// ==============================

interface ThemeStoreActions {
	/** Set theme key */
	setThemeKey: (key: string) => void;
	/** Set theme mode */
	setMode: (mode: ThemeMode) => void;
	/** Set enable transition */
	setEnableTransition: (enable: boolean) => void;
	/** Mark as initialized */
	setInitialized: (initialized: boolean) => void;
}

// ==============================
// Store Type
// ==============================

type ThemeStore = ThemeState & InternalThemeState & ThemeStoreActions;

// ==============================
// Store Implementation
// ==============================

export const useThemeStore = create<ThemeStore>()(
	persist(
		immer((set) => ({
			// Initial State
			...DEFAULT_THEME_STATE,
			_initialized: false,

			// ==============================
			// Pure State Setters (no business logic)
			// ==============================

			setThemeKey: (key: string) => {
				set((state) => {
					state.themeKey = key;
				});
			},

			setMode: (mode: ThemeMode) => {
				set((state) => {
					state.mode = mode;
				});
			},

			setEnableTransition: (enable: boolean) => {
				set((state) => {
					state.enableTransition = enable;
				});
			},

			setInitialized: (initialized: boolean) => {
				set((state) => {
					state._initialized = initialized;
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
 * Check if theme is initialized.
 */
export const useIsThemeInitialized = (): boolean => {
	return useThemeStore((state) => state._initialized);
};
