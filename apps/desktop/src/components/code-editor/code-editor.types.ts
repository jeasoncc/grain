/**
 * @file code-editor.types.ts
 * @description CodeEditor Container 类型定义
 *
 * @requirements 5.5
 */

import type { MonacoLanguage } from "@grain/code-editor";

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
 * 重新导出 MonacoLanguage 类型
 */
export type { MonacoLanguage };
