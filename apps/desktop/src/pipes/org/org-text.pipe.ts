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

export interface OrgTextEdit {
	readonly from: number
	readonly to: number
	readonly insert: string
	readonly cursor: number
}

interface RawOrgLine {
	readonly from: number
	readonly contentTo: number
	readonly breakTo: number
	readonly text: string
}

const rawOrgLines = (content: string): readonly RawOrgLine[] => {
	const lines: RawOrgLine[] = []
	let position = 0
	while (position <= content.length) {
		const breakOffset = content.slice(position).search(/[\r\n]/)
		const contentTo = breakOffset === -1 ? content.length : position + breakOffset
		let breakTo = contentTo
		if (breakOffset !== -1) {
			breakTo =
				content[contentTo] === "\r" && content[contentTo + 1] === "\n"
					? contentTo + 2
					: contentTo + 1
		}
		lines.push({ from: position, contentTo, breakTo, text: content.slice(position, contentTo) })
		if (breakOffset === -1) break
		position = breakTo
	}
	return lines
}

const lineRangeAt = (content: string, cursor: number) => {
	const safeCursor = Math.max(0, Math.min(cursor, content.length))
	const line =
		rawOrgLines(content).findLast(({ from }) => from <= safeCursor) ?? rawOrgLines(content)[0]
	return { from: line.from, safeCursor, to: line.contentTo }
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

interface OrgBlockRange {
	readonly from: number
	readonly to: number
}

const orgBlockRanges = (content: string): readonly OrgBlockRange[] => {
	const ranges: OrgBlockRange[] = []
	let blockFrom: number | null = null
	for (const line of rawOrgLines(content)) {
		if (blockFrom === null && /^[ \t]*#\+begin_[A-Za-z0-9_-]+\b/i.test(line.text)) {
			blockFrom = line.from
		} else if (blockFrom !== null && /^[ \t]*#\+end_[A-Za-z0-9_-]+\b/i.test(line.text)) {
			ranges.push({ from: blockFrom, to: line.breakTo })
			blockFrom = null
		}
	}
	if (blockFrom !== null) ranges.push({ from: blockFrom, to: content.length })
	return ranges
}

const positionIsInOrgBlock = (ranges: readonly OrgBlockRange[], position: number): boolean =>
	ranges.some((range) => position >= range.from && position < range.to)

const TODO_DIRECTIVE = /^#\+(?:TODO|SEQ_TODO):[ \t]*(.*?)[ \t]*$/i
const todoKeywordFromToken = (token: string): string => token.replace(/\([^)]*\)$/, "")

const todoSequencesFrom = (content: string): readonly OrgTodoSequence[] => {
	const sequences: OrgTodoSequence[] = []
	const blocks = orgBlockRanges(content)
	for (const line of rawOrgLines(content)) {
		if (positionIsInOrgBlock(blocks, line.from)) continue
		const match = TODO_DIRECTIVE.exec(line.text)
		if (!match) continue
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
			sequences.push({ all, done, todo })
		}
	}
	return sequences.length > 0
		? sequences
		: [{ all: ["TODO", "DONE"], done: ["DONE"], todo: ["TODO"] }]
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
	const range = lineRangeAt(content, cursor)
	const line = content.slice(range.from, range.to)
	if (positionIsInOrgBlock(orgBlockRanges(content), range.from)) return null
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
	return rawOrgLines(content).flatMap((line) => {
		const heading = /^(\*+)[ \t]+/.exec(line.text)
		return heading && !positionIsInOrgBlock(blocks, line.from)
			? [{ from: line.from, level: heading[1].length }]
			: []
	})
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
	const line = rawOrgLines(content).find((candidate) => candidate.from === from)
	return line ?? { breakTo: content.length, contentTo: content.length, from, text: "" }
}

