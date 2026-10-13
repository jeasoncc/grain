import { spawnSync } from "node:child_process"
import { closeSync, mkdtempSync, openSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ORG_BABEL_EMACS_WRAPPER, parseOrgBabelFrame, planOrgBabelResults, selectOrgBabelInvocation, selectOrgTableExecution, type OrgBabelSelection } from "./org-babel.pipe"

const executeOwnedFixture = (source: string, selection: Exclude<OrgBabelSelection, { kind: "unavailable" }>) => {
	const directory = mkdtempSync(join(tmpdir(), "grain-babel-oracle-"))
	let input: number | undefined
	try {
		const path = join(directory, "fixture.org")
		const request = join(directory, "request.json")
		const scalar = (offset: number) => Array.from(source.slice(0, offset).replace(/\r\n|\r/g, "\n")).length
		writeFileSync(path, source, "utf8")
		writeFileSync(request, `${JSON.stringify({ source, position: scalar(selection.range.from), selectionEnd: scalar(selection.range.to), sourceKind: selection.kind, path, relativePath: "fixture.org", nonce: "owned-oracle" })}\n`, "utf8")
		input = openSync(request, "r")
		return spawnSync("emacs", ["--batch", "-Q", "--eval", ORG_BABEL_EMACS_WRAPPER], {
			cwd: directory, stdio: [input, "pipe", "pipe"],
			timeout: 30000, maxBuffer: 4 * 1024 * 1024, env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", TZ: "UTC" },
		})
	} finally {
		if (input !== undefined) closeSync(input)
		rmSync(directory, { recursive: true, force: true })
	}
}

/** Real installed GNU execution on owned, benign fixtures, not native consent evidence. */
describe("installed GNU selected invocation and table result receipts", () => {
	it.each([
		{ kind: "block", source: "opaque😀\u0000\r\n#+begin_src emacs-lisp :results value\r\n(+ 2 3)\r\n#+end_src\r\n", needle: "(+ 2", result: ": 5" },
		{ kind: "block", source: "opaque😀\u0000\r\n#+begin_src emacs-lisp :results value\r\n\"café🐉\"\r\n#+end_src\r\n\r\n#+RESULTS:\r\n: old🐉\r\n\r\nOutside\r\n", needle: "\"café", result: ": café🐉" },
		{ kind: "inline", source: "opaque😀\u0000\r\nInline src_emacs-lisp[:results value]{(+ 2 3)}.\r\n", needle: "(+ 2", result: "{{{results(=5=)}}}" },
		{ kind: "call", source: "opaque😀\u0000\r\n#+name: sum\r\n#+begin_src emacs-lisp :var a=0 b=0 :results value\r\n(+ a b)\r\n#+end_src\r\n\r\n#+CALL: sum(a=2,b=3)\r\n", needle: "#+CALL", result: ": 5" },
		{ kind: "call", source: "opaque😀\u0000\r\n#+name: sum\r\n#+begin_src emacs-lisp :var a=0 b=0 :results value\r\n(+ a b)\r\n#+end_src\r\n\r\nInline call_sum(a=2,b=3)[:results value].\r\n", needle: "call_sum", result: "{{{results(=5=)}}}" },
		{ kind: "table", source: "opaque😀\u0000\r\n| 2 | 3 | 0 |\r\n#+TBLFM: $3=$1+$2\r\n\r\nOutside\r\n", needle: "| 2", result: "| 2 | 3 | 5 |" },
	] as const)("executes $kind with a nonce-bound minimal result and untouched external raw bytes", ({ kind, source, needle, result }) => {
		const cursor = source.indexOf(needle)
		const selection = kind === "table" ? selectOrgTableExecution(source, cursor) : selectOrgBabelInvocation(source, cursor)
		if (selection.kind === "unavailable") throw new Error(selection.message)
		expect(selection.kind).toBe(kind)
		const native = executeOwnedFixture(source, selection)
		expect(native.error, "GNU Emacs is required, never replaced by mock results").toBeUndefined()
		expect(native.status, native.stderr.toString()).toBe(0)
		const frame = parseOrgBabelFrame(native.stdout, "owned-oracle")
		expect(frame.kind).toBe("results")
		const batch = planOrgBabelResults(source, selection.range, frame, cursor, selection.kind)
		expect(Object.isFrozen(batch)).toBe(true)
		const change = batch.changes[0]
		const next = source.slice(0, change.from) + change.insert + source.slice(change.to)
		expect(next).toContain(result)
		expect(Buffer.from(next.slice(0, change.from), "utf8")).toEqual(Buffer.from(source.slice(0, change.from), "utf8"))
		expect(Buffer.from(next.slice(change.from + change.insert.length), "utf8")).toEqual(Buffer.from(source.slice(change.to), "utf8"))
		expect(next.startsWith("opaque😀\u0000\r\n")).toBe(true)
		if (kind === "table") expect(next).toBe(source.replace("| 2 | 3 | 0 |", "| 2 | 3 | 5 |"))
	}, 35000)

	it("refuses execution-time changes outside the selected GNU result insertion", () => {
		const source = "#+begin_src emacs-lisp :results value\n(progn (goto-char (point-max)) (insert \"foreign mutation\") 5)\n#+end_src\n"
		const selection = selectOrgBabelInvocation(source, source.indexOf("progn"))
		if (selection.kind === "unavailable") throw new Error(selection.message)
		const native = executeOwnedFixture(source, selection)
		expect(native.error).toBeUndefined()
		expect(native.status).not.toBe(0)
		expect(native.stdout.toString("utf8")).not.toContain('"protocol":"grain-org-babel/2"')
	}, 35000)
})
