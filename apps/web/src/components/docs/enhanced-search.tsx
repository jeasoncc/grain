"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, FileText, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { docNavItems, type NavItem } from "./doc-nav-data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResult {
  item: NavItem;
  type: "page" | "section";
  path: string[];
}

export function EnhancedSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 扁平化导航项以便搜索
  const flattenNavItems = useCallback((items: NavItem[], path: string[] = []): SearchResult[] => {
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
  }, []);

  const allItems = useMemo(() => flattenNavItems(docNavItems), [flattenNavItems]);

  // 搜索过滤
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return allItems.filter((result) => {
      const searchText = `${result.path.join(" ")} ${result.item.title}`.toLowerCase();
      return searchText.includes(lowerQuery);
    }).slice(0, 10); // 限制结果数量
  }, [query, allItems]);

  // 重置选中索引当结果变化时
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen || filteredResults.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && filteredResults[selectedIndex]) {
        e.preventDefault();
        const result = filteredResults[selectedIndex];
        router.push(result.item.href);
        setQuery("");
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, router]);

  // 滚动选中项到可视区域
  useEffect(() => {
    if (resultsRef.current && filteredResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex, filteredResults]);

  // 全局搜索快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setIsOpen(true);
          setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }, 100);
        }
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleResultClick = useCallback((href: string) => {
    router.push(href);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  }, [router]);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="搜索文档... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-4 py-2 w-full"
          aria-label="搜索文档"
          aria-expanded={isOpen}
          aria-controls="search-results"
        />
      </div>

      {/* Search Results */}
      {isOpen && query && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              inputRef.current?.blur();
            }}
          />
          <div
            id="search-results"
            ref={resultsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl max-h-[32rem] overflow-y-auto z-50"
            role="listbox"
            aria-label="搜索结果"
          >
            {filteredResults.length > 0 ? (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  搜索结果 ({filteredResults.length})
                </div>
                {filteredResults.map((result, index) => (
                  <button
                    key={`${result.item.href}-${index}`}
                    onClick={() => handleResultClick(result.item.href)}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                      "hover:bg-gray-100 dark:hover:bg-gray-800",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white",
                      selectedIndex === index
                        ? "bg-gray-100 dark:bg-gray-800"
                        : ""
                    )}
                    role="option"
                    aria-selected={selectedIndex === index}
                  >
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
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
                                <ArrowRight className="w-3 h-3 inline mx-1" aria-hidden="true" />
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedIndex === index && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                          Enter
                        </kbd>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  未找到与 "<span className="font-medium">{query}</span>" 相关的文档
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}






