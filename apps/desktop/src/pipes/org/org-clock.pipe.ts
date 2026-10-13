import { isOrgCalendarISO, orgCalendarMonthDays, readOrgStoredTimestamp } from "./org-date-reader.pipe"
import { resolveOrgLoggingPolicy, type OrgLoggingPolicy } from "./org-logging-policy.pipe"
import { parseOrgPlanningLine } from "./org-planning-line.pipe"
import { validOrgLocalTimestamp } from "./org-todo-logging.pipe"
import {
	eligibleOrgBlockRanges,
	eligibleOrgDrawerRanges,
	eligibleOrgSourceLines,
	parseOrgTodoKeywords,
	structuralOrgSourceLines,
	type OrgBlockRange,
	type OrgTextEditBatch,
	type RawOrgLine,
} from "./org-text.pipe"

export type OrgClockOperation = "clock-in" | "clock-out" | "cancel-clock"
export interface OrgClockIdentity {
	readonly from: number
	readonly start: string
}
export interface OrgClockContext {
	/** Explicit inactive local time; the caller, not this pipe, obtains now. */
	readonly stamp: string
	/** Whole elapsed epoch minutes, only for the exactly identified live row. */
	readonly elapsedMinutes?: number
	readonly expectedActiveClock?: OrgClockIdentity
}
export interface OrgClockHeading {
	readonly from: number
	readonly to: number
	readonly bodyFrom: number
	readonly bodyTo: number
	readonly subtreeTo: number
	readonly level: number
	readonly title: string
	readonly parentFrom: number | null
}
export interface OrgClockRow extends OrgClockIdentity {
	/** Whole row content and its separately retained line break, in raw source coordinates. */
	readonly to: number
	readonly breakTo: number
	readonly headingFrom: number
	readonly end: string | null
	/** Recorded completed duration is authoritative; open clocks have no duration. */
	readonly elapsedMinutes: number | null
}
export type OrgActiveClock = OrgClockRow & { readonly end: null; readonly elapsedMinutes: null }
export interface OrgClockSnapshot {
	readonly kind: "snapshot"
	readonly headings: readonly OrgClockHeading[]
	readonly rows: readonly OrgClockRow[]
	readonly active: OrgActiveClock | null
}
export interface OrgClockRejection {
	readonly kind: "rejected"
	readonly message: string
}
export type OrgClockEditPlan =
	| { readonly kind: "edit"; readonly batch: OrgTextEditBatch }
	| { readonly kind: "unchanged" }
	| OrgClockRejection

const reject = (message: string): OrgClockRejection => ({ kind: "rejected", message })
const linesOf = (source: string, offset = 0): RawOrgLine[] => [...source.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g)]
	.map((match) => ({ from: offset + match.index, contentTo: offset + match.index + match[1].length,
		breakTo: offset + match.index + match[0].length, text: match[1] }))
const clockLike = (text: string): boolean => /^[ \t]*CLOCK(?:[ \t]*:|[ \t]+|$)/i.test(text)

/** Stored rows accept minute-resolution inactive dates with an optional English weekday.
 * No repeaters, warnings, zones, active stamps, annotations or inferred time are accepted.
 */
const clockStamp = (stamp: string): { date: string; time: string } | null => {
	const match = /^\[(\d{4}-\d{2}-\d{2})(?:[ \t]+(Sun|Mon|Tue|Wed|Thu|Fri|Sat))?[ \t]+([0-2]\d:[0-5]\d)\]$/.exec(stamp)
	if (!match) return null
	const parsed = readOrgStoredTimestamp(stamp)
	if (parsed.kind !== "date" || !parsed.timestamp?.time) return null
	if (match[2] && !validOrgLocalTimestamp(`[${match[1]} ${match[2]} ${match[3]}]`)) return null
	return { date: parsed.date, time: parsed.timestamp.time }
}

/** Gregorian civil minutes: every local date has exactly 1440 minutes. This is
 * deliberately NOT epoch elapsed time, and cannot infer DST from unzoned text.
 */
const civilMinutes = (stamp: string): number | null => {
	const parsed = clockStamp(stamp)
	if (!parsed) return null
	const year = Number(parsed.date.slice(0, 4)), month = Number(parsed.date.slice(5, 7))
	const prior = year - 1
	let days = prior * 365 + Math.floor(prior / 4) - Math.floor(prior / 100) + Math.floor(prior / 400)
	days += Number(parsed.date.slice(8, 10)) - 1
	for (let m = 1; m < month; m++) days += orgCalendarMonthDays(year, m)
	return days * 1440 + Number(parsed.time.slice(0, 2)) * 60 + Number(parsed.time.slice(3))
}

