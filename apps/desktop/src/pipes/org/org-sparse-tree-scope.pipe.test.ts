import { describe, expect, it } from "vitest"
import { buildOrgSparseTreePlan } from "./org-sparse-tree.pipe"
import { orgBlockRanges, parseOrgTodoKeywords } from "./org-text.pipe"

describe("source-order block eligibility", () => {
	it.each(["\n", "\r", "\r\n"])("ignores drawers in COMMENT until a real peer (%j)", (ending) => {
		const source = [
			"* COMMENT ignored",
			":LOGBOOK:",
			"* TODO Real",
			"* DONE Hidden",
			":LOGBOOK:",
			"* TODO drawer fake",
			":END:",
		].join(ending)
		expect(buildOrgSparseTreePlan(source, { kind: "todo" }).matchedHeadingStarts).toEqual([
			source.indexOf("* TODO Real"),
		])
	})
	it.each(["\n", "\r", "\r\n"])("does not open a block in a drawer (%j)", (ending) => {
		const source = [
			":LOGBOOK:",
			"#+begin_src",
			":END:",
			"* TODO Real",
			"body",
			"* DONE Hidden",
		].join(ending)
		expect(orgBlockRanges(source)).toEqual([])
		expect(buildOrgSparseTreePlan(source, { kind: "todo" }).matchedHeadingStarts).toEqual([
			source.indexOf("* TODO Real"),
		])
	})
	it("ignores blocks and fake directives in configured COMMENT subtrees", () => {
		const source =
			"* NEXT [#A] COMMENT inert\n#+begin_src\n#+TODO: FAKE | NO\n* NEXT Real\n#+TODO: NEXT | FINISHED\n* FINISHED Hidden"
		expect(parseOrgTodoKeywords(source)).toEqual({ todo: ["NEXT"], done: ["FINISHED"] })
		expect(orgBlockRanges(source)).toEqual([
			{ from: source.indexOf("#+begin_src"), to: source.length, closed: false },
		])
		expect(buildOrgSparseTreePlan(source, { kind: "todo" }).matchedHeadingStarts).toEqual([
			source.indexOf("* NEXT Real"),
		])
	})
	it("does not enter drawers inside a block or end on a mismatched/nested delimiter", () => {
		const source =
			"#+begin_src\n:DRAWER:\n#+begin_quote\n#+end_quote\n#+end_src\n* TODO Real\n* DONE Hidden"
		expect(orgBlockRanges(source)).toEqual([
			{ from: 0, to: source.indexOf("* TODO Real"), closed: true },
		])
		expect(buildOrgSparseTreePlan(source, { kind: "todo" }).matchedHeadingStarts).toEqual([
			source.indexOf("* TODO Real"),
		])
	})
	it("does not let inert state declarations change COMMENT grammar", () => {
		const source =
			":LOGBOOK:\n#+TODO: FAKE | NO\n:END:\n* FAKE COMMENT ordinary title\n#+TODO: NEXT | FINISHED\n* NEXT Real"
		expect(parseOrgTodoKeywords(source)).toEqual({ todo: ["NEXT"], done: ["FINISHED"] })
		expect(
			buildOrgSparseTreePlan(source, { kind: "text", literal: "COMMENT" }).matchedHeadingStarts,
		).toEqual([source.indexOf("* FAKE")])
	})
	it("does not mistake ordinary COMMENT title words for the marker", () => {
		const source = "* TODO A COMMENT title\n* NEXT COMMENTARY title\n#+TODO: TODO NEXT | DONE"
		expect(buildOrgSparseTreePlan(source, { kind: "todo" }).matchedHeadingStarts).toEqual([
			0,
			source.indexOf("* NEXT"),
		])
	})
})
