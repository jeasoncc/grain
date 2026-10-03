import { useBlocker } from "@tanstack/react-router"
import * as E from "fp-ts/Either"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
	archiveOrgSubtreeFlow,
	areLegacyMigrationPlansEquivalent,
	captureOrgTodoFlow,
	captureOrgEntryFlow,
	clearOrgDerivedIndexFlow,
	createOrgDirectoryFlow,
	deleteOrgDocumentFlow,
	executeLegacyMigrationFlow,
	moveOrgDocumentFlow,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	prepareLegacyMigrationFlow,
	rebuildOrgDerivedIndexFlow,
	refileOrgSubtreeFlow,
	readOrgRefileTargetFlow,
	reopenDefaultOrgWorkspaceFlow,
	resolveOrgLinkTargetFlow,
	runLegacyMigrationRecoveryDrillFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
	selectOrgWorkspaceFlow,
	verifyLegacyMigrationRecoveryFlow,
} from "@/flows/org-workspace"
import {
	saveAllOrgDocumentsFlow,
	type OrgSaveAllCapture,
} from "@/flows/org-workspace/org-save-all.flow"
import { saveOrgWorkingCopyFlow } from "@/flows/org-workspace/org-save-working-copy.flow"
import type { OrgBufferRuntime } from "@/flows/org-editor-runtime"
import {
	createOrgParkedWorkingCopyReservoir,
	type OrgParkedWorkingCopy,
} from "@/flows/org-editor-runtime/org-parked-working-copy-reservoir"
import { createOrgBufferIdentityRegistry } from "@/flows/org-editor-runtime/org-buffer-identity-registry"
import type { OrgWorkspaceRuntimePorts } from "@/flows/org-editor-runtime/org-workspace-runtime-registry"
import { validOrgDate, type OrgTextEdit } from "@/pipes/org/org-text.pipe"
import {
	planOrgTodoTransition,
	validOrgLocalTimestamp,
	formatOrgLocalTimestamp,
} from "@/pipes/org/org-todo-logging.pipe"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import {
	hasOrgAgendaActionOrigin,
	validateOrgAgendaOrigin,
	type OrgAgendaEntry,
} from "@/pipes/org/org-agenda.pipe"
import { createOrgWorkspaceRuntimeRegistry } from "@/flows/org-editor-runtime/org-workspace-runtime-registry"
import { orgWorkspaceEventAdapter } from "@/io/event/org-workspace-event.adapter"
import {
	releaseOrgWorkspace,
	unwatchOrgWorkspace,
	watchOrgWorkspace,
} from "@/io/file/org-file.repository"
import {
	guardOrgWorkingCopyBaseline,
	planOrgWorkingCopyAck,
} from "@/pipes/editor/org-working-copy-ack.pipe"
import type { OrgRuntimeCommitContext } from "@/types/editor/org-runtime-owner.interface"
import type { OrgLinkClickTarget } from "@/pipes/org"
import type {
	OrgRefileTargetSnapshot,
	OrgRefileHeadingTarget,
} from "@/pipes/org/org-refile-target.pipe"
import { deriveOrgArchivePath, isSafeRelativeOrgPath } from "@/pipes/org/org-subtree-refile.pipe"
import type {
	OrgDocumentEntryInterface,
	OrgDocumentInterface,
	OrgWorkspaceInterface,
} from "@/types/org"
import type { WorkspaceInterface } from "@/types/workspace"
import { createDebouncedOrgWorkspaceRefresh, matchesOrgWorkspaceWatch } from "./org-workspace-watch"
import { useOrgWindowClose } from "./use-org-window-close"

export const ORG_WORKSPACE_PREFERENCE_KEY = "grain:org-workspace-preference"
export const ORG_AUTOSAVE_DELAY_MS = 1000
const DEFAULT_ORG_WORKSPACE_PREFERENCE = "default"

export interface OrgWorkspacePreferenceStorage {
	readonly getItem: (key: string) => string | null
	readonly removeItem: (key: string) => void
	readonly setItem: (key: string, value: string) => void
}

export const hasDefaultWorkspacePreference = (storage?: OrgWorkspacePreferenceStorage): boolean => {
	try {
		const target = storage ?? window.localStorage
		return target.getItem(ORG_WORKSPACE_PREFERENCE_KEY) === DEFAULT_ORG_WORKSPACE_PREFERENCE
	} catch {
		return false
	}
}

export const setDefaultWorkspacePreference = (
	enabled: boolean,
	storage?: OrgWorkspacePreferenceStorage,
): void => {
	try {
		const target = storage ?? window.localStorage
		if (enabled) {
			target.setItem(ORG_WORKSPACE_PREFERENCE_KEY, DEFAULT_ORG_WORKSPACE_PREFERENCE)
		} else {
			target.removeItem(ORG_WORKSPACE_PREFERENCE_KEY)
		}
	} catch {
		// Preference storage is optional UI state; capability-backed file access still works.
	}
}

export interface OrgWorkspaceRevealTarget {
	readonly relativePath: string
	readonly line: number
	readonly requestId: number
}

export type OrgCaptureOutcome = {
	readonly kind: "success" | "rejected" | "uncertain"
	readonly message?: string
}

export type OrgRefileTargetOutcome =
	| { readonly kind: "ready"; readonly snapshot: OrgRefileTargetSnapshot }
	| { readonly kind: "rejected"; readonly message: string }

export interface OrgRefileTargetSelection {
	readonly expectedTargetRevision: string
	readonly targetHeading?: Pick<OrgRefileHeadingTarget, "from" | "heading">
}

export type OrgSubtreeTransferOutcome =
	| { readonly kind: "success"; readonly message?: string }
	| { readonly kind: "rejected"; readonly message: string }
	| { readonly kind: "partial"; readonly message: string }

export type OrgSaveAllOutcome =
	| {
			readonly kind: "success"
			readonly savedPaths: readonly string[]
			readonly remainingDirtyPaths: readonly string[]
			readonly message?: string
	  }
	| {
			readonly kind: "partial"
			readonly savedPaths: readonly string[]
			readonly remainingDirtyPaths: readonly string[]
			readonly message?: string
	  }
	| {
			readonly kind: "rejected"
			readonly savedPaths: readonly string[]
			readonly remainingDirtyPaths: readonly string[]
			readonly message?: string
	  }

export interface OrgOpenBufferSummary {
	readonly bufferId: string
	readonly relativePath: string
	readonly isDirty: boolean
	readonly baseRevision: string
	readonly hasConflict: boolean
	readonly autosavePaused?: boolean
}

export interface OrgLiveBuffer {
	readonly runtimeIncarnation: string
	readonly sourceGeneration: number
	readonly bufferId: string
	readonly document: OrgDocumentInterface
	readonly content: string
	readonly runtime: OrgBufferRuntime
	readonly isDirty: boolean
}

export type OrgAgendaActionOutcome = {
	readonly kind: "confirmed" | "unchanged" | "rejected" | "stale"
	readonly message?: string
}

export type OrgAgendaCommand =
	| { readonly kind: "cycle-todo"; readonly timestamp?: string }
	| { readonly kind: "schedule" | "deadline"; readonly date: string }

export type OrgAgendaPlanningPreparation =
	| { readonly kind: "ready"; readonly entry: OrgAgendaEntry; readonly date: string | null }
	| { readonly kind: "stale" | "rejected"; readonly message?: string }

type OrgAgendaOperation =
	| OrgAgendaCommand
	| { readonly kind: "prepare"; readonly field: "schedule" | "deadline" }

/** Pure source-range planning, shared by preparation and execution before any allocation. */
const planAgendaOperation = (
	entry: OrgAgendaEntry,
	raw: string,
	operation: OrgAgendaOperation,
):
	| { readonly kind: "edit"; readonly edits: readonly OrgTextEdit[]; readonly done?: boolean }
	| OrgAgendaPlanningPreparation
	| OrgAgendaActionOutcome => {
	if (!entry.origin?.heading)
		return { kind: "rejected", message: "This agenda entry has no actionable heading." }
	if (operation.kind === "cycle-todo") {
		const plan = planOrgTodoTransition(raw, entry.origin.heading.from, operation.timestamp ?? "")
		return plan.kind === "edit"
			? plan
			: plan.kind === "noop"
				? { kind: "unchanged" }
				: {
						kind: "rejected",
						message:
							plan.reason === "needs-note"
								? "This TODO transition requires a note; the state was not changed."
								: `Cannot change TODO state: ${plan.reason}.`,
					}
	}
	const field = operation.kind === "prepare" ? operation.field : operation.kind
	const planner = createOrgPlanningCommand(field === "schedule" ? "SCHEDULED" : "DEADLINE", "")
	const context = {
		relativePath: entry.relativePath,
		content: raw,
		cursor: entry.origin.heading.from,
	}
	if (operation.kind === "prepare") {
		const prepared = planner.prepare(context)
		return prepared.kind === "rejected"
			? { kind: "rejected", message: prepared.message }
			: { kind: "ready", entry, date: prepared.initialInput || null }
	}
	const result = planner.execute(context, context, operation.date)
	return result.kind === "edit"
		? { kind: "edit", edits: [result.edit] }
		: result.kind === "no-change"
			? { kind: "unchanged" }
			: {
					kind: "rejected",
					message: result.kind === "rejected" ? result.message : "Unsupported agenda command.",
				}
}

/** Observation only: does not authorize a command or replace Root's fresh guards. */
export interface OrgAgendaExecutionOptions {
	readonly onCommitStarted?: () => void
}

export interface OrgWorkspaceController {
	readonly executeAgendaCommand: (
		entry: OrgAgendaEntry,
		command: OrgAgendaCommand,
		signal?: AbortSignal,
		options?: OrgAgendaExecutionOptions,
	) => Promise<OrgAgendaActionOutcome>
	/** Revalidates the current target without allocating a buffer or changing provenance. */
	readonly prepareAgendaPlanning: (
		entry: OrgAgendaEntry,
		kind: "schedule" | "deadline",
		signal?: AbortSignal,
	) => Promise<OrgAgendaPlanningPreparation>
	readonly actOnAgendaEntry: (
		entry: OrgAgendaEntry,
		signal?: AbortSignal,
	) => Promise<OrgAgendaActionOutcome>
	/** Live working-copy views; .org refresh/watch/CAS remains the disk authority. */
	readonly liveBuffers: readonly OrgLiveBuffer[]
	/** Mounted view lease permitting exact-source edits to its parked canonical runtime. */
	readonly registerBufferWindow: (windowId: string, bufferId: string) => () => void
	/**
	 * Synchronous memory-only context handoff, preserving canonical history.
	 * Returns false during file effects: callers must defer cross-buffer focus/commands
	 * and visibly lock the non-current view until the captured effect owner settles.
	 */
	readonly activateOpenBuffer: (bufferId: string) => boolean
	readonly workspaceSessionId: string | null
	readonly activeBufferId: string | null
	readonly activeBufferRuntime: OrgBufferRuntime | null
	readonly openBuffers: readonly OrgOpenBufferSummary[]
	readonly closeDocumentPath: (relativePath: string) => Promise<boolean>
	readonly switchBuffer: (bufferId: string, signal?: AbortSignal) => Promise<boolean>
	readonly workspace: OrgWorkspaceInterface | null
	readonly activeDocument: OrgDocumentInterface | null
	readonly content: string
	readonly isDirty: boolean
	readonly isLoading: boolean
	/** Ordinary/batch saves capture source without disabling typing or composition. */
	readonly isEditorReadOnly: boolean
	readonly isSaving: boolean
	readonly error: string | null
	readonly migrationStatus: string | null
	readonly derivedIndexStatus: string | null
	readonly revealTarget: OrgWorkspaceRevealTarget | null
	readonly openDefaultWorkspace: () => Promise<void>
	readonly selectWorkspace: () => Promise<void>
	readonly refreshWorkspace: () => Promise<void>
	readonly openDocument: (
		entry: OrgDocumentEntryInterface,
		expectedRevision?: string | null,
		signal?: AbortSignal,
	) => Promise<boolean>
	readonly openDocumentPath: (
		relativePath: string,
		expectedRevision?: string | null,
		signal?: AbortSignal,
	) => Promise<boolean>
	readonly openDocumentAt: (
		relativePath: string,
		line: number,
		expectedRevision?: string | null,
	) => Promise<boolean>
	readonly openOrgLink: (target: OrgLinkClickTarget) => Promise<boolean>
	readonly createDocument: (relativePath: string) => Promise<void>
	readonly captureEntry: (
		entrySource: string,
		targetRelativePath: string,
	) => Promise<OrgCaptureOutcome>
	readonly setTransientDirty: (id: string, dirty: boolean) => void
	readonly captureTodo: (title: string, targetRelativePath?: string) => Promise<void>
	readonly readRefileTarget: (path: string, signal?: AbortSignal) => Promise<OrgRefileTargetOutcome>
	readonly refileSubtree: (
		cursor: number,
		targetRelativePath: string,
		target?: OrgRefileTargetSelection,
	) => Promise<OrgSubtreeTransferOutcome>
	readonly archiveSubtree: (cursor: number) => Promise<OrgSubtreeTransferOutcome>
	readonly createDirectory: (relativePath: string) => Promise<void>
	readonly moveActiveDocument: (targetRelativePath: string) => Promise<void>
	readonly deleteActiveDocument: () => Promise<void>
	readonly migrateLegacyWorkspace: (legacyWorkspace: WorkspaceInterface) => Promise<void>
	readonly verifyLegacyMigration: (legacyWorkspace: WorkspaceInterface) => Promise<void>
	readonly runLegacyRecoveryDrill: (legacyWorkspace: WorkspaceInterface) => Promise<void>
	readonly rebuildDerivedIndex: () => Promise<void>
	readonly clearDerivedIndex: () => Promise<void>
	readonly updateContent: (content: string) => void
	readonly saveDocument: () => Promise<void>
	readonly saveAllDocuments: () => Promise<OrgSaveAllOutcome>
	readonly closeActiveDocument: () => Promise<boolean>
}

const initialOrgContent = (relativePath: string): string => {
	const filename = relativePath.split("/").at(-1) ?? relativePath
	const title = filename.replace(/\.org$/i, "")
	return `#+title: ${title}\n\n`
}

