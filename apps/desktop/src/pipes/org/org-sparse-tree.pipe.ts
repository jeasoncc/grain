import type {
	OrgEffectiveTagSnapshot,
	OrgSparseTreePlan,
	OrgSparseTreeQuery,
	OrgSparseTreeRange,
} from "@/types/org"
import { expandOrgSparseTreeMatchGroups, orgMatchRegExp, parseOrgSparseTreeMatchQuery, readOrgSparseTreeMatchQuery, type OrgMatchRegExp } from "./org-sparse-tree-query.pipe"
import { eligibleOrgSourceLines, type OrgTodoKeywords, parseOrgTodoKeywords } from "./org-text.pipe"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION, orgInheritsName, type OrgInheritanceConfiguration } from "./org-behavior-configuration.pipe"
import { isOrgCalendarISO, readOrgStoredTimestamp } from "./org-date-reader.pipe"
import { parseOrgPlanningLine } from "./org-planning-line.pipe"
import { maskOrgInlineCode } from "./org-default-syntax.pipe"
import { scanOrgBracketLinks } from "./org-link-syntax.pipe"
import { ORG_NATIVE_CHARACTER_ATOMS } from "./org-default-syntax-data.pipe"

export type OrgSparseSpecialPropertyName = "FILE" | "BLOCKED" | "CLOCKSUM" | "CLOCKSUM_T"
export interface OrgSparseSpecialPropertyRequest {
	readonly properties: readonly OrgSparseSpecialPropertyName[]
	readonly headingStarts: readonly number[]
}
export interface OrgSparseTreeNativeContext {
	readonly compareStrings?: (left: string, right: string) => number
	readonly specialProperties?: ReadonlyMap<OrgSparseSpecialPropertyName, ReadonlyMap<number, string | undefined>>
}

export class OrgSparseTreeContextRequiredError extends Error {
	constructor(message = "String ordering requires captured native collation context", readonly context: "collation" | "file" | "dependency" | "clock" = "collation") {
		super(message)
		this.name = "OrgSparseTreeContextRequiredError"
	}
}
// org.el org-global-properties-fixed: inherited only when the policy selects them.
const orgMatchGlobalPropertyDefaults: Readonly<Record<string, string>> = {
	VISIBILITY_ALL: "folded children content all",
	CLOCK_MODELINE_TOTAL_ALL: "current today repeat all auto",
}

/** Parses todo[:STATE], tag:NAME, or text:LITERAL. Invalid/empty input returns null. */
const parsedQueries = new WeakSet<object>()
const nativeMatchInputs = new WeakMap<OrgSparseTreeQuery, string>()
export const isParsedOrgSparseTreeQuery = (query: unknown): query is OrgSparseTreeQuery =>
	typeof query === "object" && query !== null && parsedQueries.has(query)

