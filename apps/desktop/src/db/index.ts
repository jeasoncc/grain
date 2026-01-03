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
	GrainDatabase,
	LogDatabase,
	type LogEntry,
	logDatabase,
	NovelEditorDatabase,
} from "./database";

// ============================================================================
// 日志数据库操作
// ============================================================================

export { LogDB, type LogEntry as LogDBEntry, logDB } from "./log-db";

// ============================================================================
// API 客户端（Rust 后端通信）
// ============================================================================

export { type ApiClient, api, createApiClient } from "./api-client.fn";

// ============================================================================
// Repo 层重新导出（兼容性）
// ============================================================================

// Node Repository - 从 @/repo 重新导出
// Content Repository - 从 @/repo 重新导出
// Workspace Repository - 从 @/repo 重新导出
// User Repository - 从 @/repo 重新导出
// Backup Repository - 从 @/repo 重新导出
// Clear Data Repository - 从 @/repo 重新导出
export {
	addContent,
	addNode,
	addUser,
	cleanupOldBackups,
	clearAllData,
	clearAllDataKeepUsers,
	clearLogs,
	clearSqliteData,
	clearSqliteDataKeepUsers,
	createBackup,
	createContent,
	createNode,
	createUser,
	createWorkspace,
	deleteBackup,
	deleteNode,
	deleteNodesBatch,
	deleteUser,
	deleteWorkspace,
	duplicateNode,
	getAllNodes,
	getAllWorkspaces,
	getChildNodes,
	getContentByNodeId,
	getContentByNodeIdOrFail,
	getContentsByNodeIds,
	getContentVersion,
	getCurrentUser,
	getCurrentUserOrFail,
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
	getUser,
	getUserByEmail,
	getUserById,
	getUserByIdOrNull,
	getUserByUsername,
	getUserOrFail,
	getUsers,
	getWorkspace,
	getWorkspaceById,
	getWorkspaces,
	listBackups,
	moveNode,
	reorderNodes,
	restoreBackup,
	saveContent,
	setNodeCollapsed,
	updateContentByNodeId,
	updateNode,
	updateUser,
	updateUserLastLogin,
	updateWorkspace,
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
