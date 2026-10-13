import { describe, expect, it } from "vitest"
import { matchOrgCompletionTerms, scoreOrgCompletionTerms } from "./org-completion.pipe"

describe("org completion terms", () => {
	it("matches literal whitespace terms with AND semantics regardless of order", () => {
		expect(matchOrgCompletionTerms("  work\t[a].*\n", "[a].* in WORK")).toBe(true)
		expect(matchOrgCompletionTerms("work missing", "work")).toBe(false)
		expect(matchOrgCompletionTerms(".*", "anything")).toBe(false)
		expect(matchOrgCompletionTerms(" \n", "")).toBe(true)
	})
	it("folds Unicode deterministically without locale-dependent casing", () => {
		expect(matchOrgCompletionTerms("STRASSE σ", "Straße ς")).toBe(true)
		expect(scoreOrgCompletionTerms("STRASSE", "Straße.org")).toBe(0)
		expect(scoreOrgCompletionTerms("σ", "ς.org")).toBe(0)
	})
	it.each([
		["note", "folder/note.org", 0],
		["note", "folder/notebook.org", 14],
		["note", "folder/a-note.org", 102],
		["folder", "folder/note.org", 200],
		["nt", "note.org", 301],
		["xyz", "note.org", null],
		["", "note.org", 0],
	] as const)("preserves single-term rank for %s in %s", (query, text, expected) => {
		expect(scoreOrgCompletionTerms(query, text)).toBe(expected)
	})
	it("scores every term independently, allowing reversed and fuzzy terms", () => {
		const text = "work/project-notes.org"
		expect(scoreOrgCompletionTerms("work nt", text)).toBe(scoreOrgCompletionTerms("nt work", text))
		expect(scoreOrgCompletionTerms("work nt", text)).not.toBeNull()
		expect(matchOrgCompletionTerms("work nt", text)).toBe(false)
		expect(scoreOrgCompletionTerms("work xyz", text)).toBeNull()
	})
})
