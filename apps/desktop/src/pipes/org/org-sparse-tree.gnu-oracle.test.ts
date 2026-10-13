import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import type { OrgSparseTreeQuery } from "@/types/org"
import fixture from "./org-sparse-tree.gnu-fixtures.json"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION, parseOrgBehaviorConfiguration } from "./org-behavior-configuration.pipe"
import { buildOrgSparseTreePlan, OrgSparseTreeContextRequiredError, orgSparseTreeComparableStrings, parseOrgSparseTreeQuery } from "./org-sparse-tree.pipe"
import { orgMatchRegExp } from "./org-sparse-tree-query.pipe"
import { isOrgDefaultWordCharacter } from "./org-default-syntax.pipe"
import { selectOrgRemarkSource } from "./org-remark.pipe"

import { readOrgDate } from "./org-date-reader.pipe"
interface GNUOracleResult {
	readonly emacsVersion: string
	readonly orgVersion: string
	readonly collationGroups: readonly (readonly number[])[]
	readonly rows: readonly { readonly id: string; readonly offsets?: readonly number[]; readonly error?: string }[]
	readonly syntaxProbes: readonly { readonly id: string; readonly matches: boolean; readonly index: number | null; readonly captures: readonly (string | null)[] | null }[]
	readonly regexpErrors: readonly { readonly pattern: string; readonly error: string | null }[]
	readonly dateProbes: readonly { readonly id: string; readonly start: string; readonly endTime: string | null }[]
	readonly wordSelections: readonly { readonly source: string; readonly point: number; readonly bounds: readonly [number, number] | null }[]
}

