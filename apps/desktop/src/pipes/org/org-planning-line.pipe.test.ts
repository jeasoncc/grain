import { describe, expect, it } from "vitest"
import { parseOrgPlanningLine } from "./org-planning-line.pipe"
import { setOrgPlanningAt } from "./org-text.pipe"

describe("planning source ranges", () => {
	it("retains exact ranges and ignores field names inside timestamp details", () => {
		const text =
			"\tCLOSED: [2026-09-01 Tue]  SCHEDULED: <2026-09-30 Wed 10:30 +1w -2d> DEADLINE: <2026-10-01 Thu>  "
		const parsed = parseOrgPlanningLine(text)
		if (parsed.kind !== "planning") throw new Error("Expected planning line")
		expect(parsed.fields.map((field) => field.kind)).toEqual(["CLOSED", "SCHEDULED", "DEADLINE"])
		for (const field of parsed.fields) {
			expect(text.slice(field.dateFrom, field.dateFrom + 10)).toBe(field.date)
			expect(text.slice(field.dateFrom, field.dateAndWeekdayTo)).toMatch(
				/^\d{4}-\d{2}-\d{2} [A-Za-z]{3}$/,
			)
		}
	})
	it("does not misread a body line as planning", () => {
		expect(parseOrgPlanningLine("text SCHEDULED: <2026-09-30>")).toEqual({ kind: "none" })
	})
	it.each([
		"SCHEDULED: <2026-09-30]",
		"SCHEDULED: [2026-09-30>",
		"SCHEDULED: <2026-09-30 ",
		"SCHEDULED: <2026-09-30> SCHEDULED: <2026-10-01>",
		"CLOSED: [2026-09-01 SCHEDULED: <2026-09-27>]",
	])("makes malformed/ambiguous %j unwritable through the date pipe", (line) => {
		expect(parseOrgPlanningLine(line)).toMatchObject({ kind: "invalid" })
		expect(() => setOrgPlanningAt(`* Note\n${line}\nbody`, 2, "SCHEDULED", "2026-10-01")).toThrow()
	})
	it("preserves opaque text while recognizing only top-level fields", () => {
		const content =
			"* Note\nCLOSED: [2026-09-01 Tue] custom <SCHEDULED: text> DEADLINE: <2026-10-01 Thu>\nbody"
		const edit = setOrgPlanningAt(content, 2, "SCHEDULED", "2026-10-02")!
		expect(content.slice(0, edit.from) + edit.insert + content.slice(edit.to)).toBe(
			content.replace("\nbody", " SCHEDULED: <2026-10-02>\nbody"),
		)
		expect(
			parseOrgPlanningLine("SCHEDULED: <2026-09-30> custom SCHEDULED: <2026-10-01>"),
		).toMatchObject({ kind: "invalid" })
	})

	it("does not mutate a field name in timestamp details", () => {
		const content = "* Note\nCLOSED: [2026-09-01 Tue SCHEDULED: text]\nbody"
		const edit = setOrgPlanningAt(content, 2, "SCHEDULED", "2026-10-01")!
		expect(content.slice(0, edit.from) + edit.insert + content.slice(edit.to)).toBe(
			"* Note\nCLOSED: [2026-09-01 Tue SCHEDULED: text] SCHEDULED: <2026-10-01>\nbody",
		)
	})
})
