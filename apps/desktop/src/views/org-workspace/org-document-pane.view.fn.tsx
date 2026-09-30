import {
	Archive,
	ArrowLeft,
	CalendarClock,
	ArrowRight,
	FileText,
	Flag,
	KeyRound,
	MoreHorizontal,
	PanelLeftOpen,
	PanelRightOpen,
	Save,
	Send,
	Tags,
	X,
} from "lucide-react"
import { memo, useEffect, useState } from "react"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import {
	setOrgHeadingTagsAt,
	setOrgPlanningAt,
	setOrgPropertyAt,
	type OrgTextEdit,
} from "@/pipes/org"
import { OrgEditor } from "@/views/org-editor"
import { Button } from "@/views/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"
import { OrgConfirmDialog, OrgInputDialog } from "./org-action-dialog.view.fn"

type OrgMetadataType = "tags" | "scheduled" | "deadline" | "property"

interface OrgMetadataDialog {
	readonly type: OrgMetadataType
	readonly cursor: number
	readonly content: string
	readonly relativePath: string
}

const headingTextAt = (content: string, cursor: number): string | null => {
	const position = Math.max(0, Math.min(cursor, content.length))
	const headings = [...content.matchAll(/^(\*+)\s+.*$/gm)].filter(
		(match) => match.index <= position,
	)
	return headings.at(-1)?.[0] ?? null
}

const headingTagsAt = (content: string, cursor: number): string => {
	const heading = headingTextAt(content, cursor) ?? ""
	const tags = /\s+((?::[^\s:]+)+:)\s*\r?$/.exec(heading)?.[1]
	return tags ? tags.slice(1, -1).split(":").join(" ") : ""
}

