"use client";

import { useDocPathname } from "./hooks/use-doc-pathname";
import { useMemo } from "react";
import Link from "next/link";
import { FileText, ArrowRight, BookOpen } from "lucide-react";
import { docNavItems, type NavItem } from "./doc-nav-data";
import { cn } from "@/lib/utils";

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

function findRelatedDocuments(
  currentPathname: string,
  allItems: NavItem[],
  limit: number = 3
): NavItem[] {
  const currentIndex = allItems.findIndex(
    (item) => item.href === currentPathname || currentPathname.startsWith(item.href + "/")
  );

  if (currentIndex === -1) return [];

  const related: NavItem[] = [];
  
  // 获取前一个文档
  if (currentIndex > 0) {
    related.push(allItems[currentIndex - 1]);
  }
  
  // 获取后一个文档
  if (currentIndex < allItems.length - 1) {
    related.push(allItems[currentIndex + 1]);
  }
  
  // 如果有父级，添加父级的其他子项
  const currentItem = allItems[currentIndex];
  if (currentItem && currentIndex > 0) {
    // 尝试找到同级的其他文档
    for (let i = Math.max(0, currentIndex - 2); i < Math.min(allItems.length, currentIndex + 3); i++) {
      if (i !== currentIndex && !related.includes(allItems[i])) {
        if (related.length < limit) {
          related.push(allItems[i]);
        }
      }
    }
  }
  
  return related.slice(0, limit);
}

export function RelatedDocuments() {
  const pathname = useDocPathname();

  const related = useMemo(() => {
    if (pathname === "/docs") return [];
    const allItems = flattenNavItems(docNavItems);
    return findRelatedDocuments(pathname, allItems, 3);
  }, [pathname]);

  // 在 /docs 路径上不显示（必须在所有 hooks 之后）
  if (pathname === "/docs") return null;
  if (related.length === 0) return null;

  return (
    <div className={cn(
      "mt-12 pt-8 border-t border-gray-200 dark:border-gray-800",
      "animate-fade-in"
    )}>
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          相关文档
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {related.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className={cn(
              "group relative p-4 rounded-lg",
              "bg-gray-50 dark:bg-gray-900",
              "border border-gray-200 dark:border-gray-800",
              "hover:border-gray-300 dark:hover:border-gray-700",
              "hover:shadow-md transition-all duration-200",
              "flex items-start gap-3"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg",
              "bg-gray-200 dark:bg-gray-800",
              "group-hover:bg-gray-300 dark:group-hover:bg-gray-700",
              "flex items-center justify-center",
              "transition-colors duration-200"
            )}>
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "text-sm font-medium text-gray-900 dark:text-white",
                "group-hover:text-blue-600 dark:group-hover:text-blue-400",
                "transition-colors duration-200",
                "line-clamp-2"
              )}>
                {doc.title}
              </h4>
            </div>
            
            <ArrowRight className={cn(
              "w-4 h-4 text-gray-400 dark:text-gray-500",
              "group-hover:text-gray-600 dark:group-hover:text-gray-400",
              "group-hover:translate-x-1",
              "transition-all duration-200",
              "flex-shrink-0 mt-1"
            )} />
          </Link>
        ))}
      </div>
    </div>
  );
}

