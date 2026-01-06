/**
 * Tag Graph Panel View Tests - 标签关系图谱面板展示组件测试
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TagGraphPanelViewProps } from "./tag-graph-panel.types";
import { TagGraphPanelView } from "./tag-graph-panel.view.fn";

describe("TagGraphPanelView", () => {
	const mockGraphData = {
		nodes: [
			{ id: "1", name: "Tag1", count: 5 },
			{ id: "2", name: "Tag2", count: 3 },
		],
		edges: [{ source: "1", target: "2", weight: 2 }],
	};

	const defaultProps: TagGraphPanelViewProps = {
		workspaceId: "workspace-1",
		graphData: mockGraphData,
	};

	it("should render canvas when workspace and data are provided", () => {
		const { container } = render(<TagGraphPanelView {...defaultProps} />);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("should show message when no workspace is selected", () => {
		render(<TagGraphPanelView workspaceId={null} graphData={mockGraphData} />);
		expect(
			screen.getByText("Please select a workspace first"),
		).toBeInTheDocument();
	});

	it("should show message when no graph data is available", () => {
		render(<TagGraphPanelView workspaceId="workspace-1" graphData={null} />);
		expect(screen.getByText("No tag data available")).toBeInTheDocument();
	});

	it("should show message when graph data has no nodes", () => {
		render(
			<TagGraphPanelView
				workspaceId="workspace-1"
				graphData={{ nodes: [], edges: [] }}
			/>,
		);
		expect(screen.getByText("No tag data available")).toBeInTheDocument();
	});

	it("should render zoom controls", () => {
		render(<TagGraphPanelView {...defaultProps} />);
		// Check for zoom buttons by their icons
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThanOrEqual(3); // Zoom in, zoom out, reset
	});

	it("should display scale percentage", () => {
		render(<TagGraphPanelView {...defaultProps} />);
		expect(screen.getByText("100%")).toBeInTheDocument();
	});
});
