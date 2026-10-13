import * as E from "fp-ts/Either"
import { describe, expect, it, vi } from "vitest"
import type {
	OrgCaptureTemplate,
	OrgCaptureTemplateContext,
} from "@/types/editor/org-capture.interface"
import {
	planOrgCaptureTemplate,
	renderOrgCaptureTemplate,
	validateOrgCaptureTemplate,
} from "./org-capture-template.pipe"
import { validateOrgCaptureSource } from "./org-capture.pipe"

const template = (source: string): OrgCaptureTemplate => ({
	id: "capture",
	label: "Capture",
	entryType: "entry",
	target: { kind: "file", relativePath: "inbox.org" },
	source,
})
const context = (): OrgCaptureTemplateContext => ({
	date: new Date(2026, 9, 7, 23, 59, 8),
	region: "",
	annotation: "",
})
const right = <L, R>(result: E.Either<L, R>): R => {
	if (E.isLeft(result)) throw new Error(JSON.stringify(result.left))
	return result.right
}

describe("declarative Capture template expansion", () => {
	it("collects plain prompts in order, preserving defaults/candidates and referencing their literal answers", () => {
		const plan = right(planOrgCaptureTemplate(template("* %^{Title|%U|alpha|beta}\n%^{Body|%i} / %\\1 / %\\2"), context()))
		expect(plan.prompts).toEqual([
			{ label: "Title", initialInput: "%U", candidates: ["alpha", "beta"] },
			{ label: "Body", initialInput: "%i", candidates: [] },
		])
		const answer = "%^{Injected|default} %? %U %(evil) %[secret] %\\2"
		const source = right(renderOrgCaptureTemplate(plan, [answer, "🙂%i"]))
		expect(source.initialSource).toBe(`* ${answer}\n🙂%i / ${answer} / 🙂%i`)
		expect(source.initialCursor).toBe(source.initialSource.length)
	})

	it("supports references to declared prompts even before their textual occurrence, without adding prompts", () => {
		const plan = right(planOrgCaptureTemplate(template("* %\\2 / %^{First} / %^{Second} / %\\1"), context()))
		expect(plan.prompts.map((prompt) => prompt.label)).toEqual(["First", "Second"])
		expect(right(renderOrgCaptureTemplate(plan, ["one", "two"])).initialSource).toBe("* two / one / two / one")
	})

	it("consumes the entire numeric reference, including references beyond nine", () => {
		const prompts = Array.from({ length: 12 }, (_, index) => `%^{Field ${index + 1}}`).join(" ")
		const plan = right(planOrgCaptureTemplate(template(`* ${prompts}\n%\\12 / %\\1`), context()))
		const answers = Array.from({ length: 12 }, (_, index) => `answer-${index + 1}`)
		expect(right(renderOrgCaptureTemplate(plan, answers)).initialSource).toBe(`* ${answers.join(" ")}\nanswer-12 / answer-1`)
	})

	it("requires exactly one plain string per prompt; missing, extra, sparse and accessor answers are errors", () => {
		const plan = right(planOrgCaptureTemplate(template("* %^{Title}"), context()))
		for (const answers of [[], ["one", "extra"], [42], new Array<string>(1)])
			expect(E.isLeft(renderOrgCaptureTemplate(plan, answers as readonly string[]))).toBe(true)
		const getter = vi.fn(() => "not a data property")
		const answers: string[] = []
		Object.defineProperty(answers, 0, { get: getter })
		expect(E.isLeft(renderOrgCaptureTemplate(plan, answers))).toBe(true)
		expect(getter).not.toHaveBeenCalled()
		expect(right(renderOrgCaptureTemplate(plan, [""])).initialSource).toBe("* ")
	})

	it("treats backslash-escaped percent as literal, including apparent prompts, executable forms and caret markers", () => {
		const plan = right(planOrgCaptureTemplate(template("* \\%? \\%^{Not a prompt} \\%(not executed) \\%[not read] \\%t \\%\\1"), context()))
		expect(plan.prompts).toEqual([])
		const result = right(renderOrgCaptureTemplate(plan, []))
		expect(result.initialSource).toBe("* %? %^{Not a prompt} %(not executed) %[not read] %t %\\1")
		expect(result.initialCursor).toBe(result.initialSource.length)
	})

	it("positions the first caret in raw UTF-16 source, not code points or a rescanned answer", () => {
		const plan = right(planOrgCaptureTemplate(template("* 🙂%^{Title}%?\r\n后%?"), context()))
		const answer = "😀%?%i"
		const result = right(renderOrgCaptureTemplate(plan, [answer]))
		expect(result.initialSource).toBe(`* 🙂${answer}\r\n后`)
		expect(result.initialCursor).toBe(`* 🙂${answer}`.length)
		expect(result.initialSource.slice(result.initialCursor)).toBe("\r\n后")
	})

	it.each(["\n", "\r\n", "\r"])("repeats the rendered line prefix for every source-region boundary %j, including trailing empty lines", (eol) => {
		const region = `one%?${eol}🙂%U${eol}`
		const plan = right(planOrgCaptureTemplate(template(`* Title${eol}%^{Prefix} %i%?tail`), { ...context(), region }))
		const result = right(renderOrgCaptureTemplate(plan, ["  %a"]))
		const beforeCursor = `* Title${eol}  %a one%?${eol}  %a 🙂%U${eol}  %a `
		expect(result.initialSource).toBe(`${beforeCursor}tail`)
		expect(result.initialCursor).toBe(beforeCursor.length)
	})

	it("preserves mixed region boundaries and does not invent indentation for an empty region", () => {
		const source = "* Title\n  %i%?"
		const mixed = right(renderOrgCaptureTemplate(right(planOrgCaptureTemplate(template(source), { ...context(), region: "a\r\nb\rc\n" })), []))
		expect(mixed.initialSource).toBe("* Title\n  a\r\n  b\r  c\n  ")
		const empty = right(renderOrgCaptureTemplate(right(planOrgCaptureTemplate(template(source), context())), []))
		expect(empty.initialSource).toBe("* Title\n  ")
		expect(empty.initialCursor).toBe(empty.initialSource.length)
	})

	it("rejects discontiguous source interpolation without disabling templates that do not insert the region", () => {
		const captured = { ...context(), region: "", regionUnavailableReason: "Source selection has multiple ranges." }
		const rejected = planOrgCaptureTemplate(template("* Selected\n%i"), captured)
		expect(E.isLeft(rejected) && rejected.left.message).toContain("multiple ranges")
		const plain = right(planOrgCaptureTemplate(template("* Independent"), captured))
		expect(right(renderOrgCaptureTemplate(plain, [])).initialSource).toBe("* Independent")
	})

	it("captures annotation and file context literally while deriving link-only annotation forms", () => {
		const annotation = "See [[file:notes/%?%U.org][%^{description}]] now"
		const plan = right(planOrgCaptureTemplate(template("* %a\n%l\n%L\n%f\n%F"), {
			...context(), annotation, sourceRelativePath: "folder/🙂%i.org", sourceAbsolutePath: "/workspace/folder/🙂%i.org",
		}))
		expect(plan.prompts).toEqual([])
		expect(right(renderOrgCaptureTemplate(plan, [])).initialSource).toBe(
			`* ${annotation}\nSee [[file:notes/%?%U.org]] now\nSee file:notes/%?%U.org now\n🙂%i.org\n/workspace/folder/🙂%i.org`,
		)
		const absent = right(renderOrgCaptureTemplate(right(planOrgCaptureTemplate(template("* Title\n%a%l%L%f%F"), context())), []))
		expect(absent.initialSource).toBe("* Title\n")
	})

	it("derives usable link-only annotation forms when the source filename contains escaped brackets", () => {
		const annotation = "See [[file:notes/reading\\[中文\\].org::4][Reading]] now"
		const plan = right(planOrgCaptureTemplate(template("* %l\n%L"), { ...context(), annotation }))
		expect(right(renderOrgCaptureTemplate(plan, [])).initialSource).toBe(
			"* See [[file:notes/reading\\[中文\\].org::4]] now\nSee file:notes/reading[中文].org::4 now",
		)
	})

	it("keeps non-link annotation literal and treats the empty Org annotation link as empty", () => {
		for (const annotation of ["not a link %?", "[[]]"]) {
			const plan = right(planOrgCaptureTemplate(template("* %a / %l / %L"), { ...context(), annotation }))
			const value = annotation === "[[]]" ? "" : annotation
			expect(right(renderOrgCaptureTemplate(plan, [])).initialSource).toBe(`* ${value} / ${value} / ${value}`)
		}
	})

	it("freezes local timestamp/date-format and datetree date before prompts, including English calendar names", () => {
		const date = new Date(2026, 9, 7, 23, 59, 8)
		const configured = {
			...template("* %^{Title}\n%t %T %u %U\n%<%Y %y %m %d %e %H %I %M %S %a %A %b %B %p %F %R %T %%>"),
			target: { kind: "datetree", relativePath: "journal.org", headingPath: ["Journal"] },
		} as const
		const plan = right(planOrgCaptureTemplate(configured, { ...context(), date }))
		date.setFullYear(2030)
		date.setHours(0, 0, 0)
		const result = right(renderOrgCaptureTemplate(plan, ["Frozen"]))
		expect(result.target).toEqual({ kind: "datetree", relativePath: "journal.org", headingPath: ["Journal"], date: "2026-10-07" })
		expect(result.initialSource).toBe("* Frozen\n<2026-10-07 Wed> <2026-10-07 Wed 23:59> [2026-10-07 Wed] [2026-10-07 Wed 23:59]\n2026 26 10 07  7 23 11 59 08 Wed Wednesday Oct October PM 2026-10-07 23:59 23:59:08 %")
	})

	it("formats midnight/noon and year boundaries using the provided local date", () => {
		for (const [date, expected] of [
			[new Date(2027, 0, 1, 0, 2, 3), "2027-01-01 Fri 12 AM 00:02:03"],
			[new Date(2026, 11, 31, 12, 2, 3), "2026-12-31 Thu 12 PM 12:02:03"],
		] as const) {
			const plan = right(planOrgCaptureTemplate(template("* %<%F %a %I %p %T>"), { ...context(), date }))
			expect(right(renderOrgCaptureTemplate(plan, [])).initialSource).toBe(`* ${expected}`)
		}
	})

	it("snapshots and freezes template, target, prompt candidates and context rather than retaining mutable inputs", () => {
		const input = { ...template("* %^{Title|default|one|two}\n%i %a"), target: { kind: "heading", relativePath: "inbox.org", headingPath: ["Projects", "Grain"] } }
		const captureContext = { ...context(), region: "region%?", annotation: "annotation%U" }
		const plan = right(planOrgCaptureTemplate(input, captureContext))
		input.source = "* Changed"
		input.target.relativePath = "changed.org"
		input.target.headingPath[0] = "Changed"
		captureContext.region = "changed"
		captureContext.annotation = "changed"
		expect(Object.isFrozen(plan)).toBe(true)
		expect(Object.isFrozen(plan.prompts)).toBe(true)
		expect(Object.isFrozen(plan.prompts[0])).toBe(true)
		expect(Object.isFrozen(plan.prompts[0].candidates)).toBe(true)
		const result = right(renderOrgCaptureTemplate(plan, ["Original"]))
		expect(result.initialSource).toBe("* Original\nregion%? annotation%U")
		expect(result.target).toEqual({ kind: "heading", relativePath: "inbox.org", headingPath: ["Projects", "Grain"] })
		expect(Object.isFrozen(result.target)).toBe(true)
		if (result.target.kind === "heading") expect(Object.isFrozen(result.target.headingPath)).toBe(true)
		expect(E.isLeft(renderOrgCaptureTemplate({ prompts: [] }, []))).toBe(true)
	})
})

