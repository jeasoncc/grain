/**
 * @file flows/backup/clear-data.flow.ts
 * @description 数据清理流程
 *
 * 依赖规则：flows/ 只能依赖 pipes/, io/, state/, types/
 */

import * as TE from "fp-ts/TaskEither"
import { clearSqliteData as clearSqliteDataApi } from "@/io/api/clear-data.api"
import { legacyDatabase } from "@/io/db/legacy-database"
import { type AppError, dbError } from "@/types/error"
import type { ClearDataResult } from "@/types/rust-api"
import type { ClearDataOptions, IndexedDBStats, StorageStats, TableSizes } from "@/types/storage"

// ============================================================================
// SQLite 清理
// ============================================================================

export const clearSqliteData = (): TE.TaskEither<AppError, ClearDataResult> => clearSqliteDataApi()

// ============================================================================
// IndexedDB 清理
// ============================================================================

export const clearIndexedDB = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			await legacyDatabase.transaction(
				"rw",
				[
					legacyDatabase.users,
					legacyDatabase.workspaces,
					legacyDatabase.nodes,
					legacyDatabase.contents,
					legacyDatabase.attachments,
					legacyDatabase.tags,
					legacyDatabase.dbVersions,
				],
				async () => {
					await legacyDatabase.users.clear()
					await legacyDatabase.workspaces.clear()
					await legacyDatabase.nodes.clear()
					await legacyDatabase.contents.clear()
					await legacyDatabase.attachments.clear()
					await legacyDatabase.tags.clear()
					await legacyDatabase.dbVersions.clear()
				},
			)
		},
		(error): AppError =>
			dbError(`清理 IndexedDB 失败: ${error instanceof Error ? error.message : "未知错误"}`),
	)

// ============================================================================
// 浏览器存储清理
// ============================================================================

export const clearLocalStorage = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			localStorage.clear()
		},
		(error): AppError =>
			dbError(`清理 localStorage 失败: ${error instanceof Error ? error.message : "未知错误"}`),
	)

export const clearSessionStorage = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			sessionStorage.clear()
		},
		(error): AppError =>
			dbError(`清理 sessionStorage 失败: ${error instanceof Error ? error.message : "未知错误"}`),
	)

export const clearCookies = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			const cookies = document.cookie.split(";")

			// 清理 cookies 是必须的副作用操作，无法避免
			// 使用 for...of 明确表示这是副作用操作
			for (const cookie of cookies) {
				const eqPos = cookie.indexOf("=")
				const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()

				if (name) {
					// 这些是必须的副作用操作（清理 cookies）
					const expireDate = "Thu, 01 Jan 1970 00:00:00 GMT"
					const cookieSettings = [
						`${name}=;expires=${expireDate};path=/`,
						`${name}=;expires=${expireDate};path=/;domain=${window.location.hostname}`,
						`${name}=;expires=${expireDate};path=/;domain=.${window.location.hostname}`,
					]
					for (const setting of cookieSettings) {
						// eslint-disable-next-line functional/immutable-data
						document.cookie = setting
					}
				}
			}
		},
		(error): AppError =>
			dbError(`清理 cookies 失败: ${error instanceof Error ? error.message : "未知错误"}`),
	)

export const clearCaches = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			if ("caches" in window) {
				const cacheNames = await caches.keys()
				await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
			}
		},
		(error): AppError =>
			dbError(`清理缓存失败: ${error instanceof Error ? error.message : "未知错误"}`),
	)

// ============================================================================
// 综合清理
// ============================================================================

export const clearAllData = (options: ClearDataOptions = {}): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			const {
				clearSqlite: shouldClearSqlite = true,
				clearIndexedDB: shouldClearIndexedDB = true,
				clearLocalStorage: shouldClearLocalStorage = true,
				clearSessionStorage: shouldClearSessionStorage = true,
				clearCookies: shouldClearCookies = true,
				clearCaches: shouldClearCaches = true,
			} = options

			const tasks = [
				shouldClearSqlite ? clearSqliteData() : null,
				shouldClearIndexedDB ? clearIndexedDB() : null,
				shouldClearLocalStorage ? clearLocalStorage() : null,
				shouldClearSessionStorage ? clearSessionStorage() : null,
				shouldClearCookies ? clearCookies() : null,
			].filter((task): task is TE.TaskEither<AppError, void> => task !== null)

			const results = await Promise.all(tasks.map((task) => task()))

			const errors: readonly string[] = results
				.filter(
					(result): result is { readonly _tag: "Left"; readonly left: AppError } =>
						result._tag === "Left",
				)
				.map((result) => result.left.message)

			if (shouldClearCaches) {
				await clearCaches()()
			}

			if (errors.length > 0) {
				throw new Error(`部分数据清理失败: ${errors.join(", ")}`)
			}
		},
		(error): AppError =>
			dbError(`清理所有数据失败: ${error instanceof Error ? error.message : "未知错误"}`),
	)

// ============================================================================
// 统计信息
// ============================================================================

const calculateDataSize = (data: readonly unknown[]): number => {
	try {
		return new Blob([JSON.stringify(data)]).size
	} catch {
		return 0
	}
}

export const getStorageStats = (): TE.TaskEither<AppError, StorageStats> =>
	TE.tryCatch(
		async () => {
			const [users, workspaces, nodes, contents, attachments, tags] = await Promise.all([
				legacyDatabase.users.toArray(),
				legacyDatabase.workspaces.toArray(),
				legacyDatabase.nodes.toArray(),
				legacyDatabase.contents.toArray(),
				legacyDatabase.attachments.toArray(),
				legacyDatabase.tags.toArray(),
			])

			const drawingNodes = nodes.filter((n) => n.type === "drawing")

			const tableSizes: TableSizes = {
				users: calculateDataSize(users),
				workspaces: calculateDataSize(workspaces),
				nodes: calculateDataSize(nodes),
				contents: calculateDataSize(contents),
				drawings: calculateDataSize(drawingNodes),
				attachments: calculateDataSize(attachments),
				tags: calculateDataSize(tags),
			}

			const totalSize = (Object.values(tableSizes) as readonly number[]).reduce((a, b) => a + b, 0)

			const indexedDBStats: IndexedDBStats = {
				size: totalSize,
				tables: {
					users: users.length,
					workspaces: workspaces.length,
					nodes: nodes.length,
					contents: contents.length,
					drawings: drawingNodes.length,
					attachments: attachments.length,
					tags: tags.length,
				},
				tableSizes,
			}

			const localStorageStats = {
				size: new Blob([JSON.stringify(localStorage)]).size,
				keys: Object.keys(localStorage).length,
			}

			const sessionStorageStats = {
				size: new Blob([JSON.stringify(sessionStorage)]).size,
				keys: Object.keys(sessionStorage).length,
			}

			const cookiesStats = {
				count: document.cookie.split(";").filter((c) => c.trim()).length,
			}

			return {
				indexedDB: indexedDBStats,
				localStorage: localStorageStats,
				sessionStorage: sessionStorageStats,
				cookies: cookiesStats,
			}
		},
		(error): AppError => dbError(`获取存储统计信息失败: ${error}`),
	)
