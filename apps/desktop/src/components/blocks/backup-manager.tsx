/**
 * 备份管理器组件
 */

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
	Archive,
	Clock,
	Database,
	Download,
	FileText,
	Loader2,
	Trash2,
	Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	autoBackupManager,
	type BackupData,
	exportBackup,
	exportBackupZip,
	getDatabaseStats,
	restoreBackup,
} from "@/services/backup";
import "dayjs/locale/zh-cn";
import { useConfirm } from "@/components/ui/confirm";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

export function BackupManager() {
	const [stats, setStats] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
	const [localBackups, setLocalBackups] = useState<
		Array<{ timestamp: string; data: BackupData }>
	>([]);
	const confirm = useConfirm();

	// 加载统计信息
	useEffect(() => {
		loadStats();
		loadLocalBackups();

		// 检查自动备份状态
		const enabled = localStorage.getItem("auto-backup-enabled") === "true";
		setAutoBackupEnabled(enabled);
		if (enabled) {
			autoBackupManager.start();
		}
		// biome-ignore lint/correctness/useExhaustiveDependencies: 仅在组件挂载时执行一次
	}, []);

	const loadStats = async () => {
		try {
			const data = await getDatabaseStats();
			setStats(data);
		} catch (error) {
			console.error("加载统计失败:", error);
		}
	};

	const loadLocalBackups = () => {
		const backups = autoBackupManager.getLocalBackups();
		setLocalBackups(backups);
	};

	// 导出备份（JSON）
	const handleExportJson = async () => {
		setLoading(true);
		try {
			await exportBackup();
			toast.success("备份已导出");
		} catch (error) {
			toast.error("导出失败");
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// 导出备份（ZIP）
	const handleExportZip = async () => {
		setLoading(true);
		try {
			await exportBackupZip();
			toast.success("压缩备份已导出");
		} catch (error) {
			toast.error("导出失败");
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// 恢复备份
	const handleRestore = async () => {
		const confirmed = await confirm({
			title: "恢复备份",
			description:
				"恢复备份将覆盖当前数据，此操作不可撤销。建议先导出当前数据作为备份。",
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
				await restoreBackup(file);
				toast.success("备份恢复成功");
				await loadStats();
				window.location.reload(); // 刷新页面
			} catch (error) {
				toast.error("恢复失败");
				console.error(error);
			} finally {
				setLoading(false);
			}
		};
		input.click();
	};

	// 切换自动备份
	const handleToggleAutoBackup = (enabled: boolean) => {
		setAutoBackupEnabled(enabled);
		localStorage.setItem("auto-backup-enabled", enabled.toString());

		if (enabled) {
			autoBackupManager.start();
			toast.success("自动备份已启用");
		} else {
			autoBackupManager.stop();
			toast.info("自动备份已禁用");
		}
	};

	// 恢复本地备份
	const handleRestoreLocal = async (timestamp: string) => {
		const confirmed = await confirm({
			title: "恢复本地备份",
			description: `确定要恢复 ${dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss")} 的备份吗？`,
			confirmText: "确认恢复",
			cancelText: "取消",
		});

		if (!confirmed) return;

		setLoading(true);
		try {
			await autoBackupManager.restoreLocalBackup(timestamp);
			toast.success("备份恢复成功");
			await loadStats();
			window.location.reload();
		} catch (error) {
			toast.error("恢复失败");
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* 数据统计 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Database className="size-5" />
						数据统计
					</CardTitle>
					<CardDescription>当前数据库的统计信息</CardDescription>
				</CardHeader>
				<CardContent>
					{stats ? (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">项目</p>
								<p className="text-2xl font-bold">{stats.projectCount}</p>
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">章节</p>
								<p className="text-2xl font-bold">{stats.chapterCount}</p>
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">场景</p>
								<p className="text-2xl font-bold">{stats.sceneCount}</p>
							</div>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">总字数</p>
								<p className="text-2xl font-bold">
									{stats.totalWords.toLocaleString()}
								</p>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					)}
				</CardContent>
			</Card>

			{/* 手动备份 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Archive className="size-5" />
						手动备份
					</CardTitle>
					<CardDescription>导出或恢复完整数据库备份</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-3">
						<Button onClick={handleExportJson} disabled={loading}>
							<Download className="size-4 mr-2" />
							导出 JSON
						</Button>
						<Button
							onClick={handleExportZip}
							disabled={loading}
							variant="outline"
						>
							<Archive className="size-4 mr-2" />
							导出 ZIP
						</Button>
						<Button
							onClick={handleRestore}
							disabled={loading}
							variant="outline"
						>
							<Upload className="size-4 mr-2" />
							恢复备份
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						建议定期导出备份文件，以防数据丢失。ZIP 格式包含完整的元数据信息。
					</p>
				</CardContent>
			</Card>

			{/* 自动备份 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="size-5" />
						自动备份
					</CardTitle>
					<CardDescription>
						每24小时自动创建本地备份（最多保留3个）
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<Label htmlFor="auto-backup" className="cursor-pointer">
							启用自动备份
						</Label>
						<Switch
							id="auto-backup"
							checked={autoBackupEnabled}
							onCheckedChange={handleToggleAutoBackup}
						/>
					</div>

					{localBackups.length > 0 && (
						<>
							<Separator />
							<div className="space-y-2">
								<p className="text-sm font-medium">本地备份记录</p>
								{localBackups.map((backup) => (
									<div
										key={backup.timestamp}
										className="flex items-center justify-between p-3 rounded-lg border bg-card"
									>
										<div className="flex items-center gap-3">
											<FileText className="size-4 text-muted-foreground" />
											<div>
												<p className="text-sm font-medium">
													{dayjs(backup.timestamp).format(
														"YYYY-MM-DD HH:mm:ss",
													)}
												</p>
												<p className="text-xs text-muted-foreground">
													{dayjs(backup.timestamp).fromNow()} ·{" "}
													{backup.data.metadata.projectCount} 个项目
												</p>
											</div>
										</div>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => handleRestoreLocal(backup.timestamp)}
											disabled={loading}
										>
											恢复
										</Button>
									</div>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* 危险操作 */}
			<Card className="border-destructive/50">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<Trash2 className="size-5" />
						危险操作
					</CardTitle>
					<CardDescription>这些操作不可撤销，请谨慎使用</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						onClick={async () => {
							const confirmed = await confirm({
								title: "清空所有数据",
								description:
									"此操作将永久删除所有项目、章节、场景等数据，且无法恢复！",
								confirmText: "确认清空",
								cancelText: "取消",
							});
							if (confirmed) {
								// 实现清空逻辑
								toast.error("功能暂未实现");
							}
						}}
						disabled={loading}
					>
						<Trash2 className="size-4 mr-2" />
						清空所有数据
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
