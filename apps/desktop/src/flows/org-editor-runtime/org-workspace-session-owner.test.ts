import { describe, expect, it, vi } from "vitest"
import { createOrgWorkspaceEffectOwner } from "./org-workspace-effect-owner"
import { createOrgWorkspaceSessionOwner, type OrgWorkspaceSessionWindowAuthority } from "./org-workspace-session-owner"
import { EditorView } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { undoDepth } from "@codemirror/commands"
import type { OrgBufferIdentityScope } from "./org-buffer-identity-registry"
import type { OrgBufferWindowHandle } from "./org-buffer-runtime.types"

const setup = (emitError = vi.fn<(message: string) => void>()) => {
	const effects = createOrgWorkspaceEffectOwner({ emitError })
	const owner = createOrgWorkspaceSessionOwner({
		effects,
		emitError,
		releaseGrant: vi.fn(async () => undefined),
	})
	const grant = { rootPath: "/isolated", capabilityToken: "G1", documents: [], directories: [] }
	const document = { relativePath: "a.org", content: "baseline A", revision: "a-1" }
	owner.setCloseReady(true)
	owner.activateGrant(grant)
	const scope = owner.scope!
	owner.activateDocument(scope, document, document.content)
	const origin = { grant, sessionId: "G1", activation: owner.activation, path: document.relativePath }
	return { owner, effects, emitError, grant, document, scope, origin }
}

const attachSource = (
	owner: OrgWorkspaceSessionWindowAuthority,
	scope: OrgBufferIdentityScope,
	bufferId: string,
	windowId: string,
) => {
	const runtime = owner.runtimes.get(owner.key(bufferId, scope))!
	const release = owner.registerWindow(scope, windowId, bufferId)
	let handle!: OrgBufferWindowHandle
	const view = new EditorView({
		state: EditorState.create({ doc: runtime.state.doc, extensions: runtime.historyFreeSourceExtensions }),
		dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
	})
	handle = runtime.attachWindow({ windowId, view })
	return {
		runtime,
		view,
		handle,
		dispose() {
			release()
			handle.detach()
			view.destroy()
		},
	}
}

describe("live workspace discard permits", () => {
	it("observes source without writing or replacing its canonical history/baseline", () => {
		const { owner, scope, origin, document } = setup()
		owner.updateContent(origin, "dirty A")
		const runtime = owner.snapshotLiveBuffers(scope)[0].runtime
		const revision = runtime.revision
		const state = runtime.state
		const permit = owner.captureDiscardPermit()
		expect(permit()).toBe(true)
		expect(runtime.state).toBe(state)
		expect(runtime.revision).toBe(revision)
		expect(document.content).toBe("baseline A")
		owner.dispose()
	})

	it.each(["active-aba", "transient-aba", "baseline", "incarnation", "retire", "grant", "activation", "conflict", "paused"] as const)(
		"revokes a captured decision after %s without replacing source",
		(mutation) => {
			const { owner, scope, origin, grant, document } = setup()
			owner.updateContent(origin, "dirty A")
			const permit = owner.captureDiscardPermit()
			if (mutation === "active-aba") {
				owner.updateContent(origin, "temporary A")
				owner.updateContent(origin, "dirty A")
			} else if (mutation === "transient-aba") {
				owner.setTransientDirty(scope, "draft", true)
				owner.setTransientDirty(scope, "draft", false)
			} else if (mutation === "baseline") document.revision = "changed-revision"
			else if (mutation === "incarnation") {
				owner.retire(scope, document.relativePath)
				owner.activateDocument(scope, document, "dirty A")
			} else if (mutation === "retire") {
				owner.dispose()
				owner.mount()
			} else if (mutation === "grant") owner.activateGrant({ ...grant })
			else if (mutation === "activation") {
				owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
				owner.activateOpenBuffer(scope, owner.identity.lookup(scope, document.relativePath)!)
			} else if (mutation === "conflict") owner.protect(scope, document.relativePath, "conflict")
			else owner.protect(scope, document.relativePath, "pause")
			expect(permit()).toBe(false)
			owner.dispose()
		},
	)

	it("rejects same-body parked ABA while the active body and activation remain unchanged", () => {
		const { owner, scope, origin } = setup()
		owner.updateContent(origin, "dirty A")
		owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
		const active = owner.document
		const activation = owner.activation
		const parked = owner.snapshotLiveBuffers(scope).find((buffer) => buffer.document.relativePath === "a.org")!
		const release = owner.registerWindow(scope, "parked-discard", parked.bufferId)
		let handle!: OrgBufferWindowHandle
		const view = new EditorView({
			state: EditorState.create({ doc: parked.runtime.state.doc, extensions: parked.runtime.historyFreeSourceExtensions }),
			dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
		})
		handle = parked.runtime.attachWindow({ windowId: "parked-discard", view })
		const permit = owner.captureDiscardPermit()
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "temporary A" } })
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "dirty A" } })
		expect(owner.document).toBe(active)
		expect(owner.activation).toBe(activation)
		expect(owner.source).toBe("B")
		expect(parked.runtime.source).toBe("dirty A")
		expect(permit()).toBe(false)
		release()
		handle.detach()
		view.destroy()
		owner.dispose()
	})

	it("rejects retirement and recreation of an identical parked body", () => {
		const { owner, scope, document } = setup()
		owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
		const original = owner.snapshotLiveBuffers(scope).find((buffer) => buffer.document.relativePath === "a.org")!
		const permit = owner.captureDiscardPermit()
		owner.retire(scope, "a.org")
		const id = owner.parkCommandSource(scope, "a.org", document, document.content)!
		owner.createParkedRuntime(scope, id, document.content)
		const replacement = owner.snapshotLiveBuffers(scope).find((buffer) => buffer.document.relativePath === "a.org")!
		expect(replacement.content).toBe(original.content)
		expect(replacement.runtime).not.toBe(original.runtime)
		expect(permit()).toBe(false)
		owner.dispose()
	})
})

