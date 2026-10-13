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
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, WidgetType } from "@codemirror/view"
import {
	buildOrgSparseTreePlan,
	isParsedOrgSparseTreeQuery,
	OrgSparseTreeContextRequiredError,
	type OrgSparseTreeNativeContext,
} from "@/pipes/org/org-sparse-tree.pipe"
import { isOrgRuntimeProjection } from "@/flows/org-editor-runtime/org-buffer-runtime"
import type { OrgSparseTreePlan, OrgSparseTreeQuery } from "@/types/org"
import { editorOffsetFromSource } from "./org-source-offset.pipe"
import { safeOrgSparseBoundaryChange } from "./org-sparse-boundary.pipe"

type HiddenRange = { readonly from: number; readonly to: number }
export interface OrgSparseTreeState {
	readonly query: OrgSparseTreeQuery
	/** No match result is claimed while native context is pending or unavailable. */
	readonly plan: OrgSparseTreePlan | null
	readonly nativeContext: OrgSparseTreeNativeContext | undefined
	readonly contextStatus: "ready" | "pending" | "error"
	readonly contextError: string | null
	/** Effective hidden ranges in CodeMirror offsets. Canonical selection targets are revealed. */
	readonly hiddenRanges: readonly HiddenRange[]
	readonly decorations: DecorationSet
	readonly restoreSelection: EditorSelection | null
}

export const setOrgSparseTree = StateEffect.define<{
	readonly query: OrgSparseTreeQuery
	readonly restoreSelection: EditorSelection | null
	readonly nativeContext?: OrgSparseTreeNativeContext
	readonly contextError?: string
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

const sourceChangedContext = (context: OrgSparseTreeNativeContext | undefined): OrgSparseTreeNativeContext | undefined =>
	context?.specialProperties?.size ? { compareStrings: context.compareStrings } : context

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
		try {
			const ranges = buildOrgSparseTreePlan(source, sparse.query, undefined, undefined, sourceChangedContext(sparse.nativeContext)).hiddenRanges.map(
				({ from, to }) => ({
					from: editorOffsetFromSource(source, from, transaction.startState.lineBreak),
					to: editorOffsetFromSource(source, to, transaction.startState.lineBreak),
				}),
			)
			if (sparseSelectionIntersects(transaction.newSelection, ranges)) return false
		} catch (error) {
			if (!(error instanceof OrgSparseTreeContextRequiredError)) throw error
			// The post-edit view explicitly becomes pending; never reject canonical Source
			// merely because a new property value has not been collated yet.
		}
	}
	return allowed
}

class OrgSparseContextStatus extends WidgetType {
	constructor(readonly message: string) { super() }
	eq(other: OrgSparseContextStatus) { return this.message === other.message }
	toDOM() {
		const node = document.createElement("div")
		node.className = "cm-org-sparse-context-status px-2 py-1 font-mono text-xs text-muted-foreground"
		node.setAttribute("role", "status")
		node.textContent = this.message
		return node
	}
}

const unresolvedContext = (
	query: OrgSparseTreeQuery,
	restoreSelection: EditorSelection | null,
	nativeContext: OrgSparseTreeNativeContext | undefined,
	error: string | null,
): OrgSparseTreeState => ({
	query, restoreSelection, nativeContext,
	plan: null,
	hiddenRanges: [],
	contextStatus: error === null ? "pending" : "error",
	contextError: error,
	decorations: Decoration.set([Decoration.widget({
		block: true,
		side: -1,
		widget: new OrgSparseContextStatus(error === null
			? "Sparse-tree native context pending; Source is fully visible."
			: `Sparse-tree context unavailable; Source is fully visible. ${error}`),
	}).range(0)]),
})

