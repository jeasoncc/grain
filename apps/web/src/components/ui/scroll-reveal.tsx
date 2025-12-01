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
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [handleIntersection, threshold]);

  const directionClasses = {
    up: isVisible
      ? "translate-y-0 opacity-100"
      : "translate-y-10 opacity-0",
    down: isVisible
      ? "translate-y-0 opacity-100"
      : "-translate-y-10 opacity-0",
    left: isVisible
      ? "translate-x-0 opacity-100"
      : "-translate-x-10 opacity-0",
    right: isVisible
      ? "translate-x-0 opacity-100"
      : "translate-x-10 opacity-0",
    fade: isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        // 使用 will-change 优化动画性能，但只在动画期间
        isVisible && !hasAnimated ? "will-change-transform" : "",
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