interface ClockDrawer {
	readonly range: OrgBlockRange
	readonly name: string
	readonly lines: readonly RawOrgLine[]
	readonly headingFrom: number | null
}
interface ClockDocument extends OrgClockSnapshot {
	readonly eligible: readonly RawOrgLine[]
	readonly drawers: readonly ClockDrawer[]
	readonly policies: ReadonlyMap<number, OrgLoggingPolicy>
}

const scanClocks = (source: string): ClockDocument | OrgClockRejection => {
	const keywords = parseOrgTodoKeywords(source)
	const states = new Set([...keywords.todo, ...keywords.done])
	const eligible = [...eligibleOrgSourceLines(source, states)]
	const eligibleStarts = new Set(eligible.map((line) => line.from))
	const structural: { line: RawOrgLine; level: number; title: string; subtreeTo: number }[] = []
	const subtreeStack: number[] = []
	for (const line of structuralOrgSourceLines(source)) {
		if (!/^\*+[ \t]+/.test(line.text)) continue
		const match = /^(\*+)[ \t]+(.*)$/.exec(line.text)!
		const level = match[1].length
		while (subtreeStack.length && structural[subtreeStack.at(-1)!].level >= level)
			structural[subtreeStack.pop()!].subtreeTo = line.from
		subtreeStack.push(structural.length)
		structural.push({ line, level, title: match[2], subtreeTo: source.length })
	}
	const headings: OrgClockHeading[] = []
	const ancestry: OrgClockHeading[] = []
	for (const [index, { line, level, title, subtreeTo }] of structural.entries()) {
		while (ancestry.length && ancestry.at(-1)!.level >= level) ancestry.pop()
		if (!eligibleStarts.has(line.from)) continue
		const heading: OrgClockHeading = {
			from: line.from, to: line.contentTo, bodyFrom: line.breakTo,
			bodyTo: structural[index + 1]?.line.from ?? source.length,
			subtreeTo,
			level, title, parentFrom: ancestry.at(-1)?.from ?? null,
		}
		headings.push(heading)
		ancestry.push(heading)
	}
	const ownerAt = (from: number): OrgClockHeading | undefined => {
		let lower = 0, upper = headings.length
		while (lower < upper) {
			const middle = lower + Math.floor((upper - lower) / 2)
			if (headings[middle].bodyFrom <= from) lower = middle + 1
			else upper = middle
		}
		const heading = headings[lower - 1]
		// COMMENT headings leave gaps, not extensions of the preceding eligible body.
		return heading && from < heading.bodyTo ? heading : undefined
	}
	const policies = new Map<number, OrgLoggingPolicy>()
	const policyAt = (heading: OrgClockHeading): OrgLoggingPolicy | OrgClockRejection => {
		const existing = policies.get(heading.from)
		if (existing) return existing
		const resolved = resolveOrgLoggingPolicy(source, heading)
		if (resolved.kind === "rejected") return reject(`Clock logging policy: ${resolved.reason}.`)
		policies.set(heading.from, resolved.policy)
		return resolved.policy
	}
	const drawers: ClockDrawer[] = []
	const candidates: RawOrgLine[] = eligible.filter((line) => clockLike(line.text))
	for (const range of eligibleOrgDrawerRanges(source, states)) {
		if (!range.closed) return reject("Unclosed drawer makes the document's clocks ambiguous.")
		const raw = linesOf(source.slice(range.from, range.to), range.from).filter((line) => line.from < range.to)
		const name = raw[0].text.trim().slice(1, -1)
		const owner = ownerAt(range.from)
		const drawer: ClockDrawer = { range, name, lines: raw, headingFrom: owner?.from ?? null }
		drawers.push(drawer)
		let supported = /^LOGBOOK$/i.test(name)
		if (owner && !/^(?:LOGBOOK|PROPERTIES)$/i.test(name)) {
			const policy = policyAt(owner)
			if ("kind" in policy) return policy
			supported = policy.drawer?.toLowerCase() === name.toLowerCase()
		}
		if (!supported) continue
		if (!owner) return reject("Clock log drawer has no eligible heading owner.")
		if (drawers.some((prior) => prior !== drawer && prior.headingFrom === owner.from && prior.name.toLowerCase() === name.toLowerCase()))
			return reject("Duplicate clock log drawers are ambiguous.")
		const contentFrom = raw[0].breakTo
		const contentTo = raw.at(-1)!.from
		const interior = source.slice(contentFrom, contentTo)
		const blocks = eligibleOrgBlockRanges(interior, states)
		eligible.push(raw[0], raw.at(-1)!)
		for (const line of linesOf(interior, contentFrom)) {
			if (line.from >= contentTo || blocks.some((block) => line.from - contentFrom >= block.from && line.from - contentFrom < block.to)) continue
			if (/^\*+[ \t]+/.test(line.text) || /^[ \t]*:[\w-]+:[ \t]*$/.test(line.text))
				return reject("Nested heading or drawer in a clock log drawer is ambiguous.")
			if (clockLike(line.text)) candidates.push(line)
			eligible.push(line)
		}
		if (blocks.some((block) => !block.closed)) return reject("Unclosed literal block inside clock log drawer.")
	}
	eligible.sort((a, b) => a.from - b.from)
	const rows: OrgClockRow[] = []
	for (const line of candidates.sort((a, b) => a.from - b.from)) {
		const owner = ownerAt(line.from)
		if (!owner) return reject("CLOCK row has no eligible heading owner.")
		const match = /^[ \t]*CLOCK:[ \t]+(\[[^\[\]\r\n]+\])(?:[ \t]*--[ \t]*(\[[^\[\]\r\n]+\])[ \t]+=>[ \t]+(\d+):([0-5]\d))?[ \t]*$/.exec(line.text)
		if (!match || !clockStamp(match[1]) || (match[2] && !clockStamp(match[2])))
			return reject(`Malformed CLOCK row at source offset ${line.from}.`)
		const elapsedMinutes = match[2] ? Number(match[3]) * 60 + Number(match[4]) : null
		if (elapsedMinutes !== null && !Number.isSafeInteger(elapsedMinutes)) return reject("CLOCK duration exceeds safe minute precision.")
		rows.push({ from: line.from, to: line.contentTo, breakTo: line.breakTo, headingFrom: owner.from,
			start: match[1], end: match[2] ?? null, elapsedMinutes })
	}
	const open = rows.filter((row) => row.end === null)
	if (open.length > 1) return reject("Multiple active CLOCK rows are ambiguous; no clock was changed.")
	return { kind: "snapshot", headings, rows, active: (open[0] as OrgActiveClock | undefined) ?? null, eligible, drawers, policies }
}

