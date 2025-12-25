/**
 * Export按钮组件 - 简单的Export触发器
 */

import {
	BookOpen,
	ChevronDown,
	Download,
	FileText,
	FileType,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportProject } from "@/actions";
import type { ExportFormat } from "@/types/export";

interface ExportButtonProps {
	workspaceId: string;
	workspaceTitle?: string;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

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

export function ExportButton({
	workspaceId,
	workspaceTitle,
	variant = "default",
	size = "default",
	className,
}: ExportButtonProps) {
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async (format: ExportFormat) => {
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
	};

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
							onClick={() => handleExport(format)}
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
}
