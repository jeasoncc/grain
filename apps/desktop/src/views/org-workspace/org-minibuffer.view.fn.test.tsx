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
