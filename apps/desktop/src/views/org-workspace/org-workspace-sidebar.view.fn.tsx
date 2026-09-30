import {
	CalendarPlus,
	ChevronRight,
	Copy,
	FilePenLine,
	FilePlus2,
	FileText,
	Folder,
	FolderOpen,
	FolderPlus,
	Link2,
	MoreHorizontal,
	PanelLeftClose,
	RefreshCw,
	Search,
	Trash2,
} from "lucide-react"
import { memo, type ReactNode, useEffect, useMemo, useState } from "react"
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
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
	readonly tools: ReactNode
	readonly onCreateDiary: () => void
	readonly onHide: () => void
	readonly onShowEditor: () => void
}

type SidebarDialog = "create-document" | "create-directory" | "move-document" | "delete-document"

interface OrgTreeProps {
	readonly activePath?: string
	readonly collapsed: ReadonlySet<string>
	readonly entries: readonly OrgTreeEntryInterface[]
	readonly isBusy: boolean
	readonly onCopy: (value: string, label: string) => void
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

const OrgTree = ({
	activePath,
	collapsed,
	entries,
	isBusy,
	onCopy,
	onOpen,
	onToggle,
}: OrgTreeProps) => (
	<ul className="space-y-px">
		{entries.map((entry) => {
			if (entry.type === "directory") {
				const isCollapsed = collapsed.has(entry.relativePath)
				return (
					<li key={entry.relativePath}>
						<button
							type="button"
							className="flex h-[26px] w-full items-center gap-1 rounded px-1.5 text-left text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
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
							<div className="ml-4">
								<OrgTree
									activePath={activePath}
									collapsed={collapsed}
									entries={entry.children}
									isBusy={isBusy}
									onCopy={onCopy}
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
				<li key={entry.relativePath} className="group flex items-center">
					<button
						type="button"
						className={`relative flex h-[26px] min-w-0 flex-1 items-center gap-2 rounded px-2 text-left text-[13px] transition-colors duration-150 ${
							selected
								? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r before:bg-sidebar-primary"
								: "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
						}`}
						aria-current={selected ? "page" : undefined}
						disabled={isBusy}
						onClick={() => onOpen(entry)}
					>
						<FileText className="size-3.5 shrink-0" />
						<span className="truncate">{entry.name.replace(/\.org$/i, "")}</span>
					</button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								disabled={isBusy}
								aria-label={`Actions for ${entry.relativePath}`}
								className="flex size-6 shrink-0 items-center justify-center rounded opacity-0 text-muted-foreground hover:bg-sidebar-accent group-hover:opacity-100 focus:opacity-100"
							>
								<MoreHorizontal className="size-3.5" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem onClick={() => onOpen(entry)}>
								<FileText className="mr-2 size-4" />
								Open
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => onCopy(entry.relativePath, "Relative path copied")}>
								<Copy className="mr-2 size-4" />
								Copy relative path
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => onCopy(`[[file:${entry.relativePath}]]`, "Org file link copied")}
							>
								<Link2 className="mr-2 size-4" />
								Copy Org file link
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</li>
			)
		})}
	</ul>
)

