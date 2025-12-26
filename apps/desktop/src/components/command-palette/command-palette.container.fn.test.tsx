import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandPaletteContainer } from "./command-palette.container.fn";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
	useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock("@/hooks/use-theme", () => ({
	useTheme: vi.fn(() => ({
		theme: "dark",
		setTheme: vi.fn(),
	})),
}));

vi.mock("@/components/export-dialog-manager", () => ({
	exportDialogManager: {
		open: vi.fn(),
	},
}));

vi.mock("@/stores/editor-tabs.store", () => ({
	useEditorTabsStore: vi.fn((selector) => {
		const store = {
			openTab: vi.fn(),
		};
		return selector ? selector(store) : store;
	}),
}));

vi.mock("@/actions/templated", () => ({
	createExcalidrawCompatAsync: vi.fn(() =>
		Promise.resolve({
			node: { id: "node-1", title: "drawing-2024-01-15" },
			content: "{}",
			parsedContent: {},
		}),
	),
}));

describe("CommandPaletteContainer", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		workspaces: [
			{ id: "ws1", title: "Workspace 1" },
			{ id: "ws2", title: "Workspace 2" },
		],
		selectedWorkspaceId: "ws1",
	};

	it("should render without crashing", () => {
		const { container } = render(
			<CommandPaletteContainer {...defaultProps} />,
		);
		expect(container).toBeTruthy();
	});

	it("should pass props to view component", () => {
		const { container } = render(
			<CommandPaletteContainer {...defaultProps} />,
		);
		expect(container).toBeTruthy();
	});

	it("should handle workspace selection", () => {
		const { container } = render(
			<CommandPaletteContainer
				{...defaultProps}
				selectedWorkspaceId="ws2"
			/>,
		);
		expect(container).toBeTruthy();
	});

	it("should handle null workspace selection", () => {
		const { container } = render(
			<CommandPaletteContainer {...defaultProps} selectedWorkspaceId={null} />,
		);
		expect(container).toBeTruthy();
	});
});
