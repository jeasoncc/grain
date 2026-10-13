import { describe, expect, it } from "vitest"
import {
	parseOrgClocks,
	planOrgClockEdit,
	reportOrgClockTotals,
	type OrgClockContext,
	type OrgClockEditPlan,
	type OrgClockOperation,
} from "./org-clock.pipe"

const start = "[2026-10-09 Fri 09:00]"
const now = "[2026-10-09 Fri 10:15]"
const completed = `CLOCK: ${start}--${now} => 1:15`

/** Exercise the consumer's single original-coordinate transaction and inverse,
 * rather than accepting a planner DTO without applying its ranges.
 */
const apply = (source: string, cursor: number, operation: OrgClockOperation, context: OrgClockContext = { stamp: now }) => {
	const plan = planOrgClockEdit(source, cursor, operation, context)
	if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
	let previousTo = 0, delta = 0
	const inverse = plan.batch.changes.map((change) => {
		expect(change.from).toBeGreaterThanOrEqual(previousTo)
		expect(change.to).toBeGreaterThanOrEqual(change.from)
		expect(change.to).toBeLessThanOrEqual(source.length)
		previousTo = change.to
		const undo = { from: change.from + delta, to: change.from + delta + change.insert.length, insert: source.slice(change.from, change.to) }
		delta += change.insert.length - (change.to - change.from)
		return undo
	})
	let result = source
	for (const change of [...plan.batch.changes].reverse()) result = result.slice(0, change.from) + change.insert + result.slice(change.to)
	expect(plan.batch.cursor).toBeGreaterThanOrEqual(0)
	expect(plan.batch.cursor).toBeLessThanOrEqual(result.length)
	let restored = result
	for (const change of inverse.reverse()) restored = restored.slice(0, change.from) + change.insert + restored.slice(change.to)
	expect(restored).toBe(source)
	return { plan, result }
}
const snapshot = (source: string) => {
	const result = parseOrgClocks(source)
	if (result.kind !== "snapshot") throw new Error(result.message)
	return result
}
const report = (source: string, options: Parameters<typeof reportOrgClockTotals>[1] = {}) => {
	const result = reportOrgClockTotals(source, options)
	if (result.kind !== "report") throw new Error(result.message)
	return result
}
const isRejected = (plan: OrgClockEditPlan) => expect(plan).toMatchObject({ kind: "rejected", message: expect.any(String) })

