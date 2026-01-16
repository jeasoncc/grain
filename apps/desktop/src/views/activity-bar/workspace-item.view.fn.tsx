/**
 * @file workspace-item.view.fn.tsx
 * @description 工作区列表项组件
 */

import { Check } from "lucide-react"
import { memo } from "react"
import { cn } from "@/utils/cn.util"
import type { WorkspaceItemProps } from "./activity-bar.types"

export const WorkspaceItem = memo(function WorkspaceItem({
	workspace,
	isSelected,
	FolderIcon,
	onClick,
}: WorkspaceItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative flex w-full items-center gap-2 rounded-lg px-2 py-1 transition-all duration-200 outline-none",
				isSelected
					? "bg-primary/10 text-primary font-medium"
					: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
			)}
		>
			<div
				className={cn(
					"flex items-center justify-center size-6 shrink-0 rounded-full transition-colors border",
					isSelected
						? "bg-background/50 border-primary/20 text-primary shadow-sm"
						: "bg-muted/30 border-transparent text-muted-foreground/70 group-hover:text-foreground group-hover:bg-background group-hover:border-border/50",
				)}
			>
				<FolderIcon className="size-3" />
			</div>
			<span className="flex-1 truncate text-left text-xs">{workspace.title}</span>
			{isSelected && (
				<div className="relative flex items-center justify-center size-3 shrink-0 animate-in zoom-in duration-300">
					<div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
					<Check className="relative size-2 text-primary stroke-[3]" />
				</div>
			)}
		</button>
	)
})
