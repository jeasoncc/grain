import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import { parseOrgKeymapConfiguration } from "./org-keymap-configuration.pipe"

const parse = (value: unknown) => parseOrgKeymapConfiguration(JSON.stringify(value))
const transient = { id: "planning", label: "Planning", scope: "org-source", timeoutMs: null, bindings: [{ key: "s", command: "scheduled" }] }

describe("parseOrgKeymapConfiguration", () => {
	it("uses existing defaults only for blank text", () => {
		expect(E.isRight(parseOrgKeymapConfiguration(" \n"))).toBe(true)
		expect(E.isLeft(parseOrgKeymapConfiguration("{"))).toBe(true)
		expect(E.isLeft(parseOrgKeymapConfiguration(undefined as unknown as string))).toBe(true)
	})
	it.each([null, [], 1, { version: 2 }, { version: 1, unknown: true }, { version: 1, bindings: {} }, { version: 1, leaders: false }, { version: 1, transients: null }, { version: 1, bindings: [{ scope: "other", key: "C-l", command: "tags" }] }, { version: 1, bindings: [{ scope: "org-source", key: "C-l", command: "unknown" }] }, { version: 1, bindings: [{ scope: "org-source", key: "C-l" }] }, { version: 1, bindings: [{ scope: "org-source", key: "C-l", command: "tags", typo: true }] }, { version: 1, bindings: [{ scope: "org-source", key: "C-C-l", command: "tags" }] }])("rejects closed-schema violations %j", (value) => {
		expect(E.isLeft(parse(value))).toBe(true)
	})
	it.each([-1, 0.5, 2147483648, "500"])("rejects invalid timeout %s", (timeoutMs) => {
		expect(E.isLeft(parse({ version: 1, transients: [{ ...transient, timeoutMs }] }))).toBe(true)
	})
	it("rejects missing/cross-scope child maps and duplicate IDs/semantic keys", () => {
		for (const value of [
			{ version: 1, leaders: [{ scope: "org-source", key: "C-l", map: "missing" }] },
			{ version: 1, leaders: [{ scope: "application", key: "C-l", map: "planning" }], transients: [transient] },
			{ version: 1, transients: [{ ...transient, bindings: [{ key: "s", map: "missing" }] }] },
			{ version: 1, transients: [transient, transient] },
			{ version: 1, transients: [{ ...transient, bindings: [{ key: "s", command: "scheduled", map: "planning" }] }] },
			{ version: 1, bindings: [{ scope: "org-source", key: "C-S-l", command: "tags" }, { scope: "org-source", key: "S-C-l", command: "todo" }] },
		]) expect(E.isLeft(parse(value))).toBe(true)
	})
	it("keeps file-tree leaders and nested maps in their own scope", () => {
		const treeMap = { id: "files", label: "Files", scope: "file-tree", timeoutMs: null, bindings: [{ key: "s", map: "file-actions" }] }
		const actions = { id: "file-actions", label: "File actions", scope: "file-tree", timeoutMs: 500, bindings: [{ key: "r", command: "refresh" }] }
		const result = parse({ version: 1, leaders: [{ scope: "file-tree", key: "Space", map: "files" }], transients: [treeMap, actions] })
		if (E.isLeft(result)) throw new Error(result.left.message)
		expect(result.right.maps.files.bindings).toMatchObject([{ keyLabel: "s", prefixLabel: "file-actions" }])
		for (const value of [
			{ version: 1, leaders: [{ scope: "org-source", key: "Space", map: "files" }], transients: [treeMap, actions] },
			{ version: 1, leaders: [{ scope: "file-tree", key: "Space", map: "files" }], transients: [treeMap, { ...actions, scope: "org-source" }] },
		]) expect(E.isLeft(parse(value))).toBe(true)
	})
	it("requires explicit definitions for former tree maps and rejects the retired help command", () => {
		for (const key of ["c", "g", "y", "C-w"]) {
			const leader = { scope: "file-tree", key, map: `file-tree:${key}` }
			expect(E.isLeft(parse({ version: 1, leaders: [leader] }))).toBe(true)
			expect(E.isRight(parse({ version: 1, leaders: [leader], transients: [{
				id: leader.map, label: "Custom files", scope: "file-tree", timeoutMs: null,
				bindings: [{ key: "r", command: "file-tree.refresh" }],
			}] }))).toBe(true)
		}
		expect(E.isLeft(parse({ version: 1, bindings: [{ scope: "file-tree", key: "?", command: "file-tree.help" }] }))).toBe(true)
		expect(E.isLeft(parse({ version: 1, transients: [{
			id: "files", label: "Files", scope: "file-tree", timeoutMs: null,
			bindings: [{ key: "?", command: "file-tree.help" }],
		}] }))).toBe(true)
	})
	it("accepts filter, document move and native reveal as ordinary configurable commands", () => {
		const result = parse({ version: 1, bindings: [
			{ scope: "file-tree", key: "F10", command: "file-tree.move" },
			{ scope: "file-tree", key: "F11", command: "file-tree.reveal-in-file-manager" },
			{ scope: "file-tree", key: "Mod-f", command: "file-tree.filter" },
		] })
		expect(E.isRight(result)).toBe(true)
	})
	it("merges by key identity and freezes parsed maps", () => {
		const result = parse({ version: 1, bindings: [{ scope: "org-source", key: "S-Mod-x", command: "todo" }], leaders: [{ scope: "org-source", key: "C-l", map: "planning" }], transients: [transient] })
		if (E.isLeft(result)) throw new Error(result.left.message)
		expect(result.right.bindings.filter((binding) => binding.scope === "org-source" && binding.command === "checkbox")).toEqual([])
		expect(result.right.maps.planning.bindings).toMatchObject([{ keyLabel: "s", commandId: "scheduled" }])
		expect(Object.isFrozen(result.right)).toBe(true)
		expect(Object.isFrozen(result.right.maps.planning.bindings)).toBe(true)
	})
})
