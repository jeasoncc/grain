import { describe, expect, it } from "vitest"
import { buildOrgSparseTreePlan, parseOrgSparseTreeQuery } from "./org-sparse-tree.pipe"

describe("parseOrgSparseTreeQuery", () => {
	it("parses only the supported literal predicates", () => {
		expect(parseOrgSparseTreeQuery(" todo ")).toEqual({ kind: "todo" })
		expect(parseOrgSparseTreeQuery("todo:WAIT")).toEqual({ kind: "todo", state: "WAIT" })
		expect(parseOrgSparseTreeQuery("tag:work")).toEqual({ kind: "tag", name: "work" })
		expect(parseOrgSparseTreeQuery("text:a.*:b")).toEqual({ kind: "text", literal: "a.*:b" })
		for (const input of ["", "foo", "todo:", "todo:A B", "tag:", "tag:a:b", "text: "]) {
			expect(parseOrgSparseTreeQuery(input)).toBeNull()
		}
	})
})

describe("buildOrgSparseTreePlan", () => {
	it("reveals matches and ancestors, merges unrelated sections, retains the preamble", () => {
		const source =
			"intro\n* Root\nbody\n** Hidden\nx\n*** Hidden child\ny\n** TODO Match\nz\n* Other\nq"
		const plan = buildOrgSparseTreePlan(source, { kind: "todo" })
		expect(plan.matchedHeadingStarts).toEqual([source.indexOf("** TODO")])
		expect(plan.visibleHeadingStarts).toEqual([source.indexOf("* Root"), source.indexOf("** TODO")])
		expect(plan.hiddenRanges).toEqual([
			{ from: source.indexOf("** Hidden"), to: source.indexOf("** TODO") },
			{ from: source.indexOf("* Other"), to: source.length },
		])
		expect(plan.allVisible).toBe(false)
	})

	it("uses configured pending states and allows explicit completed-state queries", () => {
		const source =
			"#+TODO: NEXT(n) WAIT(w) | FINISHED(f)\n* NEXT one\n* WAIT two\n* FINISHED three\n* TODO four"
		expect(buildOrgSparseTreePlan(source, { kind: "todo" }).matchedHeadingStarts).toEqual([
			source.indexOf("* NEXT"),
			source.indexOf("* WAIT"),
		])
		expect(
			buildOrgSparseTreePlan(source, { kind: "todo", state: "FINISHED" }).matchedHeadingStarts,
		).toEqual([source.indexOf("* FINISHED")])
	})

	it("matches exact local tags, not substrings or inherited tags", () => {
		const source = "* Parent :work:\n** Child :home:\n* Other :homework:"
		const plan = buildOrgSparseTreePlan(source, { kind: "tag", name: "work" })
		expect(plan.matchedHeadingStarts).toEqual([0])
		expect(plan.visibleHeadingStarts).toEqual([0])
		expect(plan.hiddenRanges).toEqual([{ from: source.indexOf("** Child"), to: source.length }])
	})

	it("matches literal case-sensitive titles, never a regex, body, state, or tag", () => {
		const source = "* TODO a.*b :work:\n* axxb\na.*b\n* Other"
		expect(
			buildOrgSparseTreePlan(source, { kind: "text", literal: "a.*b" }).matchedHeadingStarts,
		).toEqual([0])
		for (const literal of ["A.*b", "TODO", "work"]) {
			expect(
				buildOrgSparseTreePlan(source, { kind: "text", literal }).matchedHeadingStarts,
			).toEqual([])
		}
	})

	it("ignores raw blocks, mismatched block ends, drawers, and COMMENT subtrees", () => {
		const source = [
			"#+begin_src",
			"* TODO fake",
			"#+end_example",
			"** TODO also fake",
			"#+end_src",
			"* Root",
			":LOGBOOK:",
			"** TODO drawer fake",
			":END:",
			"** COMMENT omitted",
			"*** TODO comment fake",
			"** TODO Real",
			"* TODO COMMENT omitted",
			"** TODO fake",
			"* Last",
			"#+begin_example",
			"* TODO unterminated fake",
		].join("\n")
		const plan = buildOrgSparseTreePlan(source, { kind: "todo" })
		expect(plan.matchedHeadingStarts).toEqual([source.indexOf("** TODO Real")])
		expect(plan.visibleHeadingStarts).toEqual([
			source.indexOf("* Root"),
			source.indexOf("** TODO Real"),
		])
	})

	it("does not promote states from fake directives into sparse candidates", () => {
		const source = [
			"#+TODO: NEXT | FINISHED",
			":LOGBOOK:",
			"#+TODO: DRAWER | NO",
			":END:",
			"* NEXT COMMENT omitted",
			"#+SEQ_TODO: COMMENTED | NO",
			"** Child",
			"* Real",
			"#+begin_src",
			"#+TODO: BLOCK | NO",
			"* NEXT fake",
			"#+end_src",
			"* NEXT actual",
			"* DRAWER not a state",
			"* COMMENTED not a state",
			"* BLOCK not a state",
			"#+begin_example",
			"#+end_src",
			"#+TODO: UNCLOSED | NO",
			"* NEXT hidden",
		]
			.join("\r\n")
			.replace("#+end_src\r\n* NEXT actual", "#+end_src\r* NEXT actual")
		expect(buildOrgSparseTreePlan(source, { kind: "todo" }).matchedHeadingStarts).toEqual([
			source.indexOf("* NEXT actual"),
		])
		for (const state of ["DRAWER", "COMMENTED", "BLOCK", "UNCLOSED"]) {
			expect(buildOrgSparseTreePlan(source, { kind: "todo", state }).matchedHeadingStarts).toEqual(
				[],
			)
		}
		expect(
			buildOrgSparseTreePlan(source, { kind: "text", literal: "DRAWER" }).matchedHeadingStarts,
		).toEqual([source.indexOf("* DRAWER")])
	})

	it("preserves UTF-16 offsets, mixed endings, Unicode, and EOF without newline", () => {
		const source = "😀 intro\r\n* Parent\r** TODO café 😀\n** Skip\r\nbody 😀"
		const original = source
		const plan = buildOrgSparseTreePlan(source, { kind: "todo" })
		expect(plan.matchedHeadingStarts).toEqual([source.indexOf("** TODO")])
		expect(plan.hiddenRanges).toEqual([{ from: source.indexOf("** Skip"), to: source.length }])
		expect(source.slice(plan.hiddenRanges[0].from, plan.hiddenRanges[0].to)).toBe(
			"** Skip\r\nbody 😀",
		)
		expect(source).toBe(original)
	})

	it("explicitly keeps all source visible on no matches, empty source, or no headings", () => {
		for (const source of ["", "just body\r\n", "* One\n** Two\n"]) {
			const plan = buildOrgSparseTreePlan(source, { kind: "todo" })
			expect(plan.allVisible).toBe(true)
			expect(plan.hiddenRanges).toEqual([])
			expect(plan.matchedHeadingStarts).toEqual([])
		}
		expect(buildOrgSparseTreePlan("* One\n** Two", { kind: "todo" }).visibleHeadingStarts).toEqual([
			0, 6,
		])
	})

	it("returns allVisible when every heading matches and tolerates skipped hierarchy levels", () => {
		const source = "* TODO Root\n**** TODO Child"
		const plan = buildOrgSparseTreePlan(source, { kind: "todo" })
		expect(plan.allVisible).toBe(true)
		expect(plan.hiddenRanges).toEqual([])
		expect(plan.visibleHeadingStarts).toEqual([0, source.indexOf("****")])
	})
})
