/**
 * @file word-count-badge.view.fn.tsx
 * @description 字数统计徽章 - 浮动显示当前字数
 *
 * 纯展示组件，支持中文和英文两种统计模式：
 * - 中文模式：统计汉字数量 + 英文单词数
 * - 英文模式：只统计英文单词数
 *
 * 字数变化时短暂显示，2秒后自动隐藏
 *
 * 注意：格式化逻辑由父组件（container）处理，
 * 此组件只负责展示，符合 views 层只依赖 hooks/types 的架构规则
 */

import { FileText } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { cn } from "@/utils/cn.util"
import type { WordCountBadgeProps, WordCountDisplayProps } from "./word-count-badge.types"

export const WordCountBadge = memo(
	({ wordCountResult, show = true, displayText = "", className }: WordCountBadgeProps) => {
		const [visible, setVisible] = useState(false)
		const [lastTotal, setLastTotal] = useState(wordCountResult.total)

		// 字数变化时显示徽章
		useEffect(() => {
			if (wordCountResult.total !== lastTotal && show) {
				setVisible(true)
				setLastTotal(wordCountResult.total)

				const timer = setTimeout(() => {
					setVisible(false)
				}, 2000)

				return () => clearTimeout(timer)
			}
		}, [wordCountResult.total, lastTotal, show])

		if (!show) {
			return null
		}

		return (
			<div
				className={cn(
					"fixed bottom-12 right-6 z-40",
					"flex items-center gap-2 px-3 py-1.5",
					"bg-background/90 backdrop-blur-sm",
					"border border-border/50 rounded-lg shadow-sm",
					"text-xs font-medium text-muted-foreground",
					"transition-all duration-300",
					visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
					className,
				)}
			>
				<FileText className="size-3.5 text-primary/70" />
				<span className="tabular-nums text-foreground">{displayText}</span>
			</div>
		)
	},
)

WordCountBadge.displayName = "WordCountBadge"

/**
 * 静态字数显示组件（不带动画）
 * 用于工具栏等固定位置显示
 */
export const WordCountDisplay = memo(
	({ displayText = "", showIcon = true, className }: WordCountDisplayProps) => {
		return (
			<div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
				{showIcon && <FileText className="size-3.5" />}
				<span className="tabular-nums">{displayText}</span>
			</div>
		)
	},
)

WordCountDisplay.displayName = "WordCountDisplay"