/** Parse only eligible CLOCK source ranges; literal blocks, COMMENT subtrees,
 * property/unknown drawers, fixed-width text and inline prose are opaque.
 */
export const parseOrgClocks = (source: string): OrgClockSnapshot | OrgClockRejection => {
	const result = scanClocks(source)
	if (result.kind === "rejected") return result
	return { kind: "snapshot", headings: result.headings, rows: result.rows, active: result.active }
}

const completedChange = (row: OrgActiveClock, context: OrgClockContext, source: string): OrgTextEditBatch["changes"][number] | OrgClockRejection => {
	let duration: number
	if (context.elapsedMinutes !== undefined) {
		if (!context.expectedActiveClock || context.expectedActiveClock.from !== row.from || context.expectedActiveClock.start !== row.start)
			return reject("Epoch duration requires the exact currently active CLOCK identity.")
		if (!Number.isSafeInteger(context.elapsedMinutes) || context.elapsedMinutes < 0) return reject("Elapsed clock minutes must be a nonnegative safe integer.")
		duration = context.elapsedMinutes
	} else {
		const start = civilMinutes(row.start), end = civilMinutes(context.stamp)
		if (start === null || end === null || end < start) return reject("Recovered clock ends before it starts in local civil minutes; supply a known live epoch duration or cancel explicitly.")
		duration = end - start
	}
	const trailing = source.slice(row.from, row.to).match(/[ \t]*$/)![0]
	const appendAt = row.to - trailing.length
	return { from: appendAt, to: appendAt, insert: `--${context.stamp} => ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` }
}

