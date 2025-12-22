/**
 * @file node.db.fn.ts
 * @description Node 数据库操作函数
 *
 * 功能说明：
 * - 提供节点的 CRUD 操作
 * - 提供树操作（获取子节点、后代节点等）
 * - 使用 TaskEither 返回类型进行错误处理
 * - 所有操作都有日志记录
 *
 * @requirements 3.1, 3.2, 3.3
 */

import dayjs from "dayjs";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, dbError, notFoundError } from "@/lib/error.types";
import logger from "@/log";
import { NodeBuilder } from "@/types/node/node.builder";
import type {
	NodeInterface,
	NodeType,
	NodeUpdateInput,
} from "@/types/node/node.interface";
import { database } from "./database";

// ============================================================================
// 基础 CRUD 操作
// ============================================================================

/**
 * 添加新节点
 *
 * @param workspace - 工作区 ID
 * @param title - 节点标题
 * @param options - 可选的节点属性
 * @returns TaskEither<AppError, NodeInterface>
 */
export const addNode = (
	workspace: string,
	title: string,
	options: {
		parent?: string | null;
		type?: NodeType;
		order?: number;
		collapsed?: boolean;
		tags?: string[];
	} = {},
): TE.TaskEither<AppError, NodeInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 添加节点:", { workspace, title, type: options.type });

			const builder = new NodeBuilder().workspace(workspace).title(title);

			if (options.parent !== undefined) {
				builder.parent(options.parent);
			}
			if (options.type) {
				builder.type(options.type);
			}
			if (options.order !== undefined) {
				builder.order(options.order);
			}
			if (options.collapsed !== undefined) {
				builder.collapsed(options.collapsed);
			}
			if (options.tags) {
				builder.tags(options.tags);
			}

			const node = builder.build();
			await database.nodes.add(node);

			logger.success("[DB] 节点添加成功:", node.id);
			return node;
		},
		(error): AppError => {
			logger.error("[DB] 添加节点失败:", error);
			return dbError(`添加节点失败: ${error}`);
		},
	);

/**
 * 更新节点
 *
 * @param id - 节点 ID
 * @param updates - 更新的字段
 * @returns TaskEither<AppError, number> - 更新的记录数（0 或 1）
 */
export const updateNode = (
	id: string,
	updates: NodeUpdateInput,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 更新节点:", { id, updates });

			const count = await database.nodes.update(id, {
				...updates,
				lastEdit: dayjs().toISOString(),
			});

			if (count > 0) {
				logger.success("[DB] 节点更新成功:", id);
			} else {
				logger.warn("[DB] 节点未找到:", id);
			}

			return count;
		},
		(error): AppError => {
			logger.error("[DB] 更新节点失败:", error);
			return dbError(`更新节点失败: ${error}`);
		},
	);

/**
 * 删除节点（不删除子节点）
 *
 * @param id - 节点 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteNode = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除节点:", id);
			await database.nodes.delete(id);
			logger.success("[DB] 节点删除成功:", id);
		},
		(error): AppError => {
			logger.error("[DB] 删除节点失败:", error);
			return dbError(`删除节点失败: ${error}`);
		},
	);

/**
 * 删除节点及其所有后代节点
 * 同时删除关联的内容记录
 *
 * @param id - 节点 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteNodeWithChildren = (
	id: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		getDescendants(id),
		TE.chain((descendants) =>
			TE.tryCatch(
				async () => {
					const allIds = [id, ...descendants.map((n) => n.id)];
					logger.info("[DB] 删除节点及子节点:", { id, count: allIds.length });

					await database.transaction(
						"rw",
						[database.nodes, database.contents],
						async () => {
							// 删除关联的内容
							await database.contents.where("nodeId").anyOf(allIds).delete();
							// 删除节点
							await database.nodes.bulkDelete(allIds);
						},
					);

					logger.success("[DB] 节点及子节点删除成功:", {
						id,
						count: allIds.length,
					});
				},
				(error): AppError => {
					logger.error("[DB] 删除节点及子节点失败:", error);
					return dbError(`删除节点及子节点失败: ${error}`);
				},
			),
		),
	);

// ============================================================================
// 查询操作
// ============================================================================

/**
 * 根据 ID 获取节点
 *
 * @param id - 节点 ID
 * @returns TaskEither<AppError, NodeInterface | undefined>
 */
