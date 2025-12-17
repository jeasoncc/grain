// 设置页面导航
import { Link, useLocation } from "@tanstack/react-router";
import {
	Database,
	Palette,
	Settings as SettingsIcon,
	Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

const settingsNav = [
	{
		to: "/settings/design",
		label: "Appearance",
		icon: <Palette className="size-4" />,
	},
	{
		to: "/settings/typography",
		label: "Typography",
		icon: <Type className="size-4" />,
	},
	{
		to: "/settings/general",
		label: "General",
		icon: <SettingsIcon className="size-4" />,
	},
	{
		to: "/settings/data",
		label: "Data Management",
		icon: <Database className="size-4" />,
	},
];

export function SettingsNav() {
	const location = useLocation();

	return (
		<nav className="space-y-1">
			{settingsNav.map((item) => {
				const isActive = location.pathname === item.to;
				return (
					<Link
						key={item.to}
						to={item.to}
						className={cn(
							"flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
							isActive
								? "bg-primary text-primary-foreground font-medium"
								: "text-muted-foreground hover:text-foreground hover:bg-muted",
						)}
					>
						{item.icon}
						<span>{item.label}</span>
					</Link>
				);
			})}
		</nav>
	);
}
