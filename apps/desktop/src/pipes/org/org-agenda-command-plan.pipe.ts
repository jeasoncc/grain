import * as E from "fp-ts/Either"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION, parseOrgBehaviorConfiguration } from "./org-behavior-configuration.pipe"
import type { OrgLoggingPolicyOptions } from "./org-logging-policy.pipe"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import { createOrgTodoStateCommand } from "@/flows/org-command/org-todo-state.command"
import type {
	OrgAgendaOperation,
	OrgAgendaOperationCapture,
	OrgAgendaOperationPlan,
} from "@/types/org/org-agenda-command.types"
import type { OrgAgendaEntry } from "./org-agenda.pipe"
import { isOrgCalendarISO, readOrgDate, type OrgDateContext } from "./org-date-reader.pipe"
import { planOrgTodoTransition, validOrgLocalTimestamp } from "./org-todo-logging.pipe"
import { planOrgClockEdit, reportOrgClockTotals } from "./org-clock.pipe"

/** Narrow external commands and copy their payload before any asynchronous effects.
 * The caller captures the clock; this guard never reads it or authorizes a target.
 */
export const captureOrgAgendaOperation = (
	input: unknown,
	fallbackTimestamp?: string,
): OrgAgendaOperationCapture => {
	if (!input || typeof input !== "object" || !("kind" in input))
		return { kind: "rejected", message: "Unsupported agenda command." }
	let options: OrgLoggingPolicyOptions = {}
	if ("logging" in input || "inheritance" in input) {
		try {
			const parsed = parseOrgBehaviorConfiguration(JSON.stringify({
				...DEFAULT_ORG_BEHAVIOR_CONFIGURATION,
				...("logging" in input ? { logging: input.logging } : {}),
				...("inheritance" in input ? { inheritance: input.inheritance } : {}),
			}))
			if (E.isLeft(parsed)) return { kind: "rejected", message: parsed.left.message }
			options = Object.freeze({
				...("logging" in input ? { logging: parsed.right.logging } : {}),
				...("inheritance" in input ? { inheritance: parsed.right.inheritance } : {}),
			})
		} catch {
			return { kind: "rejected", message: "Invalid agenda logging configuration." }
		}
	}
	if (input.kind === "clock-report") return { kind: "captured", operation: Object.freeze({ kind: "clock-report" }) }
	if (input.kind === "clock-in" || input.kind === "clock-out" || input.kind === "cancel-clock") {
		if (!("clockContext" in input) || !input.clockContext || typeof input.clockContext !== "object")
			return { kind: "rejected", message: "Clock operation requires its Root-captured context." }
		const context = input.clockContext
		if (!("stamp" in context) || typeof context.stamp !== "string" || !validOrgLocalTimestamp(context.stamp))
			return { kind: "rejected", message: "Invalid captured Clock timestamp." }
		const elapsedMinutes = "elapsedMinutes" in context ? context.elapsedMinutes : undefined
		const expected = "expectedActiveClock" in context ? context.expectedActiveClock : undefined
		if (elapsedMinutes !== undefined && (typeof elapsedMinutes !== "number" || !Number.isSafeInteger(elapsedMinutes) || elapsedMinutes < 0 || !expected))
			return { kind: "rejected", message: "Invalid captured Clock epoch duration." }
		let expectedActiveClock: { readonly from: number; readonly start: string } | undefined
		if (expected !== undefined) {
			if (!expected || typeof expected !== "object" || !("from" in expected) || typeof expected.from !== "number" ||
				!Number.isInteger(expected.from) || !("start" in expected) || typeof expected.start !== "string")
				return { kind: "rejected", message: "Invalid captured active Clock identity." }
			expectedActiveClock = Object.freeze({ from: expected.from, start: expected.start })
		}
		return { kind: "captured", operation: Object.freeze({ kind: input.kind, clockContext: Object.freeze({
			stamp: context.stamp, ...(elapsedMinutes === undefined ? {} : { elapsedMinutes }),
			...(expectedActiveClock === undefined ? {} : { expectedActiveClock }),
		}) }) }
	}
	if (input.kind === "cycle-todo" || input.kind === "todo-state" || input.kind === "complete-repeating") {
		const timestamp = "timestamp" in input ? input.timestamp : undefined
		const note = "note" in input ? input.note : undefined
		const repeatToState = "repeatToState" in input ? input.repeatToState : undefined
		const state = "state" in input ? input.state : undefined
		if (input.kind === "todo-state" && (typeof state !== "string" || state.length > 512))
			return { kind: "rejected", message: "Invalid TODO state." }
		if (repeatToState !== undefined && typeof repeatToState !== "string" && typeof repeatToState !== "boolean")
			return { kind: "rejected", message: "Invalid TODO repeat state." }
		if (timestamp !== undefined && typeof timestamp !== "string")
			return { kind: "rejected", message: "Invalid local TODO timestamp." }
		const capturedTimestamp = timestamp ?? fallbackTimestamp
		if (typeof capturedTimestamp !== "string" || !validOrgLocalTimestamp(capturedTimestamp))
			return { kind: "rejected", message: "Invalid local TODO timestamp." }
		if (note !== undefined && typeof note !== "string")
			return { kind: "rejected", message: "Invalid TODO note." }
		const fields = {
			...options, timestamp: capturedTimestamp,
			...(note === undefined ? {} : { note }),
			...(repeatToState === undefined ? {} : { repeatToState }),
		}
		return input.kind === "todo-state"
			? { kind: "captured", operation: Object.freeze({ ...fields, kind: "todo-state", state: state as string }) }
			: { kind: "captured", operation: Object.freeze({ ...fields, kind: input.kind }) }
	}
	if (input.kind === "prepare") {
		if (!("field" in input) || (input.field !== "schedule" && input.field !== "deadline" && input.field !== "todo-state"))
			return { kind: "rejected", message: "Unsupported agenda preparation." }
		return { kind: "captured", operation: Object.freeze({ kind: "prepare", field: input.field }) }
	}
	if (input.kind === "schedule" || input.kind === "deadline" || input.kind === "remove-schedule" || input.kind === "remove-deadline") {
		const date = "date" in input ? input.date : undefined
		const supplied = "context" in input ? input.context : undefined
		let context: OrgDateContext | undefined
		if (supplied !== undefined) {
			if (!supplied || typeof supplied !== "object" || !("today" in supplied) || !isOrgCalendarISO(supplied.today))
				return { kind: "rejected", message: "Invalid agenda calendar context." }
			const scalars = ["now", "defaultDate", "defaultTime", "logStamp", "note"] as const
			for (const key of scalars)
				if (Reflect.get(supplied, key) !== undefined && typeof Reflect.get(supplied, key) !== "string")
					return { kind: "rejected", message: "Invalid agenda calendar context." }
			const value = supplied as OrgDateContext
			if (value.logStamp !== undefined && !validOrgLocalTimestamp(value.logStamp))
				return { kind: "rejected", message: "Invalid agenda logging timestamp." }
			if (value.policy && (value.policy.preferFuture !== true && value.policy.preferFuture !== false && value.policy.preferFuture !== "time" || typeof value.policy.forceCompatibleYears !== "boolean"))
				return { kind: "rejected", message: "Invalid agenda date reader policy." }
			context = Object.freeze({
				today: value.today,
				...(value.now === undefined ? {} : { now: value.now }),
				...(value.defaultDate === undefined ? {} : { defaultDate: value.defaultDate }),
				...(value.defaultTime === undefined ? {} : { defaultTime: value.defaultTime }),
				...(value.logStamp === undefined ? {} : { logStamp: value.logStamp }),
				...(value.note === undefined ? {} : { note: value.note }),
				...(value.policy === undefined ? {} : { policy: Object.freeze({ ...value.policy }) }),
			})
		}
		if (input.kind === "remove-schedule" || input.kind === "remove-deadline")
			return { kind: "captured", operation: Object.freeze({ kind: input.kind, ...options, ...(context ? { context } : {}) }) }
		if (typeof date !== "string")
			return { kind: "rejected", message: "Enter a valid Org timestamp." }
		const parsed = readOrgDate(date, context)
		if (parsed.kind === "error") return { kind: "rejected", message: parsed.message }
		return { kind: "captured", operation: Object.freeze({ kind: input.kind, date, ...options, ...(context ? { context } : {}) }) }
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
	if (operation.kind === "clock-report") {
		const report = reportOrgClockTotals(raw)
		return report.kind === "rejected" ? report : { kind: "report", report }
	}
	if (operation.kind === "clock-in" || operation.kind === "clock-out" || operation.kind === "cancel-clock") {
		const plan = planOrgClockEdit(raw, entry.origin.heading.from, operation.kind, operation.clockContext)
		return plan.kind === "edit"
			? { kind: "edit", edits: plan.batch.changes.map(change => ({ ...change, cursor: plan.batch.cursor })) }
			: plan
	}
	if (operation.kind === "cycle-todo" || operation.kind === "todo-state" || operation.kind === "complete-repeating") {
		const plan = planOrgTodoTransition(
			raw,
			entry.origin.heading.from,
			operation.timestamp ?? "",
			operation.note,
			{ repeatToState: operation.repeatToState, logging: operation.logging, inheritance: operation.inheritance,
				...(operation.kind === "todo-state" ? { state: operation.state } : {}),
				finalCompletion: operation.kind === "complete-repeating" },
		)
		if (plan.kind === "needs-note")
			return { kind: "needs-note", entry: freezeOrgAgendaEntrySnapshot(entry), command: Object.freeze({ ...operation }) }
		return plan.kind === "edit"
			? plan
			: plan.kind === "noop"
				? { kind: "unchanged" }
				: { kind: "rejected", message: `Cannot change TODO state: ${plan.reason}.` }
	}
	const context = {
		relativePath: entry.relativePath,
		content: raw,
		cursor: entry.origin.heading.from,
	}
	if (operation.kind === "prepare" && operation.field === "todo-state") {
		const prepared = createOrgTodoStateCommand().prepare(context)
		return prepared.kind === "rejected"
			? { kind: "rejected", message: prepared.message }
			: { kind: "ready", entry, date: null, states: prepared.candidates, initialInput: prepared.initialInput }
	}
	if (operation.kind !== "prepare" && operation.kind !== "schedule" && operation.kind !== "deadline" &&
		operation.kind !== "remove-schedule" && operation.kind !== "remove-deadline")
		return { kind: "rejected", message: "Unsupported agenda command." }
	const field = operation.kind === "prepare" ? operation.field :
		operation.kind === "remove-schedule" ? "schedule" : operation.kind === "remove-deadline" ? "deadline" : operation.kind
	const remove = operation.kind === "remove-schedule" || operation.kind === "remove-deadline"
	const planner = createOrgPlanningCommand(field === "schedule" ? "SCHEDULED" : "DEADLINE", "", undefined,
		remove ? "remove" : "set", operation.kind === "prepare" ? {} : operation)
	if (operation.kind === "prepare") {
		const prepared = planner.prepare(context)
		return prepared.kind === "rejected"
			? { kind: "rejected", message: prepared.message }
			: { kind: "ready", entry, date: prepared.initialInput || null }
	}
	const result = planner.execute(context, context, "date" in operation ? operation.date : "", operation.context)
	if (result.kind === "needs-note")
		return {
			kind: "needs-note", entry: freezeOrgAgendaEntrySnapshot(entry),
			command: Object.freeze({ ...operation, ...(result.request.context ? { context: result.request.context } : {}),
				...("date" in operation ? { date: result.request.input ?? operation.date } : {}) }),
		}
	if (result.kind === "batch") return { kind: "edit", edits: result.batch.changes.map((change) => ({ ...change, cursor: result.batch.cursor })) }
	if (result.kind === "edit") return { kind: "edit", edits: [result.edit] }
	return result.kind === "no-change"
		? { kind: "unchanged" }
		: { kind: "rejected", message: result.kind === "rejected" ? result.message : "Unsupported agenda command." }
}
