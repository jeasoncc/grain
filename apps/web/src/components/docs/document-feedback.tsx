"use client";

import { useDocPathname } from "./hooks/use-doc-pathname";
import { ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalStorageValue } from "./hooks/use-safe-local-storage";

export function DocumentFeedback() {
  const pathname = useDocPathname();
  const [savedFeedback, setFeedback] = useLocalStorageValue(`docs-feedback-${pathname}`);
  const submitted = savedFeedback === "helpful" || savedFeedback === "not-helpful";

  // 在 /docs 路径上不显示（必须在所有 hooks 之后）
  if (pathname === "/docs") return null;

  const handleFeedback = (type: "helpful" | "not-helpful") => {
    if (submitted) return;
    
    setFeedback(type);
  };

  return (
    <div className={cn(
      "mt-8 pt-6 border-t border-gray-200 dark:border-gray-800",
      "animate-fade-in"
    )}>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          这篇文档对您有帮助吗？
        </span>
        
        {!submitted ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFeedback("helpful")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "border border-gray-300 dark:border-gray-700",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "transition-colors duration-200",
                "text-sm font-medium text-gray-700 dark:text-gray-300"
              )}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>有帮助</span>
            </button>
            
            <button
              onClick={() => handleFeedback("not-helpful")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "border border-gray-300 dark:border-gray-700",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                "transition-colors duration-200",
                "text-sm font-medium text-gray-700 dark:text-gray-300"
              )}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>没帮助</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>感谢您的反馈！</span>
          </div>
        )}
      </div>
    </div>
  );
}

