"use client";

import { useEffect, useState } from "react";

/**
 * 全局搜索快捷键处理
 * 统一处理 Ctrl/Cmd + K 快捷键
 */
export function KeyboardSearch() {
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K 打开搜索
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        const target = e.target as HTMLElement;
        
        // 忽略在输入框中的情况
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        
        // 查找搜索输入框
        const searchInput = document.querySelector(
          'input[placeholder*="搜索文档"]'
        ) as HTMLInputElement;
        
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
          setSearchFocused(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}



