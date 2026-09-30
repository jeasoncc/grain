import { Link } from "@tanstack/react-router"
import {
	CalendarDays,
	ChevronRight,
	FilePenLine,
	FilePlus2,
	FileText,
	Folder,
	FolderOpen,
	FolderPlus,
	MoreHorizontal,
	NotebookPen,
	PanelLeftClose,
	RefreshCw,
	Search,
	Settings,
	Trash2,
} from "lucide-react"
import { memo, type ReactNode, useMemo, useState } from "react"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { buildOrgWorkspaceTree } from "@/pipes/org"
import type { OrgDocumentEntryInterface, OrgTreeEntryInterface } from "@/types/org"
import { Button } from "@/views/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"
import { OrgConfirmDialog, OrgInputDialog } from "./org-action-dialog.view.fn"

export interface OrgWorkspaceSidebarProps {
	readonly activeView: "agenda" | "editor"
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
	readonly tools: ReactNode
	readonly onCapture: () => void
	readonly onCreateDiary: () => void
	readonly onHide: () => void
	readonly onQuickOpen: () => void
	readonly onShowAgenda: () => void
	readonly onShowEditor: () => void
}

type SidebarDialog = "create-document" | "create-directory" | "move-document" | "delete-document"

interface OrgTreeProps {
	readonly activePath?: string
	readonly collapsed: ReadonlySet<string>
	readonly entries: readonly OrgTreeEntryInterface[]
	readonly isBusy: boolean
	readonly onOpen: (document: OrgDocumentEntryInterface) => void
	readonly onToggle: (path: string) => void
}

const filterTree = (
	entries: readonly OrgTreeEntryInterface[],
	query: string,
): readonly OrgTreeEntryInterface[] => {
	const normalized = query.trim().toLocaleLowerCase()
	if (!normalized) return entries
	const filtered: OrgTreeEntryInterface[] = []
	for (const entry of entries) {
		if (entry.type === "document") {
			if (entry.relativePath.toLocaleLowerCase().includes(normalized)) filtered.push(entry)
			continue
		}
		const children = filterTree(entry.children, normalized)
		if (entry.relativePath.toLocaleLowerCase().includes(normalized) || children.length > 0) {
			filtered.push({ ...entry, children })
		}
	}
	return filtered
}

const workspaceName = (rootPath: string) => {
	const parts = rootPath.replaceAll("\\", "/").split("/").filter(Boolean)
	return parts.at(-1) ?? "Workspace"
}

