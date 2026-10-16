import { describe, expect, it } from "vitest"
import { parseConfigurationDocument } from "./configuration-document.pipe"

const parse = (value: unknown) => parseConfigurationDocument(JSON.stringify(value))

const source = "* TODO Café 🪷\r\n  中文 e\u0301\r\n%?\r\n"
const capture = {
	version: 1,
	draftRecovery: false,
	templates: [{
		id: "inbox",
		label: "Inbox",
		entryType: "entry",
		target: { kind: "file", relativePath: "inbox.org" },
		source,
	}],
}

describe("configuration document boundary", () => {
	it.each([
		{ version: 1, saving: { autoSave: true }, capture: { ...capture, draftRecovery: "false" } },
		{ version: 1, saving: { autoSave: true }, capture: { ...capture, templates: [{ ...capture.templates[0], target: { kind: "file", relativePath: "../private.org" } }] } },
		{ version: 1, saving: { autoSave: true }, tools: { version: 1, rules: [{ id: "agenda", layout: "floating" }] } },
	])("rejects the whole document rather than accepting valid saving preferences beside an invalid domain: %j", (value) => {
		expect(() => parse(value)).toThrow(/capture|tools/)
	})

	it.each([
		{ version: 1, autosave: true },
		{ version: 1, saving: { autoSave: true, interval: 2 } },
		{ version: 1, font: { source: { fontSize: 18 } } },
	])("rejects unknown fields instead of silently discarding a user's edit: %j", (value) => {
		expect(() => parse(value)).toThrow(/\$|saving|font\.source/)
	})

	it("preserves literal CRLF, combining marks and Unicode in inline capture source", () => {
		expect(parse({ version: 1, capture }).capture.templates[0].source).toBe(source)
	})

	it("does not grant plaintext recovery consent when capture is omitted", () => {
		expect(parse({ version: 1 }).capture.draftRecovery).toBe(false)
		expect(parse({ version: 1, capture }).capture.draftRecovery).toBe(false)
		expect(parse({ version: 1, capture: { ...capture, draftRecovery: true } }).capture.draftRecovery).toBe(true)
	})

	it.each([
		{ version: 2 },
		{ version: "1" },
		{ version: 1, saving: { autoSave: "false" } },
		{ version: 1, saving: { autoSaveInterval: 1.5 } },
	])("rejects unsupported versions and coercible preference types: %j", (value) => {
		expect(() => parse(value)).toThrow(/version|saving/)
	})

	it("rejects malformed JSON rather than salvaging an earlier section", () => {
		expect(() => parseConfigurationDocument('{"version":1,"saving":{"autoSave":true},')).toThrow(/JSON/)
	})
})
