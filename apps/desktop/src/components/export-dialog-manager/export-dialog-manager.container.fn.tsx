/**
 * 全局Export对话框管理器
 *
 * Container 组件：管理全局对话框状态
 */

import { memo, useEffect, useState } from "react";
import { ExportDialog } from "@/components/export-dialog";
import type {
	ExportDialogManagerAPI,
	ExportDialogManagerProps,
	ExportDialogState,
} from "./export-dialog-manager.types";

// ==============================
// Global State (for dialog manager API)
// ==============================

// Global export dialog state
let globalExportDialogState: ExportDialogState = {
	isOpen: false,
	workspaceId: "",
	workspaceTitle: "",
};

const exportDialogListeners: Array<() => void> = [];

/**
 * Export Dialog Manager API
 * 提供全局的对话框控制接口
 */
export const exportDialogManager: ExportDialogManagerAPI = {
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
 * Container 组件：
 * - 通过 props 接收 selectedWorkspaceId 和 workspaces
 * - 管理全局对话框状态
 * - 只负责 UI 状态管理和对话框显示
 */
export const ExportDialogManagerContainer = memo(
	({ selectedWorkspaceId, workspaces }: ExportDialogManagerProps) => {
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
	},
);

ExportDialogManagerContainer.displayName = "ExportDialogManagerContainer";
