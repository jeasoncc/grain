import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import type { OrgCaptureEntryType, OrgCaptureTarget } from "@/types/editor/org-capture.interface"
import { planOrgCapturePlacement, previewOrgCaptureTarget } from "./org-capture-target.pipe"

const target: OrgCaptureTarget = { kind: "heading", relativePath: "capture.org", headingPath: ["Work", "Inbox"] }
const placed = (source: string, entrySource: string, entryType: OrgCaptureEntryType = "entry", destination: OrgCaptureTarget = target) => {
	const result = planOrgCapturePlacement(source, { entryType, entrySource, target: destination })
	if (E.isLeft(result)) throw new Error(result.left.message)
	return result.right
}

describe("Capture target resolution and raw placement", () => {
	it("resolves the full exact path, including literal slashes, and creates only a missing suffix", () => {
		const destination = { kind: "heading", relativePath: "capture.org", headingPath: ["Work / Home", "Inbox", "Today"] } as const
		const source = "#+unknown: 😀\r\n* Other\r\n** Inbox\r\n* Work / Home\r\n** Inbox\r\nbody\r\n* Peer\runtouched"
		const result = placed(source, "* Capture", "entry", destination)
		expect(result.content).toBe("#+unknown: 😀\r\n* Other\r\n** Inbox\r\n* Work / Home\r\n** Inbox\r\nbody\r\n*** Today\r\n**** Capture\r\n* Peer\runtouched")
		expect(result.preview).toEqual({ headingPath: ["Work / Home", "Inbox", "Today"], line: 7, createdHeadings: ["Today"] })
		expect(previewOrgCaptureTarget(source, destination)).toEqual(E.right(result.preview))
	})
	it("matches exact Org headline text through configured states, priority, COMMENT, cookies and tags without rewriting adornments", () => {
		const source = "#+TODO: NEXT | DONE\n* NEXT [#A] Work :project:\n** COMMENT [2/3] Inbox [66%] :capture:\nbody\n* Peer"
		const result = placed(source, "* Note")
		expect(result.content).toBe(source.replace("\n* Peer", "\n*** Note\n* Peer"))
		expect(result.preview.createdHeadings).toEqual([])
		expect(result.preview.headingPath).toEqual(["Work", "Inbox"])
		expect(E.isLeft(previewOrgCaptureTarget("* TODO Work\n* Work\n", target))).toBe(true)
	})
	it.each([
		"* Work\n** Inbox\n** Inbox\n",
		"* Work\n** Inbox\n* Work\n** Inbox\n",
	])("rejects duplicate exact siblings rather than picking the first %j", (source) => {
		expect(E.isLeft(previewOrgCaptureTarget(source, target))).toBe(true)
		expect(E.isLeft(planOrgCapturePlacement(source, { target, entryType: "entry", entrySource: "* Capture" }))).toBe(true)
	})
	it("keeps all unrelated bytes and entry EOLs, shifting only actual heading stars into the actual child level", () => {
		const source = "prelude\0🙂\r\n* Work\r\n*** Inbox\r\n:PROPERTIES:\r\n:NOTE: * raw\r\n:END:\r\nbody\r\n**** Old child\r\nold\r* Peer\nraw"
		const incoming = "\n* TODO Capture\n** Detail\r#+begin_src org\r\n* literal\r\n** literal too\n#+end_src\n:LOGBOOK:\n* drawer literal\n:END:\n"
		const result = placed(source, incoming)
		expect(result.content).toBe("prelude\0🙂\r\n* Work\r\n*** Inbox\r\n:PROPERTIES:\r\n:NOTE: * raw\r\n:END:\r\nbody\r\n**** Old child\r\nold\r\n**** TODO Capture\n***** Detail\r#+begin_src org\r\n* literal\r\n** literal too\n#+end_src\n:LOGBOOK:\n* drawer literal\n:END:\n* Peer\nraw")
		expect(result.preview.headingPath).toEqual(["Work", "Inbox"])
	})
	it("allows real peer entries and descendants, shifting every real heading without touching literal stars", () => {
		const result = placed("* Work\n** Inbox\n", "* One\n** Nested\n* Two\n#+begin_example\n* literal\n#+end_example")
		expect(result.content).toBe("* Work\n** Inbox\n*** One\n**** Nested\n*** Two\n#+begin_example\n* literal\n#+end_example")
	})
	it.each([
		"* Work\n** Inbox\n#+begin_src\n* Fake",
		"* Work\n** Inbox\n:LOGBOOK:\n* Fake",
	])("rejects protected unclosed targets %j", (source) => {
		expect(E.isLeft(previewOrgCaptureTarget(source, target))).toBe(true)
	})
	it("ignores fake destination headings inside blocks and drawers", () => {
		const source = "#+begin_weird\n* Work\n** Inbox\n#+end_weird\n:LOGBOOK:\n* Work\n** Inbox\n:END:\n"
		const result = placed(source, "* Real")
		expect(result.content).toBe(source + "* Work\n** Inbox\n*** Real")
		expect(result.preview.createdHeadings).toEqual(["Work", "Inbox"])
	})
	it("inserts plain content in the selected body before descendants, not after a child", () => {
		const source = "* Work\n** Inbox\ntext\n*** Child\nchild body\n* Peer"
		expect(placed(source, "literal note", "plain").content).toBe("* Work\n** Inbox\ntext\nliteral note\n*** Child\nchild body\n* Peer")
		expect(placed("#+title: File\n\n* Child\nbody", "file text", "plain", { kind: "file", relativePath: "capture.org" }).content).toBe("#+title: File\n\n* Child\nbody\nfile text")
		expect(placed(source, "*** Raw subtree\n#+begin_src org\n* literal\n#+end_src", "plain").content).toBe("* Work\n** Inbox\ntext\n*** Raw subtree\n#+begin_src org\n* literal\n#+end_src\n*** Child\nchild body\n* Peer")
	})
	it("appends file entries without normalizing mixed raw source or the entry", () => {
		const source = "unknown\r\n* Existing\rbody\0"
		expect(placed(source, "* Captured\nbody", "entry", { kind: "file", relativePath: "capture.org" }).content).toBe(source + "\r\n* Captured\nbody")
	})
	it.each([
		["plain", "captured plain\n", "#+TITLE: Fixture\n* First\nfirst body\n- existing item\n\n| old |\n* Last\nlast body\ncaptured plain\n"],
		["entry", "* captured entry\n", "#+TITLE: Fixture\n* First\nfirst body\n- existing item\n\n| old |\n* Last\nlast body\n* captured entry\n"],
		["item", "- captured item\n", "#+TITLE: Fixture\n* First\nfirst body\n- existing item\n- captured item\n\n| old |\n* Last\nlast body\n"],
		["checkitem", "- [ ] captured checkbox\n", "#+TITLE: Fixture\n* First\nfirst body\n- existing item\n- [ ] captured checkbox\n\n| old |\n* Last\nlast body\n"],
		["table-line", "| captured row |\n", "#+TITLE: Fixture\n* First\nfirst body\n- existing item\n\n| old |\n| captured row |\n* Last\nlast body\n"],
	] as const)("places file/%s using the actual whole-file default rather than the file preamble", (entryType, entrySource, expected) => {
		const source = "#+TITLE: Fixture\n* First\nfirst body\n- existing item\n\n| old |\n* Last\nlast body\n"
		expect(placed(source, entrySource, entryType, { kind: "file", relativePath: "capture.org" }).content).toBe(expected)
	})
	it("stops the first whole-file list at the next real heading even without a blank separator", () => {
		const source = "* First\r\n- first list\r\n* Next\r\n- next list\r\n"
		expect(placed(source, "- captured", "item", { kind: "file", relativePath: "capture.org" }).content).toBe("* First\r\n- first list\r\n- captured\r\n* Next\r\n- next list\r\n")
	})
})

