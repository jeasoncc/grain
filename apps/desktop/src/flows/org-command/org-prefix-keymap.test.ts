import { describe, expect, it } from "vitest"
import * as E from "fp-ts/Either"
import type { OrgPrefixKeyInput, OrgPrefixSession, OrgKeymapConfiguration } from "@/types/editor/org-keymap.interface"
import { parseOrgKeymapConfiguration, DEFAULT_ORG_KEYMAP_CONFIGURATION } from "@/pipes/org/org-keymap-configuration.pipe"
import { MAX_ORG_PREFIX_TIMEOUT_MS, ORG_PREFIX_BINDINGS, ORG_EXTRA_PREFIX_BINDINGS, ORG_PREFIX_TIMEOUT_MS, resolveOrgInput } from "./org-prefix-keymap"

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
})
