import { isSafeRelativeOrgPath } from "./org-subtree-refile.pipe"
import { eligibleOrgSourceLines, parseOrgTodoKeywords } from "./org-text.pipe"
import { isOrgCalendarISO, readOrgStoredTimestamp, type OrgTimestampValue } from "./org-date-reader.pipe"

/** Display snapshot metadata. Commands require the complete OrgAgendaActionOrigin below. */
export interface OrgAgendaSourceMetadata {
	readonly workspaceSessionId?: string
	readonly runtimeIncarnation?: string
	readonly sourceGeneration?: number
}

/** Complete command provenance; parser/manual rows remain display-only. */
export type OrgAgendaActionOrigin = OrgAgendaOrigin & {
	readonly workspaceSessionId: string
	readonly workspaceRoot: string
	readonly sourceRevision: string
	readonly diskRevision: string
} & (
		| { readonly source: "disk" }
		| {
				readonly source: "live"
				readonly runtimeIncarnation: string
				readonly sourceGeneration: number
		  }
	)

export const hasOrgAgendaActionOrigin = (
	origin: OrgAgendaOrigin | undefined,
): origin is OrgAgendaActionOrigin => {
	const nonempty = (value: unknown) => typeof value === "string" && value.length > 0
	const validAnchor = (value: OrgAgendaSourceAnchor | null | undefined) =>
		!!value &&
		Number.isSafeInteger(value.from) &&
		value.from >= 0 &&
		Number.isSafeInteger(value.to) &&
		value.to > value.from &&
		typeof value.text === "string" &&
		value.text.length === value.to - value.from
	return (
		!!origin &&
		(origin.source === "disk" || origin.source === "live") &&
		nonempty(origin.workspaceSessionId) &&
		nonempty(origin.workspaceRoot) &&
		nonempty(origin.sourceRevision) &&
		nonempty(origin.diskRevision) &&
		nonempty(origin.relativePath) &&
		(origin.capabilityToken === undefined || nonempty(origin.capabilityToken)) &&
		(origin.timestamp === null || validAnchor(origin.timestamp)) &&
		validAnchor(origin.heading) &&
		(origin.source === "disk" ||
			(nonempty(origin.runtimeIncarnation) &&
				Number.isSafeInteger(origin.sourceGeneration) &&
				Number(origin.sourceGeneration) >= 0))
	)
}

export type OrgAgendaEntryKind = "deadline" | "scheduled" | "timestamp" | "todo"

/** Half-open UTF-16 offsets into verbatim source, never normalized editor text. */
export interface OrgAgendaSourceAnchor {
	readonly from: number
	readonly to: number
	readonly text: string
}

export interface OrgAgendaOrigin extends OrgAgendaSourceMetadata {
	readonly relativePath: string
	readonly timestamp: OrgAgendaSourceAnchor | null
	readonly heading: OrgAgendaSourceAnchor | null
	readonly source: "parser" | "disk" | "live"
	readonly workspaceRoot?: string
	readonly capabilityToken?: string
	readonly sourceRevision?: string
	/** Live revisions are consumer-owned; diskRevision remains the write precondition. */
	readonly diskRevision?: string
}

/** Source-backed item. A null date/timestamp denotes a genuine heading-list row. */
export interface OrgAgendaEntry {
	readonly relativePath: string
	readonly line: number
	readonly column: number
	readonly date: string | null
	readonly kind: OrgAgendaEntryKind
	readonly heading: string | null
	readonly level: number
	readonly todo: string | null
	/** Source-order ordinal within a heading/kind; virtual dates never renumber it. */
	readonly sourceOrdinal?: number
	readonly pending?: boolean
	readonly timestampValue?: OrgTimestampValue
	readonly occurrence?: "source" | "range" | "repeat" | "overdue" | "warning" | "expired"
	/** Parser/flow rows carry exact provenance; manually supplied display rows need not. */
	readonly origin?: OrgAgendaOrigin
}

export interface AnchoredOrgAgendaEntry extends OrgAgendaEntry {
	readonly origin: OrgAgendaOrigin
}

export interface OrgAgendaActionEntry extends OrgAgendaEntry {
	readonly origin: OrgAgendaActionOrigin
}

