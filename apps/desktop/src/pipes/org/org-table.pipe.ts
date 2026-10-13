import { structuralOrgSourceLines, type OrgTextEditBatch, type RawOrgLine } from "./org-text.pipe"

export type OrgTableOperation =
	| { readonly kind: "align" | "delete-row" | "delete-column" | "transpose" }
	| { readonly kind: "insert-row" | "move-row" | "insert-column" | "move-column"; readonly direction: -1 | 1 }
	| { readonly kind: "edit-cell"; readonly text: string }

export interface OrgTableCell {
	/** Raw source range of the value, excluding horizontal padding and delimiters. */
	readonly from: number
	readonly to: number
	readonly raw: string
	/** Literal value: only escaped backslashes and bars are decoded. */
	readonly text: string
}

export interface OrgTableRow {
	readonly line: RawOrgLine
	readonly indentation: string
	readonly suffix: string
	readonly ending: string
	readonly kind: "data" | "separator"
	readonly cells: readonly OrgTableCell[]
	readonly delimiters: readonly number[]
}

export interface OrgTableFormulaReference {
	readonly from: number
	readonly to: number
	readonly raw: string
	readonly row?: number
	readonly column?: number
}

export interface OrgTableFormula {
	readonly line: RawOrgLine
	readonly expression: string
	readonly expressionFrom: number
	readonly ending: string
	/** Absolute references outside strings, in raw source coordinates. Never executed here. */
	readonly references: readonly OrgTableFormulaReference[]
	readonly remappingRejection?: string
}

export interface OrgSourceTable {
	readonly from: number
	readonly to: number
	readonly rows: readonly OrgTableRow[]
	readonly columns: number
	readonly selectedRow: number
	readonly selectedColumn: number
	readonly formulas: readonly OrgTableFormula[]
}

export type OrgTableParseResult =
	| { readonly kind: "table"; readonly table: OrgSourceTable }
	| { readonly kind: "rejected"; readonly message: string }

export type OrgTableEditResult =
	| { readonly kind: "edit"; readonly batch: OrgTextEditBatch }
	| { readonly kind: "unchanged" }
	| { readonly kind: "rejected"; readonly message: string }

const rejected = (message: string): { kind: "rejected"; message: string } => ({ kind: "rejected", message })
const trimPadding = (value: string): string => value.replace(/^[ \t]+|[ \t]+$/g, "")
const tableLike = (line: RawOrgLine): boolean => /^[ \t]*\|/.test(line.text)
const formulaLike = (line: RawOrgLine): boolean => /^[ \t]*#\+TBLFM:/i.test(line.text)
const decodeCell = (raw: string): string => raw.replace(/\\([\\|])/g, "$1")
const encodeCell = (text: string): string => text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|")

/**
 * Supported source grammar: contiguous, rectangular, closed pipe rows; horizontal
 * padding; odd-backslash escaped bars; separator rows |---+---|. Indentation and
 * trailing padding may differ by row. Attached consecutive #+TBLFM lines are owned
 * by the table. Literal blocks/drawers are excluded by the shared source scanner.
 * Ragged/open rows, non-dash separators and control characters inside values are
 * rejected. Padding is presentation, not value content; no other value bytes are
 * normalized by alignment/structural edits. Transpose rejects horizontal separators
 * because Org has no equivalent vertical header separator.
 */
