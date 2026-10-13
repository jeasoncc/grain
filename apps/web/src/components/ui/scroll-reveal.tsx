"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

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
  const isMounted = useHydrated();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMounted || isVisible) return;
    const element = ref.current;
    if (!element) return;

    let revealTimer: number | undefined;
    let observeTimer: number | undefined;
    let idleCallback: number | undefined;
    let disposed = false;
    let revealScheduled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (disposed || revealScheduled || !entry.isIntersecting) return;
        revealScheduled = true;
        observer.disconnect();
        if (delay > 0) {
          revealTimer = window.setTimeout(() => setIsVisible(true), delay);
        } else {
          setIsVisible(true);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );

    const observe = () => {
      if (!disposed) observer.observe(element);
    };
    if (typeof requestIdleCallback !== "undefined") {
      idleCallback = requestIdleCallback(observe);
    } else {
      observeTimer = window.setTimeout(observe, 100);
    }

    return () => {
      disposed = true;
      if (idleCallback !== undefined) cancelIdleCallback(idleCallback);
      clearTimeout(observeTimer);
      clearTimeout(revealTimer);
      observer.disconnect();
    };
  }, [delay, threshold, isMounted, isVisible]);

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
        shouldShow && !isVisible ? "will-change-transform" : "",
        directionClasses[direction],
        className
      )}
    >
      {children}
    </div>
  );
}
