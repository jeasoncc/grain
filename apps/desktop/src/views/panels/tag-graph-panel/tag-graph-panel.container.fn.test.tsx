/**
 * Tag Graph Panel Container Tests - 标签关系图谱面板容器组件测试
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TagGraphPanelContainer } from "./tag-graph-panel.container.fn"

// Mock hooks
vi.mock("@/hooks", () => ({
	useTagGraph: vi.fn(() => ({
		nodes: [
			{ id: "1", name: "Tag1", count: 5 },
			{ id: "2", name: "Tag2", count: 3 },
		],
		edges: [{ source: "1", target: "2", weight: 2 }],
	})),
}))

vi.mock("@/state/selection.state", () => ({
	useSelectionStore: vi.fn((selector) => selector({ selectedWorkspaceId: "workspace-1" })),
}))

describe("TagGraphPanelContainer", () => {
	it("should render and fetch data", () => {
		const { container } = render(<TagGraphPanelContainer />)
		// Should render canvas when data is available
		const canvas = container.querySelector("canvas")
		expect(canvas).toBeInTheDocument()
	})

	it("should handle null workspace", async () => {
		const { useSelectionStore } = await import("@/state/selection.state")
		vi.mocked(useSelectionStore).mockImplementation((selector: any) =>
			selector({ selectedWorkspaceId: null }),
		)

		render(<TagGraphPanelContainer />)
		expect(screen.getByText("Please select a workspace first")).toBeInTheDocument()
	})

	it("should handle empty graph data", async () => {
		const { useTagGraph } = await import("@/hooks")
		const { useSelectionStore } = await import("@/state/selection.state")

		// Reset to valid workspace but empty data
		vi.mocked(useSelectionStore).mockImplementation((selector: any) =>
			selector({ selectedWorkspaceId: "workspace-1" }),
		)
		vi.mocked(useTagGraph).mockReturnValue({ nodes: [], edges: [] })

		render(<TagGraphPanelContainer />)
		expect(screen.getByText("No tag data available")).toBeInTheDocument()
	})
})
