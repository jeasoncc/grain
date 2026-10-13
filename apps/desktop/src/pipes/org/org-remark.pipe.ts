import { escapeOrgLinkTarget } from "./org-link-syntax.pipe"
import { orgDefaultWordBounds } from "./org-default-syntax.pipe"
import { orgDrawerRanges, orgPropertyDrawerAt, structuralOrgSourceLines } from "./org-text.pipe"
import type { OrgPropertySourceRange, OrgTextEdit } from "./org-text.pipe"
import type {
	OrgRemarkCoordinateCodec, OrgRemarkEntry, OrgRemarkMark,
	OrgRemarkAction, OrgRemarkMutationPlan, OrgRemarkParseResult, OrgRemarkRejection,
} from "./org-remark.types"

type OrgRemarkEdit = Omit<OrgTextEdit, "cursor">

export const ORG_REMARK_PENS = [
	{ label: "nil", kind: "range", semantic: "default", bold: false, underline: "none", italic: false },
	{ label: "important", kind: "range", semantic: "warning", bold: true, underline: "solid", italic: false },
	{ label: "idea", kind: "range", semantic: "success", bold: true, underline: "none", italic: false },
	{ label: "question", kind: "range", semantic: "constant", bold: false, underline: "solid", italic: false },
	{ label: "revise", kind: "range", semantic: "error", bold: false, underline: "wave", italic: false },
	{ label: "quote", kind: "range", semantic: "documentation", bold: false, underline: "none", italic: true },
	{ label: "line", kind: "line", semantic: "default", bold: false, underline: "none", italic: false },
] as const

const rejected = (message: string): OrgRemarkRejection => ({ kind: "rejected", message })
const basename = (path: string): string => path.slice(path.lastIndexOf("/") + 1)
// A leading dot alone is not an Emacs filename extension.
const withoutExtension = (name: string): string => name.replace(/(.+)\.[^.]*$/, "$1")
export const orgRemarkNotesPath = (sourceRelativePath: string): string => {
	const slash = sourceRelativePath.lastIndexOf("/") + 1
	return `${sourceRelativePath.slice(0, slash)}${withoutExtension(sourceRelativePath.slice(slash))}-notes.org`
}
const validSourcePath = (path: string): boolean =>
	Boolean(path) && !path.startsWith("/") && !/[\r\n\u0000\\]/.test(path)
	&& path.split("/").every((part) => part !== "" && part !== "." && part !== "..")

/** Emacs decodes uniform DOS line endings and counts characters, not UTF-16 units.
 * Mixed LF/CRLF and every lone CR are rejected: coding detection cannot safely be inferred.
 */
export const createOrgRemarkCoordinateCodec = (source: string): OrgRemarkCoordinateCodec | OrgRemarkRejection => {
	const emacsBoundaries = [0]
	const rawBoundaries = new Map<number, number>([[0, 1]])
	const lines: { from: number; to: number; line: number }[] = []
	let lf = false
	let crlf = false
	let lineFrom = 0
	for (let raw = 0; raw < source.length;) {
		const unit = source.charCodeAt(raw)
		let width = 1
		if (unit === 13) {
			if (source.charCodeAt(raw + 1) !== 10) return rejected("Org-remark cannot infer Emacs coding for a lone CR. Use uniform LF or CRLF source without rewriting it here.")
			crlf = true
			width = 2
		} else if (unit === 10) lf = true
		else if (unit >= 0xd800 && unit <= 0xdbff) {
			const low = source.charCodeAt(raw + 1)
			if (!(low >= 0xdc00 && low <= 0xdfff)) return rejected("Org-remark source contains an unpaired UTF-16 surrogate.")
			width = 2
		} else if (unit >= 0xdc00 && unit <= 0xdfff) return rejected("Org-remark source contains an unpaired UTF-16 surrogate.")
		if (lf && crlf) return rejected("Org-remark cannot infer Emacs coding for mixed LF and CRLF. Uniform LF or CRLF is required.")
		if (unit === 10 || unit === 13) {
			lines.push({ from: lineFrom, to: raw, line: lines.length + 1 })
			lineFrom = raw + width
		}
		raw += width
		emacsBoundaries.push(raw)
		rawBoundaries.set(raw, emacsBoundaries.length)
	}
	lines.push({ from: lineFrom, to: source.length, line: lines.length + 1 })
	const rawToEmacs = (raw: number): number | null => rawBoundaries.get(raw) ?? null
	return {
		kind: "ready", decoded: crlf ? source.replaceAll("\r\n", "\n") : source,
		newline: crlf ? "\r\n" : "\n", rawToEmacs,
		emacsToRaw: (position) => Number.isInteger(position) && position >= 1 ? emacsBoundaries[position - 1] ?? null : null,
		lineAt: (raw) => {
			if (rawToEmacs(raw) === null) return null
			let low = 0
			let high = lines.length - 1
			while (low < high) {
				const middle = Math.ceil((low + high) / 2)
				if (lines[middle].from <= raw) low = middle
				else high = middle - 1
			}
			return lines[low]
		},
		excerpt: (from, to) => rawToEmacs(from) !== null && rawToEmacs(to) !== null && from <= to
			? source.slice(from, to).replaceAll("\r\n", "\n") : null,
	}
}

