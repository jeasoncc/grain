import * as React from "react"

import { cn } from "@/utils/cn.util"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
	initials?: string
	variant?: "default" | "emerald" | "sky" | "violet" | "amber"
}

const avatarVariants: Record<NonNullable<AvatarProps["variant"]>, string> = {
	default: "bg-primary/15 text-primary ring-1 ring-primary/30",
	emerald: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
	sky: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30",
	violet: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
	amber: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
	({ className, initials, variant = "default", children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold uppercase",
				avatarVariants[variant],
				className,
			)}
			{...props}
		>
			{initials ? initials : children}
		</div>
	),
)
Avatar.displayName = "Avatar"

export { Avatar }
