import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "./org-behavior-configuration.pipe"
import { describe, expect, it } from "vitest"
import {
	captureOrgAgendaOperation,
	freezeOrgAgendaEntrySnapshot,
	planAgendaOperation,
} from "./org-agenda-command-plan.pipe"
import { parseOrgAgenda } from "./org-agenda.pipe"
import { createOrgPlanningCommand } from "@/flows/org-command/org-planning.command"

const source = "* TODO Task\nSCHEDULED: <2026-09-30 Wed 10:30 +1w>\nbody\n"
const entry = () => structuredClone(parseOrgAgenda("tasks.org", source)[0]!)
const timestamp = "[2026-09-30 Wed 10:30]"

describe("agenda command planning", () => {
	it.each(["schedule", "deadline"] as const)("shares rich %s logging plans with Source, without partial note edits", (kind) => {
		const field = kind === "schedule" ? "SCHEDULED" : "DEADLINE"
		const policy = kind === "schedule" ? "lognotereschedule" : "lognoteredeadline"
		const raw = `#+STARTUP: ${policy} logdrawer\r\n* TODO 😀 Task\r\n${field}: <2026-09-30 Wed 10:30 +1w>\r\nbody\r\n`
		const target = parseOrgAgenda("tasks.org", raw)[0]!
		const context = Object.freeze({ today: "2026-09-30", now: "12:00", logStamp: "[2026-09-30 Wed 12:00]" })
		const command = Object.freeze({ kind, date: "<2026-10-01 08:00-10:00 .+1m --2d>", context })
		const required = planAgendaOperation(target, raw, command)
		expect(required.kind).toBe("needs-note")
		if (required.kind !== "needs-note") throw new Error("Expected note")
		expect(Object.isFrozen(required.command)).toBe(true)
		const accepted = { ...context, note: "literal 😀\r\n* not a heading\u0000" }
		const agenda = planAgendaOperation(required.entry, raw, { ...command, context: accepted })
		const sourceContext = { relativePath: target.relativePath, content: raw, cursor: target.origin!.heading!.from }
		const sourcePlan = createOrgPlanningCommand(field, "").execute(sourceContext, sourceContext, command.date, accepted)
		if (agenda.kind !== "edit" || sourcePlan.kind !== "batch") throw new Error("Expected atomic batch")
		expect(agenda.edits).toEqual(sourcePlan.batch.changes)
		expect(agenda.edits.length).toBeGreaterThan(1)
	})

	it.each(["schedule", "deadline"] as const)("holds %s whole-hour duration until literal note acceptance and freezes old-value logging time", kind => {
		const field = kind === "schedule" ? "SCHEDULED" : "DEADLINE"
		const policy = kind === "schedule" ? "lognotereschedule" : "lognoteredeadline"
		const raw = `#+STARTUP: ${policy} logdrawer\r\n* TODO 😀 Task\r\n${field}: <2026-10-20 Tue 08:00 ++1w/2w --2d>\r\nbody\0`
		const target = parseOrgAgenda("tasks.org", raw)[0]!
		const context = Object.freeze({ today: "2026-10-09", now: "23:45", defaultDate: "2026-10-20", defaultTime: "08:00", logStamp: "[2026-10-09 Fri 23:45]" })
		const command = { kind, date: "11:00+2", context }
		const deferred = planAgendaOperation(target, raw, command)
		expect(deferred.kind).toBe("needs-note")
		const sourceContext = { relativePath: target.relativePath, content: raw, cursor: target.origin!.heading!.from }
		expect(createOrgPlanningCommand(field, "").execute(sourceContext, sourceContext, command.date, context).kind).toBe("needs-note")
		if (deferred.kind !== "needs-note") throw new Error("Expected deferred note, not a partial edit")
		const note = "duration 😀\r\nbody\0"
		const accepted = planAgendaOperation(deferred.entry, raw, { ...command, context: { ...context, note } })
		if (accepted.kind !== "edit") throw new Error("Expected one atomic planning/logging batch")
		let output = raw
		for (const edit of [...accepted.edits].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(output).toContain(`${field}: <2026-10-20 11:00-13:00 ++1w/2w --2d>\r\n`)
		expect(output.split(context.logStamp)).toHaveLength(2)
		expect(output).toContain('"[2026-10-20 Tue 08:00 ++1w/2w --2d]"')
		expect(output).toContain(`  : ${JSON.stringify("duration 😀\r\n")}\r\n  : ${JSON.stringify("body\0")}\r\n`)
		expect(output.endsWith("body\0")).toBe(true)
	})

	it("plans Agenda Clock switch as one sorted raw batch using the exact live epoch identity", () => {
		const raw = "* TODO A 😀\r\nCLOCK: [2026-10-09 Fri 01:55]\r\nbody\0\r\n* TODO B\r\nbody"
		const target = parseOrgAgenda("tasks.org", raw, true).find(entry => entry.origin?.heading?.from === raw.indexOf("* TODO B"))!
		const result = planAgendaOperation(target, raw, { kind: "clock-in",
			clockContext: { stamp: "[2026-10-09 Fri 01:05]", elapsedMinutes: 10,
				expectedActiveClock: { from: raw.indexOf("CLOCK:"), start: "[2026-10-09 Fri 01:55]" } } })
		if (result.kind !== "edit") throw new Error("Expected atomic Clock switch across reversed local wall time")
		expect(result.edits).toHaveLength(2)
		let output = raw
		for (const edit of [...result.edits].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(output).toContain("CLOCK: [2026-10-09 Fri 01:55]--[2026-10-09 Fri 01:05] => 0:10\r\n")
		expect(output).toContain(":LOGBOOK:\r\nCLOCK: [2026-10-09 Fri 01:05]\r\n:END:")
		expect(output).toContain("body\0\r\n")
		expect(planAgendaOperation(target, raw, { kind: "clock-out", clockContext: { stamp: "[2026-10-09 Fri 01:05]", elapsedMinutes: 10,
			expectedActiveClock: { from: raw.indexOf("CLOCK:") + 1, start: "[2026-10-09 Fri 01:55]" } } })).toMatchObject({ kind: "rejected" })
		expect(captureOrgAgendaOperation({ kind: "clock-in", clockContext: { stamp: "[2026-10-09 Fri 01:05]", elapsedMinutes: 10 } })).toMatchObject({ kind: "rejected" })
	})

	it("returns the completed Clock report as a readonly Agenda outcome without an edit", () => {
		const raw = "* TODO Clock report\r\n:LOGBOOK:\r\nCLOCK: [2026-10-09 Fri 10:00]--[2026-10-09 Fri 10:05] => 0:05\r\n:END:\r\nbody\0"
		const target = parseOrgAgenda("tasks.org", raw, true)[0]!
		const outcome = planAgendaOperation(target, raw, { kind: "clock-report" })
		expect(outcome).toMatchObject({ kind: "report", report: { totalMinutes: 5, completedRows: 1, active: null } })
		expect("edits" in outcome).toBe(false)
	})

	it("applies the captured previous-state reset and original timestamp ranges", () => {
		const raw = "#+TODO: TODO WAIT | DONE\n* WAIT recurring\nSCHEDULED: <2026-09-30 Wed +1w>\nbody"
		const target = parseOrgAgenda("tasks.org", raw)[0]!
		const agenda = planAgendaOperation(target, raw, { kind: "cycle-todo", timestamp, repeatToState: true })
		if (agenda.kind !== "edit") throw new Error("Expected edit")
		let output = raw
		for (const edit of [...agenda.edits].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(output).toContain("* WAIT recurring")
		expect(output).toContain("SCHEDULED: <2026-10-07 Wed +1w>")
		expect(output).toContain(`:LAST_REPEAT: ${timestamp}`)
		expect(output).not.toContain("CLOSED:")
	})
	it("preserves detailed timestamps for unchanged dates", () => {
		expect(planAgendaOperation(entry(), source, { kind: "schedule", date: "2026-09-30" })).toEqual({
			kind: "unchanged",
		})
	})
	it("plans an edit without changing input", () => {
		const target = entry()
		const before = structuredClone(target)
		const result = planAgendaOperation(target, source, { kind: "deadline", date: "2026-10-01" })
		expect(result.kind).toBe("edit")
		expect(target).toEqual(before)
		if (result.kind !== "edit") throw new Error("Expected edit")
		expect(result.edits).toHaveLength(1)
	})
	it("rejects missing anchors and malformed planning", () => {
		expect(
			planAgendaOperation({ ...entry(), origin: undefined }, source, {
				kind: "cycle-todo",
				timestamp,
			}),
		).toMatchObject({ kind: "rejected" })
		expect(
			planAgendaOperation(entry(), source.replace("<2026-09-30 Wed 10:30 +1w>", "[bad>"), {
				kind: "prepare",
				field: "schedule",
			}),
		).toMatchObject({ kind: "rejected" })
	})
	it.each([
		"scheduled: <2026-09-30 Wed>",
		"Deadline: <2026-09-30 Wed>",
		"Closed: [2026-09-29 Tue] <2026-09-30 Wed>",
		"SCHEDULED: <2026-09-30 Wed> custom deadline: <2026-10-01 Thu>",
	])("rejects agenda preparation and edits for noncanonical planning %j", (line) => {
		const raw = `* TODO Task\n${line}\nbody\n`
		const target = parseOrgAgenda("tasks.org", raw)[0]!
		for (const operation of [
			{ kind: "prepare", field: "schedule" },
			{ kind: "prepare", field: "deadline" },
			{ kind: "schedule", date: "2026-10-02" },
			{ kind: "deadline", date: "2026-10-02" },
		] as const) {
			expect(planAgendaOperation(target, raw, operation)).toMatchObject({
				kind: "rejected",
			})
		}
	})
	it("returns an isolated deeply frozen note snapshot", () => {
		const raw = `#+TODO: TODO | DONE(@)\n${source}`
		const target = structuredClone(parseOrgAgenda("tasks.org", raw)[0]!)
		const result = planAgendaOperation(target, raw, { kind: "cycle-todo", timestamp })
		expect(result.kind).toBe("needs-note")
		if (result.kind !== "needs-note") throw new Error("Expected note")
		expect(result.entry).toEqual(target)
		expect(result.entry).not.toBe(target)
		expect(Object.isFrozen(result.entry.origin?.heading)).toBe(true)
		expect(Object.isFrozen(target.origin?.heading)).toBe(false)
	})
	it("freezes cloned nested anchors only", () => {
		const target = entry()
		const snapshot = freezeOrgAgendaEntrySnapshot(target)
		expect(Object.isFrozen(snapshot)).toBe(true)
		expect(Object.isFrozen(snapshot.origin)).toBe(true)
		expect(Object.isFrozen(snapshot.origin?.timestamp)).toBe(true)
		expect(Object.isFrozen(target)).toBe(false)
	})
})

describe("explicit Agenda metadata operations", () => {
	it("removes scheduling with the old-value log and preserves CLOSED and unrelated deadline bytes", () => {
		const raw = "#+STARTUP: logreschedule\n* DONE Task\nCLOSED: [2026-09-30 Wed 08:00] SCHEDULED: <2026-09-30 Wed +1w>  DEADLINE: <2026-10-02 Fri>\nbody\0"
		const target = parseOrgAgenda("tasks.org", raw)[0]!
		const plan = planAgendaOperation(target, raw, { kind: "remove-schedule", context: { today: "2026-09-30", logStamp: timestamp } })
		if (plan.kind !== "edit") throw new Error("Expected edit")
		let output = raw
		for (const edit of [...plan.edits].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(output).toContain("CLOSED: [2026-09-30 Wed 08:00]")
		expect(output).not.toContain("SCHEDULED:")
		expect(output).toContain("DEADLINE: <2026-10-02 Fri>")
		expect(output).toContain('Not scheduled, was "[2026-09-30 Wed +1w]"')
		expect(output).toContain("body\0")
	})
	it("uses the same direct-state/final-completion range semantics without intermediate state notes", () => {
		const raw = "#+TODO: TODO NEXT(@) | DONE\n* TODO Task\nSCHEDULED: <2026-09-30 Wed +1w>\nbody"
		const target = parseOrgAgenda("tasks.org", raw)[0]!
		const plan = planAgendaOperation(target, raw, { kind: "complete-repeating", timestamp })
		if (plan.kind !== "edit") throw new Error("Expected edit")
		let output = raw
		for (const edit of [...plan.edits].reverse()) output = output.slice(0, edit.from) + edit.insert + output.slice(edit.to)
		expect(output).toBe(raw.replace("* TODO", "* DONE").replace("+1w", "+0w"))
		expect(plan.done).toBe(true)
		const direct = planAgendaOperation(target, raw, { kind: "todo-state", state: "DONE", timestamp, logging: { repeat: "none", repeatToState: "DONE" } })
		expect(direct.kind).toBe("edit")
	})
	it("copies configured logging/inheritance and date-reader policy before asynchronous execution", () => {
		const logging = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.logging, repeatToState: "DONE" }
		const inheritance = { ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance, properties: ["REPEAT_TO_STATE"] }
		const captured = captureOrgAgendaOperation({ kind: "todo-state", state: "DONE", logging, inheritance }, timestamp)
		if (captured.kind !== "captured" || captured.operation.kind !== "todo-state") throw new Error("Expected capture")
		logging.repeatToState = "TODO"
		inheritance.properties.length = 0
		expect(captured.operation.logging?.repeatToState).toBe("DONE")
		expect(captured.operation.inheritance?.properties).toEqual(["REPEAT_TO_STATE"])
		expect(captureOrgAgendaOperation({ kind: "remove-deadline", context: { today: "2026-09-30" } }).kind).toBe("captured")
		expect(captureOrgAgendaOperation({ kind: "todo-state", state: 42 }, timestamp).kind).toBe("rejected")
	})
})

describe("agenda operation capture", () => {
	it.each([
		null,
		[],
		{},
		{ kind: "unknown" },
		{ kind: "prepare", field: "invalid" },
		{ kind: "schedule", date: "2026-02-30" },
		{ kind: "deadline", date: 42 },
		{ kind: "cycle-todo", timestamp: null },
		{ kind: "cycle-todo", note: 42 },
	])("rejects invalid runtime input %j", (input) => {
		expect(captureOrgAgendaOperation(input, timestamp).kind).toBe("rejected")
	})
	it("requires a valid explicit clock capture for TODO cycling", () => {
		expect(captureOrgAgendaOperation({ kind: "cycle-todo" }).kind).toBe("rejected")
		expect(captureOrgAgendaOperation({ kind: "cycle-todo" }, timestamp)).toEqual({
			kind: "captured",
			operation: { kind: "cycle-todo", timestamp },
		})
	})
	it("uses the supplied timestamp and snapshots only domain fields", () => {
		const input = { kind: "cycle-todo", timestamp, note: "reason", extra: "discard" }
		const captured = captureOrgAgendaOperation(input, "invalid")
		expect(captured).toEqual({
			kind: "captured",
			operation: { kind: "cycle-todo", timestamp, note: "reason" },
		})
		input.note = "changed"
		if (captured.kind !== "captured") throw new Error("Expected captured")
		expect(Object.isFrozen(captured.operation)).toBe(true)
		expect(captured.operation).toMatchObject({ note: "reason" })
	})
	it("owns only immutable calendar scalars and preserves the entire timestamp input", () => {
		const context = { today: "2026-09-30", now: "10:30", logStamp: timestamp, note: "literal", unrelated: {} }
		const date = "<2026-10-01 08:30 ++1w -2d>--<2026-10-02 09:00>"
		const result = captureOrgAgendaOperation({ kind: "deadline", date, context })
		if (result.kind !== "captured" || result.operation.kind !== "deadline") throw new Error("Expected captured deadline")
		context.today = "2026-10-09"
		context.note = "mutated"
		expect(result.operation.date).toBe(date)
		expect(result.operation.context).toEqual({ today: "2026-09-30", now: "10:30", logStamp: timestamp, note: "literal" })
		expect(Object.isFrozen(result.operation.context)).toBe(true)
	})
	it.each([
		{ kind: "prepare", field: "deadline" },
		{ kind: "schedule", date: "2026-09-30" },
		{ kind: "deadline", date: "2026-10-01" },
	])("captures %j without a clock", (input) => {
		expect(captureOrgAgendaOperation(input)).toEqual({ kind: "captured", operation: input })
	})
})
