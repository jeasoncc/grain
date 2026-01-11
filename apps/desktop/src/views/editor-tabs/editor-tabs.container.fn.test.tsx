/**
 * EditorTabsContainer 组件测试
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorTab } from "@/types/editor-tab";
import { TooltipProvider } from "@/views/ui/tooltip";
import { EditorTabsContainer } from "./editor-tabs.container.fn";

// Mock the store
vi.mock("@/state/editor-tabs.state", () => ({
	useEditorTabsStore: vi.fn(),
}));

// Import after mocking
import { useEditorTabsStore } from "@/state/editor-tabs.state";

// 测试辅助函数：创建测试标签
function createTestTab(overrides?: Partial<EditorTab>): EditorTab {
	return {
		id: "tab-1",
		workspaceId: "workspace-1",
		nodeId: "node-1",
		title: "Test Document",
		type: "file",
		isDirty: false,
		...overrides,
	};
}

// 包装组件以提供 TooltipProvider
function renderWithTooltip(ui: React.ReactElement) {
	return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("EditorTabsContainer", () => {
	const mockSetActiveTab = vi.fn();
	const mockCloseTab = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// 默认 mock 实现
		vi.mocked(useEditorTabsStore).mockImplementation((selector: any) => {
			const state = {
				tabs: [
					createTestTab({ id: "tab-1", workspaceId: "workspace-1" }),
					createTestTab({ id: "tab-2", workspaceId: "workspace-1" }),
					createTestTab({ id: "tab-3", workspaceId: "workspace-2" }),
				],
				activeTabId: "tab-1",
				setActiveTab: mockSetActiveTab,
				closeTab: mockCloseTab,
			};
			return selector(state);
		});
	});

	it("should render tabs from store", () => {
		renderWithTooltip(<EditorTabsContainer workspaceId="workspace-1" />);

		// 使用 getAllByText 因为有多个相同标题的标签
		const tabs = screen.getAllByText("Test Document");
		expect(tabs.length).toBeGreaterThan(0);
	});

	it("should filter tabs by workspaceId", () => {
		const { container } = renderWithTooltip(
			<EditorTabsContainer workspaceId="workspace-1" />,
		);

		// 应该只显示 workspace-1 的标签（2个）
		// 使用 data-tab-id 属性来查找标签
		const tabs = container.querySelectorAll('[data-tab-id^="tab-"]');
		expect(tabs.length).toBe(2);
	});

	it("should call setActiveTab when tab is clicked", () => {
		renderWithTooltip(<EditorTabsContainer workspaceId="workspace-1" />);

		// 使用 getAllByText 获取第一个标签
		const tabs = screen.getAllByText("Test Document");
		fireEvent.click(tabs[0]);

		expect(mockSetActiveTab).toHaveBeenCalledWith("tab-1");
	});

	it("should call closeTab when close button is clicked", () => {
		const { container } = renderWithTooltip(
			<EditorTabsContainer workspaceId="workspace-1" />,
		);

		// 使用 data-tab-id 查找第一个标签
		const firstTab = container.querySelector('[data-tab-id="tab-1"]');
		expect(firstTab).toBeTruthy();

		// 查找标签内的关闭按钮
		const closeButton = firstTab?.querySelector("button");
		expect(closeButton).toBeTruthy();

		fireEvent.click(closeButton!);

		expect(mockCloseTab).toHaveBeenCalledWith("tab-1");
	});

	it("should render nothing when no tabs for workspace", () => {
		const { container } = renderWithTooltip(
			<EditorTabsContainer workspaceId="workspace-3" />,
		);

		expect(container.firstChild).toBeNull();
	});

	it("should pass activeTabId from store to view", () => {
		const { container } = renderWithTooltip(
			<EditorTabsContainer workspaceId="workspace-1" />,
		);

		// 使用 data-tab-id 查找活动标签
		const activeTab = container.querySelector('[data-tab-id="tab-1"]');
		expect(activeTab).toHaveClass("bg-background");
	});

	it("should handle null workspaceId", () => {
		const { container } = renderWithTooltip(
			<EditorTabsContainer workspaceId={null} />,
		);

		// 应该不显示任何标签
		expect(container.firstChild).toBeNull();
	});

	it("should apply custom className", () => {
		const { container } = renderWithTooltip(
			<EditorTabsContainer
				workspaceId="workspace-1"
				className="custom-class"
			/>,
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toHaveClass("custom-class");
	});
});
