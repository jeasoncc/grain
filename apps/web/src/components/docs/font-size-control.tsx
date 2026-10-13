"use client";

import { Minus, Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

type FontSize = "sm" | "base" | "lg" | "xl";

interface FontSizeControlProps {
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
}

const fontSizeLabels: Record<FontSize, string> = {
  sm: "小",
  base: "中",
  lg: "大",
  xl: "特大",
};

const sizes: FontSize[] = ["xl", "lg", "base", "sm"];

export function FontSizeControl({ fontSize, onFontSizeChange }: FontSizeControlProps) {

  const handleDecrease = () => {
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex < sizes.length - 1) {
      onFontSizeChange(sizes[currentIndex + 1]);
    }
  };

  const handleIncrease = () => {
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex > 0) {
      onFontSizeChange(sizes[currentIndex - 1]);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="阅读字体大小">
      <Type className="hidden sm:block w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
      <Button
        onClick={handleDecrease}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        disabled={fontSize === "sm"}
        aria-label="减小字体"
      >
        <Minus className="w-4 h-4" />
      </Button>
      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 min-w-[2rem] text-center" aria-live="polite">
        {fontSizeLabels[fontSize]}
      </span>
      <Button
        onClick={handleIncrease}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        disabled={fontSize === "xl"}
        aria-label="增大字体"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}

