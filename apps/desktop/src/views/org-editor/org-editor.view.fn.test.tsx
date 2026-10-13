import { undo, undoDepth } from "@codemirror/commands"
import { foldCode, foldedRanges } from "@codemirror/language"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OrgEditor } from "./org-editor.view.fn"
import type { OrgEditorCommandTarget, OrgEditorSessionSnapshot } from "./org-editor.types"
import { deriveOrgCommands, dispatchOrgCommand, type OrgCommandContext } from "@/flows/org-command/org-workspace-command"
import { ApplicationCommandProvider, useApplicationCommandHost, useApplicationCommandRegistration, type ApplicationCommandDescriptor } from "@/views/application/application-command-provider"
import { StrictMode, useEffect, useState } from "react"
import { useSettings } from "@/hooks/use-settings"
import { getOrgInputConfiguration } from "@/hooks/use-org-input-configuration"
import { useOrgScopedInput } from "@/hooks/use-org-scoped-input"

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
		useSettings.setState({ orgKeymapConfigurationJson: "", orgBehaviorConfigurationJson: "" })
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it("does not inherit Save after a fresh Source Mod-S null override, while leaving fallback native", () => {
		useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1,
			bindings: [{ scope: "org-source", key: "Mod-s", command: null }] }) })
		const inherited = vi.fn(() => true)
		const save = vi.fn()
		function WorkspaceRoute() {
			const input = useOrgScopedInput({ scope: "workspace", owner: inherited, execute: inherited,
				onUnavailable: () => {}, acceptsEvent: () => true })
			useEffect(() => {
				const listener = (event: KeyboardEvent) => { input.handleKeyDown(event) }
				window.addEventListener("keydown", listener)
				return () => window.removeEventListener("keydown", listener)
			}, [input.handleKeyDown])
			return null
		}
		render(<><WorkspaceRoute /><OrgEditor value={"* TODO Raw\r\nbody\0😀"} onSave={save} /></>)
		const editor = screen.getByRole("textbox")
		const event = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, repeat: false, bubbles: true, cancelable: true })
		act(() => { editor.dispatchEvent(event) })
		expect(event.defaultPrevented).toBe(false)
		expect(inherited).not.toHaveBeenCalled()
		expect(save).not.toHaveBeenCalled()
		expect(getEditorView().state.sliceDoc()).toBe("* TODO Raw\r\nbody\0😀")
	})

	it("navigates real table fields and rows before indent, fold, or list fallback without rewriting aligned raw source", () => {
		const source = "| 2 | 3 |\r\n| 4 | 5 |\r\noutside\0😀"
		render(<OrgEditor value={source} initialCursor={2} onSave={vi.fn()} />)
		const editor = screen.getByRole("textbox")
		const view = getEditorView()
		fireEvent.keyDown(editor, { key: "Tab" })
		fireEvent.keyUp(window, { key: "Tab" })
		expect(view.state.selection.main.head).toBe(6)
		fireEvent.keyDown(editor, { key: "Tab", shiftKey: true })
		fireEvent.keyUp(window, { key: "Tab", shiftKey: true })
		expect(view.state.selection.main.head).toBe(2)
		fireEvent.keyDown(editor, { key: "Enter" })
		fireEvent.keyUp(window, { key: "Enter" })
		expect(view.state.doc.lineAt(view.state.selection.main.head).number).toBe(2)
		expect(view.state.doc.sliceString(view.state.selection.main.head, view.state.selection.main.head + 1)).toBe("4")
		expect(view.state.sliceDoc()).toBe(source)
		for (const init of [{ key: "Tab", isComposing: true }, { key: "Enter", keyCode: 229 }]) {
			fireEvent.keyDown(editor, init)
			fireEvent.keyUp(window, { key: init.key, ...("keyCode" in init ? { keyCode: init.keyCode } : {}) })
			expect(view.state.sliceDoc()).toBe(source)
		}
	})
	it("aligns a valid raw table during navigation in one undo event", () => {
		const source = "|😀|2|\r\n|3|long|\r\noutside\0😀"
		render(<OrgEditor value={source} initialCursor={1} onSave={vi.fn()} />)
		const view = getEditorView()
		const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })
		fireEvent(view.contentDOM, tab)
		fireEvent.keyUp(window, { key: "Tab" })
		expect(tab.defaultPrevented).toBe(true)
		expect(view.state.doc.sliceString(view.state.selection.main.head, view.state.selection.main.head + 1)).toBe("2")
		expect(view.state.sliceDoc()).not.toBe(source)
		expect(view.state.sliceDoc()).toMatch(/\r\noutside\0😀$/)
		expect(undoDepth(view.state)).toBe(1)
		act(() => { expect(undo(view)).toBe(true) })
		expect(view.state.sliceDoc()).toBe(source)
		expect(undoDepth(view.state)).toBe(0)
	})
	it("does not indent malformed table rows or align a table across hidden Source ranges", () => {
		const malformed = "| one | two |\r\n| open\r\noutside\0😀"
		const app = render(<OrgEditor value={malformed} initialCursor={2} onSave={vi.fn()} />)
		fireEvent.keyDown(screen.getByRole("textbox"), { key: "Tab" })
		fireEvent.keyUp(window, { key: "Tab" })
		expect(getEditorView().state.sliceDoc()).toBe(malformed)
		expect(undoDepth(getEditorView().state)).toBe(0)
		app.unmount()
		const source = "| 2 | 3 |\r\n| 4 | 5 |\r\noutside\0😀"
		render(<OrgEditor value={source} initialCursor={2} visibleSourceRange={{ from: 0, to: source.indexOf("| 4") }} onSave={vi.fn()} />)
		fireEvent.keyDown(screen.getByRole("textbox"), { key: "Tab" })
		fireEvent.keyUp(window, { key: "Tab" })
		expect(getEditorView().state.selection.main.head).toBe(2)
		expect(getEditorView().state.sliceDoc()).toBe(source)
		expect(undoDepth(getEditorView().state)).toBe(0)
	})

	it("reports the exact clicked raw link position without moving the original Source selection", () => {
		const source = "[[id:first]]\r\n[[id:second]]\r\nbody\0😀"
		const onOpenOrgLink = vi.fn()
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor value={source} documentPath="source.org" onSave={vi.fn()}
			onOpenOrgLink={onOpenOrgLink} onCommandTarget={(next) => { target = next }} />)
		const view = getEditorView()
		expect(target!.executeCommand("link")).toBe(true)
		expect(onOpenOrgLink.mock.calls[0]?.[1]).toBe(0)
		const selection = EditorSelection.create([EditorSelection.range(2, 5), EditorSelection.cursor(view.state.doc.length)], 0)
		view.dispatch({ selection })
		const clicked = source.indexOf("second")
		vi.spyOn(view, "posAtCoords").mockReturnValue(clicked - 1)
		fireEvent.mouseDown(screen.getByRole("textbox"), { button: 0, ctrlKey: true, clientX: 10, clientY: 10 })
		expect(onOpenOrgLink).toHaveBeenCalledTimes(2)
		expect(onOpenOrgLink.mock.calls[1]?.[1]).toBe(clicked)
		expect(view.state.selection.eq(selection)).toBe(true)
		expect(view.state.sliceDoc()).toBe(source)
	})


	it("uses configured bindings and transient hints in real Source without altering bytes or full selections", () => {
		const raw = JSON.stringify({ version: 1, bindings: [{ scope: "org-source", key: "A-t", command: "tags" }],
			leaders: [{ scope: "org-source", key: "C-l", map: "planning" }],
			transients: [{ id: "planning", label: "Planning", scope: "org-source", timeoutMs: null,
				bindings: [{ key: "s", command: "scheduled" }] }] })
		useSettings.setState({ orgKeymapConfigurationJson: raw })
		const onEditTags = vi.fn()
		const onSchedule = vi.fn()
		const onPrefixChange = vi.fn()
		const onChange = vi.fn()
		render(<OrgEditor value={"* Heading\r\nbody\0😀"} onChange={onChange} onSave={vi.fn()}
			onEditTags={onEditTags} onSchedule={onSchedule} onPrefixChange={onPrefixChange} />)
		const view = getEditorView()
		const selection = EditorSelection.create([EditorSelection.range(2, 6), EditorSelection.cursor(12, -1, 2, 42)], 0)
		view.dispatch({ selection })
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { key: "t", altKey: true })
		expect(onEditTags).toHaveBeenCalledExactlyOnceWith(6)
		fireEvent.keyDown(editor, { key: "l", ctrlKey: true })
		expect(onPrefixChange.mock.lastCall?.[0]).toMatchObject({ label: "Planning", bindings: [{ keyLabel: "s", commandId: "scheduled" }] })
		fireEvent.keyDown(editor, { key: "s" })
		expect(onSchedule).toHaveBeenCalledExactlyOnceWith(6)
		expect(view.state.sliceDoc()).toBe("* Heading\r\nbody\0😀")
		expect(view.state.selection.eq(selection)).toBe(true)
		expect(onChange).not.toHaveBeenCalled()
	})

	it("cancels prefix and captured command on configuration replacement including a batched ABA", () => {
		let target: OrgEditorCommandTarget | null = null
		const onEditTags = vi.fn()
		const onPrefixChange = vi.fn()
		render(<OrgEditor value="* Heading" onSave={vi.fn()} onEditTags={onEditTags}
			onPrefixChange={onPrefixChange} onCommandTarget={(next) => { target = next }} />)
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { key: "c", ctrlKey: true })
		const captured = target!.captureCommand("tags")!
		const generation = getOrgInputConfiguration().generation
		act(() => {
			useSettings.setState({ orgKeymapConfigurationJson: '{"version":1,"bindings":[{"scope":"org-source","key":"A-t","command":"tags"}]}' })
			useSettings.setState({ orgKeymapConfigurationJson: "" })
		})
		expect(getOrgInputConfiguration().generation).not.toBe(generation)
		expect(onPrefixChange.mock.lastCall?.[0]).toBeNull()
		expect(captured()).toBe(false)
		fireEvent.keyDown(editor, { key: "q", ctrlKey: true })
		expect(onEditTags).not.toHaveBeenCalled()
	})

	it("shows invalid persisted overrides and leaves unmatched source text/native input alone", () => {
		useSettings.setState({ orgKeymapConfigurationJson: '{"version":2}' })
		const onEditTags = vi.fn()
		render(<OrgEditor value="* Heading" onSave={vi.fn()} onEditTags={onEditTags} />)
		const editor = screen.getByRole("textbox")
		expect(fireEvent.keyDown(editor, { key: "c", ctrlKey: true })).toBe(true)
		expect(fireEvent.keyDown(editor, { key: "q", ctrlKey: true })).toBe(true)
		expect(onEditTags).not.toHaveBeenCalled()
		expect(getEditorView().state.sliceDoc()).toBe("* Heading")
	})

	it.each([
		[0, 0],
		[3, 3],
		[11, 11],
		[1, 7],
		[11, 2],
		[2, 11],
	])("preserves append selection %s/%s, scroll, and usable local history", (anchor, head) => {
		const onChange = vi.fn()
		const props = { value: "alpha beta", onChange, onSave: vi.fn() }
		const mounted = render(<OrgEditor {...props} />)
		const view = getEditorView()
		view.dispatch({ changes: { from: 0, insert: "!" } })
		const before = view.state.sliceDoc()
		view.dispatch({ selection: { anchor, head } })
		view.scrollDOM.scrollTop = 123
		view.scrollDOM.scrollLeft = 17
		onChange.mockClear()
		mounted.rerender(<OrgEditor {...props} value={`${before}\n* Captured\n`} />)
		expect(view.state.selection.main).toMatchObject({ anchor, head })
		expect(view.scrollDOM.scrollTop).toBe(123)
		expect(view.scrollDOM.scrollLeft).toBe(17)
		expect(onChange).not.toHaveBeenCalled()
		expect(undoDepth(view.state)).toBe(1)
		mounted.rerender(<OrgEditor {...props} value={`${before}\n* Captured\n`} />)
		expect(undoDepth(view.state)).toBe(1)
		expect(undo(view)).toBe(true)
		expect(view.state.sliceDoc()).toBe("alpha beta\n* Captured\n")
		expect(undo(view)).toBe(false)
	})

	it.each([
		"abc\n",
		"abc\r\n",
		"abc\r",
		"abc\r\nLF\nlone\r\0😀",
	])("keeps an EOF caret before appended raw text: %j", (value) => {
		const props = { value, onChange: vi.fn(), onSave: vi.fn() }
		const mounted = render(<OrgEditor {...props} />)
		const view = getEditorView()
		const end = view.state.doc.length
		view.dispatch({ selection: { anchor: end } })
		const next = `${value}new\0😀\n\r\r\n`
		mounted.rerender(<OrgEditor {...props} value={next} />)
		expect(view.state.sliceDoc()).toBe(next)
		// Separator policy may change, but raw offsets remain at the old EOF.
		const line = view.state.doc.lineAt(view.state.selection.main.head)
		expect(
			view.state.selection.main.head + (line.number - 1) * (view.state.lineBreak.length - 1),
		).toBe(value.length)
		expect(props.onChange).not.toHaveBeenCalled()
		expect(undoDepth(view.state)).toBe(0)
	})

	it.each([
		["a\r\nb\r\n", "a\rX\nb\r\n"],
		["a\rX\nb\r\n", "a\r\nb\r\n"],
		["a\r\nb\r\n", "a\n\r\nb\r\n"],
		["a\r\nb\r\n", "a\r\r\nb\r\n"],
		["a\n\r\0😀end", "b\n\r\0😀"],
		["a\r\nb\r\n", "x\n"],
		["abc\n", "\0😀\r\nx\ny\r"],
		["abc\r", ""],
	])("replaces raw source exactly without an undo or change echo: %j → %j", (value, next) => {
		const props = { value, onChange: vi.fn(), onSave: vi.fn() }
		const mounted = render(<OrgEditor {...props} />)
		const view = getEditorView()
		view.dispatch({ selection: { anchor: view.state.doc.length, head: 1 } })
		mounted.rerender(<OrgEditor {...props} value={next} />)
		expect(view.state.sliceDoc()).toBe(next)
		expect(view.state.selection.main.from).toBeGreaterThanOrEqual(0)
		expect(view.state.selection.main.to).toBeLessThanOrEqual(view.state.doc.length)
		expect(props.onChange).not.toHaveBeenCalled()
		expect(undo(view)).toBe(false)
	})

	it("preserves raw range offsets when separator policy changes", () => {
		const props = { value: "ab\ncd\nef", onChange: vi.fn(), onSave: vi.fn() }
		const mounted = render(<OrgEditor {...props} />)
		const view = getEditorView()
		view.dispatch({ selection: EditorSelection.create([EditorSelection.range(7, 1)]) })
		mounted.rerender(<OrgEditor {...props} value={"ab\r\ncd\r\nef"} />)
		expect(view.state.selection.main).toMatchObject({ anchor: 6, head: 1 })
	})

	it.each([
		[undefined, 0],
		[3, 3],
		[6, 6],
		[-1, 0],
		[99, 6],
		[1.5, 0],
		[NaN, 0],
	])("uses a bounded initial cursor %s only at mount", (initialCursor, expected) => {
		const props = { value: "abcdef", onChange: vi.fn(), onSave: vi.fn() }
		const mounted = render(<OrgEditor {...props} initialCursor={initialCursor} />)
		expect(getEditorView().state.selection.main.head).toBe(expected)
		mounted.rerender(<OrgEditor {...props} initialCursor={2} />)
		expect(getEditorView().state.selection.main.head).toBe(expected)
	})

	it("uses raw initial cursor offsets and lets cached selections win", () => {
		const props = { value: "a\r\nb", onChange: vi.fn(), onSave: vi.fn(), initialCursor: 4 }
		const mounted = render(<OrgEditor {...props} />)
		expect(getEditorView().state.selection.main.head).toBe(3)
		mounted.unmount()
		const cache = new Map<string, OrgEditorSessionSnapshot>([
			[
				"cap",
				{
					state: EditorState.create({
						doc: props.value,
						extensions: EditorState.lineSeparator.of("\r\n"),
						selection: { anchor: 1 },
					}),
					scrollTop: 0,
					scrollLeft: 0,
				},
			],
		])
		render(<OrgEditor {...props} sessionKey="cap" sessionCache={cache} />)
		expect(getEditorView().state.selection.main.head).toBe(1)
	})

	it.each([false, true])("retains A/B history, selection and pending scroll with StrictMode=%s", (strict) => {
		vi.useFakeTimers()
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		// Chromium reports zero offsets after the scroll container leaves the DOM.
		const setLiveScroll = (view: EditorView, scrollTop: number, scrollLeft: number) => {
			const viewport = { scrollTop, scrollLeft }
			for (const property of ["scrollTop", "scrollLeft"] as const) {
				Object.defineProperty(view.scrollDOM, property, {
					configurable: true,
					get: () => (view.scrollDOM.isConnected ? viewport[property] : 0),
					set: (value: number) => {
						viewport[property] = value
					},
				})
			}
		}
		const mount = (sessionKey: string, value: string) => {
			const editor = (
				<OrgEditor
					sessionKey={sessionKey}
					sessionCache={cache}
					value={value}
					onChange={vi.fn()}
					onSave={vi.fn()}
					documentPath="/same/note.org"
				/>
			)
			return render(strict ? <StrictMode>{editor}</StrictMode> : editor)
		}
		let mounted = mount("capability-A", "alpha")
		let view = getEditorView()
		view.dispatch({ changes: { from: 5, insert: " A" } })
		view.dispatch({ selection: { anchor: 1, head: 4 } })
		setLiveScroll(view, 123, 17)
		mounted.unmount()
		mounted = mount("capability-B", "beta")
		view = getEditorView()
		view.dispatch({ changes: { from: 4, insert: " B" } })
		view.dispatch({ selection: { anchor: 2 } })
		setLiveScroll(view, 45, 9)
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

	it.each([
		"abc\n",
		"abc\r\n",
		"abc\r",
		"abc\r\nLF\nlone\r\0😀",
	])("projects an own append into parked A without losing raw source, EOF, scroll, or history: %j", (value) => {
		vi.useFakeTimers()
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const onChange = vi.fn()
		const mount = (sessionKey: string, source: string) =>
			render(
				<OrgEditor
					sessionKey={sessionKey}
					sessionCache={cache}
					value={source}
					onChange={onChange}
					onSave={vi.fn()}
					initialCursor={1}
				/>,
			)
		let mounted = mount("grant-A/logical-A", value)
		let view = getEditorView()
		view.dispatch({ changes: { from: 0, insert: "!" } })
		view.dispatch({ selection: { anchor: view.state.doc.length } })
		const oldSource = view.state.sliceDoc()
		const oldEOF = view.state.doc.length
		const separator = view.state.lineBreak
		view.scrollDOM.scrollTop = 123
		view.scrollDOM.scrollLeft = 17
		mounted.unmount()
		const parked = cache.get("grant-A/logical-A")!
		mounted = mount("grant-A/logical-B", "other buffer")
		getEditorView().dispatch({ changes: { from: 0, insert: "B" } })
		mounted.unmount()
		onChange.mockClear()
		const append = `${separator}* Captured\0😀${separator}`
		mounted = mount("grant-A/logical-A", oldSource + append)
		view = getEditorView()
		expect(view.state.sliceDoc()).toBe(oldSource + append)
		expect(view.state.selection.main.head).toBe(oldEOF)
		expect(undoDepth(view.state)).toBe(1)
		expect(onChange).not.toHaveBeenCalled()
		// Restoration derives a state; it never mutates the parked source/cache.
		expect(cache.get("grant-A/logical-A")).toBe(parked)
		expect(parked.state.sliceDoc()).toBe(oldSource)
		act(() => vi.advanceTimersByTime(32))
		expect(view.scrollDOM.scrollTop).toBe(123)
		expect(view.scrollDOM.scrollLeft).toBe(17)
		expect(undo(view)).toBe(true)
		expect(view.state.sliceDoc()).toBe(value + append)
		expect(undo(view)).toBe(false)
		mounted.unmount()
	})

	it.each([
		["abc\n", "abc!\n\r\nnew"],
		["abc\r", "abc!\r\nnew"],
		["abc\r\n", "unknown\r\nreplacement"],
	])("resets parked history for unknown replacements or changed separator policy: %j", (value, next) => {
		const cache = new Map<string, OrgEditorSessionSnapshot>()
		const props = {
			sessionKey: "grant/logical",
			sessionCache: cache,
			onChange: vi.fn(),
			onSave: vi.fn(),
		}
		const mounted = render(<OrgEditor {...props} value={value} />)
		getEditorView().dispatch({ changes: { from: 3, insert: "!" }, selection: { anchor: 2 } })
		mounted.unmount()
		render(<OrgEditor {...props} value={next} initialCursor={1} />)
		const view = getEditorView()
		expect(view.state.sliceDoc()).toBe(next)
		expect(view.state.selection.main.head).toBe(1)
		expect(undoDepth(view.state)).toBe(0)
		expect(undo(view)).toBe(false)
		expect(props.onChange).toHaveBeenCalledTimes(1)
	})

	it("rebinds callbacks and current policies after a parked append without reviving pending prefixes", () => {
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
		expect(foldCode(getEditorView())).toBe(true)
		const oldFoldCount = foldedRanges(getEditorView().state).size
		fireEvent.keyDown(screen.getByRole("textbox"), { ctrlKey: true, key: "c" })
		mounted.unmount()
		const oldCalls = oldPrefix.mock.calls.length
		const onChange = vi.fn(),
			onSave = vi.fn(),
			onEditTags = vi.fn()
		const props = {
			sessionKey: "cap",
			sessionCache: cache,
			value: "* Note!\r\nbody\r\n* Captured\r\nnew body",
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
		expect(foldedRanges(view.state).size).toBe(oldFoldCount)
		expect(onChange).not.toHaveBeenCalled()
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
		expect(onChange).toHaveBeenCalledExactlyOnceWith(`${props.value}new`)
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
		mounted = mount("new-workspace-buffer", "original! appended")
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

	it("opens the view-only sparse prefix while read-only without editing", () => {
		const onSparseTree = vi.fn()
		const onChange = vi.fn()
		render(
			<OrgEditor
				value="* Note"
				onChange={onChange}
				onSave={vi.fn()}
				readOnly
				onSparseTree={onSparseTree}
			/>,
		)
		const editor = screen.getByRole("textbox")
		fireEvent.keyDown(editor, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(editor, { key: "/" })
		expect(onSparseTree).toHaveBeenCalledExactlyOnceWith(0)
		expect(getEditorView().state.sliceDoc()).toBe("* Note")
		expect(onChange).not.toHaveBeenCalled()
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
	it("uses the same real transaction authority for prefix, shortcut and palette execution", async () => {
		let target: OrgEditorCommandTarget | null = null
		const getContext = (): OrgCommandContext => ({
			hasWorkspace: true, hasDocument: true, isDirty: true, isBusy: false,
			sidebarVisible: false, inspectorVisible: false, editor: target?.getCommandContext(),
		})
		const dispatcher = {
			getContext,
			execute: (id: Parameters<OrgEditorCommandTarget["executeCommand"]>[0]) => target?.executeCommand(id) ?? false,
		}
		const editor = <OrgEditor value="* Note" onChange={() => {}} onSave={() => {}}
			onCommandTarget={(current) => { target = current }}
			onCommand={(id) => dispatchOrgCommand(id, dispatcher)} />
		const mounted = render(<ApplicationCommandProvider>{editor}</ApplicationCommandProvider>)
		const view = getEditorView()
		const content = screen.getByRole("textbox")
		fireEvent.keyDown(content, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(content, { ctrlKey: true, key: "t" })
		expect(view.state.sliceDoc()).toBe("* TODO Note")
		fireEvent.keyDown(content, { altKey: true, shiftKey: true, key: "t" })
		expect(view.state.sliceDoc()).toBe("* DONE Note")
		const origin = target as OrgEditorCommandTarget | null
		if (!origin) throw new Error("Missing origin command target")
		function Commands() {
			const [owner] = useState(() => ({}))
			const host = useApplicationCommandHost()
			useApplicationCommandRegistration(owner, deriveOrgCommands(getContext()).filter((entry) => entry.id === "todo").map((entry): ApplicationCommandDescriptor => ({
				id: entry.id, label: entry.label, getDisabledReason: () => entry.disabledReason ?? null,
				capture: () => {
					const captured = origin!.captureCommand("todo")
					return captured ? async () => {
						const command = deriveOrgCommands(getContext()).find((command) => command.id === entry.id)
						return { kind: command && !command.disabledReason && await captured() ? "success" : "rejected" }
					} : { kind: "rejected" }
				},
			})))
			return <button onClick={() => host.open()}>Execute</button>
		}
		mounted.rerender(<ApplicationCommandProvider>{editor}<Commands /></ApplicationCommandProvider>)
		fireEvent.click(screen.getByRole("button", { name: "Execute" }))
		const active = getEditorView()
		fireEvent.change(screen.getByRole("combobox"), { target: { value: "todo" } })
		await act(async () => { fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" }) })
		expect(active.state.sliceDoc()).toBe("* Note")
		expect(undoDepth(active.state)).toBe(3)
		expect(undo(active)).toBe(true)
		expect(active.state.sliceDoc()).toBe("* DONE Note")
	})

	it("rejects captured command leases after source ABA, selection movement and retirement", () => {
		let target: OrgEditorCommandTarget | null = null
		const mounted = render(<OrgEditor value="* Note" onChange={() => {}} onSave={() => {}}
			onCommandTarget={(current) => { target = current }} />)
		const original = target as OrgEditorCommandTarget | null
		if (!original) throw new Error("Missing origin command target")
		const view = getEditorView()
		const beforeABA = original.captureCommand("todo")!
		view.dispatch({ changes: { from: view.state.doc.length, insert: "!" } })
		undo(view)
		expect(view.state.sliceDoc()).toBe("* Note")
		expect(beforeABA()).toBe(false)
		const beforeMove = original.captureCommand("todo")!
		view.dispatch({ selection: { anchor: 4 } })
		expect(beforeMove()).toBe(false)
		const beforeRetire = original.captureCommand("todo")!
		mounted.unmount()
		render(<OrgEditor value="* Replacement" onChange={() => {}} onSave={() => {}} />)
		expect(beforeRetire()).toBe(false)
		expect(original.getCommandContext().available).toBe(false)
		expect(original.executeCommand("todo")).toBe(false)
		expect(getEditorView().state.sliceDoc()).toBe("* Replacement")
	})

	it("restores the captured origin selection and scroll without adding history", () => {
		let target: OrgEditorCommandTarget | null = null
		render(<OrgEditor value="* Note\nbody" onChange={() => {}} onSave={() => {}}
			onCommandTarget={(current) => { target = current }} />)
		const view = getEditorView()
		view.dispatch({ selection: { anchor: 2, head: 5 } })
		view.scrollDOM.scrollTop = 27
		view.scrollDOM.scrollLeft = 9
		const origin = target as OrgEditorCommandTarget | null
		if (!origin) throw new Error("Missing origin command target")
		const restore = origin.captureFocus()!
		const depth = undoDepth(view.state)
		view.dispatch({ selection: { anchor: 0 } })
		view.scrollDOM.scrollTop = 0
		expect(restore()).toBe(true)
		expect(view.state.selection.main).toMatchObject({ anchor: 2, head: 5 })
		expect(view.scrollDOM.scrollTop).toBe(27)
		expect(view.scrollDOM.scrollLeft).toBe(9)
		expect(screen.getByRole("textbox")).toHaveFocus()
		expect(undoDepth(view.state)).toBe(depth)
		view.dispatch({ changes: { from: view.state.doc.length, insert: "!" } })
		expect(restore()).toBe(false)
	})

	it("does not dispatch protected shortcut events through CodeMirror or the outer boundary", () => {
		render(<OrgEditor value="* Note" onChange={() => {}} onSave={() => {}} />)
		const content = screen.getByRole("textbox")
		for (const guard of [{ repeat: true }, { isComposing: true }, { keyCode: 229 }]) {
			if ("repeat" in guard) {
				const down = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, altKey: true, shiftKey: true, key: "t" })
				down.preventDefault()
				content.dispatchEvent(down)
			}
			fireEvent.keyDown(content, { altKey: true, shiftKey: true, key: "t", ...guard })
			expect(getEditorView().state.sliceDoc()).toBe("* Note")
			fireEvent.keyUp(window, { key: "t", ...("keyCode" in guard ? { keyCode: guard.keyCode } : {}) })
		}
		const prevented = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, altKey: true, shiftKey: true, key: "t" })
		prevented.preventDefault()
		content.dispatchEvent(prevented)
		fireEvent.keyUp(window, { key: "t" })
		const altGraph = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, altKey: true, shiftKey: true, key: "t" })
		Object.defineProperty(altGraph, "getModifierState", { value: (key: string) => key === "AltGraph" })
		content.dispatchEvent(altGraph)
		fireEvent.keyUp(window, { key: "t" })
		expect(getEditorView().state.sliceDoc()).toBe("* Note")
	})
})
