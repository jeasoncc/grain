/**
 * @file code-editor.types.ts
 * @description CodeEditor Container 类型定义
 *
 * @requirements 5.5
 */

import type { MonacoLanguage } from "@grain/editor-monaco";
import type { Theme } from "@/lib/themes";

/**
 * CodeEditorContainer Props
 */
export interface CodeEditorContainerProps {
	/** 节点 ID */
	readonly nodeId: string;
	/** 自定义类名 */
	readonly className?: string;
}

/**
 * CodeEditorView Props
 */
export interface CodeEditorViewProps {
	/** 编辑器内容 */
	readonly value: string;
	/** 代码语言 */
	readonly language: MonacoLanguage;
	/** 主题 */
	readonly theme?: Theme;
	/** 内容变化回调 */
	readonly onChange: (value: string) => void;
	/** 保存回调 */
	readonly onSave?: () => void;
	/** 是否只读 */
	readonly readOnly?: boolean;
	/** Monaco 编辑器选项 */
	readonly options?: Record<string, unknown>;
}

/**
 * 代码语言类型（兼容别名）
 */
export type CodeLanguage = MonacoLanguage;

/**
 * 重新导出 MonacoLanguage 类型
 */
export type { MonacoLanguage };