describe("workspace session snapshots and scoped protection", () => {
	it("keeps snapshots stable and mirrors the canonical receipt before every observer", () => {
		const { owner, scope, document, emitError } = setup(vi.fn(() => { throw new Error("error observer") }))
		const initial = owner.getSnapshot()
		expect(owner.getSnapshot()).toBe(initial)
		expect(Object.isFrozen(initial)).toBe(true)
		expect(initial.document).toBe(document)
		expect(Object.isFrozen(document)).toBe(false)
		const window = attachSource(owner, scope, owner.identity.lookup(scope, "a.org")!, "snapshot-source")
		owner.subscribe(() => { throw new Error("snapshot observer") })
		const seen: string[] = []
		owner.subscribe(() => {
			expect(owner.getSnapshot().source).toBe(window.runtime.source)
			expect(owner.source).toBe(window.runtime.source)
			seen.push(owner.getSnapshot().source)
		})
		window.view.dispatch({ changes: { from: 0, to: window.view.state.doc.length, insert: "typed A" } })
		expect(seen).toEqual(["typed A"])
		expect(owner.getSnapshot().isDirty).toBe(true)
		expect(initial.source).toBe("baseline A")
		expect(owner.getSnapshot()).toBe(owner.getSnapshot())
		expect(emitError).toHaveBeenCalledWith("Session observer failure: listener")
		expect(window.handle.undo()).toBe(true)
		expect(owner.source).toBe("baseline A")
		window.dispose()
		owner.dispose()
	})

	it("invalidates the session snapshot for parked receipts and transient/protection ABA", () => {
		const { owner, scope } = setup()
		owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
		const window = attachSource(owner, scope, owner.identity.lookup(scope, "a.org")!, "parked-snapshot")
		const initial = owner.getSnapshot()
		window.view.dispatch({ changes: { from: 0, to: window.view.state.doc.length, insert: "parked input" } })
		expect(owner.getSnapshot()).not.toBe(initial)
		expect(owner.getSnapshot().source).toBe("B")
		const permit = owner.captureDiscardPermit()
		expect(owner.protect(scope, "uncertain.org", "pause")).toBe(true)
		expect(owner.identity.lookup(scope, "uncertain.org")).toBeUndefined()
		expect(owner.parked.read(scope, "uncertain.org")).toBeUndefined()
		expect(owner.hasConflicts).toBe(false)
		expect(owner.hasAutosavePauses).toBe(true)
		expect(owner.reconcileProtection(scope, "uncertain.org", "all")).toBe(true)
		expect(permit()).toBe(false)
		const protectedSnapshot = owner.getSnapshot()
		owner.setTransientDirty(scope, "draft", true)
		owner.setTransientDirty(scope, "draft", false)
		expect(owner.getSnapshot()).not.toBe(protectedSnapshot)
		window.dispose()
		owner.dispose()
	})

	it("fences reconstructed and retired scopes even when grant and token are reused", () => {
		const { owner, grant, scope, document } = setup()
		expect(owner.protect({ grant, sessionId: "G1" }, "a.org", "conflict")).toBe(false)
		owner.protect(scope, "a.org", "conflict")
		owner.activateGrant(grant)
		const nextScope = owner.scope!
		expect(nextScope).not.toBe(scope)
		owner.activateDocument(nextScope, document, document.content)
		owner.protect(nextScope, "a.org", "conflict")
		expect(owner.reconcileProtection(scope, "a.org", "all")).toBe(false)
		expect(owner.hasConflict("a.org")).toBe(true)
		expect(owner.protect(scope, "uncertain.org", "pause")).toBe(false)
		expect(owner.reconcileProtection(nextScope, "a.org", "conflict")).toBe(true)
		expect(owner.hasConflict("a.org")).toBe(false)
		expect(owner.isAutosavePaused("a.org")).toBe(true)
		expect(owner.getSnapshot().isDirty).toBe(false)
		owner.dispose()
	})

	it("moves protection and missing-disk authority without changing source or history", () => {
		const { owner, scope, document } = setup()
		const live = owner.snapshotLiveBuffers(scope)[0]
		const state = live.runtime.state
		owner.protect(scope, "a.org", "conflict")
		owner.invalidateBaseline(scope, "a.org")
		expect(owner.getSnapshot().isDirty).toBe(true)
		expect(owner.snapshotLiveBuffers(scope)[0].isDirty).toBe(true)
		expect(owner.moveApproved(scope, "a.org", "renamed.org", live.bufferId)).toBe(true)
		expect(owner.hasConflict("a.org")).toBe(false)
		expect(owner.hasConflict("renamed.org")).toBe(true)
		expect(owner.dirtyPath("renamed.org")).toBe(true)
		expect(live.runtime.state).toBe(state)
		expect(owner.source).toBe(document.content)
		owner.retire(scope, "renamed.org")
		expect(owner.hasConflicts).toBe(false)
		expect(owner.hasAutosavePauses).toBe(false)
		expect(owner.dirtyPath("renamed.org")).toBe(false)
		owner.dispose()
	})

	it("revokes the session snapshot without disposing the separate effect lifetime", () => {
		const { owner, effects } = setup()
		const claim = effects.begin({ label: "save", kind: "save" })
		owner.dispose()
		expect(effects.owns(claim)).toBe(true)
		expect(owner.getSnapshot()).toMatchObject({
			grant: null, scope: null, sessionId: null, document: null, source: "",
			activeRuntime: null, isDirty: false, closeReady: false,
		})
		expect(owner.mount()).toBe(true)
		expect(owner.getSnapshot().scope).toBeNull()
		effects.dispose()
	})
})

