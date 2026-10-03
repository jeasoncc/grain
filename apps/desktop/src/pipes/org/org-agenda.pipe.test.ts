import { describe, expect, it } from "vitest"
import { parseOrgAgenda, sortOrgAgendaEntries, validateOrgAgendaOrigin } from "./org-agenda.pipe"

describe("parseOrgAgenda", () => {
	it("binds metadata to the exact source generation and logical incarnation", () => {
		const source = "* TODO Task\n<2025-01-01>\nbody"
		const parsed = parseOrgAgenda("note.org", source)[0]
		const metadata = {
			runtimeIncarnation: "runtime-1",
			sourceGeneration: 1,
			workspaceSessionId: "session",
		}
		const entry = { ...parsed, origin: { ...parsed.origin, ...metadata, sourceRevision: "buffer" } }
		expect(validateOrgAgendaOrigin(entry, source, "buffer", metadata).valid).toBe(true)
		for (const changed of [
			{ ...metadata, sourceGeneration: 2 },
			{ ...metadata, runtimeIncarnation: "runtime-2" },
			{ ...metadata, workspaceSessionId: "new" },
			{},
		]) {
			expect(
				validateOrgAgendaOrigin(entry, source.replace("body", "edit"), "buffer", changed),
			).toEqual({ reason: "revision", valid: false })
		}
		const empty = { ...parsed, origin: { ...parsed.origin, sourceRevision: "" } }
		expect(validateOrgAgendaOrigin(empty, source, "").valid).toBe(false)
	})

	it("refuses unsafe paths and malformed input", () => {
		for (const path of ["../a.org", "/a.org", "a\\b.org", "a\n.org", "a:b.org", ""]) {
			expect(parseOrgAgenda(path, "<2025-01-01>")).toEqual([])
		}
		expect(parseOrgAgenda("a.org", null as unknown as string)).toEqual([])
	})

	it("keeps full-source eligibility and physical coordinates across mixed newlines", () => {
		const lines = [
			"😀",
			"#+TODO: NEXT | DONE",
			"* NEXT [#A] COMMENT Hidden",
			"<2025-01-01>",
			"** Child",
			"<2025-01-02>",
			"* NEXT Visible",
			"SCHEDULED: <2025-01-03>",
			":LOGBOOK:",
			"* Fake <2025-01-04>",
			":END:",
			"#+BeGiN_sRc",
			":END:",
			"#+end_example",
			"* Fake <2025-01-05>",
			"#+EnD_sRc",
			"#+title: <2025-01-06>",
			"# comment <2025-01-07>",
			": fixed <2025-01-08>",
			"<2025-01-09> <2025-01-09>",
		]
		const source = lines.map((line, i) => line + ["\r\n", "\r", "\n"][i % 3]).join("")
		const entries = parseOrgAgenda("raw.org", source)
		expect(entries.map(({ date, line, kind }) => [date, line, kind])).toEqual([
			["2025-01-03", 8, "scheduled"],
			["2025-01-09", 20, "timestamp"],
			["2025-01-09", 20, "timestamp"],
		])
		for (const entry of entries) {
			expect(entry.heading).toBe("Visible")
			expect(source.slice(entry.origin.timestamp.from, entry.origin.timestamp.to)).toBe(
				entry.origin.timestamp.text,
			)
			expect(validateOrgAgendaOrigin(entry, source).valid).toBe(true)
		}
	})

	it("never relocates by duplicate heading title or timestamp text", () => {
		const source = "* TODO Same\n<2025-01-01>\n* TODO Same\n<2025-01-01>"
		const entry = parseOrgAgenda("duplicate.org", source)[1]
		expect(validateOrgAgendaOrigin(entry, source.slice(source.indexOf("* TODO Same", 1)))).toEqual({
			reason: "source-drift",
			valid: false,
		})
		expect(
			validateOrgAgendaOrigin(entry, source.replace("* TODO Same", "* DONE Same")),
		).toMatchObject({ valid: true })
	})

	it("anchors duplicate timestamps in raw UTF-16 mixed-newline source", () => {
		const source = "😀 intro\r\n* TODO Dates\rAt <2025-04-01 Tue> then <2025-04-01 Tue>\n"
		const entries = parseOrgAgenda("raw.org", source)
		expect(entries).toHaveLength(2)
		for (const entry of entries) {
			const { timestamp, heading } = entry.origin
			expect(source.slice(timestamp.from, timestamp.to)).toBe(timestamp.text)
			expect(heading && source.slice(heading.from, heading.to)).toBe("* TODO Dates")
			expect(entry.line).toBe(3)
			expect(Object.isFrozen(entry.origin)).toBe(true)
			expect(Object.isFrozen(timestamp)).toBe(true)
			expect(validateOrgAgendaOrigin(entry, source)).toMatchObject({ valid: true })
			expect(validateOrgAgendaOrigin(entry, `x${source}`)).toEqual({
				reason: "source-drift",
				valid: false,
			})
		}
		expect(entries[0].origin.timestamp.from).not.toBe(entries[1].origin.timestamp.from)
	})

	it("shares configured states, arbitrary drawers and priority COMMENT boundaries", () => {
		const source = [
			":LOGBOOK:",
			"#+TODO: FAKE | FALSE",
			"#+begin_src",
			":END:",
			"#+TODO: NEXT | COMPLETE",
			"* NEXT [#A] COMMENT Hidden",
			"<2025-01-01>",
			"* NEXT Visible",
			"#+begin_src",
			"#+end_example",
			"<2025-01-02>",
			"#+end_src",
			"<2025-01-03>",
		].join("\n")
		expect(parseOrgAgenda("scope.org", source)).toMatchObject([
			{ date: "2025-01-03", heading: "Visible", todo: "NEXT" },
		])
	})

	it("rejects anchors whose text survives but parsing eligibility changed", () => {
		const source = "* Note\n<2025-01-01>"
		const entry = parseOrgAgenda("note.org", source)[0]
		expect(validateOrgAgendaOrigin(entry, source.replace("* Note", "# Note"))).toEqual({
			reason: "source-drift",
			valid: false,
		})
		const versioned = { ...entry, origin: { ...entry.origin, sourceRevision: "r1" } }
		expect(validateOrgAgendaOrigin(versioned, source, "r2")).toEqual({
			reason: "revision",
			valid: false,
		})
		expect(validateOrgAgendaOrigin(versioned, source, "r1")).toMatchObject({ valid: true })
	})

	it("extracts planning and standalone timestamps with heading context", () => {
		const source = [
			"* TODO Release :work:",
			"SCHEDULED: <2025-04-03 Thu 09:00> DEADLINE: <2025-04-02 Wed>",
			"Meet on <2025-04-01 Tue> and reviewed [2025-03-31 Mon].",
			"** DONE Follow up",
			"<2025-04-04 Fri>",
		].join("\n")

		expect(parseOrgAgenda("projects/release.org", source)).toMatchObject([
			{
				column: 8,
				date: "2025-04-01",
				heading: "Release :work:",
				kind: "timestamp",
				level: 1,
				line: 3,
				relativePath: "projects/release.org",
				todo: "TODO",
			},
			{
				column: 44,
				date: "2025-04-02",
				heading: "Release :work:",
				kind: "deadline",
				level: 1,
				line: 2,
				relativePath: "projects/release.org",
				todo: "TODO",
			},
			{
				column: 11,
				date: "2025-04-03",
				heading: "Release :work:",
				kind: "scheduled",
				level: 1,
				line: 2,
				relativePath: "projects/release.org",
				todo: "TODO",
			},
			{
				column: 0,
				date: "2025-04-04",
				heading: "Follow up",
				kind: "timestamp",
				level: 2,
				line: 5,
				relativePath: "projects/release.org",
				todo: "DONE",
			},
		])
	})

	it("does not count planning timestamps again as standalone timestamps", () => {
		const entries = parseOrgAgenda(
			"one.org",
			"* TODO One\nSCHEDULED: <2025-01-01 Wed> DEADLINE: <2025-01-01 Wed>",
		)
		expect(entries.map(({ kind }) => kind)).toEqual(["deadline", "scheduled"])
	})

	it("supports custom TODO syntax declared after a heading and tolerates unknown syntax", () => {
		const source = [
			"* WAIT(w) Not a parsed shortcut",
			"#+TODO: NEXT(n) WAIT(w) | COMPLETE(c)",
			"* WAIT Blocked",
			"#+unknown: <not-a-date>",
			"body <<target>> <2025-02-28 Fri +1w> <2025-02-30 Sun> <nonsense>",
		].join("\n")
		const entries = parseOrgAgenda("unknown.org", source)

		expect(entries).toHaveLength(1)
		expect(entries[0]).toMatchObject({
			date: "2025-02-28",
			heading: "Blocked",
			level: 1,
			line: 5,
			todo: "WAIT",
		})
	})

	it("handles CRLF input and timestamps before the first heading", () => {
		const entries = parseOrgAgenda(
			"windows.org",
			"<2024-02-29 Thu>\r\n* Note\r\nDEADLINE: <2024-03-01 Fri>\r\n",
		)
		expect(entries).toMatchObject([
			{
				column: 0,
				date: "2024-02-29",
				heading: null,
				kind: "timestamp",
				level: 0,
				line: 1,
				relativePath: "windows.org",
				todo: null,
			},
			{
				column: 10,
				date: "2024-03-01",
				heading: "Note",
				kind: "deadline",
				level: 1,
				line: 3,
				relativePath: "windows.org",
				todo: null,
			},
		])
	})

	it("ignores timestamps in directives, property drawers, and fixed-width examples", () => {
		const source = [
			"#+title: <2026-01-01 Thu>",
			"* Visible",
			":PROPERTIES:",
			":CUSTOM: <2026-01-02 Fri>",
			":END:",
			": <2026-01-03 Sat>",
			"body <2026-01-04 Sun>",
		].join("\n")
		expect(parseOrgAgenda("safe.org", source).map(({ date }) => date)).toEqual(["2026-01-04"])
	})

	it("ignores ordinary comments, COMMENT subtrees, and case-insensitive blocks", () => {
		const source = [
			"# commented <2025-01-01 Wed>",
			"  # indented comment <2025-01-02 Thu>",
			"#+BeGiN_sRc org",
			"* Not a heading <2025-01-06 Mon>",
			"#+EnD_sRc",
			"* COMMENT Hidden <2025-01-03 Fri>",
			"SCHEDULED: <2025-01-04 Sat>",
			"** Child <2025-01-05 Sun>",
			"* TODO Visible",
			"<2025-01-07 Tue>",
		].join("\n")

		expect(parseOrgAgenda("ignored.org", source)).toMatchObject([
			{
				column: 0,
				date: "2025-01-07",
				heading: "Visible",
				kind: "timestamp",
				level: 1,
				line: 10,
				relativePath: "ignored.org",
				todo: "TODO",
			},
		])
	})

	it("recognizes COMMENT after a custom TODO keyword and resumes at a sibling", () => {
		const source = [
			"#+TODO: NEXT | DONE",
			"* NEXT COMMENT Hidden",
			"<2025-02-01 Sat>",
			"** Nested <2025-02-02 Sun>",
			"* NEXT Visible",
			"<2025-02-03 Mon>",
		].join("\n")

		const entries = parseOrgAgenda("comments.org", source)
		expect(entries).toHaveLength(1)
		expect(entries[0]).toMatchObject({
			column: 0,
			date: "2025-02-03",
			heading: "Visible",
			line: 6,
			todo: "NEXT",
		})
	})

	it("only treats the line immediately after a heading as planning", () => {
		const source = [
			"* TODO Task",
			"SCHEDULED: <2025-03-01 Sat> DEADLINE: <2025-03-02 Sun>",
			"Body DEADLINE: <2025-03-03 Mon> and SCHEDULED: <2025-03-04 Tue>",
			"* Later",
			"ordinary body",
			"DEADLINE: <2025-03-05 Wed>",
		].join("\n")

		expect(
			parseOrgAgenda("planning.org", source).map(({ column, date, kind, line }) => ({
				column,
				date,
				kind,
				line,
			})),
		).toEqual([
			{ column: 11, date: "2025-03-01", kind: "scheduled", line: 2 },
			{ column: 38, date: "2025-03-02", kind: "deadline", line: 2 },
			{ column: 15, date: "2025-03-03", kind: "timestamp", line: 3 },
			{ column: 47, date: "2025-03-04", kind: "timestamp", line: 3 },
			{ column: 10, date: "2025-03-05", kind: "timestamp", line: 6 },
		])
	})

	it("assigns distinct zero-based columns to duplicate same-kind timestamps", () => {
		const entries = parseOrgAgenda(
			"duplicates.org",
			"* Dates\nAt <2025-04-01 Tue> then <2025-04-01 Tue>",
		)

		expect(entries.map(({ column, kind, line }) => ({ column, kind, line }))).toEqual([
			{ column: 3, kind: "timestamp", line: 2 },
			{ column: 25, kind: "timestamp", line: 2 },
		])
	})

	it("sorts deterministically by date, kind, path, line, then column", () => {
		const entries = sortOrgAgendaEntries([
			...parseOrgAgenda("z.org", "<2025-01-02 Thu>\n<2025-01-01 Wed>"),
			...parseOrgAgenda("a.org", "* Note <2025-01-01 Wed>\nDEADLINE: <2025-01-01 Wed>"),
		])
		expect(
			entries.map(({ date, kind, relativePath, line }) => [date, kind, relativePath, line]),
		).toEqual([
			["2025-01-01", "deadline", "a.org", 2],
			["2025-01-01", "timestamp", "a.org", 1],
			["2025-01-01", "timestamp", "z.org", 2],
			["2025-01-02", "timestamp", "z.org", 1],
		])
	})
})
