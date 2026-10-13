import { describe, expect, it } from "vitest"
import { parseOrgPlanningLine } from "./org-planning-line.pipe"
import { setOrgPlanningAt } from "./org-text.pipe"

describe("planning source ranges", () => {
	it("retains exact valid timestamp source ranges", () => {
		const text =
			"\tCLOSED: [2026-09-01 Tue]  SCHEDULED: <2026-09-30 Wed 10:30 +1w -2d> DEADLINE: <2026-10-01 Thu>  "
		const parsed = parseOrgPlanningLine(text)
		if (parsed.kind !== "planning") throw new Error("Expected planning line")
		expect(parsed.fields.map((field) => field.kind)).toEqual(["CLOSED", "SCHEDULED", "DEADLINE"])
		for (const field of parsed.fields) {
			expect(text.slice(field.dateFrom, field.dateFrom + 10)).toBe(field.date)
			expect(text.slice(field.timestampFrom, field.timestampTo)).toBe(field.timestamp)
			expect(text.slice(field.dateFrom, field.dateAndWeekdayTo)).toMatch(
				/^\d{4}-\d{2}-\d{2} [A-Za-z]{3}$/,
			)
		}
	})
	it.each([
		"scheduled",
		"Scheduled",
		"deadline",
		"DeadLine",
		"closed",
		"Closed",
	])("rejects noncanonical known field %s at the start or after opaque text", (field) => {
		for (const line of [
			`\t${field}: <2026-09-30>`,
			`SCHEDULED: <2026-09-30> ${field}: <2026-10-01>`,
			`CLOSED: [2026-09-01] custom ${field}: <2026-10-01>`,
		]) {
			expect(parseOrgPlanningLine(line)).toMatchObject({
				kind: "invalid",
			})
		}
	})
	it("rejects opaque text inside timestamps but preserves opaque text outside them", () => {
		expect(
			parseOrgPlanningLine("CLOSED: [2026-09-01 Tue scheduled: text] custom <deadline: text>"),
		).toMatchObject({ kind: "invalid" })
		expect(
			parseOrgPlanningLine("CLOSED: [2026-09-01 Tue] custom <deadline: text>"),
		).toMatchObject({ kind: "planning", fields: [{ kind: "CLOSED" }] })
		expect(parseOrgPlanningLine("body scheduled: <2026-09-30>")).toEqual({ kind: "none" })
		expect(parseOrgPlanningLine("UNKNOWN: <2026-09-30>")).toEqual({ kind: "none" })
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

	it("does not guess a writable field inside malformed timestamp details", () => {
		const content = "* Note\nCLOSED: [2026-09-01 Tue SCHEDULED: text]\nbody"
		expect(() => setOrgPlanningAt(content, 2, "SCHEDULED", "2026-10-01")).toThrow()
	})
	it("replaces complete rich timestamp ranges without rewriting adjacent bytes", () => {
		const content = "* Note\r\n\tSCHEDULED:\t<2026-09-30 Wed 10:30 +1w>--<2026-10-02 Fri 11:30>  opaque\0 DEADLINE: <2026-12-01 Tue>\r\nbody"
		const edit = setOrgPlanningAt(content, 2, "SCHEDULED", { date: "2026-10-01", time: "09:00", endTime: "10:00", repeater: { mode: ".+", value: 1, unit: "m" }, warning: { mode: "-", value: 3, unit: "d" } })!
		expect(content.slice(0, edit.from) + edit.insert + content.slice(edit.to)).toBe(
			content.replace("<2026-09-30 Wed 10:30 +1w>--<2026-10-02 Fri 11:30>", "<2026-10-01 09:00-10:00 .+1m -3d>"),
		)
		const parsed = parseOrgPlanningLine(content.split("\r\n")[1])
		if (parsed.kind !== "planning") throw new Error("Expected planning line")
		expect(parsed.fields[0].timestamp).toBe("<2026-09-30 Wed 10:30 +1w>--<2026-10-02 Fri 11:30>")
	})
})
