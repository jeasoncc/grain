/**
 * 文件图标主题系统 - 类似 VSCode 的 File Icon Theme
 * 为不同文件类型提供统一的图标风格
 */

import {
	BarChart3,
	Book,
	BookMarked,
	BookOpen,
	BookOpenText,
	BookText,
	Calendar,
	CalendarDays,
	Cog,
	Download,
	Feather,
	File,
	FileDown,
	FileEdit,
	Files,
	FileText,
	FileUp,
	Folder,
	FolderOpen,
	FolderTree,
	Globe,
	Grid3x3,
	Layers,
	Library,
	ListTree,
	type LucideIcon,
	Map,
	Menu,
	MoreHorizontal,
	Notebook,
	Palette,
	Pencil,
	PenTool,
	Plus,
	PlusCircle,
	ScrollText,
	Search,
	Settings,
	Sparkles,
	TrendingUp,
	Upload,
	User,
	Users,
} from "lucide-react";

export interface IconTheme {
	key: string;
	name: string;
	description: string;
	author?: string;
	icons: {
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
			wiki: LucideIcon;
			canvas: LucideIcon;
			chapters: LucideIcon;
			files: LucideIcon;
			diary: LucideIcon;
			statistics: LucideIcon;
			settings: LucideIcon;
			create: LucideIcon;
			import: LucideIcon;
			export: LucideIcon;
			more: LucideIcon;
		};
	};
}

export const iconThemes: IconTheme[] = [
	{
		key: "default",
		name: "默认图标",
		description: "Novel Editor 默认图标主题",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Book,
				open: BookOpen,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: FileText,
			},
			character: {
				default: User,
			},
			world: {
				default: Globe,
			},
			activityBar: {
				library: BookMarked,
				search: Search,
				outline: ListTree,
				wiki: BookOpen,
				canvas: Pencil,
				chapters: FolderTree,
				files: Files,
				diary: CalendarDays,
				statistics: TrendingUp,
				settings: Settings,
				create: Plus,
				import: Upload,
				export: Download,
				more: MoreHorizontal,
			},
		},
	},
	{
		key: "minimal",
		name: "极简图标",
		description: "简洁统一的图标风格",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Book,
			},
			folder: {
				default: Folder,
			},
			file: {
				default: File,
			},
			character: {
				default: File,
			},
			world: {
				default: File,
			},
			activityBar: {
				library: Book,
				search: Search,
				outline: ListTree,
				wiki: BookOpen,
				canvas: Pencil,
				chapters: FolderTree,
				files: Files,
				diary: Calendar,
				statistics: BarChart3,
				settings: Cog,
				create: Plus,
				import: Upload,
				export: Download,
				more: Menu,
			},
		},
	},
	{
		key: "classic",
		name: "经典图标",
		description: "传统的文件图标风格",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: BookMarked,
				open: BookOpen,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: FileText,
			},
			character: {
				default: User,
			},
			world: {
				default: BookMarked,
			},
			activityBar: {
				library: BookMarked,
				search: Search,
				outline: ListTree,
				wiki: BookOpen,
				canvas: Pencil,
				chapters: FolderTree,
				files: Files,
				diary: CalendarDays,
				statistics: TrendingUp,
				settings: Settings,
				create: PlusCircle,
				import: FileUp,
				export: FileDown,
				more: MoreHorizontal,
			},
		},
	},
	{
		key: "modern",
		name: "现代图标",
		description: "现代化的图标设计",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Library,
				open: BookOpenText,
			},
			folder: {
				default: FolderTree,
				open: FolderOpen,
			},
			file: {
				default: FileEdit,
			},
			character: {
				default: Users,
			},
			world: {
				default: Map,
			},
			activityBar: {
				library: Library,
				search: Search,
				outline: Grid3x3,
				wiki: BookOpenText,
				canvas: Palette,
				chapters: FolderTree,
				files: Files,
				diary: CalendarDays,
				statistics: BarChart3,
				settings: Cog,
				create: PlusCircle,
				import: FileUp,
				export: FileDown,
				more: Menu,
			},
		},
	},
	{
		key: "elegant",
		name: "优雅图标",
		description: "优雅精致的图标风格",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: BookText,
				open: BookOpen,
			},
			folder: {
				default: Layers,
				open: FolderOpen,
			},
			file: {
				default: ScrollText,
			},
			character: {
				default: User,
			},
			world: {
				default: Sparkles,
			},
			activityBar: {
				library: BookText,
				search: Search,
				outline: ListTree,
				wiki: BookOpen,
				canvas: Feather,
				chapters: FolderTree,
				files: Files,
				diary: CalendarDays,
				statistics: TrendingUp,
				settings: Settings,
				create: Plus,
				import: Upload,
				export: Download,
				more: MoreHorizontal,
			},
		},
	},
	{
		key: "writer",
		name: "作家图标",
		description: "专为写作设计的图标主题",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Notebook,
				open: BookOpen,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: Feather,
			},
			character: {
				default: Users,
			},
			world: {
				default: Globe,
			},
			activityBar: {
				library: Notebook,
				search: Search,
				outline: ListTree,
				wiki: BookOpen,
				canvas: Feather,
				chapters: FolderTree,
				files: Files,
				diary: CalendarDays,
				statistics: TrendingUp,
				settings: Settings,
				create: PenTool,
				import: Upload,
				export: Download,
				more: MoreHorizontal,
			},
		},
	},
];

// 获取图标主题
export function getIconThemeByKey(key: string): IconTheme | undefined {
	return iconThemes.find((theme) => theme.key === key);
}

// 获取默认图标主题
export function getDefaultIconTheme(): IconTheme {
	return iconThemes[0];
}

// 应用图标主题
export function applyIconTheme(themeKey: string): void {
	localStorage.setItem("icon-theme", themeKey);
}

// 获取当前图标主题
export function getCurrentIconTheme(): IconTheme {
	const saved = localStorage.getItem("icon-theme");
	return getIconThemeByKey(saved || "default") || getDefaultIconTheme();
}

// 根据类型和状态获取图标
export function getIconForType(
	type: "project" | "character" | "world" | "folder" | "file",
	state: "default" | "open" = "default",
): LucideIcon {
	const theme = getCurrentIconTheme();
	const iconConfig = theme.icons[type];

	if (state === "open" && "open" in iconConfig && iconConfig.open) {
		return iconConfig.open;
	}

	return iconConfig.default;
}

// 获取所有可用的图标主题
export function getAllIconThemes(): IconTheme[] {
	return iconThemes;
}

// 获取图标主题数量
export function getIconThemeCount(): number {
	return iconThemes.length;
}

// 获取 ActivityBar 图标
export function getActivityBarIcon(
	type: keyof IconTheme["icons"]["activityBar"],
): LucideIcon {
	const theme = getCurrentIconTheme();
	return theme.icons.activityBar[type];
}
