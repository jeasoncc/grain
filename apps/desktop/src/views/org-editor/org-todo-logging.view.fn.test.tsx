import { redo, undo, undoDepth } from "@codemirror/commands"
import { foldEffect, foldedRanges } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { act, cleanup, createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { OrgTodoNoteRequest } from "@/flows/org-command/org-todo-note"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgEditorCommandTarget } from "./org-editor.types"
import { OrgEditor } from "./org-editor.view.fn"

const stamp = "[2026-06-16 Tue 09:42]"
const viewFor = (name = "Org document editor") =>
	EditorView.findFromDOM(screen.getByRole("textbox", { name }))!
const todoKey = (view: EditorView, prefix: boolean) => {
	if (prefix) {
		fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "c" })
		fireEvent.keyUp(window, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "t" })
		fireEvent.keyUp(window, { ctrlKey: true, key: "t" })
	} else {
		fireEvent.keyDown(view.contentDOM, {
			altKey: true,
			code: "KeyT",
			key: "T",
			keyCode: 84,
			shiftKey: true,
		})
		fireEvent.keyUp(window, { code: "KeyT", key: "T", keyCode: 84 })
	}
}

async function discardDirtyNote(note: HTMLElement, requestClose: () => void) {
	await act(async () => { requestClose() })
	expect(note).toBeInTheDocument()
	const dialog = screen.getByRole("dialog")
	await act(async () => {
		fireEvent.click(within(dialog).getByRole("button", { name: "Close tool" }))
	})
}

