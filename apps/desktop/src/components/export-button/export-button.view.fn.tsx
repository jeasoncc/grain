/**
 * Export Button View 组件 - 纯展示组件
 * 显示导出按钮和格式选择下拉菜单
 */

import {
	BookOpen,
	ChevronDown,
	Download,
	FileText,
	FileType,
} from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportFormat } from "@/types/export";
import type { ExportButtonViewProps } from "./export-button.types";

const formatIcons: Record<ExportFormat, any> = {
	txt: FileText,
	docx: FileType,
	pdf: FileText,
	epub: BookOpen,
};

const formatLabels: Record<ExportFormat, string> = {
	txt: "Plain Text (.txt)",
	docx: "Word Document (.docx)",
	pdf: "PDF Document",
	epub: "E-Book (.epub)",
};

export const ExportButtonView = memo(
	({
		isExporting,
		variant = "default",
		size = "default",
		className,
		onExport,
	}: ExportButtonViewProps) => {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant={variant}
						size={size}
						disabled={isExporting}
						className={className}
					>
						<Download className="h-4 w-4 mr-2" />
						{isExporting ? "Exporting..." : "Export"}
						<ChevronDown className="h-4 w-4 ml-2" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					{(Object.keys(formatLabels) as ExportFormat[]).map((format) => {
						const Icon = formatIcons[format];
						return (
							<DropdownMenuItem
								key={format}
								onClick={() => onExport(format)}
								disabled={isExporting}
							>
								<Icon className="h-4 w-4 mr-2" />
								{formatLabels[format]}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
);

ExportButtonView.displayName = "ExportButtonView";
