/**
 * 自动保存指示器 - 显示保存状态
 */
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoSaveIndicatorProps {
	status: "saved" | "saving" | "error";
	className?: string;
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-1.5 text-xs transition-all",
				status === "saved" && "text-muted-foreground",
				status === "saving" && "text-primary",
				status === "error" && "text-destructive",
				className
			)}
		>
			{status === "saved" && (
				<>
					<Check className="size-3.5" />
					<span>已保存</span>
				</>
			)}
			{status === "saving" && (
				<>
					<Loader2 className="size-3.5 animate-spin" />
					<span>保存中...</span>
				</>
			)}
			{status === "error" && (
				<>
					<AlertCircle className="size-3.5" />
					<span>保存失败</span>
				</>
			)}
		</div>
	);
}
