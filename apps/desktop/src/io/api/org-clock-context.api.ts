import { invoke } from "@tauri-apps/api/core"
import { OrgSparseTreeContextRequiredError } from "@/pipes/org/org-sparse-tree.pipe"
import type { OrgSparseClockCalendarTime, OrgSparseClockContext } from "@/pipes/org/org-sparse-special-properties.pipe"

interface NativeClockSnapshot {
	readonly nowEpochMs: number
	readonly todayStartEpochMs: number
	readonly todayEndEpochMs: number
	readonly calendarEpochMs: readonly number[]
}

/** Actual native local calendar, never JS Date/Intl timezone normalization. */
export async function readOrgSparseClockContext(
	calendarTimes: readonly OrgSparseClockCalendarTime[], signal?: AbortSignal,
): Promise<OrgSparseClockContext> {
	if (signal?.aborted) throw new DOMException("Native clock read aborted", "AbortError")
	let result: NativeClockSnapshot
	try {
		result = await invoke<NativeClockSnapshot>("capture_org_match_clock_context", { calendarTimes })
	} catch (error) {
		throw new OrgSparseTreeContextRequiredError(error instanceof Error ? error.message : String(error), "clock")
	}
	if (signal?.aborted) throw new DOMException("Native clock read aborted", "AbortError")
	if (!result || !Number.isSafeInteger(result.nowEpochMs) || !Number.isSafeInteger(result.todayStartEpochMs)
		|| !Number.isSafeInteger(result.todayEndEpochMs) || result.todayEndEpochMs <= result.todayStartEpochMs
		|| !Array.isArray(result.calendarEpochMs) || result.calendarEpochMs.length !== calendarTimes.length
		|| result.calendarEpochMs.some(epoch => !Number.isSafeInteger(epoch))) {
		throw new OrgSparseTreeContextRequiredError("Native clock context returned an invalid exact calendar snapshot", "clock")
	}
	const encoded = new Map<string, number>()
	calendarTimes.forEach((time, index) => {
		const key = time.join(","), epoch = result.calendarEpochMs[index]
		if (encoded.has(key) && encoded.get(key) !== epoch) {
			throw new OrgSparseTreeContextRequiredError("Native ambiguous clock timestamp has conflicting captured occurrences", "clock")
		}
		encoded.set(key, epoch)
	})
	return Object.freeze({
		nowEpochMs: result.nowEpochMs,
		todayStartEpochMs: result.todayStartEpochMs,
		todayEndEpochMs: result.todayEndEpochMs,
		durationFormat: "gnu-default",
		includeClockingTask: false,
		activeClock: null,
		localTimeToEpochMs: (...time: OrgSparseClockCalendarTime): number => {
			const value = encoded.get(time.join(","))
			if (value === undefined) throw new OrgSparseTreeContextRequiredError("Clock timestamp has no captured native encoding", "clock")
			return value
		},
	})
}
