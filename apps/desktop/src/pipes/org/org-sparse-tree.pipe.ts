import type { OrgSparseTreePlan, OrgSparseTreeQuery, OrgSparseTreeRange } from "@/types/org"
import { type OrgTodoKeywords, eligibleOrgSourceLines, parseOrgTodoKeywords } from "./org-text.pipe"

/** Parses todo[:STATE], tag:NAME, or text:LITERAL. Invalid/empty input returns null. */
export const parseOrgSparseTreeQuery = (input: string): OrgSparseTreeQuery | null => {
	const value = input.trim()
	if (value === "todo") {
		return { kind: "todo" }
	}
	if (value.startsWith("todo:")) {
		const state = value.slice(5).trim()
		return state && !/\s/.test(state) ? { kind: "todo", state } : null
	}
	if (value.startsWith("tag:")) {
		const name = value.slice(4).trim()
		return name && !/[\s:]/.test(name) ? { kind: "tag", name } : null
	}
	if (value.startsWith("text:")) {
		const literal = value.slice(5)
		return literal.trim() ? { kind: "text", literal } : null
	}
	return null
}

interface SparseHeading {
	readonly from: number
	readonly level: number
	readonly title: string
	readonly state: string | null
	readonly tags: readonly string[]
	readonly parent: number | null
}

/** Scan raw lines without normalizing CRLF, lone CR, or Unicode offsets. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: source-order scope state keeps raw blocks, drawers, and COMMENT subtrees out of the hierarchy.
const sparseHeadings = (source: string, keywords: OrgTodoKeywords): readonly SparseHeading[] => {
	const states = new Set([...keywords.todo, ...keywords.done])
	const headings: SparseHeading[] = []
	const parents: number[] = []
	for (const { from, text: line } of eligibleOrgSourceLines(source, states)) {
		const heading = /^(\*+)[ \t]+(.*)$/.exec(line)
		if (!heading) continue
		const level = heading[1].length
		const raw = heading[2].trim()
		const firstWord = raw.split(/[ \t]+/, 1)[0]
		const state = states.has(firstWord) ? firstWord : null
		const withoutState = state ? raw.slice(firstWord.length).trim() : raw
		const tagMatch = /(?:^|[ \t]+):([^\s:]+(?::[^\s:]+)*):[ \t]*$/.exec(withoutState)
		const title = tagMatch ? withoutState.slice(0, tagMatch.index).trim() : withoutState
		while (parents.length && headings[parents[parents.length - 1]].level >= level) {
			parents.pop()
		}
		headings.push({
			from,
			level,
			parent: parents.at(-1) ?? null,
			state,
			tags: tagMatch ? tagMatch[1].split(":") : [],
			title,
		})
		parents.push(headings.length - 1)
	}
	return headings
}

/** Exact query values, ordered by configured pending/done states then local tag source order. */
export const orgSparseTreeCandidates = (source: string): readonly string[] => {
	const keywords = parseOrgTodoKeywords(source)
	const headings = sparseHeadings(source, keywords)
	return [
		...new Set([
			"todo",
			...[...keywords.todo, ...keywords.done].map((state) => `todo:${state}`),
			...headings.flatMap((heading) => heading.tags.map((tag) => `tag:${tag}`)),
		]),
	]
}

const headingMatches = (
	heading: SparseHeading,
	query: OrgSparseTreeQuery,
	pending: ReadonlySet<string>,
): boolean => {
	switch (query.kind) {
		case "todo":
			return query.state !== undefined
				? heading.state === query.state
				: heading.state !== null && pending.has(heading.state)
		case "tag":
			return heading.tags.includes(query.name)
		case "text":
			return query.literal.length > 0 && heading.title.includes(query.literal)
	}
}

/**
 * Retains matched headings, their own body sections, and all ancestors. Unrelated
 * sections are hidden; preamble stays visible. No source is copied or rewritten.
 * Text matches heading titles case-sensitively; tags are local and exact.
 */
export const buildOrgSparseTreePlan = (
	source: string,
	query: OrgSparseTreeQuery,
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ancestor closure and adjacent range coalescing preserve raw source boundaries.
): OrgSparseTreePlan => {
	const keywords = parseOrgTodoKeywords(source)
	const headings = sparseHeadings(source, keywords)
	const pending = new Set(keywords.todo)
	const matched = headings.flatMap((heading, index) =>
		headingMatches(heading, query, pending) ? [index] : [],
	)
	const visible = new Set<number>()
	for (const index of matched) {
		let current: number | null = index
		while (current !== null && !visible.has(current)) {
			visible.add(current)
			current = headings[current].parent
		}
	}
	const hiddenRanges: OrgSparseTreeRange[] = []
	if (matched.length > 0) {
		for (const [index, heading] of headings.entries()) {
			if (visible.has(index)) {
				continue
			}
			const to = headings[index + 1]?.from ?? source.length
			const last = hiddenRanges.at(-1)
			if (last?.to === heading.from) {
				hiddenRanges[hiddenRanges.length - 1] = { from: last.from, to }
			} else if (to > heading.from) {
				hiddenRanges.push({ from: heading.from, to })
			}
		}
	}
	return {
		allVisible: hiddenRanges.length === 0,
		hiddenRanges,
		matchedHeadingStarts: matched.map((index) => headings[index].from),
		query,
		visibleHeadingStarts: headings.flatMap((heading, index) =>
			matched.length === 0 || visible.has(index) ? [heading.from] : [],
		),
	}
}
