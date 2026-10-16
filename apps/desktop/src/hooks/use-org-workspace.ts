import { useBlocker, useNavigate } from "@tanstack/react-router"
import * as E from "fp-ts/Either"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { useConfirm } from "@/views/ui/confirm"
import {
	captureOrgTodoFlow,
	createOrgDirectoryFlow,
	deleteOrgDocumentFlow,
	moveOrgDocumentFlow,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	reopenDefaultOrgWorkspaceFlow,
	revealOrgWorkspacePathFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
	selectOrgWorkspaceFlow,
} from "@/flows/org-workspace/org-workspace.flow"
import { captureOrgEntryFlow, readOrgCaptureTargetFlow } from "@/flows/org-workspace/org-capture-entry.flow"
import { createOrgFreshDocumentFlow } from "@/flows/org-workspace/org-fresh-document-create.flow"
import type { OrgDiaryOutcome } from "@/pipes/org/org-diary.pipe"
import { planOrgDiary } from "@/pipes/org/org-diary.pipe"
import { orgNoteSource, validateOrgRoamNoteCapture } from "@/pipes/org/org-note.pipe"
import type { OrgNoteOutcome, OrgRoamNotePlan } from "@/pipes/org/org-note.pipe"
import type { OrgFreshDocumentOutcome, OrgFreshDocumentPlan } from "@/types/org/org-fresh-document.types"
import {
	clearOrgDerivedIndexFlow,
	rebuildOrgDerivedIndexFlow,
} from "@/flows/org-workspace/org-derived-index.flow"
import {
	archiveOrgSubtreeFlow,
	refileOrgSubtreeFlow,
} from "@/flows/org-workspace/org-subtree-refile.flow"
import { readOrgRefileTargetFlow } from "@/flows/org-workspace/org-refile-target.flow"
import { resolveOrgLinkTargetFlow } from "@/flows/org-workspace/org-link-target.flow"
import {
	saveAllOrgDocumentsFlow,
	type OrgSaveAllCapture,
} from "@/flows/org-workspace/org-save-all.flow"
import { saveOrgWorkingCopyFlow } from "@/flows/org-workspace/org-save-working-copy.flow"
import { runOrgRemarkMutationFlow } from "@/flows/org-workspace/org-remark.flow"
import { orgRemarkNotesPath } from "@/pipes/org/org-remark.pipe"
import type { OrgRemarkAction } from "@/pipes/org/org-remark.types"
import type {
	OrgRemarkActionOutcome,
	OrgRemarkNotesContext,
	OrgRemarkReadOutcome,
	OrgRemarkSourceCapture,
} from "@/types/org/org-remark-workflow.types"
import type { OrgBufferRuntime } from "@/flows/org-editor-runtime"
import { createOrgRemarkTracker } from "@/flows/org-editor-runtime/org-remark-tracker"
import { createOrgWorkspaceEffectOwner } from "@/flows/org-editor-runtime/org-workspace-effect-owner"
import { createOrgWorkspaceSessionOwner, type OrgWorkspaceFileCapture } from "@/flows/org-editor-runtime/org-workspace-session-owner"
import type { OrgFileDiskState, OrgFileReview, OrgFileReviewChoice, OrgFileReviewOutcome } from "@/flows/org-editor-runtime/org-file-review.types"
import { formatOrgLocalTimestamp } from "@/pipes/org/org-todo-logging.pipe"
import { createOrgClockOwner, type OrgClockOwner } from "@/flows/org-workspace/org-clock-owner"
import type { OrgAgendaEntry } from "@/pipes/org/org-agenda.pipe"
import type {
	OrgAgendaActionOutcome,
	OrgAgendaCommand,
	OrgAgendaPreparation,
	OrgAgendaExecutionOptions,
	OrgAgendaOperation,
} from "@/types/org/org-agenda-command.types"
import { runOrgAgendaOperationFlow } from "@/flows/org-workspace/org-agenda-command.flow"
import { orgWorkspaceEventAdapter } from "@/io/event/org-workspace-event.adapter"
import {
	isAuthorizedOrgPathAbsent,
	releaseOrgWorkspace,
	unwatchOrgWorkspace,
	watchOrgWorkspace,
} from "@/io/file/org-file.repository"
import {
	guardOrgWorkingCopyBaseline,
} from "@/pipes/editor/org-working-copy-ack.pipe"
import { validateOrgCaptureInput, validateOrgCaptureTarget, type OrgLinkClickTarget } from "@/pipes/org"
import type {
	OrgRefileTargetSnapshot,
	OrgRefileHeadingTarget,
} from "@/pipes/org/org-refile-target.pipe"
import { deriveOrgArchivePath, isSafeRelativeOrgPath, type OrgRefileLoggingIntent } from "@/pipes/org/org-subtree-refile.pipe"
import type {
	OrgDocumentEntryInterface,
	OrgDocumentInterface,
	OrgWorkspaceInterface,
	OrgDocumentWriteResultInterface,
	OrgOriginalRecoveryEntryInterface,
} from "@/types/org"
import type { LegacyMigrationWorkspace } from "@/flows/org-workspace/legacy-migration.flow"
import { createDebouncedOrgWorkspaceRefresh, matchesOrgWorkspaceWatch } from "./org-workspace-watch"
import { useOrgWindowClose } from "./use-org-window-close"
import { orgQuerySourcesFromController } from "./org-query-sources"
import type { OrgCaptureTarget, OrgCaptureTargetPreview, OrgCaptureRequest } from "@/types/editor/org-capture.interface"
import { type OrgNativeWindowSnapshot, type OrgNativeWindowCoordinator, createOrgNativeWindowCoordinator } from "@/flows/org-native-window/org-native-window-coordinator"
import { isTauri } from "@tauri-apps/api/core"
import { useApplicationTools } from "@/views/application/application-tool-provider"
import { useSettings } from "./use-settings"

export const ORG_WORKSPACE_PREFERENCE_KEY = "grain:org-workspace-preference"
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

export type OrgCaptureTargetOutcome =
	| { readonly kind: "ready"; readonly target: OrgCaptureTarget; readonly expectedRevision: string; readonly preview: OrgCaptureTargetPreview }
	| { readonly kind: "rejected"; readonly message: string }

export type OrgRefileTargetOutcome =
	| { readonly kind: "ready"; readonly snapshot: OrgRefileTargetSnapshot }
	| { readonly kind: "rejected"; readonly message: string }

export interface OrgRefileTargetSelection {
	readonly snapshot: OrgRefileTargetSnapshot
	readonly targetHeading?: Pick<OrgRefileHeadingTarget, "from" | "heading">
	readonly logging?: OrgRefileLoggingIntent
}

export type OrgSubtreeTransferOutcome =
	| { readonly kind: "success"; readonly message?: string }
	| { readonly kind: "rejected"; readonly message: string }
	| { readonly kind: "partial"; readonly message: string }

export interface OrgCapturedBufferTransfer {
	readonly readRefileTarget: (path: string, signal?: AbortSignal) => Promise<OrgRefileTargetOutcome>
	readonly refileSubtree: (cursor: number, path: string, selection?: OrgRefileTargetSelection) => Promise<OrgSubtreeTransferOutcome>
	readonly archiveSubtree: (cursor: number) => Promise<OrgSubtreeTransferOutcome>
}
export interface OrgCapturedBufferNavigation {
	readonly openOrgLink: (target: OrgLinkClickTarget) => Promise<boolean>
	readonly createDiary: () => Promise<OrgDiaryOutcome>
	readonly openDocumentAt: (relativePath: string, line: number, expectedRevision?: string | null,
		isTargetCurrent?: (phase: "before" | "after") => boolean, signal?: AbortSignal) => Promise<boolean>
}
interface OrgTransferSource {
	readonly capture: OrgWorkspaceFileCapture
	readonly isCurrent: () => boolean
}
interface OrgNavigationSource extends OrgTransferSource {
	readonly navigate: (bufferId: string, line: number) => Promise<boolean>
}

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

export type {
	OrgAgendaActionOutcome,
	OrgAgendaCommand,
	OrgAgendaPreparation,
	OrgAgendaExecutionOptions,
} from "@/types/org/org-agenda-command.types"

export interface OrgBufferEffectState {
	readonly busy: boolean
	readonly loading: boolean
	readonly saving: boolean
	readonly readOnly: boolean
}

export interface OrgWorkspaceController {
	readonly clock: OrgClockOwner
	readonly executeAgendaCommand: (
		entry: OrgAgendaEntry,
		command: OrgAgendaCommand,
		signal?: AbortSignal,
		options?: OrgAgendaExecutionOptions,
	) => Promise<OrgAgendaActionOutcome>
	/** Revalidates the current target without allocating a buffer or changing provenance. */
	readonly prepareAgendaCommand: (
		entry: OrgAgendaEntry,
		kind: "schedule" | "deadline" | "todo-state",
		signal?: AbortSignal,
	) => Promise<OrgAgendaPreparation>
	/** Live working-copy views; .org refresh/watch/CAS remains the disk authority. */
	readonly liveBuffers: readonly OrgLiveBuffer[]
	/** Mounted view lease permitting exact-source edits to its parked canonical runtime. */
	readonly registerBufferWindow: (windowId: string, bufferId: string) => () => void
	/** Opaque exact-registration authority; replacement with the same IDs cannot revive it. */
	readonly captureBufferWindowPermit: (windowId: string, bufferId: string) => () => boolean
	/** File effect owner captured independently of later buffer/window focus. */
	readonly captureBufferSave: (bufferId: string) => (() => Promise<boolean>) | null
	/** Captures the exact mounted file/window before palette focus changes. Read-only until an explicit choice. */
	readonly captureFileReview: (bufferId: string, windowId: string, relativePath?: string) => ((signal?: AbortSignal) => Promise<OrgFileReviewOutcome>) | null
	readonly protectedPaths: readonly string[]
	readonly acceptFileReview: (review: OrgFileReview, choice: OrgFileReviewChoice, discardConsent?: boolean, signal?: AbortSignal) => Promise<OrgFileReviewOutcome>
	readonly cancelFileReview: (review: OrgFileReview) => void
	readonly isFileReviewCurrent: (review: OrgFileReview) => boolean
	/** Memory-only handoff; disjoint file effects do not block focus or invalidate their ACKs. */
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
	/** Aggregate IO state, for application exit and workspace replacement. */
	readonly isWorkspaceBusy: boolean
	/** Exclusive workspace barrier, not an unrelated file's save. */
	readonly isWorkspaceBlocked: boolean
	readonly getBufferEffectState: (bufferId: string) => OrgBufferEffectState | null
	readonly nativeWindowsAvailable: boolean
	readonly nativeWindows: OrgNativeWindowSnapshot["windows"]
	readonly detachBuffer: (bufferId: string, originWindowId?: string) => Promise<string | null>
	readonly attachNativeWindow: (label: string, generation: number, targetWindowId?: string) => Promise<boolean>
	readonly rebindNativeWindow: (label: string, generation: number, bufferId: string) => Promise<boolean>
	readonly closeNativeWindow: (label: string, generation: number) => Promise<boolean>
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
		isTargetCurrent?: (phase: "before" | "after") => boolean,
		signal?: AbortSignal,
	) => Promise<boolean>
	readonly openOrgLink: (target: OrgLinkClickTarget) => Promise<boolean>
	readonly createDocument: (relativePath: string) => Promise<boolean>
	readonly createDiary: () => Promise<OrgDiaryOutcome>
	readonly createRoamNote: (
		plan: OrgRoamNotePlan,
		options?: { readonly open?: boolean },
	) => Promise<OrgNoteOutcome>
	readonly readRemarkNotes: (
		source: OrgRemarkSourceCapture,
		signal?: AbortSignal,
		options?: { readonly mount?: boolean },
	) => Promise<OrgRemarkReadOutcome>
	readonly executeRemarkMutation: (
		source: OrgRemarkSourceCapture,
		notes: OrgRemarkNotesContext,
		action: OrgRemarkAction,
	) => Promise<OrgRemarkActionOutcome>
	readonly saveRemarkNotes: (notes: OrgRemarkNotesContext) => Promise<OrgRemarkActionOutcome>
	readonly readCaptureTarget: (target: OrgCaptureTarget, signal?: AbortSignal) => Promise<OrgCaptureTargetOutcome>
	readonly captureEntry: (request: OrgCaptureRequest) => Promise<OrgCaptureOutcome>
	readonly setTransientDirty: (id: string, dirty: boolean) => boolean
	readonly captureTodo: (title: string, targetRelativePath?: string) => Promise<void>
	readonly readRefileTarget: (path: string, signal?: AbortSignal) => Promise<OrgRefileTargetOutcome>
	readonly refileSubtree: (
		cursor: number,
		targetRelativePath: string,
		target?: OrgRefileTargetSelection,
	) => Promise<OrgSubtreeTransferOutcome>
	readonly archiveSubtree: (cursor: number) => Promise<OrgSubtreeTransferOutcome>
	readonly captureBufferTransfer: (bufferId: string, windowId: string, isCurrent: () => boolean) => OrgCapturedBufferTransfer | null
	readonly captureBufferNavigation: (bufferId: string, windowId: string, isCurrent: () => boolean,
		navigate: (bufferId: string, line: number) => Promise<boolean>) => OrgCapturedBufferNavigation | null
	readonly createDirectory: (relativePath: string) => Promise<boolean>
	readonly revealWorkspacePath: (relativePath: string | null) => Promise<boolean>
	readonly moveDocument: (entry: OrgDocumentEntryInterface, targetRelativePath: string) => Promise<boolean>
	readonly deleteDocument: (entry: OrgDocumentEntryInterface) => Promise<boolean>
	readonly migrateLegacyWorkspace: (legacyWorkspace: LegacyMigrationWorkspace) => Promise<void>
	readonly verifyLegacyMigration: (legacyWorkspace: LegacyMigrationWorkspace) => Promise<void>
	readonly runLegacyRecoveryDrill: (legacyWorkspace: LegacyMigrationWorkspace) => Promise<void>
	readonly rebuildDerivedIndex: () => Promise<void>
	readonly clearDerivedIndex: () => Promise<void>
	readonly updateContent: (content: string) => void
	readonly saveDocument: () => Promise<boolean>
	readonly saveAllDocuments: () => Promise<OrgSaveAllOutcome>
	readonly closeActiveDocument: () => Promise<boolean>
}

