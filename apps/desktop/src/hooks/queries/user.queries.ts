/**
 * User TanStack Query Hooks
 *
 * 使用 TanStack Query 包装 Repository 层的 TaskEither。
 *
 * 设计原则：
 * - 读取操作使用 useQuery
 * - 写入操作使用纯 TaskEither 管道（在 actions 中）
 *
 * @requirements 8.1
 */

import { useQuery } from "@tanstack/react-query"
import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import * as userRepo from "@/io/api/user.api"
import type { UserInterface, UserPlan } from "@/types/user"
import { queryKeys } from "./query-keys"

/**
 * 获取所有用户
 */
export const useUsers = () => {
	return useQuery({
		queryFn: async (): Promise<readonly UserInterface[]> => {
			const result = await userRepo.getUsers()()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			// 按最后登录时间排序（最新的在前）
			return result.right.sort(
				(a, b) => dayjs(b.lastLogin).valueOf() - dayjs(a.lastLogin).valueOf(),
			)
		},
		queryKey: queryKeys.users.all,
	})
}

/**
 * 获取单个用户
 */
export const useUser = (userId: string | null | undefined) => {
	return useQuery({
		enabled: !!userId,
		queryFn: async (): Promise<UserInterface | null> => {
			if (!userId) {
				return null
			}
			const result = await userRepo.getUser(userId)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right
		},
		queryKey: queryKeys.users.detail(userId ?? ""),
	})
}

/**
 * 按用户名获取用户
 */
export const useUserByUsername = (username: string | null | undefined) => {
	return useQuery({
		enabled: !!username,
		queryFn: async (): Promise<UserInterface | null> => {
			if (!username) {
				return null
			}
			const result = await userRepo.getUserByUsername(username)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right
		},
		queryKey: queryKeys.users.byUsername(username ?? ""),
	})
}

/**
 * 按邮箱获取用户
 */
export const useUserByEmail = (email: string | null | undefined) => {
	return useQuery({
		enabled: !!email,
		queryFn: async (): Promise<UserInterface | null> => {
			if (!email) {
				return null
			}
			const result = await userRepo.getUserByEmail(email)()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right
		},
		queryKey: queryKeys.users.byEmail(email ?? ""),
	})
}

/**
 * 获取当前用户（最后登录的用户）
 */
export const useCurrentUser = () => {
	return useQuery({
		queryFn: async (): Promise<UserInterface | null> => {
			const result = await userRepo.getCurrentUser()()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right
		},
		queryKey: queryKeys.users.current,
	})
}

/**
 * 按计划类型获取用户
 */
export const useUsersByPlan = (plan: UserPlan | null | undefined) => {
	return useQuery({
		enabled: !!plan,
		queryFn: async (): Promise<readonly UserInterface[]> => {
			if (!plan) {
				return []
			}
			const result = await userRepo.getUsers()()
			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right.filter((u) => u.plan === plan)
		},
		queryKey: queryKeys.users.byPlan(plan ?? ""),
	})
}
