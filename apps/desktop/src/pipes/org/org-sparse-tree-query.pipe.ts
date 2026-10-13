import type { OrgMatchComparison, OrgMatchValue, OrgSparseTreeQuery } from "@/types/org/org-sparse-tree.interface"
import { ORG_DEFAULT_WORD_REGEXP_SOURCE } from "./org-default-syntax.pipe"
import { ORG_NATIVE_CASE_FOLDS, ORG_NATIVE_CHARACTER_ATOMS } from "./org-default-syntax-data.pipe"
import { ORG_NATIVE_REGEXP_CATEGORIES, ORG_NATIVE_REGEXP_SYNTAX } from "./org-default-regexp-data.pipe"

const nativeFoldPoints = Object.keys(ORG_NATIVE_CASE_FOLDS).map(Number)
const nativeLiteral = (character: string): string => ORG_NATIVE_CASE_FOLDS[character.codePointAt(0)!] ?? character

const MAX_INPUT_LENGTH = 8192
const MAX_DEPTH = 32
const MAX_NODES = 128
type ParsedQuery = { readonly query: OrgSparseTreeQuery; readonly depth: number }
export type OrgMatchParseResult =
	| { readonly kind: "query"; readonly query: OrgSparseTreeQuery }
	| { readonly kind: "error"; readonly offset: number; readonly message: string }

/** An Emacs matcher, deliberately not a RegExp whose source could be reinterpreted by JS. */
export interface OrgMatchRegExp {
	test(input: string): boolean
	exec(input: string, from?: number): RegExpExecArray | null
}

type GNURegexpNode =
	| { readonly kind: "atom"; readonly regexp: RegExp }
	| { readonly kind: "reference"; readonly number: number }
	| { readonly kind: "group"; readonly alternatives: readonly (readonly GNURegexpNode[])[]; readonly number?: number }
	| { readonly kind: "repeat"; readonly node: GNURegexpNode; readonly minimum: number; readonly maximum: number; readonly lazy: boolean }
type GNURegexpState = { readonly point: number; readonly captures: ReadonlyMap<number, readonly [number, number]> }

const nativeByteWidth = (point: number): number => point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4
const nativeReferenceEnd = (input: string, from: number, capture: readonly [number, number]): number | null => {
	let left = capture[0], right = from, leftBytes = 0, rightBytes = 0
	while (left < capture[1]) {
		const a = input.codePointAt(left), b = input.codePointAt(right)
		if (a === undefined || b === undefined || a !== b && (!ORG_NATIVE_CASE_FOLDS[a] || ORG_NATIVE_CASE_FOLDS[a] !== ORG_NATIVE_CASE_FOLDS[b])) return null
		leftBytes += nativeByteWidth(a)
		rightBytes += nativeByteWidth(b)
		left += a > 0xffff ? 2 : 1
		right += b > 0xffff ? 2 : 1
	}
	// GNU duplicate/bcmp_translate compares the original multibyte byte count,
	// not a JS /iu backreference (e.g. k and Kelvin sign have different widths).
	return leftBytes === rightBytes ? right : null
}

function* matchGNUSequence(nodes: readonly GNURegexpNode[], at: number, input: string, state: GNURegexpState): Generator<GNURegexpState> {
	if (at === nodes.length) { yield state; return }
	const stack = [{ at, matches: matchGNUNode(nodes[at], input, state) }]
	while (stack.length) {
		const current = stack[stack.length - 1], next = current.matches.next()
		if (next.done) stack.pop()
		else if (current.at + 1 === nodes.length) yield next.value
		else stack.push({ at: current.at + 1, matches: matchGNUNode(nodes[current.at + 1], input, next.value) })
	}
}

function* matchGNUNode(node: GNURegexpNode, input: string, state: GNURegexpState): Generator<GNURegexpState> {
	if (node.kind === "atom") {
		node.regexp.lastIndex = state.point
		const match = node.regexp.exec(input)
		if (match) yield { point: state.point + match[0].length, captures: state.captures }
	} else if (node.kind === "reference") {
		const capture = state.captures.get(node.number)
		const end = capture && nativeReferenceEnd(input, state.point, capture)
		if (end !== undefined && end !== null) yield { point: end, captures: state.captures }
	} else if (node.kind === "group") {
		for (const branch of node.alternatives) {
			for (const next of matchGNUSequence(branch, 0, input, state)) {
				if (node.number === undefined || node.number > 255) yield next
				else {
					const captures = new Map(next.captures)
					captures.set(node.number, [state.point, next.point])
					yield { point: next.point, captures }
				}
			}
		}
	} else {
		// Iterative repetition keeps long captures off the JS recursion stack.
		const frame = (current: GNURegexpState, count: number) => ({
			state: current, count, emitted: false,
			children: count < node.maximum ? matchGNUNode(node.node, input, current) : null,
		})
		const stack = [frame(state, 0)]
		while (stack.length) {
			const current = stack[stack.length - 1]
			if (node.lazy && !current.emitted && current.count >= node.minimum) {
				current.emitted = true
				yield current.state
			}
			const child = current.children?.next()
			if (child && !child.done) {
				if (child.value.point === current.state.point) {
					// Empty iterations cannot add text; record their captures once.
					if (node.maximum >= node.minimum) yield child.value
				} else stack.push(frame(child.value, current.count + 1))
			} else {
				stack.pop()
				if (!node.lazy && current.count >= node.minimum) yield current.state
			}
		}
	}
}

