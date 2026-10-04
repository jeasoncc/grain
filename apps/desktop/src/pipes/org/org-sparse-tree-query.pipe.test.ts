import { describe, expect, it } from "vitest"
import { parseOrgSparseTreeMatchQuery } from "./org-sparse-tree-query.pipe"

const parse = (expression: string) => parseOrgSparseTreeMatchQuery(`match: ${expression}`)
const balanced = (leaves: number): string =>
	leaves === 1
		? "todo"
		: `(${balanced(Math.floor(leaves / 2))} AND ${balanced(Math.ceil(leaves / 2))})`

describe("parseOrgSparseTreeMatchQuery", () => {
	it("requires the explicit, case-sensitive prefix", () => {
		for (const input of ["", "todo", "tag:work", 'text:"literal"', "MATCH: todo", "match:"]) {
			expect(parseOrgSparseTreeMatchQuery(input)).toBeNull()
		}
		expect(parseOrgSparseTreeMatchQuery(" \tmatch:todo\n ")).toEqual({ kind: "todo" })
	})

	it("parses every leaf without changing case or literal contents", () => {
		expect(parse("todo")).toEqual({ kind: "todo" })
		expect(parse("todo:WAIT")).toEqual({ kind: "todo", state: "WAIT" })
		expect(parse("tag:Work")).toEqual({ kind: "tag", name: "Work" })
		expect(parse("itag:项目")).toEqual({ kind: "itag", name: "项目" })
		expect(parse('text:"  a.*:b (AND OR NOT)  "')).toEqual({
			kind: "text",
			literal: "  a.*:b (AND OR NOT)  ",
		})
		expect(parse('text:"a\\"b\\\\c"')).toEqual({ kind: "text", literal: 'a"b\\c' })
	})

	it("uses NOT, AND, OR precedence and left associativity", () => {
		expect(parse("todo OR tag:a AND NOT itag:b OR todo:WAIT")).toEqual({
			kind: "or",
			left: {
				kind: "or",
				left: { kind: "todo" },
				right: {
					kind: "and",
					left: { kind: "tag", name: "a" },
					right: { kind: "not", operand: { kind: "itag", name: "b" } },
				},
			},
			right: { kind: "todo", state: "WAIT" },
		})
		expect(parse("todo AND tag:a AND tag:b")).toEqual({
			kind: "and",
			left: { kind: "and", left: { kind: "todo" }, right: { kind: "tag", name: "a" } },
			right: { kind: "tag", name: "b" },
		})
	})

	it("supports parentheses, repeated NOT, and whitespace", () => {
		expect(parse("NOT NOT (todo OR tag:a)\nAND\titag:b")).toEqual({
			kind: "and",
			left: {
				kind: "not",
				operand: {
					kind: "not",
					operand: { kind: "or", left: { kind: "todo" }, right: { kind: "tag", name: "a" } },
				},
			},
			right: { kind: "itag", name: "b" },
		})
	})

	it("rejects malformed expressions and consumes the entire input", () => {
		for (const expression of [
			"()",
			"(todo",
			"todo)",
			"todo todo",
			"AND todo",
			"todo OR",
			"NOT",
			"todo AND OR todo",
			"todo and todo",
			"!todo",
			"todo && todo",
			"todo || todo",
			"unknown:x",
			"TODO",
			"todo:",
			"tag:",
			"itag:",
			"tag:a:b",
			"tag: a",
			"todo: WAIT",
			"text:plain",
			'text: "literal"',
			'text:""',
			'text:"   "',
			'text:"unfinished',
			'text:"a"junk',
			'text:"a\\nb"',
			'text:"a\\tb"',
			'text:"a\\',
			'text:"a\\qb"',
			'tag:"work"',
		]) {
			expect(parse(expression), expression).toBeNull()
		}
	})

	it("bounds the complete input to 8192 UTF-16 code units before trimming", () => {
		const prefix = 'match:text:"'
		const literal = `${"😀".repeat(4089)}x`
		const input = `${prefix}${literal}"`
		expect(input.length).toBe(8192)
		expect(parseOrgSparseTreeMatchQuery(input)).toEqual({ kind: "text", literal })
		expect(parseOrgSparseTreeMatchQuery(`${input} `)).toBeNull()
		expect(parseOrgSparseTreeMatchQuery(`${" ".repeat(8192)}match:todo`)).toBeNull()
	})

	it("bounds parenthesis nesting and NOT recursion", () => {
		expect(parse(`${"(".repeat(32)}todo${")".repeat(32)}`)).toEqual({ kind: "todo" })
		expect(parse(`${"(".repeat(33)}todo${")".repeat(33)}`)).toBeNull()
		expect(parse(`${"NOT ".repeat(31)}todo`)).not.toBeNull()
		expect(parse(`${"NOT ".repeat(32)}todo`)).toBeNull()
		expect(parse(`${"(".repeat(20)}${"NOT ".repeat(20)}todo${")".repeat(20)}`)).toBeNull()
	})

	it("bounds resulting AST depth even for flat left-associative expressions", () => {
		for (const operator of ["AND", "OR"]) {
			expect(parse(Array(32).fill("todo").join(` ${operator} `))).not.toBeNull()
			expect(parse(Array(33).fill("todo").join(` ${operator} `))).toBeNull()
		}
		expect(parse(`NOT (${Array(32).fill("todo").join(" AND ")})`)).toBeNull()
	})

	it("allows 128 AST nodes but rejects 129, independent of depth", () => {
		expect(parse(balanced(64))).not.toBeNull()
		expect(parse(`NOT ${balanced(64)}`)).not.toBeNull()
		expect(parse(balanced(65))).toBeNull()
	})

	it("fails safely for adversarial input and does not retain parser state", () => {
		for (const expression of [
			"(".repeat(8000),
			"NOT ".repeat(1900),
			Array(1000).fill("todo").join(" OR "),
		]) {
			expect(parse(expression)).toBeNull()
		}
		expect(parse("todo")).toEqual({ kind: "todo" })
	})
})
