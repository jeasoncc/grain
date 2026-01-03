/**
 * @file clear-data.db.fn.ts
 * @description 数据清理函数
 *
 * 功能说明：
 * - 清理 SQLite 数据（通过 Rust 后端）
 * - 清理 IndexedDB 数据
 * - 清理 localStorage
 * - 清理 sessionStorage
 * - 清理 cookies
 * - 清理缓存
 * - 获取存储统计信息
 *
 * @requirements 3.2
 */

import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import { type AppError, dbError } from "@/lib/error.types";
import logger from "@/log";
import type {
	ClearDataOptions,
	IndexedDBStats,
	StorageStats,
	TableSizes,
} from "@/types/storage";
import type { ClearDataResult } from "@/types/rust-api";
import { database } from "./database";
import { clearSqliteData as clearSqliteDataApi } from "./api-client.fn";

// ============================================================================
// SQLite 清理（通过 Rust 后端）
// ============================================================================

/**
 * 清理 SQLite 数据（通过 Rust 后端）
 *
 * @returns TaskEither<AppError, ClearDataResult>
 */
export const clearSqliteData = (): TE.TaskEither<AppError, ClearDataResult> =>
	pipe(
		clearSqliteDataApi(),
		TE.tap(() => TE.fromIO(() => logger.success("[DB] SQLite 数据清理成功"))),
		TE.mapLeft((error) => {
			logger.error("[DB] 清理 SQLite 数据失败:", error);
			return error;
		}),
	);

// ============================================================================
// IndexedDB 清理
// ============================================================================

/**
 * 清理 IndexedDB 数据
 *
 * @returns TaskEither<AppError, void>
 */
export const clearIndexedDB = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 清理 IndexedDB...");

			await database.transaction(
				"rw",
				[
					database.users,
					database.workspaces,
					database.nodes,
					database.contents,
					database.attachments,
					database.tags,
					database.dbVersions,
				],
				async () => {
					await database.users.clear();
					await database.workspaces.clear();
					await database.nodes.clear();
					await database.contents.clear();
					await database.attachments.clear();
					await database.tags.clear();
					await database.dbVersions.clear();
				},
			);

			logger.success("[DB] IndexedDB 清理成功");
		},
		(error): AppError => {
			logger.error("[DB] 清理 IndexedDB 失败:", error);
			return dbError(
				`清理 IndexedDB 失败: ${error instanceof Error ? error.message : "未知错误"}`,
			);
		},
	);

// ============================================================================
// 浏览器存储清理
// ============================================================================

/**
 * 清理 localStorage
 *
 * @returns TaskEither<AppError, void>
 */
export const clearLocalStorage = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 清理 localStorage...");
			localStorage.clear();
			logger.success("[DB] localStorage 清理成功");
		},
		(error): AppError => {
			logger.error("[DB] 清理 localStorage 失败:", error);
			return dbError(
				`清理 localStorage 失败: ${error instanceof Error ? error.message : "未知错误"}`,
			);
		},
	);

/**
 * 清理 sessionStorage
 *
 * @returns TaskEither<AppError, void>
 */
export const clearSessionStorage = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 清理 sessionStorage...");
			sessionStorage.clear();
			logger.success("[DB] sessionStorage 清理成功");
		},
		(error): AppError => {
			logger.error("[DB] 清理 sessionStorage 失败:", error);
			return dbError(
				`清理 sessionStorage 失败: ${error instanceof Error ? error.message : "未知错误"}`,
			);
		},
	);

/**
 * 清理 cookies
 *
 * @returns TaskEither<AppError, void>
 */
export const clearCookies = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 清理 cookies...");

			const cookies = document.cookie.split(";");

			for (const cookie of cookies) {
				const eqPos = cookie.indexOf("=");
				const name =
					eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

				if (name) {
					// 通过设置过期时间为过去来删除 cookie
					document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
					document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
					document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
				}
			}

			logger.success("[DB] cookies 清理成功");
		},
		(error): AppError => {
			logger.error("[DB] 清理 cookies 失败:", error);
			return dbError(
				`清理 cookies 失败: ${error instanceof Error ? error.message : "未知错误"}`,
			);
		},
	);

/**
 * 清理缓存（如果支持 Cache API）
 *
 * @returns TaskEither<AppError, void>
 */
export const clearCaches = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 清理缓存...");

			if ("caches" in window) {
				const cacheNames = await caches.keys();
				await Promise.all(
					cacheNames.map((cacheName) => caches.delete(cacheName)),
				);
				logger.success("[DB] 缓存清理成功");
			} else {
				logger.info("[DB] 浏览器不支持 Cache API，跳过缓存清理");
			}
		},
		(error): AppError => {
			// 缓存清理失败不是致命错误，只记录警告
			logger.warn("[DB] 清理缓存失败:", error);
			return dbError(
				`清理缓存失败: ${error instanceof Error ? error.message : "未知错误"}`,
			);
		},
	);

// ============================================================================
// 综合清理
// ============================================================================

