import {
	ChevronRight,
	FilePenLine,
	FilePlus2,
	FileText,
	Folder,
	FolderOpen,
	FolderPlus,
	MoreHorizontal,
	RefreshCw,
	Trash2,
} from "lucide-react"
import { memo, useState } from "react"
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

const OrgTree = ({ activePath, collapsed, entries, isBusy, onOpen, onToggle }: OrgTreeProps) => (
	<ul className="space-y-0.5">
		{entries.map((entry) => {
			if (entry.type === "directory") {
				const isCollapsed = collapsed.has(entry.relativePath)
				return (
					<li key={entry.relativePath}>
						<button
							type="button"
							className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-sm hover:bg-muted"
							aria-expanded={!isCollapsed}
							onClick={() => onToggle(entry.relativePath)}
						>
							<ChevronRight
								className={`size-3.5 shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
							/>
							{isCollapsed ? (
								<Folder className="size-4 shrink-0" />
							) : (
								<FolderOpen className="size-4 shrink-0" />
							)}
							<span className="truncate">{entry.name}</span>
						</button>
						{!isCollapsed && entry.children.length > 0 && (
							<div className="ml-3 border-l pl-1.5">
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
			return (
				<li key={entry.relativePath}>
					<button
						type="button"
						className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted ${
							activePath === entry.relativePath ? "bg-muted font-medium" : ""
						}`}
						aria-current={activePath === entry.relativePath ? "page" : undefined}
						disabled={isBusy}
						onClick={() => onOpen(entry)}
					>
						<FileText className="size-4 shrink-0" />
						<span className="truncate">{entry.name}</span>
					</button>
				</li>
			)
		})}
	</ul>
)

export const OrgWorkspaceSidebar = memo(function OrgWorkspaceSidebar({
	controller,
	isBusy,
}: OrgWorkspaceSidebarProps) {
	const [collapsedDirectories, setCollapsedDirectories] = useState<ReadonlySet<string>>(new Set())
	const [dialog, setDialog] = useState<SidebarDialog | null>(null)
	const workspaceTree = controller.workspace
		? buildOrgWorkspaceTree(controller.workspace.directories, controller.workspace.documents)
		: []
	const toggleDirectory = (path: string) => {
		setCollapsedDirectories((current) => {
			const next = new Set(current)
			if (next.has(path)) {
				next.delete(path)
			} else {
				next.add(path)
			}
			return next
		})
	}

	return (
		<>
			<aside className="flex w-64 shrink-0 flex-col border-r bg-muted/20">
				<div className="flex h-10 items-center gap-0.5 border-b px-2">
					<span className="min-w-0 flex-1 truncate px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Files
					</span>
					<Button
						variant="ghost"
						size="icon"
						title="New Org document"
						aria-label="New Org document"
						disabled={!controller.workspace || isBusy}
						onClick={() => setDialog("create-document")}
					>
						<FilePlus2 className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title="New directory"
						aria-label="New directory"
						disabled={!controller.workspace || isBusy}
						onClick={() => setDialog("create-directory")}
					>
						<FolderPlus className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title="Refresh workspace"
						aria-label="Refresh workspace"
						disabled={!controller.workspace || isBusy}
						onClick={() => void controller.refreshWorkspace()}
					>
						<RefreshCw className="size-4" />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								title="Document actions"
								aria-label="Document actions"
								disabled={!controller.activeDocument || isBusy}
							>
								<MoreHorizontal className="size-4" />
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
								Delete document
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="flex-1 overflow-auto p-2">
					{controller.workspace ? (
						workspaceTree.length > 0 ? (
							<OrgTree
								activePath={controller.activeDocument?.relativePath}
								collapsed={collapsedDirectories}
								entries={workspaceTree}
								isBusy={isBusy}
								onOpen={(document) => void controller.openDocument(document)}
								onToggle={toggleDirectory}
							/>
						) : (
							<p className="p-2 text-sm text-muted-foreground">Workspace is empty.</p>
						)
					) : (
						<p className="p-2 text-sm text-muted-foreground">Select an Org directory to begin.</p>
					)}
				</div>
			</aside>
			<OrgInputDialog
				open={dialog === "create-document"}
				title="New Org document"
				description="Create a standard .org file relative to this workspace."
				inputLabel="Relative path"
				defaultValue="notes.org"
				confirmLabel="Create"
				onOpenChange={(open) => setDialog(open ? "create-document" : null)}
				onSubmit={(path) => void controller.createDocument(path)}
			/>
			<OrgInputDialog
				open={dialog === "create-directory"}
				title="New directory"
				description="Create a directory relative to this workspace."
				inputLabel="Relative path"
				defaultValue="notes"
				confirmLabel="Create"
				onOpenChange={(open) => setDialog(open ? "create-directory" : null)}
				onSubmit={(path) => void controller.createDirectory(path)}
			/>
			<OrgInputDialog
				open={dialog === "move-document"}
				title="Move or rename document"
				description="Enter the new path relative to this workspace."
				inputLabel="New relative path"
				defaultValue={controller.activeDocument?.relativePath ?? ""}
				confirmLabel="Move"
				onOpenChange={(open) => setDialog(open ? "move-document" : null)}
				onSubmit={(path) => {
					if (path !== controller.activeDocument?.relativePath) {
						void controller.moveActiveDocument(path)
					}
				}}
			/>
			<OrgConfirmDialog
				open={dialog === "delete-document"}
				title="Delete document?"
				description={`Delete ${controller.activeDocument?.relativePath ?? "this document"}? This cannot be undone.`}
				confirmLabel="Delete"
				destructive
				onOpenChange={(open) => setDialog(open ? "delete-document" : null)}
				onConfirm={() => void controller.deleteActiveDocument()}
			/>
		</>
	)
})
