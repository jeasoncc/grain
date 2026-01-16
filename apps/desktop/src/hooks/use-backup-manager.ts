/**
 * @file hooks/use-backup-manager.ts
 * @description 备份管理 Hook
 *
 * 封装备份相关的业务逻辑，符合架构规范：
 * - hooks/ 可以依赖 flows/, state/, types/
 * - 提供给 views/ 使用
 */

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
	autoBackupManager,
	clearAllData,
	exportBackupJson,
	exportBackupZip,
	getDatabaseStats,
	getLocalBackups,
	restoreBackup,
	restoreLocalBackup,
} from "@/flows/backup"
import { selectFile } from "@/io/file/dialog.file"
import { error as logError } from "@/io/log/logger.api"
import { getAutoBackupEnabled, getStorageStats, setAutoBackupEnabled } from "@/io/storage/settings.storage"
import type { DatabaseStats, LocalBackupRecord } from "@/types/backup"
import type { ClearDataOptions } from "@/types/storage"

/**
 * 备份管理 Hook 返回值
 */
export interface UseBackupManagerReturn {
	// 状态
	readonly stats: DatabaseStats | null
	readonly storageStats: { readonly size: number; readonly keys: number } | null
	readonly loading: boolean
	readonly autoBackupEnabled: boolean
	readonly localBackups: readonly LocalBackupRecord[]

	// 操作
	readonly loadStats: () => Promise<void>
	readonly loadLocalBackups: () => void
	readonly exportJson: () => Promise<void>
	readonly exportZip: () => Promise<void>
	readonly restore: () => Promise<void>
	readonly toggleAutoBackup: (enabled: boolean) => void
	readonly restoreLocal: (timestamp: string) => Promise<void>
	readonly clearAll: () => Promise<void>
	readonly clearDatabase: () => Promise<void>
	readonly clearSettings: () => Promise<void>
}

/**
 * 备份管理 Hook
 *
 * @returns 备份管理状态和操作函数
 */