const newClockChange = (source: string, document: ClockDocument, heading: OrgClockHeading, stamp: string): OrgTextEditBatch["changes"][number] | OrgClockRejection => {
	let policy = document.policies.get(heading.from)
	if (!policy) {
		const resolved = resolveOrgLoggingPolicy(source, heading)
		if (resolved.kind === "rejected") return reject(`Clock logging policy: ${resolved.reason}.`)
		policy = resolved.policy
	}
	const drawerName = policy.drawer ?? "LOGBOOK"
	const matches = document.drawers.filter((drawer) => drawer.headingFrom === heading.from && drawer.name.toLowerCase() === drawerName.toLowerCase())
	if (matches.length > 1) return reject("Duplicate clock log drawers are ambiguous.")
	const headingEol = source.slice(heading.to, heading.bodyFrom) || source.match(/\r\n|\r|\n/)?.[0] || "\n"
	if (matches[0]) {
		const drawer = matches[0]
		const opening = drawer.lines[0], closing = drawer.lines.at(-1)!
		const eol = source.slice(opening.contentTo, opening.breakTo) || headingEol
		const indent = opening.text.match(/^[ \t]*/)![0]
		return { from: policy.reversed ? opening.breakTo : closing.from, to: policy.reversed ? opening.breakTo : closing.from,
			insert: `${indent}CLOCK: ${stamp}${eol}` }
	}
	let insertion = heading.bodyFrom
	const first = document.eligible.find((line) => line.from === insertion && line.from < heading.bodyTo)
	if (first) {
		const planning = parseOrgPlanningLine(first.text)
		if (planning.kind === "invalid") return reject("Malformed planning metadata before clock insertion.")
		if (planning.kind === "planning") insertion = first.breakTo
	}
	const properties = document.drawers.filter((drawer) => drawer.headingFrom === heading.from && /^PROPERTIES$/i.test(drawer.name))
	if (properties.length > 1) return reject("Ambiguous property drawers before clock insertion.")
	if (properties[0]?.range.from === insertion) insertion = properties[0].range.to
	const prefix = insertion > 0 && !/[\r\n]/.test(source[insertion - 1]) ? headingEol : ""
	const suffix = insertion < source.length || /[\r\n]$/.test(source) ? headingEol : ""
	return { from: insertion, to: insertion, insert: `${prefix}:${drawerName}:${headingEol}CLOCK: ${stamp}${headingEol}:END:${suffix}` }
}

const batchFrom = (cursor: number, changes: readonly OrgTextEditBatch["changes"][number][], heading?: OrgClockHeading): OrgTextEditBatch => {
	const sorted = [...changes].sort((a, b) => a.from - b.from)
	let delta = 0, mapped = cursor
	for (const change of sorted) {
		if (cursor < change.from) break
		if (cursor <= change.to) { mapped = change.from + delta + Math.min(cursor - change.from, change.insert.length); if (change.from === change.to) mapped += change.insert.length; break }
		delta += change.insert.length - (change.to - change.from)
		mapped = cursor + delta
	}
	return { changes: sorted, cursor: mapped,
		requiredVisibleRanges: [...sorted.map(({ from, to }) => ({ from, to })), ...(heading ? [{ from: heading.from, to: heading.to }] : [])] }
}

/** All edits use original raw coordinates and one canonical caller-owned batch.
 * Out/cancel operate on the document's exact single active row, not a nearby child.
 * Clock-in switches headings by closing that row and opening the new one atomically.
 * Zero-minute completion is retained; cancel removes the row and its empty log drawer.
 */
export const planOrgClockEdit = (source: string, cursor: number, operation: OrgClockOperation, context: OrgClockContext): OrgClockEditPlan => {
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length) return reject("Invalid clock command cursor.")
	if (!validOrgLocalTimestamp(context.stamp)) return reject("Clock commands require an explicit valid inactive local minute timestamp.")
	if (context.elapsedMinutes !== undefined && (!Number.isSafeInteger(context.elapsedMinutes) || context.elapsedMinutes < 0 || !context.expectedActiveClock))
		return reject("Elapsed epoch minutes require a nonnegative safe integer and exact active CLOCK identity.")
	const document = scanClocks(source)
	if (document.kind === "rejected") return document
	const active = document.active
	if (context.expectedActiveClock && (!active || active.from !== context.expectedActiveClock.from || active.start !== context.expectedActiveClock.start))
		return reject("The expected active CLOCK no longer matches this source snapshot.")
	if (context.elapsedMinutes !== undefined && !active) return reject("Elapsed epoch minutes have no active CLOCK owner.")
	if (operation === "cancel-clock") {
		if (!active) return { kind: "unchanged" }
		// GNU org-clock-cancel removes an enclosing drawer only when no payload remains.
		const emptyDrawer = document.drawers.find(drawer =>
			drawer.range.from < active.from && active.breakTo <= drawer.range.to &&
			drawer.lines.every((line, index) => index === 0 || index === drawer.lines.length - 1 ||
				line.from === active.from || /^[ \t]*$/.test(line.text)))
		return { kind: "edit", batch: batchFrom(cursor, [{
			from: emptyDrawer?.range.from ?? active.from,
			to: emptyDrawer?.range.to ?? active.breakTo,
			insert: "",
		}]) }
	}
	if (operation === "clock-out") {
		if (!active) return { kind: "unchanged" }
		const change = completedChange(active, context, source)
		return "kind" in change ? change : { kind: "edit", batch: batchFrom(cursor, [change]) }
	}
	if (operation !== "clock-in") return reject("Unknown clock operation.")
	const line = document.eligible.findLast((candidate) => candidate.from <= cursor)
	const inEligibleLine = line && cursor <= line.breakTo && (cursor < line.breakTo || line.breakTo === source.length)
	if (!inEligibleLine) return reject("Clock-in cursor is in excluded literal, COMMENT, or drawer source.")
	const heading = document.headings.findLast((candidate) => cursor >= candidate.from && cursor < candidate.bodyTo || cursor === source.length && candidate.bodyTo === source.length)
	if (!heading) return reject("Clock-in requires an eligible containing heading.")
	if (active?.headingFrom === heading.from) return { kind: "unchanged" }
	const insertion = newClockChange(source, document, heading, context.stamp)
	if ("kind" in insertion) return insertion
	const changes: OrgTextEditBatch["changes"][number][] = []
	if (active) {
		const closing = completedChange(active, context, source)
		if ("kind" in closing) return closing
		changes.push(closing)
	}
	changes.push(insertion)
	return { kind: "edit", batch: batchFrom(cursor, changes, heading) }
}

