"use client";

import { useEffect } from "react";

/**
 * 图片点击放大查看功能
 */
export function ImageZoom() {
  useEffect(() => {
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "IMG") return;

      const img = target as HTMLImageElement;
      const src = img.src;
      const alt = img.alt || "";

      // 创建模态框
      const overlay = document.createElement("div");
      overlay.className =
        "fixed inset-0 z-[100] bg-black/90 dark:bg-black/95 flex items-center justify-center p-4 cursor-zoom-out";
      overlay.style.animation = "fadeIn 0.2s ease-out";

      const modalImg = document.createElement("img");
      modalImg.src = src;
      modalImg.alt = alt;
      modalImg.className =
        "max-w-full max-h-full object-contain rounded-lg shadow-2xl";
      modalImg.style.animation = "scaleIn 0.3s ease-out";

      overlay.appendChild(modalImg);

      const closeModal = () => {
        overlay.style.animation = "fadeOut 0.2s ease-out";
        setTimeout(() => {
          document.body.removeChild(overlay);
          document.body.style.overflow = "";
        }, 200);
      };

      overlay.addEventListener("click", closeModal);
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeModal();
        }
      });

      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";
      overlay.focus();
    };

    const article = document.querySelector("article");
    if (!article) return;

    article.addEventListener("click", handleImageClick);

    return () => {
      article.removeEventListener("click", handleImageClick);
    };
  }, []);

  return null;
}