/**
 * Installed-default Emacs syntax/category/case tables, not JS Unicode syntax.
 * Ordinary patterns use JS only after translation; backreferences and explicit
 * numbering use GNU capture semantics (unmatched references fail, numbers may
 * repeat, implicit numbers follow the greatest previous number).
 * GNU string-match has no point, so \\= requires an unavailable buffer context.
 */
export const orgMatchRegExp = (pattern: string, syntax: "property" | "tag" = "property"): OrgMatchRegExp => {
	const word = syntax === "tag" ? ORG_NATIVE_CHARACTER_ATOMS.tagWord : ORG_DEFAULT_WORD_REGEXP_SOURCE
	const symbol = `[${word.slice(1, -1)}${ORG_NATIVE_REGEXP_SYNTAX[syntax]["_"]!.slice(1, -1)}]`
	const classes: Readonly<Record<string, string | undefined>> = ORG_NATIVE_CHARACTER_ATOMS
	type Group = { alternatives: GNURegexpNode[][]; number?: number }
	const groups: Group[] = [{ alternatives: [[]] }]
	const sequence = () => groups[groups.length - 1].alternatives.at(-1)!
	let translated = "", bracket = ""
	let inClass = false, classStart = false, maximumNumber = 0
	// Capture registers and repetition of an interval need GNU's atom program.
	// In GNU, a\\{m,n\\}? is an optional greedy interval, not a lazy interval.
	const captureMatcher = /\\[1-9]|\\\((?!\?:)|\\\}[?*+]/.test(pattern)
	const atom = (source: string) => {
		translated += source
		if (captureMatcher) sequence().push({ kind: "atom", regexp: new RegExp(source, "uy") })
	}
	const repetition = (minimum: number, maximum: number, source: string, index: number, allowLazy = true): number => {
		if (!Number.isSafeInteger(minimum) || maximum !== Infinity && !Number.isSafeInteger(maximum) || minimum > maximum || minimum > 65535 || maximum !== Infinity && maximum > 65535) throw new Error("Invalid GNU regexp repetition.")
		const lazy = allowLazy && pattern[index + 1] === "?"
		if (captureMatcher) {
			const nodes = sequence(), previous = nodes.pop()
			if (!previous) throw new Error("GNU regexp repetition has no operand.")
			nodes.push({ kind: "repeat", node: previous, minimum, maximum, lazy })
		}
		translated += source + (lazy ? "?" : "")
		return index + (lazy ? 1 : 0)
	}
	for (let index = 0; index < pattern.length; index++) {
		const character = String.fromCodePoint(pattern.codePointAt(index)!)
		index += character.length - 1
		if (inClass) {
			if (character === "[" && /[:.=]/.test(pattern[index + 1] ?? "")) {
				const match = /^\[:([a-z]+):\]/.exec(pattern.slice(index))
				if (!match || match[1] !== "word" && classes[match[1]] === undefined) throw new Error("Unsupported GNU regexp character class or collation.")
				bracket += (match[1] === "word" ? word : classes[match[1]]!).slice(1, -1)
				index += match[0].length - 1
			} else if (character === "]" && !classStart) {
				inClass = false
				atom(bracket + "]")
			} else if (pattern[index + 1] === "-" && pattern[index + 2] !== undefined && pattern[index + 2] !== "]") {
				const last = String.fromCodePoint(pattern.codePointAt(index + 2)!)
				const low = character.codePointAt(0)!, high = last.codePointAt(0)!
				bracket += `\\u{${low.toString(16)}}-\\u{${high.toString(16)}}`
				const aliases = new Set<string>()
				for (const point of nativeFoldPoints) {
					if (point < low || point > high) continue
					for (const alias of ORG_NATIVE_CASE_FOLDS[point]!.matchAll(/\\u\{([0-9a-f]+)\}/g)) {
						const value = Number.parseInt(alias[1], 16)
						if (value < low || value > high) aliases.add(alias[0])
					}
				}
				bracket += [...aliases].join("")
				index += 1 + last.length
			} else {
				// GNU backslashes do not quote inside bracket expressions.
				const fold = ORG_NATIVE_CASE_FOLDS[character.codePointAt(0)!]
				bracket += fold ? fold.slice(1, -1) : character === "\\" ? "\\\\" : character === "[" ? "\\[" : character === "]" ? "\\]" : character
			}
			if (!(classStart && character === "^")) classStart = false
			continue
		}
		if (character === "[") {
			bracket = "["
			inClass = true
			classStart = true
			continue
		}
		if (character !== "\\") {
			if (/[*+?]/.test(character)) index = repetition(character === "+" ? 1 : 0, character === "?" ? 1 : Infinity, character, index)
			else atom(character === "." ? "[^\\n]" : character === "^" ? "(?<![^\\n])" : character === "$" ? "(?![^\\n])" : /[()|{}\]]/.test(character) ? `\\${character}` : nativeLiteral(character))
			continue
		}
		if (++index >= pattern.length) throw new Error("Unterminated GNU regexp escape.")
		const escaped = String.fromCodePoint(pattern.codePointAt(index)!)
		index += escaped.length - 1
		if (escaped === "(") {
			let number: number | undefined
			if (pattern[index + 1] === "?") {
				const extension = /^\?(?:([1-9]\d*))?:/.exec(pattern.slice(index + 1))
				if (!extension) throw new Error("Invalid GNU regexp group extension.")
				if (extension[1]) {
					number = Number(extension[1])
					if (!Number.isSafeInteger(number) || number > 2147483647 || groups.some((group) => group.number === number)) throw new Error("Invalid GNU regexp group number.")
					maximumNumber = Math.max(maximumNumber, number)
				}
				index += extension[0].length
			} else number = ++maximumNumber
			groups.push({ alternatives: [[]], ...(number === undefined ? {} : { number }) })
			translated += number === undefined ? "(?:" : "("
		} else if (escaped === ")") {
			if (groups.length === 1) throw new Error("Unmatched GNU regexp closing group.")
			const group = groups.pop()!
			if (captureMatcher) sequence().push({ kind: "group", ...group })
			translated += ")"
		} else if (escaped === "|") {
			groups[groups.length - 1].alternatives.push([])
			translated += "|"
		} else if (escaped === "{") {
			const interval = /^(\d+)(?:,(\d*))?\\\}/.exec(pattern.slice(index + 1))
			if (!interval) throw new Error("Invalid GNU regexp repetition.")
			index += interval[0].length
			index = repetition(Number(interval[1]), interval[2] === undefined ? Number(interval[1]) : interval[2] === "" ? Infinity : Number(interval[2]), `{${interval[1]}${interval[2] === undefined ? "" : `,${interval[2]}`}}`, index, false)
		} else if (escaped === "`") atom("(?<![\\s\\S])")
		else if (escaped === "'") atom("(?![\\s\\S])")
		else if (escaped === "w") atom(word)
		else if (escaped === "W") atom(`(?!${word})[\\s\\S]`)
		else if (escaped === "<") atom(`(?<!${word})(?=${word})`)
		else if (escaped === ">") atom(`(?<=${word})(?!${word})`)
		else if (escaped === "b") atom(`(?:(?<![\\s\\S])|(?![\\s\\S])|(?<!${word})(?=${word})|(?<=${word})(?!${word}))`)
		else if (escaped === "B") atom(`(?<=[\\s\\S])(?=[\\s\\S])(?:(?<=${word})(?=${word})|(?<!${word})(?!${word}))`)
		else if (/[sScC]/.test(escaped)) {
			const point = pattern.codePointAt(++index)
			if (point === undefined) throw new Error("Unterminated GNU regexp syntax/category code.")
			const code = String.fromCodePoint(point)
			index += code.length - 1
			// syntax_spec_code's unused byte entries are 255: no syntax class.
			const source = /[sS]/.test(escaped) ? ORG_NATIVE_REGEXP_SYNTAX[syntax][code === "-" ? " " : code] ?? (point <= 255 ? "[]" : undefined) : ORG_NATIVE_REGEXP_CATEGORIES[code]
			if (source === undefined) throw new Error("Invalid GNU regexp syntax/category code.")
			atom(escaped === "S" || escaped === "C" ? `(?!${source})[\\s\\S]` : source)
		} else if (escaped === "_") {
			const boundary = pattern[++index]
			if (boundary !== "<" && boundary !== ">") throw new Error("Invalid GNU regexp symbol boundary.")
			atom(boundary === "<" ? `(?<!${symbol})(?=${symbol})` : `(?<=${symbol})(?!${symbol})`)
		} else if (escaped === "=") throw new Error("GNU regexp \\= requires buffer point; Org string matching has no point context.")
		else if (/[1-9]/.test(escaped)) {
			const number = Number(escaped)
			if (number > maximumNumber || groups.some((group) => group.number === number)) throw new Error("Invalid GNU regexp backreference.")
			sequence().push({ kind: "reference", number })
			translated += "(?:)"
		} else atom(/[\\^$.*+?()[\]{}|/-]/.test(escaped) ? `\\${escaped === "-" ? "x2d" : escaped}` : nativeLiteral(escaped))
	}
	if (inClass) throw new Error("Unterminated GNU regexp character class.")
	if (groups.length !== 1) throw new Error("Unterminated GNU regexp group.")
	const regexp = captureMatcher ? null : new RegExp(translated, "gu")
	const root: GNURegexpNode = { kind: "group", alternatives: groups[0].alternatives }
	const emptyCaptures: ReadonlyMap<number, readonly [number, number]> = new Map()
	const findCapture = (input: string, from: number): { readonly start: number; readonly state: GNURegexpState } | null => {
		for (let start = from; start <= input.length; start += input.codePointAt(start)! > 0xffff ? 2 : 1) {
			for (const state of matchGNUNode(root, input, { point: start, captures: emptyCaptures })) return { start, state }
		}
		return null
	}
	const exec = (input: string, from = 0): RegExpExecArray | null => {
		if (!Number.isSafeInteger(from) || from < 0 || from > input.length || from > 0 && /[\udc00-\udfff]/.test(input[from]) && /[\ud800-\udbff]/.test(input[from - 1])) return null
		if (regexp) { regexp.lastIndex = from; return regexp.exec(input) }
		const match = findCapture(input, from)
		if (!match) return null
		const result = new Array<string>(maximumNumber + 1) as RegExpExecArray
		result[0] = input.slice(match.start, match.state.point)
		for (const [number, [begin, end]] of match.state.captures) result[number] = input.slice(begin, end)
		result.index = match.start
		result.input = input
		return result
	}
	return {
		exec,
		test: (input) => {
			if (!regexp) return findCapture(input, 0) !== null
			regexp.lastIndex = 0
			return regexp.test(input)
		},
	}
}

