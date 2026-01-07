/**
 * @file clear-data.api.ts
 * @description Clear Data API - 数据清理操作封装
 *
 * 功能说明：
 * - 封装 Rust 后端的 SQLite 数据清理 API
 * - 封装本地 IndexedDB 日志清理
 * - 使用 TaskEither 返回类型进行错误处理
 *
 * @requirements 3.1, 3.2, 3.3, 3.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { api } from "./client.api";
import { type AppError, dbError } from "@/types/error";
import logger from '@/io/log';
import type { ClearDataResult } from "@/types/rust-api";

// ============================================================================
// SQLite 数据清理（通过 Rust 后端）
// ============================================================================

/**
 * 清除所有 SQLite 数据
 *
 * @returns TaskEither<AppError, ClearDataResult>
 */
export const clearSqliteData = (): TE.TaskEither<AppError, ClearDataResult> =>
	api.clearSqliteData();

/**
 * 清除 SQLite 数据（保留用户）
 *
 * @returns TaskEither<AppError, ClearDataResult>
 */
export const clearSqliteDataKeepUsers = (): TE.TaskEither<
	AppError,
	ClearDataResult
> => api.clearSqliteDataKeepUsers();

// ============================================================================
// IndexedDB 日志清理（本地）
// ============================================================================

/**
 * 清除本地日志数据库
 *
 * @returns TaskEither<AppError, void>
 */
export const clearLogs = (): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[ClearData] 清除日志数据库...");

			// 动态导入日志数据库，避免循环依赖
			const { logDatabase } = await import("@/io/db/log-db");

			// 清除日志表
			await logDatabase.logs.clear();

			logger.success("[ClearData] 日志数据库清除成功");
		},
		(error): AppError => {
			logger.error("[ClearData] 清除日志数据库失败:", error);
			return dbError(`清除日志数据库失败: ${error}`);
		},
	);

// ============================================================================
// 组合清理操作
// ============================================================================

/**
 * 清除所有数据（SQLite + 日志）
 *
 * @returns TaskEither<AppError, ClearDataResult>
 */
export const clearAllData = (): TE.TaskEither<AppError, ClearDataResult> =>
	pipe(
		// 1. 清除 SQLite 数据
		clearSqliteData(),
		// 2. 清除日志（不影响主结果）
		TE.chainFirst(() =>
			pipe(
				clearLogs(),
				// 日志清理失败不影响主流程
				TE.orElse(() => TE.right(undefined)),
			),
		),
	);

/**
 * 清除所有数据（保留用户，SQLite + 日志）
 *
 * @returns TaskEither<AppError, ClearDataResult>
 */
export const clearAllDataKeepUsers = (): TE.TaskEither<
	AppError,
	ClearDataResult
> =>
	pipe(
		// 1. 清除 SQLite 数据（保留用户）
		clearSqliteDataKeepUsers(),
		// 2. 清除日志（不影响主结果）
		TE.chainFirst(() =>
			pipe(
				clearLogs(),
				// 日志清理失败不影响主流程
				TE.orElse(() => TE.right(undefined)),
			),
		),
	);
