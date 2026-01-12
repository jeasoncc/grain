/**
 * @file dexie-to-sqlite.migration.fn.ts
 * @description Dexie to SQLite 数据迁移工具
 *
 * 功能说明：
 * - 检测 Dexie 数据是否存在
 * - 读取 Dexie 数据
 * - 写入 SQLite（通过 repo 层）
 * - 迁移状态标记
 * - 回滚逻辑
 *
 * 迁移策略：
 * - 一次性迁移：检测到 Dexie 数据后，迁移到 SQLite
 * - 迁移完成后标记状态，避免重复迁移
 * - 支持回滚：迁移失败时可以回滚
 *
 * 注意：由于 Rust 后端自动生成 ID，迁移后的数据会有新的 ID
 * 迁移工具会维护 ID 映射关系，确保引用关系正确
 *
 * @requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import {
	createContent,
	createNode,
	createUser,
	createWorkspace,
} from "@/io/api";
import { info, debug, warn, error, success } from "@/io/log/logger.api";
import type { ContentInterface } from "@/types/content";
import type { NodeInterface } from "@/types/node";
import type { UserInterface } from "@/types/user";
import type { WorkspaceInterface } from "@/types/workspace";
import { type AppError, dbError } from "@/types/error";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 迁移状态
 */
export type MigrationStatus =
	| "not_started"
	| "in_progress"
	| "completed"
	| "failed"
	| "rolled_back";

/**
 * ID 映射表
 * 用于跟踪旧 ID 到新 ID 的映射关系
 */
export interface IdMapping {
	workspaces: Map<string, string>;
	nodes: Map<string, string>;
	users: Map<string, string>;
}

/**
 * 迁移结果
 */
export interface MigrationResult {
	status: MigrationStatus;
	migratedCounts: {
		workspaces: number;
		nodes: number;
		contents: number;
		users: number;
	};
	errors: string[];
	startedAt: string;
	completedAt?: string;
	idMapping?: IdMapping;
}

/**
 * Dexie 数据快照
 */
export interface DexieDataSnapshot {
	workspaces: WorkspaceInterface[];
	nodes: NodeInterface[];
	contents: ContentInterface[];
	users: UserInterface[];
}

// ============================================================================
// 迁移状态管理
// ============================================================================

const MIGRATION_STATUS_KEY = "grain_dexie_to_sqlite_migration_status";

/**
 * 获取迁移状态
 */
export const getMigrationStatus = (): MigrationStatus => {
	try {
		const status = localStorage.getItem(MIGRATION_STATUS_KEY);
		if (status) {
			return status as MigrationStatus;
		}
		return "not_started";
	} catch {
		return "not_started";
	}
};

/**
 * 设置迁移状态
 */
export const setMigrationStatus = (status: MigrationStatus): void => {
	try {
		localStorage.setItem(MIGRATION_STATUS_KEY, status);
	} catch (error) {
		error("[Migration] 设置迁移状态失败", { error }, "dexie-to-sqlite.migration.fn");
	}
};

/**
 * 清除迁移状态
 */
export const clearMigrationStatus = (): void => {
	try {
		localStorage.removeItem(MIGRATION_STATUS_KEY);
	} catch (error) {
		error("[Migration] 清除迁移状态失败", { error }, "dexie-to-sqlite.migration.fn");
	}
};

// ============================================================================
// Dexie 数据检测
// ============================================================================

/**
 * 检测 Dexie 数据是否存在
 */
export const hasDexieData = (): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			// 动态导入 legacy database
			const { legacyDatabase } = await import("@/io/db/legacy-database");

			const [workspaceCount, nodeCount, userCount] = await Promise.all([
				legacyDatabase.workspaces.count(),
				legacyDatabase.nodes.count(),
				legacyDatabase.users.count(),
			]);

			const hasData = workspaceCount > 0 || nodeCount > 0 || userCount > 0;
			info("[Migration] Dexie 数据检测", {
				workspaces: workspaceCount,
				nodes: nodeCount,
				users: userCount,
				hasData,
			}, "dexie-to-sqlite.migration.fn");

			return hasData;
		},
		(error): AppError => {
			error("[Migration] 检测 Dexie 数据失败", { error }, "dexie-to-sqlite.migration.fn");
			return dbError(`检测 Dexie 数据失败: ${error}`);
		},
	);

