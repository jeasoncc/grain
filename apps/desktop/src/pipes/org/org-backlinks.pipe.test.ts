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

		expect(parseOrgLinkIndex("notes.org", source).identifiers).toMatchObject([
			{ heading: "First", kind: "id", value: "AbC-123" },
			{ heading: "First", kind: "custom-id", value: "release-v1" },
			{ heading: "Second", kind: "id", value: "exact.VALUE" },
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
		expect(parseOrgLinkIndex("notes.org", source).identifiers).toMatchObject([
			{ heading: "Valid", kind: "id", value: "valid-id" },
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
	it("includes an eligible file property ID at file point before heading metadata", () => {
		const source = ":PROPERTIES:\r\n:ID: root-id\r\n:END:\r\n#+TITLE: File node\r\n* Child\r\n:PROPERTIES:\r\n:ID: child-id\r\n:END:"
		expect(parseOrgLinkIndex("dated/note.org", source).identifiers).toMatchObject([
			{ heading: "File node", kind: "id", line: 1, value: "root-id" },
			{ heading: "Child", kind: "id", value: "child-id" },
		])
	})
	it("never mistakes generic drawer text, block titles or late property examples for node metadata", () => {
		const source = "#+begin_src org\n#+TITLE: Fake title\n:PROPERTIES:\n:ID: fake-file\n:END:\n#+end_src\n#+TITLE: Actual title\n* Visible\n:LOGBOOK:\n[[id:fake][Not a backlink]]\n:ID: logbook\n:END:\nbody\n:PROPERTIES:\n:ID: late\n:END:\n[[id:actual][Actual]]"
		const index = parseOrgLinkIndex("source.org", source)
		expect(index.title).toBe("Actual title")
		expect(index.identifiers).toEqual([])
		expect(index.links).toMatchObject([{ targetValue: "actual", label: "Actual" }])
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
