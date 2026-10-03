import { redo, undo, undoDepth } from "@codemirror/commands"
import { foldEffect, foldedRanges } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import { OrgEditor } from "./org-editor.view.fn"
import type { OrgEditorCommandTarget } from "./org-editor.types"

const stamp = "[2026-06-16 Tue 09:42]"
const viewFor = (name = "Org document editor") =>
	EditorView.findFromDOM(screen.getByRole("textbox", { name }))!
const todoKey = (view: EditorView, prefix: boolean) => {
	if (prefix) {
		fireEvent.keyDown(view.contentDOM, { key: "c", ctrlKey: true })
		fireEvent.keyDown(view.contentDOM, { key: "t", ctrlKey: true })
	} else {
		fireEvent.keyDown(view.contentDOM, {
			key: "T",
			code: "KeyT",
			keyCode: 84,
			altKey: true,
			shiftKey: true,
		})
	}
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
			const props = { value: source, onChange: change, onSave: vi.fn() }
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
		it(`rejects note-required transitions without mutation (${prefix})`, () => {
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
			expect(rejected).toHaveBeenCalledWith("needs-note")
			expect(screen.getByRole("status")).toHaveTextContent(
				"This TODO transition requires a note; the state was not changed.",
			)
		})
	}

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
			key: { bufferId: "todo", workspaceSessionId: "test" },
			source,
			canCommit: () => true,
			onCommit: commit,
		})
		const props = {
			runtime,
			value: source,
			onChange: vi.fn(),
			onSave: vi.fn(),
			todoClock: () => stamp,
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
				selection: { anchor: source.indexOf("* Peer") + 2 },
				effects: foldEffect.of({ from: b.state.doc.line(4).to, to: b.state.doc.line(5).to }),
			})
		})
		const peerChanges: { from: number; to: number; length: number }[] = []
		const update = b.update.bind(b)
		const updateSpy = vi.spyOn(b, "update").mockImplementation((transactions) => {
			for (const transaction of transactions)
				transaction.changes.iterChangedRanges((from, to) => {
					peerChanges.push({ from, to, length: transaction.startState.doc.length })
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
		act(() => fireEvent.keyDown(b.contentDOM, { key: "z", ctrlKey: true }))
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

	it("renders unsupported policy refusal without changing history", () => {
		const source = "#+PROPERTY: LOGGING logdone\n* TODO task\n"
		const change = vi.fn()
		render(<OrgEditor value={source} onChange={change} onSave={vi.fn()} todoClock={() => stamp} />)
		const view = viewFor()
		act(() => view.dispatch({ selection: { anchor: view.state.doc.line(2).from } }))
		act(() => todoKey(view, false))
		expect(screen.getByRole("status")).toHaveTextContent("unsupported-logging-policy")
		expect(view.state.sliceDoc()).toBe(source)
		expect(undoDepth(view.state)).toBe(0)
		expect(change).not.toHaveBeenCalled()
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
					if (prefix) fireEvent.keyDown(view.contentDOM, { key: "c", ctrlKey: true })
					const event = createEvent.keyDown(view.contentDOM, {
						key: prefix ? "t" : "T",
						code: "KeyT",
						keyCode: 84,
						ctrlKey: prefix,
						altKey: !prefix,
						shiftKey: !prefix,
						...guard,
					})
					if ("consumed" in guard) event.preventDefault()
					fireEvent(view.contentDOM, event)
					fireEvent.keyDown(view.contentDOM, { key: "Escape" })
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
		const props = { value: "* TODO task", onChange: vi.fn(), onSave: vi.fn(), todoClock: clock }
		const mounted = render(<OrgEditor {...props} readOnly />)
		const view = viewFor()
		act(() => todoKey(view, true))
		mounted.rerender(<OrgEditor {...props} />)
		for (const guard of [{ repeat: true }, { isComposing: true }, { keyCode: 229 }]) {
			act(() =>
				fireEvent.keyDown(view.contentDOM, { key: "T", altKey: true, shiftKey: true, ...guard }),
			)
		}
		expect(view.state.sliceDoc()).toBe(props.value)
		expect(clock).not.toHaveBeenCalled()
	})
})
