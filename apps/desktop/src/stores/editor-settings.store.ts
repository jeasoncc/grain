/**
 * @file stores/editor-settings.store.ts
 * @description 编辑器设置状态管理
 *
 * 管理编辑器行为设置，如折叠图标风格、编辑器类型选择等
 * 使用 Zustand + Immer 实现不可变状态管理
 */

import type { FoldIconStyle } from "@grain/editor-lexical";
import type {
	DocumentEditorType,
	CodeEditorType,
	DiagramEditorType,
} from "@grain/editor-core";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import logger from "@/log";
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

			setDocumentEditorType: (type: DocumentEditorType) => {
				logger.info("[EditorSettings] 设置文档编辑器类型:", type);
				set((state) => {
					state.documentEditorType = type;
				});
			},

			setCodeEditorType: (type: CodeEditorType) => {
				logger.info("[EditorSettings] 设置代码编辑器类型:", type);
				set((state) => {
					state.codeEditorType = type;
				});
			},

			setDiagramEditorType: (type: DiagramEditorType) => {
				logger.info("[EditorSettings] 设置图表编辑器类型:", type);
				set((state) => {
					state.diagramEditorType = type;
				});
			},

			reset: () => {
				set((state) => {
					state.foldIconStyle = DEFAULT_EDITOR_SETTINGS_STATE.foldIconStyle;
					state.documentEditorType =
						DEFAULT_EDITOR_SETTINGS_STATE.documentEditorType;
					state.codeEditorType = DEFAULT_EDITOR_SETTINGS_STATE.codeEditorType;
					state.diagramEditorType =
						DEFAULT_EDITOR_SETTINGS_STATE.diagramEditorType;
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

/**
 * 获取当前文档编辑器类型
 */
export const useDocumentEditorType = (): DocumentEditorType => {
	return useEditorSettingsStore((state) => state.documentEditorType);
};

/**
 * 获取当前代码编辑器类型
 */
export const useCodeEditorType = (): CodeEditorType => {
	return useEditorSettingsStore((state) => state.codeEditorType);
};

/**
 * 获取当前图表编辑器类型
 */
export const useDiagramEditorType = (): DiagramEditorType => {
	return useEditorSettingsStore((state) => state.diagramEditorType);
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
