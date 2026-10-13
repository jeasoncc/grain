import type { OrgBufferRuntime } from "@/flows/org-editor-runtime"
import {
	captureOrgAgendaOperation,
	freezeOrgAgendaEntrySnapshot,
	planAgendaOperation,
} from "@/pipes/org/org-agenda-command-plan.pipe"
import {
	hasOrgAgendaActionOrigin,
	validateOrgAgendaOrigin,
	type OrgAgendaEntry,
} from "@/pipes/org/org-agenda.pipe"
import { isSafeRelativeOrgPath } from "@/pipes/org/org-subtree-refile.pipe"
import type { OrgTextEdit } from "@/pipes/org/org-text.pipe"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import type {
	OrgAgendaOperationPlan,
	OrgAgendaExecutionOptions,
	OrgAgendaOperationCapture,
} from "@/types/org/org-agenda-command.types"

export interface OrgAgendaRootSnapshot {
	/** Root compares captured grant object and session against its current references, not labels. */
	readonly current: boolean
	readonly nativeReady: boolean
	readonly mirrorsMutable: boolean
	readonly loading: boolean
	readonly mutating: boolean
	readonly saving: boolean
	readonly saveAll: boolean
	readonly agendaBusy: boolean
	readonly conflict: boolean
	readonly paused: boolean
}
export interface OrgAgendaOwnedLease {
	readonly isCurrent: () => boolean
	readonly startRead: () => void
	readonly readIsCurrent: () => boolean
	readonly finishRead: () => void
	readonly release: () => void
}
/** Captured scope ports: Root supplies authority snapshots and memory adapters, not command law. */
export interface OrgAgendaCommandPorts {
	readonly scope: { readonly grant: OrgWorkspaceInterface; readonly sessionId: string } | null
	readonly captureClock: () => string
	readonly snapshot: (path: string) => OrgAgendaRootSnapshot
	readonly claim: () => OrgAgendaOwnedLease
	readonly readWorkingCopy: (
		path: string,
	) => { readonly document: OrgDocumentInterface; readonly content: string } | undefined
	readonly readDocument: (path: string) => Promise<unknown>
	readonly lookupId: (path: string) => string | undefined
	readonly parkEditSource: (
		path: string,
		document: OrgDocumentInterface,
		body: string,
	) => string | undefined
	readonly createRuntime: (id: string, expectedBody: string) => void
	readonly getRuntime: (id: string) => OrgBufferRuntime | undefined
	readonly runtimeIdentity: (runtime: OrgBufferRuntime) => string
	readonly commit: (
		id: string,
		expectedBody: string,
		edits: readonly OrgTextEdit[],
		guard: () => boolean,
	) => boolean
}
export type OrgAgendaFlowResult =
	| Exclude<OrgAgendaOperationPlan, { readonly kind: "edit" }>
	| { readonly kind: "confirmed" }

