import {
	history,
	historyField,
	invertedEffects,
	isolateHistory,
	redo,
	undo,
} from "@codemirror/commands"
import { foldEffect, unfoldEffect } from "@codemirror/language"
import {
	ChangeSet,
	Compartment,
	EditorSelection,
	EditorState,
	type Extension,
	Facet,
	StateEffect,
	Transaction,
	type TransactionSpec,
} from "@codemirror/state"
import {
	minimalTextChange,
	orgSourceLineSeparator,
	orgSourceText,
	orgSemanticHistory,
	originWindow,
	rawSourceBatch,
	restoreOriginSelection,
	transactionTraits,
} from "./org-buffer-runtime.helpers"
import {
	type OrgBufferRuntime,
	type OrgBufferCommitReceipt,
	OrgBufferRuntimeError,
	type OrgBufferRuntimeOptions,
	type OrgBufferWindowHandle,
	type OrgBufferWindowOptions,
} from "./org-buffer-runtime.types"

export { orgSourceLineSeparator, orgSourceText, orgSemanticHistory } from "./org-buffer-runtime.helpers"
export * from "./org-buffer-runtime.types"

// The facet and its issuer stay private: neither annotations nor filter:false
// confer canonical projection authority on caller-created transactions.
const projectionAuthority = Facet.define<(tr: Transaction) => boolean>()

/** True only for runtime-issued window projections (including undo/redo).
 * Presentation StateFields may use this to reveal canonical/history targets.
 * Ordinary origin edits are deliberately not projections, even with filter:false.
 */
export function isOrgRuntimeProjection(tr: Transaction): boolean {
	return tr.startState.facet(projectionAuthority).some((recognize) => recognize(tr))
}
/** Presentation provenance for a history-free async projection. This issues
 * transaction identity only, never canonical commit/history/window authority. */
export function createOrgSourceProjectionAuthority() {
	const issued = new WeakSet<Transaction>()
	return {
		extension: projectionAuthority.of((transaction) => issued.has(transaction)),
		update(state: EditorState, spec: TransactionSpec): Transaction {
			const transaction = state.update({ ...spec, filter: false })
			const effects = spec.effects == null ? [] : Array.isArray(spec.effects) ? spec.effects : [spec.effects]
			if (transaction.effects.length !== effects.length || transaction.effects.some((effect, index) => effect !== effects[index])) {
				throw new OrgBufferRuntimeError("unknown-effect", "Async projection extender injected an unknown effect")
			}
			issued.add(transaction)
			void transaction.state
			return transaction
		},
	}
}

interface WindowSlot {
	readonly options: OrgBufferWindowOptions
	state: EditorState
	revision: number
	detached: boolean
}
interface Projection {
	readonly slot: WindowSlot
	readonly transactions: readonly Transaction[]
}

/** One canonical document/history reservoir. No controller, storage, focus, or DOM IO.
 * The sole UI boundary is EditorView.update with completely preflighted projections. */
