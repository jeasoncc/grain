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

vi.mock("@/state/sidebar.state", () => ({
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

	it("should render SearchPanelView", async () => {
		const { useSidebarStore } = await import("@/state/sidebar.state");
		vi.mocked(useSidebarStore).mockImplementation((selector: any) => {
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
		});

		render(<SearchPanelContainer />);
		expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
	});

	it("should pass search state to view", async () => {
		const { useSidebarStore } = await import("@/state/sidebar.state");
		vi.mocked(useSidebarStore).mockImplementation((selector: any) => {
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
					type: "node" as const,
					title: "Test Result",
					content: "Test content",
					workspaceTitle: "Workspace",
					excerpt: "Test excerpt",
					score: 1.0,
					highlights: ["Test"],
				},
			]),
		);
		vi.mocked(searchEngine.simpleSearch).mockImplementation(mockSearch);

		const { useSidebarStore } = await import("@/state/sidebar.state");
		vi.mocked(useSidebarStore).mockImplementation((selector: any) => {
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
		vi.mocked(searchEngine.simpleSearch).mockImplementation(mockSearch);

		const { useSidebarStore } = await import("@/state/sidebar.state");
		vi.mocked(useSidebarStore).mockImplementation((selector: any) => {
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
		});

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
		vi.mocked(searchEngine.simpleSearch).mockImplementation(mockSearch);

		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const { useSidebarStore } = await import("@/state/sidebar.state");
		vi.mocked(useSidebarStore).mockImplementation((selector: any) => {
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

	it("should connect to sidebar store actions", async () => {
		const { useSidebarStore } = await import("@/state/sidebar.state");
		vi.mocked(useSidebarStore).mockImplementation((selector: any) => {
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
		});

		render(<SearchPanelContainer />);

		// Verify store is accessed
		expect(useSidebarStore).toHaveBeenCalled();
	});
});
