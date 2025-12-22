/**
 * Backup Module
 *
 * 数据库备份和恢复功能
 */

export {
	AutoBackupManager,
	autoBackupManager,
	type BackupData,
	type BackupMetadata,
	clearAllData,
	createBackup,
	exportBackup,
	exportBackupZip,
	getDatabaseStats,
	restoreBackup,
} from "./backup.service";

// ============================================================================
// 排除 clearAllData 的导出（避免与 clear-data 模块冲突）
// 用于 services/index.ts 的向后兼容导出
// ============================================================================

export {
	AutoBackupManager as BackupAutoManager,
	autoBackupManager as backupAutoManager,
	createBackup as backupCreate,
	exportBackup as backupExport,
	exportBackupZip as backupExportZip,
	getDatabaseStats as backupGetStats,
	restoreBackup as backupRestore,
} from "./backup.service";
