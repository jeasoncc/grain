/**
 * @file fn/export/index.ts
 * @description Export 纯函数模块统一导出
 *
 * 本模块提供将 Lexical JSON 内容导出为各种格式的纯函数：
 * - JSON: 原始 JSON 格式导出
 * - Markdown: Markdown 格式导出
 * - Org-mode: Emacs Org-mode 格式导出
 * - Bundle: 数据包导出（ZIP、全量备份）
 * - Download: 文件下载工具
 *
 * 所有函数都是纯函数，无副作用，可组合，可测试。
 *
 * TODO: 全局导出功能（exportWorkspace）暂不实现，预留接口
 */

// 类型定义
export type { ExportFormat, ExportOptions } from "@/types/export"

// Bundle 导出（数据包）
export {
	createExportBundle,
	createZipBundle,
	type ExportBundle,
	type ExportDataInput,
	exportWorkspaceToMarkdown,
	serializeBundle,
} from "./export.bundle.fn"
// Download 工具
export { triggerBlobDownload, triggerDownload } from "./export.download.fn"
// JSON 导出
export {
	createExportDocument,
	type ExportError,
	exportMultipleToJson,
	exportRawJson,
	exportToJson,
	type JsonExportDocument,
	type JsonExportMetadata,
	type JsonExportOptions,
	parseLexicalContent,
	serializeToJson,
} from "./export.json.fn"
// Markdown 导出
export {
	applyTextFormat,
	convertDocumentToMarkdown,
	convertHeadingNode as convertHeadingToMarkdown,
	convertListNode as convertListToMarkdown,
	convertParagraphNode as convertParagraphToMarkdown,
	exportMultipleToMarkdown,
	exportToMarkdown,
	generateFrontMatter,
	type MarkdownExportOptions,
} from "./export.markdown.fn"
// Org-mode 导出
export {
	applyOrgTextFormat,
	convertDocumentToOrgmode,
	convertHeadingNode as convertHeadingToOrgmode,
	convertListNode as convertListToOrgmode,
	convertParagraphNode as convertParagraphToOrgmode,
	exportMultipleToOrgmode,
	exportToOrgmode,
	generateOrgProperties,
	type OrgmodeExportOptions,
} from "./export.orgmode.fn"

// Path 管理（路径选择、文件保存、设置管理）
// 注意：实际实现已移动到 flows/export/export-path.flow.ts
// 请直接从 @/flows/export 导入这些函数
// 此处不再重导出以避免反向依赖

// ==============================
// TODO: 全局导出接口（暂不实现）
// ==============================

/**
 * 工作区导出选项（预留接口）
 */
export interface WorkspaceExportOptions {
	/** 导出格式 */
	readonly format: "json" | "markdown" | "orgmode" | "zip"
	/** 是否包含元数据 */
	readonly includeMetadata?: boolean
	/** 是否包含附件 */
	readonly includeAttachments?: boolean
	/** 文件命名模式 */
	readonly fileNaming?: "title" | "id" | "date"
}

/**
 * 导出工作区（预留接口，暂不实现）
 *
 * @param _workspaceId - 工作区 ID
 * @param _options - 导出选项
 * @returns Promise<Blob>
 */
export async function exportWorkspace(
	_workspaceId: string,
	_options: WorkspaceExportOptions,
): Promise<Blob> {
	throw new Error("exportWorkspace 功能暂未实现")
}
