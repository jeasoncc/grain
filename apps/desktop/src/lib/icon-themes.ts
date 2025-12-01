/**
 * 文件图标主题系统 - 类似 VSCode 的 File Icon Theme
 * 为不同文件类型提供统一的图标风格
 */

import {
	Book,
	BookOpen,
	BookMarked,
	BookText,
	FileText,
	File,
	Files,
	Folder,
	FolderOpen,
	FolderTree,
	Layers,
	Library,
	Notebook,
	ScrollText,
	Users,
	User,
	Globe,
	Map,
	Sparkles,
	Feather,
	PenTool,
	FileEdit,
	BookOpenText,
	Search,
	ListTree,
	Pencil,
	TrendingUp,
	Settings,
	Plus,
	Upload,
	Download,
	MoreHorizontal,
	Compass,
	Palette,
	Grid3x3,
	BarChart3,
	Cog,
	PlusCircle,
	FileUp,
	FileDown,
	Menu,
	type LucideIcon,
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
		chapter: {
			default: LucideIcon;
			open?: LucideIcon;
		};
		scene: {
			default: LucideIcon;
		};
		character: {
			default: LucideIcon;
		};
		world: {
			default: LucideIcon;
		};
		folder: {
			default: LucideIcon;
			open?: LucideIcon;
		};
		file: {
			default: LucideIcon;
		};
		// ActivityBar 图标
		activityBar: {
			library: LucideIcon;
			search: LucideIcon;
			outline: LucideIcon;
			characters: LucideIcon;
			world: LucideIcon;
			canvas: LucideIcon;
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
			chapter: {
				default: Folder,
				open: FolderOpen,
			},
			scene: {
				default: FileText,
			},
			character: {
				default: User,
			},
			world: {
				default: Globe,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: File,
			},
			activityBar: {
				library: BookMarked,
				search: Search,
				outline: ListTree,
				characters: Users,
				world: BookOpen,
				canvas: Pencil,
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
			chapter: {
				default: Folder,
			},
			scene: {
				default: File,
			},
			character: {
				default: File,
			},
			world: {
				default: File,
			},
			folder: {
				default: Folder,
			},
			file: {
				default: File,
			},
			activityBar: {
				library: Book,
				search: Search,
				outline: ListTree,
				characters: Users,
				world: Globe,
				canvas: Pencil,
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
			chapter: {
				default: Folder,
				open: FolderOpen,
			},
			scene: {
				default: FileText,
			},
			character: {
				default: User,
			},
			world: {
				default: BookMarked,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: FileText,
			},
			activityBar: {
				library: BookMarked,
				search: Search,
				outline: ListTree,
				characters: Users,
				world: BookOpen,
				canvas: Pencil,
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
			chapter: {
				default: FolderTree,
				open: FolderOpen,
			},
			scene: {
				default: FileEdit,
			},
			character: {
				default: Users,
			},
			world: {
				default: Map,
			},
			folder: {
				default: FolderTree,
				open: FolderOpen,
			},
			file: {
				default: Files,
			},
			activityBar: {
				library: Library,
				search: Search,
				outline: Grid3x3,
				characters: Users,
				world: Compass,
				canvas: Palette,
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
			chapter: {
				default: Layers,
				open: FolderOpen,
			},
			scene: {
				default: ScrollText,
			},
			character: {
				default: User,
			},
			world: {
				default: Sparkles,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: FileText,
			},
			activityBar: {
				library: BookText,
				search: Search,
				outline: Layers,
				characters: Users,
				world: Sparkles,
				canvas: Feather,
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
			chapter: {
				default: Folder,
				open: FolderOpen,
			},
			scene: {
				default: Feather,
			},
			character: {
				default: Users,
			},
			world: {
				default: Globe,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: PenTool,
			},
			activityBar: {
				library: Notebook,
				search: Search,
				outline: ScrollText,
				characters: Users,
				world: Globe,
				canvas: Feather,
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
	type: "project" | "chapter" | "scene" | "character" | "world" | "folder" | "file",
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
