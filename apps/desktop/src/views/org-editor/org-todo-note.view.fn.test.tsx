import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { OrgTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import { OrgTodoNote } from "./org-todo-note.view.fn"

afterEach(() => {
	cleanup()
	vi.useRealTimers()
})

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
		expect(screen.getByRole("status").textContent).toContain("cancelled before commit")
		fireEvent.keyDown(note, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(note, { ctrlKey: true, key: "k" })
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
		expect(screen.getByRole("status").textContent).toContain("stale review")
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
			fireEvent.keyDown(note, { ctrlKey: true, key: "s", ...guard })
			fireEvent.keyDown(note, { ctrlKey: true, key: "g", ...guard })
		}
		const consumed = createEvent.keyDown(note, { ctrlKey: true, key: "s" })
		consumed.preventDefault()
		fireEvent(note, consumed)
		fireEvent.compositionStart(note)
		fireEvent.keyDown(note, { metaKey: true, key: "s" })
		fireEvent.keyDown(note, { ctrlKey: true, key: "g" })
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
