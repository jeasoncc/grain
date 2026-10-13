import { describe, expect, it } from "vitest"
import { orgNoteSource, validateOrgRoamNoteCapture, planOrgRoamNote } from "./org-note.pipe"

const id = "bb36ad93-7f03-459c-90c7-e47bbdba0f75"
const instant = new Date(2026, 9, 6, 23, 59, 58, 999)

describe("Doom ordinary note source", () => {
	it("emits the exact full LF template including drawer, local time and trailing EOF", () => {
		expect(orgNoteSource(instant, id, "普通 Note")).toBe(`:PROPERTIES:\n:ID:       ${id}\n:END:\n#+TITLE: 普通 Note\n#+DATE: 2026-10-06\n#+TIME: 2026-10-06 23:59:58\n#+FILETAGS: :note:\n#+LATEX_CLASS: elegant-book\n#+OPTIONS: num:nil toc:nil ^:nil\n\n* 内容\n\n`)
	})
	it("collapses each CR/LF title run into one space without changing other Unicode or whitespace", () => {
		const source = orgNoteSource(instant, id, "  First\r\n\nSecond\rThird\n四\t ")
		expect(source).toContain("#+TITLE:   First Second Third 四\t \n")
		expect(source).not.toContain("\r")
	})
})

describe("Doom chronological note planning", () => {
	it("captures its shared Gregorian directory, epoch-seconds filename and exact ordinary note template", () => {
		const plan = planOrgRoamNote(instant, id, "Café Note")
		expect(plan).toEqual({
			directory: "ا-diary/year-2026-Horse/month-10-October/day-06-Tuesday",
			filenameStem: `note-${Math.floor(instant.getTime() / 1000)}-cafe_note`,
			content: `:PROPERTIES:\n:ID:       ${id}\n:END:\n#+TITLE: Café Note\n#+DATE: 2026-10-06\n#+TIME: 2026-10-06 23:59:58\n#+FILETAGS: :note:\n#+LATEX_CLASS: elegant-book\n#+OPTIONS: num:nil toc:nil ^:nil\n\n* 内容\n\n`,
			id,
			title: "Café Note",
		})
	})
	it.each([
		[new Date(1899, 11, 31, 23, 59, 59), "year-1899-Pig/month-12-December/day-31-Sunday", "1899-12-31 23:59:59"],
		[new Date(2024, 1, 29, 0, 0, 0), "year-2024-Dragon/month-02-February/day-29-Thursday", "2024-02-29 00:00:00"],
		[new Date(2027, 0, 1, 0, 0, 0), "year-2027-Goat/month-01-January/day-01-Friday", "2027-01-01 00:00:00"],
	] as const)("uses local Gregorian boundaries for %s", (date, directory, dateTime) => {
		const plan = planOrgRoamNote(date, id, "Note")
		expect(plan.directory).toBe(`ا-diary/${directory}`)
		expect(plan.content).toContain(`#+TIME: ${dateTime}\n`)
		expect(plan.filenameStem).toBe(`note-${Math.floor(date.getTime() / 1000)}-note`)
	})
	it("floors pre-epoch seconds and does not invent an empty-slug fallback", () => {
		expect(planOrgRoamNote(new Date(-1), id, "!!!").filenameStem).toBe("note--1-")
	})
	it("normalizes only CR/LF runs in the captured header title", () => {
		const plan = planOrgRoamNote(instant, id, "First\r\n\nSecond\r四\t ")
		expect(plan.title).toBe("First Second 四\t ")
		expect(plan.content).toContain("#+TITLE: First Second 四\t \n")
		expect(plan.filenameStem).toBe(`note-${Math.floor(instant.getTime() / 1000)}-first_second_四`)
	})
	it.each([
		["  Café -- Déjà Vu/東京  ", "cafe_deja_vu_東京"],
		["Æ Ł ß Þ", "æ_ł_ß_þ"],
		["¼ Ⅳ ٢", "ⅳ_٢"],
		["क़", "क़"],
		["A\u0305 A\u0316", "a\u0305_a\u0316"],
		["İ ẞ K ﬃ", "i_ß_k_ﬃ"],
		["1Σ", "1ς"],
		["Σ1", "σ1"],
		["AΣ-Σ", "aς_σ"],
		["AΣ\u035c", "aσ\u035c"],
		["ฯΣ", "ฯσ"],
		["AΣ\u0fc6", "aς\u0fc6"],
	] as const)("uses installed Org Roam normalization and casing for %s", (title, slug) => {
		expect(planOrgRoamNote(instant, id, title).filenameStem).toBe(`note-${Math.floor(instant.getTime() / 1000)}-${slug}`)
	})
	it.each([
		0x300, 0x301, 0x302, 0x303, 0x304, 0x306, 0x307,
		0x308, 0x309, 0x30a, 0x30b, 0x30c, 0x31b, 0x323,
		0x324, 0x325, 0x327, 0x32d, 0x32e, 0x330, 0x331,
	])("removes the installed slug's explicit combining mark U+%s", (mark) => {
		expect(planOrgRoamNote(instant, id, `A${String.fromCodePoint(mark)}`).filenameStem).toBe(`note-${Math.floor(instant.getTime() / 1000)}-a`)
	})
})

describe("edited capture identity", () => {
	it("accepts the exact raw title with surrounding whitespace and ignores ID lookalikes in literal blocks", () => {
		const plan = planOrgRoamNote(instant, id, "  Title  ")
		const content = `${plan.content.replaceAll("\n", "\r\n")}#+begin_example\n:PROPERTIES:\n:ID: ${id}\n:END:\n#+TITLE: Wrong\n#+end_example\nraw\r🐉\u0000`
		expect(validateOrgRoamNoteCapture({ ...plan, content })).toEqual({ kind: "ready", title: "Title" })
	})
	it("accepts other heading nodes while rejecting a duplicate captured ID", () => {
		const plan = planOrgRoamNote(instant, id, "Title")
		const child = "\n** Child\n:PROPERTIES:\n:ID: other-id\n:END:\n"
		expect(validateOrgRoamNoteCapture({ ...plan, content: plan.content + child })).toEqual({ kind: "ready", title: "Title" })
		expect(validateOrgRoamNoteCapture({ ...plan, content: plan.content + child.replace("other-id", id) })).toMatchObject({ kind: "rejected" })
	})
	it.each([
		(content: string) => content.replace(`:ID:       ${id}\n`, ""),
		(content: string) => content.replace(id, "changed-id"),
		(content: string) => content.replace(":END:", ":ID:       another-id\n:END:"),
		(content: string) => content.replace("#+TITLE: Title\n", ""),
		(content: string) => content.replace("#+TITLE: Title", "#+TITLE:   "),
	])("rejects an edited source that changes or makes its captured file identity ambiguous", (edit) => {
		const plan = planOrgRoamNote(instant, id, "Title")
		expect(validateOrgRoamNoteCapture({ ...plan, content: edit(plan.content) })).toMatchObject({ kind: "rejected" })
	})
	it("accepts edited valid TITLE metadata using the existing file-node parser's last keyword convention", () => {
		const plan = planOrgRoamNote(instant, id, "Title")
		const content = plan.content.replace("#+TITLE: Title", "#+TITLE: Initial\n#+TITLE:   Edited 名称  ")
		expect(validateOrgRoamNoteCapture({ ...plan, content })).toEqual({ kind: "ready", title: "Edited 名称" })
		expect(plan.title).toBe("Title")
	})
})
