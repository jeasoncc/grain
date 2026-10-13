"use client";

import { useDocPathname } from "./hooks/use-doc-pathname";
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

export function MetadataDisplay() {
  const pathname = useDocPathname();
  
  if (pathname === "/docs") return null;

  // 这里可以从 CMS 或 API 获取元数据
  // 目前使用模拟数据
  const lastUpdated = "2024年1月15日"; // 可以从页面 frontmatter 获取
  const author = "文档团队"; // 可以从页面 frontmatter 获取
  const version = "v1.0.0"; // 可以从页面 frontmatter 获取

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-x-6 gap-y-2 text-sm",
      "mb-8 pb-6 border-b",
      "border-gray-200 dark:border-gray-800",
      "animate-fade-in"
    )}>
      {lastUpdated && (
        <span className="text-gray-500 dark:text-gray-500">
          {lastUpdated}
        </span>
      )}
      
      {author && (
        <span className="text-gray-500 dark:text-gray-500">
          {author}
        </span>
      )}
      
      <span className="text-gray-500 dark:text-gray-500">
        {version}
      </span>
    </div>
  );
}


