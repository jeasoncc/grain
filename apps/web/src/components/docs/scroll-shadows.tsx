"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ScrollShadows() {
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  useEffect(() => {
    const mainContent = document.querySelector('main[class*="overflow-y-auto"]') as HTMLElement;
    if (!mainContent) return;

    const updateShadows = () => {
      const { scrollTop, scrollHeight, clientHeight } = mainContent;
      
      // 顶部阴影：不在顶部时显示
      setShowTopShadow(scrollTop > 10);
      
      // 底部阴影：不在底部时显示
      setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 10);
    };

    mainContent.addEventListener("scroll", updateShadows, { passive: true });
    updateShadows(); // 初始检查

    // 监听内容变化
    const observer = new MutationObserver(updateShadows);
    observer.observe(mainContent, { childList: true, subtree: true });

    return () => {
      mainContent.removeEventListener("scroll", updateShadows);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* 顶部阴影 */}
      <div
        className={cn(
          "pointer-events-none fixed left-0 right-0 z-40 h-16 bg-gradient-to-b from-white/80 to-transparent dark:from-black/80",
          "transition-opacity duration-300",
          showTopShadow ? "opacity-100" : "opacity-0",
          "lg:left-64 xl:right-64"
        )}
        style={{ top: "4rem" }}
      />

      {/* 底部阴影 */}
      <div
        className={cn(
          "pointer-events-none fixed bottom-0 left-0 right-0 z-40 h-16 bg-gradient-to-t from-white/80 to-transparent dark:from-black/80",
          "transition-opacity duration-300",
          showBottomShadow ? "opacity-100" : "opacity-0",
          "lg:left-64 xl:right-64"
        )}
      />
    </>
  );
}






