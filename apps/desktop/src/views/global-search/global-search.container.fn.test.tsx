/**
 * @file global-search.container.fn.test.tsx
 * @description GlobalSearchContainer 组件单元测试
 *
 * 测试覆盖：
 * - 搜索状态管理
 * - 防抖搜索逻辑
 * - 键盘导航
 * - 结果选择和路由跳转
 * - 与 View 组件的集成
 *
 * @requirements 7.2
 */

import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GlobalSearchContainer } from "./global-search.container.fn"
import type { GlobalSearchViewProps } from "./global-search.types"

// ============================================================================
// Mocks
// ============================================================================

// Mock search engine
const mockSimpleSearch = vi.fn()
vi.mock("@/fn/search", () => ({
	searchEngine: {
		simpleSearch: (...args: any[]) => mockSimpleSearch(...args),
	},
}))

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mockNavigate,
}))

// Mock logger
vi.mock("@/log", () => ({
	default: {
		error: vi.fn(),
		info: vi.fn(),
		start: vi.fn(),
		success: vi.fn(),
	},
}))

// Mock GlobalSearchView
vi.mock("./global-search.view.fn", () => ({
	GlobalSearchView: (props: GlobalSearchViewProps) => (
		<div data-testid="global-search-view">
			<div data-testid="open">{String(props.open)}</div>
			<div data-testid="query">{props.query}</div>
			<div data-testid="loading">{String(props.loading)}</div>
			<div data-testid="results-count">{props.results.length}</div>
			<div data-testid="selected-index">{props.selectedIndex}</div>
			<button onClick={() => props.onQueryChange("test query")}>Change Query</button>
			<button onClick={() => props.onSelectResult(props.results[0])}>Select Result</button>
			<button
				onClick={() =>
					props.onKeyDown({
						key: "ArrowDown",
						preventDefault: vi.fn(),
					} as any)
				}
			>
				Key Down
			</button>
			<button onClick={() => props.onOpenChange(false)}>Close</button>
		</div>
	),
}))

// ============================================================================
// Unit Tests
// ============================================================================

