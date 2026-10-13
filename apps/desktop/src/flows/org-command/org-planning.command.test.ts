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
	it("requires explicit relative context without changing the two-argument ISO API", () => {
		const origin = context("* Note\nSCHEDULED: <2026-09-30 Wed 12:30 +1w>\n")
		const command = createOrgPlanningCommand("SCHEDULED", "2026-09-30")
		expect(command.execute(origin, origin, "today")).toMatchObject({
			kind: "rejected",
			reason: "invalid-date",
		})
		expect(command.execute(origin, origin, "2026-09-30")).toEqual({
			kind: "no-change",
			reason: "unchanged-date",
		})
		expect(command.execute(origin, origin, "明天", { today: "2026-09-30" })).toMatchObject({
			kind: "edit",
			edit: { insert: "2026-10-01" },
		})
	})
	it.each([
		"SCHEDULED",
		"DEADLINE",
	] as const)("initializes %s from its adjacent planning field", (kind) => {
		const source = context(
			`* Note\nCLOSED: [2026-09-01 Tue] ${kind}: <2026-09-27 Sun 12:30 +1w -2d>\nBody`,
		)
		expect(createOrgPlanningCommand(kind, "2026-09-30").prepare(source)).toMatchObject({
			kind: "ready",
			initialInput: "<2026-09-27 Sun 12:30 +1w -2d>",
			candidates: ["today", "tomorrow", "+3d", "next mon", "2026-09-27", "2026-09-30"],
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

	it.each([
		":PROPERTIES:\n:ID: abc",
		":PROPERTIES:\n:PROPERTIES:\n:END:",
		":PROPERTIES:\n:END: value\n:END:",
		":PROPERTIES: value\n:END:",
		":END:",
		"SCHEDULED: <2026-09-30>\n:END:",
	])("rejects damaged drawers and reserved markers %j, even for an unchanged date", (body) => {
		const origin = context(`* Note\n${body}`)
		const command = createOrgPlanningCommand("SCHEDULED", "2026-09-30")
		expect(command.prepare(origin)).toMatchObject({ kind: "rejected", reason: "invalid-drawer" })
		expect(command.execute(origin, origin, "2026-09-30")).toMatchObject({
			kind: "rejected",
			reason: "invalid-drawer",
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
		).toMatchObject({ initialInput: "<2026-10-01>" })
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

	it("owns its date snapshot despite adversarial caller mutation", () => {
		const source = context("* Note")
		const supplied = { today: "2026-09-30" }
		const command = createOrgPlanningCommand("SCHEDULED", supplied.today, supplied)
		expect(command.prepare(source)).toMatchObject({ kind: "ready" })
		supplied.today = "2026-10-20"
		const result = command.execute(source, source, "tomorrow")
		expect(result).toMatchObject({
			kind: "edit",
			edit: { insert: expect.stringContaining("2026-10-01") },
		})
		const accept = { today: "2026-10-01" }
		expect(command.execute(source, source, "tomorrow", accept)).toMatchObject({
			kind: "edit",
			edit: { insert: expect.stringContaining("2026-10-02") },
		})
		expect(accept).toEqual({ today: "2026-10-01" })
		expect(
			command.execute(source, { ...source, content: "* Changed" }, "tomorrow", accept),
		).toMatchObject({ reason: "content-changed" })
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
	it("applies time/range/repeater/warning intent instead of reducing it to a date", () => {
		const source = "* Note\r\nSCHEDULED: <2026-09-30 Wed 10:30 +1w -2d>  raw\0 DEADLINE: <2026-10-02 Fri>\r\nbody"
		expect(apply(source, "2026-09-30 11am-1:15pm ++2w --3d")).toBe(
			source.replace("<2026-09-30 Wed 10:30 +1w -2d>", "<2026-09-30 11:00-13:15 ++2w --3d>"),
		)
		expect(apply(source, "<2026-10-01 10:30 .+1m -3d>--<2026-10-03 12:00>")).toBe(
			source.replace("<2026-09-30 Wed 10:30 +1w -2d>", "<2026-10-01 10:30 .+1m -3d>--<2026-10-03 12:00>"),
		)
	})
	it("accepts the exact initial rich stamp without normalizing unrelated raw bytes", () => {
		const source = context("* Note\r\nSCHEDULED: <2026-09-30\tWed 10:30  ++1w -2d>\rbody")
		const command = createOrgPlanningCommand("SCHEDULED", "2026-09-30")
		const prepared = command.prepare(source)
		if (prepared.kind !== "ready") throw new Error(prepared.message)
		expect(command.execute(source, source, prepared.initialInput)).toMatchObject({ kind: "no-change" })
	})
	it("stages reschedule notes before any edits and returns one original-source batch", () => {
		const source = "#+STARTUP: lognotereschedule\n* Note\nSCHEDULED: <2026-09-30 Wed +1w>\nbody\n"
		const origin = context(source, source.indexOf("* Note") + 2)
		const command = createOrgPlanningCommand("SCHEDULED", "2026-09-30")
		const accepted = { today: "2026-09-30", now: "12:00", logStamp: "[2026-09-30 Wed 12:00]" }
		expect(command.execute(origin, origin, "2026-10-01", accepted)).toMatchObject({
			kind: "needs-note",
			request: { stamp: accepted.logStamp, operation: { kind: "reschedule", previous: "<2026-09-30 Wed +1w>", next: "<2026-10-01 +1w>" } },
		})
		const result = command.execute(origin, origin, "2026-10-01", { ...accepted, note: "literal 😀\r\n* not a heading\0" })
		if (result.kind !== "batch") throw new Error(`Expected batch, got ${result.kind}`)
		let output = source
		for (const edit of [...result.batch.changes].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(output).toContain("SCHEDULED: <2026-10-01 +1w>")
		expect(output).toContain("Rescheduled from")
		expect(output).toContain(accepted.logStamp)
		expect(command.execute(origin, { ...origin, content: output }, "2026-10-01", { ...accepted, note: "note" })).toMatchObject({ reason: "content-changed" })
	})
})

describe("planning metadata and removal source batches", () => {
	it("removes CLOSED atomically even when accepting the same scheduled date", () => {
		const source = "* DONE owned\r\nCLOSED:\t[2026-09-30 Wed 08:00]  SCHEDULED: <2026-09-30 Wed +1w>\rbody"
		const origin = context(source)
		const result = createOrgPlanningCommand("SCHEDULED", "").execute(origin, origin, "2026-09-30")
		if (result.kind !== "edit") throw new Error(`Expected edit, got ${result.kind}`)
		expect(source.slice(0, result.edit.from) + result.edit.insert + source.slice(result.edit.to)).toBe("* DONE owned\r\nSCHEDULED: <2026-09-30 Wed +1w>\rbody")
	})
	it("preserves omitted cookies when changing only a time, and clears them for a full wrapped value", () => {
		const source = "* TODO task\nSCHEDULED: <2026-09-30 Wed 08:00 +1w -2d>\n"
		const origin = context(source)
		const command = createOrgPlanningCommand("SCHEDULED", "")
		const result = command.execute(origin, origin, "09:00", { today: "2026-09-30" })
		if (result.kind !== "edit") throw new Error(`Expected edit, got ${result.kind}`)
		expect(result.edit.insert).toBe("<2026-09-30 09:00 +1w -2d>")
		expect(apply(source, "<2026-09-30 09:00>")).toBe("* TODO task\nSCHEDULED: <2026-09-30 09:00>\n")
	})
	it("stages removal notes with captured old value and setup context, preserving CLOSED in the same batch", () => {
		const source = "#+STARTUP: lognotereschedule\n* DONE task\nCLOSED: [2026-09-30 Wed 08:00] SCHEDULED: <2026-09-30 Wed +1w> DEADLINE: <2026-10-02 Fri>\nbody\0"
		const origin = context(source, source.indexOf("* DONE"))
		const command = createOrgPlanningCommand("SCHEDULED", "", undefined, "remove")
		const captured = { today: "2026-09-30", logStamp: "[2026-09-30 Wed 12:00]" }
		const pending = command.execute(origin, origin, "", captured)
		if (pending.kind !== "needs-note") throw new Error(`Expected note, got ${pending.kind}`)
		expect(pending.request.operation).toEqual({ kind: "reschedule", previous: "<2026-09-30 Wed +1w>", next: null })
		expect(Object.isFrozen(pending.request.context)).toBe(true)
		const result = command.execute(origin, origin, pending.request.input!, { ...pending.request.context!, logStamp: pending.request.stamp, note: "literal\r\n:END:\0" })
		if (result.kind !== "batch") throw new Error(`Expected batch, got ${result.kind}`)
		let output = source
		for (const edit of [...result.batch.changes].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(output).toContain("CLOSED: [2026-09-30 Wed 08:00]")
		expect(output).not.toContain("SCHEDULED:")
		expect(output).toContain("DEADLINE: <2026-10-02 Fri>")
		expect(output).toContain('Not scheduled, was "[2026-09-30 Wed +1w]"')
		expect(output).toContain(captured.logStamp)
	})
})
