import { describe, expect, it } from "vitest"
import { markAmbiguousOrgRoamNodes, parseOrgRoamAliases, parseOrgRoamNodes, planOrgRoamLinkEdit } from "./org-roam.pipe"
import { parseOrgLinkIndex } from "./org-backlinks.pipe"
import { orgLinkTargetAt } from "./org-link.pipe"

const header = ":PROPERTIES:\r\n:ID: file-id\r\n:ROAM_ALIASES: \"File alias\" alternative\r\n:END:\r\n#+TITLE: Shared\r\n#+FILETAGS: :note:知识:"

describe("Org-roam source nodes", () => {
	it("finds a file ID before headings, heading IDs, aliases and actual tags in hidden Org files", () => {
		const nodes = parseOrgRoamNodes(".1.org", `${header}\r* TODO [#A] Shared :local:\rSCHEDULED: <2026-10-07 Wed>\r:PROPERTIES:\r:ID: heading-id\r:ROAM_ALIASES: \"Heading alias\"\r:END:\rbody`, "revision")
		expect(nodes).toMatchObject([
			{ id: "file-id", title: "Shared", kind: "file", line: 1, aliases: ["File alias", "alternative"], tags: ["note", "知识"] },
			{ id: "heading-id", title: "Shared", kind: "heading", line: 7, aliases: ["Heading alias"], tags: ["note", "知识", "local"] },
		])
		expect(parseOrgLinkIndex(".1.org", header).identifiers).toMatchObject([{ value: "file-id", line: 1 }])
	})
	it("shares block/comment/drawer boundaries with ID navigation and excludes only generated node files", () => {
		const source = `${header}\n#+begin_src org\n* Fake\n:PROPERTIES:\n:ID: block\n:END:\n#+end_src\n* COMMENT Hidden\n:PROPERTIES:\n:ID: comment\n:END:\n** Child\n:PROPERTIES:\n:ID: child\n:END:\n* Visible\nbody\n:PROPERTIES:\n:ID: late\n:END:\n:LOGBOOK:\n* Fake drawer heading\n:ID: drawer\n:END:\n* Good\n:PROPERTIES:\n:ID: good\n:END:`
		expect(parseOrgRoamNodes("source.org", source, "r").map((node) => node.id)).toEqual(["file-id", "good"])
		expect(parseOrgLinkIndex("source.org", source).identifiers.map((node) => node.value)).toEqual(["file-id", "good"])
		expect(parseOrgRoamNodes("source-notes.org", source, "r")).toEqual([])
		expect(parseOrgLinkIndex("source-notes.org", source).identifiers).toHaveLength(2)
	})
	it("retains disambiguating locations and refuses duplicate IDs, not duplicate titles", () => {
		const nodes = markAmbiguousOrgRoamNodes([
			...parseOrgRoamNodes("a.org", header, "a"),
			...parseOrgRoamNodes("b.org", header.replace("file-id", "other-id"), "b"),
			...parseOrgRoamNodes("c.org", header, "c"),
		])
		expect(nodes.map(({ id, ambiguous, relativePath }) => [id, ambiguous, relativePath])).toEqual([["file-id", true, "a.org"], ["other-id", false, "b.org"], ["file-id", true, "c.org"]])
	})
	it("parses quoted aliases without executing property text", () => {
		expect(parseOrgRoamAliases('"two words" simple "quoted \\"word\\"" simple')).toEqual(["two words", "simple", 'quoted "word"'])
	})
	it("plans one exact raw selection replacement without rewriting mixed delimiters or EOF", () => {
		const source = "α\r\nreplace\rlast\0"
		const edit = planOrgRoamLinkEdit(source, 3, 10, "uuid", "Title")!
		expect(edit).toEqual({ from: 3, to: 10, insert: "[[id:uuid][Title]]", cursor: 21 })
		expect(source.slice(0, edit.from) + edit.insert + source.slice(edit.to)).toBe("α\r\n[[id:uuid][Title]]\rlast\0")
		expect(orgLinkTargetAt(edit.insert, 5, "origin.org")).toEqual({ kind: "id", relativePath: null, value: "uuid" })
		expect(planOrgRoamLinkEdit(source, 10, 3, "uuid", "Title")).toBeNull()
	})
	it("recognizes Org's leading file comments but refuses unclosed or displaced identity drawers", () => {
		expect(parseOrgRoamNodes("file.org", "# Preamble\n:PROPERTIES:\n:ID: eligible\n:END:\n#+TITLE: File", "r")).toMatchObject([{ id: "eligible", kind: "file" }])
		expect(parseOrgRoamNodes("file.org", ":PROPERTIES:\n:ID: unclosed\n#+TITLE: File", "r")).toEqual([])
		expect(parseOrgRoamNodes("file.org", "\n:PROPERTIES:\n:ID: displaced\n:END:", "r")).toEqual([])
	})
	it("only closes a source block with its own end marker and treats nested begin text as source text", () => {
		const source = "#+begin_src org\n#+begin_example\n#+end_wrong\n* Hidden\n:PROPERTIES:\n:ID: hidden\n:END:\n#+end_src\n* Visible\n:PROPERTIES:\n:ID: visible\n:END:"
		expect(parseOrgRoamNodes("file.org", source, "r").map((node) => node.id)).toEqual(["visible"])
		expect(parseOrgLinkIndex("file.org", source).identifiers.map((node) => node.value)).toEqual(["visible"])
	})
})
