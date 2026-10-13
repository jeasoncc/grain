import { parseOrgPlanningLine } from "./org-planning-line.pipe"
import { formatOrgTimestamp, isOrgCalendarISO, readOrgStoredTimestamp, type OrgTimestampValue } from "./org-date-reader.pipe"

const normalizedCaptureTitle = (title: string): string =>
	title.trim().replace(/\s*[\r\n]+\s*/g, " ")

/** Appends a top-level TODO heading without parsing or rewriting the existing Org source. */
export const appendOrgTodoCapture = (source: string, title: string): string => {
	const normalizedTitle = normalizedCaptureTitle(title)
	if (!normalizedTitle) {
		throw new Error("Org capture title must not be blank.")
	}
	const lineEnding = source.includes("\r\n") ? "\r\n" : "\n"
	const separator = source.length > 0 && !source.endsWith("\n") ? lineEnding : ""
	return `${source}${separator}* TODO ${normalizedTitle}${lineEnding}`
}

/** Atomic replacements in original raw-source coordinates; cursor in final raw source. */
export interface OrgTextEditBatch {
	readonly changes: readonly {
		readonly from: number
		readonly to: number
		readonly insert: string
	}[]
	readonly cursor: number
	readonly requiredVisibleRanges?: readonly { readonly from: number; readonly to: number }[]
}

export interface OrgTextEdit {
	readonly from: number
	readonly to: number
	readonly insert: string
	readonly cursor: number
}

export interface RawOrgLine {
	readonly from: number
	readonly contentTo: number
	readonly breakTo: number
	readonly text: string
}

function* rawOrgLines(content: string, from = 0): IterableIterator<RawOrgLine> {
	const breaks = /\r\n|\r|\n/g
	breaks.lastIndex = from
	let position = from
	for (let boundary = breaks.exec(content); boundary; boundary = breaks.exec(content)) {
		const contentTo = boundary.index
		const breakTo = contentTo + boundary[0].length
		yield { from: position, contentTo, breakTo, text: content.slice(position, contentTo) }
		position = breakTo
	}
	yield {
		from: position,
		contentTo: content.length,
		breakTo: content.length,
		text: content.slice(position),
	}
}

const lineRangeAt = (content: string, cursor: number) => {
	const safeCursor = Math.max(0, Math.min(cursor, content.length))
	// Both code units of CRLF belong to the preceding line. NaN retains the
	// original first-line fallback without changing the returned safe cursor.
	let from = Number.isNaN(safeCursor) ? 0 : Math.floor(safeCursor)
	if (content.charCodeAt(from) === 10 && content.charCodeAt(from - 1) === 13) from--
	while (from > 0) {
		const previous = content.charCodeAt(from - 1)
		if (previous === 10 || previous === 13) break
		from--
	}
	let to = from
	while (to < content.length) {
		const next = content.charCodeAt(to)
		if (next === 10 || next === 13) break
		to++
	}
	return { from, safeCursor, to }
}

const cursorAfterEdit = (cursor: number, from: number, to: number, insert: string): number =>
	cursor <= from ? cursor : Math.max(from, cursor + insert.length - (to - from))

export interface OrgTodoKeywords {
	readonly todo: readonly string[]
	readonly done: readonly string[]
}

interface OrgTodoSequence extends OrgTodoKeywords {
	readonly all: readonly string[]
}

export interface OrgBlockRange {
	readonly from: number
	readonly to: number
	readonly closed: boolean
}

