"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { useMediaQuery } from "./hooks/use-media-query";
import { useScrollbar } from "./hooks/use-scrollbar";
import { useLocalStorageValue } from "./hooks/use-safe-local-storage";
import { DocNav } from "./doc-nav";
import { TableOfContents } from "./table-of-contents";
import { DocSearch } from "./doc-search";
import { Breadcrumb } from "./breadcrumb";
import { ReadingProgress } from "./reading-progress";
import { ScrollSmooth } from "./scroll-smooth";
import { KeyboardNavigation } from "./keyboard-navigation";
import { ScrollToTop } from "./scroll-to-top";
import { ScrollShadows } from "./scroll-shadows";
import { ReadingTime } from "./reading-time";
import { SidebarToggle } from "./sidebar-toggle";
import { KeyboardHelp } from "./keyboard-help";
import { FocusMode } from "./focus-mode";
import { CodeBlockCopy } from "./code-block-copy";
import { ScrollPosition } from "./scroll-position";
import { FontSizeControl } from "./font-size-control";
import { ChapterNavigation } from "./chapter-navigation";
import { ExternalLinks } from "./external-links";
import { ImageZoom } from "./image-zoom";
import { PrintStyles } from "./print-styles";
import { AccessibilityEnhancements } from "./accessibility-enhancements";
import { PerformanceMonitor } from "./performance-monitor";
import { KeyboardSearch } from "./keyboard-search";
import { MetadataDisplay } from "./metadata-display";
import { DocsErrorBoundary } from "./error-boundary";
import { ShareButton } from "./share-button";
import { DocumentTags } from "./document-tags";
import { RelatedDocuments } from "./related-documents";
import { DocumentStats } from "./document-stats";
import { DocumentFeedback } from "./document-feedback";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const mainContentRef = useRef<HTMLElement>(null);
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [mobileSidebar, setMobileSidebar] = useState({ isMobile, open: false });
  if (mobileSidebar.isMobile !== isMobile) {
    setMobileSidebar({ isMobile, open: false });
  }
  const sidebarOpen = isMobile && mobileSidebar.open;
  const [savedCollapsed, setCollapsed] = useLocalStorageValue("docs-sidebar-collapsed");
  const [savedFocus, setFocus] = useLocalStorageValue("docs-focus-mode");
  const [savedFontSize, setFontSize] = useLocalStorageValue("docs-font-size");
  const fontSize = savedFontSize === "sm" || savedFontSize === "base" ||
    savedFontSize === "lg" || savedFontSize === "xl" ? savedFontSize : "lg";
  const sidebarCollapsed = savedCollapsed === "true";
  const focusMode = savedFocus === "true";
  const handleSidebarToggle = useCallback((collapsed: boolean) => {
    setCollapsed(String(collapsed));
    if (!collapsed) setFocus("false");
  }, [setCollapsed, setFocus]);
  const handleFocusToggle = useCallback((focused: boolean) => {
    setFocus(String(focused));
  }, [setFocus]);

  // 使用智能滚动条 Hook
  useScrollbar(mainContentRef);

  // 在文档页面隐藏全局 footer
  useEffect(() => {
    const footer = document.querySelector('body > footer') as HTMLElement;
    if (footer) {
      footer.style.display = 'none';
    }
    return () => {
      if (footer) {
        footer.style.display = '';
      }
    };
  }, []);

  return (
    <DocsErrorBoundary>
      <div className="docs-reader relative h-[calc(100dvh-4rem)] bg-white dark:bg-black" data-font-size={fontSize}>
      {/* Keyboard Navigation */}
      <KeyboardNavigation />
      
      {/* Scroll Smooth Enhancement */}
      <ScrollSmooth />
      
      {/* Reading Progress Bar */}
      <ReadingProgress />
      
      {/* Scroll Shadows */}
      <ScrollShadows />
      
      {/* Code Block Copy */}
      <CodeBlockCopy />
      
      {/* External Links */}
      <ExternalLinks />
      
      {/* Image Zoom */}
      <ImageZoom />
      
      {/* Scroll Position Memory */}
      <ScrollPosition />
      
      {/* Print Styles */}
      <PrintStyles />
      
      {/* Accessibility Enhancements */}
      <AccessibilityEnhancements />
      
      {/* Performance Monitor */}
      <PerformanceMonitor />
      
      {/* Global Keyboard Search */}
      <KeyboardSearch />

      {/* Reading tools have their own row below the global header. */}
      <div className="docs-reading-tools fixed left-0 right-0 z-40 flex items-center gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black px-2 sm:px-4 print:hidden" role="region" aria-label="阅读工具">
        <div className="hidden lg:block">
          <SidebarToggle collapsed={sidebarCollapsed || focusMode} onToggle={handleSidebarToggle} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileSidebar({ isMobile, open: !sidebarOpen })}
          className="lg:hidden h-8 w-8 shrink-0 p-0"
          aria-label={sidebarOpen ? "关闭文档导航" : "打开文档导航"}
          aria-expanded={sidebarOpen}
          aria-controls="docs-navigation"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <FontSizeControl fontSize={fontSize} onFontSizeChange={setFontSize} />
          <ShareButton />
          <FocusMode isFocused={focusMode} onToggle={handleFocusToggle} />
          <KeyboardHelp />
          <div className="h-8 w-8 shrink-0">
            <ScrollToTop />
          </div>
        </div>
      </div>

      {/* Layout Container - 使用固定定位实现两侧固定、中间滚动 */}
      <div className="flex relative">
        {sidebarOpen && (
          <div
            className="docs-sidebar-overlay lg:hidden fixed inset-x-0 bottom-0 z-20 bg-black/50"
            onClick={() => setMobileSidebar({ isMobile, open: false })}
            aria-hidden="true"
          />
        )}
        {/* Left Sidebar - Navigation (固定定位) */}
        <aside
          id="docs-navigation"
          inert={isMobile ? !sidebarOpen : sidebarCollapsed || focusMode}
          className={cn(
            // 移动端：固定定位，可滑动
            "docs-navigation-panel fixed bottom-0 left-0 z-30",
            "bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800",
            "transform transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            (sidebarCollapsed || focusMode) && "lg:-translate-x-full"
          )}
        >
          <DocNav />
        </aside>

        {/* Main Content Area (中间区域，独立滚动) */}
        <main 
          ref={mainContentRef}
          inert={sidebarOpen}
          className={cn(
            "docs-main fixed left-0 right-0 bottom-0 min-w-0",
            // 为左侧导航栏留出空间（折叠或专注模式时不需要）
            (sidebarCollapsed || focusMode) ? "lg:ml-0" : "lg:ml-64",
            // 为右侧目录留出空间（仅大屏幕）
            focusMode ? "xl:mr-0" : "xl:mr-64",
            "overflow-y-auto",
            // 平滑滚动
            "scroll-smooth",
            // 智能滚动条：默认隐藏，悬停或滚动时显示
            "scrollbar-auto-hide",
            // 滚动性能优化
            "overscroll-contain"
          )}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 pb-24 lg:pb-24">
              {/* Breadcrumb */}
              <Breadcrumb />
              
              {/* Metadata Display - 始终渲染，组件内部处理条件 */}
              <MetadataDisplay />
              
              {/* Document Tags */}
              <DocumentTags />
              
              {/* Document Stats */}
              <DocumentStats />
              
              {/* Reading Time - 始终渲染，组件内部处理条件 */}
              <ReadingTime />
              
              {/* Search - 始终渲染，组件内部处理条件 */}
              <div className="mb-6 lg:hidden">
                <DocSearch />
              </div>

              <article className="docs-article prose dark:prose-invert max-w-none
                prose-headings:scroll-mt-20 prose-headings:font-semibold
                prose-p:text-gray-600 dark:prose-p:text-gray-400
                prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-700 dark:hover:prose-a:text-blue-300 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
                prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 dark:prose-pre:border-gray-700">
                {children}
              </article>
              
              {/* Related Documents */}
              <RelatedDocuments />
              
              {/* Document Feedback */}
              <DocumentFeedback />
              
              {/* Chapter Navigation - 始终渲染，组件内部处理条件 */}
              <ChapterNavigation />
          </div>
        </main>

        {/* Right Sidebar - Table of Contents (固定定位) */}
        <aside 
          inert={focusMode}
          className={cn(
            "hidden xl:block",
            "docs-toc-panel fixed right-0 bottom-0",
            "z-30",
            "transform transition-transform duration-300 ease-in-out",
            focusMode && "translate-x-full"
          )}
        >
          <TableOfContents />
        </aside>
      </div>
      </div>
    </DocsErrorBoundary>
  );
}

