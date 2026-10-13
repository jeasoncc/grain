import { describe, expect, it } from "vitest"
import { parseOrgTableAt, planOrgTableEdit, planOrgTableNavigation, type OrgTableOperation, type OrgSourceTable, type OrgTableNavigation } from "./org-table.pipe"
import type { OrgTextEditBatch } from "./org-text.pipe"

interface AppliedTableEdit {
	readonly content: string
	readonly cursor: number
	readonly table: OrgSourceTable
	readonly batch: OrgTextEditBatch
}

const apply = (source: string, cursor: number, operation: OrgTableOperation): AppliedTableEdit => {
	const result = planOrgTableEdit(source, cursor, operation)
	expect(result.kind).toBe("edit")
	if (result.kind !== "edit") throw new Error(`Expected an edit, got ${result.kind}`)
	expect(result.batch.changes).toHaveLength(1)
	const change = result.batch.changes[0]
	expect(change.from).toBeGreaterThanOrEqual(0)
	expect(change.to).toBeGreaterThanOrEqual(change.from)
	expect(change.to).toBeLessThanOrEqual(source.length)
	const content = source.slice(0, change.from) + change.insert + source.slice(change.to)
	expect(content.slice(0, change.from)).toBe(source.slice(0, change.from))
	expect(content.slice(change.from + change.insert.length)).toBe(source.slice(change.to))
	expect(result.batch.cursor).toBeGreaterThanOrEqual(change.from)
	expect(result.batch.cursor).toBeLessThanOrEqual(change.from + change.insert.length)
	const parsed = parseOrgTableAt(content, result.batch.cursor)
	if (parsed.kind !== "table") throw new Error(parsed.message)
	return { content, cursor: result.batch.cursor, table: parsed.table, batch: result.batch }
}

const values = (source: string, cursor = source.indexOf("|")) => {
	const parsed = parseOrgTableAt(source, cursor)
	if (parsed.kind !== "table") throw new Error(parsed.message)
	return parsed.table.rows.filter((row) => row.kind === "data").map((row) => row.cells.map((cell) => cell.text))
}

const selectedValue = (result: AppliedTableEdit) => result.table.rows[result.table.selectedRow].cells[result.table.selectedColumn].text

const basic = "| a | b | c |\n| d | e | f |\n| g | h | i |"

