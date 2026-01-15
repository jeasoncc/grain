/**
 * @file fn/import/index.ts
 * @description Import 纯函数模块统一导出
 *
 * 本模块提供将各种格式导入为 Lexical JSON 内容的纯函数：
 * - Markdown: Markdown 格式导入
 * - JSON: JSON 备份导入
 * - File: 文件读取工具
 *
 * 所有函数都是纯函数，无副作用，可组合，可测试。
 *
 * TODO: 批量导入功能（importDirectory）暂不实现，预留接口
 */

// 文件读取工具
export {
	type FileReadError,
	readFileAsText,
	readFileAsTextSafe,
	validateFileExtension,
	validateFileType,
} from "./import.file.fn"

// JSON 导入
export {
	type AttachmentData,
	type ContentData,
	type ExportBundle,
	generateIdMap,
	type JsonImportError,
	type JsonImportOptions,
	type ParsedImportData,
	parseImportData,
	parseJsonBundle,
	transformAttachments,
	transformContents,
	transformNodes,
	transformWorkspaces,
	validateBundle,
} from "./import.json.fn"
// Markdown 导入
export {
	type ImportError,
	type ImportResult,
	importFromMarkdown,
	importMarkdownToJson,
	importMultipleFromMarkdown,
	type MarkdownImportOptions,
	parseFrontMatter,
	parseHeadingLine,
	parseInlineContent,
	parseListItemLine,
	parseMarkdownToDocument,
	parseParagraph,
} from "./import.markdown.fn"

// ==============================
// TODO: 批量导入接口（暂不实现）
// ==============================

/**
 * 目录导入选项（预留接口）
 */
export interface DirectoryImportOptions {
	/** 导入格式 */
	readonly format: "markdown" | "json"
	/** 是否递归导入子目录 */
	readonly recursive?: boolean
	/** 文件过滤模式 */
	readonly filePattern?: string
	/** 是否保留目录结构 */
	readonly preserveStructure?: boolean
}

/**
 * 导入目录（预留接口，暂不实现）
 *
 * @param _directoryPath - 目录路径
 * @param _options - 导入选项
 * @returns Promise<ImportResult[]>
 */
export async function importDirectory(
	_directoryPath: string,
	_options: DirectoryImportOptions,
): Promise<never> {
	throw new Error("importDirectory 功能暂未实现")
}
