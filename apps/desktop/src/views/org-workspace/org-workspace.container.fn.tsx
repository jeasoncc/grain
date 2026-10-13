import { useOrgSourceTools } from "@/hooks/use-org-source-tools"
import { useOrgClockWorkflow } from "@/hooks/use-org-clock-workflow"
import { OrgClockReportView } from "./org-clock-report.view.fn"
import { OrgBabelWorkflowView } from "./org-babel-workflow.view.fn"
import { OrgSourceExportView } from "./org-source-export.view.fn"
import { OrgFileReviewView } from "./org-file-review.view.fn"
import type { OrgFileReview } from "@/flows/org-editor-runtime/org-file-review.types"
import { EditorView } from "@codemirror/view"
import { Link } from "@tanstack/react-router"
import {
	Database,
	FolderOpen,
	MoreHorizontal,
	PanelLeftOpen,
	Trash2,
} from "lucide-react"
import { lazy, memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react"
import { flushSync } from "react-dom"
import { Group, Panel, Separator } from "react-resizable-panels"
import { useOrgWorkspaceController, useOrgNativeWorkflowHandler } from "@/views/application/org-workspace-provider"
import type { OrgCapturedBufferNavigation, OrgCapturedBufferTransfer, OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgNativeWorkflowRequest } from "@/flows/org-native-window/org-native-workflow-bridge"
import { useOrgCommandMinibuffer } from "@/hooks/use-org-command-minibuffer"
import { getOrgParameterCommand } from "@/flows/org-command/org-workspace-command"
import { orgLinkTargetAt } from "@/pipes/org/org-link.pipe"
import { parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import { useSettings } from "@/hooks/use-settings"
import * as E from "fp-ts/Either"
import type { OrgTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import { createParameterSession, type ParameterSession } from "@/flows/org-command/parameter-session"
import {
	getOrgCommandDisabledReason,
	orgCommandDefinitions,
	isOrgCommandId,
} from "@/flows/org-command/org-workspace-command"
import type {
	OrgCommandContext,
	OrgCommandId,
} from "@/flows/org-command/org-workspace-command"
import { useDesktopMode } from "@/hooks/use-desktop-mode"
import { useOrgScopedInput } from "@/hooks/use-org-scoped-input"
import { OrgWhichKey } from "./org-which-key.view.fn"
import { listenForOrgDiaryCreation } from "@/io/event"
import { Button } from "@/views/ui/button"
import { useConfirm } from "@/views/ui/confirm"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/views/ui/dropdown-menu"
import { useOrgTodoNoteWorkflow } from "@/hooks/use-org-todo-note-workflow"
import { useOrgRoamWorkflow } from "@/hooks/use-org-roam-workflow"
import { useOrgRemarkWorkflow } from "@/hooks/use-org-remark-workflow"
import { OrgTodoNote } from "@/views/org-editor/org-todo-note.view.fn"
import { OrgCaptureWorkflow, type OrgCaptureToolLifecycle } from "./org-capture-workflow.view.fn"
import { OrgRoamWorkflowView } from "./org-roam-workflow.view.fn"
import { OrgRemarkWorkflowView } from "./org-remark-workflow.view.fn"
import { useApplicationCommandHost, useApplicationCommandRegistration, useApplicationParameterRegistration, useApplicationResultPublisher, type ApplicationCommandDescriptor, type ApplicationCommandResult } from "@/views/application/application-command-provider"
import { ApplicationToolSurface, useApplicationToolRegistration, useApplicationTools } from "@/views/application/application-tool-provider"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import { OrgAgendaContainer, type OrgAgendaToolLifecycle } from "./org-agenda.container.fn"
import { OrgDocumentPane } from "./org-document-pane.view.fn"
import type { OrgDocumentCommandPort } from "./org-document-pane.view.fn"
import type { OrgEditorCommandTarget, OrgEditorSessionSnapshot } from "@/views/org-editor/org-editor.types"
import { OrgInspector } from "./org-inspector.view.fn"
import { OrgQuickOpen } from "./org-quick-open.view.fn"
import { OrgBufferSwitch } from "./org-buffer-switch.view.fn"
import { OrgWorkspaceRibbon } from "./org-workspace-ribbon.view.fn"
import { OrgWorkspaceSidebar } from "./org-workspace-sidebar.view.fn"
import { escapeOrgLinkTarget } from "@/pipes/org/org-link-syntax.pipe"
import { OrgCaptureTemplateTarget, OrgCaptureTemplateContext } from "@/types"

const LegacyMigrationTools = lazy(() =>
	import("./org-legacy-migration-tools.view.fn").then((module) => ({
		default: module.OrgLegacyMigrationTools,
	})),
)

const LegacyMigrationMenuSection = ({
	controller,
	isBusy,
	sourcesEnabled,
	onEnableSources,
	parameters,
	context,
}: {
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
	readonly sourcesEnabled: boolean
	readonly onEnableSources: () => void
	readonly parameters: ParameterSession
	readonly context: RefObject<{ controller: OrgWorkspaceController; isBusy: boolean }>
}) => {
	const { mode, isLoading, error } = useDesktopMode()
	if (mode !== "legacy") {
		return (
			<>
				<DropdownMenuLabel>Legacy recovery</DropdownMenuLabel>
				<DropdownMenuItem asChild>
					<Link to="/history">About historical recovery</Link>
				</DropdownMenuItem>
				<DropdownMenuItem disabled title={error ?? undefined}>
					{isLoading ? "Checking native mode…" : "Requires explicit native legacy mode"}
				</DropdownMenuItem>
			</>
		)
	}
	return (
		<Suspense fallback={<DropdownMenuItem disabled>Loading legacy tools…</DropdownMenuItem>}>
			<LegacyMigrationTools
				controller={controller}
				isBusy={isBusy}
				sourcesEnabled={sourcesEnabled}
				onEnableSources={onEnableSources}
				parameters={parameters}
				context={context}
			/>
		</Suspense>
	)
}


const WorkspaceToolsMenu = ({
	controller,
	isBusy,
}: {
	readonly controller: OrgWorkspaceController
	readonly isBusy: boolean
}) => {
	const [legacySourcesEnabled, setLegacySourcesEnabled] = useState(false)
	const [legacyParameters] = useState(createParameterSession)
	const legacySelection = useSyncExternalStore(legacyParameters.subscribe, legacyParameters.getSnapshot, legacyParameters.getSnapshot)
	useApplicationParameterRegistration(legacyParameters, legacySelection.session)
	useLayoutEffect(() => { legacyParameters.attach(); return () => legacyParameters.detach() }, [legacyParameters])
	useLayoutEffect(() => {
		const lease = legacyParameters.getSnapshot().lease
		if (lease) legacyParameters.cancel(lease)
	}, [controller.workspaceSessionId, controller.workspace?.rootPath, controller.workspace?.capabilityToken, controller.activeBufferId, legacyParameters])
	const confirm = useConfirm()
	const lifetime = useRef<AbortController | null>(null)
	const latest = useRef({ controller, isBusy })
	latest.current = { controller, isBusy }
	const commandHost = useApplicationCommandHost()
	const commandOwner = useMemo(() => ({}), [controller.workspaceSessionId, controller.workspace?.rootPath, controller.workspace?.capabilityToken])
	useEffect(() => {
		const owner = new AbortController()
		lifetime.current = owner
		return () => owner.abort()
	}, [controller.workspaceSessionId, controller.workspace?.rootPath, controller.workspace?.capabilityToken])
	const clearIndex = async (captured: OrgWorkspaceController, owner: AbortController): Promise<ApplicationCommandResult> => {
		if (owner.signal.aborted || latest.current.isBusy || !captured.workspace)
			return { kind: "rejected", message: "Workspace index authority is no longer available" }
		const root = captured.workspace.rootPath
		const token = captured.workspace.capabilityToken
		const sessionId = captured.workspaceSessionId
		const accepted = await confirm({
			title: "Clear derived index?",
			description: "Clear the disposable Org index? Org files will not be changed.",
			confirmText: "Clear",
			cancelText: "Cancel",
			signal: owner.signal,
		})
		if (accepted !== true) return { kind: "cancelled" }
		const current = latest.current.controller
		if (owner.signal.aborted || lifetime.current !== owner || latest.current.isBusy ||
			current.workspace?.rootPath !== root || current.workspace?.capabilityToken !== token ||
			current.workspaceSessionId !== sessionId)
			return { kind: "rejected", message: "Workspace grant changed before index clearing" }
		await captured.clearDerivedIndex()
		return { kind: "success" }
	}
	useApplicationCommandRegistration(commandOwner, [
		{
			id: "workspace.rebuild-index", label: "Rebuild derived index", group: "Org index",
			getDisabledReason: () => !latest.current.controller.workspace ? "No workspace open"
				: latest.current.isBusy ? "Workspace operation is running"
				: latest.current.controller.isDirty ? "Save the current buffer before rebuilding its derived index" : null,
			capture: () => {
				const captured = latest.current.controller, owner = lifetime.current
				if (!owner || owner.signal.aborted || !captured.workspace) return { kind: "rejected", message: "No live workspace grant" }
				return async () => {
					if (lifetime.current !== owner || owner.signal.aborted || latest.current.isBusy || latest.current.controller.isDirty)
						return { kind: "rejected", message: "Workspace index context changed" }
					await captured.rebuildDerivedIndex()
					return { kind: "success" }
				}
			},
		},
		{
			id: "workspace.clear-index", label: "Clear derived index", group: "Org index",
			getDisabledReason: () => !latest.current.controller.workspace ? "No workspace open" : latest.current.isBusy ? "Workspace operation is running" : null,
			capture: () => {
				const captured = latest.current.controller, owner = lifetime.current
				return owner && !owner.signal.aborted && captured.workspace
					? () => clearIndex(captured, owner)
					: { kind: "rejected", message: "No live workspace grant" }
			},
		},
	])
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon-sm" aria-label="Workspace tools" title="Workspace tools">
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64" onCloseAutoFocus={(event) => {
				const session = legacyParameters.getSnapshot().session
				if (!session) return
				event.preventDefault()
				queueMicrotask(() => commandHost.focusParameter(session.id))
			}}>
				<DropdownMenuLabel>Org index</DropdownMenuLabel>
				<DropdownMenuItem
					disabled={!controller.workspace || controller.isDirty || isBusy}
					onClick={() => { void commandHost.execute("workspace.rebuild-index") }}
				>
					<Database className="mr-2 size-4" />
					Rebuild derived index
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={!controller.workspace || isBusy}
					onClick={() => { void commandHost.execute("workspace.clear-index") }}
				>
					<Trash2 className="mr-2 size-4" />
					Clear derived index
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<LegacyMigrationMenuSection
					controller={controller}
					isBusy={isBusy}
					sourcesEnabled={legacySourcesEnabled}
					onEnableSources={() => setLegacySourcesEnabled(true)}
					parameters={legacyParameters}
					context={latest}
				/>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

const OrgWorkspaceNotice = ({ controller }: { readonly controller: OrgWorkspaceController }) => {
	if (controller.error) {
		return (
			<div
				role="alert"
				aria-label="Workspace error"
				className="shrink-0 break-words border-b border-l-2 border-destructive/60 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-foreground"
			>
				<span className="mr-2 font-semibold">Error</span>
				{controller.error}
			</div>
		)
	}
	if (controller.migrationStatus) {
		return (
			<output
				role="status"
				aria-live="polite"
				className="block shrink-0 break-words border-b border-border/70 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
			>
				{controller.migrationStatus}
			</output>
		)
	}
	if (controller.derivedIndexStatus) {
		return (
			<output
				role="status"
				aria-live="polite"
				className="block shrink-0 break-words border-b border-border/70 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
			>
				{controller.derivedIndexStatus}
			</output>
		)
	}
	return null
}

const OrgRetainedWriteObjectsNotice = memo(function OrgOriginalInodesNotice({ workspace }: {
	readonly workspace: OrgWorkspaceController["workspace"]
}) {
	const [open, setOpen] = useState(false)
	const objects = workspace?.originalRecoveries
	const paths = useMemo(() => open ? objects?.map((entry) =>
		`${entry.object} (${entry.kind}): ${entry.sourceRelativePath}\n${workspace?.rootPath}/${entry.relativePath}`,
	).join("\n\n") ?? "" : "", [open, objects, workspace?.rootPath])
	if (!objects?.length) return null
	return <aside aria-label="Retained filesystem recovery objects" className="shrink-0 border-b bg-muted/20 px-3 py-2 text-xs">
		<details onToggle={(event) => setOpen(event.currentTarget.open)}>
			<summary>Filesystem objects retained for manual recovery: {objects.length}</summary>
			{open && <>
				<p>Named originals, stages, journals and publication probes are mutable filesystem artifacts, not immutable backups or authoritative editor Source. Open writers may still change them. No automatic replay, deletion or garbage collection.</p>
				<textarea readOnly aria-label="Copy filesystem recovery paths" value={paths} rows={5} className="mt-2 w-full font-mono" />
			</>}
		</details>
	</aside>
})

const OrgWorkspaceEmptyState = ({
	isLoading,
	onOpenDefault,
	onChooseDirectory,
}: {
	readonly isLoading: boolean
	readonly onOpenDefault: () => void
	readonly onChooseDirectory: () => void
}) => (
	<div className="flex min-h-0 flex-1 items-center justify-center p-8">
		<div className="flex max-w-sm flex-col items-center text-center">
			<div className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-muted/40">
				<FolderOpen className="size-5 text-muted-foreground" />
			</div>
			<h1 className="text-base font-semibold">Open an Org workspace</h1>
			<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
				Choose a local directory containing standard .org files. Grain will never replace them with
				database-only documents.
			</p>
			<div className="mt-5 flex items-center gap-2">
				<Button disabled={isLoading} onClick={onOpenDefault}>
					<FolderOpen className="mr-2 size-4" />
					{isLoading ? "Opening…" : "Open Documents/Grain"}
				</Button>
				<Button variant="outline" disabled={isLoading} onClick={onChooseDirectory}>
					Choose another…
				</Button>
			</div>
		</div>
	</div>
)

export const OrgWorkspaceContainer = memo(function OrgWorkspaceContainer() {
	const controller = useOrgWorkspaceController()
	const isBusy = controller.isWorkspaceBlocked
	const tools = useApplicationTools()
	const commandHost = useApplicationCommandHost()
	const controllerRef = useRef(controller)
	controllerRef.current = controller
	const commandPortRef = useRef<OrgDocumentCommandPort | null>(null)
	const [nativeInvocation, setNativeInvocation] = useState<OrgNativeWorkflowRequest | null>(null)
	const nativeInvocationRef = useRef(nativeInvocation)
	nativeInvocationRef.current = nativeInvocation
	const [nativeWorkflow, setNativeWorkflow] = useState<OrgNativeWorkflowRequest | null>(null)
	const nativeWorkflowRef = useRef(nativeWorkflow)
	nativeWorkflowRef.current = nativeWorkflow
	const nativeTransferRef = useRef<OrgCapturedBufferTransfer | null>(null)
	const nativeNavigationRef = useRef<OrgCapturedBufferNavigation | null>(null)
	const nativeLoggingNoteRef = useRef<OrgTodoNoteRequest | null>(null)
	const [nativeProducerRetained, setNativeProducerRetained] = useState(false)
	const nativeTargetRef = useRef<OrgEditorCommandTarget | null>(null)
	nativeTargetRef.current = nativeWorkflow?.target ?? null
	const nativeBuffer = nativeWorkflow && controller.liveBuffers.find((buffer) => buffer.bufferId === nativeWorkflow.bufferId)
	const nativeEffect = nativeBuffer ? controller.getBufferEffectState(nativeBuffer.bufferId) : null
	// A captured child Source facet does not activate or rebind the main pane.
	const workflowController = useMemo<OrgWorkspaceController>(() => nativeBuffer ? {
		...controller, activeBufferId: nativeBuffer.bufferId, activeBufferRuntime: nativeBuffer.runtime,
		activeDocument: nativeBuffer.document, content: nativeBuffer.runtime.source, isDirty: nativeBuffer.isDirty,
		isLoading: nativeEffect?.loading ?? false, isSaving: nativeEffect?.saving ?? false,
		isEditorReadOnly: nativeEffect?.readOnly ?? true,
		openOrgLink: (target) => nativeNavigationRef.current?.openOrgLink(target) ?? Promise.resolve(false),
		createDiary: () => nativeNavigationRef.current?.createDiary() ??
			Promise.resolve({ kind: "rejected", message: "The captured native navigation origin retired" }),
		readRefileTarget: (path, signal) => nativeTransferRef.current?.readRefileTarget(path, signal) ??
			Promise.resolve({ kind: "rejected", message: "The captured native transfer origin retired" }),
		refileSubtree: (cursor, path, selection) => nativeTransferRef.current?.refileSubtree(cursor, path, selection) ??
			Promise.resolve({ kind: "rejected", message: "The captured native transfer origin retired" }),
		archiveSubtree: (cursor) => nativeTransferRef.current?.archiveSubtree(cursor) ??
			Promise.resolve({ kind: "rejected", message: "The captured native transfer origin retired" }),
	} : controller, [controller, nativeBuffer, nativeEffect?.loading, nativeEffect?.saving, nativeEffect?.readOnly])
	const getProducerTarget = () => {
		const native = nativeInvocationRef.current ?? (nativeProducerRetained ? nativeWorkflowRef.current : null)
		if (native) return native.target
		return agendaOwnsContext() ? null : commandPortRef.current?.getTarget(controllerRef.current) ?? null
	}
	const nativeParameter = useOrgCommandMinibuffer(workflowController, isBusy, nativeTargetRef)
	const nativeParameterRef = useRef(nativeParameter)
	nativeParameterRef.current = nativeParameter
	const todoNote = useOrgTodoNoteWorkflow(controller, () => captureOrigin())
	const todoNoteOwnedRef = useRef(todoNote.isOwned)
	todoNoteOwnedRef.current = todoNote.isOwned
	const scopeKey = JSON.stringify([controller.workspaceSessionId, controller.workspace?.rootPath, controller.workspace?.capabilityToken])
	const toolOwner = useMemo(() => ({}), [scopeKey])
	const beginCaptureResult = useApplicationResultPublisher(toolOwner)
	const remarkParameterOwner = useMemo(() => ({}), [scopeKey])
	const beginRemarkResult = useApplicationResultPublisher(remarkParameterOwner)
	const roamParameterOwner = useMemo(() => ({}), [scopeKey])
	const beginRoamResult = useApplicationResultPublisher(roamParameterOwner)
	const captureOwner = useRef({}).current
	const [captureLifecycle, setCaptureLifecycle] = useState<OrgCaptureToolLifecycle | null>(null)
	const [agendaLifecycle, setAgendaLifecycle] = useState<OrgAgendaToolLifecycle | null>(null)
	const nativeAgendaRef = useRef<OrgNativeWorkflowRequest | null>(null)
	const updateAgendaLifecycle = useCallback((next: OrgAgendaToolLifecycle) => setAgendaLifecycle(next), [])
	const capturePrepareRef = useRef<(() => void) | null>(null)
	const captureOrigin = (): ApplicationToolOrigin | null => {
		const native = nativeInvocationRef.current ?? (nativeProducerRetained ? nativeWorkflowRef.current : null)
		if (native) return native.origin.isLive() ? native.origin : null
		const current = controllerRef.current
		const scope = JSON.stringify([current.workspaceSessionId, current.workspace?.rootPath, current.workspace?.capabilityToken])
		const fromAgenda = agendaOwnsContext()
		const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
		if (!fromAgenda) return commandPortRef.current?.captureToolOrigin(current) ?? null
		const liveScope = () => {
			const live = controllerRef.current
			return JSON.stringify([live.workspaceSessionId, live.workspace?.rootPath, live.workspace?.capabilityToken]) === scope
		}
		return {
			isLive: () => liveScope() && !!focused?.isConnected,
			restore: () => {
				if (focused?.isConnected) { tools.open(agendaLease); focused.focus() }
			},
		}
	}
	const agendaLease = useApplicationToolRegistration(toolOwner, {
		id: "agenda", label: "Agenda", layout: "main",
		state: agendaLifecycle?.state ?? { dirty: false, pending: false, fence: scopeKey },
		captureOrigin,
		ownsFocus: () => agendaLifecycle?.ownsFocus() ?? false,
		onOpen: () => {
			if (!controllerRef.current.workspace) return false
			nativeAgendaRef.current = nativeInvocationRef.current
			setAgendaLifecycle(null)
		},
		requestClose: () => agendaLifecycle?.close() ?? true,
		dispose: () => agendaLifecycle?.dispose(),
	})
	const inspectorLease = useApplicationToolRegistration(toolOwner, {
		id: "inspector", label: "Note inspector", layout: "side",
		state: { dirty: false, pending: false, fence: scopeKey },
		onOpen: () => !!controllerRef.current.workspace && !!controllerRef.current.activeDocument,
		captureOrigin, requestClose: () => true,
	})
	const captureLease = useApplicationToolRegistration(captureOwner, {
		id: "capture", label: "Capture scratch", layout: "bottom",
		state: captureLifecycle?.state ?? { dirty: false, pending: false, fence: scopeKey },
		captureOrigin,
		ownsFocus: () => captureLifecycle?.ownsFocus() ?? false,
		onOpen: () => {
			const current = controllerRef.current
			if (!current.workspace || current.isWorkspaceBlocked || todoNote.isOwned() || roamOwnedRef.current || remarkOwnedRef.current) return false
			capturePrepareRef.current?.()
			setCaptureLifecycle(null)
		},
		requestClose: () => captureLifecycle?.close() ?? true,
		dispose: () => captureLifecycle?.dispose(),
	})
	const showAgenda = tools.tools.some((tool) => tool.lease === agendaLease && tool.open)
	useEffect(() => { if (!showAgenda) nativeAgendaRef.current = null }, [showAgenda])
	const agendaReplacesSource = showAgenda && tools.tools.find((tool) => tool.lease === agendaLease)?.layout === "main"
	const agendaOwnsContext = () => agendaReplacesSource || !!document.activeElement?.closest('[data-application-tool="agenda"]') || !!agendaLifecycle?.ownsFocus()
	const showCapture = tools.tools.some((tool) => tool.lease === captureLease && tool.open)
	const inspectorVisible = tools.tools.some((tool) => tool.lease === inspectorLease && tool.open)
	const inspectorConfigured = tools.tools.find((tool) => tool.lease === inspectorLease)?.configured ?? false
	const setShowAgenda = (open: boolean) => {
		if (open) return tools.open(agendaLease)
		const closed = tools.complete(agendaLease)
		if (closed) nativeAgendaRef.current = null
		return closed
	}
	const returnFromAgenda = async (origin: OrgNativeWorkflowRequest | null) => {
		const activeOrigin = tools.registry.getSnapshot().some((tool) => tool.lease === agendaLease && tool.open)
			? nativeAgendaRef.current : null
		if (activeOrigin !== origin || !setShowAgenda(false)) return false
		if (origin) await origin.origin.restore()
		return true
	}
	const setShowCapture = (open: boolean) => open ? tools.open(captureLease) : tools.complete(captureLease)
	const setInspectorVisible = (value: boolean | ((previous: boolean) => boolean)) => {
		const open = typeof value === "function" ? value(inspectorVisible) : value
		if (open) tools.open(inspectorLease)
		else void tools.close(inspectorLease)
	}
	const commandPaletteVisible = commandHost.isOpen
	const setCommandPaletteVisible = (open: boolean) => open ? commandHost.open() : commandHost.close()
	const updateCaptureLifecycle = useCallback((next: OrgCaptureToolLifecycle) => setCaptureLifecycle(next), [])
	const captureReturnRef = useRef<{
		readonly getTemplateContext: (target: OrgCaptureTemplateTarget) => OrgCaptureTemplateContext
		readonly native: OrgNativeWorkflowRequest | null
	} | null>(null)
	capturePrepareRef.current = () => {
		const current = controllerRef.current
		const target = getProducerTarget()
		const context = target?.getCommandContext()
		const capturedAt = new Date()
		const sourcePath = context?.available ? context.relativePath : undefined
		const sourceRoot = current.workspace?.rootPath
		const from = context?.selectionFrom ?? context?.cursor ?? 0
		const to = context?.selectionTo ?? from
		const multiple = (context?.selectionRangeCount ?? 1) > 1
		const region = context?.available && !multiple ? context.content.slice(from, to) : ""
		let line = 1
		if (context?.available) for (let position = 0; position < from; position++) {
			if (context.content[position] === "\r") {
				line += 1
				if (context.content[position + 1] === "\n") position += 1
			} else if (context.content[position] === "\n") line += 1
		}
		captureReturnRef.current = {
			native: nativeInvocationRef.current,
			getTemplateContext: (destination) => {
				let annotation = ""
				if (sourcePath) {
					const parent = destination.relativePath.split("/")
					parent.pop()
					const source = sourcePath.split("/")
					let common = 0
					while (common < parent.length && common < source.length - 1 && parent[common] === source[common]) common += 1
					const relative = "../".repeat(parent.length - common) + source.slice(common).join("/")
					const label = sourcePath.replace(/[[\]\r\n]/g, " ")
					annotation = `[[${escapeOrgLinkTarget(`file:${relative}::${line}`)}][${label}:${line}]]`
				}
				return {
					date: capturedAt, region, annotation,
					...(multiple ? { regionUnavailableReason: "Capture %i requires one contiguous Source selection; choose one range and reopen Capture." } : {}),
					...(sourcePath ? { sourceRelativePath: sourcePath } : {}),
					...(sourcePath && sourceRoot ? { sourceAbsolutePath: `${sourceRoot.replace(/[\\/]$/, "")}/${sourcePath}` } : {}),
				}
			},
		}
	}
	const nativeCapture = captureReturnRef.current?.native
	const captureBuffer = nativeCapture?.isLive()
		? controller.liveBuffers.find((buffer) => buffer.bufferId === nativeCapture.bufferId) : null
	const captureController = useMemo<OrgWorkspaceController>(() => nativeCapture ? {
		...controller,
		activeBufferId: nativeCapture.bufferId,
		activeBufferRuntime: captureBuffer?.runtime ?? null,
		activeDocument: captureBuffer?.document ?? null,
		content: captureBuffer?.runtime.source ?? "",
		isDirty: captureBuffer?.isDirty ?? false,
		isEditorReadOnly: !captureBuffer || controller.getBufferEffectState(captureBuffer.bufferId)?.readOnly !== false,
		openDocumentPath: (path, expectedRevision, signal) => {
			const navigation = controllerRef.current.captureBufferNavigation(
				nativeCapture.bufferId, nativeCapture.windowId, nativeCapture.isLive, nativeCapture.navigate,
			)
			return navigation?.openDocumentAt(path, 1, expectedRevision, undefined, signal) ?? Promise.resolve(false)
		},
	} : controller, [controller, nativeCapture, captureBuffer])
	const nativeAgenda = nativeAgendaRef.current
	const agendaController = useMemo<OrgWorkspaceController>(() => nativeAgenda ? {
		...controller,
		openDocumentAt: (path, line, expectedRevision, isTargetCurrent, signal) => {
			const navigation = controllerRef.current.captureBufferNavigation(
				nativeAgenda.bufferId, nativeAgenda.windowId, nativeAgenda.isLive, nativeAgenda.navigate,
			)
			return navigation?.openDocumentAt(path, line, expectedRevision, isTargetCurrent, signal) ?? Promise.resolve(false)
		},
	} : controller, [controller, nativeAgenda])
	const [sidebarVisible, setSidebarVisible] = useState(true)
	const [quickOpenVisible, setQuickOpenVisible] = useState(false)
	const [bufferSwitchVisible, setBufferSwitchVisible] = useState(false)
	const [openDocumentPaths, setOpenDocumentPaths] = useState<readonly string[]>([])
	const navigationRequestRef = useRef(0)
	const workspaceViewRef = useRef<HTMLDivElement>(null)
	const editorSessionCacheRef = useRef(new Map<string, OrgEditorSessionSnapshot>())
	const hydratedSessionRef = useRef<string | null>(null)
	const openBufferPathKey = (controller.openBuffers ?? [])
		.map((buffer) => buffer.relativePath)
		.join("\u0000")
	useEffect(() => {
		const retained = new Set(
			(controller.openBuffers ?? []).flatMap((buffer) => {
				const base = `${controller.workspaceSessionId}\u0000${buffer.bufferId}`
				return [base, `${base}:window:secondary`]
			}),
		)
		for (const key of editorSessionCacheRef.current.keys()) {
			if (!retained.has(key)) editorSessionCacheRef.current.delete(key)
		}
	}, [controller.workspaceSessionId, controller.openBuffers])
	const pendingFileFocusRef = useRef<{
		readonly scope: string | null
		readonly root: string
		readonly path: string
	} | null>(null)
	const [sessionRoot, setSessionRoot] = useState<string | null>(null)
	const [navigationHistory, setNavigationHistory] = useState<{
		readonly index: number
		readonly paths: readonly string[]
	}>({ index: -1, paths: [] })
	const workspaceDocumentKey =
		controller.workspace?.documents.map((document) => document.relativePath).join("\u0000") ?? ""

	const remarkOwnedRef = useRef(false)
	const remarkNoteFocusedRef = useRef(false)
	const roam = useOrgRoamWorkflow({
		controller: nativeProducerRetained ? workflowController : controller,
		beginResult: beginRoamResult,
		getTarget: getProducerTarget,
		suspended: todoNote.isActive || showCapture || quickOpenVisible || bufferSwitchVisible || commandPaletteVisible || remarkOwnedRef.current || remarkNoteFocusedRef.current,
		onOpened: () => setShowAgenda(false),
	})
	const roamOwnedRef = useRef(roam.owned)
	roamOwnedRef.current = roam.owned
	const remarks = useOrgRemarkWorkflow({
		controller: nativeProducerRetained ? workflowController : controller,
		beginResult: beginRemarkResult,
		getTarget: getProducerTarget,
		suspended: todoNote.isActive || showCapture || quickOpenVisible || bufferSwitchVisible || commandPaletteVisible || roam.owned,
	})
	remarkOwnedRef.current = remarks.owned
	remarkNoteFocusedRef.current = remarks.noteFocused
	useEffect(() => {
		if (nativeInvocationRef.current) return
		const retained = !!nativeWorkflow && (!!nativeParameter.session || todoNote.isOwned() || roam.owned || remarks.owned || remarks.noteFocused)
		setNativeProducerRetained(retained)
		// Keep the real parameter result registration until its normal echo expiry.
		if (nativeWorkflow && !retained && !nativeParameter.result) {
			nativeTransferRef.current = null
			nativeNavigationRef.current = null
			setNativeWorkflow(null)
		}
	}, [nativeWorkflow, nativeParameter.session, nativeParameter.result, todoNote.isActive, roam.owned, remarks.owned, remarks.noteFocused])
	const sourceTools = useOrgSourceTools({
		controller,
		getTarget: getProducerTarget,
		captureOrigin,
	})
	const clockWorkflow = useOrgClockWorkflow({
		controller,
		getTarget: getProducerTarget,
		captureOrigin,
	})
	const [fileReviews, setFileReviews] = useState<readonly { review: OrgFileReview; origin: ApplicationToolOrigin | null }[]>([])
	const [fileReviewNotice, setFileReviewNotice] = useState<string | null>(null)
	const closeFileReview = useCallback((id: string) => setFileReviews((current) => current.filter((entry) => entry.review.id !== id)), [])
	const captureFileReviewCommand = (relativePath?: string) => {
		const current = controllerRef.current
		const target = getProducerTarget()
		const context = target?.getCommandContext()
		const buffer = current.liveBuffers.find((entry) => entry.document.relativePath === context?.relativePath)
		if (!context?.available || !context.windowId || !buffer) return null
		const read = current.captureFileReview(buffer.bufferId, context.windowId, relativePath)
		const origin = captureOrigin()
		if (!read) return null
		return async (): Promise<ApplicationCommandResult> => {
			const outcome = await read()
			if (outcome.kind !== "ready") return { kind: "rejected", message: outcome.kind === "rejected" ? outcome.message : "Review unavailable" }
			setFileReviews((previous) => [...previous, { review: outcome.review, origin }])
			return { kind: "success", message: "Authorized disk state opened for review; no write performed." }
		}
	}
	const captureAdoptedReviewOrigin = (review: OrgFileReview): ApplicationToolOrigin | null => {
		const bufferId = review.bufferId
		if (!bufferId) return null
		const buffer = controllerRef.current.liveBuffers.find((entry) => entry.bufferId === review.bufferId)
		if (!buffer || buffer.runtime.closed) return null
		const adoptedRuntime = buffer.runtime
		const isLive = () => !!workspaceViewRef.current?.isConnected && !adoptedRuntime.closed &&
			controllerRef.current.liveBuffers.some((entry) => entry.bufferId === review.bufferId && entry.runtime === adoptedRuntime)
		return {
			isLive,
			restore: () => {
				if (!isLive()) return
				let activated = false
				flushSync(() => { activated = controllerRef.current.activateOpenBuffer(bufferId) })
				if (!activated || !isLive()) return
				// Resolve the fresh mounted view after the handoff. No retired window
				// permit, selection snapshot or original runtime can authorize this focus.
				const slot = [...(workspaceViewRef.current?.querySelectorAll<HTMLElement>("[data-org-buffer-id]") ?? [])]
					.find((node) => node.dataset.orgBufferId === review.bufferId && !node.closest("[hidden]"))
				const content = slot?.querySelector<HTMLElement>(".cm-content")
				const view = content ? EditorView.findFromDOM(content) : null
				view?.focus()
			},
		}
	}
	const getCommandContext = (): OrgCommandContext => {
		const current = controllerRef.current
		const native = nativeInvocationRef.current
		const nativeContext = native?.target.getCommandContext()
		const origin = native && current.liveBuffers.find((buffer) => buffer.bufferId === native.bufferId)
		return {
			hasWorkspace: Boolean(current.workspace),
			hasDocument: native ? Boolean(origin) : Boolean(current.activeDocument),
			hasBuffers: Boolean(current.openBuffers?.length),
			hasDirtyBuffers: Boolean(current.openBuffers?.some((buffer) => buffer.isDirty)),
			isDirty: native ? origin?.isDirty ?? false : current.isDirty,
			isBusy: current.isWorkspaceBlocked,
			sidebarVisible,
			inspectorVisible,
			editor: nativeContext ?? (agendaOwnsContext() ? null : commandPortRef.current?.getContext(current)),
			blockedReason: todoNote.isOwned() ? "A TODO note is awaiting input"
				: roam.owned ? "An Org-roam session is awaiting input"
				: remarks.owned ? "An Org-remark session is awaiting input"
				: remarks.noteFocused ? "Focus the source window before a workspace command" : null,
		}
	}
	const commandContextRef = useRef(getCommandContext)
	commandContextRef.current = getCommandContext
	/** Delegated workspace effects; admission and exact-origin capture belong to the registry. */
	const executeWorkspaceCommand = (id: OrgCommandId, captured: OrgWorkspaceController): boolean => {
		if (id !== "quick-open") setQuickOpenVisible(false)
		if (id !== "buffer-switch") setBufferSwitchVisible(false)
		if (id.startsWith("remark-")) return remarks.execute(id)
		switch (id) {
			case "roam-find": return roam.openFind()
			case "roam-insert": return roam.openInsert()
			case "roam-new": return roam.openCreate()
			case "quick-open": setQuickOpenVisible(true); return true
			case "buffer-switch": setBufferSwitchVisible(true); return true
			case "buffer-next":
			case "buffer-previous": {
				const buffers = captured.openBuffers
				if (buffers.length < 2) return false
				const index = buffers.findIndex((buffer) => buffer.bufferId === captured.activeBufferId)
				const offset = id === "buffer-next" ? 1 : -1
				return captured.activateOpenBuffer(buffers[(Math.max(0, index) + offset + buffers.length) % buffers.length].bufferId)
			}
			case "agenda": return setShowAgenda(true) !== false
			case "capture": return setShowCapture(true) !== false
			case "files": setShowAgenda(false); setSidebarVisible(true); return true
			case "toggle-sidebar": setSidebarVisible((visible) => !visible); return true
			case "toggle-inspector": setInspectorVisible((visible) => !visible); return true
			default: return false
		}
	}
	const commandOwner = useMemo(() => ({}), [scopeKey])
	const getCurrentCommandDisabledReason = (id: OrgCommandId) => {
		const reason = getOrgCommandDisabledReason(id, commandContextRef.current())
		if (reason || id !== "save") return reason
		const current = controllerRef.current
		const effect = current.getBufferEffectState(nativeInvocationRef.current?.bufferId ?? current.activeBufferId ?? "")
		return !effect ? "No live buffer file authority"
			: effect.busy || effect.loading ? "This buffer's file operation is running" : null
	}
	const descriptors: readonly ApplicationCommandDescriptor[] = orgCommandDefinitions.map((definition) => ({
		id: definition.id,
		label: definition.label,
		group: "Org workspace",
		shortcut: "shortcut" in definition ? definition.shortcut : undefined,
		getDisabledReason: () => getCurrentCommandDisabledReason(definition.id),
		capture: () => {
			const reason = getCurrentCommandDisabledReason(definition.id)
			if (reason) return { kind: "rejected", message: reason }
			const capturedScope = scopeKey
			const capturedAgendaOrigin = definition.id === "editor" && showAgenda ? nativeAgendaRef.current : null
			if (definition.id === "reconcile-file") {
				return captureFileReviewCommand() ?? { kind: "rejected", message: "The exact mounted file/window is unavailable for review." }
			}
			if (definition.id === "clock-in" || definition.id === "clock-out" || definition.id === "cancel-clock" || definition.id === "clock-report")
				return clockWorkflow.capture(definition.id) ?? { kind: "rejected", message: "The exact Clock Source origin is unavailable" }
			if (definition.id === "babel-execute" || definition.id === "table-recalculate" || definition.id === "export-html" || definition.id === "export-markdown") {
				const run = definition.id === "babel-execute" || definition.id === "table-recalculate"
					? sourceTools.captureBabel(definition.id === "table-recalculate" ? "table" : "babel")
					: sourceTools.captureExport(definition.id === "export-html" ? "html" : "markdown")
				return run ?? { kind: "rejected", message: "The exact Source tool origin is unavailable" }
			}
			if (definition.id === "save") {
				const current = controllerRef.current
				const target = agendaOwnsContext() ? null : commandPortRef.current?.getTarget(current)
				const context = target?.getCommandContext()
				const bufferId = current.activeBufferId
				const runtime = current.activeBufferRuntime
				const save = current.activeBufferId ? current.captureBufferSave(current.activeBufferId) : null
				if (!save) return { kind: "rejected", message: "The originating buffer has no live file authority" }
				return async () => {
					const live = controllerRef.current
					// Explicit Save uses exact mounted-window identity plus file authority.
					// An autosave-paused reconciled working copy is not an edit/input permit.
					if (target && (live.activeBufferId !== bufferId || live.activeBufferRuntime !== runtime ||
						commandPortRef.current?.getTarget(live) !== target || !target.getCommandContext().available ||
						target.getCommandContext().ownership !== context?.ownership || target.getCommandContext().windowId !== context?.windowId))
						return { kind: "rejected", message: "The originating Source window changed before Save" }
					return await save() ? { kind: "success", message: "Source saved" }
						: { kind: "rejected", message: "The originating buffer was not saved; inspect its file status" }
				}
			}
			if (definition.id === "link") {
				const target = getProducerTarget()
				const origin = target?.captureSourceTransform?.()
				const context = target && Object.freeze({ ...target.getCommandContext() })
				const link = context && orgLinkTargetAt(context.content, context.cursor, context.relativePath)
				const navigation = nativeInvocationRef.current ? nativeNavigationRef.current : null
				const open = nativeInvocationRef.current ? navigation?.openOrgLink : controllerRef.current.openOrgLink
				if (!origin || !context || !link || !open)
					return { kind: "rejected", message: "The exact Source link/navigation origin is unavailable" }
				return async () => {
					const live = target!.getCommandContext()
					if (!origin.isCurrent() || live.cursor !== context.cursor || live.selectionFrom !== context.selectionFrom ||
						live.selectionTo !== context.selectionTo || live.selectionRangeCount !== context.selectionRangeCount)
						return { kind: "rejected", message: "The originating Source link/window changed" }
					return await open(link) ? { kind: "success" } : { kind: "rejected", message: "The captured link could not be followed" }
				}
			}
			const native = nativeInvocationRef.current
			if (native && definition.scope === "editor") {
				const context = Object.freeze({ ...native.target.getCommandContext() })
				const parameter = getOrgParameterCommand(definition.id, "")
				return async () => {
					if (nativeInvocationRef.current !== native || !native.isCurrent())
						return { kind: "rejected", message: "The captured native Source origin changed" }
					if (parameter) {
						const configuration = parseOrgBehaviorConfiguration(useSettings.getState().orgBehaviorConfigurationJson)
						if (E.isLeft(configuration)) return { kind: "rejected", message: configuration.left.message }
						const configured = getOrgParameterCommand(definition.id, "", undefined, configuration.right)
						if (!configured) return { kind: "rejected", message: "The captured Source parameter is unavailable" }
						const result = await nativeParameterRef.current.open(configured, context.cursor)
						return result?.ok === false ? { kind: "rejected", message: result.message } : { kind: "success" }
					}
					if (definition.id === "refile" || definition.id === "archive") {
						if (!nativeTransferRef.current) return { kind: "rejected", message: "The captured native transfer authority is unavailable" }
						if (definition.id === "refile") nativeParameterRef.current.openRefile(context.cursor)
						else nativeParameterRef.current.openArchive(context.cursor)
						return { kind: "success" }
					}
					return { kind: "rejected", message: "This command has no captured root workflow producer" }
				}
			}
			if (definition.scope === "editor") {
				const execute = commandPortRef.current?.capture(definition.id, controllerRef.current)
				if (!execute) return { kind: "rejected", message: "The originating editor window is no longer available" }
				return async () => await execute() ? { kind: "success" } : { kind: "rejected", message: "The originating editor window changed" }
			}
			const capturedController = controllerRef.current
			const target = getProducerTarget()
			const context = target ? Object.freeze({ ...target.getCommandContext() }) : null
			const windowSensitive = definition.id.startsWith("roam-") || definition.id.startsWith("remark-") || definition.id === "capture"
			return async () => {
				const live = controllerRef.current
				if (capturedScope !== JSON.stringify([live.workspaceSessionId, live.workspace?.rootPath, live.workspace?.capabilityToken]) ||
					(windowSensitive && target && (getProducerTarget() !== target || target.getCommandContext().ownership !== context?.ownership ||
						target.getCommandContext().windowId !== context?.windowId || target.getCommandContext().revision !== context?.revision ||
						target.getCommandContext().content !== context?.content || target.getCommandContext().cursor !== context?.cursor ||
						target.getCommandContext().selectionFrom !== context?.selectionFrom || target.getCommandContext().selectionTo !== context?.selectionTo ||
						target.getCommandContext().selectionRangeCount !== context?.selectionRangeCount)))
					return { kind: "rejected", message: "The originating workspace or editor window changed" }
				if (definition.id === "editor") return await returnFromAgenda(capturedAgendaOrigin)
					? { kind: "success" } : { kind: "rejected", message: "The captured Agenda return origin changed" }
				if (definition.id === "save-all") {
					const result = await capturedController.saveAllDocuments()
					return { kind: result.remainingDirtyPaths.length ? "rejected" : "success",
						message: `${result.savedPaths.length} buffer(s) saved; ${result.remainingDirtyPaths.length} still unsaved.${result.message ? ` ${result.message}` : ""}` }
				}
				if (definition.id === "refresh") { await capturedController.refreshWorkspace(); return { kind: "success" } }
				if (definition.id === "diary") {
					const result = await (native ? workflowController : capturedController).createDiary()
					if (result.kind === "created") { setShowAgenda(false); return { kind: "success" } }
					return { kind: "rejected", message: result.message }
				}
				return executeWorkspaceCommand(definition.id, capturedController) ? { kind: "success" } : { kind: "rejected", message: "Command rejected by its originating context" }
			}
		},
	}))
	useApplicationCommandRegistration(commandOwner, descriptors)
	useApplicationParameterRegistration(roamParameterOwner, roam.session, roam.parameterResult)
	useApplicationParameterRegistration(remarkParameterOwner, remarks.session, remarks.parameterResult)
	useApplicationParameterRegistration(nativeTargetRef, nativeParameter.session, nativeParameter.result)
	useOrgNativeWorkflowHandler(async (request) => {
		if (!request.isCurrent()) {
			await request.complete({ kind: "rejected", message: "The captured native Source origin retired" })
			return
		}
		if (nativeInvocationRef.current) {
			await request.complete({ kind: "rejected", message: "The captured native workflow is still finishing" })
			return
		}
		if ((commandHost.session && !commandHost.isOpen) || todoNoteOwnedRef.current() ||
			roamOwnedRef.current || remarkOwnedRef.current || remarkNoteFocusedRef.current) {
			await request.complete(await commandHost.execute(request.id))
			return
		}
		const current = controllerRef.current
		const baseTarget = request.target
		const context = baseTarget.getCommandContext()
		const buffer = current.liveBuffers.find((buffer) => buffer.bufferId === request.bufferId)
		const permit = current.captureBufferWindowPermit(request.windowId, request.bufferId)
		if (!buffer || buffer.runtime.source !== context.content || !permit()) {
			await request.complete({ kind: "rejected", message: "The exact native buffer/window authority is unavailable" })
			return
		}
		const captureLoggingNote: NonNullable<OrgEditorCommandTarget["captureLoggingNote"]> = () => {
			const transform = baseTarget.captureSourceTransform?.()
			if (!transform || context.readOnly || nativeLoggingNoteRef.current || !permit() || !request.isCurrent()) return null
			const sourceIsCurrent = () => permit() && request.isCurrent() && transform.isCurrent() &&
				nativeWorkflowRef.current === captured && baseTarget.getCommandContext().available &&
				baseTarget.getCommandContext().ownership === context.ownership
			return (source, label, execute, successMessage) => {
				if (source !== transform.snapshot.content || nativeLoggingNoteRef.current || !sourceIsCurrent()) return false
				let active = true
				let pending = false
				const listeners = new Set<() => void>()
				const isCurrent = () => active && nativeLoggingNoteRef.current === note && sourceIsCurrent()
				const validate = (): OrgTodoNoteResult => isCurrent() && !pending
					? { kind: "ready" } : { kind: "rejected", reason: "stale-note-request" }
				const note: OrgTodoNoteRequest = {
					label, origin: request.origin,
					successMessage: successMessage ?? "Org change accepted in the working copy. Save to write the file.",
					validate,
					subscribeValidation: (listener) => {
						listeners.add(listener)
						const unsubscribe = baseTarget.subscribeCommandContext?.(listener)
						return () => { listeners.delete(listener); unsubscribe?.() }
					},
					abort: () => {
						active = false
						if (nativeLoggingNoteRef.current === note) nativeLoggingNoteRef.current = null
						for (const listener of listeners) listener()
					},
					execute: async (text) => {
						const valid = validate()
						if (valid.kind !== "ready") return valid
						pending = true
						try {
							const result = await execute(text, isCurrent)
							if (result.kind === "applied" || result.kind === "aborted") note.abort()
							return result
						} catch (cause) {
							return { kind: "rejected", reason: cause instanceof Error ? cause.message : String(cause) }
						} finally { pending = false }
					},
				}
				nativeLoggingNoteRef.current = note
				if (!todoNote.admit(note)) note.abort()
				return active
			}
		}
		const captured: OrgNativeWorkflowRequest = {
			...request, target: { ...baseTarget, captureLoggingNote },
		}
		nativeTransferRef.current = current.captureBufferTransfer(request.bufferId, request.windowId, request.isCurrent)
		nativeNavigationRef.current = current.captureBufferNavigation(request.bufferId, request.windowId, request.isCurrent, request.navigate)
		nativeInvocationRef.current = captured
		flushSync(() => { setNativeInvocation(captured); setNativeWorkflow(captured); setNativeProducerRetained(true) })
		try {
			const result = await commandHost.execute(request.id)
			await request.complete(result)
			if (result.kind === "success" && (request.id === "clock-in" || request.id === "clock-out" || request.id === "cancel-clock"))
				await request.origin.restore()
		} finally {
			if (nativeInvocationRef.current === captured) {
				nativeInvocationRef.current = null
				// Publishing the completed invocation also commits its owned producer sessions.
				flushSync(() => setNativeInvocation(null))
			}
			const retained = !!nativeParameterRef.current.session || todoNoteOwnedRef.current() ||
				roamOwnedRef.current || remarkOwnedRef.current || remarkNoteFocusedRef.current
			setNativeProducerRetained(retained)
			if (!retained && !nativeParameterRef.current.result) {
				nativeTransferRef.current = null
				nativeNavigationRef.current = null
				setNativeWorkflow((current) => current === captured ? null : current)
			}
		}
	})
	const runCurrentCommand = (id: OrgCommandId) => { void commandHost.execute(id) }
	const applicationHostRef = useRef(commandHost)
	applicationHostRef.current = commandHost
	const shellInput = useOrgScopedInput({
		scope: "workspace", owner: commandOwner,
		acceptsEvent: () => true,
		execute: (id) => {
			const host = applicationHostRef.current
			if (id === "execute-command") return host.open()
			if (!host.registry.getSnapshot().commands.some((command) => command.id === id)) return false
			void host.execute(id)
			return true
		},
		onUnavailable: (id) => applicationHostRef.current.registry.publishResult({ kind: "rejected", message: `Command ${id} is unavailable in this workspace.` }),
	})

	useEffect(() => {
		if (todoNote.isActive || roam.owned || remarks.owned || remarks.noteFocused || quickOpenVisible || bufferSwitchVisible || showCapture) return
		const pending = pendingFileFocusRef.current
		pendingFileFocusRef.current = null
		if (
			pending &&
			pending.scope === controller.workspaceSessionId &&
			pending.root === controller.workspace?.rootPath &&
			pending.path === controller.activeDocument?.relativePath &&
			!commandPaletteVisible
		)
			(
				workspaceViewRef.current?.querySelector<HTMLElement>(
					'[data-org-active-editor-window="true"] .cm-content',
				) ?? workspaceViewRef.current?.querySelector<HTMLElement>(".cm-content")
			)?.focus()
	}, [
		todoNote.isActive,
		roam.owned,
		remarks.owned,
		remarks.noteFocused,
		quickOpenVisible,
		bufferSwitchVisible,
		showCapture,
		controller.workspaceSessionId,
		controller.workspace?.rootPath,
		controller.activeDocument?.relativePath,
		commandPaletteVisible,
	])

	useEffect(() => listenForOrgDiaryCreation(() => { void commandHost.execute("diary") }), [commandHost.execute])
	useEffect(() => {
		const rootPath = controller.workspace?.rootPath
		const grant = controller.workspaceSessionId ?? rootPath ?? null
		setQuickOpenVisible(false)
		setBufferSwitchVisible(false)
		setCommandPaletteVisible(false)
		// A Capture draft survives grant retirement as a read-only, copyable tool.
		pendingFileFocusRef.current = null
		hydratedSessionRef.current = null
		setSessionRoot(null)
		if (!rootPath) {
			setOpenDocumentPaths([])
			setNavigationHistory({ index: -1, paths: [] })
			setSidebarVisible(true)
			setInspectorVisible(false)
			return
		}
		let cancelled = false
		const available = new Set(
			controller.workspace?.documents.map((document) => document.relativePath) ?? [],
		)
		let activePath: string | null = null
		try {
			const raw = window.localStorage.getItem(`grain:org-session:${rootPath}`)
			const saved = raw
				? (JSON.parse(raw) as {
						activePath?: unknown
						inspectorVisible?: unknown
						openPaths?: unknown
						sidebarVisible?: unknown
					})
				: null
			const openPaths = Array.isArray(saved?.openPaths)
				? saved.openPaths.filter(
						(path): path is string => typeof path === "string" && available.has(path),
					)
				: []
			setOpenDocumentPaths(openPaths)
			setNavigationHistory({ index: -1, paths: [] })
			setSidebarVisible(typeof saved?.sidebarVisible === "boolean" ? saved.sidebarVisible : true)
			setInspectorVisible(
				typeof saved?.inspectorVisible === "boolean" ? saved.inspectorVisible : false,
			)
			if (typeof saved?.activePath === "string" && available.has(saved.activePath))
				activePath = saved.activePath
		} catch {
			setOpenDocumentPaths([])
			setNavigationHistory({ index: -1, paths: [] })
			setSidebarVisible(true)
			setInspectorVisible(false)
		}
		const finishRestore = async () => {
			if (activePath) await controller.openDocumentPath(activePath)
			if (!cancelled) {
				hydratedSessionRef.current = grant
				setSessionRoot(rootPath)
			}
		}
		void finishRestore()
		return () => {
			cancelled = true
		}
	}, [controller.workspace?.rootPath, controller.workspaceSessionId])
	useEffect(() => {
		if (
			!sessionRoot ||
			sessionRoot !== controller.workspace?.rootPath ||
			hydratedSessionRef.current !==
				(controller.workspaceSessionId ?? controller.workspace?.rootPath ?? null)
		)
			return
		try {
			window.localStorage.setItem(
				`grain:org-session:${sessionRoot}`,
				JSON.stringify({
					activePath: controller.activeDocument?.relativePath ?? null,
					inspectorVisible,
					openPaths: openDocumentPaths,
					sidebarVisible,
				}),
			)
		} catch {
			// UI session persistence is best-effort and never affects Org files.
		}
	}, [
		controller.activeDocument?.relativePath,
		controller.workspace?.rootPath,
		controller.workspaceSessionId,
		inspectorVisible,
		openDocumentPaths,
		sessionRoot,
		sidebarVisible,
	])
	useEffect(() => {
		const path = controller.activeDocument?.relativePath
		if (!path) return
		navigationRequestRef.current += 1
		setOpenDocumentPaths((current) => (current.includes(path) ? current : [...current, path]))
		setNavigationHistory((current) => {
			if (current.paths[current.index] === path) return current
			const paths = [...current.paths.slice(0, current.index + 1), path]
			return { index: paths.length - 1, paths }
		})
	}, [controller.activeDocument?.relativePath])
	useEffect(() => {
		const available = new Set([
			...(workspaceDocumentKey ? workspaceDocumentKey.split("\u0000") : []),
			...(openBufferPathKey ? openBufferPathKey.split("\u0000") : []),
		])
		setOpenDocumentPaths((current) => current.filter((path) => available.has(path)))
		setNavigationHistory((current) => {
			const activePath = current.paths[current.index]
			const paths = current.paths.filter((path) => available.has(path))
			const activeIndex = activePath ? paths.lastIndexOf(activePath) : -1
			return {
				index: activeIndex >= 0 ? activeIndex : Math.min(current.index, paths.length - 1),
				paths,
			}
		})
	}, [workspaceDocumentKey, openBufferPathKey])
	useEffect(() => {
		window.addEventListener("keydown", shellInput.handleKeyDown)
		return () => window.removeEventListener("keydown", shellInput.handleKeyDown)
	}, [shellInput.handleKeyDown])

	const navigateHistory = (offset: -1 | 1) => {
		const previousIndex = navigationHistory.index
		const nextIndex = previousIndex + offset
		const path = navigationHistory.paths[nextIndex]
		if (!path) return
		const requestId = navigationRequestRef.current + 1
		navigationRequestRef.current = requestId
		setNavigationHistory((current) => ({ ...current, index: nextIndex }))
		void controller.openDocumentPath(path).then((opened) => {
			if (!opened && requestId === navigationRequestRef.current) {
				setNavigationHistory((current) => ({ ...current, index: previousIndex }))
			}
		})
	}
	const closeTab = (relativePath: string) => {
		if (relativePath !== controller.activeDocument?.relativePath) {
			void controller.closeDocumentPath(relativePath).then((closed) => {
				if (closed)
					setOpenDocumentPaths((current) => current.filter((path) => path !== relativePath))
			})
			return
		}
		const remaining = openDocumentPaths.filter((path) => path !== relativePath)
		void controller.closeActiveDocument().then((closed) => {
			if (closed) setOpenDocumentPaths(remaining)
		})
	}

	return (
		<div
			ref={workspaceViewRef}
			data-org-workspace-host="true"
			className="flex h-full min-h-0 w-full flex-col bg-background"
		>
			<header className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-sidebar px-3">
				<div className="flex min-w-0 items-center gap-2 text-xs">
					<span className="font-semibold text-foreground">Grain</span>
					<span aria-hidden="true" className="text-muted-foreground/50">/</span>
					<span className="truncate text-muted-foreground">Org workspace</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 text-xs text-muted-foreground"
					onPointerDown={(event) => event.preventDefault()}
					onClick={() => {
						if (todoNoteOwnedRef.current() || roamOwnedRef.current || remarkOwnedRef.current) return
						commandHost.open()
					}}
					aria-label="Execute command (Alt-x)"
				>
					Commands <kbd className="text-[10px]">Alt-x</kbd>
				</Button>
			</header>
			{controller.protectedPaths.length > 0 && <section aria-label="Protected workspace paths" className="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-xs">
				<span>Each uncertain path needs its own review:</span>
				{controller.protectedPaths.map((path) => <Button key={path} size="sm" variant="outline"
					disabled={controller.isWorkspaceBlocked} onPointerDown={(event) => event.preventDefault()}
					onClick={() => {
						const read = captureFileReviewCommand(path)
						if (!read) { setFileReviewNotice("Focus a mounted Source window, then review this protected path."); return }
						void read().then((outcome) => setFileReviewNotice(outcome.kind === "rejected" ? outcome.message ?? "Review rejected." : null))
					}}>Review protected path: {path}</Button>)}
				{fileReviewNotice && <span role="status">{fileReviewNotice}</span>}
			</section>}
			{!controller.workspace && <OrgWorkspaceNotice controller={controller} />}
			{controller.workspace ? (
				<div className="flex min-h-0 flex-1">
					<OrgWorkspaceRibbon
						activeView={showAgenda ? "agenda" : "editor"}
						isBusy={isBusy}
						onCapture={() => runCurrentCommand("capture")}
						onCreateDiary={() => runCurrentCommand("diary")}
						onQuickOpen={() => runCurrentCommand("quick-open")}
						onShowAgenda={() => runCurrentCommand("agenda")}
						onShowFiles={() => runCurrentCommand("files")}
					/>
					<Group orientation="horizontal" id="org-workspace-layout">
						{sidebarVisible && (
							<>
								<Panel id="org-sidebar" defaultSize={280} minSize={220} maxSize={360}>
									<OrgWorkspaceSidebar
										key={controller.workspaceSessionId ?? controller.workspace.rootPath}
										controller={controller}
										isBusy={isBusy}
										tools={<WorkspaceToolsMenu controller={controller} isBusy={controller.isWorkspaceBusy} />}
										onCreateDiary={() => runCurrentCommand("diary")}
										onHide={() => runCurrentCommand("toggle-sidebar")}
										onShowEditor={() => setShowAgenda(false)}
									/>
								</Panel>
								<Separator className="relative w-1 bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border hover:after:bg-primary/40" />
							</>
						)}
						<Panel id="org-main" minSize={320}>
							<div className="flex h-full min-h-0 flex-col">
								<OrgWorkspaceNotice controller={controller} />
								<OrgRetainedWriteObjectsNotice workspace={controller.workspace} />
								{showAgenda && (
									<ApplicationToolSurface lease={agendaLease} className="flex min-h-0 flex-1 flex-col">
									<div inert={todoNote.isActive || roam.owned || remarks.owned} className="flex min-h-0 flex-1 flex-col">
										<div className="flex h-10 shrink-0 items-center border-b bg-muted/20 px-1">
											{!sidebarVisible && (
												<Button
													variant="ghost"
													size="icon"
													className="size-8"
													aria-label="Show sidebar"
													onClick={() => runCurrentCommand("toggle-sidebar")}
												>
													<PanelLeftOpen className="size-4" />
												</Button>
											)}
											<span className="px-2 text-xs font-medium">Agenda</span>
										</div>
										<OrgAgendaContainer
											controller={agendaController}
											onShowEditor={() => { runCurrentCommand("editor") }}
											onTodoNoteRequest={todoNote.admit}
											onToolLifecycle={updateAgendaLifecycle}
										/>
										<footer className="h-6 shrink-0 border-t border-border/70 bg-muted/20 px-3 text-right text-[11px] leading-6 text-muted-foreground">
											Workspace agenda
										</footer>
									</div>
									</ApplicationToolSurface>
								)}
								<div hidden={agendaReplacesSource} inert={agendaReplacesSource} className={agendaReplacesSource ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
									<OrgDocumentPane
										key={controller.workspaceSessionId ?? controller.workspace.rootPath}
										active={!agendaReplacesSource}
										canGoBack={navigationHistory.index > 0}
										canGoForward={
											navigationHistory.index >= 0 &&
											navigationHistory.index < navigationHistory.paths.length - 1
										}
										controller={controller}
										editorSessionCache={editorSessionCacheRef.current}
										remarkSnapshots={remarks.snapshots}
										commandPortRef={commandPortRef}
										onTodoNoteRequest={todoNote.admit}
										parameterSessionSuspended={
											todoNote.isActive ||
											quickOpenVisible ||
											bufferSwitchVisible ||
											commandPaletteVisible ||
											showCapture ||
											roam.owned ||
											remarks.owned ||
											remarks.noteFocused
										}
										inspectorVisible={inspectorVisible}
										isBusy={isBusy}
										openDocumentPaths={openDocumentPaths}
										sidebarVisible={sidebarVisible}
										onCloseTab={closeTab}
										onGoBack={() => navigateHistory(-1)}
										onGoForward={() => navigateHistory(1)}
										onQuickOpen={() => runCurrentCommand("quick-open")}
										onSelectTab={(relativePath) => {
											if (relativePath !== controller.activeDocument?.relativePath)
												void controller.openDocumentPath(relativePath)
										}}
									/>
								</div>
							</div>
						</Panel>
						{inspectorVisible && (
							<>
								<Separator style={inspectorConfigured || agendaReplacesSource ? { display: "none" } : undefined} className="relative w-1 bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border hover:after:bg-primary/40" />
								<Panel id="org-inspector" defaultSize={300} minSize={240} maxSize={380} style={inspectorConfigured || agendaReplacesSource ? { display: "none" } : undefined}>
									<ApplicationToolSurface lease={inspectorLease} className="h-full min-h-0">
									<OrgInspector
										controller={controller}
										active={!agendaReplacesSource || inspectorConfigured}
										onClose={() => { void tools.close(inspectorLease) }}
									/>
									</ApplicationToolSurface>
								</Panel>
							</>
						)}
					</Group>
				</div>
			) : (
				<OrgWorkspaceEmptyState
					isLoading={controller.isWorkspaceBusy}
					onOpenDefault={() => void controller.openDefaultWorkspace()}
					onChooseDirectory={() => void controller.selectWorkspace()}
				/>
			)}
			<OrgRoamWorkflowView tool={roam.tool} />
			<OrgRemarkWorkflowView workflow={remarks} controller={controller} />
			{sourceTools.babelTools.map((execution) => <OrgBabelWorkflowView key={execution.id} execution={execution} onClosed={sourceTools.closeBabel} />)}
			{sourceTools.exports.map((tool) => <OrgSourceExportView key={tool.id} tool={tool} onClosed={sourceTools.closeExport} />)}
			{clockWorkflow.reports.map((tool) => <OrgClockReportView key={tool.id} tool={tool} onClosed={clockWorkflow.closeReport} />)}
			{fileReviews.map(({ review, origin }) => <OrgFileReviewView key={review.id} review={review} origin={origin} controller={controller} onClosed={closeFileReview} captureAdoptedOrigin={captureAdoptedReviewOrigin} />)}
			{todoNote.note && (
				<OrgTodoNote
					key={todoNote.note.id}
					request={todoNote.note.request}
					origin={todoNote.note.origin}
					closeFence={todoNote.closeFence}
					onClose={todoNote.note.close}
					isProtected={todoNote.isProtected}
				/>
			)}
				<ApplicationToolSurface lease={captureLease}>
				<OrgCaptureWorkflow
					controller={captureController}
					open={showCapture}
					onToolLifecycle={updateCaptureLifecycle}
					requestDismiss={() => { void tools.close(captureLease) }}
					isToolEditable={() => tools.registry.getSnapshot().some((tool) => tool.lease === captureLease && tool.open && !tool.closing) &&
						(captureReturnRef.current?.native?.isLive() ?? true)}
					beginResult={beginCaptureResult}
					getTemplateContext={captureReturnRef.current?.getTemplateContext}
					onOpenChange={(open) => {
						setShowCapture(open)
						if (!open) { captureReturnRef.current = null; setCaptureLifecycle(null) }
					}}
					onRestoreOrigin={async (origin, signal) => {
						const live = controllerRef.current
						if (signal?.aborted || origin.scope.workspaceSessionId !== live.workspaceSessionId ||
							origin.scope.rootPath !== (live.workspace?.rootPath ?? null) ||
							origin.scope.capabilityToken !== live.workspace?.capabilityToken) return
						await tools.restoreOrigin(captureLease)
					}}
				/>
				</ApplicationToolSurface>
			{!todoNote.isActive && (
				<OrgBufferSwitch
					buffers={controller.openBuffers ?? []}
					activeBufferId={controller.activeBufferId}
					open={bufferSwitchVisible}
					onOpenChange={setBufferSwitchVisible}
					sessionKey={controller.workspaceSessionId ?? "unapproved"}
					onSelect={async (buffer, signal) => {
						const opened = await controller.switchBuffer(buffer.bufferId, signal)
						if (
							opened &&
							!signal?.aborted &&
							controllerRef.current.workspaceSessionId === controller.workspaceSessionId
						) {
							pendingFileFocusRef.current = {
								scope: controller.workspaceSessionId,
								root: controller.workspace?.rootPath ?? "",
								path: buffer.relativePath,
							}
							setShowAgenda(false)
						}
						return opened
					}}
				/>
			)}
			{!todoNote.isActive && (
				<OrgQuickOpen
					documents={controller.workspace?.documents ?? []}
					open={quickOpenVisible}
					onOpenChange={setQuickOpenVisible}
					sessionKey={controller.workspaceSessionId ?? controller.workspace?.rootPath}
					onSelect={async (document, signal) => {
						const opened = await controller.openDocument(document, undefined, signal)
						if (
							opened &&
							!signal?.aborted &&
							controllerRef.current.workspaceSessionId === controller.workspaceSessionId
						) {
							pendingFileFocusRef.current = {
								scope: controller.workspaceSessionId,
								root: controller.workspace?.rootPath ?? "",
								path: document.relativePath,
							}
							setShowAgenda(false)
						}
						return opened
					}}
				/>
			)}
			<OrgWhichKey prefix={shellInput.prefix} getInputCommandDisabledReason={(id) => {
				if (isOrgCommandId(id)) return getCurrentCommandDisabledReason(id)
				if (id === "execute-command") return commandHost.session ? "Finish or cancel the current parameter first" : null
				const command = commandHost.registry.getSnapshot().commands.findLast((command) => command.id === id)
				return command ? command.getDisabledReason() : "Unavailable in this workspace"
			}} />
		</div>
	)
})
