/**
 * @file pipes/editor/index.ts
 * @description 编辑器相关纯函数模块导出
 *
 * Grain 统一使用 Lexical 编辑器处理所有文本文件。
 * 只有 .excalidraw 文件使用 Excalidraw 绘图编辑器。
 *
 * 包含：
 * - 文件扩展名常量和映射
 * - 编辑器类型判断函数
 */

// 常量和类型
export {
	type DiagramType,
	type EditorType,
	EXTENSION_TO_DIAGRAM_TYPE_MAP,
	EXTENSION_TO_EDITOR_MAP,
	FILE_EXTENSIONS,
	NODE_TYPE_TO_EXTENSION_MAP,
} from "./editor-extension.const"

// 编辑器类型判断函数
export {
	getDiagramTypeByFilename,
	getEditorTypeByFilename,
	getFileExtension,
	isDiagramFile,
	isExcalidrawFile,
	isGrainFile,
	isLexicalFile,
} from "./get-editor-type.pipe"
