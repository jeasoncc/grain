import {
	OrgSparseTreeContextRequiredError,
	type OrgSparseSpecialPropertyName,
	type OrgSparseSpecialPropertyRequest,
} from "./org-sparse-tree.pipe"
import { orgBlockRanges, orgDrawerRanges, parseOrgTodoKeywords, type RawOrgLine } from "./org-text.pipe"

export interface OrgSparseDependencyContext {
	readonly enforceTodoDependencies: boolean
	readonly enforceCheckboxDependencies: boolean
	/** Only installed GNU dependency hooks are source-local. Custom hooks need their own captured authority. */
	readonly blockerHooks: "gnu-default" | "none" | "custom" | "unavailable"
}
export interface OrgSparseClockContext {
	readonly nowEpochMs: number
	readonly todayStartEpochMs: number
	readonly todayEndEpochMs: number
	/** Captured local timezone encoder, including GNU-compatible DST/calendar normalization. Month is 1-based. */
	readonly localTimeToEpochMs: (year: number, month: number, day: number, hour: number, minute: number) => number
	readonly durationFormat: "gnu-default" | "h:mm" | "h:mm:ss"
	readonly includeClockingTask: boolean
	/** Running-clock identity is runtime state, never inferred from an open source row. */
	readonly activeClock: { readonly headingStart: number; readonly startedAtEpochMs: number } | null
}
export interface OrgSparseSpecialPropertyContext {
	/** Full visiting filename; null positively identifies a nonvisiting buffer. Missing is unavailable. */
	readonly fileName?: string | null
	readonly dependencies?: OrgSparseDependencyContext
	readonly clock?: OrgSparseClockContext
}

export type OrgSparseClockCalendarTime = readonly [year: number, month: number, day: number, hour: number, minute: number]
export interface OrgSparseSpecialPropertyClockRequest {
	readonly calendarTimes: readonly OrgSparseClockCalendarTime[]
}

interface Heading {
	readonly from: number
	readonly level: number
	readonly parent: number | null
	readonly pending: boolean
	readonly lineIndex: number
	readonly properties: ReadonlyMap<string, string>
	bodyEnd: number
	subtreeEnd: number
}
function contextError(message: string, context: "file" | "dependency" | "clock"): never {
	throw new OrgSparseTreeContextRequiredError(message, context)
}
const rawLines = (source: string): RawOrgLine[] => [...source.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g)]
	.map((match) => ({ from: match.index, contentTo: match.index + match[1].length,
		breakTo: match.index + match[0].length, text: match[1] }))

/** GNU element blocks cannot span a heading. Reuse the lexical block grammar,
 * but only opaque GNU block kinds hide clock elements; containers parse their
 * own contents. The mutation reader intentionally protects more source. */
const literalLines = (source: string, lines: readonly RawOrgLine[]): Uint8Array => {
	const hidden = new Uint8Array(lines.length)
	const indices = new Map(lines.map((line, index) => [line.from, index]))
	const nextHeading = new Int32Array(lines.length + 1)
	nextHeading[lines.length] = lines.length
	for (let index = lines.length - 1; index >= 0; index--) {
		nextHeading[index] = /^\*+[ \t]/.test(lines[index].text) ? index : nextHeading[index + 1]
	}
	const regions = [{ from: 0, to: source.length }]
	for (const drawer of orgDrawerRanges(source)) {
		const first = indices.get(drawer.from)!
		if (drawer.closed && (nextHeading[first] === lines.length || lines[nextHeading[first]].from >= drawer.to)) {
			regions.push({ from: lines[first].breakTo, to: drawer.to })
		}
	}
	while (regions.length) {
		const region = regions.pop()!
		for (const block of orgBlockRanges(source.slice(region.from, region.to))) {
			const from = block.from + region.from, to = block.to + region.from
			const first = indices.get(from)!
			if (!block.closed || (nextHeading[first] < lines.length && lines[nextHeading[first]].from < to)) {
				// An invalid outer opener is just a keyword to GNU; nested valid
				// blocks after that keyword still retain their own element scope.
				regions.push({ from: lines[first].breakTo, to })
				continue
			}
			const kind = /^[ \t]*#\+begin_([A-Za-z0-9_-]+)/i.exec(lines[first].text)![1]
			if (/^(?:src|example|export|comment|verse)$/i.test(kind)) {
				for (let index = first; index < lines.length && lines[index].from < to; index++) hidden[index] = 1
			} else {
				// Discover nested opaque blocks with the same shared lexical reader.
				regions.push({ from: lines[first].breakTo, to })
			}
		}
	}
	return hidden
}

