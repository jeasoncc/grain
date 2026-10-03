import { describe, expect, it } from "vitest"
import {
	executeOrgArchiveCommand,
	executeOrgRefileCommand,
	prepareOrgArchiveCommand,
	prepareOrgRefileCommand,
} from "./org-refile.command"
import { extractOrgSubtreeAt } from "@/pipes/org/org-subtree-refile.pipe"
const context = (content = "* Note\nbody", cursor = 2) => ({
	relativePath: "notes.org",
	content,
	cursor,
})
describe("subtree transfer parameters", () => {
	it("completes safe targets excluding source aliases", () => {
		expect(
			prepareOrgRefileCommand(context(), [
				"notes.org",
				"NOTES.org",
				"../bad.org",
				"inbox.org",
				"projects/grain.org",
			]),
		).toMatchObject({
			kind: "ready",
			candidates: ["notes.org", "inbox.org", "projects/grain.org"],
			initialInput: "inbox.org",
		})
	})
	it.each([
		"café.org",
		"cafe\u0301.org",
	])("keeps exact canonical source %s once even when absent from listing", (relativePath) => {
		const source = { ...context(), relativePath }
		const alias = relativePath === "café.org" ? "cafe\u0301.org" : "café.org"
		for (const paths of [[], [alias, relativePath, relativePath, "CAFÉ.org", "other.org"]]) {
			const plan = prepareOrgRefileCommand(source, paths)
			expect(plan).toMatchObject({
				kind: "ready",
				candidates: paths.length ? [relativePath, "other.org"] : [relativePath],
			})
		}
		expect(executeOrgRefileCommand(source, source, relativePath)).toMatchObject({ kind: "local" })
		for (const input of [alias, "CAFÉ.org"])
			expect(executeOrgRefileCommand(source, source, input)).toMatchObject({
				kind: "rejected",
				reason: "same-document",
			})
	})
	it.each([
		"",
		"../bad.org",
		"/tmp/file.org",
		"folder\\file.org",
		"file.txt",
		"NOTES.org",
	])("rejects unsafe or same-source target %j", (input) => {
		const source = context()
		expect(executeOrgRefileCommand(source, source, input)).toMatchObject({ kind: "rejected" })
	})
	it("routes only the exact source into the local protocol", () => {
		const source = context()
		expect(executeOrgRefileCommand(source, source, "notes.org")).toEqual({
			kind: "local",
			targetRelativePath: "notes.org",
		})
	})
	it("permits a safe new target and rejects stale origin", () => {
		const source = context()
		expect(executeOrgRefileCommand(source, source, "new.org")).toEqual({
			kind: "transfer",
			targetRelativePath: "new.org",
		})
		expect(
			executeOrgRefileCommand(source, { ...source, content: "* Changed" }, "new.org"),
		).toMatchObject({ reason: "content-changed" })
	})
	it("requires the heading line, not its body or a source block", () => {
		expect(prepareOrgRefileCommand(context("* Note\nbody", 9), [])).toMatchObject({
			reason: "no-subtree",
		})
		const text = "* Real\n#+begin_src\n* Fake\n#+end_src"
		expect(prepareOrgRefileCommand(context(text, text.indexOf("Fake")), [])).toMatchObject({
			reason: "inside-block",
		})
	})
	it.each([
		"\n",
		"\r\n",
		"\r",
	])("keeps fake headings and mismatched end markers inside a complete %j subtree", (newline) => {
		const text = [
			"* Real",
			"#+begin_src org",
			"#+end_example",
			"* Fake",
			"#+end_src",
			"** Child",
			"body",
			"* Next",
		].join(newline)
		expect(extractOrgSubtreeAt(text, 2)?.text).toBe(text.slice(0, text.indexOf("* Next")))
		expect(extractOrgSubtreeAt(text, text.indexOf("Fake"))).toBeNull()
	})
	it("requires explicit yes confirmation for archive and defaults to no", () => {
		const source = context()
		expect(prepareOrgArchiveCommand(source)).toMatchObject({
			initialInput: "no",
			candidates: ["yes", "no"],
		})
		expect(executeOrgArchiveCommand(source, source, "no")).toEqual({ kind: "cancel" })
		expect(executeOrgArchiveCommand(source, source, "yes")).toEqual({ kind: "transfer" })
		expect(executeOrgArchiveCommand(source, source, "")).toMatchObject({
			reason: "confirmation-required",
		})
	})
})
