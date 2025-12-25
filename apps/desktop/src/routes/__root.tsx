import { createRootRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import { createDrawing, deleteDrawing } from "@/actions";
import { ActivityBar } from "@/components/activity-bar/index";
import { GlobalSearchContainer } from "@/components/global-search";
import { BufferSwitcher } from "@/components/buffer-switcher";
import { CommandPalette } from "@/components/command-palette";
import { DevtoolsWrapper } from "@/components/devtools-wrapper";
import { ExportDialogManager } from "@/components/export/export-dialog-manager";
import { FontStyleInjector } from "@/components/font-style-injector";
import { ConfirmProvider } from "@/components/ui/confirm";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { UnifiedSidebarContent } from "@/components/unified-sidebar";
import { autoBackupManager } from "@/db/backup.db.fn";
import type { DrawingInterface } from "@/db/schema";
import { useDrawingsByWorkspace } from "@/hooks/use-drawing";
import { useTagGraph } from "@/hooks/use-tag";
import { initializeTheme } from "@/hooks/use-theme";
import { useAllWorkspaces } from "@/hooks/use-workspace";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useUnifiedSidebarStore } from "@/stores/sidebar.store";

function RootComponent() {
	const navigate = useNavigate();
	const [commandOpen, setCommandOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [bufferSwitcherOpen, setBufferSwitcherOpen] = useState(false);
	const [bufferSwitcherDirection, setBufferSwitcherDirection] = useState<
		"forward" | "backward"
	>("forward");

	// Editor tabs state for buffer switcher
	const tabs = useEditorTabsStore((s) => s.tabs);
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);
	const setActiveTab = useEditorTabsStore((s) => s.setActiveTab);

	// Get current workspace ID
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);

	// Fetch workspaces for command palette
	const workspaces = useAllWorkspaces() ?? [];

	// Fetch drawings and tag graph data
	const drawings = useDrawingsByWorkspace(selectedWorkspaceId) ?? [];
	const tagGraphData = useTagGraph(selectedWorkspaceId ?? undefined) ?? {
		nodes: [],
		edges: [],
	};

	// Sidebar state
	const {
		activePanel,
		isOpen: unifiedSidebarOpen,
		drawingsState,
		searchState,
		setActivePanel,
		toggleSidebar,
		setSelectedDrawingId,
		setSearchQuery,
		setSearchSelectedTypes,
		setSearchShowFilters,
	} = useUnifiedSidebarStore();

	// Handle drawing selection - update store and navigate to canvas
	const handleSelectDrawing = useCallback(
		(drawing: DrawingInterface) => {
			setSelectedDrawingId(drawing.id);
			navigate({ to: "/canvas" });
		},
		[setSelectedDrawingId, navigate],
	);

	// Handle drawing creation
	const handleCreateDrawing = useCallback(async () => {
		if (!selectedWorkspaceId) {
			toast.error("Please select a workspace first");
			return;
		}

		try {
			const result = await createDrawing({
				workspaceId: selectedWorkspaceId,
				name: `Drawing ${drawings.length + 1}`,
			})();

			if (result._tag === "Right") {
				handleSelectDrawing(result.right);
				toast.success("New drawing created");
			} else {
				logger.error("[Root] Failed to create drawing:", result.left);
				toast.error("Failed to create drawing");
			}
		} catch (error) {
			logger.error("[Root] Failed to create drawing:", error);
			toast.error("Failed to create drawing");
		}
	}, [selectedWorkspaceId, drawings.length, handleSelectDrawing]);

	// Handle drawing deletion
	const handleDeleteDrawing = useCallback(
		async (drawingId: string, drawingName: string) => {
			try {
				const result = await deleteDrawing(drawingId)();

				if (result._tag === "Right") {
					toast.success(`Drawing "${drawingName}" deleted`);
				} else {
					logger.error("[Root] Failed to delete drawing:", result.left);
					toast.error("Failed to delete drawing");
				}
			} catch (error) {
				logger.error("[Root] Failed to delete drawing:", error);
				toast.error("Failed to delete drawing");
			}
		},
		[],
	);

	// Search callbacks
	const handleSetSearchQuery = useCallback(
		(query: string) => setSearchQuery(query),
		[setSearchQuery],
	);

	const handleSetSearchSelectedTypes = useCallback(
		(types: string[]) => setSearchSelectedTypes(types),
		[setSearchSelectedTypes],
	);

	const handleSetSearchShowFilters = useCallback(
		(show: boolean) => setSearchShowFilters(show),
		[setSearchShowFilters],
	);

	// 日志：追踪侧边栏状态变化
	useEffect(() => {
		logger.info(
			`[Root] Sidebar state: isOpen=${unifiedSidebarOpen}, activePanel=${activePanel}, willRender=${unifiedSidebarOpen && activePanel !== null}`,
		);
	}, [unifiedSidebarOpen, activePanel]);

	// 初始化主题系统（包括系统主题监听）
	useEffect(() => {
		const cleanup = initializeTheme();
		return () => cleanup?.();
	}, []);

	// 初始化自动备份
	useEffect(() => {
		const enabled = localStorage.getItem("auto-backup-enabled") === "true";
		if (enabled) {
			autoBackupManager.start();
		}
		return () => autoBackupManager.stop();
	}, []);

	// 全局快捷键
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl/Cmd + K 打开命令面板
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				setCommandOpen(true);
			}
			// Ctrl/Cmd + Shift + F 打开搜索面板
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "f") {
				e.preventDefault();
				if (activePanel === "search" && unifiedSidebarOpen) {
					toggleSidebar();
				} else {
					setActivePanel("search");
				}
			}
			// Ctrl/Cmd + B 切换文件面板
			if ((e.ctrlKey || e.metaKey) && e.key === "b") {
				e.preventDefault();
				if (activePanel === "files" && unifiedSidebarOpen) {
					toggleSidebar();
				} else {
					setActivePanel("files");
				}
			}
			// Ctrl + Tab 打开 buffer switcher (forward)
			// Ctrl + Shift + Tab 打开 buffer switcher (backward)
			if (e.ctrlKey && e.key === "Tab") {
				e.preventDefault();
				setBufferSwitcherDirection(e.shiftKey ? "backward" : "forward");
				setBufferSwitcherOpen(true);
			}
		};

		// 监听自定义事件（从命令面板触发）
		const handleOpenSearch = () => setSearchOpen(true);

		window.addEventListener("open-global-search", handleOpenSearch);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("open-global-search", handleOpenSearch);
		};
	}, [activePanel, unifiedSidebarOpen, toggleSidebar, setActivePanel]);

	return (
		<ConfirmProvider>
			<SidebarProvider>
				<Toaster />
				<div className="flex h-screen w-full overflow-hidden bg-background">
					<ActivityBar />
					<div className="flex-1 flex h-full min-w-0 overflow-hidden">
						<PanelGroup direction="horizontal" autoSaveId="grain-main-layout">
							{/* Sidebar Panel - only show when open */}
							{unifiedSidebarOpen && activePanel && (
								<>
									<Panel
										id="sidebar"
										order={1}
										defaultSize={20}
										minSize={15}
										maxSize={40}
										className="bg-sidebar flex flex-col"
									>
										<UnifiedSidebarContent
											activePanel={activePanel}
											workspaceId={selectedWorkspaceId}
											drawings={drawings}
											selectedDrawingId={drawingsState.selectedDrawingId}
											onSelectDrawing={handleSelectDrawing}
											onCreateDrawing={handleCreateDrawing}
											onDeleteDrawing={handleDeleteDrawing}
											tagGraphData={tagGraphData}
											searchState={searchState}
											onSetSearchQuery={handleSetSearchQuery}
											onSetSearchSelectedTypes={handleSetSearchSelectedTypes}
											onSetSearchShowFilters={handleSetSearchShowFilters}
										/>
									</Panel>
									<PanelResizeHandle className="w-[1px] bg-border transition-colors hover:w-1 hover:bg-primary/50 data-[resize-handle-active]:w-1 data-[resize-handle-active]:bg-primary/70 z-10" />
								</>
							)}
							{/* Main Content Panel */}
							<Panel
								id="main"
								order={2}
								defaultSize={80}
								className="bg-background text-foreground min-h-svh transition-colors duration-300 ease-in-out overflow-hidden"
							>
								<div className="flex-1 h-full overflow-auto">
									<Outlet />
								</div>
							</Panel>
						</PanelGroup>
					</div>
				</div>
				{/* 命令面板 */}
				<CommandPalette
					open={commandOpen}
					onOpenChange={setCommandOpen}
					workspaces={workspaces}
					selectedWorkspaceId={selectedWorkspaceId}
				/>
				{/* Global Search */}
				<GlobalSearchContainer open={searchOpen} onOpenChange={setSearchOpen} />
				{/* Buffer Switcher (Emacs-style tab switching) */}
				<BufferSwitcher
					open={bufferSwitcherOpen}
					onOpenChange={setBufferSwitcherOpen}
					tabs={tabs}
					activeTabId={activeTabId}
					onSelectTab={setActiveTab}
					initialDirection={bufferSwitcherDirection}
				/>
				{/* Export对话框管理器 */}
				<ExportDialogManager
					selectedWorkspaceId={selectedWorkspaceId}
					workspaces={workspaces}
				/>
				{/* 字体样式注入 */}
				<FontStyleInjector />
				{/* TanStack Devtools - 仅在开发模式下显示 */}
				{import.meta.env.DEV && <DevtoolsWrapper />}
			</SidebarProvider>
		</ConfirmProvider>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
});
