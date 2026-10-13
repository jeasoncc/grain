import { describe, expect, it } from "vitest"
import { exportOrgSource, type OrgSourceExportOptions } from "./org-export.pipe"
import { planOrgDiary } from "./org-diary.pipe"

const output = (source: string, options: OrgSourceExportOptions): string => {
	const result = exportOrgSource(source, options)
	expect(result.kind).toBe("output")
	if (result.kind !== "output") throw new Error(result.message)
	return result.content
}

const utf16 = (text: string): string => {
	let hex = ""
	for (let index = 0; index < text.length; index++) hex += text.charCodeAt(index).toString(16).padStart(4, "0")
	return hex
}

describe("exportOrgSource", () => {
	it("exports a generated diary without leaking export configuration and leaves disabled scripts literal", () => {
		const source = `${planOrgDiary(new Date(2026, 9, 10, 11), "diary-id").content}x^2 and y_3\n`
		for (const format of ["html", "markdown"] as const) {
			const content = output(source, { format })
			for (const directive of ["OPTIONS", "LATEX_CLASS", "FILETAGS", "TIME"]) expect(content).not.toContain(`#+${directive}:`)
			expect(content).not.toContain("<sup>2</sup>")
			expect(content).not.toContain("<sub>3</sub>")
		}
	})

	it("limits numeric TOC depth without suppressing deeper body headings", () => {
		const content = output("#+OPTIONS: toc:2\n* First\n** Second\n*** Third\n", { format: "html" })
		const nav = content.slice(content.indexOf("<nav"), content.indexOf("</nav>"))
		expect(nav).toContain("First")
		expect(nav).toContain("Second")
		expect(nav).not.toContain("Third")
		expect(content).toContain('<h3 id="org-heading-3">Third</h3>')
		expect(content).not.toContain("#+OPTIONS:")
	})

	it.each(["html", "markdown"] as const)("exports completed inline and CALL data as %s without losing the source expression or reviewed result", (format) => {
		const source = "#+NAME: owned\r\n#+begin_src emacs-lisp :exports both\r\n(error \"NEVER-EXECUTE\")\r\n#+end_src\r\n\r\ninline src_emacs-lisp{(+ 4 5)} {{{results(=9=)}}}\r\n\r\n#+CALL: owned()\r\n#+RESULTS:\r\n: existing-call-result\r\n\r\ninline call_owned() {{{results(=5=)}}}\r\n"
		const content = output(source, { format })
		expect(content).toContain("NEVER-EXECUTE")
		expect(content).toContain("existing-call-result")
		if (format === "html") {
			const document = new DOMParser().parseFromString(content, "text/html")
			const code = [...document.querySelectorAll("code")].map((node) => node.textContent)
			expect(code).toContain("(+ 4 5)")
			expect(code).toContain("9")
			expect(code).toContain("call_owned()")
			expect(code).toContain("5")
			expect(code).toContain("#+CALL: owned()\r\n")
		} else {
			expect(content).toContain("` (+ 4 5) `")
			expect(content).toContain("` 9 `")
			expect(content).toContain("` call_owned() `")
			expect(content).toContain("` 5 `")
			expect(content).toContain("#+CALL: owned()\r\n")
		}
		expect(content).not.toContain("{{{results")
	})

	it("keeps source headers and bodies literal while substituting only GNU results' first comma-escaped argument", () => {
		const body = '(list "<script>" "{{{dynamic()}}}" "\\u0000😀")'
		const source = `src_emacs-lisp[:var text="{{{dynamic()}}}"]{${body}} {{{results(=one\\,two=,ignored)}}} {{{results(=one\\\\\\,two=)}}}`
		const document = new DOMParser().parseFromString(output(source, { format: "html" }), "text/html")
		const code = [...document.querySelectorAll("code")].map((node) => node.textContent)
		expect(code).toEqual([body, "one,two", "one\\,two"])
		expect(document.querySelector("script")).toBeNull()
		expect(document.body.textContent).not.toContain("ignored")
	})

	it.each(["code", "results", "both", "none"] as const)("exports %s selection from existing results without evaluating code", (selection) => {
		const source = `#+begin_src emacs-lisp :exports ${selection} :eval yes :var text="ignored :exports none"\r\n(error "NEVER EXECUTE")\r\n#+end_src\r\n\r\n#+RESULTS:\r\n| result-token |\r\n\r\nOutside\n`
		for (const format of ["html", "markdown"] as const) {
			const content = output(source, { format })
			expect(content.includes("NEVER EXECUTE")).toBe(selection === "code" || selection === "both")
			if (format === "html") expect(content.includes("result-token")).toBe(selection === "results" || selection === "both")
			expect(content).not.toContain("#+RESULTS:")
			expect(content).toContain("Outside")
		}
	})

	it("selects nonlocal named literal result payloads without altering captured source", () => {
		for (const payload of [
			"| named-result-token |\r\n",
			": named-result-token\r\n",
			"#+begin_example\r\nnamed-result-token 😀\u0000\r\n#+end_example\r\n",
			":RESULTS:\r\nnamed-result-token 😀\u0000\r\n:END:\r\n",
		]) {
			const source = `#+NAME: owned\r\n#+begin_src emacs-lisp :exports results :eval yes\r\n(error "NEVER EXECUTE")\r\n#+end_src\r\n\r\n* Elsewhere\r\nIntervening text\r\n#+RESULTS[owned-hash]: owned\r\n${payload}\r\nOutside\n`
			const original = source
			for (const format of ["html", "markdown"] as const) {
				const content = output(source, { format })
				expect(content).not.toContain("NEVER EXECUTE")
				if (format === "html") expect(content).toContain("named-result-token")
				expect(content).not.toContain("#+RESULTS")
				expect(content).not.toContain("#+NAME:")
				expect(content).toContain("Intervening text")
				expect(content).toContain("Outside")
				if (payload.includes("\u0000")) {
					expect(content).toContain(format === "html" || payload.startsWith("#+") ? utf16(payload) : payload)
				}
			}
			expect(source).toBe(original)
		}
	})

	it("resolves file, language, subtree and affiliated export headers in order", () => {
		const source = "#+PROPERTY: header-args :exports none\n#+PROPERTY: header-args:emacs-lisp :exports results\n* Parent\n:PROPERTIES:\n:header-args:emacs-lisp: :exports both\n:END:\n#+HEADER: :exports code\n#+begin_src emacs-lisp :results value\n(+ 2 3)\n#+end_src\n#+RESULTS:\n: hidden-result\n\n* Sibling\n#+begin_src emacs-lisp\nhidden-code\n#+end_src\n#+RESULTS:\n: visible-result\n"
		const content = output(source, { format: "html" })
		expect(content).toContain("(+ 2 3)")
		expect(content).not.toContain("hidden-result")
		expect(content).not.toContain("hidden-code")
		expect(content).toContain("visible-result")
		expect(content).not.toContain("#+HEADER:")
		expect(content).not.toContain("#+PROPERTY:")
	})

	it("uses nonlocal named results and file property drawers without executing dynamic export headers", () => {
		const source = ":PROPERTIES:\n:header-args: :exports none\n:END:\n#+NAME: hidden\n#+begin_src emacs-lisp\nhidden-body\n#+end_src\n\n* Other\nIndependent\n#+RESULTS: hidden\n: hidden-output\n\nVisible\n"
		const content = output(source, { format: "html" })
		expect(content).not.toContain("hidden-body")
		expect(content).not.toContain("hidden-output")
		expect(content).not.toContain("#+NAME:")
		expect(content).toContain("Independent")
		expect(content).toContain("Visible")
		expect(exportOrgSource("#+begin_src emacs-lisp :exports (progn (error \"never\"))\n(+ 2 3)\n#+end_src\n", { format: "html" }).kind).toBe("rejected")
	})

	it("exports standalone HTML with immutable Unicode source, headings, TODO states and tags", () => {
		const source = "#+TITLE: 工作 & <notes>\r\n#+TODO: WAIT(w) | CLOSED(c)\r\n* WAIT Plan :work:共享:\r\nFirst paragraph.\r\nSecond line 😀.\r\n"
		const original = source
		const result = exportOrgSource(source, { format: "html" })
		expect(result.kind).toBe("output")
		if (result.kind !== "output") throw new Error(result.message)
		expect(result.mediaType).toBe("text/html;charset=utf-8")
		expect(result.extension).toBe("html")
		expect(result.content).toContain("<!doctype html>")
		expect(result.content).toContain("<title>工作 &amp; &lt;notes&gt;</title>")
		expect(result.content).toContain('<h1 id="org-heading-1">WAIT Plan :work:共享:</h1>')
		expect(result.content).toContain("<p>First paragraph.\nSecond line 😀.</p>")
		expect(result.content).toContain("Content-Security-Policy")
		expect(source).toBe(original)
	})

	it("honors explicit title precedence and implemented export options", () => {
		const source = "#+TITLE: Original\n#+AUTHOR: Ada\n#+DATE: 2026\n#+OPTIONS: todo:nil tags:nil <:nil d:nil num:t toc:t\n* TODO Visible :work:\n:PROPERTIES:\n:CUSTOM_ID: visible\n:END:\nAt <2026-10-09 Fri> and [2026-10-10 Sat].\n** DONE Child :other:\n"
		const html = output(source, { format: "html", title: "Chosen" })
		expect(html).toContain("<title>Chosen</title>")
		expect(html).toContain('aria-label="Table of contents"')
		expect(html).toContain('<h1 id="org-heading-1">1 Visible</h1>')
		expect(html).toContain('<h2 id="org-heading-2">1.1 Child</h2>')
		expect(html).toContain("Ada")
		expect(html).not.toContain("Original")
		expect(html).not.toContain("PROPERTIES")
		expect(html).not.toContain("2026-10-09")
		expect(html).not.toContain(":work:")
	})

	it("emits useful Markdown headings, paragraphs and inline markup without raw hostile HTML", () => {
		const result = exportOrgSource("* Heading\nA *bold* /italic/ _underlined_ +removed+ ~<script>~ =a`b= and <img src=x onerror=alert(1)>.", { format: "markdown" })
		expect(result.kind).toBe("output")
		if (result.kind !== "output") throw new Error(result.message)
		expect(result.extension).toBe("md")
		expect(result.mediaType).toBe("text/markdown;charset=utf-8")
		expect(result.content).toContain("# Heading")
		expect(result.content).toContain("**bold** *italic* _underlined_ ~~removed~~")
		expect(result.content).toContain("` <script> `")
		expect(result.content).toContain("`` a`b ``")
		expect(result.content).toContain("&lt;img src=x onerror=alert\\(1\\)&gt;")
		expect(result.content).not.toContain("<img")
	})

	it("escapes HTML text, code, metadata, link labels and attribute delimiters", () => {
		const source = '#+TITLE: </title><script>alert(1)</script>\n* <svg onload="attack()">\n<script>alert(2)</script> ~<b>&~ [[https://example.test/?x=%22%3E][<img src=x onerror="attack()">]]\n#+HTML: <iframe src=javascript:attack()>\n'
		const html = output(source, { format: "html" })
		expect(html).not.toContain("<script>")
		expect(html).not.toContain("<svg")
		expect(html).not.toContain("<img")
		expect(html).not.toContain("<iframe")
		expect(html).toContain("&lt;script&gt;")
		expect(html).toContain("<code>&lt;b&gt;&amp;</code>")
		expect(html).toContain("&lt;img src=x onerror=&quot;attack()&quot;&gt;")
	})

	it.each(["javascript:alert(1)", "data:text/html,<svg/onload=alert(1)>", "vbscript:evil", "file:javascript:evil", "//evil.test/path", "https://example.test/%0aattack", "javascript\u0000:evil"])("keeps unsafe target %s visible but inactive", (target) => {
		for (const format of ["html", "markdown"] as const) {
			const content = output(`See [[${target}][click]].`, { format })
			expect(content).toContain("click")
			expect(content).not.toContain('<a href=')
			expect(content).not.toContain("[click](")
		}
	})

	it("converts HTTP, relative file and local ID/custom-ID links, preserving unresolved targets", () => {
		const source = "* Target\nSCHEDULED: <2026-10-09 Fri>\n:PROPERTIES:\n:ID: record-1\n:CUSTOM_ID: local\n:END:\n[[https://example.test/a?x=1&y=2][Web]] [[file:../notes/共享.org][File]] [[id:record-1][ID]] [[#local][Local]] [[id:missing][Missing]] [[file:/absolute/path][Absolute]]\n"
		const html = output(source, { format: "html" })
		expect(html).toContain('href="https://example.test/a?x=1&amp;y=2"')
		expect(html).toContain('href="./../notes/%E5%85%B1%E4%BA%AB.org"')
		expect(html).toContain('href="#org-heading-1" rel="noopener noreferrer">ID</a>')
		expect(html).toContain('href="#org-heading-1" rel="noopener noreferrer">Local</a>')
		expect(html).toContain("Missing <code>id:missing</code>")
		expect(html).toContain("Absolute <code>file:/absolute/path</code>")
		const md = output(source, { format: "markdown" })
		expect(md).toContain("[File](<./../notes/%E5%85%B1%E4%BA%AB.org>)")
		expect(md).toContain("[ID](<#org-heading-1>)")
	})

	it("renders nested ordered and unordered lists with checked, unchecked and partial boxes", () => {
		const source = "3. [X] Finish\n   continuation\n   - [ ] Nested\n   - [-] Partial\n4. Next\n\n- Plain\n"
		const html = output(source, { format: "html" })
		expect(html).toContain('<ol start="3">')
		expect(html).toContain('aria-label="checked">☑</span> Finish<br>continuation<ul>')
		expect(html).toContain('aria-label="unchecked">☐</span> Nested')
		expect(html).toContain('aria-label="partial">◩</span> Partial')
		const md = output(source, { format: "markdown" })
		expect(md).toContain("3. [x] Finish\n    continuation\n    - [ ] Nested\n    - [-] Partial\n4. Next")
	})

	it("renders tables and preserves nonrectangular or complex tables as literal source", () => {
		const html = output("| Name | Value |\n|------+-------|\n| *one* | <evil> |\n", { format: "html" })
		expect(html).toContain("<th>Name</th><th>Value</th>")
		expect(html).toContain("<td><strong>one</strong></td><td>&lt;evil&gt;</td>")
		const md = output("| a | b |\n| c | d |\n", { format: "markdown" })
		expect(md).toContain("|   |   |\n| --- | --- |\n| a | b |\n| c | d |")
		const malformed = "| one | two |\r\n| three |\r\n"
		expect(output(malformed, { format: "markdown" })).toContain(malformed)
	})

	it("preserves literal code bytes and fence-like content across CRLF, bare CR and NUL", () => {
		const body = '😀\u0000<script>\r\n```\r#+INCLUDE: "secret"\r\n* not a heading\r\n'
		const source = `#+begin_src text\r\n${body}#+end_src\r\n`
		const md = output(source, { format: "markdown" })
		expect(md).toContain(`\`\`\`\`text\n${body}\`\`\`\``)
		expect(md).toContain(`<!-- org-source-utf16:${utf16(source)} -->`)
		const html = output(source, { format: "html" })
		expect(html).toContain(`data-org-source-utf16="${utf16(source)}"`)
		expect(html).toContain("😀&#x2400;&lt;script&gt;&#13;\n")
		expect(html).not.toContain("<script>")
		expect(html).not.toContain('id="org-heading-')
	})

	it("keeps example and unknown/export blocks visible without execution", () => {
		const example = "#+begin_example\n{{{macro()}}}\n#+end_example\n"
		expect(output(example, { format: "markdown" })).toContain("{{{macro()}}}")
		for (const block of ["#+begin_export html\r\n<script>attack()</script>\r\n#+end_export\r\n", "#+begin_mystery\n未知\u0000\n#+end_mystery\n"]) {
			expect(output(block, { format: "markdown" })).toContain(block)
			expect(output(block, { format: "html" })).toContain(`data-org-source-utf16="${utf16(block)}"`)
		}
	})

	it("renders quote blocks and preserves their original raw bytes as inert data", () => {
		const source = "#+begin_quote\r\n*Important* <script>\r\nSecond line.\r\n#+end_quote\r\n"
		const html = output(source, { format: "html" })
		expect(html).toContain("<blockquote")
		expect(html).toContain("<strong>Important</strong> &lt;script&gt;")
		const md = output(source, { format: "markdown" })
		expect(md).toContain("> **Important** &lt;script&gt;\n> Second line\\.")
		expect(md).toContain(`<!-- org-source-utf16:${utf16(source)} -->`)
	})

	it("exposes property/logging drawers and unknown directives literally by default", () => {
		const drawer = ":LOGBOOK:\r\n- State \"DONE\" from \"TODO\" [2026-10-09 Fri]\r\n:END:\r\n"
		const source = `* Record\r\n:PROPERTIES:\r\n:OWNER: Ada\r\n:END:\r\n${drawer}#+MYSTERY: visible\r\n`
		const md = output(source, { format: "markdown" })
		expect(md).toContain(":OWNER: Ada\r\n")
		expect(md).toContain(drawer)
		expect(md).toContain("#+MYSTERY: visible\r\n")
	})

	it("resolves named, anonymous and named-inline footnotes including multiline definitions", () => {
		const source = "Text[fn:detail], inline[fn:named:*bold*] and anonymous[fn::See [[https://example.test][web]]]. Missing[fn:unknown].\n\n[fn:detail] First line\n  Second line\n"
		const html = output(source, { format: "html" })
		expect(html).toContain('href="#org-fn-detail"')
		expect(html).toContain('id="org-fn-detail"><span>detail:</span> First line\nSecond line')
		expect(html).toContain('id="org-fn-named"><span>named:</span> <strong>bold</strong>')
		expect(html).toContain('href="#org-fn-org-inline-1"')
		expect(html).toContain('href="https://example.test/"')
		expect(html).toContain("Missing[fn:unknown]")
		const md = output(source, { format: "markdown" })
		expect(md).toContain("[^detail]: First line\n    Second line")
		expect(md).toContain("[^named]: **bold**")
		expect(md).toContain("[^org-inline-1]: See [web](<https://example.test/>)")
	})

	it("excludes COMMENT/noexport subtrees without misclassifying similarly named tags", () => {
		const source = "* TODO COMMENT Private\nSecret one\n** Child\nSecret two\n* Hidden :noexport:\nSecret three\n** Child\nSecret four\n* Visible :not-noexport:\nPublic\n"
		for (const format of ["html", "markdown"] as const) {
			const content = output(source, { format })
			expect(content).not.toContain("Secret")
			expect(content).toContain("Visible")
			expect(content).toContain("Public")
		}
	})

	it.each(["#+INCLUDE: \"file.org\"", "#+SETUPFILE: https://example.test/style.org", "#+MACRO: evil (eval attack)", "#+BIND: org-export-use-babel t", "Text {{{evil()}}}", "[fn:a] note\n  #+INCLUDE: \"file.org\""])("rejects unsupported executable construct %s visibly", (source) => {
		for (const format of ["html", "markdown"] as const) {
			const result = exportOrgSource(source, { format })
			expect(result.kind).toBe("rejected")
		}
	})

	it.each(["#+begin_src js\nunterminated", ":PROPERTIES:\n:ID: x", "#+begin_example\nbody\n#+end_example extra", "[fn:a] first\n[fn:a] second", "One[fn:a:inline]\n[fn:a] duplicate", "* One\n:PROPERTIES:\n:ID: same\n:END:\n* Two\n:PROPERTIES:\n:ID: same\n:END:\n", "#+OPTIONS: toc:invalid"])("rejects ambiguous or unsupported input %s", (source) => {
		const result = exportOrgSource(source, { format: "html" })
		expect(result.kind).toBe("rejected")
		if (result.kind === "rejected") expect(result.message.length).toBeGreaterThan(0)
	})

	it("retains unknown options visibly while honoring supported options on the same line", () => {
		const content = output("#+OPTIONS: todo:nil mystery:t\n* TODO Visible\n", { format: "html" })
		expect(content).toContain("#+OPTIONS: todo:nil mystery:t")
		expect(content).toContain('<h1 id="org-heading-1">Visible</h1>')
	})

	it("exports empty source and treats a lone surrogate in a target as inactive text rather than throwing", () => {
		expect(output("", { format: "markdown" })).toBe("\n")
		expect(output("", { format: "html" })).toContain("<body>")
		const content = output("[[file:\ud800.org][Broken]]", { format: "html" })
		expect(content).toContain("Broken")
		expect(content).not.toContain('<a href=')
	})

	it("keeps macros and footnotes inside inline code literal rather than executable or referential", () => {
		const source = "Literal ~{{{macro()}}}~ and =[fn::not a definition]=."
		const html = output(source, { format: "html" })
		expect(html).toContain("<code>{{{macro()}}}</code>")
		expect(html).toContain("<code>[fn::not a definition]</code>")
		expect(html).not.toContain('aria-label="Footnotes"')
	})

	it("supports description list items and encoded file paths containing spaces", () => {
		const source = "- Term :: Meaning\n[[file:notes/my page.org][Page]]"
		const html = output(source, { format: "html" })
		expect(html).toContain("<li><strong>Term</strong>: Meaning</li>")
		expect(html).toContain('href="./notes/my%20page.org"')
		expect(output(source, { format: "markdown" })).toContain("- **Term**: Meaning")
	})

	it("collects unindented multiline footnote definitions without consuming the next heading", () => {
		const source = "Reference[fn:a].\n\n[fn:a]\nFirst line\nSecond line\n* Next\nBody"
		const md = output(source, { format: "markdown" })
		expect(md).toContain("[^a]: First line\n    Second line")
		expect(md).toContain("# Next")
	})

	it("leaves prototype-named options visible and rejects executable macros inside quote blocks", () => {
		expect(output("#+OPTIONS: constructor:t\nBody", { format: "html" })).toContain("#+OPTIONS: constructor:t")
		expect(exportOrgSource("#+begin_quote\n{{{macro()}}}\n#+end_quote", { format: "html" }).kind).toBe("rejected")
	})
})
