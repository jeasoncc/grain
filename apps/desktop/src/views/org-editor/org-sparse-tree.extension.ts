import { historyKeymap, undo, redo } from "@codemirror/commands"
import {
	EditorSelection,
	EditorState,
	Facet,
	StateEffect,
	StateField,
	Transaction,
} from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, keymap } from "@codemirror/view"
import { buildOrgSparseTreePlan } from "@/pipes/org/org-sparse-tree.pipe"
import type { OrgSparseTreePlan, OrgSparseTreeQuery } from "@/types/org"
import { editorOffsetFromSource } from "./org-source-offset.pipe"

type HiddenRange = { readonly from: number; readonly to: number }
export interface OrgSparseTreeState {
	readonly query: OrgSparseTreeQuery
	/** Raw-source query result, independent of the window's temporarily revealed selection. */
	readonly plan: OrgSparseTreePlan
	/** Effective hidden ranges in CodeMirror offsets. Canonical selection targets are revealed. */
	readonly hiddenRanges: readonly HiddenRange[]
	readonly decorations: DecorationSet
	readonly restoreSelection: EditorSelection | null
}

export const setOrgSparseTree = StateEffect.define<{
	readonly query: OrgSparseTreeQuery
	readonly restoreSelection: EditorSelection | null
}>()
export const clearOrgSparseTree = StateEffect.define<null>()
// Each controller owns its invocation context. No annotation can confer authority.
const ownedHistory = Facet.define<(transaction: Transaction) => boolean>()
const isOwnedHistory = (tr: Transaction) =>
	tr.startState.facet(ownedHistory).some((owns) => owns(tr))

export function createOrgSparseHistoryController(
	getView: () => EditorView | null,
	knownEffect: (effect: StateEffect<unknown>) => boolean,
) {
	let depth = 0
	const owns = (tr: Transaction) => depth > 0 && getView()?.state === tr.startState
	const run = (command: (view: EditorView) => boolean) => {
		const view = getView()
		if (!view || view.state.readOnly) return false
		depth++
		try {
			return command(view)
		} finally {
			depth--
		}
	}
	return {
		extension: [
			ownedHistory.of(owns),
			keymap.of(
				historyKeymap.map((binding) => ({
					...binding,
					run: binding.run ? () => run(binding.run!) : undefined,
					shift: binding.shift ? () => run(binding.shift!) : undefined,
				})),
			),
			EditorView.domEventHandlers({
				beforeinput: (event) => {
					if (event.inputType !== "historyUndo" && event.inputType !== "historyRedo") return false
					event.preventDefault()
					run(event.inputType === "historyRedo" ? redo : undo)
					return true
				},
			}),
		],
		dispatch(transactions: readonly Transaction[], view: EditorView) {
			if (view !== getView()) return
			// Validate every intermediate state, before installing any source/history.
			if (
				transactions.some(
					(tr) =>
						tr.effects.some(
							(effect) =>
								(effect.is(setOrgSparseTree) || effect.is(clearOrgSparseTree)) &&
								!knownEffect(effect),
						) ||
						(!owns(tr) && !allowOrgSparseTreeSourceTransaction(tr, knownEffect)),
				)
			)
				return
			view.update(transactions)
		},
	}
}

export const sparseSelectionIntersects = (
	selection: EditorSelection,
	ranges: readonly HiddenRange[],
) =>
	selection.ranges.some((range) =>
		ranges.some(({ from, to }) =>
			range.empty ? range.head >= from && range.head < to : range.from < to && range.to > from,
		),
	)

/** Preflight ordinary local source AND selection, never private canonical projections/history. */
export const allowOrgSparseTreeSourceTransaction = (
	transaction: Transaction,
	knownEffect: (effect: StateEffect<unknown>) => boolean = () => false,
): boolean => {
	const sparse = transaction.startState.field(orgSparseTreeField, false)
	if (!sparse) return true
	// Owned apply may relocate a caret; owned clear may restore its mapped snapshot.
	const ownedPresentation = transaction.effects.some(
		(effect) =>
			(effect.is(setOrgSparseTree) || effect.is(clearOrgSparseTree)) && knownEffect(effect),
	)
	if (
		transaction.selection &&
		!ownedPresentation &&
		sparseSelectionIntersects(
			transaction.selection,
			sparse.hiddenRanges.map(({ from, to }) => ({
				from: transaction.changes.mapPos(from),
				to: transaction.changes.mapPos(to),
			})),
		)
	)
		return false
	if (!transaction.docChanged) return true
	let allowed = true
	transaction.changes.iterChangedRanges((from, to) => {
		if (
			sparse.hiddenRanges.some((hidden) =>
				from === to
					? from >= hidden.from && from < hidden.to
					: (from < hidden.to && to > hidden.from) ||
						// Do not join a visible line to the hidden heading by deleting its separator.
						(hidden.from > 0 && from <= hidden.from - 1 && to >= hidden.from),
			)
		)
			allowed = false
	})
	return allowed
}

