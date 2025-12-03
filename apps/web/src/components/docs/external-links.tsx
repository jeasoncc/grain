"use client";

import { useEffect } from "react";
import { ExternalLink } from "lucide-react";

/**
 * 为外部链接添加图标和标识
 */
export function ExternalLinks() {
  useEffect(() => {
    const addExternalLinkIcons = () => {
      const article = document.querySelector("article");
      if (!article) return;

      const links = article.querySelectorAll("a[href]");
      
      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (!href) return;

        // 判断是否为外部链接
        const isExternal =
          href.startsWith("http://") ||
          href.startsWith("https://") ||
          href.startsWith("//");

        if (isExternal) {
          // 如果已经有图标，跳过
          if (link.querySelector(".external-link-icon")) return;

          // 添加外部链接属性
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
          link.classList.add("external-link");

          // 创建图标
          const icon = document.createElement("span");
          icon.className =
            "external-link-icon inline-flex items-center ml-1 opacity-60";
          icon.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`;

          link.appendChild(icon);
        }
      });
    };

    // 延迟执行，等待内容加载
    const timer = setTimeout(addExternalLinkIcons, 500);

    // 监听 DOM 变化
    const observer = new MutationObserver(() => {
      setTimeout(addExternalLinkIcons, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return null;
}



