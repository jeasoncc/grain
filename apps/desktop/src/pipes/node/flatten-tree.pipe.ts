/**
 * @file pipes/node/flatten-tree.pipe.ts
 * @description Pure functions for flattening tree structure into linear array
 *
 * 职责：
 * - 将树形结构扁平化为线性数组（用于虚拟列表渲染）
 * - 根据展开状态过滤节点
 * - 计算节点深度（用于缩进）
 * - 纯函数，无副作用
 *
 * 依赖：types/
 */

import type { NodeInterface } from "@/types/node"
import type { FlatTreeNode } from "@/types/node"

/**
 * Flatten tree structure into linear array for virtual rendering
 * 将树形结构扁平化为线性数组，用于虚拟列表渲染
 *
 * Algorithm:
 * 1. Start with root nodes (parent === null)
 * 2. For each node, add to result array with depth info
 * 3. If node is folder and expanded, recursively add children
 * 4. Track depth for indentation rendering
 *
 * @param nodes - All nodes from database / 数据库中的所有节点
 * @param expandedFolders - Map of folder IDs to expanded state / 文件夹展开状态映射
 * @returns Flattened array of nodes with depth information / 带深度信息的扁平化节点数组
 *
 * @example
 * ```typescript
 * const nodes = [
 *   { id: '1', parent: null, type: 'folder', ... },
 *   { id: '2', parent: '1', type: 'file', ... },
 * ]
 * const expanded = { '1': true }
 * const flat = flattenTree(nodes, expanded)
 * // Returns: [
 * //   { id: '1', depth: 0, isExpanded: true, ... },
 * //   { id: '2', depth: 1, isExpanded: false, ... },
 * // ]
 * ```
 */
export const flattenTree = (
	nodes: readonly NodeInterface[],
	expandedFolders: Record<string, boolean>,
): readonly FlatTreeNode[] => {
	if (nodes.length === 0) return []

	// Get children for a given parent ID
	const getChildren = (parentId: string | null): readonly NodeInterface[] =>
		nodes.filter((n) => n.parent === parentId).toSorted((a, b) => a.order - b.order)

	// Recursive flatten function
	const flatten = (parentId: string | null, depth: number): readonly FlatTreeNode[] => {
		const children = getChildren(parentId)

		return children.flatMap((node) => {
			const isFolder = node.type === "folder"
			const isExpanded = expandedFolders[node.id] ?? false
			const hasChildren = isFolder && getChildren(node.id).length > 0

			// Current node
			const flatNode: FlatTreeNode = {
				id: node.id,
				title: node.title,
				type: node.type,
				depth,
				hasChildren,
				isExpanded,
				parentId: node.parent,
				order: node.order,
			}

			// If folder is expanded, include children
			if (isFolder && isExpanded) {
				return [flatNode, ...flatten(node.id, depth + 1)]
			}

			// Otherwise, just return current node
			return [flatNode]
		})
	}

	// Start from root (parent === null, depth === 0)
	return flatten(null, 0)
}

/**
 * Count total visible nodes (for debugging/testing)
 * 计算可见节点总数（用于调试/测试）
 *
 * @param nodes - All nodes / 所有节点
 * @param expandedFolders - Expanded state / 展开状态
 * @returns Number of visible nodes / 可见节点数量
 */
export const countVisibleNodes = (
	nodes: readonly NodeInterface[],
	expandedFolders: Record<string, boolean>,
): number => flattenTree(nodes, expandedFolders).length