describe("Capture template validation boundaries", () => {
	it.each([
		"%(shell-command \"bad\")", "%[secret.org]", "%A", "%c", "%x", "%k", "%K", "%n", "%:subject",
		"%^g", "%^{Tags}g", "%^{Date}t", "%^{Property}p", "%^{Clipboard}C", "%^{Link}L", "%^{Value}G", "%^{Value}T", "%^{Value}u", "%^{Value}U",
		"%\\*1", "%1", "%\\0", "%\\2 %^{Only one}", "%\\999999999999999999999999", "%", "%%", "%z", "%^{Unclosed", "%^{ }", "%^{a\nb}", "%<%z>", "%<%-d>", "%<%Q>", "%<%>", "%<>", "%<%Y", "%<%Y\n%m>",
	])("rejects unsupported or malformed token %j visibly at configuration time", (token) => {
		const result = validateOrgCaptureTemplate(template(`* Title\n${token}`))
		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("ORG_CAPTURE_VALIDATION_ERROR")
			expect(result.left.message.length).toBeGreaterThan(0)
		}
	})

	it("rejects non-declarative template data without calling functions or property getters", () => {
		const fn = vi.fn(() => "* Executed")
		const getter = vi.fn(() => "* Executed getter")
		const accessor = { ...template("* Title") }
		Object.defineProperty(accessor, "source", { get: getter })
		for (const value of [
			fn, null, [], accessor,
			{ ...template("* Title"), source: fn },
			{ ...template("* Title"), source: { function: fn } },
			{ ...template("* Title"), target: fn },
			{ ...template("* Title"), shell: "echo bad" },
			Object.assign(Object.create({ inherited: true }), template("* Title")),
		]) expect(E.isLeft(validateOrgCaptureTemplate(value))).toBe(true)
		expect(fn).not.toHaveBeenCalled()
		expect(getter).not.toHaveBeenCalled()
	})

	it.each([
		{ id: "" }, { id: "bad id" }, { label: " " }, { label: "two\nlines" }, { entryType: "function" }, { source: "" },
		{ target: { kind: "file", relativePath: "../escape.org" } },
		{ target: { kind: "file", relativePath: "inbox.org", headingPath: ["unexpected"] } },
		{ target: { kind: "heading", relativePath: "inbox.org", headingPath: [] } },
		{ target: { kind: "heading", relativePath: "inbox.org", headingPath: ["two\nlines"] } },
		{ target: { kind: "heading", relativePath: "inbox.org", headingPath: "Projects/Grain" } },
		{ target: { kind: "datetree", relativePath: "journal.org", date: "2026-10-07" } },
		{ target: { kind: "function", relativePath: "inbox.org" } },
	])("rejects invalid closed-schema data %j", (patch) => {
		expect(E.isLeft(validateOrgCaptureTemplate({ ...template("* Title"), ...patch }))).toBe(true)
	})

	it.each([
		["entry", "body without a heading"], ["entry", "** wrong root"],
		["item", "not an item"], ["checkitem", "- not a checkbox"], ["table-line", "| unclosed"],
	])("rejects source which contradicts declared %s structure", (entryType, source) => {
		expect(E.isLeft(validateOrgCaptureTemplate({ ...template(source), entryType }))).toBe(true)
	})

	it.each([
		["entry", "* %?"], ["item", "- %?"], ["checkitem", "- [ ] %?"], ["table-line", "| %? |"], ["plain", "%^{Body}"],
	])("accepts editable %s placeholders while retaining their declared structure", (entryType, source) => {
		expect(E.isRight(validateOrgCaptureTemplate({ ...template(source), entryType }))).toBe(true)
	})

	it("rejects invalid context dates before expansion", () => {
		for (const date of [new Date(NaN), new Date(10000, 0, 1)])
			expect(E.isLeft(planOrgCaptureTemplate(template("* %t"), { ...context(), date }))).toBe(true)
	})
})

