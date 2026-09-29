import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ExportButtonViewProps } from "./export-button.types"
import { ExportButtonView } from "./export-button.view.fn"

describe("ExportButtonView", () => {
	const defaultProps: ExportButtonViewProps = {
		isExporting: false,
		onExport: vi.fn(),
	}

	it("should render export button", () => {
		render(<ExportButtonView {...defaultProps} />)
		expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument()
	})

	it("should show 'Exporting...' when isExporting is true", () => {
		render(<ExportButtonView {...defaultProps} isExporting={true} />)
		expect(screen.getByRole("button", { name: /exporting/i })).toBeInTheDocument()
	})

	it("should disable button when isExporting is true", () => {
		render(<ExportButtonView {...defaultProps} isExporting={true} />)
		expect(screen.getByRole("button", { name: /exporting/i })).toBeDisabled()
	})

	it("should call onExport when format is selected", async () => {
		const onExport = vi.fn()
		render(<ExportButtonView {...defaultProps} onExport={onExport} />)

		// Radix opens dropdown menus on primary pointer down.
		const button = screen.getByRole("button", { name: /export/i })
		fireEvent.pointerDown(button, { button: 0, ctrlKey: false })

		const txtOption = await screen.findByText(/plain text/i)
		fireEvent.click(txtOption)

		expect(onExport).toHaveBeenCalledWith("txt")
	})

	it("should render all export format options", async () => {
		render(<ExportButtonView {...defaultProps} />)

		const button = screen.getByRole("button", { name: /export/i })
		fireEvent.pointerDown(button, { button: 0, ctrlKey: false })

		// Check all formats are present
		expect(await screen.findByText(/plain text/i)).toBeInTheDocument()
		expect(screen.getByText(/word document/i)).toBeInTheDocument()
		expect(screen.getByText(/pdf document/i)).toBeInTheDocument()
		expect(screen.getByText(/e-book/i)).toBeInTheDocument()
	})

	it("should disable format options when isExporting is true", async () => {
		render(<ExportButtonView {...defaultProps} isExporting={true} />)

		const button = screen.getByRole("button", { name: /exporting/i })
		fireEvent.pointerDown(button, { button: 0, ctrlKey: false })

		const options = await screen.findAllByRole("menuitem")
		expect(options).toHaveLength(4)
		for (const option of options) {
			expect(option).toHaveAttribute("data-disabled")
			expect(option).toHaveAttribute("aria-disabled", "true")
		}
	})

	it("should apply custom variant prop", () => {
		render(<ExportButtonView {...defaultProps} variant="outline" />)
		const button = screen.getByRole("button", { name: /export/i })
		// Check that button has border class which is part of outline variant
		expect(button).toHaveClass("border")
	})

	it("should apply custom className", () => {
		render(<ExportButtonView {...defaultProps} className="custom-class" />)
		const button = screen.getByRole("button", { name: /export/i })
		expect(button).toHaveClass("custom-class")
	})
})
