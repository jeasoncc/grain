import { createFileRoute } from "@tanstack/react-router";
import { Spinner } from "@/components/ui/loading";
import { StoryWorkspace } from "@/components/workspace/story-workspace";
import { useAllWorkspaces } from "@/hooks/use-workspace";

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
