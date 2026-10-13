import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import { parseOrgKeymapConfiguration, DEFAULT_ORG_KEYMAP_CONFIGURATION } from "./org-keymap-configuration.pipe"

const parse = (value: unknown) => parseOrgKeymapConfiguration(JSON.stringify(value))
const transient = { id: "planning", label: "Planning", scope: "org-source", timeoutMs: null, bindings: [{ key: "s", command: "scheduled" }] }

describe("parseOrgKeymapConfiguration", () => {
	it("uses existing defaults only for blank text", () => {
		expect(parseOrgKeymapConfiguration(" \n")).toEqual(E.right(DEFAULT_ORG_KEYMAP_CONFIGURATION))
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
	it("merges by key identity and projects labels from the command authority", () => {
		const result = parse({ version: 1, bindings: [{ scope: "org-source", key: "S-Mod-x", command: "todo" }], leaders: [{ scope: "org-source", key: "C-l", map: "planning" }], transients: [transient] })
		if (E.isLeft(result)) throw new Error(result.left.message)
		expect(result.right.bindings.filter((binding) => binding.scope === "org-source" && binding.command === "checkbox")).toEqual([])
		expect(result.right.maps.planning.bindings).toEqual([{ keyLabel: "s", commandId: "scheduled", label: "Schedule" }])
		expect(Object.isFrozen(result.right)).toBe(true)
		expect(Object.isFrozen(result.right.maps.planning.bindings)).toBe(true)
	})
})
