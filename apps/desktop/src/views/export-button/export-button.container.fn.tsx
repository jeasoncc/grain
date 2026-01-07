/**
 * Export Button Container 组件 - 容器组件
 * 处理导出逻辑和状态管理
 */

import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { exportProject } from "@/flows";
import type { ExportFormat } from "@/types/export";
import type { ExportButtonContainerProps } from "./export-button.types";
import { ExportButtonView } from "./export-button.view.fn";

export const ExportButtonContainer = memo(
	({
		workspaceId,
		workspaceTitle,
		variant = "default",
		size = "default",
		className,
	}: ExportButtonContainerProps) => {
		const [isExporting, setIsExporting] = useState(false);

		const handleExport = useCallback(
			async (format: ExportFormat) => {
				setIsExporting(true);
				try {
					await exportProject(workspaceId, format);
					toast.success(
						`Export successful: ${workspaceTitle || "workspace"}.${format}`,
					);
				} catch (error) {
					toast.error(
						`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				} finally {
					setIsExporting(false);
				}
			},
			[workspaceId, workspaceTitle],
		);

		return (
			<ExportButtonView
				isExporting={isExporting}
				variant={variant}
				size={size}
				className={className}
				onExport={handleExport}
			/>
		);
	},
);

ExportButtonContainer.displayName = "ExportButtonContainer";
