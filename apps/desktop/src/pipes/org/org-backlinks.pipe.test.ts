import { describe, expect, it } from "vitest"
import { parseOrgLinkIndex, resolveOrgLinkPath } from "./org-backlinks.pipe"

describe("parseOrgLinkIndex", () => {
	it("extracts heading-associated IDs and CUSTOM_IDs without changing their values", () => {
		const source = [
			"#+title: A document",
			"* First",
			":PROPERTIES:",
			":ID: AbC-123",
			":CUSTOM_ID: release-v1",
			":END:",
			"* Second",
			":PROPERTIES:",
			":id: exact.VALUE",
			":END:",
		].join("\n")

		expect(parseOrgLinkIndex("notes.org", source).identifiers).toEqual([
			{ heading: "First", kind: "id", line: 4, value: "AbC-123" },
			{ heading: "First", kind: "custom-id", line: 5, value: "release-v1" },
			{ heading: "Second", kind: "id", line: 9, value: "exact.VALUE" },
		])
		expect(source).toContain(":ID: AbC-123")
	})

	it("tracks identifier line numbers in lone-CR documents", () => {
		const source =
			"* One\r:PROPERTIES:\r:ID: one\r:END:\r* Two\r:PROPERTIES:\r:CUSTOM_ID: two\r:END:"
		expect(parseOrgLinkIndex("notes.org", source).identifiers).toMatchObject([
			{ line: 3, value: "one" },
			{ line: 7, value: "two" },
		])
	})

	it("only treats a position-valid heading property drawer as identifier metadata", () => {
		const source = [
			"* Valid",
			"SCHEDULED: <2025-01-01 Wed>",
			":PROPERTIES:",
			":ID: valid-id",
			":END:",
			"body",
			":PROPERTIES:",
			":ID: body-example",
			":END:",
		].join("\n")
		expect(parseOrgLinkIndex("notes.org", source).identifiers).toEqual([
			{ heading: "Valid", kind: "id", line: 4, value: "valid-id" },
		])
	})

	it("parses file, id, described, and custom-anchor links with positions and context", () => {
		const source = [
			"#+title: Book",
			"* TODO Chapter",
			"See [[file:../index.org]], [[chapter.org]], and [[file:../target.org::needle][Target]].",
			"Then [[id:AbC-123][Record]] and [[#local-anchor]].",
			"Also [[file:../target.org::#section][Section]].",
		].join("\n")
		const links = parseOrgLinkIndex("book/part.org", source).links

		expect(links).toMatchObject([
			{
				column: 4,
				label: "file:../index.org",
				line: 3,
				targetKind: "file",
				targetRelativePath: "index.org",
			},
			{ label: "chapter.org", targetKind: "file", targetRelativePath: "book/chapter.org" },
			{
				label: "Target",
				targetKind: "file",
				targetRelativePath: "target.org",
				targetValue: "needle",
			},
			{ label: "Record", targetKind: "id", targetValue: "AbC-123" },
			{
				label: "#local-anchor",
				targetKind: "custom-id",
				targetRelativePath: "book/part.org",
				targetValue: "local-anchor",
			},
			{
				label: "Section",
				targetKind: "custom-id",
				targetRelativePath: "target.org",
				targetValue: "section",
			},
		])
		expect(links.every(({ sourceHeading }) => sourceHeading === "Chapter")).toBe(true)
		expect(links.every(({ sourceTitle }) => sourceTitle === "Book")).toBe(true)
	})

	it("ignores comments, COMMENT subtrees, and block bodies while retaining duplicate links", () => {
		const source = [
			"# [[target.org]]",
			"* COMMENT Hidden",
			"[[target.org]]",
			"** Child",
			"[[target.org]]",
			"* Visible",
			"#+begin_src text",
			"[[target.org]]",
			"#+end_src",
			"[[target.org]] [[target.org]]",
		].join("\n")
		const links = parseOrgLinkIndex("source.org", source).links

		expect(links.map(({ line, column }) => [line, column])).toEqual([
			[10, 0],
			[10, 15],
		])
	})
})

describe("resolveOrgLinkPath", () => {
	it("normalizes safe relative paths and rejects escape, protocols, absolute paths, and uppercase suffixes", () => {
		expect(resolveOrgLinkPath("a/b/source.org", "../target.org::search")).toBe("a/target.org")
		expect(resolveOrgLinkPath("source.org", "../../target.org")).toBeNull()
		expect(resolveOrgLinkPath("source.org", "https://example.org")).toBeNull()
		expect(resolveOrgLinkPath("source.org", "/target.org")).toBeNull()
		expect(resolveOrgLinkPath("source.org", "target.ORG")).toBeNull()
		expect(resolveOrgLinkPath("source.org", "folder\\target.org")).toBeNull()
	})
})
