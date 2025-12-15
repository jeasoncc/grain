"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlowEffectProps {
  children: ReactNode;
  className?: string;
  intensity?: "light" | "medium" | "strong";
  color?: "default" | "primary" | "accent";
}

export function GlowEffect({
  children,
  className,
  intensity = "medium",
  color = "default",
}: GlowEffectProps) {
  const intensityClasses = {
    light: "shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    medium: "shadow-[0_0_30px_rgba(0,0,0,0.15)] dark:shadow-[0_0_30px_rgba(255,255,255,0.15)]",
    strong: "shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(255,255,255,0.2)]",
  };

  const colorClasses = {
    default: "",
    primary: "shadow-gray-900/20 dark:shadow-white/20",
    accent: "shadow-gray-700/30 dark:shadow-gray-300/30",
  };

  return (
    <div
      className={cn(
        "relative",
        intensityClasses[intensity],
        colorClasses[color],
        "transition-all duration-300",
        className
      )}
    >
      {children}
      {/* Glow overlay */}
      <div
        className={cn(
          "absolute inset-0 rounded-inherit opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none blur-xl",
          intensity === "light" && "bg-gray-900/10 dark:bg-white/10",
          intensity === "medium" && "bg-gray-900/15 dark:bg-white/15",
          intensity === "strong" && "bg-gray-900/20 dark:bg-white/20"
        )}
      />
    </div>
  );
}











