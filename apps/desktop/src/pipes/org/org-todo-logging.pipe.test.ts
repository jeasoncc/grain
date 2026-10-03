import { describe, expect, it } from "vitest"
import { cycleOrgTodoAt } from "./org-text.pipe"
import {
	formatOrgLocalTimestamp,
	planOrgTodoTransition,
	validOrgLocalTimestamp,
} from "./org-todo-logging.pipe"

const stamp = "[2025-04-01 Tue 09:07]"
const run = (source: string, position = source.indexOf("* "), note?: string) => {
	const plan = planOrgTodoTransition(source, position, stamp, note)
	if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
	let result = source
	for (const edit of [...plan.edits].sort((a, b) => b.from - a.from))
		result = result.slice(0, edit.from) + edit.insert + result.slice(edit.to)
	return { result, plan }
}

describe("local Org stamps", () => {
	it("validates format, calendar, weekday, and time without rollover", () => {
		expect(validOrgLocalTimestamp(stamp)).toBe(true)
		expect(validOrgLocalTimestamp("[2024-02-29 Thu 23:59]")).toBe(true)
		for (const bad of [
			null,
			new Date(),
			"2025-04-01",
			"[2025-04-01 Mon 09:07]",
			"[2025-02-29 Sat 09:07]",
			"[2025-04-31 Thu 09:07]",
			"[2025-04-01 Tue 24:00]",
			"[0000-01-01 Sat 00:00]",
			"[2025-04-01 Tue 09:60]",
		])
			expect(validOrgLocalTimestamp(bad)).toBe(false)
	})
	it("formats injected local Dates", () => {
		expect(formatOrgLocalTimestamp(new Date(2025, 3, 1, 9, 7))).toBe(stamp)
		expect(() => formatOrgLocalTimestamp(new Date(NaN))).toThrow()
	})
})