export interface OrgClockReportOptions {
	/** Inclusive ISO local dates. Completed rows are attributed wholly to their start date.
	 * Boundary-straddling rows are NOT prorated: unzoned text cannot recover epoch splits.
	 */
	readonly from?: string
	readonly to?: string
	readonly headingFrom?: number
	readonly scope?: "heading" | "subtree"
}
export interface OrgClockHeadingTotal {
	readonly heading: OrgClockHeading
	readonly directMinutes: number
	readonly subtreeMinutes: number
	readonly directRows: number
	readonly subtreeRows: number
}
export interface OrgClockReport {
	readonly kind: "report"
	readonly totalMinutes: number
	readonly completedRows: number
	readonly headings: readonly OrgClockHeadingTotal[]
	readonly active: OrgActiveClock | null
}

/** Completed durations (including zero) are authoritative even when local wall
 * time reverses across DST. Open rows never acquire a made-up report duration.
 */
export const reportOrgClockTotals = (source: string, options: OrgClockReportOptions = {}): OrgClockReport | OrgClockRejection => {
	if ((options.from !== undefined && !isOrgCalendarISO(options.from)) || (options.to !== undefined && !isOrgCalendarISO(options.to)) ||
		(options.from !== undefined && options.to !== undefined && options.to < options.from)) return reject("Invalid or backwards clock report date interval.")
	if (options.scope !== undefined && options.scope !== "heading" && options.scope !== "subtree") return reject("Invalid clock report scope.")
	const document = parseOrgClocks(source)
	if (document.kind === "rejected") return document
	const target = options.headingFrom === undefined ? undefined : document.headings.find((heading) => heading.from === options.headingFrom)
	if (options.headingFrom !== undefined && !target) return reject("Clock report target is not an eligible heading.")
	const rows = document.rows.filter((row) => row.elapsedMinutes !== null &&
		(!options.from || row.start.slice(1, 11) >= options.from) && (!options.to || row.start.slice(1, 11) <= options.to) &&
		(!target || (options.scope === "heading" ? row.headingFrom === target.from : row.headingFrom >= target.from && row.headingFrom < target.subtreeTo)))
	const headings = document.headings.filter((heading) => !target || (options.scope === "heading" ? heading.from === target.from : heading.from >= target.from && heading.from < target.subtreeTo))
	const totals = headings.map((heading) => ({ heading, directMinutes: 0, subtreeMinutes: 0, directRows: 0, subtreeRows: 0 }))
	const totalsByHeading = new Map(totals.map((total) => [total.heading.from, total]))
	let totalMinutes = 0
	for (const row of rows) {
		const duration = row.elapsedMinutes!
		totalMinutes += duration
		if (!Number.isSafeInteger(totalMinutes)) return reject("Clock report total exceeds safe minute precision.")
		let owner = totalsByHeading.get(row.headingFrom)
		if (!owner) continue
		owner.directMinutes += duration
		owner.directRows++
		while (owner) {
			owner.subtreeMinutes += duration
			owner.subtreeRows++
			owner = owner.heading.parentFrom === null ? undefined : totalsByHeading.get(owner.heading.parentFrom)
		}
	}
	return { kind: "report", totalMinutes, completedRows: rows.length, active: document.active, headings: totals }
}
