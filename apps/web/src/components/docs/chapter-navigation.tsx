"use client";

import { useMemo } from "react";
import { useDocPathname } from "./hooks/use-doc-pathname";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { docNavItems, type NavItem } from "./doc-nav-data";

function flattenNavItems(items: NavItem[]): NavItem[] {
  const result: NavItem[] = [];
  
  items.forEach((item) => {
    result.push(item);
    if (item.children) {
      result.push(...flattenNavItems(item.children));
    }
  });
  
  return result;
}

export function ChapterNavigation() {
  const pathname = useDocPathname();

  const { prev, next } = useMemo(() => {
    // 在 /docs 路径上不计算
    if (pathname === "/docs") {
      return { prev: null, next: null };
    }

    const allItems = flattenNavItems(docNavItems);
    const currentIndex = allItems.findIndex(
      (item) => item.href === pathname || pathname.startsWith(item.href + "/")
    );

    if (currentIndex === -1) {
      return { prev: null, next: null };
    }

    const prev = currentIndex > 0 ? allItems[currentIndex - 1] : null;
    const next =
      currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

    return { prev, next };
  }, [pathname]);

  // 在 /docs 路径上不显示（必须在所有 hooks 之后）
  if (pathname === "/docs") return null;
  if (!prev && !next) return null;

  return (
    <nav
      className={cn(
        "flex items-center justify-between gap-4",
        "mt-12 pt-8 border-t border-gray-200 dark:border-gray-800"
      )}
    >
      {prev ? (
        <Link
          href={prev.href}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg",
            "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800",
            "transition-colors group",
            "flex-1"
          )}
        >
          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              上一章
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {prev.title}
            </div>
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <Link
          href={next.href}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg",
            "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800",
            "transition-colors group",
            "flex-1 justify-end text-right"
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              下一章
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {next.title}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}


