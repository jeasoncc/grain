import {
	AlertTriangle,
	Archive,
	ArrowLeft,
	CalendarClock,
	ArrowRight,
	ChevronDown,
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
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { OrgTodoNoteRequest } from "@/flows/org-command/org-todo-note"
import { useOrgCommandMinibuffer } from "@/hooks/use-org-command-minibuffer"
import {
	getOrgCommandDisabledReason,
	getOrgParameterCommand,
} from "@/flows/org-command/org-workspace-command"
import type {
	OrgCommandContext,
	OrgCommandEditorContext,
	OrgCommandId,
} from "@/flows/org-command/org-workspace-command"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgEditor, type OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgEditorSessionSnapshot } from "@/views/org-editor/org-editor.types"
import type { OrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgRemarkSnapshot } from "@/flows/org-editor-runtime/org-remark-tracker"
import { Button } from "@/views/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"
import { OrgWhichKey } from "./org-which-key.view.fn"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import { useApplicationCommandHost, useApplicationParameterRegistration } from "@/views/application/application-command-provider"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import * as E from "fp-ts/Either"
import { useSettings } from "@/hooks/use-settings"
import { parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"

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
	return (
		<OrgEditor
			{...props}
			getTodoNotePermit={() =>
				controller.captureBufferWindowPermit?.(props.windowId!, bufferId) ?? (() => false)
			}
		/>
	)
}
let nextPaneId = 0

/** Exact mounted editor origin; context lookup must never activate a parked window. */
export interface OrgDocumentCommandPort {
	readonly getContext: (controller: OrgWorkspaceController) => OrgCommandEditorContext | null
	readonly getTarget: (controller: OrgWorkspaceController) => OrgEditorCommandTarget | null
	readonly capture: (id: OrgCommandId, controller: OrgWorkspaceController) => (() => boolean | Promise<boolean>) | null
	readonly reportRejected: (reason: string) => void
	readonly focusParameter: () => boolean
	readonly captureToolOrigin: (controller: OrgWorkspaceController) => ApplicationToolOrigin | null
}

