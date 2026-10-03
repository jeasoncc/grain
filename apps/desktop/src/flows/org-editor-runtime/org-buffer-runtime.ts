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
	Compartment,
	EditorState,
	type Extension,
	StateEffect,
	Transaction,
} from "@codemirror/state"
import {
	minimalTextChange,
	orgSourceLineSeparator,
	orgSourceText,
	originWindow,
	rawSourceBatch,
	restoreOriginSelection,
	transactionTraits,
} from "./org-buffer-runtime.helpers"
import {
	type OrgBufferRuntime,
	OrgBufferRuntimeError,
	type OrgBufferRuntimeOptions,
	type OrgBufferWindowHandle,
	type OrgBufferWindowOptions,
} from "./org-buffer-runtime.types"

export { orgSourceLineSeparator, orgSourceText } from "./org-buffer-runtime.helpers"
export * from "./org-buffer-runtime.types"

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
	const inversion = invertedEffects.of((tr) => {
		if (tr.changes.empty) {
			return []
		}
		const snapshots = tr.effects.filter((e) => e.is(restoreOriginSelection))
		const id = tr.annotation(originWindow) ?? snapshots.at(-1)?.value.windowId
		return id === undefined
			? []
			: [restoreOriginSelection.of({ selection: tr.startState.selection, windowId: id })]
	})
	const canonicalExtensions = (separator: string): Extension => [
		history(),
		EditorState.allowMultipleSelections.of(true),
		EditorState.lineSeparator.of(separator),
		inversion,
	]
	let state = EditorState.create({
		doc: orgSourceText(options.source),
		extensions: canonicalExtensions(orgSourceLineSeparator(options.source)),
	})
	let revision = 0,
		closed = false,
		busy = false,
		disabled = false
	let lastOrigin: string | null = null
	const windows = new Map<string, WindowSlot>()
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
			candidate.sliceDoc() !== canonical.sliceDoc() ||
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
		assertWindowState(slot.state, state)
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
		origin: string | null,
		nextOrigin: string | null,
		operation: "edit" | "installation" | "command" = "edit",
	) => {
		const previousSource = state.sliceDoc(),
			source = next.sliceDoc()
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
		state = next
		lastOrigin = nextOrigin
		if (changed) {
			revision++
			try {
				options.onCommit(
					Object.freeze({ key, originWindowId: origin, previousSource, revision, source }),
				)
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
		project(projections)
	}
	const projectionSelection = (slot: WindowSlot, canonical: Transaction, origin?: WindowSlot) => {
		const snapshot = canonical.effects.filter((e) => e.is(restoreOriginSelection)).at(-1)
		const target = snapshot ? (windows.get(snapshot.value.windowId) ?? origin) : origin
		return target === slot ? (snapshot?.value.selection ?? canonical.selection) : undefined
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
		if (local && !separatorChanged) {
			if (local.startState !== projected) {
				fail("stale-window", "Local projection baseline changed")
			}
			assertWindowState(local.state, canonical.state)
			return local
		}
		const effects = [...(local?.effects ?? [])]
		if (separatorChanged) {
			effects.push(
				sourceCompartment.reconfigure(EditorState.lineSeparator.of(canonical.state.lineBreak)),
			)
		}
		const selection = local?.selection ?? projectionSelection(slot, canonical, origin)
		const tr = projected.update({
			annotations: [...transactionTraits(local ?? canonical), Transaction.addToHistory.of(false)],
			changes: canonical.changes,
			effects,
			filter: false,
			scrollIntoView: local?.scrollIntoView ?? false,
			selection,
		})
		// Peer extenders must not inject window effects into a source-only projection.
		if (
			tr.effects.length !== effects.length ||
			tr.effects.some((effect, index) => effect !== effects[index])
		) {
			fail("unknown-effect", "Projection extender injected effects; entire batch rejected")
		}
		assertWindowState(tr.state, canonical.state)
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
				const tr = projectTransaction(slot, projected, canonical, origin, local)
				projected = tr.state
				transactions.push(tr)
			}
			projections.push({ slot, transactions })
		}
		return projections
	}
	const validateLocalEffects = (slot: WindowSlot, tr: Transaction) => {
		for (const effect of tr.effects) {
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
			const canonical: Transaction[] = []
			for (const local of input) {
				next = next.update({
					annotations: Transaction.addToHistory.of(false),
					filter: false,
					selection: local.startState.selection,
				}).state
				const tr = next.update({
					annotations: originTraits(local, slot.options.windowId, nextOrigin),
					changes: local.changes,
					filter: false,
					selection: local.selection,
				})
				next = tr.state
				canonical.push(tr)
				if (local.docChanged) {
					nextOrigin = slot.options.windowId
				}
			}
			// Projection preflight runs while busy. It checks baseline without entering the runtime guard.
			const projections = buildProjections(canonical, slot, input)
			commit(next, projections, slot.options.windowId, nextOrigin)
		} finally {
			busy = false
		}
	}
	const runHistory = (slot: WindowSlot, command: typeof undo): boolean => {
		guardSlot(slot)
		busy = true
		try {
			let result: Transaction | undefined
			command({
				dispatch: (tr) => {
					result = tr
				},
				state,
			})
			if (!result) {
				return false
			}
			const snapshot = result.effects.filter((e) => e.is(restoreOriginSelection)).at(-1)
			const target = snapshot ? (windows.get(snapshot.value.windowId) ?? slot) : slot
			// Seed live pre-undo caret so inverse effects and redo restore it exactly.
			const seeded = state.update({
				annotations: Transaction.addToHistory.of(false),
				filter: false,
				selection: target.state.selection,
			}).state
			command({
				dispatch: (tr) => {
					result = tr
				},
				state: seeded,
			})
			const tr = result!
			const projections = buildProjections([tr], target)
			const restored = tr.effects.filter((e) => e.is(restoreOriginSelection)).at(-1)
			const next = restored
				? tr.state.update({
						annotations: Transaction.addToHistory.of(false),
						filter: false,
						selection: restored.value.selection,
					}).state
				: tr.state
			// Selection restoration belongs to the historical origin; authority belongs to the caller.
			commit(next, projections, slot.options.windowId, null)
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
				legacy.sliceDoc() !== state.sliceDoc() ||
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
			if (previousExpectedSource !== state.sliceDoc()) {
				fail("stale-source", "Command source baseline is stale")
			}
			const { nextSource, changes } = rawSourceBatch(previousExpectedSource, edits)
			if (nextSource === previousExpectedSource) return false
			busy = true
			try {
				const tr = state.update({
					annotations: [
						Transaction.addToHistory.of(true),
						isolateHistory.of("full"),
						Transaction.userEvent.of("input.org-command"),
					],
					changes,
					filter: false,
				})
				if (tr.state.sliceDoc() !== nextSource) {
					fail("invalid-edit", "Command edits must preserve structural separator boundaries")
				}
				const projections = buildProjections([tr])
				commit(tr.state, projections, null, null, "command")
				return true
			} finally {
				busy = false
			}
		},
		applyControllerSource(previousExpectedSource, nextSource) {
			guard()
			if (previousExpectedSource !== state.sliceDoc()) {
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
				const tr = state.update({
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
				commit(next, projections, null, null, "installation")
				return true
			} finally {
				busy = false
			}
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
			windows.set(windowOptions.windowId, slot)
			const handle: OrgBufferWindowHandle = {
				detach() {
					if (busy) {
						fail("reentrant", "Reentrant window detach")
					}
					slot.detached = true
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
		close() {
			if (busy) {
				fail("reentrant", "Reentrant close")
			}
			closed = true
			for (const slot of windows.values()) {
				slot.detached = true
			}
			windows.clear()
		},
		get closed() {
			return closed
		},
		get historyFreeSourceExtensions() {
			return [
				sourceCompartment.of(EditorState.lineSeparator.of(state.lineBreak)),
				EditorState.allowMultipleSelections.of(true),
			]
		},
		key,
		get revision() {
			return revision
		},
		get source() {
			return state.sliceDoc()
		},
		get state() {
			return state
		},
	}
	return runtime
}
