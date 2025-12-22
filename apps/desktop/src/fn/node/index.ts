/**
 * @file fn/node/index.ts
 * @description Node 纯函数模块统一导出
 *
 * 导出所有节点相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 *
 * @requirements 2.1, 1.4
 */

// Tree 操作函数
export {
	buildTree,
	calculateReorderAfterInsert,
	filterByTag,
	filterByType,
	getChildNodes,
	getDescendants,
	getNextOrder,
	getNodePath,
	getRootNodes,
	type TreeNode,
	wouldCreateCycle,
} from "./node.tree.fn";
