import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaContainer } from "./org-agenda.container.fn"

let entries: readonly OrgAgendaEntry[]
vi.mock("@/flows/org-workspace", () => ({ loadOrgAgendaFlow: () => async () => E.right(entries) }))
const row = (from: number, date: string): OrgAgendaEntry => ({
	relativePath: "tasks.org",
	line: from + 2,
	column: 10,
	date,
	kind: "deadline",
	heading: "Duplicate",
	todo: "TODO",
	level: 1,
	origin: {
		relativePath: "tasks.org",
		source: "disk",
		diskRevision: "r1",
		heading: { from, to: from + 16, text: "* TODO Duplicate" },
		timestamp: { from: from + 27, to: from + 43, text: `<${date}>` },
	},
})
const deferred = <T,>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((settle) => {
		resolve = settle
	})
	return { promise, resolve }
}
function setup() {
	const executeAgendaCommand = vi.fn().mockResolvedValue({ kind: "confirmed" })
	const prepareAgendaPlanning = vi
		.fn()
		.mockImplementation(async (entry) => ({ kind: "ready", entry, date: null }))
	const controller = {
		workspace: { rootPath: "/notes", capabilityToken: "grant", documents: [], directories: [] },
		workspaceSessionId: "session",
		liveBuffers: [],
		executeAgendaCommand,
		prepareAgendaPlanning,
		openDocumentAt: vi.fn().mockResolvedValue(true),
	}
	const onShowEditor = vi.fn()
	const props = {
		controller: controller as unknown as OrgWorkspaceController,
		onShowEditor,
		now: () => new Date(2026, 8, 30, 23, 59),
	}
	const mounted = render(
		<>
			<input aria-label="Other surface" />
			<OrgAgendaContainer {...props} />
		</>,
	)
	return {
		...mounted,
		controller,
		props,
		executeAgendaCommand,
		prepareAgendaPlanning,
		onShowEditor,
	}
}
async function start(kind = "Schedule", index = 1) {
	await screen.findAllByRole("button", { name: `${kind} for Duplicate` })
	const button = screen.getAllByRole("button", { name: `${kind} for Duplicate` })[index]
	act(() => {
		button.focus()
		fireEvent.click(button)
	})
	return button
}
beforeEach(() => {
	entries = [row(0, "2026-07-01"), row(100, "2026-07-02")]
})
afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})

