import type { OrgDocumentEntryInterface, OrgDocumentInterface, OrgDocumentWriteResultInterface, OrgWorkspaceInterface } from "@/types/org"
import type { OrgRuntimeCommitContext } from "@/types/editor/org-runtime-owner.interface"
import { guardOrgWorkingCopyBaseline, planOrgWorkingCopyAck } from "@/pipes/editor/org-working-copy-ack.pipe"
import { createOrgBufferIdentityRegistry, type OrgBufferIdentityScope } from "./org-buffer-identity-registry"
import type { OrgBufferKey, OrgBufferRuntime } from "./org-buffer-runtime.types"
import { createOrgParkedWorkingCopyReservoir, type OrgParkedWorkingCopy } from "./org-parked-working-copy-reservoir"
import { createOrgWorkspaceRuntimeRegistry, type OrgWorkspaceRuntimePorts } from "./org-workspace-runtime-registry"
import type { OrgWorkspaceEffectOwner } from "./org-workspace-effect-owner"
import type { OrgFileDiskState, OrgFileReview, OrgFileReviewChoice, OrgFileReviewOutcome } from "./org-file-review.types"

export interface OrgWorkspaceSessionOrigin {
	readonly grant: OrgWorkspaceInterface | null
	readonly sessionId: string | null
	readonly activation: number
	readonly path: string | null
}

export interface OrgWorkspaceSessionScope extends OrgBufferIdentityScope {
	readonly grant: OrgWorkspaceInterface
}

export interface OrgWorkspaceSessionSnapshot {
	readonly revision: number
	readonly grant: OrgWorkspaceInterface | null
	readonly sessionId: string | null
	/** Issued once per lifetime; reconstructed grant/session pairs are not authority. */
	readonly scope: OrgWorkspaceSessionScope | null
	readonly activation: number
	readonly document: OrgDocumentInterface | null
	readonly source: string
	readonly isDirty: boolean
	readonly activeRuntime: OrgBufferRuntime | null
	readonly closeReady: boolean
}

export interface OrgWorkspaceWorkingCopyAck {
	readonly bufferId: string
	readonly expectedDocument: OrgDocumentInterface
	readonly capturedSource: string
	readonly receipt: OrgDocumentEntryInterface
}

export type OrgWorkspaceWorkingCopyAckResult =
	| {
			readonly kind: "ack"
			readonly document: OrgDocumentInterface
			readonly isDirty: boolean
			readonly previousCopy: OrgParkedWorkingCopy | null
			readonly currentCopy: OrgParkedWorkingCopy | null
	  }
	| { readonly kind: "rejected"; readonly reason: string }

/** Issued file capture is independent of which buffer later owns main-window focus. */
export interface OrgWorkspaceFileCapture {
	readonly scope: OrgWorkspaceSessionScope
	readonly relativePath: string
	readonly bufferId: string | undefined
	readonly runtime: OrgBufferRuntime | undefined
	readonly source: string | undefined
	readonly sourceGeneration: number | undefined
	readonly baseline: OrgDocumentInterface | undefined
}

export interface OrgWorkspaceConfirmedTarget {
	readonly document: OrgDocumentInterface
	readonly capture: OrgWorkspaceFileCapture
}

export type OrgWorkspaceConfirmedTargetResult =
	| { readonly kind: "installed"; readonly retainedWorkingCopy: boolean }
	| { readonly kind: "rejected"; readonly reason: string }

/** Narrow command-window registration surface, without lifecycle or baseline authority. */
export interface OrgWorkspaceSessionWindowAuthority {
	readonly runtimes: { get(key: OrgBufferKey): OrgBufferRuntime | undefined }
	key(id: string, scope?: OrgBufferIdentityScope | null): OrgBufferKey
	registerWindow(scope: OrgBufferIdentityScope | null, windowId: string, bufferId: string): () => void
}

interface OrgWorkspaceSessionPorts {
	readonly effects: OrgWorkspaceEffectOwner
	readonly emitError: (message: string) => void
	readonly releaseGrant: (grant: OrgWorkspaceInterface) => Promise<unknown>
}

/**
 * Grant-local lifetime and edit authority. Runtime remains the only source/history
 * writer; active and parked content here are synchronous receipt mirrors for IO/UI.
 */
