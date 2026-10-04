import { act, cleanup, fireEvent, render, renderHook } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useOrgAgendaParameters, type AgendaParameterController } from "./use-org-agenda-parameters"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgMinibuffer } from "@/views/org-workspace/org-minibuffer.view.fn"

const deferred = <T,>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}
const entry = { relativePath: "tasks.org", heading: "Task" } as OrgAgendaEntry
const setup = (strict = false) => {
	const prepareAgendaPlanning = vi.fn().mockResolvedValue({ kind: "ready", date: null })
	const executeAgendaCommand = vi.fn().mockResolvedValue({ kind: "confirmed" })
	const restoreFocus = vi.fn()
	const reload = vi.fn()
	const hook = renderHook(
		({ scope, sourceVersion }) =>
			useOrgAgendaParameters({
				controller: { prepareAgendaPlanning, executeAgendaCommand } as AgendaParameterController,
				scope,
				sourceVersion,
				reload,
				restoreFocus,
			}),
		{
			initialProps: { scope: "one", sourceVersion: "v1" },
			wrapper: strict
				? ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
				: undefined,
		},
	)
	return { ...hook, prepareAgendaPlanning, executeAgendaCommand, restoreFocus, reload }
}
afterEach(cleanup)
describe("agenda shared parameter lifecycle", () => {
	it.each([
		false,
		true,
	])("actual minibuffer completion keeps original row restoration unless callback removes host (%s)", async (removeHost) => {
		const row = document.createElement("button")
		document.body.append(row)
		const restoreFocus = vi.fn(() => row.focus())
		const executeAgendaCommand = vi.fn(async () => {
			// Remove the actual host's mount container so React can still retire its detached tree.
			if (removeHost)
				document.querySelector("[data-org-parameter-session]")!.parentElement!.remove()
			return { kind: "confirmed" as const }
		})
		const App = () => {
			const parameters = useOrgAgendaParameters({
				controller: {
					executeAgendaCommand,
					prepareAgendaPlanning: async () => ({ kind: "ready", date: null, entry }),
				} as AgendaParameterController,
				scope: "one",
				reload: () => {},
				restoreFocus,
			})
			return (
				<>
					<button onClick={() => parameters.start(entry, "schedule")}>Schedule</button>
					<OrgMinibuffer session={parameters.session} />
				</>
			)
		}
		// Request creation from body is allowed, but body is never completion ownership.
		row.blur()
		const app = render(<App />)
		try {
			await act(async () => fireEvent.click(app.getByText("Schedule")))
			const input = app.getByRole("combobox")
			expect(document.activeElement).toBe(input)
			await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
			expect(executeAgendaCommand).toHaveBeenCalledOnce()
			expect(restoreFocus).toHaveBeenCalledTimes(removeHost ? 0 : 1)
			expect(document.activeElement).toBe(removeHost ? document.body : row)
		} finally {
			app.unmount()
			row.remove()
		}
	})

	it.each([
		"child",
		"removed",
		"same-id-host",
	] as const)("async completion retains original host ownership with %s", async (destination) => {
		const test = setup()
		await act(async () => test.result.current.start(entry, "schedule"))
		const session = test.result.current.session!
		const host = document.createElement("div")
		host.dataset.orgParameterSession = String(session.id)
		const input = document.createElement("input")
		const replacement = document.createElement("input")
		host.append(input)
		document.body.append(host)
		input.focus()
		const outcome = deferred<unknown>()
		test.executeAgendaCommand.mockImplementationOnce(() => {
			input.remove()
			if (destination === "child") host.append(replacement)
			else host.remove()
			if (destination === "same-id-host") {
				replacement.dataset.orgParameterSession = String(session.id)
				document.body.append(replacement)
			}
			if (destination !== "removed") replacement.focus()
			return outcome.promise
		})
		try {
			let accepted!: ReturnType<typeof session.onAccept>
			act(() => {
				accepted = session.onAccept("2026-10-01")
			})
			await act(async () => {
				outcome.resolve({ kind: "confirmed" })
				await accepted
			})
			expect(test.restoreFocus).toHaveBeenCalledTimes(destination === "child" ? 1 : 0)
		} finally {
			host.remove()
			replacement.remove()
		}
	})

	it("aborts preparation immediately when the source changes and drops late ready", async () => {
		const test = setup()
		const prepared = deferred<unknown>()
		test.prepareAgendaPlanning.mockReturnValueOnce(prepared.promise)
		act(() => test.result.current.start(entry, "schedule"))
		const signal = test.prepareAgendaPlanning.mock.calls[0][2] as AbortSignal
		test.rerender({ scope: "one", sourceVersion: "v2" })
		expect(signal.aborted).toBe(true)
		await act(async () => prepared.resolve({ kind: "ready", date: null }))
		expect(test.result.current.session).toBeNull()
		expect(test.result.current.isPending()).toBe(false)
	})
	it("invalidates detached delivery but drains the started commit, blocks replacement, and releases pending only on settlement", async () => {
		const test = setup()
		const outcome = deferred<unknown>()
		test.executeAgendaCommand.mockImplementationOnce((_entry, _command, _signal, options) => {
			options.onCommitStarted()
			return outcome.promise
		})
		act(() => test.result.current.start(entry, "cycle-todo"))
		const signal = test.executeAgendaCommand.mock.calls[0][2] as AbortSignal
		test.rerender({ scope: "two", sourceVersion: "v2" })
		expect(signal.aborted).toBe(true)
		expect(test.result.current.pending).toBe(true)
		expect(test.result.current.isPending()).toBe(true)
		act(() => test.result.current.start(entry, "schedule"))
		expect(test.prepareAgendaPlanning).not.toHaveBeenCalled()
		await act(async () => outcome.resolve({ kind: "confirmed" }))
		expect(test.result.current.pending).toBe(false)
		expect(test.result.current.isPending()).toBe(false)
		expect(test.reload).not.toHaveBeenCalled()
		expect(test.restoreFocus).not.toHaveBeenCalled()
	})
	it("survives StrictMode attachment replay and guards saved session callbacks after source replacement", async () => {
		const test = setup(true)
		await act(async () => test.result.current.start(entry, "schedule"))
		const session = test.result.current.session!
		expect(session).not.toBeNull()
		test.rerender({ scope: "one", sourceVersion: "v2" })
		await act(async () => {
			await session.onAccept("2026-10-01")
		})
		expect(test.executeAgendaCommand).not.toHaveBeenCalled()
		expect(test.result.current.session).toBeNull()
	})
	it("restores only owned focus captured before retiring the published session", async () => {
		const test = setup()
		await act(async () => test.result.current.start(entry, "schedule"))
		const input = document.createElement("input")
		input.setAttribute("data-org-parameter-session", String(test.result.current.session!.id))
		document.body.append(input)
		input.focus()
		act(() => test.result.current.cancel())
		expect(test.restoreFocus).toHaveBeenCalledOnce()
		await act(async () => test.result.current.start(entry, "schedule"))
		const other = document.createElement("input")
		document.body.append(other)
		other.focus()
		act(() => test.result.current.cancel())
		expect(test.restoreFocus).toHaveBeenCalledOnce()
		input.remove()
		other.remove()
	})
})
