import { describe, expect, it } from "vitest"
import { orgLinkTargetAt } from "./org-link.pipe"
import {
	createOrgRemarkCoordinateCodec, orgRemarkAtPoint, orgRemarkNavigate, orgRemarkNotesPath,
	parseOrgRemarkNotes, planOrgRemarkMutation, selectOrgRemarkSource,
} from "./org-remark.pipe"
import type { OrgRemarkAction, OrgRemarkMark, OrgRemarkMutationPlan, OrgRemarkParseResult } from "./org-remark.types"

const path = "dated/Source.org"
const id = "a1b2c3d4"
const ready = (plan: OrgRemarkMutationPlan) => {
	if (plan.kind !== "ready") throw new Error(plan.message)
	return plan
}
const parsed = (result: OrgRemarkParseResult) => {
	if (result.kind !== "ready") throw new Error(result.message)
	return result
}
const mutate = (notesSource: string, source: string, action: OrgRemarkAction) =>
	planOrgRemarkMutation({ notesSource, sourceRelativePath: path, source, action })
const add = (source: string, from = 0, to = source.length, label?: string) => ready(mutate("", source, { type: "add", id, from, to, kind: "range", label }))
const fixture = (body = "", extra = "", newline = "\n") => [
	"* Shelf", "** User renamed the source", ":PROPERTIES:", ":Org-Remark-File: Source.org", ":END:",
	"*** Rearranged bucket", "**** User renamed the excerpt", "  :PROPERTIES:",
	`  :ORG-REMARK-ID: ${id}`, "  :org-remark-beg: 1", "  :org-remark-end: 6",
	"  :org-remark-label: important", "  :CATEGORY: important", "  :org-remark-original-text: alpha",
	"  :org-remark-link: [[file:Source.org::1]]", "  :KEEP: café🐉\u0000", ...extra.split("\n").filter(Boolean),
	"  :END:", "", body,
].join(newline)
const mark = (markId: string, from: number, to: number, kind: "range" | "line" = "range"): OrgRemarkMark => ({
	id: markId, from, to, kind, label: kind === "line" ? "line" : "nil", originalText: "", line: 1,
})

describe("source-sibling paths and decoded character coordinates", () => {
	it.each([
		["dated/Source.org", "dated/Source-notes.org"],
		["many.dots/Source.name.org", "many.dots/Source.name-notes.org"],
		["Source", "Source-notes.org"],
	] as const)("puts %s notes beside the source", (source, expected) => expect(orgRemarkNotesPath(source)).toBe(expected))

	it.each(["A🐉\nB", "A🐉\r\nB"])("round trips each decoded boundary of %s", (source) => {
		const codec = createOrgRemarkCoordinateCodec(source)
		if (codec.kind !== "ready") throw new Error(codec.message)
		const afterBreak = source.indexOf("B")
		expect(codec.decoded).toBe("A🐉\nB")
		expect([1, 2, 3, 4, 5].map(codec.emacsToRaw)).toEqual([0, 1, 3, afterBreak, source.length])
		for (let position = 1; position <= 5; position++) expect(codec.rawToEmacs(codec.emacsToRaw(position)!)).toBe(position)
		expect(codec.rawToEmacs(2)).toBeNull()
		if (source.includes("\r")) expect(codec.rawToEmacs(4)).toBeNull()
		expect(codec.emacsToRaw(0)).toBeNull()
		expect(codec.emacsToRaw(2.5)).toBeNull()
		expect(codec.emacsToRaw(6)).toBeNull()
		expect(codec.excerpt(1, source.length)).toBe("🐉\nB")
		expect(codec.lineAt(afterBreak)).toEqual({ from: afterBreak, to: source.length, line: 2 })
	})
	it.each(["A\rB", "A\r", "A\r\nB\nC", "A\nB\r\nC", "\ud800", "\udc00"])("rejects ambiguous coding or malformed Unicode in %s", (source) => {
		expect(createOrgRemarkCoordinateCodec(source)).toMatchObject({ kind: "rejected" })
		expect(mutate("", source, { type: "add", id, from: 0, to: 1, kind: "range" })).toMatchObject({ kind: "rejected" })
		expect(parseOrgRemarkNotes("", path, source)).toMatchObject({ kind: "rejected" })
	})
})

