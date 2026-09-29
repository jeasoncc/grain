/**
 * StoryRightSidebarContainer 组件测试
 */

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StoryRightSidebarContainer } from "./story-right-sidebar.container.fn"

// Mock stores
let mockTabPosition: "right-sidebar" | "top" = "right-sidebar"

vi.mock("@/state/ui.state", () => ({
	useUIStore: vi.fn((selector) => selector({ tabPosition: mockTabPosition })),
}))

const mockTabs = [
	{
		id: "tab-1",
		isDirty: false,
		nodeId: "node-1",
		title: "Test File 1",
		type: "file" as const,
		workspaceId: "workspace-1",
	},
	{
		id: "tab-2",
		isDirty: false,
		nodeId: "node-2",
		title: "Test File 2",
		type: "file" as const,
		workspaceId: "workspace-2",
	},
]

vi.mock("@/state/editor-tabs.state", () => ({
	useActiveTab: () => mockTabs[0],
	useActiveTabId: () => "tab-1",
	useEditorTabsStore: Object.assign(vi.fn(), {
		getState: () => ({
			activeTabId: "tab-1",
			editorStates: {},
			tabs: mockTabs,
		}),
	}),
	useTabs: () => mockTabs,
}))

describe("StoryRightSidebarContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockTabPosition = "right-sidebar"
	})

	it("should render with workspace tabs", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-1" />)
		expect(screen.getByText("Open Tabs")).toBeInTheDocument()
		expect(screen.getByText("Test File 1")).toBeInTheDocument()
	})

	it("should filter tabs by workspaceId", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-1" />)
		expect(screen.getByText("Test File 1")).toBeInTheDocument()
		expect(screen.queryByText("Test File 2")).not.toBeInTheDocument()
	})

	it("should display correct tab count for workspace", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-1" />)
		expect(screen.getByText("1")).toBeInTheDocument()
	})

	it("should not render when tabPosition is top", () => {
		mockTabPosition = "top"

		render(<StoryRightSidebarContainer workspaceId="workspace-1" />)
		expect(screen.queryByText("Open Tabs")).not.toBeInTheDocument()
	})

	it("should not render when workspace has no tabs", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-3" />)
		expect(screen.queryByText("Open Tabs")).not.toBeInTheDocument()
	})

	it("should pass correct props to view component", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-1" />)
		// The component should render with the filtered tabs
		expect(screen.getByText("Open Tabs")).toBeInTheDocument()
		expect(screen.getByText("Test File 1")).toBeInTheDocument()
		const tab = screen.getByText("Test File 1").closest('[role="button"]')
		expect(tab).toHaveClass("bg-primary/10") // Active tab styling
	})
})
