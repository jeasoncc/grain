"use client";

import { useState, useMemo, useEffect } from "react";
import { useDocPathname } from "./hooks/use-doc-pathname";
import { Search, FileText, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { docNavItems, type NavItem } from "./doc-nav-data";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SearchResult {
  item: NavItem;
  type: "page" | "section";
  path: string[];
}

export function DocSearch() {
  const pathname = useDocPathname();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // 扁平化导航项以便搜索
  const flattenNavItems = (items: NavItem[], path: string[] = []): SearchResult[] => {
    const results: SearchResult[] = [];
    
    items.forEach((item) => {
      const currentPath = [...path, item.title];
      results.push({
        item,
        type: "page",
        path: currentPath,
      });

      if (item.children) {
        item.children.forEach((child) => {
          results.push({
            item: child,
            type: "section",
            path: [...currentPath, child.title],
          });
        });
      }
    });

    return results;
  };

  const allItems = useMemo(() => flattenNavItems(docNavItems), []);

  // 搜索过滤
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return allItems.filter((result) => {
      const searchText = `${result.path.join(" ")} ${result.item.title}`.toLowerCase();
      return searchText.includes(lowerQuery);
    }).slice(0, 10); // 限制结果数量
  }, [query, allItems]);

  // 键盘快捷键：Ctrl/Cmd + K 打开搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 在 /docs 路径上不显示（必须在所有 hooks 之后）
  if (pathname === "/docs") return null;

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="搜索文档... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-4 py-2 w-full"
        />
      </div>

      {/* Search Results */}
      {isOpen && query && filteredResults.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl max-h-[32rem] overflow-y-auto z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                搜索结果 ({filteredResults.length})
              </div>
              {filteredResults.map((result, index) => (
                <Link
                  key={`${result.item.href}-${index}`}
                  href={result.item.href}
                  onClick={() => {
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    "block"
                  )}
                >
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {result.item.title}
                      {result.type === "section" && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          章节
                        </span>
                      )}
                    </div>
                    {result.path.length > 1 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                        {result.path.slice(0, -1).map((p, i) => (
                          <span key={i}>
                            {p}
                            {i < result.path.slice(0, -1).length - 1 && (
                              <ArrowRight className="w-3 h-3 inline mx-1" />
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
      
      {isOpen && query && filteredResults.length === 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl z-50">
            <div className="p-8 text-center">
              <Search className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                未找到与 &quot;<span className="font-medium">{query}</span>&quot; 相关的文档
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