const initialOrgContent = (relativePath: string): string => {
	if (relativePath.endsWith("-notes.org")) return ""
	const filename = relativePath.split("/").at(-1) ?? relativePath
	const title = filename.replace(/\.org$/i, "")
	return orgNoteSource(new Date(), crypto.randomUUID(), title)
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
	originalRecovery = document.originalRecovery,
): OrgWorkspaceInterface => {
	const entry = { relativePath: document.relativePath, revision: document.revision }
	const exists = workspace.documents.some(
		(current) => current.relativePath === document.relativePath,
	)
	return {
		...workspace,
		...(originalRecovery ? {
			originalRecoveries: [...(workspace.originalRecoveries ?? []).filter((entry) => entry.relativePath !== originalRecovery.relativePath), originalRecovery],
		} : {}),
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
	const confirm = useConfirm()
	const autoSave = useSettings((state) => state.autoSave)
	const autoSaveInterval = useSettings((state) => state.autoSaveInterval)
	const autoSaveDelay = Number.isFinite(autoSaveInterval) ? autoSaveInterval * 1000 : Number.NaN
	const navigate = useNavigate()
	const { registry: toolRegistry, tools: applicationTools } = useApplicationTools()
	const pendingTool = () => toolRegistry.getSnapshot().some((tool) => tool.state.pending)
	const captureToolDiscardPermit = () => {
		const captured = toolRegistry.getSnapshot().filter((tool) => tool.open)
		return () => {
			const current = toolRegistry.getSnapshot().filter((tool) => tool.open)
			return current.length === captured.length && captured.every((tool) => current.some((next) =>
				next.lease === tool.lease && next.windowId === tool.windowId &&
				next.state.fence === tool.state.fence && next.state.dirty === tool.state.dirty && !next.state.pending,
			))
		}
	}
	const confirmationLifetime = useRef<AbortController | null>(null)
	if (!confirmationLifetime.current) confirmationLifetime.current = new AbortController()
	const [workspace, setWorkspace] = useState<OrgWorkspaceInterface | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [migrationStatus, setMigrationStatus] = useState<string | null>(null)
	const [derivedIndexStatus, setDerivedIndexStatus] = useState<string | null>(null)
	const [revealTarget, setRevealTarget] = useState<OrgWorkspaceRevealTarget | null>(null)
	const revealRequestRef = useRef(0)
	const linkRequestRef = useRef(0)
	const linkAbortRef = useRef<AbortController | null>(null)
	const refileTargetRequestRef = useRef(0)
	const [refileTargets] = useState(() => new WeakMap<OrgRefileTargetSnapshot, {
		readonly source: OrgWorkspaceFileCapture
		readonly target: OrgWorkspaceFileCapture
	}>())
	const captureTargetRequestRef = useRef(0)
	const openRequestRef = useRef(0)
	const [effects] = useState(() => createOrgWorkspaceEffectOwner({ emitError: setError }))
	const effectSnapshot = useSyncExternalStore(effects.subscribe, effects.getSnapshot, effects.getSnapshot)
	const finishMutation = effects.finish
	const refreshWorkspaceRef = useRef<() => Promise<void>>(async () => undefined)
	const restoreAttemptedRef = useRef(false)
	const refreshRetryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	const workspaceRoot = workspace?.rootPath ?? null
	const [session] = useState(() =>
		createOrgWorkspaceSessionOwner({
			effects,
			emitError: setError,
			releaseGrant: async (grant) => releaseOrgWorkspace(grant.rootPath, grant.capabilityToken!)(),
		}),
	)
	const [clock] = useState(createOrgClockOwner)
	const sessionSnapshot = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
	const {
		document: activeDocument,
		source: content,
		isDirty,
		sessionId: workspaceSessionId,
		activeRuntime: activeBufferRuntime,
	} = sessionSnapshot
	const focusedEffect = activeDocument ? effects.getFileSnapshot(activeDocument.relativePath) : null
	const isLoading = focusedEffect?.loading ?? effectSnapshot.globalLoading
	const isSaving = focusedEffect?.saving ?? false
	const originGrant = sessionSnapshot.grant
	const originSession = workspaceSessionId
	const originActivation = sessionSnapshot.activation
	const originPath = activeDocument?.relativePath ?? null
	const origin = { grant: originGrant, sessionId: originSession, activation: originActivation, path: originPath }
	const isCurrentOrigin = () => session.isCurrentOrigin(origin)
	const registry = session.runtimes
	const bufferIdentity = session.identity
	const parkedReservoir = session.parked
	const identityScope = sessionSnapshot.scope
	const runtimeKey = session.key
	const runtimeFor = (id: string, scope = identityScope) => registry.get(runtimeKey(id, scope))
	const retireBuffer = (path: string) => session.retire(identityScope, path)
	const runtimeIncarnation = session.runtimeIncarnation
	const dirtyPath = session.dirtyPath
	const protectedPath = session.protectedPath
	const fileBusy = (...paths: string[]) => paths.some((path) => effects.getFileSnapshot(path).busy)
	const currentFileBaseline = (path: string, scope = identityScope) =>
		session.document?.relativePath === path ? session.document : parkedReservoir.read(scope, path)?.document
	const getBufferEffectState = useCallback((bufferId: string): OrgBufferEffectState | null => {
		if (!session.matches(identityScope)) return null
		const path = bufferIdentity.findPath(identityScope, bufferId)
		if (!path) return null
		const effect = effects.getFileSnapshot(path)
		return {
			busy: effect.busy,
			loading: effect.loading,
			saving: effect.saving,
			readOnly: !session.closeReady || effect.loading || (effect.busy && !effect.saveInFlight),
		}
	}, [session, identityScope, effects])
	// Install only a confirmed filesystem body. A concurrent working copy keeps its
	// canonical source/history, but receives the accepted disk baseline for reconciliation.
	const installedTargetSource = (
		confirmed: OrgDocumentInterface,
		capture: ReturnType<typeof session.captureFile>,
	): boolean => {
		if (!capture) throw new Error("The file capture is no longer issued by this workspace.")
		const result = session.installConfirmedTarget(identityScope, { document: confirmed, capture })
		if (result.kind === "rejected") throw new Error(result.reason)
		return result.retainedWorkingCopy
	}

	const remarkNotesSnapshot = (path: string): OrgRemarkNotesContext | null => {
		const live = session.snapshotLiveBuffers(identityScope).find((buffer) => buffer.document.relativePath === path)
		if (!live || !workspace || !originSession) return null
		return {
			workspaceSessionId: originSession,
			rootPath: workspace.rootPath,
			document: live.document,
			content: live.runtime.source,
			bufferId: live.bufferId,
			runtime: live.runtime,
			runtimeIncarnation: live.runtimeIncarnation,
			sourceGeneration: live.runtime.revision,
		}
	}
	const remarkNotesAreCurrent = (notes: OrgRemarkNotesContext): boolean => {
		if (!workspace || notes.rootPath !== workspace.rootPath || notes.workspaceSessionId !== originSession ||
			!session.matches(identityScope) || !isSafeRelativeOrgPath(notes.document.relativePath) ||
			!notes.document.relativePath.endsWith("-notes.org")) return false
		const live = remarkNotesSnapshot(notes.document.relativePath)
		if (!notes.runtime) return !live && notes.bufferId === null && notes.content === notes.document.content
		return !!live && !notes.runtime.closed && live.runtime === notes.runtime &&
			live.bufferId === notes.bufferId && live.runtimeIncarnation === notes.runtimeIncarnation &&
			live.sourceGeneration === notes.sourceGeneration && live.content === notes.content &&
			live.document.revision === notes.document.revision && live.document.content === notes.document.content
	}
	const remarkSourceAuthority = (capture: OrgRemarkSourceCapture, requireWindow: boolean) => {
		const source = Object.freeze({ ...capture })
		const runtime = runtimeFor(source.bufferId)
		const permit = source.windowId
			? session.captureWindowPermit(identityScope, source.windowId, source.bufferId)
			: null
		return () => {
			if (!workspace || !originSession || source.workspaceSessionId !== originSession ||
				!session.matches(identityScope) || !isSafeRelativeOrgPath(source.relativePath) ||
				source.relativePath.endsWith("-notes.org") ||
				bufferIdentity.lookup(identityScope, source.relativePath) !== source.bufferId ||
				!runtime || runtime.closed || runtimeFor(source.bufferId) !== runtime ||
				runtimeIncarnation(runtime) !== source.runtimeIncarnation ||
				runtime.revision !== source.sourceGeneration || runtime.source !== source.source ||
				createOrgRemarkTracker(runtime).getSnapshot().version !== source.remarkVersion ||
				(permit ? !permit() : requireWindow)) return false
			return true
		}
	}
	const mountRemarkNotes = (notes: OrgRemarkNotesContext): OrgRemarkNotesContext | null => {
		if (!remarkNotesAreCurrent(notes)) return null
		if (notes.runtime) return notes
		const id = session.parkCommandSource(identityScope, notes.document.relativePath, notes.document, notes.content)
		if (!id) return null
		session.createParkedRuntime(identityScope, id, notes.content)
		return remarkNotesSnapshot(notes.document.relativePath)
	}
	const pauseRemarkNotes = (path: string) => {
		if (!session.matches(identityScope)) return
		session.protect(identityScope, path, "conflict")
		
	}
	const remarkSavePorts = (owner: symbol, notes: OrgRemarkNotesContext) => ({
		write: saveOrgDocumentFlow,
		isFresh: () => effects.owns(owner) && remarkNotesAreCurrent(notes),
		isCurrent: () => effects.owns(owner) && session.matches(identityScope) &&
			!!notes.bufferId && runtimeFor(notes.bufferId) === notes.runtime && !notes.runtime?.closed &&
			bufferIdentity.lookup(identityScope, notes.document.relativePath) === notes.bufferId,
		onWriteStarted: (settled: Promise<boolean>) => {
			effects.captureSave(owner, settled, notes.content, notes.document.relativePath)
		},
		commitConfirmed: (capture: { readonly content: string }, receipt: OrgDocumentWriteResultInterface) => {
			if (!effects.owns(owner) || !session.matches(identityScope) || !notes.bufferId ||
				runtimeFor(notes.bufferId) !== notes.runtime || notes.runtime?.closed)
				throw new Error("The remark note owner changed while saving")
			const result = session.acknowledgeWorkingCopy(identityScope, {
				bufferId: notes.bufferId,
				expectedDocument: notes.document,
				capturedSource: capture.content,
				receipt,
			})
			if (result.kind === "rejected") throw new Error(result.reason)
			if (!effects.owns(owner) || !session.matches(identityScope)) return
			setWorkspace((value) => value ? updateWorkspaceDocument(value, result.document, receipt.originalRecovery) : value)
		},
	})
	const readRemarkNotes = useCallback(async (
		input: OrgRemarkSourceCapture,
		signal?: AbortSignal,
		options?: { readonly mount?: boolean },
	): Promise<OrgRemarkReadOutcome> => {
		const source = Object.freeze({ ...input })
		const ownsSource = remarkSourceAuthority(source, false)
		const stale: OrgRemarkReadOutcome = { kind: "stale", message: "The source changed while remark notes were opening." }
		if (!workspace || !originSession || !ownsSource() || signal?.aborted) return stale
		const path = orgRemarkNotesPath(source.relativePath)
		const existing = remarkNotesSnapshot(path)
		if (existing) return { kind: "ready", notes: existing }
		const current = () => ownsSource() && !signal?.aborted
		try {
			const scan = await scanOrgWorkspaceFlow(workspace.rootPath, workspace.capabilityToken)()
			if (!current()) return stale
			if (E.isLeft(scan)) return { kind: "rejected", message: scan.left.message }
			const exists = scan.right.documents.some((entry) => entry.relativePath === path)
			let document: OrgDocumentInterface = { relativePath: path, revision: "<missing>", content: "" }
			if (exists) {
				const opened = await openOrgDocumentFlow({ relativePath: path, workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken })()
				if (!current()) return stale
				if (E.isLeft(opened)) return { kind: "rejected", message: opened.left.message }
				document = opened.right
			}
			if (!current()) return stale
			const notes: OrgRemarkNotesContext = {
				workspaceSessionId: originSession, rootPath: workspace.rootPath, document, content: document.content,
				bufferId: null, runtime: null, runtimeIncarnation: null, sourceGeneration: null,
			}
			if (!remarkNotesAreCurrent(notes)) return stale
			const mounted = options?.mount && exists ? mountRemarkNotes(notes) : notes
			return mounted ? { kind: "ready", notes: mounted } : stale
		} catch {
			return current() ? { kind: "rejected", message: "Cannot read the source-side remark notes." } : stale
		}
	}, [workspace, identityScope])
	const executeRemarkMutation = useCallback(async (
		inputSource: OrgRemarkSourceCapture,
		inputNotes: OrgRemarkNotesContext,
		inputAction: OrgRemarkAction,
	): Promise<OrgRemarkActionOutcome> => {
		const source = Object.freeze({ ...inputSource })
		const notes = Object.freeze({ ...inputNotes, document: Object.freeze({ ...inputNotes.document }) })
		const action: OrgRemarkAction = inputAction.type === "sync"
			? { ...inputAction, marks: inputAction.marks.map((mark) => Object.freeze({ ...mark })) }
			: { ...inputAction }
		const sourceIsCurrent = remarkSourceAuthority(source, action.type !== "sync")
		const ownsSource = () => sourceIsCurrent() && (action.type !== "sync" ||
			session.snapshotLiveBuffers(identityScope).some((live) => live.bufferId === source.bufferId && live.document.content === source.source))
		if (!workspace || fileBusy(source.relativePath, notes.document.relativePath) || !ownsSource() || !remarkNotesAreCurrent(notes))
			return { kind: "stale", message: "The source or remark notes are no longer current." }
		if (session.hasConflict(notes.document.relativePath) || session.isAutosavePaused(notes.document.relativePath))
			return { kind: "rejected", message: "Resolve the remark-notes conflict or paused save before changing highlights." }
		let owner: symbol | null = null
		const owns = () => (owner ? effects.owns(owner) : !fileBusy(source.relativePath, notes.document.relativePath)) && ownsSource()
		let committedNotes: OrgRemarkNotesContext | null = null
		try {
			const result = await runOrgRemarkMutationFlow(source, notes, action, {
				isCurrentSource: owns,
				notesAreCurrent: remarkNotesAreCurrent,
				prepareCanonical: mountRemarkNotes,
				apply: (canonical, edits, guard) => {
					if (!canonical.bufferId) return false
					const applied = registry.applyCommandEdits(runtimeKey(canonical.bufferId), canonical.content, edits, guard)
					committedNotes = remarkNotesSnapshot(canonical.document.relativePath)
					if (applied) {
						owner = effects.begin({ label: "remarkMutation", kind: "save", paths: [source.relativePath, notes.document.relativePath] })
						
						setError(null)
					}
					return applied
				},
				snapshot: remarkNotesSnapshot,
				capabilityToken: workspace.capabilityToken,
				pause: pauseRemarkNotes,
				save: {
					write: saveOrgDocumentFlow,
					isFresh: () => !!owner && !!committedNotes && remarkSavePorts(owner, committedNotes).isFresh(),
					isCurrent: () => !!owner && !!committedNotes && remarkSavePorts(owner, committedNotes).isCurrent(),
					commitConfirmed: (capture, receipt) => {
						if (!owner || !committedNotes) throw new Error("The remark edit does not own its save")
						remarkSavePorts(owner, committedNotes).commitConfirmed(capture, receipt)
					},
				},
			})
			if (result.kind === "uncertain" && session.matches(identityScope)) setError(result.message)
			return result
		} catch {
			if (committedNotes) pauseRemarkNotes(notes.document.relativePath)
			return { kind: committedNotes ? "uncertain" : "rejected", message: "The remark operation was not confirmed. Existing source and note bodies were retained; no retry or rollback was attempted." }
		} finally {
			if (owner) finishMutation(owner)
		}
	}, [workspace, identityScope])
	const saveRemarkNotes = useCallback(async (input: OrgRemarkNotesContext): Promise<OrgRemarkActionOutcome> => {
		const notes = Object.freeze({ ...input, document: Object.freeze({ ...input.document }) })
		if (!workspace || !notes.runtime || !remarkNotesAreCurrent(notes) || fileBusy(notes.document.relativePath))
			return { kind: "stale", message: "The remark note buffer changed before saving." }
		if (session.hasConflict(notes.document.relativePath) || session.isAutosavePaused(notes.document.relativePath))
			return { kind: "rejected", message: "Resolve the remark-notes conflict or paused save before saving notes." }
		const owner = effects.begin({ label: "saveRemarkNotes", kind: "save", paths: [notes.document.relativePath] })
		
		setError(null)
		try {
			const result = await saveOrgWorkingCopyFlow({
				relativePath: notes.document.relativePath, content: notes.content,
				expectedRevision: notes.document.revision, workspaceRoot: notes.rootPath, capabilityToken: workspace.capabilityToken,
			}, remarkSavePorts(owner, notes))
			if (result.kind === "confirmed") {
				const accepted = remarkNotesSnapshot(notes.document.relativePath)
				if (accepted) return { kind: "confirmed", notes: accepted }
			}
			pauseRemarkNotes(notes.document.relativePath)
			const message = result.kind === "write-left" ? result.error.message : "The remark note draft was retained, but saving was not confirmed. Reconcile before a manual retry."
			if (session.matches(identityScope)) setError(message)
			return { kind: "uncertain", message }
		} finally {
			finishMutation(owner)
		}
	}, [workspace, identityScope])
	const hasDirtyBuffers = session.hasDirtyBuffers
	const setTransientDirty = useCallback(
		(id: string, dirty: boolean) => session.setTransientDirty(identityScope, id, dirty),
		[session, identityScope],
	)
	const aggregateDirty = hasDirtyBuffers()
	const openBuffers: readonly OrgOpenBufferSummary[] = [
		...parkedReservoir
			.list(identityScope)
			.map((buffer) => [buffer.document.relativePath, buffer] as const)
			.map(([relativePath, buffer]) => ({
				baseRevision: buffer.document.revision,
				bufferId: buffer.bufferId,
				hasConflict: session.hasConflict(relativePath),
				autosavePaused: session.isAutosavePaused(relativePath),
				isDirty: buffer.isDirty || dirtyPath(relativePath),
				relativePath,
			})),
		...(activeDocument && activeBufferRuntime
			? [
					{
						baseRevision: activeDocument.revision,
						bufferId: activeBufferRuntime.key.bufferId,
						hasConflict: session.hasConflict(activeDocument.relativePath),
						autosavePaused: session.isAutosavePaused(activeDocument.relativePath),
						isDirty,
						relativePath: activeDocument.relativePath,
					},
				]
			: []),
	]

	const liveBuffers: readonly OrgLiveBuffer[] = session.snapshotLiveBuffers(identityScope)

	const registerBufferWindow = useCallback(
		(windowId: string, bufferId: string) => session.registerWindow(identityScope, windowId, bufferId),
		[session, identityScope],
	)
	const captureBufferWindowPermit = useCallback(
		(windowId: string, bufferId: string) => session.captureWindowPermit(identityScope, windowId, bufferId),
		[session, identityScope],
	)
	const activateOpenBuffer = useCallback(
		(bufferId: string): boolean => {
			const previousActivation = session.activation
			if (!session.activateOpenBuffer(identityScope, bufferId)) return false
			if (session.activation !== previousActivation) {
				openRequestRef.current += 1
				effects.cancelRead()
				setRevealTarget(null)
			}
			return true
		},
		[session, identityScope],
	)
	const nativeCoordinator = useRef<OrgNativeWindowCoordinator | null>(null)
	const [nativeWindowSnapshot, setNativeWindowSnapshot] = useState<OrgNativeWindowSnapshot>({
		windows: [], mainHidden: false,
	})
	useEffect(() => {
		if (!isTauri()) return
		const coordinator = createOrgNativeWindowCoordinator({
			getIssuedScope: () => session.scope,
			snapshotLiveBuffers: (scope) => session.snapshotLiveBuffers(scope),
			windowAuthority: {
				runtimes: { get: (key) => registry.get(key) },
				key: (id, scope) => session.key(id, scope),
				registerWindow: (scope, windowId, bufferId) => session.registerWindow(scope, windowId, bufferId),
			},
			isFileReady: (bufferId, path) => {
				const scope = session.scope
				if (!scope || bufferIdentity.findPath(scope, bufferId) !== path || !session.closeReady) return false
				const effect = effects.getFileSnapshot(path)
				return !effect.loading && (!effect.busy || effect.saveInFlight !== null)
			},
			activateBuffer: async (bufferId, targetWindowId) => {
				const scope = session.scope
				if (!scope || (targetWindowId && !session.captureWindowPermit(scope, targetWindowId, bufferId)())) return false
				const mainTools = toolRegistry.getSnapshot().filter((tool) => tool.open && tool.layout === "main")
				for (const tool of mainTools) if (!await toolRegistry.close(tool.lease, tool.windowId)) return false
				await navigate({ to: "/" })
				if (!session.matches(scope)) return false
				const previous = session.activation
				if (!session.activateOpenBuffer(scope, bufferId)) return false
				if (session.activation !== previous) {
					openRequestRef.current += 1
					effects.cancelRead()
					setRevealTarget(null)
				}
				return true
			},
			saveBuffer: (bufferId) => {
				const scope = session.scope
				const path = bufferIdentity.findPath(scope, bufferId)
				if (!scope || !path) return Promise.resolve(false)
				return saveDocumentPathWithResult(path, scope)
			},
			onError: (error) => setError(error.message),
		})
		nativeCoordinator.current = coordinator
		const update = () => setNativeWindowSnapshot(coordinator.getSnapshot())
		const stopSnapshot = coordinator.subscribe(update)
		const stopSession = session.subscribe(coordinator.synchronize)
		const stopEffects = effects.subscribe(coordinator.synchronize)
		coordinator.synchronize()
		update()
		return () => {
			stopSession()
			stopEffects()
			stopSnapshot()
			if (nativeCoordinator.current === coordinator) nativeCoordinator.current = null
			coordinator.dispose()
		}
	}, [session, effects, toolRegistry, navigate])
	const detachBuffer = useCallback(async (bufferId: string, originWindowId?: string): Promise<string | null> => {
		try {
			const coordinator = nativeCoordinator.current
			if (!coordinator) throw new Error("Native windows require the desktop application.")
			return await coordinator.detach(bufferId, originWindowId)
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error))
			return null
		}
	}, [])
	const attachNativeWindow = useCallback(async (label: string, generation: number, targetWindowId?: string) => {
		const coordinator = nativeCoordinator.current
		if (!coordinator?.getSnapshot().windows.some((window) => window.label === label && window.generation === generation)) return false
		try { return await coordinator.attach(label, targetWindowId) }
		catch (error) { setError(error instanceof Error ? error.message : String(error)); return false }
	}, [])
	const rebindNativeWindow = useCallback(async (label: string, generation: number, bufferId: string) => {
		const coordinator = nativeCoordinator.current
		if (!coordinator?.getSnapshot().windows.some((window) => window.label === label && window.generation === generation)) return false
		try { return await coordinator.rebind(label, bufferId) }
		catch (error) { setError(error instanceof Error ? error.message : String(error)); return false }
	}, [])
	const closeNativeWindow = useCallback(async (label: string, generation: number) => {
		const coordinator = nativeCoordinator.current
		if (!coordinator?.getSnapshot().windows.some((window) => window.label === label && window.generation === generation)) return false
		try { return await coordinator.closeWindow(label) }
		catch (error) { setError(error instanceof Error ? error.message : String(error)); return false }
	}, [])

	const nativeCloseReady = useOrgWindowClose(
		{
			get hasDirtyBuffers() {
				return hasDirtyBuffers() || toolRegistry.getSnapshot().some((tool) => tool.open && tool.state.dirty)
			},
			get isBusy() {
				return effects.busy || pendingTool()
			},
			get hasOtherWindows() {
				return (nativeCoordinator.current?.getSnapshot().windows.length ?? 0) !== 0
			},
		},
		setError,
		() => {
			const domain = session.captureDiscardPermit(), tools = captureToolDiscardPermit()
			return () => domain() && tools()
		},
		(signal) => signal.aborted ? Promise.resolve(false) :
			nativeCoordinator.current?.hideMainWithChildren() ?? Promise.resolve(false),
	)

	useLayoutEffect(() => { session.setCloseReady(nativeCloseReady) }, [session, nativeCloseReady])

	useBlocker({
		disabled: false,
		enableBeforeUnload: aggregateDirty || effectSnapshot.busy || effectSnapshot.loading ||
			applicationTools.some((tool) => (tool.open && tool.state.dirty) || tool.state.pending),
		shouldBlockFn: async () => {
			// Route changes retain canonical buffers/history in the application provider.
			// Only producer-owned scratch surfaces are destroyed by their UI route.
			if (pendingTool()) {
				setError("A tool operation is running; wait for its accepted effect to finish before leaving.")
				return true
			}
			if (!session.hasTransientDirty && !toolRegistry.getSnapshot().some((tool) => tool.open && tool.state.dirty)) return false
			const scope = session.scope
			const permit = captureToolDiscardPermit()
			const accepted = await confirm({
				title: "Discard unsaved changes?",
				description: "Discard unsaved tool drafts before leaving this surface? Canonical Org buffers and history will be retained.",
				confirmText: "Discard",
				cancelText: "Cancel",
				signal: confirmationLifetime.current?.signal,
			})
			return accepted !== true || session.scope !== scope || pendingTool() || !permit()
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
			if (!isCurrentOrigin() || shouldSkipExternalCheck(checking, fileBusy(activeDocument.relativePath))) {
				return
			}
			checking = true
			const capture = session.captureFile(identityScope, activeDocument.relativePath)
			const requestGeneration = openRequestRef.current
			const result = await openOrgDocumentFlow({
				relativePath: activeDocument.relativePath,
				capabilityToken: workspace.capabilityToken,
				workspaceRoot: workspace.rootPath,
			})()
			checking = false
			if (
				disposed ||
				fileBusy(activeDocument.relativePath) ||
				requestGeneration !== openRequestRef.current ||
				!isCurrentOrigin()
			) {
				return
			}
			if (!capture || guardOrgWorkingCopyBaseline(capture.baseline!, currentFileBaseline(activeDocument.relativePath))) return
			if (E.isLeft(result)) {
				if (protectedPath(activeDocument.relativePath)) {
					session.protect(identityScope, activeDocument.relativePath, "conflict")
				}
				setError(`Cannot refresh ${activeDocument.relativePath}: ${result.left.message}`)
				return
			}
			if (result.right.revision === activeDocument.revision) {
				return
			}
			if (protectedPath(activeDocument.relativePath) || capture.runtime?.revision !== capture.sourceGeneration) {
				session.protect(identityScope, activeDocument.relativePath, "conflict")
				setError(`External modification detected for ${activeDocument.relativePath}.`)
				return
			}
			installedTargetSource(result.right, capture)
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
		const sourceDocument = session.document
		if (!workspace || !isCurrentOrigin()) {
			return
		}
		if (!canRefreshWorkspace(workspace, effects.busy)) {
			clearTimeout(refreshRetryTimerRef.current)
			refreshRetryTimerRef.current = setTimeout(() => {
				refreshRetryTimerRef.current = undefined
				void refreshWorkspaceRef.current()
			}, 250)
			return
		}
		const requestGeneration = openRequestRef.current
		const contentAtStart = session.source
		const sourceCapture = sourceDocument ? session.captureFile(identityScope, sourceDocument.relativePath) : null
		const result = await scanOrgWorkspaceFlow(workspace.rootPath, workspace.capabilityToken)()
		if (
			requestGeneration !== openRequestRef.current ||
			effects.busy ||
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
				// Reobserving a latched mismatch is not a new uncertain mutation.
				if (!session.hasConflict(path)) session.protect(identityScope, path, "conflict")
				setError(`External modification detected for ${path}.`)
			}
		}
		
		if (!sourceDocument) {
			return
		}

		const scannedDocument = result.right.documents.find(
			(document) => document.relativePath === sourceDocument.relativePath,
		)
		if (!scannedDocument) {
			if (protectedPath(sourceDocument.relativePath) || !session.fileCaptureIsCurrent(sourceCapture)) {
				if (!session.hasConflict(sourceDocument.relativePath)) session.protect(identityScope, sourceDocument.relativePath, "conflict")
				setError(
					`The open document ${sourceDocument.relativePath} no longer exists in the workspace.`,
				)
			} else {
				session.closeActiveDocument(identityScope)
				setRevealTarget(null)
			}
			return
		}
		if (scannedDocument.revision === sourceDocument.revision) {
			return
		}
		if (protectedPath(sourceDocument.relativePath) || sourceCapture?.runtime?.revision !== sourceCapture?.sourceGeneration) {
			if (!session.hasConflict(sourceDocument.relativePath)) session.protect(identityScope, sourceDocument.relativePath, "conflict")
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
			effects.busy ||
			!isCurrentOrigin()
		) {
			return
		}
		if (
			protectedPath(sourceDocument.relativePath) ||
			sourceCapture?.runtime?.revision !== sourceCapture?.sourceGeneration ||
			session.source !== contentAtStart ||
			effects.busy
		) {
			setError(`External modification detected for ${sourceDocument.relativePath}.`)
			return
		}
		if (E.isLeft(opened)) {
			setError(`Cannot refresh ${sourceDocument.relativePath}: ${opened.left.message}`)
			return
		}
		if (!sourceCapture || guardOrgWorkingCopyBaseline(sourceCapture.baseline!, currentFileBaseline(sourceDocument.relativePath))) return
		installedTargetSource(opened.right, sourceCapture)
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
	}, [identityScope, workspaceRoot, workspace?.capabilityToken])


	useEffect(() => {
		if (!confirmationLifetime.current || confirmationLifetime.current.signal.aborted) confirmationLifetime.current = new AbortController()
		if (session.mount()) {
			setWorkspace(session.grant)
		}
		return () => {
			confirmationLifetime.current?.abort()
			session.dispose()
			effects.dispose()
			linkAbortRef.current?.abort()
			openRequestRef.current += 1
			restoreAttemptedRef.current = false
			clearTimeout(refreshRetryTimerRef.current)
		}
	}, [session, effects])

	const openWorkspace = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: capability cleanup and stale-request guards form one transaction.
		async (source: "default" | "default-existing" | "picker") => {
			const nonApprovalMutation = () =>
				effects.busy && !effects.approving
			if (!isCurrentOrigin() || nonApprovalMutation()) {
				return
			}
			const confirmationGeneration = session.editGeneration
			const transientGeneration = session.transientGeneration
			const approvedDirty = hasDirtyBuffers()
			const discardPermit = session.captureDiscardPermit()
			if (approvedDirty && await confirm({
				title: "Open another workspace?",
				description: "Discard unsaved changes and open another workspace?",
				confirmText: "Discard and open",
				cancelText: "Cancel",
				signal: confirmationLifetime.current?.signal,
			}) !== true) {
				return
			}
			if (
				!isCurrentOrigin() ||
				nonApprovalMutation() ||
				!discardPermit() ||
				confirmationGeneration !== session.editGeneration ||
				transientGeneration !== session.transientGeneration ||
				(hasDirtyBuffers() && !approvedDirty)
			)
				return
			const requestId = openRequestRef.current + 1
			const editGenerationAtStart = session.editGeneration
			openRequestRef.current = requestId
			const owner = effects.begin({ label: "openWorkspace", kind: "approval" })
			refileTargetRequestRef.current += 1
			let granted: OrgWorkspaceInterface | null = null
			try {
				
				setError(null)
				const result =
					source === "default"
						? await openDefaultOrgWorkspaceFlow()()
						: source === "default-existing"
							? await reopenDefaultOrgWorkspaceFlow()()
							: await selectOrgWorkspaceFlow()()
				if (E.isRight(result)) granted = result.right
				if (
					!effects.owns(owner) ||
					requestId !== openRequestRef.current ||
					!isCurrentOrigin()
				) {
					return
				}
				
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
						!discardPermit() ||
						session.editGeneration !== editGenerationAtStart ||
						transientGeneration !== session.transientGeneration ||
						(hasDirtyBuffers() && !approvedDirty)
					) {
						setError("Document changed while opening a workspace; the open was cancelled.")
						return
					}
					if (!session.activateGrant(result.right)) return
					setRevealTarget(null)
					setDefaultWorkspacePreference(source !== "picker")
					// Invalidate refreshes that may have started while the native picker was open.
					openRequestRef.current += 1

					setWorkspace(result.right)
				}
			} catch {
				if (effects.owns(owner) && isCurrentOrigin()) {
					setError(
						"Workspace approval ended unexpectedly; no new workspace was installed. Refresh and reconcile before a manual retry.",
					)
				}
			} finally {
				// A rejected approval has no known grant: never release an ambient root.
				// Only a returned, unused capability belongs to this request.
				try {
					await session.releaseUnusedGrant(granted)
				} catch {
					// Cleanup failure does not justify releasing any other capability.
				} finally {
					finishMutation(owner)
				}
			}
		},
		[confirm, aggregateDirty, workspace, dirtyPath, originSession, originActivation, originPath],
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
		if (!nativeCloseReady || restoreAttemptedRef.current || !isCurrentOrigin()) {
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
			if (!workspace || !isCurrentOrigin() || signal?.aborted || effects.getSnapshot().globalBusy) {
				return false
			}
			if (session.document?.relativePath === entry.relativePath) {
				if (expectedRevision && session.document.revision !== expectedRevision) {
					setError(`Org link target changed while opening: ${entry.relativePath}`)
					return false
				}
				return true
			}
			const targetBufferId = bufferIdentity.lookup(identityScope, entry.relativePath)
			const isSameTargetBuffer = () =>
				!targetBufferId ||
				bufferIdentity.lookup(identityScope, entry.relativePath) === targetBufferId
			if (fileBusy(entry.relativePath) || !isCurrentOrigin() || !isSameTargetBuffer()) return false
			const parked = parkedReservoir.read(identityScope, entry.relativePath)
			const sourceCapture = originPath ? session.captureFile(identityScope, originPath) : null
			const requestId = openRequestRef.current + 1
			openRequestRef.current = requestId
			const read = effects.beginRead("openDocument", [entry.relativePath])
			setError(null)
			const cancelRead = () => {
				if (openRequestRef.current !== requestId) {
					return
				}
				openRequestRef.current += 1
				read.finish()
			}
			signal?.addEventListener("abort", cancelRead, { once: true })
			try {
				if (signal?.aborted || !read.isCurrent() || !isCurrentOrigin()) {
					cancelRead()
					return false
				}
				const result = await openOrgDocumentFlow({
					relativePath: entry.relativePath,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})()
				if (!read.isCurrent() || requestId !== openRequestRef.current || !isCurrentOrigin()) {
					return false
				}
				read.finish()
				if (signal?.aborted || !isSameTargetBuffer()) {
					return false
				}
				if (
					sourceCapture && !session.fileCaptureIsCurrent(sourceCapture)
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
					session.protect(identityScope, entry.relativePath, "conflict")
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
					session.reconcileProtection(identityScope, entry.relativePath, "conflict")
				}
				if (expectedRevision && nextDocument.revision !== expectedRevision) {
					setError(`Org link target changed while opening: ${entry.relativePath}`)
					return false
				}
				// Invalidate refreshes that may have started while this document was opening.
				openRequestRef.current += 1
				const nextContent = protectedParked ? parked.content : nextDocument.content
				const activated = session.activateDocument(
					identityScope,
					nextDocument,
					nextContent,
					Boolean(parked && !protectedParked && parked.content !== nextDocument.content),
				)
				if (activated) setRevealTarget(null)
				return activated
			} finally {
				signal?.removeEventListener("abort", cancelRead)
				read.finish()
			}
		},
		[workspace, originSession, originActivation, originPath],
	)

	const runAgendaOperation = useCallback(
		(
			entry: OrgAgendaEntry,
			operation: OrgAgendaOperation,
			signal?: AbortSignal,
			options?: OrgAgendaExecutionOptions,
		) => {
			const scope = identityScope
			return runOrgAgendaOperationFlow(
				entry,
				operation,
				{
					scope,
					captureClock: () => formatOrgLocalTimestamp(new Date()),
					snapshot: (path) => ({
						current: session.matches(scope),
						nativeReady: session.closeReady,
						mirrorsMutable: parkedReservoir.canMutate(),
						loading: effects.getFileSnapshot(path).loading,
						mutating: effects.getFileSnapshot(path).busy,
						saving: Boolean(effects.getFileSnapshot(path).saveInFlight),
						saveAll: effects.getFileSnapshot(path).kind === "save-all",
						agendaBusy: Boolean(effects.agendaBusy),
						conflict: session.hasConflict(path),
						paused: session.isAutosavePaused(path),
					}),
					claim: () => effects.claimAgenda([entry.relativePath]),
					readWorkingCopy: (path) => {
						if (session.document?.relativePath === path)
							return { document: session.document, content: session.source }
						const parked = parkedReservoir.read(scope, path)
						return parked ? { document: parked.document, content: parked.content } : undefined
					},
					readDocument: (path) => {
						if (!scope) throw new Error("Missing agenda scope.")
						return openOrgDocumentFlow({
							relativePath: path,
							workspaceRoot: scope.grant.rootPath,
							capabilityToken: scope.grant.capabilityToken,
						})()
					},
					lookupId: (path) => (scope ? bufferIdentity.lookup(scope, path) : undefined),
					parkEditSource: (path, document, body) =>
						session.parkCommandSource(scope, path, document, body),
					createRuntime: (id, body) => session.createParkedRuntime(scope, id, body),
					getRuntime: (id) =>
						scope ? registry.get({ workspaceSessionId: scope.sessionId, bufferId: id }) : undefined,
					runtimeIdentity: runtimeIncarnation,
					commit: (id, body, edits, guard) =>
						scope
							? registry.applyCommandEdits(
									{ workspaceSessionId: scope.sessionId, bufferId: id },
									body,
									edits,
									guard,
								)
							: false,
				},
				signal,
				options,
			)
		},
		[originGrant, originSession],
	)

	const executeAgendaCommand = useCallback(
		(
			entry: OrgAgendaEntry,
			command: OrgAgendaCommand,
			signal?: AbortSignal,
			options?: OrgAgendaExecutionOptions,
		) =>
			runAgendaOperation(entry, command, signal, options).then(
				(result): OrgAgendaActionOutcome =>
					result.kind === "ready"
						? { kind: "rejected", message: "Unsupported agenda command." }
						: result,
			),
		[runAgendaOperation],
	)
	clock.configure({
		scope: identityScope,
		rootPath: identityScope?.grant.rootPath ?? null,
		isCurrent: () => session.matches(identityScope),
		buffers: () => session.snapshotLiveBuffers(identityScope).map(({ document, runtime }) => ({ relativePath: document.relativePath, runtime })),
		available: (path) => session.matches(identityScope) && session.closeReady && parkedReservoir.canMutate() &&
			!effects.getFileSnapshot(path).busy && !effects.getFileSnapshot(path).loading &&
			!session.hasConflict(path) && !session.isAutosavePaused(path),
		commit: (runtime, source, edits, guard) => registry.applyCommandEdits(runtime.key, source, edits, guard),
		agenda: (entry, command, signal, isCurrent) => executeAgendaCommand(entry, command, signal, { isCurrent }),
	})
	const prepareAgendaCommand = useCallback(
		(entry: OrgAgendaEntry, field: "schedule" | "deadline" | "todo-state", signal?: AbortSignal) =>
			runAgendaOperation(entry, { kind: "prepare", field }, signal).then(
				(result): OrgAgendaPreparation =>
					result.kind === "ready"
						? result
						: result.kind === "stale" || result.kind === "rejected"
							? { kind: result.kind, message: result.message }
							: { kind: "rejected", message: "Unsupported agenda preparation." },
			),
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
				effects.getSnapshot().globalBusy
			) {
				return false
			}
			// IDs are opaque and grant-local: only resolve live buffers in the latest map.
			const path = bufferIdentity.findPath(identityScope, bufferId)
			if (!path) return false
			if (session.document?.relativePath === path) return true
			if (!parkedReservoir.read(identityScope, path)) return false
			return activateOpenBuffer(bufferId)
		},
		[activateOpenBuffer, originSession, originActivation, originPath],
	)

	const openDocumentAt = useCallback(
		async (
			relativePath: string,
			line: number,
			expectedRevision?: string | null,
			isTargetCurrent?: (phase: "before" | "after") => boolean,
			signal?: AbortSignal,
			captured?: OrgNavigationSource,
		): Promise<boolean> => {
			const ownsSource = captured?.isCurrent ?? isCurrentOrigin
			if (!ownsSource() || signal?.aborted || isTargetCurrent && !isTargetCurrent("before")) return false
			if (captured) {
				if (!workspace || !isSafeRelativeOrgPath(relativePath) || !Number.isSafeInteger(line) || line < 1 || fileBusy(relativePath))
					return false
				let target = session.snapshotLiveBuffers(identityScope).find(buffer => buffer.document.relativePath === relativePath)
				if (!target) {
					if (protectedPath(relativePath)) return false
					const targetCapture = session.captureFile(identityScope, relativePath)
					const read = effects.beginRead("openCapturedOrgDocumentAt", [relativePath], "captured-org-navigation")
					try {
						const opened = await openOrgDocumentFlow({
							relativePath, workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken,
						})()
						if (!captured.isCurrent() || signal?.aborted || !read.isCurrent() ||
							!session.fileCaptureIsCurrent(targetCapture) || E.isLeft(opened) ||
							opened.right.relativePath !== relativePath || typeof opened.right.content !== "string" ||
							expectedRevision != null && opened.right.revision !== expectedRevision) return false
						if (session.snapshotLiveBuffers(identityScope).some(buffer => buffer.document.relativePath === relativePath)) return false
						const id = session.parkCommandSource(identityScope, relativePath, opened.right, opened.right.content)
						if (!id) return false
						session.createParkedRuntime(identityScope, id, opened.right.content)
						target = session.snapshotLiveBuffers(identityScope).find(buffer => buffer.bufferId === id)
					} catch {
						if (captured.isCurrent()) setError("The captured navigation target could not be read; originating Source was retained.")
						return false
					} finally { read.finish() }
				}
				if (!target || expectedRevision != null && target.document.revision !== expectedRevision) return false
				const targetCapture = session.captureFile(identityScope, relativePath)
				if (isTargetCurrent && !isTargetCurrent("after")) return false
				if (!captured.isCurrent() || signal?.aborted || !session.fileCaptureIsCurrent(targetCapture) || fileBusy(relativePath)) return false
				// The registered native coordinator owns the deliberate rebind and its ACK;
				// successful navigation intentionally retires the original presentation lease.
				return await captured.navigate(target.bufferId, line)
			}
			const revealActivation =
				originActivation + (session.document?.relativePath !== relativePath ? 1 : 0)
			if (session.document?.relativePath !== relativePath) {
				const opened = await openDocumentPath(relativePath, expectedRevision, signal)
				if (!opened) {
					return false
				}
			}
			if (
				signal?.aborted ||
				!session.isCurrentOrigin(origin, revealActivation, relativePath) ||
				(isTargetCurrent && !isTargetCurrent("after"))
			)
				return false
			revealRequestRef.current += 1
			setRevealTarget({ line, relativePath, requestId: revealRequestRef.current })
			return true
		},
		[activeDocument, openDocumentPath, workspace, identityScope, originSession, originActivation, originPath],
	)

	const openOrgLink = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: exact query provenance and final reveal guards form one navigation transaction.
		async (target: OrgLinkClickTarget, captured?: OrgNavigationSource): Promise<boolean> => {
			const ownsSource = captured?.isCurrent ?? isCurrentOrigin
			if (!workspace || !ownsSource() || effects.getSnapshot().globalBusy) return false
			linkAbortRef.current?.abort()
			const controller = new AbortController()
			linkAbortRef.current = controller
			const sourceCapture = captured?.capture ?? (originPath ? session.captureFile(identityScope, originPath) : null)
			const requestGeneration = openRequestRef.current
			const linkRequest = ++linkRequestRef.current
			const current = () => !controller.signal.aborted && ownsSource() &&
				!effects.getSnapshot().globalBusy && linkRequest === linkRequestRef.current &&
				(captured !== undefined || requestGeneration === openRequestRef.current)
			const sourceUnchanged = () => !sourceCapture || session.fileCaptureIsCurrent(sourceCapture)
			setError(null)
			try {
				// Scan remains filesystem metadata only; every open working body precedes disk resolution.
				const scanned = await scanOrgWorkspaceFlow(workspace.rootPath, workspace.capabilityToken)()
				if (!current()) return false
				if (!sourceUnchanged()) {
					setError("Document changed while resolving the Org link; try again.")
					return false
				}
				if (E.isLeft(scanned)) {
					setError(scanned.left.message)
					return false
				}
				const scannedWorkspace = { ...scanned.right, capabilityToken: workspace.capabilityToken }
				setWorkspace(scannedWorkspace)
				const { overlays } = orgQuerySourcesFromController({
					workspace: scannedWorkspace,
					workspaceSessionId: originSession,
					liveBuffers: session.snapshotLiveBuffers(identityScope),
				})
				const result = await resolveOrgLinkTargetFlow(
					scannedWorkspace,
					target,
					overlays,
					undefined,
					undefined,
					{ workspaceSessionId: originSession ?? undefined },
					controller.signal,
				)()
				if (!current()) return false
				if (!sourceUnchanged()) {
					setError("Document changed while resolving the Org link; try again.")
					return false
				}
				if (E.isLeft(result)) {
					setError(result.left.message)
					return false
				}
				const resolved = result.right
				if (resolved.workspaceRoot !== workspace.rootPath ||
					resolved.capabilityToken !== workspace.capabilityToken ||
					resolved.workspaceSessionId !== originSession) return false
				if (resolved.source === "live") {
					const overlay = overlays.find((buffer) => buffer.relativePath === resolved.relativePath)
					const targetIsCurrent = () => {
						const live = session.snapshotLiveBuffers(identityScope)
							.find((buffer) => buffer.document.relativePath === resolved.relativePath)
						return !!overlay && !!live && live.bufferId === resolved.sourceRevision &&
							live.document.revision === resolved.diskRevision && live.content === overlay.content &&
							live.runtimeIncarnation === resolved.runtimeIncarnation &&
							live.sourceGeneration === resolved.sourceGeneration
					}
					if (!targetIsCurrent()) {
						setError("Org link target changed while resolving; try again.")
						return false
					}
					if (captured) return await openDocumentAt(resolved.relativePath, resolved.line, resolved.diskRevision, targetIsCurrent, controller.signal, captured)
					const previousActivation = session.activation
					if (!session.activateOpenBuffer(identityScope, resolved.sourceRevision)) return false
					if (!targetIsCurrent() || session.document?.relativePath !== resolved.relativePath) return false
					if (session.activation !== previousActivation) openRequestRef.current += 1
					revealRequestRef.current += 1
					setRevealTarget({
						relativePath: resolved.relativePath,
						line: resolved.line,
						requestId: revealRequestRef.current,
					})
					return true
				}
				// Never apply a disk-established line to a working copy opened during resolution.
				if (session.snapshotLiveBuffers(identityScope)
					.some((buffer) => buffer.document.relativePath === resolved.relativePath)) {
					setError("Org link target changed while resolving; try again.")
					return false
				}
				return await openDocumentAt(resolved.relativePath, resolved.line, resolved.expectedRevision, (phase) => {
					if (captured && (!current() || !sourceUnchanged())) return false
					const live = session.snapshotLiveBuffers(identityScope)
						.find((buffer) => buffer.document.relativePath === resolved.relativePath)
					return !controller.signal.aborted && linkRequest === linkRequestRef.current &&
						!fileBusy(resolved.relativePath) && !protectedPath(resolved.relativePath) &&
						(phase === "before" ? !live : !!live &&
							live.document.revision === resolved.expectedRevision &&
							live.content === live.document.content)
				}, controller.signal, captured)
			} catch {
				if (current()) setError("Org link resolution ended unexpectedly; try again.")
				return false
			} finally {
				if (linkAbortRef.current === controller) linkAbortRef.current = null
			}
		},
		[activeDocument, openDocumentAt, workspace, originSession, originActivation, originPath],
	)

	const captureActiveTransferSource = (): OrgTransferSource | null => {
		const capture = session.document ? session.captureFile(identityScope, session.document.relativePath) : null
		return capture?.baseline ? { capture, isCurrent: () => isCurrentOrigin() && session.fileCaptureIsCurrent(capture) } : null
	}

	const readRefileTarget = useCallback(
		async (path: string, signal?: AbortSignal, captured = captureActiveTransferSource()): Promise<OrgRefileTargetOutcome> => {
			const rejected = (message: string): OrgRefileTargetOutcome => ({ kind: "rejected", message })
			const source = captured?.capture.baseline
			// Every lookup supersedes earlier requests, including rejected lookups.
			const request = ++refileTargetRequestRef.current
			if (
				signal?.aborted ||
				!captured?.isCurrent() ||
				!workspace ||
				!source ||
				fileBusy(source.relativePath, path) ||
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
			const sourceCapture = captured.capture
			const targetCapture = session.captureFile(identityScope, path)
			if (!targetCapture) return rejected("Refile target scope is no longer available.")
			const current = () =>
				!signal?.aborted && request === refileTargetRequestRef.current && captured.isCurrent() &&
				session.fileCaptureIsCurrent(sourceCapture) && session.fileCaptureIsCurrent(targetCapture) &&
				!fileBusy(source.relativePath, path) &&
				!protectedPath(source.relativePath) && !protectedPath(path)
			const cancellation = Promise.withResolvers<OrgRefileTargetOutcome>()
			const abortListener = () => cancellation.resolve(rejected("Refile target lookup was cancelled."))
			signal?.addEventListener("abort", abortListener, { once: true })
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
						if (E.isLeft(result)) return rejected(result.left.message)
						refileTargets.set(result.right, { source: sourceCapture, target: targetCapture })
						return { kind: "ready", snapshot: result.right }
					} catch {
						return rejected("Cannot read the refile target.")
					}
				})()
				return await Promise.race([lookup, cancellation.promise])
			} finally {
				signal?.removeEventListener("abort", abortListener)
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
			captured = captureActiveTransferSource(),
		): Promise<OrgSubtreeTransferOutcome> => {
			const sourceDocument = captured?.capture.baseline
			if (!captured?.isCurrent())
				return { kind: "rejected", message: "The source buffer is no longer active." }
			if (
				target !== undefined &&
				(!target ||
					typeof target !== "object" ||
					!target.snapshot ||
					typeof target.snapshot.revision !== "string" ||
					!target.snapshot.revision.trim() ||
					target.snapshot.relativePath !== targetRelativePath ||
					(target.targetHeading !== undefined &&
						(!target.targetHeading ||
							typeof target.targetHeading !== "object" ||
							target.snapshot.revision === "<missing>" ||
							!Number.isSafeInteger(target.targetHeading.from) ||
							target.targetHeading.from < 0 ||
							typeof target.targetHeading.heading !== "string" ||
							!/^\*+[ \t]+/.test(target.targetHeading.heading) ||
							/[\r\n]/.test(target.targetHeading.heading))))
			)
				return { kind: "rejected", message: "Invalid refile target selection." }
			const affectedTargetPath = targetRelativePath ?? (sourceDocument ? deriveOrgArchivePath(sourceDocument.relativePath) : null)
			const rejectionMessage = !workspace
				? "Open an Org workspace before refiling or archiving a subtree."
				: !sourceDocument
					? "Open a document before refiling or archiving a subtree."
					: fileBusy(sourceDocument.relativePath, ...(affectedTargetPath ? [affectedTargetPath] : []))
						? "An affected file is busy; subtree transfer was not started."
						: protectedPath(sourceDocument.relativePath) || (affectedTargetPath && protectedPath(affectedTargetPath))
							? "Save or reconcile the affected buffers before transferring a subtree."
							: null
			if (rejectionMessage) {
				setError(rejectionMessage)
				return { kind: "rejected", message: rejectionMessage }
			}
			if (!workspace || !sourceDocument) {
				return { kind: "rejected", message: "No active Org document is available." }
			}
			const sourcePath = sourceDocument.relativePath
			const sourceCapture = captured.capture
			const reviewedTarget = target ? refileTargets.get(target.snapshot) : null
			if (target && (!reviewedTarget || !session.fileCaptureIsCurrent(reviewedTarget.source) ||
				!session.fileCaptureIsCurrent(reviewedTarget.target)))
				return { kind: "rejected", message: "The reviewed Refile file owners changed. Look up and confirm a fresh target." }
			const targetCapture = reviewedTarget?.target ??
				(affectedTargetPath ? session.captureFile(identityScope, affectedTargetPath) : null)
			if (!sourceCapture || !targetCapture || !affectedTargetPath)
				return { kind: "rejected", message: "The affected file owners are no longer available." }
			const sourceContent = sourceCapture.source ?? sourceDocument.content
			if (target?.logging && target.logging.expectedSourceContent !== sourceContent)
				return { kind: "rejected", message: "The reviewed logging source changed. Reopen Refile." }
			const latchAffectedPaths = () => {
				for (const path of [sourcePath, affectedTargetPath]) {
					if (!path) continue
					session.protect(identityScope, path, "conflict")
				}
				refileTargetRequestRef.current += 1
				
			}
			const expectedSourceRevision = sourceDocument.revision
			const owner = effects.begin({ label: "transferSubtree", paths: [sourcePath, affectedTargetPath] })
			refileTargetRequestRef.current += 1
			
			setError(null)
			const commonInput = {
				confirmSourceUnchanged: () =>
					effects.owns(owner) && captured.isCurrent() && session.fileCaptureIsCurrent(sourceCapture) &&
					session.fileCaptureIsCurrent(targetCapture) &&
					!protectedPath(sourcePath) && !protectedPath(affectedTargetPath),
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
					? refileOrgSubtreeFlow({ ...commonInput, targetRelativePath,
						...(target ? { expectedTargetRevision: target.snapshot.revision,
							expectedTargetContent: target.snapshot.source,
							targetHeading: target.targetHeading, logging: target.logging } : {}),
					})()
					: archiveOrgSubtreeFlow(commonInput)())
				if (!effects.owns(owner) || !session.matches(identityScope)) {
					return { kind: "rejected", message: "The original workspace owner is no longer current." }
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
				const newerTarget = installedTargetSource(result.right.target, targetCapture)
				const newerSource = installedTargetSource(result.right.source, sourceCapture)
				if (!newerSource) {
					if (newerTarget) {
						const message =
							"The subtree moved, but newer target input was retained. Reread and reconcile the target before saving."
						setError(message)
						return { kind: "success", message }
					}
					return { kind: "success" }
				}
				const message =
					"The subtree moved, but newer editor input was retained. Review and save the source to reconcile it."
				setError(message)
				return { kind: "success", message }
			} catch {
				if (!effects.owns(owner) || !session.matches(identityScope))
					return {
						kind: "partial",
						message: "The original workspace owner was retired; reread the affected files.",
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

	const captureBufferTransfer = useCallback((bufferId: string, windowId: string, isCurrent: () => boolean): OrgCapturedBufferTransfer | null => {
		const path = bufferIdentity.findPath(identityScope, bufferId)
		const capture = path ? session.captureFile(identityScope, path) : null
		const permit = session.captureWindowPermit(identityScope, windowId, bufferId)
		if (!capture?.baseline || !capture.runtime || !permit || !permit() || !isCurrent() ||
			capture.bufferId !== bufferId || !session.fileCaptureIsCurrent(capture)) return null
		const captured: OrgTransferSource = Object.freeze({
			capture,
			isCurrent: () => permit() && isCurrent() && session.closeReady && session.fileCaptureIsCurrent(capture),
		})
		return Object.freeze({
			readRefileTarget: (path: string, signal?: AbortSignal) => readRefileTarget(path, signal, captured),
			refileSubtree: (cursor: number, path: string, selection?: OrgRefileTargetSelection) => transferSubtree(cursor, path, selection, captured),
			archiveSubtree: (cursor: number) => transferSubtree(cursor, undefined, undefined, captured),
		})
	}, [identityScope, readRefileTarget, transferSubtree])

	const archiveSubtree = useCallback(
		async (cursor: number) => transferSubtree(cursor),
		[transferSubtree, originSession, originActivation, originPath],
	)
	const captureFileReview = useCallback((bufferId: string, windowId: string, relativePath?: string) => {
		const scope = identityScope
		const originPath = bufferIdentity.findPath(scope, bufferId)
		const path = relativePath ?? originPath
		const capture = path ? session.captureFile(scope, path) : null
		const originCapture = originPath && path !== originPath ? session.captureFile(scope, originPath) : null
		const windowPermit = session.captureReviewWindowPermit(scope, windowId, bufferId)
		const permit = () => windowPermit() && (!originCapture ||
			(session.fileCaptureIsCurrent(originCapture) && !fileBusy(originCapture.relativePath)))
		if (!scope || !path || !capture || !permit() || fileBusy(path) ||
			(path !== originPath && !session.protectedPaths.includes(path))) return null
		return async (signal?: AbortSignal): Promise<OrgFileReviewOutcome> => {
			if (signal?.aborted || !permit() || !session.fileCaptureIsCurrent(capture) || fileBusy(path))
				return { kind: "rejected", message: "The originating file or window changed before review." }
			const lease = effects.beginRead("file-review", [path], `file-review:${path}`)
			try {
				const result = await openOrgDocumentFlow({
					relativePath: path, workspaceRoot: scope.grant.rootPath, capabilityToken: scope.grant.capabilityToken,
				})()
				if (signal?.aborted || !lease.isCurrent() || !permit() || !session.fileCaptureIsCurrent(capture))
					return { kind: "rejected", message: "The retained Source changed while disk Source was read." }
				const disk: OrgFileDiskState = E.isLeft(result)
					? { kind: isAuthorizedOrgPathAbsent(result.left, path) ? "missing" : "unavailable", relativePath: path, message: result.left.message }
					: capture.runtime && capture.baseline ? result.right
					: { kind: "unavailable", relativePath: path, message: "This path is occupied by an Org document. Open that document, then review its retained and disk Source before reconciling." }
				const review = session.issueFileReview(capture, disk, permit)
				return review ? { kind: "ready", review }
					: { kind: "rejected", message: "The reviewed file is no longer current." }
			} catch {
				return { kind: "rejected", message: "Disk Source could not be read. The retained buffer was not changed." }
			} finally {
				lease.finish()
			}
		}
	}, [session, identityScope, effects])
	const acceptFileReview = useCallback(async (
		review: OrgFileReview, choice: OrgFileReviewChoice, discardConsent = false, signal?: AbortSignal,
	): Promise<OrgFileReviewOutcome> => {
		const scope = identityScope
		if (!scope || signal?.aborted || !session.reviewIsCurrent(review) || fileBusy(review.relativePath))
			return { kind: "rejected", message: "The reviewed file or window changed; open a new review." }
		const owner = effects.begin({ label: "reconcile-file", kind: choice === "recreate-missing" ? "save" : "mutation",
			presentation: choice === "recreate-missing" ? "saving" : "loading", paths: [review.relativePath] })
		try {
			const fresh = await openOrgDocumentFlow({
				relativePath: review.relativePath, workspaceRoot: scope.grant.rootPath, capabilityToken: scope.grant.capabilityToken,
			})()
			if (signal?.aborted || !effects.owns(owner) || !session.matches(scope) || !session.reviewIsCurrent(review))
				return { kind: "rejected", message: "The reviewed Source or window changed during the disk check." }
			const freshDisk: OrgFileDiskState = E.isLeft(fresh)
				? { kind: isAuthorizedOrgPathAbsent(fresh.left, review.relativePath) ? "missing" : "unavailable", relativePath: review.relativePath, message: fresh.left.message }
				: fresh.right
			if (choice === "recreate-missing") {
				if (!discardConsent) return { kind: "rejected", message: "Recreation requires an explicit confirmed create-CAS intent." }
				const creation = session.captureFileReviewCreation(review, freshDisk)
				if (!creation || !creation.capture.baseline || creation.capture.source === undefined)
					return { kind: "rejected", message: "The missing path or retained Source changed; open a new review." }
				const current = () => effects.owns(owner) && creation.isCurrent()
				let accepted: OrgFileReviewOutcome | null = null
				const result = await saveOrgWorkingCopyFlow({
					content: creation.capture.source, expectedRevision: "<missing>", relativePath: review.relativePath,
					workspaceRoot: scope.grant.rootPath, capabilityToken: scope.grant.capabilityToken,
				}, {
					write: saveOrgDocumentFlow,
					isFresh: () => !signal?.aborted && current() && session.fileCaptureIsCurrent(creation.capture),
					isCurrent: current,
					onWriteStarted: (settled) => { effects.captureSave(owner, settled, creation.capture.source!, review.relativePath) },
					commitConfirmed: (_, receipt) => {
						if (!effects.owns(owner)) throw new Error("The create owner retired")
						accepted = creation.acceptReceipt(receipt)
						if (accepted.kind !== "accepted") throw new Error(accepted.kind === "rejected"
							? accepted.message : "Creation receipt did not acknowledge retained Source")
						const baseline = currentFileBaseline(review.relativePath, scope)
						if (baseline && session.matches(scope))
							setWorkspace((value) => value ? updateWorkspaceDocument(value, baseline, receipt.originalRecovery) : value)
					},
				})
				if (result.kind === "confirmed" && accepted) return accepted
				if (effects.owns(owner) && session.matches(scope)) session.protect(scope, review.relativePath, "conflict")
				return { kind: "rejected", message: result.kind === "write-left" ? result.error.message
					: "Creation was not confirmed. All retained Source/history remain protected; review disk again before any manual retry." }
			}
			const outcome = session.acceptFileReview(review, choice, freshDisk, discardConsent)
			if (outcome.kind === "accepted" && effects.owns(owner) && session.matches(scope)) {
				if (!("kind" in freshDisk)) setWorkspace((value) => value ? updateWorkspaceDocument(value, freshDisk) : value)
				else if (freshDisk.kind === "missing") setWorkspace((value) => value
					? { ...value, documents: value.documents.filter((entry) => entry.relativePath !== review.relativePath) } : value)
				setError(null)
			}
			return outcome
		} catch {
			if (effects.owns(owner) && session.matches(scope) && choice === "recreate-missing") session.protect(scope, review.relativePath, "conflict")
			return { kind: "rejected", message: choice === "recreate-missing"
				? "Creation could not be confirmed. Source/history were retained; no automatic retry or rollback was attempted."
				: "Reconciliation could not be confirmed. No file write was attempted." }
		} finally {
			finishMutation(owner)
		}
	}, [session, identityScope, effects])

	const updateContent = useCallback(
		(nextContent: string) => session.updateContent(origin, nextContent),
		[session, originSession, originActivation, originPath],
	)

	const saveDocumentPathWithResult = useCallback(async (sourcePath: string, scope = identityScope): Promise<boolean> => {
		if (!scope || !session.matches(scope) || fileBusy(sourcePath) || !session.captureFile(scope, sourcePath)) {
			return false
		}
		const active = session.document?.relativePath === sourcePath
		const parked = active ? undefined : parkedReservoir.read(scope, sourcePath)
		const document = active ? session.document : parked?.document
		const logicalBufferId = bufferIdentity.lookup(scope, sourcePath)
		const sourceRuntime = logicalBufferId ? runtimeFor(logicalBufferId, scope) : undefined
		if (!document || !logicalBufferId || !sourceRuntime || sourceRuntime.closed) return false
		const sourceDocument = { ...document }
		const sourceRevision = sourceDocument.revision
		const contentBeingSaved = sourceRuntime.source
		const owner = effects.begin({ label: "save", kind: "save", paths: [sourcePath] })
		
		setError(null)
		const capture = Object.freeze({
			content: contentBeingSaved,
			expectedRevision: sourceRevision,
			relativePath: sourcePath,
			capabilityToken: scope.grant.capabilityToken,
			workspaceRoot: scope.grant.rootPath,
		})
		const current = () =>
			effects.owns(owner) &&
			session.matches(scope) &&
			bufferIdentity.lookup(scope, sourcePath) === logicalBufferId &&
			runtimeFor(logicalBufferId, scope) === sourceRuntime && !sourceRuntime.closed
		try {
			const result = await saveOrgWorkingCopyFlow(capture, {
				write: saveOrgDocumentFlow,
				isFresh: () => current() && !guardOrgWorkingCopyBaseline(
					sourceDocument,
					currentFileBaseline(sourcePath, scope),
				),
				isCurrent: current,
				onWriteStarted: (settled) => {
					effects.captureSave(owner, settled, contentBeingSaved, sourcePath)
				},
				commitConfirmed: (_, receipt) => {
					if (!current()) throw new Error("The save owner is no longer current")
					const result = session.acknowledgeWorkingCopy(scope, {
						bufferId: logicalBufferId,
						expectedDocument: sourceDocument,
						capturedSource: contentBeingSaved,
						receipt,
					})
					if (result.kind === "rejected") throw new Error(result.reason)
					if (!current()) return
					setWorkspace((value) => value ? updateWorkspaceDocument(value, result.document, receipt.originalRecovery) : value)
				},
			})
			// The flow's terminal await introduces another ownership gap.
			if (!current()) return false
			if (result.kind === "confirmed") return true
			if (result.kind === "stale-before" || result.kind === "stale-after") return false
			session.protect(scope, sourcePath, "conflict")
			setError(
				result.kind === "write-left"
					? result.error.message
					: "Save ended unexpectedly; files may have changed. The editor body was retained. Refresh and reconcile before a manual retry; no rollback was attempted.",
			)
			return false
		} catch {
			if (current()) {
				session.protect(scope, sourcePath, "conflict")
				setError(
					"Save ended unexpectedly; files may have changed. The editor body was retained. Refresh and reconcile before a manual retry; no rollback was attempted.",
				)
			}
			return false
		} finally {
			finishMutation(owner)
		}
	}, [session, identityScope, effects])

	// One owner covers the entire snapshot; never nest the active save's lock.
	const saveAllDocuments = useCallback(async (): Promise<OrgSaveAllOutcome> => {
		// Closed runtimes retain their last source. Keep reporting the originating
		// buffers after retirement without reading a replacement grant's mirrors.
		const retainedBuffers = new Map<string, { runtime: OrgBufferRuntime; baseline: string }>(
			session.snapshotLiveBuffers(identityScope).map((buffer) => [
				buffer.document.relativePath,
				{ runtime: buffer.runtime, baseline: buffer.document.content },
			]),
		)
		const remainingPaths = () => {
			if (!session.matches(identityScope)) {
				return [...retainedBuffers].flatMap(([path, buffer]) =>
					buffer.runtime.source !== buffer.baseline ? [path] : [],
				)
			}
			return [
				...parkedReservoir
					.list(identityScope)
					.map((buffer) => [buffer.document.relativePath, buffer] as const)
					.filter(([, buffer]) => buffer.isDirty)
					.map(([path]) => path),
				...(session.document && dirtyPath(session.document.relativePath)
					? [session.document.relativePath]
					: []),
			]
		}
		const savedPaths: string[] = []
		const outcome = (kind: OrgSaveAllOutcome["kind"], message?: string): OrgSaveAllOutcome => ({
			kind,
			savedPaths: [...savedPaths],
			remainingDirtyPaths: remainingPaths(),
			...(message ? { message } : {}),
		})
		if (!workspace || !session.matches(identityScope) || effects.getSnapshot().globalBusy) {
			return outcome(
				"rejected",
				"The workspace or active buffer is no longer current; save all was not started.",
			)
		}
		const selected: (OrgSaveAllCapture & {
			readonly logicalBufferId: string | undefined
			readonly expectedDocument: OrgDocumentInterface
		})[] = parkedReservoir
			.list(identityScope)
			.filter((buffer) => dirtyPath(buffer.document.relativePath))
			.map((buffer) => {
				const document = Object.freeze({ ...buffer.document })
				return {
					document,
					content: buffer.content,
					expectedDocument: document,
					logicalBufferId: bufferIdentity.lookup(identityScope, document.relativePath),
					workspaceRoot: workspace.rootPath,
					capabilityToken: workspace.capabilityToken,
				}
			})
		const active = session.document
		const activeBaseline = active ? Object.freeze({ ...active }) : null
		const activeCapture =
			active && activeBaseline && dirtyPath(active.relativePath)
				? {
						document: activeBaseline,
						content: session.source,
						expectedDocument: activeBaseline,
						logicalBufferId: bufferIdentity.lookup(identityScope, active.relativePath),
						workspaceRoot: workspace.rootPath,
						capabilityToken: workspace.capabilityToken,
					}
				: null
		if (activeCapture) selected.push(activeCapture)
		if (!selected.length) return outcome("success")
		if (selected.some((capture) => fileBusy(capture.document.relativePath))) {
			return outcome("rejected", "A selected file is already being changed; save all was not started.")
		}
		const owner = effects.begin({ label: "saveAllDocuments", kind: "save-all", paths: selected.map((capture) => capture.document.relativePath) })
		
		
		setError(null)
		// Each selected file retains its captured body while focus and newer input remain independent.
		effects.captureBatch(owner)
		// Batch ownership is independent of a member's live baseline path. Member
		// authority is checked separately before its write, retaining earlier ACKs.
		const current = () =>
			effects.owns(owner) && session.matches(identityScope)
		const fail = (message: string): OrgSaveAllOutcome => {
			if (current()) {
				// Pause even unwritten members, but do not invent external conflicts for them.
				for (const capture of selected) {
					if (!savedPaths.includes(capture.document.relativePath)) {
						session.protect(identityScope, capture.document.relativePath, "pause")
						// Path drift must not let the retained body autosave under
						// its corrupted live path while awaiting reconciliation.
						const retained = retainedBuffers.get(capture.document.relativePath)?.runtime
						const liveDocument = session.snapshotLiveBuffers(identityScope).find((buffer) => buffer.runtime === retained)?.document
						if (liveDocument) session.protect(identityScope, liveDocument.relativePath, "pause")
					}
				}
				setError(message)
			}
			return outcome(savedPaths.length ? "partial" : "rejected", message)
		}
		try {
			const result = await saveAllOrgDocumentsFlow(selected, {
				write: saveOrgDocumentFlow,
				isFresh: ({ document, logicalBufferId, expectedDocument }) => {
					const retained = retainedBuffers.get(document.relativePath)?.runtime
					return current() && !!logicalBufferId && !!retained && !retained.closed &&
						bufferIdentity.lookup(identityScope, document.relativePath) === logicalBufferId &&
						runtimeFor(logicalBufferId) === retained &&
						!guardOrgWorkingCopyBaseline(expectedDocument, currentFileBaseline(document.relativePath))
				},
				isOwnerCurrent: current,
				commitConfirmed: (
					{ document, content: body, logicalBufferId, expectedDocument },
					receipt,
				) => {
					const path = document.relativePath
					if (!current() || !logicalBufferId)
						throw new Error("The captured buffer lease is no longer current")
					const result = session.acknowledgeWorkingCopy(identityScope, {
						bufferId: logicalBufferId,
						expectedDocument,
						capturedSource: body,
						receipt,
					})
					if (result.kind === "rejected") throw new Error(result.reason)
					const retained = retainedBuffers.get(path)
					if (retained) retained.baseline = result.document.content
					// A delivered ACK survives observer retirement; UI effects do not.
					if (!current()) return
					setWorkspace((value) => value ? updateWorkspaceDocument(value, result.document, receipt.originalRecovery) : value)
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
					session.protect(identityScope, result.writingPath, "conflict")
				}
				return fail(result.message)
			}
			return remainingPaths().length
				? outcome("partial", "Captured edits were saved, but newer editor input remains unsaved.")
				: outcome("success")
		} finally {
			finishMutation(owner)
		}
	}, [workspace, dirtyPath, originSession, originActivation, originPath])

	const captureBufferSave = useCallback((bufferId: string): (() => Promise<boolean>) | null => {
		const scope = identityScope
		const path = bufferIdentity.findPath(scope, bufferId)
		const runtime = runtimeFor(bufferId, scope)
		if (!scope || !path || !runtime || runtime.closed || !session.matches(scope) || !session.captureFile(scope, path)) return null
		return async () => {
			if (!session.matches(scope) || runtime.closed || bufferIdentity.findPath(scope, bufferId) !== path ||
				runtimeFor(bufferId, scope) !== runtime) return false
			return saveDocumentPathWithResult(path, scope)
		}
	}, [session, identityScope, bufferIdentity, saveDocumentPathWithResult])

	const saveDocument = useCallback(async (): Promise<boolean> => {
		if (!originPath || !activeBufferRuntime || activeBufferRuntime.closed ||
			bufferIdentity.lookup(identityScope, originPath) !== activeBufferRuntime.key.bufferId ||
			runtimeFor(activeBufferRuntime.key.bufferId) !== activeBufferRuntime) return false
		const save = captureBufferSave(activeBufferRuntime.key.bufferId)
		return save ? save() : false
	}, [captureBufferSave, activeBufferRuntime, identityScope, originSession, originPath])

	const closeActiveDocument = useCallback(async (): Promise<boolean> => {
		if (!isCurrentOrigin()) return false
		const contentAtClose = session.source
		if (session.document && fileBusy(session.document.relativePath)) {
			return false
		}
		if (session.document && protectedPath(session.document.relativePath)) {
			const saved = await saveDocumentPathWithResult(session.document.relativePath)
			if (
				!isCurrentOrigin() ||
				(session.document !== null && fileBusy(session.document.relativePath)) ||
				!saved ||
				session.source !== contentAtClose
			) {
				return false
			}
		}
		if (!session.closeActiveDocument(identityScope)) return false
		openRequestRef.current += 1
		effects.cancelRead()
		setRevealTarget(null)
		return true
	}, [isDirty, saveDocumentPathWithResult, originSession, originActivation, originPath])

	const closeDocumentPath = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inactive CAS save and guarded removal must be atomic.
		async (relativePath: string): Promise<boolean> => {
			if (!isCurrentOrigin()) return false
			if (session.document?.relativePath === relativePath) {
				return closeActiveDocument()
			}
			const buffer = parkedReservoir.read(identityScope, relativePath)
			if (!buffer) {
				return true
			}
			if (!workspace || !session.matches(identityScope) || fileBusy(relativePath)) {
				return false
			}
			if (protectedPath(relativePath)) {
				const owner = effects.begin({ label: "closeDocumentPath", kind: "save-close", paths: [relativePath] })
				
				let closingBuffer = buffer
				const capturedDocument = { ...buffer.document }
				const logicalBufferId = bufferIdentity.lookup(identityScope, relativePath)
				const currentOwner = () =>
					effects.owns(owner) &&
					session.matches(identityScope) &&
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
						onWriteStarted: (settled) => {
							effects.captureSave(owner, settled, capture.content, relativePath)
						},
						commitConfirmed: (_, receipt) => {
							if (!currentOwner() || !logicalBufferId)
								throw new Error("The captured buffer lease is no longer current")
							const result = session.acknowledgeWorkingCopy(identityScope, {
								bufferId: logicalBufferId,
								expectedDocument: capturedDocument,
								capturedSource: capture.content,
								receipt,
							})
							if (result.kind === "rejected") throw new Error(result.reason)
							// A replacement receives the baseline ACK, never permission to retire.
							if (result.previousCopy === closingBuffer && result.currentCopy)
								closingBuffer = result.currentCopy
							if (!currentOwner()) return
							setWorkspace((value) => value ? updateWorkspaceDocument(value, result.document, receipt.originalRecovery) : value)
						},
					})
					// Failed effects belong to the lease even when the working body changed.
					if (!currentOwner()) return false
					if (result.kind !== "confirmed") {
						if (result.kind === "stale-before" || result.kind === "stale-after") return false
						session.protect(identityScope, relativePath, "conflict")
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
					session.protect(identityScope, relativePath, "conflict")
					setError(
						`Cannot save ${relativePath}; the buffer was retained. Files may have changed. Refresh and reconcile before a manual retry; no rollback was attempted.`,
					)
					return false
				} finally {
					finishMutation(owner)
					
				}
			}
			if (!retireBuffer(relativePath)) return false
			
			return true
		},
		[closeActiveDocument, workspace, originSession, originActivation, originPath],
	)

	const [autosaveSchedule] = useState(() => ({
		epoch: 0,
		delay: 0,
		pending: new Map<OrgBufferRuntime, { generation: number; dueAt: number; epoch: number }>(),
	}))

	useEffect(() => {
		if (autoSave !== true || !Number.isFinite(autoSaveDelay) || autoSaveDelay < 1000 || autoSaveDelay > 60000) {
			autosaveSchedule.pending.clear()
			return
		}
		if (autosaveSchedule.delay !== autoSaveDelay) {
			autosaveSchedule.delay = autoSaveDelay
			autosaveSchedule.pending.clear()
		}
		const now = performance.now()
		const epoch = ++autosaveSchedule.epoch
		let next: OrgLiveBuffer | undefined
		let nextDueAt = Number.POSITIVE_INFINITY
		for (const buffer of liveBuffers) {
			const path = buffer.document.relativePath
			if (!buffer.isDirty || session.isAutosavePaused(path) || session.hasConflict(path)) continue
			let scheduled = autosaveSchedule.pending.get(buffer.runtime)
			if (!scheduled) {
				scheduled = { generation: buffer.sourceGeneration, dueAt: now + autoSaveDelay, epoch }
				autosaveSchedule.pending.set(buffer.runtime, scheduled)
			} else {
				if (scheduled.generation !== buffer.sourceGeneration) {
					scheduled.generation = buffer.sourceGeneration
					scheduled.dueAt = now + autoSaveDelay
				}
				scheduled.epoch = epoch
			}
			if (fileBusy(path) || effects.getFileSnapshot(path).loading) continue
			if (scheduled.dueAt < nextDueAt) {
				next = buffer
				nextDueAt = scheduled.dueAt
			}
		}
		for (const [runtime, scheduled] of autosaveSchedule.pending) {
			if (scheduled.epoch !== epoch) autosaveSchedule.pending.delete(runtime)
		}
		// Busy files retain their quiet deadlines; unrelated files can save concurrently.
		if (!next || !workspace || !nativeCloseReady) return
		const candidate = next
		const path = candidate.document.relativePath
		const timer = window.setTimeout(() => {
			// Fence before admission, including a same-path runtime replacement and
			// failures that settled before React could publish their paused badge.
			if (
				useSettings.getState().autoSave === true &&
				useSettings.getState().autoSaveInterval === autoSaveInterval &&
				session.matches(identityScope) && !fileBusy(path) &&
				runtimeFor(candidate.bufferId) === candidate.runtime && !candidate.runtime.closed &&
				candidate.runtime.revision === candidate.sourceGeneration && dirtyPath(path) &&
				!session.isAutosavePaused(path) && !session.hasConflict(path)
			) void saveDocumentPathWithResult(path)
		}, Math.max(0, nextDueAt - performance.now()))
		return () => window.clearTimeout(timer)
	}, [liveBuffers, workspace, effectSnapshot, nativeCloseReady, saveDocumentPathWithResult, autoSave, autoSaveDelay, autoSaveInterval])

	const readCaptureTarget = useCallback(
		async (target: OrgCaptureTarget, signal?: AbortSignal): Promise<OrgCaptureTargetOutcome> => {
			const request = ++captureTargetRequestRef.current
			const checked = validateOrgCaptureTarget(target)
			const rejected = (message: string): OrgCaptureTargetOutcome => ({ kind: "rejected", message })
			if (E.isLeft(checked)) return rejected(checked.left.message)
			const relativePath = checked.right.relativePath
			const capture = session.captureFile(identityScope, relativePath)
			const current = () =>
				!signal?.aborted && request === captureTargetRequestRef.current &&
				session.matches(identityScope) && !fileBusy(relativePath) && !protectedPath(relativePath) &&
				session.fileCaptureIsCurrent(capture)
			if (!workspace || !current())
				return rejected("Wait for workspace operations and save or reconcile the Capture target before previewing.")
			try {
				const result = await readOrgCaptureTargetFlow({
					workspaceRoot: workspace.rootPath,
					capabilityToken: workspace.capabilityToken,
					target: checked.right,
				}, { isCurrent: current, signal })()
				if (!current()) return rejected("Capture target preview was cancelled or its scope changed.")
				return E.isLeft(result) ? rejected(result.left.message) : { kind: "ready", ...result.right }
			} catch {
				return rejected("Capture target preview failed; no content write was requested.")
			}
		},
		[workspace, dirtyPath, originSession, originActivation, originPath],
	)

	const captureEntry = useCallback(
		async (request: OrgCaptureRequest): Promise<OrgCaptureOutcome> => {
			if (!workspace || !isCurrentOrigin())
				return { kind: "rejected", message: "The workspace or source buffer is no longer current." }
			const input = validateOrgCaptureInput({
				...request, workspaceRoot: workspace.rootPath, capabilityToken: workspace.capabilityToken,
			})
			if (E.isLeft(input)) {
				setError(input.left.message)
				return { kind: "rejected", message: input.left.message }
			}
			const relativePath = input.right.target.relativePath
			if (fileBusy(relativePath) || protectedPath(relativePath)) {
				const message = fileBusy(relativePath)
					? "Another workspace operation is running; wait before capturing."
					: `Save or reconcile changes before capturing to ${relativePath}.`
				setError(message)
				return { kind: "rejected", message }
			}
			const capture = session.captureFile(identityScope, relativePath)
			const owner = effects.begin({ label: "captureEntry", paths: [relativePath] })
			
			
			setError(null)
			const current = () => effects.owns(owner) && session.matches(identityScope)
			const uncertain = (message: string): OrgCaptureOutcome => {
				if (current()) {
					session.protect(identityScope, relativePath, "conflict")
					setError(message)
					
				}
				return { kind: "uncertain", message }
			}
			try {
				const result = await captureOrgEntryFlow(input.right, { isCurrent: current })()
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
				const newer = installedTargetSource(confirmed, capture)
				if (newer) {
					const message =
						"Captured successfully, but newer editor input was retained. Reread and reconcile the target before saving."
					session.protect(identityScope, relativePath, "conflict")
					setError(message)
					return { kind: "success", message }
				}
				
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
			if (!workspace || !isCurrentOrigin() || !session.matches(identityScope)) {
				return
			}
			const relativePath = targetRelativePath.trim() || "inbox.org"
			if (fileBusy(relativePath)) return
			if (protectedPath(relativePath)) {
				setError(`Save or discard changes before capturing to ${relativePath}.`)
				return
			}
			const capture = session.captureFile(identityScope, relativePath)
			const owner = effects.begin({ label: "captureTodo", paths: [relativePath] })
			
			setError(null)
			try {
				const result = await captureOrgTodoFlow({
					target: { kind: "file", relativePath },
					title,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				}, { isCurrent: () => effects.owns(owner) && session.matches(identityScope) })()
				if (!effects.owns(owner) || !session.matches(identityScope)) {
					return
				}
				if (E.isLeft(result)) {
					if (result.left.type === "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR") {
						session.protect(identityScope, relativePath, "conflict")
						
					}
					setError(result.left.message)
					return
				}
				setWorkspace((current) =>
					current ? updateWorkspaceDocument(current, result.right) : current,
				)
				if (installedTargetSource(result.right, capture)) {
					setError(
						`Captured to ${relativePath}, but newer input was retained. Reread and reconcile the target before saving.`,
					)
				}
			} catch {
				if (effects.owns(owner) && session.matches(identityScope)) {
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

	const publishFreshDocument = useCallback(
		async (
			input: OrgFreshDocumentPlan,
			label: "Diary" | "Note",
			open: boolean,
			captured?: OrgNavigationSource,
		): Promise<OrgFreshDocumentOutcome> => {
			const plan = input
			const ownsSource = captured?.isCurrent ?? isCurrentOrigin
			if (!ownsSource()) {
				return { kind: "stale", message: `${label} creation requires the current workspace owner.` }
			}
			if (!workspace) {
				return { kind: "no-workspace", message: `Open an Org workspace before creating a ${label.toLowerCase()} entry.` }
			}
			const creationState = plan.directory ? effects.getFileSnapshot(plan.directory) : effects.getSnapshot()
			if (creationState.busy || creationState.loading) {
				const message = `${label} creation was not started while another workspace operation is busy.`
				setError(message)
				return { kind: "busy", message }
			}
			if (!workspace.capabilityToken) {
				const message = `${label} creation requires an explicitly approved workspace grant.`
				setError(message)
				return { kind: "rejected", message }
			}
			// Collision allocation owns the target directory; an empty directory is
			// an exclusive root namespace reservation, never the fake resource "".
			const originCapture = captured?.capture ?? (originPath ? session.captureFile(identityScope, originPath) : null)
			const owner = effects.begin({ label: `create${label}`, paths: plan.directory ? [plan.directory] : undefined })
			setError(null)
			try {
				const result = await createOrgFreshDocumentFlow({
					workspaceRoot: workspace.rootPath,
					capabilityToken: workspace.capabilityToken,
					plan,
					documentLabel: label,
					occupiedPaths: [
						...workspace.documents.map((document) => document.relativePath),
						...session.snapshotLiveBuffers(identityScope).map((buffer) => buffer.document.relativePath),
					],
					confirmCurrent: () => effects.owns(owner) && session.matches(identityScope) && (captured === undefined || captured.isCurrent()),
				})()
				if (!effects.owns(owner) || !session.matches(identityScope)) {
					return {
						kind: "stale",
						message: E.isRight(result)
							? `${label} ${result.right.relativePath} was created, but its original workspace owner is no longer current; it was not opened.`
							: result.left.message,
					}
				}
				if (E.isLeft(result)) {
					setError(result.left.message)
					return result.left
				}
				const document = result.right
				setWorkspace((current) => {
					if (!current) return current
					const directories = new Set(current.directories)
					for (const directory of directoryAndAncestors(plan.directory)) directories.add(directory)
					return { ...updateWorkspaceDocument(current, document), directories: [...directories].sort() }
				})
				if (!open) {
					return {
						kind: "created-unopened",
						relativePath: document.relativePath,
						message: `${label} ${document.relativePath} was created without changing the originating buffer.`,
					}
				}
				if (captured) {
					if (!captured.isCurrent() || !session.fileCaptureIsCurrent(captured.capture))
						return { kind: "created-unopened", relativePath: document.relativePath, message: `${label} was created, but its originating window changed; it was not opened.` }
					const id = session.parkCommandSource(identityScope, document.relativePath, document, document.content)
					if (id) session.createParkedRuntime(identityScope, id, document.content)
					const runtime = id ? runtimeFor(id) : undefined
					if (!id || !runtime) return { kind: "created-unopened", relativePath: document.relativePath, message: `${label} was created without replacing a newer canonical target.` }
					finishMutation(owner)
					const opened = captured.isCurrent() && await captured.navigate(id, runtime.state.doc.lines)
					return opened ? { kind: "created", relativePath: document.relativePath }
						: { kind: "created-unopened", relativePath: document.relativePath, message: `${label} was created, but its originating window could not accept navigation.` }
				}
				if (!isCurrentOrigin() || (originCapture && !session.fileCaptureIsCurrent(originCapture)) ||
					!session.activateDocument(identityScope, document, document.content)) {
					const message = `${label} ${document.relativePath} was created, but newer editor input or its owner was retained; it was not opened.`
					setError(message)
					return { kind: "created-unopened", relativePath: document.relativePath, message }
				}
				revealRequestRef.current += 1
				setRevealTarget({
					relativePath: document.relativePath,
					line: session.getSnapshot().activeRuntime!.state.doc.lines,
					requestId: revealRequestRef.current,
				})
				setError(null)
				return { kind: "created", relativePath: document.relativePath }
			} catch {
				const message = `${label} creation ended unexpectedly; files may have changed. All buffers were retained. Refresh and reconcile before a manual retry; do not retry automatically.`
				if (effects.owns(owner) && session.matches(identityScope)) setError(message)
				return { kind: "uncertain", message }
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, originSession, originActivation, originPath],
	)

	const createDiary = useCallback(
		async (captured?: OrgNavigationSource): Promise<OrgDiaryOutcome> =>
			publishFreshDocument(Object.freeze(planOrgDiary(new Date(), crypto.randomUUID())), "Diary", true, captured),
		[publishFreshDocument],
	)
	const captureBufferNavigation = useCallback((bufferId: string, windowId: string, isCurrent: () => boolean,
		navigate: (bufferId: string, line: number) => Promise<boolean>): OrgCapturedBufferNavigation | null => {
		const path = bufferIdentity.findPath(identityScope, bufferId)
		const capture = path ? session.captureFile(identityScope, path) : null
		const permit = session.captureWindowPermit(identityScope, windowId, bufferId)
		if (!capture?.baseline || !capture.runtime || !permit || !permit() || !isCurrent() ||
			capture.bufferId !== bufferId || !session.fileCaptureIsCurrent(capture)) return null
		const captured: OrgNavigationSource = Object.freeze({
			capture, navigate,
			isCurrent: () => permit() && isCurrent() && session.closeReady && session.fileCaptureIsCurrent(capture),
		})
		return Object.freeze({
			openOrgLink: (target: OrgLinkClickTarget) => openOrgLink(target, captured),
			createDiary: () => createDiary(captured),
			openDocumentAt: (path: string, line: number, revision?: string | null,
				current?: (phase: "before" | "after") => boolean, signal?: AbortSignal) =>
				openDocumentAt(path, line, revision, current, signal, captured),
		})
	}, [identityScope, openOrgLink, openDocumentAt, createDiary])

	const createRoamNote = useCallback(
		async (input: OrgRoamNotePlan, options?: { readonly open?: boolean }): Promise<OrgNoteOutcome> => {
			const plan = Object.freeze({ ...input })
			const open = options?.open ?? true
			const capture = validateOrgRoamNoteCapture(plan)
			if (capture.kind === "rejected") {
				if (isCurrentOrigin()) setError(capture.message)
				return capture
			}
			const result = await publishFreshDocument(plan, "Note", open)
			return result.kind === "created" || result.kind === "created-unopened"
				? { ...result, id: plan.id, title: capture.title }
				: result
		},
		[publishFreshDocument],
	)

	const createDocument = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: creation, editor freshness checks, and parking are one transaction.
		async (relativePath: string): Promise<boolean> => {
			if (!workspace || !isCurrentOrigin() || !relativePath.trim() || fileBusy(relativePath)) {
				return false
			}
			if (protectedPath(relativePath)) {
				setError(`Save or discard changes before creating ${relativePath}.`)
				return false
			}
			const originCapture = originPath ? session.captureFile(identityScope, originPath) : null
			const owner = effects.begin({ label: "create", paths: [relativePath] })
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
				if (!session.matches(identityScope) || !effects.owns(owner)) return false
				if (E.isLeft(result)) {
					setError(result.left.message)
					return false
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
				if (!isCurrentOrigin() || (originCapture && !session.fileCaptureIsCurrent(originCapture))) {
					setError("The new document was created, but newer editor input was retained.")
					return false
				}
				if (!session.activateDocument(identityScope, document, initialContent)) {
					setError("The new document was created, but its originating editor owner was retained.")
					return false
				}
				revealRequestRef.current += 1
				setRevealTarget({
					relativePath: document.relativePath,
					line: session.getSnapshot().activeRuntime!.state.doc.lines,
					requestId: revealRequestRef.current,
				})
				return true
			} catch {
				if (effects.owns(owner) && session.matches(identityScope)) {
					setError(
						"Create ended unexpectedly; files may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; no rollback was attempted.",
					)
				}
				return false
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, dirtyPath, originSession, originActivation, originPath],
	)

	const createDirectory = useCallback(
		async (relativePath: string): Promise<boolean> => {
			if (
				!workspace ||
				!isCurrentOrigin() ||
				fileBusy(relativePath) ||
				!relativePath.trim()
			) {
				return false
			}
			const owner = effects.begin({ label: "createDirectory", paths: [relativePath] })
			setError(null)
			try {
				const result = await createOrgDirectoryFlow({
					relativePath,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})()
				if (!effects.owns(owner) || !session.matches(identityScope)) {
					return false
				}
				if (E.isLeft(result)) {
					setError(result.left.message)
					return false
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
				return true
			} catch {
				if (effects.owns(owner) && session.matches(identityScope)) {
					setError(
						"createDirectory ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
				return false
			} finally {
				finishMutation(owner)
			}
		},
		[workspace, originSession, originActivation, originPath],
	)

	const revealWorkspacePath = useCallback(
		async (relativePath: string | null): Promise<boolean> => {
			if (!workspace || !session.matches(identityScope)) return false
			if (relativePath !== null &&
				!workspace.documents.some(entry => entry.relativePath === relativePath) &&
				!workspace.directories.includes(relativePath)) return false
			setError(null)
			try {
				const result = await revealOrgWorkspacePathFlow({
					workspaceRoot: workspace.rootPath,
					capabilityToken: workspace.capabilityToken,
					relativePath,
				})()
				if (!session.matches(identityScope)) return false
				if (E.isLeft(result)) {
					setError(result.left.message)
					return false
				}
				return true
			} catch (cause) {
				if (session.matches(identityScope)) setError(`Cannot reveal workspace path: ${String(cause)}`)
				return false
			}
		},
		[workspace, originSession],
	)

	const moveDocument = useCallback(
		async (entry: OrgDocumentEntryInterface, targetRelativePath: string) => {
			const sourceDocument = currentFileBaseline(entry.relativePath) ?? entry
			if (
				!workspace ||
				!isCurrentOrigin() ||
				fileBusy(sourceDocument.relativePath, targetRelativePath) ||
				!targetRelativePath.trim() || targetRelativePath === entry.relativePath
			) {
				return false
			}
			if (sourceDocument.revision !== entry.revision) {
				setError("This file's revision changed. Refresh the file tree before moving it.")
				return false
			}
			if (dirtyPath(sourceDocument.relativePath) || dirtyPath(targetRelativePath)) {
				setError("Save or discard the current changes before moving this document.")
				return false
			}
			const sourceCapture = session.captureFile(identityScope, sourceDocument.relativePath)
			if (!sourceCapture) return false
			const sourcePath = sourceDocument.relativePath
			const sourceId = bufferIdentity.lookup(identityScope, sourcePath)
			const targetId = bufferIdentity.lookup(identityScope, targetRelativePath)
			const owner = effects.begin({ label: "moveDocument", paths: [sourcePath, targetRelativePath] })
			setError(null)
			try {
				const result = await moveOrgDocumentFlow({
					expectedSourceRevision: sourceDocument.revision,
					sourceRelativePath: sourceDocument.relativePath,
					targetRelativePath,
					capabilityToken: workspace.capabilityToken,
					workspaceRoot: workspace.rootPath,
				})()
				if (!effects.owns(owner) || !session.matches(identityScope)) {
					return false
				}
				if (E.isLeft(result)) {
					setError(result.left.message)
					return false
				}
				if (
					!session.fileCaptureIsCurrent(sourceCapture) ||
					bufferIdentity.lookup(identityScope, sourcePath) !== sourceId ||
					bufferIdentity.lookup(identityScope, result.right.relativePath) !== targetId
				) {
					setError("Buffer identity changed while moving; refresh and reconcile.")
					return false
				}
				if (sourceId && !session.moveApproved(identityScope, sourcePath, result.right.relativePath, sourceId)) {
					setError("Buffer identity changed while moving; refresh and reconcile.")
					return false
				}
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
				return true
			} catch {
				if (effects.owns(owner) && session.matches(identityScope)) {
					setError(
						"moveDocument ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
			return false
		},
		[activeDocument, workspace, dirtyPath, originSession, originActivation, originPath],
	)

	const migrateLegacyWorkspace = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: preview, source rechecks, atomic publication, and verification are one migration transaction.
		async (legacyWorkspace: LegacyMigrationWorkspace) => {
			if (!workspace || !isCurrentOrigin() || effects.busy) {
				return
			}
			openRequestRef.current += 1
			const owner = effects.begin({ label: "migrateLegacyWorkspace", presentation: "loading" })
			refileTargetRequestRef.current += 1
			
			setError(null)
			setMigrationStatus(null)
			try {
				// Legacy DB/recovery modules must stay outside the normal Org loading graph.
				const {
					areLegacyMigrationPlansEquivalent,
					executeLegacyMigrationFlow,
					prepareLegacyMigrationFlow,
				} = await import("@/flows/org-workspace/legacy-migration.flow")
				if (!effects.owns(owner) || !isCurrentOrigin()) return
				const prepared = await prepareLegacyMigrationFlow(legacyWorkspace)()
				if (!effects.owns(owner) || !isCurrentOrigin()) {
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
				const migrationPermit = session.captureDiscardPermit()
				const confirmed = await confirm({
					title: "Migrate legacy workspace?",
					description: `Migrate captured workspace “${plan.graph.workspace.name}” (${plan.graph.workspace.id}) into ${plan.rootDirectory}?\n\n` +
						`${plan.documents.length} Org documents, ${plan.directories.length} directories, ` +
						`${plan.rawBackups.length} raw backups, ${placeholders} placeholders, ` +
						`${warningCount} warnings.\n\n` +
						(warningPreview ? `Warning preview:\n${warningPreview}\n\n` : "") +
						`The exact workspace metadata, ${plan.graph.nodes.length} node rows with original parent links, and all ${plan.rawBackups.length} selected-workspace/recoverable orphan content rows are preserved in the recovery bundle. This is not a whole-database backup: unrelated users, settings, and tables are not included. Existing paths will never be reused or overwritten.`,
					confirmText: "Migrate",
					cancelText: "Cancel",
					signal: confirmationLifetime.current?.signal,
				})
				if (!effects.owns(owner) || !isCurrentOrigin() || !migrationPermit() || confirmed !== true) {
					return
				}
				const refreshedPlan = await prepareLegacyMigrationFlow(legacyWorkspace)()
				if (!effects.owns(owner) || !isCurrentOrigin() || !migrationPermit()) {
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
				if (!effects.owns(owner) || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(written)) {
					setError(`Migration ${written.left.stage} failed: ${written.left.cause.message}`)
					return
				}
				const finalPlan = await prepareLegacyMigrationFlow(legacyWorkspace)()
				if (!effects.owns(owner) || !isCurrentOrigin()) {
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
				if (!effects.owns(owner) || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(rescanned)) {
					setError(`Migration completed, but refresh failed: ${rescanned.left.message}`)
					return
				}
				setWorkspace({ ...rescanned.right, capabilityToken: workspace.capabilityToken })
			} catch {
				if (effects.owns(owner) && isCurrentOrigin()) {
					setError(
						"migrateLegacyWorkspace ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
					)
				}
			} finally {
				finishMutation(owner)
			}
		},
		[confirm, workspace, originSession, originActivation, originPath],
	)

	const verifyLegacyMigration = useCallback(
		async (legacyWorkspace: LegacyMigrationWorkspace) => {
			if (!workspace || !isCurrentOrigin() || effects.busy) {
				return
			}
			openRequestRef.current += 1
			const owner = effects.begin({ label: "verifyLegacyMigration", presentation: "loading" })
			refileTargetRequestRef.current += 1
			
			setError(null)
			setMigrationStatus(null)
			try {
				// Legacy recovery is loaded only by its explicit legacy-mode action.
				const { verifyLegacyMigrationRecoveryFlow } = await import("@/flows/org-workspace/legacy-migration.flow")
				if (!effects.owns(owner) || !isCurrentOrigin()) return
				const result = await verifyLegacyMigrationRecoveryFlow(
					legacyWorkspace,
					workspace.rootPath,
					undefined,
					undefined,
					workspace.capabilityToken,
				)()
				if (!effects.owns(owner) || !isCurrentOrigin()) {
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
				if (effects.owns(owner) && isCurrentOrigin()) {
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
		if (!workspace || !isCurrentOrigin() || effects.busy) {
			return
		}
		if (hasDirtyBuffers()) {
			setError("Save the current document before rebuilding the derived index.")
			return
		}
		openRequestRef.current += 1
		const owner = effects.begin({ label: "rebuildDerivedIndex", presentation: "loading" })
		refileTargetRequestRef.current += 1
		
		setError(null)
		setDerivedIndexStatus(null)
		try {
			const rescanned = await scanOrgWorkspaceFlow(workspace.rootPath, workspace.capabilityToken)()
			if (!effects.owns(owner) || !isCurrentOrigin()) {
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
			if (!effects.owns(owner) || !isCurrentOrigin()) {
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
			if (effects.owns(owner) && isCurrentOrigin()) {
				setError(
					"rebuildDerivedIndex ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
				)
			}
		} finally {
			finishMutation(owner)
		}
	}, [isDirty, workspace, originSession, originActivation, originPath])

	const clearDerivedIndex = useCallback(async () => {
		if (!workspace || !isCurrentOrigin() || effects.busy) {
			return
		}
		const owner = effects.begin({ label: "clearDerivedIndex", presentation: "loading" })
		refileTargetRequestRef.current += 1
		
		setError(null)
		setDerivedIndexStatus(null)
		try {
			const result = await clearOrgDerivedIndexFlow(workspace.rootPath, workspace.capabilityToken)()
			if (!effects.owns(owner) || !isCurrentOrigin()) {
				return
			}
			if (E.isLeft(result)) {
				setError(result.left.message)
				return
			}
			setDerivedIndexStatus("Derived index cleared. Org files were not modified.")
		} catch {
			if (effects.owns(owner) && isCurrentOrigin()) {
				setError(
					"clearDerivedIndex ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
				)
			}
		} finally {
			finishMutation(owner)
		}
	}, [workspace, originSession, originActivation, originPath])

	const runLegacyRecoveryDrill = useCallback(
		async (legacyWorkspace: LegacyMigrationWorkspace) => {
			if (!workspace || !isCurrentOrigin() || effects.busy) {
				return
			}
			const owner = effects.begin({ label: "runLegacyRecoveryDrill", presentation: "loading" })
			refileTargetRequestRef.current += 1
			
			setError(null)
			setMigrationStatus(null)
			try {
				// Legacy recovery is loaded only by its explicit legacy-mode action.
				const { runLegacyMigrationRecoveryDrillFlow } = await import("@/flows/org-workspace/legacy-migration.flow")
				if (!effects.owns(owner) || !isCurrentOrigin()) return
				const result = await runLegacyMigrationRecoveryDrillFlow(
					legacyWorkspace,
					workspace.rootPath,
					undefined,
					undefined,
					workspace.capabilityToken,
				)()
				if (!effects.owns(owner) || !isCurrentOrigin()) {
					return
				}
				if (E.isLeft(result)) {
					setError(`Recovery drill ${result.left.stage} failed: ${result.left.cause.message}`)
					return
				}
				setMigrationStatus(
					`Recovery drill passed: reconstructed selected workspace ${result.right.recoveredWorkspaceId}, ${result.right.recoveredNodeCount} node rows with exact parent links, and ${result.right.recoveredContentCount} preserved content rows; verified ${result.right.verification.checkedCount} artifacts. Standalone selected-workspace SQLite script: ${result.right.recoverySqlPath}. Unrelated users, settings, and database tables are not restored.`,
				)
			} catch {
				if (effects.owns(owner) && isCurrentOrigin()) {
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

	const deleteDocument = useCallback(async (entry: OrgDocumentEntryInterface) => {
		const sourceDocument = currentFileBaseline(entry.relativePath) ?? entry
		if (!workspace || !isCurrentOrigin() || fileBusy(sourceDocument.relativePath)) {
			return false
		}
		if (sourceDocument.revision !== entry.revision) {
			setError("This file's revision changed. Refresh the file tree before deleting it.")
			return false
		}
		const sourceBaseline = Object.freeze({ ...sourceDocument })
		const sourceCapture = session.captureFile(identityScope, sourceDocument.relativePath)
		if (!sourceCapture) return false
		if (await confirm({
			title: "Delete this file?",
			description: `${sourceBaseline.relativePath}\n\n${dirtyPath(sourceBaseline.relativePath)
				? "Remove this file and discard its unsaved editor input? Saved file bytes remain at a manual recovery path; unsaved input is not preserved."
				: "Remove this file from the workspace? Saved file bytes remain at a manual recovery path. This cannot be undone in the editor."}`,
			confirmText: "Delete",
			cancelText: "Cancel",
			signal: confirmationLifetime.current?.signal,
		}) !== true) return false
		if (fileBusy(sourceBaseline.relativePath) || !session.fileCaptureIsCurrent(sourceCapture)) return false
		const owner = effects.begin({ label: "deleteDocument", paths: [sourceBaseline.relativePath] })
		setError(null)
		const sourcePath = sourceBaseline.relativePath
		try {
			const result = await deleteOrgDocumentFlow({
				expectedRevision: sourceBaseline.revision,
				relativePath: sourcePath,
				capabilityToken: workspace.capabilityToken,
				workspaceRoot: workspace.rootPath,
			})()
			if (!effects.owns(owner) || !session.matches(identityScope)) {
				return false
			}
			if (E.isLeft(result)) {
				setError(result.left.message)
				return false
			}
			const retained: OrgOriginalRecoveryEntryInterface = result.right
			if (!retained || retained.kind !== "delete" || retained.object !== "original" || retained.sourceRelativePath !== sourcePath ||
				typeof retained.relativePath !== "string" || !retained.relativePath) {
				session.protect(identityScope, sourcePath, "conflict")
				session.invalidateBaseline(identityScope, sourcePath)
				setError("Deletion acknowledgement was invalid. Editor input was retained; refresh and reconcile before any manual retry.")
				return false
			}
			setWorkspace((current) =>
				current
					? {
							...current,
							originalRecoveries: [...(current.originalRecoveries ?? []).filter((entry) => entry.relativePath !== retained.relativePath), retained],
							documents: current.documents.filter(
								(document) => document.relativePath !== sourcePath,
							),
						}
					: current,
			)
			if (!session.fileCaptureIsCurrent(sourceCapture)) {
				session.protect(identityScope, sourcePath, "conflict")
				session.invalidateBaseline(identityScope, sourcePath)
				setError(`The file ${sourcePath} was deleted, but newer editor input was retained.`)
				return false
			}
			if (session.document?.relativePath === sourcePath) {
				session.closeActiveDocument(identityScope)
				setRevealTarget(null)
			} else retireBuffer(sourcePath)
			return true
		} catch {
			if (effects.owns(owner) && session.matches(identityScope)) {
				setError(
					"deleteDocument ended unexpectedly; files or derived state may have changed. All editor buffers were retained. Refresh and reconcile before a manual retry; do not automatically retry. No rollback was attempted.",
				)
			}
		} finally {
			finishMutation(owner)
		}
		return false
	}, [confirm, activeDocument, workspace, dirtyPath, originSession, originActivation, originPath])

	return {
		liveBuffers,
		registerBufferWindow,
		captureBufferWindowPermit,
		captureBufferTransfer,
		captureBufferNavigation,
		clock,
		activateOpenBuffer,
		activeBufferRuntime,
		activeBufferId: activeBufferRuntime?.key.bufferId ?? null,
		activeDocument,
		archiveSubtree,
		captureTodo,
		captureEntry,
		readCaptureTarget,
		setTransientDirty,
		clearDerivedIndex,
		closeActiveDocument,
		closeDocumentPath,
		content,
		createDirectory,
		createDocument,
		revealWorkspacePath,
		createDiary,
		createRoamNote,
		readRemarkNotes,
		executeRemarkMutation,
		saveRemarkNotes,
		deleteDocument,
		derivedIndexStatus,
		error,
		isDirty,
		isLoading: isLoading || !nativeCloseReady,
		isEditorReadOnly: isLoading || !nativeCloseReady || Boolean(focusedEffect?.busy && !focusedEffect.saveInFlight),
		isSaving,
		isWorkspaceBusy: effectSnapshot.busy || effectSnapshot.loading,
		isWorkspaceBlocked: effectSnapshot.globalBusy || effectSnapshot.globalLoading || !nativeCloseReady,
		getBufferEffectState,
		captureBufferSave,
		captureFileReview,
		protectedPaths: session.protectedPaths,
		acceptFileReview,
		cancelFileReview: session.cancelFileReview,
		isFileReviewCurrent: session.reviewIsCurrent,
		nativeWindowsAvailable: isTauri(),
		nativeWindows: nativeWindowSnapshot.windows,
		detachBuffer,
		attachNativeWindow,
		rebindNativeWindow,
		closeNativeWindow,
		migrateLegacyWorkspace,
		migrationStatus,
		moveDocument,
		openBuffers,
		openDefaultWorkspace,
		openDocument,
		openDocumentAt,
		openDocumentPath,
		switchBuffer,
		openOrgLink,
		executeAgendaCommand,
		prepareAgendaCommand,
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
