import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  className?: string;
  children?: ReactNode;
}

export function SectionHeader({
  title,
  description,
  subtitle,
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div className={cn("text-center mb-16", className)}>
      {subtitle && (
        <div className="relative inline-flex items-center gap-4 mb-8">
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-gray-300/60 dark:via-gray-700/60 to-gray-300/60 dark:to-gray-700/60"></div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.25em] relative px-2">
            {subtitle}
          </p>
          <div className="w-12 h-px bg-gradient-to-l from-transparent via-gray-300/60 dark:via-gray-700/60 to-gray-300/60 dark:to-gray-700/60"></div>
        </div>
      )}
      <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-8 text-gray-900 dark:text-white tracking-[-0.03em] leading-[1.1] relative inline-block">
        <span className="relative z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.03)] dark:drop-shadow-[0_1px_4px_rgba(255,255,255,0.04)]">{title}</span>
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-gray-900/10 dark:bg-white/10 rounded-full"></span>
        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gray-900/20 dark:bg-white/20 rounded-full"></span>
        {/* Subtle text glow */}
        <span className="absolute inset-0 blur-xl opacity-15 dark:opacity-10 bg-gray-900 dark:bg-white -z-10"></span>
      </h2>
      {description && (
        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-[1.7] font-light">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

