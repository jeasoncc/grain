import { describe, expect, it } from "vitest"
import { planOrgSameFileRefile } from "./org-same-file-refile.pipe"
import { enumerateOrgRefileHeadings } from "./org-refile-target.pipe"
import { extractOrgSubtreeAt } from "./org-subtree-refile.pipe"

const moved = (source: string, cursor: number, targetTitle?: string) => {
	const target = targetTitle
		? enumerateOrgRefileHeadings(source).find((heading) => heading.heading.endsWith(targetTitle))
		: undefined
	const plan = planOrgSameFileRefile(source, cursor, source, target)
	if (plan.kind !== "edit") throw new Error(JSON.stringify(plan))
	expect(plan.batch.changes).toHaveLength(2)
	expect(plan.batch.changes.every(({ from, to }) => from !== 0 || to !== source.length)).toBe(true)
	return [...plan.batch.changes]
		.reverse()
		.reduce((text, edit) => text.slice(0, edit.from) + edit.insert + text.slice(edit.to), source)
}
describe("same-file source range planner", () => {
	it.each([
		"\n",
		"\r\n",
		"\r",
	])("maps targets on either side using exact raw offsets (%j)", (nl) => {
		const subtree = `* Move${nl}raw\0😀${nl}** Child${nl}`
		const target = `* Target${nl}text${nl}** Existing${nl}`
		const peer = `* Peer${nl}`
		const expected =
			target + subtree.replace("* Move", "** Move").replace("** Child", "*** Child") + peer
		expect(moved(subtree + target + peer, 2, "Target")).toBe(expected)
		expect(moved(target + peer + subtree, target.length + peer.length + 2, "Target")).toBe(expected)
	})
	it.each([
		"\r\n",
		"\r",
	])("moves raw EOF payload before a peer with mixed terminators (%j)", (separator) => {
		const source = `* Target\nbody${separator}* Peer\nunchanged\r\n* Move\rrawEOF`
		const plan = planOrgSameFileRefile(
			source,
			source.indexOf("* Move"),
			source,
			enumerateOrgRefileHeadings(source)[0],
		)
		expect(plan.kind).toBe("edit")
		if (plan.kind !== "edit") return
		const result = moved(source, source.indexOf("* Move"), "Target")
		expect(result).toBe(`* Target\nbody${separator}** Move\rrawEOF\n* Peer\nunchanged\r\n`)
		expect(result.slice(plan.batch.cursor)).toMatch(/^\*\* Move/)
		const anchor = plan.batch.changes[0]
		expect(source.slice(anchor.from, anchor.to)).toBe(separator)
	})
	it("protects drawers, unknown blocks and COMMENT structure while releveling only legal stars", () => {
		const source =
			"* COMMENT Move\r\n:LOGBOOK:\n* drawer fake\r#+begin_unknown\n:END:\r\n#+begin_unknown\r* block fake\n#+end_unknown\r\n** Child\n* Target\rtext\0λ"
		expect(enumerateOrgRefileHeadings(source).map((heading) => heading.heading)).toEqual([
			"* COMMENT Move",
			"** Child",
			"* Target",
		])
		expect(extractOrgSubtreeAt(source, source.indexOf("drawer fake"))).toBeNull()
		expect(moved(source, 2, "Target")).toBe(
			"* Target\rtext\0λ\r** COMMENT Move\r\n:LOGBOOK:\n* drawer fake\r#+begin_unknown\n:END:\r\n#+begin_unknown\r* block fake\n#+end_unknown\r\n*** Child\n",
		)
	})
	it("rejects self, descendants, stale source and stale heading before edits", () => {
		const source = "* Move\n** Child\n* Target\n"
		for (const target of enumerateOrgRefileHeadings(source).slice(0, 2))
			expect(planOrgSameFileRefile(source, 2, source, target).kind).toBe("rejected")
		expect(planOrgSameFileRefile(source + "x", 2, source).kind).toBe("rejected")
		expect(
			planOrgSameFileRefile(source, 2, source, {
				from: source.indexOf("* Target"),
				heading: "* Wrong",
			}).kind,
		).toBe("rejected")
	})
	it("rejects an unclosed drawer in a later peer without planning buffer edits", () => {
		const source = "* Move\n* Target\n* Peer\n:LOGBOOK:\nunclosed\n"
		const plan = planOrgSameFileRefile(source, 0, source, {
			from: source.indexOf("* Target"),
			heading: "* Target",
		})
		expect(plan).toEqual({ kind: "rejected", message: "Target source has an unclosed drawer." })
		expect(plan).not.toHaveProperty("batch")
	})

	it("rejects unclosed blocks and keeps exact already-in-place moves as no-ops", () => {
		const source = "* Parent\n** Move\nbody"
		expect(
			planOrgSameFileRefile(
				source,
				source.indexOf("** Move"),
				source,
				enumerateOrgRefileHeadings(source)[0],
			),
		).toMatchObject({ kind: "no-change", batch: { changes: [] } })
		expect(planOrgSameFileRefile(source, 2, source)).toMatchObject({
			kind: "no-change",
			batch: { changes: [] },
		})
		const broken = "* Target\n* Move\n#+begin_unknown\nraw"
		expect(
			planOrgSameFileRefile(
				broken,
				broken.indexOf("* Move"),
				broken,
				enumerateOrgRefileHeadings(broken)[0],
			).kind,
		).toBe("rejected")
	})
})
