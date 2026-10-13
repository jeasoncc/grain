import {
	cursorCharLeft,
	cursorCharRight,
	deleteCharBackward,
	deleteCharForward,
	redoDepth,
	undo,
	undoDepth,
} from "@codemirror/commands"
import { EditorSelection, EditorState, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgSparseTreeQuery } from "@/types/org"
import type { OrgEditorCommandTarget, OrgEditorSessionSnapshot } from "./org-editor.types"
import { OrgEditor } from "./org-editor.view.fn"
import { editorOffsetFromSource } from "./org-source-offset.pipe"
import * as sparseAPI from "./org-sparse-tree.extension"
import { orgSparseTreeField } from "./org-sparse-tree.extension"
import { useSettings } from "@/hooks/use-settings"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"
import * as nativeCollationAPI from "@/io/api/org-collation.api"
import * as nativeClockAPI from "@/io/api/org-clock-context.api"
import type { OrgSparseClockContext } from "@/pipes/org/org-sparse-special-properties.pipe"
import { OrgSparseTreeContextRequiredError, type OrgSparseTreeNativeContext } from "@/pipes/org/org-sparse-tree.pipe"

const viewFor = (name: string) => EditorView.findFromDOM(screen.getByRole("textbox", { name }))!
const source = "* TODO Keep\r\nkeep body\r\n* DONE Hide\r\nhidden body\r\n"

