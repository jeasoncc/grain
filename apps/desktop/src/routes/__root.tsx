import { createRootRoute, Outlet } from "@tanstack/react-router"
import { OrgWorkspaceProvider } from "@/views/application/org-workspace-provider"
import { AppLayout } from "@/views/app-layout"
import { ApplicationActions } from "@/views/application/application-actions"
import { ApplicationCommandProvider } from "@/views/application/application-command-provider"
import { ApplicationToolProvider } from "@/views/application/application-tool-provider"
import { ConfirmProvider } from "@/views/ui/confirm"
import { Toaster } from "@/views/ui/sonner"
import { DevtoolsWrapper } from "@/views/utils/devtools-wrapper.container.fn"
import { ConfigurationLifecycle } from "@/views/application/configuration-lifecycle"

export const Route = createRootRoute({
	component: RootComponent,
})

function RootComponent() {
	return (
		<ConfirmProvider>
			<ApplicationCommandProvider>
				<ApplicationToolProvider>
					<OrgWorkspaceProvider>
						<ApplicationActions />
						<div className="flex h-full min-h-0 w-full flex-col">
							<ConfigurationLifecycle />
							<div className="min-h-0 flex-1">
								<AppLayout><Outlet /></AppLayout>
							</div>
						</div>
						<Toaster />
						<DevtoolsWrapper />
					</OrgWorkspaceProvider>
				</ApplicationToolProvider>
			</ApplicationCommandProvider>
		</ConfirmProvider>
	)
}
