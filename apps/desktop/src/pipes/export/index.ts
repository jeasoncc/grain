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

