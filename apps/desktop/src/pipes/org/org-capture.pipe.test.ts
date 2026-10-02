import * as E from "fp-ts/Either"
import { describe, expect, it, vi } from "vitest"
import {
	appendOrgCaptureEntry,
	BUILTIN_ORG_CAPTURE_TEMPLATES,
	newOrgCaptureDocumentSource,
	prepareOrgCaptureTemplate,
	validateOrgCaptureEntry,
	validateOrgCaptureInput,
} from "./org-capture.pipe"

describe("literal capture preparation", () => {
	it("prepares builtins without a clock and preserves literal template text", () => {
		expect(
			BUILTIN_ORG_CAPTURE_TEMPLATES.map((template) => [
				template.id,
				template.initialSource,
				template.initialCursor,
				template.targetRelativePath,
			]),
		).toEqual([
			["todo", "* TODO ", 7, "inbox.org"],
			["note", "* ", 2, "inbox.org"],
		])
		for (const template of BUILTIN_ORG_CAPTURE_TEMPLATES)
			expect(prepareOrgCaptureTemplate(template)).toEqual(E.right(template))
		const template = {
			...BUILTIN_ORG_CAPTURE_TEMPLATES[0],
			initialSource: "%(evil) ${now} %U",
			initialCursor: 0,
		}
		expect(prepareOrgCaptureTemplate(template, new Date("2026-01-01T00:00:00Z"))).toEqual(
			E.right(template),
		)
	})
	it("rejects invalid IDs, paths, cursors, dates and executable source without executing it", () => {
		const fn = vi.fn()
		for (const patch of [
			{ id: "" },
			{ id: "has space" },
			{ label: " " },
			{ targetRelativePath: "../x.org" },
			{ initialCursor: -1 },
			{ initialCursor: 100 },
			{ initialCursor: 1.5 },
			{ initialSource: fn },
		]) {
			expect(
				E.isLeft(
					prepareOrgCaptureTemplate({ ...BUILTIN_ORG_CAPTURE_TEMPLATES[0], ...patch } as never),
				),
			).toBe(true)
		}
		expect(fn).not.toHaveBeenCalled()
		expect(
			E.isLeft(prepareOrgCaptureTemplate(BUILTIN_ORG_CAPTURE_TEMPLATES[0], new Date(NaN))),
		).toBe(true)
	})
})

describe("raw capture append", () => {
	it.each([
		"\n",
		"\r\n",
		"\r",
	])("preserves every existing byte and raw EOF with %j separators", (eol) => {
		const existing = `unknown literal %()\0中文${eol}last`
		for (const entry of ["* TODO 标题\0🙂", "* Note\r\nbody\n", "* Note\rlone\r", "\n* Note\n"]) {
			expect(appendOrgCaptureEntry(existing, entry)).toEqual(
				E.right(existing + (entry.startsWith("\n") ? "" : eol) + entry),
			)
		}
		expect(appendOrgCaptureEntry(existing + eol, "* Note")).toEqual(
			E.right(existing + eol + "* Note"),
		)
	})
	it("uses LF fallback and preserves new-document raw text", () => {
		const raw = "* TODO 中文\r\n\0body🙂"
		expect(appendOrgCaptureEntry("unknown", raw)).toEqual(E.right(`unknown\n${raw}`))
		expect(appendOrgCaptureEntry("", raw)).toEqual(E.right(raw))
		expect(newOrgCaptureDocumentSource("lists/inbox.org", raw)).toEqual(
			E.right(`#+title: inbox\n\n${raw}`),
		)
	})
	it.each([
		"",
		"* ",
		"* TODO",
		"* TODO \r\nbody",
		"** Child",
		"text\n* Good",
		"* \0",
	])("rejects entry %j", (raw) => expect(E.isLeft(validateOrgCaptureEntry(raw))).toBe(true))
	it.each([
		"#+begin_src text\n* pretend",
		"#+BEGIN_QUOTE\rtext",
		"#+begin_example\r\n#+end_src",
	])("rejects unclosed target %j", (existing) =>
		expect(E.isLeft(appendOrgCaptureEntry(existing, "* Note"))).toBe(true))
	it("accepts closed protected blocks without changing their text", () => {
		const text = "#+begin_src org\n* literal\n#+end_src"
		expect(appendOrgCaptureEntry(text, "* Note")).toEqual(E.right(`${text}\n* Note`))
	})
	it.each([
		"../x.org",
		"/x.org",
		"a//x.org",
		"a/./x.org",
		"a\\x.org",
		"x.ORG",
		"https:x.org",
		"x\0.org",
		"x\n.org",
		"C:/x.org",
		" x.org",
	])("rejects target %j", (relativePath) =>
		expect(
			E.isLeft(
				validateOrgCaptureInput({ workspaceRoot: "/fixture", relativePath, entrySource: "* Note" }),
			),
		).toBe(true))
})