const headingPositionAt = (content: string, cursor: number): OrgLinePosition | null => {
	const safeCursor = Math.max(0, Math.min(cursor, content.length))
	if (positionIsInOrgBlock(orgBlockRanges(content), safeCursor)) return null
	const headings = orgHeadingPositions(content)
	const heading = headings.findLast(({ from }) => from <= safeCursor)
	return heading ? linePositionFrom(content, heading.from) : null
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
	if (position < content.length || content.endsWith("\n")) {
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

const validOrgDate = (date: string): boolean => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
	if (!match) return false
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	const parsed = new Date(Date.UTC(year, month - 1, day))
	return (
		parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === day
	)
}

const PLANNING_LINE = /^[ \t]*(?:(?:CLOSED|SCHEDULED|DEADLINE):[ \t]*[<\[][^>\]]+[>\]][ \t]*)+/

/** Sets a planning date on the line directly below the containing heading. */
export const setOrgPlanningAt = (
	content: string,
	cursor: number,
	kind: OrgPlanningKind,
	date: string,
): OrgTextEdit | null => {
	if (!validOrgDate(date)) {
		throw new Error("Org planning dates must be real calendar dates in YYYY-MM-DD format.")
	}
	const heading = headingPositionAt(content, cursor)
	if (!heading) {
		return null
	}
	const next = linePositionFrom(content, heading.breakTo)
	if (heading.breakTo < content.length && PLANNING_LINE.test(next.text)) {
		const target = new RegExp(
			`\\b${kind}:[ \\t]*[<\\[](?<date>\\d{4}-\\d{2}-\\d{2})(?:[ \\t]+[A-Za-z]{3})?`,
		)
		const match = target.exec(next.text)
		const matchedDate = match?.groups?.date
		if (match && matchedDate) {
			const from = next.from + match.index + match[0].lastIndexOf(matchedDate)
			return editFrom(cursor, from, next.from + match.index + match[0].length, date)
		}
		const separator = next.text.length > 0 && !/[ \t]$/.test(next.text) ? " " : ""
		return editFrom(cursor, next.contentTo, next.contentTo, `${separator}${kind}: <${date}>`)
	}
	const insert = insertedLinesAt(content, heading.breakTo, [`${kind}: <${date}>`])
	return editFrom(cursor, heading.breakTo, heading.breakTo, insert)
}

const escapedRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Updates or creates a property in the containing heading's PROPERTIES drawer. */
export const setOrgPropertyAt = (
	content: string,
	cursor: number,
	key: string,
	value: string,
): OrgTextEdit | null => {
	const normalizedKey = key.trim().replace(/^:+|:+$/g, "")
	if (!normalizedKey || /[\s:\r\n]/.test(normalizedKey) || /[\r\n]/.test(value)) {
		throw new Error("Org property keys and values must each fit on one line.")
	}
	const heading = headingPositionAt(content, cursor)
	if (!heading) {
		return null
	}

	let drawerFrom = heading.breakTo
	if (drawerFrom < content.length) {
		const possiblePlanning = linePositionFrom(content, drawerFrom)
		if (PLANNING_LINE.test(possiblePlanning.text)) {
			drawerFrom = possiblePlanning.breakTo
		}
	}
	const drawerStart = linePositionFrom(content, drawerFrom)
	if (/^[ \t]*:PROPERTIES:[ \t]*$/i.test(drawerStart.text)) {
		let position = drawerStart.breakTo
		while (position < content.length) {
			const line = linePositionFrom(content, position)
			if (/^\*+[ \t]+/.test(line.text)) {
				return null
			}
			if (/^[ \t]*:END:[ \t]*$/i.test(line.text)) {
				const insert = `:${normalizedKey}: ${value}${newlineFrom(content)}`
				return editFrom(cursor, line.from, line.from, insert)
			}
			const property = new RegExp(
				`^([ \\t]*:${escapedRegExp(normalizedKey)}:[ \\t]*)(.*?)([ \\t]*)$`,
				"i",
			).exec(line.text)
			if (property) {
				const from = line.from + property[1].length
				return editFrom(cursor, from, from + property[2].length, value)
			}
			position = line.breakTo
		}
		return null
	}

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
