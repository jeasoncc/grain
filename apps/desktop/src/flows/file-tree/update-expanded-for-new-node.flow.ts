/**
 * @file flows/file-tree/update-expanded-for-new-node.flow.ts
 * @description 更新展开状态以显示新节点的 flow
 *
 * 职责：
 * - 计算新节点的祖先路径
 * - 生成展开状态（只展开到新节点的祖先）
 *
 * 依赖：pipes/, types/
 */

import { calculateAncestorPath, calculateExpandedAncestors } from "@/pipes/node"
import type { NodeInterface } from "@/types/node"

/**
 * 计算新节点的展开状态
 *
 * 只展开到新节点的祖先路径，折叠其他文件夹
 *
 * @param nodes - 所有节点
 * @param newNodeId - 新创建的节点 ID
 * @returns 展开状态映射
 */
export const updateExpandedForNewNodeFlow = (
	nodes: readonly NodeInterface[],
	newNodeId: string,
): Record<string, boolean> => {
	const ancestorPath = calculateAncestorPath(nodes, newNodeId)
	return ancestorPath.length > 0 ? calculateExpandedAncestors(ancestorPath) : {}
}
