/**
 * @file index.ts
 * @description Database Module - Unified Exports
 *
 * This file provides a single entry point for all database-related exports.
 * Import from '@/db' to access database instance, types, and models.
 *
 * 数据库层架构：
 * - database.ts: Dexie 数据库实例
 * - *.db.fn.ts: 函数式数据库操作（使用 TaskEither）
 *
 * 类型定义请从 @/types 导入
 *
 * @requirements 2.1, 3.1, 3.2, 3.3
 */

// ============================================================================
// 数据库实例
// ============================================================================

export { database, GrainDatabase, NovelEditorDatabase } from "./database";

// ============================================================================
// 函数式数据库操作（新架构）
// ============================================================================

// Backup 类型（从 types 重新导出）
export type {
	BackupData,
	BackupMetadata,
	DatabaseStats,
	LocalBackupRecord,
} from "@/types/backup";
// Storage 类型（从 types 重新导出）
export type {
	ClearDataOptions,
	IndexedDBStats,
	StorageStats,
	TableSizes,
	TableStats,
} from "@/types/storage";
// Attachment 数据库函数
export {
	addAttachment,
	attachmentExists,
	countAttachments,
	countAttachmentsByProject,
	deleteAttachment,
	deleteAttachmentsByProject,
	getAllAttachments,
	getAttachmentById,
	getAttachmentByIdOrFail,
	getAttachmentsByProject,
	getAttachmentsByProjectAndType,
	getAttachmentsByType,
	getAudioFilesByProject,
	getGlobalAttachments,
	getImagesByProject,
	getTotalSizeByProject,
	saveAttachment,
	updateAttachment,
} from "./attachment.db.fn";
// Backup 数据库函数
export {
	createBackup,
	exportBackupJson,
	exportBackupZip,
	getDatabaseStats,
	getLastBackupTime,
	getLocalBackups,
	performAutoBackup,
	restoreBackup,
	restoreBackupData,
	restoreLocalBackup,
	saveLocalBackup,
	shouldAutoBackup,
} from "./backup.db.fn";
// Clear Data 数据库函数
export {
	clearAllData,
	clearCaches,
	clearCookies,
	clearIndexedDB,
	clearLocalStorage,
	clearSessionStorage,
	getStorageStats,
} from "./clear-data.db.fn";
// Content 数据库函数 - 已迁移到 @/repo/content.repo.fn.ts
// 请使用 import { ... } from "@/repo" 代替
// Init 数据库函数
export {
	createDefaultUser,
	type DBVersionRecord,
	type DefaultUserConfig,
	getDBVersion,
	hasDBVersion,
	hasUsers,
	initDatabase,
	isDatabaseInitialized,
	resetDatabase,
	setDBVersion,
} from "./init.db.fn";
// Node 数据库函数 - 已迁移到 @/repo/node.repo.fn.ts
// 请使用 import { ... } from "@/repo" 代替
// Tag 数据库函数
export {
	countTagsByWorkspace,
	deleteTag,
	deleteTagsByWorkspace,
	getNodesByTag,
	getTagById,
	getTagByIdOrFail,
	getTagGraphData,
	getTagsByWorkspace,
	rebuildTagCache,
	recalculateTagCounts,
	saveTag,
	searchTags,
	syncTagCache,
	type TagGraphData,
	type TagGraphEdge,
	type TagGraphNode,
	tagExists,
	upsertTag,
} from "./tag.db.fn";
// User 数据库函数
export {
	addUser,
	countUsers,
	deleteUser,
	emailExists,
	getAllUsers,
	getCurrentUser,
	getOrCreateDefaultUser,
	getUserByEmail,
	getUserById,
	getUserByIdOrFail,
	getUserByUsername,
	getUsersByPlan,
	saveUser,
	touchUser,
	updateUser,
	updateUserFeatures,
	updateUserPlan,
	updateUserSettings,
	updateUserState,
	updateUserToken,
	userExists,
	usernameExists,
} from "./user.db.fn";
// Workspace 数据库函数 - 已迁移到 @/repo/workspace.repo.fn.ts
// 请使用 import { ... } from "@/repo" 代替
