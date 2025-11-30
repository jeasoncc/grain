/**
 * 数据管理设置页面
 */
import { createFileRoute } from "@tanstack/react-router";
import { BackupManager } from "@/components/blocks/backup-manager";

export const Route = createFileRoute("/settings/data")({
	component: DataSettingsPage,
});

function DataSettingsPage() {
	return (
		<div className="container max-w-4xl py-6">
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">数据管理</h1>
					<p className="text-muted-foreground mt-1">
						备份、恢复和管理你的数据
					</p>
				</div>

				<BackupManager />
			</div>
		</div>
	);
}
