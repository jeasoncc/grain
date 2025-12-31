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
 * 编辑器主题颜色配置
 *
 * 用于自定义 Monaco 编辑器的颜色，适配应用的主题系统。
 * 所有颜色都是可选的，未提供时使用默认值。
 */
export interface EditorThemeColors {
	/** 编辑器背景色 */
	readonly background?: string;
	/** 编辑器前景色（文本颜色） */
	readonly foreground?: string;
	/** 选中文本的背景色 */
	readonly selection?: string;
	/** 当前行高亮背景色 */
	readonly lineHighlight?: string;
	/** 光标颜色 */
	readonly cursor?: string;
	/** 行号颜色 */
	readonly lineNumber?: string;
	/** 活动行号颜色 */
	readonly lineNumberActive?: string;
}

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
	/** 基础主题（light/dark），用于选择 Monaco 基础主题 */
	readonly theme: "light" | "dark";
	/** 自定义主题颜色（可选），用于覆盖基础主题的颜色 */
	readonly themeColors?: EditorThemeColors;
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
