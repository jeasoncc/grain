"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TextGradientProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "accent";
}

export function TextGradient({
  children,
  className,
  variant = "primary",
}: TextGradientProps) {
  const gradientClasses = {
    primary:
      "bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent animate-gradient-shift",
    secondary:
      "bg-gradient-to-r from-gray-700 via-gray-900 to-gray-700 dark:from-gray-300 dark:via-white dark:to-gray-300 bg-clip-text text-transparent",
    accent:
      "bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 dark:from-gray-200 dark:via-white dark:to-gray-200 bg-clip-text text-transparent animate-gradient-shift",
  };

  return (
    <span className={cn(gradientClasses[variant], className)}>
      {children}
    </span>
  );
}


