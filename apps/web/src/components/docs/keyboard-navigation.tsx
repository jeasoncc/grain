"use client";

import { useEffect } from "react";

/**
 * 键盘导航快捷键
 * - j/k: 上下滚动
 * - 空格/Shift+空格: 向下/向上翻页
 * - g+g: 滚动到顶部
 * - G: 滚动到底部
 * - h: 显示快捷键帮助
 */
export function KeyboardNavigation() {
  useEffect(() => {
    const mainContent = document.querySelector('main[class*="overflow-y-auto"]') as HTMLElement;
    if (!mainContent) return;

    let lastKeyTime = 0;
    let keySequence: string[] = [];

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略在输入框中的按键
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // 忽略 Ctrl/Cmd + 组合键
      if (e.ctrlKey || e.metaKey) return;

      const key = e.key.toLowerCase();
      const now = Date.now();
      const scrollAmount = 100; // 每次滚动的像素数
      const pageScrollRatio = 0.8; // 翻页滚动比例

      // 重置按键序列（如果间隔超过 1 秒）
      if (now - lastKeyTime > 1000) {
        keySequence = [];
      }
      lastKeyTime = now;
      keySequence.push(key);

      // 限制序列长度
      if (keySequence.length > 2) {
        keySequence = keySequence.slice(-2);
      }

      switch (key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          mainContent.scrollBy({
            top: scrollAmount,
            behavior: "smooth",
          });
          break;

        case "k":
        case "ArrowUp":
          e.preventDefault();
          mainContent.scrollBy({
            top: -scrollAmount,
            behavior: "smooth",
          });
          break;

        case " ":
          e.preventDefault();
          if (e.shiftKey) {
            // Shift + 空格：向上翻页
            mainContent.scrollBy({
              top: -mainContent.clientHeight * pageScrollRatio,
              behavior: "smooth",
            });
          } else {
            // 空格：向下翻页
            mainContent.scrollBy({
              top: mainContent.clientHeight * pageScrollRatio,
              behavior: "smooth",
            });
          }
          break;

        case "g":
          // g+g 组合键：滚动到顶部
          if (keySequence.join("") === "gg") {
            e.preventDefault();
            mainContent.scrollTo({
              top: 0,
              behavior: "smooth",
            });
            keySequence = [];
          }
          break;

        case "G":
          // G：滚动到底部
          e.preventDefault();
          mainContent.scrollTo({
            top: mainContent.scrollHeight,
            behavior: "smooth",
          });
          break;

        case "Home":
          e.preventDefault();
          mainContent.scrollTo({
            top: 0,
            behavior: "smooth",
          });
          break;

        case "End":
          e.preventDefault();
          mainContent.scrollTo({
            top: mainContent.scrollHeight,
            behavior: "smooth",
          });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}






