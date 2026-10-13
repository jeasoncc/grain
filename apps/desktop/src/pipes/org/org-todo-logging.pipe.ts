import { advanceOrgRepeatingTimestamp, readOrgStoredTimestamp, type OrgDateContext } from "./org-date-reader.pipe"
import { parseOrgClocks } from "./org-clock.pipe"
import { resolveOrgLoggingPolicy, type OrgLoggingPolicy, type OrgLoggingPolicyOptions } from "./org-logging-policy.pipe"
import { parseOrgPlanningLine, type OrgPlanningFieldRange } from "./org-planning-line.pipe"
import {
	cycleEligibleOrgTodoAt,
	eligibleOrgSourceLines,
	type OrgTextEdit,
	type RawOrgLine,
	type OrgBlockRange,
	eligibleOrgBlockRanges,
	eligibleOrgDrawerRanges,
	parseOrgTodoKeywords,
} from "./org-text.pipe"

export type OrgLoggingOperation =
	| { readonly kind: "todo" }
	| { readonly kind: "reschedule" | "redeadline"; readonly previous: string | null; readonly next: string | null }
	| { readonly kind: "refile" }
export interface OrgLoggingNoteRequest {
	readonly operation: OrgLoggingOperation
	readonly cursor: number
	readonly stamp: string
	/** Planning continuation retains original prompt intent and its setup-time context. */
	readonly input?: string
	readonly context?: OrgDateContext
}
export type OrgOperationLoggingPlan =
	| { readonly kind: "edit"; readonly edits: OrgTextEdit[] }
	| { readonly kind: "noop" }
	| { readonly kind: "needs-note"; readonly request: OrgLoggingNoteRequest }
	| { readonly kind: "rejected"; readonly reason: string }
export type OrgTodoTransitionPlan =
	| { readonly kind: "edit"; readonly edits: OrgTextEdit[]; readonly done: boolean }
	| Exclude<OrgOperationLoggingPlan, { readonly kind: "edit" }>
export interface OrgTodoRepeatOptions extends OrgLoggingPolicyOptions {
	/** Org's org-todo-repeat-to-state: nil/false uses the sequence head, t uses the previous state. */
	readonly repeatToState?: string | boolean
	/** Explicit configured keyword, or the empty string to remove the TODO keyword. */
	readonly state?: string
	/** Complete without repeating; cancel each eligible repeater with GNU's zero cookie. */
	readonly finalCompletion?: boolean
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** An explicitly supplied, inactive, minute-resolution local Org timestamp. */
export const validOrgLocalTimestamp = (stamp: unknown): stamp is string => {
	if (typeof stamp !== "string") return false
	const match = /^\[(\d{4})-(\d{2})-(\d{2}) (Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d{2}):(\d{2})\]$/.exec(stamp)
	if (!match) return false
	const [, y, m, d, weekday, h, minute] = match
	const year = Number(y), month = Number(m), day = Number(d)
	const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
	const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || Number(h) > 23 || Number(minute) > 59) return false
	const priorYear = month < 3 ? year - 1 : year
	const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
	const index = (priorYear + Math.floor(priorYear / 4) - Math.floor(priorYear / 100) + Math.floor(priorYear / 400) + offsets[month - 1] + day) % 7
	return weekdays[index] === weekday
}

/** Boundary helper: the caller owns obtaining the current local time. */
export const formatOrgLocalTimestamp = (date: Date): string => {
	const pad = (value: number) => String(value).padStart(2, "0")
	const stamp = `[${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${weekdays[date.getDay()]} ${pad(date.getHours())}:${pad(date.getMinutes())}]`
	if (!validOrgLocalTimestamp(stamp)) throw new Error("Invalid local Org timestamp")
	return stamp
}