export const OrgDocumentPane = memo(function OrgDocumentPane({
	controller,
	active,
	isBusy,
	canGoBack,
	canGoForward,
	inspectorVisible,
	onCloseTab,
	onGoBack,
	onGoForward,
	onQuickOpen,
	onSelectTab,
	openDocumentPaths,
	sidebarVisible,
	parameterSessionSuspended = false,
	editorSessionCache,
	commandPortRef,
	onTodoNoteRequest,
	remarkSnapshots,
}: {
	readonly canGoBack: boolean
	readonly canGoForward: boolean
	readonly controller: OrgWorkspaceController
	/** Hidden main-layout Source keeps its projection but cannot own editing. */
	readonly active: boolean
	readonly inspectorVisible: boolean
	readonly isBusy: boolean
	readonly onCloseTab: (relativePath: string) => void
	readonly onGoBack: () => void
	readonly onGoForward: () => void
	readonly onQuickOpen: () => void
	readonly onSelectTab: (relativePath: string) => boolean | Promise<boolean>
	readonly openDocumentPaths: readonly string[]
	readonly sidebarVisible: boolean
	readonly onTodoNoteRequest?: (request: OrgTodoNoteRequest) => void
	readonly parameterSessionSuspended?: boolean
	readonly editorSessionCache?: Map<string, OrgEditorSessionSnapshot>
	readonly remarkSnapshots?: ReadonlyMap<OrgBufferRuntime, OrgRemarkSnapshot>
	readonly commandPortRef?: {
		current: OrgDocumentCommandPort | null
	}
}) {
	const controllerRef = useRef(controller)
	controllerRef.current = controller
	const activeDocument = controller.activeDocument
	const paneId = useRef(++nextPaneId).current
	const runtimeMountIds = useRef(new WeakMap<object, number>())
	const nextRuntimeMountId = useRef(0)
	const documentListTrigger = useRef<HTMLButtonElement | null>(null)
	const selectedDocumentNavigation = useRef<(() => Promise<void>) | null>(null)
	const liveCommandPort = useRef<OrgDocumentCommandPort | null>(null)
	const [split, setSplit] = useState(false)
	const [noteActionsOpen, setNoteActionsOpen] = useState(false)
	useEffect(() => { if (!active) setNoteActionsOpen(false) }, [active])
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
	const focusLease = useRef(0)
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
	const toolbarEffect = controller.getBufferEffectState(toolbarOrigin?.bufferId ?? controller.activeBufferId ?? "")
	const visibleDocument = activeDocument ?? liveBuffers[0]?.document
	const tabRailRef = useRef<HTMLElement | null>(null)
	const selectedTabRef = useRef<HTMLDivElement | null>(null)
	const documentTabs = useMemo(() => {
		const names = new Map<string, number>()
		for (const path of openDocumentPaths) {
			const name = path.split("/").at(-1) ?? path
			names.set(name, (names.get(name) ?? 0) + 1)
		}
		return openDocumentPaths.map((path) => {
			const name = path.split("/").at(-1) ?? path
			const separator = path.lastIndexOf("/")
			return {
				path,
				name: name.replace(/\.org$/i, ""),
				directory: names.get(name)! > 1 ? separator < 0 ? "Workspace" : path.slice(0, separator) : null,
			}
		})
	}, [openDocumentPaths])
	useLayoutEffect(() => {
		const rail = tabRailRef.current
		const selected = selectedTabRef.current
		if (!active || !rail || !selected) return
		const revealSelectedTab = () => {
			const viewport = rail.getBoundingClientRect()
			const tab = selected.getBoundingClientRect()
			if (tab.left < viewport.left) rail.scrollLeft += tab.left - viewport.left
			else if (tab.right > viewport.right) rail.scrollLeft += tab.right - viewport.right
		}
		revealSelectedTab()
		const observer = new ResizeObserver(revealSelectedTab)
		observer.observe(rail)
		return () => observer.disconnect()
	}, [active, activeDocument?.relativePath, openDocumentPaths])
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
			focusLease.current++
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
	const applicationHost = useApplicationCommandHost()
	const applicationHostRef = useRef(applicationHost)
	applicationHostRef.current = applicationHost
	const parameterOwner = useMemo(() => ({}), [
		controller.workspaceSessionId, controller.workspace?.rootPath, controller.workspace?.capabilityToken,
	])
	const parameterCommand = useOrgCommandMinibuffer(
		controller,
		isBusy,
		commandTargetRef,
		parameterSessionSuspended || windowCommandSuspended,
	)
	const minibuffer = parameterCommand.session
	const result = parameterCommand.result
	useApplicationParameterRegistration(parameterOwner, minibuffer, result)
	const focusedBuffer = bufferFor(activeWindow)
	const focusedContent = focusedBuffer?.content ?? controller.content
	const focusedDocument = focusedBuffer?.document ?? activeDocument
	const focusedSummary = controller.openBuffers?.find(
		(buffer) => buffer.bufferId === focusedBuffer?.bufferId,
	)
	const focusedIsDirty = focusedBuffer?.isDirty ?? controller.isDirty
	const focusedEffect = focusedBuffer ? controller.getBufferEffectState(focusedBuffer.bufferId) : null
	const focusedReadOnly = focusedEffect?.readOnly ?? true
	const line = useMemo(() => {
		if (!active) return 1
		const endings = /\r\n|\r|\n/g
		let count = 1
		for (let match = endings.exec(focusedContent); match && match.index < cursor; match = endings.exec(focusedContent)) count++
		return count
	}, [active, focusedContent, cursor])
	const wordCount = useMemo(() => {
		if (!active) return 0
		const words = /\S+/gu
		let count = 0
		while (words.exec(focusedContent)) count++
		return count
	}, [active, focusedContent])
	const parameterCommandRef = useRef(parameterCommand)
	parameterCommandRef.current = parameterCommand
	const openMetadataCommand = (type: OrgCommandId, position: number) => {
		if (!activeDocument || isBusy || parameterSessionSuspended) return false
		const configuration = parseOrgBehaviorConfiguration(useSettings.getState().orgBehaviorConfigurationJson)
		if (E.isLeft(configuration)) {
			parameterCommandRef.current.reportRejected(configuration.left.message)
			return false
		}
		const command = getOrgParameterCommand(type, "", undefined, configuration.right)
		if (!command) return false
		const result = parameterCommandRef.current.open(command, position)
		return result instanceof Promise ? result.then((outcome) => outcome?.ok ?? true) : result?.ok ?? true
	}

	// Toolbar events may be the first event after a refused DOM focus. Resolve
	// that origin before reading any render-bound command/controller or cursor.
	const resolveToolbarWindow = () => {
		const origin = pendingWindow.current
		if (parameterSessionSuspended) return false
		if (origin && !selectWindow(origin.name)) return false
		if (!commandTargetRef.current) return false
		// selectWindow flushes the controller handoff and suspends old parameter
		// sessions. Finish that fence before launching through the fresh hook ref.
		flushSync(() => setWindowCommandSuspended(false))
		return true
	}
	const openMetadataCommandRef = useRef(openMetadataCommand)
	openMetadataCommandRef.current = openMetadataCommand
	const localCommandPort: OrgDocumentCommandPort = {
		reportRejected: (reason) => parameterCommandRef.current.reportRejected(reason),
		focusParameter: () => {
			const session = parameterCommandRef.current.session
			const host = applicationHostRef.current
			return !!session && host.ownsParameter(session) && host.focusParameter(session.id)
		},
		captureToolOrigin: (expected) => {
			const context = localCommandPort.getContext(expected)
			const name = activeWindowRef.current
			const slot = windowNodes.current.get(name)
			const buffer = bufferFor(name)
			if (!context?.available || !slot || !buffer?.runtime) return null
			const { bufferId, runtime } = buffer
			const sourceNode = slot.querySelector<HTMLElement>(".cm-content")
			const capturedView = sourceNode ? EditorView.findFromDOM(sourceNode) : null
			const capturedSelection = capturedView?.state.selection
			const capturedSource = runtime.source
			const isLive = () => {
				const live = controllerRef.current
				return windowNodes.current.get(name) === slot && slot.isConnected &&
					live.workspaceSessionId === expected.workspaceSessionId &&
					live.workspace?.rootPath === expected.workspace?.rootPath &&
					live.workspace?.capabilityToken === expected.workspace?.capabilityToken &&
					live.liveBuffers.some((candidate) => candidate.bufferId === bufferId && candidate.runtime === runtime)
			}
			return {
				isLive,
				restore: () => {
					if (!isLive()) return
					const previousName = activeWindowRef.current
					const previousBinding = bindings.current[name]
					let activated = false
					flushSync(() => {
						activeWindowRef.current = name
						bindings.current[name] = bufferId
						activated = controllerRef.current.activateOpenBuffer(bufferId)
						if (!activated) {
							activeWindowRef.current = previousName
							bindings.current[name] = previousBinding
							return
						}
						lastActiveId.current = bufferId
						focusLease.current++
						pendingWindow.current = null
						setActiveWindow(name)
						prefixes.current.set(windowKey(name), null)
						setPrefix(null)
					})
					if (!activated || !isLive()) return
					const target = targets.current.get(windowKey(name))
					const restored = target?.getCommandContext()
					if (restored && restored.windowId === context.windowId && restored.available) {
						target?.restoreFocus()
						// Full multi-range selection belongs to this exact view/source lifetime,
						// not merely the primary range exposed by command context.
						if (capturedView && capturedSelection && runtime.source === capturedSource &&
							!runtime.closed && capturedView.dom.isConnected &&
							capturedView === (sourceNode ? EditorView.findFromDOM(sourceNode) : null))
							capturedView.dispatch({ selection: capturedSelection })
					}
				},
			}
		},
		getContext: (expected) => {
			const current = controllerRef.current
			const name = activeWindowRef.current
			const buffer = bufferFor(name)
			const target = targets.current.get(windowKey(name))
			if (
				pendingWindow.current ||
				!windowNodes.current.has(name) ||
				!target ||
				!buffer ||
				buffer.bufferId !== expected.activeBufferId ||
				current.activeBufferId !== expected.activeBufferId ||
				current.workspaceSessionId !== expected.workspaceSessionId ||
				current.workspace?.capabilityToken !== expected.workspace?.capabilityToken ||
				current.workspace?.rootPath !== expected.workspace?.rootPath ||
				(buffer.runtime ?? null) !== (expected.activeBufferRuntime ?? null)
			) return null
			const context = target.getCommandContext()
			return context.relativePath === expected.activeDocument?.relativePath ? context : null
		},
		getTarget: (expected) => localCommandPort.getContext(expected)?.available
			? targets.current.get(windowKey(activeWindowRef.current)) ?? null
			: null,
		capture: (command, expected) => {
			if (!localCommandPort.getContext(expected)?.available) return null
			const name = activeWindowRef.current
			const key = windowKey(name)
			const target = targets.current.get(key)!
			const lease = focusLease.current
			const parameter = getOrgParameterCommand(command, "")
			const transfer = command === "refile" || command === "archive"
			const clearSparse = command === "clear-sparse-tree"
			const paneOwned = Boolean(parameter) || transfer || clearSparse
			const origin = paneOwned ? target.captureSourceTransform?.() : null
			const node = paneOwned ? windowNodes.current.get(name)?.querySelector<HTMLElement>(".cm-content") : null
			const view = node ? EditorView.findFromDOM(node) : null
			const selection = view?.state.selection
			const execute = paneOwned ? null : target.captureCommand(command)
			if (paneOwned && (!origin || !view || !selection)) return null
			if (!execute && !parameter && !transfer && !clearSparse) return null
			return () => {
				if (
					lease !== focusLease.current ||
					activeWindowRef.current !== name ||
					targets.current.get(key) !== target ||
					!localCommandPort.getContext(expected)?.available ||
					getOrgCommandDisabledReason(command, paneCommandContext()) !== null
				) return false
				if (paneOwned && (!origin?.isCurrent() || !view?.dom.isConnected || !selection || !view.state.selection.eq(selection))) return false
				commandTargetRef.current = target
				if (parameter) {
					if (!origin?.isCurrent()) return false
					return openMetadataCommandRef.current(command, origin.snapshot.cursor)
				}
				if (transfer) {
					if (!origin?.isCurrent()) return false
					if (command === "refile") parameterCommandRef.current.openRefile(origin.snapshot.cursor)
					else parameterCommandRef.current.openArchive(origin.snapshot.cursor)
					return true
				}
				if (clearSparse) {
					parameterCommandRef.current.clearSparseTree()
					return true
				}
				return execute?.() ?? false
			}
		},
	}
	liveCommandPort.current = localCommandPort
	if (commandPortRef) commandPortRef.current = localCommandPort
	const paneCommandContext = (): OrgCommandContext => {
		const current = controllerRef.current
		return {
			hasWorkspace: Boolean(current.workspace),
			hasDocument: Boolean(current.activeDocument),
			hasBuffers: Boolean(current.openBuffers?.length),
			hasDirtyBuffers: Boolean(current.openBuffers?.some((buffer) => buffer.isDirty)),
			isDirty: current.isDirty,
			isBusy,
			sidebarVisible,
			inspectorVisible,
			editor: localCommandPort.getContext(current),
		}
	}
	// The synchronous key API only reports handling. Shared admission captures and
	// starts the real effect before execute reaches its first asynchronous boundary.
	const invokePaneCommand = (id: string) => {
		const host = applicationHostRef.current
		if (id === "execute-command") return host.open()
		if (!host.registry.getSnapshot().commands.some((command) => command.id === id)) return false
		void host.execute(id)
		return true
	}
	const dispatchPaneCommand = (id: OrgCommandId) => {
		const host = applicationHostRef.current
		if (host.session && !host.isOpen) return invokePaneCommand(id)
		if (!resolveToolbarWindow()) return false
		return invokePaneCommand(id)
	}
	const commandContext = paneCommandContext()

	const tabs = <nav ref={tabRailRef} aria-label="Open documents" className="flex min-w-0 flex-1 self-stretch overflow-x-auto">
		{documentTabs.map(({ path, name, directory }) => {
			const selected = path === activeDocument?.relativePath
			const buffer = controller.openBuffers?.find((item) => item.relativePath === path)
			const dirty = buffer?.isDirty ?? (selected && controller.isDirty)
			return <div
				key={path}
				ref={selected ? selectedTabRef : undefined}
				className={`group relative flex min-w-28 max-w-64 shrink-0 items-center gap-1 px-3 transition-colors ${selected ? "bg-background text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-t after:bg-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
				title={`${path}${dirty ? " — unsaved" : ""}${buffer?.hasConflict ? " — external conflict" : ""}`}
			>
				<button
					type="button"
					className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-2 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-current={selected ? "page" : undefined}
					aria-description={`${path}${dirty ? " — unsaved changes" : ""}${buffer?.hasConflict ? " — external conflict" : ""}`}
					title={path}
					onClick={() => onSelectTab(path)}
				>
					<span className="truncate">{name}</span>
					{directory && <>{" "}<span className="truncate text-[10px] text-muted-foreground">{directory}</span></>}
				</button>
				{dirty && <span className="shrink-0 text-primary" aria-label="Unsaved changes" title="Unsaved changes">•</span>}
				{buffer?.hasConflict && <span className="shrink-0 text-destructive" title="External conflict">
					<AlertTriangle className="size-3" aria-hidden="true" /><span className="sr-only">External conflict</span>
				</span>}
				<button
					type="button"
					className={`flex size-6 shrink-0 items-center justify-center rounded outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${selected ? "opacity-70" : "opacity-0"}`}
					aria-label={`Close ${path}`}
					onClick={() => onCloseTab(path)}
				><X className="size-3" /></button>
			</div>
		})}
	</nav>
	const documentList = documentTabs.length > 0 && <DropdownMenu onOpenChange={(open) => { if (open) selectedDocumentNavigation.current = null }}>
		<DropdownMenuTrigger asChild>
			<Button ref={documentListTrigger} variant="ghost" size="icon-sm" aria-label="Open notes" title="Open notes" disabled={isBusy}>
				<ChevronDown className="size-4" />
			</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto" onCloseAutoFocus={(event) => {
			const navigate = selectedDocumentNavigation.current
			selectedDocumentNavigation.current = null
			if (!navigate) return
			event.preventDefault()
			queueMicrotask(() => {
				if (!documentListTrigger.current?.isConnected) return
				documentListTrigger.current.focus({ preventScroll: true })
				void navigate()
			})
		}}>
			<DropdownMenuLabel className="text-xs text-muted-foreground">Open notes</DropdownMenuLabel>
			<DropdownMenuRadioGroup value={activeDocument?.relativePath ?? ""} onValueChange={(path) => {
				const origin = controllerRef.current
				const windowName = activeWindowRef.current
				const lease = focusLease.current
				selectedDocumentNavigation.current = async () => {
					const focused = document.activeElement
					if (!await onSelectTab(path)) return
					// Use the post-navigation port; a restored tab may not have had a live buffer yet.
					requestAnimationFrame(() => {
						const current = controllerRef.current
						if (lease !== focusLease.current || current.workspaceSessionId !== origin.workspaceSessionId ||
							current.workspace?.rootPath !== origin.workspace?.rootPath ||
							current.workspace?.capabilityToken !== origin.workspace?.capabilityToken ||
							activeWindowRef.current !== windowName || current.activeDocument?.relativePath !== path ||
							(document.activeElement !== focused && document.activeElement !== document.body)) return
						liveCommandPort.current?.getTarget(current)?.restoreFocus()
					})
				}
			}}>
				{documentTabs.map(({ path, name }) => {
					const buffer = controller.openBuffers?.find((item) => item.relativePath === path)
					const dirty = buffer?.isDirty ?? (path === activeDocument?.relativePath && controller.isDirty)
					return <DropdownMenuRadioItem key={path} value={path} aria-label={path} className="gap-2">
						<span className="min-w-0 flex-1">
							<span className="block truncate text-xs">{name}</span>
							<span className="block truncate text-[10px] text-muted-foreground">{path}</span>
						</span>
						{dirty && <span aria-label="Unsaved changes" className="text-primary">•</span>}
						{buffer?.hasConflict && <AlertTriangle className="size-3 shrink-0 text-destructive" aria-label="External conflict" />}
					</DropdownMenuRadioItem>
				})}
			</DropdownMenuRadioGroup>
		</DropdownMenuContent>
	</DropdownMenu>

	return (
		<main className="@container/org-document flex min-h-0 min-w-0 flex-1 flex-col bg-background">
			{visibleDocument ? (
				<>
					<div className="flex h-10 shrink-0 items-center gap-1 bg-muted/20 px-2">
						{!sidebarVisible && (
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Show sidebar"
								title="Show sidebar"
								onClick={() => dispatchPaneCommand("toggle-sidebar")}
							>
								<PanelLeftOpen className="size-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={!canGoBack || isBusy}
							aria-label="Go back"
							title="Go back"
							onClick={onGoBack}
						>
							<ArrowLeft className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={!canGoForward || isBusy}
							aria-label="Go forward"
							title="Go forward"
							onClick={onGoForward}
						>
							<ArrowRight className="size-4" />
						</Button>
						{tabs}
						{documentList}
						<div className="mx-1 w-1 shrink-0" aria-hidden="true" />
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={!toolbarIsDirty || isBusy || !toolbarEffect || toolbarEffect.busy || toolbarEffect.loading}
							title="Save (Ctrl+S)"
							aria-label="Save document"
							onClick={() => dispatchPaneCommand("save")}
						>
							<Save className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							className={split ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : undefined}
							aria-pressed={split}
							title={split ? "Close Org source split" : "Split Org source into two editor windows"}
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
								size="icon-sm"
								aria-label="Show note inspector"
								title="Show note inspector"
								onClick={() => dispatchPaneCommand("toggle-inspector")}
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
									size="icon-sm"
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
							{active && noteActionsOpen && (
							<DropdownMenuContent
								align="end"
								onCloseAutoFocus={(event) => {
									const session = parameterCommandRef.current.session
									if (session) {
										event.preventDefault()
										// Radix teardown may outlive this reader; never focus its replacement.
										window.setTimeout(() => {
											if (parameterCommandRef.current.session === session) localCommandPort.focusParameter()
										}, 0)
									}
								}}
							>
								<DropdownMenuItem disabled={getOrgCommandDisabledReason("sparse-tree", commandContext) !== null} onClick={() => dispatchPaneCommand("sparse-tree")}>
									Sparse tree
									<span className="ml-auto text-[10px] text-muted-foreground">C-c /</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={getOrgCommandDisabledReason("clear-sparse-tree", commandContext) !== null}
									onClick={() => dispatchPaneCommand("clear-sparse-tree")}
								>
									Clear sparse tree
								</DropdownMenuItem>
								<DropdownMenuItem disabled={getOrgCommandDisabledReason("tags", commandContext) !== null} onClick={() => dispatchPaneCommand("tags")}>
									<Tags className="mr-2 size-4" />
									Heading tags{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-q</span>
								</DropdownMenuItem>
								<DropdownMenuItem disabled={getOrgCommandDisabledReason("scheduled", commandContext) !== null} onClick={() => dispatchPaneCommand("scheduled")}>
									<CalendarClock className="mr-2 size-4" />
									Schedule{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-s</span>
								</DropdownMenuItem>
								<DropdownMenuItem disabled={getOrgCommandDisabledReason("deadline", commandContext) !== null} onClick={() => dispatchPaneCommand("deadline")}>
									<Flag className="mr-2 size-4" />
									Deadline{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-d</span>
								</DropdownMenuItem>
								<DropdownMenuItem disabled={getOrgCommandDisabledReason("property", commandContext) !== null} onClick={() => dispatchPaneCommand("property")}>
									<KeyRound className="mr-2 size-4" />
									Set property{" "}
									<span className="ml-auto text-[10px] text-muted-foreground">C-c C-p</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled={getOrgCommandDisabledReason("refile", commandContext) !== null} onClick={() => dispatchPaneCommand("refile")}>
									<Send className="mr-2 size-4" />
									Refile subtree
								</DropdownMenuItem>
								<DropdownMenuItem
									disabled={getOrgCommandDisabledReason("archive", commandContext) !== null}
									onClick={() => dispatchPaneCommand("archive")}
								>
									<Archive className="mr-2 size-4" />
									Archive subtree
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									disabled={!controller.nativeWindowsAvailable || controller.isWorkspaceBlocked}
									onClick={() => {
										if (!resolveToolbarWindow()) return
										const buffer = bufferFor(activeWindowRef.current)
										const context = commandTargetRef.current?.getCommandContext()
										if (buffer && context?.windowId) void controllerRef.current.detachBuffer(buffer.bufferId, context.windowId)
									}}
								>
									Detach to native window
								</DropdownMenuItem>
							</DropdownMenuContent>
							)}
						</DropdownMenu>
					</div>
					<div
						className={`grid min-h-0 flex-1 bg-background ${split ? "grid-cols-1 grid-rows-2 @[50rem]/org-document:grid-cols-2 @[50rem]/org-document:grid-rows-1" : "grid-cols-1"}`}
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
								const current = activeWindow === name
								const readOnly = controller.getBufferEffectState(buffer.bufferId)?.readOnly ?? true
								const summary = controller.openBuffers?.find((item) => item.bufferId === buffer.bufferId)
								return (
									<div
										key={name}
										ref={(node) => {
											if (node) windowNodes.current.set(name, node)
											else windowNodes.current.delete(name)
										}}
										className={`flex min-h-0 min-w-0 flex-col overflow-hidden ${split ? "border-b border-border/40 last:border-b-0 @[50rem]/org-document:border-b-0 @[50rem]/org-document:border-r @[50rem]/org-document:last:border-r-0" : ""}`}
										role="region"
										aria-label={`Org source window: ${buffer.document.relativePath}`}
										aria-current={current ? "true" : undefined}
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
										{(split || summary?.hasConflict || summary?.autosavePaused || readOnly) && (
										<div className={`flex min-h-8 min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1 text-[11px] ${current ? "bg-primary/5 text-foreground" : "bg-muted/10 text-muted-foreground"}`}>
											{split && <span className="min-w-0 flex-1 basis-20 truncate" title={buffer.document.relativePath}>
												{buffer.document.relativePath}
											</span>}
											{buffer.isDirty && <span className="shrink-0" title="Unsaved changes">Unsaved *</span>}
											{summary?.hasConflict && <span className="shrink-0 text-destructive">Conflict</span>}
											{readOnly && <span className="shrink-0">Read-only</span>}
											{(summary?.hasConflict || summary?.autosavePaused) && <button
												type="button"
												disabled={controller.isWorkspaceBlocked || readOnly}
												className="rounded border border-destructive/40 px-2 py-1 text-destructive outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
												onPointerDown={(event) => event.preventDefault()}
												onClick={() => {
													if (!selectWindow(name)) return
													void applicationHostRef.current.execute("reconcile-file")
												}}
											>Review / reconcile file</button>}
										</div>
										)}
										{!matched && isBusy && (
											<output role="status" className="block shrink-0 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
												Focus pending — waiting for file operation
											</output>
										)}
										<div className="min-h-0 flex-1 overflow-hidden">
										<BoundEditor
											controller={controller}
											bufferId={buffer.bufferId}
											key={`${baseSessionKey}:runtime:${runtimeMountId}`}
											runtime={runtime}
											remarkSnapshot={runtime ? remarkSnapshots?.get(runtime) : null}
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
											documentFilename={controller.workspace ? `${controller.workspace.rootPath.replace(/[\\/]+$/, "")}/${buffer.document.relativePath}` : null}
											captureClockContext={controller.clock.captureSparseContext}
											prefixContextKey={`${controller.workspaceSessionId ?? ""}\u0000${controller.workspace?.rootPath ?? ""}\u0000${controller.activeBufferId ?? ""}\u0000${visibleDocument.relativePath}\u0000${activeWindow}`}
											onPrefixChange={(next) => {
												prefixes.current.set(boundWindowKey, next)
												if (activeWindowRef.current === name) setPrefix(next)
											}}
											onTodoNoteRequest={onTodoNoteRequest}
											value={buffer.content}
											onChange={controller.updateContent}
											onCommand={(id) => {
												if (!selectWindow(name)) return false
												return dispatchPaneCommand(id)
											}}
											onInputCommand={(id) => {
												if (!selectWindow(name)) return false
												return invokePaneCommand(id)
											}}
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
											captureSave={() => {
												const expected = controllerRef.current
												const target = targets.current.get(boundWindowKey)
												const lease = focusLease.current
												const readerId = applicationHostRef.current.session?.id
												if (!target || activeWindowRef.current !== name ||
													expected.activeBufferId !== buffer.bufferId ||
													expected.activeBufferRuntime !== runtime ||
													localCommandPort.getTarget(expected) !== target) return null
												return async () => {
													const live = controllerRef.current
													if (lease !== focusLease.current || activeWindowRef.current !== name ||
														bindings.current[name] !== buffer.bufferId ||
														live.activeBufferId !== buffer.bufferId || live.activeBufferRuntime !== runtime ||
														live.workspaceSessionId !== expected.workspaceSessionId ||
														live.workspace?.rootPath !== expected.workspace?.rootPath ||
														live.workspace?.capabilityToken !== expected.workspace?.capabilityToken ||
														applicationHostRef.current.session?.id !== readerId ||
														targets.current.get(boundWindowKey) !== target ||
														localCommandPort.getTarget(live) !== target) return false
													// A modal producer keeps its own accepting reader while the
													// shared registry captures and drains the canonical Save.
													return (await applicationHostRef.current.registry.execute("save")).kind === "success"
												}
											}}
											onSave={() => {
												if (selectWindow(name)) dispatchPaneCommand("save")
											}}
											readOnly={readOnly || !active}
											revealTarget={
												activeWindow === name &&
												controller.revealTarget?.relativePath === buffer.document.relativePath
													? controller.revealTarget
													: null
											}
										/>
										</div>
									</div>
								)
							},
						)}
					</div>
				</>
			) : (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="flex h-10 shrink-0 items-center gap-1 bg-muted/20 px-2">
						{!sidebarVisible && (
							<Button variant="ghost" size="icon-sm" aria-label="Show sidebar" onClick={() => invokePaneCommand("toggle-sidebar")}>
								<PanelLeftOpen className="size-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={!canGoBack || isBusy}
							aria-label="Go back"
							onClick={onGoBack}
						>
							<ArrowLeft className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={!canGoForward || isBusy}
							aria-label="Go forward"
							onClick={onGoForward}
						>
							<ArrowRight className="size-4" />
						</Button>
						{tabs}
						{documentList}
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
			<OrgWhichKey prefix={!minibuffer && !parameterSessionSuspended ? prefix : null} commandContext={commandContext} />
			{active && <footer className="flex min-h-6 shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 px-3 py-0.5 text-[11px] text-muted-foreground">
				{focusedDocument && (
					<>
						{(focusedEffect?.saving || focusedIsDirty) && <output aria-live="polite" className="mr-auto shrink-0">
							{focusedEffect?.saving ? focusedIsDirty ? "Saving… · Unsaved changes" : "Saving…" : "Unsaved changes"}
						</output>}
						{focusedSummary?.hasConflict && <span className="shrink-0 text-destructive">External conflict</span>}
						{focusedSummary?.autosavePaused && !focusedSummary.hasConflict && <span className="shrink-0">Autosave paused</span>}
						{controller.error && <span className="shrink-0 text-destructive">Operation error</span>}
						{focusedReadOnly && <span className="shrink-0">Read-only · Operation locked</span>}
						<span className="shrink-0">Ln {line}</span>
						<span className="shrink-0">
							{wordCount} {wordCount === 1 ? "word" : "words"}
						</span>
					</>
				)}
			</footer>}
		</main>
	)
})
