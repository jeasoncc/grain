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
	readonly version: string
	readonly timestamp: string
	readonly projectCount: number
	readonly nodeCount: number
	readonly contentCount: number
	readonly tagCount: number
	readonly appVersion: string
}

// ============================================================================
// 备份数据结构
// ============================================================================

/**
 * 备份数据结构
 */
export interface BackupData {
	readonly metadata: BackupMetadata
	readonly users: readonly unknown[]
	readonly workspaces: readonly unknown[]
	readonly nodes: readonly unknown[]
	readonly contents: readonly unknown[]
	readonly drawings: readonly unknown[]
	readonly attachments: readonly unknown[]
	readonly tags: readonly unknown[]
	readonly dbVersions: readonly unknown[]
	/** @deprecated Use workspaces instead */
	readonly projects?: readonly unknown[]
	/** @deprecated Legacy field - Wiki data is now stored as file nodes with "wiki" tag */
	readonly legacyWikiData?: readonly unknown[]
}

// ============================================================================
// 数据库统计信息
// ============================================================================

/**
 * 数据库统计信息
 */
export interface DatabaseStats {
	readonly userCount: number
	readonly projectCount: number
	readonly nodeCount: number
	readonly contentCount: number
	readonly drawingCount: number
	readonly attachmentCount: number
	readonly tagCount: number
}

// ============================================================================
// 本地备份记录
// ============================================================================

/**
 * 本地备份记录
 */
export interface LocalBackupRecord {
	readonly timestamp: string
	readonly data: BackupData
}
