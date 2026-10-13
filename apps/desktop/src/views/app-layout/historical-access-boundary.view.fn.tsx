import type { ReactNode } from "react"
import { useDesktopMode } from "@/hooks/use-desktop-mode"

export function HistoricalAccessBoundary({ children }: { readonly children: ReactNode }) {
	const { mode, isLoading, error } = useDesktopMode()
	if (isLoading) return <div role="status" className="p-6">Checking native desktop mode…</div>
	if (mode !== "legacy") {
		return (
			<div role={error ? "alert" : "status"} className="space-y-2 p-6">
				<p>Legacy SQLite tools require explicit native legacy mode.</p>
				<p className="text-sm text-muted-foreground">
					Org files remain available in the main workspace. To list and preview historical SQLite
					data read-only, restart the desktop app with GRAIN_TAURI_LEGACY_MODE=1.
				</p>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>
		)
	}
	return children
}
