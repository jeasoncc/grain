export type OrgAgendaEntryKind = "deadline" | "scheduled" | "timestamp"

/** A dated item extracted from Org source. Lines are one-based; columns are zero-based. */
export interface OrgAgendaEntry {
	readonly relativePath: string
	readonly line: number
	readonly column: number
	readonly date: string
	readonly kind: OrgAgendaEntryKind
	readonly heading: string | null
	readonly level: number
	readonly todo: string | null
}

const ACTIVE_TIMESTAMP = /<(\d{4}-\d{2}-\d{2})(?:\s[^>\r\n]*)?>/g
const PLANNING_TIMESTAMP = /\b(SCHEDULED|DEADLINE):\s*(<(\d{4}-\d{2}-\d{2})(?:\s[^>\r\n]*)?>)/g
const HEADING = /^(\*+)\s+(.*)$/
const TODO_DIRECTIVE = /^#\+(?:SEQ_)?TODO:\s*(.*)$/i
const BLOCK_BEGIN = /^\s*#\+begin_\S+/i
const BLOCK_END = /^\s*#\+end_\S+/i
const ORDINARY_COMMENT = /^\s*#(?!\+)/
const DIRECTIVE = /^\s*#\+/
const DRAWER_BEGIN = /^\s*:PROPERTIES:\s*$/i
const DRAWER_END = /^\s*:END:\s*$/i
const FIXED_WIDTH = /^\s*:\s/
const DEFAULT_TODO_KEYWORDS = ["TODO", "DONE"] as const

interface HeadingContext {
	readonly heading: string
	readonly level: number
	readonly todo: string | null
}

const compareText = (left: string, right: string): number =>
	left < right ? -1 : left > right ? 1 : 0

const isCalendarDate = (date: string): boolean => {
	const [yearText, monthText, dayText] = date.split("-")
	const year = Number(yearText)
	const month = Number(monthText)
	const day = Number(dayText)
	if (month < 1 || month > 12 || day < 1) {
		return false
	}
	const parsed = new Date(0)
	parsed.setUTCHours(0, 0, 0, 0)
	parsed.setUTCFullYear(year, month - 1, day)
	return parsed.toISOString().slice(0, 10) === date
}

/** Marks block delimiters and their contents so they cannot affect parsing. */
const blockLinesFrom = (lines: readonly string[]): readonly boolean[] => {
	let depth = 0
	return lines.map((line) => {
		if (BLOCK_BEGIN.test(line)) {
			depth += 1
			return true
		}
		if (BLOCK_END.test(line)) {
			depth = Math.max(0, depth - 1)
			return true
		}
		return depth > 0
	})
}

const todoKeywordsFrom = (
	lines: readonly string[],
	blockLines: readonly boolean[],
): ReadonlySet<string> => {
	const keywords = new Set<string>(DEFAULT_TODO_KEYWORDS)
	for (const [index, line] of lines.entries()) {
		if (blockLines[index] || ORDINARY_COMMENT.test(line)) {
			continue
		}
		const match = line.match(TODO_DIRECTIVE)
		if (!match) {
			continue
		}
		for (const token of match[1].split(/\s+/)) {
			const keyword = token.replace(/\([^)]*\)$/, "")
			if (keyword && keyword !== "|") {
				keywords.add(keyword)
			}
		}
	}
	return keywords
}

const headingContextFrom = (
	stars: string,
	rawHeading: string,
	todoKeywords: ReadonlySet<string>,
): HeadingContext => {
	const firstSpace = rawHeading.search(/\s/)
	const firstWord = firstSpace === -1 ? rawHeading : rawHeading.slice(0, firstSpace)
	const todo = todoKeywords.has(firstWord) ? firstWord : null
	const heading = todo ? rawHeading.slice(firstWord.length).trim() : rawHeading.trim()
	return { heading, level: stars.length, todo }
}

const isCommentHeading = (context: HeadingContext): boolean =>
	context.heading === "COMMENT" || context.heading.startsWith("COMMENT ")

interface ParseContext {
	readonly context: HeadingContext | null
	readonly commentLevel: number | null
	readonly headingLine: number
	readonly ignoreLine: boolean
}