describe("production agenda parameter adapter and bottom minibuffer", () => {
	it("keyboard s/d reuse row selection and suppress modifiers, composition, repeats and action-button shortcuts", async () => {
		const test = setup()
		await screen.findAllByRole("button", { name: "Schedule for Duplicate" })
		const rows = screen.getByRole("main").querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
		act(() => rows[0].focus())
		fireEvent.keyDown(rows[0], { key: "n" })
		for (const init of [
			{ key: "s", repeat: true },
			{ key: "d", isComposing: true },
			{ key: "s", ctrlKey: true },
		])
			fireEvent.keyDown(rows[1], init)
		fireEvent.keyDown(screen.getAllByRole("button", { name: "Cycle TODO for Duplicate" })[1], {
			key: "s",
		})
		expect(test.prepareAgendaPlanning).not.toHaveBeenCalled()
		fireEvent.keyDown(rows[1], { key: "d" })
		const input = await screen.findByRole("combobox")
		expect(test.prepareAgendaPlanning).toHaveBeenCalledWith(
			entries[1],
			"deadline",
			expect.any(AbortSignal),
		)
		fireEvent.keyDown(input, { key: "Escape" })
		await waitFor(() => expect(document.activeElement).toBe(rows[1]))
	})

	it("prepares the immutable duplicate target without executing, uses local today, validates dates, locks duplicate accepts and blocks every agenda action", async () => {
		const test = setup()
		await start()
		const input = await screen.findByRole("combobox")
		expect(input).toHaveValue("2026-09-30")
		expect(screen.getByRole("region", { name: "Minibuffer" })).toBeInTheDocument()
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		expect(test.prepareAgendaPlanning).toHaveBeenCalledWith(
			entries[1],
			"schedule",
			expect.any(AbortSignal),
		)
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for Duplicate" })[0])
		fireEvent.click(screen.getAllByRole("button", { name: "Deadline for Duplicate" })[0])
		fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" })
		expect(test.controller.openDocumentAt).not.toHaveBeenCalled()
		expect(test.prepareAgendaPlanning).toHaveBeenCalledTimes(1)
		fireEvent.change(input, { target: { value: "2026-02-30" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("real calendar date")
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		const result = deferred<{ kind: "confirmed" }>()
		test.executeAgendaCommand.mockReturnValueOnce(result.promise)
		fireEvent.change(input, { target: { value: " 2026-10-01 " } })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.click(screen.getByRole("button", { name: "Accept minibuffer" }))
		expect(test.executeAgendaCommand).toHaveBeenCalledExactlyOnceWith(
			entries[1],
			{ kind: "schedule", date: "2026-10-01" },
			expect.any(AbortSignal),
			{ onCommitStarted: expect.any(Function) },
		)
		await act(async () => result.resolve({ kind: "confirmed" }))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(screen.getByRole("status")).toHaveTextContent("Schedule changed in working copy")
		expect(test.onShowEditor).not.toHaveBeenCalled()
	})

	it.each([
		{ key: "Escape" },
		{ key: "g", ctrlKey: true },
	])("blocks minibuffer $key only after the synchronous commit boundary", async (key) => {
		const test = setup()
		const result = deferred<{ kind: "confirmed" }>()
		test.executeAgendaCommand.mockImplementationOnce((_entry, _command, _signal, options) => {
			options.onCommitStarted()
			return result.promise
		})
		const button = await start()
		const input = await screen.findByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter" })
		const signal = test.executeAgendaCommand.mock.calls[0][2] as AbortSignal
		fireEvent.keyDown(input, key)
		fireEvent.click(screen.getByRole("button", { name: "Cancel minibuffer" }))
		expect(signal.aborted).toBe(false)
		expect(screen.getByRole("combobox")).toBe(input)
		expect(screen.getByRole("button", { name: "Cancel minibuffer" })).toBeDisabled()
		await act(async () => result.resolve({ kind: "confirmed" }))
		expect(screen.getByRole("status")).toHaveTextContent("Schedule changed in working copy")
		await waitFor(() => expect(document.activeElement).toBe(button))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
	})

	it("uses existing planning date and reports unchanged distinctly", async () => {
		const test = setup()
		test.prepareAgendaPlanning.mockImplementation(async (entry) => ({
			kind: "ready",
			entry,
			date: "2026-07-02",
		}))
		test.executeAgendaCommand.mockResolvedValue({ kind: "unchanged" })
		await start("Deadline")
		const input = await screen.findByRole("combobox")
		expect(input).toHaveValue("2026-07-02")
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument())
		expect(screen.getByRole("status")).toHaveTextContent("Deadline unchanged")
	})

	it.each([
		"cancel",
		"unmount",
		"scope",
	])("aborts explicit preparation read and ignores its late ready result: %s", async (mode) => {
		const test = setup()
		const ready = deferred<{ kind: "ready"; entry: OrgAgendaEntry; date: null }>()
		test.prepareAgendaPlanning.mockReturnValueOnce(ready.promise)
		await start()
		const signal = test.prepareAgendaPlanning.mock.calls[0][2] as AbortSignal
		if (mode === "cancel") fireEvent.keyDown(screen.getByRole("main"), { key: "Escape" })
		if (mode === "unmount") test.unmount()
		if (mode === "scope")
			test.rerender(
				<>
					<input aria-label="Other surface" />
					<OrgAgendaContainer
						{...test.props}
						controller={{ ...test.props.controller, workspaceSessionId: "new" }}
					/>
				</>,
			)
		expect(signal.aborted).toBe(true)
		await act(async () => ready.resolve({ kind: "ready", entry: entries[1], date: null }))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
	})

	it("cancels input without execution and returns focus to the originating action", async () => {
		setup()
		const button = await start()
		const input = await screen.findByRole("combobox")
		fireEvent.keyDown(input, { key: "Escape" })
		await waitFor(() => expect(document.activeElement).toBe(button))
	})

	it("restores the same heading action after date reorder and planning line shifts, without stealing external focus", async () => {
		const test = setup()
		await start("Deadline")
		const input = await screen.findByRole("combobox")
		test.executeAgendaCommand.mockImplementationOnce(async () => {
			entries = [{ ...row(100, "2026-06-01"), line: 103 }, entries[0]]
			return { kind: "confirmed" }
		})
		fireEvent.change(input, { target: { value: "2026-06-01" } })
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() =>
			expect(document.activeElement).toBe(
				screen.getAllByRole("button", { name: "Deadline for Duplicate" })[0],
			),
		)
		await start("Schedule", 0)
		const result = deferred<{ kind: "confirmed" }>()
		test.executeAgendaCommand.mockReturnValueOnce(result.promise)
		fireEvent.keyDown(await screen.findByRole("combobox"), { key: "Enter" })
		const other = screen.getByRole("textbox", { name: "Other surface" })
		other.focus()
		await act(async () => result.resolve({ kind: "confirmed" }))
		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(document.activeElement).toBe(other)
	})

	it.each(["stale", "rejected"])("never opens parameters on %s preparation", async (kind) => {
		const test = setup()
		test.prepareAgendaPlanning.mockResolvedValueOnce({ kind, message: "Invalid planning" })
		await start()
		await waitFor(() => expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false"))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
	})

	it("invalidates parameter acceptance before Root when candidates or source change", async () => {
		const test = setup()
		await start()
		const input = await screen.findByRole("combobox")
		entries = [entries[0], { ...entries[1], date: "2026-07-03" }]
		test.rerender(
			<>
				<input aria-label="Other surface" />
				<OrgAgendaContainer
					{...test.props}
					controller={{
						...test.props.controller,
						workspace: {
							...test.props.controller.workspace!,
							documents: [{ relativePath: "tasks.org", revision: "r2" }],
						},
					}}
				/>
			</>,
		)
		await waitFor(() => expect(screen.getByRole("main")).toHaveTextContent("2026-07-03"))
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument())
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		expect(screen.getByRole("status")).toHaveTextContent("Agenda source changed")
	})

	it("uses production minibuffer composition, consumed-key and held Enter locks", async () => {
		const test = setup()
		await start()
		const input = await screen.findByRole("combobox")
		fireEvent.compositionStart(input)
		fireEvent.keyDown(input, { key: "Enter", isComposing: true })
		fireEvent.keyDown(input, { key: "Escape", isComposing: true })
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		fireEvent.compositionEnd(input)
		const consumed = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
		consumed.preventDefault()
		act(() => input.dispatchEvent(consumed))
		fireEvent.keyDown(input, { key: "Enter", repeat: true })
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		fireEvent.keyDown(input, { key: "g", ctrlKey: true })
		await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument())
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
	})

	it("ignores disposed late execution outcomes", async () => {
		const test = setup()
		await start()
		const result = deferred<{ kind: "confirmed" }>()
		test.executeAgendaCommand.mockReturnValueOnce(result.promise)
		fireEvent.keyDown(await screen.findByRole("combobox"), { key: "Enter" })
		const signal = test.executeAgendaCommand.mock.calls[0][2] as AbortSignal
		test.unmount()
		expect(signal.aborted).toBe(true)
		await act(async () => result.resolve({ kind: "confirmed" }))
		expect(test.onShowEditor).not.toHaveBeenCalled()
	})
})
