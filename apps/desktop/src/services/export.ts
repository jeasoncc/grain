/**
 * @file services/export.ts
 * @description Export 服务模块 - 向后兼容导出
 *
 * @deprecated 建议直接从 @/domain/export 导入
 *
 * 本文件提供向后兼容性，将导出功能从 domain/export 重新导出。
 * 新代码应直接使用 @/domain/export 模块。
 */

// 从 domain/export 重新导出所有导出功能
export {
	// 类型
	type ExportFormat,
	type ExportOptions,
	// 工具函数
	escapeHtml,
	// 主要导出函数
	exportProject,
	exportToEpub,
	exportToPdf,
	exportToTxt,
	exportToWord,
	extractTextFromNode,
	generateEpubChapterHtml,
	generatePrintHtml,
	getNodeContents,
} from "@/domain/export";