/** Default parser calls remain dated; list projection explicitly requests heading rows. */
export interface DatedOrgAgendaEntry extends AnchoredOrgAgendaEntry {
	readonly date: string
	readonly kind: Exclude<OrgAgendaEntryKind, "todo">
	readonly origin: OrgAgendaOrigin & { readonly timestamp: OrgAgendaSourceAnchor }
}
const STAMP = String.raw`<\d{4}-\d{2}-\d{2}(?:[ \t][^>\r\n]*)?>`
const ACTIVE_TIMESTAMP = new RegExp(`${STAMP}(?:--${STAMP})?`, "g")
const PLANNING_TIMESTAMP = new RegExp(String.raw`\b(SCHEDULED|DEADLINE):\s*(${STAMP}(?:--${STAMP})?)`, "g")
const HEADING = /^(\*+)[ \t]+(.*)$/
const compareText = (left: string, right: string): number =>
	left < right ? -1 : left > right ? 1 : 0

const anchor = (from: number, text: string): OrgAgendaSourceAnchor =>
	Object.freeze({ from, text, to: from + text.length })

/** Extracts immutable anchors using the same eligibility grammar as Org structural editing. */
export function parseOrgAgenda(relativePath: string, source: string): readonly DatedOrgAgendaEntry[]
export function parseOrgAgenda(relativePath: string, source: string, includeHeadings: true): readonly AnchoredOrgAgendaEntry[]
export function parseOrgAgenda(
	relativePath: string,
	source: string,
	includeHeadings = false,
): readonly AnchoredOrgAgendaEntry[] {
	if (
		typeof relativePath !== "string" ||
		!isSafeRelativeOrgPath(relativePath) ||
		[...relativePath].some(
			(character) =>
				character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === ":",
		) ||
		typeof source !== "string"
	) {
		return Object.freeze([])
	}
	const keywords = parseOrgTodoKeywords(source)
	const states = new Set([...keywords.todo, ...keywords.done])
	const pendingStates = new Set(keywords.todo)
	const entries: AnchoredOrgAgendaEntry[] = []
	let heading: string | null = null
	let headingAnchor: OrgAgendaSourceAnchor | null = null
	let headingBreakTo = -1
	let level = 0
	let todo: string | null = null
	const sourceOrdinals: Record<OrgAgendaEntryKind, number> = { deadline: 0, scheduled: 0, timestamp: 0, todo: 0 }
	// Offsets and physical line numbers include excluded source and every raw line ending.
	const lineNumbers = new Map<number, number>([[0, 1]])
	let lineNumber = 1
	for (const match of source.matchAll(/\r\n|\r|\n/g)) {
		lineNumber += 1
		lineNumbers.set(match.index + match[0].length, lineNumber)
	}
	for (const line of eligibleOrgSourceLines(source, states)) {
		if (/^[ \t]*#/.test(line.text) || /^[ \t]*:[ \t]/.test(line.text)) {
			continue
		}
		const headingMatch = HEADING.exec(line.text)
		if (headingMatch) {
			const rawHeading = headingMatch[2]
			const firstWord = rawHeading.split(/[ \t]/, 1)[0]
			todo = states.has(firstWord) ? firstWord : null
			heading = (todo ? rawHeading.slice(firstWord.length) : rawHeading).trim()
			level = headingMatch[1].length
			headingAnchor = anchor(line.from, line.text)
			headingBreakTo = line.breakTo
			sourceOrdinals.deadline = sourceOrdinals.scheduled = sourceOrdinals.timestamp = 0
			if (includeHeadings) entries.push(Object.freeze({
				relativePath, line: lineNumbers.get(line.from) ?? 1, column: 0,
				sourceOrdinal: 0,
				date: null, kind: "todo", heading, level, todo,
				pending: todo !== null && pendingStates.has(todo),
				origin: Object.freeze({ relativePath, source: "parser", heading: headingAnchor, timestamp: null }),
			}))
		}
		const addEntry = (column: number, text: string, kind: OrgAgendaEntryKind) => {
			const parsed = readOrgStoredTimestamp(text)
			if (parsed.kind !== "date" || !isOrgCalendarISO(parsed.date)) return
			const timestampValue: OrgTimestampValue = parsed.timestamp ?? { date: parsed.date }
			if (timestampValue.repeater) {
				if (timestampValue.repeater.maximum) Object.freeze(timestampValue.repeater.maximum)
				Object.freeze(timestampValue.repeater)
			}
			if (timestampValue.endRepeater) {
				if (timestampValue.endRepeater.maximum) Object.freeze(timestampValue.endRepeater.maximum)
				Object.freeze(timestampValue.endRepeater)
			}
			if (timestampValue.warning) Object.freeze(timestampValue.warning)
			if (timestampValue.endWarning) Object.freeze(timestampValue.endWarning)
			const origin: OrgAgendaOrigin = Object.freeze({
				heading: headingAnchor,
				relativePath,
				source: "parser",
				timestamp: anchor(line.from + column, text),
			})
			entries.push(
				Object.freeze({
					column,
					date: parsed.date,
					heading,
					kind,
					level,
					line: lineNumbers.get(line.from) ?? 1,
					origin,
					relativePath,
					todo,
					sourceOrdinal: sourceOrdinals[kind]++,
					pending: todo !== null && pendingStates.has(todo),
					timestampValue: Object.freeze(timestampValue),
				}),
			)
		}
		const planningStarts = !headingMatch && line.from === headingBreakTo ? new Set<number>() : null
		if (planningStarts) {
			for (const match of line.text.matchAll(PLANNING_TIMESTAMP)) {
				const column = match.index + match[0].indexOf(match[2])
				planningStarts.add(column)
				addEntry(column, match[2], match[1] === "DEADLINE" ? "deadline" : "scheduled")
			}
		}
		for (const match of line.text.matchAll(ACTIVE_TIMESTAMP)) {
			if (!planningStarts?.has(match.index)) {
				addEntry(match.index, match[0], "timestamp")
			}
		}
	}
	return Object.freeze(sortOrgAgendaEntries(entries))
}