describe("independent installed GNU Org match oracle on owned fixtures", () => {
	it("compares native scan results to Grain raw UTF-16 heading starts, without hand-written GNU expectations", () => {
		const queries = new Map<string, OrgSparseTreeQuery>()
		const strings = new Set<string>()
		for (const entry of fixture.cases) {
			if ("contextual" in entry && entry.contextual) continue
			const inheritance = fixture.configurations[entry.configuration as keyof typeof fixture.configurations]
			const configuration = parseOrgBehaviorConfiguration(JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, inheritance }))
			if (E.isLeft(configuration)) throw new Error(`${entry.id}: ${configuration.left.message}`)
			const query = parseOrgSparseTreeQuery(`match:${entry.match}`, configuration.right.inheritance)
			expect(query, `${entry.id}: ${entry.match}`).not.toBeNull()
			if (!query) throw new Error(entry.id)
			queries.set(entry.id, query)
			for (const value of orgSparseTreeComparableStrings(fixture.sources[entry.source as keyof typeof fixture.sources], query)) strings.add(value)
		}
		const collationStrings = [...strings]
		const result = spawnSync("emacs", ["--batch", "-Q", "--script", join(dirname(fileURLToPath(import.meta.url)), "org-sparse-tree.gnu-oracle.el")], {
			input: JSON.stringify({ ...fixture, collationStrings }), encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024,
			env: { ...process.env, TZ: "UTC" },
		})
		expect(result.error, "GNU Emacs is a required independent oracle, not an optional mock").toBeUndefined()
		expect(result.status, result.stderr).toBe(0)
		const native = JSON.parse(result.stdout) as GNUOracleResult
		const probes = new Map(native.syntaxProbes.map((probe) => [probe.id, probe]))
		for (const probe of fixture.syntaxProbes) {
			const mode = probe.mode === "tag" ? "tag" : "property"
			const matcher = orgMatchRegExp(probe.pattern, mode)
			const from = "from" in probe ? probe.from : 0
			const match = matcher.exec(probe.value, from)
			const observation = probes.get(probe.id)
			expect.soft(match !== null, probe.id).toBe(observation?.matches)
			expect.soft(match?.index ?? null, `${probe.id}: raw UTF-16 match index`).toBe(observation?.index)
			const captures = match ? Array.from(match, (value) => value ?? null) : null
			const nativeCaptures = observation?.captures ? [...observation.captures] : null
			while (captures?.at(-1) === null) captures.pop()
			while (nativeCaptures?.at(-1) === null) nativeCaptures.pop()
			expect.soft(captures, `${probe.id}: original-text capture numbers`).toEqual(nativeCaptures)
			if ("wordProbe" in probe && probe.wordProbe) expect.soft(isOrgDefaultWordCharacter(probe.value), probe.id).toBe(observation?.matches)
		}
		const errors = new Map(native.regexpErrors.map((entry) => [entry.pattern, entry.error]))
		for (const pattern of fixture.regexpErrors) {
			expect.soft(errors.get(pattern), `${pattern}: GNU invalid-regexp`).toBeTypeOf("string")
			expect(() => orgMatchRegExp(pattern), pattern).toThrow()
		}
		const dates = new Map(native.dateProbes.map((probe) => [probe.id, probe]))
		for (const probe of fixture.dateProbes) {
			const parsed = readOrgDate(probe.input, { today: fixture.today, now: fixture.now, defaultDate: probe.defaultDate, defaultTime: probe.defaultTime })
			expect.soft(parsed.kind, probe.id).toBe("date")
			if (parsed.kind !== "date") continue
			expect.soft(`${parsed.date}${parsed.timestamp?.time ? ` ${parsed.timestamp.time}` : ""}`, `${probe.id}: frozen/default start`).toBe(dates.get(probe.id)?.start)
			expect.soft(parsed.timestamp?.endTime ?? null, `${probe.id}: duration endpoint`).toBe(dates.get(probe.id)?.endTime)
		}
		for (const [id, source] of Object.entries(fixture.wordSources)) {
			const selections = native.wordSelections.filter((selection) => selection.source === id)
			expect.soft(selections.length, `${id}: every decoded boundary`).toBe(Array.from(source.replaceAll("\r\n", "\n")).length + 1)
			for (const observation of selections) {
				const selection = selectOrgRemarkSource({ source, point: observation.point })
				const label = `${id}: raw point ${observation.point}`
				if (observation.bounds === null) expect.soft(selection.kind, label).toBe("rejected")
				else {
					expect.soft(selection.kind, label).toBe("ready")
					if (selection.kind === "ready") {
						expect.soft([selection.from, selection.to], label).toEqual(observation.bounds)
						expect.soft(selection.originalText, label).toBe(source.slice(...observation.bounds).replaceAll("\r\n", "\n").replaceAll("\n", " "))
					}
				}
			}
		}
		console.info("Installed GNU matcher oracle", { emacsVersion: native.emacsVersion, orgVersion: native.orgVersion, cases: fixture.cases.length, rows: native.rows.length })
		const rows = new Map(native.rows.map((row) => [row.id, row]))
		const ranks = new Map<string, number>()
		for (const [rank, indices] of native.collationGroups.entries()) {
			for (const index of indices) ranks.set(collationStrings[index], rank)
		}
		const nativeContext = { compareStrings: (left: string, right: string): number => {
			const a = ranks.get(left), b = ranks.get(right)
			if (a === undefined || b === undefined) throw new OrgSparseTreeContextRequiredError("Native collation has no captured rank")
			return a - b
		} }
		const previousTimezone = process.env.TZ
		process.env.TZ = "UTC"
		try {
			for (const entry of fixture.cases) {
				const row = rows.get(entry.id)
				expect.soft(row?.error, `${entry.id}: ${entry.match}`).toBeUndefined()
				expect.soft(row?.offsets, entry.id).toBeDefined()
				if (!row?.offsets || row.error) continue
				if ("contextual" in entry && entry.contextual) {
					// GNU observations for integration, not a claim that raw-source
					// Grain has file/clock/dependency context it does not own.
					const source = fixture.sources[entry.source as keyof typeof fixture.sources]
					const query = parseOrgSparseTreeQuery(`match:${entry.match}`)!
					expect(() => buildOrgSparseTreePlan(source, query)).toThrow(OrgSparseTreeContextRequiredError)
					continue
				}
				const source = fixture.sources[entry.source as keyof typeof fixture.sources]
				const query = queries.get(entry.id)!
				const plan = buildOrgSparseTreePlan(source, query, undefined, { today: fixture.today, now: fixture.now }, nativeContext)
				const nativeOnly = row.offsets.filter((offset) => !plan.matchedHeadingStarts.includes(offset))
				const grainOnly = plan.matchedHeadingStarts.filter((offset) => !row.offsets!.includes(offset))
				expect.soft(plan.matchedHeadingStarts, `${entry.id}: ${entry.match}; native-only=${JSON.stringify(nativeOnly.map((offset) => source.slice(offset).split(/\r\n|\r|\n/, 1)[0]))}; Grain-only=${JSON.stringify(grainOnly.map((offset) => source.slice(offset).split(/\r\n|\r|\n/, 1)[0]))}`).toEqual(row.offsets)
			}
		} finally {
			if (previousTimezone === undefined) delete process.env.TZ
			else process.env.TZ = previousTimezone
		}
	}, 70000)
})