describe("remark selection", () => {
	it("uses a captured reversed region and flattens only decoded LF in the excerpt", () => {
		expect(selectOrgRemarkSource({ source: "one🐉\r\ntwo\t!", point: 0, region: { from: 10, to: 0 } })).toEqual({
			kind: "ready", from: 0, to: 10, markKind: "range", originalText: "one🐉 two", line: 1,
		})
	})
	it("selects the word at the cursor including Unicode combining characters", () => {
		expect(selectOrgRemarkSource({ source: "(café́_文)", point: 3 })).toMatchObject({ kind: "ready", from: 1, to: 6, originalText: "café́" })
		expect(selectOrgRemarkSource({ source: " \t\n", point: 1 })).toMatchObject({ kind: "rejected" })
	})
	it("rejects captured anchors in a surrogate or CRLF interior", () => {
		for (const region of [{ from: 1, to: 2 }, { from: 0, to: 3 }]) expect(selectOrgRemarkSource({ source: "🐉\r\nword", point: 0, region })).toMatchObject({ kind: "rejected" })
	})
	it("makes a zero-width line anchor, truncating after forty decoded characters", () => {
		const source = `first\r\n  ${"🐉".repeat(41)}\r\n`
		expect(selectOrgRemarkSource({ source, point: 11, kind: "line" })).toEqual({ kind: "ready", from: 7, to: 7, markKind: "line", originalText: `${"🐉".repeat(40)}…`, line: 2 })
		expect(selectOrgRemarkSource({ source: " \t\n", point: 1, kind: "line" })).toMatchObject({ originalText: "Empty line highlight", from: 0, to: 0 })
	})
})

describe("interoperable remark creation", () => {
	it("keeps a bracket-containing approved source filename interoperable and follows its escaped sibling link", () => {
		const sourcePath = "dated/Read [v2].org"
		const plan = ready(planOrgRemarkMutation({ notesSource: "", sourceRelativePath: sourcePath, source: "word", action: { type: "add", id, from: 0, to: 4, kind: "range" } }))
		expect(parsed(parseOrgRemarkNotes(plan.next, sourcePath, "word")).marks[0]).toMatchObject({ id, from: 0, to: 4 })
		expect(orgLinkTargetAt(plan.next, plan.next.indexOf("[[file:") + 5, plan.notesPath)).toMatchObject({ kind: "file", relativePath: sourcePath })
	})
	it("writes decoded one-based coordinates and multiline text without changing source bytes", () => {
		const source = "#+TITLE: Source\r\nA🐉\r\nB\r\n"
		const plan = add(source, 17, 23, "important")
		expect(plan.notesPath).toBe("dated/Source-notes.org")
		expect(parsed(parseOrgRemarkNotes(plan.next, path, source)).marks).toEqual([{
			id, from: 17, to: 23, kind: "range", label: "important", originalText: "A🐉 B", line: 2,
		}])
	})
	it("uses the source basename when there is no actual title, ignoring title lookalikes in literal blocks", () => {
		const source = "#+begin_example\n#+TITLE: fake\n#+end_example\nword"
		const plan = add(source, source.indexOf("word"), source.length)
		expect(plan.next.startsWith("* Source\n:PROPERTIES:\n:org-remark-file: Source.org\n:END:\n")).toBe(true)
		expect(plan.next).not.toContain(":ID:")
		expect(plan.next).not.toContain("#+TITLE:")
	})
	it("adds under a reorganized source without rewriting any existing bytes", () => {
		const before = fixture("My note🐉\u0000") + "\n* Unrelated\n:PROPERTIES:\n:org-remark-file: Other.org\n:END:\nDo not touch\n"
		const plan = ready(mutate(before, "alpha beta", { type: "add", id: "01234567", from: 6, to: 10, kind: "range" }))
		const inserted = plan.edits[0]
		expect(plan.edits).toHaveLength(1)
		expect(inserted.insert).toContain("*** beta\n")
		expect(plan.next).toBe(before.slice(0, inserted.from) + inserted.insert + before.slice(inserted.from))
		expect(parsed(parseOrgRemarkNotes(plan.next, path, "alpha beta")).marks.map((item) => item.id)).toEqual([id, "01234567"])
	})
	it("creates interoperable line metadata without a range category", () => {
		const source = "a\r\n  beta🐉"
		const plan = ready(mutate("", source, { type: "add", id, from: 3, to: 3, kind: "line" }))
		expect(parsed(parseOrgRemarkNotes(plan.next, path, source)).marks[0]).toMatchObject({ from: 3, to: 3, kind: "line", line: 2 })
	})
	it("rejects duplicate eight-hex IDs anywhere in real sidecar drawers and invalid pens/anchors", () => {
		const other = "* Other\n:PROPERTIES:\n:org-remark-file: Other.org\n:org-remark-id: A1B2C3D4\n:END:\n"
		for (const notes of [other, ":PROPERTIES:\n:org-remark-id: a1b2c3d4\n:END:\n"]) expect(mutate(notes, "alpha", { type: "add", id, from: 0, to: 5, kind: "range" })).toMatchObject({ kind: "rejected" })
		for (const action of [
			{ type: "add", id: "wrong-id", from: 0, to: 5, kind: "range" },
			{ type: "add", id, from: 0, to: 0, kind: "range" },
			{ type: "add", id, from: 1, to: 1, kind: "line" },
			{ type: "add", id, from: 0, to: 5, kind: "range", label: "line" },
		] as const) expect(mutate("", "alpha", action)).toMatchObject({ kind: "rejected" })
	})
})

