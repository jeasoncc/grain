/**
 * 保存状态指示器 - 支持手动和自动保存状态显示
 */
import { AlertCircle, Check, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSaveStore } from "@/stores/save";

interface SaveStatusIndicatorProps {
	className?: string;
	showLastSaveTime?: boolean;
}

export function SaveStatusIndicator({
	className,
	showLastSaveTime = false,
}: SaveStatusIndicatorProps) {
	const {
		status,
		lastSaveTime,
		errorMessage,
		hasUnsavedChanges,
		isManualSaving,
	} = useSaveStore();

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

	const formatLastSaveTime = (time: Date | null) => {
		if (!time) return "";
		const now = new Date();
		const diff = now.getTime() - time.getTime();

		if (diff < 60000) return "just now";
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		return time.toLocaleTimeString();
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
}
