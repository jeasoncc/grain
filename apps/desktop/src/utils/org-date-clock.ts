import type { OrgBufferCommandPreparation } from "@/flows/org-command/org-buffer-command"
import { isOrgCalendarISO, readOrgDate, type OrgDateResult } from "@/pipes/org/org-date-reader.pipe"

/** Resolve only recognized relative grammar against an accept-time clock. */
export const resolveOrgDateInput = (input: unknown, now: () => Date): OrgDateResult => {
	const absolute = readOrgDate(input)
	if (absolute.kind === "date") return absolute
	if (readOrgDate(input, { today: "2000-06-15" }).kind === "error") return absolute
	const today = captureOrgToday(now)
	return today.kind === "error" ? today : readOrgDate(input, { today: today.date })
}

/** Capture a default only after pure source validation and before allocating a session. */
export const prepareOrgPlanningDefault = (
	prepared: OrgBufferCommandPreparation,
	now: () => Date,
): OrgBufferCommandPreparation => {
	if (prepared.kind === "rejected" || isOrgCalendarISO(prepared.initialInput)) return prepared
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
