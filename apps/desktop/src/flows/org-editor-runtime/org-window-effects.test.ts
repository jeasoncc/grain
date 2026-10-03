import { StateEffect } from "@codemirror/state"
import { describe, expect, it } from "vitest"
import { createOrgWindowEffectRegistry } from "./org-window-effects"
import { clearOrgSparseTree, setOrgSparseTree } from "@/views/org-editor/org-sparse-tree.extension"

describe("window-local effect provenance", () => {
	it("rejects forged sparse effects and effects issued by another window", () => {
		const local = createOrgWindowEffectRegistry([], [setOrgSparseTree, clearOrgSparseTree])
		const peer = createOrgWindowEffectRegistry([], [setOrgSparseTree, clearOrgSparseTree])
		const payload = { query: { kind: "todo" as const }, restoreSelection: null }
		const issued = local.localEffect(setOrgSparseTree.of(payload))
		expect(local.knownEffect(issued)).toBe(true)
		expect(local.knownEffect(setOrgSparseTree.of(payload))).toBe(false)
		expect(peer.knownEffect(issued)).toBe(false)
		const cleared = local.localEffect(clearOrgSparseTree.of(null))
		expect(local.knownEffect(clearOrgSparseTree.of(null))).toBe(false)
		expect(peer.knownEffect(cleared)).toBe(false)
	})
	it("admits only explicitly registered local types and only issued instances", () => {
		const local = StateEffect.define<string>()
		const unknown = StateEffect.define<string>()
		const registry = createOrgWindowEffectRegistry([], [local])
		const otherWindow = createOrgWindowEffectRegistry([], [local])
		const issued = local.of("presentation")
		const unissued = local.of("presentation")
		const refused = unknown.of("presentation")
		expect(registry.knownEffect(issued)).toBe(false)
		expect(registry.localEffect(issued)).toBe(issued)
		expect(registry.knownEffect(issued)).toBe(true)
		expect(registry.knownEffect(unissued)).toBe(false)
		expect(otherWindow.knownEffect(issued)).toBe(false)
		expect(() => registry.localEffect(refused)).toThrow("Unregistered window-local effect")
		expect(registry.knownEffect(refused)).toBe(false)
		expect(() => registry.localEffect(StateEffect.reconfigure.of([]))).toThrow("Unregistered")
		expect(() => createOrgWindowEffectRegistry().localEffect(local.of("presentation"))).toThrow(
			"Unregistered",
		)
	})
})
