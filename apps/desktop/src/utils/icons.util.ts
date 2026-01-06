/**
 * 图标配置系统
 * 提供丰富的图标选择，用于项目、章节、场景等
 */

import {
	AtSign,
	Award,
	Book,
	BookMarked,
	Bookmark,
	BookOpen,
	BookText,
	Circle,
	Crown,
	Diamond,
	Edit,
	Edit3,
	Feather,
	File,
	Files,
	FileText,
	Flag,
	Flame,
	Folder,
	FolderOpen,
	FolderTree,
	Hash,
	Heart,
	Hexagon,
	Library,
	type LucideIcon,
	Notebook,
	Octagon,
	Pen,
	Pencil,
	PenTool,
	Pentagon,
	Scroll,
	Sparkles,
	Square,
	Star,
	Tag,
	Target,
	Triangle,
	Trophy,
	Zap,
} from "lucide-react";

export interface IconOption {
	key: string;
	name: string;
	icon: LucideIcon;
	category: IconCategory;
	description?: string;
}

export type IconCategory =
	| "book"
	| "writing"
	| "file"
	| "folder"
	| "special"
	| "shape"
	| "symbol";

export const iconCategories: Record<
	IconCategory,
	{ name: string; description: string }
> = {
	book: {
		name: "Book",
		description: "Book相关图标",
	},
	writing: {
		name: "写作",
		description: "写作工具图标",
	},
	file: {
		name: "文件",
		description: "文件相关图标",
	},
	folder: {
		name: "文件夹",
		description: "文件夹图标",
	},
	special: {
		name: "特殊",
		description: "特殊标记图标",
	},
	shape: {
		name: "形状",
		description: "几何形状图标",
	},
	symbol: {
		name: "符号",
		description: "符号图标",
	},
};