export const getNodeById = (
	id: string,
): TE.TaskEither<AppError, NodeInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取节点:", id);
			return database.nodes.get(id);
		},
		(error): AppError => {
			logger.error("[DB] 获取节点失败:", error);
			return dbError(`获取节点失败: ${error}`);
		},
	);

/**
 * 根据 ID 获取节点（必须存在）
 *
 * @param id - 节点 ID
 * @returns TaskEither<AppError, NodeInterface>
 */
export const getNodeByIdOrFail = (
	id: string,
): TE.TaskEither<AppError, NodeInterface> =>
	pipe(
		getNodeById(id),
		TE.chain((node) =>
			node ? TE.right(node) : TE.left(notFoundError(`节点不存在: ${id}`, id)),
		),
	);

/**
 * 获取所有节点
 *
 * @returns TaskEither<AppError, NodeInterface[]>
 */
export const getAllNodes = (): TE.TaskEither<AppError, NodeInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取所有节点");
			return database.nodes.toArray();
		},
		(error): AppError => {
			logger.error("[DB] 获取所有节点失败:", error);
			return dbError(`获取所有节点失败: ${error}`);
		},
	);

/**
 * 获取工作区的所有节点
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, NodeInterface[]>
 */
export const getNodesByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取工作区节点:", workspaceId);
			return database.nodes.where("workspace").equals(workspaceId).toArray();
		},
		(error): AppError => {
			logger.error("[DB] 获取工作区节点失败:", error);
			return dbError(`获取工作区节点失败: ${error}`);
		},
	);

/**
 * 获取父节点的子节点
 *
 * @param parentId - 父节点 ID（null 表示根节点）
 * @param workspaceId - 可选的工作区 ID 过滤
 * @returns TaskEither<AppError, NodeInterface[]>
 */
export const getNodesByParent = (
	parentId: string | null,
	workspaceId?: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取子节点:", { parentId, workspaceId });

			// 如果 parentId 为 null，需要特殊处理
			if (parentId === null) {
				const allNodes = workspaceId
					? await database.nodes
							.where("workspace")
							.equals(workspaceId)
							.toArray()
					: await database.nodes.toArray();
				return allNodes
					.filter((n) => n.parent === null)
					.sort((a, b) => a.order - b.order);
			}

			const nodes = await database.nodes
				.where("parent")
				.equals(parentId)
				.toArray();
			const filtered = workspaceId
				? nodes.filter((n) => n.workspace === workspaceId)
				: nodes;

			return filtered.sort((a, b) => a.order - b.order);
		},
		(error): AppError => {
			logger.error("[DB] 获取子节点失败:", error);
			return dbError(`获取子节点失败: ${error}`);
		},
	);

/**
 * 获取工作区的根节点
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, NodeInterface[]>
 */
export const getRootNodes = (
	workspaceId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取根节点:", workspaceId);

			const nodes = await database.nodes
				.where("workspace")
				.equals(workspaceId)
				.toArray();

			return nodes
				.filter((n) => n.parent === null)
				.sort((a, b) => a.order - b.order);
		},
		(error): AppError => {
			logger.error("[DB] 获取根节点失败:", error);
			return dbError(`获取根节点失败: ${error}`);
		},
	);

/**
 * 获取节点的所有后代节点（递归）
 *
 * @param nodeId - 父节点 ID
 * @returns TaskEither<AppError, NodeInterface[]>
 */
export const getDescendants = (
	nodeId: string,
): TE.TaskEither<AppError, NodeInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取后代节点:", nodeId);

			const result: NodeInterface[] = [];
			const queue = [nodeId];

			while (queue.length > 0) {
				const currentId = queue.shift()!;
				const children = await database.nodes
					.where("parent")
					.equals(currentId)
					.toArray();

				for (const child of children) {
					result.push(child);
					queue.push(child.id);
				}
			}

			return result;
		},
		(error): AppError => {
			logger.error("[DB] 获取后代节点失败:", error);
			return dbError(`获取后代节点失败: ${error}`);
		},
	);

/**
 * 根据类型获取工作区的节点
 *
 * @param workspaceId - 工作区 ID
 * @param type - 节点类型
 * @returns TaskEither<AppError, NodeInterface[]>
 */
export const getNodesByType = (
	workspaceId: string,
	type: NodeType,
): TE.TaskEither<AppError, NodeInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取指定类型节点:", { workspaceId, type });

			return database.nodes
				.where("workspace")
				.equals(workspaceId)
				.and((n) => n.type === type)
				.toArray();
		},
		(error): AppError => {
			logger.error("[DB] 获取指定类型节点失败:", error);
			return dbError(`获取指定类型节点失败: ${error}`);
		},
	);

