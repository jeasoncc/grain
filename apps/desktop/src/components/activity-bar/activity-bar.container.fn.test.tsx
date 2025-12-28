/**
 * @file activity-bar.container.fn.test.tsx
 * @description ActivityBarContainer 组件单元测试
 *
 * 测试覆盖：
 * - 数据获取和传递
 * - 回调函数调用
 * - 与 hooks 和 stores 的集成
 * - 初始化逻辑
 * - 错误处理
 *
 * Mock 策略：
 * - 使用可配置的 mock 状态变量控制 store 返回值
 * - 所有外部依赖（hooks, stores, actions）都被 mock
 * - View 组件被 mock 为简单的按钮集合以便测试回调
 *
 * @requirements 7.2
 */

import { render, screen, waitFor } from "@testing-library/react";
import * as E from "fp-ts/Either";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IconTheme } from "@/types/icon-theme";
import type { WorkspaceInterface } from "@/types/workspace";
import { ActivityBarContainer } from "./activity-bar.container.fn";
import type { ActivityBarProps } from "./activity-bar.types";

// ============================================================================
// Mock State (可配置)
// ============================================================================

let mockSelectedWorkspaceId: string | null = null;

// ============================================================================
// Hoisted Mocks (必须在 vi.mock 之前定义)
// ============================================================================

const {
	mockNavigate,
	mockConfirm,
	mockAddWorkspace,
	mockClearAllData,
	mockTouchWorkspace,
	mockUseAllWorkspaces,
	mockUseIconTheme,
	mockCreateLedgerCompatAsync,
	mockCreateDiaryCompatAsync,
	mockCreateWikiCompatAsync,
	mockSetSelectedWorkspaceId,
	mockSetSelectedNodeId,
	mockSetActivePanel,
	mockToggleSidebar,
	mockOpenTab,
	mockUpdateEditorState,
} = vi.hoisted(() => ({
	mockNavigate: vi.fn(),
	mockConfirm: vi.fn(),
	mockAddWorkspace: vi.fn(),
	mockClearAllData: vi.fn(),
	mockTouchWorkspace: vi.fn(),
	mockUseAllWorkspaces: vi.fn(),
	mockUseIconTheme: vi.fn(),
	mockCreateLedgerCompatAsync: vi.fn(),
	mockCreateDiaryCompatAsync: vi.fn(),
	mockCreateWikiCompatAsync: vi.fn(),
	mockSetSelectedWorkspaceId: vi.fn(),
	mockSetSelectedNodeId: vi.fn(),
	mockSetActivePanel: vi.fn(),
	mockToggleSidebar: vi.fn(),
	mockOpenTab: vi.fn(),
	mockUpdateEditorState: vi.fn(),
}));

const mockLocation = { pathname: "/" };

// ============================================================================
// Mocks
// ============================================================================

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
	useLocation: () => mockLocation,
	useNavigate: () => mockNavigate,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

// Mock confirm dialog
vi.mock("@/components/ui/confirm", () => ({
	useConfirm: () => mockConfirm,
}));

// Mock ExportDialog component
vi.mock("@/components/blocks/export-dialog", () => ({
	ExportDialog: ({ open }: { open: boolean }) => (
		<div data-testid="export-dialog">{open ? "Open" : "Closed"}</div>
	),
}));

// Mock database functions
vi.mock("@/db", () => ({
	addWorkspace: mockAddWorkspace,
	clearAllData: mockClearAllData,
	touchWorkspace: mockTouchWorkspace,
}));

// Mock hooks
vi.mock("@/hooks/use-workspace", () => ({
	useAllWorkspaces: () => mockUseAllWorkspaces(),
}));

vi.mock("@/hooks/use-icon-theme", () => ({
	useIconTheme: () => mockUseIconTheme(),
}));

// Mock actions
vi.mock("@/actions/templated/create-ledger.action", () => ({
	createLedgerCompatAsync: mockCreateLedgerCompatAsync,
}));

vi.mock("@/actions/templated/create-wiki.action", () => ({
	createWikiCompatAsync: mockCreateWikiCompatAsync,
}));

