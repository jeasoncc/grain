/**
 * Editor Settings Domain - Interface Definitions
 *
 * 编辑器行为设置的类型定义
 * 包括折叠图标风格等编辑器功能配置
 */

import type { FoldIconStyle } from "@grain/editor";

// ==============================
// State Interface
// ==============================

/**
 * 编辑器设置状态
 * 所有属性为 readonly 以确保不可变性
 */
export interface EditorSettingsState {
	/** 标题折叠图标风格 */
	readonly foldIconStyle: FoldIconStyle;
}

// ==============================
// Actions Interface
// ==============================

/**
 * 编辑器设置 Actions
 */
export interface EditorSettingsActions {
	/** 设置折叠图标风格 */
	setFoldIconStyle: (style: FoldIconStyle) => void;
	/** 重置所有设置 */
	reset: () => void;
}

// ==============================
// Configuration
// ==============================

export interface EditorSettingsConfig {
	/** 持久化存储 key */
	readonly storageKey: string;
}

export const DEFAULT_EDITOR_SETTINGS_CONFIG: EditorSettingsConfig = {
	storageKey: "grain-editor-settings",
} as const;

// ==============================
// Default Values
// ==============================

export const DEFAULT_EDITOR_SETTINGS_STATE: EditorSettingsState = {
	foldIconStyle: "bagua",
} as const;
