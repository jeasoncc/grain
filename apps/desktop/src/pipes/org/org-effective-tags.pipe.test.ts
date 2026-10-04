import { describe, expect, it } from "vitest"
import {
	buildOrgSparseTreePlan,
	orgEffectiveTagSnapshot,
	parseOrgSparseTreeQuery,
} from "./org-sparse-tree.pipe"

const matches = (source: string, input: string) => {
	const query = parseOrgSparseTreeQuery(input)
	if (!query) throw new Error(input)
	return buildOrgSparseTreePlan(source, query).matchedHeadingStarts
}

describe("explicit effective tags", () => {
	it("unions eligible file lines and the full ancestor stack without merging duplicate titles", () => {
		const source =
			"#+FILETAGS: :file:共_:file:\r\n#+filetags: :second:\n#+FILETAGS: malformed\r* Parent :parent:\n*** Middle :middle:\r\n***** Same :own:\n* Peer :peer:\n** Same :own:"
		const snapshot = orgEffectiveTagSnapshot(source)
		expect(snapshot.fileTags).toEqual(["file", "共_", "second"])
		expect(snapshot.headings[2].effectiveTags).toEqual([
			"file",
			"共_",
			"second",
			"parent",
			"middle",
			"own",
		])
		expect(snapshot.headings[4].effectiveTags).toEqual(["file", "共_", "second", "peer", "own"])
		expect(matches(source, "itag:parent")).toEqual(
			snapshot.headings.slice(0, 3).map(({ from }) => from),
		)
		expect(matches(source, "tag:parent")).toEqual([snapshot.headings[0].from])
		expect(matches(source, "itag:Parent")).toEqual([])
		expect(matches(source, "itag:共_")).toEqual(snapshot.headings.map(({ from }) => from))
	})

	it("excludes inert FILETAGS and headings; TODO/LOGGING properties are not tag directives", () => {
		const source = [
			"#+TODO: NEXT | FINISHED",
			"#+FILETAGS: :real:",
			"#+begin_unknown",
			"#+FILETAGS: :block:",
			"* NEXT fake :fake:",
			"#+end_unknown",
			"* NEXT COMMENT omitted :comment:",
			"#+FILETAGS: :comment:",
			"** fake :fake:",
			"* UNKNOWN ordinary :local:",
			":PROPERTIES:",
			"#+FILETAGS: :drawer:",
			"** fake :fake:",
			":LOGGING: :logging:",
			":END:",
			"** NEXT child",
			"* Last",
			":LOGBOOK:",
			"#+FILETAGS: :unclosed:",
			"* fake :fake:",
		].join("\n")
		expect(orgEffectiveTagSnapshot(source).fileTags).toEqual(["real"])
		for (const name of ["block", "comment", "drawer", "logging", "unclosed", "fake"]) {
			expect(matches(source, `itag:${name}`)).toEqual([])
		}
		expect(matches(source, "itag:local")).toEqual([
			source.indexOf("* UNKNOWN"),
			source.indexOf("** NEXT child"),
		])
		expect(matches(source, "todo:UNKNOWN")).toEqual([])
	})

	it("preserves legacy text tails, raw NUL/surrogates, exact offsets, and leaves AST/source unchanged", () => {
		const source =
			"intro\0\ud800\r\n* Root :work:\r** TODO a AND b OR c\nbody\0\udfff\r\n* Skip\nuntouched"
		expect(matches(source, "text:a AND b OR c")).toEqual([source.indexOf("** TODO")])
		const query = parseOrgSparseTreeQuery('match: todo AND itag:work AND text:"a AND b OR c"')
		if (!query) throw new Error("parse")
		const before = JSON.stringify(query)
		const plan = buildOrgSparseTreePlan(source, query)
		expect(plan.hiddenRanges).toEqual([{ from: source.indexOf("* Skip"), to: source.length }])
		expect(JSON.stringify(query)).toBe(before)
		const snapshot = orgEffectiveTagSnapshot(source)
		;(snapshot.headings[1].effectiveTags as string[]).push("forged")
		expect(matches(source, "itag:forged")).toEqual([])
		expect(source).toContain("body\0\udfff\r\n")
	})
})
