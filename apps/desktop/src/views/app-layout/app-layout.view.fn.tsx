import type { ReactNode } from "react"

export interface AppLayoutProps {
	readonly children: ReactNode
}

/** The primary Org/settings shell has no legacy layout initialization or business surfaces. */
export function AppLayout({ children }: AppLayoutProps) {
	return (
		<div className="flex h-full w-full overflow-hidden">
			<div className="h-full min-w-0 flex-1 overflow-hidden">{children}</div>
		</div>
	)
}
