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
import { flushSync } from "react-dom"
import { EditorView } from "@codemirror/view"
import { ChangeSet } from "@codemirror/state"
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react"
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

// A lease belongs to a mounted view, not to the workspace grant or root label.
const BoundEditor = ({
	controller,
	bufferId,
	...props
}: React.ComponentProps<typeof OrgEditor> & {
	readonly controller: OrgWorkspaceController
	readonly bufferId: string
}) => {
	useLayoutEffect(
		() => controller.registerBufferWindow?.(props.windowId!, bufferId),
		[controller.registerBufferWindow, props.windowId, bufferId, props.runtime],
	)
	return <OrgEditor {...props} />
}
let nextPaneId = 0

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
	const controllerRef = useRef(controller)
	controllerRef.current = controller
	const activeDocument = controller.activeDocument
	const paneId = useRef(++nextPaneId).current
	const runtimeMountIds = useRef(new WeakMap<object, number>())
	const nextRuntimeMountId = useRef(0)
	const [split, setSplit] = useState(false)
	const [noteActionsOpen, setNoteActionsOpen] = useState(false)
	const [activeWindow, setActiveWindow] = useState<"primary" | "secondary">("primary")
	const bindings = useRef<Record<string, string | null>>({
		primary: controller.activeBufferId,
		secondary: null,
	})
	const pendingWindow = useRef<{
		name: "primary" | "secondary"
		bufferId: string
		session: string | null | undefined
		grant: string | undefined
		root: string | undefined
		runtime: unknown
	} | null>(null)
	const lastActiveId = useRef(controller.activeBufferId)
	const activeWindowRef = useRef<"primary" | "secondary">("primary")
	// Shell navigation changes only the focused view. Focus handoff records its ID
	// synchronously so the following render cannot overwrite the peer binding.
	if (lastActiveId.current !== controller.activeBufferId) {
		pendingWindow.current = null
		bindings.current[activeWindowRef.current] = controller.activeBufferId
		lastActiveId.current = controller.activeBufferId
	}
	const liveBuffers =
		controller.liveBuffers ??
		(controller.activeBufferId && activeDocument
			? [
					{
						bufferId: controller.activeBufferId,
						document: activeDocument,
						content: controller.content,
						runtime: controller.activeBufferRuntime,
						isDirty: controller.isDirty,
					},
				]
			: [])
	for (const name of ["primary", "secondary"]) {
		if (!liveBuffers.some((buffer) => buffer.bufferId === bindings.current[name])) {
			const peer = bindings.current[name === "primary" ? "secondary" : "primary"]
			bindings.current[name] =
				controller.activeBufferId ??
				(liveBuffers.some((buffer) => buffer.bufferId === peer) ? peer : null)
		}
	}
	const pending = pendingWindow.current
	if (
		pending &&
		(pending.session !== controller.workspaceSessionId ||
			pending.grant !== controller.workspace?.capabilityToken ||
			pending.root !== controller.workspace?.rootPath ||
			bindings.current[pending.name] !== pending.bufferId ||
			(pending.name === "secondary" && !split) ||
			!liveBuffers.some(
				(buffer) => buffer.bufferId === pending.bufferId && buffer.runtime === pending.runtime,
			))
	)
		pendingWindow.current = null
	// Read only the fenced pending origin; availability must not activate a view.
	// A clean focused peer must not hide the parked buffer's unsaved edits.
	const toolbarOrigin = !isBusy ? pendingWindow.current : null
	const toolbarIsDirty =
		(toolbarOrigin
			? liveBuffers.find((buffer) => buffer.bufferId === toolbarOrigin.bufferId)?.isDirty
			: controller.isDirty) ?? controller.isDirty
	const visibleDocument = activeDocument ?? liveBuffers[0]?.document
	useLayoutEffect(() => {
		if (!controller.activeBufferId) {
			const survivor = bindings.current[activeWindowRef.current]
			if (survivor) controller.activateOpenBuffer?.(survivor)
		}
	}, [controller.activeBufferId, controller.activateOpenBuffer, liveBuffers, isBusy])
	const bufferFor = (name: string) =>
		liveBuffers.find((buffer) => buffer.bufferId === bindings.current[name])
	const [windowCommandSuspended, setWindowCommandSuspended] = useState(false)
	useEffect(() => {
		if (windowCommandSuspended) setWindowCommandSuspended(false)
	}, [windowCommandSuspended])
	const windowNodes = useRef(new Map<string, HTMLDivElement>())
	const targets = useRef(new Map<string, OrgEditorCommandTarget>())
	const cursors = useRef(new Map<string, number>())
	const prefixes = useRef(new Map<string, OrgPrefixSession | null>())
	const windowKey = (name: string) =>
		`${controller.workspaceSessionId}\u0000${bindings.current[name]}:window:${name}`
	const [cursor, setCursor] = useState(0)
	const [prefix, setPrefix] = useState<OrgPrefixSession | null>(null)
	const commandTargetRef = useRef<OrgEditorCommandTarget | null>(null)
	const selectWindow = (name: "primary" | "secondary") => {
		const id = bindings.current[name]
		if (!id) return false
		const switchingBuffer = id !== lastActiveId.current
		const switchingWindow = activeWindowRef.current !== name
		if (switchingBuffer || switchingWindow) {
			const previous = lastActiveId.current
			let activated = !switchingBuffer
			// Both controller and pane focus context must be committed before CM
			// handles this event, not in a second render that erases its new prefix.
			flushSync(() => {
				lastActiveId.current = id
				if (switchingBuffer) activated = controllerRef.current.activateOpenBuffer?.(id) ?? false
				if (!activated) {
					lastActiveId.current = previous
					return
				}
				if (switchingWindow) {
					setWindowCommandSuspended(true)
					prefixes.current.set(windowKey(activeWindowRef.current), null)
					prefixes.current.set(windowKey(name), null)
					setPrefix(null)
				}
				activeWindowRef.current = name
				setActiveWindow(name)
			})
			if (!activated) {
				pendingWindow.current = {
					name,
					bufferId: id,
					session: controllerRef.current.workspaceSessionId,
					grant: controllerRef.current.workspace?.capabilityToken,
					root: controllerRef.current.workspace?.rootPath,
					runtime: bufferFor(name)?.runtime,
				}
				return false
			}
		}
		pendingWindow.current = null
		commandTargetRef.current = targets.current.get(windowKey(name)) ?? null
		setCursor(cursors.current.get(windowKey(name)) ?? 0)
		return true
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
	const parameterCommandRef = useRef(parameterCommand)
	parameterCommandRef.current = parameterCommand
	const openMetadataCommand = (type: OrgMetadataType, position: number) => {
		const document = activeDocument
		if (!document || isBusy) return
		parameterCommandRef.current.open(
			type === "tags"
				? orgTagsBufferCommand
				: type === "property"
					? orgPropertyBufferCommand
					: createOrgPlanningCommand(type === "deadline" ? "DEADLINE" : "SCHEDULED", today()),
			position,
		)
	}

	// Toolbar events may be the first event after a refused DOM focus. Resolve
	// that origin before reading any render-bound command/controller or cursor.
	const resolveToolbarWindow = () => {
		const origin = pendingWindow.current
		if (origin && !selectWindow(origin.name)) return false
		if (!commandTargetRef.current) return false
		// selectWindow flushes the controller handoff and suspends old parameter
		// sessions. Finish that fence before launching through the fresh hook ref.
		flushSync(() => setWindowCommandSuspended(false))
		return true
	}
	const toolbarMetadata = (type: OrgMetadataType) => {
		if (!resolveToolbarWindow()) return
		const node = windowNodes.current
			.get(activeWindowRef.current)
			?.querySelector<HTMLElement>(".cm-content")
		const view = node ? EditorView.findFromDOM(node) : null
		const target = commandTargetRef.current
		if (view && target) {
			let selection = view.state.selection
			commandTargetRef.current = {
				...target,
				applyEdit: (...args) => {
					const before = view.state.doc.toString()
					const applied = target.applyEdit(...args)
					const after = view.state.doc.toString()
					let from = 0,
						tail = 0
					while (from < before.length && from < after.length && before[from] === after[from]) from++
					while (
						tail < before.length - from &&
						tail < after.length - from &&
						before[before.length - tail - 1] === after[after.length - tail - 1]
					)
						tail++
					selection = selection.map(
						ChangeSet.of(
							{ from, to: before.length - tail, insert: after.slice(from, after.length - tail) },
							before.length,
						),
					)
					return applied
				},
				restoreFocus: () => {
					view.dispatch({ selection })
					target.restoreFocus()
				},
			}
		}
		openMetadataCommandRef.current(
			type,
			cursors.current.get(windowKey(activeWindowRef.current)) ?? 0,
		)
	}
	const toolbarTransfer = (type: "refile" | "archive") => {
		if (!resolveToolbarWindow() || controllerRef.current.isDirty) return
		const position = cursors.current.get(windowKey(activeWindowRef.current)) ?? 0
		if (type === "refile") parameterCommandRef.current.openRefile(position)
		else parameterCommandRef.current.openArchive(position)
	}
	const openMetadataCommandRef = useRef(openMetadataCommand)
	openMetadataCommandRef.current = openMetadataCommand

	return (
		<main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			{visibleDocument ? (
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
							disabled={!toolbarIsDirty || isBusy}
							title="Save (Ctrl+S)"
							aria-label="Save document"
							onClick={() => {
								if (resolveToolbarWindow()) void controllerRef.current.saveDocument()
							}}
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
									if (!selectWindow("primary")) return
									commandTargetRef.current?.restoreFocus()
								}
								if (!split) bindings.current.secondary = bindings.current[activeWindowRef.current]
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
						<DropdownMenu
							open={noteActionsOpen}
							onOpenChange={(open) => {
								if (!open || !(pendingWindow.current && isBusy)) setNoteActionsOpen(open)
							}}
						>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label="Note actions"
									title="Note actions"
									disabled={parameterSessionSuspended}
									onPointerDownCapture={(event) => {
										if (!resolveToolbarWindow()) {
											event.preventDefault()
											event.stopPropagation()
										}
									}}
									onClick={(event) => {
										if (!resolveToolbarWindow()) event.preventDefault()
										else setNoteActionsOpen(true)
									}}
									onKeyDownCapture={(event) => {
										if (
											["Enter", " ", "ArrowDown"].includes(event.key) &&
											!resolveToolbarWindow()
										) {
											event.preventDefault()
											event.stopPropagation()
										}
									}}
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
								<DropdownMenuItem disabled={isBusy} onClick={() => toolbarMetadata("tags")}>
									<Tags className="mr-2 size-4" />
									Heading tags{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-q</span>
								</DropdownMenuItem>
								<DropdownMenuItem disabled={isBusy} onClick={() => toolbarMetadata("scheduled")}>
									<CalendarClock className="mr-2 size-4" />
									Schedule{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-s</span>
								</DropdownMenuItem>
								<DropdownMenuItem disabled={isBusy} onClick={() => toolbarMetadata("deadline")}>
									<Flag className="mr-2 size-4" />
									Deadline{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-d</span>
								</DropdownMenuItem>
								<DropdownMenuItem disabled={isBusy} onClick={() => toolbarMetadata("property")}>
									<KeyRound className="mr-2 size-4" />
									Set property{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-p</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									disabled={isBusy || toolbarIsDirty}
									onClick={() => toolbarTransfer("refile")}
								>
									<Send className="mr-2 size-4" />
									Refile subtree
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={isBusy || toolbarIsDirty}
									onClick={() => toolbarTransfer("archive")}
								>
									<Archive className="mr-2 size-4" />
									Archive subtree
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div
						className={`grid min-h-0 flex-1 bg-background ${split ? "grid-cols-2" : "grid-cols-1"}`}
					>
						{((split ? ["primary", "secondary"] : ["primary"]) as ("primary" | "secondary")[]).map(
							(name) => {
								const buffer = bufferFor(name)
								if (!buffer) return null
								const runtime = buffer.runtime
								let runtimeMountId = 0
								if (runtime) {
									runtimeMountId =
										runtimeMountIds.current.get(runtime) ?? ++nextRuntimeMountId.current
									runtimeMountIds.current.set(runtime, runtimeMountId)
								}
								const baseSessionKey = `${controller.workspaceSessionId}\u0000${buffer.bufferId}`
								const boundWindowKey = `${baseSessionKey}:window:${name}`
								const matched = buffer.bufferId === controller.activeBufferId
								return (
									<div
										key={name}
										ref={(node) => {
											if (node) windowNodes.current.set(name, node)
											else windowNodes.current.delete(name)
										}}
										className="min-h-0 min-w-0 overflow-hidden border-r last:border-r-0"
										data-org-active-editor-window={activeWindow === name ? "true" : "false"}
										data-org-editor-window={name}
										onFocusCapture={() => selectWindow(name)}
										onKeyDownCapture={(event) => {
											if (
												event.defaultPrevented ||
												event.nativeEvent.defaultPrevented ||
												event.nativeEvent.isComposing ||
												event.keyCode === 229
											)
												return
											if (event.key === "Escape" && pendingWindow.current) {
												pendingWindow.current = null
												return
											}
											if (!selectWindow(name)) {
												const copy =
													(event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c"
												const navigation =
													/^(Arrow.*|Home|End|PageUp|PageDown|Shift|Control|Meta|Alt|Escape|Tab)$/.test(
														event.key,
													)
												if (!copy && !navigation) {
													event.preventDefault()
													event.stopPropagation()
												}
											}
										}}
										data-org-buffer-id={buffer.bufferId}
										data-org-focus-pending={!matched && isBusy ? "true" : undefined}
									>
										{!matched && isBusy && (
											<output role="status" className="block px-2 text-xs text-muted-foreground">
												Focus pending — waiting for file operation
											</output>
										)}
										<BoundEditor
											controller={controller}
											bufferId={buffer.bufferId}
											key={`${baseSessionKey}:runtime:${runtimeMountId}`}
											runtime={runtime}
											windowId={`${controller.workspaceSessionId ?? "local"}:pane:${paneId}:${name}`}
											sessionKey={
												controller.workspaceSessionId && controller.activeBufferId
													? name === "primary"
														? baseSessionKey
														: `${baseSessionKey}:window:secondary`
													: undefined
											}
											sessionCache={editorSessionCache}
											ariaLabel={`Editing ${buffer.document.relativePath}`}
											documentPath={buffer.document.relativePath}
											prefixContextKey={`${controller.workspaceSessionId ?? ""}\u0000${controller.workspace?.rootPath ?? ""}\u0000${controller.activeBufferId ?? ""}\u0000${visibleDocument.relativePath}\u0000${activeWindow}`}
											onPrefixChange={(next) => {
												prefixes.current.set(boundWindowKey, next)
												if (activeWindowRef.current === name) setPrefix(next)
											}}
											value={buffer.content}
											onChange={controller.updateContent}
											onCommandTarget={(target) => {
												const key = boundWindowKey
												if (target) targets.current.set(key, target)
												else {
													targets.current.delete(key)
													if (pendingWindow.current?.name === name) pendingWindow.current = null
												}
												if (activeWindowRef.current === name) commandTargetRef.current = target
											}}
											onOpenOrgLink={(target) => {
												if (selectWindow(name)) void controllerRef.current.openOrgLink(target)
											}}
											onCursorChange={(position) => {
												cursors.current.set(boundWindowKey, position)
												if (activeWindowRef.current === name) setCursor(position)
											}}
											onRefileSubtree={(position) => {
												if (!parameterSessionSuspended && selectWindow(name))
													parameterCommandRef.current.openRefile(position)
											}}
											onArchiveSubtree={(position) => {
												if (!parameterSessionSuspended && selectWindow(name))
													parameterCommandRef.current.openArchive(position)
											}}
											onEditTags={(position) => {
												if (selectWindow(name)) openMetadataCommandRef.current("tags", position)
											}}
											onSchedule={(position) => {
												if (selectWindow(name))
													openMetadataCommandRef.current("scheduled", position)
											}}
											onDeadline={(position) => {
												if (selectWindow(name)) openMetadataCommandRef.current("deadline", position)
											}}
											onSetProperty={(position) => {
												if (selectWindow(name)) openMetadataCommandRef.current("property", position)
											}}
											onSave={() => {
												if (selectWindow(name)) void controllerRef.current.saveDocument()
											}}
											readOnly={(controller.isEditorReadOnly ?? isBusy) || (!matched && isBusy)}
											revealTarget={
												activeWindow === name &&
												controller.revealTarget?.relativePath === buffer.document.relativePath
													? controller.revealTarget
													: null
											}
										/>
									</div>
								)
							},
						)}
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
