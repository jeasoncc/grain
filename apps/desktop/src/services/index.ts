/**
 * Services Index
 *
 * 统一导出入口，提供向后兼容性。
 *
 * @deprecated 建议直接从新架构模块导入：
 * - @/fn/export - 导出纯函数
 * - @/fn/import - 导入纯函数
 * - @/fn/content - 内容处理纯函数
 * - @/fn/search - 搜索功能
 * - @/routes/actions - Action 函数（包括文件创建）
 * - @/domain/diary - 日记功能
 * - @/domain/export - 导出功能
 * - @/fn/keyboard - 键盘快捷键
 * - @/domain/wiki - Wiki 功能
 * - @/domain/updater - 自动更新
 * - @/domain/save - 保存功能
 * - @/db/backup - 备份功能
 * - @/db/clear-data - 数据清理
 * - @/db/init - 数据库初始化
 */

// ============================================================================
// Domain 模块
// ============================================================================

export * from "@/domain/diary";
// Export (排除 extractTextFromContent 避免与 search 模块冲突)
export {
	type ExportFormat,
	type ExportOptions,
	escapeHtml,
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
export * from "@/domain/updater";
export * from "@/domain/wiki";
// Export Path (从 fn/export 重新导出)
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
} from "@/fn/export";
export * from "@/fn/keyboard";
// Save (从 fn/save 重新导出)
export {
	type SaveResult,
	type SaveServiceInterface as SaveService,
	saveService,
} from "@/fn/save";
// Search (从 fn/search 重新导出)
export {
	calculateSimpleScore,
	extractHighlights,
	extractTextFromContent,
	extractTextFromLexical,
	generateExcerpt,
	SearchEngine,
	type SearchOptions,
	type SearchResult,
	type SearchResultType,
	searchEngine,
} from "@/fn/search";
// File Creator (从 routes/actions 重新导出)
export {
	type CreateFileInTreeParams,
	type CreateFileInTreeResult,
	createFileInTree,
	ensureRootFolder,
	ensureRootFolderAsync,
} from "@/routes/actions";
// Import-Export (从新架构重新导出)
export {
	type ExportBundle,
	exportAll,
	exportAllAsZip,
	exportAsMarkdown,
	extractText,
	importFromJson,
	readFileAsText,
	triggerBlobDownload,
	triggerDownload,
} from "./import-export";

// ============================================================================
// Database 模块
// ============================================================================

// Backup (排除 clearAllData 避免与 clear-data 模块冲突)
export {
	AutoBackupManager,
	autoBackupManager,
	type BackupData,
	type BackupMetadata,
	createBackup,
	exportBackup,
	exportBackupZip,
	getDatabaseStats,
	restoreBackup,
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
