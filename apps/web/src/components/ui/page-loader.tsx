"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "./loading-spinner";

export function PageLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 如果页面已加载，立即隐藏加载器
    if (document.readyState === "complete") {
      setIsLoading(false);
      return;
    }

    // 模拟加载进度
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return Math.min(prev + Math.random() * 15, 100);
      });
    }, 100);

    // 监听页面加载完成
    const handleLoad = () => {
      setProgress(100);
      clearInterval(interval);
      setTimeout(() => setIsLoading(false), 300);
    };

    window.addEventListener("load", handleLoad);

    // 确保至少显示一段时间
    const minDisplayTime = setTimeout(() => {
      if (progress >= 100) {
        setIsLoading(false);
      }
    }, 800);

    return () => {
      clearInterval(interval);
      clearTimeout(minDisplayTime);
      window.removeEventListener("load", handleLoad);
    };
  }, [progress]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex items-center justify-center transition-opacity duration-300">
      <div className="text-center">
        <div className="mb-8">
          <LoadingSpinner size="lg" />
        </div>
        <div className="w-48 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 dark:bg-white transition-all duration-300 ease-out rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          加载中...
        </p>
      </div>
    </div>
  );
}

