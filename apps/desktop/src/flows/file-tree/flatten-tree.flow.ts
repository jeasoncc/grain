/**
 * @file flows/file-tree/flatten-tree.flow.ts
 * @description File tree flattening flow
 *
 * 职责：
 * - 包装 flattenTree pipe 函数
 * - 包装祖先路径计算函数
 * - 包装展开/折叠所有文件夹函数
 * - 提供给 hooks 层调用
 *
 * 依赖：pipes/, types/
 */

import {
	calculateAncestorPath,
	calculateCollapseAllFolders,
	calculateExpandAllFolders,
	calculateExpandedAncestors,
	flattenTree,
	hasFolders,
} from "@/pipes/node"
import type { FlatTreeNode, NodeInterface } from "@/types/node"

/**
 * Flatten tree structure for virtual rendering
 *
 * @param nodes - All nodes from database
 * @param expandedFolders - Map of folder IDs to expanded state
 * @returns Flattened array of nodes with depth information
 */
export const flattenTreeFlow = (
	nodes: readonly NodeInterface[],
	expandedFolders: Record<string, boolean>,
): readonly FlatTreeNode[] => flattenTree(nodes, expandedFolders)

/**
 * Calculate ancestor path for a node
 *
 * @param nodes - All nodes
 * @param nodeId - Target node ID
 * @returns Array of ancestor node IDs from root to parent
 */
export const calculateAncestorPathFlow = (
	nodes: readonly NodeInterface[],
	nodeId: string,
): readonly string[] => calculateAncestorPath(nodes, nodeId)

/**
 * Calculate expanded ancestors map for a path
 *
 * @param ancestorPath - Array of ancestor node IDs
 * @returns Map of folder IDs to expanded state (all true)
 */
export const calculateExpandedAncestorsFlow = (
	ancestorPath: readonly string[],
): Record<string, boolean> => calculateExpandedAncestors(ancestorPath)

/**
 * Calculate expand all folders state
 *
 * @param nodes - All nodes
 * @returns Map of all folder IDs to expanded state (all true)
 */
export const calculateExpandAllFoldersFlow = (
	nodes: readonly NodeInterface[],
): Record<string, boolean> => calculateExpandAllFolders(nodes)

/**
 * Calculate collapse all folders state
 *
 * @param nodes - All nodes
 * @returns Map of all folder IDs to expanded state (all false)
 */
export const calculateCollapseAllFoldersFlow = (
	nodes: readonly NodeInterface[],
): Record<string, boolean> => calculateCollapseAllFolders(nodes)

/**
 * Check if nodes contain any folders
 *
 * @param nodes - All nodes
 * @returns True if any node is a folder
 */
export const hasFoldersFlow = (nodes: readonly NodeInterface[]): boolean =>
	hasFolders(nodes)


