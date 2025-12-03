"use client";

import { useEffect } from "react";

/**
 * 打印样式优化
 * 隐藏不需要打印的元素，优化打印布局
 */
export function PrintStyles() {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "docs-print-styles";
    style.textContent = `
      @media print {
        /* 隐藏不需要打印的元素 */
        nav[aria-label="文档导航"],
        aside[class*="TableOfContents"],
        button,
        .code-copy-button-container,
        .scrollbar-auto-hide,
        .scroll-to-top,
        .keyboard-help,
        .focus-mode,
        .font-size-control,
        .sidebar-toggle {
          display: none !important;
        }

        /* 优化打印布局 */
        body {
          background: white !important;
          color: black !important;
        }

        main {
          margin: 0 !important;
          padding: 0 !important;
          max-width: 100% !important;
          overflow: visible !important;
          height: auto !important;
        }

        article {
          max-width: 100% !important;
          font-size: 12pt !important;
          line-height: 1.6 !important;
        }

        /* 代码块优化 */
        pre {
          page-break-inside: avoid;
          white-space: pre-wrap !important;
        }

        /* 图片优化 */
        img {
          max-width: 100% !important;
          page-break-inside: avoid;
        }

        /* 链接显示 URL */
        a[href^="http"]:after {
          content: " (" attr(href) ")";
          font-size: 0.8em;
          color: #666;
        }

        a[href^="/"]:after {
          content: " (https://novel-editor.com" attr(href) ")";
          font-size: 0.8em;
          color: #666;
        }

        /* 标题优化 */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
        }

        /* 分页优化 */
        .chapter-navigation {
          page-break-before: always;
          margin-top: 2rem;
        }
      }
    `;

    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById("docs-print-styles");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return null;
}