describe("TODO logging planner", () => {
	it("requires a valid explicit stamp, even with logging disabled", () => {
		expect(planOrgTodoTransition("* TODO x", 0, undefined)).toEqual({
			kind: "rejected",
			reason: "invalid-timestamp",
		})
	})
	it("retains legacy edit and cycle semantics without logging defaults", () => {
		for (const source of [
			"* title",
			"* TODO title",
			"* DONE title",
			"#+TODO: NEXT(n) WAIT(w) | FINISHED(f)\n* WAIT title",
		]) {
			const cursor = source.indexOf("* ") + 5
			const plan = planOrgTodoTransition(source, cursor, stamp)
			expect(plan.kind).toBe("edit")
			if (plan.kind === "edit") expect(plan.edits).toEqual([cycleOrgTodoAt(source, cursor)])
		}
	})
	it("logs incoming and outgoing !, once when both request it", () => {
		for (const declaration of [
			"TODO(t/!) | DONE(d)",
			"TODO(t) | DONE(d!)",
			"TODO(t/!) | DONE(d!)",
		]) {
			const { result, plan } = run(`#+SEQ_TODO: ${declaration}\n* TODO title\nbody`)
			expect(plan.done).toBe(true)
			expect(result).toContain(`* DONE title\n- State "DONE"        from "TODO" ${stamp}\nbody`)
			expect(result.match(/- State/g)).toHaveLength(1)
			expect(result).not.toContain("CLOSED:")
		}
	})
	it("cycles the matching sequence and logs outgoing transitions to no state", () => {
		const source = "#+TODO: TODO | DONE(d/!)\n#+SEQ_TODO: NEXT(n) | COMPLETE(c!)\n* NEXT x"
		expect(run(source).result).toContain(`* COMPLETE x\n- State "COMPLETE"    from "NEXT" ${stamp}`)
		expect(run(source.replace("* NEXT x", "* DONE x")).result).toContain(
			`* x\n- State ""            from "DONE" ${stamp}`,
		)
	})
	it("fails closed for incoming or outgoing notes without partial edits", () => {
		for (const declaration of [
			"TODO(t/@) | DONE(d)",
			"TODO(t) | DONE(d@)",
			"TODO(t/@) | DONE(d!)",
		]) {
			const source = `#+TODO: ${declaration}\n* TODO title`
			expect(planOrgTodoTransition(source, source.indexOf("* "), stamp)).toEqual({
				kind: "needs-note",
			})
		}
	})
	it.each([
		"\n",
		"\r",
		"\r\n",
	])("adds CLOSED before properties and log after them using %j", (eol) => {
		const source = [
			"#+STARTUP: logdone logdrawer",
			"#+TODO: TODO | DONE(!)",
			"* TODO café 😀",
			":PROPERTIES:",
			":ID: unchanged",
			":END:",
			"body",
			"** Child",
			"text",
		].join(eol)
		const { result } = run(source)
		expect(result).toBe(
			[
				"#+STARTUP: logdone logdrawer",
				"#+TODO: TODO | DONE(!)",
				"* DONE café 😀",
				`CLOSED: ${stamp}`,
				":PROPERTIES:",
				":ID: unchanged",
				":END:",
				":LOGBOOK:",
				`- State "DONE"        from "TODO" ${stamp}`,
				":END:",
				"body",
				"** Child",
				"text",
			].join(eol),
		)
	})
	it("preserves planning, raw mixed endings, properties and existing log entries", () => {
		const source =
			"#+STARTUP: logdone logdrawer\r\n#+TODO: TODO | DONE(!)\n* TODO x\rSCHEDULED: <2025-04-02 Wed> DEADLINE: <2025-04-03 Thu>\r\n:PROPERTIES:\n:ID: x\r:END:\n:LOGBOOK:\r\nold text\r:END:\nbody"
		const { result } = run(source)
		expect(result).toContain(
			`* DONE x\rCLOSED: ${stamp} SCHEDULED: <2025-04-02 Wed> DEADLINE: <2025-04-03 Thu>\r\n`,
		)
		expect(result).toContain(`old text\r- State "DONE"        from "TODO" ${stamp}\r:END:\nbody`)
	})
	it("removes CLOSED alone or alongside other planning when leaving done", () => {
		expect(
			run(`* DONE x\r\nCLOSED: ${stamp}\r\n:PROPERTIES:\r\n:ID: x\r\n:END:\r\nbody`).result,
		).toBe("* x\r\n:PROPERTIES:\r\n:ID: x\r\n:END:\r\nbody")
		for (const planning of [
			`CLOSED: ${stamp} SCHEDULED: <2025-04-02 Wed>`,
			`SCHEDULED: <2025-04-02 Wed> CLOSED: ${stamp}`,
		])
			expect(run(`* DONE x\n${planning}\nbody`).result).toBe(
				"* x\nSCHEDULED: <2025-04-02 Wed>\nbody",
			)
	})
	it("updates an existing CLOSED without rewriting the planning line", () => {
		expect(
			run(
				`#+STARTUP: logdone\n* TODO x\n  CLOSED: [2025-03-31 Mon 08:00]  DEADLINE: <2025-04-02 Wed>\nbody`,
			).result,
		).toContain(`  CLOSED: ${stamp}  DEADLINE: <2025-04-02 Wed>\nbody`)
	})
	it("honors startup toggles and an explicit drawer directive", () => {
		const source =
			"#+STARTUP: logdone nologdone logdrawer nologdrawer\n#+LOG_INTO_DRAWER: HISTORY\n#+TODO: TODO | DONE(!)\n* TODO x"
		const { result } = run(source)
		expect(result).not.toContain("CLOSED:")
		expect(result).toContain(
			`* DONE x\n:HISTORY:\n- State "DONE"        from "TODO" ${stamp}\n:END:\n`,
		)
		expect(run(source.replace("HISTORY", "nil")).result).not.toContain(":LOGBOOK:")
	})
	it("honors safe file and local drawer properties", () => {
		const source =
			'#+PROPERTY: LOG_INTO_DRAWER "HISTORY"\n#+TODO: TODO | DONE(!)\n* TODO x\n:PROPERTIES:\n:LOG_INTO_DRAWER: nil\n:ID: x\n:END:\nbody'
		expect(run(source).result).toContain(`:END:\n- State "DONE"        from "TODO" ${stamp}\nbody`)
		expect(run(source.replace(":LOG_INTO_DRAWER: nil\n", "")).result).toContain(":HISTORY:\n")
		expect(
			planOrgTodoTransition(
				source.replace(":LOG_INTO_DRAWER: nil", ":LOG_INTO_DRAWER: END"),
				source.indexOf("* "),
				stamp,
			).kind,
		).toBe("rejected")
	})
	it("does not interpret metadata or heading-looking text inside literal blocks", () => {
		const source =
			"#+STARTUP: logdone\n* TODO x\n#+begin_src org\n* fake\nCLOSED: broken\n#+end_src\nbody"
		expect(run(source).result).toBe(source.replace("* TODO x\n", `* DONE x\nCLOSED: ${stamp}\n`))
	})
	it("ignores inert declarations and literal headings", () => {
		const source =
			"#+begin_src org\n#+TODO: TODO | DONE(@)\n* TODO literal\n#+end_src\n:DATA:\n#+STARTUP: logdone\n:END:\n* COMMENT hidden\n#+TODO: TODO | DONE(@)\n* TODO real"
		expect(run(source, source.lastIndexOf("* TODO")).result).toBe(
			source.replace("* TODO real", "* DONE real"),
		)
		expect(planOrgTodoTransition(source, source.indexOf("* TODO literal"), stamp)).toEqual({
			kind: "noop",
		})
		expect(planOrgTodoTransition("* COMMENT hidden", 0, stamp)).toEqual({ kind: "noop" })
	})
	it("rejects ambiguous directives and unsafe drawer names", () => {
		for (const directive of [
			"#+TODO: TODO | DONE(@@)",
			"#+TODO: TODO | DONE | END",
			"#+TODO: TODO TODO | DONE",
			"#+LOG_INTO_DRAWER: PROPERTIES",
			"#+LOG_INTO_DRAWER: ../unsafe",
			"#+LOG_INTO_DRAWER: LOGBOOK\n#+LOG_INTO_DRAWER: OTHER",
		])
			expect(
				planOrgTodoTransition(`${directive}\n* TODO x`, directive.length + 1, stamp).kind,
			).toBe("rejected")
	})
	it("rejects malformed or ambiguous body metadata when logging", () => {
		for (const body of [
			":END:",
			"#+begin_src org\nunclosed",
			":LOGBOOK:\ntext",
			":LOGBOOK:\n:OTHER:\n:END:",
			":LOGBOOK:\n:END:\n:LOGBOOK:\n:END:",
			"CLOSED: broken",
			`CLOSED: ${stamp} CLOSED: ${stamp}`,
			"SCHEDULED: <2025-04-02 Wed>\nDEADLINE: <2025-04-03 Thu>",
			"body\n:PROPERTIES:\n:ID: x\n:END:",
		]) {
			const source = `#+STARTUP: logdone logdrawer\n#+TODO: TODO | DONE(!)\n* TODO x\n${body}`
			expect(planOrgTodoTransition(source, source.indexOf("* "), stamp).kind, body).toBe("rejected")
		}
	})
})