const directoryAndAncestors = (relativePath: string): readonly string[] => {
	const segments = relativePath.split("/").filter(Boolean)
	return segments.map((_, index) => segments.slice(0, index + 1).join("/"))
}

const shouldSkipExternalCheck = (checking: boolean, mutating: boolean): boolean =>
	checking || mutating

export const canContinueAfterOrgSave = (
	saved: boolean,
	contentBeingSaved: string | null,
	latestContent: string,
): boolean => saved && contentBeingSaved !== null && contentBeingSaved === latestContent

const canRefreshWorkspace = (
	workspace: OrgWorkspaceInterface | null,
	mutating: boolean,
): workspace is OrgWorkspaceInterface => workspace !== null && !mutating

export const updateWorkspaceDocument = (
	workspace: OrgWorkspaceInterface,
	document: OrgDocumentInterface,
): OrgWorkspaceInterface => {
	const entry = { relativePath: document.relativePath, revision: document.revision }
	const exists = workspace.documents.some(
		(current) => current.relativePath === document.relativePath,
	)
	return {
		...workspace,
		documents: (exists
			? workspace.documents.map((current) =>
					current.relativePath === document.relativePath ? entry : current,
				)
			: [...workspace.documents, entry]
		).sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
	}
}

export const isDirtyCaptureTarget = (
	activeDocument: OrgDocumentInterface | null,
	isDirty: boolean,
	targetRelativePath: string,
): boolean => isDirty && activeDocument?.relativePath === targetRelativePath

