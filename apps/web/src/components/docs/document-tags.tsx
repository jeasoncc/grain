"use client";

import { useDocPathname } from "./hooks/use-doc-pathname";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentTagsProps {
  tags?: string[];
  className?: string;
}

export function DocumentTags({ tags, className }: DocumentTagsProps) {
  const pathname = useDocPathname();
  
  // 如果没有提供标签，可以从路径或内容中推断
  const displayTags = tags || [];

  // 在 /docs 路径上不显示（必须在所有 hooks 之后）
  if (pathname === "/docs") return null;
  if (displayTags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 mb-6", className)}>
      <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      {displayTags.map((tag, index) => (
        <span
          key={index}
          className={cn(
            "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
            "bg-gray-100 dark:bg-gray-800",
            "text-gray-700 dark:text-gray-300",
            "border border-gray-200 dark:border-gray-700",
            "hover:bg-gray-200 dark:hover:bg-gray-700",
            "transition-colors duration-200",
            "cursor-default"
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

