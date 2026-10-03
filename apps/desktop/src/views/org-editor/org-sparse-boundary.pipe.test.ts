import { describe, expect, it } from "vitest"
import { safeOrgSparseBoundaryChange } from "./org-sparse-boundary.pipe"

describe("owned raw sparse boundaries", () => {
	it.each(["\r\n", "\n", "\r"])("requires the complete actual %j separator", (separator) => {
		const prefix = "* Target\r\nbody" + separator
		const source = prefix + "* Hidden\r\nbytes\0"
		const from = prefix.length - separator.length
		expect(safeOrgSparseBoundaryChange(source, from, prefix.length, separator + "** Move\n")).toBe(
			true,
		)
		expect(safeOrgSparseBoundaryChange(source, from, prefix.length, "\nx\n")).toBe(
			separator === "\n",
		)
		if (separator === "\r\n")
			expect(safeOrgSparseBoundaryChange(source, from + 1, prefix.length, "\nx\n")).toBe(false)
		expect(safeOrgSparseBoundaryChange(source, from, prefix.length, "")).toBe(false)
	})
	it("permits real subtree deletion, never body deletion that merges a hidden heading", () => {
		const source = "* Keep\nbody\n* Move\ntext\n* Hidden\nraw"
		const to = source.indexOf("* Hidden")
		expect(safeOrgSparseBoundaryChange(source, source.indexOf("* Move"), to, "")).toBe(true)
		expect(safeOrgSparseBoundaryChange(source, source.indexOf("text"), to, "")).toBe(false)
		expect(safeOrgSparseBoundaryChange(source, source.indexOf("Move"), to, "")).toBe(false)
	})
})
