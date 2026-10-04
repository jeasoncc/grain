import type {
	OrgEffectiveTagSnapshot,
	OrgSparseTreePlan,
	OrgSparseTreeQuery,
	OrgSparseTreeRange,
} from "@/types/org"
import { parseOrgSparseTreeMatchQuery } from "./org-sparse-tree-query.pipe"
import { eligibleOrgSourceLines, type OrgTodoKeywords, parseOrgTodoKeywords } from "./org-text.pipe"

/** Parses todo[:STATE], tag:NAME, or text:LITERAL. Invalid/empty input returns null. */
const parsedQueries = new WeakSet<object>()
export const isParsedOrgSparseTreeQuery = (query: unknown): query is OrgSparseTreeQuery =>
	typeof query === "object" && query !== null && parsedQueries.has(query)

export const parseOrgSparseTreeQuery = (input: string): OrgSparseTreeQuery | null => {
	const query = parseSparseQuery(input)
	if (query) {
		const freeze = (value: object) => {
			for (const child of Object.values(value)) {
				if (child && typeof child === "object") freeze(child)
			}
			Object.freeze(value)
		}
		freeze(query)
		parsedQueries.add(query)
	}
	return query
}
const parseSparseQuery = (input: string): OrgSparseTreeQuery | null => {
	const value = input.trim()
	if (value.startsWith("match:")) {
		return parseOrgSparseTreeMatchQuery(input)
	}
	if (value.startsWith("itag:")) {
		const name = value.slice(5).trim()
		return name && !/[\s:]/.test(name) ? { kind: "itag", name } : null
	}
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
const sparseMetadata = (source: string, keywords: OrgTodoKeywords) => {
	const states = new Set([...keywords.todo, ...keywords.done])
	const lines = eligibleOrgSourceLines(source, states)
	// Multiple eligible FILETAGS lines form an ordered file-wide union. Malformed lines are inert.
	const fileTags = new Set<string>()
	for (const { text } of lines) {
		const directive = /^#\+FILETAGS:[ \t]*:([^\s:]+(?::[^\s:]+)*):[ \t]*$/i.exec(text)
		if (directive) {
			for (const tag of directive[1].split(":")) {
				fileTags.add(tag)
			}
		}
	}
	const headings: SparseHeading[] = []
	const parents: number[] = []
	for (const { from, text: line } of lines) {
		const heading = /^(\*+)[ \t]+(.*)$/.exec(line)
		if (!heading) {
			continue
		}
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
		const parent = parents.at(-1) ?? null
		const tags = tagMatch ? tagMatch[1].split(":") : []
		// Parent indices share ancestry rather than copying growing tag unions.
		headings.push({
			from,
			level,
			parent,
			state,
			tags,
			title,
		})
		parents.push(headings.length - 1)
	}
	return { fileTags, headings }
}

/** Derived eligible raw-source snapshot: no cache, history, or source-edit authority. */
export const orgEffectiveTagSnapshot = (source: string): OrgEffectiveTagSnapshot => {
	const { headings, fileTags } = sparseMetadata(source, parseOrgTodoKeywords(source))
	return {
		fileTags: [...fileTags],
		headings: headings.map(({ from, tags }, index) => {
			let effectiveTags: readonly string[] | undefined
			return {
				// Materialize only explicitly requested unions, in first-occurrence order.
				get effectiveTags() {
					if (effectiveTags === undefined) {
						const ancestors: number[] = []
						let current: number | null = index
						while (current !== null) {
							ancestors.push(current)
							current = headings[current].parent
						}
						const union = new Set(fileTags)
						for (const ancestor of ancestors.reverse()) {
							for (const tag of headings[ancestor].tags) {
								union.add(tag)
							}
						}
						effectiveTags = [...union]
					}
					return effectiveTags
				},
				from,
				localTags: tags,
			}
		}),
	}
}

/** Exact query values, ordered by configured pending/done states then local tag source order. */
export const orgSparseTreeCandidates = (source: string): readonly string[] => {
	const keywords = parseOrgTodoKeywords(source)
	const { headings, fileTags } = sparseMetadata(source, keywords)
	const localTags = new Set<string>()
	const inheritedTags = new Set(fileTags)
	// Scan the local union once, independent of heading depth.
	for (const heading of headings) {
		for (const tag of heading.tags) {
			localTags.add(tag)
			inheritedTags.add(tag)
		}
	}
	return [
		...new Set([
			"todo",
			...[...keywords.todo, ...keywords.done].map((state) => `todo:${state}`),
			...[...localTags].map((tag) => `tag:${tag}`),
			...[...inheritedTags].map((tag) => `itag:${tag}`),
		]),
	]
}

/** Membership storage is bounded by query names, not the growing source tag union. */
const queryTagMembership = (
	headings: readonly SparseHeading[],
	fileTags: ReadonlySet<string>,
	query: OrgSparseTreeQuery,
): ReadonlyMap<string, Uint8Array> => {
	const membership = new Map<string, Uint8Array>()
	const visit = (node: OrgSparseTreeQuery): void => {
		if (node.kind === "itag") {
			if (!membership.has(node.name)) {
				membership.set(node.name, new Uint8Array(headings.length))
			}
		} else if (node.kind === "not") {
			visit(node.operand)
		} else if (node.kind === "and" || node.kind === "or") {
			visit(node.left)
			visit(node.right)
		}
	}
	visit(query)
	if (membership.size === 0) {
		return membership
	}
	for (const [index, heading] of headings.entries()) {
		for (const [name, column] of membership) {
			column[index] = heading.parent === null ? Number(fileTags.has(name)) : column[heading.parent]
		}
		for (const tag of heading.tags) {
			const column = membership.get(tag)
			if (column) {
				column[index] = 1
			}
		}
	}
	return membership
}

const headingMatches = (
	heading: SparseHeading,
	query: OrgSparseTreeQuery,
	pending: ReadonlySet<string>,
	membership: ReadonlyMap<string, Uint8Array>,
	index: number,
): boolean => {
	switch (query.kind) {
		case "todo":
			return query.state !== undefined
				? heading.state === query.state
				: heading.state !== null && pending.has(heading.state)
		case "tag":
			return heading.tags.includes(query.name)
		case "itag":
			return membership.get(query.name)?.[index] === 1
		case "not":
			return !headingMatches(heading, query.operand, pending, membership, index)
		case "and":
			return (
				headingMatches(heading, query.left, pending, membership, index) &&
				headingMatches(heading, query.right, pending, membership, index)
			)
		case "or":
			return (
				headingMatches(heading, query.left, pending, membership, index) ||
				headingMatches(heading, query.right, pending, membership, index)
			)
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
	const { headings, fileTags } = sparseMetadata(source, keywords)
	const pending = new Set(keywords.todo)
	const membership = queryTagMembership(headings, fileTags, query)
	const matched = headings.flatMap((heading, index) =>
		headingMatches(heading, query, pending, membership, index) ? [index] : [],
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
