/**
 * @file stores/editor-settings.store.ts
 * @description 编辑器设置状态管理
 *
 * 管理编辑器行为设置，如折叠图标风格
 * 使用 Zustand + Immer 实现不可变状态管理
 *
 * 注意：编辑器类型选择已移除，统一使用 Lexical 编辑器
 */

import type { FoldIconStyle } from "@grain/editor-lexical"
import { create } from "zustand"
import { persist } from "zustand/middleware"

// ==============================
// State Interface
// ==============================

interface EditorSettingsState {
	/** 标题折叠图标风格 */
	readonly foldIconStyle: FoldIconStyle
}

// ==============================
// Actions Interface
// ==============================

interface EditorSettingsActions {
	/** 设置折叠图标风格 */
	readonly setFoldIconStyle: (style: FoldIconStyle) => void
	/** 重置所有设置 */
	readonly reset: () => void
}

// ==============================
// Store Type
// ==============================

type EditorSettingsStore = EditorSettingsState & EditorSettingsActions

// ==============================
// Default Values
// ==============================

const DEFAULT_EDITOR_SETTINGS_STATE: EditorSettingsState = {
	foldIconStyle: "bagua",
} as const

// ==============================
// Store Implementation
// ==============================

export const useEditorSettingsStore = create<EditorSettingsStore>()(
	persist(
		(set) => ({
			// Initial State
			...DEFAULT_EDITOR_SETTINGS_STATE,

			reset: () => {
				set((state) => ({
					...state,
					foldIconStyle: DEFAULT_EDITOR_SETTINGS_STATE.foldIconStyle,
				}))
			},

			// ==============================
			// Actions
			// ==============================

			setFoldIconStyle: (style: FoldIconStyle) => {
				set((state) => ({
					...state,
					foldIconStyle: style,
				}))
			},
		}),
		{
			name: "grain-editor-settings",
		},
	),
)

// ==============================
// Selector Hooks
// ==============================

/**
 * 获取当前折叠图标风格
 */
export const useFoldIconStyle = (): FoldIconStyle => {
	return useEditorSettingsStore((state) => state.foldIconStyle)
}

// ==============================
// Convenience Hook
// ==============================

/**
 * 便捷 hook，提供所有编辑器设置状态和 actions
 */
export function useEditorSettings() {
	return useEditorSettingsStore()
}
