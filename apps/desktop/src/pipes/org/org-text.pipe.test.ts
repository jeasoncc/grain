import { describe, expect, it } from "vitest"
import {
	appendOrgTodoCapture,
	changeOrgHeadingLevelAt,
	cycleOrgTodoAt,
	insertOrgTimestampAt,
	moveOrgSubtreeAt,
	type OrgTextEdit,
	parseOrgTodoKeywords,
	setOrgHeadingTagsAt,
	setOrgPlanningAt,
	setOrgPropertyAt,
	toggleOrgCheckboxAt,
} from "./org-text.pipe"

const apply = (content: string, edit: OrgTextEdit | null): string =>
	edit ? `${content.slice(0, edit.from)}${edit.insert}${content.slice(edit.to)}` : content

describe("appendOrgTodoCapture", () => {
	it("appends without changing unknown Org syntax", () => {
		const source = "#+custom: untouched\n:ODD_DRAWER:\nraw  bytes\n:END:\n"
		expect(appendOrgTodoCapture(source, "  Review parser  ")).toBe(
			`${source}* TODO Review parser\n`,
		)
	})

	it("adds the necessary separator when the source has no terminal newline", () => {
		expect(appendOrgTodoCapture("#+title: Inbox", "Ship it")).toBe(
			"#+title: Inbox\n* TODO Ship it\n",
		)
	})

	it("preserves CRLF style", () => {
		const source = "#+title: Inbox\r\n\r\n* Existing\r\n"
		expect(appendOrgTodoCapture(source, "First line\r\n second line")).toBe(
			`${source}* TODO First line second line\r\n`,
		)
		expect(appendOrgTodoCapture("#+title: Inbox\r\n* Existing", "Next")).toBe(
			"#+title: Inbox\r\n* Existing\r\n* TODO Next\r\n",
		)
	})

	it("uses LF for an empty or new file", () => {
		expect(appendOrgTodoCapture("", "New task")).toBe("* TODO New task\n")
	})

	it("normalizes titles to one line and rejects blank titles", () => {
		expect(appendOrgTodoCapture("", "  one\n\n two\rthree  ")).toBe("* TODO one two three\n")
		expect(() => appendOrgTodoCapture("unchanged", " \r\n\t ")).toThrow(
			"Org capture title must not be blank.",
		)
	})
})