/** Gives aggregated parser output the same stable order as a single document. */
export const sortOrgAgendaEntries = <T extends OrgAgendaEntry>(
	entries: readonly T[],
): readonly T[] =>
	[...entries].sort(
		(left, right) =>
			compareText(left.date ?? "", right.date ?? "") ||
			compareText(left.kind, right.kind) ||
			compareText(left.relativePath, right.relativePath) ||
			left.line - right.line ||
			left.column - right.column,
	)

export type OrgAgendaOriginValidation =
	| { readonly valid: true; readonly entry: AnchoredOrgAgendaEntry }
	| { readonly valid: false; readonly reason: "revision" | "source-drift" }

/** Reparse, do not relocate: identical timestamp text in an inert region is not a valid anchor. */
export const validateOrgAgendaOrigin = (
	entry: AnchoredOrgAgendaEntry,
	source: string,
	sourceRevision?: string,
	metadata: OrgAgendaSourceMetadata = {},
): OrgAgendaOriginValidation => {
	if (
		!entry?.origin ||
		typeof source !== "string" ||
		(entry.origin.source !== "parser" && !hasOrgAgendaActionOrigin(entry.origin))
	) {
		return { reason: "source-drift", valid: false }
	}
	if (
		(entry.origin.sourceRevision !== undefined &&
			(!entry.origin.sourceRevision || entry.origin.sourceRevision !== sourceRevision)) ||
		(entry.origin.diskRevision !== undefined && !entry.origin.diskRevision) ||
		(["workspaceSessionId", "runtimeIncarnation", "sourceGeneration"] as const).some(
			(key) =>
				entry.origin[key] !== undefined &&
				(entry.origin[key] !== metadata[key] ||
					(key === "sourceGeneration"
						? !Number.isSafeInteger(entry.origin[key]) || Number(entry.origin[key]) < 0
						: typeof entry.origin[key] !== "string" || entry.origin[key] === "")),
		)
	) {
		return { reason: "revision", valid: false }
	}
	const sameAnchor = (left: OrgAgendaSourceAnchor | null, right: OrgAgendaSourceAnchor | null) =>
		left === null
			? right === null
			: left !== undefined &&
				right !== null &&
				left.from === right.from &&
				left.to === right.to &&
				left.text === right.text
	const matched = parseOrgAgenda(entry.relativePath, source, true).find(
		(candidate) =>
			entry.origin.relativePath === entry.relativePath &&
			sameAnchor(entry.origin.timestamp, candidate.origin.timestamp) &&
			sameAnchor(entry.origin.heading, candidate.origin.heading) &&
			entry.kind === candidate.kind &&
			(entry.sourceOrdinal === undefined || entry.sourceOrdinal === candidate.sourceOrdinal) &&
			(entry.kind === "todo" ? entry.date === null && entry.origin.timestamp === null :
				entry.origin.timestamp !== null && (entry.occurrence && entry.occurrence !== "source" ? isOrgCalendarISO(entry.date) : entry.date === candidate.date)) &&
			entry.todo === candidate.todo &&
			entry.heading === candidate.heading &&
			entry.line === candidate.line &&
			entry.column === candidate.column &&
			entry.level === candidate.level,
	)
	return matched ? { entry, valid: true } : { reason: "source-drift", valid: false }
}