describe("TODO logging safety regressions", () => {
	it.each([
		"[2025-02-30 Sun 99:99]",
		"<2025-04-01 Tue 09:07>",
		"[2025-04-01 Mon 09:07]",
	])("refuses malformed CLOSED %s", (closed) => {
		const source = `* DONE task\nCLOSED: ${closed}\n`
		expect(planOrgTodoTransition(source, 0, stamp)).toEqual({
			kind: "rejected",
			reason: "malformed-closed",
		})
	})
	it("rejects recognized unsupported LOGGING but ignores COMMENT properties", () => {
		expect(planOrgTodoTransition("#+PROPERTY: LOGGING nil\n* TODO task", 25, stamp).kind).toBe(
			"rejected",
		)
		const source = "* COMMENT example\n:PROPERTIES:\n:LOGGING: nil\n:END:\n* TODO task"
		expect(run(source, source.lastIndexOf("* TODO")).result).toContain("* DONE task")
		expect(
			planOrgTodoTransition("* TODO task\n:PROPERTIES:\n:LOGGING: nil\n:END:\n", 0, stamp),
		).toEqual({ kind: "rejected", reason: "unsupported-logging-policy" })
	})
	it("coalesces keyword and log insertions at empty EOF heading", () => {
		const source = "#+TODO: TODO(!) | DONE\n* "
		const { result, plan } = run(source)
		expect(result).toContain("* TODO \n- State")
		expect(plan.edits).toHaveLength(1)
	})
})