describe("pure Org CLOCK source ranges", () => {
	it("retains exact rows, authoritative durations and heading ancestry", () => {
		const source = `* root\r\n${completed}\r\n** child\n:LOGBOOK:\n\tCLOCK: [2026-10-09 09:30]  \r:END:\r*** grandchild\r${completed}\r* next`
		const parsed = snapshot(source)
		expect(parsed.headings.map((heading) => [heading.title, heading.parentFrom])).toEqual([
			["root", null], ["child", 0], ["grandchild", source.indexOf("** child")], ["next", null],
		])
		expect(parsed.rows).toHaveLength(3)
		expect(parsed.active).toMatchObject({ from: source.indexOf("\tCLOCK:"), start: "[2026-10-09 09:30]", headingFrom: source.indexOf("** child"), end: null, elapsedMinutes: null })
		for (const row of parsed.rows) {
			expect(source.slice(row.from, row.to)).toMatch(/^[\t ]*CLOCK:/)
			expect(source.slice(row.to, row.breakTo)).toMatch(/^(?:\r\n|\r|\n|)$/)
		}
		expect(parsed.rows.filter((row) => row.end !== null).map((row) => row.elapsedMinutes)).toEqual([75, 75])
	})

	it("ends bodies and subtrees at configured COMMENT headings without losing eligible ancestry", () => {
		const source = `#+TODO: NEXT | DONE\r\npreamble 😀\r* root\n:LOGBOOK:\r${completed}\r\n:END:\n*** deep\r${completed}\n** NEXT [#A] COMMENT hidden\rCLOCK: invalid\n***** hidden descendant\rCLOCK: invalid\n** sibling\n:LOGBOOK:\r${completed}\r:END:\nsibling body\n* NEXT COMMENT hidden root\rCLOCK: invalid\n** hidden child\rCLOCK: invalid\n* last\r${completed}`
		const root = source.indexOf("* root"), deep = source.indexOf("*** deep")
		const hidden = source.indexOf("** NEXT [#A] COMMENT"), sibling = source.indexOf("** sibling")
		const hiddenRoot = source.indexOf("* NEXT COMMENT"), last = source.indexOf("* last")
		const parsed = snapshot(source)
		expect(parsed.headings.map(({ from, to, bodyFrom, bodyTo, subtreeTo, level, title, parentFrom }) =>
			[from, to, bodyFrom, bodyTo, subtreeTo, level, title, parentFrom])).toEqual([
			[root, root + "* root".length, root + "* root\n".length, deep, hiddenRoot, 1, "root", null],
			[deep, deep + "*** deep".length, deep + "*** deep\r".length, hidden, hidden, 3, "deep", root],
			[sibling, sibling + "** sibling".length, sibling + "** sibling\n".length, hiddenRoot, hiddenRoot, 2, "sibling", root],
			[last, last + "* last".length, last + "* last\r".length, source.length, source.length, 1, "last", null],
		])
		expect(parsed.rows.map((row) => row.headingFrom)).toEqual([root, deep, sibling, last])
		expect(report(source).headings.map((entry) => [entry.heading.from, entry.directMinutes, entry.subtreeMinutes])).toEqual([
			[root, 75, 225], [deep, 75, 75], [sibling, 75, 75], [last, 75, 75],
		])
		expect(report(source, { headingFrom: root, scope: "subtree" })).toMatchObject({ totalMinutes: 225, completedRows: 3 })
		expect(report(source, { headingFrom: deep, scope: "subtree" })).toMatchObject({ totalMinutes: 75, completedRows: 1 })
		for (const cursor of [hidden, source.indexOf("***** hidden"), hiddenRoot, source.indexOf("** hidden child")])
			isRejected(planOrgClockEdit(source, cursor, "clock-in", { stamp: now }))
		expect(reportOrgClockTotals(source, { headingFrom: hidden }).kind).toBe("rejected")
		const running = apply(source, source.indexOf("sibling body"), "clock-in").result
		expect(running).toBe(source.replace(`** sibling\n:LOGBOOK:\r`, `** sibling\n:LOGBOOK:\rCLOCK: ${now}\r`))
		expect(snapshot(running).active?.headingFrom).toBe(sibling)
		expect(apply(running, running.indexOf("sibling body"), "cancel-clock").result).toBe(source)
	})

	it("ignores opaque fake roots and assigns rows after skipped levels and an empty body to their exact sibling", () => {
		const source = `* root\n:UNKNOWN:\n* fake drawer\nCLOCK: invalid\n:END:\n*** child\n#+begin_example\n* fake block\nCLOCK: invalid\n#+end_example\n${completed}\n**** leaf\n** sibling\n${completed}\n* next\n${completed}`
		const child = source.indexOf("*** child"), leaf = source.indexOf("**** leaf")
		const sibling = source.indexOf("** sibling"), next = source.indexOf("* next")
		const parsed = snapshot(source)
		expect(parsed.headings.map(({ from, bodyFrom, bodyTo, subtreeTo, parentFrom }) =>
			[from, bodyFrom, bodyTo, subtreeTo, parentFrom])).toEqual([
			[0, "* root\n".length, child, next, null],
			[child, child + "*** child\n".length, leaf, sibling, 0],
			[leaf, sibling, sibling, sibling, child],
			[sibling, sibling + "** sibling\n".length, next, next, 0],
			[next, next + "* next\n".length, source.length, source.length, null],
		])
		expect(parsed.rows.map((row) => row.headingFrom)).toEqual([child, sibling, next])
		expect(report(source, { headingFrom: 0, scope: "subtree" })).toMatchObject({ totalMinutes: 150, completedRows: 2 })
		expect(report(source, { headingFrom: child, scope: "subtree" })).toMatchObject({ totalMinutes: 75, completedRows: 1 })
		expect(report(source, { headingFrom: leaf, scope: "subtree" })).toMatchObject({ totalMinutes: 0, completedRows: 0 })
		const running = apply(source, leaf, "clock-in").result
		expect(running).toBe(source.replace("**** leaf\n", `**** leaf\n:LOGBOOK:\nCLOCK: ${now}\n:END:\n`))
		expect(snapshot(running).active?.headingFrom).toBe(leaf)
		expect(apply(running, leaf, "cancel-clock").result).toBe(source)
	})

	it("excludes literal blocks, COMMENT trees, property drawers, fixedwidth and inline prose", () => {
		const source = `#+TODO: NEXT | DONE\n* live\n:PROPERTIES:\n:CUSTOM: CLOCK: ${start}\n:END:\n#+begin_src org\n* fake\nCLOCK: invalid\n:LOGBOOK:\nCLOCK: ${start}\n:END:\n#+end_src\n:UNKNOWN:\nCLOCK: invalid\n:END:\n: CLOCK: invalid\ntext CLOCK: invalid\n* NEXT [#A] COMMENT hidden\nCLOCK: invalid\n** child\nCLOCK: ${start}\n* visible\n${completed}`
		const parsed = snapshot(source)
		expect(parsed.headings.map((heading) => heading.title)).toEqual(["live", "visible"])
		expect(parsed.rows).toHaveLength(1)
		expect(parsed.active).toBeNull()
		for (const cursor of [source.indexOf("* fake"), source.indexOf("CLOCK: invalid"), source.indexOf("** child"), source.indexOf(":CUSTOM:")])
			isRejected(planOrgClockEdit(source, cursor, "clock-in", { stamp: now }))
	})

	it("treats block payload inside a LOGBOOK as opaque, including its heading-like lines", () => {
		const source = `* live\n:LOGBOOK:\n#+begin_example\nCLOCK: invalid\n* fake\n#+end_example\n${completed}\n:END:`
		expect(snapshot(source).rows).toHaveLength(1)
		isRejected(planOrgClockEdit(source, source.indexOf("CLOCK: invalid"), "clock-in", { stamp: now }))
		const result = apply(source, source.indexOf(completed), "clock-in").result
		expect(result).toContain("#+begin_example\nCLOCK: invalid\n* fake\n#+end_example")
		expect(snapshot(result).active?.headingFrom).toBe(0)
	})

	it.each([
		"CLOCK: [2026-02-30 Mon 10:00]",
		"CLOCK: [2026-10-09 Thu 10:00]",
		"CLOCK: [2026-10-09 Fri 24:00]",
		"CLOCK: [2026-10-09 Fri]",
		"clock: [2026-10-09 Fri 10:00]",
		"CLOCK : [2026-10-09 Fri 10:00]",
		"CLOCK: <2026-10-09 Fri 10:00>",
		"CLOCK: [2026-10-09 Fri 10:00 +1d]",
		`CLOCK: ${start} => 0:00`,
		`CLOCK: ${start}--${now}`,
		`CLOCK: ${start}--${now} => 1:60`,
		`CLOCK: ${start}--${now} => -1:00`,
		`CLOCK: ${start}--${now} => 9999999999999999999:00`,
		`CLOCK: ${start} trailing annotation`,
		`CLOCK: ${start} CLOCK: ${start}`,
	])("visibly rejects malformed or ambiguous clock row %j for every consumer", (row) => {
		const source = `* task\n:LOGBOOK:\n${row}\n:END:`
		expect(parseOrgClocks(source).kind).toBe("rejected")
		expect(reportOrgClockTotals(source).kind).toBe("rejected")
		for (const operation of ["clock-in", "clock-out", "cancel-clock"] as const)
			isRejected(planOrgClockEdit(source, 2, operation, { stamp: now }))
	})

	it.each([
		["CLOCK: invalid\n* live", "CLOCK row has no eligible heading owner."],
		[":LOGBOOK:\nCLOCK: invalid\n:END:\n* live", "Clock log drawer has no eligible heading owner."],
	])("rejects ownerless preamble source before validating its malformed row: %j", (source, message) => {
		const rejected = { kind: "rejected", message }
		expect(parseOrgClocks(source)).toEqual(rejected)
		expect(reportOrgClockTotals(source)).toEqual(rejected)
		for (const operation of ["clock-in", "clock-out", "cancel-clock"] as const)
			expect(planOrgClockEdit(source, source.indexOf("* live"), operation, { stamp: now })).toEqual(rejected)
	})

	it.each([
		`* one\nCLOCK: ${start}\n** child\nCLOCK: ${start}`,
		`* one\n:LOGBOOK:\nCLOCK: ${start}\n:END:\n* two\nCLOCK: ${start}`,
		`CLOCK: ${start}\n* heading`,
		`* heading\n:LOGBOOK:\nCLOCK: ${start}`,
		`* heading\n:LOGBOOK:\n:OTHER:\nCLOCK: ${start}\n:END:`,
		`* heading\n:LOGBOOK:\n* nested\nCLOCK: ${start}\n:END:`,
		"* heading\n:LOGBOOK:\n:END:\n:logbook:\n:END:",
	])("rejects structural clock ambiguity without selecting the nearest row", (source) => {
		expect(parseOrgClocks(source).kind).toBe("rejected")
		isRejected(planOrgClockEdit(source, source.length, "clock-out", { stamp: now }))
	})
})

