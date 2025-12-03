import { useEffect, useState, RefObject } from "react";

/**
 * 获取主内容区域的 Hook
 * 统一管理主内容区域的引用和查询
 */
export function useMainContent(): [HTMLElement | null, RefObject<HTMLElement>] {
  const [mainContent, setMainContent] = useState<HTMLElement | null>(null);
  const ref = { current: mainContent } as RefObject<HTMLElement>;

  useEffect(() => {
    const queryMainContent = () => {
      const element = document.querySelector('main[class*="overflow-y-auto"]') as HTMLElement;
      if (element) {
        setMainContent(element);
        ref.current = element;
      }
    };

    // 立即查询
    queryMainContent();

    // 如果没找到，延迟重试
    if (!mainContent) {
      const timer = setTimeout(queryMainContent, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return [mainContent, ref];
}