describe("Org local text transformations", () => {
	it("cycles TODO state while preserving the rest of the heading", () => {
		const source = "#+title: Test\n** Heading :tag:\nbody"
		const first = apply(source, cycleOrgTodoAt(source, 20))
		const second = apply(first, cycleOrgTodoAt(first, 20))
		const third = apply(second, cycleOrgTodoAt(second, 20))

		expect(first).toBe("#+title: Test\n** TODO Heading :tag:\nbody")
		expect(second).toBe("#+title: Test\n** DONE Heading :tag:\nbody")
		expect(third).toBe(source)
	})

	it("parses and cycles configured TODO sequences", () => {
		const source =
			"#+TODO: NEXT(n) WAIT(w@) | DONE(d!) CANCELLED(c)\n#+SEQ_TODO: IDEA | DROPPED\n* Heading"
		expect(parseOrgTodoKeywords(source)).toEqual({
			done: ["DONE", "CANCELLED", "DROPPED"],
			todo: ["NEXT", "WAIT", "IDEA"],
		})

		const next = apply(source, cycleOrgTodoAt(source, source.indexOf("Heading")))
		const wait = apply(next, cycleOrgTodoAt(next, next.lastIndexOf("Heading")))
		const done = apply(wait, cycleOrgTodoAt(wait, wait.lastIndexOf("Heading")))
		const cancelled = apply(done, cycleOrgTodoAt(done, done.lastIndexOf("Heading")))
		const none = apply(cancelled, cycleOrgTodoAt(cancelled, cancelled.lastIndexOf("Heading")))
		expect(next).toContain("* NEXT Heading")
		expect(wait).toContain("* WAIT Heading")
		expect(done).toContain("* DONE Heading")
		expect(cancelled).toContain("* CANCELLED Heading")
		expect(none).toBe(source)

		const secondSequence = `${source}\n* IDEA Explore`
		expect(
			apply(secondSequence, cycleOrgTodoAt(secondSequence, secondSequence.lastIndexOf("Explore"))),
		).toContain("* DROPPED Explore")
	})

	it("uses default TODO and DONE states when no directive is present", () => {
		expect(parseOrgTodoKeywords("* Plain")).toEqual({ done: ["DONE"], todo: ["TODO"] })
	})

	it("promotes and demotes only the heading star prefix", () => {
		const source = "** TODO Keep spacing  :tag:"
		expect(apply(source, changeOrgHeadingLevelAt(source, 12, -1))).toBe(
			"* TODO Keep spacing  :tag:",
		)
		expect(apply(source, changeOrgHeadingLevelAt(source, 12, 1))).toBe(
			"*** TODO Keep spacing  :tag:",
		)
		expect(changeOrgHeadingLevelAt("* Top", 3, -1)).toBeNull()
	})

	it("toggles checkbox state without touching list text", () => {
		const source = "  - [ ] preserve  spacing"
		const checked = apply(source, toggleOrgCheckboxAt(source, source.length))
		expect(checked).toBe("  - [X] preserve  spacing")
		expect(apply(checked, toggleOrgCheckboxAt(checked, checked.length))).toBe(source)
	})

	it("moves a complete subtree up and down among siblings", () => {
		const source =
			"* Parent\n** First\nfirst body\n*** Child\nchild body\n** Second\nsecond body\n* Tail"
		const secondCursor = source.indexOf("Second")
		const movedUpEdit = moveOrgSubtreeAt(source, secondCursor, -1)
		const movedUp = apply(source, movedUpEdit)
		expect(movedUp).toBe(
			"* Parent\n** Second\nsecond body\n** First\nfirst body\n*** Child\nchild body\n* Tail",
		)
		expect(movedUpEdit?.cursor).toBe(movedUp.indexOf("Second"))

		const movedDown = apply(movedUp, moveOrgSubtreeAt(movedUp, movedUp.indexOf("Second"), 1))
		expect(movedDown).toBe(source)
	})

	it("preserves separators when moving adjacent EOF headings", () => {
		const noTerminalNewline = "* A\n* B"
		const movedUp = apply(
			noTerminalNewline,
			moveOrgSubtreeAt(noTerminalNewline, noTerminalNewline.indexOf("B"), -1),
		)
		expect(movedUp).toBe("* B\n* A")
		expect(apply(movedUp, moveOrgSubtreeAt(movedUp, movedUp.indexOf("B"), 1))).toBe(
			noTerminalNewline,
		)

		const terminalNewline = "* A\n* B\n"
		expect(
			apply(terminalNewline, moveOrgSubtreeAt(terminalNewline, terminalNewline.indexOf("B"), -1)),
		).toBe("* B\n* A\n")
	})

	it("preserves lone-CR documents during subtree and metadata edits", () => {
		const source = "* One\rbody\r* Two\rbody two\r"
		const moved = apply(source, moveOrgSubtreeAt(source, source.indexOf("Two"), -1))
		expect(moved).toBe("* Two\rbody two\r* One\rbody\r")
		expect(
			apply(moved, setOrgPlanningAt(moved, moved.indexOf("body two"), "SCHEDULED", "2025-01-02")),
		).toBe("* Two\rSCHEDULED: <2025-01-02>\rbody two\r* One\rbody\r")
	})

	it("does not move a subtree across its parent boundary", () => {
		const source = "* Parent\n** Only\nbody\n* Sibling"
		expect(moveOrgSubtreeAt(source, source.indexOf("Only"), -1)).toBeNull()
		expect(moveOrgSubtreeAt(source, source.indexOf("Only"), 1)).toBeNull()
		expect(moveOrgSubtreeAt(source, source.indexOf("body"), 1)).toBeNull()
	})

	it("ignores heading-like text and TODO directives inside Org blocks", () => {
		const source =
			"* Outer\n#+begin_src text\n#+TODO: NEXT | COMPLETE\n* NEXT literal\n#+end_src\nbody"
		const literal = source.indexOf("literal")
		expect(parseOrgTodoKeywords(source)).toEqual({ todo: ["TODO"], done: ["DONE"] })
		expect(cycleOrgTodoAt(source, literal)).toBeNull()
		expect(changeOrgHeadingLevelAt(source, literal, 1)).toBeNull()
		expect(moveOrgSubtreeAt(source, literal, 1)).toBeNull()
		expect(setOrgPlanningAt(source, literal, "SCHEDULED", "2025-01-01")).toBeNull()
		const loneCr = source.replaceAll("\n", "\r")
		expect(parseOrgTodoKeywords(loneCr)).toEqual({ todo: ["TODO"], done: ["DONE"] })
		expect(
			setOrgPlanningAt(loneCr, loneCr.indexOf("literal"), "SCHEDULED", "2025-01-01"),
		).toBeNull()
	})

	it("does not treat a cursor at zero as belonging to the second line", () => {
		expect(cycleOrgTodoAt("\n* Heading", 0)).toBeNull()
	})

	it("returns no edit for unrelated lines", () => {
		expect(cycleOrgTodoAt("plain text", 3)).toBeNull()
		expect(toggleOrgCheckboxAt("- no checkbox", 4)).toBeNull()
	})
})

