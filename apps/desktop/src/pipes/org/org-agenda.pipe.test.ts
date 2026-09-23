import { describe, expect, it } from "vitest"
import { parseOrgAgenda, sortOrgAgendaEntries } from "./org-agenda.pipe"

describe("parseOrgAgenda", () => {
	it("extracts planning and standalone timestamps with heading context", () => {
		const source = [
			"* TODO Release :work:",
			"SCHEDULED: <2025-04-03 Thu 09:00> DEADLINE: <2025-04-02 Wed>",
			"Meet on <2025-04-01 Tue> and reviewed [2025-03-31 Mon].",
			"** DONE Follow up",
			"<2025-04-04 Fri>",
		].join("\n")

		expect(parseOrgAgenda("projects/release.org", source)).toEqual([
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
		expect(entries).toEqual([
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
			"* COMMENT Hidden <2025-01-03 Fri>",
			"SCHEDULED: <2025-01-04 Sat>",
			"** Child <2025-01-05 Sun>",
			"#+BeGiN_sRc org",
			"* Not a heading <2025-01-06 Mon>",
			"#+EnD_sRc",
			"* TODO Visible",
			"<2025-01-07 Tue>",
		].join("\n")

		expect(parseOrgAgenda("ignored.org", source)).toEqual([
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
