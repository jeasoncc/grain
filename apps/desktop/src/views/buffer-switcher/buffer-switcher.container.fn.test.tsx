import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { EditorTab } from "@/types/editor-tab"
import { BufferSwitcherContainer } from "./buffer-switcher.container.fn"

describe("BufferSwitcherContainer", () => {
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
			isDirty: false,
			nodeId: "node-2",
			title: "Document 2",
			type: "file",
			workspaceId: "workspace-1",
		},
		{
			id: "tab-3",
			isDirty: false,
			nodeId: "node-3",
			title: "Document 3",
			type: "file",
			workspaceId: "workspace-1",
		},
	]

	const defaultProps = {
		activeTabId: "tab-1",
		initialDirection: "forward" as const,
		onOpenChange: vi.fn(),
		onSelectTab: vi.fn(),
		open: true,
		tabs: mockTabs,
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("should render with tabs", () => {
		render(<BufferSwitcherContainer {...defaultProps} />)

		expect(screen.getByText("Document 1")).toBeInTheDocument()
		expect(screen.getByText("Document 2")).toBeInTheDocument()
		expect(screen.getByText("Document 3")).toBeInTheDocument()
	})

	it("should initialize selected index to next tab when direction is forward", async () => {
		render(<BufferSwitcherContainer {...defaultProps} />)

		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			// Should select tab-2 (index 1) since active is tab-1 (index 0) and direction is forward
			expect(buttons[1]).toHaveClass("bg-accent")
		})
	})

	it("should initialize selected index to previous tab when direction is backward", async () => {
		render(<BufferSwitcherContainer {...defaultProps} initialDirection="backward" />)

		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			// Should select tab-3 (index 2) since active is tab-1 (index 0) and direction is backward
			expect(buttons[2]).toHaveClass("bg-accent")
		})
	})

	it("should handle Ctrl+Tab to move forward", async () => {
		render(<BufferSwitcherContainer {...defaultProps} />)

		// Wait for initial selection
		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			expect(buttons[1]).toHaveClass("bg-accent")
		})

		// Simulate Ctrl+Tab
		fireEvent.keyDown(window, { ctrlKey: true, key: "Tab" })

		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			// Should move to tab-3 (index 2)
			expect(buttons[2]).toHaveClass("bg-accent")
		})
	})

	it("should handle Ctrl+Shift+Tab to move backward", async () => {
		render(<BufferSwitcherContainer {...defaultProps} />)

		// Wait for initial selection
		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			expect(buttons[1]).toHaveClass("bg-accent")
		})

		// Simulate Ctrl+Shift+Tab
		fireEvent.keyDown(window, { ctrlKey: true, key: "Tab", shiftKey: true })

		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			// Should move to tab-1 (index 0)
			expect(buttons[0]).toHaveClass("bg-accent")
		})
	})

	it("should wrap around when moving forward past last tab", async () => {
		render(<BufferSwitcherContainer {...defaultProps} activeTabId="tab-3" />)

		// Wait for initial selection (should be tab-1, wrapping around)
		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			expect(buttons[0]).toHaveClass("bg-accent")
		})
	})

	it("should wrap around when moving backward past first tab", async () => {
		render(
			<BufferSwitcherContainer {...defaultProps} activeTabId="tab-1" initialDirection="backward" />,
		)

		// Wait for initial selection (should be tab-3, wrapping around)
		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			expect(buttons[2]).toHaveClass("bg-accent")
		})
	})

	it("should call onSelectTab and close when Control key is released", async () => {
		const onSelectTab = vi.fn()
		const onOpenChange = vi.fn()

		render(
			<BufferSwitcherContainer
				{...defaultProps}
				onSelectTab={onSelectTab}
				onOpenChange={onOpenChange}
			/>,
		)

		// Wait for initial selection
		await waitFor(() => {
			const buttons = screen.getAllByRole("button")
			expect(buttons[1]).toHaveClass("bg-accent")
		})

		// Simulate Control key release
		fireEvent.keyUp(window, { key: "Control" })

		await waitFor(() => {
			expect(onSelectTab).toHaveBeenCalledWith("tab-2")
			expect(onOpenChange).toHaveBeenCalledWith(false)
		})
	})

	it("should call onSelectTab and close when tab is clicked", () => {
		const onSelectTab = vi.fn()
		const onOpenChange = vi.fn()

		render(
			<BufferSwitcherContainer
				{...defaultProps}
				onSelectTab={onSelectTab}
				onOpenChange={onOpenChange}
			/>,
		)

		const firstTab = screen.getByText("Document 1")
		fireEvent.click(firstTab)

		expect(onSelectTab).toHaveBeenCalledWith("tab-1")
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it("should not handle keyboard events when closed", async () => {
		const onSelectTab = vi.fn()

		render(<BufferSwitcherContainer {...defaultProps} open={false} onSelectTab={onSelectTab} />)

		// Simulate Ctrl+Tab
		fireEvent.keyDown(window, { ctrlKey: true, key: "Tab" })

		// Simulate Control key release
		fireEvent.keyUp(window, { key: "Control" })

		// Should not call onSelectTab since dialog is closed
		expect(onSelectTab).not.toHaveBeenCalled()
	})

	it("should clean up event listeners on unmount", () => {
		const removeEventListenerSpy = vi.spyOn(window, "removeEventListener")

		const { unmount } = render(<BufferSwitcherContainer {...defaultProps} />)

		unmount()

		expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function))
		expect(removeEventListenerSpy).toHaveBeenCalledWith("keyup", expect.any(Function))
	})
})
