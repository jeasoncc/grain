import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import { parseOrgAgenda, validateOrgAgendaOrigin, hasOrgAgendaActionOrigin } from "./org-agenda.pipe"
import { parseOrgAgendaConfiguration, type OrgAgendaViewConfiguration } from "./org-agenda-configuration.pipe"
import { projectOrgAgendaEntries } from "./org-agenda-projection.pipe"
import { planAgendaOperation } from "./org-agenda-command-plan.pipe"
import { buildOrgSparseTreePlan, parseOrgSparseTreeQuery } from "./org-sparse-tree.pipe"

const calendar = Object.freeze({ today: "2026-10-03", now: "12:00" })
const dated: OrgAgendaViewConfiguration = Object.freeze({ id: "week", name: "Week", files: null, mode: "dates", todo: null, match: null, window: Object.freeze({ start: "today-1d", span: 5 }), overdue: true, deadlineWarningDays: 3 })

describe("Agenda declarative projection", () => {
	it("expands inclusive active ranges and recurring days while retaining original actionable anchors", () => {
		const source = "😀\r\n* TODO Block\r\n<2026-10-02 Fri 09:00>--<2026-10-04 Sun 17:00>\r\n* TODO Repeat\n<2026-10-01 Thu ++2d>"
		const rows = projectOrgAgendaEntries(parseOrgAgenda("tasks.org", source), dated, calendar)
		expect(rows.map(row => [row.heading, row.date, row.occurrence])).toEqual([
			["Repeat", "2026-10-03", "repeat"], ["Repeat", "2026-10-05", "repeat"],
			["Block", "2026-10-02", "source"], ["Block", "2026-10-03", "range"], ["Block", "2026-10-04", "range"],
		])
		for (const row of rows) {
			expect(validateOrgAgendaOrigin(row, source).valid).toBe(true)
			expect(row.origin.timestamp).not.toBeNull()
			expect(source.slice(row.origin.timestamp!.from, row.origin.timestamp!.to)).toBe(row.origin.timestamp!.text)
			const operation = { kind: "todo-state", state: "DONE", timestamp: "[2026-10-03 Sat 12:00]" } as const
			const action = planAgendaOperation(row, source, operation)
			expect(action.kind).toBe("edit")
			const original = parseOrgAgenda("tasks.org", source).find(entry => entry.origin.timestamp.from === row.origin.timestamp!.from)!
			expect(action).toEqual(planAgendaOperation(original, source, operation))
		}
		const virtual = rows.find(row => row.occurrence === "range")!
		expect(validateOrgAgendaOrigin(virtual, source.replace("2026-10-04", "2026-10-05")).valid).toBe(false)
	})
	it("places overdue and deadline warnings on captured today only and respects completion and delay", () => {
		const source = [
			"* TODO Overdue", "SCHEDULED: <2026-09-30 Wed>",
			"* TODO Future", "DEADLINE: <2026-10-08 Thu -1w>",
			"* TODO Expired", "DEADLINE: <2026-09-30 Wed>",
			"* DONE Finished", "DEADLINE: <2026-09-30 Wed>",
			"* TODO Delayed", "SCHEDULED: <2026-10-02 Fri -3d>",
		].join("\n")
		const rows = projectOrgAgendaEntries(parseOrgAgenda("tasks.org", source), dated, calendar)
		expect(rows.filter(row => row.date === calendar.today).map(row => [row.heading, row.occurrence])).toEqual([
			["Expired", "expired"], ["Overdue", "overdue"], ["Future", "warning"],
		])
		expect(rows.some(row => row.heading === "Finished" || row.heading === "Delayed")).toBe(false)
		const disabled = projectOrgAgendaEntries(parseOrgAgenda("tasks.org", source), { ...dated, overdue: false, deadlineWarningDays: null }, calendar)
		expect(disabled.some(row => row.occurrence === "warning" || row.occurrence === "expired" || row.occurrence === "overdue")).toBe(false)
		expect(projectOrgAgendaEntries(parseOrgAgenda("tasks.org", source), { ...dated, deadlineWarningDays: 0 }, calendar).some(row => row.occurrence === "warning")).toBe(false)
	})
	it("keeps one genuine undated heading per TODO/match list with no fabricated timestamp", () => {
		const source = "#+TODO: NEXT WAIT | COMPLETE\n* NEXT Parent :work:\n** WAIT Undated\n:PROPERTIES:\n:OWNER: Ada\n:END:\n** COMPLETE Finished\n* NEXT COMMENT Inert\n** NEXT Hidden"
		const entries = parseOrgAgenda("tasks.org", source, true)
		const query = parseOrgSparseTreeQuery('match:work+OWNER="Ada"/!WAIT')!
		const starts = new Set(buildOrgSparseTreePlan(source, query, undefined, calendar).matchedHeadingStarts)
		const list: OrgAgendaViewConfiguration = { ...dated, mode: "match", match: 'work+OWNER="Ada"/!WAIT', todo: "pending", window: null, overdue: false, deadlineWarningDays: null }
		const rows = projectOrgAgendaEntries(entries, list, calendar, starts)
		expect(rows).toHaveLength(1)
		const row = rows[0]
		expect(row).toMatchObject({ heading: "Undated", date: null, todo: "WAIT", line: 3, origin: { timestamp: null } })
		expect(validateOrgAgendaOrigin(row, source).valid).toBe(true)
		expect(hasOrgAgendaActionOrigin({ ...row.origin, source: "disk", workspaceSessionId: "session", workspaceRoot: "/notes", sourceRevision: "r1", diskRevision: "r1" })).toBe(true)
		expect(planAgendaOperation(row, source, { kind: "todo-state", state: "COMPLETE", timestamp: "[2026-10-03 Sat 12:00]" }).kind).toBe("edit")
		expect(validateOrgAgendaOrigin({ ...row, date: "2026-10-03" }, source).valid).toBe(false)
		expect(projectOrgAgendaEntries(entries, null)).toEqual([])
	})
	it("rejects unbounded windows and invalid calendars instead of inventing occurrence dates", () => {
		const rows = parseOrgAgenda("tasks.org", "* TODO Daily\n<0001-01-01 Mon +1d>")
		expect(projectOrgAgendaEntries(rows, { ...dated, window: { start: "today", span: 1 } }, calendar).map(row => row.date)).toEqual([calendar.today])
		expect(() => projectOrgAgendaEntries(rows, dated)).toThrow(/captured.*calendar/)
		expect(() => projectOrgAgendaEntries(rows, { ...dated, window: { start: "9999-12-31", span: 2 } }, calendar)).toThrow(/bounds/)
		expect(() => projectOrgAgendaEntries(rows, { ...dated, window: { start: "today", span: 367 } }, calendar)).toThrow(/bounded/)
		expect(projectOrgAgendaEntries(rows, { ...dated, files: ["*.org"] }, calendar)).toEqual([])
	})
	it("retains complete planning-range identity while displaying both active range endpoints", () => {
		const source = "* TODO Window\nSCHEDULED: <2026-10-02 Fri>--<2026-10-04 Sun>"
		const parsed = parseOrgAgenda("tasks.org", source)
		expect(parsed).toHaveLength(1)
		const rows = projectOrgAgendaEntries(parsed, dated, calendar)
		expect(rows.map(row => [row.kind, row.date])).toEqual([["scheduled", "2026-10-02"], ["scheduled", "2026-10-03"], ["scheduled", "2026-10-04"]])
		for (const row of rows) {
			expect(validateOrgAgendaOrigin(row, source).valid).toBe(true)
		}
	})
})

