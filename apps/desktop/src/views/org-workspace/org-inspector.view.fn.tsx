import { FileKey2, Link2, ListTree, Search, X } from "lucide-react"
import { memo, useEffect, useMemo, useState } from "react"
import type { OrgBacklink } from "@/flows/org-workspace"
import { useOrgBacklinks } from "@/hooks/use-org-backlinks"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { parseOrgIndexHeadings } from "@/pipes/org/org-derived-index.pipe"
import { Button } from "@/views/ui/button"

type InspectorTab = "outline" | "properties" | "backlinks"

const sourceName = (backlink: OrgBacklink) =>
	backlink.sourceHeading ??
	backlink.sourceTitle ??
	backlink.sourceRelativePath.split("/").at(-1) ??
	"Untitled"

export const parseOrgInspectorProperties = (
	source: string,
): readonly { readonly key: string; readonly value: string }[] => {
	const rows: { key: string; value: string }[] = []
	let inPropertyDrawer = false
	for (const line of source.split(/\r\n|\n|\r/)) {
		const directive = line.match(/^#\+([A-Za-z0-9_-]+):\s*(.*)$/)
		if (directive?.[1] && directive[2] !== undefined) {
			rows.push({ key: directive[1].toUpperCase(), value: directive[2] })
			continue
		}
		if (/^\s*:PROPERTIES:\s*$/i.test(line)) {
			inPropertyDrawer = true
			continue
		}
		if (/^\s*:END:\s*$/i.test(line)) {
			inPropertyDrawer = false
			continue
		}
		if (!inPropertyDrawer) continue
		const property = line.match(/^\s*:([A-Za-z0-9_@#%_-]+):\s*(.*?)\s*$/)
		if (property?.[1] && property[2] !== undefined) {
			rows.push({ key: property[1].toUpperCase(), value: property[2] })
		}
	}
	return rows
}

export const OrgInspector = memo(function OrgInspector({
	controller,
	onClose,
	active = true,
}: {
	readonly controller: OrgWorkspaceController
	readonly onClose: () => void
	readonly active?: boolean
}) {
	const [tab, setTab] = useState<InspectorTab>("outline")
	const [outlineQuery, setOutlineQuery] = useState("")
	const { backlinks, error: backlinkError, isLoading } = useOrgBacklinks(controller, active && tab === "backlinks")
	const activeDocument = controller.activeDocument
	const activePath = activeDocument?.relativePath
	const headings = useMemo(
		() => active && tab === "outline" && activePath
			? parseOrgIndexHeadings(activePath, controller.content)
			: [],
		[active, tab, activePath, controller.content],
	)
	const properties = useMemo(
		() => active && tab === "properties" && activePath
			? parseOrgInspectorProperties(controller.content)
			: [],
		[active, tab, activePath, controller.content],
	)
	const visibleHeadings = useMemo(() => {
		const query = outlineQuery.trim().toLocaleLowerCase()
		if (!query) return headings
		const visible = new Set<number>()
		headings.forEach((heading, index) => {
			if (!`${heading.todoKeyword ?? ""} ${heading.title}`.toLocaleLowerCase().includes(query))
				return
			visible.add(index)
			let parentLevel = heading.level
			for (let candidate = index - 1; candidate >= 0 && parentLevel > 1; candidate -= 1) {
				if (headings[candidate].level < parentLevel) {
					visible.add(candidate)
					parentLevel = headings[candidate].level
				}
			}
		})
		return headings.filter((_, index) => visible.has(index))
	}, [headings, outlineQuery])

	useEffect(() => {
		setOutlineQuery("")
	}, [activeDocument?.relativePath])


	return (
		<aside className="flex h-full min-w-0 flex-col bg-sidebar" aria-label="Note inspector">
			<div className="flex h-10 shrink-0 items-center px-1.5">
				<div className="flex min-w-0 flex-1 items-center gap-0.5">
					{(
						[
							["outline", ListTree, "Outline"],
							["properties", FileKey2, "Properties"],
							["backlinks", Link2, "Backlinks"],
						] as const
					).map(([value, Icon, label]) => (
						<button
							key={value}
							type="button"
							title={label}
							aria-label={label}
							aria-pressed={tab === value}
							onClick={() => setTab(value)}
							className={`flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${tab === value ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"}`}
						>
							<Icon className="size-4" />
						</button>
					))}
					<h2 className="min-w-0 truncate pl-1 text-xs font-medium text-muted-foreground">
						{tab === "outline" ? "Outline" : tab === "properties" ? "Properties" : "Backlinks"}
					</h2>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="size-8 shrink-0"
					aria-label="Close inspector"
					title="Close inspector"
					onClick={onClose}
				>
					<X className="size-4" />
				</Button>
			</div>

			{tab === "outline" && activeDocument && (
				<label className="mx-2 mt-2 flex h-8 min-w-0 shrink-0 items-center gap-2 rounded-md border border-transparent bg-background/60 px-2 text-muted-foreground focus-within:border-ring/40 focus-within:bg-background">
					<Search className="size-3.5 shrink-0" />
					<input
						value={outlineQuery}
						onChange={(event) => setOutlineQuery(event.target.value)}
						placeholder="Filter outline…"
						aria-label="Filter outline as sparse tree"
						className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
					/>
					{outlineQuery && <span className="text-[10px]">{visibleHeadings.length}</span>}
				</label>
			)}
			<div className="min-h-0 min-w-0 flex-1 overflow-auto p-2">
				{!activeDocument ? (
					<p className="px-2 py-3 text-xs text-muted-foreground">Open a note to inspect it.</p>
				) : tab === "outline" ? (
					visibleHeadings.length > 0 ? (
						<ul className="space-y-px">
							{visibleHeadings.map((heading) => (
								<li key={`${heading.line}:${heading.title}`}>
									<button
										type="button"
										className="flex min-h-8 min-w-0 w-full items-center rounded-md pr-2 text-left text-xs text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
										style={{ paddingLeft: `${Math.min(heading.level, 6) * 8}px` }}
										title={heading.title}
										onClick={() =>
											void controller.openDocumentAt(activeDocument.relativePath, heading.line)
										}
									>
										<span className="truncate">
											{heading.todoKeyword ? `${heading.todoKeyword} ` : ""}
											{heading.title}
										</span>
									</button>
								</li>
							))}
						</ul>
					) : (
						<p className="px-2 py-3 text-xs text-muted-foreground">
							{outlineQuery ? "No matching headings." : "No headings in this note."}
						</p>
					)
				) : tab === "properties" ? (
					properties.length > 0 ? (
						<dl className="space-y-3 px-2 py-1">
							{properties.map((property, index) => (
								<div key={`${property.key}:${index}`} className="min-w-0">
									<dt className="break-words text-[11px] font-medium text-muted-foreground">
										{property.key}
									</dt>
									<dd className="mt-0.5 break-words text-xs text-foreground">
										{property.value || "—"}
									</dd>
								</div>
							))}
						</dl>
					) : (
						<p className="px-2 py-3 text-xs text-muted-foreground">No file properties found.</p>
					)
				) : backlinkError ? (
					<p role="alert" className="px-2 py-3 text-xs text-destructive">
						{backlinkError}
					</p>
				) : isLoading ? (
					<p className="px-2 py-3 text-xs text-muted-foreground">Loading backlinks…</p>
				) : backlinks.length > 0 ? (
					<ul className="space-y-1">
						{backlinks.map((backlink) => (
							<li key={`${backlink.sourceRelativePath}:${backlink.line}:${backlink.column}`}>
								<button
									type="button"
									className="min-w-0 w-full rounded-md px-2 py-2 text-left hover:bg-sidebar-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
									title={`${backlink.sourceRelativePath}:${backlink.line}`}
									onClick={() =>
										void controller.openDocumentAt(backlink.sourceRelativePath, backlink.line)
									}
								>
									<span className="block truncate text-xs font-medium">{sourceName(backlink)}</span>
									<span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
										{backlink.sourceRelativePath}:{backlink.line}
									</span>
								</button>
							</li>
						))}
					</ul>
				) : (
					<p className="px-2 py-3 text-xs text-muted-foreground">No backlinks to this note.</p>
				)}
			</div>
		</aside>
	)
})
