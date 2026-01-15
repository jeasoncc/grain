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

import { pipe } from "fp-ts/function"
import * as N from "fp-ts/number"
import * as O from "fp-ts/Option"
import { contramap } from "fp-ts/Ord"
import * as RA from "fp-ts/ReadonlyArray"
import type { NodeInterface, NodeType } from "@/types/node"

// ============================================================================
// Ord Instances for Sorting
// ============================================================================

/**
 * 按 order 字段排序的 Ord 实例
 */
const byOrder = pipe(
	N.Ord,
	contramap((n: NodeInterface) => n.order),
)

// ============================================================================
// Types for UI Consumption
// ============================================================================

/**
 * TreeNode 接口用于 UI 渲染
 * 表示层级树结构中的节点
 */
export interface TreeNode {
	readonly id: string
	readonly title: string
	readonly type: NodeType
	readonly collapsed: boolean
	readonly children: ReadonlyArray<TreeNode>
	readonly depth: number
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
	nodes: ReadonlyArray<NodeInterface>,
	parentId: string | null = null,
	depth = 0,
): ReadonlyArray<TreeNode> =>
	pipe(
		nodes,
		RA.filter((n) => n.parent === parentId),
		RA.sort(byOrder),
		RA.map((node) => ({
			children: node.type === "folder" ? buildTree(nodes, node.id, depth + 1) : [],
			collapsed: node.collapsed ?? true,
			depth,
			id: node.id,
			title: node.title,
			type: node.type,
		})),
	)

/**
 * 获取从根节点到指定节点的路径（用于面包屑导航）
 *
 * @param nodes - 所有节点的扁平数组
 * @param nodeId - 目标节点 ID
 * @returns 从根节点到目标节点的 NodeInterface 对象数组
 */
export const getNodePath = (
	nodes: ReadonlyArray<NodeInterface>,
	nodeId: string,
): ReadonlyArray<NodeInterface> => {
	// Use functional approach to build path
	const buildPath = (
		currentId: string | null,
		acc: ReadonlyArray<NodeInterface>,
	): ReadonlyArray<NodeInterface> => {
		if (!currentId) return acc

		const node = pipe(
			nodes,
			RA.findFirst((n) => n.id === currentId),
			O.toNullable,
		)

		if (!node) return acc

		return buildPath(node.parent, [node, ...acc])
	}

	return buildPath(nodeId, [])
}

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
	nodes: ReadonlyArray<NodeInterface>,
	nodeId: string,
	newParentId: string | null,
): boolean => {
	if (newParentId === null) return false
	if (nodeId === newParentId) return true

	// Use functional approach to check cycle
	const checkCycle = (currentId: string | null): boolean => {
		if (!currentId) return false
		if (currentId === nodeId) return true

		const parent = pipe(
			nodes,
			RA.findFirst((n) => n.id === currentId),
			O.map((n) => n.parent),
			O.toNullable,
		)

		return checkCycle(parent)
	}

	return checkCycle(newParentId)
}

// ============================================================================
// Node Filtering and Sorting
// ============================================================================

/**
 * 从扁平列表获取根节点
 *
 * @param nodes - 节点的扁平数组
 * @returns 按 order 排序的根节点数组（parent === null）
 */
export const getRootNodes = (nodes: ReadonlyArray<NodeInterface>): ReadonlyArray<NodeInterface> =>
	pipe(
		nodes,
		RA.filter((n) => n.parent === null),
		RA.sort(byOrder),
	)

/**
 * 获取父节点的子节点
 *
 * @param nodes - 节点的扁平数组
 * @param parentId - 父节点 ID
 * @returns 按 order 排序的子节点数组
 */
export const getChildNodes = (
	nodes: ReadonlyArray<NodeInterface>,
	parentId: string | null,
): ReadonlyArray<NodeInterface> =>
	pipe(
		nodes,
		RA.filter((n) => n.parent === parentId),
		RA.sort(byOrder),
	)

/**
 * 获取节点的所有后代（递归）
 *
 * @param nodes - 所有节点的扁平数组
 * @param nodeId - 父节点 ID
 * @returns 所有后代节点的数组
 */
export const getDescendants = (
	nodes: ReadonlyArray<NodeInterface>,
	nodeId: string,
): ReadonlyArray<NodeInterface> => {
	// Use functional recursive approach instead of imperative queue
	const collectDescendants = (currentId: string): ReadonlyArray<NodeInterface> => {
		const children = pipe(
			nodes,
			RA.filter((n) => n.parent === currentId),
		)

		return pipe(
			children,
			RA.chain((child: NodeInterface) => [child, ...collectDescendants(child.id)]),
		)
	}

	return collectDescendants(nodeId)
}

/**
 * 按类型过滤节点
 *
 * @param nodes - 节点的扁平数组
 * @param type - 要过滤的节点类型
 * @returns 匹配类型的节点数组
 */
export const filterByType = (
	nodes: ReadonlyArray<NodeInterface>,
	type: NodeType,
): ReadonlyArray<NodeInterface> =>
	pipe(
		nodes,
		RA.filter((n) => n.type === type),
	)

/**
 * 按标签过滤节点
 *
 * @param nodes - 节点的扁平数组
 * @param tag - 要过滤的标签
 * @returns 包含该标签的节点数组
 */
export const filterByTag = (
	nodes: ReadonlyArray<NodeInterface>,
	tag: string,
): ReadonlyArray<NodeInterface> =>
	pipe(
		nodes,
		RA.filter((n) => n.tags?.includes(tag) ?? false),
	)

// ============================================================================
// Order Calculation
// ============================================================================

/**
 * 计算新兄弟节点的下一个 order 值
 *
 * @param siblings - 兄弟节点数组
 * @returns 下一个 order 值
 */
export const getNextOrder = (siblings: ReadonlyArray<NodeInterface>): number => {
	if (siblings.length === 0) return 0
	return pipe(
		siblings,
		RA.map((n) => n.order),
		(orders) => Math.max(...orders) + 1,
	)
}

/**
 * 计算在指定索引插入节点后的新 order 值
 *
 * @param siblings - 当前兄弟节点（按 order 排序）
 * @param insertIndex - 插入位置索引
 * @returns nodeId 到新 order 的映射
 */
export const calculateReorderAfterInsert = (
	siblings: ReadonlyArray<NodeInterface>,
	insertIndex: number,
): ReadonlyMap<string, number> => {
	const sorted = pipe(siblings, RA.sort(byOrder))

	// Use functional approach to build the map
	const entries = sorted
		.map((node: NodeInterface, i: number) => {
			const newOrder = i >= insertIndex ? i + 1 : i
			return node.order !== newOrder ? ([node.id, newOrder] as const) : null
		})
		.filter((entry): entry is readonly [string, number] => entry !== null)

	return new Map(entries)
}
