/**
 * @file views/editor/index.ts
 * @description 兼容层 - 重导出 pipes/editor
 *
 * 此文件保留用于向后兼容。
 * 实际实现已移动到 pipes/editor/
 *
 * @deprecated 请直接从 @/pipes/editor 导入
 */

// 常量和类型
export {
	type DiagramType,
	type EditorType,
	EXTENSION_TO_DIAGRAM_TYPE_MAP,
	EXTENSION_TO_EDITOR_MAP,
	FILE_EXTENSIONS,
	NODE_TYPE_TO_EXTENSION_MAP,
} from "@/pipes/editor";

// 编辑器类型判断函数
export {
	getDiagramTypeByFilename,
	getEditorTypeByFilename,
	getFileExtension,
	isDiagramFile,
	isExcalidrawFile,
	isGrainFile,
	isLexicalFile,
} from "@/pipes/editor";
