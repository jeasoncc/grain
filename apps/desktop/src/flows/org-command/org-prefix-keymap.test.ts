import { describe, expect, it } from "vitest"
import * as E from "fp-ts/Either"
import type { OrgPrefixKeyInput, OrgPrefixSession, OrgKeymapConfiguration, OrgKeymapScope } from "@/types/editor/org-keymap.interface"
import { parseOrgKeymapConfiguration, DEFAULT_ORG_KEYMAP_CONFIGURATION } from "@/pipes/org/org-keymap-configuration.pipe"
import { getOrgInputCommandKeys, MAX_ORG_PREFIX_TIMEOUT_MS, ORG_PREFIX_BINDINGS, ORG_EXTRA_PREFIX_BINDINGS, ORG_PREFIX_TIMEOUT_MS, resolveOrgInput } from "./org-prefix-keymap"

const input = (key: string, overrides: Partial<OrgPrefixKeyInput> = {}): OrgPrefixKeyInput => ({ key, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, isComposing: false, keyCode: 0, defaultPrevented: false, ...overrides })
const owner = {}
const generation = {}
const idle = { session: null, commandId: null, consumed: false, protected: false }
const resolve = (current: OrgPrefixSession | null, event: OrgPrefixKeyInput, now = 200, timeoutMs: number | null | undefined = undefined, configuration: OrgKeymapConfiguration | null = DEFAULT_ORG_KEYMAP_CONFIGURATION, selectionEmpty = true) => resolveOrgInput({ configuration, scope: "org-source", current, input: event, now, selectionEmpty, nextId: 8, owner, generation, timeoutMs })
const start = (timeoutMs: number | null = ORG_PREFIX_TIMEOUT_MS) => {
	const session = resolve(null, input("c", { ctrlKey: true }), 100, timeoutMs).session
	if (!session) throw new Error("Expected prefix lease")
	return session
}
const configured = (value: unknown) => {
	const parsed = parseOrgKeymapConfiguration(JSON.stringify(value))
	if (E.isLeft(parsed)) throw new Error(parsed.left.message)
	return parsed.right
}