const contextAtLine = (
	lineText: string,
	index: number,
	todoKeywords: ReadonlySet<string>,
	current: ParseContext,
): ParseContext => {
	const headingMatch = lineText.match(HEADING)
	if (!headingMatch) {
		return { ...current, ignoreLine: current.commentLevel !== null }
	}

	const candidate = headingContextFrom(headingMatch[1], headingMatch[2], todoKeywords)
	if (current.commentLevel !== null && candidate.level > current.commentLevel) {
		return { ...current, ignoreLine: true }
	}
	if (isCommentHeading(candidate)) {
		return { ...current, commentLevel: candidate.level, ignoreLine: true }
	}
	return { commentLevel: null, context: candidate, headingLine: index, ignoreLine: false }
}

const entry = (
	relativePath: string,
	line: number,
	column: number,
	date: string,
	kind: OrgAgendaEntryKind,
	context: HeadingContext | null,
): OrgAgendaEntry => ({
	column,
	date,
	heading: context?.heading ?? null,
	kind,
	level: context?.level ?? 0,
	line,
	relativePath,
	todo: context?.todo ?? null,
})

const entriesFromLine = (
	relativePath: string,
	line: number,
	lineText: string,
	context: HeadingContext | null,
	isPlanningLine: boolean,
): readonly OrgAgendaEntry[] => {
	const entries: OrgAgendaEntry[] = []
	const planningRanges: Array<readonly [number, number]> = []
	if (isPlanningLine) {
		for (const match of lineText.matchAll(PLANNING_TIMESTAMP)) {
			const matchedText = match[2]
			const date = match[3]
			const column = match.index + match[0].indexOf(matchedText)
			planningRanges.push([column, column + matchedText.length])
			if (isCalendarDate(date)) {
				const kind = match[1] === "DEADLINE" ? "deadline" : "scheduled"
				entries.push(entry(relativePath, line, column, date, kind, context))
			}
		}
	}
	for (const match of lineText.matchAll(ACTIVE_TIMESTAMP)) {
		const insidePlanning = planningRanges.some(
			([rangeStart, rangeEnd]) => match.index >= rangeStart && match.index < rangeEnd,
		)
		if (!insidePlanning && isCalendarDate(match[1])) {
			entries.push(entry(relativePath, line, match.index, match[1], "timestamp", context))
		}
	}
	return entries
}

/** Extracts agenda entries without normalizing or modifying the supplied Org source. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: source-order context keeps comments, drawers, blocks, and planning semantics aligned.
export const parseOrgAgenda = (relativePath: string, source: string): readonly OrgAgendaEntry[] => {
	const lines = source.split(/\r\n|\r|\n/)
	const blockLines = blockLinesFrom(lines)
	const todoKeywords = todoKeywordsFrom(lines, blockLines)
	const entries: OrgAgendaEntry[] = []
	let inPropertyDrawer = false
	let parseContext: ParseContext = {
		commentLevel: null,
		context: null,
		headingLine: -2,
		ignoreLine: false,
	}

	for (const [index, lineText] of lines.entries()) {
		if (blockLines[index] || ORDINARY_COMMENT.test(lineText)) {
			continue
		}
		if (DRAWER_BEGIN.test(lineText)) {
			inPropertyDrawer = true
			continue
		}
		if (inPropertyDrawer) {
			if (DRAWER_END.test(lineText)) {
				inPropertyDrawer = false
			}
			continue
		}
		if (DIRECTIVE.test(lineText) || FIXED_WIDTH.test(lineText)) {
			continue
		}

		parseContext = contextAtLine(lineText, index, todoKeywords, parseContext)
		if (!parseContext.ignoreLine) {
			entries.push(
				...entriesFromLine(
					relativePath,
					index + 1,
					lineText,
					parseContext.context,
					index === parseContext.headingLine + 1,
				),
			)
		}
	}

	return sortOrgAgendaEntries(entries)
}

/** Gives aggregated parser output the same stable order as a single document. */
export const sortOrgAgendaEntries = (
	entries: readonly OrgAgendaEntry[],
): readonly OrgAgendaEntry[] =>
	[...entries].sort(
		(left, right) =>
			compareText(left.date, right.date) ||
			compareText(left.kind, right.kind) ||
			compareText(left.relativePath, right.relativePath) ||
			left.line - right.line ||
			left.column - right.column,
	)
