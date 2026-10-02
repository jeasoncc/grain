import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { OrgNavigationPicker } from "./org-navigation-picker.view.fn"

const candidates = [{ id: "uuid", relativePath: "folder/note.org", value: 1 }]
const props = {
	candidates,
	open: true,
	sessionKey: "one",
	label: "Picker",
	inputLabel: "Find",
	placeholder: "Find…",
	emptyMessage: "Empty",
	errorMessage: "Failed",
	onOpenChange: vi.fn(),
	onSelect: vi.fn(() => true),
}

describe("OrgNavigationPicker", () => {
	describe.each(["synthetic", "native"] as const)("%s capture consumption", (consumption) => {
		it.each([
			{ key: "Enter" },
			{ key: "Escape" },
			{ key: "g", ctrlKey: true },
			{ key: "Tab" },
			{ key: "ArrowDown" },
			{ key: "ArrowUp" },
			{ key: "n", ctrlKey: true },
			{ key: "p", ctrlKey: true },
		])("ignores a previously consumed $key (ctrl: $ctrlKey)", async (command) => {
			const origin = document.createElement("button")
			document.body.append(origin)
			origin.focus()
			const onSelect = vi.fn(
				(_value: number, _signal?: AbortSignal) => new Promise<boolean>(() => {}),
			)
			const onOpenChange = vi.fn()
			let consume = false
			render(
				<div
					onKeyDownCapture={(event) => {
						if (!consume) return
						if (consumption === "synthetic") event.preventDefault()
						else event.nativeEvent.preventDefault()
					}}
				>
					<OrgNavigationPicker
						{...props}
						candidates={[
							...candidates,
							{ id: "two", relativePath: "folder/note2.org", value: 2 },
							{ id: "three", relativePath: "folder/note3.org", value: 3 },
						]}
						onSelect={onSelect}
						onOpenChange={onOpenChange}
					/>
				</div>,
			)
			const input = screen.getByRole("combobox")
			fireEvent.change(input, { target: { value: "note" } })
			fireEvent.keyDown(input, { key: "ArrowDown" })
			const selected = input.getAttribute("aria-activedescendant")
			const restoreFocus = vi.spyOn(origin, "focus")
			consume = true
			await act(async () => fireEvent.keyDown(input, command))
			expect(onSelect).not.toHaveBeenCalled()
			expect(onOpenChange).not.toHaveBeenCalled()
			expect(input).toHaveValue("note")
			expect(input).toHaveAttribute("aria-activedescendant", selected)
			expect(input).toHaveFocus()
			expect(restoreFocus).not.toHaveBeenCalled()

			// Cancellation must also leave an existing request alive, not just avoid selection.
			consume = false
			fireEvent.keyDown(input, { key: "Enter" })
			const signal = onSelect.mock.calls[0]?.[1]
			consume = true
			await act(async () => fireEvent.keyDown(input, command))
			expect(onSelect).toHaveBeenCalledTimes(1)
			expect(signal?.aborted).toBe(false)
			expect(onOpenChange).not.toHaveBeenCalled()
			expect(input).toHaveValue("note")
			expect(input).toHaveAttribute("aria-activedescendant", selected)
			expect(input).toHaveFocus()
			expect(restoreFocus).not.toHaveBeenCalled()
			restoreFocus.mockRestore()
			origin.remove()
		})
	})

	it("completes the source path without accepting and retains origin focus only on a current-generation error", async () => {
		const origin = document.createElement("button")
		document.body.append(origin)
		origin.focus()
		const onSelect = vi.fn(() => false)
		render(<OrgNavigationPicker {...props} onSelect={onSelect} />)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "Tab" })
		expect(input).toHaveValue("folder/note.org")
		expect(onSelect).not.toHaveBeenCalled()
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		expect(screen.getByRole("alert")).toHaveTextContent("Failed")
		expect(input).toHaveValue("folder/note.org")
		expect(origin).toHaveFocus()
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(1, expect.any(AbortSignal))
		origin.remove()
	})

	it("unmount aborts and prevents a late error from restoring old focus", async () => {
		const origin = document.createElement("button"),
			destination = document.createElement("button")
		document.body.append(origin, destination)
		origin.focus()
		let reject!: (error: Error) => void
		const onSelect = vi.fn(
			(_value: number, _signal?: AbortSignal) =>
				new Promise<boolean>((_, fail) => {
					reject = fail
				}),
		)
		const view = render(<OrgNavigationPicker {...props} onSelect={onSelect} />)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		view.unmount()
		destination.focus()
		expect(onSelect.mock.calls[0][1]?.aborted).toBe(true)
		await act(async () => reject(new Error("late")))
		expect(destination).toHaveFocus()
		origin.remove()
		destination.remove()
	})
})
