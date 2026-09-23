export type OrgLinkTargetKind = "file" | "id" | "custom-id"
export type OrgHeadingIdentifierKind = "id" | "custom-id"

export interface OrgHeadingIdentifier {
	readonly kind: OrgHeadingIdentifierKind
	readonly value: string
	readonly heading: string
	readonly line: number
}

/** A link extracted from Org source. Lines are one-based; columns are zero-based. */
export interface OrgLinkReference {
	readonly relativePath: string
	readonly line: number
	readonly column: number
	readonly sourceHeading: string | null
	readonly sourceTitle: string | null
	readonly label: string
	readonly targetKind: OrgLinkTargetKind
	readonly targetRelativePath: string | null
	readonly targetValue: string | null
}

export interface OrgLinkIndex {
	readonly title: string | null
	readonly identifiers: readonly OrgHeadingIdentifier[]
	readonly links: readonly OrgLinkReference[]
}

const HEADING = /^(\*+)\s+(.*)$/
const TITLE = /^\s*#\+title:\s*(.*?)\s*$/i
const TODO_DIRECTIVE = /^\s*#\+(?:SEQ_)?TODO:\s*(.*)$/i
const BLOCK_BEGIN = /^\s*#\+begin_\S+/i
const BLOCK_END = /^\s*#\+end_\S+/i
const ORDINARY_COMMENT = /^\s*#(?!\+)/
const DRAWER_BEGIN = /^\s*:PROPERTIES:\s*$/i
const DRAWER_END = /^\s*:END:\s*$/i
const PROPERTY = /^\s*:(ID|CUSTOM_ID):\s*(.*?)\s*$/i
const PLANNING_LINE = /^\s*(?:(?:SCHEDULED|DEADLINE|CLOSED):\s*[<[][^>\]]+[>\]]\s*)+$/i
const LINK = /\[\[([^\]\r\n]+)\](?:\[([^\]\r\n]*)\])?\]/g
const PROTOCOL = /^[a-z][a-z0-9+.-]*:/i

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
	const keywords = new Set(["TODO", "DONE"])
	for (const [index, line] of lines.entries()) {
		if (blockLines[index] || ORDINARY_COMMENT.test(line)) {
			continue
		}
		const match = line.match(TODO_DIRECTIVE)
		if (match) {
			for (const token of match[1].split(/\s+/)) {
				const keyword = token.replace(/\([^)]*\)$/, "")
				if (keyword && keyword !== "|") {
					keywords.add(keyword)
				}
			}
		}
	}
	return keywords
}

const headingText = (raw: string, todoKeywords: ReadonlySet<string>): string => {
	const firstWord = raw.split(/\s+/, 1)[0]
	return (todoKeywords.has(firstWord) ? raw.slice(firstWord.length) : raw).trim()
}

const isCommentHeading = (heading: string): boolean =>
	heading === "COMMENT" || heading.startsWith("COMMENT ")

/**
 * Resolves a file-link path below the workspace root. Absolute paths, protocols,
 * backslashes, traversal above the root, and non-lowercase `.org` suffixes are rejected.
 */
export const resolveOrgLinkPath = (baseDocument: string, target: string): string | null => {
	const path = target.split("::", 1)[0]
	if (
		!path ||
		path.startsWith("/") ||
		path.includes("\\") ||
		!path.endsWith(".org") ||
		PROTOCOL.test(path)
	) {
		return null
	}
	const resolved = baseDocument.split("/").slice(0, -1)
	for (const segment of path.split("/")) {
		if (!segment || segment === ".") {
			continue
		}
		if (segment === "..") {
			if (resolved.length === 0) {
				return null
			}
			resolved.pop()
			continue
		}
		resolved.push(segment)
	}
	return resolved.join("/")
}

export type ParsedOrgLinkTarget =
	| {
			readonly kind: "file"
			readonly relativePath: string
			readonly value: string | null
	  }
	| {
			readonly kind: "id"
			readonly relativePath: null
			readonly value: string
	  }
	| {
			readonly kind: "custom-id"
			readonly relativePath: string
			readonly value: string
	  }

