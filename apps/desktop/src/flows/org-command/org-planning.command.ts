import { formatOrgTimestamp, readOrgDate, readOrgPlanningDate, readOrgStoredTimestamp, type OrgDateContext } from "@/pipes/org/org-date-reader.pipe"
import { type OrgLoggingPolicyOptions } from "@/pipes/org/org-logging-policy.pipe"
import { parseOrgPlanningLine, type OrgPlanningFieldRange } from "@/pipes/org/org-planning-line.pipe"
import { planOrgOperationLogging } from "@/pipes/org/org-todo-logging.pipe"
import {
	headingPositionAt,
	orgPropertyDrawerAt,
	setOrgPlanningAt,
	validOrgDate,
	type OrgPlanningKind,
	type OrgTextEdit,
} from "@/pipes/org/org-text.pipe"
import {
	guardOrgCommandOrigin,
	guardOrgHeadingCommand,
	type OrgBufferCommand,
	type OrgBufferCommandContext,
	type OrgBufferCommandRejected,
} from "./org-buffer-command"

interface PlanningSnapshot {
	readonly date: string | null
	readonly field?: OrgPlanningFieldRange
	readonly lineFrom: number
	readonly headingFrom: number
	readonly closed?: OrgPlanningFieldRange
	readonly lineTo: number
	readonly lineEnd: number
}
/** Read only the adjacent planning line using the same source-range parser as the writer. */
const planningAt = (
	context: OrgBufferCommandContext,
	kind: OrgPlanningKind,
): PlanningSnapshot | OrgBufferCommandRejected => {
	const heading = headingPositionAt(context.content, context.cursor)
	const text = heading ? context.content.slice(heading.breakTo).split(/\r\n|\r|\n/, 1)[0] : ""
	const planning = parseOrgPlanningLine(text)
	if (planning.kind === "invalid")
		return { kind: "rejected", reason: "invalid-planning", message: planning.message }
	if (planning.kind === "planning" && planning.fields.some((field) => !validOrgDate(field.date)))
		return {
			kind: "rejected",
			reason: "invalid-planning",
			message:
				"The planning line contains an invalid calendar date. Edit it directly before changing its date.",
		}
	const adjacent =
		heading && planning.kind === "planning"
			? context.content
					.slice(heading.breakTo + text.length)
					.replace(/^(?:\r\n|\r|\n)/, "")
					.split(/\r\n|\r|\n/, 1)[0]
			: text
	if (
		/^[ \t]*:(?:END|PROPERTIES):/i.test(adjacent) &&
		!/^[ \t]*:PROPERTIES:[ \t]*$/i.test(adjacent)
	)
		return {
			kind: "rejected",
			reason: "invalid-drawer",
			message:
				"Malformed or misplaced reserved drawer marker. Repair it before changing its planning date.",
		}
	const drawer = orgPropertyDrawerAt(context.content, context.cursor)
	if (drawer?.kind === "invalid")
		return { kind: "rejected", reason: "invalid-drawer", message: drawer.message }
	if (
		drawer?.kind === "drawer" &&
		drawer.properties.some((field) => /^(?:END|PROPERTIES)$/i.test(field.key))
	)
		return {
			kind: "rejected",
			reason: "invalid-drawer",
			message:
				"END and PROPERTIES are reserved drawer markers. Repair the drawer before changing its planning date.",
		}
	const field = planning.kind === "planning" ? planning.fields.find((field) => field.kind === kind) : undefined
	const lineFrom = heading!.breakTo
	const lineTo = lineFrom + text.length
	const eol = /^(?:\r\n|\r|\n)/.exec(context.content.slice(lineTo))?.[0] ?? ""
	return { date: field?.date ?? null, field, lineFrom, lineTo, lineEnd: lineTo + eol.length,
		closed: planning.kind === "planning" ? planning.fields.find((field) => field.kind === "CLOSED") : undefined,
		headingFrom: heading!.from }
}
const isRejected = (
	value: PlanningSnapshot | OrgBufferCommandRejected,
): value is OrgBufferCommandRejected => "kind" in value

