/**
 * @file flows/backup/backup.flow.ts
 * @description 数据库备份与恢复流程
 *
 * 依赖规则：flows/ 只能依赖 pipes/, io/, state/, types/
 */

import dayjs from "dayjs"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as backupApi from "@/io/api/backup.api"
import type { BackupData, DatabaseStats, LocalBackupRecord } from "@/types/backup"
import { type AppError, dbError, importError } from "@/types/error"
import type { BackupInfo } from "@/types/rust-api"

// ============================================================================
// 备份操作
// ============================================================================

/**
 * 创建完整数据库备份
 */
export const createBackup = (): TE.TaskEither<AppError, BackupInfo> => backupApi.createBackup()

/**
 * 导出备份到 JSON 文件
 */
export const exportBackupJson = (): TE.TaskEither<AppError, string> =>
	pipe(
		createBackup(),
		TE.map((backupInfo) => backupInfo.filename),
	)

/**
 * 导出备份到 ZIP 文件
 */
export const exportBackupZip = (): TE.TaskEither<AppError, string> =>
	pipe(
		createBackup(),
		TE.map((backupInfo) => backupInfo.filename),
	)

// ============================================================================
// 恢复操作
// ============================================================================

/**
 * 从文件恢复备份
 */
export const restoreBackup = (file: File): TE.TaskEither<AppError, void> =>
	pipe(
		TE.tryCatch(
			async () => file.name,
			(error): AppError => importError(`处理备份文件失败: ${error}`),
		),
		TE.chain((filePath) => backupApi.restoreBackup(filePath)),
	)

/**
 * 从备份数据恢复（不从文件读取）
 */
export const restoreBackupData = (backupPath: string): TE.TaskEither<AppError, void> =>
	backupApi.restoreBackup(backupPath)

// ============================================================================
// 统计操作
// ============================================================================

/**
 * 获取数据库统计信息
 * 注意：此函数暂时保留，但统计信息现在通过 SQLite API 获取
 * TODO: 实现基于 SQLite API 的统计信息获取
 */
export const getDatabaseStats = (): TE.TaskEither<AppError, DatabaseStats> =>
	TE.tryCatch(
		async () => ({
			// 临时返回默认值，实际应该通过 SQLite API 获取统计信息
			attachmentCount: 0,
			contentCount: 0,
			drawingCount: 0,
			nodeCount: 0,
			projectCount: 0,
			tagCount: 0,
			userCount: 0,
		}),
		(error): AppError => dbError(`获取数据库统计信息失败: ${error}`),
	)

// ============================================================================
// 本地备份管理
// ============================================================================

const LOCAL_BACKUPS_KEY = "auto-backups"
const LAST_BACKUP_KEY = "last-auto-backup"

/**
 * 获取本地存储的备份列表
 */
export const getLocalBackups = (): TE.TaskEither<AppError, readonly LocalBackupRecord[]> =>
	TE.tryCatch(
		async () => {
			const stored = localStorage.getItem(LOCAL_BACKUPS_KEY)
			return stored ? JSON.parse(stored) : []
		},
		(error): AppError => dbError(`获取本地备份列表失败: ${error}`),
	)

/**
 * 保存备份到本地存储
 * 注意：由于 SQLite API 直接创建备份文件，此函数现在保存备份信息而不是完整数据
 */
export const saveLocalBackup = (
	backupInfo: BackupInfo,
	maxBackups = 3,
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			const backupsResult = await getLocalBackups()()
			if (backupsResult._tag === "Left") {
				throw new Error(backupsResult.left.message)
			}
			const backups = backupsResult.right

			// 创建一个兼容的备份记录，使用 BackupInfo 而不是完整的 BackupData
			const newBackup = {
				// 注意：这里我们不再存储完整的数据，只存储备份信息
				data: {
					attachments: [],
					contents: [],
					dbVersions: [],
					drawings: [],
					metadata: {
						appVersion: "0.1.89",
						contentCount: 0,
						nodeCount: 0,
						projectCount: 0, // SQLite API 不提供这些统计信息
						tagCount: 0,
						timestamp: dayjs(backupInfo.createdAt).toISOString(),
						version: "5.0.0",
					},
					nodes: [],
					tags: [],
					users: [],
					workspaces: [],
				} as BackupData,
				timestamp: dayjs(backupInfo.createdAt).toISOString(),
			}
			const recentBackups = [newBackup, ...backups].slice(0, maxBackups)
			localStorage.setItem(LOCAL_BACKUPS_KEY, JSON.stringify(recentBackups))
			localStorage.setItem(LAST_BACKUP_KEY, dayjs(backupInfo.createdAt).toISOString())
		},
		(error): AppError => dbError(`保存本地备份失败: ${error}`),
	)

/**
 * 从本地存储恢复备份
 */
export const restoreLocalBackup = (timestamp: string): TE.TaskEither<AppError, void> =>
	pipe(
		getLocalBackups(),
		TE.chain((backups) =>
			TE.tryCatch(
				async () => {
					const backup = backups.find((b) => b.timestamp === timestamp)

					if (!backup) {
						throw new Error(`未找到备份: ${timestamp}`)
					}

					// 返回时间戳作为备份路径标识符
					// 实际实现中可能需要根据时间戳查找对应的备份文件路径
					return timestamp
				},
				(error): AppError => importError(`查找本地备份失败: ${error}`),
			),
		),
		TE.chain((backupPath) => restoreBackupData(backupPath)),
	)

/**
 * 获取上次备份时间
 */
export const getLastBackupTime = (): string | null => localStorage.getItem(LAST_BACKUP_KEY)

/**
 * 检查是否需要自动备份
 */
export const shouldAutoBackup = (intervalHours = 24): boolean => {
	const lastBackup = getLastBackupTime()
	if (!lastBackup) return true

	const lastTime = dayjs(lastBackup)
	const now = dayjs()
	return now.diff(lastTime, "hour") >= intervalHours
}

/**
 * 执行自动备份
 */
export const performAutoBackup = (intervalHours = 24): TE.TaskEither<AppError, boolean> => {
	if (!shouldAutoBackup(intervalHours)) {
		return TE.right(false)
	}

	return pipe(
		createBackup(),
		TE.chain((backupInfo) =>
			pipe(
				saveLocalBackup(backupInfo),
				TE.map(() => true),
			),
		),
	)
}

// ============================================================================
// 自动备份管理器
// ============================================================================

export const createAutoBackupManager = () => {
	let intervalId: number | null = null

	const start = (intervalHours = 24) => {
		if (intervalId) {
			return
		}

		checkAndBackup()
		intervalId = window.setInterval(() => checkAndBackup(), intervalHours * 60 * 60 * 1000)
	}

	const stop = () => {
		if (intervalId) {
			clearInterval(intervalId)
			intervalId = null
		}
	}

	const checkAndBackup = async () => {
		await performAutoBackup()()
	}

	return {
		getLocalBackups: () => getLocalBackups()(),
		start,
		stop,
	}
}

export const autoBackupManager = createAutoBackupManager()