/**
 * 检查是否需要迁移
 */
export const needsMigration = (): TE.TaskEither<AppError, boolean> =>
	pipe(
		TE.Do,
		TE.bind("status", () => TE.right(getMigrationStatus())),
		TE.bind("hasData", () => hasDexieData()),
		TE.map(({ status, hasData }) => {
			// 只有在未开始且有数据时才需要迁移
			const needs = status === "not_started" && hasData;
			info("[Migration] 是否需要迁移", { status, hasData, needs }, "dexie-to-sqlite.migration.fn");
			return needs;
		}),
	);

// ============================================================================
// 数据读取
// ============================================================================

/**
 * 读取 Dexie 数据快照
 */
export const readDexieData = (): TE.TaskEither<AppError, DexieDataSnapshot> =>
	TE.tryCatch(
		async () => {
			info("[Migration] 读取 Dexie 数据...");

			const { legacyDatabase } = await import("@/io/db/legacy-database");

			const [workspaces, nodes, contents, users] = await Promise.all([
				legacyDatabase.workspaces.toArray(),
				legacyDatabase.nodes.toArray(),
				legacyDatabase.contents.toArray(),
				legacyDatabase.users.toArray(),
			]);

			info("[Migration] Dexie 数据读取完成", {
				workspaces: workspaces.length,
				nodes: nodes.length,
				contents: contents.length,
				users: users.length,
			}, "dexie-to-sqlite.migration.fn");

			return {
				workspaces,
				nodes,
				contents,
				users,
			};
		},
		(error): AppError => {
			error("[Migration] 读取 Dexie 数据失败", { error }, "dexie-to-sqlite.migration.fn");
			return dbError(`读取 Dexie 数据失败: ${error}`);
		},
	);

// ============================================================================
// 数据写入
// ============================================================================

/**
 * 迁移用户数据
 */
const migrateUsers = (
	users: UserInterface[],
): TE.TaskEither<AppError, { count: number; mapping: Map<string, string> }> =>
	TE.tryCatch(
		async () => {
			let count = 0;
			const mapping = new Map<string, string>();

			for (const user of users) {
				const result = await createUser({
					username: user.username,
					displayName: user.displayName,
					email: user.email,
					avatar: user.avatar,
					plan: user.plan,
					settings: user.settings,
				})();

				if (E.isRight(result)) {
					mapping.set(user.id, result.right.id);
					count++;
				} else {
					warn(`[Migration] 用户迁移失败: ${user.id}`, result.left);
				}
			}
			return { count, mapping };
		},
		(error): AppError => dbError(`迁移用户失败: ${error}`),
	);

/**
 * 迁移工作区数据
 */
const migrateWorkspaces = (
	workspaces: WorkspaceInterface[],
	userMapping: Map<string, string>,
): TE.TaskEither<AppError, { count: number; mapping: Map<string, string> }> =>
	TE.tryCatch(
		async () => {
			let count = 0;
			const mapping = new Map<string, string>();

			for (const workspace of workspaces) {
				// 映射 owner ID
				const newOwnerId = workspace.owner
					? userMapping.get(workspace.owner) || workspace.owner
					: undefined;

				const result = await createWorkspace({
					title: workspace.title,
					description: workspace.description,
					owner: newOwnerId,
					author: workspace.author,
					publisher: workspace.publisher,
					language: workspace.language,
				})();

				if (E.isRight(result)) {
					mapping.set(workspace.id, result.right.id);
					count++;
				} else {
					warn(
						`[Migration] 工作区迁移失败: ${workspace.id}`,
						result.left,
					);
				}
			}
			return { count, mapping };
		},
		(error): AppError => dbError(`迁移工作区失败: ${error}`),
	);

