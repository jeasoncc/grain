/**
 * @file pipes/node/node.expand-init.fn.ts
 * @description Pure functions for initializing folder expand state
 *
 * 职责：
 * - 从 NodeInterface.collapsed 字段初始化展开状态
 * - 提供默认值处理
 *
 * 依赖：types/
 */

import type { NodeInterface } from "@/types/node"

/**
 * Initialize expanded folders state from node list
 * 从节点列表初始化展开文件夹状态
 *
 * Reads the `collapsed` field from each folder node and converts it to
 * the `expandedFolders` format used by Zustand state.
 *
 * 从每个文件夹节点读取 `collapsed` 字段并将其转换为
 * Zustand 状态使用的 `expandedFolders` 格式。
 *
 * @param nodes - Array of nodes from database / 来自数据库的节点数组
 * @returns Record mapping folder IDs to expanded state / 将文件夹 ID 映射到展开状态的记录
 *
 * @example
 * ```typescript
 * const nodes = [
 *   { id: '1', type: 'folder', collapsed: false },  // expanded
 *   { id: '2', type: 'folder', collapsed: true },   // collapsed
 *   { id: '3', type: 'folder' },                    // undefined → collapsed
 *   { id: '4', type: 'file' },                      // ignored
 * ]
 *
 * const result = initializeExpandedFolders(nodes)
 * // { '1': true, '2': false, '3': false }
 * ```
 *
 * **Validates: Requirements 3.1, 3.2**
 */
export const initializeExpandedFolders = (
	nodes: readonly NodeInterface[],
): Record<string, boolean> =>
	nodes
		.filter((node) => node.type === "folder")
		.reduce(
			(acc, folder) => ({
				...acc,
				// Convert collapsed to expanded:
				// - collapsed: true → expanded: false
				// - collapsed: false → expanded: true
				// - collapsed: undefined → expanded: false (default to collapsed)
				[folder.id]: !(folder.collapsed ?? true),
			}),
			{},
		)