describe("atomic Org source table edits", () => {
	it("aligns Unicode graphemes, empty cells, escaped bars and mixed EOLs without touching outside bytes", () => {
		const prefix = "outside\u0000\r\n"
		const body = `\t|界|e\u0301| |\r\n  |a|👩‍💻|x|\r |a\\|b|z| |  `
		const suffix = "\nopaque\u0000\rrest"
		const source = prefix + body + suffix
		const result = apply(source, source.indexOf("e\u0301"), { kind: "align" })
		expect(result.content).toBe(`${prefix}\t| 界   | e\u0301  |   |\r\n  | a    | 👩‍💻 | x |\r | a\\|b | z  |   |  ${suffix}`)
		expect(values(result.content, prefix.length)).toEqual(values(source, prefix.length))
		expect(selectedValue(result)).toBe("e\u0301")
		expect(result.content[result.cursor]).toBe("e")
		expect(planOrgTableEdit(result.content, result.cursor, { kind: "align" })).toEqual({ kind: "unchanged" })
	})

	it("distinguishes text symbols from emoji presentation and combines flags/keycaps into two display columns", () => {
		const source = "|©|🇨🇳|\n|©️|1️⃣|"
		const result = apply(source, source.indexOf("©"), { kind: "align" })
		expect(result.content).toBe("| ©  | 🇨🇳 |\n| ©️ | 1️⃣ |")
		expect(values(result.content)).toEqual(values(source))
	})

	it("parses exact raw value ranges and odd/even backslashes without turning escaped bars into columns", () => {
		const source = String.raw`| a\|b | slash\\ |  |`
		const parsed = parseOrgTableAt(source, source.indexOf("b"))
		expect(parsed.kind).toBe("table")
		if (parsed.kind !== "table") throw new Error(parsed.message)
		expect(parsed.table.columns).toBe(3)
		expect(parsed.table.rows[0].cells.map((cell) => source.slice(cell.from, cell.to))).toEqual([String.raw`a\|b`, String.raw`slash\\`, ""])
		expect(values(source)).toEqual([["a|b", "slash\\", ""]])
		expect(parsed.table.selectedColumn).toBe(0)
	})

	it.each([-1, 1] as const)("inserts a row on side %s and selects the new empty cell", (direction) => {
		const result = apply(basic, basic.indexOf("e"), { kind: "insert-row", direction })
		const expected = [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]]
		expected.splice(direction === -1 ? 1 : 2, 0, ["", "", ""])
		expect(values(result.content)).toEqual(expected)
		expect(selectedValue(result)).toBe("")
		expect(result.table.selectedColumn).toBe(1)
		expect(result.content.endsWith("\n")).toBe(false)
	})

	it.each([-1, 1] as const)("moves a row on side %s, preserving its selected value and physical EOL slots", (direction) => {
		const source = basic.replace("\n", "\r\n").replace(/\n\| g/, "\r| g")
		const result = apply(source, source.indexOf("e"), { kind: "move-row", direction })
		const expected = [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]]
		;[expected[1], expected[1 + direction]] = [expected[1 + direction], expected[1]]
		expect(values(result.content)).toEqual(expected)
		expect(selectedValue(result)).toBe("e")
		expect(result.content.match(/\r\n|\r|\n/g)).toEqual(source.match(/\r\n|\r|\n/g))
	})

	it("deletes a row and maps an EOF cursor to a surviving data cell", () => {
		const result = apply(basic, basic.length, { kind: "delete-row" })
		expect(values(result.content)).toEqual([["a", "b", "c"], ["d", "e", "f"]])
		expect(selectedValue(result)).toBe("f")
	})

	it.each([-1, 1] as const)("inserts a column on side %s through header separators", (direction) => {
		const source = " | a | b |\r\n |---+---|\r | c | d |"
		const result = apply(source, source.indexOf("b"), { kind: "insert-column", direction })
		const expected = [["a", "b"], ["c", "d"]]
		for (const row of expected) row.splice(direction === -1 ? 1 : 2, 0, "")
		expect(values(result.content)).toEqual(expected)
		expect(result.table.rows[1].kind).toBe("separator")
		expect(result.table.rows[1].cells).toHaveLength(3)
		expect(selectedValue(result)).toBe("")
	})

	it.each([-1, 1] as const)("moves a column on side %s and selects the moved cell", (direction) => {
		const result = apply(basic, basic.indexOf("e"), { kind: "move-column", direction })
		const expected = [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]]
		for (const row of expected) [row[1], row[1 + direction]] = [row[1 + direction], row[1]]
		expect(values(result.content)).toEqual(expected)
		expect(selectedValue(result)).toBe("e")
	})

	it("deletes a selected column even from a separator and remaps to a real surviving column", () => {
		const source = "| a | b | c |\n|---+---+---|\n| d | e | f |"
		const result = apply(source, source.indexOf("+---") + 2, { kind: "delete-column" })
		expect(values(result.content)).toEqual([["a", "c"], ["d", "f"]])
		expect(result.table.rows[1].kind).toBe("separator")
		expect(result.table.columns).toBe(2)
		expect(result.table.selectedColumn).toBe(1)
	})

	it("transposes a rectangular table and back without losing empty or escaped content", () => {
		const source = String.raw`| a\|b | | 界 |` + "\r\n" + String.raw`| slash\\ | é | 👨‍👩‍👧‍👦 |`
		const first = apply(source, source.indexOf("界"), { kind: "transpose" })
		expect(values(first.content)).toEqual([["a|b", "slash\\"], ["", "é"], ["界", "👨‍👩‍👧‍👦"]])
		expect(selectedValue(first)).toBe("界")
		const second = apply(first.content, first.cursor, { kind: "transpose" })
		expect(values(second.content)).toEqual(values(source))
		expect(second.table.rows.flatMap((row) => row.cells.map((cell) => cell.raw))).toEqual([String.raw`a\|b`, "", "界", String.raw`slash\\`, "é", "👨‍👩‍👧‍👦"])
		expect(second.content.endsWith("\n")).toBe(false)
	})

	it("inserts literal cell text without treating pipes/backslashes as source delimiters", () => {
		const literal = String.raw`left\|right\\tail`
		const source = "before\u0000\r| old | other |\r\nafter\u0000"
		const result = apply(source, source.indexOf("old"), { kind: "edit-cell", text: literal })
		expect(values(result.content, source.indexOf("|"))).toEqual([[literal, "other"]])
		expect(selectedValue(result)).toBe(literal)
		expect(result.cursor).toBe(result.table.rows[0].cells[0].to)
	})

	it("keeps header separators and selection while aligning and rejects semantic header moves/transpose", () => {
		const source = "| head | x |\n|--+--|\n| body | value |"
		const result = apply(source, source.indexOf("--"), { kind: "align" })
		expect(result.table.rows.map((row) => row.kind)).toEqual(["data", "separator", "data"])
		expect(planOrgTableEdit(source, source.indexOf("head"), { kind: "move-row", direction: 1 })).toMatchObject({ kind: "rejected" })
		expect(planOrgTableEdit(source, source.indexOf("body"), { kind: "move-row", direction: -1 })).toMatchObject({ kind: "rejected" })
		expect(planOrgTableEdit(source, 0, { kind: "transpose" })).toMatchObject({ kind: "rejected" })
	})

	it("treats moving beyond a table boundary as unchanged", () => {
		expect(planOrgTableEdit(basic, basic.indexOf("a"), { kind: "move-row", direction: -1 })).toEqual({ kind: "unchanged" })
		expect(planOrgTableEdit(basic, basic.indexOf("i"), { kind: "move-column", direction: 1 })).toEqual({ kind: "unchanged" })
	})
})

