/**
 * SearchPanelContainer 组件测试
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPanelContainer } from "./search-panel.container.fn";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
	useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock("@/fn/search", () => ({
	searchEngine: {
		simpleSearch: vi.fn(() => Promise.resolve([])),
	},
}));

vi.mock("@/stores/sidebar.store", () => ({
	useSidebarStore: vi.fn((selector) => {
		const state = {
			searchState: {
				query: "",
				selectedTypes: ["node"],
				showFilters: false,
			},
			setSearchQuery: vi.fn(),
			setSearchSelectedTypes: vi.fn(),
			setSearchShowFilters: vi.fn(),
		};
		return selector(state);
	}),
}));

describe("SearchPanelContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render SearchPanelView", () => {
		render(<SearchPanelContainer />);
		expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
	});

	it("should pass search state to view", () => {
		const { useSidebarStore } = require("@/stores/sidebar.store");
		useSidebarStore.mockImplementation((selector: any) => {
			const state = {
				searchState: {
					query: "test query",
					selectedTypes: ["node"],
					showFilters: false,
				},
				setSearchQuery: vi.fn(),
				setSearchSelectedTypes: vi.fn(),
				setSearchShowFilters: vi.fn(),
			};
			return selector(state);
		});

		render(<SearchPanelContainer />);
		expect(screen.getByDisplayValue("test query")).toBeInTheDocument();
	});

	it("should perform search when query changes", async () => {
		const { searchEngine } = await import("@/fn/search");
		const mockSearch = vi.fn(() =>
			Promise.resolve([
				{
					id: "1",
					type: "node",
					title: "Test Result",
					workspaceTitle: "Workspace",
					excerpt: "Test excerpt",
				},
			]),
		);
		(searchEngine.simpleSearch as any) = mockSearch;

		const { useSidebarStore } = require("@/stores/sidebar.store");
		useSidebarStore.mockImplementation((selector: any) => {
			const state = {
				searchState: {
					query: "test",
					selectedTypes: ["node"],
					showFilters: false,
				},
				setSearchQuery: vi.fn(),
				setSearchSelectedTypes: vi.fn(),
				setSearchShowFilters: vi.fn(),
			};
			return selector(state);
		});

		render(<SearchPanelContainer />);

		await waitFor(
			() => {
				expect(mockSearch).toHaveBeenCalledWith("test", {
					types: ["node"],
					limit: 100,
				});
			},
			{ timeout: 500 },
		);
	});

	it("should not search when query is empty", async () => {
		const { searchEngine } = await import("@/fn/search");
		const mockSearch = vi.fn(() => Promise.resolve([]));
		(searchEngine.simpleSearch as any) = mockSearch;

		render(<SearchPanelContainer />);

		await waitFor(
			() => {
				expect(mockSearch).not.toHaveBeenCalled();
			},
			{ timeout: 500 },
		);
	});

	it("should handle search errors gracefully", async () => {
		const { searchEngine } = await import("@/fn/search");
		const mockSearch = vi.fn(() => Promise.reject(new Error("Search failed")));
		(searchEngine.simpleSearch as any) = mockSearch;

		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const { useSidebarStore } = require("@/stores/sidebar.store");
		useSidebarStore.mockImplementation((selector: any) => {
			const state = {
				searchState: {
					query: "test",
					selectedTypes: ["node"],
					showFilters: false,
				},
				setSearchQuery: vi.fn(),
				setSearchSelectedTypes: vi.fn(),
				setSearchShowFilters: vi.fn(),
			};
			return selector(state);
		});

		render(<SearchPanelContainer />);

		await waitFor(
			() => {
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					"Search failed:",
					expect.any(Error),
				);
			},
			{ timeout: 500 },
		);

		consoleErrorSpy.mockRestore();
	});

	it("should connect to sidebar store actions", () => {
		const { useSidebarStore } = require("@/stores/sidebar.store");
		const setSearchQuery = vi.fn();
		const setSearchSelectedTypes = vi.fn();
		const setSearchShowFilters = vi.fn();

		useSidebarStore.mockImplementation((selector: any) => {
			const state = {
				searchState: {
					query: "",
					selectedTypes: ["node"],
					showFilters: false,
				},
				setSearchQuery,
				setSearchSelectedTypes,
				setSearchShowFilters,
			};
			return selector(state);
		});

		render(<SearchPanelContainer />);

		// Verify store is accessed
		expect(useSidebarStore).toHaveBeenCalled();
	});
});
