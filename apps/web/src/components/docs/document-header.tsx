"use client";

import { useDocPathname } from "./hooks/use-doc-pathname";
import { useMemo } from "react";
import { docNavItems, type NavItem } from "./doc-nav-data";
import { cn } from "@/lib/utils";

function findDocItem(pathname: string): NavItem | null {
  function search(items: NavItem[]): NavItem | null {
    for (const item of items) {
      if (item.href === pathname) {
        return item;
      }
      if (item.children) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(docNavItems);
}

export function DocumentHeader() {
  const pathname = useDocPathname();

  const docItem = useMemo(() => {
    if (pathname === "/docs") return null;
    return findDocItem(pathname);
  }, [pathname]);

  // 在 /docs 路径上不显示（必须在所有 hooks 之后）
  if (pathname === "/docs") return null;
  if (!docItem) return null;

  return (
    <div className={cn(
      "mb-8 pb-6 border-b border-gray-200 dark:border-gray-800",
      "animate-fade-in-up"
    )}>
      <h1 className={cn(
        "text-4xl lg:text-5xl font-bold tracking-tight mb-4",
        "bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400",
        "bg-clip-text text-transparent"
      )}>
        {docItem.title}
      </h1>
      
      {docItem.description && (
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
          {docItem.description}
        </p>
      )}
    </div>
  );
}

