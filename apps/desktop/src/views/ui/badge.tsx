import * as React from "react"

import { cn } from "@/utils/cn.util"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "secondary" | "outline" | "muted" | "success" | "warning"
}

const badgeVariants: Record<NonNullable<BadgeProps["variant"]>, string> = {
	default: "bg-primary text-primary-foreground",
	secondary: "bg-secondary text-secondary-foreground",
	outline: "border border-border text-foreground",
	muted: "bg-muted text-muted-foreground",
	success: "bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-400/40",
	warning: "bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-400/40",
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
	({ className, variant = "default", ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
				badgeVariants[variant],
				className,
			)}
			{...props}
		/>
	),
)
Badge.displayName = "Badge"

export { Badge }