interface Line { from: number; to: number; end: number; text: string }
const linesOf = (source: string): Line[] => {
	const lines: Line[] = []
	for (const match of source.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g)) {
		lines.push({ end: match.index + match[0].length, from: match.index, text: match[1], to: match.index + match[1].length })
		if (!match[0]) break
	}
	return lines
}
const rejected = (reason: string): { readonly kind: "rejected"; readonly reason: string } => ({ kind: "rejected", reason })
/** Fixedwidth JSON chunks recover every literal note byte without introducing Org structure. */
const literalNote = (note: string, eol: string): string => linesOf(note)
	.filter((line) => line.end > line.from)
	.map((line) => `  : ${JSON.stringify(note.slice(line.from, line.end))}${eol}`).join("")

interface Entry {
	readonly kind: "entry"
	readonly lines: Line[]
	readonly heading: Line
	readonly body: Line[]
	readonly eligible: readonly RawOrgLine[]
	readonly drawers: readonly OrgBlockRange[]
	readonly properties: OrgBlockRange | undefined
	readonly planning: { readonly line: Line; readonly fields: readonly OrgPlanningFieldRange[] } | undefined
	readonly policy: OrgLoggingPolicy
	readonly insertion: number
	readonly eol: string
}

/** One shared, source-range metadata validation boundary for TODO, planning and refile. */
const loggingEntry = (source: string, cursor: number, options: OrgLoggingPolicyOptions = {}): Entry | { readonly kind: "noop" } | { readonly kind: "rejected"; readonly reason: string } => {
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length) return rejected("invalid-cursor")
	const lines = linesOf(source)
	const heading = lines.findLast((line) => line.from <= cursor)
	if (!heading || !/^\*+[ \t]+/.test(heading.text)) return { kind: "noop" }
	const keywords = parseOrgTodoKeywords(source)
	const states = new Set([...keywords.todo, ...keywords.done])
	const eligible = eligibleOrgSourceLines(source, states)
	const allDrawers = eligibleOrgDrawerRanges(source, states)
	if (!eligible.some((line) => line.from === heading.from)) {
		if (allDrawers.some((range) => !range.closed && heading.from >= range.from && heading.from < range.to)) return rejected("malformed-drawer")
		return { kind: "noop" }
	}
	const resolved = resolveOrgLoggingPolicy(source, heading, options)
	if (resolved.kind === "rejected") return resolved
	const following = lines.slice(lines.indexOf(heading) + 1)
	const blocks = eligibleOrgBlockRanges(source, states)
	const inBlock = (position: number) => blocks.some((range) => position >= range.from && position < range.to)
	const boundary = following.findIndex((line) => /^\*+[ \t]+/.test(line.text) && !inBlock(line.from) && !allDrawers.some((range) => range.closed && line.from >= range.from && line.from < range.to))
	const body = boundary < 0 ? following : following.slice(0, boundary)
	const bodyEnd = boundary < 0 ? source.length : following[boundary].from
	const drawers = allDrawers.filter((range) => range.from >= heading.end && range.from < bodyEnd)
	if (drawers.some((range) => !range.closed || range.to > bodyEnd)) return rejected("malformed-drawer")
	if (blocks.some((range) => range.from >= heading.end && range.from < bodyEnd && !range.closed)) return rejected("malformed-block")
	if (body.some((line) => !inBlock(line.from) && /^[ \t]*:END:[ \t]*$/i.test(line.text) && !drawers.some((range) => line.from >= range.from && line.from < range.to))) return rejected("unmatched-drawer-end")
	const names = drawers.map((range) => lines.find((line) => line.from === range.from)!.text.trim().toUpperCase())
	if (new Set(names).size !== names.length) return rejected("duplicate-drawer")
	for (const range of drawers) {
		const propertyDrawer = /^[ \t]*:PROPERTIES:[ \t]*$/i.test(lines.find((line) => line.from === range.from)!.text)
		const interior = lines.filter((line) => line.from > range.from && line.from < range.to)
		if (propertyDrawer && interior.some((line) => !/^[ \t]*:END:[ \t]*$/i.test(line.text) && !/^[ \t]*:[^\s:]+:(?:[ \t].*)?$/.test(line.text))) return rejected("malformed-properties")
		if (interior.some((line) => /^\*+[ \t]+/.test(line.text) || (/^[ \t]*:[\w-]+:[ \t]*$/.test(line.text) && !/^[ \t]*:END:[ \t]*$/i.test(line.text) && (!propertyDrawer || /^[ \t]*:(?:PROPERTIES|LOGBOOK):[ \t]*$/i.test(line.text))))) return rejected("nested-drawer")
	}
	const planningItems = body.filter((line) => !inBlock(line.from) && !drawers.some((range) => line.from >= range.from && line.from < range.to))
		.map((line) => ({ line, parsed: parseOrgPlanningLine(line.text) })).filter((item) => item.parsed.kind !== "none")
	if (planningItems.length > 1 || planningItems.some((item) => item.parsed.kind === "invalid")) return rejected("ambiguous-planning")
	const item = planningItems[0]
	if (item && item.line !== body[0]) return rejected("misplaced-planning")
	const planning = item?.parsed.kind === "planning" ? { line: item.line, fields: item.parsed.fields } : undefined
	let insertion = planning?.line.end ?? heading.end
	const properties = drawers.filter((range) => /^[ \t]*:PROPERTIES:[ \t]*$/i.test(lines.find((line) => line.from === range.from)!.text))
	if (properties.length > 1) return rejected("ambiguous-properties")
	if (properties[0]) {
		if (properties[0].from !== insertion) return rejected("misplaced-properties")
		insertion = properties[0].to
		const lastRepeat = lines.filter((line) => line.from > properties[0].from && line.from < properties[0].to && /^[ \t]*:LAST_REPEAT:/i.test(line.text))
		if (lastRepeat.length > 1) return rejected("ambiguous-last-repeat")
		if (lastRepeat[0]) {
			const value = lastRepeat[0].text.replace(/^[ \t]*:LAST_REPEAT:[ \t]*/i, "").trim()
			const parsed = value ? readOrgStoredTimestamp(value) : null
			if (value && (!/^\[\d{4}-\d{2}-\d{2}[^\[\]]*\]$/.test(value) || parsed?.kind !== "date" || parsed.timestamp?.repeater || parsed.timestamp?.warning || parsed.timestamp?.endDate || parsed.timestamp?.endTime)) return rejected("malformed-last-repeat")
		}
	}
	const eol = source.slice(heading.to, heading.end) || source.match(/\r\n|\r|\n/)?.[0] || "\n"
	return { kind: "entry", lines, heading, body, eligible, drawers, properties: properties[0], planning, policy: resolved.policy, insertion, eol }
}

