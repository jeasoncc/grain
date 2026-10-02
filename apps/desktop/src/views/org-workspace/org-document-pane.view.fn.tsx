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
import { memo, useRef, useState } from "react"
import { useOrgCommandMinibuffer } from "@/hooks/use-org-command-minibuffer"
import { orgTagsBufferCommand } from "@/flows/org-command/org-tags.command"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import { orgPropertyBufferCommand } from "@/flows/org-command/org-property.command"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgEditor, type OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgEditorSessionSnapshot } from "@/views/org-editor/org-editor.types"
import { Button } from "@/views/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"
import { OrgMinibuffer } from "./org-minibuffer.view.fn"
import { OrgWhichKey } from "./org-which-key.view.fn"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"

type OrgMetadataType = "tags" | "scheduled" | "deadline" | "property"

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
	parameterSessionSuspended = false,
	editorSessionCache,
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
	readonly parameterSessionSuspended?: boolean
	readonly editorSessionCache?: Map<string, OrgEditorSessionSnapshot>
}) {
	const [cursor, setCursor] = useState(0)
	const [prefix, setPrefix] = useState<OrgPrefixSession | null>(null)
	const commandTargetRef = useRef<OrgEditorCommandTarget | null>(null)
	const minibufferFocusRef = useRef<(() => void) | null>(null)
	const parameterCommand = useOrgCommandMinibuffer(
		controller,
		isBusy,
		commandTargetRef,
		parameterSessionSuspended,
	)
	const minibuffer = parameterCommand.session
	const echo = parameterCommand.echo
	const line = controller.content.slice(0, cursor).split(/\r\n|\n|\r/).length
	const wordCount = controller.content.match(/\S+/gu)?.length ?? 0
	const openMetadataCommand = (type: OrgMetadataType, position: number) => {
		const document = controller.activeDocument
		if (!document || isBusy) return
		parameterCommand.open(
			type === "tags"
				? orgTagsBufferCommand
				: type === "property"
					? orgPropertyBufferCommand
					: createOrgPlanningCommand(type === "deadline" ? "DEADLINE" : "SCHEDULED", today()),
			position,
		)
	}

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
								const buffer = controller.openBuffers?.find((item) => item.relativePath === path)
								return (
									<div
										key={path}
										className={`group relative flex min-w-32 max-w-56 items-center border-r px-2 transition-colors duration-150 ${active ? "bg-background text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
										title={`${path}${buffer?.isDirty ? " — unsaved" : ""}${buffer?.hasConflict ? " — external conflict" : ""}`}
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
										{(buffer?.isDirty ?? (active && controller.isDirty)) && (
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
								<Button
									variant="ghost"
									size="icon"
									aria-label="Note actions"
									title="Note actions"
									disabled={parameterSessionSuspended}
								>
									<MoreHorizontal className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								onCloseAutoFocus={(event) => {
									if (minibuffer) {
										event.preventDefault()
										// Focus after Radix has removed its modal focus scope.
										window.setTimeout(() => minibufferFocusRef.current?.(), 0)
									}
								}}
							>
								<DropdownMenuItem
									disabled={isBusy}
									onClick={() => openMetadataCommand("tags", cursor)}
								>
									<Tags className="mr-2 size-4" />
									Heading tags{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-q</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy}
									onClick={() => openMetadataCommand("scheduled", cursor)}
								>
									<CalendarClock className="mr-2 size-4" />
									Schedule{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-s</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy}
									onClick={() => openMetadataCommand("deadline", cursor)}
								>
									<Flag className="mr-2 size-4" />
									Deadline{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-d</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy}
									onClick={() => openMetadataCommand("property", cursor)}
								>
									<KeyRound className="mr-2 size-4" />
									Set property{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-p</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									disabled={isBusy || controller.isDirty}
									onClick={() => parameterCommand.openRefile(cursor)}
								>
									<Send className="mr-2 size-4" />
									Refile subtree
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy || controller.isDirty}
									onClick={() => parameterCommand.openArchive(cursor)}
								>
									<Archive className="mr-2 size-4" />
									Archive subtree
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="min-h-0 flex-1 bg-background">
						<OrgEditor
							key={controller.activeBufferId ?? controller.activeDocument.relativePath}
							sessionKey={
								controller.workspaceSessionId && controller.activeBufferId
									? `${controller.workspaceSessionId}\u0000${controller.activeBufferId}`
									: undefined
							}
							sessionCache={editorSessionCache}
							ariaLabel={`Editing ${controller.activeDocument.relativePath}`}
							documentPath={controller.activeDocument.relativePath}
							prefixContextKey={`${controller.workspaceSessionId ?? ""}\u0000${controller.workspace?.rootPath ?? ""}\u0000${controller.activeBufferId ?? ""}\u0000${controller.activeDocument.relativePath}`}
							onPrefixChange={setPrefix}
							value={controller.content}
							onChange={controller.updateContent}
							onCommandTarget={(target) => {
								commandTargetRef.current = target
							}}
							onOpenOrgLink={(target) => void controller.openOrgLink(target)}
							onCursorChange={setCursor}
							onRefileSubtree={(position) => {
								if (!parameterSessionSuspended) parameterCommand.openRefile(position)
							}}
							onArchiveSubtree={(position) => {
								if (!parameterSessionSuspended) parameterCommand.openArchive(position)
							}}
							onEditTags={(position) => openMetadataCommand("tags", position)}
							onSchedule={(position) => openMetadataCommand("scheduled", position)}
							onDeadline={(position) => openMetadataCommand("deadline", position)}
							onSetProperty={(position) => openMetadataCommand("property", position)}
							onSave={() => void controller.saveDocument()}
							readOnly={controller.isEditorReadOnly ?? isBusy}
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
			<OrgWhichKey prefix={!minibuffer && !parameterSessionSuspended ? prefix : null} />
			<OrgMinibuffer
				session={minibuffer}
				onFocusTarget={(focus) => {
					minibufferFocusRef.current = focus
				}}
			/>
			<footer className="flex h-[22px] shrink-0 items-center justify-end gap-1.5 border-t border-border/70 bg-muted/20 px-2 text-[11px] text-muted-foreground">
				<output
					aria-live="polite"
					title={echo ?? undefined}
					className="mr-auto truncate text-foreground"
				>
					{echo}
				</output>
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
		</main>
	)
})
