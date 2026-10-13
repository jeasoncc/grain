import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import { validateOrgCaptureEntry, validateOrgCaptureInput } from "./org-capture.pipe"
import { planOrgCapturePlacement } from "./org-capture-target.pipe"

const placed = (existingSource: string, entrySource: string) => E.map((plan: { content: string }) => plan.content)(
	planOrgCapturePlacement(existingSource, { entryType: "entry", entrySource, target: { kind: "file", relativePath: "inbox.org" } }),
)

describe("raw Capture publication boundaries", () => {
	it.each(["\n", "\r\n", "\r"])("preserves every existing byte and raw EOF with %j separators", (eol) => {
		const existing = `unknown literal %()\0中文${eol}last`
		for (const entry of ["* TODO 标题\0🙂", "* Note\r\nbody\n", "* Note\rlone\r", "\n* Note\n"])
			expect(placed(existing, entry)).toEqual(E.right(existing + (entry.startsWith("\n") ? "" : eol) + entry))
		expect(placed(existing + eol, "* Note")).toEqual(E.right(existing + eol + "* Note"))
	})
	it("uses a boundary-only LF fallback without normalizing incoming mixed text", () => {
		const raw = "* TODO 中文\r\n\0body🙂"
		expect(placed("unknown", raw)).toEqual(E.right(`unknown\n${raw}`))
		expect(placed("", raw)).toEqual(E.right(raw))
	})
	it.each(["", "* ", "* TODO", "* TODO \r\nbody", "** Child", "text\n* Good", "* \0"])(
		"rejects meaningless or non-root entry %j", (raw) => expect(E.isLeft(validateOrgCaptureEntry(raw))).toBe(true),
	)
	it.each(["#+begin_src text\n* pretend", "#+BEGIN_QUOTE\rtext", "#+begin_example\r\n#+end_src"])(
		"rejects unclosed target %j", (existing) => expect(E.isLeft(placed(existing, "* Note"))).toBe(true),
	)
	it("preserves closed protected blocks without mistaking their stars for a target", () => {
		const source = "#+begin_src org\n* literal\n#+end_src"
		expect(placed(source, "* Note")).toEqual(E.right(`${source}\n* Note`))
	})
	it.each(["../x.org", "/x.org", "a//x.org", "a/./x.org", "a\\x.org", "x.ORG", "https:x.org", "x\0.org", "x\n.org", "C:/x.org", " x.org"])(
		"rejects destination escape/control path %j", (relativePath) => expect(E.isLeft(validateOrgCaptureInput({
			workspaceRoot: "/fixture", target: { kind: "file", relativePath }, entryType: "entry", entrySource: "* Note",
		}))).toBe(true),
	)
})
