/**
 * 全局Export对话框管理器
 */

import { useState, useEffect } from "react";
import { ExportDialog } from "@/components/blocks/export-dialog";
import { useSelectionStore } from "@/stores/selection";
import { useAllWorkspaces } from "@/db/models";

// Global export dialog state
let globalExportDialogState = {
	isOpen: false,
	workspaceId: "",
	workspaceTitle: "",
};

const exportDialogListeners: Array<() => void> = [];

export const exportDialogManager = {
	open: (workspaceId?: string, workspaceTitle?: string) => {
		globalExportDialogState = {
			isOpen: true,
			workspaceId: workspaceId || "",
			workspaceTitle: workspaceTitle || "",
		};
		exportDialogListeners.forEach(listener => listener());
	},
	
	close: () => {
		globalExportDialogState = { ...globalExportDialogState, isOpen: false };
		exportDialogListeners.forEach(listener => listener());
	},
	
	subscribe: (listener: () => void) => {
		exportDialogListeners.push(listener);
		return () => {
			const index = exportDialogListeners.indexOf(listener);
			if (index > -1) exportDialogListeners.splice(index, 1);
		};
	},
};

export function ExportDialogManager() {
	const [dialogState, setDialogState] = useState(globalExportDialogState);
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
	const workspaces = useAllWorkspaces() ?? [];

	useEffect(() => {
		return exportDialogManager.subscribe(() => {
			setDialogState({ ...globalExportDialogState });
		});
	}, []);

	const effectiveWorkspaceId = dialogState.workspaceId || selectedWorkspaceId || "";
	const currentWorkspace = workspaces.find(w => w.id === effectiveWorkspaceId);
	const effectiveWorkspaceTitle = dialogState.workspaceTitle || currentWorkspace?.title || "Untitled Workspace";

	const handleOpenChange = (open: boolean) => {
		if (open) exportDialogManager.open(effectiveWorkspaceId, effectiveWorkspaceTitle);
		else exportDialogManager.close();
	};

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
