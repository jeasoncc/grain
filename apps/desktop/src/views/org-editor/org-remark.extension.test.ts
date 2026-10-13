import { undoDepth } from "@codemirror/commands"
import { codeFolding, foldEffect, foldedRanges } from "@codemirror/language"
import { EditorSelection, EditorState, type StateEffect, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime, type OrgBufferRuntime, type OrgBufferWindowHandle } from "@/flows/org-editor-runtime/org-buffer-runtime"
import { createOrgRemarkTracker, orgRemarkEditorOffset, type OrgRemarkSnapshot } from "@/flows/org-editor-runtime/org-remark-tracker"
import { createOrgWindowEffectRegistry } from "@/flows/org-editor-runtime/org-window-effects"
import type { OrgRemarkMark } from "@/pipes/org/org-remark.types"
import { allowOrgRemarkNoteSourceTransaction, createOrgRemarkExtension, orgRemarkAtPoint, orgRemarkField, orgRemarkNavigableMarks, orgRemarkNavigationTarget, orgRemarkNoteRangeField, orgRemarkVisibleMarks, setOrgRemarkNoteRange, setOrgRemarkSnapshot } from "./org-remark.extension"

interface RemarkWindow {
	readonly view: EditorView
	readonly handle: OrgBufferWindowHandle
	readonly registry: { localEffect<T>(effect: StateEffect<T>): StateEffect<T> }
}
const views: EditorView[] = []
afterEach(() => { for (const view of views.splice(0)) view.destroy() })
function setup(source: string, marks: readonly OrgRemarkMark[] = []) {
	const runtime = createOrgBufferRuntime({ key: { bufferId: "source", workspaceSessionId: "session" }, source, canCommit: () => true, onCommit: () => {} })
	const tracker = createOrgRemarkTracker(runtime)
	expect(tracker.install(source, 0, marks)).toBe(true)
	return { runtime, tracker }
}
function window(runtime: OrgBufferRuntime, windowId: string): RemarkWindow {
	const registry = createOrgWindowEffectRegistry([], [setOrgRemarkSnapshot, setOrgRemarkNoteRange])
	let handle: OrgBufferWindowHandle
	const view = new EditorView({
		parent: document.body,
		state: EditorState.create({ doc: runtime.state.doc, extensions: [runtime.historyFreeSourceExtensions, codeFolding(), createOrgRemarkExtension(registry.knownEffect)] }),
		dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
	})
	views.push(view)
	handle = runtime.attachWindow({ view, windowId, knownReconfigure: registry.knownEffect, preflightSourceTransaction: allowOrgRemarkNoteSourceTransaction })
	return { registry, view, handle }
}
function refresh(target: RemarkWindow, snapshot: OrgRemarkSnapshot) {
	target.view.dispatch({ effects: target.registry.localEffect(setOrgRemarkSnapshot.of(snapshot)), annotations: Transaction.addToHistory.of(false) })
}
function mark(id: string, from: number, to: number, line = 1, label = "important", kind: "range" | "line" = "range"): OrgRemarkMark {
	return { id, from, to, line, label, kind, originalText: id }
}
function decorationRanges(view: EditorView) {
	const ranges: { from: number; to: number; class: string }[] = []
	view.state.field(orgRemarkField)?.decorations.between(0, view.state.doc.length, (from, to, decoration) => {
		ranges.push({ from, to, class: decoration.spec.class })
	})
	return ranges
}

