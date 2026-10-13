import { describe, expect, it } from "vitest"
import { createOrgHeadingFoldLookup } from "./org-fold.pipe"

describe("immutable Org heading fold lookup", () => {
	it("includes nested headings and their body in a parent subtree", () => {
		const source = "* Parent\nintro\n** Child\nchild body\n*** Grandchild\ndeep\n* Next\ntop"
		const nextTopLevel = source.indexOf("* Next")

		expect(createOrgHeadingFoldLookup(source)(0)).toEqual({
			from: source.indexOf("\n"),
			to: nextTopLevel - 1,
		})
	})

	it("stops a nested heading before its next sibling", () => {
		const source = "* Parent\n** First\nfirst body\n*** Child\ndeep\n** Second\nsecond body"
		const first = source.indexOf("** First")
		const second = source.indexOf("** Second")

		expect(createOrgHeadingFoldLookup(source)(first)).toEqual({
			from: source.indexOf("\n", first),
			to: second - 1,
		})
	})

	it("ignores heading-like lines inside Org blocks", () => {
		const source = "* Outer\n#+begin_src text\n* literal\n#+end_src\nbody\n* Next"
		const fold = createOrgHeadingFoldLookup(source)
		expect(fold(source.indexOf("* literal"))).toBeNull()
		expect(fold(0)).toEqual({ from: 7, to: source.indexOf("* Next") - 1 })
	})

	it("folds a top-level heading through the end of the document", () => {
		const source = "* Top\nbody\n** Child\nchild body"

		expect(createOrgHeadingFoldLookup(source)(0)).toEqual({
			from: source.indexOf("\n"),
			to: source.length,
		})
	})

	it("does not return ranges for non-headings or headings without a subtree", () => {
		expect(createOrgHeadingFoldLookup("plain text\n* Heading")(0)).toBeNull()
		expect(createOrgHeadingFoldLookup("* Heading")(0)).toBeNull()
		expect(createOrgHeadingFoldLookup("* First\n* Second")(0)).toBeNull()
		expect(createOrgHeadingFoldLookup("prefix * not a heading\nbody")(7)).toBeNull()
	})
})
