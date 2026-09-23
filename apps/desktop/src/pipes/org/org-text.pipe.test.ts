import { describe, expect, it } from "vitest"
import {
	appendOrgTodoCapture,
	changeOrgHeadingLevelAt,
	cycleOrgTodoAt,
	moveOrgSubtreeAt,
	type OrgTextEdit,
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

	it("does not move a subtree across its parent boundary", () => {
		const source = "* Parent\n** Only\nbody\n* Sibling"
		expect(moveOrgSubtreeAt(source, source.indexOf("Only"), -1)).toBeNull()
		expect(moveOrgSubtreeAt(source, source.indexOf("Only"), 1)).toBeNull()
		expect(moveOrgSubtreeAt(source, source.indexOf("body"), 1)).toBeNull()
	})

	it("does not treat a cursor at zero as belonging to the second line", () => {
		expect(cycleOrgTodoAt("\n* Heading", 0)).toBeNull()
	})

	it("returns no edit for unrelated lines", () => {
		expect(cycleOrgTodoAt("plain text", 3)).toBeNull()
		expect(toggleOrgCheckboxAt("- no checkbox", 4)).toBeNull()
	})
})
