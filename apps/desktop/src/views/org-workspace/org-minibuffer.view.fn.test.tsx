import { fireEvent, render, screen } from "@testing-library/react"
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

describe("Org minibuffer", () => {
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