describe("Capture list and table body containers", () => {
	it("joins the first list after all nested items and indented literal blocks, before prose and child lists", () => {
		const source = "* Work\r\n** Inbox\r\n#+begin_example\r\n- fake\r\n#+end_example\r\n  - first\r\n    continuation\r\n    - nested\r\n    #+begin_src org\r\n* literal\r\n    #+end_src\r\n\r\nparagraph\r\n  - later\r\n*** Child\r\n- child list\r\n* Peer"
		const result = placed(source, "- new\n  new continuation", "item")
		expect(result.content).toBe(source.replace("\r\n\r\nparagraph", "\r\n  - new\n    new continuation\r\n\r\nparagraph"))
	})
	it("inserts a checklist item at the root list boundary rather than inside its final nested item", () => {
		const source = "* Work\n** Inbox\n- [ ] existing\n  - child\n    child continuation\n\n\n- separate\n*** Subheading\n- [ ] hidden"
		expect(placed(source, "+ [ ] new", "checkitem").content).toBe("* Work\n** Inbox\n- [ ] existing\n  - child\n    child continuation\n- [ ] new\n\n\n- separate\n*** Subheading\n- [ ] hidden")
	})
	it("inherits the ordered list bullet and numbering while retaining incoming row endings", () => {
		const source = "* Work\n** Inbox\n  7) first\n  8) second\n    - nested\n\nprose"
		expect(placed(source, "- one\r\n- two", "item").content).toBe("* Work\n** Inbox\n  7) first\n  8) second\n    - nested\n  9) one\r\n  10) two\n\nprose")
	})
	it("joins only the first eligible contiguous table before its formula, leaving later and protected rows raw", () => {
		const source = "* Work\n** Inbox\n#+begin_src\n| fake |\n#+end_src\n  | first |\n  |-------|\n  | last  |\n#+TBLFM: $1=1\n\n| other |\n*** Child\n| child |\n* Peer"
		expect(placed(source, "| new |\r\n| next |", "table-line").content).toBe(source.replace("  | last  |\n#+TBLFM", "  | last  |\n  | new |\r\n  | next |\n#+TBLFM"))
	})
	it("creates a separate empty header and divider when only a child heading owns a table", () => {
		const source = "* Work\r\n** Inbox\r\nprose\r\n*** Child\r\n| child |"
		const content = placed(source, "| new |\n| second |", "table-line").content
		const prefix = "* Work\r\n** Inbox\r\nprose\r\n"
		const suffix = "*** Child\r\n| child |"
		expect(content.startsWith(prefix)).toBe(true)
		expect(content.endsWith(suffix)).toBe(true)
		const rows = content.slice(prefix.length, -suffix.length).split(/\r\n|\r|\n/)
		expect(rows[0]).toMatch(/^\|[ \t]*\|$/)
		expect(rows[1]).toMatch(/^\|[-+]+\|$/)
		expect(rows.slice(2)).toEqual(["| new |", "| second |", ""])
	})
	it.each([
		["item", "- valid\nnot a list continuation"],
		["checkitem", "- no checkbox"],
		["table-line", "| row |\nprose"],
		["entry", "* Real\n#+begin_src org\n* unclosed"],
	] as const)("rejects structurally invalid %s source without modifying target", (entryType, entrySource) => {
		expect(E.isLeft(planOrgCapturePlacement("* Work\n** Inbox\n", { target, entryType, entrySource }))).toBe(true)
	})
})

