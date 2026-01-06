/**
 * FileTreePanel - 文件树面板
 * 使用新的 Node 结构管理工作空间内容
 *
 * 路由编排层：连接数据和展示组件
 *
 * Requirements: 2.1, 2.3, 3.3, 1.1, 1.5, 3.1
 */

import { useNavigate } from "@tanstack/react-router";
import * as E from "fp-ts/Either";
import { memo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	createDiaryCompatAsync,
	createFileAsync,
	deleteNode,
	moveNode,
	openFileAsync,
	renameNode,
} from "@/actions";
import { FileTree } from "@/components/file-tree";
import { useConfirm } from "@/components/ui/confirm";
import { getNodeById, setNodeCollapsed } from "@/db";
import { useNodesByWorkspace } from "@/hooks/use-node";
import { useEditorTabsStore } from "@/state/editor-tabs.state";
import { useSelectionStore } from "@/state/selection.state";
import type { NodeType } from "@/types/node";
import type { FileTreePanelContainerProps } from "./file-tree-panel.types";

export const FileTreePanelContainer = memo(
	({ workspaceId: propWorkspaceId }: FileTreePanelContainerProps) => {
		const navigate = useNavigate();
		const confirm = useConfirm();

		// Global selection state
		const globalSelectedWorkspaceId = useSelectionStore(
			(s) => s.selectedWorkspaceId,
		);
		const workspaceId = propWorkspaceId ?? globalSelectedWorkspaceId;

		// Selected node state - use global store for cross-component communication
		const selectedNodeId = useSelectionStore((s) => s.selectedNodeId);
		const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId);

		// Clear selection when workspace changes
		// Requirements: 3.3
		const prevWorkspaceIdRef = useRef(workspaceId);
		useEffect(() => {
			if (prevWorkspaceIdRef.current !== workspaceId) {
				setSelectedNodeId(null);
				prevWorkspaceIdRef.current = workspaceId;
			}
		}, [workspaceId, setSelectedNodeId]);

		// 获取工作区节点数据
		const nodes = useNodesByWorkspace(workspaceId) ?? [];

		// Handle node selection - open file in editor
		// 使用 openFile action 通过队列执行，确保数据先于渲染
		const handleSelectNode = useCallback(
			async (nodeId: string) => {
				setSelectedNodeId(nodeId);

				// Get node details to open in editor
				const nodeResult = await getNodeById(nodeId)();
				if (E.isLeft(nodeResult) || !nodeResult.right) return;
				const node = nodeResult.right;

				// Only open files (not folders) in editor
				if (node.type === "folder") return;

				if (workspaceId) {
					// 使用 openFileAsync，内部处理：
					// 1. 从 DB 加载内容
					// 2. 创建 tab
					// 3. 设置 editorState
					await openFileAsync({
						workspaceId,
						nodeId,
						title: node.title,
						type: node.type,
					});
				}

				// Navigate to main workspace - all file types are handled there
				navigate({ to: "/" });
			},
			[workspaceId, navigate, setSelectedNodeId],
		);

		// Handle folder creation
		// 使用 createFileAsync 通过队列执行
		const handleCreateFolder = useCallback(
			async (parentId: string | null) => {
				if (!workspaceId) {
					toast.error("Please select a workspace first");
					return;
				}

				try {
					await createFileAsync({
						workspaceId,
						parentId,
						type: "folder",
						title: "New Folder",
					});

					toast.success("Folder created");
				} catch (error) {
					console.error("Failed to create folder:", error);
					toast.error("Failed to create folder");
				}
			},
			[workspaceId],
		);

		// Handle file creation
		// 使用 createFileAsync 通过队列执行
		const handleCreateFile = useCallback(
			async (parentId: string | null, type: NodeType) => {
				if (!workspaceId) {
					toast.error("Please select a workspace first");
					return;
				}

				try {
					const title = type === "drawing" ? "New Canvas" : "New File";
					const content =
						type === "drawing"
							? JSON.stringify({ elements: [], appState: {}, files: {} })
							: "";

					const result = await createFileAsync({
						workspaceId,
						parentId,
						type,
						title,
						content,
					});

					toast.success(`${type === "drawing" ? "Canvas" : "File"} created`);

					// Auto-select the new file (createFileAsync 已经打开了 tab)
					if (result && type !== "folder") {
						setSelectedNodeId(result.node.id);
						navigate({ to: "/" });
					}
				} catch (error) {
					console.error("Failed to create file:", error);
					toast.error("Failed to create file");
				}
			},
			[workspaceId, setSelectedNodeId, navigate],
		);

		// Editor tabs for closing deleted files
		const closeTab = useEditorTabsStore((s) => s.closeTab);

		// Handle node deletion
		const handleDeleteNode = useCallback(
			async (nodeId: string) => {
				const nodeResult = await getNodeById(nodeId)();
				if (E.isLeft(nodeResult) || !nodeResult.right) return;
				const node = nodeResult.right;

				const isFolder = node.type === "folder";
				const ok = await confirm({
					title: `Delete ${isFolder ? "folder" : "file"}?`,
					description: isFolder
						? `Are you sure you want to delete "${node.title}"? This will also delete all contents inside. This cannot be undone.`
						: `Are you sure you want to delete "${node.title}"? This cannot be undone.`,
					confirmText: "Delete",
					cancelText: "Cancel",
				});

				if (!ok) return;

				try {
					const result = await deleteNode(nodeId)();

					if (E.isLeft(result)) {
						throw new Error(result.left.message);
					}

					// Close the tab if the deleted node was open in editor
					closeTab(nodeId);

					// Clear selection if deleted node was selected
					if (selectedNodeId === nodeId) {
						setSelectedNodeId(null);
					}

					toast.success(`${isFolder ? "Folder" : "File"} deleted`);
				} catch (error) {
					console.error("Failed to delete node:", error);
					toast.error("Failed to delete");
				}
			},
			[confirm, selectedNodeId, closeTab, setSelectedNodeId],
		);

		// Handle node rename
		const handleRenameNode = useCallback(
			async (nodeId: string, newTitle: string) => {
				if (!newTitle.trim()) return;

				try {
					const result = await renameNode({
						nodeId,
						title: newTitle.trim(),
					})();

					if (E.isLeft(result)) {
						throw new Error(result.left.message);
					}
				} catch (error) {
					console.error("Failed to rename node:", error);
					toast.error("Failed to rename");
				}
			},
			[],
		);

		// Handle node move (drag and drop)
		const handleMoveNode = useCallback(
			async (nodeId: string, newParentId: string | null, newIndex: number) => {
				try {
					const result = await moveNode({
						nodeId,
						newParentId,
						newOrder: newIndex,
					})();

					if (E.isLeft(result)) {
						throw new Error(result.left.message);
					}
				} catch (error) {
					console.error("Failed to move node:", error);
					if (error instanceof Error && error.message.includes("descendants")) {
						toast.error("Cannot move a folder into itself");
					} else {
						toast.error("Failed to move");
					}
				}
			},
			[],
		);

		// Handle diary creation
		// Requirements: 1.1, 1.5, 3.1
		// 使用 createDiaryCompatAsync，内部已通过队列处理
		const handleCreateDiary = useCallback(async () => {
			if (!workspaceId) {
				toast.error("Please select a workspace first");
				return;
			}

			try {
				// Create diary and get content in one call
				const { node } = await createDiaryCompatAsync({
					workspaceId,
				});

				toast.success("Diary created");

				// Auto-select the new diary file
				setSelectedNodeId(node.id);
				navigate({ to: "/" });
			} catch (error) {
				console.error("Failed to create diary:", error);
				toast.error("Failed to create diary");
			}
		}, [workspaceId, setSelectedNodeId, navigate]);

		// Handle toggle collapsed state
		// Requirements: 2.2
		const handleToggleCollapsed = useCallback(
			async (nodeId: string, collapsed: boolean) => {
				try {
					const result = await setNodeCollapsed(nodeId, collapsed)();

					if (E.isLeft(result)) {
						throw new Error(result.left.message);
					}
				} catch (error) {
					console.error("Failed to toggle collapsed:", error);
				}
			},
			[],
		);

		return (
			<FileTree
				workspaceId={workspaceId}
				nodes={nodes}
				selectedNodeId={selectedNodeId}
				onSelectNode={handleSelectNode}
				onCreateFolder={handleCreateFolder}
				onCreateFile={handleCreateFile}
				onDeleteNode={handleDeleteNode}
				onRenameNode={handleRenameNode}
				onMoveNode={handleMoveNode}
				onToggleCollapsed={handleToggleCollapsed}
				onCreateDiary={handleCreateDiary}
			/>
		);
	},
);

FileTreePanelContainer.displayName = "FileTreePanelContainer";
