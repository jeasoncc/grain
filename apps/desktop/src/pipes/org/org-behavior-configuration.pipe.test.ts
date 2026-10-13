import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION, parseOrgBehaviorConfiguration } from "./org-behavior-configuration.pipe"
import { buildOrgSparseTreePlan, orgEffectiveTagSnapshot, parseOrgSparseTreeQuery } from "./org-sparse-tree.pipe"
import { readOrgSparseTreeMatchQuery } from "./org-sparse-tree-query.pipe"

const configuration = (overrides: Partial<typeof DEFAULT_ORG_BEHAVIOR_CONFIGURATION> = {}) => {
	const result = parseOrgBehaviorConfiguration(JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, ...overrides }))
	if (E.isLeft(result)) throw new Error(result.left.message)
	return result.right
}
const source = [
	"#+TODO: TODO NEXT WAIT | DONE", "#+FILETAGS: :file:excluded:", "#+PROPERTY: OWNER Ada", "#+CATEGORY: Work",
	"* Parent :work:excluded:", ":PROPERTIES:", ":EFFORT: 3.5", ":OWNER: Parent", ":END:",
	"** NEXT 😀 child :urgent:", "DEADLINE: <2026-10-09 Fri 12:30>", ":PROPERTIES:", ":OWNER: Ada", ":SCORE: 12", ":END:", "raw\0body\udfff",
	"** DONE sibling :boss:", ":PROPERTIES:", ":OWNER: Bob", ":EFFORT: 1", ":END:",
	"* WAIT Peer :home:", ":PROPERTIES:", ":OWNER: Ada Lovelace", ":EFFORT: 10", ":END:",
	"#+begin_src", "* NEXT Fake :work:", ":PROPERTIES:", ":SCORE: 99", ":END:", "#+end_src",
].join("\r\n")
const child = source.indexOf("** NEXT")
const sibling = source.indexOf("** DONE")
const peer = source.indexOf("* WAIT")
const match = (expression: string, inheritance = DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance) => {
	const query = parseOrgSparseTreeQuery(`match:${expression}`, inheritance)
	if (!query) throw new Error(expression)
	return buildOrgSparseTreePlan(source, query, undefined, { today: "2026-10-09", now: "13:00" })
}

describe("closed Org behavior configuration", () => {
	it.each([
		"{broken", "[]", JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, version: 2 }),
		JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, executable: "evil" }),
		JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.refile, files: ["../secret.org"] } }),
		JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, refile: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.refile, maxDepth: 0 } }),
		JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, inheritance: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance, properties: ["OWNER", "owner"] } }),
	])("rejects invalid saved overrides without returning defaults: %s", (json) => {
		expect(E.isLeft(parseOrgBehaviorConfiguration(json))).toBe(true)
	})
	it("keeps legacy required blocks and existing defaults when new blocks are omitted", () => {
		const { version, refile, inheritance } = DEFAULT_ORG_BEHAVIOR_CONFIGURATION
		const parsed = parseOrgBehaviorConfiguration(JSON.stringify({ version, refile, inheritance }))
		expect(parsed).toEqual(E.right(DEFAULT_ORG_BEHAVIOR_CONFIGURATION))
	})
	it("freezes closed date-reader and logging policies without enforcing keyword membership", () => {
		const parsed = configuration({
			dateReader: { preferFuture: "time", forceCompatibleYears: true },
			logging: { done: "note", repeat: "none", reschedule: "time", redeadline: "note", refile: "time", repeatToState: "UNKNOWN" },
		})
		expect(parsed.dateReader).toEqual({ preferFuture: "time", forceCompatibleYears: true })
		expect(parsed.logging.repeatToState).toBe("UNKNOWN")
		expect(Object.isFrozen(parsed.dateReader)).toBe(true)
		expect(Object.isFrozen(parsed.logging)).toBe(true)
	})
	it.each([
		{ dateReader: null }, { dateReader: { preferFuture: "later", forceCompatibleYears: false } },
		{ dateReader: { preferFuture: true, forceCompatibleYears: false, ambientClock: true } },
		{ logging: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, repeat: "anything" } },
		{ logging: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, repeatToState: "BAD\nSTATE" } },
		{ logging: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, repeatToState: "x".repeat(257) } },
		{ logging: { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, extra: true } },
	])("rejects malformed policy overrides instead of silently falling back", (override) => {
		expect(E.isLeft(parseOrgBehaviorConfiguration(JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, ...override })))).toBe(true)
	})
})

