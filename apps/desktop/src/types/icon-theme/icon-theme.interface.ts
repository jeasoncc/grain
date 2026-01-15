/**
 * Icon Theme Domain - 类型定义
 */
import type { LucideIcon } from "lucide-react"

// ============================================================================
// Types
// ============================================================================

export interface IconThemeIcons {
	// 文件类型图标
	readonly project: {
		readonly default: LucideIcon
		readonly open?: LucideIcon
	}
	readonly folder: {
		readonly default: LucideIcon
		readonly open?: LucideIcon
	}
	readonly file: {
		readonly default: LucideIcon
	}
	readonly character: {
		readonly default: LucideIcon
	}
	readonly world: {
		readonly default: LucideIcon
	}
	// ActivityBar 图标
	readonly activityBar: {
		readonly library: LucideIcon
		readonly search: LucideIcon
		readonly outline: LucideIcon
		readonly canvas: LucideIcon
		readonly chapters: LucideIcon
		readonly files: LucideIcon
		readonly diary: LucideIcon
		readonly ledger: LucideIcon
		readonly todo: LucideIcon
		readonly note: LucideIcon
		readonly mermaid: LucideIcon
		readonly plantuml: LucideIcon
		readonly code: LucideIcon
		readonly tags: LucideIcon
		readonly statistics: LucideIcon
		readonly settings: LucideIcon
		readonly create: LucideIcon
		readonly import: LucideIcon
		readonly export: LucideIcon
		readonly more: LucideIcon
	}
	// 设置页面图标
	readonly settingsPage: {
		readonly appearance: LucideIcon
		readonly icons: LucideIcon
		readonly diagrams: LucideIcon
		readonly general: LucideIcon
		readonly editor: LucideIcon
		readonly data: LucideIcon
		readonly export: LucideIcon
		readonly scroll: LucideIcon
		readonly logs: LucideIcon
		readonly about: LucideIcon
	}
}

export interface IconTheme {
	readonly key: string
	readonly name: string
	readonly description: string
	readonly author?: string
	readonly icons: IconThemeIcons
}

export interface IconThemeState {
	readonly currentThemeKey: string
}

export interface IconThemeActions {
	readonly setTheme: (key: string) => void
}

export type IconThemeStore = IconThemeState & IconThemeActions
