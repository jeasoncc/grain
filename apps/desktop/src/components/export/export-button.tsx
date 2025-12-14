/**
 * 导出按钮组件 - 简单的导出触发器
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileType, BookOpen, ChevronDown } from "lucide-react";
import { exportProject, type ExportFormat } from "@/services/export";
import { toast } from "sonner";

interface ExportButtonProps {
	projectId: string;
	projectTitle?: string;
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
	projectId,
	projectTitle,
	variant = "default",
	size = "default",
	className,
}: ExportButtonProps) {
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async (format: ExportFormat) => {
		setIsExporting(true);
		try {
			await exportProject(projectId, format);
			toast.success(`导出成功: ${projectTitle || "项目"}.${format}`);
		} catch (error) {
			toast.error(`导出失败: ${error instanceof Error ? error.message : "未知错误"}`);
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant={variant} size={size} disabled={isExporting} className={className}>
					<Download className="h-4 w-4 mr-2" />
					{isExporting ? "导出中..." : "导出"}
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
