/**
 * 性能优化工具函数
 */

/**
 * 使用 requestIdleCallback 执行任务（降级到 setTimeout）
 */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof window === "undefined") {
    return 0;
  }
  
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // 降级方案
  const start = Date.now();
  return (window as Window).setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining() {
        return Math.max(0, 50 - (Date.now() - start));
      },
    });
  }, 1) as unknown as number;
}

/**
 * 取消 idle callback
 */
export function cancelIdleCallback(handle: number): void {
  if (typeof window === "undefined") {
    return;
  }
  
  if ("cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle);
  } else {
    (window as Window).clearTimeout(handle);
  }
}

/**
 * 延迟加载脚本
 */
export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * 预加载关键资源
 */
export function preloadResource(href: string, as: string, type?: string) {
  if (typeof document === "undefined") return;
  
  const link = document.createElement("link");
  link.rel = "preload";
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  document.head.appendChild(link);
}

/**
 * 预连接到外部域名
 */
export function prefetchDNS(domain: string) {
  if (typeof document === "undefined") return;
  
  const link = document.createElement("link");
  link.rel = "dns-prefetch";
  link.href = domain;
  document.head.appendChild(link);
}

/**
 * 使用 Intersection Observer 的简化版本
 */
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return null;
  }
  
  return new IntersectionObserver(callback, {
    rootMargin: "50px",
    threshold: 0.1,
    ...options,
  });
}








