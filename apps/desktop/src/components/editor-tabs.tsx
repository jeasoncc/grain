/**
 * 编辑器标签栏组件
 * 支持多文件同时打开，类似 VS Code 的标签页
 * 支持水平滚动、标题自动缩短、卡片视图
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { X, FileText, Calendar, Palette, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorTabsStore, type EditorTab } from "@/stores/editor-tabs";
import { useSelectionStore } from "@/stores/selection";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditorTabsProps {
  className?: string;
}

// 根据标签数量计算最大宽度
function getTabMaxWidth(tabCount: number): number {
  if (tabCount <= 3) return 200;
  if (tabCount <= 5) return 160;
  if (tabCount <= 8) return 120;
  return 100;
}

export function EditorTabs({ className }: EditorTabsProps) {
  const selectedProjectId = useSelectionStore(s => s.selectedProjectId);
  const allTabs = useEditorTabsStore(s => s.tabs);
  // 只显示当前 workspace 的标签
  const tabs = useMemo(() => 
    allTabs.filter(t => t.projectId === selectedProjectId),
    [allTabs, selectedProjectId]
  );
  const activeTabId = useEditorTabsStore(s => s.activeTabId);
  const setActiveTab = useEditorTabsStore(s => s.setActiveTab);
  const closeTab = useEditorTabsStore(s => s.closeTab);

  const [cardViewOpen, setCardViewOpen] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 计算标签最大宽度
  const tabMaxWidth = useMemo(() => getTabMaxWidth(tabs.length), [tabs.length]);

  // 检查是否需要显示滚动按钮
  const checkScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasOverflow = container.scrollWidth > container.clientWidth;
    setShowScrollButtons(hasOverflow);
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  };

  useEffect(() => {
    checkScrollState();
    window.addEventListener("resize", checkScrollState);
    return () => window.removeEventListener("resize", checkScrollState);
  }, [tabs.length]);

  // 滚动到活动标签
  useEffect(() => {
    if (!activeTabId || !scrollContainerRef.current) return;
    const activeElement = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    activeElement?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTabId]);

  const handleScroll = () => {
    checkScrollState();
  };

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -150, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 150, behavior: "smooth" });
  };

  if (tabs.length === 0) {
    return null;
  }

  const getTabIcon = (type: EditorTab["type"]) => {
    switch (type) {
      case "diary":
        return <Calendar className="size-3.5 shrink-0" />;
      case "canvas":
        return <Palette className="size-3.5 shrink-0" />;
      default:
        return <FileText className="size-3.5 shrink-0" />;
    }
  };

  return (
    <>
      <div className={cn("border-b bg-muted/30 flex items-center min-w-0 overflow-hidden", className)}>
        {/* 左滚动按钮 */}
        {showScrollButtons && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-6 rounded-none border-r shrink-0",
              !canScrollLeft && "opacity-30 cursor-default"
            )}
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}

        {/* 标签容器 - 关键：min-w-0 + overflow-hidden 防止撑开父容器 */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden"
          onScroll={handleScroll}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <div className="flex items-center w-max">
            {tabs.map((tab) => (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    data-tab-id={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "group flex items-center gap-1.5 px-2.5 py-1.5 text-sm border-r shrink-0",
                      "hover:bg-accent/50 transition-colors h-8",
                      activeTabId === tab.id
                        ? "bg-background border-b-2 border-b-primary"
                        : "bg-muted/50"
                    )}
                    style={{ maxWidth: `${tabMaxWidth}px`, minWidth: "70px" }}
                  >
                    {getTabIcon(tab.type)}
                    <span className="truncate flex-1 text-left text-xs">
                      {tab.isDirty && <span className="text-primary mr-0.5">●</span>}
                      {tab.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-4 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {tab.title}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* 右滚动按钮 */}
        {showScrollButtons && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-6 rounded-none border-l shrink-0",
              !canScrollRight && "opacity-30 cursor-default"
            )}
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <ChevronRight className="size-4" />
          </Button>
        )}

        {/* 卡片视图按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-none border-l shrink-0"
              onClick={() => setCardViewOpen(true)}
            >
              <LayoutGrid className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            查看所有标签页
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 卡片视图弹窗 */}
      <Dialog open={cardViewOpen} onOpenChange={setCardViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>所有标签页</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCardViewOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-left",
                  "hover:bg-accent transition-colors",
                  activeTabId === tab.id && "border-primary bg-accent"
                )}
              >
                {getTabIcon(tab.type)}
                <span className="flex-1 truncate text-sm">{tab.title}</span>
                {tab.isDirty && <span className="text-primary">●</span>}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X className="size-3" />
                </Button>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
