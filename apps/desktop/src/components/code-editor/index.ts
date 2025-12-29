/**
 * CodeEditor 组件模块
 *
 * 基于 Monaco Editor 的代码编辑器组件
 */

// 语言注册函数导出
export {
	registerAllLanguages,
	registerMermaidLanguage,
	registerPlantUMLLanguage,
} from "./code-editor.languages";
// 类型导出
export type {
	CodeEditorContainerProps,
	CodeEditorViewProps,
	CodeLanguage,
	MonacoEditorOptions,
} from "./code-editor.types";

// 组件导出将在后续任务中添加
// export { CodeEditorView } from "./code-editor.view.fn";
// export { CodeEditorContainer } from "./code-editor.container.fn";
