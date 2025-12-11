/**
 * Wiki 悬浮预览组件
 * 鼠标悬停在 Wiki 提及内容上时显示预览卡片
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Hash, Tag } from "lucide-react";
import logger from "@/log";
import type { WikiEntryInterface } from "@/db/schema";
import { getWikiEntry } from "@/services/wiki";
import { RichContentRenderer } from "./rich-content-renderer";

// 配置常量
const HOVER_DELAY_SHOW = 300; // 显示延迟 300ms
const HOVER_DELAY_HIDE = 150; // 隐藏延迟 150ms
const PREVIEW_MAX_WIDTH = 380; // 最大宽度
const PREVIEW_MAX_HEIGHT = 400; // 最大高度
const CONTENT_MAX_HEIGHT = 280; // 内容区域最大高度

interface WikiHoverPreviewProps {
  entryId: string;
  anchorElement: HTMLElement;
  onClose: () => void;
}

interface PreviewPosition {
  top: number;
  left: number;
}

/**
 * 检查内容是否为空
 */
function isContentEmpty(content: string): boolean {
  if (!content) return true;
  
  try {
    const parsed = JSON.parse(content);
    if (!parsed.root || !parsed.root.children) return true;
    
    // 递归检查是否有实际文本内容
    function hasText(node: any): boolean {
      if (node.text && node.text.trim()) return true;
      if (node.children && Array.isArray(node.children)) {
        return node.children.some((child: any) => hasText(child));
      }
      return false;
    }
    
    return !hasText(parsed.root);
  } catch {
    // 如果不是 JSON，检查是否有非空文本
    return !content.trim();
  }
}

/**
 * 计算预览卡片位置
 */
function calculatePosition(anchorElement: HTMLElement): PreviewPosition {
  const rect = anchorElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // 默认显示在元素下方
  let top = rect.bottom + 8;
  let left = rect.left;
  
  // 如果下方空间不足，显示在上方
  if (top + 200 > viewportHeight) {
    top = rect.top - 8 - 200; // 预估高度 200px
  }
  
  // 确保不超出右边界
  if (left + PREVIEW_MAX_WIDTH > viewportWidth) {
    left = viewportWidth - PREVIEW_MAX_WIDTH - 16;
  }
  
  // 确保不超出左边界
  if (left < 16) {
    left = 16;
  }
  
  return { top, left };
}

/**
 * Wiki 悬浮预览卡片内容
 * 改进设计：渐变背景、增强阴影、完整内容显示
 */