describe("structural sidecar loading and exact property edits", () => {
	it("resolves descendant entries regardless of heading names/levels and property casing", () => {
		const notes = fixture("Raw body🐉\u0000", "  :org-remark-custom: custom")
		const result = parsed(parseOrgRemarkNotes(notes, path, "alpha beta"))
		expect(result.diagnostics).toEqual([])
		expect(result.entries).toHaveLength(1)
		expect(result.entries[0]).toMatchObject({ id, heading: "User renamed the excerpt", from: 0, to: 5, hasNotes: true, resolved: true })
		expect(notes.slice(result.entries[0].bodyFrom)).toBe("Raw body🐉\u0000")
	})
	it("ignores record-looking text in literal blocks and overridden unrelated source scopes", () => {
		const fake = `#+begin_example\n${fixture("Fake note")}\n#+end_example\n`
		const unrelated = fixture("Other body").replace("Source.org", "Other.org").replace(id, "01234567")
		const notes = `${fake}${fixture()}\n*** Foreign\n:PROPERTIES:\n:org-remark-file: Other.org\n:END:\n**** Foreign remark\n:PROPERTIES:\n:org-remark-id: abcdef12\n:org-remark-beg: 1\n:org-remark-end: 6\n:END:\n${unrelated}`
		expect(parsed(parseOrgRemarkNotes(notes, path, "alpha")).marks.map((item) => item.id)).toEqual([id])
	})
	it.each([
		(notes: string) => notes.replace("  :END:", ""),
		(notes: string) => notes.replace("  :END:", "  :PROPERTIES:\n  :END:"),
		(notes: string) => notes.replace("  :KEEP:", "not a property\n  :KEEP:"),
		(notes: string) => notes.replace("  :END:", "  :Org-Remark-ID: another\n  :END:"),
		(notes: string) => notes + "\n***** Duplicate\n:PROPERTIES:\n:org-remark-id: A1B2C3D4\n:END:\n",
	])("rejects malformed/duplicate drawers before any mutation", (damage) => {
		const notes = damage(fixture())
		expect(parseOrgRemarkNotes(notes, path, "alpha")).toMatchObject({ kind: "rejected" })
		expect(mutate(notes, "alpha", { type: "change", id, label: "idea", from: 0, to: 5 })).toMatchObject({ kind: "rejected" })
	})
	it("diagnoses coordinates outside source without assigning replacement anchors", () => {
		const notes = fixture().replace(":org-remark-end: 6", ":org-remark-end: 100")
		const result = parsed(parseOrgRemarkNotes(notes, path, "alpha"))
		expect(result.marks).toEqual([])
	})
	it("changes only the label/category values and preserves raw heading, drawer layout, custom properties and body", () => {
		const before = fixture("Text🐉\u0000\r\n", "  :org-remark-custom: stay", "\r\n")
		const plan = ready(mutate(before, "alpha", { type: "change", id, label: "quote", from: 0, to: 5 }))
		expect(plan.next).toBe(before.replace(":org-remark-label: important", ":org-remark-label: quote").replace(":CATEGORY: important", ":CATEGORY: quote"))
		expect(plan.edits).toHaveLength(2)
		expect(plan.edits[0].from).toBeLessThan(plan.edits[1].from)
		const defaultPen = ready(mutate(plan.next, "alpha", { type: "change", id, label: "nil", from: 0, to: 5 }))
		expect(defaultPen.next).not.toContain(":CATEGORY:")
		expect(defaultPen.next).toContain("  :org-remark-custom: stay\r\n")
		expect(mutate(before, "alpha", { type: "change", id, label: "line", from: 0, to: 5 })).toMatchObject({ kind: "rejected" })
	})
	it("changes a moved live pen using current coordinates without overwriting its creation excerpt or user's notes", () => {
		const before = fixture("User-owned body", "  :org-remark-custom: keep")
		const plan = ready(mutate(before, "prefix\nalpha", { type: "change", id, label: "quote", from: 7, to: 12 }))
		expect(parsed(parseOrgRemarkNotes(plan.next, path, "prefix\nalpha")).marks[0]).toMatchObject({ from: 7, to: 12, label: "quote", line: 2 })
		expect(plan.next).toContain("**** User renamed the excerpt")
		expect(plan.next).toContain(":org-remark-original-text: alpha")
		expect(plan.next).toContain("User-owned body")
	})
	it("reloads a zero-width line at its current BOL without pretending that its excerpt must still match", () => {
		const created = ready(mutate("", "alpha\nbeta", { type: "add", id, from: 6, to: 6, kind: "line" }))
		const edited = created.next.replace(":org-remark-beg: 7", ":org-remark-beg: 9").replace(":org-remark-end: 7", ":org-remark-end: 9")
		const result = parsed(parseOrgRemarkNotes(edited, path, "alpha\nchanged"))
		expect(result.marks[0]).toMatchObject({ kind: "line", from: 6, to: 6, originalText: "beta", line: 2 })
		expect(result.diagnostics).toEqual([])
		expect(mutate(edited, "alpha\nchanged", { type: "change", id, label: "quote", from: 6, to: 6 })).toMatchObject({ kind: "rejected" })
	})
	it("diagnoses unsupported types and rejects modifying them while preserving their original metadata", () => {
		const notes = fixture("Private annotation", "  :org-remark-type: third-party")
		const result = parsed(parseOrgRemarkNotes(notes, path, "alpha"))
		expect(result.marks).toEqual([])
		expect(result.diagnostics).toHaveLength(1)
		expect(mutate(notes, "alpha", { type: "change", id, label: "idea", from: 0, to: 5 })).toMatchObject({ kind: "rejected" })
		expect(mutate(notes, "alpha", { type: "sync", marks: [mark(id, 0, 5)] })).toMatchObject({ kind: "rejected" })
		expect(ready(mutate(notes, "alpha", { type: "sync", marks: [] })).next).toBe(notes)
	})
	it("rejects ambiguous sidecar coding instead of normalizing unrelated notes bytes", () => {
		const notes = fixture("First\r\nSecond")
		expect(parseOrgRemarkNotes(notes, path, "alpha")).toMatchObject({ kind: "rejected" })
		expect(mutate(notes, "alpha", { type: "remove", id })).toMatchObject({ kind: "rejected" })
	})
})

