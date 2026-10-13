import { foldedRanges } from "@codemirror/language"
import { EditorState, type Extension, Facet, type StateEffect as Effect, StateEffect, StateField, Transaction } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, GutterMarker, gutter } from "@codemirror/view"
import { orgRemarkEditorOffset, orgRemarkRawOffset, type OrgRemarkSnapshot, type OrgRemarkTrackedMark } from "@/flows/org-editor-runtime/org-remark-tracker"
import { isOrgRuntimeProjection } from "@/flows/org-editor-runtime/org-buffer-runtime"
import { orgSparseTreeField } from "./org-sparse-tree.extension"

export interface OrgRemarkPresentation {
	readonly snapshot: OrgRemarkSnapshot
	readonly decorations: DecorationSet
	readonly lineMarks: readonly OrgRemarkTrackedMark[]
}
export const setOrgRemarkSnapshot = StateEffect.define<OrgRemarkSnapshot | null>()
const presentationAuthority = Facet.define<(effect: Effect<unknown>) => boolean>()
const semanticClass: Record<string, string> = {
	important: "cm-org-remark-important",
	idea: "cm-org-remark-idea",
	question: "cm-org-remark-question",
	revise: "cm-org-remark-revise",
	quote: "cm-org-remark-quote",
}

/** Presentation only: the authoritative anchors always come from the canonical tracker. */
export const orgRemarkField = StateField.define<OrgRemarkPresentation | null>({
	create: () => null,
	update(previous, transaction) {
		let value = transaction.docChanged ? null : previous
		for (const effect of transaction.effects) {
			if (!effect.is(setOrgRemarkSnapshot)) continue
			if (!transaction.startState.facet(presentationAuthority).some((owns) => owns(effect))) {
				throw new Error("Unissued Org remark presentation effect")
			}
			const snapshot = effect.value
			if (!snapshot || snapshot.needsReload || snapshot.source !== transaction.state.sliceDoc()) {
				value = null
				continue
			}
			const ranges = snapshot.marks.filter((mark) => mark.kind === "range" && !mark.collapsed)
			value = {
				decorations: Decoration.set(ranges.map((mark) => Decoration.mark({
					attributes: { "data-org-remark-id": mark.id, title: mark.originalText },
					class: `cm-org-remark ${Object.hasOwn(semanticClass, mark.label) ? semanticClass[mark.label] : "cm-org-remark-default"}`,
				}).range(orgRemarkEditorOffset(transaction.state, mark.from), orgRemarkEditorOffset(transaction.state, mark.to))), true),
				lineMarks: snapshot.marks.filter((mark) => mark.kind === "line"),
				snapshot,
			}
		}
		return value
	},
	provide: (field) => EditorView.decorations.from(field, (value) => value?.decorations ?? Decoration.none),
})

class OrgRemarkLineMarker extends GutterMarker {
	constructor(readonly marks: readonly OrgRemarkTrackedMark[]) { super() }
	eq(other: OrgRemarkLineMarker): boolean {
		return this.marks.length === other.marks.length && this.marks.every((mark, index) =>
			mark.id === other.marks[index].id && mark.originalText === other.marks[index].originalText)
	}
	toDOM(view: EditorView): HTMLElement {
		const icon = view.dom.ownerDocument.createElement("span")
		icon.className = "cm-org-remark-line-icon"
		icon.textContent = "*"
		icon.title = this.marks.map((mark) => mark.originalText).join("\n")
		icon.setAttribute("aria-label", `Line annotation: ${icon.title}`)
		icon.dataset.orgRemarkIds = this.marks.map((mark) => mark.id).join(" ")
		return icon
	}
}

/** Register setOrgRemarkSnapshot as a registry localType and pass registry.knownEffect here.
 * Issue with registry.localEffect, addToHistory:false; never allow the bare effect type in
 * runtime.knownLocalEffects. This extension neither mutates source nor opens hidden text. */
