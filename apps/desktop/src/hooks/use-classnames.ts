/**
 * @file hooks/use-classnames.ts
 * @description 类名合并工具函数
 *
 * 职责：
 * - 提供 cn 函数用于合并 Tailwind CSS 类名
 * - 支持条件类名
 * - 解决 Tailwind 类名冲突
 *
 * 依赖：无（纯工具函数）
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 CSS 类名
 *
 * 功能：
 * - 合并多个类名字符串
 * - 支持条件类名（condition && "class"）
 * - 自动过滤 false、undefined、null
 * - 解决 Tailwind 类名冲突（后面的覆盖前面的）
 *
 * @example
 * cn("text-red-500", "font-bold")
 * // => "text-red-500 font-bold"
 *
 * cn("p-4", "p-2")
 * // => "p-2" (后面的覆盖前面的)
 *
 * cn("base-class", isActive && "active-class")
 * // => "base-class active-class" (如果 isActive 为 true)
 */
export const cn = (...inputs: readonly ClassValue[]) => {
	return twMerge(clsx(inputs))
}
