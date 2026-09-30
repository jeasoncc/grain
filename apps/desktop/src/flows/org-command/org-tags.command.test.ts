import { describe, expect, it } from "vitest"
import {
	executeOrgTagsCommand,
	type OrgTagsCommandContext,
	prepareOrgTagsCommand,
} from "./org-tags.command"

const context = (content: string, cursor = content.length): OrgTagsCommandContext => ({
	relativePath: "notes/test.org",
	content,
	cursor,
})
const apply = (source: OrgTagsCommandContext, input: string) => {
	const result = executeOrgTagsCommand(source, source, input)
	expect(result.kind).toBe("edit")
	if (result.kind !== "edit") throw new Error("Expected an edit")
	return (
		source.content.slice(0, result.edit.from) +
		result.edit.insert +
		source.content.slice(result.edit.to)
	)
}

describe("Heading Tags command", () => {
	it("prepares current heading tags and unique heading-only candidates in source order", () => {
		const content =
			"preamble :ignored:\n* First :project-work:shared:\nbody :not-a-tag:\n#+BEGIN_SRC org\n* Fake :hidden:\n#+END_SRC\n** Child :shared:中文:\nbody"
		expect(prepareOrgTagsCommand(context(content))).toEqual({
			kind: "ready",
			initialInput: "shared 中文",
			candidates: ["project-work", "shared", "中文"],
			context: context(content),
		})
	})

	it.each([
		"\n",
		"\r\n",
		"\r",
	])("preserves %j source and targets the containing heading", (newline) => {
		const content = ["#+TITLE: Test", "* First :old:", "body", "** Child :child:", "end"].join(
			newline,
		)
		const source = context(content, content.indexOf("body") + 1)
		expect(prepareOrgTagsCommand(source)).toMatchObject({ kind: "ready", initialInput: "old" })
		expect(apply(source, " :project-work,new\t中文: new ")).toBe(
			content.replace(":old:", ":project-work:new:中文:"),
		)
		expect(apply(source, " , : ")).toBe(content.replace(" :old:", ""))
	})

	it("does not leave a source block on a mismatched terminator", () => {
		const content =
			"* Real\n#+begin_src org\n#+end_example\n* Fake :hidden:\n#+end_src\n* Outside :visible:"
		const source = context(content, content.indexOf("Fake"))
		expect(prepareOrgTagsCommand(source)).toMatchObject({
			kind: "rejected",
			reason: "inside-block",
		})
		expect(executeOrgTagsCommand(source, source, "work")).toMatchObject({
			kind: "rejected",
			reason: "inside-block",
		})
		expect(prepareOrgTagsCommand(context(content))).toMatchObject({ candidates: ["visible"] })
	})

	it("rejects preamble, empty documents, and malformed headings", () => {
		for (const source of [context(""), context("*not a heading"), context("preamble\n* Real", 2)]) {
			expect(prepareOrgTagsCommand(source)).toMatchObject({
				kind: "rejected",
				reason: "no-heading",
			})
			expect(executeOrgTagsCommand(source, source, "")).toMatchObject({
				kind: "rejected",
				reason: "no-heading",
			})
		}
	})

	it.each([
		"\n",
		"\r\n",
		"\r",
	])("rejects block contents and both delimiter lines with %j", (newline) => {
		const content = [
			"* Real :real:",
			"  #+BeGiN_example",
			"* Fake :fake:",
			"  #+EnD_example",
			"body",
		].join(newline)
		for (const token of ["#+BeGiN", "Fake", "#+EnD"]) {
			expect(prepareOrgTagsCommand(context(content, content.indexOf(token)))).toMatchObject({
				kind: "rejected",
				reason: "inside-block",
			})
		}
		expect(prepareOrgTagsCommand(context(content))).toMatchObject({
			kind: "ready",
			initialInput: "real",
			candidates: ["real"],
		})
	})

	it("rejects unterminated blocks including EOF", () => {
		for (const content of ["* Real\n#+begin_src\n* Fake", "* Real\n#+begin_src\n"]) {
			expect(prepareOrgTagsCommand(context(content))).toMatchObject({
				kind: "rejected",
				reason: "inside-block",
			})
		}
	})

	it.each([-1, 100, NaN, 1.5])("rejects invalid cursor %s instead of clamping", (cursor) => {
		expect(prepareOrgTagsCommand(context("* Heading", cursor))).toMatchObject({
			kind: "rejected",
			reason: "invalid-cursor",
		})
	})

	it("guards path and exact content independently", () => {
		const source = context("* Heading :old:")
		expect(
			executeOrgTagsCommand(source, { ...source, relativePath: "other.org" }, "new"),
		).toMatchObject({ kind: "rejected", reason: "path-changed" })
		expect(
			executeOrgTagsCommand(source, { ...source, content: `${source.content}\n` }, "new"),
		).toMatchObject({ kind: "rejected", reason: "content-changed" })
	})

	it("ignores revision-only updates and cursor movement, using the captured target", () => {
		const source = { ...context("* First\n* Second", 2), revision: 1 }
		const current = { ...source, cursor: source.content.length, revision: 2 }
		const result = executeOrgTagsCommand(source, current, "tag")
		expect(result).toMatchObject({ kind: "edit", edit: { from: 7, to: 7, insert: " :tag:" } })
	})

	it("distinguishes empty no-op on a real heading from no heading", () => {
		const source = context("* Heading\nbody")
		expect(executeOrgTagsCommand(source, source, " , : ")).toEqual({
			kind: "no-change",
			reason: "unchanged-tags",
		})
		const tagged = context("* Heading :one:two:")
		expect(executeOrgTagsCommand(tagged, tagged, "one, two")).toEqual({
			kind: "no-change",
			reason: "unchanged-tags",
		})
		expect(apply(source, "project-work")).toBe("* Heading :project-work:\nbody")
	})
})