// ============================================================================
// 树操作
// ============================================================================

/**
 * 移动节点到新的父节点
 *
 * @param nodeId - 要移动的节点 ID
 * @param newParentId - 新的父节点 ID（null 表示移动到根级）
 * @param newOrder - 可选的新排序位置
 * @returns TaskEither<AppError, void>
 */
export const moveNode = (
	nodeId: string,
	newParentId: string | null,
	newOrder?: number,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateNode(nodeId, {
			parent: newParentId,
			...(newOrder !== undefined ? { order: newOrder } : {}),
		}),
		TE.tap(() => {
			logger.success("[DB] 节点移动成功:", { nodeId, newParentId, newOrder });
			return TE.right(undefined);
		}),
		TE.map(() => undefined),
	);

/**
 * 重新排序节点
 *
 * @param nodeIds - 按新顺序排列的节点 ID 数组
 * @returns TaskEither<AppError, void>
 */
export const reorderNodes = (
	nodeIds: string[],
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 重新排序节点:", { count: nodeIds.length });

			await database.transaction("rw", database.nodes, async () => {
				const now = dayjs().toISOString();
				for (let i = 0; i < nodeIds.length; i++) {
					await database.nodes.update(nodeIds[i], {
						order: i,
						lastEdit: now,
					});
				}
			});

			logger.success("[DB] 节点重新排序成功");
		},
		(error): AppError => {
			logger.error("[DB] 重新排序节点失败:", error);
			return dbError(`重新排序节点失败: ${error}`);
		},
	);

/**
 * 获取下一个可用的排序号
 *
 * @param parentId - 父节点 ID（null 表示根级）
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, number>
 */
export const getNextOrder = (
	parentId: string | null,
	workspaceId: string,
): TE.TaskEither<AppError, number> =>
	pipe(
		getNodesByParent(parentId, workspaceId),
		TE.map((siblings) => {
			if (siblings.length === 0) return 0;
			return Math.max(...siblings.map((n) => n.order)) + 1;
		}),
	);

// ============================================================================
// 辅助操作
// ============================================================================

/**
 * 检查节点是否存在
 *
 * @param id - 节点 ID
 * @returns TaskEither<AppError, boolean>
 */
export const nodeExists = (id: string): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.nodes.where("id").equals(id).count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查节点存在失败:", error);
			return dbError(`检查节点存在失败: ${error}`);
		},
	);

/**
 * 统计工作区的节点数量
 *
 * @param workspaceId - 工作区 ID
 * @returns TaskEither<AppError, number>
 */
export const countNodesByWorkspace = (
	workspaceId: string,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.nodes.where("workspace").equals(workspaceId).count();
		},
		(error): AppError => {
			logger.error("[DB] 统计节点数量失败:", error);
			return dbError(`统计节点数量失败: ${error}`);
		},
	);

/**
 * 更新节点标题
 *
 * @param id - 节点 ID
 * @param title - 新标题
 * @returns TaskEither<AppError, void>
 */
export const updateNodeTitle = (
	id: string,
	title: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateNode(id, { title }),
		TE.tap(() => {
			logger.success("[DB] 节点标题更新成功:", { id, title });
			return TE.right(undefined);
		}),
		TE.map(() => undefined),
	);

/**
 * 设置节点折叠状态
 *
 * @param id - 节点 ID
 * @param collapsed - 是否折叠
 * @returns TaskEither<AppError, void>
 */
export const setNodeCollapsed = (
	id: string,
	collapsed: boolean,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateNode(id, { collapsed }),
		TE.tap(() => {
			logger.debug("[DB] 节点折叠状态更新:", { id, collapsed });
			return TE.right(undefined);
		}),
		TE.map(() => undefined),
	);

/**
 * 保存节点（直接保存完整节点对象）
 *
 * @param node - 节点对象
 * @returns TaskEither<AppError, NodeInterface>
 */
export const saveNode = (
	node: NodeInterface,
): TE.TaskEither<AppError, NodeInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 保存节点:", node.id);
			await database.nodes.put(node);
			logger.success("[DB] 节点保存成功:", node.id);
			return node;
		},
		(error): AppError => {
			logger.error("[DB] 保存节点失败:", error);
			return dbError(`保存节点失败: ${error}`);
		},
	);
