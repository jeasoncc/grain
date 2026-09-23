export interface OrgFoldRange {
	readonly from: number
	readonly to: number
}

const headingLevel = (line: string): number | null => {
	const heading = /^(\*+)[ \t]+/.exec(line)
	return heading ? heading[1].length : null
}

/**
 * Finds the fold range for an Org heading at `lineStart`.
 *
 * The heading remains visible. The returned range starts at its line ending and
 * contains every following body/child line up to, but not including, the next
 * heading at the same or a shallower level.
 */
export const orgHeadingFoldRange = (content: string, lineStart: number): OrgFoldRange | null => {
	if (
		lineStart < 0 ||
		lineStart > content.length ||
		(lineStart > 0 && content[lineStart - 1] !== "\n")
	) {
		return null
	}

	const headingLineEnd = content.indexOf("\n", lineStart)
	const lineEnd = headingLineEnd === -1 ? content.length : headingLineEnd
	const level = headingLevel(content.slice(lineStart, lineEnd))
	if (level === null || lineEnd === content.length) {
		return null
	}

	let nextLineStart = lineEnd + 1
	let foldEnd = content.length
	while (nextLineStart < content.length) {
		const nextLineBreak = content.indexOf("\n", nextLineStart)
		const nextLineEnd = nextLineBreak === -1 ? content.length : nextLineBreak
		const nextLevel = headingLevel(content.slice(nextLineStart, nextLineEnd))
		if (nextLevel !== null && nextLevel <= level) {
			foldEnd = nextLineStart - 1
			break
		}
		nextLineStart = nextLineEnd + 1
	}

	return foldEnd > lineEnd ? { from: lineEnd, to: foldEnd } : null
}
