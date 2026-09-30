import { describe, expect, it } from "vitest"
import { orgPropertyBufferCommand as command } from "./org-property.command"
import { orgPropertyDrawerAt, setOrgPropertyAt } from "@/pipes/org/org-text.pipe"
const context = (content: string, cursor = 2) => ({ relativePath: "note.org", content, cursor })
const apply = (content: string, input: string) => {
	const origin = context(content)
	const result = command.execute(origin, origin, input)
	if (result.kind !== "edit") throw new Error(`Expected edit, got ${result.kind}`)
	return content.slice(0, result.edit.from) + result.edit.insert + content.slice(result.edit.to)
}

describe("property buffer command", () => {
	it("offers existing properties and prefills the ID instead of clearing it", () => {
		const content =
			"* Note\nSCHEDULED: <2026-09-30>\n:PROPERTIES:\n:ID: abc\n:CUSTOM_ID: 中文\n:END:\nbody"
		expect(command.prepare(context(content))).toMatchObject({
			kind: "ready",
			initialInput: "ID=abc",
			candidates: ["ID=abc", "CUSTOM_ID=中文"],
		})
		expect(command.execute(context(content), context(content), "id=abc")).toMatchObject({
			kind: "no-change",
		})
	})
	it.each([
		"\n",
		"\r\n",
		"\r",
	])("preserves %j and local whitespace while setting a case-insensitive key", (newline) => {
		const content = [
			"* 中文",
			":PROPERTIES:",
			"  :custom_id:  old  ",
			"unknown syntax",
			":END:",
			"body\u0000",
		].join(newline)
		expect(apply(content, "CUSTOM_ID=new=value")).toBe(content.replace("old", "new=value"))
	})
	it("inserts a drawer after planning and before the original body", () => {
		expect(apply("* Note\r\nSCHEDULED: <2026-09-30>\r\nbody", "ID=abc")).toBe(
			"* Note\r\nSCHEDULED: <2026-09-30>\r\n:PROPERTIES:\r\n:ID: abc\r\n:END:\r\nbody",
		)
	})
	it("sets an empty value rather than removing the property", () => {
		expect(apply("* Note\n:PROPERTIES:\n:ID: abc\n:END:", "ID=")).toBe(
			"* Note\n:PROPERTIES:\n:ID: \n:END:",
		)
	})
	it.each([
		"ID",
		"=value",
		"BAD KEY=value",
		"key:value=x",
		"ID=a\nb",
	])("rejects invalid input %j", (input) => {
		const origin = context("* Note")
		expect(command.execute(origin, origin, input)).toMatchObject({ reason: "invalid-property" })
	})
	it.each([
		"* Note\n:PROPERTIES:\n:ID: abc",
		"* Note\n:PROPERTIES:\n:ID: abc\n** Child\n:END:",
		"* Note\n:PROPERTIES:\n:ID: abc\n:id: other\n:END:",
		"* Note\n:PROPERTIES:\n:ID: abc\n:PROPERTIES:\n:END:",
	])("rejects malformed drawer even when the requested key exists", (content) => {
		const origin = context(content)
		expect(orgPropertyDrawerAt(content, 2)).toMatchObject({ kind: "invalid" })
		expect(command.prepare(origin)).toMatchObject({ reason: "invalid-drawer" })
		expect(command.execute(origin, origin, "ID=new")).toMatchObject({ reason: "invalid-drawer" })
		expect(setOrgPropertyAt(content, 2, "ID", "new")).toBeNull()
	})
	it.each([
		"PROPERTIES",
		"properties",
		"END",
		"end",
	])("rejects reserved drawer key %s at command and writer boundaries", (key) => {
		const origin = context("* Note")
		expect(command.execute(origin, origin, `${key}=`)).toMatchObject({ reason: "invalid-property" })
		expect(() => setOrgPropertyAt(origin.content, 2, key, "")).toThrow("reserved")
	})
	it("keeps a new drawer adjacent to a heading with a terminal lone CR", () => {
		const output = apply("* Note\r", "ID=abc")
		expect(output).toBe("* Note\r:PROPERTIES:\r:ID: abc\r:END:\r")
		expect(command.prepare(context(output))).toMatchObject({ initialInput: "ID=abc" })
	})

	it("rejects stale content and protects block contents", () => {
		const origin = context("* Note")
		expect(command.execute(origin, { ...origin, content: "* Changed" }, "ID=abc")).toMatchObject({
			reason: "content-changed",
		})
		const content = "* Note\n#+begin_src org\n* Fake\n#+end_src"
		expect(command.prepare(context(content, content.indexOf("Fake")))).toMatchObject({
			reason: "inside-block",
		})
	})
})