const excerptFor = (codec: OrgRemarkCoordinateCodec, source: string, from: number, to: number, kind: "range" | "line"): string => {
	if (kind === "range") return (codec.excerpt(from, to) ?? "").replaceAll("\n", " ")
	const line = codec.lineAt(from)
	const text = line ? source.slice(line.from, line.to).replace(/^[ \t]+/, "") : ""
	if (!text) return "Empty line highlight"
	const characters = Array.from(text)
	return characters.length <= 40 ? text : `${characters.slice(0, 40).join("")}…`
}

export const selectOrgRemarkSource = (input: {
	readonly source: string
	readonly point: number
	readonly region?: { readonly from: number; readonly to: number }
	readonly kind?: "range" | "line"
}): { readonly kind: "ready"; readonly from: number; readonly to: number; readonly markKind: "range" | "line"; readonly originalText: string; readonly line: number } | OrgRemarkRejection => {
	const codec = createOrgRemarkCoordinateCodec(input.source)
	if (codec.kind === "rejected") return codec
	const line = codec.lineAt(input.point)
	if (!line) return rejected("The remark cursor must be a valid source character boundary.")
	const markKind = input.kind ?? "range"
	let from = line.from
	let to = from
	if (markKind === "range") {
		if (input.region && input.region.from !== input.region.to) {
			from = Math.min(input.region.from, input.region.to)
			to = Math.max(input.region.from, input.region.to)
		} else {
			const bounds = orgDefaultWordBounds(input.source, input.point)
			if (!bounds) return rejected("No region selected and the cursor is not on a word.")
			from = bounds.from
			to = bounds.to
		}
		if (codec.rawToEmacs(from) === null || codec.rawToEmacs(to) === null) return rejected("The selected region splits a Unicode character or CRLF line ending.")
	}
	return { kind: "ready", from, to, markKind, originalText: excerptFor(codec, input.source, from, to, markKind), line: codec.lineAt(from)?.line ?? line.line }
}

interface Property extends OrgPropertySourceRange {
	readonly lineFrom: number
	readonly breakTo: number
}
interface Heading {
	readonly from: number
	readonly breakTo: number
	readonly to: number
	readonly level: number
	readonly title: string
	readonly fields: readonly Property[]
	readonly drawerEnd: number | null
	readonly bodyFrom: number
	readonly hasNotes: boolean
	readonly sourceFile: string | null
}
interface NotesSnapshot {
	readonly ids: ReadonlySet<string>
	readonly kind: "ready"
	readonly headings: readonly Heading[]
	readonly matching: readonly Heading[]
	readonly codec: OrgRemarkCoordinateCodec
}
const field = (heading: Heading, key: string): Property | undefined => heading.fields.find((item) => item.key.toLowerCase() === key.toLowerCase())
const value = (heading: Heading, key: string): string | undefined => field(heading, key)?.value
const lineFromAt = (source: string, position: number): number => position > 0 ? source.lastIndexOf("\n", position - 1) + 1 : 0
const breakToAt = (source: string, position: number): number => {
	const newline = source.indexOf("\n", position)
	return newline === -1 ? source.length : newline + 1
}

