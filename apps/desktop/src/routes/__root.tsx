import { createRootRoute, Outlet } from "@tanstack/react-router"
import { OrgWorkspaceProvider } from "@/views/application/org-workspace-provider"
import { useThemeInitialization } from "@/hooks/use-theme"
import { AppLayout } from "@/views/app-layout"
import { ApplicationActions } from "@/views/application/application-actions"
import { ApplicationCommandProvider } from "@/views/application/application-command-provider"
import { ApplicationToolProvider } from "@/views/application/application-tool-provider"
import { ConfirmProvider } from "@/views/ui/confirm"
import { Toaster } from "@/views/ui/sonner"
import { DevtoolsWrapper } from "@/views/utils/devtools-wrapper.container.fn"
import { FontStyleInjector } from "@/views/utils/font-style-injector"

export const Route = createRootRoute({
	component: RootComponent,
})

function RootComponent() {
	useThemeInitialization()

	return (
		<ConfirmProvider>
			<ApplicationCommandProvider>
				<ApplicationToolProvider>
					<OrgWorkspaceProvider>
					<ApplicationActions />
					<FontStyleInjector />
					<AppLayout>
						<Outlet />
					</AppLayout>
					<Toaster />
					<DevtoolsWrapper />
					</OrgWorkspaceProvider>
				</ApplicationToolProvider>
			</ApplicationCommandProvider>
		</ConfirmProvider>
	)
}