/** All offsets are UTF-16 offsets in the original input, including leading whitespace. */
const readGrainSparseTreeMatchQuery = (source: string, allowUnprefixed = false): OrgMatchParseResult => {
	let position = 0
	let nodes = 0
	let failure: { readonly offset: number; readonly message: string } | null = null
	const fail = (message: string): null => {
		failure ??= { offset: Math.min(position, source.length), message }
		return null
	}
	if (source.length > MAX_INPUT_LENGTH) return { kind: "error", offset: MAX_INPUT_LENGTH, message: "Match exceeds 8192 UTF-16 units." }
	const whitespace = () => { while (/\s/.test(source[position] ?? "") && position < source.length) position++ }
	whitespace()
	if (source.startsWith("match:", position)) position += 6
	else if (!allowUnprefixed) return { kind: "error", offset: position, message: "Expected match: prefix." }
	const node = (query: OrgSparseTreeQuery, depth = 1): ParsedQuery | null => {
		nodes++
		if (nodes > MAX_NODES || depth > MAX_DEPTH) return fail("Match exceeds 128 nodes or depth 32.")
		return { depth, query }
	}
	const keyword = (value: string): boolean => {
		whitespace()
		if (value === "NOT" && /^(?:\s*|\s*[)&|])$/.test(source.slice(position + value.length))) return false
		if (source.startsWith(value, position) && !/^[\p{L}\p{M}\p{N}_:]/u.test(source.slice(position + value.length))) {
			position += value.length
			return true
		}
		return false
	}
	const delimited = (closing: string, regex = false, orgString = false): string | null => {
		position++
		let value = ""
		while (position < source.length) {
			const character = source[position++]
			if (character === closing) return value
			if (character === "\\" && !orgString) {
				const escaped = source[position++]
				if (escaped === undefined) return fail("Unterminated escape.")
				if (regex) value += escaped === closing ? closing : `\\${escaped}`
				else if (escaped === '"' || escaped === "\\") value += escaped
				else return fail("Quoted strings only escape quotes and backslashes.")
			} else value += character
		}
		return fail("Unterminated quoted value or regular expression.")
	}
	const regexp = (): string | null => {
		const pattern = delimited("}", true)
		if (pattern === null) return null
		if (!pattern) return fail("GNU match regular expressions must not be empty.")
		if (/(?:^|[^\\])(?:\\\\)*\|/.test(pattern)) return fail("GNU match regex alternation must use \\|, not a JavaScript |.")
		if (pattern.includes("\\{")) return fail("GNU match's brace delimiters cannot safely contain regexp intervals; use explicit repetitions.")
		if (pattern.includes("/")) return fail("GNU match's TODO suffix delimiter is ambiguous inside a regexp; use a quoted property string.")
		try { orgMatchRegExp(pattern) } catch (error) { return fail(error instanceof Error ? error.message : "Invalid GNU regular expression.") }
		return pattern
	}
	const value = (): OrgMatchValue | null => {
		whitespace()
		if (source[position] === "{") {
			const pattern = regexp()
			return pattern === null ? null : { kind: "regexp", value: pattern }
		}
		if (source[position] === '"') {
			const literal = delimited('"', false, true)
			if (literal === null) return null
			// This is the actual org-make-tags-matcher TIMEP test. Some strings
			// (e.g. <yesterday>, <+2h>) remain string operands in GNU Org.
			if (/^(?:<|\[)(?:[0-9]+|now|today|tomorrow|[+-][0-9]+[dmwy])[^\n]*(?:>|\])$/i.test(literal)) {
				return { kind: "date", value: literal }
			}
			return { kind: "string", value: literal }
		}
		const number = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(position))
		if (!number || !Number.isFinite(Number(number[0]))) return fail("Expected a quoted string, date, regex, or finite number.")
		position += number[0].length
		return { kind: "number", value: Number(number[0]) }
	}
	let todoPart = false
	const primary = (nesting: number): ParsedQuery | null => {
		whitespace()
		if (source[position] === "(") {
			if (nesting >= MAX_DEPTH) return fail("Match nesting exceeds depth 32.")
			position++
			const result = disjunction(nesting + 1)
			whitespace()
			if (!result || source[position] !== ")") return fail("Expected closing parenthesis.")
			position++
			return result
		}
		if (source[position] === "{") {
			const pattern = regexp()
			return pattern === null ? null : node({ kind: todoPart ? "todo-regexp" : "tag-regexp", pattern })
		}
		let token = ""
		let propertyNameValid = true
		let escapedName = false
		if (/^(?:tag|itag|todo):/.test(source.slice(position))) {
			token = /^[^\s()|&!<>=/{}"\\]+/.exec(source.slice(position))?.[0] ?? ""
			position += token.length
			propertyNameValid = false
		} else {
			while (position < source.length && !/[\s()|&+\-!<>=/{}"]/.test(source[position])) {
				const character = String.fromCodePoint(source.codePointAt(position)!)
				position += character.length
				if (character === "\\") {
					escapedName = true
					const codepoint = source.codePointAt(position)
					if (codepoint === undefined) return fail("Unterminated property-name escape.")
					const escaped = String.fromCodePoint(codepoint)
					if (/\s/.test(escaped)) return fail("A property-name escape requires a non-whitespace character.")
					position += escaped.length
					token += escaped
				} else {
					if (!/[\p{L}\p{N}_]/u.test(character)) propertyNameValid = false
					token += character
				}
			}
		}
		if (!token) return fail("Expected a tag, property comparison, or TODO state.")
		if (todoPart) {
			if (escapedName || !/^[\p{L}\p{N}_@#%]+$/u.test(token)) return fail("Use a GNU regular expression for TODO states outside the exact tag-token syntax.")
			return node({ kind: "todo", state: token })
		}
		// Preserve exact legacy leaf forms (including no whitespace after the colon).
		if (token === "text:") {
			if (source[position] !== '"') return fail("text: requires an immediately quoted literal.")
			const literal = delimited('"')
			return literal !== null && literal.trim() ? node({ kind: "text", literal }) : fail("Text literal must not be empty.")
		}
		if (token.startsWith("todo:")) return token.length > 5 ? node({ kind: "todo", state: token.slice(5) }) : fail("Missing TODO state.")
		const legacyTag = /^(tag|itag):([^:]+)$/.exec(token)
		if (legacyTag) return node({ kind: legacyTag[1] === "tag" ? "tag" : "itag", name: legacyTag[2] })
		const beforeSpace = position
		whitespace()
		const comparison = /^(<>|!=|\/=|<=|>=|==|=|<|>)/.exec(source.slice(position))?.[0]
		if (comparison) {
			position += comparison.length
			if (!propertyNameValid) return fail("Property names must escape punctuation; letters, numbers and underscores need no escape.")
			const requirePresent = source[position] === "*"
			if (requirePresent) position++
			const expected = value()
			if (!expected) return null
			const operator = (comparison === "!=" || comparison === "/=" ? "<>" : comparison === "==" ? "=" : comparison) as OrgMatchComparison
			if (expected.kind === "regexp" && operator !== "=" && operator !== "<>") return fail("Regex properties only support = or <>.")
			return node({ kind: "property", name: token.toUpperCase(), comparison: operator, value: expected, ...(requirePresent ? { requirePresent: true } : {}) })
		}
		position = beforeSpace
		if (token.includes(":")) return fail("Invalid predicate prefix.")
		if (escapedName || !/^[\p{L}\p{N}_@#%]+$/u.test(token)) return fail("Expected a valid Org tag or an escaped property comparison.")
		return node({ kind: "itag", name: token })
	}
	const unary = (nesting: number): ParsedQuery | null => {
		whitespace()
		let negate = false
		let signed = false
		if (source[position] === "-" || source[position] === "+") { negate = source[position++] === "-"; signed = true }
		else if (keyword("NOT")) negate = true
		else return primary(nesting)
		if (nesting >= MAX_DEPTH) return fail("Match nesting exceeds depth 32.")
		const operand = signed ? primary(nesting + 1) : unary(nesting + 1)
		if (!operand) return null
		return negate ? node({ kind: "not", operand: operand.query }, operand.depth + 1) : operand
	}
	const conjunction = (nesting: number): ParsedQuery | null => {
		let left = unary(nesting)
		while (left) {
			whitespace()
			if (source[position] === "&") position++
			else if (!keyword("AND") && source[position] !== "+" && source[position] !== "-") break
			const right = unary(nesting)
			if (!right) return null
			left = node({ kind: "and", left: left.query, right: right.query }, Math.max(left.depth, right.depth) + 1)
		}
		return left
	}
	const disjunction = (nesting: number): ParsedQuery | null => {
		let left = conjunction(nesting)
		while (left) {
			whitespace()
			if (source[position] === "|") position++
			else if (!keyword("OR")) break
			const right = conjunction(nesting)
			if (!right) return null
			left = node({ kind: "or", left: left.query, right: right.query }, Math.max(left.depth, right.depth) + 1)
		}
		return left
	}
	let result: ParsedQuery | null
	whitespace()
	// A leading slash permits a TODO-only expression. /! additionally restricts to pending states.
	result = source[position] === "/" ? null : disjunction(0)
	whitespace()
	if (source[position] === "/") {
		while (source[position] === "/") position++
		todoPart = true
		whitespace()
		const pendingOnly = source[position] === "!"
		if (pendingOnly) position++
		whitespace()
		const pending = pendingOnly ? node({ kind: "todo" }) : null
		let todo = position === source.length ? pending ?? node({ kind: "all" }) : disjunction(0)
		if (todo && pending && todo !== pending) todo = node({ kind: "and", left: pending.query, right: todo.query }, Math.max(pending.depth, todo.depth) + 1)
		if (!todo) result = null
		else result = result && todo.query.kind !== "all" ? node({ kind: "and", left: result.query, right: todo.query }, Math.max(result.depth, todo.depth) + 1) : result ?? todo
	}
	whitespace()
	if (result && position === source.length && !failure) return { kind: "query", query: result.query }
	return { kind: "error", ...(failure ?? { offset: position, message: "Unexpected token or incomplete match expression." }) }
}

const nativeMatchTerm = new RegExp(`^&?(?<sign>[-+:])?(?<term>\\{[^}]+\\}|(?<name>(?:${ORG_NATIVE_CHARACTER_ATOMS.alnum}|_|\\\\(?!${ORG_NATIVE_CHARACTER_ATOMS.space})[\\s\\S])+)(?<operator>[<=>]=?|[!/]=|<>)(?<star>\\*)?(?<value>\\{[^}]+\\}|"[^"]*"|-?[.0-9]+(?:[eE][-+]?[0-9]+)?)|(?:${ORG_NATIVE_CHARACTER_ATOMS.alnum}|[_@#%])+)`, "u")

const hasLocalMatchPredicate = (source: string): boolean => {
	let quoted = false
	for (let at = 0; at < source.length; at++) {
		const character = source[at]
		if (character === '"') { quoted = !quoted; continue }
		if (quoted) continue
		if (character === "\\") { at += String.fromCodePoint(source.codePointAt(at + 1) ?? 0).length; continue }
		if (character === "{") { const end = source.indexOf("}", at + 1); if (end < 0) return false; at = end; continue }
		if ((at === 0 || /[\s(&|+\-]/.test(source[at - 1])) && /^(?:tag|itag|todo|text):/.test(source.slice(at))) return true
	}
	return false
}

const gnuRegexpQuote = (value: string): string => value.replace(/[\\^$.*+?[\]]/gu, "\\$&")
const nativeStringOrder = (left: string, right: string): number => {
	let a = 0, b = 0
	while (a < left.length && b < right.length) {
		const x = left.codePointAt(a)!, y = right.codePointAt(b)!
		if (x !== y) return x - y
		a += x > 0xffff ? 2 : 1; b += y > 0xffff ? 2 : 1
	}
	return left.length - right.length
}
const commonPrefix = (strings: readonly string[]): string => {
	let end = 0
	for (const character of strings[0]) {
		if (!strings.every((value) => value.startsWith(character, end))) break
		end += character.length
	}
	return strings[0].slice(0, end)
}
const nativeCharset = (characters: readonly string[]): string => {
	const points = [...new Set(characters.map((value) => value.codePointAt(0)!))].sort((a, b) => a - b)
	let body = ""
	for (let at = 0; at < points.length; at++) {
		if (points[at] === 45 || points[at] === 93 || points[at] === 94) continue
		const first = points[at]
		while (at + 1 < points.length && points[at + 1] !== 45 && points[at + 1] !== 93 && points[at + 1] !== 94 && points[at + 1] === points[at] + 1) at++
		const last = points[at]
		if (last - first > 2) body += `${String.fromCodePoint(first)}-${String.fromCodePoint(last)}`
		else for (let point = first; point <= last; point++) body += String.fromCodePoint(point)
	}
	const all = `${points.includes(93) ? "]" : ""}${body}${points.includes(94) ? "^" : ""}${points.includes(45) ? "-" : ""}`
	return oneCharacter(all) ? gnuRegexpQuote(all) : all === "^-" ? "[-^]" : `[${all}]`
}
const oneCharacter = (value: string): boolean => value.length === 1 || value.length === 2 && value.codePointAt(0)! > 0xffff
/** regexp-opt's exact text matters when expansion occurs inside a quoted operand. */
const nativeRegexpOptGroup = (strings: readonly string[], paren = false, lax = false): string => {
	const open = paren ? "\\(?:" : "", close = paren ? "\\)" : ""
	const charsetOpen = lax ? "" : open, charsetClose = lax ? "" : close
	if (strings.length === 0) return ""
	if (strings.length === 1) return oneCharacter(strings[0]) ? `${charsetOpen}${gnuRegexpQuote(strings[0])}${charsetClose}` : `${open}${gnuRegexpQuote(strings[0])}${close}`
	if (strings[0] === "") return `${charsetOpen}${nativeRegexpOptGroup(strings.slice(1), true, true)}?${charsetClose}`
	if (oneCharacter(strings[0]) && strings.slice(1).some(oneCharacter)) {
		const letters = strings.filter(oneCharacter), rest = strings.filter((value) => !oneCharacter(value))
		return rest.length ? `${open}${nativeRegexpOptGroup(rest)}\\|${nativeCharset(letters)}${close}` : `${charsetOpen}${nativeCharset(letters)}${charsetClose}`
	}
	const prefix = commonPrefix(strings)
	if (prefix) return `${open}${gnuRegexpQuote(prefix)}${nativeRegexpOptGroup(strings.map((value) => value.slice(prefix.length)), true, true)}${close}`
	const suffix = [...commonPrefix(strings.map((value) => [...value].reverse().join("")))].reverse().join("")
	if (suffix) return `${open}${nativeRegexpOptGroup(strings.map((value) => value.slice(0, -suffix.length)).sort(nativeStringOrder), true, true)}${gnuRegexpQuote(suffix)}${close}`
	const initial = String.fromCodePoint(strings[0].codePointAt(0)!)
	const first = strings.filter((value) => value.startsWith(initial)), rest = strings.slice(first.length)
	return `${open}${nativeRegexpOptGroup(first)}\\|${nativeRegexpOptGroup(rest)}${close}`
}

/** Buffer declarations affect GNU compilation before splitting, even inside strings. */
export const expandOrgSparseTreeMatchGroups = (input: string, groups: ReadonlyMap<string, readonly string[]>): string => {
	const prefix = /^\s*match:/.exec(input)?.[0] ?? ""
	const body = input.slice(prefix.length)
	if (groups.size === 0 || hasLocalMatchPredicate(body)) return input
	const expressions = [...body.matchAll(/\{[^\n]+?\}/g)].map((match) => ({ from: match.index, to: match.index + match[0].length }))
	const pattern = orgMatchRegExp(`\\([+-]?\\)\\<\\(${[...groups.keys()].map(gnuRegexpQuote).join("\\|")}\\)\\>`, "tag")
	let result = prefix, copied = 0, from = 0
	for (let match = pattern.exec(body, from); match; match = pattern.exec(body, from)) {
		const [whole, operator, token] = match
		const start = match.index
		from = start + whole.length
		result += body.slice(copied, start)
		copied = from
		if (expressions.some((range) => start >= range.from && start < range.to)) {
			result += whole
			continue
		}
		const seen = new Set<string>(), pending = [token], regular: string[] = [], regexps: string[] = []
		while (pending.length) {
			const name = pending.pop()!
			if (seen.has(name)) continue
			seen.add(name)
			const regexp = /\{([^\n]+?)\}/.exec(name)
			if (regexp) regexps.push(regexp[1])
			else regular.push(name)
			for (const member of [...(groups.get(name) ?? [])].reverse()) pending.push(member)
		}
		const literals = nativeRegexpOptGroup([...new Set(regular)].sort(nativeStringOrder), true, true)
		const expanded = regular.length ? `\\<${literals}\\>${regexps.length ? `\\|${regexps.join("\\|")}` : ""}` : regexps.join("\\|")
		result += `${operator}{${expanded}}`
	}
	return result + body.slice(copied)
}

/** GNU splits globally before lexing; its TODO part deliberately does not repair escaped pipes. */
export const readOrgSparseTreeMatchQuery = (source: string, allowUnprefixed = false): OrgMatchParseResult => {
	if (source.length > MAX_INPUT_LENGTH) return { kind: "error", offset: MAX_INPUT_LENGTH, message: "Match exceeds 8192 UTF-16 units." }
	let offset = /^\s*/.exec(source)![0].length
	if (source.startsWith("match:", offset)) offset += 6
	else if (!allowUnprefixed) return { kind: "error", offset, message: "Expected match: prefix." }
	const input = source.slice(offset)
	if (hasLocalMatchPredicate(input)) return readGrainSparseTreeMatchQuery(source, allowUnprefixed)
	if (!input.trim()) return { kind: "error", offset, message: "Expected a match expression." }
	let count = 0
	const leaf = (query: OrgSparseTreeQuery): ParsedQuery => {
		if (++count > MAX_NODES) throw new Error("Match exceeds 128 nodes.")
		return { query, depth: 1 }
	}
	const combine = (kind: "and" | "or", left: ParsedQuery, right: ParsedQuery): ParsedQuery => {
		if (++count > MAX_NODES || Math.max(left.depth, right.depth) >= MAX_DEPTH) throw new Error("Match exceeds 128 nodes or depth 32.")
		return { query: { kind, left: left.query, right: right.query }, depth: Math.max(left.depth, right.depth) + 1 }
	}
	const negate = (operand: ParsedQuery): ParsedQuery => {
		if (++count > MAX_NODES || operand.depth >= MAX_DEPTH) throw new Error("Match exceeds 128 nodes or depth 32.")
		return { query: { kind: "not", operand: operand.query }, depth: operand.depth + 1 }
	}
	const matchParts = (text: string, todo: boolean): ParsedQuery | undefined => {
		const parts = text.split("|").map((part) => part.replace(/^[ \f\t\n\r\v]+|[ \f\t\n\r\v]+$/g, "")).filter(Boolean)
		let result: ParsedQuery | undefined
		for (let part = 0; part < parts.length; part++) {
			let term = parts[part]
			if (!todo) while (term.endsWith("\\") && part + 1 < parts.length) term += `|${parts[++part]}`
			let conjunction: ParsedQuery | undefined
			let match: RegExpExecArray | null
			while ((match = nativeMatchTerm.exec(term))) {
				const fields = match.groups!
				let query: OrgSparseTreeQuery
				if (fields.term.startsWith("{")) {
					const pattern = fields.term.slice(1, -1)
					orgMatchRegExp(pattern, todo ? "property" : "tag")
					query = { kind: todo ? "todo-regexp" : "tag-regexp", pattern }
				} else if (todo) query = { kind: "todo", state: fields.term }
				else if (fields.name) {
					const name = fields.name.replace(/\\([\s\S])/gu, "$1").toUpperCase()
					const raw = fields.value
					let value: OrgMatchValue
					if (raw.startsWith("{")) {
						const pattern = raw.slice(1, -1)
						orgMatchRegExp(pattern)
						value = { kind: "regexp", value: pattern }
					} else if (raw.startsWith('"')) {
						const literal = raw.slice(1, -1)
						value = { kind: /^(?:<|\[)(?:[0-9]+|now|today|tomorrow|[+-][0-9]+[dmwy])[^\n]*(?:>|\])$/i.test(literal) ? "date" : "string", value: literal }
					} else value = { kind: "number", value: Number(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(raw)?.[0] ?? 0) }
					const operator = fields.operator === "!=" || fields.operator === "/=" ? "<>" : fields.operator === "==" ? "=" : fields.operator
					// GNU applies every regexp operator as positive matching except /=.
					const comparison = (value.kind === "regexp" && operator !== "<>" ? "=" : operator) as OrgMatchComparison
					query = { kind: "property", name, comparison, value, ...(fields.star ? { requirePresent: true } : {}) }
				} else query = { kind: "itag", name: fields.term }
				let parsed = leaf(query)
				if (fields.sign === "-") parsed = negate(parsed)
				conjunction = conjunction ? combine("and", conjunction, parsed) : parsed
				term = term.slice(match[0].length)
			}
			// Tags use (and) => t; TODO uses (car nil) => nil when no term lexes.
			const branch = conjunction ?? (todo ? negate(leaf({ kind: "all" })) : leaf({ kind: "all" }))
			result = result ? combine("or", result, branch) : branch
		}
		return result
	}
	try {
		let tags = input, todos = "", pendingOnly = false
		const slash = input.lastIndexOf("/")
		if (slash >= 0 && !input.slice(slash).includes('"')) {
			let start = slash
			while (start > 0 && input[start - 1] === "/") start--
			tags = input.slice(0, start)
			todos = input.slice(slash + 1)
			if (todos.startsWith("!")) { pendingOnly = true; todos = todos.slice(1) }
		}
		let result = matchParts(tags, false)
		const todo = matchParts(todos, true)
		if (todo) result = result ? combine("and", result, todo) : todo
		result ??= leaf({ kind: "all" })
		if (pendingOnly) result = combine("and", result, leaf({ kind: "todo" }))
		return { kind: "query", query: result.query }
	} catch (error) {
		return { kind: "error", offset, message: error instanceof Error ? error.message : "Invalid GNU match expression." }
	}
}

/** Null remains the existing parser contract; readers can surface precise errors through read*. */
export const parseOrgSparseTreeMatchQuery = (input: string, allowUnprefixed = false): OrgSparseTreeQuery | null => {
	const result = readOrgSparseTreeMatchQuery(input, allowUnprefixed)
	return result.kind === "query" ? result.query : null
}