describe("real CodeMirror sparse-tree presentation", () => {
	it.each([
		false,
		true,
	])("hides BODY sections for inherited and boolean queries without granting edit authority in runtime=%s", (shared) => {
		const raw =
			"#+FILETAGS: :file:\r\n* Parent :work:\r\nparent BODY\r\n** TODO Keep\r\nkeep BODY\r\n** DONE Hide :blocked:\r\nhidden BODY\r\n* TODO Outside\r\noutside BODY\r\n"
		const onCommit = vi.fn(),
			onChange = vi.fn()
		const runtime = shared
			? createOrgBufferRuntime({
					canCommit: () => true,
					key: { bufferId: "boolean", workspaceSessionId: "test" },
					onCommit,
					source: raw,
				})
			: undefined
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				runtime={runtime}
				value={raw}
				onChange={onChange}
				onSave={vi.fn()}
				ariaLabel="boolean"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = viewFor("boolean")
		act(() => {
			expect(target!.applyView!(raw, { kind: "sparse-tree", query: "itag:work" })).toBe(true)
		})
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([
			raw.indexOf("* Parent"),
			raw.indexOf("** TODO Keep"),
			raw.indexOf("** DONE Hide"),
		])
		expect(view.contentDOM.textContent).toContain("hidden BODY")
		expect(view.contentDOM.textContent).not.toContain("outside BODY")
		act(() => {
			expect(
				target!.applyView!(raw, {
					kind: "sparse-tree",
					query: 'match: itag:file AND (todo:TODO OR text:"Hide") AND itag:work AND NOT tag:blocked',
				}),
			).toBe(true)
		})
		const before = view.state
		expect(before.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([
			raw.indexOf("** TODO Keep"),
		])
		expect(before.field(orgSparseTreeField)!.plan?.hiddenRanges).toEqual([
			{ from: raw.indexOf("** DONE Hide"), to: raw.length },
		])
		expect(view.contentDOM.textContent).toContain("parent BODY")
		expect(view.contentDOM.textContent).toContain("keep BODY")
		expect(view.contentDOM.textContent).not.toContain("hidden BODY")
		expect(view.contentDOM.textContent).not.toContain("outside BODY")
		act(() => {
			expect(target!.applyView!(raw, { kind: "sparse-tree", query: "match: todo:TODO AND (" })).toBe(
				false,
			)
		})
		expect(view.state).toBe(before)
		const hidden = before.field(orgSparseTreeField)!.hiddenRanges[0]!
		const forged = () =>
			view.dispatch({
				annotations: Transaction.userEvent.of("undo"),
				changes: { from: hidden.from + 2, insert: "forged" },
				filter: false,
			})
		if (shared) expect(forged).toThrow(/preflight/)
		else act(forged)
		expect(view.state).toBe(before)
		// Even cyclic caller payloads must be refused before AST traversal.
		const cyclic: { kind: "not"; operand?: OrgSparseTreeQuery } = { kind: "not" }
		const readOperand = vi.fn(() => cyclic as OrgSparseTreeQuery)
		Object.defineProperty(cyclic, "operand", { get: readOperand })
		for (const filter of [true, false]) {
			const dispatch = () =>
				view.dispatch({
					effects: sparseAPI.setOrgSparseTree.of({
						query: cyclic as OrgSparseTreeQuery,
						restoreSelection: null,
					}),
					filter,
				})
			if (shared) expect(dispatch).toThrow(/Unregistered window effect; entire batch rejected/)
			else act(dispatch)
			expect(readOperand).not.toHaveBeenCalled()
			expect(view.state.field(orgSparseTreeField)).toBe(before.field(orgSparseTreeField))
			expect(view.state.sliceDoc()).toBe(raw)
		}
		expect(view.state.sliceDoc()).toBe(raw)
		if (runtime) {
			expect(runtime.source).toBe(raw)
			expect(runtime.revision).toBe(0)
		}
		expect(undoDepth(runtime?.state ?? view.state)).toBe(0)
		expect(redoDepth(runtime?.state ?? view.state)).toBe(0)
		expect(onChange).not.toHaveBeenCalled()
		expect(onCommit).not.toHaveBeenCalled()
	})

	it.each([
		true,
		false,
	])("raw state fails closed on cyclic presentation without authority (filter=%s)", (filter) => {
		const state = EditorState.create({
			doc: source,
			extensions: [EditorState.lineSeparator.of("\r\n"), orgSparseTreeField],
		})
		const cyclic: { kind: "not"; operand?: OrgSparseTreeQuery } = { kind: "not" }
		const readOperand = vi.fn(() => cyclic as OrgSparseTreeQuery)
		Object.defineProperty(cyclic, "operand", { get: readOperand })
		const transaction = state.update({
			effects: sparseAPI.setOrgSparseTree.of({
				query: cyclic as OrgSparseTreeQuery,
				restoreSelection: null,
			}),
			filter,
		})
		expect(transaction.state.field(orgSparseTreeField)).toBeNull()
		expect(transaction.state.sliceDoc()).toBe(source)
		expect(transaction.state.selection.toJSON()).toEqual(state.selection.toJSON())
		expect(readOperand).not.toHaveBeenCalled()
	})

	it.each([
		false,
		true,
	])("hides a heading after its tag is removed and safely undoes once in runtime=%s", (shared) => {
		const raw = "* First :work:\r\nfirst body\r\n* Second :work:\r\nsecond body\r\n"
		const edited = raw.replace(":work:", "")
		const onCommit = vi.fn(),
			onChange = vi.fn()
		const runtime = shared
			? createOrgBufferRuntime({
					canCommit: () => true,
					key: { bufferId: "remove-tag", workspaceSessionId: "test" },
					onCommit,
					source: raw,
				})
			: undefined
		let target: OrgEditorCommandTarget | null = null
		render(
			<OrgEditor
				runtime={runtime}
				value={raw}
				onChange={onChange}
				onSave={vi.fn()}
				ariaLabel="remove-tag"
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = viewFor("remove-tag")
		act(() => {
			expect(target!.applyView!(raw, { kind: "sparse-tree", query: "match: tag:work" })).toBe(true)
			view.dispatch({ selection: { anchor: 3 } })
		})
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([
			0,
			raw.indexOf("* Second"),
		])
		expect(undoDepth(runtime?.state ?? view.state)).toBe(0)
		act(() => {
			view.dispatch({ changes: { from: raw.indexOf(":work:"), to: raw.indexOf(":work:") + 6 } })
		})
		expect(view.state.sliceDoc()).toBe(edited)
		if (runtime) expect(runtime.source).toBe(edited)
		const sparse = view.state.field(orgSparseTreeField)!
		expect(sparse.plan?.matchedHeadingStarts).toEqual([edited.indexOf("* Second")])
		expect(sparse.plan?.hiddenRanges).toEqual([{ from: 0, to: edited.indexOf("* Second") }])
		expect(view.contentDOM.textContent).not.toContain("first body")
		expect(view.contentDOM.textContent).toContain("second body")
		expect(view.state.selection.main.empty).toBe(true)
		expect(view.state.selection.main.head).toBe(view.state.doc.line(3).from)
		expect(undoDepth(runtime?.state ?? view.state)).toBe(1)
		expect(redoDepth(runtime?.state ?? view.state)).toBe(0)
		const baseline = view.state
		for (const spec of [
			{ changes: { from: 3, insert: "forged" }, filter: false },
			{ selection: { anchor: 3 }, filter: false },
		]) {
			const dispatch = () => view.dispatch(spec)
			if (shared) expect(dispatch).toThrow(/preflight/)
			else act(dispatch)
			expect(view.state).toBe(baseline)
			expect(view.state.field(orgSparseTreeField)).toBe(sparse)
			expect(view.contentDOM.textContent).not.toContain("first body")
			expect(view.state.sliceDoc()).toBe(edited)
			if (runtime) expect(runtime.source).toBe(edited)
		}
		expect(undoDepth(runtime?.state ?? view.state)).toBe(1)
		act(() => {
			fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "z" })
		})
		expect(view.state.sliceDoc()).toBe(raw)
		if (runtime) expect(runtime.source).toBe(raw)
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([
			0,
			raw.indexOf("* Second"),
		])
		expect(view.state.field(orgSparseTreeField)!.hiddenRanges).toEqual([])
		expect(view.contentDOM.textContent).toContain("first body")
		expect(view.contentDOM.textContent).toContain("second body")
		expect(undoDepth(runtime?.state ?? view.state)).toBe(0)
		expect(redoDepth(runtime?.state ?? view.state)).toBe(1)
	})

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
			view.dispatch({ changes: { from: hidden.from + 2, insert: "bad" }, filter: false })
		})
		expect(view.state).toBe(before)
		expect(view.state.sliceDoc()).toBe(source)
		expect(onChange).not.toHaveBeenCalled()
		expect(undoDepth(view.state)).toBe(0)
		expect(redoDepth(view.state)).toBe(0)
		act(() => {
			view.dispatch({ changes: { from: view.state.doc.line(2).from, insert: "X" }, filter: false })
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
					canCommit: () => true,
					key: { bufferId: "forged", workspaceSessionId: "test" },
					onCommit: vi.fn(),
					source,
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
						annotations: Transaction.userEvent.of(event),
						changes: { from: hidden.from + 2, insert: "forged" },
						filter,
					})
				if (filter)
					act(dispatch) // Ordinary filtered edits are dropped before dispatch.
				else reject(dispatch)
				expect(view.state.sliceDoc()).toBe(source)
			}
			reject(() =>
				view.dispatch({
					annotations: Transaction.userEvent.of(event),
					filter: false,
					selection: { anchor: hidden.from + 2 },
				}),
			)
			// The second step cannot exploit a revealed field produced by step one.
			reject(() =>
				view.dispatch({ changes: { from: hidden.from + 2, insert: "bad" }, filter: false }),
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
					canCommit: () => true,
					key: { bufferId: "owned", workspaceSessionId: "test" },
					onCommit: vi.fn(),
					source,
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
			fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "z" })
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
			fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "y" })
		})
		expect(view.state.sliceDoc()).toBe(edited)
	})
	afterEach(cleanup)

	it.each([
		{ body: "hidden body", name: "CRLF", separator: "\r\n", trailing: true },
		{ body: "hidden body", name: "lone CR", separator: "\r", trailing: true },
		{ body: "hidden\nbody\rwith mixed breaks", name: "mixed", separator: "\r\n", trailing: true },
		{ body: "hidden\0 café 😀 中文", name: "NUL Unicode EOF", separator: "\r\n", trailing: false },
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
		expect(sparse.plan?.matchedHeadingStarts).toEqual([raw.indexOf("* TODO Keep")])
		expect(sparse.plan?.hiddenRanges).toEqual([
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
				changes: { from: 0, insert: "bad", to: a.state.doc.length },
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
			canCommit: () => true,
			key: { bufferId: "guard", workspaceSessionId: "test" },
			onCommit,
			source,
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
			a.dispatch({ changes: { from: hidden.from + 2, insert: "bad" }, filter: false }),
		).toThrow(/preflight/)
		expect(a.state).toBe(baseline)
		const visible = baseline.update({
			changes: { from: baseline.doc.line(2).from, insert: "X" },
			filter: false,
		})
		const hiddenEdit = visible.state.update({
			changes: { from: hidden.from + 3, to: hidden.from + 4 },
			filter: false,
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
		expect(sparse.plan?.hiddenRanges).toEqual([
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
			canCommit: () => true,
			key: { bufferId: "history", workspaceSessionId: "test" },
			onCommit: vi.fn(),
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
		expect(a.state.field(orgSparseTreeField)!.plan?.allVisible).toBe(true)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(onCommit).toHaveBeenCalledOnce()
		act(() => {
			fireEvent.keyDown(b.contentDOM, { ctrlKey: true, key: "z", keyCode: 90 })
		})
		expect(a.state.field(orgSparseTreeField)!.plan?.hiddenRanges).toHaveLength(1)
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
		expect(a.state.field(orgSparseTreeField)!.plan?.allVisible).toBe(true)
		const next = source.replace("Keep", "Missing")
		mounted.rerender(editor(next))
		expect(a.state.field(orgSparseTreeField)!.plan?.hiddenRanges).toHaveLength(1)
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

describe("actual Sparse Tree configured match/inheritance boundary", () => {
	afterEach(() => { cleanup(); useSettings.setState({ orgBehaviorConfigurationJson: "" }); vi.restoreAllMocks() })
	it("captures each window's inheritance policy, evaluates full standard matches and leaves canonical history untouched", () => {
		const raw = "#+FILETAGS: :file:\r\n* Parent :work:\r\n:PROPERTIES:\r\n:EFFORT: 3\r\n:OWNER: Ada\r\n:END:\r\n** TODO Keep :local:\r\nkeep BODY\0\r\n** TODO Hide :blocked:\r\nhidden BODY\r\n* TODO Peer :work:\r\npeer BODY\r\n"
		const onCommit = vi.fn()
		const runtime = createOrgBufferRuntime({ canCommit: () => true, key: { bufferId: "configured", workspaceSessionId: "test" }, onCommit, source: raw })
		let first: OrgEditorCommandTarget | null = null
		let second: OrgEditorCommandTarget | null = null
		useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, inheritance: { tags: ["work"], tagExclusions: ["blocked"], properties: true, propertyExclusions: ["OWNER"] } }) })
		render(<><OrgEditor runtime={runtime} value={raw} onChange={vi.fn()} onSave={vi.fn()} ariaLabel="configured-first" onCommandTarget={(target) => { first = target }} /><OrgEditor runtime={runtime} value={raw} onChange={vi.fn()} onSave={vi.fn()} ariaLabel="configured-second" onCommandTarget={(target) => { second = target }} /></>)
		const query = '+work-blocked+EFFORT>=3/!TODO'
		act(() => { expect(first!.applyView!(raw, { kind: "sparse-tree", query })).toBe(true) })
		const a = viewFor("configured-first")
		const b = viewFor("configured-second")
		expect(a.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([raw.indexOf("** TODO Keep")])
		expect(a.contentDOM.textContent).not.toContain("hidden BODY")
		expect(b.state.field(orgSparseTreeField)).toBeNull()
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(onCommit).not.toHaveBeenCalled()
		act(() => useSettings.setState({ orgBehaviorConfigurationJson: JSON.stringify({ ...DEFAULT_ORG_BEHAVIOR_CONFIGURATION, inheritance: { tags: false, tagExclusions: [], properties: false, propertyExclusions: [] } }) }))
		act(() => { expect(second!.applyView!(raw, { kind: "sparse-tree", query })).toBe(true) })
		expect(b.state.field(orgSparseTreeField)!.plan?.allVisible).toBe(true)
		expect(a.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([raw.indexOf("** TODO Keep")])
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		act(() => { a.dispatch({ changes: { from: raw.indexOf("keep BODY"), insert: "visible " } }) })
		expect(a.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([raw.indexOf("** TODO Keep")])
		expect(b.state.field(orgSparseTreeField)!.plan?.allVisible).toBe(true)
		expect(undoDepth(runtime.state)).toBe(1)
		const prior = a.state.field(orgSparseTreeField)
		act(() => useSettings.setState({ orgBehaviorConfigurationJson: "{broken" }))
		act(() => { expect(first!.applyView!(runtime.source, { kind: "sparse-tree", query: "work" })).toBe(false) })
		expect(a.state.field(orgSparseTreeField)).toBe(prior)
		expect(undoDepth(runtime.state)).toBe(1)
	})
	const rankedContext = (values: readonly string[]): OrgSparseTreeNativeContext => {
		const ranks = new Map(values.map((value, index) => [value, index]))
		return { compareStrings: (left, right) => {
			const a = ranks.get(left), b = ranks.get(right)
			if (a === undefined || b === undefined) throw new OrgSparseTreeContextRequiredError()
			return a - b
		} }
	}
	it("keeps accepted property edits and canonical history while fresh native comparison is pending", async () => {
		const raw = "* First\n:PROPERTIES:\n:NAME: a\n:END:\nfirst body\n* Last\n:PROPERTIES:\n:NAME: z\n:END:\nlast body\n"
		const initial = rankedContext(["a", "m", "z"])
		let resolve: (context: OrgSparseTreeNativeContext) => void = () => { throw new Error("Native read not started") }
		vi.spyOn(nativeCollationAPI, "readOrgSparseTreeNativeContext")
			.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
			.mockResolvedValue(initial)
		const runtime = createOrgBufferRuntime({ key: { bufferId: "native-pending", workspaceSessionId: "test" }, source: raw, canCommit: () => true, onCommit: () => {} })
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor runtime={runtime} value={raw} onChange={vi.fn()} onSave={vi.fn()} ariaLabel="native-pending" onCommandTarget={(next) => { target = next }} />)
		const view = viewFor("native-pending")
		act(() => { expect(target!.applyView!(raw, { kind: "sparse-tree", query: 'NAME<"m"', nativeContext: initial })).toBe(true) })
		expect(view.contentDOM.textContent).not.toContain("last body")
		const from = raw.indexOf(":NAME: a") + ":NAME: ".length
		act(() => { view.dispatch({ changes: { from, to: from + 1, insert: "b" } }) })
		const edited = raw.slice(0, from) + "b" + raw.slice(from + 1)
		const selection = view.state.selection
		expect(runtime.source).toBe(edited)
		expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("pending")
		expect(view.state.field(orgSparseTreeField)!.plan).toBeNull()
		expect(view.contentDOM.textContent).toContain("last body")
		expect(undoDepth(runtime.state)).toBe(1)
		await act(async () => { await Promise.resolve() })
		await act(async () => { resolve(rankedContext(["b", "m", "z"])) })
		await waitFor(() => expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("ready"))
		expect(view.contentDOM.textContent).not.toContain("last body")
		expect(view.state.selection.eq(selection, true)).toBe(true)
		expect(runtime.source).toBe(edited)
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => { fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "z" }) })
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		await waitFor(() => expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("ready"))
	})
	it("does not resurrect a cleared query when its held native comparison completes", async () => {
		const raw = "* First\n:PROPERTIES:\n:NAME: a\n:END:\nfirst body\n* Last\n:PROPERTIES:\n:NAME: z\n:END:\nlast body\n"
		const initial = rankedContext(["a", "m", "z"])
		let resolve: (context: OrgSparseTreeNativeContext) => void = () => { throw new Error("Native read not started") }
		vi.spyOn(nativeCollationAPI, "readOrgSparseTreeNativeContext").mockImplementationOnce(() => new Promise((done) => { resolve = done }))
		const runtime = createOrgBufferRuntime({ key: { bufferId: "native-retire", workspaceSessionId: "test" }, source: raw, canCommit: () => true, onCommit: () => {} })
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor runtime={runtime} value={raw} onChange={vi.fn()} onSave={vi.fn()} ariaLabel="native-retire" onCommandTarget={(next) => { target = next }} />)
		const view = viewFor("native-retire")
		act(() => { target!.applyView!(raw, { kind: "sparse-tree", query: 'NAME<"m"', nativeContext: initial }) })
		const from = raw.indexOf(":NAME: a") + ":NAME: ".length
		act(() => { view.dispatch({ changes: { from, to: from + 1, insert: "b" } }) })
		await act(async () => { await Promise.resolve() })
		const edited = runtime.source
		act(() => { expect(target!.applyView!(edited, { kind: "sparse-tree", query: null })).toBe(true) })
		const selection = view.state.selection
		await act(async () => { resolve(rankedContext(["b", "m", "z"])) })
		expect(view.state.field(orgSparseTreeField)).toBeNull()
		expect(view.state.selection.eq(selection, true)).toBe(true)
		expect(runtime.source).toBe(edited)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(view.contentDOM.textContent).toContain("last body")
	})
	it("reprojects full visiting FILE metadata without changing Source, multirange selection or history", async () => {
		let target: OrgEditorCommandTarget | null = null
		const runtime = createOrgBufferRuntime({ key: { bufferId: "filename", workspaceSessionId: "test" }, source, canCommit: () => true, onCommit: () => {} })
		const editor = (filename: string) => <OrgEditor runtime={runtime} value={source} documentPath="relative.org" documentFilename={filename} onSave={() => {}} ariaLabel="filename" onCommandTarget={(next) => { target = next }} />
		const rendered = render(editor("/approved/a.org")), view = viewFor("filename")
		act(() => { expect(target!.applyView!(source, { kind: "sparse-tree", query: "FILE={a[.]org$}/TODO" })).toBe(true) })
		await waitFor(() => expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("ready"))
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([0])
		expect(view.contentDOM.textContent).not.toContain("hidden body")
		const selection = EditorSelection.create([
			EditorSelection.cursor(2, -1, 2, 27),
			EditorSelection.range(source.indexOf("keep body"), source.indexOf("keep body") + 3),
		], 1)
		act(() => { view.dispatch({ selection }) })
		rendered.rerender(editor("/approved/b.org"))
		await waitFor(() => expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("ready"))
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([])
		expect(view.contentDOM.textContent).toContain("hidden body")
		expect(view.state.selection.eq(selection, true)).toBe(true)
		expect(runtime.source).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
	})
	it("invalidates clock values when an accepted timestamp edit leaves heading offsets unchanged", async () => {
		const raw = "* First\nCLOCK: [2026-10-10 Sat 10:00]--[2026-10-10 Sat 11:00] => 99:00\nfirst body\n* Other\nCLOCK: [2026-10-10 Sat 10:00]--[2026-10-10 Sat 12:00] => 0:01\nother body\n"
		const clock: OrgSparseClockContext = {
			nowEpochMs: Date.UTC(2026, 9, 10, 14), todayStartEpochMs: Date.UTC(2026, 9, 10), todayEndEpochMs: Date.UTC(2026, 9, 11),
			localTimeToEpochMs: (year, month, day, hour, minute) => Date.UTC(year, month - 1, day, hour, minute),
			durationFormat: "gnu-default", includeClockingTask: false, activeClock: null,
		}
		let resolve: (value: OrgSparseClockContext) => void = () => { throw new Error("Clock read not started") }
		vi.spyOn(nativeClockAPI, "readOrgSparseClockContext").mockResolvedValueOnce(clock)
			.mockImplementationOnce(() => new Promise(done => { resolve = done })).mockResolvedValue(clock)
		const runtime = createOrgBufferRuntime({ key: { bufferId: "clock-source", workspaceSessionId: "test" }, source: raw, canCommit: () => true, onCommit: () => {} })
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor runtime={runtime} value={raw} onSave={() => {}} ariaLabel="clock-source" onCommandTarget={(next) => { target = next }} />)
		const view = viewFor("clock-source")
		act(() => { expect(target!.applyView!(raw, { kind: "sparse-tree", query: 'CLOCKSUM="1:00"' })).toBe(true) })
		await waitFor(() => expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("ready"))
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([0])
		const from = raw.indexOf("11:00"), edited = raw.slice(0, from) + "12:00" + raw.slice(from + 5)
		act(() => { view.dispatch({ changes: { from, to: from + 5, insert: "12:00" } }) })
		const selection = view.state.selection
		expect(runtime.source).toBe(edited)
		expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("pending")
		expect(view.state.field(orgSparseTreeField)!.plan).toBeNull()
		expect(view.contentDOM.textContent).toContain("other body")
		expect(undoDepth(runtime.state)).toBe(1)
		await act(async () => { await Promise.resolve() })
		await act(async () => { resolve(clock) })
		await waitFor(() => expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("ready"))
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([])
		expect(view.state.selection.eq(selection, true)).toBe(true)
		expect(runtime.source).toBe(edited)
		act(() => { fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "z" }) })
		await waitFor(() => expect(view.state.field(orgSparseTreeField)!.contextStatus).toBe("ready"))
		expect(view.state.field(orgSparseTreeField)!.plan?.matchedHeadingStarts).toEqual([0])
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
	})
})
