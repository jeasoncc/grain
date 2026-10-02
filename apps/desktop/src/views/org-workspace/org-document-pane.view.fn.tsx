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
	Columns2,
	Tags,
	X,
} from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"
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
	const activeDocument = controller.activeDocument
	// UI mount identity is separate from the durable buffer/cache namespace.
	const runtimeMountIds = useRef(new WeakMap<object, number>())
	const nextRuntimeMountId = useRef(0)
	const runtime = controller.activeBufferRuntime
	let runtimeMountId = 0
	if (runtime) {
		runtimeMountId = runtimeMountIds.current.get(runtime) ?? ++nextRuntimeMountId.current
		runtimeMountIds.current.set(runtime, runtimeMountId)
	}
	const [split, setSplit] = useState(false)
	const [activeWindow, setActiveWindow] = useState<"primary" | "secondary">("primary")
	const [windowCommandSuspended, setWindowCommandSuspended] = useState(false)
	useEffect(() => {
		if (windowCommandSuspended) setWindowCommandSuspended(false)
	}, [windowCommandSuspended])
	const activeWindowRef = useRef<"primary" | "secondary">("primary")
	const targets = useRef(new Map<string, OrgEditorCommandTarget>())
	const cursors = useRef(new Map<string, number>())
	const prefixes = useRef(new Map<string, OrgPrefixSession | null>())
	const baseSessionKey =
		controller.workspaceSessionId && controller.activeBufferId
			? `${controller.workspaceSessionId}\u0000${controller.activeBufferId}`
			: (activeDocument?.relativePath ?? "")
	const windowKey = (name: string) => `${baseSessionKey}:window:${name}`
	const [cursor, setCursor] = useState(0)
	const [prefix, setPrefix] = useState<OrgPrefixSession | null>(null)
	const commandTargetRef = useRef<OrgEditorCommandTarget | null>(null)
	const selectWindow = (name: "primary" | "secondary") => {
		if (activeWindowRef.current !== name) {
			setWindowCommandSuspended(true)
			prefixes.current.set(windowKey(activeWindowRef.current), null)
			prefixes.current.set(windowKey(name), null)
			setPrefix(null)
		}
		activeWindowRef.current = name
		setActiveWindow(name)
		commandTargetRef.current = targets.current.get(windowKey(name)) ?? null
		setCursor(cursors.current.get(windowKey(name)) ?? 0)
	}

	useEffect(() => {
		// Grants are namespaces, not editor/window ownership. Never carry UI metadata
		// or a target across a new authorization grant.
		cursors.current.clear()
		prefixes.current.clear()
		setPrefix(null)
	}, [controller.workspaceSessionId])
	const minibufferFocusRef = useRef<(() => void) | null>(null)
	const parameterCommand = useOrgCommandMinibuffer(
		controller,
		isBusy,
		commandTargetRef,
		parameterSessionSuspended || windowCommandSuspended,
	)
	const minibuffer = parameterCommand.session
	const echo = parameterCommand.echo
	const line = controller.content.slice(0, cursor).split(/\r\n|\n|\r/).length
	const wordCount = controller.content.match(/\S+/gu)?.length ?? 0
	const openMetadataCommand = (type: OrgMetadataType, position: number) => {
		const document = activeDocument
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
			{activeDocument ? (
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
								const active = path === activeDocument?.relativePath
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
						<Button
							variant="ghost"
							size="icon"
							disabled={!controller.activeBufferRuntime}
							aria-label={split ? "Close editor split" : "Split editor"}
							onClick={() => {
								if (split && activeWindowRef.current === "secondary") {
									selectWindow("primary")
									commandTargetRef.current?.restoreFocus()
								}
								setSplit(!split)
							}}
						>
							<Columns2 className="size-4" />
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
					<div
						className={`grid min-h-0 flex-1 bg-background ${split && controller.activeBufferRuntime ? "grid-cols-2" : "grid-cols-1"}`}
					>
						{(
							(split && controller.activeBufferRuntime
								? ["primary", "secondary"]
								: ["primary"]) as ("primary" | "secondary")[]
						).map((name) => (
							<div
								key={name}
								className="min-h-0 min-w-0 overflow-hidden border-r last:border-r-0"
								data-org-active-editor-window={activeWindow === name ? "true" : "false"}
								data-org-editor-window={name}
								onFocusCapture={() => selectWindow(name)}
							>
								<OrgEditor
									key={`${baseSessionKey}:runtime:${runtimeMountId}`}
									runtime={controller.activeBufferRuntime}
									windowId={`${controller.workspaceSessionId ?? "local"}:${name}`}
									sessionKey={
										controller.workspaceSessionId && controller.activeBufferId
											? name === "primary"
												? baseSessionKey
												: `${baseSessionKey}:window:secondary`
											: undefined
									}
									sessionCache={editorSessionCache}
									ariaLabel={`Editing ${activeDocument.relativePath}`}
									documentPath={activeDocument.relativePath}
									prefixContextKey={`${controller.workspaceSessionId ?? ""}\u0000${controller.workspace?.rootPath ?? ""}\u0000${controller.activeBufferId ?? ""}\u0000${activeDocument.relativePath}\u0000${activeWindow}`}
									onPrefixChange={(next) => {
										prefixes.current.set(windowKey(name), next)
										if (activeWindowRef.current === name) setPrefix(next)
									}}
									value={controller.content}
									onChange={controller.updateContent}
									onCommandTarget={(target) => {
										const key = windowKey(name)
										if (target) targets.current.set(key, target)
										else targets.current.delete(key)
										if (activeWindowRef.current === name) commandTargetRef.current = target
									}}
									onOpenOrgLink={(target) => void controller.openOrgLink(target)}
									onCursorChange={(position) => {
										cursors.current.set(windowKey(name), position)
										if (activeWindowRef.current === name) setCursor(position)
									}}
									onRefileSubtree={(position) => {
										if (activeWindowRef.current === name && !parameterSessionSuspended)
											parameterCommand.openRefile(position)
									}}
									onArchiveSubtree={(position) => {
										if (activeWindowRef.current === name && !parameterSessionSuspended)
											parameterCommand.openArchive(position)
									}}
									onEditTags={(position) => {
										if (activeWindowRef.current === name) openMetadataCommand("tags", position)
									}}
									onSchedule={(position) => {
										if (activeWindowRef.current === name) openMetadataCommand("scheduled", position)
									}}
									onDeadline={(position) => {
										if (activeWindowRef.current === name) openMetadataCommand("deadline", position)
									}}
									onSetProperty={(position) => {
										if (activeWindowRef.current === name) openMetadataCommand("property", position)
									}}
									onSave={() => void controller.saveDocument()}
									readOnly={controller.isEditorReadOnly ?? isBusy}
									revealTarget={
										activeWindow === name &&
										controller.revealTarget?.relativePath === activeDocument.relativePath
											? controller.revealTarget
											: null
									}
								/>
							</div>
						))}
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
				{activeDocument && (
					<>
						<output aria-live="polite">
							{controller.isSaving ? "Saving…" : controller.isDirty ? "Edited" : "Saved"}
						</output>
						<span aria-hidden="true">·</span>
						<span className="max-w-72 truncate">{activeDocument.relativePath}</span>
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
