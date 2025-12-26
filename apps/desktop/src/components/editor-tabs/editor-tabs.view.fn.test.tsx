/**
 * EditorTabsView 组件测试
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { EditorTab } from "@/types/editor-tab";
import { EditorTabsView } from "./editor-tabs.view.fn";
import type { EditorTabsViewProps } from "./editor-tabs.types";

// 测试辅助函数：创建测试标签
function createTestTab(overrides?: Partial<EditorTab>): EditorTab {
	return {
		id: "tab-1",
		workspaceId: "workspace-1",
		nodeId: "node-1",
		title: "Test Document",
		type: "wiki",
		isDirty: false,
		createdAt: Date.now(),
		...overrides,
	};
}

// 包装组件以提供 TooltipProvider
function renderWithTooltip(ui: React.ReactElement) {
	return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("EditorTabsView", () => {
	const defaultProps: EditorTabsViewProps = {
		tabs: [createTestTab()],
		activeTabId: "tab-1",
		onSetActiveTab: vi.fn(),
		onCloseTab: vi.fn(),
	};

	it("should render tabs", () => {
		renderWithTooltip(<EditorTabsView {...defaultProps} />);
		expect(screen.getByText("Test Document")).toBeInTheDocument();
	});

	it("should render nothing when tabs array is empty", () => {
		const { container } = renderWithTooltip(
			<EditorTabsView {...defaultProps} tabs={[]} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("should call onSetActiveTab when tab is clicked", () => {
		const onSetActiveTab = vi.fn();
		renderWithTooltip(
			<EditorTabsView {...defaultProps} onSetActiveTab={onSetActiveTab} />,
		);

		const tab = screen.getByText("Test Document");
		fireEvent.click(tab);

		expect(onSetActiveTab).toHaveBeenCalledWith("tab-1");
	});

	it("should call onCloseTab when close button is clicked", () => {
		const onCloseTab = vi.fn();
		renderWithTooltip(
			<EditorTabsView {...defaultProps} onCloseTab={onCloseTab} />,
		);

		// 找到标签按钮
		const tabButton = screen.getByRole("button", { name: /Test Document/i });

		// 查找标签内的关闭按钮（使用 data-testid 或查询子按钮）
		const closeButtons = tabButton.querySelectorAll("button");
		const closeButton = closeButtons[0]; // 关闭按钮是标签内的第一个按钮

		fireEvent.click(closeButton);

		expect(onCloseTab).toHaveBeenCalledWith("tab-1");
	});

	it("should highlight active tab", () => {
		renderWithTooltip(<EditorTabsView {...defaultProps} activeTabId="tab-1" />);

		const tabButton = screen.getByRole("button", { name: /Test Document/i });
		expect(tabButton).toHaveClass("bg-background");
	});

	it("should show dirty indicator for unsaved tabs", () => {
		const dirtyTab = createTestTab({ isDirty: true });
		renderWithTooltip(<EditorTabsView {...defaultProps} tabs={[dirtyTab]} />);

		// 脏标记是一个 ● 符号
		expect(screen.getByText("●")).toBeInTheDocument();
	});

	it("should render multiple tabs", () => {
		const tabs = [
			createTestTab({ id: "tab-1", title: "Document 1" }),
			createTestTab({ id: "tab-2", title: "Document 2" }),
			createTestTab({ id: "tab-3", title: "Document 3" }),
		];

		renderWithTooltip(<EditorTabsView {...defaultProps} tabs={tabs} />);

		expect(screen.getByText("Document 1")).toBeInTheDocument();
		expect(screen.getByText("Document 2")).toBeInTheDocument();
		expect(screen.getByText("Document 3")).toBeInTheDocument();
	});

	it("should render different icons for different tab types", () => {
		const tabs = [
			createTestTab({ id: "tab-1", type: "wiki" }),
			createTestTab({ id: "tab-2", type: "diary" }),
			createTestTab({ id: "tab-3", type: "canvas" }),
		];

		const { container } = renderWithTooltip(
			<EditorTabsView {...defaultProps} tabs={tabs} />,
		);

		// 验证有多个图标被渲染（每个标签一个）
		const icons = container.querySelectorAll("svg");
		expect(icons.length).toBeGreaterThan(tabs.length);
	});

	it("should render card view button", () => {
		renderWithTooltip(<EditorTabsView {...defaultProps} />);

		// 卡片视图按钮应该存在
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThan(1);
	});

	it("should open card view dialog when card view button is clicked", () => {
		renderWithTooltip(<EditorTabsView {...defaultProps} />);

		// 找到卡片视图按钮（最后一个按钮）
		const buttons = screen.getAllByRole("button");
		const cardViewButton = buttons[buttons.length - 1];

		fireEvent.click(cardViewButton);

		// 对话框标题应该出现
		expect(screen.getByText("All Tabs")).toBeInTheDocument();
	});

	it("should apply custom className", () => {
		const { container } = renderWithTooltip(
			<EditorTabsView {...defaultProps} className="custom-class" />,
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toHaveClass("custom-class");
	});
});