const parseRow = (source: string, line: RawOrgLine): OrgTableRow | null => {
	const indentation = /^[ \t]*/.exec(line.text)?.[0] ?? ""
	const suffix = /[ \t]*$/.exec(line.text)?.[0] ?? ""
	const body = line.text.slice(indentation.length, line.text.length - suffix.length)
	const delimiters: number[] = []
	let backslashes = 0
	for (let index = 0; index < body.length; index++) {
		const character = body[index]
		if (character === "|" && backslashes % 2 === 0) delimiters.push(index)
		backslashes = character === "\\" ? backslashes + 1 : 0
	}
	if (delimiters[0] !== 0 || delimiters.at(-1) !== body.length - 1 || delimiters.length < 2) return null
	const inside = body.slice(1, -1)
	const separator = /^-+(?:\+-+)*$/.test(inside)
	const boundaries = separator
		? [0, ...Array.from(inside.matchAll(/\+/g), (match) => match.index + 1), body.length - 1]
		: delimiters
	const cells: OrgTableCell[] = []
	for (let index = 0; index < boundaries.length - 1; index++) {
		const segment = body.slice(boundaries[index] + 1, boundaries[index + 1])
		const raw = separator ? "" : trimPadding(segment)
		if (/[\u0000-\u001f\u007f]/.test(raw)) return null
		const padding = separator ? 0 : (/^[ \t]*/.exec(segment)?.[0].length ?? 0)
		const from = line.from + indentation.length + boundaries[index] + 1 + padding
		cells.push({ from, to: from + raw.length, raw, text: decodeCell(raw) })
	}
	// A dash/plus-only row that almost looks like a separator is ambiguous.
	if (!separator && /^[\s+\-]+$/.test(inside) && inside.includes("+")) return null
	return {
		line, indentation, suffix, kind: separator ? "separator" : "data", cells,
		delimiters: boundaries.map((offset) => line.from + indentation.length + offset),
		ending: source.slice(line.contentTo, line.breakTo),
	}
}

/**
 * Formula metadata is lexical, not executable. Safe remapping supports absolute
 * @N, $N and @N$N tokens and ranges outside double-quoted strings. Quoted strings,
 * numeric/function arguments and names are never searched-and-replaced. Relative,
 * named, separator, remote-table and Lisp references are retained but reject a
 * structural edit. Unbalanced quotes/brackets and missing assignments also reject
 * structural edits. Align/edit-cell can retain opaque formulas verbatim.
 */
const parseFormula = (source: string, line: RawOrgLine): OrgTableFormula => {
	const prefix = /^[ \t]*#\+TBLFM:[ \t]*/i.exec(line.text)?.[0] ?? ""
	const expression = line.text.slice(prefix.length)
	const expressionFrom = line.from + prefix.length
	const references: OrgTableFormulaReference[] = []
	let reason: string | undefined
	let quoted = false
	let escaped = false
	let masked = ""
	const brackets: string[] = []
	for (let index = 0; index < expression.length; index++) {
		const character = expression[index]
		if (quoted) {
			masked += " "
			if (!escaped && character === '"') quoted = false
			escaped = !escaped && character === "\\"
			continue
		}
		if (character === '"') { quoted = true; masked += " "; continue }
		masked += character
		if (character === "'" || character === "`") reason = "Lisp/quoted formula code cannot be remapped safely."
		if (character === "(" || character === "[") brackets.push(character)
		if (character === ")" || character === "]") {
			if (brackets.pop() !== (character === ")" ? "(" : "[")) reason = "Formula brackets are unbalanced."
		}
		if (character !== "@" && character !== "$") continue
		const token = /^(?:@([1-9]\d*)(?:\$([1-9]\d*))?|\$([1-9]\d*))/.exec(expression.slice(index))
		const before = expression[index - 1] ?? ""
		const after = token ? expression[index + token[0].length] ?? "" : ""
		if (!token || /[\w@$]/.test(before) || /[\w@$]/.test(after)) {
			reason = "Only standalone absolute numeric table references can be remapped."
			continue
		}
		const row = token[1] ? Number(token[1]) : undefined
		const column = token[2] || token[3] ? Number(token[2] ?? token[3]) : undefined
		if ((row !== undefined && !Number.isSafeInteger(row)) || (column !== undefined && !Number.isSafeInteger(column))) {
			reason = "A formula reference is outside the supported integer range."
		}
		references.push({ from: expressionFrom + index, to: expressionFrom + index + token[0].length, raw: token[0], row, column })
		masked += " ".repeat(token[0].length - 1)
		index += token[0].length - 1
	}
	for (const range of masked.matchAll(/\.\./g)) {
		const position = expressionFrom + range.index
		const left = references.findLast((reference) => reference.to <= position)
		const right = references.find((reference) => reference.from >= position + 2)
		if (!left || !right || !/^[ \t]*\.\.[ \t]*$/.test(source.slice(left.to, right.from)) ||
			(left.row === undefined) !== (right.row === undefined) || (left.column === undefined) !== (right.column === undefined)) {
			reason = "Formula ranges require two absolute references with matching axes."
		}
	}
	if (quoted || brackets.length) reason = "Formula quotes or brackets are unbalanced."
	if (/\bremote\s*\(/i.test(masked)) reason = "Remote table formulas cannot be remapped locally."
	if (!masked.includes("=")) reason = "A table formula must contain an assignment."
	if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(expression)) reason = "Formula control characters cannot be remapped safely."
	return { line, expression, expressionFrom, references, remappingRejection: reason, ending: source.slice(line.contentTo, line.breakTo) }
}

