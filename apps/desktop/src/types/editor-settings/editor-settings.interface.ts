/**
 * Editor Settings Domain - Interface Definitions
 *
 * 编辑器行为设置的类型定义
 * 包括折叠图标风格等编辑器功能配置
 */

import type { FoldIconStyle } from "@grain/editor-lexical";
import type {
	DocumentEditorType,
	CodeEditorType,
	DiagramEditorType,
} from "@grain/editor-core";

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
	/** 文档编辑器类型 */
	readonly documentEditorType: DocumentEditorType;
	/** 代码编辑器类型 */
	readonly codeEditorType: CodeEditorType;
	/** 图表编辑器类型 */
	readonly diagramEditorType: DiagramEditorType;
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
	/** 设置文档编辑器类型 */
	setDocumentEditorType: (type: DocumentEditorType) => void;
	/** 设置代码编辑器类型 */
	setCodeEditorType: (type: CodeEditorType) => void;
	/** 设置图表编辑器类型 */
	setDiagramEditorType: (type: DiagramEditorType) => void;
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
	documentEditorType: "lexical",
	codeEditorType: "monaco",
	diagramEditorType: "monaco",
} as const;

// ==============================
// Editor Type Options
// ==============================

/**
 * 文档编辑器选项
 */
export const DOCUMENT_EDITOR_OPTIONS: readonly {
	readonly id: DocumentEditorType;
	readonly name: string;
	readonly description: string;
}[] = [
	{
		id: "lexical",
		name: "Lexical",
		description: "Meta's rich text editor, optimized for performance",
	},
	{
		id: "tiptap",
		name: "Tiptap",
		description: "ProseMirror-based editor with excellent extensibility",
	},
	{
		id: "monaco",
		name: "Monaco (Markdown)",
		description: "VS Code's editor with Markdown preview",
	},
	{
		id: "codemirror",
		name: "CodeMirror (Markdown)",
		description: "Lightweight editor with Markdown support",
	},
] as const;

/**
 * 代码编辑器选项
 */
export const CODE_EDITOR_OPTIONS: readonly {
	readonly id: CodeEditorType;
	readonly name: string;
	readonly description: string;
}[] = [
	{
		id: "monaco",
		name: "Monaco",
		description: "VS Code's powerful code editor",
	},
	{
		id: "codemirror",
		name: "CodeMirror",
		description: "Lightweight and fast code editor",
	},
	{
		id: "lexical",
		name: "Lexical",
		description: "Basic code highlighting with Lexical",
	},
	{
		id: "tiptap",
		name: "Tiptap",
		description: "Code blocks with syntax highlighting",
	},
] as const;

/**
 * 图表编辑器选项
 */
export const DIAGRAM_EDITOR_OPTIONS: readonly {
	readonly id: DiagramEditorType;
	readonly name: string;
	readonly description: string;
}[] = [
	{
		id: "monaco",
		name: "Monaco",
		description: "Full-featured diagram editor with preview",
	},
	{
		id: "codemirror",
		name: "CodeMirror",
		description: "Lightweight diagram editor",
	},
	{
		id: "lexical",
		name: "Lexical",
		description: "Basic diagram editing",
	},
	{
		id: "tiptap",
		name: "Tiptap",
		description: "Diagram blocks with preview",
	},
] as const;
