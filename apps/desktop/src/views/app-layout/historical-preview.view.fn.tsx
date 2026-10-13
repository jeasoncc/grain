import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useLegacyMigrationPreview, useLegacyMigrationSource } from "@/hooks/use-legacy-migration-source"

export default function HistoricalPreview() {
	const sources = useLegacyMigrationSource()
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const selected = sources.data?.find(({ id }) => id === selectedId)
	const preview = useLegacyMigrationPreview(selected?.id ?? null)
	return (
		<main className="h-full overflow-auto space-y-4 p-6" aria-label="Read-only historical SQLite">
			<header className="space-y-2">
				<h1 className="text-lg font-medium">Historical SQLite — read-only</h1>
				<p>No historical bodies, metadata, backups or settings can be changed here.</p>
				<p>For migration, artifact verification and selected-workspace recovery, open an Org destination and use its Legacy migration tools. The recovery bundle is not a whole-database backup.</p>
				<Link to="/" className="underline">Return to Org workspace</Link>
			</header>
			{sources.isLoading && <p role="status">Reading historical workspace metadata…</p>}
			{sources.error && <p role="alert">Historical source unavailable: {sources.error.message}</p>}
			{sources.isSuccess && !sources.data.length && <p role="status">No historical workspaces exist in this database.</p>}
			<ul aria-label="Historical workspaces" className="space-y-2">
				{sources.data?.map((workspace) => <li key={workspace.id}>
					<button type="button" aria-pressed={selectedId === workspace.id} className="underline" onClick={() => setSelectedId(workspace.id)}>{workspace.name} ({workspace.id})</button>
				</li>)}
			</ul>
			{selected && <section aria-label="Historical workspace preview" className="space-y-3">
				<h2>{selected.name} ({selected.id})</h2>
				<p>{selected.description}</p>
				{preview.isLoading && <p role="status">Reading an atomic historical graph and body snapshot…</p>}
				{preview.error && <p role="alert">Preview unavailable: {preview.error.message}</p>}
				{preview.data && <>
					<p>{preview.data.graph.nodes.length} node rows; {preview.data.contents.length} selected-workspace or orphan content rows.</p>
					<ul aria-label="Historical graph">{preview.data.graph.nodes.map((node) => <li key={node.id}>{node.title} ({node.id}) — parent: {node.parentId ?? "root"}; kind: {node.nodeType}</li>)}</ul>
					{preview.data.contents.map((content) => <details key={content.id}>
						<summary>Raw body {content.id} — node {content.nodeId}, version {content.version}</summary>
						<pre className="whitespace-pre-wrap break-words border p-3">{content.content}</pre>
					</details>)}
				</>}
			</section>}
		</main>
	)
}
