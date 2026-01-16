/**
 * @file action-button.view.fn.tsx
 * @description ActivityBar 操作按钮组件
 */

import { memo } from "react"
import { cn } from "@/utils/cn.util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/views/ui/tooltip"
import type { ActionButtonProps } from "./activity-bar.types"

export const ActionButton = memo(function ActionButton({
	icon,
	label,
	onClick,
	active = false,
	testId,
}: ActionButtonProps & { readonly testId?: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					data-testid={testId}
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
