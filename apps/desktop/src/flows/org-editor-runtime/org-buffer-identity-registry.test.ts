import { describe, expect, it } from "vitest"
import {
	createOrgBufferIdentityRegistry,
	type OrgBufferIdentityScope,
} from "./org-buffer-identity-registry"

const grant = (sessionId: string): OrgBufferIdentityScope => ({
	sessionId,
	grant: { rootPath: "/same-root" },
})

describe("Org logical buffer identity reservoir", () => {
	it("ensures stable identities and never reuses retired identities (ABA)", () => {
		const registry = createOrgBufferIdentityRegistry()
		const scope = grant("G1")
		registry.openScope(scope)
		const id = registry.ensure(scope, "a.org")
		expect(id).toBe("G1:buffer-1")
		expect(registry.ensure(scope, "a.org")).toBe(id)
		expect(registry.retire(scope, "a.org")).toBe(id)
		expect(registry.lookup(scope, "a.org")).toBeUndefined()
		expect(registry.findPath(scope, id)).toBeUndefined()
		expect(registry.ensure(scope, "a.org")).toBe("G1:buffer-2")
	})

	it("rejects stale and missing scopes without allocating, renaming or retiring", () => {
		const registry = createOrgBufferIdentityRegistry()
		const scope = grant("G1")
		registry.openScope(scope)
		const id = registry.ensure(scope, "a.org")
		for (const wrong of [null, grant("G1"), grant("G2")]) {
			expect(() => registry.ensure(wrong, "a.org")).toThrow("Stale")
			expect(registry.lookup(wrong, "a.org")).toBeUndefined()
			expect(registry.findPath(wrong, id)).toBeUndefined()
			expect(registry.moveApproved(wrong, "a.org", "b.org", id)).toBe(false)
			expect(registry.retire(wrong, "a.org")).toBeUndefined()
			expect(registry.clearScope(wrong)).toBe(false)
			expect(registry.snapshot(wrong)).toEqual([])
		}
		expect(registry.lookup(scope, "a.org")).toBe(id)
		expect(registry.ensure(scope, "b.org")).toBe("G1:buffer-2")
	})

	it("clears exactly the old scope and does not reset G2 at the same root/path", () => {
		const registry = createOrgBufferIdentityRegistry()
		const g1 = grant("G1")
		const g2 = grant("G2")
		registry.openScope(g1)
		const oldId = registry.ensure(g1, "a.org")
		expect(() => registry.openScope(g2)).toThrow()
		expect(registry.clearScope(g1)).toBe(true)
		registry.openScope(g2)
		const id = registry.ensure(g2, "a.org")
		expect(id).toBe("G2:buffer-2")
		expect(id).not.toBe(oldId)
		expect(registry.clearScope(g1)).toBe(false)
		expect(registry.retire(g1, "a.org")).toBeUndefined()
		expect(registry.moveApproved(g1, "a.org", "renamed.org", oldId)).toBe(false)
		expect(() => registry.ensure(g1, "a.org")).toThrow()
		expect(registry.lookup(g2, "a.org")).toBe(id)
		expect(registry.findPath(g2, oldId)).toBeUndefined()
	})

	it("preserves rename identity, rejects changed source and destination collisions", () => {
		const registry = createOrgBufferIdentityRegistry()
		const scope = grant("G1")
		registry.openScope(scope)
		const a = registry.ensure(scope, "a.org")
		const b = registry.ensure(scope, "b.org")
		expect(registry.moveApproved(scope, "a.org", "b.org", a)).toBe(false)
		expect(registry.moveApproved(scope, "a.org", "renamed.org", b)).toBe(false)
		expect(registry.lookup(scope, "a.org")).toBe(a)
		expect(registry.lookup(scope, "b.org")).toBe(b)
		expect(registry.moveApproved(scope, "a.org", "a.org", a)).toBe(true)
		expect(registry.moveApproved(scope, "a.org", "renamed.org", a)).toBe(true)
		expect(registry.lookup(scope, "a.org")).toBeUndefined()
		expect(registry.lookup(scope, "renamed.org")).toBe(a)
		expect(registry.findPath(scope, a)).toBe("renamed.org")
		registry.retire(scope, "renamed.org")
		registry.ensure(scope, "renamed.org")
		expect(registry.moveApproved(scope, "renamed.org", "a.org", a)).toBe(false)
	})

	it("exposes detached deeply immutable identity snapshots, not live state", () => {
		const registry = createOrgBufferIdentityRegistry()
		const scope = grant("G1")
		registry.openScope(scope)
		const id = registry.ensure(scope, "a.org")
		const snapshot = registry.snapshot(scope)
		expect(Object.isFrozen(snapshot)).toBe(true)
		expect(Object.isFrozen(snapshot[0])).toBe(true)
		expect(() => ((snapshot as unknown as string[][])[0][0] = "changed")).toThrow()
		registry.moveApproved(scope, "a.org", "renamed.org", id)
		registry.clearScope(scope)
		expect(snapshot).toEqual([["a.org", id]])
		expect(registry.snapshot(scope)).toEqual([])
	})
})
