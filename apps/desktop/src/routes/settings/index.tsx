import { createFileRoute } from "@tanstack/react-router"
import { Settings } from "lucide-react"

export const Route = createFileRoute("/settings/")({
	component: SettingsIndex,
})

function SettingsIndex() {
	return (
		<div className="container max-w-4xl py-6">
			<div className="space-y-6">
				<div className="text-center space-y-4">
					<div className="flex justify-center">
						<Settings className="size-16 text-muted-foreground" />
					</div>
					<div>
						<h1 className="text-3xl font-bold">Settings</h1>
						<p className="text-muted-foreground mt-2">
							Select an option from the sidebar to configure the application
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
					<div className="p-4 border rounded-lg">
						<h3 className="font-semibold mb-2">Appearance</h3>
						<p className="text-sm text-muted-foreground">
							Customize themes, colors, and visual effects
						</p>
					</div>
					<div className="p-4 border rounded-lg">
						<h3 className="font-semibold mb-2">Editor</h3>
						<p className="text-sm text-muted-foreground">Configure editor behavior and shortcuts</p>
					</div>
					<div className="p-4 border rounded-lg">
						<h3 className="font-semibold mb-2">Data Management</h3>
						<p className="text-sm text-muted-foreground">Backup, restore, and clear data</p>
					</div>
					<div className="p-4 border rounded-lg">
						<h3 className="font-semibold mb-2">General</h3>
						<p className="text-sm text-muted-foreground">Language, auto-save, and basic settings</p>
					</div>
				</div>
			</div>
		</div>
	)
}