describe("resolveOrgInput", () => {
	it("starts the existing empty-selection C-c and keeps native selected copy", () => {
		const session = start()
		expect(session).toMatchObject({ id: 8, label: "C-c", mapId: "C-c", expiresAt: null, owner, generation })
		expect(session.bindings).toBe(ORG_PREFIX_BINDINGS)
		expect(resolve(null, input("c", { ctrlKey: true }), 200, undefined, DEFAULT_ORG_KEYMAP_CONFIGURATION, false)).toEqual(idle)
		expect(resolve(session, input("c", { ctrlKey: true }), 200, undefined, DEFAULT_ORG_KEYMAP_CONFIGURATION, false)).toEqual({ ...idle, commandId: "checkbox", consumed: true })
	})
	it.each([["t", true, "todo"], ["c", true, "checkbox"], ["o", true, "link"], ["q", true, "tags"], ["s", true, "scheduled"], ["d", true, "deadline"], ["p", true, "property"], ["w", true, "refile"], ["/", false, "sparse-tree"], [".", false, "timestamp-active"], ["!", false, "timestamp-inactive"]] as const)("keeps default suffix %s", (key, ctrlKey, commandId) => {
		expect(resolve(start(), input(key, { ctrlKey }))).toEqual({ ...idle, commandId, consumed: true })
	})
	it("uses authority child bindings, not caller-mutated hints", () => {
		const session = Object.freeze({ ...start(), bindings: [{ keyLabel: "C-x", label: "Missing", prefixLabel: "missing" }] })
		const child = resolve(session, input("x", { ctrlKey: true })).session
		expect(child?.bindings).toBe(ORG_EXTRA_PREFIX_BINDINGS)
		expect(resolve(child, input("a", { ctrlKey: true })).commandId).toBe("archive")
		expect(session.bindings[0].prefixLabel).toBe("missing")
	})
	it.each([null, 1200, 0, MAX_ORG_PREFIX_TIMEOUT_MS])("renews child timeout %s", (timeoutMs) => {
		const child = resolve(start(), input("x", { ctrlKey: true }), 1200, timeoutMs).session
		expect(child?.expiresAt).toBe(timeoutMs === null ? null : 1200 + timeoutMs)
		if (timeoutMs !== null) expect(resolve(child, input("a", { ctrlKey: true }), 1200 + timeoutMs)).toEqual(idle)
	})
	it.each([-1, NaN, Infinity, -Infinity, MAX_ORG_PREFIX_TIMEOUT_MS + 1, Number.MAX_VALUE])("rejects invalid timer %s", (duration) => {
		expect(resolve(null, input("c", { ctrlKey: true }), 100, duration)).toEqual(idle)
		expect(resolve(start(), input("x", { ctrlKey: true }), 200, duration)).toEqual(idle)
	})
	it("keeps indefinite leases and expires finite leases at the exact deadline", () => {
		const indefinite = start()
		expect(resolve(indefinite, input("t", { ctrlKey: true }), 1_000_000).commandId).toBe("todo")
		const finite = start(1200)
		expect(resolve(finite, input("t", { ctrlKey: true }), 1299).commandId).toBe("todo")
		for (const now of [1300, 1301, 5000]) {
			expect(resolve(finite, input("t", { ctrlKey: true }), now)).toEqual(idle)
			expect(resolve(finite, input("c", { ctrlKey: true }), now, 1200).session?.expiresAt).toBe(now + 1200)
		}
	})
	it.each(["Control", "Shift", "Alt", "Meta", "AltGraph"])("preserves lease while forming %s", (key) => {
		const session = start()
		expect(resolve(session, input(key)).session).toBe(session)
	})
	it.each([{ isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }, { repeat: true }, { altGraphKey: true }, { isParameterInput: true }])("protects higher ownership and cancels %j", (overrides) => {
		for (const session of [null, start()]) expect(resolve(session, input("c", { ctrlKey: true, ...overrides }))).toEqual({ ...idle, protected: true, consumed: "repeat" in overrides })
	})
	it.each([input("x"), input("t"), input("c"), input(".", { ctrlKey: true }), input("t", { ctrlKey: true, altKey: true }), input("t", { ctrlKey: true, metaKey: true })])("preserves unmatched text/native event %j", (event) => {
		expect(resolve(start(), event)).toEqual(idle)
	})
	it.each([input("Escape"), input("g", { ctrlKey: true })])("consumes only active cancellation %j", (event) => {
		expect(resolve(start(), event)).toEqual({ ...idle, consumed: true })
		expect(resolve(null, event)).toEqual(idle)
	})
	it("keeps shifted suffix letters/punctuation and native standalone cut", () => {
		expect(resolve(start(), input("T", { ctrlKey: true, shiftKey: true })).commandId).toBe("todo")
		expect(resolve(start(), input("!", { shiftKey: true })).commandId).toBe("timestamp-inactive")
		for (const key of ["w", "x"]) expect(resolve(null, input(key, { ctrlKey: true }))).toEqual(idle)
		for (const overrides of [{ altKey: true }, { metaKey: true }, { shiftKey: true }, { ctrlKey: false }]) expect(resolve(null, input("c", { ctrlKey: true, ...overrides }))).toEqual(idle)
	})
	it("cancels leases on configuration or window ownership replacement", () => {
		const options = { configuration: DEFAULT_ORG_KEYMAP_CONFIGURATION, scope: "org-source" as const, current: start(), input: input("t", { ctrlKey: true }), now: 200, selectionEmpty: true, nextId: 9, owner, generation }
		expect(resolveOrgInput({ ...options, owner: {} })).toEqual(idle)
		expect(resolveOrgInput({ ...options, generation: {} })).toEqual(idle)
		expect(resolveOrgInput({ ...options, configuration: null })).toEqual(idle)
	})
	it("routes configured scoped bindings and leader maps with authoritative hints", () => {
		const configuration = configured({ version: 1, bindings: [{ scope: "org-source", key: "A-t", command: "tags" }, { scope: "application", key: "A-t", command: "execute-command" }], leaders: [{ scope: "org-source", key: "C-l", map: "planning" }], transients: [{ id: "planning", label: "Planning", scope: "org-source", timeoutMs: 500, bindings: [{ key: "s", command: "scheduled" }] }] })
		expect(resolve(null, input("t", { altKey: true }), 200, undefined, configuration).commandId).toBe("tags")
		const session = resolve(null, input("l", { ctrlKey: true }), 200, undefined, configuration).session
		expect(session).toMatchObject({ label: "Planning", expiresAt: 700, bindings: [{ keyLabel: "s", commandId: "scheduled", label: "Schedule" }] })
		expect(resolve(session, input("s"), 201, undefined, configuration).commandId).toBe("scheduled")
		expect(resolve(session, input("é"), 201, undefined, configuration)).toEqual(idle)
		expect(resolveOrgInput({ configuration, scope: "application", current: null, input: input("t", { altKey: true }), now: 200, selectionEmpty: true, nextId: 1, owner, generation }).commandId).toBe("execute-command")
	})
	it("falls through an unmatched transient to the most-specific configured binding before modal input", () => {
		const configuration = configured({ version: 1, bindings: [
			{ scope: "org-source", key: "A-t", command: "todo" },
			{ scope: "workspace", key: "A-t", command: "tags" },
		] })
		const session = resolve(null, input("c", { ctrlKey: true }), 100, undefined, configuration).session
		expect(session).not.toBeNull()
		expect(resolve(session, input("t", { altKey: true }), 200, undefined, configuration)).toEqual({ ...idle, commandId: "todo", consumed: true })
		const unbound = configured({ version: 1, bindings: [
			{ scope: "org-source", key: "A-t", command: null },
			{ scope: "workspace", key: "A-t", command: "tags" },
		] })
		const unboundSession = resolve(null, input("c", { ctrlKey: true }), 100, undefined, unbound).session
		expect(resolve(unboundSession, input("t", { altKey: true }), 200, undefined, unbound)).toEqual(idle)
	})
	it("unbinding a key overrides less-specific scopes and does not reserve Space by default", () => {
		const configuration = configured({ version: 1, bindings: [{ scope: "org-source", key: "Mod-s", command: null }] })
		expect(resolve(null, input("s", { ctrlKey: true }), 200, undefined, configuration)).toEqual(idle)
		expect(resolve(null, input(" "))).toEqual(idle)
	})
	it("routes ordinary tree navigation and file actions without reserving letters or prefix keys", () => {
		const route = (event: OrgPrefixKeyInput) => resolveOrgInput({
			configuration: DEFAULT_ORG_KEYMAP_CONFIGURATION, scope: "file-tree", current: null, input: event,
			now: 200, selectionEmpty: true, nextId: 1, owner, generation,
		})
		for (const [key, commandId] of [
			["ArrowDown", "file-tree.next"], ["ArrowUp", "file-tree.previous"],
			["ArrowLeft", "file-tree.collapse"], ["ArrowRight", "file-tree.expand"],
			["Home", "file-tree.first"], ["End", "file-tree.last"], ["Enter", "file-tree.open"],
			["F2", "file-tree.rename"], ["Delete", "file-tree.delete"], ["F5", "file-tree.refresh"],
		]) expect(route(input(key))).toEqual({ ...idle, commandId, consumed: true })
		for (const key of ["j", "k", "h", "l", "u", "m", "d", "r", "q", "c", "g", "y", "?", "Tab"])
			expect(route(input(key))).toEqual(idle)
		for (const key of ["G", "R"]) expect(route(input(key, { shiftKey: true }))).toEqual(idle)
		expect(route(input("w", { ctrlKey: true }))).toEqual(idle)
		for (const modifier of [{ ctrlKey: true }, { metaKey: true }])
			expect(route(input("f", modifier))).toEqual({ ...idle, commandId: "file-tree.filter", consumed: true })
		for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"])
			expect(resolve(null, input(key))).toEqual(idle)
	})
	it("keeps standard file actions out of Source, global and other tool scopes", () => {
		for (const scope of ["org-source", "workspace", "application", "org-agenda", "org-remark"] as const) {
			for (const event of [input("F2"), input("Delete"), input("F5"), input("f", { ctrlKey: true }), input("f", { metaKey: true })]) {
				expect(resolveOrgInput({
					configuration: DEFAULT_ORG_KEYMAP_CONFIGURATION, scope, current: null, input: event,
					now: 200, selectionEmpty: true, nextId: 1, owner, generation,
				})).toEqual(idle)
			}
		}
	})
	it.each([
		["f2", input("F2")], ["delete", input("Delete")], ["f5", input("F5")],
		["Mod-F", input("f", { ctrlKey: true })], ["Mod-F", input("f", { metaKey: true })],
	] as const)("honors remapping and null unbinding for the standard tree key %s", (key, event) => {
		for (const command of ["file-tree.filter", null] as const) {
			const configuration = configured({ version: 1, bindings: [
				{ scope: "file-tree", key, command },
				{ scope: "workspace", key, command: "save" },
			] })
			expect(resolveOrgInput({
				configuration, scope: "file-tree", current: null, input: event,
				now: 200, selectionEmpty: true, nextId: 1, owner, generation,
			})).toEqual({ ...idle, commandId: command, consumed: command !== null })
		}
	})
	it("supports explicit tree bindings, unbinding and custom prefix maps with authoritative hints", () => {
		const configuration = configured({ version: 1, bindings: [
			{ scope: "file-tree", key: "j", command: "file-tree.previous" },
			{ scope: "file-tree", key: "ArrowDown", command: null },
		], leaders: [{ scope: "file-tree", key: "y", map: "file-tree:y" }],
		transients: [{ id: "file-tree:y", label: "Link", scope: "file-tree", timeoutMs: null,
			bindings: [{ key: "x", command: "file-tree.copy-org-link" }] }] })
		const route = (event: OrgPrefixKeyInput, current: OrgPrefixSession | null = null) => resolveOrgInput({
			configuration, scope: "file-tree", current, input: event, now: 200, selectionEmpty: true, nextId: 1, owner, generation,
		})
		expect(route(input("j")).commandId).toBe("file-tree.previous")
		expect(route(input("ArrowDown"))).toEqual(idle)
		expect(route(input("x"), route(input("y")).session).commandId).toBe("file-tree.copy-org-link")
		expect(getOrgInputCommandKeys(configuration, "file-tree", "file-tree.copy-org-link")).toEqual(["y x"])
	})
	it("isolates file-tree and Source keys while inheriting workspace and application authority", () => {
		const configuration = configured({ version: 1, bindings: [
			{ scope: "file-tree", key: "j", command: "file-tree.delete" },
			{ scope: "org-source", key: "F11", command: "todo" },
			{ scope: "workspace", key: "A-s", command: "save" },
			{ scope: "application", key: "A-x", command: "execute-command" },
		] })
		const route = (scope: OrgKeymapScope, event: OrgPrefixKeyInput) => resolveOrgInput({
			configuration, scope, current: null, input: event, now: 200, selectionEmpty: true, nextId: 1, owner, generation,
		})
		expect(route("file-tree", input("j")).commandId).toBe("file-tree.delete")
		for (const scope of ["org-source", "workspace", "application", "org-agenda"] as const)
			expect(route(scope, input("j"))).toEqual(idle)
		expect(route("file-tree", input("F11"))).toEqual(idle)
		expect(route("file-tree", input("c", { ctrlKey: true }))).toEqual(idle)
		expect(route("file-tree", input("s", { altKey: true })).commandId).toBe("save")
		expect(route("file-tree", input("x", { altKey: true })).commandId).toBe("execute-command")
	})
	it("applies file-tree overrides and explicit unbinding before inherited commands", () => {
		const configuration = configured({ version: 1, bindings: [
			{ scope: "file-tree", key: "Mod-s", command: "file-tree.refresh" },
			{ scope: "file-tree", key: "A-x", command: null },
		] })
		const route = (event: OrgPrefixKeyInput) => resolveOrgInput({
			configuration, scope: "file-tree", current: null, input: event, now: 200, selectionEmpty: true, nextId: 1, owner, generation,
		})
		expect(route(input("s", { ctrlKey: true })).commandId).toBe("file-tree.refresh")
		expect(route(input("x", { altKey: true }))).toEqual(idle)
		expect(resolve(null, input("s", { ctrlKey: true }), 200, undefined, configuration).commandId).toBe("save")
		expect(resolve(null, input("x", { altKey: true }), 200, undefined, configuration).commandId).toBe("execute-command")
	})
	it("leases nested file-tree prefixes to the same scope, generation and owner", () => {
		const configuration = configured({ version: 1, leaders: [{ scope: "file-tree", key: "Space", map: "files" }], transients: [
			{ id: "files", label: "Files", scope: "file-tree", timeoutMs: null, bindings: [{ key: "c", map: "paths" }] },
			{ id: "paths", label: "Paths", scope: "file-tree", timeoutMs: 500, bindings: [{ key: "F12", command: "file-tree.copy-relative-path" }] },
		] })
		const options = { configuration, scope: "file-tree" as OrgKeymapScope, current: null as OrgPrefixSession | null,
			input: input(" "), now: 200, selectionEmpty: true, nextId: 1, owner, generation }
		const prefix = resolveOrgInput(options).session
		expect(prefix).toMatchObject({ label: "Files", expiresAt: null })
		const child = resolveOrgInput({ ...options, current: prefix, input: input("c") }).session
		expect(child).toMatchObject({ label: "Paths", expiresAt: 700, bindings: [{ keyLabel: "F12", commandId: "file-tree.copy-relative-path", label: "Copy relative file path" }] })
		const suffix = { ...options, current: child, input: input("F12") }
		expect(resolveOrgInput(suffix).commandId).toBe("file-tree.copy-relative-path")
		for (const replacement of [{ generation: {} }, { owner: {} }, { scope: "org-source" as const }, { scope: "workspace" as const }, { now: 700 }])
			expect(resolveOrgInput({ ...suffix, ...replacement })).toEqual(idle)
	})
	it.each([{ isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }, { repeat: true }, { altGraphKey: true }, { isParameterInput: true }])("protects file-tree commands and prefixes from owned input %j", (overrides) => {
		const configuration = configured({ version: 1, bindings: [{ scope: "file-tree", key: "x", command: "refresh" }],
			leaders: [{ scope: "file-tree", key: "Space", map: "files" }],
			transients: [{ id: "files", label: "Files", scope: "file-tree", timeoutMs: null, bindings: [{ key: "F12", command: "refresh" }] }] })
		const options = { configuration, scope: "file-tree" as const, current: null as OrgPrefixSession | null,
			input: input(" "), now: 200, selectionEmpty: true, nextId: 1, owner, generation }
		const prefix = resolveOrgInput(options).session
		for (const [current, event] of [
			[null, input("x")], [null, input(" ")], [prefix, input("F12")],
			[null, input("F2")], [null, input("Delete")], [null, input("F5")],
			[null, input("f", { ctrlKey: true })], [null, input("f", { metaKey: true })],
		] as const) {
			expect(resolveOrgInput({ ...options, current, input: { ...event, ...overrides } })).toEqual({
				...idle, protected: true, consumed: "repeat" in overrides && current === null,
			})
		}
	})
})

