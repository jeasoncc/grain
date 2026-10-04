import { readOrgDate, type OrgDateContext } from "@/pipes/org/org-date-reader.pipe"
import { parseOrgPlanningLine } from "@/pipes/org/org-planning-line.pipe"
import {
	headingPositionAt,
	orgPropertyDrawerAt,
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
	dateContext?: OrgDateContext,
): OrgBufferCommand => {
	// Own the supplied scalar snapshot; callers may reuse or mutate their context object.
	const preparedDateContext = dateContext ? Object.freeze({ today: dateContext.today }) : undefined
	const label = kind === "SCHEDULED" ? "Schedule" : "Deadline"
	return {
		id: `org.heading.${kind.toLowerCase()}`,
		prompt: `${label} (YYYY-MM-DD / today / +3d / next mon):`,
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
			const acceptedDateContext = acceptedContext
				? Object.freeze({ today: acceptedContext.today })
				: preparedDateContext
			const parsed = readOrgDate(input, acceptedDateContext)
			if (parsed.kind === "error")
				return {
					kind: "rejected",
					reason: "invalid-date",
					message: parsed.message,
				}
			const date = parsed.date
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
