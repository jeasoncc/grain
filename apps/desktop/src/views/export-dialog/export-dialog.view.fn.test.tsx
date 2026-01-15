/**
 * Export Dialog View 组件测试
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { BookOpen, File, FileArchive, FileCode, FileJson, FileText, FileType } from "lucide-react"
import { describe, expect, it, vi } from "vitest"
import type { ExportDialogViewProps, ExtendedExportFormat } from "./export-dialog.types"
import { ExportDialogView } from "./export-dialog.view.fn"

describe("ExportDialogView", () => {
	const formatLabels: Record<ExtendedExportFormat, string> = {
		pdf: "PDF",
		docx: "Word",
		txt: "Text",
		epub: "EPUB",
		markdown: "Markdown",
		json: "JSON Backup",
		zip: "ZIP Archive",
	}

	const formatIcons: Record<ExtendedExportFormat, React.ReactNode> = {
		pdf: <FileText className="size-5 text-red-500" />,
		docx: <FileType className="size-5 text-blue-500" />,
		txt: <File className="size-5 text-gray-500" />,
		epub: <BookOpen className="size-5 text-green-500" />,
		markdown: <FileCode className="size-5 text-purple-500" />,
		json: <FileJson className="size-5 text-orange-500" />,
		zip: <FileArchive className="size-5 text-cyan-500" />,
	}

	const defaultProps: ExportDialogViewProps = {
		open: true,
		onOpenChange: vi.fn(),
		format: "pdf",
		onFormatChange: vi.fn(),
		options: {
			includeTitle: true,
			includeAuthor: true,
			includeChapterTitles: true,
			includeSceneTitles: false,
			pageBreakBetweenChapters: true,
		},
		onOptionsChange: vi.fn(),
		isExporting: false,
		onExport: vi.fn(),
		formatLabels,
		formatIcons,
	}

	it("should render dialog when open", () => {
		render(<ExportDialogView {...defaultProps} />)
		expect(screen.getByText("Export Workspace")).toBeInTheDocument()
	})

	it("should not render dialog when closed", () => {
		render(<ExportDialogView {...defaultProps} open={false} />)
		expect(screen.queryByText("Export Workspace")).not.toBeInTheDocument()
	})

	it("should render all format options", () => {
		render(<ExportDialogView {...defaultProps} />)
		expect(screen.getByText("PDF")).toBeInTheDocument()
		expect(screen.getByText("Word")).toBeInTheDocument()
		expect(screen.getByText("EPUB")).toBeInTheDocument()
		expect(screen.getByText("Text")).toBeInTheDocument()
		expect(screen.getByText("Markdown")).toBeInTheDocument()
		expect(screen.getByText("JSON Backup")).toBeInTheDocument()
		expect(screen.getByText("ZIP Archive")).toBeInTheDocument()
	})

	it("should call onFormatChange when format is selected", () => {
		const onFormatChange = vi.fn()
		render(<ExportDialogView {...defaultProps} onFormatChange={onFormatChange} />)

		const docxLabel = screen.getByText("Word").closest("label")
		if (docxLabel) {
			fireEvent.click(docxLabel)
		}

		expect(onFormatChange).toHaveBeenCalled()
	})

	it("should render export options for standard formats", () => {
		render(<ExportDialogView {...defaultProps} format="pdf" />)
		expect(screen.getByText("Include Book Title")).toBeInTheDocument()
		expect(screen.getByText("Include Author Name")).toBeInTheDocument()
		expect(screen.getByText("Include Chapter Titles")).toBeInTheDocument()
		expect(screen.getByText("Include Scene Titles")).toBeInTheDocument()
		expect(screen.getByText("Page Break Between Chapters")).toBeInTheDocument()
	})

	it("should not render export options for json format", () => {
		render(<ExportDialogView {...defaultProps} format="json" />)
		expect(screen.queryByText("Include Book Title")).not.toBeInTheDocument()
	})

	it("should not render export options for zip format", () => {
		render(<ExportDialogView {...defaultProps} format="zip" />)
		expect(screen.queryByText("Include Book Title")).not.toBeInTheDocument()
	})

	it("should call onOptionsChange when option is toggled", () => {
		const onOptionsChange = vi.fn()
		render(<ExportDialogView {...defaultProps} onOptionsChange={onOptionsChange} />)

		const titleSwitch = screen.getByRole("switch", {
			name: /include book title/i,
		})
		fireEvent.click(titleSwitch)

		expect(onOptionsChange).toHaveBeenCalled()
	})

	it("should call onExport when export button is clicked", () => {
		const onExport = vi.fn()
		render(<ExportDialogView {...defaultProps} onExport={onExport} />)

		const exportButton = screen.getByRole("button", { name: /export pdf/i })
		fireEvent.click(exportButton)

		expect(onExport).toHaveBeenCalled()
	})

	it("should disable buttons when exporting", () => {
		render(<ExportDialogView {...defaultProps} isExporting={true} />)

		const exportButton = screen.getByRole("button", { name: /exporting/i })
		const cancelButton = screen.getByRole("button", { name: /cancel/i })

		expect(exportButton).toBeDisabled()
		expect(cancelButton).toBeDisabled()
	})

	it("should show loading state when exporting", () => {
		render(<ExportDialogView {...defaultProps} isExporting={true} />)
		expect(screen.getByText("Exporting...")).toBeInTheDocument()
	})

	it("should call onOpenChange when cancel is clicked", () => {
		const onOpenChange = vi.fn()
		render(<ExportDialogView {...defaultProps} onOpenChange={onOpenChange} />)

		const cancelButton = screen.getByRole("button", { name: /cancel/i })
		fireEvent.click(cancelButton)

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it("should not show page break option for txt format", () => {
		render(<ExportDialogView {...defaultProps} format="txt" />)
		expect(screen.queryByText("Page Break Between Chapters")).not.toBeInTheDocument()
	})

	it("should not show page break option for markdown format", () => {
		render(<ExportDialogView {...defaultProps} format="markdown" />)
		expect(screen.queryByText("Page Break Between Chapters")).not.toBeInTheDocument()
	})
})
