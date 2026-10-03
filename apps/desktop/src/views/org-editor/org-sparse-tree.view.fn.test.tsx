import {
	cursorCharLeft,
	cursorCharRight,
	deleteCharBackward,
	deleteCharForward,
	redoDepth,
	undo,
	undoDepth,
} from "@codemirror/commands"
import { EditorSelection, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgEditorCommandTarget, OrgEditorSessionSnapshot } from "./org-editor.types"
import { OrgEditor } from "./org-editor.view.fn"
import { editorOffsetFromSource } from "./org-source-offset.pipe"
import { orgSparseTreeField } from "./org-sparse-tree.extension"
import * as sparseAPI from "./org-sparse-tree.extension"

const viewFor = (name: string) => EditorView.findFromDOM(screen.getByRole("textbox", { name }))!
const source = "* TODO Keep\r\nkeep body\r\n* DONE Hide\r\nhidden body\r\n"

describe("real CodeMirror sparse-tree presentation", () => {
	it("exports no caller-forgeable canonical approval annotation", () => {
		expect(sparseAPI).not.toHaveProperty("orgSparseCanonicalUpdate")
	})
	it("preflights non-runtime filter:false dispatch before source and history commit", () => {
		const onChange = vi.fn()
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				value={source}
				onChange={onChange}
				onSave={vi.fn()}
				ariaLabel="local"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = viewFor("local")
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
		})
		const before = view.state
		const hidden = before.field(orgSparseTreeField)!.hiddenRanges[0]
		act(() => {
			view.dispatch({ filter: false, changes: { from: hidden.from + 2, insert: "bad" } })
		})
		expect(view.state).toBe(before)
		expect(view.state.sliceDoc()).toBe(source)
		expect(onChange).not.toHaveBeenCalled()
		expect(undoDepth(view.state)).toBe(0)
		expect(redoDepth(view.state)).toBe(0)
		act(() => {
			view.dispatch({ filter: false, changes: { from: view.state.doc.line(2).from, insert: "X" } })
		})
		expect(onChange).toHaveBeenCalledTimes(1)
		expect(undoDepth(view.state)).toBe(1)
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
	})
	it.each([false, true])("rejects forged history and selection reveal in runtime=%s", (shared) => {
		const runtime = shared
			? createOrgBufferRuntime({
					source,
					canCommit: () => true,
					onCommit: vi.fn(),
					key: { bufferId: "forged", workspaceSessionId: "test" },
				})
			: undefined
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="forged"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = viewFor("forged")
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
		})
		const before = view.state
		const hidden = before.field(orgSparseTreeField)!.hiddenRanges[0]!
		const reject = (dispatch: () => void) => {
			const baseline = view.state
			if (shared) expect(dispatch).toThrow(/preflight/)
			else act(dispatch)
			expect(view.state).toBe(baseline)
		}
		for (const event of ["undo", "redo"]) {
			for (const filter of [true, false]) {
				const dispatch = () =>
					view.dispatch({
						filter,
						annotations: Transaction.userEvent.of(event),
						changes: { from: hidden.from + 2, insert: "forged" },
					})
				if (filter)
					act(dispatch) // Ordinary filtered edits are dropped before dispatch.
				else reject(dispatch)
				expect(view.state.sliceDoc()).toBe(source)
			}
			reject(() =>
				view.dispatch({
					filter: false,
					annotations: Transaction.userEvent.of(event),
					selection: { anchor: hidden.from + 2 },
				}),
			)
			// The second step cannot exploit a revealed field produced by step one.
			reject(() =>
				view.dispatch({ filter: false, changes: { from: hidden.from + 2, insert: "bad" } }),
			)
		}
		expect(undoDepth(runtime?.state ?? view.state)).toBe(0)
		expect(redoDepth(runtime?.state ?? view.state)).toBe(0)
	})

	it.each([
		false,
		true,
	])("owned keys and DOM history reveal legitimate targets in runtime=%s", (shared) => {
		const runtime = shared
			? createOrgBufferRuntime({
					source,
					canCommit: () => true,
					onCommit: vi.fn(),
					key: { bufferId: "owned", workspaceSessionId: "test" },
				})
			: undefined
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="owned"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = viewFor("owned")
		const hidden = view.state.doc.line(4).from
		act(() => {
			view.dispatch({ selection: { anchor: hidden } })
			view.dispatch({ changes: { from: hidden, insert: "X" } })
			target!.applyView!(view.state.sliceDoc(), { kind: "sparse-tree", query: "todo" })
		})
		const edited = view.state.sliceDoc()
		act(() => {
			fireEvent.keyDown(view.contentDOM, { key: "z", ctrlKey: true })
		})
		expect(view.state.sliceDoc()).toBe(source)
		expect(view.state.field(orgSparseTreeField)).not.toBeNull()
		act(() => {
			fireEvent(
				view.contentDOM,
				new InputEvent("beforeinput", {
					bubbles: true,
					cancelable: true,
					inputType: "historyRedo",
				}),
			)
		})
		expect(view.state.sliceDoc()).toBe(edited)
		act(() => {
			fireEvent(
				view.contentDOM,
				new InputEvent("beforeinput", {
					bubbles: true,
					cancelable: true,
					inputType: "historyUndo",
				}),
			)
		})
		expect(view.state.sliceDoc()).toBe(source)
		act(() => {
			fireEvent.keyDown(view.contentDOM, { key: "y", ctrlKey: true })
		})
		expect(view.state.sliceDoc()).toBe(edited)
	})
	afterEach(cleanup)

	it.each([
		{ name: "CRLF", separator: "\r\n", body: "hidden body", trailing: true },
		{ name: "lone CR", separator: "\r", body: "hidden body", trailing: true },
		{ name: "mixed", separator: "\r\n", body: "hidden\nbody\rwith mixed breaks", trailing: true },
		{ name: "NUL Unicode EOF", separator: "\r\n", body: "hidden\0 café 😀 中文", trailing: false },
	])("maps $name raw ranges and restores exact selections in real CM", ({
		separator,
		body,
		trailing,
	}) => {
		const lines = [
			"* DONE Hide first",
			body,
			"* TODO Keep 😀",
			"visible café\0",
			"* DONE Hide last",
			"#+begin_src",
			"* TODO block fake",
			"#+end_src",
			":LOGBOOK:",
			"* TODO drawer fake",
			":END:",
			"** COMMENT omitted",
			"*** TODO comment fake",
			body,
		]
		const raw = lines.join(separator) + (trailing ? separator : "")
		const onChange = vi.fn(),
			onCursorChange = vi.fn()
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				value={raw}
				onChange={onChange}
				onSave={vi.fn()}
				ariaLabel="a"
				onCursorChange={onCursorChange}
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const a = viewFor("a")
		expect(a.state.sliceDoc()).toBe(raw)
		// These expectations come from CM's actual Text lines, not the mapping helper.
		// With an explicit CRLF separator, embedded lone CR/LF remain line content.
		expect(a.state.doc.line(2).text).toBe(body)
		const firstMatch = a.state.doc.line(3).from
		const lastHidden = a.state.doc.line(5).from
		const previous = EditorSelection.single(a.state.doc.line(14).to, lastHidden + 4)
		act(() => {
			a.dispatch({ selection: previous })
		})
		expect(onCursorChange).toHaveBeenLastCalledWith(raw.indexOf("* DONE Hide last") + 4)
		act(() => {
			expect(target!.applyView!(raw, { kind: "sparse-tree", query: "todo" })).toBe(true)
		})
		const sparse = a.state.field(orgSparseTreeField)!
		expect(sparse.plan.matchedHeadingStarts).toEqual([raw.indexOf("* TODO Keep")])
		expect(sparse.plan.hiddenRanges).toEqual([
			{ from: 0, to: raw.indexOf("* TODO Keep") },
			{ from: raw.indexOf("* DONE Hide last"), to: raw.length },
		])
		const hidden: [number, number][] = [],
			matches: number[] = []
		sparse.decorations.between(0, a.state.doc.length, (from, to, decoration) => {
			if (decoration.spec.block === true) hidden.push([from, to])
			else if (decoration.spec.class === "cm-org-sparse-match") matches.push(from)
		})
		expect(hidden).toEqual([
			[0, firstMatch],
			[lastHidden, a.state.doc.length],
		])
		expect(matches).toEqual([firstMatch])
		expect(a.state.selection.toJSON()).toEqual(EditorSelection.single(firstMatch).toJSON())
		for (const [rawPosition, cmPosition] of [
			[raw.indexOf("* TODO Keep"), firstMatch],
			[raw.indexOf("* DONE Hide last"), lastHidden],
			[raw.length, a.state.doc.length],
		]) {
			expect(editorOffsetFromSource(raw, rawPosition, a.state.lineBreak)).toBe(cmPosition)
		}
		act(() => {
			expect(target!.applyView!(raw, { kind: "sparse-tree", query: null })).toBe(true)
		})
		expect(a.state.selection.toJSON()).toEqual(previous.toJSON())
		expect(a.state.sliceDoc()).toBe(raw)
		expect(undoDepth(a.state)).toBe(0)
		expect(onChange).not.toHaveBeenCalled()
	})

	it("relocates hidden anchors and crossing secondary ranges, saving the full CRLF selection", () => {
		const raw = "* DONE Before\r\nhidden\r\n* TODO Keep\r\nvisible\r\n* DONE After\r\nhidden"
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				value={raw}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="a"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const a = viewFor("a")
		const visible = a.state.doc.line(3).from
		const original = EditorSelection.create(
			[
				EditorSelection.range(2, visible + 5),
				EditorSelection.range(a.state.doc.line(4).from + 2, a.state.doc.line(6).to),
			],
			0,
		)
		act(() => {
			a.dispatch({ selection: original })
			target!.applyView!(raw, { kind: "sparse-tree", query: "todo" })
		})
		expect(a.state.selection.main.head).toBe(visible)
		expect(a.state.selection.ranges.every((range) => range.empty)).toBe(true)
		expect(a.state.field(orgSparseTreeField)!.restoreSelection!.toJSON()).toEqual(original.toJSON())
		act(() => {
			target!.applyView!(raw, { kind: "sparse-tree", query: null })
		})
		expect(a.state.selection.toJSON()).toEqual(original.toJSON())
	})

	it("blocks actual boundary deletion and selected typing, permits visible edits and skips hidden movement", () => {
		const raw = "* TODO First\nvisible\n* DONE Hide\nhidden\n* TODO Last\nvisible"
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				value={raw}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="a"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const a = viewFor("a")
		act(() => {
			target!.applyView!(raw, { kind: "sparse-tree", query: "todo" })
		})
		const hidden = a.state.field(orgSparseTreeField)!.hiddenRanges[0]!
		act(() => {
			a.dispatch({ selection: { anchor: hidden.to } })
			deleteCharBackward(a)
		})
		expect(a.state.sliceDoc()).toBe(raw)
		act(() => {
			a.dispatch({ selection: { anchor: hidden.from - 1 } })
			deleteCharForward(a)
		})
		expect(a.state.sliceDoc()).toBe(raw)
		const before = a.state.sliceDoc()
		const currentHidden = a.state.field(orgSparseTreeField)!.hiddenRanges[0]!
		act(() => {
			a.dispatch({ changes: { from: currentHidden.from, to: currentHidden.from + 1 } })
		})
		expect(a.state.sliceDoc()).toBe(before)
		act(() => {
			a.dispatch({
				changes: { from: 0, to: a.state.doc.length, insert: "bad" },
				selection: { anchor: 3 },
			})
		})
		expect(a.state.sliceDoc()).toBe(before)
		act(() => {
			a.dispatch({ selection: { anchor: currentHidden.to } })
			cursorCharLeft(a)
		})
		expect(a.state.selection.main.head).toBeLessThanOrEqual(currentHidden.from)
		act(() => {
			cursorCharRight(a)
		})
		expect(a.state.selection.main.head).toBeGreaterThanOrEqual(currentHidden.to)
		act(() => {
			a.dispatch({ changes: { from: 2, insert: "X" } })
		})
		expect(a.state.sliceDoc()).toContain("* XTODO First")
	})

	it("denies filter:false root dispatch atomically without source, history, or notifications", () => {
		const onCommit = vi.fn()
		const runtime = createOrgBufferRuntime({
			source,
			canCommit: () => true,
			onCommit,
			key: { bufferId: "guard", workspaceSessionId: "test" },
		})
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="a"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const a = viewFor("a")
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
		})
		const baseline = a.state
		const hidden = baseline.field(orgSparseTreeField)!.hiddenRanges[0]!
		expect(() =>
			a.dispatch({ filter: false, changes: { from: hidden.from + 2, insert: "bad" } }),
		).toThrow(/preflight/)
		expect(a.state).toBe(baseline)
		const visible = baseline.update({
			filter: false,
			changes: { from: baseline.doc.line(2).from, insert: "X" },
		})
		const hiddenEdit = visible.state.update({
			filter: false,
			changes: { from: hidden.from + 3, to: hidden.from + 4 },
		})
		expect(() => a.dispatch([visible, hiddenEdit])).toThrow(/preflight/)
		expect(a.state).toBe(baseline)
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(0)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(onCommit).not.toHaveBeenCalled()
	})

	it("guards raw source, is window-local/read-only-safe and never commits or adds history", () => {
		const onCommit = vi.fn(),
			onChange = vi.fn(),
			onError = vi.fn()
		const runtime = createOrgBufferRuntime({
			canCommit: () => true,
			key: { bufferId: "sparse", workspaceSessionId: "test" },
			onCommit,
			onError,
			source,
		})
		let target: OrgEditorCommandTarget | null = null
		render(
			<>
				<OrgEditor
					runtime={runtime}
					value={source}
					onChange={onChange}
					onSave={vi.fn()}
					ariaLabel="a"
					readOnly
					onCommandTarget={(next) => {
						target = next
					}}
				/>
				<OrgEditor
					runtime={runtime}
					value={source}
					onChange={onChange}
					onSave={vi.fn()}
					ariaLabel="b"
				/>
			</>,
		)
		const a = viewFor("a"),
			b = viewFor("b")
		act(() => {
			expect(
				target!.applyView!(source.replace(/\r/g, ""), { kind: "sparse-tree", query: "todo" }),
			).toBe(false)
			expect(target!.applyView!(source, { kind: "sparse-tree", query: "tag:" })).toBe(false)
			expect(target!.applyView!(source, { kind: "sparse-tree", query: "todo" })).toBe(true)
		})
		const sparse = a.state.field(orgSparseTreeField)!
		expect(sparse.plan.hiddenRanges).toEqual([
			{ from: source.indexOf("* DONE"), to: source.length },
		])
		const ranges: [number, number][] = []
		sparse.decorations.between(0, a.state.doc.length, (from, to, decoration) => {
			if (decoration.spec.block === true) {
				ranges.push([from, to])
			}
		})
		expect(ranges).toEqual([[a.state.doc.line(3).from, a.state.doc.length]])
		expect(a.state.sliceDoc()).toBe(source)
		expect(a.contentDOM.textContent).not.toContain("hidden body")
		expect(b.contentDOM.textContent).toContain("hidden body")
		expect(b.state.field(orgSparseTreeField)).toBeNull()
		expect(undoDepth(runtime.state)).toBe(0)
		expect(onCommit).not.toHaveBeenCalled()
		expect(onChange).not.toHaveBeenCalled()
		expect(onError).not.toHaveBeenCalled()
		act(() => {
			expect(target!.applyView!(source, { kind: "sparse-tree", query: null })).toBe(true)
		})
		expect(a.state.field(orgSparseTreeField)).toBeNull()
		expect(a.contentDOM.textContent).toContain("hidden body")
	})

	it("reveals canonical history targets and preserves mapped restore selections across both history branches", () => {
		const runtime = createOrgBufferRuntime({
			source,
			canCommit: () => true,
			onCommit: vi.fn(),
			key: { bufferId: "history", workspaceSessionId: "test" },
		})
		let target: OrgEditorCommandTarget | null = null
		render(
			<>
				<OrgEditor
					runtime={runtime}
					value={source}
					onChange={vi.fn()}
					onSave={vi.fn()}
					ariaLabel="a"
					onCommandTarget={(next) => {
						target = next
					}}
				/>
				<OrgEditor
					runtime={runtime}
					value={source}
					onChange={vi.fn()}
					onSave={vi.fn()}
					ariaLabel="b"
				/>
			</>,
		)
		const a = viewFor("a"),
			b = viewFor("b")
		act(() => {
			const hidden = a.state.doc.line(4).from
			a.dispatch({ selection: { anchor: hidden + 3 } })
			a.dispatch({ changes: { from: hidden, insert: "X" }, selection: { anchor: hidden + 4 } })
		})
		const original = EditorSelection.create(
			[
				EditorSelection.cursor(5),
				EditorSelection.range(a.state.doc.line(4).from + 2, a.state.doc.line(4).to),
			],
			0,
		)
		act(() => {
			a.dispatch({ selection: original })
			target!.applyView!(runtime.source, { kind: "sparse-tree", query: "todo" })
			b.dispatch({ changes: { from: 2, insert: "Y" } })
		})
		const mapped = a.state.field(orgSparseTreeField)!.restoreSelection!
		expect(mapped.ranges[1]!.anchor).toBe(original.ranges[1]!.anchor + 1)
		act(() => {
			fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "z" })
		})
		expect(redoDepth(runtime.state)).toBe(1)
		act(() => {
			fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "z" })
		})
		expect(runtime.source).toBe(source)
		expect(a.state.selection.main.head).toBeGreaterThan(a.state.doc.line(3).from)
		expect(a.state.field(orgSparseTreeField)!.hiddenRanges).toEqual([])
		expect(a.state.field(orgSparseTreeField)!.restoreSelection).not.toBeNull()
		act(() => {
			target!.applyView!(runtime.source, { kind: "sparse-tree", query: null })
		})
		expect(redoDepth(runtime.state)).toBe(2)
		act(() => {
			fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "y", keyCode: 89 })
			target!.applyView!(runtime.source, { kind: "sparse-tree", query: "todo" })
			fireEvent.keyDown(a.contentDOM, { ctrlKey: true, key: "y", keyCode: 89 })
		})
		const restored = a.state.field(orgSparseTreeField)!.restoreSelection!
		act(() => {
			target!.applyView!(runtime.source, { kind: "sparse-tree", query: null })
		})
		expect(a.state.selection.toJSON()).toEqual(restored.toJSON())
		expect(undoDepth(runtime.state)).toBe(2)
		expect(redoDepth(runtime.state)).toBe(0)
	})

	it("recomputes after sibling edits and undo, preserving canonical history", () => {
		const onCommit = vi.fn()
		const runtime = createOrgBufferRuntime({
			canCommit: () => true,
			key: { bufferId: "sparse", workspaceSessionId: "test" },
			onCommit,
			source,
		})
		let target: OrgEditorCommandTarget | null = null
		render(
			<>
				<OrgEditor
					runtime={runtime}
					value={source}
					onChange={vi.fn()}
					onSave={vi.fn()}
					ariaLabel="a"
					onCommandTarget={(next) => {
						target = next
					}}
				/>
				<OrgEditor
					runtime={runtime}
					value={source}
					onChange={vi.fn()}
					onSave={vi.fn()}
					ariaLabel="b"
				/>
			</>,
		)
		const a = viewFor("a"),
			b = viewFor("b")
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
		})
		act(() => {
			const line = b.state.doc.line(3)
			b.dispatch({ changes: { from: line.from + 2, insert: "TODO", to: line.from + 6 } })
		})
		expect(a.state.field(orgSparseTreeField)!.plan.allVisible).toBe(true)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(onCommit).toHaveBeenCalledOnce()
		act(() => {
			fireEvent.keyDown(b.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 })
		})
		expect(a.state.field(orgSparseTreeField)!.plan.hiddenRanges).toHaveLength(1)
		expect(a.state.sliceDoc()).toBe(source)
	})

	it("restores a displaced selection on clear, but respects subsequent user movement", () => {
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="a"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const a = viewFor("a")
		const previous = a.state.doc.line(3).from + 4
		act(() => {
			a.dispatch({ selection: { anchor: previous } })
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
		})
		expect(a.state.selection.main.head).toBe(0)
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: null })
		})
		expect(a.state.selection.main.head).toBe(previous)
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
			a.dispatch({ selection: { anchor: 5 } })
			target!.applyView!(source, { kind: "sparse-tree", query: null })
		})
		expect(a.state.selection.main.head).toBe(5)
		expect(undoDepth(a.state)).toBe(0)
	})

	it("keeps no-match queries visible and recomputes local controlled replacements", () => {
		let target: OrgEditorCommandTarget | null = null
		const onChange = vi.fn()
		const editor = (value: string) => (
			<OrgEditor
				value={value}
				onChange={onChange}
				onSave={vi.fn()}
				ariaLabel="a"
				onCommandTarget={(next) => {
					target = next
				}}
			/>
		)
		const mounted = render(editor(source))
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "text:Missing" })
		})
		const a = viewFor("a")
		expect(a.state.field(orgSparseTreeField)!.plan.allVisible).toBe(true)
		const next = source.replace("Keep", "Missing")
		mounted.rerender(editor(next))
		expect(a.state.field(orgSparseTreeField)!.plan.hiddenRanges).toHaveLength(1)
		expect(a.state.sliceDoc()).toBe(next)
		expect(onChange).not.toHaveBeenCalled()
		expect(undoDepth(a.state)).toBe(0)
		const stale = target!
		mounted.unmount()
		expect(stale.applyView!(next, { kind: "sparse-tree", query: null })).toBe(false)
	})

	it("does not revive a sparse tree from a local session cache", () => {
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		let target: OrgEditorCommandTarget | null = null
		const editor = (
			<OrgEditor
				value={source}
				sessionKey="session"
				sessionCache={cache}
				onChange={vi.fn()}
				onSave={vi.fn()}
				ariaLabel="a"
				onCommandTarget={(next) => {
					target = next
				}}
			/>
		)
		const mounted = render(editor)
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
		})
		mounted.unmount()
		render(editor)
		expect(viewFor("a").state.field(orgSparseTreeField)).toBeNull()
	})
})
