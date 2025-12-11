import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	BarChart3,
	Database,
	FolderOutput,
	Info,
	Palette,
	ScrollText,
	Settings2,
	Sparkles,
	Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
	component: SettingsLayout,
});

function SettingsLayout() {
	const location = useLocation();

	const navItems = [
		{
			to: "/settings/design",
			label: "Appearance",
			icon: Palette,
		},
		{
			to: "/settings/icons",
			label: "Icons",
			icon: Sparkles,
		},
		{
			to: "/settings/diagrams",
			label: "Diagrams",
			icon: BarChart3,
		},
		{
			to: "/settings/general",
			label: "General",
			icon: Settings2,
		},
		{
			to: "/settings/editor",
			label: "Editor",
			icon: Type,
		},
		{
			to: "/settings/data",
			label: "数据管理",
			icon: Database,
		},
		{
			to: "/settings/export",
			label: "导出设置",
			icon: FolderOutput,
		},
		{
			to: "/settings/scroll-test",
			label: "Scroll Test",
			icon: BarChart3,
		},
		{
			to: "/settings/logs",
			label: "Logs",
			icon: ScrollText,
		},
		{
			to: "/settings/about",
			label: "About",
			icon: Info,
		},
	];

	return (
		<div className="h-screen bg-background flex flex-col overflow-hidden">
			{/* Header - Fixed at top */}
			<header className="shrink-0 z-20 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 max-w-screen-2xl items-center">
					<Link
						to="/"
						className="mr-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="size-4" />
						Back to Editor
					</Link>
					<div className="h-4 w-px bg-border mx-2" />
					<div className="flex items-center gap-2">
						<h1 className="font-semibold text-sm">Settings</h1>
					</div>
				</div>
			</header>

			{/* Main content area with fixed sidebar */}
			<div className="flex-1 flex min-h-0">
				{/* Sidebar Navigation - Fixed, not scrollable */}
				<aside className="hidden lg:block w-[240px] shrink-0 border-r border-border/50 bg-background overflow-hidden">
					<div className="w-full p-6 space-y-1">
						{navItems.map((item) => {
							const isActive = location.pathname === item.to;
							return (
								<Link
									key={item.to}
									to={item.to}
									className={cn(
										"flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
										isActive
											? "bg-accent text-accent-foreground"
											: "text-muted-foreground hover:bg-muted hover:text-foreground",
									)}
								>
									<item.icon className="size-4" />
									{item.label}
								</Link>
							);
						})}
					</div>
				</aside>

				{/* Content Area - Only this part scrolls */}
				<main className="flex-1 overflow-y-auto">
					<div className="max-w-screen-xl mx-auto p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
