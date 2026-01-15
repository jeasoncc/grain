/**
 * Editor Tabs - Interface Definitions
 *
 * 所有接口和类型定义放在这个文件中
 */

import type { EditorInstanceState as BaseEditorInstanceState } from "@grain/editor-lexical"
import type { NodeType } from "@/types/node"

// ==============================
// Tab Types
// ==============================

/**
 * TabType 复用 NodeType，排除 folder
 *
 * 当 NodeType 新增类型时，TabType 自动包含（除了 folder）
 * 这确保了类型定义的单一来源，避免重复维护
 */
export type TabType = Exclude<NodeType, "folder">

// ==============================
// Editor Tab Interface
// ==============================

export interface EditorTab {
	readonly id: string
	readonly workspaceId: string
	readonly nodeId: string
	readonly title: string
	readonly type: TabType
	readonly isDirty?: boolean
}

// ==============================
// Editor Instance State
// ==============================

export interface EditorSelectionState {
	readonly anchor: { readonly key: string; readonly offset: number }
	readonly focus: { readonly key: string; readonly offset: number }
}

export interface EditorInstanceState extends BaseEditorInstanceState {
	readonly selectionState?: EditorSelectionState
	readonly scrollLeft?: number
	readonly isDirty?: boolean
	readonly lastModified?: number
}

// ==============================
// Store State Interface
// ==============================

export interface EditorTabsState {
	readonly tabs: readonly EditorTab[]
	readonly activeTabId: string | null
	readonly editorStates: Readonly<Record<string, EditorInstanceState>>
}

// ==============================
// Action Payloads
// ==============================

export interface OpenTabPayload {
	readonly workspaceId: string
	readonly nodeId: string
	readonly title: string
	readonly type: TabType
	/** 初始内容（已解析的 Lexical 状态对象） */
	readonly initialContent?: unknown
}

export interface UpdateEditorStatePayload {
	readonly tabId: string
	readonly state: Partial<EditorInstanceState>
}

export interface ReorderTabsPayload {
	readonly fromIndex: number
	readonly toIndex: number
}

// ==============================
// Configuration
// ==============================

export interface EditorTabsConfig {
	readonly maxEditorStates: number
	readonly persistTabs: boolean
}

export const DEFAULT_CONFIG: EditorTabsConfig = {
	maxEditorStates: 10,
	persistTabs: false,
} as const
