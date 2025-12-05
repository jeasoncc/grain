"use client";

import { useEffect } from "react";

/**
 * 性能监控和优化
 * - 预加载关键资源
 * - 延迟加载非关键内容
 * - 性能指标收集
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // 预加载下一个可能访问的页面
    const preloadNextPage = () => {
      const links = document.querySelectorAll('article a[href^="/docs"]');
      const visibleLinks = Array.from(links)
        .filter((link) => {
          const rect = link.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.top <= window.innerHeight * 2
          );
        })
        .slice(0, 3); // 只预加载前 3 个可见链接

      visibleLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (href) {
          const linkElement = document.createElement("link");
          linkElement.rel = "prefetch";
          linkElement.href = href;
          document.head.appendChild(linkElement);
        }
      });
    };

    // 延迟执行预加载
    const timer = setTimeout(preloadNextPage, 2000);

    // 使用 Intersection Observer 优化图片加载
    const images = document.querySelectorAll("article img[src]");
    if (images.length > 0 && "IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
              }
              imageObserver.unobserve(img);
            }
          });
        },
        { rootMargin: "50px" }
      );

      images.forEach((img) => {
        imageObserver.observe(img);
      });

      return () => {
        clearTimeout(timer);
        imageObserver.disconnect();
      };
    }

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return null;
}






