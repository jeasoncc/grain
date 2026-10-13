import { act, cleanup, createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { OrgTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import { OrgTodoNote } from "./org-todo-note.view.fn"

afterEach(() => {
	cleanup()
	vi.useRealTimers()
})

it("retains the exact plain-text draft when an accepted result drains after its originating scope retires", async () => {
	const outcome = Promise.withResolvers<OrgTodoNoteResult>()
	const request: OrgTodoNoteRequest = { execute: vi.fn(() => outcome.promise), abort: vi.fn() }
	const close = vi.fn()
	const view = render(<OrgTodoNote request={request} closeFence="G1" onClose={close} />)
	fireEvent.change(screen.getByRole("textbox", { name: "TODO note" }), { target: { value: "preserve this\r\nliteral note" } })
	const text = (screen.getByRole("textbox", { name: "TODO note" }) as HTMLTextAreaElement).value
	fireEvent.click(screen.getByText("Finish note"))
	view.rerender(<OrgTodoNote request={request} closeFence="G2" onClose={close} />)
	await act(async () => outcome.resolve({ kind: "applied" }))
	expect(close).not.toHaveBeenCalled()
	expect(screen.getByRole("textbox", { name: "TODO note" })).toHaveValue(text)
	expect(screen.getByRole("textbox", { name: "TODO note" })).toHaveAttribute("readonly")
})

it.each(["applied", "aborted", "rejected"] as const)(
	"drains a disposed note's %s outcome without closing or focusing its replacement",
	async (kind) => {
		const outcome = Promise.withResolvers<OrgTodoNoteResult>()
		const abort = vi.fn()
		const requests: readonly OrgTodoNoteRequest[] = [
			{ execute: () => outcome.promise, abort },
			{ execute: (): OrgTodoNoteResult => ({ kind: "applied" }), abort: vi.fn() },
		]
		const closed: number[] = []
		function Producer() {
			const [generation, setGeneration] = useState(0)
			return <>
				<button type="button" onClick={() => setGeneration(1)}>Replace note</button>
				{generation < requests.length && <OrgTodoNote
					key={generation}
					request={requests[generation]}
					onClose={() => {
						closed.push(generation)
						setGeneration(requests.length)
					}}
				/>}
			</>
		}
		render(<Producer />)
		const retired = screen.getByRole("textbox", { name: "TODO note" })
		fireEvent.change(retired, { target: { value: "accepted old draft" } })
		fireEvent.keyDown(retired, { ctrlKey: true, key: "s" })
		expect(retired).toHaveAttribute("readonly")
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Replace note" })) })
		const replacement = screen.getByRole("textbox", { name: "TODO note" })
		fireEvent.change(replacement, { target: { value: "new producer's literal\n:END:\n* draft" } })
		expect(retired).not.toBeInTheDocument()
		expect(replacement).toHaveFocus()
		expect(abort).toHaveBeenCalledOnce()
		await act(async () => {
			outcome.resolve(kind === "rejected" ? { kind, reason: "retired read" } : { kind })
			await outcome.promise
		})
		expect(closed).toEqual([])
		expect(screen.getByRole("textbox", { name: "TODO note" })).toBe(replacement)
		expect(replacement).toHaveValue("new producer's literal\n:END:\n* draft")
		expect(replacement).toHaveFocus()
		expect(replacement).not.toHaveAttribute("readonly")
		await act(async () => { fireEvent.keyDown(replacement, { ctrlKey: true, key: "s" }) })
		expect(closed).toEqual([1])
		expect(screen.queryByRole("textbox", { name: "TODO note" })).toBeNull()
	},
)

function pending() {
	let resolve!: (result: OrgTodoNoteResult) => void
	const execute = vi.fn(
		() =>
			new Promise<OrgTodoNoteResult>((done) => {
				resolve = done
			}),
	)
	const request: OrgTodoNoteRequest = { execute, abort: vi.fn() }
	const close = vi.fn()
	render(<OrgTodoNote request={request} onClose={close} />)
	return {
		request,
		execute,
		close,
		resolve: (result: OrgTodoNoteResult) => resolve(result),
		note: screen.getByRole("textbox") as HTMLTextAreaElement,
	}
}

describe("TODO scratch", () => {
	it("locks asynchronous execution and keeps an applied outcome after an abort attempt", async () => {
		const { request, execute, close, resolve, note } = pending()
		fireEvent.change(note, { target: { value: "literal\r\n* heading\r:END:" } })
		const draft = note.value
		fireEvent.keyDown(note, { ctrlKey: true, key: "s" })
		expect(execute).toHaveBeenCalledWith(draft)
		expect(note.readOnly).toBe(true)
		fireEvent.keyDown(note, { metaKey: true, key: "s" })
		fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		expect(execute).toHaveBeenCalledTimes(1)
		fireEvent.keyDown(note, { ctrlKey: true, key: "g" })
		expect(request.abort).toHaveBeenCalledTimes(1)
		expect(close).not.toHaveBeenCalled()
		await act(async () => resolve({ kind: "applied" }))
		expect(close).toHaveBeenCalledTimes(1)
	})
	it("retains rejected drafts and honors Ctrl-C Ctrl-K without closing pending work", async () => {
		const { request, close, resolve, note } = pending()
		fireEvent.change(note, { target: { value: "keep me" } })
		fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		fireEvent.keyDown(note, { ctrlKey: true, key: "c" })
		// While busy, finishing is locked but prefixed abort remains available.
		fireEvent.keyDown(note, { ctrlKey: true, key: "k" })
		expect(request.abort).toHaveBeenCalled()
		await act(async () => resolve({ kind: "rejected", reason: "cancelled before commit" }))
		expect(close).not.toHaveBeenCalled()
		expect(note.value).toBe("keep me")
		expect(note.readOnly).toBe(false)
		expect(within(screen.getByRole("group", { name: "TODO note" })).getByRole("status")).toBeVisible()
		await act(async () => {
			fireEvent.keyDown(note, { ctrlKey: true, key: "c" })
			fireEvent.keyDown(note, { ctrlKey: true, key: "k" })
		})
		await act(async () => {
			fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close tool" }))
		})
		expect(close).toHaveBeenCalledTimes(1)
	})
	it("closes an explicitly aborted outcome only after settlement", async () => {
		const { close, resolve, note } = pending()
		fireEvent.change(note, { target: { value: "discard me" } })
		fireEvent.click(screen.getByRole("button", { name: "Finish note" }))
		fireEvent.click(screen.getByRole("button", { name: "Abort note" }))
		expect(close).not.toHaveBeenCalled()
		expect(note.value).toBe("discard me")
		await act(async () => resolve({ kind: "aborted" }))
		expect(close).toHaveBeenCalledTimes(1)
	})
	it("keeps literal dirty text and source authority when tool dismissal is cancelled", async () => {
		const execute = vi.fn((): OrgTodoNoteResult => ({ kind: "applied" }))
		const abort = vi.fn(), close = vi.fn()
		render(<OrgTodoNote request={{ execute, abort }} onClose={close} />)
		const note = screen.getByRole("textbox")
		fireEvent.change(note, { target: { value: "literal\n:END:\n* retained note" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abort note" })) })
		await act(async () => {
			fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep draft" }))
		})
		await waitFor(() => expect(note).toHaveFocus())
		expect(note).toHaveValue("literal\n:END:\n* retained note")
		expect(execute).not.toHaveBeenCalled()
		expect(abort).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
	})
	it("invalidates a close approval when the originating window retires without losing its copyable draft", async () => {
		let valid = true
		const request: OrgTodoNoteRequest = {
			validate: () => valid ? { kind: "ready" } : { kind: "rejected", reason: "Origin window retired" },
			execute: vi.fn((): OrgTodoNoteResult => ({ kind: "applied" })),
			abort: vi.fn(),
		}
		const close = vi.fn()
		const mounted = render(<OrgTodoNote request={request} onClose={close} />)
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "copy me" } })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abort note" })) })
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		valid = false
		mounted.rerender(<OrgTodoNote request={request} onClose={close} />)
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		expect(screen.getByRole("textbox")).toHaveValue("copy me")
		expect(screen.getByRole("textbox")).toHaveAttribute("readonly")
		expect(request.abort).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
	})
	it("polls a stale lease without source renders and stops on unmount", () => {
		vi.useFakeTimers()
		let valid = true
		const validate = vi.fn(
			(): OrgTodoNoteResult =>
				valid ? { kind: "ready" } : { kind: "rejected", reason: "stale review" },
		)
		const request = {
			validate,
			execute: vi.fn((): OrgTodoNoteResult => ({ kind: "applied" })),
			abort: vi.fn(),
		}
		const mounted = render(<OrgTodoNote request={request} onClose={vi.fn()} />)
		const note = screen.getByRole("textbox") as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "review me" } })
		valid = false
		act(() => vi.advanceTimersByTime(250))
		expect(note.readOnly).toBe(true)
		expect(note.value).toBe("review me")
		expect(within(screen.getByRole("group", { name: "TODO note" })).getByRole("status")).toBeVisible()
		mounted.unmount()
		const calls = validate.mock.calls.length
		act(() => vi.advanceTimersByTime(1000))
		expect(validate).toHaveBeenCalledTimes(calls)
	})
	it("keeps native copy priority and fences consumed, IME and repeated commands", () => {
		const execute = vi.fn((): OrgTodoNoteResult => ({ kind: "applied" }))
		const abort = vi.fn()
		render(<OrgTodoNote request={{ execute, abort }} onClose={vi.fn()} />)
		const note = screen.getByRole("textbox") as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "copy" } })
		for (const guard of [{ repeat: true }, { isComposing: true }, { keyCode: 229 }]) {
			for (const key of ["s", "g"]) {
				if ("repeat" in guard) {
					const down = createEvent.keyDown(note, { bubbles: true, cancelable: true, ctrlKey: true, key })
					down.preventDefault()
					fireEvent(note, down)
				}
				fireEvent.keyDown(note, { ctrlKey: true, key, ...guard })
				fireEvent.keyUp(window, { key, ...("keyCode" in guard ? { keyCode: guard.keyCode } : {}) })
			}
		}
		const consumed = createEvent.keyDown(note, { ctrlKey: true, key: "s" })
		consumed.preventDefault()
		fireEvent(note, consumed)
		fireEvent.keyUp(window, { key: "s" })
		fireEvent.compositionStart(note)
		fireEvent.keyDown(note, { metaKey: true, key: "s" })
		fireEvent.keyUp(window, { key: "s" })
		fireEvent.keyDown(note, { ctrlKey: true, key: "g" })
		fireEvent.keyUp(window, { key: "g" })
		fireEvent.compositionEnd(note)
		expect(execute).not.toHaveBeenCalled()
		expect(abort).not.toHaveBeenCalled()
		note.setSelectionRange(0, 4)
		const copy = createEvent.keyDown(note, {
			ctrlKey: true,
			key: "c",
			repeat: true,
			isComposing: true,
		})
		fireEvent(note, copy)
		expect(copy.defaultPrevented).toBe(false)
	})
})
