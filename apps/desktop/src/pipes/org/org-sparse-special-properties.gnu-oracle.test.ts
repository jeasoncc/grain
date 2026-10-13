import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import fixture from "./org-sparse-special-properties.gnu-fixtures.json"
import { captureOrgSparseSpecialProperties, orgSparseSpecialPropertyClockRequest, type OrgSparseSpecialPropertyContext } from "./org-sparse-special-properties.pipe"
import {
	OrgSparseTreeContextRequiredError,
	orgSparseTreeSpecialPropertyRequest,
	parseOrgSparseTreeQuery,
	type OrgSparseSpecialPropertyName,
} from "./org-sparse-tree.pipe"

interface NativeRow {
	readonly id: string
	readonly todayStartEpochMs: number
	readonly todayEndEpochMs: number
	readonly localTimes: readonly { readonly fields: readonly number[]; readonly epochMs: number }[]
	readonly values: readonly { readonly headingStart: number; readonly FILE: string | null; readonly BLOCKED: string; readonly CLOCKSUM: string | null; readonly CLOCKSUM_T: string | null }[]
}
interface NativeEvidence {
	readonly emacsVersion: string
	readonly orgVersion: string
	readonly rows: readonly NativeRow[]
}
const allProperties: readonly OrgSparseSpecialPropertyName[] = ["FILE", "BLOCKED", "CLOCKSUM", "CLOCKSUM_T"]
const requestFor = (source: string) => {
	const query = parseOrgSparseTreeQuery('match:FILE=""|BLOCKED=""|CLOCKSUM=""|CLOCKSUM_T=""')
	if (!query) throw new Error("Required native special-property query did not parse")
	return orgSparseTreeSpecialPropertyRequest(source, query)
}
const contextFor = (entry: (typeof fixture.cases)[number], native: NativeRow): OrgSparseSpecialPropertyContext => {
	const times = new Map<string, number>()
	for (const row of native.localTimes) {
		const key = row.fields.join(","), previous = times.get(key)
		if (previous !== undefined && previous !== row.epochMs) throw new OrgSparseTreeContextRequiredError(`Incompatible native tuple mapping: ${entry.id}: ${key}`, "clock")
		times.set(key, row.epochMs)
	}
	return {
		fileName: entry.fileName,
		dependencies: { enforceTodoDependencies: entry.todoDependencies, enforceCheckboxDependencies: entry.checkboxDependencies, blockerHooks: "gnu-default" },
		clock: {
			nowEpochMs: entry.nowEpochMs, todayStartEpochMs: native.todayStartEpochMs, todayEndEpochMs: native.todayEndEpochMs,
			localTimeToEpochMs: (...fields) => {
				const epoch = times.get(fields.join(","))
				if (epoch === undefined) throw new Error(`No independently captured GNU local-time encoding: ${entry.id}: ${fields}`)
				return epoch
			},
			durationFormat: entry.durationFormat as "gnu-default" | "h:mm" | "h:mm:ss",
			includeClockingTask: entry.includeClockingTask,
			activeClock: entry.activeClock,
		},
	}
}
const compareOwnedFixtures = (native: NativeEvidence) => {
	const rows = new Map(native.rows.map((row) => [row.id, row]))
	for (const entry of fixture.cases) {
		const row = rows.get(entry.id)
		if (!row) throw new Error(`Missing native evidence: ${entry.id}`)
		const request = requestFor(entry.source)
		expect([...request.properties].sort(), entry.id).toEqual([...allProperties].sort())
		const expected = new Map(row.values.map((value) => [value.headingStart, value]))
		const encoded = new Map(row.localTimes.map((time) => [time.fields.join(","), time.epochMs]))
		const calendarRequest = orgSparseSpecialPropertyClockRequest(entry.source, request)
		expect(orgSparseSpecialPropertyClockRequest(entry.source, request)).toBe(calendarRequest)
		for (const time of calendarRequest.calendarTimes) {
			expect(encoded.has(time.join(",")), `${entry.id}: independent native tuple ${time}`).toBe(true)
		}
		const columns = captureOrgSparseSpecialProperties(entry.source, request, contextFor(entry, row))
		for (const property of allProperties) {
			const column = columns.get(property)
			expect(column?.size, `${entry.id}: ${property} required-only rows`).toBe(request.headingStarts.length)
			for (const from of request.headingStarts) {
				const value = expected.get(from)
				expect(value, `${entry.id}: native raw UTF-16 heading ${from}`).toBeDefined()
				expect.soft(column?.has(from), `${entry.id}: ${property} ${from} available including nil`).toBe(true)
				expect.soft(column?.get(from), `${entry.id}: ${property} at raw UTF-16 ${from}`).toBe(value?.[property] ?? undefined)
			}
		}
	}
}

