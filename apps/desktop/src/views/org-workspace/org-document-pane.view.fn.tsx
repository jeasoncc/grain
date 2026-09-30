import {
	Archive,
	ArrowLeft,
	ArrowRight,
	FileText,
	MoreHorizontal,
	PanelLeftOpen,
	PanelRightOpen,
	Save,
	Send,
	X,
} from "lucide-react"
import { memo, useState } from "react"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgEditor } from "@/views/org-editor"
import { Button } from "@/views/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"
import { OrgConfirmDialog, OrgInputDialog } from "./org-action-dialog.view.fn"

export const OrgDocumentPane = memo(function OrgDocumentPane({
	controller,
	isBusy,
	canGoBack,
	canGoForward,
	inspectorVisible,
	onCloseTab,
	onGoBack,
	onGoForward,
	onSelectTab,
	onShowInspector,
	onShowSidebar,
	openDocumentPaths,
	sidebarVisible,
}: {
	readonly canGoBack: boolean
	readonly canGoForward: boolean
	readonly controller: OrgWorkspaceController
	readonly inspectorVisible: boolean
	readonly isBusy: boolean
	readonly onCloseTab: (relativePath: string) => void
	readonly onGoBack: () => void
	readonly onGoForward: () => void
	readonly onSelectTab: (relativePath: string) => void
	readonly onShowInspector: () => void
	readonly onShowSidebar: () => void
	readonly openDocumentPaths: readonly string[]
	readonly sidebarVisible: boolean
}) {
	const [cursor, setCursor] = useState(0)
	const [refilePosition, setRefilePosition] = useState<number | null>(null)
	const [archivePosition, setArchivePosition] = useState<number | null>(null)

	return (
		<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			{controller.activeDocument ? (
				<>
					<div className="flex h-11 shrink-0 items-center gap-1 border-b bg-muted/15 px-2">
						{!sidebarVisible && (
							<Button variant="ghost" size="icon" aria-label="Show sidebar" title="Show sidebar" onClick={onShowSidebar}>
								<PanelLeftOpen className="size-4" />
							</Button>
						)}
						<Button variant="ghost" size="icon" disabled={!canGoBack || isBusy} aria-label="Go back" title="Go back" onClick={onGoBack}><ArrowLeft className="size-4" /></Button>
						<Button variant="ghost" size="icon" disabled={!canGoForward || isBusy} aria-label="Go forward" title="Go forward" onClick={onGoForward}><ArrowRight className="size-4" /></Button>
						<div className="flex min-w-0 flex-1 self-stretch overflow-x-auto">
							{openDocumentPaths.map((path) => {
								const active = path === controller.activeDocument?.relativePath
								return (
									<div key={path} className={`group flex min-w-32 max-w-56 items-center border-r px-2 ${active ? "bg-background text-foreground" : "text-muted-foreground hover:bg-muted/60"}`} title={path}>
										<button type="button" className="min-w-0 flex-1 truncate text-left text-xs" onClick={() => onSelectTab(path)}>
											{path.split("/").at(-1)?.replace(/\.org$/i, "")}
										</button>
										{active && controller.isDirty && <span className="mx-1 size-1.5 shrink-0 rounded-full bg-primary group-hover:hidden" aria-label="Unsaved changes" />}
										<button type="button" className={`ml-1 size-5 shrink-0 items-center justify-center rounded hover:bg-muted ${active && controller.isDirty ? "hidden group-hover:flex" : "flex opacity-0 group-hover:opacity-100"}`} aria-label={`Close ${path}`} onClick={() => onCloseTab(path)}><X className="size-3" /></button>
									</div>
								)
							})}
						</div>
						<span className="hidden text-[11px] text-muted-foreground sm:inline">
							{controller.isSaving ? "Saving…" : controller.isDirty ? "Edited" : "Saved"}
						</span>
						<Button variant="ghost" size="icon" disabled={!controller.isDirty || isBusy} title="Save (Ctrl+S)" aria-label="Save document" onClick={() => void controller.saveDocument()}>
							<Save className="size-4" />
						</Button>
						{!inspectorVisible && (
							<Button variant="ghost" size="icon" aria-label="Show note inspector" title="Show note inspector" onClick={onShowInspector}>
								<PanelRightOpen className="size-4" />
							</Button>
						)}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" aria-label="Note actions" title="Note actions">
									<MoreHorizontal className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem disabled={isBusy || controller.isDirty} onClick={() => setRefilePosition(cursor)}>
									<Send className="mr-2 size-4" />Refile subtree
								</DropdownMenuItem>
								<DropdownMenuItem disabled={isBusy || controller.isDirty} onClick={() => setArchivePosition(cursor)}>
									<Archive className="mr-2 size-4" />Archive subtree
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="min-h-0 flex-1 bg-muted/10">
						<div className="mx-auto h-full w-full max-w-[980px] border-x border-border/30 bg-background shadow-sm">
							<OrgEditor
								key={controller.activeDocument.relativePath}
								ariaLabel={`Editing ${controller.activeDocument.relativePath}`}
								documentPath={controller.activeDocument.relativePath}
								value={controller.content}
								onChange={controller.updateContent}
								onOpenOrgLink={(target) => void controller.openOrgLink(target)}
								onCursorChange={setCursor}
								onRefileSubtree={setRefilePosition}
								onArchiveSubtree={setArchivePosition}
								onSave={() => void controller.saveDocument()}
								readOnly={isBusy}
								revealTarget={controller.revealTarget?.relativePath === controller.activeDocument.relativePath ? controller.revealTarget : null}
							/>
						</div>
					</div>
				</>
			) : (
				<div className="flex h-full flex-col">
					<div className="flex h-11 shrink-0 items-center gap-1 border-b bg-muted/15 px-2">
						{!sidebarVisible && <Button variant="ghost" size="icon" aria-label="Show sidebar" onClick={onShowSidebar}><PanelLeftOpen className="size-4" /></Button>}
						<Button variant="ghost" size="icon" disabled={!canGoBack || isBusy} aria-label="Go back" onClick={onGoBack}><ArrowLeft className="size-4" /></Button>
						<Button variant="ghost" size="icon" disabled={!canGoForward || isBusy} aria-label="Go forward" onClick={onGoForward}><ArrowRight className="size-4" /></Button>
						<div className="flex min-w-0 flex-1 self-stretch overflow-x-auto">
							{openDocumentPaths.map((path) => (
								<div key={path} className="group flex min-w-32 max-w-56 items-center border-r px-2 text-muted-foreground hover:bg-muted/60" title={path}>
									<button type="button" className="min-w-0 flex-1 truncate text-left text-xs" onClick={() => onSelectTab(path)}>{path.split("/").at(-1)?.replace(/\.org$/i, "")}</button>
									<button type="button" className="ml-1 flex size-5 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100" aria-label={`Close ${path}`} onClick={() => onCloseTab(path)}><X className="size-3" /></button>
								</div>
							))}
						</div>
					</div>
					<div className="flex flex-1 items-center justify-center p-8">
						<div className="flex max-w-xs flex-col items-center text-center text-muted-foreground">
							<div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted/60"><FileText className="size-4" /></div>
							<p className="text-sm font-medium text-foreground">{controller.isLoading ? "Loading workspace…" : "No note selected"}</p>
							{!controller.isLoading && <p className="mt-1 text-xs">Choose a note from the sidebar or create a new one.</p>}
						</div>
					</div>
				</div>
			)}
			<OrgInputDialog open={refilePosition !== null} title="Refile subtree" description="Copy this subtree to another Org file, verify it, then remove the source copy." inputLabel="Target Org file" defaultValue="inbox.org" confirmLabel="Refile" onOpenChange={(open) => { if (!open) setRefilePosition(null) }} onSubmit={(target) => { if (refilePosition !== null) void controller.refileSubtree(refilePosition, target) }} />
			<OrgConfirmDialog open={archivePosition !== null} title="Archive subtree?" description="Move this subtree to the sibling archive file after verifying the target copy." confirmLabel="Archive" onOpenChange={(open) => { if (!open) setArchivePosition(null) }} onConfirm={() => { if (archivePosition !== null) void controller.archiveSubtree(archivePosition) }} />
		</main>
	)
})