export function useBackupManager(): UseBackupManagerReturn {
	// ============================================================================
	// 状态
	// ============================================================================

	const [stats, setStats] = useState<DatabaseStats | null>(null)
	const [storageStats, setStorageStats] = useState<{ readonly size: number; readonly keys: number } | null>(null)
	const [loading, setLoading] = useState(false)
	const [autoBackupEnabled, setAutoBackupEnabledState] = useState(false)
	const [localBackups, setLocalBackups] = useState<readonly LocalBackupRecord[]>([])

	// ============================================================================
	// 数据加载
	// ============================================================================

	const loadStats = useCallback(async () => {
		try {
			const statsResult = await getDatabaseStats()()
			if (statsResult._tag === "Right") {
				setStats(statsResult.right)
			}

			const storageResult = getStorageStats()
			setStorageStats(storageResult)
		} catch (err) {
			logError("[BackupManager] 加载统计信息失败", { error: err }, "use-backup-manager")
		}
	}, [])

	const loadLocalBackups = useCallback(() => {
		const backups = getLocalBackups()
		setLocalBackups(backups)
	}, [])

	useEffect(() => {
		loadStats()
		loadLocalBackups()

		const enabled = getAutoBackupEnabled()
		setAutoBackupEnabledState(enabled)
		if (enabled) {
			autoBackupManager.start()
		}
	}, [loadStats, loadLocalBackups])

	// ============================================================================
	// 导出操作
	// ============================================================================

	const exportJson = useCallback(async () => {
		setLoading(true)
		try {
			const result = await exportBackupJson()()
			if (result._tag === "Right") {
				toast.success("备份导出成功")
			} else {
				toast.error(result.left.message)
				logError("[BackupManager] 导出 JSON 失败", { error: result.left }, "use-backup-manager")
			}
		} catch (err) {
			toast.error("导出失败")
			logError("[BackupManager] 导出 JSON 异常", { error: err }, "use-backup-manager")
		} finally {
			setLoading(false)
		}
	}, [])

	const exportZip = useCallback(async () => {
		setLoading(true)
		try {
			const result = await exportBackupZip()()
			if (result._tag === "Right") {
				toast.success("压缩备份导出成功")
			} else {
				toast.error(result.left.message)
				logError("[BackupManager] 导出 ZIP 失败", { error: result.left }, "use-backup-manager")
			}
		} catch (err) {
			toast.error("导出失败")
			logError("[BackupManager] 导出 ZIP 异常", { error: err }, "use-backup-manager")
		} finally {
			setLoading(false)
		}
	}, [])

	// ============================================================================
	// 恢复操作
	// ============================================================================

	const restore = useCallback(async () => {
		const result = await selectFile({
			filters: [{ extensions: ["json", "zip"], name: "备份文件" }],
		})

		if (result.cancelled || !result.file) {
			return
		}

		setLoading(true)
		try {
			const restoreResult = await restoreBackup(result.file)()
			if (restoreResult._tag === "Right") {
				toast.success("备份恢复成功")
				await loadStats()
				window.location.reload()
			} else {
				toast.error(restoreResult.left.message)
				logError(
					"[BackupManager] 恢复备份失败",
					{ error: restoreResult.left },
					"use-backup-manager",
				)
			}
		} catch (err) {
			toast.error("恢复失败")
			logError("[BackupManager] 恢复备份异常", { error: err }, "use-backup-manager")
		} finally {
			setLoading(false)
		}
	}, [loadStats])

	const restoreLocal = useCallback(
		async (timestamp: string) => {
			setLoading(true)
			try {
				const result = await restoreLocalBackup(timestamp)()
				if (result._tag === "Right") {
					toast.success("备份恢复成功")
					await loadStats()
					window.location.reload()
				} else {
					toast.error(result.left.message)
					logError("[BackupManager] 恢复本地备份失败", { error: result.left }, "use-backup-manager")
				}
			} catch (err) {
				toast.error("恢复失败")
				logError("[BackupManager] 恢复本地备份异常", { error: err }, "use-backup-manager")
			} finally {
				setLoading(false)
			}
		},
		[loadStats],
	)

	// ============================================================================
	// 自动备份
	// ============================================================================

	const toggleAutoBackup = useCallback((enabled: boolean) => {
		setAutoBackupEnabledState(enabled)
		setAutoBackupEnabled(enabled)

		if (enabled) {
			autoBackupManager.start()
			toast.success("自动备份已启用")
		} else {
			autoBackupManager.stop()
			toast.info("自动备份已禁用")
		}
	}, [])

	// ============================================================================
	// 清除数据
	// ============================================================================

	const clearAll = useCallback(async () => {
		setLoading(true)
		try {
			const result = await clearAllData()()
			if (result._tag === "Right") {
				toast.success("所有数据已清除")
				await loadStats()
				setTimeout(() => {
					window.location.reload()
				}, 1500)
			} else {
				toast.error(result.left.message)
				logError("[BackupManager] 清除所有数据失败", { error: result.left }, "use-backup-manager")
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "清除数据失败"
			toast.error(errorMessage)
			logError("[BackupManager] 清除所有数据异常", { error: err }, "use-backup-manager")
		} finally {
			setLoading(false)
		}
	}, [loadStats])

	const clearDatabase = useCallback(async () => {
		setLoading(true)
		try {
			const options: ClearDataOptions = {
				clearCookies: false,
				clearLocalStorage: false,
				clearSessionStorage: false,
			}
			const result = await clearAllData(options)()
			if (result._tag === "Right") {
				toast.success("数据库已清除")
				await loadStats()
			} else {
				toast.error(result.left.message)
				logError("[BackupManager] 清除数据库失败", { error: result.left }, "use-backup-manager")
			}
		} catch (err) {
			toast.error("清除失败")
			logError("[BackupManager] 清除数据库异常", { error: err }, "use-backup-manager")
		} finally {
			setLoading(false)
		}
	}, [loadStats])

	const clearSettings = useCallback(async () => {
		setLoading(true)
		try {
			const options: ClearDataOptions = {
				clearCookies: true,
				clearLocalStorage: true,
				clearSessionStorage: true,
			}
			const result = await clearAllData(options)()
			if (result._tag === "Right") {
				toast.success("设置已清除")
				await loadStats()
			} else {
				toast.error(result.left.message)
				logError("[BackupManager] 清除设置失败", { error: result.left }, "use-backup-manager")
			}
		} catch (err) {
			toast.error("清除失败")
			logError("[BackupManager] 清除设置异常", { error: err }, "use-backup-manager")
		} finally {
			setLoading(false)
		}
	}, [loadStats])

	// ============================================================================
	// 返回
	// ============================================================================

	return {
		autoBackupEnabled,
		clearAll,
		clearDatabase,
		clearSettings,
		exportJson,
		exportZip,
		loading,
		loadLocalBackups,
		loadStats,
		localBackups,
		restore,
		restoreLocal,
		stats,
		storageStats,
		toggleAutoBackup,
	}
}
