/**
 * Export Domain
 * 
 * 文档导出功能（PDF、Word、TXT、EPUB）
 */

// ============================================================================
// Utils (纯函数)
// ============================================================================

export {
	extractTextFromContent,
	extractTextFromNode,
	escapeHtml,
	generatePrintHtml,
	generateEpubChapterHtml,
	getNodeContents,
	type ExportOptions,
	type ExportFormat,
} from "./export.utils";

// ============================================================================
// Export Service
// ============================================================================

export {
	exportToTxt,
	exportToWord,
	exportToPdf,
	exportToEpub,
	exportProject,
} from "./export.service";

// ============================================================================
// Export Path Service
// ============================================================================

export {
	isTauriEnvironment,
	selectExportDirectory,
	saveToPath,
	getDownloadsDirectory,
	getExportSettings,
	saveExportSettings,
	getDefaultExportPath,
	setDefaultExportPath,
	getLastUsedPath,
	setLastUsedPath,
	clearDefaultExportPath,
	exportPathService,
	exportWithPathSelection,
	type ExportSettings,
	type ExportPathService,
} from "./export-path.service";

// ============================================================================
// 排除 extractTextFromContent 的导出（避免与 search 模块冲突）
// 用于 services/index.ts 的向后兼容导出
// ============================================================================

export {
	extractTextFromNode as exportExtractTextFromNode,
} from "./export.utils";