export const OrgWorkspaceSidebar = memo(function OrgWorkspaceSidebar({
	controller,
	isBusy,
	tools,
	onCreateDiary,
	onHide,
	onShowEditor,
}: OrgWorkspaceSidebarProps) {
	const [collapsedDirectories, setCollapsedDirectories] = useState<ReadonlySet<string>>(new Set())
	const [treeSessionRoot, setTreeSessionRoot] = useState<string | null>(null)
	const [dialog, setDialog] = useState<SidebarDialog | null>(null)
	const [query, setQuery] = useState("")
	const [clipboardStatus, setClipboardStatus] = useState<string | null>(null)
	useEffect(() => {
		const rootPath = controller.workspace?.rootPath
		if (!rootPath) return
		try {
			const saved = JSON.parse(
				window.localStorage.getItem(`grain:org-tree:${rootPath}`) ?? "[]",
			) as unknown
			setCollapsedDirectories(
				new Set(
					Array.isArray(saved)
						? saved.filter((path): path is string => typeof path === "string")
						: [],
				),
			)
		} catch {
			setCollapsedDirectories(new Set())
		}
		setTreeSessionRoot(rootPath)
	}, [controller.workspace?.rootPath])
	useEffect(() => {
		const rootPath = controller.workspace?.rootPath
		if (!rootPath || treeSessionRoot !== rootPath) return
		try {
			window.localStorage.setItem(
				`grain:org-tree:${rootPath}`,
				JSON.stringify([...collapsedDirectories]),
			)
		} catch {
			// Tree expansion is disposable UI state.
		}
	}, [collapsedDirectories, controller.workspace?.rootPath, treeSessionRoot])
	useEffect(() => {
		if (!clipboardStatus) return
		const timer = window.setTimeout(() => setClipboardStatus(null), 2200)
		return () => window.clearTimeout(timer)
	}, [clipboardStatus])
	const copyToClipboard = async (value: string, label: string) => {
		try {
			if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
			await navigator.clipboard.writeText(value)
			setClipboardStatus(label)
		} catch {
			setClipboardStatus("Could not access the clipboard")
		}
	}
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
			<aside className="flex h-full min-w-0 flex-col bg-sidebar">
				<div className="flex h-10 shrink-0 items-center gap-1 px-2">
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
					<Button
						variant="ghost"
						size="icon"
						aria-label="Hide sidebar"
						title="Hide sidebar"
						onClick={onHide}
					>
						<PanelLeftClose className="size-4" />
					</Button>
				</div>

				<div className="flex h-10 items-center px-2">
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

				{clipboardStatus && (
					<div
						role="status"
						className="mx-2 rounded bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground"
					>
						{clipboardStatus}
					</div>
				)}
				<div className="px-2 pb-1">
					<button
						type="button"
						disabled={isBusy}
						onClick={onCreateDiary}
						className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-40"
						title="Create or open diary/YYYY-MM-DD.org"
					>
						<CalendarPlus className="size-4 text-muted-foreground" />
						<span>New diary</span>
						<span className="ml-auto text-[10px] font-normal text-muted-foreground">Today</span>
					</button>
				</div>
				<div className="flex h-8 shrink-0 items-center gap-0.5 px-2">
					<span className="min-w-0 flex-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						Files
					</span>
					<Button
						variant="ghost"
						size="icon"
						title="New note"
						aria-label="New Org document"
						disabled={isBusy}
						onClick={() => setDialog("create-document")}
					>
						<FilePlus2 className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title="New folder"
						aria-label="New directory"
						disabled={isBusy}
						onClick={() => setDialog("create-directory")}
					>
						<FolderPlus className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title="Refresh"
						aria-label="Refresh workspace"
						disabled={isBusy}
						onClick={() => void controller.refreshWorkspace()}
					>
						<RefreshCw className="size-3.5" />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								title="Current note actions"
								aria-label="Document actions"
								disabled={!controller.activeDocument || isBusy}
							>
								<MoreHorizontal className="size-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setDialog("move-document")}>
								<FilePenLine className="mr-2 size-4" />
								Move or rename
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => setDialog("delete-document")}
							>
								<Trash2 className="mr-2 size-4" />
								Delete note
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="min-h-0 flex-1 overflow-auto px-1.5 pb-2">
					{workspaceTree.length > 0 ? (
						<OrgTree
							activePath={controller.activeDocument?.relativePath}
							collapsed={query.trim() ? new Set<string>() : collapsedDirectories}
							entries={workspaceTree}
							isBusy={isBusy}
							onCopy={(value, label) => void copyToClipboard(value, label)}
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
			</aside>

			<OrgInputDialog
				open={dialog === "create-document"}
				title="New note"
				description="Create a standard .org file in this workspace."
				inputLabel="Relative path"
				defaultValue="untitled.org"
				confirmLabel="Create"
				onOpenChange={(open) => setDialog(open ? "create-document" : null)}
				onSubmit={(path) => void controller.createDocument(path)}
			/>
			<OrgInputDialog
				open={dialog === "create-directory"}
				title="New folder"
				description="Create a folder in this workspace."
				inputLabel="Relative path"
				defaultValue="notes"
				confirmLabel="Create"
				onOpenChange={(open) => setDialog(open ? "create-directory" : null)}
				onSubmit={(path) => void controller.createDirectory(path)}
			/>
			<OrgInputDialog
				open={dialog === "move-document"}
				title="Move or rename note"
				description="Enter the new path relative to this workspace."
				inputLabel="New relative path"
				defaultValue={controller.activeDocument?.relativePath ?? ""}
				confirmLabel="Move"
				onOpenChange={(open) => setDialog(open ? "move-document" : null)}
				onSubmit={(path) => {
					if (path !== controller.activeDocument?.relativePath)
						void controller.moveActiveDocument(path)
				}}
			/>
			<OrgConfirmDialog
				open={dialog === "delete-document"}
				title="Delete note?"
				description={`Delete ${controller.activeDocument?.relativePath ?? "this note"}? This cannot be undone.`}
				confirmLabel="Delete"
				destructive
				onOpenChange={(open) => setDialog(open ? "delete-document" : null)}
				onConfirm={() => void controller.deleteActiveDocument()}
			/>
		</>
	)
})
