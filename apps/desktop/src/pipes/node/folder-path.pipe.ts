/**
 * @file folder-path.pipe.ts
 * @description 文件夹路径纯函数
 *
 * 处理文件夹路径相关的纯逻辑：
 * - 查找已存在的文件夹
 * - 构建文件夹路径结构
 */

import type { NodeInterface } from "@/types/node"

// ==============================
// Types
// ==============================

/**
 * 文件夹查找结果
 */
export interface FolderLookupResult {
	/** 找到的文件夹节点（如果存在） */
	readonly existing: NodeInterface | undefined
	/** 是否需要创建 */
	readonly needsCreate: boolean
}

/**
 * 文件夹路径段
 */
export interface FolderPathSegment {
	/** 文件夹标题 */
	readonly title: string
	/** 父节点 ID（null 表示根级） */
	readonly parentId: string | null
}

// ==============================
// Pure Functions
// ==============================

/**
 * 在节点列表中查找指定父节点下的文件夹
 *
 * @param nodes - 节点列表
 * @param parentId - 父节点 ID
 * @param title - 文件夹标题
 * @returns 查找结果
 */
export const findFolderByParentAndTitle = (
	nodes: readonly NodeInterface[],
	parentId: string | null,
	title: string,
): FolderLookupResult => {
	const existing = nodes.find(
		(n) => n.parent === parentId && n.title === title && n.type === "folder",
	)
	return {
		existing,
		needsCreate: !existing,
	}
}

/**
 * 将文件夹路径数组转换为路径段列表
 *
 * @param folderPath - 文件夹路径数组 ["Diary", "2024", "01"]
 * @returns 路径段列表（不含 parentId，需要在创建时动态计算）
 */
export const buildFolderPathSegments = (
	folderPath: readonly string[],
): readonly FolderPathSegment[] =>
	folderPath.map((title) => ({
		parentId: null, // 实际 parentId 在创建时动态计算
		title,
	}))

/**
 * 解析已存在的文件夹路径
 *
 * 给定节点列表和路径，返回每一级的查找结果
 *
 * @param nodes - 节点列表
 * @param folderPath - 文件夹路径数组
 * @returns 每一级的查找结果和最后一个存在的文件夹 ID
 */
export const resolveFolderPath = (
	nodes: readonly NodeInterface[],
	folderPath: readonly string[],
): {
	/** 每一级的查找结果 */
	readonly results: readonly FolderLookupResult[]
	/** 最后一个存在的文件夹（如果路径完全存在） */
	readonly lastFolder: NodeInterface | undefined
	/** 需要创建的路径段（从第一个不存在的开始） */
	readonly toCreate: readonly string[]
	/** 创建起点的父节点 ID */
	readonly createFromParentId: string | null
} => {
	const results: FolderLookupResult[] = []
	let currentParentId: string | null = null
	let lastFolder: NodeInterface | undefined

	for (const title of folderPath) {
		const result = findFolderByParentAndTitle(nodes, currentParentId, title)
		results.push(result)

		if (result.existing) {
			currentParentId = result.existing.id
			lastFolder = result.existing
		} else {
			// 找到第一个不存在的，后续都需要创建
			const currentIndex = results.length - 1
			return {
				createFromParentId: currentIndex > 0 ? results[currentIndex - 1].existing?.id ?? null : null,
				lastFolder,
				results,
				toCreate: folderPath.slice(currentIndex),
			}
		}
	}

	// 所有文件夹都存在
	return {
		createFromParentId: lastFolder?.id ?? null,
		lastFolder,
		results,
		toCreate: [],
	}
}
