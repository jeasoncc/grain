import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceInterface } from "@/types/workspace";
import {
	ExportDialogManagerContainer,
	exportDialogManager,
} from "./export-dialog-manager.container.fn";

// Mock ExportDialog component
vi.mock("@/components/export-dialog", () => ({
	ExportDialog: vi.fn(({ open, workspaceId, workspaceTitle }) => (
		<div data-testid="export-dialog">
			{open && (
				<div>
					<span data-testid="workspace-id">{workspaceId}</span>
					<span data-testid="workspace-title">{workspaceTitle}</span>
				</div>
			)}
		</div>
	)),
}));

describe("ExportDialogManagerContainer", () => {
	const mockWorkspaces: WorkspaceInterface[] = [
		{
			id: "ws1",
			title: "Workspace 1",
			author: "Test Author",
			description: "Test Description",
			publisher: "Test Publisher",
			language: "en",
			lastOpen: new Date().toISOString(),
			createDate: new Date().toISOString(),
		},
		{
			id: "ws2",
			title: "Workspace 2",
			author: "Test Author",
			description: "Test Description",
			publisher: "Test Publisher",
			language: "en",
			lastOpen: new Date().toISOString(),
			createDate: new Date().toISOString(),
		},
	];

	it("should not render dialog when no workspace is selected", () => {
		const { container } = render(
			<ExportDialogManagerContainer
				selectedWorkspaceId={null}
				workspaces={mockWorkspaces}
			/>,
		);
		expect(container.querySelector('[data-testid="export-dialog"]')).toBeNull();
	});

	it("should render dialog with selected workspace", () => {
		render(
			<ExportDialogManagerContainer
				selectedWorkspaceId="ws1"
				workspaces={mockWorkspaces}
			/>,
		);
		expect(screen.getByTestId("export-dialog")).toBeInTheDocument();
	});

	it("should use selected workspace title", () => {
		exportDialogManager.open("ws1");
		render(
			<ExportDialogManagerContainer
				selectedWorkspaceId="ws1"
				workspaces={mockWorkspaces}
			/>,
		);
		expect(screen.getByTestId("workspace-title")).toHaveTextContent(
			"Workspace 1",
		);
	});

	it("should handle workspace not found", () => {
		exportDialogManager.open("ws-nonexistent");
		render(
			<ExportDialogManagerContainer
				selectedWorkspaceId="ws-nonexistent"
				workspaces={mockWorkspaces}
			/>,
		);
		expect(screen.getByTestId("workspace-title")).toHaveTextContent(
			"Untitled Workspace",
		);
	});

	it("should respond to exportDialogManager.open", () => {
		// Start with closed dialog
		exportDialogManager.close();

		const { rerender } = render(
			<ExportDialogManagerContainer
				selectedWorkspaceId="ws1"
				workspaces={mockWorkspaces}
			/>,
		);

		// Initially closed
		expect(screen.queryByTestId("workspace-id")).not.toBeInTheDocument();

		// Open dialog
		exportDialogManager.open("ws2", "Custom Title");
		rerender(
			<ExportDialogManagerContainer
				selectedWorkspaceId="ws1"
				workspaces={mockWorkspaces}
			/>,
		);

		expect(screen.getByTestId("workspace-id")).toHaveTextContent("ws2");
		expect(screen.getByTestId("workspace-title")).toHaveTextContent(
			"Custom Title",
		);
	});

	it("should respond to exportDialogManager.close", () => {
		exportDialogManager.open("ws1");
		const { rerender } = render(
			<ExportDialogManagerContainer
				selectedWorkspaceId="ws1"
				workspaces={mockWorkspaces}
			/>,
		);

		expect(screen.getByTestId("workspace-id")).toBeInTheDocument();

		exportDialogManager.close();
		rerender(
			<ExportDialogManagerContainer
				selectedWorkspaceId="ws1"
				workspaces={mockWorkspaces}
			/>,
		);

		expect(screen.queryByTestId("workspace-id")).not.toBeInTheDocument();
	});
});
