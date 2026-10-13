import { describe, expect, it } from "vitest"
import {
	buildOrgSparseTreePlan,
	orgSparseTreeCandidates,
	parseOrgSparseTreeQuery,
} from "./org-sparse-tree.pipe"

describe("sparse tree query candidates", () => {
	it("keeps declared pending and done states, exact Unicode/local tags, and stable first-occurrence deduplication", () => {
		const source = [
			"#+TODO: NEXT(n) 待機 | FINISHED(f)",
			"#+SEQ_TODO: NEXT next | FINISHED 終了",
			"#+FILETAGS: :global:",
			"* NEXT Parent :Work:研究:Work:",
			"** Plain child",
			"* 終了 Other :work:研究:a.b[+]:",
			"body :body:",
			"* Not trailing :invalid: title",
		].join("\n")
		expect(orgSparseTreeCandidates(source)).toEqual([
			"todo",
			"todo:NEXT",
			"todo:待機",
			"todo:next",
			"todo:FINISHED",
			"todo:終了",
			"tag:Work",
			"tag:研究",
			"tag:work",
			"tag:a.b[+]",
			"itag:global",
			"itag:Work",
			"itag:研究",
		])
		for (const candidate of orgSparseTreeCandidates(source)) {
			expect(parseOrgSparseTreeQuery(candidate)).not.toBeNull()
		}
		const query = parseOrgSparseTreeQuery("tag:Work")!
		expect(buildOrgSparseTreePlan(source, query).matchedHeadingStarts).toEqual([
			source.indexOf("* NEXT"),
		])
		expect(buildOrgSparseTreePlan(source, parseOrgSparseTreeQuery("tag:a.b[+]")!).matchedHeadingStarts).toEqual([
			source.indexOf("* 終了"),
		])
		expect(buildOrgSparseTreePlan(source, parseOrgSparseTreeQuery("itag:a.b[+]")!).matchedHeadingStarts).toEqual([])
		expect(buildOrgSparseTreePlan(source, parseOrgSparseTreeQuery("tag:work")!).matchedHeadingStarts).toEqual([
			source.indexOf("* 終了"),
		])
		expect(buildOrgSparseTreePlan(source, parseOrgSparseTreeQuery("itag:work")!).matchedHeadingStarts).toEqual([])
	})
	it.each([
		"\n",
		"\r\n",
		"\r",
	])("uses the plan's eligible headings and TODO declarations with %j line endings", (newline) => {
		const source = [
			"#+begin_src org",
			"#+TODO: SRC | SRC_DONE",
			"* SRC Fake :src:",
			"#+end_src",
			":PROPERTIES:",
			"#+TODO: DRAWER | DRAWER_DONE",
			"* Fake :drawer:",
			":END:",
			"* NEXT [#A] COMMENT Hidden :comment:",
			"#+TODO: HIDDEN | HIDDEN_DONE",
			"** Fake :child:",
			"* NEXT Real :local:",
			"#+TODO: NEXT | FINISHED",
			"* Plain :local:Local:",
		].join(newline)
		expect(orgSparseTreeCandidates(source)).toEqual([
			"todo",
			"todo:NEXT",
			"todo:FINISHED",
			"tag:local",
			"tag:Local",
			"itag:local",
			"itag:Local",
		])
	})
	it("replaces declared state and tag candidates when the source changes", () => {
		expect(orgSparseTreeCandidates("#+TODO: NEXT | FINISHED\n* Plain :one:")).toEqual([
			"todo",
			"todo:NEXT",
			"todo:FINISHED",
			"tag:one",
			"itag:one",
		])
		expect(orgSparseTreeCandidates("#+TODO: WAIT | CLOSED\n* Plain :two:")).toEqual([
			"todo",
			"todo:WAIT",
			"todo:CLOSED",
			"tag:two",
			"itag:two",
		])
	})
})
