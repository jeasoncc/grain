/**
 * Backup Module
 * 
 * 数据库备份和恢复功能
 */

export {
	createBackup,
	exportBackup,
	exportBackupZip,
	restoreBackup,
	clearAllData,
	getDatabaseStats,
	AutoBackupManager,
	autoBackupManager,
	type BackupMetadata,
	type BackupData,
} from "./backup.service";

// ============================================================================
// 排除 clearAllData 的导出（避免与 clear-data 模块冲突）
// 用于 services/index.ts 的向后兼容导出
// ============================================================================

export {
	createBackup as backupCreate,
	exportBackup as backupExport,
	exportBackupZip as backupExportZip,
	restoreBackup as backupRestore,
	getDatabaseStats as backupGetStats,
	AutoBackupManager as BackupAutoManager,
	autoBackupManager as backupAutoManager,
} from "./backup.service";
