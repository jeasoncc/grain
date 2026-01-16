/**
 * @file toggle-nav-item.view.fn.tsx
 * @description ActivityBar Toggle 导航项组件
 */

import { memo } from "react"
import { cn } from "@/utils/cn.util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/views/ui/tooltip"
import type { ToggleNavItemProps } from "./activity-bar.types"

export const ToggleNavItem = memo(function ToggleNavItem({
	to,
	icon,
	label,
	active,
	onNavigate,
}: ToggleNavItemProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={() => onNavigate(active ? "/" : to)}
					className={cn(
						"relative flex w-full aspect-square items-center justify-center transition-all",
						active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{active && (
						<div className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
					)}
					{icon}
				</button>
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	)
})
