import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ActivityBarContainer } from "./activity-bar.container.fn"

const { mockExportDialog, mockUseActivityBar, mockView } = vi.hoisted(() => ({
	mockExportDialog: vi.fn(),
	mockUseActivityBar: vi.fn(),
	mockView: vi.fn(),
}))

vi.mock("@/hooks/use-activity-bar", () => ({
	useActivityBar: () => mockUseActivityBar(),
}))

vi.mock("./activity-bar.view.fn", () => ({
	ActivityBarView: (props: {
		readonly currentPath: string
		readonly onCreateDiary: () => void
		readonly onNavigate: (path: string) => void
		readonly selectedWorkspaceId: string | null
	}) => {
		mockView(props)
		return (
			<div data-testid="activity-bar-view">
				<span>{props.currentPath}</span>
				<span>{props.selectedWorkspaceId ?? "none"}</span>
				<button type="button" onClick={props.onCreateDiary}>
					Create diary
				</button>
				<button type="button" onClick={() => props.onNavigate("/org")}>
					Open Org
				</button>
			</div>
		)
	},
}))

vi.mock("@/views/export-dialog", () => ({
	ExportDialog: (props: {
		readonly open: boolean
		readonly workspaceId: string
		readonly workspaceTitle?: string
	}) => {
		mockExportDialog(props)
		return <div data-testid="export-dialog">{props.workspaceId}</div>
	},
}))

const workspace = {
	createDate: "2026-01-01T00:00:00.000Z",
	description: "",
	id: "workspace-1",
	lastOpen: "2026-01-02T00:00:00.000Z",
	title: "Writing",
}

const createActivityBarState = (overrides: Record<string, unknown> = {}) => ({
	activePanel: "files",
	currentPath: "/",
	exportDialogOpen: false,
	iconTheme: {},
	isSidebarOpen: true,
	onCreateCode: vi.fn(),
	onCreateDiary: vi.fn(),
	onCreateExcalidraw: vi.fn(),
	onCreateLedger: vi.fn(),
	onCreateMermaid: vi.fn(),
	onCreateNote: vi.fn(),
	onCreatePlantUML: vi.fn(),
	onCreateTodo: vi.fn(),
	onCreateWiki: vi.fn(),
	onCreateWorkspace: vi.fn(),
	onDeleteAllData: vi.fn(),
	onImportFile: vi.fn(),
	onNavigate: vi.fn(),
	onOpenExportDialog: vi.fn(),
	onSelectWorkspace: vi.fn(),
	onSetActivePanel: vi.fn(),
	onToggleSidebar: vi.fn(),
	selectedWorkspaceId: workspace.id,
	setExportDialogOpen: vi.fn(),
	workspaces: [workspace],
	...overrides,
})

describe("ActivityBarContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("passes the current Org shell state and callbacks to the view", () => {
		const state = createActivityBarState()
		mockUseActivityBar.mockReturnValue(state)

		render(<ActivityBarContainer />)

		expect(screen.getByTestId("activity-bar-view")).toHaveTextContent("/")
		expect(screen.getByTestId("activity-bar-view")).toHaveTextContent(workspace.id)
		expect(mockView).toHaveBeenCalledWith(
			expect.objectContaining({
				currentPath: "/",
				selectedWorkspaceId: workspace.id,
				workspaces: [workspace],
			}),
		)
		fireEvent.click(screen.getByRole("button", { name: "Create diary" }))
		fireEvent.click(screen.getByRole("button", { name: "Open Org" }))
		expect(state.onCreateDiary).toHaveBeenCalledOnce()
		expect(state.onNavigate).toHaveBeenCalledWith("/org")
	})

	it("binds the export dialog to the selected workspace", () => {
		const state = createActivityBarState({ exportDialogOpen: true })
		mockUseActivityBar.mockReturnValue(state)

		render(<ActivityBarContainer />)

		expect(mockExportDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				onOpenChange: state.setExportDialogOpen,
				open: true,
				workspaceId: workspace.id,
				workspaceTitle: workspace.title,
			}),
		)
	})

	it("falls back to the first workspace for export when none is selected", () => {
		mockUseActivityBar.mockReturnValue(createActivityBarState({ selectedWorkspaceId: null }))

		render(<ActivityBarContainer />)

		expect(screen.getByTestId("export-dialog")).toHaveTextContent(workspace.id)
		expect(mockExportDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				workspaceId: workspace.id,
				workspaceTitle: workspace.title,
			}),
		)
	})

	it("uses an empty export target when no legacy workspace exists", () => {
		mockUseActivityBar.mockReturnValue(
			createActivityBarState({ selectedWorkspaceId: null, workspaces: [] }),
		)

		render(<ActivityBarContainer />)

		expect(mockExportDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				workspaceId: "",
				workspaceTitle: undefined,
			}),
		)
	})
})
