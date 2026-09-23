import { describe, expect, it } from "vitest"
import {
	appendOrgSubtree,
	deriveOrgArchivePath,
	detectOrgNewline,
	extractOrgSubtreeAt,
	removeOrgSubtree,
} from "./org-subtree-refile.pipe"

describe("extractOrgSubtreeAt", () => {
	it("extracts a heading and all descendants up to the next peer or ancestor", () => {
		const source = "preamble\n* Parent\nbody\n** Child\nchild body\n*** Grandchild\n* Tail\ntail"
		const from = source.indexOf("** Child")
		const to = source.indexOf("* Tail")

		expect(extractOrgSubtreeAt(source, from + 5)).toEqual({
			from,
			heading: "** Child",
			text: source.slice(from, to),
			to,
		})
	})

	it("only extracts when the cursor is on the heading line", () => {
		const source = "* Parent\nbody\n** Child\nchild body"
		expect(extractOrgSubtreeAt(source, source.indexOf("body"))).toBeNull()
		expect(extractOrgSubtreeAt(source, source.indexOf("Child"))).not.toBeNull()
		expect(extractOrgSubtreeAt(source, source.indexOf("\n"))).not.toBeNull()
		expect(extractOrgSubtreeAt(source, -1)).toBeNull()
		expect(extractOrgSubtreeAt(source, source.length + 1)).toBeNull()
		expect(extractOrgSubtreeAt(source, 1.5)).toBeNull()
	})

	it("requires a valid heading prefix at the start of the line", () => {
		expect(extractOrgSubtreeAt("plain * heading", 8)).toBeNull()
		expect(extractOrgSubtreeAt("*no space", 0)).toBeNull()
		expect(extractOrgSubtreeAt("\t* indented", 3)).toBeNull()
		expect(extractOrgSubtreeAt("***\tTabbed", 5)?.heading).toBe("***\tTabbed")
	})

	it.each([
		["LF", "\n"],
		["CRLF", "\r\n"],
		["lone CR", "\r"],
	])("byte-preserves %s subtrees", (_name, newline) => {
		const source = `prefix${newline}* One${newline}raw  text${newline}** Child${newline}:X: value${newline}* Two${newline}`
		const from = source.indexOf("* One")
		const to = source.indexOf("* Two")
		expect(
			extractOrgSubtreeAt(source, source.indexOf(newline, from) + newline.length - 1),
		).not.toBeNull()
		expect(extractOrgSubtreeAt(source, from + 3)).toEqual({
			from,
			heading: "* One",
			text: source.slice(from, to),
			to,
		})
	})

	it("supports mixed line endings without normalizing any bytes", () => {
		const source = "intro\r* A\r\nbody\n** B\rchild\r\n* C"
		const from = source.indexOf("* A")
		const to = source.indexOf("* C")
		const result = extractOrgSubtreeAt(source, source.indexOf(" A") + 1)
		expect(result?.text).toBe("* A\r\nbody\n** B\rchild\r\n")
		expect(result).toEqual({ from, heading: "* A", text: source.slice(from, to), to })
	})

	it("extracts through EOF and permits a cursor at the final line end", () => {
		const source = "before\n* Final\nbody"
		const result = extractOrgSubtreeAt(source, source.indexOf("Final") + "Final".length)
		expect(result?.to).toBe(source.length)
		expect(result?.text).toBe("* Final\nbody")
	})
})

describe("removeOrgSubtree", () => {
	it("removes exactly the extracted half-open range", () => {
		const source = "header\r\n* Remove\rbody\n** Child\r\n* Keep\n"
		const subtree = extractOrgSubtreeAt(source, source.indexOf("Remove"))
		expect(subtree).not.toBeNull()
		expect(removeOrgSubtree(source, subtree!)).toBe("header\r\n* Keep\n")
	})

	it("does not infer or trim separators around an arbitrary valid range", () => {
		expect(removeOrgSubtree("a\r\n\r\nb", { from: 3, to: 5 })).toBe("a\r\nb")
	})

	it("rejects invalid ranges", () => {
		expect(() => removeOrgSubtree("abc", { from: -1, to: 2 })).toThrow(RangeError)
		expect(() => removeOrgSubtree("abc", { from: 2, to: 1 })).toThrow(RangeError)
		expect(() => removeOrgSubtree("abc", { from: 0, to: 4 })).toThrow(RangeError)
	})
})

describe("appendOrgSubtree", () => {
	it.each([
		["LF", "title\nbody", "\n"],
		["CRLF", "title\r\nbody", "\r\n"],
		["lone CR", "title\rbody", "\r"],
	])("adds one necessary separator in the target's %s style", (_name, target, newline) => {
		expect(appendOrgSubtree(target, "* Archived\nmixed\rbody")).toBe(
			`${target}${newline}* Archived\nmixed\rbody`,
		)
	})

	it("uses the first line ending as the detected style for mixed targets", () => {
		const target = "one\rtwo\r\nthree\nfour"
		expect(detectOrgNewline(target)).toBe("\r")
		expect(appendOrgSubtree(target, "* Added")).toBe(`${target}\r* Added`)
	})

	it("falls back to LF when a non-empty target has no line ending", () => {
		expect(detectOrgNewline("one line")).toBe("\n")
		expect(appendOrgSubtree("one line", "* Added")).toBe("one line\n* Added")
	})

	it("adds no unnecessary separator and otherwise preserves both strings", () => {
		expect(appendOrgSubtree("target\r\n", "* A\nbody\r")).toBe("target\r\n* A\nbody\r")
		expect(appendOrgSubtree("target\n\n", "* A")).toBe("target\n\n* A")
		expect(appendOrgSubtree("target", "\r* A")).toBe("target\r* A")
		expect(appendOrgSubtree("", "* A")).toBe("* A")
		expect(appendOrgSubtree("target", "")).toBe("target")
	})
})

describe("deriveOrgArchivePath", () => {
	it("derives a sibling archive path from a safe relative lowercase-org path", () => {
		expect(deriveOrgArchivePath("inbox.org")).toBe("inbox_archive.org")
		expect(deriveOrgArchivePath("projects/work.notes.org")).toBe("projects/work.notes_archive.org")
	})

	it.each([
		"",
		".org",
		"INBOX.ORG",
		"inbox.txt",
		"/inbox.org",
		"../inbox.org",
		"projects/../inbox.org",
		"./inbox.org",
		"projects//inbox.org",
		"projects/",
		"projects\\inbox.org",
		"C:/inbox.org",
		"https://example.test/inbox.org",
		"inbox.org\0suffix.org",
		" inbox.org",
		"inbox.org ",
	])("rejects unsafe or invalid path %j", (path) => {
		expect(deriveOrgArchivePath(path)).toBeNull()
	})
})