/**
 * 迁移节点数据
 */
const migrateNodes = (
	nodes: NodeInterface[],
	workspaceMapping: Map<string, string>,
): TE.TaskEither<AppError, { count: number; mapping: Map<string, string> }> =>
	TE.tryCatch(
		async () => {
			let count = 0;
			const mapping = new Map<string, string>();

			// 按层级排序：先迁移根节点，再迁移子节点
			// 这样可以确保父节点的新 ID 已经存在于 mapping 中
			const sortedNodes = [...nodes].sort((a, b) => {
				// 计算节点深度
				const getDepth = (node: NodeInterface): number => {
					if (!node.parent) return 0;
					const parent = nodes.find((n) => n.id === node.parent);
					return parent ? getDepth(parent) + 1 : 0;
				};
				return getDepth(a) - getDepth(b);
			});

			for (const node of sortedNodes) {
				// 映射 workspace ID
				const newWorkspaceId = workspaceMapping.get(node.workspace);
				if (!newWorkspaceId) {
					warn(
						`[Migration] 节点 ${node.id} 的工作区 ${node.workspace} 未找到映射`,
					);
					continue;
				}

				// 映射 parent ID
				const newParentId = node.parent
					? mapping.get(node.parent) || null
					: null;

				const result = await createNode(
					{
						workspace: newWorkspaceId,
						title: node.title,
						type: node.type,
						parent: newParentId,
						order: node.order,
						collapsed: node.collapsed,
					},
					undefined,
					node.tags,
				)();

				if (E.isRight(result)) {
					mapping.set(node.id, result.right.id);
					count++;
				} else {
					warn(`[Migration] 节点迁移失败: ${node.id}`, result.left);
				}
			}
			return { count, mapping };
		},
		(error): AppError => dbError(`迁移节点失败: ${error}`),
	);

/**
 * 迁移内容数据
 */
const migrateContents = (
	contents: ContentInterface[],
	nodeMapping: Map<string, string>,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			let count = 0;
			for (const content of contents) {
				// 映射 nodeId
				const newNodeId = nodeMapping.get(content.nodeId);
				if (!newNodeId) {
					warn(
						`[Migration] 内容 ${content.id} 的节点 ${content.nodeId} 未找到映射`,
					);
					continue;
				}

				const result = await createContent({
					nodeId: newNodeId,
					content: content.content,
					contentType: content.contentType,
				})();

				if (E.isRight(result)) {
					count++;
				} else {
					warn(`[Migration] 内容迁移失败: ${content.id}`, result.left);
				}
			}
			return count;
		},
		(error): AppError => dbError(`迁移内容失败: ${error}`),
	);

// ============================================================================
// 主迁移函数
// ============================================================================

/**
 * 执行数据迁移
 */