const atomicEdits = (edits: OrgTextEdit[]): OrgTextEdit[] => {
	const atomic: OrgTextEdit[] = []
	for (const change of edits.sort((a, b) => a.from - b.from)) {
		const prior = atomic.at(-1)
		if (prior && prior.from === change.from && prior.to === prior.from && change.to === change.from) {
			const insert = /[\r\n]$/.test(prior.insert) ? change.insert.replace(/^(?:\r\n|\r|\n)/, "") : change.insert
			atomic[atomic.length - 1] = { ...prior, insert: prior.insert + insert }
		} else atomic.push(change)
	}
	return atomic
}
const insertAt = (entry: Entry, source: string, cursor: number, from: number, insert: string): OrgTextEdit => ({
	cursor, from, to: from, insert: `${from > 0 && !/[\r\n]/.test(source[from - 1]) ? entry.eol : ""}${insert}`,
})
const logEntryEdit = (source: string, entry: Entry, cursor: number, text: string): OrgTextEdit => {
	const drawer = entry.policy.drawer
	if (drawer) {
		const existing = entry.drawers.find((range) => entry.lines.find((line) => line.from === range.from)!.text.trim().toLowerCase() === `:${drawer}:`.toLowerCase())
		if (existing) {
			const opening = entry.lines.find((line) => line.from === existing.from)!
			const closing = entry.lines.find((line) => line.end === existing.to && /^[ \t]*:END:[ \t]*$/i.test(line.text))!
			return insertAt(entry, source, cursor, entry.policy.reversed ? opening.end : closing.from, text)
		}
		return insertAt(entry, source, cursor, entry.insertion, `:${drawer}:${entry.eol}${text}:END:${entry.eol}`)
	}
	let insertion = entry.insertion
	if (!entry.policy.reversed) {
		// Existing list log records and their literal/fixedwidth continuation lines.
		for (const line of entry.body.filter((line) => line.from >= insertion)) {
			if (!/^(?:[ \t]*- (?:State |CLOSING NOTE |Rescheduled |Not scheduled, |New deadline |Removed deadline, |Refiled )|[ \t]+: )/.test(line.text)) break
			insertion = line.end
		}
	}
	return insertAt(entry, source, cursor, insertion, text)
}
const requireNote = (operation: OrgLoggingOperation, cursor: number, stamp: string, needsNote: boolean, note?: string): Exclude<OrgOperationLoggingPlan, { kind: "edit" } | { kind: "noop" }> | null => {
	if (!needsNote && note !== undefined) return rejected("unexpected-note")
	if (needsNote && note === undefined) return {
		kind: "needs-note",
		request: Object.freeze({ operation: Object.freeze({ ...operation }), cursor, stamp }),
	}
	if (needsNote && typeof note !== "string") return rejected("invalid-note")
	return null
}

