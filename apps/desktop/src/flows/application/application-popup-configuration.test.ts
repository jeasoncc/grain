import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import { parseApplicationPopupConfiguration, resolveApplicationPopupRule } from "./application-popup-configuration"

describe("declarative application tool placement", () => {
	it.each([
		{ version: 2, rules: [] }, { version: 1, rules: [], permissions: true },
		{ version: 1, rules: [{ id: "capture", prefix: "babel:", layout: "side" }] },
		{ version: 1, rules: [{ prefix: "*", layout: "side" }] },
		{ version: 1, rules: [{ id: "cap*", layout: "side" }] },
		{ version: 1, rules: [{ id: "capture", layout: "top" }] },
		{ version: 1, rules: [{ id: "capture", layout: "side", size: {} }] },
		{ version: 1, rules: [{ id: "capture", layout: "side", size: { widthPercent: 9 } }] },
		{ version: 1, rules: [{ id: "capture", layout: "side", size: { heightPercent: 91 } }] },
		{ version: 1, rules: [{ id: "capture", layout: "side", size: { widthPercent: 35.5 } }] },
		{ version: 1, rules: [{ id: "capture", layout: "side", size: { widthPercent: 35, discard: true } }] },
		{ version: 1, rules: [{ id: "capture", layout: "side" }, { id: "capture", layout: "bottom" }] },
	])("rejects closed-schema or unbounded placement %#", (value) => {
		expect(E.isLeft(parseApplicationPopupConfiguration(JSON.stringify(value)))).toBe(true)
	})
	it("uses literal exact matches before bounded families, never matching adjacent IDs", () => {
		const parsed = parseApplicationPopupConfiguration(JSON.stringify({ version: 1, rules: [{ prefix: "babel:", layout: "side" }, { id: "babel:42", layout: "popup", size: { widthPercent: 10, heightPercent: 90 } }] }))
		if (E.isLeft(parsed)) throw new Error(parsed.left.message)
		expect(resolveApplicationPopupRule(parsed.right, "babel:42")).toMatchObject({ layout: "popup", size: { widthPercent: 10, heightPercent: 90 } })
		expect(resolveApplicationPopupRule(parsed.right, "babel:43")?.layout).toBe("side")
		expect(resolveApplicationPopupRule(parsed.right, "babel:")).toBeUndefined()
		expect(resolveApplicationPopupRule(parsed.right, "babelish:42")).toBeUndefined()
		expect(resolveApplicationPopupRule(parsed.right, "org-roam")).toBeUndefined()
	})
})