export const parseOrgTableAt = (source: string, cursor: number): OrgTableParseResult => {
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length) return rejected("The table cursor is outside the source.")
	const lines = structuralOrgSourceLines(source)
	let selected = lines.findIndex((line) => cursor >= line.from && (cursor < line.breakTo || (cursor === line.contentTo && line.breakTo === line.contentTo)))
	if (selected < 0) return rejected("The cursor is not in an eligible Org table.")
	if (formulaLike(lines[selected])) {
		while (selected > 0 && formulaLike(lines[selected]) && lines[selected - 1].breakTo === lines[selected].from) selected--
	}
	if (!tableLike(lines[selected])) return rejected("The cursor is not in an eligible Org table.")
	let first = selected
	let last = selected
	while (first > 0 && tableLike(lines[first - 1]) && lines[first - 1].breakTo === lines[first].from) first--
	while (last + 1 < lines.length && tableLike(lines[last + 1]) && lines[last].breakTo === lines[last + 1].from) last++
	const rows: OrgTableRow[] = []
	for (let index = first; index <= last; index++) {
		const row = parseRow(source, lines[index])
		if (!row) return rejected("The table has an open, malformed, or control-character row.")
		rows.push(row)
	}
	const columns = rows[0].cells.length
	if (rows.some((row) => row.cells.length !== columns) || rows.every((row) => row.kind === "separator")) return rejected("The table must be rectangular and contain a data row.")
	const formulas: OrgTableFormula[] = []
	let end = last
	while (end + 1 < lines.length && formulaLike(lines[end + 1]) && lines[end].breakTo === lines[end + 1].from) {
		end++
		formulas.push(parseFormula(source, lines[end]))
	}
	const selectedRow = selected - first
	const boundary = rows[selectedRow].delimiters.findIndex((position, index) => index > 0 && cursor <= position)
	const selectedColumn = boundary === -1 ? columns - 1 : Math.max(0, boundary - 1)
	return { kind: "table", table: { from: rows[0].line.from, to: lines[end].contentTo, rows, columns, selectedRow, selectedColumn, formulas } }
}

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" })
/** Terminal-style width: combining sequences zero extra columns, CJK/emoji two. */
const displayWidth = (text: string): number => {
	let width = 0
	for (const { segment } of graphemes.segment(text)) {
		if (/^[\p{Mark}\u200b-\u200f\u202a-\u202e\u2060-\u206f]+$/u.test(segment)) continue
		const point = segment.codePointAt(0) ?? 0
		const wide = point >= 0x1100 && (point <= 0x115f || point === 0x2329 || point === 0x232a || (point >= 0x2e80 && point <= 0xa4cf && point !== 0x303f) || (point >= 0xac00 && point <= 0xd7a3) || (point >= 0xf900 && point <= 0xfaff) || (point >= 0xfe10 && point <= 0xfe19) || (point >= 0xfe30 && point <= 0xfe6f) || (point >= 0xff00 && point <= 0xff60) || (point >= 0xffe0 && point <= 0xffe6) || (point >= 0x20000 && point <= 0x3fffd))
		const emoji = /\p{Emoji_Presentation}|\p{Regional_Indicator}|\u20e3/u.test(segment) || (segment.includes("\ufe0f") && /\p{Extended_Pictographic}/u.test(segment))
		width += wide || emoji ? 2 : 1
	}
	return width
}

