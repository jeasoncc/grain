import { formatOrgTimestamp, readOrgPlanningDate, readOrgStoredTimestamp, type OrgTimestampValue } from "@/pipes/org/org-date-reader.pipe"
import { guardOrgCommandOrigin, type OrgBufferCommand, type OrgBufferCommandContext, type OrgBufferCommandRejected } from "./org-buffer-command"

const cursorReason = (context: OrgBufferCommandContext) =>
	!Number.isInteger(context.cursor) || context.cursor < 0 || context.cursor > context.content.length ||
	(context.content[context.cursor - 1] === "\r" && context.content[context.cursor] === "\n")
		? { kind: "rejected" as const, reason: "invalid-cursor", message: "The timestamp cursor is outside a valid Source boundary." }
		: null

interface TimestampAtPoint {
	readonly kind: "timestamp"
	readonly from: number
	readonly to: number
	readonly active: boolean
	readonly value: OrgTimestampValue
	readonly initialInput: string
	readonly defaultValue: OrgTimestampValue
}
const stampDatePattern = String.raw`\d{4}-\d{2}-\d{2}`
// GNU org-ts-regexp3 is context-free but bounds the suffix after its weekday/clock prefix.
const laxStampPattern = new RegExp(String.raw`[<\[]${stampDatePattern}(?: *[^+\d>\]\r\n -]+)?(?: \d{1,2}:\d{2})?[^\]>\r\n]{0,16}[>\]]`, "g")
const fastStampPattern = String.raw`[<\[]${stampDatePattern}(?: [^\r\n]*?)?[>\]]`
const storedRangePattern = new RegExp(`(${fastStampPattern})-{1,3}(${fastStampPattern})`, "g")
const timestampAtPoint = (context: OrgBufferCommandContext): TimestampAtPoint | OrgBufferCommandRejected | null => {
	const lineFrom = Math.max(context.content.lastIndexOf("\r", context.cursor - 1), context.content.lastIndexOf("\n", context.cursor - 1)) + 1
	const cr = context.content.indexOf("\r", lineFrom), lf = context.content.indexOf("\n", lineFrom)
	const lineTo = cr < 0 ? (lf < 0 ? context.content.length : lf) : (lf < 0 ? cr : Math.min(cr, lf))
	const line = context.content.slice(lineFrom, lineTo)
	const point = context.cursor - lineFrom
	const spans = [...line.matchAll(laxStampPattern)]
	let target = spans.find(match => point >= match.index && point <= match.index + match[0].length)
	let defaultRaw = target?.[0]
	for (const range of line.matchAll(storedRangePattern)) {
		if (point < range.index || point > range.index + range[0].length) continue
		const secondFrom = range.index + range[0].length - range[2].length
		// Range defaults and the inclusive replacement lookup are separate in GNU.
		defaultRaw = point < secondFrom - 1 ? range[1] : range[2]
		if (!target && point > range.index + range[1].length && point < secondFrom)
			target = spans.find(match => match.index === secondFrom)
		if (!target)
			return { kind: "rejected", reason: "unsupported-stored-timestamp-range", message: "This stored range endpoint cannot be located unambiguously; no Source was changed." }
		break
	}
	if (!target) {
		const previous = spans.findLast(match => match.index + match[0].length < point)
		const next = spans.find(match => match.index > point)
		if (previous && next && /^-+$/.test(line.slice(previous.index + previous[0].length, next.index)))
			return { kind: "rejected", reason: "unsupported-stored-timestamp-range", message: "This stored timestamp range separator is unsupported; no Source was changed." }
		return null
	}
	const parsed = readOrgStoredTimestamp(target[0])
	if (parsed.kind === "error")
		return { kind: "rejected", reason: "invalid-stored-timestamp", message: parsed.message }
	const defaults = !defaultRaw || defaultRaw === target[0] ? parsed : readOrgStoredTimestamp(defaultRaw)
	if (defaults.kind === "error")
		return { kind: "rejected", reason: "invalid-stored-timestamp", message: defaults.message }
	const from = lineFrom + target.index
	return { kind: "timestamp", from, to: from + target[0].length, active: target[0][0] === "<",
		value: parsed.timestamp ?? { date: parsed.date }, initialInput: defaultRaw ?? target[0], defaultValue: defaults.timestamp ?? { date: defaults.date } }
}

/** Same pure calendar grammar as planning; the parameter owner captures the real local clock. */
export const createOrgTimestampCommand = (active: boolean, defaultDate: string): OrgBufferCommand => ({
	id: `org.timestamp.${active ? "active" : "inactive"}`,
	prompt: `${active ? "Active" : "Inactive"} timestamp (date / time / range / repeater / warning):`,
	completion: "value",
	updatedMessage: "Timestamp updated",
	unchangedMessage: "Timestamp unchanged",
	prepare: (context) => {
		const guard = cursorReason(context)
		if (guard) return guard
		const existing = timestampAtPoint(context)
		if (existing?.kind === "rejected") return existing
		return {
			kind: "ready", context: { ...context }, initialInput: existing?.initialInput ?? defaultDate,
			candidates: ["today", "tomorrow", "+3d", "next mon"],
		}
	},
	execute: (origin, current, input, dateContext) => {
		const guard = guardOrgCommandOrigin(origin, current) ?? cursorReason(origin)
		if (guard) return guard
		const existing = timestampAtPoint(origin)
		if (existing?.kind === "rejected") return existing
		const parsed = readOrgPlanningDate(input, dateContext, existing?.defaultValue)
		if (parsed.kind === "error") return { kind: "rejected", reason: "invalid-date", message: parsed.message }
		const insert = formatOrgTimestamp(parsed.timestamp ?? { date: parsed.date }, active)
		if (existing && existing.active === active && formatOrgTimestamp(existing.value, active) === insert)
			return { kind: "no-change", reason: "unchanged-timestamp" }
		const from = existing?.from ?? origin.cursor, to = existing?.to ?? origin.cursor
		return { kind: "edit", edit: { from, to, insert, cursor: from + insert.length } }
	},
})
