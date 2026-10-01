import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { OrgCommandPalette, orgCommandIcons } from "./org-command-palette.view.fn"

describe("OrgCommandPalette minibuffer", () => {
	it("selects and executes a command without a modal", () => {
		const run = vi.fn()
		const onOpenChange = vi.fn()
		render(
			<OrgCommandPalette
				open
				onOpenChange={onOpenChange}
				commands={[{ icon: orgCommandIcons.agenda, label: "Open agenda", run }]}
			/>,
		)
		expect(screen.queryByRole("dialog")).toBeNull()
		fireEvent.click(screen.getByRole("option", { name: "Open agenda" }))
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		expect(run).toHaveBeenCalledOnce()
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
	it("executes the highlighted match from partial input", () => {
		const run = vi.fn()
		render(
			<OrgCommandPalette
				open
				onOpenChange={vi.fn()}
				commands={[{ icon: orgCommandIcons.agenda, label: "Open agenda", run }]}
			/>,
		)
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "agenda" } })
		fireEvent.keyDown(input, { key: "Enter" })
		expect(run).toHaveBeenCalledOnce()
	})
	it("rechecks disabled commands at execution and retains the prompt", () => {
		const run = vi.fn()
		const onOpenChange = vi.fn()
		const command = { icon: orgCommandIcons.save, label: "Save current note", run }
		const { rerender } = render(
			<OrgCommandPalette open onOpenChange={onOpenChange} commands={[command]} />,
		)
		rerender(
			<OrgCommandPalette
				open
				onOpenChange={onOpenChange}
				commands={[{ ...command, disabled: true }]}
			/>,
		)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		expect(run).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalled()
		expect(screen.getByRole("alert")).toHaveTextContent("unavailable")
	})
	it("cancels and restores origin focus without running a command", () => {
		const run = vi.fn()
		const origin = document.createElement("button")
		document.body.append(origin)
		origin.focus()
		const onOpenChange = vi.fn()
		render(
			<OrgCommandPalette
				open
				onOpenChange={onOpenChange}
				commands={[{ icon: orgCommandIcons.agenda, label: "Open agenda", run }]}
			/>,
		)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "g", ctrlKey: true })
		expect(origin).toHaveFocus()
		expect(run).not.toHaveBeenCalled()
		origin.remove()
	})
})
