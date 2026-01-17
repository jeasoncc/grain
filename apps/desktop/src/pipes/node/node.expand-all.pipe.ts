/**
 * @file pipes/node/node.expand-all.fn.ts
 * @description Pure functions for batch expand/collapse operations
 *
 * 职责：
 * - 计算全部展开的文件夹状态
 * - 计算全部折叠的文件夹状态
 * - 检查是否有文件夹
 *
 * 依赖：types/
 */

import type { NodeInterface } from "@/types/node"

/**
 * Calculate expanded folders state for "Expand All" operation
 * 计算"全部展开"操作的文件夹状态
 *
 * Returns a record where all folder IDs are mapped to `true` (expanded).
 * 返回一个记录，其中所有文件夹 ID 都映射为 `true`（展开）。
 *
 * @param nodes - Array of nodes / 节点数组
 * @returns Record mapping folder IDs to expanded state (all true) / 将文件夹 ID 映射到展开状态的记录（全部为 true）
 *
 * @example
 * ```typescript
 * const nodes = [
 *   { id: '1', type: 'folder', ... },
 *   { id: '2', type: 'file', ... },
 *   { id: '3', type: 'folder', ... },
 * ]
 *
 * const result = calculateExpandAllFolders(nodes)
 * // { '1': true, '3': true }
 * ```
 */
export const calculateExpandAllFolders = (
	nodes: readonly NodeInterface[],
): Record<string, boolean> =>
	nodes
		.filter((node) => node.type === "folder")
		.reduce(
			(acc, folder) => ({
				...acc,
				[folder.id]: true,
			}),
			{} as Record<string, boolean>,
		)

/**
 * Calculate expanded folders state for "Collapse All" operation
 * 计算"全部折叠"操作的文件夹状态
 *
 * Returns a record where all folder IDs are mapped to `false` (collapsed).
 * 返回一个记录，其中所有文件夹 ID 都映射为 `false`（折叠）。
 *
 * @param nodes - Array of nodes / 节点数组
 * @returns Record mapping folder IDs to expanded state (all false) / 将文件夹 ID 映射到展开状态的记录（全部为 false）
 *
 * @example
 * ```typescript
 * const nodes = [
 *   { id: '1', type: 'folder', ... },
 *   { id: '2', type: 'file', ... },
 *   { id: '3', type: 'folder', ... },
 * ]
 *
 * const result = calculateCollapseAllFolders(nodes)
 * // { '1': false, '3': false }
 * ```
 */
export const calculateCollapseAllFolders = (
	nodes: readonly NodeInterface[],
): Record<string, boolean> =>
	nodes
		.filter((node) => node.type === "folder")
		.reduce(
			(acc, folder) => ({
				...acc,
				[folder.id]: false,
			}),
			{} as Record<string, boolean>,
		)

/**
 * Check if there are any folders in the node list
 * 检查节点列表中是否有文件夹
 *
 * @param nodes - Array of nodes / 节点数组
 * @returns True if at least one folder exists / 如果至少存在一个文件夹则返回 true
 *
 * @example
 * ```typescript
 * const nodes1 = [
 *   { id: '1', type: 'folder', ... },
 *   { id: '2', type: 'file', ... },
 * ]
 * hasFolders(nodes1) // true
 *
 * const nodes2 = [
 *   { id: '1', type: 'file', ... },
 *   { id: '2', type: 'file', ... },
 * ]
 * hasFolders(nodes2) // false
 * ```
 */
export const hasFolders = (nodes: readonly NodeInterface[]): boolean =>
	nodes.some((node) => node.type === "folder")
