/**
 * Buffer Switcher - Emacs-style file switching dialog
 * Supports fuzzy search and keyboard navigation for quick tab switching
 */

import { useLiveQuery } from "dexie-react-hooks";
import { Calendar, FileText, Palette } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/db/curd";
import { cn } from "@/lib/utils";
import { fuzzyFilter } from "@/lib/fuzzy-match";
import type { EditorTab } from "@/stores/editor-tabs";

interface BufferSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  initialDirection?: "forward" | "backward";
}

/**
 * Get the icon component for a tab type
 */
function getTabIcon(type: EditorTab["type"]) {
  switch (type) {
    case "diary":
      return <Calendar className="size-4 text-amber-500" />;
    case "canvas":
      return <Palette className="size-4 text-purple-500" />;
    default:
      return <FileText className="size-4 text-blue-500" />;
  }
}

export function BufferSwitcher({
  open,
  onOpenChange,
  tabs,
  activeTabId,
  onSelectTab,
  initialDirection = "forward",
}: BufferSwitcherProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch chapters for displaying parent chapter names
  const chapters = useLiveQuery(() => db.getAllChapters(), []) ?? [];

  // Create a map of chapter IDs to chapter titles for quick lookup
  const chapterMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const chapter of chapters) {
      map.set(chapter.id, chapter.title);
    }
    return map;
  }, [chapters]);

  // Filter tabs based on search query using fuzzy matching
  const filteredTabs = useMemo(() => {
    if (!search.trim()) {
      return tabs;
    }
    const results = fuzzyFilter(tabs, search, (tab) => tab.title);
    return results.map((r) => r.item);
  }, [tabs, search]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearch("");
      // Set initial selection based on direction
      if (initialDirection === "backward" && tabs.length > 1) {
        setSelectedIndex(tabs.length - 1);
      } else if (tabs.length > 1) {
        // Select the second tab (next after current) if available
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
        setSelectedIndex(currentIndex >= 0 && currentIndex < tabs.length - 1 ? currentIndex + 1 : 0);
      } else {
        setSelectedIndex(0);
      }
      // Focus input after a short delay to ensure dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, tabs, activeTabId, initialDirection]);

  // Ensure selected index is within bounds when filtered list changes
  useEffect(() => {
    if (selectedIndex >= filteredTabs.length) {
      setSelectedIndex(Math.max(0, filteredTabs.length - 1));
    }
  }, [filteredTabs.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredTabs.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, filteredTabs.length]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredTabs.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredTabs[selectedIndex]) {
            onSelectTab(filteredTabs[selectedIndex].id);
            onOpenChange(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
        case "Tab":
          // Allow Tab to cycle through items like Ctrl+Tab behavior
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedIndex((i) => (i - 1 + filteredTabs.length) % filteredTabs.length);
          } else {
            setSelectedIndex((i) => (i + 1) % filteredTabs.length);
          }
          break;
      }
    },
    [filteredTabs, selectedIndex, onSelectTab, onOpenChange]
  );

  // Handle item click
  const handleItemClick = useCallback(
    (tabId: string) => {
      onSelectTab(tabId);
      onOpenChange(false);
    },
    [onSelectTab, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden"
        showCloseButton={false}
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Switch Buffer</DialogTitle>
        <div className="p-3 border-b">
          <Input
            ref={inputRef}
            placeholder="Search open files..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="h-9"
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          <div ref={listRef} className="py-1">
            {filteredTabs.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matching files found
              </div>
            ) : (
              filteredTabs.map((tab, index) => {
                const chapterName = chapterMap.get(tab.chapterId);
                const isActive = tab.id === activeTabId;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={tab.id}
                    data-index={index}
                    onClick={() => handleItemClick(tab.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-left",
                      "transition-colors cursor-pointer",
                      isSelected && "bg-accent",
                      isActive && "bg-primary/10"
                    )}
                  >
                    {getTabIcon(tab.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "truncate font-medium",
                          isActive && "text-primary"
                        )}>
                          {tab.isDirty && (
                            <span className="text-primary mr-1">●</span>
                          )}
                          {tab.title}
                        </span>
                        {isActive && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            (current)
                          </span>
                        )}
                      </div>
                      {chapterName && (
                        <div className="text-xs text-muted-foreground truncate">
                          {chapterName}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
        <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex items-center gap-4">
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> Select
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
