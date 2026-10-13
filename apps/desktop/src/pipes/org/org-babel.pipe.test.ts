import { describe, expect, it } from "vitest"
import { parseOrgBabelFrame, planOrgBabelResults, selectOrgBabelInvocation, selectOrgTableExecution, type OrgBabelFrame } from "./org-babel.pipe"

const blockAt = (source: string, cursor = source.indexOf("(+")) => {
	const selected = selectOrgBabelInvocation(source, cursor)
	if (selected.kind === "unavailable") throw new Error(selected.message)
	if (selected.kind !== "block") throw new Error("Expected a complete source block")
	return selected.range
}
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
// Protocol fixture coordinates, not an implementation of GNU Org result placement.
function receipt(source: string, from: number, to: number, insert: string): OrgBabelFrame {
	return { kind: "results", from: Array.from(source.slice(0, from).replace(/\r\n|\r/g, "\n")).length, to: Array.from(source.slice(0, to).replace(/\r\n|\r/g, "\n")).length, removed: source.slice(from, to).replace(/\r\n|\r/g, "\n"), insert }
}

describe("captured Babel source and GNU edit mapping", () => {
	it("selects complete inline expressions and CALL lines using exact raw protected eligibility", () => {
		const inline = "Before 😀\u0000\r\nsrc_emacs-lisp[:results value]{(list \"nested {body}\" 5)} after\r\n"
		const selected = selectOrgBabelInvocation(inline, inline.indexOf("nested"))
		expect(selected.kind).toBe("inline")
		if (selected.kind === "unavailable") throw new Error(selected.message)
		expect(inline.slice(selected.range.from, selected.range.to)).toBe('src_emacs-lisp[:results value]{(list "nested {body}" 5)}')
		const call = "#+CALL: named(a=2,b=3)\r\n"
		expect(selectOrgBabelInvocation(call, call.indexOf("named"))).toEqual({ kind: "call", range: { from: 0, to: call.indexOf("\r") } })
		for (const source of ["~src_emacs-lisp{(+ 2 3)}~", "#+begin_example\nsrc_emacs-lisp{(+ 2 3)}\n#+end_example", ":LOGBOOK:\n#+CALL: named()\n:END:", "* COMMENT hidden\nsrc_emacs-lisp{(+ 2 3)}", "src_emacs-lisp{(+ 2 3)"]) {
			expect(selectOrgBabelInvocation(source, source.indexOf("(+") >= 0 ? source.indexOf("(+") : source.indexOf("named")).kind).toBe("unavailable")
		}
	})
	it("captures the whole inline CALL including balanced headers/arguments and refuses protected or unfinished invocations", () => {
		const invocation = 'call_owned[:var text="[]"](value=(list 2 (list 3)))[ :results value ]'
		const source = `Before 😀\u0000\r\n${invocation} after\r\n`
		const selected = selectOrgBabelInvocation(source, source.indexOf("list 3"))
		if (selected.kind === "unavailable") throw new Error(selected.message)
		expect(selected.kind).toBe("call")
		expect(source.slice(selected.range.from, selected.range.to)).toBe(invocation)
		for (const protectedSource of [
			`~${invocation}~`, `=${invocation}=`, `#+begin_example\n${invocation}\n#+end_example`,
			`:LOGBOOK:\n${invocation}\n:END:`, `* COMMENT hidden\n${invocation}`,
			"call_owned(value=(list 2 3)", "call_owned()[ :results value",
		]) {
			expect(selectOrgBabelInvocation(protectedSource, protectedSource.indexOf("owned")).kind).toBe("unavailable")
		}
	})


	it("selects table rows but never expands result authority into formulas or protected tables", () => {
		const source = "before\r\n| 2 | 3 | 0 |\r\n| 4 | 5 | 0 |\n#+TBLFM: $3=$1+$2\r\nafter"
		const selected = selectOrgTableExecution(source, source.indexOf("$3"))
		expect(selected.kind).toBe("table")
		if (selected.kind === "unavailable") throw new Error(selected.message)
		expect(source.slice(selected.range.from, selected.range.to)).toBe("| 2 | 3 | 0 |\r\n| 4 | 5 | 0 |\n")
		for (const protectedSource of ["#+begin_src text\n| 2 | 3 | 0 |\n#+end_src", ":PROPERTIES:\n| 2 | 3 | 0 |\n:END:", "* COMMENT hidden\n| 2 | 3 | 0 |"]) {
			expect(selectOrgTableExecution(protectedSource, protectedSource.indexOf("| 2")).kind).toBe("unavailable")
		}
		const formula = source.indexOf("$3")
		expect(() => planOrgBabelResults(source, selected.range, receipt(source, formula, formula + 1, "x"), 0, "table")).toThrow("outside selected rows")
	})

	it("preserves mixed raw row endings while mapping a table-span edit and freezes reviewed edits", () => {
		const source = "😀\u0000\r\n| 2 | 3 | 0 |\r\n| 4 | 5 | 0 |\r| 6 | 7 | 0 |\n#+TBLFM: $3=$1+$2\r\n"
		const selected = selectOrgTableExecution(source, source.indexOf("| 2"))
		if (selected.kind === "unavailable") throw new Error(selected.message)
		const from = source.indexOf("0")
		const to = source.lastIndexOf("0") + 1
		const frame = receipt(source, from, to, "5 |\n| 4 | 5 | 9 |\n| 6 | 7 | 13")
		const batch = planOrgBabelResults(source, selected.range, frame, 0, "table")
		expect(batch.changes).toEqual([{ from, to, insert: "5 |\r\n| 4 | 5 | 9 |\r| 6 | 7 | 13" }])
		expect(Object.isFrozen(batch)).toBe(true)
		expect(Object.isFrozen(batch.changes)).toBe(true)
		expect(Object.isFrozen(batch.changes[0])).toBe(true)
		expect(() => planOrgBabelResults(source, selected.range, { ...frame, insert: "5 |\nextra-row\n| 4 | 5 | 9 |\n| 6 | 7 | 13" }, 0, "table")).toThrow("row structure")
	})

	it("allows an inline result only after the expression and protects invocation bytes", () => {
		const source = "😀\r\nsrc_emacs-lisp{(+ 2 3)} tail"
		const selected = selectOrgBabelInvocation(source, source.indexOf("(+"))
		if (selected.kind === "unavailable") throw new Error(selected.message)
		const batch = planOrgBabelResults(source, selected.range, receipt(source, selected.range.to, selected.range.to, " {{{results(=5=)}}}"), 0, "inline")
		expect(batch.changes[0].from).toBe(selected.range.to)
		expect(() => planOrgBabelResults(source, selected.range, receipt(source, selected.range.from, selected.range.from + 1, "x"), 0, "inline")).toThrow("selected invocation")
	})

	it("maps a minimal Unicode table-cell edit without changing mixed newlines, NUL, cursor or unrelated bytes", () => {
		const source = "opaque😀\u0000\r\n#+PROPERTY: header-args :var x=2\n#+begin_src emacs-lisp :results value table :noweb yes\r\n(+ x 1)\r\n#+end_src\r\n\r\n#+RESULTS:\r\n| 😀3 |\r\n\n* untouched\rbody"
		const cursor = source.indexOf("(+")
		const block = blockAt(source, cursor)
		const from = source.indexOf("😀3")
		const batch = planOrgBabelResults(source, block, receipt(source, from, from + 3, "🦊4"), cursor, "block")
		expect(batch.changes).toEqual([{ from, to: from + 3, insert: "🦊4" }])
		expect(batch.cursor).toBe(cursor)
		const edit = batch.changes[0]
		const next = source.slice(0, edit.from) + edit.insert + source.slice(edit.to)
		expect(next.slice(0, edit.from)).toBe(source.slice(0, edit.from))
		expect(next.slice(edit.from + edit.insert.length)).toBe(source.slice(edit.to))
	})
	it("keeps a GNU-owned remote edit separate from the selected named block and intervening content", () => {
		const source = "#+name: calc\n#+header: :results value\n#+begin_src emacs-lisp\n(+ 1 1)\n#+end_src\n\n* Other\nkeep\n#+RESULTS: calc\n: 2\n\nlast"
		const block = blockAt(source)
		const from = source.indexOf(": 2") + 2
		const batch = planOrgBabelResults(source, block, receipt(source, from, from + 1, "3"), source.indexOf("(+"), "block")
		expect(batch.requiredVisibleRanges).toContainEqual({ from, to: from + 1 })
		expect(batch.changes).toEqual([{ from, to: from + 1, insert: "3" }])
	})
	it.each([
		"#+begin_example\n#+begin_src emacs-lisp\n(+ 1 1)\n#+end_src\n#+end_example\n",
		":PROPERTIES:\n#+begin_src emacs-lisp\n(+ 1 1)\n#+end_src\n:END:\n",
		"* COMMENT disabled\n#+begin_src emacs-lisp\n(+ 1 1)\n#+end_src\n",
		"#+begin_src emacs-lisp\n(+ 1 1)\n",
	])("rejects ineligible source %j", (source) => {
		expect(selectOrgBabelInvocation(source, source.indexOf("(+")).kind).toBe("unavailable")
	})
	it("rejects stale, out-of-bounds, nonminimal or source-overwriting receipts", () => {
		const source = "#+begin_src emacs-lisp\n(+ 1 1)\n#+end_src\n#+RESULTS:\n: 2\n"
		const block = blockAt(source)
		const from = source.indexOf(": 2") + 2
		const valid = receipt(source, from, from + 1, "3")
		for (const frame of [{ ...valid, removed: "wrong" }, { ...valid, to: source.length + 1 }, receipt(source, source.indexOf("(+"), source.indexOf("(+") + 1, "x"), receipt(source, from, from + 2, "3\n")]) {
			expect(() => planOrgBabelResults(source, block, frame, source.indexOf("(+"), "block")).toThrow()
		}
	})
})

