/**
 * @file node.expand.fn.ts
 * @description 节点展开状态计算纯函数
 *
 * 功能说明：
 * - 计算展开指定节点路径所需的文件夹展开状态
 * - 支持关闭其他文件夹，只展开目标路径
 *
 * @requirements 文件树展开状态管理
 */

import { pipe } from "fp-ts/function";
import type { NodeInterface } from "@/types/node";
import { getNodePath } from "./node.tree.fn";

// ==============================
// Types
// ==============================

/**
 * 文件夹展开状态映射
 * key: 文件夹节点 ID
 * value: 是否展开
 */
export type ExpandedFoldersMap = Record<string, boolean>;

// ==============================
// Pure Functions
// ==============================

/**
 * 计算展开指定节点路径所需的文件夹展开状态
 *
 * 关闭所有其他文件夹，只展开从根到目标节点的路径上的所有文件夹。
 *
 * @param nodes - 所有节点的扁平数组
 * @param targetNodeId - 目标节点 ID
 * @returns 新的文件夹展开状态映射
 *
 * @example
 * ```typescript
 * const nodes = [...];
 * const newExpandedState = calculateExpandedFoldersForNode(nodes, "target-node-id");
 * // 返回 { "folder-1": true, "folder-2": true, ... }
 * // 只有目标节点路径上的文件夹为 true
 * ```
 */
export const calculateExpandedFoldersForNode = (
	nodes: NodeInterface[],
	targetNodeId: string,
): ExpandedFoldersMap => {
	// 获取从根到目标节点的路径
	const path = getNodePath(nodes, targetNodeId);

	// 只展开路径上的文件夹（排除目标节点本身，因为它可能不是文件夹）
	return pipe(
		path,
		(pathNodes) => pathNodes.filter((node) => node.type === "folder"),
		(folders) =>
			folders.reduce<ExpandedFoldersMap>((acc, folder) => {
				acc[folder.id] = true;
				return acc;
			}, {}),
	);
};

/**
 * 合并展开状态，保留现有展开的文件夹，同时展开新路径
 *
 * @param currentExpanded - 当前展开状态
 * @param nodes - 所有节点的扁平数组
 * @param targetNodeId - 目标节点 ID
 * @returns 合并后的文件夹展开状态映射
 */
export const mergeExpandedFoldersForNode = (
	currentExpanded: ExpandedFoldersMap,
	nodes: NodeInterface[],
	targetNodeId: string,
): ExpandedFoldersMap => {
	const pathExpanded = calculateExpandedFoldersForNode(nodes, targetNodeId);

	return {
		...currentExpanded,
		...pathExpanded,
	};
};