/** Log edits only; the caller combines these with planning/move edits in one canonical transaction. */
export const planOrgOperationLogging = (source: string, headingFrom: number, stamp: unknown, operation: Exclude<OrgLoggingOperation, { kind: "todo" }>, note?: string, options: OrgLoggingPolicyOptions = {}): OrgOperationLoggingPlan => {
	const entry = loggingEntry(source, headingFrom, options)
	if (entry.kind !== "entry") return entry.kind === "noop" && note !== undefined ? rejected("unexpected-note") : entry
	if (entry.heading.from !== headingFrom) return rejected("invalid-policy-target")
	if (operation.kind !== "refile" && (!operation.previous || operation.previous === operation.next)) return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	const policy = entry.policy[operation.kind]
	if (policy === "none") return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	if (!validOrgLocalTimestamp(stamp)) return rejected("invalid-timestamp")
	if (operation.kind !== "refile") {
		const field = entry.planning?.fields.find((field) => field.kind === (operation.kind === "reschedule" ? "SCHEDULED" : "DEADLINE"))
		if (!field || source.slice(entry.planning!.line.from + field.dateFrom - 1, entry.planning!.line.from + field.to) !== operation.previous) return rejected("stale-planning-log")
	}
	const requirement = requireNote(operation, headingFrom, stamp, policy === "note", note)
	if (requirement) return requirement
	const prior = operation.kind === "refile" ? "" : operation.previous!.replace(/^</, "[").replace(/>$/, "]")
	const title = operation.kind === "refile" ? `Refiled on ${stamp}`
		: operation.kind === "reschedule" ? `${operation.next === null ? "Not scheduled, was" : "Rescheduled from"} ${JSON.stringify(prior)} on ${stamp}`
		: `${operation.next === null ? "Removed deadline, was" : "New deadline from"} ${JSON.stringify(prior)} on ${stamp}`
	const text = `- ${title}${entry.eol}${policy === "note" ? literalNote(note!, entry.eol) : ""}`
	return { kind: "edit", edits: [logEntryEdit(source, entry, headingFrom, text)] }
}

/** Plain protected inline objects must never contribute repeating timestamps. */
const literalInlineRanges = (text: string): { from: number; to: number }[] => [...text.matchAll(/(?:^|[\s(])([~=])(?=\S)[^\r\n]*?\S\1(?=$|[\s.,;:!?\)\]])|\bsrc_[\w+-]+(?:\[[^\]\r\n]*\])?\{[^}\r\n]*\}/g)]
	.map((match) => ({ from: match.index, to: match.index + match[0].length }))

