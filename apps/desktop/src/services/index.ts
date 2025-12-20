/**
 * Services Index
 *
 * 统一导出入口，提供向后兼容性。
 *
 * @deprecated 建议直接从 domain 模块导入：
 * - @/domain/diary - 日记功能
 * - @/domain/search - 搜索功能
 * - @/domain/export - 导出功能
 * - @/domain/import-export - 导入导出功能
 * - @/domain/keyboard - 键盘快捷键
 * - @/domain/wiki - Wiki 功能
 * - @/domain/updater - 自动更新
 * - @/domain/file-creator - 文件创建
 * - @/domain/save - 保存功能
 * - @/db/backup - 备份功能
 * - @/db/clear-data - 数据清理
 * - @/db/init - 数据库初始化
 */

// ============================================================================
// Domain 模块
// ============================================================================

export * from "@/domain/diary";
export * from "@/domain/search";
export * from "@/domain/import-export";
export * from "@/domain/keyboard";
export * from "@/domain/wiki";
export * from "@/domain/updater";
export * from "@/domain/file-creator";

// Save (仅导出 service，store 在 domain/save 中)
export { saveService, type SaveResult, type SaveService } from "@/domain/save";

// Export (排除 extractTextFromContent 避免与 search 模块冲突)
export {
	extractTextFromNode,
	escapeHtml,
	generatePrintHtml,
	generateEpubChapterHtml,
	getNodeContents,
	exportToTxt,
	exportToWord,
	exportToPdf,
	exportToEpub,
	exportProject,
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
	type ExportOptions,
	type ExportFormat,
	type ExportSettings,
	type ExportPathService,
} from "@/domain/export";

// ============================================================================
// Database 模块
// ============================================================================

// Backup (排除 clearAllData 避免与 clear-data 模块冲突)
export {
	createBackup,
	exportBackup,
	exportBackupZip,
	restoreBackup,
	getDatabaseStats,
	AutoBackupManager,
	autoBackupManager,
	type BackupMetadata,
	type BackupData,
} from "@/db/backup";

export * from "@/db/clear-data";
export * from "@/db/init";

// ============================================================================
// Services (暂保留，使用 db/models)
// ============================================================================

export * from "./drawings";
export * from "./nodes";
export * from "./tags";
export * from "./workspaces";