const dependencyProperties = (lines: readonly RawOrgLine[], start: number): ReadonlyMap<string, string> => {
	const properties = new Map<string, string>()
	const base: Partial<Record<"ORDERED" | "NOBLOCKING", string>> = {}
	const extra: Partial<Record<"ORDERED" | "NOBLOCKING", string[]>> = {}
	let at = start + 1
	if (/^[ \t]*(?:SCHEDULED:|DEADLINE:|CLOSED:)/.test(lines[at]?.text ?? "")) at++
	if (!/^[ \t]*:PROPERTIES:[ \t]*$/i.test(lines[at]?.text ?? "")) return properties
	for (at++; at < lines.length; at++) {
		if (/^[ \t]*:END:[ \t]*$/i.test(lines[at].text)) {
			for (const name of ["ORDERED", "NOBLOCKING"] as const) {
				const value = base[name], additions = extra[name]
				// org-entry-get removes a literal nil base before joining the
				// accumulated + values, then removes a final literal nil too.
				const parts: string[] = []
				if (value !== undefined && value !== "nil") parts.push(value)
				if (additions) parts.push(...additions)
				if (parts.length > 0) properties.set(name, parts.join(" "))
			}
			return properties
		}
		const property = /^[ \t]*:([^\s:]+):[ \t]*(.*?)[ \t]*$/.exec(lines[at].text)
		if (!property) return properties
		const key = property[1].toUpperCase()
		if (key === "ORDERED" || key === "NOBLOCKING") base[key] = property[2]
		if (key === "ORDERED+" || key === "NOBLOCKING+") {
			const name = key === "ORDERED+" ? "ORDERED" : "NOBLOCKING"
			const additions = extra[name] ??= []
			additions.push(property[2])
		}
	}
	return properties
}

const sourceHeadings = (lines: readonly RawOrgLine[], literal: Uint8Array, pending: ReadonlySet<string>): Heading[] => {
	const headings: Heading[] = [], ancestry: number[] = []
	for (const [lineIndex, line] of lines.entries()) {
		const match = /^(\*+)[ \t](.*)$/.exec(line.text)
		if (!match || literal[lineIndex]) continue
		const index = headings.length, level = match[1].length
		while (ancestry.length && headings[ancestry.at(-1)!].level >= level) headings[ancestry.pop()!].subtreeEnd = index
		if (index > 0) headings[index - 1].bodyEnd = lineIndex
		const state = /^ +([^ \t]+)(?: |$)/.exec(line.text.slice(match[1].length))?.[1]
		headings.push({ from: line.from, level, parent: ancestry.at(-1) ?? null, pending: state !== undefined && pending.has(state),
			lineIndex, properties: dependencyProperties(lines, lineIndex), bodyEnd: lines.length, subtreeEnd: -1 })
		ancestry.push(index)
	}
	for (const index of ancestry) headings[index].subtreeEnd = headings.length
	return headings
}

