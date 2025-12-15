"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 搜索键盘提示
 * 在搜索结果中显示键盘导航提示
 */
export function SearchKeyboardHint() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const searchInput = document.querySelector('input[placeholder*="搜索文档"]') as HTMLInputElement;
      if (document.activeElement === searchInput && e.key === "ArrowDown") {
        setIsVisible(true);
      }
    };

    const handleFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.placeholder?.includes("搜索")) {
        setIsVisible(true);
      }
    };

    const handleBlur = () => {
      setIsVisible(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={cn(
          "px-4 py-2 rounded-lg bg-gray-900 dark:bg-gray-800 text-white text-sm",
          "shadow-lg backdrop-blur-sm border border-gray-700 dark:border-gray-600",
          "flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
        )}
      >
        <kbd className="px-2 py-1 rounded bg-gray-700 dark:bg-gray-600 text-xs font-mono">
          ↑↓
        </kbd>
        <span>选择</span>
        <kbd className="px-2 py-1 rounded bg-gray-700 dark:bg-gray-600 text-xs font-mono">
          Enter
        </kbd>
        <span>确认</span>
        <kbd className="px-2 py-1 rounded bg-gray-700 dark:bg-gray-600 text-xs font-mono">
          Esc
        </kbd>
        <span>取消</span>
      </div>
    </div>
  );
}









