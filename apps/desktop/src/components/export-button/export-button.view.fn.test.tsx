import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExportButtonView } from "./export-button.view.fn";
import type { ExportButtonViewProps } from "./export-button.types";

describe("ExportButtonView", () => {
	const defaultProps: ExportButtonViewProps = {
		isExporting: false,
		onExport: vi.fn(),
	};

	it("should render export button", () => {
		render(<ExportButtonView {...defaultProps} />);
		expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
	});

	it("should show 'Exporting...' when isExporting is true", () => {
		render(<ExportButtonView {...defaultProps} isExporting={true} />);
		expect(
			screen.getByRole("button", { name: /exporting/i }),
		).toBeInTheDocument();
	});

	it("should disable button when isExporting is true", () => {
		render(<ExportButtonView {...defaultProps} isExporting={true} />);
		expect(screen.getByRole("button", { name: /exporting/i })).toBeDisabled();
	});

	it("should call onExport when format is selected", async () => {
		const onExport = vi.fn();
		render(<ExportButtonView {...defaultProps} onExport={onExport} />);

		// Open dropdown
		const button = screen.getByRole("button", { name: /export/i });
		fireEvent.click(button);

		// Wait for dropdown to open and find format option
		const txtOption = await screen.findByText(/plain text/i);
		fireEvent.click(txtOption);

		expect(onExport).toHaveBeenCalledWith("txt");
	});

	it("should render all export format options", async () => {
		render(<ExportButtonView {...defaultProps} />);

		// Open dropdown
		const button = screen.getByRole("button", { name: /export/i });
		fireEvent.click(button);

		// Check all formats are present
		expect(await screen.findByText(/plain text/i)).toBeInTheDocument();
		expect(screen.getByText(/word document/i)).toBeInTheDocument();
		expect(screen.getByText(/pdf document/i)).toBeInTheDocument();
		expect(screen.getByText(/e-book/i)).toBeInTheDocument();
	});

	it("should disable format options when isExporting is true", async () => {
		render(<ExportButtonView {...defaultProps} isExporting={true} />);

		// Open dropdown
		const button = screen.getByRole("button", { name: /exporting/i });
		fireEvent.click(button);

		// Wait for dropdown to open
		const txtOption = await screen.findByText(/plain text/i);
		
		// All options should be disabled
		expect(txtOption.closest("div[role='menuitem']")).toHaveAttribute(
			"data-disabled",
			"true",
		);
	});

	it("should apply custom variant prop", () => {
		render(<ExportButtonView {...defaultProps} variant="outline" />);
		const button = screen.getByRole("button", { name: /export/i });
		// Check that button has border class which is part of outline variant
		expect(button).toHaveClass("border");
	});

	it("should apply custom className", () => {
		render(<ExportButtonView {...defaultProps} className="custom-class" />);
		const button = screen.getByRole("button", { name: /export/i });
		expect(button).toHaveClass("custom-class");
	});
});