function PreviewCard({ 
  entry, 
  onMouseEnter, 
  onMouseLeave 
}: { 
  entry: WikiEntryInterface;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const hasContent = !isContentEmpty(entry.content);
  const hasAliases = entry.alias && entry.alias.length > 0;
  const hasTags = entry.tags && entry.tags.length > 0;

  return (
    <div
      data-wiki-preview="true"
      className="relative overflow-hidden rounded-xl animate-in fade-in-0 zoom-in-95 duration-200"
      style={{ 
        maxWidth: PREVIEW_MAX_WIDTH,
        maxHeight: PREVIEW_MAX_HEIGHT,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 背景层：渐变 + 模糊效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-popover via-popover to-primary/5 dark:to-primary/10" />
      
      {/* 边框和阴影 */}
      <div className="absolute inset-0 rounded-xl border border-border/60 shadow-2xl shadow-black/10 dark:shadow-black/30" />
      
      {/* 顶部装饰线 */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      {/* 内容容器 */}
      <div className="relative p-4">
        {/* 头部：名称和图标 */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shrink-0 shadow-sm">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-base font-semibold text-foreground leading-tight">
              {entry.name}
            </h4>
            {/* 别名 - 显示所有别名 */}
            {hasAliases && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Hash className="size-3 shrink-0 text-primary/60" />
                <span className="line-clamp-2">{entry.alias.join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* 标签 - 显示所有标签 */}
        {hasTags && (
          <div className="flex items-start gap-1.5 mb-3 flex-wrap">
            <Tag className="size-3 text-muted-foreground shrink-0 mt-1" />
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-secondary/80 text-secondary-foreground border border-border/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 分隔线 */}
        {(hasAliases || hasTags) && hasContent && (
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
        )}

        {/* 完整内容 - 使用 RichContentRenderer */}
        {hasContent ? (
          <div 
            className="overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1"
            style={{ maxHeight: CONTENT_MAX_HEIGHT }}
          >
            <RichContentRenderer 
              content={entry.content}
              className="text-sm text-foreground/90"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic py-2">
            暂无内容描述
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Wiki 悬浮预览组件
 */
export function WikiHoverPreview({
  entryId,
  anchorElement,
  onClose,
}: WikiHoverPreviewProps) {
  const [entry, setEntry] = useState<WikiEntryInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<PreviewPosition>({ top: 0, left: 0 });
  const hideTimerRef = useRef<number | null>(null);

  // 加载 Wiki 条目数据
  useEffect(() => {
    let cancelled = false;
    
    async function loadEntry() {
      try {
        const data = await getWikiEntry(entryId);
        if (!cancelled && data) {
          setEntry(data);
        }
      } catch (error) {
        logger.error("Failed to load wiki entry:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    loadEntry();
    
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  // 计算位置
  useEffect(() => {
    setPosition(calculatePosition(anchorElement));
  }, [anchorElement]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // 处理鼠标进入预览卡片
  const handleMouseEnterPreview = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // 处理鼠标离开预览卡片
  const handleMouseLeavePreview = useCallback(() => {
    hideTimerRef.current = window.setTimeout(() => {
      onClose();
    }, HOVER_DELAY_HIDE);
  }, [onClose]);

  // 如果正在加载，显示骨架屏
  if (loading) {
    return createPortal(
      <div
        className="fixed z-[9999]"
        style={{ top: position.top, left: position.left }}
      >
        <div
          className="relative overflow-hidden rounded-xl animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ maxWidth: PREVIEW_MAX_WIDTH }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-popover via-popover to-primary/5" />
          <div className="absolute inset-0 rounded-xl border border-border/60 shadow-2xl shadow-black/10" />
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-5 bg-muted rounded animate-pulse w-28" />
                <div className="h-3 bg-muted rounded animate-pulse w-20" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 bg-muted rounded animate-pulse w-full" />
              <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
              <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // 如果条目不存在
  if (!entry) {
    return createPortal(
      <div
        className="fixed z-[9999]"
        style={{ top: position.top, left: position.left }}
      >
        <div
          className="relative overflow-hidden rounded-xl animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ maxWidth: PREVIEW_MAX_WIDTH }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-popover via-popover to-destructive/5" />
          <div className="absolute inset-0 rounded-xl border border-border/60 shadow-2xl shadow-black/10" />
          <div className="relative p-4">
            <p className="text-sm text-muted-foreground">条目已删除</p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed z-[9999]"
      style={{ top: position.top, left: position.left }}
    >
      <PreviewCard
        entry={entry}
        onMouseEnter={handleMouseEnterPreview}
        onMouseLeave={handleMouseLeavePreview}
      />
    </div>,
    document.body
  );
}

/**
 * 悬浮预览状态管理 Hook
 * 用于管理悬浮预览的显示/隐藏逻辑
 */
export function useWikiHoverPreview() {
  const [previewState, setPreviewState] = useState<{
    isVisible: boolean;
    entryId: string | null;
    anchorElement: HTMLElement | null;
  }>({
    isVisible: false,
    entryId: null,
    anchorElement: null,
  });
  
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  // 清理所有定时器
  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // 显示预览（带延迟）
  const showPreview = useCallback((entryId: string, anchorElement: HTMLElement) => {
    clearTimers();
    
    showTimerRef.current = window.setTimeout(() => {
      setPreviewState({
        isVisible: true,
        entryId,
        anchorElement,
      });
    }, HOVER_DELAY_SHOW);
  }, [clearTimers]);

  // 隐藏预览（带延迟）
  const hidePreview = useCallback(() => {
    clearTimers();
    
    hideTimerRef.current = window.setTimeout(() => {
      setPreviewState({
        isVisible: false,
        entryId: null,
        anchorElement: null,
      });
    }, HOVER_DELAY_HIDE);
  }, [clearTimers]);

  // 立即隐藏预览
  const hidePreviewImmediately = useCallback(() => {
    clearTimers();
    setPreviewState({
      isVisible: false,
      entryId: null,
      anchorElement: null,
    });
  }, [clearTimers]);

  // 取消隐藏（鼠标移入预览卡片时调用）
  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    previewState,
    showPreview,
    hidePreview,
    hidePreviewImmediately,
    cancelHide,
  };
}

export default WikiHoverPreview;
