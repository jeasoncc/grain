export interface OrgFoldRange {
	readonly from: number
	readonly to: number
}

const headingLevel = (line: string): number | null => {
	const heading = /^(\*+)[ \t]+/.exec(line)
	return heading ? heading[1].length : null
}

const blockedLineStarts = (content: string): ReadonlySet<number> => {
	const blocked = new Set<number>()
	let depth = 0
	let position = 0
	while (position <= content.length) {
		const newline = content.indexOf("\n", position)
		const lineEnd = newline === -1 ? content.length : newline
		const line = content.slice(position, lineEnd).replace(/\r$/, "")
		if (/^[ \t]*#\+begin_[A-Za-z0-9_-]+\b/i.test(line)) depth += 1
		if (depth > 0) blocked.add(position)
		if (/^[ \t]*#\+end_[A-Za-z0-9_-]+\b/i.test(line)) depth = Math.max(0, depth - 1)
		if (newline === -1) break
		position = newline + 1
	}
	return blocked
}

/**
 * Captures one immutable Source's literal-block index for repeated gutter queries.
 * The heading stays visible; its body/children end before the next peer or parent.
 */
export const createOrgHeadingFoldLookup = (content: string): ((lineStart: number) => OrgFoldRange | null) => {
	const blocked = blockedLineStarts(content)
	return (lineStart) => {
		if (
			lineStart < 0 ||
			lineStart > content.length ||
			(lineStart > 0 && content[lineStart - 1] !== "\n") ||
			blocked.has(lineStart)
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
			const nextLevel = blocked.has(nextLineStart)
				? null
				: headingLevel(content.slice(nextLineStart, nextLineEnd))
			if (nextLevel !== null && nextLevel <= level) {
				foldEnd = nextLineStart - 1
				break
			}
			nextLineStart = nextLineEnd + 1
		}

		return foldEnd > lineEnd ? { from: lineEnd, to: foldEnd } : null
	}
}
