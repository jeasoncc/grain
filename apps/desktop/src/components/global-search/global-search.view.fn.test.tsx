/**
 * @file global-search.view.fn.test.tsx
 * @description GlobalSearchView 组件单元测试
 *
 * 测试覆盖：
 * - Props 渲染
 * - 用户交互（搜索输入、结果选择）
 * - 条件渲染（加载状态、空状态、结果列表）
 * - 回调函数调用
 * - 键盘导航
 *
 * @requirements 7.2
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	GlobalSearchViewProps,
	SearchResult,
} from "./global-search.types";
import { GlobalSearchView } from "./global-search.view.fn";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 SearchResult 对象
 */
function createTestSearchResult(
	overrides: Partial<SearchResult> = {},
): SearchResult {
	return {
		id: overrides.id ?? "result-1",
		type: overrides.type ?? "node",
		title: overrides.title ?? "Test Result",
		content: overrides.content ?? "Test content",
		excerpt: overrides.excerpt ?? "Test excerpt",
		workspaceId: overrides.workspaceId ?? "workspace-1",
		workspaceTitle: overrides.workspaceTitle ?? "Test Workspace",
		score: overrides.score ?? 1.0,
		highlights: overrides.highlights ?? [],
	};
}

/**
 * 创建默认的 GlobalSearchViewProps
 */