export function createOrgRemarkExtension(knownEffect: (effect: Effect<unknown>) => boolean): Extension {
	return [
		presentationAuthority.of(knownEffect),
		orgRemarkField,
		historyFreeRemarkEffects,
		orgRemarkNoteRangeField,
		gutter({
			class: "cm-org-remark-gutter",
			lineMarker(view, line) {
				const marks = view.state.field(orgRemarkField)?.lineMarks.filter((mark) =>
					orgRemarkEditorOffset(view.state, mark.from) === line.from)
				return marks?.length ? new OrgRemarkLineMarker(marks) : null
			},
			lineMarkerChange: (update) => update.docChanged || update.transactions.some((transaction) =>
				transaction.effects.some((effect) => effect.is(setOrgRemarkSnapshot))),
		}),
		EditorView.baseTheme({
			".cm-org-remark-default": { textDecoration: "underline", textDecorationColor: "var(--primary, currentColor)" },
			".cm-org-remark-important": { color: "var(--warning, #b7791f)", fontWeight: "bold", textDecoration: "underline" },
			".cm-org-remark-idea": { color: "var(--success, #2f855a)", fontWeight: "bold" },
			".cm-org-remark-question": { color: "var(--primary, #805ad5)", textDecoration: "underline" },
			".cm-org-remark-revise": { color: "var(--error, #c53030)", textDecoration: "underline wavy" },
			".cm-org-remark-quote": { color: "var(--muted-foreground, #718096)", fontStyle: "italic" },
			".cm-org-remark-gutter": { minWidth: "1.25em", color: "var(--primary, currentColor)" },
			".cm-org-remark-line-icon": { display: "inline-block", width: "1.25em", textAlign: "center", fontWeight: "bold" },
		}),
	]
}

// Presentation effects cannot create history even if a caller forgets the annotation.
const historyFreeRemarkEffects = EditorState.transactionExtender.of((transaction) =>
	transaction.effects.some((effect) => effect.is(setOrgRemarkSnapshot) || effect.is(setOrgRemarkNoteRange)) && !transaction.docChanged
		? { annotations: Transaction.addToHistory.of(false) }
		: null)

/** RAW UTF-16 point. Range marks take precedence over a line remark at that point. */
export function orgRemarkAtPoint(state: EditorState, point = orgRemarkRawOffset(state, state.selection.main.head)): OrgRemarkTrackedMark | null {
	const marks = state.field(orgRemarkField, false)?.snapshot.marks
	if (!marks) return null
	const range = marks.find((mark) => mark.kind === "range" && !mark.collapsed && mark.from <= point && point < mark.to)
	if (range) return range
	const line = state.doc.lineAt(orgRemarkEditorOffset(state, point)).number
	return marks.find((mark) => mark.kind === "line" && mark.line === line) ?? null
}

/** All nonhidden navigation candidates, including offscreen marks. No folds are expanded. */
export function orgRemarkNavigableMarks(state: EditorState): readonly OrgRemarkTrackedMark[] {
	const marks = state.field(orgRemarkField, false)?.snapshot.marks ?? []
	const hidden = [
		...(state.field(orgSparseTreeField, false)?.hiddenRanges ?? []),
		...(state.field(orgRemarkNoteRangeField, false)?.hiddenRanges ?? []),
	]
	foldedRanges(state).between(0, state.doc.length, (from, to) => { hidden.push({ from, to }) })
	return marks.filter((mark) => {
		if (mark.collapsed) return false
		const from = orgRemarkEditorOffset(state, mark.from), to = orgRemarkEditorOffset(state, mark.to)
		return !hidden.some((range) => mark.kind === "line"
			? from >= range.from && from < range.to
			: from < range.to && to > range.from)
	}).sort((a, b) => a.from - b.from || (a.kind === "range" ? 0 : 1) - (b.kind === "range" ? 0 : 1))
}
export function orgRemarkNavigationTarget(state: EditorState, point: number, direction: "next" | "previous"): OrgRemarkTrackedMark | null {
	const marks = orgRemarkNavigableMarks(state)
	return direction === "next"
		? marks.find((mark) => mark.from > point) ?? null
		: marks.findLast((mark) => mark.from < point) ?? null
}
export function orgRemarkVisibleMarks(view: EditorView): readonly OrgRemarkTrackedMark[] {
	return orgRemarkNavigableMarks(view.state).filter((mark) => {
		const from = orgRemarkEditorOffset(view.state, mark.from), to = orgRemarkEditorOffset(view.state, mark.to)
		return view.visibleRanges.some((range) => mark.kind === "line"
			? from >= range.from && from <= range.to
			: from < range.to && to > range.from)
	})
}

export interface OrgRemarkNoteRange {
	readonly from: number
	readonly to: number
}
export interface OrgRemarkNoteRangePresentation extends OrgRemarkNoteRange {
	readonly hiddenRanges: readonly OrgRemarkNoteRange[]
	readonly decorations: DecorationSet
}
/** Raw source narrowing for ONE notes window, without copying text or history. */
export const setOrgRemarkNoteRange = StateEffect.define<OrgRemarkNoteRange | null>()

