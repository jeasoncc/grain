/**
 * Data Management Settings Route
 *
 * 使用 BackupManagerContainer 组件进行数据管理
 */

import { createFileRoute } from "@tanstack/react-router"
import { BackupManagerContainer } from "@/views/backup-manager/backup-manager.container.fn"

export const Route = createFileRoute("/settings/data")({
	component: DataSettingsPage,
})

function DataSettingsPage() {
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
					<BackupManagerContainer />
				</div>
			</div>
		</div>
	)
}
