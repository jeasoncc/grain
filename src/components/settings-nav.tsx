// 设置页面导航
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Palette, Type, Settings as SettingsIcon, Database } from "lucide-react";

const settingsNav = [
  { to: "/settings/design", label: "外观主题", icon: <Palette className="size-4" /> },
  { to: "/settings/typography", label: "字体排版", icon: <Type className="size-4" /> },
  { to: "/settings/general", label: "通用设置", icon: <SettingsIcon className="size-4" /> },
  { to: "/settings/data", label: "数据管理", icon: <Database className="size-4" /> },
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
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