describe("standard Org tag/property matches", () => {
	it("supports native signed conjunction, |/& precedence and escaped regex groups", () => {
		expect(match("+work-boss").matchedHeadingStarts).toEqual([source.indexOf("* Parent"), child])
		expect(match("work&urgent|home").matchedHeadingStarts).toEqual([child, peer])
		expect(match("+work-boss-urgent").matchedHeadingStarts).toEqual([source.indexOf("* Parent")])
		expect(match("{^\\(urgent\\|home\\)$}").matchedHeadingStarts).toEqual([child, peer])
		expect(match("{urgent\\|home}").matchedHeadingStarts).toEqual([child, peer])
	})
	it("compares strings, numbers, regex property values, special properties and TODO suffixes", () => {
		expect(match('OWNER="Ada"+SCORE>=12/!NEXT|TODO').matchedHeadingStarts).toEqual([child])
		expect(match('OWNER={^Ada}+EFFORT<>3.5').matchedHeadingStarts).toEqual([child, peer])
		expect(match('OWNER!="Ada"&LEVEL>=2').matchedHeadingStarts).toEqual([sibling])
		expect(match('CATEGORY="Work"/WAIT').matchedHeadingStarts).toEqual([peer])
		expect(match('TODO={^\\(NEXT\\|DONE\\)$}').matchedHeadingStarts).toEqual([child, sibling])
		expect(match("/!NEXT|DONE").matchedHeadingStarts).toEqual([child])
		expect(match("work/!").matchedHeadingStarts).toEqual([child])
	})
	it("uses GNU Org numeric-prefix and zero semantics for absent, empty and text properties", () => {
		const raw = [
			"* Missing", "* Zero", ":PROPERTIES:", ":NUM: 0", ":END:",
			"* Empty", ":PROPERTIES:", ":NUM:", ":END:",
			"* Text", ":PROPERTIES:", ":NUM: text", ":END:",
			"* Prefix", ":PROPERTIES:", ":NUM: 2foo", ":END:",
			"* Two", ":PROPERTIES:", ":NUM: 2", ":END:",
		].join("\r\n")
		const matches = (expression: string) => buildOrgSparseTreePlan(raw, parseOrgSparseTreeQuery(expression)!).matchedHeadingStarts
		expect(matches("NUM=0")).toEqual(["Missing", "Zero", "Empty", "Text"].map((heading) => raw.indexOf(`* ${heading}`)))
		expect(matches("NUM<*1")).toEqual(["Zero", "Empty", "Text"].map((heading) => raw.indexOf(`* ${heading}`)))
		expect(matches("NUM=2")).toEqual(["Prefix", "Two"].map((heading) => raw.indexOf(`* ${heading}`)))
		expect(matches("NUM>=2")).toEqual(["Prefix", "Two"].map((heading) => raw.indexOf(`* ${heading}`)))
	})
	it("accepts raw conventional matches through the actual Sparse Tree parser without an extra prefix", () => {
		const query = parseOrgSparseTreeQuery('+work-boss/!NEXT')!
		expect(buildOrgSparseTreePlan(source, query).matchedHeadingStarts).toEqual([child])
	})
	it("compares valid absolute/relative dates and time values without changing raw source coordinates", () => {
		const plan = match('DEADLINE<="<now>"&DEADLINE>="<today>"')
		expect(plan.matchedHeadingStarts).toEqual([child])
		expect(match('DEADLINE<"<+1d>"').matchedHeadingStarts).toEqual([child])
		expect(match('DEADLINE="<2026-10-09 Fri 12:30>"').matchedHeadingStarts).toEqual([child])
		expect(plan.visibleHeadingStarts).toEqual([source.indexOf("* Parent"), child])
		expect(plan.hiddenRanges[0].from).toBe(sibling)
		expect(source.slice(child, child + "** NEXT 😀 child :urgent:".length)).toBe("** NEXT 😀 child :urgent:")
	})
	it("uses captured selective inheritance and GNU's installed tag-list exclusion behavior", () => {
		const inheritance = configuration({ inheritance: { tags: ["work", "excluded"], tagExclusions: ["excluded"], properties: ["effort", "owner"], propertyExclusions: ["owner"] } }).inheritance
		expect(match('work+EFFORT>=3', inheritance).matchedHeadingStarts).toEqual([source.indexOf("* Parent"), child])
		expect(match("excluded", inheritance).matchedHeadingStarts).toEqual([source.indexOf("* Parent"), child, sibling, peer])
		expect(match('OWNER="Ada"', inheritance).matchedHeadingStarts).toEqual([child])
		expect(match("file", inheritance).matchedHeadingStarts).toEqual([])
		expect(orgEffectiveTagSnapshot(source, inheritance).headings[1].effectiveTags).toEqual(["work", "excluded", "urgent"])
		const mutable = { ...inheritance, tags: ["work"], tagExclusions: [] as string[] }
		const query = parseOrgSparseTreeQuery("match:work", mutable)!
		mutable.tags.length = 0
		expect(buildOrgSparseTreePlan(source, query).matchedHeadingStarts).toContain(child)
	})
	it("applies nearest property values and append values using eligible drawers only", () => {
		const raw = "#+PROPERTY: OWNER File\r* Root\r:PROPERTIES:\r:OWNER: Root\r:END:\r** Child\r:PROPERTIES:\r:OWNER+: Extra\r:END:\r** Peer\r:PROPERTIES:\r:OWNER: Own\r:END:\r#+begin_src\r* Fake\r:PROPERTIES:\r:OWNER: Root Extra\r:END:\r#+end_src"
		const inheritance = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance, properties: true }
		const query = parseOrgSparseTreeQuery('match:OWNER="Root Extra"', inheritance)!
		expect(buildOrgSparseTreePlan(raw, query).matchedHeadingStarts).toEqual([raw.indexOf("** Child")])
	})
	it.each(['{[}', "{a\\{2\\}}", "{\\s}", "{\\1}", "{[[:unknown:]]}"])("rejects malformed GNU regex without a false-match fallback: %s", (expression) => {
		const input = `  match:${expression}`
		const result = readOrgSparseTreeMatchQuery(input)
		expect(result.kind).toBe("error")
		if (result.kind === "error") { expect(result.offset).toBeGreaterThanOrEqual(8); expect(result.offset).toBeLessThanOrEqual(input.length) }
	})
	it("reports the exact failing raw-source offset rather than a trimmed coordinate", () => {
		expect(readOrgSparseTreeMatchQuery(" \tmatch:{\\1}")).toMatchObject({ kind: "error", offset: 8 })
	})

	it("validates GNU inheritance regex as inert declarative data with no invalid fallback", () => {
		const inheritance = configuration({ inheritance: { tags: "^\\(?:work\\|excluded\\)$", tagExclusions: ["excluded"], properties: "^EFFORT$", propertyExclusions: [] } }).inheritance
		expect(match("work", inheritance).matchedHeadingStarts).toEqual([source.indexOf("* Parent"), child, sibling])
		expect(match("excluded", inheritance).matchedHeadingStarts).toEqual([source.indexOf("* Parent")])
		expect(match("EFFORT>=3", inheritance).matchedHeadingStarts).toEqual([source.indexOf("* Parent"), child, peer])
		for (const regexp of ["[", "\\s", "\\1", "\\(?0:a\\)"]) {
			expect(E.isLeft(parseOrgBehaviorConfiguration(JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, inheritance: { ...inheritance, tags: regexp } })))).toBe(true)
		}
	})

	it("consumes backreference and native syntax/category inheritance rules without bypassing nil barriers", () => {
		const raw = "* 😀 Root :aa:ab:\r\n:PROPERTIES:\r\n:AA: Parent\r\n:AB: Other\r\n:END:\r\n** Child\r\n** Barrier\r\n:PROPERTIES:\r\n:AA: nil\r\n:END:\r\n*** Below\r\nbody\0"
		const inheritance = configuration({ inheritance: { tags: "^\\(\\sw\\)\\1$", tagExclusions: [], properties: "^\\(A\\)\\1$", propertyExclusions: [] } }).inheritance
		expect(orgEffectiveTagSnapshot(raw, inheritance).headings[1].effectiveTags).toEqual(["aa"])
		const query = parseOrgSparseTreeQuery('match:AA="Parent"', inheritance)!
		expect(buildOrgSparseTreePlan(raw, query).matchedHeadingStarts).toEqual([raw.indexOf("* 😀 Root"), raw.indexOf("** Child")])
		const categories = configuration({ inheritance: { tags: "^\\cl+$", tagExclusions: [], properties: "^\\_<AA\\_>$", propertyExclusions: [] } }).inheritance
		expect(orgEffectiveTagSnapshot(raw, categories).headings[1].effectiveTags).toEqual(["aa", "ab"])
	})

	it("keeps property exclusions explicitly Grain-only while preserving local values", () => {
		const inheritance = configuration({ inheritance: { tags: true, tagExclusions: [], properties: true, propertyExclusions: ["EFFORT"] } }).inheritance
		expect(match("EFFORT>=3", inheritance).matchedHeadingStarts).toEqual([source.indexOf("* Parent"), peer])
	})

	it("does not substitute drawer values or inheritance for absent special properties", () => {
		const raw = "* TODO Parent :work:\nDEADLINE: <2026-10-09 Fri>\n:PROPERTIES:\n:TAGS: forged\n:TODO+: DONE\n:ITEM: forged\n:END:\n** Child"
		const inherited = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance, properties: true }
		const evaluate = (query: string) => buildOrgSparseTreePlan(raw, parseOrgSparseTreeQuery(query, inherited)!).matchedHeadingStarts
		expect(evaluate('TAGS=\"forged\"')).toEqual([])
		expect(evaluate('ITEM=\"Parent\"')).toEqual([0])
		expect(evaluate('TODO=\"TODO DONE\"')).toEqual([])
		expect(evaluate('TODO=*\"\"')).toEqual([])
		expect(evaluate('DEADLINE<>*\"\"')).toEqual([0])
	})

	it("keeps GNU nil barriers until descendant append values have been accumulated", () => {
		const raw = "* Root\n:PROPERTIES:\n:OWNER: Parent\n:END:\n** Barrier\n:PROPERTIES:\n:OWNER: nil\n:END:\n*** Appended\n:PROPERTIES:\n:OWNER+: Child\n:END:\n*** Missing"
		const inheritance = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance, properties: true }
		const plan = buildOrgSparseTreePlan(raw, parseOrgSparseTreeQuery('OWNER=\"nil Child\"', inheritance)!)
		expect(plan.matchedHeadingStarts).toEqual([raw.indexOf("*** Appended")])
		expect(buildOrgSparseTreePlan(raw, parseOrgSparseTreeQuery('OWNER=*\"\"', inheritance)!).matchedHeadingStarts).toEqual([])
	})
})