describe("remove, guarded delete and saved-source synchronization", () => {
	it("removes all case-insensitive remark-prefixed properties, preserving CATEGORY, unrelated props and body", () => {
		const before = fixture("Leave my note🐉\u0000", "  :Org-ReMark-CUSTOM: custom")
		const plan = ready(mutate(before, "alpha", { type: "remove", id }))
		const expected = before.split("\n").filter((line) => !/^\s*:org-remark-/i.test(line) || /:org-remark-file:/i.test(line)).join("\n")
		expect(plan.next).toBe(expected)
		expect(plan.next).toContain("  :CATEGORY: important\n  :KEEP: café🐉\u0000\n  :END:\n\nLeave my note🐉\u0000")
		expect(parsed(parseOrgRemarkNotes(plan.next, path, "alpha")).marks).toEqual([])
	})
	it("asks before deleting notes; refusal still removes highlight metadata", () => {
		const before = fixture("Real notes")
		expect(mutate(before, "alpha", { type: "delete", id })).toMatchObject({ kind: "confirmation-required", id, hasNotes: true })
		expect(ready(mutate(before, "alpha", { type: "delete", id, deleteNotes: false })).next).toBe(ready(mutate(before, "alpha", { type: "remove", id })).next)
		const deleted = ready(mutate(before, "alpha", { type: "delete", id, deleteNotes: true }))
		expect(deleted.next).toBe(before.slice(0, before.indexOf("**** User renamed")))
	})
	it("deletes an empty entry without prompting but regards child notes as content", () => {
		const empty = fixture()
		expect(ready(mutate(empty, "alpha", { type: "delete", id })).next).toBe(empty.slice(0, empty.indexOf("**** User renamed")))
		const child = fixture() + "\n***** Child note\nbody\n"
		expect(mutate(child, "alpha", { type: "delete", id })).toMatchObject({ kind: "confirmation-required" })
	})
	it("persists tracked anchors with decoded coordinates and current source line/link while leaving all other bytes intact", () => {
		const before = fixture("Notes🐉\u0000", "  :org-remark-custom: keep", "\r\n")
		const source = "🐉\r\nalpha"
		const plan = ready(mutate(before, source, { type: "sync", marks: [mark(id, 4, 9)] }))
		expect(plan.next).toBe(before.replace(":org-remark-beg: 1", ":org-remark-beg: 3").replace(":org-remark-end: 6", ":org-remark-end: 8").replace("[[file:Source.org::1]]", "[[file:Source.org::2]]"))
		expect(parsed(parseOrgRemarkNotes(plan.next, path, source)).marks[0]).toMatchObject({ from: 4, to: 9, originalText: "alpha", line: 2 })
		expect(ready(mutate(plan.next, source, { type: "sync", marks: [mark(id, 4, 9)] })).edits).toEqual([])
	})
	it("strips collapsed range metadata on persistence while retaining notes and category", () => {
		const before = fixture("Saved body", "  :org-remark-custom: remove")
		expect(ready(mutate(before, "alpha", { type: "sync", marks: [mark(id, 2, 2)] })).next).toBe(ready(mutate(before, "alpha", { type: "remove", id })).next)
	})
	it("keeps zero-width line marks, snaps moved icons to BOL and updates actual line-number", () => {
		const created = ready(mutate("", "alpha\nbeta", { type: "add", id, from: 6, to: 6, kind: "line" }))
		const source = "🐉\r\nalpha\r\nbeta"
		const plan = ready(mutate(created.next, source, { type: "sync", marks: [mark(id, 12, 12, "line")] }))
		expect(plan.next).toContain(":org-remark-beg: 9\n:org-remark-end: 9\n")
		expect(plan.next).toContain(":org-remark-line-number: 3\n")
		expect(plan.next).toContain("[[file:Source.org::3]]")
		expect(parsed(parseOrgRemarkNotes(plan.next, path, source)).marks[0]).toMatchObject({ kind: "line", from: 11, to: 11, line: 3 })
	})
	it("leaves untracked and unrelated entries byte-exact", () => {
		const other = fixture("Other note").replaceAll(id, "01234567")
		const before = fixture("Our note") + "\n" + other
		const plan = ready(mutate(before, "\nalpha", { type: "sync", marks: [mark(id, 1, 6)] }))
		expect(plan.next.endsWith(other)).toBe(true)
	})
})

describe("remark navigation", () => {
	const marks = [mark("line", 0, 0, "line"), mark("range", 2, 5), mark("later", 10, 12)]
	it("prefers a range and otherwise finds the current line's zero-width icon", () => {
		expect(orgRemarkAtPoint(marks, 3, "abcde\n123456")).toMatchObject({ id: "range" })
		expect(orgRemarkAtPoint(marks, 1, "abcde\n123456")).toMatchObject({ id: "line" })
		expect(orgRemarkAtPoint(marks, 7, "abcde\n123456")).toBeNull()
	})
	it("moves strictly past the cursor, wraps, and filters hidden starts", () => {
		expect(orgRemarkNavigate(marks, 2, "next")?.id).toBe("later")
		expect(orgRemarkNavigate(marks, 2, "previous")?.id).toBe("line")
		expect(orgRemarkNavigate(marks, 10, "next")?.id).toBe("line")
		expect(orgRemarkNavigate(marks, 0, "previous")?.id).toBe("later")
		expect(orgRemarkNavigate(marks, 2, "next", [{ from: 0, to: 6 }])?.id).toBe("line")
		expect(orgRemarkNavigate(marks, 0, "next", [])).toBeNull()
	})
})
