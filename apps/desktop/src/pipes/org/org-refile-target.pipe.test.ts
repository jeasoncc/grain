import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import {
	createOrgRefileTargetSnapshot,
	enumerateOrgRefileHeadings,
	orgRefileTargetCandidates,
	planOrgRefileInsertion,
	RootCandidateLabel,
} from "./org-refile-target.pipe"

const plan = (target: string, incoming: string, from?: number) => {
	const heading =
		from === undefined ? undefined : enumerateOrgRefileHeadings(target).find((h) => h.from === from)
	const result = planOrgRefileInsertion(target, incoming, heading)
	if (E.isLeft(result)) throw new Error(result.left.message)
	expect(result.right.content.slice(result.right.from, result.right.to)).toBe(
		result.right.insertedSource,
	)
	return result.right
}

describe("Org refile targets", () => {
	it("enumerates raw UTF-16 offsets and mixed line numbers, skipping known and unknown blocks", () => {
		const source =
			"😀\0\r\n* Parent  \r**\tChild\n#+BEGIN_weird\r* Fake\r#+END_weird\n* Parent  \n*** Deep\n#+begin_src\n* Hidden"
		const headings = enumerateOrgRefileHeadings(source)
		expect(headings.map((h) => [h.heading, h.level, h.lineNumber, h.outlinePath])).toEqual([
			["* Parent  ", 1, 2, "Parent  "],
			["**\tChild", 2, 3, "Parent   / Child"],
			["* Parent  ", 1, 7, "Parent  "],
			["*** Deep", 3, 8, "Parent   / Deep"],
		])
		for (const h of headings)
			expect(source.slice(h.from, h.from + h.heading.length)).toBe(h.heading)
	})

	it("freezes snapshot DTOs and keeps root identity and labels distinct from duplicate real titles", () => {
		const snapshot = createOrgRefileTargetSnapshot(
			"notes/a.org",
			"opaque-revision",
			"* (file root)\n* Same\n* Same",
		)
		expect(snapshot.relativePath).toBe("notes/a.org")
		expect(snapshot.revision).toBe("opaque-revision")
		expect(snapshot.source).toBe("* (file root)\n* Same\n* Same")
		expect(Object.isFrozen(snapshot)).toBe(true)
		expect(Object.isFrozen(snapshot.headings)).toBe(true)
		expect(snapshot.headings.every(Object.isFrozen)).toBe(true)
		const candidates = orgRefileTargetCandidates(snapshot, true)
		expect(candidates[0]).toEqual({ id: "root", kind: "root", label: RootCandidateLabel })
		expect(candidates.map((c) => c.label)).toEqual([
			"(file root)",
			"(file root) [line 1]",
			"Same [line 2]",
			"Same [line 3]",
		])
		expect(new Set(candidates.map((c) => c.id)).size).toBe(4)
		expect(orgRefileTargetCandidates(snapshot)).toHaveLength(3)
	})

	it("inserts after nested body, drawers and protected fake peers, before the next real peer", () => {
		const prefix =
			"* Parent\r\n:PROPERTIES:\r\n:VALUE: 😀\0\r\n:END:\r\n** Child\nbody\r#+begin_unknown\n* fake peer\n#+end_unknown\r"
		const suffix = "* Peer\nunchanged"
		const incoming =
			"***\tTODO  title :tag:  \r\nscalar: \0😀\r**** Descendant\n#+begin_src\n* fake\n#+end_src"
		const inserted =
			"**\tTODO  title :tag:  \r\nscalar: \0😀\r*** Descendant\n#+begin_src\n* fake\n#+end_src"
		const result = plan(prefix + suffix, incoming, 0)
		expect(result.insertedSource).toBe(inserted)
		expect(result.content).toBe(prefix + inserted + "\r\n" + suffix)
	})

	it.each(["\n", "\r\n", "\r"])("adds only required separators using %j", (newline) => {
		const prefix = `* Target${newline}body${newline}`
		expect(plan(prefix + "* Peer", "* New", 0).content).toBe(prefix + "** New" + newline + "* Peer")
		expect(plan(prefix + "* Peer", "* New" + newline, 0).content).toBe(
			prefix + "** New" + newline + "* Peer",
		)
		expect(plan(`* Target${newline}body`, "* New", 0).content).toBe(
			`* Target${newline}body${newline}** New`,
		)
	})

	it("preserves incoming final EOF exactly at file end and all old source bytes", () => {
		for (const target of ["", "preamble", "* Old\r\nbody\r\n", "* Old\rbody"]) {
			for (const incoming of ["*** New", "*** New\n", "*** New\r\n\r\n"]) {
				const separator =
					target && !/[\r\n]$/.test(target) ? (target.includes("\r") ? "\r" : "\n") : ""
				expect(plan(target, incoming).content).toBe(target + separator + incoming)
			}
		}
		expect(plan("***** Target", "*** New\n**** Deep", 0).insertedSource).toBe(
			"****** New\n******* Deep",
		)
	})

	it("has no arbitrary level cap", () => {
		const target = "*".repeat(300) + " Target"
		expect(plan(target, "* New\n** Deep", 0).insertedSource).toBe(
			"*".repeat(301) + " New\n" + "*".repeat(302) + " Deep",
		)
	})

	it("rejects stale, partial, noninteger, out-of-range and block-protected targets", () => {
		const source = "* Real\n#+begin_src\n* Fake\n#+end_src\n* Peer"
		for (const target of [
			{ from: 0, heading: "* Stale" },
			{ from: 0, heading: "* Real\n" },
			{ from: 1, heading: "* Real" },
			{ from: -1, heading: "* Real" },
			{ from: NaN, heading: "* Real" },
			{ from: Infinity, heading: "* Real" },
			{ from: 0.5, heading: "* Real" },
			{ from: source.length, heading: "* Peer" },
			{ from: source.indexOf("* Fake"), heading: "* Fake" },
		])
			expect(E.isLeft(planOrgRefileInsertion(source, "* New", target))).toBe(true)
	})

	it("keeps closed drawers and fake drawer markers in literal blocks byte exact", () => {
		const incoming =
			"* Move\r\n:LOGBOOK:\r\nentry\0\r\n:END:\r\n#+begin_src\r\n:LOGBOOK:\r\n#+end_src\r\n#+begin_unknown\r\n:PROPERTIES:\r\n#+end_unknown\r\n"
		const result = planOrgRefileInsertion("* Target\r\n* Peer\r\n", incoming, {
			from: 0,
			heading: "* Target",
		})
		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result))
			expect(result.right.content).toBe("* Target\r\n*" + incoming + "* Peer\r\n")
		const malformed = "* Target\n:LOGBOOK:\n* Peer\n"
		expect(
			E.isLeft(planOrgRefileInsertion(malformed, "* Move", { from: 0, heading: "* Target" })),
		).toBe(true)
		expect(E.isLeft(planOrgRefileInsertion(malformed, "* Move"))).toBe(true)
	})
	it("rejects an unclosed target drawer after the selected heading's next peer", () => {
		const target = "* Target\n* Peer\n:LOGBOOK:\nunclosed\n"
		const result = planOrgRefileInsertion(target, "* Move\n", {
			from: 0,
			heading: "* Target",
		})
		expect(result).toMatchObject({
			_tag: "Left",
			left: { message: "Target source has an unclosed drawer." },
		})
	})

	it("rejects malformed incoming subtrees and unclosed blocks rather than swallowing existing peers", () => {
		for (const incoming of [
			"",
			"body\n* Heading",
			"\n* Heading",
			"*NoSpace",
			"* A\n* B",
			"** A\n* B",
			"* A\n#+begin_weird\n* Fake",
			"* Move\n:LOGBOOK:\nno end\n",
			"* Move\r\n:PROPERTIES:\r\n:K: v\r\n",
			"#+begin_src\n* Fake",
		]) {
			expect(
				E.isLeft(
					planOrgRefileInsertion("* Target\n* Peer", incoming, { from: 0, heading: "* Target" }),
				),
			).toBe(true)
		}
		const malformed = "* Target\n#+begin_src\n* Peer"
		expect(E.isLeft(planOrgRefileInsertion(malformed, "* New"))).toBe(true)
		expect(
			E.isLeft(planOrgRefileInsertion(malformed, "* New", { from: 0, heading: "* Target" })),
		).toBe(true)
	})
})