const OrgTree = ({ activePath, collapsed, entries, isBusy, onOpen, onToggle }: OrgTreeProps) => (
	<ul className="space-y-px">
		{entries.map((entry) => {
			if (entry.type === "directory") {
				const isCollapsed = collapsed.has(entry.relativePath)
				return (
					<li key={entry.relativePath}>
						<button
							type="button"
							className="flex h-7 w-full items-center gap-1 rounded-md px-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
							aria-expanded={!isCollapsed}
							onClick={() => onToggle(entry.relativePath)}
						>
							<ChevronRight
								className={`size-3 shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
							/>
							{isCollapsed ? (
								<Folder className="size-3.5 shrink-0" />
							) : (
								<FolderOpen className="size-3.5 shrink-0" />
							)}
							<span className="truncate">{entry.name}</span>
						</button>
						{!isCollapsed && entry.children.length > 0 && (
							<div className="ml-2.5 border-l border-border/60 pl-1">
								<OrgTree
									activePath={activePath}
									collapsed={collapsed}
									entries={entry.children}
									isBusy={isBusy}
									onOpen={onOpen}
									onToggle={onToggle}
								/>
							</div>
						)}
					</li>
				)
			}
			const selected = activePath === entry.relativePath
			return (
				<li key={entry.relativePath}>
					<button
						type="button"
						className={`flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors ${
							selected
								? "bg-accent font-medium text-accent-foreground"
								: "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
						}`}
						aria-current={selected ? "page" : undefined}
						disabled={isBusy}
						onClick={() => onOpen(entry)}
					>
						<FileText className="size-3.5 shrink-0" />
						<span className="truncate">{entry.name.replace(/\.org$/i, "")}</span>
					</button>
				</li>
			)
		})}
	</ul>
)

export const OrgWorkspaceSidebar = memo(function OrgWorkspaceSidebar({
	activeView,
	controller,
	isBusy,
	tools,
	onCapture,
	onCreateDiary,
	onHide,
	onQuickOpen,
	onShowAgenda,
	onShowEditor,
}: OrgWorkspaceSidebarProps) {
	const [collapsedDirectories, setCollapsedDirectories] = useState<ReadonlySet<string>>(new Set())
	const [dialog, setDialog] = useState<SidebarDialog | null>(null)
	const [query, setQuery] = useState("")
	const workspaceTree = useMemo(() => {
		if (!controller.workspace) return []
		return filterTree(
			buildOrgWorkspaceTree(controller.workspace.directories, controller.workspace.documents),
			query,
		)
	}, [controller.workspace, query])
	const toggleDirectory = (path: string) => {
		setCollapsedDirectories((current) => {
			const next = new Set(current)
			if (next.has(path)) next.delete(path)
			else next.add(path)
			return next
		})
	}

	return (
		<>
			<aside className="flex h-full min-w-0 flex-col bg-muted/45">
				<div className="flex h-12 shrink-0 items-center gap-1 px-3">
					<button
						type="button"
						className="min-w-0 flex-1 truncate text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
						title={controller.workspace?.rootPath}
						disabled={isBusy}
						onClick={() => void controller.selectWorkspace()}
					>
						{controller.workspace ? workspaceName(controller.workspace.rootPath) : "Grain"}
					</button>
					{tools}
					<Button variant="ghost" size="icon" aria-label="Hide sidebar" title="Hide sidebar" onClick={onHide}>
						<PanelLeftClose className="size-4" />
					</Button>
				</div>

				<div className="px-2 pb-2">
					<label className="flex h-8 items-center gap-2 rounded-md border border-transparent bg-background/70 px-2 text-muted-foreground focus-within:border-ring/40 focus-within:bg-background">
						<Search className="size-3.5" />
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Filter files…"
							aria-label="Filter workspace files"
							className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
						/>
					</label>
				</div>

				<div className="flex h-9 shrink-0 items-center gap-0.5 px-2">
					<span className="min-w-0 flex-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						Files
					</span>
					<Button variant="ghost" size="icon" title="New note" aria-label="New Org document" disabled={isBusy} onClick={() => setDialog("create-document")}>
						<FilePlus2 className="size-3.5" />
					</Button>
					<Button variant="ghost" size="icon" title="New folder" aria-label="New directory" disabled={isBusy} onClick={() => setDialog("create-directory")}>
						<FolderPlus className="size-3.5" />
					</Button>
					<Button variant="ghost" size="icon" title="Refresh" aria-label="Refresh workspace" disabled={isBusy} onClick={() => void controller.refreshWorkspace()}>
						<RefreshCw className="size-3.5" />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" title="Current note actions" aria-label="Document actions" disabled={!controller.activeDocument || isBusy}>
								<MoreHorizontal className="size-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setDialog("move-document")}>
								<FilePenLine className="mr-2 size-4" />Move or rename
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDialog("delete-document")}>
								<Trash2 className="mr-2 size-4" />Delete note
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
					{workspaceTree.length > 0 ? (
						<OrgTree
							activePath={controller.activeDocument?.relativePath}
							collapsed={query.trim() ? new Set<string>() : collapsedDirectories}
							entries={workspaceTree}
							isBusy={isBusy}
							onOpen={(document) => {
								onShowEditor()
								void controller.openDocument(document)
							}}
							onToggle={toggleDirectory}
						/>
					) : (
						<p className="px-2 py-3 text-xs text-muted-foreground">
							{query ? "No matching notes." : "No notes yet. Create your first note."}
						</p>
					)}
				</div>

				<nav className="shrink-0 border-t p-2" aria-label="Workspace navigation">
					<button type="button" className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground" onClick={onQuickOpen}>
						<Search className="size-4" />Quick open <kbd className="ml-auto text-[10px] opacity-70">Ctrl O</kbd>
					</button>
					<button type="button" className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs ${activeView === "agenda" ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"}`} onClick={onShowAgenda}>
						<CalendarDays className="size-4" />Agenda
					</button>
					<button type="button" disabled={isBusy} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50" onClick={onCapture}>
						<NotebookPen className="size-4" />Quick capture
					</button>
					<button type="button" disabled={isBusy} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50" onClick={onCreateDiary}>
						<FilePenLine className="size-4" />Today’s note
					</button>
					<Link to="/settings" className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground">
						<Settings className="size-4" />Settings
					</Link>
				</nav>
			</aside>

			<OrgInputDialog open={dialog === "create-document"} title="New note" description="Create a standard .org file in this workspace." inputLabel="Relative path" defaultValue="untitled.org" confirmLabel="Create" onOpenChange={(open) => setDialog(open ? "create-document" : null)} onSubmit={(path) => void controller.createDocument(path)} />
			<OrgInputDialog open={dialog === "create-directory"} title="New folder" description="Create a folder in this workspace." inputLabel="Relative path" defaultValue="notes" confirmLabel="Create" onOpenChange={(open) => setDialog(open ? "create-directory" : null)} onSubmit={(path) => void controller.createDirectory(path)} />
			<OrgInputDialog open={dialog === "move-document"} title="Move or rename note" description="Enter the new path relative to this workspace." inputLabel="New relative path" defaultValue={controller.activeDocument?.relativePath ?? ""} confirmLabel="Move" onOpenChange={(open) => setDialog(open ? "move-document" : null)} onSubmit={(path) => {
				if (path !== controller.activeDocument?.relativePath) void controller.moveActiveDocument(path)
			}} />
			<OrgConfirmDialog open={dialog === "delete-document"} title="Delete note?" description={`Delete ${controller.activeDocument?.relativePath ?? "this note"}? This cannot be undone.`} confirmLabel="Delete" destructive onOpenChange={(open) => setDialog(open ? "delete-document" : null)} onConfirm={() => void controller.deleteActiveDocument()} />
		</>
	)
})