const duration = (minutes: number, format: OrgSparseClockContext["durationFormat"]): string => {
	if (minutes < 0) return `-${duration(-minutes, format)}`
	const days = format === "gnu-default" ? Math.floor(minutes / 1440) : 0
	const remaining = minutes - days * 1440
	const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}${format === "h:mm:ss" ? ":00" : ""}`
	return days > 0 ? `${days}d ${clock}` : clock
}

/** org-ts-regexp0 field extraction, not the interactive date reader: GNU encode-time
 * normalizes out-of-range calendar fields and accepts arbitrary weekday text. */
const stampFields = (stamp: string): readonly [number, number, number, number | undefined, number | undefined] | null => {
	const match = /^\[(\d{4})-(\d{2})-(\d{2})(?= |\])(?: +[^\]+0-9>\r\n -]+)?(?: +(\d{1,2}):(\d{2}))?[^\]\r\n]*\]$/.exec(stamp)
	return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? undefined : Number(match[4]),
		match[5] === undefined ? undefined : Number(match[5])] : null
}
type ClockRow =
	| { readonly owner: number; readonly kind: "naked"; readonly minutes: number }
	| { readonly owner: number; readonly kind: "pair"; readonly start: OrgSparseClockCalendarTime; readonly end: OrgSparseClockCalendarTime }
const readClockRows = (lines: readonly RawOrgLine[], literal: Uint8Array, headings: readonly Heading[]): readonly ClockRow[] => {
	const rows: ClockRow[] = []
	let owner = -1, nextHeading = 0
	for (const [lineIndex, line] of lines.entries()) {
		if (nextHeading < headings.length && headings[nextHeading].lineIndex === lineIndex) owner = nextHeading++
		if (owner < 0) continue
		// The naked-duration branch of org-clock-sum intentionally has no element-type check.
		const naked = /^[ \t]*CLOCK:[ \t]*=>[ \t]+(\d+):(\d+)/i.exec(line.text)
		if (naked) { rows.push({ owner, kind: "naked", minutes: Number(naked[1]) * 60 + Number(naked[2]) }); continue }
		if (literal[lineIndex]) continue
		const pair = /^[ \t]*CLOCK:[ \t]*(\[[^\]\r\n]*\])(-+)(\[[^\]\r\n]*\])/i.exec(line.text)
		if (!pair) continue
		const start = stampFields(pair[1]), end = pair[2] === "--" ? stampFields(pair[3]) : null
		if (!start || start[3] === undefined || start[4] === undefined) continue
		const timeRange = /[012]?[0-9]:[0-5][0-9]-([012]?[0-9]):([0-5][0-9])/.exec(pair[1])
		// An invalid second endpoint leaves the first timestamp's own time range,
		// exactly as org-element-timestamp-parser; otherwise there is no elapsed time.
		if (!end && !timeRange) continue
		const finish = end ?? start
		rows.push({ owner, kind: "pair",
			start: Object.freeze([start[0], start[1], start[2], start[3], start[4]] as const),
			end: Object.freeze([finish[0], finish[1], finish[2],
				end?.[3] ?? (timeRange ? Number(timeRange[1]) : start[3]),
				end?.[4] ?? (timeRange ? Number(timeRange[2]) : start[4])] as const),
		})
	}
	return rows
}
interface SourceSnapshot {
	readonly source: string
	readonly lines: readonly RawOrgLine[]
	readonly literal: Uint8Array
	readonly headings: readonly Heading[]
	clocks?: readonly ClockRow[]
	clockRequest?: OrgSparseSpecialPropertyClockRequest
}
const snapshots = new WeakMap<OrgSparseSpecialPropertyRequest, SourceSnapshot>()
const sourceSnapshot = (source: string, request: OrgSparseSpecialPropertyRequest): SourceSnapshot => {
	const previous = snapshots.get(request)
	if (previous?.source === source) return previous
	const lines = rawLines(source), literal = literalLines(source, lines)
	const snapshot: SourceSnapshot = { source, lines, literal, headings: sourceHeadings(lines, literal, new Set(parseOrgTodoKeywords(source).todo)) }
	snapshots.set(request, snapshot)
	return snapshot
}

/** Batches exact calendar fields for a caller-owned native timezone reader.
 * Capture below reuses these parsed rows for the identical request and Source. */
export const orgSparseSpecialPropertyClockRequest = (
	source: string, request: OrgSparseSpecialPropertyRequest,
): OrgSparseSpecialPropertyClockRequest => {
	if (!request.properties.some((property) => property === "CLOCKSUM" || property === "CLOCKSUM_T")) return { calendarTimes: [] }
	const snapshot = sourceSnapshot(source, request)
	if (snapshot.clockRequest) return snapshot.clockRequest
	const times: OrgSparseClockCalendarTime[] = []
	for (const row of (snapshot.clocks ??= readClockRows(snapshot.lines, snapshot.literal, snapshot.headings))) {
		if (row.kind === "naked") continue
		// Keep repeated occurrences: libc's DST guess can depend on intervening
		// encodings. The native reader must reject inconsistent tuple mappings.
		times.push(row.start, row.end)
	}
	return snapshot.clockRequest = Object.freeze({ calendarTimes: Object.freeze(times) })
}

const clockMinutes = (
	rows: readonly ClockRow[], headings: readonly Heading[], context: OrgSparseClockContext, today: boolean,
): ReadonlyMap<number, string | undefined> => {
	if (!Number.isFinite(context.nowEpochMs) || !Number.isFinite(context.todayStartEpochMs) || !Number.isFinite(context.todayEndEpochMs)
		|| context.todayEndEpochMs <= context.todayStartEpochMs || typeof context.localTimeToEpochMs !== "function"
		|| !["gnu-default", "h:mm", "h:mm:ss"].includes(context.durationFormat)) {
		contextError("Clock sums require captured timezone, day boundaries and supported native duration format.", "clock")
	}
	const own = new Float64Array(headings.length)
	for (const row of rows) {
		if (row.kind === "naked") { own[row.owner] += row.minutes; continue }
		let ts: number, te: number
		try {
			ts = context.localTimeToEpochMs(...row.start)
			te = context.localTimeToEpochMs(...row.end)
		} catch (error) {
			if (error instanceof OrgSparseTreeContextRequiredError) throw error
			contextError("Clock timestamp has no captured native local-time encoding.", "clock")
		}
		if (!Number.isFinite(ts) || !Number.isFinite(te)) contextError("Clock timestamp has no finite captured native local-time encoding.", "clock")
		const elapsed = today ? Math.min(te, context.todayEndEpochMs) - Math.max(ts, context.todayStartEpochMs) : te - ts
		if (elapsed > 0) own[row.owner] += Math.floor(elapsed / 60000)
	}
	if (today && context.includeClockingTask && context.activeClock) {
		const active = context.activeClock
		if (!Number.isFinite(active.startedAtEpochMs)) contextError("Active clock requires its captured native start time.", "clock")
		if (active.startedAtEpochMs >= context.todayStartEpochMs && active.startedAtEpochMs <= context.todayEndEpochMs) {
			const index = headings.findIndex((heading) => heading.from === active.headingStart)
			if (index < 0) contextError("Active clock heading is unavailable in this Source snapshot.", "clock")
			own[index] += Math.floor((context.nowEpochMs - active.startedAtEpochMs) / 60000)
		}
	}
	const values = new Map<number, string | undefined>()
	const descendants = new Float64Array(headings.length)
	let carry = 0
	for (let index = headings.length - 1; index >= 0; index--) {
		const heading = headings[index]
		carry += own[index]
		if (!Number.isSafeInteger(carry) || !Number.isSafeInteger(descendants[index])) contextError("Clock total exceeds exact captured minute precision.", "clock")
		if (carry > 0 || descendants[index] > 0) {
			const minutes = carry + descendants[index]
			values.set(heading.from, duration(minutes, context.durationFormat))
			if (heading.parent !== null) descendants[heading.parent] += minutes
			carry = 0
		} else values.set(heading.from, undefined)
	}
	return values
}

const blockedValues = (
	lines: readonly RawOrgLine[], literal: Uint8Array, headings: readonly Heading[], context: OrgSparseDependencyContext,
): ReadonlyMap<number, string | undefined> => {
	if (context.blockerHooks !== "gnu-default" && context.blockerHooks !== "none") {
		contextError("BLOCKED requires captured GNU blocker hooks; custom or unavailable hooks cannot be inferred from Source.", "dependency")
	}
	const pendingPrefix = new Uint32Array(headings.length + 1)
	for (const [index, heading] of headings.entries()) pendingPrefix[index + 1] = pendingPrefix[index] + Number(heading.pending)
	const propertyAt = (heading: Heading, key: string): string | undefined => {
		// Native blocker hooks call org-entry-get without inheritance/global fallback.
		const value = heading.properties.get(key)
		return value === "nil" ? undefined : value
	}
	const orderedAncestor = new Uint8Array(headings.length)
	const values = new Map<number, string | undefined>()
	for (const [index, heading] of headings.entries()) {
		const parent = heading.parent === null ? null : headings[heading.parent]
		const orderedPrior = parent !== null && propertyAt(parent, "ORDERED") !== undefined
			&& pendingPrefix[index] > pendingPrefix[heading.parent! + 1]
		const ancestorBlocked = parent !== null && parent.pending && orderedAncestor[heading.parent!] !== 0
		orderedAncestor[index] = Number(orderedPrior || ancestorBlocked)
		let blocked = false
		if (context.blockerHooks === "gnu-default" && heading.pending && propertyAt(heading, "NOBLOCKING") === undefined) {
			blocked = context.enforceTodoDependencies && (pendingPrefix[heading.subtreeEnd] > pendingPrefix[index + 1] || orderedAncestor[index] !== 0)
			if (!blocked && context.enforceCheckboxDependencies) {
				for (let at = heading.lineIndex + 1; at < heading.bodyEnd; at++) {
					if (!literal[at] && /^[ \t]*(?:[-+*]|\d+[.)])[ \t]+(?:\[@(?:start:)?(?:\d+|[A-Za-z])\][ \t]*)?\[[- ]\]/.test(lines[at].text)) {
						blocked = true
						break
					}
				}
			}
		}
		values.set(heading.from, blocked ? "t" : "")
	}
	return values
}

/** Metadata-only projection of the same current Source snapshot and captured runtime.
 * A key with undefined is an available native nil; absent context is a typed error.
 * No native writer, filesystem, process, body rendering, or hidden wall clock exists here. */
export const captureOrgSparseSpecialProperties = (
	source: string,
	request: OrgSparseSpecialPropertyRequest,
	capturedContext: OrgSparseSpecialPropertyContext,
): ReadonlyMap<OrgSparseSpecialPropertyName, ReadonlyMap<number, string | undefined>> => {
	const columns = new Map<OrgSparseSpecialPropertyName, ReadonlyMap<number, string | undefined>>()
	if (request.properties.length === 0) return columns
	let snapshot: SourceSnapshot | undefined
	for (const property of request.properties) {
		const values = new Map<number, string | undefined>()
		if (property === "FILE") {
			if (capturedContext.fileName === undefined) contextError("FILE requires the captured full visiting filename or explicit nonvisiting null.", "file")
			for (const from of request.headingStarts) values.set(from, capturedContext.fileName ?? undefined)
		} else {
			const document = snapshot ??= sourceSnapshot(source, request)
			let native: ReadonlyMap<number, string | undefined>
			if (property === "BLOCKED") {
				if (!capturedContext.dependencies) contextError("BLOCKED requires captured dependency policy and blocker hooks.", "dependency")
				native = blockedValues(document.lines, document.literal, document.headings, capturedContext.dependencies)
			} else {
				if (!capturedContext.clock) contextError(`${property} requires captured native local-clock context.`, "clock")
				document.clocks ??= readClockRows(document.lines, document.literal, document.headings)
				native = clockMinutes(document.clocks, document.headings, capturedContext.clock, property === "CLOCKSUM_T")
			}
			for (const from of request.headingStarts) {
				if (!native.has(from)) contextError(`Requested ${property} heading is unavailable in this Source snapshot.`, property === "BLOCKED" ? "dependency" : "clock")
				values.set(from, native.get(from))
			}
		}
		columns.set(property, values)
	}
	return columns
}
