"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarToggleProps {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

export function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {

  return (
    <Button
      onClick={() => onToggle(!collapsed)}
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 shrink-0 p-0",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "transition-all duration-300"
      )}
      aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
      aria-expanded={!collapsed}
      aria-controls="docs-navigation"
    >
      {collapsed ? (
        <ChevronRight className="w-4 h-4" />
      ) : (
        <ChevronLeft className="w-4 h-4" />
      )}
    </Button>
  );
}

