import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/settings/export")({ component: ExportSettingsPage })

function ExportSettingsPage() {
	return <div className="space-y-4 max-w-3xl">
		<h3 className="text-lg font-medium">Org export</h3>
		<p>Export the current Org source from its document tools. Each export uses the native save grant; there is no ambient historical export directory or legacy rich-text writer.</p>
		<Link to="/" className="underline">Open Org workspace</Link>
	</div>
}
