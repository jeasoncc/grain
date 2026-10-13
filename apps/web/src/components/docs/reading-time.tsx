"use client";

import { useEffect, useState } from "react";
import { useDocPathname } from "./hooks/use-doc-pathname";
import { cn } from "@/lib/utils";

const WORDS_PER_MINUTE = 200; // 平均阅读速度：200 字/分钟

function calculateReadingTime(text: string): number {
  // 中文字符数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 英文单词数
  const englishWords = text.split(/\s+/).filter(word => /[a-zA-Z]/.test(word)).length;
  // 总字数（中文字符 + 英文单词）
  const totalWords = chineseChars + englishWords;
  
  // 计算阅读时间（分钟）
  return Math.ceil(totalWords / WORDS_PER_MINUTE);
}

export function ReadingTime() {
  const pathname = useDocPathname();
  const [readingTime, setReadingTime] = useState<number | null>(null);

  useEffect(() => {
    // 在 /docs 路径上不执行
    if (pathname === "/docs") return;

    const updateReadingTime = () => {
      const article = document.querySelector("article");
      if (!article) return;

      const text = article.textContent || "";
      const time = calculateReadingTime(text);
      setReadingTime(time);
    };

    // 延迟计算，等待内容加载
    const timer = setTimeout(updateReadingTime, 500);

    // 监听内容变化
    const observer = new MutationObserver(() => {
      updateReadingTime();
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

  // 在 /docs 路径上不显示（必须在所有 hooks 之后）
  if (pathname === "/docs") return null;
  if (readingTime === null || readingTime === 0) return null;

  return (
    <div
      className={cn(
        "text-sm text-gray-500 dark:text-gray-500",
        "mb-8"
      )}
    >
      {readingTime} 分钟阅读
    </div>
  );
}


