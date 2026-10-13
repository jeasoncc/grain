"use client";

import { useEffect, useRef } from "react";
import { useDocPathname } from "./hooks/use-doc-pathname";
import { useSafeSessionStorage } from "./hooks/use-safe-session-storage";

/**
 * 记住阅读位置，页面加载时自动恢复
 */
export function ScrollPosition() {
  const pathname = useDocPathname();
  const hasRestoredRef = useRef(false);
  const { get, set } = useSafeSessionStorage();

  useEffect(() => {
    const mainContent = document.querySelector('main[class*="overflow-y-auto"]') as HTMLElement;
    if (!mainContent) return;

    // 恢复滚动位置
    if (!hasRestoredRef.current) {
      const savedPosition = get(`docs-scroll-${pathname}`);
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        // 延迟恢复，确保内容已加载
        setTimeout(() => {
          mainContent.scrollTop = position;
          hasRestoredRef.current = true;
        }, 100);
      } else {
        hasRestoredRef.current = true;
      }
    }

    // 保存滚动位置
    let scrollTimer: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const scrollTop = mainContent.scrollTop;
        set(`docs-scroll-${pathname}`, String(scrollTop));
      }, 500); // 滚动停止 500ms 后保存
    };

    mainContent.addEventListener("scroll", handleScroll, { passive: true });

    // 页面卸载时保存
    const handleBeforeUnload = () => {
      const scrollTop = mainContent.scrollTop;
      set(`docs-scroll-${pathname}`, String(scrollTop));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      mainContent.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
    };
  }, [pathname, get, set]);

  return null;
}

