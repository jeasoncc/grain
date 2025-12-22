import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
	{
		title: "仪表板",
		href: "/dashboard",
		icon: LayoutDashboard,
		description: "查看统计信息",
	},
	{
		title: "访客列表",
		href: "/visitors",
		icon: Users,
		description: "管理访客记录",
	},
];

export function Sidebar() {
	const location = useLocation();
	const navigate = useNavigate();

	const handleLogout = () => {
		auth.logout();
		navigate({ to: "/login" });
	};

	return (
		<div className="flex h-screen w-64 flex-col border-r bg-card shadow-lg">
			<div className="flex h-16 items-center border-b px-6 bg-gradient-to-r from-blue-600 to-purple-600">
				<div className="flex items-center gap-2">
					<div className="rounded-lg bg-white/20 p-1.5">
						<Sparkles className="h-5 w-5 text-white" />
					</div>
					<h1 className="text-lg font-bold text-white">访客管理</h1>
				</div>
			</div>
			<nav className="flex-1 space-y-1 p-4">
				{navItems.map((item) => {
					const Icon = item.icon;
					const isActive = location.pathname === item.href;
					return (
						<Link
							key={item.href}
							to={item.href}
							className={cn(
								"group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
								isActive
									? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-102",
							)}
						>
							<Icon
								className={cn(
									"h-5 w-5 transition-transform duration-200",
									isActive && "scale-110",
								)}
							/>
							<div className="flex-1">
								<div className="font-semibold">{item.title}</div>
								{!isActive && (
									<div className="text-xs opacity-0 group-hover:opacity-70 transition-opacity">
										{item.description}
									</div>
								)}
							</div>
							{isActive && (
								<div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
							)}
						</Link>
					);
				})}
			</nav>
			<div className="border-t p-4 bg-muted/30">
				<Button
					variant="ghost"
					className="w-full justify-start gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors"
					onClick={handleLogout}
				>
					<LogOut className="h-4 w-4" />
					退出登录
				</Button>
			</div>
		</div>
	);
}
