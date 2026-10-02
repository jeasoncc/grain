import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { OrgConfirmDialog, OrgInputDialog } from "./org-action-dialog.view.fn"

describe("Org action dialogs", () => {
	it("normalizes and submits a relative path", () => {
		const onSubmit = vi.fn()
		const onOpenChange = vi.fn()
		render(
			<OrgInputDialog
				open
				title="New Org document"
				description="Create a document"
				inputLabel="Relative path"
				defaultValue="notes.org"
				confirmLabel="Create"
				onOpenChange={onOpenChange}
				onSubmit={onSubmit}
			/>,
		)

		fireEvent.change(screen.getByLabelText("Relative path"), {
			target: { value: "  projects/plan.org  " },
		})
		fireEvent.click(screen.getByRole("button", { name: "Create" }))

		expect(onSubmit).toHaveBeenCalledWith("projects/plan.org")
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it("supports intentional empty values and keeps rejected input open", () => {
		const allowEmptySubmit = vi.fn()
		const allowEmptyOpenChange = vi.fn()
		const { rerender } = render(
			<OrgInputDialog
				open
				allowEmpty
				title="Tags"
				description="Tags"
				inputLabel="Tags"
				defaultValue="work"
				confirmLabel="Set"
				onOpenChange={allowEmptyOpenChange}
				onSubmit={allowEmptySubmit}
			/>,
		)
		fireEvent.change(screen.getByRole("textbox", { name: "Tags" }), { target: { value: " " } })
		fireEvent.click(screen.getByRole("button", { name: "Set" }))
		expect(allowEmptySubmit).toHaveBeenCalledWith("")
		expect(allowEmptyOpenChange).toHaveBeenCalledWith(false)

		const rejectedOpenChange = vi.fn()
		rerender(
			<OrgInputDialog
				open
				title="Date"
				description="Date"
				inputLabel="Date"
				defaultValue="invalid"
				confirmLabel="Set date"
				onOpenChange={rejectedOpenChange}
				onSubmit={() => false}
			/>,
		)
		fireEvent.click(screen.getByRole("button", { name: "Set date" }))
		expect(rejectedOpenChange).not.toHaveBeenCalled()
	})

	it("requires explicit confirmation for destructive actions", () => {
		const onConfirm = vi.fn()
		render(
			<OrgConfirmDialog
				open
				title="Delete document?"
				description="This cannot be undone."
				confirmLabel="Delete"
				destructive
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Delete" }))
		expect(onConfirm).toHaveBeenCalledOnce()
	})
})
