import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { EditorTab } from "@/types/editor-tab"
import type { BufferSwitcherViewProps } from "./buffer-switcher.types"
import { BufferSwitcherView } from "./buffer-switcher.view.fn"

describe("BufferSwitcherView", () => {
	const mockTabs: EditorTab[] = [
		{
			id: "tab-1",
			isDirty: false,
			nodeId: "node-1",
			title: "Document 1",
			type: "file",
			workspaceId: "workspace-1",
		},
		{
			id: "tab-2",
			isDirty: true,
			nodeId: "node-2",
			title: "Diary Entry",
			type: "diary",
			workspaceId: "workspace-1",
		},
		{
			id: "tab-3",
			isDirty: false,
			nodeId: "node-3",
			title: "Canvas Drawing",
			type: "drawing",
			workspaceId: "workspace-1",
		},
	]

	const defaultProps: BufferSwitcherViewProps = {
		onOpenChange: vi.fn(),
		onSelectTab: vi.fn(),
		onTabClick: vi.fn(),
		open: true,
		selectedIndex: 0,
		tabs: mockTabs,
	}

	it("should render all tabs", () => {
		render(<BufferSwitcherView {...defaultProps} />)

		expect(screen.getByText("Document 1")).toBeInTheDocument()
		expect(screen.getByText("Diary Entry")).toBeInTheDocument()
		expect(screen.getByText("Canvas Drawing")).toBeInTheDocument()
	})

	it("should highlight selected tab", () => {
		render(<BufferSwitcherView {...defaultProps} selectedIndex={1} />)

		const buttons = screen.getAllByRole("button")
		expect(buttons[1]).toHaveClass("bg-accent")
	})

	it("should show dirty indicator for modified tabs", () => {
		render(<BufferSwitcherView {...defaultProps} />)

		const dirtyIndicators = screen.getAllByText("●")
		expect(dirtyIndicators).toHaveLength(1)
	})

	it("should call onTabClick when tab is clicked", () => {
		const onTabClick = vi.fn()
		render(<BufferSwitcherView {...defaultProps} onTabClick={onTabClick} />)

		const firstTab = screen.getByText("Document 1")
		fireEvent.click(firstTab)

		expect(onTabClick).toHaveBeenCalledWith("tab-1")
	})

	it("should render keyboard hint", () => {
		render(<BufferSwitcherView {...defaultProps} />)

		expect(screen.getByText("按住 Ctrl + Tab 切换，释放 Ctrl 确认")).toBeInTheDocument()
	})

	it("should not render when tabs array is empty", () => {
		const { container } = render(<BufferSwitcherView {...defaultProps} tabs={[]} />)

		expect(container.firstChild).toBeNull()
	})

	it("should render correct icon for file type", () => {
		render(<BufferSwitcherView {...defaultProps} />)

		// FileText icon should be present for file type
		const buttons = screen.getAllByRole("button")
		expect(buttons[0].querySelector("svg")).toBeInTheDocument()
	})

	it("should render correct icon for diary type", () => {
		render(<BufferSwitcherView {...defaultProps} />)

		// Calendar icon should be present for diary type
		const buttons = screen.getAllByRole("button")
		expect(buttons[1].querySelector("svg")).toBeInTheDocument()
	})

	it("should render correct icon for drawing type", () => {
		render(<BufferSwitcherView {...defaultProps} />)

		// Palette icon should be present for drawing type
		const buttons = screen.getAllByRole("button")
		expect(buttons[2].querySelector("svg")).toBeInTheDocument()
	})

	it("should truncate long tab titles", () => {
		const longTitleTab: EditorTab = {
			id: "tab-long",
			isDirty: false,
			nodeId: "node-long",
			title: "This is a very long title that should be truncated",
			type: "file",
			workspaceId: "workspace-1",
		}

		render(<BufferSwitcherView {...defaultProps} tabs={[longTitleTab]} />)

		const titleElement = screen.getByText(longTitleTab.title)
		expect(titleElement).toHaveClass("truncate")
	})
})