describe("Agenda closed configuration", () => {
	it("rejects unsafe exact scope, unknown fields, missing controls and invalid saved JSON", () => {
		for (const view of [
			{ ...dated, files: ["../tasks.org"] }, { ...dated, files: ["tasks.org", "tasks.org"] },
			{ ...dated, files: ["a\n.org"] },
			{ ...dated, shell: "run" }, { ...dated, window: { start: "today", span: 367 } },
			{ ...dated, mode: "todo", window: null },
		]) expect(E.isLeft(parseOrgAgendaConfiguration(JSON.stringify({ version: 1, views: [view] })))).toBe(true)
		expect(E.isLeft(parseOrgAgendaConfiguration("{"))).toBe(true)
		const { overdue: _removed, ...missing } = dated
		expect(E.isLeft(parseOrgAgendaConfiguration(JSON.stringify({ version: 1, views: [missing] })))).toBe(true)
	})
	it("retains blank all-date behavior and explicit empty file scopes without inferred defaults", () => {
		const blank = parseOrgAgendaConfiguration("")
		expect(E.isRight(blank) && blank.right.views).toEqual([])
		const selected = parseOrgAgendaConfiguration(JSON.stringify({ version: 1, views: [{ ...dated, files: [] }] }))
		expect(E.isRight(selected) && selected.right.views[0].files).toEqual([])
	})
})
