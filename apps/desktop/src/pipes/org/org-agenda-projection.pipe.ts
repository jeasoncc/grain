import type { AnchoredOrgAgendaEntry, OrgAgendaEntry } from "./org-agenda.pipe"
import type { OrgAgendaViewConfiguration } from "./org-agenda-configuration.pipe"
import { isOrgCalendarISO, shiftOrgCalendarDate, shiftOrgLocalDateTime, type OrgDateContext, type OrgTimestampValue } from "./org-date-reader.pipe"

const MONTH_START_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] as const

/** Pure proleptic Gregorian ordinal, matching Emacs calendar absolute days. */
function absoluteDay(date: string): number {
	const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7)), day = Number(date.slice(8, 10)), previous = year - 1
	return 365 * previous + Math.floor(previous / 4) - Math.floor(previous / 100) + Math.floor(previous / 400) + MONTH_START_DAYS[month - 1] + day + (month > 2 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 1 : 0)
}
/** org-closest-date: repeater modes affect completion, not occurrence calendars. */
export function closestOrgAgendaRepeat(stamp: OrgTimestampValue, day: string, prefer: "past" | "future"): string | null {
	const repeat = stamp.repeater
	if (!repeat || repeat.value === 0 || day <= stamp.date) return stamp.date
	const delta = absoluteDay(day) - absoluteDay(stamp.date)
	let before: string | null, after: string | null
	if (repeat.unit === "h") {
		const hour = Number(stamp.time?.slice(0, 2) ?? 0)
		const missing = ((24 * delta - hour) % repeat.value + repeat.value) % repeat.value
		before = shiftOrgCalendarDate(day, missing === 0 ? 0 : -(1 + Math.floor(missing / 24)), "d")
		after = shiftOrgCalendarDate(day, Math.floor((repeat.value - missing) / 24), "d")
	} else if (repeat.unit === "d" || repeat.unit === "w") {
		const interval = repeat.value * (repeat.unit === "w" ? 7 : 1)
		const offset = Math.floor(delta / interval) * interval
		before = shiftOrgCalendarDate(stamp.date, offset, "d")
		after = shiftOrgCalendarDate(stamp.date, offset + interval, "d")
	} else {
		const year = Number(day.slice(0, 4)), month = Number(day.slice(5, 7)), date = Number(day.slice(8, 10))
		const baseYear = Number(stamp.date.slice(0, 4)), baseMonth = Number(stamp.date.slice(5, 7)), baseDay = Number(stamp.date.slice(8, 10))
		const completed = repeat.unit === "m" ? 12 * (year - baseYear) + month - baseMonth - (date > baseDay ? 0 : 1) : year - baseYear - (month > baseMonth || month === baseMonth && date > baseDay ? 0 : 1)
		const offset = Math.trunc(completed / repeat.value) * repeat.value
		before = shiftOrgLocalDateTime(stamp.date, stamp.time ?? "00:00", offset, repeat.unit)?.date ?? null
		after = shiftOrgLocalDateTime(stamp.date, stamp.time ?? "00:00", offset + repeat.value, repeat.unit)?.date ?? null
	}
	return prefer === "past" ? after === day ? after : before : before === day ? before : after
}

