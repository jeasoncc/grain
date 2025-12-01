import React from "react";
import { cn } from "@/lib/utils";

interface PlatformIconProps {
  platform: "Linux" | "Windows" | "macOS";
  className?: string;
}

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  const baseClasses = "transition-all duration-300";
  const iconClasses = cn(baseClasses, className);

  switch (platform) {
    case "Linux":
      return (
        <div className={cn("relative w-20 h-20 flex items-center justify-center group/icon", iconClasses)}>
          <svg
            viewBox="0 0 80 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 背景圆形 - 带渐变效果 */}
            <circle
              cx="40"
              cy="40"
              r="38"
              fill="currentColor"
              className="text-gray-50 dark:text-gray-900"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="currentColor"
              className="text-gray-100 dark:text-gray-800"
            />
            {/* 简化版 Linux/Tux 图标 */}
            <path
              d="M40 18 C 28 18, 18 28, 18 40 C 18 46, 21 51.5, 25.5 55 C 22.5 57.5, 20.5 61, 20.5 65 C 20.5 70, 24.5 73.5, 29.5 73.5 C 32.5 73.5, 34.5 72.5, 34.5 72.5 C 34.5 72.5, 36.5 73.5, 39.5 73.5 C 44.5 73.5, 48.5 70, 48.5 65 C 48.5 61, 46.5 57.5, 43.5 55 C 48 51.5, 51 46, 51 40 C 51 28, 41 18, 40 18 Z"
              fill="currentColor"
              className="text-gray-900 dark:text-white"
            />
            {/* 眼睛 */}
            <circle cx="32" cy="36" r="3" fill="currentColor" className="text-white dark:text-gray-900" />
            <circle cx="48" cy="36" r="3" fill="currentColor" className="text-white dark:text-gray-900" />
            {/* 嘴巴 */}
            <path
              d="M32 45 Q 40 50, 48 45"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-white dark:text-gray-900"
              fill="none"
            />
          </svg>
        </div>
      );

    case "Windows":
      return (
        <div className={cn("relative w-20 h-20 flex items-center justify-center group/icon", iconClasses)}>
          <svg
            viewBox="0 0 80 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 背景圆角矩形 */}
            <rect
              x="4"
              y="4"
              width="72"
              height="72"
              rx="8"
              fill="currentColor"
              className="text-gray-50 dark:text-gray-900"
            />
            <rect
              x="6"
              y="6"
              width="68"
              height="68"
              rx="6"
              fill="currentColor"
              className="text-gray-100 dark:text-gray-800"
            />
            {/* Windows 标志 - 4个窗口，使用品牌蓝色 */}
            <rect
              x="12"
              y="12"
              width="26"
              height="26"
              rx="2.5"
              fill="currentColor"
              className="text-[#0078D4] dark:text-[#00A4EF]"
            />
            <rect
              x="42"
              y="12"
              width="26"
              height="26"
              rx="2.5"
              fill="currentColor"
              className="text-[#0078D4] dark:text-[#00A4EF]"
            />
            <rect
              x="12"
              y="42"
              width="26"
              height="26"
              rx="2.5"
              fill="currentColor"
              className="text-[#0078D4] dark:text-[#00A4EF]"
            />
            <rect
              x="42"
              y="42"
              width="26"
              height="26"
              rx="2.5"
              fill="currentColor"
              className="text-[#0078D4] dark:text-[#00A4EF]"
            />
          </svg>
        </div>
      );

    case "macOS":
      return (
        <div className={cn("relative w-20 h-20 flex items-center justify-center group/icon", iconClasses)}>
          <svg
            viewBox="0 0 80 80"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 背景圆形 */}
            <circle
              cx="40"
              cy="40"
              r="38"
              fill="currentColor"
              className="text-gray-50 dark:text-gray-900"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              fill="currentColor"
              className="text-gray-100 dark:text-gray-800"
            />
            {/* Apple 图标 - 更精致的版本 */}
            <path
              d="M40 22 C 30 22, 22 28, 22 36 C 22 41, 25 45.5, 29.5 48.5 C 26.5 50.5, 24.5 53.5, 24.5 57.5 C 24.5 63, 29 67, 34.5 67 C 37.5 67, 39.5 66, 39.5 66 C 39.5 66, 41.5 67, 44.5 67 C 50 67, 54.5 63, 54.5 57.5 C 54.5 53.5, 52.5 50.5, 49.5 48.5 C 54 45.5, 57 41, 57 36 C 57 28, 49 22, 40 22 Z"
              fill="currentColor"
              className="text-gray-900 dark:text-white"
            />
            {/* 叶子细节 */}
            <path
              d="M47 26 C 49 26, 51 28, 51 30"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-gray-900 dark:text-white opacity-60"
              fill="none"
            />
            {/* 高光 */}
            <ellipse
              cx="36"
              cy="38"
              rx="8"
              ry="10"
              fill="currentColor"
              className="text-white dark:text-gray-900 opacity-20"
            />
          </svg>
        </div>
      );

    default:
      return null;
  }
}