/** Parses one supported Org target using the same path and anchor semantics as backlinks. */
export const parseOrgLinkTarget = (
	sourcePath: string,
	target: string,
): ParsedOrgLinkTarget | null => {
	if (/^id:/i.test(target)) {
		const value = target.slice(3)
		return value ? { kind: "id", relativePath: null, value } : null
	}
	if (target.startsWith("#")) {
		const value = target.slice(1)
		return value ? { kind: "custom-id", relativePath: sourcePath, value } : null
	}

	const fileTarget = target.startsWith("file:") ? target.slice(5) : target
	const relativePath = resolveOrgLinkPath(sourcePath, fileTarget)
	if (!relativePath) {
		return null
	}
	const separator = fileTarget.indexOf("::")
	const search = separator === -1 ? null : fileTarget.slice(separator + 2)
	if (search?.startsWith("#") && search.length > 1) {
		return { kind: "custom-id", relativePath, value: search.slice(1) }
	}
	return { kind: "file", relativePath, value: search || null }
}

interface ScanContext {
	readonly heading: string | null
	readonly headingLevel: number
	readonly commentLevel: number | null
	readonly ignored: boolean
}

const nextContext = (
	line: string,
	current: ScanContext,
	todoKeywords: ReadonlySet<string>,
): ScanContext => {
	const match = line.match(HEADING)
	if (!match) {
		return { ...current, ignored: current.commentLevel !== null }
	}
	const level = match[1].length
	if (current.commentLevel !== null && level > current.commentLevel) {
		return { ...current, ignored: true }
	}
	const heading = headingText(match[2], todoKeywords)
	if (isCommentHeading(heading)) {
		return { ...current, commentLevel: level, ignored: true }
	}
	return { commentLevel: null, heading, headingLevel: level, ignored: false }
}

/** Parses heading IDs and links without normalizing or modifying the supplied source. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one source-order state machine keeps Org context transitions explicit.
export const parseOrgLinkIndex = (relativePath: string, source: string): OrgLinkIndex => {
	const lines = source.split(/\r\n|\r|\n/)
	const blockLines = blockLinesFrom(lines)
	const todoKeywords = todoKeywordsFrom(lines, blockLines)
	const identifiers: OrgHeadingIdentifier[] = []
	const links: OrgLinkReference[] = []
	let title: string | null = null
	let inPropertyDrawer = false
	let propertyDrawerEligible = false
	let propertyHeading: string | null = null
	let context: ScanContext = {
		commentLevel: null,
		heading: null,
		headingLevel: 0,
		ignored: false,
	}

	for (const [index, line] of lines.entries()) {
		if (blockLines[index] || ORDINARY_COMMENT.test(line)) {
			propertyDrawerEligible = false
			continue
		}
		const previousHeading = context.heading
		const headingMatch = line.match(HEADING)
		context = nextContext(line, context, todoKeywords)
		if (context.heading !== previousHeading || headingMatch) {
			inPropertyDrawer = false
			propertyDrawerEligible = true
			propertyHeading = null
		}
		if (context.ignored) {
			continue
		}

		const titleMatch = line.match(TITLE)
		if (title === null && titleMatch) {
			title = titleMatch[1]
		}
		if (context.heading && propertyDrawerEligible && DRAWER_BEGIN.test(line)) {
			inPropertyDrawer = true
			propertyHeading = context.heading
			continue
		}
		if (inPropertyDrawer && DRAWER_END.test(line)) {
			inPropertyDrawer = false
			continue
		}
		if (inPropertyDrawer && propertyHeading) {
			const property = line.match(PROPERTY)
			if (property?.[2]) {
				identifiers.push({
					heading: propertyHeading,
					kind: property[1].toUpperCase() === "ID" ? "id" : "custom-id",
					line: index + 1,
					value: property[2],
				})
			}
		}

		if (!headingMatch && !PLANNING_LINE.test(line)) {
			propertyDrawerEligible = false
		}

		for (const match of line.matchAll(LINK)) {
			const target = parseOrgLinkTarget(relativePath, match[1])
			if (!target) {
				continue
			}
			links.push({
				column: match.index,
				label: match[2] ?? match[1],
				line: index + 1,
				relativePath,
				sourceHeading: context.heading,
				sourceTitle: title,
				targetKind: target.kind,
				targetRelativePath: target.relativePath,
				targetValue: target.value,
			})
		}
	}
	return {
		identifiers,
		links: links.map((link) => ({ ...link, sourceTitle: title })),
		title,
	}
}

export const parseOrgLinks = (relativePath: string, source: string): readonly OrgLinkReference[] =>
	parseOrgLinkIndex(relativePath, source).links

export const parseOrgHeadingIdentifiers = (source: string): readonly OrgHeadingIdentifier[] =>
	parseOrgLinkIndex("index.org", source).identifiers
