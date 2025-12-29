/**
 * CodeEditor 组件类型定义
 *
 * 基于 Monaco Editor 的代码编辑器组件类型
 */
import type { editor } from "monaco-editor";

/**
 * 支持的代码语言
 *
 * - plantuml: PlantUML 图表语言
 * - mermaid: Mermaid 图表语言
 * - json: JSON 数据格式
 * - markdown: Markdown 文档格式
 * - javascript: JavaScript 代码
 * - typescript: TypeScript 代码
 */
export type CodeLanguage =
	| "plantuml"
	| "mermaid"
	| "json"
	| "markdown"
	| "javascript"
	| "typescript";

/**
 * Monaco 编辑器选项
 *
 * 使用 Monaco Editor 的 IStandaloneEditorConstructionOptions 类型
 */
export type MonacoEditorOptions = editor.IStandaloneEditorConstructionOptions;

/**
 * CodeEditorView Props
 *
 * 纯展示组件的属性定义，只接收数据和回调
 */
export interface CodeEditorViewProps {
	/** 代码内容 */
	readonly value: string;
	/** 代码语言 */
	readonly language: CodeLanguage;
	/** 主题 */
	readonly theme: "light" | "dark";
	/** 内容变化回调 */
	readonly onChange: (value: string) => void;
	/** 保存回调 (Ctrl+S) */
	readonly onSave?: () => void;
	/** 是否只读 */
	readonly readOnly?: boolean;
	/** 占位符文本 */
	readonly placeholder?: string;
	/** 编辑器选项 */
	readonly options?: MonacoEditorOptions;
}

/**
 * CodeEditorContainer Props
 *
 * 容器组件的属性定义，连接 hooks/stores
 */
export interface CodeEditorContainerProps {
	/** 节点 ID */
	readonly nodeId: string;
	/** 代码语言 */
	readonly language: CodeLanguage;
	/** 样式类名 */
	readonly className?: string;
}
