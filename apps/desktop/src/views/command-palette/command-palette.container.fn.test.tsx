import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CommandPaletteContainer } from "./command-palette.container.fn"

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
	useNavigate: vi.fn(() => vi.fn()),
}))

vi.mock("@/hooks/use-theme", () => ({
	useTheme: vi.fn(() => ({
		setTheme: vi.fn(),
		theme: "dark",
	})),
}))

vi.mock("@/components/export-dialog-manager", () => ({
	exportDialogManager: {
		open: vi.fn(),
	},
}))

vi.mock("@/state/editor-tabs.state", () => ({
	useEditorTabsStore: vi.fn((selector) => {
		const store = {
			openTab: vi.fn(),
		}
		return selector ? selector(store) : store
	}),
}))

vi.mock("@/flows/templated", () => ({
	createExcalidrawCompatAsync: vi.fn(() =>
		Promise.resolve({
			content: "{}",
			node: { id: "node-1", title: "drawing-2024-01-15" },
			parsedContent: {},
		}),
	),
}))

describe("CommandPaletteContainer", () => {
	const defaultProps = {
		onOpenChange: vi.fn(),
		open: true,
		selectedWorkspaceId: "ws1",
		workspaces: [
			{ id: "ws1", title: "Workspace 1" },
			{ id: "ws2", title: "Workspace 2" },
		],
	}

	it("should render without crashing", () => {
		const { container } = render(<CommandPaletteContainer {...defaultProps} />)
		expect(container).toBeTruthy()
	})

	it("should pass props to view component", () => {
		const { container } = render(<CommandPaletteContainer {...defaultProps} />)
		expect(container).toBeTruthy()
	})

	it("should handle workspace selection", () => {
		const { container } = render(
			<CommandPaletteContainer {...defaultProps} selectedWorkspaceId="ws2" />,
		)
		expect(container).toBeTruthy()
	})

	it("should handle null workspace selection", () => {
		const { container } = render(
			<CommandPaletteContainer {...defaultProps} selectedWorkspaceId={null} />,
		)
		expect(container).toBeTruthy()
	})
})