describe("Org heading metadata transformations", () => {
	it("sets and removes only trailing heading tags", () => {
		const source = "* TODO Heading  :old:tags:\nbody :untouched:\n"
		const tagged = apply(source, setOrgHeadingTagsAt(source, source.indexOf("body"), ["new", "x"]))
		expect(tagged).toBe("* TODO Heading  :new:x:\nbody :untouched:\n")
		expect(apply(tagged, setOrgHeadingTagsAt(tagged, tagged.indexOf("body"), []))).toBe(
			"* TODO Heading\nbody :untouched:\n",
		)
		expect(apply("* Heading", setOrgHeadingTagsAt("* Heading", 3, ["one"]))).toBe("* Heading :one:")
		expect(apply("* Heading", setOrgHeadingTagsAt("* Heading", 3, ["project-work", "中文"]))).toBe(
			"* Heading :project-work:中文:",
		)
	})

	it("updates or inserts planning without touching timestamp details", () => {
		const source = "* Heading\nSCHEDULED: <2025-01-01 Wed +1w>  custom\nbody"
		expect(
			apply(source, setOrgPlanningAt(source, source.indexOf("body"), "SCHEDULED", "2026-02-03")),
		).toBe("* Heading\nSCHEDULED: <2026-02-03 +1w>  custom\nbody")
		const withDeadline = apply(
			source,
			setOrgPlanningAt(source, source.indexOf("body"), "DEADLINE", "2026-04-05"),
		)
		expect(withDeadline).toBe(
			"* Heading\nSCHEDULED: <2025-01-01 Wed +1w>  custom DEADLINE: <2026-04-05>\nbody",
		)
	})

	it("keeps CLOSED and planning metadata on one planning line", () => {
		const source = "* DONE Heading\nCLOSED: [2025-01-01 Wed]\nbody"
		const scheduled = apply(
			source,
			setOrgPlanningAt(source, source.indexOf("body"), "SCHEDULED", "2025-02-03"),
		)
		expect(scheduled).toBe("* DONE Heading\nCLOSED: [2025-01-01 Wed] SCHEDULED: <2025-02-03>\nbody")
		expect(
			apply(scheduled, setOrgPropertyAt(scheduled, scheduled.indexOf("body"), "ID", "closed")),
		).toBe(
			"* DONE Heading\nCLOSED: [2025-01-01 Wed] SCHEDULED: <2025-02-03>\n:PROPERTIES:\n:ID: closed\n:END:\nbody",
		)
	})

	it("rejects impossible dates and invalid tags", () => {
		expect(() => setOrgPlanningAt("* Heading", 2, "SCHEDULED", "2025-02-31")).toThrow()
		expect(() => insertOrgTimestampAt("", 0, "2025-99-99", true)).toThrow()
		expect(() => setOrgHeadingTagsAt("* Heading", 2, ["bad:tag"])).toThrow()
	})

	it("inserts LF planning lines while preserving EOF newline state", () => {
		expect(
			apply("* Heading\nbody", setOrgPlanningAt("* Heading\nbody", 2, "DEADLINE", "2025-12-31")),
		).toBe("* Heading\nDEADLINE: <2025-12-31>\nbody")
		expect(apply("* Heading", setOrgPlanningAt("* Heading", 2, "SCHEDULED", "2025-12-31"))).toBe(
			"* Heading\nSCHEDULED: <2025-12-31>",
		)
		expect(
			apply("* Heading\n", setOrgPlanningAt("* Heading\n", 2, "SCHEDULED", "2025-12-31")),
		).toBe("* Heading\nSCHEDULED: <2025-12-31>\n")
	})

	it("updates and inserts heading properties", () => {
		const source = "* Heading\n:PROPERTIES:\n:ID: old\n:ODD: untouched  \n:END:\nbody"
		expect(apply(source, setOrgPropertyAt(source, source.indexOf("body"), "ID", "new"))).toBe(
			"* Heading\n:PROPERTIES:\n:ID: new\n:ODD: untouched  \n:END:\nbody",
		)
		expect(apply(source, setOrgPropertyAt(source, source.indexOf("body"), "Owner", "Ada"))).toBe(
			"* Heading\n:PROPERTIES:\n:ID: old\n:ODD: untouched  \n:Owner: Ada\n:END:\nbody",
		)
	})

	it("does not cross a later heading when a property drawer is unterminated", () => {
		const source = "* Broken\n:PROPERTIES:\n:ID: first\n* Later\n:PROPERTIES:\n:ID: second\n:END:\n"
		expect(setOrgPropertyAt(source, source.indexOf("first"), "OWNER", "Ada")).toBeNull()
		expect(source).toContain(":ID: second")
	})

	it("creates a property drawer after planning and preserves LF EOF state", () => {
		const source = "* Heading\nSCHEDULED: <2025-01-01>\nbody"
		expect(apply(source, setOrgPropertyAt(source, source.indexOf("body"), "ID", "abc"))).toBe(
			"* Heading\nSCHEDULED: <2025-01-01>\n:PROPERTIES:\n:ID: abc\n:END:\nbody",
		)
		expect(apply("* Heading", setOrgPropertyAt("* Heading", 2, "ID", "abc"))).toBe(
			"* Heading\n:PROPERTIES:\n:ID: abc\n:END:",
		)
	})

	it("preserves CRLF for metadata insertions and unknown text", () => {
		const planningSource = "#+odd: raw\r\n* Heading\r\nbody\r\n"
		const planned = apply(
			planningSource,
			setOrgPlanningAt(planningSource, planningSource.indexOf("body"), "SCHEDULED", "2025-06-07"),
		)
		expect(planned).toBe("#+odd: raw\r\n* Heading\r\nSCHEDULED: <2025-06-07>\r\nbody\r\n")
		const properties = apply(
			planned,
			setOrgPropertyAt(planned, planned.indexOf("body"), "ID", "crlf"),
		)
		expect(properties).toBe(
			"#+odd: raw\r\n* Heading\r\nSCHEDULED: <2025-06-07>\r\n:PROPERTIES:\r\n:ID: crlf\r\n:END:\r\nbody\r\n",
		)
		expect(
			apply(properties, setOrgHeadingTagsAt(properties, properties.indexOf("body"), ["tag"])),
		).toContain("* Heading :tag:\r\n")
	})

	it("inserts active and inactive timestamps exactly at the cursor", () => {
		const source = "before  after\r\n"
		expect(apply(source, insertOrgTimestampAt(source, 7, "2025-08-09", true))).toBe(
			"before <2025-08-09> after\r\n",
		)
		expect(apply(source, insertOrgTimestampAt(source, 7, "2025-08-09", false))).toBe(
			"before [2025-08-09] after\r\n",
		)
		expect(insertOrgTimestampAt(source, 7, "2025-08-09", true).cursor).toBe(19)
	})
})
