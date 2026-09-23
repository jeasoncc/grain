import { createLazyFileRoute, Link } from "@tanstack/react-router"
import { useAllWorkspaces } from "@/hooks/use-workspace"
import { StoryWorkspace } from "@/views/story-workspace"
import { Spinner } from "@/views/ui/loading"

export const Route = createLazyFileRoute("/legacy")({
	component: LegacyWorkspaceRoute,
})

function LegacyWorkspaceRoute() {
	const workspaces = useAllWorkspaces()

	if (workspaces === undefined || workspaces.length === 0) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex shrink-0 items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200">
				<span>Legacy SQLite workspace — changes here are not saved as Org files.</span>
				<Link to="/" className="font-medium underline underline-offset-2">
					Return to Org workspace
				</Link>
			</div>
			<div className="min-h-0 flex-1">
				<StoryWorkspace workspaces={workspaces} />
			</div>
		</div>
	)
}
