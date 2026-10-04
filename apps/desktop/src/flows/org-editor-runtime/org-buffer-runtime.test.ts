import {
	history,
	historyField,
	isolateHistory,
	redoDepth,
	undo,
	undoDepth,
} from "@codemirror/commands"
import { codeFolding, foldEffect, foldedRanges } from "@codemirror/language"
import {
	Compartment,
	EditorSelection,
	EditorState,
	StateEffect,
	type StateEffectType,
	StateField,
	Transaction,
} from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
	createOrgBufferRuntime,
	isOrgRuntimeProjection,
	type OrgBufferRuntime,
	OrgBufferRuntimeError,
	type OrgBufferWindowHandle,
} from "./org-buffer-runtime"
import { createOrgWindowEffectRegistry } from "./org-window-effects"
import { setOrgSparseTree } from "@/views/org-editor/org-sparse-tree.extension"
import type { OrgSparseTreeQuery } from "@/types/org"

const views: EditorView[] = []
afterEach(() => {
	for (const view of views.splice(0)) {
		view.destroy()
	}
})
const key = { bufferId: "buffer", workspaceSessionId: "session" }
function buffer(
	source = "abcdef",
	overrides: Partial<Parameters<typeof createOrgBufferRuntime>[0]> = {},
) {
	const onCommit = vi.fn()
	const runtime = createOrgBufferRuntime({
		canCommit: () => true,
		key,
		onCommit,
		source,
		...overrides,
	})
	return { onCommit, runtime }
}
function window(
	runtime: OrgBufferRuntime,
	id: string,
	extra: Parameters<typeof EditorState.create>[0] = {},
	registry?: ReturnType<typeof createOrgWindowEffectRegistry>,
	knownLocalEffects?: readonly StateEffectType<unknown>[],
) {
	let handle: OrgBufferWindowHandle | undefined
	const view = new EditorView({
		dispatchTransactions: (trs) => handle!.dispatchTransactions(trs),
		parent: document.body,
		state: EditorState.create({
			...extra,
			doc: runtime.state.doc,
			extensions: [runtime.historyFreeSourceExtensions, extra.extensions ?? []],
		}),
	})
	views.push(view)
	handle = runtime.attachWindow({
		knownLocalEffects,
		knownReconfigure: registry?.knownEffect,
		view,
		windowId: id,
	})
	return { handle, view }
}
function type(view: EditorView, text: string, time = 1000) {
	const pos = view.state.selection.main.head
	view.dispatch({
		annotations: [Transaction.userEvent.of("input.type"), Transaction.time.of(time)],
		changes: { from: pos, insert: text },
		selection: EditorSelection.cursor(pos + text.length),
	})
}
function expectCode(fn: () => unknown, code: string) {
	try {
		fn()
		throw new Error("Expected rejection")
	} catch (error) {
		expect(error).toBeInstanceOf(OrgBufferRuntimeError)
		expect((error as OrgBufferRuntimeError).code).toBe(code)
	}
}

