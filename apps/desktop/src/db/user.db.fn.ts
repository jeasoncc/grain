/**
 * @file user.db.fn.ts
 * @description User 数据库操作函数
 *
 * 功能说明：
 * - 提供用户的 CRUD 操作
 * - 提供用户认证和订阅管理
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
import { UserBuilder } from "@/types/user/user.builder";
import type {
	TokenStatus,
	UserFeatures,
	UserInterface,
	UserPlan,
	UserSettings,
	UserState,
	UserUpdateInput,
} from "@/types/user/user.interface";
import { database } from "./database";

// ============================================================================
// 基础 CRUD 操作
// ============================================================================

/**
 * 添加新用户
 *
 * @param username - 用户名
 * @param options - 可选的用户属性
 * @returns TaskEither<AppError, UserInterface>
 */
export const addUser = (
	username: string,
	options: {
		displayName?: string;
		avatar?: string;
		email?: string;
		plan?: UserPlan;
		features?: UserFeatures;
		settings?: UserSettings;
	} = {},
): TE.TaskEither<AppError, UserInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 添加用户:", { username });

			const builder = new UserBuilder().username(username);

			if (options.displayName) {
				builder.displayName(options.displayName);
			}
			if (options.avatar) {
				builder.avatar(options.avatar);
			}
			if (options.email) {
				builder.email(options.email);
			}
			if (options.plan) {
				builder.plan(options.plan);
			}
			if (options.features) {
				builder.features(options.features);
			}
			if (options.settings) {
				builder.settings(options.settings);
			}

			const user = builder.build();
			await database.users.add(user);

			logger.success("[DB] 用户添加成功:", user.id);
			return user;
		},
		(error): AppError => {
			logger.error("[DB] 添加用户失败:", error);
			return dbError(`添加用户失败: ${error}`);
		},
	);

/**
 * 更新用户
 *
 * @param id - 用户 ID
 * @param updates - 更新的字段
 * @returns TaskEither<AppError, number> - 更新的记录数（0 或 1）
 */
export const updateUser = (
	id: string,
	updates: UserUpdateInput,
): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 更新用户:", { id, updates });

			const count = await database.users.update(id, {
				...updates,
				lastLogin: dayjs().toISOString(),
			});

			if (count > 0) {
				logger.success("[DB] 用户更新成功:", id);
			} else {
				logger.warn("[DB] 用户未找到:", id);
			}

			return count;
		},
		(error): AppError => {
			logger.error("[DB] 更新用户失败:", error);
			return dbError(`更新用户失败: ${error}`);
		},
	);

/**
 * 删除用户
 *
 * @param id - 用户 ID
 * @returns TaskEither<AppError, void>
 */
export const deleteUser = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 删除用户:", id);
			await database.users.delete(id);
			logger.success("[DB] 用户删除成功:", id);
		},
		(error): AppError => {
			logger.error("[DB] 删除用户失败:", error);
			return dbError(`删除用户失败: ${error}`);
		},
	);

// ============================================================================
// 查询操作
// ============================================================================

/**
 * 根据 ID 获取用户
 *
 * @param id - 用户 ID
 * @returns TaskEither<AppError, UserInterface | undefined>
 */
export const getUserById = (
	id: string,
): TE.TaskEither<AppError, UserInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取用户:", id);
			return database.users.get(id);
		},
		(error): AppError => {
			logger.error("[DB] 获取用户失败:", error);
			return dbError(`获取用户失败: ${error}`);
		},
	);

/**
 * 根据 ID 获取用户（必须存在）
 *
 * @param id - 用户 ID
 * @returns TaskEither<AppError, UserInterface>
 */
export const getUserByIdOrFail = (
	id: string,
): TE.TaskEither<AppError, UserInterface> =>
	pipe(
		getUserById(id),
		TE.chain((user) =>
			user ? TE.right(user) : TE.left(notFoundError(`用户不存在: ${id}`, id)),
		),
	);

/**
 * 获取所有用户
 * 按 lastLogin 降序排列（最近登录的在前）
 *
 * @returns TaskEither<AppError, UserInterface[]>
 */