/** Uses the shared structural scanner: apparent headings/drawers in blocks never become records. */
const scanNotes = (notes: string, sourceRelativePath: string): NotesSnapshot | OrgRemarkRejection => {
	if (!validSourcePath(sourceRelativePath)) return rejected("Org-remark requires a safe workspace-relative source filename.")
	const codec = createOrgRemarkCoordinateCodec(notes)
	if (codec.kind === "rejected") return codec
	const drawers = orgDrawerRanges(notes)
	if (drawers.some((drawer) => !drawer.closed)) return rejected("The notes file contains an unclosed drawer. Repair it before changing remarks.")
	// Validate complete PROPERTIES drawers, including orphan drawers, before any edit.
	const ids = new Set<string>()
	for (const drawer of drawers) {
		const text = notes.slice(drawer.from, drawer.to)
		const rows = text.split(/\r?\n/)
		if (!/^[ \t]*:PROPERTIES:[ \t]*$/i.test(rows[0])) continue
		const keys = new Set<string>()
		for (let index = 1; index < rows.length; index++) {
			if (/^[ \t]*:END:[ \t]*$/i.test(rows[index])) break
			const match = /^[ \t]*:([^:\s]+):[ \t]*(.*)$/.exec(rows[index])
			if (!match || /^(?:properties|end)$/i.test(match[1])) return rejected("The notes file contains a malformed property drawer. Repair it before changing remarks.")
			const key = match[1].toLowerCase()
			if (keys.has(key)) return rejected(`The notes file contains duplicate ${match[1]} properties.`)
			keys.add(key)
			if (key === "org-remark-id") {
				const id = match[2].trim()
				if (!id) return rejected("A remark ID is empty.")
				if (ids.has(id.toLowerCase())) return rejected(`The notes file contains duplicate remark ID ${id}.`)
				ids.add(id.toLowerCase())
			}
		}
	}
	const structural = structuralOrgSourceLines(notes)
	const headingLines = structural.flatMap((line) => {
		const match = /^(\*+)[ \t]+(.*)$/.exec(line.text)
		return match ? [{ ...line, level: match[1].length, title: match[2] }] : []
	})
	const headings: Heading[] = []
	const ancestors: Heading[] = []
	for (let index = 0; index < headingLines.length; index++) {
		const line = headingLines[index]
		let end = notes.length
		for (let next = index + 1; next < headingLines.length; next++) {
			if (headingLines[next].level <= line.level) { end = headingLines[next].from; break }
		}
		const drawer = orgPropertyDrawerAt(notes, line.from)
		if (!drawer || drawer.kind === "invalid") return rejected(drawer?.message ?? "The remark heading cannot be parsed.")
		const fields: Property[] = drawer.kind === "drawer" ? drawer.properties.map((property) => ({
			...property, lineFrom: lineFromAt(notes, property.valueFrom), breakTo: breakToAt(notes, property.valueTo),
		})) : []
		while (ancestors.length && ancestors[ancestors.length - 1].level >= line.level) ancestors.pop()
		const ownSource = fields.find((property) => property.key.toLowerCase() === "org-remark-file")?.value
		let bodyFrom = drawer.kind === "drawer" ? breakToAt(notes, drawer.endFrom) : drawer.from
		// Ordinary metadata drawers and blank separator lines are not annotation text.
		while (bodyFrom < end) {
			const nextBreak = breakToAt(notes, bodyFrom)
			if (/^[ \t\r\n]*$/.test(notes.slice(bodyFrom, nextBreak))) { bodyFrom = nextBreak; continue }
			const metadata = drawers.find((candidate) => candidate.from === bodyFrom)
			if (metadata) { bodyFrom = metadata.to; continue }
			break
		}
		const heading: Heading = {
			from: line.from, breakTo: line.breakTo, to: end, level: line.level, title: line.title, fields,
			drawerEnd: drawer.kind === "drawer" ? drawer.endFrom : null, bodyFrom,
			hasNotes: /\S/.test(notes.slice(bodyFrom, end)),
			sourceFile: ownSource ?? ancestors[ancestors.length - 1]?.sourceFile ?? null,
		}
		headings.push(heading)
		ancestors.push(heading)
	}
	return { kind: "ready", headings, matching: headings.filter((heading) => heading.sourceFile === basename(sourceRelativePath)), codec, ids }
}

const savedPosition = (heading: Heading, key: string, codec: OrgRemarkCoordinateCodec): number | null => {
	const text = value(heading, key)
	return text && /^[1-9]\d*$/.test(text) ? codec.emacsToRaw(Number(text)) : null
}
const sameExcerpt = (first: string, second: string): boolean => first.replace(/[ \n]/g, "") === second.replace(/[ \n]/g, "")