describe("shape and applicable policy proof", () => {
	it.each([
		["CLOSED:[2025-03-31]", "CLOSED:[2025-04-01]"],
		["CLOSED:\t[2025-03-31\tMon]", "CLOSED:\t[2025-04-01\tTue]"],
		["CLOSED:  [2025-03-31  Mon\t08:00]", "CLOSED:  [2025-04-01  Tue\t09:07]"],
		["CLOSED: [2025-03-31\t08:00]", "CLOSED: [2025-04-01\t09:07]"],
	])("preserves CLOSED component shape %s", (before, after) => {
		const suffix = "  SCHEDULED: <2025-04-02 Wed 10:00 +1w>  DEADLINE: <2025-04-03 Thu>  "
		const source = `#+STARTUP: logdone\n* TODO x\n  ${before}${suffix}\nbody`
		const { result, plan } = run(source)
		expect(result).toBe(source.replace("* TODO", "* DONE").replace(before, after))
		expect(plan.edits).toHaveLength(2)
	})
	it.each([
		"[2025-03-31 Mo 08:00]",
		"[2025-03-31 Mon 08:00-09:00]",
		"[2025-03-31 Mon +1w]",
		"[2025-03-31 Mon 8:00]",
	])("fails closed for unsupported shape %s", (closed) => {
		const source = `#+STARTUP: logdone\n* TODO x\nCLOSED: ${closed}`
		expect(planOrgTodoTransition(source, source.indexOf("* TODO"), stamp).kind).toBe("rejected")
	})
	it.each(["CUSTOM_ID", "OTHER", "foo-bar", "KEY+"])("accepts valid empty property %s", (key) => {
		const source = `#+STARTUP: logdone\n* TODO x\n:PROPERTIES:\n:${key}:\n:END:\nbody`
		expect(run(source).result).toBe(source.replace("* TODO x\n", `* DONE x\nCLOSED: ${stamp}\n`))
	})
	it.each([
		":PROPERTIES:\n:LOGBOOK:\n:END:",
		":PROPERTIES:\n:CUSTOM_ID:\n:END:\n:END:",
		":PROPERTIES:\n:CUSTOM_ID:",
		":LOGBOOK:\n:END:\n:LOGBOOK:\n:END:",
		":PROPERTIES:\n:CUSTOM_ID:\n** Child\n:END:",
	])("refuses malformed drawers even with default logging off %s", (body) => {
		expect(planOrgTodoTransition(`* TODO x\n${body}`, 0, stamp).kind).not.toBe("edit")
	})
	it("distinguishes own, ancestor, sibling and repeated-level properties", () => {
		const property = ":PROPERTIES:\n:LOGGING: nil\n:END:"
		for (const source of [
			`* Parent\n${property}\n** TODO target`,
			`* Parent\n** TODO target\n${property}`,
			`* Parent\n** Child\n${property}\n*** TODO target`,
		])
			expect(
				planOrgTodoTransition(
					source,
					source.lastIndexOf("TODO target") - source.match(/\*+(?= TODO target)/)![0].length - 1,
					stamp,
				).kind,
			).toBe("rejected")
		for (const source of [
			`* Sibling\n${property}\n* TODO target`,
			`* Parent\n** Sibling\n${property}\n** TODO target`,
			`* Parent\n** Sibling\n${property}\n* Other\n** TODO target`,
			`* Parent\n** COMMENT sample\n${property}\n** TODO target`,
			`* Parent\n#+begin_src org\n${property}\n#+end_src\n** TODO target`,
			`* Parent\n:DATA:\n:LOGGING: nil\n:END:\n** TODO target`,
		]) {
			const pos =
				source.lastIndexOf("TODO target") - source.match(/\*+(?= TODO target)/)![0].length - 1
			expect(run(source, pos).result).toBe(source.replace("TODO target", "DONE target"))
		}
	})
	it.each([
		["lognotedone nologdone", "TODO", "DONE", false],
		["logdone lognotedone nologdone", "TODO", "DONE", false],
		["lognotedone\n#+STARTUP: logdone", "TODO", "DONE", true],
		["logdone\n#+STARTUP: nologdone", "TODO", "DONE", false],
		["lognotedone", "NEXT", "TODO", false],
		["lognotedone", "DONE", "", false],
	])("resolves final ordered policy %s before transition %s", (policy, old, next, closed) => {
		const source = `#+TODO: NEXT TODO | DONE\n#+STARTUP: ${policy}\n* ${old} task`
		const result = run(source).result
		expect(result).toContain(`* ${next ? next + " " : ""}task`)
		expect(result.includes("CLOSED:")).toBe(closed)
	})
	it("requires a done note only under the final note policy; state notes remain independent", () => {
		for (const source of [
			"#+STARTUP: nologdone lognotedone\n* TODO x",
			"#+STARTUP: lognotedone\n#+TODO: NEXT(n/@) TODO | DONE\n* NEXT x",
			"#+STARTUP: lognotedone nologdone\n#+TODO: NEXT TODO(@) | DONE\n* NEXT x",
		])
			expect(planOrgTodoTransition(source, source.indexOf("* "), stamp)).toEqual({
				kind: "needs-note",
			})
	})
})

