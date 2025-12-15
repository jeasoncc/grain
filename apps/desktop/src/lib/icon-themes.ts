/**
 * 文件图标主题系统 - 类似 VSCode 的 File Icon Theme
 * 为不同文件类型提供统一的图标风格
 */

import {
	Activity,
	BarChart3,
	Book,
	BookMarked,
	BookOpen,
	BookOpenText,
	BookText,
	Box,
	Calendar,
	CalendarDays,
	Circle,
	Cog,
	Component,
	Database,
	Download,
	Feather,
	File,
	FileBox,
	FileCode,
	FileDown,
	FileEdit,
	FileInput,
	FileOutput,
	FileSearch,
	FileTerminal,
	FileText,
	FileUp,
	Files,
	Flower2,
	Folder,
	FolderClosed,
	FolderOpen,
	FolderOutput,
	FolderTree,
	Gauge,
	Globe,
	Grid,
	Grid3x3,
	HardDrive,
	Hash,
	Heart,
	HelpCircle,
	Image as ImageIcon,
	Info,
	Layers,
	LayoutTemplate,
	Library,
	LifeBuoy,
	List,
	ListTree,
	type LucideIcon,
	Map,
	Menu,
	Monitor,
	Moon,
	MoreHorizontal,
	MoreVertical,
	Mountain,
	Move,
	Network,
	Notebook,
	Package,
	Palette,
	PenTool,
	Pencil,
	PieChart,
	Plus,
	PlusCircle,
	Ruler,
	Scroll,
	ScrollText,
	Search,
	Server,
	Settings,
	Settings2,
	Share,
	Share2,
	Sliders,
	Smile,
	Sparkles,
	Square,
	Star,
	Sun,
	Tag,
	Tags,
	Terminal,
	TrendingUp,
	Upload,
	User,
	UserCog,
	Users,
	Type,
	Wand2,
	Waves,
	Workflow,
	Wrench,
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
				tags: Tags,
				statistics: TrendingUp,
				settings: Settings,
				create: Plus,
				import: Upload,
				export: Download,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Palette,
				icons: Sparkles,
				diagrams: BarChart3,
				general: Settings2,
				editor: Type,
				data: Database,
				export: FolderOutput,
				scroll: Activity,
				logs: ScrollText,
				about: Info,
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
				tags: Tag,
				statistics: BarChart3,
				settings: Cog,
				create: Plus,
				import: Upload,
				export: Download,
				more: Menu,
			},
			settingsPage: {
				appearance: Circle,
				icons: Star,
				diagrams: Square,
				general: Sliders,
				editor: Type,
				data: Database,
				export: Download,
				scroll: Move,
				logs: List,
				about: HelpCircle,
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
				tags: Tags,
				statistics: TrendingUp,
				settings: Settings,
				create: PlusCircle,
				import: FileUp,
				export: FileDown,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Palette,
				icons: Sparkles,
				diagrams: PieChart,
				general: Settings,
				editor: FileEdit,
				data: HardDrive,
				export: FileOutput,
				scroll: Scroll,
				logs: FileText,
				about: Info,
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
				tags: Tags,
				statistics: BarChart3,
				settings: Cog,
				create: PlusCircle,
				import: FileUp,
				export: FileDown,
				more: Menu,
			},
			settingsPage: {
				appearance: LayoutTemplate,
				icons: Grid,
				diagrams: BarChart3,
				general: Sliders,
				editor: PenTool,
				data: Server,
				export: Share,
				scroll: Waves,
				logs: FileCode,
				about: LifeBuoy,
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
				tags: Tags,
				statistics: TrendingUp,
				settings: Settings,
				create: Plus,
				import: Upload,
				export: Download,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Wand2,
				icons: Star,
				diagrams: Activity,
				general: Settings2,
				editor: Feather,
				data: Database,
				export: FolderOutput,
				scroll: Scroll,
				logs: ScrollText,
				about: HelpCircle,
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
				tags: Tags,
				statistics: TrendingUp,
				settings: Settings,
				create: PenTool,
				import: Upload,
				export: Download,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Palette,
				icons: Sparkles,
				diagrams: TrendingUp,
				general: Settings,
				editor: Pencil,
				data: Book,
				export: FileOutput,
				scroll: Scroll,
				logs: FileText,
				about: Info,
			},
		},
	},
	{
		key: "technical",
		name: "技术图标",
		description: "硬朗的技术风格图标",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Box,
				open: Package,
			},
			folder: {
				default: FolderClosed,
				open: FolderOpen,
			},
			file: {
				default: FileCode,
			},
			character: {
				default: UserCog,
			},
			world: {
				default: Network,
			},
			activityBar: {
				library: Database,
				search: FileSearch,
				outline: Share2,
				wiki: FileCode,
				canvas: Ruler,
				chapters: FolderTree,
				files: FileBox,
				diary: Terminal,
				tags: Hash,
				statistics: Gauge,
				settings: Wrench,
				create: Plus,
				import: FileInput,
				export: FileOutput,
				more: MoreVertical,
			},
			settingsPage: {
				appearance: Monitor,
				icons: Component,
				diagrams: Gauge,
				general: Cog,
				editor: Terminal,
				data: Server,
				export: HardDrive,
				scroll: Activity,
				logs: FileTerminal,
				about: Info,
			},
		},
	},
	{
		key: "nature",
		name: "自然图标",
		description: "清新自然的图标风格",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Flower2,
				open: Flower2,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: File,
			},
			character: {
				default: Smile,
			},
			world: {
				default: Mountain,
			},
			activityBar: {
				library: Flower2,
				search: Search,
				outline: ListTree,
				wiki: BookOpen,
				canvas: Palette,
				chapters: FolderTree,
				files: Files,
				diary: Sun,
				tags: Tags,
				statistics: TrendingUp,
				settings: Settings,
				create: Plus,
				import: Upload,
				export: Download,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Sun,
				icons: Flower2,
				diagrams: TrendingUp,
				general: Settings2,
				editor: Feather,
				data: Database,
				export: FolderOutput,
				scroll: Waves,
				logs: ScrollText,
				about: Heart,
			},
		},
	},
	{
		key: "code",
		name: "Code Icons",
		description: "Developer focused icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Terminal,
				open: Terminal,
			},
			folder: {
				default: FolderClosed,
				open: FolderOpen,
			},
			file: {
				default: FileCode,
			},
			character: {
				default: UserCog,
			},
			world: {
				default: Globe,
			},
			activityBar: {
				library: Terminal,
				search: FileSearch,
				outline: ListTree,
				wiki: FileCode,
				canvas: PenTool,
				chapters: FolderTree,
				files: Files,
				diary: Calendar,
				tags: Hash,
				statistics: Activity,
				settings: Cog,
				create: Plus,
				import: Download,
				export: Upload,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Monitor,
				icons: Component,
				diagrams: Activity,
				general: Cog,
				editor: Terminal,
				data: Database,
				export: HardDrive,
				scroll: Move,
				logs: FileTerminal,
				about: Info,
			},
		},
	},
	{
		key: "business",
		name: "Business Icons",
		description: "Professional office icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Scroll,
				open: ScrollText,
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
				library: Scroll,
				search: Search,
				outline: List,
				wiki: FileText,
				canvas: PenTool,
				chapters: FolderTree,
				files: Files,
				diary: CalendarDays,
				tags: Tag,
				statistics: BarChart3,
				settings: Settings2,
				create: PlusCircle,
				import: Download,
				export: Upload,
				more: MoreVertical,
			},
			settingsPage: {
				appearance: LayoutTemplate,
				icons: Grid,
				diagrams: BarChart3,
				general: Settings2,
				editor: FileEdit,
				data: Database,
				export: Share,
				scroll: Scroll,
				logs: List,
				about: Info,
			},
		},
	},
	{
		key: "creative",
		name: "Creative Icons",
		description: "Artistic and expressive icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Palette,
				open: Palette,
			},
			folder: {
				default: Layers,
				open: Layers,
			},
			file: {
				default: ImageIcon,
			},
			character: {
				default: Smile,
			},
			world: {
				default: Sparkles,
			},
			activityBar: {
				library: Palette,
				search: Search,
				outline: Grid3x3,
				wiki: BookOpen,
				canvas: PenTool,
				chapters: FolderTree,
				files: Files,
				diary: Sun,
				tags: Star,
				statistics: PieChart,
				settings: Sliders,
				create: Plus,
				import: Download,
				export: Upload,
				more: Menu,
			},
			settingsPage: {
				appearance: Palette,
				icons: Sparkles,
				diagrams: PieChart,
				general: Sliders,
				editor: PenTool,
				data: HardDrive,
				export: Share2,
				scroll: Waves,
				logs: ScrollText,
				about: Heart,
			},
		},
	},
	{
		key: "academic",
		name: "Academic Icons",
		description: "Scholarly and research icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Book,
				open: BookOpen,
			},
			folder: {
				default: Library,
				open: Library,
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
				library: Library,
				search: Search,
				outline: ListTree,
				wiki: BookOpenText,
				canvas: PenTool,
				chapters: FolderTree,
				files: Files,
				diary: Calendar,
				tags: Tags,
				statistics: BarChart3,
				settings: Settings,
				create: Plus,
				import: Download,
				export: Upload,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Book,
				icons: Grid,
				diagrams: BarChart3,
				general: Settings,
				editor: FileEdit,
				data: Database,
				export: FileUp,
				scroll: Scroll,
				logs: FileText,
				about: HelpCircle,
			},
		},
	},
	{
		key: "hardware",
		name: "Hardware",
		description: "Computer hardware icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Monitor,
				open: Monitor,
			},
			folder: {
				default: Server,
				open: Server,
			},
			file: {
				default: HardDrive,
			},
			character: {
				default: User,
			},
			world: {
				default: Network,
			},
			activityBar: {
				library: HardDrive,
				search: Search,
				outline: Grid,
				wiki: FileCode,
				canvas: PenTool,
				chapters: FolderTree,
				files: Files,
				diary: Calendar,
				tags: Hash,
				statistics: Activity,
				settings: Cog,
				create: Plus,
				import: Download,
				export: Upload,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Monitor,
				icons: Component,
				diagrams: Activity,
				general: Cog,
				editor: Terminal,
				data: Database,
				export: HardDrive,
				scroll: Move,
				logs: FileTerminal,
				about: Info,
			},
		},
	},
	{
		key: "tools",
		name: "Tools",
		description: "Utility and tools icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Wrench,
				open: Wrench,
			},
			folder: {
				default: Package,
				open: Package,
			},
			file: {
				default: File,
			},
			character: {
				default: UserCog,
			},
			world: {
				default: Globe,
			},
			activityBar: {
				library: Wrench,
				search: Search,
				outline: List,
				wiki: BookOpen,
				canvas: Ruler,
				chapters: FolderTree,
				files: Files,
				diary: Calendar,
				tags: Tag,
				statistics: Gauge,
				settings: Settings2,
				create: Plus,
				import: Download,
				export: Upload,
				more: MoreVertical,
			},
			settingsPage: {
				appearance: LayoutTemplate,
				icons: Grid,
				diagrams: Gauge,
				general: Settings2,
				editor: FileEdit,
				data: Database,
				export: Share,
				scroll: Scroll,
				logs: List,
				about: Info,
			},
		},
	},
	{
		key: "shapes",
		name: "Shapes",
		description: "Geometric shape icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Box,
				open: Box,
			},
			folder: {
				default: Square,
				open: Square,
			},
			file: {
				default: Circle,
			},
			character: {
				default: User,
			},
			world: {
				default: Globe,
			},
			activityBar: {
				library: Box,
				search: Search,
				outline: Grid,
				wiki: BookOpen,
				canvas: PenTool,
				chapters: FolderTree,
				files: Files,
				diary: Calendar,
				tags: Tag,
				statistics: PieChart,
				settings: Settings,
				create: Plus,
				import: Download,
				export: Upload,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Palette,
				icons: Grid,
				diagrams: PieChart,
				general: Settings,
				editor: FileEdit,
				data: Database,
				export: FileUp,
				scroll: Scroll,
				logs: FileText,
				about: Info,
			},
		},
	},
	{
		key: "love",
		name: "Love",
		description: "Heart and affection icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Heart,
				open: Heart,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: FileText,
			},
			character: {
				default: Smile,
			},
			world: {
				default: Globe,
			},
			activityBar: {
				library: Heart,
				search: Search,
				outline: List,
				wiki: BookOpen,
				canvas: PenTool,
				chapters: FolderTree,
				files: Files,
				diary: Calendar,
				tags: Tag,
				statistics: TrendingUp,
				settings: Settings,
				create: Plus,
				import: Download,
				export: Upload,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Heart,
				icons: Sparkles,
				diagrams: TrendingUp,
				general: Settings,
				editor: FileEdit,
				data: Database,
				export: FileUp,
				scroll: Scroll,
				logs: FileText,
				about: Info,
			},
		},
	},
	{
		key: "night",
		name: "Night",
		description: "Dark mode optimized icons",
		author: "Novel Editor Team",
		icons: {
			project: {
				default: Moon,
				open: Moon,
			},
			folder: {
				default: Folder,
				open: FolderOpen,
			},
			file: {
				default: File,
			},
			character: {
				default: User,
			},
			world: {
				default: Globe,
			},
			activityBar: {
				library: Moon,
				search: Search,
				outline: ListTree,
				wiki: BookOpen,
				canvas: PenTool,
				chapters: FolderTree,
				files: Files,
				diary: Calendar,
				tags: Star,
				statistics: BarChart3,
				settings: Settings,
				create: Plus,
				import: Download,
				export: Upload,
				more: MoreHorizontal,
			},
			settingsPage: {
				appearance: Moon,
				icons: Star,
				diagrams: BarChart3,
				general: Settings,
				editor: FileEdit,
				data: Database,
				export: FileUp,
				scroll: Scroll,
				logs: FileText,
				about: Info,
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

// 获取 SettingsPage 图标
export function getSettingsPageIcon(
	type: keyof IconTheme["icons"]["settingsPage"],
): LucideIcon {
	const theme = getCurrentIconTheme();
	return theme.icons.settingsPage[type];
}
