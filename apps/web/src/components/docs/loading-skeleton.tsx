"use client";

import { cn } from "@/lib/utils";

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* 标题骨架 */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
      </div>

      {/* 段落骨架 */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/6" />
        </div>
      ))}

      {/* 代码块骨架 */}
      <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
    </div>
  );
}