export const getAllUsers = (): TE.TaskEither<AppError, UserInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 获取所有用户");
			const users = await database.users.toArray();
			return users.sort(
				(a, b) =>
					new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime(),
			);
		},
		(error): AppError => {
			logger.error("[DB] 获取所有用户失败:", error);
			return dbError(`获取所有用户失败: ${error}`);
		},
	);

/**
 * 根据用户名获取用户
 *
 * @param username - 用户名
 * @returns TaskEither<AppError, UserInterface | undefined>
 */
export const getUserByUsername = (
	username: string,
): TE.TaskEither<AppError, UserInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 根据用户名获取用户:", username);
			return database.users.where("username").equals(username).first();
		},
		(error): AppError => {
			logger.error("[DB] 根据用户名获取用户失败:", error);
			return dbError(`根据用户名获取用户失败: ${error}`);
		},
	);

/**
 * 根据邮箱获取用户
 *
 * @param email - 邮箱地址
 * @returns TaskEither<AppError, UserInterface | undefined>
 */
export const getUserByEmail = (
	email: string,
): TE.TaskEither<AppError, UserInterface | undefined> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 根据邮箱获取用户:", email);
			return database.users.where("email").equals(email).first();
		},
		(error): AppError => {
			logger.error("[DB] 根据邮箱获取用户失败:", error);
			return dbError(`根据邮箱获取用户失败: ${error}`);
		},
	);

/**
 * 根据订阅计划获取用户
 *
 * @param plan - 订阅计划类型
 * @returns TaskEither<AppError, UserInterface[]>
 */
export const getUsersByPlan = (
	plan: UserPlan,
): TE.TaskEither<AppError, UserInterface[]> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 根据订阅计划获取用户:", plan);
			const users = await database.users.toArray();
			return users.filter((u) => u.plan === plan);
		},
		(error): AppError => {
			logger.error("[DB] 根据订阅计划获取用户失败:", error);
			return dbError(`根据订阅计划获取用户失败: ${error}`);
		},
	);

// ============================================================================
// 认证和订阅管理
// ============================================================================

/**
 * 更新用户的 lastLogin 时间戳
 *
 * @param id - 用户 ID
 * @returns TaskEither<AppError, void>
 */
export const touchUser = (id: string): TE.TaskEither<AppError, void> =>
	TE.tryCatch(
		async () => {
			logger.debug("[DB] 更新用户登录时间:", id);
			await database.users.update(id, {
				lastLogin: dayjs().toISOString(),
			});
		},
		(error): AppError => {
			logger.error("[DB] 更新用户登录时间失败:", error);
			return dbError(`更新用户登录时间失败: ${error}`);
		},
	);

/**
 * 更新用户订阅计划
 *
 * @param id - 用户 ID
 * @param plan - 新的订阅计划
 * @param expiresAt - 可选的到期时间
 * @returns TaskEither<AppError, void>
 */
export const updateUserPlan = (
	id: string,
	plan: UserPlan,
	expiresAt?: string,
): TE.TaskEither<AppError, void> =>
	pipe(
		TE.tryCatch(
			async () => {
				logger.info("[DB] 更新用户订阅计划:", { id, plan });
				await database.users.update(id, {
					plan,
					planStartDate: dayjs().toISOString(),
					...(expiresAt ? { planExpiresAt: expiresAt } : {}),
					lastLogin: dayjs().toISOString(),
				});
				logger.success("[DB] 用户订阅计划更新成功:", id);
			},
			(error): AppError => {
				logger.error("[DB] 更新用户订阅计划失败:", error);
				return dbError(`更新用户订阅计划失败: ${error}`);
			},
		),
	);

/**
 * 更新用户 Token 和状态
 *
 * @param id - 用户 ID
 * @param token - 新的 Token
 * @param status - Token 状态
 * @returns TaskEither<AppError, void>
 */
export const updateUserToken = (
	id: string,
	token: string,
	status: TokenStatus = "unchecked",
): TE.TaskEither<AppError, void> =>
	pipe(
		updateUser(id, {
			token,
			tokenStatus: status,
			lastTokenCheck: dayjs().toISOString(),
		}),
		TE.map(() => {
			logger.success("[DB] 用户 Token 更新成功:", id);
			return undefined;
		}),
	);

/**
 * 更新用户功能权限
 *
 * @param id - 用户 ID
 * @param features - 新的功能权限
 * @returns TaskEither<AppError, void>
 */
