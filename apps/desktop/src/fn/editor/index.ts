/**
 * @file fn/editor/index.ts
 * @description 编辑器相关纯函数模块导出
 *
 * 包含：
 * - 文件扩展名常量和映射
 * - 编辑器类型判断函数
 * - Monaco 语言检测函数
 */

// 常量和类型
export {
	type DiagramType,
	type EditorType,
	EXTENSION_TO_DIAGRAM_TYPE_MAP,
	EXTENSION_TO_EDITOR_MAP,
	FILE_EXTENSIONS,
	NODE_TYPE_TO_EXTENSION_MAP,
} from "./editor-extension.const";

// 编辑器类型判断函数
export {
	getDiagramTypeByFilename,
	getEditorTypeByFilename,
	getFileExtension,
	isCodeFile,
	isDiagramFile,
	isExcalidrawFile,
	isGrainFile,
} from "./get-editor-type.fn";

// Monaco 语言检测函数
export {
	getMonacoLanguage,
	getSupportedMonacoLanguages,
	isMonacoLanguageSupported,
} from "./get-monaco-language.fn";
