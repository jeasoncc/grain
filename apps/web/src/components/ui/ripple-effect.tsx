"use client";

import { useEffect, useRef, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface RippleEffectProps {
  className?: string;
  color?: "light" | "dark";
}

export function RippleEffect({ className, color = "light" }: RippleEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const createRipple = (e: MouseEvent<HTMLDivElement>) => {
      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement("span");
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.classList.add("ripple");

      const rippleColor = color === "light" 
        ? "rgba(255, 255, 255, 0.4)" 
        : "rgba(0, 0, 0, 0.1)";
      
      ripple.style.backgroundColor = rippleColor;

      container.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    };

    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
      createRipple(e as any);
    };

    container.addEventListener("click", handleClick as any);

    return () => {
      container.removeEventListener("click", handleClick as any);
    };
  }, [color]);

  return (
    <>
      <div ref={containerRef} className={cn("relative overflow-hidden", className)} />
      <style jsx>{`
        .ripple {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple-animation 600ms ease-out;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}








