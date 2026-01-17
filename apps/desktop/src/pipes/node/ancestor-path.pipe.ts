/**
 * @file pipes/node/ancestor-path.pipe.ts
 * @description Pure functions for calculating ancestor paths in node tree
 *
 * 职责：
 * - 计算从根节点到目标节点的祖先路径
 * - 纯函数，无副作用
 *
 * 依赖：types/
 */

import type { NodeInterface } from "@/types/node"

/**
 * Calculate ancestor path from root to target node
 * 计算从根节点到目标节点的祖先路径
 *
 * Returns array of ancestor folder IDs (from root to parent, excluding target itself)
 * 返回祖先文件夹 ID 数组（从根到父节点，不包含目标节点本身）
 *
 * @param nodes - All nodes / 所有节点
 * @param targetNodeId - Target node ID / 目标节点 ID
 * @returns Array of ancestor folder IDs / 祖先文件夹 ID 数组
 *
 * Edge cases / 边界情况：
 * - Target not found: returns empty array / 目标不存在：返回空数组
 * - Root node: returns empty array (no ancestors) / 根节点：返回空数组（无祖先）
 * - Orphan node: stops at missing parent / 孤立节点：在缺失的父节点处停止
 *
 * @example
 * ```typescript
 * // Tree: root -> folder1 -> folder2 -> file
 * const path = calculateAncestorPath(nodes, 'file-id')
 * // Returns: ['folder1-id', 'folder2-id']
 * ```
 */
export const calculateAncestorPath = (
	nodes: readonly NodeInterface[],
	targetNodeId: string,
): readonly string[] => {
	if (nodes.length === 0) return []

	// Create node map for fast lookup
	const nodeMap = new Map(nodes.map((node) => [node.id, node]))

	// Find target node
	const targetNode = nodeMap.get(targetNodeId)
	if (!targetNode) return []

	// Root node has no ancestors
	if (targetNode.parent === null) return []

	// Build path recursively
	const buildPath = (
		currentNode: NodeInterface,
		depth: number,
	): readonly string[] => {
		// Prevent infinite loops
		if (depth >= 100) return []

		if (currentNode.parent === null) return []

		const parentNode = nodeMap.get(currentNode.parent)
		// Orphan node - parent doesn't exist
		if (!parentNode) return []

		// Only include folders in the path
		const parentPath = buildPath(parentNode, depth + 1)
		return parentNode.type === "folder"
			? [...parentPath, parentNode.id]
			: parentPath
	}

	return buildPath(targetNode, 0)
}

/**
 * Calculate expanded folders state for ancestor path
 * 计算祖先路径的展开状态
 *
 * Returns a record where all ancestor folder IDs are mapped to `true` (expanded)
 * 返回一个记录，其中所有祖先文件夹 ID 都映射为 `true`（展开）
 *
 * @param ancestorIds - Array of ancestor folder IDs / 祖先文件夹 ID 数组
 * @returns Record mapping folder IDs to expanded state / 文件夹 ID 到展开状态的映射
 *
 * @example
 * ```typescript
 * const ancestorIds = ['folder1-id', 'folder2-id']
 * const expanded = calculateExpandedAncestors(ancestorIds)
 * // Returns: { 'folder1-id': true, 'folder2-id': true }
 * ```
 */
export const calculateExpandedAncestors = (
	ancestorIds: readonly string[],
): Record<string, boolean> =>
	ancestorIds.reduce(
		(acc, folderId) => ({
			...acc,
			[folderId]: true,
		}),
		{} as Record<string, boolean>,
	)