/** Runtime state for the file-authoritative Org workspace. */
export const useOrgWorkspace = (): OrgWorkspaceController => {
	const [workspace, setWorkspace] = useState<OrgWorkspaceInterface | null>(null)
	const [activeDocument, setActiveDocument] = useState<OrgDocumentInterface | null>(null)
	const [content, setContent] = useState("")
	const latestContentRef = useRef("")
	const [isDirty, setDirty] = useState(false)
	const [isLoading, setLoadingState] = useState(false)
	const loadingRef = useRef(false)
	const setLoading = (value: boolean) => {
		loadingRef.current = value
		setLoadingState(value)
	}
	const [isSaving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [migrationStatus, setMigrationStatus] = useState<string | null>(null)
	const [derivedIndexStatus, setDerivedIndexStatus] = useState<string | null>(null)
	const [revealTarget, setRevealTarget] = useState<OrgWorkspaceRevealTarget | null>(null)
	const revealRequestRef = useRef(0)
	const linkRequestRef = useRef(0)
	const refileTargetRequestRef = useRef(0)
	const liveWorkspaceRef = useRef(workspace)
	liveWorkspaceRef.current = workspace
	const openRequestRef = useRef(0)
	const mutationInProgressRef = useRef(false)
	const mutationOwnerRef = useRef<symbol | null>(null)
	const agendaCommandOwnerRef = useRef<symbol | null>(null)
	const rootApprovalOwnerRef = useRef<symbol | null>(null)
	const finishMutation = (owner: symbol) => {
		if (mutationOwnerRef.current !== owner) return
		mutationOwnerRef.current = null
		mutationInProgressRef.current = false
		setSaving(false)
		setLoading(false)
	}
	const refreshWorkspaceRef = useRef<() => Promise<void>>(async () => undefined)
	const saveAllOwnerRef = useRef<symbol | null>(null)
	const saveInFlightRef = useRef<Promise<boolean> | null>(null)
	const saveInFlightContentRef = useRef<string | null>(null)
	// Latched per working copy; editing cannot make an uncertain write safe to retry.
	const autosavePausedRef = useRef(new Set<string>())
	const restoreAttemptedRef = useRef(false)
	const refreshRetryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	const workspaceRoot = workspace?.rootPath ?? null
	const [workspaceSessionId, setWorkspaceSessionId] = useState<string | null>(null)
	const sessionRef = useRef<string | null>(null)
	const grantRef = useRef<OrgWorkspaceInterface | null>(null)
	const activationRef = useRef(0)
	const mountedRef = useRef(true)
	const nativeCloseReadyRef = useRef(false)
	const originGrant = grantRef.current
	const originSession = workspaceSessionId
	const originActivation = activationRef.current
	const originPath = activeDocument?.relativePath ?? null
	const isCurrentOrigin = () =>
		parkedReservoir.canMutate() &&
		nativeCloseReadyRef.current &&
		mountedRef.current &&
		grantRef.current === originGrant &&
		sessionRef.current === originSession &&
		activationRef.current === originActivation &&
		(activeRef.current?.relativePath ?? null) === originPath
	const registryRef = useRef<ReturnType<typeof createOrgWorkspaceRuntimeRegistry> | null>(null)
	if (!registryRef.current) registryRef.current = createOrgWorkspaceRuntimeRegistry()
	const registry = registryRef.current
	const runtimeIncarnationsRef = useRef(new WeakMap<OrgBufferRuntime, string>())
	const runtimeIncarnation = (runtime: OrgBufferRuntime): string => {
		let incarnation = runtimeIncarnationsRef.current.get(runtime)
		if (!incarnation) {
			incarnation = crypto.randomUUID()
			runtimeIncarnationsRef.current.set(runtime, incarnation)
		}
		return incarnation
	}
	const bufferWindowLeasesRef = useRef(
		new Map<
			string,
			{
				readonly bufferId: string
				readonly grant: OrgWorkspaceInterface
				readonly session: string
			}
		>(),
	)
	const [activeBufferRuntime, setActiveBufferRuntime] = useState<OrgBufferRuntime | null>(null)
	const transientDirtyRef = useRef(new Map<string, boolean>())
	const transientGenerationRef = useRef(0)
	const identityRegistryRef = useRef<ReturnType<typeof createOrgBufferIdentityRegistry> | null>(
		null,
	)
	if (!identityRegistryRef.current) identityRegistryRef.current = createOrgBufferIdentityRegistry()
	const bufferIdentity = identityRegistryRef.current
	const parkedReservoirRef = useRef<ReturnType<typeof createOrgParkedWorkingCopyReservoir> | null>(
		null,
	)
	if (!parkedReservoirRef.current)
		parkedReservoirRef.current = createOrgParkedWorkingCopyReservoir(bufferIdentity, (failure) => {
			if (mountedRef.current) setError(`Parked observer failure: ${failure.kind}`)
		})
	const parkedReservoir = parkedReservoirRef.current
	useSyncExternalStore(
		parkedReservoir.subscribe,
		parkedReservoir.getSnapshot,
		parkedReservoir.getSnapshot,
	)
	const identityScope =
		originGrant && originSession ? { grant: originGrant, sessionId: originSession } : null
	const conflictsRef = useRef(new Set<string>())
	const editGenerationRef = useRef(0)
	const activeRef = useRef(activeDocument)
	activeRef.current = activeDocument
	const [, publishBuffers] = useState(0)
	const bufferIdFor = useCallback(
		(path: string): string =>
			bufferIdentity.ensure(
				originGrant && originSession ? { grant: originGrant, sessionId: originSession } : null,
				path,
			),
		[bufferIdentity, originGrant, originSession],
	)
	const mirrorSource = (value: string) => {
		if (latestContentRef.current === value) return
		editGenerationRef.current += 1
		latestContentRef.current = value
		setContent(value)
		setDirty(value !== activeRef.current?.content)
	}
	const runtimeKey = (id: string) => ({
		workspaceSessionId: sessionRef.current ?? "",
		bufferId: id,
	})
	const runtimeFor = (id: string) => registry.get(runtimeKey(id))
	const retireBuffer = (path: string) => {
		const id = bufferIdentity.lookup(identityScope, path)
		if (id) {
			parkedReservoir.retire(identityScope, id)
			registry.retire(runtimeKey(id))
		}
		bufferIdentity.retire(identityScope, path)
	}
	const installParkedSource = (path: string, value: string) => {
		const id = bufferIdentity.lookup(identityScope, path)
		if (id) registry.install(runtimeKey(id), value)
	}
	const closeRuntimes = () => {
		bufferWindowLeasesRef.current.clear()
		registry.close()
		setActiveBufferRuntime(null)
	}
	// Shared grant-local ports for active and command-created parked runtimes.
	const runtimePorts = (
		grant: OrgWorkspaceInterface,
		session: string,
	): OrgWorkspaceRuntimePorts => {
		const identityScope = { grant, sessionId: session }
		return {
			readCommitContext: (key, previous, next, originWindowId): OrgRuntimeCommitContext => {
				const lease = originWindowId ? bufferWindowLeasesRef.current.get(originWindowId) : undefined
				const path = activeRef.current?.relativePath
				const parkedPath = bufferIdentity.findPath(identityScope, key.bufferId)
				return {
					mounted: mountedRef.current,
					closeReady: nativeCloseReadyRef.current,
					grantMatches: grantRef.current === grant,
					sessionMatches: sessionRef.current === session && key.workspaceSessionId === session,
					originWindowId,
					registeredWindowBufferId:
						lease?.grant === grant && lease.session === session ? lease.bufferId : undefined,
					isActiveOwner:
						path !== undefined && bufferIdentity.lookup(identityScope, path) === key.bufferId,
					previous,
					next,
					activeSource: latestContentRef.current,
					parkedSource: parkedPath
						? parkedReservoir.read(identityScope, parkedPath)?.content
						: undefined,
					runtimeBufferId: key.bufferId,
					loading: loadingRef.current,
					notificationInProgress: !parkedReservoir.canMutate(),
					mutationInProgress: mutationInProgressRef.current,
					ordinarySaveInFlight: Boolean(saveInFlightRef.current),
				}
			},
			commitSource: (key, source) => {
				const path = bufferIdentity.findPath(identityScope, key.bufferId)
				if (path === activeRef.current?.relativePath) mirrorSource(source)
				else if (path) {
					const parked = parkedReservoir.read(identityScope, path)
					if (parked)
						parkedReservoir.mirrorReplacement(identityScope, key.bufferId, {
							previous: parked.content,
							source,
						})
				}
			},
			emitFailure: (key, failure) => {
				if (
					mountedRef.current &&
					grantRef.current === grant &&
					sessionRef.current === session &&
					key.workspaceSessionId === session &&
					bufferIdentity.findPath(identityScope, key.bufferId) !== undefined
				)
					setError(failure.message)
			},
		}
	}
	// Root captures authority and supplies snapshots/mirrors; the reservoir owns leases.
	const installSource = (value: string) => {
		const document = activeRef.current
		const session = sessionRef.current
		const grant = grantRef.current
		if (!document || !session || !grant) {
			setActiveBufferRuntime(null)
			mirrorSource(value)
			return
		}
		const identityScope = { grant, sessionId: session }
		const id = bufferIdentity.ensure(identityScope, document.relativePath)
		registry.activate(runtimeKey(id), value, runtimePorts(grant, session), {
			prepareSource: (source) => {
				latestContentRef.current = source
				setContent(source)
			},
			setActiveRuntime: setActiveBufferRuntime,
		})
		setDirty(latestContentRef.current !== document.content)
	}
	const dirtyPath = useCallback(
		(path: string): boolean =>
			(activeRef.current?.relativePath === path &&
				latestContentRef.current !== activeRef.current.content) ||
			Boolean(
				parkedReservoir.read(
					grantRef.current && sessionRef.current
						? { grant: grantRef.current, sessionId: sessionRef.current }
						: null,
					path,
				)?.isDirty,
			),
		[],
	)
	const protectedPath = (path: string) =>
		dirtyPath(path) || autosavePausedRef.current.has(path) || conflictsRef.current.has(path)
	// Install only a confirmed filesystem body. A concurrent working copy keeps its
	// canonical source/history, but receives the accepted disk baseline for reconciliation.
	const installedTargetSource = (
		confirmed: OrgDocumentInterface,
		expected: OrgParkedWorkingCopy | undefined,
		activeBody = latestContentRef.current,
		activeGeneration = editGenerationRef.current,
	): boolean => {
		const path = confirmed.relativePath
		let newer = false
		if (activeRef.current?.relativePath === path) {
			newer =
				latestContentRef.current !== activeBody ||
				editGenerationRef.current !== activeGeneration ||
				protectedPath(path)
			activeRef.current = confirmed
			setActiveDocument(confirmed)
			if (!newer) installSource(confirmed.content)
			if (latestContentRef.current !== confirmed.content) newer = true
			setDirty(latestContentRef.current !== confirmed.content)
		} else {
			const parked = parkedReservoir.read(identityScope, path)
			if (parked) {
				const id = bufferIdentity.lookup(identityScope, path)
				const runtime = id ? runtimeFor(id) : undefined
				newer =
					parked !== expected ||
					parked.content !== parked.document.content ||
					Boolean(runtime && runtime.source !== parked.content) ||
					protectedPath(path)
				if (!newer) installParkedSource(path, confirmed.content)
				const working = runtime?.source ?? (newer ? parked.content : confirmed.content)
				if (working !== confirmed.content) newer = true
				parkedReservoir.installConfirmedBaseline(
					identityScope,
					parked.bufferId,
					parkedReservoir.read(identityScope, path) ?? parked,
					{
						document: confirmed,
						content: working,
						isDirty: working !== confirmed.content,
					},
				)
			}
		}
		if (newer) {
			autosavePausedRef.current.add(path)
			conflictsRef.current.add(path)
		}
		publishBuffers((version) => version + 1)
		return newer
	}
	const hasDirtyBuffers = () =>
		[...transientDirtyRef.current.values()].some(Boolean) ||
		autosavePausedRef.current.size > 0 ||
		conflictsRef.current.size > 0 ||
		Boolean(activeRef.current && dirtyPath(activeRef.current.relativePath)) ||
		parkedReservoir.list(identityScope).some((buffer) => buffer.isDirty)
	const setTransientDirty = useCallback(
		(id: string, dirty: boolean) => {
			// Draft ownership is grant-local, not tied to editor activation (A/B/A).
			if (
				!parkedReservoir.canMutate() ||
				!mountedRef.current ||
				grantRef.current !== originGrant ||
				sessionRef.current !== originSession
			)
				return
			if (Boolean(transientDirtyRef.current.get(id)) === dirty) return
			transientGenerationRef.current += 1
			if (dirty) transientDirtyRef.current.set(id, true)
			else transientDirtyRef.current.delete(id)
			publishBuffers((version) => version + 1)
		},
		[originGrant, originSession],
	)
	const aggregateDirty = hasDirtyBuffers()
	const openBuffers: readonly OrgOpenBufferSummary[] = [
		...parkedReservoir
			.list(identityScope)
			.map((buffer) => [buffer.document.relativePath, buffer] as const)
			.map(([relativePath, buffer]) => ({
				baseRevision: buffer.document.revision,
				bufferId: bufferIdFor(relativePath),
				hasConflict: conflictsRef.current.has(relativePath),
				autosavePaused: autosavePausedRef.current.has(relativePath),
				isDirty: buffer.isDirty,
				relativePath,
			})),
		...(activeDocument
			? [
					{
						baseRevision: activeDocument.revision,
						bufferId: bufferIdFor(activeDocument.relativePath),
						hasConflict: conflictsRef.current.has(activeDocument.relativePath),
						autosavePaused: autosavePausedRef.current.has(activeDocument.relativePath),
						isDirty,
						relativePath: activeDocument.relativePath,
					},
				]
			: []),
	]

	const liveBuffers: readonly OrgLiveBuffer[] = [
		...parkedReservoir.list(identityScope).map((buffer) => ({
			bufferId: buffer.bufferId,
			document: buffer.document,
			content: buffer.content,
			runtime: runtimeFor(buffer.bufferId)!,
			isDirty: buffer.isDirty,
		})),
		...(activeDocument && activeBufferRuntime
			? [
					{
						bufferId: bufferIdFor(activeDocument.relativePath),
						document: activeDocument,
						content,
						runtime: activeBufferRuntime,
						isDirty,
					},
				]
			: []),
	]
		.filter((buffer) => Boolean(buffer.runtime))
		.map((buffer) => ({
			...buffer,
			runtimeIncarnation: runtimeIncarnation(buffer.runtime),
			sourceGeneration: buffer.runtime.revision,
		}))

	const registerBufferWindow = useCallback(
		(windowId: string, bufferId: string): (() => void) => {
			if (
				!windowId ||
				!mountedRef.current ||
				!parkedReservoir.canMutate() ||
				!originGrant ||
				!originSession ||
				grantRef.current !== originGrant ||
				sessionRef.current !== originSession
			)
				return () => undefined
			const path = bufferIdentity.findPath(identityScope, bufferId)
			if (
				!path ||
				!runtimeFor(bufferId) ||
				(activeRef.current?.relativePath !== path && !parkedReservoir.read(identityScope, path))
			)
				return () => undefined
			const lease = { bufferId, grant: originGrant, session: originSession }
			bufferWindowLeasesRef.current.set(windowId, lease)
			return () => {
				if (bufferWindowLeasesRef.current.get(windowId) === lease)
					bufferWindowLeasesRef.current.delete(windowId)
			}
		},
		[originGrant, originSession],
	)

	const activateOpenBuffer = useCallback(
		(bufferId: string): boolean => {
			// Focus changes are grant-local, not tied to the previously active pane.
			if (
				!mountedRef.current ||
				!nativeCloseReadyRef.current ||
				!parkedReservoir.canMutate() ||
				!originGrant ||
				!originSession ||
				grantRef.current !== originGrant ||
				sessionRef.current !== originSession ||
				loadingRef.current ||
				mutationInProgressRef.current ||
				saveInFlightRef.current ||
				saveAllOwnerRef.current
			)
				return false
			const path = bufferIdentity.findPath(identityScope, bufferId)
			if (!path) return false
			if (activeRef.current?.relativePath === path) return true
			const parked = parkedReservoir.read(identityScope, path)
			const runtime = runtimeFor(bufferId)
			if (!parked || !runtime || runtime.closed || runtime.source !== parked.content) return false
			const previous = activeRef.current
			if (previous)
				parkedReservoir.park(identityScope, bufferIdFor(previous.relativePath), {
					document: previous,
					content: latestContentRef.current,
					editGeneration: editGenerationRef.current,
					isDirty: latestContentRef.current !== previous.content,
				})
			parkedReservoir.takeToActivate(identityScope, bufferId)
			openRequestRef.current += 1
			activationRef.current += 1
			activeRef.current = parked.document
			setActiveDocument(parked.document)
			latestContentRef.current = parked.content
			editGenerationRef.current += 1
			setContent(parked.content)
			setDirty(parked.isDirty)
			setActiveBufferRuntime(runtime)
			setRevealTarget(null)
			return true
		},
		[originGrant, originSession, bufferIdFor],
	)

	const nativeCloseReady = useOrgWindowClose(
		{
			get hasDirtyBuffers() {
				return hasDirtyBuffers()
			},
			get isBusy() {
				return mutationInProgressRef.current
			},
		},
		setError,
	)

	nativeCloseReadyRef.current = nativeCloseReady

	useBlocker({
		disabled: false,
		enableBeforeUnload: aggregateDirty || isSaving || isLoading,
		shouldBlockFn: () => {
			if (mutationInProgressRef.current) {
				setError("A workspace operation is running; wait for it to finish before leaving.")
				return true
			}
			return hasDirtyBuffers() && !window.confirm("Discard unsaved Org document changes?")
		},
	})

	useEffect(() => {
		if (!workspace || !activeDocument) {
			return
		}
		let disposed = false
		let checking = false
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: revision checks and async commit guards must stay together.
		const checkForExternalChange = async () => {
			if (!isCurrentOrigin() || shouldSkipExternalCheck(checking, mutationInProgressRef.current)) {
				return
			}
			checking = true
			const generation = editGenerationRef.current
			const requestGeneration = openRequestRef.current
			const result = await openOrgDocumentFlow({
				relativePath: activeDocument.relativePath,
				capabilityToken: workspace.capabilityToken,
				workspaceRoot: workspace.rootPath,
			})()
			checking = false
			if (
				disposed ||
				mutationInProgressRef.current ||
				requestGeneration !== openRequestRef.current ||
				!isCurrentOrigin()
			) {
				return
			}
			if (E.isLeft(result)) {
				if (protectedPath(activeDocument.relativePath)) {
					conflictsRef.current.add(activeDocument.relativePath)
					autosavePausedRef.current.add(activeDocument.relativePath)
				}
				setError(`Cannot refresh ${activeDocument.relativePath}: ${result.left.message}`)
				return
			}
			if (result.right.revision === activeDocument.revision) {
				return
			}
			if (protectedPath(activeDocument.relativePath) || generation !== editGenerationRef.current) {
				conflictsRef.current.add(activeDocument.relativePath)
				autosavePausedRef.current.add(activeDocument.relativePath)
				setError(`External modification detected for ${activeDocument.relativePath}.`)
				return
			}
			conflictsRef.current.delete(activeDocument.relativePath)
			activeRef.current = result.right
			setActiveDocument(result.right)
			installSource(result.right.content)
			setWorkspace((current) =>
				current ? updateWorkspaceDocument(current, result.right) : current,
			)
		}
		const timer = window.setInterval(() => void checkForExternalChange(), 2000)
		return () => {
			disposed = true
			window.clearInterval(timer)
		}
	}, [activeDocument, isDirty, workspace, dirtyPath])

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: async generation/conflict guards must stay adjacent to state commits.
	const refreshWorkspace = useCallback(async () => {
		const sourceDocument = activeRef.current
		if (!workspace || !isCurrentOrigin()) {
			return
		}
		if (!canRefreshWorkspace(workspace, mutationInProgressRef.current)) {
			if (refreshRetryTimerRef.current !== undefined) {
				clearTimeout(refreshRetryTimerRef.current)
			}
			refreshRetryTimerRef.current = setTimeout(() => {
				refreshRetryTimerRef.current = undefined
				void refreshWorkspaceRef.current()
			}, 250)
			return
		}
		const requestGeneration = openRequestRef.current
		const contentAtStart = latestContentRef.current
		const generation = editGenerationRef.current
		const result = await scanOrgWorkspaceFlow(workspace.rootPath, workspace.capabilityToken)()
		if (
			requestGeneration !== openRequestRef.current ||
			mutationInProgressRef.current ||
			!isCurrentOrigin()
		) {
			return
		}
		if (E.isLeft(result)) {
			setError(result.left.message)
			return
		}
		setWorkspace({ ...result.right, capabilityToken: workspace.capabilityToken })
		for (const [path, buffer] of parkedReservoir
			.list(identityScope)
			.map((buffer) => [buffer.document.relativePath, buffer] as const)) {
			const entry = result.right.documents.find((document) => document.relativePath === path)
			if (protectedPath(path) && entry?.revision !== buffer.document.revision) {
				conflictsRef.current.add(path)
				autosavePausedRef.current.add(path)
				setError(`External modification detected for ${path}.`)
			}
		}
		publishBuffers((version) => version + 1)
		if (!sourceDocument) {
			return
		}

		const scannedDocument = result.right.documents.find(
			(document) => document.relativePath === sourceDocument.relativePath,
		)
		if (!scannedDocument) {
			if (protectedPath(sourceDocument.relativePath) || generation !== editGenerationRef.current) {
				conflictsRef.current.add(sourceDocument.relativePath)
				autosavePausedRef.current.add(sourceDocument.relativePath)
				setError(
					`The open document ${sourceDocument.relativePath} no longer exists in the workspace.`,
				)
			} else {
				retireBuffer(sourceDocument.relativePath)
				conflictsRef.current.delete(sourceDocument.relativePath)
				autosavePausedRef.current.delete(sourceDocument.relativePath)
				setRevealTarget(null)
				setDirty(false)
				activationRef.current += 1
				activeRef.current = null
				setActiveDocument(null)
				installSource("")
			}
			return
		}
		if (scannedDocument.revision === sourceDocument.revision) {
			return
		}
		if (protectedPath(sourceDocument.relativePath) || generation !== editGenerationRef.current) {
			conflictsRef.current.add(sourceDocument.relativePath)
			autosavePausedRef.current.add(sourceDocument.relativePath)
			setError(`External modification detected for ${sourceDocument.relativePath}.`)
			return
		}

		const opened = await openOrgDocumentFlow({
			relativePath: sourceDocument.relativePath,
			capabilityToken: workspace.capabilityToken,
			workspaceRoot: workspace.rootPath,
		})()
		if (
			requestGeneration !== openRequestRef.current ||
			mutationInProgressRef.current ||
			!isCurrentOrigin()
		) {
			return
		}
		if (
			protectedPath(sourceDocument.relativePath) ||
			generation !== editGenerationRef.current ||
			latestContentRef.current !== contentAtStart ||
			mutationInProgressRef.current
		) {
			setError(`External modification detected for ${sourceDocument.relativePath}.`)
			return
		}
		if (E.isLeft(opened)) {
			setError(`Cannot refresh ${sourceDocument.relativePath}: ${opened.left.message}`)
			return
		}
		conflictsRef.current.delete(sourceDocument.relativePath)
		activeRef.current = opened.right
		setActiveDocument(opened.right)
		installSource(opened.right.content)
		setWorkspace((current) => (current ? updateWorkspaceDocument(current, opened.right) : current))
	}, [activeDocument, isDirty, workspace, originSession, originActivation, originPath])

	useEffect(() => {
		refreshWorkspaceRef.current = refreshWorkspace
	}, [refreshWorkspace])

	useEffect(() => {
		if (!workspaceRoot || !workspace?.capabilityToken) {
			return
		}
		const capabilityToken = workspace.capabilityToken
		let disposed = false
		let stopListening: (() => void) | undefined
		let watchToken: string | undefined
		const debouncedRefresh = createDebouncedOrgWorkspaceRefresh(() => {
			void refreshWorkspaceRef.current()
		})

		const setupWatch = async () => {
			try {
				const listener = await orgWorkspaceEventAdapter.listen((event) => {
					if (watchToken && matchesOrgWorkspaceWatch(event, workspaceRoot, watchToken)) {
						debouncedRefresh.schedule()
					}
				})
				if (disposed) {
					listener()
					return
				}
				stopListening = listener
				const watched = await watchOrgWorkspace(workspaceRoot, capabilityToken)()
				if (E.isLeft(watched)) {
					stopListening()
					stopListening = undefined
					return
				}
				if (disposed) {
					void unwatchOrgWorkspace(watched.right, workspaceRoot, capabilityToken)()
					return
				}
				watchToken = watched.right
				// Close the gap between the initial scan and watcher establishment.
				debouncedRefresh.schedule()
			} catch {
				// Watching is an optimization. Revision polling below remains the quiet fallback.
				stopListening?.()
				stopListening = undefined
			}
		}

		void setupWatch()
		return () => {
			disposed = true
			debouncedRefresh.cancel()
			stopListening?.()
			stopListening = undefined
			if (watchToken) {
				void unwatchOrgWorkspace(watchToken, workspaceRoot, capabilityToken)()
			}
		}
	}, [workspaceRoot, workspace?.capabilityToken])

	useEffect(() => {
		if (!workspaceRoot) {
			return
		}
		return () => {
			if (workspace?.capabilityToken)
				void releaseOrgWorkspace(workspaceRoot, workspace.capabilityToken)()
		}
	}, [workspaceRoot, workspace?.capabilityToken])

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
			bufferWindowLeasesRef.current.clear()
			registry.close()
			bufferIdentity.clearScope(
				grantRef.current && sessionRef.current
					? { grant: grantRef.current, sessionId: sessionRef.current }
					: null,
			)
			openRequestRef.current += 1
			sessionRef.current = null
			if (refreshRetryTimerRef.current !== undefined) {
				clearTimeout(refreshRetryTimerRef.current)
			}
		}
	}, [])

	const openWorkspace = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: capability cleanup and stale-request guards form one transaction.
		async (source: "default" | "default-existing" | "picker") => {
			const nonApprovalMutation = () =>
				mutationInProgressRef.current && mutationOwnerRef.current !== rootApprovalOwnerRef.current
			if (!isCurrentOrigin() || nonApprovalMutation()) {
				return
			}
			const confirmationGeneration = editGenerationRef.current
			const transientGeneration = transientGenerationRef.current
			const approvedDirty = hasDirtyBuffers()
			if (approvedDirty && !window.confirm("Discard unsaved changes and open another workspace?")) {
				return
			}
			if (
				!isCurrentOrigin() ||
				nonApprovalMutation() ||
				confirmationGeneration !== editGenerationRef.current ||
				transientGeneration !== transientGenerationRef.current ||
				(hasDirtyBuffers() && !approvedDirty)
			)
				return
			const requestId = openRequestRef.current + 1
			const editGenerationAtStart = editGenerationRef.current
			openRequestRef.current = requestId
			const owner = Symbol("openWorkspace")
			rootApprovalOwnerRef.current = owner
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			let granted: OrgWorkspaceInterface | null = null
			try {
				setLoading(true)
				setError(null)
				const result =
					source === "default"
						? await openDefaultOrgWorkspaceFlow()()
						: source === "default-existing"
							? await reopenDefaultOrgWorkspaceFlow()()
							: await selectOrgWorkspaceFlow()()
				if (E.isRight(result)) granted = result.right
				if (
					mutationOwnerRef.current !== owner ||
					requestId !== openRequestRef.current ||
					!isCurrentOrigin()
				) {
					return
				}
				setLoading(false)
				if (E.isLeft(result)) {
					if (source === "default-existing") {
						setDefaultWorkspacePreference(false)
					}
					setError(result.left.message)
					return
				}
				if (!result.right && source === "default-existing") {
					setDefaultWorkspacePreference(false)
				}
				if (result.right) {
					if (
						editGenerationRef.current !== editGenerationAtStart ||
						transientGeneration !== transientGenerationRef.current ||
						(hasDirtyBuffers() && !approvedDirty)
					) {
						setError("Document changed while opening a workspace; the open was cancelled.")
						return
					}
					closeRuntimes()
					parkedReservoir.clearScope(identityScope)
					bufferIdentity.clearScope(identityScope)
					grantRef.current = result.right
					activationRef.current += 1
					sessionRef.current = result.right.capabilityToken ?? null
					setWorkspaceSessionId(sessionRef.current)
					transientDirtyRef.current.clear()
					if (sessionRef.current) {
						const scope = { grant: result.right, sessionId: sessionRef.current }
						bufferIdentity.openScope(scope)
						parkedReservoir.openScope(scope)
					}
					conflictsRef.current.clear()
					autosavePausedRef.current.clear()
					activeRef.current = null
					setRevealTarget(null)
					setDefaultWorkspacePreference(source !== "picker")
					// Invalidate refreshes that may have started while the native picker was open.
					openRequestRef.current += 1

					setWorkspace(result.right)
					setActiveDocument(null)
					installSource("")
					setDirty(false)
				}
			} catch {
				if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
					setError(
						"Workspace approval ended unexpectedly; no new workspace was installed. Refresh and reconcile before a manual retry.",
					)
				}
			} finally {
				// A rejected approval has no known grant: never release an ambient root.
				// Only a returned, unused capability belongs to this request.
				try {
					if (granted?.capabilityToken && grantRef.current !== granted) {
						await releaseOrgWorkspace(granted.rootPath, granted.capabilityToken)()
					}
				} catch {
					// Cleanup failure does not justify releasing any other capability.
				} finally {
					if (rootApprovalOwnerRef.current === owner) rootApprovalOwnerRef.current = null
					finishMutation(owner)
				}
			}
		},
		[aggregateDirty, workspace, dirtyPath, originSession, originActivation, originPath],
	)

	const openDefaultWorkspace = useCallback(
		async () => openWorkspace("default"),
		[openWorkspace, originSession, originActivation, originPath],
	)
	const selectWorkspace = useCallback(
		async () => openWorkspace("picker"),
		[openWorkspace, originSession, originActivation, originPath],
	)

	useEffect(() => {
		if (!nativeCloseReady || restoreAttemptedRef.current) {
			return
		}
		restoreAttemptedRef.current = true
		if (hasDefaultWorkspacePreference()) {
			void openWorkspace("default-existing")
		}
	}, [openWorkspace, nativeCloseReady])

	const openDocument = useCallback(
		async (
			entry: OrgDocumentEntryInterface,
			expectedRevision?: string | null,
			signal?: AbortSignal,
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parking is committed only after all read, edit, abort, and revision guards pass.
		): Promise<boolean> => {
			if (!workspace || !isCurrentOrigin() || signal?.aborted || saveAllOwnerRef.current) {
				return false
			}
			if (activeRef.current?.relativePath === entry.relativePath) {
				if (expectedRevision && activeRef.current.revision !== expectedRevision) {
					setError(`Org link target changed while opening: ${entry.relativePath}`)
					return false
				}
				return true
			}
			const targetBufferId = bufferIdentity.lookup(identityScope, entry.relativePath)
			const isSameTargetBuffer = () =>
				!targetBufferId ||
				bufferIdentity.lookup(identityScope, entry.relativePath) === targetBufferId
			if (mutationInProgressRef.current) {
				const inFlight = saveInFlightRef.current
				if (!inFlight) {
					return false
				}
				const contentBeingSaved = saveInFlightContentRef.current
				const saved = await inFlight
				if (!isCurrentOrigin()) return false
				if (signal?.aborted) {
					return false
				}
				if (!canContinueAfterOrgSave(saved, contentBeingSaved, latestContentRef.current)) {
					setError("New edits arrived while saving; navigation was paused until they are saved.")
					return false
				}
			}
			if (mutationInProgressRef.current || !isCurrentOrigin() || !isSameTargetBuffer()) return false
			const parked = parkedReservoir.read(identityScope, entry.relativePath)
			const editGenerationAtStart = editGenerationRef.current
			const requestId = openRequestRef.current + 1
			const contentAtStart = latestContentRef.current
			openRequestRef.current = requestId
			setLoading(true)
			setError(null)
			const cancelRead = () => {
				if (openRequestRef.current !== requestId) {
					return
				}
				openRequestRef.current += 1
				setLoading(false)
			}
			signal?.addEventListener("abort", cancelRead, { once: true })
			try {
				if (signal?.aborted) {
					cancelRead()
					return false
				}
				const result = await openOrgDocumentFlow({
					relativePath: entry.relativePath,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})()
				if (requestId !== openRequestRef.current || !isCurrentOrigin()) {
					return false
				}
				setLoading(false)
				if (signal?.aborted || !isSameTargetBuffer()) {
					return false
				}
				if (
					latestContentRef.current !== contentAtStart ||
					editGenerationRef.current !== editGenerationAtStart
				) {
					setError("Document changed while another document was opening; the open was cancelled.")
					return false
				}
				const protectedParked = parked && protectedPath(entry.relativePath)
				if (E.isLeft(result) && !protectedParked) {
					setError(result.left.message)
					return false
				}
				if (
					protectedParked &&
					(E.isLeft(result) || result.right.revision !== parked.document.revision)
				) {
					conflictsRef.current.add(entry.relativePath)
					autosavePausedRef.current.add(entry.relativePath)
					setError(`External modification detected for ${entry.relativePath}.`)
				}
				const nextDocument = protectedParked
					? parked.document
					: E.isRight(result)
						? result.right
						: null
				if (!nextDocument) {
					return false
				}
				if (!protectedParked) {
					conflictsRef.current.delete(entry.relativePath)
				}
				if (expectedRevision && nextDocument.revision !== expectedRevision) {
					setError(`Org link target changed while opening: ${entry.relativePath}`)
					return false
				}
				// Invalidate refreshes that may have started while this document was opening.
				openRequestRef.current += 1
				const previous = activeRef.current
				if (previous) {
					parkedReservoir.park(identityScope, bufferIdFor(previous.relativePath), {
						content: latestContentRef.current,
						document: previous,
						editGeneration: editGenerationRef.current,
						isDirty: latestContentRef.current !== previous.content,
					})
				}
				// An unknown inactive disk body is a new authority, not a mapped edit.
				// Keep the logical buffer lease, but retire its canonical history and
				// attached windows (including an A/B/A switch batched before effects).
				// Known controller writes already update the parked source; protected
				// working copies must retain their body/history instead of importing disk.
				if (parked && !protectedParked && parked.content !== nextDocument.content) {
					const id = bufferIdentity.lookup(identityScope, entry.relativePath)
					if (id) {
						registry.retire(runtimeKey(id))
					}
				}
				parkedReservoir.takeToActivate(
					identityScope,
					bufferIdentity.lookup(identityScope, entry.relativePath) ?? "",
				)
				bufferIdFor(entry.relativePath)
				setRevealTarget(null)
				activationRef.current += 1
				activeRef.current = nextDocument
				setActiveDocument(nextDocument)
				const nextContent = protectedParked ? parked.content : nextDocument.content
				installSource(nextContent)
				return true
			} finally {
				signal?.removeEventListener("abort", cancelRead)
			}
		},
		[workspace, bufferIdFor, originSession, originActivation, originPath],
	)

	const runAgendaOperation = useCallback(
		async (
			entry: OrgAgendaEntry,
			operation: OrgAgendaOperation,
			signal?: AbortSignal,
			options?: OrgAgendaExecutionOptions,
		): Promise<OrgAgendaActionOutcome | OrgAgendaPlanningPreparation> => {
			const stale = (): OrgAgendaActionOutcome => ({ kind: "stale" })
			const rejected = (message: string): OrgAgendaActionOutcome => ({ kind: "rejected", message })
			// Capture the clock once at the effect boundary, before reads or allocation.
			if (operation.kind === "cycle-todo") {
				let timestamp: string
				try {
					timestamp = operation.timestamp ?? formatOrgLocalTimestamp(new Date())
				} catch {
					return rejected("Invalid local TODO timestamp.")
				}
				if (!validOrgLocalTimestamp(timestamp)) return rejected("Invalid local TODO timestamp.")
				operation = { ...operation, timestamp }
			}
			// Calendar validation precedes reads, owner acquisition, identity allocation and edits.
			if (
				operation.kind !== "cycle-todo" &&
				operation.kind !== "prepare" &&
				!validOrgDate(operation.date)
			)
				return rejected("Enter a real calendar date in YYYY-MM-DD format.")
			const grant = originGrant
			const session = originSession
			const origin = entry.origin
			const currentScope = grant && session ? { grant, sessionId: session } : null
			const current = () =>
				mountedRef.current &&
				nativeCloseReadyRef.current &&
				parkedReservoir.canMutate() &&
				grantRef.current === grant &&
				sessionRef.current === session &&
				!signal?.aborted
			if (!grant || !session || !current()) return stale()
			if (
				!hasOrgAgendaActionOrigin(origin) ||
				origin.workspaceRoot !== grant.rootPath ||
				origin.capabilityToken !== grant.capabilityToken ||
				origin.workspaceSessionId !== session ||
				origin.relativePath !== entry.relativePath ||
				!isSafeRelativeOrgPath(entry.relativePath)
			)
				return stale()
			if (
				loadingRef.current ||
				mutationInProgressRef.current ||
				saveInFlightRef.current ||
				saveAllOwnerRef.current ||
				agendaCommandOwnerRef.current
			)
				return rejected("A workspace operation is running.")
			const path = entry.relativePath
			if (conflictsRef.current.has(path) || autosavePausedRef.current.has(path))
				return rejected("Resolve the target buffer conflict before changing the agenda heading.")
			const owner = Symbol("agendaCommand")
			agendaCommandOwnerRef.current = owner
			const owns = () => current() && agendaCommandOwnerRef.current === owner
			let cancelRead!: () => void
			const cancelledRead = new Promise<null>((resolve) => {
				cancelRead = () => resolve(null)
			})
			const cancel = () => {
				cancelRead()
				if (agendaCommandOwnerRef.current === owner) agendaCommandOwnerRef.current = null
				finishMutation(owner)
			}
			signal?.addEventListener("abort", cancel, { once: true })
			try {
				let id = bufferIdentity.lookup(currentScope, path)
				let document =
					activeRef.current?.relativePath === path
						? activeRef.current
						: parkedReservoir.read(currentScope, path)?.document
				let raw =
					activeRef.current?.relativePath === path
						? latestContentRef.current
						: parkedReservoir.read(currentScope, path)?.content
				if (!document) {
					if (origin.source !== "disk") return stale()
					mutationOwnerRef.current = owner
					mutationInProgressRef.current = true
					setLoading(true)
					// Release the caller too: late read results (or failures) remain observed
					// by the race but cannot allocate identities, mirrors, or history.
					const opened = await Promise.race([
						openOrgDocumentFlow({
							relativePath: path,
							workspaceRoot: grant.rootPath,
							capabilityToken: grant.capabilityToken,
						})(),
						cancelledRead,
					])
					if (!opened || !owns() || mutationOwnerRef.current !== owner) return stale()
					if (opened._tag === "Left")
						return rejected(
							typeof opened.left?.message === "string"
								? opened.left.message
								: "Invalid document read response.",
						)
					if (
						opened._tag !== "Right" ||
						!opened.right ||
						typeof opened.right.relativePath !== "string" ||
						opened.right.relativePath !== path ||
						typeof opened.right.content !== "string" ||
						typeof opened.right.revision !== "string" ||
						!opened.right.revision
					)
						return rejected("Invalid document read response.")
					document = opened.right
					raw = document.content
					if (
						document.relativePath !== path ||
						document.revision !== origin.diskRevision ||
						origin.sourceRevision !== document.revision ||
						!validateOrgAgendaOrigin({ ...entry, origin }, raw, document.revision, {
							workspaceSessionId: session,
						}).valid
					)
						return stale()
					const planned = planAgendaOperation(entry, raw, operation)
					if (planned.kind !== "edit") return planned
					id = bufferIdentity.ensure(currentScope, path)
					// Publish the close-gate copy before any command can make it dirty.
					if (
						!parkedReservoir.park(currentScope, id, {
							document,
							content: raw,
							editGeneration: 0,
							isDirty: false,
						})
					)
						return stale()
					if (!owns()) return stale()
					registry.create(
						{ workspaceSessionId: session, bufferId: id },
						raw,
						runtimePorts(grant, session),
					)
					finishMutation(owner)
				}
				if (
					!owns() ||
					!id ||
					raw === undefined ||
					!document ||
					document.revision !== origin.diskRevision
				)
					return stale()
				const key = { workspaceSessionId: session, bufferId: id }
				const runtime = registry.get(key)
				if (!runtime || runtime.source !== raw) return stale()
				// Disk anchors cannot authorize a command against an unsaved working copy.
				if (origin.source === "disk" && runtime.source !== document.content) return stale()
				const revision = origin.source === "live" ? id : document.revision
				if (
					!validateOrgAgendaOrigin({ ...entry, origin }, runtime.source, revision, {
						workspaceSessionId: session,
						...(origin.source === "live"
							? {
									runtimeIncarnation: runtimeIncarnation(runtime),
									sourceGeneration: runtime.revision,
								}
							: {}),
					}).valid
				)
					return stale()
				const planned = planAgendaOperation(entry, raw, operation)
				if (planned.kind !== "edit") return planned
				const edits = planned.edits
				const commandOwner = () =>
					owns() &&
					bufferIdentity.lookup(currentScope, path) === id &&
					registry.get(key) === runtime &&
					!loadingRef.current &&
					!mutationInProgressRef.current &&
					!saveInFlightRef.current &&
					!saveAllOwnerRef.current &&
					!conflictsRef.current.has(path) &&
					!autosavePausedRef.current.has(path) &&
					validateOrgAgendaOrigin({ ...entry, origin }, runtime.source, revision, {
						workspaceSessionId: session,
						...(origin.source === "live"
							? {
									runtimeIncarnation: runtimeIncarnation(runtime),
									sourceGeneration: runtime.revision,
								}
							: {}),
					}).valid
				if (!commandOwner()) return stale()
				// This observation precedes publication; a throwing observer cannot
				// manufacture a committed outcome. Recheck ownership after callbacks.
				options?.onCommitStarted?.()
				if (!commandOwner()) return stale()
				return registry.applyCommandEdits(key, raw, edits, commandOwner)
					? { kind: "confirmed" }
					: stale()
			} catch {
				return owns() ? rejected("Cannot change the agenda heading.") : stale()
			} finally {
				signal?.removeEventListener("abort", cancel)
				cancel()
			}
		},
		[originGrant, originSession],
	)

	const executeAgendaCommand = useCallback(
		(
			entry: OrgAgendaEntry,
			command: OrgAgendaCommand,
			signal?: AbortSignal,
			options?: OrgAgendaExecutionOptions,
		) => runAgendaOperation(entry, command, signal, options) as Promise<OrgAgendaActionOutcome>,
		[runAgendaOperation],
	)
	const actOnAgendaEntry = useCallback(
		(entry: OrgAgendaEntry, signal?: AbortSignal) =>
			executeAgendaCommand(entry, { kind: "cycle-todo" }, signal),
		[executeAgendaCommand],
	)
	const prepareAgendaPlanning = useCallback(
		(entry: OrgAgendaEntry, field: "schedule" | "deadline", signal?: AbortSignal) =>
			runAgendaOperation(
				entry,
				{ kind: "prepare", field },
				signal,
			) as Promise<OrgAgendaPlanningPreparation>,
		[runAgendaOperation],
	)

	const openDocumentPath = useCallback(
		async (
			relativePath: string,
			expectedRevision?: string | null,
			signal?: AbortSignal,
		): Promise<boolean> => {
			if (!isCurrentOrigin() || signal?.aborted) return false
			const entry =
				workspace?.documents.find((document) => document.relativePath === relativePath) ??
				parkedReservoir.read(identityScope, relativePath)?.document
			if (!entry) {
				setError(`Org link target does not exist: ${relativePath}`)
				return false
			}
			return openDocument(entry, expectedRevision, signal)
		},
		[openDocument, workspace, originSession, originActivation, originPath],
	)

	const switchBuffer = useCallback(
		async (bufferId: string, signal?: AbortSignal): Promise<boolean> => {
			if (
				!isCurrentOrigin() ||
				signal?.aborted ||
				mutationInProgressRef.current ||
				saveAllOwnerRef.current
			) {
				return false
			}
			// IDs are opaque and grant-local: only resolve live buffers in the latest map.
			const path = bufferIdentity.findPath(identityScope, bufferId)
			if (!path) return false
			if (activeRef.current?.relativePath === path) return true
			if (!parkedReservoir.read(identityScope, path)) return false
			return openDocumentPath(path, undefined, signal)
		},
		[openDocumentPath, originSession, originActivation, originPath],
	)

	const openDocumentAt = useCallback(
		async (
			relativePath: string,
			line: number,
			expectedRevision?: string | null,
		): Promise<boolean> => {
			if (!isCurrentOrigin()) return false
			const revealActivation =
				originActivation + (activeRef.current?.relativePath !== relativePath ? 1 : 0)
			if (activeRef.current?.relativePath !== relativePath) {
				const opened = await openDocumentPath(relativePath, expectedRevision)
				if (!opened) {
					return false
				}
			}
			if (
				grantRef.current !== originGrant ||
				sessionRef.current !== originSession ||
				activationRef.current !== revealActivation ||
				activeRef.current?.relativePath !== relativePath
			)
				return false
			revealRequestRef.current += 1
			setRevealTarget({ line, relativePath, requestId: revealRequestRef.current })
			return true
		},
		[activeDocument, openDocumentPath, originSession, originActivation, originPath],
	)

	const openOrgLink = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: scan, stale guards, resolution, and navigation form one transaction.
		async (target: OrgLinkClickTarget): Promise<boolean> => {
			const sourceDocument = activeRef.current
			if (!workspace || !sourceDocument || !isCurrentOrigin() || mutationInProgressRef.current) {
				return false
			}
			const sourcePath = sourceDocument.relativePath
			const contentAtStart = latestContentRef.current
			const requestGeneration = openRequestRef.current
			const linkRequest = linkRequestRef.current + 1
			linkRequestRef.current = linkRequest
			setError(null)

			// Explicit navigation rescans first instead of trusting a possibly stale watcher snapshot.
			const scanned = await scanOrgWorkspaceFlow(workspace.rootPath, workspace.capabilityToken)()
			if (
				!isCurrentOrigin() ||
				linkRequest !== linkRequestRef.current ||
				requestGeneration !== openRequestRef.current
			) {
				return false
			}
			if (latestContentRef.current !== contentAtStart) {
				setError("Document changed while resolving the Org link; try again.")
				return false
			}
			if (E.isLeft(scanned)) {
				setError(scanned.left.message)
				return false
			}
			setWorkspace({ ...scanned.right, capabilityToken: workspace.capabilityToken })
			const result = await resolveOrgLinkTargetFlow(
				{ ...scanned.right, capabilityToken: workspace.capabilityToken },
				sourcePath,
				contentAtStart,
				target,
			)()
			if (
				!isCurrentOrigin() ||
				linkRequest !== linkRequestRef.current ||
				requestGeneration !== openRequestRef.current
			) {
				return false
			}
			if (latestContentRef.current !== contentAtStart) {
				setError("Document changed while resolving the Org link; try again.")
				return false
			}
			if (E.isLeft(result)) {
				setError(result.left.message)
				return false
			}
			return openDocumentAt(
				result.right.relativePath,
				result.right.line,
				result.right.expectedRevision,
			)
		},
		[activeDocument, openDocumentAt, workspace, originSession, originActivation, originPath],
	)

	const readRefileTarget = useCallback(
		async (path: string, signal?: AbortSignal): Promise<OrgRefileTargetOutcome> => {
			const rejected = (message: string): OrgRefileTargetOutcome => ({ kind: "rejected", message })
			const source = activeRef.current
			// Every lookup supersedes earlier requests, including rejected lookups.
			const request = ++refileTargetRequestRef.current
			if (
				signal?.aborted ||
				!isCurrentOrigin() ||
				!workspace ||
				!source ||
				liveWorkspaceRef.current?.rootPath !== workspace.rootPath ||
				mutationInProgressRef.current ||
				protectedPath(source.relativePath) ||
				protectedPath(path)
			)
				return rejected(
					"Save or resolve the current and target buffers before looking up a refile target.",
				)
			if (
				typeof path !== "string" ||
				!isSafeRelativeOrgPath(path) ||
				!isSafeRelativeOrgPath(source.relativePath) ||
				path.normalize("NFC").toLocaleLowerCase("en-US") ===
					source.relativePath.normalize("NFC").toLocaleLowerCase("en-US")
			)
				return rejected("Refile target must be a safe, distinct relative Org path.")
			const generation = editGenerationRef.current
			const sourceContent = latestContentRef.current
			const parkedTarget = parkedReservoir.read(identityScope, path)
			const current = () =>
				!signal?.aborted &&
				isCurrentOrigin() &&
				request === refileTargetRequestRef.current &&
				liveWorkspaceRef.current?.rootPath === workspace.rootPath &&
				activeRef.current === source &&
				latestContentRef.current === sourceContent &&
				editGenerationRef.current === generation &&
				!mutationInProgressRef.current &&
				!protectedPath(source.relativePath) &&
				!protectedPath(path) &&
				parkedReservoir.read(identityScope, path) === parkedTarget
			let abortListener: (() => void) | undefined
			const cancelled = new Promise<OrgRefileTargetOutcome>((resolve) => {
				abortListener = () => resolve(rejected("Refile target lookup was cancelled."))
				signal?.addEventListener("abort", abortListener, { once: true })
			})
			try {
				const lookup = (async (): Promise<OrgRefileTargetOutcome> => {
					try {
						const result = await readOrgRefileTargetFlow({
							workspaceRoot: workspace.rootPath,
							capabilityToken: workspace.capabilityToken,
							sourceRelativePath: source.relativePath,
							targetRelativePath: path,
							confirmCurrent: current,
						})()
						if (!current())
							return rejected("Refile target lookup is stale; request a fresh target.")
						return E.isLeft(result)
							? rejected(result.left.message)
							: { kind: "ready", snapshot: result.right }
					} catch {
						return rejected("Cannot read the refile target.")
					}
				})()
				return await Promise.race([lookup, cancelled])
			} finally {
				if (abortListener) signal?.removeEventListener("abort", abortListener)
			}
		},
		[workspace, dirtyPath, originGrant, originSession, originActivation, originPath],
	)

	const transferSubtree = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: source/target guards and partial write outcomes are one transaction.
		async (
			cursor: number,
			targetRelativePath?: string,
			target?: OrgRefileTargetSelection,
		): Promise<OrgSubtreeTransferOutcome> => {
			const sourceDocument = activeRef.current
			if (!isCurrentOrigin())
				return { kind: "rejected", message: "The source buffer is no longer active." }
			const sourceGeneration = editGenerationRef.current
			if (
				target !== undefined &&
				(!target ||
					typeof target !== "object" ||
					typeof target.expectedTargetRevision !== "string" ||
					!target.expectedTargetRevision.trim() ||
					(target.targetHeading !== undefined &&
						(!target.targetHeading ||
							typeof target.targetHeading !== "object" ||
							target.expectedTargetRevision === "<missing>" ||
							!Number.isSafeInteger(target.targetHeading.from) ||
							target.targetHeading.from < 0 ||
							typeof target.targetHeading.heading !== "string" ||
							!/^\*+[ \t]+/.test(target.targetHeading.heading) ||
							/[\r\n]/.test(target.targetHeading.heading))))
			)
				return { kind: "rejected", message: "Invalid refile target selection." }
			const rejectionMessage =
				targetRelativePath && protectedPath(targetRelativePath)
					? "Save or discard the target buffer before refiling a subtree."
					: !targetRelativePath &&
							(autosavePausedRef.current.size > 0 ||
								conflictsRef.current.size > 0 ||
								parkedReservoir.list(identityScope).some((buffer) => buffer.isDirty))
						? "Save or discard inactive buffers before archiving a subtree."
						: !workspace
							? "Open an Org workspace before refiling or archiving a subtree."
							: !sourceDocument
								? "Open a document before refiling or archiving a subtree."
								: mutationInProgressRef.current
									? "Another workspace mutation is in progress; subtree transfer was not started."
									: protectedPath(sourceDocument.relativePath)
										? "Save the current document before refiling or archiving a subtree."
										: null
			if (rejectionMessage) {
				setError(rejectionMessage)
				return { kind: "rejected", message: rejectionMessage }
			}
			if (!workspace || !sourceDocument) {
				return { kind: "rejected", message: "No active Org document is available." }
			}
			const sourceContent = latestContentRef.current
			const sourcePath = sourceDocument.relativePath
			const affectedTargetPath = targetRelativePath ?? deriveOrgArchivePath(sourcePath)
			const targetBuffer = affectedTargetPath
				? parkedReservoir.read(identityScope, affectedTargetPath)
				: undefined
			const latchAffectedPaths = () => {
				for (const path of [sourcePath, affectedTargetPath]) {
					if (!path) continue
					autosavePausedRef.current.add(path)
					conflictsRef.current.add(path)
				}
				refileTargetRequestRef.current += 1
				publishBuffers((version) => version + 1)
			}
			const expectedSourceRevision = sourceDocument.revision
			openRequestRef.current += 1
			setLoading(false)
			const owner = Symbol("transferSubtree")
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			setSaving(true)
			setError(null)
			const commonInput = {
				confirmSourceUnchanged: () =>
					isCurrentOrigin() &&
					editGenerationRef.current === sourceGeneration &&
					latestContentRef.current === sourceContent &&
					activeRef.current === sourceDocument &&
					liveWorkspaceRef.current?.rootPath === workspace.rootPath &&
					!protectedPath(sourcePath) &&
					(!affectedTargetPath ||
						(!protectedPath(affectedTargetPath) &&
							parkedReservoir.read(identityScope, affectedTargetPath) === targetBuffer)),
				isProtectedPath: (path: string) => protectedPath(path),
				cursor,
				expectedSourceRevision,
				sourceContent,
				sourceRelativePath: sourcePath,
				capabilityToken: workspace.capabilityToken,
				workspaceRoot: workspace.rootPath,
			}
			try {
				const result = await (targetRelativePath
					? refileOrgSubtreeFlow({ ...commonInput, ...target, targetRelativePath })()
					: archiveOrgSubtreeFlow(commonInput)())
				if (!isCurrentOrigin()) {
					finishMutation(owner)
					return { kind: "rejected", message: "The source buffer is no longer active." }
				}
				if (E.isLeft(result)) {
					const partial =
						result.left.type === "ORG_SUBTREE_REFILE_PARTIAL_ERROR" ||
						result.left.type === "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR"
					if (partial) latchAffectedPaths()
					if (result.left.type === "ORG_SUBTREE_REFILE_PARTIAL_ERROR") {
						const persistedTarget = result.left.target
						setWorkspace((current) =>
							current ? updateWorkspaceDocument(current, persistedTarget) : current,
						)
					}
					setError(result.left.message)
					return { kind: partial ? "partial" : "rejected", message: result.left.message }
				}
				setWorkspace((current) => {
					if (!current) {
						return current
					}
					return updateWorkspaceDocument(
						updateWorkspaceDocument(current, result.right.target),
						result.right.source,
					)
				})
				const newerTarget = installedTargetSource(result.right.target, targetBuffer)
				activeRef.current = result.right.source
				setActiveDocument(result.right.source)
				if (
					editGenerationRef.current === sourceGeneration &&
					latestContentRef.current === sourceContent
				) {
					installSource(result.right.source.content)
					if (newerTarget) {
						const message =
							"The subtree moved, but newer target input was retained. Reread and reconcile the target before saving."
						setError(message)
						return { kind: "success", message }
					}
					return { kind: "success" }
				}
				setDirty(true)
				const message =
					"The subtree moved, but newer editor input was retained. Review and save the source to reconcile it."
				setError(message)
				return { kind: "success", message }
			} catch {
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin())
					return {
						kind: "partial",
						message: "The source buffer is no longer active; reread the affected files.",
					}
				latchAffectedPaths()
				const message =
					"Subtree transfer ended unexpectedly; files may have changed. Reread both source and target documents before reconciling them. Do not automatically retry; rollback was not confirmed."
				setError(message)
				return { kind: "partial", message }
			} finally {
				finishMutation(owner)
			}
		},
		[activeDocument, isDirty, workspace, dirtyPath, originSession, originActivation, originPath],
	)

	const refileSubtree = useCallback(
		async (cursor: number, targetRelativePath: string, target?: OrgRefileTargetSelection) =>
			transferSubtree(cursor, targetRelativePath, target),
		[transferSubtree, originSession, originActivation, originPath],
	)

	const archiveSubtree = useCallback(
		async (cursor: number) => transferSubtree(cursor),
		[transferSubtree, originSession, originActivation, originPath],
	)

	const updateContent = useCallback(
		(nextContent: string) => {
			if (
				!isCurrentOrigin() ||
				loadingRef.current ||
				!nativeCloseReadyRef.current ||
				!parkedReservoir.canMutate() ||
				(mutationInProgressRef.current && !saveInFlightRef.current)
			)
				return
			const id = originPath ? bufferIdentity.lookup(identityScope, originPath) : undefined
			const runtime = id ? runtimeFor(id) : undefined
			if (!runtime || nextContent === runtime.source) return
			// Compatibility edits obey the same busy/read-only gate as runtime UI edits.
			try {
				registry.updateSource(runtime.key, latestContentRef.current, nextContent, isCurrentOrigin)
			} catch (failure) {
				setError(failure instanceof Error ? failure.message : "Cannot update Org source")
			}
		},
		[originSession, originActivation, originPath],
	)

	const saveDocumentWithResult = useCallback(async (): Promise<boolean> => {
		if (!workspace || !activeDocument || !isCurrentOrigin() || mutationInProgressRef.current) {
			return false
		}
		openRequestRef.current += 1
		mutationInProgressRef.current = true
		refileTargetRequestRef.current += 1
		const owner = Symbol("save")
		mutationOwnerRef.current = owner
		const sourcePath = activeRef.current!.relativePath
		const sourceDocument = { ...activeRef.current! }
		const logicalBufferId = bufferIdentity.lookup(identityScope, sourcePath)
		const sourceRevision = sourceDocument.revision
		const contentBeingSaved = latestContentRef.current
		setSaving(true)
		setError(null)
		const capture = Object.freeze({
			content: contentBeingSaved,
			expectedRevision: sourceRevision,
			relativePath: sourcePath,
			capabilityToken: workspace.capabilityToken,
			workspaceRoot: workspace.rootPath,
		})
		const current = () =>
			mutationOwnerRef.current === owner &&
			isCurrentOrigin() &&
			logicalBufferId !== undefined &&
			bufferIdentity.lookup(identityScope, sourcePath) === logicalBufferId
		try {
			const result = await saveOrgWorkingCopyFlow(capture, {
				write: saveOrgDocumentFlow,
				isFresh: () =>
					current() &&
					activeRef.current?.relativePath === sourcePath &&
					activeRef.current.revision === sourceRevision,
				isCurrent: current,
				onWriteStarted: (settled) => {
					saveInFlightContentRef.current = contentBeingSaved
					saveInFlightRef.current = settled
				},
				commitConfirmed: (_, receipt) => {
					if (!current()) throw new Error("The save owner is no longer current")
					const plan = planOrgWorkingCopyAck({
						expectedDocument: sourceDocument,
						currentDocument: activeRef.current,
						workingSource: latestContentRef.current,
						capturedSource: contentBeingSaved,
						receipt,
					})
					if (plan.kind === "rejected") {
						autosavePausedRef.current.add(sourcePath)
						conflictsRef.current.add(sourcePath)
						throw new Error(plan.reason)
					}
					activeRef.current = plan.document
					setActiveDocument(plan.document)
					setDirty(plan.isDirty)
					autosavePausedRef.current.delete(sourcePath)
					conflictsRef.current.delete(sourcePath)
					setWorkspace((value) => (value ? updateWorkspaceDocument(value, plan.document) : value))
				},
			})
			// The flow's terminal await introduces another ownership gap.
			if (!current()) return false
			if (result.kind === "confirmed") return true
			if (result.kind === "stale-before" || result.kind === "stale-after") return false
			conflictsRef.current.add(sourcePath)
			autosavePausedRef.current.add(sourcePath)
			setError(
				result.kind === "write-left"
					? result.error.message
					: "Save ended unexpectedly; files may have changed. The editor body was retained. Refresh and reconcile before a manual retry; no rollback was attempted.",
			)
			return false
		} catch {
			if (current()) {
				autosavePausedRef.current.add(sourcePath)
				conflictsRef.current.add(sourcePath)
				setError(
					"Save ended unexpectedly; files may have changed. The editor body was retained. Refresh and reconcile before a manual retry; no rollback was attempted.",
				)
			}
			return false
		} finally {
			if (mutationOwnerRef.current === owner) {
				saveInFlightRef.current = null
				saveInFlightContentRef.current = null
			}
			finishMutation(owner)
		}
	}, [activeDocument, workspace, originSession, originActivation, originPath])

	// One owner covers the entire snapshot; never nest the active save's lock.
	const saveAllDocuments = useCallback(async (): Promise<OrgSaveAllOutcome> => {
		const remainingPaths = () => [
			...parkedReservoir
				.list(identityScope)
				.map((buffer) => [buffer.document.relativePath, buffer] as const)
				.filter(([, buffer]) => buffer.isDirty)
				.map(([path]) => path),
			...(activeRef.current && dirtyPath(activeRef.current.relativePath)
				? [activeRef.current.relativePath]
				: []),
		]
		const savedPaths: string[] = []
		const outcome = (kind: OrgSaveAllOutcome["kind"], message?: string): OrgSaveAllOutcome => ({
			kind,
			savedPaths: [...savedPaths],
			remainingDirtyPaths: remainingPaths(),
			...(message ? { message } : {}),
		})
		if (!workspace || !isCurrentOrigin()) {
			return outcome(
				"rejected",
				"The workspace or active buffer is no longer current; save all was not started.",
			)
		}
		if (mutationInProgressRef.current || saveInFlightRef.current) {
			return outcome(
				"rejected",
				"Another workspace mutation is in progress; save all was not started.",
			)
		}
		const selected: (OrgSaveAllCapture & {
			readonly parked: OrgParkedWorkingCopy | null
			readonly logicalBufferId: string | undefined
			readonly expectedDocument: OrgDocumentInterface
			readonly originalActiveDocument: OrgDocumentInterface | null
		})[] = parkedReservoir
			.list(identityScope)
			.filter((buffer) => buffer.isDirty)
			.map((buffer) => {
				const document = Object.freeze({ ...buffer.document })
				return {
					document,
					content: buffer.content,
					parked: buffer,
					expectedDocument: document,
					originalActiveDocument: null,
					logicalBufferId: bufferIdentity.lookup(identityScope, document.relativePath),
					workspaceRoot: workspace.rootPath,
					capabilityToken: workspace.capabilityToken,
				}
			})
		const active = activeRef.current
		const activeBaseline = active ? Object.freeze({ ...active }) : null
		const activeCapture =
			active && activeBaseline && dirtyPath(active.relativePath)
				? {
						document: activeBaseline,
						content: latestContentRef.current,
						parked: null,
						expectedDocument: activeBaseline,
						originalActiveDocument: active,
						logicalBufferId: bufferIdentity.lookup(identityScope, active.relativePath),
						workspaceRoot: workspace.rootPath,
						capabilityToken: workspace.capabilityToken,
					}
				: null
		if (activeCapture) selected.push(activeCapture)
		if (!selected.length) return outcome("success")
		const owner = Symbol("saveAllDocuments")
		mutationOwnerRef.current = owner
		saveAllOwnerRef.current = owner
		mutationInProgressRef.current = true
		refileTargetRequestRef.current += 1
		openRequestRef.current += 1
		setLoading(false)
		setSaving(true)
		setError(null)
		// Batch navigation must not treat any individual write as permission to proceed.
		let completeWaiter!: (saved: boolean) => void
		saveInFlightRef.current = new Promise<boolean>((resolve) => {
			completeWaiter = resolve
		})
		saveInFlightContentRef.current = null
		// Batch ownership is independent of a member's live baseline path. Member
		// authority is checked separately before its write, retaining earlier ACKs.
		const current = () =>
			mutationOwnerRef.current === owner &&
			nativeCloseReadyRef.current &&
			mountedRef.current &&
			grantRef.current === originGrant &&
			sessionRef.current === originSession &&
			activationRef.current === originActivation
		const fail = (message: string): OrgSaveAllOutcome => {
			if (current()) {
				// Pause even unwritten members, but do not invent external conflicts for them.
				for (const capture of selected) {
					if (!savedPaths.includes(capture.document.relativePath)) {
						autosavePausedRef.current.add(capture.document.relativePath)
						// Path drift must not let the retained body autosave under
						// its corrupted live path while awaiting reconciliation.
						const liveDocument = capture.parked
							? parkedReservoir.read(identityScope, capture.document.relativePath)?.document
							: activeRef.current
						if (liveDocument) autosavePausedRef.current.add(liveDocument.relativePath)
					}
				}
				setError(message)
			}
			return outcome(savedPaths.length ? "partial" : "rejected", message)
		}
		try {
			const result = await saveAllOrgDocumentsFlow(selected, {
				write: saveOrgDocumentFlow,
				isFresh: ({
					document,
					parked,
					originalActiveDocument,
					logicalBufferId,
					expectedDocument,
				}) => {
					if (
						!current() ||
						!logicalBufferId ||
						bufferIdentity.lookup(identityScope, document.relativePath) !== logicalBufferId
					)
						return false
					const liveParked = parked
						? parkedReservoir.read(identityScope, document.relativePath)
						: undefined
					return (
						(parked ? liveParked === parked : activeRef.current === originalActiveDocument) &&
						!guardOrgWorkingCopyBaseline(
							expectedDocument,
							parked ? liveParked?.document : activeRef.current,
						)
					)
				},
				isOwnerCurrent: current,
				commitConfirmed: (
					{ document, content: body, parked, logicalBufferId, expectedDocument },
					receipt,
				) => {
					const path = document.relativePath
					if (
						!current() ||
						!logicalBufferId ||
						bufferIdentity.lookup(identityScope, path) !== logicalBufferId
					)
						throw new Error("The captured buffer lease is no longer current")
					const liveParked = parked ? parkedReservoir.read(identityScope, path) : undefined
					const plan = planOrgWorkingCopyAck({
						expectedDocument,
						currentDocument: parked ? liveParked?.document : activeRef.current,
						workingSource: parked ? (liveParked?.content ?? "") : latestContentRef.current,
						capturedSource: body,
						receipt,
					})
					if (plan.kind === "rejected") {
						autosavePausedRef.current.add(path)
						conflictsRef.current.add(path)
						throw new Error(plan.reason)
					}
					if (parked && liveParked) {
						parkedReservoir.installConfirmedBaseline(identityScope, logicalBufferId, liveParked, {
							document: plan.document,
							isDirty: plan.isDirty,
						})
					} else {
						activeRef.current = plan.document
						setActiveDocument(plan.document)
						setDirty(plan.isDirty)
					}
					conflictsRef.current.delete(path)
					autosavePausedRef.current.delete(path)
					setWorkspace((value) => (value ? updateWorkspaceDocument(value, plan.document) : value))
					publishBuffers((version) => version + 1)
				},
			})
			savedPaths.push(...result.confirmedPaths)
			if (!current()) {
				return fail(
					"The save-all completion is stale because its origin is no longer current. Confirmed writes were retained; no rollback was attempted. Reread affected files before reconciling; do not automatically retry.",
				)
			}
			if (result.kind !== "success") {
				if (
					current() &&
					result.writingPath &&
					["write-left", "unexpected", "commit"].includes(result.failureKind)
				) {
					conflictsRef.current.add(result.writingPath)
				}
				return fail(result.message)
			}
			return remainingPaths().length
				? outcome("partial", "Captured edits were saved, but newer editor input remains unsaved.")
				: outcome("success")
		} finally {
			if (mutationOwnerRef.current === owner) {
				saveInFlightRef.current = null
				saveInFlightContentRef.current = null
			}
			if (saveAllOwnerRef.current === owner) saveAllOwnerRef.current = null
			finishMutation(owner)
			completeWaiter(false)
		}
	}, [workspace, dirtyPath, originSession, originActivation, originPath])

	const saveDocument = useCallback(async (): Promise<void> => {
		await saveDocumentWithResult()
	}, [saveDocumentWithResult, originSession, originActivation, originPath])

	const closeActiveDocument = useCallback(async (): Promise<boolean> => {
		if (!isCurrentOrigin()) return false
		const contentAtClose = latestContentRef.current
		if (mutationInProgressRef.current) {
			return false
		}
		if (activeRef.current && protectedPath(activeRef.current.relativePath)) {
			const saved = await saveDocumentWithResult()
			if (
				!isCurrentOrigin() ||
				mutationInProgressRef.current ||
				!saved ||
				latestContentRef.current !== contentAtClose
			) {
				return false
			}
		}
		if (activeRef.current) {
			retireBuffer(activeRef.current.relativePath)
			conflictsRef.current.delete(activeRef.current.relativePath)
			autosavePausedRef.current.delete(activeRef.current.relativePath)
		}
		activationRef.current += 1
		activeRef.current = null
		openRequestRef.current += 1
		setLoading(false)
		setActiveDocument(null)
		installSource("")
		setDirty(false)
		setRevealTarget(null)
		return true
	}, [isDirty, saveDocumentWithResult, originSession, originActivation, originPath])

	const closeDocumentPath = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inactive CAS save and guarded removal must be atomic.
		async (relativePath: string): Promise<boolean> => {
			if (!isCurrentOrigin()) return false
			if (activeRef.current?.relativePath === relativePath) {
				return closeActiveDocument()
			}
			const buffer = parkedReservoir.read(identityScope, relativePath)
			if (!buffer) {
				return true
			}
			if (!workspace || !isCurrentOrigin() || mutationInProgressRef.current) {
				return false
			}
			if (protectedPath(relativePath)) {
				const session = sessionRef.current
				openRequestRef.current += 1
				setLoading(false)
				const owner = Symbol("closeDocumentPath")
				mutationOwnerRef.current = owner
				mutationInProgressRef.current = true
				refileTargetRequestRef.current += 1
				setSaving(true)
				let closingBuffer = buffer
				const capturedDocument = { ...buffer.document }
				const logicalBufferId = bufferIdentity.lookup(identityScope, relativePath)
				const currentOwner = () =>
					mutationOwnerRef.current === owner &&
					isCurrentOrigin() &&
					session === sessionRef.current &&
					logicalBufferId !== undefined &&
					bufferIdentity.lookup(identityScope, relativePath) === logicalBufferId
				const currentRetirement = () =>
					currentOwner() && parkedReservoir.read(identityScope, relativePath) === closingBuffer
				const capture = Object.freeze({
					logicalBufferId,
					content: buffer.content,
					expectedRevision: buffer.document.revision,
					relativePath,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})
				try {
					const result = await saveOrgWorkingCopyFlow(capture, {
						write: saveOrgDocumentFlow,
						isFresh: currentRetirement,
						isCurrent: currentOwner,
						commitConfirmed: (_, receipt) => {
							const parked = parkedReservoir.read(identityScope, relativePath)
							if (!currentOwner() || !parked)
								throw new Error("The captured buffer lease is no longer current")
							const plan = planOrgWorkingCopyAck({
								expectedDocument: capturedDocument,
								currentDocument: parked.document,
								workingSource: parked.content,
								capturedSource: capture.content,
								receipt,
							})
							if (plan.kind === "rejected") {
								autosavePausedRef.current.add(relativePath)
								conflictsRef.current.add(relativePath)
								throw new Error(plan.reason)
							}
							const persisted = plan.document
							// ACK the disk baseline without touching working source or runtime history.
							const successor = parkedReservoir.installConfirmedBaseline(
								identityScope,
								parked.bufferId,
								parked,
								plan,
							)
							if (!successor) throw new Error("Parked ACK lease changed")
							// A replacement receives the ACK, but never permission to retire.
							if (parked === closingBuffer) closingBuffer = successor
							conflictsRef.current.delete(relativePath)
							autosavePausedRef.current.delete(relativePath)
							setWorkspace((value) => (value ? updateWorkspaceDocument(value, persisted) : value))
						},
					})
					// Failed effects belong to the lease even when the working body changed.
					if (!currentOwner()) return false
					if (result.kind !== "confirmed") {
						if (result.kind === "stale-before" || result.kind === "stale-after") return false
						conflictsRef.current.add(relativePath)
						autosavePausedRef.current.add(relativePath)
						setError(
							result.kind === "write-left"
								? result.error.message
								: `Cannot save ${relativePath}; the buffer was retained. Files may have changed. Refresh and reconcile before a manual retry; no rollback was attempted.`,
						)
						return false
					}
					if (!currentRetirement()) return false
				} catch {
					if (!currentOwner()) return false
					conflictsRef.current.add(relativePath)
					autosavePausedRef.current.add(relativePath)
					setError(
						`Cannot save ${relativePath}; the buffer was retained. Files may have changed. Refresh and reconcile before a manual retry; no rollback was attempted.`,
					)
					return false
				} finally {
					finishMutation(owner)
					publishBuffers((version) => version + 1)
				}
			}
			retireBuffer(relativePath)
			conflictsRef.current.delete(relativePath)
			autosavePausedRef.current.delete(relativePath)
			publishBuffers((version) => version + 1)
			return true
		},
		[closeActiveDocument, workspace, originSession, originActivation, originPath],
	)

	useEffect(() => {
		if (
			!isDirty ||
			isLoading ||
			isSaving ||
			!workspace ||
			!activeDocument ||
			autosavePausedRef.current.has(activeDocument.relativePath) ||
			conflictsRef.current.has(activeDocument.relativePath)
		) {
			return
		}
		const timer = window.setTimeout(() => {
			// A synchronous failure can finish before React publishes the busy state,
			// leaving this previously scheduled timer alive. Recheck at execution.
			if (
				!autosavePausedRef.current.has(activeDocument.relativePath) &&
				!conflictsRef.current.has(activeDocument.relativePath)
			)
				void saveDocument()
		}, ORG_AUTOSAVE_DELAY_MS)
		return () => window.clearTimeout(timer)
	}, [activeDocument, content, isDirty, isLoading, isSaving, saveDocument, workspace])

	const captureEntry = useCallback(
		async (entrySource: string, targetRelativePath: string): Promise<OrgCaptureOutcome> => {
			if (!workspace || !isCurrentOrigin())
				return { kind: "rejected", message: "The workspace or source buffer is no longer current." }
			const relativePath = targetRelativePath.trim()
			if (mutationInProgressRef.current || protectedPath(relativePath)) {
				const message = mutationInProgressRef.current
					? "Another workspace operation is running; wait before capturing."
					: `Save or reconcile changes before capturing to ${relativePath}.`
				setError(message)
				return { kind: "rejected", message }
			}
			const generation = editGenerationRef.current
			const body = latestContentRef.current
			const parked = parkedReservoir.read(identityScope, relativePath)
			const owner = Symbol("captureEntry")
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			openRequestRef.current += 1
			setLoading(false)
			setSaving(true)
			setError(null)
			const current = () => mutationOwnerRef.current === owner && isCurrentOrigin()
			const uncertain = (message: string): OrgCaptureOutcome => {
				if (current()) {
					autosavePausedRef.current.add(relativePath)
					conflictsRef.current.add(relativePath)
					setError(message)
					publishBuffers((version) => version + 1)
				}
				return { kind: "uncertain", message }
			}
			try {
				const result = await captureOrgEntryFlow({
					entrySource,
					relativePath,
					workspaceRoot: workspace.rootPath,
					capabilityToken: workspace.capabilityToken,
				})()
				if (!current())
					return {
						kind: "uncertain",
						message: "Capture origin changed; reread the target before retrying.",
					}
				if (E.isLeft(result)) {
					if (result.left.type === "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR")
						return uncertain(result.left.message)
					setError(result.left.message)
					return { kind: "rejected", message: result.left.message }
				}
				const confirmed = result.right
				if (
					confirmed.relativePath !== relativePath ||
					typeof confirmed.revision !== "string" ||
					!confirmed.revision ||
					typeof confirmed.content !== "string"
				)
					return uncertain(
						"Capture returned an invalid confirmation; reread the target and reconcile. Do not retry automatically.",
					)
				setWorkspace((value) => (value ? updateWorkspaceDocument(value, confirmed) : value))
				const newer = installedTargetSource(confirmed, parked, body, generation)
				if (newer) {
					const message =
						"Captured successfully, but newer editor input was retained. Reread and reconcile the target before saving."
					autosavePausedRef.current.add(relativePath)
					conflictsRef.current.add(relativePath)
					setError(message)
					return { kind: "success", message }
				}
				publishBuffers((version) => version + 1)
				return { kind: "success" }
			} catch {
				return uncertain(
					"Capture ended unexpectedly; the target may already contain the entry. Reread and reconcile before retrying. Do not retry automatically. No rollback was attempted.",
				)
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, dirtyPath, originSession, originActivation, originPath],
	)

	const captureTodo = useCallback(
		async (title: string, targetRelativePath = "inbox.org") => {
			if (!workspace || !isCurrentOrigin() || mutationInProgressRef.current) {
				return
			}
			const relativePath = targetRelativePath.trim() || "inbox.org"
			if (protectedPath(relativePath)) {
				setError(`Save or discard changes before capturing to ${relativePath}.`)
				return
			}
			const activeContentAtStart = latestContentRef.current
			const generation = editGenerationRef.current
			const parked = parkedReservoir.read(identityScope, relativePath)
			openRequestRef.current += 1
			const owner = Symbol("captureTodo")
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			setSaving(true)
			setError(null)
			try {
				const result = await captureOrgTodoFlow({
					relativePath,
					title,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(result)) {
					setError(result.left.message)
					return
				}
				setWorkspace((current) =>
					current ? updateWorkspaceDocument(current, result.right) : current,
				)
				if (installedTargetSource(result.right, parked, activeContentAtStart, generation)) {
					setError(
						`Captured to ${relativePath}, but newer input was retained. Reread and reconcile the target before saving.`,
					)
				}
			} catch {
				if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
					setError(
						"captureTodo ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
		},
		[activeDocument, isDirty, workspace, dirtyPath, originSession, originActivation, originPath],
	)

	const createDocument = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: creation, editor freshness checks, and parking are one transaction.
		async (relativePath: string) => {
			if (!workspace || !isCurrentOrigin() || !relativePath.trim() || saveAllOwnerRef.current) {
				return
			}
			if (protectedPath(relativePath)) {
				setError(`Save or discard changes before creating ${relativePath}.`)
				return
			}
			if (mutationInProgressRef.current) {
				const inFlight = saveInFlightRef.current
				if (!inFlight) {
					return
				}
				const contentBeingSaved = saveInFlightContentRef.current
				const saved = await inFlight
				if (!isCurrentOrigin()) return
				if (!canContinueAfterOrgSave(saved, contentBeingSaved, latestContentRef.current)) {
					setError("New edits arrived while saving; note creation was paused until they are saved.")
					return
				}
			}
			if (mutationInProgressRef.current || !isCurrentOrigin()) return
			const sourceAtStart = activeRef.current
			const activationAtStart = activationRef.current
			const owner = Symbol("create")
			mutationOwnerRef.current = owner
			const generationAtStart = editGenerationRef.current
			openRequestRef.current += 1
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			setSaving(true)
			setError(null)
			try {
				const initialContent = initialOrgContent(relativePath)
				const result = await saveOrgDocumentFlow({
					content: initialContent,
					expectedRevision: "<missing>",
					relativePath,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})()
				if (
					!isCurrentOrigin() ||
					mutationOwnerRef.current !== owner ||
					sessionRef.current !== originSession ||
					activationRef.current !== activationAtStart ||
					activeRef.current?.relativePath !== sourceAtStart?.relativePath
				)
					return
				if (E.isLeft(result)) {
					setError(result.left.message)
					return
				}
				const document = { ...result.right, content: initialContent }
				setWorkspace((current) =>
					current
						? {
								...current,
								documents: [...current.documents, result.right].sort((left, right) =>
									left.relativePath.localeCompare(right.relativePath),
								),
							}
						: current,
				)
				if (generationAtStart !== editGenerationRef.current) {
					setError("The new document was created, but newer editor input was retained.")
					return
				}
				const previous = activeRef.current
				if (previous) {
					parkedReservoir.park(identityScope, bufferIdFor(previous.relativePath), {
						content: latestContentRef.current,
						document: previous,
						editGeneration: editGenerationRef.current,
						isDirty: latestContentRef.current !== previous.content,
					})
				}
				parkedReservoir.takeToActivate(
					identityScope,
					bufferIdentity.lookup(identityScope, relativePath) ?? "",
				)
				bufferIdFor(relativePath)
				activationRef.current += 1
				activeRef.current = document
				setActiveDocument(document)
				installSource(initialContent)
			} catch {
				if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
					setError(
						"Create ended unexpectedly; files may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; no rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, bufferIdFor, dirtyPath, originSession, originActivation, originPath],
	)

	const createDirectory = useCallback(
		async (relativePath: string) => {
			if (
				!workspace ||
				!isCurrentOrigin() ||
				mutationInProgressRef.current ||
				!relativePath.trim()
			) {
				return
			}
			openRequestRef.current += 1
			const owner = Symbol("createDirectory")
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			setSaving(true)
			setError(null)
			try {
				const result = await createOrgDirectoryFlow({
					relativePath,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(result)) {
					setError(result.left.message)
					return
				}
				setWorkspace((current) => {
					if (!current) {
						return current
					}
					const directories = new Set(current.directories)
					for (const directory of directoryAndAncestors(relativePath)) {
						directories.add(directory)
					}
					return { ...current, directories: [...directories].sort() }
				})
			} catch {
				if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
					setError(
						"createDirectory ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, originSession, originActivation, originPath],
	)

	const moveActiveDocument = useCallback(
		async (targetRelativePath: string) => {
			const sourceDocument = activeRef.current
			if (
				!workspace ||
				!sourceDocument ||
				!isCurrentOrigin() ||
				mutationInProgressRef.current ||
				!targetRelativePath.trim()
			) {
				return
			}
			if (dirtyPath(sourceDocument.relativePath) || dirtyPath(targetRelativePath)) {
				setError("Save or discard the current changes before moving this document.")
				return
			}
			openRequestRef.current += 1
			const sourcePath = sourceDocument.relativePath
			const sourceId = bufferIdentity.lookup(identityScope, sourcePath)
			const targetId = bufferIdentity.lookup(identityScope, targetRelativePath)
			const owner = Symbol("moveActiveDocument")
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			setSaving(true)
			setError(null)
			try {
				const result = await moveOrgDocumentFlow({
					expectedSourceRevision: sourceDocument.revision,
					sourceRelativePath: sourceDocument.relativePath,
					targetRelativePath,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(result)) {
					setError(result.left.message)
					return
				}
				if (
					!sourceId ||
					bufferIdentity.lookup(identityScope, sourcePath) !== sourceId ||
					bufferIdentity.lookup(identityScope, result.right.relativePath) !== targetId
				) {
					setError("Buffer identity changed while moving; refresh and reconcile.")
					return
				}
				// The root approved the overwrite and verified both mappings after IO.
				if (result.right.relativePath !== sourcePath) retireBuffer(result.right.relativePath)
				if (
					!bufferIdentity.moveApproved(
						identityScope,
						sourcePath,
						result.right.relativePath,
						sourceId,
					)
				) {
					setError("Buffer identity changed while moving; refresh and reconcile.")
					return
				}
				const wasPaused = autosavePausedRef.current.delete(sourcePath)
				const hadConflict = conflictsRef.current.delete(sourcePath)
				autosavePausedRef.current.delete(result.right.relativePath)
				conflictsRef.current.delete(result.right.relativePath)
				if (wasPaused) autosavePausedRef.current.add(result.right.relativePath)
				if (hadConflict) conflictsRef.current.add(result.right.relativePath)
				activationRef.current += 1
				if (activeRef.current)
					activeRef.current = { ...activeRef.current, relativePath: result.right.relativePath }
				setActiveDocument((current) =>
					current?.relativePath === sourcePath
						? { ...current, relativePath: result.right.relativePath }
						: current,
				)
				setWorkspace((current) =>
					current
						? {
								...current,
								documents: current.documents
									.map((document) =>
										document.relativePath === sourcePath ? result.right : document,
									)
									.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
							}
						: current,
				)
			} catch {
				if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
					setError(
						"moveActiveDocument ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
		},
		[activeDocument, workspace, dirtyPath, originSession, originActivation, originPath],
	)

	const migrateLegacyWorkspace = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: preview, source rechecks, atomic publication, and verification are one migration transaction.
		async (legacyWorkspace: WorkspaceInterface) => {
			if (!workspace || !isCurrentOrigin() || mutationInProgressRef.current) {
				return
			}
			openRequestRef.current += 1
			const owner = Symbol("migrateLegacyWorkspace")
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			setLoading(true)
			setError(null)
			setMigrationStatus(null)
			try {
				const prepared = await prepareLegacyMigrationFlow(legacyWorkspace)()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(prepared)) {
					setError(`Migration ${prepared.left.stage} failed: ${prepared.left.cause.message}`)
					return
				}
				const plan = prepared.right
				const placeholders = plan.nodeResults.filter(
					({ status }) => status === "placeholder",
				).length
				const warnedNodes = plan.nodeResults.filter(({ warnings }) => warnings.length > 0)
				const warningEntries = [
					...warnedNodes.map(({ path, warnings }) => `• ${path}: ${warnings.join(", ")}`),
					...plan.warnings.map((warning) => `• ${warning}`),
				]
				const warningCount =
					plan.nodeResults.reduce((count, result) => count + result.warnings.length, 0) +
					plan.warnings.length
				const omittedWarnings = Math.max(0, warningEntries.length - 8)
				const warningPreview = [
					...warningEntries.slice(0, 8),
					...(omittedWarnings > 0 ? [`…and ${omittedWarnings} more affected paths.`] : []),
				].join("\n")
				const confirmed = window.confirm(
					`Migrate “${legacyWorkspace.title}” into ${plan.rootDirectory}?\n\n` +
						`${plan.documents.length} Org documents, ${plan.directories.length} directories, ` +
						`${plan.rawBackups.length} raw backups, ${placeholders} placeholders, ` +
						`${warningCount} warnings.\n\n` +
						(warningPreview ? `Warning preview:\n${warningPreview}\n\n` : "") +
						"Every selected-workspace and recoverable orphan content row is backed up. Existing paths will never be reused or overwritten.",
				)
				if (!isCurrentOrigin() || !confirmed) {
					return
				}
				const refreshedPlan = await prepareLegacyMigrationFlow(legacyWorkspace)()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(refreshedPlan)) {
					setError(
						`Migration source recheck ${refreshedPlan.left.stage} failed: ${refreshedPlan.left.cause.message}`,
					)
					return
				}
				if (!areLegacyMigrationPlansEquivalent(refreshedPlan.right, plan)) {
					setError("Legacy source changed during confirmation; review the new plan and retry.")
					return
				}
				const written = await executeLegacyMigrationFlow(
					workspace.rootPath,
					workspace.capabilityToken,
					refreshedPlan.right,
				)()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(written)) {
					setError(`Migration ${written.left.stage} failed: ${written.left.cause.message}`)
					return
				}
				const finalPlan = await prepareLegacyMigrationFlow(legacyWorkspace)()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (
					E.isLeft(finalPlan) ||
					!areLegacyMigrationPlansEquivalent(finalPlan.right, refreshedPlan.right)
				) {
					setError(
						"Migration artifacts are verified, but the legacy source changed during publication. The output is a recoverable snapshot of the earlier state and must not be treated as current.",
					)
					return
				}
				setMigrationStatus(
					`Verified ${written.right.verification.checkedCount} migrated artifacts. Evidence: ${written.right.write.verificationPath}. Recovery database script: ${refreshedPlan.right.recoverySqlPath}`,
				)
				const rescanned = await scanOrgWorkspaceFlow(
					workspace.rootPath,
					workspace.capabilityToken,
				)()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(rescanned)) {
					setError(`Migration completed, but refresh failed: ${rescanned.left.message}`)
					return
				}
				setWorkspace({ ...rescanned.right, capabilityToken: workspace.capabilityToken })
			} catch {
				if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
					setError(
						"migrateLegacyWorkspace ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, originSession, originActivation, originPath],
	)

	const verifyLegacyMigration = useCallback(
		async (legacyWorkspace: WorkspaceInterface) => {
			if (!workspace || !isCurrentOrigin() || mutationInProgressRef.current) {
				return
			}
			openRequestRef.current += 1
			const owner = Symbol("verifyLegacyMigration")
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			setLoading(true)
			setError(null)
			setMigrationStatus(null)
			try {
				const result = await verifyLegacyMigrationRecoveryFlow(
					legacyWorkspace,
					workspace.rootPath,
					undefined,
					undefined,
					workspace.capabilityToken,
				)()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(result)) {
					setError(
						`Recovery verification ${result.left.stage} failed: ${result.left.cause.message}`,
					)
					return
				}
				setMigrationStatus(
					`Recovery verified ${result.right.verification.checkedCount} artifacts against current legacy source.`,
				)
			} catch {
				if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
					setError(
						"verifyLegacyMigration ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, originSession, originActivation, originPath],
	)

	const rebuildDerivedIndex = useCallback(async () => {
		if (!workspace || !isCurrentOrigin() || mutationInProgressRef.current) {
			return
		}
		if (hasDirtyBuffers()) {
			setError("Save the current document before rebuilding the derived index.")
			return
		}
		openRequestRef.current += 1
		const owner = Symbol("rebuildDerivedIndex")
		mutationOwnerRef.current = owner
		mutationInProgressRef.current = true
		refileTargetRequestRef.current += 1
		setLoading(true)
		setError(null)
		setDerivedIndexStatus(null)
		try {
			const rescanned = await scanOrgWorkspaceFlow(workspace.rootPath, workspace.capabilityToken)()
			if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
				return
			}
			if (E.isLeft(rescanned)) {
				setError(rescanned.left.message)
				return
			}
			setWorkspace({ ...rescanned.right, capabilityToken: workspace.capabilityToken })
			const result = await rebuildOrgDerivedIndexFlow({
				...rescanned.right,
				capabilityToken: workspace.capabilityToken,
			})()
			if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
				return
			}
			if (E.isLeft(result)) {
				setError(result.left.message)
				return
			}
			setDerivedIndexStatus(
				`Derived index rebuilt: ${result.right.documentCount} documents, ${result.right.headingCount} headings, ${result.right.linkCount} links, ${result.right.agendaCount} agenda entries.`,
			)
		} catch {
			if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
				setError(
					"rebuildDerivedIndex ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
				)
			}
		} finally {
			finishMutation(owner)
		}
	}, [isDirty, workspace, originSession, originActivation, originPath])

	const clearDerivedIndex = useCallback(async () => {
		if (!workspace || !isCurrentOrigin() || mutationInProgressRef.current) {
			return
		}
		const owner = Symbol("clearDerivedIndex")
		mutationOwnerRef.current = owner
		mutationInProgressRef.current = true
		refileTargetRequestRef.current += 1
		setLoading(true)
		setError(null)
		setDerivedIndexStatus(null)
		try {
			const result = await clearOrgDerivedIndexFlow(workspace.rootPath, workspace.capabilityToken)()
			if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
				return
			}
			if (E.isLeft(result)) {
				setError(result.left.message)
				return
			}
			setDerivedIndexStatus("Derived index cleared. Org files were not modified.")
		} catch {
			if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
				setError(
					"clearDerivedIndex ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
				)
			}
		} finally {
			finishMutation(owner)
		}
	}, [workspace, originSession, originActivation, originPath])

	const runLegacyRecoveryDrill = useCallback(
		async (legacyWorkspace: WorkspaceInterface) => {
			if (!workspace || !isCurrentOrigin() || mutationInProgressRef.current) {
				return
			}
			const owner = Symbol("runLegacyRecoveryDrill")
			mutationOwnerRef.current = owner
			mutationInProgressRef.current = true
			refileTargetRequestRef.current += 1
			setLoading(true)
			setError(null)
			setMigrationStatus(null)
			try {
				const result = await runLegacyMigrationRecoveryDrillFlow(
					legacyWorkspace,
					workspace.rootPath,
					undefined,
					undefined,
					workspace.capabilityToken,
				)()
				if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(result)) {
					setError(`Recovery drill ${result.left.stage} failed: ${result.left.cause.message}`)
					return
				}
				setMigrationStatus(
					`Recovery drill passed: reconstructed ${result.right.recoveredContentCount} legacy content rows from raw backups and verified ${result.right.verification.checkedCount} artifacts. Recovery database script: ${result.right.recoverySqlPath}`,
				)
			} catch {
				if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
					setError(
						"runLegacyRecoveryDrill ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, originSession, originActivation, originPath],
	)

	const deleteActiveDocument = useCallback(async () => {
		const sourceDocument = activeRef.current
		if (!workspace || !sourceDocument || !isCurrentOrigin() || mutationInProgressRef.current) {
			return
		}
		if (
			dirtyPath(sourceDocument.relativePath) &&
			!window.confirm("Delete this file and permanently discard unsaved changes?")
		) {
			return
		}
		if (!isCurrentOrigin() || mutationInProgressRef.current) return
		openRequestRef.current += 1
		const owner = Symbol("deleteActiveDocument")
		mutationOwnerRef.current = owner
		mutationInProgressRef.current = true
		refileTargetRequestRef.current += 1
		setSaving(true)
		setError(null)
		const sourcePath = sourceDocument.relativePath
		const generationAtDelete = editGenerationRef.current
		try {
			const result = await deleteOrgDocumentFlow({
				expectedRevision: sourceDocument.revision,
				relativePath: sourcePath,
				capabilityToken: workspace.capabilityToken,
				workspaceRoot: workspace.rootPath,
			})()
			if (mutationOwnerRef.current !== owner || !isCurrentOrigin()) {
				return
			}
			if (E.isLeft(result)) {
				setError(result.left.message)
				return
			}
			setWorkspace((current) =>
				current
					? {
							...current,
							documents: current.documents.filter(
								(document) => document.relativePath !== sourcePath,
							),
						}
					: current,
			)
			if (generationAtDelete !== editGenerationRef.current) {
				conflictsRef.current.add(sourcePath)
				autosavePausedRef.current.add(sourcePath)
				setDirty(true)
				setError(`The file ${sourcePath} was deleted, but newer editor input was retained.`)
				return
			}
			retireBuffer(sourcePath)
			conflictsRef.current.delete(sourcePath)
			autosavePausedRef.current.delete(sourcePath)
			activationRef.current += 1
			activeRef.current = null
			setActiveDocument(null)
			installSource("")
			setDirty(false)
		} catch {
			if (mutationOwnerRef.current === owner && isCurrentOrigin()) {
				setError(
					"deleteActiveDocument ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
				)
			}
		} finally {
			finishMutation(owner)
		}
	}, [activeDocument, workspace, dirtyPath, originSession, originActivation, originPath])

	return {
		liveBuffers,
		registerBufferWindow,
		activateOpenBuffer,
		activeBufferRuntime,
		activeBufferId: activeDocument ? bufferIdFor(activeDocument.relativePath) : null,
		activeDocument,
		archiveSubtree,
		captureTodo,
		captureEntry,
		setTransientDirty,
		clearDerivedIndex,
		closeActiveDocument,
		closeDocumentPath,
		content,
		createDirectory,
		createDocument,
		deleteActiveDocument,
		derivedIndexStatus,
		error,
		isDirty,
		isLoading: isLoading || !nativeCloseReady,
		isEditorReadOnly: isLoading || !nativeCloseReady || (isSaving && !saveInFlightRef.current),
		isSaving,
		migrateLegacyWorkspace,
		migrationStatus,
		moveActiveDocument,
		openBuffers,
		openDefaultWorkspace,
		openDocument,
		openDocumentAt,
		openDocumentPath,
		switchBuffer,
		openOrgLink,
		actOnAgendaEntry,
		executeAgendaCommand,
		prepareAgendaPlanning,
		rebuildDerivedIndex,
		refileSubtree,
		readRefileTarget,
		refreshWorkspace,
		revealTarget,
		runLegacyRecoveryDrill,
		saveDocument,
		saveAllDocuments,
		selectWorkspace,
		updateContent,
		verifyLegacyMigration,
		workspace,
		workspaceSessionId,
	}
}
