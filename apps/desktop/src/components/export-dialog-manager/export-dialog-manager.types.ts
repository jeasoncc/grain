/**
 * Export Dialog Manager Types
 */

import type { WorkspaceInterface } from "@/types/workspace";

/**
 * ExportDialogManager Props 接口
 */
export interface ExportDialogManagerProps {
	/** 当前选中的工作区 ID */
	readonly selectedWorkspaceId: string | null;
	/** 所有工作区列表 */
	readonly workspaces: readonly WorkspaceInterface[];
}

/**
 * Export Dialog State
 */
export interface ExportDialogState {
	readonly isOpen: boolean;
	readonly workspaceId: string;
	readonly workspaceTitle: string;
}

/**
 * Export Dialog Manager API
 */
export interface ExportDialogManagerAPI {
	readonly open: (workspaceId?: string, workspaceTitle?: string) => void;
	readonly close: () => void;
	readonly subscribe: (listener: () => void) => () => void;
}
