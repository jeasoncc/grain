/**
 * @file code-editor.types.ts
 * @description CodeEditor 类型定义
 *
 * @requirements 1.4
 */

import type { editor } from "monaco-editor";

/**
 * Monaco 编辑器支持的语言类型
 */
export type MonacoLanguage =
	| "javascript"
	| "typescript"
	| "json"
	| "html"
	| "css"
	| "markdown"
	| "python"
	| "java"
	| "c"
	| "cpp"
	| "csharp"
	| "go"
	| "rust"
	| "ruby"
	| "php"
	| "swift"
	| "kotlin"
	| "sql"
	| "yaml"
	| "xml"
	| "shell"
	| "plaintext";

/**
 * CodeEditorView Props
 *
 * 纯展示组件的 props 定义
 */
export interface CodeEditorViewProps {
	/** 代码内容 */
	readonly code: string;
	/** 编程语言 */
	readonly language: MonacoLanguage;
	/** 主题（light/dark） */
	readonly theme: "light" | "dark";
	/** 代码变化回调 */
	readonly onCodeChange: (code: string) => void;
	/** 保存回调（Ctrl+S） */
	readonly onSave: () => void;
	/** 是否只读 */
	readonly readOnly?: boolean;
	/** 自定义类名 */
	readonly className?: string;
	/** 编辑器选项 */
	readonly options?: editor.IStandaloneEditorConstructionOptions;
}
