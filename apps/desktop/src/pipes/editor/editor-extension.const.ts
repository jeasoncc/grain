/**
 * @file pipes/editor/editor-extension.const.ts
 * @description 文件扩展名与编辑器类型映射常量
 *
 * 定义文件扩展名到编辑器类型的映射关系。
 * 统一使用 Lexical 编辑器处理所有文本文件。
 *
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

// ==============================
// Types
// ==============================

/**
 * 编辑器类型
 *
 * - lexical: Lexical 富文本编辑器（所有文本文件）
 * - excalidraw: Excalidraw 绘图编辑器（.excalidraw 文件）
 */
export type EditorType = "lexical" | "excalidraw";

/**
 * 图表类型（用于内容识别，不影响编辑器选择）
 */
export type DiagramType = "mermaid" | "plantuml";

// ==============================
// Constants
// ==============================

/**
 * 文件扩展名常量
 */
export const FILE_EXTENSIONS = {
	// Grain 富文本
	GRAIN: ".grain",

	// 绘图
	EXCALIDRAW: ".excalidraw",

	// 图表
	MERMAID: ".mermaid",
	PLANTUML: ".plantuml",

	// 代码文件
	JS: ".js",
	TS: ".ts",
	JSX: ".jsx",
	TSX: ".tsx",
	JSON: ".json",
	MD: ".md",
	HTML: ".html",
	CSS: ".css",
	SCSS: ".scss",
	LESS: ".less",
	YAML: ".yaml",
	YML: ".yml",
	TOML: ".toml",
	XML: ".xml",
	SQL: ".sql",
	SH: ".sh",
	BASH: ".bash",
	PY: ".py",
	RS: ".rs",
	GO: ".go",
	JAVA: ".java",
	C: ".c",
	CPP: ".cpp",
	H: ".h",
	HPP: ".hpp",
	TXT: ".txt",
} as const;

/**
 * 扩展名到编辑器类型的映射
 *
 * 统一使用 Lexical 编辑器处理所有文本文件，
 * 只有 .excalidraw 文件使用 Excalidraw 编辑器。
 */
export const EXTENSION_TO_EDITOR_MAP: Record<string, EditorType> = {
	// Excalidraw 绘图编辑器
	[FILE_EXTENSIONS.EXCALIDRAW]: "excalidraw",

	// 所有其他文件类型都使用 Lexical 编辑器
	[FILE_EXTENSIONS.GRAIN]: "lexical",
	[FILE_EXTENSIONS.MERMAID]: "lexical",
	[FILE_EXTENSIONS.PLANTUML]: "lexical",
	[FILE_EXTENSIONS.JS]: "lexical",
	[FILE_EXTENSIONS.TS]: "lexical",
	[FILE_EXTENSIONS.JSX]: "lexical",
	[FILE_EXTENSIONS.TSX]: "lexical",
	[FILE_EXTENSIONS.JSON]: "lexical",
	[FILE_EXTENSIONS.MD]: "lexical",
	[FILE_EXTENSIONS.HTML]: "lexical",
	[FILE_EXTENSIONS.CSS]: "lexical",
	[FILE_EXTENSIONS.SCSS]: "lexical",
	[FILE_EXTENSIONS.LESS]: "lexical",
	[FILE_EXTENSIONS.YAML]: "lexical",
	[FILE_EXTENSIONS.YML]: "lexical",
	[FILE_EXTENSIONS.TOML]: "lexical",
	[FILE_EXTENSIONS.XML]: "lexical",
	[FILE_EXTENSIONS.SQL]: "lexical",
	[FILE_EXTENSIONS.SH]: "lexical",
	[FILE_EXTENSIONS.BASH]: "lexical",
	[FILE_EXTENSIONS.PY]: "lexical",
	[FILE_EXTENSIONS.RS]: "lexical",
	[FILE_EXTENSIONS.GO]: "lexical",
	[FILE_EXTENSIONS.JAVA]: "lexical",
	[FILE_EXTENSIONS.C]: "lexical",
	[FILE_EXTENSIONS.CPP]: "lexical",
	[FILE_EXTENSIONS.H]: "lexical",
	[FILE_EXTENSIONS.HPP]: "lexical",
	[FILE_EXTENSIONS.TXT]: "lexical",
};

/**
 * 扩展名到图表类型的映射
 */
export const EXTENSION_TO_DIAGRAM_TYPE_MAP: Record<string, DiagramType> = {
	[FILE_EXTENSIONS.MERMAID]: "mermaid",
	[FILE_EXTENSIONS.PLANTUML]: "plantuml",
};

/**
 * NodeType 到默认扩展名的映射
 *
 * 用于创建新文件时自动添加扩展名
 */
export const NODE_TYPE_TO_EXTENSION_MAP: Record<string, string> = {
	// 富文本类型使用 .grain
	file: FILE_EXTENSIONS.GRAIN,
	diary: FILE_EXTENSIONS.GRAIN,
	wiki: FILE_EXTENSIONS.GRAIN,
	todo: FILE_EXTENSIONS.GRAIN,
	note: FILE_EXTENSIONS.GRAIN,
	ledger: FILE_EXTENSIONS.GRAIN,

	// 绘图类型
	drawing: FILE_EXTENSIONS.EXCALIDRAW,

	// 图表类型（使用 Lexical 编辑器）
	mermaid: FILE_EXTENSIONS.MERMAID,
	plantuml: FILE_EXTENSIONS.PLANTUML,

	// 代码类型（使用 Lexical 编辑器）
	code: FILE_EXTENSIONS.JS,
};