describe("getOrgInputCommandKeys", () => {
	it("shows only current reachable bindings, including nested prefixes and excluding unbound or shadowed keys", () => {
		const configuration = configured({ version: 1, bindings: [
			{ scope: "application", key: "F12", command: "tags" },
			{ scope: "file-tree", key: "F12", command: null },
			{ scope: "file-tree", key: "A-l", command: "tags" },
		], leaders: [{ scope: "file-tree", key: "C-l", map: "files" }], transients: [
			{ id: "files", label: "Files", scope: "file-tree", timeoutMs: null, bindings: [{ key: "y", map: "paths" }] },
			{ id: "paths", label: "Paths", scope: "file-tree", timeoutMs: null, bindings: [{ key: "r", command: "tags" }, { key: "x", map: "files" }] },
		] })
		expect([...getOrgInputCommandKeys(configuration, "file-tree", "tags")].sort()).toEqual(["A-l", "C-l y r"])
		expect(getOrgInputCommandKeys(configuration, "application", "tags")).toEqual(["F12"])
		expect(getOrgInputCommandKeys(configuration, "org-source", "tags")).not.toContain("A-l")
		expect(getOrgInputCommandKeys(configuration, "file-tree", "todo")).toEqual([])
		expect(getOrgInputCommandKeys(null, "file-tree", "tags")).toEqual([])
	})
	it("reflects remapped and removed leaders without advertising unreachable cancellation suffixes", () => {
		const transients = [{ id: "files", label: "Files", scope: "file-tree", timeoutMs: null,
			bindings: [{ key: "Escape", command: "tags" }, { key: "t", command: "tags" }] }]
		const remapped = configured({ version: 1, bindings: [{ scope: "file-tree", key: "C-l", command: null }],
			leaders: [{ scope: "file-tree", key: "A-l", map: "files" }], transients })
		expect(getOrgInputCommandKeys(remapped, "file-tree", "tags")).toEqual(["A-l t"])
		const unbound = configured({ version: 1, bindings: [{ scope: "file-tree", key: "A-l", command: null }], transients })
		expect(getOrgInputCommandKeys(unbound, "file-tree", "tags")).toEqual([])
	})
})
