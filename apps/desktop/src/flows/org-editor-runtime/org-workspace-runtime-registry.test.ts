import { describe, expect, it, vi } from "vitest"
import type { OrgRuntimeCommitContext } from "@/types/editor/org-runtime-owner.interface"
import type { OrgBufferKey } from "./org-buffer-runtime.types"
import {
	createOrgWorkspaceRuntimeRegistry,
	type OrgWorkspaceRuntimePorts,
} from "./org-workspace-runtime-registry"

const setup = () => {
	const registry = createOrgWorkspaceRuntimeRegistry()
	const key = { workspaceSessionId: "G1", bufferId: "A" }
	let source = "original\r\n"
	let active = true
	const readCommitContext = vi.fn(
		(key: OrgBufferKey, previous: string, next: string): OrgRuntimeCommitContext => ({
			mounted: true,
			closeReady: true,
			grantMatches: true,
			sessionMatches: true,
			isActiveOwner: active,
			previous,
			next,
			activeSource: source,
			parkedSource: source,
			runtimeBufferId: key.bufferId,
			loading: false,
			notificationInProgress: false,
			mutationInProgress: false,
			ordinarySaveInFlight: false,
		}),
	)
	const ports: OrgWorkspaceRuntimePorts = {
		readCommitContext,
		commitSource: vi.fn((_key, next) => {
			source = next
		}),
		emitFailure: vi.fn(),
	}
	const activation = {
		prepareSource: vi.fn((next: string) => {
			source = next
		}),
		setActiveRuntime: vi.fn(),
	}
	return {
		registry,
		key,
		ports,
		activation,
		park: () => {
			active = false
		},
	}
}