interface WorkingRow {
	kind: "data" | "separator"
	values: string[]
	indentation: string
	suffix: string
	ending: string
}

const remapFormulas = (
	source: string, table: OrgSourceTable, rowMap: readonly (number | null)[], columnMap: readonly (number | null)[], transpose: boolean, moving: boolean,
): { kind: "formulas"; texts: string[] } | { kind: "rejected"; message: string } => {
	const texts: string[] = []
	for (const formula of table.formulas) {
		if (formula.remappingRejection) return rejected(formula.remappingRejection)
		// Reordering endpoints can change range membership, even when both survive.
		const hasRange = formula.references.some((reference, index) => index > 0 && /^[ \t]*\.\.[ \t]*$/.test(source.slice(formula.references[index - 1].to, reference.from)))
		if (moving && hasRange) return rejected("Moving rows/columns with formula ranges is ambiguous.")
		let text = formula.line.text
		for (const reference of [...formula.references].reverse()) {
			const row = reference.row === undefined ? undefined : rowMap[reference.row - 1]
			const column = reference.column === undefined ? undefined : columnMap[reference.column - 1]
			if ((reference.row !== undefined && row == null) || (reference.column !== undefined && column == null)) return rejected("A formula references a deleted or out-of-range row/column.")
			const nextRow = transpose ? column : row
			const nextColumn = transpose ? row : column
			const replacement = `${nextRow === undefined ? "" : `@${nextRow}`}${nextColumn === undefined ? "" : `$${nextColumn}`}`
			const from = reference.from - formula.line.from
			const to = reference.to - formula.line.from
			text = text.slice(0, from) + replacement + text.slice(to)
		}
		texts.push(text)
	}
	return { kind: "formulas", texts }
}

