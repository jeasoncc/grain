/**
 * 保存状态指示器 - 支持手动和自动保存状态显示
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 */
import { memo } from "react";
import { AlertCircle, Check, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatusIndicatorViewProps } from "./save-status-indicator.types";

export const SaveStatusIndicatorView = memo(({
	className,
	showLastSaveTime = false,
	status,
	lastSaveTime,
	errorMessage,
	hasUnsavedChanges,
	isManualSaving,
}: SaveStatusIndicatorViewProps) => {
	const getStatusDisplay = () => {
		if (isManualSaving) {
			return {
				icon: <Loader2 className="size-3.5 animate-spin" />,
				text: "Saving manually...",
				className: "text-primary",
			};
		}

		switch (status) {
			case "saved":
				return {
					icon: <Check className="size-3.5" />,
					text: hasUnsavedChanges ? "Unsaved changes" : "Saved",
					className: hasUnsavedChanges
						? "text-orange-500"
						: "text-muted-foreground",
				};
			case "saving":
				return {
					icon: <Loader2 className="size-3.5 animate-spin" />,
					text: "Auto-saving...",
					className: "text-primary",
				};
			case "error":
				return {
					icon: <AlertCircle className="size-3.5" />,
					text: "Save failed",
					className: "text-destructive",
				};
			case "unsaved":
				return {
					icon: <Save className="size-3.5" />,
					text: "Unsaved changes",
					className: "text-orange-500",
				};
			default:
				return {
					icon: <Check className="size-3.5" />,
					text: "Saved",
					className: "text-muted-foreground",
				};
		}
	};

	const statusDisplay = getStatusDisplay();

	const formatLastSaveTime = (timestamp: number | null) => {
		if (!timestamp) return "";
		const now = Date.now();
		const diff = now - timestamp;

		if (diff < 60000) return "just now";
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		return new Date(timestamp).toLocaleTimeString();
	};

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 text-xs transition-all",
				statusDisplay.className,
				className,
			)}
			title={errorMessage || undefined}
		>
			{statusDisplay.icon}
			<span>{statusDisplay.text}</span>
			{showLastSaveTime && lastSaveTime && status === "saved" && (
				<span className="text-muted-foreground/60 ml-1">
					({formatLastSaveTime(lastSaveTime)})
				</span>
			)}
		</div>
	);
});

SaveStatusIndicatorView.displayName = "SaveStatusIndicatorView";
