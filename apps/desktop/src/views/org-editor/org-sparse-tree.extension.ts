import { historyKeymap, redo, undo } from "@codemirror/commands"
import {
	EditorSelection,
	EditorState,
	Facet,
	Prec,
	StateEffect,
	StateField,
	Transaction,
} from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, keymap } from "@codemirror/view"
import {
	buildOrgSparseTreePlan,
	isParsedOrgSparseTreeQuery,
} from "@/pipes/org/org-sparse-tree.pipe"
import { isOrgRuntimeProjection } from "@/flows/org-editor-runtime/org-buffer-runtime"
import type { OrgSparseTreePlan, OrgSparseTreeQuery } from "@/types/org"
import { editorOffsetFromSource } from "./org-source-offset.pipe"
import { safeOrgSparseBoundaryChange } from "./org-sparse-boundary.pipe"

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
// Validate effects before their AST payload can be traversed, including filter:false.
const presentationAuthority = Facet.define<(effect: StateEffect<unknown>) => boolean>()
const unownedPresentation = (transaction: Transaction): boolean => {
	const authorities = transaction.startState.facet(presentationAuthority)
	return transaction.effects.some(
		(effect) =>
			(effect.is(setOrgSparseTree) || effect.is(clearOrgSparseTree)) &&
			(!authorities.some((owns) => owns(effect)) ||
				(effect.is(setOrgSparseTree) && !isParsedOrgSparseTreeQuery(effect.value.query))),
	)
}
const isOwnedHistory = (tr: Transaction) =>
	tr.startState.facet(ownedHistory).some((owns) => owns(tr))

// Batch authority is synchronous and private to the mounted editor, not forgeable metadata.
const ownedBatch = Facet.define<(transaction: Transaction) => boolean>()
export function createOrgSparseBatchController(getView: () => EditorView | null) {
	let depth = 0
	return {
		extension: ownedBatch.of((tr) => depth > 0 && getView()?.state === tr.startState),
		run<T>(apply: () => T): T {
			depth++
			try {
				return apply()
			} finally {
				depth--
			}
		},
	}
}

export function createOrgSparseHistoryController(
	getView: () => EditorView | null,
	knownEffect: (effect: StateEffect<unknown>) => boolean,
) {
	let depth = 0
	const issued = new WeakSet<Transaction>()
	const owns = (tr: Transaction) =>
		issued.has(tr) || (depth > 0 && getView()?.state === tr.startState)
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
			for (const tr of transactions) if (owns(tr)) issued.add(tr)
			view.update(transactions)
		},
		presentationExtension: presentationAuthority.of(knownEffect),
		extension: [
			presentationAuthority.of(knownEffect),
			ownedHistory.of(owns),
			keymap.of(
				historyKeymap.map((binding) => ({
					...binding,
					run: binding.run ? () => run(binding.run!) : undefined,
					shift: binding.shift ? () => run(binding.shift!) : undefined,
				})),
			),
			Prec.highest(
				EditorView.domEventHandlers({
					beforeinput: (event) => {
						if (event.inputType !== "historyUndo" && event.inputType !== "historyRedo") return false
						event.preventDefault()
						run(event.inputType === "historyRedo" ? redo : undo)
						return true
					},
				}),
			),
		],
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
	checkNewSelection = true,
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
	const batchOwned = transaction.startState.facet(ownedBatch).some((owns) => owns(transaction))
	transaction.changes.iterChanges((from, to, _fromB, _toB, inserted) => {
		if (
			sparse.hiddenRanges.some((hidden) =>
				from === to
					? from >= hidden.from && from < hidden.to
					: (from < hidden.to && to > hidden.from) ||
						// Do not join a visible line to the hidden heading by deleting its separator.
						(hidden.from > 0 &&
							from <= hidden.from - 1 &&
							to >= hidden.from &&
							!(
								batchOwned &&
								to === hidden.from &&
								safeOrgSparseBoundaryChange(
									transaction.startState.sliceDoc(),
									transaction.startState.sliceDoc(0, from).length,
									transaction.startState.sliceDoc(0, to).length,
									inserted.sliceString(0, inserted.length, transaction.startState.lineBreak),
								)
							)),
			)
		)
			allowed = false
	})
	if (allowed && checkNewSelection && !ownedPresentation) {
		const source = transaction.newDoc.sliceString(
			0,
			transaction.newDoc.length,
			transaction.startState.lineBreak,
		)
		const ranges = buildOrgSparseTreePlan(source, sparse.query).hiddenRanges.map(
			({ from, to }) => ({
				from: editorOffsetFromSource(source, from, transaction.startState.lineBreak),
				to: editorOffsetFromSource(source, to, transaction.startState.lineBreak),
			}),
		)
		if (sparseSelectionIntersects(transaction.newSelection, ranges)) return false
	}
	return allowed
}

const project = (
	state: EditorState,
	query: OrgSparseTreeQuery,
	restoreSelection: EditorSelection | null,
	revealSelection = false,
): OrgSparseTreeState => {
	const source = state.sliceDoc()
	const plan = buildOrgSparseTreePlan(source, query)
	const offset = (raw: number) => editorOffsetFromSource(source, raw, state.lineBreak)
	// filter:false canonical projections must never reject history, nor strand a caret.
	const hiddenRanges = plan.hiddenRanges
		.map(({ from, to }) => ({ from: offset(from), to: offset(to) }))
		.filter(
			(range) =>
				range.to > range.from &&
				(!revealSelection || !sparseSelectionIntersects(state.selection, [range])),
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
			if (unownedPresentation(transaction)) return []
			if (isOwnedHistory(transaction)) return transaction
			if (
				transaction.docChanged &&
				!allowOrgSparseTreeSourceTransaction(transaction, () => true, false)
			)
				return []
			if (transaction.effects.some((effect) => effect.is(clearOrgSparseTree))) return transaction
			const apply = transaction.effects.find((effect) => effect.is(setOrgSparseTree))
			const active = transaction.startState.field(field)
			const query = apply?.value.query ?? active?.query
			if (!query) return transaction
			const state = transaction.state
			const plan = buildOrgSparseTreePlan(state.sliceDoc(), query)
			const ranges =
				apply || transaction.docChanged
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
								!apply && !transaction.docChanged && range.empty && hidden
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
		if (unownedPresentation(transaction)) return value
		let next = value
		if (next && (transaction.docChanged || transaction.selection)) {
			next = project(
				transaction.state,
				next.query,
				next.restoreSelection?.map(transaction.changes) ?? null,
				isOwnedHistory(transaction) || isOrgRuntimeProjection(transaction),
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
