import { parseOrgPlanningLine } from "./org-planning-line.pipe"
import {
	cycleOrgTodoAt,
	validOrgDate,
	structuralOrgSourceLines,
	eligibleOrgSourceLines,
	orgBlockRanges,
	orgDrawerRanges,
	parseOrgTodoKeywords,
	type OrgTextEdit,
} from "./org-text.pipe"

export type OrgTodoTransitionPlan =
	| { readonly kind: "edit"; readonly edits: OrgTextEdit[]; readonly done: boolean }
	| { readonly kind: "noop" }
	| { readonly kind: "needs-note" }
	| { readonly kind: "rejected"; readonly reason: string }

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** An explicitly supplied, inactive, minute-resolution local Org timestamp. */
export const validOrgLocalTimestamp = (stamp: unknown): stamp is string => {
	if (typeof stamp !== "string") return false
	const match = /^\[(\d{4})-(\d{2})-(\d{2}) (Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d{2}):(\d{2})\]$/.exec(
		stamp,
	)
	if (!match) return false
	const [, y, m, d, weekday, h, minute] = match
	const year = Number(y),
		month = Number(m),
		day = Number(d)
	const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
	const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	if (
		year < 1 ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > days[month - 1] ||
		Number(h) > 23 ||
		Number(minute) > 59
	)
		return false
	// Gregorian weekday arithmetic, independent of timezone and Date rollover.
	const priorYear = month < 3 ? year - 1 : year
	const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
	const index =
		(priorYear +
			Math.floor(priorYear / 4) -
			Math.floor(priorYear / 100) +
			Math.floor(priorYear / 400) +
			offsets[month - 1] +
			day) %
		7
	return weekdays[index] === weekday
}

/** Boundary helper: the caller owns obtaining the current local time. */
export const formatOrgLocalTimestamp = (date: Date): string => {
	const pad = (value: number) => String(value).padStart(2, "0")
	const stamp = `[${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${weekdays[date.getDay()]} ${pad(date.getHours())}:${pad(date.getMinutes())}]`
	if (!validOrgLocalTimestamp(stamp)) throw new Error("Invalid local Org timestamp")
	return stamp
}

interface Line {
	from: number
	to: number
	end: number
	text: string
}
const linesOf = (source: string): Line[] => {
	const lines: Line[] = []
	const pattern = /([^\r\n]*)(\r\n|\r|\n|$)/g
	for (const match of source.matchAll(pattern)) {
		lines.push({
			from: match.index,
			to: match.index + match[1].length,
			end: match.index + match[0].length,
			text: match[1],
		})
		if (!match[0]) break
	}
	return lines
}
const rejected = (reason: string): OrgTodoTransitionPlan => ({ kind: "rejected", reason })
interface Logging {
	incoming: string
	outgoing: string
}
const parseDrawerName = (value: string): string | null | undefined => {
	const name = value.trim().replace(/^"([^"\r\n]*)"$/, "$1")
	if (/^nil$/i.test(name)) return null
	if (/^t$/i.test(name)) return "LOGBOOK"
	return /^[A-Za-z][A-Za-z0-9_-]*$/.test(name) && !/^(END|PROPERTIES)$/i.test(name)
		? name
		: undefined
}

/**
 * Literal fixedwidth lines containing JSON strings. Decoding each line after
 * `  : ` with JSON.parse and concatenating recovers the exact note, including
 * NUL, Unicode, trailing whitespace and mixed original newline separators.
 * Neither note text nor its separators can become Org structural source.
 */
const literalNote = (note: string, eol: string): string =>
	linesOf(note)
		.filter((line) => line.end > line.from)
		.map((line) => `  : ${JSON.stringify(note.slice(line.from, line.end))}${eol}`)
		.join("")