describe("canonical Org buffer/window runtime", () => {
	it("grants private projection authority to peers, controller edits, and history only", () => {
		const { runtime } = buffer()
		const seen: { tr: Transaction; authority: boolean }[] = []
		const observe = StateField.define<null>({
			create: () => null,
			update(value, tr) {
				seen.push({ tr, authority: isOrgRuntimeProjection(tr) })
				return value
			},
		})
		const a = window(runtime, "a", { extensions: observe })
		const b = window(runtime, "b", { extensions: observe })
		a.view.dispatch({ changes: { from: 0, insert: "X" }, filter: false })
		expect(seen.map(({ authority }) => authority)).toEqual([false, true])
		const peer = seen[1].tr
		expect(isOrgRuntimeProjection(peer)).toBe(true)
		seen.length = 0
		// Copying traits from a genuine projection cannot grant authority.
		const forged = a.view.state.update({
			annotations: [Transaction.addToHistory.of(false)],
			filter: false,
			selection: peer.selection,
		})
		expect(isOrgRuntimeProjection(forged)).toBe(false)
		expect(seen.map(({ authority }) => authority)).toEqual([false])
		seen.length = 0
		expect(a.handle.undo()).toBe(true)
		expect(seen.map(({ authority }) => authority)).toEqual([true, true])
		seen.length = 0
		expect(b.handle.redo()).toBe(true)
		expect(seen.map(({ authority }) => authority)).toEqual([true, true])
		seen.length = 0
		runtime.applyControllerSource(runtime.source, "replacement")
		expect(seen.map(({ authority }) => authority)).toEqual([true, true])
		seen.length = 0
		runtime.applyCommandEdit(runtime.source, { from: 0, to: 0, insert: "!", cursor: 1 })
		expect(seen.map(({ authority }) => authority)).toEqual([true, true])
	})

	it.each([true, false])("denies forged cyclic AST before filters (filter=%s)", (filter) => {
		const { runtime, onCommit } = buffer("* TODO heading\nbody")
		const filterSpy = vi.fn((tr: Transaction) => {
			// A presentation filter must never get an opportunity to traverse this payload.
			for (const effect of tr.effects) {
				if (effect.is(setOrgSparseTree)) throw new Error("forged AST reached filter")
			}
			return tr
		})
		const changeFilter = vi.fn(() => true)
		const registry = createOrgWindowEffectRegistry([], [setOrgSparseTree])
		const a = window(
			runtime,
			"a",
			{
				extensions: [
					EditorState.transactionFilter.of(filterSpy),
					EditorState.changeFilter.of(changeFilter),
				],
			},
			registry,
		)
		const b = window(runtime, "b")
		const before = a.view.state
		const canonical = runtime.state
		const update = vi.spyOn(b.view, "update")
		const cyclic = { kind: "not" } as { kind: "not"; operand: OrgSparseTreeQuery }
		cyclic.operand = cyclic
		// Same registered presentation type, but not issued by this window's registry.
		const forged = setOrgSparseTree.of({ query: cyclic, restoreSelection: null })
		expectCode(
			() => a.view.dispatch({ changes: { from: 0, insert: "X" } }, { effects: forged, filter }),
			"unknown-effect",
		)
		expect(filterSpy).not.toHaveBeenCalled()
		expect(changeFilter).not.toHaveBeenCalled()
		expect(a.view.state).toBe(before)
		expect(runtime.state).toBe(canonical)
		expect(runtime.revision).toBe(0)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(onCommit).not.toHaveBeenCalled()
		expect(update).not.toHaveBeenCalled()
		// Explicitly issued presentation effects still work, including filter:false.
		a.view.dispatch({
			effects: registry.localEffect(
				setOrgSparseTree.of({
					query: { kind: "todo" },
					restoreSelection: null,
				}),
			),
			filter: false,
		})
		// New origin and peer states retain the guard after projection.
		type(a.view, "safe")
		filterSpy.mockClear()
		changeFilter.mockClear()
		expectCode(() => a.view.dispatch({ effects: forged, filter }), "unknown-effect")
		expectCode(() => b.view.dispatch({ effects: forged, filter }), "unknown-effect")
		expect(filterSpy).not.toHaveBeenCalled()
		expect(changeFilter).not.toHaveBeenCalled()
	})
	it.each([
		"\n",
		"\r\n",
		"\r",
		"\r\nbare\n",
	])("command batches retain sparse ranges and original coordinates (%j)", (eol) => {
		const source = `* TODO first${eol}unchanged middle${eol}* TODO last${eol}`
		const canCommit = vi.fn(() => true)
		const { runtime, onCommit } = buffer(source, { canCommit })
		const middle = runtime.state.doc.line(2).from + 3
		const a = window(runtime, "a", { selection: EditorSelection.cursor(middle) })
		const b = window(runtime, "b")
		const update = vi.spyOn(a.view, "update")
		const last = source.lastIndexOf("TODO")
		const lastOffset =
			last -
			(runtime.state.lineBreak === "\r\n" ? (source.slice(0, last).match(/\r\n/g)?.length ?? 0) : 0)
		const edits = [
			{ from: 2, to: 6, insert: "COMPLETED", cursor: 0 },
			{ from: last, to: last + 4, insert: "DONE", cursor: 0 },
		] as const
		expect(runtime.applyCommandEdits(source, edits)).toBe(true)
		const next =
			source.slice(0, 2) + "COMPLETED" + source.slice(6, last) + "DONE" + source.slice(last + 4)
		expect(runtime.source).toBe(next)
		expect(runtime.revision).toBe(1)
		expect(canCommit).toHaveBeenCalledExactlyOnceWith(source, next, null, "command")
		expect(onCommit).toHaveBeenCalledTimes(1)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(a.view.state.selection.main.head).toBe(middle + 5)
		expect(b.view.state.sliceDoc()).toBe(next)
		const ranges: [number, number][] = []
		update.mock.calls[0][0][0].changes.iterChangedRanges((from, to) => ranges.push([from, to]))
		expect(ranges).toEqual([
			[2, 6],
			[lastOffset, lastOffset + 4],
		])
		expect(b.handle.undo()).toBe(true)
		expect(runtime.source).toBe(source)
		expect(b.handle.redo()).toBe(true)
		expect(runtime.source).toBe(next)
	})
	it("rejects invalid command batches before guards, history, callbacks or projections", () => {
		const source = "abc\r\ndef"
		const canCommit = vi.fn(() => true)
		const { runtime, onCommit } = buffer(source, { canCommit })
		const a = window(runtime, "a")
		const update = vi.spyOn(a.view, "update")
		const before = runtime.state
		const edit = (from: number, to: number, insert = "X") => ({ from, to, insert, cursor: 0 })
		for (const edits of [
			[edit(0, 1), edit(-1, 0)],
			[edit(5, 6), edit(0, 1)],
			[edit(0, 2), edit(1, 3)],
			[edit(0, 0), edit(0, 1)],
			[edit(4, 4)],
			[edit(0.5, 1)],
			[edit(0, 99)],
			[edit(0, 1), edit(5, 6, 1 as unknown as string)],
			[edit(3, 5, "\n")],
		])
			expectCode(() => runtime.applyCommandEdits(source, edits), "invalid-edit")
		expectCode(() => runtime.applyCommandEdits("stale", []), "stale-source")
		expect(runtime.applyCommandEdits(source, [])).toBe(false)
		expect(runtime.applyCommandEdits(source, [edit(0, 1, "a")])).toBe(false)
		expect(runtime.state).toBe(before)
		expect(runtime.revision).toBe(0)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(canCommit).not.toHaveBeenCalled()
		expect(onCommit).not.toHaveBeenCalled()
		expect(update).not.toHaveBeenCalled()
	})
	it("denies an entire valid command batch without effects", () => {
		const { runtime, onCommit } = buffer("abcdef", { canCommit: () => false })
		const a = window(runtime, "a")
		const before = runtime.state
		expectCode(
			() =>
				runtime.applyCommandEdits(runtime.source, [
					{ from: 0, to: 1, insert: "X", cursor: 0 },
					{ from: 4, to: 5, insert: "Y", cursor: 0 },
				]),
			"commit-denied",
		)
		expect(runtime.state).toBe(before)
		expect(a.view.state.sliceDoc()).toBe("abcdef")
		expect(onCommit).not.toHaveBeenCalled()
	})
	it.each(["\n", "\r\n", "\r"])("commands use raw coordinates and isolated history (%j)", (eol) => {
		const source = `* TODO first${eol}* TODO second${eol}`
		const { runtime, onCommit } = buffer(source)
		const a = window(runtime, "a")
		const b = window(runtime, "b")
		type(a.view, "x", 1000)
		const expected = runtime.source
		const from = expected.indexOf("TODO second")
		expect(
			runtime.applyCommandEdit(expected, { from, to: from + 4, insert: "DONE", cursor: from + 4 }),
		).toBe(true)
		expect(onCommit.mock.calls.at(-1)?.[0].originWindowId).toBeNull()
		expect(runtime.revision).toBe(2)
		expect(a.view.state.sliceDoc()).toBe(runtime.source)
		expect(b.view.state.sliceDoc()).toBe(runtime.source)
		type(a.view, "y", 1001)
		expect(undoDepth(runtime.state)).toBe(3)
		expect(b.handle.undo()).toBe(true)
		expect(b.handle.undo()).toBe(true)
		expect(runtime.source).toBe(expected)
		expect(b.handle.redo()).toBe(true)
		expect(runtime.source).toContain("DONE second")
	})
	it("commands reject stale, invalid and denied edits without changing history or views", () => {
		const { runtime } = buffer("* TODO task", { canCommit: () => false })
		const a = window(runtime, "a")
		const before = runtime.state
		const edit = { from: 2, to: 6, insert: "DONE", cursor: 6 }
		expectCode(() => runtime.applyCommandEdit("stale", edit), "stale-source")
		expectCode(
			() => runtime.applyCommandEdit(runtime.source, { ...edit, from: -1 }),
			"invalid-edit",
		)
		expectCode(() => runtime.applyCommandEdit(runtime.source, edit), "commit-denied")
		expect(runtime.state).toBe(before)
		expect(a.view.state.sliceDoc()).toBe("* TODO task")
		expect(undoDepth(runtime.state)).toBe(0)
	})
	it.each([
		"",
		"x\n",
		"x\r\ny\r\n",
		"x\ry\r",
		"a\r\nb\nc\rd\r\n\0🦊é",
		"\0🦊\nEOF",
	])("roundtrips raw fixture %j with history-free projections", (source) => {
		const { runtime } = buffer(source)
		const a = window(runtime, "a"),
			b = window(runtime, "b")
		expect(runtime.source).toBe(source)
		expect(a.view.state.sliceDoc()).toBe(source)
		expect(b.view.state.sliceDoc()).toBe(source)
		expect(runtime.state.field(historyField, false)).toBeDefined()
		for (const view of [a.view, b.view]) {
			expect(undoDepth(view.state)).toBe(0)
			expect(redoDepth(view.state)).toBe(0)
		}
		type(a.view, "Z")
		expect(runtime.source).toBe(`Z${source}`)
		expect(b.view.state.sliceDoc()).toBe(runtime.source)
		expect(a.handle.undo()).toBe(true)
		expect(runtime.source).toBe(source)
		expect(a.handle.redo()).toBe(true)
		expect(runtime.source).toBe(`Z${source}`)
	})
	it("groups 400ms typing, exact pre-edit caret, and origin changes isolate groups", () => {
		const { runtime, onCommit } = buffer()
		const a = window(runtime, "a"),
			b = window(runtime, "b")
		a.view.dispatch({ selection: EditorSelection.cursor(3) })
		b.view.dispatch({ selection: EditorSelection.cursor(1) })
		type(a.view, "X", 1000)
		type(a.view, "Y", 1400)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(b.view.state.selection.main.head).toBe(1)
		expect(b.handle.undo()).toBe(true)
		expect(runtime.source).toBe("abcdef")
		expect(a.view.state.selection.main.head).toBe(3)
		expect(b.view.state.selection.main.head).toBe(1)
		expect(b.handle.redo()).toBe(true)
		expect(a.view.state.selection.main.head).toBe(5)
		type(b.view, "Q", 1450)
		expect(undoDepth(runtime.state)).toBe(2)
		a.handle.undo()
		expect(runtime.source).toBe("abcXYdef")
		expect(b.view.state.selection.main.head).toBe(1)
		expect(onCommit).toHaveBeenCalledTimes(6)
		expect(onCommit.mock.calls[0][0]).toMatchObject({
			originWindowId: "a",
			previousSource: "abcdef",
			revision: 1,
			source: "abcXdef",
		})
	})
	it("restores complete multi-range selections and maps peers", () => {
		const { runtime } = buffer("abcdefghij")
		const a = window(runtime, "a"),
			b = window(runtime, "b")
		const initial = EditorSelection.create(
			[EditorSelection.range(4, 2), EditorSelection.cursor(8, -1, 2, 42)],
			1,
		)
		a.view.dispatch({ selection: initial })
		b.view.dispatch({ selection: EditorSelection.cursor(9) })
		const spec = a.view.state.changeByRange((range) => ({
			changes: { from: range.from, insert: "X", to: range.to },
			range: EditorSelection.cursor(range.from + 1),
		}))
		a.view.dispatch({ ...spec, userEvent: "input.type" })
		const after = a.view.state.selection
		expect(b.view.state.selection.main.head).toBe(9)
		b.handle.undo()
		expect(a.view.state.selection.eq(initial, true)).toBe(true)
		expect(a.view.state.selection.ranges).toEqual(initial.ranges)
		b.handle.redo()
		expect(a.view.state.selection.eq(after, true)).toBe(true)
		expect(undoDepth(a.view.state)).toBe(0)
	})
	it("undo after origin detach restores live main view without resurrecting slots", () => {
		const { runtime } = buffer()
		const a = window(runtime, "a"),
			b = window(runtime, "main")
		a.view.dispatch({ selection: EditorSelection.cursor(4) })
		type(a.view, "Z")
		a.handle.detach()
		expect(b.handle.undo()).toBe(true)
		expect(runtime.source).toBe("abcdef")
		expect(b.view.state.selection.main.head).toBe(4)
		expectCode(() => type(a.view, "bad"), "stale-window")
		expect(b.handle.redo()).toBe(true)
		expect(b.view.state.selection.main.head).toBe(0)
	})
	it("keeps folds, configuration and scroll local, does not refilter replay", () => {
		const config = new Compartment(),
			registry = createOrgWindowEffectRegistry([config])
		const filter = vi.fn(() => true)
		const { runtime } = buffer("heading\n  body\nend")
		const a = window(
			runtime,
			"a",
			{ extensions: [codeFolding(), config.of([]), EditorState.changeFilter.of(filter)] },
			registry,
		)
		const b = window(runtime, "b", { extensions: codeFolding() })
		const peerUpdate = vi.spyOn(b.view, "update")
		a.view.dispatch({
			effects: [
				foldEffect.of({ from: 7, to: 14 }),
				registry.reconfigure(config, EditorView.editable.of(false)),
				registry.scrollIntoView(7),
			],
			scrollIntoView: true,
			selection: EditorSelection.cursor(2),
		})
		expect(filter).toHaveBeenCalledTimes(1)
		expect(foldedRanges(a.view.state).size).toBe(1)
		expect(foldedRanges(b.view.state).size).toBe(0)
		expect(a.view.state.facet(EditorView.editable)).toBe(false)
		expect(b.view.state.facet(EditorView.editable)).toBe(true)
		expect(peerUpdate.mock.calls[0][0][0].scrollIntoView).toBe(false)
		expect(peerUpdate.mock.calls[0][0][0].effects).toHaveLength(0)
		expect(b.view.state.selection.main.head).toBe(0)
	})
	it("preflights chained batches once and rejects a late unknown effect atomically", () => {
		const { runtime, onCommit } = buffer()
		const a = window(runtime, "a"),
			b = window(runtime, "b")
		const update = vi.spyOn(b.view, "update")
		const first = a.view.state.update({ changes: { from: 0, insert: "1" } })
		// Bypass the input boundary to also exercise the resolved-batch defense.
		const bad = EditorState.prototype.update.call(first.state, {
			changes: { from: 1, insert: "2" },
			effects: StateEffect.define().of(null),
		})
		expectCode(() => a.handle.dispatchTransactions([first, bad]), "unknown-effect")
		expect(runtime.source).toBe("abcdef")
		expect(update).not.toHaveBeenCalled()
		expect(onCommit).not.toHaveBeenCalled()
		const second = first.state.update({ changes: { from: 1, insert: "2" } })
		a.handle.dispatchTransactions([first, second])
		expect(runtime.source).toBe("12abcdef")
		expect(update).toHaveBeenCalledTimes(1)
		expect(onCommit).toHaveBeenCalledTimes(1)
		expect(runtime.revision).toBe(1)
		expect(a.view.state.sliceDoc()).toBe(runtime.source)
	})
	it("rejects stale identity/ABA, batch succession, equal-doc different state and closed entry", () => {
		const { runtime } = buffer()
		const a = window(runtime, "a")
		const stale = a.view.state.update({ changes: { from: 0, insert: "old" } })
		type(a.view, "Z")
		a.handle.undo()
		expect(runtime.source).toBe("abcdef")
		expectCode(() => a.handle.dispatchTransactions([stale]), "stale-window")
		const first = a.view.state.update({ changes: { from: 0, insert: "1" } })
		const unrelated = a.view.state.update({ changes: { from: 0, insert: "2" } })
		expectCode(() => a.handle.dispatchTransactions([first, unrelated]), "stale-window")
		a.view.setState(
			EditorState.create({
				doc: runtime.state.doc,
				extensions: runtime.historyFreeSourceExtensions,
			}),
		)
		expectCode(() => type(a.view, "X"), "stale-window")
		runtime.close()
		expectCode(() => runtime.applyControllerSource("abcdef", "other"), "closed")
	})
	it("controller edits are guarded, minimal, history-free, and coherently reset separators", () => {
		const { runtime } = buffer("abc\ndef")
		const a = window(runtime, "a"),
			b = window(runtime, "b")
		b.view.dispatch({ selection: EditorSelection.cursor(6) })
		expectCode(() => runtime.applyControllerSource("stale", "bad"), "stale-source")
		runtime.applyControllerSource("abc\ndef", "aXc\ndef")
		expect(b.view.state.selection.main.head).toBe(6)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(runtime.applyControllerSource(runtime.source, runtime.source)).toBe(false)
		runtime.applyControllerSource(runtime.source, "a\r\nb\nc\r\0🦊\r\n")
		expect(runtime.source).toBe("a\r\nb\nc\r\0🦊\r\n")
		for (const view of [a.view, b.view]) {
			expect(view.state.sliceDoc()).toBe(runtime.source)
			expect(view.state.lineBreak).toBe("\r\n")
			expect(undoDepth(view.state)).toBe(0)
		}
		type(a.view, "Y")
		a.handle.undo()
		expect(runtime.source).toBe("a\r\nb\nc\r\0🦊\r\n")
	})
	it("adopts both history branches without private extensions/callbacks", () => {
		const callback = vi.fn()
		let legacy = EditorState.create({
			doc: "abcdef",
			extensions: [
				history(),
				EditorState.lineSeparator.of("\n"),
				EditorState.transactionExtender.of(callback),
			],
			selection: EditorSelection.cursor(3),
		})
		legacy = legacy.update({
			changes: { from: 3, insert: "X" },
			selection: EditorSelection.cursor(4),
			userEvent: "input.type",
		}).state
		legacy = legacy.update({
			annotations: Transaction.time.of(Date.now() + 2000),
			changes: { from: 4, insert: "Y" },
			selection: EditorSelection.cursor(5),
			userEvent: "input.type",
		}).state
		undo({
			dispatch: (tr) => {
				legacy = tr.state
			},
			state: legacy,
		})
		const { runtime } = buffer(legacy.sliceDoc())
		expect(undoDepth(legacy)).toBe(1)
		expect(redoDepth(legacy)).toBe(1)
		callback.mockClear()
		expect(runtime.adoptLegacyState(legacy)).toBe(true)
		expect(runtime.state.field(historyField)).toBe(legacy.field(historyField))
		const a = window(runtime, "a")
		expect(a.handle.redo()).toBe(true)
		expect(runtime.source).toBe("abcXYdef")
		expect(a.handle.undo()).toBe(true)
		expect(runtime.source).toBe("abcXdef")
		expect(a.handle.undo()).toBe(true)
		expect(runtime.source).toBe("abcdef")
		expect(callback).not.toHaveBeenCalled()
		expect(runtime.adoptLegacyState(legacy)).toBe(false)
	})
	it("rejects attached history and incompatible source policies", () => {
		const { runtime } = buffer("a\r\nb")
		const view = new EditorView({
			parent: document.body,
			state: EditorState.create({
				doc: runtime.state.doc,
				extensions: [runtime.historyFreeSourceExtensions, history()],
			}),
		})
		views.push(view)
		expectCode(() => runtime.attachWindow({ view, windowId: "bad" }), "invalid-window")
		const { runtime: other } = buffer("a\r\nb")
		const legacy = EditorState.create({ doc: "a\r\nb" })
		expect(other.adoptLegacyState(legacy)).toBe(false)
	})
	it("guards callbacks before advance, rejects reentrance and preserves commit after onCommit throws", () => {
		let runtime: OrgBufferRuntime
		const errors: unknown[] = []
		const canCommit = vi.fn(() => {
			expectCode(() => runtime.applyControllerSource(runtime.source, "nested"), "reentrant")
			return false
		})
		runtime = buffer("abcdef", { canCommit }).runtime
		const a = window(runtime, "a")
		expectCode(() => type(a.view, "Z"), "commit-denied")
		expect(runtime.source).toBe("abcdef")
		expect(a.view.state.sliceDoc()).toBe("abcdef")
		runtime = buffer("abcdef", {
			onCommit: () => {
				expectCode(() => runtime.close(), "reentrant")
				throw new Error("mirror failed")
			},
			onError: (error) => errors.push(error),
		}).runtime
		const b = window(runtime, "b")
		type(b.view, "Q")
		expect(runtime.source).toBe("Qabcdef")
		expect(b.view.state.sliceDoc()).toBe(runtime.source)
		expect((errors[0] as OrgBufferRuntimeError).code).toBe("callback-failed")
		expectCode(() => type(b.view, "Z"), "disabled")
		b.handle.detach()
		runtime.close()
		expect(runtime.closed).toBe(true)
	})
	it.each([
		["a\r\nb\nc", "a\nb\r\nc"],
		["a\rb\nc", "a\nb\rc"],
		["\0🦊\r\n\nEOF", "\0🦋\n\r\nEOF"],
	])("distinguishes literal LF from line boundaries in minimal edits %j", (previous, next) => {
		const { runtime } = buffer(previous)
		const a = window(runtime, "a")
		runtime.applyControllerSource(previous, next)
		expect(runtime.source).toBe(next)
		expect(a.view.state.sliceDoc()).toBe(next)
		runtime.applyControllerSource(next, previous)
		expect(runtime.source).toBe(previous)
	})
	it("external edits map prior history without becoming an event; separator resets history", () => {
		const { runtime } = buffer("abc\ndef")
		const a = window(runtime, "a")
		type(a.view, "Z")
		runtime.applyControllerSource("Zabc\ndef", "Zabc\ndef!")
		expect(undoDepth(runtime.state)).toBe(1)
		a.handle.undo()
		expect(runtime.source).toBe("abc\ndef!")
		a.handle.redo()
		expect(runtime.source).toBe("Zabc\ndef!")
		runtime.applyControllerSource(runtime.source, "Zabc\r\ndef!")
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(a.handle.undo()).toBe(false)
		expect(a.view.state.sliceDoc()).toBe("Zabc\r\ndef!")
	})
	it("does not rerun origin extenders, rejects injected peer effects atomically", () => {
		const extender = vi.fn(() => null)
		const { runtime } = buffer()
		const a = window(runtime, "a", { extensions: EditorState.transactionExtender.of(extender) })
		type(a.view, "Z")
		expect(extender).toHaveBeenCalledTimes(1)
		const unknown = StateEffect.define()
		window(runtime, "bad-peer", {
			extensions: EditorState.transactionExtender.of(() => ({ effects: unknown.of(null) })),
		})
		expectCode(() => type(a.view, "X"), "unknown-effect")
		expect(runtime.source).toBe("Zabcdef")
		expect(a.view.state.sliceDoc()).toBe(runtime.source)
	})
	it("rejects a registered configuration that installs history", () => {
		const compartment = new Compartment(),
			registry = createOrgWindowEffectRegistry([compartment])
		const { runtime } = buffer()
		const a = window(runtime, "a", { extensions: compartment.of([]) }, registry)
		expectCode(
			() =>
				a.view.dispatch({
					changes: { from: 0, insert: "Z" },
					effects: registry.reconfigure(compartment, history()),
				}),
			"invalid-window",
		)
		expect(runtime.source).toBe("abcdef")
		expect(undoDepth(runtime.state)).toBe(0)
	})
	it("rejects reentrance during projection and retains source when a guard throws", () => {
		const { runtime } = buffer()
		const a = window(runtime, "a")
		const update = a.view.update.bind(a.view)
		vi.spyOn(a.view, "update").mockImplementation((trs) => {
			expectCode(() => a.handle.undo(), "reentrant")
			expectCode(() => a.handle.detach(), "reentrant")
			update(trs)
		})
		type(a.view, "X")
		expect(runtime.source).toBe("Xabcdef")
		const { runtime: other } = buffer("abcdef", {
			canCommit: () => {
				throw new Error("guard")
			},
		})
		const b = window(other, "b")
		expectCode(() => type(b.view, "X"), "callback-failed")
		expect(other.source).toBe("abcdef")
		expect(other.revision).toBe(0)
	})
	it("keeps registered custom effects local, even with a document edit", () => {
		const increment = StateEffect.define<number>()
		const field = StateField.define({
			create: () => 0,
			update: (value, tr) =>
				value +
				tr.effects.reduce((sum, effect) => sum + (effect.is(increment) ? effect.value : 0), 0),
		})
		const { runtime } = buffer()
		const a = window(runtime, "a", { extensions: field }, undefined, [increment])
		const b = window(runtime, "b", { extensions: field })
		a.view.dispatch({ changes: { from: 0, insert: "X" }, effects: increment.of(2) })
		expect(runtime.source).toBe("Xabcdef")
		expect(a.view.state.field(field)).toBe(2)
		expect(b.view.state.field(field)).toBe(0)
		b.handle.undo()
		expect(runtime.source).toBe("abcdef")
		expect(a.view.state.field(field)).toBe(2)
	})
	it("honors explicit isolation and the CM grouping timeout", () => {
		const { runtime } = buffer()
		const a = window(runtime, "a")
		type(a.view, "X", 1000)
		a.view.dispatch({
			annotations: [
				Transaction.userEvent.of("input.type"),
				Transaction.time.of(1001),
				isolateHistory.of("full"),
			],
			changes: { from: 1, insert: "Y" },
			selection: EditorSelection.cursor(2),
		})
		type(a.view, "Z", 1002)
		expect(undoDepth(runtime.state)).toBe(3)
		type(a.view, "Q", 2000)
		expect(undoDepth(runtime.state)).toBe(4)
		for (let i = 0; i < 4; i++) {
			expect(a.handle.undo()).toBe(true)
		}
		expect(runtime.source).toBe("abcdef")
	})
	it("forwards addToHistory and isolateHistory with exact timestamps", () => {
		const { runtime } = buffer()
		const a = window(runtime, "a"),
			b = window(runtime, "b")
		type(a.view, "X", 1000)
		a.view.dispatch({
			annotations: Transaction.addToHistory.of(false),
			changes: { from: 0, insert: "!" },
		})
		expect(undoDepth(runtime.state)).toBe(1)
		b.handle.undo()
		expect(runtime.source).toBe("!abcdef")
		expect(undoDepth(b.view.state)).toBe(0)
	})
	it("detaches a failing projection, retains canonical state and updates healthy peers", () => {
		const onError = vi.fn(),
			{ runtime } = buffer("abcdef", { onError })
		const bad = window(runtime, "bad"),
			good = window(runtime, "good")
		vi.spyOn(bad.view, "update").mockImplementation(() => {
			throw new Error("DOM broken")
		})
		type(good.view, "X")
		expect(runtime.source).toBe("Xabcdef")
		expect(good.view.state.sliceDoc()).toBe(runtime.source)
		expect(onError.mock.calls[0][0].code).toBe("projection-failed")
		expectCode(() => bad.handle.undo(), "stale-window")
		good.handle.undo()
		expect(runtime.source).toBe("abcdef")
	})
})
