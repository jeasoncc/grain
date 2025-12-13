/**
 * 开发环境守卫组件
 * 用于包裹仅在开发环境显示的内容
 */

import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface DevOnlyProps {
  children: ReactNode;
  /** 生产环境重定向路径，默认为 "/" */
  redirectTo?: string;
}

/**
 * 仅在开发环境渲染子组件
 * 生产环境会重定向到指定路径
 */
export function DevOnly({ children, redirectTo = "/" }: DevOnlyProps) {
  if (!import.meta.env.DEV) {
    return <Navigate to={redirectTo} />;
  }

  return <>{children}</>;
}

/**
 * 开发环境页面包装器
 * 在页面顶部显示开发环境标识
 */
export function DevOnlyPage({ children, redirectTo = "/" }: DevOnlyProps) {
  if (!import.meta.env.DEV) {
    return <Navigate to={redirectTo} />;
  }

  return (
    <div className="min-h-screen">
      {/* 开发环境标识 */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400">
        🔧 开发环境测试页面 - 此页面在生产环境不可见
      </div>
      {children}
    </div>
  );
}

/**
 * 检查是否为开发环境
 */
export function isDev(): boolean {
  return import.meta.env.DEV;
}
