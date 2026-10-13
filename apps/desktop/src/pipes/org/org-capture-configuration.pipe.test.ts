import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import { parseOrgCaptureConfiguration } from "./org-capture-configuration.pipe"

const template = {
	id: "work-note",
	label: "Work note",
	entryType: "entry",
	target: { kind: "heading", relativePath: "work/inbox.org", headingPath: ["Work", "Inbox"] },
	source: "* %^{Title|Note}\n%u\n%i\n%?",
}
const configuration = { version: 1, templates: [template], draftRecovery: false }
const parse = (value: unknown) => parseOrgCaptureConfiguration(JSON.stringify(value))

// These boundaries are shared by settings, native Capture, and recovery permission decisions.
describe("Capture configuration parsing", () => {

	it.each(["{", "not JSON", "null", "[]", '"default"'])("rejects malformed or non-object override %j without fallback", (raw) => {
		expect(E.isLeft(parseOrgCaptureConfiguration(raw))).toBe(true)
	})

	it.each([undefined, null, 42, { version: 1 }])("diagnoses a corrupted persisted non-text override %j", (value) => {
		const result = parseOrgCaptureConfiguration(value as unknown as string)
		expect(E.isLeft(result) && result.left.message.includes("JSON text")).toBe(true)
	})

	it.each([
		{ ...configuration, version: 2 },
		{ ...configuration, version: "1" },
		{ templates: [template], draftRecovery: false },
		{ version: 1, templates: [template] },
		{ ...configuration, draftRecovery: "true" },
		{ ...configuration, draftRecovery: null },
		{ ...configuration, templates: {} },
		{ ...configuration, shell: "capture" },
	])("rejects open fields, missing fields and wrong version/permission types: %j", (value) => {
		expect(E.isLeft(parse(value))).toBe(true)
	})

	it("rejects repeated IDs instead of silently choosing a destination", () => {
		const result = parse({ ...configuration, templates: [template, {
			...template, label: "Different target", target: { kind: "file", relativePath: "other.org" },
		}] })
		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) expect(result.left.message).toContain(template.id)
	})

	it.each([
		{ ...template, id: "" },
		{ ...template, label: " " },
		{ ...template, entryType: "eval" },
		{ ...template, entryType: "checkitem", source: "* A heading" },
		{ ...template, entryType: "table-line", source: "- A list item" },
		{ ...template, source: "body without an entry heading" },
		{ ...template, source: "* %(shell-command evil)" },
		{ ...template, source: "* %[secret.org]" },
		{ ...template, source: "* %^{Title}p" },
		{ ...template, source: "* %<%Q>" },
		{ ...template, source: "* %\\2" },
		{ ...template, source: "* %^{Unclosed" },
		{ ...template, function: "run" },
		{ ...template, target: { kind: "file", relativePath: "../secret.org" } },
		{ ...template, target: { kind: "file", relativePath: "/secret.org" } },
		{ ...template, target: { kind: "file", relativePath: "safe.org", headingPath: ["Extra"] } },
		{ ...template, target: { kind: "heading", relativePath: "safe.org", headingPath: [] } },
		{ ...template, target: { kind: "heading", relativePath: "safe.org", headingPath: ["One\nTwo"] } },
		{ ...template, target: { kind: "datetree", relativePath: "safe.org", date: "2026-10-07" } },
	])("rejects unsafe template grammar and incompatible target/source fields: %j", (value) => {
		const result = parse({ ...configuration, templates: [value] })
		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) expect(result.left.message).toContain("template 1")
	})

	it("accepts declarative prompts, heading/datetree targets and the declared body entry types", () => {
		const value = {
			version: 1,
			draftRecovery: true,
			templates: [
				template,
				{ ...template, id: "daily", target: { kind: "datetree", relativePath: "journal.org", headingPath: ["Journal"] } },
				{ ...template, id: "body", entryType: "plain", source: "%a\n%?", target: { kind: "file", relativePath: "inbox.org" } },
				{ ...template, id: "list", entryType: "item", source: "- %^{Title|Item} %?" },
				{ ...template, id: "check", entryType: "checkitem", source: "- [ ] %^{Task|Task} %?" },
				{ ...template, id: "row", entryType: "table-line", source: "| %^{Cell|Cell} | %? |" },
			],
		}
		expect(parse(value)).toEqual(E.right(value))
	})
})