export function createOrgBufferRuntime(options: OrgBufferRuntimeOptions): OrgBufferRuntime {
	const key = Object.freeze({ ...options.key })
	const sourceCompartment = new Compartment()
	const issuedProjections = new WeakSet<Transaction>()
	const issuedHistory = new WeakSet<Transaction>()
	let projectionDepth = 0
	const authorityExtension = projectionAuthority.of((tr) => issuedProjections.has(tr))
	// Force lazy StateFields while inside the private projection boundary. Mark the
	// exact transaction, not ambient callback activity, so nested local updates
	// cannot borrow authority. No issuer/controller is exposed through the facet.
	const withProjectionAuthority = (build: () => Transaction): Transaction => {
		projectionDepth++
		try {
			const tr = build()
			if (projectionDepth > 0) issuedProjections.add(tr)
			void tr.state
			return tr
		} finally {
			projectionDepth--
		}
	}
	const inversion = invertedEffects.of((tr) => {
		if (tr.changes.empty) {
			return []
		}
		const snapshots = tr.effects.filter((e) => e.is(restoreOriginSelection))
		const id = tr.annotation(originWindow) ?? snapshots.at(-1)?.value.windowId
		return id === undefined
			? []
			: [restoreOriginSelection.of({ windowId: id,
				liveTarget: issuedHistory.has(tr)
					? { selection: tr.startState.selection, changes: tr.changes.invertedDesc } : null })]
	})
	const canonicalExtensions = (separator: string): Extension => [
		history({ joinToEvent: (transaction, adjacent) => transaction.annotation(orgSemanticHistory) !== undefined || adjacent }),
		authorityExtension,
		EditorState.allowMultipleSelections.of(true),
		EditorState.lineSeparator.of(separator),
		inversion,
	]
	let state = EditorState.create({
		doc: orgSourceText(options.source),
		extensions: canonicalExtensions(orgSourceLineSeparator(options.source)),
	})
	// Exact raw Source belongs to the committed canonical state, including its separator.
	let canonicalSource = options.source
	let revision = 0,
		closed = false,
		busy = false,
		disabled = false
	let lastOrigin: string | null = null
	let semanticGroup: { readonly slot: WindowSlot; readonly id: string; readonly time: number } | null = null
	// A checkpoint of the SAME canonical state, never another document authority.
	// Provisional history mappings are discarded at settlement; one net change is
	// recorded from this checkpoint, so cancellation leaves prior undo/redo intact.
	type Composition = {
		readonly slot: WindowSlot
		readonly id: string
		readonly seed: EditorState
		readonly changes: ChangeSet
	}
	let composition: Composition | null = null
	const compositionChanges = (pending: Composition): ChangeSet => {
		// Compose retains replacements that restore the original bytes. Compare
		// only those touched ranges, never an unchanged document prefix/suffix.
		let unchanged = true
		pending.changes.iterChanges((from, to, _fromB, _toB, insert) => {
			if (unchanged && (to - from !== insert.length || !pending.seed.doc.slice(from, to).eq(insert))) {
				unchanged = false
			}
		})
		return unchanged ? ChangeSet.empty(pending.seed.doc.length) : pending.changes
	}
	const settleComposition = (
		current: EditorState,
		pending: Composition,
		changes = compositionChanges(pending),
	): EditorState => {
		const settled = changes.empty ? pending.seed.update({
			annotations: [Transaction.addToHistory.of(false), isolateHistory.of("full")], filter: false,
		}).state : pending.seed.update({
			changes,
			selection: current.selection,
			annotations: [originWindow.of(pending.slot.options.windowId), isolateHistory.of("full"),
				Transaction.userEvent.of("input.type.compose.start")],
			filter: false,
		}).state
		return EditorState.create({
			doc: current.doc,
			selection: current.selection,
			extensions: [canonicalExtensions(current.lineBreak),
				historyField.init(() => settled.field(historyField))],
		})
	}
	const windows = new Map<string, WindowSlot>()
	const commitListeners = new Set<(receipt: OrgBufferCommitReceipt) => void>()
	const guardedStates = new WeakMap<
		EditorState,
		{ slot: WindowSlot; update: EditorState["update"] }
	>()
	const fail = (
		code: ConstructorParameters<typeof OrgBufferRuntimeError>[0],
		message: string,
		cause?: unknown,
	): never => {
		throw new OrgBufferRuntimeError(code, message, cause)
	}
	const report = (error: OrgBufferRuntimeError) => {
		try {
			options.onError?.(error)
		} catch {
			/* Reporting must not corrupt committed state. */
		}
	}
	const guard = () => {
		if (closed) {
			fail("closed", "Buffer is closed")
		}
		if (busy) {
			fail("reentrant", "Reentrant buffer mutation")
		}
		if (disabled) {
			fail("disabled", "Commit callback failed; buffer mutation is disabled")
		}
	}
	const assertWindowState = (candidate: EditorState, canonical: EditorState) => {
		if (
			candidate.field(historyField, false) !== undefined ||
			candidate.lineBreak !== canonical.lineBreak ||
			!candidate.doc.eq(canonical.doc) ||
			sourceCompartment.get(candidate) === undefined
		) {
			fail(
				"invalid-window",
				"Window must be history-free and use the canonical source extensions/document",
			)
		}
	}
	const guardSlot = (slot: WindowSlot, entering = true) => {
		if (entering) {
			guard()
		}
		if (
			slot.detached ||
			windows.get(slot.options.windowId) !== slot ||
			slot.revision !== revision ||
			slot.options.view.state !== slot.state
		) {
			fail("stale-window", "Detached or stale window state/revision")
		}
		// This exact immutable state was checked at attachment/projection. The
		// identity/revision guard above makes re-comparing its body unnecessary.
	}
	const project = (projections: readonly Projection[]) => {
		for (const { slot, transactions } of projections) {
			if (!transactions.length) {
				slot.revision = revision
				continue
			}
			try {
				slot.options.view.update(transactions)
				const expected = transactions[transactions.length - 1].state
				if (slot.options.view.state !== expected) {
					throw new Error("View did not install the projected state")
				}
				slot.state = expected
				slot.revision = revision
			} catch (cause) {
				slot.detached = true
				releaseWindowUpdate(slot)
				windows.delete(slot.options.windowId)
				report(
					new OrgBufferRuntimeError(
						"projection-failed",
						`Detached failed projection: ${slot.options.windowId}`,
						cause,
					),
				)
			}
		}
	}
	const commit = (
		next: EditorState,
		projections: readonly Projection[],
		transactions: readonly Transaction[],
		origin: string | null,
		nextOrigin: string | null,
		operation: "edit" | "installation" | "command" = "edit",
		materializedSource?: string,
	) => {
		const previousSource = canonicalSource,
			source = next.lineBreak === state.lineBreak && next.doc.eq(state.doc)
				? previousSource
				: materializedSource ?? next.sliceDoc()
		const changed = source !== previousSource
		if (changed) {
			let allowed = false
			try {
				allowed = options.canCommit(previousSource, source, origin, operation)
			} catch (cause) {
				fail("callback-failed", "Commit guard threw before canonical advance", cause)
			}
			if (!allowed) {
				fail("commit-denied", "Commit guard rejected source")
			}
		}
		if (nextOrigin === null && transactions.some((transaction) => transaction.docChanged)) semanticGroup = null
		state = next
		canonicalSource = source
		lastOrigin = nextOrigin
		if (changed) revision++
		if (changed || transactions.some((transaction) => transaction.docChanged)) {
			const receipt: OrgBufferCommitReceipt = Object.freeze({
				key,
				operation,
				originWindowId: origin,
				previousSource,
				revision,
				source,
				transactions: Object.freeze([...transactions]),
			})
			const listeners = [...commitListeners]
			if (changed) {
				try {
					options.onCommit(receipt)
				} catch (cause) {
					disabled = true
					report(
						new OrgBufferRuntimeError(
							"callback-failed",
							"Canonical commit retained after callback failure",
							cause,
						),
					)
				}
			}
			for (const listener of listeners) {
				if (!commitListeners.has(listener)) continue
				try {
					listener(receipt)
				} catch (cause) {
					report(
						new OrgBufferRuntimeError(
							"callback-failed",
							"Canonical commit subscriber failed",
							cause,
						),
					)
				}
			}
		}
		project(projections)
	}
	const projectionSelection = (slot: WindowSlot, canonical: Transaction, origin?: WindowSlot) => {
		const snapshot = canonical.effects.filter((e) => e.is(restoreOriginSelection)).at(-1)
		const target = snapshot ? (windows.get(snapshot.value.windowId) ?? origin) : origin
		return target === slot ? (snapshot?.value.liveTarget?.selection ?? canonical.selection) : undefined
	}
	const projectTransaction = (
		slot: WindowSlot,
		projected: EditorState,
		canonical: Transaction,
		origin?: WindowSlot,
		local?: Transaction,
	): Transaction => {
		const separatorChanged = projected.lineBreak !== canonical.state.lineBreak
		// Install the origin's already-filtered transaction, avoiding duplicate extenders.
		const settlementSelection = local?.annotation(orgSemanticHistory)?.composition === "end" &&
			!local.state.selection.eq(canonical.state.selection, true)
		if (local && !separatorChanged && !settlementSelection) {
			if (local.startState !== projected) {
				fail("stale-window", "Local projection baseline changed")
			}
			// An unchanged local document retains the already-validated baseline.
			// Only changed documents need a new convergence comparison.
			if (!local.changes.empty || !canonical.changes.empty) assertWindowState(local.state, canonical.state)
			return local
		}
		const effects = [...(local?.effects ?? [])]
		if (separatorChanged) {
			effects.push(
				sourceCompartment.reconfigure(EditorState.lineSeparator.of(canonical.state.lineBreak)),
			)
		}
		const selection = settlementSelection ? projectionSelection(slot, canonical, origin) :
			local?.selection ?? projectionSelection(slot, canonical, origin)
		// Internal projections may reconfigure the runtime-owned source compartment.
		const update = guardedStates.get(projected)?.update ?? projected.update
		const tr = withProjectionAuthority(() => {
			const transaction = update.call(projected, {
				annotations: [...transactionTraits(local ?? canonical), Transaction.addToHistory.of(false)],
				changes: canonical.changes,
				effects,
				filter: false,
				scrollIntoView: local?.scrollIntoView ?? false,
				selection,
			})
			// Reject injected effects before evaluating lazy presentation fields.
			if (
				transaction.effects.length !== effects.length ||
				transaction.effects.some((effect, index) => effect !== effects[index])
			) {
				fail("unknown-effect", "Projection extender injected effects; entire batch rejected")
			}
			return transaction
		})
		assertWindowState(tr.state, canonical.state)
		guardWindowUpdate(slot, tr.state)
		return tr
	}
	const buildProjections = (
		canonicalTransactions: readonly Transaction[],
		origin?: WindowSlot,
		localTransactions: readonly Transaction[] = [],
	): Projection[] => {
		const projections: Projection[] = []
		for (const slot of windows.values()) {
			guardSlot(slot, false)
			let projected = slot.state
			const transactions: Transaction[] = []
			for (let i = 0; i < canonicalTransactions.length; i++) {
				const canonical = canonicalTransactions[i],
					local = slot === origin ? localTransactions[i] : undefined
				// Carets, folds and configuration belong to their window. An empty
				// canonical transaction has nothing to replay to an unrelated peer;
				// running it would still evaluate that peer's extenders/StateFields.
				if (!local && canonical.changes.empty &&
					projected.lineBreak === canonical.state.lineBreak &&
					projectionSelection(slot, canonical, origin) === undefined) continue
				const tr = projectTransaction(slot, projected, canonical, origin, local)
				projected = tr.state
				transactions.push(tr)
			}
			projections.push({ slot, transactions })
		}
		return projections
	}
	const validateEffects = (slot: WindowSlot, effects: readonly StateEffect<unknown>[]) => {
		for (const effect of effects) {
			if (effect.is(StateEffect.reconfigure) || effect.is(StateEffect.appendConfig)) {
				fail("unknown-effect", "Root configuration effects are forbidden")
			}
			if (
				!effect.is(foldEffect) &&
				!effect.is(unfoldEffect) &&
				!slot.options.knownLocalEffects?.some((type) => effect.is(type)) &&
				!slot.options.knownReconfigure?.(effect)
			) {
				fail("unknown-effect", "Unregistered window effect; entire batch rejected")
			}
		}
	}
	const validateLocalEffects = (slot: WindowSlot, tr: Transaction) =>
		validateEffects(slot, tr.effects)
	// No CM facet runs before all filters, and filter:false skips both filter facets.
	// Intercept the public state.update boundary used by EditorView.dispatch instead.
	const guardWindowUpdate = (slot: WindowSlot, candidate: EditorState) => {
		const existing = guardedStates.get(candidate)
		if (existing) {
			if (existing.slot !== slot) {
				fail("invalid-window", "An editor state cannot belong to multiple windows")
			}
			return
		}
		const update = candidate.update
		guardedStates.set(candidate, { slot, update })
		Object.defineProperty(candidate, "update", {
			configurable: true,
			value: function (this: EditorState, ...specs: TransactionSpec[]): Transaction {
				for (const spec of specs) {
					const effects = spec.effects
					validateEffects(slot, effects == null ? [] : Array.isArray(effects) ? effects : [effects])
				}
				const tr = update.apply(this, specs)
				// Filters/extenders can inject effects. Check before evaluating lazy state fields.
				validateLocalEffects(slot, tr)
				guardWindowUpdate(slot, tr.state)
				return tr
			},
		})
	}
	const releaseWindowUpdate = (slot: WindowSlot) => {
		const guarded = guardedStates.get(slot.state)
		if (guarded?.slot === slot) {
			Object.defineProperty(slot.state, "update", {
				configurable: true,
				writable: true,
				value: guarded.update,
			})
			guardedStates.delete(slot.state)
		}
	}
	const validateBatch = (slot: WindowSlot, input: readonly Transaction[]) => {
		let expected = slot.state
		for (const tr of input) {
			if (tr.startState !== expected) {
				fail("stale-window", "Transaction batch does not succeed the attached state")
			}
			validateLocalEffects(slot, tr)
			if (slot.options.preflightSourceTransaction?.(tr) === false) {
				fail("commit-denied", "Window source preflight rejected the entire batch")
			}
			if (
				tr.state.field(historyField, false) !== undefined ||
				tr.state.lineBreak !== state.lineBreak ||
				sourceCompartment.get(tr.state) === undefined
			) {
				fail("invalid-window", "Local effects must not change source policy or install history")
			}
			expected = tr.state
		}
	}
	const originTraits = (local: Transaction, windowId: string, previousOrigin: string | null) => {
		const traits = transactionTraits(local)
		if (local.docChanged && previousOrigin !== windowId) {
			const requested = local.annotation(isolateHistory)
			const index = traits.findIndex((annotation) => annotation.type === isolateHistory)
			if (index >= 0) {
				traits.splice(index, 1)
			}
			traits.push(
				isolateHistory.of(requested === "after" || requested === "full" ? "full" : "before"),
			)
		}
		return [...traits, originWindow.of(windowId)]
	}
	const dispatch = (slot: WindowSlot, input: readonly Transaction[]) => {
		guardSlot(slot)
		if (!input.length) {
			return
		}
		busy = true
		try {
			// Validate the entire caller batch BEFORE any canonical/history/view mutation.
			validateBatch(slot, input)
			let next = state,
				nextOrigin = lastOrigin
			let nextGroup = semanticGroup
			let nextComposition = composition
			const canonical: Transaction[] = []
			const committedTransactions: Transaction[] = []
			for (const local of input) {
				const semantic = local.annotation(orgSemanticHistory)
				const composing = semantic?.composition === "update"
				const ending = semantic?.composition === "end"
				if (semantic && semantic.composition !== undefined && !composing && !ending)
					fail("invalid-edit", "Unknown semantic composition phase")
				const sameComposition = nextComposition?.slot === slot && nextComposition.id === semantic?.group
				if (nextComposition && !sameComposition && (local.docChanged || semantic !== undefined ||
					nextComposition.slot !== slot && local.selection !== undefined)) {
					next = settleComposition(next, nextComposition)
					nextComposition = null
					nextGroup = null
				}
				if (composing && !nextComposition) {
					if (typeof semantic.group !== "string" || !semantic.group || semantic.group.length > 256 ||
						!(semantic.selection instanceof EditorSelection) ||
						semantic.selection.ranges.some((range) => range.from < 0 || range.to > local.startState.doc.length))
						fail("invalid-edit", "Composition must carry its exact pre-composition selection")
					const seed = next.update({ selection: semantic.selection,
						annotations: Transaction.addToHistory.of(false), filter: false }).state
					nextComposition = { slot, id: semantic.group, seed, changes: ChangeSet.empty(seed.doc.length) }
					nextGroup = null
				}
				const operation = local.docChanged && !composing && !ending ? semantic : undefined
				const continuing = operation !== undefined && nextGroup?.slot === slot && nextGroup.id === operation.group
				if (operation && !continuing) {
					if (typeof operation.group !== "string" || !operation.group || operation.group.length > 256 ||
						!(operation.selection instanceof EditorSelection) ||
						operation.selection.ranges.some((range) => range.from < 0 || range.to > local.startState.doc.length))
						fail("invalid-edit", "Semantic history must carry a valid exact pre-operation selection")
					nextGroup = { slot, id: operation.group, time: local.annotation(Transaction.time)! }
				}
				if (local.docChanged || local.selection) {
					const selection = next.update({
						annotations: Transaction.addToHistory.of(false),
						filter: false,
						selection: operation ? continuing ? next.selection : operation.selection : local.startState.selection,
					})
					committedTransactions.push(selection)
					next = selection.state
				}
				let traits = originTraits(local, slot.options.windowId, nextOrigin)
				if (composing || ending) {
					traits = traits.filter((annotation) => annotation.type !== Transaction.addToHistory)
					traits.unshift(Transaction.addToHistory.of(false))
				} else if (operation) {
					traits = traits.filter((annotation) => annotation.type !== Transaction.time && annotation.type !== Transaction.userEvent &&
						annotation.type !== isolateHistory && annotation.type !== Transaction.addToHistory)
					traits.unshift(Transaction.time.of(nextGroup!.time), Transaction.userEvent.of("input.type.modal"))
					if (!continuing) traits.unshift(isolateHistory.of("before"))
				} else if (local.docChanged && nextGroup) {
					traits.unshift(isolateHistory.of("before"))
					nextGroup = null
				}
				if (nextComposition && local.docChanged) {
					nextComposition = { ...nextComposition, changes: nextComposition.changes.compose(local.changes) }
				}
				const settlementChanges = ending && sameComposition && nextComposition
					? compositionChanges(nextComposition) : undefined
				const tr = next.update({
					annotations: traits,
					changes: local.changes,
					filter: false,
					selection: settlementChanges?.empty ? nextComposition!.seed.selection : local.selection,
				})
				next = tr.state
				canonical.push(tr)
				committedTransactions.push(tr)
				if (ending && sameComposition && nextComposition) {
					next = settleComposition(next, nextComposition, settlementChanges)
					nextComposition = null
					nextGroup = null
				}
				if (local.docChanged) {
					nextOrigin = slot.options.windowId
				}
			}
			// Projection preflight runs while busy. It checks baseline without entering the runtime guard.
			const projections = buildProjections(canonical, slot, input)
			commit(next, projections, committedTransactions, slot.options.windowId, nextOrigin)
			semanticGroup = nextGroup && !nextGroup.slot.detached ? nextGroup : null
			composition = nextComposition
		} finally {
			busy = false
		}
	}
	const runHistory = (slot: WindowSlot, command: typeof undo): boolean => {
		guardSlot(slot)
		const pendingComposition = composition
		busy = true
		try {
			const base = pendingComposition ? settleComposition(state, pendingComposition) : state
			let result: Transaction | undefined
			command({
				dispatch: (tr) => {
					result = tr
				},
				state: base,
			})
			if (!result) {
				if (pendingComposition) {
					const projections = buildProjections([])
					commit(base, projections, [], slot.options.windowId, lastOrigin)
					composition = null
				}
				semanticGroup = null
				return false
			}
			const snapshot = result.effects.filter((e) => e.is(restoreOriginSelection)).at(-1)
			const target = snapshot ? (windows.get(snapshot.value.windowId) ?? slot) : slot
			// Seed live pre-undo caret so inverse effects and redo restore it exactly.
			const seed = base.update({
				annotations: Transaction.addToHistory.of(false),
				filter: false,
				selection: target.state.selection,
			})
			command({
				dispatch: (tr) => {
					result = tr
				},
				state: seed.state,
			})
			const tr = result!
			// Classify the exact history transaction before its lazy inversion runs;
			// caller-supplied userEvent metadata is not history provenance.
			issuedHistory.add(tr)
			const projections = buildProjections([tr], target)
			const restored = tr.effects.filter((e) => e.is(restoreOriginSelection)).at(-1)?.value.liveTarget
			const restoration = restored
				? tr.state.update({
						annotations: Transaction.addToHistory.of(false),
						filter: false,
						selection: restored.selection,
					})
				: undefined
			// Selection restoration belongs to the historical origin; authority belongs to the caller.
			commit(
				restoration?.state ?? tr.state,
				projections,
				restoration ? [seed, tr, restoration] : [seed, tr],
				slot.options.windowId,
				null,
			)
			composition = null
			semanticGroup = null
			return true
		} finally {
			busy = false
		}
	}
	const runtime: OrgBufferRuntime = {
		adoptLegacyState(legacy) {
			guard()
			if (
				windows.size ||
				legacy.lineBreak !== state.lineBreak ||
				!legacy.doc.eq(state.doc)
			) {
				return false
			}
			busy = true
			try {
				// filter:false bypasses filters, NOT extenders. Never call update on a cached
				// view state: build a callback-free seed retaining the exported history value.
				const legacyHistory = legacy.field(historyField, false)
				const seed = EditorState.create({
					doc: legacy.doc,
					extensions: [
						EditorState.allowMultipleSelections.of(true),
						EditorState.lineSeparator.of(legacy.lineBreak),
						...(legacyHistory === undefined ? [] : [historyField.init(() => legacyHistory)]),
					],
					selection: legacy.selection,
				})
				state = seed.update({
					annotations: Transaction.addToHistory.of(false),
					effects: StateEffect.reconfigure.of(canonicalExtensions(legacy.lineBreak)),
					filter: false,
				}).state
				lastOrigin = null
				composition = null
				semanticGroup = null
				return true
			} finally {
				busy = false
			}
		},
		applyCommandEdit(previousExpectedSource, edit) {
			return runtime.applyCommandEdits(previousExpectedSource, [edit])
		},
		applyCommandEdits(previousExpectedSource, edits) {
			guard()
			if (previousExpectedSource !== canonicalSource) {
				fail("stale-source", "Command source baseline is stale")
			}
			const { nextSource, changes } = rawSourceBatch(previousExpectedSource, edits)
			if (nextSource === previousExpectedSource) return false
			busy = true
			try {
				const base = composition ? settleComposition(state, composition) : state
				const tr = base.update({
					annotations: [
						Transaction.addToHistory.of(true),
						isolateHistory.of("full"),
						Transaction.userEvent.of("input.org-command"),
					],
					changes,
					filter: false,
				})
				const source = tr.state.sliceDoc()
				if (source !== nextSource) {
					fail("invalid-edit", "Command edits must preserve structural separator boundaries")
				}
				const projections = buildProjections([tr])
				commit(tr.state, projections, [tr], null, null, "command", source)
				composition = null
				return true
			} finally {
				busy = false
			}
		},
		applyControllerSource(previousExpectedSource, nextSource) {
			guard()
			if (previousExpectedSource !== canonicalSource) {
				fail("stale-source", "Controller source baseline is stale")
			}
			if (nextSource === previousExpectedSource) {
				return false
			}
			busy = true
			try {
				const separator = orgSourceLineSeparator(nextSource),
					doc = orgSourceText(nextSource, separator)
				const separatorChanged = separator !== state.lineBreak
				const base = composition ? settleComposition(state, composition) : state
				const tr = base.update({
					annotations: [Transaction.addToHistory.of(false), isolateHistory.of("full")],
					changes: separatorChanged
						? { from: 0, insert: doc, to: state.doc.length }
						: minimalTextChange(state.doc, doc),
					effects: separatorChanged
						? StateEffect.reconfigure.of(canonicalExtensions(separator))
						: [],
					filter: false,
				})
				const projections = buildProjections([tr])
				// Offsets have a different coordinate system after a separator switch. Start
				// a fresh canonical history rather than map old events through a full reset.
				const next = separatorChanged
					? EditorState.create({
							doc,
							extensions: canonicalExtensions(separator),
							selection: tr.state.selection,
						})
					: tr.state
				commit(next, projections, [tr], null, null, "installation", nextSource)
				composition = null
				return true
			} finally {
				busy = false
			}
		},
		captureWindowProjection(windowId) {
			const slot = windows.get(windowId)
			if (!slot || closed || slot.detached || slot.revision !== revision || slot.options.view.state !== slot.state) return null
			const viewport = slot.options.readViewport?.()
			return { state: slot.state, scrollTop: viewport?.scrollTop ?? 0, scrollLeft: viewport?.scrollLeft ?? 0 }
		},
		attachWindow(windowOptions) {
			guard()
			if (windows.has(windowOptions.windowId)) {
				fail("invalid-window", "Window ID already attached")
			}
			assertWindowState(windowOptions.view.state, state)
			const slot: WindowSlot = {
				detached: false,
				options: windowOptions,
				revision,
				state: windowOptions.view.state,
			}
			guardWindowUpdate(slot, slot.state)
			windows.set(windowOptions.windowId, slot)
			const handle: OrgBufferWindowHandle = {
				detach() {
					if (busy) {
						fail("reentrant", "Reentrant window detach")
					}
					if (composition?.slot === slot) {
						// Closing a view cannot rewrite already accepted canonical Source.
						// Native cancellation edits use dispatch before retirement; retain
						// accepted bytes and seal history even after its grant is revoked.
						state = settleComposition(state, composition)
						composition = null
					}
					slot.detached = true
					if (semanticGroup?.slot === slot) semanticGroup = null
					releaseWindowUpdate(slot)
					if (windows.get(windowOptions.windowId) === slot) {
						windows.delete(windowOptions.windowId)
					}
				},
				dispatchTransactions: (transactions) => dispatch(slot, transactions),
				redo: () => runHistory(slot, redo),
				undo: () => runHistory(slot, undo),
			}
			return handle
		},
		subscribeCommits(listener) {
			if (closed) return () => {}
			commitListeners.add(listener)
			return () => {
				commitListeners.delete(listener)
			}
		},
		close() {
			if (busy) {
				fail("reentrant", "Reentrant close")
			}
			closed = true
			semanticGroup = null
			composition = null
			commitListeners.clear()
			for (const slot of windows.values()) {
				slot.detached = true
				releaseWindowUpdate(slot)
			}
			windows.clear()
		},
		get closed() {
			return closed
		},
		get historyFreeSourceExtensions() {
			return [
				authorityExtension,
				sourceCompartment.of(EditorState.lineSeparator.of(state.lineBreak)),
				EditorState.allowMultipleSelections.of(true),
			]
		},
		key,
		get revision() {
			return revision
		},
		get source() {
			return canonicalSource
		},
		get state() {
			return state
		},
	}
	return runtime
}
