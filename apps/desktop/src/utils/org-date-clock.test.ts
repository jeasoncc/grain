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
		expect(resolveOrgDateInput("garbage", clock)).toMatchObject({ kind: "error" })
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
		expect(clock).not.toHaveBeenCalled()
	})
})
