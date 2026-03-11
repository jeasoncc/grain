/**
 * Icon Theme Domain - 类型定义
 */
import type { IconComponent } from "@/types/icon/icon.interface"

// ============================================================================
// Types
// ============================================================================

export interface IconThemeIcons {
	// 文件类型图标
	readonly project: {
		readonly default: IconComponent
		readonly open?: IconComponent
	}
	readonly folder: {
		readonly default: IconComponent
		readonly open?: IconComponent
	}
	readonly file: {
		readonly default: IconComponent
	}
	readonly character: {
		readonly default: IconComponent
	}
	readonly world: {
		readonly default: IconComponent
	}
	// ActivityBar 图标
	readonly activityBar: {
		readonly library: IconComponent
		readonly search: IconComponent
		readonly outline: IconComponent
		readonly canvas: IconComponent
		readonly chapters: IconComponent
		readonly files: IconComponent
		readonly diary: IconComponent
		readonly ledger: IconComponent
		readonly todo: IconComponent
		readonly note: IconComponent
		readonly mermaid: IconComponent
		readonly plantuml: IconComponent
		readonly code: IconComponent
		readonly tags: IconComponent
		readonly statistics: IconComponent
		readonly settings: IconComponent
		readonly create: IconComponent
		readonly import: IconComponent
		readonly export: IconComponent
		readonly more: IconComponent
	}
	// 设置页面图标
	readonly settingsPage: {
		readonly appearance: IconComponent
		readonly icons: IconComponent
		readonly diagrams: IconComponent
		readonly general: IconComponent
		readonly editor: IconComponent
		readonly data: IconComponent
		readonly export: IconComponent
		readonly scroll: IconComponent
		readonly logs: IconComponent
		readonly about: IconComponent
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
