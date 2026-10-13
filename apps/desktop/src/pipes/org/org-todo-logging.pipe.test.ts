import { describe, expect, it } from "vitest"
import {
	formatOrgLocalTimestamp,
	planOrgTodoTransition,
	validOrgLocalTimestamp,
	type OrgTodoRepeatOptions,
} from "./org-todo-logging.pipe"

const stamp = "[2025-04-01 Tue 09:07]"
const run = (source: string, position = source.indexOf("* "), note?: string, options?: OrgTodoRepeatOptions) => {
	const plan = planOrgTodoTransition(source, position, stamp, note, options)
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
	it("cycles the matching sequence and clears completed states without inventing a no-state log", () => {
		const source = "#+TODO: TODO | DONE(d/!)\n#+SEQ_TODO: NEXT(n) | COMPLETE(c!)\n* NEXT x"
		expect(run(source).result).toContain(`* COMPLETE x\n- State "COMPLETE"    from "NEXT" ${stamp}`)
		expect(run(source.replace("* NEXT x", "* DONE x")).result).toBe(source.replace("* NEXT x", "* x"))
	})
	it("fails closed for incoming or outgoing notes without partial edits", () => {
		for (const declaration of [
			"TODO(t/@) | DONE(d)",
			"TODO(t) | DONE(d@)",
		]) {
			const source = `#+TODO: ${declaration}\n* TODO title`
			expect(planOrgTodoTransition(source, source.indexOf("* "), stamp)).toMatchObject({
				kind: "needs-note",
			})
		}
	})
	it("incoming time logging suppresses outgoing note logging", () => {
		const source = "#+TODO: TODO(t/@) | DONE(d!)\n* TODO title"
		expect(run(source).result).toContain(`- State "DONE"        from "TODO" ${stamp}`)
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
		expect(result).toContain(`:LOGBOOK:\r\n- State "DONE"        from "TODO" ${stamp}\rold text\r:END:\nbody`)
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
		expect(planOrgTodoTransition(source, 0, stamp)).toMatchObject({ kind: "rejected" })
	})
	it("ignores GNU unknown LOGGING words but does not inherit COMMENT properties", () => {
		const file = "#+PROPERTY: LOGGING repeat\n* TODO task"
		expect(run(file, file.indexOf("* TODO")).result).toContain("* DONE task")
		const source = "* COMMENT example\n:PROPERTIES:\n:LOGGING: nil\n:END:\n* TODO task"
		expect(run(source, source.lastIndexOf("* TODO")).result).toContain("* DONE task")
		expect(run("* TODO task\n:PROPERTIES:\n:LOGGING: repeat\n:END:\n").result).toContain("* DONE task")
	})
	it("logs at an empty EOF heading without losing its keyword or introducing blank lines", () => {
		const source = "#+TODO: TODO(!) | DONE\n* "
		expect(run(source).result).toContain("* TODO \n- State")
	})
})