/** Calendar policy is supplied explicitly by the caller; no clock or IO in this command. */
export const createOrgPlanningCommand = (
	kind: OrgPlanningKind,
	defaultDate: string,
	dateContext?: OrgDateContext,
	operation: "set" | "remove" = "set",
	loggingOptions: OrgLoggingPolicyOptions = {},
): OrgBufferCommand => {
	// Own the supplied scalar snapshot; callers may reuse or mutate their context object.
	const preparedDateContext = dateContext ? Object.freeze({ ...dateContext,
		...(dateContext.policy ? { policy: Object.freeze({ ...dateContext.policy }) } : {}),
	}) : undefined
	const label = kind === "SCHEDULED" ? "Schedule" : "Deadline"
	return {
		id: operation === "remove" ? `org.heading.remove-${kind === "SCHEDULED" ? "scheduled" : "deadline"}` : `org.heading.${kind.toLowerCase()}`,
		prompt: `${label} (date / time / range / repeater / warning):`,
		completion: "value",
		updatedMessage: `${label} updated`,
		unchangedMessage: `${label} unchanged`,
		prepare: (context) => {
			const guard = guardOrgHeadingCommand(context)
			if (guard) return guard
			const existing = planningAt(context, kind)
			if (isRejected(existing)) return existing
			return {
				kind: "ready",
				context: { ...context },
				initialInput: existing.field?.timestamp ?? defaultDate,
				candidates: [
					"today",
					"tomorrow",
					"+3d",
					"next mon",
					...new Set(
						[existing.date, defaultDate].filter(
							(date): date is string => date !== null && validOrgDate(date),
						),
					),
				],
			}
		},
		execute: (origin, current, input, acceptedContext) => {
			const guard = guardOrgCommandOrigin(origin, current) ?? guardOrgHeadingCommand(origin)
			if (guard) return guard
			const existing = planningAt(origin, kind)
			if (isRejected(existing)) return existing
			const suppliedContext = acceptedContext ?? preparedDateContext
			const previousValue = existing.field ? readOrgStoredTimestamp(existing.field.timestamp) : null
			const acceptedDateContext = suppliedContext
				? Object.freeze({
						...suppliedContext,
						...(suppliedContext.policy ? { policy: Object.freeze({ ...suppliedContext.policy }) } : {}),
						defaultDate: existing.date ?? suppliedContext.defaultDate ?? defaultDate,
						defaultTime: previousValue?.kind === "date" ? previousValue.timestamp?.time : suppliedContext.defaultTime,
					})
				: undefined
			let edit: OrgTextEdit | null = null
			if (operation === "set") {
				const raw = readOrgDate(input, acceptedDateContext)
				const parsed = readOrgPlanningDate(input, acceptedDateContext, previousValue?.kind === "date" ? previousValue.timestamp : undefined)
				if (parsed.kind === "error")
					return { kind: "rejected", reason: "invalid-date", message: parsed.message }
				const unchanged = existing.field && previousValue?.kind === "date" &&
					formatOrgTimestamp(parsed.timestamp ?? { date: parsed.date }) === formatOrgTimestamp(previousValue.timestamp ?? { date: previousValue.date })
				if (!existing.closed && unchanged)
					return { kind: "no-change", reason: raw.kind === "date" && !raw.timestamp ? "unchanged-date" : "unchanged-timestamp" }
				if (!unchanged) edit = setOrgPlanningAt(origin.content, origin.cursor, kind,
					raw.kind === "date" && !raw.timestamp ? parsed.date : parsed.timestamp ?? parsed.date)
			}
			const removals = [...(operation === "set" ? [existing.closed] : []), ...(operation === "remove" ? [existing.field] : [])]
				.filter((field): field is OrgPlanningFieldRange => !!field)
				.map((field) => {
					let from = existing.lineFrom + field.from
					let to = existing.lineFrom + field.to
					const after = /^[ \t]+/.exec(origin.content.slice(to, existing.lineTo))
					if (after) to += after[0].length
					else while (from > existing.lineFrom && /[ \t]/.test(origin.content[from - 1])) from--
					return { cursor: origin.cursor, from, to, insert: "" }
				})
			if (!edit && !removals.length) return { kind: "no-change", reason: "unchanged-timestamp" }
			const previous = existing.field?.timestamp ?? null
			const next = operation === "remove" ? null : edit && existing.field
				? previous!.slice(0, edit.from - existing.lineFrom - existing.field.timestampFrom) + edit.insert +
					previous!.slice(edit.to - existing.lineFrom - existing.field.timestampFrom)
				: edit ? /<(?:[^<>]*)>(?:--<(?:[^<>]*)>)?/.exec(edit.insert)?.[0] ?? null : previous
			const logging = planOrgOperationLogging(origin.content, existing.headingFrom, acceptedDateContext?.logStamp,
				{ kind: kind === "SCHEDULED" ? "reschedule" : "redeadline", previous, next }, acceptedDateContext?.note, loggingOptions)
			if (logging.kind === "needs-note") return {
				...logging, request: Object.freeze({ ...logging.request, input, ...(acceptedDateContext ? { context: acceptedDateContext } : {}) }),
			}
			if (logging.kind === "rejected")
				return { kind: "rejected", reason: logging.reason, message: `Cannot record this planning change: ${logging.reason}.` }
			const metadata: OrgTextEdit[] = [...(edit ? [edit] : []), ...removals]
			let changes: OrgTextEdit[]
			if (removals.length) {
				// Compose overlapping separator removals and timestamp changes on this one
				// original planning line, leaving every unrelated field/body byte intact.
				const ordered = metadata.sort((a, b) => a.from - b.from || a.to - b.to)
				const merged: OrgTextEdit[] = []
				for (const change of ordered) {
					const prior = merged.at(-1)
					if (prior && !prior.insert && !change.insert && prior.to >= change.from)
						merged[merged.length - 1] = { ...prior, to: Math.max(prior.to, change.to) }
					else merged.push(change)
				}
				let text = origin.content.slice(existing.lineFrom, existing.lineTo)
				for (const change of merged.reverse())
					text = text.slice(0, change.from - existing.lineFrom) + change.insert + text.slice(change.to - existing.lineFrom)
				changes = [{ from: existing.lineFrom, to: text.trim() ? existing.lineTo : existing.lineEnd, insert: text.trim() ? text : "", cursor: origin.cursor }]
			} else changes = metadata
			if (logging.kind === "edit") changes.push(...logging.edits)
			changes.sort((left, right) => left.from - right.from || left.to - right.to)
			let cursor = origin.cursor
			for (const change of changes) {
				if (change.to <= origin.cursor) cursor += change.insert.length - (change.to - change.from)
				else if (change.from < origin.cursor) cursor += change.from - origin.cursor + change.insert.length
			}
			return changes.length === 1 ? { kind: "edit", edit: { ...changes[0], cursor } } : { kind: "batch", batch: { changes, cursor } }
		},
	}
}
