/**
 * @file update-checker.types.ts
 * @description 更新检查组件类型定义
 */

import type { UpdateInfo } from "@/flows/updater";

export type CheckStatus =
	| "idle"
	| "checking"
	| "up-to-date"
	| "update-available"
	| "error"
	| "dev-mode";

export interface UpdateCheckerViewProps {
	readonly updateInfo: UpdateInfo | null;
	readonly isChecking: boolean;
	readonly isDownloading: boolean;
	readonly downloadProgress: number;
	readonly showDialog: boolean;
	readonly checkStatus: CheckStatus;
	readonly errorMessage: string;
	readonly onCheckForUpdates: () => void;
	readonly onDownloadAndInstall: () => void;
	readonly onSetShowDialog: (show: boolean) => void;
}
