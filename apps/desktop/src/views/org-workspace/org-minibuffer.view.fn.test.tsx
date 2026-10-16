import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { OrgMinibuffer, type OrgMinibufferSession } from "./org-minibuffer.view.fn"

const makeSession = (overrides: Partial<OrgMinibufferSession> = {}): OrgMinibufferSession => ({
	id: 1,
	prompt: "Tags:",
	initialInput: "",
	candidates: ["grain", "work", "writing"],
	onAccept: vi.fn(() => ({ ok: true as const })),
	onCancel: vi.fn(),
	...overrides,
})

const deferredAccept = () => {
	let resolve!: (result: { ok: true } | { ok: false; message: string }) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<{ ok: true } | { ok: false; message: string }>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}

describe("Org minibuffer", () => {
	it("accepts a first native repeat-flagged Enter but cannot accept the next phase while held", () => {
		const first = makeSession()
		const { rerender } = render(<OrgMinibuffer session={first} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter", repeat: true })
		expect(first.onAccept).toHaveBeenCalledOnce()
		const next = makeSession({ id: 2, initialInput: "(file root)" })
		rerender(<OrgMinibuffer session={next} />)
		expect(fireEvent.keyDown(input, { key: "Enter", repeat: true })).toBe(false)
		expect(next.onAccept).not.toHaveBeenCalled()
		fireEvent.keyUp(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Enter", repeat: true })
		expect(next.onAccept).toHaveBeenCalledExactlyOnceWith("(file root)")
	})

	it.each([
		0, 1,
	])("accepts single click detail %s but ignores a double click across sessions", (detail) => {
		const first = makeSession()
		const { rerender } = render(<OrgMinibuffer session={first} />)
		const button = screen.getByRole("button", { name: "Confirm minibuffer" })
		fireEvent.click(button, { detail })
		expect(first.onAccept).toHaveBeenCalledOnce()
		const next = makeSession({ id: 2 })
		rerender(<OrgMinibuffer session={next} />)
		fireEvent.click(button, { detail: 2 })
		expect(next.onAccept).not.toHaveBeenCalled()
		fireEvent.click(button, { detail: 1 })
		expect(next.onAccept).toHaveBeenCalledOnce()
	})

	it.each(["react", "native"])("ignores keys already consumed by the %s stage", (stage) => {
		let consumed = false
		const first = makeSession({ initialInput: "writing" })
		const wrap = (session: OrgMinibufferSession) => (
			<div
				onKeyDownCapture={(event) => {
					if (consumed && stage === "react") event.preventDefault()
				}}
			>
				<button type="button">Outside</button>
				<OrgMinibuffer session={session} />
			</div>
		)
		const { rerender } = render(wrap(first))
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter" })
		const next = makeSession({ id: 2 })
		rerender(wrap(next))
		consumed = true
		input.addEventListener("keydown", (event) => {
			if (stage === "native") event.preventDefault()
		})
		const outside = screen.getByRole("button", { name: "Outside" })
		outside.focus()
		for (const key of [
			{ key: "Enter" },
			{ key: "Escape" },
			{ key: "g", ctrlKey: true },
			{ key: "Tab" },
			{ key: "n", ctrlKey: true },
			{ key: "ArrowDown" },
			{ key: "p", altKey: true },
			{ key: "n", altKey: true },
		]) {
			fireEvent.keyDown(input, key)
			expect(input).toHaveValue("")
			expect(screen.getByRole("option", { name: "grain" })).toHaveAttribute("aria-selected", "true")
			expect(outside).toHaveFocus()
		}
		expect(next.onAccept).not.toHaveBeenCalled()
		expect(next.onCancel).not.toHaveBeenCalled()
	})

	it("allows repeated navigation and cancellation, but leaves IME and Shift-Tab native", () => {
		const session = makeSession()
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "ArrowDown", repeat: true })
		fireEvent.keyDown(input, { key: "n", ctrlKey: true, repeat: true })
		expect(screen.getByRole("option", { name: "writing" })).toHaveAttribute("aria-selected", "true")
		fireEvent.keyDown(input, { key: "ArrowUp", repeat: true })
		expect(screen.getByRole("option", { name: "work" })).toHaveAttribute("aria-selected", "true")
		expect(fireEvent.keyDown(input, { key: "Tab", shiftKey: true })).toBe(true)
		fireEvent.compositionStart(input)
		expect(fireEvent.keyDown(input, { key: "Enter", repeat: true })).toBe(true)
		fireEvent.compositionEnd(input)
		expect(fireEvent.keyDown(input, { key: "Enter", isComposing: true })).toBe(true)
		expect(fireEvent.keyDown(input, { key: "Enter", keyCode: 229 })).toBe(true)
		expect(session.onAccept).not.toHaveBeenCalled()
		fireEvent.keyDown(input, { key: "Escape", repeat: true })
		expect(session.onCancel).toHaveBeenCalledOnce()
	})

	it("does not replay a closed metadata acceptance from a detached held-key target", () => {
		const session = makeSession({ initialInput: "Private_Profile_No_File" })
		const { rerender } = render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter" })
		rerender(<OrgMinibuffer session={null} />)
		fireEvent.keyDown(input, { key: "Enter", repeat: true })
		fireEvent.keyDown(input, { key: "Escape" })
		expect(session.onAccept).toHaveBeenCalledExactlyOnceWith("Private_Profile_No_File")
		expect(session.onCancel).not.toHaveBeenCalled()
		expect(screen.queryByRole("combobox")).toBeNull()
	})

	it("locks input, candidates, and repeated Enter until deferred acceptance completes", async () => {
		const pending = deferredAccept()
		const session = makeSession({ onAccept: vi.fn(() => pending.promise) })
		const { rerender } = render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "gr" } })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Tab" })
		fireEvent.keyDown(input, { key: "n", ctrlKey: true })
		fireEvent.keyDown(input, { key: "p", altKey: true })
		fireEvent.change(input, { target: { value: "changed" } })
		fireEvent.click(screen.getByRole("option", { name: "grain" }))
		expect(session.onAccept).toHaveBeenCalledOnce()
		expect(input).toHaveValue("gr")
		expect(input).toHaveAttribute("readonly")
		expect(screen.getByRole("option", { name: "grain" })).toHaveAttribute("aria-selected", "true")
		await act(async () => pending.resolve({ ok: true }))
		expect(input).not.toHaveAttribute("readonly")
		rerender(<OrgMinibuffer session={makeSession({ id: 2 })} />)
		fireEvent.keyDown(input, { key: "p", altKey: true })
		expect(input).toHaveValue("gr")
	})

	it.each([
		"throw",
		"reject",
		"result",
	])("retains input for async/throw failure: %s", async (kind) => {
		const pending = deferredAccept()
		const session = makeSession({
			onAccept: () => {
				if (kind === "throw") throw new Error("Cannot commit")
				return pending.promise
			},
		})
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "draft" } })
		fireEvent.keyDown(input, { key: "Enter" })
		if (kind !== "throw") {
			await act(async () => {
				if (kind === "reject") pending.reject(new Error("Cannot commit"))
				else pending.resolve({ ok: false, message: "Cannot commit" })
			})
		}
		expect(input).toHaveValue("draft")
		expect(input).not.toHaveAttribute("readonly")
		expect(screen.getByRole("alert")).toHaveTextContent("Cannot commit")
		expect(session.onCancel).not.toHaveBeenCalled()
	})
	it("mediates native Enter rejection, correction, and pending acceptance through the shared result path", async () => {
		const pending = deferredAccept()
		const onAccept = vi.fn((value: string) => value === "write other.org"
			? { ok: false as const, message: "Captured Source only" }
			: pending.promise)
		const onKeyDown = vi.fn(() => false)
		const session = makeSession({
			initialInput: "write other.org", candidates: [], cancelWhileAccepting: false, onAccept,
			nativeInput: { bind: vi.fn(), onInput: vi.fn(), onKeyDown, onKeyUp: vi.fn(), selectValueOnOpen: false },
		})
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter" })
		expect(input).toHaveValue("write other.org")
		expect(screen.getByRole("alert")).toHaveTextContent("Captured Source only")
		fireEvent.change(input, { target: { value: "write" } })
		fireEvent.keyDown(input, { key: "Enter", repeat: true })
		expect(onAccept).toHaveBeenCalledTimes(1)
		fireEvent.keyDown(input, { key: "Enter" })
		expect(input).toHaveAttribute("readonly")
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Escape" })
		fireEvent.keyUp(input, { key: "ArrowUp" })
		expect(onAccept).toHaveBeenCalledTimes(2)
		expect(onKeyDown).toHaveBeenCalledTimes(2)
		expect(session.onCancel).not.toHaveBeenCalled()
		await act(async () => pending.resolve({ ok: false, message: "Save not acknowledged" }))
		expect(input).not.toHaveAttribute("readonly")
		expect(screen.getByRole("alert")).toHaveTextContent("Save not acknowledged")
	})


	it.each([
		"success",
		"reject",
	])("ignores late %s after same-id replacement, including history", async (kind) => {
		const pending = deferredAccept()
		const { rerender } = render(
			<OrgMinibuffer
				session={makeSession({ initialInput: "old", onAccept: () => pending.promise })}
			/>,
		)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		const replacement = makeSession({
			initialInput: "new",
			onAccept: () => ({ ok: false, message: "New error" }),
		})
		rerender(<OrgMinibuffer session={replacement} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter" })
		await act(async () => {
			if (kind === "success") pending.resolve({ ok: true })
			else pending.reject(new Error("Old error"))
		})
		expect(input).toHaveValue("new")
		expect(screen.getByRole("alert")).toHaveTextContent("New error")
		rerender(<OrgMinibuffer session={makeSession({ id: 2, initialInput: "draft" })} />)
		fireEvent.keyDown(input, { key: "p", altKey: true })
		expect(input).toHaveValue("draft")
	})

	it("does not unlock a newer acceptance when an older promise resolves", async () => {
		const old = deferredAccept()
		const current = deferredAccept()
		const { rerender } = render(
			<OrgMinibuffer session={makeSession({ onAccept: () => old.promise })} />,
		)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		const session = makeSession({
			id: 2,
			initialInput: "new",
			onAccept: vi.fn(() => current.promise),
		})
		rerender(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter" })
		await act(async () => old.resolve({ ok: true }))
		expect(input).toHaveAttribute("readonly")
		fireEvent.keyDown(input, { key: "Enter" })
		expect(session.onAccept).toHaveBeenCalledOnce()
		await act(async () => current.resolve({ ok: true }))
		expect(input).not.toHaveAttribute("readonly")
	})

	it.each(["close", "unmount", "cancel"])("ignores late rejection after %s", async (kind) => {
		const pending = deferredAccept()
		const session = makeSession({ onAccept: () => pending.promise })
		const { rerender, unmount } = render(<OrgMinibuffer session={session} />)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		if (kind === "unmount") unmount()
		else if (kind === "close") rerender(<OrgMinibuffer session={null} />)
		else {
			fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
			expect(session.onCancel).toHaveBeenCalledOnce()
		}
		await act(async () => pending.reject(new Error("Late error")))
		expect(screen.queryByRole("alert")).toBeNull()
	})

	it("blocks all cancellation paths only while an unsafe acceptance is pending", async () => {
		const pending = deferredAccept()
		const session = makeSession({ cancelWhileAccepting: false, onAccept: () => pending.promise })
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Enter" })
		fireEvent.keyDown(input, { key: "Escape" })
		fireEvent.keyDown(input, { key: "g", ctrlKey: true })
		const cancel = screen.getByRole("button", { name: "Cancel minibuffer" })
		expect(cancel).toBeDisabled()
		fireEvent.click(cancel)
		expect(session.onCancel).not.toHaveBeenCalled()
		await act(async () => pending.resolve({ ok: false, message: "Retry" }))
		expect(cancel).not.toBeDisabled()
		fireEvent.click(cancel)
		expect(session.onCancel).toHaveBeenCalledOnce()
	})

	it("focuses a bottom non-modal prompt and completes multiple tags", () => {
		const session = makeSession()
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox", { name: "Tags:" })
		expect(input).toHaveFocus()
		expect(screen.queryByRole("dialog")).toBeNull()
		fireEvent.change(input, { target: { value: "work gr" } })
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("work grain ")
		fireEvent.keyDown(input, { key: "Enter" })
		expect(session.onAccept).toHaveBeenCalledWith("work grain ")
	})

	it.each([
		["draft.org", [0, 5] as const, "renamed.org"],
		["notes/🐉draft.org", [6, 13] as const, "notes/renamed.org"],
	] as const)("replaces only the requested filename stem in %s", (initialInput, initialSelection, expected) => {
		const session = makeSession({ initialInput, initialSelection, candidates: [] })
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox") as HTMLInputElement
		expect(input).toHaveFocus()
		expect([input.selectionStart, input.selectionEnd]).toEqual(initialSelection)
		act(() => {
			input.setRangeText("renamed", input.selectionStart!, input.selectionEnd!, "end")
			fireEvent.input(input, { inputType: "insertText", data: "renamed" })
		})
		expect(input).toHaveValue(expected)
		fireEvent.keyDown(input, { key: "Enter" })
		expect(session.onAccept).toHaveBeenCalledExactlyOnceWith(expected)
	})

	it("preserves edits and user selection across same-session candidate and context refreshes", () => {
		const session = makeSession({
			initialInput: "notes/draft.org",
			initialSelection: [6, 11],
			description: "Rename notes/draft.org",
		})
		const { rerender } = render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox") as HTMLInputElement
		fireEvent.change(input, { target: { value: "notes/revised.org" } })
		input.setSelectionRange(8, 11)
		fireEvent.select(input)
		rerender(<OrgMinibuffer session={{
			...session,
			initialSelection: [0, 5],
			candidates: ["notes/revised.org"],
			description: "Captured file: notes/draft.org",
		}} />)
		expect(input).toHaveValue("notes/revised.org")
		expect([input.selectionStart, input.selectionEnd]).toEqual([8, 11])
		fireEvent.keyDown(input, { key: "Enter" })
		expect(session.onAccept).toHaveBeenCalledExactlyOnceWith("notes/revised.org")
	})

	it.each([undefined, false])("retains native open selection ownership with selectValueOnOpen=%s", (selectValueOnOpen) => {
		const initialInput = "write notes/draft.org"
		render(<OrgMinibuffer session={makeSession({
			initialInput,
			initialSelection: [6, 11],
			nativeInput: {
				bind: vi.fn(), onInput: vi.fn(), onKeyDown: () => false, onKeyUp: vi.fn(),
				selectValueOnOpen,
			},
		})} />)
		const input = screen.getByRole("combobox") as HTMLInputElement
		expect(input).toHaveValue(initialInput)
		expect(input).toHaveFocus()
		expect([input.selectionStart, input.selectionEnd]).toEqual([
			selectValueOnOpen === false ? initialInput.length : 0, initialInput.length,
		])
	})

	it("completes the token at the caret rather than the trailing token", () => {
		render(<OrgMinibuffer session={makeSession()} />)
		const input = screen.getByRole("combobox") as HTMLInputElement
		fireEvent.change(input, { target: { value: "wo grain" } })
		input.setSelectionRange(2, 2)
		fireEvent.select(input)
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("work grain")
		expect(fireEvent.keyDown(input, { key: "Tab", shiftKey: true })).toBe(true)
	})

	it("resets selection on caret-only changes and applies same-string completion selection", () => {
		render(<OrgMinibuffer session={makeSession({ initialInput: "work grain" })} />)
		const input = screen.getByRole("combobox") as HTMLInputElement
		input.setSelectionRange(0, 0)
		fireEvent.select(input)
		fireEvent.keyDown(input, { ctrlKey: true, key: "n" })
		input.setSelectionRange(4, 4)
		fireEvent.select(input)
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("work grain")
		expect(input.selectionStart).toBe(4)
		expect(screen.getByRole("option", { name: "work" })).toHaveAttribute("aria-selected", "true")
	})

	it("restores the current draft after browsing session history", () => {
		const { rerender } = render(<OrgMinibuffer session={makeSession()} />)
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "grain" } })
		fireEvent.keyDown(input, { key: "Enter" })
		rerender(<OrgMinibuffer session={makeSession({ id: 2 })} />)
		fireEvent.change(input, { target: { value: "draft" } })
		fireEvent.keyDown(input, { altKey: true, key: "p" })
		expect(input).toHaveValue("grain")
		fireEvent.keyDown(input, { altKey: true, key: "n" })
		expect(input).toHaveValue("draft")
	})

	it("supports whole-value completion without token separators", () => {
		render(
			<OrgMinibuffer
				session={makeSession({
					prompt: "Schedule:",
					completion: "value",
					initialInput: "2026",
					candidates: ["2026-09-30"],
				})}
			/>,
		)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("2026-09-30")
	})

	it("isolates command histories rather than offering tags as planning dates", () => {
		const { rerender } = render(<OrgMinibuffer session={makeSession({ historyKey: "tags" })} />)
		let input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "work" } })
		fireEvent.keyDown(input, { key: "Enter" })
		rerender(
			<OrgMinibuffer
				session={makeSession({
					id: 2,
					historyKey: "schedule",
					prompt: "Schedule:",
					completion: "value",
					initialInput: "2026-09-30",
				})}
			/>,
		)
		input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "p", altKey: true })
		expect(input).toHaveValue("2026-09-30")
		rerender(<OrgMinibuffer session={makeSession({ id: 3, historyKey: "tags" })} />)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "p", altKey: true })
		expect(screen.getByRole("combobox")).toHaveValue("work")
	})

	it("retains rejected input and shows the exact command error", () => {
		const session = makeSession({
			onAccept: () => ({ ok: false, message: "The Org content changed." }),
		})
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "grain" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(screen.getByRole("alert")).toHaveTextContent("The Org content changed.")
		expect(input).toHaveValue("grain")
		expect(session.onCancel).not.toHaveBeenCalled()
	})

	it("supports cancellation and avoids accepting during IME composition", () => {
		const session = makeSession()
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.compositionStart(input)
		fireEvent.keyDown(input, { key: "Enter" })
		expect(session.onAccept).not.toHaveBeenCalled()
		fireEvent.compositionEnd(input)
		fireEvent.keyDown(input, { ctrlKey: true, key: "g" })
		expect(session.onCancel).toHaveBeenCalledOnce()
	})

	it("uses C-n/C-p to select completion and preserves empty input", () => {
		const session = makeSession()
		render(<OrgMinibuffer session={session} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { ctrlKey: true, key: "n" })
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("work ")
		fireEvent.change(input, { target: { value: "" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(session.onAccept).toHaveBeenCalledWith("")
	})
})