/** Plans one atomic transition using original-source coordinates; no clock, I/O or second history. */
export const planOrgTodoTransition = (source: string, cursor: number, stamp: unknown, note?: string, options: OrgTodoRepeatOptions = {}): OrgTodoTransitionPlan => {
	if (!validOrgLocalTimestamp(stamp)) return rejected("invalid-timestamp")
	const entry = loggingEntry(source, cursor, options)
	if (entry.kind !== "entry") return entry.kind === "noop" && note !== undefined ? rejected("unexpected-note") : entry
	const { heading, body, planning, properties, policy, eol } = entry
	const keywords = parseOrgTodoKeywords(source)
	const states = new Set([...keywords.todo, ...keywords.done])
	const oldState = heading.text.replace(/^\*+[ \t]+/, "").split(/[ \t]/)[0]
	const previous = states.has(oldState) ? oldState : ""
	const requested = options.state ?? (options.finalCompletion ? keywords.done[0] : undefined)
	if (requested !== undefined && requested !== "" && !states.has(requested)) return rejected("invalid-todo-state")
	if (options.finalCompletion && (!requested || !keywords.done.includes(requested))) return rejected("invalid-final-state")
	if (requested === previous && !options.finalCompletion) return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	const prefix = /^\*+[ \t]+/.exec(heading.text)![0].length
	const from = heading.from + prefix
	const to = from + (previous ? previous.length + (requested === "" ? /^[ \t]*/.exec(heading.text.slice(prefix + previous.length))![0].length : 0) : 0)
	const insert = requested === undefined ? "" : requested + (!previous && requested ? " " : "")
	const edit = requested === undefined ? cycleEligibleOrgTodoAt(source, cursor) : {
		from, to, insert,
		cursor: cursor <= from ? cursor : cursor >= to ? cursor + insert.length - (to - from) : from + insert.length,
	}
	if (!edit) return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	const next = edit.insert.trim()
	const completing = keywords.done.includes(next)
	const newlyCompleted = completing && !keywords.done.includes(previous)
	const repeats: OrgTextEdit[] = []
	if (newlyCompleted || options.finalCompletion) {
		const live = new Set(entry.eligible.map((line) => line.from))
		if (properties) for (const line of body)
			if (line.from > properties.from && line.end < properties.to && /^[ \t]*:[^\s:]+:[ \t]/.test(line.text))
				live.add(line.from)
		for (const line of [heading, ...body]) {
			if (!live.has(line.from) || /^[ \t]*(?:#|:(?:[ \t]|$))/.test(line.text)) continue
			const literals = literalInlineRanges(line.text)
			for (const match of line.text.matchAll(/<[^<>\r\n]*>(?:--<[^<>\r\n]*>)?/g)) {
				if (!/^<\d{4}-\d{2}-\d{2}(?=[ \t>])/.test(match[0])) continue
				if (!/[ \t](?:\+\+?|\.\+)/.test(match[0])) continue
				if (literals.some((range) => match.index >= range.from && match.index < range.to)) continue
				if (options.finalCompletion) {
					const stored = readOrgStoredTimestamp(match[0])
					if (stored.kind === "error") return rejected("unsupported-repeater")
					const cancelled = match[0].replace(/([ \t](?:\+\+?|\.\+))\d+(?=[hdwmy])/g, (_cookie, prefix: string) => `${prefix}0`)
					if (cancelled !== match[0]) repeats.push({ cursor: edit.cursor, from: line.from + match.index, to: line.from + match.index + match[0].length, insert: cancelled })
					continue
				}
				const advanced = advanceOrgRepeatingTimestamp(match[0], stamp)
				if (advanced.kind === "rejected") return advanced
				if (advanced.kind === "repeat") repeats.push({ cursor: edit.cursor, from: line.from + match.index, to: line.from + match.index + match[0].length, insert: advanced.timestamp })
			}
		}
	}
	const repeating = repeats.length > 0 && !options.finalCompletion
	const incoming = policy.states.find((state) => state.state === next)?.incoming
	const outgoing = policy.states.find((state) => state.state === previous)?.outgoing
	// Incoming logging takes precedence over outgoing logging, even when outgoing asks for a note.
	const transitionLog = next ? incoming || outgoing || "" : ""
	const needsNote = transitionLog === "@" || (newlyCompleted && !transitionLog && policy.done === "note") || (repeating && policy.repeat === "note")
	const logState = !!transitionLog || (repeating && policy.repeat !== "none" && policy.done !== "note")
	const logdone = newlyCompleted && !repeating && policy.done !== "none"
	const removeClosed = repeating || (!completing && keywords.done.includes(previous))
	const edits: OrgTextEdit[] = []
	const push = (from: number, to: number, insert: string) => edits.push({ cursor: edit.cursor, from, to, insert })
	let resetState = next
	if (repeating) {
		const preference = options.repeatToState ?? options.logging?.repeatToState
		const configuredReset = policy.repeatToState ?? (preference === true ? previous : typeof preference === "string" ? preference : null)
		const sequence = entry.eligible.filter((line) => /^#\+(?:TODO|SEQ_TODO|TYP_TODO):/i.test(line.text))
			.map((line) => ({
				type: /^#\+TYP_TODO:/i.test(line.text),
				tokens: line.text.replace(/^#\+(?:TODO|SEQ_TODO|TYP_TODO):[ \t]*/i, "").trim().split(/[ \t]+/).map((token) => token.replace(/\([^)]*\)$/, "")),
			}))
			.find(({ tokens }) => tokens.includes(previous || next))
		resetState = configuredReset && states.has(configuredReset) ? configuredReset : (sequence?.type ? previous : sequence?.tokens[0]) || keywords.todo[0]
		if (!resetState || !states.has(resetState)) return rejected("invalid-repeat-state")
	}
	const stateInsert = repeating ? edit.insert.replace(next, resetState) : edit.insert
	const stateCursor = edit.cursor > edit.from ? Math.max(edit.from, edit.cursor + stateInsert.length - edit.insert.length) : edit.cursor
	edits.push({ ...edit, cursor: stateCursor, insert: stateInsert })
	if (planning) {
		const { line, fields } = planning
		const changes: { from: number; to: number; insert: string }[] = repeats.filter((change) => change.from >= line.from && change.to <= line.to).map((change) => ({ ...change, from: change.from - line.from, to: change.to - line.from }))
		const closed = fields.find((field) => field.kind === "CLOSED")
		if (closed) {
			const raw = line.text.slice(closed.from, closed.to)
			const match = /^CLOSED:([ \t]*)\[(\d{4}-\d{2}-\d{2})(?:([ \t]+)(Sun|Mon|Tue|Wed|Thu|Fri|Sat|(?:周|星期|礼拜)[一二三四五六日天]|[月火水木金土日]曜日))?(?:([ \t]+)(\d{1,2}:\d{2}))?\]$/u.exec(raw)
			const parsedClosed = match ? readOrgStoredTimestamp(raw.slice(raw.indexOf("["))) : null
			if (!match || parsedClosed?.kind !== "date") return rejected("malformed-closed")
			if (match[4] && weekdays.includes(match[4]) &&
				!validOrgLocalTimestamp(`[${match[2]} ${match[4]} ${match[6] ? match[6].padStart(5, "0") : "00:00"}]`))
				return rejected("malformed-closed")
			if (logdone) {
				const fresh = /^\[(\S+) (\S+) (\S+)\]$/.exec(stamp)!
				const weekday = match[4]?.match(/^(周|星期|礼拜)/u)
					? `${match[4].replace(/[一二三四五六日天]$/u, "")}${["日", "一", "二", "三", "四", "五", "六"][weekdays.indexOf(fresh[2])]}`
					: /曜日$/u.test(match[4] ?? "") ? `${["日", "月", "火", "水", "木", "金", "土"][weekdays.indexOf(fresh[2])]}曜日` : fresh[2]
				changes.push({ from: closed.from, to: closed.to, insert: `CLOSED:${match[1]}[${fresh[1]}${match[4] ? match[3] + weekday : ""}${match[6] ? match[5] + fresh[3] : ""}]` })
			}
		}
		const removed = fields.filter((field) => field.kind === "CLOSED" && removeClosed || field.kind === "SCHEDULED" && repeating && !repeats.some((change) => change.from >= line.from + field.from && change.to <= line.from + field.to))
		for (const field of removed) changes.push({ from: field.from, to: field.to, insert: "" })
		if (logdone && !closed) changes.push({ from: 0, to: 0, insert: `CLOSED: ${stamp} ` })
		// Remove the separator immediately following removed fields, otherwise the preceding separator.
		for (const change of changes.filter((change) => !change.insert)) {
			const after = /^[ \t]+/.exec(line.text.slice(change.to))
			if (after) change.to += after[0].length
			else while (change.from > 0 && /[ \t]/.test(line.text[change.from - 1])) change.from--
		}
		const merged: typeof changes = []
		for (const change of changes.sort((a, b) => a.from - b.from)) {
			const prior = merged.at(-1)
			if (prior && !prior.insert && !change.insert && prior.to >= change.from) prior.to = Math.max(prior.to, change.to)
			else merged.push(change)
		}
		let text = line.text
		for (const change of merged.reverse()) text = text.slice(0, change.from) + change.insert + text.slice(change.to)
		if (text !== line.text) push(line.from, text.trim() ? line.to : line.end, text.trim() ? text : "")
	}
	for (const change of repeats) if (!planning || change.from < planning.line.from || change.from >= planning.line.end) edits.push(change)
	if (!planning && logdone) edits.push(insertAt(entry, source, edit.cursor, heading.end, `CLOSED: ${stamp}${eol}`))
	if (repeating) {
		const live = new Set(entry.eligible.map((line) => line.from))
		const blocks = eligibleOrgBlockRanges(source, states)
		const clock = body.some((line) => {
			if (!/^[ \t]*CLOCK:/.test(line.text) || blocks.some((range) => line.from >= range.from && line.from < range.to)) return false
			if (!live.has(line.from) && !entry.drawers.some((range) =>
				line.from > range.from && line.end < range.to &&
				(entry.lines.find((opening) => opening.from === range.from)!.text.trim().toUpperCase() === ":LOGBOOK:" ||
					entry.lines.find((opening) => opening.from === range.from)!.text.trim().toLowerCase() === `:${policy.drawer}:`.toLowerCase()))) return false
			// Reuse the structural clock row parser without letting an unrelated
			// malformed CLOCK-like line hide a genuine row in this entry.
			const parsed = parseOrgClocks(`* clock${eol}${line.text}${eol}`)
			return parsed.kind === "snapshot" && parsed.rows.length === 1
		})
		if (policy.repeat !== "none" || clock) {
			if (properties) {
				const lastRepeat = entry.lines.filter((line) => line.from > properties.from && line.from < properties.to && /^[ \t]*:LAST_REPEAT:/i.test(line.text))
				if (lastRepeat.length > 1) return rejected("ambiguous-last-repeat")
				if (lastRepeat[0]) {
					const match = /^([ \t]*:LAST_REPEAT:[ \t]*)(.*)$/i.exec(lastRepeat[0].text)!
					const trailing = /[ \t]*$/.exec(match[2])![0]
					push(lastRepeat[0].from + match[1].length, lastRepeat[0].to - trailing.length, `${/[ \t]$/.test(match[1]) ? "" : " "}${stamp}`)
				} else {
					const close = entry.lines.find((line) => line.end === properties.to && /^[ \t]*:END:[ \t]*$/i.test(line.text))!
					push(close.from, close.from, `:LAST_REPEAT: ${stamp}${eol}`)
				}
			} else edits.push(insertAt(entry, source, edit.cursor, planning?.line.end ?? heading.end, `:PROPERTIES:${eol}:LAST_REPEAT: ${stamp}${eol}:END:${eol}`))
		}
	}
	const requirement = requireNote({ kind: "todo" }, cursor, stamp, needsNote, note)
	if (requirement) return requirement
	if (logState || needsNote) {
		const title = logState ? `State ${JSON.stringify(next)}${" ".repeat(Math.max(1, 12 - next.length))}from ${JSON.stringify(previous)} ${stamp}` : `CLOSING NOTE ${stamp}`
		edits.push(logEntryEdit(source, entry, edit.cursor, `- ${title}${eol}${needsNote ? literalNote(note!, eol) : ""}`))
	}
	return { done: keywords.done.includes(resetState), edits: atomicEdits(edits), kind: "edit" }
}
