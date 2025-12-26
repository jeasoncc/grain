/**
 * 全局Export对话框管理器
 *
 * 纯展示组件：通过 props 接收数据，不直接访问 Store/DB
 */

import { useEffect, useState } from "react";
import { ExportDialog } from "@/components/export-dialog";
import type { WorkspaceInterface } from "@/types/workspace";

// ==============================
// Types
// ==============================

/**
 * ExportDialogManager Props 接口
 */
export interface ExportDialogManagerProps {
	/** 当前选中的工作区 ID */
	readonly selectedWorkspaceId: string | null;
	/** 所有工作区列表 */
	readonly workspaces: readonly WorkspaceInterface[];
}

// ==============================
// Global State (for dialog manager API)
// ==============================

// Global export dialog state
let globalExportDialogState = {
	isOpen: false,
	workspaceId: "",
	workspaceTitle: "",
};

const exportDialogListeners: Array<() => void> = [];

/**
 * Export Dialog Manager API
 * 提供全局的对话框控制接口
 */
export const exportDialogManager = {
	open: (workspaceId?: string, workspaceTitle?: string) => {
		globalExportDialogState = {
			isOpen: true,
			workspaceId: workspaceId || "",
			workspaceTitle: workspaceTitle || "",
		};
		exportDialogListeners.forEach((listener) => listener());
	},

	close: () => {
		globalExportDialogState = { ...globalExportDialogState, isOpen: false };
		exportDialogListeners.forEach((listener) => listener());
	},

	subscribe: (listener: () => void) => {
		exportDialogListeners.push(listener);
		return () => {
			const index = exportDialogListeners.indexOf(listener);
			if (index > -1) exportDialogListeners.splice(index, 1);
		};
	},
};

// ==============================
// Component
// ==============================

/**
 * ExportDialogManager 组件
 *
 * 纯展示组件：
 * - 通过 props 接收 selectedWorkspaceId 和 workspaces
 * - 不直接访问 Store 或 DB
 * - 只负责 UI 状态管理和对话框显示
 */
export function ExportDialogManager({
	selectedWorkspaceId,
	workspaces,
}: ExportDialogManagerProps) {
	const [dialogState, setDialogState] = useState(globalExportDialogState);

	useEffect(() => {
		return exportDialogManager.subscribe(() => {
			setDialogState({ ...globalExportDialogState });
		});
	}, []);

	// 确定有效的工作区 ID
	const effectiveWorkspaceId =
		dialogState.workspaceId || selectedWorkspaceId || "";

	// 查找当前工作区
	const currentWorkspace = workspaces.find(
		(w) => w.id === effectiveWorkspaceId,
	);

	// 确定有效的工作区标题
	const effectiveWorkspaceTitle =
		dialogState.workspaceTitle ||
		currentWorkspace?.title ||
		"Untitled Workspace";

	const handleOpenChange = (open: boolean) => {
		if (open)
			exportDialogManager.open(effectiveWorkspaceId, effectiveWorkspaceTitle);
		else exportDialogManager.close();
	};

	// 如果没有有效的工作区 ID，不渲染对话框
	if (!effectiveWorkspaceId) return null;

	return (
		<ExportDialog
			open={dialogState.isOpen}
			onOpenChange={handleOpenChange}
			workspaceId={effectiveWorkspaceId}
			workspaceTitle={effectiveWorkspaceTitle}
		/>
	);
}