export const icons: IconOption[] = [
	// Book类图标
	{
		key: "book",
		name: "Book",
		icon: Book,
		category: "book",
		description: "标准Book图标",
	},
	{
		key: "book-open",
		name: "打开的书",
		icon: BookOpen,
		category: "book",
		description: "展开的Book",
	},
	{
		key: "book-marked",
		name: "书签Book",
		icon: BookMarked,
		category: "book",
		description: "带书签的书",
	},
	{
		key: "book-text",
		name: "文本Book",
		icon: BookText,
		category: "book",
		description: "带文字的书",
	},
	{
		key: "library",
		name: "图书馆",
		icon: Library,
		category: "book",
		description: "图书馆/书架",
	},
	{
		key: "notebook",
		name: "笔记本",
		icon: Notebook,
		category: "book",
		description: "笔记本",
	},
	{
		key: "scroll",
		name: "卷轴",
		icon: Scroll,
		category: "book",
		description: "古典卷轴",
	},

	// 写作类图标
	{
		key: "feather",
		name: "Feather Pen",
		icon: Feather,
		category: "writing",
		description: "经典Feather Pen",
	},
	{
		key: "pen",
		name: "钢笔",
		icon: Pen,
		category: "writing",
		description: "钢笔",
	},
	{
		key: "pen-tool",
		name: "绘图笔",
		icon: PenTool,
		category: "writing",
		description: "绘图工具",
	},
	{
		key: "edit",
		name: "编辑",
		icon: Edit,
		category: "writing",
		description: "编辑图标",
	},
	{
		key: "edit-3",
		name: "编辑3",
		icon: Edit3,
		category: "writing",
		description: "编辑图标变体",
	},
	{
		key: "pencil",
		name: "铅笔",
		icon: Pencil,
		category: "writing",
		description: "铅笔",
	},

	// 文件类图标
	{
		key: "file-text",
		name: "文本文件",
		icon: FileText,
		category: "file",
		description: "文本文档",
	},
	{
		key: "file",
		name: "文件",
		icon: File,
		category: "file",
		description: "通用文件",
	},
	{
		key: "files",
		name: "多个文件",
		icon: Files,
		category: "file",
		description: "文件集合",
	},

	// 文件夹类图标
	{
		key: "folder",
		name: "文件夹",
		icon: Folder,
		category: "folder",
		description: "标准文件夹",
	},
	{
		key: "folder-open",
		name: "打开的文件夹",
		icon: FolderOpen,
		category: "folder",
		description: "展开的文件夹",
	},
	{
		key: "folder-tree",
		name: "文件夹树",
		icon: FolderTree,
		category: "folder",
		description: "文件夹结构",
	},

	// 特殊标记图标
	{
		key: "sparkles",
		name: "Sparkle",
		icon: Sparkles,
		category: "special",
		description: "特殊/精选",
	},
	{
		key: "star",
		name: "Star",
		icon: Star,
		category: "special",
		description: "收藏/重要",
	},
	{
		key: "heart",
		name: "Heart",
		icon: Heart,
		category: "special",
		description: "喜爱",
	},
	{
		key: "flame",
		name: "Flame",
		icon: Flame,
		category: "special",
		description: "热门/火热",
	},
	{
		key: "zap",
		name: "闪电",
		icon: Zap,
		category: "special",
		description: "快速/能量",
	},
	{
		key: "crown",
		name: "Crown",
		icon: Crown,
		category: "special",
		description: "王者/顶级",
	},
	{
		key: "award",
		name: "奖章",
		icon: Award,
		category: "special",
		description: "成就",
	},
	{
		key: "trophy",
		name: "奖杯",
		icon: Trophy,
		category: "special",
		description: "胜利",
	},
	{
		key: "target",
		name: "Target",
		icon: Target,
		category: "special",
		description: "Target/焦点",
	},
	{
		key: "flag",
		name: "旗帜",
		icon: Flag,
		category: "special",
		description: "标记/里程碑",
	},
	{
		key: "bookmark",
		name: "书签",
		icon: Bookmark,
		category: "special",
		description: "书签",
	},
	{
		key: "tag",
		name: "标签",
		icon: Tag,
		category: "special",
		description: "标签",
	},

	// 形状图标
	{
		key: "circle",
		name: "圆形",
		icon: Circle,
		category: "shape",
		description: "圆形",
	},
	{
		key: "square",
		name: "方形",
		icon: Square,
		category: "shape",
		description: "方形",
	},
	{
		key: "triangle",
		name: "三角形",
		icon: Triangle,
		category: "shape",
		description: "三角形",
	},
	{
		key: "diamond",
		name: "菱形",
		icon: Diamond,
		category: "shape",
		description: "菱形",
	},
	{
		key: "hexagon",
		name: "六边形",
		icon: Hexagon,
		category: "shape",
		description: "六边形",
	},
	{
		key: "octagon",
		name: "八边形",
		icon: Octagon,
		category: "shape",
		description: "八边形",
	},
	{
		key: "pentagon",
		name: "五边形",
		icon: Pentagon,
		category: "shape",
		description: "五边形",
	},

	// 符号图标
	{
		key: "hash",
		name: "井号",
		icon: Hash,
		category: "symbol",
		description: "标签符号",
	},
	{
		key: "at-sign",
		name: "@符号",
		icon: AtSign,
		category: "symbol",
		description: "@符号",
	},
];

// 按类别分组图标
export function getIconsByCategory(category: IconCategory): IconOption[] {
	return icons.filter((icon) => icon.category === category);
}

// 获取所有类别
export function getAllCategories(): IconCategory[] {
	return Object.keys(iconCategories) as IconCategory[];
}

// 根据 key 获取图标
export function getIconByKey(key: string): IconOption | undefined {
	return icons.find((icon) => icon.key === key);
}

// 获取默认图标
export function getDefaultIcon(
	type: "project" | "folder" | "file",
): IconOption {
	switch (type) {
		case "project":
			return icons.find((i) => i.key === "book") || icons[0];
		case "folder":
			return icons.find((i) => i.key === "folder") || icons[0];
		case "file":
			return icons.find((i) => i.key === "file-text") || icons[0];
		default:
			return icons[0];
	}
}

// 搜索图标
export function searchIcons(query: string): IconOption[] {
	const lowerQuery = query.toLowerCase();
	return icons.filter(
		(icon) =>
			icon.name.toLowerCase().includes(lowerQuery) ||
			icon.key.toLowerCase().includes(lowerQuery) ||
			icon.description?.toLowerCase().includes(lowerQuery),
	);
}