export const parseOrgSparseTreeQuery = (input: string, inheritance?: OrgInheritanceConfiguration): OrgSparseTreeQuery | null => {
	const parsed = parseSparseQuery(input)
	const query = parsed && inheritance ? { ...parsed, inheritance: {
		...inheritance,
		tags: Array.isArray(inheritance.tags) ? [...inheritance.tags] : inheritance.tags,
		tagExclusions: [...inheritance.tagExclusions],
		properties: Array.isArray(inheritance.properties) ? [...inheritance.properties] : inheritance.properties,
		propertyExclusions: [...inheritance.propertyExclusions],
	} } : parsed
	if (query) {
		const freeze = (value: object) => {
			for (const child of Object.values(value)) {
				if (child && typeof child === "object") freeze(child)
			}
			Object.freeze(value)
		}
		freeze(query)
		parsedQueries.add(query)
		const value = input.trim()
		if (value.startsWith("match:") || !/^(?:todo(?:$|:)|(?:i?tag|text):)/.test(value)) nativeMatchInputs.set(query, input)
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
	return parseOrgSparseTreeMatchQuery(input, true)
}

interface SparseHeading {
	readonly from: number
	readonly level: number
	readonly title: string
	readonly orgTitle: string
	readonly localTags: readonly string[]
	readonly state: string | null
	readonly tags: readonly string[]
	readonly parent: number | null
	readonly properties?: ReadonlyMap<string, string>
}

const inlineSourcePrefix = new RegExp(`(?<!${ORG_NATIVE_CHARACTER_ATOMS.propertyWord})src_[^ \\t\\r\\n[{]+[\\[{]`, "gu")
/** GNU org-element inline-source pairs count only their own brackets; backslashes are words. */
const sparseInlineSourceRanges = (source: string): readonly OrgSparseTreeRange[] => {
	const ranges: OrgSparseTreeRange[] = []
	for (const prefix of source.matchAll(inlineSourcePrefix)) {
		if (prefix.index < (ranges.at(-1)?.to ?? 0)) continue
		let cursor = prefix.index + prefix[0].length - 1
		let valid = true
		for (const opening of ["[", "{"]) {
			if (source[cursor] !== opening) {
				if (opening === "{") valid = false
				continue
			}
			const closing = opening === "[" ? "]" : "}"
			let depth = 1
			for (cursor++; cursor < source.length && depth; cursor++) {
				if (source[cursor] === opening) depth++
				else if (source[cursor] === closing) depth--
			}
			if (depth) { valid = false; break }
		}
		if (valid) ranges.push({ from: prefix.index, to: cursor })
	}
	return ranges
}

const orgPriorityValue = "(?:[A-Z]|[0-9]|[1-5][0-9]|6[0-4])"
const orgPriorityCookie = new RegExp(`\\[#(${orgPriorityValue})\\]`, "iu")
const orgPriorityDirective = new RegExp(`^#\\+PRIORITIES:[ \\t]+${orgPriorityValue}[ \\t]+${orgPriorityValue}[ \\t]+(${orgPriorityValue})(?:[ \\t]|$)`, "iu")

/** GNU org-remove-tabs counts characters, not UTF-16 units or display columns. */
const orgItemTitle = (title: string): string => {
	if (!title.includes("\t")) return title
	let expanded = ""
	let column = 0
	for (const character of title) {
		if (character === "\t") {
			const spaces = 8 - column % 8
			expanded += " ".repeat(spaces)
			column += spaces
		} else {
			expanded += character
			column++
		}
	}
	return expanded
}

/** Scan raw lines without normalizing CRLF, lone CR, or Unicode offsets. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: source-order scope state keeps raw blocks, drawers, and COMMENT subtrees out of the hierarchy.
const sparseMetadata = (source: string, keywords: OrgTodoKeywords, propertyNames: ReadonlySet<string> = new Set()) => {
	const states = new Set([...keywords.todo, ...keywords.done])
	const headingFields = new RegExp(`^\\*+(?: +(${[...states].map((state) => state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") || "(?!)"}))?(?: +(\\[#${orgPriorityValue}\\]))?(?: +([^\\n]*?))??(?:[ \\t]+(:[${ORG_NATIVE_CHARACTER_ATOMS.alnum.slice(1, -1)}_@#%:]+:))?[ \\t]*$`, "u")
	let defaultPriority = "B"
	const lines = eligibleOrgSourceLines(source, states)
	// GNU keyword collection splits FILETAGS values on whitespace/colons.
	const fileTags = new Set<string>()
	const fileProperties = new Map<string, string>()
	const tagGroups = new Map<string, readonly string[]>()
	for (const { text } of lines) {
		const directive = /^#\+FILETAGS:[ \t]*([^\n]*)$/i.exec(text)
		if (directive) {
			for (const tag of directive[1].split(/[ \t:]+/).filter(Boolean)) fileTags.add(tag)
		}
		const priorities = orgPriorityDirective.exec(text)
		if (priorities) defaultPriority = priorities[1]
		const tagDirective = /^#\+TAGS:[ \t]*([^\n]*)$/i.exec(text)
		if (tagDirective) {
			const tokens = tagDirective[1].match(/\{[^\s{}]+\}|\S+/g) ?? []
			let group: string[] | null = null
			for (const token of tokens) {
				if (token === "[" || token === "{") group = []
				else if (token === "]" || token === "}") {
					const separator = group?.indexOf(":") ?? -1
					if (group && separator > 0) {
						for (const name of group.slice(0, separator)) tagGroups.set(name, group.slice(separator + 1))
					}
					group = null
				} else group?.push(token.replace(/\([^()]\)$/, ""))
			}
		}
		const property = /^#\+PROPERTY:[ \t]+([^ \t\r\n]+)[ \t]+([^\n]*?)[ \t]*$/i.exec(text)
		if (property) {
			const append = property[1].endsWith("+")
			const name = (append ? property[1].slice(0, -1) : property[1]).toUpperCase()
			if (propertyNames.has(name)) fileProperties.set(name, append && fileProperties.has(name) ? `${fileProperties.get(name)} ${property[2]}` : property[2])
		}
		const category = /^#\+CATEGORY:[ \t]*([^\n]*?)[ \t]*$/i.exec(text)
		if (category && propertyNames.has("CATEGORY")) fileProperties.set("CATEGORY", category[1])
	}
	const headings: SparseHeading[] = []
	const parents: number[] = []
	for (const { from, text: line } of lines) {
		const heading = /^(\*+) +([^\n]*)$/.exec(line)
		if (!heading) continue
		const fields = headingFields.exec(line)!
		const level = heading[1].length
		const raw = heading[2].trim()
		const state = fields[1] ?? null
		const withoutState = state ? raw.slice(state.length).trim() : raw
		const tagMatch = /(?:^|[ \t]+):([^\s:]+(?::[^\s:]+)*):[ \t]*$/.exec(withoutState)
		const title = tagMatch ? withoutState.slice(0, tagMatch.index).trim() : withoutState
		while (parents.length && headings[parents[parents.length - 1]].level >= level) {
			parents.pop()
		}
		const parent = parents.at(-1) ?? null
		const localTags = tagMatch ? tagMatch[1].split(":") : []
		const tags = fields[4]?.slice(1, -1).split(":") ?? []
		// Parent indices share ancestry rather than copying growing tag unions.
		headings.push({
			from,
			level,
			parent,
			state,
			tags,
			title,
			localTags,
			orgTitle: orgItemTitle(fields[3] ?? ""),
			...(propertyNames.size > 0 ? { properties: new Map<string, string>() } : {}),
		})
		parents.push(headings.length - 1)
	}
	if (propertyNames.size > 0) {
		const preamble = source.slice(0, headings[0]?.from ?? source.length).split(/\r\n|\r|\n/)
		let start = 0
		while (/^[ \t]*#(?:[ \t]|$)/.test(preamble[start] ?? "")) start++
		if (/^[ \t]*:PROPERTIES:[ \t]*$/i.test(preamble[start] ?? "")) {
			const end = preamble.findIndex((line, at) => at > start && /^[ \t]*:END:[ \t]*$/i.test(line))
			const documentProperties = new Map<string, string>()
			if (end > start) {
				for (let at = start + 1; at < end; at++) {
					const property = /^[ \t]*:([^ \t\r\n]+):[ \t]*([^\n]*?)[ \t]*$/.exec(preamble[at])
					if (!property) continue
					const key = property[1].toUpperCase()
					const name = key.endsWith("+") ? key.slice(0, -1) : key
					if (!propertyNames.has(name)) continue
					if (key.endsWith("+")) documentProperties.set(key, documentProperties.has(key) ? `${documentProperties.get(key)} ${property[2]}` : property[2])
					else if (!documentProperties.has(name)) documentProperties.set(name, property[2])
				}
				for (const name of propertyNames) {
					const base = documentProperties.get(name) ?? fileProperties.get(name) ?? orgMatchGlobalPropertyDefaults[name]
					const appended = documentProperties.get(`${name}+`)
					if (base !== undefined || appended !== undefined) fileProperties.set(name, appended === undefined ? base! : base === undefined ? appended : `${base} ${appended}`)
				}
			}
		}
		for (const [index, heading] of headings.entries()) {
			// Read only this own section. Writers reject duplicate drawers for safe
			// mutation, but GNU's matcher still reads repeated NAME+ values.
			const section = source.slice(heading.from, headings[index + 1]?.from ?? source.length)
			const sectionLines = section.split(/\r\n|\r|\n/)
			const headingLine = sectionLines[0]
			const nextLine = sectionLines[1] ?? ""
			const planning = parseOrgPlanningLine(nextLine)
			const properties = heading.properties as Map<string, string>
			const drawerStart = planning.kind === "planning" ? 2 : 1
			if (/^[ \t]*:PROPERTIES:[ \t]*$/i.test(sectionLines[drawerStart] ?? "")) {
				const end = sectionLines.findIndex((line, at) => at > drawerStart && /^[ \t]*:END:[ \t]*$/i.test(line))
				if (end > drawerStart) {
					for (let at = drawerStart + 1; at < end; at++) {
						const property = /^[ \t]*:([^ \t\r\n]+):[ \t]*([^\n]*?)[ \t]*$/.exec(sectionLines[at])
						if (!property) continue
						const key = property[1].toUpperCase()
						const name = key.endsWith("+") ? key.slice(0, -1) : key
						if (!propertyNames.has(name)) continue
						if (key.endsWith("+")) properties.set(key, properties.has(key) ? `${properties.get(key)} ${property[2]}` : property[2])
						else if (!properties.has(key)) properties.set(key, property[2])
					}
				}
			}
			if (planning.kind === "planning") {
				for (const entry of planning.fields) if (propertyNames.has(entry.kind)) properties.set(entry.kind, nextLine.slice(entry.dateFrom - 1, entry.to))
			}
			const priority = orgPriorityCookie.exec(headingLine)?.[1] ?? defaultPriority
			const special: Record<string, string> = {
				ITEM: heading.orgTitle,
				LEVEL: String(heading.level), PRIORITY: priority,
			}
			// Special properties are not ordinary drawer entries and never inherit.
			for (const name of ["TODO", "ITEM", "LEVEL", "PRIORITY", "TAGS", "ALLTAGS", "TIMESTAMP", "TIMESTAMP_IA", "CLOSED", "DEADLINE", "SCHEDULED"]) {
				if (!propertyNames.has(name)) continue
				if (name === "TODO") {
					if (heading.state === null) properties.delete(name)
					else properties.set(name, heading.state)
				} else if (name === "TAGS") {
					if (heading.tags.length) properties.set(name, `:${heading.tags.join(":")}:`)
					else properties.delete(name)
				} else if (name === "TIMESTAMP" || name === "TIMESTAMP_IA") {
					properties.delete(name)
					const active = name === "TIMESTAMP"
					const literalRanges = [...scanOrgBracketLinks(section), ...sparseInlineSourceRanges(maskOrgInlineCode(section))]
					for (const { from, text } of eligibleOrgSourceLines(section, states)) {
						if (/^[ \t]*(?:CLOSED:|DEADLINE:|SCHEDULED:|CLOCK:|#(?:[ \t]|$))/.test(text)) continue
						const semanticText = maskOrgInlineCode(text)
						const pattern = active ? /<\d{4}-\d{2}-\d{2}[^<>\r\n]*>/g : /\[\d{4}-\d{2}-\d{2}[^\[\]\r\n]*\]/g
						for (const candidate of semanticText.matchAll(pattern)) {
							const offset = from + candidate.index
							if (literalRanges.some((range) => range.from <= offset && offset < range.to)) continue
							if (readOrgStoredTimestamp(candidate[0]).kind !== "date") continue
							properties.set(name, candidate[0])
							break
						}
						if (properties.has(name)) break
					}
				} else if (Object.hasOwn(special, name)) properties.set(name, special[name])
				else if (name !== "ALLTAGS") {
					const field = planning.kind === "planning" ? planning.fields.find((entry) => entry.kind === name) : undefined
					if (field) properties.set(name, nextLine.slice(field.dateFrom - 1, field.to))
					else properties.delete(name)
				}
			}
		}
	}
	return { fileTags, fileProperties, headings, tagGroups }
}

/** Derived eligible raw-source snapshot: no cache, history, or source-edit authority. */
export const orgEffectiveTagSnapshot = (source: string, inheritance = DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance): OrgEffectiveTagSnapshot => {
	// Lazy unions still belong to the configuration captured with this snapshot.
	const tagPolicy = Array.isArray(inheritance.tags) ? [...inheritance.tags] : inheritance.tags
	const tagExclusions = [...inheritance.tagExclusions]
	const { headings, fileTags } = sparseMetadata(source, parseOrgTodoKeywords(source))
	return {
		fileTags: [...fileTags],
		headings: headings.map(({ from, tags }, index) => {
			let effectiveTags: readonly string[] | undefined
			return {
				// GNU keeps the most-local occurrence, including its position in the union.
				get effectiveTags() {
					if (effectiveTags === undefined) {
						const ancestors: number[] = []
						let current: number | null = index
						while (current !== null) {
							ancestors.push(current)
							current = headings[current].parent
						}
						const union = new Set([...fileTags].filter((tag) => orgInheritsName(tagPolicy, tagExclusions, tag)))
						for (const ancestor of ancestors.reverse()) {
							for (const tag of headings[ancestor].tags) {
								if (ancestor === index || orgInheritsName(tagPolicy, tagExclusions, tag)) {
									union.delete(tag)
									union.add(tag)
								}
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
		for (const tag of heading.localTags) localTags.add(tag)
		for (const tag of heading.tags) inheritedTags.add(tag)
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

/** Exact tag columns and regex inheritance columns are bounded by query predicates. */
const queryTagMembership = (
	headings: readonly SparseHeading[],
	fileTags: ReadonlySet<string>,
	query: OrgSparseTreeQuery,
	inheritance: OrgInheritanceConfiguration,
	regexps: ReadonlyMap<OrgSparseTreeQuery, OrgMatchRegExp>,
	tagGroups: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string | OrgSparseTreeQuery, Uint8Array> => {
	const membership = new Map<string | OrgSparseTreeQuery, Uint8Array>()
	const visit = (node: OrgSparseTreeQuery): void => {
		if (node.kind === "itag") {
			if (!membership.has(node.name)) membership.set(node.name, new Uint8Array(headings.length))
		} else if (node.kind === "tag-regexp") membership.set(node, new Uint8Array(headings.length))
		else if (node.kind === "not") visit(node.operand)
		else if (node.kind === "and" || node.kind === "or") { visit(node.left); visit(node.right) }
	}
	visit(query)
	const groupRegexps = new Map<string, OrgMatchRegExp>()
	for (const key of membership.keys()) {
		if (typeof key !== "string" || !tagGroups.has(key)) continue
		const members = new Set<string>()
		const remaining = [key]
		while (remaining.length) {
			const tag = remaining.pop()!
			if (members.has(tag)) continue
			members.add(tag)
			remaining.push(...tagGroups.get(tag) ?? [])
		}
		const literals: string[] = [], patterns: string[] = []
		for (const tag of members) {
			if (tag.startsWith("{") && tag.endsWith("}")) patterns.push(tag.slice(1, -1))
			else literals.push(tag.replace(/[\\.*+?[\]^$]/g, "\\$&"))
		}
		groupRegexps.set(key, orgMatchRegExp(`\\<\\(?:${literals.join("\\|")}\\)\\>${patterns.length ? `\\|${patterns.join("\\|")}` : ""}`, "tag"))
	}
	for (const [key, column] of membership) {
		if (typeof key === "string" && !groupRegexps.has(key)) {
			const inherit = orgInheritsName(inheritance.tags, inheritance.tagExclusions, key)
			for (const [index, heading] of headings.entries()) {
				column[index] = Number(heading.tags.includes(key) || inherit && (heading.parent === null ? fileTags.has(key) : column[heading.parent] === 1))
			}
		} else {
			const regexp = typeof key === "string" ? groupRegexps.get(key)! : regexps.get(key)!
			const inherited = new Uint8Array(headings.length)
			const fileMatch = [...fileTags].some((tag) => orgInheritsName(inheritance.tags, inheritance.tagExclusions, tag) && regexp.test(tag))
			for (const [index, heading] of headings.entries()) {
				inherited[index] = Number((heading.parent === null ? fileMatch : inherited[heading.parent] === 1) || heading.tags.some((tag) => orgInheritsName(inheritance.tags, inheritance.tagExclusions, tag) && regexp.test(tag)))
				column[index] = Number(inherited[index] === 1 || heading.tags.some((tag) => regexp.test(tag)))
			}
		}
	}
	return membership
}

/** GNU matcher offsets are elapsed durations: m=31 days, y=365.25 days, not calendar arithmetic. */
const comparableOrgDate = (value: string, today: string, now: string, operand = false): number | null => {
	// org-ts-regexp0 is unanchored, ignores seconds/suffixes, and encode-time
	// normalizes calendar overflow instead of validating a Gregorian literal.
	const absolute = /(\d{4})-(\d{2})-(\d{2})(?: +[^+\]\d>\n -]+)?(?: +(\d{1,2}):(\d{2}))?/.exec(value)
	const date = absolute ? `${absolute[1]}-${absolute[2]}-${absolute[3]}` : today
	if (!absolute && !isOrgCalendarISO(date)) return null
	const time = absolute ? `${absolute[4] ?? 0}:${absolute[5] ?? 0}` : "00:00"
	const result = new Date(0)
	result.setFullYear(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)))
	result.setHours(Number(time.split(":")[0]), Number(time.split(":")[1]), 0, 0)
	if (absolute) return result.getTime() > 0 ? result.getTime() : null
	if (!operand) return null
	const midnight = result.getTime()
	const currentClock = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(now)
	if (!currentClock) return null
	result.setHours(Number(currentClock[1]), Number(currentClock[2]), Number(currentClock[3] ?? 0), Number((currentClock[4] ?? "").padEnd(3, "0")))
	const current = result.getTime()
	if (value === "<now>") return current
	if (value === "<today>") return midnight
	if (value === "<tomorrow>") return midnight + 86400000
	if (value === "<yesterday>") return midnight - 86400000
	const relative = /^<([+-]\d+)([hdwmy])>$/.exec(value)
	if (!relative) return null
	const duration: Readonly<Record<string, number>> = { h: 3600000, d: 86400000, w: 604800000, m: 2678400000, y: 31557600000 }
	const shifted = (relative[2] === "h" ? current : midnight) + Number(relative[1]) * duration[relative[2]]
	return Number.isFinite(shifted) && shifted > 0 ? shifted : null
}

interface SparseSemanticPreparation {
	readonly effectiveQuery: OrgSparseTreeQuery
	readonly propertyNames: ReadonlySet<string>
	readonly keywords: OrgTodoKeywords
	readonly headings: readonly SparseHeading[]
	readonly fileTags: ReadonlySet<string>
	readonly fileProperties: ReadonlyMap<string, string>
	readonly tagGroups: ReadonlyMap<string, readonly string[]>
}
const semanticPreparations = new WeakMap<OrgSparseTreeQuery, { readonly source: string; readonly prepared: SparseSemanticPreparation }>()
const sparsePropertyNames = (query: OrgSparseTreeQuery): ReadonlySet<string> => {
	const names = new Set<string>()
	const visit = (node: OrgSparseTreeQuery): void => {
		if (node.kind === "property") names.add(node.name)
		else if (node.kind === "not") visit(node.operand)
		else if (node.kind === "and" || node.kind === "or") { visit(node.left); visit(node.right) }
	}
	visit(query)
	return names
}
const prepareSparseSemanticSource = (source: string, query: OrgSparseTreeQuery): SparseSemanticPreparation => {
	const cached = semanticPreparations.get(query)
	if (cached?.source === source) return cached.prepared
	const keywords = parseOrgTodoKeywords(source)
	let propertyNames = sparsePropertyNames(query)
	let metadata = sparseMetadata(source, keywords, propertyNames)
	let effectiveQuery = query
	const input = nativeMatchInputs.get(query)
	if (input) {
		const expanded = expandOrgSparseTreeMatchGroups(input, metadata.tagGroups)
		if (expanded !== input) {
			const parsed = readOrgSparseTreeMatchQuery(expanded, true)
			if (parsed.kind === "error") throw new Error(parsed.message)
			effectiveQuery = parsed.query
			const effectiveNames = sparsePropertyNames(effectiveQuery)
			if ([...effectiveNames].some((name) => !propertyNames.has(name))) metadata = sparseMetadata(source, keywords, effectiveNames)
			propertyNames = effectiveNames
		}
	}
	const prepared: SparseSemanticPreparation = { ...metadata, keywords, propertyNames, effectiveQuery }
	if (isParsedOrgSparseTreeQuery(query)) semanticPreparations.set(query, { source, prepared })
	return prepared
}
const specialContext = (name: string): "file" | "dependency" | "clock" | undefined =>
	name === "FILE" ? "file" : name === "BLOCKED" ? "dependency" : name === "CLOCKSUM" || name === "CLOCKSUM_T" ? "clock" : undefined

export const orgSparseTreeSpecialPropertyRequest = (
	source: string,
	query: OrgSparseTreeQuery,
	_inheritance: OrgInheritanceConfiguration = query.inheritance ?? DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance,
): OrgSparseSpecialPropertyRequest => {
	const { headings, propertyNames } = prepareSparseSemanticSource(source, query)
	return Object.freeze({
		properties: Object.freeze([...propertyNames].filter((name): name is OrgSparseSpecialPropertyName => specialContext(name) !== undefined)),
		headingStarts: Object.freeze(headings.map((heading) => heading.from)),
	})
}

const prepareSparsePropertyValues = (source: string, query: OrgSparseTreeQuery, inheritance: OrgInheritanceConfiguration, nativeContext?: OrgSparseTreeNativeContext) => {
	const metadata = prepareSparseSemanticSource(source, query)
	const { headings, fileTags, fileProperties, propertyNames } = metadata
	const propertyValues = new Map<string, (string | undefined)[]>()
	for (const name of propertyNames) {
		const context = specialContext(name)
		if (context) {
			const captured = nativeContext?.specialProperties?.get(name as OrgSparseSpecialPropertyName)
			if (!captured) throw new OrgSparseTreeContextRequiredError(`${name} requires captured ${context} context`, context)
			propertyValues.set(name, headings.map((heading) => {
				if (!captured.has(heading.from)) throw new OrgSparseTreeContextRequiredError(`${name} has no captured current heading`, context)
				return captured.get(heading.from)
			}))
			continue
		}
		const special = ["TODO", "ITEM", "LEVEL", "PRIORITY", "TAGS", "ALLTAGS", "TIMESTAMP", "TIMESTAMP_IA", "CLOSED", "DEADLINE", "SCHEDULED"].includes(name)
		const inherit = name === "CATEGORY" || !special && orgInheritsName(inheritance.properties, inheritance.propertyExclusions, name, "property")
		const column: (string | undefined)[] = []
		// Preserve raw nil barriers until all ancestor NAME+ values accumulate.
		const rawColumn: (string | undefined)[] = []
		for (const [index, heading] of headings.entries()) {
			const inherited = inherit ? heading.parent === null ? fileProperties.get(name) ?? orgMatchGlobalPropertyDefaults[name] : rawColumn[heading.parent] : undefined
			const local = heading.properties?.get(name)
			const base = local ?? inherited
			const appended = special ? undefined : heading.properties?.get(`${name}+`)
			let resolved = appended === undefined ? base : base === undefined ? appended : `${base} ${appended}`
			rawColumn.push(resolved)
			if (!special && resolved === "nil") resolved = undefined
			if (name === "CATEGORY") resolved ??= "???"
			if (name === "ALLTAGS") {
				const ancestors: number[] = []
				let ancestor: number | null = index
				while (ancestor !== null) { ancestors.push(ancestor); ancestor = headings[ancestor].parent }
				const tags = [...fileTags].filter((tag) => orgInheritsName(inheritance.tags, inheritance.tagExclusions, tag))
				for (const current of ancestors.reverse()) {
					for (const tag of headings[current].tags) {
						if (current !== index && !orgInheritsName(inheritance.tags, inheritance.tagExclusions, tag)) continue
						const previous = tags.indexOf(tag)
						if (previous >= 0) tags.splice(previous, 1)
						tags.push(tag)
					}
				}
				resolved = tags.length ? `:${tags.join(":")}:` : undefined
			}
			column.push(resolved)
		}
		propertyValues.set(name, column)
	}
	return { ...metadata, propertyValues }
}

/** Collects only data used by relational string predicates, from the same columns as matching. */
export const orgSparseTreeComparableStrings = (
	source: string,
	query: OrgSparseTreeQuery,
	inheritance: OrgInheritanceConfiguration = query.inheritance ?? DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance,
	nativeContext?: OrgSparseTreeNativeContext,
): readonly string[] => {
	const { effectiveQuery } = prepareSparseSemanticSource(source, query)
	const operands = new Map<string, Set<string>>()
	const visit = (node: OrgSparseTreeQuery): void => {
		if (node.kind === "property" && node.value.kind === "string" && node.comparison !== "=" && node.comparison !== "<>") {
			if (!operands.has(node.name)) operands.set(node.name, new Set())
			operands.get(node.name)!.add(node.value.value)
		} else if (node.kind === "not") visit(node.operand)
		else if (node.kind === "and" || node.kind === "or") { visit(node.left); visit(node.right) }
	}
	visit(effectiveQuery)
	if (operands.size === 0) return []
	const { propertyValues } = prepareSparsePropertyValues(source, query, inheritance, nativeContext)
	const strings = new Set<string>()
	for (const [name, values] of operands) {
		for (const value of values) strings.add(value)
		for (const value of propertyValues.get(name) ?? []) strings.add(value ?? "")
	}
	return Object.freeze([...strings])
}

/**
 * Retains matched headings, their own body sections, and all ancestors. Unrelated
 * sections are hidden; preamble stays visible. No source is copied or rewritten.
 * Legacy tag: predicates are local; conventional tags honor the captured inheritance policy.
 */
export const buildOrgSparseTreePlan = (
	source: string,
	query: OrgSparseTreeQuery,
	inheritance: OrgInheritanceConfiguration = query.inheritance ?? DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance,
	dateContext?: { readonly today: string; readonly now?: string },
	nativeContext?: OrgSparseTreeNativeContext,
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ancestor closure and adjacent range coalescing preserve raw source boundaries.
): OrgSparseTreePlan => {
	const { keywords, headings, fileTags, tagGroups, propertyValues, effectiveQuery } = prepareSparsePropertyValues(source, query, inheritance, nativeContext)
	const regexps = new Map<OrgSparseTreeQuery, OrgMatchRegExp>()
	const dateValues = new Map<OrgSparseTreeQuery, number | null>()
	let clock: { readonly today: string; readonly now: string } | undefined
	const visit = (node: OrgSparseTreeQuery): void => {
		if (node.kind === "property") {
			if (node.value.kind === "string" && node.comparison !== "=" && node.comparison !== "<>" && !nativeContext?.compareStrings) throw new OrgSparseTreeContextRequiredError()
			if (node.value.kind === "regexp") regexps.set(node, orgMatchRegExp(node.value.value))
			else if (node.value.kind === "date") {
				if (!clock) {
					if (dateContext) clock = { today: dateContext.today, now: dateContext.now ?? "00:00" }
					else {
						const now = new Date()
						clock = { today: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`, now: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}` }
					}
				}
				dateValues.set(node, comparableOrgDate(node.value.value, clock.today, clock.now, true))
			}
		} else if (node.kind === "tag-regexp" || node.kind === "todo-regexp") regexps.set(node, orgMatchRegExp(node.pattern, node.kind === "tag-regexp" ? "tag" : "property"))
		else if (node.kind === "not") visit(node.operand)
		else if (node.kind === "and" || node.kind === "or") { visit(node.left); visit(node.right) }
	}
	visit(effectiveQuery)
	const pending = new Set(keywords.todo)
	const membership = queryTagMembership(headings, fileTags, effectiveQuery, inheritance, regexps, tagGroups)
	const headingMatches = (node: OrgSparseTreeQuery, index: number): boolean => {
		const heading = headings[index]
		switch (node.kind) {
			case "all": return true
			case "todo": return node.state !== undefined ? heading.state === node.state : heading.state !== null && pending.has(heading.state)
			case "tag": return heading.localTags.includes(node.name)
			case "itag": return membership.get(node.name)?.[index] === 1
			case "tag-regexp": return membership.get(node)?.[index] === 1 || heading.tags.some((tag) => regexps.get(node)!.test(tag))
			case "todo-regexp": return heading.state !== null && regexps.get(node)!.test(heading.state)
			case "not": return !headingMatches(node.operand, index)
			case "and": return headingMatches(node.left, index) && headingMatches(node.right, index)
			case "or": return headingMatches(node.left, index) || headingMatches(node.right, index)
			case "text": return node.literal.length > 0 && heading.title.includes(node.literal)
			case "property": {
				const actual = propertyValues.get(node.name)?.[index]
				if (node.requirePresent && actual === undefined) return false
				if (node.value.kind === "regexp") {
					const matches = regexps.get(node)!.test(actual ?? "")
					return node.comparison === "=" ? matches : !matches
				}
				let left: string | number = actual ?? ""
				let right: string | number = node.value.value
				if (node.value.kind === "number") {
					// PRIORITY is a string ("A", "B"...); string-to-number also
					// maps letter priorities to zero, not their character codes.
					left = Number(/^[ \t]*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(actual ?? "")?.[0] ?? 0)
				} else if (node.value.kind === "date") {
					const resolved = actual && comparableOrgDate(actual, clock!.today, clock!.now)
					const expected = dateValues.get(node)
					if (!resolved || !expected) return false
					left = resolved
					right = expected
				}
				const equal = left === right
				const ordering = node.comparison !== "=" && node.comparison !== "<>"
				const less = !ordering ? false : typeof left === "string" && typeof right === "string" ? nativeContext!.compareStrings!(left, right) < 0 : left < right
				switch (node.comparison) {
					case "=": return equal
					// Installed org-macs.el org-time<> calls (= a b). Preserve
					// this observed GNU behavior, rather than inferred inequality.
					case "<>": return node.value.kind === "date" ? equal : !equal
					case "<": return less
					case "<=": return equal || less
					case ">": return !equal && !less
					case ">=": return !less
				}
			}
		}
	}
	const matched = headings.flatMap((_heading, index) => headingMatches(effectiveQuery, index) ? [index] : [])
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
