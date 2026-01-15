/**
 * @file backup-manager.container.fn.tsx
 * @description 备份管理容器组件
 *
 * 符合架构规范：
 * - views/ 只能依赖 hooks/, types/
 * - 通过 hook 封装所有业务逻辑
 * - 容器组件负责确认对话框和事件编排
 */

import { memo, useCallback } from "react"
import { useBackupManager } from "@/hooks/use-backup-manager"
import { useConfirm } from "@/views/ui/confirm"
import { BackupManagerView } from "./backup-manager.view.fn"

export const BackupManagerContainer = memo(function BackupManagerContainer() {
	const confirm = useConfirm()
	const backupManager = useBackupManager()

	// ============================================================================
	// 事件处理（带确认对话框）
	// ============================================================================

	const handleRestore = useCallback(async () => {
		const confirmed = await confirm({
			title: "恢复备份",
			description: "恢复备份将覆盖当前数据。此操作无法撤销。我们建议先导出当前数据。",
			confirmText: "确认恢复",
			cancelText: "取消",
		})

		if (confirmed) {
			await backupManager.restore()
		}
	}, [confirm, backupManager])

	const handleRestoreLocal = useCallback(
		async (timestamp: string) => {
			const confirmed = await confirm({
				title: "恢复本地备份",
				description: `确定要恢复 ${new Date(timestamp).toLocaleString()} 的备份吗？`,
				confirmText: "确认恢复",
				cancelText: "取消",
			})

			if (confirmed) {
				await backupManager.restoreLocal(timestamp)
			}
		},
		[confirm, backupManager],
	)

	const handleClearAllData = useCallback(async () => {
		const confirmed = await confirm({
			title: "清除所有数据",
			description:
				"这将永久删除所有数据，包括：\n• 所有项目、章节和场景（IndexedDB）\n• 应用设置和偏好（localStorage）\n• 会话数据（sessionStorage）\n• 浏览器 cookies\n• 应用缓存\n\n此操作无法撤销！我们建议先导出备份。",
			confirmText: "确认清除",
			cancelText: "取消",
		})

		if (confirmed) {
			await backupManager.clearAll()
		}
	}, [confirm, backupManager])

	const handleClearDatabase = useCallback(async () => {
		const confirmed = await confirm({
			title: "仅清除数据库",
			description: "这将清除所有项目、章节和场景，但保留应用设置。",
			confirmText: "确认清除",
			cancelText: "取消",
		})

		if (confirmed) {
			await backupManager.clearDatabase()
		}
	}, [confirm, backupManager])

	const handleClearSettings = useCallback(async () => {
		const confirmed = await confirm({
			title: "仅清除设置",
			description: "这将清除应用设置和偏好，但保留项目数据。",
			confirmText: "确认清除",
			cancelText: "取消",
		})

		if (confirmed) {
			await backupManager.clearSettings()
		}
	}, [confirm, backupManager])

	// ============================================================================
	// 渲染
	// ============================================================================

	return (
		<BackupManagerView
			stats={backupManager.stats}
			storageStats={backupManager.storageStats}
			loading={backupManager.loading}
			autoBackupEnabled={backupManager.autoBackupEnabled}
			localBackups={backupManager.localBackups}
			onExportJson={backupManager.exportJson}
			onExportZip={backupManager.exportZip}
			onRestore={handleRestore}
			onToggleAutoBackup={backupManager.toggleAutoBackup}
			onRestoreLocal={handleRestoreLocal}
			onClearAllData={handleClearAllData}
			onClearDatabase={handleClearDatabase}
			onClearSettings={handleClearSettings}
		/>
	)
})

BackupManagerContainer.displayName = "BackupManagerContainer"
