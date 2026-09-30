import { parseOrgPlanningLine } from "@/pipes/org/org-planning-line.pipe"
import {
	headingPositionAt,
	setOrgPlanningAt,
	validOrgDate,
	type OrgPlanningKind,
} from "@/pipes/org/org-text.pipe"
import {
	guardOrgCommandOrigin,
	guardOrgHeadingCommand,
	type OrgBufferCommand,
	type OrgBufferCommandContext,
	type OrgBufferCommandRejected,
} from "./org-buffer-command"

/** Read only the adjacent planning line using the same source-range parser as the writer. */
const planningAt = (
	context: OrgBufferCommandContext,
	kind: OrgPlanningKind,
): { readonly date: string | null } | OrgBufferCommandRejected => {
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
	return {
		date:
			planning.kind === "planning"
				? (planning.fields.find((field) => field.kind === kind)?.date ?? null)
				: null,
	}
}
const isRejected = (
	value: { readonly date: string | null } | OrgBufferCommandRejected,
): value is OrgBufferCommandRejected => "kind" in value

/** Calendar policy is supplied explicitly by the caller; no clock or IO in this command. */
export const createOrgPlanningCommand = (
	kind: OrgPlanningKind,
	defaultDate: string,
): OrgBufferCommand => {
	const label = kind === "SCHEDULED" ? "Schedule" : "Deadline"
	return {
		id: `org.heading.${kind.toLowerCase()}`,
		prompt: `${label} (YYYY-MM-DD):`,
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
				initialInput: existing.date ?? defaultDate,
				candidates: [
					...new Set(
						[existing.date, defaultDate].filter(
							(date): date is string => date !== null && validOrgDate(date),
						),
					),
				],
			}
		},
		execute: (origin, current, input) => {
			const guard = guardOrgCommandOrigin(origin, current) ?? guardOrgHeadingCommand(origin)
			if (guard) return guard
			const existing = planningAt(origin, kind)
			if (isRejected(existing)) return existing
			const date = input.trim()
			if (!validOrgDate(date))
				return {
					kind: "rejected",
					reason: "invalid-date",
					message: "Enter a real calendar date in YYYY-MM-DD format (for example, 2026-09-30).",
				}
			// A no-op must not strip an existing weekday, time, repeater or warning.
			if (existing.date === date) return { kind: "no-change", reason: "unchanged-date" }
			const edit = setOrgPlanningAt(origin.content, origin.cursor, kind, date)
			return edit
				? { kind: "edit", edit }
				: {
						kind: "rejected",
						reason: "no-heading",
						message: "The cursor does not belong to an Org heading.",
					}
		},
	}
}
