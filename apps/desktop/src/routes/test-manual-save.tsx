import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test-manual-save")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/test-manual-save"!</div>;
}
