"use client";

import { useState, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const shortcuts = [
  { key: "j / ↓", desc: "向下滚动" },
  { key: "k / ↑", desc: "向上滚动" },
  { key: "空格", desc: "向下翻页" },
  { key: "Shift + 空格", desc: "向上翻页" },
  { key: "g g", desc: "滚动到顶部" },
  { key: "G", desc: "滚动到底部" },
  { key: "Home", desc: "滚动到顶部" },
  { key: "End", desc: "滚动到底部" },
  { key: "Ctrl/Cmd + K", desc: "打开搜索" },
  { key: "Esc", desc: "关闭搜索/模态框" },
];

export function KeyboardHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 按 ? 显示帮助
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
      // 按 Esc 关闭
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 shrink-0 p-0",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "text-gray-600 dark:text-gray-400"
        )}
        aria-label="显示快捷键帮助"
        title="显示快捷键 (?)"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* 帮助对话框 */}
      <div
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
          "bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl",
          "w-full max-w-md max-h-[80vh] overflow-y-auto",
          "animate-fade-in-scale"
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              键盘快捷键
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-800 last:border-0"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {shortcut.desc}
                </span>
                <kbd
                  className={cn(
                    "px-2 py-1 rounded text-xs font-mono",
                    "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                    "border border-gray-300 dark:border-gray-700"
                  )}
                >
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              按 ? 或点击帮助按钮显示此对话框
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