describe("shape and applicable policy proof", () => {
	it.each([
		["CLOSED:[2025-03-31]", "CLOSED:[2025-04-01]"],
		["CLOSED:\t[2025-03-31\tMon]", "CLOSED:\t[2025-04-01\tTue]"],
		["CLOSED:  [2025-03-31  Mon\t08:00]", "CLOSED:  [2025-04-01  Tue\t09:07]"],
		["CLOSED: [2025-03-31\t08:00]", "CLOSED: [2025-04-01\t09:07]"],
	])("preserves CLOSED component shape %s", (before, after) => {
		const suffix = "  SCHEDULED: <2025-04-02 Wed 10:00>  DEADLINE: <2025-04-03 Thu>  "
		const source = `#+STARTUP: logdone\n* TODO x\n  ${before}${suffix}\nbody`
		const { result } = run(source)
		expect(result).toBe(source.replace("* TODO", "* DONE").replace(before, after))
	})
	it.each([
		"[2025-03-31 Mo 08:00]",
		"[2025-03-31 Mon 08:00-09:00]",
		"[2025-03-31 Mon +1w]",
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
			).toBe("edit")
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
			expect(planOrgTodoTransition(source, source.indexOf("* "), stamp)).toMatchObject({
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
		expect(planOrgTodoTransition(source, cursor, stamp)).toMatchObject({ kind: "needs-note" })
		const { result } = run(source, cursor, "first\nsecond")
		expect(result.match(/- State/g)).toHaveLength(1)
		expect(result).toContain('  : "first\\n"\n  : "second"\nbody')
		expect(result).not.toContain("CLOSED:")
	})
	it.each(["", " \t\r\n", "\u2003"])("commits explicitly supplied blank notes without inventing note text %j", (note) => {
		const source = "#+TODO: TODO | DONE(@)\n* TODO x"
		const { result } = run(source, source.indexOf("* "), note)
		expect(result).toContain(`- State "DONE"        from "TODO" ${stamp}`)
		const chunks = result.split(/\r\n|\r|\n/).filter((line) => line.startsWith("  : "))
		expect(chunks.map((line) => JSON.parse(line.slice(4))).join("")).toBe(note)
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
		expect(result).toContain(`:LOGBOOK:${eol}- State`)
		expect(result).toContain(`${eol}old${eol}:END:`)
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
			`* DONE x\nCLOSED: ${stamp}\n- CLOSING NOTE`,
		)
	})
	it("fails closed before note preparation or submission on malformed metadata", () => {
		for (const suffix of [
			":LOGBOOK:\nunclosed",
			"CLOSED: broken",
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

describe("consumer-visible recurrence and canonical edit ranges", () => {
	it.each([
		["<2025-01-31 Fri +1m>", "<2025-03-03 Mon +1m>"],
		["<2024-02-29 Thu +1y>", "<2025-03-01 Sat +1y>"],
		["<2025-03-01 Sat +1w>", "<2025-03-08 Sat +1w>"],
		["<2025-03-30 Sun +2d>", "<2025-04-01 Tue +2d>"],
		["<2025-03-01 Sat ++1w>", "<2025-04-05 Sat ++1w>"],
		["<2025-03-01 Sat .+1m>", "<2025-05-01 Thu .+1m>"],
		["<2025-03-31 Mon 23:30 +2h>", "<2025-04-01 Tue 01:30 +2h>"],
		["<2025-03-31 Mon 09:00 ++1h>", "<2025-04-01 Tue 10:00 ++1h>"],
		["<2025-03-01 Sat 20:00 .+1d>", "<2025-04-02 Wed 20:00 .+1d>"],
		["<2025-03-01 Sat 20:00 .+1h>", "<2025-04-01 Tue 10:07 .+1h>"],
	])("advances %s, reopens the sequence, and records one completed transition", (before, after) => {
		const source = `* TODO recurring\nDEADLINE: ${before}\nbody`
		const { result, plan } = run(source)
		expect(plan.done).toBe(false)
		expect(result).toContain(`* TODO recurring\nDEADLINE: ${after}\n:PROPERTIES:\n:LAST_REPEAT: ${stamp}\n:END:\n`)
		expect(result).toContain(`- State "DONE"        from "TODO" ${stamp}\nbody`)
		expect(result).not.toContain("CLOSED:")
		expect(result.match(/- State/g)).toHaveLength(1)
	})
	it("resets to the matching sequence head, property selection, or explicit previous-state preference", () => {
		const prefix = "#+TODO: TODO | DONE\n#+SEQ_TODO: NEXT WAIT | FINISH\n"
		const source = `${prefix}* WAIT recurring\nDEADLINE: <2025-03-01 Sat +1m>\n`
		expect(run(source).result).toContain("* NEXT recurring")
		const explicit = source + ":PROPERTIES:\n:REPEAT_TO_STATE: WAIT\n:END:\n"
		expect(run(explicit).result).toContain("* WAIT recurring")
		const completedReset = explicit.replace(":REPEAT_TO_STATE: WAIT", ":REPEAT_TO_STATE: FINISH")
		expect(run(completedReset).result).toContain("* FINISH recurring")
		const invalid = explicit.replace(":REPEAT_TO_STATE: WAIT", ":REPEAT_TO_STATE: MISSING")
		expect(run(invalid).result).toContain("* NEXT recurring")
	})
	it("does not inherit REPEAT_TO_STATE by default, but honors file defaults", () => {
		const source = "#+TODO: NEXT TODO | DONE\n* Parent\n:PROPERTIES:\n:REPEAT_TO_STATE: TODO\n:END:\n** TODO recurring\n<2025-03-01 Sat +1m>\n"
		expect(run(source, source.indexOf("** TODO")).result).toContain("** NEXT recurring")
		const withFile = "#+PROPERTY: REPEAT_TO_STATE TODO\n" + source
		expect(run(withFile, withFile.indexOf("** TODO")).result).toContain("** TODO recurring")
	})
	it("composes both planning repeaters and one configured literal note in reversible raw ranges", () => {
		const source = "#+STARTUP: logdrawer\r\n* TODO 😀 recurring\r\nSCHEDULED:\t<2026-10-12 Mon 10:30-11:45 +1w -2d>  DEADLINE: <2026-10-14 Wed +1w>\r\nbody\\escaped\0\r\n** Child\r\nunchanged"
		const localStamp = "[2026-10-12 Mon 09:07]"
		const cursor = source.indexOf("* TODO")
		const options = { logging: { done: "time", repeat: "note" } } as const
		const prepared = planOrgTodoTransition(source, cursor, localStamp, undefined, options)
		expect(prepared.kind).toBe("needs-note")
		expect(prepared).not.toHaveProperty("edits")
		const note = "😀\\quoted \"note\"\r\n:END:\n\0"
		const plan = planOrgTodoTransition(source, cursor, localStamp, note, options)
		if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
		let result = source
		for (const edit of [...plan.edits].reverse()) result = result.slice(0, edit.from) + edit.insert + result.slice(edit.to)
		expect(result).toContain("* TODO 😀 recurring\r\nSCHEDULED:\t<2026-10-19 Mon 10:30-11:45 +1w -2d>  DEADLINE: <2026-10-21 Wed +1w>\r\n")
		expect(result.match(/:LAST_REPEAT:/g)).toHaveLength(1)
		expect(result.match(/^- State /gm)).toHaveLength(1)
		expect(result).not.toContain("CLOSED:")
		const chunks = result.split("\r\n").filter(line => line.startsWith("  : "))
		expect(chunks.map(line => JSON.parse(line.slice(4))).join("")).toBe(note)
		expect(result.endsWith(source.slice(source.indexOf("body")))).toBe(true)
		let delta = 0
		const inverse = plan.edits.map(edit => {
			const from = edit.from + delta
			delta += edit.insert.length - (edit.to - edit.from)
			return { from, to: from + edit.insert.length, insert: source.slice(edit.from, edit.to) }
		})
		for (const edit of inverse.reverse()) result = result.slice(0, edit.from) + edit.insert + result.slice(edit.to)
		expect(result).toBe(source)
	})
	it("advances every active own timestamp, preserves raw delimiters, and leaves children/protected literals unchanged", () => {
		const source = "* TODO recurring\r\nDEADLINE:\t<2025-03-01\tSat  08:00-09:00 +1m -3d>\r:PROPERTIES:\n:OTHER: Ω\u0000\r\n:LAST_REPEAT:\t[2025-03-01 Sat 08:00]\n:END:\rbody <2025-03-01 Sat +1w>\n[2025-03-01 Sat +1m]\r: <2025-03-01 Sat +1d>\n~<2025-03-01 Sat +1d>~ =<2025-03-01 Sat +1d>=\n#+begin_src org\n<2025-03-01 Sat +1d>\n#+end_src\n** TODO child\n<2025-03-01 Sat +1d>\n* sibling\r\n";
		const { result, plan } = run(source)
		expect(result).toContain("DEADLINE:\t<2025-04-01\tTue  08:00-09:00 +1m -3d>\r")
		expect(result).toContain(`:LAST_REPEAT:\t${stamp}\n`)
		expect(result).toContain("body <2025-03-08 Sat +1w>")
		expect(result).toContain(source.slice(source.indexOf("[2025-03-01 Sat +1m]")))
		let delta = 0
		const inverses = plan.edits.map((edit) => {
			const from = edit.from + delta
			delta += edit.insert.length - (edit.to - edit.from)
			return { from, to: from + edit.insert.length, insert: source.slice(edit.from, edit.to) }
		})
		let restored = result
		for (const inverse of inverses.reverse()) restored = restored.slice(0, inverse.from) + inverse.insert + restored.slice(inverse.to)
		expect(restored).toBe(source)
	})
	it("removes obsolete SCHEDULED and CLOSED together without eating remaining planning or body bytes", () => {
		const source = "* TODO recurring\nCLOSED: [2025-03-01 Sat 08:00]  SCHEDULED:\t<2025-03-01 Sat>   DEADLINE: <2025-03-01 Sat +1m>\nbody\n** child"
		const { result } = run(source)
		expect(result).toContain("* TODO recurring\nDEADLINE: <2025-04-01 Tue +1m>\n")
		expect(result).not.toContain("SCHEDULED:")
		expect(result).not.toContain("CLOSED:")
		expect(result.endsWith("body\n** child")).toBe(true)
	})
	it("nologrepeat reopens without forced logs/LAST_REPEAT but CLOCK still causes LAST_REPEAT", () => {
		const source = "#+STARTUP: nologrepeat\n* TODO recurring\nSCHEDULED: <2025-03-01 Sat +1m>\nbody"
		const { result } = run(source)
		expect(result).toBe(source.replace("<2025-03-01 Sat +1m>", "<2025-04-01 Tue +1m>"))
		const clocked = source + "\n:LOGBOOK:\nCLOCK: [2025-03-01 Sat 08:00]--[2025-03-01 Sat 09:00] =>  1:00\n:END:\n"
		expect(run(clocked).result).toContain(`:LAST_REPEAT: ${stamp}`)
	})
	it("requires literal repeat notes and returns only continuation data until explicitly committed", () => {
		const source = "#+STARTUP: lognoterepeat logdrawer\n* TODO recurring\nSCHEDULED: <2025-03-01 Sat +1m>\nbody"
		const cursor = source.indexOf("* TODO")
		const prepared = planOrgTodoTransition(source, cursor, stamp)
		expect(prepared.kind).toBe("needs-note")
		const note = "* hostile\r\n:END:\n\u0000  "
		const { result } = run(source, cursor, note)
		expect(result).toContain("* TODO recurring\nSCHEDULED: <2025-04-01 Tue +1m>")
		const chunks = result.split(/\r\n|\r|\n/).filter((line) => line.startsWith("  : "))
		expect(chunks.map((line) => JSON.parse(line.slice(4))).join("")).toBe(note)
		expect(result.match(/- State/g)).toHaveLength(1)
	})
	it.each([
		"DEADLINE: <2025-03-01 Sat +1h>",
		"DEADLINE: <2025-03-01 Sat +1m>\n:PROPERTIES:\n:LAST_REPEAT: broken\n:END:",
		"DEADLINE: <2025-03-01 Sat +1m>\n:PROPERTIES:\n:LAST_REPEAT: [2025-03-01 Sat 08:00]\n:LAST_REPEAT: [2025-03-01 Sat 08:00]\n:END:",
	])("refuses malformed repeat metadata without publishing partial edits: %s", (body) => {
		const source = `* TODO recurring\n${body}`
		expect(planOrgTodoTransition(source, 0, stamp)).toMatchObject({ kind: "rejected" })
	})
	it("does not repeat inactive-only timestamps or advance completed-to-completed transitions", () => {
		expect(run("* TODO item\n[2025-03-01 Sat +1m]").result).toBe("* DONE item\n[2025-03-01 Sat +1m]")
		const source = "#+TODO: TODO | DONE CANCELED\n* DONE item\n<2025-03-01 Sat +1m>"
		expect(run(source).result).toBe(source.replace("* DONE", "* CANCELED"))
	})
})

describe("direct TODO and final recurring completion", () => {
	it("plans a direct state without cycling through intermediate note states", () => {
		const source = "#+TODO: TODO NEXT(@) | DONE\n* TODO task"
		const { result, plan } = run(source, source.indexOf("* TODO"), undefined, { state: "DONE" })
		expect(plan.done).toBe(true)
		expect(result).toBe(source.replace("* TODO task", "* DONE task"))
		expect(planOrgTodoTransition(source, source.indexOf("* TODO"), stamp, undefined, { state: "MISSING" })).toMatchObject({ kind: "rejected", reason: "invalid-todo-state" })
	})
	it("cancels eligible repeaters rather than advancing on final completion", () => {
		const source = "* TODO task\n<2025-03-01 Sat +1w>\n"
		const plan = planOrgTodoTransition(source, 0, stamp, undefined, { finalCompletion: true })
		if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
		let output = source
		for (const edit of [...plan.edits].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(plan.done).toBe(true)
		expect(output).toBe("* DONE task\n<2025-03-01 Sat +0w>\n")
	})
	it("updates accepted date-only LAST_REPEAT and recognizes genuine structural clocks", () => {
		const source = "#+STARTUP: nologrepeat\n* TODO task\n:PROPERTIES:\n:LAST_REPEAT: [2025-03-01]\n:END:\n<2025-03-01 Sat +1w>\nCLOCK: [2025-03-01 Sat 08:00]--[2025-03-01 Sat 09:00] => 1:00\n"
		expect(run(source).result).toContain(`:LAST_REPEAT: ${stamp}`)
		const fake = "#+STARTUP: nologrepeat\n* TODO task\n<2025-03-01 Sat +1w>\nCLOCK: fake\n"
		expect(run(fake).result).not.toContain("LAST_REPEAT")
	})
	it("reports completion from the final reset keyword even when a timestamp repeats", () => {
		const source = "#+STARTUP: nologrepeat\n* TODO task\n:PROPERTIES:\n:REPEAT_TO_STATE: DONE\n:END:\n<2025-03-01 Sat +1w>\n"
		const { result, plan } = run(source)
		expect(result).toBe(source.replace("* TODO task", "* DONE task").replace("<2025-03-01 Sat +1w>", "<2025-03-08 Sat +1w>"))
		expect(plan.done).toBe(true)
	})
	it("advances eligible property timestamps and ignores fake clocks beside genuine clock rows", () => {
		const source = "#+STARTUP: nologrepeat\n* TODO task\n:PROPERTIES:\n:DATE: <2025-03-01 Sat +1w>\n:END:\nCLOCK: fake\nCLOCK: [2025-03-01 Sat 08:00]--[2025-03-01 Sat 09:00] => 1:00\n"
		const { result } = run(source)
		expect(result).toContain(":DATE: <2025-03-08 Sat +1w>")
		expect(result).toContain(`:LAST_REPEAT: ${stamp}`)
		expect(result).toContain("CLOCK: fake")
	})
})

describe("repeat edge source boundaries", () => {
	it.each(["\n", "\r", "\r\n"])("coalesces EOF properties/logs without invented blank separators for %j", (eol) => {
		const source = `* TODO recurring${eol}DEADLINE: <2025-03-01 Sat +1m>`
		expect(run(source).result).toBe(`* TODO recurring${eol}DEADLINE: <2025-04-01 Tue +1m>${eol}:PROPERTIES:${eol}:LAST_REPEAT: ${stamp}${eol}:END:${eol}- State "DONE"        from "TODO" ${stamp}${eol}`)
	})
	it("preserves LAST_REPEAT property separators/trailing bytes, and accepts an empty standard property", () => {
		const source = "* TODO recurring\n<2025-03-01 Sat +1m>\n"
		// The property drawer must be metadata, not placed after body.
		const withProperty = "* TODO recurring\n:PROPERTIES:\n:LAST_REPEAT:\t[2025-03-01 Sat 08:00] \t\n:END:\n<2025-03-01 Sat +1m>\n"
		expect(run(withProperty).result).toContain(`:LAST_REPEAT:\t${stamp} \t\n`)
		const empty = withProperty.replace(":LAST_REPEAT:\t[2025-03-01 Sat 08:00] \t", ":LAST_REPEAT:")
		expect(run(empty).result).toContain(`:LAST_REPEAT: ${stamp}\n`)
		expect(run(source).result).toContain("<2025-04-01 Tue +1m>")
	})
	it("ignores angle links and invalid ordinary dates that are not repeaters", () => {
		const source = "* TODO target\n<https://example.org> <not-a-date> <2025-02-30 Sun>\n"
		expect(run(source).result).toBe(source.replace("* TODO", "* DONE"))
	})
	it("incoming time logging also suppresses a closing note; repeat-note policy still upgrades it", () => {
		const source = "#+STARTUP: lognotedone\n#+TODO: TODO | DONE(!)\n* TODO target"
		expect(run(source).result).toContain(`- State "DONE"        from "TODO" ${stamp}`)
		const repeated = source.replace("#+STARTUP: lognotedone", "#+STARTUP: lognoterepeat") + "\n<2025-03-01 Sat +1m>"
		expect(planOrgTodoTransition(repeated, repeated.indexOf("* TODO"), stamp)).toMatchObject({ kind: "needs-note" })
	})
})
