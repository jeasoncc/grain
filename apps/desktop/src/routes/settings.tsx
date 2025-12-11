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
	Info,
	Palette,
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
			to: "/settings/scroll-test",
			label: "Scroll Test",
			icon: BarChart3,
		},
		{
			to: "/settings/about",
			label: "About",
			icon: Info,
		},
	];

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-20 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
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

			<div className="flex-1 overflow-hidden">
				<div className="h-full overflow-auto">
					<div className="container max-w-screen-2xl grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 py-8">
						{/* Sidebar Navigation */}
						<aside className="hidden lg:block">
							<div className="sticky top-8 space-y-1">
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

						{/* Content Area */}
						<main className="min-w-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
							<Outlet />
						</main>
					</div>
				</div>
			</div>
		</div>
	);
}
