"use client"

import * as SwitchPrimitive from "@radix-ui/react-switch"
import type * as React from "react"

import { cn } from "@/utils/cn.util"

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
				"focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent",
				"shadow-xs transition-all",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"bg-background pointer-events-none block size-4 rounded-full shadow-sm",
					"ring-0 transition-transform",
					"data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
				)}
			/>
		</SwitchPrimitive.Root>
	)
}

export { Switch }
