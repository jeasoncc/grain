/**
 * 全局导出对话框管理器
 */

import { useState, useEffect } from "react";
import { ExportDialog } from "@/components/blocks/export-dialog";
import { useSelectionStore } from "@/stores/selection";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";

// Global export dialog state
let globalExportDialogState = {
	isOpen: false,
	projectId: "",
	projectTitle: "",
};

const exportDialogListeners: Array<() => void> = [];

export const exportDialogManager = {
	open: (projectId?: string, projectTitle?: string) => {
		globalExportDialogState = {
			isOpen: true,
			projectId: projectId || "",
			projectTitle: projectTitle || "",
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
	const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);
	const projects = useLiveQuery(() => db.getAllProjects(), []) ?? [];

	useEffect(() => {
		return exportDialogManager.subscribe(() => {
			setDialogState({ ...globalExportDialogState });
		});
	}, []);

	const effectiveProjectId = dialogState.projectId || selectedProjectId || "";
	const currentProject = projects.find(p => p.id === effectiveProjectId);
	const effectiveProjectTitle = dialogState.projectTitle || currentProject?.title || "未命名项目";

	const handleOpenChange = (open: boolean) => {
		if (open) exportDialogManager.open(effectiveProjectId, effectiveProjectTitle);
		else exportDialogManager.close();
	};

	if (!effectiveProjectId) return null;

	return (
		<ExportDialog
			open={dialogState.isOpen}
			onOpenChange={handleOpenChange}
			projectId={effectiveProjectId}
			projectTitle={effectiveProjectTitle}
		/>
	);
}
