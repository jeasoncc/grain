import type { OrgDerivedIndexInput, OrgIndexHeadingInput } from "@/types/org"
import { parseOrgAgenda } from "./org-agenda.pipe"
import { parseOrgLinkIndex } from "./org-backlinks.pipe"

const HEADING = /^(\*+)\s+(.*)$/
const TODO_DIRECTIVE = /^\s*#\+(?:SEQ_)?TODO:\s*(.*)$/i
const BLOCK_BEGIN = /^\s*#\+begin_\S+/i
const BLOCK_END = /^\s*#\+end_\S+/i
const ORDINARY_COMMENT = /^\s*#(?!\+)/
const DRAWER_BEGIN = /^\s*:PROPERTIES:\s*$/i
const DRAWER_END = /^\s*:END:\s*$/i
const PROPERTY = /^\s*:(ID|CUSTOM_ID):\s*(.*?)\s*$/i
const PLANNING_LINE = /^\s*(?:(?:SCHEDULED|DEADLINE|CLOSED):\s*[<[][^>\]]+[>\]]\s*)+$/i
const TRAILING_TAGS = /\s+:(?:[^:\s]+:)+\s*$/

const sourceLines = (source: string): readonly string[] => source.split(/\r\n|\r|\n/)

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
		const directive = line.match(TODO_DIRECTIVE)
		if (!directive) {
			continue
		}
		for (const token of directive[1].split(/\s+/)) {
			const keyword = token.replace(/\([^)]*\)$/, "")
			if (keyword && keyword !== "|") {
				keywords.add(keyword)
			}
		}
	}
	return keywords
}

const headingParts = (
	raw: string,
	todoKeywords: ReadonlySet<string>,
): { readonly title: string; readonly todoKeyword: string | null } => {
	const firstWord = raw.split(/\s+/, 1)[0]
	const todoKeyword = todoKeywords.has(firstWord) ? firstWord : null
	const withoutTodo = todoKeyword ? raw.slice(firstWord.length).trim() : raw.trim()
	return { title: withoutTodo.replace(TRAILING_TAGS, "").trim(), todoKeyword }
}

/** Parses one heading row per source heading, attaching at most one value for each ID kind. */
export const parseOrgIndexHeadings = (
	relativePath: string,
	source: string,
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a source-order state machine preserves drawer and COMMENT subtree semantics.
): readonly OrgIndexHeadingInput[] => {
	const lines = sourceLines(source)
	const blockLines = blockLinesFrom(lines)
	const todoKeywords = todoKeywordsFrom(lines, blockLines)
	const headings: OrgIndexHeadingInput[] = []
	let commentLevel: number | null = null
	let currentHeading = -1
	let drawerEligible = false
	let inDrawer = false

	for (const [index, line] of lines.entries()) {
		if (blockLines[index] || ORDINARY_COMMENT.test(line)) {
			drawerEligible = false
			continue
		}
		const heading = line.match(HEADING)
		if (heading) {
			const level = heading[1].length
			if (commentLevel !== null && level > commentLevel) {
				currentHeading = -1
				drawerEligible = false
				continue
			}
			const parts = headingParts(heading[2], todoKeywords)
			if (parts.title === "COMMENT" || parts.title.startsWith("COMMENT ")) {
				commentLevel = level
				currentHeading = -1
				drawerEligible = false
				continue
			}
			commentLevel = null
			headings.push({
				customId: null,
				level,
				line: index + 1,
				orgId: null,
				relativePath,
				title: parts.title,
				todoKeyword: parts.todoKeyword,
			})
			currentHeading = headings.length - 1
			drawerEligible = true
			inDrawer = false
			continue
		}
		if (commentLevel !== null || currentHeading < 0) {
			continue
		}
		if (drawerEligible && DRAWER_BEGIN.test(line)) {
			inDrawer = true
			continue
		}
		if (inDrawer && DRAWER_END.test(line)) {
			inDrawer = false
			drawerEligible = false
			continue
		}
		if (inDrawer) {
			const property = line.match(PROPERTY)
			if (property?.[2]) {
				const row = headings[currentHeading]
				const key = property[1].toUpperCase() === "ID" ? "orgId" : "customId"
				// Keep the first value of each kind: one source heading must remain one DB PK row.
				if (row[key] === null) {
					headings[currentHeading] = { ...row, [key]: property[2] }
				}
			}
			continue
		}
		if (!PLANNING_LINE.test(line)) {
			drawerEligible = false
		}
	}
	return headings
}

/** Builds all disposable index rows for one revision without performing IO. */
export const buildOrgDerivedIndexDocument = (
	relativePath: string,
	revision: string,
	content: string,
): OrgDerivedIndexInput => {
	const linkIndex = parseOrgLinkIndex(relativePath, content)
	return {
		agenda: parseOrgAgenda(relativePath, content).map((item) => ({
			column: item.column,
			date: item.date,
			heading: item.heading,
			kind: item.kind,
			line: item.line,
			relativePath: item.relativePath,
			todoKeyword: item.todo,
		})),
		documents: [{ relativePath, revision, title: linkIndex.title }],
		headings: parseOrgIndexHeadings(relativePath, content),
		links: linkIndex.links.map((link) => ({
			column: link.column,
			label: link.label,
			line: link.line,
			sourceRelativePath: link.relativePath,
			targetKind: link.targetKind,
			targetRelativePath: link.targetRelativePath,
			targetValue: link.targetValue,
		})),
	}
}
