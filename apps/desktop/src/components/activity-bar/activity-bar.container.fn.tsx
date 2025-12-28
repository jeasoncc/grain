/**
 * @file activity-bar.container.fn.tsx
 * @description ActivityBar 容器组件（编排层）
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 将数据通过 props 传递给纯展示组件 ActivityBarView。
 */

import { useLocation, useNavigate } from "@tanstack/react-router";
import * as E from "fp-ts/Either";
import type { SerializedEditorState } from "lexical";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	createDiaryCompatAsync,
	createLedgerCompatAsync,
	createNoteCompatAsync,
	createTodoCompatAsync,
	createWikiCompatAsync,
} from "@/actions/templated/create-date-template.action";
import { createExcalidrawCompatAsync } from "@/actions/templated/create-excalidraw.action";
import type { TemplatedFileResult } from "@/actions/templated/create-templated-file.action";
import { ExportDialog } from "@/components/export-dialog";
import { useConfirm } from "@/components/ui/confirm";
import { addWorkspace, clearAllData, touchWorkspace } from "@/db";
import { calculateExpandedFoldersForNode } from "@/fn/node";
import { useIconTheme } from "@/hooks/use-icon-theme";
import { useNodesByWorkspace } from "@/hooks/use-node";
import { useAllWorkspaces } from "@/hooks/use-workspace";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useSidebarStore } from "@/stores/sidebar.store";
import type { WorkspaceInterface } from "@/types/workspace";

import { ActivityBarView } from "./activity-bar.view.fn";

// ==============================
// Types
// ==============================

/**
 * 模板文件创建函数类型
 */
type TemplateCreator = (params: {
	workspaceId: string;
	date: Date;
}) => Promise<TemplatedFileResult>;

/**
 * 创建模板文件的选项
 */
interface CreateTemplateOptions {
	readonly creator: TemplateCreator;
	readonly successMessage: string;
	readonly errorMessage: string;
	readonly preloadContent?: boolean;
}

/**
 * ActivityBar 容器组件
 */
