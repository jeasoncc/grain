/**
 * @file stores/editor-settings.store.ts
 * @description 编辑器设置状态管理
 *
 * 管理编辑器行为设置，如折叠图标风格等
 * 使用 Zustand + Immer 实现不可变状态管理
 */

import type { FoldIconStyle } from "@grain/editor-lexical";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
	EditorSettingsActions,
	EditorSettingsState,
} from "@/types/editor-settings";
import {
	DEFAULT_EDITOR_SETTINGS_CONFIG,
	DEFAULT_EDITOR_SETTINGS_STATE,
} from "@/types/editor-settings";

// ==============================
// Store Type
// ==============================

type EditorSettingsStore = EditorSettingsState & EditorSettingsActions;

// ==============================
// Store Implementation
// ==============================

export const useEditorSettingsStore = create<EditorSettingsStore>()(
	persist(
		immer((set) => ({
			// Initial State
			...DEFAULT_EDITOR_SETTINGS_STATE,

			// ==============================
			// Actions
			// ==============================

			setFoldIconStyle: (style: FoldIconStyle) => {
				set((state) => {
					state.foldIconStyle = style;
				});
			},

			reset: () => {
				set((state) => {
					state.foldIconStyle = DEFAULT_EDITOR_SETTINGS_STATE.foldIconStyle;
				});
			},
		})),
		{
			name: DEFAULT_EDITOR_SETTINGS_CONFIG.storageKey,
		},
	),
);

// ==============================
// Selector Hooks
// ==============================

/**
 * 获取当前折叠图标风格
 */
export const useFoldIconStyle = (): FoldIconStyle => {
	return useEditorSettingsStore((state) => state.foldIconStyle);
};

// ==============================
// Convenience Hook
// ==============================

/**
 * 便捷 hook，提供所有编辑器设置状态和 actions
 */
export function useEditorSettings() {
	return useEditorSettingsStore();
}