/** Plans exactly one atomic replacement; never evaluates formulas or touches outside source. */
export const planOrgTableEdit = (source: string, cursor: number, operation: OrgTableOperation): OrgTableEditResult => {
	const parsed = parseOrgTableAt(source, cursor)
	if (parsed.kind === "rejected") return parsed
	const table = parsed.table
	const rows: WorkingRow[] = table.rows.map((row) => ({ kind: row.kind, values: row.cells.map((cell) => cell.raw), indentation: row.indentation, suffix: row.suffix, ending: row.ending }))
	let selectedRow = table.selectedRow
	let selectedColumn = table.selectedColumn
	const dataIndices = table.rows.flatMap((row, index) => row.kind === "data" ? [index] : [])
	const rowMap: (number | null)[] = dataIndices.map((_, index) => index + 1)
	const columnMap: (number | null)[] = Array.from({ length: table.columns }, (_, index) => index + 1)
	const originalCell = table.rows[selectedRow].cells[selectedColumn]
	let offset = Math.max(0, Math.min(cursor - originalCell.from, originalCell.raw.length))
	const direction = "direction" in operation ? operation.direction : 1
	if (direction !== -1 && direction !== 1) return rejected("A table direction must be -1 or 1.")
	const rowOperation = operation.kind === "insert-row" || operation.kind === "delete-row" || operation.kind === "move-row" || operation.kind === "edit-cell"
	if (rowOperation && rows[selectedRow].kind === "separator") return rejected("Select a data cell rather than a header separator.")
	const structural = operation.kind !== "align" && operation.kind !== "edit-cell"
	let transposed = false
	switch (operation.kind) {
		case "align": break
		case "edit-cell":
			if (typeof operation.text !== "string" || /[\u0000-\u001f\u007f]/.test(operation.text)) return rejected("A literal cell cannot contain newlines, tabs, or control characters.")
			if (operation.text !== trimPadding(operation.text)) return rejected("Leading/trailing cell spaces are ambiguous with Org padding.")
			rows[selectedRow].values[selectedColumn] = encodeCell(operation.text)
			offset = rows[selectedRow].values[selectedColumn].length
			break
		case "insert-row": {
			const physical = selectedRow + (direction === 1 ? 1 : 0)
			const ordinal = dataIndices.indexOf(selectedRow) + (direction === 1 ? 1 : 0)
			rows.splice(physical, 0, { ...rows[selectedRow], values: Array(table.columns).fill("") })
			for (let index = ordinal; index < rowMap.length; index++) rowMap[index] = index + 2
			selectedRow = physical
			offset = 0
			break
		}
		case "delete-row": {
			if (dataIndices.length === 1) return rejected("Cannot delete the last data row.")
			const ordinal = dataIndices.indexOf(selectedRow)
			rowMap[ordinal] = null
			for (let index = ordinal + 1; index < rowMap.length; index++) rowMap[index] = index
			rows.splice(selectedRow, 1)
			selectedRow = Math.min(selectedRow, rows.length - 1)
			while (rows[selectedRow].kind === "separator" && selectedRow > 0) selectedRow--
			if (rows[selectedRow].kind === "separator") selectedRow = rows.findIndex((row) => row.kind === "data")
			offset = 0
			break
		}
		case "move-row": {
			const target = selectedRow + direction
			if (target < 0 || target >= rows.length) return { kind: "unchanged" }
			if (rows[target].kind === "separator") return rejected("Moving a row across a header separator changes header semantics.")
			const ordinal = dataIndices.indexOf(selectedRow)
			const targetOrdinal = dataIndices.indexOf(target)
			;[rowMap[ordinal], rowMap[targetOrdinal]] = [rowMap[targetOrdinal], rowMap[ordinal]]
			;[rows[selectedRow].values, rows[target].values] = [rows[target].values, rows[selectedRow].values]
			selectedRow = target
			break
		}
		case "insert-column": {
			const target = selectedColumn + (direction === 1 ? 1 : 0)
			for (const row of rows) row.values.splice(target, 0, "")
			for (let index = target; index < columnMap.length; index++) columnMap[index] = index + 2
			selectedColumn = target
			offset = 0
			break
		}
		case "delete-column":
			if (table.columns === 1) return rejected("Cannot delete the last column.")
			columnMap[selectedColumn] = null
			for (let index = selectedColumn + 1; index < columnMap.length; index++) columnMap[index] = index
			for (const row of rows) row.values.splice(selectedColumn, 1)
			selectedColumn = Math.min(selectedColumn, table.columns - 2)
			offset = 0
			break
		case "move-column": {
			const target = selectedColumn + direction
			if (target < 0 || target >= table.columns) return { kind: "unchanged" }
			;[columnMap[selectedColumn], columnMap[target]] = [columnMap[target], columnMap[selectedColumn]]
			for (const row of rows) [row.values[selectedColumn], row.values[target]] = [row.values[target], row.values[selectedColumn]]
			selectedColumn = target
			break
		}
		case "transpose": {
			if (rows.some((row) => row.kind === "separator")) return rejected("Cannot transpose horizontal header separators without losing their meaning.")
			const oldRows = rows.splice(0)
			for (let column = 0; column < table.columns; column++) rows.push({ ...oldRows[Math.min(column, oldRows.length - 1)], values: oldRows.map((row) => row.values[column]) })
			;[selectedRow, selectedColumn] = [selectedColumn, selectedRow]
			transposed = true
			break
		}
		default: return rejected("Unknown Org table operation.")
	}
	let formulaTexts = table.formulas.map((formula) => formula.line.text)
	if (structural) {
		const remapped = remapFormulas(source, table, rowMap, columnMap, transposed, operation.kind === "move-row" || operation.kind === "move-column")
		if (remapped.kind === "rejected") return remapped
		formulaTexts = remapped.texts
	}
	const widths = Array<number>(rows[0].values.length).fill(1)
	const valueWidths = rows.map((row) => row.values.map((value) => row.kind === "data" ? displayWidth(value) : 0))
	for (let row = 0; row < rows.length; row++) {
		for (let column = 0; column < widths.length; column++) widths[column] = Math.max(widths[column], valueWidths[row][column])
	}
	const defaultEnding = table.rows.find((row) => row.ending)?.ending ?? table.formulas.find((formula) => formula.ending)?.ending ?? "\n"
	let insert = ""
	let mappedCursor = table.from
	for (let index = 0; index < rows.length; index++) {
		const row = rows[index]
		let text = `${row.indentation}|`
		if (row.kind === "separator") text += widths.map((width) => "-".repeat(width + 2)).join("+") + "|"
		else {
			for (let column = 0; column < row.values.length; column++) {
				const value = row.values[column]
				if (index === selectedRow && column === selectedColumn) mappedCursor = table.from + insert.length + text.length + 1 + Math.min(offset, value.length)
				text += ` ${value}${" ".repeat(widths[column] - valueWidths[index][column])} |`
			}
		}
		if (index === selectedRow && row.kind === "separator") mappedCursor = table.from + insert.length + row.indentation.length + 1 + widths.slice(0, selectedColumn).reduce((sum, width) => sum + width + 3, 0)
		insert += text + row.suffix
		if (index < rows.length - 1 || formulaTexts.length) insert += row.ending || defaultEnding
	}
	for (let index = 0; index < formulaTexts.length; index++) {
		insert += formulaTexts[index]
		if (index < formulaTexts.length - 1) insert += table.formulas[index].ending || defaultEnding
	}
	if (insert === source.slice(table.from, table.to)) return { kind: "unchanged" }
	return { kind: "edit", batch: { changes: [{ from: table.from, to: table.to, insert }], cursor: mappedCursor, requiredVisibleRanges: [{ from: table.from, to: table.to }] } }
}