// COMMENT is a heading marker after an optional configured state and priority,
// not an arbitrary word appearing anywhere in a title.
export const orgHeadingIsComment = (title: string, states: ReadonlySet<string>): boolean => {
	const first = title.split(/[ \t]+/, 1)[0]
	const withoutState = states.has(first) ? title.slice(first.length).trimStart() : title
	return /^COMMENT(?:[ \t]|$)/.test(withoutState.replace(/^\[#[A-Za-z0-9]\][ \t]+/, ""))
}

// A block can only begin in eligible source. Once active it owns every line:
// drawer-looking text and heading-looking text inside it cannot change scope.
// Collect only the requested metadata. A cursor requests the lexical containing
// heading, including headings in drawers/COMMENT subtrees.
const scanOrgSource = (
	content: string,
	states: ReadonlySet<string>,
	excludeComments: boolean,
	collection: "ranges" | "drawers" | "lines" | "heading",
	headingCursor?: number,
) => {
	const ranges: OrgBlockRange[] = []
	const lines: RawOrgLine[] = []
	let block: { readonly from: number; readonly type: string } | null = null
	const drawers: OrgBlockRange[] = []
	let drawerFrom: number | null = null
	let commentLevel: number | null = null
	let headingLine: RawOrgLine | null = null
	let cursorInBlock = false
	for (const line of rawOrgLines(content)) {
		if (headingCursor !== undefined && line.from > headingCursor) break
		if (block) {
			if (headingCursor !== undefined && headingCursor < line.breakTo) cursorInBlock = true
			const end = /^[ \t]*#\+end_([A-Za-z0-9_-]+)\b/i.exec(line.text)
			if (end?.[1].toLowerCase() === block.type) {
				if (collection === "ranges")
					ranges.push({ from: block.from, to: line.breakTo, closed: true })
				block = null
			}
			continue
		}
		if (headingCursor !== undefined && /^\*+[ \t]+/.test(line.text)) headingLine = line
		if (drawerFrom !== null) {
			if (/^[ \t]*:END:[ \t]*$/i.test(line.text)) {
				if (collection === "drawers")
					drawers.push({ from: drawerFrom, to: line.breakTo, closed: true })
				drawerFrom = null
			}
			continue
		}
		const heading = excludeComments ? /^(\*+)[ \t]+(.*)$/.exec(line.text) : null
		if (heading && excludeComments) {
			const level = heading[1].length
			if (commentLevel !== null && level > commentLevel) continue
			commentLevel = orgHeadingIsComment(heading[2].trim(), states) ? level : null
		}
		if (commentLevel !== null) continue
		if (/^[ \t]*:[\w-]+:[ \t]*$/.test(line.text) && !/^[ \t]*:END:/i.test(line.text)) {
			drawerFrom = line.from
			continue
		}
		const begin = /^[ \t]*#\+begin_([A-Za-z0-9_-]+)\b/i.exec(line.text)
		if (begin) {
			block = { from: line.from, type: begin[1].toLowerCase() }
			if (headingCursor !== undefined && headingCursor < line.breakTo) cursorInBlock = true
		} else if (collection === "lines") lines.push(line)
	}
	if (collection === "ranges" && block)
		ranges.push({ from: block.from, to: content.length, closed: false })
	if (collection === "drawers" && drawerFrom !== null)
		drawers.push({ from: drawerFrom, to: content.length, closed: false })
	return { ranges, drawers, lines, heading: cursorInBlock ? null : headingLine }
}

/** Lexical literal protection includes blocks in COMMENT subtrees, but not drawer markers. */
export const orgBlockRanges = (content: string): readonly OrgBlockRange[] =>
	scanOrgSource(content, new Set(), false, "ranges").ranges

/** Drawer markers are eligible only outside literal blocks and existing drawers. */
export const orgDrawerRanges = (content: string): readonly OrgBlockRange[] =>
	scanOrgSource(content, new Set(), false, "drawers").drawers

/** Structural source eligibility preserves COMMENT headings while excluding literal drawers/blocks. */
export const structuralOrgSourceLines = (content: string) =>
	scanOrgSource(content, new Set(), false, "lines").lines

/** Shared eligibility grammar for TODO declarations and sparse headings. */
export const eligibleOrgSourceLines = (content: string, states: ReadonlySet<string>) =>
	scanOrgSource(content, states, true, "lines").lines

/** TODO policy scopes ignore literal-looking content in excluded COMMENT subtrees. */
export const eligibleOrgDrawerRanges = (content: string, states: ReadonlySet<string>) =>
	scanOrgSource(content, states, true, "drawers").drawers

export const eligibleOrgBlockRanges = (content: string, states: ReadonlySet<string>) =>
	scanOrgSource(content, states, true, "ranges").ranges

const positionIsInOrgBlock = (ranges: readonly OrgBlockRange[], position: number): boolean =>
	ranges.some((range) => position >= range.from && position < range.to)

const TODO_DIRECTIVE = /^#\+(?:TODO|SEQ_TODO|TYP_TODO):[ \t]*(.*?)[ \t]*$/i
const todoKeywordFromToken = (token: string): string => token.replace(/\([^)]*\)$/, "")

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: bounded source-order scope validation supports states declared after COMMENT headings.
const todoSequencesFrom = (content: string): readonly OrgTodoSequence[] => {
	const candidates: { readonly line: RawOrgLine; readonly sequence: OrgTodoSequence }[] = []
	// Provisional declarations allow configured states before their declaration.
	// Every declaration is subsequently validated by the source-order scope scan.
	for (const line of rawOrgLines(content)) {
		const match = TODO_DIRECTIVE.exec(line.text)
		if (!match) {
			continue
		}
		const tokens = match[1]
			.trim()
			.split(/[ \t]+/)
			.filter(Boolean)
		const separator = tokens.indexOf("|")
		const todoTokens = separator === -1 ? tokens.slice(0, -1) : tokens.slice(0, separator)
		const doneTokens = separator === -1 ? tokens.slice(-1) : tokens.slice(separator + 1)
		const todo = todoTokens.map(todoKeywordFromToken).filter(Boolean)
		const done = doneTokens.map(todoKeywordFromToken).filter(Boolean)
		const all = [...todo, ...done]
		if (all.length > 0) {
			candidates.push({ line, sequence: { all, done, todo } })
		}
	}
	const defaults = [{ all: ["TODO", "DONE"], done: ["DONE"], todo: ["TODO"] }]
	if (candidates.length === 0) return defaults
	let accepted = candidates
	// Revalidate after removing inert declarations: their fake states must not turn
	// ordinary title words into COMMENT markers. Bound the scan for ambiguous
	// self-referential raw declarations; no source transformation is performed.
	for (let pass = 0; pass <= candidates.length + 1; pass++) {
		const sequences = accepted.length ? accepted.map(({ sequence }) => sequence) : defaults
		const states = new Set([
			...sequences.flatMap(({ all }) => all),
			...(pass === 0 ? ["TODO", "DONE"] : []),
		])
		const eligible = new Set(eligibleOrgSourceLines(content, states).map(({ from }) => from))
		const next = candidates.filter(({ line }) => eligible.has(line.from))
		if (
			pass > 0 &&
			next.length === accepted.length &&
			next.every((candidate, index) => candidate === accepted[index])
		) {
			return sequences
		}
		accepted = next
	}
	// Unsupported cyclic declarations are conservatively ignored.
	return defaults
}

/** Parses configured pending and completed states, defaulting to TODO and DONE. */
export const parseOrgTodoKeywords = (content: string): OrgTodoKeywords => {
	const sequences = todoSequencesFrom(content)
	return {
		done: sequences.flatMap((sequence) => sequence.done),
		todo: sequences.flatMap((sequence) => sequence.todo),
	}
}

/** Cycles a heading through its configured TODO sequence and then back to no keyword. */
export const cycleOrgTodoAt = (content: string, cursor: number): OrgTextEdit | null => {
	if (positionIsInOrgBlock(orgBlockRanges(content), lineRangeAt(content, cursor).from)) return null
	return cycleOrgTodoHeadingAt(content, cursor)
}

/** Policy-aware cycling uses the same COMMENT/source eligibility as declarations and sparse TODOs. */
export const cycleEligibleOrgTodoAt = (content: string, cursor: number): OrgTextEdit | null => {
	const range = lineRangeAt(content, cursor)
	const keywords = parseOrgTodoKeywords(content)
	if (
		!eligibleOrgSourceLines(content, new Set([...keywords.todo, ...keywords.done])).some(
			(line) => line.from === range.from,
		)
	)
		return null
	return cycleOrgTodoHeadingAt(content, cursor)
}

const cycleOrgTodoHeadingAt = (content: string, cursor: number): OrgTextEdit | null => {
	const range = lineRangeAt(content, cursor)
	const line = content.slice(range.from, range.to)
	const heading = /^(\*+[ \t]+)(\S+)?([ \t]+)?/.exec(line)
	if (!heading) {
		return null
	}

	const sequences = todoSequencesFrom(content)
	const candidate = heading[2]
	const sequence = sequences.find(({ all }) => candidate !== undefined && all.includes(candidate))
	const keyword = sequence ? candidate : undefined
	const activeSequence = sequence ?? sequences[0]
	const keywordStart = range.from + heading[1].length
	const next = keyword
		? activeSequence.all[activeSequence.all.indexOf(keyword) + 1]
		: activeSequence.all[0]
	if (next) {
		const keywordEnd = keywordStart + (keyword?.length ?? 0)
		const insert = keyword ? next : `${next} `
		return {
			cursor: cursorAfterEdit(range.safeCursor, keywordStart, keywordEnd, insert),
			from: keywordStart,
			insert,
			to: keywordEnd,
		}
	}

	const keywordEnd = keywordStart + (keyword?.length ?? 0) + (heading[3]?.length ?? 0)
	return {
		cursor: cursorAfterEdit(range.safeCursor, keywordStart, keywordEnd, ""),
		from: keywordStart,
		insert: "",
		to: keywordEnd,
	}
}

/** Changes only the star prefix of the heading under the cursor. */
export const changeOrgHeadingLevelAt = (
	content: string,
	cursor: number,
	delta: -1 | 1,
): OrgTextEdit | null => {
	const range = lineRangeAt(content, cursor)
	const line = content.slice(range.from, range.to)
	if (positionIsInOrgBlock(orgBlockRanges(content), range.from)) return null
	const match = /^(\*+)([ \t]+)/.exec(line)
	if (!match || (delta === -1 && match[1].length === 1)) {
		return null
	}
	if (delta === 1) {
		return {
			cursor: cursorAfterEdit(range.safeCursor, range.from, range.from, "*"),
			from: range.from,
			insert: "*",
			to: range.from,
		}
	}
	return {
		cursor: cursorAfterEdit(range.safeCursor, range.from, range.from + 1, ""),
		from: range.from,
		insert: "",
		to: range.from + 1,
	}
}

interface OrgHeadingPosition {
	readonly from: number
	readonly level: number
}

const orgHeadingPositions = (content: string): readonly OrgHeadingPosition[] => {
	const blocks = orgBlockRanges(content)
	const headings: OrgHeadingPosition[] = []
	let blockIndex = 0
	for (const line of rawOrgLines(content)) {
		while (blockIndex < blocks.length && blocks[blockIndex].to <= line.from) blockIndex++
		const heading = /^(\*+)[ \t]+/.exec(line.text)
		if (heading && !(blocks[blockIndex] && line.from >= blocks[blockIndex].from))
			headings.push({ from: line.from, level: heading[1].length })
	}
	return headings
}

const subtreeEndAt = (
	headings: readonly OrgHeadingPosition[],
	headingIndex: number,
	contentLength: number,
): number => {
	const level = headings[headingIndex].level
	return (
		headings.slice(headingIndex + 1).find((heading) => heading.level <= level)?.from ??
		contentLength
	)
}

const swapAdjacentSubtrees = (
	left: string,
	right: string,
): { readonly content: string; readonly rightStart: number } => {
	const newline =
		left.includes("\r\n") || right.includes("\r\n")
			? "\r\n"
			: left.includes("\r") || right.includes("\r")
				? "\r"
				: "\n"
	const stripTerminalBreak = (value: string): string =>
		value.endsWith("\r\n") ? value.slice(0, -2) : /[\r\n]$/.test(value) ? value.slice(0, -1) : value
	const leftCore = stripTerminalBreak(left)
	const rightHasTerminalNewline = /(?:\r\n|\r|\n)$/.test(right)
	const rightCore = stripTerminalBreak(right)
	return {
		content: `${rightCore}${newline}${leftCore}${rightHasTerminalNewline ? newline : ""}`,
		rightStart: rightCore.length + newline.length,
	}
}

/** Moves the heading under the cursor and its complete subtree among same-level siblings. */
export const moveOrgSubtreeAt = (
	content: string,
	cursor: number,
	direction: -1 | 1,
): OrgTextEdit | null => {
	const range = lineRangeAt(content, cursor)
	const headings = orgHeadingPositions(content)
	const headingIndex = headings.findIndex((heading) => heading.from === range.from)
	if (headingIndex === -1) {
		return null
	}
	const current = headings[headingIndex]
	const currentEnd = subtreeEndAt(headings, headingIndex, content.length)
	const cursorOffset = range.safeCursor - current.from

	if (direction === -1) {
		const previousIndex = headings
			.slice(0, headingIndex)
			.findLastIndex((heading) => heading.level <= current.level)
		if (previousIndex === -1 || headings[previousIndex].level !== current.level) {
			return null
		}
		const previous = headings[previousIndex]
		const swapped = swapAdjacentSubtrees(
			content.slice(previous.from, current.from),
			content.slice(current.from, currentEnd),
		)
		return {
			cursor: previous.from + cursorOffset,
			from: previous.from,
			insert: swapped.content,
			to: currentEnd,
		}
	}

	const nextIndex = headings.findIndex(
		(heading, index) => index > headingIndex && heading.from === currentEnd,
	)
	if (nextIndex === -1 || headings[nextIndex].level !== current.level) {
		return null
	}
	const nextEnd = subtreeEndAt(headings, nextIndex, content.length)
	const swapped = swapAdjacentSubtrees(
		content.slice(current.from, currentEnd),
		content.slice(currentEnd, nextEnd),
	)
	return {
		cursor: current.from + swapped.rightStart + cursorOffset,
		from: current.from,
		insert: swapped.content,
		to: nextEnd,
	}
}

interface OrgLinePosition {
	readonly from: number
	readonly contentTo: number
	readonly breakTo: number
	readonly text: string
}

const linePositionFrom = (content: string, from: number): OrgLinePosition => {
	if (
		!Number.isInteger(from) ||
		from < 0 ||
		from > content.length ||
		(from !== 0 &&
			content.charCodeAt(from - 1) !== 10 &&
			!(content.charCodeAt(from - 1) === 13 && content.charCodeAt(from) !== 10))
	) {
		return { breakTo: content.length, contentTo: content.length, from, text: "" }
	}
	const breaks = /\r\n|\r|\n/g
	breaks.lastIndex = from
	const boundary = breaks.exec(content)
	const contentTo = boundary?.index ?? content.length
	const breakTo = contentTo + (boundary?.[0].length ?? 0)
	return { from, contentTo, breakTo, text: content.slice(from, contentTo) }
}

export const headingPositionAt = (content: string, cursor: number): OrgLinePosition | null => {
	const safeCursor = Math.max(0, Math.min(cursor, content.length))
	if (Number.isNaN(safeCursor)) return null
	return scanOrgSource(content, new Set(), false, "heading", safeCursor).heading
}

const editFrom = (cursor: number, from: number, to: number, insert: string): OrgTextEdit => ({
	cursor: cursorAfterEdit(Math.max(0, cursor), from, to, insert),
	from,
	insert,
	to,
})

const newlineFrom = (content: string): "\n" | "\r" | "\r\n" =>
	content.includes("\r\n") ? "\r\n" : content.includes("\r") ? "\r" : "\n"

const insertedLinesAt = (content: string, position: number, lines: readonly string[]): string => {
	const newline = newlineFrom(content)
	if (position < content.length || /[\r\n]$/.test(content)) {
		return `${lines.join(newline)}${newline}`
	}
	return `${newline}${lines.join(newline)}`
}

/** Replaces, adds, or removes only the trailing tag group of the containing heading. */
export const setOrgHeadingTagsAt = (
	content: string,
	cursor: number,
	tags: readonly string[],
): OrgTextEdit | null => {
	const heading = headingPositionAt(content, cursor)
	if (!heading) {
		return null
	}
	const normalized = tags
		.map((tag) => tag.trim().replace(/^:+|:+$/g, ""))
		.filter((tag) => tag.length > 0)
	if (normalized.some((tag) => !/^[^\s:\r\n]+$/u.test(tag))) {
		throw new Error("Org tags must not contain whitespace or colons.")
	}
	const replacement = normalized.length > 0 ? `:${normalized.join(":")}:` : ""
	const existing = /([ \t]+)((?::[^\s:]+)+:)[ \t]*$/.exec(heading.text)
	if (existing) {
		const whitespaceLength = existing[1].length
		const tagFrom = heading.from + existing.index + (replacement ? whitespaceLength : 0)
		return editFrom(cursor, tagFrom, heading.contentTo, replacement)
	}
	if (!replacement) {
		return null
	}
	return editFrom(cursor, heading.contentTo, heading.contentTo, ` ${replacement}`)
}

export type OrgPlanningKind = "SCHEDULED" | "DEADLINE"

export const validOrgDate = (date: string): boolean => isOrgCalendarISO(date)

/** Date-only changes preserve raw suffixes; explicit timestamp intent replaces only its range. */
export const setOrgPlanningAt = (
	content: string,
	cursor: number,
	kind: OrgPlanningKind,
	date: string | OrgTimestampValue,
): OrgTextEdit | null => {
	const dateOnly = typeof date === "string"
	const timestamp = dateOnly ? `<${date}>` : formatOrgTimestamp(date)
	if (readOrgStoredTimestamp(timestamp).kind === "error") {
		throw new Error("Org planning timestamps must contain a valid date, time, range and cookies.")
	}
	const heading = headingPositionAt(content, cursor)
	if (!heading) {
		return null
	}
	const next = linePositionFrom(content, heading.breakTo)
	const planning = parseOrgPlanningLine(next.text)
	if (planning.kind === "invalid") throw new Error(planning.message)
	if (heading.breakTo < content.length && planning.kind === "planning") {
		const field = planning.fields.find((field) => field.kind === kind)
		if (field) {
			if (dateOnly)
				return editFrom(cursor, next.from + field.dateFrom, next.from + field.dateAndWeekdayTo, date)
			return editFrom(cursor, next.from + field.timestampFrom, next.from + field.timestampTo, timestamp)
		}
		const separator = next.text.length > 0 && !/[ \t]$/.test(next.text) ? " " : ""
		return editFrom(cursor, next.contentTo, next.contentTo, `${separator}${kind}: ${timestamp}`)
	}
	const insert = insertedLinesAt(content, heading.breakTo, [`${kind}: ${timestamp}`])
	return editFrom(cursor, heading.breakTo, heading.breakTo, insert)
}

export interface OrgPropertySourceRange {
	readonly key: string
	readonly value: string
	readonly valueFrom: number
	readonly valueTo: number
}
export type OrgPropertyDrawerSnapshot =
	| { readonly kind: "absent"; readonly from: number }
	| {
			readonly kind: "drawer"
			readonly endFrom: number
			readonly properties: readonly OrgPropertySourceRange[]
	  }
	| { readonly kind: "invalid"; readonly message: string }

/** Validate the entire drawer before permitting even an update to an existing key. */
export const orgPropertyDrawerAt = (
	content: string,
	cursor: number,
): OrgPropertyDrawerSnapshot | null => {
	const heading = headingPositionAt(content, cursor)
	if (!heading) return null
	let from = heading.breakTo
	const next = linePositionFrom(content, from)
	const planning = parseOrgPlanningLine(next.text)
	if (planning.kind === "invalid") return { kind: "invalid", message: planning.message }
	if (planning.kind === "planning") from = next.breakTo
	const start = linePositionFrom(content, from)
	if (!/^[ \t]*:PROPERTIES:[ \t]*$/i.test(start.text)) return { kind: "absent", from }
	const properties: OrgPropertySourceRange[] = []
	const keys = new Set<string>()
	for (const line of rawOrgLines(content, start.breakTo)) {
		if (/^\*+[ \t]+/.test(line.text)) break
		if (/^[ \t]*:END:[ \t]*$/i.test(line.text))
			return { kind: "drawer", endFrom: line.from, properties }
		if (/^[ \t]*:PROPERTIES:[ \t]*$/i.test(line.text))
			return {
				kind: "invalid",
				message:
					"The property drawer contains a nested drawer. Repair it before setting properties.",
			}
		const match = /^([ \t]*:([^\s]+):[ \t]+)(.*?)([ \t]*)$/.exec(line.text)
			?? /^([ \t]*:([^:\s]+):[ \t]*)(.*?)([ \t]*)$/.exec(line.text)
		if (match) {
			const key = match[2]
			if (keys.has(key.toUpperCase()))
				return {
					kind: "invalid",
					message: `The property drawer contains duplicate ${key} keys. Resolve them before setting properties.`,
				}
			keys.add(key.toUpperCase())
			properties.push({
				key,
				value: match[3],
				valueFrom: line.from + match[1].length,
				valueTo: line.from + match[1].length + match[3].length,
			})
		}
	}
	return {
		kind: "invalid",
		message: "The property drawer is missing :END:. Repair it before setting properties.",
	}
}

/** Updates or creates a property in the containing heading's PROPERTIES drawer. */
export const setOrgPropertyAt = (
	content: string,
	cursor: number,
	key: string,
	value: string,
): OrgTextEdit | null => {
	const normalizedKey = key.trim().replace(/^:+|:+$/g, "")
	if (/^(?:END|PROPERTIES)$/i.test(normalizedKey))
		throw new Error("END and PROPERTIES are reserved drawer markers, not property keys.")
	if (!normalizedKey || /[\s:\r\n]/.test(normalizedKey) || /[\r\n]/.test(value)) {
		throw new Error("Org property keys and values must each fit on one line.")
	}
	const drawer = orgPropertyDrawerAt(content, cursor)
	if (!drawer || drawer.kind === "invalid") return null
	if (drawer.kind === "drawer") {
		const property = drawer.properties.find(
			(field) => field.key.toUpperCase() === normalizedKey.toUpperCase(),
		)
		if (property) return editFrom(cursor, property.valueFrom, property.valueTo, value)
		return editFrom(
			cursor,
			drawer.endFrom,
			drawer.endFrom,
			`:${normalizedKey}: ${value}${newlineFrom(content)}`,
		)
	}
	const drawerFrom = drawer.from
	const insert = insertedLinesAt(content, drawerFrom, [
		":PROPERTIES:",
		`:${normalizedKey}: ${value}`,
		":END:",
	])
	return editFrom(cursor, drawerFrom, drawerFrom, insert)
}

/** Inserts an active or inactive timestamp exactly at the requested cursor. */
export const insertOrgTimestampAt = (
	content: string,
	cursor: number,
	date: string,
	active: boolean,
): OrgTextEdit => {
	if (!validOrgDate(date)) {
		throw new Error("Org timestamps must use real calendar dates in YYYY-MM-DD format.")
	}
	const position = Math.max(0, Math.min(cursor, content.length))
	const insert = active ? `<${date}>` : `[${date}]`
	return { cursor: position + insert.length, from: position, insert, to: position }
}

/** Toggles an Org list checkbox on the current line without reformatting the list item. */
export const toggleOrgCheckboxAt = (content: string, cursor: number): OrgTextEdit | null => {
	const range = lineRangeAt(content, cursor)
	const line = content.slice(range.from, range.to)
	const match = /^(?:[ \t]*(?:[-+*]|\d+[.)])[ \t]+)\[([ Xx-])\]/.exec(line)
	if (!match || match.index === undefined) {
		return null
	}
	const bracketOffset = match[0].lastIndexOf("[")
	const statusPosition = range.from + bracketOffset + 1
	const insert = match[1] === " " ? "X" : " "
	return {
		cursor: range.safeCursor,
		from: statusPosition,
		insert,
		to: statusPosition + 1,
	}
}