describe("editable Capture shape versus publishable contents", () => {
	it("treats the table cursor as zero-width while accepting a literal prompt answer", () => {
		const configured: OrgCaptureTemplate = {
			...template("| %^{Cell|cell} |\n%?"), entryType: "table-line",
		}
		const prepared = right(renderOrgCaptureTemplate(right(planOrgCaptureTemplate(configured, context())), ["😀 %? literal"]))
		expect(prepared.initialSource).toBe("| 😀 %? literal |\n")
		expect(prepared.initialCursor).toBe(prepared.initialSource.length)
		expect(E.isRight(validateOrgCaptureSource(prepared.initialSource, prepared.entryType))).toBe(true)
	})
	it.each([
		["entry", "* %?"],
		["plain", "%?"],
		["item", "- %?"],
		["checkitem", "- [ ] %?"],
		["table-line", "| %? |"],
	] as const)("permits an empty editable %s shape but rejects publishing until the user supplies meaningful contents", (entryType, source) => {
		const configured: OrgCaptureTemplate = { ...template(source), entryType }
		const prepared = right(renderOrgCaptureTemplate(right(planOrgCaptureTemplate(configured, context())), []))
		expect(E.isLeft(validateOrgCaptureSource(prepared.initialSource, entryType))).toBe(true)
	})
	it.each([
		["entry", "** %?"],
		["item", "%?"],
		["checkitem", "- %?"],
		["table-line", "| cell |\n%? not a row"],
	] as const)("still rejects a structurally invalid %s template before opening a scratch", (entryType, source) => {
		expect(E.isLeft(validateOrgCaptureTemplate({ ...template(source), entryType }))).toBe(true)
	})
})
