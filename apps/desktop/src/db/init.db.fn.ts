/**
 * @file init.db.fn.ts
 * @description 数据库初始化函数
 *
 * 功能说明：
 * - 初始化数据库默认数据
 * - 创建默认访客用户
 * - 设置数据库版本
 *
 * @requirements 3.2
 */

import dayjs from "dayjs";
import * as TE from "fp-ts/TaskEither";
import { v4 as uuidv4 } from "uuid";
import { type AppError, dbError } from "@/lib/error.types";
import logger from "@/log";
import { database } from "./database";

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

/**
 * 数据库版本记录
 */
export interface DBVersionRecord {
	id: string;
	version: string;
	updatedAt: string;
	migrationNotes: string;
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
	TE.tryCatch(
		async () => {
			const count = await database.users.count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查用户失败:", error);
			return dbError(`检查用户失败: ${error}`);
		},
	);

/**
 * 检查是否存在数据库版本记录
 *
 * @returns TaskEither<AppError, boolean>
 */
export const hasDBVersion = (): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.dbVersions.count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查数据库版本失败:", error);
			return dbError(`检查数据库版本失败: ${error}`);
		},
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
	TE.tryCatch(
		async () => {
			logger.info("[DB] 创建默认访客用户...");

			const now = dayjs().toISOString();
			const guestUser = {
				id: uuidv4(),
				username: config.username || "guest",
				displayName: config.displayName || "Guest User",
				lastLogin: now,
				createDate: now,
				plan: "free" as const,
				tokenStatus: "unchecked" as const,
				state: {
					lastLocation: "",
					currentProject: "",
					currentChapter: "",
					currentScene: "",
					currentTitle: "",
					currentTyping: "",
					lastCloudSave: "",
					lastLocalSave: "",
					isUserLoggedIn: false,
				},
				settings: {
					theme: config.theme || ("dark" as const),
					language: config.language || "en",
					autosave: true,
					spellCheck: true,
					lastLocation: true,
					fontSize: "14px",
				},
			};

			await database.users.add(guestUser);
			logger.info(`[DB] 用户已添加: ${guestUser.username} (${guestUser.id})`);
			logger.success("[DB] 默认访客用户创建成功");

			return guestUser.id;
		},
		(error): AppError => {
			logger.error("[DB] 创建默认用户失败:", error);
			return dbError(`创建默认用户失败: ${error}`);
		},
	);

/**
 * 设置数据库版本
 *
 * @param version - 版本号
 * @param migrationNotes - 迁移说明
 * @returns TaskEither<AppError, string> - 版本记录 ID
 */
export const setDBVersion = (
	version = "2.0.0",
	migrationNotes = "Unified database architecture",
): TE.TaskEither<AppError, string> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 设置数据库版本:", version);

			const versionRecord: DBVersionRecord = {
				id: uuidv4(),
				version,
				updatedAt: dayjs().toISOString(),
				migrationNotes,
			};

			await database.dbVersions.put(versionRecord);
			logger.info(`[DB] 数据库版本设置为 ${version}`);
			logger.success(`[DB] 数据库版本 ${version} 初始化成功`);

			return versionRecord.id;
		},
		(error): AppError => {
			logger.error("[DB] 设置数据库版本失败:", error);
			return dbError(`设置数据库版本失败: ${error}`);
		},
	);

/**
 * 获取当前数据库版本
 *
 * @returns TaskEither<AppError, string | null>
 */
export const getDBVersion = (): TE.TaskEither<AppError, string | null> =>
	TE.tryCatch(
		async () => {
			const versions = await database.dbVersions.toArray();
			if (versions.length === 0) return null;

			// 返回最新版本
			const sorted = versions.sort((a, b) =>
				dayjs(b.updatedAt).diff(dayjs(a.updatedAt)),
			);
			return sorted[0].version;
		},
		(error): AppError => {
			logger.error("[DB] 获取数据库版本失败:", error);
			return dbError(`获取数据库版本失败: ${error}`);
		},
	);

/**
 * 初始化数据库
 *
 * 执行以下操作：
 * - 如果没有用户，创建默认访客用户
 * - 如果没有版本记录，设置初始版本
 *
 * @param config - 可选的用户配置
 * @returns TaskEither<AppError, void>
 */
export const initDatabase = (
	config: DefaultUserConfig = {},
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 初始化数据库...");

			// 检查并创建默认访客用户
			const hasUsersResult = await hasUsers()();
			if (hasUsersResult._tag === "Left") {
				throw new Error(hasUsersResult.left.message);
			}

			if (!hasUsersResult.right) {
				const createUserResult = await createDefaultUser(config)();
				if (createUserResult._tag === "Left") {
					throw new Error(createUserResult.left.message);
				}
			}

			// 检查并设置数据库版本
			const hasVersionResult = await hasDBVersion()();
			if (hasVersionResult._tag === "Left") {
				throw new Error(hasVersionResult.left.message);
			}

			if (!hasVersionResult.right) {
				const setVersionResult = await setDBVersion()();
				if (setVersionResult._tag === "Left") {
					throw new Error(setVersionResult.left.message);
				}
			}

			logger.success("[DB] 🎉 数据库初始化成功!");
		},
		(error): AppError => {
			logger.error("[DB] ❌ 数据库初始化失败:", error);
			return dbError(`数据库初始化失败: ${error}`);
		},
	);

/**
 * 重置数据库到初始状态
 *
 * 清除所有数据并重新初始化
 *
 * @param config - 可选的用户配置
 * @returns TaskEither<AppError, void>
 */
export const resetDatabase = (
	config: DefaultUserConfig = {},
): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.warn("[DB] 重置数据库...");

			// 清除所有表数据
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

			logger.info("[DB] 数据已清除，重新初始化...");

			// 重新初始化
			const initResult = await initDatabase(config)();
			if (initResult._tag === "Left") {
				throw new Error(initResult.left.message);
			}

			logger.success("[DB] 数据库重置成功");
		},
		(error): AppError => {
			logger.error("[DB] 重置数据库失败:", error);
			return dbError(`重置数据库失败: ${error}`);
		},
	);

/**
 * 检查数据库是否已初始化
 *
 * @returns TaskEither<AppError, boolean>
 */
export const isDatabaseInitialized = (): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const [usersExist, versionExists] = await Promise.all([
				hasUsers()(),
				hasDBVersion()(),
			]);

			if (usersExist._tag === "Left" || versionExists._tag === "Left") {
				return false;
			}

			return usersExist.right && versionExists.right;
		},
		(error): AppError => {
			logger.error("[DB] 检查数据库初始化状态失败:", error);
			return dbError(`检查数据库初始化状态失败: ${error}`);
		},
	);
