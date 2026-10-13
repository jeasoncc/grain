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
	it("searches display labels and markers while preserving single-path ranks", () => {
		render(
			<OrgNavigationPicker
				{...props}
				candidates={[
					{
						id: "display",
						relativePath: "z.org",
						optionLabel: "Note label",
						markers: "Straße dirty",
						value: 3,
					},
					{ id: "prefix", relativePath: "notebook.org", value: 2 },
					{ id: "exact", relativePath: "note.org", value: 1 },
				]}
			/>,
		)
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "note" } })
		expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
			"note",
			"notebook",
			"Note labelStraße dirty",
		])
		fireEvent.change(input, { target: { value: "dirty STRASSE label" } })
		expect(screen.getAllByRole("option")).toHaveLength(1)
		expect(screen.getByRole("option", { name: "Note label" })).toHaveTextContent("Note label")
	})

	it("supports control-j/k and ignores held Enter even after a failed selection", async () => {
		const onSelect = vi.fn(() => false)
		render(
			<OrgNavigationPicker
				{...props}
				onSelect={onSelect}
				candidates={[...candidates, { id: "two", relativePath: "two.org", value: 2 }]}
			/>,
		)
		const input = screen.getByRole("combobox")
		fireEvent.keyDown(input, { key: "j", ctrlKey: true })
		expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true")
		fireEvent.keyDown(input, { key: "k", ctrlKey: true })
		expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true")
		await act(async () => fireEvent.keyDown(input, { key: "Enter", repeat: true }))
		expect(onSelect).not.toHaveBeenCalled()
		await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
		await act(async () => fireEvent.keyDown(input, { key: "Enter", repeat: true }))
		expect(onSelect).toHaveBeenCalledTimes(1)
	})

	it("exposes disabled reasons and checks current eligibility before and after acceptance", async () => {
		let resolve!: (value: boolean) => void
		const onSelect = vi.fn(
			() =>
				new Promise<boolean>((done) => {
					resolve = done
				}),
		)
		const onOpenChange = vi.fn()
		const disabled = [{ ...candidates[0], disabled: true, disabledReason: "Unavailable" }]
		const view = render(
			<OrgNavigationPicker
				{...props}
				candidates={disabled}
				onSelect={onSelect}
				onOpenChange={onOpenChange}
			/>,
		)
		const input = screen.getByRole("combobox")
		expect(screen.getByRole("option")).toBeDisabled()
		expect(screen.getByRole("option")).toHaveAccessibleDescription("Unavailable")
		fireEvent.keyDown(input, { key: "Enter" })
		expect(onSelect).not.toHaveBeenCalled()
		view.rerender(
			<OrgNavigationPicker {...props} onSelect={onSelect} onOpenChange={onOpenChange} />,
		)
		fireEvent.keyDown(input, { key: "Enter" })
		view.rerender(
			<OrgNavigationPicker
				{...props}
				candidates={disabled}
				onSelect={onSelect}
				onOpenChange={onOpenChange}
			/>,
		)
		await act(async () => resolve(true))
		expect(screen.getByRole("alert")).toHaveTextContent("Failed")
		expect(onOpenChange).not.toHaveBeenCalled()
	})

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
			{ key: "j", ctrlKey: true },
			{ key: "k", ctrlKey: true },
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
