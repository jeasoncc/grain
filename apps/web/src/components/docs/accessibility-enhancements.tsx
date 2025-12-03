"use client";

import { useEffect } from "react";

/**
 * 可访问性增强
 * - 改进键盘导航
 * - 焦点管理
 * - ARIA 标签
 */
export function AccessibilityEnhancements() {
  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    // 为文章添加主要区域标识
    article.setAttribute("role", "article");
    article.setAttribute("aria-label", "文档内容");

    // 为标题添加可跳转的锚点
    const headings = article.querySelectorAll("h2, h3, h4, h5, h6");
    headings.forEach((heading) => {
      if (!heading.id) {
        const id = heading.textContent
          ?.toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
          .replace(/^-+|-+$/g, "") || "";
        heading.id = id;
      }

      // 添加可跳转标识
      heading.setAttribute("tabindex", "-1");
    });

    // 为主内容区域添加可访问性属性
    const mainContent = document.querySelector('main[class*="overflow-y-auto"]');
    if (mainContent) {
      mainContent.setAttribute("role", "main");
      mainContent.setAttribute("aria-label", "文档主内容");
    }

    // 为侧边栏添加可访问性属性
    const sidebar = document.querySelector('aside[class*="fixed"]');
    if (sidebar) {
      sidebar.setAttribute("aria-label", "文档导航");
      sidebar.setAttribute("role", "navigation");
    }

    // 为目录添加可访问性属性
    const toc = document.querySelector('aside[class*="TableOfContents"]');
    if (toc) {
      toc.setAttribute("aria-label", "本页大纲");
      toc.setAttribute("role", "navigation");
    }
  }, []);

  return null;
}



