import { describe, expect, it } from "vitest"
import { orgFileLinkAt, orgLinkTargetAt } from "./org-link.pipe"

describe("orgFileLinkAt", () => {
	it("resolves relative file links and descriptions", () => {
		const source = "See [[file:../index.org][Index]] and [[chapter.org]]."
		expect(orgFileLinkAt(source, source.indexOf("index.org"), "book/parts/one.org")).toBe(
			"book/index.org",
		)
		expect(orgFileLinkAt(source, source.indexOf("chapter.org"), "book/parts/one.org")).toBe(
			"book/parts/chapter.org",
		)
	})

	it("returns typed ID, custom ID, and file-search targets", () => {
		expect(orgLinkTargetAt("[[id:Record-1]]", 5, "book/source.org")).toEqual({
			kind: "id",
			relativePath: null,
			value: "Record-1",
		})
		expect(orgLinkTargetAt("[[#local]]", 4, "book/source.org")).toEqual({
			kind: "custom-id",
			relativePath: "book/source.org",
			value: "local",
		})
		expect(orgFileLinkAt("[[#local]]", 4, "book/source.org")).toBeNull()
		expect(orgLinkTargetAt("[[file:../target.org::#part]]", 10, "book/source.org")).toEqual({
			kind: "custom-id",
			relativePath: "target.org",
			value: "part",
		})
		expect(orgLinkTargetAt("[[target.org::*Heading]]", 5, "source.org")).toEqual({
			kind: "file",
			relativePath: "target.org",
			value: "*Heading",
		})
	})

	it("rejects traversal, protocols, backslashes, and non-lowercase Org suffixes", () => {
		expect(orgLinkTargetAt("[[../../outside.org]]", 5, "one.org")).toBeNull()
		expect(orgLinkTargetAt("[[https://example.org]]", 5, "one.org")).toBeNull()
		expect(orgLinkTargetAt("[[folder\\note.org]]", 5, "one.org")).toBeNull()
		expect(orgLinkTargetAt("[[FILE:note.org]]", 5, "one.org")).toBeNull()
		expect(orgLinkTargetAt("[[note.ORG]]", 5, "one.org")).toBeNull()
		expect(orgLinkTargetAt("[[note.txt]]", 5, "one.org")).toBeNull()
	})

	it("does not parse a malformed link across a lone-CR line boundary", () => {
		const source = "[[broken\rnext.org]]"
		expect(orgLinkTargetAt(source, 3, "index.org")).toBeNull()
	})

	it("returns null outside a link and at its exclusive end boundary", () => {
		const source = "text [[note.org]] after"
		expect(orgFileLinkAt(source, 1, "index.org")).toBeNull()
		expect(orgFileLinkAt(source, source.indexOf("]]") + 2, "index.org")).toBeNull()
	})
})
