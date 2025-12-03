import { useEffect, RefObject } from "react";

/**
 * 智能滚动条 Hook
 * 默认隐藏，悬停或滚动时显示
 */
export function useScrollbar(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 添加滚动条类
    container.classList.add("scrollbar-auto-hide");

    let scrollTimer: NodeJS.Timeout;
    const handleScroll = () => {
      container.classList.add("scrolling");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (!container.matches(":hover")) {
          container.classList.remove("scrolling");
        }
      }, 1000);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      container.classList.remove("scrollbar-auto-hide", "scrolling");
    };
  }, [containerRef]);
}


