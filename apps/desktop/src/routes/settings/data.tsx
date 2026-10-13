import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/settings/data")({ component: DataSettingsPage })

function DataSettingsPage() {
	return <div className="space-y-4 max-w-3xl">
		<h3 className="text-lg font-medium">Data and recovery</h3>
		<p>Org files are the source of truth. The Org index is disposable and can be rebuilt from Workspace tools.</p>
		<p>Historical SQLite is read-only. Desktop backup, restore, deletion and old editor settings are no longer available. Keep any original full-database archives outside Grain.</p>
		<p>Migration preserves the selected workspace graph and its selected-workspace/recoverable orphan bodies. Its recovery bundle does not include unrelated users, settings or tables.</p>
		<Link to="/history" className="underline">Read-only historical listing and preview</Link>
		<p>Open an Org destination to migrate, verify migration artifacts or run the selected-workspace recovery drill.</p>
		<Link to="/" className="underline">Open Org workspace</Link>
	</div>
}
