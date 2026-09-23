import { describe, expect, it } from "vitest"
import { orgHeadingFoldRange } from "./org-fold.pipe"

describe("orgHeadingFoldRange", () => {
	it("includes nested headings and their body in a parent subtree", () => {
		const source = "* Parent\nintro\n** Child\nchild body\n*** Grandchild\ndeep\n* Next\ntop"
		const nextTopLevel = source.indexOf("* Next")

		expect(orgHeadingFoldRange(source, 0)).toEqual({
			from: source.indexOf("\n"),
			to: nextTopLevel - 1,
		})
	})

	it("stops a nested heading before its next sibling", () => {
		const source = "* Parent\n** First\nfirst body\n*** Child\ndeep\n** Second\nsecond body"
		const first = source.indexOf("** First")
		const second = source.indexOf("** Second")

		expect(orgHeadingFoldRange(source, first)).toEqual({
			from: source.indexOf("\n", first),
			to: second - 1,
		})
	})

	it("folds a top-level heading through the end of the document", () => {
		const source = "* Top\nbody\n** Child\nchild body"

		expect(orgHeadingFoldRange(source, 0)).toEqual({
			from: source.indexOf("\n"),
			to: source.length,
		})
	})

	it("does not return ranges for non-headings or headings without a subtree", () => {
		expect(orgHeadingFoldRange("plain text\n* Heading", 0)).toBeNull()
		expect(orgHeadingFoldRange("* Heading", 0)).toBeNull()
		expect(orgHeadingFoldRange("* First\n* Second", 0)).toBeNull()
		expect(orgHeadingFoldRange("prefix * not a heading\nbody", 7)).toBeNull()
	})
})
