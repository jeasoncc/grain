/**
 * Export Dialog Container 组件测试
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExportDialogContainer } from "./export-dialog.container.fn"

// Mock actions
vi.mock("@/actions", () => ({
	exportAllAsync: vi.fn(() => Promise.resolve('{"data": "test"}')),
	exportAllAsZipAsync: vi.fn(() => Promise.resolve(new Blob(["test"]))),
	exportAsMarkdownAsync: vi.fn(() => Promise.resolve("# Test Markdown")),
	exportProject: vi.fn(() => Promise.resolve()),
}))

// Mock export functions
vi.mock("@/fn/export", () => ({
	triggerDownload: vi.fn(),
	triggerBlobDownload: vi.fn(),
}))

// Mock toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}))

describe("ExportDialogContainer", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		workspaceId: "workspace-1",
		workspaceTitle: "Test Workspace",
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should render with default props", () => {
		render(<ExportDialogContainer {...defaultProps} />)
		expect(screen.getByText("Export Workspace")).toBeInTheDocument()
	})

	it("should pass workspaceId to container", () => {
		render(<ExportDialogContainer {...defaultProps} />)
		expect(screen.getByText("Export Workspace")).toBeInTheDocument()
	})

	it("should handle format change", () => {
		render(<ExportDialogContainer {...defaultProps} />)

		const wordLabel = screen.getByText("Word").closest("label")
		if (wordLabel) {
			fireEvent.click(wordLabel)
		}

		// Format should be updated (reflected in export button text)
		expect(screen.getByRole("button", { name: /export word/i })).toBeInTheDocument()
	})

	it("should handle export for markdown format", async () => {
		const { exportAsMarkdownAsync } = await import("@/actions")
		const { triggerDownload } = await import("@/fn/export")
		const { toast } = await import("sonner")

		render(<ExportDialogContainer {...defaultProps} />)

		// Select markdown format
		const markdownLabel = screen.getByText("Markdown").closest("label")
		if (markdownLabel) {
			fireEvent.click(markdownLabel)
		}

		// Click export
		const exportButton = screen.getByRole("button", {
			name: /export markdown/i,
		})
		fireEvent.click(exportButton)

		await waitFor(() => {
			expect(exportAsMarkdownAsync).toHaveBeenCalledWith("workspace-1")
			expect(triggerDownload).toHaveBeenCalled()
			expect(toast.success).toHaveBeenCalledWith("Markdown export successful")
		})
	})

	it("should handle export for json format", async () => {
		const { exportAllAsync } = await import("@/actions")
		const { triggerDownload } = await import("@/fn/export")
		const { toast } = await import("sonner")

		render(<ExportDialogContainer {...defaultProps} />)

		// Select json format
		const jsonLabel = screen.getByText("JSON Backup").closest("label")
		if (jsonLabel) {
			fireEvent.click(jsonLabel)
		}

		// Click export
		const exportButton = screen.getByRole("button", {
			name: /export json backup/i,
		})
		fireEvent.click(exportButton)

		await waitFor(() => {
			expect(exportAllAsync).toHaveBeenCalled()
			expect(triggerDownload).toHaveBeenCalled()
			expect(toast.success).toHaveBeenCalledWith("JSON backup export successful")
		})
	})

	it("should handle export for zip format", async () => {
		const { exportAllAsZipAsync } = await import("@/actions")
		const { triggerBlobDownload } = await import("@/fn/export")
		const { toast } = await import("sonner")

		render(<ExportDialogContainer {...defaultProps} />)

		// Select zip format
		const zipLabel = screen.getByText("ZIP Archive").closest("label")
		if (zipLabel) {
			fireEvent.click(zipLabel)
		}

		// Click export
		const exportButton = screen.getByRole("button", {
			name: /export zip archive/i,
		})
		fireEvent.click(exportButton)

		await waitFor(() => {
			expect(exportAllAsZipAsync).toHaveBeenCalled()
			expect(triggerBlobDownload).toHaveBeenCalled()
			expect(toast.success).toHaveBeenCalledWith("ZIP archive export successful")
		})
	})

	it("should handle export for standard formats", async () => {
		const { exportProject } = await import("@/actions")
		const { toast } = await import("sonner")

		render(<ExportDialogContainer {...defaultProps} />)

		// PDF is default format
		const exportButton = screen.getByRole("button", { name: /export pdf/i })
		fireEvent.click(exportButton)

		await waitFor(() => {
			expect(exportProject).toHaveBeenCalledWith(
				"workspace-1",
				"pdf",
				expect.objectContaining({
					includeTitle: true,
					includeAuthor: true,
					includeChapterTitles: true,
					includeSceneTitles: false,
					pageBreakBetweenChapters: true,
				}),
			)
			expect(toast.success).toHaveBeenCalledWith("PDF export successful")
		})
	})

	it("should handle export errors", async () => {
		const { exportProject } = await import("@/actions")
		const { toast } = await import("sonner")

		vi.mocked(exportProject).mockRejectedValueOnce(new Error("Export failed"))

		render(<ExportDialogContainer {...defaultProps} />)

		const exportButton = screen.getByRole("button", { name: /export pdf/i })
		fireEvent.click(exportButton)

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Export failed")
		})
	})

	it("should close dialog after successful export", async () => {
		const onOpenChange = vi.fn()
		render(<ExportDialogContainer {...defaultProps} onOpenChange={onOpenChange} />)

		const exportButton = screen.getByRole("button", { name: /export pdf/i })
		fireEvent.click(exportButton)

		await waitFor(() => {
			expect(onOpenChange).toHaveBeenCalledWith(false)
		})
	})

	it("should show loading state during export", async () => {
		render(<ExportDialogContainer {...defaultProps} />)

		const exportButton = screen.getByRole("button", { name: /export pdf/i })
		fireEvent.click(exportButton)

		// Should show loading state briefly
		expect(screen.getByText("Exporting...")).toBeInTheDocument()
	})

	it("should handle options change", () => {
		render(<ExportDialogContainer {...defaultProps} />)

		const titleSwitch = screen.getByRole("switch", {
			name: /include book title/i,
		})
		fireEvent.click(titleSwitch)

		// Options should be updated (switch should be toggled)
		expect(titleSwitch).toHaveAttribute("data-state", "unchecked")
	})
})
