import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { OrgRemarkMark } from "@/pipes/org/org-remark.types"
import { createOrgBufferRuntime, type OrgBufferRuntime, type OrgBufferWindowHandle } from "./org-buffer-runtime"
import { createOrgRemarkTracker, orgRemarkEditorOffset, orgRemarkRawOffset } from "./org-remark-tracker"

const views: EditorView[] = []
afterEach(() => { for (const view of views.splice(0)) view.destroy() })
function setup(source = "abcdef") {
	const runtime = createOrgBufferRuntime({ key: { bufferId: "source", workspaceSessionId: "session" }, source, canCommit: () => true, onCommit: () => {} })
	const tracker = createOrgRemarkTracker(runtime)
	return { runtime, tracker }
}
function window(runtime: OrgBufferRuntime, windowId: string) {
	let handle: OrgBufferWindowHandle
	const view = new EditorView({ parent: document.body, state: EditorState.create({ doc: runtime.state.doc, extensions: runtime.historyFreeSourceExtensions }), dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions) })
	views.push(view)
	handle = runtime.attachWindow({ view, windowId })
	return { view, handle }
}
function range(from = 1, to = 4, line = 1): OrgRemarkMark {
	return { id: "range", from, to, line, label: "important", kind: "range", originalText: "bcd" }
}
function install(runtime: OrgBufferRuntime, marks: readonly OrgRemarkMark[]) {
	return createOrgRemarkTracker(runtime).install(runtime.source, runtime.revision, marks)
}

