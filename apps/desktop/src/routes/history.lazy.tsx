import { createLazyFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"
import { HistoricalAccessBoundary } from "@/views/app-layout/historical-access-boundary.view.fn"

const HistoricalPreview = lazy(() => import("@/views/app-layout/historical-preview.view.fn"))

export const Route = createLazyFileRoute("/history")({
	component: HistoricalPreviewRoute,
})

function HistoricalPreviewRoute() {
	return (
		<HistoricalAccessBoundary>
			<Suspense fallback={<div role="status" className="p-6">Loading historical preview…</div>}>
				<HistoricalPreview />
			</Suspense>
		</HistoricalAccessBoundary>
	)
}
