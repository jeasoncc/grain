/**
 * @file types/export/export.interface.ts
 * @description Export 类型定义
 *
 * 定义导出功能的类型和接口
 */

/**
 * 导出选项
 */
export interface ExportOptions {
	readonly includeTitle?: boolean
	readonly includeAuthor?: boolean
	readonly includeChapterTitles?: boolean
	readonly includeSceneTitles?: boolean
	readonly pageBreakBetweenChapters?: boolean
}

/**
 * 支持的导出格式
 */
export type ExportFormat = "pdf" | "docx" | "txt" | "epub"
