/**
 * StoryRightSidebarView 组件测试
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StoryRightSidebarViewProps } from "./story-right-sidebar.types";
import { StoryRightSidebarView } from "./story-right-sidebar.view.fn";

describe("StoryRightSidebarView", () => {
	const mockTabs = [
		{
			id: "tab-1",
			title: "Test File 1",
			type: "file" as const,
			nodeId: "node-1",
			workspaceId: "workspace-1",
			isDirty: false,
		},
		{
			id: "tab-2",
			title: "Test Diary",
			type: "diary" as const,
			nodeId: "node-2",
			workspaceId: "workspace-1",
			isDirty: true,
		},
		{
			id: "tab-3",
			title: "Test Drawing",
			type: "drawing" as const,
			nodeId: "node-3",
			workspaceId: "workspace-1",
			isDirty: false,
		},
	];

	const defaultProps: StoryRightSidebarViewProps = {
		tabPosition: "right-sidebar",
		tabs: mockTabs,
		activeTabId: "tab-1",
		onSetActiveTab: vi.fn(),
		onCloseTab: vi.fn(),
	};

	it("should render when tabPosition is right-sidebar", () => {
		render(<StoryRightSidebarView {...defaultProps} />);
		expect(screen.getByText("Open Tabs")).toBeInTheDocument();
	});

	it("should not render when tabPosition is top", () => {
		render(<StoryRightSidebarView {...defaultProps} tabPosition="top" />);
		expect(screen.queryByText("Open Tabs")).not.toBeInTheDocument();
	});

	it("should not render when tabs array is empty", () => {
		render(<StoryRightSidebarView {...defaultProps} tabs={[]} />);
		expect(screen.queryByText("Open Tabs")).not.toBeInTheDocument();
	});

	it("should display tab count", () => {
		render(<StoryRightSidebarView {...defaultProps} />);
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("should render all tabs", () => {
		render(<StoryRightSidebarView {...defaultProps} />);
		expect(screen.getByText("Test File 1")).toBeInTheDocument();
		expect(screen.getByText("Test Diary")).toBeInTheDocument();
		expect(screen.getByText("Test Drawing")).toBeInTheDocument();
	});

	it("should show dirty indicator for unsaved tabs", () => {
		render(<StoryRightSidebarView {...defaultProps} />);
		const diaryTab = screen.getByText("Test Diary").closest("button");
		expect(diaryTab?.textContent).toContain("●");
	});

	it("should call onSetActiveTab when tab is clicked", () => {
		const onSetActiveTab = vi.fn();
		render(
			<StoryRightSidebarView
				{...defaultProps}
				onSetActiveTab={onSetActiveTab}
			/>,
		);

		const tab2 = screen.getByText("Test Diary").closest("button");
		if (tab2) {
			fireEvent.click(tab2);
		}
		expect(onSetActiveTab).toHaveBeenCalledWith("tab-2");
	});

	it("should call onCloseTab when close button is clicked", () => {
		const onCloseTab = vi.fn();
		render(<StoryRightSidebarView {...defaultProps} onCloseTab={onCloseTab} />);

		const tab1 = screen.getByText("Test File 1").closest("button");
		if (tab1) {
			// Find the close button within the tab
			const closeButtons = tab1.querySelectorAll("button");
			const closeButton = Array.from(closeButtons).find((btn) => btn !== tab1);
			if (closeButton) {
				fireEvent.click(closeButton);
			}
		}
		expect(onCloseTab).toHaveBeenCalledWith("tab-1");
	});

	it("should highlight active tab", () => {
		render(<StoryRightSidebarView {...defaultProps} activeTabId="tab-2" />);
		const activeTab = screen.getByText("Test Diary").closest("button");
		expect(activeTab).toHaveClass("bg-primary/10");
	});

	it("should render correct icon for file type", () => {
		render(<StoryRightSidebarView {...defaultProps} />);
		const tab1 = screen.getByText("Test File 1").closest("button");
		expect(tab1?.querySelector("svg")).toBeInTheDocument();
	});

	it("should render correct icon for diary type", () => {
		render(<StoryRightSidebarView {...defaultProps} />);
		const tab2 = screen.getByText("Test Diary").closest("button");
		expect(tab2?.querySelector("svg")).toBeInTheDocument();
	});

	it("should render correct icon for drawing type", () => {
		render(<StoryRightSidebarView {...defaultProps} />);
		const tab3 = screen.getByText("Test Drawing").closest("button");
		expect(tab3?.querySelector("svg")).toBeInTheDocument();
	});
});
