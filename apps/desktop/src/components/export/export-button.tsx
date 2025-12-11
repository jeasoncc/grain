/**
 * 导出按钮组件 - 简单的导出触发器
 * Export Button Component - Simple export trigger
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
	Download, 
	FileText, 
	FileType, 
	BookOpen, 
	Settings,
	ChevronDown 
} from "lucide-react";
import { ExportDialogEnhanced } from "./export-dialog-enhanced";
import { useEnhancedExport } from "@/hooks/use-enhanced-export";
import type { ExportFormat } from "@/services/export";

interface ExportButtonProps {
	projectId: string;
	projectTitle?: string;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	showQuickExport?: boolean;
	className?: string;
}

const formatIcons = {
	txt: FileText,
	docx: FileType,
	pdf: FileText,
	epub: BookOpen,
};

const formatLabels = {
	txt: "Plain Text",
	docx: "Word Document",
	pdf: "PDF Document",
	epub: "E-Book",
};

export function ExportButton({
	projectId,
	projectTitle,
	variant = "default",
	size = "default",
	showQuickExport = true,
	className,
}: ExportButtonProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const { quickExport, isExporting, isTauri } = useEnhancedExport();

	const handleQuickExport = async (format: ExportFormat) => {
		await quickExport(projectId, format, projectTitle);
	};

	const handleAdvancedExport = () => {
		setDialogOpen(true);
	};

	if (!showQuickExport) {
		// Simple export button that opens the dialog
		return (
			<>
				<Button
					variant={variant}
					size={size}
					onClick={handleAdvancedExport}
					disabled={isExporting}
					className={className}
				>
					<Download className="h-4 w-4 mr-2" />
					{isExporting ? "Exporting..." : "Export"}
				</Button>
				<ExportDialogEnhanced
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					projectId={projectId}
					projectTitle={projectTitle}
				/>
			</>
		);
	}

	// Dropdown with quick export options
	return (
		<>
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
					<div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
						Quick Export
					</div>
					{(Object.keys(formatLabels) as ExportFormat[]).map((format) => {
						const Icon = formatIcons[format];
						return (
							<DropdownMenuItem
								key={format}
								onClick={() => handleQuickExport(format)}
								disabled={isExporting}
							>
								<Icon className="h-4 w-4 mr-2" />
								{formatLabels[format]}
							</DropdownMenuItem>
						);
					})}
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleAdvancedExport} disabled={isExporting}>
						<Settings className="h-4 w-4 mr-2" />
						Advanced Options...
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ExportDialogEnhanced
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				projectId={projectId}
				projectTitle={projectTitle}
			/>
		</>
	);
}