/**
 * CodeEditor 组件模块
 *
 * 基于 Monaco Editor 的代码编辑器组件
 *
 * 性能优化：
 * - Monaco 通过 CDN 懒加载，减少初始包体积
 * - 支持预加载提升后续使用体验
 */

// 默认导出容器组件
export {
	CodeEditorContainer,
	CodeEditorContainer as CodeEditor,
} from "./code-editor.container.fn";
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
// 组件导出
export { CodeEditorView } from "./code-editor.view.fn";
// Monaco 配置导出
export {
	configureMonacoFallback,
	configureMonacoLoader,
	isMonacoConfigured,
	preloadMonaco,
} from "./monaco.config";
