/**
 * @file index.ts
 * @description Database Module - Unified Exports
 *
 * This file provides a single entry point for database-related exports.
 *
 * 架构说明：
 * - 业务数据（nodes, contents, workspaces, users, attachments, tags）
 *   已迁移到 Rust 后端 (SQLite)，请使用 @/repo 导入
 * - 日志数据保留在 IndexedDB (Dexie)，用于高频写入
 *
 * 迁移指南：
 * - Node 操作: import { ... } from "@/repo"
 * - Content 操作: import { ... } from "@/repo"
 * - Workspace 操作: import { ... } from "@/repo"
 * - User 操作: import { ... } from "@/repo"
 * - Backup 操作: import { ... } from "@/repo"
 * - Clear Data 操作: import { ... } from "@/repo"
 *
 * @requirements 7.4, 9.1, 9.2
 */

// ============================================================================
// 日志数据库实例（保留在 IndexedDB）
// ============================================================================

export {
	database,
	logDatabase,
	LogDatabase,
	GrainDatabase,
	NovelEditorDatabase,
	type LogEntry,
} from "./database";

// ============================================================================
// 日志数据库操作
// ============================================================================

export { logDB, LogDB, type LogEntry as LogDBEntry } from "./log-db";

// ============================================================================
// API 客户端（Rust 后端通信）
// ============================================================================

export { api, createApiClient, type ApiClient } from "./api-client.fn";

// ============================================================================
// Repo 层重新导出（兼容性）
// ============================================================================

// Node Repository - 从 @/repo 重新导出
export {
	addNode,
	createNode,
	deleteNode,
	deleteNodesBatch,
	duplicateNode,
	getAllNodes,
	getChildNodes,
	getDescendants,
	getNextOrder,
	getNextSortOrder,
	getNode,
	getNodeById,
	getNodeByIdOrFail,
	getNodeByIdOrNull,
	getNodesByParent,
	getNodesByType,
	getNodesByWorkspace,
	getRootNodes,
	moveNode,
	reorderNodes,
	updateNode,
} from "@/repo";

// Content Repository - 从 @/repo 重新导出
export {
	addContent,
	createContent,
	getContentByNodeId,
	getContentByNodeIdOrFail,
	getContentsByNodeIds,
	getContentVersion,
	saveContent,
	updateContentByNodeId,
} from "@/repo";

// Workspace Repository - 从 @/repo 重新导出
export {
	createWorkspace,
	deleteWorkspace,
	getAllWorkspaces,
	getWorkspace,
	getWorkspaceById,
	getWorkspaces,
	updateWorkspace,
} from "@/repo";

// User Repository - 从 @/repo 重新导出
export {
	addUser,
	createUser,
	deleteUser,
	getCurrentUser,
	getCurrentUserOrFail,
	getUser,
	getUserById,
	getUserByIdOrNull,
	getUserByEmail,
	getUserByUsername,
	getUsers,
	getUserOrFail,
	updateUser,
	updateUserLastLogin,
} from "@/repo";

// Backup Repository - 从 @/repo 重新导出
export {
	cleanupOldBackups,
	createBackup,
	deleteBackup,
	listBackups,
	restoreBackup,
} from "@/repo";

// Clear Data Repository - 从 @/repo 重新导出
export {
	clearAllData,
	clearAllDataKeepUsers,
	clearLogs,
	clearSqliteData,
	clearSqliteDataKeepUsers,
} from "@/repo";

// ============================================================================
// 类型重新导出（兼容性）
// ============================================================================

// Backup 类型
export type {
	BackupData,
	BackupMetadata,
	DatabaseStats,
	LocalBackupRecord,
} from "@/types/backup";

// Storage 类型
export type {
	ClearDataOptions,
	IndexedDBStats,
	StorageStats,
	TableSizes,
	TableStats,
} from "@/types/storage";
