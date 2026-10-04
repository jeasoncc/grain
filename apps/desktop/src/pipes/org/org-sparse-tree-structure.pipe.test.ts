import { describe, expect, it, vi } from "vitest"
import {
	buildOrgSparseTreePlan,
	orgEffectiveTagSnapshot,
	orgSparseTreeCandidates,
	parseOrgSparseTreeQuery,
} from "./org-sparse-tree.pipe"

const depth = 512
const lines = [
	"#+FILETAGS: :file:",
	...Array.from(
		{ length: depth },
		(_, index) => `${"*".repeat(index + 1)} TODO H${index} :t${index}:`,
	),
	"* Peer :peer:",
	"**** Child :own:",
]
const source = lines.join("\n")

/** Count structural work, not wall-clock time (source itself has quadratic star bytes). */
const measure = <T>(run: () => T) => {
	let iteratedTags = 0
	const columns: number[] = []
	const iterator = Set.prototype[Symbol.iterator]
	const spy = vi.spyOn(Set.prototype, Symbol.iterator).mockImplementation(function* (
		this: Set<unknown>,
	): Generator<unknown, undefined, unknown> {
		for (const value of iterator.call(this)) {
			iteratedTags += 1
			yield value
		}
		return undefined
	})
	const NativeUint8Array = Uint8Array
	vi.stubGlobal(
		"Uint8Array",
		new Proxy(NativeUint8Array, {
			construct(target, args) {
				columns.push(args[0] as number)
				return Reflect.construct(target, args)
			},
		}),
	)
	try {
		return { counts: () => ({ columns, iteratedTags }), result: run() }
	} finally {
		spy.mockRestore()
		vi.unstubAllGlobals()
	}
}

describe("structurally shared sparse ancestry", () => {
	it.each([
		"todo",
		"text:H511",
		"tag:t511",
	])("does not materialize inherited unions for %s", (input) => {
		const { result, counts } = measure(() =>
			buildOrgSparseTreePlan(source, parseOrgSparseTreeQuery(input)!),
		)
		expect(result.matchedHeadingStarts.length).toBeGreaterThan(0)
		expect(counts().columns).toEqual([])
		expect(counts().iteratedTags).toBeLessThan(depth * 4)
	})

	it("allocates one bounded column per distinct itag name, not per source tag or occurrence", () => {
		const query = parseOrgSparseTreeQuery(
			"match: (itag:t0 OR itag:t511) AND NOT itag:peer AND itag:t0",
		)!
		const { result, counts } = measure(() => buildOrgSparseTreePlan(source, query))
		expect(result.matchedHeadingStarts).toHaveLength(depth)
		expect(result.hiddenRanges).toEqual([{ from: source.indexOf("* Peer"), to: source.length }])
		expect(counts().columns).toEqual([depth + 2, depth + 2, depth + 2])
		expect(counts().iteratedTags).toBeLessThan(depth * 4)
		expect(
			buildOrgSparseTreePlan(source, { kind: "itag", name: "peer" }).matchedHeadingStarts,
		).toEqual([source.indexOf("* Peer"), source.indexOf("**** Child")])
	})

	it("builds candidates from one local union without copying ancestry", () => {
		const { result, counts } = measure(() => orgSparseTreeCandidates(source))
		expect(result).toEqual([
			"todo",
			"todo:TODO",
			"todo:DONE",
			...Array.from({ length: depth }, (_, index) => `tag:t${index}`),
			"tag:peer",
			"tag:own",
			"itag:file",
			...Array.from({ length: depth }, (_, index) => `itag:t${index}`),
			"itag:peer",
			"itag:own",
		])
		expect(counts().columns).toEqual([])
		expect(counts().iteratedTags).toBeLessThan(depth * 6)
	})

	it("keeps snapshot unions lazy, independently materialized and source ordered", () => {
		const { result: snapshot, counts } = measure(() => orgEffectiveTagSnapshot(source))
		expect(counts().iteratedTags).toBeLessThan(depth * 4)
		expect(
			snapshot.headings.every(
				(heading) =>
					typeof Object.getOwnPropertyDescriptor(heading, "effectiveTags")?.get === "function",
			),
		).toBe(true)
		expect(snapshot.headings[depth - 1].effectiveTags).toEqual([
			"file",
			...Array.from({ length: depth }, (_, index) => `t${index}`),
		])
		expect(snapshot.headings[depth + 1].effectiveTags).toEqual(["file", "peer", "own"])
		expect(snapshot.headings[0].effectiveTags).toEqual(["file", "t0"])
		expect(snapshot.headings[depth - 1].effectiveTags).toBe(
			snapshot.headings[depth - 1].effectiveTags,
		)
	})
})