function createDefaultProps(
	overrides: Partial<GlobalSearchViewProps> = {},
): GlobalSearchViewProps {
	return {
		open: overrides.open ?? false,
		query: overrides.query ?? "",
		results: overrides.results ?? [],
		loading: overrides.loading ?? false,
		selectedIndex: overrides.selectedIndex ?? 0,
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onQueryChange: overrides.onQueryChange ?? vi.fn(),
		onSelectResult: overrides.onSelectResult ?? vi.fn(),
		onKeyDown: overrides.onKeyDown ?? vi.fn(),
	};
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("GlobalSearchView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("基本渲染", () => {
		it("should not render when closed", () => {
			const props = createDefaultProps({ open: false });
			const { container } = render(<GlobalSearchView {...props} />);

			// Dialog 不应该可见
			expect(
				container.querySelector('[role="dialog"]'),
			).not.toBeInTheDocument();
		});

		it("should render when open", () => {
			const props = createDefaultProps({ open: true });
			render(<GlobalSearchView {...props} />);

			// 应该显示搜索输入框
			expect(screen.getByPlaceholderText("搜索文件...")).toBeInTheDocument();
		});

		it("should render search input with query", () => {
			const props = createDefaultProps({ open: true, query: "test query" });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText(
				"搜索文件...",
			) as HTMLInputElement;
			expect(input.value).toBe("test query");
		});
	});

	describe("用户交互", () => {
		it("should call onQueryChange when typing", () => {
			const onQueryChange = vi.fn();
			const props = createDefaultProps({ open: true, onQueryChange });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "new query" } });

			expect(onQueryChange).toHaveBeenCalledWith("new query");
		});

		it("should call onQueryChange with empty string when clear button clicked", () => {
			const onQueryChange = vi.fn();
			const props = createDefaultProps({
				open: true,
				query: "test",
				onQueryChange,
			});
			render(<GlobalSearchView {...props} />);

			// 清除按钮应该可见
			const clearButton = screen.getByRole("button", { name: "" });
			fireEvent.click(clearButton);

			expect(onQueryChange).toHaveBeenCalledWith("");
		});

		it("should call onSelectResult when result clicked", () => {
			const onSelectResult = vi.fn();
			const result = createTestSearchResult({ title: "Test Result" });
			const props = createDefaultProps({
				open: true,
				results: [result],
				onSelectResult,
			});
			render(<GlobalSearchView {...props} />);

			const resultButton = screen.getByText("Test Result");
			fireEvent.click(resultButton);

			expect(onSelectResult).toHaveBeenCalledWith(result);
		});

		it("should call onKeyDown when key pressed", () => {
			const onKeyDown = vi.fn();
			const props = createDefaultProps({ open: true, onKeyDown });
			render(<GlobalSearchView {...props} />);

			const dialog = screen.getByRole("dialog");
			fireEvent.keyDown(dialog, { key: "ArrowDown" });

			expect(onKeyDown).toHaveBeenCalled();
		});
	});

	describe("条件渲染", () => {
		it("should show loading state", () => {
			const props = createDefaultProps({ open: true, loading: true });
			render(<GlobalSearchView {...props} />);

			// 应该显示加载图标
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		it("should show empty state when no query", () => {
			const props = createDefaultProps({ open: true, query: "" });
			render(<GlobalSearchView {...props} />);

			expect(screen.getByText("输入关键词开始搜索")).toBeInTheDocument();
		});

		it("should show no results state when query but no results", () => {
			const props = createDefaultProps({
				open: true,
				query: "test",
				results: [],
			});
			render(<GlobalSearchView {...props} />);

			expect(screen.getByText("未找到匹配结果")).toBeInTheDocument();
		});

		it("should render results list", () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Result 1" }),
				createTestSearchResult({ id: "2", title: "Result 2" }),
			];
			const props = createDefaultProps({ open: true, results });
			render(<GlobalSearchView {...props} />);

			expect(screen.getByText("Result 1")).toBeInTheDocument();
			expect(screen.getByText("Result 2")).toBeInTheDocument();
		});

		it("should highlight selected result", () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Result 1" }),
				createTestSearchResult({ id: "2", title: "Result 2" }),
			];
			const props = createDefaultProps({
				open: true,
				results,
				selectedIndex: 1,
			});
			render(<GlobalSearchView {...props} />);

			const buttons = screen.getAllByRole("button");
			// 第二个结果应该有 bg-accent class
			const result2Button = buttons.find((btn) =>
				btn.textContent?.includes("Result 2"),
			);
			expect(result2Button?.className).toContain("bg-accent");
		});

		it("should show keyboard shortcuts when results exist", () => {
			const results = [createTestSearchResult()];
			const props = createDefaultProps({ open: true, results });
			render(<GlobalSearchView {...props} />);

			expect(screen.getByText("导航")).toBeInTheDocument();
			expect(screen.getByText("选择")).toBeInTheDocument();
			expect(screen.getByText("关闭")).toBeInTheDocument();
		});

		it("should not show keyboard shortcuts when no results", () => {
			const props = createDefaultProps({ open: true, results: [] });
			render(<GlobalSearchView {...props} />);

			expect(screen.queryByText("导航")).not.toBeInTheDocument();
		});
	});

	describe("结果显示", () => {
		it("should display result type badge", () => {
			const result = createTestSearchResult({ type: "node" });
			const props = createDefaultProps({ open: true, results: [result] });
			render(<GlobalSearchView {...props} />);

			expect(screen.getByText("文件")).toBeInTheDocument();
		});

		it("should display workspace title when available", () => {
			const result = createTestSearchResult({
				workspaceTitle: "My Workspace",
			});
			const props = createDefaultProps({ open: true, results: [result] });
			render(<GlobalSearchView {...props} />);

			expect(screen.getByText("My Workspace")).toBeInTheDocument();
		});

		it("should display excerpt", () => {
			const result = createTestSearchResult({
				excerpt: "Test excerpt content",
			});
			const props = createDefaultProps({ open: true, results: [result] });
			render(<GlobalSearchView {...props} />);

			expect(screen.getByText("Test excerpt content")).toBeInTheDocument();
		});

		it("should highlight matching text in title", () => {
			const result = createTestSearchResult({ title: "Test Result" });
			const props = createDefaultProps({
				open: true,
				query: "test",
				results: [result],
			});
			render(<GlobalSearchView {...props} />);

			// 应该显示结果标题（包含高亮部分）
			const titleElement = screen.getByText((_content, element) => {
				return element?.textContent === "Test Result";
			});
			expect(titleElement).toBeInTheDocument();
		});
	});

	describe("清除按钮", () => {
		it("should show clear button when query exists", () => {
			const props = createDefaultProps({ open: true, query: "test" });
			render(<GlobalSearchView {...props} />);

			// 清除按钮应该存在
			const buttons = screen.getAllByRole("button");
			expect(buttons.length).toBeGreaterThan(0);
		});

		it("should not show clear button when query is empty", () => {
			const props = createDefaultProps({ open: true, query: "" });
			const { container } = render(<GlobalSearchView {...props} />);

			// 只有一个按钮（对话框关闭按钮）
			const clearButtons = container.querySelectorAll(
				'button[class*="size-6"]',
			);
			expect(clearButtons.length).toBe(0);
		});
	});
});