export const parseOrgRemarkNotes = (notesSource: string, sourceRelativePath: string, source: string): OrgRemarkParseResult => {
	const codec = createOrgRemarkCoordinateCodec(source)
	if (codec.kind === "rejected") return codec
	const snapshot = scanNotes(notesSource, sourceRelativePath)
	if (snapshot.kind === "rejected") return snapshot
	const entries: OrgRemarkEntry[] = []
	const marks: OrgRemarkMark[] = []
	const diagnostics: { id: string; message: string }[] = []
	for (const heading of snapshot.matching) {
		const id = value(heading, "org-remark-id")
		if (!id) continue
		const type = value(heading, "org-remark-type")
		if (type && type !== "nil" && type !== "line") {
			diagnostics.push({ id, message: `Unsupported Org-remark type ${type}; its entry is retained unchanged.` })
			continue
		}
		const kind = type === "line" ? "line" : "range"
		const from = savedPosition(heading, "org-remark-beg", codec)
		const to = savedPosition(heading, "org-remark-end", codec)
		if (from === null || to === null || to < from) {
			diagnostics.push({ id, message: "Saved remark coordinates are missing or outside the decoded source; no position was guessed." })
			continue
		}
		const line = codec.lineAt(from)
		if (!line) return rejected(`Remark ${id} splits a source character.`)
		const original = value(heading, "org-remark-original-text")
		const originalText = original ?? ""
		// Creation text is immutable; edited highlights still use their saved coordinates.
		const resolved = kind === "line" ? from === to : from < to
		const anchorFrom = kind === "line" && resolved ? line.from : from
		const anchorTo = kind === "line" && resolved ? line.from : to
		const mark: OrgRemarkMark = { id, from: anchorFrom, to: anchorTo, kind, label: value(heading, "org-remark-label") ?? "nil", originalText, line: line.line }
		entries.push({ ...mark, heading: heading.title, entryFrom: heading.from, entryTo: heading.to, bodyFrom: heading.bodyFrom, hasNotes: heading.hasNotes, notesPath: orgRemarkNotesPath(sourceRelativePath), resolved })
		if (resolved) {
			marks.push(mark)
			if (kind === "range" && original !== undefined && !sameExcerpt(originalText, codec.excerpt(from, to) ?? "")) {
				diagnostics.push({ id, message: "The highlighted text differs from its creation excerpt; saved coordinates and original text were retained without relocation." })
			}
		} else diagnostics.push({ id, message: "The saved remark has an invalid range/type anchor; it is temporarily unresolved, not relocated." })
	}
	return { kind: "ready", entries, marks, diagnostics }
}

const stripRemarkProperties = (heading: Heading): readonly OrgRemarkEdit[] => heading.fields
	.filter((property) => property.key.toLowerCase().startsWith("org-remark-"))
	.map((property) => ({ from: property.lineFrom, to: property.breakTo, insert: "" }))

const updateFields = (heading: Heading, changes: Readonly<Record<string, string | null>>, notes: string, newline: string): OrgRemarkEdit[] => {
	const edits: OrgRemarkEdit[] = []
	const additions: string[] = []
	for (const [key, next] of Object.entries(changes)) {
		const property = field(heading, key)
		if (property) {
			if (next === null) edits.push({ from: property.lineFrom, to: property.breakTo, insert: "" })
			else if (next !== property.value) edits.push({ from: property.valueFrom, to: property.valueTo, insert: next })
		} else if (next !== null) additions.push(`:${key}: ${next}${newline}`)
	}
	if (additions.length) {
		if (heading.drawerEnd !== null) {
			const indentation = /^[ \t]*/.exec(notes.slice(heading.drawerEnd))?.[0] ?? ""
			edits.push({ from: heading.drawerEnd, to: heading.drawerEnd, insert: additions.map((line) => indentation + line).join("") })
		} else {
			const prefix = heading.breakTo === notes.length && !notes.endsWith("\n") ? newline : ""
			edits.push({ from: heading.breakTo, to: heading.breakTo, insert: `${prefix}:PROPERTIES:${newline}${additions.join("")}:END:${newline}` })
		}
	}
	return edits
}
const penChanges = (label: string): Readonly<Record<string, string | null>> => ({
	"org-remark-label": label, CATEGORY: label !== "nil" && label !== "line" ? label : null,
})
const validateAnchor = (codec: OrgRemarkCoordinateCodec, from: number, to: number, kind: "range" | "line", allowCollapsed: boolean): OrgRemarkRejection | null => {
	if (codec.rawToEmacs(from) === null || codec.rawToEmacs(to) === null || to < from) return rejected("Remark anchors must be ordered raw character boundaries, not surrogate/CRLF interiors.")
	if (kind === "range" && !allowCollapsed && from === to) return rejected("A range remark requires a nonempty region or word.")
	if (kind === "line" && (from !== to || codec.lineAt(from)?.from !== from)) return rejected("A line remark must be a zero-width beginning-of-line anchor.")
	return null
}
const coordinateChanges = (codec: OrgRemarkCoordinateCodec, mark: Pick<OrgRemarkMark, "from" | "to" | "kind">, filename: string): Record<string, string | null> => {
	const line = codec.lineAt(mark.from)?.line ?? 1
	const changes: Record<string, string | null> = {
		"org-remark-beg": String(codec.rawToEmacs(mark.from)),
		"org-remark-end": String(codec.rawToEmacs(mark.to)),
		"org-remark-link": `[[${escapeOrgLinkTarget(`file:${filename}::${line}`)}]]`,
	}
	if (mark.kind === "line") changes["org-remark-line-number"] = String(line)
	return changes
}
const sourceTitle = (source: string, sourceRelativePath: string): string => {
	for (const line of structuralOrgSourceLines(source)) {
		const title = /^#\+TITLE:[ \t]*(.*)$/i.exec(line.text)
		if (title?.[1].trim()) return title[1].trim()
	}
	return withoutExtension(basename(sourceRelativePath))
}

