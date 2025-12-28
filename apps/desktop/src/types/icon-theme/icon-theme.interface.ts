/**
 * Icon Theme Domain - 类型定义
 */
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface IconThemeIcons {
	// 文件类型图标
	project: {
		default: LucideIcon;
		open?: LucideIcon;
	};
	folder: {
		default: LucideIcon;
		open?: LucideIcon;
	};
	file: {
		default: LucideIcon;
	};
	character: {
		default: LucideIcon;
	};
	world: {
		default: LucideIcon;
	};
	// ActivityBar 图标
	activityBar: {
		library: LucideIcon;
		search: LucideIcon;
		outline: LucideIcon;
		canvas: LucideIcon;
		chapters: LucideIcon;
		files: LucideIcon;
		diary: LucideIcon;
		ledger: LucideIcon;
		todo: LucideIcon;
		note: LucideIcon;
		mermaid: LucideIcon;
		plantuml: LucideIcon;
		tags: LucideIcon;
		statistics: LucideIcon;
		settings: LucideIcon;
		create: LucideIcon;
		import: LucideIcon;
		export: LucideIcon;
		more: LucideIcon;
	};
	// 设置页面图标
	settingsPage: {
		appearance: LucideIcon;
		icons: LucideIcon;
		diagrams: LucideIcon;
		general: LucideIcon;
		editor: LucideIcon;
		data: LucideIcon;
		export: LucideIcon;
		scroll: LucideIcon;
		logs: LucideIcon;
		about: LucideIcon;
	};
}

export interface IconTheme {
	key: string;
	name: string;
	description: string;
	author?: string;
	icons: IconThemeIcons;
}

export interface IconThemeState {
	readonly currentThemeKey: string;
}

export interface IconThemeActions {
	setTheme: (key: string) => void;
}

export type IconThemeStore = IconThemeState & IconThemeActions;
