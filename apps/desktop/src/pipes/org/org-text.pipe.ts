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

const lineRangeAt = (content: string, cursor: number) => {
	const safeCursor = Math.max(0, Math.min(cursor, content.length))
	const from = content.lastIndexOf("\n", safeCursor === 0 ? -1 : safeCursor - 1) + 1
	const newline = content.indexOf("\n", safeCursor)
	return { from, safeCursor, to: newline === -1 ? content.length : newline }
}

const cursorAfterEdit = (cursor: number, from: number, to: number, insert: string): number =>
	cursor <= from ? cursor : Math.max(from, cursor + insert.length - (to - from))

/** Cycles a heading keyword through no keyword → TODO → DONE → no keyword. */
export const cycleOrgTodoAt = (content: string, cursor: number): OrgTextEdit | null => {
	const range = lineRangeAt(content, cursor)
	const line = content.slice(range.from, range.to)
	const match = /^(\*+[ \t]+)(?:(TODO|DONE)([ \t]+))?/.exec(line)
	if (!match) {
		return null
	}
	const keyword = match[2]
	const keywordStart = range.from + match[1].length
	if (!keyword) {
		return {
			cursor: cursorAfterEdit(range.safeCursor, keywordStart, keywordStart, "TODO "),
			from: keywordStart,
			insert: "TODO ",
			to: keywordStart,
		}
	}
	if (keyword === "TODO") {
		const keywordEnd = keywordStart + keyword.length
		return {
			cursor: cursorAfterEdit(range.safeCursor, keywordStart, keywordEnd, "DONE"),
			from: keywordStart,
			insert: "DONE",
			to: keywordEnd,
		}
	}
	const keywordEnd = keywordStart + keyword.length + (match[3]?.length ?? 0)
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

const orgHeadingPositions = (content: string): readonly OrgHeadingPosition[] =>
	[...content.matchAll(/^(\*+)[ \t]+/gm)].map((match) => ({
		from: match.index,
		level: match[1].length,
	}))

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
	const leftCore = left.endsWith("\n") ? left.slice(0, -1) : left
	const rightHasTerminalNewline = right.endsWith("\n")
	const rightCore = rightHasTerminalNewline ? right.slice(0, -1) : right
	return {
		content: `${rightCore}\n${leftCore}${rightHasTerminalNewline ? "\n" : ""}`,
		rightStart: rightCore.length + 1,
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
