// ==============================
// 大纲功能扩展数据结构
// ==============================

import type { ChapterInterface, SceneInterface } from "./schema";

// ---------- 大纲节点元数据 ----------
/**
 * 为章节和场景添加大纲专用的元数据
 */
export interface OutlineMetadata {
	// 状态标记
	status?: "draft" | "in-progress" | "completed" | "needs-revision"; // 创作状态

	// 可视化标签
	color?: string; // 节点颜色标记（用于视觉分类）
	icon?: string; // 自定义图标

	// 大纲摘要
	summary?: string; // 章节/场景摘要（用于大纲视图显示）
	notes?: string; // 创作笔记（不显示在正文中）

	// 情节要素
	plotPoints?: string[]; // 关键剧情点
	characters?: string[]; // 涉及的角色ID
	locations?: string[]; // 涉及的地点ID

	// 统计信息（自动计算）
	wordCount?: number; // 字数统计
	targetWordCount?: number; // 目标字数

	// 时间线
	storyTime?: string; // 故事内时间（例如"第三天上午"）

	// 标签系统
	tags?: string[]; // 自定义标签（如"高潮"、"转折点"、"伏笔"）
}

// ---------- 扩展的章节接口 ----------
export interface ChapterWithOutline extends ChapterInterface {
	outline?: OutlineMetadata;
}

// ---------- 扩展的场景接口 ----------
export interface SceneWithOutline extends SceneInterface {
	outline?: OutlineMetadata;
}

// ---------- 大纲视图配置 ----------
export interface OutlineViewConfig {
	// 视图类型
	viewMode: "tree" | "cards" | "timeline" | "mindmap";

	// 显示选项
	showWordCount: boolean;
	showStatus: boolean;
	showSummary: boolean;
	showTags: boolean;

	// 过滤选项
	filterByStatus?: OutlineMetadata["status"][];
	filterByTags?: string[];
	searchQuery?: string;

	// 排序方式
	sortBy?: "order" | "wordCount" | "lastEdit" | "status";

	// 折叠状态
	collapsedChapters?: Set<string>; // 折叠的章节ID集合
}

// ---------- 大纲树节点 ----------
export interface OutlineTreeNode {
	id: string;
	type: "chapter" | "scene";
	title: string;
	order: number;

	// 元数据
	metadata?: OutlineMetadata;

	// 统计
	wordCount: number;
	sceneCount?: number; // 仅章节有

	// 子节点（仅章节有）
	children?: OutlineTreeNode[];

	// 父节点引用
	parentId?: string;
	projectId: string;
}
