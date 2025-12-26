import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { ExportButtonContainer } from "./export-button.container.fn";
import type { ExportButtonContainerProps } from "./export-button.types";

// Mock dependencies
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("@/actions", () => ({
	exportProject: vi.fn(),
}));

describe("ExportButtonContainer", () => {
	const defaultProps: ExportButtonContainerProps = {
		workspaceId: "workspace-1",
		workspaceTitle: "Test Workspace",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render export button", () => {
		render(<ExportButtonContainer {...defaultProps} />);
		expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
	});

	it("should call exportProject and show success toast on successful export", async () => {
		const { exportProject } = await import("@/actions");
		vi.mocked(exportProject).mockResolvedValue(undefined);

		render(<ExportButtonContainer {...defaultProps} />);

		// Open dropdown and select format
		const button = screen.getByRole("button", { name: /export/i });
		fireEvent.click(button);

		const txtOption = await screen.findByText(/plain text/i);
		fireEvent.click(txtOption);

		await waitFor(() => {
			expect(exportProject).toHaveBeenCalledWith("workspace-1", "txt");
		});

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(
				"Export successful: Test Workspace.txt",
			);
		});
	});

	it("should show error toast on export failure", async () => {
		const { exportProject } = await import("@/actions");
		vi.mocked(exportProject).mockRejectedValue(new Error("Export failed"));

		render(<ExportButtonContainer {...defaultProps} />);

		// Open dropdown and select format
		const button = screen.getByRole("button", { name: /export/i });
		fireEvent.click(button);

		const pdfOption = await screen.findByText(/pdf document/i);
		fireEvent.click(pdfOption);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Export failed: Export failed");
		});
	});

	it("should show loading state during export", async () => {
		const { exportProject } = await import("@/actions");
		let resolveExport: () => void;
		const exportPromise = new Promise<void>((resolve) => {
			resolveExport = resolve;
		});
		vi.mocked(exportProject).mockReturnValue(exportPromise);

		render(<ExportButtonContainer {...defaultProps} />);

		// Open dropdown and select format
		const button = screen.getByRole("button", { name: /export/i });
		fireEvent.click(button);

		const docxOption = await screen.findByText(/word document/i);
		fireEvent.click(docxOption);

		// Should show loading state
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /exporting/i }),
			).toBeInTheDocument();
		});

		// Resolve export
		resolveExport!();

		// Should return to normal state
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /^export$/i }),
			).toBeInTheDocument();
		});
	});

	it("should use default workspace title when not provided", async () => {
		const { exportProject } = await import("@/actions");
		vi.mocked(exportProject).mockResolvedValue(undefined);

		render(
			<ExportButtonContainer
				workspaceId="workspace-1"
				workspaceTitle={undefined}
			/>,
		);

		// Open dropdown and select format
		const button = screen.getByRole("button", { name: /export/i });
		fireEvent.click(button);

		const epubOption = await screen.findByText(/e-book/i);
		fireEvent.click(epubOption);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith(
				"Export successful: workspace.epub",
			);
		});
	});

	it("should pass variant prop to view", () => {
		render(<ExportButtonContainer {...defaultProps} variant="outline" />);
		const button = screen.getByRole("button", { name: /export/i });
		// Check that button has border class which is part of outline variant
		expect(button).toHaveClass("border");
	});

	it("should pass className prop to view", () => {
		render(
			<ExportButtonContainer {...defaultProps} className="custom-class" />,
		);
		const button = screen.getByRole("button", { name: /export/i });
		expect(button).toHaveClass("custom-class");
	});
});
