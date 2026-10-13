import type { OrgBufferCommandPreparation } from "@/flows/org-command/org-buffer-command"
import { isOrgCalendarISO, readOrgDate, type OrgDateContext, type OrgDateResult } from "@/pipes/org/org-date-reader.pipe"
import { formatOrgLocalTimestamp } from "@/pipes/org/org-todo-logging.pipe"

/** Absolute inputs do not need a clock; relative values use one immutable local boundary. */
export const resolveOrgDateInput = (input: unknown, authority: OrgDateContext | (() => Date)): OrgDateResult => {
	if (typeof authority !== "function") return readOrgDate(input, authority)
	const absolute = readOrgDate(input)
	if (absolute.kind === "date" || !absolute.requiresContext) return absolute
	const captured = captureOrgCalendarContext(authority)
	return captured.kind === "error" ? captured : readOrgDate(input, captured.context)
}

/** Capture a default only after pure source validation and before allocating a session. */
export const prepareOrgPlanningDefault = (
	prepared: OrgBufferCommandPreparation,
	now: () => Date,
): OrgBufferCommandPreparation => {
	if (prepared.kind === "rejected" || readOrgDate(prepared.initialInput).kind === "date") return prepared
	const captured = captureOrgToday(now)
	if (captured.kind === "error")
		return { kind: "rejected", reason: "invalid-date", message: captured.message }
	return {
		...prepared,
		initialInput: captured.date,
		candidates: [...new Set([...prepared.candidates, captured.date])],
	}
}

/** Boundary-only conversion of an injected clock scalar to a local calendar day. */
export const systemOrgNow = () => new Date()
export const captureOrgToday = (now: () => Date): OrgDateResult => {
	try {
		const value = now()
		if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
			throw new Error("Invalid clock")
		const date = `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
		if (isOrgCalendarISO(date)) return { kind: "date", date }
	} catch {
		/* Clock failures are validation failures, not source changes. */
	}
	return { kind: "error", message: "Cannot read a valid local calendar day from the clock." }
}

/** One injected clock read keeps relative hours, calendar date and logging stamp coherent. */
export const captureOrgCalendarContext = (now: () => Date):
	| { readonly kind: "context"; readonly context: OrgDateContext }
	| { readonly kind: "error"; readonly message: string } => {
	try {
		const value = now()
		if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error("Invalid clock")
		const today = `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
		if (isOrgCalendarISO(today)) return {
			kind: "context",
			context: Object.freeze({
				today,
				now: `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`,
				logStamp: formatOrgLocalTimestamp(value),
			}),
		}
	} catch {
		/* Clock failure never supplies an invented timestamp. */
	}
	return { kind: "error", message: "Cannot read a valid local calendar date and time from the clock." }
}