describe("GlobalSearchContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSimpleSearch.mockResolvedValue([])
	})

	describe("基本渲染", () => {
		it("should render GlobalSearchView with correct props", () => {
			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />)

			expect(screen.getByTestId("global-search-view")).toBeInTheDocument()
			expect(screen.getByTestId("open")).toHaveTextContent("true")
			expect(screen.getByTestId("query")).toHaveTextContent("")
			expect(screen.getByTestId("loading")).toHaveTextContent("false")
			expect(screen.getByTestId("results-count")).toHaveTextContent("0")
			expect(screen.getByTestId("selected-index")).toHaveTextContent("0")
		})

		it("should pass open prop to view", () => {
			render(<GlobalSearchContainer open={false} onOpenChange={vi.fn()} />)

			expect(screen.getByTestId("open")).toHaveTextContent("false")
		})
	})

	describe("搜索逻辑", () => {
		it("should perform search when query changes", async () => {
			const mockResults = [
				{
					content: "",
					excerpt: "",
					highlights: [],
					id: "1",
					score: 1,
					title: "Test",
					type: "node" as const,
				},
			]
			mockSimpleSearch.mockResolvedValue(mockResults)

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />)

			// 触发查询变化
			const changeButton = screen.getByText("Change Query")
			changeButton.click()

			// 等待防抖和搜索完成
			await waitFor(
				() => {
					expect(mockSimpleSearch).toHaveBeenCalledWith("test query", {
						limit: 30,
					})
				},
				{ timeout: 500 },
			)

			await waitFor(() => {
				expect(screen.getByTestId("results-count")).toHaveTextContent("1")
			})
		})

		it("should debounce search", async () => {
			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />)

			const changeButton = screen.getByText("Change Query")

			// 快速点击多次
			changeButton.click()
			changeButton.click()
			changeButton.click()

			// 等待防抖时间
			await waitFor(
				() => {
					// 应该只调用一次
					expect(mockSimpleSearch).toHaveBeenCalledTimes(1)
				},
				{ timeout: 500 },
			)
		})

		it("should show loading state during search", async () => {
			mockSimpleSearch.mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
			)

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />)

			const changeButton = screen.getByText("Change Query")
			changeButton.click()

			// 应该显示加载状态
			await waitFor(() => {
				expect(screen.getByTestId("loading")).toHaveTextContent("true")
			})
		})

		it("should handle search error", async () => {
			mockSimpleSearch.mockRejectedValue(new Error("Search failed"))

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />)

			const changeButton = screen.getByText("Change Query")
			changeButton.click()

			await waitFor(
				() => {
					expect(screen.getByTestId("loading")).toHaveTextContent("false")
					expect(screen.getByTestId("results-count")).toHaveTextContent("0")
				},
				{ timeout: 500 },
			)
		})

		it("should not search when query is empty", async () => {
			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />)

			// 初始状态，query 为空
			await waitFor(
				() => {
					expect(mockSimpleSearch).not.toHaveBeenCalled()
				},
				{ timeout: 500 },
			)
		})
	})

	describe("结果选择", () => {
		it("should handle result selection", async () => {
			const onOpenChange = vi.fn()
			const mockResults = [
				{
					content: "",
					excerpt: "",
					highlights: [],
					id: "1",
					score: 1,
					title: "Test",
					type: "node" as const,
				},
			]
			mockSimpleSearch.mockResolvedValue(mockResults)

			render(<GlobalSearchContainer open={true} onOpenChange={onOpenChange} />)

			// 触发搜索
			const changeButton = screen.getByText("Change Query")
			changeButton.click()

			await waitFor(
				() => {
					expect(screen.getByTestId("results-count")).toHaveTextContent("1")
				},
				{ timeout: 500 },
			)

			// 选择结果
			const selectButton = screen.getByText("Select Result")
			selectButton.click()

			// 应该关闭对话框
			expect(onOpenChange).toHaveBeenCalledWith(false)

			// 应该导航
			expect(mockNavigate).toHaveBeenCalledWith({ to: "/" })
		})
	})

	describe("键盘导航", () => {
		it("should handle arrow down key", async () => {
			const mockResults = [
				{
					content: "",
					excerpt: "",
					highlights: [],
					id: "1",
					score: 1,
					title: "Test 1",
					type: "node" as const,
				},
				{
					content: "",
					excerpt: "",
					highlights: [],
					id: "2",
					score: 1,
					title: "Test 2",
					type: "node" as const,
				},
			]
			mockSimpleSearch.mockResolvedValue(mockResults)

			render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />)

			// 触发搜索
			const changeButton = screen.getByText("Change Query")
			changeButton.click()

			await waitFor(
				() => {
					expect(screen.getByTestId("results-count")).toHaveTextContent("2")
				},
				{ timeout: 500 },
			)

			// 按下箭头键
			const keyButton = screen.getByText("Key Down")
			keyButton.click()

			await waitFor(() => {
				expect(screen.getByTestId("selected-index")).toHaveTextContent("1")
			})
		})
	})

	describe("状态重置", () => {
		it("should reset state when dialog closes", async () => {
			const mockResults = [
				{
					content: "",
					excerpt: "",
					highlights: [],
					id: "1",
					score: 1,
					title: "Test",
					type: "node" as const,
				},
			]
			mockSimpleSearch.mockResolvedValue(mockResults)

			const { rerender } = render(<GlobalSearchContainer open={true} onOpenChange={vi.fn()} />)

			// 触发搜索
			const changeButton = screen.getByText("Change Query")
			changeButton.click()

			await waitFor(
				() => {
					expect(screen.getByTestId("results-count")).toHaveTextContent("1")
				},
				{ timeout: 500 },
			)

			// 关闭对话框
			rerender(<GlobalSearchContainer open={false} onOpenChange={vi.fn()} />)

			await waitFor(() => {
				expect(screen.getByTestId("query")).toHaveTextContent("")
				expect(screen.getByTestId("results-count")).toHaveTextContent("0")
				expect(screen.getByTestId("selected-index")).toHaveTextContent("0")
			})
		})
	})
})