describe("workspace working-copy acknowledgement", () => {
	it("advances captured disk authority while retaining newer active input and canonical undo", () => {
		const { owner, scope, document } = setup()
		const bufferId = owner.identity.lookup(scope, "a.org")!
		const window = attachSource(owner, scope, bufferId, "active-ack")
		window.view.dispatch({ changes: { from: 0, to: window.view.state.doc.length, insert: "captured input" } })
		const capturedSource = owner.source
		window.view.dispatch({ changes: { from: 0, to: window.view.state.doc.length, insert: "newer input" } })
		const state = window.runtime.state
		const depth = undoDepth(state)
		owner.protect(scope, "a.org", "conflict")
		const ack = owner.acknowledgeWorkingCopy(scope, {
			bufferId, expectedDocument: document, capturedSource,
			receipt: { relativePath: "a.org", revision: "a-2" },
		})
		expect(ack).toMatchObject({
			kind: "ack", isDirty: true, previousCopy: null, currentCopy: null,
			document: { content: "captured input", revision: "a-2" },
		})
		expect(owner.source).toBe("newer input")
		expect(window.runtime.state).toBe(state)
		expect(undoDepth(window.runtime.state)).toBe(depth)
		expect(owner.hasConflicts).toBe(false)
		expect(owner.hasAutosavePauses).toBe(false)
		expect(window.handle.undo()).toBe(true)
		expect(owner.source).not.toBe("newer input")
		window.dispose()
		owner.dispose()
	})

	it("returns the exact parked ACK mirror without overwriting newer parked input/history", () => {
		const { owner, scope, document } = setup()
		const bufferId = owner.identity.lookup(scope, "a.org")!
		owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
		const window = attachSource(owner, scope, bufferId, "parked-ack")
		window.view.dispatch({ changes: { from: 0, to: window.view.state.doc.length, insert: "newer parked input" } })
		const previousCopy = owner.parked.read(scope, "a.org")!
		const state = window.runtime.state
		owner.protect(scope, "a.org", "conflict")
		const result = owner.acknowledgeWorkingCopy(scope, {
			bufferId, expectedDocument: document, capturedSource: "captured parked input",
			receipt: { relativePath: "a.org", revision: "a-2" },
		})
		expect(result.kind).toBe("ack")
		if (result.kind !== "ack") throw new Error(result.reason)
		expect(result.previousCopy).toBe(previousCopy)
		expect(result.currentCopy).toBe(owner.parked.read(scope, "a.org"))
		expect(result.currentCopy?.content).toBe("newer parked input")
		expect(result.currentCopy?.document.content).toBe("captured parked input")
		expect(result.isDirty).toBe(true)
		expect(window.runtime.state).toBe(state)
		expect(owner.source).toBe("B")
		expect(owner.hasConflicts).toBe(false)
		window.dispose()
		owner.dispose()
	})

	it("protects baseline drift but cannot protect a retired logical ID's replacement", () => {
		const { owner, scope, document } = setup()
		const bufferId = owner.identity.lookup(scope, "a.org")!
		owner.installConfirmedTarget(scope, {
			document: { ...document, revision: "external" }, capture: owner.captureFile(scope, "a.org")!,
		})
		expect(owner.acknowledgeWorkingCopy(scope, {
			bufferId, expectedDocument: document, capturedSource: "saved",
			receipt: { relativePath: "a.org", revision: "a-2" },
		})).toEqual({ kind: "rejected", reason: "revision-drift" })
		expect(owner.hasConflict("a.org")).toBe(true)
		owner.retire(scope, "a.org")
		owner.activateDocument(scope, document, document.content)
		const replacement = owner.identity.lookup(scope, "a.org")!
		expect(replacement).not.toBe(bufferId)
		expect(owner.acknowledgeWorkingCopy(scope, {
			bufferId, expectedDocument: document, capturedSource: "saved",
			receipt: { relativePath: "a.org", revision: "a-2" },
		})).toEqual({ kind: "rejected", reason: "missing-buffer" })
		expect(owner.hasConflict("a.org")).toBe(false)
		owner.dispose()
	})

	it("retains an accepted parked ACK after observer retirement and isolates observer errors", () => {
		const { owner, scope, document } = setup()
		const bufferId = owner.identity.lookup(scope, "a.org")!
		owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
		const before = owner.parked.read(scope, "a.org")!
		let delivered = false
		owner.parked.subscribe(() => { throw new Error("bad parked observer") })
		owner.parked.subscribe(() => {
			delivered = true
			expect(owner.retire(scope, "a.org")).toBe(false)
			owner.dispose()
		})
		const result = owner.acknowledgeWorkingCopy(scope, {
			bufferId, expectedDocument: document, capturedSource: document.content,
			receipt: { relativePath: "a.org", revision: "a-2" },
		})
		expect(result.kind).toBe("ack")
		if (result.kind !== "ack") throw new Error(result.reason)
		expect(result.previousCopy).toBe(before)
		expect(result.currentCopy?.document.revision).toBe("a-2")
		expect(delivered).toBe(true)
		expect(owner.getSnapshot().scope).toBeNull()
	})
})