describe("local frozen Org datetrees", () => {
	const dated = { kind: "datetree", relativePath: "capture.org", headingPath: ["Journal"], date: "2026-10-07" } as const
	it("creates the Emacs default local labels in sorted year/month/day order without rewriting neighbors", () => {
		const source = "* Journal\r\n** 2025\r\nold\r\n** 2026\r\n*** 2026-09 September\r\nold\r\n*** 2026-10 October\r\n**** 2026-10-06 Tuesday\r\nprevious\r\n**** 2026-10-08 Thursday\r\nnext\r\n*** 2026-11 November\r\nfuture\r\n** 2027\r\nfuture\r\n* Peer"
		const result = placed(source, "* Frozen capture", "entry", dated)
		expect(result.content).toBe(source.replace("**** 2026-10-08 Thursday", "**** 2026-10-07 Wednesday\r\n***** Frozen capture\r\n**** 2026-10-08 Thursday"))
		expect(result.preview).toEqual({ headingPath: ["Journal", "2026", "2026-10 October", "2026-10-07 Wednesday"], line: 10, createdHeadings: ["2026-10-07 Wednesday"] })
		expect(previewOrgCaptureTarget(source, dated)).toEqual(E.right(result.preview))
	})
	it("reuses an existing date subtree and appends under the same day instead of duplicating it", () => {
		const source = "* Journal\n** 2026\n*** 2026-10 October\n**** 2026-10-07 Wednesday\n***** Existing\nbody\n**** 2026-10-08 Thursday"
		const result = placed(source, "* Next", "entry", dated)
		expect(result.content).toBe(source.replace("**** 2026-10-08 Thursday", "***** Next\n**** 2026-10-08 Thursday"))
		expect(result.preview.createdHeadings).toEqual([])
	})
	it("inserts a missing year and month before greater date siblings, including at file root", () => {
		const source = "* 2025\n** 2025-01 January\n* 2027\nunchanged"
		const result = placed(source, "* Entry", "entry", { kind: "datetree", relativePath: "capture.org", date: "2026-10-07" })
		expect(result.content).toBe("* 2025\n** 2025-01 January\n* 2026\n** 2026-10 October\n*** 2026-10-07 Wednesday\n**** Entry\n* 2027\nunchanged")
	})
	it.each([
		"* Journal\n** 2026\n*** 2026-10 October\n**** 2026-10-07 Wednesday\n**** 2026-10-07 alternate label",
		"* Journal\n** 2026\n*** 2026-11 November\n*** 2026-09 September",
		"* Journal\n** 2026\n** 2026 alternate label",
	])("rejects ambiguous or unsorted date keys rather than guessing %j", (source) => {
		expect(E.isLeft(previewOrgCaptureTarget(source, dated))).toBe(true)
	})
})
