import { cn } from "@/lib/utils";

interface SectionDividerProps {
  className?: string;
  variant?: "default" | "gradient" | "dots";
}

export function SectionDivider({
  className,
  variant = "default",
}: SectionDividerProps) {
  if (variant === "gradient") {
    return (
      <div
        className={cn(
          "h-px w-full bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent",
          className
        )}
      />
    );
  }

  if (variant === "dots") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-8",
          className
        )}
      >
        <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
        <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
        <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-px w-full bg-gray-200 dark:bg-gray-800",
        className
      )}
    />
  );
}