describe("explicit multiline TODO notes", () => {
	it.each([
		"TODO(t/@) | DONE(d)",
		"TODO(t) | DONE(d@)",
		"TODO(t/@) | DONE(d@)",
	])("prepares and submits incoming/outgoing note policy %s once", (declaration) => {
		const source = `#+TODO: ${declaration}\n* TODO title\nbody`
		const cursor = source.indexOf("* ")
		expect(planOrgTodoTransition(source, cursor, stamp)).toEqual({ kind: "needs-note" })
		const { result, plan } = run(source, cursor, "first\nsecond")
		expect(result.match(/- State/g)).toHaveLength(1)
		expect(result).toContain('  : "first\\n"\n  : "second"\nbody')
		expect(result).not.toContain("CLOSED:")
		expect(planOrgTodoTransition(source, cursor, stamp, "first\nsecond")).toEqual(plan)
	})
	it.each(["", " \t\r\n", "\u2003"])("rejects blank note %j without edits", (note) => {
		const source = "#+TODO: TODO | DONE(@)\n* TODO x"
		expect(planOrgTodoTransition(source, source.indexOf("* "), stamp, note)).toEqual({
			kind: "rejected",
			reason: "invalid-note",
		})
	})
	it("rejects notes on unrelated transitions and inert source", () => {
		for (const source of ["* TODO x", "body", "* COMMENT x"])
			expect(planOrgTodoTransition(source, 0, stamp, "note")).toEqual({
				kind: "rejected",
				reason: "unexpected-note",
			})
	})
	it.each(["\n", "\r", "\r\n"])("roundtrips hostile literal bytes in %j source", (eol) => {
		const source = [
			"#+STARTUP: logdrawer",
			"#+TODO: TODO | DONE(@)",
			"* TODO café 😀",
			":LOGBOOK:",
			"old",
			":END:",
			"body",
		].join(eol)
		const note =
			'中文 😀\u0000\r\n:END:\r* DONE injected\n#+TODO: BAD | EVIL\n:PROPERTIES:\n\\ \"\t  \n'
		const { result, plan } = run(source, source.indexOf("* "), note)
		const chunks = result.split(/\r\n|\r|\n/).filter((line) => line.startsWith("  : "))
		expect(chunks.map((line) => JSON.parse(line.slice(4))).join("")).toBe(note)
		expect(result.split(/\r\n|\r|\n/).filter((line) => line === ":END:")).toHaveLength(1)
		expect(result).toContain(`old${eol}- State`)
		let restored = result
		let delta = 0
		const inverses = plan.edits.map((edit) => {
			const inverse = {
				from: edit.from + delta,
				to: edit.from + delta + edit.insert.length,
				insert: source.slice(edit.from, edit.to),
			}
			delta += edit.insert.length - (edit.to - edit.from)
			return inverse
		})
		for (const edit of inverses.reverse())
			restored = restored.slice(0, edit.from) + edit.insert + restored.slice(edit.to)
		expect(restored).toBe(source)
	})
	it("lognotedone adds CLOSED and a note, preserves planning shape and removes CLOSED on reopen", () => {
		const source =
			"#+STARTUP: lognotedone\n* TODO x\nCLOSED:\t[2025-03-31\tMon]  DEADLINE: <2025-04-03 Thu>\nbody"
		const result = run(source, source.indexOf("* "), "done").result
		expect(result).toContain("CLOSED:\t[2025-04-01\tTue]  DEADLINE:")
		expect(result).toContain('  : "done"\nbody')
		expect(run(result).result).not.toContain("CLOSED:")
		const bare = "#+STARTUP: lognotedone\n* TODO x"
		expect(run(bare, bare.indexOf("* "), "done").result).toContain(
			`* DONE x\nCLOSED: ${stamp}\n- State`,
		)
	})
	it("fails closed before note preparation or submission on malformed metadata and unsupported policy", () => {
		for (const suffix of [
			":LOGBOOK:\nunclosed",
			"CLOSED: broken",
			":PROPERTIES:\n:LOGGING: nil\n:END:",
		])
			for (const note of [undefined, "note"]) {
				const source = `#+TODO: TODO | DONE(@)\n* TODO x\n${suffix}`
				expect(planOrgTodoTransition(source, source.indexOf("* "), stamp, note).kind).toBe(
					"rejected",
				)
			}
	})
	it("quotes unsafe state payloads as JSON literals", () => {
		const source = "#+TODO: TODO | D\u0000ONE(!)\n* TODO x"
		expect(run(source).result).toContain('- State "D\\u0000ONE"')
	})
})
