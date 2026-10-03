import { describe, expect, it, vi } from "vitest"
import { createOrgBufferIdentityRegistry } from "./org-buffer-identity-registry"
import { createOrgParkedWorkingCopyReservoir } from "./org-parked-working-copy-reservoir"
import { planOrgWorkingCopyAck } from "@/pipes/editor/org-working-copy-ack.pipe"

const setup = () => {
	const identity = createOrgBufferIdentityRegistry()
	const failures = vi.fn()
	const reservoir = createOrgParkedWorkingCopyReservoir(identity, failures)
	const scope = { grant: {}, sessionId: "same-session" }
	identity.openScope(scope)
	reservoir.openScope(scope)
	const id = identity.ensure(scope, "a.org")
	const document = { relativePath: "a.org", content: "base", revision: "r1" }
	const park = () =>
		reservoir.park(scope, id, { document, content: "base", isDirty: false, editGeneration: 4 })!
	return { identity, failures, reservoir, scope, id, document, park }
}

describe("parked source mirror lifecycle", () => {
	it("keeps frozen, stable reads and snapshots until a committed change", () => {
		const { reservoir, scope, id, park, document } = setup()
		const listener = vi.fn(() =>
			expect(reservoir.readById(scope, id)).toBe(reservoir.getSnapshot().copies[0]),
		)
		const stop = reservoir.subscribe(listener)
		const empty = reservoir.getSnapshot()
		const copy = park()
		expect(reservoir.getSnapshot()).not.toBe(empty)
		expect(reservoir.read(scope, "a.org")).toBe(copy)
		expect(reservoir.readById(scope, id)).toBe(copy)
		expect(Object.isFrozen(copy)).toBe(true)
		expect(Object.isFrozen(copy.document)).toBe(true)
		expect(copy.document).not.toBe(document)
		const snapshot = reservoir.getSnapshot()
		expect(reservoir.getSnapshot()).toBe(snapshot)
		expect(reservoir.list(scope)).toBe(snapshot.copies)
		expect(listener).toHaveBeenCalledTimes(1)
		stop()
		reservoir.retire(scope, id)
		expect(listener).toHaveBeenCalledTimes(1)
	})
	it("mirrors source literals with generation fencing and installs a supplied newer-input ACK", () => {
		const { reservoir, scope, id, park } = setup()
		const original = park()
		const literal = "* TODO raw\n#+begin_src js\n<a>&中\n#+end_src\n"
		const next = reservoir.mirrorReplacement(scope, id, {
			previous: original.content,
			source: literal,
		})!
		expect(next.content).toBe(literal)
		expect(next.editGeneration).toBe(5)
		expect(
			reservoir.mirrorReplacement(scope, id, { previous: "base", source: "stale" }),
		).toBeUndefined()
		const plan = planOrgWorkingCopyAck({
			expectedDocument: original.document,
			currentDocument: next.document,
			workingSource: next.content,
			capturedSource: "base",
			receipt: { relativePath: "a.org", revision: "ack" },
		})
		if (plan.kind === "rejected") throw new Error(plan.reason)
		const ack = reservoir.installConfirmedBaseline(scope, id, next, plan)!
		expect(ack.content).toBe(literal)
		expect(ack.document.content).toBe("base")
		expect(ack.document.revision).toBe("ack")
		expect(ack.isDirty).toBe(true)
		expect(ack.editGeneration).toBe(5)
		expect(ack.bufferId).toBe(id)
		expect(reservoir.installConfirmedBaseline(scope, id, next, plan)).toBeUndefined()
		expect(Object.keys(reservoir)).not.toContain("write")
		expect(Object.keys(ack).sort()).toEqual([
			"bufferId",
			"content",
			"document",
			"editGeneration",
			"isDirty",
		])
	})
	it("notifies update, remove, take and clear exactly after commit", () => {
		const { reservoir, scope, id, park } = setup()
		const revisions: number[] = []
		reservoir.subscribe(() => {
			revisions.push(reservoir.getSnapshot().revision)
		})
		park()
		reservoir.mirrorReplacement(scope, id, { previous: "base", source: "edit" })
		const copy = reservoir.takeToActivate(scope, id)
		expect(copy?.content).toBe("edit")
		expect(reservoir.readById(scope, id)).toBeUndefined()
		park()
		reservoir.retire(scope, id)
		park()
		reservoir.clearScope(scope)
		expect(revisions).toEqual([1, 2, 3, 4, 5, 6, 7])
		expect(reservoir.getSnapshot().copies).toEqual([])
	})
	it("rejects old-grant callbacks, old resets and retire/reopen ABA without changing snapshots", () => {
		const { identity, reservoir, scope, id, park } = setup()
		park()
		reservoir.retire(scope, id)
		identity.retire(scope, "a.org")
		const reopened = identity.ensure(scope, "a.org")
		const copy = reservoir.park(scope, reopened, {
			document: { relativePath: "a.org", content: "new", revision: "r2" },
			content: "new",
			editGeneration: 0,
			isDirty: false,
		})!
		const snapshot = reservoir.getSnapshot()
		expect(reservoir.retire(scope, id)).toBe(false)
		expect(reservoir.readById(scope, reopened)).toBe(copy)
		expect(reservoir.getSnapshot()).toBe(snapshot)
		reservoir.clearScope(scope)
		identity.clearScope(scope)
		const g2 = { sessionId: scope.sessionId, grant: {} }
		identity.openScope(g2)
		reservoir.openScope(g2)
		const id2 = identity.ensure(g2, "a.org")
		reservoir.park(g2, id2, copy)
		const current = reservoir.getSnapshot()
		expect(reservoir.clearScope(scope)).toBe(false)
		expect(reservoir.retire(scope, id2)).toBe(false)
		expect(
			reservoir.mirrorReplacement(scope, id2, { previous: "new", source: "foreign" }),
		).toBeUndefined()
		expect(reservoir.getSnapshot()).toBe(current)
	})
	it("requires the root's already-approved logical mapping for rename", () => {
		const { identity, reservoir, scope, id, park } = setup()
		const copy = park()
		const document = { ...copy.document, relativePath: "b.org" }
		expect(reservoir.renameApproved(scope, id, "a.org", document)).toBe(false)
		identity.moveApproved(scope, "a.org", "b.org", id)
		expect(reservoir.renameApproved(scope, id, "a.org", document)).toBe(true)
		expect(reservoir.read(scope, "a.org")).toBeUndefined()
		expect(reservoir.readById(scope, id)?.content).toBe(copy.content)
	})
	it("isolates throwing listeners and rejects nested commits before any mutation", () => {
		const { reservoir, failures, scope, id, park } = setup()
		reservoir.subscribe(() => {
			throw new Error("observer")
		})
		reservoir.subscribe(() => {
			const snapshot = reservoir.getSnapshot()
			expect(reservoir.retire(scope, id)).toBe(false)
			expect(reservoir.clearScope(scope)).toBe(false)
			expect(
				reservoir.mirrorReplacement(scope, id, { previous: "base", source: "nested" }),
			).toBeUndefined()
			expect(reservoir.getSnapshot()).toBe(snapshot)
		})
		const last = vi.fn()
		reservoir.subscribe(last)
		expect(() => park()).not.toThrow()
		expect(reservoir.readById(scope, id)?.content).toBe("base")
		expect(failures.mock.calls.map(([failure]) => failure.kind)).toEqual([
			"listener",
			"reentrant",
			"reentrant",
			"reentrant",
		])
		expect(last).toHaveBeenCalledOnce()
	})
})
