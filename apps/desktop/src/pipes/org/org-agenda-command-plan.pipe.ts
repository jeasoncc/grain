import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import type {
	OrgAgendaOperation,
	OrgAgendaOperationCapture,
	OrgAgendaOperationPlan,
} from "@/types/org/org-agenda-command.types"
import type { OrgAgendaEntry } from "./org-agenda.pipe"
import { validOrgDate } from "./org-text.pipe"
import { planOrgTodoTransition, validOrgLocalTimestamp } from "./org-todo-logging.pipe"

/** Narrow external commands and copy their payload before any asynchronous effects.
 * The caller captures the clock; this guard never reads it or authorizes a target.
 */
export const captureOrgAgendaOperation = (
	input: unknown,
	fallbackTimestamp?: string,
): OrgAgendaOperationCapture => {
	if (!input || typeof input !== "object" || !("kind" in input))
		return { kind: "rejected", message: "Unsupported agenda command." }
	if (input.kind === "cycle-todo") {
		const timestamp = "timestamp" in input ? input.timestamp : undefined
		const note = "note" in input ? input.note : undefined
		if (timestamp !== undefined && typeof timestamp !== "string")
			return { kind: "rejected", message: "Invalid local TODO timestamp." }
		const capturedTimestamp = timestamp ?? fallbackTimestamp
		if (typeof capturedTimestamp !== "string" || !validOrgLocalTimestamp(capturedTimestamp))
			return { kind: "rejected", message: "Invalid local TODO timestamp." }
		if (note !== undefined && typeof note !== "string")
			return { kind: "rejected", message: "Invalid TODO note." }
		return {
			kind: "captured",
			operation: Object.freeze({
				kind: "cycle-todo",
				timestamp: capturedTimestamp,
				...(note === undefined ? {} : { note }),
			}),
		}
	}
	if (input.kind === "prepare") {
		if (!("field" in input) || (input.field !== "schedule" && input.field !== "deadline"))
			return { kind: "rejected", message: "Unsupported agenda planning field." }
		return { kind: "captured", operation: Object.freeze({ kind: "prepare", field: input.field }) }
	}
	if (input.kind === "schedule" || input.kind === "deadline") {
		if (!("date" in input) || typeof input.date !== "string" || !validOrgDate(input.date))
			return { kind: "rejected", message: "Enter a real calendar date in YYYY-MM-DD format." }
		return { kind: "captured", operation: Object.freeze({ kind: input.kind, date: input.date }) }
	}
	return { kind: "rejected", message: "Unsupported agenda command." }
}

/** Clone before freezing, so caller-owned entries and nested anchors remain untouched. */
export const freezeOrgAgendaEntrySnapshot = (entry: OrgAgendaEntry): OrgAgendaEntry => {
	const snapshot = structuredClone(entry)
	const freeze = (value: object): void => {
		Object.values(value).forEach((child) => {
			if (child && typeof child === "object" && !Object.isFrozen(child)) freeze(child)
		})
		Object.freeze(value)
	}
	freeze(snapshot)
	return snapshot
}

/** Pure source-range planning, shared by preparation and execution before any allocation. */
export const planAgendaOperation = (
	entry: OrgAgendaEntry,
	raw: string,
	operation: OrgAgendaOperation,
): OrgAgendaOperationPlan => {
	if (!entry.origin?.heading)
		return { kind: "rejected", message: "This agenda entry has no actionable heading." }
	if (operation.kind === "cycle-todo") {
		const plan = planOrgTodoTransition(
			raw,
			entry.origin.heading.from,
			operation.timestamp ?? "",
			operation.note,
		)
		if (plan.kind === "needs-note")
			return { kind: "needs-note", entry: freezeOrgAgendaEntrySnapshot(entry) }
		return plan.kind === "edit"
			? plan
			: plan.kind === "noop"
				? { kind: "unchanged" }
				: { kind: "rejected", message: `Cannot change TODO state: ${plan.reason}.` }
	}
	const field = operation.kind === "prepare" ? operation.field : operation.kind
	const planner = createOrgPlanningCommand(field === "schedule" ? "SCHEDULED" : "DEADLINE", "")
	const context = {
		relativePath: entry.relativePath,
		content: raw,
		cursor: entry.origin.heading.from,
	}
	if (operation.kind === "prepare") {
		const prepared = planner.prepare(context)
		return prepared.kind === "rejected"
			? { kind: "rejected", message: prepared.message }
			: { kind: "ready", entry, date: prepared.initialInput || null }
	}
	const result = planner.execute(context, context, operation.date)
	return result.kind === "edit"
		? { kind: "edit", edits: [result.edit] }
		: result.kind === "no-change"
			? { kind: "unchanged" }
			: {
					kind: "rejected",
					message: result.kind === "rejected" ? result.message : "Unsupported agenda command.",
				}
}
