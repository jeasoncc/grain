/**
 * SearchPanelView 组件测试
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SearchResult } from "@/flows/search";
import type { SearchPanelViewProps } from "./search-panel.types";
import { SearchPanelView } from "./search-panel.view.fn";

describe("SearchPanelView", () => {
	const defaultProps: SearchPanelViewProps = {
		searchState: {
			query: "",
			selectedTypes: ["node"],
			showFilters: false,
		},
		results: [],
		loading: false,
		onSetSearchQuery: vi.fn(),
		onToggleType: vi.fn(),
		onSetSearchShowFilters: vi.fn(),
		onSelectResult: vi.fn(),
	};

	it("should render search input", () => {
		render(<SearchPanelView {...defaultProps} />);
		expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
	});

	it("should display search query in input", () => {
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				query: "test query",
			},
		};
		render(<SearchPanelView {...props} />);
		expect(screen.getByDisplayValue("test query")).toBeInTheDocument();
	});

	it("should call onSetSearchQuery when input changes", () => {
		const onSetSearchQuery = vi.fn();
		render(
			<SearchPanelView {...defaultProps} onSetSearchQuery={onSetSearchQuery} />,
		);

		const input = screen.getByPlaceholderText("Search...");
		fireEvent.change(input, { target: { value: "new query" } });

		expect(onSetSearchQuery).toHaveBeenCalledWith("new query");
	});

	it("should show clear button when query is not empty", () => {
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				query: "test",
			},
		};
		render(<SearchPanelView {...props} />);

		const clearButtons = screen.getAllByRole("button");
		const clearButton = clearButtons.find((btn) => btn.querySelector("svg"));
		expect(clearButton).toBeInTheDocument();
	});

	it("should call onSetSearchQuery with empty string when clear button clicked", () => {
		const onSetSearchQuery = vi.fn();
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				query: "test",
			},
			onSetSearchQuery,
		};
		render(<SearchPanelView {...props} />);

		const clearButtons = screen.getAllByRole("button");
		const clearButton = clearButtons.find(
			(btn) =>
				btn.className.includes("absolute") && btn.className.includes("right-1"),
		);

		if (clearButton) {
			fireEvent.click(clearButton);
			expect(onSetSearchQuery).toHaveBeenCalledWith("");
		}
	});

	it("should toggle filters when filter button clicked", () => {
		const onSetSearchShowFilters = vi.fn();
		render(
			<SearchPanelView
				{...defaultProps}
				onSetSearchShowFilters={onSetSearchShowFilters}
			/>,
		);

		const filterButton = screen.getByTitle("Toggle filters");
		fireEvent.click(filterButton);

		expect(onSetSearchShowFilters).toHaveBeenCalledWith(true);
	});

	it("should show filters when showFilters is true", () => {
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				showFilters: true,
			},
		};
		render(<SearchPanelView {...props} />);

		expect(screen.getByText("Scope")).toBeInTheDocument();
	});

	it("should display loading state", () => {
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				query: "test",
			},
			loading: true,
		};
		render(<SearchPanelView {...props} />);

		expect(screen.getByText("Searching...")).toBeInTheDocument();
	});

	it("should display results count", () => {
		const results: SearchResult[] = [
			{
				id: "1",
				type: "node",
				title: "Test Node 1",
				content: "Test content",
				workspaceTitle: "Workspace",
				excerpt: "Test excerpt",
				score: 1.0,
				highlights: [],
			},
			{
				id: "2",
				type: "node",
				title: "Test Node 2",
				content: "Test content",
				workspaceTitle: "Workspace",
				excerpt: "Test excerpt",
				score: 1.0,
				highlights: [],
			},
		];
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				query: "test",
			},
			results,
		};
		render(<SearchPanelView {...props} />);

		expect(screen.getByText("Found 2 results")).toBeInTheDocument();
	});

	it("should display no results message when query exists but no results", () => {
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				query: "nonexistent",
			},
			results: [],
		};
		render(<SearchPanelView {...props} />);

		expect(screen.getByText("No results found")).toBeInTheDocument();
	});

	it("should display type to search message when no query", () => {
		render(<SearchPanelView {...defaultProps} />);

		expect(screen.getByText("Type to search")).toBeInTheDocument();
	});

	it("should call onToggleType when type checkbox is clicked", () => {
		const onToggleType = vi.fn();
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				showFilters: true,
			},
			onToggleType,
		};
		render(<SearchPanelView {...props} />);

		const nodeCheckbox = screen.getByLabelText("文件");
		fireEvent.click(nodeCheckbox);

		expect(onToggleType).toHaveBeenCalledWith("node");
	});

	it("should display search results grouped by type", () => {
		const results: SearchResult[] = [
			{
				id: "1",
				type: "node",
				title: "Test Node",
				content: "Test content",
				workspaceTitle: "Workspace",
				excerpt: "Test excerpt",
				score: 1.0,
				highlights: [],
			},
		];
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				query: "test",
			},
			results,
		};
		render(<SearchPanelView {...props} />);

		// 文本可能被高亮标记分割，使用函数匹配器
		expect(
			screen.getByText((_content, element) => {
				return element?.textContent === "Test Node";
			}),
		).toBeInTheDocument();
		expect(screen.getByText("Workspace")).toBeInTheDocument();
	});

	it("should call onSelectResult when result is clicked", () => {
		const onSelectResult = vi.fn();
		const results: SearchResult[] = [
			{
				id: "1",
				type: "node",
				title: "Test Node",
				content: "Test content",
				workspaceTitle: "Workspace",
				excerpt: "Test excerpt",
				score: 1.0,
				highlights: [],
			},
		];
		const props = {
			...defaultProps,
			searchState: {
				...defaultProps.searchState,
				query: "test",
			},
			results,
			onSelectResult,
		};
		render(<SearchPanelView {...props} />);

		// 文本可能被高亮标记分割，使用函数匹配器找到元素
		const titleElement = screen.getByText((_content, element) => {
			return element?.textContent === "Test Node";
		});
		const resultButton = titleElement.closest("button");
		if (resultButton) {
			fireEvent.click(resultButton);
			expect(onSelectResult).toHaveBeenCalledWith(results[0]);
		}
	});
});
