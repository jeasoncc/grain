/**
 * Editor Tabs - Interface Definitions
 * 
 * 所有接口和类型定义放在这个文件中
 */

import type { EditorInstanceState as BaseEditorInstanceState } from "@grain/editor";

// ==============================
// Tab Types
// ==============================

export type TabType = "file" | "diary" | "canvas" | "folder";

// ==============================
// Editor Tab Interface
// ==============================

export interface EditorTab {
	readonly id: string;
	readonly workspaceId: string;
	readonly nodeId: string;
	readonly title: string;
	readonly type: TabType;
	readonly isDirty?: boolean;
}

// ==============================
// Editor Instance State
// ==============================

export interface SelectionState {
	readonly anchor: { key: string; offset: number };
	readonly focus: { key: string; offset: number };
}

export interface EditorInstanceState extends BaseEditorInstanceState {
	readonly selectionState?: SelectionState;
	readonly scrollLeft?: number;
	readonly isDirty?: boolean;
	readonly lastModified?: number;
}

// ==============================
// Store State Interface
// ==============================

export interface EditorTabsState {
	readonly tabs: readonly EditorTab[];
	readonly activeTabId: string | null;
	readonly editorStates: Readonly<Record<string, EditorInstanceState>>;
}

// ==============================
// Action Payloads
// ==============================

export interface OpenTabPayload {
	readonly workspaceId: string;
	readonly nodeId: string;
	readonly title: string;
	readonly type: TabType;
}

export interface UpdateEditorStatePayload {
	readonly tabId: string;
	readonly state: Partial<EditorInstanceState>;
}

export interface ReorderTabsPayload {
	readonly fromIndex: number;
	readonly toIndex: number;
}

// ==============================
// Configuration
// ==============================

export interface EditorTabsConfig {
	readonly maxEditorStates: number;
	readonly persistTabs: boolean;
}

export const DEFAULT_CONFIG: EditorTabsConfig = {
	maxEditorStates: 10,
	persistTabs: false,
} as const;
