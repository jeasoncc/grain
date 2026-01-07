import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ActivityBar } from "@/views/activity-bar";
import { useAllWorkspaces } from "@/hooks/use-workspace";
import { ConfirmProvider } from "@/views/ui/confirm";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	const workspaces = useAllWorkspaces();

	return (
		<ConfirmProvider>
			<div className="flex h-screen w-screen overflow-hidden">
				{workspaces && workspaces.length > 0 && (
					<ActivityBar workspaces={workspaces} />
				)}
				<div className="flex-1 overflow-hidden">
					<Outlet />
				</div>
			</div>
		</ConfirmProvider>
	);
}
