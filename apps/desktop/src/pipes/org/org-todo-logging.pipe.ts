import { resolveOrgLoggingPolicy } from "./org-logging-policy.pipe"
import { parseOrgPlanningLine } from "./org-planning-line.pipe"
import {
	cycleEligibleOrgTodoAt,
	eligibleOrgSourceLines,
	type OrgTextEdit,
	eligibleOrgBlockRanges,
	eligibleOrgDrawerRanges,
	parseOrgTodoKeywords,
	validOrgDate,
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
			end: match.index + match[0].length,
			from: match.index,
			text: match[1],
			to: match.index + match[1].length,
		})
		if (!match[0]) break
	}
	return lines
}
const rejected = (reason: string): OrgTodoTransitionPlan => ({ kind: "rejected", reason })
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
	if (!eligible.some((line) => line.from === heading.from)) {
		// An unclosed drawer cannot lend policy to a heading-looking line it swallowed.
		if (
			eligibleOrgDrawerRanges(source, states).some(
				(range) => !range.closed && heading.from >= range.from && heading.from < range.to,
			)
		)
			return rejected("malformed-drawer")
		return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	}
	const resolved = resolveOrgLoggingPolicy(source, { from: heading.from })
	if (resolved.kind === "rejected") return resolved
	const { states: logging, done: donePolicy, drawer } = resolved.policy
	const edit = cycleEligibleOrgTodoAt(source, cursor)
	if (!edit) return note === undefined ? { kind: "noop" } : rejected("unexpected-note")
	const oldState = heading.text.replace(/^\*+[ \t]+/, "").split(/[ \t]/)[0]
	const previous = states.has(oldState) ? oldState : ""
	const next = edit.insert.trim()
	const done = keywords.done.includes(next)
	const incoming = logging.find((state) => state.state === next)?.incoming
	const outgoing = logging.find((state) => state.state === previous)?.outgoing
	const needsNote = incoming === "@" || outgoing === "@" || (done && donePolicy === "note")
	const logState = needsNote || incoming === "!" || outgoing === "!"
	const removeClosed = !done && keywords.done.includes(previous)
	const logdone = donePolicy === "time" || donePolicy === "note"
	const index = lines.indexOf(heading)
	const following = lines.slice(index + 1)
	const blocks = eligibleOrgBlockRanges(source, states)
	const inBlock = (position: number) =>
		blocks.some((range) => position >= range.from && position < range.to)
	const allDrawers = eligibleOrgDrawerRanges(source, states)
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
		edits.push({ cursor: edit.cursor, from, insert, to })
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
	return { done, edits: atomic, kind: "edit" }
}
