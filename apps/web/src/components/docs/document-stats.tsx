"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, Eye, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function DocumentStats() {
  const pathname = usePathname();
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);

  useEffect(() => {
    if (pathname === "/docs") return;

    const updateStats = () => {
      const article = document.querySelector("article");
      if (!article) return;

      const text = article.textContent || "";
      
      // 中文字符数
      const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      // 英文单词数
      const englishWords = text.split(/\s+/).filter(word => /[a-zA-Z]/.test(word)).length;
      // 总字符数
      const totalChars = text.length;
      
      setWordCount(chineseChars + englishWords);
      setCharCount(totalChars);
    };

    const timer = setTimeout(updateStats, 500);

    const observer = new MutationObserver(() => {
      updateStats();
    });

    const article = document.querySelector("article");
    if (article) {
      observer.observe(article, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  if (pathname === "/docs" || wordCount === 0) return null;

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400",
      "mb-6 px-3 py-2 rounded-lg",
      "bg-gray-50 dark:bg-gray-900",
      "border border-gray-200 dark:border-gray-800",
      "animate-fade-in"
    )}>
      <div className="flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        <span>{wordCount} 字</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <span>•</span>
        <span>{charCount.toLocaleString()} 字符</span>
      </div>
    </div>
  );
}


