import { createFileRoute } from "@tanstack/react-router"
import { OrgWorkspaceContainer } from "@/views/org-workspace"

export const Route = createFileRoute("/org")({
	component: OrgRoute,
})

function OrgRoute() {
	return <OrgWorkspaceContainer />
}
