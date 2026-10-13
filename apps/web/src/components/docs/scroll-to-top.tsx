"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mainContent = document.querySelector('main[class*="overflow-y-auto"]') as HTMLElement;
    if (!mainContent) return;

    const handleScroll = () => {
      // 当滚动超过 300px 时显示按钮
      setIsVisible(mainContent.scrollTop > 300);
    };

    mainContent.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // 初始检查

    return () => {
      mainContent.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    const mainContent = document.querySelector('main[class*="overflow-y-auto"]') as HTMLElement;
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      className={cn(
        "h-8 w-8 shrink-0 p-0",
        "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
        "hover:bg-gray-800 dark:hover:bg-gray-100",
        "transition-all duration-300",
        "animate-fade-in-scale"
      )}
      aria-label="滚动到顶部"
      title="滚动到顶部 (gg)"
    >
      <ArrowUp className="w-5 h-5" />
    </Button>
  );
}

