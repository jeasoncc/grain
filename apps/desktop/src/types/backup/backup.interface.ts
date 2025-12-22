/**
 * @file backup.interface.ts
 * @description 备份相关类型定义
 */

// ============================================================================
// 备份元数据
// ============================================================================

/**
 * 备份元数据
 */
export interface BackupMetadata {
	readonly version: string;
	readonly timestamp: string;
	readonly projectCount: number;
	readonly nodeCount: number;
	readonly contentCount: number;
	readonly tagCount: number;
	readonly appVersion: string;
}

// ============================================================================
// 备份数据结构
// ============================================================================

/**
 * 备份数据结构
 */
export interface BackupData {
	readonly metadata: BackupMetadata;
	readonly users: unknown[];
	readonly workspaces: unknown[];
	readonly nodes: unknown[];
	readonly contents: unknown[];
	readonly drawings: unknown[];
	readonly attachments: unknown[];
	readonly tags: unknown[];
	readonly dbVersions: unknown[];
	/** @deprecated Use workspaces instead */
	readonly projects?: unknown[];
	/** @deprecated Wiki entries are now stored as file nodes with "wiki" tag */
	readonly wikiEntries?: unknown[];
}

// ============================================================================
// 数据库统计信息
// ============================================================================

/**
 * 数据库统计信息
 */
export interface DatabaseStats {
	readonly userCount: number;
	readonly projectCount: number;
	readonly nodeCount: number;
	readonly contentCount: number;
	readonly drawingCount: number;
	readonly attachmentCount: number;
	readonly tagCount: number;
}

// ============================================================================
// 本地备份记录
// ============================================================================

/**
 * 本地备份记录
 */
export interface LocalBackupRecord {
	readonly timestamp: string;
	readonly data: BackupData;
}
