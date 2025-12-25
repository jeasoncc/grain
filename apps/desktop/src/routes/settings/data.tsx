/**
 * Data Management Settings Route
 *
 * 编排层：连接数据和展示组件
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BackupManager } from "@/components/blocks/backup-manager";
import { useConfirm } from "@/components/ui/confirm";
import {
	autoBackupManager,
	exportBackupJson,
	exportBackupZip,
	getDatabaseStats,
	getLocalBackups,
	restoreBackup,
	restoreLocalBackup,
} from "@/db/backup.db.fn";
import { clearAllData, getStorageStats } from "@/db/clear-data.db.fn";
import logger from "@/log";
import type { DatabaseStats, LocalBackupRecord } from "@/types/backup";
import type { ClearDataOptions, StorageStats } from "@/types/storage";

export const Route = createFileRoute("/settings/data")({
	component: DataSettingsPage,
});

function DataSettingsPage() {
	// ============================================================================
	// 状态
	// ============================================================================

	const [stats, setStats] = useState<DatabaseStats | null>(null);
	const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
	const [loading, setLoading] = useState(false);
	const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
	const [localBackups, setLocalBackups] = useState<LocalBackupRecord[]>([]);

	const confirm = useConfirm();

	// ============================================================================
	// 数据加载
	// ============================================================================

	const loadStats = useCallback(async () => {
		try {
			const statsResult = await getDatabaseStats()();
			if (statsResult._tag === "Right") {
				setStats(statsResult.right);
			}

			const storageResult = await getStorageStats()();
			if (storageResult._tag === "Right") {
				setStorageStats(storageResult.right);
			}
		} catch (error) {
			logger.error("[Settings] 加载统计信息失败:", error);
		}
	}, []);

	const loadLocalBackups = useCallback(() => {
		const backups = getLocalBackups();
		setLocalBackups(backups);
	}, []);

	useEffect(() => {
		loadStats();
		loadLocalBackups();

		const enabled = localStorage.getItem("auto-backup-enabled") === "true";
		setAutoBackupEnabled(enabled);
		if (enabled) {
			autoBackupManager.start();
		}
	}, [loadStats, loadLocalBackups]);

	// ============================================================================
	// 事件处理
	// ============================================================================

	const handleExportJson = useCallback(async () => {
		setLoading(true);
		try {
			const result = await exportBackupJson()();
			if (result._tag === "Right") {
				toast.success("备份导出成功");
			} else {
				toast.error(result.left.message);
			}
		} catch (error) {
			toast.error("导出失败");
			logger.error("[Settings] 导出 JSON 失败:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	const handleExportZip = useCallback(async () => {
		setLoading(true);
		try {
			const result = await exportBackupZip()();
			if (result._tag === "Right") {
				toast.success("压缩备份导出成功");
			} else {
				toast.error(result.left.message);
			}
		} catch (error) {
			toast.error("导出失败");
			logger.error("[Settings] 导出 ZIP 失败:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	const handleRestore = useCallback(async () => {
		const confirmed = await confirm({
			title: "恢复备份",
			description:
				"恢复备份将覆盖当前数据。此操作无法撤销。我们建议先导出当前数据。",
			confirmText: "确认恢复",
			cancelText: "取消",
		});

		if (!confirmed) return;

		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json,.zip";
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			setLoading(true);
			try {
				const result = await restoreBackup(file)();
				if (result._tag === "Right") {
					toast.success("备份恢复成功");
					await loadStats();
					window.location.reload();
				} else {
					toast.error(result.left.message);
				}
			} catch (error) {
				toast.error("恢复失败");
				logger.error("[Settings] 恢复备份失败:", error);
			} finally {
				setLoading(false);
			}
		};
		input.click();
	}, [confirm, loadStats]);

	const handleToggleAutoBackup = useCallback((enabled: boolean) => {
		setAutoBackupEnabled(enabled);
		localStorage.setItem("auto-backup-enabled", enabled.toString());

		if (enabled) {
			autoBackupManager.start();
			toast.success("自动备份已启用");
		} else {
			autoBackupManager.stop();
			toast.info("自动备份已禁用");
		}
	}, []);

	const handleRestoreLocal = useCallback(
		async (timestamp: string) => {
			const confirmed = await confirm({
				title: "恢复本地备份",
				description: `确定要恢复 ${new Date(timestamp).toLocaleString()} 的备份吗？`,
				confirmText: "确认恢复",
				cancelText: "取消",
			});

			if (!confirmed) return;

			setLoading(true);
			try {
				const result = await restoreLocalBackup(timestamp)();
				if (result._tag === "Right") {
					toast.success("备份恢复成功");
					await loadStats();
					window.location.reload();
				} else {
					toast.error(result.left.message);
				}
			} catch (error) {
				toast.error("恢复失败");
				logger.error("[Settings] 恢复本地备份失败:", error);
			} finally {
				setLoading(false);
			}
		},
		[confirm, loadStats],
	);

	const handleClearAllData = useCallback(async () => {
		const confirmed = await confirm({
			title: "清除所有数据",
			description:
				"这将永久删除所有数据，包括：\n• 所有项目、章节和场景（IndexedDB）\n• 应用设置和偏好（localStorage）\n• 会话数据（sessionStorage）\n• 浏览器 cookies\n• 应用缓存\n\n此操作无法撤销！我们建议先导出备份。",
			confirmText: "确认清除",
			cancelText: "取消",
		});

		if (!confirmed) return;

		setLoading(true);
		try {
			const result = await clearAllData()();
			if (result._tag === "Right") {
				toast.success("所有数据已清除");
				await loadStats();
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			} else {
				toast.error(result.left.message);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "清除数据失败";
			toast.error(errorMessage);
			logger.error("[Settings] 清除所有数据失败:", error);
		} finally {
			setLoading(false);
		}
	}, [confirm, loadStats]);

	const handleClearDatabase = useCallback(async () => {
		const confirmed = await confirm({
			title: "仅清除数据库",
			description: "这将清除所有项目、章节和场景，但保留应用设置。",
			confirmText: "确认清除",
			cancelText: "取消",
		});

		if (!confirmed) return;

		setLoading(true);
		try {
			const options: ClearDataOptions = {
				clearIndexedDB: true,
				clearLocalStorage: false,
				clearSessionStorage: false,
				clearCookies: false,
			};
			const result = await clearAllData(options)();
			if (result._tag === "Right") {
				toast.success("数据库已清除");
				await loadStats();
			} else {
				toast.error(result.left.message);
			}
		} catch (error) {
			toast.error("清除失败");
			logger.error("[Settings] 清除数据库失败:", error);
		} finally {
			setLoading(false);
		}
	}, [confirm, loadStats]);

	const handleClearSettings = useCallback(async () => {
		const confirmed = await confirm({
			title: "仅清除设置",
			description: "这将清除应用设置和偏好，但保留项目数据。",
			confirmText: "确认清除",
			cancelText: "取消",
		});

		if (!confirmed) return;

		setLoading(true);
		try {
			const options: ClearDataOptions = {
				clearIndexedDB: false,
				clearLocalStorage: true,
				clearSessionStorage: true,
				clearCookies: true,
			};
			const result = await clearAllData(options)();
			if (result._tag === "Right") {
				toast.success("设置已清除");
				await loadStats();
			} else {
				toast.error(result.left.message);
			}
		} catch (error) {
			toast.error("清除失败");
			logger.error("[Settings] 清除设置失败:", error);
		} finally {
			setLoading(false);
		}
	}, [confirm, loadStats]);

	// ============================================================================
	// 渲染
	// ============================================================================

	return (
		<div className="space-y-10 max-w-3xl">
			<div>
				<h3 className="text-lg font-medium">Data Management</h3>
				<p className="text-sm text-muted-foreground">
					Backup, restore, and manage your application data.
				</p>
			</div>

			<div className="space-y-4">
				<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Backup & Restore
				</h4>
				<div className="pt-2">
					<BackupManager
						stats={stats}
						storageStats={storageStats}
						loading={loading}
						autoBackupEnabled={autoBackupEnabled}
						localBackups={localBackups}
						onExportJson={handleExportJson}
						onExportZip={handleExportZip}
						onRestore={handleRestore}
						onToggleAutoBackup={handleToggleAutoBackup}
						onRestoreLocal={handleRestoreLocal}
						onClearAllData={handleClearAllData}
						onClearDatabase={handleClearDatabase}
						onClearSettings={handleClearSettings}
					/>
				</div>
			</div>
		</div>
	);
}
