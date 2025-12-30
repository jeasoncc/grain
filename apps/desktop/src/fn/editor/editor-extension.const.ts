/**
 * @file editor-extension.const.ts
 * @description 文件扩展名与编辑器类型映射常量
 *
 * 定义文件扩展名到编辑器类型的映射关系，
 * 支持扩展名驱动的编辑器选择机制。
 *
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

// ==============================
// Types
// ==============================

/**
 * 编辑器类型
 *
 * - lexical: Lexical 富文本编辑器（.grain 文件）
 * - excalidraw: Excalidraw 绘图编辑器（.excalidraw 文件）
 * - diagram: 图表编辑器（.mermaid, .plantuml 文件）
 * - code: Monaco 代码编辑器（.js, .ts, .md 等代码文件）
 */
export type EditorType = "lexical" | "excalidraw" | "diagram" | "code";

/**
 * 图表类型
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
 */
export const EXTENSION_TO_EDITOR_MAP: Record<string, EditorType> = {
	// Lexical 富文本编辑器
	[FILE_EXTENSIONS.GRAIN]: "lexical",

	// Excalidraw 绘图编辑器
	[FILE_EXTENSIONS.EXCALIDRAW]: "excalidraw",

	// 图表编辑器
	[FILE_EXTENSIONS.MERMAID]: "diagram",
	[FILE_EXTENSIONS.PLANTUML]: "diagram",

	// 代码编辑器（所有其他扩展名）
	[FILE_EXTENSIONS.JS]: "code",
	[FILE_EXTENSIONS.TS]: "code",
	[FILE_EXTENSIONS.JSX]: "code",
	[FILE_EXTENSIONS.TSX]: "code",
	[FILE_EXTENSIONS.JSON]: "code",
	[FILE_EXTENSIONS.MD]: "code",
	[FILE_EXTENSIONS.HTML]: "code",
	[FILE_EXTENSIONS.CSS]: "code",
	[FILE_EXTENSIONS.SCSS]: "code",
	[FILE_EXTENSIONS.LESS]: "code",
	[FILE_EXTENSIONS.YAML]: "code",
	[FILE_EXTENSIONS.YML]: "code",
	[FILE_EXTENSIONS.TOML]: "code",
	[FILE_EXTENSIONS.XML]: "code",
	[FILE_EXTENSIONS.SQL]: "code",
	[FILE_EXTENSIONS.SH]: "code",
	[FILE_EXTENSIONS.BASH]: "code",
	[FILE_EXTENSIONS.PY]: "code",
	[FILE_EXTENSIONS.RS]: "code",
	[FILE_EXTENSIONS.GO]: "code",
	[FILE_EXTENSIONS.JAVA]: "code",
	[FILE_EXTENSIONS.C]: "code",
	[FILE_EXTENSIONS.CPP]: "code",
	[FILE_EXTENSIONS.H]: "code",
	[FILE_EXTENSIONS.HPP]: "code",
	[FILE_EXTENSIONS.TXT]: "code",
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

	// 图表类型
	mermaid: FILE_EXTENSIONS.MERMAID,
	plantuml: FILE_EXTENSIONS.PLANTUML,

	// 代码类型（默认 .js）
	code: FILE_EXTENSIONS.JS,
};
