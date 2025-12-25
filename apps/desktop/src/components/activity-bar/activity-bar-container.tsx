/**
 * @file activity-bar-container.tsx
 * @description ActivityBar 容器组件（编排层）
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 将数据通过 props 传递给纯展示组件 ActivityBarView。
 */

import { useLocation, useNavigate } from "@tanstack/react-router";
import * as E from "fp-ts/Either";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createLedgerCompatAsync } from "@/actions/templated/create-ledger.action";
import { ExportDialog } from "@/components/blocks/export-dialog";
import { useConfirm } from "@/components/ui/confirm";
import { addWorkspace, clearAllData, touchWorkspace } from "@/db";
import { useIconTheme } from "@/hooks/use-icon-theme";
import { useAllWorkspaces } from "@/hooks/use-workspace";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useSidebarStore } from "@/stores/sidebar.store";
import type { WorkspaceInterface } from "@/types/workspace";

import { ActivityBarView } from "./activity-bar-view";

/**
 * ActivityBar 容器组件
 *
 * 编排层：连接数据源和展示组件。
 * - 使用 hooks 获取数据
 * - 调用 actions 执行操作
 * - 通过 props 传递给展示组件
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

	const {
		activePanel,
		isOpen: isSidebarOpen,
		setActivePanel,
		toggleSidebar,
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

	const handleCreateDiary = useCallback(async () => {
		if (!selectedWorkspaceId) {
			toast.error("Please select a workspace first");
			return;
		}
		// TODO: 使用新架构实现日记创建
		toast.info("Diary creation is being reimplemented");
	}, [selectedWorkspaceId]);

	const handleCreateWiki = useCallback(async () => {
		if (!selectedWorkspaceId) {
			toast.error("Please select a workspace first");
			return;
		}
		// TODO: 使用新架构实现 Wiki 创建
		toast.info("Wiki creation is being reimplemented");
	}, [selectedWorkspaceId]);

	const openTab = useEditorTabsStore((s) => s.openTab);

	const handleCreateLedger = useCallback(async () => {
		if (!selectedWorkspaceId) {
			toast.error("Please select a workspace first");
			return;
		}
		try {
			const result = await createLedgerCompatAsync({
				workspaceId: selectedWorkspaceId,
				date: new Date(),
			});
			// 打开新创建的记账文件
			openTab({
				id: result.node.id,
				title: result.node.title,
				type: result.node.type,
			});
			toast.success("Ledger created");
		} catch (error) {
			console.error("Failed to create ledger:", error);
			toast.error("Failed to create ledger");
		}
	}, [selectedWorkspaceId, openTab]);

	const handleImportFile = useCallback(async (_file: File) => {
		try {
			// TODO: 使用新架构实现导入
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
