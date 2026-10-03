import { describe, expect, it } from "vitest"
import type { OrgPrefixKeyInput, OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import {
	MAX_ORG_PREFIX_TIMEOUT_MS,
	ORG_EXTRA_PREFIX_BINDINGS,
	ORG_PREFIX_BINDINGS,
	ORG_PREFIX_MAPS,
	ORG_PREFIX_TIMEOUT_MS,
	resolveOrgPrefixKey,
} from "./org-prefix-keymap"

const input = (key: string, overrides: Partial<OrgPrefixKeyInput> = {}): OrgPrefixKeyInput => ({
	key,
	ctrlKey: false,
	altKey: false,
	metaKey: false,
	shiftKey: false,
	isComposing: false,
	keyCode: 0,
	defaultPrevented: false,
	...overrides,
})
const idle = { session: null, commandId: null, consumed: false }
const start = (timeoutMs: number | null = ORG_PREFIX_TIMEOUT_MS): OrgPrefixSession => {
	const result = resolveOrgPrefixKey(null, input("c", { ctrlKey: true }), 100, true, 7, timeoutMs)
	if (!result.session) throw new Error("Expected prefix session")
	return result.session
}

describe("resolveOrgPrefixKey", () => {
	it("starts an empty-selection C-c session with caller identity and shared bindings", () => {
		const result = resolveOrgPrefixKey(null, input("C", { ctrlKey: true }), 100, true, 7)
		expect(result).toEqual({
			session: {
				id: 7,
				label: "C-c",
				expiresAt: null,
				bindings: ORG_PREFIX_BINDINGS,
			},
			commandId: null,
			consumed: true,
		})
		expect(result.session?.bindings).toBe(ORG_PREFIX_BINDINGS)
		expect(
			new Set(
				ORG_PREFIX_BINDINGS.flatMap((binding) =>
					binding.commandId === undefined ? [] : [binding.commandId],
				),
			).size,
		).toBe(11)
		expect(ORG_PREFIX_BINDINGS.every((binding) => binding.label && binding.keyLabel)).toBe(true)
	})

	it.each([
		["t", true, "todo"],
		["c", true, "checkbox"],
		["o", true, "link"],
		["q", true, "tags"],
		["s", true, "scheduled"],
		["d", true, "deadline"],
		["p", true, "property"],
		["w", true, "refile"],
		[".", false, "timestamp-active"],
		["!", false, "timestamp-inactive"],
	] as const)("routes suffix %s (ctrl=%s)", (key, ctrlKey, commandId) => {
		expect(resolveOrgPrefixKey(start(), input(key, { ctrlKey }), 200, true, 8)).toEqual({
			session: null,
			commandId,
			consumed: true,
		})
	})

	it("uses shared, valid maps with exclusive command or prefix bindings", () => {
		expect(ORG_PREFIX_MAPS["C-c"]).toBe(ORG_PREFIX_BINDINGS)
		expect(ORG_PREFIX_MAPS["C-c C-x"]).toBe(ORG_EXTRA_PREFIX_BINDINGS)
		for (const bindings of Object.values(ORG_PREFIX_MAPS)) {
			expect(new Set(bindings.map((binding) => binding.keyLabel)).size).toBe(bindings.length)
			for (const binding of bindings) {
				expect(Boolean(binding.commandId) !== Boolean(binding.prefixLabel)).toBe(true)
				if (binding.prefixLabel) expect(ORG_PREFIX_MAPS[binding.prefixLabel]).toBeDefined()
			}
		}
	})

	it.each([
		null,
		1200,
		0,
	])("transitions to child with timeout %s and caller identity", (timeoutMs) => {
		const parent = Object.freeze(start())
		const result = resolveOrgPrefixKey(
			parent,
			input("x", { ctrlKey: true }),
			200,
			false,
			8,
			timeoutMs,
		)
		expect(result).toEqual({
			session: {
				id: 8,
				label: "C-c C-x",
				expiresAt: timeoutMs === null ? null : 200 + timeoutMs,
				bindings: ORG_EXTRA_PREFIX_BINDINGS,
			},
			commandId: null,
			consumed: true,
		})
		expect(result.session?.bindings).toBe(ORG_EXTRA_PREFIX_BINDINGS)
		expect(parent.label).toBe("C-c")
	})

	it("routes using the current bindings rather than root bindings", () => {
		const child = resolveOrgPrefixKey(start(), input("x", { ctrlKey: true }), 200, true, 8).session
		expect(child).not.toBeNull()
		expect(resolveOrgPrefixKey(child, input("a", { ctrlKey: true }), 300, true, 9)).toEqual({
			session: null,
			commandId: "archive",
			consumed: true,
		})
		for (const event of [
			input("t", { ctrlKey: true }),
			input("c", { ctrlKey: true }),
			input("x"),
		]) {
			expect(resolveOrgPrefixKey(child, event, 300, true, 9)).toEqual(idle)
		}
		for (const event of [input("Escape"), input("g", { ctrlKey: true })]) {
			expect(resolveOrgPrefixKey(child, event, 300, true, 9)).toEqual({ ...idle, consumed: true })
		}
		for (const key of ["Control", "Shift", "Alt", "Meta", "AltGraph"]) {
			expect(resolveOrgPrefixKey(child, input(key), 300, true, 9).session).toBe(child)
		}
		for (const overrides of [{ isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }]) {
			expect(
				resolveOrgPrefixKey(child, input("a", { ctrlKey: true, ...overrides }), 300, true, 9),
			).toEqual(idle)
		}
	})

	it("falls through for missing child maps without mutating the session", () => {
		const session: OrgPrefixSession = Object.freeze({
			...start(),
			bindings: Object.freeze([{ keyLabel: "C-x", label: "Missing", prefixLabel: "missing" }]),
		})
		expect(resolveOrgPrefixKey(session, input("x", { ctrlKey: true }), 200, true, 8)).toEqual(idle)
		expect(session.bindings[0].prefixLabel).toBe("missing")
	})

	it("renews child expiry from transition time and expires at the deadline", () => {
		const child = resolveOrgPrefixKey(
			start(1200),
			input("x", { ctrlKey: true }),
			1200,
			true,
			8,
			1200,
		).session
		expect(child?.expiresAt).toBe(2400)
		expect(resolveOrgPrefixKey(child, input("a", { ctrlKey: true }), 2399, true, 9).commandId).toBe(
			"archive",
		)
		expect(resolveOrgPrefixKey(child, input("a", { ctrlKey: true }), 2400, true, 9)).toEqual(idle)
		expect(resolveOrgPrefixKey(child, input("Control"), 2400, true, 9)).toEqual(idle)
		for (const timeout of [-1, NaN, Infinity, -Infinity]) {
			expect(
				resolveOrgPrefixKey(start(), input("x", { ctrlKey: true }), 200, true, 8, timeout),
			).toEqual(idle)
		}
	})

	it.each(["w", "x"])("leaves standalone Ctrl-%s native", (key) => {
		expect(resolveOrgPrefixKey(null, input(key, { ctrlKey: true }), 200, true, 8)).toEqual(idle)
	})

	it("keeps native selected copy at idle, but active C-c toggles checkbox", () => {
		expect(resolveOrgPrefixKey(null, input("c", { ctrlKey: true }), 200, false, 8)).toEqual(idle)
		expect(resolveOrgPrefixKey(start(), input("c", { ctrlKey: true }), 200, false, 8)).toEqual({
			session: null,
			commandId: "checkbox",
			consumed: true,
		})
	})

	it.each([
		{ altKey: true },
		{ metaKey: true },
		{ shiftKey: true },
		{ ctrlKey: false },
	])("rejects modified prefix %j", (overrides) => {
		expect(
			resolveOrgPrefixKey(null, input("c", { ctrlKey: true, ...overrides }), 200, true, 8),
		).toEqual(idle)
	})

	it.each(["Control", "Shift", "Alt", "Meta", "AltGraph"])("preserves prefix for %s", (key) => {
		const session = Object.freeze(start())
		const result = resolveOrgPrefixKey(session, input(key), 200, true, 8)
		expect(result).toEqual({ ...idle, session })
		expect(result.session).toBe(session)
	})

	it("accepts shifted suffix letters and shifted exclamation punctuation", () => {
		expect(
			resolveOrgPrefixKey(start(), input("T", { ctrlKey: true, shiftKey: true }), 200, true, 8)
				.commandId,
		).toBe("todo")
		expect(
			resolveOrgPrefixKey(start(), input("!", { shiftKey: true }), 200, true, 8).commandId,
		).toBe("timestamp-inactive")
	})

	it.each([
		input("x"),
		input("t"),
		input("c"),
		input(".", { ctrlKey: true }),
		input("!", { ctrlKey: true }),
		input("t", { ctrlKey: true, altKey: true }),
		input("t", { ctrlKey: true, metaKey: true }),
	])("clears unknown/modified suffix and falls through: %j", (event) => {
		expect(resolveOrgPrefixKey(start(), event, 200, true, 8)).toEqual(idle)
	})

	it.each([
		input("Escape"),
		input("g", { ctrlKey: true }),
	])("consumes cancellation: %j", (event) => {
		expect(resolveOrgPrefixKey(start(), event, 200, true, 8)).toEqual({ ...idle, consumed: true })
		expect(resolveOrgPrefixKey(null, event, 200, true, 8)).toEqual(idle)
	})
	it.each([
		input("g"),
		input("g", { ctrlKey: true, altKey: true }),
		input("g", { ctrlKey: true, metaKey: true }),
	])("does not consume a non-cancel key: %j", (event) => {
		expect(resolveOrgPrefixKey(start(), event, 200, true, 8)).toEqual(idle)
	})

	it.each([
		{ isComposing: true },
		{ keyCode: 229 },
		{ defaultPrevented: true },
	])("ignores protected events and clears prefix: %j", (overrides) => {
		for (const current of [null, start()]) {
			expect(
				resolveOrgPrefixKey(current, input("c", { ctrlKey: true, ...overrides }), 200, true, 8),
			).toEqual(idle)
		}
	})

	it("keeps the default prefix active after a long idle", () => {
		const session = start()
		expect(ORG_PREFIX_TIMEOUT_MS).toBeNull()
		expect(resolveOrgPrefixKey(session, input("Control"), 1_000_000, true, 8)).toEqual({
			...idle,
			session,
		})
		expect(resolveOrgPrefixKey(session, input("t", { ctrlKey: true }), 1_000_000, true, 8)).toEqual(
			{ session: null, commandId: "todo", consumed: true },
		)
	})

	it.each([
		-1,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	])("rejects invalid timeout %s without consuming the prefix", (timeoutMs) => {
		expect(
			resolveOrgPrefixKey(null, input("c", { ctrlKey: true }), 100, true, 7, timeoutMs),
		).toEqual(idle)
	})

	it.each([
		MAX_ORG_PREFIX_TIMEOUT_MS + 1,
		Number.MAX_VALUE,
	])("rejects finite timer overflow %s at root and child prefixes", (timeoutMs) => {
		for (const [session, key] of [
			[null, "c"],
			[start(), "x"],
		] as const) {
			expect(
				resolveOrgPrefixKey(session, input(key, { ctrlKey: true }), 200, true, 8, timeoutMs),
			).toEqual(idle)
		}
	})

	it("accepts the exact maximum timer duration at root and child prefixes", () => {
		const root = start(MAX_ORG_PREFIX_TIMEOUT_MS)
		expect(root.expiresAt).toBe(100 + MAX_ORG_PREFIX_TIMEOUT_MS)
		const child = resolveOrgPrefixKey(
			root,
			input("x", { ctrlKey: true }),
			200,
			true,
			8,
			MAX_ORG_PREFIX_TIMEOUT_MS,
		)
		expect(child.consumed).toBe(true)
		expect(child.session).toMatchObject({
			label: "C-c C-x",
			expiresAt: 200 + MAX_ORG_PREFIX_TIMEOUT_MS,
		})
	})

	it("accepts zero timeout with immediate expiry", () => {
		const session = start(0)
		expect(session.expiresAt).toBe(100)
		expect(resolveOrgPrefixKey(session, input("t", { ctrlKey: true }), 100, true, 8)).toEqual(idle)
	})

	it("expires at the exact deadline and falls back to idle routing", () => {
		const session = start(1200)
		expect(
			resolveOrgPrefixKey(session, input("t", { ctrlKey: true }), 1299, true, 8).commandId,
		).toBe("todo")
		for (const now of [1300, 1301, 5000]) {
			expect(resolveOrgPrefixKey(session, input("t", { ctrlKey: true }), now, true, 8)).toEqual(
				idle,
			)
			expect(resolveOrgPrefixKey(session, input("Control"), now, true, 8)).toEqual(idle)
			expect(resolveOrgPrefixKey(session, input("Escape"), now, true, 8)).toEqual(idle)
			expect(resolveOrgPrefixKey(session, input("c", { ctrlKey: true }), now, false, 8)).toEqual(
				idle,
			)
			const restarted = resolveOrgPrefixKey(
				session,
				input("c", { ctrlKey: true }),
				now,
				true,
				8,
				1200,
			)
			expect(restarted.session).toEqual({ ...session, id: 8, expiresAt: now + 1200 })
			expect(restarted.consumed).toBe(true)
			expect(restarted.commandId).toBeNull()
		}
	})

	it("does not handle suffixes without a prefix or mutate its inputs", () => {
		const session = Object.freeze(start())
		const event = Object.freeze(input("t", { ctrlKey: true }))
		expect(resolveOrgPrefixKey(null, event, 200, true, 8)).toEqual(idle)
		expect(resolveOrgPrefixKey(session, event, 200, true, 8)).toEqual(
			resolveOrgPrefixKey(session, event, 200, true, 8),
		)
		expect(session.expiresAt).toBeNull()
	})
})
