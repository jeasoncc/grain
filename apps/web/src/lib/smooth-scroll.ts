/**
 * 平滑滚动工具函数
 */

/**
 * 平滑滚动到指定元素
 */
export function smoothScrollTo(elementId: string, offset = 0): void {
  if (typeof window === "undefined") return;

  const element = document.getElementById(elementId);
  if (!element) return;

  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

/**
 * 平滑滚动到顶部
 */
export function smoothScrollToTop(): void {
  if (typeof window === "undefined") return;
  
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

/**
 * 平滑滚动到底部
 */
export function smoothScrollToBottom(): void {
  if (typeof window === "undefined") return;
  
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: "smooth",
  });
}

/**
 * 检查是否支持平滑滚动
 */
export function supportsSmoothScroll(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  
  return "scrollBehavior" in document.documentElement.style;
}