describe("Org workspace runtime reservoir", () => {
	const edit = { from: 0, to: 8, insert: "DONE", cursor: 4 }
	it.each([false, true])("scopes command permits to exact live leases (parked=%s)", (parked) => {
		const { registry, key, ports, park } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		if (parked) park()
		expect(() => runtime.applyCommandEdit(runtime.source, edit)).toThrow(
			"Commit guard rejected source",
		)
		expect(registry.applyCommandEdit(key, runtime.source, edit, () => false)).toBe(false)
		expect(registry.applyCommandEdit(key, "stale", edit, () => true)).toBe(false)
		let checks = 0
		expect(() =>
			registry.applyCommandEdit(key, runtime.source, edit, () => ++checks === 1),
		).toThrow("Commit guard rejected source")
		expect(runtime.source).toBe("original\r\n")
		expect(registry.applyCommandEdit(key, runtime.source, edit, () => true)).toBe(true)
		expect(runtime.source).toBe("DONE\r\n")
		expect(ports.commitSource).toHaveBeenCalledTimes(1)
		expect(() => runtime.applyControllerSource(runtime.source, "bare")).toThrow(
			"Commit guard rejected source",
		)
	})
	it("does not let a retired/recreated key borrow its old runtime lease", () => {
		const { registry, key, ports } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		expect(
			registry.applyCommandEdit(key, runtime.source, edit, () => {
				registry.retire(key)
				registry.create(key, "original\r\n", ports)
				return true
			}),
		).toBe(false)
		expect(runtime.closed).toBe(true)
		expect(registry.get(key)).not.toBe(runtime)
		expect(ports.commitSource).not.toHaveBeenCalled()
	})
	it("clears command authority on throw and rejects nested commands/installations", () => {
		const { registry, key, ports } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		const apply = vi.spyOn(runtime, "applyCommandEdit").mockImplementationOnce(() => {
			expect(() => runtime.applyControllerSource(runtime.source, "DONE\r\n")).toThrow(
				"Commit guard rejected source",
			)
			expect(registry.install(key, "nested")).toBe(false)
			expect(registry.applyCommandEdit(key, runtime.source, edit, () => true)).toBe(false)
			throw new Error("command failed")
		})
		expect(() => registry.applyCommandEdit(key, runtime.source, edit, () => true)).toThrow(
			"command failed",
		)
		apply.mockRestore()
		expect(() => runtime.applyCommandEdit(runtime.source, edit)).toThrow(
			"Commit guard rejected source",
		)
		expect(registry.applyCommandEdit(key, runtime.source, edit, () => true)).toBe(true)
	})
	it("owns distinct session/key leases without a second source store, and closes/retire leases", () => {
		const { registry, key, ports } = setup()
		const first = registry.create(key, "a\r\n", ports)
		expect(registry.create({ ...key }, "ignored", ports)).toBe(first)
		const second = registry.create({ ...key, bufferId: "B" }, "b", ports)
		const foreign = registry.create({ ...key, workspaceSessionId: "G2" }, "g2", ports)
		expect(new Set([first, second, foreign]).size).toBe(3)
		expect(first.source).toBe("a\r\n")
		registry.retire({ ...key })
		expect(first.closed).toBe(true)
		expect(registry.get(key)).toBeUndefined()
		const replacement = registry.create(key, "unknown disk", ports)
		expect(replacement).not.toBe(first)
		expect(replacement.revision).toBe(0)
		registry.close()
		expect([second, foreign, replacement].every((runtime) => runtime.closed)).toBe(true)
		expect(registry.get(foreign.key)).toBeUndefined()
	})
	it.each([
		false,
		true,
	])("bare direct source commits need explicit registry installation (parked=%s)", (parked) => {
		const { registry, key, ports, park } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		if (parked) park()
		const baseline = runtime.state
		expect(() => runtime.applyControllerSource(runtime.source, "bare")).toThrow(
			"Commit guard rejected source",
		)
		expect(runtime.state).toBe(baseline)
		expect(registry.install(key, "authorized")).toBe(true)
		expect(runtime.source).toBe("authorized")
		expect(() => runtime.applyControllerSource(runtime.source, "bare again")).toThrow(
			"Commit guard rejected source",
		)
	})
	it("authorizes legacy updates only after a fresh owner and exact baseline check", () => {
		const { registry, key, ports } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		expect(registry.updateSource(key, runtime.source, "stale owner", () => false)).toBe(false)
		expect(registry.updateSource(key, "wrong baseline", "next", () => true)).toBe(false)
		expect(ports.commitSource).not.toHaveBeenCalled()
		expect(registry.updateSource(key, runtime.source, "next", () => true)).toBe(true)
		expect(runtime.source).toBe("next")
	})
	it("scopes known parked installations but never grants parked user edits", () => {
		const { registry, key, ports, park } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		park()
		expect(registry.install({ ...key }, "confirmed\r\n")).toBe(true)
		expect(runtime.source).toBe("confirmed\r\n")
		expect(ports.commitSource).toHaveBeenCalledExactlyOnceWith(key, "confirmed\r\n")
		expect(() => runtime.applyControllerSource(runtime.source, "user")).toThrow(
			"Commit guard rejected source",
		)
		expect(runtime.source).toBe("confirmed\r\n")
	})
	it.each([
		false,
		true,
	])("notification rejects public authorized installation (parked=%s)", (parked) => {
		const { registry, key, ports, park } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		if (parked) park()
		const context = ports.readCommitContext(key, runtime.source, "confirmed", null)
		vi.mocked(ports.readCommitContext).mockReturnValue({
			...context,
			notificationInProgress: true,
			mutationInProgress: true,
			ordinarySaveInFlight: true,
		})
		const state = runtime.state
		expect(() => registry.install(key, "confirmed")).toThrow("Commit guard rejected source")
		expect(runtime.state).toBe(state)
		expect(runtime.source).toBe("original\r\n")
		expect(ports.commitSource).not.toHaveBeenCalled()
		vi.mocked(ports.readCommitContext).mockReturnValue(context)
		expect(registry.install(key, "confirmed")).toBe(true)
	})
	it("clears authority in finally after an install throws", () => {
		const { registry, key, ports, park } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		park()
		const apply = vi.spyOn(runtime, "applyControllerSource").mockImplementationOnce(() => {
			throw new Error("install failed")
		})
		expect(() => registry.install(key, "next")).toThrow("install failed")
		apply.mockRestore()
		expect(() => runtime.applyControllerSource(runtime.source, "next")).toThrow(
			"Commit guard rejected source",
		)
		expect(registry.install(key, "next")).toBe(true)
	})
	it("rejects nested installs without leaking authority to another runtime", () => {
		const { registry, key, ports } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		const otherKey = { ...key, bufferId: "B" }
		registry.create(otherKey, "original\r\n", ports)
		vi.spyOn(runtime, "applyControllerSource").mockImplementationOnce(() => {
			expect(registry.install(key, "nested")).toBe(false)
			expect(registry.install(otherKey, "foreign")).toBe(false)
			return false
		})
		expect(registry.install(key, "outer")).toBe(false)
		expect(registry.install(otherKey, "after")).toBe(true)
	})
	it("mirrors creation and successful active commits exactly once", () => {
		const { registry, key, ports, activation } = setup()
		registry.activate(key, "original\r\n", ports, activation)
		expect(ports.commitSource).toHaveBeenCalledTimes(1)
		vi.mocked(ports.commitSource).mockClear()
		registry.activate({ ...key }, "accepted\r\n", ports, activation)
		expect(ports.commitSource).toHaveBeenCalledExactlyOnceWith(key, "accepted\r\n")
		expect(registry.get(key)?.source).toBe("accepted\r\n")
	})
	it("uses the pure guard even during installations", () => {
		const { registry, key, ports } = setup()
		const runtime = registry.create(key, "original\r\n", ports)
		vi.mocked(ports.readCommitContext).mockReturnValue({
			...ports.readCommitContext(key, runtime.source, "next", null),
			grantMatches: false,
		})
		expect(() => registry.install(key, "next")).toThrow("Commit guard rejected source")
		expect(runtime.source).toBe("original\r\n")
		expect(ports.commitSource).not.toHaveBeenCalled()
	})
})