export const updateUserFeatures = (
	id: string,
	features: UserFeatures,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateUser(id, { features }),
		TE.map(() => {
			logger.success("[DB] 用户功能权限更新成功:", id);
			return undefined;
		}),
	);

/**
 * 更新用户应用状态
 *
 * @param id - 用户 ID
 * @param state - 新的应用状态
 * @returns TaskEither<AppError, void>
 */
export const updateUserState = (
	id: string,
	state: UserState,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateUser(id, { state }),
		TE.map(() => {
			logger.success("[DB] 用户应用状态更新成功:", id);
			return undefined;
		}),
	);

/**
 * 更新用户设置
 *
 * @param id - 用户 ID
 * @param settings - 新的用户设置
 * @returns TaskEither<AppError, void>
 */
export const updateUserSettings = (
	id: string,
	settings: UserSettings,
): TE.TaskEither<AppError, void> =>
	pipe(
		updateUser(id, { settings }),
		TE.map(() => {
			logger.success("[DB] 用户设置更新成功:", id);
			return undefined;
		}),
	);

// ============================================================================
// 辅助操作
// ============================================================================

/**
 * 检查用户是否存在
 *
 * @param id - 用户 ID
 * @returns TaskEither<AppError, boolean>
 */
export const userExists = (id: string): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.users.where("id").equals(id).count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查用户存在失败:", error);
			return dbError(`检查用户存在失败: ${error}`);
		},
	);

/**
 * 检查用户名是否已被使用
 *
 * @param username - 用户名
 * @returns TaskEither<AppError, boolean>
 */
export const usernameExists = (
	username: string,
): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.users
				.where("username")
				.equals(username)
				.count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查用户名存在失败:", error);
			return dbError(`检查用户名存在失败: ${error}`);
		},
	);

/**
 * 检查邮箱是否已被使用
 *
 * @param email - 邮箱地址
 * @returns TaskEither<AppError, boolean>
 */
export const emailExists = (email: string): TE.TaskEither<AppError, boolean> =>
	TE.tryCatch(
		async () => {
			const count = await database.users.where("email").equals(email).count();
			return count > 0;
		},
		(error): AppError => {
			logger.error("[DB] 检查邮箱存在失败:", error);
			return dbError(`检查邮箱存在失败: ${error}`);
		},
	);

/**
 * 统计用户数量
 *
 * @returns TaskEither<AppError, number>
 */
export const countUsers = (): TE.TaskEither<AppError, number> =>
	TE.tryCatch(
		async () => {
			return database.users.count();
		},
		(error): AppError => {
			logger.error("[DB] 统计用户数量失败:", error);
			return dbError(`统计用户数量失败: ${error}`);
		},
	);

/**
 * 获取当前/默认用户
 * 返回第一个用户，如果没有用户则返回 undefined
 *
 * @returns TaskEither<AppError, UserInterface | undefined>
 */
export const getCurrentUser = (): TE.TaskEither<
	AppError,
	UserInterface | undefined
> =>
	pipe(
		getAllUsers(),
		TE.map((users) => users[0]),
	);

/**
 * 获取或创建默认用户
 * 如果没有用户则创建一个默认用户
 *
 * @returns TaskEither<AppError, UserInterface>
 */
export const getOrCreateDefaultUser = (): TE.TaskEither<
	AppError,
	UserInterface
> =>
	pipe(
		getCurrentUser(),
		TE.chain((existing) => {
			if (existing) {
				return TE.right(existing);
			}

			return addUser("default", {
				displayName: "Default User",
				plan: "free",
				settings: {
					theme: "dark",
					language: "en",
					fontSize: "16px",
				},
			});
		}),
	);

/**
 * 保存用户（直接保存完整用户对象）
 *
 * @param user - 用户对象
 * @returns TaskEither<AppError, UserInterface>
 */
export const saveUser = (
	user: UserInterface,
): TE.TaskEither<AppError, UserInterface> =>
	TE.tryCatch(
		async () => {
			logger.info("[DB] 保存用户:", user.id);
			await database.users.put(user);
			logger.success("[DB] 用户保存成功:", user.id);
			return user;
		},
		(error): AppError => {
			logger.error("[DB] 保存用户失败:", error);
			return dbError(`保存用户失败: ${error}`);
		},
	);
