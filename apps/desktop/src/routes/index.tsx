import { createFileRoute } from "@tanstack/react-router";
import { useAllWorkspaces } from "@/hooks/use-workspace";
import { StoryWorkspace } from "@/views/story-workspace";
import { Spinner } from "@/views/ui/loading";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	const workspaces = useAllWorkspaces();

	// Show loading spinner while:
	// 1. Workspaces haven't loaded yet (undefined)
	// 2. Workspaces array is empty (waiting for auto-creation in activity-bar)
	if (workspaces === undefined || workspaces.length === 0) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	return <StoryWorkspace workspaces={workspaces} />;
}