/** User-source preflight. Hidden bytes and the following heading's line boundary are sacred.
 * Canonical undo/projections bypass this veto and still map the window's narrowing. */
export function allowOrgRemarkNoteSourceTransaction(transaction: Transaction): boolean {
	const range = transaction.startState.field(orgRemarkNoteRangeField, false)
	if (!range || isOrgRuntimeProjection(transaction)) return true
	if (!transaction.docChanged && transaction.effects.some((effect) =>
		effect.is(setOrgRemarkNoteRange) &&
		transaction.startState.facet(presentationAuthority).some((owns) => owns(effect)))) return true
	if (transaction.state.lineBreak !== transaction.startState.lineBreak) return false
	const from = orgRemarkEditorOffset(transaction.startState, range.from)
	const to = orgRemarkEditorOffset(transaction.startState, range.to)
	let allowed = true
	transaction.changes.iterChangedRanges((start, end) => {
		if (start < from || end > to || (start === end && start === to && to < transaction.startState.doc.length)) {
			allowed = false
		}
	})
	if (!allowed) return false
	const nextFrom = transaction.changes.mapPos(from, -1)
	const nextTo = transaction.changes.mapPos(to, 1)
	if (to < transaction.startState.doc.length && transaction.newDoc.lineAt(nextTo).from !== nextTo) return false
	if (transaction.selection?.ranges.some((selection) => selection.from < nextFrom || selection.to > nextTo)) return false
	return true
}

export const orgRemarkNoteRangeField = StateField.define<OrgRemarkNoteRangePresentation | null>({
	create: () => null,
	update(previous, transaction) {
		if (!transaction.docChanged && !transaction.effects.some((effect) => effect.is(setOrgRemarkNoteRange))) return previous
		let suppliedRange = false
		let range: OrgRemarkNoteRange | null = previous && {
			from: orgRemarkRawOffset(transaction.state, transaction.changes.mapPos(orgRemarkEditorOffset(transaction.startState, previous.from), -1)),
			to: orgRemarkRawOffset(transaction.state, transaction.changes.mapPos(orgRemarkEditorOffset(transaction.startState, previous.to), 1)),
		}
		for (const effect of transaction.effects) {
			if (!effect.is(setOrgRemarkNoteRange)) continue
			if (!transaction.startState.facet(presentationAuthority).some((owns) => owns(effect))) {
				throw new Error("Unissued Org remark narrowing effect")
			}
			range = effect.value
			suppliedRange = true
		}
		if (!range) return null
		let wholeDocumentReplacement = false
		transaction.changes.iterChangedRanges((from, to) => {
			if (from === 0 && to === transaction.startState.doc.length) wholeDocumentReplacement = true
		})
		if (!suppliedRange && wholeDocumentReplacement) return null
		const source = transaction.state.sliceDoc()
		if (!Number.isInteger(range.from) || !Number.isInteger(range.to) || range.from < 0 || range.to < range.from || range.to > source.length) {
			throw new Error("Invalid Org remark narrowing range")
		}
		const from = orgRemarkEditorOffset(transaction.state, range.from)
		const to = orgRemarkEditorOffset(transaction.state, range.to)
		if (
			orgRemarkRawOffset(transaction.state, from) !== range.from ||
			orgRemarkRawOffset(transaction.state, to) !== range.to ||
			(from < transaction.state.doc.length && transaction.state.doc.lineAt(from).from !== from) ||
			(to < transaction.state.doc.length && transaction.state.doc.lineAt(to).from !== to)
		) {
			if (!suppliedRange) return null
			throw new Error("Org remark narrowing must use complete structural lines")
		}
		const hiddenRanges = [
			...(from > 0 ? [{ from: 0, to: from }] : []),
			...(to < transaction.state.doc.length ? [{ from: to, to: transaction.state.doc.length }] : []),
		]
		return {
			from: range.from,
			to: range.to,
			hiddenRanges,
			decorations: Decoration.set(hiddenRanges.map((hidden) => Decoration.replace({ block: true }).range(hidden.from, hidden.to)), true),
		}
	},
	provide: (field) => [
		EditorView.decorations.from(field, (value) => value?.decorations ?? Decoration.none),
		EditorView.atomicRanges.of((view) => view.state.field(field)?.decorations ?? Decoration.none),
		EditorState.transactionFilter.of((transaction) =>
			allowOrgRemarkNoteSourceTransaction(transaction) ? transaction : []),
	],
})