describe("canonical Org remark anchors", () => {
	it("shares one reservoir across two windows, excludes boundary insertions and grows interiors", () => {
		const { runtime, tracker } = setup()
		expect(createOrgRemarkTracker(runtime)).toBe(tracker)
		expect(install(runtime, [range()])).toBe(true)
		const a = window(runtime, "a"), b = window(runtime, "b")
		a.view.dispatch({ changes: { from: 1, insert: "L" } })
		expect(tracker.read("range")).toMatchObject({ from: 2, to: 5, collapsed: false })
		b.view.dispatch({ changes: { from: 5, insert: "R" } })
		expect(tracker.read("range")).toMatchObject({ from: 2, to: 5 })
		a.view.dispatch({ changes: { from: 3, insert: "I" } })
		expect(tracker.read("range")).toMatchObject({ from: 2, to: 6, originalText: "bcd" })
		expect(tracker.getSnapshot()).toMatchObject({ source: runtime.source, revision: 3, dirty: true, needsReload: false })
		expect(a.view.state.sliceDoc()).toBe(b.view.state.sliceDoc())
		b.handle.undo()
		expect(tracker.read("range")).toMatchObject({ from: 2, to: 5 })
		a.handle.redo()
		expect(tracker.read("range")).toMatchObject({ from: 2, to: 6 })
		a.handle.detach()
		b.handle.detach()
		runtime.applyCommandEdit(runtime.source, { from: 0, to: 0, insert: "!", cursor: 1 })
		expect(tracker.read("range")).toMatchObject({ from: 3, to: 7 })
		expect(tracker.getSnapshot().dirty).toBe(true)
		const c = window(runtime, "c")
		expect(createOrgRemarkTracker(runtime).read("range")).toEqual(tracker.read("range"))
		expect(c.view.state.sliceDoc()).toBe(runtime.source)
	})

	it("maps UTF-16 astral characters and CRLF through actual canonical documents and undo", () => {
		const { runtime, tracker } = setup("🦊\r\nalpha beta\r\nlast")
		expect(install(runtime, [{ ...range(4, 9, 2), originalText: "alpha" }])).toBe(true)
		for (const raw of [0, 2, 4, 9, 14, 16, 20]) {
			expect(orgRemarkRawOffset(runtime.state, orgRemarkEditorOffset(runtime.state, raw))).toBe(raw)
		}
		const a = window(runtime, "a"), b = window(runtime, "b")
		runtime.applyCommandEdit(runtime.source, { from: 0, to: 0, insert: "\r\n", cursor: 2 })
		expect(tracker.read("range")).toMatchObject({ from: 6, to: 11, line: 3 })
		runtime.applyCommandEdit(runtime.source, { from: 8, to: 8, insert: "🧠", cursor: 10 })
		expect(tracker.read("range")).toMatchObject({ from: 6, to: 13, line: 3 })
		b.handle.undo()
		expect(tracker.read("range")).toMatchObject({ from: 6, to: 11, line: 3 })
		a.handle.undo()
		expect(tracker.read("range")).toMatchObject({ from: 4, to: 9, line: 2 })
		b.handle.redo()
		expect(tracker.read("range")).toMatchObject({ from: 6, to: 11, line: 3 })
		expect(a.view.state.lineBreak).toBe("\r\n")
		expect(a.view.state.sliceDoc()).toBe(runtime.source)
	})

	it.each(["\n", "\r\n"])("keeps line anchors zero-width at BOL and follows inserted %j at the anchor", (separator) => {
		const source = `first${separator}second${separator}last`
		const { runtime, tracker } = setup(source)
		const anchor = 5 + separator.length
		expect(install(runtime, [{ id: "line", from: anchor, to: anchor, line: 2, label: "line", kind: "line", originalText: "second" }])).toBe(true)
		const a = window(runtime, "a")
		runtime.applyCommandEdit(runtime.source, { from: anchor, to: anchor, insert: separator, cursor: anchor + separator.length })
		expect(tracker.read("line")).toMatchObject({ from: anchor + separator.length, to: anchor + separator.length, line: 3, collapsed: false })
		runtime.applyCommandEdit(runtime.source, { from: anchor + separator.length, to: anchor + separator.length, insert: "prefix", cursor: anchor + separator.length + 6 })
		expect(tracker.read("line")).toMatchObject({ from: anchor + separator.length, to: anchor + separator.length, line: 3 })
		a.handle.undo()
		a.handle.undo()
		expect(tracker.read("line")).toMatchObject({ from: anchor, to: anchor, line: 2, collapsed: false })
		runtime.applyCommandEdit(runtime.source, { from: anchor, to: anchor, insert: separator + separator, cursor: anchor + 2 * separator.length })
		expect(tracker.read("line")).toMatchObject({ from: anchor + separator.length, to: anchor + separator.length, line: 3 })
		a.handle.undo()
		expect(tracker.read("line")).toMatchObject({ from: anchor, to: anchor, line: 2 })
	})

	it("retains collapsed ranges for synchronization, including net-zero document batches", () => {
		const { runtime, tracker } = setup()
		install(runtime, [range()])
		const a = window(runtime, "a")
		const first = a.view.state.update({ changes: { from: 1, to: 4, insert: "" } })
		const second = first.state.update({ changes: { from: 1, insert: "bcd" } })
		a.handle.dispatchTransactions([first, second])
		expect(runtime.source).toBe("abcdef")
		expect(tracker.getSnapshot()).toMatchObject({ revision: 0, source: "abcdef", dirty: true })
		expect(tracker.read("range")).toMatchObject({ collapsed: true, from: 4, to: 4 })
		install(runtime, [])
		expect(tracker.getSnapshot()).toMatchObject({ marks: [], dirty: false, needsReload: false })
	})
	it("keeps creation-time excerpts and collapsed live anchors across a confirmed note mutation, fencing a late ACK", () => {
		const { runtime, tracker } = setup()
		install(runtime, [range()])
		runtime.applyCommandEdit(runtime.source, { from: 2, to: 2, insert: "X", cursor: 3 })
		const grown = tracker.getSnapshot()
		expect(tracker.reconcile(grown, grown.marks.map((mark) => ({ ...mark, label: "quote" })), grown.dirty)).toBe(true)
		expect(tracker.read("range")).toMatchObject({ from: 1, to: 5, originalText: "bcd", label: "quote", collapsed: false })
		expect(tracker.getSnapshot().dirty).toBe(true)
		expect(tracker.reconcile(grown, [], false)).toBe(false)
		runtime.applyCommandEdit(runtime.source, { from: 1, to: 5, insert: "", cursor: 1 })
		const collapsed = tracker.getSnapshot()
		expect(tracker.reconcile(collapsed, collapsed.marks, true)).toBe(true)
		expect(tracker.read("range")).toMatchObject({ from: 1, to: 1, collapsed: true })
		const saved = tracker.getSnapshot()
		expect(tracker.reconcile(saved, [], false)).toBe(true)
		expect(tracker.getSnapshot()).toMatchObject({ marks: [], dirty: false, needsReload: false })
	})

	it("invalidates source installations rather than guessing relocation and accepts only current reloads", () => {
		const { runtime, tracker } = setup()
		install(runtime, [range()])
		const old = tracker.getSnapshot()
		runtime.applyControllerSource("abcdef", "zz\r\nabcdef")
		expect(tracker.getSnapshot()).toMatchObject({ marks: [], needsReload: true, dirty: false, source: "zz\r\nabcdef", revision: 1 })
		expect(tracker.install(old.source, old.revision, [range()])).toBe(false)
		expect(install(runtime, [range(5, 8, 2)])).toBe(true)
		expect(tracker.getSnapshot().needsReload).toBe(false)
		runtime.applyCommandEdit(runtime.source, { from: 0, to: 0, insert: "!", cursor: 1 })
		expect(tracker.read("range")).toMatchObject({ from: 6, to: 9 })
	})

	it("rejects ambiguous separators, surrogate/CRLF splits, invalid lines and duplicate IDs atomically", () => {
		const { runtime, tracker } = setup("🦊\r\nalpha")
		const valid = { ...range(4, 9, 2), originalText: "alpha" }
		expect(install(runtime, [valid])).toBe(true)
		const snapshot = tracker.getSnapshot()
		for (const mark of [{ ...valid, from: 1 }, { ...valid, from: 3 }, { ...valid, line: 1 }, { ...valid, to: 50 }, { ...valid, kind: "line" as const, from: 5, to: 5 }]) {
			expect(install(runtime, [mark])).toBe(false)
			expect(tracker.getSnapshot()).toBe(snapshot)
		}
		expect(install(runtime, [valid, valid])).toBe(false)
		expect(tracker.install(runtime.source, 100, [])).toBe(false)
		for (const source of ["a\rb", "a\r\nb\nc", "a\r\nb\rc"]) {
			const ambiguous = setup(source)
			expect(install(ambiguous.runtime, [])).toBe(false)
			expect(ambiguous.tracker.getSnapshot().needsReload).toBe(true)
		}
	})

	it("invalidates unsupported mixed-EOL edits without changing raw source bytes", () => {
		const { runtime, tracker } = setup("first\r\nsecond")
		install(runtime, [range(7, 13, 2)])
		runtime.applyCommandEdit(runtime.source, { from: 0, to: 0, insert: "\n", cursor: 1 })
		expect(runtime.source).toBe("\nfirst\r\nsecond")
		expect(tracker.getSnapshot()).toMatchObject({ source: runtime.source, needsReload: true, dirty: false, marks: [] })
	})

	it("keeps snapshots immutable, unsubscribes idempotently and retires without view-driven loss", () => {
		const { runtime, tracker } = setup()
		const listener = vi.fn()
		const unsubscribe = tracker.subscribe(listener)
		expect(tracker.getSnapshot().version).toBe(0)
		install(runtime, [range()])
		expect(listener).toHaveBeenCalledTimes(1)
		expect(tracker.getSnapshot().version).toBe(1)
		expect(Object.isFrozen(tracker.getSnapshot())).toBe(true)
		expect(Object.isFrozen(tracker.getSnapshot().marks)).toBe(true)
		expect(Object.isFrozen(tracker.read("range"))).toBe(true)
		unsubscribe()
		unsubscribe()
		runtime.applyCommandEdit(runtime.source, { from: 0, to: 0, insert: "!", cursor: 1 })
		expect(listener).toHaveBeenCalledTimes(1)
		expect(tracker.getSnapshot().version).toBe(2)
		const retired = tracker.getSnapshot()
		tracker.close()
		tracker.close()
		runtime.applyCommandEdit(runtime.source, { from: 0, to: 0, insert: "?", cursor: 1 })
		expect(tracker.getSnapshot()).toBe(retired)
		expect(tracker.install(runtime.source, runtime.revision, [])).toBe(false)
		tracker.subscribe(listener)()
		expect(listener).toHaveBeenCalledTimes(1)
		const other = setup()
		other.runtime.close()
		expect(other.tracker.closed).toBe(true)
		expect(install(other.runtime, [])).toBe(false)
	})
	it("reattaches tracking after a window host remount without reviving the retired tracker", () => {
		const { runtime, tracker } = setup()
		tracker.install(runtime.source, runtime.revision, [range()])
		const retired = tracker.getSnapshot()
		tracker.close()
		const replacement = createOrgRemarkTracker(runtime)
		replacement.install(runtime.source, runtime.revision, [range()])
		runtime.applyCommandEdit(runtime.source, { from: 0, to: 0, insert: "!", cursor: 1 })
		expect(replacement.read("range")).toMatchObject({ from: 2, to: 5, collapsed: false })
		expect(tracker.getSnapshot()).toBe(retired)
	})
})
