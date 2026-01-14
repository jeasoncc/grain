/**
 * @file fn/node/node.tree.fn.ts
 * @description 节点树操作纯函数
 *
 * 包含树构建、路径导航、循环检测等纯函数。
 * 所有函数无副作用，相同输入产生相同输出。
 *
 * 使用 fp-ts pipe 进行函数组合。
 *
 * @requirements 2.1, 1.4
 */

import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import * as N from "fp-ts/number";
import * as O from "fp-ts/Option";
import { contramap } from "fp-ts/Ord";
import type { NodeInterface, NodeType } from "@/types/node";

// ============================================================================
// Ord Instances for Sorting
// ============================================================================

/**
 * 按 order 字段排序的 Ord 实例
 */
const byOrder = pipe(
	N.Ord,
	contramap((n: NodeInterface) => n.order),
);

// ============================================================================
// Types for UI Consumption
// ============================================================================

/**
 * TreeNode 接口用于 UI 渲染
 * 表示层级树结构中的节点
 */
export interface TreeNode {
	readonly id: string;
	readonly title: string;
	readonly type: NodeType;
	readonly collapsed: boolean;
	readonly children: TreeNode[];
	readonly depth: number;
}

// ============================================================================
// Tree Building Functions
// ============================================================================

/**
 * 从扁平节点列表构建层级树结构
 * 基于父节点引用递归构建树
 *
 * @param nodes - NodeInterface 对象的扁平数组
 * @param parentId - 要过滤的父节点 ID（null 表示根节点）
 * @param depth - 树中的当前深度级别
 * @returns 表示树结构的 TreeNode 对象数组
 */
export const buildTree = (
	nodes: NodeInterface[],
	parentId: string | null = null,
	depth = 0,
): TreeNode[] =>
	pipe(
		nodes,
		A.filter((n) => n.parent === parentId),
		A.sort(byOrder),
		A.map((node) => ({
			id: node.id,
			title: node.title,
			type: node.type,
			collapsed: node.collapsed ?? true,
			depth,
			children:
				node.type === "folder" ? buildTree(nodes, node.id, depth + 1) : [],
		})),
	);

/**
 * 获取从根节点到指定节点的路径（用于面包屑导航）
 *
 * @param nodes - 所有节点的扁平数组
 * @param nodeId - 目标节点 ID
 * @returns 从根节点到目标节点的 NodeInterface 对象数组
 */
export const getNodePath = (
	nodes: readonly NodeInterface[],
	nodeId: string,
): readonly NodeInterface[] => {
	const path: NodeInterface[] = [];
	let currentId: string | null = nodeId;

	while (currentId) {
		const node = pipe(
			nodes,
			A.findFirst((n) => n.id === currentId),
			O.toNullable,
		);
		if (!node) break;
		path.unshift(node);
		currentId = node.parent;
	}

	return path;
};

/**
 * 检查移动节点是否会创建循环引用
 * 节点不能移动到其后代节点下
 *
 * @param nodes - 所有节点的扁平数组
 * @param nodeId - 被移动的节点
 * @param newParentId - 提议的新父节点 ID
 * @returns 如果移动会创建循环则返回 true
 */
export const wouldCreateCycle = (
	nodes: NodeInterface[],
	nodeId: string,
	newParentId: string | null,
): boolean => {
	if (newParentId === null) return false;
	if (nodeId === newParentId) return true;

	// 从 newParentId 向上遍历检查是否遇到 nodeId
	let currentId: string | null = newParentId;
	while (currentId) {
		if (currentId === nodeId) return true;
		const parent = pipe(
			nodes,
			A.findFirst((n) => n.id === currentId),
			O.map((n) => n.parent),
			O.toNullable,
		);
		currentId = parent;
	}

	return false;
};

// ============================================================================
// Node Filtering and Sorting
// ============================================================================

/**
 * 从扁平列表获取根节点
 *
 * @param nodes - 节点的扁平数组
 * @returns 按 order 排序的根节点数组（parent === null）
 */
export const getRootNodes = (nodes: NodeInterface[]): NodeInterface[] =>
	pipe(
		nodes,
		A.filter((n) => n.parent === null),
		A.sort(byOrder),
	);

/**
 * 获取父节点的子节点
 *
 * @param nodes - 节点的扁平数组
 * @param parentId - 父节点 ID
 * @returns 按 order 排序的子节点数组
 */
export const getChildNodes = (
	nodes: NodeInterface[],
	parentId: string | null,
): NodeInterface[] =>
	pipe(
		nodes,
		A.filter((n) => n.parent === parentId),
		A.sort(byOrder),
	);

/**
 * 获取节点的所有后代（递归）
 *
 * @param nodes - 所有节点的扁平数组
 * @param nodeId - 父节点 ID
 * @returns 所有后代节点的数组
 */
export const getDescendants = (
	nodes: NodeInterface[],
	nodeId: string,
): NodeInterface[] => {
	const result: NodeInterface[] = [];
	const queue = [nodeId];

	while (queue.length > 0) {
		const currentId = queue.shift();
		if (!currentId) continue;

		const children = pipe(
			nodes,
			A.filter((n) => n.parent === currentId),
		);

		for (const child of children) {
			result.push(child);
			queue.push(child.id);
		}
	}

	return result;
};

/**
 * 按类型过滤节点
 *
 * @param nodes - 节点的扁平数组
 * @param type - 要过滤的节点类型
 * @returns 匹配类型的节点数组
 */
export const filterByType = (
	nodes: NodeInterface[],
	type: NodeType,
): NodeInterface[] =>
	pipe(
		nodes,
		A.filter((n) => n.type === type),
	);

/**
 * 按标签过滤节点
 *
 * @param nodes - 节点的扁平数组
 * @param tag - 要过滤的标签
 * @returns 包含该标签的节点数组
 */
export const filterByTag = (
	nodes: NodeInterface[],
	tag: string,
): NodeInterface[] =>
	pipe(
		nodes,
		A.filter((n) => n.tags?.includes(tag) ?? false),
	);

// ============================================================================
// Order Calculation
// ============================================================================

/**
 * 计算新兄弟节点的下一个 order 值
 *
 * @param siblings - 兄弟节点数组
 * @returns 下一个 order 值
 */
export const getNextOrder = (siblings: NodeInterface[]): number => {
	if (siblings.length === 0) return 0;
	return pipe(
		siblings,
		A.map((n) => n.order),
		(orders) => Math.max(...orders) + 1,
	);
};

/**
 * 计算在指定索引插入节点后的新 order 值
 *
 * @param siblings - 当前兄弟节点（按 order 排序）
 * @param insertIndex - 插入位置索引
 * @returns nodeId 到新 order 的映射
 */
export const calculateReorderAfterInsert = (
	siblings: NodeInterface[],
	insertIndex: number,
): Map<string, number> => {
	const result = new Map<string, number>();
	const sorted = pipe(siblings, A.sort(byOrder));

	for (let i = 0; i < sorted.length; i++) {
		const newOrder = i >= insertIndex ? i + 1 : i;
		if (sorted[i].order !== newOrder) {
			result.set(sorted[i].id, newOrder);
		}
	}

	return result;
};
