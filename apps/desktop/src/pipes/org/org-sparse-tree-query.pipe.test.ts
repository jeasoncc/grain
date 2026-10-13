import { describe, expect, it } from "vitest"
import { orgMatchRegExp, parseOrgSparseTreeMatchQuery, readOrgSparseTreeMatchQuery } from "./org-sparse-tree-query.pipe"
import { buildOrgSparseTreePlan, OrgSparseTreeContextRequiredError, orgSparseTreeSpecialPropertyRequest, parseOrgSparseTreeQuery } from "./org-sparse-tree.pipe"

const parse = (expression: string) => parseOrgSparseTreeMatchQuery(`match:${expression}`)
const balanced = (leaves: number): string => leaves === 1 ? "tag:x" : `(${balanced(Math.floor(leaves / 2))} OR ${balanced(Math.ceil(leaves / 2))})`

describe("Org match grammar and explicit Grain convenience predicates", () => {
	it("requires the explicit case-sensitive prefix on the match-only reader", () => {
		for (const input of ["", "todo", "tag:work", "MATCH:todo", "match:"]) expect(parseOrgSparseTreeMatchQuery(input)).toBeNull()
	})

	it("treats todo/AND/OR/NOT as native literal tags, not pending states or reserved leaves", () => {
		const source = "#+TODO: TODO | DONE\n* TODO Pending\n* Literal :todo:\n* Names :AND:OR:NOT:"
		for (const name of ["todo", "AND", "OR", "NOT"]) {
			const query = parseOrgSparseTreeQuery(`match:${name}`)!
			expect(buildOrgSparseTreePlan(source, query).matchedHeadingStarts).toEqual([source.indexOf(name === "todo" ? "* Literal" : "* Names")])
		}
		expect(buildOrgSparseTreePlan(source, parseOrgSparseTreeQuery("todo")!).matchedHeadingStarts).toEqual([source.indexOf("* TODO")])
	})

	it("keeps local tags, exact states, literal text and parenthesized local Boolean conveniences separate", () => {
		const source = "#+TODO: TODO WAIT | DONE\n* TODO a.*b :work-project:\n* WAIT Other :home:\n* DONE Peer :work-project:"
		const query = parseOrgSparseTreeQuery('match:(todo:TODO OR todo:WAIT) AND (tag:work-project OR text:"Other")')!
		expect(buildOrgSparseTreePlan(source, query).matchedHeadingStarts).toEqual([source.indexOf("* TODO"), source.indexOf("* WAIT")])
		for (const expression of ["tag:", "todo:", "tag:a:b", 'text:""', 'text:"unfinished', 'text:"a\\qb"', "tag:a AND ("]) expect(parse(expression), expression).toBeNull()
	})

	it("bounds complete UTF-16 input, local AST depth and total nodes", () => {
		const literal = `${"😀".repeat(4089)}x`
		const input = `match:text:"${literal}"`
		expect(input.length).toBe(8192)
		expect(parseOrgSparseTreeMatchQuery(input)).not.toBeNull()
		expect(parseOrgSparseTreeMatchQuery(`${input} `)).toBeNull()
		expect(parse(`${"(".repeat(32)}tag:x${")".repeat(32)}`)).not.toBeNull()
		expect(parse(`${"(".repeat(33)}tag:x${")".repeat(33)}`)).toBeNull()
		expect(parse(balanced(64))).not.toBeNull()
		expect(parse(`NOT ${balanced(64)}`)).not.toBeNull()
		expect(parse(balanced(65))).toBeNull()
		expect(parse(Array(1000).fill("x").join("|"))).toBeNull()
	})

	it("uses GNU literal parentheses, escaped groups, shy groups and literal bare pipes in regex primitives", () => {
		expect(orgMatchRegExp("(a)").test("(A)")).toBe(true)
		expect(orgMatchRegExp("(a)").test("a")).toBe(false)
		expect(orgMatchRegExp("\\(?:a\\|b\\)").test("B")).toBe(true)
		expect(orgMatchRegExp("a|b").test("a|b")).toBe(true)
		expect(orgMatchRegExp("a|b").test("a")).toBe(false)
	})

	it("matches native captured text, not an undefined/forward JS backreference", () => {
		expect(orgMatchRegExp("^\\(a\\)\\1$").test("aa")).toBe(true)
		expect(orgMatchRegExp("^\\(a\\)\\1$").test("aA")).toBe(true)
		expect(orgMatchRegExp("^\\(a\\)\\1$").test("ab")).toBe(false)
		expect(orgMatchRegExp("^\\(foo\\(b*\\)\\|lose\\)\\2$").test("lose")).toBe(false)
		expect(orgMatchRegExp("^\\(foo\\(b*\\)\\|lose\\)\\2$").test("foobb")).toBe(true)
		expect(orgMatchRegExp("^\\(a*\\)\\1$").test("a".repeat(4000))).toBe(true)
	})

	it("treats interval suffixes as repetition of a greedy interval, not JS lazy intervals", () => {
		const capture = orgMatchRegExp("\\(a\\{1,3\\}?\\)\\1").exec("😀aaaa", 2)
		expect(capture?.index).toBe(2)
		expect(capture?.[0]).toBe("aaaa")
		expect(capture?.[1]).toBe("aa")
		expect(orgMatchRegExp("a\\{1,3\\}?").exec("aaaa")?.[0]).toBe("aaa")
		expect(orgMatchRegExp("a\\{2\\}?").exec("b")?.[0]).toBe("")
		expect(orgMatchRegExp("a\\{1,3\\}??").exec("aaaa")?.[0]).toBe("")
		expect(orgMatchRegExp("^a\\{2\\}*$").test("aaaa")).toBe(true)
		expect(orgMatchRegExp("^a\\{2\\}*$").test("aaa")).toBe(false)
		expect(orgMatchRegExp("^a\\{2\\}+$").test("")).toBe(false)
	})

	it("returns original Unicode captures and raw UTF-16 offsets without case-folding the source", () => {
		const value = "😀\0Σς 𐐀𐐨"
		const sigma = orgMatchRegExp("\\(Σ\\)\\1").exec(value, 3)
		expect(sigma?.index).toBe(3)
		expect(sigma?.[0]).toBe("Σς")
		expect(sigma?.[1]).toBe("Σ")
		const supplementary = orgMatchRegExp("\\(𐐀\\)\\1").exec(value, 6)
		expect(supplementary?.index).toBe(6)
		expect(supplementary?.[0]).toBe("𐐀𐐨")
		expect(supplementary?.[1]).toBe("𐐀")
		expect(orgMatchRegExp("\\(k\\)\\1").test("kK")).toBe(false)
	})

	it("preserves explicit/reused capture numbers and the greatest preceding implicit number", () => {
		const match = orgMatchRegExp("\\(?3:a\\)\\(b\\)\\3\\4").exec("😀\0aBab", 2)
		expect(match?.index).toBe(3)
		expect(match?.[0]).toBe("aBab")
		expect(match?.[1]).toBeUndefined()
		expect(match?.[2]).toBeUndefined()
		expect(match?.[3]).toBe("a")
		expect(match?.[4]).toBe("B")
		expect(orgMatchRegExp("^\\(?1:a\\)\\(?1:b\\)\\1$").test("abb")).toBe(true)
		expect(orgMatchRegExp("^\\(?:\\(?1:a\\)\\|\\(?1:b\\)\\)\\1$").test("bb")).toBe(true)
		expect(orgMatchRegExp("\\(a\\)\\1").exec("😀aa\0AA", 4)?.index).toBe(5)
		expect(orgMatchRegExp("\\(a\\)\\1").exec("😀aa", 1)).toBeNull()
	})

	it("uses installed syntax/category tables and symbol edges instead of JS identity escapes", () => {
		expect(orgMatchRegExp("^\\s-+$").test(" \t")).toBe(true)
		expect(orgMatchRegExp("^\\s_+$").test("_")).toBe(true)
		expect(orgMatchRegExp("^\\s_+$", "tag").test("_")).toBe(false)
		expect(orgMatchRegExp("^\\sw+$", "tag").test("@_")).toBe(true)
		expect(orgMatchRegExp("^\\cg+$").test("Σ")).toBe(true)
		expect(orgMatchRegExp("^\\Cg+$").test("Σ")).toBe(false)
		expect(orgMatchRegExp("\\_<foo_bar\\_>").test("foo_bar")).toBe(true)
		expect(orgMatchRegExp("\\_<foo\\_>").test("foo_bar")).toBe(false)
	})

	it("keeps malformed GNU constructs and absent buffer-point authority explicit", () => {
		for (const pattern of ["\\s", "\\c", "\\_", "\\_x", "\\=", "\\1", "\\(a\\1\\)", "\\(?0:a\\)", "\\(?01:a\\)", "\\(?1:\\(?1:a\\)\\)", "\\(?=a\\)", "\\(", "\\)", "[[.a.]]", "[[:unknown:]]"]) {
			expect(() => orgMatchRegExp(pattern), pattern).toThrow()
			expect(readOrgSparseTreeMatchQuery(`match:{${pattern}}`).kind, pattern).toBe("error")
		}
		expect(() => orgMatchRegExp("\\=")).toThrow(/buffer point/)
	})

	it("selects the named acceptance property at its original raw UTF-16 coordinate", () => {
		const source = "* 😀 Prefix\r\nbody\0\r\n* Match\r\n:PROPERTIES:\r\n:NAME: aa\r\n:END:\r\n* Miss\r\n:PROPERTIES:\r\n:NAME: ab\r\n:END:"
		const query = parseOrgSparseTreeQuery("match:NAME={^\\(a\\)\\1$}")!
		expect(buildOrgSparseTreePlan(source, query).matchedHeadingStarts).toEqual([source.indexOf("* Match")])
	})

	it("defers special context until source group expansion, never accepting a forged drawer value", () => {
		for (const name of ["FILE", "BLOCKED", "CLOCKSUM", "CLOCKSUM_T"]) {
			const source = `* Root\n:PROPERTIES:\n:${name}: forged\n:END:`
			const query = parseOrgSparseTreeQuery(`match:${name}="forged"`)!
			expect(orgSparseTreeSpecialPropertyRequest(source, query).properties).toEqual([name])
			expect(() => buildOrgSparseTreePlan(source, query)).toThrow(OrgSparseTreeContextRequiredError)
		}
		const source = "#+TAGS: [ FILE : owned ]\n* Root :owned:"
		const query = parseOrgSparseTreeQuery('match:FILE="anything"')!
		expect(orgSparseTreeSpecialPropertyRequest(source, query).properties).toEqual([])
		expect(buildOrgSparseTreePlan(source, query).matchedHeadingStarts).toEqual([source.indexOf("* Root")])
	})
})
