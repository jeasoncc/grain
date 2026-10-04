import { describe, expect, it } from "vitest"
import {
	captureOrgAgendaOperation,
	freezeOrgAgendaEntrySnapshot,
	planAgendaOperation,
} from "./org-agenda-command-plan.pipe"
import { parseOrgAgenda } from "./org-agenda.pipe"

const source = "* TODO Task\nSCHEDULED: <2026-09-30 Wed 10:30 +1w>\nbody\n"
const entry = () => structuredClone(parseOrgAgenda("tasks.org", source)[0]!)
const timestamp = "[2026-09-30 Wed 10:30]"

describe("agenda command planning", () => {
	it("prepares existing planning without allocating or changing provenance", () => {
		const target = entry()
		expect(planAgendaOperation(target, source, { kind: "prepare", field: "schedule" })).toEqual({
			kind: "ready",
			entry: target,
			date: "2026-09-30",
		})
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
	it.each([
		{ kind: "prepare", field: "deadline" },
		{ kind: "schedule", date: "2026-09-30" },
		{ kind: "deadline", date: "2026-10-01" },
	])("captures %j without a clock", (input) => {
		expect(captureOrgAgendaOperation(input)).toEqual({ kind: "captured", operation: input })
	})
})
