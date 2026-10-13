import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { createApplicationTestClock, render } from "@/test/application-providers"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaContainer } from "./org-agenda.container.fn"

let entries: readonly OrgAgendaEntry[]
vi.mock("@/flows/org-workspace/org-agenda.flow", () => ({ loadOrgAgendaFlow: () => async () => E.right(entries) }))
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
		sourceRevision: "r1",
		workspaceRoot: "/notes",
		capabilityToken: "grant",
		workspaceSessionId: "session",
		heading: { from, to: from + 16, text: "* TODO Duplicate" },
		timestamp: { from: from + 27, to: from + 39, text: `<${date}>` },
	},
})
const deferred = <T,>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((settle) => {
		resolve = settle
	})
	return { promise, resolve }
}
function setup(now = () => new Date(2026, 8, 30, 23, 59)) {
	const executeAgendaCommand = vi.fn().mockResolvedValue({ kind: "confirmed" })
	const prepareAgendaCommand = vi
		.fn()
		.mockImplementation(async (entry) => ({ kind: "ready", entry, date: null }))
	const controller = {
		workspace: { rootPath: "/notes", capabilityToken: "grant", documents: [], directories: [] },
		workspaceSessionId: "session",
		liveBuffers: [],
		executeAgendaCommand,
		prepareAgendaCommand: prepareAgendaCommand,
		openDocumentAt: vi.fn().mockResolvedValue(true),
	}
	Object.assign(controller, { clock: createApplicationTestClock(controller as unknown as OrgWorkspaceController) })
	const onShowEditor = vi.fn()
	const props = {
		controller: controller as unknown as OrgWorkspaceController,
		onShowEditor,
		now,
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
		prepareAgendaCommand: prepareAgendaCommand,
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
	document.body.removeAttribute("tabindex")
})

