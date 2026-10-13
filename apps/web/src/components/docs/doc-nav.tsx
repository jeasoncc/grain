"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useDocPathname } from "./hooks/use-doc-pathname";
import {
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocSearch } from "./doc-search";
import { docNavItems, type NavItem } from "./doc-nav-data";
import { useScrollbar } from "./hooks/use-scrollbar";

interface NavItemComponentProps {
  item: NavItem;
  level?: number;
  pathname: string;
  openItems: Record<string, boolean>;
  onToggle: (href: string) => void;
}

function NavItemComponent({
  item,
  level = 0,
  pathname,
  openItems,
  onToggle,
}: NavItemComponentProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const isOpen = Boolean(openItems[item.href]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onToggle(item.href);
  }, [item.href, onToggle]);

  return (
    <li>
      <div className="group">
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            level > 0 && "pl-6",
            isActive
              ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
              : "text-gray-600 dark:text-gray-400",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white"
          )}
          aria-current={isActive ? "page" : undefined}
        >
          {item.icon && (
            <span className={cn("flex-shrink-0", level > 0 && "opacity-60")} aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className="flex-1 truncate">{item.title}</span>
          {hasChildren && (
            <button
              onClick={handleToggle}
              className="flex-shrink-0 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              aria-label={isOpen ? `收起 ${item.title}` : `展开 ${item.title}`}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </Link>
        {hasChildren && isOpen && (
          <ul className="mt-1 space-y-1" role="group">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                level={level + 1}
                pathname={pathname}
                openItems={openItems}
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function DocNav() {
  const pathname = useDocPathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const activeItems = useMemo(() => {
    const items: Record<string, boolean> = {};
    docNavItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + "/")
        );
        if (hasActiveChild || pathname === item.href) {
          items[item.href] = true;
        }
      }
    });
    return items;
  }, [pathname]);

  const [expansion, setExpansion] = useState<{
    pathname: string;
    items: Record<string, boolean>;
  }>({ pathname, items: {} });
  if (expansion.pathname !== pathname) {
    setExpansion({ pathname, items: {} });
  }
  const openItems = useMemo(
    () => ({ ...activeItems, ...(expansion.pathname === pathname ? expansion.items : {}) }),
    [expansion, pathname, activeItems]
  );

  const handleToggle = useCallback((href: string) => {
    setExpansion((previous) => ({
      pathname,
      items: {
        ...(previous.pathname === pathname ? previous.items : {}),
        [href]: previous.pathname === pathname
          ? !(previous.items[href] ?? activeItems[href])
          : !activeItems[href],
      },
    }));
  }, [pathname, activeItems]);

  // 自动滚动到激活项
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const timer = setTimeout(() => {
      const activeItem = container.querySelector('a[aria-current="page"]');
      if (!activeItem) return;

      const itemRect = activeItem.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const targetScrollTop = scrollTop + itemRect.top - containerRect.top - 20;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname, openItems]);

  // 使用智能滚动条 Hook
  useScrollbar(scrollContainerRef);

  return (
    <nav 
      className="w-64 h-full flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black"
      aria-label="文档导航"
      role="navigation"
    >
      {/* 左侧导航栏内容 - 可滚动 */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="p-4">
          <div className="mb-4 px-3">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              文档导航
            </h2>
          </div>
          {/* Search in Sidebar (Desktop) */}
          <div className="mb-4 px-3 hidden lg:block">
            <DocSearch />
          </div>
          <ul className="space-y-1" role="list">
            {docNavItems.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                pathname={pathname}
                openItems={openItems}
                onToggle={handleToggle}
              />
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
