import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { planOrgDiary } from "./org-diary.pipe"
import { exportOrgSource } from "./org-export.pipe"

const GNU_EXPORT = `(progn
  (setq coding-system-for-read 'utf-8-unix coding-system-for-write 'utf-8-unix)
  (require 'json)
  (require 'org)
  (require 'ox-html)
  (require 'ob-emacs-lisp)
  (let ((source (with-temp-buffer (insert-file-contents (pop command-line-args-left)) (json-parse-buffer))))
    (with-temp-buffer
      (insert source)
      (org-mode)
      (let ((org-confirm-babel-evaluate t) (org-html-doctype "html5") (org-html-html5-fancy t))
        (princ (org-export-as 'html nil nil t))))))`

const exportOwnedFixture = (source: string) => {
	const directory = mkdtempSync(join(tmpdir(), "grain-export-oracle-"))
	try {
		const fixture = join(directory, "fixture.json")
		writeFileSync(fixture, JSON.stringify(source), "utf8")
		return spawnSync("emacs", ["--batch", "-Q", "--eval", GNU_EXPORT, fixture], {
			cwd: directory, timeout: 30000, maxBuffer: 4 * 1024 * 1024,
			env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", TZ: "UTC" },
		})
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
}

/** Deliberately benign :eval never-export fixtures: this is not app execution authority. */
describe("installed GNU nonexecuting export option and selection fixtures", () => {
	it.each(["code", "results", "both", "none"] as const)("matches GNU %s source/result selection without executing the source body", (selection) => {
		for (const source of [
			`#+begin_src emacs-lisp :exports ${selection} :eval never-export\n(error "NEVER-EXECUTE-TOKEN")\n#+end_src\n\n#+RESULTS:\n| existing-result-token |\n`,
			`#+NAME: owned\n#+begin_src emacs-lisp :exports ${selection} :eval never-export\n(error "NEVER-EXECUTE-TOKEN")\n#+end_src\n\n* Elsewhere\nOutside\n#+RESULTS: owned\n: existing-result-token\n`,
		]) {
			const native = exportOwnedFixture(source)
			expect(native.error, "GNU Emacs is a required independent oracle, not a mock").toBeUndefined()
			expect(native.status, native.stderr.toString("utf8")).toBe(0)
			const grain = exportOrgSource(source, { format: "html" })
			if (grain.kind !== "output") throw new Error(grain.message)
			for (const token of ["NEVER-EXECUTE-TOKEN", "existing-result-token"]) {
				const included = token === "NEVER-EXECUTE-TOKEN" ? selection === "code" || selection === "both" : selection === "results" || selection === "both"
				expect(native.stdout.toString("utf8").includes(token), `${selection}: GNU ${token}`).toBe(included)
				expect(grain.content.includes(token), `${selection}: Grain ${token}`).toBe(included)
			}
		}
	}, 35000)

	it("matches generated diary configuration removal, disabled scripts and numeric TOC depth", () => {
		const source = `${planOrgDiary(new Date(2026, 9, 10, 11), "owned-oracle").content}x^2\n#+OPTIONS: toc:2\n** second-depth-token\n*** third-depth-token\n`
		const native = exportOwnedFixture(source)
		expect(native.error).toBeUndefined()
		expect(native.status, native.stderr.toString("utf8")).toBe(0)
		const grain = exportOrgSource(source, { format: "html" })
		if (grain.kind !== "output") throw new Error(grain.message)
		for (const content of [native.stdout.toString("utf8"), grain.content]) {
			expect(content).not.toContain("#+OPTIONS:")
			expect(content).toContain("x^2")
			const toc = content.slice(content.indexOf("<nav"), content.indexOf("</nav>"))
			expect(toc).toContain("second-depth-token")
			expect(toc).not.toContain("third-depth-token")
		}
	}, 35000)
})
