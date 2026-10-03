import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaView } from "./org-agenda.view.fn"

const entries: readonly OrgAgendaEntry[] = [
	{
		column: 10,
		date: "2025-06-01",
		heading: "First task",
		kind: "deadline",
		level: 1,
		line: 2,
		relativePath: "first.org",
		todo: "TODO",
	},
	{
		column: 4,
		date: "2025-06-01",
		heading: "Meeting",
		kind: "timestamp",
		level: 2,
		line: 8,
		relativePath: "meetings.org",
		todo: null,
	},
]

describe("OrgAgendaView", () => {
	it("groups entries by date and opens the selected source", () => {
		const onOpenEntry = vi.fn()
		render(
			<OrgAgendaView entries={entries} error={null} isLoading={false} onOpenEntry={onOpenEntry} />,
		)

		expect(screen.getAllByRole("heading", { name: "2025-06-01" })).toHaveLength(1)
		expect(screen.getByText("first.org:2")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /Meeting/ }))
		expect(onOpenEntry).toHaveBeenCalledWith(entries[1])
	})

	it("selects with n/p and arrows, opens with Enter, and cycles with t or an explicit button", () => {
		const onOpenEntry = vi.fn()
		const onCycleTodo = vi.fn()
		render(
			<OrgAgendaView
				entries={entries}
				error={null}
				isLoading={false}
				onOpenEntry={onOpenEntry}
				onCycleTodo={onCycleTodo}
			/>,
		)
		const main = screen.getByRole("main")
		const meeting = screen.getByRole("button", { name: /Timestamp.*Meeting/ })
		fireEvent.keyDown(main, { key: "n" })
		expect(meeting).toHaveFocus()
		expect(meeting).toHaveAttribute("aria-current", "true")
		fireEvent.keyDown(meeting, { key: "Enter" })
		expect(onOpenEntry).toHaveBeenCalledExactlyOnceWith(entries[1])
		fireEvent.keyDown(meeting, { key: "p" })
		fireEvent.keyDown(main, { key: "ArrowDown" })
		fireEvent.keyDown(main, { key: "ArrowUp" })
		fireEvent.keyDown(main, { key: "t" })
		expect(onCycleTodo).toHaveBeenCalledExactlyOnceWith(entries[0])
		fireEvent.click(screen.getByRole("button", { name: "Cycle TODO for Meeting" }))
		expect(onCycleTodo).toHaveBeenLastCalledWith(entries[1])
	})

	it("preserves selection by stable identity across reorder and falls back when removed", () => {
		const props = { error: null, isLoading: false, onOpenEntry: vi.fn() }
		const { rerender } = render(<OrgAgendaView {...props} entries={entries} />)
		fireEvent.focus(screen.getByRole("button", { name: /Meeting/ }))
		rerender(<OrgAgendaView {...props} entries={[{ ...entries[1] }, { ...entries[0] }]} />)
		fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" })
		expect(props.onOpenEntry).toHaveBeenLastCalledWith(entries[1])
		rerender(<OrgAgendaView {...props} entries={[entries[0]]} />)
		fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" })
		expect(props.onOpenEntry).toHaveBeenLastCalledWith(entries[0])
	})

	it("uses cancelable real DOM events, consumes commands, and ignores held t", () => {
		const onCycleTodo = vi.fn()
		render(
			<OrgAgendaView
				entries={entries}
				error={null}
				isLoading={false}
				onOpenEntry={vi.fn()}
				onCycleTodo={onCycleTodo}
			/>,
		)
		const main = screen.getByRole("main")
		for (const repeat of [false, true, true]) {
			const event = new KeyboardEvent("keydown", {
				key: "t",
				repeat,
				bubbles: true,
				cancelable: true,
			})
			act(() => {
				expect(main.dispatchEvent(event)).toBe(false)
			})
			expect(event.defaultPrevented).toBe(true)
		}
		expect(onCycleTodo).toHaveBeenCalledTimes(1)
	})

	it("leaves consumed events, IME, modifiers, editable targets and native selection untouched", () => {
		const onOpenEntry = vi.fn()
		const onCycleTodo = vi.fn()
		render(
			<OrgAgendaView
				entries={entries}
				error={null}
				isLoading={false}
				onOpenEntry={onOpenEntry}
				onCycleTodo={onCycleTodo}
			/>,
		)
		const main = screen.getByRole("main")
		const dispatch = (target: HTMLElement, init: KeyboardEventInit) => {
			const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })
			act(() => {
				expect(target.dispatchEvent(event)).toBe(true)
			})
			expect(event.defaultPrevented).toBe(false)
		}
		for (const key of ["n", "p", "ArrowDown", "ArrowUp", "Enter", "t"]) {
			dispatch(main, { key, isComposing: true })
			dispatch(main, { key, keyCode: 229 })
			for (const modifier of ["ctrlKey", "metaKey", "altKey", "shiftKey"]) {
				dispatch(main, { key, [modifier]: true })
			}
		}
		dispatch(main, { key: "c", ctrlKey: true })
		for (const tag of ["input", "textarea", "select", "div"]) {
			const target = document.createElement(tag)
			if (tag === "div") target.setAttribute("contenteditable", "true")
			main.append(target)
			dispatch(target, { key: "t" })
			dispatch(target, { key: "Enter" })
			target.remove()
		}
		const row = screen.getByRole("button", { name: /Deadline.*First task/ })
		row.addEventListener("keydown", (event) => event.preventDefault(), { once: true })
		const consumed = new KeyboardEvent("keydown", { key: "t", bubbles: true, cancelable: true })
		act(() => {
			row.dispatchEvent(consumed)
		})
		expect(consumed.defaultPrevented).toBe(true)
		const range = document.createRange()
		const text = screen.getByText("First task").firstChild!
		range.setStart(text, 0)
		range.setEnd(text, text.textContent!.length)
		window.getSelection()?.removeAllRanges()
		window.getSelection()?.addRange(range)
		expect(window.getSelection()?.toString()).toBe("First task")
		try {
			dispatch(main, { key: "t" })
			dispatch(main, { key: "ArrowDown" })
		} finally {
			window.getSelection()?.removeAllRanges()
		}
		expect(onOpenEntry).not.toHaveBeenCalled()
		expect(onCycleTodo).not.toHaveBeenCalled()
		expect(row).toHaveAttribute("aria-current", "true")
		// A shortcut outside the main never reaches the scoped handler.
		dispatch(document.body, { key: "t" })
		expect(onCycleTodo).not.toHaveBeenCalled()
	})

	it("disables actions while pending and exposes action status", () => {
		const onOpenEntry = vi.fn()
		const onCycleTodo = vi.fn()
		render(
			<OrgAgendaView
				entries={entries}
				error={null}
				isLoading={false}
				onOpenEntry={onOpenEntry}
				onCycleTodo={onCycleTodo}
				actionPending
				actionStatus="Updating TODO…"
			/>,
		)
		expect(screen.getByRole("status")).toHaveTextContent("Updating TODO…")
		expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true")
		for (const button of screen.getAllByRole("button")) {
			expect(button).toHaveAttribute("aria-disabled", "true")
			fireEvent.click(button)
		}
		fireEvent.keyDown(screen.getByRole("main"), { key: "t" })
		fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" })
		expect(onOpenEntry).not.toHaveBeenCalled()
		expect(onCycleTodo).not.toHaveBeenCalled()
	})

	it("renders loading, error, and empty states", () => {
		const props = { entries: [], error: null, isLoading: true, onOpenEntry: vi.fn() }
		const { rerender } = render(<OrgAgendaView {...props} />)
		expect(screen.getByText("Loading agenda…")).toBeInTheDocument()

		rerender(<OrgAgendaView {...props} isLoading={false} error="Could not read notes.org" />)
		expect(screen.getByRole("alert")).toHaveTextContent("Could not read notes.org")

		rerender(<OrgAgendaView {...props} isLoading={false} />)
		expect(screen.getByText("No active Org timestamps in this workspace.")).toBeInTheDocument()
	})
})
