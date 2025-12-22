/**
 * Export Domain
 *
 * 文档导出功能（PDF、Word、TXT、EPUB）
 */

// ============================================================================
// Utils (纯函数)
// ============================================================================

export {
	type ExportFormat,
	type ExportOptions,
	escapeHtml,
	extractTextFromContent,
	extractTextFromNode,
	generateEpubChapterHtml,
	generatePrintHtml,
	getNodeContents,
} from "./export.utils";

// ============================================================================
// Export Service
// ============================================================================

export {
	exportProject,
	exportToEpub,
	exportToPdf,
	exportToTxt,
	exportToWord,
} from "./export.service";

// ============================================================================
// Export Path Service
// ============================================================================

export {
	clearDefaultExportPath,
	type ExportPathService,
	type ExportSettings,
	exportPathService,
	exportWithPathSelection,
	getDefaultExportPath,
	getDownloadsDirectory,
	getExportSettings,
	getLastUsedPath,
	isTauriEnvironment,
	saveExportSettings,
	saveToPath,
	selectExportDirectory,
	setDefaultExportPath,
	setLastUsedPath,
} from "./export-path.service";

// ============================================================================
// 排除 extractTextFromContent 的导出（避免与 search 模块冲突）
// 用于 services/index.ts 的向后兼容导出
// ============================================================================

export { extractTextFromNode as exportExtractTextFromNode } from "./export.utils";