/** Plans one atomic transition using only original-source coordinates. No clock or I/O. */
export const planOrgTodoTransition = (
	source: string,
	cursor: number,
	stamp: unknown,
	note?: string,
): OrgTodoTransitionPlan => {
	if (!validOrgLocalTimestamp(stamp)) return rejected("invalid-timestamp")
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length)
		return rejected("invalid-cursor")
	const lines = linesOf(source)
	const heading = lines.findLast((line) => line.from <= cursor)
	if (!heading || !/^\*+[ \t]+/.test(heading.text))
		return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	const keywords = parseOrgTodoKeywords(source)
	const states = new Set([...keywords.todo, ...keywords.done])
	const eligible = eligibleOrgSourceLines(source, states)
	if (!eligible.some((line) => line.from === heading.from))
		return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	const logging = new Map<string, Logging>()
	let donePolicy: "none" | "time" | "note" = "none"
	let drawer: string | null = null
	let drawerSpecified = false
	for (const line of eligible) {
		// Inherited/LOGGING override semantics need a note-aware policy UI.
		// Recognized policies must never silently fall back to an unlogged cycle.
		if (/^#\+PROPERTY:[ \t]+LOGGING(?:\+)?(?:[ \t]|$)/i.test(line.text))
			return rejected("unsupported-logging-policy")
		if (/^#\+(?:TODO|SEQ_TODO):/i.test(line.text)) {
			const value = line.text.replace(/^#\+(?:TODO|SEQ_TODO):[ \t]*/i, "").trim()
			const tokens = value.split(/[ \t]+/)
			if (
				!value ||
				tokens.filter((token) => token === "|").length > 1 ||
				tokens[0] === "|" ||
				tokens.at(-1) === "|"
			)
				return rejected("malformed-todo-directive")
			for (const token of tokens.filter((token) => token !== "|")) {
				const match = /^([^\s()|!@/"\\]+)(?:\(([^\s()!@/]?)([!@]?)(?:\/([!@]))?\))?$/.exec(token)
				if (!match || logging.has(match[1])) return rejected("ambiguous-todo-directive")
				logging.set(match[1], { incoming: match[3] ?? "", outgoing: match[4] ?? "" })
			}
		}
		if (/^#\+STARTUP:/i.test(line.text)) {
			for (const option of line.text
				.replace(/^#\+STARTUP:/i, "")
				.trim()
				.toLowerCase()
				.split(/[ \t]+/)) {
				if (option === "logdone") donePolicy = "time"
				if (option === "nologdone") donePolicy = "none"
				if (option === "lognotedone") donePolicy = "note"
				if (!drawerSpecified && option === "logdrawer") drawer = "LOGBOOK"
				if (!drawerSpecified && option === "nologdrawer") drawer = null
			}
		}
		if (
			/^#\+LOG_INTO_DRAWER:/i.test(line.text) ||
			/^#\+PROPERTY:[ \t]+LOG_INTO_DRAWER(?:[ \t]|$)/i.test(line.text)
		) {
			if (drawerSpecified) return rejected("ambiguous-log-drawer-directive")
			drawerSpecified = true
			const name = parseDrawerName(
				line.text.replace(
					/^#\+(?:LOG_INTO_DRAWER:[ \t]*|PROPERTY:[ \t]+LOG_INTO_DRAWER[ \t]*)/i,
					"",
				),
			)
			if (name === undefined) return rejected("unsafe-log-drawer")
			drawer = name
		}
	}
	if (
		logging.size &&
		(logging.size !== states.size || [...logging.keys()].some((state) => !states.has(state)))
	)
		return rejected("ambiguous-todo-scope")
	const structuralHeadings = structuralOrgSourceLines(source).filter((line) =>
		/^\*+[ \t]+/.test(line.text),
	)
	// Only the target and its actual ancestor chain can supply local policy.
	const ancestors: typeof structuralHeadings = []
	for (const candidate of structuralHeadings) {
		if (candidate.from > heading.from) break
		const level = candidate.text.match(/^\*+/)![0].length
		while (ancestors.length && ancestors.at(-1)!.text.match(/^\*+/)![0].length >= level)
			ancestors.pop()
		ancestors.push(candidate)
	}
	const applicable = new Set(ancestors.map((line) => line.from))
	if (
		lines.some(
			(line) =>
				/^[ \t]*:LOGGING(?:\+)?:/i.test(line.text) &&
				applicable.has(
					structuralHeadings.findLast((owner) => owner.from < line.from)?.from ?? -1,
				) &&
				orgDrawerRanges(source).some(
					(range) =>
						line.from > range.from &&
						line.from < range.to &&
						/^[ \t]*:PROPERTIES:[ \t]*$/i.test(
							lines.find((candidate) => candidate.from === range.from)?.text ?? "",
						),
				),
		)
	)
		return rejected("unsupported-logging-policy")
	const edit = cycleOrgTodoAt(source, cursor)
	if (!edit) return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	const oldState = heading.text.replace(/^\*+[ \t]+/, "").split(/[ \t]/)[0]
	const previous = states.has(oldState) ? oldState : ""
	const next = edit.insert.trim()
	const done = keywords.done.includes(next)
	const incoming = logging.get(next)?.incoming
	const outgoing = logging.get(previous)?.outgoing
	const needsNote = incoming === "@" || outgoing === "@" || (done && donePolicy === "note")
	const logState = needsNote || incoming === "!" || outgoing === "!"
	const removeClosed = !done && keywords.done.includes(previous)
	const logdone = donePolicy === "time" || donePolicy === "note"
	const index = lines.indexOf(heading)
	const following = lines.slice(index + 1)
	const blocks = orgBlockRanges(source)
	const inBlock = (position: number) =>
		blocks.some((range) => position >= range.from && position < range.to)
	const allDrawers = orgDrawerRanges(source)
	const boundary = following.findIndex(
		(line) =>
			/^\*+[ \t]+/.test(line.text) &&
			!inBlock(line.from) &&
			!allDrawers.some((range) => range.closed && line.from >= range.from && line.from < range.to),
	)
	const body = boundary < 0 ? following : following.slice(0, boundary)
	const bodyEnd = boundary < 0 ? source.length : following[boundary].from
	const drawers = allDrawers.filter((range) => range.from >= heading.end && range.from < bodyEnd)
	if (drawers.some((range) => !range.closed || range.to > bodyEnd))
		return rejected("malformed-drawer")
	if (blocks.some((range) => range.from >= heading.end && range.from < bodyEnd && !range.closed))
		return rejected("malformed-block")
	if (
		body.some(
			(line) =>
				!inBlock(line.from) &&
				/^[ \t]*:END:[ \t]*$/i.test(line.text) &&
				!drawers.some((range) => line.from >= range.from && line.from < range.to),
		)
	)
		return rejected("unmatched-drawer-end")
	const drawerNames = drawers.map((range) =>
		lines
			.find((line) => line.from === range.from)!
			.text.trim()
			.toUpperCase(),
	)
	if (new Set(drawerNames).size !== drawerNames.length) return rejected("duplicate-drawer")
	for (const range of drawers) {
		const propertyDrawer = /^[ \t]*:PROPERTIES:[ \t]*$/i.test(
			lines.find((line) => line.from === range.from)!.text,
		)
		const interior = lines.filter((line) => line.from > range.from && line.from < range.to)
		if (
			propertyDrawer &&
			interior.some(
				(line) =>
					!/^[ \t]*:END:[ \t]*$/i.test(line.text) &&
					!/^[ \t]*:[^\s:]+:(?:[ \t].*)?$/.test(line.text),
			)
		)
			return rejected("malformed-properties")
		if (
			interior.some(
				(line) =>
					/^\*+[ \t]+/.test(line.text) ||
					(/^[ \t]*:[\w-]+:[ \t]*$/.test(line.text) &&
						!/^[ \t]*:END:[ \t]*$/i.test(line.text) &&
						(!propertyDrawer || /^[ \t]*:(?:PROPERTIES|LOGBOOK):[ \t]*$/i.test(line.text))),
			)
		)
			return rejected("nested-drawer")
	}
	const planning = body
		.filter(
			(line) =>
				!inBlock(line.from) &&
				!drawers.some((range) => line.from >= range.from && line.from < range.to),
		)
		.map((line) => ({ line, parsed: parseOrgPlanningLine(line.text) }))
		.filter((item) => item.parsed.kind !== "none")
	if (planning.length > 1 || planning.some((item) => item.parsed.kind === "invalid"))
		return rejected("ambiguous-planning")
	const planningItem = planning[0]
	if (planningItem && planningItem.line !== body[0]) return rejected("misplaced-planning")
	const eol = source.slice(heading.to, heading.end) || source.match(/\r\n|\r|\n/)?.[0] || "\n"
	const edits: OrgTextEdit[] = [edit]
	const push = (from: number, to: number, insert: string) =>
		edits.push({ from, to, insert, cursor: edit.cursor })
	let insertion = heading.end
	if (planningItem?.parsed.kind === "planning") {
		const { line, parsed } = planningItem
		const closed = parsed.fields.find((field) => field.kind === "CLOSED")
		let replacement: string | undefined
		if (closed) {
			const raw = line.text.slice(closed.from, closed.to)
			const match =
				/^CLOSED:([ \t]*)\[(\d{4}-\d{2}-\d{2})(?:([ \t]+)(Sun|Mon|Tue|Wed|Thu|Fri|Sat))?(?:([ \t]+)(\d{2}:\d{2}))?\]$/.exec(
					raw,
				)
			if (!match || !validOrgDate(match[2])) return rejected("malformed-closed")
			const weekday = match[4] ?? weekdays[new Date(`${match[2]}T12:00:00Z`).getUTCDay()]
			if (!validOrgLocalTimestamp(`[${match[2]} ${weekday} ${match[6] ?? "00:00"}]`))
				return rejected("malformed-closed")
			const fresh = /^\[(\S+) (\S+) (\S+)\]$/.exec(stamp)!
			replacement = `CLOSED:${match[1]}[${fresh[1]}${match[4] ? match[3] + fresh[2] : ""}${match[6] ? match[5] + fresh[3] : ""}]`
		}
		if (done && logdone) {
			if (closed) push(line.from + closed.from, line.from + closed.to, replacement!)
			else push(line.from, line.from, `CLOSED: ${stamp} `)
		} else if (removeClosed && closed) {
			let from = closed.from,
				to = closed.to
			if (!line.text.slice(0, from).trim() && !line.text.slice(to).trim())
				push(line.from, line.end, "")
			else {
				if (/^[ \t]/.test(line.text.slice(to))) to += /^[ \t]+/.exec(line.text.slice(to))![0].length
				else while (from > 0 && /[ \t]/.test(line.text[from - 1])) from--
				push(line.from + from, line.from + to, "")
			}
		}
		insertion = line.end
	}
	const properties = drawers.filter((range) =>
		/^[ \t]*:PROPERTIES:[ \t]*$/i.test(lines.find((line) => line.from === range.from)!.text),
	)
	if (properties.length > 1) return rejected("ambiguous-properties")
	if (properties[0]) {
		if (properties[0].from !== insertion) return rejected("misplaced-properties")
		insertion = properties[0].to
		const overrides = lines.filter(
			(line) =>
				line.from > properties[0].from &&
				line.from < properties[0].to &&
				/^[ \t]*:LOG_INTO_DRAWER:/i.test(line.text),
		)
		if (overrides.length > 1) return rejected("ambiguous-log-drawer-property")
		if (overrides[0]) {
			const name = parseDrawerName(overrides[0].text.replace(/^[ \t]*:LOG_INTO_DRAWER:[ \t]*/i, ""))
			if (name === undefined) return rejected("unsafe-log-drawer")
			drawer = name
		}
	}
	// Preparation validates the same source and policies as submission, but never
	// publishes partial edits or accepts a note for an unrelated transition.
	if (!needsNote && note !== undefined) return rejected("unexpected-note")
	if (needsNote && note === undefined) return { kind: "needs-note" }
	if (needsNote && (typeof note !== "string" || !note.trim())) return rejected("invalid-note")
	const entry = `- State ${JSON.stringify(next)}${" ".repeat(Math.max(1, 12 - next.length))}from ${JSON.stringify(previous)} ${stamp}${eol}${needsNote ? literalNote(note!, eol) : ""}`
	let append = ""
	if (!planningItem && done && logdone) {
		if (insertion === heading.end) append += `CLOSED: ${stamp}${eol}`
		else push(heading.end, heading.end, `CLOSED: ${stamp}${eol}`)
	}
	if (logState) {
		if (drawer) {
			const matches = drawers.filter(
				(range) =>
					lines
						.find((line) => line.from === range.from)!
						.text.trim()
						.toLowerCase() === `:${drawer}:`.toLowerCase(),
			)
			if (matches.length > 1) return rejected("ambiguous-log-drawer")
			if (matches[0]) {
				const closing = lines.find(
					(line) => line.end === matches[0].to && /^[ \t]*:END:[ \t]*$/i.test(line.text),
				)!
				push(closing.from, closing.from, entry)
			} else append += `:${drawer}:${eol}${entry}:END:${eol}`
		} else append += entry
	}
	if (append)
		push(
			insertion,
			insertion,
			`${insertion > 0 && !/[\r\n]/.test(source[insertion - 1]) ? eol : ""}${append}`,
		)
	const sorted = edits.sort((a, b) => a.from - b.from)
	const atomic: OrgTextEdit[] = []
	for (const change of sorted) {
		const prior = atomic.at(-1)
		if (prior && prior.from === change.from && prior.to === prior.from && change.to === change.from)
			atomic[atomic.length - 1] = { ...prior, insert: prior.insert + change.insert }
		else atomic.push(change)
	}
	return { kind: "edit", edits: atomic, done }
}
