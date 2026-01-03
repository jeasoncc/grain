/**
 * User Repository - 用户数据访问层
 *
 * 纯函数 + TaskEither 封装，返回前端类型 (UserInterface)。
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
 * api-client.fn.ts
 * ```
 */

import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as api from "@/db/api-client.fn";
import type { AppError } from "@/lib/error.types";
import {
	decodeUser,
	decodeUsers,
	decodeUserOptional,
	encodeCreateUser,
	encodeUpdateUser,
} from "@/types/codec";
import type {
	UserCreateInput,
	UserInterface,
	UserUpdateInput,
} from "@/types/user";

// ============================================
// 查询操作
// ============================================

/**
 * 获取所有用户
 */
export const getUsers = (): TE.TaskEither<AppError, UserInterface[]> =>
	pipe(api.getUsers(), TE.map(decodeUsers));

/**
 * 获取单个用户
 */
export const getUser = (
	id: string,
): TE.TaskEither<AppError, UserInterface | null> =>
	pipe(api.getUser(id), TE.map(decodeUserOptional));

/**
 * 获取单个用户（不存在时抛出错误）
 */
export const getUserOrFail = (
	id: string,
): TE.TaskEither<AppError, UserInterface> =>
	pipe(
		getUser(id),
		TE.chain((user) =>
			user
				? TE.right(user)
				: TE.left({
						type: "NOT_FOUND",
						message: `用户不存在: ${id}`,
					} as AppError),
		),
	);

/**
 * 按用户名获取用户
 */
export const getUserByUsername = (
	username: string,
): TE.TaskEither<AppError, UserInterface | null> =>
	pipe(api.getUserByUsername(username), TE.map(decodeUserOptional));

/**
 * 按邮箱获取用户
 */
export const getUserByEmail = (
	email: string,
): TE.TaskEither<AppError, UserInterface | null> =>
	pipe(api.getUserByEmail(email), TE.map(decodeUserOptional));

/**
 * 获取当前用户（最后登录的用户）
 */
export const getCurrentUser = (): TE.TaskEither<AppError, UserInterface | null> =>
	pipe(api.getCurrentUser(), TE.map(decodeUserOptional));

/**
 * 获取当前用户（不存在时抛出错误）
 */
export const getCurrentUserOrFail = (): TE.TaskEither<AppError, UserInterface> =>
	pipe(
		getCurrentUser(),
		TE.chain((user) =>
			user
				? TE.right(user)
				: TE.left({
						type: "NOT_FOUND",
						message: "当前用户不存在",
					} as AppError),
		),
	);

// ============================================
// 写入操作
// ============================================

/**
 * 创建用户
 */
export const createUser = (
	input: UserCreateInput,
): TE.TaskEither<AppError, UserInterface> =>
	pipe(
		TE.of(encodeCreateUser(input)),
		TE.chain(api.createUser),
		TE.map(decodeUser),
	);

/**
 * 更新用户
 */
export const updateUser = (
	id: string,
	input: UserUpdateInput,
): TE.TaskEither<AppError, UserInterface> =>
	pipe(
		TE.of(encodeUpdateUser(input)),
		TE.chain((request) => api.updateUser(id, request)),
		TE.map(decodeUser),
	);

/**
 * 更新用户最后登录时间
 */
export const updateUserLastLogin = (
	id: string,
): TE.TaskEither<AppError, UserInterface> =>
	pipe(api.updateUserLastLogin(id), TE.map(decodeUser));

/**
 * 删除用户
 */
export const deleteUser = (id: string): TE.TaskEither<AppError, void> =>
	api.deleteUser(id);

// ============================================
// 兼容性别名
// ============================================

/**
 * 获取用户（别名，兼容旧 API）
 */
export const getUserById = getUser;

/**
 * 获取用户（别名，兼容旧 API）
 */
export const getUserByIdOrNull = getUser;

/**
 * 添加用户（别名，兼容旧 API）
 */
export const addUser = createUser;