describe("confirmed target installation", () => {
	it.each(["active", "parked"] as const)("installs a clean %s target only through canonical runtime authority", (kind) => {
		const { owner, scope, document } = setup()
		const bufferId = owner.identity.lookup(scope, "a.org")!
		if (kind === "parked")
			owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
		const capture = owner.captureFile(scope, "a.org")!
		const runtime = owner.runtimes.get(owner.key(bufferId, scope))!
		const confirmed = { ...document, content: "confirmed A", revision: "a-2" }
		expect(owner.installConfirmedTarget(scope, {
			document: confirmed, capture,
		})).toEqual({ kind: "installed", retainedWorkingCopy: false })
		expect(runtime.source).toBe("confirmed A")
		expect(owner.dirtyPath("a.org")).toBe(false)
		if (kind === "active") {
			expect(owner.document).toBe(confirmed)
			expect(owner.getSnapshot().source).toBe(runtime.source)
		} else {
			expect(owner.parked.read(scope, "a.org")?.document).toEqual(confirmed)
			expect(owner.parked.read(scope, "a.org")?.content).toBe(runtime.source)
			expect(owner.source).toBe("B")
		}
		expect(() => runtime.applyControllerSource(runtime.source, "unauthorized")).toThrow()
		expect(runtime.source).toBe("confirmed A")
		owner.dispose()
	})

	it.each(["active", "parked"] as const)("retains %s same-body source ABA/history and protects the accepted disk baseline", (kind) => {
		const { owner, scope, document } = setup()
		const bufferId = owner.identity.lookup(scope, "a.org")!
		if (kind === "parked")
			owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
		const target = {
			document: { ...document, content: "confirmed A", revision: "a-2" },
			capture: owner.captureFile(scope, "a.org")!,
		}
		const window = attachSource(owner, scope, bufferId, `${kind}-confirmed-aba`)
		window.view.dispatch({ changes: { from: 0, to: window.view.state.doc.length, insert: "temporary A" } })
		window.view.dispatch({ changes: { from: 0, to: window.view.state.doc.length, insert: document.content } })
		const state = window.runtime.state
		expect(owner.installConfirmedTarget(scope, target)).toEqual({ kind: "installed", retainedWorkingCopy: true })
		expect(window.runtime.state).toBe(state)
		expect(window.runtime.source).toBe(document.content)
		expect(owner.hasConflict("a.org")).toBe(true)
		expect(owner.isAutosavePaused("a.org")).toBe(true)
		expect(owner.dirtyPath("a.org")).toBe(true)
		window.dispose()
		owner.dispose()
	})

	it("does not allocate an unopened target and rejects a captured retired parked identity", () => {
		const { owner, scope, document } = setup()
		const confirmed = { relativePath: "unopened.org", content: "confirmed", revision: "u-1" }
		expect(owner.installConfirmedTarget(scope, {
			document: confirmed, capture: owner.captureFile(scope, "unopened.org")!,
		})).toEqual({ kind: "installed", retainedWorkingCopy: false })
		expect(owner.identity.lookup(scope, "unopened.org")).toBeUndefined()
		expect(owner.parked.read(scope, "unopened.org")).toBeUndefined()
		owner.activateDocument(scope, { relativePath: "b.org", content: "B", revision: "b-1" }, "B")
		const capture = owner.captureFile(scope, "a.org")!
		owner.retire(scope, "a.org")
		const replacement = owner.parkCommandSource(scope, "a.org", document, document.content)!
		owner.createParkedRuntime(scope, replacement, document.content)
		expect(owner.installConfirmedTarget(scope, {
			document: { ...document, content: "confirmed A", revision: "a-2" },
			capture,
		})).toEqual({ kind: "rejected", reason: "buffer-id-drift" })
		expect(owner.parked.read(scope, "a.org")?.content).toBe(document.content)
		expect(owner.hasConflict("a.org")).toBe(false)
		owner.dispose()
	})

	it("advances the confirmed baseline but retains/protects source after installation preflight failure", () => {
		const { owner, scope, document } = setup()
		const runtime = owner.snapshotLiveBuffers(scope)[0].runtime
		const state = runtime.state
		vi.spyOn(runtime, "applyControllerSource").mockImplementationOnce(() => { throw new Error("projection preflight") })
		expect(owner.installConfirmedTarget(scope, {
			document: { ...document, content: "confirmed A", revision: "a-2" }, capture: owner.captureFile(scope, "a.org")!,
		})).toEqual({ kind: "installed", retainedWorkingCopy: true })
		expect(runtime.state).toBe(state)
		expect(owner.document?.revision).toBe("a-2")
		expect(owner.hasConflict("a.org")).toBe(true)
		expect(owner.isAutosavePaused("a.org")).toBe(true)
		owner.dispose()
	})

	it("protects a committed confirmed body before a failing projection is reported", () => {
		const { owner, scope, document, emitError } = setup()
		const window = attachSource(owner, scope, owner.identity.lookup(scope, "a.org")!, "failed-projection")
		let protectedAtReport = false
		emitError.mockImplementation(() => {
			protectedAtReport = owner.hasConflict("a.org") && owner.isAutosavePaused("a.org")
			throw new Error("failing error observer")
		})
		vi.spyOn(window.view, "update").mockImplementationOnce(() => { throw new Error("failed projection") })
		expect(owner.installConfirmedTarget(scope, {
			document: { ...document, content: "confirmed A", revision: "a-2" }, capture: owner.captureFile(scope, "a.org")!,
		})).toEqual({ kind: "installed", retainedWorkingCopy: true })
		expect(window.runtime.source).toBe("confirmed A")
		expect(owner.source).toBe("confirmed A")
		expect(owner.document?.revision).toBe("a-2")
		expect(protectedAtReport).toBe(true)
		expect(owner.hasConflict("a.org")).toBe(true)
		expect(owner.getSnapshot().isDirty).toBe(false)
		window.dispose()
		owner.dispose()
	})

	it("rejects confirmed installation captured before an identical active runtime was retired", () => {
		const { owner, scope, document } = setup()
		const target = {
			document: { ...document, content: "confirmed A", revision: "a-2" }, capture: owner.captureFile(scope, "a.org")!,
		}
		owner.retire(scope, "a.org")
		owner.activateDocument(scope, document, document.content)
		const replacement = owner.snapshotLiveBuffers(scope)[0].runtime
		expect(owner.installConfirmedTarget(scope, target).kind).toBe("rejected")
		expect(replacement.source).toBe(document.content)
		expect(owner.document).toBe(document)
		expect(owner.hasConflict("a.org")).toBe(false)
		owner.dispose()
	})

	it("clears confirmed-missing disk dirtiness on a successful ACK without writing source", () => {
		const { owner, scope, document } = setup()
		const live = owner.snapshotLiveBuffers(scope)[0]
		const state = live.runtime.state
		owner.invalidateBaseline(scope, "a.org")
		const ack = owner.acknowledgeWorkingCopy(scope, {
			bufferId: live.bufferId, expectedDocument: document, capturedSource: document.content,
			receipt: { relativePath: "a.org", revision: "a-2" },
		})
		expect(ack.kind).toBe("ack")
		expect(owner.getSnapshot().isDirty).toBe(false)
		expect(owner.hasDirtyBuffers()).toBe(false)
		expect(live.runtime.state).toBe(state)
		owner.dispose()
	})
})

