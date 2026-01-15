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
} from "lucide-react"

export interface IconOption {
	readonly key: string
	readonly name: string
	readonly icon: LucideIcon
	readonly category: IconCategory
	readonly description?: string
}

export type IconCategory = "book" | "writing" | "file" | "folder" | "special" | "shape" | "symbol"

export const iconCategories: Record<
	IconCategory,
	{ readonly name: string; readonly description: string }
> = {
	book: {
		description: "Book相关图标",
		name: "Book",
	},
	file: {
		description: "文件相关图标",
		name: "文件",
	},
	folder: {
		description: "文件夹图标",
		name: "文件夹",
	},
	shape: {
		description: "几何形状图标",
		name: "形状",
	},
	special: {
		description: "特殊标记图标",
		name: "特殊",
	},
	symbol: {
		description: "符号图标",
		name: "符号",
	},
	writing: {
		description: "写作工具图标",
		name: "写作",
	},
}

export const icons: readonly IconOption[] = [
	// Book类图标
	{
		category: "book",
		description: "标准Book图标",
		icon: Book,
		key: "book",
		name: "Book",
	},
	{
		category: "book",
		description: "展开的Book",
		icon: BookOpen,
		key: "book-open",
		name: "打开的书",
	},
	{
		category: "book",
		description: "带书签的书",
		icon: BookMarked,
		key: "book-marked",
		name: "书签Book",
	},
	{
		category: "book",
		description: "带文字的书",
		icon: BookText,
		key: "book-text",
		name: "文本Book",
	},
	{
		category: "book",
		description: "图书馆/书架",
		icon: Library,
		key: "library",
		name: "图书馆",
	},
	{
		category: "book",
		description: "笔记本",
		icon: Notebook,
		key: "notebook",
		name: "笔记本",
	},
	{
		category: "book",
		description: "古典卷轴",
		icon: Scroll,
		key: "scroll",
		name: "卷轴",
	},

	// 写作类图标
	{
		category: "writing",
		description: "经典Feather Pen",
		icon: Feather,
		key: "feather",
		name: "Feather Pen",
	},
	{
		category: "writing",
		description: "钢笔",
		icon: Pen,
		key: "pen",
		name: "钢笔",
	},
	{
		category: "writing",
		description: "绘图工具",
		icon: PenTool,
		key: "pen-tool",
		name: "绘图笔",
	},
	{
		category: "writing",
		description: "编辑图标",
		icon: Edit,
		key: "edit",
		name: "编辑",
	},
	{
		category: "writing",
		description: "编辑图标变体",
		icon: Edit3,
		key: "edit-3",
		name: "编辑3",
	},
	{
		category: "writing",
		description: "铅笔",
		icon: Pencil,
		key: "pencil",
		name: "铅笔",
	},

	// 文件类图标
	{
		category: "file",
		description: "文本文档",
		icon: FileText,
		key: "file-text",
		name: "文本文件",
	},
	{
		category: "file",
		description: "通用文件",
		icon: File,
		key: "file",
		name: "文件",
	},
	{
		category: "file",
		description: "文件集合",
		icon: Files,
		key: "files",
		name: "多个文件",
	},

	// 文件夹类图标
	{
		category: "folder",
		description: "标准文件夹",
		icon: Folder,
		key: "folder",
		name: "文件夹",
	},
	{
		category: "folder",
		description: "展开的文件夹",
		icon: FolderOpen,
		key: "folder-open",
		name: "打开的文件夹",
	},
	{
		category: "folder",
		description: "文件夹结构",
		icon: FolderTree,
		key: "folder-tree",
		name: "文件夹树",
	},

	// 特殊标记图标
	{
		category: "special",
		description: "特殊/精选",
		icon: Sparkles,
		key: "sparkles",
		name: "Sparkle",
	},
	{
		category: "special",
		description: "收藏/重要",
		icon: Star,
		key: "star",
		name: "Star",
	},
	{
		category: "special",
		description: "喜爱",
		icon: Heart,
		key: "heart",
		name: "Heart",
	},
	{
		category: "special",
		description: "热门/火热",
		icon: Flame,
		key: "flame",
		name: "Flame",
	},
	{
		category: "special",
		description: "快速/能量",
		icon: Zap,
		key: "zap",
		name: "闪电",
	},
	{
		category: "special",
		description: "王者/顶级",
		icon: Crown,
		key: "crown",
		name: "Crown",
	},
	{
		category: "special",
		description: "成就",
		icon: Award,
		key: "award",
		name: "奖章",
	},
	{
		category: "special",
		description: "胜利",
		icon: Trophy,
		key: "trophy",
		name: "奖杯",
	},
	{
		category: "special",
		description: "Target/焦点",
		icon: Target,
		key: "target",
		name: "Target",
	},
	{
		category: "special",
		description: "标记/里程碑",
		icon: Flag,
		key: "flag",
		name: "旗帜",
	},
	{
		category: "special",
		description: "书签",
		icon: Bookmark,
		key: "bookmark",
		name: "书签",
	},
	{
		category: "special",
		description: "标签",
		icon: Tag,
		key: "tag",
		name: "标签",
	},

	// 形状图标
	{
		category: "shape",
		description: "圆形",
		icon: Circle,
		key: "circle",
		name: "圆形",
	},
	{
		category: "shape",
		description: "方形",
		icon: Square,
		key: "square",
		name: "方形",
	},
	{
		category: "shape",
		description: "三角形",
		icon: Triangle,
		key: "triangle",
		name: "三角形",
	},
	{
		category: "shape",
		description: "菱形",
		icon: Diamond,
		key: "diamond",
		name: "菱形",
	},
	{
		category: "shape",
		description: "六边形",
		icon: Hexagon,
		key: "hexagon",
		name: "六边形",
	},
	{
		category: "shape",
		description: "八边形",
		icon: Octagon,
		key: "octagon",
		name: "八边形",
	},
	{
		category: "shape",
		description: "五边形",
		icon: Pentagon,
		key: "pentagon",
		name: "五边形",
	},

	// 符号图标
	{
		category: "symbol",
		description: "标签符号",
		icon: Hash,
		key: "hash",
		name: "井号",
	},
	{
		category: "symbol",
		description: "@符号",
		icon: AtSign,
		key: "at-sign",
		name: "@符号",
	},
]

// 按类别分组图标
export function getIconsByCategory(category: IconCategory): readonly IconOption[] {
	return icons.filter((icon) => icon.category === category)
}

// 获取所有类别
export function getAllCategories(): readonly IconCategory[] {
	return Object.keys(iconCategories) as readonly IconCategory[]
}

// 根据 key 获取图标
export function getIconByKey(key: string): IconOption | undefined {
	return icons.find((icon) => icon.key === key)
}

// 获取默认图标
export function getDefaultIcon(type: "project" | "folder" | "file"): IconOption {
	switch (type) {
		case "project":
			return icons.find((i) => i.key === "book") || icons[0]
		case "folder":
			return icons.find((i) => i.key === "folder") || icons[0]
		case "file":
			return icons.find((i) => i.key === "file-text") || icons[0]
		default:
			return icons[0]
	}
}

// 搜索图标
export function searchIcons(query: string): readonly IconOption[] {
	const lowerQuery = query.toLowerCase()
	return icons.filter(
		(icon) =>
			icon.name.toLowerCase().includes(lowerQuery) ||
			icon.key.toLowerCase().includes(lowerQuery) ||
			icon.description?.toLowerCase().includes(lowerQuery),
	)
}
