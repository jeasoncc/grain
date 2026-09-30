import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { OrgCommandPalette, orgCommandIcons } from "./org-command-palette.view.fn"

describe("OrgCommandPalette", () => {
	it("runs an enabled command and closes", () => {
		const run = vi.fn()
		const onOpenChange = vi.fn()
		render(
			<OrgCommandPalette
				open
				onOpenChange={onOpenChange}
				commands={[{ icon: orgCommandIcons.agenda, label: "Open agenda", run }]}
			/>,
		)
		fireEvent.click(screen.getByText("Open agenda"))
		expect(run).toHaveBeenCalledOnce()
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it("does not run a disabled command", () => {
		const run = vi.fn()
		render(
			<OrgCommandPalette
				open
				onOpenChange={vi.fn()}
				commands={[{ disabled: true, icon: orgCommandIcons.save, label: "Save current note", run }]}
			/>,
		)
		fireEvent.click(screen.getByText("Save current note"))
		expect(run).not.toHaveBeenCalled()
	})
})