export type OrgTableNavigation = "next-field" | "previous-field" | "next-row"

/** Align and move in one canonical transaction. Only a forward move past the
 * final data row creates a row; formula remapping remains the structural law. */
export const planOrgTableNavigation = (source: string, cursor: number, navigation: OrgTableNavigation): OrgTableEditResult => {
	const parsed = parseOrgTableAt(source, cursor)
	if (parsed.kind === "rejected") return parsed
	const table = parsed.table
	if (!["next-field", "previous-field", "next-row"].includes(navigation)) return rejected("Unknown table navigation.")
	const dataRows = table.rows.flatMap((row, index) => row.kind === "data" ? [index] : [])
	let ordinal = dataRows.indexOf(table.selectedRow)
	let column = table.selectedColumn
	if (ordinal < 0) {
		const next = navigation === "previous-field"
			? dataRows.findLastIndex(index => index < table.selectedRow)
			: dataRows.findIndex(index => index > table.selectedRow)
		if (next < 0) return rejected("No data field in that navigation direction.")
		ordinal = next
		column = navigation === "previous-field" ? table.columns - 1 : navigation === "next-row" ? column : 0
	} else if (navigation === "next-row") ordinal++
	else if (navigation === "next-field") {
		column++
		if (column === table.columns) { column = 0; ordinal++ }
	} else {
		column--
		if (column < 0) { column = table.columns - 1; ordinal-- }
		if (ordinal < 0) { ordinal = 0; column = 0 }
	}
	const extending = ordinal === dataRows.length
	const lastRow = table.rows[dataRows.at(-1)!]
	const plan = planOrgTableEdit(source, extending ? lastRow.cells[column].from : cursor,
		extending ? { kind: "insert-row", direction: 1 } : { kind: "align" })
	if (plan.kind === "rejected") return plan
	const changes = plan.kind === "edit" ? plan.batch.changes : []
	let aligned = source
	for (const change of [...changes].reverse()) aligned = aligned.slice(0, change.from) + change.insert + aligned.slice(change.to)
	const result = parseOrgTableAt(aligned, table.from)
	if (result.kind === "rejected") return result
	const rows = result.table.rows.filter(row => row.kind === "data")
	const target = rows[ordinal].cells[column]
	return { kind: "edit", batch: { changes, cursor: target.from,
		requiredVisibleRanges: [{ from: table.from, to: table.to }] } }
}
