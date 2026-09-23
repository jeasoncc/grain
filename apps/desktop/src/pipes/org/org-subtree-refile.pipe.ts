export type OrgNewline = "\n" | "\r\n" | "\r"

/** An exact source range containing one Org heading and its complete subtree. */
export interface OrgSubtreeExtraction {
	readonly from: number
	readonly to: number
	readonly text: string
	/** The complete heading line, excluding its line ending. */
	readonly heading: string
}

interface OrgLine {
	readonly from: number
	readonly contentTo: number
	readonly to: number
}

interface OrgHeadingLine extends OrgLine {
	readonly level: number
}

const orgLines = (source: string): readonly OrgLine[] => {
	const lines: OrgLine[] = []
	let from = 0

	while (from < source.length) {
		let contentTo = from
		while (contentTo < source.length && source[contentTo] !== "\r" && source[contentTo] !== "\n") {
			contentTo += 1
		}
		let to = contentTo
		if (source[to] === "\r" && source[to + 1] === "\n") {
			to += 2
		} else if (source[to] === "\r" || source[to] === "\n") {
			to += 1
		}
		lines.push({ contentTo, from, to })
		from = to
	}

	return lines
}

const headingLine = (source: string, line: OrgLine): OrgHeadingLine | null => {
	const match = /^(\*+)[ \t]+/.exec(source.slice(line.from, line.contentTo))
	return match ? { ...line, level: match[1].length } : null
}

/**
 * Extracts the complete subtree whose heading line contains `cursor`.
 * A cursor in the body of a subtree deliberately does not select that subtree.
 */
export const extractOrgSubtreeAt = (
	source: string,
	cursor: number,
): OrgSubtreeExtraction | null => {
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length) {
		return null
	}
	const lines = orgLines(source)
	const lineIndex = lines.findIndex(
		(line) =>
			cursor >= line.from &&
			(cursor < line.to || (line.to === line.contentTo && cursor === line.contentTo)),
	)
	if (lineIndex === -1) {
		return null
	}
	const selected = headingLine(source, lines[lineIndex])
	if (!selected) {
		return null
	}

	let to = source.length
	for (const line of lines.slice(lineIndex + 1)) {
		const heading = headingLine(source, line)
		if (heading && heading.level <= selected.level) {
			to = heading.from
			break
		}
	}

	return {
		from: selected.from,
		heading: source.slice(selected.from, selected.contentTo),
		text: source.slice(selected.from, to),
		to,
	}
}

/** Removes exactly the supplied half-open subtree range, without normalizing surrounding text. */
export const removeOrgSubtree = (
	source: string,
	range: Pick<OrgSubtreeExtraction, "from" | "to">,
): string => {
	if (
		!Number.isInteger(range.from) ||
		!Number.isInteger(range.to) ||
		range.from < 0 ||
		range.to < range.from ||
		range.to > source.length
	) {
		throw new RangeError("Org subtree range is outside the source.")
	}
	return `${source.slice(0, range.from)}${source.slice(range.to)}`
}

/** Returns the first line-ending sequence in the source, falling back to LF. */
export const detectOrgNewline = (source: string): OrgNewline => {
	const match = /\r\n|\r|\n/.exec(source)
	return (match?.[0] as OrgNewline | undefined) ?? "\n"
}

/**
 * Appends an exact subtree string, adding one line separator only when the two
 * non-empty strings do not already have one at their boundary.
 */
export const appendOrgSubtree = (target: string, subtreeText: string): string => {
	if (!target || !subtreeText) {
		return `${target}${subtreeText}`
	}
	const needsSeparator = !/[\r\n]$/.test(target) && !/^[\r\n]/.test(subtreeText)
	return `${target}${needsSeparator ? detectOrgNewline(target) : ""}${subtreeText}`
}

const PATH_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i

/** Whether a path is a portable, relative document path with an exact lowercase `.org` suffix. */
export const isSafeRelativeOrgPath = (relativePath: string): boolean => {
	if (
		!relativePath ||
		relativePath !== relativePath.trim() ||
		relativePath.startsWith("/") ||
		relativePath.includes("\\") ||
		relativePath.includes("\0") ||
		PATH_PROTOCOL.test(relativePath) ||
		!relativePath.endsWith(".org")
	) {
		return false
	}
	const segments = relativePath.split("/")
	return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
}

/** Derives the sibling `<stem>_archive.org` path for a safe relative `.org` path. */
export const deriveOrgArchivePath = (relativePath: string): string | null => {
	if (!isSafeRelativeOrgPath(relativePath)) {
		return null
	}
	const segments = relativePath.split("/")
	const fileName = segments.at(-1) ?? ""
	const stem = fileName.slice(0, -".org".length)
	if (!stem) {
		return null
	}
	segments[segments.length - 1] = `${stem}_archive.org`
	return segments.join("/")
}
