"use client";

import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
  className?: string;
  threshold?: number;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className,
  threshold = 0.1,
}: ScrollRevealProps) {
  // 在 SSR 时默认可见，避免水合不匹配
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 标记组件已挂载
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !hasAnimated) {
        if (delay > 0) {
          timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
            setHasAnimated(true);
          }, delay);
        } else {
          setIsVisible(true);
          setHasAnimated(true);
        }
      }
    },
    [delay, hasAnimated]
  );

  useEffect(() => {
    // 只在客户端执行
    if (!isMounted) return;
    const element = ref.current;
    if (!element) return;

    // 使用 requestIdleCallback 优化性能
    const observerOptions: IntersectionObserverInit = {
      threshold,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    
    // 使用 requestIdleCallback 延迟观察，不阻塞主线程
    const scheduleObserve = () => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => {
          observer.observe(element);
        });
      } else {
        // 降级方案
        setTimeout(() => {
          observer.observe(element);
        }, 100);
      }
    };

    scheduleObserve();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      observer.disconnect();
    };
  }, [handleIntersection, threshold, isMounted]);

  // 在 SSR 时或未挂载时，显示内容以避免布局闪烁
  const shouldShow = isMounted ? isVisible : true;
  
  const directionClasses = {
    up: shouldShow
      ? "translate-y-0 opacity-100"
      : "translate-y-10 opacity-0",
    down: shouldShow
      ? "translate-y-0 opacity-100"
      : "-translate-y-10 opacity-0",
    left: shouldShow
      ? "translate-x-0 opacity-100"
      : "-translate-x-10 opacity-0",
    right: shouldShow
      ? "translate-x-0 opacity-100"
      : "translate-x-10 opacity-0",
    fade: shouldShow ? "opacity-100 scale-100" : "opacity-0 scale-95",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        // 使用 will-change 优化动画性能，但只在动画期间
        shouldShow && !hasAnimated ? "will-change-transform" : "",
        directionClasses[direction],
        className
      )}
      style={{
        // 在动画完成后移除 will-change 以节省资源
        ...(hasAnimated ? {} : {}),
      }}
    >
      {children}
    </div>
  );
}
