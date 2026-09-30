import { describe, expect, it } from "vitest"
import { createOrgPlanningCommand } from "./org-planning.command"
import type { OrgBufferCommandContext } from "./org-buffer-command"

const context = (content: string, cursor = 2): OrgBufferCommandContext => ({
	relativePath: "notes.org",
	content,
	cursor,
})
const apply = (content: string, date: string, kind: "SCHEDULED" | "DEADLINE" = "SCHEDULED") => {
	const origin = context(content)
	const result = createOrgPlanningCommand(kind, "2026-09-30").execute(origin, origin, date)
	if (result.kind !== "edit") throw new Error(`Expected edit, got ${result.kind}`)
	return content.slice(0, result.edit.from) + result.edit.insert + content.slice(result.edit.to)
}

describe("planning buffer commands", () => {
	it.each([
		"SCHEDULED",
		"DEADLINE",
	] as const)("initializes %s from its adjacent planning field", (kind) => {
		const source = context(
			`* Note\nCLOSED: [2026-09-01 Tue] ${kind}: <2026-09-27 Sun 12:30 +1w -2d>\nBody`,
		)
		expect(createOrgPlanningCommand(kind, "2026-09-30").prepare(source)).toMatchObject({
			kind: "ready",
			initialInput: "2026-09-27",
			candidates: ["2026-09-27", "2026-09-30"],
		})
	})
	it.each([
		"\n",
		"\r\n",
		"\r",
	])("preserves %j, Unicode, repeaters, warnings and unrelated fields", (newline) => {
		const content = [
			"* 中文",
			"SCHEDULED: <2026-09-27 Sun 12:30 +1w -2d> DEADLINE: <2026-10-02 Fri>",
			"body\u0000",
			"** Child",
		].join(newline)
		expect(apply(content, "2026-09-30")).toBe(content.replace("2026-09-27 Sun", "2026-09-30"))
	})
	it("adds a missing field without rewriting another planning field", () => {
		expect(
			apply(
				"* Note\nSCHEDULED: <2026-09-27 Sun>\n:PROPERTIES:\n:ID: abc\n:END:",
				"2026-10-01",
				"DEADLINE",
			),
		).toBe(
			"* Note\nSCHEDULED: <2026-09-27 Sun> DEADLINE: <2026-10-01>\n:PROPERTIES:\n:ID: abc\n:END:",
		)
	})
	it("uses the supplied default, not a body timestamp or child planning field", () => {
		const origin = context(
			"* Note\nBody SCHEDULED: <2026-08-01>\n** Child\nSCHEDULED: <2026-09-01>",
		)
		expect(createOrgPlanningCommand("SCHEDULED", "2026-09-30").prepare(origin)).toMatchObject({
			initialInput: "2026-09-30",
		})
	})
	it("preserves every byte on an unchanged date", () => {
		const origin = context("* Note\r\nSCHEDULED: <2026-09-30 Wed 10:30 ++1w -2d>\r\nbody")
		expect(
			createOrgPlanningCommand("SCHEDULED", "2026-09-30").execute(origin, origin, " 2026-09-30 "),
		).toEqual({ kind: "no-change", reason: "unchanged-date" })
	})
	it.each([
		"",
		"tomorrow",
		"2026-02-29",
		"2026-13-01",
		"2026-04-31",
		"2026-9-30",
	])("rejects invalid calendar date %j", (input) => {
		const origin = context("* Note")
		expect(
			createOrgPlanningCommand("DEADLINE", "2026-09-30").execute(origin, origin, input),
		).toMatchObject({ kind: "rejected", reason: "invalid-date" })
	})
	it.each([
		"SCHEDULED: <2026-09-30]",
		"SCHEDULED: <2026-09-30 ",
		"SCHEDULED: <2026-09-27> SCHEDULED: <2026-10-02>",
		"CLOSED: [2026-09-01 SCHEDULED: <2026-09-27>]",
		"SCHEDULED: <2026-02-29>",
	])("rejects ambiguous planning line %j without guessing", (line) => {
		const origin = context(`* Note\n${line}\nbody`)
		const command = createOrgPlanningCommand("SCHEDULED", "2026-09-30")
		expect(command.prepare(origin)).toMatchObject({ kind: "rejected", reason: "invalid-planning" })
		expect(command.execute(origin, origin, "2026-10-01")).toMatchObject({
			kind: "rejected",
			reason: "invalid-planning",
		})
	})

	it("accepts leap days and EOF without a newline", () => {
		expect(apply("* Note", "2028-02-29")).toBe("* Note\nSCHEDULED: <2028-02-29>")
	})
	it("keeps planning adjacent at a terminal lone CR and does not duplicate on retry", () => {
		const output = apply("* Note\r", "2026-10-01")
		expect(output).toBe("* Note\rSCHEDULED: <2026-10-01>\r")
		expect(
			createOrgPlanningCommand("SCHEDULED", "2026-09-30").prepare(context(output)),
		).toMatchObject({ initialInput: "2026-10-01" })
	})
	it.each([
		"周三",
		"星期三",
		"水曜日",
	])("removes stale localized weekday %s while retaining time and repeaters", (weekday) => {
		const source = `* Note\nSCHEDULED: <2026-09-30 ${weekday} 10:30 +1w>\nbody`
		expect(apply(source, "2026-10-01")).toBe("* Note\nSCHEDULED: <2026-10-01 10:30 +1w>\nbody")
	})
	it("rejects unsupported weekday text instead of silently retaining it", () => {
		expect(
			createOrgPlanningCommand("SCHEDULED", "2026-09-30").prepare(
				context("* Note\nSCHEDULED: <2026-09-30 Mittwoch>"),
			),
		).toMatchObject({ kind: "rejected", reason: "invalid-planning" })
	})

	it("rejects stale origin content and paths", () => {
		const origin = context("* Note")
		const command = createOrgPlanningCommand("SCHEDULED", "2026-09-30")
		expect(
			command.execute(origin, { ...origin, content: "* Changed" }, "2026-10-01"),
		).toMatchObject({ reason: "content-changed" })
		expect(
			command.execute(origin, { ...origin, relativePath: "other.org" }, "2026-10-01"),
		).toMatchObject({ reason: "path-changed" })
	})
	it("rejects preamble and mismatched, unterminated blocks", () => {
		const command = createOrgPlanningCommand("SCHEDULED", "2026-09-30")
		expect(command.prepare(context("Preamble\n* Note", 1))).toMatchObject({ reason: "no-heading" })
		const content = "* Note\n#+begin_src\n#+end_example\n* Fake"
		expect(command.prepare(context(content, content.length))).toMatchObject({
			reason: "inside-block",
		})
	})
})
