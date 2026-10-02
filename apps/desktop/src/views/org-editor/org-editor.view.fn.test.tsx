import { undo, undoDepth } from "@codemirror/commands"
import { foldCode } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OrgEditor } from "./org-editor.view.fn"
import type { OrgEditorCommandTarget, OrgEditorSessionSnapshot } from "./org-editor.types"

function getEditorView(): EditorView {
	const content = screen.getByRole("textbox")
	const view = EditorView.findFromDOM(content)
	if (!view) {
		throw new Error("CodeMirror view was not created")
	}
	return view
}

describe("OrgEditor", () => {
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it("retains independent opaque A/B sessions with undo, selection, and scroll", () => {
		vi.useFakeTimers()
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const mount = (sessionKey: string, value: string) =>
			render(
				<OrgEditor
					sessionKey={sessionKey}
					sessionCache={cache}
					value={value}
					onChange={vi.fn()}
					onSave={vi.fn()}
					documentPath="/same/note.org"
				/>,
			)
		let mounted = mount("capability-A", "alpha")
		let view = getEditorView()
		view.dispatch({ changes: { from: 5, insert: " A" } })
		view.dispatch({ selection: { anchor: 1, head: 4 } })
		view.scrollDOM.scrollTop = 123
		view.scrollDOM.scrollLeft = 17
		mounted.unmount()
		mounted = mount("capability-B", "beta")
		view = getEditorView()
		view.dispatch({ changes: { from: 4, insert: " B" } })
		view.dispatch({ selection: { anchor: 2 } })
		view.scrollDOM.scrollTop = 45
		view.scrollDOM.scrollLeft = 9
		mounted.unmount()
		mounted = mount("capability-A", "alpha A")
		view = getEditorView()
		expect(view.state.selection.main).toMatchObject({ anchor: 1, head: 4 })
		act(() => vi.advanceTimersByTime(32))
		expect(view.scrollDOM.scrollTop).toBe(123)
		expect(view.scrollDOM.scrollLeft).toBe(17)
		expect(undo(view)).toBe(true)
		expect(view.state.sliceDoc()).toBe("alpha")
		mounted.unmount()
		mounted = mount("capability-B", "beta B")
		view = getEditorView()
		expect(view.state.selection.main.head).toBe(2)
		act(() => vi.advanceTimersByTime(32))
		expect(view.scrollDOM.scrollTop).toBe(45)
		expect(view.scrollDOM.scrollLeft).toBe(9)
		expect(undo(view)).toBe(true)
		expect(view.state.sliceDoc()).toBe("beta")
		mounted.unmount()
	})

	it("rebinds callbacks and current policies without reviving pending prefixes", () => {
		vi.useFakeTimers()
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const oldChange = vi.fn(),
			oldSave = vi.fn(),
			oldTags = vi.fn(),
			oldPrefix = vi.fn()
		const mounted = render(
			<OrgEditor
				sessionKey="cap"
				sessionCache={cache}
				value={"* Note\r\nbody"}
				onChange={oldChange}
				onSave={oldSave}
				onEditTags={oldTags}
				onPrefixChange={oldPrefix}
				prefixTimeoutMs={1000}
			/>,
		)
		getEditorView().dispatch({ changes: { from: 6, insert: "!" } })
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "c" })
		mounted.unmount()
		const oldCalls = oldPrefix.mock.calls.length
		const onChange = vi.fn(),
			onSave = vi.fn(),
			onEditTags = vi.fn()
		const props = {
			sessionKey: "cap",
			sessionCache: cache,
			value: "* Note!\r\nbody",
			onChange,
			onSave,
			onEditTags,
			ariaLabel: "Restored editor",
		}
		const restored = render(<OrgEditor {...props} readOnly />)
		const view = getEditorView()
		expect(undoDepth(view.state)).toBe(1)
		expect(view.state.readOnly).toBe(true)
		expect(screen.getByRole("textbox", { name: "Restored editor" })).toHaveAttribute(
			"contenteditable",
			"false",
		)
		expect(view.state.lineBreak).toBe("\r\n")
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "q" })
		expect(onEditTags).not.toHaveBeenCalled()
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "s" })
		expect(onSave).toHaveBeenCalledOnce()
		expect(oldSave).not.toHaveBeenCalled()
		restored.rerender(<OrgEditor {...props} />)
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "q" })
		expect(onEditTags).toHaveBeenCalledOnce()
		expect(oldTags).not.toHaveBeenCalled()
		view.dispatch({ changes: { from: view.state.doc.length, insert: "new" } })
		expect(onChange).toHaveBeenCalledExactlyOnceWith("* Note!\r\nbodynew")
		expect(oldChange).toHaveBeenCalledTimes(1)
		restored.unmount()
		act(() => vi.advanceTimersByTime(2000))
		expect(oldPrefix).toHaveBeenCalledTimes(oldCalls)
	})

	it("rejects stale source and workspace identities even for the same path", () => {
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const mount = (sessionKey: string, value: string) =>
			render(
				<OrgEditor
					sessionKey={sessionKey}
					sessionCache={cache}
					value={value}
					documentPath="/same/note.org"
					onChange={vi.fn()}
					onSave={vi.fn()}
				/>,
			)
		let mounted = mount("old-workspace-buffer", "original")
		getEditorView().dispatch({ changes: { from: 8, insert: "!" }, selection: { anchor: 3 } })
		mounted.unmount()
		mounted = mount("new-workspace-buffer", "original!")
		expect(undoDepth(getEditorView().state)).toBe(0)
		expect(getEditorView().state.selection.main.head).toBe(0)
		mounted.unmount()
		mounted = mount("old-workspace-buffer", "external\r\nreplacement")
		const view = getEditorView()
		expect(view.state.sliceDoc()).toBe("external\r\nreplacement")
		expect(view.state.lineBreak).toBe("\r\n")
		expect(undo(view)).toBe(false)
		expect(view.state.selection.main.head).toBe(0)
		mounted.unmount()
		expect(cache.get("old-workspace-buffer")?.state.sliceDoc()).toBe("external\r\nreplacement")
		expect(undoDepth(cache.get("old-workspace-buffer")!.state)).toBe(0)
	})

	it.each([
		"wheel",
		"reveal",
		"external",
	])("does not restore old scroll after newer %s intent", (intent) => {
		vi.useFakeTimers()
		let frame = 0
		vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => ++frame)
		const cancel = vi.spyOn(window, "cancelAnimationFrame")
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const props = {
			sessionKey: "cap",
			sessionCache: cache,
			value: "body\nnext",
			onChange: vi.fn(),
			onSave: vi.fn(),
		}
		let mounted = render(<OrgEditor {...props} />)
		getEditorView().scrollDOM.scrollTop = 99
		mounted.unmount()
		mounted = render(<OrgEditor {...props} />)
		const view = getEditorView()
		const restorationFrame = frame
		if (intent === "wheel") fireEvent.wheel(view.scrollDOM)
		else if (intent === "reveal")
			mounted.rerender(<OrgEditor {...props} revealTarget={{ line: 2, requestId: 1 }} />)
		else mounted.rerender(<OrgEditor {...props} value="replacement" />)
		expect(cancel).toHaveBeenCalledWith(restorationFrame)
		view.scrollDOM.scrollTop = 7
		act(() => vi.advanceTimersByTime(32))
		expect(view.scrollDOM.scrollTop).toBe(7)
	})

	it("cancels a pending scroll restoration on unmount", () => {
		vi.useFakeTimers()
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const mount = () =>
			render(
				<OrgEditor
					sessionKey="cap"
					sessionCache={cache}
					value="body"
					onChange={vi.fn()}
					onSave={vi.fn()}
				/>,
			)
		let mounted = mount()
		getEditorView().scrollDOM.scrollTop = 99
		mounted.unmount()
		mounted = mount()
		const view = getEditorView()
		const cancel = vi.spyOn(window, "cancelAnimationFrame")
		mounted.unmount()
		expect(cancel).toHaveBeenCalled()
		view.scrollDOM.scrollTop = 7
		act(() => vi.advanceTimersByTime(32))
		expect(view.scrollDOM.scrollTop).toBe(7)
		cancel.mockRestore()
	})

	it("publishes prefix sessions, preserves modifier keys, and clears after idle or cleanup", () => {
		vi.useFakeTimers()
		const onPrefixChange = vi.fn()
		const onEditTags = vi.fn()
		const onChange = vi.fn()
		const { unmount } = render(
			<OrgEditor
				value="* Note"
				onChange={onChange}
				onSave={vi.fn()}
				onPrefixChange={onPrefixChange}
				prefixTimeoutMs={1200}
				onEditTags={onEditTags}
			/>,
		)
		const editor = screen.getByRole("textbox")
		getEditorView().dispatch({ selection: { anchor: 2 } })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		const session = onPrefixChange.mock.lastCall?.[0]
		expect(session).toMatchObject({ label: "C-c", expiresAt: Date.now() + 1200 })
		for (const key of ["Control", "Shift", "Alt", "Meta", "AltGraph"]) {
			expect(fireEvent.keyDown(editor, { key })).toBe(true)
		}
		expect(onPrefixChange).toHaveBeenCalledTimes(1)
		fireEvent.keyDown(editor, { ctrlKey: true, key: "q" })
		expect(onEditTags).toHaveBeenCalledExactlyOnceWith(2)
		expect(onPrefixChange.mock.calls.map(([value]) => value)).toEqual([session, null])

		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		act(() => vi.advanceTimersByTime(1199))
		expect(onPrefixChange.mock.lastCall?.[0]).not.toBeNull()
		act(() => vi.advanceTimersByTime(1))
		expect(onPrefixChange.mock.lastCall?.[0]).toBeNull()
		fireEvent.keyDown(editor, { ctrlKey: true, key: "q" })
		expect(onEditTags).toHaveBeenCalledTimes(1)

		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		unmount()
		expect(onPrefixChange.mock.lastCall?.[0]).toBeNull()
		const calls = onPrefixChange.mock.calls.length
		act(() => vi.advanceTimersByTime(1200))
		expect(onPrefixChange).toHaveBeenCalledTimes(calls)
		expect(onChange).not.toHaveBeenCalled()
	})

	it("clears an indefinite prefix on window blur even while CodeMirror remains active", () => {
		vi.useFakeTimers()
		const onPrefixChange = vi.fn()
		const onEditTags = vi.fn()
		render(
			<OrgEditor
				value="* Note"
				onChange={vi.fn()}
				onSave={vi.fn()}
				onPrefixChange={onPrefixChange}
				onEditTags={onEditTags}
			/>,
		)
		const view = getEditorView()
		act(() => view.focus())
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		expect(onPrefixChange.mock.lastCall?.[0]).toMatchObject({ expiresAt: null })
		act(() => vi.advanceTimersByTime(60_000))
		expect(onPrefixChange.mock.lastCall?.[0]).not.toBeNull()
		expect(view.hasFocus).toBe(true)
		fireEvent.blur(window)
		expect(editor).toHaveFocus()
		expect(view.hasFocus).toBe(true)
		expect(onPrefixChange.mock.lastCall?.[0]).toBeNull()
		expect(fireEvent.keyDown(editor, { ctrlKey: true, key: "q" })).toBe(true)
		expect(onEditTags).not.toHaveBeenCalled()
	})

	it("clears a prefix before same-document reveal selection and focus", () => {
		const onPrefixChange = vi.fn()
		const onEditTags = vi.fn()
		const props = {
			value: "one\ntwo\nthree",
			onChange: vi.fn(),
			onSave: vi.fn(),
			onPrefixChange,
			onEditTags,
		}
		const { rerender } = render(<OrgEditor {...props} />)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		expect(onPrefixChange.mock.lastCall?.[0]).toMatchObject({ expiresAt: null })
		const dispatch = view.dispatch.bind(view)
		const focus = view.focus.bind(view)
		const dispatchSpy = vi
			.spyOn(view, "dispatch")
			.mockImplementation((...args: Parameters<typeof view.dispatch>) => {
				expect(onPrefixChange.mock.lastCall?.[0]).toBeNull()
				dispatch(...args)
			})
		const focusSpy = vi.spyOn(view, "focus").mockImplementation(() => {
			expect(onPrefixChange.mock.lastCall?.[0]).toBeNull()
			focus()
		})
		rerender(<OrgEditor {...props} revealTarget={{ line: 3, requestId: 1 }} />)
		expect(dispatchSpy).toHaveBeenCalled()
		expect(focusSpy).toHaveBeenCalled()
		expect(view.state.selection.main.head).toBe(8)
		expect(editor).toHaveFocus()
		expect(onPrefixChange.mock.calls.map(([prefix]) => prefix?.label ?? null)).toEqual([
			"C-c",
			null,
		])
		expect(fireEvent.keyDown(editor, { ctrlKey: true, key: "q" })).toBe(true)
		expect(onEditTags).not.toHaveBeenCalled()
		dispatchSpy.mockRestore()
		focusSpy.mockRestore()
	})

	it("guards buffer command transactions against stale source, invalid ranges, and readonly", () => {
		let target: OrgEditorCommandTarget | null = null
		const onCommandTarget = (current: OrgEditorCommandTarget | null) => {
			target = current
		}
		const { rerender, unmount } = render(
			<OrgEditor
				value="* Note"
				onChange={vi.fn()}
				onSave={vi.fn()}
				onCommandTarget={onCommandTarget}
			/>,
		)
		const port = target as OrgEditorCommandTarget | null
		if (!port) throw new Error("Missing command target")
		expect(port.applyEdit("stale", { from: 0, to: 0, insert: "X", cursor: 0 })).toBe(false)
		expect(port.applyEdit("* Note", { from: -1, to: 0, insert: "X", cursor: 0 })).toBe(false)
		expect(port.applyEdit("* Note", { from: 0, to: 0, insert: "X", cursor: 999 })).toBe(false)
		rerender(
			<OrgEditor
				value="* Note"
				onChange={vi.fn()}
				onSave={vi.fn()}
				onCommandTarget={onCommandTarget}
				readOnly
			/>,
		)
		expect(port.applyEdit("* Note", { from: 6, to: 6, insert: " :work:", cursor: 2 })).toBe(false)
		unmount()
		expect(target).toBeNull()
		expect(port.applyEdit("* Note", { from: 6, to: 6, insert: " :work:", cursor: 2 })).toBe(false)
	})

	it("keeps Org source as raw text and reports document edits", () => {
		const onChange = vi.fn()
		render(
			<OrgEditor
				value={"* Heading\n#+begin_export html\n<b>raw</b>\n#+end_export"}
				onChange={onChange}
				onSave={vi.fn()}
				ariaLabel="Raw Org editor"
			/>,
		)

		const view = getEditorView()
		expect(view.state.doc.toString()).toBe(
			"* Heading\n#+begin_export html\n<b>raw</b>\n#+end_export",
		)

		view.dispatch({ changes: { from: view.state.doc.length, insert: "\n** Child" } })
		expect(onChange).toHaveBeenLastCalledWith(
			"* Heading\n#+begin_export html\n<b>raw</b>\n#+end_export\n** Child",
		)
	})

	it("preserves CRLF line endings when editing", () => {
		const onChange = vi.fn()
		const source = "* Heading\r\nbody\r\n"
		render(<OrgEditor value={source} onChange={onChange} onSave={vi.fn()} />)

		const view = getEditorView()
		expect(view.state.sliceDoc()).toBe(source)
		view.dispatch({ changes: { from: view.state.doc.length, insert: "next" } })
		expect(onChange).toHaveBeenLastCalledWith(`${source}next`)
	})

	it("moves CRLF subtrees without introducing duplicate carriage returns", () => {
		const onChange = vi.fn()
		const source = "* One\r\nbody\r\n* Two\r\nbody two\r\n"
		render(<OrgEditor value={source} onChange={onChange} onSave={vi.fn()} />)
		const view = getEditorView()
		view.dispatch({ selection: { anchor: 0 } })
		fireEvent.keyDown(screen.getByRole("textbox"), { altKey: true, key: "ArrowDown" })
		expect(onChange).toHaveBeenLastCalledWith("* Two\r\nbody two\r\n* One\r\nbody\r\n")
		expect(view.state.doc.lineAt(view.state.selection.main.head).text).toBe("* One")
		expect(onChange.mock.lastCall?.[0]).not.toContain("\r\r\n")
	})

	it("highlights core Org syntax without changing the source", () => {
		const source = "#+title: Test\n* TODO Heading :work:\n:PROPERTIES:\n:ID: note-1\n:END:"
		render(<OrgEditor value={source} onChange={vi.fn()} onSave={vi.fn()} />)

		expect(document.querySelector(".cm-org-directive")).not.toBeNull()
		expect(document.querySelector(".cm-org-heading")).not.toBeNull()
		expect(document.querySelector(".cm-org-todo")).not.toBeNull()
		expect(document.querySelector(".cm-org-tags")).not.toBeNull()
		expect(document.querySelector(".cm-org-property")).not.toBeNull()
		expect(getEditorView().state.doc.toString()).toBe(source)
	})

	it("highlights and cycles configured TODO workflows", () => {
		const onChange = vi.fn()
		render(
			<OrgEditor
				value={"#+TODO: NEXT WAIT | COMPLETE CANCELED\n* WAIT Review"}
				onChange={onChange}
				onSave={vi.fn()}
			/>,
		)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")
		expect(document.querySelector(".cm-org-todo")?.textContent).toBe("WAIT")
		view.dispatch({ selection: { anchor: view.state.doc.line(2).from + 2 } })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "t" })
		expect(onChange).toHaveBeenLastCalledWith(
			"#+TODO: NEXT WAIT | COMPLETE CANCELED\n* COMPLETE Review",
		)
		expect(document.querySelector(".cm-org-done")?.textContent).toBe("COMPLETE")
	})

	it("folds an Org subtree without changing its text", () => {
		const source = "* Parent\nbody\n** Child\nchild body\n* Sibling\nsibling body"
		const onChange = vi.fn()
		render(<OrgEditor value={source} onChange={onChange} onSave={vi.fn()} />)

		const view = getEditorView()
		expect(document.querySelector(".cm-foldGutter")).not.toBeNull()
		expect(foldCode(view)).toBe(true)

		expect(document.querySelector(".cm-foldPlaceholder")).not.toBeNull()
		expect(view.state.doc.toString()).toBe(source)
		expect(onChange).not.toHaveBeenCalled()
	})

	it("uses Org-style Tab folding on headings", () => {
		const source = "* Parent\nbody\n** Child\nchild body\n* Sibling"
		render(<OrgEditor value={source} onChange={vi.fn()} onSave={vi.fn()} />)
		const view = getEditorView()
		view.dispatch({ selection: { anchor: 0 } })
		fireEvent.keyDown(screen.getByRole("textbox"), { key: "Tab" })
		expect(document.querySelector(".cm-foldPlaceholder")).not.toBeNull()
		expect(view.state.doc.toString()).toBe(source)
	})

	it("uses actual fold state for Shift-Tab and indents non-headings with Tab", () => {
		const onChange = vi.fn()
		render(<OrgEditor value={"* Parent\nbody\n* Sibling"} onChange={onChange} onSave={vi.fn()} />)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")
		expect(foldCode(view)).toBe(true)
		expect(document.querySelector(".cm-foldPlaceholder")).not.toBeNull()
		fireEvent.keyDown(editor, { shiftKey: true, key: "Tab" })
		expect(document.querySelector(".cm-foldPlaceholder")).toBeNull()

		view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
		fireEvent.keyDown(editor, { key: "Tab" })
		expect(onChange).toHaveBeenLastCalledWith("* Parent\n  body\n* Sibling")
	})

	it("routes subtree transfer chords, including a nested extra prefix", () => {
		const refile = vi.fn()
		const archive = vi.fn()
		render(
			<OrgEditor
				value="* Note"
				onChange={vi.fn()}
				onSave={vi.fn()}
				onRefileSubtree={refile}
				onArchiveSubtree={archive}
			/>,
		)
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		expect(fireEvent.keyDown(editor, { ctrlKey: true, key: "w" })).toBe(false)
		expect(refile).toHaveBeenCalledWith(0)
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		expect(fireEvent.keyDown(editor, { ctrlKey: true, key: "x" })).toBe(false)
		expect(archive).not.toHaveBeenCalled()
		expect(fireEvent.keyDown(editor, { ctrlKey: true, key: "a" })).toBe(false)
		expect(archive).toHaveBeenCalledWith(0)
	})

	it("supports Org Ctrl-c chords for TODO and checkboxes", () => {
		const onChange = vi.fn()
		render(<OrgEditor value={"* Note\n- [ ] task"} onChange={onChange} onSave={vi.fn()} />)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")
		view.dispatch({ selection: { anchor: 2 } })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "t" })
		expect(onChange).toHaveBeenLastCalledWith("* TODO Note\n- [ ] task")

		view.dispatch({ selection: { anchor: view.state.doc.line(2).from + 3 } })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		expect(onChange).toHaveBeenLastCalledWith("* TODO Note\n- [X] task")
	})

	it("keeps Org editing commands CRLF-safe", () => {
		const onChange = vi.fn()
		render(
			<OrgEditor value={"intro\r\n* Note\r\n- [ ] task"} onChange={onChange} onSave={vi.fn()} />,
		)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")

		view.dispatch({ selection: { anchor: view.state.doc.line(2).from + 2 } })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "t" })
		expect(onChange).toHaveBeenLastCalledWith("intro\r\n* TODO Note\r\n- [ ] task")

		view.dispatch({ selection: { anchor: view.state.doc.length } })
		fireEvent.keyDown(editor, { key: "Enter" })
		expect(onChange).toHaveBeenLastCalledWith("intro\r\n* TODO Note\r\n- [ ] task\r\n- [ ] ")
		expect(view.state.selection.main.head).toBe(view.state.doc.length)
	})

	it("preserves native copy with a selection and consumes recognized Org chords", () => {
		render(<OrgEditor value="plain text" onChange={vi.fn()} onSave={vi.fn()} />)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")
		view.dispatch({ selection: { anchor: 0, head: 5 } })
		expect(fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })).toBe(true)
		view.dispatch({ selection: { anchor: 0 } })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		expect(fireEvent.keyDown(editor, { ctrlKey: true, key: "o" })).toBe(false)
	})

	it("dispatches Org metadata chords and inserts timestamps", () => {
		const onEditTags = vi.fn()
		const onSchedule = vi.fn()
		const onDeadline = vi.fn()
		const onSetProperty = vi.fn()
		const onChange = vi.fn()
		render(
			<OrgEditor
				value="* Note"
				onChange={onChange}
				onSave={vi.fn()}
				onEditTags={onEditTags}
				onSchedule={onSchedule}
				onDeadline={onDeadline}
				onSetProperty={onSetProperty}
			/>,
		)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")
		view.dispatch({ selection: { anchor: 2 } })
		for (const [key, callback] of [
			["q", onEditTags],
			["s", onSchedule],
			["d", onDeadline],
			["p", onSetProperty],
		] as const) {
			fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
			fireEvent.keyDown(editor, { ctrlKey: true, key })
			expect(callback).toHaveBeenLastCalledWith(2)
		}
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { key: "." })
		expect(onChange.mock.lastCall?.[0]).toMatch(/^\* <\d{4}-\d{2}-\d{2}>Note$/)
	})

	it("does not open metadata commands while read-only", () => {
		const onSchedule = vi.fn()
		render(
			<OrgEditor
				value="* Note"
				onChange={vi.fn()}
				onSave={vi.fn()}
				readOnly
				onSchedule={onSchedule}
			/>,
		)
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { ctrlKey: true, key: "s" })
		expect(onSchedule).not.toHaveBeenCalled()
	})

	it("continues Org lists and inserts sibling headings", () => {
		const onChange = vi.fn()
		render(<OrgEditor value={"* First\n- [X] done"} onChange={onChange} onSave={vi.fn()} />)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")
		view.dispatch({ selection: { anchor: view.state.doc.length } })
		fireEvent.keyDown(editor, { key: "Enter" })
		expect(onChange).toHaveBeenLastCalledWith("* First\n- [X] done\n- [ ] ")
		fireEvent.keyDown(editor, { key: "Enter" })
		expect(onChange).toHaveBeenLastCalledWith("* First\n- [X] done\n")

		view.dispatch({ selection: { anchor: 2 } })
		fireEvent.keyDown(editor, { altKey: true, key: "Enter" })
		expect(onChange).toHaveBeenLastCalledWith("* First\n* \n- [X] done\n")
	})

	it("continues ordered and indented star list markers", () => {
		const onChange = vi.fn()
		render(<OrgEditor value={"1. first\n  * nested"} onChange={onChange} onSave={vi.fn()} />)
		const view = getEditorView()
		const editor = screen.getByRole("textbox")
		view.dispatch({ selection: { anchor: view.state.doc.line(1).to } })
		fireEvent.keyDown(editor, { key: "Enter" })
		expect(onChange).toHaveBeenLastCalledWith("1. first\n2. \n  * nested")
		view.dispatch({ selection: { anchor: view.state.doc.length } })
		fireEvent.keyDown(editor, { key: "Enter" })
		expect(onChange).toHaveBeenLastCalledWith("1. first\n2. \n  * nested\n  * ")
	})

	it("applies external values without echoing onChange", () => {
		const onChange = vi.fn()
		const { rerender } = render(
			<OrgEditor value="first" onChange={onChange} onSave={vi.fn()} ariaLabel="Org editor" />,
		)

		rerender(
			<OrgEditor value="second" onChange={onChange} onSave={vi.fn()} ariaLabel="Org editor" />,
		)

		expect(getEditorView().state.doc.toString()).toBe("second")
		expect(onChange).not.toHaveBeenCalled()
	})

	it("adopts externally changed line endings without duplicating carriage returns", () => {
		const onChange = vi.fn()
		const { rerender } = render(
			<OrgEditor value={"* One\nbody\n"} onChange={onChange} onSave={vi.fn()} />,
		)

		rerender(<OrgEditor value={"* One\r\nbody\r\n"} onChange={onChange} onSave={vi.fn()} />)
		const view = getEditorView()
		expect(view.state.sliceDoc()).toBe("* One\r\nbody\r\n")
		view.dispatch({ changes: { from: view.state.doc.length, insert: "next" } })
		expect(onChange).toHaveBeenLastCalledWith("* One\r\nbody\r\nnext")
	})

	it("reveals a requested one-based source line", () => {
		const { rerender } = render(
			<OrgEditor value={"one\ntwo\nthree"} onChange={vi.fn()} onSave={vi.fn()} />,
		)
		rerender(
			<OrgEditor
				value={"one\ntwo\nthree"}
				onChange={vi.fn()}
				onSave={vi.fn()}
				revealTarget={{ line: 3, requestId: 1 }}
			/>,
		)
		expect(getEditorView().state.selection.main.head).toBe(8)
	})

	it("dispatches refile and archive shortcuts with the current cursor", () => {
		const onRefileSubtree = vi.fn()
		const onArchiveSubtree = vi.fn()
		render(
			<OrgEditor
				value={"intro\r\n* One\r\nbody"}
				onChange={vi.fn()}
				onSave={vi.fn()}
				onRefileSubtree={onRefileSubtree}
				onArchiveSubtree={onArchiveSubtree}
			/>,
		)
		const view = getEditorView()
		view.dispatch({ selection: { anchor: view.state.doc.line(2).from + 2 } })
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "r", shiftKey: true })
		fireEvent.keyDown(editor, { altKey: true, ctrlKey: true, key: "a" })
		expect(onRefileSubtree).toHaveBeenCalledWith(9)
		expect(onArchiveSubtree).toHaveBeenCalledWith(9)
	})

	it("binds Mod-s, exposes its label, and supports read-only updates", () => {
		const onSave = vi.fn()
		const { rerender } = render(
			<OrgEditor value="* Note" onChange={vi.fn()} onSave={onSave} ariaLabel="Editing note.org" />,
		)

		const editable = screen.getByRole("textbox", { name: "Editing note.org" })
		fireEvent.keyDown(editable, { ctrlKey: true, key: "s" })
		expect(onSave).toHaveBeenCalledOnce()

		rerender(
			<OrgEditor
				value="* Note"
				onChange={vi.fn()}
				onSave={onSave}
				readOnly
				ariaLabel="Read-only note.org"
			/>,
		)

		expect(screen.getByRole("textbox", { name: "Read-only note.org" })).toHaveAttribute(
			"contenteditable",
			"false",
		)
	})
})
