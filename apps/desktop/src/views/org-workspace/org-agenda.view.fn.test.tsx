import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaView } from "./org-agenda.view.fn"
import { useSettings } from "@/hooks/use-settings"
import { useApplicationCommandHost, type ApplicationCommandDescriptor } from "@/views/application/application-command-provider"

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

beforeEach(() => { useSettings.setState({ orgKeymapConfigurationJson: "" }) })
afterEach(() => { cleanup(); useSettings.setState({ orgKeymapConfigurationJson: "" }) })
describe("OrgAgendaView", () => {
	it("saves the focused row through its acknowledged producer and returns to that same source", async () => {
		const onSaveEntry = vi.fn(async () => ({ kind: "rejected" as const, message: "Source save was declined." }))
		const onReturnSource = vi.fn()
		let result: unknown
		function Inspect() {
			result = useApplicationCommandHost().result
			return null
		}
		render(<><OrgAgendaView entries={entries} error={null} isLoading={false} onOpenEntry={vi.fn()}
			onSaveEntry={onSaveEntry} onReturnSource={onReturnSource} /><Inspect /></>)
		const row = screen.getByRole("button", { name: /meetings\.org:8/ })
		act(() => row.focus())
		await act(async () => { fireEvent.keyDown(row, { key: "s", ctrlKey: true }) })
		expect(onSaveEntry).toHaveBeenCalledExactlyOnceWith(entries[1], null)
		expect(result).toEqual({ kind: "rejected", message: "Source save was declined." })
		act(() => useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1,
			bindings: [{ scope: "org-agenda", key: "A-r", command: "org-agenda.return-source" }] }) }))
		await act(async () => { fireEvent.keyDown(row, { key: "r", altKey: true }) })
		expect(onReturnSource).toHaveBeenCalledExactlyOnceWith(entries[1], null)
	})

	it("honors configurable null unbindings and routes replacements through the live producer", async () => {
		const onAction = vi.fn()
		render(<OrgAgendaView entries={entries} error={null} isLoading={false}
			onOpenEntry={vi.fn()} onAction={onAction} />)
		act(() => useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({
			version: 1, bindings: [
				{ scope: "org-agenda", key: "t", command: null },
				{ scope: "org-agenda", key: "s", command: null },
				{ scope: "org-agenda", key: "A-d", command: "org-agenda.schedule" },
			],
		}) }))
		const row = screen.getByRole("button", { name: /first\.org:2/ })
		act(() => row.focus())
		fireEvent.keyDown(row, { key: "t" })
		fireEvent.keyDown(row, { key: "s" })
		expect(onAction).not.toHaveBeenCalled()
		await act(async () => { fireEvent.keyDown(row, { key: "d", altKey: true }) })
		expect(onAction).toHaveBeenCalledOnce()
	})

	it("rejects a producer captured before row/source replacement", async () => {
		let capture!: ApplicationCommandDescriptor["capture"]
		function Inspect() {
			const host = useApplicationCommandHost()
			capture = () => host.registry.getSnapshot().commands.find((command) => command.id === "org-agenda.schedule")!.capture()
			return null
		}
		const onAction = vi.fn()
		const props = { error: null, isLoading: false, onOpenEntry: vi.fn(), onAction }
		const app = render(<><OrgAgendaView {...props} entries={entries} /><Inspect /></>)
		const operation = capture()
		if (typeof operation !== "function") throw new Error("Expected captured producer")
		app.rerender(<><OrgAgendaView {...props} entries={[{ ...entries[0], date: "2026-10-01" }]} /><Inspect /></>)
		expect(await operation()).toEqual({ kind: "cancelled" })
		expect(onAction).not.toHaveBeenCalled()
	})
	it("rejects an Agenda Save callback captured before input-configuration ABA", async () => {
		let capture!: ApplicationCommandDescriptor["capture"]
		function Inspect() {
			const host = useApplicationCommandHost()
			capture = () => host.registry.getSnapshot().commands.find((command) => command.id === "org-agenda.save")!.capture()
			return null
		}
		const save = vi.fn(async () => ({ kind: "success" as const }))
		render(<><OrgAgendaView entries={entries} error={null} isLoading={false} onOpenEntry={vi.fn()} onSaveEntry={save} /><Inspect /></>)
		const operation = capture()
		if (typeof operation !== "function") throw new Error("Expected captured Save")
		act(() => { useSettings.setState({ orgKeymapConfigurationJson: '{"version":2}' }); useSettings.setState({ orgKeymapConfigurationJson: "" }) })
		expect(await operation()).toEqual({ kind: "cancelled" })
		expect(save).not.toHaveBeenCalled()
	})

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


	it("preserves selection by stable identity across reorder and falls back when removed", async () => {
		const props = { error: null, isLoading: false, onOpenEntry: vi.fn() }
		const { rerender } = render(<OrgAgendaView {...props} entries={entries} />)
		act(() => screen.getByRole("button", { name: /Meeting/ }).focus())
		rerender(<OrgAgendaView {...props} entries={[{ ...entries[1] }, { ...entries[0] }]} />)
		await act(async () => { fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" }) })
		expect(props.onOpenEntry).toHaveBeenLastCalledWith(entries[1])
		rerender(<OrgAgendaView {...props} entries={[entries[0]]} />)
		await act(async () => { fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" }) })
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
				onAction={onCycleTodo}
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

	it("leaves consumed events, IME, editable targets and selected-text copy untouched", () => {
		const onOpenEntry = vi.fn()
		const onCycleTodo = vi.fn()
		render(
			<OrgAgendaView
				entries={entries}
				error={null}
				isLoading={false}
				onOpenEntry={onOpenEntry}
				onAction={onCycleTodo}
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
		}
		for (const tag of ["input", "textarea", "select", "div"]) {
			const target = document.createElement(tag)
			if (tag === "div") target.setAttribute("contenteditable", "true")
			main.append(target)
			dispatch(target, { key: "t" })
			dispatch(target, { key: "Enter" })
			target.remove()
		}
		const row = screen.getByRole("button", { name: /first\.org:2/ })
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
			dispatch(main, { key: "c", ctrlKey: true })
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

	it("disables actions while pending", () => {
		const onOpenEntry = vi.fn()
		const onCycleTodo = vi.fn()
		render(
			<OrgAgendaView
				entries={entries}
				error={null}
				isLoading={false}
				onOpenEntry={onOpenEntry}
				onAction={onCycleTodo}
				actionPending
			/>,
		)
		expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true")
		for (const button of screen.getByRole("main").querySelectorAll("button")) {
			fireEvent.click(button)
		}
		fireEvent.keyDown(screen.getByRole("main"), { key: "t" })
		fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" })
		expect(onOpenEntry).not.toHaveBeenCalled()
		expect(onCycleTodo).not.toHaveBeenCalled()
	})

})