describe("atomic Org clock commands", () => {
	it.each(["\n", "\r\n", "\r"])("opens after planning/properties without rewriting metadata using %j", (eol) => {
		const source = ["* task", "SCHEDULED: <2026-10-09 Fri>", ":PROPERTIES:", ":ID: keep", ":END:", "body\0keep", "** child", completed].join(eol)
		const { plan, result } = apply(source, source.indexOf("body"), "clock-in")
		expect(plan.batch.changes).toHaveLength(1)
		expect(result).toBe(source.replace(`:END:${eol}body`, `:END:${eol}:LOGBOOK:${eol}CLOCK: ${now}${eol}:END:${eol}body`))
		expect(result.slice(plan.batch.cursor, plan.batch.cursor + 4)).toBe("body")
		expect(snapshot(result).rows).toHaveLength(2)
		expect(snapshot(result).active?.headingFrom).toBe(0)
	})

	it("preserves the absence of a final newline, including a bare heading at EOF", () => {
		const source = "* task"
		const { result } = apply(source, source.length, "clock-in")
		expect(result).toBe(`* task\n:LOGBOOK:\nCLOCK: ${now}\n:END:`)
		expect(result.endsWith("\n")).toBe(false)
		const out = apply(result, result.length, "clock-out").result
		expect(out).toContain(`CLOCK: ${now}--${now} => 0:00`)
		expect(out.endsWith("\n")).toBe(false)
	})

	it.each(["\n", "\r\n", "\r"])("cancels a sole custom log row and its empty drawer without changing raw metadata/body using %j", (eol) => {
		const source = ["#+PROPERTY: LOG_INTO_DRAWER WORK_LOG", "* task", ":PROPERTIES:", ":ID: keep",
			":END:", "body\0😀", "** child", completed, ""].join(eol)
		const running = apply(source, source.indexOf("body"), "clock-in").result
		expect(apply(running, running.indexOf("body"), "cancel-clock").result).toBe(source)
	})

	it("keeps a containing drawer when cancellation leaves notes, completed rows or literal payload", () => {
		const source = `* task\r\n:LOGBOOK:\r\nCLOCK: ${now}\r\n- note\0😀\r\n${completed}\r\n:END:\r\nbody`
		expect(apply(source, source.indexOf("body"), "cancel-clock").result).toBe(source.replace(`CLOCK: ${now}\r\n`, ""))
	})

	it("reuses existing configured safe drawers and inherited policy, preserving other logs", () => {
		const source = `* parent\r\n:PROPERTIES:\r\n:LOG_INTO_DRAWER: WORK_LOG\r\n:END:\r\n** child\n:WORK_LOG:\r  - Note untouched\r${completed}\r:END:\rbody`
		const { result } = apply(source, source.indexOf("body"), "clock-in")
		expect(result).toBe(source.replace(":WORK_LOG:\r", `:WORK_LOG:\rCLOCK: ${now}\r`))
		expect(result).not.toContain(":LOGBOOK:")
		expect(snapshot(result).rows).toHaveLength(2)
	})

	it("rejects unsafe drawer configuration and honors append log ordering", () => {
		for (const name of ["PROPERTIES", "END", "../outside", "bad drawer"]) {
			const invalid = `#+PROPERTY: LOG_INTO_DRAWER ${name}\n* task`
			isRejected(planOrgClockEdit(invalid, invalid.indexOf("* task"), "clock-in", { stamp: now }))
		}
		const source = `#+STARTUP: nologstatesreversed\n* task\n:LOGBOOK:\n- old note\n${completed}\n:END:`
		const { result } = apply(source, source.indexOf("* task"), "clock-in")
		expect(result).toBe(source.replace("\n:END:", `\nCLOCK: ${now}\n:END:`))
	})

	it("keeps a same-heading clock unchanged and never mutates child clocks implicitly", () => {
		const source = `* parent\nbody\n** child\nCLOCK: ${start}`
		expect(planOrgClockEdit(source, source.indexOf("child"), "clock-in", { stamp: now })).toEqual({ kind: "unchanged" })
		const { plan, result } = apply(source, source.indexOf("body"), "clock-in")
		expect(plan.batch.changes).toHaveLength(2)
		expect(snapshot(result).active?.headingFrom).toBe(0)
		expect(snapshot(result).rows.find((row) => row.headingFrom === source.indexOf("** child") + plan.batch.changes[0].insert.length)?.elapsedMinutes).toBe(75)
	})

	it.each([false, true])("switches sibling headings as one undo-restorable batch (reverse=%j)", (reverse) => {
		const a = `* A\r\n:LOGBOOK:\r\n\tCLOCK: ${start}  \r\n:END:\r\nbody A\n`
		const b = "* B\nbody B\n"
		const source = reverse ? b + a : a + b
		const { plan, result } = apply(source, source.indexOf("body B"), "clock-in")
		expect(plan.batch.changes).toHaveLength(2)
		expect(result).toContain(`\tCLOCK: ${start}--${now} => 1:15  \r\n`)
		expect(result.slice(plan.batch.cursor, plan.batch.cursor + 6)).toBe("body B")
		const parsed = snapshot(result)
		expect(parsed.rows.filter((row) => row.end === null)).toHaveLength(1)
		expect(parsed.headings.find((heading) => heading.from === parsed.active?.headingFrom)?.title).toBe("B")
		expect(parsed.rows.find((row) => row.end !== null)?.elapsedMinutes).toBe(75)
	})

	it("clock-out and cancel target the exact global active row, irrespective of cursor heading", () => {
		const source = `* A\nCLOCK: ${start}\n** child\n${completed}\n* B\nbody`
		const out = apply(source, source.indexOf("body"), "clock-out").result
		expect(out).toBe(source.replace(`CLOCK: ${start}\n`, `${completed}\n`))
		expect(snapshot(out).active).toBeNull()
		const cancel = apply(source, source.indexOf("body"), "cancel-clock").result
		expect(cancel).toBe(source.replace(`CLOCK: ${start}\n`, ""))
		expect(cancel).toContain(`** child\n${completed}`)
		for (const operation of ["clock-out", "cancel-clock"] as const)
			expect(planOrgClockEdit(cancel, 0, operation, { stamp: now })).toEqual({ kind: "unchanged" })
	})

	it("retains zero-minute rows and only explicit cancellation removes them", () => {
		const source = `* task\nCLOCK: ${now}`
		const out = apply(source, source.length, "clock-out").result
		expect(out).toBe(`* task\nCLOCK: ${now}--${now} => 0:00`)
		expect(report(out)).toMatchObject({ totalMinutes: 0, completedRows: 1 })
		expect(apply(source, source.length, "cancel-clock").result).toBe("* task\n")
	})

	it("defines recovered clocks as Gregorian civil minutes across date/year/leap boundaries", () => {
		for (const [begin, end, minutes] of [
			["[2024-02-28 Wed 23:30]", "[2024-03-01 Fri 00:30]", 1500],
			["[2025-12-31 Wed 23:59]", "[2026-01-01 Thu 00:01]", 2],
			["[2026-03-08 Sun 01:30]", "[2026-03-08 Sun 03:30]", 120],
		] as const) {
			const source = `* task\nCLOCK: ${begin}`
			const result = apply(source, source.length, "clock-out", { stamp: end }).result
			expect(snapshot(result).rows[0].elapsedMinutes).toBe(minutes)
		}
	})

	it("rejects recovered backwards time but accepts exact known epoch duration across DST", () => {
		const begin = "[2026-11-01 Sun 01:50]", end = "[2026-11-01 Sun 01:10]"
		const source = `* task\nCLOCK: ${begin}`
		isRejected(planOrgClockEdit(source, 0, "clock-out", { stamp: end }))
		isRejected(planOrgClockEdit(source, 0, "clock-out", { stamp: end, elapsedMinutes: 20 }))
		const active = snapshot(source).active!
		const result = apply(source, 0, "clock-out", { stamp: end, elapsedMinutes: 20, expectedActiveClock: active }).result
		expect(result).toBe(`* task\nCLOCK: ${begin}--${end} => 0:20`)
		expect(report(result).totalMinutes).toBe(20)
		for (const elapsedMinutes of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1])
			isRejected(planOrgClockEdit(source, 0, "clock-out", { stamp: end, elapsedMinutes, expectedActiveClock: active }))
		for (const expectedActiveClock of [{ ...active, from: active.from + 1 }, { ...active, start: now }])
			isRejected(planOrgClockEdit(source, 0, "cancel-clock", { stamp: end, expectedActiveClock }))
	})

	it("uses a supplied live epoch duration for the closing half of an atomic switch", () => {
		const begin = "[2026-11-01 Sun 01:50]", end = "[2026-11-01 Sun 01:10]"
		const source = `* A\nCLOCK: ${begin}\n* B\nbody`
		const expectedActiveClock = snapshot(source).active!
		const { plan, result } = apply(source, source.indexOf("* B"), "clock-in", { stamp: end, elapsedMinutes: 20, expectedActiveClock })
		expect(plan.batch.changes).toHaveLength(2)
		expect(snapshot(result).active?.start).toBe(end)
		expect(snapshot(result).rows.filter((row) => row.end === null)).toHaveLength(1)
		expect(report(result).totalMinutes).toBe(20)
	})

	it("handles empty/preamble and adjacent heading cursor boundaries explicitly", () => {
		expect(snapshot("")).toMatchObject({ rows: [], headings: [], active: null })
		expect(report("")).toMatchObject({ totalMinutes: 0, completedRows: 0 })
		isRejected(planOrgClockEdit("", 0, "clock-in", { stamp: now }))
		const source = "preamble\n* A\n* B"
		isRejected(planOrgClockEdit(source, 0, "clock-in", { stamp: now }))
		for (const cursor of [source.indexOf("* B"), source.length]) {
			const result = apply(source, cursor, "clock-in").result
			const parsed = snapshot(result)
			expect(parsed.headings.find((heading) => heading.from === parsed.active?.headingFrom)?.title).toBe("B")
		}
	})

	it("rejects invalid command time/cursor and a switch that cannot close recovered time", () => {
		const source = `* A\nCLOCK: ${now}\n* B\nbody`
		for (const cursor of [-1, source.length + 1, 0.5, NaN]) isRejected(planOrgClockEdit(source, cursor, "clock-in", { stamp: now }))
		for (const stamp of ["2026-10-09", "<2026-10-09 Fri 10:15>", "[2026-10-09 Thu 10:15]", "[2026-10-09 Fri 24:00]"])
			isRejected(planOrgClockEdit(source, 0, "clock-out", { stamp }))
		isRejected(planOrgClockEdit(source, source.indexOf("* B"), "clock-in", { stamp: start }))
	})
})

