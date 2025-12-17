/**
 * Buffer Switcher - Emacs 风格的标签切换器
 * 使用 Ctrl+Tab / Ctrl+Shift+Tab 快速切换
 */

import { useEffect, useState, useCallback } from "react";
import { FileText, Calendar, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditorTab } from "@/stores/editor-tabs";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface BufferSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  initialDirection?: "forward" | "backward";
}

export function BufferSwitcher({
  open,
  onOpenChange,
  tabs,
  activeTabId,
  onSelectTab,
  initialDirection = "forward",
}: BufferSwitcherProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 初始化选中索引
  useEffect(() => {
    if (open && tabs.length > 0) {
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      if (initialDirection === "forward") {
        setSelectedIndex((currentIndex + 1) % tabs.length);
      } else {
        setSelectedIndex((currentIndex - 1 + tabs.length) % tabs.length);
      }
    }
  }, [open, tabs, activeTabId, initialDirection]);

  // Keyboard Navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Tab" && e.ctrlKey) {
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex((prev) => (prev - 1 + tabs.length) % tabs.length);
        } else {
          setSelectedIndex((prev) => (prev + 1) % tabs.length);
        }
      } else if (e.key === "Control") {
        // Ctrl 释放时确认选择
      }
    },
    [open, tabs.length]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Control") {
        // 释放 Ctrl 时确认选择
        if (tabs[selectedIndex]) {
          onSelectTab(tabs[selectedIndex].id);
        }
        onOpenChange(false);
      }
    },
    [open, tabs, selectedIndex, onSelectTab, onOpenChange]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const getTabIcon = (type: EditorTab["type"]) => {
    switch (type) {
      case "diary":
        return <Calendar className="size-4" />;
      case "canvas":
        return <Palette className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  };

  if (tabs.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-2" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="space-y-1">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
                "hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => {
                onSelectTab(tab.id);
                onOpenChange(false);
              }}
            >
              {getTabIcon(tab.type)}
              <span className="flex-1 truncate text-sm">{tab.title}</span>
              {tab.isDirty && (
                <span className="text-primary text-xs">●</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          按住 Ctrl + Tab 切换，释放 Ctrl 确认
        </p>
      </DialogContent>
    </Dialog>
  );
}