describe("strict untrusted Babel receipt protocol", () => {
	const valid = { protocol: "grain-org-babel/2", nonce: "intent", kind: "results", from: 50, to: 50, removed: "", insert: "\n#+RESULTS:\n: 2\n" }
	it("accepts exactly the nonce-bound receipt and canonical no-result outcome", () => {
		expect(parseOrgBabelFrame(encode(valid), "intent")).toEqual({ kind: "results", from: 50, to: 50, removed: "", insert: valid.insert })
		expect(parseOrgBabelFrame(encode({ ...valid, kind: "no-results", from: 0, to: 0, insert: "" }), "intent").kind).toBe("no-results")
		expect(parseOrgBabelFrame(encode({ ...valid, insert: '{"a":1,"b":2}\n' }), "intent").insert).toBe('{"a":1,"b":2}\n')
	})
	it.each([
		{ ...valid, nonce: "other" }, { ...valid, protocol: "grain-org-babel/1" }, { ...valid, hidden: true },
		{ ...valid, insert: "\ud800" }, { ...valid, removed: "\udc00" },
		{ ...valid, kind: "no-results" }, { ...valid, insert: 3 }, { ...valid, from: -1 },
		{ ...valid, from: 0.5 }, { ...valid, to: 49 }, { ...valid, to: Number.MAX_SAFE_INTEGER + 1 },
		{ ...valid, insert: "" }, [], null,
	])("rejects malformed frame %j", (value) => {
		expect(() => parseOrgBabelFrame(encode(value), "intent")).toThrow()
	})
	it("rejects invalid UTF-8, duplicate escaped keys, stray output and repeated frames", () => {
		expect(() => parseOrgBabelFrame(new Uint8Array([0xc3, 0x28]), "intent")).toThrow()
		const frame = JSON.stringify(valid)
		expect(() => parseOrgBabelFrame(new TextEncoder().encode(frame.replace('"nonce":"intent"', '"nonce":"intent","nonce":"intent"')), "intent")).toThrow()
		expect(() => parseOrgBabelFrame(new TextEncoder().encode(frame.replace('"nonce":"intent"', '"nonce":"intent","\\u006eonce":"intent"')), "intent")).toThrow()
		expect(() => parseOrgBabelFrame(new TextEncoder().encode(`log\n${frame}`), "intent")).toThrow()
		expect(() => parseOrgBabelFrame(new TextEncoder().encode(`\ufeff${frame}`), "intent")).toThrow()
		expect(() => parseOrgBabelFrame(new TextEncoder().encode(frame + frame), "intent")).toThrow()
	})
})