const regexRequestFor = (source: string) => {
	const query = parseOrgSparseTreeQuery("match:FILE={.*}|BLOCKED={.*}|CLOCKSUM={.*}|CLOCKSUM_T={.*}")
	if (!query) throw new Error("Native property operand-regexp query did not parse")
	return orgSparseTreeSpecialPropertyRequest(source, query)
}

describe("owned GNU special-property primitive evidence", () => {
	it("requests property operand regex columns after the same Source tag-group expansion", () => {
		const source = "* TODO First\n** TODO Second\n"
		expect([...regexRequestFor(source).properties].sort()).toEqual([...allProperties].sort())
		expect(regexRequestFor(source).headingStarts).toEqual([0, 13])
		const shadowed = "#+TAGS: [ FILE : owned ]\n* TODO First :owned:\n"
		const query = parseOrgSparseTreeQuery("match:FILE={.*}")
		if (!query) throw new Error("Source-group-shadowed query did not parse")
		expect(orgSparseTreeSpecialPropertyRequest(shadowed, query).properties).toEqual([])
		expect(orgSparseSpecialPropertyClockRequest(source, { properties: ["FILE"], headingStarts: [0] }).calendarTimes).toEqual([])
	})

	it("refreshes parsed clock rows from the current Source rather than retaining prior totals", () => {
		const first = fixture.cases.find((entry) => entry.id === "duration-gnu-default")!
		const second = fixture.cases.find((entry) => entry.id === "naked-duration")!
		const firstNative = fixture.native.rows.find((entry) => entry.id === first.id)!
		const secondNative = fixture.native.rows.find((entry) => entry.id === second.id)!
		const request = { properties: ["CLOCKSUM"] as const, headingStarts: [0] }
		const previous = orgSparseSpecialPropertyClockRequest(first.source, request)
		expect(captureOrgSparseSpecialProperties(first.source, request, contextFor(first, firstNative)).get("CLOCKSUM")?.get(0)).toBe(firstNative.values[0].CLOCKSUM)
		expect(orgSparseSpecialPropertyClockRequest(second.source, request)).not.toBe(previous)
		expect(captureOrgSparseSpecialProperties(second.source, request, contextFor(second, secondNative)).get("CLOCKSUM")?.get(0)).toBe(secondNative.values[0].CLOCKSUM)
	})

	it("projects the committed actual GNU strings at eligible raw UTF-16 offsets", () => {
		compareOwnedFixtures(fixture.native)
	})

	it("reproduces static evidence with the installed unmodified GNU property and summation primitives", () => {
		const result = spawnSync("emacs", ["--batch", "-Q", "--script", join(dirname(fileURLToPath(import.meta.url)), "org-sparse-special-properties.gnu-oracle.el")], {
			input: JSON.stringify({ cases: fixture.cases }), encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024,
		})
		expect(result.error, "GNU is required, not mocked or silently skipped").toBeUndefined()
		expect(result.status, result.stderr).toBe(0)
		const native = JSON.parse(result.stdout) as NativeEvidence
		expect(native.rows).toEqual(fixture.native.rows)
		compareOwnedFixtures(native)
	}, 70000)

	it("distinguishes available nonvisiting FILE and zero clock nil from unavailable context", () => {
		const source = "* TODO Empty\n"
		const request = requestFor(source)
		const entry = fixture.cases[0], row = fixture.native.rows[0]
		const context = contextFor(entry, row)
		const columns = captureOrgSparseSpecialProperties(source, request, context)
		for (const property of ["FILE", "CLOCKSUM", "CLOCKSUM_T"] as const) {
			expect(columns.get(property)?.has(0)).toBe(true)
			expect(columns.get(property)?.get(0)).toBeUndefined()
		}
		expect(columns.get("BLOCKED")?.get(0)).toBe("")
		for (const [property, contextName] of [["FILE", "file"], ["BLOCKED", "dependency"], ["CLOCKSUM", "clock"], ["CLOCKSUM_T", "clock"]] as const) {
			try {
				captureOrgSparseSpecialProperties(source, { properties: [property], headingStarts: [0] }, {})
				throw new Error(`Unexpected available ${property}`)
			} catch (error) {
				expect(error).toBeInstanceOf(OrgSparseTreeContextRequiredError)
				expect((error as OrgSparseTreeContextRequiredError).context).toBe(contextName)
			}
		}
	})

	it("rejects unavailable custom dependency hooks instead of inventing an unblocked value", () => {
		const request = { properties: ["BLOCKED"] as const, headingStarts: [0] }
		for (const blockerHooks of ["custom", "unavailable"] as const) {
			expect(() => captureOrgSparseSpecialProperties("* TODO Task\n", request, {
				dependencies: { enforceTodoDependencies: false, enforceCheckboxDependencies: false, blockerHooks },
			})).toThrow(OrgSparseTreeContextRequiredError)
		}
		expect(captureOrgSparseSpecialProperties("* TODO Task\n** TODO Child\n", request, {
			dependencies: { enforceTodoDependencies: true, enforceCheckboxDependencies: true, blockerHooks: "none" },
		}).get("BLOCKED")?.get(0)).toBe("")
	})

	it("preserves repeated endpoint occurrences and rejects a missing native encoding", () => {
		const entry = fixture.cases.find((value) => value.id === "dst-ambiguous-fall")!
		const native = fixture.native.rows.find((value) => value.id === entry.id)!
		const source = `${entry.source}${entry.source.slice(entry.source.indexOf("\n") + 1)}`
		const request = { properties: ["CLOCKSUM"] as const, headingStarts: [0] }
		const calendar = orgSparseSpecialPropertyClockRequest(source, request)
		expect(calendar.calendarTimes).toHaveLength(4)
		expect(calendar.calendarTimes.slice(0, 2)).toEqual(calendar.calendarTimes.slice(2))
		const context = contextFor(entry, native)
		if (!context.clock) throw new Error("Owned clock context missing")
		try {
			captureOrgSparseSpecialProperties(source, request, { clock: {
				...context.clock, localTimeToEpochMs: () => { throw new Error("Native mapping unavailable") },
			} })
			throw new Error("Unexpected fake native clock encoding")
		} catch (error) {
			expect(error).toBeInstanceOf(OrgSparseTreeContextRequiredError)
			expect((error as OrgSparseTreeContextRequiredError).context).toBe("clock")
		}
	})

	it("captures only requested rows and columns without invoking unrelated authorities", () => {
		const source = "* TODO One\n* TODO Two\n"
		const columns = captureOrgSparseSpecialProperties(source, { properties: ["FILE"], headingStarts: [11] }, { fileName: "/owned/full.org" })
		expect([...columns.keys()]).toEqual(["FILE"])
		expect([...columns.get("FILE")!]).toEqual([[11, "/owned/full.org"]])
		expect(captureOrgSparseSpecialProperties(source, { properties: [], headingStarts: [] }, {}).size).toBe(0)
	})
})
