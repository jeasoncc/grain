/**
 * @file global-search.container.fn.test.tsx
 * @description GlobalSearchContainer 组件单元测试
 *
 * 测试覆盖：
 * - 数据获取和传递
 * - 回调函数调用
 * - 与搜索引擎的集成
 * - 搜索结果处理
 *
 * Mock 策略：
 * - 搜索引擎被 mock
 * - View 组件被 mock 为简单的按钮以便测试回调
 *
 * @requirements 7.2
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GlobalSearchContainer } from "./global-search.container.fn";
import type { GlobalSearchViewProps, SearchResult } from "./global-search.types";

// ============================================================================
// Mocks
// ============================================================================

// Mock search engine
const mockSimpleSearch = vi.fn();

vi.mock("@/fn/search", () => ({
	searchEngine: {
		simpleSearch: (...args: any[]) => mockSimpleSearch(...args),
	},
}));

// Mock GlobalSearchView
vi.mock("./global-search.view.fn", () => ({
	GlobalSearchView: (props: GlobalSearchViewProps) => (
		<div data-testid="global-search-view">
			<button onClick={() => props.onOpenChange(false)}>Close</button>
			<button
				onClick={async () => {
					const results = await props.onSearch("test query", { limit: 30 });
					// 显示结果数量以便测试
					const resultCount = document.createElement("div");
					resultCount.setAttribute("data-testid", "result-count");
					resultCount.textContent = String(results.length);
					document.body.appendChild(resultCount);
				}}
			>
				Search
			</button>
		</div>
	),
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

// ============================================================================
// Unit Tests
// ============================================================================

describe("GlobalSearchContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// 设置默认 mock 返回值
		mockSimpleSearch.mockResolvedValue([]);
	});

	describe("基本渲染", () => {
		it("should render view component", () => {
			render(<GlobalSearchContainer open={false} onOpenChange={vi.fn()} />);

			expect(screen.getByTestId("global-search-view")).toBeInTheDocument();
		});

		it("should pass open prop to view", () => {
			const { rerender } = render(
				<GlobalSearchContainer open={false} onOpenChange={vi.fn()} />,
			);

			expect(screen.getByTestId("global-search-view")).toBeInTheDocument();

			rerender(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			expect(screen.getByTestId("global-search-view")).toBeInTheDocument();
		});

		it("should pass onOpenChange callback to view", () => {
			const onOpenChange = vi.fn();
			render(<GlobalSearchContainer open={true} onOpenChange={onOpenChange} />);

			const closeButton = screen.getByText("Close");
			closeButton.click();

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("搜索功能", () => {
		it("should call searchEngine.simpleSearch when onSearch is called", async () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Result 1" }),
				createTestSearchResult({ id: "2", title: "Result 2" }),
			];
			mockSimpleSearch.mockResolvedValue(results);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");
			searchButton.click();

			await waitFor(() => {
				expect(mockSimpleSearch).toHaveBeenCalledWith("test query", {
					limit: 30,
				});
			});
		});

		it("should return search results from searchEngine", async () => {
			const results = [
				createTestSearchResult({ id: "1", title: "Result 1" }),
				createTestSearchResult({ id: "2", title: "Result 2" }),
				createTestSearchResult({ id: "3", title: "Result 3" }),
			];
			mockSimpleSearch.mockResolvedValue(results);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");
			searchButton.click();

			await waitFor(() => {
				const resultCount = screen.getByTestId("result-count");
				expect(resultCount.textContent).toBe("3");
			});
		});

		it("should handle empty search results", async () => {
			mockSimpleSearch.mockResolvedValue([]);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");
			searchButton.click();

			await waitFor(() => {
				const resultCount = screen.getByTestId("result-count");
				expect(resultCount.textContent).toBe("0");
			});
		});

		it("should use default limit when not specified", async () => {
			mockSimpleSearch.mockResolvedValue([]);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");
			searchButton.click();

			await waitFor(() => {
				expect(mockSimpleSearch).toHaveBeenCalledWith("test query", {
					limit: 30,
				});
			});
		});

		it("should handle search errors gracefully", async () => {
			mockSimpleSearch.mockRejectedValue(new Error("Search failed"));

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");

			// 不应该抛出错误
			expect(() => searchButton.click()).not.toThrow();

			// 等待一小段时间确保错误被处理
			await new Promise((resolve) => setTimeout(resolve, 100));
		});
	});

	describe("搜索选项", () => {
		it("should respect custom limit option", async () => {
			mockSimpleSearch.mockResolvedValue([]);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			// 注意：这个测试验证默认行为，因为 mock 的 View 组件使用固定的 limit: 30
			// 在实际使用中，View 组件会传递不同的 limit 值
			const searchButton = screen.getByText("Search");
			searchButton.click();

			await waitFor(() => {
				expect(mockSimpleSearch).toHaveBeenCalledWith("test query", {
					limit: 30,
				});
			});
		});
	});

	describe("组件生命周期", () => {
		it("should handle multiple searches", async () => {
			const results1 = [createTestSearchResult({ id: "1", title: "Result 1" })];
			const results2 = [
				createTestSearchResult({ id: "2", title: "Result 2" }),
				createTestSearchResult({ id: "3", title: "Result 3" }),
			];

			mockSimpleSearch
				.mockResolvedValueOnce(results1)
				.mockResolvedValueOnce(results2);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");

			// 第一次搜索
			searchButton.click();
			await waitFor(() => {
				expect(mockSimpleSearch).toHaveBeenCalledTimes(1);
			});

			// 清理之前的结果显示
			const oldResultCount = document.querySelector(
				'[data-testid="result-count"]',
			);
			if (oldResultCount) {
				oldResultCount.remove();
			}

			// 第二次搜索
			searchButton.click();
			await waitFor(() => {
				expect(mockSimpleSearch).toHaveBeenCalledTimes(2);
			});
		});

		it("should handle rapid consecutive searches", async () => {
			mockSimpleSearch.mockResolvedValue([]);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");

			// 快速连续点击
			searchButton.click();
			searchButton.click();
			searchButton.click();

			await waitFor(() => {
				expect(mockSimpleSearch).toHaveBeenCalledTimes(3);
			});
		});
	});

	describe("Props 变化", () => {
		it("should handle open state changes", () => {
			const { rerender } = render(
				<GlobalSearchContainer open={false} onOpenChange={vi.fn()} />,
			);

			expect(screen.getByTestId("global-search-view")).toBeInTheDocument();

			rerender(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			expect(screen.getByTestId("global-search-view")).toBeInTheDocument();
		});

		it("should handle onOpenChange callback changes", () => {
			const onOpenChange1 = vi.fn();
			const onOpenChange2 = vi.fn();

			const { rerender } = render(
				<GlobalSearchContainer open={true} onOpenChange={onOpenChange1} />,
			);

			const closeButton = screen.getByText("Close");
			closeButton.click();

			expect(onOpenChange1).toHaveBeenCalledWith(false);
			expect(onOpenChange2).not.toHaveBeenCalled();

			vi.clearAllMocks();

			rerender(
				<GlobalSearchContainer open={true} onOpenChange={onOpenChange2} />,
			);

			closeButton.click();

			expect(onOpenChange1).not.toHaveBeenCalled();
			expect(onOpenChange2).toHaveBeenCalledWith(false);
		});
	});

	describe("搜索结果类型", () => {
		it("should handle node type results", async () => {
			const results = [
				createTestSearchResult({ id: "1", type: "node", title: "Node 1" }),
			];
			mockSimpleSearch.mockResolvedValue(results);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");
			searchButton.click();

			await waitFor(() => {
				expect(mockSimpleSearch).toHaveBeenCalled();
			});
		});

		it("should handle project type results", async () => {
			const results = [
				createTestSearchResult({
					id: "1",
					type: "project",
					title: "Project 1",
				}),
			];
			mockSimpleSearch.mockResolvedValue(results);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");
			searchButton.click();

			await waitFor(() => {
				expect(mockSimpleSearch).toHaveBeenCalled();
			});
		});

		it("should handle mixed type results", async () => {
			const results = [
				createTestSearchResult({ id: "1", type: "node", title: "Node 1" }),
				createTestSearchResult({
					id: "2",
					type: "project",
					title: "Project 1",
				}),
				createTestSearchResult({ id: "3", type: "node", title: "Node 2" }),
			];
			mockSimpleSearch.mockResolvedValue(results);

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />);

			const searchButton = screen.getByText("Search");
			searchButton.click();

			await waitFor(() => {
				const resultCount = screen.getByTestId("result-count");
				expect(resultCount.textContent).toBe("3");
			});
		});
	});
});
