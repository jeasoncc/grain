/**
 * @file word-count-badge.types.ts
 * @description 字数统计徽章组件类型定义
 */

import type { CountMode, WordCountResult } from "@/types/word-count"

export interface WordCountBadgeProps {
	/** 字数统计结果 */
	readonly wordCountResult: WordCountResult
	/** 统计模式 */
	readonly countMode: CountMode
	/** 是否显示徽章 */
	readonly show?: boolean
	/** 是否显示详细信息（中文字数 + 英文词数） */
	readonly showDetail?: boolean
	/** 自定义类名 */
	readonly className?: string
	/** 格式化后的显示文本（由父组件传入） */
	readonly displayText?: string
}

export interface WordCountDisplayProps {
	/** 字数统计结果 */
	readonly wordCountResult: WordCountResult
	/** 统计模式 */
	readonly countMode: CountMode
	/** 是否显示详细信息 */
	readonly showDetail?: boolean
	/** 是否显示图标 */
	readonly showIcon?: boolean
	/** 自定义类名 */
	readonly className?: string
	/** 格式化后的显示文本（由父组件传入） */
	readonly displayText?: string
}
