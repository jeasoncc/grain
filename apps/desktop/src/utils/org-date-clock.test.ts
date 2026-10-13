import { describe, expect, it, vi } from "vitest"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"
import { captureOrgToday, prepareOrgPlanningDefault, resolveOrgDateInput } from "./org-date-clock"

describe("Org clock boundary", () => {
	it.each([
		() => new Date(NaN),
		() => {
			throw new Error("clock offline")
		},
	])("rejects failed clocks instead of opening an empty default", (clock) => {
		expect(captureOrgToday(clock)).toMatchObject({ kind: "error" })
		const prepared = createOrgPlanningCommand("SCHEDULED", "").prepare({
			relativePath: "a.org",
			content: "* Note",
			cursor: 2,
		})
		expect(prepareOrgPlanningDefault(prepared, clock)).toMatchObject({
			kind: "rejected",
			reason: "invalid-date",
		})
		expect(resolveOrgDateInput("tomorrow", clock)).toMatchObject({ kind: "error" })
	})
	it("never captures a clock for absolute, invalid raw, existing ISO, or rejected source", () => {
		const clock = vi.fn(() => {
			throw new Error("must not capture")
		})
		expect(resolveOrgDateInput("2026-09-30", clock)).toEqual({ kind: "date", date: "2026-09-30" })
		for (const input of ["garbage", "2026-02-30", "<2026-09-30]", "tomorrow evening", "25:00", {}])
			expect(resolveOrgDateInput(input, clock)).toMatchObject({ kind: "error" })
		for (const content of [
			"* Note\nSCHEDULED: <2026-09-30 Wed>",
			"* Note\nscheduled: <2026-09-30 Wed>",
		]) {
			const prepared = createOrgPlanningCommand("SCHEDULED", "").prepare({
				relativePath: "a.org",
				content,
				cursor: 2,
			})
			expect(prepareOrgPlanningDefault(prepared, clock)).toBe(prepared)
		}
		const rejected = createOrgPlanningCommand("SCHEDULED", "").prepare({
			relativePath: "a.org", content: "preamble", cursor: 0,
		})
		expect(prepareOrgPlanningDefault(rejected, clock)).toBe(rejected)
		expect(clock).not.toHaveBeenCalled()
	})
	it("resolves relative rich inputs using the accepted clock without losing endpoint clocks", () => {
		const clock = () => new Date(2026, 8, 30, 23, 59)
		expect(resolveOrgDateInput("+2h", clock)).toMatchObject({
			kind: "date", timestamp: { date: "2026-10-01", time: "01:59" },
		})
		expect(resolveOrgDateInput("<tomorrow 08:00-10:30>--<2026-10-02 11:00>", clock)).toMatchObject({
			kind: "date", timestamp: { date: "2026-10-01", time: "08:00", endTime: "10:30", endDate: "2026-10-02", endDateTime: "11:00" },
		})
	})
	it("uses supplied immutable contexts synchronously without any clock boundary", () => {
		const supplied = Object.freeze({ today: "2026-10-10", now: "04:20", policy: Object.freeze({ preferFuture: "time" as const, forceCompatibleYears: true }) })
		expect(resolveOrgDateInput("00:01", supplied)).toMatchObject({ kind: "date", date: "2026-10-11" })
		expect(resolveOrgDateInput("2040-02-29", supplied)).toEqual({ kind: "date", date: "2037-03-01", forcedYear: { requested: 2040, actual: 2037 } })
		expect(resolveOrgDateInput("00:01", { today: "2026-10-10", policy: { preferFuture: "time", forceCompatibleYears: false } })).toMatchObject({ kind: "error", requiresContext: true })
	})
})