describe("Org table formula ownership and remapping", () => {
	it("returns source-ranged metadata and remaps real references but not strings or numeric function arguments", () => {
		const formula = '#+TBLFM: $2=concat("$2 @2$1 \\\"quoted\\\"",if(@2$1,12,34))::@3$3=$1\r\n'
		const source = basic + "\r" + formula + "outside\u0000"
		const parsed = parseOrgTableAt(source, source.indexOf("e"))
		if (parsed.kind !== "table") throw new Error(parsed.message)
		expect(parsed.table.formulas[0].references.map((reference) => source.slice(reference.from, reference.to))).toEqual(["$2", "@2$1", "@3$3", "$1"])
		expect(parsed.table.formulas[0].expression).toBe(formula.slice("#+TBLFM: ".length, -2))
		const inserted = apply(source, source.indexOf("e"), { kind: "insert-column", direction: -1 })
		expect(inserted.content).toContain('#+TBLFM: $3=concat("$2 @2$1 \\\"quoted\\\"",if(@2$1,12,34))::@3$4=$1\r\n')
		expect(inserted.content.endsWith("outside\u0000")).toBe(true)
	})

	it("numbers data rows independently of separator rows and remaps multiple formula lines atomically", () => {
		const source = "| h | n |\r\n|---+---|\n| a | 1 |\r| b | 2 |\n#+TBLFM: @2$2=@3$2\r\n  #+tblfm: $2=@2$1\rTAIL"
		const result = apply(source, source.indexOf("a |"), { kind: "insert-row", direction: -1 })
		expect(result.content).toContain("#+TBLFM: @3$2=@4$2\r\n  #+tblfm: $2=@3$1\rTAIL")
		expect(result.batch.changes).toHaveLength(1)
		expect(result.table.formulas).toHaveLength(2)
	})

	it("remaps surviving references after deletion and rejects deleting a referenced axis", () => {
		const source = basic + "\n#+TBLFM: @3$3=@3$1"
		const removed = apply(source, source.indexOf("e"), { kind: "delete-row" })
		expect(removed.content).toContain("#+TBLFM: @2$3=@2$1")
		const column = apply(source, source.indexOf("e"), { kind: "delete-column" })
		expect(column.content).toContain("#+TBLFM: @3$2=@3$1")
		expect(planOrgTableEdit(source, source.indexOf("i"), { kind: "delete-row" })).toMatchObject({ kind: "rejected" })
		expect(planOrgTableEdit(source, source.indexOf("i"), { kind: "delete-column" })).toMatchObject({ kind: "rejected" })
	})

	it("moves absolute targets and dependencies with their cells, and swaps axes on transpose", () => {
		const source = basic + "\n#+TBLFM: @2$2=@3$1::$3=@1$2"
		const row = apply(source, source.indexOf("e"), { kind: "move-row", direction: -1 })
		expect(row.content).toContain("#+TBLFM: @1$2=@3$1::$3=@2$2")
		const column = apply(source, source.indexOf("e"), { kind: "move-column", direction: 1 })
		expect(column.content).toContain("#+TBLFM: @2$3=@3$1::$2=@1$3")
		const transposed = apply(source, source.indexOf("e"), { kind: "transpose" })
		expect(transposed.content).toContain("#+TBLFM: @2$2=@1$3::@3=@2$1")
	})

	it("remaps absolute range endpoints on insertion while rejecting ambiguous range moves", () => {
		const source = basic + "\n#+TBLFM: $3=vsum(@1$2..@3$2)"
		const result = apply(source, source.indexOf("e"), { kind: "insert-row", direction: -1 })
		expect(result.content).toContain("#+TBLFM: $3=vsum(@1$2..@4$2)")
		expect(planOrgTableEdit(source, source.indexOf("e"), { kind: "move-row", direction: 1 })).toMatchObject({ kind: "rejected" })
		const quoted = basic + '\n#+TBLFM: $3=concat("@1..@3",@2$2)'
		expect(apply(quoted, quoted.indexOf("e"), { kind: "move-row", direction: 1 }).content).toContain('#+TBLFM: $3=concat("@1..@3",@3$2)')
	})

	it.each([
		"$2=@+1$1", "$2=$name", "$2=@I$1", '$2=remote("other",@1$1)',
		"$2='(progn (message \"never execute\") $1)", "$2=@999$1", "$2=concat(\"unclosed)", "$2=if(@1$1,2", "$2",
		"$2=vsum(@1..3)", "$2=vsum(@1..$2)", "$2=@1$1\u0000",
	])("retains opaque formula %s for cell/alignment edits but rejects unsafe structural remapping", (formula) => {
		const source = "|a|b|\n|c|d|\n#+TBLFM: " + formula
		expect(apply(source, source.indexOf("a"), { kind: "align" }).content).toContain("#+TBLFM: " + formula)
		expect(apply(source, source.indexOf("a"), { kind: "edit-cell", text: "new" }).content).toContain("#+TBLFM: " + formula)
		expect(planOrgTableEdit(source, source.indexOf("a"), { kind: "insert-column", direction: 1 })).toMatchObject({ kind: "rejected" })
	})

	it("allows a formula-line cursor to address its owning table, but never crosses a blank line", () => {
		const source = "|a|b|\n#+TBLFM: $2=$1"
		const result = apply(source, source.indexOf("TBLFM"), { kind: "align" })
		expect(values(result.content)).toEqual([["a", "b"]])
		expect(parseOrgTableAt("|a|b|\n\n#+TBLFM: $2=$1", 12)).toMatchObject({ kind: "rejected" })
	})
})