/** Plans edits only to the canonical source-sibling notes file. Source bytes never change. */
export const planOrgRemarkMutation = (input: {
	readonly notesSource: string
	readonly sourceRelativePath: string
	readonly source: string
	readonly action: OrgRemarkAction
}): OrgRemarkMutationPlan => {
	const { notesSource: previous, sourceRelativePath, source, action } = input
	const codec = createOrgRemarkCoordinateCodec(source)
	if (codec.kind === "rejected") return codec
	const snapshot = scanNotes(previous, sourceRelativePath)
	if (snapshot.kind === "rejected") return snapshot
	const newline = previous ? snapshot.codec.newline : "\n"
	const filename = basename(sourceRelativePath)
	const edits: OrgRemarkEdit[] = []
	if (action.type === "add") {
		if (!/^[0-9a-f]{8}$/i.test(action.id)) return rejected("A new remark ID must be exactly eight hexadecimal UUID characters.")
		if (snapshot.ids.has(action.id.toLowerCase())) return rejected(`Remark ID ${action.id} already exists in the notes file.`)
		const invalid = validateAnchor(codec, action.from, action.to, action.kind, false)
		if (invalid) return invalid
		const label = action.label ?? (action.kind === "line" ? "line" : "nil")
		if (!ORG_REMARK_PENS.some((pen) => pen.label === label && pen.kind === action.kind)) return rejected("The selected pen is not configured for this remark type.")
		const excerpt = excerptFor(codec, source, action.from, action.to, action.kind)
		const changes: Record<string, string | null> = {
			"org-remark-id": action.id, ...coordinateChanges(codec, action, filename),
			...penChanges(label), "org-remark-original-text": excerpt,
		}
		if (action.kind === "line") changes["org-remark-type"] = "line"
		const owner = snapshot.matching.find((heading) => value(heading, "org-remark-file") === filename && !value(heading, "org-remark-id"))
		const position = owner?.to ?? previous.length
		const prefix = position > 0 && previous[position - 1] !== "\n" ? newline : ""
		const parent = owner ? "" : `* ${sourceTitle(source, sourceRelativePath)}${newline}:PROPERTIES:${newline}:org-remark-file: ${filename}${newline}:END:${newline}`
		const properties = Object.entries(changes).filter((item) => item[1] !== null).map(([key, val]) => `:${key}: ${val}${newline}`).join("")
		edits.push({ from: position, to: position, insert: `${prefix}${parent}${"*".repeat((owner?.level ?? 1) + 1)} ${excerpt}${newline}:PROPERTIES:${newline}${properties}:END:${newline}${newline}` })
	} else if (action.type === "sync") {
		const seen = new Set<string>()
		for (const mark of action.marks) {
			if (seen.has(mark.id)) return rejected(`The source tracker contains duplicate remark ${mark.id}.`)
			seen.add(mark.id)
			const heading = snapshot.matching.find((candidate) => value(candidate, "org-remark-id") === mark.id)
			if (!heading) return rejected(`Tracked remark ${mark.id} no longer exists in this source's notes.`)
			const type = value(heading, "org-remark-type")
			if (type && type !== "nil" && type !== "line") return rejected(`Tracked remark ${mark.id} now has an unsupported type; no metadata was changed.`)
			const kind = type === "line" ? "line" : "range"
			if (kind !== mark.kind) return rejected(`Tracked remark ${mark.id} has changed type in its notes.`)
			// Line housekeeping snaps a moved zero-width icon back to its current BOL.
			const line = codec.lineAt(mark.from)
			const from = mark.kind === "line" ? line?.from ?? mark.from : mark.from
			const to = mark.kind === "line" ? from : mark.to
			const invalid = validateAnchor(codec, from, to, mark.kind, true)
			if (invalid || codec.rawToEmacs(mark.from) === null || (mark.kind === "line" && mark.to !== mark.from)) return invalid ?? rejected("Tracked line remark anchors are invalid.")
			if (mark.kind === "range" && from === to) edits.push(...stripRemarkProperties(heading))
			else edits.push(...updateFields(heading, coordinateChanges(codec, { from, to, kind: mark.kind }, filename), previous, newline))
		}
	} else {
		const heading = snapshot.matching.find((candidate) => value(candidate, "org-remark-id") === action.id)
		if (!heading) return rejected("No matching remark exists for this source.")
		if (action.type === "change") {
			const type = value(heading, "org-remark-type")
			if (type && type !== "nil" && type !== "line") return rejected("This remark uses an unsupported pen type; its properties were not changed.")
			const kind = type === "line" ? "line" : "range"
			if (!ORG_REMARK_PENS.some((pen) => pen.label === action.label && pen.kind === kind)) return rejected("Pens can only be changed within the same remark type.")
			const invalid = validateAnchor(codec, action.from, action.to, kind, false)
			if (invalid) return invalid
			edits.push(...updateFields(heading, { ...coordinateChanges(codec, { from: action.from, to: action.to, kind }, filename), ...penChanges(action.label) }, previous, newline))
		} else {
			if (action.type === "delete" && heading.hasNotes && action.deleteNotes === undefined) return {
				kind: "confirmation-required", id: action.id, hasNotes: true,
				message: "Highlight will be removed. Do you also want to delete its marginal notes?",
			}
			if (action.type === "delete" && (!heading.hasNotes || action.deleteNotes === true)) edits.push({ from: heading.from, to: heading.to, insert: "" })
			else edits.push(...stripRemarkProperties(heading))
		}
	}
	edits.sort((first, second) => first.from - second.from || first.to - second.to)
	for (let index = 1; index < edits.length; index++) {
		if (edits[index].from < edits[index - 1].to) return rejected("Remark edits overlap; nested annotations must be changed separately.")
	}
	let next = previous
	for (let index = edits.length - 1; index >= 0; index--) {
		const edit = edits[index]
		next = next.slice(0, edit.from) + edit.insert + next.slice(edit.to)
	}
	let shift = 0
	const canonicalEdits = edits.map((edit) => {
		const cursor = edit.from + shift + edit.insert.length
		shift += edit.insert.length - (edit.to - edit.from)
		return { ...edit, cursor }
	})
	return { kind: "ready", previous, next, edits: canonicalEdits, notesPath: orgRemarkNotesPath(sourceRelativePath) }
}

/** Range highlights win over a line icon anywhere on its source line. */
export const orgRemarkAtPoint = (marks: readonly OrgRemarkMark[], point: number, source?: string): OrgRemarkMark | null => {
	const range = marks.find((mark) => mark.kind === "range" && mark.from <= point && point < mark.to)
	if (range) return range
	const lineFrom = source === undefined ? point : lineFromAt(source, point)
	return marks.find((mark) => mark.kind === "line" && mark.from === lineFrom) ?? null
}

/** Strictly greater/less starts, cycling at the edge; folded starts can be excluded by visible ranges. */
export const orgRemarkNavigate = (
	marks: readonly OrgRemarkMark[], point: number, direction: "next" | "previous",
	visibleRanges?: readonly { readonly from: number; readonly to: number }[],
): OrgRemarkMark | null => {
	const visible = marks.filter((mark) => visibleRanges === undefined || visibleRanges.some((range) => range.from <= mark.from && mark.from <= range.to))
		.toSorted((first, second) => first.from - second.from)
	if (!visible.length) return null
	return direction === "next"
		? visible.find((mark) => mark.from > point) ?? visible[0]
		: visible.findLast((mark) => mark.from < point) ?? visible[visible.length - 1]
}