describe("production agenda parameter adapter and bottom minibuffer", () => {

	it("locks the immutable duplicate target while preparing, validates dates and permits only one accepting mutation", async () => {
		const test = setup()
		await start()
		const input = await screen.findByRole("combobox", { name: /^(Schedule|Deadline) \(/ })
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for Duplicate" })[0])
		fireEvent.click(screen.getAllByRole("button", { name: "Deadline for Duplicate" })[0])
		fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" })
		expect(test.controller.openDocumentAt).not.toHaveBeenCalled()
		expect(test.prepareAgendaCommand).toHaveBeenCalledTimes(1)
		fireEvent.change(input, { target: { value: "2026-02-30" } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		const result = deferred<{ kind: "confirmed" }>()
		test.executeAgendaCommand.mockReturnValueOnce(result.promise)
		fireEvent.change(input, { target: { value: " 2026-10-01 " } })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.click(screen.getByRole("button", { name: "Accept minibuffer" }))
		expect(test.executeAgendaCommand).toHaveBeenCalledOnce()
		await act(async () => result.resolve({ kind: "confirmed" }))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(test.onShowEditor).not.toHaveBeenCalled()
	})

	it.each(["invalid", "throws"] as const)("keeps a failed %s accept-time clock editable without executing", async (failure) => {
		let failing = false
		const test = setup(() => {
			if (!failing) return new Date(2026, 8, 30, 23, 59)
			if (failure === "throws") throw new Error("clock offline")
			return new Date(NaN)
		})
		await start()
		const input = await screen.findByRole("combobox", { name: /^Schedule \(/ })
		failing = true
		fireEvent.change(input, { target: { value: "tomorrow" } })
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(input).toBeInTheDocument()
		expect(screen.getByRole("alert")).toBeVisible()
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		failing = false
		await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
		expect(test.executeAgendaCommand).toHaveBeenCalledOnce()
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
		const input = await screen.findByRole("combobox", { name: /^(Schedule|Deadline) \(/ })
		fireEvent.keyDown(input, { key: "Enter" })
		const signal = test.executeAgendaCommand.mock.calls[0][2] as AbortSignal
		fireEvent.keyDown(input, key)
		fireEvent.click(screen.getByRole("button", { name: "Cancel minibuffer" }))
		expect(signal.aborted).toBe(false)
		expect(screen.getByRole("combobox", { name: /^(Schedule|Deadline) \(/ })).toBe(input)
		expect(screen.getByRole("button", { name: "Cancel minibuffer" })).toBeDisabled()
		await act(async () => result.resolve({ kind: "confirmed" }))
		await waitFor(() => expect(document.activeElement).toBe(button))
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
	})


	it.each([
		"cancel",
		"unmount",
		"scope",
	])("aborts explicit preparation read and ignores its late ready result: %s", async (mode) => {
		const test = setup()
		const ready = deferred<{ kind: "ready"; entry: OrgAgendaEntry; date: null }>()
		test.prepareAgendaCommand.mockReturnValueOnce(ready.promise)
		await start()
		const signal = test.prepareAgendaCommand.mock.calls[0][2] as AbortSignal
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
		const input = await screen.findByRole("combobox", { name: /^(Schedule|Deadline) \(/ })
		fireEvent.keyDown(input, { key: "Escape" })
		await waitFor(() => expect(document.activeElement).toBe(button))
	})

	it("restores the same heading action after date reorder and planning line shifts, without stealing external focus", async () => {
		const test = setup()
		await start("Deadline")
		const input = await screen.findByRole("combobox", { name: /^(Schedule|Deadline) \(/ })
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
		fireEvent.keyDown(await screen.findByRole("combobox", { name: /^(Schedule|Deadline) \(/ }), { key: "Enter" })
		const other = screen.getByRole("textbox", { name: "Other surface" })
		other.focus()
		await act(async () => result.resolve({ kind: "confirmed" }))
		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(document.activeElement).toBe(other)
	})

	it.each(
		["rejected", "throw"].flatMap((outcome) =>
			["origin", "foreign", "removed", "body", "body-origin", "another-row"].map((focus) => ({
				outcome,
				focus,
			})),
		),
	)("pre-minibuffer $outcome restores only the still-owned production origin: $focus", async ({
		outcome,
		focus,
	}) => {
		const test = setup()
		await screen.findAllByRole("button", { name: "Schedule for Duplicate" })
		const buttons = screen.getAllByRole("button", { name: "Schedule for Duplicate" })
		const origin = buttons[1]
		if (focus !== "body-origin") act(() => origin.focus())
		const restore = vi.spyOn(origin, "focus")
		test.prepareAgendaCommand.mockImplementationOnce(async () => {
			if (focus === "foreign") screen.getByRole("textbox", { name: "Other surface" }).focus()
			if (focus === "removed") origin.remove()
			if (focus === "body") {
				document.body.tabIndex = -1
				document.body.focus()
			}
			if (focus === "another-row") buttons[0].focus()
			if (outcome === "throw") throw new Error("prepare failed")
			return { kind: "rejected", message: "Invalid planning" }
		})
		fireEvent.click(origin)
		await waitFor(() => expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false"))
		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(restore).toHaveBeenCalledTimes(focus === "origin" ? 1 : 0)
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
	})

	it.each(["stale", "rejected"])("never opens parameters on %s preparation", async (kind) => {
		const clock = vi.fn(() => { throw new Error("Rejected source must not read the clock") })
		const test = setup(clock)
		test.prepareAgendaCommand.mockResolvedValueOnce({ kind, message: "Invalid planning" })
		await start()
		await waitFor(() => expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false"))
		expect(clock).not.toHaveBeenCalled()
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
	})

	it("invalidates parameter acceptance before Root when candidates or source change", async () => {
		const test = setup()
		await start()
		const input = await screen.findByRole("combobox", { name: /^(Schedule|Deadline) \(/ })
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
	})

	it("uses production minibuffer composition, consumed-key and held Enter locks", async () => {
		const test = setup()
		await start()
		const input = await screen.findByRole("combobox", { name: /^(Schedule|Deadline) \(/ })
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
		fireEvent.keyDown(await screen.findByRole("combobox", { name: /^(Schedule|Deadline) \(/ }), { key: "Enter" })
		const signal = test.executeAgendaCommand.mock.calls[0][2] as AbortSignal
		test.unmount()
		expect(signal.aborted).toBe(true)
		await act(async () => result.resolve({ kind: "confirmed" }))
		expect(test.onShowEditor).not.toHaveBeenCalled()
	})
})
