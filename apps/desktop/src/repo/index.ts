/**
 * Repository 层 - 数据访问层
 *
 * 纯函数 + TaskEither 封装，返回前端类型。
 * 通过 Codec 层进行类型转换，确保前后端类型解耦。
 *
 * 架构位置：
 * ```
 * Actions / Query Hooks
 *       │
 *       ▼
 * Repository Layer ← 你在这里
 *       │
 *       ▼
 * Codec Layer (类型转换)
 *       │
 *       ▼
 * rust-api.fn.ts
 * ```
 *
 * 使用示例：
 * ```typescript
 * import * as nodeRepo from '@/repo';
 *
 * // 获取工作区节点
 * const nodes = await nodeRepo.getNodesByWorkspace(workspaceId)();
 *
 * // 创建节点
 * const result = await nodeRepo.createNode({ workspace, title, type })();
 * ```
 */

// Content Repository
export * as contentRepo from "./content.repo.fn";
export {
	createContent,
	getContentByNodeId,
	getContentVersion,
	saveContent,
	updateContentByNodeId,
} from "./content.repo.fn";
// Node Repository
export * as nodeRepo from "./node.repo.fn";

// 也导出单独的函数，方便直接使用
export {
	createNode,
	deleteNode,
	deleteNodesBatch,
	duplicateNode,
	getChildNodes,
	getDescendants,
	getNextSortOrder,
	getNode,
	getNodesByParent,
	getNodesByType,
	getNodesByWorkspace,
	getRootNodes,
	moveNode,
	reorderNodes,
	updateNode,
} from "./node.repo.fn";
// Workspace Repository
export * as workspaceRepo from "./workspace.repo.fn";
export {
	createWorkspace,
	deleteWorkspace,
	getWorkspace,
	getWorkspaces,
	updateWorkspace,
} from "./workspace.repo.fn";