vi.mock("@/actions/templated/create-diary.action", () => ({
	createDiaryCompatAsync: mockCreateDiaryCompatAsync,
}));

// Mock stores
vi.mock("@/stores/selection.store", () => ({
	useSelectionStore: (selector: (state: any) => any) => {
		const state = {
			selectedWorkspaceId: mockSelectedWorkspaceId,
			setSelectedWorkspaceId: mockSetSelectedWorkspaceId,
			setSelectedNodeId: mockSetSelectedNodeId,
		};
		return selector ? selector(state) : state;
	},
}));

vi.mock("@/stores/sidebar.store", () => ({
	useSidebarStore: () => ({
		activePanel: "files",
		isOpen: true,
		setActivePanel: mockSetActivePanel,
		toggleSidebar: mockToggleSidebar,
	}),
}));

vi.mock("@/stores/editor-tabs.store", () => ({
	useEditorTabsStore: (selector: (state: any) => any) => {
		const state = {
			openTab: mockOpenTab,
			updateEditorState: mockUpdateEditorState,
		};
		return selector ? selector(state) : state;
	},
}));

// Mock ActivityBarView
vi.mock("./activity-bar.view.fn", () => ({
	ActivityBarView: (props: ActivityBarProps) => (
		<div data-testid="activity-bar-view">
			<button onClick={() => props.onSelectWorkspace("ws-1")}>
				Select Workspace
			</button>
			<button onClick={() => props.onCreateWorkspace("New Workspace")}>
				Create Workspace
			</button>
			<button onClick={() => props.onCreateDiary()}>Create Diary</button>
			<button onClick={() => props.onCreateWiki()}>Create Wiki</button>
			<button onClick={() => props.onCreateLedger()}>Create Ledger</button>
			<button onClick={() => props.onImportFile(new File([], "test.json"))}>
				Import File
			</button>
			<button onClick={() => props.onOpenExportDialog()}>Export</button>
			<button onClick={() => props.onDeleteAllData()}>Delete All</button>
			<button onClick={() => props.onNavigate("/settings")}>Navigate</button>
			<button onClick={() => props.onSetActivePanel("search")}>
				Set Panel
			</button>
			<button onClick={() => props.onToggleSidebar()}>Toggle Sidebar</button>
		</div>
	),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createTestWorkspace(
	overrides: Partial<WorkspaceInterface> = {},
): WorkspaceInterface {
	return {
		id: overrides.id ?? "workspace-1",
		title: overrides.title ?? "Test Workspace",
		author: overrides.author ?? "",
		description: overrides.description ?? "",
		publisher: overrides.publisher ?? "",
		language: overrides.language ?? "zh-CN",
		createDate: overrides.createDate ?? new Date().toISOString(),
		lastOpen: overrides.lastOpen ?? new Date().toISOString(),
		members: overrides.members ?? [],
		owner: overrides.owner ?? undefined,
	};
}

function createTestIconTheme(): IconTheme {
	return {
		key: "test-theme",
		name: "Test Theme",
		description: "Test theme for testing",
		icons: {
			project: { default: {} as any },
			folder: { default: {} as any },
			file: { default: {} as any },
			character: { default: {} as any },
			world: { default: {} as any },
			activityBar: {
				library: {} as any,
				search: {} as any,
				outline: {} as any,
				canvas: {} as any,
				chapters: {} as any,
				files: {} as any,
				diary: {} as any,
				ledger: {} as any,
				todo: {} as any,
				note: {} as any,
				tags: {} as any,
				statistics: {} as any,
				settings: {} as any,
				create: {} as any,
				import: {} as any,
				export: {} as any,
				more: {} as any,
				mermaid: {} as any,
				plantuml: {} as any,
			},
			settingsPage: {
				appearance: {} as any,
				icons: {} as any,
				diagrams: {} as any,
				general: {} as any,
				editor: {} as any,
				data: {} as any,
				export: {} as any,
				scroll: {} as any,
				logs: {} as any,
				about: {} as any,
			},
		},
	};
}

/**
 * 渲染带有选中工作区的组件
 */
function renderWithSelectedWorkspace(workspaceId: string) {
	mockSelectedWorkspaceId = workspaceId;
	mockUseAllWorkspaces.mockReturnValue([
		createTestWorkspace({ id: workspaceId }),
	]);
	return render(<ActivityBarContainer />);
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("ActivityBarContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// 重置 mock 状态
		mockSelectedWorkspaceId = null;

		// 设置默认 mock 返回值
		mockUseAllWorkspaces.mockReturnValue([]);
		mockUseIconTheme.mockReturnValue(createTestIconTheme());
		mockAddWorkspace.mockReturnValue(() =>
			Promise.resolve(E.right({ id: "new-ws" })),
		);
		mockClearAllData.mockReturnValue(() => Promise.resolve(E.right(undefined)));
		mockTouchWorkspace.mockReturnValue(() =>
			Promise.resolve(E.right(undefined)),
		);
		mockConfirm.mockResolvedValue(false);
	});

	describe("数据获取和传递", () => {
		it("should fetch workspaces and pass to view", () => {
			const workspaces = [
				createTestWorkspace({ id: "ws-1", title: "Workspace 1" }),
				createTestWorkspace({ id: "ws-2", title: "Workspace 2" }),
			];
			mockUseAllWorkspaces.mockReturnValue(workspaces);

			render(<ActivityBarContainer />);

			expect(mockUseAllWorkspaces).toHaveBeenCalled();
			expect(screen.getByTestId("activity-bar-view")).toBeInTheDocument();
		});

		it("should pass icon theme to view", () => {
			const iconTheme = createTestIconTheme();
			mockUseIconTheme.mockReturnValue(iconTheme);

			render(<ActivityBarContainer />);

			expect(mockUseIconTheme).toHaveBeenCalled();
		});

		it("should handle undefined workspaces", () => {
			mockUseAllWorkspaces.mockReturnValue(undefined);

			render(<ActivityBarContainer />);

			expect(screen.getByTestId("activity-bar-view")).toBeInTheDocument();
		});
	});

	describe("初始化逻辑", () => {
		it("should create default workspace when no workspaces exist", async () => {
			mockUseAllWorkspaces.mockReturnValue([]);
			mockAddWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right({ id: "default-ws" })),
			);

			render(<ActivityBarContainer />);

			await waitFor(() => {
				expect(mockAddWorkspace).toHaveBeenCalledWith("My Workspace", {
					author: "",
					description: "",
					language: "en",
				});
			});

			await waitFor(() => {
				expect(mockSetSelectedWorkspaceId).toHaveBeenCalledWith("default-ws");
			});

			await waitFor(() => {
				expect(mockSetActivePanel).toHaveBeenCalledWith("files");
			});
		});

		it("should select most recently opened workspace on init", async () => {
			const workspaces = [
				createTestWorkspace({
					id: "ws-1",
					lastOpen: "2024-01-01T00:00:00.000Z",
				}),
				createTestWorkspace({
					id: "ws-2",
					lastOpen: "2024-01-02T00:00:00.000Z",
				}),
			];
			mockUseAllWorkspaces.mockReturnValue(workspaces);

			render(<ActivityBarContainer />);

			await waitFor(() => {
				expect(mockSetSelectedWorkspaceId).toHaveBeenCalledWith("ws-2");
			});
		});

		it("should touch workspace on init when workspace is already selected", async () => {
			const workspaces = [createTestWorkspace({ id: "ws-1" })];
			mockSelectedWorkspaceId = "ws-1";
			mockUseAllWorkspaces.mockReturnValue(workspaces);

			render(<ActivityBarContainer />);

			await waitFor(() => {
				expect(mockTouchWorkspace).toHaveBeenCalledWith("ws-1");
			});
		});
	});

	describe("工作区操作", () => {
		it("should handle workspace selection", async () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);

			render(<ActivityBarContainer />);

			const selectButton = screen.getByText("Select Workspace");
			selectButton.click();

			await waitFor(() => {
				expect(mockSetSelectedWorkspaceId).toHaveBeenCalledWith("ws-1");
			});

			await waitFor(() => {
				expect(mockTouchWorkspace).toHaveBeenCalledWith("ws-1");
			});
		});

		it("should handle workspace creation", async () => {
			mockUseAllWorkspaces.mockReturnValue([]);
			mockAddWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right({ id: "new-ws" })),
			);

			render(<ActivityBarContainer />);

			const createButton = screen.getByText("Create Workspace");
			createButton.click();

			await waitFor(() => {
				expect(mockAddWorkspace).toHaveBeenCalledWith("New Workspace", {
					author: "",
					description: "",
					language: "en",
				});
			});

			await waitFor(() => {
				expect(mockSetSelectedWorkspaceId).toHaveBeenCalledWith("new-ws");
			});
		});

		it("should handle workspace creation failure", async () => {
			mockUseAllWorkspaces.mockReturnValue([]);
			mockAddWorkspace.mockReturnValue(() =>
				Promise.resolve(
					E.left({ type: "DB_ERROR" as const, message: "Failed" }),
				),
			);

			const { toast } = await import("sonner");

			render(<ActivityBarContainer />);

			const createButton = screen.getByText("Create Workspace");
			createButton.click();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to create workspace");
			});
		});
	});

	describe("文件创建操作", () => {
		/**
		 * Property 1: Diary creation triggers correct function call
		 * *For any* workspace ID and date, when `handleCreateDiary` is called,
		 * `createDiaryCompatAsync` should be called with the correct workspace ID and current date.
		 * **Validates: Requirements 1.1**
		 */
		it("should call createDiaryCompatAsync with correct params when creating diary", async () => {
			renderWithSelectedWorkspace("ws-1");

			mockCreateDiaryCompatAsync.mockResolvedValue({
				node: { id: "diary-1", title: "Diary", type: "diary" },
				content: "{}",
				parsedContent: {},
			});

			const diaryButton = screen.getByText("Create Diary");
			diaryButton.click();

			await waitFor(() => {
				expect(mockCreateDiaryCompatAsync).toHaveBeenCalledWith({
					workspaceId: "ws-1",
					date: expect.any(Date),
				});
			});
		});

		/**
		 * Property 3: Successful creation opens file in EditorTabs
		 * *For any* successful templated file creation (Diary, Wiki, or Ledger),
		 * the `openTab` function should be called with the correct node information.
		 * **Validates: Requirements 1.2**
		 */
		it("should open tab after successful diary creation", async () => {
			renderWithSelectedWorkspace("ws-1");

			mockCreateDiaryCompatAsync.mockResolvedValue({
				node: { id: "diary-1", title: "Diary 2024-12-27", type: "diary" },
				content: "{}",
				parsedContent: { root: { children: [] } },
			});

			const { toast } = await import("sonner");

			const diaryButton = screen.getByText("Create Diary");
			diaryButton.click();

			await waitFor(() => {
				expect(mockOpenTab).toHaveBeenCalledWith({
					workspaceId: "ws-1",
					nodeId: "diary-1",
					title: "Diary 2024-12-27",
					type: "diary",
				});
			});

			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith("Diary created");
			});
		});

		/**
		 * 测试 Diary 创建后预加载编辑器内容
		 * **Validates: Requirements 1.2, 3.1**
		 */
		it("should preload editor content after diary creation", async () => {
			renderWithSelectedWorkspace("ws-1");

			const parsedContent = { root: { children: [] } };
			mockCreateDiaryCompatAsync.mockResolvedValue({
				node: { id: "diary-1", title: "Diary 2024-12-27", type: "diary" },
				content: "{}",
				parsedContent,
			});

			const diaryButton = screen.getByText("Create Diary");
			diaryButton.click();

			await waitFor(() => {
				expect(mockUpdateEditorState).toHaveBeenCalledWith("diary-1", {
					serializedState: parsedContent,
				});
			});
		});

		/**
		 * 测试 Diary 创建后选中文件树中的新文件
		 * **Validates: Requirements 1.3**
		 */
		it("should select new file in file tree after diary creation", async () => {
			renderWithSelectedWorkspace("ws-1");

			mockCreateDiaryCompatAsync.mockResolvedValue({
				node: { id: "diary-1", title: "Diary 2024-12-27", type: "diary" },
				content: "{}",
				parsedContent: {},
			});

			const diaryButton = screen.getByText("Create Diary");
			diaryButton.click();

			await waitFor(() => {
				expect(mockSetSelectedNodeId).toHaveBeenCalledWith("diary-1");
			});
		});

		/**
		 * 测试 Diary 创建失败时的错误处理
		 * **Validates: Requirements 1.4**
		 */
		it("should handle diary creation failure", async () => {
			renderWithSelectedWorkspace("ws-1");

			mockCreateDiaryCompatAsync.mockRejectedValue(
				new Error("Failed to create diary"),
			);

			const { toast } = await import("sonner");

			const diaryButton = screen.getByText("Create Diary");
			diaryButton.click();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to create diary");
			});
		});

		it("should handle wiki creation", async () => {
			renderWithSelectedWorkspace("ws-1");

			mockCreateWikiCompatAsync.mockResolvedValue({
				node: { id: "wiki-1", title: "Wiki", type: "file" },
				content: "{}",
				parsedContent: {},
			});

			const { toast } = await import("sonner");

			const wikiButton = screen.getByText("Create Wiki");
			wikiButton.click();

			await waitFor(() => {
				expect(mockCreateWikiCompatAsync).toHaveBeenCalledWith({
					workspaceId: "ws-1",
					date: expect.any(Date),
				});
			});

			await waitFor(() => {
				expect(mockOpenTab).toHaveBeenCalledWith({
					workspaceId: "ws-1",
					nodeId: "wiki-1",
					title: "Wiki",
					type: "file",
				});
			});

			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith("Wiki created");
			});
		});

		it("should handle wiki creation failure", async () => {
			renderWithSelectedWorkspace("ws-1");

			mockCreateWikiCompatAsync.mockRejectedValue(
				new Error("Failed to create wiki"),
			);

			const { toast } = await import("sonner");

			const wikiButton = screen.getByText("Create Wiki");
			wikiButton.click();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to create wiki");
			});
		});

		it("should handle ledger creation", async () => {
			renderWithSelectedWorkspace("ws-1");

			mockCreateLedgerCompatAsync.mockResolvedValue({
				node: { id: "ledger-1", title: "Ledger", type: "ledger" },
				content: "{}",
				parsedContent: {},
			});

			const { toast } = await import("sonner");

			const ledgerButton = screen.getByText("Create Ledger");
			ledgerButton.click();

			await waitFor(() => {
				expect(mockCreateLedgerCompatAsync).toHaveBeenCalledWith({
					workspaceId: "ws-1",
					date: expect.any(Date),
				});
			});

			await waitFor(() => {
				expect(mockOpenTab).toHaveBeenCalledWith({
					workspaceId: "ws-1",
					nodeId: "ledger-1",
					title: "Ledger",
					type: "ledger",
				});
			});

			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith("Ledger created");
			});
		});

		it("should handle ledger creation failure", async () => {
			renderWithSelectedWorkspace("ws-1");

			mockCreateLedgerCompatAsync.mockRejectedValue(
				new Error("Failed to create ledger"),
			);

			const { toast } = await import("sonner");

			const ledgerButton = screen.getByText("Create Ledger");
			ledgerButton.click();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Failed to create ledger");
			});
		});

		it("should show error when creating diary without workspace", async () => {
			mockUseAllWorkspaces.mockReturnValue([]);

			const { toast } = await import("sonner");

			render(<ActivityBarContainer />);

			const diaryButton = screen.getByText("Create Diary");
			diaryButton.click();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"Please select a workspace first",
				);
			});

			// 确保没有调用创建函数
			expect(mockCreateDiaryCompatAsync).not.toHaveBeenCalled();
		});

		it("should show error when creating ledger without workspace", async () => {
			mockUseAllWorkspaces.mockReturnValue([]);

			const { toast } = await import("sonner");

			render(<ActivityBarContainer />);

			const ledgerButton = screen.getByText("Create Ledger");
			ledgerButton.click();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith(
					"Please select a workspace first",
				);
			});

			// 确保没有调用创建函数
			expect(mockCreateLedgerCompatAsync).not.toHaveBeenCalled();
		});
	});

	describe("导入导出操作", () => {
		it("should show info message for import", async () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);

			const { toast } = await import("sonner");

			render(<ActivityBarContainer />);

			const importButton = screen.getByText("Import File");
			importButton.click();

			await waitFor(() => {
				expect(toast.info).toHaveBeenCalledWith(
					"Import functionality is being reimplemented",
				);
			});
		});

		it("should open export dialog", () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);

			render(<ActivityBarContainer />);

			const exportButton = screen.getByText("Export");
			exportButton.click();

			expect(screen.getByTestId("export-dialog")).toHaveTextContent("Open");
		});
	});

	describe("数据删除操作", () => {
		it("should handle delete all data when confirmed", async () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);
			mockConfirm.mockResolvedValue(true);

			const { toast } = await import("sonner");

			// 保存原始值
			const originalLocation = window.location;
			const reloadMock = vi.fn();

			// Mock window.location.reload
			Object.defineProperty(window, "location", {
				value: { reload: reloadMock },
				writable: true,
				configurable: true,
			});

			render(<ActivityBarContainer />);

			const deleteButton = screen.getByText("Delete All");
			deleteButton.click();

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalledWith({
					title: "Delete all data?",
					description: expect.any(String),
					confirmText: "Delete",
					cancelText: "Cancel",
				});
			});

			await waitFor(() => {
				expect(mockClearAllData).toHaveBeenCalled();
			});

			await waitFor(() => {
				expect(mockSetSelectedWorkspaceId).toHaveBeenCalledWith(null);
			});

			await waitFor(() => {
				expect(mockSetSelectedNodeId).toHaveBeenCalledWith(null);
			});

			await waitFor(() => {
				expect(toast.success).toHaveBeenCalledWith("All data deleted");
			});

			// 恢复原始值
			Object.defineProperty(window, "location", {
				value: originalLocation,
				writable: true,
				configurable: true,
			});
		});

		it("should handle delete failure", async () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);
			mockConfirm.mockResolvedValue(true);
			mockClearAllData.mockReturnValue(() =>
				Promise.resolve(
					E.left({ type: "DB_ERROR" as const, message: "Failed" }),
				),
			);

			const { toast } = await import("sonner");

			render(<ActivityBarContainer />);

			const deleteButton = screen.getByText("Delete All");
			deleteButton.click();

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Delete failed");
			});
		});

		it("should not delete when not confirmed", async () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);
			mockConfirm.mockResolvedValue(false);

			render(<ActivityBarContainer />);

			const deleteButton = screen.getByText("Delete All");
			deleteButton.click();

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalled();
			});

			// 等待一小段时间确保没有调用删除
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(mockClearAllData).not.toHaveBeenCalled();
		});
	});

	describe("导航操作", () => {
		it("should handle navigation", () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);

			render(<ActivityBarContainer />);

			const navigateButton = screen.getByText("Navigate");
			navigateButton.click();

			expect(mockNavigate).toHaveBeenCalledWith({ to: "/settings" });
		});
	});

	describe("侧边栏操作", () => {
		it("should handle panel change", () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);

			render(<ActivityBarContainer />);

			const panelButton = screen.getByText("Set Panel");
			panelButton.click();

			expect(mockSetActivePanel).toHaveBeenCalledWith("search");
		});

		it("should handle sidebar toggle", () => {
			mockUseAllWorkspaces.mockReturnValue([createTestWorkspace()]);

			render(<ActivityBarContainer />);

			const toggleButton = screen.getByText("Toggle Sidebar");
			toggleButton.click();

			expect(mockToggleSidebar).toHaveBeenCalled();
		});
	});
});