export const ORG_AGENDA_MAX_PROJECTED_ROWS = 100_000
/** Bounds work by the explicit span, not by the age or length of a timestamp/repeater. */
export function projectOrgAgendaEntries(
	entries: readonly AnchoredOrgAgendaEntry[],
	view: OrgAgendaViewConfiguration | null,
	calendar?: OrgDateContext,
	matchedHeadingStarts?: ReadonlySet<number>,
): readonly AnchoredOrgAgendaEntry[] {
	if (!view) return Object.freeze(entries.filter(entry => entry.kind !== "todo"))
	if (!calendar || !isOrgCalendarISO(calendar.today)) throw new Error("Agenda projection requires an explicitly captured valid calendar.")
	const todoStates = Array.isArray(view.todo) ? new Set(view.todo) : null
	const files = view.files === null ? null : new Set(view.files)
	if (view.match !== null && !matchedHeadingStarts) throw new Error("Agenda match projection requires prepared Source/native match context.")
	const matches = (entry: AnchoredOrgAgendaEntry) =>
		(!files || files.has(entry.relativePath)) &&
		(view.todo === null || view.todo === "pending" ? view.todo === null || entry.pending === true : entry.todo !== null && todoStates!.has(entry.todo)) &&
		(!matchedHeadingStarts || entry.origin.heading !== null && matchedHeadingStarts.has(entry.origin.heading.from))
	if (view.mode !== "dates") return Object.freeze(entries.filter(entry => entry.kind === "todo" && matches(entry)))
	const window = view.window
	if (!window || !Number.isSafeInteger(window.span) || window.span < 1 || window.span > 366) throw new Error("Agenda requires a bounded 1–366 day window.")
	const offset = /^today([+-]\d+)d$/.exec(window.start)
	const start = window.start === "today" ? calendar.today : offset ? shiftOrgCalendarDate(calendar.today, Number(offset[1]), "d") : window.start
	const end = start && shiftOrgCalendarDate(start, window.span - 1, "d")
	if (!start || !end) throw new Error("Agenda window exceeds Gregorian calendar bounds.")
	const days: string[] = []
	for (let n = 0; n < window.span; n += 1) days.push(shiftOrgCalendarDate(start, n, "d")!)
	const rows: AnchoredOrgAgendaEntry[] = []
	const warningUnitDays = { h: 0.041667, d: 1, w: 7, m: 30.4, y: 365.25 }
	for (const entry of entries) {
		if (entry.kind === "todo" || !entry.date || !matches(entry)) continue
		const stamp = entry.timestampValue ?? { date: entry.date }
		const done = entry.todo !== null && entry.pending === false
		const delay = entry.kind === "scheduled" && stamp.warning ? Math.floor(stamp.warning.value * warningUnitDays[stamp.warning.unit]) : 0
		const sourceDay = absoluteDay(stamp.date)
		for (const day of days) {
			let occurrence: OrgAgendaEntry["occurrence"] | null = null
			if (stamp.endDate) {
				if (day >= stamp.date && day <= stamp.endDate) occurrence = day === stamp.date ? "source" : "range"
			} else {
				const repeatDay = stamp.repeater && (!done || entry.kind === "timestamp") && (entry.kind === "timestamp" || day > calendar.today) ? closestOrgAgendaRepeat(stamp, day, day > calendar.today ? "future" : "past") : null
				if (day === stamp.date) occurrence = "source"
				else if (repeatDay === day) occurrence = "repeat"
			}
			const elapsed = absoluteDay(day) - sourceDay
			if (entry.kind === "scheduled" && delay > 0 && elapsed < delay) occurrence = null
			if (!occurrence && !done && day === calendar.today) {
				if (view.overdue && elapsed > 0 && (entry.kind === "scheduled" || entry.kind === "deadline") && (entry.kind !== "scheduled" || elapsed >= delay)) occurrence = entry.kind === "scheduled" ? "overdue" : "expired"
				else if (entry.kind === "deadline" && view.deadlineWarningDays !== null && elapsed < 0) {
					const warningDays = view.deadlineWarningDays === 0 ? 0 : stamp.warning ? Math.floor(stamp.warning.value * warningUnitDays[stamp.warning.unit]) : view.deadlineWarningDays
					if (-elapsed <= warningDays) occurrence = "warning"
				}
			}
			if (!occurrence) continue
			if (rows.length === ORG_AGENDA_MAX_PROJECTED_ROWS) throw new Error(`Agenda projection exceeds ${ORG_AGENDA_MAX_PROJECTED_ROWS} rows; narrow the view.`)
			rows.push(Object.freeze({ ...entry, date: day, occurrence }))
		}
	}
	return Object.freeze(rows)
}
