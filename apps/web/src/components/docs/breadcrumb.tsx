"use client";

import { useDocPathname } from "./hooks/use-doc-pathname";
import { useMemo } from "react";
import Link from "next/link";
import { docNavItems, type NavItem } from "./doc-nav-data";

function findPathToItem(
  items: NavItem[],
  targetPath: string,
  currentPath: NavItem[] = []
): NavItem[] | null {
  for (const item of items) {
    const newPath = [...currentPath, item];
    
    if (item.href === targetPath) {
      return newPath;
    }
    
    if (item.children) {
      const found = findPathToItem(item.children, targetPath, newPath);
      if (found) return found;
    }
  }
  
  return null;
}

export function Breadcrumb() {
  const pathname = useDocPathname();
  
  const breadcrumbItems = useMemo(() => {
    if (pathname === "/docs") {
      return [{ title: "文档", href: "/docs" }];
    }
    
    const path = findPathToItem(docNavItems, pathname);
    if (!path) return [{ title: "文档", href: "/docs" }];
    
    return [
      { title: "文档", href: "/docs" },
      ...path.map(item => ({ title: item.title, href: item.href })),
    ];
  }, [pathname]);

  if (breadcrumbItems.length <= 1) return null;

  return (
    <nav 
      className="flex items-center gap-1.5 text-sm mb-8 text-gray-500 dark:text-gray-400" 
      aria-label="面包屑导航"
    >
      <Link
        href="/docs"
        className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
      >
        文档
      </Link>
      {breadcrumbItems.slice(1).map((item, index) => (
        <div key={item.href} className="flex items-center gap-1.5">
          <span className="text-gray-300 dark:text-gray-700">/</span>
          {index === breadcrumbItems.length - 2 ? (
            <span className="text-gray-900 dark:text-white font-medium">
              {item.title}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
            >
              {item.title}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