describe("OrgEditor TODO logging boundary", () => {
	afterEach(cleanup)
	for (const prefix of [true, false]) {
		it(`logs atomically with injected fresh clock and raw undo (${prefix ? "prefix" : "shortcut"})`, () => {
			const source =
				"#+TODO: TODO | DONE(d!)\r\n#+STARTUP: logdone logdrawer\r\n* TODO task\r\nbody\r\n"
			const oldClock = vi.fn(() => "[2026-06-16 Tue 08:00]")
			const clock = vi.fn(() => stamp)
			const change = vi.fn()
			const props = { onChange: change, onSave: vi.fn(), value: source }
			const mounted = render(<OrgEditor {...props} todoClock={oldClock} />)
			mounted.rerender(<OrgEditor {...props} todoClock={clock} />)
			const view = viewFor()
			act(() => view.dispatch({ selection: { anchor: view.state.doc.line(3).from } }))
			act(() => todoKey(view, prefix))
			const result = view.state.sliceDoc()
			expect(result).toContain("* DONE task\r\nCLOSED: " + stamp)
			expect(result).toContain(':LOGBOOK:\r\n- State "DONE"')
			expect(result).toContain(stamp)
			expect(clock).toHaveBeenCalledTimes(1)
			expect(oldClock).not.toHaveBeenCalled()
			expect(change).toHaveBeenCalledTimes(1)
			expect(undoDepth(view.state)).toBe(1)
			act(() => {
				undo(view)
			})
			expect(view.state.sliceDoc()).toBe(source)
			act(() => {
				redo(view)
			})
			expect(view.state.sliceDoc()).toBe(result)
		})
		it(`collects note-required transitions without premature mutation (${prefix})`, () => {
			const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
			const rejected = vi.fn(),
				change = vi.fn()
			render(
				<OrgEditor
					value={source}
					onChange={change}
					onSave={vi.fn()}
					todoClock={() => stamp}
					onTodoRejected={rejected}
				/>,
			)
			const view = viewFor()
			act(() => view.dispatch({ selection: { anchor: view.state.doc.line(2).from } }))
			act(() => todoKey(view, prefix))
			expect(view.state.sliceDoc()).toBe(source)
			expect(undoDepth(view.state)).toBe(0)
			expect(change).not.toHaveBeenCalled()
			expect(rejected).not.toHaveBeenCalled()
			const note = screen.getByRole("textbox", { name: "TODO note" })
			fireEvent.change(note, { target: { value: "first line\n* literal heading\n:END:\n" } })
			fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
			expect(view.state.sliceDoc()).toContain("* DONE task")
			expect(view.state.sliceDoc()).toContain("literal heading")
			expect(change).toHaveBeenCalledTimes(1)
			expect(undoDepth(view.state)).toBe(1)
			act(() => {
				undo(view)
			})
			expect(view.state.sliceDoc()).toBe(source)
		})
	}

	it.each([
		true,
		false,
	])("preserves duplicate-key drafts and the setup clock across midnight (%s)", (prefix) => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		const clock = vi.fn(() => stamp)
		render(<OrgEditor value={source} onChange={vi.fn()} onSave={vi.fn()} todoClock={clock} />)
		const view = viewFor()
		act(() => view.dispatch({ selection: { anchor: view.state.doc.line(2).from } }))
		act(() => todoKey(view, prefix))
		const note = screen.getByRole("textbox", { name: "TODO note" })
		fireEvent.change(note, { target: { value: "owned draft" } })
		act(() => todoKey(view, prefix))
		expect(screen.getByRole("textbox", { name: "TODO note" })).toBe(note)
		expect(note).toHaveValue("owned draft")
		expect(clock).toHaveBeenCalledTimes(1)
		const finishStamp = "[2026-06-17 Wed 00:45]"
		clock.mockReturnValue(finishStamp)
		fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		expect(view.state.sliceDoc()).toContain("owned draft")
		expect(view.state.sliceDoc()).toContain(stamp)
		expect(view.state.sliceDoc()).not.toContain(finishStamp)
		expect(clock).toHaveBeenCalledTimes(1)
	})

	it.each([
		false,
		true,
	])("preserves publication callback focus after standalone finish (throws=%s)", (throws) => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		const change = vi.fn(() => {
			screen.getByRole("button", { name: "External" }).focus()
			if (throws) throw new Error("publication failed after commit")
		})
		render(
			<>
				<button type="button">External</button>
				<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={() => stamp} />
			</>,
		)
		const view = viewFor()
		act(() => {
			view.focus()
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		const note = screen.getByRole("textbox", { name: "TODO note" })
		expect(note).toHaveFocus()
		fireEvent.change(note, { target: { value: "published" } })
		fireEvent.keyDown(note, { key: "s", ctrlKey: true })
		expect(view.state.sliceDoc()).toContain("* DONE task")
		expect(view.state.sliceDoc()).toContain("published")
		expect(change).toHaveBeenCalledOnce()
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(screen.getByRole("button", { name: "External" })).toHaveFocus()
	})

	it.each(["finish", "abort"])("restores the exact standalone request origin on %s", async (action) => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		render(<OrgEditor value={source} onChange={vi.fn()} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => {
			view.focus()
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		const note = screen.getByRole("textbox", { name: "TODO note" })
		expect(note).toHaveFocus()
		fireEvent.change(note, { target: { value: "owned note" } })
		if (action === "finish") fireEvent.keyDown(note, { key: "s", ctrlKey: true })
		else {
			await act(async () => { fireEvent.keyDown(note, { key: "g", ctrlKey: true }) })
			expect(note).toHaveValue("owned note")
			expect(view.state.sliceDoc()).toBe(source)
			expect(undoDepth(view.state)).toBe(0)
			await act(async () => {
				fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep draft" }))
			})
			await waitFor(() => expect(note).toHaveFocus())
			expect(note).toHaveValue("owned note")
			await discardDirtyNote(note, () => { fireEvent.keyDown(note, { key: "g", ctrlKey: true }) })
		}
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		await waitFor(() => expect(view.contentDOM).toHaveFocus())
		if (action === "abort") {
			expect(view.state.sliceDoc()).toBe(source)
			expect(undoDepth(view.state)).toBe(0)
		}
	})

	it("does not steal foreign focus on standalone cancellation", async () => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		render(
			<>
				<button type="button">External</button>
				<OrgEditor value={source} onChange={vi.fn()} onSave={vi.fn()} todoClock={() => stamp} />
			</>,
		)
		const view = viewFor()
		act(() => {
			view.focus()
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		const note = screen.getByRole("textbox", { name: "TODO note" })
		fireEvent.change(note, { target: { value: "retained while confirming" } })
		screen.getByRole("button", { name: "External" }).focus()
		await discardDirtyNote(note, () => { fireEvent.click(screen.getByRole("button", { name: "Abort note" })) })
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		await waitFor(() => expect(screen.getByRole("button", { name: "External" })).toHaveFocus())
		expect(view.state.sliceDoc()).toBe(source)
		expect(undoDepth(view.state)).toBe(0)
	})

	it("refuses batch edits against a closed canonical runtime without dispatching", () => {
		const source = "* TODO task\n"
		let target: OrgEditorCommandTarget | null = null
		const runtime = createOrgBufferRuntime({
			canCommit: () => true,
			key: { bufferId: "closed-note", workspaceSessionId: "test" },
			onCommit: vi.fn(),
			source,
		})
		render(
			<OrgEditor
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		runtime.close()
		expect(
			target!.applyEdits!(source, {
				changes: [{ from: 2, to: 6, insert: "DONE" }],
				cursor: 2,
			}),
		).toBe(false)
		expect(viewFor().state.sliceDoc()).toBe(source)
	})

	it("reports applied when a runtime publication callback throws after commit", () => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		let request: OrgTodoNoteRequest | undefined
		const runtime = createOrgBufferRuntime({
			canCommit: () => true,
			key: { bufferId: "throw-note", workspaceSessionId: "test" },
			onCommit: () => {
				throw new Error("publication failed")
			},
			source,
		})
		render(
			<OrgEditor
				getTodoNotePermit={() => () => true}
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				todoClock={() => stamp}
				onTodoNoteRequest={(next) => {
					request = next
				}}
			/>,
		)
		const view = viewFor()
		act(() => {
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		act(() => expect(request!.execute("committed")).toEqual({ kind: "applied" }))
		expect(runtime.source).toContain("committed")
		expect(runtime.revision).toBe(1)
		expect(request!.execute("again")).toMatchObject({ kind: "rejected" })
	})

	it.each([
		["CLOSED:[2025-04-01]", "CLOSED:[2026-06-16]"],
		["CLOSED: \t[2025-04-01\tTue]", "CLOSED: \t[2026-06-16\tTue]"],
		["CLOSED:\t[2025-04-01\t08:00]", "CLOSED:\t[2026-06-16\t09:42]"],
		["CLOSED:  \t[2025-04-01  Tue\t08:00]", "CLOSED:  \t[2026-06-16  Tue\t09:42]"],
	])("preserves CLOSED shape and spacing with exact output and undo (%s)", (closed, fresh) => {
		const source = `#+STARTUP: logdone\r\n* TODO task\r\n \t${closed}  DEADLINE: <2026-07-01 Wed>\t\r\nbody 😀\r\n`
		const expected = `#+STARTUP: logdone\r\n* DONE task\r\n \t${fresh}  DEADLINE: <2026-07-01 Wed>\t\r\nbody 😀\r\n`
		const change = vi.fn()
		render(<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => view.dispatch({ selection: { anchor: view.state.doc.line(2).from } }))
		act(() => todoKey(view, true))
		expect(view.state.sliceDoc()).toBe(expected)
		expect(change).toHaveBeenCalledTimes(1)
		expect(undoDepth(view.state)).toBe(1)
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
		expect(undoDepth(view.state)).toBe(0)
	})

	it("inherits parent lognotedone and collects a note before one undoable child edit", () => {
		const source =
			"* Parent\n:PROPERTIES:\n:LOGGING: lognotedone\n:END:\n** TODO child\nbody\n* Sibling\nuntouched\n"
		const change = vi.fn()
		render(<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => view.dispatch({ selection: { anchor: source.indexOf("** TODO") } }))
		act(() => todoKey(view, true))
		expect(view.state.sliceDoc()).toBe(source)
		expect(change).not.toHaveBeenCalled()
		expect(undoDepth(view.state)).toBe(0)
		fireEvent.change(screen.getByRole("textbox", { name: "TODO note" }), {
			target: { value: "inherited note" },
		})
		fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		expect(view.state.sliceDoc()).toContain(`** DONE child\nCLOSED: ${stamp}\n`)
		expect(view.state.sliceDoc()).toContain("inherited note")
		expect(view.state.sliceDoc()).toContain(source.slice(0, source.indexOf("** TODO")))
		expect(view.state.sliceDoc()).toContain("* Sibling\nuntouched\n")
		expect(change).toHaveBeenCalledTimes(1)
		expect(undoDepth(view.state)).toBe(1)
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
	})

	it("uses local LOGGING nil to suppress file @ and completion logging", () => {
		const source =
			"#+TODO: TODO | DONE(@)\n#+PROPERTY: LOGGING lognotedone\n* TODO task\n:PROPERTIES:\n:LOGGING: nil\n:END:\nbody\n"
		const change = vi.fn()
		render(<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => view.dispatch({ selection: { anchor: source.indexOf("* TODO") } }))
		act(() => todoKey(view, false))
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(view.state.sliceDoc()).toBe(source.replace("* TODO task", "* DONE task"))
		expect(change).toHaveBeenCalledTimes(1)
		expect(undoDepth(view.state)).toBe(1)
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
	})

	it("inherits a custom drawer but writes only into the target child", () => {
		const source =
			"#+TODO: TODO | DONE(!)\n* Parent\n:PROPERTIES:\n:LOG_INTO_DRAWER: HISTORY\n:END:\n:HISTORY:\nparent entry\n:END:\n** TODO child\nbody\n* Sibling\nuntouched\n"
		const expected = source.replace(
			"** TODO child\n",
			`** DONE child\n:HISTORY:\n- State "DONE"        from "TODO" ${stamp}\n:END:\n`,
		)
		const change = vi.fn()
		render(<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => view.dispatch({ selection: { anchor: source.indexOf("** TODO") } }))
		act(() => todoKey(view, true))
		expect(view.state.sliceDoc()).toBe(expected)
		expect(change).toHaveBeenCalledTimes(1)
		expect(undoDepth(view.state)).toBe(1)
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
	})

	it("accepts an empty CUSTOM_ID property and logs atomically with exact undo", () => {
		const source =
			"#+TODO: TODO | DONE(!)\r\n#+STARTUP: logdone logdrawer\r\n* TODO task\r\n:PROPERTIES:\r\n:CUSTOM_ID:\r\n:END:\r\nbody\r\n"
		const expected = `#+TODO: TODO | DONE(!)\r\n#+STARTUP: logdone logdrawer\r\n* DONE task\r\nCLOSED: ${stamp}\r\n:PROPERTIES:\r\n:CUSTOM_ID:\r\n:END:\r\n:LOGBOOK:\r\n- State "DONE"        from "TODO" ${stamp}\r\n:END:\r\nbody\r\n`
		const change = vi.fn()
		render(<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => view.dispatch({ selection: { anchor: view.state.doc.line(3).from } }))
		act(() => todoKey(view, false))
		expect(view.state.sliceDoc()).toBe(expected)
		expect(change).toHaveBeenCalledTimes(1)
		expect(undoDepth(view.state)).toBe(1)
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
	})

	it.each([
		":LOGBOOK:\n:OTHER:\n:END:\n",
		":PROPERTIES:\n:LOGBOOK:\n:END:\n",
		":LOGBOOK:\n:END:\n:LOGBOOK:\n:END:\n",
		":PROPERTIES:\n:END:\n:PROPERTIES:\n:END:\n",
		":LOGBOOK:\nunclosed\n",
		":PROPERTIES:\n:CUSTOM_ID:\n",
	])("refuses malformed drawers without any edits or history (%s)", (body) => {
		const source = `#+TODO: TODO | DONE(!)\n#+STARTUP: logdone logdrawer\n* TODO task\n${body}`
		const change = vi.fn(),
			rejected = vi.fn()
		render(
			<OrgEditor
				value={source}
				onChange={change}
				onSave={vi.fn()}
				todoClock={() => stamp}
				onTodoRejected={rejected}
			/>,
		)
		const view = viewFor()
		act(() => view.dispatch({ selection: { anchor: view.state.doc.line(3).from } }))
		act(() => todoKey(view, true))
		expect(view.state.sliceDoc()).toBe(source)
		expect(change).not.toHaveBeenCalled()
		expect(rejected).toHaveBeenCalledTimes(1)
		expect(undoDepth(view.state)).toBe(0)
	})

	it("projects one atomic logging batch to peers and undoes from either window", () => {
		const source = "#+STARTUP: logdone\n* TODO task\nbody\n* Peer\npeer body\n"
		const commit = vi.fn()
		const runtime = createOrgBufferRuntime({
			canCommit: () => true,
			key: { bufferId: "todo", workspaceSessionId: "test" },
			onCommit: commit,
			source,
		})
		const props = {
			onChange: vi.fn(),
			onSave: vi.fn(),
			runtime,
			getTodoNotePermit: () => () => !runtime.closed,
			todoClock: () => stamp,
			value: source,
		}
		render(
			<>
				<OrgEditor {...props} windowId="a" ariaLabel="a" />
				<OrgEditor {...props} windowId="b" ariaLabel="b" />
			</>,
		)
		const a = viewFor("a"),
			b = viewFor("b")
		act(() => {
			a.dispatch({ selection: { anchor: a.state.doc.line(2).from } })
			b.dispatch({
				effects: foldEffect.of({ from: b.state.doc.line(4).to, to: b.state.doc.line(5).to }),
				selection: { anchor: source.indexOf("* Peer") + 2 },
			})
		})
		const peerChanges: { from: number; to: number; length: number }[] = []
		const update = b.update.bind(b)
		const updateSpy = vi.spyOn(b, "update").mockImplementation((transactions) => {
			for (const transaction of transactions)
				transaction.changes.iterChangedRanges((from, to) => {
					peerChanges.push({ from, length: transaction.startState.doc.length, to })
				})
			update(transactions)
		})
		const peerOffset = b.state.selection.main.head
		expect(foldedRanges(b.state).size).toBe(1)
		expect(foldedRanges(a.state).size).toBe(0)
		act(() => todoKey(a, true))
		expect(runtime.source).toContain("CLOSED: " + stamp)
		expect(b.state.sliceDoc()).toBe(runtime.source)
		expect(commit).toHaveBeenCalledTimes(1)
		expect(b.state.selection.main.head).toBe(peerOffset + runtime.source.length - source.length)
		expect(foldedRanges(b.state).size).toBe(1)
		expect(foldedRanges(a.state).size).toBe(0)
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => fireEvent.keyDown(b.contentDOM, { ctrlKey: true, key: "z" }))
		expect(runtime.source).toBe(source)
		expect(a.state.sliceDoc()).toBe(source)
		expect(b.state.sliceDoc()).toBe(source)
		expect(b.state.selection.main.head).toBe(peerOffset)
		expect(foldedRanges(b.state).size).toBe(1)
		expect(peerChanges.length).toBeGreaterThan(0)
		expect(peerChanges.some(({ from, to, length }) => from === 0 && to === length)).toBe(false)
		updateSpy.mockRestore()
	})

	it("logs a visible ancestor without changing sparse hidden siblings", () => {
		const source =
			"#+TODO: TODO(t!) | DONE\n* Parent\nbody\n** TODO Child\nvisible\n* Hidden\nuntouched\n"
		let target: OrgEditorCommandTarget | null = null
		const change = vi.fn()
		render(
			<OrgEditor
				value={source}
				onChange={change}
				onSave={vi.fn()}
				todoClock={() => stamp}
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = viewFor()
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
		})
		act(() => todoKey(view, true))
		expect(view.state.sliceDoc()).toContain('* TODO Parent\n- State "TODO"')
		expect(view.state.sliceDoc()).toContain("* Hidden\nuntouched\n")
		expect(undoDepth(view.state)).toBe(1)
		expect(change).toHaveBeenCalledTimes(1)
		act(() => {
			undo(view)
		})
		expect(view.state.sliceDoc()).toBe(source)
	})

	it("rejects all edits when logging would insert at a hidden source boundary", () => {
		const source = "#+STARTUP: logdone\n* TODO task\n* Hidden\nuntouched\n"
		let target: OrgEditorCommandTarget | null = null
		const change = vi.fn()
		render(
			<OrgEditor
				value={source}
				onChange={change}
				onSave={vi.fn()}
				todoClock={() => stamp}
				onCommandTarget={(next) => {
					target = next
				}}
			/>,
		)
		const view = viewFor()
		act(() => {
			target!.applyView!(source, { kind: "sparse-tree", query: "todo" })
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
		})
		act(() => todoKey(view, true))
		expect(view.state.sliceDoc()).toBe(source)
		expect(change).not.toHaveBeenCalled()
		expect(undoDepth(view.state)).toBe(0)
	})

	for (const prefix of [false, true]) {
		it(`fences consumed, repeated and IME keyboard events (${prefix ? "prefix" : "AltShiftT"})`, () => {
			const clock = vi.fn(() => stamp)
			const source = "#+STARTUP: logdone\n* TODO task\nbody\n"
			const change = vi.fn()
			render(<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={clock} />)
			const view = viewFor()
			act(() => view.dispatch({ selection: { anchor: view.state.doc.line(2).from } }))
			for (const guard of [
				{ repeat: true },
				{ isComposing: true },
				{ keyCode: 229 },
				{ consumed: true },
			]) {
				act(() => {
					if ("repeat" in guard) {
						const down = createEvent.keyDown(view.contentDOM, { code: "KeyT", keyCode: 84, key: prefix ? "t" : "T", ctrlKey: prefix, altKey: !prefix, shiftKey: !prefix })
						down.preventDefault()
						fireEvent(view.contentDOM, down)
					}
					if (prefix) {
						fireEvent.keyDown(view.contentDOM, { ctrlKey: true, key: "c" })
						fireEvent.keyUp(window, { key: "c" })
					}
					const event = createEvent.keyDown(view.contentDOM, {
						altKey: !prefix,
						code: "KeyT",
						ctrlKey: prefix,
						key: prefix ? "t" : "T",
						keyCode: 84,
						shiftKey: !prefix,
						...guard,
					})
					if ("consumed" in guard) event.preventDefault()
					fireEvent(view.contentDOM, event)
					fireEvent.keyUp(window, { code: "KeyT", keyCode: 84, key: prefix ? "t" : "T" })
					fireEvent.keyDown(view.contentDOM, { key: "Escape" })
					fireEvent.keyUp(window, { key: "Escape" })
				})
			}
			expect(view.state.sliceDoc()).toBe(source)
			expect(clock).not.toHaveBeenCalled()
			expect(change).not.toHaveBeenCalled()
			act(() => todoKey(view, prefix))
			expect(clock).toHaveBeenCalledTimes(1)
			expect(change).toHaveBeenCalledTimes(1)
			expect(undoDepth(view.state)).toBe(1)
		})
	}

	it("fences readonly and repeated/IME shortcuts before reading the clock", () => {
		const clock = vi.fn(() => stamp)
		const props = { onChange: vi.fn(), onSave: vi.fn(), todoClock: clock, value: "* TODO task" }
		const mounted = render(<OrgEditor {...props} readOnly />)
		const view = viewFor()
		act(() => todoKey(view, true))
		mounted.rerender(<OrgEditor {...props} />)
		for (const guard of [{ repeat: true }, { isComposing: true }, { keyCode: 229 }]) {
			act(() => {
				if ("repeat" in guard) {
					const down = createEvent.keyDown(view.contentDOM, { altKey: true, key: "T", shiftKey: true })
					down.preventDefault()
					fireEvent(view.contentDOM, down)
				}
				fireEvent.keyDown(view.contentDOM, { altKey: true, key: "T", shiftKey: true, ...guard })
				fireEvent.keyUp(window, { key: "T", ...("keyCode" in guard ? { keyCode: guard.keyCode } : {}) })
			})
		}
		expect(view.state.sliceDoc()).toBe(props.value)
		expect(clock).not.toHaveBeenCalled()
	})
	it.each([
		"missing",
		"preparation-clock",
		"same-ID-replacement",
	] as const)("requires exact Root note authority (%s)", (mode) => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		let request: OrgTodoNoteRequest | undefined
		let registration: object | null = {}
		const runtime = createOrgBufferRuntime({
			canCommit: () => true,
			key: { bufferId: "exact-note", workspaceSessionId: "test" },
			onCommit: vi.fn(),
			source,
		})
		render(
			<OrgEditor
				runtime={runtime}
				windowId="same-window"
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				getTodoNotePermit={
					mode === "missing"
						? undefined
						: () => {
								const captured = registration
								return () => captured !== null && registration === captured
							}
				}
				todoClock={() => {
					if (mode === "preparation-clock") {
						registration = null
						registration = {} // Same IDs, but a different Root registration.
					}
					return stamp
				}}
				onTodoNoteRequest={(next) => {
					request = next
				}}
			/>,
		)
		const view = viewFor()
		act(() => {
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		if (mode === "missing" || mode === "preparation-clock") {
			expect(request).toBeUndefined()
		} else {
			expect(request!.validate!()).toEqual({ kind: "ready" })
			if (mode === "same-ID-replacement") {
				registration = null
				registration = {}
			}
			act(() => {
				expect(request!.execute("must not commit")).toEqual({
					kind: "rejected",
					reason: "stale-note-request",
				})
			})
		}
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(0)
		expect(undoDepth(runtime.state)).toBe(0)
	})

	it("delegates an opaque snapshot capability and refuses reuse, abort and source ABA", () => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		let request: OrgTodoNoteRequest | undefined
		const runtime = createOrgBufferRuntime({
			canCommit: () => true,
			key: { bufferId: "note", workspaceSessionId: "test" },
			onCommit: vi.fn(),
			source,
		})
		render(
			<OrgEditor
				getTodoNotePermit={() => () => true}
				runtime={runtime}
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				todoClock={() => stamp}
				onTodoNoteRequest={(next) => {
					request = next
				}}
			/>,
		)
		const view = viewFor()
		act(() => {
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(request!.validate!()).toEqual({ kind: "ready" })
		act(() => {
			runtime.applyControllerSource(source, source + "changed")
			runtime.applyControllerSource(source + "changed", source)
		})
		expect(request!.execute("retained")).toEqual({ kind: "rejected", reason: "stale-note-request" })
		request!.abort()
		act(() => todoKey(view, true))
		act(() => {
			expect(request!.execute("literal\ntext")).toEqual({ kind: "applied" })
		})
		expect(request!.execute("twice")).toMatchObject({ kind: "rejected" })
	})

	it("retains a property-derived draft after source edit and undo, then cancels without mutation", async () => {
		const source = "#+PROPERTY: LOGGING lognotedone\n* TODO task\n"
		const change = vi.fn()
		render(<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => {
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		const note = screen.getByRole("textbox", { name: "TODO note" }) as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "copy property draft" } })
		act(() => {
			const from = source.indexOf("lognotedone")
			view.dispatch({ changes: { from, to: from + "lognotedone".length, insert: "nil" } })
			expect(undo(view)).toBe(true)
		})
		expect(view.state.sliceDoc()).toBe(source)
		fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		expect(note).toHaveValue("copy property draft")
		expect(note).toHaveAttribute("readonly")
		expect(within(screen.getByRole("group", { name: "TODO note" })).getByRole("status")).toBeInTheDocument()
		note.setSelectionRange(0, note.value.length)
		const copy = createEvent.keyDown(note, { key: "c", ctrlKey: true })
		fireEvent(note, copy)
		expect(copy.defaultPrevented).toBe(false)
		expect(view.state.sliceDoc()).toBe(source)
		expect(undoDepth(view.state)).toBe(0)
		expect(change).toHaveBeenCalledTimes(2)
		await discardDirtyNote(note, () => { fireEvent.click(screen.getByRole("button", { name: "Abort note" })) })
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
		expect(view.state.sliceDoc()).toBe(source)
		expect(change).toHaveBeenCalledTimes(2)
	})

	it("retains the local draft for copying after readonly invalidates its lease", () => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		const props = { onChange: vi.fn(), onSave: vi.fn(), todoClock: () => stamp, value: source }
		const mounted = render(<OrgEditor {...props} />)
		const view = viewFor()
		act(() => {
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		const note = screen.getByRole("textbox", { name: "TODO note" }) as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "keep me\nplease" } })
		mounted.rerender(<OrgEditor {...props} readOnly />)
		fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		expect(note).toHaveValue("keep me\nplease")
		expect(note).toHaveAttribute("readonly")
		expect(within(screen.getByRole("group", { name: "TODO note" })).getByRole("status")).toBeInTheDocument()
		note.setSelectionRange(0, note.value.length)
		const copy = createEvent.keyDown(note, { key: "c", ctrlKey: true })
		fireEvent(note, copy)
		expect(copy.defaultPrevented).toBe(false)
		expect(view.state.sliceDoc()).toBe(source)
		expect(undoDepth(view.state)).toBe(0)
		expect(props.onChange).not.toHaveBeenCalled()
	})

	it("fences scratch IME/repeat, preserves native copy and aborts without history", async () => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		render(<OrgEditor value={source} onChange={vi.fn()} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => {
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		const note = screen.getByRole("textbox", { name: "TODO note" }) as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "copy me" } })
		note.setSelectionRange(0, 7)
		const copy = createEvent.keyDown(note, { ctrlKey: true, key: "c" })
		fireEvent(note, copy)
		expect(copy.defaultPrevented).toBe(false)
		note.setSelectionRange(7, 7)
		for (const guard of [{ repeat: true }, { isComposing: true }, { keyCode: 229 }]) {
			fireEvent.keyDown(note, { ctrlKey: true, key: "c", ...guard })
			fireEvent.keyDown(note, { ctrlKey: true, key: "g", ...guard })
		}
		expect(view.state.sliceDoc()).toBe(source)
		expect(undoDepth(view.state)).toBe(0)
		await discardDirtyNote(note, () => { fireEvent.keyDown(note, { ctrlKey: true, key: "g" }) })
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
	})
	it("finishes local scratch with Ctrl-C Ctrl-C and revokes callbacks on unmount", () => {
		const source = "#+TODO: TODO | DONE(d@)\n* TODO task\n"
		const mounted = render(
			<OrgEditor value={source} onChange={vi.fn()} onSave={vi.fn()} todoClock={() => stamp} />,
		)
		const view = viewFor()
		act(() => {
			view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
			todoKey(view, true)
		})
		const note = screen.getByRole("textbox", { name: "TODO note" })
		fireEvent.change(note, { target: { value: "done" } })
		fireEvent.keyDown(note, { key: "c", ctrlKey: true })
		expect(view.state.sliceDoc()).toBe(source)
		fireEvent.keyDown(note, { key: "c", ctrlKey: true })
		expect(view.state.sliceDoc()).toContain("* DONE task")
		expect(undoDepth(view.state)).toBe(1)
		mounted.unmount()
		let request: OrgTodoNoteRequest | undefined
		const delegated = render(
			<OrgEditor
				value={source}
				onChange={vi.fn()}
				onSave={vi.fn()}
				todoClock={() => stamp}
				onTodoNoteRequest={(next) => {
					request = next
				}}
			/>,
		)
		const second = viewFor()
		act(() => {
			second.dispatch({ selection: { anchor: second.state.doc.line(2).from } })
			todoKey(second, true)
		})
		delegated.unmount()
		expect(request!.execute("too late")).toEqual({ kind: "rejected", reason: "stale-note-request" })
	})
})