const project = (
	state: EditorState,
	query: OrgSparseTreeQuery,
	restoreSelection: EditorSelection | null,
	revealSelection = false,
	nativeContext?: OrgSparseTreeNativeContext,
	contextError: string | null = null,
): OrgSparseTreeState => {
	const source = state.sliceDoc()
	if (contextError !== null) return unresolvedContext(query, restoreSelection, nativeContext, contextError)
	let plan: OrgSparseTreePlan
	try {
		plan = buildOrgSparseTreePlan(source, query, undefined, undefined, nativeContext)
	} catch (error) {
		if (!(error instanceof OrgSparseTreeContextRequiredError)) throw error
		return unresolvedContext(query, restoreSelection, nativeContext, null)
	}
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
		nativeContext,
		contextStatus: "ready",
		contextError: null,
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
			// A native context refresh reprojects the same query; it must not move
			// the Source caret as if the user had issued a new sparse-tree command.
			if (apply && active?.query === query) return transaction
			const state = transaction.state
			let plan: OrgSparseTreePlan
			try {
				const context = apply ? apply.value.nativeContext : active?.nativeContext
				plan = buildOrgSparseTreePlan(state.sliceDoc(), query, undefined, undefined, transaction.docChanged ? sourceChangedContext(context) : context)
			} catch (error) {
				if (!(error instanceof OrgSparseTreeContextRequiredError)) throw error
				return transaction
			}
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
				transaction.docChanged ? sourceChangedContext(next.nativeContext) : next.nativeContext,
				transaction.docChanged ? null : next.contextError,
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
				next = project(transaction.state, effect.value.query, effect.value.restoreSelection, effect.value.query === value?.query, effect.value.nativeContext, effect.value.contextError ?? null)
			}
		}
		return next
	},
})

/** Root supplies the data-only reader and this exact window's issued effect owner. */
export function orgSparseTreeNativeContextRefresh(ports: {
	readonly isCurrent: (view: EditorView) => boolean
	readonly contextIdentity: (view: EditorView) => object
	readonly source: (view: EditorView) => string
	readonly read: (source: string, query: OrgSparseTreeQuery, signal: AbortSignal) => OrgSparseTreeNativeContext | undefined | Promise<OrgSparseTreeNativeContext | undefined>
	readonly issue: (effect: StateEffect<unknown>) => StateEffect<unknown>
}) {
	return ViewPlugin.fromClass(class {
		private generation = 0
		private request: {
			readonly doc: EditorState["doc"]
			readonly query: OrgSparseTreeQuery
			readonly contextIdentity: object
			readonly abort: AbortController
		} | null = null
		private live = true
		constructor(readonly view: EditorView) { queueMicrotask(() => this.refresh()) }
		update() { this.refresh() }
		destroy() { this.live = false; this.generation++; this.request?.abort.abort(); this.request = null }
		private refresh() {
			const sparse = this.view.state.field(orgSparseTreeField, false)
			if (!this.live || !sparse || sparse.contextStatus !== "pending" || !ports.isCurrent(this.view)) {
				if (this.request) { this.generation++; this.request.abort.abort(); this.request = null }
				return
			}
			const doc = this.view.state.doc, query = sparse.query, contextIdentity = ports.contextIdentity(this.view)
			if (this.request?.doc === doc && this.request.query === query && this.request.contextIdentity === contextIdentity) return
			this.request?.abort.abort()
			const generation = ++this.generation, abort = new AbortController()
			this.request = { doc, query, contextIdentity, abort }
			const current = () => this.live && !abort.signal.aborted && generation === this.generation &&
				ports.isCurrent(this.view) && ports.contextIdentity(this.view) === contextIdentity && this.view.state.doc === doc &&
				this.view.state.field(orgSparseTreeField, false)?.query === query &&
				this.view.state.field(orgSparseTreeField, false)?.contextStatus === "pending"
			const source = ports.source(this.view)
			// Always cross a microtask before dispatch: plugin update runs inside view.update.
			void Promise.resolve().then(() => {
				if (!current()) return undefined
				return ports.read(source, query, abort.signal)
			}).then((nativeContext) => {
				if (!current()) return
				const active = this.view.state.field(orgSparseTreeField)!
				this.view.dispatch({
					annotations: Transaction.addToHistory.of(false),
					effects: ports.issue(setOrgSparseTree.of({ query, nativeContext, restoreSelection: active.restoreSelection })),
				})
				if (current()) {
					this.view.dispatch({
						annotations: Transaction.addToHistory.of(false),
						effects: ports.issue(setOrgSparseTree.of({
							query, restoreSelection: this.view.state.field(orgSparseTreeField)!.restoreSelection,
							contextError: "The native snapshot did not resolve the required sparse-tree context.",
						})),
					})
				}
			}).catch((error: unknown) => {
				if (!current()) return
				const active = this.view.state.field(orgSparseTreeField)!
				this.view.dispatch({
					annotations: Transaction.addToHistory.of(false),
					effects: ports.issue(setOrgSparseTree.of({
						query, restoreSelection: active.restoreSelection,
						contextError: error instanceof Error ? error.message : String(error),
					})),
				})
			})
		}
	})
}