describe("visible conservative table rejections", () => {
	it.each([
		"| a | b", "|a|b|\n|c|", "|a|b|\n|---+---+---|", "|---+---|", "|a\u0000|b|", "|a\tb|c|", "|a|b|\n|-+- +--|",
	])("rejects malformed or ambiguous source %s without producing a batch", (source) => {
		expect(planOrgTableEdit(source, 0, { kind: "align" })).toMatchObject({ kind: "rejected" })
	})

	it.each([
		"#+begin_src text\r\n|a|b|\r\n#+end_src\n",
		"#+begin_example\n|a|b|\n",
		":PROPERTIES:\r|a|b|\r:END:\r",
		":DRAWER:\n|a|b|",
	])("excludes literal block/drawer table lookalikes", (source) => {
		expect(planOrgTableEdit(source, source.indexOf("a|"), { kind: "align" })).toMatchObject({ kind: "rejected" })
	})

	it("rejects deleting the final row/column, separator cell edits and unsafe literal values", () => {
		expect(planOrgTableEdit("| a |", 2, { kind: "delete-row" })).toMatchObject({ kind: "rejected" })
		expect(planOrgTableEdit("| a |", 2, { kind: "delete-column" })).toMatchObject({ kind: "rejected" })
		const source = "| a | b |\n|---+---|"
		expect(planOrgTableEdit(source, source.indexOf("---"), { kind: "edit-cell", text: "x" })).toMatchObject({ kind: "rejected" })
		for (const text of ["\n", "\r", "\u0000", "\t", " leading", "trailing "]) expect(planOrgTableEdit(source, 2, { kind: "edit-cell", text })).toMatchObject({ kind: "rejected" })
		for (const cursor of [-1, basic.length + 1, Number.NaN, 1.5]) expect(planOrgTableEdit(basic, cursor, { kind: "align" })).toMatchObject({ kind: "rejected" })
	})
})

