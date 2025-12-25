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

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GlobalSearchView } from "./global-search.view.fn";
import type { GlobalSearchViewProps, SearchResult } from "./global-search.types";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

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
		onOpenChange: overrides.onOpenChange ?? vi.fn(),
		onSearch: overrides.onSearch ?? vi.fn().mockResolvedValue([]),
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
			expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
		});

		it("should render when open", () => {
			const props = createDefaultProps({ open: true });
			render(<GlobalSearchView {...props} />);

			// 验证搜索输入框存在
			expect(screen.getByPlaceholderText("搜索文件...")).toBeInTheDocument();
		});

		it("should show empty state initially", () => {
			const props = createDefaultProps({ open: true });
			render(<GlobalSearchView {...props} />);

			// 验证空状态提示
			expect(screen.getByText("输入关键词开始搜索")).toBeInTheDocument();
			expect(screen.getByText("支持搜索文件内容")).toBeInTheDocument();
		});
	});

	describe("搜索功能", () => {
		it("should call onSearch when user types", async () => {
			const onSearch = vi.fn().mockResolvedValue([]);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test query" } });

			// 等待 debounce (300ms)
			await waitFor(
				() => {
					expect(onSearch).toHaveBeenCalledWith("test query", { limit: 30 });
				},
				{ timeout: 500 },
			);
		});

		it("should not call onSearch when query is empty", async () => {
			const onSearch = vi.fn().mockResolvedValue([]);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "   " } });

			// 等待 debounce
			await new Promise((resolve) => setTimeout(resolve, 400));

			expect(onSearch).not.toHaveBeenCalled();
		});

		it("should show loading state while searching", async () => {
			const onSearch = vi
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
				);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			// 等待 debounce 后应该显示加载状态
			await waitFor(
				() => {
					expect(screen.getByRole("status")).toBeInTheDocument();
				},
				{ timeout: 500 },
			);
		});

		it("should display search results", async () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Result 1" }),
				createTestSearchResult({ id: "2", title: "Result 2" }),
			];
			const onSearch = vi.fn().mockResolvedValue(results);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("Result 1")).toBeInTheDocument();
				expect(screen.getByText("Result 2")).toBeInTheDocument();
			});
		});

		it("should show no results message when search returns empty", async () => {
			const onSearch = vi.fn().mockResolvedValue([]);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "nonexistent" } });

			await waitFor(() => {
				expect(screen.getByText("未找到匹配结果")).toBeInTheDocument();
			});
		});

		it("should clear search input when clear button clicked", async () => {
			const props = createDefaultProps({ open: true });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText(
				"搜索文件...",
			) as HTMLInputElement;
			fireEvent.change(input, { target: { value: "test" } });

			expect(input.value).toBe("test");

			// 点击清除按钮
			const clearButton = screen.getByRole("button", { name: "" });
			fireEvent.click(clearButton);

			expect(input.value).toBe("");
		});
	});

	describe("结果选择", () => {
		it("should call onOpenChange when result clicked", async () => {
			const results = [createTestSearchResult({ id: "1", title: "Result 1" })];
			const onSearch = vi.fn().mockResolvedValue(results);
			const onOpenChange = vi.fn();
			const props = createDefaultProps({ open: true, onSearch, onOpenChange });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("Result 1")).toBeInTheDocument();
			});

			const resultButton = screen.getByText("Result 1").closest("button");
			fireEvent.click(resultButton!);

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("should display result type badge", async () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Node Result", type: "node" }),
				createTestSearchResult({
					id: "2",
					title: "Project Result",
					type: "project",
				}),
			];
			const onSearch = vi.fn().mockResolvedValue(results);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("文件")).toBeInTheDocument();
				expect(screen.getByText("项目")).toBeInTheDocument();
			});
		});

		it("should display workspace title when available", async () => {
			const results = [
				createTestSearchResult({
					id: "1",
					title: "Result 1",
					workspaceTitle: "My Workspace",
				}),
			];
			const onSearch = vi.fn().mockResolvedValue(results);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("My Workspace")).toBeInTheDocument();
			});
		});
	});

	describe("键盘导航", () => {
		it("should navigate down with ArrowDown key", async () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Result 1" }),
				createTestSearchResult({ id: "2", title: "Result 2" }),
			];
			const onSearch = vi.fn().mockResolvedValue(results);
			const props = createDefaultProps({ open: true, onSearch });
			const { container } = render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("Result 1")).toBeInTheDocument();
			});

			// 按下 ArrowDown
			fireEvent.keyDown(window, { key: "ArrowDown" });

			// 验证第二个结果被选中（通过 bg-accent 类）
			const result2 = screen.getByText("Result 2").closest("button");
			expect(result2).toHaveClass("bg-accent");
		});

		it("should navigate up with ArrowUp key", async () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Result 1" }),
				createTestSearchResult({ id: "2", title: "Result 2" }),
			];
			const onSearch = vi.fn().mockResolvedValue(results);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("Result 1")).toBeInTheDocument();
			});

			// 先按下 ArrowDown 到第二个
			fireEvent.keyDown(window, { key: "ArrowDown" });
			// 再按 ArrowUp 回到第一个
			fireEvent.keyDown(window, { key: "ArrowUp" });

			// 验证第一个结果被选中
			const result1 = screen.getByText("Result 1").closest("button");
			expect(result1).toHaveClass("bg-accent");
		});

		it("should select result with Enter key", async () => {
			const results = [createTestSearchResult({ id: "1", title: "Result 1" })];
			const onSearch = vi.fn().mockResolvedValue(results);
			const onOpenChange = vi.fn();
			const props = createDefaultProps({ open: true, onSearch, onOpenChange });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("Result 1")).toBeInTheDocument();
			});

			// 按 Enter 选择
			fireEvent.keyDown(window, { key: "Enter" });

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("should close dialog with Escape key", () => {
			const onOpenChange = vi.fn();
			const props = createDefaultProps({ open: true, onOpenChange });
			render(<GlobalSearchView {...props} />);

			fireEvent.keyDown(window, { key: "Escape" });

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("快捷键提示", () => {
		it("should show keyboard shortcuts when results exist", async () => {
			const results = [createTestSearchResult({ id: "1", title: "Result 1" })];
			const onSearch = vi.fn().mockResolvedValue(results);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				expect(screen.getByText("导航")).toBeInTheDocument();
				expect(screen.getByText("选择")).toBeInTheDocument();
				expect(screen.getByText("关闭")).toBeInTheDocument();
			});
		});

		it("should not show keyboard shortcuts when no results", () => {
			const props = createDefaultProps({ open: true });
			render(<GlobalSearchView {...props} />);

			expect(screen.queryByText("导航")).not.toBeInTheDocument();
		});
	});

	describe("文本高亮", () => {
		it("should highlight matching text in results", async () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Test Result" }),
			];
			const onSearch = vi.fn().mockResolvedValue(results);
			const props = createDefaultProps({ open: true, onSearch });
			render(<GlobalSearchView {...props} />);

			const input = screen.getByPlaceholderText("搜索文件...");
			fireEvent.change(input, { target: { value: "test" } });

			await waitFor(() => {
				const marks = document.querySelectorAll("mark");
				expect(marks.length).toBeGreaterThan(0);
			});
		});
	});
});