describe("pure authoritative clock reports", () => {
	it("totals direct headings and subtrees, not child clocks twice in the document total", () => {
		const source = `* parent\n${completed}\n** child\nCLOCK: ${start}--${now} => 2:00\n*** grandchild\nCLOCK: ${start}--${now} => 0:00\n* sibling\nCLOCK: ${start}`
		const totals = report(source)
		expect(totals).toMatchObject({ totalMinutes: 195, completedRows: 3, active: { start } })
		expect(totals.headings.map((entry) => [entry.heading.title, entry.directMinutes, entry.subtreeMinutes, entry.directRows, entry.subtreeRows])).toEqual([
			["parent", 75, 195, 1, 3], ["child", 120, 120, 1, 2], ["grandchild", 0, 0, 1, 1], ["sibling", 0, 0, 0, 0],
		])
		expect(report(source, { headingFrom: 0, scope: "heading" })).toMatchObject({ totalMinutes: 75, completedRows: 1 })
		expect(report(source, { headingFrom: source.indexOf("** child"), scope: "subtree" })).toMatchObject({ totalMinutes: 120, completedRows: 2 })
	})

	it("attributes whole completed rows to inclusive start dates without DST recomputation or clipping", () => {
		const source = `* task\nCLOCK: [2026-10-08 Thu 23:30]--[2026-10-09 Fri 02:00] => 3:00\nCLOCK: ${start}--${now} => 0:05\nCLOCK: [2026-10-10 Sat 09:00]--[2026-10-10 Sat 10:00] => 0:00`
		expect(report(source, { from: "2026-10-09", to: "2026-10-09" })).toMatchObject({ totalMinutes: 5, completedRows: 1 })
		expect(report(source, { from: "2026-10-08", to: "2026-10-09" })).toMatchObject({ totalMinutes: 185, completedRows: 2 })
		expect(report(source, { from: "2026-10-10" })).toMatchObject({ totalMinutes: 0, completedRows: 1 })
		expect(report(source, { to: "2026-10-07" })).toMatchObject({ totalMinutes: 0, completedRows: 0 })
	})

	it("rejects invalid intervals/targets and aggregate precision loss", () => {
		const source = `* task\n${completed}`
		for (const options of [{ from: "2026-02-30" }, { to: "invalid" }, { from: "2026-10-10", to: "2026-10-09" }, { headingFrom: 3 }])
			expect(reportOrgClockTotals(source, options).kind).toBe("rejected")
		const huge = `* task\nCLOCK: ${start}--${now} => 150119987579016:00\nCLOCK: ${start}--${now} => 150119987579016:00`
		expect(parseOrgClocks(huge).kind).toBe("snapshot")
		expect(reportOrgClockTotals(huge).kind).toBe("rejected")
	})
})
