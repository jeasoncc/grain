/**
 * @file fn/node/index.ts
 * @description Node 纯函数模块统一导出
 *
 * 导出所有节点相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 *
 * @requirements 2.1, 1.4
 */

// 祖先路径函数
export {
	calculateAncestorPath,
	calculateExpandedAncestors,
} from "./ancestor-path.pipe"
// 文件夹路径函数
export {
	type FolderLookupResult,
	type FolderPathSegment,
	findFolderByParentAndTitle,
	resolveFolderPath,
} from "./folder-path.pipe"
// 展开状态计算函数
export {
	calculateExpandedFoldersForNode,
	type ExpandedFoldersMap,
	mergeExpandedFoldersForNode,
} from "./node.expand.fn"
// 展开状态初始化函数
export { initializeExpandedFolders } from "./expand-init.pipe"
// 树扁平化函数
export { countVisibleNodes, flattenTree } from "./flatten-tree.pipe"
// 批量展开/折叠函数
export {
	calculateCollapseAllFolders,
	calculateExpandAllFolders,
	hasFolders,
} from "./node.expand-all.pipe"
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
} from "./node.tree.fn"
