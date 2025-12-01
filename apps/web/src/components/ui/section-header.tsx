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
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
          {subtitle}
        </p>
      )}
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gray-900 dark:text-white tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