describe("window-local canonical remark presentation", () => {
	it("shows canonical ranges and real line gutter icons in two windows without source/history effects", () => {
		const { runtime, tracker } = setup("alpha\nbeta", [mark("range", 0, 5), mark("line", 6, 6, 2, "line", "line")])
		const a = window(runtime, "a"), b = window(runtime, "b")
		refresh(a, tracker.getSnapshot())
		expect(b.view.state.field(orgRemarkField)).toBeNull()
		refresh(b, tracker.getSnapshot())
		for (const target of [a, b]) {
			expect(target.view.dom.querySelector(".cm-org-remark-important")?.textContent).toBe("alpha")
			expect(target.view.dom.querySelector(".cm-org-remark-line-icon")?.textContent).toBe("*")
			expect(target.view.dom.querySelector(".cm-org-remark-line-icon")?.getAttribute("aria-label")).toBe("Line annotation: line")
			expect(decorationRanges(target.view)).toEqual([{ from: 0, to: 5, class: "cm-org-remark cm-org-remark-important" }])
			expect(undoDepth(target.view.state)).toBe(0)
		}
		expect(runtime.source).toBe("alpha\nbeta")
		expect(runtime.revision).toBe(0)
		expect(undoDepth(runtime.state)).toBe(0)
		a.view.dispatch({ changes: { from: 2, insert: "!" } })
		refresh(a, tracker.getSnapshot())
		refresh(b, tracker.getSnapshot())
		expect(decorationRanges(a.view)).toEqual(decorationRanges(b.view))
		expect(decorationRanges(a.view)[0]).toMatchObject({ from: 0, to: 6 })
		expect(undoDepth(runtime.state)).toBe(1)
		b.handle.undo()
		refresh(a, tracker.getSnapshot())
		refresh(b, tracker.getSnapshot())
		expect(decorationRanges(b.view)[0]).toMatchObject({ from: 0, to: 5 })
		a.handle.redo()
		refresh(a, tracker.getSnapshot())
		refresh(b, tracker.getSnapshot())
		expect(decorationRanges(b.view)[0]).toMatchObject({ from: 0, to: 6 })
	})

	it("uses semantic pens, a default for unknown labels, and raw UTF-16 CRLF point precedence", () => {
		const source = "🦊\r\nabcdef"
		const labels = ["important", "idea", "question", "revise", "quote", "constructor"]
		const { runtime, tracker } = setup(source, [...labels.map((label, index) => mark(label, 4 + index, 5 + index, 2, label)), mark("line", 4, 4, 2, "line", "line")])
		const target = window(runtime, "a")
		refresh(target, tracker.getSnapshot())
		expect(decorationRanges(target.view).map((range) => range.class)).toEqual(labels.map((label) => `cm-org-remark cm-org-remark-${label === "constructor" ? "default" : label}`))
		expect(decorationRanges(target.view)[0]).toMatchObject({ from: 3, to: 4 })
		expect(orgRemarkAtPoint(target.view.state, 4)?.id).toBe("important")
		expect(orgRemarkAtPoint(target.view.state, 10)?.id).toBe("line")
		expect(orgRemarkNavigationTarget(target.view.state, 4, "next")?.id).toBe("idea")
		expect(orgRemarkNavigationTarget(target.view.state, 5, "previous")?.id).toBe("line")
		expect(orgRemarkVisibleMarks(target.view).map((item) => item.id)).toContain("line")
	})

	it.each([true, false])("rejects forged and other-window presentation effects before any mutation (filter=%s)", (filter) => {
		const { runtime, tracker } = setup("alpha", [mark("range", 0, 5)])
		const a = window(runtime, "a"), b = window(runtime, "b")
		const effects = [setOrgRemarkSnapshot.of(tracker.getSnapshot()), b.registry.localEffect(setOrgRemarkSnapshot.of(tracker.getSnapshot())), setOrgRemarkNoteRange.of({ from: 0, to: 5 })]
		const baseline = runtime.state
		for (const effect of effects) {
			expect(() => a.view.dispatch({ changes: { from: 0, insert: "!" }, effects: effect, filter })).toThrow("Unregistered window effect")
			expect(runtime.state).toBe(baseline)
			expect(runtime.source).toBe("alpha")
		}
		const registry = createOrgWindowEffectRegistry([], [setOrgRemarkSnapshot, setOrgRemarkNoteRange])
		const standalone = new EditorView({ parent: document.body, state: EditorState.create({ doc: "alpha", extensions: createOrgRemarkExtension(registry.knownEffect) }) })
		views.push(standalone)
		expect(() => standalone.dispatch({ effects: setOrgRemarkSnapshot.of(tracker.getSnapshot()), filter })).toThrow("Unissued Org remark")
	})

	it("rejects stale snapshots, hides collapsed marks, and does not reveal folds for navigation", () => {
		const source = "* heading\nhidden\nvisible"
		const { runtime, tracker } = setup(source, [mark("hidden", 10, 16, 2), mark("line", 10, 10, 2, "line", "line"), mark("visible", 17, 24, 3)])
		const target = window(runtime, "a")
		refresh(target, tracker.getSnapshot())
		target.view.dispatch({ effects: foldEffect.of({ from: 9, to: 16 }) })
		expect(orgRemarkNavigableMarks(target.view.state).map((item) => item.id)).toEqual(["visible"])
		expect(foldedRanges(target.view.state).size).toBe(1)
		expect(orgRemarkNavigationTarget(target.view.state, 0, "next")?.id).toBe("visible")
		expect(foldedRanges(target.view.state).size).toBe(1)
		const old = tracker.getSnapshot()
		runtime.applyControllerSource(runtime.source, "replacement")
		refresh(target, old)
		expect(target.view.state.field(orgRemarkField)).toBeNull()
		expect(tracker.getSnapshot().needsReload).toBe(true)
		const collapse = setup("abcdef", [mark("gone", 1, 4)])
		const view = window(collapse.runtime, "collapse")
		collapse.runtime.applyCommandEdit("abcdef", { from: 1, to: 4, insert: "", cursor: 1 })
		refresh(view, collapse.tracker.getSnapshot())
		expect(decorationRanges(view.view)).toEqual([])
		expect(orgRemarkAtPoint(view.view.state, 1)).toBeNull()
	})

	it.each(["\n", "\r\n"])("narrows only one full-source notes window, preserving canonical undo and boundaries for %j", (separator) => {
		const prefix = `* source${separator}intro${separator}`
		const selected = `** remark${separator}:PROPERTIES:${separator}:org-remark-id: abcdef12${separator}:END:${separator}note 🦊\0${separator}`
		const suffix = `** other${separator}private${separator}`
		const source = prefix + selected + suffix
		const { runtime } = setup(source)
		const narrowed = window(runtime, "narrowed"), full = window(runtime, "full")
		const bodyFrom = source.indexOf("note")
		narrowed.view.dispatch({
			effects: narrowed.registry.localEffect(setOrgRemarkNoteRange.of({ from: prefix.length, to: prefix.length + selected.length })),
			selection: EditorSelection.cursor(orgRemarkEditorOffset(narrowed.view.state, bodyFrom)),
		})
		expect(narrowed.view.dom.textContent).toContain("** remark")
		expect(narrowed.view.dom.textContent).toContain(":org-remark-id:")
		expect(narrowed.view.dom.textContent).not.toContain("private")
		expect(narrowed.view.dom.textContent).not.toContain("intro")
		expect(full.view.dom.textContent).toContain("private")
		expect(narrowed.view.state.sliceDoc()).toBe(source)
		expect(runtime.source).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
		const position = orgRemarkEditorOffset(narrowed.view.state, bodyFrom)
		narrowed.view.dispatch({ changes: { from: position, insert: "edited " } })
		expect(runtime.source).toBe(prefix + selected.replace("note", "edited note") + suffix)
		expect(narrowed.view.state.field(orgRemarkNoteRangeField)).toMatchObject({ from: prefix.length, to: prefix.length + selected.length + 7 })
		expect(full.view.state.sliceDoc()).toBe(runtime.source)
		full.handle.undo()
		expect(runtime.source).toBe(source)
		expect(narrowed.view.state.field(orgRemarkNoteRangeField)).toMatchObject({ from: prefix.length, to: prefix.length + selected.length })
		full.handle.redo()
		expect(narrowed.view.state.sliceDoc()).toBe(runtime.source)
		expect(undoDepth(narrowed.view.state)).toBe(0)
		const beforeHiddenEdit = narrowed.view.state.field(orgRemarkNoteRangeField)!
		full.view.dispatch({ changes: { from: 0, insert: `extra${separator}` } })
		expect(narrowed.view.state.field(orgRemarkNoteRangeField)).toMatchObject({ from: beforeHiddenEdit.from + 5 + separator.length, to: beforeHiddenEdit.to + 5 + separator.length })
		expect(narrowed.view.dom.textContent).not.toContain("extra")
		full.handle.undo()
		const changedSource = runtime.source
		const range = narrowed.view.state.field(orgRemarkNoteRangeField)!
		const to = orgRemarkEditorOffset(narrowed.view.state, range.to)
		for (const changes of [{ from: 0, insert: "forbidden" }, { from: to - 1, to, insert: "" }, { from: to, insert: "prefix" }, { from: to - 2, to: to + 2, insert: "cross" }]) {
			expect(() => narrowed.view.dispatch({ changes, filter: false })).toThrow("Window source preflight rejected")
			expect(runtime.source).toBe(changedSource)
		}
		// An ordinary filtered attempt is vetoed without dispatching a source edit.
		narrowed.view.dispatch({ changes: { from: 0, insert: "forbidden" } })
		expect(runtime.source).toBe(changedSource)
		// Opening another entry in the same window may move the caret out of the old range.
		const next = runtime.source.indexOf("** other")
		narrowed.view.dispatch({ effects: narrowed.registry.localEffect(setOrgRemarkNoteRange.of({ from: next, to: runtime.source.length })), selection: EditorSelection.cursor(orgRemarkEditorOffset(narrowed.view.state, next)) })
		expect(narrowed.view.dom.textContent).toContain("private")
		expect(narrowed.view.dom.textContent).not.toContain("edited note")
		narrowed.view.dispatch({ effects: narrowed.registry.localEffect(setOrgRemarkNoteRange.of(null)) })
		expect(narrowed.view.dom.textContent).toContain("edited note")
		expect(runtime.source).toBe(changedSource)
	})

	it("keeps narrowing nonhistorical and invalidates it safely when a canonical installation changes structural boundaries", () => {
		const { runtime } = setup("* source\n** remark\nnote\n** other\nbody")
		const target = window(runtime, "a")
		target.view.dispatch({ effects: target.registry.localEffect(setOrgRemarkNoteRange.of({ from: 9, to: 24 })) })
		expect(undoDepth(runtime.state)).toBe(0)
		const onUpdate = vi.spyOn(target.view, "update")
		runtime.applyControllerSource(runtime.source, "unrelated replacement")
		expect(target.view.state.sliceDoc()).toBe("unrelated replacement")
		expect(target.view.state.field(orgRemarkNoteRangeField)).toBeNull()
		expect(onUpdate).toHaveBeenCalled()
		expect(() => target.view.dispatch({ effects: setOrgRemarkNoteRange.of(null), filter: false })).toThrow("Unregistered window effect")
	})
})
