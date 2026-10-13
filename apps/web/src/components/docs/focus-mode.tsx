"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FocusModeProps {
  isFocused: boolean;
  onToggle: (focused: boolean) => void;
}

export function FocusMode({ isFocused, onToggle }: FocusModeProps) {

  return (
    <Button
      onClick={() => onToggle(!isFocused)}
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 shrink-0 p-0",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "text-gray-600 dark:text-gray-400"
      )}
      aria-label={isFocused ? "退出专注模式" : "进入专注模式"}
      aria-pressed={isFocused}
      title={isFocused ? "退出专注模式" : "进入专注模式（隐藏侧边栏）"}
    >
      {isFocused ? (
        <Minimize2 className="w-5 h-5" />
      ) : (
        <Maximize2 className="w-5 h-5" />
      )}
    </Button>
  );
}

