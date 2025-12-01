"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { smoothScrollTo } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";

export function ScrollIndicator({ targetId }: { targetId?: string }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.pageYOffset < 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    if (targetId) {
      smoothScrollTo(targetId, 80);
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-40",
        "flex flex-col items-center gap-2",
        "text-gray-600 dark:text-gray-400",
        "hover:text-gray-900 dark:hover:text-white",
        "transition-all duration-300",
        "group",
        "animate-bounce"
      )}
      aria-label="向下滚动"
    >
      <span className="text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity">
        向下滚动
      </span>
      <div className="relative">
        <ChevronDown className="w-6 h-6 group-hover:translate-y-1 transition-transform duration-300" />
        <ChevronDown className="w-6 h-6 absolute top-0 opacity-30 group-hover:opacity-50 group-hover:translate-y-2 transition-all duration-300" />
      </div>
    </button>
  );
}


