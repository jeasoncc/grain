import { describe, expect, it } from "vitest"
import { executeOrgSparseTreeCommand, prepareOrgSparseTreeCommand } from "./org-sparse-tree.command"

const origin = {
	content: "Preamble\n#+begin_src\nx\n#+end_src\n* TODO Work",
	cursor: 15,
	relativePath: "note.org",
}

describe("sparse tree buffer command", () => {
	it("prepares from anywhere without requiring or editing a heading", () => {
		expect(prepareOrgSparseTreeCommand(origin)).toMatchObject({ initialInput: "", kind: "ready" })
	})
	it("prepares actual source query candidates independent of caret scope", () => {
		const content =
			"#+TODO: NEXT | FINISHED\n#+begin_src\n* Fake :fake:\n#+end_src\n* NEXT Real :研究:"
		for (const cursor of [0, content.indexOf("Fake"), content.length]) {
			expect(prepareOrgSparseTreeCommand({ ...origin, content, cursor })).toMatchObject({
				candidates: ["todo", "todo:NEXT", "todo:FINISHED", "tag:研究", "itag:研究"],
				kind: "ready",
			})
		}
	})
	it.each([
		"todo",
		"todo:WAITING",
		"tag:work",
		"text:literal [value]",
	])("returns an explicit view for %s", (query) => {
		expect(executeOrgSparseTreeCommand(origin, origin, query)).toEqual({
			kind: "view",
			view: { kind: "sparse-tree", query },
		})
	})
	it.each([
		"",
		"todo:",
		"tag:",
		"text:",
		"tag:a:b",
	])("rejects malformed query %s", (query) => {
		expect(executeOrgSparseTreeCommand(origin, origin, query)).toMatchObject({
			kind: "rejected",
			reason: "invalid-query",
		})
	})
	it("rejects changed source and paths", () => {
		expect(
			executeOrgSparseTreeCommand(origin, { ...origin, content: origin.content + "!" }, "todo"),
		).toMatchObject({ reason: "content-changed" })
		expect(
			executeOrgSparseTreeCommand(origin, { ...origin, relativePath: "other.org" }, "todo"),
		).toMatchObject({ reason: "path-changed" })
	})
})
