"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "./button";
import { smoothScrollToTop } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <Button
      onClick={smoothScrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-8 right-8 z-50 rounded-full shadow-lg",
        "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
        "hover:bg-gray-800 dark:hover:bg-gray-100",
        "transition-all duration-300 ease-out",
        "hover:scale-110 hover:shadow-xl",
        "animate-fade-in-scale",
        "backdrop-blur-sm"
      )}
      aria-label="回到顶部"
    >
      <ArrowUp className="w-5 h-5" />
    </Button>
  );
}