export const createOrgWorkspaceSessionOwner = (ports: OrgWorkspaceSessionPorts) => {
	const identity = createOrgBufferIdentityRegistry()
	const runtimes = createOrgWorkspaceRuntimeRegistry()
	let mounted = true
	let closeReady = false
	let grant: OrgWorkspaceInterface | null = null
	let sessionId: string | null = null
	let identityScope: OrgWorkspaceSessionScope | null = null
	let activation = 0
	let document: OrgDocumentInterface | null = null
	let source = ""
	let activeRuntime: OrgBufferRuntime | null = null
	let editGeneration = 0
	let transientGeneration = 0
	let authorityGeneration = 0
	let protectionGeneration = 0
	const invalidBaselines = new Set<string>()
	const transientDirty = new Set<string>()
	const conflicts = new Set<string>()
	const autosavePaused = new Set<string>()
	const incarnations = new WeakMap<OrgBufferRuntime, string>()
	const fileCaptures = new WeakSet<OrgWorkspaceFileCapture>()
	const baselineEpochs = new Map<string, number>()
	const knownBaselines = new Map<string, OrgDocumentInterface>()
	const capturedBaselineEpochs = new WeakMap<OrgWorkspaceFileCapture, number>()
	const capturedProtectionEpochs = new WeakMap<OrgWorkspaceFileCapture, number>()
	const protectionEpochs = new Map<string, number>()
	const reviews = new WeakMap<OrgFileReview, { capture: OrgWorkspaceFileCapture; permit: () => boolean; protectionEpoch: number }>()
	const windows = new Map<string, {
		readonly scope: OrgBufferIdentityScope
		readonly bufferId: string
		readonly runtime: OrgBufferRuntime
	}>()
	let notifying = false
	let reporting = false
	let transactionDepth = 0
	let pendingNotification = false
	const listeners = new Set<() => void>()
	const report = (message: string) => {
		if (reporting) return
		reporting = true
		try {
			ports.emitError(message)
		} catch {
			/* Observational error delivery cannot unwind canonical state. */
		} finally {
			reporting = false
		}
	}
	const parked = createOrgParkedWorkingCopyReservoir(identity, (failure) => {
		if (mounted) report(`Parked observer failure: ${failure.kind}`)
	})
	const currentScope = (): OrgWorkspaceSessionScope | null => identityScope
	const matches = (candidate: OrgBufferIdentityScope | null): boolean =>
		mounted && candidate !== null && candidate === identityScope
	const canMutate = (): boolean => !notifying && parked.canMutate()
	const createSnapshot = (revision: number): OrgWorkspaceSessionSnapshot => Object.freeze({
		revision,
		grant,
		sessionId,
		scope: identityScope,
		activation,
		document,
		source,
		isDirty: !!document && (invalidBaselines.has(document.relativePath) || source !== document.content),
		activeRuntime,
		closeReady,
	})
	let snapshot = createSnapshot(0)
	const deliver = () => {
		if (transactionDepth || notifying || !pendingNotification) return
		notifying = true
		try {
			do {
				pendingNotification = false
				for (const listener of [...listeners]) {
					try {
						listener()
					} catch {
						report("Session observer failure: listener")
					}
				}
			} while (pendingNotification)
		} finally {
			notifying = false
		}
	}
	const changed = () => {
		// Receipt mirrors are visible synchronously, even when lifecycle delivery is batched.
		snapshot = createSnapshot(snapshot.revision + 1)
		pendingNotification = true
		deliver()
	}
	const transition = <T>(change: () => T): T => {
		transactionDepth += 1
		try {
			return change()
		} finally {
			transactionDepth -= 1
			deliver()
		}
	}
	parked.subscribe(changed)
	const isCurrentActivation = (
		origin: OrgWorkspaceSessionOrigin,
		expectedActivation = origin.activation,
	): boolean =>
		mounted && closeReady && grant === origin.grant &&
		sessionId === origin.sessionId && activation === expectedActivation
	const isCurrentOrigin = (
		origin: OrgWorkspaceSessionOrigin,
		expectedActivation = origin.activation,
		expectedPath = origin.path,
	): boolean =>
		isCurrentActivation(origin, expectedActivation) && canMutate() &&
		(document?.relativePath ?? null) === expectedPath
	const dirtyPath = (path: string): boolean =>
		invalidBaselines.has(path) ||
		(document?.relativePath === path && source !== document.content) ||
		Boolean(parked.read(currentScope(), path)?.isDirty)
	const protectedPath = (path: string): boolean =>
		dirtyPath(path) || autosavePaused.has(path) || conflicts.has(path)
	const hasDirtyBuffers = (): boolean =>
		transientDirty.size > 0 || invalidBaselines.size > 0 || autosavePaused.size > 0 || conflicts.size > 0 ||
		Boolean(document && dirtyPath(document.relativePath)) ||
		parked.list(currentScope()).some((copy) => copy.isDirty)
	const key = (id: string, scope: OrgBufferIdentityScope | null = currentScope()) => ({
		workspaceSessionId: scope?.sessionId ?? "",
		bufferId: id,
	})
	const mirrorSource = (value: string) => {
		if (source === value) return
		editGeneration += 1
		source = value
		changed()
	}
	const setDocument = (next: OrgDocumentInterface | null): boolean => {
		if (!mounted || !canMutate()) return false
		if (next) {
			if (guardOrgWorkingCopyBaseline(next, knownBaselines.get(next.relativePath))) {
				baselineEpochs.set(next.relativePath, (baselineEpochs.get(next.relativePath) ?? 0) + 1)
				knownBaselines.set(next.relativePath, Object.freeze({ ...next }))
			}
		}
		authorityGeneration += 1
		document = next
		changed()
		return true
	}
	const protect = (
		scope: OrgBufferIdentityScope | null,
		path: string,
		kind: "conflict" | "pause",
	): boolean => {
		if (!matches(scope) || !canMutate()) return false
		protectionEpochs.set(path, (protectionEpochs.get(path) ?? 0) + 1)
		if (autosavePaused.has(path) && (kind === "pause" || conflicts.has(path))) return true
		autosavePaused.add(path)
		if (kind === "conflict") conflicts.add(path)
		protectionGeneration += 1
		changed()
		return true
	}
	const reconcileProtection = (
		scope: OrgBufferIdentityScope | null,
		path: string,
		kind: "all" | "conflict",
	): boolean => {
		if (!matches(scope) || !canMutate()) return false
		const hadConflict = conflicts.delete(path)
		const wasPaused = kind === "all" && autosavePaused.delete(path)
		if (hadConflict || wasPaused) {
			protectionGeneration += 1
			protectionEpochs.set(path, (protectionEpochs.get(path) ?? 0) + 1)
			changed()
		}
		return true
	}
	let confirmedInstallation: { readonly scope: OrgBufferIdentityScope; readonly id: string; failed: boolean } | null = null
	const runtimePorts = (scope: OrgBufferIdentityScope): OrgWorkspaceRuntimePorts => ({
		readCommitContext: (runtimeKey, previous, next, originWindowId): OrgRuntimeCommitContext => {
			const lease = originWindowId ? windows.get(originWindowId) : undefined
			const parkedPath = identity.findPath(scope, runtimeKey.bufferId)
			const effect = parkedPath ? ports.effects.getFileSnapshot(parkedPath) : null
			return {
				mounted,
				closeReady,
				grantMatches: grant === scope.grant,
				sessionMatches: sessionId === scope.sessionId && runtimeKey.workspaceSessionId === sessionId,
				originWindowId,
				registeredWindowBufferId:
					lease?.scope.grant === scope.grant && lease.scope.sessionId === scope.sessionId &&
					lease.runtime === runtimes.get(runtimeKey) && !lease.runtime.closed
						? lease.bufferId : undefined,
				isActiveOwner: !!document && identity.lookup(scope, document.relativePath) === runtimeKey.bufferId,
				previous,
				next,
				activeSource: source,
				parkedSource: parkedPath ? parked.read(scope, parkedPath)?.content : undefined,
				runtimeBufferId: runtimeKey.bufferId,
				loading: effect?.loading ?? ports.effects.getSnapshot().globalLoading,
				notificationInProgress: !canMutate(),
				mutationInProgress: effect?.busy ?? ports.effects.getSnapshot().globalBusy,
				ordinarySaveInFlight: Boolean(effect?.saveInFlight),
			}
		},
		commitSource: (runtimeKey, next) => {
			if (!matches(scope) || runtimeKey.workspaceSessionId !== sessionId) return
			const path = identity.findPath(scope, runtimeKey.bufferId)
			if (path === document?.relativePath) mirrorSource(next)
			else if (path) {
				const copy = parked.read(scope, path)
				if (copy) parked.mirrorReplacement(scope, runtimeKey.bufferId, { previous: copy.content, source: next })
			}
		},
		emitFailure: (runtimeKey, failure) => {
			const path = identity.findPath(scope, runtimeKey.bufferId)
			if (!matches(scope) || runtimeKey.workspaceSessionId !== sessionId || path === undefined) return
			if (confirmedInstallation?.scope === scope && confirmedInstallation.id === runtimeKey.bufferId) {
				confirmedInstallation.failed = true
				// Protect before the error observer can retire this lifetime.
				protect(scope, path, "conflict")
			}
			report(failure.message)
		},
	})
	const installSource = (value: string): boolean => transition(() => {
		if (!mounted || !canMutate()) return false
		authorityGeneration += 1
		const scope = currentScope()
		if (!document || !scope) {
			if (value !== "") return false
			activeRuntime = null
			mirrorSource("")
			changed()
			return true
		}
		const id = identity.ensure(scope, document.relativePath)
		runtimes.activate(key(id, scope), value, runtimePorts(scope), {
			prepareSource: mirrorSource,
			setActiveRuntime: (runtime) => {
				if (!matches(scope) || identity.findPath(scope, id) !== document?.relativePath) return
				activeRuntime = runtime
				changed()
			},
		})
		return matches(scope)
	})
	const revokeRuntime = (scope: OrgBufferIdentityScope | null, id: string) => {
		for (const [windowId, lease] of windows) {
			if (lease.scope.grant === scope?.grant && lease.scope.sessionId === scope?.sessionId && lease.bufferId === id)
				windows.delete(windowId)
		}
		if (activeRuntime === runtimes.get(key(id, scope))) activeRuntime = null
		runtimes.retire(key(id, scope))
	}
	const retire = (scope: OrgBufferIdentityScope | null, path: string): boolean => transition(() => {
		if (!matches(scope) || !canMutate()) return false
		const id = identity.lookup(scope, path)
		authorityGeneration += 1
		if (id) {
			parked.retire(scope, id)
			if (!matches(scope)) return false
			revokeRuntime(scope, id)
		}
		identity.retire(scope, path)
		// Keep lifetime tombstones: unopened→opened→retired must not revive an old absence review.
		baselineEpochs.set(path, (baselineEpochs.get(path) ?? 0) + 1)
		knownBaselines.delete(path)
		protectionEpochs.set(path, (protectionEpochs.get(path) ?? 0) + 1)
		const hadConflict = conflicts.delete(path)
		const wasPaused = autosavePaused.delete(path)
		if (hadConflict || wasPaused) protectionGeneration += 1
		transientDirty.delete(id ?? "")
		invalidBaselines.delete(path)
		changed()
		return true
	})
	const parkActive = (scope: OrgBufferIdentityScope | null): boolean => {
		if (!document) return true
		return Boolean(parked.park(scope, identity.ensure(scope, document.relativePath), {
			document,
			content: source,
			editGeneration,
			isDirty: source !== document.content,
		}))
	}
	const activateDocument = (
		scope: OrgBufferIdentityScope | null,
		next: OrgDocumentInterface,
		body: string,
		replaceUnknownHistory = false,
	): boolean => transition(() => {
		if (!matches(scope) || !scope || !canMutate()) return false
		if (!parkActive(scope) || !matches(scope)) return false
		const id = identity.lookup(scope, next.relativePath)
		if (id && replaceUnknownHistory) revokeRuntime(scope, id)
		if (id) parked.takeToActivate(scope, id)
		if (!matches(scope)) return false
		identity.ensure(scope, next.relativePath)
		activation += 1
		setDocument(next)
		installSource(body)
		return true
	})
	const runtimeIncarnation = (runtime: OrgBufferRuntime): string => {
		let incarnation = incarnations.get(runtime)
		if (!incarnation) {
			incarnation = crypto.randomUUID()
			incarnations.set(runtime, incarnation)
		}
		return incarnation
	}
	const clearLifetime = () => {
		const previousScope = currentScope()
		grant = null
		sessionId = null
		identityScope = null
		activation += 1
		activeRuntime = null
		document = null
		source = ""
		authorityGeneration += 1
		protectionGeneration += 1
		windows.clear()
		runtimes.close()
		if (!parked.clearScope(previousScope) && !parked.canMutate()) {
			// Unmount may occur inside receipt delivery. Revoke now, clear mirrors after delivery.
			queueMicrotask(() => parked.clearScope(previousScope))
		}
		identity.clearScope(previousScope)
		conflicts.clear()
		autosavePaused.clear()
		protectionEpochs.clear()
		baselineEpochs.clear()
		knownBaselines.clear()
		invalidBaselines.clear()
		transientDirty.clear()
		changed()
	}
	const acknowledgeWorkingCopy = (
		scope: OrgBufferIdentityScope | null,
		capture: OrgWorkspaceWorkingCopyAck,
	): OrgWorkspaceWorkingCopyAckResult => transition(() => {
		if (!scope || !matches(scope)) return { kind: "rejected", reason: "stale-scope" }
		if (!canMutate()) return { kind: "rejected", reason: "notification-in-progress" }
		const path = identity.findPath(scope, capture.bufferId)
		if (path === undefined) return { kind: "rejected", reason: "missing-buffer" }
		const reject = (reason: string): OrgWorkspaceWorkingCopyAckResult => {
			if (matches(scope) && identity.lookup(scope, path) === capture.bufferId)
				protect(scope, path, "conflict")
			return { kind: "rejected", reason }
		}
		if (path !== capture.expectedDocument.relativePath) return reject("buffer-path-drift")
		const active = document?.relativePath === path
		const previousCopy = active ? null : (parked.readById(scope, capture.bufferId) ?? null)
		const runtime = runtimes.get(key(capture.bufferId, scope))
		const workingSource = active ? source : (previousCopy?.content ?? "")
		if (runtime && (runtime.closed || runtime.source !== workingSource)) return reject("source-mirror-drift")
		const plan = planOrgWorkingCopyAck({
			expectedDocument: capture.expectedDocument,
			currentDocument: active ? document : previousCopy?.document,
			workingSource,
			capturedSource: capture.capturedSource,
			receipt: capture.receipt,
		})
		if (plan.kind === "rejected") return reject(plan.reason)
		baselineEpochs.set(path, (baselineEpochs.get(path) ?? 0) + 1)
		knownBaselines.set(path, plan.document)
		let currentCopy: OrgParkedWorkingCopy | null = null
		if (active) setDocument(plan.document)
		else if (previousCopy) {
			currentCopy = parked.installConfirmedBaseline(scope, capture.bufferId, previousCopy, plan) ?? null
			if (!currentCopy) return reject("parked-baseline-drift")
		} else return reject("missing-baseline")
		// A committed ACK remains accepted if an observer retires its lifetime.
		// Only the original live logical identity may clear its protection.
		if (matches(scope) && identity.lookup(scope, path) === capture.bufferId) {
			invalidBaselines.delete(path)
			reconcileProtection(scope, path, "all")
			changed()
		}
		return {
			kind: "ack",
			document: plan.document,
			isDirty: plan.isDirty,
			previousCopy,
			currentCopy,
		}
	})
	const captureFile = (scope: OrgBufferIdentityScope | null, path: string): OrgWorkspaceFileCapture | null => {
		const issued = currentScope()
		if (!issued || scope !== issued || !matches(issued) || !canMutate()) return null
		const bufferId = identity.lookup(issued, path)
		const runtime = bufferId ? runtimes.get(key(bufferId, issued)) : undefined
		const baseline = document?.relativePath === path ? document : parked.read(issued, path)?.document
		const capture = Object.freeze({
			scope: issued, relativePath: path, bufferId, runtime,
			source: runtime?.source, sourceGeneration: runtime?.revision,
			baseline: baseline ? Object.freeze({ ...baseline }) : undefined,
		})
		fileCaptures.add(capture)
		capturedBaselineEpochs.set(capture, baselineEpochs.get(path) ?? 0)
		capturedProtectionEpochs.set(capture, protectionEpochs.get(path) ?? 0)
		return capture
	}
	const fileCaptureIsCurrent = (capture: OrgWorkspaceFileCapture | null): boolean => {
		if (!capture || !fileCaptures.has(capture) || !matches(capture.scope) ||
			identity.lookup(capture.scope, capture.relativePath) !== capture.bufferId) return false
		const runtime = capture.bufferId ? runtimes.get(key(capture.bufferId, capture.scope)) : undefined
		const baseline = document?.relativePath === capture.relativePath
			? document : parked.read(capture.scope, capture.relativePath)?.document
		return runtime === capture.runtime && !runtime?.closed &&
			runtime?.source === capture.source && runtime?.revision === capture.sourceGeneration &&
			capturedBaselineEpochs.get(capture) === (baselineEpochs.get(capture.relativePath) ?? 0) &&
			(capture.baseline ? !guardOrgWorkingCopyBaseline(capture.baseline, baseline) : baseline === undefined)
	}
	const installConfirmedTarget = (
		scope: OrgBufferIdentityScope | null,
		target: OrgWorkspaceConfirmedTarget,
	): OrgWorkspaceConfirmedTargetResult => transition(() => {
		if (!scope || !matches(scope)) return { kind: "rejected", reason: "stale-scope" }
		if (!closeReady || !canMutate()) return { kind: "rejected", reason: "missing-authority" }
		const confirmed = target.document
		const path = confirmed.relativePath
		const id = identity.lookup(scope, path)
		const capture = target.capture
		if (!fileCaptures.has(capture) || capture.scope !== scope || capture.relativePath !== path)
			return { kind: "rejected", reason: "unissued-file-capture" }
		if (capture.bufferId !== undefined && id !== capture.bufferId)
			return { kind: "rejected", reason: "buffer-id-drift" }
		const active = document?.relativePath === path
		const copy = active ? undefined : parked.read(scope, path)
		// A confirmed unopened Capture target updates metadata in the adapter, not a body here.
		if (!active && !copy) {
			invalidBaselines.delete(path)
			reconcileProtection(scope, path, "all")
			return { kind: "installed", retainedWorkingCopy: false }
		}
		const runtime = id ? runtimes.get(key(id, scope)) : undefined
		if (!id || !runtime || runtime.closed)
			return { kind: "rejected", reason: "missing-runtime" }
		const baseline = active ? document : copy?.document
		if (capture.baseline && guardOrgWorkingCopyBaseline(capture.baseline, baseline))
			return { kind: "rejected", reason: "baseline-drift" }
		let retained = runtime !== capture.runtime || runtime.source !== capture.source ||
			runtime.revision !== capture.sourceGeneration || protectedPath(path) ||
			runtime.source !== (active ? source : copy?.content)
		if (!retained) {
			const installation = { scope, id, failed: false }
			confirmedInstallation = installation
			try {
				runtimes.install(key(id, scope), confirmed.content)
			} catch (failure) {
				installation.failed = true
				protect(scope, path, "conflict")
				report(failure instanceof Error ? failure.message : "Cannot install confirmed Org source")
			} finally {
				if (confirmedInstallation === installation) confirmedInstallation = null
			}
			retained = installation.failed || runtime.source !== confirmed.content
		}
		if (!matches(scope) || identity.lookup(scope, path) !== id || runtimes.get(key(id, scope)) !== runtime)
			return { kind: "rejected", reason: "retired-during-installation" }
		// The body/history is canonical, including a commit whose window projection failed.
		const working = runtime.source
		retained ||= working !== confirmed.content
		baselineEpochs.set(path, (baselineEpochs.get(path) ?? 0) + 1)
		knownBaselines.set(path, confirmed)
		if (document?.relativePath === path) {
			mirrorSource(working)
			setDocument(confirmed)
		} else {
			const current = parked.readById(scope, id)
			if (!current) return { kind: "rejected", reason: "missing-parked-copy" }
			if (!parked.installConfirmedBaseline(scope, id, current, {
				document: confirmed,
				content: working,
				isDirty: working !== confirmed.content,
			})) return { kind: "rejected", reason: "parked-baseline-drift" }
		}
		if (matches(scope) && identity.lookup(scope, path) === id) {
			invalidBaselines.delete(path)
			if (retained) protect(scope, path, "conflict")
			else reconcileProtection(scope, path, "all")
			changed()
		}
		return { kind: "installed", retainedWorkingCopy: retained }
	})
	const issueFileReview = (
		capture: OrgWorkspaceFileCapture,
		disk: OrgFileDiskState,
		permit: () => boolean,
	): OrgFileReview | null => {
		if (!closeReady || !fileCaptureIsCurrent(capture) || !permit() || disk.relativePath !== capture.relativePath ||
			capturedProtectionEpochs.get(capture) !== (protectionEpochs.get(capture.relativePath) ?? 0)) return null
		if (!("kind" in disk) && (!capture.bufferId || !capture.runtime || !capture.baseline ||
			typeof capture.source !== "string" || typeof disk.content !== "string" || !disk.revision)) return null
		const review: OrgFileReview = Object.freeze({
			id: crypto.randomUUID(), bufferId: capture.bufferId, relativePath: capture.relativePath,
			workingSource: capture.source, baselineRevision: capture.baseline?.revision,
			disk: Object.freeze({ ...disk }),
		})
		reviews.set(review, { capture, permit, protectionEpoch: protectionEpochs.get(capture.relativePath) ?? 0 })
		return review
	}
	const reviewIsCurrent = (review: OrgFileReview): boolean => {
		const issued = reviews.get(review)
		return !!issued && closeReady && issued.permit() && fileCaptureIsCurrent(issued.capture) &&
			issued.protectionEpoch === (protectionEpochs.get(review.relativePath) ?? 0)
	}
	const captureFileReviewCreation = (review: OrgFileReview, freshDisk: OrgFileDiskState) => {
		const issued = reviews.get(review)
		if (!issued || !reviewIsCurrent(review) || !("kind" in review.disk) || review.disk.kind !== "missing" ||
			!("kind" in freshDisk) || freshDisk.kind !== "missing" || freshDisk.relativePath !== review.relativePath) return null
		const { capture } = issued
		if (!capture.bufferId || !capture.runtime || !capture.baseline || capture.source === undefined) return null
		const { scope, relativePath, bufferId, runtime, baseline, source } = capture
		// Accepted create intent owns a real IO receipt, not a fabricated absent baseline.
		reviews.delete(review)
		const isCurrent = () => matches(scope) && closeReady && issued.permit() &&
			identity.lookup(scope, relativePath) === bufferId && runtimes.get(key(bufferId, scope)) === runtime && !runtime.closed &&
			issued.protectionEpoch === (protectionEpochs.get(relativePath) ?? 0) &&
			capturedBaselineEpochs.get(capture) === (baselineEpochs.get(relativePath) ?? 0)
		return {
			capture, isCurrent,
			acceptReceipt: (receipt: OrgDocumentWriteResultInterface): OrgFileReviewOutcome => {
				if (!isCurrent()) return { kind: "rejected", message: "The create owner changed; retained Source remains protected." }
				const ack = acknowledgeWorkingCopy(scope, { bufferId, expectedDocument: baseline, capturedSource: source, receipt })
				if (ack.kind !== "ack") return { kind: "rejected", message: "The creation receipt could not be reconciled. Source was retained." }
				const manualSaveRequired = runtime.source !== source
				// Creation does not silently resume autosave after an uncertain transfer.
				protect(scope, relativePath, "pause")
				return { kind: "accepted", manualSaveRequired }
			},
		}
	}
	const acceptFileReview = (
		review: OrgFileReview,
		choice: OrgFileReviewChoice,
		freshDisk: OrgFileDiskState,
		discardConsent: boolean,
	): OrgFileReviewOutcome => transition(() => {
		const reject = (message: string): OrgFileReviewOutcome => ({ kind: "rejected", message })
		const issued = reviews.get(review)
		if (!issued || !reviewIsCurrent(review)) return reject("The reviewed buffer or window changed; open a new review.")
		if ("kind" in review.disk) {
			if (!("kind" in freshDisk) || freshDisk.kind !== review.disk.kind || freshDisk.relativePath !== review.relativePath)
				return reject("Disk state changed after review; reread before choosing.")
			if (review.disk.kind === "unavailable")
				return reject("This path could not be safely read. Remove the obstruction or restore access, then open a new review. All Source and protections remain retained.")
			if (choice !== "acknowledge-missing") return reject("Missing retained Source requires an explicit create-CAS decision.")
			if (issued.capture.bufferId || issued.capture.runtime || issued.capture.baseline || issued.capture.source !== undefined)
				return reject("Absence cannot discard retained Source. Recreate it explicitly or restore the file and review again.")
			reviews.delete(review)
			reconcileProtection(issued.capture.scope, review.relativePath, "all")
			changed()
			return { kind: "accepted", manualSaveRequired: false }
		}
		if ("kind" in freshDisk || freshDisk.relativePath !== review.relativePath || freshDisk.revision !== review.disk.revision ||
			freshDisk.content !== review.disk.content)
			return reject("Disk Source changed after review; reread before choosing.")
		if (choice !== "adopt-disk" && choice !== "keep-working") return reject("Unknown reconciliation choice.")
		if (choice === "adopt-disk" && review.workingSource !== review.disk.content && !discardConsent)
			return reject("Adopting disk Source requires explicit consent to discard retained input and its history.")
		const { capture } = issued
		const { scope, relativePath: path, bufferId: id, runtime } = capture
		if (!id || !runtime) return reject("The reviewed runtime is unavailable.")
		// Consume before any canonical receipt/observer can reenter this decision.
		reviews.delete(review)
		let acceptedRuntime = runtime
		if (choice === "adopt-disk" && runtime.source !== review.disk.content) {
			// Explicit discard creates a fresh canonical/history incarnation. Mapping old
			// undo events through a full body installation would let undo resurrect the discard.
			revokeRuntime(scope, id)
			try {
				acceptedRuntime = runtimes.create(key(id, scope), review.disk.content, runtimePorts(scope))
			} catch (failure) {
				protect(scope, path, "conflict")
				report(failure instanceof Error ? failure.message : "Cannot adopt reviewed Source")
				return reject("Source adoption failed; the file remains protected.")
			}
		}
		if (!matches(scope) || identity.lookup(scope, path) !== id ||
			runtimes.get(key(id, scope)) !== acceptedRuntime || acceptedRuntime.closed)
			return reject("The reviewed buffer retired during adoption.")
		const working = acceptedRuntime.source
		// Canonical runtime owns Source/history; only IO receipt mirrors change below.
		if (document?.relativePath === path) {
			activeRuntime = acceptedRuntime
			mirrorSource(working)
			setDocument(review.disk)
		} else {
			const copy = parked.readById(scope, id)
			if (!copy || !parked.installConfirmedBaseline(scope, id, copy, {
				document: review.disk, content: working, isDirty: working !== review.disk.content,
			})) return reject("The retained baseline changed during adoption.")
		}
		if (!matches(scope) || identity.lookup(scope, path) !== id)
			return reject("The reviewed scope retired during adoption.")
		invalidBaselines.delete(path)
		baselineEpochs.set(path, (baselineEpochs.get(path) ?? 0) + 1)
		knownBaselines.set(path, review.disk)
		const manualSaveRequired = working !== review.disk.content
		reconcileProtection(scope, path, manualSaveRequired ? "conflict" : "all")
		// Keeping different Source acknowledges only a baseline, not permission to autosave.
		if (manualSaveRequired) protect(scope, path, "pause")
		changed()
		return { kind: "accepted", manualSaveRequired }
	})
	return {
		identity,
		runtimes,
		parked,
		getSnapshot: () => snapshot,
		subscribe(listener: () => void) {
			listeners.add(listener)
			return () => { listeners.delete(listener) }
		},
		get scope() { return identityScope },
		hasConflict: (path: string): boolean => conflicts.has(path),
		isAutosavePaused: (path: string): boolean => autosavePaused.has(path),
		get hasConflicts() { return conflicts.size > 0 },
		get hasAutosavePauses() { return autosavePaused.size > 0 },
		protect,
		reconcileProtection,
		acknowledgeWorkingCopy,
		captureFile,
		get protectedPaths(): readonly string[] { return [...new Set([...conflicts, ...autosavePaused])] },
		fileCaptureIsCurrent,
		installConfirmedTarget,
		issueFileReview,
		reviewIsCurrent,
		captureFileReviewCreation,
		acceptFileReview,
		cancelFileReview: (review: OrgFileReview) => { reviews.delete(review) },
		invalidateBaseline(scope: OrgBufferIdentityScope | null, path: string): boolean {
			if (!matches(scope) || !canMutate() || !identity.lookup(scope, path)) return false
			if (invalidBaselines.has(path)) return true
			invalidBaselines.add(path)
			baselineEpochs.set(path, (baselineEpochs.get(path) ?? 0) + 1)
			authorityGeneration += 1
			changed()
			return true
		},
		get activeRuntime() { return activeRuntime },
		get closeReady() { return closeReady },
		get grant() { return grant },
		get sessionId() { return sessionId },
		get activation() { return activation },
		get document() { return document },
		get source() { return source },
		get editGeneration() { return editGeneration },
		get transientGeneration() { return transientGeneration },
		matches,
		isCurrentActivation,
		isCurrentOrigin,
		dirtyPath,
		protectedPath,
		hasDirtyBuffers,
		get hasTransientDirty() { return transientDirty.size !== 0 },
		captureDiscardPermit(): () => boolean {
			const capturedGrant = grant
			const capturedRoot = grant?.rootPath
			const capturedToken = grant?.capabilityToken
			const capturedSession = sessionId
			const capturedActivation = activation
			const capturedEdit = editGeneration
			const capturedTransient = transientGeneration
			const capturedAuthority = authorityGeneration
			const capturedProtection = protectionGeneration
			const capturedDocument = document
			const baseline = document ? Object.freeze({ ...document }) : null
			const capturedSource = source
			const capturedParked = parked.getSnapshot()
			const capturedConflicts = [...conflicts]
			const capturedPaused = [...autosavePaused]
			const scope = currentScope()
			const paths = [
				...capturedParked.copies.map((copy) => copy.document.relativePath),
				...(document ? [document.relativePath] : []),
			]
			const canonical = paths.map((path) => {
				const id = identity.lookup(scope, path)
				const runtime = id ? runtimes.get(key(id, scope)) : undefined
				return { path, id, runtime, source: runtime?.source, revision: runtime?.revision }
			})
			return () =>
				mounted && closeReady && canMutate() &&
				grant === capturedGrant && grant?.rootPath === capturedRoot &&
				grant?.capabilityToken === capturedToken && sessionId === capturedSession &&
				activation === capturedActivation && editGeneration === capturedEdit &&
				transientGeneration === capturedTransient && authorityGeneration === capturedAuthority &&
				protectionGeneration === capturedProtection &&
				document === capturedDocument && source === capturedSource &&
				(!baseline || !guardOrgWorkingCopyBaseline(baseline, document)) &&
				parked.getSnapshot() === capturedParked &&
				conflicts.size === capturedConflicts.length && capturedConflicts.every((path) => conflicts.has(path)) &&
				autosavePaused.size === capturedPaused.length && capturedPaused.every((path) => autosavePaused.has(path)) &&
				canonical.every((capture) =>
					identity.lookup(scope, capture.path) === capture.id &&
					(capture.id ? runtimes.get(key(capture.id, scope)) : undefined) === capture.runtime &&
					(!capture.runtime || (!capture.runtime.closed &&
						capture.runtime.source === capture.source && capture.runtime.revision === capture.revision)),
				)
		},
		updateContent(origin: OrgWorkspaceSessionOrigin, next: string) {
			if (!isCurrentOrigin(origin) || !origin.path) return
			const effect = ports.effects.getFileSnapshot(origin.path)
			if (effect.loading || (effect.busy && !effect.saveInFlight)) return
			const scope = currentScope()
			const id = origin.path ? identity.lookup(scope, origin.path) : undefined
			const runtime = id ? runtimes.get(key(id, scope)) : undefined
			if (!runtime || next === runtime.source) return
			try {
				runtimes.updateSource(runtime.key, source, next, () => isCurrentOrigin(origin))
			} catch (failure) {
				report(failure instanceof Error ? failure.message : "Cannot update Org source")
			}
		},
		setCloseReady(ready: boolean) {
			if (closeReady === ready) return
			closeReady = ready
			changed()
		},
		mount(): boolean {
			if (mounted || !canMutate()) return false
			mounted = true
			// StrictMode replay publishes the revoked epoch, never old callbacks.
			changed()
			return true
		},
		activateDocument,
		key,
		runtimeIncarnation,
		snapshotLiveBuffers(scope: OrgBufferIdentityScope | null) {
			const buffers: {
				bufferId: string
				document: OrgDocumentInterface
				content: string
				runtime: OrgBufferRuntime
				isDirty: boolean
				runtimeIncarnation: string
				sourceGeneration: number
			}[] = []
			if (!matches(scope)) return buffers
			for (const copy of parked.list(scope)) {
				// Parking publishes before activation changes; the active projection
				// remains authoritative until handoff finishes, not its new mirror.
				if (copy.document.relativePath === document?.relativePath) continue
				const runtime = runtimes.get(key(copy.bufferId, scope))
				if (!runtime || runtime.closed) continue
				buffers.push({
					bufferId: copy.bufferId,
					document: copy.document,
					content: copy.content,
					runtime,
					isDirty: dirtyPath(copy.document.relativePath),
					runtimeIncarnation: runtimeIncarnation(runtime),
					sourceGeneration: runtime.revision,
				})
			}
			const id = document ? identity.lookup(scope, document.relativePath) : undefined
			const runtime = id ? runtimes.get(key(id, scope)) : undefined
			if (document && id && runtime && !runtime.closed) {
				buffers.push({
					bufferId: id,
					document,
					content: source,
					runtime,
					isDirty: dirtyPath(document.relativePath),
					runtimeIncarnation: runtimeIncarnation(runtime),
					sourceGeneration: runtime.revision,
				})
			}
			return buffers
		},
		retire,
		closeActiveDocument(scope: OrgBufferIdentityScope | null): boolean { return transition(() => {
			if (!matches(scope) || !canMutate()) return false
			if (document && !retire(scope, document.relativePath)) return false
			activation += 1
			setDocument(null)
			installSource("")
			return true
		}) },
		/** The filesystem move is confirmed; source/history and source identity survive. */
		moveApproved(scope: OrgBufferIdentityScope | null, from: string, to: string, id: string): boolean { return transition(() => {
			if (!matches(scope) || !canMutate() || identity.lookup(scope, from) !== id) return false
			if (from !== to && !retire(scope, to)) return false
			if (!identity.moveApproved(scope, from, to, id)) return false
			const wasPaused = autosavePaused.delete(from)
			const hadConflict = conflicts.delete(from)
			const wasInvalid = invalidBaselines.delete(from)
			if (wasInvalid) invalidBaselines.add(to)
			if (wasPaused) autosavePaused.add(to)
			if (hadConflict) conflicts.add(to)
			if (from !== to && (wasPaused || hadConflict)) protectionGeneration += 1
			activation += 1
			if (document?.relativePath === from) setDocument({ ...document, relativePath: to })
			changed()
			return true
		}) },
		parkCommandSource(
			scope: OrgBufferIdentityScope | null,
			path: string,
			baseline: OrgDocumentInterface,
			body: string,
		): string | undefined {
			if (!scope || !matches(scope) || !closeReady || !canMutate() ||
				document?.relativePath === path || parked.read(scope, path) ||
				baseline.relativePath !== path || baseline.content !== body) return undefined
			const id = identity.ensure(scope, path)
			return parked.park(scope, id, {
				document: baseline,
				content: body,
				editGeneration: 0,
				isDirty: false,
			}) ? id : undefined
		},
		createParkedRuntime(scope: OrgBufferIdentityScope | null, id: string, body: string) {
			const copy = parked.readById(scope, id)
			const existing = runtimes.get(key(id, scope))
			if (!scope || !matches(scope) || !closeReady || !canMutate() ||
				!copy || copy.content !== body || (existing && (existing.closed || existing.source !== body)))
				throw new Error("The parked command buffer is no longer current")
			runtimes.create(key(id, scope), body, runtimePorts(scope))
		},
		setTransientDirty(scope: OrgBufferIdentityScope | null, id: string, dirty: boolean): boolean {
			if (!matches(scope) || !canMutate()) return false
			if (transientDirty.has(id) === dirty) return true
			transientGeneration += 1
			if (dirty) transientDirty.add(id)
			else transientDirty.delete(id)
			changed()
			return true
		},
		registerWindow(scope: OrgBufferIdentityScope | null, windowId: string, bufferId: string): () => void {
			if (!windowId || !scope || !matches(scope) || !canMutate()) return () => undefined
			const path = identity.findPath(scope, bufferId)
			const runtime = runtimes.get(key(bufferId, scope))
			if (!path || !runtime || runtime.closed || (document?.relativePath !== path && !parked.read(scope, path)))
				return () => undefined
			const lease = { scope, bufferId, runtime }
			windows.set(windowId, lease)
			return () => {
				if (windows.get(windowId) === lease) windows.delete(windowId)
			}
		},
		captureReviewWindowPermit(scope: OrgBufferIdentityScope | null, windowId: string, bufferId: string): () => boolean {
			const lease = windows.get(windowId)
			const path = identity.findPath(scope, bufferId)
			return () => !!lease && lease.bufferId === bufferId && lease.scope === scope &&
				matches(scope) && windows.get(windowId) === lease &&
				runtimes.get(key(bufferId, scope)) === lease.runtime && !lease.runtime.closed &&
				!!path && identity.findPath(scope, bufferId) === path && canMutate()
		},
		captureWindowPermit(scope: OrgBufferIdentityScope | null, windowId: string, bufferId: string): () => boolean {
			const lease = windows.get(windowId)
			const path = identity.findPath(scope, bufferId)
			return () => !!lease && lease.bufferId === bufferId && lease.scope.grant === scope?.grant &&
				lease.scope.sessionId === scope?.sessionId && matches(scope) && windows.get(windowId) === lease &&
				runtimes.get(key(bufferId, scope)) === lease.runtime && !lease.runtime.closed && !!path &&
				identity.findPath(scope, bufferId) === path && !conflicts.has(path) && !autosavePaused.has(path) &&
				canMutate()
		},
		activateOpenBuffer(scope: OrgBufferIdentityScope | null, bufferId: string): boolean { return transition(() => {
			if (!scope || !matches(scope) || !closeReady || !canMutate() ||
				ports.effects.getSnapshot().globalBusy || ports.effects.getSnapshot().globalLoading) return false
			const path = identity.findPath(scope, bufferId)
			if (!path) return false
			if (document?.relativePath === path) return true
			const copy = parked.read(scope, path)
			const runtime = runtimes.get(key(bufferId, scope))
			if (!copy || !runtime || runtime.closed || runtime.source !== copy.content) return false
			if (!parkActive(scope) || !matches(scope)) return false
			parked.takeToActivate(scope, bufferId)
			if (!matches(scope)) return false
			activation += 1
			setDocument(copy.document)
			mirrorSource(copy.content)
			activeRuntime = runtime
			changed()
			return true
		}) },
		activateGrant(next: OrgWorkspaceInterface): boolean { return transition(() => {
			if (!mounted || !canMutate()) return false
			const previousGrant = grant
			clearLifetime()
			if (previousGrant?.capabilityToken &&
				(previousGrant.rootPath !== next.rootPath || previousGrant.capabilityToken !== next.capabilityToken))
				void ports.releaseGrant(previousGrant).catch(() => undefined)
			// Receipt delivery can unmount the owner while retiring the previous scope.
			if (!mounted) return false
			grant = next
			sessionId = next.capabilityToken ?? null
			identityScope = sessionId ? Object.freeze({ grant: next, sessionId }) : null
			if (identityScope) {
				identity.openScope(identityScope)
				parked.openScope(identityScope)
			}
			setDocument(null)
			installSource("")
			return true
		}) },
		async releaseUnusedGrant(unused: OrgWorkspaceInterface | null) {
			if (unused?.capabilityToken && unused !== grant &&
				(unused.rootPath !== grant?.rootPath || unused.capabilityToken !== grant?.capabilityToken))
				await ports.releaseGrant(unused)
		},
		dispose() { transition(() => {
			mounted = false
			closeReady = false
			const previousGrant = grant
			clearLifetime()
			changed()
			if (previousGrant?.capabilityToken) void ports.releaseGrant(previousGrant).catch(() => undefined)
		}) },
	}
}