/**
 * 清理所有数据
 *
 * @param options - 清理选项
 * @returns TaskEither<AppError, void>
 */
export const clearAllData = (
	options: ClearDataOptions = {},
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			const {
				clearSqlite: shouldClearSqlite = true,
				clearIndexedDB: shouldClearIndexedDB = true,
				clearLocalStorage: shouldClearLocalStorage = true,
				clearSessionStorage: shouldClearSessionStorage = true,
				clearCookies: shouldClearCookies = true,
				clearCaches: shouldClearCaches = true,
			} = options;

			logger.info("[DB] 清理所有数据...", options);
			const errors: string[] = [];

			// 清理 SQLite（通过 Rust 后端）
			if (shouldClearSqlite) {
				const result = await clearSqliteData()();
				if (result._tag === "Left") {
					errors.push(result.left.message);
				}
			}

			// 清理 IndexedDB
			if (shouldClearIndexedDB) {
				const result = await clearIndexedDB()();
				if (result._tag === "Left") {
					errors.push(result.left.message);
				}
			}

			// 清理 localStorage
			if (shouldClearLocalStorage) {
				const result = await clearLocalStorage()();
				if (result._tag === "Left") {
					errors.push(result.left.message);
				}
			}

			// 清理 sessionStorage
			if (shouldClearSessionStorage) {
				const result = await clearSessionStorage()();
				if (result._tag === "Left") {
					errors.push(result.left.message);
				}
			}

			// 清理 cookies
			if (shouldClearCookies) {
				const result = await clearCookies()();
				if (result._tag === "Left") {
					errors.push(result.left.message);
				}
			}

			// 清理缓存
			if (shouldClearCaches) {
				const result = await clearCaches()();
				if (result._tag === "Left") {
					// 缓存清理失败不是致命错误，只记录
					logger.warn("[DB] 缓存清理失败，继续执行");
				}
			}

			if (errors.length > 0) {
				throw new Error(`部分数据清理失败: ${errors.join(", ")}`);
			}

			logger.success("[DB] 所有数据清理成功");
		},
		(error): AppError => {
			logger.error("[DB] 清理所有数据失败:", error);
			return dbError(
				`清理所有数据失败: ${error instanceof Error ? error.message : "未知错误"}`,
			);
		},
	);

// ============================================================================
// 统计信息
// ============================================================================

/**
 * 计算数据大小（字节）
 *
 * @param data - 数据数组
 * @returns number
 */
const calculateDataSize = (data: unknown[]): number => {
	try {
		return new Blob([JSON.stringify(data)]).size;
	} catch {
		return 0;
	}
};

/**
 * 获取存储统计信息
 *
 * @returns TaskEither<AppError, StorageStats>
 */
export const getStorageStats = (): TE.TaskEither<AppError, StorageStats> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取存储统计信息...");

			// 获取各表数据以计算大小
			const [users, workspaces, nodes, contents, attachments, tags] =
				await Promise.all([
					database.users.toArray(),
					database.workspaces.toArray(),
					database.nodes.toArray(),
					database.contents.toArray(),
					database.attachments.toArray(),
					database.tags.toArray(),
				]);

			// 计算 drawing 类型节点（绘图现在存储在 nodes 表中）
			const drawingNodes = nodes.filter((n) => n.type === "drawing");

			// 计算各表大小
			const tableSizes: TableSizes = {
				users: calculateDataSize(users),
				workspaces: calculateDataSize(workspaces),
				nodes: calculateDataSize(nodes),
				contents: calculateDataSize(contents),
				drawings: calculateDataSize(drawingNodes), // 使用 drawing 类型节点
				attachments: calculateDataSize(attachments),
				tags: calculateDataSize(tags),
			};

			// 总 IndexedDB 大小
			const totalSize = (Object.values(tableSizes) as number[]).reduce(
				(a, b) => a + b,
				0,
			);

			const indexedDBStats: IndexedDBStats = {
				size: totalSize,
				tables: {
					users: users.length,
					workspaces: workspaces.length,
					nodes: nodes.length,
					contents: contents.length,
					drawings: drawingNodes.length, // 使用 drawing 类型节点数量
					attachments: attachments.length,
					tags: tags.length,
				},
				tableSizes,
			};

			// localStorage 统计
			const localStorageStats = {
				size: new Blob([JSON.stringify(localStorage)]).size,
				keys: Object.keys(localStorage).length,
			};

			// sessionStorage 统计
			const sessionStorageStats = {
				size: new Blob([JSON.stringify(sessionStorage)]).size,
				keys: Object.keys(sessionStorage).length,
			};

			// cookies 统计
			const cookiesStats = {
				count: document.cookie.split(";").filter((c) => c.trim()).length,
			};

			return {
				indexedDB: indexedDBStats,
				localStorage: localStorageStats,
				sessionStorage: sessionStorageStats,
				cookies: cookiesStats,
			};
		},
		(error): AppError => {
			logger.error("[DB] 获取存储统计信息失败:", error);
			return dbError(`获取存储统计信息失败: ${error}`);
		},
	);
