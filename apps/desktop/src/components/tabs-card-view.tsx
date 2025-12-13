/**
 * 标签页卡片视图组件
 * 以卡片网格形式展示所有打开的标签页，支持搜索和快速切换
 */

import { useMemo, useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Calendar, FileText, Palette, X, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/db/curd";
import { cn } from "@/lib/utils";
import { fuzzyFilter } from "@/lib/fuzzy-match";
import type { EditorTab } from "@/stores/editor-tabs";

interface TabsCardViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

function getTabIcon(type: EditorTab["type"]) {
  switch (type) {
    case "diary":
      return <Calendar className="size-5 text-amber-500" />;
    case "canvas":
      return <Palette className="size-5 text-purple-500" />;
    default:
      return <FileText className="size-5 text-blue-500" />;
  }
}

function getTabTypeLabel(type: EditorTab["type"]) {
  switch (type) {
    case "diary":
      return "日记";
    case "canvas":
      return "画布";
    default:
      return "场景";
  }
}

export function TabsCardView({
  open,
  onOpenChange,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: TabsCardViewProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取章节信息
  const chapters = useLiveQuery(() => db.getAllChapters(), []) ?? [];
  const chapterMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const chapter of chapters) {
      map.set(chapter.id, chapter.title);
    }
    return map;
  }, [chapters]);

  // 模糊搜索过滤
  const filteredTabs = useMemo(() => {
    if (!search.trim()) {
      return tabs;
    }
    const results = fuzzyFilter(tabs, search, (tab) => tab.title);
    return results.map((r) => r.item);
  }, [tabs, search]);

  // 打开时重置搜索并聚焦
  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-base font-medium">
            打开的标签页 ({tabs.length})
          </DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="搜索标签页..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {filteredTabs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? "没有找到匹配的标签页" : "没有打开的标签页"}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredTabs.map((tab) => {
                  const chapterName = chapterMap.get(tab.chapterId);
                  const isActive = tab.id === activeTabId;

                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        "group relative rounded-lg border p-3 cursor-pointer",
                        "hover:bg-accent/50 hover:border-accent transition-colors",
                        isActive && "border-primary bg-primary/5 ring-1 ring-primary/20"
                      )}
                      onClick={() => onSelectTab(tab.id)}
                    >
                      {/* 关闭按钮 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute top-1 right-1 size-6",
                          "opacity-0 group-hover:opacity-100 transition-opacity",
                          "hover:bg-destructive/20 hover:text-destructive"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseTab(tab.id);
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>

                      {/* 卡片内容 */}
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5">
                          {getTabIcon(tab.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {tab.isDirty && (
                              <span className="text-primary text-sm">●</span>
                            )}
                            <span className={cn(
                              "font-medium text-sm truncate",
                              isActive && "text-primary"
                            )}>
                              {tab.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {getTabTypeLabel(tab.type)}
                            </span>
                            {chapterName && (
                              <>
                                <span className="text-muted-foreground/50">·</span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {chapterName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 当前标签标识 */}
                      {isActive && (
                        <div className="absolute bottom-1 right-2 text-[10px] text-primary/70">
                          当前
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 底部提示 */}
        <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground shrink-0">
          点击卡片切换标签页 · 悬停显示关闭按钮
        </div>
      </DialogContent>
    </Dialog>
  );
}
