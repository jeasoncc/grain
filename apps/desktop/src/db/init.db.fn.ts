/**
 * @file init.db.fn.ts
 * @description 数据库初始化函数
 *
 * 功能说明：
 * - 初始化数据库默认数据
 * - 创建默认访客用户（通过 Rust 后端）
 * - 检查数据库初始化状态
 *
 * 架构说明：
 * - 用户数据通过 repo 层访问 Rust 后端 (SQLite)
 * - 日志数据保留在 IndexedDB (Dexie)
 *
 * @requirements 11.1, 11.2, 11.3, 11.4
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { type AppError, dbError } from "@/lib/error.types";
import logger from "@/log";
import {
	createUser,
	getCurrentUser,
	getUsers,
} from "@/repo/user.repo.fn";
import type { UserCreateInput } from "@/types/user";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 默认用户配置
 */
export interface DefaultUserConfig {
	username?: string;
	displayName?: string;
	theme?: "light" | "dark" | "system";
	language?: string;
}

// ============================================================================
// 初始化函数
// ============================================================================

/**
 * 检查是否存在用户
 *
 * @returns TaskEither<AppError, boolean>
 */
export const hasUsers = (): TE.TaskEither<AppError, boolean> =>
	pipe(
		getUsers(),
		TE.map((users) => users.length > 0),
		TE.mapLeft((error) => {
			logger.error("[DB] 检查用户失败:", error);
			return error;
		}),
	);

/**
 * 创建默认访客用户
 *
 * @param config - 可选的用户配置
 * @returns TaskEither<AppError, string> - 用户 ID
 */
export const createDefaultUser = (
	config: DefaultUserConfig = {},
): TE.TaskEither<AppError, string> =>
	pipe(
		TE.Do,
		TE.tap(() => TE.fromIO(() => logger.info("[DB] 创建默认访客用户..."))),
		TE.bind("user", () => {
			const userInput: UserCreateInput = {
				username: config.username || "guest",
				displayName: config.displayName || "Guest User",
				settings: {
					theme: config.theme || "dark",
					language: config.language || "en",
					autosave: true,
					spellCheck: true,
					lastLocation: true,
					fontSize: "14px",
				},
			};
			return createUser(userInput);
		}),
		TE.tap(({ user }) =>
			TE.fromIO(() => {
				logger.info(`[DB] 用户已添加: ${user.username} (${user.id})`);
				logger.success("[DB] 默认访客用户创建成功");
			}),
		),
		TE.map(({ user }) => user.id),
		TE.mapLeft((error) => {
			logger.error("[DB] 创建默认用户失败:", error);
			return error;
		}),
	);

/**
 * 初始化数据库
 *
 * 执行以下操作：
 * - 如果没有用户，创建默认访客用户
 *
 * @param config - 可选的用户配置
 * @returns TaskEither<AppError, void>
 */
export const initDatabase = (
	config: DefaultUserConfig = {},
): TE.TaskEither<AppError, void> =>
	pipe(
		TE.Do,
		TE.tap(() => TE.fromIO(() => logger.info("[DB] 初始化数据库..."))),
		TE.bind("hasExistingUsers", () => hasUsers()),
		TE.chain(({ hasExistingUsers }) => {
			if (!hasExistingUsers) {
				return pipe(
					createDefaultUser(config),
					TE.map(() => undefined),
				);
			}
			return TE.right(undefined);
		}),
		TE.tap(() =>
			TE.fromIO(() => logger.success("[DB] 🎉 数据库初始化成功!")),
		),
		TE.mapLeft((error) => {
			logger.error("[DB] ❌ 数据库初始化失败:", error);
			return error;
		}),
	);

/**
 * 检查数据库是否已初始化
 *
 * @returns TaskEither<AppError, boolean>
 */
export const isDatabaseInitialized = (): TE.TaskEither<AppError, boolean> =>
	pipe(
		hasUsers(),
		TE.mapLeft((error) => {
			logger.error("[DB] 检查数据库初始化状态失败:", error);
			return error;
		}),
	);

/**
 * 获取当前用户或创建默认用户
 *
 * @param config - 可选的用户配置
 * @returns TaskEither<AppError, string> - 用户 ID
 */
export const ensureCurrentUser = (
	config: DefaultUserConfig = {},
): TE.TaskEither<AppError, string> =>
	pipe(
		getCurrentUser(),
		TE.chain((user) => {
			if (user) {
				return TE.right(user.id);
			}
			return createDefaultUser(config);
		}),
	);

// ============================================================================
// 已废弃的函数（保留兼容性）
// ============================================================================

/**
 * @deprecated 数据库版本现在由 Rust 后端管理
 */
export const hasDBVersion = (): TE.TaskEither<AppError, boolean> =>
	TE.right(true);

/**
 * @deprecated 数据库版本现在由 Rust 后端管理
 */
export const setDBVersion = (
	_version = "2.0.0",
	_migrationNotes = "Unified database architecture",
): TE.TaskEither<AppError, string> => TE.right("rust-managed");

/**
 * @deprecated 数据库版本现在由 Rust 后端管理
 */
export const getDBVersion = (): TE.TaskEither<AppError, string | null> =>
	TE.right("2.0.0");

/**
 * @deprecated 使用 repo/clear-data.repo.fn.ts 的 clearAllData 代替
 */
export const resetDatabase = (
	_config: DefaultUserConfig = {},
): TE.TaskEither<AppError, void> =>
	TE.left(
		dbError(
			"resetDatabase is deprecated. Use clearAllData from @/repo instead.",
		),
	);