describe("canonical table field navigation", () => {
	const navigate = (source: string, cursor: number, direction: OrgTableNavigation) => {
		const result = planOrgTableNavigation(source, cursor, direction)
		if (result.kind !== "edit") throw new Error(result.kind === "rejected" ? result.message : "Expected navigation")
		let content = source
		for (const change of [...result.batch.changes].reverse()) content = content.slice(0, change.from) + change.insert + content.slice(change.to)
		const parsed = parseOrgTableAt(content, result.batch.cursor)
		if (parsed.kind !== "table") throw new Error(parsed.message)
		return { content, batch: result.batch, value: parsed.table.rows[parsed.table.selectedRow].cells[parsed.table.selectedColumn].text }
	}
	it("aligns Tab fields and skips separators on row transitions without changing formula/raw outer text", () => {
		const source = "outer\0\r\n|😀|2|\r\n|---+---|\r\n|3|long|\r\n#+TBLFM: $2=$1\r\nend\0"
		const next = navigate(source, source.indexOf("😀"), "next-field")
		expect(next.value).toBe("2")
		expect(next.content.startsWith("outer\0\r\n")).toBe(true)
		expect(next.content.endsWith("#+TBLFM: $2=$1\r\nend\0")).toBe(true)
		expect(navigate(next.content, next.batch.cursor, "next-field").value).toBe("3")
		expect(navigate(next.content, next.batch.cursor, "next-row").value).toBe("long")
		expect(next.batch.requiredVisibleRanges).toEqual([{ from: source.indexOf("|"), to: source.indexOf("\r\nend") }])
	})
	it("Shift-Tab moves backward without folds/history changes when already aligned", () => {
		const source = "| a | b |\n| c | d |"
		const next = navigate(source, source.indexOf("c"), "previous-field")
		expect(next.value).toBe("b")
		expect(next.content).toBe(source)
		expect(next.batch.changes).toEqual([])
		expect(navigate(source, source.indexOf("a"), "previous-field").value).toBe("a")
	})
	it.each(["next-field", "next-row"] as const)("extends the final data row for %s with one aligned/remapped batch and preserved CRLF", navigation => {
		const source = "| 2 | 3 | |\r\n#+TBLFM: @1$3=$1+$2\r\noutside\0"
		const next = navigate(source, source.indexOf("| |\r\n") + 2, navigation)
		expect(next.value).toBe("")
		expect(values(next.content)).toEqual([["2", "3", ""], ["", "", ""]])
		expect(next.batch.changes).toHaveLength(1)
		expect(next.content.endsWith("#+TBLFM: @1$3=$1+$2\r\noutside\0")).toBe(true)
		expect(next.content.match(/\r\n/g)).toHaveLength(3)
	})
	it("retains opaque formulas during field motion but rejects unsafe remapping when a row must be created", () => {
		const source = "| a | b |\n#+TBLFM: $2=remote(other,$1)"
		expect(navigate(source, source.indexOf("a"), "next-field").value).toBe("b")
		expect(planOrgTableNavigation(source, source.indexOf("b"), "next-field")).toMatchObject({ kind: "rejected" })
		for (const source of ["#+begin_src text\n| a | b |\n#+end_src", ":PROPERTIES:\n| a | b |\n:END:", "| a | b", "| a | b |\n| c |"])
			expect(planOrgTableNavigation(source, source.indexOf("|"), "next-field")).toMatchObject({ kind: "rejected" })
	})
})
