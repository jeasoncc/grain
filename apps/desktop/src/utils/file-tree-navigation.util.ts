/**
 * @file file-tree-navigation.util.ts
 * @description 文件树导航工具函数
 *
 * 提供自动展开和定位功能，用于在文件树中导航到特定节点
 *
 * Requirements: 2.1, 2.3, 2.4
 */

import type { NodeInterface } from "@/types/node";

/**
 * 计算从根节点到目标节点的祖先路径
 *
 * @param nodes - 所有节点列表
 * @param targetNodeId - 目标节点 ID
 * @returns 祖先节点 ID 数组（从根到目标节点的父节点，不包含目标节点本身）
 *
 * 边界情况：
 * - 目标节点不存在：返回空数组
 * - 根节点：返回空数组（无祖先）
 * - 深层嵌套：递归遍历到根节点
 * - 孤立节点（parent 指向不存在的节点）：停止遍历，返回已找到的路径
 *
 * @example
 * // 节点结构: root -> folder1 -> folder2 -> file
 * calculateAncestorPath(nodes, 'file-id')
 * // 返回: ['folder1-id', 'folder2-id']
 */
export function calculateAncestorPath(
	nodes: NodeInterface[],
	targetNodeId: string,
): string[] {
	// 边界情况：节点列表为空
	if (nodes.length === 0) {
		return [];
	}

	// 创建节点映射以便快速查找
	const nodeMap = new Map<string, NodeInterface>();
	for (const node of nodes) {
		nodeMap.set(node.id, node);
	}

	// 查找目标节点
	const targetNode = nodeMap.get(targetNodeId);
	// 边界情况：目标节点不存在
	if (!targetNode) {
		return [];
	}

	// 边界情况：根节点（parent 为 null）
	if (targetNode.parent === null) {
		return [];
	}

	// 从目标节点向上遍历，构建路径
	const path: string[] = [];
	let currentNode = targetNode;
	const maxDepth = 100; // 防止无限循环
	let depth = 0;

	while (currentNode.parent !== null && depth < maxDepth) {
		const parentNode = nodeMap.get(currentNode.parent);
		// 边界情况：孤立节点（parent 指向不存在的节点）
		if (!parentNode) {
			console.warn(
				"[FileTreeNavigation] Parent node not found:",
				currentNode.parent,
			);
			break;
		}
		// 将父节点添加到路径开头（因为我们是从下往上遍历）
		path.unshift(parentNode.id);
		currentNode = parentNode;
		depth++;
	}

	// 边界情况：深度超过限制（可能存在循环引用）
	if (depth >= maxDepth) {
		console.error(
			"[FileTreeNavigation] Max depth exceeded, possible circular reference",
		);
	}

	return path;
}

/**
 * 展开所有祖先节点
 *
 * @param ancestorIds - 祖先节点 ID 数组
 * @param setCollapsed - 设置节点折叠状态的函数
 * @returns Promise<void>
 *
 * 边界情况：
 * - 空数组：不执行任何操作
 * - 展开失败：记录警告但继续展开其他节点
 *
 * @example
 * const ancestorIds = calculateAncestorPath(nodes, targetNodeId);
 * await expandAncestors(ancestorIds, setCollapsed);
 */
export async function expandAncestors(
	ancestorIds: string[],
	setCollapsed: (nodeId: string, collapsed: boolean) => Promise<boolean>,
): Promise<void> {
	// 边界情况：空数组
	if (ancestorIds.length === 0) {
		return;
	}

	// 按顺序展开每个祖先节点（从根到叶）
	for (const ancestorId of ancestorIds) {
		try {
			const success = await setCollapsed(ancestorId, false);
			if (!success) {
				console.warn(
					"[FileTreeNavigation] Failed to expand ancestor:",
					ancestorId,
				);
				// 继续展开其他节点，不中断流程
			}
		} catch (error) {
			console.error(
				"[FileTreeNavigation] Error expanding ancestor:",
				ancestorId,
				error,
			);
			// 继续展开其他节点，不中断流程
		}
	}
}

/**
 * 滚动到目标节点
 *
 * 使用 react-arborist 的 scrollTo 方法将节点滚动到可见区域
 *
 * @param treeRef - react-arborist Tree 组件的 ref
 * @param nodeId - 目标节点 ID
 *
 * 边界情况：
 * - treeRef 为 null：不执行任何操作
 * - scrollTo 方法不存在：记录警告
 * - 节点不在可见区域：react-arborist 自动处理滚动
 *
 * @example
 * scrollToNode(treeRef, 'node-id');
 */
export function scrollToNode(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	treeRef: React.RefObject<any>,
	nodeId: string,
): void {
	// 边界情况：treeRef 为 null
	if (!treeRef.current) {
		console.warn("[FileTreeNavigation] Tree ref is null, cannot scroll");
		return;
	}

	// react-arborist 提供 scrollTo 方法
	// 参数可以是节点 ID 或节点对象
	try {
		if (typeof treeRef.current.scrollTo === "function") {
			treeRef.current.scrollTo(nodeId);
		} else {
			console.warn(
				"[FileTreeNavigation] scrollTo method not available on tree ref",
			);
		}
	} catch (error) {
		console.warn("[FileTreeNavigation] Failed to scroll to node:", error);
	}
}

/**
 * 自动展开并定位到目标节点
 *
 * 组合函数：计算路径 -> 展开祖先 -> 滚动到节点
 *
 * @param nodes - 所有节点列表
 * @param targetNodeId - 目标节点 ID
 * @param setCollapsed - 设置节点折叠状态的函数
 * @param treeRef - react-arborist Tree 组件的 ref
 * @returns Promise<void>
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * 边界情况处理：
 * - 根节点创建（无需展开）：ancestorPath 为空数组，不执行展开操作
 * - 深层嵌套节点创建：递归遍历到根节点，处理任意深度
 * - 节点不在可见区域：使用 react-arborist 的 scrollTo 自动滚动
 *
 * @example
 * await autoExpandAndScrollToNode(
 *   nodes,
 *   newNodeId,
 *   setCollapsed,
 *   treeRef
 * );
 */
export async function autoExpandAndScrollToNode(
	nodes: NodeInterface[],
	targetNodeId: string,
	setCollapsed: (nodeId: string, collapsed: boolean) => Promise<boolean>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	treeRef: React.RefObject<any>,
): Promise<void> {
	try {
		// 边界情况：节点列表为空
		if (nodes.length === 0) {
			console.warn("[FileTreeNavigation] No nodes available");
			return;
		}

		// 边界情况：目标节点不存在
		const targetNode = nodes.find((n) => n.id === targetNodeId);
		if (!targetNode) {
			console.warn("[FileTreeNavigation] Target node not found:", targetNodeId);
			return;
		}

		// 1. 计算祖先路径
		const ancestorPath = calculateAncestorPath(nodes, targetNodeId);

		// 2. 展开所有祖先节点
		// 边界情况：根节点创建（ancestorPath 为空数组，无需展开）
		if (ancestorPath.length > 0) {
			await expandAncestors(ancestorPath, setCollapsed);
		}

		// 3. 等待一小段时间让 DOM 更新
		// 这确保了展开操作完成后再滚动
		await new Promise((resolve) => setTimeout(resolve, 100));

		// 4. 滚动到目标节点
		// 边界情况：节点不在可见区域（react-arborist 自动处理）
		scrollToNode(treeRef, targetNodeId);
	} catch (error) {
		console.error(
			"[FileTreeNavigation] Failed to auto-expand and scroll:",
			error,
		);
		// 不抛出错误，避免影响文件创建流程
	}
}
