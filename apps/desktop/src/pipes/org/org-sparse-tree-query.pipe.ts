import type { OrgSparseTreeQuery } from "@/types/org"

const MAX_INPUT_LENGTH = 8192
const MAX_DEPTH = 32
const MAX_NODES = 128

type ParsedQuery = { readonly query: OrgSparseTreeQuery; readonly depth: number }

/** Parses only explicit match: expressions; legacy queries belong to the legacy parser. */
export const parseOrgSparseTreeMatchQuery = (input: string): OrgSparseTreeQuery | null => {
	if (input.length > MAX_INPUT_LENGTH) {
		return null
	}
	const source = input.trim()
	if (!source.startsWith("match:")) {
		return null
	}
	let position = "match:".length
	let nodes = 0

	const skipWhitespace = (): void => {
		while (position < source.length && /\s/.test(source[position])) {
			position++
		}
	}
	const word = (): string => {
		skipWhitespace()
		const start = position
		while (position < source.length && !/[\s()"\\]/.test(source[position])) {
			position++
		}
		return source.slice(start, position)
	}
	const takeOperator = (operator: string): boolean => {
		const start = position
		if (word() === operator) {
			return true
		}
		position = start
		return false
	}
	const node = (query: OrgSparseTreeQuery, depth = 1): ParsedQuery | null => {
		nodes++
		return nodes <= MAX_NODES && depth <= MAX_DEPTH ? { depth, query } : null
	}
	const quotedLiteral = (): string | null => {
		if (source[position] !== '"') {
			return null
		}
		position++
		let literal = ""
		while (position < source.length) {
			const character = source[position++]
			if (character === '"') {
				return literal.trim() ? literal : null
			}
			if (character === "\\") {
				const escaped = source[position++]
				if (escaped !== '"' && escaped !== "\\") {
					return null
				}
				literal += escaped
			} else {
				literal += character
			}
		}
		return null
	}
	const primary = (nesting: number): ParsedQuery | null => {
		skipWhitespace()
		if (source[position] === "(") {
			if (nesting >= MAX_DEPTH) {
				return null
			}
			position++
			const result = disjunction(nesting + 1)
			skipWhitespace()
			if (!result || source[position] !== ")") {
				return null
			}
			position++
			return result
		}
		const token = word()
		if (token === "todo") {
			return node({ kind: "todo" })
		}
		if (token === "text:") {
			const literal = quotedLiteral()
			return literal === null ? null : node({ kind: "text", literal })
		}
		if (token.startsWith("todo:") && token.length > 5) {
			return node({ kind: "todo", state: token.slice(5) })
		}
		const match = /^(tag|itag):([^:]+)$/.exec(token)
		if (!match) {
			return null
		}
		return node({ kind: match[1] === "tag" ? "tag" : "itag", name: match[2] })
	}
	const unary = (nesting: number): ParsedQuery | null => {
		if (!takeOperator("NOT")) {
			return primary(nesting)
		}
		if (nesting >= MAX_DEPTH) {
			return null
		}
		const operand = unary(nesting + 1)
		return operand ? node({ kind: "not", operand: operand.query }, operand.depth + 1) : null
	}
	const conjunction = (nesting: number): ParsedQuery | null => {
		let left = unary(nesting)
		while (left && takeOperator("AND")) {
			const right = unary(nesting)
			if (!right) {
				return null
			}
			left = node(
				{ kind: "and", left: left.query, right: right.query },
				Math.max(left.depth, right.depth) + 1,
			)
		}
		return left
	}
	const disjunction = (nesting: number): ParsedQuery | null => {
		let left = conjunction(nesting)
		while (left && takeOperator("OR")) {
			const right = conjunction(nesting)
			if (!right) {
				return null
			}
			left = node(
				{ kind: "or", left: left.query, right: right.query },
				Math.max(left.depth, right.depth) + 1,
			)
		}
		return left
	}

	const result = disjunction(0)
	skipWhitespace()
	return result && position === source.length ? result.query : null
}