export const migrateData = (): TE.TaskEither<AppError, MigrationResult> =>
	pipe(
		TE.Do,
		// 1. 检查是否需要迁移
		TE.bind("needsMigrate", () => needsMigration()),
		TE.chain(({ needsMigrate }) => {
			if (!needsMigrate) {
				const status = getMigrationStatus();
				return TE.right({
					status: status === "completed" ? "completed" : "not_started",
					migratedCounts: { workspaces: 0, nodes: 0, contents: 0, users: 0 },
					errors: [],
					startedAt: new Date().toISOString(),
				} as MigrationResult);
			}

			// 2. 开始迁移
			return pipe(
				TE.Do,
				TE.tap(() => {
					setMigrationStatus("in_progress");
					info("[Migration] 开始数据迁移...");
					return TE.right(undefined);
				}),
				// 3. 读取 Dexie 数据
				TE.bind("data", () => readDexieData()),
				// 4. 迁移数据（按依赖顺序）
				TE.bind("userResult", ({ data }) => migrateUsers(data.users)),
				TE.bind("workspaceResult", ({ data, userResult }) =>
					migrateWorkspaces(data.workspaces, userResult.mapping),
				),
				TE.bind("nodeResult", ({ data, workspaceResult }) =>
					migrateNodes(data.nodes, workspaceResult.mapping),
				),
				TE.bind("contentCount", ({ data, nodeResult }) =>
					migrateContents(data.contents, nodeResult.mapping),
				),
				// 5. 完成迁移
				TE.map(
					({
						userResult,
						workspaceResult,
						nodeResult,
						contentCount,
					}): MigrationResult => {
						setMigrationStatus("completed");
						const result: MigrationResult = {
							status: "completed",
							migratedCounts: {
								workspaces: workspaceResult.count,
								nodes: nodeResult.count,
								contents: contentCount,
								users: userResult.count,
							},
							errors: [],
							startedAt: new Date().toISOString(),
							completedAt: new Date().toISOString(),
							idMapping: {
								workspaces: workspaceResult.mapping,
								nodes: nodeResult.mapping,
								users: userResult.mapping,
							},
						};
						success("[Migration] 数据迁移完成", { migratedCounts: result.migratedCounts }, "dexie-to-sqlite.migration");
						return result;
					},
				),
				// 6. 错误处理
				TE.orElse((error) => {
					setMigrationStatus("failed");
					error("[Migration] 数据迁移失败", { error }, "dexie-to-sqlite.migration.fn");
					return TE.right({
						status: "failed",
						migratedCounts: { workspaces: 0, nodes: 0, contents: 0, users: 0 },
						errors: [error.message],
						startedAt: new Date().toISOString(),
					} as MigrationResult);
				}),
			);
		}),
	);

// ============================================================================
// 回滚函数
// ============================================================================

/**
 * 回滚迁移
 *
 * 注意：回滚只是重置迁移状态，不会删除已迁移的数据
 * 如果需要完全回滚，请使用 clearSqliteData
 */
export const rollbackMigration = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			warn("[Migration] 回滚迁移状态...");
			setMigrationStatus("rolled_back");
			info("[Migration] 迁移状态已回滚");
		},
		(error): AppError => {
			error("[Migration] 回滚迁移失败", { error }, "dexie-to-sqlite.migration.fn");
			return dbError(`回滚迁移失败: ${error}`);
		},
	);

/**
 * 重置迁移状态（允许重新迁移）
 */
export const resetMigrationStatus = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			info("[Migration] 重置迁移状态...");
			clearMigrationStatus();
			info("[Migration] 迁移状态已重置");
		},
		(error): AppError => {
			error("[Migration] 重置迁移状态失败", { error }, "dexie-to-sqlite.migration.fn");
			return dbError(`重置迁移状态失败: ${error}`);
		},
	);

// ============================================================================
// 清理函数
// ============================================================================

/**
 * 清理 Dexie 数据（迁移完成后调用）
 */
export const clearDexieData = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			info("[Migration] 清理 Dexie 数据...");

			const { legacyDatabase } = await import("@/io/db/legacy-database");

			await legacyDatabase.transaction(
				"rw",
				[
					legacyDatabase.workspaces,
					legacyDatabase.nodes,
					legacyDatabase.contents,
					legacyDatabase.users,
				],
				async () => {
					await legacyDatabase.workspaces.clear();
					await legacyDatabase.nodes.clear();
					await legacyDatabase.contents.clear();
					await legacyDatabase.users.clear();
				},
			);

			success("[Migration] Dexie 数据清理完成");
		},
		(error): AppError => {
			error("[Migration] 清理 Dexie 数据失败", { error }, "dexie-to-sqlite.migration.fn");
			return dbError(`清理 Dexie 数据失败: ${error}`);
		},
	);

/**
 * 完整迁移流程（迁移 + 清理）
 */
export const migrateAndCleanup = (): TE.TaskEither<AppError, MigrationResult> =>
	pipe(
		migrateData(),
		TE.chain((result) => {
			if (result.status === "completed") {
				return pipe(
					clearDexieData(),
					TE.map(() => result),
				);
			}
			return TE.right(result);
		}),
	);