/** Inlet -> immutable capture -> cancellable read -> pure plan -> EDIT allocation -> guarded atomic commit. */
export const runOrgAgendaOperationFlow = async (
	inputEntry: OrgAgendaEntry,
	inputOperation: unknown,
	ports: OrgAgendaCommandPorts,
	signal?: AbortSignal,
	options?: OrgAgendaExecutionOptions,
): Promise<OrgAgendaFlowResult> => {
	const stale = (): { readonly kind: "stale" } => ({ kind: "stale" })
	const rejected = (message: string): { readonly kind: "rejected"; readonly message: string } => ({
		kind: "rejected",
		message,
	})
	let entry: OrgAgendaEntry
	let captured: OrgAgendaOperationCapture
	const observer = options?.onCommitStarted
	try {
		entry = freezeOrgAgendaEntrySnapshot(inputEntry)
		// The clock is an explicit Root boundary, never a Leaf default.
		const needsClock =
			inputOperation !== null &&
			typeof inputOperation === "object" &&
			"kind" in inputOperation &&
			(inputOperation.kind === "cycle-todo" || inputOperation.kind === "todo-state" || inputOperation.kind === "complete-repeating") &&
			(!("timestamp" in inputOperation) || inputOperation.timestamp === undefined)
		let timestamp: string | undefined
		if (needsClock) {
			try {
				timestamp = ports.captureClock()
			} catch {
				return rejected("Invalid local TODO timestamp.")
			}
		}
		captured = captureOrgAgendaOperation(inputOperation, timestamp)
	} catch {
		return rejected("Invalid agenda command capture.")
	}
	if (captured.kind === "rejected") return captured
	const operation = captured.operation
	const scope = ports.scope
	const origin = entry.origin
	const current = () => ports.snapshot(entry.relativePath).current && !signal?.aborted && (options?.isCurrent?.() ?? true)
	if (!scope || !current()) return stale()
	const { grant, sessionId: session } = scope
	if (
		!hasOrgAgendaActionOrigin(origin) ||
		origin.workspaceRoot !== grant.rootPath ||
		origin.capabilityToken !== grant.capabilityToken ||
		origin.workspaceSessionId !== session ||
		origin.relativePath !== entry.relativePath ||
		!isSafeRelativeOrgPath(entry.relativePath)
	)
		return stale()
	const path = entry.relativePath
	const available = (s: OrgAgendaRootSnapshot) =>
		s.nativeReady && s.mirrorsMutable && !s.loading && !s.mutating && !s.saving && !s.saveAll
	const inlet = ports.snapshot(path)
	if (!available(inlet) || inlet.agendaBusy) return rejected("A workspace operation is running.")
	if (inlet.conflict || inlet.paused)
		return rejected("Resolve the target buffer conflict before changing the agenda heading.")
	const lease = ports.claim()
	const owns = () => current() && lease.isCurrent()
	let cancelRead!: () => void
	const cancelledRead = new Promise<null>((resolve) => {
		cancelRead = () => resolve(null)
	})
	let publishing = false
	const cancel = () => {
		if (publishing) return
		cancelRead()
		lease.release()
	}
	signal?.addEventListener("abort", cancel, { once: true })
	try {
		let id = ports.lookupId(path)
		const copy = ports.readWorkingCopy(path)
		let document = copy?.document
		let raw = copy?.content
		if (!document) {
			if (origin.source !== "disk") return stale()
			lease.startRead()
			// Race observes late rejection without allowing a released caller to allocate.
			const opened = await Promise.race([ports.readDocument(path), cancelledRead])
			if (!opened || !owns() || !lease.readIsCurrent()) return stale()
			if (typeof opened !== "object" || !("_tag" in opened))
				return rejected("Invalid document read response.")
			if (opened._tag === "Left") {
				const left = "left" in opened ? opened.left : undefined
				return rejected(
					left && typeof left === "object" && "message" in left && typeof left.message === "string"
						? left.message
						: "Invalid document read response.",
				)
			}
			if (
				opened._tag !== "Right" ||
				!("right" in opened) ||
				!opened.right ||
				typeof opened.right !== "object"
			)
				return rejected("Invalid document read response.")
			const value = opened.right
			if (
				!("relativePath" in value) ||
				value.relativePath !== path ||
				!("content" in value) ||
				typeof value.content !== "string" ||
				!("revision" in value) ||
				typeof value.revision !== "string" ||
				!value.revision
			)
				return rejected("Invalid document read response.")
			// Keep the complete response metadata while capturing its validated body authority.
			document = { ...value, relativePath: path, content: value.content, revision: value.revision }
			raw = document.content
			if (
				document.revision !== origin.diskRevision ||
				origin.sourceRevision !== document.revision ||
				!validateOrgAgendaOrigin({ ...entry, origin }, raw, document.revision, {
					workspaceSessionId: session,
				}).valid
			)
				return stale()
			const planned = planAgendaOperation(entry, raw, operation)
			if (planned.kind !== "edit") return planned
			if (!owns()) return stale()
			id = ports.parkEditSource(path, document, raw)
			if (!id || !owns()) return stale()
			ports.createRuntime(id, raw)
			lease.finishRead()
		}
		if (
			!owns() ||
			!id ||
			raw === undefined ||
			!document ||
			document.revision !== origin.diskRevision
		)
			return stale()
		const runtime = ports.getRuntime(id)
		if (!runtime || runtime.source !== raw) return stale()
		if (origin.source === "disk" && runtime.source !== document.content) return stale()
		const revision = origin.source === "live" ? id : document.revision
		const validate = () =>
			validateOrgAgendaOrigin({ ...entry, origin }, runtime.source, revision, {
				workspaceSessionId: session,
				...(origin.source === "live"
					? {
							runtimeIncarnation: ports.runtimeIdentity(runtime),
							sourceGeneration: runtime.revision,
						}
					: {}),
			}).valid
		if (!validate()) return stale()
		const incarnation = ports.runtimeIdentity(runtime)
		const generation = runtime.revision
		const planningEntry = freezeOrgAgendaEntrySnapshot({
			...entry,
			origin: {
				...origin,
				source: "live",
				sourceRevision: id,
				runtimeIncarnation: incarnation,
				sourceGeneration: generation,
			},
		})
		const planned = planAgendaOperation(planningEntry, raw, operation)
		if (planned.kind !== "edit") return planned
		const anchorCurrent = () =>
			owns() &&
			ports.lookupId(path) === id &&
			ports.getRuntime(id) === runtime &&
			ports.runtimeIdentity(runtime) === incarnation &&
			runtime.revision === generation &&
			validate()
		const commandOwner = () => {
			const s = ports.snapshot(path)
			return anchorCurrent() && available(s) && !s.conflict && !s.paused
		}
		const refusedCommit = () =>
			anchorCurrent() ? rejected("A workspace operation is running.") : stale()
		if (!commandOwner()) return refusedCommit()
		observer?.()
		if (!commandOwner()) return refusedCommit()
		publishing = true
		const before = runtime.revision
		try {
			return ports.commit(id, raw, planned.edits, commandOwner)
				? { kind: "confirmed" }
				: refusedCommit()
		} catch {
			if (runtime.revision !== before) return { kind: "confirmed" }
			throw new Error("Agenda publication failed before commit.")
		} finally {
			publishing = false
		}
	} catch {
		return owns() ? rejected("Cannot change the agenda heading.") : stale()
	} finally {
		signal?.removeEventListener("abort", cancel)
		cancel()
	}
}
