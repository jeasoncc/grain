/**
 * StoryRightSidebarContainer 组件测试
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoryRightSidebarContainer } from "./story-right-sidebar.container.fn";

// Mock stores
vi.mock("@/stores/ui.store", () => ({
	useUIStore: vi.fn((selector) => {
		const state = {
			tabPosition: "right-sidebar" as const,
		};
		return selector(state);
	}),
}));

vi.mock("@/stores/editor-tabs.store", () => ({
	useEditorTabsStore: vi.fn((selector) => {
		const state = {
			tabs: [
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
					title: "Test File 2",
					type: "file" as const,
					nodeId: "node-2",
					workspaceId: "workspace-2",
					isDirty: false,
				},
			],
			activeTabId: "tab-1",
			setActiveTab: vi.fn(),
			closeTab: vi.fn(),
		};
		return selector(state);
	}),
}));

describe("StoryRightSidebarContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render with workspace tabs", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-1" />);
		expect(screen.getByText("Open Tabs")).toBeInTheDocument();
		expect(screen.getByText("Test File 1")).toBeInTheDocument();
	});

	it("should filter tabs by workspaceId", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-1" />);
		expect(screen.getByText("Test File 1")).toBeInTheDocument();
		expect(screen.queryByText("Test File 2")).not.toBeInTheDocument();
	});

	it("should display correct tab count for workspace", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-1" />);
		expect(screen.getByText("1")).toBeInTheDocument();
	});

	it("should not render when tabPosition is top", async () => {
		const { useUIStore } = await import("@/stores/ui.store");
		const _originalMock = vi.mocked(useUIStore);

		vi.mocked(useUIStore).mockImplementation((selector: any) => {
			const state = {
				tabPosition: "top" as const,
			};
			return selector(state);
		});

		render(<StoryRightSidebarContainer workspaceId="workspace-1" />);
		expect(screen.queryByText("Open Tabs")).not.toBeInTheDocument();

		// Restore original mock
		vi.mocked(useUIStore).mockImplementation((selector: any) => {
			const state = {
				tabPosition: "right-sidebar" as const,
			};
			return selector(state);
		});
	});

	it("should not render when workspace has no tabs", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-3" />);
		expect(screen.queryByText("Open Tabs")).not.toBeInTheDocument();
	});

	it("should pass correct props to view component", () => {
		render(<StoryRightSidebarContainer workspaceId="workspace-1" />);
		// The component should render with the filtered tabs
		expect(screen.getByText("Open Tabs")).toBeInTheDocument();
		expect(screen.getByText("Test File 1")).toBeInTheDocument();
		const tab = screen.getByText("Test File 1").closest("button");
		expect(tab).toHaveClass("bg-primary/10"); // Active tab styling
	});
});
