import { useMemo } from "react";
import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useIconTheme } from "@/hooks/use-icon-theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
	component: SettingsLayout,
});

interface NavItem {
	to: string;
	label: string;
	description?: string;
	icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
	title: string;
	items: NavItem[];
}

function SettingsLayout() {
	const location = useLocation();
	const iconTheme = useIconTheme();

	const navGroups = useMemo<NavGroup[]>(() => [
		{
			title: "Customization",
			items: [
				{
					to: "/settings/design",
					label: "Appearance",
					icon: iconTheme.icons.settingsPage.appearance,
				},
				{
					to: "/settings/typography",
					label: "Typography",
					icon: iconTheme.icons.settingsPage.editor,
				},
				{
					to: "/settings/icons",
					label: "Icons",
					icon: iconTheme.icons.settingsPage.icons,
				},
				{
					to: "/settings/diagrams",
					label: "Diagrams",
					icon: iconTheme.icons.settingsPage.diagrams,
				},
			],
		},
		{
			title: "Application",
			items: [
				{
					to: "/settings/general",
					label: "General",
					icon: iconTheme.icons.settingsPage.general,
				},
				{
					to: "/settings/editor",
					label: "Editor",
					icon: iconTheme.icons.settingsPage.editor,
				},
			],
		},
		{
			title: "Data & Storage",
			items: [
				{
					to: "/settings/data",
					label: "Data",
					icon: iconTheme.icons.settingsPage.data,
				},
				{
					to: "/settings/export",
					label: "Export",
					icon: iconTheme.icons.settingsPage.export,
				},
			],
		},
		{
			title: "Advanced",
			items: [
				{
					to: "/settings/logs",
					label: "Logs",
					icon: iconTheme.icons.settingsPage.logs,
				},
			],
		},
		{
			title: "Info",
			items: [
				{
					to: "/settings/about",
					label: "About",
					icon: iconTheme.icons.settingsPage.about,
				},
			],
		},
	], [iconTheme]);

	return (
		<div className="h-screen bg-background flex flex-col overflow-hidden">
			{/* Header - Fixed at top */}
			<header className="shrink-0 z-20 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 max-w-screen-2xl items-center pl-8">
					<Link
						to="/"
						className="mr-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="size-4" />
						Back to Editor
					</Link>
					<div className="h-4 w-px bg-border mx-2" />
					<div className="flex items-center gap-2">
						<h1 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Settings</h1>
					</div>
				</div>
			</header>

			{/* Main content area with fixed sidebar */}
			<div className="flex-1 flex min-h-0 overflow-hidden">
				{/* Sidebar Navigation - Scrollable */}
				<aside className="hidden lg:block w-[220px] shrink-0 border-r border-border/50 bg-sidebar overflow-y-auto">
					<div className="w-full p-3 space-y-4">
						{navGroups.map((group) => (
							<div key={group.title} className="space-y-1">
								<h3 className="px-3 py-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
									{group.title}
								</h3>
								<div className="space-y-0.5">
									{group.items.map((item) => {
										const isActive = location.pathname === item.to;
										return (
											<Link
												key={item.to}
												to={item.to}
												className={cn(
													"group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200",
													isActive
														? "bg-primary/10 text-primary shadow-sm border border-primary/20"
														: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
												)}
											>
												<div
													className={cn(
														"flex items-center justify-center size-7 rounded-md transition-colors",
														isActive
															? "bg-primary/20 text-primary"
															: "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
													)}
												>
													<item.icon className="size-3.5" />
												</div>
												<div className="flex flex-col min-w-0">
													<span className={cn("text-xs font-medium truncate", isActive && "text-primary")}>
														{item.label}
													</span>
												</div>
											</Link>
										);
									})}
								</div>
							</div>
						))}
					</div>
				</aside>

				{/* Content Area - Only this part scrolls */}
				<main className="flex-1 overflow-y-auto bg-background">
					<div className="max-w-screen-xl mx-auto p-6 pb-8">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