const today = (): string => {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export const OrgDocumentPane = memo(function OrgDocumentPane({
	controller,
	isBusy,
	canGoBack,
	canGoForward,
	inspectorVisible,
	onCloseTab,
	onGoBack,
	onGoForward,
	onQuickOpen,
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
	readonly onQuickOpen: () => void
	readonly onSelectTab: (relativePath: string) => void
	readonly onShowInspector: () => void
	readonly onShowSidebar: () => void
	readonly openDocumentPaths: readonly string[]
	readonly sidebarVisible: boolean
}) {
	const [cursor, setCursor] = useState(0)
	const [refilePosition, setRefilePosition] = useState<number | null>(null)
	const [archivePosition, setArchivePosition] = useState<number | null>(null)
	const [metadataDialog, setMetadataDialog] = useState<OrgMetadataDialog | null>(null)
	const line = controller.content.slice(0, cursor).split(/\r\n|\n|\r/).length
	const wordCount = controller.content.match(/\S+/gu)?.length ?? 0
	const openMetadataDialog = (type: OrgMetadataType, position: number) => {
		const document = controller.activeDocument
		if (!document || isBusy) return
		setMetadataDialog({
			type,
			cursor: position,
			content: controller.content,
			relativePath: document.relativePath,
		})
	}
	const metadataIsCurrent = () =>
		Boolean(
			metadataDialog &&
				controller.activeDocument?.relativePath === metadataDialog.relativePath &&
				controller.content === metadataDialog.content &&
				!isBusy,
		)
	const applyTextEdit = (edit: OrgTextEdit | null): boolean => {
		if (!edit || !metadataDialog) return false
		controller.updateContent(
			metadataDialog.content.slice(0, edit.from) +
				edit.insert +
				metadataDialog.content.slice(edit.to),
		)
		setCursor(edit.cursor)
		return true
	}
	const applyMetadataEdit = (
		createEdit: (content: string, position: number) => OrgTextEdit | null,
	): boolean => {
		if (!metadataDialog || !metadataIsCurrent()) return false
		try {
			return applyTextEdit(createEdit(metadataDialog.content, metadataDialog.cursor))
		} catch {
			return false
		}
	}
	useEffect(() => {
		setMetadataDialog(null)
	}, [controller.activeDocument?.relativePath, controller.activeDocument?.revision])

	return (
		<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			{controller.activeDocument ? (
				<>
					<div className="flex h-10 shrink-0 items-center gap-0.5 border-b bg-muted/20 px-1">
						{!sidebarVisible && (
							<Button
								variant="ghost"
								size="icon"
								aria-label="Show sidebar"
								title="Show sidebar"
								onClick={onShowSidebar}
							>
								<PanelLeftOpen className="size-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							disabled={!canGoBack || isBusy}
							aria-label="Go back"
							title="Go back"
							onClick={onGoBack}
						>
							<ArrowLeft className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							disabled={!canGoForward || isBusy}
							aria-label="Go forward"
							title="Go forward"
							onClick={onGoForward}
						>
							<ArrowRight className="size-4" />
						</Button>
						<div className="flex min-w-0 flex-1 self-stretch overflow-x-auto">
							{openDocumentPaths.map((path) => {
								const active = path === controller.activeDocument?.relativePath
								return (
									<div
										key={path}
										className={`group relative flex min-w-32 max-w-56 items-center border-r px-2 transition-colors duration-150 ${active ? "bg-background text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
										title={path}
									>
										<button
											type="button"
											className="min-w-0 flex-1 truncate text-left text-xs"
											onClick={() => onSelectTab(path)}
										>
											{path
												.split("/")
												.at(-1)
												?.replace(/\.org$/i, "")}
										</button>
										{active && controller.isDirty && (
											<>
												<span
													aria-hidden="true"
													className="mx-1 size-1.5 shrink-0 rounded-full bg-primary group-hover:hidden"
												/>
												<span className="sr-only">Unsaved changes</span>
											</>
										)}
										<button
											type="button"
											className={`ml-1 size-5 shrink-0 items-center justify-center rounded hover:bg-muted ${active && controller.isDirty ? "hidden group-hover:flex" : "flex opacity-0 group-hover:opacity-100"}`}
											aria-label={`Close ${path}`}
											onClick={() => onCloseTab(path)}
										>
											<X className="size-3" />
										</button>
									</div>
								)
							})}
						</div>
						<Button
							variant="ghost"
							size="icon"
							disabled={!controller.isDirty || isBusy}
							title="Save (Ctrl+S)"
							aria-label="Save document"
							onClick={() => void controller.saveDocument()}
						>
							<Save className="size-4" />
						</Button>
						{!inspectorVisible && (
							<Button
								variant="ghost"
								size="icon"
								aria-label="Show note inspector"
								title="Show note inspector"
								onClick={onShowInspector}
							>
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
								<DropdownMenuItem
									disabled={isBusy}
									onClick={() => openMetadataDialog("tags", cursor)}
								>
									<Tags className="mr-2 size-4" />
									Heading tags{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-q</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy}
									onClick={() => openMetadataDialog("scheduled", cursor)}
								>
									<CalendarClock className="mr-2 size-4" />
									Schedule{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-s</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy}
									onClick={() => openMetadataDialog("deadline", cursor)}
								>
									<Flag className="mr-2 size-4" />
									Deadline{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-d</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy}
									onClick={() => openMetadataDialog("property", cursor)}
								>
									<KeyRound className="mr-2 size-4" />
									Set property{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-p</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									disabled={isBusy || controller.isDirty}
									onClick={() => setRefilePosition(cursor)}
								>
									<Send className="mr-2 size-4" />
									Refile subtree
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy || controller.isDirty}
									onClick={() => setArchivePosition(cursor)}
								>
									<Archive className="mr-2 size-4" />
									Archive subtree
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="min-h-0 flex-1 bg-background">
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
							onEditTags={(position) => openMetadataDialog("tags", position)}
							onSchedule={(position) => openMetadataDialog("scheduled", position)}
							onDeadline={(position) => openMetadataDialog("deadline", position)}
							onSetProperty={(position) => openMetadataDialog("property", position)}
							onSave={() => void controller.saveDocument()}
							readOnly={isBusy}
							revealTarget={
								controller.revealTarget?.relativePath === controller.activeDocument.relativePath
									? controller.revealTarget
									: null
							}
						/>
					</div>
				</>
			) : (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="flex h-10 shrink-0 items-center gap-0.5 border-b bg-muted/20 px-1">
						{!sidebarVisible && (
							<Button variant="ghost" size="icon" aria-label="Show sidebar" onClick={onShowSidebar}>
								<PanelLeftOpen className="size-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							disabled={!canGoBack || isBusy}
							aria-label="Go back"
							onClick={onGoBack}
						>
							<ArrowLeft className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							disabled={!canGoForward || isBusy}
							aria-label="Go forward"
							onClick={onGoForward}
						>
							<ArrowRight className="size-4" />
						</Button>
						<div className="flex min-w-0 flex-1 self-stretch overflow-x-auto">
							{openDocumentPaths.map((path) => (
								<div
									key={path}
									className="group flex min-w-32 max-w-56 items-center border-r px-2 text-muted-foreground hover:bg-muted/60"
									title={path}
								>
									<button
										type="button"
										className="min-w-0 flex-1 truncate text-left text-xs"
										onClick={() => onSelectTab(path)}
									>
										{path
											.split("/")
											.at(-1)
											?.replace(/\.org$/i, "")}
									</button>
									<button
										type="button"
										className="ml-1 flex size-5 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
										aria-label={`Close ${path}`}
										onClick={() => onCloseTab(path)}
									>
										<X className="size-3" />
									</button>
								</div>
							))}
						</div>
					</div>
					<div className="flex flex-1 items-center justify-center p-8">
						<div className="flex max-w-xs flex-col items-center text-center text-muted-foreground">
							<div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted/60">
								<FileText className="size-4" />
							</div>
							<p className="text-sm font-medium text-foreground">
								{controller.isLoading ? "Loading workspace…" : "No note selected"}
							</p>
							{!controller.isLoading && (
								<>
									<p className="mt-1 max-w-[280px] text-xs leading-[18px]">
										Open a note from Files or use Quick open.
									</p>
									<Button
										variant="outline"
										size="sm"
										className="mt-4 h-8 text-xs"
										onClick={onQuickOpen}
									>
										Quick open <kbd className="ml-2 text-[10px] text-muted-foreground">Ctrl O</kbd>
									</Button>
								</>
							)}
						</div>
					</div>
				</div>
			)}
			<footer className="flex h-[22px] shrink-0 items-center justify-end gap-1.5 border-t border-border/70 bg-muted/20 px-2 text-[11px] text-muted-foreground">
				{controller.activeDocument && (
					<>
						<output aria-live="polite">
							{controller.isSaving ? "Saving…" : controller.isDirty ? "Edited" : "Saved"}
						</output>
						<span aria-hidden="true">·</span>
						<span className="max-w-72 truncate">{controller.activeDocument.relativePath}</span>
						<span aria-hidden="true">·</span>
						<span>Ln {line}</span>
						<span aria-hidden="true">·</span>
						<span>
							{wordCount} {wordCount === 1 ? "word" : "words"}
						</span>
					</>
				)}
			</footer>
			<OrgInputDialog
				allowEmpty
				open={metadataDialog?.type === "tags"}
				title="Heading tags"
				description="Set tags on the current heading. Separate multiple tags with spaces, commas, or colons; leave empty to remove them."
				inputLabel="Tags"
				invalidMessage="One or more tags are invalid. Separate tags with spaces, commas, or colons."
				defaultValue={
					metadataDialog?.type === "tags"
						? headingTagsAt(metadataDialog.content, metadataDialog.cursor)
						: ""
				}
				confirmLabel="Set tags"
				onOpenChange={(open) => {
					if (!open) setMetadataDialog(null)
				}}
				onSubmit={(value) => {
					if (metadataDialog?.type !== "tags" || !metadataIsCurrent()) return false
					try {
						const edit = setOrgHeadingTagsAt(
							metadataDialog.content,
							metadataDialog.cursor,
							value.split(/[\s,:]+/),
						)
						if (!edit) {
							return !value && headingTextAt(metadataDialog.content, metadataDialog.cursor) !== null
						}
						return applyTextEdit(edit)
					} catch {
						return false
					}
				}}
			/>
			<OrgInputDialog
				open={metadataDialog?.type === "scheduled" || metadataDialog?.type === "deadline"}
				title={metadataDialog?.type === "deadline" ? "Set deadline" : "Schedule heading"}
				description="Use an Org planning date in YYYY-MM-DD format."
				inputLabel="Date"
				invalidMessage="Enter a date in YYYY-MM-DD format."
				defaultValue={today()}
				confirmLabel={metadataDialog?.type === "deadline" ? "Set deadline" : "Schedule"}
				onOpenChange={(open) => {
					if (!open) setMetadataDialog(null)
				}}
				onSubmit={(value) => {
					if (metadataDialog?.type !== "scheduled" && metadataDialog?.type !== "deadline")
						return false
					const kind = metadataDialog.type === "deadline" ? "DEADLINE" : "SCHEDULED"
					return applyMetadataEdit((content, position) =>
						setOrgPlanningAt(content, position, kind, value),
					)
				}}
			/>
			<OrgInputDialog
				open={metadataDialog?.type === "property"}
				title="Set property"
				description="Set a property on the current heading using KEY=VALUE."
				inputLabel="Property"
				invalidMessage="Enter a property as KEY=VALUE."
				defaultValue="ID="
				confirmLabel="Set property"
				onOpenChange={(open) => {
					if (!open) setMetadataDialog(null)
				}}
				onSubmit={(value) => {
					if (metadataDialog?.type !== "property") return false
					const separator = value.indexOf("=")
					if (separator <= 0) return false
					const key = value.slice(0, separator).trim()
					if (!/^[A-Za-z0-9_@#%-]+$/.test(key)) return false
					return applyMetadataEdit((content, position) =>
						setOrgPropertyAt(content, position, key, value.slice(separator + 1)),
					)
				}}
			/>
			<OrgInputDialog
				open={refilePosition !== null}
				title="Refile subtree"
				description="Copy this subtree to another Org file, verify it, then remove the source copy."
				inputLabel="Target Org file"
				defaultValue="inbox.org"
				confirmLabel="Refile"
				onOpenChange={(open) => {
					if (!open) setRefilePosition(null)
				}}
				onSubmit={(target) => {
					if (refilePosition !== null) void controller.refileSubtree(refilePosition, target)
				}}
			/>
			<OrgConfirmDialog
				open={archivePosition !== null}
				title="Archive subtree?"
				description="Move this subtree to the sibling archive file after verifying the target copy."
				confirmLabel="Archive"
				onOpenChange={(open) => {
					if (!open) setArchivePosition(null)
				}}
				onConfirm={() => {
					if (archivePosition !== null) void controller.archiveSubtree(archivePosition)
				}}
			/>
		</main>
	)
})
