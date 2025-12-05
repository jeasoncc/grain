"use client";

import { useEffect } from "react";

/**
 * 统一的 DOM 观察器
 * 合并多个 MutationObserver，减少性能开销
 */
export function UnifiedObserver({ onContentChange }: { onContentChange: () => void }) {
  useEffect(() => {
    let observerTimer: NodeJS.Timeout;
    
    const observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        onContentChange();
      }, 300); // 节流
    });

    const article = document.querySelector("article");
    if (article) {
      observer.observe(article, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      clearTimeout(observerTimer);
      observer.disconnect();
    };
  }, [onContentChange]);

  return null;
}