const project = (
	state: EditorState,
	query: OrgSparseTreeQuery,
	restoreSelection: EditorSelection | null,
): OrgSparseTreeState => {
	const source = state.sliceDoc()
	const plan = buildOrgSparseTreePlan(source, query)
	const offset = (raw: number) => editorOffsetFromSource(source, raw, state.lineBreak)
	// filter:false canonical projections must never reject history, nor strand a caret.
	const hiddenRanges = plan.hiddenRanges
		.map(({ from, to }) => ({ from: offset(from), to: offset(to) }))
		.filter(
			(range) => range.to > range.from && !sparseSelectionIntersects(state.selection, [range]),
		)
	return {
		decorations: Decoration.set(
			[
				...hiddenRanges.map(({ from, to }) => Decoration.replace({ block: true }).range(from, to)),
				...plan.matchedHeadingStarts.map((from) =>
					Decoration.mark({ class: "cm-org-sparse-match" }).range(
						offset(from),
						offset(from + source.slice(from).search(/[\r\n]|$/)),
					),
				),
			],
			true,
		),
		hiddenRanges,
		plan,
		query,
		restoreSelection,
	}
}

/** Window-local presentation; recomputes from the post-transaction raw source. */
export const orgSparseTreeField = StateField.define<OrgSparseTreeState | null>({
	create: () => null,
	provide: (field) => [
		EditorView.decorations.from(field, (value) => value?.decorations ?? Decoration.none),
		EditorView.atomicRanges.of((view) => view.state.field(field)?.decorations ?? Decoration.none),
		EditorState.transactionFilter.of((transaction) => {
			if (isOwnedHistory(transaction)) return transaction
			if (transaction.docChanged && !allowOrgSparseTreeSourceTransaction(transaction, () => true))
				return []
			if (transaction.effects.some((effect) => effect.is(clearOrgSparseTree))) return transaction
			const apply = transaction.effects.find((effect) => effect.is(setOrgSparseTree))
			const active = transaction.startState.field(field)
			const query = apply?.value.query ?? active?.query
			if (!query) return transaction
			const state = transaction.state
			const plan = buildOrgSparseTreePlan(state.sliceDoc(), query)
			const ranges = apply
				? plan.hiddenRanges.map(({ from, to }) => ({
						from: editorOffsetFromSource(state.sliceDoc(), from, state.lineBreak),
						to: editorOffsetFromSource(state.sliceDoc(), to, state.lineBreak),
					}))
				: (active?.hiddenRanges ?? []).map(({ from, to }) => ({
						from: transaction.changes.mapPos(from),
						to: transaction.changes.mapPos(to),
					}))
			if (!sparseSelectionIntersects(state.selection, ranges)) return transaction
			const match = plan.matchedHeadingStarts[0]
			if (match === undefined) return transaction
			const position = editorOffsetFromSource(state.sliceDoc(), match, state.lineBreak)
			return [
				transaction,
				{
					selection: EditorSelection.create(
						state.selection.ranges.map((range) => {
							if (!sparseSelectionIntersects(EditorSelection.create([range]), ranges)) return range
							const hidden = ranges.find(({ from, to }) => range.head >= from && range.head < to)
							const target =
								!apply && range.empty && hidden
									? range.head < transaction.startState.selection.main.head && hidden.from > 0
										? hidden.from - 1
										: hidden.to
									: position
							return EditorSelection.cursor(target)
						}),
						state.selection.mainIndex,
					),
					sequential: true,
				},
			]
		}),
	],
	update(value, transaction) {
		let next = value
		if (next && (transaction.docChanged || transaction.selection)) {
			next = project(
				transaction.state,
				next.query,
				next.restoreSelection?.map(transaction.changes) ?? null,
			)
		}
		// Genuine local movement supersedes the original caret, but canonical ACK/history
		// selections (addToHistory:false) must preserve its mapped restore snapshot.
		if (
			next &&
			transaction.selection &&
			!transaction.docChanged &&
			transaction.annotation(Transaction.addToHistory) !== false
		) {
			next = { ...next, restoreSelection: null }
		}
		for (const effect of transaction.effects) {
			if (effect.is(clearOrgSparseTree)) next = null
			if (effect.is(setOrgSparseTree)) {
				next = project(transaction.state, effect.value.query, effect.value.restoreSelection)
			}
		}
		return next
	},
})