export function ActivityBarContainer(): React.ReactElement {
	const location = useLocation();
	const navigate = useNavigate();
	const confirm = useConfirm();

	// ==============================
	// 数据获取
	// ==============================

	const workspacesRaw = useAllWorkspaces();
	const workspaces = workspacesRaw ?? [];

	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
	const setSelectedWorkspaceId = useSelectionStore(
		(s) => s.setSelectedWorkspaceId,
	);
	const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId);

	// 获取当前工作区的所有节点（用于计算展开路径）
	const nodes = useNodesByWorkspace(selectedWorkspaceId);

	const {
		activePanel,
		isOpen: isSidebarOpen,
		setActivePanel,
		toggleSidebar,
		setExpandedFolders,
	} = useSidebarStore();

	const iconTheme = useIconTheme();

	// ==============================
	// 初始化逻辑
	// ==============================

	const hasInitializedRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 初始化逻辑只在 workspacesRaw 变化时运行一次
	useEffect(() => {
		const initializeWorkspace = async () => {
			if (workspacesRaw === undefined) return;
			if (hasInitializedRef.current) return;
			hasInitializedRef.current = true;

			if (workspaces.length === 0) {
				if (selectedWorkspaceId) {
					setSelectedWorkspaceId(null);
				}
				try {
					const result = await addWorkspace("My Workspace", {
						author: "",
						description: "",
						language: "en",
					})();
					if (E.isRight(result)) {
						setSelectedWorkspaceId(result.right.id);
						setActivePanel("files");
					}
				} catch (error) {
					console.error("Failed to create default workspace:", error);
				}
				return;
			}

			const isSelectedValid =
				selectedWorkspaceId &&
				workspaces.some(
					(w: WorkspaceInterface) => w.id === selectedWorkspaceId,
				);

			if (!isSelectedValid) {
				const sortedByLastOpen = [...workspaces].sort((a, b) => {
					const dateA = new Date(a.lastOpen || a.createDate).getTime();
					const dateB = new Date(b.lastOpen || b.createDate).getTime();
					return dateB - dateA;
				});
				setSelectedWorkspaceId(sortedByLastOpen[0].id);
			} else {
				try {
					await touchWorkspace(selectedWorkspaceId)();
				} catch (error) {
					console.error("Failed to update lastOpen on init:", error);
				}
			}
		};
		initializeWorkspace();
	}, [workspacesRaw]);

	// ==============================
	// 导出对话框状态
	// ==============================

	const [exportDialogOpen, setExportDialogOpen] = useState(false);

	// ==============================
	// 回调函数
	// ==============================

	const handleSelectWorkspace = useCallback(
		async (workspaceId: string) => {
			setSelectedWorkspaceId(workspaceId);
			try {
				await touchWorkspace(workspaceId)();
			} catch (error) {
				console.error("Failed to update lastOpen:", error);
			}
			toast.success("Workspace selected");
		},
		[setSelectedWorkspaceId],
	);

	const handleCreateWorkspace = useCallback(
		async (name: string) => {
			if (!name.trim()) {
				toast.error("Please enter a workspace name");
				return;
			}
			try {
				const result = await addWorkspace(name.trim(), {
					author: "",
					description: "",
					language: "en",
				})();
				if (E.isRight(result)) {
					setSelectedWorkspaceId(result.right.id);
					toast.success("Workspace created");
				} else {
					toast.error("Failed to create workspace");
				}
			} catch {
				toast.error("Failed to create workspace");
			}
		},
		[setSelectedWorkspaceId],
	);

	const openTab = useEditorTabsStore((s) => s.openTab);
	const updateEditorState = useEditorTabsStore((s) => s.updateEditorState);

	/**
	 * 通用的模板文件创建处理函数
	 *
	 * 消除 handleCreateDiary/Wiki/Todo/Note/Ledger 的重复代码。
	 * 创建文件后：
	 * 1. 打开新标签页
	 * 2. 预加载编辑器内容（可选）
	 * 3. 选中新文件
	 * 4. 展开文件路径，关闭其他文件夹
	 * 5. 导航到主页面
	 */
	const handleCreateTemplate = useCallback(
		async (options: CreateTemplateOptions) => {
			if (!selectedWorkspaceId) {
				toast.error("Please select a workspace first");
				return;
			}

			const {
				creator,
				successMessage,
				errorMessage,
				preloadContent = true,
			} = options;

			try {
				const result = await creator({
					workspaceId: selectedWorkspaceId,
					date: new Date(),
				});

				// 1. 打开新创建的文件标签页
				openTab({
					workspaceId: selectedWorkspaceId,
					nodeId: result.node.id,
					title: result.node.title,
					type: result.node.type,
				});

				// 2. 预加载内容到编辑器状态（Excalidraw 不需要）
				if (preloadContent && result.parsedContent) {
					updateEditorState(result.node.id, {
						serializedState: result.parsedContent as SerializedEditorState,
					});
				}

				// 3. 在文件树中选中新创建的文件
				setSelectedNodeId(result.node.id);

				// 4. 展开文件路径，关闭其他文件夹
				if (nodes) {
					const expandedFolders = calculateExpandedFoldersForNode(
						nodes,
						result.node.id,
					);
					setExpandedFolders(expandedFolders);
				}

				// 5. 导航到主页面（如果当前不在主页面）
				if (location.pathname !== "/") {
					navigate({ to: "/" });
				}

				toast.success(successMessage);
			} catch (error) {
				console.error("Failed to create template:", error);
				toast.error(errorMessage);
			}
		},
		[
			selectedWorkspaceId,
			openTab,
			updateEditorState,
			setSelectedNodeId,
			nodes,
			setExpandedFolders,
			navigate,
			location.pathname,
		],
	);

	const handleCreateDiary = useCallback(
		() =>
			handleCreateTemplate({
				creator: createDiaryCompatAsync,
				successMessage: "Diary created",
				errorMessage: "Failed to create diary",
			}),
		[handleCreateTemplate],
	);

	const handleCreateWiki = useCallback(
		() =>
			handleCreateTemplate({
				creator: createWikiCompatAsync,
				successMessage: "Wiki created",
				errorMessage: "Failed to create wiki",
			}),
		[handleCreateTemplate],
	);

	const handleCreateLedger = useCallback(
		() =>
			handleCreateTemplate({
				creator: createLedgerCompatAsync,
				successMessage: "Ledger created",
				errorMessage: "Failed to create ledger",
			}),
		[handleCreateTemplate],
	);

	const handleCreateTodo = useCallback(
		() =>
			handleCreateTemplate({
				creator: createTodoCompatAsync,
				successMessage: "Todo created",
				errorMessage: "Failed to create todo",
			}),
		[handleCreateTemplate],
	);

	const handleCreateNote = useCallback(
		() =>
			handleCreateTemplate({
				creator: createNoteCompatAsync,
				successMessage: "Note created",
				errorMessage: "Failed to create note",
			}),
		[handleCreateTemplate],
	);

	const handleCreateExcalidraw = useCallback(
		() =>
			handleCreateTemplate({
				creator: createExcalidrawCompatAsync,
				successMessage: "Excalidraw created",
				errorMessage: "Failed to create excalidraw",
				preloadContent: false,
			}),
		[handleCreateTemplate],
	);

	const handleImportFile = useCallback(async (_file: File) => {
		try {
			toast.info("Import functionality is being reimplemented");
		} catch {
			toast.error("Import failed");
		}
	}, []);

	const handleOpenExportDialog = useCallback(() => {
		setExportDialogOpen(true);
	}, []);

	const handleDeleteAllData = useCallback(async () => {
		const ok = await confirm({
			title: "Delete all data?",
			description:
				"This action cannot be undone. All workspaces, files, and data will be deleted.",
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!ok) return;
		try {
			await clearAllData()();
			setSelectedWorkspaceId(null);
			setSelectedNodeId(null);
			hasInitializedRef.current = false;
			toast.success("All data deleted");
			setTimeout(() => window.location.reload(), 1000);
		} catch {
			toast.error("Delete failed");
		}
	}, [confirm, setSelectedWorkspaceId, setSelectedNodeId]);

	const handleNavigate = useCallback(
		(path: string) => {
			navigate({ to: path });
		},
		[navigate],
	);

	// ==============================
	// 渲染
	// ==============================

	return (
		<>
			<ActivityBarView
				workspaces={workspaces}
				selectedWorkspaceId={selectedWorkspaceId}
				activePanel={activePanel}
				isSidebarOpen={isSidebarOpen}
				iconTheme={iconTheme}
				currentPath={location.pathname}
				onSelectWorkspace={handleSelectWorkspace}
				onCreateWorkspace={handleCreateWorkspace}
				onSetActivePanel={setActivePanel}
				onToggleSidebar={toggleSidebar}
				onCreateDiary={handleCreateDiary}
				onCreateWiki={handleCreateWiki}
				onCreateLedger={handleCreateLedger}
				onCreateTodo={handleCreateTodo}
				onCreateNote={handleCreateNote}
				onCreateExcalidraw={handleCreateExcalidraw}
				onImportFile={handleImportFile}
				onOpenExportDialog={handleOpenExportDialog}
				onDeleteAllData={handleDeleteAllData}
				onNavigate={handleNavigate}
			/>

			<ExportDialog
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
				workspaceId={selectedWorkspaceId || workspaces[0]?.id || ""}
				workspaceTitle={
					workspaces.find(
						(w: WorkspaceInterface) =>
							w.id === (selectedWorkspaceId || workspaces[0]?.id),
					)?.title
				}
			/>
		</>
	);
}
