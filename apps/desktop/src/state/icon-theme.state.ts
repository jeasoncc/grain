/**
 * @file stores/icon-theme.store.ts
 * @description Icon Theme 状态管理
 *
 * 管理图标主题状态（localStorage 持久化）
 * Uses Zustand with persistence for settings.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IconThemeStore } from "@/types/icon-theme";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "icon-theme";
const DEFAULT_THEME_KEY = "default";

// ============================================================================
// Store
// ============================================================================

export const useIconThemeStore = create<IconThemeStore>()(
	persist(
		(set) => ({
			// State
			currentThemeKey: DEFAULT_THEME_KEY,

			// Actions
			setTheme: (key: string) => {
				set({ currentThemeKey: key });
			},
		}),
		{
			name: STORAGE_KEY,
		},
	),
);

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCurrentIconThemeKey = () =>
	useIconThemeStore((s) => s.currentThemeKey);
