import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ActivityBar } from "@/components/activity-bar";
import { ConfirmProvider } from "@/components/ui/confirm";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
	component: () => (
		<ConfirmProvider>
			<SidebarProvider open>
				<Toaster
					icons={{
						success: <CircleCheckIcon className="size-4 text-green-500" />,
						info: <InfoIcon className="size-4 text-blue-500" />,
						warning: <TriangleAlertIcon className="size-4 text-yellow-500" />,
						error: <OctagonXIcon className="size-4 text-red-500" />,
						loading: (
							<Loader2Icon className="size-4 animate-spin text-muted-foreground" />
						),
					}}
				/>
				<div className="flex min-h-screen w-full">
					<ActivityBar />
					<AppSidebar />
					<SidebarInset className="bg-background text-foreground flex-1 min-h-svh">
						<div className="flex-1 min-h-0 overflow-auto">
							<Outlet />
						</div>
					</SidebarInset>
				</div>
				<TanStackDevtools
					config={{
						position: "top-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						FormDevtoolsPlugin(),
					]}
				/>
			</SidebarProvider>
		</ConfirmProvider>
	),
});