describe("explicit per-file Source reconciliation", () => {
	it("cancels a clean protected review without changing body, baseline, history or either protection", () => {
		const { owner, scope, document } = setup()
		owner.protect(scope, "a.org", "conflict")
		owner.protect(scope, "b.org", "conflict")
		const live = owner.snapshotLiveBuffers(scope)[0]
		const state = live.runtime.state
		const release = owner.registerWindow(scope, "review", live.bufferId)
		const review = owner.issueFileReview(owner.captureFile(scope, "a.org")!,
			{ ...document, content: "disk copied target\0\r\n", revision: "disk-2" },
			owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
		expect(review.workingSource).toBe(document.content)
		expect(review.disk.content).toBe("disk copied target\0\r\n")
		owner.cancelFileReview(review)
		expect(owner.acceptFileReview(review, "adopt-disk", review.disk, true).kind).toBe("rejected")
		expect(owner.document).toBe(document)
		expect(owner.source).toBe(document.content)
		expect(live.runtime.state).toBe(state)
		expect(owner.hasConflict("a.org")).toBe(true)
		expect(owner.hasConflict("b.org")).toBe(true)
		release()
		owner.dispose()
	})

	it("acknowledges only one clean path without resetting canonical history", () => {
		const { owner, scope, document, origin } = setup()
		owner.updateContent(origin, "temporary")
		owner.updateContent(origin, document.content)
		owner.protect(scope, "a.org", "conflict")
		owner.protect(scope, "b.org", "conflict")
		const live = owner.snapshotLiveBuffers(scope)[0]
		const state = live.runtime.state
		const release = owner.registerWindow(scope, "review", live.bufferId)
		const review = owner.issueFileReview(owner.captureFile(scope, "a.org")!, document,
			owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
		expect(owner.acceptFileReview(review, "adopt-disk", document, false)).toEqual({ kind: "accepted", manualSaveRequired: false })
		expect(live.runtime.state).toBe(state)
		expect(owner.hasConflict("a.org")).toBe(false)
		expect(owner.isAutosavePaused("a.org")).toBe(false)
		expect(owner.hasConflict("b.org")).toBe(true)
		expect(owner.isAutosavePaused("b.org")).toBe(true)
		release()
		owner.dispose()
	})

	it("keeps raw working bytes, adopts only the reviewed CAS baseline and requires explicit save", () => {
		const { owner, scope, document, origin } = setup()
		const working = "* 中文\0\r\n#+begin_src text\r\nraw\r#+end_src\r\n"
		owner.updateContent(origin, working)
		owner.protect(scope, "a.org", "conflict")
		const live = owner.snapshotLiveBuffers(scope)[0]
		const state = live.runtime.state
		const release = owner.registerWindow(scope, "review", live.bufferId)
		const disk = { ...document, content: "copied target", revision: "disk-2" }
		const review = owner.issueFileReview(owner.captureFile(scope, "a.org")!, disk,
			owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
		expect(owner.acceptFileReview(review, "keep-working", disk, false)).toEqual({ kind: "accepted", manualSaveRequired: true })
		expect(owner.source).toBe(working)
		expect(live.runtime.state).toBe(state)
		expect(owner.document?.revision).toBe("disk-2")
		expect(owner.isAutosavePaused("a.org")).toBe(true)
		expect(owner.hasConflict("a.org")).toBe(false)
		owner.updateContent(origin, working + "newer")
		const ack = owner.acknowledgeWorkingCopy(scope, {
			bufferId: live.bufferId, expectedDocument: disk, capturedSource: working,
			receipt: { relativePath: "a.org", revision: "disk-3" },
		})
		expect(ack.kind).toBe("ack")
		expect(owner.source).toBe(working + "newer")
		expect(owner.getSnapshot().isDirty).toBe(true)
		expect(owner.isAutosavePaused("a.org")).toBe(false)
		release()
		owner.dispose()
	})

	it("requires discard consent and retires changed-body canonical history only on adoption", () => {
		const { owner, scope, document } = setup()
		const id = owner.snapshotLiveBuffers(scope)[0].bufferId
		const attached = attachSource(owner, scope, id, "history")
		attached.view.dispatch({ changes: { from: 0, to: attached.view.state.doc.length, insert: "retained working" } })
		owner.protect(scope, "a.org", "conflict")
		const live = owner.snapshotLiveBuffers(scope)[0]
		const release = owner.registerWindow(scope, "review", live.bufferId)
		const disk = { ...document, content: "fresh\0\r\n", revision: "disk-2" }
		const review = owner.issueFileReview(owner.captureFile(scope, "a.org")!, disk,
			owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
		const depth = undoDepth(live.runtime.state)
		expect(depth).toBeGreaterThan(0)
		expect(owner.acceptFileReview(review, "adopt-disk", disk, false).kind).toBe("rejected")
		expect(owner.source).toBe("retained working")
		expect(undoDepth(live.runtime.state)).toBe(depth)
		expect(owner.acceptFileReview(review, "adopt-disk", disk, true).kind).toBe("accepted")
		expect(owner.source).toBe(disk.content)
		expect(live.runtime.closed).toBe(true)
		expect(undoDepth(owner.snapshotLiveBuffers(scope)[0].runtime.state)).toBe(0)
		expect(owner.hasConflict("a.org")).toBe(false)
		release()
		attached.dispose()
		owner.dispose()
	})

	it.each(["disk", "edit-undo-aba", "window", "grant", "close-reopen", "baseline-aba", "new-protection"] as const)(
		"rejects obsolete review after %s without discarding retained Source",
		(change) => {
			const { owner, scope, document, grant } = setup()
			owner.protect(scope, "a.org", "conflict")
			const live = owner.snapshotLiveBuffers(scope)[0]
			let release = owner.registerWindow(scope, "review", live.bufferId)
			const disk = { ...document, content: "copied target", revision: "disk-2" }
			const review = owner.issueFileReview(owner.captureFile(scope, "a.org")!, disk,
				owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
			let fresh = disk
			if (change === "disk") fresh = { ...disk, revision: "disk-3", content: "new disk" }
			if (change === "edit-undo-aba") {
				const attached = attachSource(owner, scope, live.bufferId, "undo-aba")
				attached.view.dispatch({ changes: { from: 0, to: attached.view.state.doc.length, insert: "temporary" } })
				expect(attached.handle.undo()).toBe(true)
				expect(owner.source).toBe(document.content)
				attached.dispose()
			}
			if (change === "window") { release(); release = owner.registerWindow(scope, "review", live.bufferId) }
			if (change === "grant") {
				owner.activateGrant({ ...grant })
				owner.activateDocument(owner.scope!, document, document.content)
			}
			if (change === "close-reopen") {
				owner.closeActiveDocument(scope)
				owner.activateDocument(scope, document, document.content)
			}
			if (change === "baseline-aba") {
				owner.acknowledgeWorkingCopy(scope, {
					bufferId: live.bufferId, expectedDocument: document, capturedSource: document.content,
					receipt: { relativePath: "a.org", revision: document.revision },
				})
			}
			if (change === "new-protection") owner.protect(scope, "a.org", "conflict")
			expect(owner.acceptFileReview(review, "adopt-disk", fresh, true).kind).toBe("rejected")
			expect(owner.source).toBe(document.content)
			release()
			owner.dispose()
		},
	)

	it("adopts a reviewed parked file independently of later focus, leaving its peer protected", () => {
		const { owner, scope, document } = setup()
		const original = owner.snapshotLiveBuffers(scope)[0]
		owner.protect(scope, "a.org", "conflict")
		owner.protect(scope, "b.org", "conflict")
		const release = owner.registerWindow(scope, "review-a", original.bufferId)
		const disk = { ...document, content: "* copied target\0\r\n", revision: "a-disk" }
		const review = owner.issueFileReview(owner.captureFile(scope, "a.org")!, disk,
			owner.captureReviewWindowPermit(scope, "review-a", original.bufferId))!
		const peer = { relativePath: "b.org", revision: "b-1", content: "* retained B\r\n" }
		owner.activateDocument(scope, peer, peer.content)
		expect(owner.acceptFileReview(review, "adopt-disk", disk, true).kind).toBe("accepted")
		expect(owner.document).toBe(peer)
		expect(owner.source).toBe(peer.content)
		const parked = owner.snapshotLiveBuffers(scope).find((buffer) => buffer.bufferId === original.bufferId)!
		expect(parked.content).toBe(disk.content)
		expect(parked.document.revision).toBe("a-disk")
		expect(parked.runtime).not.toBe(original.runtime)
		expect(owner.hasConflict("a.org")).toBe(false)
		expect(owner.hasConflict("b.org")).toBe(true)
		release()
		owner.dispose()
	})
	it("issues absence without a body/baseline and acknowledges only the unopened protected target", () => {
		const { owner, scope, document } = setup()
		owner.protect(scope, "a.org", "conflict")
		owner.protect(scope, "missing.org", "conflict")
		const live = owner.snapshotLiveBuffers(scope)[0]
		const history = live.runtime.state
		const release = owner.registerWindow(scope, "review", live.bufferId)
		const missing = { kind: "missing" as const, relativePath: "missing.org", message: "Authorized absent path" }
		const review = owner.issueFileReview(owner.captureFile(scope, "missing.org")!, missing,
			owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
		expect(review.bufferId).toBeUndefined()
		expect(review.workingSource).toBeUndefined()
		expect(review.baselineRevision).toBeUndefined()
		expect(owner.acceptFileReview(review, "acknowledge-missing", missing, false)).toEqual({ kind: "accepted", manualSaveRequired: false })
		expect(owner.protectedPaths).toEqual(["a.org"])
		expect(owner.document).toBe(document)
		expect(owner.source).toBe(document.content)
		expect(live.runtime.state).toBe(history)
		release()
		owner.dispose()
	})
	it.each(["occupied", "unavailable", "protection", "window", "grant", "source-opened", "path-aba"] as const)(
		"never clears an unopened absent review after %s changes",
		(change) => {
			const { owner, scope, grant } = setup()
			owner.protect(scope, "missing.org", "conflict")
			const live = owner.snapshotLiveBuffers(scope)[0]
			let release = owner.registerWindow(scope, "review", live.bufferId)
			const missing = { kind: "missing" as const, relativePath: "missing.org", message: "Absent" }
			const review = owner.issueFileReview(owner.captureFile(scope, "missing.org")!, missing,
				owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
			const fresh = change === "occupied" ? { relativePath: "missing.org", revision: "new-owner", content: "occupied" }
				: change === "unavailable" ? { ...missing, kind: "unavailable" as const } : missing
			if (change === "protection") owner.protect(scope, "missing.org", "conflict")
			if (change === "window") { release(); release = owner.registerWindow(scope, "review", live.bufferId) }
			if (change === "grant") { owner.activateGrant({ ...grant }); owner.protect(owner.scope!, "missing.org", "conflict") }
			if (change === "source-opened") owner.activateDocument(scope, { relativePath: "missing.org", revision: "new-owner", content: "retained" }, "retained")
			if (change === "path-aba") {
				owner.activateDocument(scope, { relativePath: "missing.org", revision: "new-owner", content: "retained" }, "retained")
				expect(owner.activateOpenBuffer(scope, live.bufferId)).toBe(true)
				owner.retire(scope, "missing.org")
				owner.protect(scope, "missing.org", "conflict")
				expect(owner.captureFile(scope, "missing.org")?.bufferId).toBeUndefined()
			}
			expect(owner.acceptFileReview(review, "acknowledge-missing", fresh, false).kind).toBe("rejected")
			expect(owner.hasConflict("missing.org")).toBe(true)
			expect(owner.isAutosavePaused("missing.org")).toBe(true)
			release()
			owner.dispose()
		},
	)
	it("does not issue a stale read against a newly installed protection fence", () => {
		const { owner, scope } = setup()
		owner.protect(scope, "missing.org", "conflict")
		const capture = owner.captureFile(scope, "missing.org")!
		const live = owner.snapshotLiveBuffers(scope)[0]
		const release = owner.registerWindow(scope, "review", live.bufferId)
		owner.protect(scope, "missing.org", "conflict")
		expect(owner.issueFileReview(capture, { kind: "missing", relativePath: "missing.org", message: "Absent" },
			owner.captureReviewWindowPermit(scope, "review", live.bufferId))).toBeNull()
		expect(owner.hasConflict("missing.org")).toBe(true)
		release()
		owner.dispose()
	})
	it("retains a missing file's canonical Source/history and accepts only a real recreation receipt without losing newer input", () => {
		const { owner, scope, document, origin } = setup()
		owner.updateContent(origin, "* retained😀\0\r\n")
		owner.protect(scope, "a.org", "conflict")
		const live = owner.snapshotLiveBuffers(scope)[0]
		const release = owner.registerWindow(scope, "review", live.bufferId)
		const missing = { kind: "missing" as const, relativePath: "a.org", message: "Absent" }
		const review = owner.issueFileReview(owner.captureFile(scope, "a.org")!, missing,
			owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
		const history = live.runtime.state
		expect(owner.acceptFileReview(review, "acknowledge-missing", missing, true).kind).toBe("rejected")
		expect(owner.document).toBe(document)
		expect(live.runtime.state).toBe(history)
		expect(owner.captureFileReviewCreation(review, { relativePath: "a.org", content: "occupied", revision: "occupied" })).toBeNull()
		const intent = owner.captureFileReviewCreation(review, missing)!
		expect(intent.capture.source).toBe("* retained😀\0\r\n")
		expect(owner.reviewIsCurrent(review)).toBe(false)
		owner.updateContent(origin, "* retained😀\0\r\nnewer")
		const newerHistory = live.runtime.state
		expect(intent.acceptReceipt({ relativePath: "a.org", revision: "recreated" })).toEqual({ kind: "accepted", manualSaveRequired: true })
		expect(owner.source).toBe("* retained😀\0\r\nnewer")
		expect(live.runtime.state).toBe(newerHistory)
		expect(owner.document?.content).toBe("* retained😀\0\r\n")
		expect(owner.document?.revision).toBe("recreated")
		expect(owner.hasConflict("a.org")).toBe(false)
		expect(owner.isAutosavePaused("a.org")).toBe(true)
		release()
		owner.dispose()
	})
	it("cannot let a creation ACK clear a replacement protection", () => {
		const { owner, scope, document } = setup()
		owner.protect(scope, "a.org", "conflict")
		const live = owner.snapshotLiveBuffers(scope)[0]
		const release = owner.registerWindow(scope, "review", live.bufferId)
		const missing = { kind: "missing" as const, relativePath: "a.org", message: "Absent" }
		const review = owner.issueFileReview(owner.captureFile(scope, "a.org")!, missing,
			owner.captureReviewWindowPermit(scope, "review", live.bufferId))!
		const intent = owner.captureFileReviewCreation(review, missing)!
		owner.protect(scope, "a.org", "conflict")
		expect(intent.acceptReceipt({ relativePath: "a.org", revision: "late" }).kind).toBe("rejected")
		expect(owner.document).toBe(document)
		expect(owner.source).toBe(document.content)
		expect(owner.hasConflict("a.org")).toBe(true)
		release()
		owner.dispose()
	})
})
