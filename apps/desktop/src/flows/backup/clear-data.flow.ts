/**
 * @file flows/backup/clear-data.flow.ts
 * @description 数据清理流程
 *
 * 依赖规则：flows/ 只能依赖 pipes/, io/, state/, types/
 */

import * as TE from "fp-ts/TaskEither"
import { clearSqliteData as clearSqliteDataApi } from "@/io/api/clear-data.api"
import { type AppError, dbError } from "@/types/error"
import type { ClearDataResult } from "@/types/rust-api"
import type { ClearDataOptions } from "@/types/storage"

// ============================================================================
// SQLite 清理
// ============================================================================

export const clearSqliteData = (): TE.TaskEither<AppError, ClearDataResult> => clearSqliteDataApi()

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
				clearLocalStorage: shouldClearLocalStorage = true,
				clearSessionStorage: shouldClearSessionStorage = true,
				clearCookies: shouldClearCookies = true,
				clearCaches: shouldClearCaches = true,
			} = options

			const tasks = [
				shouldClearSqlite ? clearSqliteData() : null,
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


