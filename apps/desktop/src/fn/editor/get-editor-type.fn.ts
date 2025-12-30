/**
 * @file get-editor-type.fn.ts
 * @description 根据文件名获取编辑器类型的纯函数
 *
 * 实现扩展名驱动的编辑器选择机制。
 *
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import {
	type DiagramType,
	type EditorType,
	EXTENSION_TO_DIAGRAM_TYPE_MAP,
	EXTENSION_TO_EDITOR_MAP,
} from "./editor-extension.const";

// ==============================
// Helper Functions
// ==============================

/**
 * 从文件名中提取扩展名
 *
 * @param filename - 文件名
 * @returns 扩展名（包含点号，如 ".js"），如果没有扩展名则返回空字符串
 *
 * @example
 * getFileExtension("test.js") // ".js"
 * getFileExtension("test.spec.ts") // ".ts"
 * getFileExtension("test") // ""
 * getFileExtension(".gitignore") // ""
 */
export const getFileExtension = (filename: string): string => {
	const lastDotIndex = filename.lastIndexOf(".");
	// 如果没有点号，或者点号在开头（如 .gitignore），则没有扩展名
	if (lastDotIndex <= 0) {
		return "";
	}
	return filename.slice(lastDotIndex).toLowerCase();
};

// ==============================
// Main Functions
// ==============================

/**
 * 根据文件名获取编辑器类型
 *
 * 映射规则：
 * - .grain → lexical（Lexical 富文本编辑器）
 * - .excalidraw → excalidraw（Excalidraw 绘图编辑器）
 * - .mermaid, .plantuml → diagram（图表编辑器）
 * - 其他扩展名 → code（Monaco 代码编辑器）
 *
 * @param filename - 文件名
 * @returns 编辑器类型
 *
 * @example
 * getEditorTypeByFilename("diary-123.grain") // "lexical"
 * getEditorTypeByFilename("drawing.excalidraw") // "excalidraw"
 * getEditorTypeByFilename("flowchart.mermaid") // "diagram"
 * getEditorTypeByFilename("script.js") // "code"
 * getEditorTypeByFilename("unknown") // "code"
 */
export const getEditorTypeByFilename = (filename: string): EditorType => {
	const extension = getFileExtension(filename);

	// 如果没有扩展名，默认使用代码编辑器
	if (!extension) {
		return "code";
	}

	// 查找映射，未知扩展名默认使用代码编辑器
	return EXTENSION_TO_EDITOR_MAP[extension] ?? "code";
};

/**
 * 根据文件名获取图表类型
 *
 * 仅对图表文件有效，其他文件返回 null
 *
 * @param filename - 文件名
 * @returns 图表类型，如果不是图表文件则返回 null
 *
 * @example
 * getDiagramTypeByFilename("flowchart.mermaid") // "mermaid"
 * getDiagramTypeByFilename("sequence.plantuml") // "plantuml"
 * getDiagramTypeByFilename("script.js") // null
 */
export const getDiagramTypeByFilename = (
	filename: string,
): DiagramType | null => {
	const extension = getFileExtension(filename);

	if (!extension) {
		return null;
	}

	return EXTENSION_TO_DIAGRAM_TYPE_MAP[extension] ?? null;
};

/**
 * 检查文件是否为 Grain 富文本文件
 *
 * @param filename - 文件名
 * @returns 是否为 .grain 文件
 */
export const isGrainFile = (filename: string): boolean => {
	return getFileExtension(filename) === ".grain";
};

/**
 * 检查文件是否为 Excalidraw 绘图文件
 *
 * @param filename - 文件名
 * @returns 是否为 .excalidraw 文件
 */
export const isExcalidrawFile = (filename: string): boolean => {
	return getFileExtension(filename) === ".excalidraw";
};

/**
 * 检查文件是否为图表文件
 *
 * @param filename - 文件名
 * @returns 是否为 .mermaid 或 .plantuml 文件
 */
export const isDiagramFile = (filename: string): boolean => {
	return getDiagramTypeByFilename(filename) !== null;
};

/**
 * 检查文件是否为代码文件
 *
 * @param filename - 文件名
 * @returns 是否为代码文件（非 grain/excalidraw/diagram）
 */
export const isCodeFile = (filename: string): boolean => {
	return getEditorTypeByFilename(filename) === "code";
};
